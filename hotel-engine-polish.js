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

    /* Le vrai bloc client est avance au premier ecran, juste apres la chambre.
       On conserve donc exactement les champs et validations existants : rien
       n'est duplique, rien n'est resynchronise, seule leur position change. */
    var chambre=document.getElementById('blocChambre');
    var blocCoord=document.getElementById('blocCoordonnees');
    if(chambre && blocCoord && !blocCoord.classList.contains('hotel-guest-early')){
      var titre=blocCoord.querySelector('.bloc-titre');
      if(titre){ titre.textContent='Client / Guest'; titre.removeAttribute('data-t'); }
      var nom=blocCoord.querySelector('label[for="clientNom"] .champ-titre');
      if(nom){ nom.textContent='Nom du client / Guest name'; nom.removeAttribute('data-t'); }
      var tel=blocCoord.querySelector('label[for="clientTel"] .champ-titre');
      if(tel){ tel.textContent='Téléphone / Phone'; tel.removeAttribute('data-t'); }
      blocCoord.classList.add('hotel-guest-early');
      chambre.insertAdjacentElement('afterend',blocCoord);
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
    document.querySelectorAll('.hotel-nom').forEach(function(el){
      el.textContent='easyHotel Aéroville';
    });
  });
}());
