/* Sign-in for the MCP server: an OAuth 2.1 authorization server in front of
   the site's Firebase accounts.

   An assistant that wants to touch someone's account (save a model, say) is
   sent through the usual authorization-code flow with PKCE. The sign-in
   itself happens on the website, at /connect.html, with the same Firebase
   session the app uses; the page hands this server the person's Firebase
   ID token and refresh token, and this server hands the assistant an
   authorization code for them. The tokens the assistant then holds are
   Firebase's own: the access token is a Firebase ID token, good for an
   hour and verified here against Google's published keys, and the refresh
   token is Firebase's, sealed inside an envelope only this server can
   open. Revoking the person's sessions, or deleting the account, ends both.

   Nothing is stored. Every code, ticket and envelope is a sealed blob
   (AES-GCM under a key derived from the OAUTH_SECRET secret) that carries
   its own contents and expiry, so the server keeps no table of clients,
   codes or tokens. Clients register themselves either by Dynamic Client
   Registration, which answers with a sealed client id holding the redirect
   URIs they gave, or by a Client ID Metadata Document, an https URL this
   server fetches and checks, which is how Claude identifies itself.

   The endpoints, all on the server's own origin:

     GET  /.well-known/oauth-protected-resource      RFC 9728
     GET  /.well-known/oauth-authorization-server    RFC 8414
     POST /oauth/register                             RFC 7591
     GET  /oauth/authorize                            → /connect.html on the site
     GET  /oauth/request?req=…                        what the consent page shows
     POST /oauth/approve                              the consent page's answer
     POST /oauth/token                                code and refresh grants

   The 401 the MCP endpoint answers a protected tool call with, and the
   verification of a bearer token, are exported for worker.js. */

const SCOPES = ["account"];
const SECURETOKEN_JWKS = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const SECURETOKEN_REFRESH = "https://securetoken.googleapis.com/v1/token";
const CODE_TTL = 120, TICKET_TTL = 600;

/* ── bytes, keys and sealed blobs ──────────────────────────────────────── */

const b64u = {
  encode: buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  decode: s => Uint8Array.from(atob(String(s).replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0))
};
const utf8 = { enc: s => new TextEncoder().encode(s), dec: b => new TextDecoder().decode(b) };

let keyCache = null, keyFor = null;
async function sealKey(env){
  const secret = String(env.OAUTH_SECRET || "");
  if (!secret) throw new ConfigError("OAUTH_SECRET is not set on the worker");
  if (keyCache && keyFor === secret) return keyCache;
  const raw = await crypto.subtle.digest("SHA-256", utf8.enc("vn-mcp-oauth:" + secret));
  keyCache = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  keyFor = secret;
  return keyCache;
}
class ConfigError extends Error {}

async function seal(env, obj){
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await sealKey(env), utf8.enc(JSON.stringify(obj)));
  const out = new Uint8Array(12 + ct.byteLength); out.set(iv); out.set(new Uint8Array(ct), 12);
  return b64u.encode(out);
}
async function open(env, blob, type){
  try{
    const bytes = b64u.decode(blob);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, await sealKey(env), bytes.slice(12));
    const obj = JSON.parse(utf8.dec(pt));
    if (obj.t !== type) return null;
    if (obj.exp && obj.exp < now()) return null;
    return obj;
  }catch(e){
    if (e instanceof ConfigError) throw e;
    return null;
  }
}
const now = () => Math.floor(Date.now() / 1000);

async function sha256b64u(s){ return b64u.encode(await crypto.subtle.digest("SHA-256", utf8.enc(s))); }

/* ── the client that is asking ─────────────────────────────────────────── */

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/i;
function sameRedirect(given, registered){
  if (given === registered) return true;
  let g, r;
  try{ g = new URL(given); r = new URL(registered); }catch(_){ return false; }
  /* a native client binds whichever port is free, so loopback URIs match
     with the port ignored (RFC 8252 §7.3) */
  if (g.protocol !== "http:" || r.protocol !== "http:") return false;
  if (!LOOPBACK.test(g.hostname) || !LOOPBACK.test(r.hostname)) return false;
  return g.hostname.toLowerCase() === r.hostname.toLowerCase() && g.pathname === r.pathname && g.search === r.search;
}
function acceptableRedirect(u){
  let x; try{ x = new URL(u); }catch(_){ return false; }
  if (x.protocol === "https:") return true;
  return x.protocol === "http:" && LOOPBACK.test(x.hostname);
}

/* a client id is either a sealed registration from /oauth/register or the
   https address of a Client ID Metadata Document */
async function resolveClient(env, clientId){
  if (!clientId) return null;
  if (clientId.startsWith("dcr.")){
    const reg = await open(env, clientId.slice(4), "client");
    if (!reg || !Array.isArray(reg.r)) return null;
    return { id: clientId, redirectUris: reg.r, host: null, name: reg.n || null };
  }
  let u; try{ u = new URL(clientId); }catch(_){ return null; }
  if (u.protocol !== "https:" || u.hash) return null;
  let doc;
  try{
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(clientId, { headers: { accept: "application/json" }, signal: ctrl.signal, redirect: "manual" });
    clearTimeout(timer);
    if (!r.ok) return null;
    const text = await r.text();
    if (text.length > 65536) return null;
    doc = JSON.parse(text);
  }catch(_){ return null; }
  if (!doc || doc.client_id !== clientId || !Array.isArray(doc.redirect_uris)) return null;
  return { id: clientId, redirectUris: doc.redirect_uris.map(String), host: u.host, name: doc.client_name || null };
}

/* ── discovery ─────────────────────────────────────────────────────────── */

export function protectedResourceMetadata(env){
  return {
    resource: env.ISSUER + "/",
    authorization_servers: [env.ISSUER],
    scopes_supported: SCOPES,
    bearer_methods_supported: ["header"],
    resource_name: "VisualNeuroscience.AI Brain Atlas",
    resource_documentation: env.SITE_ORIGIN + "/mcp.html"
  };
}
export function authorizationServerMetadata(env){
  return {
    issuer: env.ISSUER,
    authorization_endpoint: env.ISSUER + "/oauth/authorize",
    token_endpoint: env.ISSUER + "/oauth/token",
    registration_endpoint: env.ISSUER + "/oauth/register",
    scopes_supported: SCOPES,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    client_id_metadata_document_supported: true,
    service_documentation: env.SITE_ORIGIN + "/mcp.html"
  };
}

/* the challenge the MCP endpoint answers a protected call with */
export function unauthorized(env, description){
  const d = description || "Sign in with your VisualNeuroscience.AI account to use this tool";
  return new Response(JSON.stringify({ error: "invalid_token", error_description: d }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": 'Bearer error="invalid_token", error_description="' + d.replace(/"/g, "'") + '", ' +
        'resource_metadata="' + env.ISSUER + '/.well-known/oauth-protected-resource", scope="account"'
    }
  });
}

/* ── Firebase: verifying an ID token, refreshing one ──────────────────── */

let jwksCache = null, jwksAt = 0;
export async function verifyIdToken(env, jwt){
  const parts = String(jwt || "").split(".");
  if (parts.length !== 3) return null;
  let head, body;
  try{ head = JSON.parse(utf8.dec(b64u.decode(parts[0]))); body = JSON.parse(utf8.dec(b64u.decode(parts[1]))); }
  catch(_){ return null; }
  const pid = env.FIREBASE_PROJECT_ID;
  if (head.alg !== "RS256" || body.aud !== pid || body.iss !== "https://securetoken.google.com/" + pid ||
      !body.sub || typeof body.exp !== "number" || body.exp < now()) return null;
  if (!jwksCache || Date.now() - jwksAt > 3600e3 || !jwksCache.some(k => k.kid === head.kid)){
    try{
      const r = await fetch(SECURETOKEN_JWKS);
      if (!r.ok) return null;
      jwksCache = (await r.json()).keys || []; jwksAt = Date.now();
    }catch(_){ return null; }
  }
  const jwk = jwksCache.find(k => k.kid === head.kid);
  if (!jwk) return null;
  try{
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u.decode(parts[2]), utf8.enc(parts[0] + "." + parts[1]));
    return ok ? { uid: body.sub, email: body.email || null, name: body.name || null, exp: body.exp } : null;
  }catch(_){ return null; }
}

/* a Firebase refresh token for a fresh ID token: Firebase's own endpoint,
   with the project's public web key */
async function refreshFirebase(env, refreshToken){
  const r = await fetch(SECURETOKEN_REFRESH + "?key=" + encodeURIComponent(env.FIREBASE_API_KEY), {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken })
  });
  let j = null; try{ j = await r.json(); }catch(_){}
  if (!r.ok || !j || !j.id_token) return { error: (j && j.error && j.error.message) || "refresh failed" };
  return { idToken: j.id_token, refreshToken: j.refresh_token || refreshToken, expiresIn: Number(j.expires_in) || 3600, uid: j.user_id };
}

/* ── the endpoints ─────────────────────────────────────────────────────── */

const json = (obj, status, extra) => new Response(JSON.stringify(obj), {
  status: status || 200, headers: Object.assign({ "Content-Type": "application/json", "Cache-Control": "no-store", "Pragma": "no-cache" }, extra || {})
});
function corsHeaders(env, req){
  const origin = req.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || env.SITE_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : allowed[0] || "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function page(title, body){
  return new Response("<!DOCTYPE html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>" + title +
    " — VisualNeuroscience.AI</title><body style='font-family:Georgia,serif;max-width:40rem;margin:4rem auto;padding:0 1.2rem;line-height:1.55'><h1 style='font-weight:400;font-size:1.5rem'>" +
    title + "</h1><p>" + body + "</p>", { status: 400, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
function redirectWith(base, params){
  const u = new URL(base);
  Object.entries(params).forEach(([k, v]) => { if (v != null) u.searchParams.set(k, v); });
  return u.toString();
}

async function register(req, env){
  let body; try{ body = await req.json(); }catch(_){ return json({ error: "invalid_client_metadata", error_description: "The registration must be JSON" }, 400); }
  const uris = Array.isArray(body && body.redirect_uris) ? body.redirect_uris.map(String) : [];
  if (!uris.length || !uris.every(acceptableRedirect))
    return json({ error: "invalid_redirect_uri", error_description: "redirect_uris must be https addresses, or http on localhost or 127.0.0.1" }, 400);
  const methods = body.token_endpoint_auth_method ? [body.token_endpoint_auth_method] : ["none"];
  if (!methods.includes("none")) return json({ error: "invalid_client_metadata", error_description: "Only public clients are registered here: token_endpoint_auth_method must be none" }, 400);
  const name = typeof body.client_name === "string" ? body.client_name.slice(0, 80) : null;
  const id = "dcr." + await seal(env, { t: "client", r: uris, n: name, iat: now() });
  return json({
    client_id: id, client_id_issued_at: now(), redirect_uris: uris, client_name: name || undefined,
    token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"]
  }, 201);
}

async function authorize(url, env){
  const q = url.searchParams;
  const client = await resolveClient(env, q.get("client_id"));
  if (!client) return page("Unknown client", "The app asking to connect could not be identified, so nothing was signed in. Close this window and try again from the app.");
  const redirectUri = q.get("redirect_uri") || "";
  if (!redirectUri || !client.redirectUris.some(r => sameRedirect(redirectUri, r)))
    return page("Unknown return address", "The app asked to be sent to an address it did not register, so nothing was signed in.");
  const back = (error, description) => Response.redirect(redirectWith(redirectUri, { error, error_description: description, state: q.get("state") }), 302);
  if (q.get("response_type") !== "code") return back("unsupported_response_type", "Only response_type=code is supported");
  if (!q.get("code_challenge")) return back("invalid_request", "code_challenge is required");
  if ((q.get("code_challenge_method") || "S256") !== "S256") return back("invalid_request", "code_challenge_method must be S256");
  const scopes = (q.get("scope") || "account").split(/[\s+]+/).filter(Boolean);
  if (scopes.some(s => !SCOPES.includes(s))) return back("invalid_scope", "The scopes offered are: " + SCOPES.join(" "));
  const resource = q.get("resource");
  if (resource && resource.replace(/\/$/, "") !== env.ISSUER) return back("invalid_target", "This server answers for " + env.ISSUER + "/ only");
  let ru; try{ ru = new URL(redirectUri); }catch(_){ ru = null; }
  const ticket = await seal(env, {
    t: "req", cid: client.id, host: client.host || (ru && ru.host) || "the app", rh: ru ? ru.host : "",
    lb: !!(ru && ru.protocol === "http:" && LOOPBACK.test(ru.hostname)),
    ru: redirectUri, st: q.get("state"), cc: q.get("code_challenge"), sc: scopes.join(" "), exp: now() + TICKET_TTL
  });
  return Response.redirect(env.SITE_ORIGIN + "/connect.html#req=" + encodeURIComponent(ticket), 302);
}

/* the consent page asks what it should show, and answers with the decision */
async function request(url, env, req){
  const t = await open(env, url.searchParams.get("req") || "", "req");
  if (!t) return json({ error: "expired", error_description: "This sign-in request has expired or is not valid. Start again from the app." }, 400, corsHeaders(env, req));
  return json({ client: t.host, redirect_host: t.rh, loopback: t.lb, scope: t.sc, expires: t.exp }, 200, corsHeaders(env, req));
}
async function approve(req, env){
  const cors = corsHeaders(env, req);
  let body; try{ body = await req.json(); }catch(_){ return json({ error: "invalid_request" }, 400, cors); }
  const t = await open(env, String(body.req || ""), "req");
  if (!t) return json({ error: "expired", error_description: "This sign-in request has expired or is not valid. Start again from the app." }, 400, cors);
  if (body.decision !== "allow")
    return json({ redirect: redirectWith(t.ru, { error: "access_denied", error_description: "The person declined", state: t.st }) }, 200, cors);
  const who = await verifyIdToken(env, body.id_token);
  if (!who) return json({ error: "not_signed_in", error_description: "The sign-in could not be confirmed. Log in again and press Allow." }, 401, cors);
  if (!body.refresh_token || typeof body.refresh_token !== "string") return json({ error: "invalid_request", error_description: "The refresh token is missing" }, 400, cors);
  const code = await seal(env, { t: "code", uid: who.uid, rt: body.refresh_token, cid: t.cid, ru: t.ru, cc: t.cc, sc: t.sc, exp: now() + CODE_TTL });
  return json({ redirect: redirectWith(t.ru, { code, state: t.st }) }, 200, cors);
}

async function token(req, env){
  let form;
  const ct = req.headers.get("Content-Type") || "";
  try{
    if (ct.includes("application/json")) form = new URLSearchParams(Object.entries(await req.json()).map(([k, v]) => [k, String(v)]));
    else form = new URLSearchParams(await req.text());
  }catch(_){ return json({ error: "invalid_request", error_description: "The body must be a form" }, 400); }
  const grant = form.get("grant_type");
  const clientId = form.get("client_id") || "";
  if (grant === "authorization_code"){
    const c = await open(env, form.get("code") || "", "code");
    if (!c) return json({ error: "invalid_grant", error_description: "The code is not valid or has expired" }, 400);
    if (clientId && clientId !== c.cid) return json({ error: "invalid_grant", error_description: "The code was issued to a different client" }, 400);
    if (form.get("redirect_uri") && form.get("redirect_uri") !== c.ru) return json({ error: "invalid_grant", error_description: "redirect_uri does not match the authorization request" }, 400);
    const verifier = form.get("code_verifier") || "";
    if (!verifier || await sha256b64u(verifier) !== c.cc) return json({ error: "invalid_grant", error_description: "PKCE verification failed" }, 400);
    const fresh = await refreshFirebase(env, c.rt);
    if (fresh.error) return json({ error: "invalid_grant", error_description: "The sign-in is no longer valid (" + fresh.error + ")" }, 400);
    return json({
      access_token: fresh.idToken, token_type: "Bearer", expires_in: fresh.expiresIn, scope: c.sc,
      refresh_token: await seal(env, { t: "refresh", uid: c.uid, rt: fresh.refreshToken, cid: c.cid, sc: c.sc, iat: now(), n: b64u.encode(crypto.getRandomValues(new Uint8Array(8))) })
    });
  }
  if (grant === "refresh_token"){
    const r = await open(env, form.get("refresh_token") || "", "refresh");
    if (!r) return json({ error: "invalid_grant", error_description: "The refresh token is not valid" }, 400);
    if (clientId && clientId !== r.cid) return json({ error: "invalid_grant", error_description: "The refresh token belongs to a different client" }, 400);
    const fresh = await refreshFirebase(env, r.rt);
    if (fresh.error) return json({ error: "invalid_grant", error_description: "The sign-in is no longer valid (" + fresh.error + ")" }, 400);
    return json({
      access_token: fresh.idToken, token_type: "Bearer", expires_in: fresh.expiresIn, scope: r.sc,
      refresh_token: await seal(env, { t: "refresh", uid: r.uid, rt: fresh.refreshToken, cid: r.cid, sc: r.sc, iat: now(), n: b64u.encode(crypto.getRandomValues(new Uint8Array(8))) })
    });
  }
  return json({ error: "unsupported_grant_type", error_description: "authorization_code and refresh_token are supported" }, 400);
}

/* the router: null when the request is not one of ours */
export async function handleOAuth(req, env){
  const url = new URL(req.url);
  const p = url.pathname;
  const isOurs = p === "/.well-known/oauth-protected-resource" || p === "/.well-known/oauth-authorization-server" || p.startsWith("/oauth/");
  if (!isOurs) return null;
  try{
    if (p === "/.well-known/oauth-protected-resource" && req.method === "GET") return json(protectedResourceMetadata(env), 200, { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" });
    if (p === "/.well-known/oauth-authorization-server" && req.method === "GET") return json(authorizationServerMetadata(env), 200, { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" });
    if (p === "/oauth/register" && req.method === "POST") return await register(req, env);
    if (p === "/oauth/authorize" && req.method === "GET") return await authorize(url, env);
    if (p === "/oauth/request"){
      if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(env, req) });
      if (req.method === "GET") return await request(url, env, req);
    }
    if (p === "/oauth/approve"){
      if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(env, req) });
      if (req.method === "POST") return await approve(req, env);
    }
    if (p === "/oauth/token" && req.method === "POST") return await token(req, env);
    return json({ error: "not_found" }, 404);
  }catch(e){
    if (e instanceof ConfigError) return json({ error: "server_error", error_description: "Sign-in is not switched on for this server yet: " + e.message }, 503);
    throw e;
  }
}

/* the bearer token on an MCP request, as a signed-in person or null */
export async function bearer(req, env){
  const h = req.headers.get("Authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  return verifyIdToken(env, m[1].trim());
}

export const _test = { seal, open, sha256b64u, sameRedirect };
