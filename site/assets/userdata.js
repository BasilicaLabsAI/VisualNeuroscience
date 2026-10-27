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
   accounts are dormant.

   The files are kept on the device as well (v12.54, at the owner's word):
   every read and write here keeps the account's copy in step (auth.js,
   keptFiles and keepFiles), so a page opens on what the device has and
   pulls nothing. kept(tool) is the list as list() would give it, null
   without a copy; keptData(tool, name) the file's data, undefined where the
   copy has no such file; keptAt() when the copy was last read whole. */

import auth from "./auth.js";

function need(){
  if (!auth.enabled) throw new Error("Accounts are switched off in this copy of the app.");
  const u = auth.currentUser();
  if (!u) throw new Error("Log in to keep saved files.");
  return u;
}
const id = name => encodeURIComponent(String(name).trim()).slice(0, 900);
const clean = name => String(name || "").trim();

function fileDoc(uid, tool, name){
  const s = auth.sdk;
  return s.doc(auth.db, "users", uid, "tools", String(tool), "files", id(name));
}

/* ── the copy on the device ─────────────────────────────────────────── */
function kept(tool){
  const rows = auth.keptFiles(String(tool));
  return rows ? rows.map(r => ({ name: r.name, updatedAt: r.updated || null })) : null;
}
function keptData(tool, name){
  const rows = auth.keptFiles(String(tool));
  if (!rows) return undefined;
  const key = clean(name);
  const r = rows.find(x => x.name === key);
  return r ? (r.data === undefined ? null : r.data) : undefined;
}
function keptAt(){ const o = auth.kept(); return o ? (o.warmed || 0) : 0; }
/* one file into the copy, or out of it; nothing without a copy */
function keepOne(tool, name, data, updated){
  const rows = (auth.keptFiles(String(tool)) || []).filter(r => r.name !== name);
  rows.push({ name, updated: updated || new Date().toISOString(), data: data === undefined ? null : data });
  rows.sort((a, b) => a.name.localeCompare(b.name));
  auth.keepFiles(String(tool), rows);
}
function dropOne(tool, name){
  const rows = auth.keptFiles(String(tool));
  if (rows) auth.keepFiles(String(tool), rows.filter(r => r.name !== name));
}
function decodeId(s){ try{ return decodeURIComponent(s); }catch(_){ return s; } }

async function list(tool){
  const u = need(), s = auth.sdk;
  const snap = await s.getDocs(s.collection(auth.db, "users", u.uid, "tools", String(tool), "files"));
  const out = [], whole = [];
  snap.forEach(d => {
    const v = d.data() || {};
    const name = v.name || decodeId(d.id);
    out.push({ name, updatedAt: v.updatedAt || null });
    whole.push({ name, updated: auth.iso(v.updatedAt), data: v.data === undefined ? null : auth.plain(v.data) });
  });
  out.sort((a, b) => a.name.localeCompare(b.name));
  whole.sort((a, b) => a.name.localeCompare(b.name));
  auth.keepFiles(String(tool), whole);
  return out;
}

async function save(tool, name, data){
  const u = need(), s = auth.sdk;
  if (!clean(name)) throw new Error("Give the file a name first.");
  const plain = JSON.parse(JSON.stringify(data ?? null));
  await s.setDoc(fileDoc(u.uid, tool, name), {
    name: clean(name),
    data: plain,
    updatedAt: s.serverTimestamp()
  });
  /* the account-deletion sweep can only delete what it can find, and
     Firestore will not enumerate a client's subcollections — so every tool
     that ever saves registers itself */
  await s.setDoc(s.doc(auth.db, "users", u.uid, "meta", "toolindex"),
                 (function(o){ o[String(tool)] = true; return o; })({}),
                 { merge: true }).catch(function(){});
  keepOne(tool, clean(name), plain);
  auth.changed();
}

async function load(tool, name){
  const u = need(), s = auth.sdk;
  const snap = await s.getDoc(fileDoc(u.uid, tool, name));
  if (!snap.exists()) throw new Error("No saved file called “" + name + "”.");
  const v = snap.data() || {};
  const data = v.data ?? null;
  keepOne(tool, clean(name), auth.plain(data), auth.iso(v.updatedAt));
  return data;
}

async function rename(tool, from, to){
  const u = need(), s = auth.sdk;
  if (!clean(to)) throw new Error("Give the file a name first.");
  const oldRef = fileDoc(u.uid, tool, from);
  const snap = await s.getDoc(oldRef);
  if (!snap.exists()) throw new Error("No saved file called “" + from + "”.");
  const v = snap.data() || {};
  await s.setDoc(fileDoc(u.uid, tool, to), {
    name: clean(to), data: v.data ?? null, updatedAt: s.serverTimestamp()
  });
  await s.deleteDoc(oldRef);
  dropOne(tool, clean(from));
  keepOne(tool, clean(to), auth.plain(v.data ?? null));
  auth.changed();
}

async function remove(tool, name){
  const u = need(), s = auth.sdk;
  await s.deleteDoc(fileDoc(u.uid, tool, name));
  dropOne(tool, clean(name));
  auth.changed();
}

const VN_USERFILES = { list, save, load, rename, remove, kept, keptData, keptAt };
if (typeof window !== "undefined") window.VN_USERFILES = VN_USERFILES;
export default VN_USERFILES;
