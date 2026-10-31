// ═══ UNE CENTRALE, UN LARGE RÉSEAU — ET RIEN DE PLUS (23 octobre 2026) ═══
// Demande de Barbaros : qu'on comprenne qu'Elatransfer est une centrale de
// réservation qui cherche le chauffeur dans un large réseau, « commercialement
// très fort mais factuellement irréprochable ». Ce qui est vérifié, ce sont
// les règles, pas les phrases du jour, sur le SITE CONSTRUIT, en français et
// en anglais :
//  · aucun nombre de partenaires, aucun nombre de chauffeurs, aucune
//    disponibilité garantie, sur aucune page publique ;
//  · la preuve d'activité de la page Professionnels ne nomme ni un lieu
//    précis ni un compte (« un hôtel », « zone de Roissy ») ;
//  · l'accueil dit « centrale de réservation » et « réseau » là où il dit qui
//    nous sommes, la page Professionnels dit « réseau » dès son bandeau ;
//  · aucune page ne promet de suivre la course « jusqu'à l'arrivée » : le
//    contrat dit « jusqu'à la prise en charge » (CGV art. 2) ;
//  · aucun mot qui dénigre un chauffeur.
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
await new Promise(r => serveur.listen(8164, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:8164/';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const b = await chromium.launch();

async function lire(chemin, langue) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: langue === 'en' ? 'en-US' : 'fr-FR' });
  await ctx.addInitScript(l => { try { localStorage.setItem('ela_langue', l); } catch (e) {} }, langue);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.goto(SITE + chemin, { waitUntil: 'load' }); await p.waitForTimeout(250);
  const t = await p.evaluate(() => {
    document.querySelectorAll('details').forEach(d => d.open = true);
    const txt = s => { const e = document.querySelector(s); return e ? e.innerText : ''; };
    const accueil = document.getElementById('ecran-accueil');
    return { corps: (accueil || document.body).innerText + '\n' + txt('footer'), lang: document.documentElement.lang,
      comment: txt('#comment'), lead: txt('.hero .lead'), reference: txt('.hero .reference'), titre: txt('h1') };
  });
  await ctx.close();
  return { ...t, errs };
}

const PAGES = [['', 'fr'], ['', 'en'], ['professionnels/', 'fr'], ['professionnels/', 'en'],
  ['transfert-cdg-paris.html', 'fr'], ['transfert-orly-paris.html', 'fr'], ['chauffeur-prive-paris.html', 'fr'],
  ['en/', 'en'], ['en/cdg-airport-transfer-paris/', 'en'], ['en/orly-airport-transfer-paris/', 'en'],
  ['en/cdg-orly-transfer/', 'en'], ['en/disneyland-paris-airport-transfer/', 'en']];
const ESP = '[ \\u00a0\\u202f]';
const REGLES = {
  fr: {
    partenaires: new RegExp(`\\b\\d+${ESP}*(?:hôtels?|partenaires?|établissements?|entreprises? partenaires?)\\b|plusieurs hôtels partenaires|nos partenaires|dizaines d.hôtels|nombreux hôtels`, 'i'),
    chauffeurs: new RegExp(`\\b\\d[\\d${ESP.slice(1, -1)}]*${ESP}*chauffeurs\\b|milliers de chauffeurs|centaines de chauffeurs`, 'i'),
    garantie: /disponibilité garantie|garantie de disponibilité|toujours disponible|chauffeur garanti|à coup sûr un chauffeur|zéro refus/i,
    arrivee: /(?:sui[tv]\w*|coordonn\w*)[^.]{0,80}jusqu.(?:(?:à|a) (?:votre |l.)arrivée|au bout)/i,
    denigre: /peu fiables?|pas fiables?|non fiables?|amateurs?|au noir|clandestins?/i,
  },
  en: {
    partenaires: new RegExp(`\\b\\d+${ESP}*(?:hotels?|partners?|properties)\\b|our partners|dozens of hotels|many hotels`, 'i'),
    chauffeurs: /\b\d[\d,]*[  ]*(?:chauffeurs|drivers)\b|thousands of (?:chauffeurs|drivers)|hundreds of (?:chauffeurs|drivers)/i,
    garantie: /guaranteed availability|availability (?:is )?guaranteed|always available|guaranteed (?:chauffeur|driver)/i,
    arrivee: /(?:follow\w*|coordinat\w*)[^.]{0,80}(?:until you arrive|through to arrival|until arrival)/i,
    denigre: /unreliable|amateurs?|unlicensed/i,
  },
};
const NOMS = { partenaires: 'aucun nombre de partenaires', chauffeurs: 'aucun nombre de chauffeurs', garantie: 'aucune disponibilité garantie',
  arrivee: 'aucun suivi promis « jusqu\'à l\'arrivée » ni « jusqu\'au bout » (CGV art. 2 : jusqu\'à la prise en charge)', denigre: 'aucun mot qui dénigre un chauffeur' };

for (const [chemin, langue] of PAGES) {
  const t = await lire(chemin, langue);
  const nom = `/${chemin} ${langue.toUpperCase()}`;
  check(`${nom} : la page est lue (sinon les règles ne prouvent rien)`, t.corps.length > 800 && t.lang.startsWith(langue) && t.errs.length === 0,
    `${t.corps.length} caractères, lang=${t.lang} ${t.errs.join(' | ')}`);
  for (const [cle, re] of Object.entries(REGLES[langue])) {
    const m = t.corps.match(re);
    check(`${nom} : ${NOMS[cle]}`, !m, m ? (t.corps.slice(Math.max(0, m.index - 40), m.index + m[0].length + 20)).replace(/\s+/g, ' ') : '');
  }
  if (chemin === '') {
    check(`${nom} : « Qui sommes-nous » dit ${langue === 'fr' ? '« centrale de réservation » et « réseau »' : '« network »'}`,
      langue === 'fr' ? /centrale de réservation/i.test(t.comment) && /réseau/i.test(t.comment) : /network/i.test(t.comment), t.comment.slice(0, 160));
  }
  if (chemin === 'professionnels/') {
    check(`${nom} : le bandeau dit le réseau`, langue === 'fr' ? /réseau/i.test(t.lead) : /network/i.test(t.lead), t.lead);
    // POUR TOUS LES PROFESSIONNELS (23/10/2026, Barbaros) : la promesse ne parle
    // plus à la seule réception d'un hôtel, et la page nomme agences et entreprises.
    check(`${nom} : la promesse parle à tous les professionnels, pas à la seule réception`,
      !(langue === 'fr' ? /réception/i : /front desk/i).test(t.titre) && (langue === 'fr' ? /agences?/i.test(t.corps) && /entreprises?/i.test(t.corps)
        : /agenc(y|ies)/i.test(t.corps) && /business/i.test(t.corps)), t.titre);
    check(`${nom} : la preuve d'activité existe`, t.reference.trim().length > 15, t.reference);
    const precis = /Roissy|CDG|Orly|Tremblay|Villepinte|Bourget|zone|\bun hôtel\b|\bun seul\b|premier|\bfirst\b|\ba hotel\b|\bone hotel\b|\barea\b/i;
    check(`${nom} : la preuve ne nomme ni un lieu précis ni un compte`, !precis.test(t.reference), t.reference);
    // JAMAIS AU PLURIEL (31/10/2026, Barbaros : « pense à ma place ») : « des professionnels »
    // ferait croire à plusieurs clients, agences et entreprises comprises, quand un seul
    // établissement s'en sert. À rouvrir le jour où un deuxième l'utilise vraiment.
    const pluriel = /\bdes (?:professionnels|hôtels|établissements|entreprises|agences|clients|partenaires)\b|\bplusieurs\b|\bnombreu|\bhotels\b|\bbusinesses\b|\bagencies\b|\bseveral\b|\bmany\b|\bprofessionals\b/i;
    check(`${nom} : la preuve ne parle pas de clients au pluriel`, !pluriel.test(t.reference), t.reference);
    // LE MÉCANISME DU LIEN NE SE VEND PAS (23/10/2026, Barbaros) : le client
    // règle « directement au chauffeur, avant le départ » ; « par lien » reste
    // au client qui réserve, aux CGV et au message qui porte le lien.
    const lien = t.corps.match(langue === 'fr' ? /par lien|lien de paiement/i : /by (payment )?link|payment link/i);
    check(`${nom} : la page ne parle pas du lien de paiement`, !lien, lien ? lien[0] : '');
  }
}

// LA FICHE PAPIER DES HÔTELS (commercial/fiche-hotels.html, 23/10/2026).
// Elle n'est pas publiée, mais c'est elle qu'on envoie aux directeurs en PDF :
// elle disait encore « suivons le trajet jusqu'au bout » et « confirmée » quand
// le site était corrigé — aucun contrôle ne la lisait. Mêmes règles que les
// pages, plus les siennes : le numéro jamais sans ses horaires (règle du
// 22/10/2026), le programme partenaire au conditionnel et sans montant.
{
  const ctx = await b.newContext({ viewport: { width: 794, height: 1123 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.setContent(await readFile('commercial/fiche-hotels.html', 'utf8'), { waitUntil: 'load' });
  const f = await p.evaluate(() => ({ corps: document.body.innerText, preuve: (document.querySelector('.preuve') || {}).innerText || '',
    pied: (document.querySelector('.pied') || {}).innerText || '', partenaire: (document.querySelector('.partenaire') || {}).innerText || '',
    liens: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')),
    qr: (q => q ? { href: q.closest('a[href]') ? q.closest('a[href]').getAttribute('href') : null, lien: q.getAttribute('data-lien') } : null)(document.getElementById('qr')) }));
  const pdf = (await p.pdf({ format: 'A4', printBackground: true })).toString('latin1');
  f.uri = [...new Set([...pdf.matchAll(/\/URI\s*\(([^)]*)\)/g)].map(m => m[1]))];
  await ctx.close();
  check('fiche : elle est lue (sinon les règles ne prouvent rien)', f.corps.length > 800, f.corps.length + ' caractères');
  for (const [cle, re] of Object.entries(REGLES.fr)) {
    const m = f.corps.match(re);
    check(`fiche : ${NOMS[cle]}`, !m, m ? f.corps.slice(Math.max(0, m.index - 40), m.index + m[0].length + 20).replace(/\s+/g, ' ') : '');
  }
  check('fiche : elle dit le réseau', /réseau/i.test(f.corps));
  const precis = /Roissy|CDG|Orly|Tremblay|Villepinte|Bourget|zone|\bun hôtel\b|\bun seul\b|premier/i;
  check('fiche : la preuve ne nomme ni un lieu précis ni un compte', f.preuve.trim().length > 15 && !precis.test(f.preuve), f.preuve);
  check('fiche : le numéro est accompagné des horaires', /\+33 7 59 31 24 33/.test(f.pied) && /7\s*h[–-]\u2060?\s*22\s*h/.test(f.pied), f.pied.replace(/\s+/g, ' '));
  const etats = (f.corps.match(/«\s*([^»]+?)\s*»/g) || []).map(x => x.replace(/[«»\s]+/g, ' ').trim().toLowerCase());
  check('fiche : les états cités sont ceux de l\'espace réception', etats.length > 0 && etats.every(e => ['réservation validée', 'effectuée'].includes(e)), etats.join(', '));
  // ELLE PARLE À TOUS LES PROFESSIONNELS, ET ELLE SE CLIQUE (23/10/2026) : envoyée
  // par e-mail, elle se lit sur un écran où l'on ne scanne pas un QR.
  check('fiche : elle ne parle pas du lien de paiement', !/par lien|lien de paiement/i.test(f.corps));
  check('fiche : elle s\'adresse aux agences et aux entreprises, pas qu\'aux hôtels', /agences?/i.test(f.corps) && /entreprises?/i.test(f.corps));
  check('fiche : téléphone, WhatsApp, e-mail et site sont de vrais liens',
    f.liens.includes('tel:+33759312433') && f.liens.includes('https://wa.me/33759312433') && f.liens.includes('mailto:contact@elatransfer.com')
    && f.liens.some(h => /^https:\/\/elatransfer\.com\/professionnels\//.test(h)), f.liens.join(' '));
  check('fiche : le QR est lui-même un lien, vers l\'adresse qu\'il encode', !!f.qr && f.qr.href === f.qr.lien, JSON.stringify(f.qr));
  check('fiche : le PDF garde les liens (un clic suffit à l\'écran)', f.uri.length >= 4, f.uri.join(' '));
  if (f.partenaire) {
    const gain = f.partenaire.match(/gagn|commission|cashback|\bprimes?\b|\d/i);
    check('fiche : le programme partenaire est au conditionnel, sans montant ni mot de gain',
      !gain && /\bpeut\b|\bpourra\b/.test(f.partenaire), gain ? gain[0] : f.partenaire);
  }
}

await b.close();
await new Promise(r => serveur.close(r));
console.log('\n=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
process.exit(ko.length ? 1 : 0);
