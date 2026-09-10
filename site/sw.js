/* The service worker, so the site installs to a home screen and runs with
   the network switched off.

   Three rules, because three kinds of file behave differently here:

   Pages are fetched from the network first and fall back to the cache. A
   release is a push to main, so a reader online should get the new page the
   moment it lands rather than whenever a cache happens to expire; offline
   they get the last one they saw.

   The volumes, the tractogram and the viewer are cache-first. They are
   megabytes each and they do not change between releases — mni152.nii.gz is
   the same file it was in the first commit — so fetching them again is pure
   waste. A release that does change them changes VERSION, which drops the
   old cache wholesale.

   Everything else same-origin is served from cache and refreshed in the
   background, so a stale stylesheet corrects itself on the next load rather
   than blocking this one.

   Nothing cross-origin is touched at all — since the typefaces moved
   in-house there is no outside request left to think about. */

var VERSION = "vn-34";
var SHELL   = VERSION + "-shell";
var BULK    = VERSION + "-bulk";

/* the pages and the small files they need to draw at all */
var PRECACHE = [
  "/", "/index.html", "/regions.html", "/brodmann.html",   "/tracts.html", "/network-atlas.html", "/studies.html", "/hallucinations.html",
  "/privacy.html", "/about.html", "/practice.html", "/assets/home/practice.jpg",
  "/textbook.html", "/assets/home/textbook.jpg",
  "/vision.html", "/vision-model.html", "/vision-planes.html",
  "/vision-plane.html", "/vision-regions.html", "/vision-brodmann.html",
  "/vision-about.html",
  "/assets/vision.css", "/assets/vision-bus.js", "/assets/vision-scan.js",
  "/assets/viewer.css", "/assets/native.js", "/assets/zoom.js",
  "/assets/stage-lifecycle.js", "/assets/diagram-gestures.js",
  "/assets/firebase-config.js", "/assets/auth.js", "/assets/auth-ui.js",
  "/assets/userdata.js", "/vendor/firebase/firebase-bundle.js",
  "/assets/slice-tool.js", "/assets/region-notes.js", "/assets/network-ring.js",
  "/assets/export3d.js", "/assets/models.js",
  "/assets/network-states.js", "/assets/atlas-data.js",
  "/assets/brodmann-areas.js", "/assets/brodmann-outline.js",
  "/assets/logo.svg", "/manifest.webmanifest",
  "/fonts/Flux-Regular.woff2", "/fonts/fonts.css",
  "/fonts/afacad-flux-latin-400-normal.woff2", "/fonts/afacad-flux-latin-500-normal.woff2",
  "/fonts/afacad-flux-latin-600-normal.woff2", "/fonts/newsreader-latin-400-normal.woff2",
  "/fonts/newsreader-latin-500-normal.woff2", "/fonts/newsreader-latin-400-italic.woff2",
  "/fonts/prata-latin-400-normal.woff2"
];

/* the megabytes: fetched once, then read off disk forever */
var IS_BULK = /\.(nii\.gz|trx)$|niivue\.js$|^\/vendor\/d3\//;

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(SHELL)
      /* one miss must not fail the whole install, so they go in one by one */
      .then(function(c){ return Promise.all(PRECACHE.map(function(u){
        return c.add(new Request(u, {cache: "reload"})).catch(function(){});
      })); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.map(function(n){
        if (n !== SHELL && n !== BULK) return caches.delete(n);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;      // fonts fend for themselves

  /* pages: fresh when online, last-seen when not */
  if (req.mode === "navigate"){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(SHELL).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){
          return hit || caches.match("/index.html");
        });
      })
    );
    return;
  }

  /* the big immutable files: cache first */
  if (IS_BULK.test(url.pathname)){
    e.respondWith(
      caches.match(req).then(function(hit){
        if (hit) return hit;
        return fetch(req).then(function(res){
          if (res && res.ok){
            var copy = res.clone();
            caches.open(BULK).then(function(c){ c.put(req, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  /* the rest: serve what we have, fetch a fresher copy for next time */
  e.respondWith(
    caches.match(req).then(function(hit){
      var live = fetch(req).then(function(res){
        if (res && res.ok){
          var copy = res.clone();
          caches.open(SHELL).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return hit; });
      return hit || live;
    })
  );
});
