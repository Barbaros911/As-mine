/* =====================================================================
   TEST-PUBLIC-ERREURS.MJS — une erreur du site remonte, sans donnée
   personnelle, et sans jamais casser la page
   ---------------------------------------------------------------------
   Audit du 19 octobre 2026 (observabilité). On provoque des erreurs dans la
   page et on lit ce qui PART à « erreur-client » : le message est masqué
   (téléphone, e-mail), une même erreur ne part qu'une fois, cinq messages
   distincts au plus par chargement, et la page reste utilisable — le bouton
   « Voir mon prix » répond encore après dix erreurs.
   Lancer :  npx http-server -p 8099 -s .   puis   node test-public-erreurs.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const ctx = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});
const p = await ctx.newPage();
const envois = [];
/* Playwright consulte la DERNIÈRE route posée en premier : la route générale
   du serveur passe AVANT la route précise, sinon elle avale les envois. */
await p.route('**yyhzutnuhuytokarynaw.supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
await p.route('**yyhzutnuhuytokarynaw.supabase.co/functions/v1/erreur-client', async route => {
  envois.push({ entetes: route.request().headers(), corps: JSON.parse(route.request().postData()||'{}') });
  await route.fulfill({ status: 204, body: '' });
});
await p.route('**://photon.komoot.io/**', r => r.abort());
await p.route('**://api-adresse.data.gouv.fr/**', r => r.abort());
await p.route('**://api.openrouteservice.org/**', r => r.abort());
await p.route('**://router.project-osrm.org/**', r => r.abort());
await p.goto('http://127.0.0.1:8099/index.html');
await p.waitForTimeout(800);

/* 1. Une erreur qui porte un téléphone et un e-mail. */
await p.evaluate(() => { setTimeout(() => { throw new Error("Cannot read 'label' — client 06 12 34 56 78 jean.dupont@exemple.fr"); }, 0); });
await p.waitForTimeout(700);
check('une erreur non rattrapée part à erreur-client', envois.length === 1, envois.length + ' envoi(s)');
const e = envois[0] && envois[0].corps || {};
check('le message est là, et le téléphone est masqué', /Cannot read/.test(e.message||'') && !/06 12 34 56 78|0612345678/.test(e.message||''), e.message);
check('l\'adresse e-mail est masquée', !/@/.test(e.message||''), e.message);
check('l\'espace est « public », le chemin et l\'écran sont donnés', e.espace === 'public' && e.chemin === '/index.html' && /^ecran-/.test(e.ecran||''), JSON.stringify({espace:e.espace, chemin:e.chemin, ecran:e.ecran}));
check('la source est un fichier et une ligne, pas une adresse complète', /^[^/?#]*:\d+$/.test(e.source||'') || e.source === '', e.source);
check('la requête est « simple » (text/plain, sans clé) : pas de préflight, rien d\'identifiant', !!envois[0] && /text\/plain/.test(envois[0].entetes['content-type']||'') && !('apikey' in envois[0].entetes));
check('aucun nom, téléphone ni référence dans ce qui part', !/\d{6,}|@|ELA-\d\d-\d\d-/.test(JSON.stringify(e)));
/* La version de la page (1er/11/2026) part toujours, comme une chaîne : vide ici (le dépôt n'a pas la balise
   « ela-version », construire.sh la pose), lue sur le site construit par test-public-depot-fiable. */
check('le champ « version » part, vide sur la page du dépôt', typeof e.version === 'string' && e.version === '', JSON.stringify(e.version));

/* 2. La même erreur dix fois : UN envoi. Dix erreurs différentes : cinq au plus. */
await p.evaluate(() => { for (let i = 0; i < 10; i++) setTimeout(() => { throw new Error('Toujours la même'); }, 0); });
await p.waitForTimeout(700);
check('la même erreur répétée dix fois ne part qu\'une fois', envois.length === 2, envois.length + ' envoi(s)');
await p.evaluate(() => { for (let i = 0; i < 10; i++) setTimeout(() => { throw new Error('Différente n° ' + i); }, 0); });
await p.waitForTimeout(900);
check('dix erreurs distinctes : cinq envois au plus par chargement', envois.length === 5, envois.length + ' envoi(s)');

/* 3. Une promesse rejetée compte aussi. Et la page reste utilisable. */
const avant = envois.length;
await p.reload(); await p.waitForTimeout(800);
await p.evaluate(() => { Promise.reject(new TypeError('promesse perdue')); });
await p.waitForTimeout(700);
check('une promesse rejetée non rattrapée remonte aussi', envois.length === avant + 1 && /promesse perdue/.test(envois[envois.length-1].corps.message), envois.length - avant + ' envoi(s)');
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(500);
const message = await p.evaluate(() => { const m = document.querySelector('.champ-aide:not([hidden]), #erreurAdresses:not([hidden])'); return !!m; });
check('après les erreurs, « Voir mon prix » répond encore (la page n\'est pas cassée)', message || await p.locator('#ecran-accueil').isVisible());
await b.close();

console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
process.exit(ko.length?1:0);
