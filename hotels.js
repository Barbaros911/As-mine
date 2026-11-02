/* =====================================================================
   HOTELS.JS — LA FICHE DES HÔTELS PARTENAIRES, EN DONNÉES
   ---------------------------------------------------------------------
   Quatrième extraction du plan d'architecture (2 novembre 2026), après
   textes.js, config.js et prix.js : la fiche « HOTELS » vivait dans le
   moteur d'index.html, et trois scripts de construction la découpaient
   dans la page par recherche de chaîne. Elle est ici telle quelle ; le
   moteur la lit (« var HOTELS = window.ELA_HOTELS ») au même endroit
   qu'avant et refuse de démarrer sans ce fichier. Les scripts la lisent
   ICI (construire-espaces-hotel, construire-demo, verifier-demo,
   verifier-tarif-hotel), plus jamais dans la page : un deuxième hôtel
   s'ajoute dans ce fichier, et nulle part ailleurs.
   CE QUI EST ICI N'EST QUE LE REPLI DU PRIX DU FLYER : le serveur est la
   vérité (« chargerTarifsServeur », vue « forfaits_partenaires_publics »,
   Réglages → « Prix du flyer, par hôtel »). verifier-tarif-hotel.mjs exige
   l'accord entre ce repli, la source serveur et la page du QR.
   CE FICHIER NE CONTIENT QUE DES DONNÉES : ni DOM, ni réseau, ni stockage
   (test-hotels.mjs). Chargé après config.js et avant le moteur ; gardé par
   le service worker (SHELL de sw.js) ; les pages dérivées (admin,
   réception) le trouvent par leur <base href="/"> ; la démo des
   professionnels reçoit le sien (/demo/hotels.js, un hôtel fictif).

   LES FORFAITS D'UN HÔTEL PARTENAIRE
   Septembre 2026, à la demande de Barbaros. Une réception d'hôtel ne
   cherche pas une adresse et ne compare pas des kilomètres : elle lit le
   flyer posé sur son comptoir, elle appuie sur la ligne, elle annonce le
   prix. Trente secondes, entre deux arrivées.

   LA GRILLE CI-DESSOUS EST CELLE DU FLYER IMPRIMÉ, AU CENTIME. C'est un
   document que le client a sous les yeux au moment où la réception lui
   annonce un montant : si l'écran et le papier ne disent pas la même
   chose, c'est le papier qui gagne, et c'est nous qui avons tort. Ne
   jamais « corriger » ces montants pour les rapprocher du kilométrage du
   site — sur les longues courses le van est VOLONTAIREMENT moins cher
   que le site : c'est un prix d'appel pour décrocher l'hôtel, tranché par
   Barbaros. C'est exactement le genre de chose qu'une prochaine session
   prendrait pour un défaut.

   UN FORFAIT VAUT LE MÊME PRIX À TOUTE HEURE ET TOUS LES JOURS : le tarif
   nuit du flyer a été retiré le 22/09/2026, comme toutes les majorations
   du site. Histoire : memoire/grille-et-majoration.md.

   LA GRILLE EST PAR HÔTEL, jamais globale : deux partenaires ne se
   négocient pas au même prix. D'où cet objet indexé par hôtel plutôt
   qu'une liste de forfaits posée à côté de « GAMMES ».
   ===================================================================== */
(function(racine){
  "use strict";
  var HOTELS = {
    "easyhotel-aeroville": {
      /* LE LIBELLÉ EST CELUI QUE L'HÔTEL ET LA RÉCEPTION EMPLOIENT ENTRE
         EUX. Le cahier des charges en donnait deux ; c'est celui-ci. Ne pas
         le réécrire pour faire plus complet. */
      nom:"easyHotel Aéroville",
    /* LE NOM COURT SERT AU REPÈRE DU TABLEAU DE BORD, où il doit tenir à
       côté d'une référence et d'un prix. On l'écrit plutôt que de le
       découper du nom complet : « Hôtel du Parc » donnerait « Hôtel », qui
       ne distingue rien le jour où il y a deux partenaires. */
    court:"easyHotel",
      /* AUCUN CO-MARQUAGE SANS SON ACCORD ÉCRIT (24/10/2026). « coMarquage »
         dit si l'hôtel a accepté qu'on associe sa marque à la nôtre : sa
         pastille dans l'en-tête, « Tarifs partenaires ». easyHotel a refusé
         d'être cité pour l'instant : ses pages disent d'où l'on part, pas
         avec qui l'on travaille. Le passer à true demande cet accord. */
      coMarquage:false,
      /* ═══ LES COULEURS DU PARTENAIRE, RANGÉES AVEC LUI ═══
         À sa demande : « fais les couleurs orange comme easyHotel ». Elles
         vivent sur l'hôtel et pas dans le CSS, exactement comme sa grille :
         le partenaire suivant sera peut-être bleu, et une couleur écrite en
         dur dans la feuille de style obligerait à la déjouer au lieu de la
         déclarer.
         LES VALEURS SONT MESURÉES, PAS CHOISIES À L'ŒIL (WCAG) :
         — « vif » #FF6600 est l'orange d'easyHotel. Du blanc dessus donne
           2,94 : ILLISIBLE. On n'y pose donc que de l'encre (5,86) ou on
           s'en sert sur du charbon (5,87).
         — « bouton » #C2410C est le même orange assombri jusqu'à ce que le
           blanc passe (5,18) : c'est lui qui porte les actions.
         — « pale » #FFF1E8 avec « paleEncre » #7C2D12 donne 8,48.
         ET SURTOUT : l'orange est à 24° de teinte du ROUGE de l'attente
         (#C9302F, 0°). Les deux se disputeraient l'attention posés côte à
         côte. L'orange habille donc le CADRE et l'ACTION — l'en-tête, le
         bouton principal, le bloc d'aide — et **jamais la liste**, qui
         reste neutre pour que son seul rouge continue de crier. */
      marque: { charbon:"#1B1B1B", vif:"#FF6600", bouton:"#C2410C",
                pale:"#FFF1E8", paleEncre:"#7C2D12",
                /* LE DÉGRADÉ DE LA FINITION (hotel-engine-polish.css), validé
                   par Barbaros en septembre. Ces quatre clés sont propres à
                   easyHotel : un hôtel qui ne les porte pas prend ses
                   actions sur « bouton » et ses bandeaux sur « vif ». */
                finition:"#ff5a0a", finition2:"#ff761b",
                finitionPale:"#fff0e7", finitionEncre:"#9a3500",
                /* SUR SON ORANGE, LE TEXTE EST NOIR (21/10/2026, choix de
                   Barbaros sur maquette) : #1B1B1B lit à 5,5:1 sur
                   #ff5a0a, le blanc à 3,1:1. Un hôtel sans cette clé garde
                   le blanc sur ses actions. */
                texteAction:"#1B1B1B" },
      /* LA PHOTO DE L'HÔTEL — vide tant qu'il ne l'a pas fournie, et
         l'en-tête est dessiné pour tenir sans elle. On ne va PAS la
         chercher sur Internet : une photo appartient à son photographe ou
         à l'hôtel, et ce projet a déjà dû supprimer douze images prises
         sur Google. Elle viendra d'easyHotel, qui a des photos de presse.
         Poser ici un chemin relatif, par exemple "photos/easyhotel.jpg". */
      photo:"",
      /* LA PHOTO DU BANDEAU DE LA PAGE CLIENT (la finition), jamais reprise
         au comptoir. Un hôtel sans photo a un bandeau en aplat. Vidée le
         20/10/2026 : elle venait du site d'easyHotel, sans accord écrit, et
         un CDN étranger pouvait casser la page du QR. REMISE LE 25/10/2026
         avec LA SIENNE : le bâtiment, photographié par Barbaros, recadré sans
         l'enseigne du toit, sans données de position. Servie par le dépôt
         (chemin commençant par « / »), jamais une adresse « http ». La page
         du QR (sites/easyhotel-client/) porte la même en fond de bandeau. */
      photoEntete:"/photos/easyhotel-aeroville-batiment.webp",
      /* LA PHOTO DE L'EN-TÊTE DU COMPTOIR (?reception=), et du comptoir
         seulement (20/10/2026, Barbaros). C'est la sienne, prise à cette
         réception, servie depuis le dépôt ; l'écran publicitaire et les deux
         tableaux sont floutés (une offre de l'hôtel qui expire, des œuvres
         qui ne sont pas à nous). Chemin ABSOLU : la page vit sous
         /easyhotel-reception/ et /reception/<clé>/. */
      photoComptoir:"/photos/easyhotel-aeroville-reception.webp",
      /* La page du QR de l'hôtel, où ramène le logo de sa page client. */
      pageClient:"/easyhotel-client/",
      /* MAIS L'ADRESSE POSTALE COMPLÈTE PART CHEZ LE CHAUFFEUR. Plusieurs
         easyHotel entourent Roissy : un nom de marque seul envoie la
         voiture au mauvais, à 5 h du matin, avec un vol à prendre. Le nom
         est pour l'écran, l'adresse est pour le chauffeur — deux besoins
         différents, et il faut les deux. */
      adresse:"10 rue de la Belle Borne, 93410 Tremblay-en-France",
      /* COORDONNÉES DE SECOURS SEULEMENT. À l'ouverture, l'adresse
         ci-dessus est relue par la Base Adresse Nationale — le même
         service que pour n'importe quelle adresse du site — et ce sont
         SES coordonnées qui servent : on ne devine pas un point sur une
         carte quand on peut le demander. Celles-ci ne servent que si la
         BAN est injoignable, sinon une réception hors ligne n'aurait aucun
         départ. Elles ne changent AUCUN forfait, qui sont fixes : elles ne
         pèsent que sur « autre destination », au kilométrage. */
      lat:48.9640, lon:2.5480,
      /* Le QR du flyer porte le nom en clair (« ?h=easyHotel Aéroville »),
         pas un identifiant : un identifiant obligerait à tenir une table de
         correspondance, donc à réimprimer le flyer le jour où elle change.
         On reconnaît donc plusieurs écritures du même hôtel. */
      alias:["easyhotel aeroville","easyhotel paris charles de gaulle villepinte",
             "easyhotel villepinte","easyhotel cdg","easyhotel","aeroville"],
      destinations:[
        { cle:"cdg",        nom:"Aéroport CDG",           aeroport:"cdg",
          forfait:{ berline:35,  van:50  } },
        { cle:"orly",       nom:"Orly",                   aeroport:"orly",
          forfait:{ berline:90,  van:130 } },
        { cle:"bourget",    nom:"Le Bourget",
          label:"Aéroport de Paris-Le Bourget, 93350 Le Bourget",
          lat:48.9694, lon:2.4414, rayonKm:2.5,
          forfait:{ berline:35,  van:70  } },
        { cle:"beauvais",   nom:"Beauvais",               aeroport:"beauvais",
          forfait:{ berline:180, van:240 } },
        { cle:"villepinte", nom:"Expositions Villepinte",
          label:"Parc des Expositions de Paris-Nord Villepinte, 93420 Villepinte",
          lat:48.9736, lon:2.5153, rayonKm:1.5,
          forfait:{ berline:35,  van:50  } },
        { cle:"disney",     nom:"Disney",
          label:"Disneyland Paris, 77700 Marne-la-Vallée",
          lat:48.8722, lon:2.7758, rayonKm:3,
          forfait:{ berline:80,  van:120 } },
        /* PARIS N'EST PAS UNE ADRESSE, c'est une ville de dix kilomètres de
           large. Le forfait vaut, mais le chauffeur a besoin d'une rue :
           cette ligne-là OUVRE le champ d'adresse. Et le forfait ne tient
           que si l'adresse retenue est bien dans Paris — sinon un
           « Versailles » tapé ici partirait à 80 € au lieu de son
           kilométrage. On mesure la distance au centre, pas le code postal :
           c'est la seule donnée présente sur toutes les adresses, quelle
           que soit la source. 7 km couvrent les vingt arrondissements, les
           deux bois compris. */
        { cle:"paris",      nom:"Paris", label:"Paris", adresseLibre:true,
          lat:48.8566, lon:2.3522, rayonKm:7,
          forfait:{ berline:80,  van:120 } }
      ]
    }
  };

  /* CHAQUE HÔTEL PORTE SA PROPRE CLÉ, posée ici plutôt que recopiée dans
     l'objet : recopiée, elle finirait par ne plus correspondre au nom sous
     lequel il est rangé, et c'est cette clé qui part sur la course et que
     le serveur interroge pour rendre son historique à une réception. Deux
     écritures d'une même clé, c'est un hôtel qui ne voit plus rien. */
  Object.keys(HOTELS).forEach(function(k){ HOTELS[k].cle = k; });
  racine.ELA_HOTELS = HOTELS;
})(typeof window !== "undefined" ? window : globalThis);
