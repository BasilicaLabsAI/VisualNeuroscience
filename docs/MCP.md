# The MCP server: asking the atlas from Claude, ChatGPT and Kimi

`mcp-worker/` is a Cloudflare Worker speaking the Model Context Protocol
over streamable HTTP. Any assistant that talks MCP can search the atlas,
ask what a region or Brodmann area does, read receptor densities and the
brain-state stories, and every answer links straight into the view it
describes — `regions.html#sel=…`, `brodmann.html#ba=…` and
`network-atlas.html#state=…` are real deep links the pages restore. A saved
model carries AAL regions alone since v12.47, when the Brodmann areas left
the 3D Region Atlas for the Brodmann Area Atlas; `save_model` refuses a
`B:17` item and says where the areas live.

Five tools, all read-only and annotated as such: `search_brain`,
`region_info`, `brodmann_area`, `receptor_density`, `brain_state`.
Four more work on the signed-in person's account (see *Accounts* below):
`my_account`, `list_models`, `load_model`, `save_model`. No state, no logs
of its own, and no accounts of its own: sign-in is the site's Firebase
accounts, passed through. The privacy page says exactly that.

## The data

`mcp-worker/data.js` is generated — never edited — by:

    node scripts/build_mcp_data.mjs

It reads the same files the pages draw (atlas-data, region-notes,
brodmann-areas, network-states, and the receptor table inside
regions.html), so the server cannot disagree with the site. Re-run it
whenever those change, and redeploy.

## Deploying

    cd mcp-worker
    npx wrangler deploy

First time: `npx wrangler login` opens the browser for the Cloudflare
account. The worker deploys to `visualneuroscience-mcp.<account>.workers.dev`,
which works as a connector URL on its own, and to the proper address,
`mcp.visualneuroscience.ai`: the `routes` entry in `wrangler.jsonc` is a
custom domain, so the deploy creates the DNS record and the certificate in
the zone itself, with nothing to add in the dashboard. (The dashboard route
is Workers & Pages → visualneuroscience-mcp → Settings → Domains & Routes,
should it ever need checking.) A browser may hold the name's absence in its
cache for a minute or two after the first deploy.

Smoke test either URL:

    curl -s https://mcp.visualneuroscience.ai/health          # → ok
    curl -s https://mcp.visualneuroscience.ai/ -X POST \
      -H 'content-type: application/json' \
      -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

## Connecting it yourself

The public page for all of this is `site/mcp.html`
(visualneuroscience.ai/mcp.html): the address, the steps for each
assistant, the five tools with a question each, the sources and what the
server keeps. It is the documentation URL a directory listing asks for.

- **Claude** (web, desktop, mobile): Customize → Connectors → *Add custom
  connector* → paste the URL, authentication *Sign in when needed* (the atlas
  tools work without signing in; the account tools ask for it when first
  used); the tools appear in the composer's search-and-tools menu.
- **ChatGPT**: Settings → Apps & Connectors → enable *Developer mode*
  (Advanced), then *Add MCP server* with the URL. Works in conversation
  once enabled.
- **Kimi**: `kimi mcp add --transport http visualneuroscience
  https://mcp.visualneuroscience.ai/` in Kimi Code, or add the same to
  `~/.kimi-code/mcp.json`; the consumer app follows Moonshot's rollout.

## Getting listed in the directories

- **Claude connectors directory**: the developer portal at
  claude.ai/directory/manage (*Submit new* → *MCP connector*), open to any
  paid plan. It connects to the production server and reads the tools: each
  needs a `title` **inside its annotations** and a `readOnlyHint`, which all
  five carry. The listing wants a documentation URL
  (visualneuroscience.ai/mcp.html), a privacy policy URL
  (visualneuroscience.ai/privacy.html, which names the server), a support
  contact and an icon; authentication is *none*, and no test account is
  needed. After an automatic scan it is listed as a Community connector.
  Escalations: mcp-review@anthropic.com.
- **ChatGPT app directory**: submissions are open through the OpenAI
  Developer Platform — the app needs MCP connectivity details, testing
  guidance, directory metadata and country availability. A plain
  connector works today in developer mode; a directory listing can later
  add an Apps SDK component that renders the atlas inline.
- **Kimi**: Moonshot has no official remote-server directory yet (their
  own forum says as much); users add the URL directly.

## Accounts

`oauth.js` is an OAuth 2.1 authorization server in front of the site's
Firebase accounts, and `account.js` the four tools that need one. The flow:

1. Claude calls an account tool without a token. `worker.js` answers 401
   with `WWW-Authenticate: Bearer … resource_metadata="…/.well-known/oauth-protected-resource", scope="account"`,
   which is what starts a sign-in (lazy authentication: the five atlas
   tools never trigger it). The two `/.well-known` documents point at the
   server's own `/oauth/authorize`, `/oauth/token` and `/oauth/register`.
2. Claude identifies itself by a Client ID Metadata Document (an https
   `client_id` the server fetches and checks) or registers itself at
   `/oauth/register`; either way the server keeps no table: a registered
   client id is a sealed blob holding the redirect URIs. Loopback redirect
   URIs match with the port ignored, for Claude Code.
3. `/oauth/authorize` checks the request (PKCE S256 required) and sends the
   person to `site/connect.html#req=<sealed request>`. That page asks the
   server what to show (`/oauth/request`), lets the person log in with the
   site's own box, and on Allow posts the Firebase session's ID token and
   refresh token to `/oauth/approve`, which answers with the redirect back
   to Claude carrying a sealed, two-minute authorization code.
4. `/oauth/token` opens the code, checks PKCE, client and redirect URI,
   asks Firebase's securetoken endpoint for a fresh ID token with the
   refresh token, and answers: the **access token is the Firebase ID
   token** (an hour; verified on every account call against Google's
   published keys, project id as audience) and the **refresh token is the
   Firebase refresh token sealed in an envelope** only this server opens.
   Refreshes go the same way, with a new envelope each time. Revoking the
   person's sessions, a password change or deleting the account ends both.
5. The account tools call Firestore's REST API **as the person**, with
   their ID token, so `firestore.rules` govern them exactly as they govern
   the app; the server holds no key to anyone's data. `save_model` writes
   the document the Region Atlas itself writes
   (`users/{uid}/tools/regions/files/{name}`, created only, never
   replaced), and registers the tool in `meta/toolindex` so account
   deletion finds it.

Everything sealed (`seal`/`open` in `oauth.js`) is AES-GCM under a key
derived from the `OAUTH_SECRET` secret: set it once, before the first
deploy that carries sign-in, with

    openssl rand -base64 48 | npx wrangler secret put OAUTH_SECRET

Without it the OAuth endpoints answer 503 and the atlas tools keep working.
The public vars in `wrangler.jsonc` (issuer, site origin, allowed origins
for the consent page's calls, Firebase project id and web key) are not
secrets. Firebase needs nothing new: the consent page lives on
visualneuroscience.ai, which is already an authorized domain.

The whole flow runs without a network in `tests/oauth.test.mjs`
(`node mcp-worker/tests/oauth.test.mjs` from the repository root): Google's
keys, the refresh endpoint, a client metadata document and Firestore are
stood in for, and an RSA key made for the run signs the ID tokens.

In Claude, add the connector with authentication **Sign in when needed**
(a Team or Enterprise owner sets this when adding it for the
organisation; it cannot be changed afterwards, only removed and added
again). In the directory submission's Authentication step, say the server
starts without authentication and individual tools prompt for it.

## What is deliberately not here yet

- **Models in chat** (phase 2): composing GLB/USDZ scenes server-side
  from precomputed surfaces, so an assistant can hand back a file or a
  preview image.
- **Replacing or deleting a model from a chat.** `save_model` creates
  only, by design; the app renames and deletes.
