// LE SERVEUR — ce qui fait passer le site de « page qui calcule » à
// « vraie page de réservation ».
//
// Sans identifiants Supabase, le site doit se comporter EXACTEMENT comme
// avant : c'est la première moitié de cette suite, et c'est le filet qui
// empêche une bascule silencieuse.
// Avec identifiants, la demande du client part toute seule et arrive chez
// l'exploitant. Comme il n'existe pas de compte réel ici, la page est
// réécrite au vol pour y poser des identifiants, et un faux Supabase répond
// à sa place — en imitant la Row Level Security, qui est la seule chose qui
// protège les données des clients.
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8099';
const errors = [];
const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));

const browser = await chromium.launch();

/* ============ SANS IDENTIFIANTS : RIEN NE CHANGE ============ */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => errors.push(String(e)));
  // Les identifiants sont désormais réels dans la page : pour éprouver le
  // comportement « sans serveur », on les efface au vol. C'est ce cas qui
  // doit rester intact — il protège le repli le jour où le serveur tombe.
  await page.route('**/*', async route => {
    const u = route.request().url();
    if (u === BASE + '/index.html' || u === BASE + '/') {
      const res = await route.fetch();
      const html = (await res.text())
        .replace(/const SUPABASE_URL = "[^"]*";/, 'const SUPABASE_URL = "";')
        .replace(/const SUPABASE_CLE = "[^"]*";/, 'const SUPABASE_CLE = "";');
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    }
    return u.startsWith(BASE) ? route.continue() : route.abort();
  });
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  check('sans identifiants, le nuage est inactif',
    (await page.evaluate(() => nuage.actif())) === false);
  check('le bloc serveur reste caché à l\'exploitant',
    await page.evaluate(() => document.getElementById('blocNuage').classList.contains('hidden')));
  check('le client garde ses trois moyens d\'envoi',
    !(await page.evaluate(() => document.getElementById('blocEnvoi').classList.contains('hidden'))));
  check('et ne voit pas « votre demande est parvenue »',
    await page.evaluate(() => document.getElementById('blocArrivee').classList.contains('hidden')));
  check('déposer sans identifiants échoue proprement, sans lever d\'erreur',
    (await page.evaluate(() => nuage.deposer({ ref: 'X' }))) === false);
  check('lister sans identifiants ne renvoie rien',
    (await page.evaluate(() => nuage.lister())) === null);
  await page.close();
}

/* ============ AVEC IDENTIFIANTS : LA VRAIE PAGE ============ */
const recu = { deposes: [], lecturesAnonymes: 0 };
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => errors.push(String(e)));

  await page.route('**/*', async route => {
    const u = route.request().url();

    if (u === BASE + '/index.html' || u === BASE + '/') {
      const res = await route.fetch();
      const html = (await res.text())
        .replace(/const SUPABASE_URL = "[^"]*";/, 'const SUPABASE_URL = "https://faux.supabase.co";')
        .replace(/const SUPABASE_CLE = "[^"]*";/, 'const SUPABASE_CLE = "cle-anon-de-test";');
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    }

    if (/faux\.supabase\.co/.test(u)) {
      const m = route.request().method();
      const corps = route.request().postData();
      if (u.includes('/auth/v1/token')) {
        const { email, password } = JSON.parse(corps || '{}');
        if (password !== 'bonmotdepasse')
          return route.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"invalid"}' });
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ access_token: 'jeton-test', user: { email } }) });
      }
      if (u.includes('/rest/v1/courses')) {
        const auth = route.request().headers()['authorization'] || '';
        if (m === 'POST') { recu.deposes.push(JSON.parse(corps)); return route.fulfill({ status: 201, body: '' }); }
        if (m === 'GET') {
          // C'est ici que se joue le RGPD : la Row Level Security de Supabase
          // refuse la lecture au rôle anonyme. On l'imite pour vérifier que la
          // page ne prétend jamais avoir lu quoi que ce soit sans jeton.
          // Pas de jeton d'exploitant : c'est la lecture anonyme, refusée par
          // la Row Level Security. On vérifie au passage que la page n'envoie
          // PAS la clé publique en Bearer — la nouvelle génération de clés
          // Supabase (sb_publishable_…) n'est pas un JWT et s'y ferait rejeter.
          if (!auth.includes('jeton-test')) {
            recu.lecturesAnonymes++;
            recu.bearerSansSession = recu.bearerSansSession || auth !== '';
            return route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"RLS"}' });
          }
          return route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify([{ bon: { ref: 'ELA-26-08-0777', statut: 'attente',
              course: { date: '2026-09-01', heure: '10:00' }, client: { nom: 'Test Nuage' } } }]) });
        }
      }
      return route.fulfill({ status: 200, body: '{}' });
    }

    if (u.startsWith(BASE)) return route.continue();
    return route.abort();
  });

  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);

  check('avec identifiants, le nuage est actif', await page.evaluate(() => nuage.actif()));

  // --- Côté client ---
  const depose = await page.evaluate(async () => {
    const r = await nuage.deposer({ ref: 'ELA-26-08-0042', statut: 'attente', client: { nom: 'Claire' } });
    afficherEtatEnvoi(r);
    return r;
  });
  check('la demande du client part toute seule', depose === true);
  check('le serveur reçoit la référence en clé',
    recu.deposes.length === 1 && recu.deposes[0].ref === 'ELA-26-08-0042');
  check('et le bon de réservation entier',
    !!(recu.deposes[0] && recu.deposes[0].bon && recu.deposes[0].bon.client));

  const blocs = await page.evaluate(() => ({
    arrivee: !document.getElementById('blocArrivee').classList.contains('hidden'),
    envoi: !document.getElementById('blocEnvoi').classList.contains('hidden')
  }));
  check('le client lit « votre demande nous est bien parvenue »', blocs.arrivee);
  check('les trois boutons d\'envoi disparaissent de son écran', !blocs.envoi);

  const attente = await page.evaluate(() => {
    afficherEtatEnvoi(null);
    return { a: !document.getElementById('blocArrivee').classList.contains('hidden'),
             e: !document.getElementById('blocEnvoi').classList.contains('hidden') };
  });
  check('tant que le dépôt n\'a pas répondu, aucun des deux blocs ne s\'affiche',
    !attente.a && !attente.e);

  const repli = await page.evaluate(() => {
    afficherEtatEnvoi(false);
    return { a: !document.getElementById('blocArrivee').classList.contains('hidden'),
             e: !document.getElementById('blocEnvoi').classList.contains('hidden') };
  });
  check('dépôt refusé : le repli WhatsApp revient, le client est prévenu',
    !repli.a && repli.e);

  // --- La lecture est fermée à l'anonyme ---
  check('un visiteur anonyme ne peut lire AUCUNE course',
    (await page.evaluate(() => nuage.lister())) === null);
  check('la clé publique n\'est jamais présentée en Bearer',
    recu.bearerSansSession !== true);

  // --- Côté exploitant ---
  check('un mauvais mot de passe est refusé',
    (await page.evaluate(() => nuage.connexion('b@ela.fr', 'faux'))) === false);
  check('le bon mot de passe ouvre la session',
    (await page.evaluate(() => nuage.connexion('b@ela.fr', 'bonmotdepasse'))) === true);

  const recues = await page.evaluate(() => synchroniserNuage(true));
  check('les demandes arrivées entre-temps sont récupérées', recues === 1, recues + ' course(s)');
  check('elles entrent dans le registre de l\'appareil',
    await page.evaluate(() => loadBookings().some(c => c.ref === 'ELA-26-08-0777')));
  check('une seconde synchronisation ne duplique rien',
    (await page.evaluate(() => synchroniserNuage(true))) === 0);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  check('la session survit au rechargement', await page.evaluate(() => nuage.connecte()));
  check('le bloc serveur s\'affiche une fois connecté',
    !(await page.evaluate(() => document.getElementById('blocNuage').classList.contains('hidden'))));

  await page.close();
}

await browser.close();
console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
if (errors.length) { console.log('\n=== ERREURS JS ==='); [...new Set(errors)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length || errors.length ? 1 : 0);
