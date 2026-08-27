/* The LinkedIn half of the account system, run where secrets can live.

   LinkedIn is not a Firebase provider, so this Worker does the whole OAuth
   dance server-side — "Sign In with LinkedIn using OpenID Connect", scopes
   openid profile email — and turns the result into a Firebase custom token
   minted with the service account. The client's part is one popup (web) or
   one system-browser round trip that comes home on a deep link (apps).

   The endpoints:

     GET  /auth/linkedin/start?mode=signin|link&origin=…[&app=1]
          Sets a state cookie and bounces to LinkedIn's authorisation page.

     GET  /auth/linkedin/callback?code=…&state=…
          Checks the state, swaps the code for an access token, reads
          /v2/userinfo, then:
            mode signin → resolves the Firebase uid (a stored link mapping,
              else linkedin:{sub}) — but if that email already has a
              Firebase account under another provider it answers
              {collision} instead of a token, so a duplicate account can
              never be created; otherwise mints a custom token.
            mode link → mints a short-lived signed ticket carrying the
              LinkedIn subject, for POST /link to consume.
          The answer travels by postMessage to the opening page (web) or by
          {APP_SCHEME}://auth/linkedin#… (apps).

     POST /auth/linkedin/link   {ticket}, Authorization: Bearer <ID token>
          Verifies the Firebase ID token against Google's published keys,
          verifies the ticket, and writes linkedinLinks/{sub} = uid, after
          which that LinkedIn identity signs into that account.

   Configuration — vars in wrangler.jsonc:
     FIREBASE_PROJECT_ID, SA_EMAIL (service-account email),
     LINKEDIN_CLIENT_ID, ALLOWED_ORIGINS (comma-separated), APP_SCHEME
   — and secrets (wrangler secret put …):
     LINKEDIN_CLIENT_SECRET, SA_PRIVATE_KEY (the PEM private_key field of
     the service-account JSON, newlines and all).

   Nothing secret ever reaches the client: the client secret and the
   service-account key exist only here. */

const LI_AUTH  = "https://www.linkedin.com/oauth/v2/authorization";
const LI_TOKEN = "https://www.linkedin.com/oauth/v2/accessToken";
const LI_USER  = "https://api.linkedin.com/v2/userinfo";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const SECURETOKEN_JWKS =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export default {
  async fetch(req, env, ctx){
    const url = new URL(req.url);
    try{
      if (url.pathname === "/auth/linkedin/start")    return start(url, env);
      if (url.pathname === "/auth/linkedin/callback") return callback(req, url, env);
      if (url.pathname === "/auth/linkedin/link")
        return req.method === "OPTIONS" ? cors(env, req) : link(req, env);
      return new Response("Not found", { status: 404 });
    }catch(err){
      console.error(err && err.stack || err);
      return new Response("Sign-in failed. Close this window and try again.",
        { status: 500, headers: { "Content-Type": "text/plain" } });
    }
  }
};

/* ── helpers ─────────────────────────────────────────────────────────── */

const b64u = {
  encode: buf => btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  encodeJSON: obj => b64u.encode(new TextEncoder().encode(JSON.stringify(obj))),
  decode: s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0))
};

function origins(env){
  return String(env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
}

function cors(env, req){
  const o = req.headers.get("Origin") || "";
  const ok = origins(env).includes(o);
  return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": ok ? o : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  }});
}

async function saKey(env){
  const pem = String(env.SA_PRIVATE_KEY || "")
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

async function signJWT(env, claims){
  const head = b64u.encodeJSON({ alg: "RS256", typ: "JWT" });
  const body = b64u.encodeJSON(claims);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", await saKey(env),
    new TextEncoder().encode(head + "." + body));
  return head + "." + body + "." + b64u.encode(sig);
}

/* a Firebase custom token is just such a JWT with a fixed audience */
async function customToken(env, uid, claims){
  const now = Math.floor(Date.now() / 1000);
  return signJWT(env, {
    iss: env.SA_EMAIL, sub: env.SA_EMAIL,
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now, exp: now + 3600, uid, claims: claims || {}
  });
}

/* a Google access token for Firestore + the accounts:lookup call */
async function saAccessToken(env){
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJWT(env, {
    iss: env.SA_EMAIL, aud: GOOGLE_TOKEN, iat: now, exp: now + 3600,
    scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit"
  });
  const r = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  if (!r.ok) throw new Error("SA token exchange failed: " + await r.text());
  return (await r.json()).access_token;
}

function fsDoc(env, path){
  return "https://firestore.googleapis.com/v1/projects/" + env.FIREBASE_PROJECT_ID +
         "/databases/(default)/documents/" + path;
}

/* the mode=link ticket: HMAC-signed with the LinkedIn client secret, which
   only this worker holds — ten minutes of validity is plenty */
async function hmacKey(env){
  return crypto.subtle.importKey("raw", new TextEncoder().encode(env.LINKEDIN_CLIENT_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function makeTicket(env, sub){
  const body = b64u.encodeJSON({ sub, exp: Math.floor(Date.now()/1000) + 600, use: "vn-link" });
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(env), new TextEncoder().encode(body));
  return body + "." + b64u.encode(sig);
}
async function readTicket(env, ticket){
  const [body, sig] = String(ticket || "").split(".");
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(env),
    b64u.decode(sig), new TextEncoder().encode(body));
  if (!ok) return null;
  const t = JSON.parse(new TextDecoder().decode(b64u.decode(body)));
  if (t.use !== "vn-link" || t.exp < Date.now()/1000) return null;
  return t;
}

/* ── /start ──────────────────────────────────────────────────────────── */

function start(url, env){
  const mode = url.searchParams.get("mode") === "link" ? "link" : "signin";
  const origin = url.searchParams.get("origin") || "";
  const app = url.searchParams.get("app") === "1";
  if (!app && !origins(env).includes(origin))
    return new Response("Origin not allowed.", { status: 403 });

  const nonce = b64u.encode(crypto.getRandomValues(new Uint8Array(16)));
  const state = b64u.encodeJSON({ n: nonce, mode, origin, app });
  const redirect = url.origin + "/auth/linkedin/callback";

  const to = LI_AUTH + "?" + new URLSearchParams({
    response_type: "code",
    client_id: env.LINKEDIN_CLIENT_ID,
    redirect_uri: redirect,
    scope: "openid profile email",
    state
  });
  return new Response(null, { status: 302, headers: {
    Location: to,
    /* Lax survives the top-level redirect back from LinkedIn */
    "Set-Cookie": "vn_state=" + nonce +
      "; Max-Age=600; Path=/auth/linkedin; Secure; HttpOnly; SameSite=Lax"
  }});
}

/* ── /callback ───────────────────────────────────────────────────────── */

async function callback(req, url, env){
  const code = url.searchParams.get("code");
  let state = null;
  try{ state = JSON.parse(new TextDecoder().decode(b64u.decode(url.searchParams.get("state") || ""))); }
  catch(_){}
  const cookie = (req.headers.get("Cookie") || "").match(/vn_state=([^;]+)/);
  if (!code || !state || !cookie || cookie[1] !== state.n)
    return page(env, state, { error: "The sign-in attempt didn't match — please try again." });

  /* code → access token */
  const tr = await fetch(LI_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code", code,
      client_id: env.LINKEDIN_CLIENT_ID,
      client_secret: env.LINKEDIN_CLIENT_SECRET,
      redirect_uri: url.origin + "/auth/linkedin/callback"
    })
  });
  if (!tr.ok) return page(env, state, { error: "LinkedIn didn't accept the sign-in — please try again." });
  const { access_token } = await tr.json();

  /* who is this? — claims come from the userinfo endpoint over TLS, which
     spares us LinkedIn's id_token quirks entirely */
  const ur = await fetch(LI_USER, { headers: { Authorization: "Bearer " + access_token } });
  if (!ur.ok) return page(env, state, { error: "LinkedIn didn't share the profile — please try again." });
  const info = await ur.json();   /* sub, name, given_name, family_name, email, email_verified, picture */

  const profile = {
    name: info.name || [info.given_name, info.family_name].filter(Boolean).join(" "),
    email: info.email || "", picture: info.picture || ""
  };

  if (state.mode === "link")
    return page(env, state, { ticket: await makeTicket(env, info.sub), profile });

  const sa = await saAccessToken(env);

  /* an explicit link mapping wins */
  let uid = null;
  const mr = await fetch(fsDoc(env, "linkedinLinks/" + encodeURIComponent(info.sub)),
    { headers: { Authorization: "Bearer " + sa } });
  if (mr.ok){
    const d = await mr.json();
    uid = d.fields && d.fields.uid && d.fields.uid.stringValue || null;
  }

  /* no mapping: refuse to shadow an account that already owns this email */
  if (!uid && profile.email){
    const lr = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup", {
      method: "POST",
      headers: { Authorization: "Bearer " + sa, "Content-Type": "application/json" },
      body: JSON.stringify({ email: [profile.email], targetProjectId: env.FIREBASE_PROJECT_ID })
    });
    if (lr.ok){
      const found = ((await lr.json()).users || [])[0];
      if (found && found.localId !== "linkedin:" + info.sub){
        const methods = (found.providerUserInfo || []).map(p => p.providerId)
          .map(p => p === "password" ? "password" : p);
        if (found.emailLinkSignin) methods.push("emailLink");
        return page(env, state, { collision: { email: profile.email, methods } });
      }
    }
  }

  uid = uid || "linkedin:" + info.sub;
  const token = await customToken(env, uid, {
    provider: "linkedin.com", email: profile.email, name: profile.name, picture: profile.picture
  });
  return page(env, state, { token, profile });
}

/* the little page that carries the answer home */
function page(env, state, data){
  const app = state && state.app;
  const origin = state && state.origin;
  const payload = Object.assign({ source: "vn-linkedin" }, data);
  let html;
  if (app){
    const q = new URLSearchParams();
    if (data.token)  q.set("token", data.token);
    if (data.ticket) q.set("ticket", data.ticket);
    if (data.collision) q.set("collision", JSON.stringify(data.collision));
    if (data.profile)   q.set("profile", JSON.stringify(data.profile));
    if (data.error)     q.set("error", data.error);
    const deep = (env.APP_SCHEME || "visualneuroscience") + "://auth/linkedin#" + q.toString();
    html = `<!doctype html><meta charset="utf-8"><title>Signing in…</title>
<body style="font-family:sans-serif;padding:2rem;text-align:center">
<p>${data.error ? esc(data.error) : "Returning to the app…"}</p>
<p><a href="${esc(deep)}">Open the app</a></p>
<script>location.href=${JSON.stringify(deep)};</script>`;
  } else {
    const target = origins(env).includes(origin) ? origin : null;
    html = `<!doctype html><meta charset="utf-8"><title>Signing in…</title>
<body style="font-family:sans-serif;padding:2rem;text-align:center">
<p>${data.error ? esc(data.error) : "You can close this window."}</p>
<script>
if (window.opener && ${JSON.stringify(!!target)}){
  window.opener.postMessage(${JSON.stringify(payload)}, ${JSON.stringify(target || "")});
  window.close();
}
</script>`;
  }
  return new Response(html, { headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Set-Cookie": "vn_state=; Max-Age=0; Path=/auth/linkedin; Secure; HttpOnly; SameSite=Lax",
    "Referrer-Policy": "no-referrer"
  }});
}

function esc(s){ return String(s).replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";"); }

/* ── /link ───────────────────────────────────────────────────────────── */

async function link(req, env){
  const o = req.headers.get("Origin") || "";
  const okOrigin = origins(env).includes(o);
  const headers = {
    "Access-Control-Allow-Origin": okOrigin ? o : "null",
    "Content-Type": "application/json"
  };
  const authz = req.headers.get("Authorization") || "";
  const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  const { ticket } = await req.json().catch(() => ({}));

  const uid = idToken && await verifyIdToken(env, idToken);
  const t = await readTicket(env, ticket);
  if (!uid || !t)
    return new Response(JSON.stringify({ error: "not-authorised" }), { status: 401, headers });

  const sa = await saAccessToken(env);
  const r = await fetch(
    fsDoc(env, "linkedinLinks/" + encodeURIComponent(t.sub)) + "?updateMask.fieldPaths=uid",
    { method: "PATCH",
      headers: { Authorization: "Bearer " + sa, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { uid: { stringValue: uid } } }) });
  if (!r.ok)
    return new Response(JSON.stringify({ error: "store-failed" }), { status: 500, headers });
  return new Response(JSON.stringify({ ok: true }), { headers });
}

/* Firebase ID token check against Google's published JWKS — issuer,
   audience, expiry and signature, nothing taken on trust */
let jwksCache = null, jwksAt = 0;
async function verifyIdToken(env, jwt){
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  let head, body;
  try{
    head = JSON.parse(new TextDecoder().decode(b64u.decode(parts[0])));
    body = JSON.parse(new TextDecoder().decode(b64u.decode(parts[1])));
  }catch(_){ return null; }
  const pid = env.FIREBASE_PROJECT_ID;
  if (head.alg !== "RS256" ||
      body.aud !== pid ||
      body.iss !== "https://securetoken.google.com/" + pid ||
      !body.sub || body.exp < Date.now()/1000) return null;

  if (!jwksCache || Date.now() - jwksAt > 3600e3){
    const r = await fetch(SECURETOKEN_JWKS);
    if (!r.ok) return null;
    jwksCache = (await r.json()).keys || [];
    jwksAt = Date.now();
  }
  const jwk = jwksCache.find(k => k.kid === head.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key,
    b64u.decode(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  return ok ? body.sub : null;
}
