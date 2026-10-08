// ═══ LES TEXTES PUBLICS RACONTENT UNE SEULE HISTOIRE (8 octobre 2026) ═══
// Audit éditorial, validé par Barbaros. Ce qui est vérifié ici, ce sont les
// RÈGLES qu'il a tranchées, pas les phrases du jour — une reformulation
// légitime doit passer, un retour en arrière non :
//  · aucun mot abstrait (« solution », « mobilité », « plateforme »,
//    « conciergerie », « canal ») : un directeur d'hôtel doit lire ce qu'on
//    crée, pas une catégorie ;
//  · plus de « prix ferme » dans ce qui VEND : le mot reste au CONTRAT (le
//    bon d'une course confirmée et les CGV), qui disent quand le prix le
//    devient ;
//  · la confirmation part par le moyen que le CLIENT choisit : aucun texte
//    ne promet « WhatsApp ou SMS » (faux depuis le 4 octobre) ;
//  · rien sous le logo, et le grand titre et le sous-titre ne portent aucun
//    lieu : la marque ne s'enferme pas dans une ville ; les lieux restent
//    dans ce qui décrit le service d'aujourd'hui (cartes, pages CDG/Orly) ;
//  · une carte de service ne porte pas le nom d'une entrée du menu ;
//  · la pancarte dit les deux lieux où l'option existe (CGV art. 4) ;
//  · en anglais, aucun libellé de lecteur d'écran ne reste en français.
// La fiche Google (titre, description, aperçus, données structurées) n'est
// PAS éprouvée ici : Barbaros l'a laissée de côté.
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
await new Promise(r => serveur.listen(8139, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:8139/';

const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const b = await chromium.launch();

async function ouvrir(langue, w = 390, h = 844, chemin = '') {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: langue === 'en' ? 'en-US' : 'fr-FR' });
  await ctx.addInitScript(l => { try { localStorage.setItem('ela_langue', l); } catch (e) {} }, langue);
  const p = await ctx.newPage();
  p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.goto(SITE + chemin, { waitUntil: 'load' });
  await p.waitForTimeout(300);
  return p;
}

// Le texte que LIT le visiteur : en-tête, accueil (questions ouvertes), pied,
// et l'écran « Nous joindre » où mènent « Demander un devis » et le pied.
async function texteLu(p) {
  const accueil = await p.evaluate(() => {
    document.querySelectorAll('#ecran-accueil details').forEach(d => d.open = true);
    return [document.querySelector('header.entete'), document.querySelector('#ecran-accueil')]
      .map(e => e ? e.innerText : '').join('\n');
  });
  await p.click('.pied-lien'); await p.waitForTimeout(300);
  const contact = await p.evaluate(() => (document.querySelector('#ecran-contact') || {}).innerText || '');
  return accueil + '\n' + contact;
}

const T = {};
for (const langue of ['fr', 'en']) {
  const p = await ouvrir(langue);
  T[langue] = await p.evaluate(l => window.ELA_TEXTES[l], langue);
  // TOUT CE QUI SE MESURE SE MESURE AVANT d'ouvrir « Nous joindre » : une
  // fois l'accueil masqué, une ligne y mesure zéro (vu au premier jet).
  const tete = await p.evaluate(() => {
    const e = document.querySelector('header.entete');
    return { logo: e ? [...e.querySelectorAll('.logo')].map(x => x.innerText.trim()).join('') : '?',
      cle: 'entete_sous' in window.ELA_TEXTES.fr || 'entete_sous' in window.ELA_TEXTES.en };
  });
  const bandeau = await p.evaluate(() => ({ h1: document.querySelector('.hero h1').innerText, sous: document.querySelector('.hero-sous').innerText }));
  const resume = await p.evaluate(() => { const e = document.querySelector('.hero-prix');
    return { lignes: Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)), texte: e.innerText }; });
  const noms = await p.evaluate(() => {
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^for /, '').replace(/s$/, '').trim();
    return { menu: [...document.querySelectorAll('.entete-nav > a, .entete-nav > button, .entete-nav summary')].map(e => norm(e.textContent)),
      cartes: [...document.querySelectorAll('#services .service b, #services [data-t^="srv"]:not([data-t$="s"])')].map(e => norm(e.textContent)) };
  });
  const lu = await texteLu(p);
  check(`${langue.toUpperCase()} : l'accueil s'ouvre sans erreur`, p._errs.length === 0, p._errs.join(' | '));
  check(`${langue.toUpperCase()} : on lit bien l'accueil (sinon les contrôles ci-dessous ne prouvent rien)`,
    lu.length > 1500 && /Elatransfer/.test(lu), lu.length + ' caractères');

  // 1. Aucun mot abstrait.
  const abstraits = langue === 'fr'
    ? /\bsolutions?\b|mobilité|plateformes?\b|conciergerie|\bcanal\b|\bcanaux\b/i
    : /\bsolutions?\b|mobility|platforms?\b|concierge|\bchannels?\b/i;
  const trouve = lu.match(abstraits);
  check(`${langue.toUpperCase()} : aucun mot abstrait (solution, mobilité, plateforme, conciergerie, canal)`, !trouve, trouve ? trouve[0] : '');

  // 2. « Prix ferme » ne vend plus : ni à l'écran, ni dans aucune clé hors du contrat.
  // LE CONTRAT, C'EST TROIS ENDROITS : l'étiquette du bon d'une course
  // confirmée, la phrase qui dit QUAND la réservation devient ferme (juste
  // avant « Confirmer », CGV art. 3), et les documents légaux.
  const CONTRAT = ['prix_ferme', 'confirmer_note'];
  check(`${langue.toUpperCase()} : « prix ferme » n'apparaît plus sur l'accueil ni sur « Nous joindre »`,
    !(langue === 'fr' ? /\bferme\b/i : /\bfirm\b/i).test(lu), (lu.match(/.{0,30}\b(ferme|firm)\b.{0,30}/i) || [''])[0]);
  const horsContrat = Object.entries(T[langue])
    .filter(([k, v]) => typeof v === 'string' && !CONTRAT.includes(k) && !k.startsWith('legal_'))
    .filter(([, v]) => (langue === 'fr' ? /\bferme\b/i : /\bfirm\b/i).test(v)).map(([k]) => k);
  check(`${langue.toUpperCase()} : « ferme » ne reste qu'au contrat (étiquette du bon, documents légaux)`,
    horsContrat.length === 0, horsContrat.join(', '));
  check(`${langue.toUpperCase()} : le bon d'une course confirmée garde son étiquette de contrat`,
    (langue === 'fr' ? /ferme/i : /firm/i).test(T[langue].prix_ferme || ''), T[langue].prix_ferme);

  // 3. La confirmation part par le moyen choisi par le client.
  const canalFige = Object.entries(T[langue])
    .filter(([k, v]) => typeof v === 'string' && !k.startsWith('legal_') && /WhatsApp (ou|or) SMS/i.test(v)).map(([k]) => k);
  check(`${langue.toUpperCase()} : aucun texte ne promet « WhatsApp ou SMS » pour la confirmation`, canalFige.length === 0, canalFige.join(', '));

  // 4. Rien sous le logo, et pas de lieu dans le grand titre ni le sous-titre.
  check(`${langue.toUpperCase()} : rien n'est écrit sous le logo (le logo dit déjà la marque)`, tete.logo === '' && !tete.cle, JSON.stringify(tete));
  const lieux = /Paris|Île-de-France|Ile-de-France|France|Roissy|Orly/i;
  check(`${langue.toUpperCase()} : le grand titre et le sous-titre ne portent aucun lieu`,
    !lieux.test(bandeau.h1 + ' ' + bandeau.sous), bandeau.h1 + ' / ' + bandeau.sous);
  check(`${langue.toUpperCase()} : le grand titre dit le métier`,
    (langue === 'fr' ? /transfert|chauffeur/i : /transfer|chauffeur/i).test(bandeau.h1), bandeau.h1);
  if (langue === 'fr') check('FR : le sous-titre tient sous 125 caractères (règle du positionnement)', bandeau.sous.length <= 125, String(bandeau.sous.length));
  check(`${langue.toUpperCase()} : la ligne des services tient sur une ligne à 390 px`, resume.lignes === 1, JSON.stringify(resume));

  // 5. Une carte de service ne porte pas le nom d'une entrée du menu.
  const collision = noms.cartes.filter(c => c && noms.menu.includes(c));
  check(`${langue.toUpperCase()} : les cartes de service sont lues (sinon la règle suivante ne prouve rien)`, noms.cartes.length >= 4, noms.cartes.join(', '));
  check(`${langue.toUpperCase()} : aucune carte de service ne porte le nom d'une entrée du menu`, collision.length === 0, collision.join(', '));

  // 6. La pancarte : les deux lieux où l'option existe.
  check(`${langue.toUpperCase()} : la carte « accueil avec pancarte » dit aéroport ET gare`,
    (langue === 'fr' ? /aéroport/i.test(T.fr.plus3s) && /gare/i.test(T.fr.plus3s) : /airport/i.test(T.en.plus3s) && /station/i.test(T.en.plus3s)),
    T[langue].plus3s);

  // 7. En anglais, aucun libellé de lecteur d'écran ne reste en français.
  if (langue === 'en') {
    const restes = await p.evaluate(() => {
      const fr = window.ELA_TEXTES.fr, en = window.ELA_TEXTES.en;
      const francais = new Set(Object.keys(fr).filter(k => typeof fr[k] === 'string' && fr[k] !== en[k]).map(k => fr[k]));
      const zones = [document.querySelector('header.entete'), document.querySelector('#ecran-accueil')];
      return zones.flatMap(z => z ? [...z.querySelectorAll('[aria-label]')] : [])
        .filter(e => !e.closest('#hotelTete, .etapes-ligne'))
        .map(e => e.getAttribute('aria-label'))
        .filter(a => francais.has(a) || /^(Langue|Suggestions d)/.test(a));
    });
    check('EN : aucun libellé de lecteur d\'écran ne reste en français', restes.length === 0, restes.join(' | '));
  }
  await p.context().close();
}

// 8. Les pages CDG, Orly et « Chauffeur à Paris » suivent la même règle du prix.
for (const page of ['transfert-cdg-paris.html', 'transfert-orly-paris.html', 'chauffeur-prive-paris.html', 'professionnels/']) {
  const p = await ouvrir('fr', 1280, 900, page);
  const corps = await p.evaluate(() => document.body.innerText);
  check(`${page} : la page s'ouvre`, corps.length > 500, corps.length + ' caractères');
  check(`${page} : plus de « prix ferme » dans le texte de la page`, !/\bferme\b/i.test(corps), (corps.match(/.{0,30}\bferme\b.{0,30}/i) || [''])[0]);
  await p.context().close();
}

// 9. L'application installée ne se présente pas comme « chauffeur privé ».
const man = await (await fetch(SITE + 'manifest.webmanifest')).json();
check('le manifeste porte la marque, sans « chauffeur privé »',
  /elatransfer/i.test(man.name || '') && !/priv/i.test((man.name || '') + ' ' + (man.description || '')), man.name + ' / ' + man.description);

await b.close();
await new Promise(r => serveur.close(r));
console.log('\n=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
process.exit(ko.length ? 1 : 0);
