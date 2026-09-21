/* =====================================================================
   TEST-ADMIN-GESTES.MJS — accusé de réception et demande d'avis
   ---------------------------------------------------------------------
   CE QU'ILS ÉPROUVENT, ET CE QUE ÇA COÛTAIT :

   Le client appuie sur « Confirmer » et n'a plus AUCUNE nouvelle. Son bon
   dit bien « demande reçue » — mais il l'a fermé. Et après la course,
   personne ne lui demande jamais ce qu'il en a pensé.

   LES QUATRE CONTRÔLES QUI COMPTENT LE PLUS :

   1. CHAQUE GESTE N'EXISTE QUE DANS SON ÉTAT. L'accusé sur une course en
      ATTENTE — une fois confirmée, c'est « Prévenir le client » qui parle,
      et deux messages coup sur coup diraient au client qu'on ne sait pas
      où on en est. L'avis sur une RÉALISÉE — on ne demande pas à quelqu'un
      ce qu'il a pensé d'un trajet qu'il n'a pas fait.

   2. L'ACCUSÉ NE PROMET NI CHAUFFEUR NI VÉHICULE. On ne les connaît pas
      encore, et promettre une voiture qu'on n'a pas placée est le meilleur
      moyen de laisser quelqu'un sur un trottoir.

   3. SANS LIEN D'AVIS, RIEN NE PART. Le message se terminerait dans le
      vide. On emmène au champ plutôt que d'envoyer une phrase inachevée.

   4. LE MESSAGE SUIT LA LANGUE DU BON, et la date avec lui. Écrire en
      français à quelqu'un qui a réservé en anglais, c'est un message qu'il
      ne lira pas.

   Lancer :  node test-admin-gestes.mjs   (elle construit et sert elle-même)
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';

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
await new Promise(r => serveur.listen(8097, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8097';
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));

/* Quatre courses : une en attente (française), une réalisée (anglaise), une
   confirmée — pour laquelle AUCUN des deux gestes n'a de sens — et une en
   attente sans numéro utilisable. */
const COURSES = [
  {ref:'ELA-26-09-1001', statut:'attente', bon:{
    course:{date:'2026-09-20', heure:'07:30', depart:'10 rue de la Paix, Paris',
            arrivee:'Terminal 2E — Roissy', vehicule:'Berline'},
    client:{nom:'Jean Martin', telephone:'06 12 34 56 78'}, langue:'fr',
    prix:{total:95}}},
  {ref:'ELA-26-09-1002', statut:'realisee', bon:{
    course:{date:'2026-09-10', heure:'09:00', depart:'Orly', arrivee:'Melun'},
    client:{nom:'Maria Lopez', telephone:'07 11 22 33 44'}, langue:'en',
    prix:{total:60}}},
  {ref:'ELA-26-09-1003', statut:'confirmee', bon:{
    course:{date:'2026-09-22', heure:'06:00', depart:'Paris', arrivee:'Orly'},
    client:{nom:'Paul Petit', telephone:'06 55 44 33 22'}, langue:'fr',
    chauffeur:{nom:'Mehmet', telephone:'0612345678'}, prix:{total:80}}},
  {ref:'ELA-26-09-1004', statut:'attente', bon:{
    course:{date:'2026-09-25', heure:'08:00', depart:'Gare du Nord', arrivee:'CDG'},
    client:{nom:'Sans Numero', telephone:''}, langue:'fr', prix:{total:70}}},
];
let PARAMS = [];                /* pas de lien d'avis au départ — c'est le cas réel */
const marques = [];             /* ce qui part vraiment vers le serveur */
const ouvertures = [];          /* les URL WhatsApp réellement ouvertes */

/* ═══ LA NAVIGATION EST PASSÉE À TROIS ONGLETS ═══
   Accueil (« À traiter »), Courses, Gestion. Les cinq autres écrans n'ont
   pas disparu : ils vivent sous « Gestion », qui est une PORTE et non une
   copie. Un test doit donc emprunter le CHEMIN RÉEL de l'utilisateur —
   Gestion, puis l'entrée — au lieu de cliquer un onglet qui n'est plus
   dans la barre. C'est la même leçon que « un écran qu'aucun lien n'ouvre
   n'est pas accessible » : ce qu'on éprouve, c'est le chemin. */
async function allerOnglet(p, cle){
  const direct = p.locator(`#nav button[data-tab="${cle}"]`);
  if(await direct.count()){ await direct.click(); await p.waitForTimeout(150); return; }
  await p.click('#nav button[data-tab="gestion"]');
  await p.waitForSelector(`#s-gestion [data-tab="${cle}"]`, {state:'visible', timeout:10000});
  await p.click(`#s-gestion [data-tab="${cle}"]`);
  await p.waitForTimeout(150);
}

const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'fr-FR' });

await ctx.route('**/*', r => {
  const u = r.request().url();
  if(u.startsWith(BASE)) return r.continue();
  if(u.startsWith('https://wa.me/')) return r.abort();   /* jamais joint */
  if(!u.includes('supabase.co')) return r.abort();
  const J = o => r.fulfill({contentType:'application/json', body:JSON.stringify(o)});

  if(u.includes('/rpc/ela_marquer_geste_client')){
    const c = JSON.parse(r.request().postData()||'{}');
    marques.push(c);
    /* LE FAUX SERVEUR IMPOSE LA MÊME RÈGLE D'ÉTAT QUE LE VRAI : sinon
       l'écran serait éprouvé contre une politesse, pas contre la règle. */
    const co = COURSES.find(x => x.ref === c.p_ref);
    const attendu = c.p_geste === 'accuse' ? 'attente' : 'realisee';
    if(!co || co.statut !== attendu)
      return r.fulfill({status:400, contentType:'application/json',
        body:JSON.stringify({message:'geste_hors_etat:'+c.p_geste+':'+(co?co.statut:'?')})});
    co.bon[c.p_geste === 'accuse' ? 'accuse' : 'avisDemande'] = new Date().toISOString();
    return J({ref:c.p_ref, geste:c.p_geste});
  }
  if(u.includes('/rest/v1/parametres_commerciaux')){
    if(r.request().method() === 'POST'){
      const c = JSON.parse(r.request().postData()||'{}');
      PARAMS = PARAMS.filter(x => x.cle !== c.cle).concat([c]);
      return r.fulfill({status:201, contentType:'application/json', body:'[]'});
    }
    return J(PARAMS);
  }
  if(u.includes('/evenements_reservation')) return J([]);
  if(u.includes('/rpc/est_exploitant')) return J(true);
  if(u.includes('/rpc/ela_rafraichir_actions')) return J(0);
  if(u.includes('/chauffeurs_etat')) return J([]);
  if(u.includes('/rest/v1/chauffeurs')) return J([]);
  if(u.includes('/actions_requises')) return J([]);
  if(u.includes('/rest/v1/courses')) return J(COURSES);
  return J([]);
});

/* ON INTERCEPTE « window.open » : c'est le seul moyen de LIRE le message qui
   part. Vérifier seulement que le bouton existe laisserait passer un bouton
   mort — ou pire, un message qui promet une voiture. */
await ctx.addInitScript(() => {
  sessionStorage.setItem('ela_admin_session', JSON.stringify({
    access_token:'jeton-de-test', refresh_token:'r', user:{ email:'exploitant@test' } }));
  window.__wa = [];
  window.open = (u) => { window.__wa.push(String(u)); return null; };
});

const p = await ctx.newPage();
const ouvrirOnglet = async onglet => {
  const menu = p.locator('.mobile-menu');
  if(await menu.isVisible()){
    await menu.click();
    await p.waitForFunction(()=>document.querySelector('#nav')?.classList.contains('mobile-open'));
  }
  await p.click(`[data-tab="${onglet}"]`);
};
const errs=[]; p.on('pageerror', e=>errs.push(e.message));
await p.goto(BASE+'/admin-v2.html', {waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof openBooking==='function'
  && (state.courses||[]).length >= 4, null, {timeout:20000});

const wa = () => p.evaluate(() => window.__wa.slice());
/* LA FEUILLE DU BON EST MODALE — « position:fixed; inset:0 » — et couvre donc
   la barre de navigation. Ce n'est pas un défaut : c'est ce qui fait qu'on ne
   clique pas derrière par accident. Un vrai doigt la ferme avant d'aller
   ailleurs, et le test doit faire pareil. (Trouvé en mesurant : le bouton et
   son écriteau ne se chevauchent pas — 693–737 contre 753–788 — c'est la
   feuille entière qui interceptait le clic sur l'onglet.) */
const fermerFeuille = async () => {
  if(await p.locator('#sheet:not(.hidden)').count()) await p.click('#closeSheet');
  await p.waitForTimeout(120);
};
const decode = u => decodeURIComponent(String(u).split('?text=')[1] || '');

/* ══════════ 1. L'ACCUSÉ, SUR UNE COURSE EN ATTENTE ══════════ */
await p.evaluate(() => openBooking('ELA-26-09-1001'));
await p.waitForTimeout(400);
check("« Accuser réception » apparaît sur une course en attente",
  await p.locator('#btnAccuse').count() === 1);
check("« Demander un avis » n'apparaît PAS sur une course en attente",
  await p.locator('#btnAvis').count() === 0,
  "on ne demande pas ce qu'on a pensé d'un trajet qu'on n'a pas fait");

await p.click('#btnAccuse');
await p.waitForTimeout(400);
const m1 = await wa();
check("un message WhatsApp part vraiment", m1.length === 1, m1.length + ' ouverture(s)');

if(m1.length){
  const t = decode(m1[0]);
  check("il part sur le numéro du client, au format international",
    m1[0].startsWith('https://wa.me/33612345678?'), m1[0].split('?')[0]);
  check("il porte la référence", t.includes('ELA-26-09-1001'), t.slice(0,120));
  check("il porte le trajet", t.includes('10 rue de la Paix') && t.includes('Terminal 2E'));
  check("il porte la date et l'heure au format français",
    t.includes('20/09/2026') && t.includes('07:30'), t);
  /* LA PHRASE QUI COMPTE : elle remplace la promesse d'une place réservée. */
  check("il dit que la réservation sera ferme dès la confirmation",
    /ferme dès notre confirmation/i.test(t), t.slice(-160));
  /* NI CHAUFFEUR NI VÉHICULE — promettre une voiture qu'on n'a pas placée
     est le meilleur moyen de laisser quelqu'un sur un trottoir. */
  check("il ne nomme AUCUN chauffeur", !/chauffeur\s*:/i.test(t), t);
  check("il n'annonce AUCUN véhicule",
    !/berline|van|véhicule\s*:/i.test(t), t);
  check("il fait quatre lignes, pas un paragraphe",
    t.split('\n').length === 4, t.split('\n').length + ' ligne(s)');
  check("il tutoie le prénom du client, pas son nom complet",
    t.includes('Bonjour Jean,') && !t.includes('Jean Martin'), t.slice(0,60));
}
check("la marque part au serveur", marques.length === 1 &&
  marques[0].p_ref === 'ELA-26-09-1001' && marques[0].p_geste === 'accuse',
  JSON.stringify(marques[0]||{}));
check("le bouton dit qu'il a été envoyé",
  /envoyé/i.test(await p.textContent('#btnAccuse')), await p.textContent('#btnAccuse'));

/* ══════════ 2. AUCUN GESTE SUR UNE COURSE CONFIRMÉE ══════════
   Une fois confirmée, c'est « Prévenir le client » qui parle. Deux messages
   coup sur coup diraient au client qu'on ne sait pas où on en est. */
await p.evaluate(() => openBooking('ELA-26-09-1003'));
await p.waitForTimeout(400);
check("aucun accusé sur une course CONFIRMÉE",
  await p.locator('#btnAccuse').count() === 0,
  "c'est « Prévenir le client » qui parle à ce moment-là");
check("aucune demande d'avis sur une course confirmée",
  await p.locator('#btnAvis').count() === 0);

/* ══════════ 3. SANS NUMÉRO, AUCUN BOUTON — ET ON LE DIT ══════════ */
await p.evaluate(() => openBooking('ELA-26-09-1004'));
await p.waitForTimeout(400);
check("aucun bouton sur une course sans numéro utilisable",
  await p.locator('#btnAccuse').count() === 0,
  "un bouton qui n'envoie rien ferait croire que le client est prévenu");
const sansTel = await p.textContent('#bookingActions');
check("…et l'écriteau explique pourquoi",
  /aucun numéro/i.test(sansTel), sansTel.slice(0,160));

/* ══════════ 4. L'AVIS : SANS LIEN, RIEN NE PART ══════════ */
await p.evaluate(() => openBooking('ELA-26-09-1002'));
await p.waitForTimeout(400);
check("« Demander un avis » apparaît sur une course réalisée",
  await p.locator('#btnAvis').count() === 1);
check("aucun accusé sur une course réalisée",
  await p.locator('#btnAccuse').count() === 0);
const avantLien = await p.textContent('#bookingActions');
check("l'absence de lien d'avis est annoncée AVANT le clic",
  /lien d'avis/i.test(avantLien) && /Tarification/.test(avantLien), avantLien.slice(-200));

const avantClic = (await wa()).length;
await p.click('#btnAvis');
await p.waitForTimeout(400);
check("SANS LIEN, aucun message ne part", (await wa()).length === avantClic,
  "le message se terminerait dans le vide");
check("…et aucune marque n'est posée au serveur", marques.length === 1,
  marques.length + ' marque(s)');

/* ══════════ 5. ON ENREGISTRE LE LIEN, PUIS L'AVIS PART ══════════ */
await fermerFeuille();
await allerOnglet(p, 'pricing');
await p.waitForTimeout(250);
check("le champ du lien d'avis est dans « Tarification »",
  await p.locator('#avLien').count() === 1);

/* UNE ADRESSE INVALIDE EST REFUSÉE : un lien cassé envoyé à un client est
   pire qu'un lien absent — lui, au moins, ne se clique pas. */
await p.fill('#avLien', 'mon avis google');
await p.click('#btnAvLien');
await p.waitForTimeout(300);
check("un lien qui n'est pas une adresse web est refusé",
  /adresse web/i.test(await p.textContent('#avEtat')), await p.textContent('#avEtat'));
check("…et il n'est pas enregistré",
  !PARAMS.some(x => x.cle === 'lien_avis'), JSON.stringify(PARAMS));

await p.fill('#avLien', 'https://g.page/r/elatransfer/review');
await p.click('#btnAvLien');
await p.waitForFunction(() => {
  const e = document.getElementById('avEtat');
  return e && /enregistré/i.test(e.textContent);
}, null, {timeout:8000}).catch(()=>check("le lien d'avis s'enregistre", false, 'rien n’est venu'));
check("le lien d'avis part au serveur sous sa propre clé",
  PARAMS.some(x => x.cle === 'lien_avis'), JSON.stringify(PARAMS).slice(0,140));

await fermerFeuille();
await allerOnglet(p, 'bookings');
await p.evaluate(() => openBooking('ELA-26-09-1002'));
await p.waitForTimeout(400);
const avant2 = (await wa()).length;
await p.click('#btnAvis');
await p.waitForTimeout(400);
const m2 = await wa();
check("avec un lien, la demande d'avis part", m2.length === avant2 + 1,
  (m2.length - avant2) + ' ouverture(s)');

if(m2.length > avant2){
  const t = decode(m2[m2.length-1]);
  check("elle part sur le numéro du client", m2[m2.length-1].startsWith('https://wa.me/33711223344?'));
  check("elle porte le lien d'avis", t.includes('https://g.page/r/elatransfer/review'), t);
  /* LA LANGUE DU BON, PAS CELLE DE L'ESPACE EXPLOITANT — qui est toujours le
     français. Écrire en français à quelqu'un qui a réservé en anglais, c'est
     un message qu'il ne lira pas. */
  check("elle est EN ANGLAIS, comme le bon de cette cliente",
    t.startsWith('Hello Maria,') && /review/.test(t), t.slice(0,90));
  check("…et pas en français", !/Bonjour|avis nous aiderait/.test(t), t.slice(0,90));
  check("elle est courte — trois lignes, lisibles sur un écran verrouillé",
    t.split('\n').length === 3, t.split('\n').length + ' ligne(s)');
}
check("la marque d'avis part au serveur", marques.length === 2 &&
  marques[1].p_geste === 'avis' && marques[1].p_ref === 'ELA-26-09-1002',
  JSON.stringify(marques[1]||{}));

/* ══════════ 6. LA MARQUE SE VOIT AU RETOUR ══════════
   Sur dix demandes reçues la nuit, on ne se souvient pas de qui a eu une
   réponse : le bouton doit le dire quand on rouvre le bon. */
await p.evaluate(() => load().then(render));
await p.waitForTimeout(500);
await p.evaluate(() => openBooking('ELA-26-09-1002'));
await p.waitForTimeout(400);
check("rouvert, le bouton dit que l'avis a déjà été demandé",
  /déjà|relancer/i.test(await p.textContent('#btnAvis')), await p.textContent('#btnAvis'));

await p.evaluate(() => openBooking('ELA-26-09-1001'));
await p.waitForTimeout(400);
check("rouvert, le bouton dit que l'accusé a déjà été envoyé",
  /envoyé/i.test(await p.textContent('#btnAccuse')), await p.textContent('#btnAccuse'));

check('aucune erreur JavaScript sur toute la traversée', errs.length === 0, errs.join(' | '));

await b.close(); serveur.close();
if(ok.length) console.log('=== RÉUSSIS ('+ok.length+') ===\n' + ok.map(x=>'  ✔ '+x).join('\n'));
if(ko.length){ console.log('\n=== ÉCHECS ('+ko.length+') ===\n' + ko.map(x=>'  ✘ '+x).join('\n'));
  process.exit(1); }
console.log('\nGestes client Admin v2 : ' + ok.length + ' contrôles au vert.');
