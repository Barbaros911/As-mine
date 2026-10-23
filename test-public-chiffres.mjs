// ═══ « ELATRANSFER EN CHIFFRES » — UNE STRUCTURE ÉTEINTE (23 octobre 2026) ═══
// Barbaros veut pouvoir montrer un jour des chiffres vérifiés, jamais un
// chiffre inventé. Ce qui est éprouvé, ce sont les règles, pas les chiffres :
//  · éteint (« afficher » faux, relevé trop vieux ou dans le futur, aucun
//    chiffre valable), le bloc est RETIRÉ de la page construite, et la
//    construction continue ;
//  · un chiffre sans source, sans libellé, nul, ou un pourcentage au-dessus
//    de 100 est écarté — les autres restent ;
//  · jamais d'arrondi vers le haut ;
//  · allumé, le bloc s'affiche en français ET en anglais (bouton FR / EN),
//    sans débordement, et jamais dans les données structurées ;
//  · le fichier source n'est pas publié.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { juger, appliquer } from './.github/scripts/chiffres.mjs';

const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const JOUR = '2026-10-23';
const BON = { cle: 'courses', valeur: 1234.9, fr: 'courses réalisées', en: 'rides completed', source: 'Registre de l\'admin, courses réalisées' };
const PCT = { cle: 'confirmation', valeur: 97.6, unite: '%', fr: 'des demandes confirmées', en: 'of requests confirmed', source: 'Registre : confirmées ÷ reçues' };
const allume = (chiffres, releve_le = '2026-10-20') => ({ afficher: true, releve_le, chiffres });

// 1. Le juge.
check('éteint tant que « afficher » n\'est pas à true', !juger({ ...allume([BON]), afficher: false }, JOUR).ok);
check('éteint sur un fichier absent ou illisible', !juger(null, JOUR).ok);
check('éteint sur une date illisible', !juger(allume([BON], '23/10/2026'), JOUR).ok);
check('éteint sur un relevé dans le futur', !juger(allume([BON], '2026-10-24'), JOUR).ok);
check('éteint sur un relevé de plus de 90 jours', !juger(allume([BON], '2026-07-24'), JOUR).ok, juger(allume([BON], '2026-07-24'), JOUR).raison);
check('allumé sur un relevé de 90 jours tout juste', juger(allume([BON], '2026-07-25'), JOUR).ok);
const sansSource = juger(allume([BON, { ...PCT, source: '' }]), JOUR);
check('un chiffre sans source est écarté, les autres restent', sansSource.ok && sansSource.chiffres.length === 1 && sansSource.ecartes.length === 1, JSON.stringify(sansSource.ecartes));
check('éteint quand aucun chiffre n\'a sa source', !juger(allume([{ ...BON, source: '' }]), JOUR).ok);
for (const [nom, c] of [['valeur nulle', { ...BON, valeur: 0 }], ['valeur absente', { ...BON, valeur: null }], ['texte à la place d\'un nombre', { ...BON, valeur: '1234' }],
  ['pourcentage au-dessus de 100', { ...PCT, valeur: 104 }], ['libellé anglais manquant', { ...BON, en: '' }], ['chiffre écrit dans le libellé', { ...BON, fr: '12 hôtels partenaires' }],
  ['unité inconnue', { ...BON, unite: 'km' }]])
  check(`écarté : ${nom}`, juger(allume([c, PCT]), JOUR).chiffres.length === 1);

// 2. La page construite, telle qu'elle part aujourd'hui.
execSync('sh construire.sh', { stdio: 'ignore' });
const donneesDuJour = JSON.parse(readFileSync('chiffres.json', 'utf8'));
const construite = readFileSync('site/professionnels/index.html', 'utf8');
const source = readFileSync('professionnels/index.html', 'utf8');
check('la page source porte UN repère vide, masqué', (source.match(/<section class="bloc chiffres"[^>]*\sdata-chiffres hidden>/g) || []).length === 1);
check('le fichier source n\'est pas publié', !existsSync('site/chiffres.json'));
if (!juger(donneesDuJour).ok)
  check('éteint aujourd\'hui : le bloc est retiré de la page construite', !/<section class="bloc chiffres"|id="chiffres"|data-chiffres/.test(construite));
else
  check('allumé aujourd\'hui : chaque chiffre posé a sa source', juger(donneesDuJour).chiffres.length >= 1 && /<ul class="chiffres-liste"><li>/.test(construite));

// 3. Allumé sur une copie du site : la page le montre, dans les deux langues.
const tmp = mkdtempSync(join(tmpdir(), 'ela-chiffres-'));
cpSync('professionnels', join(tmp, 'professionnels'), { recursive: true });
for (const f of ['brand-logo-negatif.webp', 'icone-ela-32.png', 'icone-ela-180.png', 'telephone.js', 'mesure.js']) if (existsSync('site/' + f)) cpSync('site/' + f, join(tmp, f));
const bilan = appliquer(tmp, allume([BON, PCT, { ...BON, cle: 'x', source: '' }]), JOUR);
check('allumé : le repère est rempli sur la page Professionnels', bilan.remplies.length === 1, JSON.stringify(bilan.remplies));
const rempli = readFileSync(join(tmp, 'professionnels/index.html'), 'utf8');
check('allumé : le bloc n\'est plus masqué', /<section class="bloc chiffres" id="chiffres"/.test(rempli) && !/data-chiffres hidden/.test(rempli));
const ld = (rempli.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) || []).join('');
check('jamais dans les données structurées', !/1\s?234|97|courses réalisées|rides completed/.test(ld));

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png' };
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(tmp, chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' }); res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8163, '127.0.0.1', r));
const b = await chromium.launch();
for (const w of [390, 1280]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, locale: 'fr-FR' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.goto('http://127.0.0.1:8163/professionnels/', { waitUntil: 'load' });
  const lire = () => p.evaluate(() => { const s = document.getElementById('chiffres'); return s ? { texte: s.innerText, vu: s.offsetHeight > 0,
    deborde: document.documentElement.scrollWidth > innerWidth } : null; });
  const fr = await lire();
  check(`${w} px FR : le bloc s'affiche, nombres et libellés en français`, fr && fr.vu && /1 234/.test(fr.texte) && /97 %/.test(fr.texte)
    && /courses réalisées/.test(fr.texte) && /Relevé du 20 octobre 2026/.test(fr.texte), JSON.stringify(fr));
  check(`${w} px : jamais d'arrondi vers le haut (1 234,9 → 1 234 ; 97,6 % → 97 %)`, fr && !/1 235|98/.test(fr.texte));
  check(`${w} px : le chiffre sans source n'est pas affiché`, fr && (fr.texte.match(/courses réalisées/g) || []).length === 1);
  check(`${w} px : aucun débordement horizontal`, fr && !fr.deborde);
  await p.click('#langue'); await p.waitForTimeout(100);
  const en = await lire();
  check(`${w} px EN : le bouton passe le bloc en anglais`, en && /Elatransfer in numbers/.test(en.texte) && /1,234/.test(en.texte) && /97%/.test(en.texte)
    && /rides completed/.test(en.texte) && /As of 20 October 2026/.test(en.texte) && !/réalisées|Relevé/.test(en.texte), JSON.stringify(en));
  await p.click('#langue'); await p.waitForTimeout(100);
  const retour = await lire();
  check(`${w} px : et revient en français`, retour && /courses réalisées/.test(retour.texte) && /1 234/.test(retour.texte));
  check(`${w} px : aucune erreur JavaScript`, errs.length === 0, errs.join(' | '));
  await ctx.close();
}
await b.close();
await new Promise(r => serveur.close(r));
rmSync(tmp, { recursive: true, force: true });

console.log('\n=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
process.exit(ko.length ? 1 : 0);
