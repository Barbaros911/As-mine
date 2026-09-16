/* =====================================================================
   LE LECTEUR D'UNE DEMANDE COLLÉE — UNE SEULE SOURCE, DEUX ESPACES
   ---------------------------------------------------------------------
   Ce fichier est LA source du lecteur. Il vivait dans index.html ; Admin v2
   en avait besoin à son tour, et le recopier aurait créé la divergence que
   ce projet paie à chaque fois qu'il l'a fait — deux recettes pour une
   seule chose. Le message du client et ce lecteur se lisent ENSEMBLE :
   changer la forme de l'un oblige à changer l'autre, et il n'y a plus
   qu'un « l'autre ».

   IL NE DEVINE RIEN AUX LIBELLÉS, IL LIT LA PLACE DES CHOSES. Un client
   qui écrit lui-même n'écrira pas « Départ : » — et le message du site
   pourrait changer de langue demain. On lit donc la STRUCTURE : la
   référence en tête, une date en JJ/MM/AAAA HH:MM, les deux premières
   valeurs « … : … » pour les adresses, le DERNIER montant en euros pour
   le prix, et la dernière ligne « nom — téléphone ».

   LA GRILLE EST UN PARAMÈTRE OBLIGATOIRE, jamais une valeur par défaut
   écrite ici. Un défaut serait une deuxième grille : elle se tairait le
   jour où la vraie change, et le véhicule d'une course collée serait faux
   sans que rien ne le signale. Un appelant qui ne la fournit pas est
   arrêté tout de suite.

   UNE DEMANDE VENUE D'UN CLIENT ENTRE TOUJOURS EN « ATTENTE » — mais ce
   n'est pas ce fichier qui le décide : il LIT, il ne range pas. Le statut
   est la responsabilité de l'appelant, parce que les deux espaces ont deux
   portes (une demande collée attend, une course prise au téléphone est
   déjà convenue).
   ===================================================================== */
(function(racine){
  "use strict";

  function lireDemandeCollee(texte, GAMMES){
    if(!GAMMES || !GAMMES.length)
      throw new Error("lireDemandeCollee : la grille des gammes est obligatoire");
    if(!texte || !texte.trim()) return null;
    var lignes = texte.split("\n").map(function(l){ return l.trim(); })
                      .filter(function(l){ return l; });
    var d = { ref:"", depart:"", arrivee:"", date:"", heure:"", vehicule:"",
              paiement:"", paiementNom:"", passagers:"", prix:0, nom:"", tel:"" };

    var ref = texte.match(/ELA-\d{2}-\d{2}-\d{4}/);
    d.ref = ref ? ref[0] : "";

    var dt = texte.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
    if(dt){
      d.date  = dt[3] + "-" + dt[2] + "-" + dt[1];
      d.heure = (dt[4].length === 1 ? "0" + dt[4] : dt[4]) + ":" + dt[5];
    }

    /* Les deux premières valeurs « … : … » sont les adresses. On écarte la
       ligne de la date : elle porte elle aussi des deux-points, mais ceux
       de l'heure. */
    var valeurs = [];
    lignes.forEach(function(l){
      var i = l.indexOf(" : ");
      if(i < 0) return;
      var v = l.slice(i + 3).trim();
      if(/^\d{2}\/\d{2}\/\d{4}/.test(v)) return;
      valeurs.push(v);
    });
    d.depart  = valeurs[0] || "";
    d.arrivee = valeurs[1] || "";

    /* Le DERNIER montant en euros est le prix de la course : c'est pour ça
       que « Paiement » est posé AVANT « Prix » dans le message. */
    var montants = texte.match(/(\d[\d  ]*(?:[.,]\d{1,2})?)\s*€/g);
    if(montants){
      var brut = montants[montants.length - 1]
                   .replace(/[^\d.,]/g,"").replace(",",".");
      d.prix = parseFloat(brut) || 0;
    }

    /* La dernière ligne qui porte un tiret cadratin et pas de deux-points :
       « Jean Martin — 06 12 34 56 78 ». */
    for(var i = lignes.length - 1; i >= 0; i--){
      var m = lignes[i].match(/^(.+?)\s+[—–-]\s+(\+?[\d ().]{6,})$/);
      if(m && !/\s:\s/.test(lignes[i])){ d.nom = m[1].trim(); d.tel = m[2].trim(); break; }
    }

    /* Le véhicule est reconnu par son NOM, pas par sa position : c'est la
       seule donnée du message qui a une liste fermée de valeurs possibles.
       Les anciens noms de gammes restent reconnus — Barbaros a des mois de
       messages qui les portent, et un renommage ne doit pas rendre son
       historique illisible. */
    var ANCIENS = { "ela one":"berline", "berline":"berline", "sedan":"berline",
                    "ela first":"berline", "berline vip":"berline",
                    "van":"van", "van premium":"van", "van vip":"van", "minivan":"van" };
    var bas = texte.toLowerCase();
    Object.keys(ANCIENS).forEach(function(nom){
      if(!d.vehicule && bas.indexOf(nom) >= 0) d.vehicule = ANCIENS[nom];
    });
    var gamme = GAMMES.filter(function(g){ return g.cle === d.vehicule; })[0] || GAMMES[0];
    d.vehiculeCle = gamme.cle;
    d.vehicule    = gamme.nom;

    if(/carte/i.test(bas)){ d.paiement = "carte";   d.paiementNom = "Carte bancaire"; }
    else if(/esp[eè]ce/i.test(bas)){ d.paiement = "especes"; d.paiementNom = "Espèces"; }

    var pax = lignes.filter(function(l){ return /passager/i.test(l); })[0];
    if(pax){ var j = pax.indexOf(" : "); d.passagers = j < 0 ? pax : pax.slice(j+3).trim(); }

    /* ═══ LA PRÉCISION DE LA RÉCEPTION ═══
       Ici on lit un LIBELLÉ, contrairement à tout le reste de ce lecteur —
       et c'est permis pour une raison précise : celui-là, c'est NOUS qui
       l'écrivons, dans « messageDemande », toujours en français quelle que
       soit la langue du client. Les adresses, elles, sont lues par leur
       PLACE parce qu'un client espagnol écrit « Salida ».
       Sans ces trois lignes, une demande collée perdrait en silence la
       seule information que le formulaire ne redemande jamais — un fauteuil
       roulant, un siège bébé — et Barbaros enverrait la mauvaise voiture. */
    var prec = lignes.filter(function(l){ return /^Pr[ée]cision\s*:/i.test(l); })[0];
    if(prec) d.note = prec.replace(/^Pr[ée]cision\s*:\s*/i, "").trim().slice(0, 200);

    /* La chambre est fondue dans le libellé du départ, « … (ch. 214) » :
       c'est cette forme-là que la page compose, et on ne la cherche qu'en
       FIN de libellé — il existe des « rue de la Chambre ». */
    var ch = (d.depart || "").match(/\(ch\.\s*([^)]{1,12})\)\s*$/);
    if(ch) d.chambre = ch[1].trim();

    /* Sans référence, sans adresses OU sans date, ce n'est pas une demande :
       mieux vaut le dire que de créer une course à moitié vide que Barbaros
       découvrirait au moment de l'assurer. */
    if(!d.depart || !d.arrivee || !d.date) return null;
    return d;
  }
  /* =====================================================================
     LE BON, FABRIQUÉ À PARTIR DE CE QUI A ÉTÉ LU
     ---------------------------------------------------------------------
     Il est ici pour la même raison que le lecteur : Admin v2 doit produire
     EXACTEMENT le même objet que l'espace actuel, sinon deux courses nées
     du même message n'auraient pas la même forme et se reliraient mal.

     LA RÉFÉRENCE EST UN PARAMÈTRE, JAMAIS FABRIQUÉE ICI. Celle du client
     est reprise telle quelle — c'est elle qu'il a sur son bon, et lui en
     donner une autre rendrait les deux impossibles à rapprocher. Sans
     référence dans le message, c'est l'appelant qui en fournit une, parce
     que les deux espaces ne comptent pas au même endroit : l'un dans le
     téléphone, l'autre sur le serveur.

     LE STATUT AUSSI EST UN PARAMÈTRE. Une demande collée entre en
     « attente » — le client attend une réponse ; une course prise au
     téléphone est déjà convenue de vive voix. Deux portes, deux états, et
     ce fichier n'en choisit aucun à la place de l'appelant.
     ===================================================================== */
  function courseDepuisDemande(d, refDeSecours, statut){
    if(!d) return null;
    var ref = d.ref || refDeSecours;
    if(!ref) throw new Error("courseDepuisDemande : aucune référence");
    return {
      ref: ref,
      statut: statut || "attente",
      cree: new Date().toISOString(),
      course: { type:"Trajet simple", depart:d.depart, arrivee:d.arrivee,
                departPublic:d.depart, arriveePublic:d.arrivee,
                date:d.date, heure:d.heure, terminal:null, vol:"",
                note:d.note || "", chambre:d.chambre || "",
                vehicule:d.vehicule, vehiculeCle:d.vehiculeCle,
                passagers:d.passagers || "1 passager", distanceKm:0, estimee:true },
      client: { nom:d.nom, telephone:d.tel },
      paiement: d.paiement, paiementNom: d.paiementNom,
      prix: { total:d.prix, ht:d.prix/1.10, tva:d.prix - d.prix/1.10, majoration:false },
      dateMsg: d.date ? d.date.split("-").reverse().join("/") + " " + d.heure : ""
    };
  }

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

  racine.ELA_INTAKE = {
    lireDemande: lireDemandeCollee,
    courseDepuis: courseDepuisDemande,
    telValide: telValide
  };
})(typeof window !== "undefined" ? window : globalThis);
