/* =====================================================================
   TEST-RELANCE-ALERTES — aucune demande ne doit rester sans alerte
   ---------------------------------------------------------------------
   30/09/2026, à sa demande : « recevoir toutes les courses en temps et en
   heure sur admin et Telegram… tout ce qui est possible pour être alerté ».
   « nouvelle-demande » reçoit toutes les 20 s {type:"RELANCE"} (pg_cron) :
   · RATTRAPAGE : en attente depuis plus d'1 min et aucune alerte réussie
     → annoncée maintenant (webhook tombé, Telegram en panne un instant) ;
   · LA NOTIFICATION ELA EST L'ALARME : à chaque tour (20 s) les 10 premières
     minutes et à H-30 ou moins, toutes les 10 min entre H-2 et H-30 ;
   · TELEGRAM INFORME (2/10/2026 : « pas trop d'alertes sur Telegram » ;
     9/10/2026 : « toutes les 90 secondes », éprouvé admin fermé) : toutes
     les 90 s les 10 premières minutes, puis toutes les 15 min la première
     heure, silence jusqu'à H-2, toutes les 5 min sous H-30, chaque rappel EFFAÇANT le
     précédent ; un dernier message à l'heure du départ, puis plus rien ;
   · les saisies de l'exploitant ne sont ni annoncées ni relancées ;
   · « telegram-bot » n'accepte l'appui que de Telegram et de SA conversation ;
   · vue, confirmation et refus arrêtent tout immédiatement.
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

let courses = [], journal = [], tg = [], tgCorps = [], tgAutres = [], lecturePrevenirKo = false;
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (url.includes('api.telegram.org/bott/sendMessage')) { const c = JSON.parse(init.body); tg.push(c.text); tgCorps.push(c); return new Response(JSON.stringify({ ok: true, result: { message_id: tg.length } })); }
  if (url.includes('api.telegram.org')) { tgAutres.push({ methode: url.split('/').pop(), corps: JSON.parse(init.body) }); return new Response('{"ok":true}'); }
  if (url.includes('/rest/v1/courses?select=ref,bon,cree_le&statut=eq.attente')) {
    const depuis = Date.parse(decodeURIComponent(url.match(/cree_le=gte\.([^&]+)/)[1]));
    return new Response(JSON.stringify(courses.filter(c => c.statut === 'attente' && Date.parse(c.cree_le) >= depuis)));
  }
  /* Les courses dont le client reste à prévenir (24/10/2026) : le faux
     serveur applique les mêmes filtres que PostgREST. */
  if (url.includes('/rest/v1/courses?select=ref,statut,bon&statut=in.(confirmee,refusee,annulee)')) {
    if (lecturePrevenirKo) return new Response('panne', { status: 500 });
    const depuisJour = (url.match(/bon->course->>date=gte\.([^&]+)/) || [])[1] || '';
    if (!/bon->>aPrevenir=not\.is\.null/.test(url)) return new Response('filtre manquant', { status: 400 });
    return new Response(JSON.stringify(courses.filter(c => ['confirmee', 'refusee', 'annulee'].includes(c.statut)
      && c.bon && c.bon.aPrevenir && String(c.bon.course?.date || '') >= depuisJour)
      .map(c => ({ ref: c.ref, statut: c.statut, bon: c.bon }))));
  }
  if (url.includes('journal_notifications_admin?select')) {
    const ref = decodeURIComponent(url.match(/course_ref=eq\.([^&]+)/)[1]);
    const type = (url.match(/type_evenement=eq\.([^&]+)/) || [])[1];
    const depuis = (url.match(/cree_le=gte\.([^&]+)/) || [])[1];
    return new Response(JSON.stringify(journal.filter(j => j.course_ref === ref
      && (!type || j.type_evenement === decodeURIComponent(type))
      && (!depuis || Date.parse(j.cree_le) >= Date.parse(decodeURIComponent(depuis))))));
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
const bon = (ref, heure = '14:00') => ({ ref, securite: { empreinteDepot: 'e' }, course: { departPublic: 'Place Vendôme, 75001 Paris', arriveePublic: 'Aéroport Charles-de-Gaulle, Terminal 2E', date: '2026-09-30', heure, vehicule: 'Berline', passagers: '2 passagers' }, prix: { total: 70 } });
const nbTg = (ref) => tg.filter(t => t.includes(ref)).length;
const nbRappels = (ref, canal) => journal.filter(j => j.course_ref === ref && j.canal === canal && j.type_evenement === 'rappel_reservation').length;

try {
  /* 1. Toute fraîche : c'est au webhook de parler, pas au rappel. */
  /* Les heures du bon sont celles de PARIS (UTC+2 en septembre) ; l'horloge
     du test est en UTC. Départ 18:00 Paris = 16:00 UTC : loin de tout. */
  courses = [{ ref: 'ELA-26-09-AAAA1', statut: 'attente', cree_le: iso(maintenant - 30000), bon: bon('ELA-26-09-AAAA1', '18:00') }];
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

  /* 3. LA NOTIFICATION INSISTE, TELEGRAM INFORME. Course rattrapée à
     10:01:30 (créée 09:59:30), départ à 14:00 — loin. */
  const effacements = () => tgAutres.filter(x => x.methode === 'deleteMessage').map(x => x.corps.message_id);
  const idAnnonce = tgCorps.length;   // le message de l'annonce de AAAA1
  maintenant += 20000; await relance();
  check('20 s après l\'annonce : la notification ELA rappelle déjà (c\'est l\'alarme)', nbRappels('ELA-26-09-AAAA1', 'push') === 1, String(nbRappels('ELA-26-09-AAAA1', 'push')));
  check('20 s après l\'annonce : Telegram se TAIT', nbTg('ELA-26-09-AAAA1') === 1, String(nbTg('ELA-26-09-AAAA1')));
  for (let i = 0; i < 3; i++) { maintenant += 20000; await relance(); }
  check('sur la première minute : la notification à chaque tour', nbRappels('ELA-26-09-AAAA1', 'push') >= 3, String(nbRappels('ELA-26-09-AAAA1', 'push')));
  check('…et toujours aucun Telegram', nbTg('ELA-26-09-AAAA1') === 1, String(nbTg('ELA-26-09-AAAA1')));
  maintenant = Date.parse('2026-09-30T10:04:35Z'); await relance();
  check('+3 min 05, premier tour à plus de 90 s de l\'annonce : premier rappel Telegram', nbTg('ELA-26-09-AAAA1') === 2, String(nbTg('ELA-26-09-AAAA1')));
  check('le titre du rappel tient sous 90 caractères', (tg.at(-1) || '').split('\n')[0].length < 90, String((tg.at(-1) || '').split('\n')[0].length));
  check('le rappel porte le bouton qui ouvre la course', (tgCorps.at(-1)?.reply_markup?.inline_keyboard?.[1]?.[0]?.url || '').includes('?ref=ELA-26-09-AAAA1'), JSON.stringify(tgCorps.at(-1)?.reply_markup));
  check('le premier rappel n\'efface rien (l\'annonce reste)', effacements().length === 0, JSON.stringify(effacements()));
  const idRappel1 = tgCorps.length;
  /* 90 s DANS LA FENÊTRE D'ALARME (9/10/2026). Avant : rien jusqu'à +10.
     Au tour suivant à moins de 90 s, rien ; à plus de 90 s, un rappel. */
  maintenant = Date.parse('2026-09-30T10:05:35Z'); await relance();
  check('+4 min 05, soit 60 s après le premier rappel : Telegram se tait encore', nbTg('ELA-26-09-AAAA1') === 2, String(nbTg('ELA-26-09-AAAA1')));
  maintenant = Date.parse('2026-09-30T10:07:00Z'); await relance();
  check('+5 min 30, soit 145 s après le premier : DEUXIÈME rappel Telegram (toutes les 90 s dans la fenêtre d\'alarme)', nbTg('ELA-26-09-AAAA1') === 3, String(nbTg('ELA-26-09-AAAA1')));
  check('…qui EFFACE le premier rappel, pas l\'annonce', effacements().length === 1 && effacements()[0] === idRappel1 && !effacements().includes(idAnnonce), JSON.stringify({ effaces: effacements(), annonce: idAnnonce, rappel1: idRappel1 }));
  const avantFinFenetre = nbTg('ELA-26-09-AAAA1');
  maintenant = Date.parse('2026-09-30T10:11:35Z'); await relance();
  check('+10 min 05 : la fenêtre d\'alarme est close, Telegram ne rappelle plus toutes les 90 s (il attend 15 min)', nbTg('ELA-26-09-AAAA1') === avantFinFenetre, String(nbTg('ELA-26-09-AAAA1') - avantFinFenetre));
  const pushApres10 = nbRappels('ELA-26-09-AAAA1', 'push');
  maintenant = Date.parse('2026-09-30T10:20:00Z'); await relance();
  check('passé 10 min, départ à plus de 2 h : la notification se tait', nbRappels('ELA-26-09-AAAA1', 'push') === pushApres10, String(nbRappels('ELA-26-09-AAAA1', 'push') - pushApres10));
  check('…et Telegram attend ses 15 min', nbTg('ELA-26-09-AAAA1') === 3, String(nbTg('ELA-26-09-AAAA1')));
  maintenant = Date.parse('2026-09-30T10:26:40Z'); await relance();
  check('+25 min : troisième rappel (toutes les 15 min)', nbTg('ELA-26-09-AAAA1') === 4, String(nbTg('ELA-26-09-AAAA1')));
  maintenant = Date.parse('2026-09-30T10:41:45Z'); await relance();
  maintenant = Date.parse('2026-09-30T10:56:50Z'); await relance();
  check('+40, +55 : quatrième et cinquième', nbTg('ELA-26-09-AAAA1') === 6, String(nbTg('ELA-26-09-AAAA1')));
  check('un seul rappel visible à la fois : tous les précédents sont effacés', effacements().length === 4, String(effacements().length));
  maintenant = Date.parse('2026-09-30T11:12:00Z'); await relance();
  maintenant = Date.parse('2026-09-30T11:40:00Z'); await relance();
  check('après la première heure, départ à plus de 2 h : Telegram SE TAIT jusqu\'à H-2', nbTg('ELA-26-09-AAAA1') === 6, String(nbTg('ELA-26-09-AAAA1')));
  journal.push({ type_evenement: 'vue', course_ref: 'ELA-26-09-AAAA1', canal: 'telegram', statut: 'envoye', cree_le: iso(maintenant) });
  maintenant = Date.parse('2026-09-30T12:05:00Z'); const apresVue = nbTg('ELA-26-09-AAAA1'); await relance();
  check('« Vu » arrête tout, même entré dans H-2', nbTg('ELA-26-09-AAAA1') === apresVue);

  /* 4. Départ dans 30 min ou moins : notification à chaque tour, Telegram
     toutes les 5 min. */
  const urgent = 'ELA-26-09-UUUU2';
  const parisDans0 = (min) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(maintenant + min * 60000)).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, heure: `${p.hour}:${p.minute}` };
  };
  { const d = parisDans0(25), b = bon(urgent, d.heure); b.course.date = d.date;
    courses.push({ ref: urgent, statut: 'attente', cree_le: iso(maintenant - 40 * 60000), bon: b }); }
  journal.push({ type_evenement: 'nouvelle_reservation', course_ref: urgent, canal: 'telegram', statut: 'envoye', cree_le: iso(maintenant) });
  journal.push({ type_evenement: 'nouvelle_reservation', course_ref: urgent, canal: 'push', statut: 'envoye', cree_le: iso(maintenant) });
  maintenant += 10000; await relance();
  check('course urgente : rien 10 s après l\'annonce', nbRappels(urgent, 'telegram') === 0 && nbRappels(urgent, 'push') === 0, String(nbRappels(urgent, 'push')));
  maintenant += 10000; await relance();
  check('course urgente : la notification rappelle 20 s après', nbRappels(urgent, 'push') === 1, String(nbRappels(urgent, 'push')));
  check('course urgente : Telegram, lui, attend 5 min', nbRappels(urgent, 'telegram') === 0, String(nbRappels(urgent, 'telegram')));
  minutes(5); await relance();
  check('course urgente : Telegram rappelle à +5 min', nbRappels(urgent, 'telegram') === 1, String(nbRappels(urgent, 'telegram')));

  /* 5. Deux réservations rapprochées restent indépendantes. */
  const procheA = 'ELA-26-09-PPPA3', procheB = 'ELA-26-09-PPPB4';
  for (const ref of [procheA, procheB]) {
    const d = parisDans0(90), b = bon(ref, d.heure); b.course.date = d.date;
    courses.push({ ref, statut: 'attente', cree_le: iso(maintenant), bon: b });
    journal.push({ type_evenement: 'nouvelle_reservation', course_ref: ref, canal: 'telegram', statut: 'envoye', cree_le: iso(maintenant) });
    journal.push({ type_evenement: 'nouvelle_reservation', course_ref: ref, canal: 'push', statut: 'envoye', cree_le: iso(maintenant) });
  }
  minutes(3.2); await relance();
  check('2 réservations rapprochées : Telegram rappelle les deux', nbRappels(procheA, 'telegram') === 1 && nbRappels(procheB, 'telegram') === 1);
  check('2 réservations rapprochées : la notification rappelle les deux', nbRappels(procheA, 'push') === 1 && nbRappels(procheB, 'push') === 1);

  /* 6. Vu, confirmation et refus arrêtent les tours suivants. */
  journal.push({ type_evenement: 'vue', course_ref: urgent, canal: 'telegram', statut: 'envoye', cree_le: iso(maintenant) });
  courses.find(c => c.ref === procheA).statut = 'confirmee';
  courses.find(c => c.ref === procheB).statut = 'refusee';
  const avantArret = [urgent, procheA, procheB].map(ref => ({ tg: nbTg(ref), push: nbRappels(ref, 'push') }));
  minutes(7); await relance();
  check('« Vu » arrête les deux canaux', nbTg(urgent) === avantArret[0].tg && nbRappels(urgent, 'push') === avantArret[0].push);
  check('confirmation arrête les deux canaux', nbTg(procheA) === avantArret[1].tg && nbRappels(procheA, 'push') === avantArret[1].push);
  check('refus arrête les deux canaux', nbTg(procheB) === avantArret[2].tg && nbRappels(procheB, 'push') === avantArret[2].push);

  /* 7. Plus de 2 h, annoncée il y a 15 min : Telegram informe (première
     heure), la notification ne sonne pas. */
  const lointain = 'ELA-26-09-LLLL5';
  courses.push({ ref: lointain, statut: 'attente', cree_le: iso(maintenant - 15 * 60000), bon: bon(lointain, '18:00') });
  journal.push({ type_evenement: 'nouvelle_reservation', course_ref: lointain, canal: 'telegram', statut: 'envoye', cree_le: iso(maintenant - 15 * 60000) });
  journal.push({ type_evenement: 'nouvelle_reservation', course_ref: lointain, canal: 'push', statut: 'envoye', cree_le: iso(maintenant - 15 * 60000) });
  minutes(30); await relance();
  check('course à plus de 2 h : aucune notification inutile', nbRappels(lointain, 'push') === 0, String(nbRappels(lointain, 'push')));
  check('course à plus de 2 h : un rappel Telegram dans la première heure', nbRappels(lointain, 'telegram') === 1, String(nbRappels(lointain, 'telegram')));

  /* 7 bis. RÉSERVÉE LA VEILLE : le cas le plus courant (un hôtel, un vol du
     lendemain). La fenêtre se compte depuis le DÉPART, pas la création —
     et à l'heure du départ, un dernier message, puis plus rien. */
  {
    const veille = 'ELA-26-09-VVVV8';
    const d = parisDans0(20);
    const b = bon(veille, d.heure); b.course.date = d.date;
    courses.push({ ref: veille, statut: 'attente', cree_le: iso(maintenant - 20 * 3600000), bon: b });
    journal.push({ type_evenement: 'nouvelle_reservation', course_ref: veille, canal: 'telegram', statut: 'envoye', cree_le: iso(maintenant - 20 * 3600000) });
    journal.push({ type_evenement: 'nouvelle_reservation', course_ref: veille, canal: 'push', statut: 'envoye', cree_le: iso(maintenant - 20 * 3600000) });
    await relance();
    check('réservée la veille, départ dans 20 min, toujours en attente : elle SONNE', nbRappels(veille, 'telegram') === 1 && nbRappels(veille, 'push') === 1, String(nbRappels(veille, 'telegram')));
    const idRappelVeille = tgCorps.length;
    minutes(21); await relance();
    const finaux = journal.filter(j => j.course_ref === veille && j.type_evenement === 'rappel_final');
    check('à l\'heure du départ : un DERNIER message sur les deux canaux', finaux.length === 2 && finaux.some(j => j.canal === 'telegram' && j.statut === 'envoye') && finaux.some(j => j.canal === 'push'), JSON.stringify(finaux.map(j => j.canal + ':' + j.statut)));
    check('il dit que le départ est passé et que la course est à clore', /^DÉPART PASSÉ/.test(tg.at(-1) || '') && /clore/.test(tg.at(-1) || ''), (tg.at(-1) || '').split('\n')[0]);
    check('il efface le dernier rappel', effacements().includes(idRappelVeille), JSON.stringify(effacements()));
    const apresFinal = nbTg(veille), pushFinal = journal.filter(j => j.course_ref === veille && j.canal === 'push').length;
    minutes(1); await relance(); minutes(20); await relance(); minutes(60); await relance();
    check('PUIS PLUS RIEN : ni Telegram ni notification, une heure et demie durant', nbTg(veille) === apresFinal && journal.filter(j => j.course_ref === veille && j.canal === 'push').length === pushFinal,
      String(nbTg(veille) - apresFinal));
  }

  /* 7 ter. DEMANDE IMMÉDIATE (4 octobre 2026) : sa date est l'instant où
     elle a été faite, donc « déjà passée » au tour suivant. Comptée sur
     elle, elle recevait aussitôt le message final, puis le silence. Sa
     référence est création + 30 min. */
  {
    const asap = 'ELA-26-09-IMMD9';
    const d = parisDans0(0), b = bon(asap, d.heure); b.course.date = d.date; b.course.immediat = true;
    courses.push({ ref: asap, statut: 'attente', cree_le: iso(maintenant), bon: b });
    journal.push({ type_evenement: 'nouvelle_reservation', course_ref: asap, canal: 'telegram', statut: 'envoye', cree_le: iso(maintenant) });
    journal.push({ type_evenement: 'nouvelle_reservation', course_ref: asap, canal: 'push', statut: 'envoye', cree_le: iso(maintenant) });
    minutes(1); await relance();
    const finauxTot = journal.filter(j => j.course_ref === asap && j.type_evenement === 'rappel_final');
    check('demande immédiate, 1 min après : PAS de message final « départ passé »', finauxTot.length === 0, String(finauxTot.length));
    check('…et la notification sonne (alarme pleine)', nbRappels(asap, 'push') >= 1, String(nbRappels(asap, 'push')));
    minutes(5); await relance();
    check('demande immédiate : Telegram rappelle toutes les 5 min (comme un départ imminent)', nbRappels(asap, 'telegram') >= 1, String(nbRappels(asap, 'telegram')));
    minutes(26); await relance();
    const finaux = journal.filter(j => j.course_ref === asap && j.type_evenement === 'rappel_final' && j.canal === 'telegram');
    check('demande immédiate, 32 min sans réponse : un dernier message', finaux.length === 1, String(finaux.length));
    check('il dit « demande immédiate sans réponse »', /^DEMANDE IMMÉDIATE/.test(tg.at(-1) || '') && /Rappelez le client/.test(tg.at(-1) || ''), (tg.at(-1) || '').split('\n')[0]);
  }

  /* 7 quater. RÉSERVÉE POUR LA MINUTE MÊME, sans « Maintenant » (4 octobre
     2026, trouvé par une relecture indépendante). L'heure proposée par le
     site vaut souvent la minute en cours ; le départ était donc « passé »
     au tour suivant — message final, plus d'alarme, pour la demande la
     plus pressée. Elle doit sonner comme une demande immédiate, puis
     recevoir son dernier message après 30 min sans réponse. */
  {
    const presse = 'ELA-26-09-PRES7';
    const d = parisDans0(0), b = bon(presse, d.heure); b.course.date = d.date;
    courses.push({ ref: presse, statut: 'attente', cree_le: iso(maintenant), bon: b });
    journal.push({ type_evenement: 'nouvelle_reservation', course_ref: presse, canal: 'telegram', statut: 'envoye', cree_le: iso(maintenant) });
    journal.push({ type_evenement: 'nouvelle_reservation', course_ref: presse, canal: 'push', statut: 'envoye', cree_le: iso(maintenant) });
    minutes(1); await relance();
    const tot = journal.filter(j => j.course_ref === presse && j.type_evenement === 'rappel_final');
    check('réservée pour la minute même, 1 min après : PAS de « départ passé »', tot.length === 0, String(tot.length));
    check('…et l\'alarme sonne', nbRappels(presse, 'push') >= 1, String(nbRappels(presse, 'push')));
    minutes(31); await relance();
    const fin = journal.filter(j => j.course_ref === presse && j.type_evenement === 'rappel_final' && j.canal === 'telegram');
    check('32 min sans réponse : un dernier message, qui dit que le départ est passé', fin.length === 1 && /^DÉPART PASSÉ/.test(tg.at(-1) || ''), String(fin.length) + ' ' + (tg.at(-1) || '').split('\n')[0]);
  }

  /* 8. Une alerte qui a ÉCHOUÉ est rattrapée, sans tempête toutes les 20 s. */
  courses.push({ ref: 'ELA-26-09-CCCC3', statut: 'attente', cree_le: iso(maintenant - 15 * 60000), bon: bon('ELA-26-09-CCCC3', '20:00') });
  journal.push({ type_evenement: 'nouvelle_reservation', course_ref: 'ELA-26-09-CCCC3', canal: 'telegram', statut: 'echec', cree_le: iso(maintenant - 15 * 60000) });
  const avant2 = tg.length; await relance();
  check('Telegram en panne au premier envoi : la demande est RATTRAPÉE', tg.length === avant2 + 1 && tg.at(-1).includes('CCCC3'), String(tg.length - avant2));
  check('et annoncée comme une NOUVELLE demande, pas comme un rappel', /^Nouvelle demande/.test(tg.at(-1) || ''), (tg.at(-1) || '').split('\n')[0]);
  const apresRattrapage = nbTg('ELA-26-09-CCCC3'); maintenant += 20000; await relance();
  check('nouvel appel 20 s après : pas de tempête', nbTg('ELA-26-09-CCCC3') === apresRattrapage, String(nbTg('ELA-26-09-CCCC3')));

  /* 8 bis. LES SAISIES DE L'EXPLOITANT (sans empreinte de dépôt) : rien. */
  {
    const mienne = 'ELA-26-09-MMMM9';
    const b = bon(mienne, '19:00'); delete b.securite;
    courses.push({ ref: mienne, statut: 'attente', cree_le: iso(maintenant - 90000), bon: b });
    await relance();
    check('une course saisie par l\'exploitant n\'est PAS rattrapée', nbTg(mienne) === 0 && !journal.some(j => j.course_ref === mienne), String(nbTg(mienne)));
    minutes(4); await relance();
    check('…ni relancée', nbTg(mienne) === 0 && !journal.some(j => j.course_ref === mienne));
  }

  /* 9. Hors fenêtre de 6 h : on ne réveille pas l'historique. */
  courses.push({ ref: 'ELA-26-09-DDDD4', statut: 'attente', cree_le: iso(maintenant - 7 * 3600000), bon: bon('ELA-26-09-DDDD4') });
  const avant3 = tg.length; await relance();
  check('une vieille demande (7 h) ne sonne pas la nuit', tg.length === avant3, String(tg.length - avant3));

  /* 10. Le contenu vient du SERVEUR, jamais de l'appel. */
  await relance({ type: 'RELANCE', record: { bon: { course: { departPublic: 'CLIQUEZ http://pirate' } } } });
  check('aucun texte venu de l\'appel n\'est envoyé', !tg.some(t => t.includes('pirate')));

  /* 11. Le chemin d'origine (webhook INSERT) est intact. */
  courses.push({ ref: 'ELA-26-09-EEEE5', statut: 'attente', cree_le: iso(maintenant - 5000), bon: bon('ELA-26-09-EEEE5') });
  const avant4 = tg.length;
  globalThis.fetch = ((f) => async (url, init) => String(url).includes('/rest/v1/courses?select=ref,bon,cree_le&ref=eq.')
    ? new Response(JSON.stringify(courses.filter(c => c.ref === decodeURIComponent(String(url).match(/ref=eq\.([^&]+)/)[1]))))
    : f(url, init))(globalThis.fetch);
  await relance({ type: 'INSERT', table: 'courses', record: { ref: 'ELA-26-09-EEEE5' } });
  check('le webhook INSERT annonce toujours la nouvelle demande', tg.length === avant4 + 1, String(tg.length - avant4));
  /* Le N° court (5 octobre 2026) : la base le recopie dans le bon. En tête
     du message quand il y est, absent sinon — avant la migration. */
  check('sans N° dans le bon, l\'alerte n\'en invente pas', !/N° \d/.test(tg[tg.length - 1] || ''));
  courses.push({ ref: 'ELA-26-09-NNNN7', statut: 'attente', cree_le: iso(maintenant - 5000), bon: { ...bon('ELA-26-09-NNNN7'), numero: 1043 } });
  { const n = tg.length; await relance({ type: 'INSERT', table: 'courses', record: { ref: 'ELA-26-09-NNNN7' } });
    check('l\'alerte porte le N° court attribué par la base', tg.length === n + 1 && (tg[tg.length - 1] || '').includes('N° 1043'), (tg[tg.length - 1] || '').split('\n').slice(0, 3).join(' | '));
    /* 9 octobre 2026 : « je voudrais que tous les numéros soient pareils ».
       Le N° court tient SEUL la tête de l'annonce ; la référence longue, clé
       technique, descend en fin de message et y reste cherchable. */
    const lignesN = (tg[tg.length - 1] || '').split('\n');
    /* Le texte Telegram est « titre, ligne vide, corps » : le corps commence à la troisième ligne. */
    check('l\'annonce commence par le N° court seul', lignesN[2] === 'N° 1043', lignesN.slice(0, 3).join(' | '));
    check('…et la référence longue est en fin de message, pas en tête', lignesN.slice(1).includes('Réf. ELA-26-09-NNNN7'), lignesN.slice(-3).join(' | ')); }
  { const b = bon('ELA-26-09-FFFF6'); delete b.securite;
    courses.push({ ref: 'ELA-26-09-FFFF6', statut: 'attente', cree_le: iso(maintenant - 5000), bon: b });
    const n = tg.length; await relance({ type: 'INSERT', table: 'courses', record: { ref: 'ELA-26-09-FFFF6' } });
    check('le webhook INSERT ignore une saisie de l\'exploitant (collée, saisie au téléphone)', tg.length === n, String(tg.length - n)); }
  /* 11 bis. LES RAPPELS DISENT LE N° COURT (9 octobre 2026). Une course
     numérotée est rappelée « N° 1044 — … », jamais « Réf. ELA-… » ; sans N°,
     la référence reste. Départ le surlendemain : loin de toute fenêtre. */
  { const bNum = bon('ELA-26-09-NNNN8'); bNum.course.date = '2026-10-02'; bNum.numero = 1044;
    const bSans = bon('ELA-26-09-EEEE8'); bSans.course.date = '2026-10-02';
    courses.push({ ref: 'ELA-26-09-NNNN8', statut: 'attente', cree_le: iso(maintenant - 5000), bon: bNum });
    courses.push({ ref: 'ELA-26-09-EEEE8', statut: 'attente', cree_le: iso(maintenant - 5000), bon: bSans });
    await relance({ type: 'INSERT', table: 'courses', record: { ref: 'ELA-26-09-NNNN8' } });
    await relance({ type: 'INSERT', table: 'courses', record: { ref: 'ELA-26-09-EEEE8' } });
    minutes(2); await relance();
    const rappelDe = (ref) => tgCorps.filter(c => /toujours en attente/.test(c.text || '') && (c.reply_markup?.inline_keyboard?.[1]?.[0]?.url || '').includes(ref)).at(-1);
    const rN = rappelDe('ELA-26-09-NNNN8'), rS = rappelDe('ELA-26-09-EEEE8');
    const corpsDe = (c) => (c.text || '').split('\n\n').slice(1).join('\n\n');
    check('le rappel Telegram d\'une course numérotée commence par son N° court', !!rN && corpsDe(rN).startsWith('N° 1044 — '), rN ? corpsDe(rN).split('\n')[0] : 'aucun rappel');
    check('…et ne met plus la référence longue en tête', !!rN && !/^Réf\./.test(corpsDe(rN)), rN ? corpsDe(rN).split('\n')[0] : 'aucun rappel');
    check('sans N°, le rappel garde la référence', !!rS && corpsDe(rS).startsWith('Réf. ELA-26-09-EEEE8 — '), rS ? corpsDe(rS).split('\n')[0] : 'aucun rappel'); }
  /* 12. LA PASTILLE, MÊME ADMIN FERMÉ. Le service worker est le seul code
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
  /* 13. LE BOUTON « VU » : l'installation et la fonction qui le reçoit
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
  /* 14. LE CLIENT PAS ENCORE PRÉVENU (24 octobre 2026, Barbaros : « un
     pense-bête qui m'empêche d'oublier »). L'admin pose « aPrevenir » sur
     une course confirmée, refusée, annulée ou modifiée ; tant qu'il reste,
     Telegram le rappelle : à 15 min, puis une dernière fois à H-3 — deux au
     plus, jamais après le départ, jamais quand le client a payé. */
  {
    const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const paris = (ms) => { const [d, h] = fmt.format(new DateReel(ms)).split(' '); return { date: d, heure: h }; };
    const aPrev = (ref, statut, type, departDans, plus = {}) => {
      const { date, heure } = paris(maintenant + departDans);
      return { ref, statut, cree_le: iso(maintenant - 2 * 86400000), bon: { ref, numero: 700, securite: { empreinteDepot: 'e' },
        client: { nom: 'Jeanne Martin', telephone: '06 12 34 56 78' },
        course: { departPublic: 'Gare de Lyon, Paris', arriveePublic: 'Orly', date, heure, vehicule: 'Berline' },
        prix: { total: 60 }, aPrevenir: { type, depuis: iso(maintenant) }, ...plus } };
    };
    const rappels = (ref) => journal.filter(j => j.course_ref === ref && j.type_evenement === 'client_a_prevenir');
    const corpsDe = (ref) => tgCorps.filter(c => rappels(ref).length && c.text.includes('N° 700') && c.text.includes('CLIENT PAS PRÉVENU'));
    journal = []; tg = []; tgCorps = [];
    courses = [aPrev('ELA-26-10-PREV1', 'confirmee', 'confirmation', 6 * 3600000)];
    let rep = await relance();
    check('client pas prévenu : rien à la minute du geste', rappels('ELA-26-10-PREV1').length === 0, rep);
    minutes(10); await relance();
    check('client pas prévenu : rien à 10 min — Barbaros est sans doute en train de le faire', rappels('ELA-26-10-PREV1').length === 0);
    minutes(5); rep = await relance();
    check('client pas prévenu : un rappel Telegram à 15 min', rappels('ELA-26-10-PREV1').length === 1, rep);
    check('le bilan de la relance le compte', /1 rappel\(s\) « client pas prévenu »/.test(rep), rep);
    const premier = tgCorps.at(-1) || { text: '' };
    check('le titre dit le risque, avec le N° et l\'heure du rendez-vous', /^CLIENT PAS PRÉVENU — N° 700, \d{2}\/\d{2} \d{2}:\d{2}/.test(premier.text), premier.text.split('\n')[0]);
    check('le corps dit le bouton à toucher', premier.text.includes('« Prévenir le client »') && premier.text.includes('lien de paiement'), premier.text.replace(/\n/g, ' | '));
    check('ni le nom ni le téléphone du client dans le message (RGPD 5.1.c)', !/Jeanne|Martin|06 12|0612/.test(premier.text));
    const clavier = JSON.stringify(premier.reply_markup || {});
    check('un seul bouton, « Ouvrir la course » — pas de « Vu », qui arrête les rappels des demandes en attente', clavier.includes('Ouvrir la course') && !clavier.includes('vu:'), clavier);
    minutes(5); await relance(); minutes(40); await relance();
    check('pas de rafale : rien de plus avant H-3', rappels('ELA-26-10-PREV1').length === 1, String(rappels('ELA-26-10-PREV1').length));
    maintenant += 3 * 3600000 - 59 * 60000; await relance();   // départ dans ~2 h 59
    check('un dernier rappel à H-3', rappels('ELA-26-10-PREV1').length === 2, String(rappels('ELA-26-10-PREV1').length));
    check('il se dit le dernier', /^DERNIER RAPPEL — CLIENT PAS PRÉVENU/.test((tgCorps.at(-1) || {}).text || ''), ((tgCorps.at(-1) || {}).text || '').split('\n')[0]);
    minutes(60); await relance(); minutes(60); await relance();
    check('deux au plus : plus rien ensuite', rappels('ELA-26-10-PREV1').length === 2, String(rappels('ELA-26-10-PREV1').length));

    /* Un nouveau geste repart de zéro ; un message ouvert éteint tout. */
    courses[0].bon.aPrevenir = { type: 'confirmation', depuis: iso(maintenant) };
    minutes(16); await relance();
    check('un NOUVEAU geste (nouveau chauffeur) repart de zéro : nouveau rappel à 15 min', rappels('ELA-26-10-PREV1').length === 3, String(rappels('ELA-26-10-PREV1').length));

    /* Ce qui ne doit JAMAIS sonner. */
    journal = []; tgCorps = [];
    courses = [
      aPrev('ELA-26-10-PAYE1', 'confirmee', 'confirmation', 5 * 3600000, { paye: '2026-10-24T08:00:00Z' }),
      aPrev('ELA-26-10-INCO1', 'refusee', 'confirmation', 5 * 3600000),
      aPrev('ELA-26-10-SANS1', 'refusee', 'refus', 5 * 3600000, { client: { nom: 'X' } }),
      aPrev('ELA-26-10-PASS1', 'annulee', 'annulation', 10 * 60000),
      aPrev('ELA-26-10-REAL1', 'realisee', 'confirmation', 5 * 3600000),
    ];
    minutes(20); await relance();
    check('un client qui a PAYÉ a reçu son lien : aucun rappel', rappels('ELA-26-10-PAYE1').length === 0);
    check('un pense-bête qui ne correspond plus à l\'état (confirmation sur une course refusée) : aucun rappel', rappels('ELA-26-10-INCO1').length === 0);
    check('sans téléphone, personne à prévenir : aucun rappel', rappels('ELA-26-10-SANS1').length === 0);
    check('départ passé : aucun rappel', rappels('ELA-26-10-PASS1').length === 0);
    check('une course réalisée n\'est même pas lue', rappels('ELA-26-10-REAL1').length === 0);

    /* Le refus dit qu'un client attend peut-être une voiture. */
    journal = []; tgCorps = [];
    courses = [aPrev('ELA-26-10-REFU1', 'refusee', 'refus', 4 * 3600000)];
    minutes(16); await relance();
    const tRefus = (tgCorps.at(-1) || {}).text || '';
    check('un refus pas encore dit : rappel « il attend peut-être une voiture »', rappels('ELA-26-10-REFU1').length === 1 && /refusée/.test(tRefus) && /attend peut-être une voiture/.test(tRefus) && tRefus.includes('« Prévenir le client du refus »'), tRefus.replace(/\n/g, ' | '));

    /* Une demande immédiate n'a pas de rendez-vous : 15 min, puis 45 min. */
    journal = []; tgCorps = [];
    courses = [aPrev('ELA-26-10-IMME1', 'confirmee', 'confirmation', 0)];
    courses[0].bon.course.immediat = true;
    minutes(16); await relance();
    check('demande immédiate : premier rappel à 15 min (son « départ » est déjà passé, il ne compte pas)', rappels('ELA-26-10-IMME1').length === 1);
    check('…et le titre dit IMMÉDIAT', /CLIENT PAS PRÉVENU — N° 700, IMMÉDIAT/.test((tgCorps.at(-1) || {}).text || ''));
    minutes(20); await relance();
    check('demande immédiate : rien entre les deux', rappels('ELA-26-10-IMME1').length === 1);
    minutes(10); await relance();
    check('demande immédiate : le dernier à 45 min', rappels('ELA-26-10-IMME1').length === 2);

    /* Les deux tâches sont indépendantes. */
    lecturePrevenirKo = true;
    const att = { ref: 'ELA-26-10-ATTE9', statut: 'attente', cree_le: iso(maintenant - 2 * 60000), bon: bon('ELA-26-10-ATTE9', '23:00') };
    courses = [att];
    const avantTg = tg.length; rep = await relance();
    check('une lecture refusée du côté « client pas prévenu » est dite dans le bilan', /client pas prévenu : lecture refusée \(500\)/.test(rep), rep);
    check('…et n\'empêche pas la relance des demandes en attente', tg.length > avantTg && tg.slice(avantTg).some(x => x.includes('ATTE9') || /Nouvelle demande/.test(x)), rep);
    lecturePrevenirKo = false;
  }
} catch (x) { ko.push('PLANTAGE — ' + x.message); }

console.log(`=== RÉUSSIS (${ok.length}) ===`); ok.forEach(x => console.log('  ✓ ' + x));
if (ko.length) { console.log(`=== ÉCHECS (${ko.length}) ===`); ko.forEach(x => console.log('  ✗ ' + x)); process.exit(1); }
