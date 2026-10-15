/* =====================================================================
   MESURE.JS — la mesure d'audience des pages d'acquisition, sans traceur
   ---------------------------------------------------------------------
   14 octobre 2026, mission « SEO international ». Barbaros veut savoir
   quelle page amène des clients : affichage, « Book », appel, WhatsApp,
   puis — dans le moteur — moteur ouvert, formulaire commencé, demande
   envoyée. Chaque geste dit la page d'où il part.

   15 OCTOBRE 2026, L'ÉCRAN « TRAFIC » DE L'ADMIN : la même mesure, pas une
   seconde. Les gestes partent maintenant à la fonction « mesure », qui garde
   un journal (visiteurs du jour, visites, source, pays, appareil) ET
   incrémente le compteur d'origine (ela_mesurer). Ce fichier n'a gagné que
   trois informations, toutes lues sur la page et jamais gardées : le
   domaine du site d'où l'on arrive, les UTM de l'adresse, la langue et le
   type d'appareil (trois valeurs).

   AUCUN TRACEUR, ET C'EST LA RÈGLE DU SITE (politique de confidentialité,
   art. 7) : pas de cookie, rien d'écrit sur l'appareil, aucun identifiant
   envoyé. Les visiteurs distincts d'un jour sont estimés par le SERVEUR,
   avec une clé du jour détruite le lendemain. Seule exception, voulue : le
   visiteur qui demande « Ne plus me compter » — on garde ce choix-là.

   ELLE NE PEUT RIEN CASSER : jamais attendue, jamais bloquante. Serveur
   muet, migration pas encore appliquée, bloqueur de publicité : le
   visiteur ne voit rien, le lien part quand même. « keepalive » fait
   survivre l'envoi au départ vers tel:, WhatsApp ou le moteur, et le corps
   part en « text/plain » : une requête simple, sans requête préalable.

   LE MÊME APPEL QUE LE MOTEUR (nuage.mesurer dans index.html) : même
   adresse, mêmes noms de pages, même corps. test-seo-en vérifie que les
   deux disent la même chose — deux recettes finissent toujours par diverger.

   La page se déclare par <html data-ela-page="en-cdg">. Les liens
   « Book » portent data-mesure="reserver" ; les liens tel: et WhatsApp
   sont reconnus à leur adresse.
   ===================================================================== */
(function(){
  var SUPABASE_URL = "https://yyhzutnuhuytokarynaw.supabase.co";
  var EVENEMENTS = ["page_vue", "clic_reserver", "clic_appel", "clic_whatsapp"];

  var page = document.documentElement.getAttribute("data-ela-page") || "";
  if(!/^[a-z0-9-]{2,40}$/.test(page)) return;
  /* Les robots ne sont pas des visiteurs : un robot qui exécute la page
     compterait des affichages que personne n'a vus. */
  if(/bot|crawl|spider|slurp|lighthouse|headless|pagespeed|preview/i.test(navigator.userAgent || "")) return;
  /* « Ne plus me compter » (politique de confidentialité, art. 7). */
  try{ if(localStorage.getItem("ela_mesure_non") === "1") return; }catch(e){}

  /* LE LIEN D'UN PARTENAIRE (15 octobre 2026, « ?via=hotel-exemple ») : un
     hôtel, un office de tourisme ou un annuaire reçoit SON lien, et chaque
     geste compté dit par qui le visiteur est arrivé. Le code part tel quel
     — format fermé — et c'est le SERVEUR qui le reconnaît : un code inventé
     compte comme une visite sans source. Rien n'est écrit sur l'appareil.
     Il est EFFACÉ de la barre d'adresse : partagée ensuite, l'adresse ne
     doit pas attribuer au partenaire un visiteur qu'il n'a pas envoyé. Il
     suit le visiteur sur TOUS les liens du site — « Book » vers le moteur,
     mais aussi l'accueil anglais, les autres pages, le pied : un partenaire
     qui envoie sur /en/ perdrait sinon son visiteur au premier clic, et ne
     verrait jamais une demande (relecture du 15/10/2026). Une ancre de la
     même page reste une ancre : réécrite, elle rechargerait la page. */
  var via = "";
  try{
    var params = new URLSearchParams(location.search);
    var lu = (params.get("via") || "").trim();
    if(/^[a-z0-9-]{2,40}$/.test(lu)) via = lu;
    if(params.has("via")){
      params.delete("via");
      var reste = params.toString();
      history.replaceState(null, "", location.pathname + (reste ? "?" + reste : "") + location.hash);
    }
  }catch(e){ /* sans URLSearchParams : la visite compte, sans source */ }
  function suivreJusquAuMoteur(){
    if(!via) return;
    document.querySelectorAll("a[href]").forEach(function(a){
      try{
        var u = new URL(a.getAttribute("href") || "", location.href);
        if(u.origin !== location.origin) return;
        if(u.hash && u.pathname === location.pathname && u.search === location.search) return;
        u.searchParams.set("via", via);
        a.setAttribute("href", u.pathname + u.search + u.hash);
      }catch(e){}
    });
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", suivreJusquAuMoteur);
  else suivreJusquAuMoteur();

  /* Ce qui accompagne chaque geste, lu sur la page et jamais gardé : le
     site d'où l'on arrive (son domaine seulement, et jamais le nôtre), les
     UTM de l'adresse, la langue de la page, le type d'appareil. */
  function contexte(){
    var c = { referent: "", utm_source: "", utm_medium: "", utm_campaign: "" };
    try{
      var r = document.referrer ? new URL(document.referrer) : null;
      if(r && r.hostname !== location.hostname) c.referent = r.hostname;
    }catch(e){}
    try{
      var q = new URLSearchParams(location.search);
      c.utm_source = (q.get("utm_source") || "").slice(0, 60);
      c.utm_medium = (q.get("utm_medium") || "").slice(0, 60);
      c.utm_campaign = (q.get("utm_campaign") || "").slice(0, 60);
    }catch(e){}
    return c;
  }
  var CONTEXTE = contexte();
  function appareil(){
    var l = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0), doigt = false;
    try{ doigt = window.matchMedia("(pointer: coarse)").matches; }catch(e){}
    return l < 768 ? "mobile" : (doigt && l < 1100 ? "tablette" : "ordinateur");
  }
  function envoyer(evenement){
    if(EVENEMENTS.indexOf(evenement) === -1) return;
    try{
      var langue = (document.documentElement.lang || "fr").slice(0, 2).toLowerCase();
      fetch(SUPABASE_URL + "/functions/v1/mesure", {
        method: "POST",
        keepalive: true,
        credentials: "omit",
        headers: { "Content-Type": "text/plain" },
        /* Le lien d'un partenaire ne part que s'il existe : une visite
           ordinaire n'en porte pas. */
        body: JSON.stringify({ page: page, evenement: evenement, lien: via || null,
          referent: CONTEXTE.referent, utm_source: CONTEXTE.utm_source, utm_medium: CONTEXTE.utm_medium,
          utm_campaign: CONTEXTE.utm_campaign, langue: langue, appareil: appareil() })
      }).catch(function(){});
    }catch(e){ /* navigateur sans fetch : rien à compter */ }
  }

  /* Ce que dit un lien, lu à son adresse ou à sa déclaration. */
  function gesteDuLien(a){
    var h = a.getAttribute("href") || "";
    if(a.getAttribute("data-mesure") === "reserver") return "clic_reserver";
    if(/^tel:/i.test(h)) return "clic_appel";
    if(/^https:\/\/wa\.me\//i.test(h)) return "clic_whatsapp";
    return "";
  }
  document.addEventListener("click", function(e){
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if(!a) return;
    var g = gesteDuLien(a);
    if(g) envoyer(g);
  }, true);

  envoyer("page_vue");
  /* Une prise pour les suites de test et la console, rien de plus. */
  window.ELA_MESURE = { page: page, geste: gesteDuLien, via: via };
})();
