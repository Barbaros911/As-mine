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

    document.querySelectorAll('.hotel-nom').forEach(function(el){el.textContent='easyHotel Aéroville';});

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

    var blocDest=document.getElementById('blocDest');
    var sel=document.getElementById('hotelDest');
    /* Une carte de la landing doit ouvrir la bonne destination, pas le CDG
       par défaut. Le moteur peut construire les options après ce script :
       enhanceHotel repasse jusqu'à ce que la valeur demandée existe. */
    var preset=p.get('dest');
    if(sel && preset && !sel.dataset.landingPresetApplied){
      var presetExists=Array.prototype.some.call(sel.options,function(o){return o.value===preset;});
      if(presetExists){
        sel.value=preset;
        sel.dataset.landingPresetApplied='1';
        sel.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }
    if(blocDest && sel && !document.getElementById('hotelQuickDest')){
      var quick=document.createElement('section');
      quick.id='hotelQuickDest';
      quick.innerHTML='\
        <div class="quick-title"><b>Destinations populaires</b><span>Choix rapide</span></div>\
        <div class="quick-scroll">\
          <button class="hotel-quick" type="button" data-dest="cdg"><img src="/photos/service-aeroport.webp" alt="Aéroport Charles-de-Gaulle"><span>Aéroport CDG</span></button>\
          <button class="hotel-quick" type="button" data-dest="paris"><img src="/photos/eiffel-trocadero.jpg" alt="Paris centre"><span>Paris centre</span></button>\
          <button class="hotel-quick" type="button" data-dest="villepinte"><img src="/photos/service-deplacement-pro.jpg" alt="Parc des Expositions Villepinte"><span>Villepinte / Le Bourget</span></button>\
        </div>';
      blocDest.insertAdjacentElement('beforebegin',quick);

      function syncQuick(){quick.querySelectorAll('.hotel-quick').forEach(function(b){b.classList.toggle('active',b.dataset.dest===sel.value);});}
      quick.addEventListener('click',function(e){
        var b=e.target.closest('.hotel-quick');if(!b)return;
        var wanted=b.dataset.dest;
        var exists=Array.prototype.some.call(sel.options,function(o){return o.value===wanted;});
        if(!exists)return;
        sel.value=wanted;sel.dispatchEvent(new Event('change',{bubbles:true}));syncQuick();
      });
      sel.addEventListener('change',syncQuick);syncQuick();
    }
  }

  /* Le moteur historique construit le mode hôtel après le premier chargement.
     On applique donc la finition tout de suite ET après ses mutations. */
  enhanceHotel();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enhanceHotel,{once:true});
  window.addEventListener('load',enhanceHotel,{once:true});
  var attempts=0;
  var timer=setInterval(function(){
    enhanceHotel();attempts++;
    if(attempts>=20 || (document.getElementById('blocChambre') && document.getElementById('hotelDest') && document.getElementById('hotelQuickDest'))) clearInterval(timer);
  },250);
  var observer=new MutationObserver(function(){enhanceHotel();});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(function(){observer.disconnect();},7000);
}());
