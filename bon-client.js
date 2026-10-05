/* =====================================================================
   LE BON DU CLIENT — UN SEUL DESSIN, POUR LA RÉCEPTION ET POUR L'ADMIN
   ---------------------------------------------------------------------
   5 octobre 2026, à la demande de Barbaros : « la réception n'a pas besoin
   d'envoyer de bons, on peut juste afficher le bon […] que le client peut
   recevoir quand moi je vais oublier d'envoyer », et « les bons que voit
   la réception doivent être les mêmes chez moi ».

   IL Y AVAIT TROIS DESSINS : le bon du site, l'image fabriquée pour la
   réception, la fiche de l'admin. Trois dessins d'une même course finissent
   par dire trois choses différentes. Celui-ci est le seul, dans le seul
   fichier que chargent la réception et l'admin — même raison que
   « telephone.js ».

   IL S'AFFICHE, IL NE PART NULLE PART. La réception tourne l'écran vers le
   client ; c'est Elatransfer qui envoie la confirmation. Rien de ce qui est
   dessiné ici ne quitte l'appareil.

   LE NOM ET LE TÉLÉPHONE DU CLIENT SONT EN TÊTE, EN GROS (à sa demande).
   C'est un bon AFFICHÉ, à la réception ou dans l'admin : jamais un lien.
   Le lien « ?ok= » envoyé au client, lui, ne les porte toujours pas — un
   lien se transfère.

   TOUT EST POSÉ EN textContent : un nom ou une adresse tapés au comptoir ne
   doivent jamais devenir du HTML. Les couleurs sont FIXES : le bon ne
   prend pas la couleur d'un partenaire (décision du 24/09/2026).
   ===================================================================== */
(function(racine){
  "use strict";
  var doc = racine.document;
  var TEL_ELA = "+33 7 59 31 24 33", TEL_ELA_LIEN = "tel:+33759312433";
  /* LE CLIENT A LE CHOIX DU CANAL (5 octobre 2026, à sa demande : « pas
     seulement le numéro de téléphone seul »). Le numéro est écrit EN CLAIR
     en plus des boutons : sur le PC d'un hôtel, le client lit l'écran, il
     ne peut pas cliquer dessus. Telegram ne s'affiche que s'il est rempli —
     on ne pose pas un lien qu'on n'a pas pu éprouver. */
  var WHATSAPP_ELA = "https://wa.me/33759312433";
  var TELEGRAM_ELA = "https://t.me/elatransfer", TELEGRAM_NOM = "@elatransfer";

  var TXT = {
    fr: { titre:"Bon de réservation", ref:"Réf.", client:"Client", chambre:"Chambre",
          quand:"Date et heure", depart:"Départ", arrivee:"Arrivée", vehicule:"Véhicule",
          passagers:"passager(s)", paiement:"Paiement", chauffeur:"Chauffeur",
          prixAnnonce:"Prix annoncé", prixFerme:"Prix ferme", prix:"Prix",
          aConfirmer:"À confirmer", payeChauffeur:"Réglé directement au chauffeur",
          confirmation:"La confirmation vous sera envoyée par Elatransfer.",
          question:"Une question ? Elatransfer vous répond", canaux:"Appel et WhatsApp",
          canauxTg:"Appel, WhatsApp — Telegram ", appeler:"Appeler", fermer:"Fermer", sansNom:"Client non nommé", a:" à ",
          etats:{ attente:"Demande reçue", confirmee:"Confirmé", realisee:"Effectuée",
                  refusee:"Non prise", annulee:"Annulée" } },
    en: { titre:"Booking voucher", ref:"Ref.", client:"Guest", chambre:"Room",
          quand:"Date & time", depart:"Pick-up", arrivee:"Drop-off", vehicule:"Vehicle",
          passagers:"passenger(s)", paiement:"Payment", chauffeur:"Driver",
          prixAnnonce:"Quoted price", prixFerme:"Firm price", prix:"Price",
          aConfirmer:"To be confirmed", payeChauffeur:"Paid directly to the driver",
          confirmation:"Your confirmation will be sent by Elatransfer.",
          question:"Questions? Elatransfer is here to help", canaux:"Call and WhatsApp",
          canauxTg:"Call, WhatsApp — Telegram ", appeler:"Call", fermer:"Close", sansNom:"Unnamed guest", a:" at ",
          etats:{ attente:"Request received", confirmee:"Confirmed", realisee:"Completed",
                  refusee:"Not taken", annulee:"Cancelled" } }
  };
  var PAIEMENTS = { carte:{fr:"Carte bancaire", en:"Card"}, especes:{fr:"Espèces", en:"Cash"} };

  /* ═══ DEUX FORMES DE COURSE, UNE SEULE FORME DE BON ═══
     La réception reçoit une ligne aplatie du serveur (courses-hotel) ; l'admin
     et l'écran qui suit une réservation tiennent le bon complet. Les deux
     traductions vivent ICI, à côté du dessin qui les lit. */
  function premier(){ for(var i = 0; i < arguments.length; i++) if(arguments[i]) return arguments[i]; return ""; }
  function chauffeurSiAttribue(statut, ch){
    /* Avant la confirmation, un nom écrit sur une course n'est qu'un pense-
       bête : l'afficher promettrait une voiture que personne n'a acceptée. */
    return (statut === "confirmee" || statut === "realisee") && ch && ch.nom ? ch : null;
  }
  var FINIS = { realisee:1, refusee:1, annulee:1 };
  function depuisListe(c){
    c = c || {};
    /* UNE COURSE FINIE N'A PLUS DE PRIX CÔTÉ RÉCEPTION (décision du
       30/09/2026). Le serveur ne l'envoie plus ; s'il arrivait quand même,
       le bon ne le dessinerait pas — seconde défense, comme la liste. */
    return { ref:c.ref, numero:c.numero, statut:c.statut || "attente", date:c.date, heure:c.heure,
             depart:c.depart, arrivee:c.arrivee, vehicule:c.vehicule, passagers:c.passagers,
             prix:FINIS[c.statut] ? undefined : c.prix, paiement:c.paiement, nom:c.client, tel:c.tel, chambre:c.chambre,
             chauffeur:chauffeurSiAttribue(c.statut, c.chauffeur) };
  }
  function depuisRegistre(b){
    b = b || {};
    var co = b.course || {}, cl = b.client || {};
    var prix = b.prix && typeof b.prix.total === "number" ? b.prix.total : undefined;
    if(b.tarifAConfirmer) prix = 0;
    return { ref:b.ref, numero:b.numero, statut:b.statut || "attente", date:co.date, heure:co.heure,
             depart:premier(co.departPublic, co.depart), arrivee:premier(co.arriveePublic, co.arrivee),
             vehicule:co.vehicule, passagers:co.passagers, prix:prix,
             paiement:premier(b.paiementNom, b.paiement), nom:cl.nom, tel:cl.telephone,
             chambre:co.chambre, chauffeur:chauffeurSiAttribue(b.statut, b.chauffeur) };
  }

  function quand(b, L, langue){
    var d = new Date((b.date || "") + "T" + (b.heure || "00:00"));
    if(isNaN(d.getTime())) return ((b.date || "") + " " + (b.heure || "")).trim() || "—";
    var j = d.toLocaleDateString(langue === "en" ? "en-GB" : "fr-FR",
      { weekday:"long", day:"numeric", month:"long", year:"numeric" });
    return j.charAt(0).toUpperCase() + j.slice(1) + (b.heure ? L.a + b.heure : "");
  }
  function euros(n, langue){
    return n.toLocaleString(langue === "en" ? "en-GB" : "fr-FR",
      { minimumFractionDigits:2, maximumFractionDigits:2 }) + " €";
  }
  function paiementLu(p, langue){
    var cle = String(p || "").toLowerCase();
    if(PAIEMENTS[cle]) return PAIEMENTS[cle][langue];
    if(/carte|card/.test(cle)) return PAIEMENTS.carte[langue];
    if(/esp|cash/.test(cle)) return PAIEMENTS.especes[langue];
    return p || "";
  }
  /* Le libellé enregistré peut porter la chambre (« …, (ch. 214) ») : elle
     a sa propre ligne, on ne la répète pas dans l'adresse. */
  function lieu(t){ return String(t || "—").replace(/\s*\(ch\.[^)]*\)\s*$/, ""); }

  function el(tag, classe, texte){
    var e = doc.createElement(tag);
    if(classe) e.className = classe;
    if(texte != null) e.textContent = texte;
    return e;
  }

  /* LE BON, EN ÉLÉMENT. Rendu à part de la fenêtre pour pouvoir le poser
     ailleurs le jour où il le faudra — et pour qu'un test le lise. */
  function element(b, langue){
    langue = langue === "en" ? "en" : "fr";
    var L = TXT[langue], statut = b.statut || "attente";
    var fini = statut === "realisee" || statut === "refusee" || statut === "annulee";
    var bon = el("article", "ebon");
    bon.setAttribute("lang", langue);
    bon.dataset.ref = b.ref || "";

    var tete = el("header", "ebon-tete");
    var logo = el("img", "ebon-logo");
    logo.src = "brand-logo.webp"; logo.alt = "Elatransfer";
    tete.appendChild(logo);
    tete.appendChild(el("span", "ebon-etat " + statut, L.etats[statut] || L.etats.attente));
    tete.appendChild(el("p", "ebon-titre", L.titre));
    tete.appendChild(el("p", "ebon-ref", b.numero ? "N° " + b.numero : (b.ref || "")));
    if(b.numero && b.ref) tete.appendChild(el("p", "ebon-ref-tech", L.ref + " " + b.ref));
    bon.appendChild(tete);

    /* LE CLIENT EN PREMIER, ET EN GROS : c'est ce que la réception cherche
       des yeux quand le client est devant elle. */
    var qui = el("section", "ebon-client");
    qui.appendChild(el("p", "ebon-lib", L.client));
    qui.appendChild(el("p", "ebon-nom", b.nom || L.sansNom));
    if(b.tel){
      var tel = el("a", "ebon-tel", b.tel);
      tel.href = "tel:" + String(b.tel).replace(/[^\d+]/g, "");
      qui.appendChild(tel);
    }
    if(b.chambre) qui.appendChild(el("p", "ebon-chambre", L.chambre + " " + b.chambre));
    bon.appendChild(qui);

    var lignes = el("dl", "ebon-lignes");
    function ligne(lib, val){
      if(!val) return;
      lignes.appendChild(el("dt", null, lib));
      lignes.appendChild(el("dd", null, val));
    }
    ligne(L.quand, quand(b, L, langue));
    ligne(L.depart, lieu(b.depart));
    ligne(L.arrivee, lieu(b.arrivee));
    /* Le registre range « 2 passagers » en toutes lettres, la liste un
       simple nombre : on n'ajoute le mot qu'à un nombre nu. */
    var pax = b.passagers == null ? "" : String(b.passagers).trim();
    if(/^\d+$/.test(pax)) pax += " " + L.passagers;
    ligne(L.vehicule, [b.vehicule, pax].filter(Boolean).join(" · "));
    ligne(L.paiement, paiementLu(b.paiement, langue));
    if(b.chauffeur){
      ligne(L.chauffeur, b.chauffeur.nom + (b.chauffeur.telephone ? " · " + b.chauffeur.telephone : ""));
    }
    bon.appendChild(lignes);

    /* LE PRIX. « Ferme » seulement une fois la course confirmée : les CGV
       (art. 3 et 4) disent que le prix devient ferme à la confirmation.
       Une course finie lue par la réception n'a plus de prix (le serveur ne
       l'envoie plus) : on ne dessine rien, pas un « — » qui dirait qu'un
       chiffre existe et qu'on le cache. */
    if(typeof b.prix === "number" && statut !== "refusee" && statut !== "annulee"){
      var p = el("div", "ebon-prix");
      p.appendChild(el("span", null, b.prix > 0
        ? (statut === "attente" ? L.prixAnnonce : statut === "confirmee" ? L.prixFerme : L.prix)
        : L.prix));
      p.appendChild(el("b", null, b.prix > 0 ? euros(b.prix, langue) : L.aConfirmer));
      bon.appendChild(p);
      if(b.prix > 0) bon.appendChild(el("p", "ebon-regle", L.payeChauffeur));
    }

    /* LA PHRASE QUE LA RÉCEPTION DOIT DIRE, ÉCRITE SUR LE BON MÊME (à sa
       demande) : c'est Elatransfer qui confirme, pas l'hôtel. */
    if(!fini) bon.appendChild(el("p", "ebon-confirmation", L.confirmation));
    var pied = el("section", "ebon-contact");
    pied.appendChild(el("p", "ebon-contact-titre", L.question));
    pied.appendChild(el("p", "ebon-contact-num", TEL_ELA));
    /* L'identifiant Telegram est ÉCRIT, comme le numéro : sur le PC de
       l'hôtel le client le recopie, il ne clique pas. */
    pied.appendChild(el("p", "ebon-contact-canaux", TELEGRAM_ELA ? L.canauxTg + TELEGRAM_NOM : L.canaux));
    var liens = el("div", "ebon-contact-liens");
    function canal(texte, href, classe){
      var a = el("a", "ebon-canal " + classe, texte); a.href = href;
      if(/^https?:/.test(href)){ a.target = "_blank"; a.rel = "noopener"; }
      liens.appendChild(a);
    }
    canal(L.appeler, TEL_ELA_LIEN, "tel");
    canal("WhatsApp", WHATSAPP_ELA, "wa");
    if(TELEGRAM_ELA) canal("Telegram", TELEGRAM_ELA, "tg");
    pied.appendChild(liens);
    bon.appendChild(pied);
    return bon;
  }

  var STYLE = ""
    + ".ebon-fenetre{position:fixed;inset:0;z-index:1000;display:flex;align-items:flex-start;justify-content:center;"
    +   "padding:12px;overflow-y:auto;background:rgba(6,23,38,.62);}"
    + ".ebon-fenetre[hidden]{display:none;}"
    + ".ebon-boite{width:100%;max-width:440px;margin:auto 0;}"
    + ".ebon-barre{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:0 0 10px;}"
    + ".ebon-langues{display:flex;gap:4px;padding:3px;border-radius:999px;background:#fff;}"
    + ".ebon-langues button{min-width:44px;min-height:36px;border:0;border-radius:999px;background:none;"
    +   "font-family:inherit;font-size:13px;font-weight:700;color:#14344e;cursor:pointer;}"
    + ".ebon-langues button[aria-pressed=true]{background:#062f55;color:#fff;}"
    + ".ebon-fermer{min-height:40px;padding:0 18px;border:0;border-radius:999px;background:#fff;color:#14344e;"
    +   "font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;}"
    + ".ebon{background:#fff;color:#14344e;border-radius:22px;padding:16px 20px 14px;"
    +   "box-shadow:0 18px 40px rgba(6,47,85,.25);font-family:inherit;}"
    + ".ebon-tete{text-align:center;padding:0 0 10px;border-bottom:1px solid #dbe6ed;}"
    + ".ebon-logo{display:block;width:96px;height:auto;margin:0 auto 8px;}"
    + ".ebon-etat{display:inline-block;padding:5px 14px;border-radius:999px;background:#6B7780;color:#fff;"
    +   "font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;}"
    + ".ebon-etat.confirmee,.ebon-etat.realisee{background:#0E5FA8;}"
    + ".ebon-etat.refusee,.ebon-etat.annulee{background:#fff;color:#5A6A7B;box-shadow:inset 0 0 0 1px #c9d4dd;}"
    + ".ebon-titre{margin:6px 0 0;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6f7f8b;}"
    + ".ebon-ref{margin:0;font-size:24px;font-weight:800;letter-spacing:.02em;}"
    + ".ebon-ref-tech{margin:2px 0 0;font-size:12px;color:#6f7f8b;}"
    + ".ebon-client{margin:12px 0 2px;padding:10px 14px;border-radius:16px;background:#EAF3FC;"
    +   "border-left:5px solid #0E5FA8;}"
    + ".ebon-lib{margin:0;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#0B4F8C;}"
    + ".ebon-nom{margin:4px 0 0;font-size:24px;line-height:1.2;font-weight:800;color:#062f55;overflow-wrap:anywhere;}"
    + ".ebon-tel{display:inline-block;margin:6px 0 0;font-size:22px;font-weight:800;color:#0B4F8C;"
    +   "text-decoration:none;letter-spacing:.02em;}"
    + ".ebon-chambre{margin:6px 0 0;font-size:16px;font-weight:700;color:#062f55;}"
    + ".ebon-lignes{margin:10px 0 0;display:grid;grid-template-columns:auto 1fr;gap:6px 14px;}"
    + ".ebon-lignes dt{font-size:13px;color:#6f7f8b;font-weight:600;}"
    + ".ebon-lignes dd{margin:0;font-size:15px;font-weight:700;overflow-wrap:anywhere;}"
    + ".ebon-prix{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:12px 0 0;"
    +   "padding:10px 14px;border-radius:14px;background:#F2F5F9;}"
    + ".ebon-prix span{font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;}"
    + ".ebon-prix b{font-size:24px;font-weight:800;}"
    + ".ebon-regle{margin:6px 0 0;font-size:12px;color:#6f7f8b;text-align:right;}"
    + ".ebon-confirmation{margin:10px 0 0;padding:10px 14px;border-radius:12px;background:#062f55;color:#fff;"
    +   "font-size:15px;font-weight:700;text-align:center;}"
    + ".ebon-contact{margin:10px 0 0;padding:10px 12px;border-radius:14px;background:#F2F5F9;text-align:center;}"
    + ".ebon-contact-titre{margin:0;font-size:13px;font-weight:700;color:#5A6A7B;}"
    + ".ebon-contact-num{margin:4px 0 0;font-size:22px;font-weight:800;color:#062f55;letter-spacing:.02em;}"
    + ".ebon-contact-canaux{margin:2px 0 0;font-size:13px;color:#5A6A7B;}"
    + ".ebon-contact-liens{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:8px 0 0;}"
    + ".ebon-canal{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 16px;"
    +   "border-radius:999px;font-size:14px;font-weight:700;text-decoration:none;color:#fff;background:#0E5FA8;}"
    + ".ebon-canal.wa{background:#128C4A;}"
    + ".ebon-canal.tg{background:#1B75A8;}";

  var fenetre = null, courant = null, langueCourante = "fr", retourFocus = null;
  function poserStyle(){
    if(doc.getElementById("ebonStyle")) return;
    var s = doc.createElement("style"); s.id = "ebonStyle"; s.textContent = STYLE;
    doc.head.appendChild(s);
  }
  function fermer(){
    if(!fenetre || fenetre.hidden) return;
    fenetre.hidden = true;
    if(retourFocus && retourFocus.focus) try{ retourFocus.focus(); }catch(e){}
  }
  function dessiner(){
    var boite = fenetre.querySelector(".ebon-boite");
    var ancien = boite.querySelector(".ebon");
    if(ancien) ancien.remove();
    boite.appendChild(element(courant, langueCourante));
    fenetre.querySelectorAll(".ebon-langues button").forEach(function(x){
      x.setAttribute("aria-pressed", x.dataset.langue === langueCourante ? "true" : "false");
    });
    fenetre.querySelector(".ebon-fermer").textContent = TXT[langueCourante].fermer;
    fenetre.setAttribute("aria-label", TXT[langueCourante].titre + " " + (courant.ref || ""));
  }
  /* LA FENÊTRE. Une bascule FR / EN dans le bon lui-même : le comptoir
     travaille en français, le client devant lui est souvent étranger, et
     changer toute la page pour lui montrer son bon serait un détour. */
  function ouvrir(b, langue){
    poserStyle();
    if(!fenetre){
      fenetre = el("div", "ebon-fenetre");
      fenetre.id = "bonClient";
      fenetre.setAttribute("role", "dialog");
      fenetre.setAttribute("aria-modal", "true");
      fenetre.hidden = true;
      var boite = el("div", "ebon-boite");
      var barre = el("div", "ebon-barre");
      var langues = el("div", "ebon-langues");
      [["fr","FR"],["en","EN"]].forEach(function(x){
        var bt = el("button", null, x[1]); bt.type = "button"; bt.dataset.langue = x[0];
        bt.addEventListener("click", function(){ langueCourante = x[0]; dessiner(); });
        langues.appendChild(bt);
      });
      var f = el("button", "ebon-fermer"); f.type = "button"; f.id = "bonClientFermer";
      f.addEventListener("click", fermer);
      barre.appendChild(langues); barre.appendChild(f);
      boite.appendChild(barre);
      fenetre.appendChild(boite);
      fenetre.addEventListener("click", function(e){ if(e.target === fenetre) fermer(); });
      doc.addEventListener("keydown", function(e){ if(e.key === "Escape") fermer(); });
      doc.body.appendChild(fenetre);
    }
    retourFocus = doc.activeElement;
    courant = b || {};
    langueCourante = langue === "en" ? "en" : "fr";
    dessiner();
    fenetre.hidden = false;
    fenetre.scrollTop = 0;
    fenetre.querySelector(".ebon-fermer").focus();
  }

  racine.ELA_BON = { depuisListe:depuisListe, depuisRegistre:depuisRegistre,
                     element:element, ouvrir:ouvrir, fermer:fermer };
})(typeof window !== "undefined" ? window : globalThis);
