// ═══ LE FORMULAIRE DE DÉMONSTRATION — /professionnels/#demo (bloc 4) ═══
// Mission « Démo professionnels », 8 octobre 2026. Éprouvé sur le SITE
// CONSTRUIT, avec un faux serveur pour demande-demo (Playwright) qui
// ENREGISTRE chaque corps reçu. Ce qui est vérifié :
//  · succès → session et échéance gardées, message des 7 jours, démo ouverte ;
//  · visiteur revenu avant l'échéance → la démo directement, sans formulaire ;
//  · 429 → les deux limites écrites en clair, jamais la démo ;
//  · 503, 403, réseau coupé → indisponibilité + contact, jamais la démo ;
//  · 400 → le message sous LE champ nommé par le serveur ;
//  · le champ piège : nom qu'aucun navigateur ne remplit, hors écran, hors
//    clavier, et « site » part toujours VIDE ; aucune photo dans le corps ;
//    « duree » au moins 2 500 ms même pour un humain très rapide ;
//  · le lien de confirmation (succès, expiré, panne), effacé de l'adresse ;
//  · FR/EN, et neuf largeurs sans débordement.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

if (!process.env.ELA_SANS_CONSTRUIRE) execSync('sh construire.sh', { stdio: 'ignore' });
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png',
  '.webp':'image/webp','.jpg':'image/jpeg','.txt':'text/plain','.xml':'application/xml'};
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, {'Content-Type': TYPES[extname(f)] || 'application/octet-stream'});
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8143, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:8143/';
const PAGE = SITE + 'professionnels/';
const URL_FN = 'https://yyhzutnuhuytokarynaw.supabase.co/functions/v1/demande-demo';

const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const b = await chromium.launch();

/* Le faux serveur. « reponse » décide de ce que rend « demander ». */
async function ouvrir({ w = 390, h = 844, langue = 'fr', url = PAGE, reponse = 'ok', confirmer = 'ok', stock = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: langue === 'en' ? 'en-US' : 'fr-FR' });
  await ctx.addInitScript(([l, st]) => {
    try {
      if (!sessionStorage.getItem('init')) {
        sessionStorage.setItem('init', '1');
        localStorage.setItem('ela_langue', l);
        if (st) Object.keys(st).forEach(k => localStorage.setItem(k, st[k]));
      }
    } catch (e) {}
  }, [langue, stock]);
  const p = await ctx.newPage();
  p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  p._404 = []; p.on('response', r => { if (r.url().startsWith(SITE) && r.status() >= 400) p._404.push(r.url()); });
  p._corps = []; p._demo = 0;
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.route(URL_FN, async r => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204 });
    const c = JSON.parse(r.request().postData() || '{}'); p._corps.push(c);
    const json = (status, corps) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(corps),
      headers: { 'Access-Control-Allow-Origin': '*' } });
    if (c.action === 'confirmer') {
      if (confirmer === 'ok') return json(200, { ok: true });
      if (confirmer === 'expire') return json(410, { erreur: 'jeton' });
      return json(503, { erreur: 'indisponible' });
    }
    if (reponse === 'reseau') return r.abort('failed');
    if (reponse === 'quota') return json(429, { erreur: 'quota' });
    if (reponse === 'indispo') return json(503, { erreur: 'indisponible' });
    if (reponse === 'robot') return json(403, { erreur: 'robot' });
    if (reponse.startsWith('champ:')) return json(400, { erreur: 'champ', champ: reponse.slice(6) });
    return json(200, { session: 'eyJ2IjoxfQ.signature', expire: new Date(Date.now() + 7 * 864e5).toISOString(), etablissement: c.etablissement });
  });
  // La démo elle-même n'est pas éprouvée ici : on compte seulement qu'on y va.
  await p.route(SITE + 'demo/hotel/**', r => { p._demo++; return r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Démo</title><p>démo</p>' }); });
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(150);
  return p;
}
async function remplir(p, v = {}) {
  const d = Object.assign({ etablissement: 'Hôtel des Lilas', nom: 'Marie Dupont', fonction: 'Directrice',
    email: 'direction@hoteldeslilas.fr', telephone: '06 12 34 56 78' }, v);
  await p.evaluate(() => document.getElementById('demo').scrollIntoView());
  await p.fill('#fEtablissement', d.etablissement); await p.fill('#fNom', d.nom);
  await p.fill('#fFonction', d.fonction); await p.fill('#fEmail', d.email); await p.fill('#fTelephone', d.telephone);
}
const lireMessage = p => p.evaluate(() => { const m = document.getElementById('fMessage'); return m.hidden ? '' : m.textContent; });
const lire = (p, k) => p.evaluate(k => localStorage.getItem(k), k);

// 1. Succès : session gardée, message des 7 jours, démo ouverte. Le corps.
{
  const p = await ouvrir();
  await p.click('.types label:nth-child(2)'); // Agence
  await remplir(p);
  // Un humain TRÈS rapide (moins d'une seconde après l'affichage) : la page
  // doit attendre elle-même, jamais envoyer une durée trop courte.
  await p.click('#fEnvoyer');
  await p.waitForFunction(() => /7 jours/.test(document.getElementById('fMessage').textContent), null, { timeout: 8000 }).catch(() => {});
  const msg = await lireMessage(p);
  check('succès : « Votre démonstration est ouverte — accès valable 7 jours sur cet appareil. »', msg === 'Votre démonstration est ouverte — accès valable 7 jours sur cet appareil.', msg);
  check('succès : la session est gardée sous ela_demo_session, telle que rendue', await lire(p, 'ela_demo_session') === 'eyJ2IjoxfQ.signature');
  const exp = Date.parse(await lire(p, 'ela_demo_expire') || '');
  check('succès : l\'échéance rendue par le serveur est gardée', Math.abs(exp - Date.now() - 7 * 864e5) < 120e3);
  await p.waitForURL(SITE + 'demo/hotel/', { timeout: 6000 }).catch(() => {});
  check('succès : /demo/hotel/ s\'ouvre ensuite', p.url() === SITE + 'demo/hotel/' && p._demo >= 1, p.url());
  const c = p._corps[0] || {};
  check('le corps : action « demander » et les champs saisis', c.action === 'demander' && c.type === 'agence' && c.etablissement === 'Hôtel des Lilas'
    && c.nom === 'Marie Dupont' && c.fonction === 'Directrice' && c.email === 'direction@hoteldeslilas.fr' && c.telephone === '06 12 34 56 78' && c.langue === 'fr', JSON.stringify(c));
  check('le corps : « site » toujours présent et VIDE', Object.prototype.hasOwnProperty.call(c, 'site') && c.site === '', JSON.stringify(c.site));
  check('le corps : « duree » d\'au moins 2 500 ms, même pour un envoi immédiat', typeof c.duree === 'number' && c.duree >= 2500, String(c.duree));
  check('le corps : aucune photo, aucune clé inattendue', !/photo|image|data:/i.test(JSON.stringify(c))
    && Object.keys(c).sort().join() === 'action,duree,email,etablissement,fonction,langue,nom,site,telephone,type', Object.keys(c).sort().join());
  check('le corps : un seul envoi', p._corps.length === 1, String(p._corps.length));
  check('succès : aucune erreur JavaScript', p._errs.length === 0, p._errs.join(' | '));
  await p.context().close();
}

// 2. Le champ piège.
{
  const p = await ouvrir();
  const f = await p.evaluate(() => {
    const e = document.getElementById('fCtrl'); const r = e.getBoundingClientRect();
    const boite = e.closest('.piege');
    return { nom: e.name, id: e.id, auto: e.getAttribute('autocomplete'), tab: e.tabIndex, cache: boite.getAttribute('aria-hidden'),
      dehors: r.right < 0 || r.bottom < 0 || r.left > innerWidth, type: e.type };
  });
  check('piège : son nom n\'attire pas le remplissage automatique (ni site, url, website, web, homepage)',
    !/site|url|web|home|page|link|lien|mail|name|nom|tel|phone|org|company|adresse|address/i.test(f.nom + ' ' + f.id), f.nom + ' / ' + f.id);
  check('piège : autocomplete="off", tabindex="-1", aria-hidden, hors écran', f.auto === 'off' && f.tab === -1 && f.cache === 'true' && f.dehors, JSON.stringify(f));
  // Au clavier, on passe du téléphone au bouton sans jamais toucher le piège.
  await p.focus('#fTelephone'); await p.keyboard.press('Tab');
  check('piège : la touche Tab passe du téléphone au bouton', await p.evaluate(() => document.activeElement.id) === 'fEnvoyer');
  // Même rempli (navigateur trop zélé), « site » part vide.
  await remplir(p); await p.evaluate(() => { document.getElementById('fCtrl').value = 'https://exemple.fr'; });
  await p.click('#fEnvoyer'); await p.waitForTimeout(3200);
  check('piège : même si le champ du HTML était rempli, « site » part vide', p._corps[0] && p._corps[0].site === '', JSON.stringify(p._corps[0]?.site));
  await p.context().close();
}

// 3. Visiteur revenu avant l'échéance : la démo directement.
{
  const exp = new Date(Date.now() + 3 * 864e5);
  const p = await ouvrir({ stock: { ela_demo_session: 'abc.def', ela_demo_expire: exp.toISOString() } });
  const e = await p.evaluate(() => ({ cta: document.querySelector('.hero a.bouton').getAttribute('href'),
    form: document.getElementById('formDemo').hidden, reprise: document.getElementById('demoReprise').hidden,
    texte: document.getElementById('repriseTexte').textContent }));
  const jj = ('0' + exp.getDate()).slice(-2) + '/' + ('0' + (exp.getMonth() + 1)).slice(-2);
  check('revenu : « Voir la démo hôtel » mène directement à /demo/hotel/', e.cta === '/demo/hotel/', e.cta);
  check('revenu : le formulaire est remplacé par « Votre démonstration est ouverte »', e.form && !e.reprise, JSON.stringify(e));
  check('revenu : l\'échéance est dite (« jusqu\'au ' + jj + ' »)', e.texte.includes(jj) && /sur cet appareil/.test(e.texte), e.texte);
  await p.click('.hero a.bouton'); await p.waitForURL(SITE + 'demo/hotel/', { timeout: 4000 }).catch(() => {});
  check('revenu : un appui ouvre la démo, sans aucune demande au serveur', p.url() === SITE + 'demo/hotel/' && p._corps.length === 0, p.url() + ' / ' + p._corps.length);
  await p.context().close();
  // « Faire une demande pour un autre établissement » rouvre le formulaire.
  const p2 = await ouvrir({ stock: { ela_demo_session: 'abc.def', ela_demo_expire: exp.toISOString() } });
  await p2.evaluate(() => document.getElementById('demo').scrollIntoView());
  const vu = await p2.isVisible('#repriseNouvelle');
  check('revenu : « Faire une demande pour un autre établissement » est proposé', vu);
  if (vu) await p2.click('#repriseNouvelle');
  check('revenu : « autre établissement » rouvre le formulaire', vu && await p2.evaluate(() => !document.getElementById('formDemo').hidden));
  await p2.context().close();
  // Session expirée : le formulaire, pas la démo.
  const p3 = await ouvrir({ stock: { ela_demo_session: 'abc.def', ela_demo_expire: new Date(Date.now() - 1000).toISOString() } });
  const e3 = await p3.evaluate(() => ({ cta: document.querySelector('.hero a.bouton').getAttribute('href'), form: document.getElementById('formDemo').hidden }));
  check('session expirée : le bouton mène au formulaire, qui est affiché', e3.cta === '#demo' && !e3.form, JSON.stringify(e3));
  await p3.context().close();
  // L'accueil : directement la démo si elle est ouverte, sinon le formulaire.
  const p4 = await ouvrir({ url: SITE, stock: { ela_demo_session: 'abc.def', ela_demo_expire: exp.toISOString() } });
  check('accueil, démo ouverte : « Voir la démo hôtel » mène à /demo/hotel/', await p4.evaluate(() => document.querySelector('#modele .modele-cta').getAttribute('href')) === '/demo/hotel/');
  await p4.context().close();
  const p5 = await ouvrir({ url: SITE });
  check('accueil, sans démo : « Voir la démo hôtel » mène au formulaire (/professionnels/#demo)', await p5.evaluate(() => document.querySelector('#modele .modele-cta').getAttribute('href')) === '/professionnels/#demo');
  await p5.context().close();
}

// 4. Les refus du serveur : jamais un faux succès, jamais la démo.
const QUOTA_FR = 'Vous avez atteint le nombre de demandes possibles pour le moment : 5 par heure depuis une même connexion et 3 par jour pour une même adresse e-mail. Si vous avez déjà ouvert la démonstration, elle reste accessible 7 jours sur cet appareil. Pour aller plus vite, appelez-nous au +33 7 59 31 24 33.';
const INDISPO_FR = 'Service momentanément indisponible. Appelez-nous au +33 7 59 31 24 33 ou écrivez à contact@elatransfer.com.';
for (const [rep, attendu, lib] of [['quota', QUOTA_FR, '429'], ['indispo', INDISPO_FR, '503'], ['robot', INDISPO_FR, '403'], ['reseau', INDISPO_FR, 'réseau coupé']]) {
  const p = await ouvrir({ reponse: rep });
  await remplir(p); await p.click('#fEnvoyer');
  await p.waitForFunction(() => { const m = document.getElementById('fMessage'); return !m.hidden && m.classList.contains('ko'); }, null, { timeout: 8000 }).catch(() => {});
  const msg = await lireMessage(p);
  check(`${lib} : le message attendu`, msg === attendu, msg);
  await p.waitForTimeout(1800);
  check(`${lib} : la démo ne s'ouvre pas, rien n'est gardé`, p.url() === PAGE && p._demo === 0 && !(await lire(p, 'ela_demo_session')), p.url());
  check(`${lib} : le bouton redevient utilisable`, await p.evaluate(() => !document.getElementById('fEnvoyer').disabled));
  const visible = await p.evaluate(() => { const r = document.getElementById('fMessage').getBoundingClientRect(); return r.height > 0; });
  check(`${lib} : le message est affiché`, visible);
  await p.context().close();
}

// 5. 400 : le message sous LE champ nommé par le serveur.
for (const champ of ['etablissement', 'nom', 'fonction', 'email', 'telephone', 'type']) {
  const p = await ouvrir({ reponse: 'champ:' + champ });
  await remplir(p); await p.click('#fEnvoyer');
  await p.waitForFunction(c => !document.getElementById('err-' + c).hidden, champ, { timeout: 8000 }).catch(() => {});
  const e = await p.evaluate(c => ({ ce: document.getElementById('err-' + c).hidden ? '' : document.getElementById('err-' + c).textContent,
    autres: [...document.querySelectorAll('.erreur-champ')].filter(x => !x.hidden && x.id !== 'err-' + c).length,
    general: document.getElementById('fMessage').hidden, dansChamp: !!document.querySelector('#champ-' + c + ' #err-' + c) }), champ);
  check(`400 ${champ} : un message sous ce champ, et lui seul`, !!e.ce && e.autres === 0 && e.dansChamp && e.general, JSON.stringify(e));
  check(`400 ${champ} : la démo ne s'ouvre pas`, p._demo === 0 && !(await lire(p, 'ela_demo_session')));
  await p.context().close();
}

// 6. Les contrôles de la page, avant tout envoi.
{
  const p = await ouvrir();
  await p.evaluate(() => document.getElementById('demo').scrollIntoView());
  await p.click('#fEnvoyer'); await p.waitForTimeout(300);
  const vides = await p.evaluate(() => ['etablissement', 'nom', 'email', 'telephone'].filter(c => !document.getElementById('err-' + c).hidden));
  check('vide : les quatre champs obligatoires le disent, sous eux', vides.length === 4, vides.join());
  check('vide : rien ne part', p._corps.length === 0);
  check('vide : la fonction est facultative', await p.evaluate(() => document.getElementById('err-fonction').hidden));
  check('vide : le curseur va au premier champ en erreur', await p.evaluate(() => document.activeElement.id) === 'fEtablissement');
  await remplir(p, { telephone: '87654321', email: 'pas-une-adresse' });
  await p.click('#fEnvoyer'); await p.waitForTimeout(300);
  const e = await p.evaluate(() => ['email', 'telephone'].map(c => document.getElementById('err-' + c).textContent));
  check('faux numéro (telephone.js) et fausse adresse : refusés, sous leur champ', /numéro/.test(e[1]) && /adresse/.test(e[0]) && p._corps.length === 0, e.join(' | '));
  await remplir(p, { telephone: '+44 20 7946 0958' }); await p.click('#fEnvoyer'); await p.waitForTimeout(3200);
  check('un numéro étranger avec indicatif passe', p._corps.length === 1, String(p._corps.length));
  await p.context().close();
}

// 7. Le lien de confirmation de l'e-mail.
for (const [conf, attendu, efface] of [['ok', 'Adresse e-mail confirmée, merci.', true], ['expire', 'Ce lien a expiré ou a déjà servi.', true], ['panne', 'La confirmation n\'a pas pu aboutir pour le moment. Rouvrez le lien un peu plus tard.', false]]) {
  const jeton = 'A'.repeat(43);
  const p = await ouvrir({ url: PAGE + '?confirmer=' + jeton, confirmer: conf });
  await p.waitForFunction(() => !document.getElementById('avisConfirmation').hidden, null, { timeout: 5000 }).catch(() => {});
  const t = await p.evaluate(() => document.querySelector('#avisConfirmation span').textContent);
  check(`confirmation ${conf} : « ${attendu} »`, t === attendu, t);
  const c = p._corps[0] || {};
  check(`confirmation ${conf} : « confirmer » part avec le jeton du lien, et rien d'autre`, c.action === 'confirmer' && c.jeton === jeton && Object.keys(c).length === 2, JSON.stringify(c));
  const u = new URL(p.url());
  check(`confirmation ${conf} : le paramètre ${efface ? 'est effacé de' : 'reste dans'} la barre d'adresse`, efface ? !u.searchParams.has('confirmer') : u.searchParams.get('confirmer') === jeton, p.url());
  check(`confirmation ${conf} : la démo ne s'ouvre pas pour autant`, p._demo === 0 && !(await lire(p, 'ela_demo_session')));
  await p.context().close();
}

// 8. Anglais.
{
  const p = await ouvrir({ langue: 'en', reponse: 'quota' });
  const t = await p.evaluate(() => document.getElementById('demo').innerText);
  check('EN : la section est en anglais', /See the hotel demo/.test(t) && /valid for 7 days on this device/.test(t) && /Business email/.test(t) && !/Nom complet|Téléphone|facultatif/.test(t), t.slice(0, 200));
  check('EN : la phrase de données personnelles est en anglais', /You can object at any time/.test(t));
  await remplir(p); await p.click('#fEnvoyer');
  await p.waitForFunction(() => !document.getElementById('fMessage').hidden && document.getElementById('fMessage').classList.contains('ko'), null, { timeout: 8000 }).catch(() => {});
  const m = await lireMessage(p);
  check('EN : le message de limite dit les deux limites, en anglais', /5 per hour/.test(m) && /3 per day/.test(m) && /7 days on this device/.test(m), m);
  check('EN : le corps porte langue « en »', p._corps[0] && p._corps[0].langue === 'en');
  // Changer de langue réécrit ce qui est déjà affiché.
  await p.click('#langue');
  check('FR après EN : le message affiché passe en français', await lireMessage(p) === QUOTA_FR);
  await p.context().close();
}
// La phrase de données personnelles, telle que demandée, et son lien.
{
  const p = await ouvrir();
  const r = await p.evaluate(() => { const e = document.querySelector('.rgpd'); return { t: e.textContent.replace(/\s+/g, ' ').trim(), href: e.querySelector('a').getAttribute('href') }; });
  check('la phrase de données personnelles est celle demandée', r.t.startsWith('Vos coordonnées sont utilisées pour vous donner accès à la démonstration et vous recontacter au sujet des services Elatransfer. Vous pouvez vous y opposer à tout moment.'), r.t);
  check('elle mène à la politique de confidentialité', r.href === '/?doc=privacy', r.href);
  check('aucune case à cocher (rien de précoché, aucune lettre d\'information)', await p.evaluate(() => document.querySelectorAll('#formDemo input[type=checkbox]').length === 0));
  check('téléphone, WhatsApp et e-mail restent sous le formulaire', await p.evaluate(() => ['tel:+33759312433', 'https://wa.me/33759312433', 'mailto:contact@elatransfer.com']
    .every(h => document.querySelector('#demo a[href="' + h + '"]'))));
  await p.context().close();
}

// 9. Neuf largeurs, deux langues : aucun débordement ; la cible tactile.
for (const w of [320, 375, 390, 430, 768, 820, 1280, 1366, 1440]) {
  for (const langue of ['fr', 'en']) {
    const p = await ouvrir({ w, h: 900, langue, reponse: 'quota' });
    await remplir(p); await p.click('#fEnvoyer');
    await p.waitForFunction(() => !document.getElementById('fMessage').hidden && document.getElementById('fMessage').classList.contains('ko'), null, { timeout: 8000 }).catch(() => {});
    await p.evaluate(() => { document.getElementById('err-email').hidden = false; document.getElementById('err-email').textContent = 'x'.repeat(80); });
    const m = await p.evaluate(() => ({ doc: document.documentElement.scrollWidth, vue: innerWidth,
      fautif: [...document.querySelectorAll('#demo *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && !e.closest('.piege'); })
        .slice(0, 3).map(e => e.tagName + '#' + e.id + '.' + e.className + ' [' + Math.round(e.getBoundingClientRect().right) + ']'),
      petits: [...document.querySelectorAll('#formDemo input:not([tabindex="-1"]):not([type=radio]), #formDemo button, .types span')]
        .filter(e => e.getBoundingClientRect().height < 44).map(e => e.id || e.textContent) }));
    check(`${w} px ${langue.toUpperCase()} : aucun débordement, message de limite affiché`, m.doc <= m.vue && m.fautif.length === 0, JSON.stringify(m.fautif));
    check(`${w} px ${langue.toUpperCase()} : champs et boutons d'au moins 44 px`, m.petits.length === 0, m.petits.join());
    check(`${w} px ${langue.toUpperCase()} : aucune erreur`, p._errs.length === 0 && p._404.length === 0, p._errs.concat(p._404).join(' | '));
    await p.context().close();
  }
}

// 10. Le bouton du haut mène au formulaire.
{
  const p = await ouvrir({ w: 390, h: 844 });
  await p.click('.hero a.bouton'); await p.waitForTimeout(700);
  const r = await p.evaluate(() => { const f = document.getElementById('formDemo').getBoundingClientRect(); return { haut: Math.round(document.getElementById('demo').getBoundingClientRect().top), form: f.height }; });
  check('« Voir la démo hôtel » amène au formulaire (#demo)', r.haut >= 0 && r.haut < 200 && r.form > 200, JSON.stringify(r));
  await p.context().close();
}

// 11. Sur téléphone, le formulaire vient AVANT « Vous préférez nous parler ? »
//     (recette du 8/10/2026 : les trois liens repoussaient le formulaire de
//     467 px). Sur ordinateur, les liens restent dans la colonne de gauche.
for (const [w, h] of [[390, 844], [1280, 800]]) {
  const p = await ouvrir({ w, h });
  const r = await p.evaluate(() => { const f = document.getElementById('formDemo').getBoundingClientRect(),
    a = document.querySelector('.demo-autres').getBoundingClientRect(), d = document.getElementById('demo').getBoundingClientRect();
    return { formHaut: Math.round(f.top - d.top), formBas: Math.round(f.bottom - d.top), formGauche: Math.round(f.left),
      liensHaut: Math.round(a.top - d.top), liensDroite: Math.round(a.right), liensVisibles: a.height > 0 }; });
  if (w < 900) check(`${w} px : le formulaire passe avant les liens d'appel, qui restent juste dessous`,
    r.liensVisibles && r.formBas <= r.liensHaut && r.liensHaut - r.formBas < 80, JSON.stringify(r));
  else check(`${w} px : les liens d'appel restent dans la colonne de gauche, à côté du formulaire`,
    r.liensVisibles && r.liensDroite <= r.formGauche && r.liensHaut < r.formBas, JSON.stringify(r));
  await p.context().close();
}

await b.close();
await new Promise(r => serveur.close(r));
console.log('\n=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
process.exit(ko.length ? 1 : 0);
