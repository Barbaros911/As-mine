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
   — Les appels d'API (adresses, itinéraire, PayPal, QR) ne sont JAMAIS mis
     en cache : un tarif ou un paiement doit toujours partir en direct.
   ===================================================================== */
/* Racine du site (« /As-mine/ » en ligne — l'adresse du dépôt n'a pas changé
   avec le nom, sinon tous les liens déjà envoyés casseraient). Le service
   worker est enregistré
   à cette adresse : il contrôle donc aussi les sites voisins publiés dans des
   sous-dossiers. Il doit les laisser passer, sans les mettre en cache ni leur
   servir la page d'Elatransfer hors ligne. */
const BASE = new URL("./", self.location).pathname;

/* Vrai si la requête vise un site voisin plutôt qu'Elatransfer elle-même :
   même origine, sous la racine, mais dans un sous-dossier. */
function siteVoisin(url) {
  if (url.origin !== self.location.origin) return false;
  if (!url.pathname.startsWith(BASE)) return false;
  return url.pathname.slice(BASE.length).includes("/");
}

/* Numéro à incrémenter à chaque changement visible : il force les
   téléphones qui ont installé l'application à repartir sur un cache
   propre au lieu de garder d'anciennes ressources. */
const CACHE = "elatransfer-v12";
/* La feuille de style fait partie du strict nécessaire : sans elle la page
   s'ouvre hors ligne mais illisible, ce qui est pire que rien. Les photos
   n'y sont pas — elles font un mégaoctet et n'empêchent personne de
   réserver ; elles se mettront en cache d'elles-mêmes à la visite. */
const SHELL = ["./", "./index.html", "./styles.css",
               "./manifest.webmanifest", "./icon.svg", "./icon-maskable.svg",
               "./icon-180.png"];

/* Hôtes dont la réponse ne doit jamais être mise en cache */
const NO_CACHE_HOSTS = [
  "api-adresse.data.gouv.fr",
  "photon.komoot.io",
  "router.project-osrm.org",
  "api.qrserver.com",
  "www.paypal.com",
  "www.paypalobjects.com"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (NO_CACHE_HOSTS.includes(url.hostname)) return; // laissé au réseau, sans interception
  if (siteVoisin(url)) return; // un autre site du dépôt : ne lui appartient pas

  // Document HTML : réseau d'abord, cache en secours (hors ligne)
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || Response.error()))
    );
    return;
  }

  // Ressources statiques : cache d'abord, réseau en secours
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        // On ne met en cache que les réponses complètes et exploitables
        if (res && res.status === 200 && res.type !== "opaque") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
