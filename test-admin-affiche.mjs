/* =====================================================================
   TEST-ADMIN-AFFICHE.MJS — l'affiche de comptoir dans Admin v2
   ---------------------------------------------------------------------
   LE CODE QR EST ÉPROUVÉ PAR UN DÉCODEUR INDÉPENDANT, jamais par
   relecture maison : un encodeur relu par son propre auteur reproduit
   ses propres erreurs. Le premier jet de cet encodeur passait TOUS les
   contrôles internes — format, masque, zigzag, Reed-Solomon, syndromes
   nuls — et n'était lisible par AUCUN téléphone : l'information de
   format était écrite bit à l'envers. Seul un décodeur étranger l'a vu.

   LES TROIS CONTRÔLES QUI COMPTENT LE PLUS :

   1. LE QR NE POINTE JAMAIS SUR LE BACK-OFFICE. C'est le danger propre à
      cet espace : Admin v2 vit sur « /admin-v2.html », et prendre
      « location.pathname » tel quel — comme le fait légitimement la page
      cliente — fabriquerait des affiches qui envoient le client du
      comptoir dans l'espace exploitant. Rien à l'écran ne le dirait :
      l'affiche s'imprime, elle est simplement fausse, et on l'apprend
      quand cinquante exemplaires sont déjà sur des comptoirs.

   2. LE QR SE DÉCODE VRAIMENT, et rend EXACTEMENT l'adresse imprimée
      sous lui. C'est la seule preuve qu'une affiche se scanne.

   3. L'ENCODEUR N'EST PAS RECOPIÉ. Deux copies, dont une qui dérive, ce
      sont des affiches que personne ne peut scanner. Un contrôle lit la
      source des deux espaces.

   Lancer :  node test-admin-affiche.mjs   (elle construit et sert elle-même)
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

/* ═══ LE DÉCODEUR EST UN TIERS, ET SON ABSENCE EST UN ÉCHEC ═══
   « jsqr » vit dans le bac à sable ou dans « node_modules », jamais dans le
   dépôt. S'il manque, la suite S'ARRÊTE au lieu de sauter en silence le seul
   contrôle qui prouve qu'une affiche se scanne — même règle que « http_ece »
   pour le chiffrement des notifications. Une suite verte qui n'a pas décodé
   ne dit rien. */
async function chargerJsQR(){
  const bases = [process.cwd() + '/'];
  const bac = '/tmp/claude-0/-home-user-As-mine/';
  try { for(const d of await readdir(bac)) bases.push(join(bac, d, 'scratchpad') + '/'); }
  catch { /* pas de bac à sable ici : « node_modules » suffira, ou rien */ }
  for(const b of bases){
    try { const m = createRequire(b)('jsqr'); return m.default || m; } catch { /* suivant */ }
  }
  console.error("\n✘ « jsqr » est introuvable — le décodeur INDÉPENDANT est le seul\n"
    + "  contrôle qui prouve qu'une affiche se scanne. On s'arrête plutôt que de\n"
    + "  rendre un vert qui n'aurait rien décodé.\n"
    + "  Poser le paquet :  npm install --no-save jsqr\n");
  process.exit(1);
}
const jsQR = await chargerJsQR();

execSync('sh construire.sh', {stdio:'ignore'});
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript',
  '.mjs':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json',
  '.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg',
  '.ico':'image/x-icon','.txt':'text/plain','.xml':'application/xml'};
const serveur = createServer(async (req, res) => {
  try {
    let chemin = decodeURIComponent(req.url.split('?')[0]);
    chemin = normalize(chemin).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, {'Content-Type': TYPES[extname(f)] || 'application/octet-stream'});
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8100, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8100';
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));

/* Deux partenaires enregistrés. Le troisième hôtel du test n'en est PAS un :
   l'affiche est l'outil de prospection, on l'imprime avant de signer. */
const PARTENAIRES = [
  {id:'p1', nom:'easyHotel Aéroville', adresse_depart:'10 rue de la Belle Borne, Tremblay', actif:true},
  {id:'p2', nom:'Ibis CDG',            adresse_depart:'Roissypôle', actif:true},
];

/* ═══ LA NAVIGATION EST PASSÉE À TROIS ONGLETS ═══
   Accueil (« À traiter »), Courses, Gestion. Les cinq autres écrans n'ont
   pas disparu : ils vivent sous « Gestion », qui est une PORTE et non une
   copie. Un test doit donc emprunter le CHEMIN RÉEL de l'utilisateur —
   Gestion, puis l'entrée — au lieu de cliquer un onglet qui n'est plus
   dans la barre. C'est la même leçon que « un écran qu'aucun lien n'ouvre
   n'est pas accessible » : ce qu'on éprouve, c'est le chemin. */
async function allerOnglet(p, cle){
  const direct = p.locator(`#nav button[data-tab="${cle}"]`);
  if(await direct.count()){ await direct.click(); await p.waitForTimeout(150); return; }
  await p.click('#nav button[data-tab="gestion"]');
  await p.waitForSelector(`#s-gestion [data-tab="${cle}"]`, {state:'visible', timeout:10000});
  await p.click(`#s-gestion [data-tab="${cle}"]`);
  await p.waitForTimeout(150);
}

const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'fr-FR' });

/* UNE SEULE ROUTE QUI DÉCIDE DE TOUT. Deux routes obligent à connaître un
   ordre de priorité — et il n'est pas le même d'une version de Playwright à
   l'autre : une suite a déjà passé au vert ici et reçu zéro donnée en CI. */
await ctx.route('**/*', r => {
  const u = r.request().url();
  if(u.startsWith(BASE)) return r.continue();
  if(!u.includes('supabase.co')) return r.abort();
  const J = o => r.fulfill({contentType:'application/json', body:JSON.stringify(o)});
  if(u.includes('/rpc/est_exploitant')) return J(true);
  if(u.includes('/rest/v1/partenaires')) return J(PARTENAIRES);
  if(u.includes('/chauffeurs_etat')) return J([]);
  if(u.includes('/rest/v1/chauffeurs')) return J([]);
  if(u.includes('/actions_requises')) return J([]);
  if(u.includes('/rest/v1/courses')) return J([]);
  return J([]);
});

await ctx.addInitScript(() => {
  sessionStorage.setItem('ela_admin_session', JSON.stringify({
    access_token:'jeton-de-test', refresh_token:'r', user:{ email:'exploitant@test' } }));
});

const p = await ctx.newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message));
await p.goto(BASE+'/admin-v2.html', {waitUntil:'domcontentloaded'});
/* ON ATTEND CE QU'ON VEUT VOIR, jamais une durée : un délai fixe n'est pas
   une attente, c'est un pari sur la vitesse de la machine. */
await p.waitForFunction(()=>document.getElementById('affNom')
  && (state.partners||[]).length >= 2, null, {timeout:20000});

await allerOnglet(p, 'partners');
await p.waitForTimeout(150);

check("l'écran des hôtels porte l'affiche", await p.locator('#zoneAffiche').isVisible());
check("rien n'est dessiné tant qu'aucun hôtel n'est nommé",
  await p.locator('#affiche').isHidden());
check("et aucun bouton d'impression ne traîne", await p.locator('#affActions').isHidden());

/* ─── LA LISTE VIENT DU SERVEUR ─────────────────────────────────────── */
const options = await p.$$eval('#affPartenaire option', n => n.map(x => x.textContent));
check('le menu des hôtels vient du serveur, pas d\'une liste écrite en dur',
  options.includes('easyHotel Aéroville') && options.includes('Ibis CDG'), options.join(' | '));

await p.selectOption('#affPartenaire', 'Ibis CDG');
await p.waitForTimeout(250);
check("choisir un partenaire recopie son nom dans le champ imprimé",
  (await p.inputValue('#affNom')) === 'Ibis CDG', await p.inputValue('#affNom'));
check("saisir un nom fait apparaître l'affiche", await p.locator('#affiche').isVisible());
check("l'affiche porte le nom de l'hôtel",
  (await p.textContent('#affHotel')) === 'Ibis CDG');
check('et la marque, pour qu\'on sache qui envoie la voiture',
  (await p.textContent('.affiche-marque')).replace(/\s/g,'') === 'ELATRANSFER');
check("avec un numéro à appeler : tout le monde ne scanne pas",
  /\+33\s?7\s?59\s?31\s?24\s?33/.test(await p.textContent('.affiche-tel')));

/* ═══ LE CONTRÔLE QUI COMPTE LE PLUS : LE LIEN NE VISE PAS LE BACK-OFFICE ═══
   « location.pathname » vaut ici « /admin-v2.html ». Recopié tel quel, il
   fabriquerait une affiche qui envoie le client dans l'espace exploitant. */
const lien = (await p.textContent('#affLien')).trim();
check("LE LIEN VISE LE SITE CLIENT, jamais « admin-v2.html »",
  !/admin/i.test(lien), lien);
check("il part de la RACINE du site", lien === BASE + '/?h=Ibis%20CDG', lien);
check('le nom voyage EN CLAIR dans l\'adresse, pas en identifiant',
  decodeURIComponent(new URL(lien).searchParams.get('h')) === 'Ibis CDG');

/* ─── LE QR, DÉCODÉ PAR UN TIERS ────────────────────────────────────── */
check("le QR est dessiné en SVG : une affiche s'imprime, un canvas sort en bouillie",
  (await p.locator('#affQr svg').count()) === 1
  && (await p.locator('#affQr canvas').count()) === 0);
check("le SVG porte son « xmlns » : sans lui il ne peut plus être chargé comme image",
  /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(await p.innerHTML('#affQr')));

/* On rend le SVG FINAL en image, puis on le décode. Relire la matrice ne
   prouverait rien : c'est le fichier imprimé qui doit se scanner. */
async function decoderAffiche(){
  const svg = await p.innerHTML('#affQr');
  return await p.evaluate(async html => {
    const img = new Image();
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(html);
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const c = document.createElement('canvas');
    c.width = c.height = 400;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0,0,400,400);
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0, 400, 400);
    const d = g.getImageData(0,0,400,400);
    return {data: Array.from(d.data), w: d.width, h: d.height};
  }, svg);
}
async function lireQR(){
  const im = await decoderAffiche();
  const res = jsQR(Uint8ClampedArray.from(im.data), im.w, im.h);
  return res ? res.data : null;
}

const lu = await lireQR();
check("LE QR SE DÉCODE, et rend exactement l'adresse imprimée sous lui",
  lu === lien, String(lu));

/* Un hôtel PAS partenaire : l'affiche est l'outil de prospection, on
   l'imprime avant de signer. Et un nom long ne doit pas casser l'encodeur. */
await p.fill('#affNom', 'Hôtel Mercure Roissy Charles de Gaulle');
await p.waitForTimeout(300);
const lien2 = (await p.textContent('#affLien')).trim();
check("un hôtel pas encore partenaire se saisit à la main",
  await p.locator('#affiche').isVisible() && /Mercure/.test(await p.textContent('#affHotel')));
check("son QR se décode aussi, nom long compris", (await lireQR()) === lien2, lien2);
check("et lui non plus ne vise pas le back-office", !/admin/i.test(lien2), lien2);

/* Vider le champ retire l'affiche : une affiche « Votre hôtel » imprimée par
   mégarde est du papier perdu, et un QR sans provenance. */
await p.fill('#affNom', '');
await p.waitForTimeout(250);
check("vider le nom retire l'affiche et son bouton d'impression",
  await p.locator('#affiche').isHidden() && await p.locator('#affActions').isHidden());

/* ─── À L'IMPRESSION, SEULE L'AFFICHE SORT ──────────────────────────── */
await p.fill('#affNom', 'Ibis CDG');
await p.waitForTimeout(300);
await p.emulateMedia({media:'print'});
/* ON MESURE LA VISIBILITÉ CALCULÉE, on ne relit pas la feuille de style :
   une règle d'affichage se casse sans bruit, il suffit d'un sélecteur trop
   large. Sans elle, le tableau de bord — NOMS ET TÉLÉPHONES DE CLIENTS —
   partirait sur le papier posé au comptoir d'un hôtel. */
const vu = await p.evaluate(() => {
  const v = s => { const n = document.querySelector(s);
    return n ? getComputedStyle(n).visibility === 'visible' : null; };
  return {affiche:v('#affiche'), qr:v('#affQr svg'), hotel:v('#affHotel'),
          entete:v('header.top'), nav:v('#nav'), bord:v('#s-dashboard')};
});
await p.emulateMedia({media:'screen'});
check("à l'impression, l'affiche et son QR sortent",
  vu.affiche === true && vu.qr === true && vu.hotel === true, JSON.stringify(vu));
check("et RIEN du back-office : il porte des noms et des téléphones de clients",
  vu.entete === false && vu.nav === false && vu.bord === false, JSON.stringify(vu));

/* ═══ L'ENCODEUR N'EST PAS RECOPIÉ ══════════════════════════════════════
   Le contrôle vise la SOURCE des deux espaces. Deux copies, dont une qui
   dérive, ce sont des affiches imprimées que personne ne peut scanner. */
const srcAdmin  = await readFile('admin-v2-affiche.js', 'utf8');
const srcClient = await readFile('index.html', 'utf8');
const srcPartage = await readFile('qr-affiche.js', 'utf8');
check("le module Admin v2 ne réimplémente pas l'encodeur, il l'appelle",
  !/0x11D|polyGen|Reed|function qrMatrice/.test(srcAdmin) && /ELA_QR/.test(srcAdmin));
check("le site client non plus : il a déménagé, il n'a pas été recopié",
  !/0x11D|function qrMatrice/.test(srcClient) && /ELA_QR/.test(srcClient));
check("et le fichier partagé le porte bien, une seule fois",
  (srcPartage.match(/function qrMatrice/g)||[]).length === 1);
/* LA BASE EST UN PARAMÈTRE OBLIGATOIRE : un défaut caché fabriquerait des
   affiches vers le back-office sans que rien ne le dise. */
check("le fichier partagé REFUSE une base absente au lieu d'en inventer une",
  await p.evaluate(() => { try { window.ELA_QR.lien('', 'Ibis'); return false; }
                           catch(e){ return /obligatoire/.test(e.message); } }));
check("les deux espaces servent le MÊME fichier, depuis le site et jamais un CDN",
  !/cdn|unpkg|jsdelivr/i.test(await p.evaluate(() =>
    [...document.scripts].map(s=>s.src).join(' '))));

check('aucune erreur JavaScript sur toute la traversée', errs.length === 0, errs.join(' | '));

await b.close(); serveur.close();
if(ok.length) console.log('=== RÉUSSIS ('+ok.length+') ===\n' + ok.map(x=>'  ✔ '+x).join('\n'));
if(ko.length){ console.log('\n=== ÉCHECS ('+ko.length+') ===\n' + ko.map(x=>'  ✘ '+x).join('\n'));
  process.exit(1); }
console.log('\nAffiche hôtel Admin v2 : ' + ok.length + ' contrôles au vert.');
