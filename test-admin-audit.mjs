/* =====================================================================
   TEST-ADMIN-AUDIT.MJS — les constats de la relecture du 4 octobre 2026,
   et le rappel de sauvegarde (audit, P1-9)
   ---------------------------------------------------------------------
   - Sous 390 px, la pastille du chauffeur faisait passer la référence et le
     prix sur deux lignes : on mesure qu'ils tiennent sur une seule.
   - Sur une course du comptoir, « Confirmer la fin » poussait « Appeler »
     hors de la carte, et le doigt qui visait « Appeler » tombait sur la
     fermeture : on mesure qui reçoit le doigt.
   - Un chauffeur saisi par son seul numéro était « Sans chauffeur » sur la
     carte mais reconnu par le bon : le nom vient maintenant du carnet.
   - La saisie par téléphone d'une course confirmée contournait le contrôle
     de « Confirmer » (le seuil de dette) ; les papiers, eux, n'arrêtent
     rien (4 octobre 2026, Barbaros) : le bon qui s'ouvre après la création
     les affiche en rouge.
   - Le rappel de sauvegarde n'existait que sur ordinateur ; la restauration
     ne rendait ni l'identité de l'émetteur ni le lien d'avis.

   ÉPROUVÉ SUR LE SITE CONSTRUIT (port 8133, propre à cette suite).
   Lancer :  node test-admin-audit.mjs
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
await new Promise(r => serveur.listen(8133, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8133';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });

const paris = min => new Date(Date.now() + min * 60000).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10);
const AN = paris(400 * 1440), HIER = paris(-1440);
const course = (ref, statut, extra = {}) => ({ ref, statut,
  cree: new Date(Date.now() - 3600e3).toISOString(),
  course: { depart: 'Place Vendôme, 75001 Paris', departPublic: 'Place Vendôme, 75001 Paris',
    arrivee: 'Aéroport Charles-de-Gaulle, Terminal 2E', date: paris(2 * 1440), heure: '10:00',
    vehicule: 'Berline', vehiculeCle: 'berline', passagers: '2 passagers', vol: '' },
  client: { nom: 'Client ' + ref.slice(-5), telephone: '06 12 34 56 78' }, prix: { total: 185 }, langue: 'fr', ...extra });
const CARNET = [
  { id: 'c1', nom: 'Mohamed El Amrani', telephone: '06 11 22 33 44', carteFin: AN, registreFin: AN, assuranceFin: AN },
  { id: 'c3', nom: 'Pierre Perime', telephone: '06 99 88 77 66', carteFin: AN, registreFin: AN, assuranceFin: HIER },
];
const JEU = [
  course('ELA-26-10-SANSC', 'confirmee'),
  course('ELA-26-10-LONGN', 'confirmee', { chauffeur: { nom: 'Mohamed El Amrani', telephone: '06 11 22 33 44' } }),
  course('ELA-26-10-COMPT', 'confirmee', { chauffeur: { nom: 'Ali Ben', telephone: '06 55 55 55 55' },
    parReception: true, provenanceCle: 'easyhotel-aeroville', provenance: 'easyHotel Aéroville' }),
  course('ELA-26-10-TELON', 'confirmee', { chauffeur: { nom: '', telephone: '06 11 22 33 44' } }),
  course('ELA-26-10-TELIN', 'confirmee', { chauffeur: { nom: '', telephone: '07 00 00 00 01' } }),
];
const erreurs = [];
const nav = await chromium.launch();

async function ouvrir({ largeur = 390, local = JEU, carnet = CARNET, extra = {} } = {}) {
  const ctx = await nav.newContext({ viewport: { width: largeur, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris', acceptDownloads: true });
  await ctx.addInitScript(({ local, carnet, extra }) => {
    if (sessionStorage.getItem('__pose')) return;
    sessionStorage.setItem('__pose', '1');
    localStorage.setItem('ela_nuage_session', JSON.stringify({ access_token: 'JETON', refresh_token: 'R', user: { id: 'u-barbaros' } }));
    localStorage.setItem('ela_bookings', JSON.stringify(local));
    localStorage.setItem('ela_chauffeurs', JSON.stringify(carnet));
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
  }, { local, carnet, extra });
  /* Le serveur ne connaît rien : ce qu'on éprouve vit sur l'appareil. */
  await ctx.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (!u.includes('supabase.co')) return route.abort();
    if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
    if (u.includes('/rpc/role_operateur')) return route.fulfill(J('admin'));
    if (u.includes('/rest/v1/courses') && route.request().method() === 'GET') {
      if (u.includes('select=ref')) return route.fulfill(J([{ ref: local[0]?.ref || 'X', version: 1 }]));
      return route.fulfill(J(local.map(c => ({ bon: c, statut: c.statut, version: 1, modifie_le: '2026-10-04T08:00:00Z', cree_le: c.cree }))));
    }
    return route.fulfill(J([{ version: 1 }]));
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/ela-admin/');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 15000 });
  await p.waitForTimeout(1200);
  return { ctx, p };
}
const carte = (p, ref) => p.locator('#listeBord .demande').filter({ hasText: ref }).first();
const lignes = (p, ref, sel) => carte(p, ref).locator(sel).evaluate(e => {
  const lh = parseFloat(getComputedStyle(e).lineHeight) || (parseFloat(getComputedStyle(e).fontSize) * 1.2);
  return Math.round(e.getBoundingClientRect().height / lh);
}).catch(() => -1);

try {
  /* 1. LA RÉFÉRENCE ET LE PRIX TIENNENT SUR UNE LIGNE, À TOUTES LES LARGEURS. */
  for (const w of [320, 360, 375, 390]) {
    const { ctx, p } = await ouvrir({ largeur: w });
    await p.click('.compteur[data-filtre="confirmee"]'); await p.waitForTimeout(300);
    const casses = [];
    for (const ref of ['ELA-26-10-SANSC', 'ELA-26-10-LONGN']) {
      const r = await lignes(p, ref, '.d-ref'), px = await lignes(p, ref, '.d-prix');
      if (r !== 1 || px !== 1) casses.push(`${ref} réf ${r} l., prix ${px} l.`);
    }
    check(`${w} px : référence et prix sur une seule ligne, avec la pastille du chauffeur`, !casses.length, casses.join(' ; '));
    const pastille = await carte(p, 'ELA-26-10-SANSC').locator('.d-ch-manque').textContent().catch(() => '');
    check(`${w} px : « Sans chauffeur » se lit en entier`, pastille === 'Sans chauffeur', pastille);
    check(`${w} px : rien ne déborde de l'écran`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

    /* 2. SUR UNE COURSE DU COMPTOIR, ARMER « TERMINÉE » NE DÉPLACE PAS « APPELER ». */
    const c = carte(p, 'ELA-26-10-COMPT');
    const appeler = c.locator('.d-appeler');
    const avant = await appeler.boundingBox().catch(() => null);
    await c.locator('.d-clore').click().catch(() => {}); await p.waitForTimeout(250);
    const libelle = await c.locator('.d-clore').textContent().catch(() => '');
    const apres = await appeler.boundingBox().catch(() => null);
    const carteBox = await c.boundingBox().catch(() => null);
    const recoit = apres ? await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.className : ''; },
      [apres.x + apres.width / 2, apres.y + apres.height / 2]) : '';
    check(`${w} px : armé (« ${libelle.trim()} »), « Appeler » reste dans la carte et à sa place`,
      !!avant && !!apres && Math.abs(avant.x - apres.x) < 1 && apres.x + apres.width <= carteBox.x + carteBox.width + 0.5,
      avant && apres ? `x ${Math.round(avant.x)} → ${Math.round(apres.x)}, bord droit ${Math.round(apres.x + apres.width)} pour une carte à ${Math.round(carteBox.x + carteBox.width)}` : 'introuvable');
    check(`${w} px : le doigt posé sur « Appeler » tombe sur « Appeler »`, /d-appeler/.test(recoit), recoit);
    /* Armé, rien de la ligne ne doit être coupé en « e… » / « C… » : la
       pastille de l'hôtel et l'état s'effacent le temps du second appui. */
    const tronques = await c.locator('.d-bas').evaluate(b => [...b.querySelectorAll('*')]
      .filter(e => e.offsetParent !== null && getComputedStyle(e).textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1)
      .map(e => e.className + ' « ' + e.textContent.trim().slice(0, 14) + ' »')).catch(() => ['introuvable']);
    check(`${w} px : armé, rien n'est coupé sur la ligne du bas`, tronques.length === 0, tronques.join(', '));
    await ctx.close();
  }

  /* 3. UN CHAUFFEUR DONNÉ PAR SON SEUL NUMÉRO. */
  {
    const { ctx, p } = await ouvrir();
    await p.click('.compteur[data-filtre="confirmee"]'); await p.waitForTimeout(300);
    /* Saisi sur le bon : le numéro d'un chauffeur du carnet donne son nom. */
    await carte(p, 'ELA-26-10-SANSC').locator('.d-ref').click(); await p.waitForTimeout(800);
    await p.fill('#bbChauffeurTel', '06 11 22 33 44');
    await p.click('#btnRetourBord'); await p.waitForTimeout(800);
    const enreg = await p.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings')).find(c => c.ref === 'ELA-26-10-SANSC').chauffeur);
    check('un numéro du carnet donne le nom du chauffeur', enreg && enreg.nom === 'Mohamed El Amrani', JSON.stringify(enreg));
    await p.click('.compteur[data-filtre="confirmee"]'); await p.waitForTimeout(300);
    check('et la carte ne dit plus « Sans chauffeur »', (await carte(p, 'ELA-26-10-SANSC').locator('.d-ch-manque').count()) === 0);
    /* Un numéro inconnu : la carte ET le bon disent la même chose. */
    check('un numéro inconnu du carnet reste « Sans chauffeur » sur la carte',
      (await carte(p, 'ELA-26-10-TELIN').locator('.d-ch-manque').count()) === 1);
    await carte(p, 'ELA-26-10-TELIN').locator('.d-ref').click(); await p.waitForTimeout(800);
    check('et sur le bon, « Placer au groupe » est proposé (personne n\'est attribué)',
      await p.locator('#btnDiffuserGroupe').isVisible().catch(() => false));
    await ctx.close();
  }

  /* 4. SAISIR PAR TÉLÉPHONE UNE COURSE CONFIRMÉE : MÊME CONTRÔLE QUE « CONFIRMER ». */
  {
    const { ctx, p } = await ouvrir();
    const saisir = async (ch, tel) => {
      /* Après un refus on reste sur l'écran de création, après une création
         c'est le bon qui s'ouvre : on repart du menu, comme Barbaros. */
      await p.evaluate(() => document.getElementById('btnCreerNav').click()); await p.waitForTimeout(300);
      await p.fill('#crNom', 'Jean Hôtel'); await p.fill('#crTel', '06 12 34 56 78');
      await p.fill('#crDepart', 'Ibis CDG'); await p.fill('#crArrivee', 'Orly');
      await p.fill('#crHeure', '10:00'); await p.fill('#crPrix', '90');
      await p.fill('#crChNom', ch); await p.fill('#crChTel', tel);
      const avant = await p.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings')).length);
      await p.click('#btnCreerCourse'); await p.waitForTimeout(500);
      const apres = await p.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings')).length);
      const err = await p.evaluate(() => { const e = document.getElementById('crErreur'); return e && !e.hidden ? e.textContent.trim() : ''; });
      return { creee: apres > avant, err };
    };
    const r1 = await saisir('Pierre Perime', '06 99 88 77 66');
    await p.waitForTimeout(600);
    const alerteCr = await p.evaluate(() => { const e = document.getElementById('bbChauffeurAlerte'); return e && !e.hidden ? e.className : ''; });
    check('saisie par téléphone : un chauffeur aux papiers périmés est accepté (décision du 4 octobre)', r1.creee && !r1.err, r1.err);
    check('et le bon qui s\'ouvre l\'avertit en rouge', /rouge/.test(alerteCr), alerteCr);
    const r2 = await saisir('', '');
    check('saisie par téléphone : sans chauffeur, la course est créée (décision du 3 octobre)', r2.creee, r2.err);
    const r3 = await saisir('', '06 11 22 33 44');
    const derniere = await p.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings'))[0]);
    check('saisie par téléphone : le numéro d\'un chauffeur du carnet donne son nom', r3.creee && derniere.chauffeur && derniere.chauffeur.nom === 'Mohamed El Amrani',
      JSON.stringify(derniere.chauffeur));
    await ctx.close();
  }

  /* 5. LE RAPPEL DE SAUVEGARDE, SUR TÉLÉPHONE. */
  {
    const rappel = p => p.evaluate(() => { const e = document.getElementById('bordSauvegarde'); return e && !e.hidden ? e.innerText.trim() : ''; });
    let { ctx, p } = await ouvrir({ largeur: 390 });
    const r = await rappel(p);
    check('à 390 px, un carnet jamais sauvegardé déclenche le rappel', /Aucune sauvegarde/.test(r), r.slice(0, 80));
    const tel = await p.locator('#bordSauvegarde').boundingBox();
    check('il est visible dans le premier écran', !!tel && tel.y < 844, tel ? String(Math.round(tel.y)) : 'absent');
    const tele = p.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await p.click('#btnBordSauver');
    const fichier = await tele;
    check('son bouton télécharge la sauvegarde', !!fichier && /elatransfer-registre-.*\.json$/.test(fichier.suggestedFilename()), fichier ? fichier.suggestedFilename() : 'rien');
    await p.waitForTimeout(300);
    check('une fois la sauvegarde faite, le rappel s\'efface', !(await rappel(p)), await rappel(p));
    await ctx.close();

    ({ ctx, p } = await ouvrir({ extra: { ela_derniere_sauvegarde: String(Date.now() - 9 * 86400e3) } }));
    check('neuf jours après la dernière sauvegarde, il revient, daté', /il y a 9 jours/.test(await rappel(p)), await rappel(p));
    await ctx.close();
    ({ ctx, p } = await ouvrir({ extra: { ela_derniere_sauvegarde: String(Date.now() - 2 * 86400e3) } }));
    check('deux jours après, il se tait', !(await rappel(p)), await rappel(p));
    await ctx.close();
    ({ ctx, p } = await ouvrir({ carnet: [] }));
    check('rien à perdre sur l\'appareil (ni carnet, ni facture, ni paiement) : pas de rappel', !(await rappel(p)), await rappel(p));
    await ctx.close();
  }

  /* 6. LA RESTAURATION REND L'IDENTITÉ ET LE LIEN D'AVIS, SANS ÉCRASER. */
  {
    const sauvegarde = JSON.stringify({ format: 'elatransfer-1', courses: [], chauffeurs: [], factures: [],
      rangFacture: null, paiementsChauffeurs: [], entreprise: { nom: 'Elatransfer — Barbaros', siret: '123 456 789 00012', adresse: '1 rue de Paris', contact: 'x@y.fr', tva: 0 },
      lienAvis: 'https://g.page/r/exemple/review' });
    const restaurer = async p => {
      await p.evaluate(s => {
        const input = document.getElementById('fichierRestaurer');
        const dt = new DataTransfer(); dt.items.add(new File([s], 'sauvegarde.json', { type: 'application/json' }));
        input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
      }, sauvegarde);
      await p.waitForTimeout(500);
    };
    let { ctx, p } = await ouvrir();
    await restaurer(p);
    const apres = await p.evaluate(() => ({ e: JSON.parse(localStorage.getItem('ela_entreprise') || '{}'), l: localStorage.getItem('ela_lien_avis') }));
    check('la restauration rend l\'identité de l\'émetteur', apres.e.siret === '123 456 789 00012', JSON.stringify(apres.e));
    check('et le lien d\'avis', apres.l === 'https://g.page/r/exemple/review', String(apres.l));
    await ctx.close();
    ({ ctx, p } = await ouvrir({ extra: { ela_entreprise: JSON.stringify({ nom: 'Déjà ici', siret: '999', adresse: 'ici' }), ela_lien_avis: 'https://ici' } }));
    await restaurer(p);
    const garde = await p.evaluate(() => ({ e: JSON.parse(localStorage.getItem('ela_entreprise') || '{}'), l: localStorage.getItem('ela_lien_avis') }));
    check('elle n\'écrase jamais ce qui est déjà saisi sur l\'appareil', garde.e.siret === '999' && garde.l === 'https://ici', JSON.stringify(garde));
    await ctx.close();
  }

  check('aucune erreur JavaScript', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
} catch (e) {
  ko.push('PLANTAGE : ' + (e && e.message ? e.message.split('\n')[0] : e));
} finally {
  await nav.close();
  serveur.close();
}

console.log(`\n=== ${ok.length} contrôles au vert, ${ko.length} en échec ===`);
for (const k of ko) console.log('  ✘ ' + k);
for (const o of ok) console.log('  ✔ ' + o);
process.exit(ko.length ? 1 : 0);
