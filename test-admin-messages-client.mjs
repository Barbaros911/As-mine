/* =====================================================================
   TEST-ADMIN-MESSAGES-CLIENT.MJS — le pense-bête des messages au client
   ---------------------------------------------------------------------
   24 octobre 2026, Barbaros : « un pense-bête qui m'empêche d'oublier »,
   « fais un expert, n'oublie rien ». Trois défauts mesurés dans le code :
   - « Prévenir le client » ne laissait AUCUNE trace : le message qui porte
     le lien de paiement pouvait ne jamais partir, sans que rien le dise ;
   - un refus, une annulation, un changement ne se disaient nulle part :
     ni texte prêt, ni bouton, ni alerte ;
   - « Accusé de réception envoyé » s'écrivait au clic, alors que l'admin
     ne voit jamais si l'on a appuyé sur « envoyer » dans WhatsApp.
   Et deux à côté, du même sujet : la demande d'avis partait toujours sur
   WhatsApp, quel que soit le moyen choisi par le client ; le bon du client
   ne reprenait pas la nouvelle heure que lui rendait « etat-course ».

   CE QUI EST ÉPROUVÉ, sur le site CONSTRUIT (port 8181, propre à cette
   suite), par ce qui PART (liens ouverts, SMS, presse-papiers, écritures
   au faux serveur) et par ce que voit le doigt :
   · la trace de chaque message (type, canal, heure), au serveur ;
   · le pense-bête « aPrevenir » posé par chaque geste qui doit se dire
     (confirmer, nouveau chauffeur, refuser, annuler, modifier, saisir au
     téléphone), éteint par le message ou par « Déjà prévenu » (2 appuis) ;
   · aucune fausse alerte : historique, état qui ne correspond plus,
     client qui a payé, départ passé, course en attente modifiée ;
   · les trois messages prêts, dans la langue et par le canal du client,
     sans fausse promesse d'argent ;
   · l'écriteau du tableau de bord et la pastille de la carte ;
   · l'avertissement « le prix a changé, le lien peut-être pas » ;
   · côté client : la nouvelle heure arrive sur le bon, une réponse
     incomplète ne recule rien.
   Lancer :  node test-admin-messages-client.mjs
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
await new Promise(r => serveur.listen(8181, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8181';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });

const paris = min => new Date(Date.now() + min * 60000).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10);
const course = (ref, statut, plus = {}) => ({ ref, statut,
  cree: new Date(Date.now() - 3600e3).toISOString(),
  course: { depart: 'Place Vendôme, 75001 Paris (ch. 12)', departPublic: 'Place Vendôme, 75001 Paris',
    arrivee: 'Aéroport Charles-de-Gaulle, Terminal 2E', arriveePublic: 'Aéroport Charles-de-Gaulle, Terminal 2E',
    date: paris(2 * 1440), heure: '10:00', vehicule: 'Berline', vehiculeCle: 'berline', passagers: '2 passagers', vol: '' },
  client: { nom: 'Jeanne Martin', telephone: '06 12 34 56 78' }, prix: { total: 70 }, langue: 'fr',
  paiement: 'lien', paiementNom: 'Lien de paiement, avant le départ', ...plus });
const ALI = { nom: 'Ali Ben', telephone: '06 11 22 33 44' };
const vieux = () => new Date(Date.now() - 2 * 3600e3).toISOString();
const DEPART = [
  course('ELA-26-10-MSG01', 'attente'),
  course('ELA-26-10-MSG02', 'attente', { langue: 'en', client: { nom: 'John Smith', telephone: '+44 7700 900123' },
    contact: { envoi: 'site', prefere: 'telegram' } }),
  course('ELA-26-10-MSG03', 'confirmee', { chauffeur: ALI, contact: { envoi: 'site', prefere: 'telephone' } }),
  course('ELA-26-10-MSG04', 'confirmee', { chauffeur: ALI, lienPaiement: 'https://pay.sumup.com/b2c/ANCIEN' }),
  /* Une course d'avant le pense-bête : confirmée, sans « aPrevenir ». */
  course('ELA-26-10-MSG05', 'confirmee', { chauffeur: ALI }),
  course('ELA-26-10-MSG06', 'realisee', { chauffeur: ALI, contact: { envoi: 'site', prefere: 'telephone' },
    course: { ...course('x', 'x').course, date: paris(-60) } }),
  course('ELA-26-10-MSG07', 'attente', { client: { nom: 'Sans Numéro', telephone: '' } }),
  course('ELA-26-10-MSG08', 'confirmee', { chauffeur: ALI, paye: vieux() }),
  course('ELA-26-10-MSG09', 'attente'),
  /* Trois pense-bêtes qui ne doivent PAS sonner. */
  course('ELA-26-10-MSG10', 'refusee', { aPrevenir: { type: 'refus', depuis: vieux() },
    course: { ...course('x', 'x').course, date: paris(-1440) } }),
  course('ELA-26-10-MSG11', 'annulee', { aPrevenir: { type: 'confirmation', depuis: vieux() } }),
  course('ELA-26-10-MSG12', 'confirmee', { chauffeur: ALI, paye: vieux(), aPrevenir: { type: 'confirmation', depuis: vieux() } }),
];
const AN_PROCHAIN = paris(400 * 1440);
const CARNET = [
  { id: 'c1', nom: 'Ali Ben', telephone: '06 11 22 33 44', carteFin: AN_PROCHAIN, registreFin: AN_PROCHAIN, assuranceFin: AN_PROCHAIN },
  { id: 'c2', nom: 'Mehmet Valide', telephone: '06 55 66 77 88', carteFin: AN_PROCHAIN, registreFin: AN_PROCHAIN, assuranceFin: AN_PROCHAIN },
];

/* Le faux serveur, avec ses versions, comme le vrai (PATCH « version=eq.N »). */
const base = {}; for (const c of DEPART) base[c.ref] = { bon: JSON.parse(JSON.stringify(c)), statut: c.statut, version: 1 };
const erreurs = [], sms = [];
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
await ctx.addInitScript(({ c, ch }) => {
  if (sessionStorage.getItem('__pose')) return;
  sessionStorage.setItem('__pose', '1');
  localStorage.setItem('ela_nuage_session', JSON.stringify({ access_token: 'JETON', refresh_token: 'R', user: { id: 'u-barbaros' } }));
  localStorage.setItem('ela_chauffeurs', JSON.stringify(ch));
  localStorage.setItem('ela_bookings', JSON.stringify(c));
  localStorage.setItem('ela_lien_avis', 'https://g.page/r/exemple/review');
}, { c: DEPART, ch: CARNET });
await ctx.addInitScript(() => {
  window.__liens = []; window.open = u => { window.__liens.push(u); return null; };
  window.__copie = '';
  try { Object.defineProperty(navigator, 'clipboard', { configurable: true,
    value: { writeText: t => { window.__copie = t; return Promise.resolve(); }, readText: () => Promise.resolve('') } }); } catch (e) {}
});
await ctx.route('**/*', async route => {
  const req = route.request(), u = req.url(), m = req.method();
  if (u.startsWith(BASE)) return route.continue();
  if (u.startsWith('sms:')) return route.abort();
  if (!u.includes('supabase.co')) return route.abort();
  if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
  if (u.includes('/rpc/role_operateur')) return route.fulfill(J('admin'));
  if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J([]));
  if (!u.includes('/rest/v1/courses')) return route.fulfill(J([]));
  const ref = decodeURIComponent((u.match(/ref=eq\.([^&]+)/) || [])[1] || '');
  if (m === 'GET') {
    const lignes = Object.values(base).map(l => ({ bon: l.bon, statut: l.statut, version: l.version, modifie_le: '2026-10-24T08:00:00Z', cree_le: l.bon.cree }));
    if (u.includes('select=ref')) return route.fulfill(J(lignes.slice(0, 1).map(l => ({ ref: l.bon.ref, version: l.version }))));
    if (ref) return route.fulfill(J(lignes.filter(l => l.bon.ref === ref)));
    return route.fulfill(J(lignes));
  }
  let corps = {}; try { corps = JSON.parse(req.postData() || '{}'); } catch {}
  if (m === 'PATCH') {
    const v = Number((u.match(/version=eq\.(\d+)/) || [])[1]);
    const l = base[ref];
    if (!l || l.version !== v) return route.fulfill(J([]));
    l.bon = corps.bon; l.statut = corps.statut; l.version++;
    return route.fulfill(J([{ version: l.version, cree_le: l.bon.cree }]));
  }
  if (m === 'POST' && corps && corps.ref) {
    base[corps.ref] = { bon: corps.bon || corps, statut: corps.statut || (corps.bon && corps.bon.statut) || 'attente', version: 1 };
    return route.fulfill(J([{ version: 1, cree_le: new Date().toISOString() }]));
  }
  return route.fulfill(J([]));
});
const p = await ctx.newPage();
p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
p.on('request', r => { if (r.url().startsWith('sms:')) sms.push(r.url()); });
await p.goto(BASE + '/ela-admin/');
await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 15000 });
await p.waitForTimeout(1500);

const surBon = () => p.waitForFunction(() => { const e = document.getElementById('ecran-bord-bon'); return e && e.classList.contains('actif'); }, null, { timeout: 8000 }).then(() => true, () => false);
const surBord = () => p.waitForFunction(() => { const e = document.getElementById('ecran-bord'); return e && e.classList.contains('actif'); }, null, { timeout: 8000 }).then(() => true, () => false);
const local = ref => p.evaluate(r => (JSON.parse(localStorage.getItem('ela_bookings') || '[]').filter(c => c.ref === r)[0] || null), ref);
const fileVide = () => p.waitForFunction(() => !Object.keys(JSON.parse(localStorage.getItem('ela_file') || '{}')).length, null, { timeout: 10000 }).then(() => true, () => false);
/* Le script de la page est enfermé dans une fonction : on ouvre une course
   comme le lien « Ouvrir la course » de Telegram, par son adresse. La file
   d'envoi est vidée d'abord : le serveur relu au chargement est à jour. */
const ouvrir = async ref => {
  await fileVide();
  await p.goto(BASE + '/ela-admin/?ref=' + encodeURIComponent(ref));
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 15000 });
  return surBon();
};
const liens = () => p.evaluate(() => window.__liens.slice());
const viderLiens = () => p.evaluate(() => { window.__liens = []; window.__copie = ''; });
const texteDe = lien => decodeURIComponent(String(lien || '').split('text=')[1] || '');
const visible = sel => p.locator(sel).isVisible();
/* Le premier élément : dans l'historique, c'est le message le plus récent. */
const texte = async sel => ((await p.locator(sel).first().textContent()) || '').trim();
/* Ce que reçoit le doigt : on descend jusqu'au bouton et on le touche. */
const toucher = async sel => { await p.locator(sel).scrollIntoViewIfNeeded(); await p.locator(sel).click(); await p.waitForTimeout(300); };
const retour = async () => { await toucher('#btnRetourBord'); return surBord(); };

try {
  /* ═══ A. AUCUNE FAUSSE ALERTE SUR L'HISTORIQUE ═══ */
  check('A. au départ, aucun écriteau « client pas prévenu » (historique, état caduc, payé, départ passé)',
    await p.locator('#bordAPrevenir').isHidden(), await texte('#bordAPrevenir'));
  await toucher('.compteur[data-filtre="confirmee"]');
  const carte05 = p.locator('.demande[data-ref="ELA-26-10-MSG05"]');
  check('A. une course confirmée d\'avant ce jour ne porte pas « Client à prévenir »',
    await carte05.count() === 1 && !/Client à prévenir/.test(await carte05.textContent()));
  check('A. un client qui a payé ne porte pas « Client à prévenir » (même avec un ancien pense-bête)',
    !/Client à prévenir/.test(await p.locator('.demande[data-ref="ELA-26-10-MSG12"]').textContent()));

  /* ═══ B. L'ACCUSÉ : OUVERT, PAS « ENVOYÉ », ET TRACÉ ═══ */
  await ouvrir('ELA-26-10-MSG01');
  check('B. le bloc « Messages au client » est là, sans alerte, « aucun message » dit',
    await visible('#bbMsgClient') && await p.locator('#bbAPrevenir').isHidden() && await visible('#bbMsgVide'));
  await viderLiens(); await toucher('#btnAccuserReception');
  const lAcc = await liens();
  check('B. l\'accusé part sur le numéro du client', lAcc.length === 1 && lAcc[0].startsWith('https://wa.me/33612345678?text='), JSON.stringify(lAcc));
  check('B. le bouton dit « ouvert », plus « envoyé » — l\'admin ne voit pas « envoyer »',
    /ouvert/.test(await texte('#btnAccuserReception')) && !/envoyé/.test(await texte('#btnAccuserReception')), await texte('#btnAccuserReception'));
  check('B. l\'historique le montre : type, canal, heure',
    /^Accusé de réception — ouvert dans WhatsApp — aujourd'hui à \d{2}:\d{2}$/.test(await texte('#bbMsgHisto li')), await texte('#bbMsgHisto li'));
  await fileVide();
  check('B. la trace part au serveur avec la course', (base['ELA-26-10-MSG01'].bon.messagesClient || []).some(x => x.type === 'accuse' && x.canal === 'whatsapp'),
    JSON.stringify(base['ELA-26-10-MSG01'].bon.messagesClient));

  /* ═══ C. CONFIRMER POSE LE PENSE-BÊTE ═══ */
  await p.fill('#bbChauffeurNom', 'Mehmet Valide'); await p.fill('#bbChauffeurTel', '06 55 66 77 88');
  await toucher('#btnConfirmerCourse'); await surBon();
  check('C. confirmée : l\'alerte rouge dit que la confirmation et le lien de paiement restent à envoyer',
    await visible('#bbAPrevenir') && /confirmation/.test(await texte('#bbAPrevenir')) && /lien de paiement/.test(await texte('#bbAPrevenir')), await texte('#bbAPrevenir'));
  const fondAlerte = await p.locator('#bbAPrevenir').evaluate(e => getComputedStyle(e).backgroundColor);
  check('C. l\'alerte est ROUGE (le rouge de « il manque »), pas un texte gris qu\'on ne voit pas', fondAlerte === 'rgb(251, 233, 233)', fondAlerte);
  check('C. le pense-bête est sur la course : confirmation', ((await local('ELA-26-10-MSG01')) || {}).aPrevenir?.type === 'confirmation');
  check('C. « Prévenir le client » est là, le bouton générique non', await visible('#btnPrevenirClient') && await p.locator('#btnPrevenirChangement').isHidden());
  check('C. « Déjà prévenu autrement » est proposé', await visible('#btnDejaPrevenu'));
  await fileVide();
  check('C. le pense-bête part au serveur (c\'est lui que relit le rappel Telegram)', base['ELA-26-10-MSG01'].bon.aPrevenir?.type === 'confirmation');
  await retour();
  check('C. au tableau de bord : l\'écriteau « 1 client n\'a pas encore été prévenu »',
    await visible('#bordAPrevenir') && /^1 client n'a pas encore été prévenu/.test(await texte('#bordAPrevenir')), await texte('#bordAPrevenir'));
  await toucher('.compteur[data-filtre="confirmee"]');
  check('C. et la carte porte la pastille « Client à prévenir »',
    /Client à prévenir/.test(await p.locator('.demande[data-ref="ELA-26-10-MSG01"]').textContent()));
  const posEcriteau = await p.evaluate(() => { const b = document.getElementById('bordAPrevenir').getBoundingClientRect(); const x = b.left + b.width / 2, y = b.top + b.height / 2; const el = document.elementFromPoint(x, y); return { y: b.top, h: b.height, touche: !!el && (el.id === 'bordAPrevenir' || !!el.closest('#bordAPrevenir')) }; });
  check('C. l\'écriteau reçoit le doigt (44 px au moins, rien par-dessus)', posEcriteau.touche && posEcriteau.h >= 44, JSON.stringify(posEcriteau));

  /* ═══ D. L'ÉCRITEAU OUVRE LA COURSE ; « PRÉVENIR » ÉTEINT TOUT ═══ */
  await p.locator('#bordAPrevenir').scrollIntoViewIfNeeded(); await p.locator('#bordAPrevenir').click();
  check('D. l\'écriteau ouvre la course à prévenir', await surBon() && await texte('#bbRef') === 'ELA-26-10-MSG01', await texte('#bbRef'));
  await viderLiens(); await toucher('#btnPrevenirClient');
  const lConf = await liens();
  check('D. la confirmation part (inchangée) sur le numéro du client', lConf.length === 1 && /Transfert confirmé/.test(texteDe(lConf[0])), JSON.stringify(lConf).slice(0, 120));
  check('D. l\'alerte s\'éteint', await p.locator('#bbAPrevenir').isHidden());
  check('D. l\'historique : « Confirmation — ouvert dans WhatsApp »', /^Confirmation — ouvert dans WhatsApp/.test(await texte('#bbMsgHisto li')), await texte('#bbMsgHisto li'));
  await fileVide();
  check('D. au serveur : pense-bête effacé, deux messages tracés',
    !base['ELA-26-10-MSG01'].bon.aPrevenir && (base['ELA-26-10-MSG01'].bon.messagesClient || []).length === 2, JSON.stringify(base['ELA-26-10-MSG01'].bon.aPrevenir));
  await retour();
  check('D. l\'écriteau disparaît du tableau de bord', await p.locator('#bordAPrevenir').isHidden());

  /* ═══ E. NOUVEAU CHAUFFEUR = À REDIRE ; « DÉJÀ PRÉVENU » EN DEUX APPUIS ═══ */
  await ouvrir('ELA-26-10-MSG01');
  await p.fill('#bbChauffeurNom', 'Ali Ben'); await p.fill('#bbChauffeurTel', '06 11 22 33 44');
  await retour();
  check('E. un nouveau chauffeur sur une course confirmée remet le pense-bête (CGV art. 8)',
    ((await local('ELA-26-10-MSG01')) || {}).aPrevenir?.type === 'confirmation' && await visible('#bordAPrevenir'));
  await ouvrir('ELA-26-10-MSG01');
  await toucher('#btnDejaPrevenu');
  check('E. un seul appui sur « Déjà prévenu » n\'éteint RIEN', ((await local('ELA-26-10-MSG01')) || {}).aPrevenir?.type === 'confirmation'
    && /Confirmer/.test(await texte('#btnDejaPrevenu')), await texte('#btnDejaPrevenu'));
  await p.waitForTimeout(750);
  await toucher('#btnDejaPrevenu');
  const c01 = await local('ELA-26-10-MSG01');
  check('E. le second l\'éteint, et la trace dit « prévenu autrement »', !c01.aPrevenir && c01.messagesClient.at(-1).canal === 'autre'
    && c01.messagesClient.at(-1).type === 'confirmation', JSON.stringify(c01.messagesClient.at(-1)));
  check('E. l\'historique le montre', /^Confirmation — prévenu autrement/.test(await texte('#bbMsgHisto li')), await texte('#bbMsgHisto li'));
  await retour();

  /* ═══ F. LE REFUS : EN ANGLAIS, PAR TELEGRAM ═══ */
  await ouvrir('ELA-26-10-MSG02');
  await toucher('#btnRefuser'); await p.waitForTimeout(750); await toucher('#btnRefuser');
  check('F. après le refus, on revient au tableau de bord (son témoin d\'envoi y vit)', await surBord());
  check('F. l\'écriteau rouge y est', await visible('#bordAPrevenir'));
  await p.locator('#bordAPrevenir').click();
  check('F. il ouvre la course refusée', await surBon() && await texte('#bbRef') === 'ELA-26-10-MSG02');
  check('F. l\'alerte dit qu\'il attend peut-être une voiture', /n'est pas prise/.test(await texte('#bbAPrevenir')), await texte('#bbAPrevenir'));
  check('F. le bouton dit lequel : « Prévenir le client du refus »', await visible('#btnPrevenirChangement')
    && await texte('#btnPrevenirChangement') === 'Prévenir le client du refus', await texte('#btnPrevenirChangement'));
  await viderLiens(); await toucher('#btnPrevenirChangement');
  const lRef = await liens(), copie = await p.evaluate(() => window.__copie);
  check('F. Telegram choisi : la conversation s\'ouvre, le message est copié', lRef.length === 1 && lRef[0] === 'https://t.me/+447700900123'
    && /copié/.test(await texte('#bbContact')), JSON.stringify(lRef));
  check('F. le message est en anglais, avec la référence, le trajet sans la chambre, « rien n\'est dû »',
    /^Hello John, we are sorry: no driver is available for your request ELA-26-10-MSG02\./.test(copie)
    && copie.includes('Place Vendôme, 75001 Paris → Aéroport Charles-de-Gaulle') && !/ch\. 12/.test(copie)
    && copie.includes('You owe nothing.') && copie.includes('+33 7 59 31 24 33') && !/Bonjour/.test(copie), copie.replace(/\n/g, ' | '));
  const c02 = await local('ELA-26-10-MSG02');
  check('F. le refus est tracé (Telegram) et le pense-bête éteint', !c02.aPrevenir && c02.messagesClient.at(-1).type === 'refus' && c02.messagesClient.at(-1).canal === 'telegram');
  check('F. l\'historique dit « copié pour Telegram » — ce n\'est pas un envoi', /^Refus — copié pour Telegram/.test(await texte('#bbMsgHisto li')));
  await retour();

  /* ═══ G. L'ANNULATION : PAR SMS, ET RIEN SUR L'ARGENT QUAND C'EST PAYÉ ═══ */
  await ouvrir('ELA-26-10-MSG03');
  await toucher('#btnAnnulerCourse'); await p.waitForTimeout(750); await toucher('#btnAnnulerCourse');
  check('G. on reste sur le bon annulé, l\'alerte et le bouton sont là',
    await surBon() && await visible('#bbAPrevenir') && await texte('#btnPrevenirChangement') === 'Prévenir le client de l\'annulation', await texte('#btnPrevenirChangement'));
  check('G. la note rappelle toujours le chauffeur', /Prévenez le chauffeur/.test(await texte('#bbModifNote')));
  const vuG = await p.evaluate(() => { const r = document.getElementById('btnPrevenirChangement').getBoundingClientRect(); const n = document.getElementById('bbModifNote').getBoundingClientRect(); return { haut: n.top, bas: r.bottom, h: innerHeight }; });
  check('G. l\'écran montre la note et le bouton d\'un même regard (390×844)', vuG.haut >= 0 && vuG.bas <= vuG.h, JSON.stringify(vuG));
  sms.length = 0; await toucher('#btnPrevenirChangement'); await p.waitForTimeout(300);
  const corpsSms = decodeURIComponent((sms[0] || '').split('body=')[1] || '');
  check('G. « appel ou SMS » choisi : le message part en SMS', sms.length === 1 && sms[0].startsWith('sms:+33612345678'), JSON.stringify(sms));
  check('G. il dit l\'annulation, « rien ne vous est dû » (non payé) et le numéro à la française',
    /votre course ELA-26-10-MSG03 est annulée\./.test(corpsSms) && corpsSms.includes('Rien ne vous est dû.') && corpsSms.includes('07 59 31 24 33'), corpsSms.replace(/\n/g, ' | '));
  check('G. tracé « Messages (SMS) »', /^Annulation — ouvert dans Messages \(SMS\)/.test(await texte('#bbMsgHisto li')), await texte('#bbMsgHisto li'));
  await retour();
  await ouvrir('ELA-26-10-MSG08');
  await toucher('#btnAnnulerCourse'); await p.waitForTimeout(750); await toucher('#btnAnnulerCourse');
  await viderLiens(); await toucher('#btnPrevenirChangement');
  const tPaye = texteDe((await liens())[0]);
  check('G. course PAYÉE annulée : le message ne dit RIEN de l\'argent (c\'est à dire de vive voix)',
    /est annulée/.test(tPaye) && !/dû|rembours/i.test(tPaye), tPaye.replace(/\n/g, ' | '));
  await retour();

  /* ═══ H. LE CHANGEMENT : CE QUI A CHANGÉ, ET L'ANCIENNE HEURE ═══ */
  await ouvrir('ELA-26-10-MSG04');
  await toucher('#btnModifierCourse'); await p.fill('#mdHeure', '11:30'); await toucher('#btnMdEnregistrer');
  const c04 = await local('ELA-26-10-MSG04');
  check('H. une heure changée sur une course confirmée pose « modification », avec l\'heure d\'avant',
    c04.aPrevenir?.type === 'modification' && c04.aPrevenir.avant?.heure === '10:00', JSON.stringify(c04.aPrevenir));
  check('H. le bouton : « Prévenir le client du changement »', await texte('#btnPrevenirChangement') === 'Prévenir le client du changement');
  await viderLiens(); await toucher('#btnPrevenirChangement');
  const tMod = texteDe((await liens())[0]);
  check('H. le message dit la nouvelle heure ET l\'ancienne', /a été modifié\./.test(tMod) && /Date : .*11:30 \(au lieu de .*10:00\)/.test(tMod), tMod.replace(/\n/g, ' | '));
  check('H. il redit le chauffeur et porte le lien du bon (qui pose la nouvelle heure chez le client)',
    tMod.includes('Chauffeur : Ali Ben · 06 11 22 33 44') && /Votre bon : http:\/\/127\.0\.0\.1:8181\/\?ok=/.test(tMod), tMod.replace(/\n/g, ' | '));
  check('H. prix inchangé : pas de ligne « Prix », et jamais le lien de paiement',
    !/Prix :/.test(tMod) && !/sumup|Lien de paiement/.test(tMod), tMod.replace(/\n/g, ' | '));
  check('H. le pense-bête s\'éteint', !((await local('ELA-26-10-MSG04')) || {}).aPrevenir);
  /* Le prix change sur une course payable par lien, pas payée : c'est la
     confirmation complète qui est à refaire, avec un nouveau lien. */
  await toucher('#btnModifierCourse'); await p.fill('#mdPrix', '90'); await toucher('#btnMdEnregistrer');
  const c04b = await local('ELA-26-10-MSG04');
  check('H. nouveau prix payable par lien : c\'est la CONFIRMATION qui est à refaire',
    c04b.aPrevenir?.type === 'confirmation' && c04b.aPrevenir.prixChange === true && c04b.aPrevenir.lienAvant === 'https://pay.sumup.com/b2c/ANCIEN', JSON.stringify(c04b.aPrevenir));
  check('H. l\'avertissement : le lien collé porte l\'ancien montant', await visible('#bbLienPrix') && /ancien montant/.test(await texte('#bbLienPrix')), await texte('#bbLienPrix'));
  await p.fill('#bbLienPaiement', 'https://pay.sumup.com/b2c/NOUVEAU'); await p.waitForTimeout(200);
  check('H. un nouveau lien collé fait taire l\'avertissement', await p.locator('#bbLienPrix').isHidden());
  await viderLiens(); await toucher('#btnPrevenirClient');
  const tConf2 = texteDe((await liens())[0]);
  check('H. la confirmation repart avec le nouveau prix et le nouveau lien', tConf2.includes('90,00 €') && tConf2.includes('NOUVEAU') && !tConf2.includes('ANCIEN'), tConf2.replace(/\n/g, ' | '));
  check('H. et le pense-bête s\'éteint', !((await local('ELA-26-10-MSG04')) || {}).aPrevenir);
  await retour();

  /* ═══ I. CE QUI NE POSE RIEN ═══ */
  await ouvrir('ELA-26-10-MSG09');
  await toucher('#btnModifierCourse'); await p.fill('#mdHeure', '08:15'); await toucher('#btnMdEnregistrer');
  check('I. une course EN ATTENTE modifiée ne pose rien — la confirmation dira la nouvelle heure',
    !((await local('ELA-26-10-MSG09')) || {}).aPrevenir && await p.locator('#bbAPrevenir').isHidden());
  await retour();
  await ouvrir('ELA-26-10-MSG07');
  check('I. sans numéro : le bloc des messages ne s\'affiche pas', await p.locator('#bbMsgClient').isHidden());
  await toucher('#btnRefuser'); await p.waitForTimeout(750); await toucher('#btnRefuser');
  check('I. sans numéro, un refus ne pose aucun pense-bête (personne à prévenir d\'ici)',
    await surBord() && !((await local('ELA-26-10-MSG07')) || {}).aPrevenir && await p.locator('#bordAPrevenir').isHidden());

  /* ═══ J. « TERMINÉE » ÉTEINT LE PENSE-BÊTE ═══ */
  await ouvrir('ELA-26-10-MSG05');
  await p.fill('#bbChauffeurNom', 'Mehmet Valide'); await p.fill('#bbChauffeurTel', '06 55 66 77 88');
  await retour();
  check('J. (nouveau chauffeur : pense-bête posé)', ((await local('ELA-26-10-MSG05')) || {}).aPrevenir?.type === 'confirmation');
  await ouvrir('ELA-26-10-MSG05');
  await toucher('#btnRealisee'); await p.waitForTimeout(750); await toucher('#btnRealisee');
  check('J. une course marquée réalisée n\'a plus rien à dire au client', !((await local('ELA-26-10-MSG05')) || {}).aPrevenir);
  if (!(await p.locator('#ecran-bord').evaluate(e => e.classList.contains('actif')))) await retour();
  check('J. …et l\'écriteau se tait', await p.locator('#bordAPrevenir').isHidden(), await texte('#bordAPrevenir'));

  /* ═══ K. L'AVIS PAR LE MOYEN CHOISI ═══ */
  await toucher('.compteur[data-filtre="realisee"]');
  sms.length = 0; await viderLiens();
  await p.locator('.demande[data-ref="ELA-26-10-MSG06"] .d-avis').click(); await p.waitForTimeout(400);
  const corpsAvis = decodeURIComponent((sms[0] || '').split('body=')[1] || '');
  check('K. « appel ou SMS » choisi : la demande d\'avis part en SMS, plus sur WhatsApp',
    sms.length === 1 && sms[0].startsWith('sms:+33612345678') && corpsAvis.includes('https://g.page/r/exemple/review') && !(await liens()).length,
    JSON.stringify(sms) + ' ' + JSON.stringify(await liens()));
  const c06 = await local('ELA-26-10-MSG06');
  check('K. tracée, et « Avis demandé » reste retenu', !!c06.avisDemande && c06.messagesClient.at(-1).type === 'avis' && c06.messagesClient.at(-1).canal === 'sms');

  /* ═══ L. SAISIE AU TÉLÉPHONE, AVEC CHAUFFEUR ═══ */
  await toucher('#btnSaisirCourse');
  await p.fill('#crNom', 'Paul Durand'); await p.fill('#crTel', '06 22 33 44 55');
  await p.fill('#crDepart', 'Gare de Lyon, Paris'); await p.fill('#crArrivee', 'Orly');
  await p.fill('#crDate', paris(3 * 1440)); await p.fill('#crHeure', '09:00'); await p.fill('#crPrix', '60');
  await p.fill('#crChNom', 'Ali Ben'); await p.fill('#crChTel', '06 11 22 33 44');
  await toucher('#btnCreerCourse');
  const cTel = await p.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings') || '[]')[0]);
  check('L. prise au téléphone avec un chauffeur : le lien et le bon restent à envoyer',
    await surBon() && cTel.client?.nom === 'Paul Durand' && cTel.aPrevenir?.type === 'confirmation' && await visible('#bbAPrevenir'), JSON.stringify(cTel.aPrevenir));
} catch (x) { ko.push('PLANTAGE — ' + x.message.split('\n')[0]); }

/* ═══ M. CÔTÉ CLIENT : LA NOUVELLE HEURE ARRIVE SUR LE BON ═══ */
try {
  const ctxC = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const jour = paris(3 * 1440), autreJour = paris(4 * 1440);
  const maCourse = { ref: 'ELA-26-10-CLIE1', statut: 'confirmee', depot: 'recu', langue: 'fr',
    course: { depart: 'Place Vendôme', departPublic: 'Place Vendôme', arrivee: 'Orly', arriveePublic: 'Orly', date: jour, heure: '10:00', vehicule: 'Berline' },
    client: { nom: 'Jeanne', telephone: '06 12 34 56 78' }, prix: { total: 60 }, chauffeur: { nom: 'Ali', telephone: '06 11 22 33 44' },
    dateMsg: jour.split('-').reverse().join('/') + ' 10:00' };
  await ctxC.addInitScript(c => { if (!sessionStorage.getItem('__pose')) { sessionStorage.setItem('__pose', '1'); localStorage.setItem('ela_courses', JSON.stringify([c])); } }, maCourse);
  let reponse = { statut: 'confirmee', date: autreJour, heure: '11:30', chauffeur: { nom: 'Ali', telephone: '06 11 22 33 44' }, vehicule: 'Berline' };
  const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  await ctxC.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (u.includes('/functions/v1/etat-course')) {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: 'ok' });
      return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ref: 'ELA-26-10-CLIE1', ...reponse }) });
    }
    return route.abort();
  });
  const pc = await ctxC.newPage();
  pc.on('pageerror', e => erreurs.push('client : ' + e.message.split('\n')[0]));
  await pc.goto(BASE + '/');
  await pc.waitForTimeout(800);
  await pc.locator('.onglet[data-onglet="courses"]').click(); await pc.waitForTimeout(1000);
  const lu = await pc.evaluate(() => JSON.parse(localStorage.getItem('ela_courses') || '[]')[0]);
  check('M. le bon du client prend la nouvelle date et la nouvelle heure données par le serveur',
    lu.course.date === autreJour && lu.course.heure === '11:30', lu.course.date + ' ' + lu.course.heure);
  check('M. …et son texte de demande suit (« Renvoyer » ne redirait pas l\'ancienne heure)',
    lu.dateMsg === autreJour.split('-').reverse().join('/') + ' 11:30', lu.dateMsg);
  check('M. la liste « Réservations » affiche 11:30', /11:30/.test(await pc.locator('#ecran-courses').textContent()));
  reponse = { statut: 'confirmee', date: '', heure: '', chauffeur: { nom: 'Ali', telephone: '06 11 22 33 44' } };
  await pc.locator('.onglet[data-onglet="accueil"]').click(); await pc.waitForTimeout(200);
  await pc.locator('.onglet[data-onglet="courses"]').click(); await pc.waitForTimeout(1000);
  const lu2 = await pc.evaluate(() => JSON.parse(localStorage.getItem('ela_courses') || '[]')[0]);
  check('M. une réponse sans date ni heure ne recule rien', lu2.course.date === autreJour && lu2.course.heure === '11:30', lu2.course.date + ' ' + lu2.course.heure);
  await ctxC.close();
} catch (x) { ko.push('PLANTAGE (client) — ' + x.message.split('\n')[0]); }

check('aucune erreur JavaScript', !erreurs.length, [...new Set(erreurs)].join(' | '));
await nav.close(); serveur.close();
console.log(`=== RÉUSSIS (${ok.length}) ===`); ok.forEach(x => console.log('  ✓ ' + x));
if (ko.length) { console.log(`=== ÉCHECS (${ko.length}) ===`); ko.forEach(x => console.log('  ✗ ' + x)); process.exit(1); }
