// ═══ LE SITE PUBLIC SUR ORDINATEUR — lot P0-A (5 octobre 2026) ═══
// Audit mesuré avant d'écrire une ligne : la page n'était plus bridée à
// 520 px depuis la façade du 29/09, mais tout avait été ÉLARGI sans être
// recomposé. Cinq défauts, chacun éprouvé ici sur le site CONSTRUIT
// (la façade n'existe que là) :
//  1. à 1366×768 et 1024×768, la barre du bas recouvrait le tiers bas de
//     « Voir mon prix » — un clic là ouvrait un onglet au lieu du prix ;
//  2. les écrans du tunnel (prix, récapitulatif, bon…) s'étiraient d'un
//     bord à l'autre : à 1440 px, le prix à 1 380 px de son libellé ;
//  3. la carte du formulaire touchait les bords à 1024 px ;
//  4. la façade remettait le bas de page à zéro sur ordinateur : le pied
//     (documents légaux) et « Envoyer ma demande » passaient sous la barre ;
//  5. la grille du formulaire plaçait ses enfants UN PAR UN : Date/Heure
//     prenait une ligne entière (son id commence par « bloc »), et un
//     écriteau sans règle tombait dans UNE colonne de 86 px.
// Le téléphone ne doit pas bouger d'un pixel : tout est sous 900 px.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

execSync('sh construire.sh', { stdio: 'ignore' });
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png',
  '.webp':'image/webp','.jpg':'image/jpeg','.txt':'text/plain','.xml':'application/xml'};
const serveur = createServer(async (req, res) => {
  try {
    let chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, {'Content-Type': TYPES[extname(f)] || 'application/octet-stream'});
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8097, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:8097/';

const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const b = await chromium.launch();

async function ouvrir(w, h, langue) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'fr-FR' });
  const p = await ctx.newPage();
  p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.3376,48.8606]},properties:{name:'Place Vendôme',osm_key:'tourism',osm_value:'attraction',postcode:'75001',city:'Paris',countrycode:'FR'}}]})}));
  await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.2467,48.9478]},properties:{label:'Argenteuil, 95100 Argenteuil'}}]})}));
  await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
    body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
  await p.clock.setFixedTime(new Date('2026-10-06T10:00:00+02:00'));
  await p.goto(SITE, { waitUntil: 'load' });
  if (langue === 'en') await p.click('.langues [data-langue="en"]');
  await p.waitForTimeout(300);
  return p;
}

/* Ce que reçoit le doigt, en cinq points du bouton : le centre et quatre
   coins rentrés de 6 px. Un seul point au centre a laissé passer le défaut
   d'origine : la barre ne mangeait que le BAS du bouton. */
async function cliquable(p, sel) {
  return p.evaluate(sel => {
    const e = document.querySelector(sel); if (!e) return 'absent';
    const r = e.getBoundingClientRect();
    if (r.bottom > innerHeight) return 'hors écran (bas ' + Math.round(r.bottom) + ' > ' + innerHeight + ')';
    const pts = [[.5,.5],[0,0],[1,0],[0,1],[1,1]].map(([fx,fy]) =>
      [r.left + 6 + fx * (r.width - 12), r.top + 6 + fy * (r.height - 12)]);
    for (const [x, y] of pts) {
      const t = document.elementFromPoint(x, y);
      if (!t || !(t === e || e.contains(t))) return 'reçoit : ' + (t ? (t.id || t.className || t.tagName) : 'rien') + ' en ' + Math.round(x) + ',' + Math.round(y);
    }
    return 'ok';
  }, sel);
}

const ORDIS = [[1024,768],[1280,800],[1366,768],[1440,900],[1920,1080]];
for (const [w, h] of ORDIS) {
  for (const langue of ['fr', 'en']) {
    if (langue === 'en' && w !== 1366) continue;
    const p = await ouvrir(w, h, langue);
    const tag = `${w}×${h}${langue === 'en' ? ' EN' : ''}`;
    const m = await p.evaluate(() => {
      const r = s => document.querySelector(s).getBoundingClientRect();
      return { sw: document.documentElement.scrollWidth, carte: r('.reserver'),
        logo: r('.logo-image'), pied: r('.pied') };
    });
    check(`${tag} : aucun débordement horizontal`, m.sw === w, `largeur ${m.sw}`);
    check(`${tag} : « Voir mon prix » reçoit le clic en entier, sans défiler`,
      (await cliquable(p, '#btnVoirPrix')) === 'ok', await cliquable(p, '#btnVoirPrix'));
    check(`${tag} : la carte du formulaire garde une marge de chaque côté`,
      m.carte.left >= 16 && m.carte.right <= w - 16, `${Math.round(m.carte.left)}→${Math.round(m.carte.right)}`);
    check(`${tag} : le logo s'aligne sur le bord de la carte`,
      Math.abs(m.logo.left - m.carte.left) <= 2, `logo ${Math.round(m.logo.left)}, carte ${Math.round(m.carte.left)}`);
    check(`${tag} : le pied suit la même colonne que la carte`,
      m.pied.left >= m.carte.left - 2 && m.pied.right <= m.carte.right + 2,
      `pied ${Math.round(m.pied.left)}→${Math.round(m.pied.right)}`);

    // Date/Heure et Passagers/Bagages sur UNE ligne : la ligne du dessous
    // laissait un trou d'une demi-largeur et repoussait le bouton.
    const lignes = await p.evaluate(() => {
      const a = document.getElementById('blocDateHeure').getBoundingClientRect();
      const bb = document.querySelector('.reserver > .duo:not(#blocDateHeure)').getBoundingClientRect();
      return { memeLigne: Math.abs(a.top - bb.top) < 2, a: Math.round(a.width), b: Math.round(bb.width) };
    });
    check(`${tag} : Date/Heure et Passagers/Bagages partagent une ligne`, lignes.memeLigne,
      JSON.stringify(lignes));

    // LA RÈGLE, PAS LA LISTE : on montre TOUS les enfants cachés de la carte,
    // et aucun ne doit tomber dans une colonne étroite. C'est ce qui était
    // arrivé à la ligne des étapes, puis à l'écriteau « longue distance ».
    const etroits = await p.evaluate(() => {
      const carte = document.querySelector('.reserver');
      const cw = carte.clientWidth;
      const caches = [...carte.children].filter(e => e.hidden);
      caches.forEach(e => e.hidden = false);
      const res = [...carte.children].filter(e => getComputedStyle(e).display !== 'none')
        .filter(e => e.getBoundingClientRect().width < cw * 0.4)
        .map(e => (e.id || e.className) + ' ' + Math.round(e.getBoundingClientRect().width) + ' px');
      caches.forEach(e => e.hidden = true);
      return res;
    });
    check(`${tag} : aucun bloc de la carte ne tombe dans une colonne étroite`, etroits.length === 0, etroits.join(', '));

    // Le bas de page n'est jamais sous la barre : le pied porte les
    // documents légaux, que la LCEN veut accessibles.
    await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, document.documentElement.scrollHeight); });
    await p.waitForTimeout(150);
    check(`${tag} : le lien « Nous joindre et informations légales » reçoit le clic en bas de page`,
      (await cliquable(p, '.pied-lien')) === 'ok', await cliquable(p, '.pied-lien'));
    check(`${tag} : aucune erreur JavaScript`, p._errs.length === 0, p._errs.join(' | '));
    await p.context().close();
  }
}

// ── Le mode « Maintenant » remplace Date/Heure par un encadré : il garde
//    la même place, et le bouton reste entier à 1366×768.
{
  const p = await ouvrir(1366, 768);
  await p.click('#btnQuandAsap');
  await p.waitForTimeout(200);
  const r = await p.evaluate(() => {
    const a = document.getElementById('blocAsap').getBoundingClientRect();
    const bb = document.querySelector('.reserver > .duo:not(#blocDateHeure)').getBoundingClientRect();
    return { visible: a.width > 0, memeLigne: Math.abs(a.top - bb.top) < 2 };
  });
  check('1366×768 « Maintenant » : l’encadré prend la place de Date/Heure', r.visible && r.memeLigne, JSON.stringify(r));
  check('1366×768 « Maintenant » : « Voir mon prix » reçoit le clic en entier',
    (await cliquable(p, '#btnVoirPrix')) === 'ok', await cliquable(p, '#btnVoirPrix'));
  await p.context().close();
}

// ── Le tunnel : une colonne de lecture, centrée, et rien sous la barre.
for (const [w, h] of [[1024, 768], [1440, 900], [1920, 1080]]) {
  const p = await ouvrir(w, h);
  await p.type('#depart', 'vendome', { delay: 10 }); await p.waitForTimeout(800);
  await p.locator('#departList [role=option]').first().click();
  await p.type('#arrivee', 'argenteuil', { delay: 10 }); await p.waitForTimeout(800);
  await p.locator('#arriveeList [role=option]').first().click();
  await p.fill('#date', '2026-10-08'); await p.fill('#heure', '10:00');
  await p.click('#btnVoirPrix'); await p.waitForTimeout(1200);
  const largeur = async id => p.evaluate(id => {
    const e = document.getElementById(id); const r = e.getBoundingClientRect();
    return { vis: e.classList.contains('actif'), l: Math.round(r.left), w: Math.round(r.width) };
  }, id);
  const veh = await largeur('ecran-vehicules');
  check(`${w}×${h} : l'écran des prix s'ouvre`, veh.vis);
  check(`${w}×${h} : l'écran des prix est une colonne de lecture (≤ 760 px), centrée`,
    veh.w <= 760 && Math.abs(veh.l - (w - veh.w) / 2) <= 2, JSON.stringify(veh));
  await p.locator('.veh-carte').first().click(); await p.waitForTimeout(300);
  check(`${w}×${h} : le bouton de l'écran des prix reçoit le clic`,
    (await cliquable(p, '#ecran-vehicules .veh-action .bouton')) === 'ok',
    await cliquable(p, '#ecran-vehicules .veh-action .bouton'));
  await p.click('#ecran-vehicules .veh-action .bouton'); await p.waitForTimeout(500);
  const rec = await largeur('ecran-recap');
  check(`${w}×${h} : le récapitulatif est une colonne de lecture, centrée`,
    rec.vis && rec.w <= 760 && Math.abs(rec.l - (w - rec.w) / 2) <= 2, JSON.stringify(rec));
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, document.documentElement.scrollHeight); }); await p.waitForTimeout(150);
  check(`${w}×${h} : « Envoyer ma demande » reçoit le clic en bas de page`,
    (await cliquable(p, '#btnConfirmer')) === 'ok', await cliquable(p, '#btnConfirmer'));
  check(`${w}×${h} tunnel : aucune erreur JavaScript`, p._errs.length === 0, p._errs.join(' | '));
  await p.context().close();
}

// ── Le téléphone et la tablette gardent leur mise en page : la grille et
//    les colonnes de lecture ne s'allument qu'à partir de 900 px.
for (const [w, h] of [[320, 700], [390, 844], [768, 1024], [899, 900]]) {
  const p = await ouvrir(w, h);
  const r = await p.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    grille: getComputedStyle(document.querySelector('.reserver')).display,
    barre: getComputedStyle(document.querySelector('.barre')).display,
  }));
  check(`${w} px : aucun débordement`, r.sw === w, String(r.sw));
  check(`${w} px : le formulaire reste en une colonne`, r.grille !== 'grid', r.grille);
  check(`${w} px : la barre du bas est là`, r.barre !== 'none', r.barre);
  await p.context().close();
}

// ── LE LOGO : le fichier officiel, affiché sans déformation.
{
  const p = await ouvrir(1440, 900);
  const l = await p.evaluate(() => {
    const i = document.querySelector('.entete .logo-image');
    const r = i.getBoundingClientRect();
    return { src: i.getAttribute('src'), ecart: Math.abs(r.width / r.height - i.naturalWidth / i.naturalHeight) };
  });
  check('le logo de l’en-tête est le fichier officiel', l.src === 'brand-logo.webp', l.src);
  check('le logo garde ses proportions', l.ecart < 0.02, l.ecart.toFixed(3));
  await p.context().close();
}

await b.close(); serveur.close();
console.log(`=== ${ok.length} réussis, ${ko.length} échecs ===`);
for (const k of ko) console.log('  ÉCHEC : ' + k);
process.exit(ko.length ? 1 : 0);
