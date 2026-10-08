// ═══ LA PAGE DES PROFESSIONNELS — /professionnels/ (8 octobre 2026) ═══
// Mission « Démo professionnels », bloc 1. Éprouvée sur le SITE CONSTRUIT :
// un fichier oublié par construire.sh marche en local et manque en ligne.
// Ce qui est vérifié, ce sont les règles, pas les phrases du jour :
//  · indexable (title, description, canonique, au plan du site) ;
//  · aucun débordement horizontal, de 320 à 1440 px ;
//  · les ancres #demo et #contact existent, et le bouton principal y mène ;
//  · le français et l'anglais diffèrent vraiment, et rien ne reste en
//    français une fois l'anglais choisi ;
//  · aucun mot interdit par « LE POSITIONNEMENT » ni par la mission ;
//  · les liens de contact composent le bon numéro ;
//  · l'accueil y mène depuis l'encart des professionnels.
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
await new Promise(r => serveur.listen(8141, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:8141/';
const PAGE = SITE + 'professionnels/';

const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const b = await chromium.launch();

async function ouvrir(w, h = 900, langue = 'fr', url = PAGE) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: langue === 'en' ? 'en-US' : 'fr-FR' });
  await ctx.addInitScript(l => { try { localStorage.setItem('ela_langue', l); } catch (e) {} }, langue);
  const p = await ctx.newPage();
  p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  p._404 = []; p.on('response', r => { if (r.url().startsWith(SITE) && r.status() >= 400) p._404.push(r.url()); });
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(200);
  return p;
}

// 1. La page publiée existe, et elle est indexable.
const brut = await (await fetch(PAGE)).text();
check('la page est publiée par construire.sh', /Votre réception réserve/.test(brut), brut.slice(0, 60));
check('le titre nomme la marque et le public', /<title>[^<]*Elatransfer[^<]*(hôtel|Hôtel)/.test(brut));
check('elle a une description', /<meta name="description" content="[^"]{80,}"/.test(brut));
check('elle est indexable', /<meta name="robots" content="index/.test(brut) && !/noindex/i.test(brut));
check('sa canonique est son adresse', brut.includes('<link rel="canonical" href="https://elatransfer.com/professionnels/">'));
check('aucune note de travail n\'est publiée', !brut.includes('<!--') && !/LA PAGE DES PROFESSIONNELS|Deux langues, sans dépendance/.test(brut));
const plan = await (await fetch(SITE + 'sitemap.xml')).text();
check('elle est au plan du site', plan.includes('<loc>https://elatransfer.com/professionnels/</loc>'));
let ld = {}; try { ld = JSON.parse((brut.match(/<script type="application\/ld\+json">([^<]+)<\/script>/) || [, '{}'])[1]); } catch (e) {}
check('ses données désignent l\'entreprise #organisation', (ld.provider || {})['@id'] === 'https://elatransfer.com/#organisation');
const constr = await readFile('construire.sh', 'utf8');
const lignesCmd = constr.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
check('construire.sh réserve les noms « professionnels » et « demo »', /reserves="[^"]*\bprofessionnels\b[^"]*\bdemo\b/.test(lignesCmd));
check('construire.sh retire ses commentaires', /masquer-commentaires[\s\S]*site\/professionnels\/index\.html/.test(lignesCmd));

// 2. Aucun débordement, aucune erreur, à toutes les largeurs.
for (const w of [320, 375, 390, 430, 768, 820, 1280, 1366, 1440]) {
  for (const langue of ['fr', 'en']) {
    const p = await ouvrir(w, 900, langue);
    const m = await p.evaluate(() => ({ doc: document.documentElement.scrollWidth, vue: innerWidth,
      fautif: [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 3).map(e => e.tagName + '.' + e.className + ' [' + Math.round(e.getBoundingClientRect().right) + ']') }));
    check(`${w} px ${langue.toUpperCase()} : aucun débordement horizontal`, m.doc <= m.vue && m.fautif.length === 0, JSON.stringify(m));
    // Un numéro ou une adresse coupés en deux ne se relisent plus d'un trait.
    const coupes = await p.evaluate(() => [...document.querySelectorAll('.moyen span')]
      .filter(e => e.getBoundingClientRect().height > parseFloat(getComputedStyle(e).lineHeight) * 1.5).map(e => e.textContent));
    check(`${w} px ${langue.toUpperCase()} : le numéro et l'e-mail du contact tiennent sur une ligne`, coupes.length === 0, coupes.join(' | '));
    check(`${w} px ${langue.toUpperCase()} : aucune erreur, aucun fichier manquant`, p._errs.length === 0 && p._404.length === 0, p._errs.concat(p._404).join(' | '));
    await p.context().close();
  }
}

// 3. Les ancres, et le bouton principal qui mène au formulaire à venir.
{
  const p = await ouvrir(390, 844);
  const a = await p.evaluate(() => ({ demo: !!document.getElementById('demo'), contact: !!document.getElementById('contact'),
    cta: (document.querySelector('.hero a.bouton') || {}).getAttribute?.('href'),
    ctaTexte: (document.querySelector('.hero a.bouton') || {}).textContent }));
  check('l\'ancre #demo existe', a.demo);
  check('l\'ancre #contact existe', a.contact);
  check('le bouton principal est « Voir la démo hôtel » et mène à #demo', a.cta === '#demo' && /démo hôtel/.test(a.ctaTexte), a.cta + ' / ' + a.ctaTexte);
  // Le bouton est visible sans défiler, et c'est bien lui qui reçoit le doigt.
  const recu = await p.evaluate(() => { const e = document.querySelector('.hero a.bouton'); const r = e.getBoundingClientRect();
    return { bas: r.bottom, ok: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === e }; });
  check('390×844 : « Voir la démo hôtel » est à l\'écran et reçoit l\'appui', recu.ok && recu.bas <= 844, JSON.stringify(recu));
  await p.click('.hero a.bouton'); await p.waitForTimeout(700);
  const haut = await p.evaluate(() => Math.round(document.getElementById('demo').getBoundingClientRect().top));
  check('un appui amène à la section #demo, sous l\'en-tête collant', haut >= 0 && haut < 200, String(haut));
  // Rien de mort : chaque lien mène quelque part.
  const liens = await p.$$eval('a[href]', l => l.map(a => a.getAttribute('href')));
  const morts = await p.$$eval('a[href]', l => l.map(a => a.getAttribute('href'))
    .filter(h => !h || h === '#' || (h.startsWith('#') && !document.getElementById(h.slice(1)))));
  check('aucun lien mort dans la page', morts.length === 0, morts.join(', '));
  // Les liens de contact.
  const tel = liens.filter(h => h.startsWith('tel:'));
  check('les appels composent +33 7 59 31 24 33', tel.length >= 2 && tel.every(h => h === 'tel:+33759312433'), tel.join(', '));
  const wa = liens.filter(h => /wa\.me|whatsapp/i.test(h));
  check('WhatsApp ouvre le numéro du site', wa.length >= 1 && wa.every(h => h === 'https://wa.me/33759312433'), wa.join(', '));
  check('l\'e-mail est contact@elatransfer.com', liens.includes('mailto:contact@elatransfer.com'));
  const contact = await p.evaluate(() => document.getElementById('contact').innerText);
  check('#contact écrit le numéro et l\'e-mail en clair', /\+33 7 59 31 24 33/.test(contact) && /contact@elatransfer\.com/.test(contact));
  // Aucune image dont on ne connaît pas la source : seul le logo du site.
  const imgs = await p.$$eval('img', l => l.map(i => i.getAttribute('src')));
  check('aucune image hors du logo du site', imgs.every(s => /^\/brand-logo/.test(s)), imgs.join(', '));
  await p.context().close();
}

// 4. Français et anglais, et les mots interdits.
const textes = {};
for (const langue of ['fr', 'en']) {
  const p = await ouvrir(1280, 900, langue);
  textes[langue] = await p.evaluate(() => { document.querySelectorAll('details').forEach(d => d.open = true);
    return { corps: document.body.innerText, titre: document.title, lang: document.documentElement.lang,
      desc: document.querySelector('meta[name=description]').content,
      aria: [...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')) }; });
  await p.context().close();
}
check('FR : la page dit « Votre réception réserve. Elatransfer gère tout le reste. »', textes.fr.corps.includes('Votre réception réserve. Elatransfer gère tout le reste.'));
check('EN : la page passe en anglais (lang, titre, description)', textes.en.lang === 'en' && textes.en.titre !== textes.fr.titre && textes.en.desc !== textes.fr.desc);
const lignesFr = new Set(textes.fr.corps.split('\n').map(s => s.trim()).filter(s => s.length > 12 && !/@|\+33/.test(s)));
const restes = textes.en.corps.split('\n').map(s => s.trim()).filter(s => lignesFr.has(s));
check('EN : aucune ligne ne reste en français', restes.length === 0, restes.join(' | '));
check('EN : aucun libellé de lecteur d\'écran ne reste en français', !textes.en.aria.some(a => /accueil|Lire en/.test(a) && !/français/.test(a)), textes.en.aria.join(' | '));
const INTERDITS = {
  fr: /\bsolutions?\b|plateformes?\b|mobilité|conciergerie|\bcanal\b|\bcanaux\b|\bVTC\b|\btaxis?\b|prix ferme|\bferme\b|temps réel|nos partenaires|easyhotel/i,
  en: /\bsolutions?\b|platforms?\b|mobility|concierge|\bchannels?\b|\bVTC\b|\btaxis?\b|\bfirm\b|real[- ]time|our partners|easyhotel/i };
for (const l of ['fr', 'en']) {
  const t = textes[l].corps + ' ' + textes[l].titre + ' ' + textes[l].desc;
  const m = t.match(INTERDITS[l]);
  check(`${l.toUpperCase()} : aucun mot interdit (positionnement, VTC, taxi, prix ferme, temps réel, partenaires, easyHotel)`, !m, m ? m[0] : '');
  // Aucun chiffre promis : hors du numéro, de l'heure du récit et des 60 min de la FAQ (CGV art. 7).
  const chiffres = t.replace(/\+33 7 59 31 24 33/g, '').replace(/\b[57] (h|am)\b/g, '').replace(/60 minutes/g, '')
    .replace(/Roissy-CDG/g, '').match(/\d+\s*(%|€|jours?|days?|heures?|hours?|min)/i);
  check(`${l.toUpperCase()} : aucun chiffre ni délai promis`, !chiffres, chiffres ? chiffres[0] : '');
}

// 5. L'accueil y mène, depuis l'encart des professionnels seulement.
for (const langue of ['fr', 'en']) {
  const p = await ouvrir(390, 844, langue, SITE);
  const cta = await p.evaluate(() => { const a = document.querySelector('#modele .modele-cta');
    return a ? { href: a.getAttribute('href'), texte: a.textContent.trim(), mail: !!document.querySelector('#modele a[href="mailto:contact@elatransfer.com"]') } : null; });
  check(`accueil ${langue.toUpperCase()} : le bouton de l'encart est « ${langue === 'fr' ? 'Voir la démo hôtel' : 'See the hotel demo'} » vers /professionnels/`,
    cta && cta.href === '/professionnels/' && cta.texte === (langue === 'fr' ? 'Voir la démo hôtel' : 'See the hotel demo'), JSON.stringify(cta));
  check(`accueil ${langue.toUpperCase()} : l'encart garde son lien e-mail`, cta && cta.mail);
  if (langue === 'fr') {
    await p.evaluate(() => document.querySelector('#modele').scrollIntoView());
    await p.click('#modele .modele-cta'); await p.waitForLoadState('load');
    check('accueil : un appui ouvre vraiment /professionnels/', p.url() === PAGE, p.url());
  }
  await p.context().close();
}

await b.close();
await new Promise(r => serveur.close(r));
console.log('\n=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
process.exit(ko.length ? 1 : 0);
