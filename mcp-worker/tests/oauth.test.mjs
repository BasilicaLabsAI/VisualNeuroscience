/* The sign-in flow end to end, without a network: Google's keys, Firebase's
   refresh endpoint, a client's metadata document and Firestore are all
   stood in for by a fake fetch, and a test key signs the ID tokens.

       node mcp-worker/tests/oauth.test.mjs                 (from the repo root) */

import assert from "node:assert/strict";
import worker from "../worker.js";
import { _test as oauthT } from "../oauth.js";

const env = { OAUTH_SECRET: "test-secret", FIREBASE_PROJECT_ID: "proj", FIREBASE_API_KEY: "webkey", ISSUER: "https://mcp.test",
              SITE_ORIGIN: "https://site.test", ALLOWED_ORIGINS: "https://site.test" };
const b64u = buf => Buffer.from(buf).toString("base64url");

/* a key pair for signing ID tokens the way securetoken does */
const kp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const jwk = Object.assign(await crypto.subtle.exportKey("jwk", kp.publicKey), { kid: "k1", alg: "RS256", use: "sig" });
async function idToken(claims){
  const head = b64u(JSON.stringify({ alg: "RS256", kid: "k1", typ: "JWT" }));
  const body = b64u(JSON.stringify(Object.assign({ iss: "https://securetoken.google.com/proj", aud: "proj", sub: "uid-1", email: "fid@example.org",
    iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }, claims || {})));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", kp.privateKey, new TextEncoder().encode(head + "." + body));
  return head + "." + body + "." + b64u(sig);
}

/* the outside world */
const calls = [];
let firestore = {}; /* path → document */
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  const method = (init && init.method) || "GET";
  calls.push({ url, method, body: init && init.body, auth: init && init.headers && (init.headers.Authorization || init.headers.authorization) });
  const j = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: { "Content-Type": "application/json" } });
  if (url.startsWith("https://www.googleapis.com/service_accounts/v1/jwk/")) return j({ keys: [jwk] });
  if (url.startsWith("https://securetoken.googleapis.com/v1/token")){
    const p = new URLSearchParams(String(init.body));
    if (p.get("refresh_token") === "dead") return j({ error: { message: "TOKEN_EXPIRED" } }, 400);
    return j({ id_token: await idToken(), refresh_token: "rt-" + (Number(p.get("refresh_token").split("-")[1] || 0) + 1), expires_in: "3600", user_id: "uid-1" });
  }
  if (url === "https://claude.test/client-metadata") return j({ client_id: url, client_name: "Claude", redirect_uris: ["https://claude.test/callback", "http://localhost/callback", "http://127.0.0.1/callback"] });
  if (url.startsWith("https://firestore.googleapis.com/v1/")){
    const path = url.slice("https://firestore.googleapis.com/v1/projects/proj/databases/(default)/documents".length);
    const [p0, qs] = path.split("?");
    const p = decodeURIComponent(p0);            /* Firestore decodes a path segment once, as it does documentId */
    const q = new URLSearchParams(qs || "");
    if (method === "GET" && p.endsWith("/files")) return j({ documents: Object.entries(firestore).filter(([k]) => k.startsWith(p + "/")).map(([k, v]) => Object.assign({ name: "projects/proj/databases/(default)/documents" + k, updateTime: "2026-10-15T10:00:00Z" }, v)) });
    if (method === "GET") return firestore[p] ? j(Object.assign({ name: p }, firestore[p])) : j({ error: { message: "Document not found", status: "NOT_FOUND" } }, 404);
    if (method === "POST"){ const id = p + "/" + q.get("documentId"); if (firestore[id]) return j({ error: { message: "Document already exists", status: "ALREADY_EXISTS" } }, 409); firestore[id] = JSON.parse(init.body); return j(Object.assign({ name: id }, firestore[id])); }
    if (method === "PATCH"){ firestore[p] = Object.assign(firestore[p] || { fields: {} }, JSON.parse(init.body)); return j({ name: p }); }
  }
  throw new Error("unexpected fetch " + method + " " + url);
};

const call = (path, init) => worker.fetch(new Request("https://mcp.test" + path, init), env);
const rpc = (body, headers) => call("/", { method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, headers || {}), body: JSON.stringify(body) });

/* discovery */
let r = await call("/.well-known/oauth-protected-resource"); let m = await r.json();
assert.equal(r.status, 200); assert.equal(m.resource, "https://mcp.test/"); assert.deepEqual(m.authorization_servers, ["https://mcp.test"]);
r = await call("/.well-known/oauth-authorization-server"); m = await r.json();
assert.equal(m.issuer, "https://mcp.test"); assert.equal(m.client_id_metadata_document_supported, true);
assert.ok(m.token_endpoint_auth_methods_supported.includes("none")); assert.deepEqual(m.code_challenge_methods_supported, ["S256"]);
console.log("ok discovery");

/* the public tools need no token; an account tool without one is a 401 challenge */
r = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_brain", arguments: { query: "faces" } } });
assert.equal(r.status, 200); assert.ok((await r.json()).result.content[0].text.includes("Fusiform"));
r = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }); m = await r.json();
assert.equal(m.result.tools.length, 9); assert.ok(m.result.tools.every(t => t.annotations && t.annotations.title));
r = await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "list_models", arguments: {} } });
assert.equal(r.status, 401); const www = r.headers.get("WWW-Authenticate");
assert.ok(www.startsWith("Bearer "), www); assert.ok(www.includes('resource_metadata="https://mcp.test/.well-known/oauth-protected-resource"')); assert.ok(www.includes('scope="account"'));
assert.equal((await r.json()).error, "invalid_token");
r = await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "list_models", arguments: {} } }, { Authorization: "Bearer not.a.token" });
assert.equal(r.status, 401);
console.log("ok gate");

/* dynamic client registration, then the authorization request */
r = await call("/oauth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ redirect_uris: ["https://claude.ai/api/mcp/auth_callback"], client_name: "Claude", token_endpoint_auth_method: "none" }) });
assert.equal(r.status, 201); const reg = await r.json(); assert.ok(reg.client_id.startsWith("dcr."));
r = await call("/oauth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ redirect_uris: ["http://evil.test/cb"] }) });
assert.equal(r.status, 400);
const verifier = "v".repeat(43), challenge = await oauthT.sha256b64u(verifier);
const authz = (params) => call("/oauth/authorize?" + new URLSearchParams(params));
r = await authz({ response_type: "code", client_id: reg.client_id, redirect_uri: "https://claude.ai/api/mcp/auth_callback", state: "s1", code_challenge: challenge, code_challenge_method: "S256", scope: "account", resource: "https://mcp.test/" });
assert.equal(r.status, 302); let loc = new URL(r.headers.get("Location"));
assert.equal(loc.origin + loc.pathname, "https://site.test/connect.html"); const ticket = new URLSearchParams(loc.hash.slice(1)).get("req"); assert.ok(ticket);
r = await authz({ response_type: "code", client_id: reg.client_id, redirect_uri: "https://elsewhere.test/cb", code_challenge: challenge });
assert.equal(r.status, 400); assert.ok(!r.headers.get("Location"));
r = await authz({ response_type: "token", client_id: reg.client_id, redirect_uri: "https://claude.ai/api/mcp/auth_callback", code_challenge: challenge, state: "s2" });
assert.equal(r.status, 302); loc = new URL(r.headers.get("Location")); assert.equal(loc.searchParams.get("error"), "unsupported_response_type"); assert.equal(loc.searchParams.get("state"), "s2");
r = await authz({ response_type: "code", client_id: reg.client_id, redirect_uri: "https://claude.ai/api/mcp/auth_callback", state: "s3" });
assert.equal(new URL(r.headers.get("Location")).searchParams.get("error"), "invalid_request");
r = await authz({ response_type: "code", client_id: reg.client_id, redirect_uri: "https://claude.ai/api/mcp/auth_callback", code_challenge: challenge, scope: "account admin" });
assert.equal(new URL(r.headers.get("Location")).searchParams.get("error"), "invalid_scope");
console.log("ok register + authorize");

/* a client identified by its metadata document, Claude Code's loopback included */
r = await authz({ response_type: "code", client_id: "https://claude.test/client-metadata", redirect_uri: "http://localhost:3118/callback", code_challenge: challenge, state: "cc" });
assert.equal(r.status, 302); assert.ok(r.headers.get("Location").startsWith("https://site.test/connect.html#req="));
r = await authz({ response_type: "code", client_id: "https://claude.test/client-metadata", redirect_uri: "https://other.test/cb", code_challenge: challenge });
assert.equal(r.status, 400);
r = await authz({ response_type: "code", client_id: "https://nowhere.test/meta", redirect_uri: "https://claude.ai/api/mcp/auth_callback", code_challenge: challenge }).catch(e => ({ status: "threw " + e.message }));
assert.equal(r.status, 400);
assert.ok(oauthT.sameRedirect("http://127.0.0.1:5000/callback", "http://127.0.0.1/callback"));
assert.ok(!oauthT.sameRedirect("http://127.0.0.1:5000/other", "http://127.0.0.1/callback"));
assert.ok(!oauthT.sameRedirect("https://a.test:5000/callback", "https://a.test/callback"));
console.log("ok client metadata document");

/* the consent page: what it shows, then the answer */
r = await call("/oauth/request?req=" + encodeURIComponent(ticket), { headers: { Origin: "https://site.test" } }); m = await r.json();
assert.equal(r.status, 200); assert.equal(m.client, "claude.ai"); assert.equal(m.scope, "account"); assert.equal(r.headers.get("Access-Control-Allow-Origin"), "https://site.test");
r = await call("/oauth/request?req=bogus"); assert.equal(r.status, 400);
const approve = body => call("/oauth/approve", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://site.test" }, body: JSON.stringify(body) });
r = await approve({ req: ticket, decision: "deny" }); m = await r.json();
assert.equal(new URL(m.redirect).searchParams.get("error"), "access_denied");
r = await approve({ req: ticket, decision: "allow", id_token: "junk", refresh_token: "rt-1" }); assert.equal(r.status, 401);
r = await approve({ req: ticket, decision: "allow", id_token: await idToken({ exp: Math.floor(Date.now() / 1000) - 5 }), refresh_token: "rt-1" }); assert.equal(r.status, 401);
r = await approve({ req: ticket, decision: "allow", id_token: await idToken(), refresh_token: "rt-1" }); m = await r.json();
assert.equal(r.status, 200); loc = new URL(m.redirect);
assert.equal(loc.origin + loc.pathname, "https://claude.ai/api/mcp/auth_callback"); assert.equal(loc.searchParams.get("state"), "s1");
const code = loc.searchParams.get("code"); assert.ok(code);
console.log("ok consent");

/* the token endpoint: PKCE, the code, the refresh */
const tokenReq = form => call("/oauth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form).toString() });
r = await tokenReq({ grant_type: "authorization_code", code, client_id: reg.client_id, redirect_uri: "https://claude.ai/api/mcp/auth_callback", code_verifier: "wrong" });
assert.equal(r.status, 400); assert.equal((await r.json()).error, "invalid_grant");
r = await tokenReq({ grant_type: "authorization_code", code, client_id: "https://claude.test/client-metadata", redirect_uri: "https://claude.ai/api/mcp/auth_callback", code_verifier: verifier });
assert.equal((await r.json()).error, "invalid_grant");
r = await tokenReq({ grant_type: "authorization_code", code, client_id: reg.client_id, redirect_uri: "https://claude.ai/api/mcp/auth_callback", code_verifier: verifier });
assert.equal(r.status, 200); const tok = await r.json();
assert.equal(tok.token_type, "Bearer"); assert.equal(tok.expires_in, 3600); assert.equal(tok.scope, "account"); assert.ok(tok.access_token.split(".").length === 3); assert.ok(tok.refresh_token);
assert.equal(r.headers.get("Cache-Control"), "no-store");
r = await tokenReq({ grant_type: "refresh_token", refresh_token: tok.refresh_token, client_id: reg.client_id });
assert.equal(r.status, 200); const tok2 = await r.json(); assert.ok(tok2.access_token); assert.notEqual(tok2.refresh_token, tok.refresh_token);
r = await tokenReq({ grant_type: "refresh_token", refresh_token: "nonsense" }); assert.equal((await r.json()).error, "invalid_grant");
r = await tokenReq({ grant_type: "password" }); assert.equal((await r.json()).error, "unsupported_grant_type");
r = await call("/oauth/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grant_type: "refresh_token", refresh_token: tok2.refresh_token }) });
assert.equal(r.status, 200);
console.log("ok tokens");

/* the account tools, as the person */
const auth = { Authorization: "Bearer " + tok.access_token };
r = await rpc({ jsonrpc: "2.0", id: 10, method: "tools/call", params: { name: "my_account", arguments: {} } }, auth); m = await r.json();
assert.equal(r.status, 200); assert.ok(m.result.content[0].text.includes("No username yet")); assert.ok(m.result.content[0].text.includes("fid@example.org"));
firestore["/users/uid-1/meta/profile"] = { fields: { username: { stringValue: "fid_kk" }, university: { stringValue: "KCL" } } };
r = await rpc({ jsonrpc: "2.0", id: 11, method: "tools/call", params: { name: "my_account", arguments: {} } }, auth); m = await r.json();
assert.ok(m.result.content[0].text.startsWith("**fid_kk**")); assert.ok(m.result.content[0].text.includes("KCL"));
r = await rpc({ jsonrpc: "2.0", id: 12, method: "tools/call", params: { name: "list_models", arguments: {} } }, auth); m = await r.json();
assert.ok(m.result.content[0].text.includes("No Region Atlas models"));
/* a Brodmann area cannot go in a model since v12.47: refused, with where the areas live */
r = await rpc({ jsonrpc: "2.0", id: 19, method: "tools/call", params: { name: "save_model", arguments: { name: "Area test", regions: ["hippocampus", "BA17"] } } }, auth); m = await r.json();
assert.equal(m.result.isError, true); assert.ok(m.result.content[0].text.includes("Brodmann Area Atlas"), m.result.content[0].text);
assert.ok(!firestore["/users/uid-1/tools/regions/files/Area%20test"]);
r = await rpc({ jsonrpc: "2.0", id: 13, method: "tools/call", params: { name: "save_model", arguments: { name: "Memory circuit", regions: ["hippocampus", "left amygdala", "thalamus"] } } }, auth); m = await r.json();
assert.equal(m.result.isError, undefined, m.result.content[0].text); assert.ok(m.result.content[0].text.includes("Saved **Memory circuit**"));
const saved = firestore["/users/uid-1/tools/regions/files/Memory%20circuit"]; assert.ok(saved);
const data = saved.fields.data.mapValue.fields;
assert.equal(data.tool.stringValue, "regions"); assert.equal(data.selections.arrayValue.values.length, 3);
assert.equal(data.selections.arrayValue.values[0].mapValue.fields.key.stringValue, "P:Hippocampus");
assert.deepEqual(data.selections.arrayValue.values[0].mapValue.fields.indices.arrayValue.values.map(v => Number(v.integerValue)), [37, 38]);
assert.equal(data.selections.arrayValue.values[2].mapValue.fields.key.stringValue, "P:Thalamus");
assert.equal(data.selections.arrayValue.values[2].mapValue.fields.atlas.stringValue, "aal");
assert.ok(firestore["/users/uid-1/meta/toolindex"].fields.regions.booleanValue);
const fsCall = calls.find(c => c.method === "POST" && c.url.includes("/files?documentId=")); assert.equal(fsCall.auth, "Bearer " + tok.access_token);
r = await rpc({ jsonrpc: "2.0", id: 14, method: "tools/call", params: { name: "save_model", arguments: { name: "Memory circuit", regions: ["putamen"] } } }, auth); m = await r.json();
assert.equal(m.result.isError, true); assert.ok(m.result.content[0].text.includes("already saved"));
r = await rpc({ jsonrpc: "2.0", id: 15, method: "tools/call", params: { name: "save_model", arguments: { name: "Bad", regions: ["nowhere land"] } } }, auth); m = await r.json();
assert.equal(m.result.isError, true); assert.ok(m.result.content[0].text.includes("nowhere land"));
r = await rpc({ jsonrpc: "2.0", id: 16, method: "tools/call", params: { name: "list_models", arguments: {} } }, auth); m = await r.json();
assert.ok(m.result.content[0].text.includes("1 model saved")); assert.ok(m.result.content[0].text.includes("regions.html#sel=P:Hippocampus|L:Amygdala|P:Thalamus"));
r = await rpc({ jsonrpc: "2.0", id: 17, method: "tools/call", params: { name: "load_model", arguments: { name: "Memory circuit" } } }, auth); m = await r.json();
assert.ok(m.result.content[0].text.includes("Amygdala, left")); assert.ok(m.result.content[0].text.includes("Thalamus"));
r = await rpc({ jsonrpc: "2.0", id: 18, method: "tools/call", params: { name: "load_model", arguments: { name: "Nope" } } }, auth); m = await r.json();
assert.equal(m.result.isError, true);
/* a batch that mixes a public and an account call is gated as a whole */
r = await rpc([{ jsonrpc: "2.0", id: 19, method: "tools/call", params: { name: "search_brain", arguments: { query: "faces" } } }, { jsonrpc: "2.0", id: 20, method: "tools/call", params: { name: "my_account", arguments: {} } }]);
assert.equal(r.status, 401);
r = await rpc([{ jsonrpc: "2.0", id: 19, method: "tools/call", params: { name: "search_brain", arguments: { query: "faces" } } }, { jsonrpc: "2.0", id: 20, method: "tools/call", params: { name: "my_account", arguments: {} } }], auth);
assert.equal(r.status, 200); assert.equal((await r.json()).length, 2);
console.log("ok account tools");

/* a dead Firebase session is an invalid_grant, and no secret is a plain 503 */
const dead = await oauthT.seal(env, { t: "refresh", uid: "uid-1", rt: "dead", cid: reg.client_id, sc: "account", iat: 1 });
r = await tokenReq({ grant_type: "refresh_token", refresh_token: dead }); assert.equal(r.status, 400); assert.equal((await r.json()).error, "invalid_grant");
r = await worker.fetch(new Request("https://mcp.test/oauth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] }) }), Object.assign({}, env, { OAUTH_SECRET: "" }));
assert.equal(r.status, 503);
console.log("ok failure modes");
console.log("all passed");
