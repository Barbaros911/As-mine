(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const dashboard=$('#s-dashboard');
  if(!dashboard)return;

  dashboard.classList.add('dashboard-maquette');
  const title=$('.title',dashboard), metrics=$('#metrics'), intake=$('#zoneIntake'), actions=$('#actions'), next=$('#nextBookings'), push=$('#zonePush');
  if(title){
    const h1=$('h1',title); if(h1)h1.textContent='Tableau de bord';
    const sub=$('.muted',title); if(sub)sub.textContent="Vue d’ensemble de l’activité ELA Transfer";
    const refresh=$('[data-refresh]',title); if(refresh)refresh.textContent='Actualiser';
  }

  const actionTitle=actions?.previousElementSibling;
  const nextTitle=next?.previousElementSibling;
  if(actionTitle?.tagName==='H2')actionTitle.remove();
  if(nextTitle?.tagName==='H2')nextTitle.remove();

  const quick=document.createElement('section');
  quick.className='dash-quick';
  quick.innerHTML='<div><h2>Gestion rapide</h2><p class="muted small">Créer ou importer une nouvelle réservation.</p></div>';
  if(intake)quick.append(intake);

  const cols=document.createElement('div'); cols.className='dash-cols';
  const recent=document.createElement('section'); recent.className='dash-panel dash-recent';
  recent.innerHTML='<div class="dash-panel-head"><div><h2>Réservations récentes</h2><p class="muted small">Prochaines courses et demandes enregistrées</p></div><button type="button" class="dash-link" data-go="bookings">Voir toutes</button></div>';
  if(next)recent.append(next);
  const required=document.createElement('section'); required.className='dash-panel dash-required';
  required.innerHTML='<div class="dash-panel-head"><div><h2>Actions requises</h2><p class="muted small">Priorités opérationnelles à traiter</p></div></div>';
  if(actions)required.append(actions);
  cols.append(recent,required);

  if(metrics)metrics.classList.add('dash-metrics');
  if(title){
    title.after(metrics||document.createTextNode(''));
    if(metrics)metrics.after(quick);
    else title.after(quick);
    quick.after(cols);
    if(push)cols.after(push);
  }

  dashboard.addEventListener('click',e=>{
    const key=e.target.closest('[data-go]')?.dataset.go;
    if(!key)return;
    const tab=document.querySelector(`#nav [data-tab="${key}"]`); if(tab)tab.click();
  });

  const nav=$('#nav'), top=$('.top');
  if(nav&&top){
    const menu=document.createElement('button');
    menu.type='button'; menu.className='mobile-menu'; menu.setAttribute('aria-label','Ouvrir le menu'); menu.setAttribute('aria-expanded','false'); menu.textContent='☰';
    top.append(menu);
    const close=()=>{nav.classList.remove('mobile-open');menu.setAttribute('aria-expanded','false')};
    menu.addEventListener('click',()=>{const open=nav.classList.toggle('mobile-open');menu.setAttribute('aria-expanded',String(open))});
    nav.addEventListener('click',e=>{if(e.target.closest('button'))close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  }
})();
