/* The VisualNeuroscience.AI MCP server.

   One Cloudflare Worker speaking the Model Context Protocol over its
   streamable HTTP transport, so Claude, ChatGPT, Kimi and anything else
   that talks MCP can ask the atlas questions: which region does what,
   where a Brodmann area sits and what borders it, how thickly a receptor
   is expressed, how the brain's networks reconfigure between states.
   Every answer ends with a link that opens the same view in the app.

   The dataset is data.js, generated from the site's own files by
   scripts/build_mcp_data.mjs — the server can never disagree with the
   pages. Read-only, no accounts, no state: every request stands alone,
   which is why the whole protocol fits in this one file with no
   dependencies and no build step, like the rest of the project.

     npx wrangler deploy        (from mcp-worker/; see docs/MCP.md)
*/
import DATA from "./data.js";

const SITE = "https://visualneuroscience.ai";
const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCTIONS =
  "VisualNeuroscience.AI is a free interactive atlas of the human brain (web, iPhone, iPad, Mac, " +
  "Apple Vision Pro). These tools answer from the atlas's own data: AAL-116 regions and their " +
  "functions, the 41 Brodmann areas with their measured borders, sourced receptor densities across 45 " +
  "structures, and six brain states as network reconfigurations. Answers include links that open " +
  "the same view in the app or on the web. The data is educational reference material with its " +
  "sources cited on the site; it is not medical advice.";

/* ── the tools ──────────────────────────────────────────────────────────── */

const TOOLS = [
  {
    name: "search_brain",
    title: "Search the brain atlas",
    description:
      "Search everything at once — AAL regions, Brodmann areas, network nodes and receptor " +
      "structures — by name, number or function ('faces', 'working memory', 'BA17', 'hippocampus'). " +
      "Returns matches with what each one does and a link that opens it in the atlas.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Name, Brodmann number, or a function to look for" } },
      required: ["query"]
    }
  },
  {
    name: "region_info",
    title: "About one brain region",
    description:
      "What one AAL region does, which layer of the brain it belongs to, and how to see it. " +
      "Accepts the region's name, loosely ('hippocampus', 'inferior frontal gyrus').",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: { name: { type: "string", description: "The region's name, or enough of it" } },
      required: ["name"]
    }
  },
  {
    name: "brodmann_area",
    title: "About one Brodmann area",
    description:
      "One Brodmann area by number (1–48): its anatomical name, lobe, what it does, the caveat " +
      "that belongs with it, and which areas it actually borders, measured off the atlas volume.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: { area: { type: "integer", minimum: 1, maximum: 52, description: "The Brodmann number" } },
      required: ["area"]
    }
  },
  {
    name: "receptor_density",
    title: "Receptor density in a structure",
    description:
      "Receptor density in one AAL region, or where one receptor is densest across the 45 cerebral regions, " +
      "from two open sources kept apart: in vivo PET (19 receptors and transporters, Hansen et al. 2022 compilation, " +
      "reported as the tracer's measure and as a share of the receptor's densest region) and ex vivo autoradiography " +
      "(15 receptors, Zilles & Palomero-Gallagher 2017, fmol/mg protein). Give a region, a receptor, or both.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: {
        structure: { type: "string", description: "An AAL region, e.g. 'Hippocampus', 'Putamen', 'Anterior Cingulate' (optional)" },
        receptor: { type: "string", description: "A receptor, transporter or family, e.g. 'D2', '5-HT2A', 'GABA', 'SERT' (optional)" },
        source: { type: "string", enum: ["pet", "autoradiography", "both"], description: "Which layer to read; both by default" }
      }
    }
  },
  {
    name: "brain_state",
    title: "A brain state as a network story",
    description:
      "How the brain's large-scale networks reconfigure in one state — flow, meditation and " +
      "others — which couplings strengthen, which fall quiet, and the literature the composite " +
      "is read from. Call without a state to list the states.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: { state: { type: "string", description: "A state id or name, e.g. 'flow' (optional)" } }
    }
  }
];

/* ── small helpers ──────────────────────────────────────────────────────── */

const norm = s => String(s || "").toLowerCase();
const link = (path, label) => "[" + label + "](" + SITE + "/" + path + ")";

function regionLink(r){ return link("regions.html#sel=" + encodeURIComponent(r.sel), "Open in the Region Atlas"); }
function baLink(a){ return link("regions.html#sel=B:" + a.ba, "Open in the Region Atlas"); }
function stateLink(s){ return link("network-atlas.html#state=" + s.id, "Open in the Network Atlas"); }

function findRegion(name){
  const q = norm(name);
  let hit = DATA.regions.find(r => norm(r.name) === q);
  if (!hit) hit = DATA.regions.find(r => norm(r.name).includes(q) || norm(r.base).includes(q.replace(/ /g, "_")));
  return hit || null;
}

function text(t){ return { content: [{ type: "text", text: t }] }; }
function toolError(msg){ return { content: [{ type: "text", text: msg }], isError: true }; }

/* ── the tools' answers ─────────────────────────────────────────────────── */

function doSearch({ query }){
  const q = norm(query).trim();
  if (!q) return toolError("Give me something to search for.");
  const words = q.split(/\s+/).filter(Boolean);
  const matches = hay => words.every(w => hay.includes(w));
  const out = [];

  const baNum = q.match(/^(?:ba|area)\s*(\d{1,2})$/) || q.match(/^(\d{1,2})$/);
  if (baNum){
    const a = DATA.brodmann.find(x => x.ba === Number(baNum[1]));
    if (a) out.push("**BA" + a.ba + " — " + a.name + "** (Brodmann area, " + a.lobe + " lobe). " + a.fn + " " + baLink(a));
  }
  for (const r of DATA.regions){
    if (out.length >= 12) break;
    if (matches(norm(r.name + " " + (r.fn || "") + " " + r.base)))
      out.push("**" + r.name + "** (region, " + (DATA.tiers[r.tier] || "") + "). " + (r.fn || "") + " " + regionLink(r));
  }
  for (const a of DATA.brodmann){
    if (out.length >= 16) break;
    if (matches(norm("ba" + a.ba + " " + a.name + " " + a.region + " " + a.fn + " " + (a.note || "") + " " + a.tags)))
      out.push("**BA" + a.ba + " — " + a.name + "** (Brodmann area, " + a.lobe + " lobe). " + a.fn + " " + baLink(a));
  }
  for (const n of DATA.networks.nodes){
    if (out.length >= 18) break;
    if (matches(norm(n.id + " " + n.full + " " + n.role))){
      const g = DATA.networks.groups.find(x => x.id === n.group);
      out.push("**" + n.full + "** (network node, " + (g ? g.label : n.group) + " network). " + n.role + " " + link("network-atlas.html", "Open the Network Atlas"));
    }
  }
  for (const s of DATA.networks.states){
    if (out.length >= 20) break;
    if (matches(norm(s.id + " " + s.label + " " + s.title + " " + s.blurb)))
      out.push("**" + s.title + "** (brain state). " + s.blurb + " " + stateLink(s));
  }
  const rx = allReceptors().filter(c => matches(norm(c.name)) || matches(norm(c.family))).slice(0, 4);
  for (const c of rx) out.push("**" + c.name + "** (" + c.layer + " receptor data across the cerebral regions — ask receptor_density). " + link("regions.html#receptors", "Open the receptor charts"));

  if (!out.length) return text("Nothing in the atlas matches “" + query + "”. Try a region name, a Brodmann number, or a function like “working memory” or “faces”.");
  const seen = new Set(), unique = out.filter(l => !seen.has(l) && seen.add(l));
  return text("The atlas knows these:\n\n" + unique.map(l => "- " + l).join("\n"));
}

function doRegion({ name }){
  const r = findRegion(name);
  if (!r){
    const near = DATA.regions.filter(x => norm(x.name).includes(norm(name).split(" ")[0])).slice(0, 5);
    return toolError("No AAL region called “" + name + "”." + (near.length ? " Closest: " + near.map(x => x.name).join(", ") + "." : " Try search_brain first."));
  }
  const lines = [
    "**" + r.name + "**" + (r.sides === "paired" ? " (left and right)" : ""),
    "",
    r.fn || "No function note yet.",
    "",
    "Layer: " + (DATA.tiers[r.tier] || "unplaced") + " · Atlas: AAL-116 on the MNI152 template.",
  ];
  if (DATA.receptors.regions.some(s => s.base === r.base))
    lines.push("Receptor densities are charted for this region — ask receptor_density.");
  lines.push("", regionLink(r) + " — it opens highlighted on the scan, in three planes and 3D.");
  return text(lines.join("\n"));
}

function doBrodmann({ area }){
  const a = DATA.brodmann.find(x => x.ba === Number(area));
  if (!a) return toolError("The atlas volume carries 41 of Brodmann's 52 areas; " + area + " is not one of them (12–16, 31, 33 and 49–52 have no agreed human counterpart).");
  const nb = a.neighbours.slice(0, 8).map(n => {
    const x = DATA.brodmann.find(y => y.ba === n);
    return "BA" + n + (x ? " (" + x.name + ")" : "");
  });
  const lines = [
    "**BA" + a.ba + " — " + a.name + "**",
    "",
    a.fn,
    a.note ? "\nWorth knowing: " + a.note : "",
    "",
    "Lobe: " + a.lobe + " · Region: " + a.region + " · Centre of mass: MNI (" + a.at.map(v => Math.round(v)).join(", ") + ").",
    "Borders, measured off the volume, longest first: " + (nb.length ? nb.join(", ") : "none recorded") + ".",
    "",
    baLink(a) + " — the line map, the scan and the 3D border graph."
  ];
  return text(lines.filter(l => l !== "").join("\n"));
}

function allReceptors(){
  const R = DATA.receptors;
  return R.pet.receptors.map(r => ({ ...r, layer: "PET" })).concat(R.autoradiography.receptors.map(r => ({ ...r, layer: "autoradiography" })));
}
function doReceptor({ structure, receptor, source }){
  const R = DATA.receptors;
  const sQ = norm(structure), rQ = norm(receptor), which = source || "both";
  const reg = sQ ? (R.regions.find(x => norm(x.name) === sQ) || R.regions.find(x => norm(x.name).includes(sQ) || norm(x.base).includes(sQ.replace(/ /g, "_")))) : null;
  if (sQ && !reg) return toolError("No receptor data for “" + structure + "”. The regions carried are the 45 cerebral AAL regions; the cerebellum is left out because it is the reference tissue for most tracers.");
  const layers = [];
  if (which !== "autoradiography") layers.push({ key: "PET", title: "In vivo PET", receptors: R.pet.receptors, unit: r => r.measure, fmtV: v => v && (v.value.toFixed(3) + " " + "(" + v.share + "% of the receptor's densest region)"), rank: v => v ? v.share : -1 });
  if (which !== "pet") layers.push({ key: "AR", title: "Ex vivo autoradiography", receptors: R.autoradiography.receptors, unit: () => "fmol/mg protein", fmtV: v => v == null ? null : v.toFixed(0) + " fmol/mg protein", rank: v => v == null ? -1 : v });
  const chartLink = link("regions.html#receptors", "Open the receptor charts");
  const caveat = "PET values are binding measures that differ by tracer, so compare a PET receptor across regions, not receptors against each other; autoradiography is absolute density from three post-mortem brains, cortex only. Sources: Hansen et al. 2022 (doi:10.1038/s41593-022-01186-3, CC BY-NC-SA 4.0) and Zilles & Palomero-Gallagher 2017 (doi:10.3389/fnana.2017.00078, CC BY 4.0).";
  const out = [];
  for (const L of layers){
    const cols = rQ ? L.receptors.filter(c => norm(c.name).includes(rQ) || norm(c.family).includes(rQ) || norm(c.id).includes(rQ.replace(/[^a-z0-9]/g, ""))) : L.receptors;
    if (!cols.length) continue;
    if (reg && rQ){
      const rows = cols.map(c => { const v = c.values[reg.base]; return "- " + c.name + (c.tracer ? " (" + c.tracer + ", " + c.measure + ", n=" + c.n + "; " + c.cite + ")" : "") + ": **" + (L.fmtV(v) || "no data for this region") + "**"; });
      out.push("**" + L.title + "** in the " + reg.name + ":\n" + rows.join("\n"));
    } else if (reg){
      const ranked = L.receptors.map(c => [c, c.values[reg.base]]).filter(([, v]) => v != null).sort((a, b) => L.rank(b[1]) - L.rank(a[1]));
      out.push("**" + L.title + "** in the " + reg.name + (L.key === "PET" ? ", by share of each receptor's own densest region" : ", densest first") + ":\n" + ranked.map(([c, v]) => "- " + c.name + ": **" + L.fmtV(v) + "**").join("\n"));
    } else {
      const c = cols[0];
      const ranked = R.regions.map(x => [x, c.values[x.base]]).filter(([, v]) => v != null).sort((a, b) => L.rank(b[1]) - L.rank(a[1]));
      const more = cols.length > 1 ? "\n(" + (cols.length - 1) + " more " + L.key + " entries match “" + receptor + "” — name one to narrow it.)" : "";
      out.push("**" + c.name + "**, " + L.title.toLowerCase() + (c.tracer ? " (" + c.tracer + ", " + c.measure + ", n=" + c.n + "; " + c.cite + ")" : "") + ", densest first:\n" +
        ranked.slice(0, 20).map(([x, v]) => "- " + x.name + ": **" + L.fmtV(v) + "**").join("\n") + more);
    }
  }
  if (!out.length) return toolError("No receptor matches “" + receptor + "”. Try a family (GABA, dopamine, serotonin), a receptor (D2, 5-HT2A, M1, NMDA) or a transporter (SERT, DAT, NET, VAChT). Sub-types with no open human data are listed on the page.");
  return text(out.join("\n\n") + "\n\n" + caveat + "\n\n" + chartLink);
}

function doState({ state }){
  const N = DATA.networks;
  if (!state){
    return text("The atlas draws six brain states as network reconfigurations:\n\n" +
      N.states.map(s => "- **" + s.title + "** (`" + s.id + "`) — " + s.anno + ". " + stateLink(s)).join("\n") +
      "\n\nAsk for one by id to get its full story.");
  }
  const q = norm(state);
  const s = N.states.find(x => norm(x.id) === q || norm(x.label).includes(q) || norm(x.title).includes(q));
  if (!s) return toolError("No state called “" + state + "”. The six: " + N.states.map(x => x.id).join(", ") + ".");
  const node = id => { const n = N.nodes.find(x => x.id === id); return n ? n.full : id; };
  const up = s.links.filter(l => !l.quiet).sort((a, b) => b.w - a.w).slice(0, 8)
    .map(l => "- " + node(l.s) + " ↔ " + node(l.t));
  const down = s.links.filter(l => l.quiet).sort((a, b) => b.w - a.w).slice(0, 6)
    .map(l => "- " + node(l.s) + " ↔ " + node(l.t));
  const powered = (s.down || []).map(node);
  const lines = [
    "**" + s.title + "** — " + s.anno,
    "",
    s.blurb,
    "",
    "Couplings that strengthen:", ...up,
    down.length ? "\nCouplings that fall quiet:" : "", ...down,
    powered.length ? "\nPowered down in this state: " + powered.join(", ") + "." : "",
    "",
    "Source: " + s.source,
    "",
    stateLink(s) + " — the ring beside the scan, every region clickable."
  ];
  return text(lines.filter(l => l !== "").join("\n"));
}

const HANDLERS = {
  search_brain: doSearch,
  region_info: doRegion,
  brodmann_area: doBrodmann,
  receptor_density: doReceptor,
  brain_state: doState
};

/* ── the protocol ───────────────────────────────────────────────────────
   JSON-RPC 2.0 over streamable HTTP: every request is one POST, every
   response one JSON body. Stateless by design, so session headers are
   accepted and ignored. */

function rpcResult(id, result){ return { jsonrpc: "2.0", id, result }; }
function rpcError(id, code, message){ return { jsonrpc: "2.0", id, error: { code, message } }; }

function handleRpc(msg){
  const { id, method, params } = msg || {};
  if (method === "initialize"){
    const asked = params && params.protocolVersion;
    return rpcResult(id, {
      protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "visualneuroscience", title: "VisualNeuroscience.AI Brain Atlas", version: "1.0.0" },
      instructions: INSTRUCTIONS
    });
  }
  if (method === "ping") return rpcResult(id, {});
  if (method === "tools/list") return rpcResult(id, { tools: TOOLS });
  if (method === "tools/call"){
    const name = params && params.name;
    const fn = HANDLERS[name];
    if (!fn) return rpcError(id, -32602, "Unknown tool: " + name);
    try { return rpcResult(id, fn(params.arguments || {})); }
    catch (e) { return rpcResult(id, toolError("The tool failed: " + (e && e.message))); }
  }
  if (String(method || "").startsWith("notifications/")) return null;   /* fire and forget */
  if (method === "resources/list") return rpcResult(id, { resources: [] });
  if (method === "prompts/list") return rpcResult(id, { prompts: [] });
  return rpcError(id, -32601, "Method not found: " + method);
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version",
  "Access-Control-Expose-Headers": "Mcp-Session-Id"
};

export default {
  async fetch(request){
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method === "GET"){
      if (url.pathname === "/health") return new Response("ok", { headers: CORS });
      return new Response(JSON.stringify({
        name: "VisualNeuroscience.AI MCP server",
        message: "POST Model Context Protocol JSON-RPC here. The atlas itself lives at " + SITE + ".",
        tools: TOOLS.map(t => t.name)
      }, null, 2), { status: 405, headers: { ...CORS, "Content-Type": "application/json" } });
    }
    if (request.method !== "POST") return new Response("method not allowed", { status: 405, headers: CORS });

    let body;
    try { body = await request.json(); }
    catch { return new Response(JSON.stringify(rpcError(null, -32700, "Parse error")), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }); }

    const messages = Array.isArray(body) ? body : [body];
    const replies = messages.map(handleRpc).filter(Boolean);
    if (!replies.length) return new Response(null, { status: 202, headers: CORS });
    const payload = Array.isArray(body) ? replies : replies[0];
    return new Response(JSON.stringify(payload), { headers: { ...CORS, "Content-Type": "application/json" } });
  }
};
