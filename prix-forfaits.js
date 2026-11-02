/* =====================================================================
   PRIX-FORFAITS.JS — LE FORFAIT PARIS ↔ AÉROPORT, SUR LES PAGES CDG ET ORLY
   ---------------------------------------------------------------------
   1er novembre 2026, décision de Barbaros (« Oui ») après l'audit produit :
   le visiteur d'une page d'aéroport voit le prix SANS remplir le formulaire.
   Jusque-là ces pages ne portaient « ni prix chiffré : le tarif vit sur le
   serveur, pas dans une page statique ». Ce script tient les deux :

   1. LA PAGE ÉCRIT LE REPLI. Les quatre montants du bloc [data-forfaits]
      sont ceux de config.js (FORFAITS_PUBLICS + ACCUEIL_EUR) : ce que le
      formulaire calcule quand le serveur ne répond pas, et ce que lisent
      Google et un navigateur sans JavaScript. test-prix-pages.mjs refuse
      un montant écrit qui différerait de config.js.
   2. LE SERVEUR REMPLACE. Au chargement, la même vue que le formulaire
      (« grille_publique »), passée à LA MÊME PORTE que le formulaire :
      « grilleValide » de prix.js, appelée avec les gammes et les forfaits
      de config.js — une seule valeur qui cloche et rien n'est pris, jamais
      une grille à moitié lue. Les montants deviennent alors ceux du
      serveur. Le visiteur lit donc ici ce que le formulaire lui calculera :
      test-prix-pages.mjs le vérifie de bout en bout, la page et le
      formulaire nourris par la même grille.

   UNE SEULE PORTE, PAS UNE COPIE (2 novembre 2026). La première version
   recopiait « grilleValide » règle pour règle : deux portes qui se
   ressemblent finissent par diverger le jour où l'une change, et ce qui
   divergerait serait un prix affiché (opposable). La page charge donc
   config.js, itineraire-partage.js et prix.js, comme le moteur, et appelle
   ELA_PRIX.grilleValide. Ce script ne contient aucune règle de prix.

   LE CALCUL est celui de « prixSitePublic » : le forfait, puis l'accueil
   AU DÉPART de l'aéroport seulement (cellule [data-accueil]). Pas
   d'arrondi : un forfait n'en a pas (CGV art. 4).

   On n'écrit que si le texte diffère : réécrire un texte identique est une
   mutation (CLAUDE.md, finition commune). Aucun journal, aucune erreur
   montrée : sans serveur, la page garde ses montants, comme le formulaire.
   ===================================================================== */
(function(){
  var bloc = document.querySelector("[data-forfaits]");
  if(!bloc || !window.fetch || !window.ELA_PRIX || !window.ELA_CONFIG) return;
  var cle = bloc.getAttribute("data-forfaits");
  var C = window.ELA_CONFIG;

  /* Les mêmes que dans le moteur (index.html) ; test-prix-pages.mjs les
     compare, pour qu'une clé changée là-bas ne laisse pas celle-ci seule. */
  var SUPABASE_URL = "https://yyhzutnuhuytokarynaw.supabase.co";
  var SUPABASE_CLE = "sb_publishable_hNYqURatjlXc8tYC30XKpA_2VG91UAj";

  /* « 80 € », « 82,50 € » : l'ESPACE INSÉCABLE de la page (&nbsp;), écrite
     en clair pour qu'une relecture ne la remplace pas par une espace
     ordinaire — le texte différerait et serait réécrit à chaque fois. */
  function euros(n){
    var c = Math.round(n * 100);
    return (c % 100 ? (c / 100).toFixed(2).replace(".", ",") : String(c / 100)) + " €";
  }

  var ctrl = window.AbortController ? new AbortController() : null;
  var minuterie = setTimeout(function(){ if(ctrl) ctrl.abort(); }, 4000);
  fetch(SUPABASE_URL + "/rest/v1/grille_publique?select=valeur",
        { signal: ctrl ? ctrl.signal : undefined, headers:{ apikey:SUPABASE_CLE } })
    .then(function(r){ clearTimeout(minuterie); return r.ok ? r.json() : null; })
    .then(function(lignes){
      var valeur = Array.isArray(lignes) && lignes[0] ? lignes[0].valeur : null;
      var s = window.ELA_PRIX.grilleValide(valeur, C.GAMMES, C.FORFAITS_PUBLICS);
      if(!s || !s.forfaits[cle]) return;
      var cases = bloc.querySelectorAll("[data-gamme]");
      for(var i = 0; i < cases.length; i++){
        var td = cases[i], g = td.getAttribute("data-gamme");
        if(typeof s.forfaits[cle][g] !== "number") continue;
        var texte = euros(s.forfaits[cle][g] + (td.hasAttribute("data-accueil") ? s.accueil : 0));
        if(td.textContent !== texte) td.textContent = texte;
      }
    })
    .catch(function(){ clearTimeout(minuterie); });
})();
