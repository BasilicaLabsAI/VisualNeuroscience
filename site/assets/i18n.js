/* The site's languages (v12.70, at the owner's word): English at every page's own address and, beside each page
   that has one, a Simplified Chinese twin, <name>.zh-hans.html, written by scripts/i18n/build.py from the English
   page and i18n/zh-hans.json, so search engines find real Chinese pages.

   Loaded first in every page's head. It works out the language the person reads and, on an English page with a
   Chinese twin, opens the twin in its place before anything is drawn:
     - in the iOS app, window.VN_LANG, which the shell writes at document start from the language iOS gave the app
       (the phone's language, or the one picked for the app in Settings), decides alone, and inside the app's tabs
       the shell opens the twin itself rather than the page moving;
     - on the website, a language picked with the header's button (kept as vn-lang) wins, and otherwise the
       browser's own list of languages, the first one the site has; a page never redirects twice in a row.
   Simplified Chinese is zh-CN, zh-SG, zh-MY, zh-Hans or plain zh; Traditional Chinese (zh-TW, zh-HK, zh-MO,
   zh-Hant) has no pages yet and falls through to the next language in the list, as iOS does.

   On a Chinese page the strings file (assets/i18n/zh-hans.js) calls VN_I18N.use, and from then on any English the
   page's scripts write, a text or a title, an aria-label, a placeholder or an alt, is put into Chinese as it
   lands, when the catalog has it; the static words were put into Chinese by the build.

     VN_I18N.lang          the page's language: "en" or "zh-hans"
     VN_I18N.t(s)          s in the page's language, or s itself
     VN_I18N.href(page)    a link to another page in the page's language ("regions.html#sel=..." on a Chinese page
                           becomes "regions.zh-hans.html#sel=..." when that twin exists)
     VN_I18N.go(lang)      keep lang as the person's choice and open this page, or the home page, in it
     VN_I18N.names         the languages, each in its own words */
(function(){
  "use strict";
  var root = document.documentElement;
  var LANGS = ["en", "zh-hans"];
  var NAMES = { "en": "English", "zh-hans": "简体中文" };
  var lang = /^zh/i.test(root.lang || "") ? "zh-hans" : "en";

  function store(k, v){ try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function stored(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }

  /* a BCP 47 tag as one of the site's languages, or null */
  function pick(tag){
    tag = String(tag || "").toLowerCase().replace(/_/g, "-");
    if (tag === "en" || tag.indexOf("en-") === 0) return "en";
    if (tag === "zh" || tag.indexOf("zh-") === 0){
      if (/hant|-tw\b|-hk\b|-mo\b/.test(tag)) return null;
      return "zh-hans";
    }
    return null;
  }
  function wanted(){
    if (window.VN_LANG) return pick(window.VN_LANG) || "en";
    var kept = stored("vn-lang");
    if (kept && LANGS.indexOf(kept) >= 0) return kept;
    var list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || "en"];
    for (var i = 0; i < list.length; i++){ var l = pick(list[i]); if (l) return l; }
    return "en";
  }

  /* the languages this page exists in, from the build's meta */
  var meta = document.querySelector('meta[name="vn-langs"]');
  var has = meta ? meta.getAttribute("content").split(/\s+/) : [lang];

  /* this page's own file name without its language: "regions", "index" */
  function baseName(){
    var p = location.pathname, f = p.slice(p.lastIndexOf("/") + 1);
    f = f.replace(/\.html$/, "").replace(/\.zh-hans$/, "");
    return f || "index";
  }
  function fileFor(base, l){ return base + (l === "en" ? "" : "." + l) + ".html"; }

  /* open the twin before anything is drawn; never twice within a few seconds, so two pages can never pass the
     reader back and forth */
  var want = wanted(), hop = +stored("vn-lang-hop") || 0;
  /* never inside the iOS app's tabs (marked data-shell before anything runs): the shell takes a move to another
     file for a link and pushes it as a new page, so there the shell opens the twin itself */
  if (want !== lang && has.indexOf(want) >= 0 && Math.abs(Date.now() - hop) > 5000 && !root.hasAttribute("data-shell")){
    store("vn-lang-hop", String(Date.now()));
    location.replace(fileFor(baseName(), want) + location.search + location.hash);
    return;
  }

  var strings = null, twins = [];
  function t(s){
    if (!strings || s == null) return s;
    var k = String(s).replace(/\s+/g, " ").trim();
    return Object.prototype.hasOwnProperty.call(strings, k) ? strings[k] : s;
  }
  function href(page){
    if (lang === "en") return page;
    var m = /^(?:\.\/)?([a-z0-9-]+)\.html(.*)$/i.exec(String(page || ""));
    if (!m || twins.indexOf(m[1]) < 0) return page;
    return fileFor(m[1], lang) + m[2];
  }
  function go(l){
    if (LANGS.indexOf(l) < 0) return;
    store("vn-lang", l);
    var base = baseName(), target = has.indexOf(l) >= 0 ? fileFor(base, l) : fileFor("index", l);
    location.href = target + (has.indexOf(l) >= 0 ? location.search + location.hash : "");
  }

  /* English that page scripts write, put into the page's language as it lands */
  var SKIP = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, NOSCRIPT: 1, KBD: 1, SAMP: 1 };
  var ATTRS = ["title", "aria-label", "placeholder", "alt"];
  function skipped(el){
    for (var n = el; n && n.nodeType === 1; n = n.parentNode){
      if (SKIP[n.nodeName] || n.getAttribute("translate") === "no" || (n.classList && n.classList.contains("notranslate"))) return true;
    }
    return false;
  }
  function textNode(n){
    var v = n.nodeValue;
    if (!v || !/[A-Za-z]/.test(v)) return;
    var k = v.replace(/\s+/g, " ").trim();
    if (!Object.prototype.hasOwnProperty.call(strings, k)) return;
    if (n.parentNode && skipped(n.parentNode)) return;
    var lead = /^\s*/.exec(v)[0], tail = /\s*$/.exec(v)[0];
    n.nodeValue = lead + strings[k] + tail;
  }
  function attrs(el){
    for (var i = 0; i < ATTRS.length; i++){
      var a = ATTRS[i], v = el.getAttribute && el.getAttribute(a);
      if (!v || !/[A-Za-z]/.test(v)) continue;
      var k = v.replace(/\s+/g, " ").trim();
      if (Object.prototype.hasOwnProperty.call(strings, k) && !skipped(el)) el.setAttribute(a, strings[k]);
    }
  }
  function walk(node){
    if (node.nodeType === 3){ textNode(node); return; }
    if (node.nodeType !== 1 || SKIP[node.nodeName]) return;
    attrs(node);
    var w = document.createTreeWalker(node, 5 /* elements and text */, null), n;
    while ((n = w.nextNode())){
      if (n.nodeType === 3) textNode(n);
      else if (!SKIP[n.nodeName]) attrs(n);
    }
  }
  function use(l, catalog, pages){
    if (l !== lang) return;
    strings = catalog || {};
    twins = pages || [];
    new MutationObserver(function(list){
      for (var i = 0; i < list.length; i++){
        var r = list[i];
        if (r.type === "characterData") textNode(r.target);
        else if (r.type === "attributes") attrs(r.target);
        else for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
      }
    }).observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    if (document.body) walk(document.body);
    document.addEventListener("DOMContentLoaded", function(){ walk(document.body); document.title = t(document.title); });
  }

  window.VN_I18N = { lang: lang, t: t, href: href, go: go, use: use, names: NAMES, langs: LANGS, has: has };
})();
