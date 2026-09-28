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
/* The website's header. It stays at the top of the page, drawing in to a
   compact bar once the page has scrolled, and under 960px the section
   links fold into a menu behind a button while the Log in and theme
   buttons stay in view. Nothing here runs inside the native app, which
   has the bar below instead. */
(function(){
  var root = document.documentElement;
  if (root.hasAttribute("data-native")) return;
  var head = document.querySelector(".masthead");
  var nav = head && head.querySelector(".nav-row");
  if (!head || !nav) return;
  var links = Array.prototype.slice.call(nav.children).filter(function(el){ return el.tagName === "A"; });
  var tools = nav.querySelector(".nav-tools");
  if (!links.length || !tools) return;

  /* the links go into a wrapper that is part of the row on wide screens and a panel under the bar on narrow ones */
  var menu = document.createElement("div");
  menu.className = "nav-menu";
  menu.id = "nav-menu";
  nav.insertBefore(menu, links[0]);
  links.forEach(function(a){ menu.appendChild(a); });

  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "nav-menu-btn";
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", "nav-menu");
  btn.innerHTML = '<span class="bars" aria-hidden="true"><i></i></span><span>Menu</span>';
  tools.insertBefore(btn, tools.firstChild);

  function setOpen(open){
    head.classList.toggle("menu-open", open);
    btn.setAttribute("aria-expanded", String(open));
  }
  btn.addEventListener("click", function(){ setOpen(!head.classList.contains("menu-open")); });
  document.addEventListener("click", function(e){
    if (head.classList.contains("menu-open") && !head.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", function(e){ if (e.key === "Escape") setOpen(false); });
  window.addEventListener("resize", function(){ if (window.innerWidth > 960) setOpen(false); });

  /* compact once the page has scrolled past the top */
  function stuck(){ head.classList.toggle("stuck", (window.scrollY || document.documentElement.scrollTop || 0) > 2); }
  window.addEventListener("scroll", stuck, { passive: true });
  stuck();
})();

(function(){
  var root = document.documentElement;
  if (!root.hasAttribute("data-native")) return;

  var TITLES = {
    "": "Home", "index.html": "Home",
    "regions.html": "Region Atlas",
    "tracts.html": "Tractography", "network-atlas.html": "Network Atlas",
    "microanatomy.html": "Microanatomy",
    "molecular.html": "Molecular",
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

  /* the sections, behind a button at the right of the bar: the same list
     the website's header carries, the page it is on marked */
  var SECTIONS = [["index.html", "Home"], ["regions.html", "Region Atlas"], ["microanatomy.html", "Microanatomy"],
    ["molecular.html", "Molecular"], ["network-atlas.html", "Network Atlas"], ["tracts.html", "Tractography"],
    ["studies.html", "Visualizing Studies"], ["textbook.html", "Digital Textbook"], ["practice.html", "Practice"],
    ["about.html", "About"]];
  var menuBtn = make("button", "vn-menu-btn");
  menuBtn.type = "button";
  menuBtn.setAttribute("aria-label", "Sections");
  menuBtn.setAttribute("aria-expanded", "false");
  menuBtn.setAttribute("aria-controls", "vn-menu");
  menuBtn.innerHTML = '<span class="bars" aria-hidden="true"><i></i></span>';
  var menu = make("nav", "vn-menu");
  menu.id = "vn-menu";
  menu.setAttribute("aria-label", "Sections");
  SECTIONS.forEach(function(s){
    var a = document.createElement("a");
    a.href = s[0]; a.textContent = s[1];
    if (s[0] === (here || "index.html")) a.setAttribute("aria-current", "page");
    menu.appendChild(a);
  });
  function setMenu(open){
    menu.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
  }
  menuBtn.addEventListener("click", function(){ setMenu(!menu.classList.contains("open")); });
  document.addEventListener("click", function(e){
    if (menu.classList.contains("open") && !menu.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
  });
  document.addEventListener("keydown", function(e){ if (e.key === "Escape") setMenu(false); });
  right.appendChild(menuBtn);

  /* the page's own theme button moves up here; auth-ui.js puts the
     account button beside it, wherever it finds it */
  var theme = document.getElementById("themeBtn");
  if (theme) right.appendChild(theme);

  bar.appendChild(left); bar.appendChild(mid); bar.appendChild(right);
  document.body.insertBefore(bar, document.body.firstChild);
  document.body.insertBefore(menu, bar.nextSibling);

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
