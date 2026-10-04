/* =====================================================================
   TEST-ADMIN-VOYANT.MJS — le voyant des alertes de l'admin
   ---------------------------------------------------------------------
   4 octobre 2026, à la demande de Barbaros (« Ok voyant »). Le chien de
   garde GitHub ne passait que 6 fois en 21 h ; l'admin lit maintenant les
   mêmes mesures sur le serveur (fonction « ela_sante_alertes ») et les
   juge avec le même fichier (admin-sante.js).

   Ce qu'on éprouve :
   - mesures saines : « Alertes OK », et aucun bandeau ;
   - Telegram en panne, demandes sans alerte, rappels arrêtés : « Alertes
     en panne », et un bandeau rouge qui dit laquelle ET le geste qui reste ;
   - le bandeau dit EXACTEMENT ce que dit le juge du chien de garde
     (importé ici) : un seul juge, deux affichages ;
   - fonction pas encore installée (404), réponse illisible, plus de
     réseau, mesure trop vieille : GRIS, jamais vert, jamais rouge ;
   - un ancien vert ne survit ni à une panne réseau ni au temps qui passe ;
   - sans session, aucun appel ; avec session, un appel à l'ouverture et
     pas un de plus au rythme de la sonde de 8 s ;
   - aucune page publique ne charge le juge ni n'appelle la fonction ;
   - rien ne déborde à 320 et 390 px, et le voyant tient sur une ligne.

   ÉPROUVÉ SUR LE SITE CONSTRUIT : la connexion par e-mail et le retrait
   des pages publiques n'existent que là. Port 8137, propre à cette suite.

   Lancer :  node test-admin-voyant.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';
import { juger } from './.github/scripts/chien-de-garde.mjs';

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
await new Promise(r => serveur.listen(8137, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8137';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = (b, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(b) });

const SAIN = { sans_alerte: 0, relance_active: true, derniere_relance_s: 12, relances_echouees_15min: 0,
  telegram_echecs_1h: 0, telegram_ok_1h: 3, demandes_24h: 5 };
const demain = new Date(Date.now() + 86400e3).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10);
const ATTENTE = { ref: 'ELA-26-10-K7M2P', statut: 'attente', cree: new Date(Date.now() - 3600e3).toISOString(),
  course: { depart: 'Place Vendôme, 75001 Paris', departPublic: 'Place Vendôme, 75001 Paris', arrivee: 'Aéroport Charles-de-Gaulle, Terminal 2E',
    date: demain, heure: '10:00', vehicule: 'Berline', vehiculeCle: 'berline', passagers: '2 passagers', vol: '' },
  client: { nom: 'Client K7M2P', telephone: '06 12 34 56 78' }, prix: { total: 90 }, langue: 'fr' };
const SESSION = { access_token: 'JETON', refresh_token: 'R', token_type: 'bearer', user: { id: 'u-barbaros' } };

const erreurs = [];
const nav = await chromium.launch();

/* « etat.sante » est ce que rend la fonction : un objet (rendu tel quel),
   un nombre (code d'erreur HTTP), ou « coupe » (pas de réseau du tout). */
async function ouvrir({ session = SESSION, etat, largeur = 390, hauteur = 844, horloge = false }) {
  const ctx = await nav.newContext({ viewport: { width: largeur, height: hauteur }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  await ctx.addInitScript(({ session }) => {
    if (sessionStorage.getItem('__pose')) return;
    sessionStorage.setItem('__pose', '1');
    if (session) {
      localStorage.setItem('ela_nuage_session', JSON.stringify(session));
      localStorage.setItem('ela_acces_verifie', session.user.id);
    }
    localStorage.setItem('ela_bookings', '[]');
  }, { session });
  etat.appels = []; etat.auth = [];
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url();
    if (u.startsWith(BASE)) return route.continue();
    if (!u.includes('supabase.co')) return route.abort();
    if (etat.reseau === 'coupe') return route.abort('internetdisconnected');
    if (u.includes('/rpc/ela_sante_alertes') && !etat.refus) {
      etat.appels.push(req.method());
      etat.auth.push(req.headers()['authorization'] || '');
      const s = etat.sante;
      if (s === 'coupe') return route.abort('internetdisconnected');
      if (typeof s === 'number') return route.fulfill(J({ code: 'PGRST202', message: 'Could not find the function' }, s));
      return route.fulfill(J(s));
    }
    if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
    if (u.includes('/rpc/role_operateur')) return route.fulfill(J('admin'));
    if (u.includes('/rpc/presences_operateurs')) return route.fulfill(J([]));
    if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J({ ok: true }));
    if (u.includes('grant_type=refresh_token')) return route.fulfill(J({ error_code: 'refresh_token_not_found' }, etat.refus ? 400 : 200));
    if (etat.refus) return route.fulfill({ status: 401, body: '' });
    if (u.includes('/rest/v1/courses')) {
      const liste = etat.courses || [];
      if (u.includes('select=ref')) return route.fulfill(J(liste.slice(0, 1).map(c => ({ ref: c.ref, version: 1, modifie_le: '2026-10-04T08:00:00Z' }))));
      return route.fulfill(J(liste.map(c => ({ bon: c, statut: c.statut, version: 1, modifie_le: '2026-10-04T08:00:00Z', cree_le: c.cree }))));
    }
    return route.fulfill(J([]));
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  if (horloge) await p.clock.install();
  await p.goto(BASE + '/ela-admin/');
  return { ctx, p };
}
const voyant = p => p.evaluate(() => {
  const e = document.getElementById('adminAlertes'), t = document.getElementById('adminAlertesTexte');
  if (!e || !t) return 'ABSENT';
  return t.textContent.trim() + (e.classList.contains('ok') ? ' [vert]' : '') + (e.classList.contains('ko') ? ' [rouge]' : '');
});
const bandeau = p => p.evaluate(() => { const b = document.getElementById('bordAlertes'); return b && !b.hidden ? b.innerText.trim() : ''; });
const attendreVoyant = (p, motif, ms = 8000) => p.waitForFunction(m => {
  const t = document.getElementById('adminAlertesTexte'); return !!t && new RegExp(m).test(t.textContent);
}, motif, { timeout: ms }).then(() => true, () => false);

try {
  /* A. MESURES SAINES : VERT, ET RIEN D'AUTRE. */
  {
    const etat = { sante: SAIN };
    const { ctx, p } = await ouvrir({ etat });
    const vu = await attendreVoyant(p, '^Alertes OK$');
    check('A. mesures saines : le voyant dit « Alertes OK », en vert', vu && (await voyant(p)) === 'Alertes OK [vert]', await voyant(p));
    check('A. aucun bandeau quand tout va bien', (await bandeau(p)) === '', await bandeau(p));
    check('A. la fonction est appelée en POST, avec la session de l\'exploitant',
      etat.appels[0] === 'POST' && etat.auth[0] === 'Bearer JETON', JSON.stringify([etat.appels, etat.auth]));
    /* La sonde tourne toutes les 8 s : le voyant ne doit pas la suivre. */
    await p.waitForTimeout(10000);
    check('A. un seul appel en 10 s : le voyant ne suit pas la sonde de 8 s', etat.appels.length === 1, etat.appels.length + ' appel(s)');
    /* La liste se relit aussi au retour du réseau, au retour sur l'onglet,
       sur « Actualiser » : trois relectures coup sur coup ne doivent pas
       faire trois mesures. Sans le pas de 40 s, chacune en referait une. */
    for (let i = 0; i < 3; i++) {
      await p.evaluate(() => window.dispatchEvent(new Event('online')));
      await p.waitForTimeout(700);
    }
    check('A. trois relectures coup sur coup : toujours une seule mesure', etat.appels.length === 1, etat.appels.length + ' appel(s)');
    /* LE VOYANT TIENT SUR UNE LIGNE ET NE DÉBORDE PAS. */
    const mesure = await p.evaluate(() => {
      const e = document.getElementById('adminAlertes').getBoundingClientRect();
      return { h: Math.round(e.height), droite: Math.round(e.right), page: document.documentElement.scrollWidth, vue: innerWidth };
    });
    check('A. 390 px : le voyant tient sur une ligne', mesure.h <= 16, JSON.stringify(mesure));
    check('A. 390 px : rien ne déborde', mesure.page <= mesure.vue && mesure.droite <= mesure.vue, JSON.stringify(mesure));
    await ctx.close();
  }

  /* B. TELEGRAM EN PANNE : ROUGE, ET LE BANDEAU DIT LAQUELLE ET QUOI FAIRE. */
  {
    const m = { ...SAIN, telegram_echecs_1h: 3, telegram_ok_1h: 0 };
    const etat = { sante: m };
    const { ctx, p } = await ouvrir({ etat });
    await attendreVoyant(p, 'panne');
    check('B. Telegram en panne : « Alertes en panne », en rouge', (await voyant(p)) === 'Alertes en panne [rouge]', await voyant(p));
    const b = await bandeau(p);
    check('B. le bandeau rouge apparaît sur le tableau de bord', /Alertes en panne/.test(b), b);
    check('B. il dit laquelle : Telegram', /Telegram ne reçoit plus les alertes/.test(b), b);
    check('B. il dit le geste qui reste', /arrivent quand même ici/.test(b) && /touchez l'écran pour qu'il sonne/.test(b), b);
    /* UN SEUL JUGE : le bandeau porte chaque phrase que rend le juge du
       chien de garde pour les mêmes mesures. */
    const v = juger(m);
    check('B. le bandeau dit exactement ce que dit le juge du chien de garde',
      !v.ok && v.simples.length > 0 && v.simples.every(s => b.includes(s)), JSON.stringify(v.simples));
    const geo = await p.evaluate(() => { const r = document.getElementById('bordAlertes').getBoundingClientRect();
      return { g: Math.round(r.left), d: Math.round(r.right), vue: innerWidth, page: document.documentElement.scrollWidth }; });
    check('B. 390 px : le bandeau ne déborde pas', geo.g >= 0 && geo.d <= geo.vue && geo.page <= geo.vue, JSON.stringify(geo));
    await ctx.close();
  }

  /* C. DEMANDES SANS ALERTE ET RAPPELS ARRÊTÉS : LES DEUX SONT DITS. */
  {
    const m = { ...SAIN, sans_alerte: 2, relance_active: false, derniere_relance_s: null };
    const etat = { sante: m };
    const { ctx, p } = await ouvrir({ etat, largeur: 320, hauteur: 568 });
    await attendreVoyant(p, 'panne');
    const b = await bandeau(p);
    check('C. deux pannes : le bandeau dit la première', /2 demandes sont arrivées sans alerte/.test(b), b);
    check('C. et le nombre des autres', /Et 1 autre problème/.test(b), b);
    const titre = await p.evaluate(() => document.getElementById('adminAlertes').title);
    check('C. la liste entière reste sur le voyant', /2 demandes sont arrivées sans alerte/.test(titre) && /rappels automatiques sont arrêtés/.test(titre), titre);
    const mesure = await p.evaluate(() => {
      const e = document.getElementById('adminAlertes').getBoundingClientRect();
      const r = document.getElementById('bordAlertes').getBoundingClientRect();
      return { h: Math.round(e.height), droite: Math.round(e.right), bd: Math.round(r.right), page: document.documentElement.scrollWidth, vue: innerWidth };
    });
    check('C. 320 px : le voyant tient sur une ligne', mesure.h <= 16, JSON.stringify(mesure));
    check('C. 320 px : ni le voyant ni le bandeau ne débordent',
      mesure.page <= mesure.vue && mesure.droite <= mesure.vue && mesure.bd <= mesure.vue, JSON.stringify(mesure));
    await ctx.close();
  }

  /* D. LA FONCTION N'EST PAS ENCORE INSTALLÉE (404) : GRIS, PAS ROUGE. */
  {
    const etat = { sante: 404 };
    const { ctx, p } = await ouvrir({ etat });
    await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(1500);
    check('D. fonction absente : gris, « non vérifiées »', (await voyant(p)) === 'Alertes : non vérifiées', await voyant(p));
    check('D. et aucun bandeau rouge', (await bandeau(p)) === '', await bandeau(p));
    const titre = await p.evaluate(() => document.getElementById('adminAlertes').title);
    check('D. la raison est gardée pour qui la cherche', /404/.test(titre), titre);
    await ctx.close();
  }

  /* E. UNE RÉPONSE ILLISIBLE N'EST NI VERTE NI ROUGE. */
  {
    const etat = { sante: { ok: true } };
    const { ctx, p } = await ouvrir({ etat });
    await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(1500);
    check('E. réponse illisible : gris', (await voyant(p)) === 'Alertes : non vérifiées', await voyant(p));
    check('E. et aucun bandeau', (await bandeau(p)) === '', await bandeau(p));
    await ctx.close();
  }

  /* F. UN ANCIEN VERT NE SURVIT PAS À UNE COUPURE DU RÉSEAU. */
  {
    const etat = { sante: SAIN };
    const { ctx, p } = await ouvrir({ etat });
    await attendreVoyant(p, '^Alertes OK$');
    etat.reseau = 'coupe';
    /* Le retour (ou la perte) du réseau relance la lecture du serveur. */
    await p.evaluate(() => window.dispatchEvent(new Event('online')));
    const gris = await attendreVoyant(p, 'non vérifiées');
    check('F. plus de réseau : le vert retombe au gris', gris, await voyant(p));
    /* Pendant la coupure, Telegram tombe. Au retour du réseau, l'ancien vert
       ne doit PAS revenir : la première chose affichée est la vraie mesure. */
    etat.sante = { ...SAIN, telegram_echecs_1h: 2, telegram_ok_1h: 0 };
    etat.reseau = '';
    const vus = [];
    await p.evaluate(() => window.dispatchEvent(new Event('online')));
    for (let i = 0; i < 20; i++) { vus.push(await voyant(p)); await p.waitForTimeout(200); }
    check('F. au retour du réseau, l\'ancien vert ne revient pas sans mesure', !vus.includes('Alertes OK [vert]'), [...new Set(vus)].join(' → '));
    check('F. la première mesure après le retour est la vraie : rouge', vus[vus.length - 1] === 'Alertes en panne [rouge]', [...new Set(vus)].join(' → '));
    await ctx.close();
  }

  /* G. UN VERT VIEILLIT : ONGLET CACHÉ, PLUS DE MESURE, IL RETOMBE AU GRIS. */
  {
    const etat = { sante: SAIN };
    const { ctx, p } = await ouvrir({ etat, horloge: true });
    await attendreVoyant(p, '^Alertes OK$');
    const avant = etat.appels.length;
    /* Onglet caché : la sonde et la relecture s'arrêtent d'elles-mêmes. */
    await p.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await p.clock.fastForward('04:00');
    await p.waitForTimeout(300);
    check('G. onglet caché : aucune mesure de plus', etat.appels.length === avant, (etat.appels.length - avant) + ' appel(s) de plus');
    check('G. quatre minutes sans mesure : le vert retombe au gris', (await voyant(p)) === 'Alertes : non vérifiées', await voyant(p));
    const titre = await p.evaluate(() => document.getElementById('adminAlertes').title);
    check('G. et il dit pourquoi', /trop ancienne/.test(titre), titre);
    await ctx.close();
  }

  /* J. LE SERVEUR RÉPOND, MAIS LA MESURE ÉCHOUE ENSUITE : LE VERT TOMBE.
     Le cas que F ne couvre pas : la liste des courses arrive, seule la
     fonction des alertes refuse. Garder l'ancien vert serait mentir. */
  {
    const etat = { sante: SAIN };
    const { ctx, p } = await ouvrir({ etat, horloge: true });
    await attendreVoyant(p, '^Alertes OK$');
    etat.sante = 503;
    await p.clock.fastForward('00:50');
    const gris = await attendreVoyant(p, 'non vérifiées', 6000);
    check('J. la mesure suivante échoue : le vert retombe au gris', gris && etat.appels.length >= 2,
      (await voyant(p)) + ' · ' + etat.appels.length + ' appel(s)');
    /* Et il revient au vert tout seul à la mesure suivante. */
    etat.sante = SAIN;
    await p.clock.fastForward('00:50');
    check('J. la mesure revient : le vert revient tout seul', await attendreVoyant(p, '^Alertes OK$', 6000), await voyant(p));
    await ctx.close();
  }

  /* K. 390 × 844, SON PAS ENCORE DÉBLOQUÉ, TELEGRAM EN PANNE : la demande en
     attente reste à l'écran. Les deux bandeaux empilés la faisaient sortir
     (relecture du 4 octobre 2026). */
  for (const [nom, m] of [['une panne', { ...SAIN, telegram_echecs_1h: 3, telegram_ok_1h: 0 }],
                          ['quatre pannes', { ...SAIN, sans_alerte: 2, derniere_relance_s: 1200, relances_echouees_15min: 12, telegram_echecs_1h: 3, telegram_ok_1h: 0 }]]) {
    const etat = { sante: m, courses: [ATTENTE] };
    const { ctx, p } = await ouvrir({ etat });
    await attendreVoyant(p, 'panne');
    await p.waitForSelector('#listeBord .demande', { timeout: 8000 }).catch(() => {});
    const r = await p.evaluate(() => {
      const d = document.querySelector('#listeBord .demande'), s = document.getElementById('sonCoupe');
      return { bas: d ? Math.round(d.getBoundingClientRect().bottom) : null, vue: innerHeight, sonCoupe: !!s && !s.hidden };
    });
    check(`K. ${nom} : « Son coupé » ne s'empile pas sur le bandeau rouge`, r.sonCoupe === false, JSON.stringify(r));
    check(`K. ${nom} : la demande en attente reste entière à l'écran (390 × 844)`, r.bas !== null && r.bas <= r.vue, JSON.stringify(r));
    const b = await bandeau(p);
    check(`K. ${nom} : le bandeau dit de toucher l'écran pour que le son marche`, /touchez l'écran/.test(b), b);
    /* Un appui débloque le son : la phrase change, sans réafficher « Son coupé ». */
    await p.mouse.click(200, 20);
    await p.waitForTimeout(900);
    const apres = await bandeau(p);
    const son = await p.evaluate(() => { const s = document.getElementById('sonCoupe'); return !!s && !s.hidden; });
    check(`K. ${nom} : après l'appui, il dit que l'écran sonne`, /cet écran sonne/.test(apres) && !son, apres);
    await ctx.close();
  }

  /* L. L'EN-TÊTE NE SAUTE PAS quand le voyant change d'état (téléphone). */
  for (const largeur of [320, 390]) {
    const etat = { sante: SAIN };
    const { ctx, p } = await ouvrir({ etat, largeur });
    await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 8000 }).catch(() => {});
    const gris = await p.evaluate(() => Math.round(document.querySelector('.admin-ava').getBoundingClientRect().left));
    await attendreVoyant(p, '^Alertes OK$');
    const vert = await p.evaluate(() => Math.round(document.querySelector('.admin-ava').getBoundingClientRect().left));
    check(`L. ${largeur} px : l'avatar ne bouge pas entre gris et vert`, gris === vert, `${gris} → ${vert}`);
    await ctx.close();
  }

  /* M. LE BANDEAU N'EST PAS RÉÉCRIT À L'IDENTIQUE : c'est une région « alert »,
     un lecteur d'écran relirait la même panne à chaque réécriture. */
  {
    const etat = { sante: { ...SAIN, telegram_echecs_1h: 3, telegram_ok_1h: 0 } };
    const { ctx, p } = await ouvrir({ etat, horloge: true });
    await attendreVoyant(p, 'panne');
    await p.evaluate(() => { window.__mutations = 0;
      new MutationObserver(l => { window.__mutations += l.length; }).observe(document.getElementById('bordAlertes'), { childList: true, characterData: true, subtree: true }); });
    for (let i = 0; i < 3; i++) { await p.clock.fastForward('01:00'); await p.waitForTimeout(300); }
    const n = await p.evaluate(() => window.__mutations);
    check('M. trois minutes de la même panne : le bandeau n\'est jamais réécrit', n === 0, n + ' réécriture(s)');
    check('M. et il est toujours là', /Telegram/.test(await bandeau(p)), await bandeau(p));
    await ctx.close();
  }

  /* N. LA SESSION SE PERD PENDANT QU'IL REGARDE (mot de passe changé ailleurs) :
     la pastille et le voyant le disent, au lieu de rester au vert. */
  {
    const etat = { sante: SAIN, courses: [ATTENTE] };
    const { ctx, p } = await ouvrir({ etat });
    await attendreVoyant(p, '^Alertes OK$');
    etat.refus = true;
    const perdu = await p.waitForFunction(() => {
      const t = document.getElementById('adminEtatTexte'); return !!t && /appareil seul/.test(t.textContent);
    }, null, { timeout: 15000 }).then(() => true, () => false);
    const pastille = await p.evaluate(() => document.getElementById('adminEtatTexte').textContent.trim());
    check('N. session perdue : la pastille ne dit plus « Serveur connecté »', perdu, pastille);
    check('N. et le voyant retombe au gris', (await voyant(p)) === 'Alertes : non vérifiées', await voyant(p));
    const ecriteau = await p.evaluate(() => { const e = document.getElementById('bordHorsLigne'); return e && !e.hidden ? e.innerText.trim() : ''; });
    check('N. et le tableau de bord dit que la session a expiré', /session a expiré/.test(ecriteau), ecriteau);
    await ctx.close();
  }

  /* H. SANS SESSION : AUCUN APPEL, ET GRIS. */
  {
    const etat = { sante: SAIN };
    const { ctx, p } = await ouvrir({ etat, session: null });
    await p.waitForTimeout(2500);
    check('H. sans session : la fonction n\'est jamais appelée', etat.appels.length === 0, etat.appels.length + ' appel(s)');
    await ctx.close();
  }

  /* I. LES PAGES PUBLIQUES NE CHARGENT NI LE JUGE NI LA FONCTION. */
  {
    for (const page of ['/', '/application.html', '/easyhotel-reception/']) {
      const html = await (await fetch(BASE + page)).text();
      check(`I. ${page} ne charge pas le juge ni la fonction`, !html.includes('admin-sante') && !html.includes('ela_sante_alertes'));
    }
    const admin = await (await fetch(BASE + '/ela-admin/')).text();
    check('I. l\'admin, lui, charge le juge', admin.includes('src="admin-sante.js"'));
  }

  check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
} finally {
  await nav.close();
  serveur.close();
}

console.log(`\n=== RÉUSSIS (${ok.length}) ===`); ok.forEach(x => console.log('  ✔ ' + x));
if (ko.length) { console.log(`\n=== ÉCHECS (${ko.length}) ===`); ko.forEach(x => console.log('  ✘ ' + x)); }
console.log(`\n=== ${ok.length} contrôles au vert, ${ko.length} en échec ===`);
process.exit(ko.length ? 1 : 0);
