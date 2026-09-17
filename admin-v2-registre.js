/* ELA Admin v2 — le registre, la sauvegarde et l'export comptable.
   Chargé après admin-v2.html, comme les autres modules.

   ═══ CE QUI CHANGE PAR RAPPORT À L'ESPACE EXPLOITANT ACTUEL ═══
   Là-bas le registre ne vit QUE dans le navigateur : la sauvegarde est le
   seul filet, et perdre le téléphone perd le travail. Ici les courses sont
   sur le serveur. La sauvegarde reste utile pour deux raisons, et pas
   pour celle-là : c'est la copie de Barbaros, indépendante d'un
   hébergeur qu'il ne maîtrise pas, et c'est le fichier que réclame un
   comptable.

   ═══ LES TABLEAUX NE COMPTENT QUE LES COURSES « realisee » ═══
   Une course confirmée est une promesse, pas un encaissement. La compter
   ferait prendre des promesses pour de l'argent reçu. Même règle que
   l'espace actuel, et c'est celle qui décide de tout ce fichier.

   ═══ LA DATE RETENUE EST CELLE DE LA COURSE, PAS DE LA SAISIE ═══
   Sinon les semaines se décalent au fil des oublis : une course de mardi
   saisie le vendredi tomberait dans la semaine suivante.

   ═══ ET LE DÉFAUT QUE CE MODULE A DÛ TRAITER EN PREMIER ═══
   « load() » ne demande que les 300 dernières courses — parfait pour un
   tableau de bord qui montre ce qui arrive, MENSONGER pour un registre qui
   additionne une année. Un total calculé sur une liste tronquée s'affiche
   sans un mot : il est simplement faux, et c'est le chiffre qu'on recopie
   dans une déclaration. Le registre fait donc SA PROPRE lecture, avec un
   plafond bien plus haut, et si le serveur rend exactement ce plafond on
   le DIT au lieu d'afficher un total qu'on sait incomplet. */
(()=>{
'use strict';

/* Le plafond du registre. Il est haut, mais il existe : une lecture sans
   limite finirait par ramener des dizaines de milliers de lignes sur le
   téléphone de Barbaros. Ce qui compte n'est pas sa valeur, c'est qu'on
   sache quand on l'atteint. */
const PLAFOND = 5000;

let regCourses = null;      /* la lecture complète, nulle tant qu'on n'a pas lu */
let regTronque = false;     /* vrai si le serveur a rendu exactement le plafond */
let periode = 'semaine';

async function rpc(name, body){
  return api(`/rest/v1/rpc/${name}`, {method:'POST', body:JSON.stringify(body||{})});
}

/* ─────────────────────────── les mesures ─────────────────────────── */

function lundiDe(d){
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
/* La date de la COURSE d'abord ; « cree » n'est qu'un secours pour une
   ligne ancienne qui n'aurait pas de date de trajet. */
function dateCourse(c){
  const r = (c.bon && c.bon.course) || {};
  const d = new Date(r.date || String((c.bon && c.bon.cree) || '').slice(0,10));
  return isNaN(d.getTime()) ? null : d;
}
function prixDe(c){ return Number((c.bon && c.bon.prix && c.bon.prix.total) || 0); }
function realisees(liste){ return liste.filter(c => c.statut === 'realisee'); }
function bilan(liste){
  const total = liste.reduce((s,c) => s + prixDe(c), 0);
  return { n: liste.length, total: total, moyen: liste.length ? total/liste.length : 0 };
}
/* Sans décimales : un chiffre d'affaires se lit d'un coup d'œil. Le détail
   d'une course garde ses centimes, lui. */
function eurosRond(n){ return Math.round(n).toLocaleString('fr-FR') + ' €'; }

/* ─────────────────────────── la lecture ─────────────────────────── */

async function lireRegistre(){
  const lignes = await api('/rest/v1/courses?select=ref,statut,bon&order=ref.desc&limit=' + PLAFOND);
  regCourses = lignes || [];
  regTronque = regCourses.length >= PLAFOND;
  return regCourses;
}

function dire(texte, classe){
  const el = document.getElementById('regEtat');
  if(!el) return;
  el.textContent = texte || '';
  el.className = 'muted small intake-etat' + (classe ? ' ' + classe : '');
}

/* ─────────────────────────── le dessin ─────────────────────────── */

function poser(id, lignes, vide){
  const el = document.getElementById(id);
  if(!el) return;
  el.innerHTML = lignes.length
    ? lignes.map(l => `<div class="card row reg-ligne"><strong>${esc(l.nom)}</strong>`
        + `<span class="muted">${esc(l.sous||'')}</span>`
        + `<b>${esc(l.val)}</b></div>`).join('')
    : (vide ? `<div class="empty">${esc(vide)}</div>` : '');
}

function dessinerRegistre(){
  if(!regCourses) return;
  const faites = realisees(regCourses);
  const maintenant = new Date();
  const l0 = lundiDe(maintenant);
  const l1 = new Date(l0); l1.setDate(l1.getDate() - 7);

  const cette = faites.filter(c => { const d = dateCourse(c); return d && d >= l0; });
  const avant = faites.filter(c => { const d = dateCourse(c); return d && d >= l1 && d < l0; });
  const a = bilan(cette), bb = bilan(avant);

  /* « la semaine dernière » est écrit à côté de chaque chiffre : un nombre
     seul ne dit pas s'il est bon. */
  document.getElementById('regMetrics').innerHTML =
      metric('Courses cette semaine', a.n)
    + metric('Encaissé cette semaine', eurosRond(a.total))
    + metric('Panier moyen', eurosRond(a.moyen))
    + metric('La semaine dernière', bb.n + ' · ' + eurosRond(bb.total));

  /* LE RÉSULTAT PAR PÉRIODE. On regroupe sur la CLÉ de la période plutôt que
     de boucler sur les dates : un mois sans course n'apparaît pas, et c'est
     voulu — une ligne à zéro n'apprend rien. */
  const cles = {};
  faites.forEach(c => {
    const d = dateCourse(c); if(!d) return;
    let k;
    if(periode === 'annee') k = String(d.getFullYear());
    else if(periode === 'mois') k = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    else { const l = lundiDe(d);
           k = l.getFullYear() + '-' + String(l.getMonth()+1).padStart(2,'0')
                               + '-' + String(l.getDate()).padStart(2,'0'); }
    (cles[k] = cles[k] || []).push(c);
  });
  const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août',
                'septembre','octobre','novembre','décembre'];
  poser('regResultat', Object.keys(cles).sort().reverse().slice(0,12).map(k => {
    const v = bilan(cles[k]);
    let nom = k;
    if(periode === 'semaine'){ const p = k.split('-');
      nom = 'Semaine du ' + p[2] + '/' + p[1] + '/' + p[0]; }
    else if(periode === 'mois'){ const q = k.split('-');
      nom = MOIS[+q[1]-1] + ' ' + q[0]; }
    return { nom:nom, sous: v.n + (v.n > 1 ? ' courses' : ' course'), val: eurosRond(v.total) };
  }), 'Aucune course réalisée pour l’instant.');

  /* LES CHAUFFEURS, du plus rapporteur au moins : c'est le tableau qui sert
     à décider à qui confier la prochaine course. */
  const parCh = {};
  faites.forEach(c => {
    const nom = String((c.bon && c.bon.chauffeur && c.bon.chauffeur.nom) || '').trim();
    if(!nom) return;
    (parCh[nom] = parCh[nom] || []).push(c);
  });
  poser('regChauffeurs', Object.keys(parCh).map(nom => {
    const v = bilan(parCh[nom]);
    return { nom:nom, sous: v.n + (v.n > 1 ? ' courses' : ' course')
                            + ' · ' + eurosRond(v.moyen) + ' en moyenne',
             val: eurosRond(v.total), _t: v.total };
  }).sort((x,y) => y._t - x._t), 'Aucune course réalisée avec un chauffeur nommé.');

  /* D'OÙ VIENNENT LES CLIENTS. Ici on part de TOUT le registre, pas des
     seules réalisées : une demande venue d'une affiche prouve que l'affiche
     travaille, même si la course n'a pas fini par se faire. L'argent, lui,
     ne compte que les réalisées — deux chiffres pour deux questions. */
  const parProv = {};
  regCourses.forEach(c => {
    const p = String((c.bon && (c.bon.provenance || c.bon.provenanceCle)) || '').trim();
    if(!p) return;
    (parProv[p] = parProv[p] || []).push(c);
  });
  poser('regProvenance', Object.keys(parProv).map(nom => {
    const tout = parProv[nom];
    const ok = tout.filter(c => c.statut === 'realisee');
    return { nom:nom,
             sous: tout.length + (tout.length > 1 ? ' demandes' : ' demande')
                   + ' · ' + ok.length + ' réalisée' + (ok.length > 1 ? 's' : ''),
             val: eurosRond(bilan(ok).total), _n: tout.length };
  }).sort((x,y) => y._n - x._n), 'Aucune provenance enregistrée.');

  /* ON NE MONTRE PAS UN TOTAL QU'ON SAIT INCOMPLET sans le dire. */
  const avert = document.getElementById('regTronque');
  if(avert){
    avert.hidden = !regTronque;
    avert.textContent = regTronque
      ? 'Le serveur a rendu ' + PLAFOND + ' courses, c’est le maximum lu ici : '
        + 'les totaux ci-dessus ne portent que sur celles-là. Dis-le-moi, il faut '
        + 'passer au calcul côté serveur.'
      : '';
  }
}

/* ─────────────────────── la sauvegarde et l'export ─────────────────── */

function telecharger(nom, contenu, type){
  const a = document.createElement('a');
  const url = URL.createObjectURL(new Blob([contenu], {type:type}));
  a.href = url; a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
  /* On libère l'adresse APRÈS le clic : la révoquer tout de suite annule le
     téléchargement sur certains navigateurs. */
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function horodatage(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0')
                         + '-' + String(d.getDate()).padStart(2,'0');
}

/* LE MÊME FORMAT QUE L'ESPACE ACTUEL (« elatransfer-1 »), et ce n'est pas
   de la coquetterie : une sauvegarde prise d'un côté doit se restaurer de
   l'autre tant que les deux espaces coexistent. Deux formats voudraient
   dire deux lecteurs, et c'est celui qu'on oublie qui refuserait le fichier
   le jour où on en a besoin. */
function sauvegarder(){
  if(!regCourses){ dire('Le registre n’est pas encore lu.', 'ko'); return; }
  telecharger('elatransfer-registre-' + horodatage() + '.json',
    JSON.stringify({ format:'elatransfer-1',
                     courses: regCourses.map(c => Object.assign({}, c.bon,
                                { ref:c.ref, statut:c.statut })),
                     chauffeurs: state.drivers || [] }, null, 1),
    'application/json');
  dire('Sauvegarde téléchargée — ' + regCourses.length + ' courses et le carnet. '
     + 'Garde-la ailleurs que sur ce téléphone.', 'ok');
}

/* LE POINT-VIRGULE ET NON LA VIRGULE : Excel en français lit le CSV avec le
   séparateur de sa locale, et une virgule y met tout dans une seule
   colonne. Le BOM en tête pour qu'il ne massacre pas les accents. */
function exporterCSV(){
  if(!regCourses){ dire('Le registre n’est pas encore lu.', 'ko'); return; }
  const colonnes = ['Référence','Date','Heure','État','Client','Téléphone',
                    'Départ','Arrivée','Véhicule','Paiement','Chauffeur','Vient de',
                    'Prix TTC','Prix HT','TVA'];
  const champ = v => {
    const s = String(v === undefined || v === null ? '' : v);
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  };
  const sous = n => Number(n||0).toFixed(2).replace('.', ',');
  const lignes = [colonnes.join(';')];
  regCourses.forEach(c => {
    const x = c.bon || {}, r = x.course || {}, cl = x.client || {}, p = x.prix || {};
    lignes.push([c.ref, r.date||'', r.heure||'', c.statut||'',
                 cl.nom||'', cl.telephone||'',
                 r.departPublic||r.depart||'', r.arriveePublic||r.arrivee||'',
                 r.vehicule||'', x.paiementNom||'',
                 (x.chauffeur&&x.chauffeur.nom)||'',
                 x.provenance||x.provenanceCle||'',
                 sous(p.total), sous(p.ht), sous(p.tva)].map(champ).join(';'));
  });
  telecharger('elatransfer-courses-' + horodatage() + '.csv',
              '﻿' + lignes.join('\r\n'), 'text/csv;charset=utf-8');
  dire(regCourses.length + ' courses exportées.', 'ok');
}

/* LA RESTAURATION AJOUTE, ELLE N'ÉCRASE JAMAIS. Une course d'ici peut avoir
   avancé depuis la sauvegarde — chauffeur attribué, course réalisée — et
   remplacer ferait RECULER le travail au lieu de le rendre. La règle est
   posée côté serveur, pas ici : une garde d'écran n'est pas une frontière. */
async function restaurer(fichier){
  let brut;
  try{ brut = JSON.parse(await fichier.text()); }
  catch(e){ dire('Ce fichier n’est pas une sauvegarde du registre.', 'ko'); return; }
  /* Deux formats : le tableau de courses d'avant, et l'objet complet
     d'aujourd'hui. On ne casse pas les sauvegardes déjà faites. */
  const cours = Array.isArray(brut) ? brut
              : (brut && Array.isArray(brut.courses) ? brut.courses : null);
  if(!cours){ dire('Ce fichier n’est pas une sauvegarde du registre.', 'ko'); return; }
  if(!cours.length){ dire('Cette sauvegarde ne contient aucune course.', 'ko'); return; }
  dire('Restauration en cours…');
  let r;
  try{ r = await rpc('ela_restaurer_courses_exploitant', {p_courses: cours}); }
  catch(e){
    dire('La restauration a échoué : ' + (e && e.message ? e.message : 'serveur muet')
       + ' — rien n’a été écrit.', 'ko');
    return;
  }
  const ajoutees = Number((r && r.ajoutees) || 0), ignorees = Number((r && r.ignorees) || 0);
  dire(ajoutees + (ajoutees > 1 ? ' courses ajoutées.' : ' course ajoutée.')
     + (ignorees ? ' ' + ignorees + ' déjà présente' + (ignorees > 1 ? 's' : '')
                 + ' — elles n’ont pas été touchées.' : ''), 'ok');
  await lireRegistre();
  dessinerRegistre();
}

/* ─────────────────────────── le branchement ─────────────────────────── */

async function ouvrirRegistre(){
  dire('Lecture du registre…');
  try{ await lireRegistre(); }
  catch(e){
    dire('Le registre n’a pas pu être lu : ' + (e && e.message ? e.message : 'serveur muet')
       + '. Les chiffres ci-dessous seraient faux, ils ne sont pas affichés.', 'ko');
    return;
  }
  dire('');
  dessinerRegistre();
}

function brancher(){
  document.querySelectorAll('[data-periode]').forEach(b => {
    b.addEventListener('click', () => {
      periode = b.dataset.periode;
      document.querySelectorAll('[data-periode]').forEach(x => x.classList.toggle('on', x === b));
      dessinerRegistre();
    });
  });
  const s = document.getElementById('btnRegSauver');
  if(s) s.addEventListener('click', sauvegarder);
  const c = document.getElementById('btnRegCSV');
  if(c) c.addEventListener('click', exporterCSV);
  const f = document.getElementById('regFichier');
  if(f) f.addEventListener('change', async e => {
    const fic = e.target.files && e.target.files[0];
    e.target.value = '';                     /* on rend le champ réutilisable tout de suite */
    if(fic) await restaurer(fic);
  });
  /* ON NE LIT LE REGISTRE QU'À L'OUVERTURE DE SON ÉCRAN. Cinq mille lignes
     tirées au chargement de l'application, sur un téléphone, pour un écran
     qu'on n'ouvre pas tous les jours — c'est de la 4G brûlée. */
  const nav = document.getElementById('nav');
  if(nav) nav.addEventListener('click', e => {
    if(e.target && e.target.dataset && e.target.dataset.tab === 'registre') ouvrirRegistre();
  });
  const r = document.getElementById('btnRegActualiser');
  if(r) r.addEventListener('click', ouvrirRegistre);
}

brancher();
})();
