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
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
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
const recu = { deposes: [], lecturesAnonymes: 0, suivis: [] };
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
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
      if (u.includes('/rest/v1/rpc/suivi')) {
        // La fonction de suivi n'ouvre QUE sur le bon jeton. On imite ce
        // refus : c'est lui qui empêche un curieux de lire l'état des
        // courses des autres en devinant les références.
        const { p_ref, p_jeton } = JSON.parse(corps || '{}');
        recu.suivis.push({ p_ref, p_jeton });
        if (p_jeton !== 'bonjeton') return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify([{ statut: recu.statutServeur || 'attente', chauffeur: recu.chauffeurServeur || null }]) });
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

  // --- Le suivi de sa course, côté client ---
  check('chaque réservation porte un jeton de suivi imprévisible',
    await page.evaluate(() => {
      const a = jetonDeSuivi(), b = jetonDeSuivi();
      return a.length === 32 && /^[0-9a-f]+$/.test(a) && a !== b;
    }));

  const suiviOk = await page.evaluate(() => nuage.suivi('ELA-26-08-0042', 'bonjeton'));
  check('avec le bon jeton, le client lit l\'état de SA course',
    !!suiviOk && suiviOk.statut === 'attente', JSON.stringify(suiviOk));
  const suiviKo = await page.evaluate(() => nuage.suivi('ELA-26-08-0042', 'mauvaisjeton'));
  check('avec un mauvais jeton, il ne lit RIEN', suiviKo === null, JSON.stringify(suiviKo));
  // Le suivi est passé par la fonction, et la page n'a JAMAIS tenté de lire
  // la table en anonyme — elle s'arrête avant même d'envoyer la requête.
  check('le suivi passe par la fonction dédiée', recu.suivis.length === 2,
    recu.suivis.length + ' appel(s)');
  check('la page ne tente jamais de lire la table en anonyme',
    recu.lecturesAnonymes === 0, recu.lecturesAnonymes + ' tentative(s)');

  // L'affichage : la pastille bat tant qu'on cherche, se fige ensuite.
  await page.evaluate(() => demarrerSuivi({ ref: 'ELA-26-08-0042', jeton: 'bonjeton', statut: 'attente' }));
  await page.waitForTimeout(300);
  const enRecherche = await page.evaluate(() => ({
    visible: !document.getElementById('blocSuivi').classList.contains('hidden'),
    classe: document.getElementById('suiviPoint').className,
    texte: document.getElementById('suiviTexte').textContent
  }));
  check('pendant la recherche, le client voit une pastille qui bat',
    enRecherche.visible && /cherche/.test(enRecherche.classe), enRecherche.texte);

  // L'exploitant confirme : le client doit le voir sans qu'on le prévienne.
  recu.statutServeur = 'confirmee'; recu.chauffeurServeur = 'Mehmet K.';
  await page.evaluate(() => interrogerSuivi());
  await page.waitForTimeout(300);
  const confirme = await page.evaluate(() => ({
    classe: document.getElementById('suiviPoint').className,
    texte: document.getElementById('suiviTexte').textContent,
    detail: document.getElementById('suiviDetail').textContent
  }));
  check('quand l\'exploitant confirme, le client le voit sur le site',
    /ok/.test(confirme.classe) && confirme.texte.length > 0, confirme.texte);
  check('et il lit le nom de son chauffeur',
    confirme.detail.includes('Mehmet K.'), confirme.detail);
  check('la course tranchée, on cesse d\'interroger le serveur',
    (await page.evaluate(() => suiviEnCours)) === null);

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

  /* ============ LES COURSES DE BARBAROS MONTENT AUSSI ============
     Le trou le plus coûteux du serveur, corrigé en septembre 2026. L'envoi
     vers le serveur était un PATCH : il ne modifie qu'une ligne existante.
     Les courses qu'un CLIENT dépose en ont une ; celles que Barbaros saisit
     lui-même — un hôtel qui appelle, une demande collée depuis WhatsApp —
     n'en ont aucune. L'appel partait, ne trouvait rien, et ne disait rien :
     ces courses-là ne vivaient que dans son téléphone, et changer d'appareil
     les perdait. C'est une bonne part de son travail.
     On vérifie donc les deux choses qui comptent : qu'elle part, et qu'elle
     part en dépôt-ou-mise-à-jour, pas en simple modification. */
  const avant = recu.deposes.length;
  const entetes = [];
  page.on('request', r => {
    if (/faux\.supabase\.co\/rest\/v1\/courses/.test(r.url()) && r.method() === 'POST')
      entetes.push(r.headers()['prefer'] || '');
  });
  await page.evaluate(() => saveBooking({
    ref: 'ELA-26-09-0100', statut: 'confirmee',
    client: { nom: 'Hôtel Ibis CDG', telephone: '+33100000000' },
    course: { depart: 'Ibis CDG', arrivee: 'Paris 8e', date: '2026-09-20', heure: '07:00' },
    prix: { total: 78 }
  }));
  await page.waitForTimeout(600);
  const monte = recu.deposes.filter(d => d.ref === 'ELA-26-09-0100');
  check('une course saisie par l\'exploitant monte sur le serveur',
    monte.length === 1, (recu.deposes.length - avant) + ' envoi(s)');
  check('elle y monte avec son bon complet',
    !!(monte[0] && monte[0].bon && monte[0].bon.course
       && monte[0].bon.course.depart === 'Ibis CDG'));
  check('et en dépôt-ou-mise-à-jour, pour ne pas échouer si elle existe déjà',
    entetes.some(h => h.includes('merge-duplicates')), entetes.join(' | '));

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
