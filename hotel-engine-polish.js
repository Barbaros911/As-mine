(function(){
  'use strict';
  function getParams(){try{return new URLSearchParams(location.search);}catch(e){return null;}}
  var p=getParams();
  if(!p || p.get('h')!=='easyhotel-aeroville' || p.get('reception')) return;

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
      if(logoLink){logoLink.href='/easyhotel-client/';logoLink.setAttribute('aria-label','Retour à la page easyHotel Aéroville');}
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
      chambre.insertAdjacentElement('afterend',blocCoord);
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
