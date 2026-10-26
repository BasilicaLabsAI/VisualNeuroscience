/* What a page keeps of how it was left, for as long as the app runs
   (v12.35, at the owner's word).

   The study visualisation opens, the first time after the app is launched,
   as on a first visit, and where it was left when it is come back to while
   the app still runs; closing the app for good (a swipe up from the
   switcher) forgets it, so the next launch opens it as the first did.

   In the iOS app every page is a web view of its own, which keeps no session
   from one page to the next, so the shell writes the launch's own name,
   VN_LAUNCH, into every page before it runs (ShellWeb.swift), new each time
   the app is launched; what is kept is filed under that name in
   localStorage, and anything filed under an earlier launch counts as
   nothing. Elsewhere (the website, and the Android app, whose one web view
   lives as long as the app does) the tab's own sessionStorage is the launch.

     MN_KEEP.get(name)          what was kept this launch, or null
     MN_KEEP.set(name, value)   keep it: anything JSON can carry
     MN_KEEP.drop(name)         forget it */
window.MN_KEEP = (function(){

var launch = typeof window.VN_LAUNCH === "string" && window.VN_LAUNCH ? window.VN_LAUNCH : null;

function key(name){ return "vn-keep-" + name; }

function get(name){
  try{
    if (launch){
      var raw = localStorage.getItem(key(name));
      if (!raw) return null;
      var filed = JSON.parse(raw);
      if (!filed || filed.launch !== launch){ localStorage.removeItem(key(name)); return null; }
      return filed.value == null ? null : filed.value;
    }
    var s = sessionStorage.getItem(key(name));
    return s ? JSON.parse(s) : null;
  }catch(e){ return null; }
}

function set(name, value){
  try{
    if (launch) localStorage.setItem(key(name), JSON.stringify({ launch: launch, value: value }));
    else sessionStorage.setItem(key(name), JSON.stringify(value));
  }catch(e){}
}

function drop(name){
  try{ localStorage.removeItem(key(name)); }catch(e){}
  try{ sessionStorage.removeItem(key(name)); }catch(e){}
}

return { get: get, set: set, drop: drop };
})();
