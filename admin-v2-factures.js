/* ELA Admin v2 — la facture de commission.
   Chargé après admin-v2.html, comme les autres modules.

   ═══ POURQUOI CETTE FACTURE EXISTE ═══
   L'argent ne passe JAMAIS par Elatransfer : le client paie le chauffeur. La
   commission ne s'encaisse donc pas toute seule, elle se FACTURE. C'était le
   trou du modèle depuis le début.

   ═══ CE QUI CHANGE PAR RAPPORT À L'ESPACE ACTUEL ═══
   Là-bas le rang de facture vit dans « localStorage » : un appareil, une
   main, aucun conflit. Ici deux appareils peuvent émettre en même temps — et
   la loi interdit au numéro les TROUS comme les DOUBLONS (L441-9). Le rang est
   donc pris par le SERVEUR, en une seule instruction atomique. Cette page ne
   numérote rien, ne calcule rien : elle demande et elle affiche.

   ═══ PAS DE SIRET, PAS DE FACTURE ═══
   Sans nom, SIRET et adresse de l'émetteur, le document n'en est pas une. On
   refuse de l'éditer plutôt que d'en envoyer une fausse à un tiers — et on
   EMMÈNE au champ à remplir, comme le lien d'avis. C'est le cas réel
   aujourd'hui : Barbaros n'a pas encore de SIRET.
   L'APERÇU, LUI, RESTE POSSIBLE : il doit pouvoir regarder ce qu'il facturera
   avant d'avoir sa micro-entreprise, sinon l'écran ne sert à rien. */
(()=>{
'use strict';

let brouillon = null;     /* l'aperçu en cours, jamais numéroté */
let emise = null;         /* la dernière facture réellement émise */

async function rpc(name, body){
  return api(`/rest/v1/rpc/${name}`, {method:'POST', body:JSON.stringify(body||{})});
}
const euros = n => Number(n||0).toFixed(2).replace('.', ',') + ' €';
const jjmmaaaa = iso => {
  const p = String(iso||'').split('-');
  return p.length === 3 ? p[2]+'/'+p[1]+'/'+p[0] : (iso||'');
};
function dire(texte, classe){
  const el = document.getElementById('facEtat');
  if(!el) return;
  el.textContent = texte || '';
  el.className = 'muted small intake-etat' + (classe ? ' ' + classe : '');
}

/* ─────────────────────── l'identité de l'émetteur ─────────────────────── */

function emetteur(){
  const p = (state.params||[]).find(x => x.cle === 'entreprise_emettrice');
  return (p && p.valeur) || {};
}
/* La même règle que le serveur, mais elle ne DÉCIDE rien : c'est la fonction
   qui refuse d'émettre. Ici elle ne sert qu'à dire ce qui manque avant le
   clic — une garde d'écran n'est pas une frontière. */
function manqueEmetteur(){
  const e = emetteur(), m = [];
  if(!String(e.nom||'').trim())     m.push('le nom');
  if(!String(e.siret||'').trim())   m.push('le SIRET');
  if(!String(e.adresse||'').trim()) m.push("l'adresse");
  return m;
}
function ecrireEmetteur(){
  const e = emetteur();
  const mettre = (id, v) => { const n = document.getElementById(id); if(n) n.value = v || ''; };
  mettre('emNom', e.nom); mettre('emSiret', e.siret);
  mettre('emAdresse', e.adresse); mettre('emContact', e.contact);
  const t = document.getElementById('emTva');
  if(t) t.value = (e.taux_tva === 0 || e.taux_tva) ? e.taux_tva : 0;
  const note = document.getElementById('emEtat');
  if(note){
    const m = manqueEmetteur();
    note.textContent = m.length
      ? 'Il manque ' + m.join(', ') + " : sans eux, aucune facture ne peut être éditée."
      : '';
    note.className = 'muted small' + (m.length ? ' ko' : '');
  }
}
async function enregistrerEmetteur(){
  const lire = id => { const n = document.getElementById(id); return n ? n.value.trim() : ''; };
  const tva = Number(String((document.getElementById('emTva')||{}).value || '0').replace(',', '.'));
  if(!Number.isFinite(tva) || tva < 0 || tva > 100){
    dire('Le taux de TVA doit être un nombre entre 0 et 100.', 'ko'); return;
  }
  const valeur = { nom: lire('emNom'), siret: lire('emSiret'),
                   adresse: lire('emAdresse'), contact: lire('emContact'),
                   taux_tva: tva };
  try{
    await api('/rest/v1/parametres_commerciaux',
      {method:'POST', headers:{Prefer:'resolution=merge-duplicates'},
       body: JSON.stringify({cle:'entreprise_emettrice', valeur: valeur, actif:true})});
  }catch(e){ dire("L'enregistrement a échoué : " + (e && e.message || 'serveur muet'), 'ko'); return; }
  await load(); ecrireEmetteur();
  dire('Identité de l’émetteur enregistrée.', 'ok');
}

/* ─────────────────────────── le document ─────────────────────────── */

/* LES MENTIONS OBLIGATOIRES SONT ÉCRITES ICI, pas dans la base : ce sont des
   phrases de loi, pas des données. La TVA éteinte porte la mention de la
   franchise — réclamer une TVA qu'on ne reverse pas est une facture fausse. */
function mentions(f){
  const l = [
    'Prestation : mise en relation et apport de clientèle sur les courses '
      + 'listées, du ' + jjmmaaaa(f.periode_du) + ' au ' + jjmmaaaa(f.periode_au) + '.',
    'Paiement à réception. Aucun escompte pour paiement anticipé.',
    'En cas de retard : pénalités au taux de refinancement de la BCE majoré de '
      + '10 points, et indemnité forfaitaire pour frais de recouvrement de 40 € '
      + '(art. L441-10 et D441-5 du Code de commerce).'
  ];
  if(!Number(f.taux_tva)) l.push('TVA non applicable, art. 293 B du CGI.');
  return l;
}

function dessiner(f){
  const vue = document.getElementById('facVue');
  if(!vue) return;
  const ligne = l => `<tr><td>${esc(jjmmaaaa(l.jour))}</td><td>${esc(l.ref)}</td>`
      + `<td>${esc(l.depart)} → ${esc(l.arrivee)}</td>`
      + `<td class="num">${esc(euros(l.prix))}</td>`
      + `<td class="num">${esc(Number(l.taux))} %</td>`
      + `<td class="num">${esc(euros(l.commission))}</td></tr>`;
  vue.innerHTML =
      `<div class="fac-tete"><div><h3>${esc(f.emetteur.nom||'—')}</h3>`
    + `<div class="muted small">SIRET ${esc(f.emetteur.siret||'—')}<br>${esc(f.emetteur.adresse||'—')}`
    + (f.emetteur.contact ? `<br>${esc(f.emetteur.contact)}` : '') + `</div></div>`
    + `<div class="fac-num"><strong>${esc(f.num || 'APERÇU — non émise')}</strong>`
    + `<div class="muted small">Période du ${esc(jjmmaaaa(f.periode_du))} au ${esc(jjmmaaaa(f.periode_au))}</div></div></div>`
    + `<div class="fac-client"><span class="muted small">Facturé à</span><br><strong>${esc(f.client.nom||'—')}</strong>`
    + `<div class="muted small">SIRET ${esc(f.client.siret||'—')}<br>${esc(f.client.adresse||'—')}</div></div>`
    + `<table class="fac-table"><thead><tr><th>Date</th><th>Course</th><th>Trajet</th>`
    + `<th class="num">Prix course</th><th class="num">Taux</th><th class="num">Commission</th></tr></thead>`
    + `<tbody>${(f.lignes||[]).map(ligne).join('')}</tbody></table>`
    + `<div class="fac-total"><div>Total HT <b>${esc(euros(f.ht))}</b></div>`
    + `<div>TVA ${esc(Number(f.taux_tva))} % <b>${esc(euros(f.tva))}</b></div>`
    + `<div class="fac-ttc">Net à payer <b>${esc(euros(f.ttc))}</b></div></div>`
    + `<ul class="fac-mentions">${mentions(f).map(m => `<li>${esc(m)}</li>`).join('')}</ul>`;
  vue.hidden = false;
}

/* ─────────────────────── l'aperçu, puis l'émission ─────────────────── */

function champs(){
  const v = id => { const n = document.getElementById(id); return n ? n.value : ''; };
  return { ch: v('facChauffeur'), du: v('facDu'), au: v('facAu') };
}

async function apercu(){
  const c = champs();
  const manque = [];
  if(!c.ch) manque.push('le chauffeur');
  if(!c.du) manque.push('la date de début');
  if(!c.au) manque.push('la date de fin');
  if(manque.length){ dire('Il manque ' + manque.join(', ') + '.', 'ko'); return; }
  if(c.du > c.au){ dire('La date de début est après la date de fin.', 'ko'); return; }

  dire('Calcul…');
  let f;
  try{ f = await rpc('ela_apercu_facture_commission',
      {p_chauffeur_id:c.ch, p_du:c.du, p_au:c.au}); }
  catch(e){ dire("L'aperçu a échoué : " + (e && e.message || 'serveur muet'), 'ko'); return; }

  if(!f || !(f.lignes||[]).length){
    brouillon = null;
    const vue = document.getElementById('facVue'); if(vue) vue.hidden = true;
    document.getElementById('btnFacEmettre').hidden = true;
    dire('Aucune course à facturer sur cette période — seules les courses '
       + 'réalisées et pas encore facturées comptent.', 'ko');
    return;
  }
  brouillon = f; emise = null;
  dessiner(f);
  document.getElementById('btnFacImprimer').hidden = true;

  /* LE BOUTON D'ÉMISSION N'APPARAÎT QUE SI LE DOCUMENT PEUT EN ÊTRE UNE.
     Un bouton qui échouerait à chaque appui ferait croire à une panne. */
  const m = manqueEmetteur();
  const b = document.getElementById('btnFacEmettre');
  b.hidden = m.length > 0;
  dire((f.lignes.length > 1 ? f.lignes.length + ' courses' : '1 course')
     + ' à facturer, ' + euros(f.ht) + ' de commission. '
     + (m.length
        ? 'Rien ne peut être émis tant qu’il manque ' + m.join(', ')
          + ' — c’est dans « Tarification ».'
        : 'Relis avant d’émettre : une facture émise ne se modifie plus.'),
    m.length ? 'ko' : '');
}

async function emettre(){
  if(!brouillon) return;
  const c = champs();
  const b = document.getElementById('btnFacEmettre');
  b.disabled = true; dire('Émission…');
  let f;
  try{ f = await rpc('ela_emettre_facture_commission',
      {p_chauffeur_id:c.ch, p_du:c.du, p_au:c.au}); }
  catch(e){
    b.disabled = false;
    const msg = String(e && e.message || '');
    /* ON NOMME LA CAUSE. « L'émission a échoué » n'appelle aucun geste. */
    dire(msg.includes('emetteur_incomplet')
           ? 'Impossible : il manque le nom, le SIRET ou l’adresse de l’émetteur — c’est dans « Tarification ».'
       : msg.includes('aucune_course_a_facturer')
           ? 'Ces courses viennent d’être facturées ailleurs — rien n’a été émis, et aucun numéro n’a été consommé.'
       /* DEUX REFUS, DEUX GESTES. « Rien à facturer » se constate ; « le lot a
          bougé » se recommence. Les confondre enverrait tourner en rond, ou
          faire renoncer alors qu'un simple aperçu suffit. */
       : msg.includes('lot_modifie_pendant_emission')
           ? 'Le lot a changé pendant l’émission — rien n’a été écrit et aucun numéro n’a été consommé. Refais l’aperçu, puis émets.'
           : 'L’émission a échoué : ' + (msg || 'serveur muet') + ' — rien n’a été écrit.',
      'ko');
    return;
  }
  b.disabled = false; b.hidden = true;
  brouillon = null; emise = f;
  dessiner(f);
  document.getElementById('btnFacImprimer').hidden = false;
  dire('Facture ' + f.num + ' émise. Ces courses ne repartiront pas dans une autre facture.', 'ok');
  await load(); render();
  await listerFactures();
}

/* ─────────────────────────── les factures émises ─────────────────────── */

async function listerFactures(){
  const zone = document.getElementById('facListe');
  if(!zone) return;
  let l = [];
  try{ l = await api('/rest/v1/factures_commission?select=*&order=emise_le.desc&limit=50') || []; }
  catch(e){ zone.innerHTML = '<div class="empty">Les factures émises n’ont pas pu être lues.</div>'; return; }
  zone.innerHTML = l.length
    ? l.map(f => `<button class="card row" style="color:inherit;text-align:left" data-fac="${esc(f.num)}">`
        + `<strong>${esc(f.num)}</strong>`
        + `<span>${esc((f.client||{}).nom||'—')}<br><span class="muted small">`
        + `du ${esc(jjmmaaaa(f.periode_du))} au ${esc(jjmmaaaa(f.periode_au))}</span></span>`
        + `<b>${esc(euros(f.ttc))}</b></button>`).join('')
    : '<div class="empty">Aucune facture émise.</div>';
  /* ON ROUVRE LA FACTURE TELLE QU'ELLE A ÉTÉ ÉMISE, depuis ce que le serveur
     a figé — jamais recalculée. Un document comptable qui se réécrit tout
     seul ne prouve plus rien. */
  zone.querySelectorAll('[data-fac]').forEach(btn => btn.addEventListener('click', () => {
    const f = l.find(x => x.num === btn.dataset.fac);
    if(!f) return;
    brouillon = null; emise = f;
    dessiner(f);
    document.getElementById('btnFacEmettre').hidden = true;
    document.getElementById('btnFacImprimer').hidden = false;
    dire('Facture ' + f.num + ', telle qu’elle a été émise.', '');
    document.getElementById('facVue').scrollIntoView({behavior:'smooth', block:'start'});
  }));
}

/* ─────────────────────────── le branchement ─────────────────────────── */

function remplirChauffeurs(){
  const s = document.getElementById('facChauffeur');
  if(!s) return;
  const garde = s.value;
  /* TOUS les chauffeurs, pas seulement les attribuables : on facture aussi
     celui dont les papiers ont expiré depuis la course. Ce qui bloque une
     attribution ne bloque pas une créance déjà née. */
  s.innerHTML = '<option value="">— choisir —</option>'
    + (state.drivers||[]).map(d =>
        `<option value="${esc(d.id)}">${esc(d.nom_affiche)}</option>`).join('');
  if(garde) s.value = garde;
}

function brancher(){
  const a = document.getElementById('btnFacApercu');   if(a) a.addEventListener('click', apercu);
  const e = document.getElementById('btnFacEmettre');  if(e) e.addEventListener('click', emettre);
  const i = document.getElementById('btnFacImprimer'); if(i) i.addEventListener('click', () => window.print());
  const s = document.getElementById('btnEmEnregistrer'); if(s) s.addEventListener('click', enregistrerEmetteur);

  /* On remplit la liste et on lit les factures à l'ouverture de l'écran des
     finances, pas au chargement : c'est un écran qu'on n'ouvre pas tous les
     jours, et cinquante factures tirées pour rien sont de la 4G brûlée. */
  /* ON ÉCOUTE L'ÉCRAN, PAS LE BOUTON. C'était un clic sur « #nav » : le jour
     où « Finances » a quitté la barre du bas pour l'écran « Gestion », ce
     gestionnaire n'a plus jamais été appelé — liste des chauffeurs vide,
     identité de l'émetteur jamais écrite, factures jamais lues, et RIEN à
     l'écran pour le dire. Un module accroché à un ENDROIT meurt quand
     l'endroit bouge ; accroché à un ÉVÉNEMENT, il survit. Troisième module
     du même lot à tomber dessus, après le registre et l'affiche. */
  document.addEventListener('ela:ecran', ev => {
    if(ev.detail === 'finance'){ remplirChauffeurs(); ecrireEmetteur(); listerFactures(); }
    if(ev.detail === 'pricing') ecrireEmetteur();
  });
}

brancher();
})();
