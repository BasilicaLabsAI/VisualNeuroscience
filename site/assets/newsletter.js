/* The newsletter box.

   A small card that asks for an email address, once a reader has been on
   a page a while or scrolled half of it. Closing it keeps it away for a
   fortnight; signing up keeps it away for good; both are remembered in the
   browser and nowhere else. The address goes to the newsletter-worker,
   which passes it on (docs/NEWSLETTER.md) and stores nothing. Add
   ?newsletter=1 to a page's address to see the box at once. */
(function(){
  "use strict";
  var ENDPOINT = "https://visualneuroscience-newsletter.cloudflare-passport599.workers.dev/subscribe";
  var KEY = "vn-news", DELAY = 20000, SCROLL = 0.5, SNOOZE = 14 * 86400000;
  var now = Date.now(), force = /[?&]newsletter=1/.test(location.search);
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e){}
  if (!force && (state.done || (state.until && state.until > now))) return;
  if (!force && /privacy\.html$/.test(location.pathname)) return;

  var css = document.createElement("style");
  css.textContent =
    ".vn-news{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:60;width:min(380px,calc(100vw - 28px));" +
    "background:var(--paper,#111);color:var(--ink,#fff);border:1px solid var(--hair,#fff);padding:1rem 1.1rem 1.05rem;box-shadow:0 12px 36px rgba(0,0,0,.35);" +
    "transform:translateY(16px);opacity:0;transition:transform .28s ease,opacity .28s ease}" +
    ".vn-news.in{transform:none;opacity:1}" +
    ".vn-news .ck{display:block;font-family:var(--font-brand,sans-serif);font-weight:500;font-size:.52rem;letter-spacing:.24em;text-transform:uppercase;color:var(--ink-60,#aaa)}" +
    ".vn-news h2{font-family:var(--font-display,Georgia,serif);font-weight:400;font-size:1.15rem;line-height:1.2;margin:.3rem 1.6rem .4rem 0}" +
    ".vn-news p{font-family:var(--font-serif,Georgia,serif);font-size:.9rem;line-height:1.5;margin:0 0 .7rem}" +
    ".vn-news form{display:flex;gap:.45rem}" +
    ".vn-news input[type=email]{flex:1;min-width:0;font:inherit;font-family:var(--font-serif,Georgia,serif);font-size:.95rem;color:var(--ink,#fff);background:transparent;border:1px solid var(--hair,#fff);padding:.5rem .65rem}" +
    ".vn-news input[type=email]:focus{outline:2px solid var(--ink,#fff);outline-offset:1px}" +
    ".vn-news button{font-family:var(--font-brand,sans-serif);font-weight:500;font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;cursor:pointer}" +
    ".vn-news .go{background:var(--ink,#fff);color:var(--paper,#111);border:1px solid var(--ink,#fff);padding:.5rem .8rem}" +
    ".vn-news .go[disabled]{opacity:.55;cursor:default}" +
    ".vn-news .x{position:absolute;top:.45rem;right:.5rem;background:none;border:0;color:var(--ink-60,#aaa);font:inherit;font-size:1.2rem;line-height:1;padding:.2rem .4rem}" +
    ".vn-news .x:hover{color:var(--ink,#fff)}" +
    ".vn-news .fine{font-size:.74rem;color:var(--ink-60,#aaa);margin:.55rem 0 0}" +
    ".vn-news .fine a{color:inherit}" +
    ".vn-news .msg{font-family:var(--font-serif,Georgia,serif);font-size:.86rem;margin:.5rem 0 0;min-height:1.2em}" +
    ".vn-news .hp{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}" +
    "@media (max-width:480px){.vn-news{left:max(10px,env(safe-area-inset-left));right:max(10px,env(safe-area-inset-right));width:auto}}" +
    "@media (prefers-reduced-motion:reduce){.vn-news{transition:none}}";
  document.head.appendChild(css);

  var box = document.createElement("aside");
  box.className = "vn-news"; box.setAttribute("role", "dialog"); box.setAttribute("aria-labelledby", "vnNewsH");
  box.innerHTML =
    '<button type="button" class="x" aria-label="Not now">×</button>' +
    '<span class="ck">Newsletter</span>' +
    '<h2 id="vnNewsH">Hear when the atlas grows</h2>' +
    '<p>A short email when a new tool, dataset or chapter lands. A few a year, never more than one a month, and one click to leave.</p>' +
    '<form novalidate><input type="email" name="email" placeholder="you@example.com" autocomplete="email" inputmode="email" aria-label="Your email address" required>' +
    '<label class="hp" aria-hidden="true">Leave this empty <input type="text" name="website" tabindex="-1" autocomplete="off"></label>' +
    '<button type="submit" class="go">Keep me posted</button></form>' +
    '<p class="msg" role="status" aria-live="polite"></p>' +
    '<p class="fine">Your address goes to the maker of this site and to no one else, to send the newsletter and nothing more. <a href="privacy.html#newsletter">How it is kept</a>.</p>';

  var shown = false, timer = null;
  function save(s){ try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e){} }
  function show(){
    if (shown) return; shown = true;
    clearTimeout(timer); window.removeEventListener("scroll", onScroll);
    document.body.appendChild(box);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ box.classList.add("in"); }); });
  }
  function close(){
    box.classList.remove("in");
    setTimeout(function(){ if (box.parentNode) box.parentNode.removeChild(box); }, 300);
  }
  function onScroll(){
    var h = document.documentElement;
    var seen = (window.scrollY + window.innerHeight) / Math.max(h.scrollHeight, 1);
    if (seen >= SCROLL) show();
  }
  box.querySelector(".x").addEventListener("click", function(){ save({ until: Date.now() + SNOOZE }); close(); });
  box.querySelector("form").addEventListener("submit", function(e){
    e.preventDefault();
    var input = box.querySelector("input[type=email]"), msg = box.querySelector(".msg"), go = box.querySelector(".go");
    var email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){ msg.textContent = "That does not look like an email address."; input.focus(); return; }
    go.disabled = true; msg.textContent = "Sending…";
    fetch(ENDPOINT, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, page: location.pathname, website: box.querySelector("input[name=website]").value })
    }).then(function(r){ return r.json().catch(function(){ return { ok: r.ok }; }).then(function(j){ if (!r.ok || !j.ok) throw new Error(j.error || "failed"); }); })
      .then(function(){
        save({ done: true });
        box.querySelector("form").hidden = true;
        msg.textContent = "Thank you. You are on the list; the first email will say what is new.";
        setTimeout(close, 6000);
      })
      .catch(function(err){
        go.disabled = false;
        msg.textContent = /look like|set up/.test(String(err.message)) ? err.message : "Could not send just now. Try again in a moment.";
      });
  });
  document.addEventListener("keydown", function(e){ if (e.key === "Escape" && box.parentNode){ save({ until: Date.now() + SNOOZE }); close(); } });

  if (force) show();
  else {
    timer = setTimeout(show, DELAY);
    window.addEventListener("scroll", onScroll, { passive: true });
  }
})();
