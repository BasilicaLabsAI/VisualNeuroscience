/* The login UI: one Log in button in the site's nav, a modal with the
   provider buttons above the three email tabs (Sign in / Create account /
   Reset), the signed-in state showing the person's name and a Log out
   button. All behaviour lives in assets/auth.js; this file only draws.

   Styling leans on the site's own custom properties (--paper, --ink,
   --hair, --font-brand …) with plain fallbacks, so the modal already wears
   the site's brand and restyling means changing tokens, not selectors.

   While accounts are dormant (window.VN_FIREBASE = null) auth.enabled is
   false and this module mounts nothing at all. */

import auth from "./auth.js";

if (auth.enabled) mount();

function mount(){
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", mount, { once: true });
    return;
  }

  /* ── styles ──────────────────────────────────────────────────────────── */
  const css = `
  .vn-auth-slot{ display:inline-flex; align-items:center; gap:.6rem; }
  .vn-auth-btn{
    font-family:var(--font-brand,sans-serif); font-weight:500; font-size:.66rem;
    letter-spacing:.22em; text-transform:uppercase; color:var(--ink,#111);
    background:none; border:1px solid var(--hair,#111); cursor:pointer;
    padding:.28rem .6rem;
  }
  @media (hover:hover){ .vn-auth-btn:hover{ background:var(--ink,#111); color:var(--paper,#fff); } }
  .vn-auth-name{
    font-family:var(--font-brand,sans-serif); font-weight:500; font-size:.66rem;
    letter-spacing:.18em; text-transform:uppercase; color:var(--ink,#111);
    max-width:11em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    background:none; border:0; cursor:pointer; padding:.28rem 0;
    text-decoration:underline; text-underline-offset:3px; text-decoration-color:transparent;
  }
  @media (hover:hover){ .vn-auth-name:hover{ text-decoration-color:currentColor; } }
  .vn-who{ font-size:.9rem; color:var(--ink-60,#5a5a5a); margin:-.4rem 0 1rem; }
  .vn-danger{
    font-family:var(--font-brand,sans-serif); font-weight:500; font-size:.68rem;
    letter-spacing:.16em; text-transform:uppercase;
    color:#b3261e; background:none; border:1px solid #b3261e;
    padding:.6rem .8rem; cursor:pointer; min-height:44px; width:100%;
    margin-top:.5rem;
  }
  .vn-danger.armed{ background:#b3261e; color:#fff; }
  :root[data-theme="dark"] .vn-danger{ color:#ff8a80; border-color:#ff8a80; }
  :root[data-theme="dark"] .vn-danger.armed{ background:#b3261e; border-color:#b3261e; color:#fff; }
  .vn-modal-wrap{
    position:fixed; inset:0; z-index:220; display:flex;
    align-items:center; justify-content:center; padding:1rem;
    background:color-mix(in srgb, var(--ink,#111) 32%, transparent);
  }
  .vn-modal{
    background:var(--paper,#fff); color:var(--ink,#111);
    border:1px solid var(--hair,#111); width:min(30rem,100%);
    max-height:calc(100vh - 2rem); overflow:auto; padding:1.3rem 1.4rem 1.5rem;
    font-family:var(--font-serif,Georgia,serif);
  }
  .vn-modal h2{
    font-family:var(--font-display,Georgia,serif); font-weight:400;
    font-size:1.25rem; margin:0 0 .9rem;
  }
  .vn-close{ float:right; background:none; border:0; color:var(--ink,#111);
    font-size:1.15rem; line-height:1; cursor:pointer; padding:.2rem .4rem; }
  .vn-prov{ display:flex; flex-direction:column; gap:.55rem; margin-bottom:1rem; }
  .vn-prov button{
    display:flex; align-items:center; justify-content:center; gap:.6rem;
    font-family:var(--font-brand,sans-serif); font-weight:500; font-size:.78rem;
    letter-spacing:.12em; text-transform:uppercase;
    color:var(--ink,#111); background:none; border:1px solid var(--hair,#111);
    padding:.6rem .8rem; cursor:pointer; min-height:44px;
  }
  @media (hover:hover){ .vn-prov button:hover{ background:var(--ink,#111); color:var(--paper,#fff); } }
  .vn-prov svg{ width:1.05em; height:1.05em; flex:none; fill:currentColor; }
  .vn-or{ display:flex; align-items:center; gap:.8rem; margin:0 0 1rem;
    color:var(--ink-60,#5a5a5a); font-style:italic; font-size:.85rem; }
  .vn-or::before,.vn-or::after{ content:""; flex:1; border-top:1px solid var(--hair,#111); opacity:.4; }
  .vn-tabs{ display:flex; gap:.2rem; margin-bottom:1rem; border-bottom:1px solid var(--hair,#111); }
  .vn-tabs button{
    flex:1; background:none; border:0; border-bottom:2px solid transparent;
    font-family:var(--font-brand,sans-serif); font-weight:500; font-size:.62rem;
    letter-spacing:.16em; text-transform:uppercase; color:var(--ink-60,#5a5a5a);
    padding:.55rem .2rem; cursor:pointer; min-height:40px;
  }
  .vn-tabs button.active{ color:var(--ink,#111); border-bottom-color:var(--ink,#111); }
  .vn-form{ display:none; flex-direction:column; gap:.7rem; }
  .vn-form.active{ display:flex; }
  .vn-form .row2{ display:flex; gap:.7rem; } .vn-form .row2 > *{ flex:1; min-width:0; }
  .vn-form input{
    font:inherit; font-size:.95rem; color:var(--ink,#111); background:var(--paper,#fff);
    border:1px solid var(--hair,#111); padding:.55rem .65rem; width:100%; min-height:44px;
  }
  .vn-form input:focus-visible{ outline:2px solid var(--ink,#111); outline-offset:2px; }
  .vn-submit{
    font-family:var(--font-brand,sans-serif); font-weight:500; font-size:.72rem;
    letter-spacing:.2em; text-transform:uppercase; color:var(--paper,#fff);
    background:var(--ink,#111); border:1px solid var(--ink,#111);
    padding:.65rem .8rem; cursor:pointer; min-height:44px;
  }
  .vn-alt{ background:none; border:0; color:var(--ink-60,#5a5a5a); font:inherit;
    font-size:.85rem; font-style:italic; cursor:pointer; text-decoration:underline;
    text-underline-offset:3px; padding:.2rem 0; }
  .vn-status{ font-size:.88rem; font-style:italic; color:var(--ink-60,#5a5a5a);
    margin:.8rem 0 0; min-height:1.2em; }
  .vn-status.err{ color:#b3261e; font-style:normal; }
  :root[data-theme="dark"] .vn-status.err{ color:#ff8a80; }
  .vn-busy{ opacity:.55; pointer-events:none; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  /* ── nav slot ────────────────────────────────────────────────────────── */
  const nav = document.querySelector(".nav-row") || document.querySelector("header") || document.body;
  const slot = document.createElement("span");
  slot.className = "vn-auth-slot";
  /* beside the theme toggle, inside whatever groups the two so they wrap
     as one unit when the strip breaks into rows */
  const theme = document.querySelector(".theme-toggle");
  if (theme && theme.parentNode) theme.parentNode.insertBefore(slot, theme);
  else nav.appendChild(slot);

  function drawSlot(user){
    slot.textContent = "";
    if (user){
      const name = document.createElement("button");
      name.type = "button";
      name.className = "vn-auth-name";
      name.textContent = user.displayName || user.email || "Signed in";
      name.title = (user.email || "") + " — account";
      name.addEventListener("click", () => openAccountModal(user));
      const out = document.createElement("button");
      out.type = "button"; out.className = "vn-auth-btn"; out.textContent = "Log out";
      out.addEventListener("click", () => auth.signOut());
      slot.append(name, out);
    } else {
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "vn-auth-btn"; btn.textContent = "Log in";
      btn.addEventListener("click", () => openModal());
      slot.append(btn);
    }
  }

  /* the signed-in modal: who you are, leaving, and the door marked
     deletion — App Store guideline 5.1.1(v) requires the account to be
     destroyable where it was creatable, and destroying it takes the saved
     files and profile with it */
  function openAccountModal(user){
    closeModal();
    wrap = document.createElement("div");
    wrap.className = "vn-modal-wrap";
    wrap.addEventListener("click", e => { if (e.target === wrap) closeModal(); });
    const box = document.createElement("div");
    box.className = "vn-modal";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Your account");
    const close = document.createElement("button");
    close.type = "button"; close.className = "vn-close"; close.innerHTML = "&#215;";
    close.setAttribute("aria-label", "Close");
    close.addEventListener("click", closeModal);
    const h = document.createElement("h2");
    h.textContent = user.displayName || "Your account";
    const who = document.createElement("p");
    who.className = "vn-who";
    who.textContent = user.email || "";
    const out = document.createElement("button");
    out.type = "button"; out.className = "vn-submit"; out.textContent = "Log out";
    out.addEventListener("click", () => run(out, () => auth.signOut()));
    const warn = document.createElement("p");
    warn.className = "vn-who";
    warn.textContent = "Deleting the account removes it for good, along with the profile and every saved file. There is no undo.";
    warn.style.marginTop = "1.1rem";
    const del = document.createElement("button");
    del.type = "button"; del.className = "vn-danger";
    del.textContent = "Delete account…";
    let armed = false;
    del.addEventListener("click", () => {
      if (!armed){
        armed = true;
        del.textContent = "Press again to delete for ever";
        del.classList.add("armed");
        setTimeout(() => {
          if (!armed) return;
          armed = false; del.classList.remove("armed"); del.textContent = "Delete account…";
        }, 6000);
        return;
      }
      run(del, () => auth.deleteAccount());
    });
    statusEl = document.createElement("p");
    statusEl.className = "vn-status";
    statusEl.setAttribute("aria-live", "polite");
    box.append(close, h, who, out, warn, del, statusEl);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    document.addEventListener("keydown", onEsc);
  }

  /* ── modal ───────────────────────────────────────────────────────────── */
  const MARKS = {
    google: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9l3.3-2.5z"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5L18.7 4.7A10 10 0 0 0 3.1 7.5L6.4 10c.8-2.3 3-4 5.6-4z"/></svg>',
    apple: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.7 12.9c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.9-1.6 0-3.1 1-4 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.1-1.2 2.9-2.3.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.4-1-2.4-3.7zM14.4 5.6c.7-.8 1.1-1.9 1-3.1-1 .1-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5A2.49 2.49 0 1 1 5 8.48a2.49 2.49 0 0 1 0-4.98zM3 9.9h4V21H3zM9.5 9.9h3.8v1.5h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-4.9c0-1.2 0-2.7-1.7-2.7s-1.9 1.3-1.9 2.6V21h-4V9.9z"/></svg>'
  };

  let wrap = null, statusEl = null;

  function status(text, isErr){
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.classList.toggle("err", !!isErr);
  }

  /* every action runs through here: dims the modal while in flight, closes
     it on success, and shows the friendly message on failure. A notice that
     should stay visible (link sent, reset sent) travels as an error
     carrying keepOpen. */
  /* a sign-in that neither succeeds nor fails within this long is reported
     as a failure: the modal must never stay faded with nothing to press */
  const PATIENCE = 30000;
  function patient(p){
    let t;
    const late = new Promise((_, rej) => { t = setTimeout(() => rej(new Error(
      "The sign-in service didn't answer. Check your connection and try again.")), PATIENCE); });
    return Promise.race([p, late]).finally(() => clearTimeout(t));
  }

  async function run(el, fn){
    const host = el.closest(".vn-modal") || el;
    host.classList.add("vn-busy");
    status("");
    try{
      await patient(fn());
      closeModal();
    }catch(err){
      if (err && err.keepOpen) status(err.message, false);
      else status(err && err.message ? err.message : "Something went wrong. Try again.", true);
    }finally{
      host.classList.remove("vn-busy");
    }
  }

  function field(type, name, label, auto){
    const i = document.createElement("input");
    i.type = type; i.name = name; i.placeholder = label; i.setAttribute("aria-label", label);
    if (auto) i.autocomplete = auto;
    i.required = true;
    return i;
  }

  function openModal(prefill){
    closeModal();
    wrap = document.createElement("div");
    wrap.className = "vn-modal-wrap";
    wrap.addEventListener("click", e => { if (e.target === wrap) closeModal(); });

    const box = document.createElement("div");
    box.className = "vn-modal";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Account");

    const close = document.createElement("button");
    close.type = "button"; close.className = "vn-close"; close.innerHTML = "&#215;";
    close.setAttribute("aria-label", "Close");
    close.addEventListener("click", closeModal);

    const h = document.createElement("h2");
    h.textContent = "Your account";

    box.append(close, h);

    /* provider buttons, in the required order */
    const prov = document.createElement("div");
    prov.className = "vn-prov";
    const provs = [
      ["google",   "Continue with Google",   () => auth.signInWithGoogle()],
      ["apple",    "Continue with Apple",    () => auth.signInWithApple()],
      ["linkedin", "Continue with LinkedIn", () => auth.signInWithLinkedIn()]
    ];
    let shown = 0;
    provs.forEach(([key, label, fn]) => {
      if (!auth.providers[key]) return;
      shown++;
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = MARKS[key] + "<span>" + label + "</span>";
      b.addEventListener("click", () => run(b, fn));
      prov.appendChild(b);
    });
    if (shown){
      box.appendChild(prov);
      const or = document.createElement("p");
      or.className = "vn-or"; or.textContent = "or use email";
      box.appendChild(or);
    }

    /* tabs */
    const tabs = document.createElement("div");
    tabs.className = "vn-tabs";
    const forms = {};
    [["in", "Sign in"], ["up", "Create account"], ["reset", "Reset"]].forEach(([key, label]) => {
      const t = document.createElement("button");
      t.type = "button"; t.textContent = label; t.dataset.tab = key;
      t.addEventListener("click", () => setTab(key));
      tabs.appendChild(t);
    });
    box.appendChild(tabs);

    function setTab(key){
      tabs.querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.tab === key));
      Object.keys(forms).forEach(k => forms[k].classList.toggle("active", k === key));
      status("");
    }

    /* sign in */
    const fIn = document.createElement("form");
    fIn.className = "vn-form";
    const inEmail = field("email", "email", "Email", "email");
    const inPass  = field("password", "password", "Password", "current-password");
    const inGo = document.createElement("button");
    inGo.type = "submit"; inGo.className = "vn-submit"; inGo.textContent = "Sign in";
    const inLink = document.createElement("button");
    inLink.type = "button"; inLink.className = "vn-alt";
    inLink.textContent = "Email me a sign-in link instead";
    inLink.addEventListener("click", () => run(inLink, async () => {
      if (!inEmail.value) throw new Error("Enter your email address first.");
      await auth.sendSignInLink(inEmail.value.trim());
      throw Object.assign(new Error("Sign-in link sent — check your inbox on this device."), { keepOpen: true });
    }));
    fIn.append(inEmail, inPass, inGo);
    if (auth.providers.emailLink) fIn.append(inLink);
    fIn.addEventListener("submit", e => {
      e.preventDefault();
      run(fIn, () => auth.signInWithEmail(inEmail.value.trim(), inPass.value));
    });
    forms["in"] = fIn;

    /* create account */
    const fUp = document.createElement("form");
    fUp.className = "vn-form";
    const upFirst = field("text", "given-name", "First name", "given-name");
    const upLast  = field("text", "family-name", "Surname", "family-name");
    const row = document.createElement("div"); row.className = "row2";
    row.append(upFirst, upLast);
    const upEmail = field("email", "email", "Email", "email");
    const upPass  = field("password", "new-password", "Password", "new-password");
    const upPass2 = field("password", "confirm-password", "Confirm password", "new-password");
    const upGo = document.createElement("button");
    upGo.type = "submit"; upGo.className = "vn-submit"; upGo.textContent = "Create account";
    fUp.append(row, upEmail, upPass, upPass2, upGo);
    fUp.addEventListener("submit", e => {
      e.preventDefault();
      if (upPass.value !== upPass2.value){ status("The two passwords don't match.", true); return; }
      run(fUp, () => auth.signUpWithEmail({
        firstName: upFirst.value, lastName: upLast.value,
        email: upEmail.value.trim(), password: upPass.value, confirm: upPass2.value
      }));
    });
    forms["up"] = fUp;

    /* reset */
    const fRe = document.createElement("form");
    fRe.className = "vn-form";
    const reEmail = field("email", "email", "Email", "email");
    const reGo = document.createElement("button");
    reGo.type = "submit"; reGo.className = "vn-submit"; reGo.textContent = "Send reset email";
    fRe.append(reEmail, reGo);
    fRe.addEventListener("submit", e => {
      e.preventDefault();
      run(fRe, async () => {
        await auth.sendReset(reEmail.value.trim());
        throw Object.assign(new Error("Reset email sent — check your inbox."), { keepOpen: true });
      });
    });
    forms["reset"] = fRe;

    box.append(fIn, fUp, fRe);

    statusEl = document.createElement("p");
    statusEl.className = "vn-status";
    statusEl.setAttribute("aria-live", "polite");
    box.appendChild(statusEl);

    wrap.appendChild(box);
    document.body.appendChild(wrap);
    document.addEventListener("keydown", onEsc);
    setTab("in");
    if (prefill && prefill.status) status(prefill.status, prefill.err);
    if (prefill && prefill.email) inEmail.value = prefill.email;
  }

  function onEsc(e){ if (e.key === "Escape") closeModal(); }
  function closeModal(){
    if (!wrap) return;
    document.removeEventListener("keydown", onEsc);
    wrap.remove(); wrap = null; statusEl = null;
  }

  /* ── boot ────────────────────────────────────────────────────────────── */
  auth.onUser(drawSlot);

  /* arriving on a passwordless sign-in link: finish it, asking for the
     email only if this browser never stored it */
  if (auth.pendingEmailLink){
    auth.completeSignInLink().catch(err => {
      if (err && err.code === "vn/needs-email"){
        openModal({ status: "Confirm the email this sign-in link was sent to, then press Sign in — no password needed." });
        const form = wrap && wrap.querySelector(".vn-form.active");
        if (form){
          form.addEventListener("submit", e => {
            e.preventDefault(); e.stopImmediatePropagation();
            const email = form.querySelector('input[type="email"]').value.trim();
            run(form, () => auth.completeSignInLink(email));
          }, { capture: true });
        }
      } else {
        openModal({ status: err && err.message, err: true });
      }
    });
  }
}
