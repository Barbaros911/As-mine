/* ELA Admin v2 — actions métier. Chargé après admin-v2.html. */
(()=>{
'use strict';
const money=c=>Number.isFinite(Number(c))?(Number(c)/100).toFixed(2)+' €':'—';
const safePhone=v=>String(v||'').replace(/[^0-9]/g,'');
async function rpc(name,body){return api(`/rest/v1/rpc/${name}`,{method:'POST',body:JSON.stringify(body||{})});}
async function edge(name,body){const r=await fetch(`${SB}/functions/v1/${name}`,{method:'POST',headers:authHeaders(),body:JSON.stringify(body||{})});let x={};try{x=await r.json()}catch{}if(!r.ok)throw new Error(x.erreur||`HTTP ${r.status}`);return x;}
function paymentFor(ref){return state.payments.find(p=>p.course_ref===ref)||null;}
function snapshotFor(ref){return state.snapshots.find(s=>s.course_ref===ref)||null;}
function validDrivers(){return state.drivers.filter(d=>d.attribuable!==undefined?d.attribuable:(d.actif!==false&&d.statut==='valide'));}
function currentDriver(course){const d=course?.bon?.chauffeur||{};return {nom:d.nom||'',telephone:d.telephone||'',carte:d.carteProfessionnelle||''};}
function bookingMessage(x,course){const d=currentDriver(course);let msg=`ELA TRANSFER\nRéservation : ${x.ref}\nDate : ${x.date} à ${x.time}\nDépart : ${x.from}\nArrivée : ${x.to}\n`;
  if(x.status==='confirmee')msg+='Statut : Réservation confirmée. Les informations du chauffeur seront communiquées dès son attribution.';
  else if(x.status==='attribuee')msg+=`Statut : Chauffeur attribué${d.nom?` — ${d.nom}`:''}${d.telephone?` — ${d.telephone}`:''}.`;
  else if(x.status==='annulee')msg+='Statut : Réservation annulée.';
  else if(x.status==='attente')msg+='Statut : Demande reçue, en attente de confirmation.';
  else msg+=`Statut : ${x.status}.`;
  return msg;
}
function whatsapp(phone,msg){const p=safePhone(phone);if(!p){alert('Numéro WhatsApp indisponible.');return;}window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`,'_blank','noopener');}
async function refreshActionQueue(){if(!session?.access_token)return;try{await rpc('ela_rafraichir_actions',{});const a=await api('/rest/v1/actions_requises?select=*&statut=eq.ouverte&order=priorite.desc,echeance.asc&limit=100');state.actions=a||[];render();}catch(e){console.warn('actions',e);}}
const baseLoad=load;
load=async function(){await baseLoad();await refreshActionQueue();};

async function changeStatus(ref,status,label,motif=''){
  if(!confirm(label))return;
  try{await rpc('ela_changer_statut',{p_ref:ref,p_nouveau:status,p_motif:motif||null});await load();await openBookingV2(ref);}catch(e){alert(`Action refusée : ${e.message}`);}
}
function driverPicker(ref,x,snap,mode){const ds=validDrivers();if(!ds.length){alert(state.drivers.length?'Aucun chauffeur attribuable : ils sont bloqués, à vérifier, ou leurs papiers sont expirés. Ouvrez « Chauffeurs » pour régulariser.':'Aucun chauffeur dans le dossier chauffeurs.');return;}
  const options=ds.map(d=>`<option value="${esc(d.id)}">${esc(d.nom_affiche)}${d.entreprise?' — '+esc(d.entreprise):''}</option>`).join('');
  const avertirPapiers=id=>{const d=state.drivers.find(z=>z.id===id),z=$('#driverPapiers');if(!z)return;
    if(!d||d.papiers_etat===undefined){z.className='papiers-note';z.textContent='';return;}
    if(d.papiers_etat==='manquant'){z.className='papiers-note rouge';z.textContent="Papiers non renseignés pour ce chauffeur. Impossible de prouver sa carte, son registre et son assurance : à renseigner avant de l'engager.";return;}
    if(d.papiers_etat==='bientot'){z.className='papiers-note orange';z.textContent=`Papiers à renouveler : le plus proche expire dans ${d.papiers_jours} jour(s).`;return;}
    z.className='papiers-note vert';z.textContent='Papiers à jour.';};
  const title=mode==='propose'?'Proposer la course':'Attribuer le chauffeur';
  showSheet(title,`<div class="card"><p><b>${esc(x.date)} ${esc(x.time)}</b></p><p>${esc(x.from)}<br>→ ${esc(x.to)}</p><p>${esc(x.vehicle)}</p><p>Montant chauffeur : <b>${money(snap?.montant_chauffeur_centimes)}</b></p></div><label class="field">Chauffeur<select id="driverChoice">${options}</select></label><p id="driverPapiers" class="papiers-note"></p><button id="driverChoiceGo" class="btn">${mode==='propose'?'Ouvrir WhatsApp':'Attribuer'}</button>`);
  $('#driverChoice').onchange=e=>avertirPapiers(e.target.value);
  avertirPapiers($('#driverChoice').value);
  $('#driverChoiceGo').onclick=async()=>{const id=$('#driverChoice').value,d=state.drivers.find(z=>z.id===id);try{
    if(mode==='propose'){
      await rpc('ela_journaliser_proposition_chauffeur',{p_ref:ref,p_chauffeur_id:id});
      const msg=`ELA TRANSFER — PROPOSITION DE COURSE\nDate : ${x.date} à ${x.time}\nDépart : ${x.from}\nArrivée : ${x.to}\nVéhicule : ${x.vehicle||'À vérifier'}\nMontant chauffeur : ${money(snap?.montant_chauffeur_centimes)}\nRéférence : ${x.ref}`;
      whatsapp(d.telephone_whatsapp,msg);$('#sheet').classList.add('hidden');await load();
    }else{
      if(!confirm(`Attribuer ${d.nom_affiche} à ${ref} ?`))return;
      await rpc('ela_attribuer_chauffeur',{p_ref:ref,p_chauffeur_id:id});$('#sheet').classList.add('hidden');await load();await openBookingV2(ref);
    }
  }catch(e){alert(`Chauffeur : ${e.message}`);}};
}
async function doPayment(ref,kind){const label=kind==='capture'?'Capturer maintenant le paiement TEST autorisé ?':'Libérer / annuler maintenant l’empreinte TEST ?';if(!confirm(label))return;try{await edge(kind==='capture'?'capturer-paiement':'annuler-empreinte',{ref});await load();await openBookingV2(ref);}catch(e){alert(`Paiement : ${e.message}`);}}
async function removeDriver(ref){const motif=prompt('Motif interne du retrait / de la réattribution (facultatif) :')||'';if(!confirm('Retirer le chauffeur actuel et remettre la course à attribuer ?'))return;try{await rpc('ela_retirer_chauffeur',{p_ref:ref,p_motif:motif||null});await load();await openBookingV2(ref);}catch(e){alert(`Action refusée : ${e.message}`);}}
async function openBookingV2(ref){const c=state.courses.find(z=>z.ref===ref);if(!c)return;const x=b(c),ev=await api(`/rest/v1/evenements_reservation?course_ref=eq.${encodeURIComponent(ref)}&select=*&order=cree_le.desc&limit=100`).catch(()=>[]),p=paymentFor(ref),s=snapshotFor(ref),d=currentDriver(c);
  let actions='';
  if(x.status==='attente')actions+=`<button class="btn" data-act="confirm">Confirmer la réservation</button> <button class="btn alt" data-act="cancel">Annuler</button>`;
  if(x.status==='confirmee')actions+=`<button class="btn" data-act="propose">Proposer à un chauffeur</button> <button class="btn alt" data-act="assign">Attribuer</button> <button class="btn alt" data-act="cancel">Annuler</button>`;
  if(x.status==='attribuee')actions+=`<button class="btn" data-act="done">Course réalisée</button> <button class="btn alt" data-act="noshow">Client absent</button> <button class="btn warn" data-act="incident">Incident</button> <button class="btn alt" data-act="remove">Retirer le chauffeur</button> <button class="btn alt" data-act="cancel">Annuler</button>`;
  if(x.status==='incident')actions+=`<button class="btn" data-act="done">Clôturer : réalisée</button> <button class="btn alt" data-act="cancel">Clôturer : annulée</button>`;
  if(p?.statut==='autorise')actions+=` <button class="btn" data-act="capture">Capturer paiement TEST</button> <button class="btn alt" data-act="release">Libérer empreinte TEST</button>`;
  if(x.phone)actions+=` <button class="btn alt" data-act="clientwa">WhatsApp client</button>`;
  showSheet(`Réservation ${ref}`,`<div class="card"><b>${esc(x.date)} ${esc(x.time)}</b><p>${esc(x.from)}<br>→ ${esc(x.to)}</p><p>${esc(x.client)} · ${esc(x.phone)}</p><p><span class="tag ${esc(x.status)}">${esc(x.status)}</span> · ${esc(x.vehicle)} · ${esc(x.source)}</p>${d.nom?`<p>Chauffeur : <b>${esc(d.nom)}</b> · ${esc(d.telephone)}</p>`:''}</div><div class="card" style="margin-top:10px"><b>Finances</b><p>Prix client : ${money(s?.prix_final_centimes)} · Chauffeur dû : ${money(s?.montant_chauffeur_centimes)} · Marge ELA : ${money(s?.marge_ela_centimes)}</p><p>Paiement : <span class="tag ${esc(p?.statut||'')}">${esc(p?.statut||'non initialisé')}</span>${p?.mode?` · ${esc(p.mode)}`:''}</p></div><div class="toolbar" id="bookingActions" style="margin-top:12px">${actions||'<span class="muted">Aucune action disponible pour cet état.</span>'}</div><h3>Historique</h3><div class="timeline">${ev.length?ev.map(e=>`<div><b>${new Date(e.cree_le).toLocaleString('fr-FR')} — ${esc(e.type_evenement)}</b><br><span class="muted small">${esc(e.acteur_type)}</span></div>`).join(''):'<div class="muted">Aucun événement enregistré.</div>'}</div>`);
  $('#bookingActions')?.addEventListener('click',async e=>{const a=e.target.dataset.act;if(!a)return;
    if(a==='confirm')return changeStatus(ref,'confirmee','Confirmer cette réservation ?');
    if(a==='cancel')return changeStatus(ref,'annulee','Annuler cette réservation ?');
    if(a==='propose')return driverPicker(ref,x,s,'propose');
    if(a==='assign')return driverPicker(ref,x,s,'assign');
    if(a==='remove')return removeDriver(ref);
    if(a==='done')return changeStatus(ref,'realisee','Clôturer cette course comme réalisée ?');
    if(a==='noshow')return changeStatus(ref,'client_absent','Clôturer cette course avec le statut « Client absent » ?');
    if(a==='incident'){const m=prompt('Décris brièvement l’incident pour l’historique :');if(m===null)return;return changeStatus(ref,'incident','Enregistrer cet incident ?',m);}
    if(a==='capture')return doPayment(ref,'capture');
    if(a==='release')return doPayment(ref,'release');
    if(a==='clientwa')return whatsapp(x.phone,bookingMessage(x,c));
  });
}
/* =====================================================================
   COLLER UNE DEMANDE — LE GESTE PRINCIPAL DE BARBAROS
   ---------------------------------------------------------------------
   Neuf courses sur dix arrivent par message. Admin v2 ne savait que RELIRE
   ce que le serveur contenait deja : sans ce bouton, la bascule lui aurait
   retire son geste le plus frequent.

   LE LECTEUR N'EST PAS RECOPIE ICI. Il vit dans « intake-demande.js » et
   l'espace actuel l'appelle aussi. Deux lecteurs pour un seul message,
   c'est la divergence assuree le jour ou la forme du message change -- et
   elle ne se verrait qu'a la course suivante.

   UNE MINUTERIE DE 1,2 s OUVRE LE CHAMP DE REPLI. Certains navigateurs
   refusent la lecture du presse-papiers (le « catch » suffit), d'autres
   laissent la promesse EN ATTENTE INDEFINIMENT -- et sans minuterie le
   bouton ne fait alors rien du tout, sans un mot. Piege deja paye.

   LE CHAMP RESTE OUVERT APRES UN AJOUT, vide : les demandes arrivent par
   trois ou quatre d'affilee.
   ===================================================================== */
function intakeDire(texte, classe){
  const p=document.getElementById('intakeEtat'); if(!p)return;
  p.textContent=texte||''; p.className='muted small intake-etat'+(classe?' '+classe:'');
}
function intakeOuvrirRepli(){
  const z=document.getElementById('intakeTexte'), b=document.getElementById('btnIntakeAjouter');
  if(z)z.hidden=false; if(b)b.hidden=false;
}

/* LES DEUX CLES NE CHANGENT JAMAIS -- elles sont ecrites dans l'historique.
   Le lecteur exige une grille et n'en porte aucune : un defaut cache dans
   le lecteur serait une deuxieme grille, qui se tairait le jour ou la vraie
   change. Ici les NOMS n'engagent aucun prix : ils ne servent qu'a relire le
   vehicule ecrit dans un message. */
const GAMMES_INTAKE=[{cle:'berline',nom:'Berline'},{cle:'van',nom:'Van'}];

/* La reference du client est reprise telle quelle quand le message en porte
   une. Sinon on en fabrique une a partir du rang du mois DEJA connu -- et si
   deux exploitants collaient au meme instant, le serveur refuse le doublon
   au lieu d'ecraser : on reessaie, on ne perd rien. */
function refIntakeSuivante(){
  const d=new Date(), aa=String(d.getFullYear()).slice(2), mm=String(d.getMonth()+1).padStart(2,'0');
  const prefixe=`ELA-${aa}-${mm}-`;
  let rang=0;
  (state.courses||[]).forEach(c=>{
    const r=c.ref||'';
    if(r.startsWith(prefixe)){const n=parseInt(r.slice(prefixe.length),10); if(n>rang)rang=n;}
  });
  return prefixe+String(rang+1).padStart(4,'0');
}

async function intakeAjouter(texte){
  if(!window.ELA_INTAKE||!window.ELA_INTAKE.lireDemande){
    intakeDire("Le lecteur de demandes n'est pas chargé. Recharge la page.",'ko'); return; }
  let d=null;
  try{ d=window.ELA_INTAKE.lireDemande(texte,GAMMES_INTAKE); }
  catch(e){ intakeDire('Lecture impossible : '+e.message,'ko'); return; }
  if(!d){ intakeDire("Ce message n'est pas une demande : il faut au moins un départ, une arrivée et une date.",'ko'); return; }

  /* UNE DEMANDE VENUE D'UN CLIENT ENTRE TOUJOURS EN « ATTENTE ». Il attend
     une reponse ; la ranger comme confirmee promettrait une voiture que
     personne n'a acceptee. */
  const bon=window.ELA_INTAKE.courseDepuis(d,refIntakeSuivante(),'attente');
  try{
    await rpc('ela_creer_course_exploitant',{p_ref:bon.ref,p_bon:bon,p_statut:'attente',p_origine:'collee'});
  }catch(e){
    const m=String(e&&e.message||e);
    if(m.includes('reference_existante')){
      intakeDire('Cette course existe déjà ('+bon.ref+') — rien n’a été écrasé.','ko'); return; }
    intakeDire('Le serveur a refusé : '+m,'ko'); return;
  }
  const z=document.getElementById('intakeTexte'); if(z)z.value='';
  intakeDire('Demande ajoutée — '+bon.ref+' · '+(d.nom||'client')+'.','ok');
  await load(); render();
}

function brancherIntake(){
  const bouton=document.getElementById('btnCollerV2');
  if(bouton)bouton.addEventListener('click',async()=>{
    intakeDire('');
    let minuterie=setTimeout(()=>{ minuterie=null; intakeOuvrirRepli();
      intakeDire("Le presse-papiers n'a pas répondu. Colle le message ci-dessous."); },1200);
    let texte='';
    try{ texte=await navigator.clipboard.readText(); }
    catch(e){ texte=''; }
    if(minuterie===null)return;          /* la minuterie a deja tranche */
    clearTimeout(minuterie);
    if(!texte||!texte.trim()){ intakeOuvrirRepli();
      intakeDire('Presse-papiers vide. Colle le message ci-dessous.'); return; }
    await intakeAjouter(texte);
  });
  const ajouter=document.getElementById('btnIntakeAjouter');
  if(ajouter)ajouter.addEventListener('click',async()=>{
    const z=document.getElementById('intakeTexte');
    await intakeAjouter(z?z.value:'');
  });
}
brancherIntake();

openBooking=openBookingV2;
setTimeout(()=>{if(session?.access_token)refreshActionQueue();},700);
})();
