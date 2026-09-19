/* The newsletter signup, run where an email can be sent.

   The site's newsletter box (assets/newsletter.js) posts an address here.
   This Worker checks it and passes it on, two ways, each used if it is
   configured:

     1. An email to the address in the NEWSLETTER_TO secret, through the
        Worker's send_email binding, so signups arrive in an inbox while a
        mailing-list service is being set up.
     2. Mailchimp, once MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID and
        MAILCHIMP_DC are set: the address is added to the list as pending,
        so Mailchimp sends its own confirmation email (double opt-in).

   The endpoint:

     POST /subscribe   {email, page, website}
       website is a honeypot the form keeps empty and hidden; a filled one
       is a bot, answered with a quiet 200 and nothing sent.
       Answers {ok:true}, or {ok:false, error} with a 4xx.

   Configuration — vars in wrangler.jsonc: MAIL_FROM (an address on a zone
   with Email Routing turned on), ALLOWED_ORIGINS (comma-separated) — and
   secrets (wrangler secret put …): NEWSLETTER_TO, and optionally the three
   MAILCHIMP_* values. Nothing about the reader is stored here: the address
   goes out and the request ends. */

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export default {
  async fetch(req, env){
    const url = new URL(req.url);
    if (url.pathname === "/health") return new Response("ok");
    if (url.pathname !== "/subscribe") return new Response("Not found", { status: 404 });
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env, req) });
    if (req.method !== "POST") return answer(env, req, 405, { ok: false, error: "POST only" });
    try {
      return await subscribe(req, env);
    } catch (err){
      console.error(err && err.stack || err);
      return answer(env, req, 502, { ok: false, error: "Could not pass the address on just now." });
    }
  }
};

function origins(env){
  return String(env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
}
function cors(env, req){
  const o = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": origins(env).includes(o) ? o : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function answer(env, req, status, body){
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors(env, req) } });
}

async function subscribe(req, env){
  let body = {};
  try { body = await req.json(); } catch (e){ return answer(env, req, 400, { ok: false, error: "Send JSON." }); }
  if (String(body.website || "").trim()) return answer(env, req, 200, { ok: true });    // the honeypot caught a bot
  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL.test(email)) return answer(env, req, 400, { ok: false, error: "That does not look like an email address." });
  const page = String(body.page || "").slice(0, 200);
  const when = new Date().toISOString();
  const country = (req.cf && req.cf.country) || "";
  const done = [];
  if (env.MAIL && env.NEWSLETTER_TO){
    await deliverByEmail(env, { email, page, when, country });
    done.push("email");
  }
  if (env.MAILCHIMP_API_KEY && env.MAILCHIMP_LIST_ID && env.MAILCHIMP_DC){
    const r = await deliverToMailchimp(env, email);
    done.push(r);
  }
  if (!done.length) return answer(env, req, 503, { ok: false, error: "The newsletter is not set up yet." });
  return answer(env, req, 200, { ok: true, via: done });
}

/* ── the email ─────────────────────────────────────────────────────────── */
export function mime({ from, to, subject, text }){
  const id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) + "@" + (from.split("@")[1] || "visualneuroscience.ai");
  return [
    `From: VisualNeuroscience.AI <${from}>`,
    `To: <${to}>`,
    `Subject: ${subject.replace(/[\r\n]+/g, " ")}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${id}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text
  ].join("\r\n");
}

async function deliverByEmail(env, { email, page, when, country }){
  const text = ["A reader asked to join the VisualNeuroscience.AI newsletter.", "",
                `Email:    ${email}`, `Page:     ${page || "(unknown)"}`, `Time:     ${when}`,
                `Country:  ${country || "(unknown)"}`, "",
                "Add them to the list. This message came from the newsletter-worker; nothing was stored."].join("\r\n");
  const raw = mime({ from: env.MAIL_FROM, to: env.NEWSLETTER_TO, subject: `Newsletter signup: ${email}`, text });
  const EmailMessage = globalThis.__EmailMessage || (await import("cloudflare:email")).EmailMessage;
  await env.MAIL.send(new EmailMessage(env.MAIL_FROM, env.NEWSLETTER_TO, raw));
}

/* ── Mailchimp, when its secrets exist ─────────────────────────────────── */
async function deliverToMailchimp(env, email){
  const res = await fetch(`https://${env.MAILCHIMP_DC}.api.mailchimp.com/3.0/lists/${env.MAILCHIMP_LIST_ID}/members`, {
    method: "POST",
    headers: { "Authorization": "Basic " + btoa("anystring:" + env.MAILCHIMP_API_KEY), "Content-Type": "application/json" },
    body: JSON.stringify({ email_address: email, status: "pending", tags: ["site"] })
  });
  if (res.ok) return "mailchimp";
  const detail = await res.json().catch(() => ({}));
  if (detail.title === "Member Exists") return "mailchimp: already on the list";
  throw new Error("Mailchimp " + res.status + " " + (detail.detail || ""));
}
