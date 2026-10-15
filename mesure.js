/* =====================================================================
   MESURE.JS — le collecteur de la mesure du trafic (15 octobre 2026)
   ---------------------------------------------------------------------
   Chargé par toutes les pages PUBLIQUES (accueil, pages de service,
   /professionnels/, page du flyer d'un hôtel). Il envoie à la fonction
   « mesure » les sept événements de la liste fermée — page vue, appui sur
   « Voir mon prix », prix affiché, formulaire commencé, demande envoyée,
   appui sur « Appeler », appui sur WhatsApp — et rien d'autre : ni
   mouvement, ni défilement, ni frappe.

   CE QU'IL NE SAIT PAS. Il ne lit ni nom, ni téléphone, ni adresse, ni
   prix : il n'a pas accès au formulaire, et ne le demande pas. Ce qu'il
   envoie : deux identifiants tirés au sort (la session, qui meurt avec
   l'onglet ; le visiteur, 30 jours), la page sans sa chaîne de requête, la
   page d'entrée de la session, le domaine du référent de la PREMIÈRE page,
   les UTM, le paramètre « src », la langue, l'appareil (trois valeurs), et
   l'espace du site. Le pays, c'est le serveur qui le lit.

   LA SOURCE NE CHANGE PAS EN COURS DE VISITE : référent, UTM et « src »
   sont relevés à la première page et renvoyés tels quels ensuite. Une
   réservation faite trois pages après l'arrivée depuis Google reste
   « google ». C'est le serveur qui classe (une seule règle, éprouvée).

   IL NE PEUT RIEN CASSER. Chaque envoi est un « fetch keepalive » lancé
   sans attente, enveloppé : pas de réponse lue, pas d'erreur remontée. Le
   type « text/plain » évite la requête préalable (OPTIONS) : un appel, pas
   deux, et un appui sur WhatsApp n'attend jamais la mesure. Un stockage
   refusé (navigation privée stricte) désactive simplement la mesure.

   OÙ IL SE TAIT : espace admin, réception, démo (data-ela-space), mode
   exploitant (?exploitant=1), et si le visiteur a demandé à ne pas être
   compté (localStorage « ela_mesure_non », lien dans la politique de
   confidentialité). Les robots déclarés sont écartés par le serveur.

   LES APPUIS SUR « APPELER » ET WHATSAPP SONT ÉCOUTÉS ICI, par délégation :
   tout lien « tel: », tout lien « wa.me », et les choix de la feuille
   WhatsApp du site (data-wa). Aucune page n'a à les déclarer un par un —
   un bouton ajouté demain est compté d'office. Les quatre autres
   événements sont émis par index.html (window.ELA_MESURE.evenement).

   Servi « cache d'abord » par sw.js : toute modification ici DOIT monter
   la constante CACHE (verifier-cache-sw.mjs le refuse sinon).
   ===================================================================== */
(function(){
  "use strict";
  var URL_MESURE = "https://yyhzutnuhuytokarynaw.supabase.co/functions/v1/mesure";
  var CLE_VISITEUR = "ela_visiteur", CLE_SESSION = "ela_session", CLE_REFUS = "ela_mesure_non";
  var JOURS_VISITEUR = 30;
  var ESPACES = { "public": 1, "hotel-client": 1, "pro": 1 };

  function espace(){
    var e = document.documentElement.getAttribute("data-ela-space") || "";
    if(!e){
      /* Le dépôt servi tel quel (serveur de test, aperçu local) ne porte pas
         l'attribut : on le lit comme la page publique, sauf en mode
         exploitant, qui est l'admin. */
      if(/[?&]exploitant=1/.test(location.search)) return "";
      if(/^\/professionnels\//.test(location.pathname)) return "pro";
      return "public";
    }
    return ESPACES[e] ? e : "";
  }
  function refuse(){
    try{ return localStorage.getItem(CLE_REFUS) === "1"; }catch(e){ return false; }
  }
  function alea(){
    var n = 16, s = "", c = "abcdefghijklmnopqrstuvwxyz0123456789";
    try{
      var b = new Uint8Array(n); crypto.getRandomValues(b);
      for(var i = 0; i < n; i++) s += c[b[i] % c.length];
      return s;
    }catch(e){
      for(var j = 0; j < n; j++) s += c[Math.floor(Math.random() * c.length)];
      return s;
    }
  }
  function visiteur(){
    var m = null;
    try{ m = JSON.parse(localStorage.getItem(CLE_VISITEUR) || "null"); }catch(e){ m = null; }
    var now = Date.now();
    if(!m || typeof m.id !== "string" || !/^[a-z0-9]{8,32}$/.test(m.id) || !(m.exp > now)){
      m = { id: alea(), exp: now + JOURS_VISITEUR * 86400000 };
      try{ localStorage.setItem(CLE_VISITEUR, JSON.stringify(m)); }catch(e){ return ""; }
    }
    return m.id;
  }
  function chemin(){
    var p = location.pathname || "/";
    return p.length > 120 ? p.slice(0, 120) : p;
  }
  function domaine(ref){
    try{
      if(!ref) return "";
      var u = new URL(ref);
      if(u.hostname === location.hostname) return "";
      return u.hostname.replace(/^www\./, "").toLowerCase().slice(0, 80);
    }catch(e){ return ""; }
  }
  function session(){
    var s = null;
    try{ s = JSON.parse(sessionStorage.getItem(CLE_SESSION) || "null"); }catch(e){ s = null; }
    if(s && typeof s.id === "string" && /^[a-z0-9]{8,32}$/.test(s.id)) return s;
    var q;
    try{ q = new URLSearchParams(location.search); }catch(e){ q = { get: function(){ return ""; } }; }
    s = {
      id: alea(),
      landing: chemin(),
      referent: domaine(document.referrer),
      utm_source: (q.get("utm_source") || "").slice(0, 60),
      utm_medium: (q.get("utm_medium") || "").slice(0, 60),
      utm_campaign: (q.get("utm_campaign") || "").slice(0, 60),
      src: (q.get("src") || "").slice(0, 20),
      /* Un hôtel partenaire : la page du flyer, ou l'affiche QR (?h=). */
      hotel: !!(q.get("h") || q.get("reception"))
    };
    try{ sessionStorage.setItem(CLE_SESSION, JSON.stringify(s)); }catch(e){ return null; }
    return s;
  }
  function appareil(){
    var l = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
    var doigt = false;
    try{ doigt = window.matchMedia && window.matchMedia("(pointer: coarse)").matches; }catch(e){}
    if(l < 768) return "mobile";
    if(doigt && l < 1100) return "tablette";
    return "ordinateur";
  }
  function langue(){
    var l = (document.documentElement.lang || navigator.language || "fr").slice(0, 2).toLowerCase();
    return /^[a-z]{2}$/.test(l) ? l : "fr";
  }

  var ESP = espace();
  var actif = !!ESP && !refuse();
  var sess = actif ? session() : null;
  var vis = actif ? visiteur() : "";
  if(!sess || !vis) actif = false;

  function envoyer(evenement, detail){
    if(!actif) return;
    var corps = {
      session: sess.id, visiteur: vis, evenement: evenement,
      page: chemin(), landing: sess.landing, referent: sess.referent,
      utm_source: sess.utm_source, utm_medium: sess.utm_medium, utm_campaign: sess.utm_campaign,
      src: sess.src, hotel: sess.hotel,
      langue: langue(), appareil: appareil(), espace: ESP,
      detail: detail && typeof detail === "object" ? detail : {}
    };
    try{
      fetch(URL_MESURE, {
        method: "POST", keepalive: true, mode: "cors", credentials: "omit",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(corps)
      }).catch(function(){});
    }catch(e){ /* la mesure ne casse rien */ }
  }

  /* Les appuis, par délégation. « capture » : on voit le clic avant qu'un
     gestionnaire de la page n'ouvre WhatsApp ou ne change d'écran — et on
     ne retarde rien, l'envoi ne bloque pas. */
  document.addEventListener("click", function(e){
    if(!actif || !e.target || !e.target.closest) return;
    var a = e.target.closest("a[href], button[data-wa]");
    if(!a) return;
    var href = (a.getAttribute("href") || "").toLowerCase();
    var wa = a.getAttribute("data-wa");
    if(wa){
      if(wa === "appel") envoyer("call_click", { choix_wa: wa });
      else if(wa !== "reserver") envoyer("whatsapp_click", { choix_wa: wa });
      return;
    }
    if(href.indexOf("tel:") === 0) envoyer("call_click");
    else if(href.indexOf("wa.me") !== -1 || href.indexOf("whatsapp.com") !== -1) envoyer("whatsapp_click");
  }, true);

  window.ELA_MESURE = {
    actif: function(){ return actif; },
    evenement: envoyer,
    /* Pour la politique de confidentialité : ne plus être compté sur cet
       appareil. Pas de retour en arrière automatique — c'est un choix. */
    refuser: function(){ try{ localStorage.setItem(CLE_REFUS, "1"); }catch(e){} actif = false; }
  };

  /* La page vue, une fois le document prêt : dans « defer », il l'est. */
  envoyer("page_view");
})();
