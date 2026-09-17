# The MCP server: asking the atlas from Claude, ChatGPT and Kimi

`mcp-worker/` is a Cloudflare Worker speaking the Model Context Protocol
over streamable HTTP. Any assistant that talks MCP can search the atlas,
ask what a region or Brodmann area does, read receptor densities and the
brain-state stories, and every answer links straight into the view it
describes — `regions.html#sel=…` (a Brodmann area is `B:17` in the same list),
`network-atlas.html#state=…` are real deep links the pages restore.

Five tools, all read-only and annotated as such: `search_brain`,
`region_info`, `brodmann_area`, `receptor_density`, `brain_state`.
No accounts, no state, no logs of its own; the privacy page carries a
paragraph saying exactly that.

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
which already works as a connector URL. For the proper address:

1. Cloudflare dash → Workers & Pages → visualneuroscience-mcp →
   Settings → Domains & Routes → **Add custom domain** →
   `mcp.visualneuroscience.ai`. Cloudflare creates the DNS record itself.
2. Uncomment the `routes` line in `wrangler.jsonc` so the config says
   what production does.

Smoke test either URL:

    curl -s https://mcp.visualneuroscience.ai/health          # → ok
    curl -s https://mcp.visualneuroscience.ai/ -X POST \
      -H 'content-type: application/json' \
      -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

## Connecting it yourself

- **Claude** (web, desktop, mobile): Settings → Connectors → *Add custom
  connector* → paste the URL. No authentication to configure; the tools
  appear in the composer's search-and-tools menu.
- **ChatGPT**: Settings → Apps & Connectors → enable *Developer mode*
  (Advanced), then *Add MCP server* with the URL. Works in conversation
  once enabled.
- **Kimi**: `kimi mcp add --transport http visualneuroscience
  https://mcp.visualneuroscience.ai/` in Kimi Code, or add the same to
  `~/.kimi-code/mcp.json`; the consumer app follows Moonshot's rollout.

## Getting listed in the directories

- **Claude connectors directory**: submission happens inside claude.ai
  under **organization admin settings**, which requires a Team or
  Enterprise plan. The portal connects to the production server, reads
  the tools and their annotations, and wants a public privacy policy —
  ours is visualneuroscience.ai/privacy.html, which names the MCP server.
  The tools already carry `readOnlyHint` annotations, which their review
  checks. Escalations: mcp-review@anthropic.com.
- **ChatGPT app directory**: submissions are open through the OpenAI
  Developer Platform — the app needs MCP connectivity details, testing
  guidance, directory metadata and country availability. A plain
  connector works today in developer mode; a directory listing can later
  add an Apps SDK component that renders the atlas inline.
- **Kimi**: Moonshot has no official remote-server directory yet (their
  own forum says as much); users add the URL directly.

## What is deliberately not here yet

- **Models in chat** (phase 2): composing GLB/USDZ scenes server-side
  from precomputed surfaces, so an assistant can hand back a file or a
  preview image.
- **Accounts** (phase 3): OAuth 2.1 in front of Firebase Auth so an
  assistant can save a named model that appears in the app's Saved
  models. The LinkedIn worker already contains most of the machinery.
