# Optimising for iPad — one codebase, three surfaces

The constraint that shapes everything here: `site/` is simultaneously the
website, the iPhone/iPad app and the Mac app. So nothing in this plan is
"the iPad version". Every change is a **capability query** — width, pointer
coarseness, hover ability — never user-agent sniffing. A desktop with a
mouse sees almost nothing change; a touch laptop gets the touch fixes for
free; the web and the app bundles stay byte-identical.

## What measurement found (26 Aug 2026)

Layout of the Region Atlas studio at real device sizes:

| context            | width | studio     | controls | stage height | verdict |
|--------------------|------:|------------|----------|-------------:|---------|
| iPad 11" portrait  |   834 | one column | after    |        430px | treated as a phone |
| **iPad 13" portrait** | 1024 | one column | after  |        430px | **treated as a phone, on a screen bigger than many laptops** |
| iPad 11" landscape |  1194 | two column | beside   |        300px | correct (desktop path) |
| Slide Over         |   320 | one column | first    |        190px | correct (phone path) |
| Split View ½ of 13"|   678 | one column | first    |        240px | correct |

Interaction audit:

- **Touch targets**: checkbox 14px, theme toggle 23px, seg buttons 26px,
  tab buttons 27px, range inputs a 3px-tall track. Apple's guidance is
  44pt. Everything interactive is under it.
- **Sticky hover**: not one `:hover` rule in the codebase is guarded by
  `@media (hover:hover)`. On iOS every tapped button inverts and *stays*
  inverted until the next tap lands somewhere else.
- **The border graph spins forever**: `requestAnimationFrame` loop runs
  even when the graph is scrolled offscreen. Battery cost on every page
  view of brodmann.html. The CSS honours `prefers-reduced-motion`; the JS
  loop does not.
- **Fonts still come from Google**: the one network request the app makes,
  the one caveat in the privacy policy, and a first-paint delay on device.
- **WebGL lifecycle**: iPadOS evicts GL contexts from backgrounded apps.
  Nothing handles `webglcontextlost`, so returning to the app after a spell
  in Split View with something heavy may show black canvases until reload.

## The phases

### 1 · A tablet band for the studio pages — the visible one
Between 761 and 1100px the studio currently falls off the desktop cliff
into the phone layout. Add the middle case: the rail slims to ~240px and
**stays beside the viewports**; the 2×2 view grid sizes from the remaining
width (~770px on a 13" portrait → ~375px stages, up from a 430px single
stack). Applies to regions, brodmann, receptors, network-atlas,
hallucinations — they share the studio grid in viewer.css, so this is one
media query plus per-page checks, not five layouts.
*Phone (<761) and desktop (>1100) untouched by design — the phone's
controls-first order was a deliberate decision and stays.*

### 2 · Touch targets and sticky hover — the mechanical one
Under `@media (pointer:coarse)`: interactive controls get `min-height` /
hit-slop to ≥44px (seg buttons, tab buttons, checkboxes, chip closes), and
range inputs get a tall track and a thumb sized for a finger.
Separately, every state-changing `:hover` rule moves inside
`@media (hover:hover)` — a sweep across viewer.css and the per-page style
blocks. Desktop rendering is pixel-identical (it has hover); touch stops
collecting stuck highlights.

### 3 · Motion and battery
The graph's spin loop pauses via `IntersectionObserver` when offscreen,
starts paused under `prefers-reduced-motion`, and the rAF handle is
dropped rather than idling. Same treatment for the status-bar scan
animation if it's ever long-lived.

### 4 · Self-host the three typefaces
Newsreader, Prata and Afacad Flux are SIL OFL — fetch via their
`@fontsource` npm packages (the npm registry is reachable where Google's
CDN is not), ship woff2 next to Flux-Regular.woff2, update the preconnects
away and the service-worker precache in. This closes the loop the privacy
page currently has to disclose: **the apps become literally zero-network**,
Android can drop the INTERNET permission, and first paint on device stops
waiting on a font CDN. The privacy page's Google Fonts paragraph then gets
deleted — the rare policy change that removes a disclosure.

### 5 · Lifecycle hardening for the shells
- `webglcontextlost` / `webglcontextrestored` handlers on every stage: on
  loss, show the existing status panel with "tap to reload the viewer";
  on restore, re-init. This is the black-canvas-after-backgrounding fix.
- A debounced `window.resize` → `resizeListener()` + `drawScene()` across
  all NiiVue instances, so Split View drags re-measure promptly.
  (NiiVue has internal handling; this is belt-and-braces and idempotent.)

### 6 · Memory: measure before refactoring
The atlas page runs four NiiVue instances, each holding both volumes on
the GPU. Fine on the tested iPad; the open question is older iPhones and
the tractogram page. **Decision rule**: if a real device jetsams, the fix
is one multiplanar instance instead of four (a real refactor) or a
coarse-pointer streamline cap on tracts — but neither is built on
speculation. TestFlight on the oldest device available decides.

### 7 · Verification
- Playwright matrix at 320 / 390 / 678 / 834 / 1024 / 1194 / 1366 wide:
  no horizontal overflow, no interactive target under 44px on coarse
  pointer, studio columns per the table above.
- On device: aeroplane-mode sweep, snapshot → share sheet, pinch vs
  one-finger rotate, Split View at ⅓/½/⅔, backgrounding + return on the
  tracts page.

## Order

2 → 3 are afternoon-sized and improve iPhone immediately. 1 is the big
visible win and is where iPad stops being a stretched phone. 4 closes the
privacy loop. 5 is small but is the difference between "works in a demo"
and "works Tuesday week". 6 only if a device says so.
