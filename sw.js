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

/* LES DOSSIERS QUI APPARTIENNENT À ELATRANSFER, malgré la règle ci-dessous.
   « siteVoisin » traite TOUT sous-dossier comme un site vitrine à laisser
   tranquille — c'est ce qu'on veut pour « /alfredo/ » ou « /demos/ », et
   c'est faux pour nos propres ressources. « carte/ » porte la bibliothèque
   de la carte du trajet : sans cette liste, le service worker la laissait
   passer sans jamais la garder, et la carte redevenait indisponible hors
   ligne — l'inverse de ce qu'on gagne à l'avoir sortie du CDN. */
const NOS_DOSSIERS = ["carte", "exploitant"];

/* Vrai si la requête vise un site voisin plutôt qu'Elatransfer elle-même :
   même origine, sous la racine, mais dans un sous-dossier. */
function siteVoisin(url) {
  if (url.origin !== self.location.origin) return false;
  if (!url.pathname.startsWith(BASE)) return false;
  const reste = url.pathname.slice(BASE.length);
  if (!reste.includes("/")) return false;
  return NOS_DOSSIERS.indexOf(reste.split("/")[0]) === -1;
}

/* Numéro à incrémenter à chaque changement visible : il force les
   téléphones qui ont installé l'application à repartir sur un cache
   propre au lieu de garder d'anciennes ressources. */
const CACHE = "elatransfer-v65";
/* LE STRICT NÉCESSAIRE, ET RIEN DE PLUS — « addAll » est tout ou rien : un
   seul fichier absent et le service worker ne s'installe pas du tout, sans
   le moindre message. C'est pourquoi « ./styles.css » en est sorti à la
   bascule : le nouveau site porte ses styles dans la page, et le jour où
   l'ancien fichier disparaîtra du dépôt il aurait cassé l'installation chez
   tous les clients qui ont posé l'application sur leur écran d'accueil.
   Les photos n'y sont pas non plus — elles font un mégaoctet et n'empêchent
   personne de réserver ; elles se mettent en cache d'elles-mêmes. */
const SHELL = ["./", "./index.html",
               "./manifest.webmanifest", "./icon.svg", "./icon-maskable.svg",
               "./icon-180.png"];

/* Hôtes dont la réponse ne doit jamais être mise en cache */
const NO_CACHE_HOSTS = [
  "api-adresse.data.gouv.fr",
  "photon.komoot.io",
  "router.project-osrm.org",
  /* Mapbox et OpenRouteService calculent l'itinéraire, donc le PRIX. Une
     réponse mise en cache resservirait la distance d'une course précédente
     à une autre course. */
  "api.mapbox.com",
  "api.openrouteservice.org",
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

/* =====================================================================
   LES NOTIFICATIONS
   ---------------------------------------------------------------------
   ON MONTRE TOUJOURS QUELQUE CHOSE. L'abonnement est pris en
   « userVisibleOnly », c'est-à-dire avec l'engagement d'afficher une
   notification à CHAQUE message reçu. Un push traité en silence fait
   révoquer l'abonnement par le navigateur, sans prévenir : le client
   cesserait d'être averti, et personne ne saurait pourquoi. D'où les replis
   sur un titre par défaut plutôt qu'un « return » si le contenu manque.
   LE CLIC RAMÈNE SUR LE BON, pas sur l'accueil : le lien porté par la
   notification est le « ?ok= » qui fait passer le bon au vert. Ouvrir la
   page d'accueil laisserait le client devant un formulaire vide.
   ===================================================================== */
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = {}; }
  event.waitUntil(
    self.registration.showNotification(d.titre || "Elatransfer", {
      body: d.corps || "",
      icon: "./icon-180.png",
      badge: "./icon-180.png",
      /* Une seule notification par course : si la confirmation part deux
         fois, la seconde REMPLACE la première au lieu de s'empiler. */
      tag: d.ref || "elatransfer",
      renotify: true,
      data: { url: d.url || "./" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cible = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((ouvertes) => {
        /* Un onglet du site est peut-être déjà ouvert — souvent celui où le
           client a réservé. On le réutilise et on l'emmène sur le bon,
           plutôt que d'ouvrir un deuxième onglet du même site. */
        for (const f of ouvertes) {
          if ("focus" in f) {
            try { if ("navigate" in f) f.navigate(cible); } catch (e) { /* refusé : on se contente du focus */ }
            return f.focus();
          }
        }
        return self.clients.openWindow(cible);
      })
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

  /* Vrai si l'adresse est l'application elle-même — la racine ou
     « index.html » — et pas une des pages de redirection (« admin.html »,
     « exploitant/ ») qui ne font que pointer vers elle. */
  function estLApplication(u) {
    const reste = u.pathname.slice(BASE.length);
    return reste === "" || reste === "index.html";
  }

  /* ═══ DOCUMENT HTML : RÉSEAU D'ABORD, CACHE EN SECOURS ═══
     LA RÉPONSE EST GARDÉE SOUS SA PROPRE ADRESSE, PLUS SOUS UNE CLÉ UNIQUE.
     Elle l'était sous « ./index.html », quelle que soit la page demandée :
     il suffisait que Barbaros ouvre « /admin.html » ou « /exploitant/ » —
     deux pages qui ne font QUE rediriger — pour que leur contenu remplace le
     site dans le cache. Un client hors ligne rouvrait alors le site et
     tombait sur « Ouverture de l'espace exploitant… », puis sur l'écran du
     code. Une seule clé pour toutes les pages d'un site qui en a trois, c'est
     la même faute que « .service span span » : un sélecteur écrit pour un cas
     unique le jour où il n'y en avait qu'un.
     LE REPLI HORS LIGNE NE VAUT QUE POUR L'APPLICATION. Servir « index.html »
     à l'adresse « /exploitant/ » casserait tous ses chemins relatifs — les
     icônes, le service worker, la bibliothèque de carte sont à la racine, pas
     dans le sous-dossier. Mieux vaut une erreur franche qu'une page à moitié
     chargée. */
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => {
          if (r) return r;
          if (estLApplication(url)) {
            return caches.match("./index.html").then((f) => f || Response.error());
          }
          return Response.error();
        }))
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
