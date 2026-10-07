// ═══ LE FORMULAIRE PUBLIC — BLOC 3 (7 octobre 2026) ═══
// Le formulaire passe en bleu nuit, comme la photo du bandeau. Le dessin est
// dans application-facade.css, que seul construire.sh injecte : on éprouve
// donc le site CONSTRUIT. Ce qui est vérifié ici, ce sont des RÈGLES, pas des
// valeurs du jour :
//  · chaque texte de la carte se lit (contraste MESURÉ sur les pixels rendus,
//    pas déduit de la feuille de style), dans tous ses états ;
//  · rien n'est coupé, de 320 à 1920 px ;
//  · rien n'est à moitié caché par la barre du bas au premier écran ;
//  · le champ actif se voit ;
//  · « − / + » font exactement ce que fait une frappe ;
//  · une adresse manquante est DITE sous son champ ;
//  · la page d'un hôtel, la réception et l'admin ne changent pas.
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
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, {'Content-Type': TYPES[extname(f)] || 'application/octet-stream'});
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8085, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:8085/';

const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const b = await chromium.launch();

async function ouvrir(w, h, chemin = '', options = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'fr-FR', ...options });
  const p = await ctx.newPage();
  p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.3376,48.8606]},properties:{name:'Place Vendôme',osm_key:'tourism',osm_value:'attraction',postcode:'75001',city:'Paris',countrycode:'FR'}},
    {geometry:{coordinates:[2.55,49.0]},properties:{name:'Aéroport Charles-de-Gaulle',osm_key:'aeroway',osm_value:'aerodrome',postcode:'95700',city:'Roissy-en-France',countrycode:'FR'}}]})}));
  await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.2467,48.9478]},properties:{label:'Argenteuil, 95100 Argenteuil',type:'municipality'}}]})}));
  await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
    body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
  await p.clock.setFixedTime(new Date('2026-10-06T10:00:00+02:00'));
  await p.goto(SITE + chemin, { waitUntil: 'load' });
  await p.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
  await p.waitForTimeout(300);
  return p;
}
async function choisir(p, champ, texte) {
  await p.fill(champ, ''); await p.type(champ, texte, { delay: 8 }); await p.waitForTimeout(700);
  await p.locator(`${champ === '#depart' ? '#departList' : '#arriveeList'} [role=option]`).first().click();
}

/* LE CONTRASTE SE MESURE SUR CE QUI EST RENDU. Un fond translucide posé sur
   un dégradé posé sur une photo ne se calcule pas depuis la feuille de style :
   on photographie la page texte masqué, on lit le fond réel sous chaque texte,
   et on le compare à la couleur du texte. Seuil WCAG AA : 4,5:1, ou 3:1 pour
   un grand texte (24 px, ou 18,7 px en gras). */
async function contrastes(p, racine) {
  // UNE SEULE MISE EN PAGE POUR LA MESURE ET POUR LA PHOTO. La capture
  // « pleine page » agrandit la fenêtre le temps de la prise : tout ce qui
  // dépend de la hauteur bouge, et le fond lu n'est plus celui du texte
  // (vu : un message clair sur bleu nuit mesuré à 1,3:1). On agrandit donc
  // la fenêtre AVANT de relever les positions.
  const vue = p.viewportSize();
  await p.setViewportSize({ width: vue.width, height: await p.evaluate(() => document.documentElement.scrollHeight) });
  await p.waitForTimeout(100);
  const cibles = await p.evaluate(racine => {
    const vus = [];
    const visible = e => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e);
      return r.width > 2 && r.height > 2 && st.visibility !== 'hidden' && st.display !== 'none' && e.closest('[hidden]') === null; };
    document.querySelectorAll(racine + ' *').forEach(e => {
      if (!visible(e)) return;
      const propre = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
      const champ = e.matches('input:not([type=checkbox]):not([type=radio]),select,textarea');
      if (!propre && !champ) return;
      const r = e.getBoundingClientRect(), st = getComputedStyle(e);
      // Un texte qui ne se dessine pas (taille nulle, couleur transparente :
      // l'emoji remplacé par un pictogramme) n'a pas de contraste à tenir.
      if (parseFloat(st.fontSize) === 0 || /rgba\(.*,\s*0\)$/.test(st.color)) return;
      const ph = champ && e.placeholder && !e.value ? getComputedStyle(e, '::placeholder').color : null;
      vus.push({ nom: (propre || e.value || e.placeholder || e.id).slice(0, 40), x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height,
        couleur: ph || st.color, taille: parseFloat(st.fontSize), gras: +st.fontWeight >= 700 });
    });
    return vus;
  }, racine);
  const masque = await p.addStyleTag({ content: `${racine},${racine} *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}
    ${racine} input::placeholder,${racine} textarea::placeholder{color:transparent!important}` });
  await p.waitForTimeout(50);
  const png = (await p.screenshot()).toString('base64');
  await masque.evaluate(n => n.remove());
  await p.setViewportSize(vue);
  return p.evaluate(async ({ png, cibles }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
    const L = ([r, g, b]) => .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b);
    const rgba = s => { const m = s.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1]; };
    return cibles.map(c => {
      const d = cx.getImageData(Math.round(c.x) + 1, Math.round(c.y) + 1, Math.max(1, Math.round(c.w) - 2), Math.max(1, Math.round(c.h) - 2)).data;
      let n = 0, s = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4) { s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; n++; }
      const fond = s.map(v => v / n);
      const [r, g, b, a] = rgba(c.couleur);
      const texte = [r * a + fond[0] * (1 - a), g * a + fond[1] * (1 - a), b * a + fond[2] * (1 - a)];
      const [l1, l2] = [L(texte), L(fond)].sort((x, y) => y - x);
      const grand = c.taille >= 24 || (c.taille >= 18.66 && c.gras);
      return { nom: c.nom, ratio: Math.round((l1 + .05) / (l2 + .05) * 100) / 100, seuil: grand ? 3 : 4.5 };
    });
  }, { png, cibles });
}

// ── 1. Rien ne déborde, rien n'est coupé — de 320 à 1920 px.
const TAILLES = [[320,568],[375,667],[390,844],[393,852],[430,932],[768,1024],[820,1180],[1280,800],[1366,657],[1440,900],[1920,1080]];
for (const [w, h] of TAILLES) {
  const p = await ouvrir(w, h);
  const tag = `${w}×${h}`;
  const m = await p.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    coupes: [...document.querySelectorAll('.reserver .champ-titre, .reserver .champ-titre > span, .reserver .lien-maintenant, .reserver .rassure')]
      .filter(t => t.offsetParent && t.scrollWidth > t.clientWidth + 1).map(t => t.textContent.trim()),
    valeurs: [...document.querySelectorAll('#date, #heure, #passagers, #bagages')]
      .filter(i => i.offsetParent && i.scrollWidth > i.clientWidth + 1).map(i => i.id + ' (' + i.scrollWidth + ' > ' + i.clientWidth + ')'),
    chevrons: [...document.querySelectorAll('.reserver .fleche')].filter(f => f.getBoundingClientRect().width > 0).length,
    sombre: getComputedStyle(document.querySelector('.reserver')).backgroundImage.includes('gradient'),
  }));
  check(`${tag} : aucun débordement horizontal`, m.sw === w, `largeur ${m.sw}`);
  check(`${tag} : aucun libellé coupé (« D… » à 390, « Date » disparu à 320 avant le Bloc 3)`, m.coupes.length === 0, m.coupes.join(', '));
  check(`${tag} : la date, l'heure, les passagers et les bagages s'affichent en entier`, m.valeurs.length === 0, m.valeurs.join(', '));
  check(`${tag} : plus de chevron décoratif (Passagers et Bagages ne sont pas des menus)`, m.chevrons === 0, m.chevrons + ' visible(s)');
  check(`${tag} : la carte est en bleu nuit`, m.sombre);
  // Rien n'est à moitié sous la barre du bas au premier écran : un élément
  // coupé net par la barre fait « pas fini » — c'était le cas de la ligne
  // qui rassure, sous « Voir mon prix ».
  const moities = await p.evaluate(() => {
    const barre = document.querySelector('.barre');
    if (!barre || getComputedStyle(barre).display === 'none') return [];
    const haut = barre.getBoundingClientRect().top;
    return [...document.querySelectorAll('.reserver > *')].filter(e => e.offsetParent)
      .filter(e => { const r = e.getBoundingClientRect(); return r.top < haut - 1 && r.bottom > haut + 1; })
      .map(e => (e.id || e.className) + ' ' + Math.round(e.getBoundingClientRect().top) + '–' + Math.round(e.getBoundingClientRect().bottom) + ' / barre ' + Math.round(haut));
  });
  if (h >= 844) check(`${tag} : rien dans la carte n'est à moitié caché par la barre du bas`, moities.length === 0, moities.join(', '));
  check(`${tag} : aucune erreur JavaScript`, p._errs.length === 0, p._errs.join(' | '));
  await p.context().close();
}

// ── 2. Chaque texte se lit, dans tous les états de la carte.
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const p = await ouvrir(w, h);
  await p.click('#btnVoirPrix');            // l'erreur « Indiquez votre lieu de départ »
  await p.waitForTimeout(200);
  await p.evaluate(() => {
    const carte = document.querySelector('.reserver');
    carte.querySelectorAll('[hidden]').forEach(e => { if (!e.closest('.suggest-list') && !e.classList.contains('suggest-list')) e.hidden = false; });
    document.getElementById('refus').textContent = 'Le départ et l’arrivée sont au même endroit.';
    document.getElementById('geoEtat').textContent = 'Localisation refusée : autorisez-la dans les réglages.';
    document.getElementById('infoLongueLieu').textContent = 'Paris → Lyon';
    document.getElementById('noteAsap').textContent = 'Soumise à disponibilité, sans délai garanti.';
  });
  await p.waitForTimeout(150);
  const r = await contrastes(p, '.reserver');
  const faibles = r.filter(x => x.ratio < x.seuil);
  check(`${w} px : chaque texte de la carte (${r.length} mesurés, tous ses états affichés) se lit (WCAG AA)`,
    r.length > 25 && faibles.length === 0, faibles.map(x => `« ${x.nom} » ${x.ratio}:1`).join(' · ') || r.length + ' textes');
  await p.context().close();
}
{ // La liste des suggestions ouverte.
  const p = await ouvrir(390, 844);
  await p.type('#depart', 'vendome', { delay: 8 }); await p.waitForTimeout(800);
  const r = await contrastes(p, '#departList');
  const faibles = r.filter(x => x.ratio < x.seuil);
  check('390 px : les suggestions se lisent', r.length >= 3 && faibles.length === 0,
    faibles.map(x => `« ${x.nom} » ${x.ratio}:1`).join(' · ') || r.length + ' textes');
  const icones = await p.evaluate(() => [...document.querySelectorAll('#departList .ico')].map(i => ({
    cat: i.getAttribute('data-cat'), taille: getComputedStyle(i).fontSize, masque: getComputedStyle(i).webkitMaskImage || getComputedStyle(i).maskImage })));
  check('les suggestions portent leur catégorie', icones.length >= 3 && icones.every(i => i.cat), JSON.stringify(icones.map(i => i.cat)));
  check('les suggestions n\'affichent plus d\'emoji : un pictogramme au trait le remplace',
    icones.every(i => i.taille === '0px' && /svg/.test(i.masque)), JSON.stringify(icones.map(i => i.taille)));
  await p.context().close();
}

// ── 3. Le champ actif se voit.
{
  const p = await ouvrir(390, 844);
  const avant = await p.evaluate(() => { const s = getComputedStyle(document.querySelector('#blocDepart .champ')); return s.borderTopColor + '|' + s.boxShadow; });
  await p.focus('#depart'); await p.waitForTimeout(50);
  const apres = await p.evaluate(() => { const s = getComputedStyle(document.querySelector('#blocDepart .champ')); return { bord: s.borderTopColor, ombre: s.boxShadow }; });
  check('le champ actif change de bord et porte un halo', avant !== apres.bord + '|' + apres.ombre && apres.ombre !== 'none', JSON.stringify(apres));
  await p.context().close();
}

// ── 4. « − / + » : la même chose qu'une frappe.
{
  const p = await ouvrir(390, 844);
  await p.evaluate(() => { window.__ev = []; ['input', 'change'].forEach(t => document.getElementById('passagers').addEventListener(t, () => window.__ev.push(t))); });
  const btn = (champ, i) => p.locator(`#${champ}`).locator('xpath=..').locator('.pas-btn').nth(i);
  // Absents (l'ancien code), on le DIT et on va au bout : une suite qui
  // s'arrête au premier bouton manquant ne nomme pas les autres défauts.
  const nb = await p.locator('.reserver .pas-btn:visible').count();
  check('les boutons « − / + » sont là, quatre', nb === 4, nb + ' visible(s)');
  if (nb === 4) {
  check('« − » des passagers est éteint à 1', await btn('passagers', 0).isDisabled());
  await btn('passagers', 1).click();
  check('« + » ajoute un passager', (await p.inputValue('#passagers')) === '2', await p.inputValue('#passagers'));
  check('…et déclenche « input » puis « change », comme une frappe', JSON.stringify(await p.evaluate(() => window.__ev)) === '["input","change"]',
    JSON.stringify(await p.evaluate(() => window.__ev)));
  check('« − » des bagages descend jusqu\'à 0, puis s\'éteint', await (async () => { await btn('bagages', 0).click(); return (await p.inputValue('#bagages')) === '0' && await btn('bagages', 0).isDisabled(); })());
  await p.fill('#bagages', '9'); await p.dispatchEvent('#bagages', 'input');
  check('« + » des bagages s\'éteint au maximum (9)', await btn('bagages', 1).isDisabled());
  await p.fill('#passagers', '12'); await p.dispatchEvent('#passagers', 'input');
  check('le nombre reste tapable (un groupe de 12)', (await p.inputValue('#passagers')) === '12' && !(await btn('passagers', 0).isDisabled()));
  const noms = await p.evaluate(() => [...document.querySelectorAll('.pas-btn')].map(b => b.getAttribute('aria-label')));
  check('les quatre boutons sont nommés', noms.length === 4 && noms.every(Boolean), JSON.stringify(noms));
  check('le champ garde son nom : « Passagers »', (await p.evaluate(() => {
    const i = document.getElementById('passagers'); return document.getElementById(i.getAttribute('aria-labelledby')).textContent.trim(); })) === 'Passagers');
  await p.focus('#passagers'); await p.keyboard.press('Tab');
  check('l\'ordre au clavier ne change pas : de Passagers on passe à Bagages', (await p.evaluate(() => document.activeElement.id)) === 'bagages',
    await p.evaluate(() => document.activeElement.id));
  await p.click('.langues [data-langue="en"]'); await p.waitForTimeout(200);
  check('les boutons parlent anglais en anglais', (await btn('passagers', 1).getAttribute('aria-label')) === 'Add a passenger');
  }
  await p.context().close();
}
{ // Le nombre choisi au « + » décide vraiment des véhicules proposés.
  const p = await ouvrir(390, 844);
  await choisir(p, '#depart', 'vendome'); await choisir(p, '#arrivee', 'argenteuil');
  const plus = p.locator('#passagers').locator('xpath=..').locator('.pas-btn').nth(1);
  if (await plus.isVisible()) for (let i = 0; i < 4; i++) await plus.click();
  await p.click('#btnVoirPrix'); await p.waitForTimeout(1200);
  const vehicules = await p.locator('#ecran-vehicules .veh-carte').count();
  check('5 passagers choisis au « + » : la berline (4 places) n\'est plus proposée', vehicules === 1, vehicules + ' véhicule(s)');
  check('aucune erreur JavaScript dans le tunnel', p._errs.length === 0, p._errs.join(' | '));
  await p.context().close();
}

// ── 5. Une adresse manquante est DITE, sous son champ.
{
  const p = await ouvrir(390, 844);
  const T = await p.evaluate(() => window.ELA_TEXTES);
  const message = sel => p.evaluate(sel => { const e = document.querySelector(sel); if (!e || e.hidden) return null;
    return { texte: e.textContent.trim(), haut: e.getBoundingClientRect().top }; }, sel);
  await p.click('#btnVoirPrix'); await p.waitForTimeout(200);
  const m1 = await message('#blocDepart .champ-erreur');
  const basChamp = await p.evaluate(() => document.querySelector('#blocDepart .champ').getBoundingClientRect().bottom);
  check('« Voir mon prix » sans départ : le message le dit, sous le champ', m1 && m1.texte === T.fr.err_depart_vide && m1.haut >= basChamp - 1, JSON.stringify(m1));
  check('…le champ est marqué invalide pour un lecteur d\'écran', (await p.getAttribute('#depart', 'aria-invalid')) === 'true');
  check('…et le curseur y est', (await p.evaluate(() => document.activeElement.id)) === 'depart');
  await p.click('.langues [data-langue="en"]'); await p.waitForTimeout(200);
  check('…le message suit la langue', (await message('#blocDepart .champ-erreur'))?.texte === T.en.err_depart_vide);
  await p.click('.langues [data-langue="fr"]'); await p.waitForTimeout(200);
  await choisir(p, '#depart', 'vendome');
  check('le départ choisi, le message disparaît', (await message('#blocDepart .champ-erreur')) === null && (await p.getAttribute('#depart', 'aria-invalid')) === null);
  await p.type('#arrivee', 'argent', { delay: 8 }); await p.waitForTimeout(700);
  await p.mouse.click(5, 300); await p.waitForTimeout(150);      // un clic ailleurs ferme la liste
  await p.click('#btnVoirPrix'); await p.waitForTimeout(800);
  const m2 = await message('#blocArrivee .champ-erreur');
  check('une arrivée écrite mais pas choisie : « Choisissez une adresse dans la liste »', m2 && m2.texte === T.fr.err_choisir_adresse, JSON.stringify(m2));
  check('…et la liste se rouvre sous ses yeux', await p.locator('#arriveeList').isVisible());
  check('…avec sa sortie « Mon adresse n\'est pas dans la liste »', (await p.locator('#arriveeList .suggest-manuel').count()) === 1);
  check('aucune erreur JavaScript', p._errs.length === 0, p._errs.join(' | '));
  await p.context().close();
}

// ── 6. La ligne qui rassure dit deux faits de « Inclus », avec leurs clés.
{
  const p = await ouvrir(390, 844);
  const T = await p.evaluate(() => window.ELA_TEXTES);
  const ligne = () => p.evaluate(() => document.querySelector('.reserver > .rassure').textContent.replace(/\s+/g, ' ').trim());
  check('la rassurance dit « Prix ferme · Réglé au chauffeur », lu dans la page', (await ligne()) === `${T.fr.eng2} · ${T.fr.eng4}`, await ligne());
  check('…et plus « WhatsApp ou SMS », devenu faux le 4 octobre', !/WhatsApp|SMS/.test(await ligne()));
  await p.click('.langues [data-langue="en"]'); await p.waitForTimeout(200);
  check('…en anglais aussi', (await ligne()) === `${T.en.eng2} · ${T.en.eng4}` && (await ligne()) !== `${T.fr.eng2} · ${T.fr.eng4}`, await ligne());
  await p.context().close();
}

// ── 7. Un seul bouton principal : « Réserver mon trajet » passe en contour.
{
  const p = await ouvrir(390, 844);
  const s = await p.evaluate(() => { const c = getComputedStyle(document.getElementById('btnHeroReserver')); return { image: c.backgroundImage, bord: c.borderTopWidth }; });
  check('« Réserver mon trajet » n\'est plus un bouton plein', s.image === 'none' && parseFloat(s.bord) >= 1, JSON.stringify(s));
  await p.context().close();
}

// ── 8. Une heure passée éteint le bouton pour de bon ; le calcul, non.
{
  const p = await ouvrir(390, 844);
  const cyan = await p.evaluate(() => getComputedStyle(document.getElementById('btnVoirPrix')).backgroundColor);
  await p.fill('#date', '2026-10-05'); await p.dispatchEvent('#date', 'change'); await p.waitForTimeout(250);
  const e = await p.evaluate(() => ({ ecriteau: !document.getElementById('heurePassee').hidden,
    eteint: document.getElementById('btnVoirPrix').disabled, fond: getComputedStyle(document.getElementById('btnVoirPrix')).backgroundColor }));
  check('heure passée : le bouton s\'éteint et change d\'aspect (l\'écriteau dit pourquoi)', e.ecriteau && e.eteint && e.fond !== cyan, JSON.stringify(e) + ' / ' + cyan);
  await p.context().close();
}

// ── 9. Les animations respectent « réduire les animations ».
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.goto(SITE, { waitUntil: 'load' }); await p.waitForTimeout(200);
  const t = await p.evaluate(() => getComputedStyle(document.querySelector('.reserver .champ')).transitionDuration);
  check('« réduire les animations » coupe les transitions des champs', /^0s(, 0s)*$/.test(t), t);
  await ctx.close();
}

// ── 10. L'en-tête : la version négative du logo sur la page publique, chargée.
{
  const p = await ouvrir(390, 844);
  const l = await p.evaluate(async () => {
    const i = document.querySelector('.entete .logo-image');
    if (!i) return null;
    if (!i.complete) await new Promise(r => { i.onload = i.onerror = r; });
    return { src: i.getAttribute('src'), charge: i.naturalWidth > 0, fond: getComputedStyle(document.querySelector('.entete')).backgroundColor };
  });
  check('page publique : l\'en-tête est bleu nuit et porte la version négative du logo, bien chargée',
    l && l.src === 'brand-logo-negatif.webp' && l.charge && l.fond === 'rgb(4, 26, 49)', JSON.stringify(l));
  await p.context().close();
}

// ── 11. La page d'un hôtel, la réception et l'admin ne changent pas.
for (const [nom, chemin] of [['page easyHotel', 'application.html?h=easyhotel-aeroville'], ['réception', 'easyhotel-reception/'], ['admin', 'ela-admin/']]) {
  const p = await ouvrir(390, 844, chemin);
  const s = await p.evaluate(() => {
    const logos = [...document.querySelectorAll('img')].map(i => i.getAttribute('src') || '').filter(x => x.includes('brand-logo'));
    const e = document.querySelector('.entete');
    const entete = e ? getComputedStyle(e).backgroundColor : null;
    const c = document.querySelector('.reserver'); if (!c) return { absente: true, logos, entete };
    const st = getComputedStyle(c);
    return { image: st.backgroundImage, pas: [...document.querySelectorAll('.pas-btn')].filter(x => getComputedStyle(x).display !== 'none').length,
      chevrons: [...c.querySelectorAll('.fleche')].length, logos, entete };
  });
  check(`${nom} : la carte n'est pas en bleu nuit, les « − / + » n'y apparaissent pas`, s.absente || (!s.image.includes('gradient') && s.pas === 0), JSON.stringify(s));
  check(`${nom} : le logo reste l'original (la version négative est réservée à l'en-tête public)`,
    !s.logos.some(x => x.includes('negatif')) && s.entete !== 'rgb(4, 26, 49)', JSON.stringify({ logos: s.logos, entete: s.entete }));
  await p.context().close();
}

await b.close();
await new Promise(r => serveur.close(r));
console.log('\n=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
process.exit(ko.length ? 1 : 0);
