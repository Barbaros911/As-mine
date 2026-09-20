/* =====================================================================
   TEST-ADMIN-PAPIERS.MJS — les papiers d'un chauffeur expirent tout seuls
   ---------------------------------------------------------------------
   CE QU'IL ÉPROUVE, ET CE QUE ÇA COÛTAIT :

   Dans Admin v2, l'état d'un chauffeur était un champ « statut » posé à la
   main dans un menu déroulant, et aucune date d'expiration n'était même
   collectée. Une assurance expirée hier laissait donc le chauffeur
   « Validé » POUR TOUJOURS, et le sélecteur d'attribution le proposait
   encore. Or c'est à l'instant de l'attribution qu'Elatransfer engage sa
   responsabilité (Code des transports L3142-1).

   Un état stocké ne vieillit pas. C'est tout le défaut, et il ne se voit
   pas : l'écran affiche « Validé », il est simplement faux.

   IL ÉPROUVE LE SITE CONSTRUIT, PAS LE DÉPÔT. Les trois scripts d'Admin v2
   ne sont rattachés à la page que par « construire.sh » : ouvert depuis le
   dépôt, admin-v2.html n'a ni sélecteur de chauffeur ni file d'actions, et
   la suite passerait au vert sans rien avoir éprouvé.

   Le serveur est simulé. Ce qu'on mesure est ce que la PAGE fait de l'état
   que la vue « chauffeurs_etat » lui rend — jamais un recalcul d'ici : un
   test qui réimplémente ce qu'il vérifie ne vérifie rien.

   Lancer :  node test-admin-papiers.mjs
             (elle construit et sert le site elle-même)
   ===================================================================== */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';

/* LA SUITE CONSTRUIT ET SERT ELLE-MÊME. Un serveur lancé à côté est un
   serveur qu'on finit par laisser sur le mauvais dossier : éprouvé ce
   jour-là, une demi-heure perdue à mesurer le dépôt en croyant mesurer le
   site publié. Ici il n'y a rien à se tromper. */
execSync('sh construire.sh', {stdio:'ignore'});
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript',
  '.mjs':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json',
  '.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg',
  '.ico':'image/x-icon','.txt':'text/plain','.xml':'application/xml'};
const serveur = createServer(async (req, res) => {
  try {
    let chemin = decodeURIComponent(req.url.split('?')[0]);
    chemin = normalize(chemin).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, {'Content-Type': TYPES[extname(f)] || 'application/octet-stream'});
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8096, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8096';
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const jour = n => { const d=new Date(Date.now()+n*864e5); const z=x=>String(x).padStart(2,'0');
  return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate()); };

/* Les chauffeurs tels que la VUE les rend : l'état est déjà décidé côté
   serveur. La page n'a qu'à s'en servir — et c'est ça qu'on éprouve. */
const CHAUFFEURS = [
  { id:'d1', nom_affiche:'Mehmet', telephone_whatsapp:'0612345678', entreprise:'MY VTC',
    statut:'valide', actif:true,
    carte_vtc_fin:jour(300), registre_fin:jour(400), assurance_fin:jour(200),
    papiers_etat:'valide', papiers_jours:200, etat_effectif:'valide', attribuable:true },

  /* LE CAS QUI COMPTE : le statut dit « valide », l'assurance a expiré. */
  { id:'d2', nom_affiche:'Ayse', telephone_whatsapp:'0698765432', entreprise:'AY TRANSPORT',
    statut:'valide', actif:true,
    carte_vtc_fin:jour(300), registre_fin:jour(400), assurance_fin:jour(-2),
    papiers_etat:'perime', papiers_jours:-2, etat_effectif:'papiers', attribuable:false },

  { id:'d3', nom_affiche:'Karim', telephone_whatsapp:'0611223344', entreprise:'',
    statut:'valide', actif:true,
    carte_vtc_fin:jour(12), registre_fin:jour(400), assurance_fin:jour(200),
    papiers_etat:'bientot', papiers_jours:12, etat_effectif:'a_renouveler', attribuable:true },

  /* Papiers NON RENSEIGNÉS : rouge à l'écran, mais PAS bloquant. On ne sait
     pas ; bloquer dessus reviendrait à inventer un fait, et rendrait tous
     les chauffeurs inattribuables le jour du déploiement. */
  { id:'d4', nom_affiche:'Luis', telephone_whatsapp:'0755667788', entreprise:'',
    statut:'valide', actif:true,
    carte_vtc_fin:null, registre_fin:null, assurance_fin:null,
    papiers_etat:'manquant', papiers_jours:null, etat_effectif:'papiers', attribuable:true },
];

const COURSES = [
  { ref:'ELA-26-09-0001', statut:'confirmee', bon:{
      course:{ date:jour(1), heure:'06:00', depart:'easyHotel Aéroville',
               arrivee:'Orly 1', vehicule:'Berline' },
      client:{ nom:'M. Dupont', telephone:'0612345678' },
      prix:{ total:100 }, provenance:'Public ELA' } },
];

const ACTIONS = [
  { id:1, course_ref:null, type_action:'papiers_a_regulariser', priorite:85, statut:'ouverte',
    echeance:null, chauffeur_id:'d2', donnees:{ libelle:'Ayse', etat:'perime' } },
];


/* ATTENDRE CE QU'ON VEUT VOIR, JAMAIS UNE DURÉE. Un délai fixe passe sur la
   machine de travail et tombe sur un coureur plus lent : le premier passage
   de cette suite en CI est mort sur « Cannot read properties of null » à
   l'endroit précis où elle dormait 300 ms. */
const ouvrirAttribution = async (page, ref) => {
  await page.evaluate(r => openBooking(r), ref);
  await page.waitForSelector('[data-act="assign"]', {timeout:15000});
  await page.click('[data-act="assign"]');
  await page.waitForSelector('#driverChoice', {timeout:15000});
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'fr-FR' });

/* LA GÉNÉRIQUE EN PREMIER, LA SPÉCIFIQUE ENSUITE : Playwright consulte la
   DERNIÈRE route posée en premier. */
let envoye = null;
const faireServeur = (r, aussi) => {
  const u = r.request().url();
  if(u.startsWith(BASE)) return r.continue();
  if(!u.includes('supabase.co')) return r.abort();
  return aussi(r, u, o => r.fulfill({contentType:'application/json', body:JSON.stringify(o)}));
};

await ctx.route('**/*', r => faireServeur(r, (r, u, J) => {
  if(u.includes('/rpc/est_exploitant')) return J(true);
  if(u.includes('/rpc/ela_rafraichir_actions')) return J(0);
  if(u.includes('/chauffeurs_etat')) return J(CHAUFFEURS);
  if(u.includes('/rest/v1/chauffeurs')){
    if(r.request().method()!=='GET'){ envoye = JSON.parse(r.request().postData()||'{}');
      return r.fulfill({status:204, body:''}); }
    return J(CHAUFFEURS);
  }
  if(u.includes('/actions_requises')) return J(ACTIONS);
  if(u.includes('/rest/v1/courses')) return J(COURSES);
  if(u.includes('/evenements_reservation')) return J([]);
  return J([]);
}));

await ctx.addInitScript(() => {
  sessionStorage.setItem('ela_admin_session', JSON.stringify({
    access_token:'jeton-de-test', refresh_token:'r', user:{ email:'exploitant@test' } }));
});

const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto(BASE+'/admin-v2.html', {waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof openBooking==='function'
  && state.drivers.length>0 && state.courses.length>0, null, {timeout:20000});

check('la page s\'ouvre sur l\'espace, pas sur l\'écran de connexion',
  await p.evaluate(()=>!document.querySelector('#app').classList.contains('hidden')));
check('les trois scripts d\'Admin v2 sont bien rattachés par construire.sh',
  await p.evaluate(()=>typeof openBooking==='function'),
  'sans eux la suite éprouverait une page vide');

/* On ouvre la réservation et on appuie sur « Attribuer », comme Barbaros. */
await ouvrirAttribution(p, 'ELA-26-09-0001');

/* ---------------------------------------------------------------------
   1. LE SÉLECTEUR D'ATTRIBUTION — le cœur du défaut
   --------------------------------------------------------------------- */
const attribuables = await p.evaluate(()=>[...document.querySelectorAll('#driverChoice option')]
  .map(o=>o.textContent.split(' — ')[0].trim()));

check('un chauffeur dont un papier est EXPIRÉ sort de la liste d\'attribution',
  !attribuables.includes('Ayse'),
  'reçu : '+JSON.stringify(attribuables));
check('…alors que son « statut » dit encore « valide » — c\'est tout le défaut',
  CHAUFFEURS.find(d=>d.nom_affiche==='Ayse').statut==='valide' && !attribuables.includes('Ayse'));
check('un chauffeur à jour reste attribuable', attribuables.includes('Mehmet'));
check('un papier qui expire BIENTÔT ne bloque pas — il reste le temps d\'agir',
  attribuables.includes('Karim'));
check('des papiers NON RENSEIGNÉS ne bloquent pas non plus : on ne sait pas, on n\'invente pas',
  attribuables.includes('Luis'));

/* La falsification de l'ancien code : il filtrait sur « statut === valide »,
   donc les quatre passaient. Si ce contrôle-ci voit quatre noms, c'est que
   le sélecteur est revenu lire le champ posé à la main. */
check('le sélecteur ne lit PLUS le champ posé à la main (4 chauffeurs « valide », 3 attribuables)',
  attribuables.length===3, 'reçu : '+attribuables.length);

/* ---------------------------------------------------------------------
   2. L'AVERTISSEMENT À L'INSTANT DE L'ATTRIBUTION
   --------------------------------------------------------------------- */
const avert = async id => p.evaluate(i=>{
  const s=document.querySelector('#driverChoice'); s.value=i; s.dispatchEvent(new Event('change'));
  const z=document.querySelector('#driverPapiers');
  return { texte:z.textContent.trim(), classe:z.className };
}, id);

check('le sélecteur s\'ouvre et porte la zone d\'avertissement',
  await p.evaluate(()=>!!document.querySelector('#driverPapiers')));

const aM = await avert('d1'), aK = await avert('d3'), aL = await avert('d4');
check('papiers à jour : message vert', aM.classe.includes('vert') && /jour/i.test(aM.texte));
check('papiers bientôt expirés : message ORANGE qui dit dans combien de jours',
  aK.classe.includes('orange') && /12/.test(aK.texte), 'reçu : '+aK.texte);
check('papiers non renseignés : message ROUGE', aL.classe.includes('rouge'), 'reçu : '+aL.texte);
check('les trois messages sont DIFFÉRENTS — ils appellent trois gestes différents',
  new Set([aM.texte,aK.texte,aL.texte]).size===3);

/* ---------------------------------------------------------------------
   3. LA FICHE CHAUFFEUR
   --------------------------------------------------------------------- */
await p.evaluate(()=>{document.querySelector('#closeSheet').click();
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('on'));
  document.querySelector('#s-drivers').classList.add('on');});
const fiches = await p.evaluate(()=>[...document.querySelectorAll('#drivers .card')]
  .map(c=>({ nom:c.querySelector('strong').textContent.trim(),
             tag:c.querySelector('.tag').textContent.trim(),
             cls:c.querySelector('.tag').className })));
const f = n => fiches.find(x=>x.nom===n) || {tag:'',cls:''};

check('la fiche d\'un chauffeur aux papiers expirés le DIT', /expir/i.test(f('Ayse').tag),
  'reçu : '+f('Ayse').tag);
check('la fiche d\'un chauffeur sans dates le dit AUTREMENT',
  /renseign/i.test(f('Luis').tag), 'reçu : '+f('Luis').tag);
check('mais les deux sont au ROUGE — un papier absent ne prouve pas plus qu\'un papier expiré',
  f('Ayse').cls.includes('bloque') && f('Luis').cls.includes('bloque'));
check('un papier qui expire bientôt affiche le nombre de jours', /12/.test(f('Karim').tag),
  'reçu : '+f('Karim').tag);
check('un chauffeur à jour ne crie pas', /jour/i.test(f('Mehmet').tag) && !f('Mehmet').cls.includes('bloque'));

/* ---------------------------------------------------------------------
   4. LE FORMULAIRE COLLECTE ENFIN LES DATES
   --------------------------------------------------------------------- */
await p.evaluate(()=>editDriver('d1'));
await p.waitForSelector('[name=carte_vtc_fin]', {timeout:15000});
for(const champ of ['carte_vtc_fin','registre_fin','assurance_fin'])
  check('le formulaire porte le champ « '+champ+' »',
    await p.evaluate(c=>{const e=document.querySelector(`[name=${c}]`);return !!e && e.type==='date';}, champ));
check('la date déjà connue est réaffichée dans le champ',
  await p.evaluate(()=>document.querySelector('[name=carte_vtc_fin]').value.length===10));
check('« À renouveler » a quitté le menu : c\'est désormais calculé, pas choisi',
  await p.evaluate(()=>![...document.querySelectorAll('[name=statut] option')]
    .some(o=>o.value==='a_renouveler')));

/* Un champ date vide doit partir en NULL. Envoyé en chaîne vide, Postgres
   refuse la colonne date et la fiche ne s'enregistre plus DU TOUT. */
await p.evaluate(()=>{ document.querySelector('[name=assurance_fin]').value='';
  document.querySelector('#entityForm').dispatchEvent(new Event('submit',{cancelable:true})); });
for(let i=0; i<100 && envoye===null; i++) await p.waitForTimeout(100);
check('un champ date vidé part en NULL, jamais en chaîne vide',
  envoye !== null && envoye.assurance_fin === null,
  'reçu : '+JSON.stringify(envoye && envoye.assurance_fin));

/* ---------------------------------------------------------------------
   5. LA FILE D'ACTIONS
   --------------------------------------------------------------------- */
const action = await p.evaluate(()=>{const c=document.querySelector('#actions .card');
  return c ? c.textContent : '';});
check('la file d\'actions montre les papiers à régulariser en toutes lettres',
  /Papiers à régulariser/.test(action), 'reçu : '+action.slice(0,80));
check('…et nomme le chauffeur concerné, sinon il faut le chercher',
  /Ayse/.test(action));

/* LE PIÈGE ÉVITÉ : les métriques comptent les actions dont le TYPE contient
   « chauffeur ». Un type nommé « papiers_chauffeur » aurait gonflé « Sans
   chauffeur » sans que rien ne le signale. */
check('le type d\'action ne contient pas « chauffeur » — la métrique s\'en serait gonflée',
  !ACTIONS[0].type_action.includes('chauffeur'));
const sansChauffeur = await p.evaluate(()=>[...document.querySelectorAll('#metrics .card')]
  .filter(c=>/Sans chauffeur/.test(c.textContent)).map(c=>c.querySelector('strong').textContent)[0]);
check('« Sans chauffeur » reste à 0 malgré une action papiers ouverte',
  sansChauffeur==='0', 'reçu : '+sansChauffeur);

/* ---------------------------------------------------------------------
   6. LA MIGRATION — ce qui ne se voit pas à l'écran
   --------------------------------------------------------------------- */
const sql = readFileSync('supabase/migrations/20260916140000_chauffeurs_papiers.sql','utf8');
check('la vue est en security_invoker — sinon elle contourne la RLS de la table',
  /create or replace view public\.chauffeurs_etat\s*\n\s*with \(security_invoker = true\)/.test(sql));
check('l\'index unique des actions chauffeur existe',
  /create unique index if not exists actions_requises_chauffeur_ouverte/.test(sql),
  'sans lui, deux NULL sont distincts et la file se remplit de doublons');
check('les trois dates sont des colonnes, pas un jsonb : une colonne se compare et s\'indexe',
  /add column if not exists carte_vtc_fin\s+date/.test(sql)
  && /add column if not exists registre_fin\s+date/.test(sql)
  && /add column if not exists assurance_fin\s+date/.test(sql));
check('le jour se compte à Paris, pas en UTC — un papier expire à minuit ici',
  (sql.match(/at time zone 'Europe\/Paris'/g)||[]).length >= 3);
check('l\'alerte est à 30 jours, comme le carnet du site',
  /ela_jours_alerte_papiers[\s\S]{0,120}select 30/.test(sql));
check('les trois inserts d\'actions existants sont conservés',
  (sql.match(/insert into public\.actions_requises/g)||[]).length===4,
  'la fonction est remplacée en entier : en oublier un les supprimerait');

/* ---------------------------------------------------------------------
   7. LA MIGRATION N'EST PAS ENCORE APPLIQUÉE — le carnet ne doit pas se vider
   ---------------------------------------------------------------------
   Les migrations s'appliquent À LA MAIN dans Supabase, le site se déploie
   tout seul. Entre les deux, la vue « chauffeurs_etat » n'existe pas. Sans
   repli, la lecture échoue, state.drivers vaut [] et PLUS AUCUN chauffeur
   n'est attribuable — sans le moindre message à l'écran. */
const ctx2 = await b.newContext({ viewport:{width:390,height:844}, locale:'fr-FR' });
await ctx2.route('**/*', r => faireServeur(r, (r, u, J) => {
  if(u.includes('/rpc/est_exploitant')) return J(true);
  if(u.includes('/rpc/')) return J(0);
  /* La vue n'existe pas : Postgrest répond 404. */
  if(u.includes('/chauffeurs_etat'))
    return r.fulfill({status:404, contentType:'application/json', body:'{"message":"relation does not exist"}'});
  if(u.includes('/rest/v1/chauffeurs'))
    return J(CHAUFFEURS.map(({papiers_etat,papiers_jours,etat_effectif,attribuable,...d})=>d));
  if(u.includes('/rest/v1/courses')) return J(COURSES);
  return J([]);
}));
await ctx2.addInitScript(() => sessionStorage.setItem('ela_admin_session',
  JSON.stringify({access_token:'t', user:{email:'e'}})));
const p2 = await ctx2.newPage();
await p2.goto(BASE+'/admin-v2.html', {waitUntil:'domcontentloaded'});
await p2.waitForFunction(()=>typeof openBooking==='function'
  && state.drivers.length>0 && state.courses.length>0, null, {timeout:20000});

check('sans la vue, le carnet retombe sur la table et n\'est PAS vide',
  await p2.evaluate(()=>state.drivers.length)===4,
  'sinon plus aucun chauffeur n\'est attribuable entre le déploiement et la migration');
await ouvrirAttribution(p2, 'ELA-26-09-0001');
check('sans la vue, on peut encore attribuer — dégradé, jamais à l\'arrêt',
  (await p2.evaluate(()=>document.querySelectorAll('#driverChoice option').length)) > 0);
check('sans la vue, la fiche n\'annonce PAS « À jour » : on ne sait pas, on n\'affirme pas',
  !(await p2.evaluate(()=>{const c=document.querySelector('#drivers .card');
    return c ? /à jour/i.test(c.querySelector('.tag').textContent) : false;})));
await ctx2.close();

/* ---------------------------------------------------------------------
   8. LE BANDEAU COLLANT NE MANGE PAS L'ÉCRAN
   ---------------------------------------------------------------------
   Il est là sur TOUS les écrans et il ne défile jamais : chaque pixel s'y
   paie vingt fois par jour. « Activer les notifications » et « Déconnexion »
   ne tenaient pas côte à côte et s'empilaient — mesuré 130 px à 390 px et
   152 px à 320 px, soit 15 à 18 % de la hauteur, en permanence.
   Le contrôle MESURE une hauteur ; relire le CSS ne dirait pas si ça passe
   à la ligne. Et il éprouve les DEUX largeurs, parce que le repliement
   n'apparaît qu'en dessous d'un certain espace. */
for (const largeur of [320, 390, 1280]) {
  const ctx3 = await b.newContext({ viewport:{width:largeur, height:largeur>=900?800:844}, locale:'fr-FR' });
  await ctx3.route('**/*', r => faireServeur(r, (r, u, J) => {
    if(u.includes('/rpc/est_exploitant')) return J(true);
    if(u.includes('/rpc/')) return J(0);
    if(u.includes('/chauffeurs_etat')) return J(CHAUFFEURS);
    if(u.includes('/rest/v1/courses')) return J(COURSES);
    return J([]);
  }));
  await ctx3.addInitScript(() => sessionStorage.setItem('ela_admin_session',
    JSON.stringify({access_token:'t', user:{email:'contact@elatransfer.com'}})));
  const p3 = await ctx3.newPage();
  await p3.goto(BASE+'/admin-v2.html', {waitUntil:'domcontentloaded'});
  await p3.waitForFunction(()=>typeof state!=='undefined'
    && document.querySelector('#elaPush'), null, {timeout:20000});

  const h = await p3.evaluate(()=>Math.round(document.querySelector('.top').getBoundingClientRect().height));
  check(`à ${largeur} px, le bandeau collant tient sur une rangée (≤ 80 px)`,
    h <= 80, 'mesuré : '+h+' px');

  /* Le bouton ne doit pas avoir simplement disparu : un réglage introuvable
     est pire qu'un bandeau trop haut. Et 44 px est la mesure d'un pouce. */
  const bt = await p3.evaluate(()=>{
    const e=document.querySelector('#elaPush'), z=document.querySelector('#zonePush');
    if(!e) return null;
    const r=e.getBoundingClientRect();
    return {dansBord: !!(z && z.contains(e)), h:Math.round(r.height),
            dansEntete: !!e.closest('.top')};
  });
  check(`à ${largeur} px, « activer les notifications » existe toujours`,
    bt !== null);
  check(`à ${largeur} px, il a quitté le bandeau pour le tableau de bord`,
    bt && bt.dansBord && !bt.dansEntete);
  check(`à ${largeur} px, il reste pressable au pouce (≥ 40 px)`,
    bt && bt.h >= 40, bt ? 'mesuré : '+bt.h+' px' : '');

  /* Présent dans le DOM ne veut pas dire atteignable : ce projet a déjà payé
     un bouton parfaitement là et mangé par la barre du bas. On l'amène à
     l'écran et on demande QUI reçoit le doigt en son centre. */
  await p3.evaluate(()=>document.querySelector('#elaPush').scrollIntoView({block:'center'}));
  await p3.waitForTimeout(250);
  const recoit = await p3.evaluate(()=>{
    const e=document.querySelector('#elaPush'), r=e.getBoundingClientRect();
    const au=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2);
    return au ? (au.id || au.tagName) : 'rien';
  });
  check(`à ${largeur} px, c'est bien LUI qui reçoit le doigt`,
    recoit === 'elaPush', 'reçoit : '+recoit);

  /* L'adresse e-mail ne dit rien à quelqu'un qui est seul à se connecter, et
     c'est elle qui faisait passer la rangée à la ligne. Au-delà de 900 px la
     place ne manque pas : elle revient. */
  const mail = await p3.evaluate(()=>{
    const w=document.querySelector('#who');
    return {affiche:getComputedStyle(w).display!=='none', texte:w.textContent.trim()};
  });
  check(`à ${largeur} px, l'adresse e-mail est ${largeur>=900?'affichée':'masquée'}`,
    mail.affiche === (largeur >= 900));

  /* Le logo officiel reste le même asset ; seul son conteneur change selon
     la largeur afin d'occuper la sidebar sur ordinateur. */
  const logo = await p3.evaluate(()=>{
    const i=document.querySelector('img[src="brand-logo.webp"]');
    if(!i) return null;
    const r=i.getBoundingClientRect();
    const au=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2);
    return {src:i.getAttribute('src'), w:Math.round(r.width), degage: au===i,
      dansSidebar:!!i.closest('#nav'), dansEntete:!!i.closest('.top')};
  });
  check(`à ${largeur} px, le logo officiel est intact et dégagé`,
    logo && logo.src === 'brand-logo.webp' && logo.degage
      && logo.w === (largeur>=900?112:100)
      && (largeur>=900 ? logo.dansSidebar : logo.dansEntete),
    JSON.stringify(logo));

  check(`à ${largeur} px, aucun débordement horizontal`,
    await p3.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth));
  await ctx3.close();
}

await b.close(); serveur.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
