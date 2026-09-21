/* =====================================================================
   ITINERAIRE-PARTAGE.JS — le prix depuis deux adresses, source UNIQUE
   ---------------------------------------------------------------------
   « Calculer le prix depuis les adresses » n'existait que côté site.
   Admin v2 en a besoin, et le recopier aurait été la faute que ce dépôt
   reproche partout — ici la PIRE de toutes, parce que ce qui divergerait
   serait LE PRIX.

   ═══ POURQUOI ÇA NE SE VOIT PAS, ET POURQUOI ÇA COÛTE CHER ═══
   Barbaros annonce un montant au téléphone depuis l'espace exploitant ;
   le client en voit un autre sur le site. Le prix est FERME, donc
   OPPOSABLE : c'est le client qui aurait raison. Et rien ne l'annonce —
   le prix s'affiche des deux côtés, il est simplement différent. On le
   découvre le jour où quelqu'un compare.

   ═══ CE QUE CE FICHIER DÉCIDE, ET CE QU'IL NE DÉCIDE PAS ═══
   IL DÉCIDE : la chaîne d'itinéraire à quatre niveaux, la lecture des
   trois formats de réponse, le vol d'oiseau de secours, l'arrondi à la
   dizaine, le plancher, et la résolution d'une adresse en coordonnées.
   IL NE DÉCIDE PAS la GRILLE : elle est un paramètre OBLIGATOIRE de
   « prix(gamme, km) ». Le site passe « GAMMES », Admin v2 passe la grille
   du SERVEUR. Un défaut caché ici serait une deuxième grille, muette le
   jour où la vraie change — même règle que le lecteur de demandes.
   IL NE CLASSE PAS les résultats d'adresse : le classement du site est
   lié à son autocomplétion (terminaux, variantes, notes, icônes) et reste
   dans la page. Ce fichier porte les APPELS et leur lecture, donc les
   coordonnées ; « lieu() » rend le premier résultat plausible, ce dont
   Admin v2 a besoin.

   Chargé par « index.html » et injecté dans « admin-v2.html » par
   « construire.sh ». Il est dans le SHELL de « sw.js » : sans lui, un
   exploitant hors ligne appuie sur « Calculer le prix » et rien ne se
   passe.
   ===================================================================== */
(function(racine){
  "use strict";

/* =====================================================================
   L'ITINÉRAIRE FAIT LE PRIX — QUATRE NIVEAUX, DU MEILLEUR AU PIRE
   ---------------------------------------------------------------------
   1. MAPBOX si une clé est posée. C'est le seul des trois services dont
      la clé se RESTREINT AU DOMAINE : volée, elle ne sert à rien.
      100 000 itinéraires par mois au palier gratuit.
   2. OPENROUTESERVICE si une clé est posée. 2 000 itinéraires par jour
      au palier gratuit, avec un engagement de service — très au-dessus
      du volume d'Elatransfer.
   3. OSRM sinon, ou si les deux refusent. C'est un serveur de
      DÉMONSTRATION : aucun engagement, débit limité, usage commercial
      déconseillé par ses propres auteurs. Il marche, jusqu'au jour où
      il ne marche plus.
   4. Le vol d'oiseau × 1,3 en dernier recours, et la course est alors
      marquée « ≈ ». Ce n'est pas un détail de confort : sur un
      Roissy → Paris l'écart avec la vraie route se compte en euros, et
      chez nous le prix est FERME — donc opposable.

   CHAQUE NIVEAU RATTRAPE LE PRÉCÉDENT, ET C'EST TOUT L'INTÉRÊT. Trois
   serveurs indépendants qui tombent le même jour, c'est autrement moins
   probable qu'un seul. Le vol d'oiseau ne sert que si les trois sont à
   terre.

   CE QU'IL FAUT SAVOIR SUR LA CLÉ OPENROUTESERVICE. Le dépôt est PUBLIC
   et une page statique envoie forcément sa clé au navigateur : elle est
   donc lisible, ici comme dans le code servi. Et contrairement à Mapbox,
   ORS ne permet PAS de la restreindre à un domaine — c'est un jeton lié
   au compte. Si le quota se vide sans raison, c'est qu'elle a été
   reprise : il suffit d'en régénérer une sur openrouteservice.org et de
   la remplacer ici. Le site continue de fonctionner entre-temps, OSRM
   prend le relais — c'est justement à ça que servent les niveaux.

   POUR POSER LA CLÉ MAPBOX : créer un compte sur mapbox.com, copier le
   jeton public (il commence par « pk. »), le coller ci-dessous, PUIS le
   restreindre au domaine dans le tableau de bord Mapbox — les deux
   gestes, pas un seul.
   ===================================================================== */
var CLE_MAPBOX = "";

var CLE_ORS = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU3M2YyYzZmOGE2MTRlZWJiMDcyMWE4OTgzZWVjMjBlIiwiaCI6Im11cm11cjY0In0=";

/* ---- Les deux fournisseurs ------------------------------------------ */
function appeler(url){
  var ctrl = new AbortController();
  var minuteur = setTimeout(function(){ ctrl.abort(); }, 6000);
  return fetch(url, { signal:ctrl.signal })
    .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
    .catch(function(){ return null; })
    .then(function(d){ clearTimeout(minuteur); return d; });
}

var HOTEL_OSM = ["hotel","guest_house","hostel","motel","apartment","chalet"];

function categorieDuLieu(cle, valeur, type){
  var v = (valeur||"").toLowerCase(), k = (cle||"").toLowerCase();
  if(["hospital","clinic","doctors","pharmacy"].indexOf(v)>-1) return "sante";
  if(["restaurant","cafe","bar","fast_food","pub"].indexOf(v)>-1) return "restauration";
  if(HOTEL_OSM.indexOf(v)>-1) return "hotel";
  if(k==="tourism" || ["museum","attraction","viewpoint","artwork","monument","gallery"].indexOf(v)>-1) return "culture";
  if(["aerodrome","airport"].indexOf(v)>-1 || v.indexOf("airport")>-1) return "aeroport";
  if(["station","subway_entrance","halt"].indexOf(v)>-1 || k==="railway") return "gare";
  if(["school","university","college","kindergarten"].indexOf(v)>-1) return "education";
  if(["theatre","cinema","stadium","arena"].indexOf(v)>-1) return "spectacle";
  if(type==="street" || k==="highway") return "voie";
  return "adresse";
}

var ICONES = { sante:"🏥", restauration:"🍽️", hotel:"🏨", culture:"🏛️",
  aeroport:"✈️", gare:"🚉", education:"🎓", spectacle:"🎭", voie:"🛣️", adresse:"📍" };

function libellePhoton(p){
  var morceaux = [];
  var nomme = !!p.name && p.osm_key!=="highway" && p.type!=="house" && p.type!=="street";
  if(nomme) morceaux.push(p.name);
  var rue = [p.housenumber, p.street || (!nomme ? p.name : null)].filter(Boolean).join(" ");
  if(rue) morceaux.push(rue);
  var ville = [p.postcode, p.city || p.county].filter(Boolean).join(" ");
  if(ville) morceaux.push(ville); else if(p.state) morceaux.push(p.state);
  return { label:morceaux.filter(Boolean).join(", "), lieuNomme:nomme };
}

function depuisBAN(q){
  return appeler("https://api-adresse.data.gouv.fr/search/?q="+encodeURIComponent(q)+"&limit=6&autocomplete=1")
    .then(function(d){
      if(!d || !Array.isArray(d.features)) return [];
      return d.features.map(function(f){
        return { label:f.properties.label, lat:f.geometry.coordinates[1],
                 lon:f.geometry.coordinates[0], icon:"📍", lieuNomme:false };
      });
    });
}

/* limit=15 : un nom de chaîne (« ibis », « gare du nord ») renvoie beaucoup
   d'homonymes ; en demander trop peu revenait à n'en montrer aucun de bon.
   Le biais rapproche de Paris sans exclure le reste de la France. */
function depuisPhoton(q){
  return appeler("https://photon.komoot.io/api/?q="+encodeURIComponent(q)+
                 "&limit=15&lang=fr&lat=48.8566&lon=2.3522&location_bias_scale=0.4")
    .then(function(d){
      if(!d || !Array.isArray(d.features)) return [];
      return d.features.filter(function(f){
        var p = f.properties || {};
        if(p.countrycode) return p.countrycode === "FR";
        return p.country ? /france/i.test(p.country) : true;
      }).map(function(f){
        var p = f.properties, r = libellePhoton(p);
        var cat = categorieDuLieu(p.osm_key, p.osm_value, p.type);
        return { label:r.label, lat:f.geometry.coordinates[1], lon:f.geometry.coordinates[0],
                 icon:ICONES[cat] || "📍", categorie:cat, lieuNomme:r.lieuNomme,
                 /* Le type brut est conservé : « gare » couvre aussi les
                    bouches de métro, et seul ce détail les distingue. */
                 osm:(p.osm_value || "").toLowerCase() };
      }).filter(function(r){ return r.label; });
    });
}

function rad(d){ return d * Math.PI / 180; }
function volDoiseauKm(a, b){
  var R = 6371;
  var dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  var h = Math.sin(dLat/2)*Math.sin(dLat/2)
        + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)*Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}

/* Un appel qui n'aboutit pas doit ABANDONNER, pas faire attendre. Sans
   minuteur, un serveur qui accepte la connexion puis ne répond jamais
   laisse le client devant « Calcul du prix… » pendant trente secondes,
   et il s'en va. Quatre secondes chacun : au pire douze en tout avant le
   vol d'oiseau, ce qui reste tenable — et ce pire cas suppose les trois
   serveurs muets en même temps. */
function fetchLimite(url, ms){
  var ctrl = new AbortController();
  var minuteur = setTimeout(function(){ ctrl.abort(); }, ms || 4000);
  return fetch(url, { signal:ctrl.signal })
    .then(function(r){ clearTimeout(minuteur); return r; },
          function(e){ clearTimeout(minuteur); throw e; });
}

/* Mapbox et OSRM rendent la même chose sous deux habillages : une liste
   « routes », une distance en mètres, une durée en secondes. On les lit
   donc avec la même fonction — le jour où l'un des deux change de forme,
   il n'y a qu'un endroit à corriger.
   OpenRouteService, lui, répond en GeoJSON et range la même mesure
   ailleurs : d'où son lecteur à part, juste en dessous. */
function lireRoute(d, trafic){
  if(!(d && d.routes && d.routes[0])) throw new Error("route");
  return { km:d.routes[0].distance/1000,
           min:Math.round(d.routes[0].duration/60), estime:false,
           /* Vrai seulement si la durée tient compte de la circulation.
              On ne l'affiche jamais « au cas où » : annoncer un temps de
              trajet « trafic pris en compte » alors qu'il ne l'est pas
              est exactement le genre de promesse qu'un client vérifie
              une fois, et une seule. */
           trafic:!!trafic,
           /* Le tracé est pris QUAND IL EST LÀ, et son absence n'est jamais
              une erreur : elle ne coûte que la carte, jamais le prix. */
           trace:traceDepuisGeoJSON(d.routes[0].geometry) };
}

/* Les services rendent le tracé en « lon, lat » ; Leaflet le veut en
   « lat, lon ». Inversé, la course part dans l'océan Indien — le même
   piège que l'ordre des points dans l'appel à ORS, et il ne se voit pas
   davantage. */
function traceDepuisGeoJSON(g){
  if(!g || !g.coordinates || !g.coordinates.length) return null;
  var out = [];
  for(var i = 0; i < g.coordinates.length; i++){
    var c = g.coordinates[i];
    if(typeof c[0] === "number" && typeof c[1] === "number") out.push([c[1], c[0]]);
  }
  return out.length > 1 ? out : null;
}

function lireRouteORS(d){
  var s = d && d.features && d.features[0] && d.features[0].properties
          && d.features[0].properties.summary;
  /* Une réponse SANS résumé n'est pas une route de zéro kilomètre : c'est
     une réponse qu'on n'a pas su lire. La laisser passer ferait un prix
     au plancher sur un Paris → Roissy. */
  if(!s || typeof s.distance !== "number") throw new Error("route");
  /* ORS rend le tracé SANS QU'ON LE DEMANDE : il est dans la réponse
     qu'on lit déjà, et on le jetait. La carte ne coûte donc aucun appel
     supplémentaire sur le niveau qui sert aujourd'hui. */
  return { km:s.distance/1000, min:Math.round(s.duration/60), estime:false,
           trace:traceDepuisGeoJSON(d.features[0].geometry) };
}

/* ═══ LE TRAFIC — CE QUI EST POSSIBLE, ET CE QUI NE L'EST PAS ═══
   Barbaros, septembre 2026 : « elle doit prendre en compte le trafic
   actuel, temps basé sur Waze ou Google Maps ».
   — WAZE N'A PAS D'API PUBLIQUE. Elle a été fermée il y a des années ; ce
     qui reste (Waze for Cities) sert aux collectivités et rend des
     incidents, pas des temps de trajet. Aucun site ne peut s'y brancher.
   — GOOGLE MAPS EN A UNE, mais elle exige un compte de facturation, et
     ses conditions imposent d'afficher le résultat sur une carte Google —
     donc de changer aussi le fond de plan, et de payer les deux.
   — MAPBOX fait la même chose, gratuitement jusqu'à 100 000 itinéraires
     par mois, et sans imposer sa carte. C'est la voie retenue.
   Le code est écrit et éprouvé ; il ne manque que la clé, que Barbaros
   seul peut créer (« CLE_MAPBOX », plus haut). Tant qu'elle est vide, le
   site calcule comme avant, sans trafic — il ne ment simplement pas
   là-dessus.

   ON DEMANDE LE TRAFIC À L'HEURE DE LA COURSE, PAS À CELLE DU CLIC. Une
   course commandée à 23 h pour demain 8 h n'a rien à voir avec la
   circulation de 23 h. C'est « depart_at » qui le dit, et c'est ce qui
   rend la chose utile plutôt que décorative : l'heure d'arrivée annoncée
   au client devient celle d'un mardi 8 h sur l'A1, pas celle d'une nuit
   déserte. */
function departAt(date, heure){
  if(!date || !heure) return "";
  var d = new Date(date + "T" + heure);
  if(isNaN(d.getTime())) return "";
  var dans = d.getTime() - Date.now();
  /* Passé, ou trop loin : on n'envoie rien et Mapbox rend la circulation
     du moment. Une valeur hors de sa fenêtre ferait REFUSER l'appel, donc
     retomber silencieusement sur le niveau suivant — une panne invisible
     qui ne coûterait « que » la précision, c'est-à-dire justement ce
     qu'on est venu chercher. */
  if(dans < 0 || dans > 7 * 24 * 3600 * 1000) return "";
  return date + "T" + heure;
}

function itineraire(a, b, quand){
  var couple = a.lon+","+a.lat+";"+b.lon+","+b.lat;

  /* ON RÉCLAME MAINTENANT LE TRACÉ, en version SIMPLIFIÉE. C'était
     « overview=false » — délibérément, tant que le site n'affichait aucune
     carte : réclamer la géométrie faisait grossir la réponse pour rien. La
     raison est tombée le jour où la carte est arrivée. « simplified »
     plutôt que « full » : à l'échelle d'un écran de téléphone, le tracé
     complet pèse dix fois plus pour un trait identique à l'œil. */
  function parOSRM(){
    return fetchLimite("https://router.project-osrm.org/route/v1/driving/"
                       + couple + "?overview=simplified&geometries=geojson")
      .then(function(r){ if(!r.ok) throw new Error("route"); return r.json(); })
      .then(lireRoute);
  }
  /* « driving-traffic » ET NON « driving » : c'est le seul des deux
     profils qui regarde la circulation. Le nom se ressemble, le résultat
     non — sur un Roissy → Paris un mardi à 8 h, l'écart se compte en
     dizaines de minutes, donc en clients qui ratent un vol. */
  function parMapbox(){
    var url = "https://api.mapbox.com/directions/v5/mapbox/driving-traffic/"
            + couple + "?overview=simplified&geometries=geojson&access_token="
            + encodeURIComponent(CLE_MAPBOX);
    var at = quand ? departAt(quand.date, quand.heure) : "";
    if(at) url += "&depart_at=" + encodeURIComponent(at);
    return fetchLimite(url)
      .then(function(r){ if(!r.ok) throw new Error("route"); return r.json(); })
      .then(function(d){ return lireRoute(d, true); });
  }
  /* ORS prend ses points en deux paramètres séparés, et « lon,lat » —
     l'ordre inverse de celui qu'on écrit d'habitude. Une inversion ici
     enverrait la course dans l'océan Indien sans le moindre message. */
  function parORS(){
    return fetchLimite("https://api.openrouteservice.org/v2/directions/driving-car"
                       + "?api_key=" + encodeURIComponent(CLE_ORS)
                       + "&start=" + a.lon + "," + a.lat
                       + "&end="   + b.lon + "," + b.lat)
      .then(function(r){ if(!r.ok) throw new Error("route"); return r.json(); })
      .then(lireRouteORS);
  }

  /* On empile les niveaux disponibles, puis on les enchaîne : chacun
     rattrape celui d'avant. Écrit comme une liste plutôt qu'en cascade
     de « ? : » imbriqués — le jour où un service s'ajoute ou disparaît,
     il y a une ligne à changer, pas une condition à démêler. */
  var niveaux = [];
  if(CLE_MAPBOX) niveaux.push(parMapbox);
  if(CLE_ORS)    niveaux.push(parORS);
  niveaux.push(parOSRM);

  var chaine = niveaux[0]();
  for(var i=1; i<niveaux.length; i++) chaine = chaine.catch(niveaux[i]);

  return chaine.catch(function(){
    var km = volDoiseauKm(a, b) * 1.3;
    return { km:km, min:Math.round(km / 30 * 60), estime:true };
  });
}

/* L'ARRONDI DE BARBAROS : à la dizaine, et le 5 pile descend.
   45 € → 40 €, 46 € → 50 €. C'est SA règle, pas l'arrondi de l'école, et
   la différence n'est pas un détail : sur un 5 pile, l'arrondi ordinaire
   monterait et le client paierait 10 € de plus que ce qui lui a été
   annoncé au téléphone. On compare donc le reste à 5 avec un « > », pas
   un « >= ».
   On passe par une division entière plutôt que par un modulo : « 102,06 %
   10 » rend 2,0600000000000023 en virgule flottante, et le prix affiché
   serait 100,000000001 €. Ici le résultat est toujours une dizaine
   exacte. */
function arrondiDizaine(p){
  var bas = Math.floor(p / 10) * 10;
  return (p - bas > 5) ? bas + 10 : bas;
}

/* L'ORDRE COMPTE ENCORE, MÊME À DEUX OPÉRATIONS.
   1. le kilométrage, 2. l'arrondi, 3. le plancher. Le plancher est le
   DERNIER mot : c'est un montant plancher, pas une base de calcul, et
   l'arrondir ensuite ferait payer 30 € une course annoncée à 30 €… ou
   40 selon le sens de l'arrondi.
   LA MAJORATION A DISPARU DE CETTE FONCTION (septembre 2026) — voir le
   commentaire plus haut. Le paramètre n'est plus accepté du tout, et
   c'est délibéré : laissé en place mais ignoré, il aurait laissé croire
   à un appelant qu'il majore quelque chose. */
function prix(gamme, km){
  return Math.max(arrondiDizaine(gamme.parKm * km), gamme.mini);
}
  /* ═══ RÉSOUDRE UN TEXTE EN UN LIEU ═══
     Admin v2 n'a pas d'autocomplétion : il a un champ et un bouton. On
     interroge donc les deux mêmes services que le site, dans le même
     ordre, et on rend le PREMIER résultat plausible.
     ON NE DÉCIDE PAS À SA PLACE POUR AUTANT : l'appelant doit réécrire le
     libellé retenu dans son champ. Si ce n'est pas le bon Ibis, le
     kilométrage est faux et le prix avec — il faut qu'il le VOIE. */
  function lieu(texte){
    var q = String(texte || "").trim();
    if(q.length < 2) return Promise.resolve(null);
    /* La BAN fait autorité sur une adresse postale, Photon sur un nom de
       lieu. On garde l'ordre du site : un texte qui commence par un
       chiffre est une adresse. */
    var adresse = /^\s*\d/.test(q);
    return Promise.all([depuisBAN(q), depuisPhoton(q)]).then(function(r){
      var ban = r[0] || [], photon = r[1] || [];
      var liste = adresse ? ban.concat(photon) : photon.concat(ban);
      return liste.length ? liste[0] : null;
    });
  }

  racine.ELA_ROUTE = {
    itineraire: itineraire,
    lieu: lieu,
    prix: prix,
    arrondiDizaine: arrondiDizaine,
    volDoiseauKm: volDoiseauKm,
    departAt: departAt,
    depuisBAN: depuisBAN,
    depuisPhoton: depuisPhoton,
    categorieDuLieu: categorieDuLieu,
    libellePhoton: libellePhoton,
    appeler: appeler,
    ICONES: ICONES,
    HOTEL_OSM: HOTEL_OSM,
    /* Les clés sont LUES, jamais recopiées : une suite qui les remplace
       doit toucher ce fichier et lui seul. */
    cles: function(){ return { mapbox: CLE_MAPBOX, ors: CLE_ORS }; }
  };
})(typeof window !== "undefined" ? window : globalThis);
