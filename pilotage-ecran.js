/* =====================================================================
   LE PILOTAGE — L'ÉCRAN (Issue #197, bloc 2 sur 3)
   ---------------------------------------------------------------------
   6 octobre 2026, plan validé par Barbaros (« Ok »). Le cockpit interne :
   deux tableaux (Produit, Opérations), cinq étapes à compteurs, une étape
   à la fois sur téléphone, une fiche par carte. Les données et leurs
   règles vivent dans pilotage.js (bloc 1) et dans la base, qui seule fait
   autorité : cet écran n'invente aucune règle, il les DIT avant d'envoyer.

   CE N'EST PAS LE TABLEAU DES COURSES. Aucune course n'est lue ni écrite
   ici, rien ne sonne, rien n'est gardé sur l'appareil, et le serveur n'est
   interrogé qu'à l'ouverture de l'écran ou sur « Actualiser » — jamais au
   chargement de l'admin, jamais en tâche de fond.

   TOUT TEXTE PASSE PAR textContent, JAMAIS PAR innerHTML : un titre de
   carte est tapé à la main, et un chevron perdu ne doit pas devenir une
   balise.

   DÉPLACER SE FAIT PAR BOUTONS, pas en glissant : un pouce qui fait défiler
   la liste ne doit pas déplacer une carte, et un bouton se lit et se
   rejoue au clavier.

   UNE ACTION ENVOIE AUSSI CE QUI EST EN COURS DE SAISIE. Cocher le dernier
   critère puis appuyer sur « Terminé » doit marcher : les deux partent dans
   la même écriture, sous condition de version.

   RIEN N'EST ÉCRASÉ. Si la carte a changé sur un autre appareil, le serveur
   gagne : la fiche montre sa version à jour et dit quels changements n'ont
   pas été appliqués — comme les courses.

   Chargé par l'admin seulement : la construction le retire des pages
   publiques (construire-espaces-hotel.mjs).
   ===================================================================== */
(function(racine){
  "use strict";

  var RESPONSABLES = ["Barbaros", "Claude", "ChatGPT"];
  /* Deux appuis pour un geste qu'on regretterait (archiver, quitter sans
     enregistrer) : le second compte s'il arrive entre 0,7 et 5 secondes
     après le premier — un double appui involontaire ne vaut pas accord. */
  var ARME_MIN = 700, ARME_MAX = 5000;
  var MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  var P = null, zone = null, ecranRacine = null;
  var etat = {
    tableau: "produit", statut: "idee", vue: "liste",
    cartes: [], archives: null, lu: false, luLe: null,
    chargement: false, erreur: null, message: null, surligner: null,
    fiche: null
  };
  var tour = 0;

  /* ═══ OUTILS DE DESSIN ═══ */
  function el(tag, o, enfants){
    var n = document.createElement(tag);
    o = o || {};
    if(o.classe) n.className = o.classe;
    if(o.texte != null) n.textContent = o.texte;
    if(o.attrs) for(var k in o.attrs){
      var v = o.attrs[k];
      if(v === null || v === undefined || v === false) continue;
      n.setAttribute(k, v === true ? "" : String(v));
    }
    if(o.clic) n.addEventListener("click", o.clic);
    (enfants || []).forEach(function(c){
      if(c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }
  function ajout(parent, n){ if(n) parent.appendChild(n); return parent; }
  function bouton(texte, classe, clic, attrs){
    var a = { type: "button" };
    for(var k in (attrs || {})) a[k] = attrs[k];
    return el("button", { classe: classe, texte: texte, attrs: a, clic: clic });
  }
  var NS = "http://www.w3.org/2000/svg";
  function icone(d){
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", "18"); s.setAttribute("height", "18");
    s.setAttribute("fill", "none"); s.setAttribute("aria-hidden", "true");
    var p = document.createElementNS(NS, "path");
    p.setAttribute("d", d); p.setAttribute("stroke", "currentColor"); p.setAttribute("stroke-width", "2");
    p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round");
    s.appendChild(p);
    return s;
  }
  var PLUS = "M12 5v14M5 12h14", CHEVRON = "M15 6l-6 6 6 6", CROIX = "M6 6l12 12M18 6 6 18";

  function libelle(liste, cle){
    for(var i = 0; i < liste.length; i++) if(liste[i].cle === cle) return liste[i].libelle;
    return cle || "";
  }
  function categorieLibelle(tableau, cle){ return cle ? libelle(P.CATEGORIES[tableau] || [], cle) : ""; }
  function dateCourte(iso){
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    if(!m) return "";
    var annee = m[1] !== String(new Date().getFullYear()) ? " " + m[1] : "";
    return Number(m[3]) + " " + MOIS[Number(m[2]) - 1] + annee;
  }
  /* Les horodatages viennent de la base, en UTC : on les montre à l'heure
     de Paris, celle de Barbaros. */
  function horodatage(ts){
    var d = new Date(ts);
    if(isNaN(d)) return "";
    try{
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" })
        + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
    }catch(e){ return d.toISOString().slice(0, 16).replace("T", " "); }
  }
  function heure(d){
    try{ return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }
    catch(e){ return ""; }
  }
  function numeroGithub(lien){
    var m = /\/(issues|pull)\/(\d+)$/.exec(String(lien || ""));
    return m ? (m[1] === "pull" ? "PR #" : "Issue #") + m[2] : "";
  }

  /* ═══ CE QUI DEMANDE QUELQUE CHOSE ═══
     Une carte bloquée, ou en retard, ne se noie pas dans la liste : bord de
     couleur sur la carte, point sur son étape et sur son tableau. */
  function enRetard(c){ return P.enRetard(c); }
  function enAlerte(c){ return !!c.bloque || enRetard(c); }
  function actives(tableau){ return etat.cartes.filter(function(c){ return c.tableau === tableau && !c.archivee; }); }
  function comparer(a, b){
    if(a.priorite !== b.priorite) return a.priorite < b.priorite ? -1 : 1;
    var ea = a.echeance || "9999-12-31", eb = b.echeance || "9999-12-31";
    if(ea !== eb) return ea < eb ? -1 : 1;
    return String(b.modifie_le || "").localeCompare(String(a.modifie_le || ""));
  }
  function ranger(carte){
    etat.cartes = etat.cartes.filter(function(c){ return c.id !== carte.id; });
    if(etat.archives) etat.archives = etat.archives.filter(function(c){ return c.id !== carte.id; });
    if(carte.archivee){ if(etat.archives) etat.archives.push(carte); }
    else etat.cartes.push(carte);
    etat.cartes.sort(comparer);
    if(etat.archives) etat.archives.sort(comparer);
  }

  function client(){
    try{ return P.client(racine.ELA_NUAGE); }catch(e){ return null; }
  }
  /* Les messages du module parlent d'une ÉCRITURE (« rien n'a été
     enregistré ») ; une LECTURE ratée se dit autrement. */
  function lecture(e){
    var code = e && e.code;
    if(code === "reseau") return { message: "Serveur injoignable : le Pilotage n'a pas pu être lu. Vérifiez le réseau, puis réessayez." };
    if(code === "serveur") return { message: "Le serveur ne répond pas correctement. Réessayez dans un instant." };
    return { message: (e && e.message) || "Le Pilotage n'a pas pu être lu." };
  }

  /* ═══ LIRE ═══ */
  function charger(){
    var c = client(), moi = ++tour;
    etat.chargement = true; etat.erreur = null;
    dessiner();
    if(!c){
      etat.chargement = false;
      etat.erreur = { message: "La connexion au serveur n'est pas prête : rechargez la page." };
      dessiner();
      return Promise.resolve();
    }
    return c.lister().then(function(r){
      if(moi !== tour) return;
      etat.cartes = r.slice().sort(comparer); etat.lu = true; etat.luLe = new Date();
      etat.archives = null;
    }, function(e){
      if(moi !== tour) return;
      etat.erreur = lecture(e);
    }).then(function(){
      if(moi !== tour) return;
      etat.chargement = false;
      dessiner();
    });
  }
  function chargerArchives(){
    var c = client(), moi = ++tour;
    etat.chargement = true; etat.erreur = null; etat.archives = null;
    dessiner();
    if(!c){ etat.chargement = false; etat.erreur = { message: "La connexion au serveur n'est pas prête : rechargez la page." }; dessiner(); return; }
    c.lister({ archives: true }).then(function(r){
      if(moi !== tour) return;
      etat.archives = r.slice().sort(comparer);
    }, function(e){ if(moi === tour) etat.erreur = lecture(e); }).then(function(){
      if(moi !== tour) return;
      etat.chargement = false; dessiner();
    });
  }

  /* ═══ DESSINER ═══
     Tout est redessiné d'un coup ; le contrôle qui avait le focus le
     retrouve (data-f), sinon un appui sur une puce renverrait le clavier
     et le lecteur d'écran en haut de la page. */
  function dessiner(){
    if(!zone) return;
    var actif = document.activeElement, cle = actif && zone.contains(actif) ? actif.getAttribute("data-f") : null;
    var contenu = etat.vue === "fiche" ? dessinerFiche()
      : etat.vue === "archives" ? dessinerArchives() : dessinerListe();
    while(zone.firstChild) zone.removeChild(zone.firstChild);
    zone.appendChild(contenu);
    if(ecranRacine) ecranRacine.classList.toggle("pil-en-fiche", etat.vue !== "liste");
    if(cle){
      var cible = zone.querySelector('[data-f="' + cle.replace(/"/g, "") + '"]');
      if(cible){ try{ cible.focus({ preventScroll: true }); }catch(e){ cible.focus(); } }
    }
  }

  function messageBloc(m){
    if(!m) return null;
    return el("p", { classe: "pil-message " + (m.type || "info"),
      attrs: { role: m.type === "erreur" ? "alert" : "status" }, texte: m.texte });
  }
  function etatChargement(){
    if(etat.chargement) return el("p", { classe: "pil-vide", attrs: { role: "status" }, texte: "Lecture du Pilotage…" });
    if(etat.erreur) return el("div", { classe: "pil-erreur", attrs: { role: "alert" } }, [
      el("p", { texte: etat.erreur.message || "Le Pilotage n'a pas pu être lu." }),
      bouton("Réessayer", "bouton-fantome", function(){ etat.vue === "archives" ? chargerArchives() : charger(); }, { "data-f": "reessayer" })
    ]);
    return null;
  }

  function dessinerListe(){
    var f = el("div", { classe: "pil-liste-vue" });
    var attente = etatChargement();

    var groupe = el("div", { classe: "pil-tableaux", attrs: { role: "group", "aria-label": "Tableau" } });
    P.TABLEAUX.forEach(function(t){
      var cartes = actives(t.cle), alerte = cartes.some(enAlerte);
      groupe.appendChild(el("button", { classe: "pil-tableau", attrs: { type: "button", "aria-pressed": String(etat.tableau === t.cle),
        "data-tableau": t.cle, "data-f": "tableau-" + t.cle },
        clic: function(){ etat.tableau = t.cle; etat.message = null; dessiner(); } }, [
        el("span", { texte: t.libelle }),
        el("span", { classe: "pil-nb", texte: etat.lu ? String(cartes.length) : "" }),
        alerte ? el("span", { classe: "pil-point", attrs: { title: "Une carte demande votre attention" } }) : null
      ]));
    });
    f.appendChild(groupe);

    var ici = actives(etat.tableau);
    var nbBloquees = ici.filter(function(c){ return c.bloque; }).length;
    var nbRetard = ici.filter(enRetard).length;
    if(etat.lu && (nbBloquees || nbRetard)){
      var morceaux = [];
      if(nbRetard) morceaux.push(nbRetard + (nbRetard > 1 ? " cartes en retard" : " carte en retard"));
      if(nbBloquees) morceaux.push(nbBloquees + (nbBloquees > 1 ? " bloquées ou en attente" : " bloquée ou en attente"));
      f.appendChild(el("p", { classe: "pil-resume", texte: morceaux.join(" · ") }));
    }

    var etapes = el("div", { classe: "pil-etapes", attrs: { role: "group", "aria-label": "Étape" } });
    P.STATUTS.forEach(function(s){
      var la = ici.filter(function(c){ return c.statut === s.cle; });
      var retard = la.some(enRetard), bloque = la.some(function(c){ return c.bloque; });
      var dit = s.libelle + " : " + la.length + (la.length > 1 ? " cartes" : " carte")
        + (retard ? ", dont en retard" : "") + (bloque ? ", dont bloquée" : "");
      etapes.appendChild(el("button", { classe: "pil-etape", attrs: { type: "button", "aria-pressed": String(etat.statut === s.cle),
        "aria-label": dit, "data-statut": s.cle, "data-f": "etape-" + s.cle },
        clic: function(){ etat.statut = s.cle; etat.message = null; dessiner(); } }, [
        el("span", { classe: "pil-etape-nb", texte: etat.lu ? String(la.length) : "–" }),
        el("span", { classe: "pil-etape-nom", texte: s.libelle }),
        (retard || bloque) ? el("span", { classe: "pil-point" + (retard ? "" : " ambre") }) : null
      ]));
    });
    f.appendChild(etapes);

    f.appendChild(el("button", { classe: "bouton pil-nouvelle", attrs: { type: "button", id: "pilNouvelle", "data-f": "nouvelle" },
      clic: function(){ ouvrirFiche(null); } }, [icone(PLUS), el("span", { texte: "Nouvelle carte" })]));
    ajout(f, messageBloc(etat.message));

    if(attente) f.appendChild(attente);
    else{
      var la = ici.filter(function(c){ return c.statut === etat.statut; });
      if(!la.length){
        f.appendChild(el("p", { classe: "pil-vide", texte: etat.statut === "idee"
          ? "Aucune idée notée ici. Une idée se note en un appui, sans catégorie : « Nouvelle carte »."
          : "Aucune carte à l'étape « " + libelle(P.STATUTS, etat.statut) + " »." }));
      } else {
        var liste = el("div", { classe: "pil-liste", attrs: { "aria-label": libelle(P.STATUTS, etat.statut) } });
        la.forEach(function(c){ liste.appendChild(carteListe(c)); });
        f.appendChild(liste);
      }
    }

    f.appendChild(el("div", { classe: "pil-pied" }, [
      el("span", { classe: "pil-lu", texte: etat.luLe ? "Lu à " + heure(etat.luLe) : "" }),
      bouton("Actualiser", "pil-lien", function(){ etat.message = null; charger(); }, { "data-f": "actualiser", id: "pilActualiser" }),
      bouton("Archives", "pil-lien", function(){ etat.vue = "archives"; etat.message = null; chargerArchives(); window.scrollTo(0, 0); },
        { "data-f": "archives", id: "pilArchives" })
    ]));
    return f;
  }

  function carteListe(c){
    var retard = enRetard(c);
    var classe = "pil-carte" + (retard ? " retard" : c.bloque ? " bloquee" : "") + (etat.surligner === c.id ? " surlignee" : "");
    var crit = Array.isArray(c.checklist) ? c.checklist : [];
    var faits = crit.filter(function(x){ return x && x.fait; }).length;
    return el("button", { classe: classe, attrs: { type: "button", "data-id": c.id, "data-f": "carte-" + c.id },
      clic: function(){ ouvrirFiche(c); } }, [
      el("span", { classe: "pil-carte-haut" }, [
        el("span", { classe: "pil-prio " + String(c.priorite).toLowerCase(), texte: c.priorite }),
        el("span", { classe: "pil-cat", texte: c.categorie ? categorieLibelle(c.tableau, c.categorie) : "Sans catégorie" }),
        c.echeance ? el("span", { classe: "pil-ech" + (retard ? " retard" : ""),
          texte: (retard ? "En retard · " : "") + dateCourte(c.echeance) }) : null
      ]),
      el("span", { classe: "pil-carte-titre", texte: c.titre }),
      c.bloque ? el("span", { classe: "pil-carte-bloc", texte: "Bloquée : " + (c.raison_blocage || "") }) : null,
      c.prochaine_action ? el("span", { classe: "pil-carte-suite", texte: "Ensuite : " + c.prochaine_action }) : null,
      (c.responsable || crit.length || c.lien_github) ? el("span", { classe: "pil-carte-bas" }, [
        c.responsable ? el("span", { texte: c.responsable }) : null,
        crit.length ? el("span", { classe: faits === crit.length ? "complet" : "", texte: faits + "/" + crit.length + " critères" }) : null,
        c.lien_github ? el("span", { texte: numeroGithub(c.lien_github) }) : null
      ]) : null
    ]);
  }

  function dessinerArchives(){
    var f = el("div", { classe: "pil-archives-vue" });
    f.appendChild(el("div", { classe: "pil-fiche-tete" }, [
      el("button", { classe: "retour", attrs: { type: "button", "aria-label": "Retour au tableau", "data-f": "retour-archives", id: "pilRetourArchives" },
        clic: function(){ etat.vue = "liste"; etat.message = null; dessiner(); window.scrollTo(0, 0); } }, [icone(CHEVRON)]),
      el("h2", { classe: "pil-fiche-titre", attrs: { tabindex: "-1" }, texte: "Archives — " + libelle(P.TABLEAUX, etat.tableau) })
    ]));
    f.appendChild(el("p", { classe: "pil-note", texte: "Une carte archivée ne se supprime pas : elle reste ici, avec son historique, et se restaure." }));
    ajout(f, messageBloc(etat.message));
    var attente = etatChargement();
    if(attente){ f.appendChild(attente); return f; }
    var la = (etat.archives || []).filter(function(c){ return c.tableau === etat.tableau; });
    if(!la.length) f.appendChild(el("p", { classe: "pil-vide", texte: "Aucune carte archivée dans ce tableau." }));
    else{
      var liste = el("div", { classe: "pil-liste" });
      la.forEach(function(c){ liste.appendChild(carteListe(c)); });
      f.appendChild(liste);
    }
    return f;
  }

  /* ═══ LA FICHE ═══
     « modifs » ne garde que ce qui DIFFÈRE de la carte du serveur : c'est ce
     qui part, et seulement ça. Une carte neuve part entière. */
  function defauts(){
    return { tableau: etat.tableau, statut: etat.statut === "termine" ? "idee" : etat.statut, priorite: "P2",
      categorie: null, titre: "", description: "", responsable: null, prochaine_action: null, impacts: [],
      echeance: null, bloque: false, raison_blocage: null, checklist: [], lien_github: null, dependances: [] };
  }
  function ouvrirFiche(carte){
    etat.fiche = { carte: carte, base: carte || defauts(), modifs: {}, erreurs: [], message: null,
      armeArchive: 0, armeQuitter: 0, blocage: false, raison: "", envoi: false, nouveau: "",
      depuis: etat.vue };
    etat.vue = "fiche"; etat.message = null;
    dessiner();
    window.scrollTo(0, 0);
    var t = zone.querySelector(".pil-fiche-titre");
    if(t){ try{ t.focus({ preventScroll: true }); }catch(e){} }
  }
  function val(k){
    var f = etat.fiche;
    return Object.prototype.hasOwnProperty.call(f.modifs, k) ? f.modifs[k] : f.base[k];
  }
  /* Deux valeurs sont « les mêmes » si la base les garderait pareilles :
     espaces retirés, vide = absent, critère sans texte ignoré. */
  function forme(k, v){
    var o = {}; o[k] = v;
    var n = P.normaliser(o)[k];
    if(k === "checklist" && Array.isArray(n)) n = n.filter(function(x){ return x && x.texte; });
    if(n === undefined || n === "") n = null;
    return JSON.stringify(n);
  }
  /* On compare à la BASE : la carte du serveur, ou les valeurs par défaut
     d'une carte neuve — une fiche ouverte par erreur puis refermée n'a
     rien à enregistrer. */
  function changer(k, v){
    var f = etat.fiche;
    if(forme(k, v) === forme(k, f.base[k])) delete f.modifs[k];
    else f.modifs[k] = v;
    f.armeQuitter = 0;
  }
  function modifie(){
    var f = etat.fiche;
    return Object.keys(f.modifs).some(function(k){ return forme(k, f.modifs[k]) !== forme(k, f.base[k]); });
  }
  function preparer(modifs){
    var o = {};
    for(var k in modifs) o[k] = modifs[k];
    if(Array.isArray(o.checklist)) o.checklist = o.checklist
      .filter(function(x){ return x && String(x.texte || "").trim(); })
      .map(function(x){ return { texte: String(x.texte), fait: x.fait === true }; });
    return o;
  }
  var NOMS_CHAMPS = { titre: "titre", tableau: "tableau", categorie: "catégorie", priorite: "priorité",
    responsable: "responsable", prochaine_action: "prochaine action", echeance: "échéance", impacts: "impacts",
    description: "description", checklist: "critères", lien_github: "lien GitHub", statut: "étape",
    bloque: "blocage", raison_blocage: "raison du blocage", dependances: "dépendances" };

  /* Les erreurs de la règle « Terminé » disent QUELS critères manquent. */
  function enrichir(erreurs, donnees){
    return (erreurs || []).map(function(e){
      if(e.regle !== "pilotage_cartes_termine_checklist") return e;
      var reste = (donnees.checklist || []).filter(function(x){ return x && !x.fait; })
        .map(function(x){ return "« " + x.texte + " »"; });
      return { champ: e.champ, regle: e.regle, message: e.message + (reste.length ? " Reste à cocher : " + reste.join(", ") + "." : "") };
    });
  }

  /* ═══ ENVOYER ═══
     Une seule porte pour tout ce qui écrit : création, enregistrement,
     changement d'étape, blocage, archivage, restauration. */
  function envoyer(action, succes){
    var f = etat.fiche, c = client();
    if(f.envoi) return;
    if(!c){ f.message = { type: "erreur", texte: "La connexion au serveur n'est pas prête : rechargez la page." }; dessiner(); return; }
    var envoi = preparer(f.modifs), envoyees = {};
    for(var k in f.modifs) envoyees[k] = JSON.stringify(f.modifs[k]);
    for(k in (action || {})) envoi[k] = action[k];
    var donnees = {};
    for(k in f.base) donnees[k] = f.base[k];
    for(k in envoi) donnees[k] = envoi[k];
    f.envoi = true; f.erreurs = []; f.message = { type: "info", texte: "Enregistrement…" };
    dessiner();
    var promesse = f.carte ? c.modifier(f.carte, envoi) : c.creer(donnees);
    promesse.then(function(carte){
      if(etat.fiche !== f) return;
      f.envoi = false;
      ranger(carte);
      /* Ce qui a été tapé PENDANT l'envoi n'est pas perdu : seules les
         valeurs parties à l'identique sont retirées des modifications. */
      var restantes = {};
      Object.keys(f.modifs).forEach(function(k){ if(JSON.stringify(f.modifs[k]) !== envoyees[k]) restantes[k] = f.modifs[k]; });
      f.carte = carte; f.base = carte; f.modifs = {}; f.blocage = false; f.raison = ""; f.armeArchive = 0;
      for(var r in restantes) changer(r, restantes[r]);
      succes(carte);
    }, function(e){
      if(etat.fiche !== f) return;
      f.envoi = false;
      if(e && e.code === "invalide"){
        /* Une seule chose à corriger : on la dit, sans préambule. Plusieurs :
           une liste, pour n'en oublier aucune. */
        f.erreurs = enrichir(e.erreurs, donnees);
        f.message = { type: "erreur", texte: f.erreurs.length === 1 ? f.erreurs[0].message : "Plusieurs points à corriger :" };
      } else if(e && e.code === "conflit" && e.serveur){
        var perdus = Object.keys(f.modifs).concat(Object.keys(action || {}))
          .filter(function(k, i, t){ return t.indexOf(k) === i; })
          .map(function(k){ return NOMS_CHAMPS[k] || k; });
        ranger(e.serveur);
        f.carte = e.serveur; f.base = e.serveur; f.modifs = {}; f.blocage = false; f.armeArchive = 0;
        f.message = { type: "erreur", texte: "Cette carte a été modifiée sur un autre appareil. Voici sa version à jour."
          + (perdus.length ? " Vos changements (" + perdus.join(", ") + ") n'ont pas été appliqués : refaites-les si besoin." : "") };
      } else if(e && e.code === "introuvable"){
        f.message = { type: "erreur", texte: e.message + " Revenez au tableau et appuyez sur « Actualiser »." };
      } else {
        f.message = { type: "erreur", texte: (e && e.message) || "Rien n'a été enregistré." };
      }
      dessiner();
      montrerMessage();
    });
  }
  function montrerMessage(){
    var m = zone && zone.querySelector(".pil-message.erreur, .pil-erreurs");
    if(m && m.scrollIntoView){ try{ m.scrollIntoView({ block: "center" }); }catch(e){ m.scrollIntoView(); } }
  }
  function revenirListe(message, surligner){
    var depuis = etat.fiche ? etat.fiche.depuis : "liste";
    etat.fiche = null; etat.message = message || null; etat.surligner = surligner || null;
    etat.vue = depuis === "archives" ? "archives" : "liste";
    dessiner();
    window.scrollTo(0, 0);
    if(surligner){
      var c = zone.querySelector('[data-id="' + surligner + '"]');
      if(c && c.scrollIntoView){ try{ c.scrollIntoView({ block: "center" }); }catch(e){} }
    }
  }

  function enregistrer(){
    var f = etat.fiche, nouvelle = !f.carte;
    if(!nouvelle && !modifie()){ f.message = { type: "info", texte: "Rien à enregistrer." }; dessiner(); return; }
    envoyer(null, function(carte){
      if(nouvelle){
        etat.tableau = carte.tableau; etat.statut = carte.statut;
        revenirListe({ type: "ok", texte: "Carte créée." }, carte.id);
      } else {
        f.message = { type: "ok", texte: "Enregistré." };
        dessiner();
      }
    });
  }

  function dessinerFiche(){
    /* Seule une carte archivée est figée. Pendant un envoi on laisse
       saisir : envoyer() refuse simplement un second envoi. */
    var f = etat.fiche, c = f.carte, archivee = !!(c && c.archivee), fige = archivee;
    var tableau = val("tableau"), statut = val("statut");
    var invalides = {};
    f.erreurs.forEach(function(e){ invalides[e.champ] = true; });
    var racineFiche = el("div", { classe: "pil-fiche" });

    racineFiche.appendChild(el("div", { classe: "pil-fiche-tete" }, [
      el("button", { classe: "retour", attrs: { type: "button", id: "pilRetourFiche", "data-f": "retour-fiche",
        "aria-label": f.armeQuitter ? "Quitter sans enregistrer" : "Retour au tableau" }, clic: quitterFiche }, [icone(CHEVRON)]),
      el("h2", { classe: "pil-fiche-titre", attrs: { tabindex: "-1" },
        texte: !c ? "Nouvelle carte" : archivee ? "Carte archivée" : "Modifier la carte" })
    ]));
    if(f.armeQuitter) racineFiche.appendChild(el("p", { classe: "pil-message erreur", attrs: { role: "alert" },
      texte: "Modifications non enregistrées. Appuyez encore sur Retour pour les abandonner, ou enregistrez en bas de la fiche." }));
    ajout(racineFiche, messageBloc(f.message));
    if(f.erreurs.length > 1){
      var ul = el("ul", { classe: "pil-erreurs", attrs: { role: "alert" } });
      f.erreurs.forEach(function(e){ ul.appendChild(el("li", { texte: e.message })); });
      racineFiche.appendChild(ul);
    }

    if(archivee){
      racineFiche.appendChild(el("div", { classe: "pil-bandeau archive" }, [
        el("p", { texte: "Archivée" + (c.archivee_le ? " le " + horodatage(c.archivee_le) : "") + ". Elle ne compte plus dans le tableau ; rien n'est effacé." }),
        bouton(f.envoi ? "Restauration…" : "Restaurer la carte", "bouton pil-restaurer", function(){
          envoyer({ archivee: false }, function(carte){
            etat.tableau = carte.tableau; etat.statut = carte.statut;
            etat.fiche.depuis = "liste";
            revenirListe({ type: "ok", texte: "Carte restaurée à l'étape « " + libelle(P.STATUTS, carte.statut) + " »." }, carte.id);
          });
        }, { "aria-busy": f.envoi ? "true" : null, "data-f": "restaurer", id: "pilRestaurer" })
      ]));
    }

    /* L'ORDRE DE LA FICHE (vu sur la capture du 6/10) : quoi et où (titre,
       tableau, catégorie), où en est-on (étape, blocage), qui et quand
       (priorité, responsable, prochaine action, échéance), quand est-ce fini
       (critères), puis le contexte. Les blocs sont fabriqués, puis posés
       dans cet ordre — l'ordre se lit en un endroit. */
    var parts = {};
    /* — L'ÉTAPE — */
    var etapes = el("div", { classe: "pil-fiche-etapes", attrs: { role: "group", "aria-label": "Étape de la carte" } });
    P.STATUTS.forEach(function(s){
      etapes.appendChild(el("button", { classe: "pil-etape-choix", attrs: { type: "button", "aria-pressed": String(statut === s.cle),
        "data-statut": s.cle, "data-f": "fiche-etape-" + s.cle, disabled: fige },
        texte: s.libelle, clic: function(){
          if(!c){ changer("statut", s.cle); f.erreurs = []; f.message = null; dessiner(); return; }
          if(s.cle === c.statut) return;
          envoyer({ statut: s.cle }, function(carte){
            f.message = { type: "ok", texte: "Carte passée à « " + libelle(P.STATUTS, carte.statut) + " »." };
            etat.statut = carte.statut;
            dessiner();
          });
        } }));
    });
    parts.etape = (section("Étape", etapes, c ? "Un appui déplace la carte et enregistre aussi vos changements en cours." : null, invalides.statut));

    /* — LE BLOCAGE — */
    var bloque = val("bloque") === true;
    var zoneBloc = el("div", { classe: "pil-blocage" });
    if(bloque){
      zoneBloc.appendChild(el("div", { classe: "pil-bandeau bloque" }, [
        el("p", {}, [el("b", { texte: "Bloquée ou en attente : " }), document.createTextNode(val("raison_blocage") || "")]),
        bouton("Débloquer", "bouton-fantome", function(){
          if(!c){ changer("bloque", false); changer("raison_blocage", null); dessiner(); return; }
          envoyer({ bloque: false }, function(){ f.message = { type: "ok", texte: "Carte débloquée." }; dessiner(); });
        }, { disabled: fige, "data-f": "debloquer", id: "pilDebloquer" })
      ]));
    } else if(f.blocage){
      zoneBloc.appendChild(champTexte("raison", "Ce qui bloque, ou ce qu'on attend", f.raison, function(v){ f.raison = v; },
        { maxlength: P.LIMITES.raisonMax, id: "pilRaison", placeholder: "Ex. : en attente du SIRET" }, invalides.raison_blocage));
      zoneBloc.appendChild(el("div", { classe: "pil-duo-boutons" }, [
        bouton("Confirmer le blocage", "bouton", function(){
          if(!c){ changer("bloque", true); changer("raison_blocage", f.raison); f.blocage = false; dessiner(); return; }
          envoyer({ bloque: true, raison_blocage: f.raison }, function(){ f.message = { type: "ok", texte: "Carte marquée bloquée." }; dessiner(); });
        }, { disabled: fige, "data-f": "confirmer-blocage", id: "pilConfirmerBlocage" }),
        bouton("Annuler", "bouton-fantome", function(){ f.blocage = false; f.raison = ""; f.erreurs = []; dessiner(); },
          { "data-f": "annuler-blocage" })
      ]));
    } else {
      zoneBloc.appendChild(bouton("Bloquer / en attente", "bouton-fantome", function(){
        f.blocage = true; dessiner();
        var r = zone.querySelector("#pilRaison"); if(r) r.focus();
      }, { disabled: fige || statut === "termine", "data-f": "bloquer", id: "pilBloquer" }));
    }
    parts.blocage = (section("Blocage", zoneBloc, statut === "termine" && !bloque ? "Une carte terminée n'a plus rien qui la bloque." : null, invalides.raison_blocage || invalides.bloque));

    /* — LE CONTENU — */
    parts.titre = (champTexte("titre", "Titre", val("titre"), function(v){ changer("titre", v); },
      { maxlength: P.LIMITES.titreMax, id: "pilTitre", required: true, disabled: fige, placeholder: "Ex. : Déclarer l'activité au ministère" }, invalides.titre));

    var segTableau = el("div", { classe: "pil-segment deux", attrs: { role: "group", "aria-label": "Tableau" } });
    P.TABLEAUX.forEach(function(t){
      segTableau.appendChild(bouton(t.libelle, "pil-seg", function(){
        if(t.cle === tableau) return;
        changer("tableau", t.cle);
        var cat = val("categorie");
        if(cat && !(P.CATEGORIES[t.cle] || []).some(function(x){ return x.cle === cat; })) changer("categorie", null);
        dessiner();
      }, { "aria-pressed": String(tableau === t.cle), disabled: fige, "data-f": "fiche-tableau-" + t.cle, "data-tableau": t.cle }));
    });
    parts.tableau = (section("Tableau", segTableau, null, invalides.tableau));

    var select = el("select", { attrs: { id: "pilCategorie", "data-f": "categorie", disabled: fige, "aria-invalid": invalides.categorie ? "true" : null } });
    select.appendChild(el("option", { attrs: { value: "" }, texte: "Sans catégorie (une idée seulement)" }));
    (P.CATEGORIES[tableau] || []).forEach(function(x){
      select.appendChild(el("option", { attrs: { value: x.cle, selected: val("categorie") === x.cle ? true : null }, texte: x.libelle }));
    });
    if(!val("categorie")) select.value = "";
    select.addEventListener("change", function(){ changer("categorie", select.value || null); dessiner(); });
    parts.categorie = (enveloppe("Catégorie", select, "pilCategorie", invalides.categorie));

    var segPrio = el("div", { classe: "pil-segment quatre", attrs: { role: "group", "aria-label": "Priorité" } });
    P.PRIORITES.forEach(function(p){
      segPrio.appendChild(bouton(p.libelle, "pil-seg prio-" + p.cle.toLowerCase(), function(){ changer("priorite", p.cle); dessiner(); },
        { "aria-pressed": String(val("priorite") === p.cle), disabled: fige, "data-f": "prio-" + p.cle, "data-priorite": p.cle }));
    });
    parts.priorite = (section("Priorité", segPrio, libelle(P.PRIORITES.map(function(p){ return { cle: p.cle, libelle: p.sens }; }), val("priorite")), invalides.priorite));

    var resp = champTexte("responsable", "Responsable", val("responsable") || "", function(v){ changer("responsable", v); },
      { maxlength: P.LIMITES.responsable, id: "pilResponsable", disabled: fige, placeholder: "Qui fait avancer la carte ?" }, invalides.responsable);
    var puces = el("div", { classe: "pil-puces", attrs: { role: "group", "aria-label": "Choisir un responsable" } });
    RESPONSABLES.forEach(function(nom){
      puces.appendChild(bouton(nom, "pil-puce", function(){ changer("responsable", nom); dessiner(); },
        { "aria-pressed": String(val("responsable") === nom), disabled: fige, "data-f": "resp-" + nom }));
    });
    resp.appendChild(puces);
    parts.responsable = (resp);

    parts.prochaine = (champTexte("prochaine_action", "Prochaine action", val("prochaine_action") || "", function(v){ changer("prochaine_action", v); },
      { maxlength: P.LIMITES.prochaineAction, id: "pilProchaine", disabled: fige, placeholder: "Le prochain geste concret" }, invalides.prochaine_action));

    var date = el("input", { attrs: { type: "date", id: "pilEcheance", "data-f": "echeance", disabled: fige,
      min: "2020-01-01", max: "2100-12-31", "aria-invalid": invalides.echeance ? "true" : null } });
    date.value = val("echeance") || "";
    date.addEventListener("change", function(){ changer("echeance", date.value || null); dessiner(); });
    var blocDate = enveloppe("Échéance", date, "pilEcheance", invalides.echeance);
    if(val("echeance") && !fige) blocDate.appendChild(bouton("Retirer l'échéance", "pil-lien", function(){ changer("echeance", null); dessiner(); }, { "data-f": "sans-echeance" }));
    parts.echeance = (blocDate);

    var impacts = el("div", { classe: "pil-puces", attrs: { role: "group", "aria-label": "Impacts" } });
    var choisis = val("impacts") || [];
    P.IMPACTS.forEach(function(i){
      var pris = choisis.indexOf(i.cle) !== -1;
      impacts.appendChild(bouton(i.libelle, "pil-puce", function(){
        var l = (val("impacts") || []).slice();
        if(pris) l = l.filter(function(x){ return x !== i.cle; }); else l.push(i.cle);
        changer("impacts", l); dessiner();
      }, { "aria-pressed": String(pris), disabled: fige, "data-f": "impact-" + i.cle, "data-impact": i.cle }));
    });
    parts.impacts = (section("Impacts", impacts, null, invalides.impacts));

    var desc = el("textarea", { attrs: { id: "pilDescription", rows: "4", maxlength: String(P.LIMITES.description), "data-f": "description",
      disabled: fige, placeholder: "Le contexte, ce qu'on sait déjà", "aria-invalid": invalides.description ? "true" : null } });
    desc.value = val("description") || "";
    desc.addEventListener("input", function(){ changer("description", desc.value); majEtat(); });
    parts.description = (enveloppe("Description", desc, "pilDescription", invalides.description));

    parts.criteres = (dessinerCriteres(fige, invalides.checklist));

    var lien = champTexte("lien_github", "Lien GitHub (facultatif)", val("lien_github") || "", function(v){ changer("lien_github", v); },
      { type: "url", inputmode: "url", id: "pilLien", disabled: fige, autocapitalize: "off", spellcheck: "false",
        placeholder: "https://github.com/Barbaros911/As-mine/issues/…" }, invalides.lien_github);
    if(c && c.lien_github) lien.appendChild(el("a", { classe: "pil-lien", attrs: { href: c.lien_github, target: "_blank", rel: "noopener noreferrer" },
      texte: "Ouvrir " + numeroGithub(c.lien_github) + " sur GitHub" }));
    lien.appendChild(el("p", { classe: "pil-aide", texte: "Une Issue ou une PR de ce dépôt. Simple référence : rien n'est synchronisé avec GitHub." }));
    parts.lien = (lien);

    ["titre", "tableau", "categorie", "etape", "blocage", "priorite", "responsable", "prochaine",
     "echeance", "criteres", "impacts", "description", "lien"].forEach(function(k){ ajout(racineFiche, parts[k]); });

    /* — ENREGISTRER — */
    if(!archivee){
      racineFiche.appendChild(el("p", { classe: "pil-etat-saisie", attrs: { id: "pilEtatSaisie", "aria-live": "polite" },
        texte: c ? (modifie() ? "Modifications non enregistrées." : "Tout est enregistré.") : "" }));
      racineFiche.appendChild(bouton(f.envoi ? "Enregistrement…" : c ? "Enregistrer" : "Créer la carte", "bouton pil-enregistrer",
        enregistrer, { "aria-busy": f.envoi ? "true" : null, "data-f": "enregistrer", id: "pilEnregistrer" }));
    }
    if(c && !archivee){
      var arme = f.armeArchive && Date.now() - f.armeArchive < ARME_MAX;
      racineFiche.appendChild(bouton(arme ? "Confirmer l'archivage" : "Archiver la carte", "bouton-fantome rouge pil-archiver", function(){
        var maintenant = Date.now();
        if(f.armeArchive && maintenant - f.armeArchive >= ARME_MIN && maintenant - f.armeArchive < ARME_MAX){
          envoyer({ archivee: true }, function(){ revenirListe({ type: "ok", texte: "Carte archivée. Elle reste dans « Archives » et se restaure." }); });
          return;
        }
        if(f.armeArchive && maintenant - f.armeArchive < ARME_MIN) return;
        f.armeArchive = maintenant; dessiner();
        setTimeout(function(){ if(etat.fiche === f && f.armeArchive === maintenant){ f.armeArchive = 0; dessiner(); } }, ARME_MAX);
      }, { "data-f": "archiver", id: "pilArchiver" }));
      if(arme) racineFiche.appendChild(el("p", { classe: "pil-aide", texte: "La carte quitte le tableau. Rien n'est effacé : elle se restaure depuis « Archives »." }));
    }
    if(c) racineFiche.appendChild(el("p", { classe: "pil-trace", texte: "Créée le " + horodatage(c.cree_le) + " · modifiée le "
      + horodatage(c.modifie_le) + " · version " + c.version }));
    return racineFiche;
  }

  function dessinerCriteres(fige, invalide){
    var f = etat.fiche, liste = (val("checklist") || []).slice();
    var faits = liste.filter(function(x){ return x && x.fait; }).length;
    var boite = el("div", { classe: "pil-criteres" + (invalide ? " pil-invalide" : "") });
    boite.appendChild(el("p", { classe: "pil-section-titre", texte: "Critères de validation" + (liste.length ? " · " + faits + "/" + liste.length : "") }));
    boite.appendChild(el("p", { classe: "pil-aide", texte: "« Terminé » exige qu'ils soient tous cochés. Pour une carte Produit : vérifié en production." }));
    liste.forEach(function(x, i){
      var coche = el("input", { attrs: { type: "checkbox", id: "pilCrit" + i, "data-f": "crit-fait-" + i, disabled: fige } });
      coche.checked = !!x.fait;
      coche.addEventListener("change", function(){
        var l = (val("checklist") || []).map(function(y){ return { texte: y.texte, fait: y.fait }; });
        l[i].fait = coche.checked; changer("checklist", l); dessiner();
      });
      var texte = el("input", { attrs: { type: "text", value: x.texte, maxlength: String(P.LIMITES.critere), "aria-label": "Critère " + (i + 1),
        "data-f": "crit-texte-" + i, disabled: fige } });
      texte.value = x.texte;
      texte.addEventListener("input", function(){
        var l = (val("checklist") || []).map(function(y){ return { texte: y.texte, fait: y.fait }; });
        l[i].texte = texte.value; changer("checklist", l); majEtat();
      });
      boite.appendChild(el("div", { classe: "pil-critere" + (x.fait ? " fait" : "") }, [
        el("label", { classe: "pil-coche", attrs: { "for": "pilCrit" + i, title: x.fait ? "Fait" : "À faire" } }, [coche]),
        texte,
        fige ? null : el("button", { classe: "pil-retirer", attrs: { type: "button", "aria-label": "Retirer le critère " + (i + 1), "data-f": "crit-retirer-" + i },
          clic: function(){
            var l = (val("checklist") || []).filter(function(y, j){ return j !== i; });
            changer("checklist", l); dessiner();
          } }, [icone(CROIX)])
      ]));
    });
    if(!fige && liste.length < P.LIMITES.criteres){
      var nouveau = el("input", { attrs: { type: "text", id: "pilNouveauCritere", maxlength: String(P.LIMITES.critere), "data-f": "crit-nouveau",
        placeholder: "Ajouter un critère", "aria-label": "Nouveau critère" } });
      nouveau.value = f.nouveau || "";
      function ajouter(){
        var t = nouveau.value.trim();
        if(!t) { nouveau.focus(); return; }
        var l = (val("checklist") || []).map(function(y){ return { texte: y.texte, fait: y.fait }; });
        l.push({ texte: t, fait: false });
        f.nouveau = ""; changer("checklist", l); dessiner();
        var n = zone.querySelector("#pilNouveauCritere"); if(n) n.focus();
      }
      nouveau.addEventListener("input", function(){ f.nouveau = nouveau.value; });
      nouveau.addEventListener("keydown", function(ev){ if(ev.key === "Enter"){ ev.preventDefault(); ajouter(); } });
      boite.appendChild(el("div", { classe: "pil-critere nouveau" }, [
        nouveau,
        el("button", { classe: "pil-ajouter", attrs: { type: "button", "aria-label": "Ajouter le critère", "data-f": "crit-ajouter", id: "pilAjouterCritere" },
          clic: ajouter }, [icone(PLUS)])
      ]));
    }
    return boite;
  }

  /* L'état « enregistré / non enregistré » suit la frappe sans tout
     redessiner : redessiner à chaque lettre ferait sauter le clavier. */
  function majEtat(){
    var e = zone && zone.querySelector("#pilEtatSaisie");
    if(e && etat.fiche && etat.fiche.carte) e.textContent = modifie() ? "Modifications non enregistrées." : "Tout est enregistré.";
  }

  function section(titre, contenu, aide, invalide){
    return el("div", { classe: "pil-section" + (invalide ? " pil-invalide" : "") }, [
      el("p", { classe: "pil-section-titre", texte: titre }),
      contenu,
      aide ? el("p", { classe: "pil-aide", texte: aide }) : null
    ]);
  }
  function enveloppe(titre, controle, id, invalide){
    return el("div", { classe: "pil-champ" + (invalide ? " pil-invalide" : "") }, [
      el("label", { classe: "pil-section-titre", attrs: { "for": id }, texte: titre }),
      controle
    ]);
  }
  function champTexte(cle, titre, valeur, surSaisie, attrs, invalide){
    var a = { type: "text", "data-f": "champ-" + cle, "aria-invalid": invalide ? "true" : null };
    for(var k in (attrs || {})) a[k] = attrs[k];
    if(a.maxlength) a.maxlength = String(a.maxlength);
    var input = el("input", { attrs: a });
    input.value = valeur == null ? "" : valeur;
    input.addEventListener("input", function(){ surSaisie(input.value); majEtat(); });
    return enveloppe(titre, input, a.id, invalide);
  }

  function quitterFiche(){
    var f = etat.fiche;
    if(f.envoi) return;
    if(modifie() && !(f.carte && f.carte.archivee)){
      var maintenant = Date.now();
      if(!(f.armeQuitter && maintenant - f.armeQuitter >= ARME_MIN && maintenant - f.armeQuitter < ARME_MAX)){
        if(f.armeQuitter && maintenant - f.armeQuitter < ARME_MIN) return;
        f.armeQuitter = maintenant; dessiner(); window.scrollTo(0, 0);
        return;
      }
    }
    revenirListe(null, f.carte && !f.carte.archivee ? f.carte.id : null);
  }

  /* ═══ L'ENTRÉE ═══
     Appelée par l'admin à chaque ouverture de l'écran. Une fiche laissée
     avec des modifications non enregistrées (on est parti voir une course)
     est retrouvée telle quelle ; sinon on relit le serveur. */
  function ouvrir(cible){
    P = racine.ELA_PILOTAGE;
    zone = cible || document.getElementById("pilZone");
    if(!zone) return;
    ecranRacine = zone.closest ? zone.closest(".ecran") : null;
    if(!P){ zone.textContent = "Le Pilotage n'a pas pu se charger : rechargez la page avec du réseau."; return; }
    if(etat.vue === "fiche" && etat.fiche && modifie()){ dessiner(); return; }
    etat.vue = "liste"; etat.fiche = null; etat.message = null; etat.surligner = null;
    charger();
  }

  racine.ELA_PILOTAGE_ECRAN = { ouvrir: ouvrir };
})(window);
