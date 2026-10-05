/* =====================================================================
   TEST-RECEPTION-NUMERO.MJS — le N° court, « N° 1042 »
   ---------------------------------------------------------------------
   5 octobre 2026, à la demande de Barbaros : « pour les numéros de bons,
   il faut que tu me fasses quelque chose d'assez simple ». La base
   attribue 1001, 1002… (migration 20261006000000_numero_court.sql) ; les
   pages l'affichent PARTOUT où l'on se parle d'une course, et le
   cherchent. La référence ELA-… reste la clé, écrite en petit à côté.

   DEUX ÉTATS SONT ÉPROUVÉS, parce que les deux existeront en production :
   avec le N° (migration appliquée) et SANS (avant elle) — sans, rien ne
   doit changer ni casser.
   ÉPROUVÉ SUR LE SITE CONSTRUIT : la réception et l'admin n'existent que
   là. Lancer :  node test-reception-numero.mjs
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
await new Promise(r => serveur.listen(8092, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8092';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = (b, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(b) });
const paris = min => new Date(Date.now() + min * 60000).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10);
const DEMAIN = paris(1440);

const LISTE = [
  { ref:'ELA-26-10-K7QPM', numero:1042, statut:'attente', date:DEMAIN, heure:'09:00', depart:'easyHotel Aéroville, 10 rue de la Belle Borne',
    arrivee:'Orly 1 — Aéroport de Paris-Orly', vehicule:'Berline', prix:90, client:'Mr John Smith',
    tel:'+44 7412 345678', chambre:'214', paiement:'Carte bancaire' },
  /* Une course SANS numéro : celle d'avant la migration, ou une réponse
     d'un serveur qui ne l'a pas encore. Elle doit rester exactement comme avant. */
  { ref:'ELA-26-10-R3TXW', statut:'confirmee', date:DEMAIN, heure:'11:00', depart:'easyHotel Aéroville, 10 rue de la Belle Borne',
    arrivee:'Disneyland Paris', vehicule:'Van', prix:120, client:'M. Dupont', tel:'06 12 34 56 78',
    chambre:'118', paiement:'Espèces', chauffeur:{ nom:'Mehmet', telephone:'06 98 76 54 32' } },
];
const erreurs = [];
const nav = await chromium.launch();

async function reception(numeroDepot) {
  const ctx = await nav.newContext({ viewport:{ width:1366, height:768 }, locale:'fr-FR', timezoneId:'Europe/Paris' });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(BASE)) return r.continue();
    if (u.includes('/functions/v1/courses-hotel'))
      return r.fulfill(J({ hotel:'easyhotel-aeroville', courses:LISTE, session:'s.sig', expire:Date.now() + 864e5 }));
    if (u.includes('/functions/v1/deposer-course'))
      return r.fulfill(J(numeroDepot ? { ok:true, ref:'x', numero:numeroDepot } : { ok:true, ref:'x' }, 201));
    if (u.includes('/functions/v1/') || u.includes('/rest/v1/')) return r.fulfill(J([]));
    return r.abort();
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/reception/easyhotel-aeroville/', { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(700);
  await p.fill('#recCode', 'code-de-test');
  await p.click('#btnRecEntrer');
  await p.waitForSelector('#recListe .rec-course', { timeout:8000 });
  return { ctx, p };
}
async function reserverAuComptoir(p) {
  await p.click('#btnRecReserver', { timeout:3000 });
  await p.waitForTimeout(800);
  await p.selectOption('#hotelDest', 'orly');
  await p.waitForTimeout(1500);
  await p.locator('#listeVehicules .veh-carte').first().click({ timeout:3000 });
  await p.locator('[data-paiement="especes"]').click({ timeout:3000 });
  await p.fill('#chambre', '307'); await p.fill('#clientNom', 'Ms Anna Berg'); await p.fill('#clientTel', '+46 70 123 45 67');
  await p.locator('#btnVoirPrix').click({ timeout:3000 });
  await p.waitForFunction(() => document.getElementById('ecran-bon')?.classList.contains('actif'), null, { timeout:8000 });
  await p.waitForTimeout(800);
}

try {
  /* ---------------------------------------------------------------
     1. LA RÉCEPTION : la liste, la recherche, le bon
     --------------------------------------------------------------- */
  {
    const { ctx, p } = await reception(1043);
    const carte = ref => p.locator('.rec-course').filter({ hasText:ref }).first();
    const ligne = await carte('ELA-26-10-K7QPM').locator('.rec-reference').innerText();
    check('la carte écrit le N° court, puis la référence entière', ligne === 'N° 1042 · Réf. ELA-26-10-K7QPM', ligne);
    const gras = await carte('ELA-26-10-K7QPM').locator('.rec-numero').evaluate(e => Number(getComputedStyle(e).fontWeight)).catch(() => 0);
    check('…le N° en gras', gras >= 700, String(gras));
    const sans = await carte('ELA-26-10-R3TXW').locator('.rec-reference').innerText();
    check('une course sans N° garde sa ligne d\'avant, mot pour mot', sans === 'Réf. ELA-26-10-R3TXW', sans);

    for (const q of ['1042', 'N° 1042', 'n°1042']) {
      await p.fill('#recRecherche', q); await p.waitForTimeout(250);
      const refs = await p.locator('#recListe .rec-course').evaluateAll(els => els.map(e => e.dataset.ref));
      check('la recherche « ' + q + ' » retrouve la course', JSON.stringify(refs) === '["ELA-26-10-K7QPM"]', JSON.stringify(refs));
    }
    await p.fill('#recRecherche', ''); await p.waitForTimeout(250);

    await carte('ELA-26-10-K7QPM').locator('button', { hasText:'Voir le bon' }).click({ timeout:3000 }).catch(() => {});
    const bon = p.locator('#bonClient .ebon');
    check('le bon porte « N° 1042 » en gros', (await bon.locator('.ebon-ref').textContent().catch(() => '')) === 'N° 1042');
    check('…et la référence en petit dessous', /Réf\. ELA-26-10-K7QPM/.test(await bon.locator('.ebon-ref-tech').textContent().catch(() => '')));
    await p.keyboard.press('Escape');
    await carte('ELA-26-10-R3TXW').locator('button', { hasText:'Voir le bon' }).click({ timeout:3000 }).catch(() => {});
    check('sans N°, le bon garde la référence en gros', (await bon.locator('.ebon-ref').textContent().catch(() => '')) === 'ELA-26-10-R3TXW');
    await p.keyboard.press('Escape');

    /* En anglais, seule la fin de la ligne se traduit : le N° en gras reste. */
    await p.locator('.langues button[data-langue="en"]').first().click({ timeout:3000 }).catch(() => {});
    await p.waitForTimeout(500);
    const enLigne = await carte('ELA-26-10-K7QPM').locator('.rec-reference').innerText().catch(() => '');
    check('en anglais, « Ref. » est traduit et le N° en gras reste', enLigne === 'N° 1042 · Ref. ELA-26-10-K7QPM'
      && await carte('ELA-26-10-K7QPM').locator('.rec-numero').count() === 1, enLigne);

    await p.locator('.langues button[data-langue="fr"]').first().click({ timeout:3000 }).catch(() => {});
    await p.waitForTimeout(500);
    check('…et revient en français', (await carte('ELA-26-10-K7QPM').locator('.rec-reference').innerText().catch(() => '')) === 'N° 1042 · Réf. ELA-26-10-K7QPM');

    /* Une réservation au comptoir : le N° rendu par le serveur arrive sur le bon. */
    await reserverAuComptoir(p);
    check('après une réservation, le bon porte le N° attribué par le serveur',
      (await p.locator('#bonRef').textContent()) === 'N° 1043', await p.locator('#bonRef').textContent());
    check('…la référence technique reste écrite dessous',
      await p.locator('#bonRefTech').isVisible() && /^Réf\. ELA-/.test(await p.locator('#bonRefTech').textContent()));
    /* CGV art. 3 et 4 : une demande en attente n'a pas de prix ferme. Le bon
       disait « Prix ferme » dès l'envoi (corrigé le 5 octobre 2026). */
    check('la demande en attente annonce son prix, elle ne le dit pas « ferme »',
      (await p.locator('#bonPrixLib').textContent({ timeout:3000 }).catch(() => '(absent)')) === 'Prix annoncé', await p.locator('#bonPrixLib').textContent({ timeout:3000 }).catch(() => '(absent)'));
    await p.click('#btnBonVoirClient', { timeout:3000 }).catch(() => {});
    check('« Voir le bon du client » montre le même N°',
      (await p.locator('#bonClient .ebon-ref').textContent().catch(() => '')) === 'N° 1043');
    await ctx.close();
  }
  /* Avant la migration : le serveur ne rend pas de N°. Le bon reste celui d'avant. */
  {
    const { ctx, p } = await reception(0);
    await reserverAuComptoir(p);
    check('sans N° rendu par le serveur, le bon garde la référence en gros',
      /^ELA-\d\d-\d\d-[A-Z0-9]{5}$/.test(await p.locator('#bonRef').textContent()), await p.locator('#bonRef').textContent());
    check('…et rien n\'est écrit dessous', await p.locator('#bonRefTech').isHidden());
    await ctx.close();
  }

  /* ---------------------------------------------------------------
     2. L'ADMIN : la carte, la fiche, le registre
     --------------------------------------------------------------- */
  for (const largeur of [1366, 390]) {
    const ctxA = await nav.newContext({ viewport:{ width:largeur, height:largeur > 900 ? 768 : 844 }, locale:'fr-FR', timezoneId:'Europe/Paris' });
    await ctxA.addInitScript(() => {
      localStorage.setItem('ela_nuage_session', JSON.stringify({ access_token:'JETON', refresh_token:'R' }));
    });
    const bonDe = (ref, statut, nom) => ({ ref, statut, cree:new Date().toISOString(),
      course:{ depart:'easyHotel Aéroville, 10 rue de la Belle Borne', departPublic:'easyHotel Aéroville, 10 rue de la Belle Borne',
        arrivee:'Orly 1 — Aéroport de Paris-Orly', date:DEMAIN, heure:'09:00', vehicule:'Berline' },
      client:{ nom, telephone:'+44 7412 345678' }, prix:{ total:35 }, paiementNom:'Carte bancaire', langue:'fr',
      /* Une course du comptoir easyHotel : c'est le cas réel, et sa carte
         porte la bande du partenaire, qui mange de la largeur. Sans elle,
         le contrôle de la ligne passait au vert sur la mise en page qui se
         coupait en deux à l'écran. */
      provenance:'easyHotel Aéroville', provenanceCle:'easyhotel-aeroville', parReception:true,
      securite:{ empreinteDepot:'e' } });
    /* La base recopie le N° dans le bon : c'est là que l'admin le lit, sans
       nommer la colonne (nommée, elle ferait refuser la lecture avant la
       migration). */
    const LIGNES = [
      { bon:{ ...bonDe('ELA-26-10-K7QPM', 'attente', 'Mr John Smith'), numero:1042 }, statut:'attente', version:2, modifie_le:'2026-10-05T10:00:00Z', cree_le:new Date().toISOString() },
      { bon:bonDe('ELA-26-10-R3TXW', 'attente', 'M. Dupont'), statut:'attente', version:1, modifie_le:'2026-10-05T09:00:00Z', cree_le:new Date(Date.now() - 6e4).toISOString() },
    ];
    await ctxA.route('**/*', r => {
      const req = r.request(), u = req.url();
      if (u.startsWith(BASE)) return r.continue();
      if (!u.includes('supabase.co')) return r.abort();
      if (u.includes('/rpc/est_exploitant') || u.includes('/rpc/est_admin')) return r.fulfill(J(true));
      if (u.includes('/rpc/role_operateur')) return r.fulfill(J('admin'));
      if (u.includes('/rpc/') || u.includes('/functions/v1/')) return r.fulfill(J([]));
      if (u.includes('/rest/v1/courses')) {
        if (u.includes('select=ref')) return r.fulfill(J([{ ref:LIGNES[0].bon.ref, version:2 }]));
        if (req.method() === 'GET') return r.fulfill(J(LIGNES));
        return r.fulfill(J([{ version:3 }]));
      }
      return r.fulfill(J([]));
    });
    const a = await ctxA.newPage();
    a.on('pageerror', e => erreurs.push('admin: ' + e.message.split('\n')[0]));
    await a.goto(BASE + '/ela-admin/');
    await a.waitForSelector('.demande', { timeout:15000 }).catch(() => {});
    await a.waitForTimeout(500);
    const carte = a.locator('.demande').filter({ hasText:'ELA-26-10-K7QPM' }).first();
    check(largeur + ' px — la carte de l\'admin porte « N° 1042 »', /^N° 1042\b/.test(await carte.locator('.d-num').textContent().catch(() => '')));
    check(largeur + ' px — …à côté de la référence, jamais dedans',
      (await carte.locator('.d-ref').textContent().catch(() => '')) === 'ELA-26-10-K7QPM', await carte.locator('.d-ref').textContent().catch(() => ''));
    check(largeur + ' px — une course sans N° n\'en affiche pas',
      await a.locator('.demande').filter({ hasText:'ELA-26-10-R3TXW' }).first().locator('.d-num').count() === 0);
    const deborde = await carte.evaluate(c => {
      const h = c.querySelector('.d-haut'), b = c.getBoundingClientRect();
      return [...h.children].filter(x => { const r = x.getBoundingClientRect(); return r.width && (r.right > b.right + 1 || r.left < b.left - 1); }).map(x => x.className);
    });
    check(largeur + ' px — rien ne déborde de la carte', deborde.length === 0, JSON.stringify(deborde));
    /* Chaque élément sur UNE ligne, et tous sur la même. Le premier jet ne
       comparait que les hauts : il est passé au vert sur un téléphone où la
       référence et le prix (« 35,00 / € ») se coupaient en deux lignes. */
    const ligneHaut = await carte.locator('.d-haut').evaluate(h => {
      const vis = [...h.children].filter(x => x.getBoundingClientRect().width);
      const ys = vis.map(x => Math.round(x.getBoundingClientRect().top));
      const coupes = vis.filter(x => x.getBoundingClientRect().height > parseFloat(getComputedStyle(x).fontSize) * 1.7).map(x => x.className);
      const mesures = vis.map(x => x.className + ' : ' + Math.round(x.getBoundingClientRect().height) + ' px de haut');
      return { ecart: Math.max(...ys) - Math.min(...ys), coupes, mesures };
    });
    check(largeur + ' px — le N°, l\'attente et le prix tiennent sur une ligne, sans rien couper',
      ligneHaut.ecart <= 6 && ligneHaut.coupes.length === 0, JSON.stringify(ligneHaut));
    check(largeur + ' px — le N° porte la durée d\'attente (le signal d\'urgence)',
      /^N° 1042 · depuis /.test(await carte.locator('.d-num').textContent().catch(() => '')), await carte.locator('.d-num').textContent().catch(() => ''));
    check(largeur + ' px — la référence technique ' + (largeur > 600 ? 'reste visible' : 's\'efface (elle reste sur la fiche)'),
      (await carte.locator('.d-ref').isVisible()) === (largeur > 600));

    if (largeur === 1366) {
      await carte.click({ timeout:3000 }).catch(() => {});
      await a.waitForFunction(() => document.getElementById('ecran-bord-bon')?.classList.contains('actif'), null, { timeout:5000 }).catch(() => {});
      check('la fiche de l\'admin écrit le N°',
        await a.locator('#bbNumLigne').isVisible() && (await a.locator('#bbNum').textContent()) === 'N° 1042');
      await a.click('#btnBbVoirBon', { timeout:3000 }).catch(() => {});
      check('…et le bon du client aussi', (await a.locator('#bonClient .ebon-ref').textContent().catch(() => '')) === 'N° 1042');
      await a.keyboard.press('Escape');
      const garde = await a.evaluate(() => {
        try { const l = JSON.parse(localStorage.getItem('ela_bookings') || '[]'); const c = l.find(x => x.ref === 'ELA-26-10-K7QPM'); return c ? c.numero : null; } catch (e) { return 'err'; }
      });
      check('l\'appareil garde le N° lu sur le serveur', garde === 1042, String(garde));
    }
    await ctxA.close();
  }

  /* ---------------------------------------------------------------
     3. LE CLIENT : le lien de confirmation porte le N°
     --------------------------------------------------------------- */
  {
    const ctxC = await nav.newContext({ viewport:{ width:390, height:844 }, locale:'fr-FR', timezoneId:'Europe/Paris' });
    await ctxC.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    const c = await ctxC.newPage();
    c.on('pageerror', e => erreurs.push('client: ' + e.message.split('\n')[0]));
    const lien = d => Buffer.from(JSON.stringify(d)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    await c.goto(BASE + '/?ok=' + lien({ r:'ELA-26-10-K7QPM', c:'Mehmet', t:'0698765432', v:'Berline', d:DEMAIN, h:'09:00', n:1042 }));
    await c.waitForTimeout(600);
    check('le client qui ouvre sa confirmation voit « N° 1042 »', (await c.locator('#bonRef').textContent()) === 'N° 1042');
    await c.goto(BASE + '/?ok=' + lien({ r:'ELA-26-10-R3TXW', c:'Mehmet', t:'0698765432', v:'Van', d:DEMAIN, h:'11:00' }));
    await c.waitForTimeout(600);
    check('un lien sans N° (envoyé avant la migration) s\'ouvre comme avant', (await c.locator('#bonRef').textContent()) === 'ELA-26-10-R3TXW');

    /* Le même client, sur le téléphone qui a fait la demande : son bon passe
       de « Prix annoncé » à « Prix ferme » quand la confirmation arrive. */
    const bonClient = { ref:'ELA-26-10-PRIXF', statut:'attente', cree:new Date().toISOString(),
      course:{ depart:'10 rue de Rivoli, Paris', arrivee:'Orly 1 — Aéroport de Paris-Orly', date:DEMAIN, heure:'09:00', vehicule:'Berline' },
      client:{ nom:'Client', telephone:'0612345678' }, prix:{ total:60 }, paiement:'carte', langue:'fr' };
    await c.evaluate(b => localStorage.setItem('ela_courses', JSON.stringify([b])), bonClient);
    await c.goto(BASE + '/?ok=' + lien({ r:'ELA-26-10-PRIXF', c:'Mehmet', t:'0698765432', v:'Berline', d:DEMAIN, h:'09:00' }));
    await c.waitForTimeout(600);
    check('confirmée, le bon du client dit « Prix ferme »',
      await c.locator('#bonDetail').isVisible() && (await c.locator('#bonPrixLib').textContent({ timeout:3000 }).catch(() => '(absent)')) === 'Prix ferme',
      await c.locator('#bonPrixLib').textContent({ timeout:3000 }).catch(() => '(absent)'));
    await c.evaluate(() => { const b = document.querySelector('.langues button[data-langue="en"], [data-langue="en"]'); if (b) b.click(); });
    await c.waitForTimeout(300);
    check('…et « Firm price » en anglais (la traduction suit l\'état)',
      (await c.locator('#bonPrixLib').textContent({ timeout:3000 }).catch(() => '(absent)')) === 'Firm price', await c.locator('#bonPrixLib').textContent({ timeout:3000 }).catch(() => '(absent)'));
    await ctxC.close();
  }
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
