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

/* 1366×657 : la hauteur UTILE d'un portable 1366×768 dans Chrome (onglets,
   barre d'adresse, barre des tâches). C'est elle qui compte, pas l'écran. */
const ORDIS = [[1024,768],[1099,768],[1100,700],[1280,800],[1366,657],[1366,768],[1440,900],[1920,1080]];
for (const [w, h] of ORDIS) {
  for (const langue of ['fr', 'en']) {
    if (langue === 'en' && !(w === 1366 && h === 657)) continue;
    const p = await ouvrir(w, h, langue);
    const tag = `${w}×${h}${langue === 'en' ? ' EN' : ''}`;
    const m = await p.evaluate(() => {
      const r = s => document.querySelector(s).getBoundingClientRect();
      return { sw: document.documentElement.scrollWidth, carte: r('.reserver'),
        logo: r('.logo-image'), pied: r('.pied'), titre: r('.hero h1'), langues: r('.langues'),
        hero: r('.hero'), cta: getComputedStyle(document.getElementById('btnHeroReserver')).display };
    });
    /* LA COLONNE : 1180 px au plus, 24 px de marge au moins. Tout s'y aligne —
       logo à gauche, FR/EN à droite, et le pied. Le formulaire en occupe toute
       la largeur sous 1100 px ; au-delà il se pose À DROITE du titre (P0-C). */
    const col = { left: Math.max(24, (w - 1180) / 2), right: w - Math.max(24, (w - 1180) / 2) };
    const deuxColonnes = w >= 1100;
    check(`${tag} : aucun débordement horizontal`, m.sw === w, `largeur ${m.sw}`);
    check(`${tag} : « Voir mon prix » reçoit le clic en entier, sans défiler`,
      (await cliquable(p, '#btnVoirPrix')) === 'ok', await cliquable(p, '#btnVoirPrix'));
    check(`${tag} : la carte du formulaire garde une marge de chaque côté`,
      m.carte.left >= 16 && m.carte.right <= w - 16, `${Math.round(m.carte.left)}→${Math.round(m.carte.right)}`);
    check(`${tag} : le logo et le titre du bandeau partent du bord gauche de la colonne`,
      Math.abs(m.logo.left - col.left) <= 2 && Math.abs(m.titre.left - col.left) <= 2,
      `logo ${Math.round(m.logo.left)}, titre ${Math.round(m.titre.left)}, colonne ${col.left}`);
    // Bloc 2 (7/10/2026) : au-delà de 1100 px la carte est calée à GAUCHE, sous la
    // promesse, et laisse la moitié droite à la photo ; en dessous elle prend la colonne.
    check(`${tag} : FR/EN s'arrête au bord droit de la colonne, et le formulaire ${deuxColonnes ? 'part du bord gauche' : 's\'arrête au bord droit'}`,
      Math.abs(m.langues.right - col.right) <= 2
      && (deuxColonnes ? Math.abs(m.carte.left - col.left) <= 2 && m.carte.right <= w * 0.6 : Math.abs(m.carte.right - col.right) <= 2),
      `FR/EN ${Math.round(m.langues.right)}, carte ${Math.round(m.carte.left)}→${Math.round(m.carte.right)}, colonne ${col.left}→${col.right}`);
    check(`${tag} : le pied suit la même colonne`,
      m.pied.left >= col.left - 2 && m.pied.right <= col.right + 2,
      `pied ${Math.round(m.pied.left)}→${Math.round(m.pied.right)}`);
    if (deuxColonnes) {
      // Bloc 2 : le formulaire DANS le bandeau, SOUS la promesse, sans la recouvrir —
      // la moitié droite reste à la scène de la photo. (Le 6/10 il était à droite
      // du titre et recouvrait le chauffeur et la cliente.)
      check(`${tag} : le formulaire est dans le bandeau, sous le titre, à gauche`,
        m.carte.top >= m.hero.top && m.carte.bottom <= m.hero.bottom && m.carte.top >= m.titre.bottom + 8
        && Math.abs(m.carte.left - m.titre.left) <= 2,
        `carte ${Math.round(m.carte.left)},${Math.round(m.carte.top)}–${Math.round(m.carte.bottom)} · titre →${Math.round(m.titre.right)} · bandeau ${Math.round(m.hero.top)}–${Math.round(m.hero.bottom)}`);
      check(`${tag} : un seul bouton principal — « Réserver mon trajet » s'efface`, m.cta === 'none', m.cta);
    } else {
      check(`${tag} : le formulaire prend toute la colonne`, Math.abs(m.carte.left - col.left) <= 2, `carte ${Math.round(m.carte.left)}`);
      check(`${tag} : « Réserver mon trajet » reste (le formulaire est sous le bandeau)`, m.cta !== 'none', m.cta);
      // Date/Heure et Passagers/Bagages sur UNE ligne : la ligne du dessous
      // laissait un trou d'une demi-largeur et repoussait le bouton.
      const lignes = await p.evaluate(() => {
        const a = document.getElementById('blocDateHeure').getBoundingClientRect();
        const bb = document.querySelector('.reserver > .duo:not(#blocDateHeure)').getBoundingClientRect();
        return { memeLigne: Math.abs(a.top - bb.top) < 2, a: Math.round(a.width), b: Math.round(bb.width) };
      });
      check(`${tag} : Date/Heure et Passagers/Bagages partagent une ligne`, lignes.memeLigne,
        JSON.stringify(lignes));
    }
    // Aucun libellé de champ coupé : « Date » à côté de « Maintenant » a déjà
    // disparu en « D… » sur téléphone. Dans la carte de 440 px, on le mesure.
    const coupes = await p.evaluate(() => [...document.querySelectorAll('.reserver .champ-titre, .reserver .lien-maintenant')]
      .filter(t => t.offsetParent && (t.scrollWidth > t.clientWidth + 1 || t.getBoundingClientRect().width < 20))
      .map(t => t.textContent.trim()));
    check(`${tag} : aucun libellé de champ coupé`, coupes.length === 0, coupes.join(', '));

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
  // LA PLACE, PAS LA RANGÉE (Bloc 3, 7 octobre 2026) : ce contrôle exigeait
  // l'encadré AU-DESSUS de Passagers/Bagages, c'est-à-dire la mise en page du
  // jour. Le formulaire passe de trois rangées à deux (Date/Heure à côté de
  // Passagers/Bagages) : la règle durable est que l'encadré prend EXACTEMENT
  // la place que Date/Heure occupait — ni ailleurs, ni dans une case étroite.
  const avant = await p.evaluate(() => { const d = document.getElementById('blocDateHeure').getBoundingClientRect();
    return { l: d.left, t: d.top, w: d.width }; });
  await p.click('#btnQuandAsap');
  await p.waitForTimeout(200);
  const r = await p.evaluate(avant => {
    const a = document.getElementById('blocAsap').getBoundingClientRect();
    const d = document.getElementById('blocDateHeure').getBoundingClientRect();
    return { visible: a.width > 0, cache: d.width === 0,
      memePlace: Math.abs(a.left - avant.l) < 2 && Math.abs(a.top - avant.t) < 2 && Math.abs(a.width - avant.w) < 2 };
  }, avant);
  check('1366×768 « Maintenant » : l’encadré prend la place de Date/Heure', r.visible && r.cache && r.memePlace, JSON.stringify(r));
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
  /* et le menu d'ordinateur n'y apparaît pas : une navigation par écran. */
  const p = await ouvrir(w, h);
  const r = await p.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    grille: getComputedStyle(document.querySelector('.reserver')).display,
    barre: getComputedStyle(document.querySelector('.barre')).display,
    menu: (document.querySelector('.entete-nav') ? getComputedStyle(document.querySelector('.entete-nav')).display : 'none'),
  }));
  check(`${w} px : pas de menu d'ordinateur dans l'en-tête`, r.menu === 'none', r.menu);
  check(`${w} px : aucun débordement`, r.sw === w, String(r.sw));
  check(`${w} px : le formulaire reste en une colonne`, r.grille !== 'grid', r.grille);
  check(`${w} px : la barre du bas est là`, r.barre !== 'none', r.barre);
  await p.context().close();
}


// ═══ LOT P0-B : LE MENU DE L'EN-TÊTE REMPLACE LA BARRE DU BAS ═══
// Chaque entrée doit MENER quelque part — on appuie et on regarde où l'on
// arrive, depuis l'accueil ET depuis un écran du tunnel. Une entrée qui
// n'ouvre rien est pire qu'une entrée absente.
for (const [w, h] of [[900, 700], [1024, 768], [1366, 657], [1920, 1080]]) {
  for (const langue of ['fr', 'en']) {
    const p = await ouvrir(w, h, langue);
    const tag = `${w}×${h} ${langue.toUpperCase()}`;
    const e = await p.evaluate(() => {
      const nav = document.querySelector('.entete-nav'), lg = document.querySelector('.langues');
      if (!nav) return { barre: getComputedStyle(document.querySelector('.barre')).display, nav: 'absent' };
      const en = document.querySelector('.entete'), n = nav.getBoundingClientRect(), l = lg.getBoundingClientRect();
      return { barre: getComputedStyle(document.querySelector('.barre')).display,
        nav: getComputedStyle(nav).display, hEntete: Math.round(en.getBoundingClientRect().height),
        chevauche: n.right > l.left - 4, deborde: nav.scrollWidth > nav.clientWidth + 1,
        hauteurs: [...nav.querySelectorAll(':scope > .entete-lien, :scope > details > summary')].map(x => Math.round(x.getBoundingClientRect().height)) };
    });
    check(`${tag} : la barre du bas n'est plus affichée`, e.barre === 'none', e.barre);
    const libelles = await p.evaluate(() => [...document.querySelectorAll('.entete-nav [data-t]')].map(x => x.textContent.trim()).join(' · '));
    check(`${tag} : le menu parle la langue choisie`, langue === 'en'
      ? /For business/.test(libelles) && /FAQ/.test(libelles) && /My rides/.test(libelles) && /Bookings/.test(libelles)
      : /Professionnels/.test(libelles) && /Questions/.test(libelles) && /Mes courses/.test(libelles) && /Réservations/.test(libelles),
      libelles);
    check(`${tag} : le menu est dans l'en-tête, sur une ligne, sans toucher FR/EN`,
      e.nav === 'flex' && !e.chevauche && !e.deborde && e.hEntete <= 72 && e.hauteurs.every(x => x >= 44 && x <= 48),
      JSON.stringify(e));
    await p.context().close();
  }
}
{
  const p = await ouvrir(1366, 657);
  if (!(await p.locator('.entete-nav').count())) { check('le menu d’ordinateur existe', false); } else {
  await p.evaluate(() => { window.__ouvert = []; window.open = u => { window.__ouvert.push(String(u)); return null; }; });
  const actif = () => p.evaluate(() => document.querySelector('.ecran.actif').id);
  /* « Arrivé au bloc » : son haut est en haut de l'écran — ou, pour le
     dernier bloc de la page, la page est au bout et le bloc est entier à
     l'écran (on ne peut pas défiler plus bas que la fin). */
  const haut = id => p.evaluate(id => {
    const r = document.getElementById(id).getBoundingClientRect();
    const auBout = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
    return (auBout && r.top >= 0 && r.top < innerHeight / 2) ? 0 : Math.round(r.top);
  }, id);
  // Les trois blocs de l'accueil.
  for (const [lien, bloc] of [['services', 'services'], ['modele', 'modele'], ['questions', 'questions']]) {
    await p.click(`.entete-nav [data-defiler="${lien}"]`); await p.waitForTimeout(900);
    const t = await haut(bloc);
    check(`menu « ${lien} » : descend au bloc`, (await actif()) === 'ecran-accueil' && t >= -2 && t < 120, `haut du bloc ${t}`);
  }
  // Fermée, la liste ne garde aucune boîte : Chrome mesure encore les liens
  // d'un <details> fermé, et le vérificateur de la CI les disait recouverts.
  check('liste « Mes courses » fermée : ses liens n’ont aucune boîte',
    await p.evaluate(() => [...document.querySelectorAll('.entete-sous a')]
      .every(a => { const r = a.getBoundingClientRect(); return r.width === 0 && r.height === 0; })));
  // Mes courses → Réservations, puis Trajets.
  await p.click('.entete-menu > summary');
  check('« Mes courses » ouvre sa liste', await p.locator('.entete-sous a[data-ecran="ecran-courses"]').isVisible());
  await p.click('.entete-sous a[data-ecran="ecran-courses"]'); await p.waitForTimeout(300);
  check('« Réservations » ouvre l’écran des réservations', (await actif()) === 'ecran-courses');
  check('…referme la liste, et « Mes courses » s’allume',
    !(await p.locator('.entete-menu').evaluate(d => d.open)) && await p.locator('.entete-menu').evaluate(d => d.classList.contains('actif')));
  await p.click('.entete-menu > summary'); await p.click('.entete-sous a[data-ecran="ecran-trajets"]'); await p.waitForTimeout(300);
  check('« Trajets » ouvre l’écran des trajets', (await actif()) === 'ecran-trajets');
  // Depuis un écran du tunnel, un lien de bloc ramène à l'accueil.
  await p.click('.entete-nav [data-defiler="questions"]'); await p.waitForTimeout(900);
  check('depuis un autre écran, « Questions » ramène à l’accueil et descend au bloc',
    (await actif()) === 'ecran-accueil' && (await haut('questions')) < 120);
  check('…et « Mes courses » s’éteint', !(await p.locator('.entete-menu').evaluate(d => d.classList.contains('actif'))));
  // La liste se referme d'un clic ailleurs et avec Échap.
  await p.click('.entete-menu > summary'); await p.mouse.click(700, 400);
  check('la liste « Mes courses » se referme d’un clic ailleurs', !(await p.locator('.entete-menu').evaluate(d => d.open)));
  await p.click('.entete-menu > summary'); await p.keyboard.press('Escape');
  check('…et avec Échap, le focus revenant sur « Mes courses »',
    !(await p.locator('.entete-menu').evaluate(d => d.open)) && await p.evaluate(() => document.activeElement.matches('.entete-menu > summary')));
  // Contact = la feuille de la barre, jusqu'au lien qui part.
  await p.click('.entete-nav [data-ouvre-wa]'); await p.waitForTimeout(200);
  check('« Contact » ouvre la feuille de contact', await p.locator('#feuilleWa').isVisible());
  await p.click('#feuilleWa [data-wa="infos"]'); await p.waitForTimeout(200);
  const parti = await p.evaluate(() => window.__ouvert);
  check('…et un choix y ouvre bien WhatsApp vers Elatransfer', parti.some(u => /wa\.me\/33759312433/.test(u)), parti.join(' '));
  // Le clavier : après le logo vient le menu.
  await p.evaluate(() => document.querySelector('.entete .logo').focus());
  await p.keyboard.press('Tab');
  check('au clavier, le menu suit le logo', await p.evaluate(() => document.activeElement.matches('.entete-nav [data-defiler="services"]')));
  check('menu : aucune erreur JavaScript', p._errs.length === 0, p._errs.join(' | '));
  }
  await p.context().close();
}
// Les pages d'hôtel ne changent pas : barre du bas, pas de menu d'ordinateur.
{
  const p = await ouvrir(1366, 768);
  await p.goto(SITE + 'application.html?h=easyhotel-aeroville'); await p.waitForTimeout(500);
  const r = await p.evaluate(() => ({ hotel: document.body.classList.contains('hotel'),
    menu: (document.querySelector('.entete-nav') ? getComputedStyle(document.querySelector('.entete-nav')).display : 'none'),
    barre: getComputedStyle(document.querySelector('.barre')).display }));
  check('page hôtel : pas de menu d’ordinateur, la barre reste', r.hotel && r.menu === 'none' && r.barre !== 'none', JSON.stringify(r));
  await p.context().close();
}

// ═══ LOT P0-C : « AU-DELÀ DU TRAJET » ET LA LIGNE DE RÉSUMÉ ═══
// La règle des destinations : une carte mène au formulaire SI ET SEULEMENT
// SI ce qu'elle annonce est une adresse. On lit la cible déclarée et on
// appuie pour vérifier qu'on y arrive.
{
  const source = (await import('node:fs')).readFileSync('index.html', 'utf8');
  const pancarte = Number((source.match(/var OPTION_PANCARTE_EUR\s*=\s*(\d+(?:\.\d+)?)/) || [])[1]);
  for (const langue of ['fr', 'en']) {
    const p = await ouvrir(1366, 768, langue);
    const resume = await p.locator('.hero-prix').textContent();
    check(`${langue.toUpperCase()} : la ligne de résumé nomme les salons et ne promet plus de conciergerie`,
      /Salons|Trade fairs/.test(resume) && !/oncierge/i.test(resume), resume);
    const prixAff = (await p.evaluate(() => (document.querySelector('.plus-prix') || {}).textContent || 'absent')).replace(/\s/g, ' ');
    const attendu = '+' + pancarte.toLocaleString(langue === 'en' ? 'en-GB' : 'fr-FR', { minimumFractionDigits: 2 }) + ' €';
    check(`${langue.toUpperCase()} : le prix de l'accueil personnalisé est celui de l'option pancarte (${pancarte} €), au format de la langue`,
      prixAff.replace(/[  ]/g, ' ') === attendu.replace(/[  ]/g, ' '), `affiché « ${prixAff} », attendu « ${attendu} »`);
    await p.context().close();
  }
  const p = await ouvrir(1366, 768);
  const cartes = await p.evaluate(() => [...document.querySelectorAll('.plus-carte')].map(e => ({
    nom: e.querySelector('b').textContent.trim(), vers: e.getAttribute('data-ecran') })));
  check('« Au-delà du trajet » porte ses trois cartes', cartes.length === 3, cartes.map(c => c.nom).join(', '));
  for (const [i, c] of cartes.entries()) {
    if (!c.vers) { check(`« ${c.nom} » déclare un écran`, false); continue; }
    await p.evaluate(() => scrollTo(0, 0));
    await p.locator('.plus-carte').nth(i).click(); await p.waitForTimeout(300);
    check(`« ${c.nom} » ouvre l'écran qu'elle annonce (${c.vers})`,
      await p.evaluate(id => document.getElementById(id).classList.contains('actif'), c.vers));
    await p.click('.entete .logo').catch(() => {}); await p.goto(SITE); await p.waitForTimeout(300);
  }
  check('les deux devis mènent à « Nous joindre », l’accueil au formulaire',
    cartes.filter(c => c.vers === 'ecran-contact').length === 2 && cartes.filter(c => c.vers === 'ecran-accueil').length === 1,
    JSON.stringify(cartes));
  const trois = await p.evaluate(() => { const r = [...document.querySelectorAll('.plus-carte')].map(e => e.getBoundingClientRect());
    return r.every(x => Math.abs(x.top - r[0].top) < 2); });
  check('sur ordinateur, les trois cartes sont de front', trois);
  check('aucune erreur JavaScript', p._errs.length === 0, p._errs.join(' | '));
  await p.context().close();
}

// ═══ LOT P0-D : LE BAS DE PAGE SUR ORDINATEUR ═══
// On mesure la mise en page, pas le CSS : une règle d'affichage se casse sans
// bruit, il suffit d'un sélecteur trop large.
for (const [w, h] of [[1024, 768], [1440, 900]]) {
  const p = await ouvrir(w, h);
  const m = await p.evaluate(() => {
    const r = e => e.getBoundingClientRect();
    const inc = [...document.querySelectorAll('.inclus-l')].map(r);
    const faq = document.querySelector('.faq'), h2 = r(faq.querySelector('h2'));
    const qs = [...faq.querySelectorAll('.faq-q')].map(r);
    const pied = [...document.querySelector('.pied').children].filter(e => e.offsetHeight).map(r);
    const titres = [...document.querySelectorAll('#ecran-accueil .section > h2')].filter(e => e.offsetHeight)
      .map(e => parseFloat(getComputedStyle(e).fontSize));
    return {
      pro: getComputedStyle(document.querySelector('.pro-bloc')).display,
      incLigne: inc.length === 4 && inc.every(x => Math.abs(x.top - inc[0].top) < 2),
      faqCote: h2.right < qs[0].left && Math.abs(h2.top - qs[0].top) < 24,
      faqEcarts: qs.slice(1).map((x, i) => Math.round(x.top - qs[i].bottom)),
      piedLigne: pied.every(x => Math.abs((x.top + x.bottom) / 2 - (pied[0].top + pied[0].bottom) / 2) < 6),
      titreMin: Math.min(...titres),
    };
  });
  check(`${w} px : « Hôtel, agence, entreprise ? » s'efface (le menu porte « Professionnels »)`, m.pro === 'none', m.pro);
  check(`${w} px : les quatre faits de « Inclus » sont de front`, m.incLigne);
  check(`${w} px : les titres de section sont à l'échelle d'un écran d'ordinateur (≥ 24 px)`, m.titreMin >= 24, String(m.titreMin));
  check(`${w} px : le pied tient sur une ligne`, m.piedLigne);
  check(`${w} px : les questions sont régulièrement espacées`, new Set(m.faqEcarts).size === 1, m.faqEcarts.join(','));
  if (w >= 1100) check(`${w} px : la FAQ a son titre à gauche, les questions à droite`, m.faqCote);
  check(`${w} px bas de page : aucune erreur JavaScript`, p._errs.length === 0, p._errs.join(' | '));
  await p.context().close();
}

// ═══ L'ORDRE DE L'ACCUEIL (6 octobre 2026, « le 1.2.3 est trop bas ») ═══
// Le récit d'une page qui vend un trajet : l'action, ce qui se passe après,
// ce qui est inclus, où l'on va, le reste, les professionnels, les
// questions, le pied. On lit l'ordre À L'ÉCRAN (le haut de chaque bloc), pas
// dans le code : une grille ou un ordre CSS peut inverser les deux.
for (const [w, h, langue] of [[320, 700, 'fr'], [390, 844, 'fr'], [390, 844, 'en'], [1024, 768, 'fr'], [1366, 657, 'fr'], [1920, 1080, 'en']]) {
  const p = await ouvrir(w, h, langue);
  const o = await p.evaluate(() => {
    const vu = e => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0;
    const haut = s => { const e = document.querySelector(s); return vu(e) ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
    const suite = ['.reserver', '#comment', '#ecran-accueil .inclus', '#services', '#plus', '#modele', '#questions', '#ecran-accueil .pied'];
    const form = document.querySelector('.reserver').getBoundingClientRect();
    // Ce qui vient juste sous le formulaire, la ligne des professionnels mise à part.
    const sous = [...document.querySelectorAll('#ecran-accueil > *')]
      .filter(e => vu(e) && !e.matches('.pro-bloc, .hero, .reserver, .hotel-tete') && e.getBoundingClientRect().top >= form.bottom - 1)
      .sort((a, c) => a.getBoundingClientRect().top - c.getBoundingClientRect().top);
    return {
      hauts: suite.map(s => [s, haut(s)]),
      premier: sous[0] ? (sous[0].id || sous[0].className) : 'rien',
      suites: [...document.querySelectorAll('.etapes-ligne, .modele-etapes')].filter(vu).length,
      etapesDansComment: !!document.querySelector('#comment .modele-etapes'),
      proSansEtapes: !!document.querySelector('#modele .modele-pro') && !document.querySelector('#modele .modele-etapes'),
      lienPro: (document.querySelector('.pro-lien') || {}).getAttribute?.('href') || '',
      promesse: !!document.querySelector('.promesse'),
      retard: [...document.querySelectorAll('#ecran-accueil > :not(.faq) *')].some(e => vu(e) && e.children.length === 0 && /(Vol ou train en retard|Flight or train delayed)/.test(e.textContent)),
    };
  });
  const absents = o.hauts.filter(([, y]) => y === null).map(([s]) => s);
  check(`${w} px ${langue} ordre : tous les blocs de l'accueil sont affichés`, absents.length === 0, absents.join(', '));
  const enDesordre = o.hauts.slice(1).filter(([, y], i) => y !== null && o.hauts[i][1] !== null && y <= o.hauts[i][1]).map(([s]) => s);
  check(`${w} px ${langue} ordre : formulaire → étapes → inclus → services → au-delà → professionnels → questions → pied`,
    enDesordre.length === 0, o.hauts.map(([s, y]) => s.replace('#ecran-accueil ', '') + '=' + y).join(' '));
  check(`${w} px ${langue} ordre : les trois étapes sont le premier bloc sous le formulaire`, o.premier === 'comment', o.premier);
  check(`${w} px ${langue} ordre : une seule suite numérotée 1 · 2 · 3 à l'écran`, o.suites === 1 && o.etapesDansComment, String(o.suites));
  check(`${w} px ${langue} ordre : « Professionnels » mène à l'encart des professionnels, sans les étapes`, o.proSansEtapes && o.lienPro === '#modele', o.lienPro);
  check(`${w} px ${langue} ordre : le suivi du vol n'est plus dit deux fois de suite`, !o.promesse && !o.retard);
  check(`${w} px ${langue} ordre : aucune erreur JavaScript`, p._errs.length === 0, p._errs.join(' | '));
  await p.context().close();
}
// La page easyHotel n'a pas le bloc des étapes : elle garde la petite ligne
// de la carte, à la largeur de la carte (elle tombait dans une colonne de
// 86 px quand la façade plaçait les enfants de la carte un par un).
for (const [w, h] of [[390, 844], [1280, 800]]) {
  const p = await ouvrir(w, h);
  await p.goto(SITE + 'application.html?h=easyhotel-aeroville'); await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const l = document.querySelector('.etapes-ligne'), c = document.querySelector('.reserver');
    const comment = document.querySelector('#comment');
    return { ligne: getComputedStyle(l).display, large: Math.round(l.getBoundingClientRect().width), carte: Math.round(c.getBoundingClientRect().width),
      comment: comment ? getComputedStyle(comment).display : 'absent' };
  });
  check(`page hôtel ${w} px : la ligne « 1 Trajet → 2 Prix → 3 Confirmation » reste, à la largeur de la carte`,
    r.ligne !== 'none' && r.large >= r.carte * 0.8, JSON.stringify(r));
  check(`page hôtel ${w} px : le bloc des étapes du site public n'y est pas`, r.comment === 'none' || r.comment === 'absent', r.comment);
  await p.context().close();
}

// ── LA PHOTO DU BANDEAU (Bloc 2, 7 octobre 2026) : le bon fichier par écran,
//    léger, et le texte lisible dessus. Trois fichiers d'une seule photo :
//    recadrage téléphone sous 600 px, 1200 px sur tablette, 1672 px au-delà.
//    La lisibilité se MESURE : on cache le texte, on capture le bandeau, et on
//    lit la luminance des pixels sous chaque ligne — par le navigateur lui-même
//    (canvas), sans dépendance, comme la régression visuelle. Un voile qu'on
//    allège « à l'œil » se voit ici, pas en relisant le CSS.
for (const [w, h, fichier] of [[390, 844, 'accueil-paris-nuit-tel.webp'], [820, 1180, 'accueil-paris-nuit-tab.webp'], [1440, 900, 'accueil-paris-nuit.webp']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'fr-FR' });
  const p = await ctx.newPage();
  const vus = []; p.on('request', r => vus.push(new URL(r.url()).pathname));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.goto(SITE, { waitUntil: 'load' }); await p.waitForTimeout(400);
  const photos = vus.filter(v => v.includes('accueil-paris-nuit'));
  check(`${w} px : le bandeau charge ${fichier}, et lui seul`, photos.length === 1 && photos[0].endsWith('/' + fichier), photos.join(', '));
  const poids = (await stat(join('site', 'photos', fichier))).size;
  check(`${fichier} : au plus 160 Ko`, poids <= 160 * 1024, Math.round(poids / 1024) + ' Ko');
  const boites = await p.evaluate(() => Object.fromEntries(['.hero h1', '.hero-sous', '.hero-prix'].map(s => {
    const r = document.querySelector(s).getBoundingClientRect();
    return [s, { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }];
  })));
  const hero = await p.evaluate(() => { const r = document.querySelector('.hero').getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom) }; });
  await p.addStyleTag({ content: '.hero-texte *{visibility:hidden!important}' });
  const png = await p.screenshot({ clip: { x: 0, y: 0, width: w, height: Math.min(h, hero.b) } });
  const lum = await p.evaluate(async ({ data, boites }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + data; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const out = {};
    for (const [s, bx] of Object.entries(boites)) {
      const d = g.getImageData(bx.l, bx.t, bx.r - bx.l, bx.b - bx.t).data;
      let som = 0, n = 0, max = 0;
      for (let i = 0; i < d.length; i += 4) { const L = .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]; som += L; n++; if (L > max) max = L; }
      out[s] = { moy: Math.round(som / n), max: Math.round(max) };
    }
    return out;
  }, { data: png.toString('base64'), boites });
  for (const [s, v] of Object.entries(lum))
    check(`${w} px : fond sombre sous « ${s} » (moyenne ≤ 60, pic ≤ 150 sur 255)`, v.moy <= 60 && v.max <= 150, JSON.stringify(v));
  await ctx.close();
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
