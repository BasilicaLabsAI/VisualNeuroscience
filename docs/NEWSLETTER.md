# The newsletter: the box on the pages and the worker behind it

`site/assets/newsletter.js` draws the box; `newsletter-worker/` receives what is typed into it.
Nothing about a reader is kept anywhere in this repository or the worker.

## The box
- Appears once a reader has been on a page for twenty seconds, or scrolled half of it; not on
  the privacy page. `?newsletter=1` on any address shows it at once, for checking.
- Closing it, or pressing Escape, keeps it away for fourteen days; signing up keeps it away for
  good. Both are one small entry in the browser's local storage, cleared with site data.
- A hidden field bots fill in and people never see marks a submission as junk; the worker
  answers those with a quiet success and sends nothing.
- The endpoint is the constant at the top of `newsletter.js`. Change it there if the worker's
  address changes, and bump `VERSION` in `sw.js` so installed copies pick it up.

## Setting the worker up (once)
The worker sends an email through Cloudflare's `send_email` binding, which needs Email Routing on
the zone the From address belongs to.

1. Cloudflare dash → visualneuroscience.ai → **Email → Email Routing** → enable it. Add
   `fid@ottomanlabs.ai` as a **destination address** and click the verification email it sends.
   The From address, `newsletter@visualneuroscience.ai`, needs no mailbox; the binding may send
   from any address on a zone with routing enabled.
2. From `newsletter-worker/`:

       npx wrangler secret put NEWSLETTER_TO      # paste fid@ottomanlabs.ai
       npx wrangler deploy

   The worker deploys to `visualneuroscience-newsletter.cloudflare-passport599.workers.dev`,
   which is the address already written into `newsletter.js`. For a proper address, add a custom
   domain to the worker (Settings → Domains & Routes) and change the constant.
3. Try it: open any page with `?newsletter=1`, sign up with your own address, and the email
   arrives at the destination.

Smoke test from a terminal:

    curl -s https://visualneuroscience-newsletter.cloudflare-passport599.workers.dev/subscribe \
      -X POST -H 'content-type: application/json' -H 'origin: https://visualneuroscience.ai' \
      -d '{"email":"you@example.com","page":"/test"}'

## Switching to Mailchimp
Three secrets turn the Mailchimp path on; the email path keeps working alongside it until
`NEWSLETTER_TO` is deleted.

    npx wrangler secret put MAILCHIMP_API_KEY    # Mailchimp → Account → Extras → API keys
    npx wrangler secret put MAILCHIMP_LIST_ID    # Audience → Settings → Audience name and defaults
    npx wrangler secret put MAILCHIMP_DC         # the part after the dash in the API key, e.g. us21

Addresses are added with status `pending`, so Mailchimp sends its own confirmation email and
the list is double opt-in, which is what the privacy page promises. An address already on the
list is reported as such and counted a success.

## What the privacy page says
Under Optional services: the address is sent once to the maker of the site, added to the list
once one is in use, used for the newsletter and nothing else, and not kept by the server. Keep
this file, that paragraph and the worker in agreement.
