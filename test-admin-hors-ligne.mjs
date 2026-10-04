/* =====================================================================
   TEST-ADMIN-HORS-LIGNE.MJS — ouvrir l'admin sans réseau
   ---------------------------------------------------------------------
   4 octobre 2026, audit de l'admin (P1-1), décision de Barbaros : « oui,
   même sans réseau ». À l'ouverture, l'admin demande au serveur si le
   compte est bien exploitant. Une PANNE (pas de réseau, serveur muet ou
   en erreur) valait un REFUS : la session était effacée et l'écran de
   connexion cachait jusqu'aux courses gardées sur le téléphone.

   Ce qu'on éprouve :
   - sans réseau, un compte déjà reconnu ICI ouvre l'espace sur les courses
     du téléphone, avec l'écriteau « Pas de réseau », et la session reste ;
   - au retour du réseau, tout repart seul, et la vérification s'arrête ;
   - un compte jamais reconnu ici reste à l'écran de connexion, sans perdre
     sa session, et entre seul quand le réseau revient ;
   - un vrai refus du serveur (faux, 401, renouvellement refusé) referme
     tout, comme avant ;
   - un serveur en erreur, un renouvellement en 503 ou qui ne répond jamais
     ne déconnectent plus ;
   - au retour du réseau, plusieurs appels refusés en même temps ne
     déclenchent qu'UN renouvellement (sinon le second, refusé comme jeton
     déjà servi, effaçait la session neuve) ;
   - un agent hors ligne garde la vue d'agent ;
   - se connecter sans réseau dit « pas de réseau », pas « vérifiez vos
     identifiants ».

   ÉPROUVÉ SUR LE SITE CONSTRUIT : la connexion par e-mail n'existe que là
   (harden-exploitant-auth.mjs). Port 8131, propre à cette suite.

   Lancer :  node test-admin-hors-ligne.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';

execSync('sh construire.sh', { stdio: 'ignore' });
const TYPES = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8131, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8131';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = (b, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(b) });

const paris = min => { const s = new Date(Date.now() + min * 60000).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }); return [s.slice(0, 10), s.slice(11, 16)]; };
const course = (ref, statut, jours) => ({ ref, statut, version: 1, _v: 1,
  cree: new Date(Date.now() - 3600e3).toISOString(),
  course: { depart: 'Place Vendôme, 75001 Paris', departPublic: 'Place Vendôme, 75001 Paris',
    arrivee: 'Aéroport Charles-de-Gaulle, Terminal 2E', date: paris(jours * 1440)[0], heure: '10:00',
    vehicule: 'Berline', vehiculeCle: 'berline', passagers: '2 passagers', vol: '' },
  client: { nom: 'Client ' + ref.slice(-5), telephone: '06 12 34 56 78' }, prix: { total: 70 }, langue: 'fr' });
const LOCALE = course('ELA-26-10-LOCAL', 'attente', 1);  /* « attente » : le filtre par défaut du tableau de bord */
const SERVEUR = course('ELA-26-10-SERVR', 'attente', 2);
const SESSION = (id = 'u-barbaros', jeton = 'JETON') => ({ access_token: jeton, refresh_token: 'R', token_type: 'bearer', user: { id } });

const erreurs = [];
const nav = await chromium.launch();

/* Le faux serveur : un objet d'état que chaque scène change en cours de
   route. « coupe » = le réseau ne passe pas (l'appel échoue comme sur un
   téléphone sans réseau). */
async function ouvrir({ session, acces, local = [LOCALE], role, etat }) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  /* addInitScript se rejoue à CHAQUE chargement : on ne pose l'état de
     départ qu'une fois, sinon une navigation le remettrait à zéro. */
  await ctx.addInitScript(({ session, acces, local, role }) => {
    if (sessionStorage.getItem('__pose')) return;
    sessionStorage.setItem('__pose', '1');
    if (session) localStorage.setItem('ela_nuage_session', JSON.stringify(session));
    if (acces) localStorage.setItem('ela_acces_verifie', acces);
    if (local) localStorage.setItem('ela_bookings', JSON.stringify(local));
    if (role) localStorage.setItem('ela_role_connu', JSON.stringify(role));
  }, { session, acces, local, role });
  etat.vus = [];
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url();
    if (u.startsWith(BASE)) return route.continue();
    if (!u.includes('supabase.co')) return route.abort();
    const auth = req.headers()['authorization'] || '';
    const quoi = u.includes('grant_type=refresh_token') ? 'refresh'
      : u.includes('/rpc/est_exploitant') ? 'est_exploitant'
      : u.includes('grant_type=password') ? 'connexion' : 'autre';
    etat.vus.push(quoi + ':' + auth.replace('Bearer ', ''));
    if (etat.reseau === 'coupe') return route.abort('internetdisconnected');
    if (quoi === 'refresh') {
      etat.refreshs = (etat.refreshs || 0) + 1;
      if (etat.refresh === 'muet') return; /* jamais de réponse */
      if (typeof etat.refresh === 'number') return route.fulfill(J({ error: 'x' }, etat.refresh));
      /* Un jeton de renouvellement ne sert qu'une fois : le second appel
         avec le même jeton est refusé, comme chez Supabase. */
      if (etat.refreshs > 1) return route.fulfill(J({ error_code: 'refresh_token_already_used' }, 400));
      return route.fulfill(J({ access_token: 'NEUF', refresh_token: 'R2', token_type: 'bearer', user: { id: session?.user?.id || 'u-barbaros' } }));
    }
    if (etat.expire && auth === 'Bearer JETON') return route.fulfill({ status: 401, body: '' });
    if (quoi === 'est_exploitant') {
      if (typeof etat.estExploitant === 'number') return route.fulfill({ status: etat.estExploitant, body: '' });
      return route.fulfill(J(etat.estExploitant !== false));
    }
    if (typeof etat.rest === 'number') return route.fulfill({ status: etat.rest, body: '' });
    if (u.includes('/rpc/role_operateur')) return route.fulfill(J(etat.role || 'admin'));
    if (u.includes('/rpc/presences_operateurs')) return route.fulfill(J([]));
    if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J({ ok: true }));
    if (u.includes('/rest/v1/courses')) {
      const liste = [LOCALE, SERVEUR];
      if (u.includes('select=ref')) return route.fulfill(J([{ ref: SERVEUR.ref, version: 1, modifie_le: '2026-10-04T08:00:00Z' }]));
      return route.fulfill(J(liste.map(c => ({ bon: c, statut: c.statut, version: 1, modifie_le: '2026-10-04T08:00:00Z', cree_le: c.cree }))));
    }
    return route.fulfill(J([]));
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/ela-admin/');
  return { ctx, p };
}
const espaceOuvert = (p, ms = 6000) => p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: ms }).then(() => true, () => false);
const session = p => p.evaluate(() => JSON.parse(localStorage.getItem('ela_nuage_session') || 'null'));
const carte = (p, ref) => p.locator('#listeBord .demande').filter({ hasText: ref }).count();
const ecriteau = p => p.evaluate(() => { const e = document.getElementById('bordHorsLigne'); return e && !e.hidden ? e.innerText.trim() : ''; });
const verrou = p => p.evaluate(() => { const v = document.getElementById('ecran-verrou'); return !!v && v.classList.contains('actif'); });
const messageVerrou = p => p.evaluate(() => { const e = document.getElementById('codeErreur'); return e && !e.hidden ? e.textContent.trim() : ''; });

try {
  /* A. SANS RÉSEAU, COMPTE DÉJÀ RECONNU ICI : L'ESPACE S'OUVRE SUR LE TÉLÉPHONE. */
  {
    const etat = { reseau: 'coupe' };
    const { ctx, p } = await ouvrir({ session: SESSION(), acces: 'u-barbaros', etat });
    check('A. sans réseau, l\'admin s\'ouvre quand même', await espaceOuvert(p));
    await p.waitForTimeout(800);
    check('A. il montre les courses gardées sur le téléphone', (await carte(p, 'ELA-26-10-LOCAL')) === 1);
    const ec = await ecriteau(p);
    check('A. et il DIT qu\'il n\'y a pas de réseau', /Pas de réseau/.test(ec) && /gardées sur ce téléphone/.test(ec), ec.slice(0, 120));
    check('A. la session est gardée', (await session(p))?.access_token === 'JETON');
    check('A. l\'écran de connexion n\'est pas affiché', !(await verrou(p)));

    /* Le réseau revient : on ne recharge rien, on prévient comme le fait
       le téléphone. */
    etat.reseau = 'ok';
    await p.evaluate(() => window.dispatchEvent(new Event('online')));
    const revenu = await p.waitForFunction(() => {
      const e = document.getElementById('bordHorsLigne');
      return (!e || e.hidden) && [...document.querySelectorAll('#listeBord .demande')].some(d => /ELA-26-10-SERVR/.test(d.textContent));
    }, null, { timeout: 8000 }).then(() => true, () => false);
    check('A. au retour du réseau, l\'écriteau part et la course du serveur arrive', revenu, (await ecriteau(p)).slice(0, 80));
    check('A. le compte reste reconnu sur cet appareil', (await p.evaluate(() => localStorage.getItem('ela_acces_verifie'))) === 'u-barbaros');
    /* La vérification s'arrête une fois l'accès confirmé : sinon elle
       tourne toute la nuit sur la batterie du téléphone. */
    const avant = etat.vus.filter(v => v.startsWith('est_exploitant')).length;
    await p.waitForTimeout(16500);
    const apres = etat.vus.filter(v => v.startsWith('est_exploitant')).length;
    check('A. une fois l\'accès confirmé, la vérification s\'arrête', apres === avant, `${avant} → ${apres}`);
    await ctx.close();
  }

  /* B. SANS RÉSEAU, COMPTE JAMAIS RECONNU ICI : ON N'OUVRE PAS, MAIS ON NE
     PERD PAS LA SESSION, ET ON ENTRE SEUL AU RETOUR DU RÉSEAU. */
  {
    const etat = { reseau: 'coupe' };
    const { ctx, p } = await ouvrir({ session: SESSION(), acces: null, etat });
    await p.waitForTimeout(2500);
    check('B. sans réseau et jamais reconnu ici, l\'espace ne s\'ouvre pas', !(await p.evaluate(() => document.body.classList.contains('espace'))));
    check('B. l\'écran de connexion reste', await verrou(p));
    const mv = await messageVerrou(p);
    check('B. il dit qu\'il réessaiera seul', /Pas de réseau/.test(mv) && /Inutile de retaper/.test(mv), mv);
    check('B. la session est gardée', (await session(p))?.access_token === 'JETON');
    etat.reseau = 'ok';
    /* Pas d'événement « online » ici : la reprise toutes les 15 s suffit. */
    check('B. au retour du réseau, l\'espace s\'ouvre seul (sans retaper le mot de passe)', await espaceOuvert(p, 20000));
    check('B. et ce compte est désormais reconnu sur cet appareil', (await p.evaluate(() => localStorage.getItem('ela_acces_verifie'))) === 'u-barbaros');
    await ctx.close();
  }

  /* C. LE SERVEUR DIT NON : TOUT SE REFERME, COMME AVANT. */
  {
    const etat = { reseau: 'ok', estExploitant: false };
    const { ctx, p } = await ouvrir({ session: SESSION(), acces: 'u-barbaros', etat });
    await p.waitForTimeout(2500);
    check('C. un refus du serveur n\'ouvre pas l\'espace', !(await p.evaluate(() => document.body.classList.contains('espace'))));
    check('C. un refus efface la session', (await session(p)) === null);
    check('C. un refus efface la marque d\'accès', (await p.evaluate(() => localStorage.getItem('ela_acces_verifie'))) === null);
    await ctx.close();
  }

  /* D. JETON PÉRIMÉ, RENOUVELLEMENT REFUSÉ : REFUS AUSSI. */
  {
    const etat = { reseau: 'ok', expire: true, refresh: 400 };
    const { ctx, p } = await ouvrir({ session: SESSION(), acces: 'u-barbaros', etat });
    await p.waitForTimeout(2500);
    check('D. un renouvellement refusé n\'ouvre pas l\'espace', !(await p.evaluate(() => document.body.classList.contains('espace'))));
    check('D. et efface la session', (await session(p)) === null);
    await ctx.close();
  }

  /* E. SERVEUR EN ERREUR (503) : C'EST UNE PANNE, PAS UN REFUS. */
  {
    const etat = { reseau: 'ok', estExploitant: 503, rest: 503 };
    const { ctx, p } = await ouvrir({ session: SESSION(), acces: 'u-barbaros', etat });
    check('E. serveur en erreur : l\'espace s\'ouvre sur le téléphone', await espaceOuvert(p));
    await p.waitForTimeout(800);
    check('E. la session est gardée', (await session(p))?.access_token === 'JETON');
    const ec = await ecriteau(p);
    check('E. l\'écriteau parle du serveur, avec son code', /n'a pas répondu/.test(ec) && /503/.test(ec), ec.slice(0, 120));
    await ctx.close();
  }

  /* F. JETON PÉRIMÉ, RENOUVELLEMENT EN 503 : LA SESSION RESTE. */
  {
    const etat = { reseau: 'ok', expire: true, refresh: 503 };
    const { ctx, p } = await ouvrir({ session: SESSION(), acces: 'u-barbaros', etat });
    check('F. renouvellement en panne : l\'espace s\'ouvre sur le téléphone', await espaceOuvert(p));
    check('F. et la session n\'est PAS effacée', (await session(p))?.refresh_token === 'R');
    await ctx.close();
  }

  /* G. RENOUVELLEMENT QUI NE RÉPOND JAMAIS : IL N'ATTEND PAS POUR TOUJOURS. */
  {
    const etat = { reseau: 'ok', expire: true, refresh: 'muet' };
    const { ctx, p } = await ouvrir({ session: SESSION(), acces: 'u-barbaros', etat });
    check('G. un renouvellement muet est abandonné, et l\'espace s\'ouvre quand même', await espaceOuvert(p, 14000));
    check('G. la session est gardée', (await session(p))?.refresh_token === 'R');
    await ctx.close();
  }

  /* H. RETOUR DU RÉSEAU AVEC UN JETON PÉRIMÉ : UN SEUL RENOUVELLEMENT. */
  {
    const etat = { reseau: 'coupe' };
    const { ctx, p } = await ouvrir({ session: SESSION(), acces: 'u-barbaros', etat });
    await espaceOuvert(p);
    await p.waitForTimeout(800);
    etat.reseau = 'ok'; etat.expire = true; etat.refreshs = 0;
    await p.evaluate(() => window.dispatchEvent(new Event('online')));
    await p.waitForTimeout(3500);
    check('H. plusieurs appels refusés en même temps : un seul renouvellement', etat.refreshs === 1, String(etat.refreshs));
    const s = await session(p);
    check('H. la session neuve est gardée (pas effacée par un second renouvellement)', s?.access_token === 'NEUF', JSON.stringify(s)?.slice(0, 60));
    check('H. la course du serveur arrive', (await carte(p, 'ELA-26-10-SERVR')) === 1);
    await ctx.close();
  }

  /* I. UN AGENT HORS LIGNE GARDE LA VUE D'AGENT. */
  {
    const etat = { reseau: 'coupe' };
    const { ctx, p } = await ouvrir({ session: SESSION('u-agent'), acces: 'u-agent',
      role: { id: 'u-agent', role: 'agent_reservation' }, etat });
    check('I. l\'agent hors ligne entre', await espaceOuvert(p));
    await p.waitForTimeout(800);
    check('I. il garde la vue d\'agent', await p.evaluate(() => document.body.classList.contains('role-agent_reservation')));
    check('I. le registre lui reste caché', !(await p.locator('#btnRegistre').isVisible().catch(() => false)));
    await ctx.close();
  }

  /* J. SE CONNECTER SANS RÉSEAU : ON DIT « PAS DE RÉSEAU ». */
  {
    const etat = { reseau: 'coupe' };
    const { ctx, p } = await ouvrir({ session: null, acces: null, etat });
    await p.waitForSelector('#exploitantEmail', { timeout: 6000 }).catch(() => {});
    await p.fill('#exploitantEmail', 'barbaros@exemple.fr');
    await p.fill('#exploitantMdp', 'secret');
    await p.click('#btnDeverrouiller');
    await p.waitForFunction(() => { const e = document.getElementById('codeErreur'); return e && !e.hidden; }, null, { timeout: 12000 }).catch(() => {});
    const mv = await messageVerrou(p);
    check('J. sans réseau, la connexion dit « pas de réseau », pas « vérifiez vos identifiants »',
      /Pas de réseau/.test(mv) && !/identifiants/.test(mv), mv);
    await ctx.close();
  }

  /* K. EN TEMPS NORMAL, RIEN NE CHANGE. */
  {
    const etat = { reseau: 'ok' };
    const { ctx, p } = await ouvrir({ session: SESSION(), acces: null, etat });
    check('K. avec le réseau, l\'admin s\'ouvre comme avant', await espaceOuvert(p));
    await p.waitForTimeout(1200);
    check('K. et lit le serveur', (await carte(p, 'ELA-26-10-SERVR')) === 1);
    check('K. sans écriteau', !(await ecriteau(p)));
    await ctx.close();
  }

  check('aucune erreur JavaScript', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
} catch (e) {
  ko.push('PLANTAGE : ' + (e && e.message ? e.message.split('\n')[0] : e));
} finally {
  await nav.close();
  serveur.close();
}

console.log(`\n=== ${ok.length} contrôles au vert, ${ko.length} en échec ===`);
for (const k of ko) console.log('  ✘ ' + k);
for (const o of ok) console.log('  ✔ ' + o);
process.exit(ko.length ? 1 : 0);
