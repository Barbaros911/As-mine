/* =====================================================================
   TEST-GRILLE-PUBLIQUE.MJS — la grille du site public (23 octobre 2026)
   ---------------------------------------------------------------------
   Décision de Barbaros, prix ferme donc opposable. Ce qui est verrouillé :

   — LES TRANCHES : 35 / 50 / 70 / 90 € en berline, 50 / 80 / 110 / 130 € en
     van, jusqu'à 12 / 22 / 32 / 42 km, jugées sur la distance AFFICHÉE au
     dixième (12,04 km se lit « 12 km » et coûte 35 €) ; au-delà, la
     dernière tranche + 2,50 €/km (berline) ou 3,80 €/km (van), arrondie à
     la dizaine, le 5 pile descend. Les prix attendus sont écrits À LA MAIN.
   — LES FORFAITS PARIS : Orly 55 / 80, Roissy 70 / 110, Disneyland 90 / 130,
     dans les deux sens, quel que soit le quartier ; Paris, c'est la commune
     (Boulogne n'y est pas, même à côté).
   — L'ACCUEIL : +10 € au départ d'un aéroport (CDG, Orly, Beauvais, Le
     Bourget) ou d'une des grandes gares, compris dans le prix montré. Pas
     pour une petite gare, pas pour un hôtel collé au terminal, pas pour
     une DÉPOSE à l'aéroport. Plus d'option à cocher sur le site public.
   — LA DEMANDE PART avec le prix montré, « pancarte » et « accueil » ; la
     ligne d'accueil du message est AVANT le prix et sans montant.
   — UNE GRILLE DU SERVEUR FAUSSE N'EST PAS APPLIQUÉE : le site garde la
     sienne, en entier.
   — LE « PRIX DES PAGES » EST RETIRÉ : une page d'acquisition ne change
     plus le prix (il remplaçait test-prix-pages.mjs).

   Lancer :  node test-grille-publique.mjs   (construit le site d'abord)
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
await new Promise(r => serveur.listen(8151, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8151';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
const erreurs = [];
const nav = await chromium.launch();

/* Les lieux, tels que Photon les rend : le TYPE (gare, aéroport, hôtel) et
   la COMMUNE viennent de ses champs, jamais du libellé. */
const P = (nom, lon, lat, cle, valeur, cp, ville) => ({ geometry:{ coordinates:[lon, lat] },
  properties:{ name:nom, osm_key:cle, osm_value:valeur, postcode:cp, city:ville, countrycode:'FR' } });
const LIEUX = {
  opera:      P('Opéra Garnier', 2.3316, 48.8720, 'tourism', 'attraction', '75009', 'Paris'),
  boulogne:   P('Mairie de Boulogne-Billancourt', 2.2399, 48.8353, 'amenity', 'townhall', '92100', 'Boulogne-Billancourt'),
  disneyland: P('Disneyland Park', 2.7758, 48.8722, 'tourism', 'theme_park', '77700', 'Chessy'),
  lyon:       P('Gare de Lyon', 2.373520, 48.844888, 'railway', 'station', '75012', 'Paris'),
  juvisy:     P('Juvisy', 2.3836, 48.6894, 'railway', 'station', '91260', 'Juvisy-sur-Orge'),
  hilton:     P('Hilton Paris Charles de Gaulle', 2.5600, 49.0040, 'tourism', 'hotel', '95700', 'Roissy-en-France'),
  versailles: P('Château de Versailles', 2.1204, 48.8049, 'tourism', 'attraction', '78000', 'Versailles'),
  bourget:    P('Aéroport de Paris-Le Bourget', 2.4414, 48.9694, 'aeroway', 'aerodrome', '93350', 'Le Bourget'),
};
/* grille : réponse de « grille_publique » (null = aucune ligne). */
async function client(grille = null) {
  const km = { m: 10 };
  const ctx = await nav.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:1, locale:'fr-FR', timezoneId:'Europe/Paris' });
  const depots = [];
  await ctx.addInitScript(() => { window.__liens = []; window.open = u => { window.__liens.push(u); return null; }; });
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url(), d = decodeURIComponent(u).toLowerCase();
    if (u.startsWith(BASE)) return route.continue();
    if (d.includes('api-adresse.data.gouv.fr')) return route.fulfill(J({ features: [] }));
    if (d.includes('photon.komoot.io')) {
      const q = (d.match(/[?&]q=([^&]*)/) || [, ''])[1];
      const k = Object.keys(LIEUX).find(k => q.includes(k.slice(0, 5)));
      return route.fulfill(J({ features: k ? [LIEUX[k]] : [] }));
    }
    if (d.includes('api.openrouteservice.org')) return route.abort();
    if (d.includes('router.project-osrm.org')) return route.fulfill(J({ routes:[{ distance:km.m * 1000, duration:km.m * 60 }] }));
    if (u.includes('/rest/v1/grille_publique')) return route.fulfill(J(grille ? [{ valeur: grille }] : []));
    if (u.includes('supabase.co') && req.method() === 'POST') {
      let c = {}; try { c = JSON.parse(req.postData() || '{}'); } catch {}
      if (c.bon) { depots.push(c.bon); return route.fulfill({ status:201, contentType:'application/json', body:'{"ok":true}' }); }
    }
    if (u.includes('supabase.co')) return route.fulfill(J([]));
    return route.abort();
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/');
  await p.waitForTimeout(500);
  return { ctx, p, depots, km };
}
async function adresse(p, champ, q, choix) {
  await p.fill('#' + champ, ''); await p.type('#' + champ, q, { delay: 15 });
  await p.waitForTimeout(700);
  const l = p.locator('#' + champ + 'List [role=option]', { hasText: choix }).first();
  if (await l.count()) await l.click(); else ko.push('« ' + q + ' » : la ligne « ' + choix + ' » manque dans la liste');
  await p.waitForTimeout(250);
}
const demain = () => new Date(Date.now() + 864e5).toLocaleString('sv-SE', { timeZone:'Europe/Paris' }).slice(0, 10);
const nombre = t => Number(String(t).replace(/[^\d,.-]/g, '').replace(',', '.'));
/* Un trajet jusqu'à l'écran des prix ; rend ce que le client y lit. */
async function trajet(c, km, dep, arr) {
  c.km.m = km;
  await c.p.locator('#btnRetourAccueil').click().catch(() => {});
  await c.p.waitForTimeout(150);
  await adresse(c.p, 'depart', dep[0], dep[1]);
  await adresse(c.p, 'arrivee', arr[0], arr[1]);
  await c.p.fill('#date', demain()); await c.p.fill('#heure', '10:00'); await c.p.waitForTimeout(150);
  await c.p.locator('#btnVoirPrix').click(); await c.p.waitForTimeout(1200);
  const prix = {};
  for (const carte of await c.p.locator('.veh-carte').all())
    prix[(await carte.locator('.veh-nom').innerText()).trim()] = nombre(await carte.locator('.veh-prix').innerText());
  const lire = async id => (await c.p.locator(id).isVisible()) ? (await c.p.locator(id).innerText()).trim() : '';
  return { berline: prix.Berline, van: prix.Van, forfait: await lire('#resumeForfait'), accueil: await lire('#resumeAccueil'),
           option: await c.p.locator('.veh-option').isVisible(), plus: await lire('.veh-carte .veh-plus') };
}
const OPERA = ['opera', 'Opéra'], ORLY1 = ['orly', 'Orly 1'], T2E = ['cdg', 'Terminal 2E'];

try {
  /* 1. LES TRANCHES, À LA MAIN, par la fonction partagée elle-même. */
  {
    const { ctx, p } = await client();
    const r = await p.evaluate(() => {
      const G = { berline:{ tranches:[{km:12,prix:35},{km:22,prix:50},{km:32,prix:70},{km:42,prix:90}], auDela:2.5 },
                  van:{ tranches:[{km:12,prix:50},{km:22,prix:80},{km:32,prix:110},{km:42,prix:130}], auDela:3.8 } };
      const f = window.ELA_ROUTE.prixTranches, o = {};
      [5, 12, 12.04, 12.06, 22, 22.1, 32, 32.1, 42, 42.1, 44, 44.1, 60, 100, 220].forEach(km => { o[km] = f(G.berline, km) + '/' + f(G.van, km); });
      return o;
    });
    const attendu = { 5:'35/50', 12:'35/50', 12.04:'35/50', 12.06:'50/80', 22:'50/80', 22.1:'70/110', 32:'70/110', 32.1:'90/130',
      42:'90/130', 42.1:'90/130', 44:'90/140', 44.1:'100/140', 60:'130/200', 100:'230/350', 220:'530/810' };
    Object.keys(attendu).forEach(km => check(`tranche à ${km} km : ${attendu[km]} €`, r[km] === attendu[km], r[km]));
    await ctx.close();
  }

  /* 2. LES FORFAITS PARIS, DANS LES DEUX SENS, ET L'ACCUEIL AU DÉPART. */
  const c = await client();
  {
    let r = await trajet(c, 21, OPERA, ORLY1);
    check('Paris → Orly : forfait 55 € / 80 €, pas d\'accueil (on dépose)', r.berline === 55 && r.van === 80 && !r.accueil, JSON.stringify(r));
    check('Paris → Orly : le forfait est dit au-dessus de la liste', /Forfait Paris ↔ Orly/.test(r.forfait), r.forfait);
    check('plus d\'option pancarte à cocher sur le site public', !r.option);
    check('« Surclassement possible, au même prix » sous la Berline', r.plus === 'Surclassement possible, au même prix', r.plus);
    r = await trajet(c, 21, ORLY1, OPERA);
    check('Orly → Paris : 65 € / 90 € (forfait + accueil)', r.berline === 65 && r.van === 90, JSON.stringify(r));
    check('Orly → Paris : « Accueil compris », à la sortie des arrivées', /^Accueil compris/.test(r.accueil) && /sortie des arrivées/.test(r.accueil), r.accueil);
    r = await trajet(c, 28, OPERA, T2E);
    check('Paris → Roissy : 70 € / 110 €', r.berline === 70 && r.van === 110 && /Roissy-CDG/.test(r.forfait), JSON.stringify(r));
    r = await trajet(c, 34, T2E, OPERA);
    check('Roissy → Paris, même à 34 km : 80 € / 120 €', r.berline === 80 && r.van === 120, JSON.stringify(r));
    r = await trajet(c, 41, OPERA, ['disneyland', 'Disneyland']);
    check('Paris → Disneyland : 90 € / 130 €', r.berline === 90 && r.van === 130 && /Disneyland/.test(r.forfait), JSON.stringify(r));
    r = await trajet(c, 35, ['boulogne', 'Boulogne'], T2E);
    check('Boulogne n\'est pas Paris : Boulogne → Roissy à 35 km paie la tranche (90 € / 130 €), sans forfait',
      r.berline === 90 && r.van === 130 && !r.forfait, JSON.stringify(r));
    r = await trajet(c, 25, ['gare de lyon', 'Gare de Lyon'], ['versailles', 'Versailles']);
    check('Gare de Lyon → Versailles (25 km) : 70 + 10 = 80 € / 120 €', r.berline === 80 && r.van === 120, JSON.stringify(r));
    check('grande gare : l\'accueil dit « à l\'arrivée de votre train »', /arrivée de votre train/.test(r.accueil), r.accueil);
    r = await trajet(c, 25, ['juvisy', 'Juvisy'], ['versailles', 'Versailles']);
    check('une petite gare n\'a pas d\'accueil : 70 € / 110 €', r.berline === 70 && r.van === 110 && !r.accueil, JSON.stringify(r));
    r = await trajet(c, 27, ['hilton', 'Hilton'], OPERA);
    check('un hôtel collé au terminal : forfait Roissy (70 €), mais pas d\'accueil', r.berline === 70 && !r.accueil, JSON.stringify(r));
    r = await trajet(c, 14, ['bourget', 'Bourget'], OPERA);
    check('Le Bourget → Paris (14 km) : 50 + 10 = 60 €, accueil compris', r.berline === 60 && /sortie des arrivées/.test(r.accueil), JSON.stringify(r));
    r = await trajet(c, 12.04, ['boulogne', 'Boulogne'], ['versailles', 'Versailles']);
    check('12,04 km se lit « 12 km » : 35 €', r.berline === 35, JSON.stringify(r));
    r = await trajet(c, 100, ['boulogne', 'Boulogne'], ['versailles', 'Versailles']);
    check('100 km : 90 + 58 × 2,50 = 235 → 230 € ; van 130 + 58 × 3,80 = 350,4 → 350 €', r.berline === 230 && r.van === 350, JSON.stringify(r));

    /* 3. LA DEMANDE : Gare de Lyon → Versailles, jusqu'au bout. */
    r = await trajet(c, 25, ['gare de lyon', 'Gare de Lyon'], ['versailles', 'Versailles']);
    await c.p.locator('.veh-carte').first().click();
    await c.p.locator('#btnContinuer').click(); await c.p.waitForTimeout(350);
    check('récapitulatif : total 80 €', nombre(await c.p.locator('#recapTotal').innerText()) === 80, await c.p.locator('#recapTotal').innerText());
    check('récapitulatif : la phrase « accueil compris » remplace la case à cocher',
      await c.p.locator('#accueilNote').isVisible() && !(await c.p.locator('#ecran-recap .opt-pancarte').isVisible()));
    check('récapitulatif : l\'aperçu de la pancarte est montré d\'office', await c.p.locator('#apercuPancarte').isVisible());
    check('récapitulatif : aucune ligne « option » ajoutée au total', await c.p.locator('#ligneOption').isHidden());
    await c.p.fill('#clientNom', 'Jean Martin');
    check('la pancarte porte le nom du client', (await c.p.locator('#pancarteNom').textContent()).trim() === 'JEAN MARTIN');
    await c.p.fill('#clientTel', '06 12 34 56 78');
    await c.p.evaluate(()=>{ if(document.querySelector('#blocContact [aria-pressed="true"]')) return; const b=[...document.querySelectorAll('#blocContact [data-contact]')].find(e=>e.offsetParent); if(b) b.click(); });
    await c.p.locator('#btnConfirmer').click().catch(() => {});
    await c.p.waitForTimeout(1200);
    const b = c.depots[0] || {};
    check('la demande part avec 80 €, « pancarte » et « accueil »',
      b.prix?.total === 80 && b.course?.pancarte === true && b.course?.accueil === true && b.course?.forfaitPublic === '',
      JSON.stringify({ t:b.prix?.total, p:b.course?.pancarte, a:b.course?.accueil, f:b.course?.forfaitPublic }));
    /* Le message, tel que « Renvoyer par WhatsApp » le compose. */
    const message = await c.p.evaluate(() => { document.getElementById('btnRenvoyer').click();
      const u = window.__liens[window.__liens.length - 1] || ''; return decodeURIComponent((u.split('text=')[1] || '')); });
    const lignes = message.split('\n'), iA = lignes.findIndex(l => /^Accueil : /.test(l)), iP = lignes.findIndex(l => /^Prix : /.test(l));
    check('le message porte la ligne d\'accueil, AVANT le prix et sans montant', iA > -1 && iA < iP && !/€/.test(lignes[iA]), lignes.join(' / '));
    check('le dernier montant du message est le prix total, 80 €', /^Prix : 80,00\s€$/.test(lignes[iP] || ''), lignes[iP]);
    await c.ctx.close();
  }

  /* 4. UNE GRILLE DU SERVEUR : juste, elle s'applique ; fausse, elle ne
        s'applique pas du tout. */
  {
    const juste = { tranches_km:[12,22,32,42],
      berline:{ tranches_centimes:[4000,5000,7000,9000], au_dela_km_centimes:250 },
      van:{ tranches_centimes:[5000,8000,11000,13000], au_dela_km_centimes:380 },
      forfaits:{ orly:{berline:6000,van:8000}, cdg:{berline:7000,van:11000}, disney:{berline:9000,van:13000} },
      accueil_centimes:1500 };
    let s = await client(juste);
    let r = await trajet(s, 10, ['boulogne', 'Boulogne'], ['versailles', 'Versailles']);
    check('grille du serveur juste : la première tranche passe à 40 €', r.berline === 40, JSON.stringify(r));
    r = await trajet(s, 21, ORLY1, OPERA);
    check('grille du serveur juste : forfait Orly 60 € + accueil 15 € = 75 €', r.berline === 75, JSON.stringify(r));
    await s.ctx.close();
    const fausse = JSON.parse(JSON.stringify(juste));
    fausse.berline.tranches_centimes = [4000, 3000, 7000, 9000];   // un prix qui baisse d'une tranche à l'autre
    s = await client(fausse);
    r = await trajet(s, 10, ['boulogne', 'Boulogne'], ['versailles', 'Versailles']);
    check('grille du serveur fausse : ignorée en entier, la page garde 35 €', r.berline === 35, JSON.stringify(r));
    r = await trajet(s, 21, ORLY1, OPERA);
    check('grille du serveur fausse : forfait et accueil de la page (65 €)', r.berline === 65, JSON.stringify(r));
    await s.ctx.close();
  }
  /* 5. LE « PRIX DES PAGES » EST RETIRÉ (23 octobre 2026, « oui
        désactive ») : un client venu de la page anglaise de Roissy paie le
        prix du site, même si le serveur publie encore une règle de page. */
  {
    const s = await client();
    const lus = [];
    await s.ctx.route('**/rest/v1/prix_pages_publics**', route => { lus.push(route.request().url());
      return route.fulfill(J([{ page:'en-cdg', pourcentage:50, berline_km_centimes:600, van_km_centimes:900 }])); });
    await s.p.goto(BASE + '/?src=en-cdg'); await s.p.waitForTimeout(500);
    const r = await trajet(s, 25, ['juvisy', 'Juvisy'], ['versailles', 'Versailles']);
    check('venu de /en/ (src=en-cdg) : le prix du site, 70 €', r.berline === 70, JSON.stringify(r));
    check('le site ne lit plus « prix_pages_publics »', lus.length === 0, lus.join(' | '));
    await s.ctx.close();
  }
  check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
} finally {
  await nav.close(); serveur.close();
}
console.log(`=== RÉUSSIS (${ok.length}) ===`);
if (ko.length) { console.log(`=== ÉCHECS (${ko.length}) ===`); ko.forEach(x => console.log('  ✘ ' + x)); console.log(''); }
process.exit(ko.length ? 1 : 0);
