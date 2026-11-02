/* =====================================================================
   LIEUX.JS — RECONNAÎTRE UN LIEU DANS LA SAISIE, CLASSER LES RÉPONSES
   ---------------------------------------------------------------------
   Quatrième extraction du plan d'architecture (2 novembre 2026), après
   textes.js, config.js et prix.js. La recherche d'adresse du moteur
   d'index.html mêlait deux choses : parler aux services (la Base Adresse
   Nationale, Photon) et dessiner la liste sous le champ — ça reste dans
   la page — et DÉCIDER : quel lieu structuré on garde d'un choix, quels
   terminaux une saisie désigne (« roisy », « charle de gaule »), ce qui
   est un hôtel, quelle note vaut chaque réponse, lesquelles sont le même
   lieu, et dans quel ordre le client les voit. C'est cette décision qui
   est ici, déplacée à l'identique : elle a changé six fois en un mois
   (28/09, 30/09, 4/10, 24/10, memoire/recherche-adresse.md) et ne se
   jugeait qu'au navigateur. test-lieux.mjs l'éprouve en une seconde,
   valeurs écrites à la main.

   CE FICHIER NE PORTE AUCUN ÉTAT : la langue en vigueur (LANGUE, dans la
   page) lui est PASSÉE ; l'assembleur reçoit la saisie, les réponses des
   services et les terminaux reconnus. NI DOM, NI RÉSEAU, NI STOCKAGE, NI
   HORLOGE. Il emprunte « sansAccents » à prix.js (« Paris » s'y juge sur
   la ville) et « volDoiseauKm » à itineraire-partage.js. Chargé après
   eux, avant le moteur, qui refuse de démarrer sans lui ; gardé par le
   service worker (SHELL de sw.js) ; les pages dérivées (admin, réception,
   démo) le trouvent par leur <base href="/">.
   ===================================================================== */
(function(racine){
  "use strict";
  if(!racine.ELA_CONFIG) throw new Error("config.js n'est pas chargé");
  if(!racine.ELA_ROUTE) throw new Error("itineraire-partage.js n'est pas chargé");
  if(!racine.ELA_PRIX) throw new Error("prix.js n'est pas chargé");
  /* La normalisation vit dans prix.js (« Paris » s'y juge sur la ville) ;
     les lieux l'empruntent. */
  var sansAccents = racine.ELA_PRIX.sansAccents;

  /* ═══ LE LIEU STRUCTURÉ (4 octobre 2026) ═══
     Une course n'était que du texte : « depart », « arrivee ». Les
     coordonnées du choix servaient au prix puis disparaissaient — le
     serveur jetait même « departPos ». On garde désormais, à côté des
     anciens champs (qui restent : « Coller une demande », le message
     WhatsApp, le bon et la réception les lisent), un objet par bout du
     trajet : ce qui a été CHOISI, d'où il vient, et où il est.
     « provider » dit la source : « ban », « photon », ou « elatransfer »
     pour nos propres données (terminaux, hôtels partenaires). Le texte et
     les coordonnées viennent du MÊME choix : c'est la règle qui protège le
     prix, et elle tient parce qu'on ne fabrique ce lieu qu'ici, depuis un
     élément retenu dans une liste. */
  function lieuStructure(it){
    if(!it || typeof it.lat !== "number" || typeof it.lon !== "number"
       || !isFinite(it.lat) || !isFinite(it.lon)) return null;
    var nom = it.nom || (it.lieuNomme ? String(it.label || "").split(/,| — /)[0] : "");
    return { nom:String(nom || "").slice(0, 160), adresse:String(it.label || "").slice(0, 300),
             latitude:Math.round(it.lat*1e6)/1e6, longitude:Math.round(it.lon*1e6)/1e6,
             provider:it.source || "elatransfer", providerId:String(it.sourceId || "").slice(0, 120),
             categorie:it.categorie || "adresse" };
  }

  /* ---- Reconnaître un hôtel -------------------------------------------
     Deux voies, parce qu'une seule ne suffit pas : la catégorie
     OpenStreetMap quand elle existe, et le libellé lui-même — la Base
     Adresse Nationale ne renvoie que du texte, sans catégorie. */
  var HOTEL_MOTS = ["hotel","hostel","auberge","residence","ibis","novotel","mercure",
    "pullman","sofitel","hyatt","marriott","hilton","radisson","best western",
    "campanile","kyriad","premiere classe","citadines","adagio","aparthotel",
    "appart hotel","motel","b&b hotel"];
  function estHotel(lieu){
    if(!lieu) return false;
    if(lieu.categorie === "hotel") return true;
    var l = sansAccents(lieu.label || "");
    return HOTEL_MOTS.some(function(m){ return l.indexOf(sansAccents(m)) !== -1; });
  }


  /* ---- Les terminaux d'aéroport ---------------------------------------
     Le terminal est écrit EN PREMIER dans le libellé : neuf lignes
     commençant toutes par « Aéroport Roissy-Charles de… » se ressemblent
     une fois tronquées, et le client ne peut plus choisir le sien. */
  var AEROPORTS = racine.ELA_CONFIG.AEROPORTS;
  /* LE LIBELLÉ D'UN TERMINAL SUIT LA LANGUE DU CLIENT (audit des quatre
     prompts, 16 octobre 2026). Le voyageur venu de /en/ lisait
     « Terminal 2E — Aéroport Roissy-Charles de Gaulle » dans un moteur
     anglais. Photon rend déjà ses lieux dans la langue du client : un
     terminal fait pareil. Ce que lisent les autres parties du site ne
     change pas — « terminalDuLibelle » ne cherche que le NOM DU TERMINAL
     (« Terminal 2E », « Orly 3 »), identique dans les deux langues ; seul
     « Terminal unique » a une forme anglaise, qu'il reconnaît aussi. Les
     noms anglais sont ceux des pages /en/. */
  var TERMINAL_EN = racine.ELA_CONFIG.TERMINAL_EN;
  function libelleTerminal(cle, t, langue){
    var ap = AEROPORTS[cle];
    if(langue === "en") return (TERMINAL_EN[t] || t) + " — " + (ap.nomEn || ap.nom);
    return t + " — " + ap.nom;
  }
  /* Un mot ENTIER, jamais un début de mot : « ro » déclencherait Roissy
     sur « Rouen », qui est à 112 km et hors zone. */
  /* UNE FAUTE DE FRAPPE N'ÉTEINT PLUS LES TERMINAUX (4 octobre 2026) :
     « roisy », « charle de gaule », « beauvai ». Seulement sur les clés de
     six lettres et plus, et à une lettre près : « tille » (cinq lettres)
     n'est pas concernée, sinon « Tilly », dans les Yvelines, ferait
     proposer Beauvais. */
  function cleProche(m, cle){
    return cle.length >= 6 && m.length >= 5 && distanceEdition(m, cle, 1) <= 1;
  }
  function terminauxPourSaisie(q, langue){
    var n = sansAccents(q);
    if(!n) return [];
    var mots = n.split(/[^a-z0-9]+/).filter(Boolean);
    var sortie = [];
    Object.keys(AEROPORTS).forEach(function(cle){
      var ap = AEROPORTS[cle], clefs = ap.mots.map(sansAccents);
      var touche = mots.some(function(m){
                     return clefs.indexOf(m)>-1 || clefs.some(function(k){ return cleProche(m, k); });
                   }) || clefs.indexOf(n)>-1;
      if(!touche) return;
      Object.keys(ap.terminaux).forEach(function(t){
        var p = ap.terminaux[t];
        sortie.push({ label:libelleTerminal(cle, t, langue), lat:p[0], lon:p[1],
                      icon:"✈️", categorie:"aeroport", lieuNomme:true,
                      source:"elatransfer", sourceId:"aeroport:"+cle+":"+t });
      });
    });
    return sortie;
  }

  /* ---- Trier et dédoublonner ------------------------------------------
     Le client écrit « hôtel ibis bercy ». Les mots passe-partout ne
     figurent presque jamais dans le nom réel : on relance donc sans eux,
     et un résultat qui porte un mot distinctif passe devant. */
  var MOTS_COURANTS = ["hotel","hotels","motel","auberge","residence","restaurant",
    "resto","brasserie","cafe","bar","pub","gare","station","aeroport","airport",
    "hopital","clinique","pharmacie","musee","cinema","theatre","stade","ecole",
    "universite","mairie","centre","commercial","le","la","les","l","un","une",
    "du","de","des","d","au","aux","chez","the","paris"];
  function variantes(q){
    var liste = [q.trim()];
    var mots = sansAccents(q).split(/[^a-z0-9]+/).filter(Boolean);
    var utiles = mots.filter(function(m){ return MOTS_COURANTS.indexOf(m) === -1; });
    if(utiles.length && utiles.length < mots.length) liste.push(utiles.join(" "));
    return liste;
  }
  /* MÊME CENTRE ET MÊME RAYON QUE « LA ZONE DESSERVIE » plus bas dans ce
     fichier (CENTRE_ZONE / RAYON_ZONE_KM) — recopiés ici, pas partagés :
     Photon, dans itineraire-partage.js, fait déjà de même pour son propre
     biais. Trois endroits qui utilisent le centre de Paris, c'est un fait
     géographique stable, pas une grille tarifaire appelée à changer.
     LA LOGIQUE : un client tape « rue de la Paix » ou « rue de la Gare » —
     des noms qui existent par dizaines dans toute la France. Sans repère,
     le score ne compare que des mots, et deux rues homonymes arrivent à
     égalité ; c'est alors l'ordre brut du serveur qui décide, sans rapport
     avec ce que cherche un client d'Elatransfer. On ne DIT jamais qu'une
     adresse loin de Paris est invalide ici — ça, c'est le rôle de
     « horsZone », plus bas, appliqué au moment du choix, pas de la
     recherche : on la fait seulement remonter ou descendre dans la liste. */
  var CENTRE_RECHERCHE = { lat:48.8566, lon:2.3522 };
  var RAYON_RECHERCHE_KM = 90;
  function distanceParis(item){
    if(typeof item.lat !== "number" || typeof item.lon !== "number") return null;
    var route = racine.ELA_ROUTE;
    return route && route.volDoiseauKm ? route.volDoiseauKm(CENTRE_RECHERCHE, item) : null;
  }
  /* Ce que le client tape quand il cherche un restaurant : sans l'un de ces
     mots, un bar homonyme n'a pas à passer devant le monument ou la rue. */
  var MOTS_RESTO = ["restaurant","resto","brasserie","cafe","bar","pub","bistrot","pizza","pizzeria"];
  /* ═══ LA TOLÉRANCE AUX FAUTES (4 octobre 2026) ═══
     Les services en ont déjà une partie (Photon cherche « à peu près »).
     Ce qui manquait, c'est NOTRE classement : il ne comptait que les mots
     écrits exactement. « novotel roisy » rendait bien les Novotel, mais
     celui de Roissy n'avait aucun point de plus qu'un autre. Un mot de
     cinq lettres ou plus compte désormais s'il est à une lettre près d'un
     mot du libellé (deux à partir de huit lettres) — un peu moins qu'un
     mot exact. En dessous de cinq lettres, rien : « orly » et « orli »
     restent distincts, et « bar » ne devient pas « bac ».
     Pas de correcteur maison au-delà : le reste est l'affaire des services. */
  function distanceEdition(a, b, max){
    if(Math.abs(a.length - b.length) > max) return max + 1;
    var prec = [], i, j;
    for(j = 0; j <= b.length; j++) prec[j] = j;
    for(i = 1; i <= a.length; i++){
      var cour = [i], mini = i;
      for(j = 1; j <= b.length; j++){
        cour[j] = Math.min(prec[j] + 1, cour[j-1] + 1,
                           prec[j-1] + (a.charAt(i-1) === b.charAt(j-1) ? 0 : 1));
        if(cour[j] < mini) mini = cour[j];
      }
      if(mini > max) return max + 1;
      prec = cour;
    }
    return prec[b.length];
  }
  function motProche(m, motsLibelle){
    if(m.length < 5) return false;
    var tol = m.length >= 8 ? 2 : 1;
    return motsLibelle.some(function(w){
      /* Le client n'a peut-être pas fini d'écrire : « disneylan » se compare
         au début de « disneyland » autant qu'au mot entier. */
      return distanceEdition(m, w, tol) <= tol
          || (w.length > m.length && distanceEdition(m, w.slice(0, m.length), tol) <= tol);
    });
  }
  function note(item, mots){
    var l = sansAccents(item.label), s = item.lieuNomme ? 2 : 0;
    var motsLibelle = l.split(/[^a-z0-9]+/).filter(Boolean);
    var utiles = 0, touches = 0;
    mots.forEach(function(m){
      if(m.length < 2) return;
      var courant = MOTS_COURANTS.indexOf(m) > -1;
      if(!courant) utiles++;
      if(l.indexOf(m) === -1){
        if(!courant && motProche(m, motsLibelle)){ touches++; s += 2; }
        return;
      }
      if(!courant) touches++;
      s += courant ? 1 : 3;
    });
    var toutTrouve = utiles > 0 && touches === utiles;
    /* ═══ CE QU'ON CHERCHE PAR SON NOM PASSE DEVANT (30/09/2026) ═══
       « sacré coeur » : la basilique avant le bar du même nom ; « champs
       elysee » : l'avenue avant les hôtels qui portent son nom. Un
       monument qui répond au nom tapé gagne 3 ; une RUE dont le nom est
       entièrement tapé gagne 3 (une rue n'a pas le bonus de « lieu nommé »
       qu'ont les commerces) ; un bar ou un restaurant en perd 2 si le
       client n'a pas écrit « restaurant », « bar »… Rien n'est retiré :
       l'ordre change, la liste reste la même. */
    if(item.categorie === "culture" && touches > 0) s += 3;
    if(item.categorie === "voie" && toutTrouve) s += 3;
    if(item.categorie === "restauration"
       && !mots.some(function(m){ return MOTS_RESTO.indexOf(m) > -1; })) s -= 2;
    var km = distanceParis(item);
    if(km !== null) s += bonusDistance(km);
    return s;
  }
  /* GRADUÉ, PAS UN SEUIL UNIQUE (28 septembre 2026, à sa demande : « fait ce
     que tu penses être le meilleur sans restreindre le client »). Une seule
     coupure à 90 km traitait Melun (50 km, dans la zone) et Deauville
     (180 km, hors zone mais une vraie destination qu'on sert de vive voix —
     voir « la zone desservie » plus bas) exactement comme Marseille : même
     pénalité, alors que l'un est un client plausible et l'autre ne l'est
     presque jamais. Le dégradé les distingue sans qu'aucun ne disparaisse. */
  function bonusDistance(km){
    if(km <= RAYON_RECHERCHE_KM) return 3;      // Île-de-France : priorité nette
    if(km <= 200) return 1;                     // grande couronne élargie, villes limitrophes
    if(km <= 400) return 0;                     // une vraie destination lointaine, ni remontée ni enfoncée
    return -2;                                  // à l'autre bout de la France : ça descend, sans disparaître
  }
  /* Deux résultats à quelques mètres l'un de l'autre sont le même lieu, même
     si les libellés diffèrent d'une virgule : on dédoublonne sur les DEUX. */
  function dedoublonner(liste){
    var vus = {}, sortie = [];
    liste.forEach(function(it){
      var parNom = sansAccents(it.label);
      var parLieu = typeof it.lat === "number"
        ? "@"+it.lat.toFixed(4)+","+it.lon.toFixed(4) : null;
      if(!parNom || vus[parNom] || (parLieu && vus[parLieu])) return;
      vus[parNom] = true; if(parLieu) vus[parLieu] = true;
      sortie.push(it);
    });
    return sortie;
  }

  /* ═══ L'ASSEMBLAGE DE LA LISTE ═══
     C'était une fonction fermée dans « chercher » : elle lisait la saisie
     et les terminaux de l'appel en cours. Elle les reçoit ici en
     paramètres, le corps est le même. « res » : la réponse de la BAN en
     premier, puis celles de Photon (une forme par variante) ; une réponse
     pas encore arrivée compte pour une liste vide, ce qui fait classer la
     liste partielle et la liste complète par la même fonction. */
  function assembler(q, res, terminaux){
    var chercheAdresse = /^\s*\d/.test(q);
    var ban = res[0] || [];
    var photon = res.slice(1).reduce(function(a,b){ return a.concat(b || []); }, []);
    var nommes = photon.filter(function(r){ return r.lieuNomme; });
    var simples = photon.filter(function(r){ return !r.lieuNomme; });
    var mots = sansAccents(q).split(/[^a-z0-9]+/).filter(Boolean);
    var classer = function(l){
      return l.map(function(it,i){ return { it:it, i:i, s:note(it,mots) }; })
              .sort(function(a,b){ return b.s - a.s || a.i - b.i; })
              .map(function(x){ return x.it; });
    };
    var reste = chercheAdresse ? classer(ban.concat(nommes, simples))
                               : classer(nommes.concat(ban, simples));
    /* « NOVOTEL ROISSY » CHERCHE UN HÔTEL, PAS UN TERMINAL (4 octobre
       2026). Les terminaux passaient TOUJOURS en tête dès qu'un mot
       d'aéroport était tapé : neuf lignes de Roissy avant le Novotel
       qu'on cherchait. Ils restent en tête pour « cdg » ou « orly 4 » ;
       mais si la saisie porte un autre mot distinctif (« novotel »,
       « ibis ») et qu'un résultat les porte TOUS, celui-là passe devant. */
    var clesAero = [];
    Object.keys(AEROPORTS).forEach(function(k){ clesAero = clesAero.concat(AEROPORTS[k].mots.map(sansAccents)); });
    var distinctifs = mots.filter(function(m){
      return m.length >= 3 && MOTS_COURANTS.indexOf(m) === -1 && !/^\d/.test(m) && m !== "terminal"
             && clesAero.indexOf(m) === -1 && !clesAero.some(function(k){ return cleProche(m, k); });
    });
    var devant = [];
    if(terminaux.length && distinctifs.length){
      devant = reste.filter(function(it){
        var l = sansAccents(it.label), ml = l.split(/[^a-z0-9]+/).filter(Boolean);
        return distinctifs.every(function(m){ return l.indexOf(m) > -1 || motProche(m, ml); });
      });
      reste = reste.filter(function(it){ return devant.indexOf(it) === -1; });
    }
    var ordre = devant.concat(terminaux, reste);
    return dedoublonner(ordre).slice(0, terminaux.length ? terminaux.length+devant.length+3 : 8);
  }

  racine.ELA_LIEUX = {
    lieuStructure: lieuStructure,
    estHotel: estHotel,
    libelleTerminal: libelleTerminal,
    cleProche: cleProche,
    terminauxPourSaisie: terminauxPourSaisie,
    variantes: variantes,
    distanceParis: distanceParis,
    distanceEdition: distanceEdition,
    motProche: motProche,
    note: note,
    bonusDistance: bonusDistance,
    dedoublonner: dedoublonner,
    assembler: assembler
  };
})(typeof window !== "undefined" ? window : globalThis);
