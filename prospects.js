/* =====================================================================
   LES PROSPECTS — L'ÉCRAN DE L'ADMIN (démo professionnels, bloc 5)
   ---------------------------------------------------------------------
   8 octobre 2026. Un hôtel, une agence ou une entreprise demande la démo
   sur /professionnels/ ; la fonction « demande-demo » écrit une ligne dans
   la table « prospects » (bloc 2). Cet écran la montre à Barbaros pour
   qu'il RAPPELLE : qui, où le joindre, a-t-il ouvert la démo. Ce n'est PAS
   un CRM : un statut, une note, rien d'autre.

   LA BASE EST LA SEULE AUTORITÉ (20261008000000_prospects.sql) : lecture et
   modification réservées à l'admin (est_admin()), et seules les colonnes
   « statut » et « note » s'écrivent. Ce fichier ne lit QUE les colonnes
   accordées (un « select=* » serait refusé : l'empreinte du jeton n'est
   lisible par personne) et n'envoie QUE les champs changés.

   RIEN N'EST LU AU CHARGEMENT DE L'ADMIN : seulement à l'ouverture de
   l'écran et sur « Actualiser ». Aucune minuterie, aucune alerte, aucune
   sauvegarde sur l'appareil — les prospects ne vivent que sur le serveur.

   TOUT EN textContent. Un établissement saisi « <img onerror=…> » par un
   inconnu sur un formulaire public doit s'afficher en texte.

   UNE ERREUR N'EST JAMAIS UNE LISTE VIDE. « Aucun prospect » ne s'écrit
   que sur une réponse lue et vide ; un refus, une session expirée ou un
   serveur muet se disent, avec le geste à faire.

   « Adresse pro » / « Grand public » (domaine_pro, calculé par la base)
   est pour Barbaros seul : il trie ses rappels. Le prospect ne le voit
   jamais — cet écran n'existe que dans l'admin.

   Passe par la connexion de l'admin (window.ELA_NUAGE), comme le Pilotage.
   Chargé par l'admin seulement : la construction le retire des pages
   publiques (construire-espaces-hotel.mjs).
   ===================================================================== */
(function(racine){
  "use strict";

  /* « prenom » (9 octobre 2026) : tant que 20261009000000_prospects_prenom.sql
     n'est pas appliquée, la base répond 400 sur cette colonne ; on relit
     alors sans elle (le nom complet est dans « nom »). */
  var COLONNES = ["id", "cree_le", "type", "etablissement", "prenom", "nom", "fonction", "email",
    "telephone", "langue", "domaine_pro", "email_confirme_le", "demo_ouverte_le",
    "derniere_visite_le", "nb_visites", "statut", "note", "dernier_contact_le"];
  var STATUTS = [
    { cle: "nouveau", libelle: "Nouveau" },
    { cle: "contacte", libelle: "Contacté" },
    { cle: "rendez_vous", libelle: "Rendez-vous" },
    { cle: "partenaire", libelle: "Partenaire" },
    { cle: "sans_suite", libelle: "Sans suite" }
  ];
  var TYPES = { hotel: "Hôtel", agence: "Agence", entreprise: "Entreprise" };
  var NOTE_MAX = 2000;
  /* Au-delà, on le dit : une liste tronquée ne doit pas passer pour complète. */
  var LIMITE = 500;
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var TEL = /^\+[1-9][0-9]{7,14}$/;
  var EMAIL = /^[^\s@<>"'()]+@[^\s@<>"'()]+\.[a-z]{2,}$/i;

  function libelleStatut(cle){
    for(var i = 0; i < STATUTS.length; i++) if(STATUTS[i].cle === cle) return STATUTS[i].libelle;
    return String(cle || "—");
  }

  /* ═══ LES ERREURS, DITES COMME UN GESTE ═══ */
  function erreur(code, message){ var e = new Error(message); e.code = code; return e; }
  function traduire(e){
    if(e && e.code) return e;
    var m = String(e && e.message || "");
    if(/session expiree/.test(m)) return erreur("session", "Session expirée : reconnectez-vous.");
    var c = /nuage (\d{3})/.exec(m);
    if(c && (c[1] === "401" || c[1] === "403"))
      return erreur("acces", "Accès refusé par le serveur (" + c[1] + ") : les prospects sont réservés au compte administrateur.");
    if(c && c[1].charAt(0) === "5")
      return erreur("serveur", "Le serveur ne répond pas correctement (" + c[1] + ") : réessayez dans un instant.");
    if(c) return erreur("refuse", "Le serveur a refusé la demande (" + c[1] + ").");
    if(/renouvellement impossible/.test(m))
      return erreur("serveur", "La session n'a pas pu être renouvelée : vérifiez le réseau, puis réessayez.");
    return erreur("reseau", "Serveur injoignable : vérifiez le réseau, puis réessayez.");
  }

  /* Appris une fois pour toute la page : sans lui, chaque écriture
     redemanderait la colonne absente et paierait un aller-retour refusé. */
  var sansPrenom = false;

  /* ═══ LE CLIENT — deux appels, rien d'autre ═══ */
  function client(nuage){
    if(!nuage || typeof nuage.appel !== "function") throw erreur("absent", "Connexion au serveur absente : rechargez la page.");
    function pret(){
      if(typeof nuage.connecte === "function" && !nuage.connecte())
        return Promise.reject(erreur("session", "Pas de session : connectez-vous avec le compte administrateur."));
      return null;
    }
    function colonnes(){
      return (sansPrenom ? COLONNES.filter(function(c){ return c !== "prenom"; }) : COLONNES).join(",");
    }
    /* Un 400 sur la lecture avec « prenom » : la colonne n'existe pas encore. */
    function avecRepli(faire){
      return faire().catch(function(e){
        if(!sansPrenom && /nuage 400/.test(String(e && e.message || ""))){
          sansPrenom = true;
          return faire();
        }
        throw e;
      });
    }
    return {
      lister: function(){
        return pret() || avecRepli(function(){
          return nuage.appel("/rest/v1/prospects?select=" + colonnes()
            + "&order=cree_le.desc&limit=" + LIMITE);
        })
          .then(function(r){
            if(!Array.isArray(r)) throw erreur("illisible", "Réponse du serveur illisible : réessayez.");
            return r;
          }, function(e){ throw traduire(e); });
      },
      /* « champs » ne porte que ce qui a changé ; on refiltre quand même ici :
         la base n'accepte que statut et note, et rien d'autre ne doit partir. */
      modifier: function(id, champs){
        if(!UUID.test(String(id || ""))) return Promise.reject(erreur("introuvable", "Prospect introuvable."));
        var corps = {};
        if(Object.prototype.hasOwnProperty.call(champs, "statut")) corps.statut = champs.statut;
        if(Object.prototype.hasOwnProperty.call(champs, "note")) corps.note = champs.note;
        if(!Object.keys(corps).length) return Promise.resolve(null);
        return pret() || avecRepli(function(){
          return nuage.appel("/rest/v1/prospects?id=eq." + id + "&select=" + colonnes(), {
            method: "PATCH", body: JSON.stringify(corps),
            headers: { Prefer: "return=representation" }
          });
        }).then(function(r){
          if(!Array.isArray(r) || r.length !== 1)
            throw erreur("introuvable", "Le serveur n'a rien modifié : ce prospect n'est plus accessible. Actualisez.");
          return r[0];
        }, function(e){ throw traduire(e); });
      }
    };
  }

  /* ═══ LES PETITS OUTILS DE DESSIN — textContent seulement ═══ */
  function el(tag, classe, texte){
    var n = document.createElement(tag);
    if(classe) n.className = classe;
    if(texte != null) n.textContent = String(texte);
    return n;
  }
  function lien(href, texte, classe, externe){
    var a = el("a", classe, texte);
    a.setAttribute("href", href);
    if(externe){ a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener noreferrer"); }
    return a;
  }
  function quand(iso){
    if(!iso) return "";
    var d = new Date(iso);
    if(isNaN(d)) return "";
    try{
      return d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" })
        + " à " + d.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
    }catch(e){ return d.toISOString().slice(0, 16).replace("T", " "); }
  }
  /* +33612345678 → +33 6 12 34 56 78 ; un autre pays reste lisible tel quel. */
  function telLisible(t){
    var s = String(t || "");
    var fr = /^\+33([1-9])(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(s);
    return fr ? "+33 " + fr.slice(1).join(" ") : s;
  }

  /* ═══ L'ÉCRAN ═══ */
  var etat = { liste: null, erreur: null, chargement: false, filtre: "tous",
               brouillons: {}, gardes: {}, messages: {}, lu: null, zone: null, envois: {} };

  function compter(liste){
    var n = { tous: liste.length };
    STATUTS.forEach(function(s){ n[s.cle] = 0; });
    liste.forEach(function(p){ if(n[p.statut] != null) n[p.statut]++; });
    return n;
  }
  function parEmail(liste){
    var m = {};
    liste.forEach(function(p){ var k = String(p.email || ""); m[k] = (m[k] || 0) + 1; });
    return m;
  }

  function dessiner(){
    var zone = etat.zone;
    if(!zone) return;
    while(zone.firstChild) zone.removeChild(zone.firstChild);

    var tete = el("div", "prs-tete");
    var resume = el("p", "prs-resume");
    resume.setAttribute("role", "status");
    if(etat.chargement) resume.textContent = "Lecture des prospects…";
    else if(etat.liste) resume.textContent = etat.liste.length + (etat.liste.length > 1 ? " demandes" : " demande")
      + (etat.lu ? " · lu à " + etat.lu : "");
    tete.appendChild(resume);
    var act = el("button", "bouton-fantome prs-actualiser", "Actualiser");
    act.type = "button";
    act.id = "prsActualiser";
    act.disabled = etat.chargement;
    act.addEventListener("click", function(){ charger(); });
    tete.appendChild(act);
    zone.appendChild(tete);

    if(etat.erreur){
      var bandeau = el("div", "prs-erreur");
      bandeau.setAttribute("role", "alert");
      bandeau.appendChild(el("p", null, etat.erreur.message));
      if(etat.liste) bandeau.appendChild(el("p", "prs-erreur-aide", "La liste ci-dessous est celle de la dernière lecture réussie."));
      zone.appendChild(bandeau);
    }
    if(!etat.liste) return;

    if(etat.liste.length >= LIMITE)
      zone.appendChild(el("p", "prs-aide", "Seules les " + LIMITE + " demandes les plus récentes sont affichées."));

    var n = compter(etat.liste);
    var filtres = el("div", "prs-filtres");
    filtres.setAttribute("role", "group");
    filtres.setAttribute("aria-label", "Filtrer par statut");
    [{ cle: "nouveau", libelle: "Nouveaux" }, { cle: "tous", libelle: "Tous" }]
      .concat(STATUTS.filter(function(s){ return s.cle !== "nouveau"; }))
      .forEach(function(f){
        var b = el("button", "prs-filtre" + (f.cle === "nouveau" ? " prs-filtre-nouveaux" : "")
          + (etat.filtre === f.cle ? " actif" : ""));
        b.type = "button";
        b.dataset.filtre = f.cle;
        b.setAttribute("aria-pressed", etat.filtre === f.cle ? "true" : "false");
        b.appendChild(el("span", "prs-filtre-nb", n[f.cle] || 0));
        b.appendChild(el("span", null, f.libelle));
        b.addEventListener("click", function(){ etat.filtre = f.cle; etat.gardes = {}; dessiner(); });
        filtres.appendChild(b);
      });
    zone.appendChild(filtres);

    var visibles = etat.liste.filter(function(p){
      return etat.filtre === "tous" || p.statut === etat.filtre || etat.gardes[p.id];
    });
    if(!visibles.length){
      zone.appendChild(el("p", "prs-vide", etat.liste.length
        ? "Aucun prospect avec ce statut."
        : "Aucune demande de démo pour l'instant."));
      return;
    }
    var emails = parEmail(etat.liste);
    var ul = el("ul", "prs-liste");
    visibles.forEach(function(p){ ul.appendChild(carte(p, emails)); });
    zone.appendChild(ul);
  }

  function fait(etiquette, valeur, classe){
    var li = el("li", classe || null);
    li.appendChild(el("span", "prs-fait-lib", etiquette));
    li.appendChild(el("span", "prs-fait-val", valeur));
    return li;
  }

  /* « Prénom Nom » ; un prospect d'avant le 9 octobre n'a pas de prénom, son
     « nom » est déjà le nom complet. */
  function nomComplet(p){
    return (p.prenom ? p.prenom + " " : "") + (p.nom || "");
  }

  function carte(p, emails){
    var li = el("li", "prs-carte" + (p.statut === "nouveau" ? " prs-nouveau" : ""));
    li.dataset.id = p.id;

    var haut = el("div", "prs-haut");
    haut.appendChild(el("h3", "prs-etab", p.etablissement));
    var pastilles = el("div", "prs-pastilles");
    pastilles.appendChild(el("span", "prs-pastille", TYPES[p.type] || p.type || "—"));
    pastilles.appendChild(el("span", "prs-pastille " + (p.domaine_pro ? "prs-pro" : "prs-gp"),
      p.domaine_pro ? "Adresse pro" : "Grand public"));
    if(p.langue === "en") pastilles.appendChild(el("span", "prs-pastille", "Anglais"));
    haut.appendChild(pastilles);
    li.appendChild(haut);

    li.appendChild(el("p", "prs-qui", nomComplet(p) + (p.fonction ? " · " + p.fonction : "")));

    var contact = el("div", "prs-contact");
    var tel = String(p.telephone || "");
    if(TEL.test(tel)){
      contact.appendChild(lien("tel:" + tel, telLisible(tel), "prs-tel"));
      contact.appendChild(lien("https://wa.me/" + tel.slice(1), "WhatsApp", "prs-bouton prs-wa", true));
    } else if(tel){
      contact.appendChild(el("span", "prs-tel", tel));
    }
    var mail = String(p.email || "");
    if(EMAIL.test(mail)) contact.appendChild(lien("mailto:" + mail, mail, "prs-mail"));
    else if(mail) contact.appendChild(el("span", "prs-mail", mail));
    li.appendChild(contact);

    var faits = el("ul", "prs-faits");
    faits.appendChild(fait("Demande", quand(p.cree_le) || "—"));
    faits.appendChild(fait("E-mail confirmé", p.email_confirme_le ? "oui, le " + quand(p.email_confirme_le) : "non",
      p.email_confirme_le ? "prs-oui" : "prs-non"));
    if(p.demo_ouverte_le){
      var nb = Number(p.nb_visites) || 0;
      faits.appendChild(fait("Démo", "ouverte le " + quand(p.demo_ouverte_le)
        + " · " + nb + (nb > 1 ? " visites" : " visite"), "prs-oui"));
      if(p.derniere_visite_le) faits.appendChild(fait("Dernière visite", quand(p.derniere_visite_le)));
    } else {
      faits.appendChild(fait("Démo", "jamais ouverte", "prs-non"));
    }
    var autres = (emails[String(p.email || "")] || 1) - 1;
    if(autres > 0) faits.appendChild(fait("Même adresse", autres + (autres > 1 ? " autres demandes" : " autre demande")));
    li.appendChild(faits);

    li.appendChild(edition(p));
    return li;
  }

  /* ═══ LE STATUT ET LA NOTE ═══
     La saisie vit dans « brouillons » tant qu'elle n'est pas enregistrée :
     « Actualiser » ou un changement de filtre redessinent la liste, et ne
     doivent pas effacer une note qu'on était en train d'écrire. */
  function edition(p){
    var b = etat.brouillons[p.id] || {};
    var bloc = el("div", "prs-edition");

    var idS = "prsStatut-" + p.id, idN = "prsNote-" + p.id;
    var labS = el("label", "prs-lib", "Statut");
    labS.setAttribute("for", idS);
    var sel = el("select", "prs-statut");
    sel.id = idS;
    STATUTS.forEach(function(s){
      var o = el("option", null, s.libelle);
      o.value = s.cle;
      sel.appendChild(o);
    });
    sel.value = b.statut != null ? b.statut : p.statut;

    var labN = el("label", "prs-lib", "Note");
    labN.setAttribute("for", idN);
    var note = el("textarea", "prs-note");
    note.id = idN;
    note.rows = 2;
    note.maxLength = NOTE_MAX;
    note.placeholder = "Rappeler mardi, intéressé par le QR…";
    note.value = b.note != null ? b.note : (p.note || "");

    var pied = el("div", "prs-pied");
    var msg = el("p", "prs-msg");
    msg.setAttribute("aria-live", "polite");
    var enr = el("button", "bouton prs-enregistrer", "Enregistrer");
    enr.type = "button";
    pied.appendChild(msg);
    pied.appendChild(enr);

    function changes(){
      var c = {};
      if(sel.value !== p.statut) c.statut = sel.value;
      var n = note.value.trim();
      if(n !== String(p.note || "").trim()) c.note = n ? n : null;
      return c;
    }
    function juger(){
      var c = changes(), vide = !Object.keys(c).length;
      if(vide) delete etat.brouillons[p.id];
      else etat.brouillons[p.id] = { statut: sel.value, note: note.value };
      enr.disabled = vide || !!etat.envois[p.id];
      var m = etat.messages[p.id];
      msg.className = "prs-msg" + (m && m.erreur ? " prs-msg-erreur" : "");
      msg.textContent = m ? m.texte : (vide ? "" : "Modification non enregistrée.");
      if(note.value.length > NOTE_MAX - 200)
        msg.textContent = note.value.length + " / " + NOTE_MAX + " caractères" + (vide ? "" : " · non enregistré");
    }
    sel.addEventListener("change", function(){ delete etat.messages[p.id]; juger(); });
    note.addEventListener("input", function(){ delete etat.messages[p.id]; juger(); });
    enr.addEventListener("click", function(){
      var c = changes();
      if(!Object.keys(c).length) return;
      if(c.note && c.note.length > NOTE_MAX){
        etat.messages[p.id] = { texte: "La note dépasse " + NOTE_MAX + " caractères.", erreur: true };
        juger(); return;
      }
      etat.envois[p.id] = true;
      enr.disabled = true;
      msg.className = "prs-msg";
      msg.textContent = "Enregistrement…";
      var cli;
      try{ cli = client(racine.ELA_NUAGE); }catch(e){
        delete etat.envois[p.id];
        etat.messages[p.id] = { texte: e.message, erreur: true }; juger(); return;
      }
      cli.modifier(p.id, c).then(function(apres){
        delete etat.envois[p.id];
        delete etat.brouillons[p.id];
        if(apres) for(var i = 0; i < etat.liste.length; i++) if(etat.liste[i].id === p.id) etat.liste[i] = apres;
        /* Un prospect qu'on vient de passer « Contacté » sous le filtre
           « Nouveaux » reste sous les yeux jusqu'au prochain filtre :
           sa carte ne disparaît pas sous le doigt. */
        etat.gardes[p.id] = true;
        etat.messages[p.id] = { texte: "Enregistré." };
        dessiner();
      }, function(e){
        delete etat.envois[p.id];
        etat.messages[p.id] = { texte: (e && e.message) || "Rien n'a été enregistré.", erreur: true };
        if(etat.zone && etat.zone.contains(enr)) juger();
      });
    });
    juger();

    bloc.appendChild(labS); bloc.appendChild(sel);
    bloc.appendChild(labN); bloc.appendChild(note);
    bloc.appendChild(pied);
    return bloc;
  }

  function charger(){
    if(etat.chargement) return;
    /* L'agent n'a pas d'entrée vers cet écran ; s'il y arrivait quand même,
       la base lui rendrait une liste VIDE (la policy filtre, elle ne refuse
       pas) — et « aucun prospect » serait un mensonge. On le dit. */
    if(racine.ELA_ROLE === "agent_reservation"){
      etat.liste = null;
      etat.erreur = erreur("acces", "Les prospects sont réservés au compte administrateur.");
      dessiner(); return;
    }
    var cli;
    try{ cli = client(racine.ELA_NUAGE); }catch(e){ etat.erreur = e; dessiner(); return; }
    etat.chargement = true;
    etat.erreur = null;
    etat.messages = {};
    dessiner();
    cli.lister().then(function(l){
      etat.liste = l;
      etat.gardes = {};
      try{ etat.lu = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }catch(e){ etat.lu = null; }
    }, function(e){
      etat.erreur = e && e.message ? e : traduire(e);
    }).then(function(){ etat.chargement = false; dessiner(); });
  }

  function ouvrir(zone){
    if(!zone) return;
    etat.zone = zone;
    charger();
  }

  racine.ELA_PROSPECTS = { ouvrir: ouvrir, client: client, STATUTS: STATUTS, COLONNES: COLONNES };
})(typeof window !== "undefined" ? window : globalThis);
