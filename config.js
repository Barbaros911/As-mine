/* =====================================================================
   CONFIG.JS — LES RÉGLAGES DU TUNNEL ET LA GRILLE DE REPLI, EN DONNÉES
   ---------------------------------------------------------------------
   Deuxième extraction du plan d'architecture (31 octobre 2026), après
   textes.js : ces constantes vivaient éparpillées dans le moteur
   d'index.html. Elles sont ici telles quelles, dans l'ordre où le moteur
   les déclarait ; le moteur les lit (« var GAMMES = window.ELA_CONFIG.GAMMES »)
   au même endroit qu'avant, et refuse de démarrer sans ce fichier.
   CE QUI EST ICI N'EST QUE LE REPLI DU PRIX : le serveur est la vérité
   (« chargerTarifsServeur » remplace la grille, les forfaits et l'accueil
   au chargement ; Barbaros les règle dans Réglages → Tarifs). test-doc.mjs
   compare ces valeurs aux tableaux de CLAUDE.md, verifier-tarif-hotel.mjs
   à la source tarifaire du serveur, test-grille-publique.mjs les fait
   calculer par le site.
   CE QUI N'EST PAS ICI, ET POURQUOI : la fiche des hôtels (HOTELS) vit
   dans hotels.js (2/11/2026) ; les clés du serveur (SUPABASE_URL,
   SUPABASE_CLE, CLE_VAPID) restent dans le moteur, parce que la démo des
   professionnels les réécrit par chaîne de caractères. Elles sortiront
   dans leur propre PR, avec ce script.
   CE FICHIER NE CONTIENT QUE DES DONNÉES : ni fonction, ni DOM, ni réseau,
   ni stockage (test-config.mjs). Chargé après textes.js et avant le
   moteur ; gardé par le service worker (SHELL de sw.js) ; les pages
   dérivées (admin, réception, démo) le trouvent par leur <base href="/">.
   ===================================================================== */
(function(racine){
  "use strict";
  var AEROPORTS = {
    cdg: { nom:"Aéroport Roissy-Charles de Gaulle", nomEn:"Paris-Charles de Gaulle Airport",
      mots:["cdg","roissy","charles","gaulle"],
      terminaux:{ "Terminal 1":[49.0067,2.5479], "Terminal 2A":[49.0053,2.5695],
        "Terminal 2B":[49.0037,2.5695], "Terminal 2C":[49.0025,2.5715],
        "Terminal 2D":[49.0013,2.5715], "Terminal 2E":[48.9998,2.5740],
        "Terminal 2F":[48.9985,2.5740], "Terminal 2G":[48.9970,2.5760],
        "Terminal 3":[49.0102,2.5450] } },
    orly: { nom:"Aéroport de Paris-Orly", nomEn:"Paris-Orly Airport", mots:["orly"],
      terminaux:{ "Orly 1":[48.7233,2.3794], "Orly 2":[48.7228,2.3805],
        "Orly 3":[48.7218,2.3815], "Orly 4":[48.7289,2.3592] } },
    beauvais: { nom:"Aéroport de Beauvais-Tillé", nomEn:"Paris-Beauvais Airport", mots:["beauvais","tille"],
      terminaux:{ "Terminal unique":[49.4544,2.1128] } }
  };
  var TERMINAL_EN = { "Terminal unique":"Single terminal" };
  var RAYON_AEROPORT_KM = 2;
  var PRECISION_GEO_M = 100;
  var GAMMES = [
    { cle:"berline", nom:"Berline", parKm:2.90, mini:35, places:4 },
    { cle:"van",     nom:"Van",     parKm:4.70, mini:50, places:7 }
  ];
  var GRILLE_PUBLIQUE = {
    berline: { tranches:[{km:12,prix:35},{km:22,prix:50},{km:27,prix:60},{km:32,prix:70},{km:42,prix:90}], auDela:2.50 },
    van:     { tranches:[{km:12,prix:50},{km:22,prix:80},{km:27,prix:95},{km:32,prix:110},{km:42,prix:130}], auDela:3.80 }
  };
  var FORFAITS_PUBLICS = [
    { cle:"orly",   nom:"Orly",             aeroport:"orly", prix:{ berline:55, van:80 } },
    { cle:"cdg",    nom:"Roissy-CDG",       aeroport:"cdg",  prix:{ berline:70, van:110 } },
    { cle:"disney", nom:"Disneyland Paris", lat:48.8722, lon:2.7758, rayonKm:3,
      prix:{ berline:90, van:130 } }
  ];
  var ACCUEIL_EUR = 10;
  var LE_BOURGET = { lat:48.9694, lon:2.4414 };
  var RAYON_AEROPORT_ACCUEIL_KM = 3, RAYON_GARE_KM = 0.4;
  var GRANDES_GARES = [
    { nom:"Paris Gare du Nord",             lat:48.880185, lon:2.355151 },
    { nom:"Paris Gare de l'Est",            lat:48.876742, lon:2.358424 },
    { nom:"Paris Gare de Lyon",             lat:48.844888, lon:2.373520 },
    { nom:"Paris Austerlitz",               lat:48.842285, lon:2.364891 },
    { nom:"Paris Montparnasse",             lat:48.841172, lon:2.320514 },
    { nom:"Paris Saint-Lazare",             lat:48.876242, lon:2.325331 },
    { nom:"Paris Bercy",                    lat:48.839170, lon:2.382780 },
    { nom:"Marne-la-Vallée–Chessy",         lat:48.869856, lon:2.782720 },
    { nom:"Massy TGV",                      lat:48.725758, lon:2.261254 }
  ];
  var OPTION_PANCARTE_EUR = 10;
  var MARGE_DUREE_MIN = 5, MARGE_DUREE_MAX = 10;
  var PAS_MINUTES = 5;
  var JOURS_ALERTE = 30;
  racine.ELA_CONFIG = {
    AEROPORTS: AEROPORTS,
    TERMINAL_EN: TERMINAL_EN,
    RAYON_AEROPORT_KM: RAYON_AEROPORT_KM,
    PRECISION_GEO_M: PRECISION_GEO_M,
    GAMMES: GAMMES,
    GRILLE_PUBLIQUE: GRILLE_PUBLIQUE,
    FORFAITS_PUBLICS: FORFAITS_PUBLICS,
    ACCUEIL_EUR: ACCUEIL_EUR,
    LE_BOURGET: LE_BOURGET,
    RAYON_AEROPORT_ACCUEIL_KM: RAYON_AEROPORT_ACCUEIL_KM,
    RAYON_GARE_KM: RAYON_GARE_KM,
    GRANDES_GARES: GRANDES_GARES,
    OPTION_PANCARTE_EUR: OPTION_PANCARTE_EUR,
    MARGE_DUREE_MIN: MARGE_DUREE_MIN,
    MARGE_DUREE_MAX: MARGE_DUREE_MAX,
    PAS_MINUTES: PAS_MINUTES,
    JOURS_ALERTE: JOURS_ALERTE
  };
})(typeof window !== "undefined" ? window : globalThis);
