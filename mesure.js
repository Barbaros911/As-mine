/* =====================================================================
   MESURE.JS — la mesure d'audience des pages d'acquisition, sans traceur
   ---------------------------------------------------------------------
   14 octobre 2026, mission « SEO international ». Barbaros veut savoir
   quelle page amène des clients : affichage, « Book », appel, WhatsApp,
   puis — dans le moteur — moteur ouvert, formulaire commencé, demande
   envoyée. Chaque geste dit la page d'où il part.

   AUCUN TRACEUR, ET C'EST LA RÈGLE DU SITE (politique de confidentialité,
   art. 7) : pas de cookie, rien d'écrit sur l'appareil, aucun identifiant,
   aucun service tiers. On envoie DEUX MOTS d'une liste fermée — la page
   et le geste — à un compteur agrégé par jour sur le serveur
   (rpc/ela_mesurer, migration 20261014000000). Le serveur ne garde que
   des totaux.

   ELLE NE PEUT RIEN CASSER : jamais attendue, jamais bloquante. Serveur
   muet, migration pas encore appliquée, bloqueur de publicité : le
   visiteur ne voit rien, le lien part quand même. « keepalive » fait
   survivre l'envoi au départ vers tel:, WhatsApp ou le moteur.

   LE MÊME APPEL QUE LE MOTEUR (nuage.mesurer dans index.html) : même
   adresse, même clé publique, mêmes noms de pages. test-seo-en vérifie
   que les deux disent la même chose — deux recettes finissent toujours
   par diverger.

   La page se déclare par <html data-ela-page="en-cdg">. Les liens
   « Book » portent data-mesure="reserver" ; les liens tel: et WhatsApp
   sont reconnus à leur adresse.
   ===================================================================== */
(function(){
  var SUPABASE_URL = "https://yyhzutnuhuytokarynaw.supabase.co";
  var SUPABASE_CLE = "sb_publishable_hNYqURatjlXc8tYC30XKpA_2VG91UAj";
  var EVENEMENTS = ["page_vue", "clic_reserver", "clic_appel", "clic_whatsapp"];

  var page = document.documentElement.getAttribute("data-ela-page") || "";
  if(!/^[a-z0-9-]{2,40}$/.test(page)) return;
  /* Les robots ne sont pas des visiteurs : un robot qui exécute la page
     compterait des affichages que personne n'a vus. */
  if(/bot|crawl|spider|slurp|lighthouse|headless|pagespeed|preview/i.test(navigator.userAgent || "")) return;

  /* LE LIEN D'UN PARTENAIRE (15 octobre 2026, « ?via=nomad-roissy ») : un
     hôtel, un office de tourisme ou un annuaire reçoit SON lien, et chaque
     geste compté dit par qui le visiteur est arrivé. Le code part tel quel
     — format fermé — et c'est le SERVEUR qui le reconnaît : un code inventé
     compte comme une visite sans source. Rien n'est écrit sur l'appareil.
     Il est EFFACÉ de la barre d'adresse : partagée ensuite, l'adresse ne
     doit pas attribuer au partenaire un visiteur qu'il n'a pas envoyé. Il
     suit le visiteur jusqu'au moteur par les seuls boutons « Book » : c'est
     là que la demande naît, et c'est elle qui compte. */
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
    document.querySelectorAll('a[data-mesure="reserver"]').forEach(function(a){
      try{
        var u = new URL(a.getAttribute("href") || "", location.href);
        if(u.origin !== location.origin) return;
        u.searchParams.set("via", via);
        a.setAttribute("href", u.pathname + u.search + u.hash);
      }catch(e){}
    });
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", suivreJusquAuMoteur);
  else suivreJusquAuMoteur();

  function envoyer(evenement){
    if(EVENEMENTS.indexOf(evenement) === -1) return;
    try{
      fetch(SUPABASE_URL + "/rest/v1/rpc/ela_mesurer", {
        method: "POST",
        keepalive: true,
        headers: { apikey: SUPABASE_CLE, "Content-Type": "application/json" },
        /* La source ne part que si elle existe : une visite ordinaire
           envoie exactement ce qu'elle envoyait avant. */
        body: JSON.stringify(via ? { p_page: page, p_evenement: evenement, p_source: via }
                                 : { p_page: page, p_evenement: evenement })
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
