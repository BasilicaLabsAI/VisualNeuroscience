/* The app's top bar.

   Inside the native app the site's masthead and tab row are hidden
   (viewer.css) and this builds what an iPhone app has instead: a bar pinned
   to the top with a back button on the left that names the screen it
   returns to, the page's title in the middle, and the theme and account
   buttons on the right. The home page is the root of the stack, so it has
   no back button; every other page goes back to wherever it was opened
   from, or Home when it was opened cold.

   Moving forward slides the new page in from the right and moving back
   slides it out again, through cross-document view transitions where the
   WebKit underneath has them. A swipe from the left edge is handled by the
   web view itself (SceneDelegate.swift turns the gesture on), and that
   already draws its own slide, so a page revealed by a swipe skips the
   transition rather than sliding twice.

   The website is left exactly as it is: nothing here runs unless native.js
   has marked the document as native, and the view-transition opt-in is
   added from here for the same reason. */
(function(){
  var root = document.documentElement;
  if (!root.hasAttribute("data-native")) return;

  var TITLES = {
    "": "Home", "index.html": "Home",
    "regions.html": "Region Atlas", "brodmann.html": "Brodmann Areas",
    "tracts.html": "Tractography", "network-atlas.html": "Network Atlas",
    "microanatomy.html": "Microanatomy",
    "studies.html": "Visualizing Studies", "hallucinations.html": "Hallucinations",
    "practice.html": "Practice", "textbook.html": "Digital Textbook",
    "about.html": "About", "privacy.html": "Privacy & Support"
  };

  function fileOf(url){
    try { var p = new URL(url, location.href).pathname; return p.slice(p.lastIndexOf("/") + 1); }
    catch (e){ return null; }
  }
  function sameOrigin(url){
    try { return !!url && new URL(url, location.href).origin === location.origin; }
    catch (e){ return false; }
  }

  var here = fileOf(location.href) || "";
  var isHome = here === "" || here === "index.html";
  var title = TITLES[here] || document.title.split(" — ")[0] || "";

  /* Where back goes, decided the first time this entry is shown and kept
     on the history entry, so a reload or a later return still knows. */
  var state = history.state || {};
  var back = state.vnBack || null;
  if (!back && !isHome){
    var from = fileOf(document.referrer);
    if (sameOrigin(document.referrer) && from !== null && from !== here && TITLES[from] !== undefined && history.length > 1)
      back = { label: TITLES[from], href: null };
    else
      back = { label: "Home", href: "index.html" };
    try { state.vnBack = back; history.replaceState(state, ""); } catch (e){}
  }

  function make(tag, cls){ var n = document.createElement(tag); n.className = cls; return n; }

  var bar = make("nav", "vn-bar");
  bar.setAttribute("aria-label", "App");
  var left = make("div", "vn-bar-left");
  var mid = make("div", "vn-bar-title");
  var right = make("div", "vn-bar-right");

  if (back){
    var btn = make("button", "vn-back");
    btn.type = "button";
    btn.setAttribute("aria-label", "Back to " + back.label);
    var chevron = make("span", "vn-chevron"); chevron.setAttribute("aria-hidden", "true");
    var label = make("span", "vn-back-label"); label.textContent = back.label;
    btn.appendChild(chevron); btn.appendChild(label);
    btn.addEventListener("click", function(){
      try { sessionStorage.setItem("vn-back-tap", "1"); } catch (e){}
      if (back.href) location.href = back.href; else history.back();
    });
    left.appendChild(btn);
  }

  mid.textContent = isHome ? "VisualNeuroscience.AI" : title;
  if (isHome) mid.classList.add("vn-bar-brand");

  /* the page's own theme button moves up here; auth-ui.js puts the
     account button beside it, wherever it finds it */
  var theme = document.getElementById("themeBtn");
  if (theme) right.appendChild(theme);

  bar.appendChild(left); bar.appendChild(mid); bar.appendChild(right);
  document.body.insertBefore(bar, document.body.firstChild);

  /* the slide, only where the engine can do it */
  var css = document.createElement("style");
  css.textContent = "@view-transition{ navigation:auto; }";
  document.head.appendChild(css);

  window.addEventListener("pagereveal", function(e){
    if (!e.viewTransition) return;
    var act = window.navigation && navigation.activation;
    var traverse = !!(act && act.navigationType === "traverse");
    var backwards = traverse && act.from && act.entry && act.from.index > act.entry.index;
    var tapped = false;
    try { tapped = sessionStorage.getItem("vn-back-tap") === "1"; sessionStorage.removeItem("vn-back-tap"); } catch (err){}
    if (backwards && !tapped){ e.viewTransition.skipTransition(); return; }
    root.setAttribute("data-vn-dir", (backwards || tapped) ? "back" : "push");
  });
})();
