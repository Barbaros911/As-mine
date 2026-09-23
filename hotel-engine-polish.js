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
  var comptoir=p.get('reception')==='easyhotel-aeroville';
  if(p.get('h')!=='easyhotel-aeroville' && !comptoir) return;
  var accueil=comptoir?'/easyhotel-client/?reception=easyhotel-aeroville':'/easyhotel-client/';

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
      var titre=blocCoord.querySelector('.bloc-titre');
      if(titre){titre.textContent='Client / Guest';titre.removeAttribute('data-t');}
      var nom=blocCoord.querySelector('label[for="clientNom"] .champ-titre');
      if(nom){nom.textContent='Nom du client / Guest name';nom.removeAttribute('data-t');}
      var tel=blocCoord.querySelector('label[for="clientTel"] .champ-titre');
      if(tel){tel.textContent='Téléphone / Phone';tel.removeAttribute('data-t');}
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
        if(tCh){tCh.textContent='Chambre / Room';tCh.removeAttribute('data-t');}
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
  function tout(){enhanceHotel();brancherValidation();if(document.body.dataset.ehValidation)peindre();}
  enhanceHotel();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',tout,{once:true});
  window.addEventListener('load',tout,{once:true});
  var attempts=0;
  var timer=setInterval(function(){
    tout();attempts++;
    if(attempts>=20 || (document.getElementById('blocChambre') && document.getElementById('hotelDest') && document.getElementById('hotelDest').dataset.landingPresetApplied)) clearInterval(timer);
  },250);
  var observer=new MutationObserver(function(){enhanceHotel();});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(function(){observer.disconnect();},7000);
}());
