/* =====================================================================
   LA DÉMO DES PROFESSIONNELS — /demo/hotel/, SUR LE SITE CONSTRUIT
   ---------------------------------------------------------------------
   Octobre 2026, mission « Démo professionnels », bloc 3. Un prospect qui a
   rempli le formulaire de /professionnels/ ouvre une démo à son nom : il
   réserve comme un client, et voit la course arriver chez sa réception.

   LA RÈGLE ABSOLUE : la démo est INCAPABLE de toucher la production. Trois
   défenses, éprouvées ici SÉPARÉMENT :
     1. la règle CSP de la page (et la même dans _headers) — un appel tapé à
        la main vers Supabase est refusé PAR LE NAVIGATEUR ;
     2. verifier-demo.mjs — on pose un mot interdit dans une copie du site,
        la vérification doit tomber, mot par mot ;
     3. ce que fait la page — aucune requête vers Supabase hors demande-demo,
        même en appelant à la main les fonctions de réservation, et aucun
        paramètre d'adresse n'y change rien.
   Le serveur demande-demo est simulé (route Playwright) : la suite ne
   touche aucun réseau.
   ===================================================================== */
import { chromium } from 'playwright';
import { execSync, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, cpSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { tmpdir } from 'node:os';

execSync('sh construire.sh', { cwd: process.cwd(), stdio: 'ignore' });
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
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
await new Promise(r => serveur.listen(8141, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8141';
setTimeout(() => { console.log('=== ÉCHECS (1) ===\n  ✘ la suite ne répond plus'); process.exit(1); }, 300000).unref();

const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const SUPA = 'yyhzutnuhuytokarynaw.supabase.co';
const DEMANDE = `https://${SUPA}/functions/v1/demande-demo`;

const b = await chromium.launch();
/* La couleur qu'on VOIT : la première du dégradé s'il y en a un, sinon le fond. */
const peinte = (p, sel) => p.evaluate(s => { const c = getComputedStyle(document.querySelector(s));
  return (/rgb\([^)]*\)/.exec(c.backgroundImage) || [c.backgroundColor])[0]; }, sel);

/* Une page de démo, avec un faux demande-demo. `reponse` : objet rendu par
   « ouvrir », ou un statut (401, 503), ou « muet » (le réseau tombe). */
async function ouvrir({ w = 390, h = 844, session = 's.test', reponse = {}, chemin = '/demo/hotel/', locale = 'fr-FR' } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale });
  if (session !== null) await ctx.addInitScript((s) => { try { if (!sessionStorage.getItem('__pose')) { localStorage.setItem('ela_demo_session', s); sessionStorage.setItem('__pose', '1'); } } catch (e) {} }, session);
  const p = await ctx.newPage();
  p.errs = []; p.supabase = []; p.appels = []; p.violations = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.exposeFunction('__violation', v => p.violations.push(v));
  await p.addInitScript(() => document.addEventListener('securitypolicyviolation', e => window.__violation(e.blockedURI + ' ' + e.violatedDirective)));
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(BASE)) return r.continue();
    if (u.includes(SUPA)) {
      if (u === DEMANDE) {
        let corps = {}; try { corps = JSON.parse(r.request().postData() || '{}'); } catch {}
        p.appels.push(corps);
        if (reponse === 'muet') return r.abort();
        if (typeof reponse === 'number') return r.fulfill({ status: reponse, contentType: 'application/json', body: JSON.stringify({ erreur: 'session' }) });
        return r.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ ok: true, etablissement: 'Hôtel Ibis Roissy', type: 'hotel', expire: new Date(Date.now() + 6048e5).toISOString(), ...reponse }) });
      }
      p.supabase.push(u);
      return r.abort();
    }
    if (u.includes('api-adresse.data.gouv.fr') && decodeURIComponent(u).toLowerCase().includes('stade'))
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ features: [{ geometry: { coordinates: [2.3601, 48.9245] }, properties: { label: 'Stade de France, 93200 Saint-Denis', type: 'poi', score: 0.9 } }] }) });
    if (u.includes('photon.komoot.io') || u.includes('api-adresse.data.gouv.fr'))
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ features: [] }) });
    if (u.includes('router.project-osrm.org'))
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ routes: [{ distance: 9000, duration: 900 }] }) });
    return r.abort();
  });
  await p.goto(BASE + chemin);
  await p.waitForTimeout(1200);
  return { ctx, p };
}
const visible = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel);
const texte = (p, sel) => p.evaluate(s => document.querySelector(s)?.textContent || '', sel);
/* Le bandeau, sans la ligne de l'échéance posée dessous (bloc 4). */
const bandeau = p => p.evaluate(() => document.getElementById('demoBandeau')?.firstChild?.textContent || '');
const jjmm = ms => { const d = new Date(ms); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2); };

/* ═══ 0. UNE ÉCHÉANCE ILLISIBLE NE S'INVENTE PAS ═══ */
{
  const { ctx, p } = await ouvrir({ reponse: { expire: 'demain' } });
  check('échéance illisible : la démo s\'ouvre, et le bandeau n\'invente aucune date', await visible(p, '#demoArrivee') && !(await p.$('#demoAcces')));
  await ctx.close();
}
/* ═══ 1. LE NOM VIENT DE LA RÉPONSE, EN TEXTE ═══ */
{
  const { ctx, p } = await ouvrir();
  check('la démo s\'ouvre avec une session valable', await visible(p, '#demoArrivee'));
  check('… sur la page d\'arrivée, au nom rendu par « ouvrir »', await p.evaluate(() =>
    [...document.querySelectorAll('#demoArrivee [data-demo-arrivee="nom"]')].every(e => e.textContent === 'Hôtel Ibis Roissy')));
  /* LE TITRE A DEUX COULEURS, COMME LA VRAIE PAGE (25/10/2026, vu par
     Barbaros sur sa capture) : « Votre transfert depuis » en accent, le nom
     de l'hôtel de la couleur du titre. Dans un <span>, le nom prenait
     l'accent. */
  const titre = await p.evaluate(() => { const h1 = document.querySelector('#demoArrivee .qr-hero h1'); if (!h1) return null;
    const nom = [...h1.childNodes].find(n => n.nodeType === 3 && n.nodeValue.includes('Hôtel Ibis Roissy'));
    const accent = h1.querySelector('#demoArrivee-titreHaut');
    return { nomDansLeTitre: !!nom, couleurTitre: getComputedStyle(h1).color, couleurAccent: accent && getComputedStyle(accent).color }; });
  check('le titre de la page d\'arrivée a deux couleurs : l\'accent, puis le nom de l\'hôtel en couleur du titre',
    !!titre && titre.nomDansLeTitre && titre.couleurTitre !== titre.couleurAccent, JSON.stringify(titre));
  check('le nom rendu par « ouvrir » est affiché', (await texte(p, '#hotelTeteNom')) === 'Hôtel Ibis Roissy', await texte(p, '#hotelTeteNom'));
  check('un rond porte les initiales, pas un logo', (await texte(p, '.demo-initiales')) === 'HI', await texte(p, '.demo-initiales'));
  check('la zone photo dit « Votre photo ici »', (await texte(p, '#demoPhotoTexte')) === 'Votre photo ici');
  check('la pastille dit que les prix sont ceux du flyer', /Vos prix : ceux de votre flyer/.test(await texte(p, '#demoExemple')));
  check('le bandeau dit « Démonstration — aucune réservation réelle »', (await bandeau(p)) === 'Démonstration — aucune réservation réelle');
  /* « Ce n'est pas indéfini » (bloc 4) : l'échéance rendue par « ouvrir ». */
  const jj = jjmm(Date.now() + 6048e5);
  check('le bandeau dit l\'échéance de l\'accès (« jusqu\'au ' + jj + ' »)', (await texte(p, '#demoAcces')) === 'Accès valable jusqu\'au ' + jj + ' sur cet appareil', await texte(p, '#demoAcces'));
  check('les deux onglets sont là', (await texte(p, '#demoOngletClient')) === 'Ce que voit votre client' && (await texte(p, '#demoOngletReception')) === 'Ce que voit votre réception');
  check('le bandeau reste en haut après défilement', await p.evaluate(() => { scrollTo(0, 900); const r = document.getElementById('demoBandeau').getBoundingClientRect(); return r.top <= 1 && r.bottom > 10; }));
  check('« ouvrir » est appelé avec la session et sans clé Supabase', p.appels.length >= 1 && p.appels[0].action === 'ouvrir' && p.appels[0].session === 's.test' && !JSON.stringify(p.appels).includes('apikey'));
  check('un QR code mène à la page des professionnels', await p.evaluate(() => !!document.querySelector('#demoQr svg')));
  /* LA VRAIE PAGE DU QR PORTE LA PHOTO DU BÂTIMENT D'EASYHOTEL (25/10/2026) :
     la démo, fabriquée depuis elle, ne la montre JAMAIS ; à sa place, le cadre
     « Votre photo ici », qui ouvre le choix du fichier. */
  check('la page d\'arrivée ne montre aucune photo de l\'hôtel réel', await p.evaluate(() => {
    const f = getComputedStyle(document.querySelector('#demoArrivee .qr-hero')).backgroundImage; return !/url\(/.test(f); }));
  check('« Votre photo ici » est en haut de la page d\'arrivée, là où la vraie montre le bâtiment',
    (await texte(p, '#demoPhotoArrivee')) === 'Votre photo ici' && await visible(p, '#demoPhotoArrivee')
    && await p.evaluate(() => document.getElementById('demoPhotoArrivee').getBoundingClientRect().bottom < document.querySelector('#demoArrivee .qr-hero h1').getBoundingClientRect().top + 4));
  const [choixArrivee] = await Promise.all([p.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null), p.click('#demoPhotoArrivee')]);
  check('… et ce cadre ouvre le choix du fichier', !!choixArrivee);
  check('les forfaits ne sont pas ceux d\'un partenaire réel', !/easyhotel/i.test(await p.content()));
  check('aucune erreur JavaScript à l\'ouverture', p.errs.length === 0, p.errs.join(' ; '));
  await ctx.close();
}
{
  const { ctx, p } = await ouvrir({ reponse: { etablissement: '' } });
  check('nom vide → « Hôtel Démo · Roissy »', (await texte(p, '#hotelTeteNom')) === 'Hôtel Démo · Roissy', await texte(p, '#hotelTeteNom'));
  await ctx.close();
}
{
  const piege = '<img src=x onerror="window.__pirate=1">Hôtel <b>Gras</b>';
  const { ctx, p } = await ouvrir({ reponse: { etablissement: piege } });
  check('un nom à chevrons s\'affiche en texte', (await texte(p, '#hotelTeteNom')) === piege.slice(0, 60), await texte(p, '#hotelTeteNom'));
  check('… et n\'injecte aucun élément', await p.evaluate(() => !window.__pirate && !document.querySelector('#hotelTete img, #hotelTete b')));
  check('… ni sur la page d\'arrivée', await p.evaluate((n) => !document.querySelector('#demoArrivee [data-demo-arrivee] *')
    && [...document.querySelectorAll('#demoArrivee [data-demo-arrivee="nom"]')].every(e => e.textContent === n), piege.slice(0, 60)));
  await ctx.close();
}
{
  const { ctx, p } = await ouvrir({ reponse: { type: 'agence', etablissement: 'Voyages Martin' } });
  check('agence → « Ce que voit votre équipe »', (await texte(p, '#demoOngletReception')) === 'Ce que voit votre équipe');
  await ctx.close();
}

/* ═══ 2. L'ACCÈS EST FERMÉ PAR DÉFAUT ═══ */
{
  const { ctx, p } = await ouvrir({ session: null });
  check('sans session → retour au formulaire', p.url().endsWith('/professionnels/#demo'), p.url());
  await ctx.close();
}
{
  const { ctx, p } = await ouvrir({ reponse: 401 });
  check('session refusée → retour au formulaire', p.url().endsWith('/professionnels/#demo'), p.url());
  check('… et la session refusée est oubliée', await p.evaluate(() => localStorage.getItem('ela_demo_session') === null));
  await ctx.close();
}
/* 403 « origine » et 413 « taille » (contrat du bloc 2) : un refus, jamais la démo. */
for (const panne of ['muet', 503, 403, 413, 429]) {
  const { ctx, p } = await ouvrir({ reponse: panne });
  check(`serveur ${panne} → « Démonstration momentanément indisponible »`, /Démonstration momentanément indisponible/.test(await texte(p, '#demoIndispo')) && await visible(p, '#demoIndispo'));
  check(`serveur ${panne} → un contact est proposé`, await p.evaluate(() => !!document.querySelector('#demoIndispo a[href="/professionnels/#contact"]')));
  check(`serveur ${panne} → la démo n'est jamais montrée`, !(await visible(p, '#demoArrivee')) && !(await visible(p, '#hotelTete')) && !(await visible(p, '#btnVoirPrix')));
  await ctx.close();
}
{
  const { ctx, p } = await ouvrir({ reponse: 'muet', chemin: '/demo/hotel/reception/' });
  check('réception, serveur muet → fermée aussi', await visible(p, '#demoIndispo') && !(await visible(p, '#recCorps')));
  await ctx.close();
}

/* ═══ 2 bis. L'ARRIVÉE EST LA VRAIE PAGE DU QR (25/10/2026) ═══
   Barbaros : « ce que je présente en démo est bien derrière ». La démo
   montrait une copie de la page du QR dessinée le 8/10 ; la vraie avait
   changé, la copie non. Elle est désormais fabriquée depuis la page publiée
   (construire-demo.mjs) : chaque bloc VISIBLE de la vraie page doit y être,
   avec le même dessin mesuré — sans quoi la démo reprend du retard en
   silence, ou la feuille du moteur déborde sur elle. */
const versDemo = sel => '#demoArrivee ' + sel.replace(/\.([a-z][\w-]*)/g, '.qr-$1');
const DESSIN = ['.hero h1', '.adresse', '.fixe', '.cta', '.note', '.dest h2', '.carte[data-dest="cdg"]', '.carte[data-dest="cdg"] .pict',
  '.carte[data-dest="cdg"] .nom b', '.carte[data-dest="cdg"] .nom small', '.carte[data-dest="cdg"] .px i', '.autre', '.etapes', '.etapes em', '.aide h2', '.btns a', '.pied img', '.pied nav a', '.top .ela', '.top .lang'];
const PROPRIETES = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'display', 'paddingTop', 'paddingLeft',
  'borderTopLeftRadius', 'borderTopWidth', 'gridTemplateColumns', 'marginTop', 'marginBottom'];
for (const w of [390, 1280]) {
  const ctxReel = await b.newContext({ viewport: { width: w, height: 844 }, locale: 'fr-FR' });
  await ctxReel.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
  const reel = await ctxReel.newPage();
  await reel.goto(BASE + '/easyhotel-client/'); await reel.waitForTimeout(400);
  const { ctx, p } = await ouvrir({ w });
  const blocs = await reel.evaluate(() => [...new Set([...document.querySelectorAll('header, header [class], main [class], footer')].filter(e => {
    const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }).flatMap(e => [...e.classList]))]);
  const manquent = await p.evaluate(cs => cs.filter(c => ![...document.querySelectorAll('#demoArrivee .qr-' + c)].some(e => {
    const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })), blocs);
  check(`arrivée ${w} px : chaque bloc de la vraie page du QR y est (${blocs.length})`, blocs.length > 10 && manquent.length === 0, manquent.length ? 'manquent : ' + manquent.join(', ') : '');
  const mesurer = (pg, liste) => pg.evaluate(([liste, props]) => liste.map(s => { const e = document.querySelector(s); if (!e) return null;
    const c = getComputedStyle(e), r = e.getBoundingClientRect(); const m = { largeur: Math.round(r.width) };
    props.forEach(k => { m[k] = k === 'gridTemplateColumns' ? c[k].split(' ').filter(Boolean).length : c[k]; }); return m; }), [liste, PROPRIETES]);
  const [vrai, demo] = [await mesurer(reel, DESSIN), await mesurer(p, DESSIN.map(versDemo))];
  const ecarts = [];
  DESSIN.forEach((s, i) => {
    if (!vrai[i] || !demo[i]) { ecarts.push(`${s} absent`); return; }
    /* La colonne du nom prend la place que lui laisse celle des prix (« à
       fixer » est plus court que « 35 € ») : sa largeur dépend du texte. */
    for (const k of Object.keys(vrai[i])) if (!(k === 'largeur' && / \.nom /.test(s)) && String(vrai[i][k]) !== String(demo[i][k]))
      ecarts.push(`${s} ${k} ${vrai[i][k]} ≠ ${demo[i][k]}`);
  });
  check(`arrivée ${w} px : le même dessin que la vraie page (polices, marges, colonnes, largeurs)`, ecarts.length === 0, ecarts.slice(0, 6).join(' ; '));
  const colonnes = (pg, s) => pg.evaluate(s => { const e = document.querySelector(s); return e ? getComputedStyle(e).gridTemplateColumns.split(' ').length : 0; }, s);
  const [colReel, colDemo] = [await colonnes(reel, '.grille'), await colonnes(p, '#demoArrivee .qr-grille')];
  check(`arrivée ${w} px : les cartes ont autant de colonnes que sur la vraie page`, colReel > 0 && colReel === colDemo, colReel === colDemo ? '' : `${colReel} ≠ ${colDemo}`);
  /* JAMAIS LA COULEUR D'UN PARTENAIRE RÉEL : on lit ce que l'écran peint. */
  const orange = await p.evaluate(() => {
    const teintes = []; const lire = v => [...String(v).matchAll(/rgba?\((\d+), (\d+), (\d+)/g)].map(m => [+m[1], +m[2], +m[3]]);
    for (const e of [document.getElementById('demoArrivee'), ...document.querySelectorAll('#demoArrivee *')].filter(Boolean)) {
      const c = getComputedStyle(e);
      for (const v of [c.color, c.backgroundColor, c.borderTopColor, c.backgroundImage, c.boxShadow, c.stroke])
        for (const [r, g, bl] of lire(v)) { const max = Math.max(r, g, bl), min = Math.min(r, g, bl);
          if (max === r && max - min >= 90) { const t = 60 * (g - bl) / (max - min); if (t >= 10 && t <= 45) teintes.push(`${e.className || e.tagName} rgb(${r},${g},${bl})`); } }
      const apres = getComputedStyle(e, '::after').backgroundImage;
      for (const [r, g, bl] of lire(apres)) { const max = Math.max(r, g, bl), min = Math.min(r, g, bl);
        if (max === r && max - min >= 90) { const t = 60 * (g - bl) / (max - min); if (t >= 10 && t <= 45) teintes.push(`${e.className}::after rgb(${r},${g},${bl})`); } }
    }
    return teintes;
  });
  check(`arrivée ${w} px : aucune couleur orange d'un partenaire réel`, orange.length === 0, orange.slice(0, 4).join(' ; '));
  check(`arrivée ${w} px : rien ne déborde`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check(`arrivée ${w} px : aucune erreur JavaScript`, p.errs.length === 0, p.errs.join(' ; '));
  await ctx.close(); await ctxReel.close();
}

/* ═══ 2 ter. LES THÈMES DU PROSPECT (25/10/2026) ═══
   Barbaros, au fil des essais (noir et or, blanc…), garde le Bleu et le Noir.
   Un thème repeint les trois
   écrans (page du QR, formulaire, réception) : AUCUN NE DOIT RENDRE
   ILLISIBLE UN TEXTE QUE LE BLEU LAISSE LISIBLE. On mesure le contraste de
   CHAQUE texte sur son fond, clair compris (le thème Blanc retourne les
   bandeaux), et on le compare à ce que donne le Bleu — ses petits défauts
   d'origine (les pastilles « 1 2 3 » du formulaire, les flèches de la page
   du QR, le blanc sur le vert de WhatsApp) ne sont pas ceux des thèmes.
   Mesuré avant correction : l'or sous du blanc (1,9:1), le « EN » noir sur
   le noir du comptoir (1,02:1), l'onglet doré sur blanc (2,4:1), les liens
   blancs sur le blanc du thème Blanc (1:1). Et le grand bouton du bandeau se
   détache de son fond au moins autant que dans le Bleu (un bouton noir sur
   le noir disparaît, quel que soit son texte). */
const SCAN_CONTRASTE = () => {
  const rvb = s => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(s || ''); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
  const L = c => { const t = c.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * t[0] + .7152 * t[1] + .0722 * t[2]; };
  const fondDe = e => { for (let x = e; x; x = x.parentElement) { const c = getComputedStyle(x);
    const g = /gradient/.test(c.backgroundImage) ? rvb(c.backgroundImage) : null; if (g && g[3] > .9) return g;
    const f = rvb(c.backgroundColor); if (f && f[3] > .9) return f; } return [255, 255, 255, 1]; };
  const fautes = [];
  for (const e of document.querySelectorAll('body *')) {
    if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = e.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight * 3) continue;
    const c = getComputedStyle(e); if (c.visibility === 'hidden' || +c.opacity < .5 || e.closest('#demoBandeau,#demoCadre,#demoPied,svg')) continue;
    const fond = fondDe(e), t = rvb(c.color); if (!t) continue;
    const x = L(t), y = L(fond), q = (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
    const grand = parseFloat(c.fontSize) >= 24 || (parseFloat(c.fontSize) >= 18.66 && +c.fontWeight >= 700);
    if (q < (grand ? 3 : 4.5)) fautes.push(`${e.id ? '#' + e.id : String(e.className || e.tagName).slice(0, 30)} « ${e.textContent.trim().slice(0, 20)} »`);
  }
  return fautes;
};
for (const w of [390, 1280]) {
  const { ctx, p } = await ouvrir({ w });
  const themes = await p.$$eval('#demoPerso .demo-pastille[data-theme]', l => l.map(b => b.getAttribute('data-theme')));
  check(`thèmes ${w} px : plusieurs thèmes, le premier par défaut`, themes.length >= 2, themes.join(', '));
  const mesures = {};
  for (const t of themes) {
    await p.evaluate(t => localStorage.setItem('ela_demo__ela_demo_perso', JSON.stringify({ theme: t })), t);
    await p.goto(BASE + '/demo/hotel/'); await p.waitForTimeout(1200);
    const fautes = await p.evaluate(SCAN_CONTRASTE);
    const cta = await peinte(p, '#demoArrivee .qr-cta');
    const detache = await p.evaluate(() => {
      const rvb = s => (/rgba?\([^)]*\)/.exec(s) || ['rgb(0,0,0)'])[0].match(/[\d.]+/g).slice(0, 3).map(Number);
      const L = c => { const t = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * t[0] + .7152 * t[1] + .0722 * t[2]; };
      const peint = e => { const c = getComputedStyle(e); return rvb(/gradient/.test(c.backgroundImage) ? c.backgroundImage : c.backgroundColor); };
      const [x, y] = [L(peint(document.querySelector('#demoArrivee .qr-cta'))), L(peint(document.querySelector('#demoArrivee .qr-hero')))];
      return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
    });
    await p.click('.demo-carte[data-dest="orly"]'); await p.waitForTimeout(500); await p.evaluate(() => scrollTo(0, 0));
    fautes.push(...(await p.evaluate(SCAN_CONTRASTE)).map(f => 'formulaire ' + f));
    await p.goto(BASE + '/demo/hotel/reception/'); await p.waitForTimeout(1500);
    fautes.push(...(await p.evaluate(SCAN_CONTRASTE)).map(f => 'réception ' + f));
    mesures[t] = { fautes, cta, detache };
  }
  const base = new Set((mesures[themes[0]] || { fautes: [] }).fautes);
  for (const t of themes.slice(1)) {
    const nouvelles = mesures[t].fautes.filter(f => !base.has(f));
    check(`thème « ${t} » ${w} px : aucun texte illisible que le thème par défaut laisse lisible`, nouvelles.length === 0, nouvelles.slice(0, 4).join(' ; '));
  }
  check(`thèmes ${w} px : chacun repeint la page du QR`, new Set(themes.map(t => mesures[t].cta)).size === themes.length, themes.map(t => mesures[t].cta).join(' · '));
  const peuDetaches = themes.slice(1).filter(t => mesures[t].detache < mesures[themes[0]].detache - .01);
  check(`thèmes ${w} px : le grand bouton se détache de son bandeau au moins autant que dans le thème par défaut`, peuDetaches.length === 0,
    themes.map(t => `${t} ${mesures[t].detache.toFixed(2)}`).join(' · '));
  check(`thèmes ${w} px : aucune erreur JavaScript`, p.errs.length === 0, p.errs.join(' ; '));
  await ctx.close();
}

/* Une couleur gardée d'avant le 25/10/2026 (l'or, un choix libre) n'est plus
   appliquée : le prospect revenu voit le bleu, pas une page moutarde. */
{
  const { ctx, p } = await ouvrir();
  await p.evaluate(() => localStorage.setItem('ela_demo__ela_demo_perso', JSON.stringify({ couleur: '#9A6A1F' })));
  await p.reload(); await p.waitForTimeout(1200);
  check('perso : une couleur hors des thèmes, gardée d\'avant, n\'est plus appliquée : c\'est le thème par défaut',
    (await peinte(p, '#demoArrivee .qr-cta')) === 'rgb(14, 111, 199)', await peinte(p, '#demoArrivee .qr-cta'));
  await ctx.close();
}

/* ═══ 3. LE PARCOURS CLIENT → RÉCEPTION ═══ */
{
  const { ctx, p } = await ouvrir();
  /* LA PAGE D'ARRIVÉE : les cartes d'abord, le formulaire ensuite. */
  check('arrivée : « Où souhaitez-vous aller ? » et les cartes à l\'ouverture', /Où souhaitez-vous aller/.test(await texte(p, '#demoArrivee')) && await visible(p, '.demo-carte[data-dest="cdg"]'));
  check('arrivée : le formulaire attend qu\'on choisisse', !(await visible(p, '#btnVoirPrix')));
  check('arrivée : une carte par destination, plus « Autre destination »',
    await p.evaluate(() => document.querySelectorAll('.demo-carte').length === document.querySelectorAll('#hotelDest option').length));
  /* AUCUN PRIX PROPOSÉ (8/10/2026) : l'hôtel fixe les siens, ceux de son flyer. */
  check('arrivée : aucun prix proposé, toutes les cartes disent « à fixer »', await p.evaluate(() =>
    [...document.querySelectorAll('.demo-carte:not(.demo-autre)')].every(c => /à fixer[\s\S]*à fixer/.test(c.innerText) && !/\d\s€/.test(c.innerText))));
  check('arrivée : une consigne dit de toucher une destination pour continuer', /Touchez une destination/.test(await texte(p, '#demoCartesAide')) && await visible(p, '#demoCartesAide'));
  /* « Prix fixes » au-dessus de cartes « à fixer » se contredisait (recette du
     8/10/2026) : la phrase d'en-tête ne promet pas un prix qui n'existe pas. */
  check('arrivée : l\'en-tête des cartes ne dit pas « Prix fixes » quand les prix sont à fixer',
    !/prix fixes/i.test(await texte(p, '#demoArrivee .qr-cap')) && /à fixer/i.test(await texte(p, '#demoArrivee .qr-cap')),
    await texte(p, '#demoArrivee .qr-cap'));
  check('arrivée : à 390 px, cet en-tête tient sur une ligne', await p.evaluate(() => {
    const e = document.querySelector('#demoArrivee .qr-cap'); if (!e) return false; const lh = parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.3;
    return e.getBoundingClientRect().height < lh * 1.5; }));
  check('arrivée : la page dit que ces prix sont ceux du flyer', /ceux de votre flyer/.test(await texte(p, '#demoCartesFlyer')));
  /* LE LIEN QR CODE → CETTE PAGE EST DIT AVANT ELLE (25/10/2026, Barbaros :
     « il faut bien expliquer que la landing page est associée au QR code
     installé ou celui du flyer »), et l'étape suit la page. */
  check('arrivée : le fil de la démo dit « 1 », le QR code de l\'accueil ou du flyer, et qu\'on arrive ici',
    (await texte(p, '#demoGuide .demo-guide-num')) === '1' && /QR code[\s\S]*accueil[\s\S]*flyer[\s\S]*ici/.test(await texte(p, '#demoGuide'))
    && await p.evaluate(() => document.getElementById('demoGuide').getBoundingClientRect().bottom < document.getElementById('demoArrivee').getBoundingClientRect().top),
    await texte(p, '#demoGuide'));
  check('arrivée : aucun prix proposé dans « Vos prix »', await p.evaluate(() => [...document.querySelectorAll('#demoPrixTable input')].every(i => i.value === '')));
  await p.click('.demo-carte[data-dest="orly"]'); await p.waitForTimeout(400);
  check('arrivée : une carte ouvre le formulaire sur SA destination', (await p.inputValue('#hotelDest')) === 'orly' && await visible(p, '#btnVoirPrix'));
  check('formulaire : le fil passe à « 2 », la réservation', (await texte(p, '#demoGuide .demo-guide-num')) === '2' && /réservation/i.test(await texte(p, '#demoGuide')), await texte(p, '#demoGuide'));
  check('arrivée : « Toutes les destinations » est à l\'écran après le choix', await p.evaluate(() => { const r = document.getElementById('demoRetourCartes').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.height > 0; }));
  await p.click('#demoRetourCartes'); await p.waitForTimeout(300);
  check('arrivée : « Toutes les destinations » ramène aux cartes', await visible(p, '.demo-carte[data-dest="cdg"]') && !(await visible(p, '#btnVoirPrix')));
  await p.click('.demo-autre'); await p.waitForTimeout(300);
  check('arrivée : « Autre destination » ouvre le formulaire sans forfait', (await p.inputValue('#hotelDest')) === '' && await visible(p, '#btnVoirPrix'));
  await p.click('#demoRetourCartes'); await p.waitForTimeout(200);
  await p.click('.demo-carte[data-dest="cdg"]'); await p.waitForTimeout(300);
  /* LA FINITION COMMUNE (11/10/2026) : comme chez un partenaire, le nom et le
     téléphone sont sur la PREMIÈRE page, et ce qui manque s'encadre de rouge
     avant de la quitter. */
  check('comme chez un partenaire : le client est saisi sur la première page', await p.evaluate(() => !!document.querySelector('#blocCoordonnees.hotel-guest-early')));
  await p.click('#btnVoirPrix'); await p.waitForTimeout(400);
  check('comme chez un partenaire : sans nom ni téléphone, on reste, et ce qui manque est en rouge',
    await p.evaluate(() => !!document.querySelector('#blocCoordonnees .champ.eh-manque')) && !(await visible(p, '.veh-carte')));
  await p.fill('#clientNom', 'Jean Martin'); await p.fill('#clientTel', '06 12 34 56 78');
  await p.click('#btnVoirPrix');
  await p.waitForSelector('.veh-carte', { timeout: 8000 });
  await p.locator('.veh-carte').first().click();
  await p.locator('#ecran-vehicules .veh-action .bouton').first().click();
  /* Le client du flyer paie par lien depuis le 10/10/2026 : plus de choix ici.
     Son nom et son téléphone sont déjà saisis, sur la première page. */
  await p.evaluate(() => { if (document.querySelector('#blocContact [aria-pressed="true"]')) return; const x = [...document.querySelectorAll('#blocContact [data-contact]')].find(e => e.offsetParent); if (x) x.click(); });
  await p.locator('#btnConfirmer').click();
  await p.waitForTimeout(800);
  check('la réservation d\'essai ouvre le bon « Demande reçue »', (await texte(p, '#bonEtat')) === 'Demande reçue', await texte(p, '#bonEtat'));
  check('le suivi de la démo apparaît', await visible(p, '#demoSuivi'));
  const ref = await p.evaluate(() => document.querySelector('.demo-suivi-titre').textContent.split('· ')[1]);
  await p.click('#demoSuivi .demo-suivant');
  check('« Étape suivante » → Chauffeur recherché', (await texte(p, '.demo-etapes li.en-cours')) === 'Chauffeur recherché');
  await p.click('#demoSuivi .demo-suivant');
  await p.waitForTimeout(1600);
  check('… → Chauffeur confirmé, et le bon passe au vert', (await texte(p, '#bonEtat')) === 'Transfert confirmé' && /fictif/.test(await texte(p, '#bonChauffeur')), await texte(p, '#bonEtat'));
  check('aucune application ne s\'ouvre (WhatsApp…)', await p.evaluate(() => window.open('https://example.org') === null));
  check('le vrai stockage du site n\'a reçu aucune course', await p.evaluate(() => localStorage.getItem('ela_courses') === null));

  await p.click('#demoOngletReception');
  await p.waitForURL(/\/demo\/hotel\/reception\/$/); await p.waitForTimeout(1500);
  check('la réception s\'ouvre sans code', await visible(p, '#recCorps') && !(await visible(p, '#recVerrou')));
  check('la course du client apparaît chez la réception', await p.evaluate(r => document.body.innerText.includes('Jean Martin') && document.body.innerText.includes(r), ref));
  check('des courses fictives sont préremplies', await p.evaluate(() => document.body.innerText.includes('Mme Laurent (exemple)')));
  /* UNE JOURNÉE D'HÔTEL, PAS TROIS LIGNES (29/10/2026, Barbaros : la
     réception sur ordinateur était « beaucoup trop blanche et vide ») :
     huit courses d'exemple, plus celle que le prospect vient de faire. */
  const lignes = async v => { await p.click(`.rec-vues [data-vue="${v}"]`); await p.waitForTimeout(300);
    return p.evaluate(() => document.querySelectorAll('#recListe .rec-course').length); };
  const nbPassees = await lignes('passees'), nbVenir = await lignes('avenir');
  check('la réception montre une journée : huit courses d\'exemple et celle du prospect', nbVenir + nbPassees >= 9, nbVenir + ' à venir, ' + nbPassees + ' passées');
  check('les courses d\'exemple ne portent aucun prix proposé', await p.evaluate(() => {
    const t = document.getElementById('ecran-reception').innerText; return !/(45|65|85|125|75|115),00\s€/.test(t); }));
  await p.click('#demoSuivi .demo-suivant');
  await p.waitForTimeout(800);
  check('… → Effectuée, et la fin propose « Mettre ça en place »', (await texte(p, '.demo-etapes li.en-cours')) === 'Effectuée'
    && await visible(p, '#demoMettreEnPlace') && (await p.getAttribute('#demoMettreEnPlace', 'href')) === '/professionnels/#contact');
  /* LA RÉCEPTION EN ANGLAIS (8/10/2026, à la demande de Barbaros). On lit
     l'écran entier : un mot oublié se voit à l'œil du prospect, pas dans
     une liste de clés. */
  await p.click('.langues [data-langue="en"]'); await p.waitForTimeout(500);
  const recEn = await p.evaluate(() => document.getElementById('ecran-reception').innerText);
  check('réception EN : les libellés passent en anglais', ['RECEPTION DESK', 'NEW RIDE', 'Something unexpected?', 'Find a ride', 'Upcoming', 'History', 'By date', 'Refresh', 'View voucher', 'Room 214', 'Ref. ELA-DEMO', 'Driver: '].every(m => recEn.includes(m)), recEn.slice(0, 300));
  check('réception EN : les états et les jours passent en anglais', /CONFIRMED|Confirmed/.test(recEn) && /TOMORROW|Tomorrow/.test(recEn) && /Sedan · Payment link, before departure/.test(recEn) && !/\b(Card|Cash)\b/.test(recEn));
  const restes = ['ESPACE RÉCEPTION', 'NOUVELLE COURSE', 'Retrouver une course', 'À venir', 'Historique', 'Actualiser', 'Voir le bon', 'Chambre ', 'Réf. ', 'Chauffeur : ', 'En attente', 'Réservation validée', 'Effectuée', 'Demain', "l'hôtel", 'Carte bancaire', '(exemple)'].filter(m => recEn.includes(m));
  check('réception EN : aucun libellé français ne reste', restes.length === 0, restes.join(' | '));
  check('réception EN : la recherche suit', (await p.getAttribute('#recRecherche', 'placeholder')) === 'Room, name, phone or reference');
  await p.click('.rec-vues [data-vue="passees"]'); await p.waitForTimeout(300);
  check('réception EN : l\'historique suit', /Completed|COMPLETED/.test(await texte(p, '#recListe')) && !/Effectuée/.test(await texte(p, '#recListe')));
  await p.fill('#recRecherche', 'zzz'); await p.waitForTimeout(300);
  check('réception EN : « aucune course » suit', /^No ride matches/.test(await texte(p, '#recVide')));
  await p.fill('#recRecherche', ''); await p.click('.rec-vues [data-vue="avenir"]'); await p.waitForTimeout(300);
  await p.click('.rec-voir-bon'); await p.waitForTimeout(600);
  check('réception EN : le bon montré au client est en anglais', await p.evaluate(() => { const t = document.getElementById('bonClient').innerText; return /BOOKING VOUCHER|Booking voucher/i.test(t) && !/\(exemple\)/.test(t); }));
  check('le bon d\'une course d\'exemple part de l\'hôtel du prospect', await p.evaluate(() => { const t = document.getElementById('bonClient').innerText; return t.includes('Hôtel Ibis Roissy') && !t.includes('Hôtel Démo'); }));
  await p.click('#bonClientFermer'); await p.waitForTimeout(300);
  await p.click('.langues [data-langue="fr"]'); await p.waitForTimeout(500);
  const recFr = await p.evaluate(() => document.getElementById('ecran-reception').innerText);
  /* « En attente » est écrit en capitales par la feuille de style : innerText
     rend « EN ATTENTE ». C'est l'état que la finition traduit, et qu'elle
     doit savoir rendre en français (elle retient l'original). */
  const attendusFr = ['NOUVELLE COURSE', 'Voir le bon', 'Chambre 214', 'Mme Laurent (exemple)'];
  check('réception : revenir en français rend le français', attendusFr.every(m => recFr.includes(m)) && /en attente/i.test(recFr) && !/NEW RIDE|Room 214|Pending/i.test(recFr),
    'manque : ' + attendusFr.filter(m => !recFr.includes(m)).join(', ') + ' · reste : ' + (recFr.match(/NEW RIDE|Room 214|Pending/gi) || []).join(', '));
  check('réception EN : aucune erreur JavaScript', p.errs.length === 0, p.errs.join(' ; '));
  await p.click('#demoOngletClient'); await p.waitForURL(/\/demo\/hotel\/$/); await p.waitForTimeout(800);
  check('retour à la vue client par l\'onglet', await visible(p, '#demoArrivee'));
  /* EN ANGLAIS */
  /* Sur l'arrivée, les boutons FR/EN sont ceux de la vraie page du QR ; ils pilotent ceux du moteur. */
  await p.click('#demoArrivee .qr-lang[data-lang="en"]'); await p.waitForTimeout(300);
  check('en anglais, les cartes suivent', /Tap a destination/.test(await texte(p, '#demoCartesAide')) && /Where would you like to go/.test(await texte(p, '#demoArrivee')) && /Sedan/.test(await texte(p, '.demo-carte[data-dest="cdg"]')));
  check('en anglais, l\'échéance suit', /^Access valid until \d\d\/\d\d on this device$/.test(await texte(p, '#demoAcces')), await texte(p, '#demoAcces'));
  check('en anglais, le cadre de la démo suit', (await bandeau(p)) === 'Demo — no real booking' && (await texte(p, '#demoOngletClient')) === 'What your guest sees');
  check('aucune erreur JavaScript sur le parcours', p.errs.length === 0, p.errs.join(' ; '));
  check('aucun appel à Supabase hors demande-demo sur le parcours', p.supabase.length === 0, p.supabase.join(' '));
  /* La page ne doit même pas ESSAYER : une tentative bloquée par la CSP
     serait une défense 3 cassée que la défense 1 cache. */
  check('la page ne tente aucune connexion interdite sur le parcours', p.violations.length === 0, p.violations.join(' | '));
  await ctx.close();
}

/* ═══ 3 bis. LA RÉCEPTION RÉSERVE ELLE-MÊME, ET LA COURSE ARRIVE DANS SA LISTE ═══ */
{
  const { ctx, p } = await ouvrir({ chemin: '/demo/hotel/reception/' });
  await p.click('#btnRecReserver'); await p.waitForTimeout(500);
  await p.fill('#chambre', '412');
  await p.waitForSelector('.veh-carte', { timeout: 8000 });
  await p.locator('.veh-carte').first().click();
  /* Le comptoir paie par lien depuis le 11/10/2026 : nom, téléphone et
     moyen de confirmation du client, plus de carte ni d'espèces. */
  await p.fill('#clientNom', 'Jean Martin'); await p.fill('#clientTel', '06 12 34 56 78');
  await p.locator('#blocContact [data-contact="whatsapp"]').click();
  await p.locator('#btnVoirPrix').click();
  await p.waitForTimeout(900);
  check('comptoir : la réservation ouvre le bon', await visible(p, '#ecran-bon'));
  check('comptoir : le suivi de la démo apparaît', await visible(p, '#demoSuivi'));
  await p.click('#demoOngletReception'); await p.waitForTimeout(1500);
  check('comptoir : la course apparaît dans la liste de la réception', await p.evaluate(() => /Chambre 412/.test(document.getElementById('ecran-reception').innerText)));
  check('comptoir : aucune erreur JavaScript', p.errs.length === 0, p.errs.join(' ; '));
  check('comptoir : aucune connexion interdite tentée', p.violations.length === 0 && p.supabase.length === 0, p.violations.concat(p.supabase).join(' | '));
  await ctx.close();
}

/* ═══ 3 ter. LA PERSONNALISATION — nom, couleur, photo, message, destination ═══ */
{
  const { ctx, p } = await ouvrir();
  await p.click('#demoPerso summary');
  const piege = 'Le Relais <img src=x onerror="window.__pirate=1">';
  await p.fill('#demoPersoNom', piege);
  check('perso : le nom saisi remplace celui de l\'en-tête, en texte', (await texte(p, '#hotelTeteNom')) === piege && await p.evaluate(() => !window.__pirate && !document.querySelector('#hotelTete img')));
  check('perso : les initiales sautent les articles', (await texte(p, '.demo-initiales')) === 'RI', await texte(p, '.demo-initiales'));
  check('perso : le départ du formulaire porte le nouveau nom', (await p.inputValue('#depart')).startsWith(piege));
  /* DES THÈMES CHOISIS, AUCUN AUTRE (25/10/2026, Barbaros : « pas de
     démonstration avec des couleurs moches », « proposer au pro 4 thèmes ») :
     pas de choix libre, chaque thème dit son nom, le premier est choisi
     d'office, et chacun donne un bouton lisible. LA COULEUR PEINTE, PAS LA SEULE
     « backgroundColor » : sous la finition commune (11/10/2026), le bouton
     est un dégradé, et sa couleur de fond est transparente — lue seule, elle
     rendait un rapport de 21 et ce contrôle passait sans rien vérifier. */
  check('perso : pas de couleur au choix libre, seulement les thèmes', await p.evaluate(() =>
    !document.querySelector('#demoPerso input[type="color"]') && document.querySelectorAll('#demoPerso .demo-pastille').length >= 2));
  const themes = await p.$$eval('#demoPerso .demo-pastille', l => l.map(b => ({ nom: b.innerText.trim(), presse: b.getAttribute('aria-pressed') })));
  check('perso : chaque thème dit son nom, et le premier est choisi d\'office', themes.every(t => t.nom.length >= 3)
    && themes.map(t => t.presse).join() === ['true', ...themes.slice(1).map(() => 'false')].join(), JSON.stringify(themes));
  /* Le bouton lisible SOUS SON PROPRE TEXTE : le noir et or pose du noir
     sur l'or (texteAction), les autres du blanc. */
  const lisible = () => p.evaluate(() => {
    const s = getComputedStyle(document.getElementById('btnVoirPrix'));
    const rvb = v => v.match(/\d+/g).slice(0, 3).map(Number);
    const fond = rvb((/rgb\([^)]*\)/.exec(s.backgroundImage) || [s.backgroundColor])[0]), texte = rvb(s.color);
    const l = c => { const t = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * t[0] + .7152 * t[1] + .0722 * t[2]; };
    const [x, y] = [l(fond), l(texte)]; return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
  });
  const illisibles = [], peints = new Set();
  for (const t of await p.$$eval('#demoPerso .demo-pastille', l => l.map(b => b.getAttribute('data-theme')))) {
    await p.click(`.demo-pastille[data-theme="${t}"]`); const r = await lisible(); if (r < 4.5) illisibles.push(`${t} ${r.toFixed(2)}`);
    peints.add(await peinte(p, '#btnVoirPrix'));
  }
  check('perso : chaque thème donne un bouton lisible (≥ 4,5:1 avec son propre texte)', illisibles.length === 0, illisibles.join(', '));
  check('perso : chaque thème repeint le bouton d\'une couleur à lui', peints.size === themes.length, [...peints].join(' · '));
  /* Le Noir, gardé pour la suite : la réception doit porter le même. */
  await p.click('.demo-pastille[data-theme="noir"]');
  const choisi = await peinte(p, '#btnVoirPrix');
  check('perso : le cadre de la démo garde le bleu Elatransfer', (await p.evaluate(() => getComputedStyle(document.querySelector('.demo-cadre')).backgroundColor)) === 'rgb(6, 47, 85)');
  /* Une photo : générée dans la page, déposée en APPUYANT SUR LE CADRE
     « Votre photo ici » — c'est là que le prospect la cherche. */
  const png = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 1400; c.height = 900; const g = c.getContext('2d'); g.fillStyle = '#7799bb'; g.fillRect(0, 0, 1400, 900); return c.toDataURL('image/png').split(',')[1]; });
  /* Le cadre photo est dans l'en-tête de l'hôtel, qui vient avec le formulaire
     (comme chez un partenaire : la page du QR n'en a pas). */
  await p.click('.demo-carte[data-dest="cdg"]'); await p.waitForTimeout(400);
  check('perso : le cadre photo se présente comme un bouton', await p.evaluate(() => { const c = document.querySelector('.demo-photo'); return c.getAttribute('role') === 'button' && c.tabIndex === 0 && !!c.getAttribute('aria-label'); }));
  const [choix] = await Promise.all([p.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null), p.click('.demo-photo')]);
  check('perso : appuyer sur le cadre « Votre photo ici » ouvre le choix du fichier', !!choix);
  if (choix) await choix.setFiles({ name: 'hotel.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  else await p.setInputFiles('#demoPersoPhoto', { name: 'hotel.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await p.waitForTimeout(800);
  /* DEPUIS LE 11/10/2026, LA PHOTO EST DANS LE BANDEAU, comme chez un
     partenaire (la finition commune) : on la lit dans ce que l'écran peint,
     pas dans le cadre, qui ne garde que son rôle de bouton. */
  check('perso : la photo s\'affiche dans le bandeau de l\'hôtel, comme chez un partenaire', await p.evaluate(() =>
    /url\("data:image\/jpeg/.test(getComputedStyle(document.getElementById('hotelTete')).backgroundImage) && !document.body.classList.contains('eh-sans-photo')));
  check('perso : … et le cadre devient « Changer la photo »', (await texte(p, '#demoPhotoTexte')) === 'Changer la photo');
  await p.click('#demoRetourCartes'); await p.waitForTimeout(300);
  check('perso : la photo passe aussi en haut de la page d\'arrivée, et le cadre dit « Changer la photo »', await p.evaluate(() =>
    /url\("data:image\/jpeg/.test(getComputedStyle(document.querySelector('#demoArrivee .qr-hero')).backgroundImage))
    && (await texte(p, '#demoPhotoArrivee')) === 'Changer la photo');
  await p.click('.demo-carte[data-dest="cdg"]'); await p.waitForTimeout(300);
  check('perso : … réduite à 1000 px au plus', await p.evaluate(() => new Promise(ok => { const i = new Image(); i.onload = () => ok(Math.max(i.width, i.height) <= 1000); i.onerror = () => ok(false);
    i.src = /url\("([^"]+)"\)/.exec(document.documentElement.style.getPropertyValue('--h-photo-entete'))[1]; })));
  await p.fill('#demoPersoMessage', 'Bienvenue <b>chez nous</b>');
  check('perso : le message d\'accueil s\'affiche, en texte', (await texte(p, '#demoMessage')) === 'Bienvenue <b>chez nous</b>' && await visible(p, '#demoMessage'));
  await p.fill('#demoDestNom', 'Stade de France'); await p.fill('#demoDestBerline', '60'); await p.fill('#demoDestVan', '90');
  await p.click('#demoDestAjouter'); await p.waitForTimeout(900);
  check('perso : la destination ajoutée entre dans le menu', await p.evaluate(() => [...document.querySelectorAll('#hotelDest option')].some(o => o.textContent === 'Stade de France')));
  await p.fill('#demoDestNom', 'Gare du Nord'); await p.fill('#demoDestBerline', '0'); await p.fill('#demoDestVan', '50'); await p.click('#demoDestAjouter');
  check('perso : un prix à 0 € est refusé, et on dit pourquoi', /entre 1 et 2 000/.test(await texte(p, '#demoPersoEtat')));
  await p.click('#demoPersoVoir');
  check('perso : « Voir ma page » referme le panneau', !(await p.evaluate(() => document.getElementById('demoPerso').open)));
  check('perso : la destination ajoutée a sa carte, avec ses prix', /Stade de France[\s\S]*60\s€[\s\S]*90\s€/.test(await texte(p, '.demo-carte[data-dest^="perso-"]')));
  /* Le prix fixé dans « Vos prix » passe sur la carte, puis au formulaire. */
  await p.click('#demoPerso summary');
  await p.fill('#demoPrixTable input[data-cle="cdg"][data-gamme="berline"]', '52'); await p.press('#demoPrixTable input[data-cle="cdg"][data-gamme="berline"]', 'Tab');
  await p.waitForTimeout(200);
  check('perso : un prix fixé dans « Vos prix » passe sur la carte', /52\s€[\s\S]*à fixer/.test(await texte(p, '.demo-carte[data-dest="cdg"]')));
  await p.fill('#demoPrixTable input[data-cle="cdg"][data-gamme="van"]', '0'); await p.press('#demoPrixTable input[data-cle="cdg"][data-gamme="van"]', 'Tab');
  check('perso : « Vos prix » refuse un prix à 0 €', /entre 1 et 2 000/.test(await texte(p, '#demoPersoEtat')) && /à fixer/.test(await texte(p, '.demo-carte[data-dest="cdg"]')));
  await p.click('#demoPersoVoir');
  await p.click('#demoRetourCartes'); await p.waitForTimeout(300);
  await p.click('.demo-carte[data-dest^="perso-"]'); await p.waitForTimeout(400);
  check('perso : son forfait s\'affiche avec la destination', (await p.inputValue('#hotelDest')).startsWith('perso-') && /60,00\s€.*90,00\s€/.test(await p.evaluate(() => document.body.innerText)));
  check('perso : le vrai stockage du site n\'a rien reçu', await p.evaluate(() => Object.keys(localStorage).every(k => k === 'ela_demo_session' || k.startsWith('ela_demo__'))));
  check('perso : aucune connexion interdite tentée', p.violations.length === 0 && p.supabase.length === 0, p.violations.concat(p.supabase).join(' | '));
  await p.click('#demoOngletReception'); await p.waitForURL(/reception\/$/); await p.waitForTimeout(1200);
  check('réception : le fil de la démo passe à « 3 »', (await texte(p, '#demoGuide .demo-guide-num')) === '3' && /réception/i.test(await texte(p, '#demoGuide')), await texte(p, '#demoGuide'));
  check('perso : la réception porte le même nom', (await texte(p, '#recHotel')) === piege);
  check('perso : … et le même thème', (await peinte(p, '#btnRecReserver')) === choisi, await peinte(p, '#btnRecReserver') + ' ≠ ' + choisi);
  await p.click('#demoPerso summary'); await p.click('#demoPersoRaz'); await p.waitForTimeout(300);
  check('perso : « Revenir à la page d\'origine » rend le nom d\'origine', (await texte(p, '#recHotel')) === 'Hôtel Ibis Roissy');
  check('perso : … et le bleu d\'origine', (await peinte(p, '#btnRecReserver')) === 'rgb(14, 111, 199)', await peinte(p, '#btnRecReserver'));
  /* En anglais, le panneau suit. */
  await p.click('.langues [data-langue="en"]'); await p.waitForTimeout(300);
  check('perso : en anglais, le panneau suit', (await texte(p, '#demoPerso summary')) === 'Customise my page' && (await texte(p, '.demo-perso-fichier')) === 'Choose a photo');
  check('perso : aucune erreur JavaScript', p.errs.length === 0, p.errs.join(' ; '));
  await ctx.close();
}
for (const w of [320, 390, 768, 1366]) {
  const { ctx, p } = await ouvrir({ w, h: w < 900 ? 844 : 800 });
  await p.click('#demoPerso summary'); await p.waitForTimeout(200);
  const d = await p.evaluate(() => ({ large: document.documentElement.scrollWidth, W: document.documentElement.clientWidth }));
  check(`perso ${w} px : panneau ouvert sans débordement`, d.large <= d.W, JSON.stringify(d));
  check(`perso ${w} px : « Ajouter » cliquable`, await p.evaluate(() => { const b = document.getElementById('demoDestAjouter'); b.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && !!e.closest('#demoDestAjouter'); }));
  await ctx.close();
}

/* ═══ 4. ISOLATION — DÉFENSES 1 ET 3, À LA MAIN DEPUIS LA CONSOLE ═══ */
for (const chemin of ['/demo/hotel/', '/demo/hotel/reception/']) {
  const { ctx, p } = await ouvrir({ chemin });
  const res = await p.evaluate(async (supa) => {
    const r = {};
    const essai = async (nom, f) => { try { await f(); r[nom] = 'passé'; } catch (e) { r[nom] = 'refusé'; } };
    await essai('rest', () => fetch(`https://${supa}/rest/v1/courses`, { method: 'POST', body: '{}' }));
    await essai('deposer', () => fetch(`https://${supa}/functions/v1/deposer-course`, { method: 'POST', body: '{}' }));
    await essai('telegram', () => fetch('https://api.telegram.org/bot0/sendMessage'));
    await essai('xhr', () => new Promise((ok, ko) => { const x = new XMLHttpRequest(); x.open('POST', `https://${supa}/functions/v1/nouvelle-demande`); x.onload = ok; x.onerror = ko; x.send('{}'); }));
    r.beacon = navigator.sendBeacon ? String(navigator.sendBeacon(`https://${supa}/functions/v1/prevenir-client`, '{}')) : 'absent';
    /* Les fonctions du moteur, appelées à la main : elles passent par le simulateur. */
    await window.ELA_NUAGE.deposer({ ref: 'ELA-MAIN-00001', statut: 'confirmee', client: { nom: 'x' } });
    await window.ELA_NUAGE.etat('ELA-MAIN-00001', '0612345678');
    await window.ELA_NUAGE.coursesHotel('easyhotel-aeroville', { code: 'x' });
    await (window.ELA_NUAGE.appel ? window.ELA_NUAGE.appel('/rest/v1/courses').catch(() => {}) : null);
    return r;
  }, SUPA);
  await p.waitForTimeout(400);
  const vue = chemin.includes('reception') ? 'réception' : 'client';
  check(`${vue} : un fetch vers Supabase tapé à la main est refusé`, res.rest === 'refusé' && res.deposer === 'refusé', JSON.stringify(res));
  check(`${vue} : Telegram et XHR sont refusés`, res.telegram === 'refusé' && res.xhr === 'refusé', JSON.stringify(res));
  check(`${vue} : … et c'est la CSP qui refuse (défense 1)`, p.violations.some(v => v.includes(SUPA) && v.includes('connect-src')), p.violations.join(' | '));
  check(`${vue} : aucune requête n'a atteint Supabase hors demande-demo (défense 3)`, p.supabase.length === 0, p.supabase.join(' '));
  check(`${vue} : la session réelle n'a reçu aucune course`, await p.evaluate(() => localStorage.getItem('ela_courses') === null && localStorage.getItem('ela_bookings') === null));
  await ctx.close();
}

/* ═══ 5. AUCUN PARAMÈTRE NE CHANGE RIEN ═══ */
for (const q of ['?mode=production', '?h=easyhotel-aeroville', '?reception=easyhotel-aeroville', '?exploitant=1',
                 '?h=easyhotel-aeroville&reception=easyhotel-aeroville&exploitant=1&mode=production&ok=eyJyIjoiWCJ9']) {
  for (const chemin of ['/demo/hotel/', '/demo/hotel/reception/']) {
    const { ctx, p } = await ouvrir({ chemin: chemin + q });
    const vue = chemin.includes('reception') ? 'réception' : 'client';
    check(`${vue} ${q} : on reste dans la démo`, new URL(p.url()).pathname === chemin, p.url());
    check(`${vue} ${q} : même hôtel fictif, aucun partenaire réel`, (await texte(p, '#hotelTeteNom')) === 'Hôtel Ibis Roissy' && !/easyhotel/i.test(await p.evaluate(() => document.body.innerText)));
    check(`${vue} ${q} : aucun appel à Supabase`, p.supabase.length === 0, p.supabase.join(' '));
    check(`${vue} ${q} : aucune connexion interdite tentée`, p.violations.length === 0, p.violations.join(' | '));
    await ctx.close();
  }
}

/* ═══ 6. MISE EN PAGE — NEUF LARGEURS, DEUX VUES ═══ */
for (const w of [320, 375, 390, 430, 768, 820, 1280, 1366, 1440]) {
  for (const chemin of ['/demo/hotel/', '/demo/hotel/reception/']) {
    const { ctx, p } = await ouvrir({ w, h: w < 900 ? 844 : 800, chemin });
    const deborde = await p.evaluate(() => {
      const W = document.documentElement.clientWidth, fautifs = [];
      for (const e of document.querySelectorAll('body *')) {
        const r = e.getBoundingClientRect();
        if (!r.width || getComputedStyle(e).position === 'fixed') continue;
        let x = e.parentElement, defile = false;
        while (x) { const o = getComputedStyle(x).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { defile = true; break; } x = x.parentElement; }
        if (!defile && (r.right > W + 1 || r.left < -1)) fautifs.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ' [' + Math.round(r.left) + '→' + Math.round(r.right) + ']');
      }
      return { large: document.documentElement.scrollWidth, W, fautifs: fautifs.slice(0, 4) };
    });
    const vue = chemin.includes('reception') ? 'réception' : 'client';
    check(`${w} px ${vue} : aucun débordement`, deborde.large <= deborde.W && !deborde.fautifs.length, JSON.stringify(deborde));
    check(`${w} px ${vue} : bandeau et onglets visibles`, await visible(p, '#demoBandeau') && await visible(p, '#demoOngletReception'));
    check(`${w} px ${vue} : onglets cliquables (rien ne les recouvre)`, await p.evaluate(() => ['demoOngletClient', 'demoOngletReception'].every(id => {
      const r = document.getElementById(id).getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e && e.closest('#' + id); })));
    /* LE BAS DE LA PAGE (recette du 8/10/2026) : le dernier bouton ne passe
       jamais sous la barre du bas, et il n'y a pas 200 px de vide après lui.
       Sur ordinateur, la façade retirait à toutes les pages la place de la
       barre, que la démo garde ; les 110 px de marge qui compensaient
       laissaient sur téléphone un grand vide. */
    const bas = await p.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, document.documentElement.scrollHeight);
      const bt = document.getElementById('demoMettreEnPlacePied').getBoundingClientRect();
      /* La barre DU BAS : au-delà de 1 100 px elle monte dans l'en-tête. */
      const barre = [...document.querySelectorAll('nav.barre, .barre')].find(x => getComputedStyle(x).display !== 'none' && getComputedStyle(x).position === 'fixed' && x.getBoundingClientRect().height > 0);
      const haut = barre ? barre.getBoundingClientRect().top : innerHeight;
      const e = document.elementFromPoint(bt.left + bt.width / 2, bt.top + bt.height / 2);
      return { recu: !!(e && e.closest('#demoMettreEnPlacePied')), basBouton: Math.round(bt.bottom), barre: Math.round(haut),
        vide: Math.round(haut - document.querySelector('.demo-pied').getBoundingClientRect().bottom) };
    });
    check(`${w} px ${vue} : « Mettre ça en place » du pied n'est pas sous la barre, et rien de grand ne reste vide dessous`,
      bas.recu && bas.basBouton <= bas.barre && bas.vide >= 0 && bas.vide < 100, JSON.stringify(bas));
    /* LE FORMULAIRE A LES PROPORTIONS DE LA VRAIE PAGE D'UN PARTENAIRE : sur
       ordinateur, centré et borné à 780 px, plus étalé sur toute la largeur. */
    if (vue === 'client' && w >= 768) {
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.click('.demo-carte[data-dest="cdg"]'); await p.waitForTimeout(300);
      const f = await p.evaluate(() => { const r = document.getElementById('btnVoirPrix').getBoundingClientRect(), c = document.querySelector('#ecran-accueil .reserver').getBoundingClientRect();
        return { largeur: Math.round(r.width), centre: Math.round(r.left + r.width / 2), carte: Math.round(c.width), centreCarte: Math.round(c.left + c.width / 2),
          milieu: Math.round(document.documentElement.clientWidth / 2) }; });
      /* Au-delà de 1 100 px (29/10/2026), la vraie page prend l'écran : la
         carte du formulaire, centrée et bornée à 1 180 px, en deux colonnes,
         « Voir mon prix » à droite sous le client. */
      if (w < 1100) check(`${w} px client : le formulaire est centré et ne dépasse pas 800 px`, f.largeur <= 800 && Math.abs(f.centre - f.milieu) < 30, JSON.stringify(f));
      else check(`${w} px client : la carte du formulaire est centrée, bornée à 1 180 px, « Voir mon prix » dans la colonne de droite`,
        f.carte <= 1180 && Math.abs(f.centreCarte - f.milieu) < 30 && f.centre > f.milieu, JSON.stringify(f));
    }
    /* LA RÉCEPTION DE LA DÉMO RESSEMBLE À LA VRAIE (9/10/2026) : pas de barre
       du bas, et sur un ordinateur (large, à la souris) pas de WhatsApp. */
    if (vue === 'réception') {
      const r = await p.evaluate(() => ({
        barre: [...document.querySelectorAll('nav.barre')].some(b => getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().height > 0),
        wa: getComputedStyle(document.getElementById('recAideWa')).display !== 'none' }));
      check(`${w} px réception : pas de barre du bas, comme la vraie réception`, !r.barre, JSON.stringify(r));
      check(`${w} px réception : ${w >= 900 ? 'sur ordinateur, plus de bouton WhatsApp' : 'le bouton WhatsApp d\'« Un imprévu ? » reste'}`,
        w >= 900 ? !r.wa : r.wa, JSON.stringify(r));
    }
    check(`${w} px ${vue} : aucune erreur JavaScript`, p.errs.length === 0, p.errs.join(' ; '));
    await ctx.close();
  }
}

/* ═══ 7. INDEXATION ET RÈGLE CSP ÉCRITE DEUX FOIS ═══ */
{
  const pages = ['site/demo/hotel/index.html', 'site/demo/hotel/reception/index.html'].map(f => readFileSync(f, 'utf8'));
  const headers = readFileSync('site/_headers', 'utf8');
  const bloc = /^\/demo\/\*\n((?:[ \t]+.*\n?)+)/m.exec(headers)?.[1] || '';
  const cspEntete = (/Content-Security-Policy:\s*(.+)/.exec(bloc)?.[1] || '').replace(/;\s*frame-ancestors[^;]*$/, '').trim();
  for (const [i, h] of pages.entries()) {
    const cspMeta = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(h)?.[1] || '';
    check(`page ${i + 1} : la CSP de la page et celle de _headers sont identiques`, cspMeta && cspMeta === cspEntete, cspEntete.slice(0, 60));
    check(`page ${i + 1} : connect-src ne laisse passer que demande-demo chez Supabase`,
      [...cspMeta.matchAll(/https:\/\/[^\s;]*supabase\.co[^\s;]*/g)].map(m => m[0]).join() === DEMANDE);
    check(`page ${i + 1} : noindex,nofollow`, /<meta name="robots" content="noindex,nofollow">/.test(h) && (h.match(/<meta name="robots"/g) || []).length === 1);
    check(`page ${i + 1} : pas de canonique`, !/rel="canonical"/.test(h));
  }
  check('_headers : X-Robots-Tag noindex sur /demo/*', /X-Robots-Tag:\s*noindex, nofollow/.test(bloc));
  check('robots.txt écarte /demo/', /^Disallow: \/demo\/$/m.test(readFileSync('site/robots.txt', 'utf8')));
  check('le sitemap ne cite pas la démo', !/\/demo\//.test(readFileSync('site/sitemap.xml', 'utf8')));
  check('le dépôt (index.html) ne contient pas l\'hôtel fictif', !readFileSync('index.html', 'utf8').includes('demo-hotel'));
}

/* ═══ 8. DÉFENSE 2 — LA CONSTRUCTION TOMBE SUR CHAQUE MOT INTERDIT ═══
   Copie du site, un mot posé à la fois dans le simulateur, et la
   vérification doit sortir en erreur en nommant le mot. */
{
  const tmp = mkdtempSync(join(tmpdir(), 'demo-'));
  cpSync('site', join(tmp, 'site'), { recursive: true });
  const cible = join(tmp, 'site', 'demo', 'demo-simulateur.js');
  const sain = readFileSync(cible, 'utf8');
  const lancer = () => spawnSync('node', ['.github/scripts/verifier-demo.mjs', join(tmp, 'site'), 'index.html'], { encoding: 'utf8' });
  check('défense 2 : la copie saine passe', lancer().status === 0);
  const cleSupa = /var SUPABASE_CLE = "([^"]+)"/.exec(readFileSync('index.html', 'utf8'))[1];
  for (const mot of ['/rest/v1', 'deposer-course', 'courses-hotel', 'etat-course', 'nouvelle-demande',
                     'prevenir-client', 'wa.me', 'api.telegram.org', cleSupa, 'easyHotel', 'cdn.easyhotel.com',
                     'forfait:{ berline:35, van:50 }']) {
    writeFileSync(cible, sain + `\n// "${mot}"\n`);
    const r = lancer();
    check(`défense 2 : « ${mot.slice(0, 24)} » fait tomber la construction`, r.status !== 0, (r.stdout + r.stderr).slice(-120));
  }
  writeFileSync(cible, sain);
  /* Un script local chargé par la page est vérifié aussi. */
  const partage = join(tmp, 'site', 'telephone.js');
  writeFileSync(partage, readFileSync(partage, 'utf8') + '\n// wa.me\n');
  check('défense 2 : un script partagé chargé par la démo est vérifié aussi', lancer().status !== 0);
  rmSync(tmp, { recursive: true, force: true });
}

/* ═══ 9. SUR ORDINATEUR, LA DÉMO SUIT LA VRAIE PAGE (29/10/2026) ═══
   Le formulaire en deux colonnes, les onglets dans l'en-tête — SOUS le
   bandeau de la démo, jamais dessus (une barre fixée en haut de l'écran s'y
   posait) ; et le comptoir de la démo garde sa propre mise en page. */
{
  const { ctx, p } = await ouvrir({ w: 1440, h: 900 });
  await p.click('.demo-carte[data-dest="orly"]'); await p.waitForTimeout(900);
  /* En haut de la page, où le bandeau de la démo et l'en-tête se voient
     tous les deux (plus bas, l'en-tête collé en haut passe sur le bandeau,
     comme avant). */
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); }); await p.waitForTimeout(200);
  const r = await p.evaluate(() => { const q = s => document.querySelector(s).getBoundingClientRect();
    const dep = q('#blocDepart'), coord = q('#blocCoordonnees'), ban = q('#demoBandeau'), tete = q('.entete');
    const ong = [...document.querySelectorAll('.onglet')].filter(o => o.offsetParent).map(o => o.getBoundingClientRect());
    return { deuxCol: coord.left >= dep.right && Math.abs(coord.top - dep.top) < 40, n: ong.length,
      dansTete: ong.every(b => b.top >= tete.top && b.bottom <= tete.bottom), surBandeau: ong.some(b => b.top < ban.bottom && b.bottom > ban.top) }; });
  check('démo 1440 px : le trajet à gauche, le client à droite, comme la vraie page', r.deuxCol, JSON.stringify(r));
  check('démo 1440 px : les onglets dans l\'en-tête, pas sur le bandeau de la démo', r.n === 4 && r.dansTete && !r.surBandeau, JSON.stringify(r));
  check('démo 1440 px : aucune erreur', p.errs.length === 0, p.errs.join(' ; '));
  await ctx.close();
}
{
  const { ctx, p } = await ouvrir({ w: 1440, h: 900, chemin: '/demo/hotel/reception/' });
  await p.click('#btnRecReserver'); await p.waitForTimeout(900);
  const r = await p.evaluate(() => ({ enveloppes: !!document.getElementById('ehColTrajet'), barreEnHaut: !!document.querySelector('.entete .barre'),
    comptoir: !!document.getElementById('recSaisie') }));
  check('démo, comptoir 1440 px : « Nouvelle course » garde la mise en page du comptoir', !r.enveloppes && !r.barreEnHaut && r.comptoir, JSON.stringify(r));
  await ctx.close();
}

await b.close(); serveur.close();
console.log(`=== RÉUSSIS (${ok.length}) ===`);
ok.forEach(x => console.log('  ✔ ' + x));
if (ko.length) { console.log(`=== ÉCHECS (${ko.length}) ===`); ko.forEach(x => console.log('  ✘ ' + x)); process.exit(1); }
