/* =====================================================================
   TEST-RELANCE-ALERTES — aucune demande ne doit rester sans alerte
   ---------------------------------------------------------------------
   30/09/2026, à sa demande : « recevoir toutes les courses en temps et en
   heure sur admin et Telegram… tout ce qui est possible pour être alerté ».
   « nouvelle-demande » reçoit chaque minute {type:"RELANCE"} (pg_cron) :
   · RATTRAPAGE : en attente depuis plus de 2 min et aucune alerte réussie
     → annoncée maintenant (webhook tombé, Telegram en panne un instant) ;
   · RAPPEL : toujours en attente 10 min après la dernière alerte → une
     autre, trois fois au plus ;
   · une course tranchée ne sonne plus.
   Sans Deno ni réseau : le code TypeScript dépouillé de ses types, un faux
   serveur, et une horloge qu'on avance à la main.
   Lancer :  node test-relance-alertes.mjs
   ===================================================================== */
import m from 'node:module'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const R = path.join(path.dirname(fileURLToPath(import.meta.url)), 'supabase/functions/nouvelle-demande') + '/';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ela-relance-'));
for (const f of fs.readdirSync(R)) if (f.endsWith('.js')) fs.copyFileSync(R + f, tmp + '/' + f);
fs.writeFileSync(tmp + '/index.mjs', m.stripTypeScriptTypes(fs.readFileSync(R + 'index.ts', 'utf8')));

let maintenant = Date.parse('2026-09-30T10:00:00Z');
const DateReel = Date; Date.now = () => maintenant;
const iso = (ms) => new DateReel(ms).toISOString();

let courses = [], journal = [], tg = [];
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (url.includes('api.telegram.org')) { tg.push(JSON.parse(init.body).text); return new Response('{}'); }
  if (url.includes('/rest/v1/courses?select=ref,bon,cree_le&statut=eq.attente')) {
    const depuis = Date.parse(decodeURIComponent(url.match(/cree_le=gte\.([^&]+)/)[1]));
    return new Response(JSON.stringify(courses.filter(c => c.statut === 'attente' && Date.parse(c.cree_le) >= depuis)));
  }
  if (url.includes('journal_notifications_admin?select')) {
    const ref = decodeURIComponent(url.match(/course_ref=eq\.([^&]+)/)[1]);
    return new Response(JSON.stringify(journal.filter(j => j.course_ref === ref)));
  }
  if (url.includes('journal_notifications_admin')) { journal.push({ ...JSON.parse(init.body), cree_le: iso(maintenant) }); return new Response(''); }
  if (url.includes('abonnements_admin')) return new Response('[]');
  return new Response('?', { status: 404 });
};
let h; globalThis.Deno = { env: { get: k => ({ SUPABASE_URL: 'http://sb', SUPABASE_SERVICE_ROLE_KEY: 'S', TELEGRAM_TOKEN: 't', TELEGRAM_CHAT: 'c' })[k] }, serve: f => { h = f; } };
await import(tmp + '/index.mjs');
const relance = async (corps = { type: 'RELANCE' }) => (await h(new Request('http://x', { method: 'POST', body: JSON.stringify(corps) }))).text();
const minutes = (n) => { maintenant += n * 60000; };

const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const bon = (ref) => ({ ref, course: { departPublic: 'Place Vendôme, 75001 Paris', arriveePublic: 'Aéroport Charles-de-Gaulle, Terminal 2E', date: '2026-09-30', heure: '14:00', vehicule: 'Berline', passagers: '2 passagers' }, prix: { total: 70 } });

try {
  /* 1. Toute fraîche : c'est au webhook de parler, pas au rappel. */
  courses = [{ ref: 'ELA-26-09-AAAA1', statut: 'attente', cree_le: iso(maintenant - 30000), bon: bon('ELA-26-09-AAAA1') }];
  await relance();
  check('course de 30 s sans alerte : le rappel ne double pas le webhook', tg.length === 0, String(tg.length));

  /* 2. Le webhook n'a jamais rien envoyé : rattrapage. */
  minutes(3);
  const bilan = await relance();
  check('3 min sans aucune alerte : RATTRAPÉE', tg.length === 1, bilan);
  check('le rattrapage est annoncé comme une nouvelle demande', /^Nouvelle demande/.test(tg[0] || ''), (tg[0] || '').split('\n')[0]);
  check('il est journalisé comme annonce (le webhook ne la redoublera pas)',
    journal.some(j => j.course_ref === 'ELA-26-09-AAAA1' && j.type_evenement === 'nouvelle_reservation' && j.canal === 'telegram'));
  await relance();
  check('appelé à nouveau tout de suite : rien de plus', tg.length === 1, String(tg.length));

  /* 3. Rappels : toutes les 10 min, trois au plus. */
  minutes(9); await relance();
  check('9 min après : pas encore de rappel', tg.length === 1, String(tg.length));
  minutes(1); await relance();
  check('10 min après : premier RAPPEL', tg.length === 2 && /^RAPPEL \d+ min/.test(tg[1]), (tg[1] || '').split('\n')[0]);
  check('le rappel dit depuis combien de temps (14 min)', /^RAPPEL 14 min/.test(tg[1] || ''), (tg[1] || '').split('\n')[0]);
  check('le titre du rappel tient sous 90 caractères', (tg[1] || '').split('\n')[0].length < 90, String((tg[1] || '').split('\n')[0].length));
  minutes(10); await relance(); minutes(10); await relance();
  check('trois rappels au bout de 30 min', tg.length === 4, String(tg.length));
  minutes(10); await relance(); minutes(10); await relance();
  check('jamais plus de trois rappels', tg.length === 4, String(tg.length));

  /* 4. Une course tranchée ne sonne plus. */
  courses.push({ ref: 'ELA-26-09-BBBB2', statut: 'confirmee', cree_le: iso(maintenant - 5 * 60000), bon: bon('ELA-26-09-BBBB2') });
  const avant = tg.length; await relance();
  check('une course confirmée ne déclenche ni rattrapage ni rappel', tg.length === avant, String(tg.length - avant));

  /* 5. Une alerte qui a ÉCHOUÉ ne compte pas comme faite. */
  courses.push({ ref: 'ELA-26-09-CCCC3', statut: 'attente', cree_le: iso(maintenant - 5 * 60000), bon: bon('ELA-26-09-CCCC3') });
  journal.push({ type_evenement: 'nouvelle_reservation', course_ref: 'ELA-26-09-CCCC3', canal: 'telegram', statut: 'echec', cree_le: iso(maintenant - 5 * 60000) });
  const avant2 = tg.length; await relance();
  check('Telegram en panne au premier envoi : la demande est RATTRAPÉE', tg.length === avant2 + 1 && tg.at(-1).includes('CCCC3'), String(tg.length - avant2));
  check('et annoncée comme une NOUVELLE demande, pas comme un rappel', /^Nouvelle demande/.test(tg.at(-1) || ''), (tg.at(-1) || '').split('\n')[0]);

  /* 6. Hors fenêtre de 6 h : on ne réveille pas l'historique. */
  courses.push({ ref: 'ELA-26-09-DDDD4', statut: 'attente', cree_le: iso(maintenant - 7 * 3600000), bon: bon('ELA-26-09-DDDD4') });
  const avant3 = tg.length; await relance();
  check('une vieille demande (7 h) ne sonne pas la nuit', tg.length === avant3, String(tg.length - avant3));

  /* 7. Le contenu vient du SERVEUR, jamais de l'appel. */
  await relance({ type: 'RELANCE', record: { bon: { course: { departPublic: 'CLIQUEZ http://pirate' } } } });
  check('aucun texte venu de l\'appel n\'est envoyé', !tg.some(t => t.includes('pirate')));

  /* 8. Le chemin d'origine (webhook INSERT) est intact. */
  courses.push({ ref: 'ELA-26-09-EEEE5', statut: 'attente', cree_le: iso(maintenant - 5000), bon: bon('ELA-26-09-EEEE5') });
  const avant4 = tg.length;
  globalThis.fetch = ((f) => async (url, init) => String(url).includes('/rest/v1/courses?select=ref,bon,cree_le&ref=eq.')
    ? new Response(JSON.stringify(courses.filter(c => c.ref === decodeURIComponent(String(url).match(/ref=eq\.([^&]+)/)[1]))))
    : f(url, init))(globalThis.fetch);
  await relance({ type: 'INSERT', table: 'courses', record: { ref: 'ELA-26-09-EEEE5' } });
  check('le webhook INSERT annonce toujours la nouvelle demande', tg.length === avant4 + 1, String(tg.length - avant4));
  /* 9. LA PASTILLE, MÊME ADMIN FERMÉ. Le service worker est le seul code
     qui tourne quand l'application est fermée : on le fait tourner pour de
     vrai, avec une fausse notification, et on lit ce qu'il pose sur l'icône. */
  {
    const sw = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'sw.js'), 'utf8');
    const ecoute = {}, badges = [], notifs = [];
    const self = {
      location: Object.assign(new URL('https://elatransfer.com/sw.js'), {}),
      addEventListener: (t, f) => { ecoute[t] = f; },
      registration: { showNotification: (titre, o) => { notifs.push({ titre, ...o }); return Promise.resolve(); } },
      navigator: { setAppBadge: (n) => { badges.push(n === undefined ? 'point' : n); return Promise.resolve(); } },
      clients: { claim: () => Promise.resolve() }, skipWaiting: () => Promise.resolve()
    };
    new Function('self', 'caches', 'fetch', sw)(self, {}, () => {});
    const pousser = async (charge) => { let fin; ecoute.push({ data: { json: () => charge }, waitUntil: (pr) => { fin = pr; } }); await fin; };
    await pousser({ titre: 'Nouvelle demande', corps: 'x', ref: 'ELA-26-09-AAAA1', attente: 3, url: 'https://elatransfer.com/ela-admin/' });
    check('application fermée : la pastille de l\'icône affiche le NOMBRE en attente (3)', badges.at(-1) === 3, JSON.stringify(badges));
    check('la notification reste affichée tant qu\'on ne l\'a pas touchée', notifs.at(-1)?.requireInteraction === true);
    check('et elle vibre', Array.isArray(notifs.at(-1)?.vibrate));
    await pousser({ titre: 'Transfert confirmé', corps: 'x', ref: 'ELA-26-09-AAAA1' });
    check('sans nombre (notification client) : un simple point, pas de chiffre inventé', badges.at(-1) === 'point', JSON.stringify(badges));
  }
} catch (x) { ko.push('PLANTAGE — ' + x.message); }

console.log(`=== RÉUSSIS (${ok.length}) ===`); ok.forEach(x => console.log('  ✓ ' + x));
if (ko.length) { console.log(`=== ÉCHECS (${ko.length}) ===`); ko.forEach(x => console.log('  ✗ ' + x)); process.exit(1); }
