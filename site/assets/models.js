/* Saved models: a named snapshot of what a page is showing, kept so it can
   be opened again — on this device when signed out, in the account when
   signed in, and moved from the one to the other on the first login.

   The page owns what a model contains. It hands over two functions:
   capture() returns a plain object describing the current view, restore(o)
   puts that view back. This file owns the rest — the name box, the list,
   the storage, and saying honestly where the model went.

     MN_MODELS.attach({ tool, host, capture, restore, noun })
     MN_MODELS.connect(auth, files)      from a module script, once

   Signed out, models live in localStorage under vn-models-<tool>. Signed
   in, they are files in the account: users/{uid}/tools/{tool}/files/{name},
   through userdata.js, which is what Practice already uses for progress.
   A save that the account refuses is kept on the device instead and the
   note under the list says so. */
window.MN_MODELS = (function(){
"use strict";

var auth = null, files = null, widgets = [];

function key(tool){ return "vn-models-" + tool; }
function readLocal(tool){
  try{ var v = JSON.parse(localStorage.getItem(key(tool)) || "{}"); return v && typeof v === "object" ? v : {}; }
  catch(e){ return {}; }
}
function writeLocal(tool, all){
  try{ localStorage.setItem(key(tool), JSON.stringify(all)); return true; }
  catch(e){ return false; }
}

function when(v){
  var d = null;
  if (!v) return "";
  if (typeof v === "number") d = new Date(v);
  else if (v.toDate) d = v.toDate();
  else if (v.seconds) d = new Date(v.seconds * 1000);
  else d = new Date(v);
  if (!d || isNaN(d.getTime())) return "";
  var now = new Date(), sameYear = d.getFullYear() === now.getFullYear();
  try{
    return d.toLocaleDateString(undefined, sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
  }catch(e){ return d.toDateString(); }
}

function attach(o){
  var tool = o.tool, host = o.host, noun = o.noun || "model";
  if (!tool || !host || !o.capture || !o.restore) return null;

  var wrap = document.createElement("div"); wrap.className = "models";
  var form = document.createElement("form"); form.className = "mform";
  var input = document.createElement("input");
  input.type = "text"; input.maxLength = 60; input.placeholder = "Name this " + noun + "…";
  input.setAttribute("aria-label", "Name for the saved " + noun); input.autocomplete = "off";
  var saveBtn = document.createElement("button"); saveBtn.type = "submit"; saveBtn.className = "btn"; saveBtn.textContent = "Save";
  form.appendChild(input); form.appendChild(saveBtn);
  var list = document.createElement("div"); list.className = "mlist"; list.setAttribute("role", "list");
  var note = document.createElement("p"); note.className = "models-note"; note.setAttribute("aria-live", "polite");
  wrap.appendChild(form); wrap.appendChild(list); wrap.appendChild(note);
  host.appendChild(wrap);

  var mode = "device", items = [], user = null, busy = false, flash = null, flashErr = false;

  function say(msg, err){ flash = msg || null; flashErr = !!err; renderNote(); }
  function renderNote(){
    note.classList.toggle("err", !!(flash && flashErr));
    if (flash){ note.textContent = flash; return; }
    note.textContent = "";
    if (mode === "account"){
      note.textContent = items.length
        ? "Saved to your account. Open any of them on any device you log in on."
        : "Nothing saved yet. Name the view above and press Save; it goes to your account.";
    } else {
      var canLogin = auth && auth.enabled;
      note.textContent = (items.length
        ? "Saved on this device only."
        : "Nothing saved yet. Name the view above and press Save; it stays on this device.") +
        (canLogin ? " " : "");
      if (canLogin){
        var a = document.createElement("a"); a.href = "#"; a.textContent = "Log in";
        a.addEventListener("click", function(e){
          e.preventDefault();
          var b = document.querySelector(".vn-auth-btn"); if (b) b.click();
        });
        note.appendChild(a);
        note.appendChild(document.createTextNode(" to keep " + noun + "s in your account and open them anywhere."));
      }
    }
  }

  function renderList(){
    list.innerHTML = "";
    items.forEach(function(it){
      var row = document.createElement("div"); row.className = "mrow"; row.setAttribute("role", "listitem");
      var name = document.createElement("button"); name.type = "button"; name.className = "mname"; name.textContent = it.name;
      name.title = "Open " + it.name;
      name.addEventListener("click", function(){ load(it.name); });
      var date = document.createElement("span"); date.className = "mdate"; date.textContent = when(it.updated);
      var del = document.createElement("button"); del.type = "button"; del.className = "mdel"; del.textContent = "×";
      del.setAttribute("aria-label", "Delete " + it.name);
      var armed = null;
      del.addEventListener("click", function(){
        if (armed){ clearTimeout(armed); armed = null; remove(it.name); return; }
        del.textContent = "Sure?"; del.classList.add("armed");
        armed = setTimeout(function(){ armed = null; del.textContent = "×"; del.classList.remove("armed"); }, 3000);
      });
      row.appendChild(name); row.appendChild(date); row.appendChild(del);
      list.appendChild(row);
    });
    list.hidden = !items.length;
    renderNote();
  }

  function localItems(){
    var all = readLocal(tool);
    return Object.keys(all).map(function(n){ return { name: n, updated: all[n].updated || 0 }; })
      .sort(function(a, b){ return a.name.localeCompare(b.name); });
  }

  function refresh(){
    if (mode === "account"){
      return files.list(tool).then(function(rows){
        items = rows.map(function(r){ return { name: r.name, updated: r.updatedAt }; });
        renderList();
      }).catch(function(err){
        console.warn("models list:", err && err.message);
        say("Could not read your account's saved " + noun + "s: " + (err && err.message), true);
        items = []; renderList();
      });
    }
    items = localItems(); renderList();
    return Promise.resolve();
  }

  function setBusy(b){ busy = b; saveBtn.disabled = b; list.classList.toggle("busy", b); }

  function save(name){
    name = String(name || "").trim();
    if (!name){ say("Give the " + noun + " a name first."); input.focus(); return Promise.resolve(); }
    var data;
    try{ data = o.capture(); }catch(e){ say("Could not read the view: " + (e && e.message), true); return Promise.resolve(); }
    if (!data){ say("There is nothing to save yet."); return Promise.resolve(); }
    data.updated = Date.now(); data.name = name;
    var existed = items.some(function(it){ return it.name === name; });
    setBusy(true);
    var p;
    if (mode === "account"){
      p = files.save(tool, name, data).then(function(){
        return refresh().then(function(){ say((existed ? "Replaced " : "Saved ") + "“" + name + "” in your account."); });
      }).catch(function(err){
        console.warn("model save:", err && err.message);
        var all = readLocal(tool); all[name] = { data: data, updated: data.updated }; writeLocal(tool, all);
        say("Saving to your account failed (" + ((err && err.message) || "unknown error") + "), so “" + name + "” is kept on this device for now.", true);
      });
    } else {
      var all = readLocal(tool); all[name] = { data: data, updated: data.updated };
      p = Promise.resolve(writeLocal(tool, all)).then(function(okk){
        items = localItems(); renderList();
        say(okk ? (existed ? "Replaced " : "Saved ") + "“" + name + "” on this device." : "This browser would not store the " + noun + ".", !okk);
      });
    }
    return p.then(function(){ input.value = ""; }).then(function(){ setBusy(false); }, function(){ setBusy(false); });
  }

  function load(name){
    setBusy(true);
    var p = mode === "account" ? files.load(tool, name) : Promise.resolve((readLocal(tool)[name] || {}).data);
    return p.then(function(data){
      if (!data) throw new Error("No saved " + noun + " called “" + name + "”.");
      o.restore(data);
      input.value = name;
      if (window.MN) MN.tap("light");
      say("Opened “" + name + "”.");
    }).catch(function(err){
      console.warn("model load:", err && err.message);
      say((err && err.message) || "Could not open the " + noun + ".", true);
    }).then(function(){ setBusy(false); });
  }

  function remove(name){
    setBusy(true);
    var p;
    if (mode === "account") p = files.remove(tool, name).then(refresh);
    else { var all = readLocal(tool); delete all[name]; writeLocal(tool, all); items = localItems(); renderList(); p = Promise.resolve(); }
    return p.then(function(){ say("Deleted “" + name + "”."); })
      .catch(function(err){ say("Could not delete: " + (err && err.message), true); })
      .then(function(){ setBusy(false); });
  }

  /* on login the device's models move into the account, name by name; a
     model the account already has under that name is left as it is */
  function migrate(){
    var all = readLocal(tool), names = Object.keys(all);
    if (!names.length) return Promise.resolve(0);
    return files.list(tool).then(function(rows){
      var have = {}; rows.forEach(function(r){ have[r.name] = true; });
      var moved = 0, chain = Promise.resolve();
      names.forEach(function(n){
        chain = chain.then(function(){
          if (have[n]){ delete all[n]; return; }
          return files.save(tool, n, all[n].data).then(function(){ delete all[n]; moved++; });
        });
      });
      return chain.then(function(){ writeLocal(tool, all); return moved; });
    });
  }

  function onUser(u){
    user = u;
    if (u && files){
      mode = "account";
      migrate().then(function(moved){
        return refresh().then(function(){ if (moved) say(moved + " saved " + noun + (moved === 1 ? "" : "s") + " from this device moved to your account."); });
      }).catch(function(err){
        console.warn("model migrate:", err && err.message);
        refresh();
      });
    } else {
      mode = "device"; flash = null; refresh();
    }
  }

  form.addEventListener("submit", function(e){ e.preventDefault(); if (!busy) save(input.value); });

  var w = { tool: tool, onUser: onUser, refresh: refresh, save: save, load: load, remove: remove,
            get mode(){ return mode; }, get items(){ return items.slice(); }, element: wrap };
  widgets.push(w);
  if (user === null && auth && auth.currentUser) onUser(auth.currentUser()); else refresh();
  return w;
}

function connect(a, f){
  auth = a; files = f;
  if (!a || !a.enabled) { widgets.forEach(function(w){ w.onUser(null); }); return; }
  a.onUser(function(u){ widgets.forEach(function(w){ w.onUser(u); }); });
}

return { attach: attach, connect: connect, _local: readLocal };
})();
