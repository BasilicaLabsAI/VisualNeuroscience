/* The app's top bar.

   Inside the Android app, and the iOS app before its tab bar (Shell.swift),
   the site's masthead and tab row are hidden
   (viewer.css) and this builds what an iPhone app has instead: a bar pinned
   to the top with a back button on the left that names the screen it
   returns to, the page's title in the middle, and the theme and account
   buttons on the right. The home page is the root of the stack, so it has
   no back button; every other page goes back to wherever it was opened
   from, or Home when it was opened cold.

   Moving forward slides the new page in from the right and moving back
   slides it out again, through cross-document view transitions where the
   engine underneath has them. A back made without the button (Android's
   own back gesture) already draws its own slide, so a page revealed that
   way skips the transition rather than sliding twice. Inside the iOS app
   this bar is not drawn: the shell's navigation bar carries Back, and the
   swipe back is taken away there (ShellWeb.swift).

   Nothing in this bar's section runs unless native.js has marked the
   document as native, and the view-transition opt-in is added from here
   for the same reason; the website's header is the section after it. */
/* The website's header, since v11.63 the iOS app's (Shell.swift): a slim
   bar with the brand at the left, the theme and account buttons at the
   right and, between them, a floating island of the app's five tabs,
   Atlases, Library, Practice, About and Account, each an icon over its
   name, the one the page belongs to lit. The island is built here after
   the brand, the buttons are moved out of the page's row of section links
   and the row is hidden (viewer.css, the island section), its links still
   in the page to be read. Atlases, Library and About open the home page
   on one of its three hubs, the pages of boxes the app's tabs hold
   (index.html switches between them on #library and #about); Practice and
   Account are pages.
   The bar draws in to a translucent material once the page has scrolled.
   Nothing here runs inside the native app, which has the bar below instead. */
(function(){
  var root = document.documentElement;
  if (root.hasAttribute("data-native")) return;
  var head = document.querySelector(".masthead");
  var nav = head && head.querySelector(".nav-row");
  if (!head || !nav) return;
  var brand = head.querySelector(".brand");
  var tools = nav.querySelector(".nav-tools");

  /* the five tabs, drawn as the app's symbols are: a brain, books on a
     shelf, a checklist, an i in a ring and a person */
  var ICON = {
    atlases: '<path d="M12 4.5v15.1"/>' +
      '<path d="M12 4.5C10.9 3.4 8.6 3.6 7.9 5.2 6.1 5 4.6 6.6 5 8.4 3.5 9.3 3.4 11.6 4.6 12.6 3.9 14.3 4.9 16.3 6.7 16.6 6.9 18.5 8.9 19.7 10.6 19c.6.6 1.1.7 1.4.6"/>' +
      '<path d="M12 4.5c1.1-1.1 3.4-.9 4.1.7 1.8-.2 3.3 1.4 2.9 3.2 1.5.9 1.6 3.2.4 4.2.7 1.7-.3 3.7-2.1 4-.2 1.9-2.2 3.1-3.9 2.4-.6.6-1.1.7-1.4.6"/>' +
      '<path d="M8.3 9.2c1.3.1 2.2 1 2.4 2.3M15.7 9.2c-1.3.1-2.2 1-2.4 2.3M7.2 13.6c1.2-.2 2.3.4 2.8 1.5M16.8 13.6c-1.2-.2-2.3.4-2.8 1.5"/>',
    library: '<rect x="3" y="4" width="4.2" height="16" rx=".9"/><rect x="9" y="4" width="4.2" height="16" rx=".9"/>' +
      '<path d="M15.1 5.2l3.6-1 3.8 14.6-3.6 1z"/><path d="M3 8h4.2M9 8h4.2M3 16h4.2M9 16h4.2"/>',
    practice: '<path d="M3.5 6.6l1.6 1.6 3-3.2M3.5 12.6l1.6 1.6 3-3.2M3.5 18.6l1.6 1.6 3-3.2"/>' +
      '<path d="M11 6.5h9.5M11 12.5h9.5M11 18.5h9.5"/>',
    about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.6"/><path d="M12 7.5h.01"/>',
    account: '<circle cx="12" cy="8.2" r="3.7"/><path d="M4.6 20.2c.7-3.8 3.8-6.2 7.4-6.2s6.7 2.4 7.4 6.2"/>'
  };
  var p = location.pathname, here = p.slice(p.lastIndexOf("/") + 1);
  var home = here === "" || here === "index.html";
  /* on the home page itself the hubs keep its address, so a clean / stays / */
  var homeHref = home ? (p || "index.html") : "index.html";
  var TABS = [["atlases", "Atlases", homeHref], ["library", "Library", homeHref + "#library"],
    ["practice", "Practice", "practice.html"], ["about", "About", homeHref + "#about"], ["account", "Account", "account.html"]];
  /* the tab each page belongs to: the same pages the app's tabs hold */
  var OF = {
    "": "atlases", "index.html": "atlases", "regions.html": "atlases", "brodmann.html": "atlases",
    "microanatomy.html": "atlases", "molecular.html": "atlases", "tracts.html": "atlases", "network-atlas.html": "atlases",
    "studies.html": "library", "hallucinations.html": "library", "textbook.html": "library", "posters.html": "library", "poster-neurotransmitters.html": "library", "poster-receptors.html": "library",
    "practice.html": "practice", "about.html": "about", "mcp.html": "about",
    "account.html": "account", "privacy.html": "account", "terms.html": "account", "delete-account.html": "account", "connect.html": "account"
  };
  function current(){
    if (home) return location.hash === "#library" ? "library" : location.hash === "#about" ? "about" : "atlases";
    return OF[here] || "";
  }

  var isle = document.createElement("nav");
  isle.className = "vn-isle";
  isle.setAttribute("aria-label", "Sections");
  var tabs = {};
  TABS.forEach(function(t){
    var a = document.createElement("a");
    a.className = "vn-tab"; a.href = t[2]; a.dataset.tab = t[0];
    a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICON[t[0]] + '</svg><span>' + t[1] + '</span>';
    isle.appendChild(a); tabs[t[0]] = a;
  });
  function mark(){
    var c = current();
    TABS.forEach(function(t){
      if (t[0] === c) tabs[t[0]].setAttribute("aria-current", "page"); else tabs[t[0]].removeAttribute("aria-current");
    });
  }
  mark();
  window.addEventListener("hashchange", mark);
  window.VN_ISLE = { mark: mark, current: current };

  head.insertBefore(isle, brand ? brand.nextSibling : nav);
  if (tools) head.insertBefore(tools, nav);
  head.classList.add("isled");

  /* a material once the page has scrolled past the top */
  function stuck(){ head.classList.toggle("stuck", (window.scrollY || document.documentElement.scrollTop || 0) > 2); }
  window.addEventListener("scroll", stuck, { passive: true });
  stuck();
})();

(function(){
  var root = document.documentElement;
  if (!root.hasAttribute("data-native")) return;
  /* Inside the iOS app's tabs (the shell marks the page data-shell before
     anything runs) the system navigation bar carries back and the title,
     the tab bar the sections and the Account tab the theme and the account,
     so this bar is not drawn there. */
  if (root.hasAttribute("data-shell")) return;

  var TITLES = {
    "": "Home", "index.html": "Home",
    "regions.html": "3D Region Atlas",
    "brodmann.html": "Brodmann Area Atlas",
    "tracts.html": "Tractography",
    "microanatomy.html": "Microanatomy",
    "molecular.html": "Molecular",
    "network-atlas.html": "Network Atlas",
    "studies.html": "Visualizing Studies", "hallucinations.html": "Hallucinations",
    "practice.html": "Practice", "textbook.html": "Digital Textbook", "posters.html": "Posters", "poster-neurotransmitters.html": "The Neurotransmitters", "poster-receptors.html": "The Receptors",
    "about.html": "About", "privacy.html": "Privacy & Support",
    "terms.html": "Terms of Use", "delete-account.html": "Delete your account"
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
  var SECTIONS = [["index.html", "Home"], ["regions.html", "3D Region Atlas"], ["brodmann.html", "Brodmann Area Atlas"],
    ["microanatomy.html", "Microanatomy"], ["molecular.html", "Molecular"], ["network-atlas.html", "Network Atlas"],
    ["tracts.html", "Tractography"], ["studies.html", "Visualizing Studies"], ["textbook.html", "Digital Textbook"],
    ["practice.html", "Practice"], ["about.html", "About"]];
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

  /* On a phone the title comes first: if it is being cut short, the back
     button gives up its label and keeps the chevron. Measured again when
     the account button arrives, the typeface loads or the window turns. */
  function fit(){
    bar.classList.remove("vn-bar-tight");
    if (back && mid.scrollWidth > mid.clientWidth + 1) bar.classList.add("vn-bar-tight");
  }
  fit();
  window.addEventListener("resize", fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  if (window.MutationObserver) new MutationObserver(fit).observe(right, { childList: true, subtree: true, characterData: true });

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

/* Where to follow and reach the maker, at the top of every page of the
   Android app: YouTube, Instagram, LinkedIn and email, in the top bar where
   it has room and at the foot of the sections menu on a phone, where it has
   none. The website's header carried them until v11.63, when it became the
   iOS app's bar of tabs, which carry none; the About page lists them, with
   GitHub, on the website and in both apps. */
(function(){
  var LINKS = [
    { name: "YouTube", handle: "@VisualNeuroscienceAI", href: "https://www.youtube.com/@VisualNeuroscienceAI",
      icon: '<path fill-rule="evenodd" d="M6.2 5h11.6A4.2 4.2 0 0 1 22 9.2v5.6a4.2 4.2 0 0 1-4.2 4.2H6.2A4.2 4.2 0 0 1 2 14.8V9.2A4.2 4.2 0 0 1 6.2 5zM10 8.9v6.2l5.4-3.1z"/>' },
    { name: "Instagram", handle: "fid_900", href: "https://www.instagram.com/fid_900/",
      icon: '<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" fill="none" stroke="currentColor" stroke-width="1.9"/>' +
            '<circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" stroke-width="1.9"/>' +
            '<circle cx="17.2" cy="6.8" r="1.15"/>' },
    { name: "LinkedIn", handle: "Fadil Karim", href: "https://www.linkedin.com/in/fadil-karim/",
      icon: '<path fill-rule="evenodd" d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM7.6 6.05a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7zM6.45 9.6h2.3v8.1h-2.3zM10.3 9.6h2.3v1.15c.5-.8 1.4-1.35 2.6-1.35 2.1 0 3.1 1.35 3.1 3.65v4.65h-2.3v-4.3c0-1.1-.45-1.85-1.45-1.85-1.05 0-1.95.7-1.95 1.95v4.2h-2.3z"/>' },
    { name: "Email", handle: "fkarim@visualneuroscience.ai", href: "mailto:fkarim@visualneuroscience.ai",
      icon: '<rect x="2.9" y="5.2" width="18.2" height="13.6" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.9"/>' +
            '<path d="M3.9 6.6l8.1 6.1 8.1-6.1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>' }
  ];
  function group(cls, labelled){
    var g = document.createElement("span");
    g.className = "vn-social " + cls;
    LINKS.forEach(function(l){
      var a = document.createElement("a");
      a.href = l.href;
      if (/^https?:/.test(l.href)){ a.target = "_blank"; a.rel = "noopener"; }
      a.title = l.name + " " + l.handle;
      a.setAttribute("aria-label", l.name + ", " + l.handle);
      a.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">' + l.icon + '</svg>' +
        (labelled ? '<span>' + l.name + '</span>' : '');
      g.appendChild(a);
    });
    return g;
  }

  if (!document.documentElement.hasAttribute("data-native")) return;
  var right = document.querySelector(".vn-bar-right");
  if (right) right.insertBefore(group("vn-social-bar"), right.querySelector(".vn-menu-btn") || right.firstChild);
  var menu = document.getElementById("vn-menu");
  if (menu) menu.appendChild(group("vn-social-menu", true));
})();

/* A line at the top of a phone (v12.14, at the owner's word): in the iPhone
   app's tabs, Best experienced on iPad; on the website on a phone, Best
   experienced on desktop; nowhere else, an iPad, a desktop and the Android
   app included. It stands first in the body, above the masthead on the
   website, in the smallest type the app uses (viewer.css, .vn-best), and the
   one-screen pages measure their room from under it. A phone is a narrow
   window or, held sideways, a short one with a coarse pointer. */
(function(){
  var root = document.documentElement, body = document.body;
  if (!body || !window.matchMedia) return;
  var phone = window.matchMedia("(max-width: 760px)").matches ||
              window.matchMedia("(pointer: coarse) and (max-height: 500px)").matches;
  if (!phone) return;
  var say = null;
  if (root.hasAttribute("data-native")){
    if (root.hasAttribute("data-shell") && !root.hasAttribute("data-shell-pad")) say = "Best experienced on iPad";
  } else if (window.matchMedia("(pointer: coarse)").matches){
    say = "Best experienced on desktop";
  }
  if (!say) return;
  var line = document.createElement("p");
  line.className = "vn-best";
  line.textContent = say;
  body.insertBefore(line, body.firstChild);
})();
