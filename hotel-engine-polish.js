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

  /* Le moteur historique construit le mode hôtel après le premier chargement.
     On applique donc la finition tout de suite ET après ses mutations. */
  enhanceHotel();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enhanceHotel,{once:true});
  window.addEventListener('load',enhanceHotel,{once:true});
  var attempts=0;
  var timer=setInterval(function(){
    enhanceHotel();attempts++;
    if(attempts>=20 || (document.getElementById('blocChambre') && document.getElementById('hotelDest') && document.getElementById('hotelDest').dataset.landingPresetApplied)) clearInterval(timer);
  },250);
  var observer=new MutationObserver(function(){enhanceHotel();});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(function(){observer.disconnect();},7000);
}());
