/* =====================================================================
   TEST-PARCOURS-EN.MJS — le voyageur étranger, de Google à la demande
   ---------------------------------------------------------------------
   15 octobre 2026, audit final des quatre prompts internationaux (Prompt 4,
   conversion). Aucune suite ne suivait un visiteur anglophone de bout en
   bout : la page d'arrivée, « Book », le moteur en anglais, le prix, le
   récapitulatif, l'envoi, le bon — et ce qui se passe quand ça casse.

   CE QU'ON ÉPROUVE, SUR LE SITE CONSTRUIT, À 390 ET 1280 px :
   · les cinq pages /en/ : H1, trois boutons de réservation au moins, Call
     et WhatsApp, le premier bouton au premier écran et sous le doigt
     (elementFromPoint), aucun débordement, aucune erreur JavaScript ;
   · « Book » ouvre LE moteur en anglais, prérempli, la langue mémorisée,
     les paramètres effacés de l'adresse, « moteur ouvert » compté ;
   · une recherche d'adresse muette dit quelque chose au client ;
   · l'écran des prix et le récapitulatif sont en anglais, le paiement par
     lien y est expliqué, ni e-mail ni carte demandés ; « No payment now »
     est dit sous les prix, jamais recouvert ;
   · confirmer sans nom ni téléphone est refusé avec un message VISIBLE ;
   · un numéro étranger n'offre que WhatsApp / Telegram ;
   · UNE seule demande part sur un double appui ; le bon s'affiche avec sa
     référence ; la demande porte la bonne provenance, la langue, le trajet
     et un prix ; « demande envoyée » est compté ;
   · la mesure en panne (500) ne bloque rien ;
   · dépôt refusé : la tête du bon ne dit pas « reçue », le renvoi WhatsApp
     est offert, et la note ne parle plus d'une ouverture de WhatsApp ;
   · paramètres absents, inconnus ou mal formés : moteur utilisable, adresse
     nettoyée, français par défaut, anglais sur « ?lang=en » ;
   · tous les liens internes des cinq pages répondent 200 ;
   · changer de langue sur l'écran des prix ne change pas les montants.

   Lancer :  node test-parcours-en.mjs   (elle construit et sert elle-même)
   ===================================================================== */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
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
await new Promise(r => serveur.listen(8145, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:8145';
const anciens = [];
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const J = (b, s = 200) => ({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
const b = await chromium.launch();
const ok = [], ko = []; const note = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
async function visiteur({ viewport = { width: 390, height: 844 }, ua = UA, depotStatus = 201, panneMesure = false, lenteurDepot = 0 } = {}) {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'Europe/Paris', userAgent: ua });
  const mesures = [], depots = [], requetes = [], erreurs = [];
  await ctx.addInitScript(() => { window.open = () => null; });
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url(), d = decodeURIComponent(u).toLowerCase();
    if (u.startsWith(SITE)) return route.continue();
    requetes.push(req.method() + ' ' + u.slice(0, 120));
    /* 15/10/2026 (PR #358) : la mesure passe par la fonction « mesure ». On
       la ramène à la forme du compteur (p_page, p_evenement) — même
       traduction que test-liens-suivi — et la panne simulée vise cette porte.
       L'ancienne porte reste écoutée : plus rien ne doit l'appeler. */
    if (u.includes('/functions/v1/mesure')) { try { const c = JSON.parse(req.postData()); mesures.push(Object.assign({ p_page: c.page, p_evenement: c.evenement }, c.lien ? { p_source: c.lien } : {})); } catch {} return panneMesure ? route.fulfill({ status: 500, body: 'x' }) : route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
    if (u.includes('/rpc/ela_mesurer')) { anciens.push(u); return route.fulfill({ status: 204, body: '' }); }
    if (d.includes('api-adresse.data.gouv.fr') || d.includes('photon.komoot.io')) return route.fulfill(J({ features: [] }));
    if (d.includes('router.project-osrm.org')) return route.fulfill(J({ routes: [{ distance: 48000, duration: 3000 }] }));
    if (u.includes('supabase.co') && req.method() === 'POST') {
      let c = {}; try { c = JSON.parse(req.postData() || '{}'); } catch {}
      if (c.bon) { depots.push(c.bon); if (lenteurDepot) await new Promise(r => setTimeout(r, lenteurDepot)); return route.fulfill(J(depotStatus === 201 ? { ok: true, ref: c.bon.ref, numero: 1042 } : { ok: false, raison: 'test' }, depotStatus)); }
    }
    if (u.includes('supabase.co')) return route.fulfill(J([]));
    if (d.includes('fonts.g')) return route.abort();
    return route.abort();
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(e.message));
  return { ctx, p, mesures, depots, requetes, erreurs };
}
const texte = async (p, sel) => (await p.locator(sel).first().textContent().catch(() => '') || '').trim();
const visible = async (p, sel) => p.locator(sel).first().isVisible().catch(() => false);

/* ═══ A. Les cinq pages à 390 et 1280 : premier écran, CTA, débordement ═══ */
const PAGES = ['/en/', '/en/cdg-airport-transfer-paris/', '/en/orly-airport-transfer-paris/', '/en/disneyland-paris-airport-transfer/', '/en/cdg-orly-transfer/'];
for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  for (const page of PAGES) {
    const v = await visiteur({ viewport: vp });
    const t0 = Date.now();
    await v.p.goto(SITE + page, { waitUntil: 'load' });
    const dur = Date.now() - t0;
    await v.p.waitForTimeout(300);
    const m = await v.p.evaluate(() => {
      const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height), visible: !!(e.offsetParent) && b.width > 0 }; };
      const centre = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); const hit = document.elementFromPoint(b.left + b.width / 2, Math.min(b.top + b.height / 2, innerHeight - 1)); return hit ? (e === hit || e.contains(hit)) : null; };
      return { scrollW: document.documentElement.scrollWidth, innerW: innerWidth, h1: document.querySelector('h1')?.textContent.trim(),
        books: [...document.querySelectorAll('a[data-mesure="reserver"]')].length,
        premierBook: r('.sens a.bouton, a[data-mesure="reserver"]'), premierBookCliquable: centre('.sens a.bouton'),
        call: r('a[href^="tel:"]'), wa: r('a[href^="https://wa.me"]'), lang: document.documentElement.lang,
        prix: /€|EUR/.test(document.body.innerText), fixeBas: r('.barre-fixe, .barre, nav.fixe, .cta-fixe') };
    });
    note(`${vp.width}px ${page} : pas de débordement horizontal`, m.scrollW <= m.innerW, `${m.scrollW}/${m.innerW}`);
    note(`${vp.width}px ${page} : H1 et ≥3 boutons Book, lang=en`, !!m.h1 && m.books >= 3 && m.lang === 'en', `${m.h1} · ${m.books} · ${m.lang}`);
    note(`${vp.width}px ${page} : le premier bouton de réservation est au premier écran et reçoit le doigt`, m.premierBook && m.premierBook.bottom <= vp.height && m.premierBookCliquable !== false, JSON.stringify(m.premierBook) + ' cliquable=' + m.premierBookCliquable);
    note(`${vp.width}px ${page} : Call et WhatsApp présents`, m.call && m.wa, '');
    note(`${vp.width}px ${page} : aucune erreur JS`, v.erreurs.length === 0, v.erreurs.join(' | '));
    await v.ctx.close();
  }
}

/* ═══ B. Le parcours complet depuis la page CDG ═══ */
async function parcours(opts = {}, entree = '/en/cdg-airport-transfer-paris/', cliquer = 0, dest = 'Orly 4') {
  const v = await visiteur(opts);
  await v.p.goto(SITE + entree, { waitUntil: 'load' });
  await v.p.waitForTimeout(300);
  const books = await v.p.$$eval('a[data-mesure="reserver"]', l => l.map(a => a.getAttribute('href')));
  await v.p.locator('a[data-mesure="reserver"]').nth(cliquer).click();
  await v.p.waitForURL(u => u.pathname === '/', { timeout: 8000 }).catch(() => {});
  await v.p.waitForTimeout(900);
  const etat1 = await v.p.evaluate(() => ({ url: location.pathname + location.search, lang: document.documentElement.lang,
    depart: document.getElementById('depart')?.value, arrivee: document.getElementById('arrivee')?.value,
    listeOuverte: !!document.querySelector('#departList [role=option], #arriveeList [role=option]'),
    options: [...document.querySelectorAll('#departList [role=option], #arriveeList [role=option]')].map(o => o.textContent.trim()),
    boite: (() => { const l = [...document.querySelectorAll('.suggest-list')].find(x => !x.hidden); const b = document.querySelector('nav.barre');
      return l ? { bas: Math.round(l.getBoundingClientRect().bottom), barre: b && b.getClientRects().length ? Math.round(b.getBoundingClientRect().top) : innerHeight,
        haut: Math.round(document.getElementById('blocDepart').getBoundingClientRect().top) } : null; })(),
    titreBouton: document.getElementById('btnVoirPrix')?.textContent.trim(), h1: [...document.querySelectorAll('h1')].find(h => h.offsetParent)?.textContent.trim(),
    stockLang: localStorage.getItem('ela_langue') }));
  return { v, books, etat1 };
}
{
  const { v, books, etat1 } = await parcours();
  note('parcours : « Book » vise le moteur avec lang=en, src, aeroport, sens', books.every(h => /lang=en/.test(h) && /src=en-cdg/.test(h)), books[0]);
  note('parcours : le moteur s\'ouvre en anglais, paramètres effacés', etat1.lang === 'en' && !/lang=|src=|aeroport=/.test(etat1.url), JSON.stringify(etat1));
  note('parcours : le départ est prérempli « CDG » et la liste des terminaux s\'ouvre', etat1.depart === 'CDG' && etat1.listeOuverte, JSON.stringify({ d: etat1.depart, l: etat1.listeOuverte }));
  /* A-03 (16/10/2026) : le nom de l'aéroport suit la langue du client ;
     le nom du terminal, lui, ne change pas (c'est ce que lit le site). */
  note('parcours : les terminaux sont nommés en anglais (« Paris-Charles de Gaulle Airport »), aucun « Aéroport »',
    etat1.options.length >= 9 && etat1.options.every(o => /Paris-Charles de Gaulle Airport/.test(o)) && !etat1.options.some(o => /Aéroport/.test(o)), etat1.options.slice(0, 2).join(' | '));
  /* A-04 : la boîte des terminaux se ferme AU-DESSUS de la barre du bas, et
     le haut du formulaire reste à l'écran. */
  note('parcours : la liste des terminaux tient au-dessus de la barre du bas, le formulaire reste visible',
    !!etat1.boite && etat1.boite.bas <= etat1.boite.barre && etat1.boite.haut >= 0, JSON.stringify(etat1.boite));
  note('parcours : la langue est mémorisée (ela_langue=en)', etat1.stockLang === 'en', String(etat1.stockLang));
  note('parcours : « moteur ouvert » compté pour en-cdg', v.mesures.some(m => m.p_evenement === 'moteur_ouvert' && m.p_page === 'en-cdg'));
  /* Terminal, puis arrivée à la main (BAN muette → on tape une adresse ; la recherche rend rien → voir ce que dit la page). */
  await v.p.locator('#departList [role=option]', { hasText: 'Terminal 2E' }).first().click({ timeout: 5000 }).catch(() => {});
  await v.p.waitForTimeout(400);
  const apresTerminal = await v.p.evaluate(() => ({ depart: document.getElementById('depart').value, vol: !document.getElementById('blocVol').hidden }));
  note('parcours : le terminal anglais ouvre le champ « numéro de vol » (le site reconnaît le terminal)',
    apresTerminal.vol && /^Terminal 2E — Paris-Charles de Gaulle Airport$/.test(apresTerminal.depart), JSON.stringify(apresTerminal));
  await v.p.fill('#arrivee', 'Hotel Lutetia Paris');
  await v.p.waitForTimeout(900);
  const liste = await v.p.evaluate(() => ({ n: document.querySelectorAll('#arriveeList [role=option]').length, txt: document.querySelector('#arriveeList')?.textContent.trim().slice(0, 160) }));
  note('parcours : recherche d\'adresse muette (hors ligne) → la liste dit quelque chose au client plutôt que rien', liste.n > 0 || (liste.txt || '').length > 0, JSON.stringify(liste));
  /* On prend Orly 4 depuis la liste des lieux connus à la place. */
  await v.p.fill('#arrivee', 'Orly');
  await v.p.waitForTimeout(600);
  await v.p.locator('#arriveeList [role=option]', { hasText: 'Orly 4' }).first().click({ timeout: 5000 }).catch(() => {});
  await v.p.waitForTimeout(300);
  await v.p.fill('#date', new Date(Date.now() + 2 * 864e5).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10));
  await v.p.fill('#heure', '10:00');
  await v.p.locator('#btnVoirPrix').click();
  await v.p.waitForTimeout(1500);
  const prix = await v.p.evaluate(() => ({ ecran: document.querySelector('.ecran.actif')?.id, cartes: [...document.querySelectorAll('.veh-carte')].map(c => c.innerText.replace(/\s+/g, ' ').trim().slice(0, 120)),
    recap: document.querySelector('#ecran-vehicules')?.innerText.replace(/\s+/g, ' ').slice(0, 400) }));
  note('parcours : l\'écran des prix s\'ouvre avec des gammes et des montants en €', prix.ecran === 'ecran-vehicules' && prix.cartes.length >= 2 && prix.cartes.every(c => /€/.test(c)), JSON.stringify(prix.cartes));
  note('parcours : l\'écran des prix est en anglais (« Berline/Van », « passengers »)', /passenger/i.test(prix.recap) && !/passagers/i.test(prix.recap), prix.recap.slice(0, 200));
  /* « Aucun paiement maintenant », dit sous les prix (19/10/2026) : c'est
     l'écran où l'on décide. Dans la langue du client, sous les cartes, et
     jamais recouvert par le bouton collant de l'écran. */
  const rassure = await v.p.evaluate(() => {
    const e = document.getElementById('vehRassure'), cartes = [...document.querySelectorAll('#listeVehicules .veh-carte')];
    if (!e) return null;
    e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect(), bas = cartes.length ? cartes[cartes.length - 1].getBoundingClientRect().bottom : 0;
    const dessus = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { texte: e.textContent.trim(), visible: !!e.offsetParent && r.height > 0, sousLesCartes: r.top >= bas - 0.5, libre: dessus === e || e.contains(dessus),
      gouttiere: r.left >= 16 && r.right <= innerWidth - 16 };
  });
  note('parcours : sous les prix, « No payment now », en anglais, sous les cartes, dans la gouttière et jamais recouvert',
    !!rassure && rassure.visible && /^No payment now/.test(rassure.texte) && !/Aucun paiement/.test(rassure.texte) && rassure.sousLesCartes && rassure.libre && rassure.gouttiere, JSON.stringify(rassure));
  await v.p.locator('.veh-carte').first().click();
  await v.p.locator('#btnContinuer').click();
  await v.p.waitForTimeout(400);
  const recap = await v.p.evaluate(() => ({ ecran: document.querySelector('.ecran.actif')?.id, texte: document.querySelector('#ecran-recap')?.innerText.replace(/\s+/g, ' ').slice(0, 1500) }));
  note('parcours : le récapitulatif s\'ouvre', recap.ecran === 'ecran-recap', recap.ecran);
  note('parcours : le récapitulatif explique le paiement par lien avant le départ', /payment link|before (pick-up|departure)/i.test(recap.texte), recap.texte.slice(0, 300));
  note('parcours : le récapitulatif ne demande ni e-mail ni carte', !/e-?mail|card number/i.test(recap.texte));
  /* Confirmer sans rien remplir : que dit la page ? */
  await v.p.locator('#btnConfirmer').click();
  await v.p.waitForTimeout(400);
  const vide = await v.p.evaluate(() => { const e = document.getElementById('erreurCoordonnees'); const r = e && e.getBoundingClientRect();
    return { ecran: document.querySelector('.ecran.actif')?.id, msg: e ? e.textContent.trim() : '', visible: !!(e && e.offsetParent && r.height > 0),
      dansEcran: !!(r && r.top >= 0 && r.bottom <= innerHeight), focus: document.activeElement && document.activeElement.id }; });
  note('parcours : confirmer sans nom ni téléphone est refusé, le message est visible, le champ a le focus', vide.ecran === 'ecran-recap' && vide.visible && vide.dansEcran && vide.focus === 'clientNom' && /name|nom/i.test(vide.msg), JSON.stringify(vide));
  await v.p.fill('#clientNom', 'Jane Doe');
  await v.p.fill('#clientTel', '+44 7700 900123');
  const contacts = await v.p.evaluate(() => [...document.querySelectorAll('#blocContact [data-contact]')].filter(e => e.offsetParent).map(e => e.getAttribute('data-contact') + ':' + e.textContent.trim().slice(0, 40)));
  note('parcours : avec un numéro étranger, les moyens de confirmation proposés sont WhatsApp / Telegram (pas SMS)', contacts.length >= 1 && !contacts.some(c => /sms|appel|call/i.test(c)), contacts.join(' | '));
  await v.p.evaluate(() => { const b = [...document.querySelectorAll('#blocContact [data-contact]')].find(e => e.offsetParent); if (b) b.click(); });
  const nbDepotsAvant = v.depots.length;
  await v.p.locator('#btnConfirmer').click();
  await v.p.locator('#btnConfirmer').click({ timeout: 1000 }).catch(() => {});
  await v.p.waitForTimeout(1800);
  const bon = await v.p.evaluate(() => ({ ecran: document.querySelector('.ecran.actif')?.id, etat: document.getElementById('bonEtat')?.textContent.trim(), ref: document.getElementById('bonRef')?.textContent.trim(),
    texte: document.querySelector('#ecran-bon')?.innerText.replace(/\s+/g, ' ').slice(0, 1200) }));
  note('parcours : UNE seule demande part malgré un double appui', v.depots.length - nbDepotsAvant === 1, String(v.depots.length - nbDepotsAvant));
  /* Le N° court SEUL (16/10/2026, « partout pareil, court ») : le serveur
     a rendu 1042, le bon l'écrit et n'écrit plus la référence ELA-…. */
  note('parcours : le bon s\'affiche, en anglais, avec son N° court seul', bon.ecran === 'ecran-bon' && bon.ref === 'N° 1042' && !/ELA-\d\d-\d\d-/.test(bon.texte) && /received/i.test(bon.etat), JSON.stringify({ etat: bon.etat, ref: bon.ref }));
  note('parcours : le bon dit que la demande est arrivée et ce qui se passe ensuite', /received|confirm/i.test(bon.texte), bon.texte.slice(0, 300));
  note('parcours : demande arrivée, pas de bouton « Call us »', await v.p.locator('#btnAppelerBon').isHidden());
  const d = v.depots[0] || {};
  note('demande : provenance = page CDG anglaise, langue en, pas de via', d.provenance === 'Site anglais · CDG ↔ Paris' && d.langue === 'en' && !d.via, JSON.stringify({ p: d.provenance, l: d.langue, via: d.via }));
  note('demande : adresses et prix cohérents (Terminal 2E → Orly, prix > 0)', /Terminal 2E — Paris-Charles de Gaulle Airport/.test(d.course?.depart || '') && /Orly/.test(d.course?.arrivee || '') && (d.prix?.total || 0) > 0, JSON.stringify({ dep: d.course?.depart, arr: d.course?.arrivee, prix: d.prix?.total }));
  note('mesure : demande_envoyee comptée pour en-cdg', v.mesures.some(m => m.p_evenement === 'demande_envoyee' && m.p_page === 'en-cdg'));
  note('parcours : aucune erreur JS', v.erreurs.length === 0, v.erreurs.join(' | '));
  await v.ctx.close();
}

/* ═══ C. Panne de la mesure : la réservation passe quand même ═══ */
{
  const { v, etat1 } = await parcours({ panneMesure: true });
  await v.p.locator('#departList [role=option]', { hasText: 'Terminal 2E' }).first().click({ timeout: 5000 }).catch(() => {});
  await v.p.fill('#arrivee', 'Orly'); await v.p.waitForTimeout(600);
  await v.p.locator('#arriveeList [role=option]', { hasText: 'Orly 4' }).first().click({ timeout: 5000 }).catch(() => {});
  await v.p.fill('#date', new Date(Date.now() + 2 * 864e5).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10));
  await v.p.fill('#heure', '10:00');
  await v.p.locator('#btnVoirPrix').click(); await v.p.waitForTimeout(1200);
  await v.p.locator('.veh-carte').first().click(); await v.p.locator('#btnContinuer').click(); await v.p.waitForTimeout(300);
  await v.p.fill('#clientNom', 'Jane Doe'); await v.p.fill('#clientTel', '+44 7700 900123');
  await v.p.evaluate(() => { const b = [...document.querySelectorAll('#blocContact [data-contact]')].find(e => e.offsetParent); if (b) b.click(); });
  await v.p.locator('#btnConfirmer').click(); await v.p.waitForTimeout(1500);
  note('mesure en panne (500) : la demande part quand même et le bon s\'affiche', v.depots.length === 1 && (await v.p.evaluate(() => document.querySelector('.ecran.actif')?.id)) === 'ecran-bon');
  note('mesure en panne : aucune erreur JS', v.erreurs.length === 0, v.erreurs.join(' | '));
  await v.ctx.close();
}

/* ═══ D. Dépôt refusé (503) : le client est prévenu, repli visible ═══ */
{
  const { v } = await parcours({ depotStatus: 503 });
  await v.p.locator('#departList [role=option]', { hasText: 'Terminal 2E' }).first().click({ timeout: 5000 }).catch(() => {});
  await v.p.fill('#arrivee', 'Orly'); await v.p.waitForTimeout(600);
  await v.p.locator('#arriveeList [role=option]', { hasText: 'Orly 4' }).first().click({ timeout: 5000 }).catch(() => {});
  await v.p.fill('#date', new Date(Date.now() + 2 * 864e5).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10));
  await v.p.fill('#heure', '10:00');
  await v.p.locator('#btnVoirPrix').click(); await v.p.waitForTimeout(1200);
  await v.p.locator('.veh-carte').first().click(); await v.p.locator('#btnContinuer').click(); await v.p.waitForTimeout(300);
  await v.p.fill('#clientNom', 'Jane Doe'); await v.p.fill('#clientTel', '+44 7700 900123');
  await v.p.evaluate(() => { const b = [...document.querySelectorAll('#blocContact [data-contact]')].find(e => e.offsetParent); if (b) b.click(); });
  await v.p.locator('#btnConfirmer').click(); await v.p.waitForTimeout(2500);
  const bon = await v.p.evaluate(() => ({ texte: document.querySelector('#ecran-bon')?.innerText.replace(/\s+/g, ' ').slice(0, 1500),
    etat: document.getElementById('bonEtat')?.textContent.trim(), tete: document.getElementById('bonNote')?.textContent.trim(),
    note: document.getElementById('noteRenvoi')?.textContent.trim(), renvoyer: document.getElementById('btnRenvoyer')?.className,
    appel: (() => { const a = document.getElementById('btnAppelerBon'); return a ? { visible: !!a.offsetParent, href: a.getAttribute('href'), texte: a.textContent.trim() } : null; })() }));
  note('dépôt refusé : l\'écriteau dit que la demande n\'est pas arrivée et nomme WhatsApp', /could not reach us/i.test(bon.texte) && /WhatsApp/.test(bon.texte), bon.texte.slice(0, 400));
  note('dépôt refusé : la tête du bon ne dit pas « received », elle dit « not reached »', !/received/i.test(bon.etat) && /not reached/i.test(bon.tete), JSON.stringify({ etat: bon.etat, tete: bon.tete }));
  note('dépôt refusé : le renvoi WhatsApp devient l\'action principale', bon.renvoyer === 'bouton', bon.renvoyer);
  note('dépôt refusé : la note ne décrit plus une ouverture de WhatsApp (retirée le 4/10/2026)', !/did not open|open/i.test(bon.note), bon.note);
  note('dépôt refusé : « Call us » est offert, compose le numéro du site et l\'écrit en format international', !!bon.appel && bon.appel.visible && bon.appel.href === 'tel:+33759312433' && /\+33 7 59 31 24 33/.test(bon.appel.texte) && /call/i.test(bon.texte), JSON.stringify(bon.appel));
  await v.ctx.close();
}

/* ═══ E. Paramètres absents / inconnus / invalides ═══ */
/* A-04, sens « arrivée » : le cas qui débordait le plus (boîte finie à
   841 px pour une barre à 782, avant le 16/10/2026). */
{
  const v = await visiteur();
  await v.p.goto(SITE + '/?lang=en&src=en-cdg&aeroport=cdg&sens=arrivee', { waitUntil: 'load' });
  await v.p.waitForTimeout(900);
  const m = await v.p.evaluate(() => { const l = document.getElementById('arriveeList'); const b = document.querySelector('nav.barre');
    return { ouverte: !l.hidden, bas: Math.round(l.getBoundingClientRect().bottom), barre: Math.round(b.getBoundingClientRect().top),
      haut: Math.round(document.getElementById('blocDepart').getBoundingClientRect().top) }; });
  note('arrivée à CDG : la liste des terminaux tient au-dessus de la barre, le lieu de départ reste visible',
    m.ouverte && m.bas <= m.barre && m.haut >= 0, JSON.stringify(m));
  /* Beauvais n'a qu'un terminal : sa forme anglaise est la seule qui diffère. */
  await v.p.fill('#depart', 'Beauvais');
  await v.p.waitForTimeout(700);
  await v.p.locator('#departList [role=option]', { hasText: 'Single terminal' }).first().click({ timeout: 5000 }).catch(() => {});
  await v.p.waitForTimeout(300);
  const bv = await v.p.evaluate(() => ({ depart: document.getElementById('depart').value, vol: !document.getElementById('blocVol').hidden }));
  note('Beauvais en anglais : « Single terminal — Paris-Beauvais Airport », et le champ du vol s\'ouvre',
    bv.depart === 'Single terminal — Paris-Beauvais Airport' && bv.vol, JSON.stringify(bv));
  note('arrivée à CDG : aucune erreur JS', v.erreurs.length === 0, v.erreurs.join(' | '));
  await v.ctx.close();
}
/* Le français ne bouge pas : même libellé qu'avant le 16/10/2026. */
{
  const v = await visiteur();
  await v.p.goto(SITE + '/?lang=fr&aeroport=cdg&sens=depart', { waitUntil: 'load' });
  await v.p.waitForTimeout(900);
  const o = await v.p.$$eval('#departList [role=option]', l => l.map(x => x.textContent.trim()));
  note('en français, les terminaux gardent « Aéroport Roissy-Charles de Gaulle »', o.length >= 9 && o.every(x => /Aéroport Roissy-Charles de Gaulle/.test(x)), o.slice(0, 2).join(' | '));
  await v.ctx.close();
}
for (const [q, attendu] of [['', 'rien'], ['?lang=xx&src=inconnu&aeroport=mars&sens=bof&via=%3Cscript%3E', 'ignoré'], ['?lang=en', 'anglais seul'], ['?src=en-orly', 'origine sans lang']]) {
  const v = await visiteur();
  await v.p.goto(SITE + '/' + q, { waitUntil: 'load' }); await v.p.waitForTimeout(700);
  const e = await v.p.evaluate(() => ({ url: location.search, lang: document.documentElement.lang, depart: document.getElementById('depart')?.value, bouton: !!document.getElementById('btnVoirPrix') }));
  note(`paramètres « ${q || '(aucun)'} » (${attendu}) : moteur utilisable, adresse nettoyée, pas d'erreur JS`, e.bouton && !/src=|lang=|aeroport=|via=/.test(e.url) && v.erreurs.length === 0, JSON.stringify(e) + ' ' + v.erreurs.join('|'));
  if (q === '') note('sans paramètre : le moteur s\'ouvre en français', e.lang === 'fr', e.lang);
  if (q === '?lang=en') note('?lang=en seul : le moteur s\'ouvre en anglais', e.lang === 'en', e.lang);
  if (/lang=xx/.test(q)) note('paramètres invalides : la langue reste le français, le départ vide', e.lang === 'fr' && !e.depart, JSON.stringify(e));
  await v.ctx.close();
}

/* ═══ F. Liens de langue et liens internes : tous répondent ═══ */
{
  const vus = new Set(); const morts = [];
  for (const page of PAGES) {
    const html = await (await fetch(SITE + page)).text();
    for (const m of html.matchAll(/href="([^"]+)"/g)) {
      let h = m[1].replace(/&amp;/g, '&');
      if (/^(tel:|mailto:|https?:\/\/(?!elatransfer\.com)|#)/.test(h)) continue;
      h = h.replace('https://elatransfer.com', '');
      const cible = h.split('#')[0]; if (!cible || vus.has(cible)) continue; vus.add(cible);
      const r = await fetch(SITE + cible, { redirect: 'manual' });
      if (r.status !== 200) morts.push(cible + ' → ' + r.status);
    }
  }
  note(`liens internes des 5 pages : ${vus.size} adresses, toutes en 200 sur le site construit`, morts.length === 0, morts.join(' | '));
}

/* ═══ G. Le client qui change de langue dans le moteur garde son trajet ═══ */
{
  const { v } = await parcours();
  await v.p.locator('#departList [role=option]', { hasText: 'Terminal 2E' }).first().click({ timeout: 5000 }).catch(() => {});
  await v.p.fill('#arrivee', 'Orly'); await v.p.waitForTimeout(600);
  await v.p.locator('#arriveeList [role=option]', { hasText: 'Orly 4' }).first().click({ timeout: 5000 }).catch(() => {});
  await v.p.fill('#date', new Date(Date.now() + 2 * 864e5).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10));
  await v.p.fill('#heure', '10:00');
  await v.p.locator('#btnVoirPrix').click(); await v.p.waitForTimeout(1200);
  const prixEn = await v.p.$$eval('.veh-carte', l => l.map(c => (c.innerText.match(/\d+[.,]?\d*\s*€|€\s*\d+/g) || []).join(' ')));
  await v.p.evaluate(() => { const b = document.querySelector('[data-langue="fr"]'); if (b) b.click(); });
  await v.p.waitForTimeout(500);
  const prixFr = await v.p.$$eval('.veh-carte', l => l.map(c => (c.innerText.match(/\d+[.,]?\d*\s*€|€\s*\d+/g) || []).join(' ')));
  const nb = s => s.map(x => x.replace(/[^\d.,]/g, '').replace(',', '.'));
  note('changer de langue sur l\'écran des prix ne change pas les montants', JSON.stringify(nb(prixEn)) === JSON.stringify(nb(prixFr)), JSON.stringify([prixEn, prixFr]));
  await v.ctx.close();
}


note('mesure : plus aucun appel à l\'ancienne porte (rpc/ela_mesurer)', anciens.length === 0, String(anciens.length));
await b.close();
serveur.close();
console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
if (ko.length) { console.log('=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(k => console.log('  ✘ ' + k)); }
process.exit(ko.length ? 1 : 0);
