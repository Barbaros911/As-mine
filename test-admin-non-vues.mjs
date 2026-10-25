/* =====================================================================
   TEST-ADMIN-NON-VUES.MJS — une demande que personne n'a vue se VOIT
   ---------------------------------------------------------------------
   25 octobre 2026, P0 (étape 2). Une réservation de la réception, passée
   par l'outil, a été vue avec plus de 30 min de retard : elle était dans
   la liste, sans rien qui dise que personne ne l'avait vue.

   Ce qu'on éprouve, sur le site construit :
   - une demande du site en attente, non vue : un bandeau rouge dit depuis
     quand elle attend, si l'alerte est partie, combien de fois, la
     dernière quand ; CRITIQUE passé 10 min ;
   - vue dans Telegram (journal « vue ») ou saisie par l'exploitant : rien ;
   - plusieurs : le nombre, et la plus ancienne ;
   - toucher le bandeau ouvre la course, la dit vue au serveur, le bandeau
     disparaît ; à l'ouverture de l'admin, une non vue fait sonner la page
     (la première lecture ne sonnait jamais) ;
   - 390 × 844 : la première demande de la liste reste entière à l'écran ;
   - l'alerte d'essai : la demande part au serveur, le résultat lu dans le
     journal s'affiche ; sans la migration, le bouton le dit ;
   - « État du système » : les rappels automatiques et la notification ELA,
     « non mesuré » quand le serveur ne les rend pas.
   Port 8142, propre à cette suite.
   Lancer :  node test-admin-non-vues.mjs
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
await new Promise(r => serveur.listen(8142, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8142';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = (b, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(b) });

const SAIN = { sans_alerte: 0, relance_active: true, derniere_relance_s: 12, relances_echouees_15min: 0,
  telegram_echecs_1h: 0, telegram_ok_1h: 3, demandes_24h: 5,
  relance_ok_s: 15, push_ok_1h: 4, push_echecs_1h: 0, abonnes_push: 1 };
const demain = new Date(Date.now() + 86400e3).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10);
const ilYa = (min) => new Date(Date.now() - min * 60000).toISOString();
const demande = (ref, numero, recueIlYaMin, site = true) => ({ ref, numero, statut: 'attente', cree: ilYa(recueIlYaMin),
  course: { depart: 'easyHotel Paris CDG Airport, chambre 412', departPublic: 'easyHotel Paris CDG Airport', arrivee: 'Aéroport Paris-Orly, Terminal 3',
    date: demain, heure: '07:00', vehicule: 'Berline', vehiculeCle: 'berline', passagers: '2 passagers', vol: '' },
  client: { nom: 'Jeanne Martin', telephone: '06 12 34 56 78' }, prix: { total: 90 }, langue: 'fr',
  ...(site ? { securite: { empreinteDepot: 'e'.repeat(64) } } : {}) });
const alertes = (ref, n, derniereIlYaMin) => Array.from({ length: n }, (_, i) => ({ course_ref: ref, type_evenement: i ? 'rappel_reservation' : 'nouvelle_reservation',
  canal: i % 2 ? 'push' : 'telegram', statut: 'envoye', cree_le: ilYa(derniereIlYaMin + (n - 1 - i)) }));
const SESSION = { access_token: 'JETON', refresh_token: 'R', token_type: 'bearer', user: { id: 'u-barbaros' } };

const erreurs = [];
const nav = await chromium.launch();
async function ouvrir(etat, { largeur = 390, hauteur = 844 } = {}) {
  const ctx = await nav.newContext({ viewport: { width: largeur, height: hauteur }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  await ctx.addInitScript(({ session }) => {
    window.__notes = 0;
    const C = window.AudioContext;
    window.AudioContext = function(){ const c = new C(); const o = c.createOscillator.bind(c);
      c.createOscillator = () => { window.__notes++; return o(); }; return c; };
    if (sessionStorage.getItem('__pose')) return;
    sessionStorage.setItem('__pose', '1');
    localStorage.setItem('ela_nuage_session', JSON.stringify(session));
    localStorage.setItem('ela_acces_verifie', session.user.id);
    localStorage.setItem('ela_bookings', '[]');
  }, { session: SESSION });
  etat.vues = []; etat.essais = 0; etat.lecturesJournal = [];
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url();
    if (u.startsWith(BASE)) return route.continue();
    if (!u.includes('supabase.co')) return route.abort();
    if (u.includes('/rpc/ela_sante_alertes')) return route.fulfill(J(etat.sante || SAIN));
    if (u.includes('/rpc/ela_marquer_vue')) { etat.vues.push(req.postData()); return route.fulfill({ status: 204, body: '' }); }
    if (u.includes('/rpc/ela_demander_essai_alerte')) {
      etat.essais++;
      if (typeof etat.essai === 'number') return route.fulfill(J({ code: 'PGRST202', message: 'Could not find the function' }, etat.essai));
      return route.fulfill(J(etat.essai || { ok: true, dans_s: 30 }));
    }
    if (u.includes('/rest/v1/journal_notifications_admin')) {
      etat.lecturesJournal.push(decodeURIComponent(u));
      if (u.includes('type_evenement=eq.essai')) return route.fulfill(J(etat.journalEssai || []));
      if (u.includes('course_ref=in.')) return route.fulfill(J(etat.journal || []));
      return route.fulfill(J([]));
    }
    if (u.includes('/rpc/ela_reactivite')) {
      etat.periodes = (etat.periodes || []).concat(JSON.parse(req.postData() || '{}').p_periode);
      if (typeof etat.reactivite === 'number') return route.fulfill(J({ code: 'PGRST202', message: 'Could not find the function' }, etat.reactivite));
      return route.fulfill(J(etat.reactivite || { demandes: 0, alertes_echec: 0 }));
    }
    if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
    if (u.includes('/rpc/role_operateur')) return route.fulfill(J('admin'));
    if (u.includes('/rpc/presences_operateurs')) return route.fulfill(J([]));
    if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J({ ok: true }));
    if (u.includes('/rest/v1/courses')) {
      const liste = etat.courses || [];
      if (u.includes('select=ref')) return route.fulfill(J(liste.slice(0, 1).map(c => ({ ref: c.ref, version: 1, modifie_le: '2026-10-04T08:00:00Z' }))));
      return route.fulfill(J(liste.map(c => ({ bon: c, statut: c.statut, version: 1, modifie_le: '2026-10-04T08:00:00Z', cree_le: c.cree }))));
    }
    return route.fulfill(J([]));
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/ela-admin/');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 10000 });
  return { ctx, p };
}
const bandeau = p => p.evaluate(() => {
  const b = document.getElementById('bordNonVues');
  return b && !b.hidden ? { texte: b.innerText.replace(/\s+/g, ' ').trim(), critique: b.classList.contains('critique') } : null;
});
const attendreBandeau = (p, motif, ms = 8000) => p.waitForFunction(m => {
  const b = document.getElementById('bordNonVues'); return !!b && !b.hidden && new RegExp(m).test(b.innerText);
}, motif, { timeout: ms }).then(() => true, () => false);

try {
  /* A. UNE NON VUE, REÇUE IL Y A 3 MIN, 7 ALERTES PARTIES. */
  {
    const etat = { courses: [demande('ELA-26-10-K7M2P', 1052, 3)], journal: alertes('ELA-26-10-K7M2P', 7, 1) };
    const { ctx, p } = await ouvrir(etat);
    const vu = await attendreBandeau(p, 'NON VUE');
    const b = await bandeau(p);
    check('A. une demande du site non vue : le bandeau rouge s\'affiche', vu && !!b, JSON.stringify(b));
    check('A. il dit le N° court et « NON VUE »', /^NON VUE · N° 1052/.test(b?.texte || ''), b?.texte);
    check('A. il dit depuis quand elle attend', /Reçue il y a 3 min/.test(b?.texte || ''), b?.texte);
    check('A. il dit que l\'alerte est partie, combien de fois, la dernière quand', /7 alertes parties, la dernière il y a 1 min/.test(b?.texte || ''), b?.texte);
    check('A. moins de 10 min : pas encore CRITIQUE', b && !b.critique && !/CRITIQUE/.test(b.texte), JSON.stringify(b));
    check('A. ni nom, ni téléphone, ni chambre du client dans le bandeau', !/Martin|12 34|412/.test(b?.texte || ''), b?.texte);
    check('A. le journal est lu pour cette seule demande, sur le serveur', etat.lecturesJournal.some(x => /course_ref=in\.\(ELA-26-10-K7M2P\)/.test(x)), etat.lecturesJournal.join(' | '));
    check('A. à l\'ouverture, une non vue fait sonner la page (la première lecture ne sonnait jamais)', await p.evaluate(() => window.__alarmeActive()));
    check('A. …sans fabriquer le lecteur de son hors d\'un geste (sur iPhone il resterait muet) : il sonnera au premier appui',
      (await p.evaluate(() => window.__notes)) === 0, String(await p.evaluate(() => window.__notes)));
    check('A. le bandeau remplace « Son coupé » (empilés, ils sortaient la demande de l\'écran)',
      await p.evaluate(() => document.getElementById('sonCoupe').hidden));
    /* 390 × 844 : la première demande de la liste reste entière. */
    await p.waitForSelector('#listeBord .demande', { timeout: 8000 }).catch(() => {});
    await p.evaluate(() => Promise.all(document.getAnimations()
      .filter(a => a.effect && a.effect.getComputedTiming().endTime !== Infinity).map(a => a.finished.catch(() => {}))));
    const r = await p.evaluate(() => { const d = document.querySelector('#listeBord .demande'); return { bas: d ? Math.round(d.getBoundingClientRect().bottom) : null, vue: innerHeight }; });
    check('A. 390 × 844 : la première demande de la liste reste entière à l\'écran', r.bas !== null && r.bas <= r.vue, JSON.stringify(r));
    const centre = await p.evaluate(() => { const b = document.getElementById('bordNonVues').getBoundingClientRect();
      const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!e && !!e.closest('#bordNonVues'); });
    check('A. le doigt atteint bien le bandeau (rien ne le recouvre)', centre);
    /* Toucher le bandeau : la course s'ouvre, elle est dite vue, l'alarme se tait. */
    await p.locator('#bordNonVues').click();
    await p.waitForTimeout(600);
    check('A. toucher le bandeau ouvre la course', (await p.evaluate(() => (document.getElementById('bbRef') || {}).textContent)) === 'ELA-26-10-K7M2P'
      && await p.locator('#bbRef').isVisible());
    check('A. …la dit vue au serveur (ela_marquer_vue)', etat.vues.length === 1 && /ELA-26-10-K7M2P/.test(etat.vues[0] || ''), JSON.stringify(etat.vues));
    check('A. …et l\'alarme se tait', !(await p.evaluate(() => window.__alarmeActive())));
    check('A. …et le bandeau disparaît', (await bandeau(p)) === null, JSON.stringify(await bandeau(p)));
    await ctx.close();
  }

  /* A bis. LE PIRE CAS À 390 × 844 : une non vue CRITIQUE, une course
     confirmée sans chauffeur, le son pas encore débloqué. La première
     demande en attente reste entière à l'écran. */
  {
    const sansCh = { ...demande('ELA-26-10-SANSC', 1060, 90), statut: 'confirmee', chauffeur: {} };
    const etat = { courses: [demande('ELA-26-10-PIRE1', 1061, 14), sansCh], journal: alertes('ELA-26-10-PIRE1', 12, 1) };
    const { ctx, p } = await ouvrir(etat);
    await attendreBandeau(p, 'CRITIQUE');
    await p.waitForSelector('#listeBord .demande', { timeout: 8000 }).catch(() => {});
    await p.evaluate(() => Promise.all(document.getAnimations()
      .filter(a => a.effect && a.effect.getComputedTiming().endTime !== Infinity).map(a => a.finished.catch(() => {}))));
    const r = await p.evaluate(() => {
      const d = document.querySelector('#listeBord .demande.attente'), v = e => { const x = document.getElementById(e); return !!x && !x.hidden && x.getClientRects().length > 0; };
      return { bas: d ? Math.round(d.getBoundingClientRect().bottom) : null, vue: innerHeight, nonVue: v('bordNonVues'), sansChauffeur: v('bordSansChauffeur'), son: v('sonCoupe') };
    });
    check('A bis. pire cas posé : non vue et « sans chauffeur » affichés, « Son coupé » remplacé', r.nonVue && r.sansChauffeur && !r.son, JSON.stringify(r));
    check('A bis. …et la première demande en attente finit dans l\'écran (390 × 844)', r.bas !== null && r.bas <= r.vue, JSON.stringify(r));
    await ctx.close();
  }

  /* B. REÇUE IL Y A 12 MIN : CRITIQUE. */
  {
    const etat = { courses: [demande('ELA-26-10-CRIT1', 1053, 12)], journal: alertes('ELA-26-10-CRIT1', 9, 2) };
    const { ctx, p } = await ouvrir(etat);
    await attendreBandeau(p, 'NON VUE');
    const b = await bandeau(p);
    check('B. plus de 10 min sans être vue : CRITIQUE, en toutes lettres et en couleur', b?.critique && /CRITIQUE/.test(b.texte), JSON.stringify(b));
    check('B. CRITIQUE se lit après « NON VUE · N° 1053 », séparé par un espace (lecteur d\'écran)', /^NON VUE · N° 1053 CRITIQUE/.test(b?.texte || ''), b?.texte);
    await ctx.close();
  }

  /* C. VUE DANS TELEGRAM, OU SAISIE PAR L'EXPLOITANT : RIEN, ET PAS D'ALARME. */
  {
    const etat = { courses: [demande('ELA-26-10-VUEOK', 1054, 5), demande('ELA-26-10-SAISI', 1055, 5, false)],
      journal: [...alertes('ELA-26-10-VUEOK', 3, 3), { course_ref: 'ELA-26-10-VUEOK', type_evenement: 'vue', canal: 'telegram', statut: 'envoye', cree_le: ilYa(2) }] };
    const { ctx, p } = await ouvrir(etat);
    await p.waitForSelector('#listeBord .demande', { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(1500);
    check('C. vue dans Telegram : pas de bandeau', (await bandeau(p)) === null, JSON.stringify(await bandeau(p)));
    check('C. une saisie de l\'exploitant n\'en a jamais', !etat.lecturesJournal.some(x => /SAISI/.test(x)), etat.lecturesJournal.join(' | '));
    check('C. et la page ne sonne pas pour une demande déjà vue', !(await p.evaluate(() => window.__alarmeActive())));
    await ctx.close();
  }

  /* D. PLUSIEURS NON VUES ; ALERTES EN ÉCHEC. */
  {
    const etat = { courses: [demande('ELA-26-10-RECEN', 1057, 2), demande('ELA-26-10-ANCIE', 1056, 25)],
      journal: [{ course_ref: 'ELA-26-10-ANCIE', type_evenement: 'nouvelle_reservation', canal: 'telegram', statut: 'echec', cree_le: ilYa(25) },
                { course_ref: 'ELA-26-10-ANCIE', type_evenement: 'nouvelle_reservation', canal: 'push', statut: 'aucun_abonne', cree_le: ilYa(25) },
                { course_ref: 'ELA-26-10-ANCIE', type_evenement: 'nouvelle_reservation', canal: 'email', statut: 'indisponible', cree_le: ilYa(25) }] };
    const { ctx, p } = await ouvrir(etat);
    await attendreBandeau(p, 'NON VUES');
    const b = await bandeau(p);
    check('D. deux non vues : le nombre en tête', /^2 demandes NON VUES/.test(b?.texte || ''), b?.texte);
    check('D. …et la plus ancienne d\'abord, avec son N°', /La plus ancienne \(N° 1056\) : reçue il y a 25 min/.test(b?.texte || ''), b?.texte);
    check('D. alertes toutes ratées : il le dit (l\'e-mail non configuré ne compte pas)', /ALERTES EN ÉCHEC/.test(b?.texte || ''), b?.texte);
    await p.locator('#bordNonVues').click(); await p.waitForTimeout(500);
    check('D. le toucher ouvre la plus ancienne', etat.vues.length === 1 && /ELA-26-10-ANCIE/.test(etat.vues[0] || ''), JSON.stringify(etat.vues));
    await p.click('#btnAdminBord').catch(() => {}); await p.waitForTimeout(400);
    const b2 = await bandeau(p);
    check('D. la plus ancienne vue, le bandeau passe à la suivante', /^NON VUE · N° 1057/.test(b2?.texte || ''), b2?.texte);
    check('D. une demande sans aucune ligne au journal : « aucune alerte partie encore », pas « non lue »', /aucune alerte partie encore/.test(b2?.texte || ''), b2?.texte);
    await ctx.close();
  }

  /* E. L'ALERTE D'ESSAI. */
  {
    const etat = { courses: [], journalEssai: [] };
    const { ctx, p } = await ouvrir(etat);
    await p.click('#btnReglages'); await p.waitForTimeout(500);
    await p.locator('#btnEssaiServeur').click();
    await p.waitForTimeout(600);
    const t1 = await p.textContent('#essaiServeurEtat');
    check('E. l\'essai est demandé au serveur, une fois', etat.essais === 1, String(etat.essais));
    check('E. il dit de verrouiller le téléphone, et quand l\'alerte arrive', /verrouillez votre téléphone/.test(t1) && /30 à 60 secondes/.test(t1), t1);
    check('E. le bouton ne se redemande pas aussitôt', await p.locator('#btnEssaiServeur').isDisabled());
    etat.journalEssai = [{ canal: 'telegram', statut: 'envoye', detail: 'message_id=7', cree_le: new Date().toISOString() },
                         { canal: 'push', statut: 'envoye', detail: '1/1 push', cree_le: new Date().toISOString() }];
    await p.waitForFunction(() => /Essai parti/.test(document.getElementById('essaiServeurEtat').textContent), null, { timeout: 15000 }).catch(() => {});
    const t2 = await p.textContent('#essaiServeurEtat');
    check('E. au retour, le résultat lu dans le journal : Telegram envoyé, notification sur 1 appareil', /Telegram : envoyé/.test(t2) && /Notification ELA : envoyée sur 1 appareil/.test(t2), t2);
    await ctx.close();
  }
  {
    const etat = { courses: [], essai: 404 };
    const { ctx, p } = await ouvrir(etat);
    await p.click('#btnReglages'); await p.waitForTimeout(500);
    await p.locator('#btnEssaiServeur').click(); await p.waitForTimeout(800);
    const t = await p.textContent('#essaiServeurEtat');
    check('E. serveur pas encore à jour (fonction absente) : il le dit, sans faire semblant', /Essai impossible pour l'instant/.test(t), t);
    check('E. …et le bouton redevient utilisable', !(await p.locator('#btnEssaiServeur').isDisabled()));
    await ctx.close();
  }

  /* F. « ÉTAT DU SYSTÈME » : LA RELANCE ET LA NOTIFICATION ELA. */
  for (const [nom, sante, attendu] of [
    ['saines', SAIN, { rappels: /OK$/, notif: /1 téléphone abonné · 4 envoyée\(s\) · 0 en échec OK$/ }],
    ['relance qui ne bat plus', { ...SAIN, relance_ok_s: 900 }, { rappels: /en panne$/, notif: /OK$/ }],
    ['aucun téléphone abonné', { ...SAIN, abonnes_push: 0, push_ok_1h: 0, push_echecs_1h: 3 }, { rappels: /OK$/, notif: /aucun téléphone$/ }],
    ['serveur d\'avant la migration', { sans_alerte: 0, relance_active: true, derniere_relance_s: 12, relances_echouees_15min: 0, telegram_echecs_1h: 0, telegram_ok_1h: 3, demandes_24h: 5 },
      { rappels: /non mesuré$/, notif: /non mesuré$/ }],
  ]) {
    const etat = { courses: [], sante };
    const { ctx, p } = await ouvrir(etat);
    await p.waitForFunction(() => /Alertes/.test((document.getElementById('adminAlertesTexte') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(800);
    await p.click('#btnReglages'); await p.waitForTimeout(600);
    const lignes = await p.$$eval('#etatSysteme .reg-ligne', l => l.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
    const ligne = n => lignes.find(x => x.startsWith(n)) || '';
    check(`F. ${nom} : « Rappels automatiques »`, attendu.rappels.test(ligne('Rappels automatiques')), ligne('Rappels automatiques'));
    check(`F. ${nom} : « Notification ELA (1 h) »`, attendu.notif.test(ligne('Notification ELA')), ligne('Notification ELA'));
    await ctx.close();
  }
  /* G. LA RÉACTIVITÉ AU REGISTRE : lue sur le serveur, jamais inventée. */
  {
    const etat = { courses: [], reactivite: { periode: 'semaine', demandes: 4, alerte_mediane_s: 3, vue_mediane_s: 95, confirmation_mediane_s: 480,
      vues_2min: 3, confirmees_5min: 1, confirmees_15min: 3, jamais_vues: 1, jamais_vues_en_attente: 1, alertes_echec: 2 } };
    const { ctx, p } = await ouvrir(etat, { largeur: 1280, hauteur: 900 });
    await p.click('#btnRegistre'); await p.waitForTimeout(1200);
    const lignes = await p.$$eval('#regReactivite .reg-ligne', l => l.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
    const ligne = n => lignes.find(x => x.startsWith(n)) || '';
    check('G. la réactivité est demandée au serveur pour la période affichée', (etat.periodes || [])[0] === 'semaine', JSON.stringify(etat.periodes));
    check('G. première alerte : 3 s', /3 s$/.test(ligne('Première alerte')), ligne('Première alerte'));
    check('G. vue : 2 min (95 s)', /2 min$/.test(ligne('Vue ')), ligne('Vue '));
    check('G. confirmée : 8 min', /8 min$/.test(ligne('Confirmée ')), ligne('Confirmée '));
    check('G. vues en moins de 2 min : 3 sur 4 (75 %)', /3 sur 4 \(75 %\)$/.test(ligne('Vues en moins')), ligne('Vues en moins'));
    check('G. confirmées en 5 et en 15 min', /1 sur 4 \(25 %\)$/.test(ligne('Confirmées en moins de 5')) && /3 sur 4 \(75 %\)$/.test(ligne('Confirmées en moins de 15')), lignes.join(' | '));
    check('G. jamais vues : 1, dont 1 encore en attente', /dont 1 encore en attente 1$/.test(ligne('Jamais vues')), ligne('Jamais vues'));
    check('G. alertes en échec : 2', /2$/.test(ligne('Alertes en échec')), ligne('Alertes en échec'));
    await ctx.close();
  }
  {
    const etat = { courses: [], reactivite: 404 };
    const { ctx, p } = await ouvrir(etat, { largeur: 1280, hauteur: 900 });
    await p.click('#btnRegistre'); await p.waitForTimeout(1200);
    const t = (await p.textContent('#regReactivite')).trim();
    check('G. serveur pas encore à jour : « Pas encore mesurée », aucun chiffre inventé', /^Pas encore mesurée/.test(t) && !/\d/.test(t), t);
    await ctx.close();
  }
} catch (x) { ko.push('PLANTAGE — ' + x.message); }
check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
await nav.close(); serveur.close();
console.log(`=== RÉUSSIS (${ok.length}) ===`); ok.forEach(x => console.log('  ✓ ' + x));
if (ko.length) { console.log(`=== ÉCHECS (${ko.length}) ===`); ko.forEach(x => console.log('  ✗ ' + x)); process.exit(1); }
