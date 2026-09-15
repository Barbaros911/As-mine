/* =====================================================================
   ASMINE — SERVICE WORKER
   Objectif : l'application reste consultable hors ligne (ou en réseau
   dégradé, ce qui arrive souvent dans un parking d'aéroport ou un sous-sol),
   sans jamais servir une réservation ou un paiement périmé.

   Règles :
   — Le document HTML est servi « réseau d'abord » : le client voit toujours
     la dernière version publiée, et bascule sur le cache seulement hors ligne.
   — Les ressources statiques (icônes, manifeste, polices, Leaflet) sont
     servies « cache d'abord » : elles ne changent pas d'une visite à l'autre.
   — Les assets visuels critiques de l'application sont servis « réseau d'abord »
     afin qu'une nouvelle façade ou un nouveau design hôtel apparaisse sans
     rester bloqué sur une ancienne feuille de style mise en cache.
   — Les appels d'API (adresses, itinéraire, PayPal, QR) ne sont JAMAIS mis
     en cache : un tarif ou un paiement doit toujours partir en direct.
   ===================================================================== */
const BASE = new URL("./", self.location).pathname;
const NOS_DOSSIERS = ["carte", "exploitant"];
function siteVoisin(url) {
  if (url.origin !== self.location.origin) return false;
  if (!url.pathname.startsWith(BASE)) return false;
  const reste = url.pathname.slice(BASE.length);
  if (!reste.includes("/")) return false;
  return NOS_DOSSIERS.indexOf(reste.split("/")[0]) === -1;
}

/* v79 publie la fusion visuelle landing et moteur easyHotel. */
const CACHE = "elatransfer-v79";
const SHELL = ["./", "./index.html", "./application.html",
               "./application-facade.css", "./hotel-engine-polish.css", "./hotel-engine-polish.js",
               "./manifest.webmanifest", "./icon-180.png", "./icon-512.png",
               "./brand-logo.webp", "./brand-logo-white.png"];
const NETWORK_FIRST_ASSETS = [
  "/application-facade.css",
  "/hotel-engine-polish.css",
  "/hotel-engine-polish.js"
];
const NO_CACHE_HOSTS = [
  "api-adresse.data.gouv.fr","photon.komoot.io","router.project-osrm.org",
  "api.mapbox.com","api.openrouteservice.org","api.qrserver.com",
  "www.paypal.com","www.paypalobjects.com"
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("push", (event) => {
  let d = {}; try { d = event.data ? event.data.json() : {}; } catch (e) { d = {}; }
  event.waitUntil(self.registration.showNotification(d.titre || "Elatransfer", {
    body:d.corps || "",icon:"./icon-180.png",badge:"./icon-180.png",tag:d.ref || "elatransfer",renotify:true,data:{url:d.url || "./"}
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cible=(event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then((ouvertes)=>{
    for(const f of ouvertes){if("focus" in f){try{if("navigate" in f)f.navigate(cible);}catch(e){} return f.focus();}}
    return self.clients.openWindow(cible);
  }));
});
self.addEventListener("fetch", (event) => {
  const req=event.request;if(req.method!=="GET")return;
  let url;try{url=new URL(req.url);}catch(e){return;}
  if(url.protocol!=="http:"&&url.protocol!=="https:")return;
  if(NO_CACHE_HOSTS.includes(url.hostname)||siteVoisin(url))return;
  function estLApplication(u){const reste=u.pathname.slice(BASE.length);return reste===""||reste==="index.html"||reste==="application.html";}
  if(req.mode==="navigate"||(req.headers.get("accept")||"").includes("text/html")){
    event.respondWith(fetch(req).then((res)=>{const copy=res.clone();caches.open(CACHE).then((c)=>c.put(req,copy)).catch(()=>{});return res;})
      .catch(()=>caches.match(req).then((r)=>{if(r)return r;if(estLApplication(url))return caches.match("./index.html").then((f)=>f||Response.error());return Response.error();})));
    return;
  }
  if(NETWORK_FIRST_ASSETS.some((path)=>url.pathname.endsWith(path))){
    event.respondWith(fetch(req).then((res)=>{if(res&&res.status===200&&res.type!=="opaque"){const copy=res.clone();caches.open(CACHE).then((c)=>c.put(req,copy)).catch(()=>{});}return res;})
      .catch(()=>caches.match(req).then((r)=>r||Response.error())));
    return;
  }
  event.respondWith(caches.match(req).then((hit)=>{if(hit)return hit;return fetch(req).then((res)=>{if(res&&res.status===200&&res.type!=="opaque"){const copy=res.clone();caches.open(CACHE).then((c)=>c.put(req,copy)).catch(()=>{});}return res;});}));
});
