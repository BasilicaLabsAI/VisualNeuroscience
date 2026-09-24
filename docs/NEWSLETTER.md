# The newsletter: the box on the pages and the worker behind it

`site/assets/newsletter.js` draws the box; `newsletter-worker/` receives what is typed into it and adds
the address to the newsletter's list at Mailchimp. Nothing about a reader is kept anywhere in this
repository or the worker.

## The box
- Appears once a reader has been on a page for twenty seconds, or scrolled half of it; not on
  the privacy page. `?newsletter=1` on any address shows it at once, for checking.
- Closing it, or pressing Escape, keeps it away for fourteen days; signing up keeps it away for
  good. Both are one small entry in the browser's local storage, cleared with site data.
- A hidden field bots fill in and people never see marks a submission as junk; the worker
  answers those with a quiet success and sends nothing.
- After a signup it says Mailchimp has sent a confirmation email, because the address joins the
  list only once its owner confirms it; an address already on the list is told so, and one
  Mailchimp refuses as made up is answered in Mailchimp's own words.
- The endpoint is the constant at the top of `newsletter.js`. Change it there if the worker's
  address changes, and bump `VERSION` in `sw.js` so installed copies pick it up.

## Setting up Mailchimp (once)
1. The account's audience is the list. Keep its signup fields to the email address alone: a
   required name or postal field makes every signup from the box fail.
2. **API key:** profile menu → Profile → Extras → API keys → Create A Key. It is shown once. The
   part after the dash, for example `us21`, is the data centre.
3. **Audience ID:** Audience → Settings → Audience name and defaults.
4. From `newsletter-worker/`, paste each value when asked; none of them goes in the repository:

       npx wrangler secret put MAILCHIMP_API_KEY    # the API key
       npx wrangler secret put MAILCHIMP_LIST_ID    # the Audience ID
       npx wrangler secret put MAILCHIMP_DC         # the data centre, for example us21
       npx wrangler secret delete NEWSLETTER_TO     # retire the email route
       npx wrangler deploy

5. Try it with an address you own: open any page with `?newsletter=1` and sign up. Mailchimp's
   confirmation email arrives, and the contact shows in the audience as pending until it is
   confirmed. Mailchimp refuses example.com and other made-up addresses, so test with a real one.

Smoke test from a terminal, with a real address:

    curl -s https://visualneuroscience-newsletter.cloudflare-passport599.workers.dev/subscribe \
      -X POST -H 'content-type: application/json' -H 'origin: https://visualneuroscience.ai' \
      -d '{"email":"you@yourdomain.com","page":"/test"}'

It answers `{"ok":true,"via":["mailchimp"]}`, or the reason it could not.

## Who the emails come from
Mailchimp sends the confirmation and every newsletter from the audience's default From address,
`fkarim@visualneuroscience.ai`, set under Audience → Settings → Audience name and defaults, where
Mailchimp asks to verify the address by email. Authenticating visualneuroscience.ai in Mailchimp's
Domains settings, with the records it gives added to Cloudflare DNS, keeps the emails out of spam.

## How the worker routes an address
Mailchimp first, whenever its three secrets are set, adding the address as pending so that
Mailchimp sends its own confirmation (double opt-in, which the privacy page promises). Then, only
if the `NEWSLETTER_TO` secret is still set, an email copy of the signup to that address. Each route
is tried on its own: one that is down or not set up never costs a signup the other took, and its
failure goes to the worker's log.

## The email route, if it is ever wanted back
It sends through the worker's `send_email` binding, which needs Cloudflare's Email Service on the
domain of the From address, `newsletter@visualneuroscience.ai`. Without it the route fails with
"could not find account config of sending domain". Onboarding a domain to Email Routing points its
MX records at Cloudflare, so if another provider holds the fkarim@visualneuroscience.ai mailbox,
leave this route off rather than move the domain's mail.

1. Cloudflare dashboard → Compute → Email Service → Email Routing → Onboard Domain →
   visualneuroscience.ai, accepting the records it adds; then Destination Addresses → add
   `fkarim@visualneuroscience.ai` and click the link in the verification email that arrives.
2. `npx wrangler secret put NEWSLETTER_TO` with that address, and `npx wrangler deploy`.
3. Change the privacy paragraph to say the maker is also emailed a copy of each signup.

## What the privacy page says
Under Optional services: a small server of ours passes the address straight to Mailchimp, run by
Intuit on servers in the United States, which keeps the list and sends the emails; Mailchimp writes
first to confirm; every email carries a way to leave; the address is used for the newsletter and
nothing else, and our server keeps no copy. Keep this file, that paragraph and the worker in
agreement.
