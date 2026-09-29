/* =====================================================================
   LE CONTRÔLE DU NUMÉRO DE TÉLÉPHONE — UNE SEULE SOURCE
   ---------------------------------------------------------------------
   Sorti d'« intake-demande.js » le 29/09/2026. La page publique en a
   besoin pour « Envoyer ma demande », mais le cloisonnement (#246) lui
   interdit de charger ce lecteur, outil de l'espace exploitant : la
   fonction avait disparu de la page, et le clic levait
   « telValide is not defined ». Ce fichier ne contient QUE le contrôle,
   et tous les espaces le chargent.
   ===================================================================== */
(function(racine){
  "use strict";
  /* =====================================================================
     LE CONTRÔLE DE TÉLÉPHONE — LA MÊME RÈGLE DES DEUX CÔTÉS
     ---------------------------------------------------------------------
     Il vivait dans index.html. Admin v2 en a besoin pour la saisie par
     téléphone, et la consigne du projet est explicite : « MÊME CONTRÔLE QUE
     CÔTÉ CLIENT ». Deux règles séparées voudraient dire un numéro accepté
     ici et refusé là — et c'est le client qu'on ne rappellerait pas.

     Un numéro faux saisi au téléphone coûte encore plus cher qu'un numéro
     faux saisi par le client : c'est une course qu'on a ACCEPTÉE de vive
     voix et qu'on ne pourra pas rappeler si le chauffeur tombe malade.
     ===================================================================== */
  function telValide(brut){
    var t = String(brut || "").trim();
    if(!t) return false;
    var international = t.indexOf("+") === 0 || t.indexOf("00") === 0;
    var chiffres = t.replace(/\D/g, "");
    if(chiffres.indexOf("00") === 0) chiffres = chiffres.slice(2);
    /* « 000000 », « 111111 » : jamais un téléphone, toujours un client
       pressé ou un essai. C'est exactement le cas rencontré. */
    if(/^(\d)\1+$/.test(chiffres)) return false;
    /* ═══ SANS INDICATIF, ON N'ACCEPTE QUE LE FORMAT FRANÇAIS ═══
       Septembre 2026, signalé par Barbaros : « malgré que j'ai entré un
       mauvais numéro, j'ai quand même réussi à envoyer ».
       C'ÉTAIT UN VRAI TROU. La dernière ligne acceptait n'importe quelle
       suite de 8 à 15 chiffres dès qu'elle ne commençait pas par zéro :
       « 87654321 » passait, et la course partait vers un client
       injoignable. Un chauffeur qui ne peut pas joindre son client à 5 h
       du matin, c'est la course perdue et le client sur le trottoir.
       L'EXEMPLE DE CE COMMENTAIRE A DÛ ÊTRE CHANGÉ : le premier écrit était
       « 1234 5678 » sans espaces, c'est-à-dire EXACTEMENT le code de
       l'espace exploitant. Le contrôle qui vérifie qu'il n'apparaît nulle
       part dans la page est tombé dessus — un exemple pris au hasard peut
       tomber sur un secret, et un commentaire est servi comme le reste.
       ON NE FORCE PAS L'INDICATIF AUX FRANÇAIS pour autant. Un client qui
       tape « 06 12 34 56 78 » est le cas le plus courant du site, et lui
       refuser son propre numéro serait une réservation perdue à coup sûr —
       « telWa » sait déjà le compléter en +33. Ce qui change : un numéro
       SANS indicatif et qui ne commence pas par zéro est refusé. */
    if(!international){
      /* Numéro français : dix chiffres, et le second dit la nature de la
         ligne — 01 à 05 fixe, 06 et 07 mobile, 09 box. 08 est un numéro
         spécial, souvent surtaxé : personne n'y est joignable. */
      return chiffres.length === 10 && /^0[1-79]/.test(chiffres);
    }
    /* Avec indicatif : entre 8 et 15 chiffres, la borne de la norme E.164.
       AUCUN INDICATIF NE COMMENCE PAR ZÉRO — « +0… » n'existe nulle part,
       c'est toujours un zéro de trop recopié d'un numéro national. */
    if(chiffres.indexOf("0") === 0) return false;
    return chiffres.length >= 8 && chiffres.length <= 15;
  }

  racine.ELA_TEL = { telValide: telValide };
})(typeof window !== "undefined" ? window : globalThis);
