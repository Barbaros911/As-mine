/* =====================================================================
   TEST-PILOTAGE — l'assistant répond juste, la sentinelle sonne juste
   ---------------------------------------------------------------------
   02/10/2026, à la demande de Barbaros : un assistant de pilotage qui dit
   ce qui se passe et ce qui demande une intervention, et plusieurs filets
   pour qu'aucune réservation ne passe inaperçue.
   Ce qu'on éprouve, sans Deno ni réseau (code dépouillé de ses types, faux
   serveur, horloge fixée à la main) :
   · les questions (aujourd'hui, demain, urgent, sans chauffeur, hôtel,
     statut, attention, résumé) rendent les bonnes courses — y compris
     entre minuit et 2 h, où UTC et Paris ne sont pas le même jour ;
   · AUCUNE réponse ne porte le nom, le téléphone ou la chambre du client ;
   · la sentinelle voit la demande jamais annoncée, la relance arrêtée,
     Telegram en panne, la confirmée sans chauffeur, le retard, les doublons
     — et se tait quand c'est réglé ;
   · le bot ne répond qu'à SA conversation, avec le secret du webhook, et
     n'écrit JAMAIS dans les courses ;
   · une lecture ratée ne rend jamais « rien d'urgent » ;
   · le bilan de santé public ne porte que des codes.
   Lancer :  node test-pilotage.mjs
   ===================================================================== */
import m from 'node:module'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ICI = path.dirname(fileURLToPath(import.meta.url));
const F = ICI + '/supabase/functions/';

/* L'arborescence des fonctions, recomposée en .mjs. */
const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'ela-pilotage-'));
for (const d of ['_shared', 'pilotage', 'telegram-bot']) {
  fs.mkdirSync(racine + '/' + d);
  for (const f of fs.readdirSync(F + d)) {
    let src = fs.readFileSync(F + d + '/' + f, 'utf8');
    if (f.endsWith('.ts')) src = m.stripTypeScriptTypes(src);
    src = src.replace(/(\.\.\/_shared\/[\w-]+)\.ts/g, '$1.mjs');
    fs.writeFileSync(racine + '/' + d + '/' + f.replace(/\.ts$/, '.mjs'), src);
  }
}
const P = await import(racine + '/_shared/pilotage.js');

const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));

/* 02/10/2026 à 10:00 heure de Paris (08:00 UTC). */
let maintenant = Date.parse('2026-10-02T08:00:00Z');
Date.now = () => maintenant;
const iso = (ms) => new Date(ms).toISOString();
const NOM = 'Jean-Baptiste Durandal', TEL = '06 98 76 54 32', CHAMBRE = '417';
const bon = (ref, date, heure, extra = {}) => ({
  ref, client: { nom: NOM, telephone: TEL },
  course: { depart: 'Ibis (ch. ' + CHAMBRE + ')', departPublic: 'easyHotel Aéroville', arriveePublic: 'Aéroport d\'Orly', date, heure, vehicule: 'Berline', passagers: '2 passagers', chambre: CHAMBRE },
  prix: { total: 90 }, provenance: 'easyHotel Aéroville', provenanceCle: 'easyhotel-aeroville', ...extra,
});
const C = (ref, statut, date, heure, extra = {}, creeIl = 3600000) => ({ ref, statut, cree_le: iso(maintenant - creeIl), bon: bon(ref, date, heure, extra) });
const avecCh = { chauffeur: { nom: 'Mehmet', telephone: '0611223344' } };

let courses = [
  C('ELA-26-10-URG01', 'attente', '2026-10-02', '10:40'),                       // attente, départ dans 40 min
  C('ELA-26-10-CONF1', 'confirmee', '2026-10-02', '10:20'),                     // confirmée sans chauffeur, H-20
  C('ELA-26-10-OKCH1', 'confirmee', '2026-10-02', '15:00', avecCh),             // en règle
  C('ELA-26-10-FAIT1', 'realisee', '2026-10-02', '07:00', avecCh),              // faite ce matin
  C('ELA-26-10-RETA1', 'confirmee', '2026-10-02', '08:00', { chauffeur: { nom: 'Ali', telephone: '0700000001' } }), // départ passé 2 h
  C('ELA-26-10-DEMA1', 'attente', '2026-10-03', '06:00'),                       // demain
  C('ELA-26-10-DEMA2', 'refusee', '2026-10-03', '07:00'),                       // demain mais refusée
  C('ELA-26-10-LOIN1', 'confirmee', '2026-10-20', '09:00', { provenance: '', provenanceCle: '' }), // lointaine, sans chauffeur
];
const journal = [];
const sante = { relance: iso(maintenant - 20000) };
const D = () => ({ courses, journal, sante });

try {
  /* ═══ 1. LES QUESTIONS ═══ */
  const a = P.analyser(courses);
  const refs = (l) => l.map(c => c.ref).join(',');
  check('aujourd\'hui : les 5 courses du jour, dans l\'ordre du départ', refs(a.aujourdhui) === 'ELA-26-10-FAIT1,ELA-26-10-RETA1,ELA-26-10-CONF1,ELA-26-10-URG01,ELA-26-10-OKCH1', refs(a.aujourdhui));
  check('demain : la refusée n\'est pas comptée', refs(a.demain) === 'ELA-26-10-DEMA1', refs(a.demain));
  check('urgent : l\'attente à H-40 et la confirmée sans chauffeur à H-20', refs(a.urgentes) === 'ELA-26-10-CONF1,ELA-26-10-URG01', refs(a.urgentes));
  check('urgent : la confirmée AVEC chauffeur n\'y est pas', !refs(a.urgentes).includes('OKCH1'));
  check('sans chauffeur : à venir seulement, la plus proche d\'abord', refs(a.sansChauffeur) === 'ELA-26-10-CONF1,ELA-26-10-URG01,ELA-26-10-DEMA1,ELA-26-10-LOIN1', refs(a.sansChauffeur));
  check('en retard : départ passé de plus de 30 min, ni faite ni refusée', refs(a.enRetard) === 'ELA-26-10-RETA1', refs(a.enRetard));

  /* Minuit-2 h : 00:30 à Paris le 3 octobre, encore le 2 en UTC. */
  const nuit = P.analyser(courses, Date.parse('2026-10-02T22:30:00Z'));
  check('à 00:30 heure de Paris, « aujourd\'hui » est le 3 (pas le 2 d\'UTC)', nuit.auj === '2026-10-03' && refs(nuit.aujourdhui) === 'ELA-26-10-DEMA1', nuit.auj + ' ' + refs(nuit.aujourdhui));

  const cmp = (t) => P.comprendre(t).type;
  check('comprendre : les huit questions', cmp('Aujourd\'hui') === 'aujourdhui' && cmp('/demain') === 'demain' && cmp('URGENT') === 'urgentes' && cmp('Sans chauffeur') === 'sans_chauffeur' && cmp('attention') === 'attention' && cmp('Résumé') === 'resume' && cmp('hotel easyhotel') === 'hotel' && cmp('ela-26-10-urg01') === 'statut');
  check('comprendre : la référence est lue', P.comprendre('où en est ELA-26-10-URG01 ?').ref === 'ELA-26-10-URG01');
  check('comprendre : une question inconnue rend l\'aide, jamais une réponse devinée', cmp('combien je gagne en 2030') === 'aide');

  const tout = ['aujourdhui', 'demain', 'urgentes', 'sans_chauffeur', 'attention', 'resume'].map(t => P.repondre({ type: t }, D()))
    .concat(P.repondre({ type: 'hotel', nom: 'easyhotel' }, D()), P.repondre({ type: 'statut', ref: 'ELA-26-10-URG01' }, { ...D(), course: courses[0] }));
  const fuite = tout.find(t => t.includes(NOM) || t.includes('Durandal') || t.replace(/\D/g, '').includes('0698765432') || /ch\.\s*417|chambre\s*417|\b417\b/.test(t));
  check('AUCUNE réponse ne porte le nom, le téléphone ou la chambre du client', !fuite, fuite ? fuite.slice(0, 160) : '');
  check('hôtel : les 7 courses de easyHotel, pas la lointaine sans provenance', /: 7 course/.test(tout[6]) && !tout[6].includes('LOIN1'), tout[6].split('\n')[0]);
  check('aujourd\'hui annonce le compte', /^Aujourd'hui : 5 course\(s\), dont 1 réalisée/.test(tout[0]), tout[0].split('\n')[0]);
  check('résumé : les chiffres et l\'état de la surveillance', /En attente de réponse : 2/.test(tout[5]) && /relance active/.test(tout[5]), tout[5]);
  check('statut : le parcours est dit, étape par étape, même ce qui manque', /Alerte Telegram : AUCUNE réussie/.test(tout[7]) && /Vue : pas encore/.test(tout[7]), tout[7]);
  check('statut d\'une référence absente : on dit qu\'elle n\'est jamais arrivée', /introuvable/.test(P.repondre({ type: 'statut', ref: 'ELA-26-10-ZZZZZ' }, { ...D(), course: null })));

  /* ═══ 2. LA SENTINELLE ═══ */
  courses.push(C('ELA-26-10-MUET1', 'attente', '2026-10-05', '12:00', {}, 4 * 60000)); // arrivée il y a 4 min
  journal.push({ type_evenement: 'nouvelle_reservation', course_ref: 'ELA-26-10-MUET1', canal: 'telegram', statut: 'echec', detail: '502', cree_le: iso(maintenant - 200000) });
  for (const c of courses) if (c.ref !== 'ELA-26-10-MUET1') journal.push({ type_evenement: 'nouvelle_reservation', course_ref: c.ref, canal: 'telegram', statut: 'envoye', cree_le: c.cree_le });
  let an = P.anomalies(courses, journal, sante);
  const cles = () => an.map(x => x.cle).sort().join(' ');
  check('demande arrivée il y a 4 min et jamais annoncée : critique', an.some(x => x.cle === 'non_annoncee:ELA-26-10-MUET1' && x.gravite === 'critique'), cles());
  check('une demande annoncée n\'est pas signalée', !an.some(x => x.cle === 'non_annoncee:ELA-26-10-URG01'));
  check('confirmée sans chauffeur à H-20 : critique, toutes les 5 min', an.some(x => x.cle === 'sans_chauffeur:ELA-26-10-CONF1' && x.gravite === 'critique' && x.cadence === 5 * 60000));
  check('confirmée sans chauffeur dans 18 jours : rien (pas de bruit)', !an.some(x => x.cle.includes('LOIN1')));
  check('départ passé non clos : signalé une fois', an.some(x => x.cle === 'retard:ELA-26-10-RETA1' && x.cadence === P.CADENCES.unique));
  check('relance qui tourne : pas d\'alerte système', !an.some(x => x.cle === 'systeme:relance'));

  check('relance muette depuis 5 min : critique', P.anomalies(courses, journal, { relance: iso(maintenant - 5 * 60000) }).some(x => x.cle === 'systeme:relance' && x.gravite === 'critique'));
  check('relance jamais vue : critique aussi', P.anomalies(courses, journal, {}).some(x => x.cle === 'systeme:relance'));
  const jEchec = [1, 2, 3].map(i => ({ type_evenement: 'rappel_reservation', course_ref: 'X', canal: 'telegram', statut: 'echec', detail: '401 Unauthorized', cree_le: iso(maintenant - i * 1000) }));
  check('trois envois Telegram en échec d\'affilée : critique', P.anomalies(courses, [...journal, ...jEchec], sante).some(x => x.cle === 'systeme:telegram'));

  const dbl = [...courses, C('ELA-26-10-DBL01', 'attente', '2026-10-05', '12:00'), C('ELA-26-10-CHX01', 'confirmee', '2026-10-02', '15:30', avecCh)];
  const anD = P.anomalies(dbl, journal, sante);
  check('même trajet, même jour, même heure : double réservation possible', anD.some(x => x.cle === 'doublon:ELA-26-10-DBL01+ELA-26-10-MUET1'), anD.map(x => x.cle).join(' '));
  check('même chauffeur sur deux départs à 30 min : signalé', anD.some(x => x.cle === 'chauffeur_double:ELA-26-10-CHX01+ELA-26-10-OKCH1'));

  /* Cadence et acquittement. */
  const s = an.find(x => x.cle === 'sans_chauffeur:ELA-26-10-CONF1');
  check('jamais dite : on la dit', P.aDire(s, null));
  check('dite il y a 2 min, cadence 5 min : on se tait', !P.aDire(s, { dernier_envoi: iso(maintenant - 120000) }));
  check('dite il y a 6 min : on la redit', P.aDire(s, { dernier_envoi: iso(maintenant - 360000) }));
  check('« Je m\'en occupe » : silence tant que l\'acquittement court', !P.aDire(s, { dernier_envoi: iso(maintenant - 3600000), acquittee_jusqu_au: iso(maintenant + 60000) }));
  check('… et elle revient s\'il expire sans que rien change', P.aDire(s, { dernier_envoi: iso(maintenant - 3600000), acquittee_jusqu_au: iso(maintenant - 1) }));
  check('une anomalie « unique » n\'est jamais répétée', !P.aDire(an.find(x => x.cle.startsWith('retard:')), { dernier_envoi: iso(maintenant - 30 * 86400000) }));

  const pub = P.sante(courses, journal, sante);
  check('bilan public : des codes, jamais une référence', !pub.ok && !JSON.stringify(pub).includes('ELA-') && pub.codes.includes('non_annoncee') && pub.codes.includes('sans_chauffeur'), JSON.stringify(pub));

  /* ═══ 3. LA FONCTION « pilotage » ═══ */
  let tg = [], ecritures = [], alertes = new Map(), santeTable = { relance: sante.relance, sentinelle: iso(maintenant - 30000) }, lectureEnPanne = false;
  globalThis.fetch = async (url, init = {}) => {
    url = String(url); const meth = (init.method || 'GET').toUpperCase();
    if (url.includes('api.telegram.org')) { const c = JSON.parse(init.body); tg.push({ methode: url.split('/').pop(), ...c }); return new Response('{"ok":true}'); }
    if (meth !== 'GET') ecritures.push({ meth, url, corps: init.body ? JSON.parse(init.body) : null });
    if (lectureEnPanne && url.includes('/courses')) return new Response('panne', { status: 503 });
    if (url.includes('/rest/v1/courses?') && meth === 'GET') {
      const r = /ref=eq\.([^&]+)/.exec(url);
      if (r) return new Response(JSON.stringify(courses.filter(c => c.ref === decodeURIComponent(r[1]))));
      return new Response(JSON.stringify(url.includes('statut=in.') ? courses.filter(c => ['attente', 'confirmee'].includes(c.statut)) : courses));
    }
    if (url.includes('journal_notifications_admin') && meth === 'GET') return new Response(JSON.stringify(journal));
    if (url.includes('sante_systeme') && meth === 'GET') return new Response(JSON.stringify(Object.entries(santeTable).map(([cle, maj]) => ({ cle, maj }))));
    if (url.includes('sante_systeme')) { const c = JSON.parse(init.body); santeTable[c.cle] = c.maj; return new Response(''); }
    if (url.includes('alertes_pilotage') && meth === 'GET') return new Response(JSON.stringify([...alertes.values()].filter(x => !x.resolue_le)));
    if (url.includes('alertes_pilotage') && meth === 'POST') { const c = JSON.parse(init.body); alertes.set(c.cle, { ...(alertes.get(c.cle) || {}), ...c }); return new Response(''); }
    if (url.includes('alertes_pilotage') && meth === 'PATCH') { const cle = decodeURIComponent(/cle=eq\.([^&]+)/.exec(url)[1]); const c = JSON.parse(init.body); if (alertes.has(cle)) alertes.set(cle, { ...alertes.get(cle), ...c }); return new Response(''); }
    if (url.includes('journal_assistant')) return new Response('');
    return new Response('?', { status: 404 });
  };
  const env = { SUPABASE_URL: 'http://sb', SUPABASE_SERVICE_ROLE_KEY: 'S', TELEGRAM_TOKEN: 't', TELEGRAM_CHAT: 'c' };
  let hp; globalThis.Deno = { env: { get: k => env[k] }, serve: f => { hp = f; } };
  await import(racine + '/pilotage/index.mjs');
  const appel = async (type) => hp(new Request('http://x', { method: 'POST', body: JSON.stringify({ type }) }));

  await appel('SENTINELLE');
  const envoyes = tg.filter(x => x.methode === 'sendMessage');
  check('sentinelle : les anomalies partent sur Telegram', envoyes.some(x => x.text.includes('JAMAIS annoncée')) && envoyes.some(x => x.text.includes('sans chauffeur')), String(envoyes.length));
  check('sentinelle : chaque alerte porte « Je m\'en occupe »', envoyes.every(x => JSON.stringify(x.reply_markup).includes('acq:')));
  check('sentinelle : son passage est écrit (chien de garde)', Date.parse(santeTable.sentinelle) === maintenant);
  const fuiteS = envoyes.find(x => x.text.includes(NOM) || x.text.replace(/\D/g, '').includes('0698765432') || /\b417\b/.test(x.text));
  check('sentinelle : aucune alerte ne porte nom, téléphone ou chambre', !fuiteS, fuiteS?.text || '');
  check('sentinelle : n\'écrit JAMAIS dans les courses', !ecritures.some(e => /\/rest\/v1\/courses/.test(e.url)), ecritures.map(e => e.meth + ' ' + e.url).join(' | '));
  const n1 = tg.length; maintenant += 60000; await appel('SENTINELLE');
  check('une minute plus tard : rien n\'est répété (cadence tenue)', tg.length === n1, String(tg.length - n1));
  maintenant += 5 * 60000; santeTable.relance = iso(maintenant - 10000);
  await appel('SENTINELLE');
  check('6 min plus tard : la confirmée sans chauffeur à H-20 est redite', tg.slice(n1).some(x => x.text?.includes('CONF1')));
  check('… mais pas le retard, dit une seule fois', !tg.slice(n1).some(x => x.text?.includes('RETA1')));
  /* Un chauffeur est saisi : l'alerte se ferme et se tait. */
  courses.find(c => c.ref === 'ELA-26-10-CONF1').bon.chauffeur = { nom: 'Mehmet', telephone: '0611223344' };
  const n2 = tg.length; maintenant += 6 * 60000; santeTable.relance = iso(maintenant - 10000);
  await appel('SENTINELLE');
  check('chauffeur saisi : l\'alerte est fermée', !!alertes.get('sans_chauffeur:ELA-26-10-CONF1')?.resolue_le);
  check('… et plus rien ne sonne pour elle', !tg.slice(n2).some(x => x.text?.includes('CONF1')));

  const r1 = await (await appel('SANTE')).json();
  check('SANTE : des codes seulement', !JSON.stringify(r1).includes('ELA-') && Array.isArray(r1.codes), JSON.stringify(r1));
  santeTable.sentinelle = iso(maintenant - 10 * 60000);
  const r2 = await (await appel('SANTE')).json();
  check('SANTE : une sentinelle arrêtée depuis 10 min est signalée', r2.ok === false && r2.codes.includes('sentinelle'), JSON.stringify(r2));
  lectureEnPanne = true;
  const r3 = await (await appel('SANTE')).json();
  check('SANTE : base illisible → « lecture_base », jamais « ok »', r3.ok === false && r3.codes.includes('lecture_base'), JSON.stringify(r3));
  lectureEnPanne = false;
  const nIgn = tg.length; await hp(new Request('http://x', { method: 'POST', body: JSON.stringify({ type: 'INSERT', table: 'courses', record: { ref: 'ELA-26-10-FAUX1' } }) }));
  check('un corps inventé n\'envoie rien', tg.length === nIgn);

  /* ═══ 4. LE BOT : QUESTIONS ET « JE M'EN OCCUPE » ═══ */
  let hb; globalThis.Deno = { env: { get: k => env[k] }, serve: f => { hb = f; } };
  await import(racine + '/telegram-bot/index.mjs');
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('t:webhook-ela'));
  const secret = Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
  const msg = (text, chat = 'c', sec = secret) => hb(new Request('http://x', { method: 'POST', headers: sec ? { 'x-telegram-bot-api-secret-token': sec } : {}, body: JSON.stringify({ message: { message_id: 1, chat: { id: chat }, from: { id: 9, is_bot: false }, text } }) }));
  const reponses = () => tg.filter(x => x.methode === 'sendMessage');

  check('question sans le secret du webhook : refusée (401)', (await msg('urgent', 'c', '')).status === 401);
  let n = reponses().length; ecritures = [];
  await msg('urgent', 'inconnu');
  check('question d\'une AUTRE conversation : aucune réponse', reponses().length === n);
  check('… et elle est journalisée comme refusée', ecritures.some(e => e.url.includes('journal_assistant') && e.corps.statut === 'refuse'));
  n = reponses().length; ecritures = [];
  await msg('Urgent');
  const rep = reponses()[n];
  check('sa question « Urgent » reçoit la liste', !!rep && /^Urgent :/.test(rep.text) && rep.chat_id === 'c', rep?.text?.slice(0, 80));
  check('la réponse porte le clavier de questions', JSON.stringify(rep?.reply_markup || {}).includes('Sans chauffeur'));
  check('la question est journalisée', ecritures.some(e => e.url.includes('journal_assistant') && e.corps.action === 'question:urgentes' && e.corps.statut === 'ok'));
  check('le bot n\'écrit JAMAIS dans les courses', !ecritures.some(e => /\/rest\/v1\/courses/.test(e.url)));
  n = reponses().length; await msg('ELA-26-10-MUET1');
  check('une référence rend son parcours', /Arrivée sur le serveur : oui/.test(reponses()[n]?.text || ''), reponses()[n]?.text);
  lectureEnPanne = true; n = reponses().length; await msg('urgent');
  check('serveur muet : « je ne peux rien affirmer », jamais « rien d\'urgent »', /injoignable/.test(reponses()[n]?.text || '') && !/Rien d'urgent/.test(reponses()[n]?.text || ''), reponses()[n]?.text);
  lectureEnPanne = false;

  alertes.set('retard:ELA-26-10-RETA1', { cle: 'retard:ELA-26-10-RETA1', resolue_le: null });
  ecritures = [];
  const acq = await hb(new Request('http://x', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': secret }, body: JSON.stringify({ callback_query: { id: 'q', data: 'acq:retard:ELA-26-10-RETA1', message: { message_id: 3, chat: { id: 'c' } } } }) }));
  const jusqua = Date.parse(alertes.get('retard:ELA-26-10-RETA1').acquittee_jusqu_au);
  check('« Je m\'en occupe » : silence de 30 min, pas plus', acq.status === 200 && jusqua - maintenant === 30 * 60000, String((jusqua - maintenant) / 60000));
  check('… journalisé', ecritures.some(e => e.url.includes('journal_assistant') && e.corps.action === 'acquitter'));
  ecritures = [];
  await hb(new Request('http://x', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': secret }, body: JSON.stringify({ callback_query: { id: 'q', data: 'acq:retard:ELA-26-10-RETA1', message: { message_id: 3, chat: { id: 'autre' } } } }) }));
  check('« Je m\'en occupe » d\'une autre conversation : sans effet', !ecritures.some(e => e.url.includes('alertes_pilotage')));

  /* ═══ 5. LES BRANCHEMENTS ═══ */
  const nd = fs.readFileSync(F + 'nouvelle-demande/index.ts', 'utf8');
  check('le webhook Telegram écoute aussi les messages', /allowed_updates:\["callback_query","message"\]/.test(nd));
  check('la relance écrit son passage', /cle:"relance"/.test(nd));
  check('a-coller.ts suit index.ts', fs.readFileSync(F + 'nouvelle-demande/a-coller.ts', 'utf8').includes('cle:"relance"'));
  const yml = fs.readFileSync(ICI + '/.github/workflows/fonctions.yml', 'utf8');
  check('la fonction pilotage est déployée, jeton vérifié', /functions deploy pilotage --project-ref/.test(yml) && !/deploy pilotage --no-verify-jwt/.test(yml));
  const mig = fs.readFileSync(ICI + '/supabase/migrations/20261002000000_assistant_pilotage.sql', 'utf8');
  check('migration : les trois tables fermées à anon', (mig.match(/revoke all on public\.\w+ from anon, authenticated/g) || []).length === 3);
  check('migration : aucune clé service_role écrite', !/service_role|eyJ[A-Za-z0-9_-]{20,}/.test(mig.replace(/--.*$/gm, '')));
  check('migration : la sentinelle chaque minute', /'ela-sentinelle',\s*'\* \* \* \* \*'/.test(mig));
} catch (x) { ko.push('PLANTAGE — ' + (x.stack || x.message)); }

console.log(`=== RÉUSSIS (${ok.length}) ===`); ok.forEach(x => console.log('  ✓ ' + x));
if (ko.length) { console.log(`=== ÉCHECS (${ko.length}) ===`); ko.forEach(x => console.log('  ✗ ' + x)); process.exit(1); }
