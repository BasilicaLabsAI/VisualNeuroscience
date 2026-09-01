/* Per-user saved files: each signed-in person keeps any number of named
   files per tool — list them, save one, rename one, delete one. Firestore
   under users/{uid}/tools/{tool}/files/{name}, and the security rules in
   firestore.rules make that tree readable and writable by its owner alone.

   A tool is a short slug ("regions", "brodmann", …); a name is whatever
   the person typed. Names become document ids by percent-encoding, so any
   printable name round-trips — Firestore ids just cannot contain "/".

     import files from "./userdata.js";     // or window.VN_USERFILES
     await files.save("regions", "My selection", {…});
     await files.list("regions");           // [{name, updatedAt}]
     await files.load("regions", "My selection");
     await files.rename("regions", "My selection", "Better name");
     await files.remove("regions", "Better name");

   Every call rejects with a plain-sentence Error when signed out or when
   accounts are dormant. */

import auth from "./auth.js";

function need(){
  if (!auth.enabled) throw new Error("Accounts are switched off in this copy of the app.");
  const u = auth.currentUser();
  if (!u) throw new Error("Log in to keep saved files.");
  return u;
}
const id = name => encodeURIComponent(String(name).trim()).slice(0, 900);

function fileDoc(uid, tool, name){
  const s = auth.sdk;
  return s.doc(auth.db, "users", uid, "tools", String(tool), "files", id(name));
}

async function list(tool){
  const u = need(), s = auth.sdk;
  const snap = await s.getDocs(s.collection(auth.db, "users", u.uid, "tools", String(tool), "files"));
  const out = [];
  snap.forEach(d => {
    const v = d.data() || {};
    out.push({ name: v.name || decodeURIComponent(d.id), updatedAt: v.updatedAt || null });
  });
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

async function save(tool, name, data){
  const u = need(), s = auth.sdk;
  if (!String(name || "").trim()) throw new Error("Give the file a name first.");
  await s.setDoc(fileDoc(u.uid, tool, name), {
    name: String(name).trim(),
    data: JSON.parse(JSON.stringify(data ?? null)),
    updatedAt: s.serverTimestamp()
  });
  /* the account-deletion sweep can only delete what it can find, and
     Firestore will not enumerate a client's subcollections — so every tool
     that ever saves registers itself */
  await s.setDoc(s.doc(auth.db, "users", u.uid, "meta", "toolindex"),
                 (function(o){ o[String(tool)] = true; return o; })({}),
                 { merge: true }).catch(function(){});
}

async function load(tool, name){
  const u = need(), s = auth.sdk;
  const snap = await s.getDoc(fileDoc(u.uid, tool, name));
  if (!snap.exists()) throw new Error("No saved file called “" + name + "”.");
  return (snap.data() || {}).data ?? null;
}

async function rename(tool, from, to){
  const u = need(), s = auth.sdk;
  if (!String(to || "").trim()) throw new Error("Give the file a name first.");
  const oldRef = fileDoc(u.uid, tool, from);
  const snap = await s.getDoc(oldRef);
  if (!snap.exists()) throw new Error("No saved file called “" + from + "”.");
  const v = snap.data() || {};
  await s.setDoc(fileDoc(u.uid, tool, to), {
    name: String(to).trim(), data: v.data ?? null, updatedAt: s.serverTimestamp()
  });
  await s.deleteDoc(oldRef);
}

async function remove(tool, name){
  const u = need(), s = auth.sdk;
  await s.deleteDoc(fileDoc(u.uid, tool, name));
}

const VN_USERFILES = { list, save, load, rename, remove };
if (typeof window !== "undefined") window.VN_USERFILES = VN_USERFILES;
export default VN_USERFILES;
