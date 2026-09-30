/* =====================================================================
   TEST-RELANCE-ALERTES — aucune demande ne doit rester sans alerte
   ---------------------------------------------------------------------
   30/09/2026, à sa demande : « recevoir toutes les courses en temps et en
   heure sur admin et Telegram… tout ce qui est possible pour être alerté ».
   « nouvelle-demande » reçoit toutes les 20 s {type:"RELANCE"} (pg_cron) :
   · RATTRAPAGE : en attente depuis plus d'1 min et aucune alerte réussie
     → annoncée maintenant (webhook tombé, Telegram en panne un instant) ;
   · RAPPEL TELEGRAM toutes les 20 s tant qu'elle attend et qu'il ne l'a
     pas VUE (bouton « ✅ Vu », ou course ouverte dans l'admin) ;
   · « telegram-bot » n'accepte l'appui que de Telegram et de SA conversation ;
   · notification du téléphone toutes les 10 min, trois fois au plus ;
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

let courses = [], journal = [], tg = [], tgCorps = [], tgAutres = [];
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (url.includes('api.telegram.org/bott/sendMessage')) { const c = JSON.parse(init.body); tg.push(c.text); tgCorps.push(c); return new Response('{}'); }
  if (url.includes('api.telegram.org')) { tgAutres.push({ methode: url.split('/').pop(), corps: JSON.parse(init.body) }); return new Response('{"ok":true}'); }
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
  minutes(1);
  const bilan = await relance();
  check('1 min 30 sans aucune alerte : RATTRAPÉE', tg.length === 1, bilan);
  check('le rattrapage est annoncé comme une nouvelle demande', /^Nouvelle demande/.test(tg[0] || ''), (tg[0] || '').split('\n')[0]);
  check('il est journalisé comme annonce (le webhook ne la redoublera pas)',
    journal.some(j => j.course_ref === 'ELA-26-09-AAAA1' && j.type_evenement === 'nouvelle_reservation' && j.canal === 'telegram'));
  await relance();
  check('appelé à nouveau tout de suite : rien de plus', tg.length === 1, String(tg.length));

  /* 3. Telegram toutes les 20 s, tant qu'elle attend. */
  maintenant += 10000; await relance();
  check('10 s après : pas encore de rappel', tg.length === 1, String(tg.length));
  maintenant += 10000; await relance();
  check('20 s après : RAPPEL Telegram', tg.length === 2 && /^RAPPEL \d+ min/.test(tg[1]), (tg[1] || '').split('\n')[0]);
  check('le titre du rappel tient sous 90 caractères', (tg[1] || '').split('\n')[0].length < 90, String((tg[1] || '').split('\n')[0].length));
  check('le rappel porte le bouton qui ouvre la course', (tgCorps[1]?.reply_markup?.inline_keyboard?.[1]?.[0]?.url || '').includes('?ref=ELA-26-09-AAAA1'), JSON.stringify(tgCorps[1]?.reply_markup));
  const n1 = tg.length;
  for (let i = 0; i < 9; i++) { maintenant += 20000; await relance(); }
  check('trois minutes de plus : un rappel toutes les 20 s (9)', tg.length - n1 === 9, String(tg.length - n1));

  /* 4. La notification du téléphone, elle, ne se répète que toutes les 10 min, 3 fois. */
  while (Date.parse(courses[0].cree_le) + 29 * 60000 > maintenant) { maintenant += 20000; await relance(); }
  const rappelsPush = journal.filter(j => j.course_ref === 'ELA-26-09-AAAA1' && j.canal === 'push' && j.type_evenement === 'rappel_reservation');
  check('notification du téléphone : 3 rappels au plus, espacés de 10 min', rappelsPush.length >= 2 && rappelsPush.length <= 3, String(rappelsPush.length));

  check('chaque alerte porte le bouton « ✅ Vu »', tgCorps.every(c => c.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data === 'vu:ELA-26-09-AAAA1'),
    JSON.stringify(tgCorps.at(-1)?.reply_markup));
  check('et le bouton « Ouvrir la course »', tgCorps.every(c => /\?ref=ELA-26-09-AAAA1/.test(c.reply_markup?.inline_keyboard?.[1]?.[0]?.url || '')));

  /* 5. PAS DE LIMITE DE 30 MIN : tant qu'il ne l'a pas vue, ça sonne. */
  maintenant += 5 * 60000; const n2 = tg.length;
  for (let i = 0; i < 3; i++) { maintenant += 20000; await relance(); }
  check('35 min sans réponse : Telegram sonne toujours', tg.length - n2 === 3, String(tg.length - n2));
  /* « Vu » (bouton Telegram ou course ouverte dans l'admin) l'arrête net. */
  journal.push({ type_evenement: 'vue', course_ref: 'ELA-26-09-AAAA1', canal: 'telegram', statut: 'envoye', cree_le: iso(maintenant) });
  const n2b = tg.length;
  for (let i = 0; i < 6; i++) { maintenant += 20000; await relance(); }
  check('« Vu » : plus aucun rappel', tg.length === n2b, String(tg.length - n2b));

  /* 6. Une course tranchée ne sonne plus — dès le tour suivant. */
  courses.push({ ref: 'ELA-26-09-FFFF6', statut: 'attente', cree_le: iso(maintenant - 5 * 60000), bon: bon('ELA-26-09-FFFF6') });
  journal.push({ type_evenement: 'nouvelle_reservation', course_ref: 'ELA-26-09-FFFF6', canal: 'telegram', statut: 'envoye', cree_le: iso(maintenant - 5 * 60000) });
  maintenant += 20000; const n3 = tg.length; await relance();
  check('en attente : elle sonne', tg.length === n3 + 1, String(tg.length - n3));
  courses.at(-1).statut = 'confirmee';
  const n4 = tg.length; for (let i = 0; i < 3; i++) { maintenant += 20000; await relance(); }
  check('confirmée : plus aucun rappel', tg.length === n4, String(tg.length - n4));

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
  /* 10. LE BOUTON « VU » : l'installation et la fonction qui le reçoit
     parlent le même secret, et seul SON appui compte. */
  {
    await relance({ type: 'INSTALLER_TELEGRAM' });
    const pose = tgAutres.find(x => x.methode === 'setWebhook');
    check('la migration installe le webhook du bouton « Vu »', !!pose && /\/functions\/v1\/telegram-bot$/.test(pose.corps.url), JSON.stringify(pose?.corps?.url));
    check('avec un secret (pas un webhook ouvert à tous)', /^[0-9a-f]{64}$/.test(pose?.corps?.secret_token || ''));
    const Rb = path.join(path.dirname(fileURLToPath(import.meta.url)), 'supabase/functions/telegram-bot') + '/';
    const tmpb = fs.mkdtempSync(path.join(os.tmpdir(), 'ela-bot-'));
    fs.writeFileSync(tmpb + '/index.mjs', m.stripTypeScriptTypes(fs.readFileSync(Rb + 'index.ts', 'utf8')));
    let hb; globalThis.Deno = { env: { get: k => ({ SUPABASE_URL: 'http://sb', SUPABASE_SERVICE_ROLE_KEY: 'S', TELEGRAM_TOKEN: 't', TELEGRAM_CHAT: 'c' })[k] }, serve: f => { hb = f; } };
    await import(tmpb + '/index.mjs');
    const appui = (secret, chat, data = 'vu:ELA-26-09-CCCC3') => hb(new Request('http://x', { method: 'POST',
      headers: secret ? { 'x-telegram-bot-api-secret-token': secret } : {},
      body: JSON.stringify({ callback_query: { id: 'q1', data, message: { message_id: 7, chat: { id: chat } } } }) }));
    const vues = () => journal.filter(j => j.type_evenement === 'vue' && j.course_ref === 'ELA-26-09-CCCC3').length;
    check('sans le secret : refusé (401)', (await appui('', 'c')).status === 401);
    check('avec un faux secret : refusé (401)', (await appui('0'.repeat(64), 'c')).status === 401);
    await appui(pose.corps.secret_token, 'inconnu');
    check('un appui venu d\'une AUTRE conversation ne fait taire aucune alerte', vues() === 0, String(vues()));
    const rep = await appui(pose.corps.secret_token, 'c');
    check('son appui sur « Vu » est inscrit au journal', rep.status === 200 && vues() === 1, rep.status + ' / ' + vues());
    check('Telegram lui répond « Rappels arrêtés »', tgAutres.some(x => x.methode === 'answerCallbackQuery' && /arrêtés/.test(x.corps.text || '')));
    check('le bouton « Vu » disparaît du message', tgAutres.some(x => x.methode === 'editMessageReplyMarkup' && !JSON.stringify(x.corps.reply_markup).includes('vu:')));
    const n5 = tg.length; maintenant += 30000; await relance();
    check('et la course CCCC3 n\'est plus relancée', !tg.slice(n5).some(t => t.includes('CCCC3')), String(tg.length - n5));
  }
} catch (x) { ko.push('PLANTAGE — ' + x.message); }

console.log(`=== RÉUSSIS (${ok.length}) ===`); ok.forEach(x => console.log('  ✓ ' + x));
if (ko.length) { console.log(`=== ÉCHECS (${ko.length}) ===`); ko.forEach(x => console.log('  ✗ ' + x)); process.exit(1); }
