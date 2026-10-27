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
   note under the list says so. Export file and Import file (v12.28) move a
   model between devices as a JSON file, the same object Save keeps, with no
   account needed: the apps hand it to the Files app and the share sheet
   through MN.saveFile, the web downloads it, and a file picker reads one
   back and the page's restore builds the view from it. Example maps
   (v12.47, at the owner's word) stand in a section under the person's own,
   which reads None until they save one: attach's examples, each a name, a
   note and the model as a save keeps it, opened with a press, the name box
   filled so Save keeps a copy, with nothing to delete. With folds the two
   sections are details elements, Saved and Examples, shut until pressed
   (the 3D Region Atlas, where the whole widget stands in a fold of the
   region box since v12.47); Saved opens as a map is saved. */
window.MN_MODELS = (function(){
"use strict";

var auth = null, files = null, widgets = [];
/* the account's copy on the device changed, here or on another page (v12.54): every widget's list follows */
if (typeof window !== "undefined") window.addEventListener("vn-account", function(){ widgets.forEach(function(w){ if (w.onKept) w.onKept(); }); });

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
  var tool = o.tool, host = o.host, noun = o.noun || "model", things = o.things || (noun + "s"), folds = !!o.folds;
  if (!tool || !host || !o.capture || !o.restore) return null;
  var examples = Array.isArray(o.examples) ? o.examples.filter(function(ex){ return ex && ex.name && ex.data; }) : [];

  var wrap = document.createElement("div"); wrap.className = "models";
  var form = document.createElement("form"); form.className = "mform";
  var input = document.createElement("input");
  input.type = "text"; input.maxLength = 60; input.placeholder = "Name this " + noun + "…";
  input.setAttribute("aria-label", "Name for the saved " + noun); input.autocomplete = "off";
  var saveBtn = document.createElement("button"); saveBtn.type = "submit"; saveBtn.className = "btn"; saveBtn.textContent = "Save";
  form.appendChild(input); form.appendChild(saveBtn);
  var list = document.createElement("div"); list.className = "mlist"; list.setAttribute("role", "list");
  var note = document.createElement("p"); note.className = "models-note"; note.setAttribute("aria-live", "polite");
  /* the model as a file (v12.28, at the owner's word): Export writes what
     Save would keep, as JSON, to the Files app and the share sheet inside the
     apps and as a download on the web; Import reads such a file back and
     builds the view from it, on any device, signed in or not */
  var fileRow = document.createElement("div"); fileRow.className = "mfile";
  var exportBtn = document.createElement("button"); exportBtn.type = "button"; exportBtn.className = "btn"; exportBtn.textContent = "Export file";
  exportBtn.title = "Write this " + noun + " to a file";
  var importBtn = document.createElement("button"); importBtn.type = "button"; importBtn.className = "btn"; importBtn.textContent = "Import file";
  importBtn.title = "Open a " + noun + " from a file";
  var picker = document.createElement("input"); picker.type = "file"; picker.accept = ".json,application/json"; picker.hidden = true;
  picker.setAttribute("aria-label", "A saved " + noun + " file");
  fileRow.appendChild(exportBtn); fileRow.appendChild(importBtn); fileRow.appendChild(picker);
  wrap.appendChild(form); wrap.appendChild(fileRow);
  /* the person's own under a heading, None until there is one, and the
     examples under theirs */
  var exList = null, ownFold = null;
  if (examples.length){
    exList = document.createElement("div"); exList.className = "mlist examples"; exList.setAttribute("role", "list");
    if (folds){
      ownFold = fold("Saved", list);
      wrap.appendChild(ownFold);
      wrap.appendChild(fold("Examples", exList));
    } else {
      wrap.appendChild(heading("Your " + things));
      wrap.appendChild(list);
      wrap.appendChild(heading("Example " + things));
      wrap.appendChild(exList);
    }
  } else {
    wrap.appendChild(list);
  }
  wrap.appendChild(note);
  host.appendChild(wrap);
  function heading(text){
    var h = document.createElement("div"); h.className = "mhead"; h.textContent = text;
    return h;
  }
  function fold(text, body){
    var d = document.createElement("details"); d.className = "fold";
    var sm = document.createElement("summary"); sm.textContent = text;
    var inn = document.createElement("div"); inn.className = "fold-in";
    inn.appendChild(body); d.appendChild(sm); d.appendChild(inn);
    return d;
  }

  var mode = "device", items = [], user = null, busy = false, flash = null, flashErr = false;

  function say(msg, err){ flash = msg || null; flashErr = !!err; renderNote(); }
  /* the note carries only what just happened (v12.48, at the owner's word): a map opened, saved,
     deleted or moved, or what went wrong; the standing lines on where the maps are kept went */
  function renderNote(){
    note.classList.toggle("err", !!(flash && flashErr));
    note.textContent = flash || "";
  }

  function renderList(){
    list.innerHTML = "";
    if (!items.length && exList){
      var none = document.createElement("div"); none.className = "mnone"; none.setAttribute("role", "listitem");
      none.textContent = "None";
      list.appendChild(none);
    }
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
    list.hidden = !items.length && !exList;
    renderNote();
  }

  /* the examples: a press opens one, and the note says what it shows */
  function renderExamples(){
    if (!exList) return;
    exList.innerHTML = "";
    examples.forEach(function(ex){
      var row = document.createElement("div"); row.className = "mrow example"; row.setAttribute("role", "listitem");
      var name = document.createElement("button"); name.type = "button"; name.className = "mname"; name.textContent = ex.name;
      name.title = ex.note || ("Open " + ex.name);
      name.addEventListener("click", function(){ if (!busy) openExample(ex); });
      var count = document.createElement("span"); count.className = "mdate";
      var n = Array.isArray(ex.data.selections) ? ex.data.selections.length : 0;
      count.textContent = n ? n + (n === 1 ? " region" : " regions") : "";
      row.appendChild(name); row.appendChild(count);
      exList.appendChild(row);
    });
  }
  function openExample(ex){
    setBusy(true);
    try{
      o.restore(JSON.parse(JSON.stringify(ex.data)));
      input.value = ex.name;
      if (window.MN) MN.tap("light");
      say("Opened “" + ex.name + "”." + (ex.note ? " " + ex.note : "") + " Change it as you like and press Save to keep a copy of your own.");
    }catch(err){
      console.warn("example open:", err && err.message);
      say((err && err.message) || "Could not open the " + noun + ".", true);
    }
    setBusy(false);
  }

  function localItems(){
    var all = readLocal(tool);
    return Object.keys(all).map(function(n){ return { name: n, updated: all[n].updated || 0 }; })
      .sort(function(a, b){ return a.name.localeCompare(b.name); });
  }

  /* the account's list is drawn from the device's copy (v12.54, at the owner's word), and the
     server is read only where there is no copy or it is old, and never while the app alone holds
     the account (held) */
  function keptItems(){
    var rows = files && files.kept ? files.kept(tool) : null;
    return rows ? rows.map(function(r){ return { name: r.name, updated: r.updatedAt }; }) : null;
  }
  function refresh(){
    if (mode === "account"){
      var kept = keptItems();
      if (kept){
        items = kept; renderList();
        if (held || Date.now() - files.keptAt() < 5 * 60 * 1000) return Promise.resolve();
      }
      return files.list(tool).then(function(rows){
        items = rows.map(function(r){ return { name: r.name, updated: r.updatedAt }; });
        renderList();
      }).catch(function(err){
        console.warn("models list:", err && err.message);
        if (kept) return;
        say("Could not read your account's saved " + noun + "s: " + (err && err.message), true);
        items = []; renderList();
      });
    }
    items = localItems(); renderList();
    return Promise.resolve();
  }
  /* the copy changed: the list follows */
  function onKept(){
    if (mode !== "account" || busy) return;
    var kept = keptItems();
    if (kept){ items = kept; renderList(); }
  }
  /* a kept file's data from the device's copy where it has it, else the server */
  function keptOr(name){
    var k = files.keptData ? files.keptData(tool, name) : undefined;
    return k !== undefined ? Promise.resolve(k) : files.load(tool, name);
  }

  function setBusy(b){
    busy = b; saveBtn.disabled = b; exportBtn.disabled = b; importBtn.disabled = b;
    list.classList.toggle("busy", b); if (exList) exList.classList.toggle("busy", b);
  }

  function save(name){
    name = String(name || "").trim();
    if (!name){ say("Give the " + noun + " a name first."); input.focus(); return Promise.resolve(); }
    var data;
    try{ data = o.capture(); }catch(e){ say("Could not read the view: " + (e && e.message), true); return Promise.resolve(); }
    if (!data){ say("There is nothing to save yet."); return Promise.resolve(); }
    data.updated = Date.now(); data.name = name;
    var existed = items.some(function(it){ return it.name === name; });
    /* a name already kept (v12.48, at the owner's word): the same view again is let be, and a
       different one is replaced only on a second press of Save, which reads Replace? for a moment */
    if (existed && replaceArmed !== name){
      setBusy(true);
      var had = mode === "account" ? keptOr(name) : Promise.resolve((readLocal(tool)[name] || {}).data);
      return had.then(function(old){
        setBusy(false);
        if (old && sameView(old, data)){ say("“" + name + "” is already kept, just as it is."); return; }
        armReplace(name);
      }, function(){ setBusy(false); armReplace(name); });
    }
    disarmReplace();
    setBusy(true);
    if (ownFold) ownFold.open = true;   /* the list shows what was just kept */
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

  /* the second press: Save reads Replace? for four seconds, and a press then replaces */
  var replaceArmed = null, replaceTimer = 0;
  function armReplace(name){
    replaceArmed = name;
    saveBtn.textContent = "Replace?"; saveBtn.classList.add("armed");
    say("“" + name + "” is kept already, with a different view. Press Replace? to replace it, or give this one another name.");
    clearTimeout(replaceTimer);
    replaceTimer = setTimeout(disarmReplace, 4000);
  }
  function disarmReplace(){
    clearTimeout(replaceTimer); replaceTimer = 0;
    if (replaceArmed === null) return;
    replaceArmed = null;
    saveBtn.textContent = "Save"; saveBtn.classList.remove("armed");
    if (flash && /Press Replace\?/.test(flash)) say(null);
  }
  input.addEventListener("input", disarmReplace);
  /* the same view: the model as kept against the one in hand, the name and the time aside,
     numbers to the millimetre */
  function sameView(a, b){
    function plain(v){
      if (Array.isArray(v)) return v.map(plain);
      if (v && typeof v === "object"){
        var o = {};
        Object.keys(v).sort().forEach(function(k){ if (k !== "updated" && k !== "name") o[k] = plain(v[k]); });
        return o;
      }
      if (typeof v === "number") return Math.round(v * 1000) / 1000;
      return v;
    }
    try{ return JSON.stringify(plain(a)) === JSON.stringify(plain(b)); }catch(e){ return false; }
  }

  function load(name){
    setBusy(true);
    var p = mode === "account" ? keptOr(name) : Promise.resolve((readLocal(tool)[name] || {}).data);
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

  var held = false;
  function onUser(u){
    user = u;
    /* the app holds the account and this page could not take its session (v12.46): the app's
       copy is shown all the same (v12.54), and a save then stays on the device */
    held = !u && !!files && !!(auth && auth.nativeUser && auth.kept && auth.kept() && auth.kept().uid === auth.nativeUser.uid && files.kept && files.kept(tool));
    if ((u || held) && files){
      mode = "account";
      if (held){ refresh(); return; }
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

  /* the file's name: the tool, then the model's name as typed, made safe for
     a file system (brain-regions-my-selection.json) */
  function fileName(name){
    var slug = String(name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
    return "brain-" + tool + (slug ? "-" + slug : "") + ".json";
  }
  function exportFile(){
    var data;
    try{ data = o.capture(); }catch(e){ say("Could not read the view: " + (e && e.message), true); return; }
    if (!data){ say("There is nothing to export yet."); return; }
    var name = String(input.value || "").trim();
    data.updated = Date.now(); if (name) data.name = name; else delete data.name;
    var text = JSON.stringify(data, null, 2), file = fileName(name);
    var blob = new Blob([text], { type: "application/json" });
    var p;
    if (window.MN && MN.saveFile) p = Promise.resolve(MN.saveFile(blob, file));
    else {
      p = new Promise(function(res){
        var u = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = u; a.download = file; document.body.appendChild(a); a.click();
        setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(u); res(); }, 0);
      });
    }
    p.then(function(){ say("Exported this " + noun + " as " + file + ". Import it on any other device to build it there."); })
     .catch(function(err){ say("Could not write the file: " + ((err && err.message) || "unknown error"), true); });
  }
  function importFile(file){
    if (!file) return;
    setBusy(true);
    var read = typeof file.text === "function" ? file.text() : new Promise(function(res, rej){
      var r = new FileReader(); r.onload = function(){ res(String(r.result)); }; r.onerror = function(){ rej(r.error); }; r.readAsText(file);
    });
    read.then(function(text){
      var data;
      try{ data = JSON.parse(text); }catch(e){ throw new Error("That file is not a saved " + noun + ": it does not read as JSON."); }
      if (!data || typeof data !== "object") throw new Error("That file holds no " + noun + ".");
      o.restore(data);
      var name = typeof data.name === "string" ? data.name.trim().slice(0, 60) : "";
      input.value = name;
      if (window.MN) MN.tap("light");
      say("Imported " + (name ? "“" + name + "”" : "the " + noun) + " from " + file.name + ". Press Save to keep it here.");
    }).catch(function(err){
      console.warn("model import:", err && err.message);
      say((err && err.message) || "Could not read the file.", true);
    }).then(function(){ setBusy(false); picker.value = ""; });
  }
  exportBtn.addEventListener("click", function(){ if (!busy) exportFile(); });
  importBtn.addEventListener("click", function(){ if (!busy) picker.click(); });
  picker.addEventListener("change", function(){ importFile(picker.files && picker.files[0]); });

  form.addEventListener("submit", function(e){ e.preventDefault(); if (!busy) save(input.value); });

  var w = { tool: tool, onUser: onUser, onKept: onKept, refresh: refresh, save: save, load: load, remove: remove,
            openExample: openExample, get examples(){ return examples.slice(); },
            get mode(){ return mode; }, get items(){ return items.slice(); }, element: wrap };
  widgets.push(w);
  renderExamples();
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
