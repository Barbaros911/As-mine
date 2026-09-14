(function(){
  'use strict';
  function ready(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true});
    else fn();
  }

  ready(function(){
    var p;
    try{ p=new URLSearchParams(location.search); }catch(e){ return; }
    if(p.get('h')!=='easyhotel-aeroville' || p.get('reception')) return;

    document.body.classList.add('hotel-enhanced');

    /* Photo officielle de l'etablissement, chargee depuis le CDN easyHotel.
       On ne copie pas le fichier dans le depot : la source reste easyHotel. */
    var photo=document.getElementById('hotelPhoto');
    if(photo){
      photo.hidden=false;
      photo.style.backgroundImage="url('https://www.easyhotel.com/cdn-cgi/image/width=1200,height=800,format=auto/https://cdn.easyhotel.com/1_easy_Hotel_CDG_1067422f0b.png')";
    }

    /* Co-branding compact dans l'en-tete. */
    var head=document.querySelector('.entete');
    var actions=document.querySelector('.entete-actions');
    if(head && actions && !document.querySelector('.hotel-partner-chip')){
      var chip=document.createElement('div');
      chip.className='hotel-partner-chip';
      chip.innerHTML='<b>easyHotel Aéroville</b><span>Transferts opérés par ELA Transfer</span>';
      head.insertBefore(chip,actions);
    }

    /* Le nom du client doit etre visible des le premier ecran, a cote de la
       chambre. Les vrais champs restent la source de verite et les proxys les
       alimentent, donc aucune logique de reservation n'est dupliquee. */
    var chambre=document.getElementById('blocChambre');
    var nom=document.getElementById('clientNom');
    var tel=document.getElementById('clientTel');
    var blocCoord=document.getElementById('blocCoordonnees');
    if(chambre && nom && tel && !document.getElementById('hotelGuestEarly')){
      var wrap=document.createElement('section');
      wrap.id='hotelGuestEarly';
      wrap.setAttribute('aria-label','Client');
      wrap.innerHTML='\
        <div class="hotel-guest-title">Client / Guest</div>\
        <div class="hotel-guest-grid">\
          <label><span>Nom du client / Guest name</span><input id="hotelGuestName" type="text" autocomplete="name" placeholder="Ex. John Smith"></label>\
          <label><span>Téléphone / Phone</span><input id="hotelGuestPhone" type="tel" autocomplete="tel" placeholder="+33 6 12 34 56 78"></label>\
        </div>\
        <p class="hotel-guest-help">Le chauffeur utilise ces informations uniquement pour la prise en charge.</p>';
      chambre.insertAdjacentElement('afterend',wrap);

      var n=wrap.querySelector('#hotelGuestName');
      var t=wrap.querySelector('#hotelGuestPhone');
      n.value=nom.value||''; t.value=tel.value||'';
      n.addEventListener('input',function(){nom.value=n.value;nom.dispatchEvent(new Event('input',{bubbles:true}));});
      t.addEventListener('input',function(){tel.value=t.value;tel.dispatchEvent(new Event('input',{bubbles:true}));});
      nom.addEventListener('input',function(){if(n.value!==nom.value)n.value=nom.value;});
      tel.addEventListener('input',function(){if(t.value!==tel.value)t.value=tel.value;});
      if(blocCoord) blocCoord.classList.add('hotel-guest-synced');
    }

    /* Destinations photo : raccourcis vers les options deja gerees par le
       moteur. Aucun prix n'est recalcule ici. */
    var blocDest=document.getElementById('blocDest');
    var sel=document.getElementById('hotelDest');
    if(blocDest && sel && !document.getElementById('hotelQuickDest')){
      var quick=document.createElement('section');
      quick.id='hotelQuickDest';
      quick.innerHTML='\
        <div class="quick-title"><b>Destinations populaires</b><span>Choix rapide</span></div>\
        <div class="quick-scroll">\
          <button class="hotel-quick" type="button" data-dest="cdg"><img src="/photos/service-aeroport.webp" alt="Aéroport Charles-de-Gaulle"><span>Aéroport CDG</span></button>\
          <button class="hotel-quick" type="button" data-dest="paris"><img src="/photos/eiffel-trocadero.jpg" alt="Paris"><span>Paris centre</span></button>\
          <button class="hotel-quick" type="button" data-dest="villepinte"><img src="/photos/service-deplacement-pro.jpg" alt="Parc des Expositions Villepinte"><span>Villepinte</span></button>\
        </div>';
      blocDest.insertAdjacentElement('beforebegin',quick);

      function syncQuick(){
        quick.querySelectorAll('.hotel-quick').forEach(function(b){b.classList.toggle('active',b.dataset.dest===sel.value);});
      }
      quick.addEventListener('click',function(e){
        var b=e.target.closest('.hotel-quick'); if(!b) return;
        var wanted=b.dataset.dest;
        var exists=Array.prototype.some.call(sel.options,function(o){return o.value===wanted;});
        if(!exists) return;
        sel.value=wanted;
        sel.dispatchEvent(new Event('change',{bubbles:true}));
        syncQuick();
      });
      sel.addEventListener('change',syncQuick);
      syncQuick();
    }

    /* Copie coherente du nom de l'hotel partout ou l'ancienne denomination
       pourrait encore survivre dans ce parcours. */
    document.querySelectorAll('[data-hotel-name], .hotel-nom').forEach(function(el){
      if(el.classList.contains('hotel-nom')) el.textContent='easyHotel Aéroville';
    });
  });
}());
