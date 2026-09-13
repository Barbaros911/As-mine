(() => {
  const panel = document.querySelector('.panel');
  const durations = document.querySelector('#durations');
  const request = document.querySelector('#request');
  const startInput = document.querySelector('#start');
  if (!panel || !durations || !request || !startInput) return;

  const durationValues = [3,4,5,6,7,8,9,10];
  const coords = {
    'Tour Eiffel':[48.85837,2.29448],
    'Arc de Triomphe':[48.87379,2.29503],
    'Champs-Élysées':[48.86979,2.30773],
    'Place de la Concorde':[48.86563,2.32124],
    'Louvre':[48.86061,2.33764],
    'Notre-Dame':[48.85297,2.34990],
    'Opéra Garnier':[48.87197,2.33160],
    'Sacré-Cœur · Montmartre':[48.88670,2.34310],
    'Invalides':[48.85661,2.31260]
  };
  const stopMinutes = {
    'Tour Eiffel':20,
    'Arc de Triomphe':15,
    'Champs-Élysées':15,
    'Place de la Concorde':10,
    'Louvre':20,
    'Notre-Dame':20,
    'Opéra Garnier':15,
    'Sacré-Cœur · Montmartre':25,
    'Invalides':15
  };

  let chosenDuration = 3;
  let chosenVehicle = 'Berline';

  durations.innerHTML = durationValues.map(h =>
    `<button type="button" class="dur${h === chosenDuration ? ' on' : ''}" data-duration-hours="${h}" aria-pressed="${h === chosenDuration}">${h} h</button>`
  ).join('');

  const note = document.createElement('div');
  note.className = 'duration-rule';
  note.innerHTML = '<strong>Durée totale de la prestation</strong><span>De la prise en charge jusqu’à l’arrivée finale, circulation et arrêts compris.</span><small>Minimum 3 h · maximum 10 h</small>';
  durations.insertAdjacentElement('afterend', note);

  const params = new URLSearchParams(location.search);
  const hotelMode = params.get('h') === 'easyhotel-aeroville';
  startInput.value = hotelMode ? '10 rue de la Belle Borne, 93410 Tremblay-en-France' : '';
  startInput.placeholder = 'Hôtel, adresse, aéroport ou gare';

  const planning = document.createElement('div');
  planning.className = 'planning-fields';
  planning.innerHTML = `
    <div><label class="label" for="paris-date">Date</label><input class="field" id="paris-date" type="date"></div>
    <div><label class="label" for="paris-time">Heure de prise en charge</label><input class="field" id="paris-time" type="time" value="10:00"></div>
  `;
  startInput.insertAdjacentElement('afterend', planning);

  const vehicle = document.createElement('div');
  vehicle.innerHTML = `
    <span class="label">Véhicule</span>
    <div class="vehicle-choice" role="group" aria-label="Type de véhicule">
      <button type="button" class="vehicle-btn on" data-vehicle="Berline" aria-pressed="true">Berline</button>
      <button type="button" class="vehicle-btn" data-vehicle="Van" aria-pressed="false">Van</button>
    </div>
  `;
  planning.insertAdjacentElement('afterend', vehicle);

  const estimator = document.createElement('section');
  estimator.className = 'estimator';
  estimator.setAttribute('aria-live','polite');
  estimator.innerHTML = `
    <div class="estimator-head"><strong>Estimation intelligente du parcours</strong><span id="est-status">Ajoutez vos étapes</span></div>
    <div class="est-grid">
      <div><small>Conduite estimée</small><b id="est-drive">—</b></div>
      <div><small>Arrêts estimés</small><b id="est-stops">—</b></div>
      <div><small>Marge circulation</small><b id="est-traffic">—</b></div>
      <div><small>Durée recommandée</small><b id="est-reco">—</b></div>
    </div>
    <div class="est-route" id="est-route"></div>
    <div class="est-price" id="est-price"></div>
    <p class="est-disclaimer">Estimation indicative selon les étapes, le jour et l’heure choisis. La circulation réelle, les fermetures de voies et les événements peuvent modifier le temps de parcours.</p>
  `;
  vehicle.insertAdjacentElement('afterend', estimator);

  const style = document.createElement('style');
  style.textContent = `
    #durations{grid-template-columns:repeat(4,minmax(0,1fr))}
    .duration-rule{margin-top:10px;padding:11px 12px;border:1px solid #dce7ef;border-radius:10px;background:#f7fbfe;display:grid;gap:3px;color:#102f4b}
    .duration-rule strong{font-size:12px}.duration-rule span{font-size:12px;line-height:1.35}.duration-rule small{font-size:11px;color:#637a8d}
    .planning-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.planning-fields .label{margin-top:14px}
    .vehicle-choice{display:grid;grid-template-columns:1fr 1fr;gap:8px}.vehicle-btn{border:1px solid #dce7ef;background:#fff;border-radius:9px;padding:11px;font-weight:900;color:#102f4b;cursor:pointer}.vehicle-btn.on{background:#0d91d2;color:#fff;border-color:#0d91d2}
    .estimator{margin-top:15px;border:1px solid #cfe3ef;border-radius:12px;background:linear-gradient(180deg,#f8fcff,#fff);padding:13px}.estimator-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.estimator-head strong{font-size:13px}.estimator-head span{font-size:11px;font-weight:900;color:#087dbd}.est-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.est-grid div{background:#fff;border:1px solid #e3edf3;border-radius:9px;padding:9px}.est-grid small{display:block;color:#71879a;font-size:10px}.est-grid b{display:block;margin-top:3px;font-size:14px}.est-route{font-size:11px;line-height:1.45;color:#4f687b;margin-top:10px}.est-price{margin-top:10px;padding-top:10px;border-top:1px solid #e4edf3;font-size:12px;font-weight:800}.est-disclaimer{font-size:10px;line-height:1.4;color:#71879a;margin:9px 0 0}.estimator.warn{border-color:#ffb36e;background:#fffaf5}.estimator.ok{border-color:#9ed9b5;background:#f7fff9}
    @media(max-width:520px){#durations{grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.dur{padding:10px 3px;font-size:13px}.planning-fields{grid-template-columns:1fr}.est-grid{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);

  function setDuration(hours) {
    chosenDuration = Math.min(10, Math.max(3, Number(hours) || 3));
    durations.querySelectorAll('.dur').forEach(btn => {
      const active = Number(btn.dataset.durationHours) === chosenDuration;
      btn.classList.toggle('on', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    refreshEstimate();
  }

  function routeNames(){
    return [...document.querySelectorAll('#route .stop span')].map(el => el.textContent.trim()).filter(Boolean);
  }

  function haversine(a,b){
    const R=6371, rad=x=>x*Math.PI/180;
    const dLat=rad(b[0]-a[0]), dLon=rad(b[1]-a[1]);
    const s=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(s));
  }

  function optimizeNames(names){
    if(names.length<3) return names.slice();
    const left=names.slice(1), out=[names[0]];
    while(left.length){
      const cur=coords[out[out.length-1]];
      let best=0, bestD=Infinity;
      left.forEach((n,i)=>{const d=cur&&coords[n]?haversine(cur,coords[n]):999;if(d<bestD){bestD=d;best=i;}});
      out.push(left.splice(best,1)[0]);
    }
    return out;
  }

  function trafficFactor(){
    const dateValue=document.querySelector('#paris-date')?.value;
    const timeValue=document.querySelector('#paris-time')?.value || '10:00';
    const d=dateValue ? new Date(`${dateValue}T${timeValue}:00`) : new Date();
    const day=d.getDay(), hour=d.getHours()+d.getMinutes()/60;
    let factor=1.15, label='trafic habituel';
    if(day>=1&&day<=5&&((hour>=7&&hour<10)||(hour>=16&&hour<20))){factor=1.55;label='heure de pointe';}
    else if(day===0&&hour>=10&&hour<19){factor=1.30;label='dimanche touristique';}
    else if(day===6&&hour>=10&&hour<20){factor=1.35;label='samedi chargé';}
    else if(hour<7||hour>=21){factor=1.05;label='circulation plus fluide';}
    return {factor,label};
  }

  function minutesToText(min){
    if(!Number.isFinite(min)) return '—';
    const h=Math.floor(min/60), m=Math.round(min%60/5)*5;
    if(!h) return `${Math.max(5,m)} min`;
    return `${h} h${m?` ${m} min`:''}`;
  }

  function refreshEstimate(){
    const names=routeNames();
    const status=document.querySelector('#est-status');
    const driveEl=document.querySelector('#est-drive');
    const stopsEl=document.querySelector('#est-stops');
    const trafficEl=document.querySelector('#est-traffic');
    const recoEl=document.querySelector('#est-reco');
    const routeEl=document.querySelector('#est-route');
    const priceEl=document.querySelector('#est-price');
    if(!names.length){status.textContent='Ajoutez vos étapes';driveEl.textContent=stopsEl.textContent=trafficEl.textContent=recoEl.textContent='—';routeEl.textContent='';priceEl.textContent='';estimator.classList.remove('ok','warn');return;}

    const optimized=optimizeNames(names);
    let km=0;
    for(let i=1;i<optimized.length;i++) if(coords[optimized[i-1]]&&coords[optimized[i]]) km+=haversine(coords[optimized[i-1]],coords[optimized[i]])*1.35;
    const baseDrive=Math.max(25, km/18*60 + Math.max(0,optimized.length-1)*5);
    const traffic=trafficFactor();
    const drive=baseDrive*traffic.factor;
    const stops=optimized.reduce((sum,n)=>sum+(stopMinutes[n]||15),0);
    const safety=Math.max(20,Math.round((drive+stops)*0.12));
    const total=drive+stops+safety;
    const recommended=Math.min(10,Math.max(3,Math.ceil(total/60)));
    const margin=Math.max(0,Math.round(drive-baseDrive));

    driveEl.textContent=minutesToText(drive);
    stopsEl.textContent=minutesToText(stops);
    trafficEl.textContent=`+${minutesToText(margin)} · ${traffic.label}`;
    recoEl.textContent=`${recommended} h`;
    routeEl.textContent=`Ordre conseillé : ${optimized.join(' → ')}. Marge de sécurité incluse : ${minutesToText(safety)}.`;
    status.textContent=chosenDuration>=recommended?'Parcours cohérent':'Durée trop courte';
    estimator.classList.toggle('ok',chosenDuration>=recommended);
    estimator.classList.toggle('warn',chosenDuration<recommended);
    priceEl.textContent = chosenDuration===3
      ? `${chosenVehicle} · tarif 3 h : ${chosenVehicle==='Berline'?'180 €':'240 €'} · prix par véhicule`
      : `${chosenVehicle} · ${chosenDuration} h : tarif à confirmer avant réservation`;
  }

  durations.addEventListener('click', event => {
    const btn = event.target.closest('[data-duration-hours]');
    if (btn) setDuration(btn.dataset.durationHours);
  });

  document.querySelectorAll('.vehicle-btn').forEach(btn=>btn.addEventListener('click',()=>{
    chosenVehicle=btn.dataset.vehicle;
    document.querySelectorAll('.vehicle-btn').forEach(b=>{const on=b===btn;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
    refreshEstimate();
  }));

  document.querySelector('#paris-date')?.addEventListener('change',refreshEstimate);
  document.querySelector('#paris-time')?.addEventListener('change',refreshEstimate);
  document.querySelector('#route')?.addEventListener('click',()=>setTimeout(refreshEstimate,0));
  document.querySelector('#pins')?.addEventListener('click',()=>setTimeout(refreshEstimate,0));
  document.querySelector('#landmarks')?.addEventListener('click',()=>setTimeout(refreshEstimate,0));
  document.querySelector('#optimize')?.addEventListener('click',()=>setTimeout(refreshEstimate,0));

  document.querySelectorAll('[data-pack]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.pack === 'essential') setDuration(3);
      else if (btn.dataset.pack === 'discovery') setDuration(5);
      else setDuration(3);
      setTimeout(refreshEstimate,0);
    });
  });

  const essentialCard=document.querySelector('[data-pack="essential"]')?.closest('.card');
  if(essentialCard){
    const chips=essentialCard.querySelector('.chips');
    if(chips&&!chips.querySelector('[data-price-chip]')) chips.insertAdjacentHTML('beforeend','<span class="chip" data-price-chip>Berline 180 € · Van 240 €</span>');
  }
  const customCard = document.querySelector('[data-pack="custom"]')?.closest('.card');
  const customDurationChip = customCard?.querySelector('.chip');
  if (customDurationChip) customDurationChip.textContent = '3 à 10 heures';

  request.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const route=routeNames();
    if (!route.length) {
      const toast = document.querySelector('#toast');
      if (toast) {toast.textContent='Choisissez au moins un monument';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800);}
      return;
    }
    const date=document.querySelector('#paris-date')?.value || 'À préciser';
    const time=document.querySelector('#paris-time')?.value || 'À préciser';
    const start=startInput.value.trim() || 'À préciser';
    const pax=document.querySelector('#pax')?.textContent.trim() || '2';
    const reco=document.querySelector('#est-reco')?.textContent.trim() || 'À calculer';
    const msg=[
      'Bonjour ELA Transfer, je souhaite demander un parcours Paris.', '',
      `Prise en charge : ${start}`,`Date : ${date}`,`Heure : ${time}`,
      `Véhicule : ${chosenVehicle}`,`Durée choisie : ${chosenDuration} h`,`Durée recommandée estimée : ${reco}`,
      'Durée comptée de la prise en charge jusqu’à l’arrivée finale, circulation et arrêts compris.',
      `Passagers : ${pax}`,`Parcours : ${route.join(' → ')}`,'',
      chosenDuration===3 ? `Tarif affiché 3 h : ${chosenVehicle==='Berline'?'180 €':'240 €'} par véhicule.` : 'Merci de me confirmer le tarif correspondant à cette durée.',
      'Merci de me confirmer la disponibilité.'
    ].join('\n');
    location.href='https://wa.me/33759312433?text='+encodeURIComponent(msg);
  }, true);

  refreshEstimate();
})();