// ═══ LES PAGES ANGLAISES D'ACQUISITION (14 octobre 2026, SEO international) ═══
// Diagnostic : SEO-INTERNATIONAL.md · mémoire : memoire/seo-international.md.
// On éprouve le SITE CONSTRUIT, servi comme Cloudflare le sert (un dossier
// rend son index.html, « /x » rend « x.html » — mesuré avec wrangler dev),
// et on éprouve des RÈGLES, pas des phrases :
//  · chaque page du plan du site sous /en/ : en anglais, indexable, une
//    canonique à elle, un titre, une description et un H1 uniques ;
//  · hreflang seulement entre vrais équivalents, et toujours réciproque ;
//  · données structurées : la même entreprise (#organisation), jamais
//    « VTC », ni prix ni avis ;
//  · les blocs communs disent la même chose partout, et les réponses aux
//    questions sont celles de l'accueil, mot pour mot ;
//  · aucun mot que le site s'interdit, aucun paiement dans la voiture ;
//  · aucun lien cassé, aucun lien vers un espace privé ;
//  · Book / Call / WhatsApp au premier écran à 390 × 844, jamais recouverts ;
//  · aucune page ne déborde, de 320 à 1440 px, et aucune erreur JavaScript ;
//  · « Book » ouvre LE moteur, en anglais, prérempli, et la page d'origine
//    part avec la demande ; « vers= » ouvre la liste de l'autre bout sans
//    jamais choisir à la place du client ;
//  · la mesure : les bons gestes, avec la bonne page, jamais chez un hôtel,
//    jamais pour un robot — et mesure.js parle comme le moteur.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

execSync('sh construire.sh', { stdio: 'ignore' });
const TYPES = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp',
  '.jpg':'image/jpeg','.txt':'text/plain','.xml':'application/xml'};
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch {
      try { await stat(f + '.html'); f = f + '.html'; }
      catch { res.writeHead(404).end('non'); return; }
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8141, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:8141';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const b = await chromium.launch();

/* ═══ 0. LES SOURCES ═══ */
const index = readFileSync('index.html', 'utf8');
const mesureJs = readFileSync('mesure.js', 'utf8');
const migration = readFileSync('supabase/migrations/20261014000000_mesure_acquisition.sql', 'utf8');
const sitemap = await (await fetch(SITE + '/sitemap.xml')).text();
const locs = [...sitemap.matchAll(/<loc>https:\/\/elatransfer\.com\/([^<]*)<\/loc>/g)].map(m => m[1]);
const pagesEn = locs.filter(l => l.startsWith('en/'));
check('le plan du site donne des pages anglaises (sinon rien ne serait éprouvé)', pagesEn.length >= 3, pagesEn.join(', '));
check('aucune adresse du plan du site ne finit en .html (Cloudflare la redirige)', !locs.some(l => l.endsWith('.html')), locs.join(', '));
const ORIGINES = Object.keys(JSON.parse('{' + (/var ORIGINES = \{([\s\S]*?)\};/.exec(index) || [, ''])[1].replace(/,\s*$/, '') + '}'));
check('le moteur déclare ses pages d\'origine (liste fermée)', ORIGINES.length >= 5, ORIGINES.join(', '));

/* ═══ 1. MESURE.JS PARLE COMME LE MOTEUR ═══ */
{
  const url = s => (new RegExp('var SUPABASE_URL = "([^"]+)"').exec(s) || [, ''])[1];
  const cle = s => (new RegExp('var SUPABASE_CLE = "([^"]+)"').exec(s) || [, ''])[1];
  check('mesure.js vise le même serveur que le moteur', url(mesureJs) && url(mesureJs) === url(index), url(mesureJs));
  check('mesure.js présente la même clé publique que le moteur', cle(mesureJs) && cle(mesureJs) === cle(index));
  check('les deux appellent la même porte (rpc/ela_mesurer)', mesureJs.includes('/rest/v1/rpc/ela_mesurer') && index.includes('/rest/v1/rpc/ela_mesurer'));
  const sqlEvenements = new Set([...((/p_evenement not in \(([\s\S]*?)\)/.exec(migration) || [, ''])[1]).matchAll(/'([a-z_]+)'/g)].map(m => m[1]));
  const evPages = [...((/var EVENEMENTS = \[([^\]]*)\]/.exec(mesureJs) || [, ''])[1]).matchAll(/"([a-z_]+)"/g)].map(m => m[1]);
  const evMoteur = [...index.matchAll(/mesurerVisite\("([a-z_]+)"\)/g)].map(m => m[1]);
  const inconnus = [...evPages, ...evMoteur].filter(e => !sqlEvenements.has(e));
  check('chaque geste envoyé est accepté par le serveur', evPages.length >= 4 && evMoteur.length >= 3 && inconnus.length === 0,
    inconnus.join(', ') || [...evPages, ...evMoteur].join(', '));
  const demandes = ['page_vue', 'clic_reserver', 'clic_appel', 'clic_whatsapp', 'moteur_ouvert', 'formulaire_commence', 'demande_envoyee'];
  const manquants = demandes.filter(e => ![...evPages, ...evMoteur].includes(e));
  check('les sept gestes demandés sont tous mesurés', manquants.length === 0, manquants.join(', '));
}

/* ═══ 2. CHAQUE PAGE ANGLAISE, LUE COMME GOOGLE LA LIT ═══ */
const MOTS_INTERDITS = /\bVTC\b|\btaxis?\b|\bfirm\b|real[- ]time|\bVIP\b|\bluxury\b|\bsolutions?\b|\bplatforms?\b|\bmobility\b|\bconcierge|\bchannels?\b|\bfixed price\b/i;
const titres = new Map(), descriptions = new Map(), h1s = new Map();
const pe = await b.newPage();
await pe.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await pe.goto(SITE + '/', { waitUntil: 'domcontentloaded' });
const EN = await pe.evaluate(() => window.ELA_TEXTES.en);
const liensAccueil = await pe.$$eval('a[href]', l => l.map(a => a.getAttribute('href')));
await pe.goto(SITE + '/en/', { waitUntil: 'domcontentloaded' });
const liensHub = await pe.$$eval('a[href]', l => l.map(a => a.getAttribute('href')));
const blocsCommuns = [];
for (const chemin of pagesEn) {
  const r = await fetch(SITE + '/' + chemin);
  check(`${chemin} : répond 200`, r.status === 200, String(r.status));
  /* Une page absente (oubliée par construire.sh) est nommée ici, puis on
     passe : la lire plus loin ne ferait que planter sans rien dire de plus. */
  if (r.status !== 200) continue;
  const html = await r.text();
  await pe.goto(SITE + '/' + chemin, { waitUntil: 'domcontentloaded' });
  const lu = await pe.evaluate(() => {
    const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
    return {
      lang: document.documentElement.lang, page: document.documentElement.getAttribute('data-ela-page'),
      titre: document.title, desc: (q('meta[name=description]') || {}).content || '',
      robots: (q('meta[name=robots]') || {}).content || '', canonique: (q('link[rel=canonical]') || {}).href || '',
      h1: qa('h1').map(e => e.textContent.trim()),
      hreflang: qa('link[rel=alternate][hreflang]').map(l => [l.hreflang, l.href]),
      ld: qa('script[type="application/ld+json"]').map(s => s.textContent),
      texte: document.body.innerText,
      liens: qa('a[href]').map(a => a.getAttribute('href')),
      reserver: qa('a[data-mesure="reserver"]').map(a => a.getAttribute('href')),
      wa: qa('a[href*="wa.me"]').map(a => a.getAttribute('href')),
      tel: qa('a[href^="tel:"]').map(a => a.getAttribute('href')),
      faq: qa('details p').map(p => p.textContent.trim()),
      inclus: qa('.inclus li').map(li => li.innerText.replace(/\s+/g, ' ').trim()),
      etapes: (q('#how') || {}).innerText || '', savoir: (q('#t-savoir') || {}).parentElement?.innerText || '',
      imgs: qa('img').map(i => i.getAttribute('alt')),
    };
  });
  const url = 'https://elatransfer.com/' + chemin;
  check(`${chemin} : en anglais (<html lang="en">)`, lu.lang === 'en', lu.lang);
  check(`${chemin} : déclare une page d'origine connue du moteur`, ORIGINES.includes(lu.page), lu.page);
  check(`${chemin} : indexable`, /index/.test(lu.robots) && !/noindex/.test(lu.robots), lu.robots);
  check(`${chemin} : sa canonique est sa propre adresse, celle du plan du site`, lu.canonique === url, lu.canonique);
  check(`${chemin} : un seul H1`, lu.h1.length === 1, lu.h1.join(' | '));
  check(`${chemin} : titre de 30 à 70 caractères`, lu.titre.length >= 30 && lu.titre.length <= 70, lu.titre.length + ' : ' + lu.titre);
  check(`${chemin} : description de 110 à 165 caractères`, lu.desc.length >= 110 && lu.desc.length <= 165, String(lu.desc.length));
  check(`${chemin} : la marque est dans le titre`, /Elatransfer/.test(lu.titre), lu.titre);
  for (const [m, v] of [[titres, lu.titre], [descriptions, lu.desc], [h1s, lu.h1[0]]]) {
    if (m.has(v)) ko.push(`${chemin} : « ${v.slice(0, 40)}… » est déjà celui de ${m.get(v)}`); else m.set(v, chemin);
  }
  const mots = lu.texte.split(/\s+/).filter(Boolean).length;
  check(`${chemin} : plus qu'une coquille (au moins 400 mots)`, mots >= 400, mots + ' mots');
  /* L'accueil relie « /en/ » ; « /en/ » et chaque page anglaise relient
     toutes les autres (le pied de l'accueil tient sur une ligne). */
  if (chemin === 'en/') check(`${chemin} : liée depuis l'accueil`, liensAccueil.includes('/en/'));
  else check(`${chemin} : liée depuis /en/`, liensHub.includes('/' + chemin));
  check(`${chemin} : toute image a un texte de remplacement`, lu.imgs.every(a => a && a.length > 1), lu.imgs.join(','));

  // hreflang : seulement entre vrais équivalents, et réciproque.
  if (lu.hreflang.length) {
    const h = Object.fromEntries(lu.hreflang);
    check(`${chemin} : hreflang « en » vise la page elle-même`, h.en === url, h.en);
    check(`${chemin} : hreflang « x-default » présent`, !!h['x-default'], JSON.stringify(h));
    const fr = h.fr ? h.fr.replace('https://elatransfer.com', SITE) : '';
    const rf = fr ? await fetch(fr) : { status: 0, text: async () => '' };
    const frHtml = await rf.text();
    check(`${chemin} : l'équivalent français répond 200 SANS redirection`, rf.status === 200 && !h.fr.endsWith('.html'), h.fr + ' → ' + rf.status);
    check(`${chemin} : l'équivalent français la déclare en retour`, frHtml.includes(`hreflang="en" href="${url}"`), h.fr);
    check(`${chemin} : l'équivalent français a sa canonique sur l'adresse servie`,
      frHtml.includes(`<link rel="canonical" href="${h.fr}">`), h.fr);
  }

  // Données structurées.
  let service = {}; try { service = JSON.parse(lu.ld[0]); } catch {}
  check(`${chemin} : les données désignent l'entreprise #organisation`, service.provider && service.provider['@id'] === 'https://elatransfer.com/#organisation');
  check(`${chemin} : données structurées sans « VTC », sans prix ni avis`,
    !/VTC|offers|aggregateRating|review|price/i.test(lu.ld.join(' ')), '');

  // Les mots que le site s'interdit, et l'ancienne règle de paiement.
  const interdit = (lu.titre + ' ' + lu.desc + ' ' + lu.texte).match(MOTS_INTERDITS);
  check(`${chemin} : aucun mot que le site s'interdit`, !interdit, interdit ? interdit[0] : '');
  check(`${chemin} : jamais un paiement dans la voiture ni « annulation gratuite » sans condition`,
    !/pa(y|id|yment) (the driver )?on board|cash|free cancellation/i.test(lu.texte));
  check(`${chemin} : la confirmation n'est jamais promise « WhatsApp or SMS »`, !/WhatsApp or SMS/i.test(lu.texte));

  // Les faits communs, partout les mêmes, et ceux de l'accueil.
  const attendus = [[EN.eng1, EN.eng1s], [EN.eng2, EN.eng2s], [EN.eng3, EN.eng3s], [EN.eng4, EN.eng4s]].map(x => x.join(' '));
  check(`${chemin} : « Included » reprend l'accueil, mot pour mot`, JSON.stringify(lu.inclus) === JSON.stringify(attendus), lu.inclus.join(' | '));
  const reponsesEn = Object.keys(EN).filter(k => /^faq\d+r$/.test(k)).map(k => EN[k]);
  check(`${chemin} : ses réponses sont celles de l'accueil anglais, mot pour mot`,
    lu.faq.length >= 3 && lu.faq.every(r => reponsesEn.includes(r)), lu.faq.filter(r => !reponsesEn.includes(r)).join(' | '));
  check(`${chemin} : les heures d'assistance sont celles de l'accueil (5 am–10 pm)`, /5 am–10 pm/.test(EN.hero_notes) && /5 am–10 pm/.test(lu.texte));
  blocsCommuns.push(lu.etapes + '\n' + lu.savoir);

  // Les gestes.
  check(`${chemin} : « Book » mène au moteur, en anglais, avec la page d'origine`,
    lu.reserver.length >= 2 && lu.reserver.every(h => h.startsWith(`/?lang=en&src=${lu.page}`)), lu.reserver.join(' '));
  check(`${chemin} : l'appel vise le numéro d'Elatransfer`, lu.tel.length >= 2 && lu.tel.every(t => t === 'tel:+33759312433'), lu.tel.join(' '));
  const textes = lu.wa.map(w => decodeURIComponent((/[?&]text=([^&]*)/.exec(w) || [, ''])[1]));
  check(`${chemin} : WhatsApp vise le numéro d'Elatransfer, avec un message`, lu.wa.length >= 2
    && lu.wa.every(w => w.startsWith('https://wa.me/33759312433?text=')) && textes.every(t => t.length > 20), textes[0]);
  lu.waTexte = textes[0];
  if (blocsCommuns.waVus?.has(textes[0])) ko.push(`${chemin} : même message WhatsApp qu'une autre page`);
  (blocsCommuns.waVus ||= new Set()).add(textes[0]);

  // Les liens : aucun cassé, aucun vers un espace privé.
  const prives = lu.liens.filter(h => /ela-admin|exploitant|admin|application\.html|reception|easyhotel|[?&](h|reception|ok)=|\/demo\//i.test(h));
  check(`${chemin} : aucun lien vers un espace privé`, prives.length === 0, prives.join(', '));
  for (const h of new Set(lu.liens.filter(h => h.startsWith('/') && !h.startsWith('//')))) {
    const cible = h.split('#')[0];
    const rr = await fetch(SITE + cible);
    if (rr.status !== 200) ko.push(`${chemin} : lien cassé ${h} (${rr.status})`);
  }
  check(`${chemin} : aucun lien vers une page en .html (Cloudflare la redirige)`,
    !lu.liens.some(h => /^\/[^?#]*\.html/.test(h)), lu.liens.filter(h => /\.html/.test(h)).join(', '));
  check(`${chemin} : la mesure est chargée`, html.includes('<script src="/mesure.js" defer></script>'));
}
check('les blocs « How booking works » et « Good to know » sont identiques sur toutes les pages',
  blocsCommuns.length >= 3 && blocsCommuns.every(t => t === blocsCommuns[0] && t.length > 400), String(blocsCommuns.length));
await pe.close();

/* ═══ 3. ROBOTS.TXT NE BLOQUE PAS /en/, ET BLOQUE LE MOTEUR EN ANGLAIS ═══ */
{
  const robots = await (await fetch(SITE + '/robots.txt')).text();
  const regles = [...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map(m => new RegExp('^' + m[1].replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')));
  const bloque = u => regles.some(r => r.test(u));
  const bloquees = pagesEn.map(c => '/' + c).filter(bloque);
  check('robots.txt laisse passer toutes les pages anglaises', bloquees.length === 0, bloquees.join(', '));
  check('robots.txt écarte le moteur ouvert en anglais (« /?lang=en&… »)', bloque('/?lang=en&src=en-cdg') && bloque('/?aeroport=cdg&lang=en'));
  check('robots.txt laisse passer l\'accueil et les pages françaises', !bloque('/') && !bloque('/transfert-cdg-paris'));
}

/* ═══ 4. LE RENDU : AUCUN DÉBORDEMENT, AUCUNE ERREUR, LES GESTES À PORTÉE ═══ */
for (const [w, h] of [[320, 640], [375, 812], [390, 844], [430, 932], [768, 1024], [1366, 768], [1440, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'en-GB', userAgent: UA_IPHONE });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  for (const chemin of pagesEn) {
    const rep = await p.goto(SITE + '/' + chemin, { waitUntil: 'load' });
    if (!rep || rep.status() !== 200) { ko.push(`${w}px ${chemin} : la page ne s'ouvre pas (${rep && rep.status()})`); continue; }
    const deborde = await p.evaluate(() => {
      const L = document.documentElement.clientWidth;
      return [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect();
        return r.width && (r.right > L + 1 || r.left < -1); }).slice(0, 3).map(e => e.tagName + '.' + e.className + ' [' + Math.round(e.getBoundingClientRect().left) + '→' + Math.round(e.getBoundingClientRect().right) + ']');
    });
    check(`${w}px ${chemin} : rien ne déborde`, deborde.length === 0, deborde.join(', '));
    if (w === 390 || w === 320 || w === 1366) {
      /* Au premier écran, sans défiler : le titre, le premier « Book », Call
         et WhatsApp. On MESURE ce que reçoit le doigt : un bouton visible
         sous la barre fixe ne reçoit rien. */
      /* Chaque geste doit être atteignable au premier écran par AU MOINS un
         bouton : celui du bandeau, ou celui de la barre du pouce (sur un
         petit téléphone, la barre porte Book · Call · WhatsApp quand le
         bandeau descend sous elle). */
      const premier = await p.evaluate((H) => {
        const sousLeDoigt = e => { const r = e.getBoundingClientRect();
          if (!r.height || r.top < 0 || r.bottom > H || r.height < 44) return false;
          const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !!t && (t === e || e.contains(t)); };
        const un = sel => [...document.querySelectorAll(sel)].some(sousLeDoigt);
        const h1 = document.querySelector('.hero h1').getBoundingClientRect();
        return { h1: h1.bottom <= H ? 'ok' : 'sous le pli',
          book: un('.hero .sens .bouton, .barre a[data-mesure="reserver"]') ? 'ok' : 'introuvable',
          call: un('.hero .contact a[href^="tel:"], .barre a[href^="tel:"]') ? 'ok' : 'introuvable',
          wa: un('.hero .contact a[href*="wa.me"], .barre a[href*="wa.me"]') ? 'ok' : 'introuvable' };
      }, h);
      check(`${w}×${h} ${chemin} : titre, Book, Call et WhatsApp au premier écran, sous le doigt`,
        Object.values(premier).every(v => v === 'ok'), JSON.stringify(premier));
      if (w >= 390) {
        const bandeau = await p.evaluate((H) => [...document.querySelectorAll('.hero .sens .bouton, .hero .contact .bouton')]
          .filter(e => e.getBoundingClientRect().bottom > H - (document.querySelector('.barre').offsetHeight || 0)).map(e => e.textContent.trim()), h);
        check(`${w}×${h} ${chemin} : tous les boutons du bandeau tiennent au-dessus de la barre`, bandeau.length === 0, bandeau.join(', '));
      }
    }
    if (w <= 430) {
      // La barre du pouce existe, et ne recouvre jamais un bouton : page déroulée jusqu'en bas.
      const barre = await p.evaluate(() => { const e = document.querySelector('.barre'); return e && getComputedStyle(e).display !== 'none'; });
      check(`${w}px ${chemin} : la barre Book · Call · WhatsApp est là`, barre);
      /* « instant » : la page défile en douceur (scroll-behavior), et une
         mesure prise pendant l'animation lirait le haut de la page. */
      await p.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await p.waitForTimeout(100);
      const caches = await p.evaluate(() => {
        const H = window.innerHeight;
        return [...document.querySelectorAll('main a.bouton, footer a')].filter(e => {
          const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > H || !r.height) return false;
          const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return t && !(t === e || e.contains(t));
        }).map(e => e.textContent.trim().slice(0, 20));
      });
      check(`${w}px ${chemin} : en bas de page, aucun bouton n'est sous la barre`, caches.length === 0, caches.join(', '));
    } else {
      const barre = await p.evaluate(() => getComputedStyle(document.querySelector('.barre')).display);
      check(`${w}px ${chemin} : pas de barre du pouce sur un grand écran`, barre === 'none', barre);
    }
  }
  check(`${w}px : aucune erreur JavaScript sur les pages anglaises`, erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();
}

/* ═══ 5. « BOOK » OUVRE LE MOTEUR, EN ANGLAIS, ET L'ORIGINE PART AVEC LA DEMANDE ═══ */
const ORLY_TERMINAL = 'Orly 4';
async function moteur(adresse, { ua = UA_IPHONE, lieux = {} } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: 'en-US',
    timezoneId: 'Europe/Paris', userAgent: ua });
  const depots = [], mesures = [];
  await ctx.addInitScript(() => { window.open = () => null; });
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url(), d = decodeURIComponent(u).toLowerCase();
    if (u.startsWith(SITE)) return route.continue();
    if (d.includes('photon.komoot.io')) {
      const q = (d.match(/[?&]q=([^&]*)/) || [, ''])[1];
      const k = Object.keys(lieux).find(k => q.includes(k));
      return route.fulfill(J({ features: k ? [lieux[k]] : [] }));
    }
    if (d.includes('api-adresse.data.gouv.fr')) return route.fulfill(J({ features: [] }));
    if (d.includes('router.project-osrm.org')) return route.fulfill(J({ routes: [{ distance: 48000, duration: 3000 }] }));
    if (u.includes('/rpc/ela_mesurer')) { try { mesures.push(JSON.parse(req.postData())); } catch {} return route.fulfill({ status: 204, body: '' }); }
    if (u.includes('supabase.co') && req.method() === 'POST') {
      let c = {}; try { c = JSON.parse(req.postData() || '{}'); } catch {}
      if (c.bon) { depots.push(c.bon); return route.fulfill({ status: 201, contentType: 'application/json', body: '{"ok":true}' }); }
    }
    if (u.includes('supabase.co')) return route.fulfill(J([]));
    return route.abort();
  });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  await p.goto(SITE + adresse, { waitUntil: 'load' });
  await p.waitForTimeout(700);
  return { ctx, p, depots, mesures, erreurs };
}
const DISNEY = { geometry: { coordinates: [2.7836, 48.8722] }, properties: { name: 'Disneyland Paris', city: 'Chessy',
  postcode: '77700', country: 'France', countrycode: 'FR', osm_key: 'tourism', osm_value: 'theme_park', type: 'house' } };

// 5a. CDG → Orly : anglais, CDG prérempli, et la liste d'Orly s'ouvre après le terminal — sans rien choisir.
{
  const { ctx, p, depots, mesures, erreurs } = await moteur('/?lang=en&src=en-cdg-orly&aeroport=cdg&sens=depart&vers=orly');
  const etat = await p.evaluate(() => ({ lang: document.documentElement.lang, espace: document.documentElement.getAttribute('data-ela-space'),
    bouton: document.querySelector('[data-t="btn_prix"]')?.textContent.trim(), attendu: window.ELA_TEXTES.en.btn_prix,
    depart: document.getElementById('depart').value, arrivee: document.getElementById('arrivee').value,
    liste: !document.getElementById('departList').hidden, adresse: location.search,
    memorise: localStorage.getItem('ela_langue') }));
  check('moteur : s\'ouvre en anglais quand la page anglaise le demande', etat.lang === 'en' && etat.bouton === etat.attendu, JSON.stringify(etat));
  check('moteur : c\'est le site public, pas une page d\'hôtel', etat.espace === 'public', etat.espace);
  check('moteur : « CDG » posé au départ et la liste des terminaux ouverte', etat.depart === 'CDG' && etat.liste, JSON.stringify(etat));
  check('moteur : l\'autre bout est écrit d\'avance (« Orly »)', etat.arrivee === 'Orly', etat.arrivee);
  check('moteur : l\'adresse est nettoyée après lecture', etat.adresse === '', etat.adresse);
  check('moteur : la langue demandée est mémorisée, comme un appui sur EN', etat.memorise === 'en', String(etat.memorise));
  await p.locator('#departList [role=option]', { hasText: 'Terminal 2E' }).first().click({ timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(500);
  const suite = await p.evaluate(() => ({ ouverte: !document.getElementById('arriveeList').hidden,
    options: [...document.querySelectorAll('#arriveeList [role=option]')].map(o => o.textContent.trim()).slice(0, 5),
    choisi: document.getElementById('arrivee').value }));
  check('vers= : la liste d\'Orly s\'ouvre une fois le terminal CDG choisi', suite.ouverte && suite.options.some(o => /Orly 4/.test(o)), JSON.stringify(suite));
  /* Le client ferme la liste sans choisir : « Voir mon prix » ne doit pas
     ouvrir de prix — l'autre bout n'est qu'un texte tant qu'il n'a pas
     choisi une ligne. */
  await p.locator('#arrivee').press('Escape'); await p.waitForTimeout(200);
  await p.locator('#btnVoirPrix').click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(500);
  const avant = await p.evaluate(() => document.getElementById('ecran-vehicules').classList.contains('actif'));
  check('vers= : rien n\'est choisi à la place du client (pas de prix sans son choix)', !avant);
  await p.locator('#arriveeList [role=option]', { hasText: ORLY_TERMINAL }).first().click({ timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(300);
  await p.fill('#date', new Date(Date.now() + 2 * 864e5).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10));
  await p.fill('#heure', '10:00');
  await p.locator('#btnVoirPrix').click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(1200);
  await p.locator('.veh-carte').first().click().catch(() => {});
  await p.locator('#btnContinuer').click().catch(() => {}); await p.waitForTimeout(300);
  await p.fill('#clientNom', 'Jane Doe').catch(() => {});
  await p.fill('#clientTel', '+44 7700 900123').catch(() => {});
  await p.evaluate(() => { const b = [...document.querySelectorAll('#blocContact [data-contact]')].find(e => e.offsetParent); if (b) b.click(); });
  await p.locator('#btnConfirmer').click().catch(() => {});
  await p.waitForTimeout(1500);
  const bon = depots[0] || {};
  check('la demande part, avec la page d\'origine dans « provenance »', bon.provenance === 'Site anglais · CDG ↔ Orly', String(bon.provenance));
  check('… en anglais, et sans clé de partenaire', bon.langue === 'en' && !bon.provenanceCle, bon.langue + ' / ' + bon.provenanceCle);
  check('… vers Orly 4, choisi par le client', /Orly 4/.test(bon.course?.arrivee || ''), bon.course?.arrivee);
  const gestes = mesures.map(m => m.p_page + ':' + m.p_evenement);
  check('mesure : moteur ouvert, formulaire commencé et demande envoyée, pour cette page',
    ['moteur_ouvert', 'formulaire_commence', 'demande_envoyee'].every(e => gestes.includes('en-cdg-orly:' + e)), gestes.join(', '));
  check('mesure : « formulaire commencé » n\'est compté qu\'une fois', gestes.filter(g => g.endsWith('formulaire_commence')).length === 1, gestes.join(', '));
  check('moteur : aucune erreur JavaScript sur le parcours', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();
}

// 5b. Disneyland : la liste du parc s'ouvre après le terminal d'Orly.
{
  const { ctx, p, erreurs } = await moteur('/?lang=en&src=en-disneyland&aeroport=orly&sens=depart&vers=disneyland', { lieux: { disneyland: DISNEY } });
  check('Disneyland : « Disneyland Paris » est écrit d\'avance à l\'arrivée', await p.inputValue('#arrivee') === 'Disneyland Paris');
  await p.locator('#departList [role=option]', { hasText: 'Orly 1' }).first().click({ timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(900);
  const options = await p.$$eval('#arriveeList [role=option]', l => l.map(o => o.textContent.trim()));
  check('Disneyland : la liste du parc s\'ouvre une fois le terminal choisi', options.some(o => /Disneyland/.test(o)), options.join(' | '));
  check('Disneyland : aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();
}

// 5c. Sens retour (Disneyland → CDG) : la liste de l'aéroport s'ouvre, le parc attend au départ.
{
  const { ctx, p } = await moteur('/?lang=en&src=en-disneyland&aeroport=cdg&sens=arrivee&vers=disneyland', { lieux: { disneyland: DISNEY } });
  const v = await p.evaluate(() => ({ d: document.getElementById('depart').value, a: document.getElementById('arrivee').value,
    liste: !document.getElementById('arriveeList').hidden }));
  check('retour : « Disneyland Paris » au départ, CDG à l\'arrivée, liste des terminaux ouverte', v.d === 'Disneyland Paris' && v.a === 'CDG' && v.liste, JSON.stringify(v));
  await ctx.close();
}

// 5d. Une origine inconnue n'entre jamais dans une course ; une adresse sans « lang » reste en français.
{
  const { ctx, p, mesures } = await moteur('/?src=hotel-pirate&aeroport=cdg&sens=depart');
  const v = await p.evaluate(() => ({ lang: document.documentElement.lang, prov: (function(){ try { return sessionStorage.getItem('ela_provenance'); } catch (e) { return 'x'; } })() }));
  check('origine inconnue : ignorée (rien n\'est stocké, la mesure compte « accueil »)', v.prov === null && mesures.some(m => m.p_page === 'accueil' && m.p_evenement === 'moteur_ouvert'),
    JSON.stringify(v) + ' ' + JSON.stringify(mesures));
  check('sans « lang », le site public reste en français', v.lang === 'fr', v.lang);
  await ctx.close();
}

// 5e. Un robot ne compte pas ; une page d'hôtel ne compte jamais.
{
  const robot = await moteur('/?lang=en&src=en-cdg&aeroport=cdg&sens=depart', { ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' });
  check('mesure : un robot n\'est pas compté (moteur)', robot.mesures.length === 0, JSON.stringify(robot.mesures));
  await robot.ctx.close();
  const hotel = await moteur('/application.html?h=easyhotel-aeroville');
  await hotel.p.click('body').catch(() => {});
  check('mesure : une page d\'hôtel n\'est jamais comptée', hotel.mesures.length === 0, JSON.stringify(hotel.mesures));
  await hotel.ctx.close();
}

// 5f. Un lien légal d'une page anglaise ouvre le document EN ANGLAIS, et ne compte pas comme un moteur ouvert.
{
  const { ctx, p, mesures } = await moteur('/?lang=en&doc=cgv');
  const v = await p.evaluate(() => ({ actif: document.getElementById('ecran-legal')?.classList.contains('actif'),
    titre: document.getElementById('legalTitre')?.textContent, attendu: window.ELA_TEXTES.en.legal_cgv,
    debut: (document.getElementById('legalCorps')?.textContent || '').slice(0, 40), adresse: location.search }));
  check('lien légal : les conditions s\'ouvrent, en anglais', v.actif && v.titre === v.attendu && /^TERMS/.test(v.debut), JSON.stringify(v));
  check('lien légal : « doc » reste lisible, « lang » est effacé', v.adresse === '?doc=cgv', v.adresse);
  check('lien légal : pas compté comme un moteur ouvert', !mesures.some(m => m.p_evenement === 'moteur_ouvert'), JSON.stringify(mesures));
  await ctx.close();
}

/* ═══ 6. LA MESURE DES PAGES D'ACQUISITION ═══ */
{
  const { ctx, p, mesures, erreurs } = await moteur('/en/cdg-airport-transfer-paris/');
  await p.evaluate(() => document.addEventListener('click', e => e.preventDefault()));
  await p.locator('.hero a[href^="tel:"]').click({ timeout: 5000 }).catch(() => {});
  await p.locator('.hero a[href*="wa.me"]').click({ timeout: 5000 }).catch(() => {});
  await p.locator('.hero .sens a').first().click({ timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(400);
  const g = mesures.map(m => m.p_page + ':' + m.p_evenement);
  for (const e of ['page_vue', 'clic_appel', 'clic_whatsapp', 'clic_reserver'])
    check(`mesure : « ${e} » compté pour en-cdg`, g.includes('en-cdg:' + e), g.join(', '));
  check('mesure : un seul affichage par chargement', g.filter(x => x === 'en-cdg:page_vue').length === 1, g.join(', '));
  check('mesure : la page anglaise s\'ouvre sans erreur', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();
  const robot = await moteur('/en/', { ua: 'Mozilla/5.0 (compatible; bingbot/2.0)' });
  check('mesure : un robot n\'est pas compté (page anglaise)', robot.mesures.length === 0, JSON.stringify(robot.mesures));
  await robot.ctx.close();
  const fr = await moteur('/transfert-cdg-paris');
  await fr.p.evaluate(() => document.addEventListener('click', e => e.preventDefault()));
  await fr.p.locator('a[data-mesure="reserver"]').first().click({ timeout: 5000 }).catch(() => {});
  await fr.p.waitForTimeout(300);
  const gf = fr.mesures.map(m => m.p_page + ':' + m.p_evenement);
  check('mesure : la page française CDG compte aussi (fr-cdg)', gf.includes('fr-cdg:page_vue') && gf.includes('fr-cdg:clic_reserver'), gf.join(', '));
  const lienFr = await fr.p.getAttribute('a[data-mesure="reserver"]', 'href');
  check('la page française CDG porte son origine vers le moteur', /src=fr-cdg/.test(lienFr || ''), lienFr);
  await fr.ctx.close();
}

/* ═══ 7. LA POLITIQUE DE CONFIDENTIALITÉ DIT LA MESURE ═══ */
{
  const T = await (async () => { const p = await b.newPage(); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await p.goto(SITE + '/', { waitUntil: 'domcontentloaded' }); const t = await p.evaluate(() => window.ELA_TEXTES); await p.close(); return t; })();
  check('confidentialité FR : la page d\'origine et le comptage anonyme sont dits',
    /page du site depuis laquelle la demande a été commencée/.test(T.fr.legal_privacy_body) && /ni cookie ni stockage sur l'appareil/.test(T.fr.legal_privacy_body));
  check('confidentialité EN : la page d\'origine et le comptage anonyme sont dits',
    /page of the site from which the request was started/.test(T.en.legal_privacy_body) && /no cookie and no storage on the device/.test(T.en.legal_privacy_body));
}

await b.close();
await new Promise(r => serveur.close(r));
console.log('\n=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
process.exit(ko.length ? 1 : 0);
