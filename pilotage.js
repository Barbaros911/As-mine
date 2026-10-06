/* =====================================================================
   LE PILOTAGE — LES DONNÉES (Issue #197, bloc 1 sur 3)
   ---------------------------------------------------------------------
   6 octobre 2026. Le cockpit interne d'Elatransfer : deux tableaux,
   PRODUIT et OPÉRATIONS, un seul déroulé (Idées → À faire → En cours →
   À valider → Terminé) et un marqueur « Bloqué / en attente » avec sa
   raison. Ce fichier ne dessine RIEN : l'écran vient au bloc 2.

   CE N'EST PAS LE TABLEAU DES COURSES. Il ne lit ni n'écrit aucune course,
   n'entre dans aucune sauvegarde locale, ne sonne jamais et n'interroge
   le serveur que lorsqu'on le lui demande — rien au chargement.

   LA BASE EST LA SEULE AUTORITÉ (supabase/migrations/
   20261006010000_pilotage.sql) : droits réservés à l'admin, règles,
   version, horodatage et journal y sont imposés. Ce fichier en porte un
   MIROIR pour dire à Barbaros ce qui ne va pas AVANT d'envoyer — une
   épreuve (supabase/tests/pilotage-http.mjs) envoie les mêmes cas à la
   vraie base et exige le même verdict : deux règles qui divergent ne se
   voient pas, jusqu'au jour où l'écran accepte ce que la base refuse.

   IL PASSE PAR LA CONNEXION DE L'ADMIN (window.ELA_NUAGE) : même session,
   même renouvellement du jeton, mêmes délais. Aucune clé ici, aucun jeton
   GitHub — les liens GitHub sont de simples références saisies à la main.

   JAMAIS DE SUPPRESSION : il n'existe aucune fonction pour ça, et la base
   la refuse de toute façon. On archive, on restaure.

   Chargé par l'admin seulement : la construction le retire des pages
   publiques (construire-espaces-hotel.mjs). Node l'importe pour les
   épreuves, comme admin-sante.js.
   ===================================================================== */
(function(racine){
  "use strict";

  /* ═══ LES RÉFÉRENTIELS — les clés sont celles de la base ═══
     Une épreuve relit les listes de la migration et exige qu'elles soient
     identiques à celles-ci. Les libellés, eux, ne vivent qu'ici. */
  var TABLEAUX = [
    { cle: "produit", libelle: "Produit" },
    { cle: "operations", libelle: "Opérations" }
  ];
  var STATUTS = [
    { cle: "idee", libelle: "Idées" },
    { cle: "a_faire", libelle: "À faire" },
    { cle: "en_cours", libelle: "En cours" },
    { cle: "a_valider", libelle: "À valider" },
    { cle: "termine", libelle: "Terminé" }
  ];
  var PRIORITES = [
    { cle: "P0", libelle: "P0", sens: "Production, sécurité, réservation ou lancement réellement bloqué" },
    { cle: "P1", libelle: "P1", sens: "Impact direct client, hôtel, revenu ou lancement" },
    { cle: "P2", libelle: "P2", sens: "Amélioration importante, l'activité reste possible" },
    { cle: "P3", libelle: "P3", sens: "Confort, optimisation ou idée future" }
  ];
  var IMPACTS = [
    { cle: "ca", libelle: "CA" },
    { cle: "client", libelle: "Client" },
    { cle: "hotel", libelle: "Hôtel" },
    { cle: "securite", libelle: "Sécurité" },
    { cle: "conformite", libelle: "Conformité" },
    { cle: "croissance", libelle: "Croissance" },
    { cle: "cout", libelle: "Coût" },
    { cle: "image", libelle: "Image" }
  ];
  /* « Lancement » n'est pas une catégorie : il se suit par l'échéance et la
     priorité (une carte « SIRET » serait sinon à deux endroits). Les
     supports imprimés sont dans « Marketing et supports ». */
  var CATEGORIES = {
    produit: [
      { cle: "site_public", libelle: "Site public" },
      { cle: "reservation", libelle: "Réservation" },
      { cle: "admin", libelle: "Admin" },
      { cle: "hotel", libelle: "Hôtel" },
      { cle: "chauffeurs", libelle: "Chauffeurs" },
      { cle: "paiement", libelle: "Paiement" },
      { cle: "seo", libelle: "SEO" },
      { cle: "securite", libelle: "Sécurité" },
      { cle: "infrastructure", libelle: "Infrastructure" }
    ],
    operations: [
      { cle: "hotels", libelle: "Hôtels" },
      { cle: "chauffeurs", libelle: "Chauffeurs" },
      { cle: "commercial", libelle: "Commercial" },
      { cle: "societe", libelle: "Société" },
      { cle: "finance", libelle: "Finance" },
      { cle: "conformite", libelle: "Conformité" },
      { cle: "marketing", libelle: "Marketing et supports" }
    ]
  };
  var LIMITES = { titreMin: 3, titreMax: 120, description: 4000, responsable: 40,
                  prochaineAction: 200, raisonMin: 3, raisonMax: 200, criteres: 20,
                  critere: 200, dependances: 10 };
  /* Seulement une Issue ou une PR de CE dépôt : pas une adresse quelconque,
     ni un « javascript: » qui s'exécuterait au clic. */
  var LIEN_GITHUB = /^https:\/\/github\.com\/barbaros911\/as-mine\/(issues|pull)\/[1-9][0-9]{0,5}$/i;
  /* Les seuls champs que le navigateur a le droit d'écrire (droits par
     colonne de la base). L'identifiant, la version et les dates ne partent
     JAMAIS d'ici : la base les pose. */
  var CHAMPS_CREATION = ["tableau", "categorie", "titre", "description", "statut", "priorite",
    "responsable", "prochaine_action", "impacts", "echeance", "bloque", "raison_blocage",
    "dependances", "checklist", "lien_github"];
  var CHAMPS_MODIFICATION = CHAMPS_CREATION.concat(["archivee"]);

  function cles(liste){ return liste.map(function(x){ return x.cle; }); }
  function dans(liste, cle){ return cles(liste).indexOf(cle) !== -1; }
  /* Les longueurs se comptent en CARACTÈRES, comme la base : un emoji fait
     deux unités pour JavaScript et un caractère pour PostgreSQL. */
  function longueur(s){ return Array.from(String(s)).length; }
  var CONTROLE = /[\u0000-\u001F\u007F-\u009F]/;
  function texte(v){ return typeof v === "string" ? v.trim() : (v == null ? "" : String(v).trim()); }
  function facultatif(v){ var t = texte(v); return t === "" ? null : t; }

  /* ═══ NORMALISER : la carte telle que la base la gardera ═══
     Espaces retirés, champ facultatif vide = absent, impacts et
     dépendances sans doublon, checklist réduite à { texte, fait }, raison
     effacée quand on débloque. Ne touche qu'aux champs écrits. */
  function normaliser(carte){
    var c = {}, k;
    carte = carte || {};
    for(k in carte) if(Object.prototype.hasOwnProperty.call(carte, k)) c[k] = carte[k];
    if("titre" in c) c.titre = texte(c.titre);
    if("description" in c) c.description = texte(c.description);
    ["categorie", "responsable", "prochaine_action", "lien_github", "echeance"].forEach(function(k){
      if(k in c) c[k] = facultatif(c[k]);
    });
    /* Débloquer efface la raison ; changer la raison seule d'une carte
       déjà bloquée la garde (la carte entière n'est pas toujours là). */
    if("bloque" in c) c.bloque = c.bloque === true;
    if("bloque" in c && !c.bloque) c.raison_blocage = null;
    else if("raison_blocage" in c) c.raison_blocage = facultatif(c.raison_blocage);
    if("impacts" in c) c.impacts = Array.isArray(c.impacts)
      ? c.impacts.filter(function(x, i, t){ return typeof x === "string" && t.indexOf(x) === i; }).sort()
      : c.impacts;
    if("dependances" in c) c.dependances = Array.isArray(c.dependances)
      ? c.dependances.filter(function(x, i, t){ return typeof x === "string" && x && t.indexOf(x) === i; }).sort()
      : c.dependances;
    ["checklist", "impacts", "dependances"].forEach(function(k){ if(k in c && c[k] === null) c[k] = []; });
    if("checklist" in c && Array.isArray(c.checklist)) c.checklist = c.checklist.map(function(e){
      return (e && typeof e === "object") ? { texte: texte(e.texte), fait: e.fait === true } : e;
    });
    return c;
  }

  /* ═══ VALIDER : les mêmes règles que la base, dites en clair ═══
     Rend la liste des erreurs [{ champ, regle, message }] ; vide = la base
     acceptera. « regle » est le nom de la contrainte de la base. */
  function valider(carte){
    var c = normaliser(carte), e = [];
    function err(champ, regle, message){ e.push({ champ: champ, regle: regle, message: message }); }
    if(!dans(TABLEAUX, c.tableau)) err("tableau", "pilotage_cartes_tableau", "Choisissez le tableau : Produit ou Opérations.");
    /* ABSENT n'est pas NUL : un champ absent prend le défaut de la base
       (« Idées », « P2 ») ; un null envoyé exprès n'en prend aucun, et la
       base le refuse. Le miroir dit la même chose. */
    var statut = c.statut === undefined ? "idee" : c.statut;
    if(!dans(STATUTS, statut)) err("statut", "pilotage_cartes_statut", "Étape inconnue.");
    if(c.priorite !== undefined && !dans(PRIORITES, c.priorite)) err("priorite", "pilotage_cartes_priorite", "Priorité inconnue (P0 à P3).");
    if(c.categorie == null){
      if(statut !== "idee") err("categorie", "pilotage_cartes_categorie", "Choisissez une catégorie : seule une idée peut rester sans.");
    } else if(!CATEGORIES[c.tableau] || !dans(CATEGORIES[c.tableau], c.categorie)){
      err("categorie", "pilotage_cartes_categorie", "Cette catégorie n'appartient pas à ce tableau.");
    }
    var t = c.titre == null ? "" : String(c.titre);
    if(longueur(t) < LIMITES.titreMin || longueur(t) > LIMITES.titreMax || CONTROLE.test(t))
      err("titre", "pilotage_cartes_titre", "Le titre fait de " + LIMITES.titreMin + " à " + LIMITES.titreMax + " caractères, sur une ligne.");
    if(c.description != null && longueur(c.description) > LIMITES.description)
      err("description", "pilotage_cartes_description", "La description dépasse " + LIMITES.description + " caractères.");
    if(c.responsable != null && (longueur(c.responsable) > LIMITES.responsable || CONTROLE.test(c.responsable)))
      err("responsable", "pilotage_cartes_responsable", "Le responsable tient en " + LIMITES.responsable + " caractères.");
    if(c.prochaine_action != null && (longueur(c.prochaine_action) > LIMITES.prochaineAction || CONTROLE.test(c.prochaine_action)))
      err("prochaine_action", "pilotage_cartes_prochaine_action", "La prochaine action tient en une ligne de " + LIMITES.prochaineAction + " caractères.");
    if(c.impacts != null && (!Array.isArray(c.impacts) || c.impacts.some(function(x){ return !dans(IMPACTS, x); })))
      err("impacts", "pilotage_cartes_impacts", "Impact inconnu.");
    if(c.bloque === true){
      var r = c.raison_blocage == null ? "" : c.raison_blocage;
      if(longueur(r) < LIMITES.raisonMin || longueur(r) > LIMITES.raisonMax || CONTROLE.test(r))
        err("raison_blocage", "pilotage_cartes_blocage", "Dites ce qui bloque ou ce qu'on attend (" + LIMITES.raisonMin + " à " + LIMITES.raisonMax + " caractères).");
      if(statut === "termine") err("statut", "pilotage_cartes_termine_debloque", "Une carte bloquée ne peut pas être terminée : débloquez-la d'abord.");
    }
    var liste = c.checklist == null ? [] : c.checklist, checklistLisible = true;
    if(!Array.isArray(liste) || liste.length > LIMITES.criteres || liste.some(function(x){
      return !x || typeof x !== "object" || Array.isArray(x) || Object.keys(x).length !== 2
        || typeof x.texte !== "string" || typeof x.fait !== "boolean"
        || longueur(x.texte) < 1 || longueur(x.texte) > LIMITES.critere;
    })){
      checklistLisible = false;
      err("checklist", "pilotage_cartes_checklist", "Chaque critère tient en " + LIMITES.critere + " caractères, " + LIMITES.criteres + " critères au plus.");
    }
    if(statut === "termine" && checklistLisible && liste.some(function(x){ return !x.fait; }))
      err("checklist", "pilotage_cartes_termine_checklist", "Cochez tous les critères de validation avant « Terminé ».");
    var dep = c.dependances == null ? [] : c.dependances;
    if(!Array.isArray(dep) || dep.length > LIMITES.dependances)
      err("dependances", "pilotage_cartes_dependances", LIMITES.dependances + " dépendances au plus.");
    else if(c.id && dep.indexOf(c.id) !== -1)
      err("dependances", "pilotage_dependance_elle_meme", "Une carte ne peut pas dépendre d'elle-même.");
    if(c.lien_github != null && !LIEN_GITHUB.test(c.lien_github))
      err("lien_github", "pilotage_cartes_lien_github", "Le lien doit être une Issue ou une PR du dépôt Elatransfer sur GitHub.");
    if(c.echeance != null && !dateValide(c.echeance))
      err("echeance", "pilotage_cartes_echeance", "Échéance invalide.");
    return e;
  }

  function dateValide(s){
    if(typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var d = new Date(s + "T12:00:00Z");
    return !isNaN(d) && d.toISOString().slice(0, 10) === s && s >= "2020-01-01" && s <= "2100-12-31";
  }

  /* LA DATE DU JOUR SE COMPOSE EN LOCAL, JAMAIS EN UTC (leçon du 7/09 :
     à 1 h du matin, toISOString rend la veille). */
  function dateLocale(d){
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  /* En retard : une échéance passée sur une carte ni terminée ni archivée.
     Le jour de l'échéance n'est pas un retard. */
  function enRetard(carte, aujourdhui){
    if(!carte || !carte.echeance || carte.statut === "termine" || carte.archivee) return false;
    return String(carte.echeance) < (aujourdhui || dateLocale());
  }

  /* ═══ LES ERREURS, DITES COMME UN GESTE ═══ */
  function erreur(code, message, extra){
    var e = new Error(message);
    e.code = code;
    if(extra) for(var k in extra) e[k] = extra[k];
    return e;
  }
  function traduireErreur(e){
    if(e && e.code && /^(invalide|conflit|introuvable|session|archivee)$/.test(e.code)) return e;
    var m = String(e && e.message || "");
    if(/session expiree/.test(m)) return erreur("session", "Session expirée : reconnectez-vous.");
    if(/nuage 40[13]/.test(m)) return erreur("acces", "Accès refusé : le Pilotage est réservé au compte administrateur.");
    if(/nuage 4\d\d/.test(m)) return erreur("refuse", "Le serveur a refusé cette modification. Rechargez la page : la carte a peut-être changé.");
    if(/nuage 5\d\d|renouvellement impossible/.test(m)) return erreur("serveur", "Le serveur ne répond pas correctement : rien n'a été enregistré.");
    return erreur("reseau", "Serveur injoignable : rien n'a été enregistré.");
  }

  function choisir(source, champs){
    var o = {};
    champs.forEach(function(k){ if(Object.prototype.hasOwnProperty.call(source, k)) o[k] = source[k]; });
    return o;
  }
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /* ═══ LE CLIENT ═══
     « nuage » est la connexion de l'admin (window.ELA_NUAGE) : il porte la
     session et sait renouveler le jeton. Rien n'est appelé tant qu'on ne
     le demande pas. */
  function client(nuage){
    if(!nuage || typeof nuage.appel !== "function") throw new Error("connexion absente");
    function pret(){
      return (typeof nuage.connecte !== "function" || nuage.connecte())
        ? null : Promise.reject(erreur("session", "Connectez-vous avec le compte administrateur."));
    }
    function appel(chemin, options){
      return nuage.appel(chemin, options).catch(function(e){ throw traduireErreur(e); });
    }
    function lire(id){
      if(!UUID.test(String(id || ""))) return Promise.reject(erreur("introuvable", "Carte introuvable."));
      return pret() || appel("/rest/v1/pilotage_cartes?select=*&id=eq." + id)
        .then(function(r){ return Array.isArray(r) && r[0] ? r[0] : null; });
    }
    return {
      /* Les cartes actives (ou les archives), triées par priorité puis par
         échéance : ce qui presse vient d'abord. */
      lister: function(options){
        var archives = !!(options && options.archives);
        return pret() || appel("/rest/v1/pilotage_cartes?select=*&archivee=is." + archives
          + "&order=priorite.asc,echeance.asc.nullslast,modifie_le.desc")
          .then(function(r){ return Array.isArray(r) ? r : []; });
      },
      lire: lire,
      creer: function(carte){
        var c = normaliser(choisir(carte || {}, CHAMPS_CREATION));
        var erreurs = valider(c);
        if(erreurs.length) return Promise.reject(erreur("invalide", erreurs[0].message, { erreurs: erreurs }));
        return pret() || appel("/rest/v1/pilotage_cartes?select=*", {
          method: "POST", body: JSON.stringify(c),
          headers: { Prefer: "return=representation" }
        }).then(function(r){
          if(!Array.isArray(r) || !r[0]) throw erreur("refuse", "Le serveur n'a pas rendu la carte créée.");
          return r[0];
        });
      },
      /* On écrit SOUS CONDITION DE VERSION, comme les courses : si la carte
         a changé ailleurs (le téléphone et l'ordinateur), rien n'est
         écrasé — on relit, et l'appelant reçoit la version du serveur. */
      modifier: function(carte, changements){
        if(!carte || !UUID.test(String(carte.id || "")) || !(carte.version > 0))
          return Promise.reject(erreur("introuvable", "Carte introuvable : rechargez le tableau."));
        var envoi = normaliser(choisir(changements || {}, CHAMPS_MODIFICATION));
        if(!Object.keys(envoi).length) return Promise.resolve(carte);
        if(carte.archivee && envoi.archivee !== false)
          return Promise.reject(erreur("archivee", "Cette carte est archivée : restaurez-la d'abord."));
        var apres = {}, k;
        for(k in carte) apres[k] = carte[k];
        for(k in envoi) apres[k] = envoi[k];
        var erreurs = valider(apres);
        if(erreurs.length) return Promise.reject(erreur("invalide", erreurs[0].message, { erreurs: erreurs }));
        return pret() || appel("/rest/v1/pilotage_cartes?select=*&id=eq." + carte.id + "&version=eq." + carte.version, {
          method: "PATCH", body: JSON.stringify(envoi),
          headers: { Prefer: "return=representation" }
        }).then(function(r){
          if(Array.isArray(r) && r[0]) return r[0];
          return lire(carte.id).then(function(serveur){
            if(!serveur) throw erreur("introuvable", "Cette carte n'est plus accessible.");
            throw erreur("conflit", "Cette carte a été modifiée ailleurs : voici la version à jour, refaites votre changement.",
                         { serveur: serveur });
          });
        });
      },
      deplacer: function(carte, statut){ return this.modifier(carte, { statut: statut }); },
      bloquer: function(carte, raison){ return this.modifier(carte, { bloque: true, raison_blocage: raison }); },
      debloquer: function(carte){ return this.modifier(carte, { bloque: false }); },
      archiver: function(carte){ return this.modifier(carte, { archivee: true }); },
      restaurer: function(carte){ return this.modifier(carte, { archivee: false }); },
      /* L'historique d'une carte, le plus récent d'abord. « limite » (bloc 3)
         borne la réponse : une carte vivante accumule des lignes, l'écran
         n'en montre que les dernières. Sans elle, la requête reste celle
         du bloc 1, à l'octet près. */
      journal: function(id, options){
        if(!UUID.test(String(id || ""))) return Promise.reject(erreur("introuvable", "Carte introuvable."));
        var n = options && Math.floor(Number(options.limite));
        var limite = n > 0 ? "&limit=" + Math.min(n, 1000) : "";
        return pret() || appel("/rest/v1/pilotage_journal?select=*&carte_id=eq." + id + "&order=id.desc" + limite)
          .then(function(r){ return Array.isArray(r) ? r : []; });
      }
    };
  }

  racine.ELA_PILOTAGE = {
    TABLEAUX: TABLEAUX, STATUTS: STATUTS, PRIORITES: PRIORITES, IMPACTS: IMPACTS,
    CATEGORIES: CATEGORIES, LIMITES: LIMITES,
    CHAMPS_CREATION: CHAMPS_CREATION, CHAMPS_MODIFICATION: CHAMPS_MODIFICATION,
    normaliser: normaliser, valider: valider, enRetard: enRetard, dateLocale: dateLocale,
    traduireErreur: traduireErreur, client: client
  };
})(typeof window !== "undefined" ? window : globalThis);
