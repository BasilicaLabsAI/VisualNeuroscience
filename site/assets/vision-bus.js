/* The wire between the vision windows. Each spatial window is its own
   page; a BroadcastChannel carries what they share — the crosshair and
   the highlighted regions — and localStorage keeps the latest of each so
   a window opened late starts in step rather than blank.

     VB.on("sel", fn)      fn([{base, pretty, color}, …])
     VB.on("pos", fn)      fn([x, y, z])  — crosshair, as fractions 0…1
     VB.send("sel", data)  broadcast and remember
     VB.send("pos", data)
     VB.state()            {sel, pos} as last remembered */
window.VB = (function(){
  var KEY = "vn-vision-state";
  var ch = ("BroadcastChannel" in window) ? new BroadcastChannel("vn-vision") : null;
  var subs = {};

  function state(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch(e){ return {}; }
  }
  function keep(patch){
    try{
      var s = state();
      for (var k in patch) s[k] = patch[k];
      localStorage.setItem(KEY, JSON.stringify(s));
    }catch(e){}
  }
  if (ch) ch.onmessage = function(ev){
    var m = ev.data || {};
    (subs[m.type] || []).forEach(function(cb){
      try{ cb(m.data); }catch(e){ console.error(e); }
    });
  };
  return {
    send: function(type, data){
      if (type === "sel") keep({sel: data});
      if (type === "pos") keep({pos: data});
      if (ch) ch.postMessage({type: type, data: data});
    },
    on: function(type, cb){ (subs[type] = subs[type] || []).push(cb); },
    state: state
  };
})();
