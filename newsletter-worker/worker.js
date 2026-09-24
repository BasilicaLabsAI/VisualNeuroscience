/* The newsletter signup, run where an email can be sent.

   The site's newsletter box (assets/newsletter.js) posts an address here.
   This Worker checks it and passes it on, two ways, each used if it is
   configured, and each tried on its own so that one being down never costs
   a signup the other took:

     1. Mailchimp, once MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID and
        MAILCHIMP_DC are set: the address is added to the list as pending,
        so Mailchimp sends its own confirmation email (double opt-in). This
        is the list.
     2. An email to the address in the NEWSLETTER_TO secret, through the
        Worker's send_email binding, a copy of each signup for the maker.
        It needs Cloudflare's Email Service on the sending domain; delete
        the secret to leave it off.

   The endpoint:

     POST /subscribe   {email, page, website}
       website is a honeypot the form keeps empty and hidden; a filled one
       is a bot, answered with a quiet 200 and nothing sent.
       Answers {ok:true, via}, or {ok:false, error} with a 4xx, or a 502
       naming what failed when no route took the address.

   Configuration — vars in wrangler.jsonc: MAIL_FROM (an address on a zone
   with Email Routing turned on), ALLOWED_ORIGINS (comma-separated) — and
   secrets (wrangler secret put …): NEWSLETTER_TO, and optionally the three
   MAILCHIMP_* values. Nothing about the reader is stored here: the address
   goes out and the request ends. */

import { EmailMessage } from "cloudflare:email";

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
      /* say what went wrong, in the runtime's own words, so the box can show
         it and the fault can be found without the logs: nothing in these
         messages is secret, they name the binding or the address that was
         refused */
      const why = String(err && err.message || err).replace(/\s+/g, " ").slice(0, 200);
      return answer(env, req, 502, { ok: false, error: "Could not pass the address on: " + why });
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
  const done = [], failed = [];
  if (env.MAILCHIMP_API_KEY && env.MAILCHIMP_LIST_ID && env.MAILCHIMP_DC){
    try { done.push(await deliverToMailchimp(env, email)); }
    catch (err){
      /* an address Mailchimp refuses is refused, and goes no further */
      if (err.reader) return answer(env, req, 400, { ok: false, error: err.message });
      failed.push(err);
    }
  }
  if (env.MAIL && env.NEWSLETTER_TO){
    try { await deliverByEmail(env, { email, page, when, country }); done.push("email"); }
    catch (err){ failed.push(err); }
  }
  if (done.length){
    failed.forEach(err => console.error("a newsletter route failed:", err && err.stack || err));
    return answer(env, req, 200, { ok: true, via: done });
  }
  if (failed.length) throw failed[0];
  return answer(env, req, 503, { ok: false, error: "The newsletter is not set up yet." });
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
  /* an address Mailchimp will not take, as made up or as one erased at its
     owner's request, is the reader's to fix, so it is answered in Mailchimp's
     own words rather than as a fault */
  if (/looks fake or invalid|valid email address|permanently deleted/i.test(detail.detail || ""))
    throw Object.assign(new Error(String(detail.detail).slice(0, 200)), { reader: true });
  throw new Error("Mailchimp " + res.status + " " + (detail.detail || ""));
}
