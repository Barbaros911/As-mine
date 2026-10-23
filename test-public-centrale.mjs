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
      comment: txt('#comment'), lead: txt('.hero .lead'), reference: txt('.hero .reference') };
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
    arrivee: /(?:sui[tv]\w*|coordonn\w*)[^.]{0,80}jusqu.(?:à|a) (?:votre |l.)arrivée/i,
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
  arrivee: 'aucun suivi promis « jusqu\'à l\'arrivée » (CGV art. 2 : jusqu\'à la prise en charge)', denigre: 'aucun mot qui dénigre un chauffeur' };

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
    check(`${nom} : la preuve d'activité existe`, t.reference.trim().length > 15, t.reference);
    const precis = /Roissy|CDG|Orly|Tremblay|Villepinte|Bourget|zone|\bun hôtel\b|\bun seul\b|premier|\bfirst\b|\ba hotel\b|\bone hotel\b|\barea\b/i;
    check(`${nom} : la preuve ne nomme ni un lieu précis ni un compte`, !precis.test(t.reference), t.reference);
  }
}

await b.close();
await new Promise(r => serveur.close(r));
console.log('\n=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
process.exit(ko.length ? 1 : 0);
