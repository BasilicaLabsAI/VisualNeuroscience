/* One way to ask for the things a phone can do that a page cannot.

   The same files are served as a website, installed as a web app and
   bundled inside the App Store and Play Store builds, so nothing here may
   assume it is running natively. Every call has three tiers: the native
   plugin if Capacitor injected its bridge, the web platform's own answer if
   the browser has one, and a plain download or a no-op if it does not.

   Capacitor registers its plugins on window.Capacitor.Plugins, so this needs
   no bundler and no build step — which is the whole point, since the site
   ships as static files.

     MN.isNative                       inside a native shell
     MN.platform                       "ios" | "android" | "web"
     MN.tap("light" | "medium")        haptic tick, silent on the web
     MN.share({title, text, url})      share sheet, else Web Share, else copy
     MN.saveImage(dataUrl, name)       Photos/Files, else a download

   All four resolve rather than throw: a page should never break because the
   platform underneath it cannot do something. */
window.MN = (function(){

var cap  = window.Capacitor || null;
var P    = (cap && cap.Plugins) || {};
var isNative = !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
var platform = (cap && typeof cap.getPlatform === "function" && cap.getPlatform()) || "web";

/* the document says what it is running in, so CSS can meet it halfway */
try {
  var root = document.documentElement;
  root.setAttribute("data-platform", platform);
  if (isNative) root.setAttribute("data-native", "");
} catch (e) {}

function tap(style){
  try {
    if (P.Haptics) return P.Haptics.impact({ style: (style || "light").toUpperCase() });
    if (navigator.vibrate) navigator.vibrate(style === "medium" ? 18 : 8);
  } catch (e) {}
  return Promise.resolve();
}

function share(o){
  o = o || {};
  var title = o.title || document.title;
  var text  = o.text  || "";
  var url   = o.url   || (location.protocol === "http:" || location.protocol === "https:"
                            ? location.href : "https://visualneuroscience.ai/");
  try {
    if (P.Share) return P.Share.share({ title: title, text: text, url: url });
    if (navigator.share) return navigator.share({ title: title, text: text, url: url });
    if (navigator.clipboard) return navigator.clipboard.writeText(url);
  } catch (e) {}
  return Promise.resolve();
}

function dataUrlToBase64(d){ return String(d).slice(String(d).indexOf(",") + 1); }

/* Native: write into Documents, then offer it on the share sheet so it can
   go to Photos, Files, or anywhere else. Web: an ordinary download. */
function saveImage(dataUrl, name){
  name = name || "visualneuroscience.png";
  if (P.Filesystem){
    return P.Filesystem.writeFile({
      path: name, data: dataUrlToBase64(dataUrl),
      directory: "DOCUMENTS", recursive: true
    }).then(function(res){
      if (!P.Share || !res || !res.uri) return res;
      return P.Share.share({ title: name, files: [res.uri] }).catch(function(){ return res; });
    });
  }
  try {
    var a = document.createElement("a");
    a.href = dataUrl; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  } catch (e) {}
  return Promise.resolve();
}

/* the splash is held until the page says it is ready, so a cold start does
   not show a blank webview while fourteen megabytes come off disk */
function ready(){
  try { if (P.SplashScreen) P.SplashScreen.hide(); } catch (e) {}
}
if (isNative) window.addEventListener("load", function(){ setTimeout(ready, 200); });

/* The service worker is how the website runs offline. The native shells
   already hold every file in their own bundle and serve them off a custom
   scheme, so registering one there would cache a copy of something that is
   local already — and on iOS the scheme is not one a worker may claim. */
if (!isNative && "serviceWorker" in navigator &&
    (location.protocol === "https:" || location.hostname === "localhost" ||
     location.hostname === "127.0.0.1")){
  window.addEventListener("load", function(){
    navigator.serviceWorker.register("/sw.js").catch(function(){});
  });
}

return { isNative: isNative, platform: platform,
         tap: tap, share: share, saveImage: saveImage, ready: ready };
})();
