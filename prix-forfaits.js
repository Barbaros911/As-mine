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
      (« grille_publique ») ; si la grille passe la MÊME porte que
      « grilleValide » d'index.html — une seule valeur qui cloche et rien
      n'est pris, jamais une grille à moitié lue —, les montants deviennent
      ceux du serveur. Le visiteur lit donc ici ce que le formulaire lui
      calculera : test-prix-pages.mjs le vérifie de bout en bout, la page
      et le formulaire nourris par la même grille.

   LE CALCUL est celui de « prixSitePublic » : le forfait, puis l'accueil
   AU DÉPART de l'aéroport seulement (cellule [data-accueil]). Pas
   d'arrondi : un forfait n'en a pas (CGV art. 4).

   On n'écrit que si le texte diffère : réécrire un texte identique est une
   mutation (CLAUDE.md, finition commune). Aucun journal, aucune erreur
   montrée : sans serveur, la page garde ses montants, comme le formulaire.
   ===================================================================== */
(function(){
  var bloc = document.querySelector("[data-forfaits]");
  if(!bloc || !window.fetch) return;
  var cle = bloc.getAttribute("data-forfaits");

  /* Les mêmes que dans le moteur (index.html) ; test-prix-pages.mjs les
     compare, pour qu'une clé changée là-bas ne laisse pas celle-ci seule. */
  var SUPABASE_URL = "https://yyhzutnuhuytokarynaw.supabase.co";
  var SUPABASE_CLE = "sb_publishable_hNYqURatjlXc8tYC30XKpA_2VG91UAj";
  /* Les clés de config.js (GAMMES, FORFAITS_PUBLICS) : la porte exige
     chaque gamme et chaque forfait, comme celle du moteur. */
  var GAMMES = ["berline", "van"];
  var FORFAITS = ["orly", "cdg", "disney"];

  function centimes(n, max){
    return (typeof n === "number" && isFinite(n) && n > 0 && n <= max && Math.round(n) === n) ? n / 100 : null;
  }
  /* La porte de « grilleValide » (index.html), règle pour règle. */
  function grilleValide(v){
    if(!v || typeof v !== "object" || Array.isArray(v)) return null;
    var lim = v.tranches_km;
    if(!Array.isArray(lim) || lim.length < 1 || lim.length > 8) return null;
    for(var i = 0; i < lim.length; i++)
      if(!(typeof lim[i] === "number" && lim[i] > 0 && lim[i] <= 500 && (i === 0 || lim[i] > lim[i-1]))) return null;
    var ok = GAMMES.every(function(g){
      var o = v[g];
      if(!o || !Array.isArray(o.tranches_centimes) || o.tranches_centimes.length !== lim.length) return false;
      var avant = 0;
      for(var j = 0; j < lim.length; j++){
        var p = centimes(o.tranches_centimes[j], 1000000);
        if(p === null || p < avant) return false;
        avant = p;
      }
      return centimes(o.au_dela_km_centimes, 2000) !== null;
    });
    if(!ok) return null;
    var f = v.forfaits || {}, forfaits = {};
    ok = FORFAITS.every(function(z){
      var o = f[z];
      if(!o) return false;
      forfaits[z] = {};
      return GAMMES.every(function(g){
        var p = centimes(o[g], 1000000);
        if(p === null) return false;
        forfaits[z][g] = p;
        return true;
      });
    });
    if(!ok) return null;
    var acc = v.accueil_centimes;
    if(!(typeof acc === "number" && acc >= 0 && acc <= 10000 && Math.round(acc) === acc)) return null;
    return { forfaits:forfaits, accueil:acc / 100 };
  }
  /* « 80 € », « 82,50 € » : l'espace insécable de la page. */
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
      var s = grilleValide(Array.isArray(lignes) && lignes[0] ? lignes[0].valeur : null);
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
