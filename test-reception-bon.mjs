/* =====================================================================
   TEST-RECEPTION-BON.MJS — le bon affiché, le même chez Barbaros, et la
   réception sur le PC d'un hôtel
   ---------------------------------------------------------------------
   5 octobre 2026, à la demande de Barbaros :
   - « la réception n'a pas besoin d'envoyer de bons, on peut juste
     afficher un bon » — et « les bons que voit la réception doivent être
     les mêmes chez moi » ;
   - « le nom du client et son numéro […] très visibles » ;
   - l'historique « avec les trajets les plus récents en début ».
   ÉPROUVÉ SUR LE SITE CONSTRUIT, en 1366×768 : c'est l'écran d'un PC
   d'hôtel, et c'est là qu'on a mesuré la première course SOUS le bas de
   l'écran (y = 723). L'admin aussi n'existe que construit (/ela-admin/).
   Lancer :  node test-reception-bon.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';

execSync('sh construire.sh', { stdio: 'ignore' });
const TYPES = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8091, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8091';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
const paris = min => { const s = new Date(Date.now() + min * 60000).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }); return s.slice(0, 10); };

/* Deux courses finies le MÊME jour (8 h et 18 h) et une la veille : c'est le
   cas où l'historique mettait 8 h avant 18 h. */
const HIER = paris(-1440), AVANT_HIER = paris(-2880), DEMAIN = paris(1440);
const LISTE = [
  { ref:'ELA-26-10-AVEN1', statut:'attente', date:DEMAIN, heure:'09:00', depart:'easyHotel Aéroville, 10 rue de la Belle Borne',
    arrivee:'Orly 1 — Aéroport de Paris-Orly', vehicule:'Berline', prix:90, client:'Mr John Smith',
    tel:'+44 7412 345678', chambre:'214', paiement:'Carte bancaire' },
  { ref:'ELA-26-10-AVEN2', statut:'confirmee', date:DEMAIN, heure:'11:00', depart:'easyHotel Aéroville, 10 rue de la Belle Borne',
    arrivee:'Disneyland Paris', vehicule:'Van', prix:120, client:'M. Dupont', tel:'06 12 34 56 78',
    chambre:'118', paiement:'Espèces', chauffeur:{ nom:'Mehmet', telephone:'06 98 76 54 32' } },
  { ref:'ELA-26-10-MATIN', statut:'realisee', date:HIER, heure:'08:00', depart:'easyHotel Aéroville',
    arrivee:'Terminal 2E', vehicule:'Berline', client:'Mme Matin', tel:'06 11 11 11 11', chambre:'101', paiement:'Espèces' },
  { ref:'ELA-26-10-SOIR1', statut:'realisee', date:HIER, heure:'18:00', depart:'easyHotel Aéroville',
    arrivee:'Terminal 1', vehicule:'Berline', client:'M. Soir', tel:'06 22 22 22 22', chambre:'102', paiement:'Carte bancaire' },
  { ref:'ELA-26-10-VEILL', statut:'refusee', date:AVANT_HIER, heure:'23:00', depart:'easyHotel Aéroville',
    arrivee:'Beauvais', vehicule:'Van', client:'M. Veille', tel:'06 33 33 33 33', chambre:'103', paiement:'Espèces' },
];
const erreurs = [];
const nav = await chromium.launch();

try {
  /* ---------------------------------------------------------------
     1. LA RÉCEPTION SUR UN PC 1366×768
     --------------------------------------------------------------- */
  const ctx = await nav.newContext({ viewport:{ width:1366, height:768 }, locale:'fr-FR', timezoneId:'Europe/Paris' });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(BASE)) return r.continue();
    if (u.includes('/functions/v1/courses-hotel'))
      return r.fulfill(J({ hotel:'easyhotel-aeroville', courses:LISTE, session:'s.sig', expire:Date.now() + 864e5 }));
    return r.abort();
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/reception/easyhotel-aeroville/', { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(700);
  await p.fill('#recCode', 'code-de-test');
  await p.click('#btnRecEntrer');
  await p.waitForSelector('#recListe .rec-course', { timeout:8000 });
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(300);

  const premiere = await p.locator('#recListe .rec-course').first().boundingBox();
  check('sur un PC 1366×768, la première course est à l\'écran sans faire défiler',
    premiere && premiere.y < 768 - 120, premiere ? 'y = ' + Math.round(premiere.y) : 'absente');
  check('plus de bloc de trois chiffres', await p.locator('.rec-chiffre').count() === 0);
  check('« Un imprévu ? » écrit le numéro en clair',
    /\+33 7 59 31 24 33/.test(await p.locator('.rec-aide').innerText()));
  const largeur = await p.evaluate(() => document.documentElement.scrollWidth);
  check('aucun débordement horizontal', largeur <= 1366, largeur + ' px');

  /* Le nom et le téléphone sur la carte : en noir et en gras, plus en gris. */
  const qui = await p.locator('.rec-qui').first().evaluate(e => {
    const s = getComputedStyle(e); return { taille:parseFloat(s.fontSize), gras:Number(s.fontWeight), couleur:s.color };
  });
  check('sur chaque carte, le client est écrit en gros et en gras', qui.taille >= 15 && qui.gras >= 700, JSON.stringify(qui));

  /* ---- LE BON AFFICHÉ ---- */
  const carte = ref => p.locator('.rec-course').filter({ hasText:ref }).first();
  await carte('ELA-26-10-AVEN1').locator('button', { hasText:'Voir le bon' }).click({ timeout:3000 }).catch(() => {});
  const bon = p.locator('#bonClient .ebon');
  await bon.waitFor({ timeout:3000 }).catch(() => {});
  check('« Voir le bon » ouvre le bon', await bon.isVisible());
  const tailleNom = await bon.locator('.ebon-nom').evaluate(e => parseFloat(getComputedStyle(e).fontSize)).catch(() => 0);
  const tailleTel = await bon.locator('.ebon-tel').evaluate(e => parseFloat(getComputedStyle(e).fontSize)).catch(() => 0);
  check('le nom du client, en gros', (await bon.locator('.ebon-nom').textContent().catch(() => '')) === 'Mr John Smith' && tailleNom >= 22, tailleNom + ' px');
  check('son numéro, en gros, cliquable',
    (await bon.locator('.ebon-tel').textContent().catch(() => '')) === '+44 7412 345678' && tailleTel >= 20
    && /^tel:\+447412345678$/.test(await bon.locator('.ebon-tel').getAttribute('href').catch(() => '')), tailleTel + ' px');
  check('en attente, le prix est « annoncé », jamais « ferme » (CGV art. 3 et 4)',
    /Prix annoncé/.test(await bon.textContent()) && !/Prix ferme/.test(await bon.textContent()));
  check('le bon dit que la confirmation vient d\'Elatransfer',
    /La confirmation vous sera envoyée par Elatransfer/.test(await bon.textContent()));
  /* L'en-tête collant de la page passait PAR-DESSUS la fenêtre : FR/EN et
     « Fermer » ne recevaient plus le clic. On mesure ce que reçoit le doigt. */
  const recoit = await p.evaluate(() => ['.ebon-langues button[data-langue="en"]', '#bonClientFermer'].map(s => {
    const e = document.querySelector(s); const r = e.getBoundingClientRect();
    const sous = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!sous && (sous === e || e.contains(sous));
  }));
  check('FR/EN et « Fermer » reçoivent vraiment le clic (rien par-dessus)', recoit.every(Boolean), JSON.stringify(recoit));
  await p.locator('.ebon-langues button[data-langue="en"]').click({ timeout:3000 }).catch(() => {});
  check('EN traduit le bon', /Booking voucher/.test(await bon.textContent()) && /Quoted price/.test(await bon.textContent()));
  const libellesRec = await p.locator('#bonClient .ebon-lignes dt').allTextContents();
  await p.locator('.ebon-langues button[data-langue="fr"]').click({ timeout:3000 }).catch(() => {});
  const libellesRecFr = await p.locator('#bonClient .ebon-lignes dt').allTextContents();
  await p.keyboard.press('Escape');
  check('Échap referme le bon', await p.locator('#bonClient').isHidden());

  await carte('ELA-26-10-AVEN2').locator('button', { hasText:'Voir le bon' }).click({ timeout:3000 }).catch(() => {});
  check('confirmée : « Prix ferme » et le chauffeur',
    /Prix ferme/.test(await bon.textContent()) && /Mehmet/.test(await bon.textContent()));
  await p.locator('#bonClientFermer').click({ timeout:3000 }).catch(() => {});

  /* ---- L'HISTORIQUE, LE PLUS RÉCENT EN HAUT ---- */
  await p.click('.rec-vues button[data-vue="passees"]', { timeout:3000 }).catch(() => {});
  await p.waitForTimeout(200);
  const ordre = await p.locator('#recListe .rec-course').evaluateAll(els => els.map(e => e.dataset.ref));
  check('l\'historique va du plus récent au plus ancien, heure comprise',
    JSON.stringify(ordre) === JSON.stringify(['ELA-26-10-SOIR1', 'ELA-26-10-MATIN', 'ELA-26-10-VEILL']), JSON.stringify(ordre));
  check('« Actualiser » est juste au-dessus de la liste',
    await p.evaluate(() => {
      const a = document.getElementById('btnRecActualiser').getBoundingClientRect();
      const l = document.getElementById('recListe').getBoundingClientRect();
      return a.bottom <= l.top && l.top - a.bottom < 120;
    }));
  check('une course non prise n\'a pas de bon à montrer',
    await carte('ELA-26-10-VEILL').locator('button').count() === 0);
  await carte('ELA-26-10-SOIR1').locator('button', { hasText:'Voir le bon' }).click({ timeout:3000 }).catch(() => {});
  check('le bon d\'une course effectuée ne porte aucun prix',
    await p.locator('#bonClient .ebon-prix').count() === 0 && !/€/.test(await bon.textContent()));
  await p.locator('#bonClientFermer').click({ timeout:3000 }).catch(() => {});
  await ctx.close();

  /* ---------------------------------------------------------------
     2. LE MÊME BON CHEZ BARBAROS (/ela-admin/)
     --------------------------------------------------------------- */
  const ctxA = await nav.newContext({ viewport:{ width:1366, height:768 }, locale:'fr-FR', timezoneId:'Europe/Paris' });
  await ctxA.addInitScript(() => {
    localStorage.setItem('ela_nuage_session', JSON.stringify({ access_token:'JETON', refresh_token:'R' }));
  });
  const BON = { ref:'ELA-26-10-AVEN1', statut:'attente', version:1, cree:new Date().toISOString(),
    course:{ depart:'easyHotel Aéroville, 10 rue de la Belle Borne (ch. 214)', departPublic:'easyHotel Aéroville, 10 rue de la Belle Borne',
      arrivee:'Orly 1 — Aéroport de Paris-Orly', date:DEMAIN, heure:'09:00', vehicule:'Berline', chambre:'214' },
    client:{ nom:'Mr John Smith', telephone:'+44 7412 345678' }, prix:{ total:90 }, paiementNom:'Carte bancaire', langue:'fr' };
  await ctxA.route('**/*', r => {
    const req = r.request(), u = req.url();
    if (u.startsWith(BASE)) return r.continue();
    if (!u.includes('supabase.co')) return r.abort();
    if (u.includes('/rpc/est_exploitant') || u.includes('/rpc/est_admin')) return r.fulfill(J(true));
    if (u.includes('/rpc/role_operateur')) return r.fulfill(J('admin'));
    if (u.includes('/rpc/') || u.includes('/functions/v1/')) return r.fulfill(J([]));
    if (u.includes('/rest/v1/courses')) {
      if (u.includes('select=ref')) return r.fulfill(J([{ ref:BON.ref, version:1, modifie_le:'2026-10-05T10:00:00Z' }]));
      if (req.method() === 'GET') return r.fulfill(J([{ bon:BON, statut:BON.statut, version:1, modifie_le:'2026-10-05T10:00:00Z', cree_le:BON.cree }]));
      return r.fulfill(J([{ version:1 }]));
    }
    return r.fulfill(J([]));
  });
  const a = await ctxA.newPage();
  a.on('pageerror', e => erreurs.push('admin: ' + e.message.split('\n')[0]));
  await a.goto(BASE + '/ela-admin/?ref=' + BON.ref);
  await a.waitForFunction(() => document.getElementById('ecran-bord-bon')?.classList.contains('actif'), null, { timeout:15000 }).catch(() => {});
  check('l\'admin porte « Voir le bon du client » sur la fiche', await a.locator('#btnBbVoirBon').isVisible());
  await a.click('#btnBbVoirBon', { timeout:3000 }).catch(() => {});
  const bonA = a.locator('#bonClient .ebon');
  check('…qui ouvre le MÊME bon que la réception (même dessin)', await bonA.isVisible());
  check('avec le même client, en tête',
    (await bonA.locator('.ebon-nom').textContent().catch(() => '')) === 'Mr John Smith'
    && (await bonA.locator('.ebon-tel').textContent().catch(() => '')) === '+44 7412 345678'
    && /Chambre 214/.test(await bonA.textContent().catch(() => '')));
  const libellesAdmin = await a.locator('#bonClient .ebon-lignes dt').allTextContents();
  check('les mêmes lignes, dans le même ordre, que chez la réception',
    JSON.stringify(libellesAdmin) === JSON.stringify(libellesRecFr), JSON.stringify(libellesAdmin) + ' / ' + JSON.stringify(libellesRecFr));
  check('…et la même adresse, sans la chambre recopiée dedans',
    /easyHotel Aéroville, 10 rue de la Belle Borne$/m.test(await bonA.locator('.ebon-lignes').innerText().catch(() => ''))
    && !/\(ch\./.test(await bonA.textContent().catch(() => '')));
  check('le bon anglais existe aussi côté réception (libellés traduits)', libellesRec.length === libellesRecFr.length && libellesRec[0] !== libellesRecFr[0]);
  await ctxA.close();

  /* ---------------------------------------------------------------
     3. LES PAGES PUBLIQUES NE CHARGENT PAS CE BON
     --------------------------------------------------------------- */
  const ctxP = await nav.newContext();
  await ctxP.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
  const pp = await ctxP.newPage();
  for (const chemin of ['/', '/application.html']) {
    await pp.goto(BASE + chemin, { waitUntil:'domcontentloaded' });
    check('page publique ' + chemin + ' : pas de bon de comptoir chargé',
      await pp.evaluate(() => typeof window.ELA_BON === 'undefined'));
  }
  await ctxP.close();
} finally {
  await nav.close();
  serveur.close();
}
check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));

console.log(`\n=== RÉUSSIS (${ok.length}) ===`);
ok.forEach(x => console.log('  ✔ ' + x));
if (ko.length) {
  console.log(`\n=== ÉCHECS (${ko.length}) ===`);
  ko.forEach(x => console.log('  ✘ ' + x));
  process.exitCode = 1;
}
