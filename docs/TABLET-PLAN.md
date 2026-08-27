# Landscape-first — one codebase, three surfaces

**Revision 2.** The first draft treated portrait as the case to design for
and landscape as the case that already worked. The brief is now the other
way round: **optimise for landscape, allow for portrait.** Landscape is the
posture the app is designed in — iPad on a stand, Mac window, desktop
browser — and portrait must always remain usable, never broken, but it is
not where the design effort goes.

The standing constraint is unchanged: `site/` is simultaneously the
website, the iPhone/iPad app and the Mac app, so every change is a
capability query — width, height, orientation, pointer, hover — never
platform sniffing. Phones keep their deliberate portrait layout untouched.

## The finding that reshapes the plan

There is not one `orientation:` or viewport-height media query in the
codebase. Every layout decision keys off width alone. Meanwhile the
centred masthead, the wrapping nav and the title strip spend roughly
200px of height before any content appears — a quarter of a landscape
iPad's 834px, gone before the brain shows up.

In landscape the scarce axis is height. A landscape-first layout system
is therefore a **height-aware** one.

## The phases

### 1 · Landscape: the whole instrument on one screen — the headline
Target: on 1194×834 and 1366×1024 (iPad landscape, both sizes) and a
typical Mac window, the studio pages show everything at once — rail
beside a 2×2 viewport grid, no vertical scroll to reach a viewport.

- A compact-chrome mode under `@media (orientation:landscape) and
  (max-height:940px)`: the brand drops a size and shares its line with
  the nav, the masthead sheds its clamp padding, the title strip
  tightens. Budget: chrome ≤ 96px tall.
- Stage heights derive from the viewport — `calc((100vh - chrome) / 2)`
  style sizing — instead of today's fixed clamps, so the 2×2 grid fills
  whatever height the device actually has.
- The same treatment on Brodmann (both cartoons + the selection bar on
  one screen; the graph scrolls below by design), Tractography (the one
  stage takes ~70vh), and the Network Atlas (ring and scan side by side
  at full height).
- Acceptance: at both iPad landscape sizes, regions.html needs zero
  scroll to see all four viewports and the region picker; no page
  overflows horizontally.

### 2 · Portrait: allowed for, not designed for
Portrait keeps the current stacked flow — viewports 2×2 on top, controls
beneath — with only correctness fixes: stage heights sized so the 2×2
block plus its captions fits the width pleasantly, the receptor chart
legible at 834, nothing overflowing at 768–1024. No bespoke portrait
band; the old plan's Phase 1 is deliberately dropped.

### 3 · Rotation is now a first-class gesture
Landscape-first + portrait-allowed means people rotate, and rotation
must be seamless — this was a minor phase before and is promoted:
- `orientationchange`/debounced `resize` → `resizeListener()` +
  `drawScene()` on every NiiVue instance, so canvases re-measure the
  moment the device turns (also covers Split View drags).
- `webglcontextlost`/`restored` handlers on every stage — the
  black-canvas-after-backgrounding bug — with a "tap to reload" fallback.
- Acceptance: portrait → landscape → portrait round-trip keeps the
  selection, the crosshair and crisp canvases on device.

### 4 · Touch targets and sticky hover (unchanged, orientation-blind)
≥44px interactive targets under `pointer:coarse` (today: checkboxes
14px, buttons 26–27px, sliders a 3px track); every state-changing
`:hover` wrapped in `@media (hover:hover)` so taps stop leaving stuck
highlights on iOS. Desktop renders pixel-identical.

### 5 · Motion and battery (unchanged)
The Brodmann graph's spin pauses when scrolled offscreen
(IntersectionObserver), starts paused under `prefers-reduced-motion`.

### 6 · Self-hosted typefaces (unchanged)
Newsreader, Prata and Afacad Flux via their `@fontsource` npm packages:
the apps become literally zero-network, the privacy page loses its one
disclosure, Android can drop the INTERNET permission, and first paint
stops waiting on a font CDN.

### 7 · Memory: measure before refactoring (unchanged)
Four NiiVue instances hold the volumes on the atlas page. TestFlight on
the oldest device decides whether that ever needs the single-instance
multiplanar refactor. Not built on speculation.

### 8 · Verification, reweighted for landscape
Playwright gates, in order of importance:
- **Primary (must be excellent):** 1366×1024, 1194×834, 1024×768
  landscape; a 1440×800 desktop window. Whole-instrument-on-one-screen
  checks, chrome-height budget, no overflow.
- **Secondary (must be correct):** 834×1194 and 1024×1366 portrait,
  390×844 phone. No overflow, targets reachable, nothing clipped.
- **Rotation:** the round-trip test in phase 3, plus Split View ⅓/½/⅔.
- On device: aeroplane sweep, snapshot → share sheet, pinch vs rotate.

## Order

1 first — it is the brief. 3 immediately after, because rotation is the
seam between the two postures. 4 and 5 are afternoon-sized and helped
everything already. 6 closes the privacy loop. 7 only if a device says
so.
