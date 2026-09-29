/* =====================================================================
   TEST-ADMIN-COMMISSION.MJS — commission par course, et graphique chauffeurs
   ---------------------------------------------------------------------
   29 septembre 2026, Barbaros : « un système de commission indiqué en
   pourcentage et/ou en euros sur chaque course, ou sur l'ensemble des
   courses revendues aux chauffeurs », et « un graphique des courses
   réalisées par les chauffeurs ».

   CE QU'ON ÉPROUVE, SUR LE SITE CONSTRUIT :
   - sans rien saisir, le taux du CARNET s'applique (aucune saisie de plus) ;
   - un % posé sur la course l'emporte, et le montant est juste ;
   - des euros fixes l'emportent aussi, sans jamais dépasser le prix ;
   - la commission saisie est ENREGISTRÉE sur la course (on la retrouve) ;
   - le registre additionne la commission par chauffeur ;
   - le graphique classe les chauffeurs par nombre de courses.
   Les montants attendus sont calculés À LA MAIN ici, jamais relus à l'écran.

   Lancer :  node test-admin-commission.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';

execSync('sh construire.sh', {stdio:'ignore'});
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript',
  '.json':'application/json','.webmanifest':'application/manifest+json',
  '.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const serveur = createServer(async (req, res) => {
  try {
    let chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, {'Content-Type': TYPES[extname(f)] || 'application/octet-stream'});
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8095, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8095';
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const J = (b, s=200) => ({status:s, contentType:'application/json', body:JSON.stringify(b)});

/* Des courses de CETTE semaine : le graphique regarde la période en cours. */
const auj = new Date(); const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const jour = iso(auj);
const course = (ref, prix, ch, statut='realisee', commission) => ({ ref, statut, cree:new Date().toISOString(),
  course:{ depart:'Place Vendôme, 75001 Paris', arrivee:'Orly', date:jour, heure:'00:05',
           vehicule:'Berline', vehiculeCle:'berline', passagers:'2' },
  client:{ nom:'Client '+ref, telephone:'0612345678' }, prix:{ total:prix },
  chauffeur:{ nom:ch, telephone: ch === 'Mehmet' ? '0600000001' : '0600000002' },
  ...(commission ? { commission } : {}) });
const COURSES = [
  course('ELA-26-09-0001', 100, 'Mehmet'),                                  // carnet 20 % → 20
  course('ELA-26-09-0002',  60, 'Mehmet', 'realisee', {mode:'pct', valeur:25}),  // 15
  course('ELA-26-09-0003',  80, 'Mehmet', 'realisee', {mode:'eur', valeur:12}),  // 12
  course('ELA-26-09-0004',  50, 'Ali'),                                     // carnet 10 % → 5
  course('ELA-26-09-0005',  40, 'Ali', 'confirmee'),                        // pas réalisée
];
const CARNET = [
  { id:'c1', nom:'Mehmet', telephone:'0600000001', taux:20 },
  { id:'c2', nom:'Ali',    telephone:'0600000002', taux:10 } ];

const nav = await chromium.launch();
const ctx = await nav.newContext({viewport:{width:390,height:844}, locale:'fr-FR'});
await ctx.addInitScript(([c, ch]) => {
  localStorage.setItem('ela_nuage_session', JSON.stringify({access_token:'JETON', refresh_token:'R'}));
  if(!sessionStorage.getItem('pose')){ sessionStorage.setItem('pose','1');
    localStorage.setItem('ela_bookings', JSON.stringify(c));
    localStorage.setItem('ela_chauffeurs', JSON.stringify(ch)); }
}, [COURSES, CARNET]);
const p = await ctx.newPage();
const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
await p.route('**/*', async route => {
  const u = route.request().url();
  if (u.startsWith(BASE)) return route.continue();
  if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
  if (u.includes('supabase.co')) return route.fulfill(J(u.includes('/rest/v1/courses') ? COURSES.map(bon => ({bon, statut:bon.statut})) : []));
  return route.abort();
});
await p.goto(BASE + '/admin.html');
await p.waitForFunction(() => document.body.classList.contains('espace'), null, {timeout:10000});

const texteCalc = async ref => {
  /* « ?ref= » ouvre le bon, comme le lien d'une alerte Telegram. */
  await p.goto(BASE + '/admin.html?ref=' + ref);
  await p.waitForFunction(r => { const e = document.getElementById('ecran-bord-bon');
    return e && getComputedStyle(e).display !== 'none' && document.getElementById('bbRef').textContent === r; }, ref, {timeout:10000});
  return p.textContent('#bbComCalc');
};

/* ─── 1. Le bon : trois façons de compter ─── */
let t = await texteCalc('ELA-26-09-0001');
check('sans saisie : taux du carnet (20 % de 100 € = 20 €)', /20,00\s€/.test(t) && /carnet/.test(t), t);
check('sans saisie : le reste au chauffeur est dit (80 €)', /80,00\s€/.test(t), t);
t = await texteCalc('ELA-26-09-0002');
check('25 % posé sur la course : 15 €', /15,00\s€/.test(t) && !/carnet/.test(t), t);
t = await texteCalc('ELA-26-09-0003');
check('12 € fixes posés sur la course', /12,00\s€/.test(t) && /68,00\s€/.test(t), t);

/* ─── 2. Saisir une commission et la retrouver ─── */
await texteCalc('ELA-26-09-0004');
await p.selectOption('#bbComMode', 'eur');
await p.fill('#bbComValeur', '999');
t = await p.textContent('#bbComCalc');
check('des euros fixes ne dépassent jamais le prix (50 €)', /Commission : 50,00\s€/.test(t), t);
await p.fill('#bbComValeur', '7,5');
await p.click('#btnRetourBord');
const garde = await p.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings')).find(c => c.ref === 'ELA-26-09-0004').commission);
check('la commission saisie est enregistrée sur la course', garde && garde.mode === 'eur' && garde.valeur === 7.5, JSON.stringify(garde));

/* ─── 3. Le registre et son graphique ─── */
await p.click('#btnRegistre');
await p.waitForSelector('#regGraphChauffeurs .gc-ligne', {timeout:5000}).catch(()=>{});
const noms = await p.$$eval('#regGraphChauffeurs .gc-tete b', l => l.map(x => x.textContent));
check('graphique : classé par nombre de courses (Mehmet puis Ali)', noms.join(',') === 'Mehmet,Ali', noms.join(','));
const details = await p.$$eval('#regGraphChauffeurs .gc-detail', l => l.map(x => x.textContent));
check('graphique : commission de Mehmet = 20 + 15 + 12 = 47 €', /47,00\s€/.test(details[0] || ''), details[0]);
check('graphique : Ali ne compte que sa course réalisée, 7,50 € saisis', /7,50\s€/.test(details[1] || ''), details[1]);
const largeurs = await p.$$eval('#regGraphChauffeurs .gc-barre i', l => l.map(x => x.style.width));
check('graphique : la barre la plus longue est la plus fournie', largeurs[0] === '100%' && parseInt(largeurs[1]) < 100, largeurs.join(','));
const tableau = await p.textContent('#regChauffeurs');
check('le tableau des chauffeurs porte la commission', /commission 47,00\s€/.test(tableau), tableau.slice(0,120));
check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));

/* ─── 4. L'agent de réservation : il traite les courses, il ne voit aucun
   chiffre. On éprouve AUSSI que ce qu'il ne voit pas n'est pas effacé quand
   il enregistre : une commission cachée qui partirait à zéro serait pire
   qu'une commission visible. ─── */
const ctxA = await nav.newContext({viewport:{width:390,height:844}, locale:'fr-FR'});
await ctxA.addInitScript(([c, ch]) => {
  localStorage.setItem('ela_nuage_session', JSON.stringify({access_token:'JETON', refresh_token:'R'}));
  if(!sessionStorage.getItem('pose')){ sessionStorage.setItem('pose','1');
    localStorage.setItem('ela_bookings', JSON.stringify(c));
    localStorage.setItem('ela_chauffeurs', JSON.stringify(ch)); }
}, [COURSES, CARNET]);
const a = await ctxA.newPage();
const errA = []; a.on('pageerror', e => errA.push(e.message));
await a.route('**/*', async route => {
  const u = route.request().url();
  if (u.startsWith(BASE)) return route.continue();
  if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
  if (u.includes('/rpc/role_operateur')) return route.fulfill(J('agent_reservation'));
  if (u.includes('supabase.co')) return route.fulfill(J(u.includes('/rest/v1/courses') ? COURSES.map(bon => ({bon, statut:bon.statut})) : []));
  return route.abort();
});
await a.goto(BASE + '/admin.html?ref=ELA-26-09-0002');
await a.waitForFunction(() => document.body.classList.contains('role-agent_reservation')
  && document.getElementById('bbRef').textContent === 'ELA-26-09-0002', null, {timeout:10000}).catch(()=>{});
const vu = async sel => a.evaluate(s => { const e = document.querySelector(s);
  return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel);
check('agent : le bon s\'ouvre (il traite les courses)', await vu('#ecran-bord-bon'));
check('agent : la commission du bon est cachée', !(await vu('#blocCommission')));
check('agent : le registre et les factures sont hors de portée', !(await vu('#btnRegistre')) && !(await vu('#btnFactures')));
await a.click('#btnRetourBord');
const reste = await a.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings')).find(c => c.ref === 'ELA-26-09-0002').commission);
check('agent : enregistrer le bon ne touche pas la commission cachée (25 %)', reste && reste.mode === 'pct' && reste.valeur === 25, JSON.stringify(reste));
await a.evaluate(() => document.getElementById('btnChauffeurs').click());
await a.waitForTimeout(300);
check('agent : le carnet reste ouvert, sans le taux de commission', (await vu('#ecran-chauffeurs')) && !(await vu('label[for="chTaux"]')));
check('agent : aucune erreur JavaScript', errA.length === 0, errA.join(' | '));

/* ─── 5. Admin v2 montre les finances : il est fermé à l'agent. On éprouve
   les deux comptes — une porte qui refuserait tout le monde passerait le
   contrôle de l'agent sans rien prouver. ─── */
const ouvreV2 = async estAdmin => {
  const c = await nav.newContext({viewport:{width:390,height:844}, locale:'fr-FR'});
  await c.addInitScript(() => sessionStorage.setItem('ela_admin_session', JSON.stringify({access_token:'JETON', user:{email:'x@y.fr'}})));
  const v = await c.newPage();
  await v.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
    if (u.includes('/rpc/est_admin')) return route.fulfill(J(estAdmin));
    if (u.includes('supabase.co')) return route.fulfill(J([]));
    return route.abort();
  });
  await v.goto(BASE + '/admin-v2.html');
  await v.waitForTimeout(1500);
  const ouvert = await v.evaluate(() => !document.getElementById('app').classList.contains('hidden'));
  await c.close();
  return ouvert;
};
check('Admin v2 (les finances) reste fermé à l\'agent', (await ouvreV2(false)) === false);
check('Admin v2 s\'ouvre toujours pour l\'admin', (await ouvreV2(true)) === true);

await nav.close(); serveur.close();
console.log(`=== TEST ADMIN COMMISSION : ${ok.length} OK, ${ko.length} échec(s) ===`);
ok.forEach(x => console.log('  ✓ ' + x)); ko.forEach(x => console.log('  ✗ ' + x));
process.exit(ko.length ? 1 : 0);
