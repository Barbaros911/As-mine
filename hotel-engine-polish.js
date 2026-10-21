(function(){
  'use strict';
  function getParams(){try{return new URLSearchParams(location.search);}catch(e){return null;}}
  var p=getParams();
  /* LE COMPTOIR A LA MÊME FINITION QUE LE CLIENT (23/09/2026, à la demande
     de Barbaros : « même logique que le site client hôtel »). Il en était
     exclu : la réception voyait l'ancien ordre des champs, avec la chambre
     collée au départ et une promesse de service en chambre. Une seule
     finition pour deux entrées, sinon l'une vieillit pendant que l'autre
     avance. Ce qui diffère au comptoir est dit à l'endroit où ça diffère. */
  if(!p) return;
  /* ═══ UNE FINITION POUR TOUS LES HÔTELS (11/10/2026, à la demande de
     Barbaros : « fait le comme un expert ») ═══
     Elle était écrite pour easyHotel seul : son nom, son adresse, son
     adresse de page et sa photo y étaient en dur. Un second partenaire
     aurait eu le moteur nu, et la démo ne pouvait pas la charger (elle
     nommait un partenaire réel). Désormais RIEN ici ne nomme un hôtel :
     tout vient de la fiche de l'hôtel ouvert (HOTELS, dans la page), que le
     moteur expose par window.ELA_HOTEL_ACTIF. verifier-demo.mjs refuserait
     la construction si un nom de partenaire revenait dans ce fichier. */
  var racine=document.documentElement;
  var espace=racine.getAttribute('data-ela-space')||'';
  if(espace!=='hotel-client' && espace!=='hotel-reception' && espace!=='demo'
     && !p.get('h') && !p.get('reception')) return;
  function hotelActif(){try{return window.ELA_HOTEL_ACTIF?window.ELA_HOTEL_ACTIF():null;}catch(e){return null;}}
  /* LE COMPTOIR SE RECONNAÎT À LA PAGE, PAS AU NOM DE L'HÔTEL : sur sa page
     dédiée (data-ela-space), ou quand le moteur a ouvert la réception
     (body.reception — c'est le cas de la démo, qui s'ouvre plus tard, après
     la réponse du serveur des démonstrations). */
  var comptoir=false, placeSuivie=false;
  function estComptoir(){return espace==='hotel-reception'||!!(document.body&&document.body.classList.contains('reception'));}

  function enhanceHotel(){
    var h=hotelActif();
    if(!h || !document.body.classList.contains('hotel')) return;
    comptoir=estComptoir();
    document.body.classList.add('hotel-enhanced');
    /* SANS PHOTO, LE BANDEAU N'EST PAS UN GRAND VIDE : il passe en aplat,
       comme au comptoir (hotel-engine-polish.css). */
    document.body.classList.toggle('eh-sans-photo',!h.photoEntete);

    var head=document.querySelector('.entete');
    var actions=document.querySelector('.entete-actions');
    var chip=document.querySelector('.hotel-partner-chip');
    if(head && actions && !chip){
      chip=document.createElement('div');
      chip.className='hotel-partner-chip';
      chip.appendChild(document.createElement('b'));
      chip.appendChild(document.createElement('span'));
      head.insertBefore(chip,actions);
    }
    /* LA PASTILLE DIT LE NOM COURT EN GROS, LE RESTE DESSOUS : « easyHotel »
       puis « Aéroville ». Posé en textContent, jamais en HTML : dans la démo
       ce nom est saisi par le prospect. */
    if(chip){
      var court=h.court||h.nom||'', reste='';
      if(h.nom && court && h.nom.indexOf(court)===0) reste=h.nom.slice(court.length).replace(/^[\s·,\-–—]+/,'');
      var cb=chip.querySelector('b'), cs=chip.querySelector('span');
      if(cb && cb.textContent!==court) cb.textContent=court;
      if(cs && cs.textContent!==reste) cs.textContent=reste;
      chip.classList.toggle('eh-chip-long',court.length>12);
    }
    var logoLink=head&&head.querySelector('.logo');
    var accueil=comptoir?(espace==='hotel-reception'?location.pathname:''):(h.pageClient||'');
    if(logoLink && accueil && logoLink.getAttribute('href')!==accueil){
      logoLink.href=accueil;
      logoLink.setAttribute('aria-label',(comptoir?'Retour à l’espace réception ':'Retour à la page ')+h.nom);
    }

    var chambre=document.getElementById('blocChambre');
    var blocCoord=document.getElementById('blocCoordonnees');
    if(chambre && blocCoord && !blocCoord.classList.contains('hotel-guest-early')){
      /* AU COMPTOIR, PAS DE LIBELLÉS DOUBLÉS « Chambre / Room » (30/09/2026) :
         le sélecteur FR/EN y est gardé, c'est lui qui traduit. index.html y
         pose ses propres clés de traduction (« nom_comptoir »…). */
      if(!comptoir){
        var titre=blocCoord.querySelector('.bloc-titre');
        if(titre){titre.textContent='Client / Guest';titre.removeAttribute('data-t');}
        var nom=blocCoord.querySelector('label[for="clientNom"] .champ-titre');
        if(nom){nom.textContent='Nom du client / Guest name';nom.removeAttribute('data-t');}
        var tel=blocCoord.querySelector('label[for="clientTel"] .champ-titre');
        if(tel){tel.textContent='Téléphone / Phone';tel.removeAttribute('data-t');}
      }
      blocCoord.classList.add('hotel-guest-early');
      /* L'ORDRE D'UN TUNNEL : LE TRAJET D'ABORD, LA PERSONNE ENSUITE
         (23/09/2026, à la demande de Barbaros). Le départ est suivi tout de
         suite de la destination — déjà choisie sur la page du QR —, puis
         de la date et des passagers ; le client vient après, juste avant
         la précision pour le chauffeur. */
      var note=document.getElementById('blocNote');
      if(note) note.insertAdjacentElement('beforebegin',blocCoord);
      else chambre.insertAdjacentElement('afterend',blocCoord);
      /* LA CHAMBRE EST RANGÉE AVEC LE CLIENT, SOUS SON NOM, ET ELLE EST
         FACULTATIVE — elle ne l'a jamais été dans le code, le libellé ne
         le disait pas. La phrase « il vient vous chercher sans attendre à
         la réception » part : elle promettait un service de chambre que
         personne n'a demandé de tenir. */
      var nomLabel=blocCoord.querySelector('label[for="clientNom"]');
      var tCh=chambre.querySelector('.champ-titre');
      /* AU COMPTOIR AUSSI, DEPUIS LE 11/10/2026 : la chambre ne suffit plus,
         le lien de paiement part sur le téléphone du client. Elle reste
         notée, facultative, sous le nom — comme côté client. */
      if(nomLabel) nomLabel.insertAdjacentElement('afterend',chambre);
      if(tCh){tCh.textContent='Chambre / Room (facultatif)';tCh.removeAttribute('data-t');}
      var aideCh=chambre.querySelector('.champ-aide');
      if(aideCh) aideCh.remove();
    }

    var sel=document.getElementById('hotelDest');
    /* Une carte de la landing doit ouvrir la bonne destination, pas le CDG
       par défaut. Le moteur peut construire les options après ce script :
       enhanceHotel repasse jusqu'à ce que la valeur demandée existe. */
    var preset=p.get('dest');
    /* « dest=autre » est la carte « Autre destination » de la landing :
       l'option du moteur porte une valeur VIDE (aucune clé de la grille ne
       peut la prendre), et c'est elle qui rend la main au calcul à la
       distance. Sans cette traduction le moteur ouvrait sur CDG au forfait. */
    if(preset==='autre') preset='';
    if(sel && preset!==null && !sel.dataset.landingPresetApplied){
      var presetExists=Array.prototype.some.call(sel.options,function(o){return o.value===preset;});
      if(presetExists){
        sel.value=preset;
        sel.dataset.landingPresetApplied='1';
        sel.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }
    /* « vue=reservations » vient du bouton « Réservations de l'hôtel » de la
       page du comptoir : on ouvre la liste (l'écran du code d'abord si la
       session n'est pas ouverte) une seule fois, pas à chaque passage. */
    var acces=document.getElementById('btnReception');
    if(comptoir && p.get('vue')==='reservations' && acces && !acces.hidden && !acces.dataset.vueOuverte){
      acces.dataset.vueOuverte='1';
      acces.click();
    }
    /* LE BLOC « Destinations populaires » (trois photos) A ÉTÉ RETIRÉ le
       22/09/2026. Il répétait le choix que fait désormais la page du QR
       (sites/easyhotel-client/), et sa vignette « Villepinte / Le Bourget »
       choisissait VILLEPINTE : un client du Bourget partait vers la mauvaise
       adresse, à un autre prix. Le menu « Destination » du moteur reste. */
  }

  /* L'espace Réception garde exactement le même moteur et les mêmes champs,
     mais il doit se lire comme un outil de comptoir. Cette couche ne crée
     aucune donnée et ne remplace aucun contrôle : elle hiérarchise les deux
     actions, regroupe visuellement le tunnel et précise les catégories de
     véhicule. */
  /* ═══ « DÉPART IMMÉDIAT » : UNE TUILE À CÔTÉ DE « NOUVELLE COURSE » ═══
     20/10/2026, à la demande de Barbaros (« pour une réservation immédiate,
     appeler Elatransfer », choisie sur maquette parmi trois). Une demande en
     ligne attend qu'on trouve un chauffeur ; un appel le cherche pendant
     qu'on parle. Les deux gestes sont donc côte à côte, au moment où la
     réception décide : réserver pour plus tard, ou appeler maintenant.
     Noire et non rouge : le rouge dit « en attente » dans la liste. Le
     numéro est repris du bloc d'aide de la page, jamais recopié ici. Sur un
     petit écran, le numéro ne tient pas : la tuile dit « Appuyez pour
     appeler », le doigt suffit. */
  var ICONE_TEL='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.6 3.5h2.6l1.5 4-2 1.4a11 11 0 0 0 6.4 6.4l1.4-2 4 1.5v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>';
  function tuileAppel(actions,anglais){
    var tel=document.querySelector('.rec-aide-tel');
    if(!actions || !tel) return;
    var a=document.getElementById('recAppelImmediat');
    if(!a){
      a=document.createElement('a');a.id='recAppelImmediat';a.className='reception-action eh-appel';
      a.innerHTML='<span class="reception-action-icon" aria-hidden="true">'+ICONE_TEL+'</span>'
        +'<span class="reception-action-copy"><b></b><small><span class="eh-long"></span><span class="eh-court"></span></small></span>';
    }
    if(a.parentNode!==actions) actions.appendChild(a);
    document.body.classList.add('eh-avec-appel');
    if(a.getAttribute('href')!==tel.getAttribute('href')) a.setAttribute('href',tel.getAttribute('href'));
    var titre=anglais?'LEAVING NOW':'DÉPART IMMÉDIAT';
    var long=(anglais?'Call ':'Appelez le ')+tel.textContent;
    var court=anglais?'Tap to call us':'Appuyez pour appeler';
    function ecrire(el,v){if(el && el.textContent!==v) el.textContent=v;}
    ecrire(a.querySelector('b'),titre);
    ecrire(a.querySelector('.eh-long'),long);
    ecrire(a.querySelector('.eh-court'),court);
    var label=titre+' — '+long;
    if(a.getAttribute('aria-label')!==label) a.setAttribute('aria-label',label);
  }

  function receptionPremium(){
    if(!comptoir || !hotelActif()) return;
    document.body.classList.add('reception-premium');
    var anglais=document.documentElement.lang==='en';
    function texte(el,valeur){if(el && el.textContent!==valeur) el.textContent=valeur;}
    function libelleEtape(id,numero,titre,sousTitre){
      var el=document.getElementById(id);
      if(!el){
        el=document.createElement('div');el.id=id;el.className='reception-step';
        el.innerHTML='<span class="reception-step-num"></span><span class="reception-step-copy"><b></b><small></small></span>';
      }
      texte(el.querySelector('.reception-step-num'),numero);
      texte(el.querySelector('b'),titre);
      texte(el.querySelector('small'),sousTitre);
      return el;
    }
    function habillerAction(btn,icone,titre,sousTitre){
      if(!btn) return;
      btn.classList.add('reception-action');
      if(!btn.querySelector('.reception-action-icon')){
        btn.textContent='';
        var i=document.createElement('span');i.className='reception-action-icon';i.setAttribute('aria-hidden','true');
        var c=document.createElement('span');c.className='reception-action-copy';
        var b=document.createElement('b');var s=document.createElement('small');
        c.appendChild(b);c.appendChild(s);btn.appendChild(i);btn.appendChild(c);
      }
      texte(btn.querySelector('.reception-action-icon'),icone);
      texte(btn.querySelector('b'),titre);
      texte(btn.querySelector('small'),sousTitre);
      btn.setAttribute('aria-label',titre+' — '+sousTitre);
    }

    /* LA RÉCEPTION V2 (21/10/2026, maquette validée par Barbaros) : un
       bandeau bleu nuit commun aux écrans du comptoir. Le logo d'origine y
       disparaît (lettres bleu nuit sur bleu nuit) : c'est la version
       négative, celle de l'en-tête public. On n'écrit que si elle diffère —
       l'observateur se rappellerait lui-même. */
    var logoImg=document.querySelector('.entete .logo-image');
    if(logoImg && logoImg.getAttribute('src')!=='/brand-logo-negatif.webp') logoImg.setAttribute('src','/brand-logo-negatif.webp');
    /* Les horaires en gras (réservation 24 h/24, assistance humaine 7 h–22 h,
       21/10/2026), le reste en clair, et une icône : la même ligne sous le nom
       de l'hôtel, sur le formulaire ET sur la liste. */
    function assistance(el){
      if(!el) return;
      if(!el.querySelector('.reception-hours-copy')){
        el.textContent='';
        var ic=document.createElement('span');ic.className='reception-hours-icon';ic.setAttribute('aria-hidden','true');
        var c=document.createElement('span');c.className='reception-hours-copy';
        c.appendChild(document.createElement('b'));c.appendChild(document.createElement('span'));
        el.appendChild(ic);el.appendChild(c);
      }
      texte(el.querySelector('.reception-hours-copy b'),anglais
        ? 'Book 24/7 · Human support 7\u00a0am–10\u00a0pm'
        : 'Réservation 24\u00a0h/24 · Assistance humaine 7\u00a0h–22\u00a0h');
      texte(el.querySelector('.reception-hours-copy span'),anglais
        ? ' · Leaving now? Call us, it is the fastest way'
        : ' · Départ immédiat ? Appelez-nous, c’est le plus rapide');
    }

    var tete=document.getElementById('hotelTete');
    var sur=tete&&tete.querySelector('.hotel-sur');
    texte(sur,anglais?'RECEPTION DESK':'ESPACE RÉCEPTION');
    if(sur) sur.removeAttribute('data-t');
    if(tete){
      var horaires=document.getElementById('receptionHoraires');
      if(!horaires){
        horaires=document.createElement('p');horaires.id='receptionHoraires';
        horaires.className='reception-hours';
        var adresse=tete.querySelector('.hotel-adresse');
        if(adresse) adresse.insertAdjacentElement('afterend',horaires);
      }
      assistance(horaires);

      var actions=document.getElementById('receptionActions');
      var liste=document.getElementById('btnReception');
      /* UNE SEULE TUILE PAR ÉCRAN, CELLE QUI MÈNE À L'AUTRE (30/09/2026).
         Le formulaire portait aussi « Nouvelle course », qui ne faisait que
         descendre de quelques centimètres sur l'écran où l'on était déjà :
         deux grosses tuiles pour un seul vrai geste. */
      if(!actions){
        actions=document.createElement('div');actions.id='receptionActions';actions.className='reception-actions';
        if(liste) actions.appendChild(liste);
        tete.appendChild(actions);
      }
      habillerAction(liste,'≡',
        anglais?'Hotel bookings':'Réservations de l’hôtel',
        anglais?'View and track bookings':'Voir et suivre les réservations');
      /* SA PLACE SUIT L'ÉCRAN (V2, 21/10/2026) : dans la barre du haut à
         partir de 600 px, à côté de FR/EN ; sous le nom de l'hôtel sur un
         téléphone, où la barre n'a plus la place. Le même bouton, déplacé —
         jamais recopié : son écouteur reste celui du moteur. */
      var large=!window.matchMedia||window.matchMedia('(min-width:600px)').matches;
      var barreHaut=document.querySelector('.entete-actions');
      if(large && barreHaut){
        if(actions.parentNode!==barreHaut) barreHaut.insertBefore(actions,barreHaut.querySelector('.langues'));
      } else if(actions.parentNode!==tete) tete.appendChild(actions);
      if(window.matchMedia && !placeSuivie){
        placeSuivie=true;
        var mq=window.matchMedia('(min-width:600px)');
        if(mq.addEventListener) mq.addEventListener('change',receptionPremium); else if(mq.addListener) mq.addListener(receptionPremium);
      }
    }

    var formulaire=document.querySelector('#ecran-accueil .reserver');
    if(formulaire){
      var etape1=libelleEtape('receptionEtape1','1',
        anglais?'Trip':'Trajet',
        anglais?'Trip details':'Informations du trajet');
      if(!etape1.parentNode) formulaire.insertBefore(etape1,formulaire.firstElementChild);
      /* Départ ou arrivée de l'hôtel : c'est le premier choix du TRAJET, il
         se fait dans sa carte, à droite de son titre (V2). Le moteur
         rallume ses boutons là où ils sont (index.html). */
      var sens=document.querySelector('.hotel-sens');
      if(sens && sens.parentNode!==etape1) etape1.appendChild(sens);

      /* La chambre / identité appartient au trajet, avant le véhicule. Les
         éléments sont déplacés, jamais dupliqués : les écouteurs et les
         contrôles du moteur restent ceux d'origine. */
      var coord=document.getElementById('blocCoordonnees');
      var note=document.getElementById('blocNote');
      /* « Chambre / Room » sert au client qui scanne le QR ; au comptoir la
         langue se choisit en haut, et le libellé tient sur une ligne. */
      var titreChambre=document.querySelector('label[for="chambre"] .champ-titre');
      if(titreChambre){titreChambre.removeAttribute('data-t');texte(titreChambre,anglais?'Room (optional)':'Chambre (facultatif)');}
      if(document.body.classList.contains('compte-unique') && coord && note && !coord.dataset.receptionOrdre){
        formulaire.insertBefore(coord,note);coord.dataset.receptionOrdre='1';
      }

      var vehicules=document.getElementById('listeVehicules');
      if(vehicules){
        var etape2=libelleEtape('receptionEtape2','3',
          anglais?'Vehicle & price':'Véhicule & prix',
          anglais?'The price is set in advance':'Le prix est annoncé à l’avance');
        if(!etape2.parentNode) vehicules.parentNode.insertBefore(etape2,vehicules);
      }

      /* DEUX COLONNES (V2, 21/10/2026) : à gauche ce qu'on SAISIT (le
         trajet, puis le client sur un fond à part), à droite ce qu'on
         DÉCIDE (la gamme, le prix, « Valider »), qui reste à l'écran sur un
         ordinateur. Les blocs sont DÉPLACÉS une seule fois, jamais recopiés :
         écouteurs, contrôles et textes restent ceux du moteur. Seulement au
         comptoir en une page (compte-unique), quand tout est là. */
      if(!document.getElementById('recSaisie') && document.body.classList.contains('compte-unique')
         && etape1.parentNode===formulaire && vehicules && coord && note && document.getElementById('btnVoirPrix')){
        var saisie=document.createElement('div');saisie.id='recSaisie';saisie.className='rec-saisie';
        var client=document.createElement('div');client.id='recClient';client.className='rec-client';
        var decision=document.createElement('div');decision.id='recDecision';decision.className='rec-decision';
        var versClient=['blocCoordonnees','blocContact','blocNote'];
        var versDecision=['receptionEtape2','listeVehicules','blocPaiement','btnVoirPrix'];
        Array.prototype.slice.call(formulaire.children).forEach(function(el){
          if(versClient.indexOf(el.id)!==-1) return;
          if(versDecision.indexOf(el.id)!==-1 || el.classList.contains('rassure') || el.classList.contains('etapes-ligne')) decision.appendChild(el);
          else saisie.appendChild(el);
        });
        versClient.forEach(function(id){var b=document.getElementById(id);if(b) client.appendChild(b);});
        saisie.appendChild(client);
        formulaire.appendChild(saisie);formulaire.appendChild(decision);
        formulaire.classList.add('rec-deux-colonnes');
      }
    }

    document.querySelectorAll('#listeVehicules .veh-carte').forEach(function(carte){
      var corps=carte.querySelector('.veh-corps');if(!corps) return;
      var exemple=corps.querySelector('.veh-exemple');
      if(!exemple){exemple=document.createElement('span');exemple.className='veh-exemple';
        var detail=corps.querySelector('.veh-detail');corps.insertBefore(exemple,detail);}
      var berline=carte.dataset.cle==='berline';
      texte(exemple,anglais
        ? (berline?'Toyota, Peugeot, Mercedes, Citroën or equivalent model':'Mercedes, Ford, Renault or equivalent model')
        : (berline?'Toyota, Peugeot, Mercedes, Citroën ou modèle équivalent':'Mercedes, Ford, Renault ou modèle équivalent'));
    });

    var cta=document.querySelector('#btnVoirPrix span');
    texte(cta,anglais?'Confirm booking':'Valider la réservation');
    if(cta) cta.removeAttribute('data-t');

    var bon=document.querySelector('#ecran-bon .bon');
    if(bon){
      var etape3=libelleEtape('receptionEtape3','4',
        'Confirmation',
        anglais?'Request received and reference created':'Demande reçue et référence créée');
      if(!etape3.parentNode) bon.parentNode.insertBefore(etape3,bon);
    }

    var ecranReception=document.getElementById('ecran-reception');
    var titreListe=ecranReception&&ecranReception.querySelector('.rec-titre');
    texte(titreListe,anglais?'RECEPTION DESK':'ESPACE RÉCEPTION');
    var hotelListe=document.getElementById('recHotel');
    if(hotelListe) hotelListe.setAttribute('aria-label',anglais?'Hotel concerned':'Hôtel concerné');
    if(ecranReception){
      var adresseRec=document.getElementById('recAdresseHotel');
      if(!adresseRec){adresseRec=document.createElement('p');adresseRec.id='recAdresseHotel';adresseRec.className='rec-adresse';
        if(hotelListe) hotelListe.insertAdjacentElement('afterend',adresseRec);}
      var hRec=hotelActif();
      texte(adresseRec,hRec&&hRec.adresse||'');
      var assistRec=document.getElementById('recAssistance');
      if(!assistRec){assistRec=document.createElement('p');assistRec.id='recAssistance';assistRec.className='reception-hours';
        adresseRec.insertAdjacentElement('afterend',assistRec);}
      assistance(assistRec);

      var corpsRec=document.getElementById('recCorps');
      var chiffres=document.querySelector('.rec-chiffres');
      if(corpsRec){
        var actionsRec=document.getElementById('recDashboardActions');
        var btnReserver=document.getElementById('btnRecReserver');
        if(!actionsRec){
          actionsRec=document.createElement('div');actionsRec.id='recDashboardActions';actionsRec.className='reception-actions rec-dashboard-actions';
          /* « Réservations de l'hôtel » n'est plus répété ici : on EST sur
             les réservations, la tuile ne faisait que descendre de 24 px, et
             le même titre était écrit juste en dessous. */
          if(btnReserver) actionsRec.appendChild(btnReserver);
          corpsRec.insertBefore(actionsRec,corpsRec.firstElementChild);
        }
        habillerAction(btnReserver,'＋',anglais?'NEW RIDE':'NOUVELLE COURSE',
          anglais?'Book a transfer for a guest':'Réserver un transfert pour un client');
        tuileAppel(actionsRec,anglais);
        /* V2 (21/10/2026) : « Un imprévu ? » est la troisième tuile de la
           rangée, toujours la DERNIÈRE ; « Actualiser » rejoint la recherche
           et les onglets, sur leur ligne. Déplacés, jamais recopiés : le
           moteur les retrouve par leurs identifiants. */
        var aideRec=corpsRec.querySelector('.rec-aide');
        if(aideRec && (aideRec.parentNode!==actionsRec || aideRec.nextElementSibling)) actionsRec.appendChild(aideRec);
        var outilsRec=corpsRec.querySelector('.rec-outils'), majRec=corpsRec.querySelector('.rec-maj');
        if(outilsRec && majRec && majRec.parentNode!==outilsRec){
          var periodeRec=document.getElementById('recPeriode');
          outilsRec.insertBefore(majRec,periodeRec&&periodeRec.parentNode===outilsRec?periodeRec:null);
        }
        if(chiffres){
          var titreCourses=document.getElementById('recListeTitre');
          if(!titreCourses){titreCourses=document.createElement('div');titreCourses.id='recListeTitre';titreCourses.className='rec-liste-titre';
            titreCourses.innerHTML='<b></b><span></span>';chiffres.parentNode.insertBefore(titreCourses,chiffres);}
          texte(titreCourses.querySelector('b'),anglais?'HOTEL BOOKINGS':'RÉSERVATIONS DE L’HÔTEL');
          texte(titreCourses.querySelector('span'),anglais?'Priority and upcoming rides':'Courses prioritaires et à venir');
        }
      }

      var intro=document.querySelector('#recVerrou .rec-intro');
      /* 30 jours, pas « une fois » (30/09/2026) : c'est la durée du jeton
         signé par le serveur (_shared/hotel-session.ts). */
      texte(intro,anglais
        ? 'This code stays active for 30 days on this device, then you will be asked for it again: keep it safe.'
        : 'Ce code reste actif 30 jours sur cet appareil, puis il vous sera redemandé : gardez-le bien.');
      var sess=document.getElementById('recSession');
      if(sess && sess.dataset.fin){
        var fin=new Date(Number(sess.dataset.fin));
        var j=fin.toLocaleDateString(anglais?'en-GB':'fr-FR',{weekday:'long',day:'numeric',month:'long'});
        texte(sess,anglais
          ? 'Code kept on this device until '+j+'. Keep it safe: you will be asked for it again afterwards.'
          : 'Code gardé sur cet appareil jusqu’au '+j+'. Gardez-le bien : il vous sera redemandé ensuite.');
      }
      texte(document.getElementById('btnRecAlerteOk'),anglais?'OK':'Vu');
      var codeTitre=document.querySelector('label[for="recCode"] .champ-titre');
      texte(codeTitre,anglais?'Reception access code':'Code d’accès Réception');
      var codeChamp=document.getElementById('recCode');if(codeChamp) codeChamp.placeholder=anglais?'Your code':'Votre code';
      var btnEntrer=document.getElementById('btnRecEntrer');
      texte(btnEntrer,anglais?'Open reception desk':'Ouvrir l’espace Réception');
      if(btnEntrer && !btnEntrer.dataset.receptionScroll){
        btnEntrer.dataset.receptionScroll='1';
        btnEntrer.addEventListener('click',function(){
          var essais=0,minuterie=setInterval(function(){
            essais++;
            var corps=document.getElementById('recCorps');
            if(corps && !corps.hidden){window.scrollTo(0,0);clearInterval(minuterie);}
            else if(essais>=30) clearInterval(minuterie);
          },100);
        });
      }
      texte(document.querySelector('.rec-aide-titre'),anglais?'Something unexpected?':'Un imprévu ?');
      texte(document.querySelector('.rec-aide-texte'),anglais
        ? 'Delay, change, cancellation: call us.'
        : 'Retard, changement, annulation : appelez-nous.');
      /* « Actualiser » est écrit par la page elle-même (dessinerMaj) : il
         change pendant la lecture, la finition ne doit pas l'écraser. */
      texte(document.getElementById('btnRecFermer'),anglais?'Close session':'Fermer la session');
      /* LA LISTE EST DESSINÉE EN FRANÇAIS ; on garde le français d'origine
         sur l'élément (data-fr) pour pouvoir y REVENIR. Sans ça, repasser en
         FR laissait « Pending » et « Tomorrow » à l'écran. */
      function trad(el,en){
        if(!el) return;
        if(!el.dataset.fr) el.dataset.fr=el.textContent;
        texte(el,anglais&&en?en:el.dataset.fr);
      }
      document.querySelectorAll('.rec-etat').forEach(function(etat){
        var traductions={attente:'Pending',confirmee:'Confirmed',en_cours:'In progress',realisee:'Completed',refusee:'Unavailable',annulee:'Cancelled'};
        var en=null;
        Object.keys(traductions).some(function(c){if(etat.classList.contains(c)){en=traductions[c];return true;}return false;});
        trad(etat,en);
      });
      /* LES AUTRES JOURS SE TRADUISENT AUSSI (11/10/2026) : « lundi 13
         octobre » restait en français en anglais. La démo le faisait de son
         côté ; la finition étant commune, c'est ici qu'il vit désormais. */
      var JOURS_EN={lundi:'Monday',mardi:'Tuesday',mercredi:'Wednesday',jeudi:'Thursday',vendredi:'Friday',samedi:'Saturday',dimanche:'Sunday'};
      var MOIS_EN={janvier:'January','février':'February',mars:'March',avril:'April',mai:'May',juin:'June',juillet:'July','août':'August',septembre:'September',octobre:'October',novembre:'November','décembre':'December'};
      document.querySelectorAll('.rec-jour').forEach(function(j){
        var jours={"Aujourd'hui":'Today','Demain':'Tomorrow','En retard':'Overdue','Date inconnue':'Unknown date'};
        var fr=(j.dataset.fr||j.textContent).trim(), en=jours[fr];
        var m=/^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) (\d{1,2}) ([a-zéû]+)$/i.exec(fr);
        if(!en && m && MOIS_EN[m[3].toLowerCase()]) en=JOURS_EN[m[1].toLowerCase()]+' '+m[2]+' '+MOIS_EN[m[3].toLowerCase()];
        trad(j,en);
      });
      var boutons={'Appeler Elatransfer':'Call Elatransfer','Voir le bon':'View voucher'};
      document.querySelectorAll('#recListe .bouton-fantome').forEach(function(x){
        trad(x,boutons[(x.dataset.fr||x.textContent).trim()]);
      });
      /* Retrouver une course (30/09/2026) : le message « rien trouvé » est
         contextuel, écrit en français par la page ; on le traduit, et on y
         revient en FR grâce à data-fr. */
      var vide=document.getElementById('recVide');
      if(vide){
        var frVide=vide.dataset.fr||vide.textContent, enVide=null;
        var mRech=/^Aucune course ne correspond à « (.*) »\.$/.exec(frVide);
        if(mRech) enVide='No ride matches “'+mRech[1]+'”.';
        else enVide={'Aucune réservation pour le moment.':'No booking yet.',
          'Aucune course à venir.':'No upcoming ride.',
          'Aucune course passée pour le moment.':'No ride in the history yet.',
          'Aucune course sur cette période.':'No ride in this period.'}[frVide]||null;
        trad(vide,enVide);
      }
      var titreRech=document.querySelector('label[for="recRecherche"] .champ-titre');
      texte(titreRech,anglais?'Find a ride':'Retrouver une course');
      var champRech=document.getElementById('recRecherche');
      if(champRech) champRech.placeholder=anglais?'Room, name, phone or reference':'Chambre, nom, téléphone ou référence';
      var nomsVues={avenir:['À venir','Upcoming'],passees:['Historique','History'],date:['Par date','By date']};
      document.querySelectorAll('.rec-vues button').forEach(function(bv){
        var n=nomsVues[bv.dataset.vue];if(n) texte(bv.querySelector('span'),anglais?n[1]:n[0]);
      });
      /* Seul le DERNIER morceau de texte se traduit (« Réf. … ») : réécrire
         toute la ligne effacerait le N° court en gras posé devant. On
         n'écrit que s'il diffère — sinon l'observateur se rappelle lui-même. */
      document.querySelectorAll('#recListe .rec-reference').forEach(function(x){
        var t=x.lastChild;if(!t||t.nodeType!==3) return;
        if(!x.dataset.fr) x.dataset.fr=t.nodeValue;
        var v=anglais?x.dataset.fr.replace(/^Réf\. /,'Ref. '):x.dataset.fr;
        if(t.nodeValue!==v) t.nodeValue=v;
      });
    }
  }

  /* ═══ VERT QUAND C'EST BON, ROUGE QUAND IL MANQUE QUELQUE CHOSE ═══
     23/09/2026, à la demande de Barbaros. Après un appui sur une destination,
     le trajet est déjà rempli : les cadres verts le MONTRENT, et ce qui reste
     à saisir (le client, l'heure) saute aux yeux parce qu'il n'est pas vert.
     À la validation, ce qui manque s'encadre de rouge et l'écran y descend.

     LE DÉFAUT QUE ÇA CORRIGE, ET IL ÉTAIT EN LIGNE : côté client, le nom et
     le téléphone sont sur la première page, mais c'était « Confirmer », deux
     écrans plus loin, qui les contrôlait — son message d'erreur s'affichait
     sur une page cachée. Mesuré : le client appuyait, rien ne bougeait. Le
     contrôle se fait donc AVANT de quitter la page où sont les champs.

     CE QUI NE DEVIENT PAS VERT TOUT SEUL : la date et l'heure. Elles sont
     pré-remplies (maintenant + 15 min), mais c'est au client ou à la
     réception de les choisir ; un vert d'office dirait « vérifié » sur une
     valeur que personne n'a regardée. Elles passent au vert dès qu'on les
     touche, au rouge si l'heure est passée ou trop proche.

     LES RÈGLES SONT CELLES DU MOTEUR, pas d'autres : le nom et le
     téléphone sont exigés partout, comptoir compris depuis le 11/10/2026
     (le lien de paiement part sur ce numéro) ; la chambre ne l'est pas. Un numéro commencé mais
     trop court est rouge : un numéro faux fait croire qu'on peut joindre
     quelqu'un. Le moteur garde ses propres contrôles derrière — celui-ci
     les dit plus tôt, il ne les remplace pas. */
  var tentative=false, touches={};
  function $(id){return document.getElementById(id);}
  function vis(el){return !!(el && el.offsetParent);}
  function val(id){var e=$(id);return e?String(e.value||'').trim():'';}
  function cadre(el){return el ? (el.closest('.champ')||el) : null;}
  function telOk(v){return v.replace(/\D/g,'').length>=9;}
  function etats(){
    var l=[], nom=val('clientNom'), tel=val('clientTel'), ch=val('chambre');
    function pose(id,etat){var e=$(id);if(vis(e))l.push([cadre(e),etat]);}
    /* « Autre destination » a une valeur VIDE dans le menu : c'est un choix,
       pas un oubli — c'est l'adresse en dessous qui doit être remplie.
       AU COMPTOIR, CE QUE PERSONNE N'A CHOISI N'EST PAS VERT (21/10/2026) :
       la destination s'ouvre sur la première de la grille (CDG), le
       terminal, les passagers et les bagages sur leur première valeur. Une
       coche d'office disait « vérifié » sur un CDG que la réception n'avait
       pas regardé — même règle que la date et l'heure ci-dessous. Côté
       client, la destination vient de la carte touchée : elle est choisie. */
    function choisi(id){return !comptoir || touches[id] || tentative;}
    pose('hotelDest', choisi('hotelDest')?'ok':'neutre');
    pose('depart', val('depart')?'ok':'manque');
    ['hotelTerminal','passagers','bagages'].forEach(function(id){pose(id,!val(id)?'manque':choisi(id)?'ok':'neutre');});
    if(vis($('arrivee'))) pose('arrivee',val('arrivee')?'ok':'manque');
    var heureKo=vis($('heurePassee'));
    pose('date', !val('date')?'manque':(touches.date||tentative)?'ok':'neutre');
    pose('heure', !val('heure')||heureKo?'manque':(touches.heure||tentative)?'ok':'neutre');
    ['vol','noteCourse'].forEach(function(id){pose(id,val(id)?'ok':'neutre');});
    /* Le comptoir paie par lien depuis le 11/10/2026 : le nom et le
       téléphone du client sont exigés partout, la chambre ne suffit plus. */
    var parChambre=false;
    pose('chambre', ch?'ok':'neutre');
    pose('clientNom', nom?'ok':parChambre?'neutre':'manque');
    pose('clientTel', tel?(telOk(tel)?'ok':'manque'):parChambre?'neutre':'manque');
    if(comptoir){
      var liste=$('listeVehicules');
      if(vis(liste)) l.push([liste, document.querySelector('.veh-carte.choisi')?'ok':'manque']);
    }
    return l;
  }
  function peindre(){
    var premier=null;
    etats().forEach(function(x){
      var el=x[0], e=x[1];
      if(!el) return;
      el.classList.toggle('eh-ok', e==='ok');
      el.classList.toggle('eh-manque', e==='manque' && tentative);
      var identite=el.contains($('clientNom'))?'clientNom':el.contains($('clientTel'))?'clientTel':'';
      /* Un champ VIDE au comptoir : il n'est exigé que sans chambre. Un
         numéro COMMENCÉ mais trop court : il est à corriger, pas à remplir. */
      /* « Si pas de chambre » n'a plus de sens depuis le 11/10/2026 : le nom
         et le téléphone sont exigés au comptoir aussi. */
      el.classList.toggle('eh-sinon', false);
      el.classList.toggle('eh-corriger', e==='manque' && identite==='clientTel' && !!val('clientTel'));
      if(e==='manque' && !premier) premier=el;
    });
    return premier;
  }
  function verifier(){
    tentative=true;
    var premier=peindre();
    if(premier){
      premier.scrollIntoView({block:'center',behavior:'smooth'});
      var champ=premier.querySelector && premier.querySelector('input,select,textarea');
      if(champ) setTimeout(function(){try{champ.focus({preventScroll:true});}catch(e){}},350);
    }
    return !premier;
  }
  function brancherValidation(){
    if(document.body.dataset.ehValidation) return;
    var bouton=$('btnVoirPrix');
    if(!bouton || !$('clientNom')) return;
    document.body.dataset.ehValidation='1';
    ['input','change'].forEach(function(t){
      document.addEventListener(t,function(ev){
        var id=ev.target && ev.target.id;
        if(/^(date|heure|hotelDest|hotelTerminal|passagers|bagages)$/.test(id||'')) touches[id]=true;
        setTimeout(peindre,0);
      },true);
    });
    document.addEventListener('click',function(){setTimeout(peindre,0);},false);
    /* « RÉSERVER UNE AUTRE COURSE » : LE CLIENT SUIVANT REPART DE ZÉRO
       (21/10/2026, mesuré) : l'essai de validation du client précédent
       restait armé, et le formulaire vide s'ouvrait avec le nom et le
       téléphone déjà en rouge « Obligatoire » ; ses choix restaient verts.
       Pris en capture : remis à zéro avant que le moteur ne vide les champs. */
    document.addEventListener('click',function(ev){
      if(!ev.target.closest || !ev.target.closest('#btnNouvelleCourse')) return;
      tentative=false; touches={};
      setTimeout(peindre,0);
    },true);
    /* L'APPUI EST ATTRAPÉ AVANT LE MOTEUR (phase de capture) : s'il manque
       quelque chose, le moteur ne part pas vers l'écran des prix — ou, au
       comptoir, ne tente pas d'envoyer. */
    document.addEventListener('click',function(ev){
      if(!ev.target.closest || !ev.target.closest('#btnVoirPrix')) return;
      if(!verifier()){ev.preventDefault();ev.stopImmediatePropagation();}
    },true);
    /* AU COMPTOIR LE BOUTON EST GRISÉ tant qu'aucune gamme n'est choisie
       (« Complétez le trajet… ») : un bouton grisé ne reçoit pas le clic, et
       la réception appuyait sans que rien ne lui dise quoi faire. On écoute
       donc le doigt posé sur sa surface, et on montre ce qui manque. */
    document.addEventListener('pointerup',function(ev){
      if(!bouton.disabled || !vis(bouton)) return;
      var r=bouton.getBoundingClientRect();
      if(ev.clientX>=r.left&&ev.clientX<=r.right&&ev.clientY>=r.top&&ev.clientY<=r.bottom) verifier();
    },true);
    peindre();
  }

  /* Le moteur historique construit le mode hôtel après le premier chargement.
     On applique donc la finition tout de suite ET après ses mutations.
     LE MOTEUR PRÉVIENT QUAND UN HÔTEL S'OUVRE (événement « ela:hotel ») :
     sur la page d'un hôtel, c'est pendant le chargement ; dans la démo,
     après la réponse du serveur des démonstrations — parfois plus de sept
     secondes plus tard, quand l'observateur ci-dessous s'est déjà coupé.
     Chaque annonce rouvre donc une fenêtre de finition. */
  function tout(){enhanceHotel();receptionPremium();if(document.body.classList.contains('hotel-enhanced'))brancherValidation();if(document.body.dataset.ehValidation)peindre();}
  var timer=null, observer=null, coupure=null, comptoirBranche=false;
  function demarrer(){
    tout();
    clearInterval(timer);
    var attempts=0;
    timer=setInterval(function(){
      tout();attempts++;
      if(attempts>=20 || (document.getElementById('blocChambre') && document.getElementById('hotelDest') && document.getElementById('hotelDest').dataset.landingPresetApplied)) clearInterval(timer);
    },250);
    if(!observer){
      observer=new MutationObserver(function(){enhanceHotel();receptionPremium();});
      observer.observe(document.documentElement,{subtree:true,childList:true});
    }
    clearTimeout(coupure);
    coupure=setTimeout(function(){if(observer){observer.disconnect();observer=null;}},7000);
    brancherComptoir();
  }
  /* ═══ APRÈS SEPT SECONDES, LA LANGUE ET LA LISTE SUIVENT QUAND MÊME ═══
     (30/09/2026). L'observateur général se coupe à 7 s, et c'est voulu —
     mais un FR/EN touché ensuite, ou une liste redessinée par
     « Actualiser », revenaient alors aux textes d'origine. Deux
     observateurs ÉTROITS restent : l'attribut « lang » de la page, et les
     enfants DIRECTS de la liste. Ce que la finition réécrit est plus
     profond que ces enfants : elle ne se rappelle pas elle-même. */
  function brancherComptoir(){
    if(comptoirBranche || !comptoir) return;
    comptoirBranche=true;
    new MutationObserver(function(){tout();})
      .observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    var brancherListe=setInterval(function(){
      var l=document.getElementById('recListe');
      if(!l) return;
      clearInterval(brancherListe);
      new MutationObserver(function(){receptionPremium();}).observe(l,{childList:true});
    },250);
    setTimeout(function(){clearInterval(brancherListe);},10000);
  }
  window.addEventListener('ela:hotel',demarrer);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',demarrer,{once:true});
  else demarrer();
  window.addEventListener('load',tout,{once:true});
}());
