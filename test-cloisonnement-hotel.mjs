/* Cloisonnement durable des espaces Client hôtel et Réception hôtel.
   La suite construit exactement ce qui sera publié puis vérifie le DOM,
   les scripts chargés et le comportement anonyme des deux URL. */
import { chromium } from 'playwright';
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import net from 'node:net';

execFileSync('bash', ['construire.sh'], { stdio: 'pipe' });

const PORT = 8109;
const serveur = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'site'], {
  stdio: 'ignore',
});
const attendreServeur = () => new Promise((resolve, reject) => {
  let essais = 0;
  const tenter = () => {
    const socket = net.createConnection({ host: '127.0.0.1', port: PORT });
    socket.once('connect', () => { socket.end(); resolve(); });
    socket.once('error', () => {
      socket.destroy();
      if (++essais > 30) reject(new Error('serveur local indisponible'));
      else setTimeout(tenter, 100);
    });
  };
  tenter();
});

const ok = [], ko = [];
const check = (nom, condition, detail = '') =>
  (condition ? ok : ko).push(nom + (detail ? ' — ' + detail : ''));

let navigateur;
try {
  await attendreServeur();
  navigateur = await chromium.launch();
  const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 } });
  await contexte.route('**://*/**', (route) => {
    const url = route.request().url();
    if (url.startsWith(`http://127.0.0.1:${PORT}`)) return route.continue();
    return route.abort();
  });

  const client = await contexte.newPage();
  const erreursClient = [];
  const requetesClient = [];
  client.on('pageerror', (e) => erreursClient.push(e.message));
  client.on('request', (r) => requetesClient.push(r.url()));
  await client.goto(`http://127.0.0.1:${PORT}/application.html?h=easyhotel-aeroville&dest=orly`,
    { waitUntil: 'domcontentloaded' });
  await client.waitForTimeout(700);
  check('Client : le mode hôtel est actif',
    await client.evaluate(() => document.body.classList.contains('hotel')));
  check('Client : aucun DOM Réception/Admin/Chauffeurs/Facturation/Réglages',
    await client.locator('#ecran-reception,.admin-nav,#ecran-chauffeurs,#ecran-facture,#ecran-reglages').count() === 0);
  check('Client : aucun code Admin ou API Réception dans le document',
    !(await client.content()).includes('CODE_EXPLOITANT')
      && !(await client.content()).includes('coursesHotel: function'));
  check('Client : aucun script Admin chargé',
    await client.evaluate(() => Array.from(document.scripts).every((s) =>
      !/admin|intake-demande|qr-affiche/i.test(s.src || ''))));
  check('Client : aucune requête réseau Admin ou Réception',
    requetesClient.every((url) => !/courses-hotel|role_operateur|presences_operateurs|intake-demande|qr-affiche/i.test(url)),
    requetesClient.filter((url) => /courses-hotel|role_operateur|presences_operateurs|intake-demande|qr-affiche/i.test(url)).join(' | '));
  check('Client : aucune erreur JavaScript', erreursClient.length === 0, erreursClient.join(' | '));

  const reception = await contexte.newPage();
  const erreursReception = [];
  const requetesReception = [];
  reception.on('pageerror', (e) => erreursReception.push(e.message));
  reception.on('request', (r) => requetesReception.push(r.url()));
  await reception.route('**/functions/v1/courses-hotel', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{"refuse":true}' }));
  await reception.goto(`http://127.0.0.1:${PORT}/easyhotel-reception/?h=hotel-inconnu&reception=hotel-inconnu`,
    { waitUntil: 'domcontentloaded' });
  await reception.waitForTimeout(700);
  check('Réception : entrée dédiée et hôtel imposé par le document',
    await reception.locator('#recHotel').textContent() === 'easyHotel Aéroville');
  check('Réception : l’accès anonyme reste verrouillé',
    await reception.locator('#recVerrou').isVisible()
      && await reception.locator('#recCorps').isHidden()
      && await reception.locator('.rec-course').count() === 0);
  check('Réception : aucun DOM Admin/Chauffeurs/Facturation/Réglages',
    await reception.locator('.admin-nav,#ecran-chauffeurs,#ecran-facture,#ecran-reglages').count() === 0);
  check('Réception : aucun code Admin dans le document',
    !(await reception.content()).includes('CODE_EXPLOITANT'));
  check('Réception : aucun script Admin chargé',
    await reception.evaluate(() => Array.from(document.scripts).every((s) =>
      !/admin|intake-demande|qr-affiche/i.test(s.src || ''))));
  check('Réception : aucune requête réseau Admin',
    requetesReception.every((url) => !/role_operateur|presences_operateurs|intake-demande|qr-affiche/i.test(url)),
    requetesReception.filter((url) => /role_operateur|presences_operateurs|intake-demande|qr-affiche/i.test(url)).join(' | '));

  await reception.evaluate(() => sessionStorage.setItem('ela_session_reception',
    JSON.stringify({ 'easyhotel-aeroville': 'jeton-modifie.signature-fausse' })));
  await reception.reload({ waitUntil: 'domcontentloaded' });
  await reception.waitForTimeout(500);
  check('Réception : un jeton manipulé ne donne aucun accès',
    await reception.locator('#recVerrou').isVisible()
      && await reception.locator('#recCorps').isHidden());
  check('Réception : aucune erreur JavaScript', erreursReception.length === 0,
    erreursReception.join(' | '));

  const sourceClient = readFileSync('site/application.html', 'utf8');
  const sourceReception = readFileSync('site/easyhotel-reception/index.html', 'utf8');
  const sourceMonolithe = readFileSync('site/index.html', 'utf8');
  check('Build : les deux documents sont physiquement différents',
    sourceClient !== sourceReception);
  check('Build : les deux documents sont allégés face au monolithe',
    sourceClient.length < sourceMonolithe.length && sourceReception.length < sourceMonolithe.length,
    `${sourceClient.length}/${sourceReception.length}/${sourceMonolithe.length}`);
  check('Serveur : une réservation Réception exige un jeton signé',
    readFileSync('supabase/functions/deposer-course/index.ts', 'utf8')
      .includes('session réception refusée'));
} finally {
  if (navigateur) await navigateur.close();
  serveur.kill('SIGTERM');
}

console.log(`=== RÉUSSITES (${ok.length}) ===`);
ok.forEach((x) => console.log('✓ ' + x));
if (ko.length) {
  console.log(`\n=== ÉCHECS (${ko.length}) ===`);
  ko.forEach((x) => console.log('✗ ' + x));
  process.exitCode = 1;
}
