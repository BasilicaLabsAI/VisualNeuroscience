#!/usr/bin/env node
/* Build the MCP server's dataset from the very files the pages draw.

   The site keeps its knowledge in plain script files that assign to
   window.*; this evaluates them with a stub window and writes the parts a
   conversation needs to mcp-worker/data.js. Run it whenever region notes,
   Brodmann areas, network states or the receptor table change:

       node scripts/build_mcp_data.mjs
*/
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const root = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const site = p => path.join(root, "site", p);

function evalAsset(file){
  const w = {};
  const doc = { currentScript: null, documentElement: { setAttribute(){} } };
  new Function("window", "document", fs.readFileSync(site(file), "utf8"))(w, doc);
  return w;
}

const ATLAS = evalAsset("assets/atlas-data.js").MN_ATLAS;
const NOTES = evalAsset("assets/region-notes.js").MN_NOTES;
const BA    = evalAsset("assets/brodmann-areas.js").MN_BRODMANN;
const NET   = evalAsset("assets/network-states.js").MN_NET;

const html = fs.readFileSync(site("regions.html"), "utf8");
const grab = name => {
  const m = html.match(new RegExp("const " + name + " = ({.*?});", "s"));
  if (!m) throw new Error(name + " not found in regions.html");
  return JSON.parse(m[1]);
};
const DATA = grab("DATA");
const TYPES = grab("TYPES");

/* regions: one row per AAL base, with its note and its selection key */
const regions = ATLAS.REGIONS.map(r => {
  const note = NOTES.NOTES[r.base] || {};
  return {
    base: r.base, name: r.pretty, group: r.group,
    sides: r.S != null ? "single" : "paired",
    tier: note.tier || null, fn: note.fn || null,
    sel: (r.S != null ? "S:" : "P:") + r.base
  };
});
const tiers = Object.fromEntries(NOTES.TIERS.map(t => [t.id, t.label.replace(/&middot;/g, "·")]));

/* Brodmann: every area with its function, tags and measured neighbours */
const byBA = {};
BA.AREAS.forEach(a => { byBA[a.ba] = a; });
const neighbours = {};
BA.EDGES.forEach(([a, b, w]) => {
  (neighbours[a] = neighbours[a] || []).push([b, w]);
  (neighbours[b] = neighbours[b] || []).push([a, w]);
});
Object.values(neighbours).forEach(list => list.sort((x, y) => y[1] - x[1]));
const brodmann = BA.AREAS.map(a => ({
  ba: a.ba, name: a.name, region: a.region, lobe: a.lobe,
  fn: a.fn, note: a.note || null, tags: a.tags || "",
  at: a.at, neighbours: (neighbours[a.ba] || []).map(([n]) => n)
}));

/* networks: the states with their stories, couplings kept compact */
const networks = {
  groups: NET.GROUPS.map(g => ({ id: g.id, label: g.label, role: g.role })),
  nodes: NET.NODES.map(n => ({ id: n.id, group: n.group, full: n.full, role: n.role })),
  states: NET.STATES.map(s => ({
    id: s.id, label: s.label, title: s.title, anno: s.anno, blurb: s.blurb,
    source: s.source, down: s.down || [],
    links: s.links.map(l => ({ s: l.s, t: l.t, w: l.w, quiet: !!l.quiet })),
    notes: s.notes || {}
  }))
};

/* receptors: the merged density table, column names split into family/measure */
const receptors = {
  structures: DATA.structures,
  columns: DATA.columns.map(c => ({ name: c.name, values: c.values })),
  types: TYPES.rows.map(r => ({ subunit: r[0], type: r[1], family: r[2], category: r[3], mechanism: r[4] }))
};

const out = {
  built: "from the site's own data files by scripts/build_mcp_data.mjs — do not edit by hand",
  site: "https://visualneuroscience.ai",
  tiers, regions, brodmann, networks, receptors
};
const dest = path.join(root, "mcp-worker", "data.js");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, "/* Generated: " + out.built + " */\nexport default " + JSON.stringify(out) + ";\n");
console.log("wrote", dest,
  "regions", regions.length, "brodmann", brodmann.length,
  "states", networks.states.length, "receptor columns", receptors.columns.length,
  Math.round(fs.statSync(dest).size / 1024) + " KB");
