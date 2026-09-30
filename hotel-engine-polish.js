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
  var espace=document.documentElement.getAttribute('data-ela-space')||'';
  var comptoir=espace==='hotel-reception'||p.get('reception')==='easyhotel-aeroville';
  var clientHotel=espace==='hotel-client'||p.get('h')==='easyhotel-aeroville';
  if(!clientHotel && !comptoir) return;
  var accueil=comptoir?'/easyhotel-reception/':'/easyhotel-client/';

  function enhanceHotel(){
    document.body.classList.add('hotel-enhanced');

    var head=document.querySelector('.entete');
    var actions=document.querySelector('.entete-actions');
    if(head && actions && !document.querySelector('.hotel-partner-chip')){
      var chip=document.createElement('div');
      chip.className='hotel-partner-chip';
      chip.innerHTML='<b>easyHotel</b><span>Aéroville</span>';
      head.insertBefore(chip,actions);
      var logoLink=head.querySelector('.logo');
      if(logoLink){logoLink.href=accueil;logoLink.setAttribute('aria-label','Retour à la page easyHotel Aéroville');}
    }

    /* ON N'ÉCRIT QUE SI LE TEXTE DIFFÈRE. Réécrire un texte identique est
       quand même une mutation : l'observateur plus bas rappelait cette
       fonction, qui réécrivait, qui rappelait… une boucle de micro-tâches
       qui ne rend jamais la main — la page de réservation easyHotel se
       figeait (mesuré sous Chromium, 22/09/2026). */
    document.querySelectorAll('.hotel-nom').forEach(function(el){if(el.textContent!=='easyHotel Aéroville')el.textContent='easyHotel Aéroville';});

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
      if(comptoir){
        /* AU COMPTOIR LA CHAMBRE VIENT EN PREMIER, ET ELLE N'EST PAS
           « FACULTATIVE » : c'est elle qui suffit (la règle de l'aide juste
           au-dessus — chambre, OU nom et téléphone). La réception la
           connaît d'emblée ; le nom et le numéro ne servent que sans elle. */
        if(nomLabel) nomLabel.insertAdjacentElement('beforebegin',chambre);
      } else {
        if(nomLabel) nomLabel.insertAdjacentElement('afterend',chambre);
        if(tCh){tCh.textContent='Chambre / Room (facultatif)';tCh.removeAttribute('data-t');}
      }
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
  function receptionPremium(){
    if(!comptoir) return;
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
      texte(horaires,anglais
        ? 'Human assistance 5 am–10 pm · Immediate requests subject to availability'
        : 'Assistance humaine 5 h–22 h · Demandes immédiates selon disponibilité');

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
        anglais?'HOTEL BOOKINGS':'RÉSERVATIONS DE L’HÔTEL',
        anglais?'View and track bookings':'Voir et suivre les réservations');
    }

    var formulaire=document.querySelector('#ecran-accueil .reserver');
    if(formulaire){
      var etape1=libelleEtape('receptionEtape1','1',
        anglais?'TRIP & GUEST':'TRAJET & CLIENT',
        anglais?'Trip details and guest identification':'Informations du trajet et identification du client');
      if(!etape1.parentNode) formulaire.insertBefore(etape1,formulaire.firstElementChild);

      /* La chambre / identité appartient au trajet, avant le véhicule. Les
         éléments sont déplacés, jamais dupliqués : les écouteurs et les
         contrôles du moteur restent ceux d'origine. */
      var coord=document.getElementById('blocCoordonnees');
      var note=document.getElementById('blocNote');
      if(document.body.classList.contains('compte-unique') && coord && note && !coord.dataset.receptionOrdre){
        formulaire.insertBefore(coord,note);coord.dataset.receptionOrdre='1';
      }

      var vehicules=document.getElementById('listeVehicules');
      if(vehicules){
        var etape2=libelleEtape('receptionEtape2','2',
          anglais?'VEHICLE & PAYMENT':'VÉHICULE & PAIEMENT',
          anglais?'Choose the category, fixed price and payment method':'Choisissez la catégorie, le prix ferme et le règlement');
        if(!etape2.parentNode) vehicules.parentNode.insertBefore(etape2,vehicules);
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
      var etape3=libelleEtape('receptionEtape3','3',
        anglais?'CONFIRMATION':'CONFIRMATION',
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
      texte(adresseRec,'10 rue de la Belle Borne, 93410 Tremblay-en-France');

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
        ? 'For a delay, time change or cancellation, call us and we will handle it.'
        : 'Un retard, un changement d’heure ou une annulation : appelez-nous, on s’en occupe.');
      var compteurs=document.querySelectorAll('.rec-chiffre span');
      [anglais?'today':'aujourd’hui',anglais?'pending':'en attente',anglais?'upcoming':'à venir'].forEach(function(v,i){texte(compteurs[i],v);});
      texte(document.getElementById('btnRecActualiser'),anglais?'Refresh':'Actualiser');
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
      document.querySelectorAll('.rec-jour').forEach(function(j){
        var jours={"Aujourd'hui":'Today','Demain':'Tomorrow','En retard':'Overdue','Date inconnue':'Unknown date'};
        trad(j,jours[(j.dataset.fr||j.textContent).trim()]);
      });
      var boutons={"Demander l'annulation":'Request cancellation','Appeler Elatransfer':'Call Elatransfer','Envoyer le bon au client':'Send voucher to guest','Renvoyer le bon au client':'Resend voucher to guest'};
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
          'Aucune course passée pour le moment.':'No past ride yet.'}[frVide]||null;
        trad(vide,enVide);
      }
      var titreRech=document.querySelector('label[for="recRecherche"] .champ-titre');
      texte(titreRech,anglais?'Find a ride':'Retrouver une course');
      var champRech=document.getElementById('recRecherche');
      if(champRech) champRech.placeholder=anglais?'Room, name, phone or reference':'Chambre, nom, téléphone ou référence';
      var nomsVues={avenir:['À venir','Upcoming'],passees:['Passées','Past'],toutes:['Toutes','All']};
      document.querySelectorAll('.rec-vues button').forEach(function(bv){
        var n=nomsVues[bv.dataset.vue];if(n) texte(bv.querySelector('span'),anglais?n[1]:n[0]);
      });
      document.querySelectorAll('#recListe .rec-reference').forEach(function(x){
        var fr=x.dataset.fr||x.textContent;
        trad(x,fr.replace(/^Réf\. /,'Ref. '));
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

     LES RÈGLES SONT CELLES DU MOTEUR, pas d'autres : au comptoir la chambre
     suffit, sinon il faut le nom et le téléphone ; côté client le nom et le
     téléphone sont exigés, la chambre ne l'est pas. Un numéro commencé mais
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
       pas un oubli — c'est l'adresse en dessous qui doit être remplie. */
    pose('hotelDest','ok');
    ['depart','hotelTerminal','passagers','bagages'].forEach(function(id){pose(id,val(id)?'ok':'manque');});
    if(vis($('arrivee'))) pose('arrivee',val('arrivee')?'ok':'manque');
    var heureKo=vis($('heurePassee'))||vis($('tropTot'));
    pose('date', !val('date')?'manque':(touches.date||tentative)?'ok':'neutre');
    pose('heure', !val('heure')||heureKo?'manque':(touches.heure||tentative)?'ok':'neutre');
    ['vol','noteCourse'].forEach(function(id){pose(id,val(id)?'ok':'neutre');});
    var parChambre=comptoir && !!ch;
    pose('chambre', ch?'ok':(comptoir && !(nom&&tel))?'manque':'neutre');
    pose('clientNom', nom?'ok':parChambre?'neutre':'manque');
    pose('clientTel', tel?(telOk(tel)?'ok':'manque'):parChambre?'neutre':'manque');
    if(comptoir){
      var liste=$('listeVehicules');
      if(vis(liste)) l.push([liste, document.querySelector('.veh-carte.choisi')?'ok':'manque']);
      var pay=$('blocPaiement');
      if(vis(pay)) l.push([pay.querySelector('.choix')?pay.querySelector('.choix').parentNode:pay,
        document.querySelector('.choix[data-paiement][aria-pressed="true"]')?'ok':'manque']);
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
      el.classList.toggle('eh-sinon', comptoir && e==='manque' && !!identite && !val(identite));
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
        if(id==='date'||id==='heure') touches[id]=true;
        setTimeout(peindre,0);
      },true);
    });
    document.addEventListener('click',function(){setTimeout(peindre,0);},false);
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
     On applique donc la finition tout de suite ET après ses mutations. */
  function tout(){enhanceHotel();receptionPremium();brancherValidation();if(document.body.dataset.ehValidation)peindre();}
  enhanceHotel();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',tout,{once:true});
  window.addEventListener('load',tout,{once:true});
  var attempts=0;
  var timer=setInterval(function(){
    tout();attempts++;
    if(attempts>=20 || (document.getElementById('blocChambre') && document.getElementById('hotelDest') && document.getElementById('hotelDest').dataset.landingPresetApplied)) clearInterval(timer);
  },250);
  var observer=new MutationObserver(function(){enhanceHotel();receptionPremium();});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(function(){observer.disconnect();},7000);
  /* ═══ APRÈS SEPT SECONDES, LA LANGUE ET LA LISTE SUIVENT QUAND MÊME ═══
     (30/09/2026). L'observateur général se coupe à 7 s, et c'est voulu —
     mais un FR/EN touché ensuite, ou une liste redessinée par
     « Actualiser », revenaient alors aux textes d'origine. Deux
     observateurs ÉTROITS restent : l'attribut « lang » de la page, et les
     enfants DIRECTS de la liste. Ce que la finition réécrit est plus
     profond que ces enfants : elle ne se rappelle pas elle-même. */
  if(comptoir){
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
}());
