/* The account tools: what an assistant can do for a signed-in person.

   Four tools, each needing a bearer token that oauth.js has verified as a
   Firebase ID token for one of the site's accounts. They read and write the
   person's own documents in Firestore through its REST API, as the person:
   the request carries their ID token, so the same security rules that
   guard the app guard this, and the server holds no key of its own to
   anyone's data.

     my_account    who is signed in: username, university, email
     list_models   the Region Atlas models saved to the account
     load_model    one saved model: its regions and the link that opens it
     save_model    a new model from a list of regions,
                   saved where the app's Saved models card will find it

   A saved model is the document the Region Atlas itself writes
   (users/{uid}/tools/regions/files/{name}): the app opens a model made
   here exactly as one made on the page. save_model only ever creates: a
   name already in use is refused rather than replaced, so nothing an
   assistant does can overwrite or delete a person's work. */

import DATA from "./data.js";

const PALETTE = ["#915AD8", "#D85AC9", "#FE4B83", "#FF7847", "#E6C14C", "#AFF05B", "#52F667", "#4AE8B7", "#4FBEE3", "#5575DD"];
const TOOL = "regions";
const NAME_MAX = 80;

const norm = s => String(s == null ? "" : s).toLowerCase().trim();
const link = (env, path, label) => "[" + label + "](" + (env.SITE_ORIGIN || "https://visualneuroscience.ai") + "/" + path + ")";
const text = t => ({ content: [{ type: "text", text: t }] });
const toolError = msg => ({ content: [{ type: "text", text: msg }], isError: true });
/* the app's document id for a name is the name percent-encoded; in a REST
   URL that id is decoded once more by Firestore, so it goes in encoded again */
const fileId = name => encodeURIComponent(String(name).trim()).slice(0, 900);
const docId = name => encodeURIComponent(fileId(name));

/* ── Firestore over REST, as the person ────────────────────────────────── */

const fsBase = env => "https://firestore.googleapis.com/v1/projects/" + env.FIREBASE_PROJECT_ID + "/databases/(default)/documents";

/* JSON to Firestore's typed values and back */
function fv(v){
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fv) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fv(x)])) } };
}
function fromFv(x){
  if (!x || typeof x !== "object") return null;
  if ("nullValue" in x) return null;
  if ("booleanValue" in x) return x.booleanValue;
  if ("integerValue" in x) return Number(x.integerValue);
  if ("doubleValue" in x) return x.doubleValue;
  if ("stringValue" in x) return x.stringValue;
  if ("timestampValue" in x) return x.timestampValue;
  if ("arrayValue" in x) return (x.arrayValue.values || []).map(fromFv);
  if ("mapValue" in x) return Object.fromEntries(Object.entries(x.mapValue.fields || {}).map(([k, y]) => [k, fromFv(y)]));
  return null;
}
const fields = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fv(v)]));
const unfields = doc => Object.fromEntries(Object.entries((doc && doc.fields) || {}).map(([k, v]) => [k, fromFv(v)]));

class StoreError extends Error { constructor(status, message){ super(message); this.status = status; } }
async function store(env, idToken, method, path, body){
  const r = await fetch(fsBase(env) + path, {
    method, headers: Object.assign({ Authorization: "Bearer " + idToken }, body ? { "Content-Type": "application/json" } : {}),
    body: body ? JSON.stringify(body) : undefined
  });
  let j = null; try{ j = await r.json(); }catch(_){}
  if (!r.ok) throw new StoreError(r.status, (j && j.error && j.error.message) || ("Firestore answered " + r.status));
  return j;
}
function storeFailure(e){
  if (e instanceof StoreError){
    if (e.status === 401 || e.status === 403) return toolError("The database refused the request: the sign-in may have expired, or the site's Firestore rules do not allow it. Reconnect the atlas and try again.");
    return toolError("The database could not be reached (" + e.message + "). Try again in a moment.");
  }
  return toolError("Something went wrong talking to the database. Try again in a moment.");
}

/* ── the model a chat can save ─────────────────────────────────────────── */

function findRegion(q){
  const n = norm(q);
  if (!n) return null;
  return DATA.regions.find(r => norm(r.name) === n || norm(r.base) === n) ||
         DATA.regions.find(r => norm(r.name).includes(n) || norm(r.base).includes(n.replace(/ /g, "_"))) || null;
}

/* one item of the regions list, as the Region Atlas keeps a selection */
function resolveItem(item, used){
  const s = String(item == null ? "" : item).trim();
  if (!s) return { error: "an empty entry" };
  let m = s.match(/^(?:B:|BA\s*|brodmann(?:\s+area)?\s+)(\d{1,2})$/i);
  /* a Brodmann area cannot go in a model since v12.47: the 3D Region Atlas
     carries the AAL regions alone, the Brodmann Area Atlas the areas */
  if (m) return { error: "Brodmann area " + m[1] + " cannot go in a Region Atlas model: the 3D Region Atlas carries AAL regions alone, and the Brodmann Area Atlas shows the areas (brodmann_area links there)" };
  let mode = null, name = s;
  m = s.match(/^([LRPS]):(.+)$/);
  if (m){ mode = m[1]; name = m[2]; }
  else {
    m = s.match(/^(left|right)\s+(.+)$/i);
    if (m){ mode = m[1].toLowerCase() === "left" ? "L" : "R"; name = m[2]; }
  }
  const r = findRegion(name);
  if (!r) return { error: "no AAL region called “" + name + "”" };
  if (!mode) mode = r.S != null ? "S" : "P";
  if (mode === "S" && r.S == null) return { error: r.name + " is a paired region: ask for it as a pair, left or right" };
  if (mode !== "S" && r.S != null) return { error: r.name + " is a single midline structure, with no left or right" };
  const sideTag = mode === "P" ? "L+R" : mode === "S" ? "" : mode;
  const indices = mode === "P" ? [r.L, r.R] : mode === "L" ? [r.L] : mode === "R" ? [r.R] : [r.S];
  return { key: mode + ":" + r.base, entry: { name: r.name, base: r.base, sideTag, indices, atlas: "aal" } };
}
function buildModel(items){
  const selections = [], errors = [], seen = new Set();
  (items || []).forEach(it => {
    const got = resolveItem(it, seen);
    if (got.error){ errors.push(got.error); return; }
    if (seen.has(got.key)) return;
    seen.add(got.key);
    got.entry.color = PALETTE[selections.length % PALETTE.length];
    selections.push(Object.assign({ key: got.key }, got.entry));
  });
  return { selections, errors };
}
function describe(env, model){
  const sels = Array.isArray(model && model.selections) ? model.selections : [];
  const parts = sels.map(s => s.atlas === "ba" ? "BA" + s.ba + " (" + s.name + ")" : s.name + (s.sideTag === "L" ? ", left" : s.sideTag === "R" ? ", right" : ""));
  const keys = sels.map(s => s.key).filter(Boolean);
  return { parts, open: keys.length ? link(env, "regions.html#sel=" + keys.join("|"), "Open it in the 3D Region Atlas") : null };
}
function when(ts){ return ts ? String(ts).slice(0, 10) : "undated"; }

/* ── the tools ─────────────────────────────────────────────────────────── */

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
export const ACCOUNT_TOOLS = [
  {
    name: "my_account",
    title: "Who is signed in",
    description: "The signed-in person's VisualNeuroscience.AI account: username, university and email. Needs sign-in.",
    annotations: Object.assign({ title: "Who is signed in" }, RO),
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "list_models",
    title: "Saved Region Atlas models",
    description: "The Region Atlas models saved to the signed-in person's account, each with the regions it holds and a link that opens it. Needs sign-in.",
    annotations: Object.assign({ title: "Saved Region Atlas models" }, RO),
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "load_model",
    title: "One saved model",
    description: "One of the signed-in person's saved Region Atlas models by name: the regions it holds, and a link that opens it highlighted on the scan. Needs sign-in.",
    annotations: Object.assign({ title: "One saved model" }, RO),
    inputSchema: { type: "object", properties: { name: { type: "string", description: "The model's name, as saved" } }, required: ["name"] }
  },
  {
    name: "save_model",
    title: "Save a Region Atlas model",
    description:
      "Save a new Region Atlas model to the signed-in person's account from a list of AAL regions, " +
      "so it appears in the app's Saved models and opens highlighted on the scan. Items are AAL region names " +
      "('hippocampus', 'left amygdala', 'R:Putamen'); a Brodmann area cannot go in one, the Brodmann Area Atlas " +
      "showing those. Creates only: a name already in use is refused, never replaced. Needs sign-in.",
    annotations: { title: "Save a Region Atlas model", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "A name for the model, up to " + NAME_MAX + " characters" },
        regions: { type: "array", items: { type: "string" }, minItems: 1, description: "Regions to highlight, e.g. ['hippocampus', 'left amygdala', 'R:Putamen']" }
      },
      required: ["name", "regions"]
    }
  }
];
export const PROTECTED = new Set(ACCOUNT_TOOLS.map(t => t.name));

export async function runAccountTool(env, who, idToken, name, args){
  const a = args || {};
  const uid = who.uid;
  const files = "/users/" + uid + "/tools/" + TOOL + "/files";
  try{
    if (name === "my_account"){
      let prof = {};
      try{ prof = unfields(await store(env, idToken, "GET", "/users/" + uid + "/meta/profile")); }
      catch(e){ if (!(e instanceof StoreError && e.status === 404)) throw e; }
      const lines = ["**" + (prof.username || "No username yet") + "**"];
      if (prof.firstName || prof.lastName) lines.push("Name: " + [prof.firstName, prof.lastName].filter(Boolean).join(" "));
      if (who.email) lines.push("Email: " + who.email);
      lines.push("University: " + (prof.university || "not given"));
      if (!prof.username) lines.push("The username is chosen on the account card in the app or on the site.");
      return text(lines.join("\n"));
    }
    if (name === "list_models"){
      const res = await store(env, idToken, "GET", files + "?pageSize=300");
      const docs = (res && res.documents) || [];
      if (!docs.length) return text("No Region Atlas models are saved to this account yet. save_model makes one from a list of regions.");
      const rows = docs.map(d => {
        const v = unfields(d), m = v.data || {}, dsc = describe(env, m);
        return "- **" + (v.name || decodeURIComponent(d.name.split("/").pop())) + "** (" + when(v.updatedAt || d.updateTime) + "): " +
          (dsc.parts.length ? dsc.parts.join(", ") : "nothing highlighted") + (dsc.open ? ". " + dsc.open : "");
      });
      return text(docs.length + (docs.length === 1 ? " model" : " models") + " saved:\n" + rows.join("\n"));
    }
    if (name === "load_model"){
      const nm = String(a.name == null ? "" : a.name).trim();
      if (!nm) return toolError("Give the model's name. list_models shows the names.");
      let d;
      try{ d = await store(env, idToken, "GET", files + "/" + docId(nm)); }
      catch(e){ if (e instanceof StoreError && e.status === 404) return toolError("No saved model called “" + nm + "”. list_models shows the names."); throw e; }
      const v = unfields(d), m = v.data || {}, dsc = describe(env, m);
      return text("**" + (v.name || nm) + "** (" + when(v.updatedAt || d.updateTime) + ")\n\n" +
        (dsc.parts.length ? dsc.parts.map(p => "- " + p).join("\n") : "Nothing highlighted in it.") + "\n\n" +
        (dsc.open ? dsc.open + " — it opens with these highlighted, as the app's Saved models card opens it with its colours, view and cuts too." : ""));
    }
    if (name === "save_model"){
      const nm = String(a.name == null ? "" : a.name).trim();
      if (!nm) return toolError("Give the model a name.");
      if (nm.length > NAME_MAX) return toolError("The name is too long: up to " + NAME_MAX + " characters.");
      if (!Array.isArray(a.regions) || !a.regions.length) return toolError("Give the regions to highlight as a list, e.g. ['hippocampus', 'left amygdala', 'BA17'].");
      const { selections, errors } = buildModel(a.regions);
      if (errors.length) return toolError("Not saved: " + errors.join("; ") + ". search_brain finds the names the atlas uses.");
      if (!selections.length) return toolError("Not saved: nothing to highlight.");
      const model = { v: 1, tool: TOOL, selections, opacity: null, mirror: true, view: "grid", camera: null, crosshair: null, cuts: null };
      try{
        await store(env, idToken, "POST", files + "?documentId=" + docId(nm), { fields: fields({ name: nm, data: model, updatedAt: new Date() }) });
      }catch(e){
        if (e instanceof StoreError && e.status === 409) return toolError("A model called “" + nm + "” is already saved. Pick another name; the app can delete or rename the old one.");
        throw e;
      }
      /* the account-deletion sweep finds saved files through this index */
      try{ await store(env, idToken, "PATCH", "/users/" + uid + "/meta/toolindex?updateMask.fieldPaths=" + TOOL, { fields: fields({ [TOOL]: true }) }); }catch(_){}
      const dsc = describe(env, model);
      return text("Saved **" + nm + "** with " + dsc.parts.join(", ") + ". It is in the app's Saved models now, on every device signed in to this account. " + dsc.open);
    }
    return toolError("Unknown account tool: " + name);
  }catch(e){
    return storeFailure(e);
  }
}

export const _test = { buildModel, fv, fromFv };
