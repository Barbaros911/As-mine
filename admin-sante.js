/* =====================================================================
   LE JUGE DES ALERTES — UNE SEULE RÈGLE POUR LE VOYANT ET LE CHIEN DE GARDE
   ---------------------------------------------------------------------
   4 octobre 2026, à la demande de Barbaros (« Ok voyant ») : le chien de
   garde GitHub ne passait que 6 fois en 21 h au lieu de toutes les 15 min.
   Le voyant de l'admin lit les MÊMES mesures sur le serveur et les juge
   ICI, avec la même règle que le chien de garde (.github/scripts/
   chien-de-garde.mjs, qui importe ce fichier). Deux juges finiraient par
   se contredire : un voyant vert pendant que l'Issue crie, ou l'inverse.

   CE FICHIER NE TOUCHE NI AU DOM NI AU RÉSEAU : il reçoit les mesures et
   rend un verdict. L'admin l'appelle, Node l'importe.

   IL REND DEUX FORMULATIONS DE CHAQUE PANNE, et ce n'est pas un doublon :
   « pannes » est le texte précis de l'Issue GitHub (noms de tâches,
   chiffres) ; « simples » est la phrase de l'admin, lue la nuit sur un
   téléphone par quelqu'un qui n'est pas technicien. Les deux sont écrites
   au même endroit, à la même ligne de décision : une règle, deux phrases.

   Chargé par l'admin seulement : la construction le retire des pages
   publiques (construire-espaces-hotel.mjs), comme le lecteur de demandes.
   ===================================================================== */
(function(racine){
  "use strict";

  /* Les sept mesures que rend le serveur (sante-serveur.sql et la fonction
     « ela_sante_mesures »). Une réponse qui n'en porte pas les clés n'est
     PAS une mesure : l'admin la tient pour « non vérifié », jamais pour un
     état sain — c'est « mesuresLisibles » qui le dit. */
  var CLES = ["sans_alerte", "relance_active", "derniere_relance_s",
              "relances_echouees_15min", "telegram_echecs_1h",
              "telegram_ok_1h", "demandes_24h"];

  function mesuresLisibles(s){
    if(!s || typeof s !== "object" || Array.isArray(s)) return false;
    for(var i = 0; i < CLES.length; i++){
      if(!Object.prototype.hasOwnProperty.call(s, CLES[i])) return false;
    }
    return true;
  }

  function juger(sante){
    var s = sante && typeof sante === "object" ? sante : null;
    if(!s) return { ok:false,
      pannes:["Le serveur n'a pas rendu d'état lisible (réponse vide ou illisible)."],
      simples:["Le serveur n'a pas répondu clairement."] };
    var n = function(v){ return (v === null || v === undefined || v === "") ? null : Number(v); };
    var pannes = [], simples = [];
    function panne(precis, simple){ pannes.push(precis); simples.push(simple); }

    var sansAlerte = n(s.sans_alerte);
    if(sansAlerte === null) panne("Impossible de compter les demandes sans alerte.",
      "Le serveur n'a pas pu compter les demandes.");
    else if(sansAlerte > 0) panne(sansAlerte + " demande(s) du site en attente depuis plus de 2 min SANS AUCUNE alerte réussie — Barbaros ne les a probablement pas vues.",
      sansAlerte > 1 ? sansAlerte + " demandes sont arrivées sans alerte."
                     : "Une demande est arrivée sans alerte.");

    if(s.relance_active !== true) panne("La relance automatique (tâche pg_cron « ela-relance-alertes ») est ABSENTE ou inactive : plus de rappel, plus de rattrapage.",
      "Les rappels automatiques sont arrêtés.");

    var derniere = n(s.derniere_relance_s);
    if(s.relance_active === true){
      if(derniere === null) panne("La relance n'a jamais tourné (aucun passage enregistré).",
        "Les rappels automatiques n'ont jamais tourné.");
      else if(derniere > 300) panne("Le dernier passage de la relance remonte à " + Math.round(derniere / 60) + " min (attendu : moins d'une minute).",
        "Les rappels automatiques sont bloqués depuis " + Math.round(derniere / 60) + " min.");
    }

    var echecsRelance = n(s.relances_echouees_15min) || 0;
    if(echecsRelance >= 10) panne(echecsRelance + " passages de la relance en échec sur le dernier quart d'heure.",
      "Les rappels automatiques échouent.");

    var tgEchecs = n(s.telegram_echecs_1h) || 0, tgOk = n(s.telegram_ok_1h) || 0;
    if(tgEchecs > 0 && tgOk === 0) panne("Telegram refuse tous les envois depuis une heure (" + tgEchecs + " échec(s), 0 réussite) — jeton ou conversation à vérifier.",
      "Telegram ne reçoit plus les alertes.");

    return { ok: pannes.length === 0, pannes: pannes, simples: simples };
  }

  racine.ELA_SANTE = { juger: juger, mesuresLisibles: mesuresLisibles, CLES: CLES };
})(typeof window !== "undefined" ? window : globalThis);
