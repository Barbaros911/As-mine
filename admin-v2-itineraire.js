/* ELA Admin v2 — itinéraire/prix depuis les adresses.
   La grille de prix vient exclusivement des paramètres serveur déjà chargés. */
(()=>{'use strict';
const $id=id=>document.getElementById(id);
function dire(t,ko=false){const e=$id('tfItineraireEtat');if(!e)return;e.textContent=t||'';e.className='muted small '+(ko?'ko':'');}
async function geocoder(adresse){
  const q=encodeURIComponent(String(adresse||'').trim());
  if(!q)throw new Error('adresse vide');
  let r=await fetch('https://api-adresse.data.gouv.fr/search/?limit=1&q='+q);
  if(r.ok){const d=await r.json(),f=d?.features?.[0];if(f)return {lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1]};}
  r=await fetch('https://photon.komoot.io/api/?limit=1&q='+q);
  if(!r.ok)throw new Error('adresse introuvable');
  const d=await r.json(),f=d?.features?.[0];if(!f)throw new Error('adresse introuvable');
  return {lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1]};
}
async function distanceKm(a,b){
  const u=`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
  const r=await fetch(u);if(!r.ok)throw new Error('itinéraire indisponible');
  const d=await r.json(),m=d?.routes?.[0]?.distance;if(!Number.isFinite(m))throw new Error('itinéraire indisponible');
  return m/1000;
}
function param(cle){const p=(window.state?.params||[]).find(x=>x.cle===cle),v=p?.valeur;if(!v)return null;return {km:Number(v.par_km_centimes)/100,mini:Number(v.minimum_centimes)/100};}
function prix(km,cle){const g=param('tarif_general_'+cle);if(!g||!(g.km>0)||!(g.mini>0))throw new Error('grille serveur indisponible');return Math.max(g.mini,Math.round((km*g.km)/10)*10);}
async function calculer(){
  const dep=$id('tfDepart')?.value.trim(),arr=$id('tfArrivee')?.value.trim(),cle=$id('tfVehicule')?.value||'berline';
  if(!dep||!arr){dire('Renseigne le départ et l’arrivée.',true);return;}
  const b=$id('tfCalculerPrix');if(b)b.disabled=true;dire('Calcul de l’itinéraire…');
  try{const [a,z]=await Promise.all([geocoder(dep),geocoder(arr)]),km=await distanceKm(a,z),p=prix(km,cle);$id('tfPrix').value=String(p);dire(`${km.toFixed(1).replace('.',',')} km · prix grille serveur : ${p.toFixed(2).replace('.',',')} €`);}
  catch(e){dire('Calcul impossible : '+e.message+'. Le prix reste saisissable manuellement.',true);}
  finally{if(b)b.disabled=false;}
}
function installer(){const f=$id('formTelephone');if(!f||$id('tfCalculerPrix'))return;const prix=$id('tfPrix');if(!prix)return;const label=prix.closest('label');const wrap=document.createElement('div');wrap.className='wide';wrap.innerHTML='<button id="tfCalculerPrix" class="btn alt" type="button">Calculer le prix depuis les adresses</button><p id="tfItineraireEtat" class="muted small"></p>';label.insertAdjacentElement('afterend',wrap);$id('tfCalculerPrix').addEventListener('click',calculer);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installer);else installer();
window.ELA_ADMIN_ITINERAIRE={calculer};
})();
