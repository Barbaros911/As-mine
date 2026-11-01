/* =====================================================================
   PRIX.JS — LES RÈGLES QUI FONT UN PRIX À PARTIR D'UN LIEU
   ---------------------------------------------------------------------
   Troisième extraction du plan d'architecture (1er novembre 2026), après
   textes.js et config.js. L'ARITHMÉTIQUE du prix (tranches, arrondi à la
   dizaine, plancher) vit depuis septembre dans itineraire-partage.js ;
   ce qui restait dans le moteur d'index.html, ce sont les RÈGLES : Paris,
   c'est la commune ; un forfait vaut entre Paris et une zone mesurée ;
   l'accueil ne s'ajoute qu'au départ d'un aéroport ou d'une grande gare ;
   la grille du serveur n'entre que par une seule porte ; la destination
   du flyer d'un hôtel se reconnaît par le lieu, jamais par un mot.
   Elles sont ici telles quelles, déplacées à l'identique.

   CE FICHIER NE PORTE AUCUN ÉTAT : il ne sait pas quels tarifs sont en
   vigueur. Le moteur les lui PASSE — « tarifs » = { grille, forfaits,
   accueil }, le repli de config.js remplacé par le serveur s'il a répondu
   (« chargerTarifsServeur », « appliquerGrille », dans la page). C'est ce
   qui le rend déterministe et éprouvable sans navigateur (test-prix.mjs,
   valeurs écrites à la main), et c'est ce qui garde le serveur comme
   seule vérité : rien ici ne tient une grille.
   NI DOM, NI RÉSEAU, NI STOCKAGE. Chargé après config.js et
   itineraire-partage.js, avant le moteur, qui refuse de démarrer sans
   lui ; gardé par le service worker (SHELL de sw.js) ; les pages dérivées
   (admin, réception, démo) le trouvent par leur <base href="/">.
   ===================================================================== */
(function(racine){
  "use strict";
  if(!racine.ELA_CONFIG) throw new Error("config.js n'est pas chargé");
  if(!racine.ELA_ROUTE) throw new Error("itineraire-partage.js n'est pas chargé");
  var C = racine.ELA_CONFIG;
  var AEROPORTS = C.AEROPORTS, TERMINAL_EN = C.TERMINAL_EN;
  var RAYON_AEROPORT_KM = C.RAYON_AEROPORT_KM;
  var LE_BOURGET = C.LE_BOURGET, RAYON_AEROPORT_ACCUEIL_KM = C.RAYON_AEROPORT_ACCUEIL_KM,
      RAYON_GARE_KM = C.RAYON_GARE_KM, GRANDES_GARES = C.GRANDES_GARES;
  var volDoiseauKm = racine.ELA_ROUTE.volDoiseauKm, prixTranches = racine.ELA_ROUTE.prixTranches;

  /* ═══ RECONNAÎTRE LE LIEU DONT LE PRIX DÉPEND ═══ */
  /* « œ » et « æ » ne sont PAS des lettres accentuées : NFD ne les défait
     pas. Sans ces deux remplacements, « coeur » tapé ne retrouvait jamais
     « Sacré-Cœur », et un bar écrit « Coeur » passait devant la basilique.
     Sert aussi à la recherche d'adresse du moteur, qui l'emprunte ici. */
  function sansAccents(s){
    return (s||"").toLowerCase().replace(/œ/g,"oe").replace(/æ/g,"ae")
             .normalize("NFD").replace(/[̀-ͯ]/g,"").trim();
  }
  /* ---- Reconnaître une GARE, et seulement une vraie ---------------------
     ON NE LIT PAS LE MOT « GARE » DANS L'ADRESSE. « 12 rue de la Gare,
     Melun » n'est pas une gare, et le champ « numéro de train » s'ouvrirait
     chez des gens qui prennent la voiture en bas de chez eux. On lit le
     TYPE du lieu, comme on lit déjà le terminal pour les aéroports.
     Une bouche de métro ou un arrêt de tram tombent dans la même catégorie
     « gare » pour l'icône, mais on n'y prend pas de train : ils sont
     écartés ici, sinon on demanderait un numéro qui n'existe pas. */
  var PAS_UN_TRAIN = ["subway_entrance","tram_stop","bus_stop","platform"];
  function estGare(lieu){
    return !!lieu && lieu.categorie === "gare"
           && PAS_UN_TRAIN.indexOf(lieu.osm || "") === -1;
  }
  /* Le terminal est cherché par son NOM (« Terminal 2E », « Orly 3 »),
     identique dans les deux langues ; seul « Terminal unique » a une forme
     anglaise, reconnue aussi. */
  function terminalDuLibelle(label){
    if(!label) return null;
    var trouve = null;
    Object.keys(AEROPORTS).forEach(function(cle){
      Object.keys(AEROPORTS[cle].terminaux).forEach(function(t){
        if(!trouve && (label.indexOf(t) !== -1
                       || (TERMINAL_EN[t] && label.indexOf(TERMINAL_EN[t]) !== -1))) trouve = t;
      });
    });
    return trouve;
  }

  /* ═══ LE FORFAIT PARIS ═══ */
  /* PARIS, C'EST LA COMMUNE, LUE DANS LES CHAMPS DE LA SOURCE (code postal
     75…, ville « Paris ») et jamais dans le libellé. Un rayon autour du
     centre (celui du flyer, 7 km) attraperait Boulogne, Neuilly ou
     Montreuil : Barbaros a dit « les 20 arrondissements ». Le contrôle de
     distance écarte une donnée aberrante (une « Paris » hors de France n'a
     de toute façon pas « FR »). Un lieu sans commune connue (terminal, saisie
     à la main) n'est pas Paris : il paie la tranche, jamais un forfait
     deviné. */
  var PARIS_CENTRE = { lat:48.8566, lon:2.3522 };
  function estParis(l){
    if(!l || typeof l.lat !== "number" || typeof l.lon !== "number") return false;
    if((l.pays || "FR") !== "FR") return false;
    var commune = /^75\d{3}$/.test(String(l.codePostal || "")) || sansAccents(l.ville) === "paris";
    return commune && volDoiseauKm(l, PARIS_CENTRE) <= 12;
  }
  /* Un aéroport se reconnaît à ses terminaux (« AEROPORTS », même rayon que
     le flyer), Disneyland à un point et un rayon — les mêmes que la
     destination « Disney » du flyer. On MESURE, jamais un mot.
     « forfaits » est la liste en vigueur (FORFAITS_PUBLICS du moteur) : la
     zone rendue porte son prix par gamme. */
  function zoneForfait(forfaits, l){
    if(!l || typeof l.lat !== "number" || typeof l.lon !== "number") return null;
    var z = null;
    forfaits.forEach(function(f){
      if(z) return;
      if(f.aeroport){
        var t = AEROPORTS[f.aeroport].terminaux;
        Object.keys(t).forEach(function(k){
          if(!z && volDoiseauKm(l, { lat:t[k][0], lon:t[k][1] }) <= RAYON_AEROPORT_KM) z = f;
        });
      } else if(volDoiseauKm(l, f) <= f.rayonKm) z = f;
    });
    return z;
  }
  function forfaitEntre(forfaits, a, b){
    if(estParis(a)) return zoneForfait(forfaits, b);
    if(estParis(b)) return zoneForfait(forfaits, a);
    return null;
  }

  /* ═══ L'ACCUEIL ═══
     L'ACCUEIL SUIT LE DÉPART, comme l'ancienne pancarte : on attend
     quelqu'un qui ARRIVE. Quatre aéroports — les terminaux de CDG, Orly et
     Beauvais, et Le Bourget, qui n'a pas de terminal dans la liste (même
     point que la destination du flyer) — et neuf grandes gares, celles des
     trains grandes lignes. Un lieu doit être CHOISI comme aéroport ou comme
     gare : un hôtel de Roissypôle, à un kilomètre d'un terminal, n'est pas
     une sortie des arrivées, et une gare de RER n'est pas une grande gare.
     Coordonnées des gares : jeu de données ouvert trainline-eu/stations
     (ODbL), relevé le 23/10/2026. */
  function departAeroport(l){
    if(!l) return false;
    if(terminalDuLibelle(l.label)) return true;
    if(l.categorie !== "aeroport" || typeof l.lat !== "number") return false;
    var points = [LE_BOURGET];
    Object.keys(AEROPORTS).forEach(function(k){
      var t = AEROPORTS[k].terminaux;
      Object.keys(t).forEach(function(n){ points.push({ lat:t[n][0], lon:t[n][1] }); });
    });
    return points.some(function(p){ return volDoiseauKm(l, p) <= RAYON_AEROPORT_ACCUEIL_KM; });
  }
  function departGrandeGare(l){
    return estGare(l) && typeof l.lat === "number"
           && GRANDES_GARES.some(function(g){ return volDoiseauKm(l, g) <= RAYON_GARE_KM; });
  }
  function accueilAuDepart(l){ return departAeroport(l) || departGrandeGare(l); }

  /* ═══ LE PRIX DU SITE PUBLIC, UNE SEULE FONCTION ═══
     Celle du client ET celle de « Saisir par téléphone » : l'admin annonce
     le prix que le site aurait donné, au centime. Dans cet ordre : le
     forfait Paris s'il y en a un, sinon la tranche ; puis l'accueil, ajouté
     EN DERNIER, après l'arrondi — jamais avant. */
  function prixSitePublic(tarifs, g, km, depart, arrivee){
    var f = forfaitEntre(tarifs.forfaits, depart, arrivee);
    var base = (f && typeof f.prix[g.cle] === "number") ? f.prix[g.cle]
             : prixTranches(tarifs.grille[g.cle], km);
    return base + (accueilAuDepart(depart) ? tarifs.accueil : 0);
  }

  /* ═══ LA GRILLE DU SERVEUR, ET SA SEULE PORTE ═══
     Format de la ligne « grille_publique » (centimes, entiers) :
       { "tranches_km":[12,22,27,32,42],
         "berline":{ "tranches_centimes":[3500,5000,6000,7000,9000], "au_dela_km_centimes":250 },
         "van":{ … }, "forfaits":{ "orly":{ "berline":5500, "van":8000 }, … },
         "accueil_centimes":1000 }
     « grilleValide » rend la grille du site, ou null si une seule valeur
     cloche : des limites qui montent, des prix qui ne descendent jamais
     d'une tranche à la suivante, un prix au km au-delà, chaque gamme et
     chaque forfait présents. Une grille fausse appliquée à moitié serait
     un prix inventé ; le moteur garde alors le repli, en entier. La même
     porte sert à l'admin AVANT d'envoyer. « gammes » et « forfaits » disent
     ce qui DOIT être présent : les gammes vendues, les zones de forfait. */
  function centimes(n, max){
    return (typeof n === "number" && isFinite(n) && n > 0 && n <= max && Math.round(n) === n) ? n / 100 : null;
  }
  function grilleValide(v, gammes, forfaits){
    if(!v || typeof v !== "object" || Array.isArray(v)) return null;
    var lim = v.tranches_km;
    if(!Array.isArray(lim) || lim.length < 1 || lim.length > 8) return null;
    for(var i = 0; i < lim.length; i++)
      if(!(typeof lim[i] === "number" && lim[i] > 0 && lim[i] <= 500 && (i === 0 || lim[i] > lim[i-1]))) return null;
    var sortie = { grille:{}, forfaits:{}, accueil:null };
    var ok = gammes.every(function(g){
      var o = v[g.cle];
      if(!o || !Array.isArray(o.tranches_centimes) || o.tranches_centimes.length !== lim.length) return false;
      var tranches = [];
      for(var j = 0; j < lim.length; j++){
        var p = centimes(o.tranches_centimes[j], 1000000);
        if(p === null || (j > 0 && p < tranches[j-1].prix)) return false;
        tranches.push({ km:lim[j], prix:p });
      }
      var auDela = centimes(o.au_dela_km_centimes, 2000);
      if(auDela === null) return false;
      sortie.grille[g.cle] = { tranches:tranches, auDela:auDela };
      return true;
    });
    if(!ok) return null;
    var f = v.forfaits || {};
    ok = forfaits.every(function(z){
      var o = f[z.cle];
      if(!o) return false;
      sortie.forfaits[z.cle] = {};
      return gammes.every(function(g){
        var p = centimes(o[g.cle], 1000000);
        if(p === null) return false;
        sortie.forfaits[z.cle][g.cle] = p;
        return true;
      });
    });
    if(!ok) return null;
    var acc = v.accueil_centimes;
    if(!(typeof acc === "number" && acc >= 0 && acc <= 10000 && Math.round(acc) === acc)) return null;
    sortie.accueil = acc / 100;
    return sortie;
  }
  /* L'inverse, pour l'admin : les tarifs en vigueur dans le format du serveur. */
  function grilleEnCentimes(tarifs, gammes){
    var v = { tranches_km: tarifs.grille.berline.tranches.map(function(t){ return t.km; }),
              forfaits:{}, accueil_centimes: Math.round(tarifs.accueil * 100) };
    gammes.forEach(function(g){
      var o = tarifs.grille[g.cle];
      v[g.cle] = { tranches_centimes: o.tranches.map(function(t){ return Math.round(t.prix * 100); }),
                   au_dela_km_centimes: Math.round(o.auDela * 100) };
    });
    tarifs.forfaits.forEach(function(z){
      v.forfaits[z.cle] = {};
      gammes.forEach(function(g){ v.forfaits[z.cle][g.cle] = Math.round(z.prix[g.cle] * 100); });
    });
    return v;
  }

  /* ═══ LA DESTINATION DU FLYER D'UN HÔTEL SUIT LE LIEU, PAS LE MENU ═══
     Septembre 2026, à sa demande : « peu importe l'adresse, ça doit être le
     même prix que le flyer », et « Autre destination » aussi, si l'adresse
     tapée tombe dans l'une des destinations du flyer. Un client qui écrit
     « Orly 4 » ou « Disneyland Hotel » dans « Autre destination » va bien
     à Orly ou à Disney : le facturer au kilomètre, c'est lui annoncer un
     autre prix que le papier posé devant lui sur le comptoir.
     ON MESURE UNE DISTANCE, pas un mot : « Orly » dans un libellé peut
     être la rue d'Orly à Montreuil. Un aéroport se reconnaît à moins de
     RAYON_AEROPORT_KM d'un de ses terminaux (la table AEROPORTS, déjà tenue
     pour la recherche d'adresse) ; les autres à leur « rayonKm ». Les zones
     ne se recouvrent pas — la plus proche l'une de l'autre, Paris et Le
     Bourget, sont à 11 km. La fiche de l'hôtel est un PARAMÈTRE : ce
     fichier ne nomme aucun partenaire. */
  function destDuPoint(hotel, pt){
    if(!hotel || !pt) return null;
    var trouve = null;
    hotel.destinations.forEach(function(d){
      if(trouve) return;
      if(d.aeroport){
        var t = AEROPORTS[d.aeroport].terminaux;
        Object.keys(t).forEach(function(k){
          if(!trouve && volDoiseauKm(pt, {lat:t[k][0], lon:t[k][1]}) <= RAYON_AEROPORT_KM) trouve = d;
        });
      } else if(d.rayonKm && volDoiseauKm(pt, d) <= d.rayonKm) trouve = d;
    });
    return trouve;
  }

  racine.ELA_PRIX = {
    sansAccents: sansAccents,
    estGare: estGare,
    terminalDuLibelle: terminalDuLibelle,
    estParis: estParis,
    zoneForfait: zoneForfait,
    forfaitEntre: forfaitEntre,
    departAeroport: departAeroport,
    departGrandeGare: departGrandeGare,
    accueilAuDepart: accueilAuDepart,
    prixSitePublic: prixSitePublic,
    grilleValide: grilleValide,
    grilleEnCentimes: grilleEnCentimes,
    destDuPoint: destDuPoint
  };
})(typeof window !== "undefined" ? window : globalThis);
