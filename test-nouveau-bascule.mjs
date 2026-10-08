/* =====================================================================
   TEST-NOUVEAU-BASCULE.MJS — ce que la racine doit porter
   ---------------------------------------------------------------------
   Le nouveau site a pris la place de l'ancien. Trois choses arrivent
   avec la racine, et aucune ne se voit à l'écran — c'est exactement
   pour ça qu'elles ont besoin d'un test.

   — LE RÉFÉRENCEMENT. Une page sans titre ni description disparaît de
     Google en quelques jours, et personne ne s'en aperçoit avant que
     le téléphone arrête de sonner. Depuis le 4 octobre 2026 (titre et
     description validés par Barbaros), le titre MÈNE avec la marque et
     dit ce qu'elle vend — des transferts — et la description nomme les
     deux aussi. L'ancienne règle (« le métier avant les aéroports »)
     datait de l'époque où le site se vendait comme chauffeur privé ;
     elle est tombée avec ce positionnement, et un contrôle qui la
     gardait aurait exigé un texte que Barbaros a retiré.
   — « noindex » A DISPARU. Il protégeait le site pendant sa
     construction ; laissé en place, il interdit purement et simplement
     l'indexation de la page d'accueil.
   — L'APPLICATION INSTALLABLE. Le manifeste et les icônes existaient
     pour l'ancien site. Sans les trois lignes qui les déclarent, un
     client qui a « ajouté à l'écran d'accueil » verrait son icône
     disparaître le jour de la bascule.
   — LES DOCUMENTS LÉGAUX sont accessibles SANS COMPTE, depuis le site
     client, dans les deux langues. La LCEN l'impose ; les cacher
     derrière le mode exploitant serait la faute classique.
   — LES CGV DÉCRIVENT LA GRILLE RÉELLE. Le prix d'Elatransfer est
     ferme et opposable : des CGV qui décrivent une autre formation du
     prix que celle appliquée sont le pire des documents — elles
     donnent au client un argument contre nous.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-bascule.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createHash } from 'node:crypto';

/* =====================================================================
   CETTE SUITE ÉPROUVE LE SITE CONSTRUIT, PAS LE DÉPÔT
   ---------------------------------------------------------------------
   Ajouté le 16 septembre 2026, après deux contrôles rouges depuis des
   jours. Ils cherchaient « application.html », qui N'EXISTE PAS dans le
   dépôt : « construire.sh » le fabrique (`cp site/index.html
   site/application.html`). La suite interrogeait le serveur du dépôt et
   concluait au fichier manquant.

   C'EST LA VRAIE CAUSE, ET ELLE DÉPASSE CES DEUX CONTRÔLES : ce qui est
   servi en local n'est PAS ce qui est publié. « construire.sh » copie une
   liste explicite et applique cinq transformations. Un fichier oublié dans
   la recette marche parfaitement ici, où le serveur sert le dépôt entier,
   et reste introuvable en ligne. Une suite qui n'éprouve que le dépôt ne
   peut pas voir ça — or c'est précisément le sujet de CE fichier.

   On construit donc, et on sert « site/ » sur un second port. Le reste de
   la suite garde le dépôt : pour un fichier copié tel quel, les deux sont
   identiques, et déplacer soixante adresses risquerait plus que ça
   n'apporte. Ce qui touche à l'ARTEFACT PUBLIÉ vise SITE. */
execSync('sh construire.sh', { cwd: process.cwd(), stdio: 'ignore' });

const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript',
  '.mjs':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json',
  '.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg',
  '.ico':'image/x-icon','.txt':'text/plain','.xml':'application/xml'};
const serveur = createServer(async (req, res) => {
  try {
    let chemin = decodeURIComponent(req.url.split('?')[0]);
    /* NORMALIZE PUIS RETRAIT DES « .. » : sans ça, une adresse pourrait
       remonter hors de « site/ ». Le serveur ne vit qu'une minute, mais un
       bac à sable qui laisse sortir n'est pas un bac à sable. */
    chemin = normalize(chemin).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { res.writeHead(404).end('non'); return; }
    const corps = await readFile(f);
    res.writeHead(200, {'Content-Type': TYPES[extname(f)] || 'application/octet-stream'});
    res.end(corps);
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8098, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:8098';

const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];
const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
const p = await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message));

// LA RACINE, pas « /index.html » : c'est l'adresse que Google indexe et
// celle que les clients ouvrent.
await p.goto('http://127.0.0.1:8099/',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(500);

check('la racine sert bien le nouveau site',
  await p.locator('#ecran-accueil').isVisible()
  && (await p.locator('.veh-liste, #btnVoirPrix').count()) > 0);

// ---- Le référencement ----
const titre = await p.title();
check('la page a un titre', titre.length > 10 && titre.includes('Elatransfer'), titre);
// LA MARQUE D'ABORD, puis ce qu'elle vend (4 octobre 2026). On vérifie la
// règle, pas le libellé du jour : une reformulation légitime doit passer,
// un titre qui rangerait la marque en queue ou oublierait le métier non.
check('le titre mène avec la marque', titre.trim().toLowerCase().startsWith('elatransfer'), titre);
check('…et dit ce qu\'on vend : des transferts', /transfert/i.test(titre), titre);
const desc = await p.getAttribute('meta[name=description]','content');
check('la page a une description', desc && desc.length > 80 && desc.length < 320,
  String(desc && desc.length));
check('la description nomme la marque et le métier',
  /elatransfer/i.test(desc || '') && /transfert/i.test(desc || ''), String(desc));
// Le site construit réécrit ces deux lignes (`seo-ela.mjs`) : dépôt et site
// publié doivent dire la même chose, sinon Google lit l'un et le client
// l'autre. On compare au site servi sur SITE, pas à une constante recopiée.
{
  const pub = await (await fetch(SITE + '/')).text();
  const tPub = (pub.match(/<title>([^<]*)<\/title>/i) || [, ''])[1]
    .replace(/&amp;/g, '&').trim();
  const dPub = (pub.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [, ''])[1];
  check('le site construit porte le même titre que le dépôt',
    tPub === titre.replace(/&amp;/g, '&').trim(), tPub + ' ≠ ' + titre);
  check('et la même description', dPub === desc, dPub.slice(0, 60) + '… ≠ ' + String(desc).slice(0, 60));
  // LES APERÇUS DE PARTAGE (Facebook, WhatsApp, Twitter). Le site publié en
  // porte DEUX exemplaires : celui de la page, puis celui que `seo-ela.mjs`
  // ajoute. Le 4 octobre 2026, le premier vendait encore « mises à
  // disposition », retirée du site en septembre, et c'est en général le
  // premier qu'un réseau social lit. On exige donc que TOUS disent la
  // description de la page, pas seulement l'un d'eux.
  const apercus = [...pub.matchAll(/<meta\s+(?:property|name)=["'](?:og|twitter):description["']\s+content=["']([^"']*)["']/gi)]
    .map(m => m[1]);
  check('chaque aperçu de partage dit la description de la page',
    apercus.length >= 2 && apercus.every(a => a === desc),
    apercus.filter(a => a !== desc).map(a => a.slice(0, 50)).join(' | ') || apercus.length + ' trouvé(s)');
}

const robots = await p.getAttribute('meta[name=robots]','content');
check('« noindex » a disparu — sinon la page ne serait jamais indexée',
  !!robots && !robots.includes('noindex'), String(robots));
check('l\'adresse canonique est la racine du domaine',
  (await p.getAttribute('link[rel=canonical]','href'))==='https://elatransfer.com/',
  await p.getAttribute('link[rel=canonical]','href'));

/* AUCUN « hreflang » TANT QUE L'ANGLAIS N'A PAS SA PROPRE ADRESSE
   (5 octobre 2026). Le premier jet déclarait « fr » et « en » sur la même
   adresse : pour Google ça ne veut rien dire. Une langue déclarée doit
   avoir une adresse à elle, différente de celle-ci. */
const hreflangs = await p.$$eval('link[rel=alternate][hreflang]', l=>l.map(x=>x.hreflang+'='+x.href));
check('aucune langue déclarée sur la même adresse que la page',
  !hreflangs.some(h=>h.endsWith('=https://elatransfer.com/') && !h.startsWith('fr=') && !h.startsWith('x-default=')),
  hreflangs.join(', '));

/* UNE SEULE ENTREPRISE DANS LES DONNÉES STRUCTURÉES (5 octobre 2026).
   La page construite en déclarait trois sans lien entre elles
   (« LimousineService », « LocalBusiness », « WebSite ») : trois entreprises
   possibles pour Google. On lit le SITE CONSTRUIT, là où seo-ela.mjs
   ajoutait les deux autres. Jamais « VTC » (Barbaros ne veut pas
   l'afficher), jamais « TaxiService » (pas de maraude), aucun avis. */
{
  const pd = await b.newPage();
  await pd.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await pd.goto(SITE + '/', { waitUntil: 'domcontentloaded' });
  const blocs = await pd.$$eval('script[type="application/ld+json"]', l => l.map(s => s.textContent));
  check('la page construite ne porte qu\'un seul bloc de données structurées', blocs.length === 1, String(blocs.length));
  let ld = {}; try { ld = JSON.parse(blocs[0] || '{}'); } catch (e) { check('les données structurées se lisent', false, e.message); }
  const noeuds = ld['@graph'] || [ld];
  const orgs = noeuds.filter(n => ['Organization','LocalBusiness','LimousineService','TaxiService'].includes(n['@type']));
  check('une seule entreprise déclarée, l\'« Organization » #organisation',
    orgs.length === 1 && orgs[0]['@type'] === 'Organization' && orgs[0]['@id'] === 'https://elatransfer.com/#organisation',
    orgs.map(o => o['@type'] + ' ' + o['@id']).join(', '));
  const refs = noeuds.filter(n => n !== orgs[0]).map(n => (n.provider || n.publisher || {})['@id']);
  check('les autres éléments désignent cette entreprise, sans en créer une autre',
    refs.length >= 1 && refs.every(r => r === 'https://elatransfer.com/#organisation'), refs.join(', '));
  const brut = blocs.join(' ');
  check('jamais « VTC » ni « TaxiService » dans les données structurées', !/VTC|TaxiService/.test(brut));
  check('aucune note ni avis déclarés — nous n\'en avons reçu aucun', !/aggregateRating|"review"/.test(brut));
  const telPage = (await pd.getAttribute('a[href^="tel:"]', 'href') || '').replace('tel:', '');
  check('le téléphone déclaré est celui de la page', orgs[0] && orgs[0].telephone === telPage, (orgs[0]||{}).telephone + ' / ' + telPage);
  await pd.close();
}

// ---- L'application installable ----
check('le manifeste est déclaré',
  (await p.locator('link[rel=manifest]').count())===1);
// iOS ignore un apple-touch-icon en SVG : d'où le PNG de 180 px.
check('l\'icône iOS est un PNG, pas un SVG',
  (await p.getAttribute('link[rel="apple-touch-icon"]','href')||'').endsWith('.png'),
  await p.getAttribute('link[rel="apple-touch-icon"]','href'));
const man = await (await p.request.get('http://127.0.0.1:8099/manifest.webmanifest')).json();
/* LA MARQUE S'ÉCRIT « ELA Transfer » OU « Elatransfer » selon l'endroit —
   l'enseigne, le manifeste et les documents légaux n'ont jamais été alignés
   là-dessus, et ce n'est pas le sujet de ce contrôle. Il figeait la graphie
   sans espace et tombait depuis que le manifeste dit « ELA Transfer ».
   CE QU'IL DOIT GARANTIR, et qui compte vraiment : le manifeste porte bien
   la marque (et pas le nom d'un autre site du dépôt), et « start_url » ouvre
   la RACINE — une icône posée par un client doit rouvrir le site client. */
check('le manifeste est lisible et porte la marque',
  /ela\s?transfer/i.test(man.name || '') && man.start_url === './', man.name);
// « addAll » est tout ou rien : un seul fichier manquant et le service
// worker ne s'installe pas, sans le moindre message.
/* LE SERVICE WORKER DU SITE PUBLIÉ, et les fichiers qu'il réclame y sont
   cherchés : « addAll » est tout ou rien, et c'est EN LIGNE qu'un fichier
   manquant empêche l'installation, sans le moindre message. */
const sw = await (await p.request.get(SITE + '/sw.js')).text();
const shell = (sw.match(/const SHELL = \[([^\]]*)\]/)||[])[1] || '';
const fichiers = [...shell.matchAll(/"\.\/([^"]*)"/g)].map(m=>m[1]).filter(Boolean);
const manquants = [];
for(const f of fichiers){
  const r = await p.request.get(SITE + '/' + f);
  if(!r.ok()) manquants.push(f);
}
check('chaque fichier du cache existe vraiment — « addAll » est tout ou rien',
  manquants.length===0, manquants.join(', '));
check('« styles.css » n\'est plus dans le cache : il est parti avec l\'ancien site',
  !shell.includes('styles.css'));

/* =====================================================================
   TOUT CE QUE LA PAGE CHARGE DOIT ÊTRE PUBLIÉ
   ---------------------------------------------------------------------
   Barbaros : « je ne vois pas la carte s'afficher ». La bibliothèque de
   carte vit maintenant dans le dépôt, et « construire.sh » ne publie QUE ce
   qui y est nommé — c'est sa force, et c'est aussi son piège : un fichier
   oublié dans la liste marche parfaitement en local, où le serveur de test
   sert le dépôt entier, et reste introuvable en ligne.
   ON VÉRIFIE DONC LA RECETTE, pas seulement la page. Chercher les fichiers
   sur le serveur local ne prouverait rien : ils y sont de toute façon.
   ===================================================================== */
{
  const brut = await (await p.request.get('http://127.0.0.1:8099/construire.sh')).text();
  /* ON NE LIT QUE LES COMMANDES, JAMAIS LES COMMENTAIRES. Le premier jet
     cherchait le mot dans le fichier entier : mes propres commentaires
     parlaient de « carte », le contrôle passait au vert avec la ligne de
     copie retirée — éprouvé. Un test qui trouve ce qu'il cherche dans une
     phrase d'explication ne vérifie rien. */
  const recette = brut.split('\n')
    .filter(l => !/^\s*#/.test(l) && /\bcp\b/.test(l)).join('\n');
  const html = await (await p.request.get('http://127.0.0.1:8099/index.html')).text();
  /* Les chemins relatifs que la PAGE va chercher d'elle-même : on lit ce
     qu'elle demande plutôt que d'écrire une liste à tenir à jour. */
  const demandes = [...new Set([...html.matchAll(/"\.\/([A-Za-z0-9_\-/.]+\.(?:js|css|png|svg|webmanifest))"/g)]
    .map(m => m[1]))];
  const oublies = demandes.filter(f => {
    const dossier = f.includes('/') ? f.split('/')[0] : f;
    return !recette.includes(dossier);
  });
  check('« construire.sh » publie TOUT ce que la page va chercher',
    oublies.length === 0, oublies.join(', ') || 'rien d\'oublié');
  check('la bibliothèque de carte est bien COPIÉE, pas seulement mentionnée',
    /\bcarte\b/.test(recette), recette.replace(/\n/g,' ; ').slice(0,120));
}

// ---- L'ancien site n'est plus servi ----
// Le garder en ligne laisserait une page trouvable qui annonce une GRILLE
// PÉRIMÉE, et chez Elatransfer le prix est ferme donc opposable.
for(const mort of ['nouveau.html','ancien.html','styles.css']){
  const r = await p.request.get('http://127.0.0.1:8099/'+mort);
  check('« '+mort+' » n\'est plus publié', !r.ok(), String(r.status()));
}

// ---- Les documents légaux ----
/* ILS ONT CHANGÉ DE PORTE, PAS DE STATUT. L'onglet « Contact » a cédé sa
   place à WhatsApp dans la barre du bas ; le numéro et les trois documents
   sont descendus en PIED D'ACCUEIL. La LCEN exige qu'ils restent
   accessibles sans compte, pas qu'ils aient un onglet — mais le chemin,
   lui, doit exister : on l'emprunte ici plutôt que d'ouvrir l'écran à la
   main, parce qu'un écran qu'aucun lien n'ouvre n'est pas accessible. */
await p.locator('.pied-lien').click();
await p.waitForTimeout(300);
const docs = await p.locator('#ecran-contact [data-doc]').allTextContents();
check('les trois documents s\'atteignent depuis le pied de l\'accueil',
  docs.length===3, docs.join(' | '));
check('ils sont accessibles sans compte ni mode exploitant',
  await p.locator('#ecran-contact [data-doc="cgv"]').isVisible());

await p.locator('#ecran-contact [data-doc="cgv"]').click();
await p.waitForTimeout(300);
const cgv = await p.locator('#legalCorps').textContent();
check('les CGV s\'ouvrent', await p.locator('#ecran-legal').isVisible());
check('et elles sont longues : c\'est un contrat, pas un résumé',
  cgv.length > 3000, cgv.length+' caractères');
// LE POINT QUI COMPTE : des CGV qui décrivent une autre formation du prix
// que celle appliquée donneraient au client un argument contre nous.
check('les CGV décrivent la grille RÉELLE : tarif au kilomètre',
  /kilom[eé]trique/i.test(cgv));
check('… l\'arrondi à la dizaine', /arrondi à la dizaine/i.test(cgv));
check('… et le montant minimum par course', /montant minimum/i.test(cgv));
check('elles ne promettent plus une mise à disposition réservable en ligne',
  /ne se réservent pas depuis le Service/i.test(cgv));
check('le mode de règlement déclaré par le client y figure',
  /indique son mode de règlement/i.test(cgv));
check('le barème d\'annulation y est, avec sa fenêtre gratuite',
  /24 heures/.test(cgv) && /30 %/.test(cgv) && /50 %/.test(cgv));
check('plus aucun « {{m}} » non remplacé', !cgv.includes('{{m}}'));

/* AUCUN TROU DANS AUCUN DOCUMENT, dans les deux langues.
   À sa demande : « je ne veux pas de trous d'incohérence ». Un document qui
   dit « [À compléter] » à un client ne fait pas l'effet d'un brouillon — il
   fait l'effet d'une société qui ne sait pas qui elle est. On préfère un
   document court et vrai à un formulaire vide.
   Le contrôle cherche le CROCHET, pas la formule : c'est la forme que
   prennent tous ces trous, et elle survivrait à une reformulation. */
const trous = await p.evaluate(()=>{
  const t = window.ELA_TEXTES, mauvais = [];
  for (const lang of ['fr','en'])
    for (const doc of ['cgv','mentions','privacy']) {
      const corps = t[lang]['legal_' + doc + '_body'] || '';
      (corps.match(/\[[^\]]*\]/g) || []).forEach(x => mauvais.push(lang+'/'+doc+' '+x));
      if (/à compléter|to complete|to be completed/i.test(corps))
        mauvais.push(lang+'/'+doc+' : « à compléter »');
    }
  return mauvais;
});
check('aucun « [À compléter] » nulle part, dans les deux langues',
  trous.length===0, trous.join(' | '));

/* On ne nomme pas un médiateur de la consommation tant qu'aucun n'est
   désigné : le client écrirait à une adresse morte en croyant avoir saisi
   un recours. La voie de réclamation, elle, doit rester écrite. */
check('aucun médiateur inventé', !/médiateur de la consommation suivant|mediator:/i.test(cgv));
check('mais la voie de réclamation reste écrite',
  /contact@elatransfer\.com/.test(cgv) && /réclamation/i.test(cgv));

/* LA CONFIDENTIALITÉ DÉCRIT LES FLUX RÉELS. Un nom de prestataire absent
   empêche le client de comprendre où part son adresse ; un bandeau cookies
   annoncé mais inexistant est tout aussi faux. */
const privacy = await p.evaluate(()=>window.ELA_TEXTES.fr.legal_privacy_body);
check('la politique nomme les prestataires réellement utilisés',
  ['Supabase','Base Adresse Nationale','Photon','OpenRouteService','OSRM',
   'WhatsApp','GitHub','Google Fonts'].every(n=>privacy.includes(n)));
check('elle explique le stockage local des réservations',
  /stockage local du navigateur/.test(privacy) && /historique des demandes/.test(privacy));
check('elle ne prétend plus déposer des cookies marketing',
  /n.active aucun outil de mesure d.audience publicitaire ou marketing/i.test(privacy)
  && !/cookies statistiques et marketing, uniquement/i.test(privacy));
check('elle précise qu.aucune donnée bancaire n.est collectée',
  /aucune donnée de carte bancaire/i.test(privacy));

// Un document se lit sur 390 px sans partir de côté.
check('le document ne déborde pas en largeur',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);
await p.locator('#btnRetourLegal').click(); await p.waitForTimeout(250);
check('le retour ramène à Contact', await p.locator('#ecran-contact').isVisible());

// Les mentions légales : c'est le document que la LCEN impose nommément.
await p.locator('[data-doc="mentions"]').click(); await p.waitForTimeout(250);
const mentions = await p.locator('#legalCorps').textContent();
check('les mentions légales nomment l\'éditeur et l\'hébergement',
  /Elatransfer/.test(mentions) && /[Hh][ée]bergement|Hosting/.test(mentions));

// ---- Les deux langues ----
await p.locator('.langues button[data-langue="en"]').click();
await p.waitForTimeout(350);
check('le document suit la langue du visiteur, titre ET corps',
  (await p.locator('#legalTitre').textContent())==='Legal notice'
  && (await p.locator('#legalCorps').textContent()).includes('LEGAL NOTICE'),
  await p.locator('#legalTitre').textContent());

check('aucune erreur JavaScript', errs.length===0, errs.join(' | '));
await ctx.close(); /* ═══ L'ESPACE EXPLOITANT A SON PROPRE MANIFESTE ═══
   Septembre 2026, à sa demande : « comment je peux l'enregistrer sur mon
   téléphone ». Le piège n'était pas dans le geste mais dans le fichier : le
   manifeste ordinaire déclare « start_url: ./ », donc une icône posée sur
   l'écran d'accueil depuis « ?exploitant=1 » aurait rouvert **le site
   client**. iOS et Android lisent le manifeste de la page qu'on ajoute, pas
   son adresse — et rien à l'écran n'aurait expliqué pourquoi.
   TROIS CONTRÔLES, PARCE QUE TROIS CHOSES PEUVENT MANQUER : l'échange dans
   la page, le point de départ dans le fichier, et la COPIE par
   « construire.sh » — ce dernier est le point de rupture, il marche en
   local où le serveur sert tout le dépôt, et reste introuvable en ligne. */
{
  /* Un contexte à part : celui de la suite est refermé plus haut. */
  const cx = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});
  const pm = await cx.newPage();
  await pm.goto('http://127.0.0.1:8099/index.html', {waitUntil:'domcontentloaded'});
  const cote = await pm.locator('#manifeste').getAttribute('href');
  check('côté client, le manifeste ordinaire',
    cote === 'manifest.webmanifest', cote);
  await pm.goto('http://127.0.0.1:8099/index.html?exploitant=1', {waitUntil:'domcontentloaded'});
  const cotex = await pm.locator('#manifeste').getAttribute('href');
  check('côté exploitant, le manifeste de l\'espace',
    cotex === 'manifest-exploitant.webmanifest', cotex);
  const mf = await (await fetch('http://127.0.0.1:8099/manifest-exploitant.webmanifest')).json();
  check('il rouvre l\'espace, pas le site client',
    mf.start_url === '/ela-admin/', mf.start_url);
  /* ON COMPARE LES DEUX MANIFESTES L'UN À L'AUTRE, on ne compte plus.
     Le contrôle exigeait « 3 icônes » — le compte du jour où il a été
     écrit. Le jeu est passé à deux, légitimement, et il est tombé alors
     que rien n'était cassé. Même faute que la barre du bas figée sur
     quatre onglets.
     LA RÈGLE, ELLE, NE VIEILLIT PAS : un jeu d'icônes à moitié changé est
     pire qu'un ancien cohérent — le téléphone montre l'une, l'onglet
     l'autre. Donc les deux manifestes portent EXACTEMENT les mêmes, et il
     y en a au moins une. */
  const jeu = m => JSON.stringify((m.icons || []).map(i => i.src + '|' + i.sizes).sort());
  const mc = await (await fetch('http://127.0.0.1:8099/manifest.webmanifest')).json();
  /* 29/09/2026, à sa demande : l'espace a SON icône (ELA bleu sur noir),
     pour ne plus la confondre avec le site public. La règle du jeu cohérent
     porte désormais sur l'espace lui-même : toutes ses tailles viennent du
     même jeu, et aucune n'est celle du site client. */
  check('et il porte SES icônes, toutes du même jeu, distinctes du site client',
    (mf.icons || []).length >= 1 && (mf.icons || []).every(i => i.src.startsWith('icones/admin-'))
      && jeu(mf) !== jeu(mc),
    jeu(mf) + ' contre ' + jeu(mc));
  await cx.close();
}
/* LE POINT DE RUPTURE : la recette ne publie que ce qu'elle NOMME. On lit
   les seules lignes de commande, pas les commentaires — un contrôle qui
   trouve ce qu'il cherche dans une phrase d'explication ne vérifie rien. */
{
  const recette = await (await fetch('http://127.0.0.1:8099/construire.sh')).text();
  const commandes = recette.split('\n').filter(l => !l.trim().startsWith('#')).join('\n');
  check('« construire.sh » publie le manifeste de l\'espace',
    /manifest-exploitant\.webmanifest/.test(commandes));
  /* LE MOT « exploitant » EST DÉJÀ DANS LA RECETTE — au milieu de
     « manifest-exploitant.webmanifest », copié deux lignes plus haut. Un
     contrôle qui le chercherait passerait au vert avec la ligne du DOSSIER
     retirée : c'est la même faute que le premier jet du contrôle de
     « carte/ », qui se trouvait lui-même dans un commentaire. On cherche
     donc la copie du dossier, pas le mot. */
  check('« construire.sh » publie le dossier « exploitant/ »',
    /cp\s+-r\s+exploitant\b/.test(commandes));
}

/* =====================================================================
   L'ADRESSE « /exploitant/ »
   ---------------------------------------------------------------------
   Septembre 2026, à sa demande : « elatransfer.com/exploitant ». C'est
   l'adresse qu'il retient ; « /admin.html » demandait de se rappeler une
   extension de fichier.
   ON ÉPROUVE OÙ ELLE MÈNE, PAS CE QU'ELLE CONTIENT. Un raccourci qui
   existe mais tombe à côté est pire qu'aucun raccourci : il rend un 404 à
   quelqu'un qui a tapé la bonne adresse. Le piège précis est le chemin
   relatif — cette page vit dans un SOUS-DOSSIER, un « ./ » recopié depuis
   « admin.html » viserait « /exploitant/index.html » et bouclerait.
   ===================================================================== */
{
  const cx = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});
  const px = await cx.newPage();
  await px.route('**://api.openrouteservice.org/**', r=>r.abort());

  /* ELLE NE REDIRIGE PLUS, ET C'EST VOULU (septembre 2026). Une page qui
     part en quelques millisecondes ne laisse pas le temps d'appuyer sur
     « Partager » : le geste « ajouter à l'écran d'accueil » atterrissait
     sur la page d'arrivée, dont le manifeste est celui du site CLIENT, et
     l'icône posée rouvrait le site public. C'est désormais la page qu'on
     AJOUTE ; « admin.html » garde la redirection immédiate.
     ON ÉPROUVE DONC OÙ MÈNE LE BOUTON, pas si la page s'en va. */
  /* SUR LE SITE CONSTRUIT : le bouton vise « ../application.html », que
     seul « construire.sh » fabrique. Depuis le dépôt il ouvrait un 404, et
     le contrôle du verrou tombait sans qu'il y ait le moindre défaut. */
  await px.goto(SITE + '/exploitant/', {waitUntil:'domcontentloaded'});
  await px.waitForTimeout(400);
  check('« /exploitant/ » reste en place, pour qu\'on puisse l\'ajouter',
    /\/exploitant\//.test(px.url()), px.url());
  await px.locator('a.ouvrir').click();
  await px.waitForTimeout(900);
  check('« /exploitant/ » ouvre bien l\'espace exploitant',
    /\/ela-admin\//.test(px.url()) && !/\/exploitant\//.test(px.url()), px.url());
  check('et elle s\'arrête sur le verrou, jamais sur le tableau de bord',
    await px.locator('#ecran-verrou').isVisible());

  /* LES PARAMÈTRES SUIVENT : un lien de course ouvert depuis cette adresse
     doit continuer de fonctionner, comme depuis « admin.html ». Le bouton
     les emporte — c'est la seule chose que le script de cette page fait. */
  await px.goto('http://127.0.0.1:8099/exploitant/?a=ZZZ', {waitUntil:'domcontentloaded'});
  await px.waitForTimeout(400);
  await px.locator('a.ouvrir').click();
  await px.waitForTimeout(900);
  check('elle transmet les paramètres reçus',
    /a=ZZZ/.test(px.url()) && /\/ela-admin\//.test(px.url()), px.url());

  /* ELLE N'A RIEN À FAIRE DANS GOOGLE. Ce n'est pas un secret — c'est une
     serrure derrière, pas un coffre — mais une page de travail indexée sort
     dans les résultats à côté du site public, et c'est exactement ce qu'il
     ne veut pas voir. */
  const brutX = await (await fetch('http://127.0.0.1:8099/exploitant/index.html')).text();
  check('« /exploitant/ » porte « noindex »', /noindex/.test(brutX));

  /* ET LE CHEMIN DE SECOURS AUSSI : si le script ne part pas — bloqueur,
     JavaScript coupé — le lien visible reste le seul chemin.
     ON LE LIT DANS LA SOURCE, PAS DANS LA PAGE OUVERTE : la redirection
     part en quelques millisecondes, et un « document.getElementById » qui
     arrive après rend « null ». Un contrôle qui accepte « null » ne
     vérifie plus rien. */
  /* LE LIEN REMONTE D'UN DOSSIER, ET ON LE LIT DANS LA SOURCE. Cette page
     vit dans un SOUS-DOSSIER : un « ./ » recopié depuis « admin.html »
     viserait « /exploitant/application.html » et rendrait un 404.
     Le lien s'appelle désormais « a.ouvrir » — c'est un bouton qu'on
     presse, plus un secours après une redirection — et il vise
     « application.html », la page de l'application depuis la séparation. */
  const ouvrir = (brutX.match(/class="ouvrir"\s+href="([^"]+)"/) || [])[1];
  check('le bouton remonte d\'un dossier',
    /^\.\.\/ela-admin\//.test(ouvrir || ''), String(ouvrir));

  /* LE MANIFESTE EST DÉCLARÉ SUR LA PAGE DE REDIRECTION ELLE-MÊME.
     « Ajouter à l'écran d'accueil » lit le manifeste de la page AFFICHÉE au
     moment du geste. Cette page redirige en quelques millisecondes, mais
     rien ne garantit l'instant où le doigt appuie — sans manifeste ici, un
     iPhone retomberait sur le SITE CLIENT, et c'est exactement le symptôme
     que Barbaros a signalé. */
  const mfX = (brutX.match(/rel="manifest"\s+href="([^"]+)"/) || [])[1];
  check('« /exploitant/ » déclare le manifeste de l\'espace',
    /manifest-exploitant\.webmanifest$/.test(mfX || ''), String(mfX));
  check('et il remonte d\'un dossier lui aussi',
    /^\.\.\//.test(mfX || ''), String(mfX));
  await cx.close();
}

/* =====================================================================
   UN CLIENT NE VOIT RIEN DE L'ESPACE EXPLOITANT
   ---------------------------------------------------------------------
   Septembre 2026, sur sa relecture : « ça ne doit absolument pas être
   présenté au client comme une partie du site public ».
   LES DEUX ESPACES VIVENT DANS LE MÊME FICHIER — c'est la règle du projet,
   un second exemplaire divergerait au premier correctif. Ce qui les sépare
   est donc l'AFFICHAGE, et une règle d'affichage se casse sans bruit : il
   suffit d'un sélecteur trop large ou d'une classe posée trop tôt.
   ON NE LIT PAS LE CSS, ON MESURE CE QUI EST À L'ÉCRAN. Un contrôle qui
   vérifierait « display:none » dans la feuille passerait au vert le jour où
   une autre règle le surcharge.
   ===================================================================== */
{
  const cx = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});
  const pc = await cx.newPage();
  await pc.route('**://api.openrouteservice.org/**', r=>r.abort());
  await pc.goto('http://127.0.0.1:8099/index.html', {waitUntil:'domcontentloaded'});
  await pc.waitForTimeout(600);

  const fuites = await pc.evaluate(()=>{
    const dehors = [];
    const ecransAdmin = ['ecran-verrou','ecran-bord','ecran-registre','ecran-creer',
                         'ecran-chauffeurs','ecran-facture','ecran-reglages'];
    document.querySelectorAll('.admin-nav, .admin-liens, .admin-marque').forEach(e=>{
      const r = e.getBoundingClientRect();
      if(r.width > 0 && r.height > 0) dehors.push('nav:' + e.className);
    });
    ecransAdmin.forEach(id=>{
      const e = document.getElementById(id);
      if(!e) return;
      const r = e.getBoundingClientRect();
      if(r.width > 0 && r.height > 0) dehors.push(id);
    });
    return dehors;
  });
  check('aucun écran de l\'espace exploitant n\'est à l\'écran côté client',
    fuites.length === 0, fuites.join(', '));

  /* ET AUCUN CHEMIN N'Y MÈNE. Un écran invisible qu'un lien ouvre n'est pas
     caché : le client appuie, et il se retrouve devant un champ « Code ». */
  const menent = await pc.evaluate(()=>
    [...document.querySelectorAll('[data-ecran], a[href]')]
      .filter(e=>{
        const r = e.getBoundingClientRect();
        if(!(r.width>0 && r.height>0)) return false;
        const cible = e.getAttribute('data-ecran') || e.getAttribute('href') || '';
        return /verrou|ecran-bord|registre|chauffeurs|facture|reglages|exploitant|admin/i.test(cible);
      })
      .map(e=>e.getAttribute('data-ecran') || e.getAttribute('href')));
  check('et aucun lien visible n\'y conduit', menent.length === 0, menent.join(', '));
  await cx.close();
}

/* =====================================================================
   LE SERVICE WORKER NE RANGE PLUS TOUTES LES PAGES SOUS UNE SEULE CLÉ
   ---------------------------------------------------------------------
   Il gardait CHAQUE page HTML sous « ./index.html », quelle que soit
   l'adresse demandée. Il suffisait donc d'ouvrir « /admin.html » ou
   « /exploitant/ » — deux pages qui ne font QUE rediriger — pour que leur
   contenu remplace le site dans le cache : un client hors ligne rouvrait
   ensuite le site et tombait sur « Ouverture de l'espace exploitant… »,
   puis sur l'écran du code.
   ON LIT LA SOURCE : le service worker ne s'installe qu'en « https », il
   est donc injoignable depuis le serveur de test. Un contrôle qui ne peut
   pas s'exécuter vaut mieux qu'aucun contrôle, à condition de lire ce qui
   décide — ici la clé d'écriture et le repli.
   ===================================================================== */
{
  const sw = await (await fetch('http://127.0.0.1:8099/sw.js')).text();
  const commandes = sw.split('\n').filter(l => !/^\s*(\/\*|\*|\/\/)/.test(l)).join('\n');
  check('le service worker garde chaque page sous SA propre adresse',
    /c\.put\(req,\s*copy\)/.test(commandes) && !/c\.put\("\.\/index\.html"/.test(commandes));
  check('et le repli hors ligne ne vaut que pour l\'application',
    /estLApplication/.test(commandes));
}

/* =====================================================================
   RIEN NE DÉBORDE DE LA LARGEUR — SUR LE SITE PUBLIÉ
   ---------------------------------------------------------------------
   Écrit le 16 septembre 2026, après un défaut qui n'existait QUE là.
   « construire.sh » injecte « application-facade.css », qui descendait la
   gouttière des sections à 14 px sous 900 px. Le carrousel des services,
   lui, gardait une marge négative de 20 px écrite en dur : la page publiée
   faisait 396 px pour une fenêtre de 390 et se décalait sous le doigt.
   AUCUNE DES VINGT-HUIT SUITES NE POUVAIT LE VOIR : elles éprouvent le
   dépôt, qui ne porte pas cette feuille. C'est la raison d'être de ce
   contrôle-ci, et il vise le site CONSTRUIT.
   TROIS LARGEURS, parce qu'une gouttière change avec l'écran : 320 px (le
   plus petit iPhone), 390 (le courant), 430 (les grands).
   ON NOMME LE COUPABLE, sinon le message dit « ça déborde » et laisse
   chercher dans six mille lignes. */
for (const large of [320, 390, 430]) {
  const cx = await b.newContext({viewport:{width:large,height:844},locale:'fr-FR'});
  const pw = await cx.newPage();
  await pw.route('**://api.openrouteservice.org/**', r => r.abort());
  await pw.goto(SITE + '/', {waitUntil:'domcontentloaded'});
  await pw.waitForTimeout(700);
  const d = await pw.evaluate(() => {
    const W = window.innerWidth, out = [];
    /* On ne retient que ce qui pousse la PAGE : un enfant d'un cadre qui
       défile horizontalement déborde de son cadre, pas de l'écran — et
       c'est même voulu pour le carrousel des services, dont la carte
       suivante doit se deviner. On remonte donc les parents. */
    const dansUnDefilement = e => {
      for (let n = e.parentElement; n; n = n.parentElement) {
        const ov = getComputedStyle(n).overflowX;
        if (ov === 'auto' || ov === 'scroll' || ov === 'hidden') return true;
      }
      return false;
    };
    for (const e of document.querySelectorAll('body *')) {
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right <= W + 1 && r.left >= -1) continue;
      if (dansUnDefilement(e)) continue;
      out.push(e.tagName.toLowerCase()
        + (e.id ? '#' + e.id : '')
        + (typeof e.className === 'string' && e.className.trim()
            ? '.' + e.className.trim().split(/\s+/).slice(0,2).join('.') : '')
        + ' [' + Math.round(r.left) + '→' + Math.round(r.right) + ']');
    }
    return { W, page: document.documentElement.scrollWidth, coupables: out.slice(0,4) };
  });
  check('à ' + large + ' px, le site publié ne déborde pas en largeur',
    d.page <= d.W,
    d.page + ' px de page pour ' + d.W + ' de fenêtre — ' +
    (d.coupables.length ? d.coupables.join(' · ') : 'aucun élément nommé'));
  await cx.close();
}

/* =====================================================================
   RIEN NE DOIT SORTIR DE SON CADRE — LA FAMILLE DE DÉFAUTS DU 22/09/2026
   ---------------------------------------------------------------------
   Barbaros en a trouvé DEUX le même jour, sur son téléphone, et les deux
   avaient la même origine : une règle CSS taillée pour les seuls éléments
   qui peuplaient un bloc le jour où elle a été écrite.
     — « .champ-aide » portait une marge NÉGATIVE de 4 px, calculée pour un
       champ qui a 10 px de marge basse. Dans le bloc « Le client » les
       champs n'en ont aucune : le texte « Depuis l'étranger… » remontait
       DANS le cadre et sa première ligne se faisait couper par la bordure.
     — « min-width:0 » ne visait que « .duo > .champ ». Les boutons de
       paiement vivent dans le même duo sans en hériter : en grille, un
       élément ne peut pas devenir plus étroit que son contenu, donc la
       colonne s'élargissait et « Espèces » sortait du bloc blanc.
   AUCUN CONTRÔLE NE POUVAIT LES VOIR. Les suites mesuraient le débordement
   de la PAGE ; ces deux-là débordaient de leur CADRE, ce qui ne pousse
   rien et ne casse rien — ça se voit seulement en regardant.
   CE QUI EST ÉPROUVÉ ICI EST LA RÈGLE, PAS LES DEUX CAS : un élément ne
   sort pas de son parent, et un texte d'aide ne remonte pas dans le champ
   au-dessus. Ce qu'on ajoutera demain dans un duo est couvert d'office.
   TROIS LARGEURS ET LES DEUX ENTRÉES : le défaut d'« Espèces » ne se
   déclenchait qu'à 320 px — un iPhone SE — et seulement au comptoir. À 390
   et 1280, là où les captures de contrôle étaient prises, il était
   invisible.
   ON NOMME LE COUPABLE ET L'ÉCART, sinon le message laisse chercher dans
   six mille lignes. */
for (const [entree, adresse] of [['site client', '/'],
                                 ['comptoir hôtel', '/?reception=easyhotel-aeroville']]) {
  for (const large of [320, 390, 430]) {
    const cx = await b.newContext({viewport:{width:large,height:844},locale:'fr-FR'});
    const pw = await cx.newPage();
    await pw.route('**://api.openrouteservice.org/**', r => r.abort());
    await pw.goto(SITE + adresse, {waitUntil:'domcontentloaded'});
    await pw.waitForTimeout(900);
    const d = await pw.evaluate(() => {
      const pose = e => { const q = getComputedStyle(e).position;
        return q === 'absolute' || q === 'fixed' || q === 'sticky'; };
      /* Un cadre qui défile laisse volontairement dépasser ses enfants —
         c'est ce qui fait deviner qu'on peut balayer le carrousel. */
      const dansUnDefilement = e => {
        for (let n = e.parentElement; n; n = n.parentElement) {
          const o = getComputedStyle(n).overflowX;
          if (o === 'auto' || o === 'scroll' || o === 'hidden') return true;
        }
        return false;
      };
      /* Les formes d'un DESSIN se superposent par construction : un
         « circle » sur un « path » n'est pas un défaut de mise en page. */
      const dansUnDessin = e => !!e.closest('svg');
      const sortis = [], remontes = [];
      for (const e of document.querySelectorAll('body *')) {
        const par = e.parentElement;
        if (!par || par === document.body) continue;
        if (pose(e) || dansUnDefilement(e) || dansUnDessin(e)) continue;
        const r = e.getBoundingClientRect(), P = par.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || P.width < 2) continue;
        const dehors = Math.max(Math.round(r.right - P.right), Math.round(P.left - r.left));
        if (dehors > 1) sortis.push(
          e.tagName.toLowerCase() + (e.id ? '#' + e.id : '')
          + (typeof e.className === 'string' && e.className.trim()
              ? '.' + e.className.trim().split(/\s+/)[0] : '')
          + ' sort de ' + dehors + 'px');
      }
      /* Le texte d'aide appartient au champ qu'il explique : il se pose
         SOUS lui, jamais dedans. C'est le cas exact du 22/09. */
      for (const a of document.querySelectorAll('.champ-aide')) {
        const r = a.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        let prev = a.previousElementSibling;
        while (prev && !prev.classList.contains('champ')) prev = prev.previousElementSibling;
        if (!prev) continue;
        const B = prev.getBoundingClientRect();
        const dans = Math.round(B.bottom - r.top);
        if (dans > 0) remontes.push(
          '« ' + (a.textContent || '').trim().slice(0, 28) + '… » remonte de ' + dans + 'px');
      }
      return { sortis: sortis.slice(0, 4), remontes: remontes.slice(0, 4) };
    });
    check('à ' + large + ' px sur le ' + entree + ', aucun élément ne sort de son cadre',
      d.sortis.length === 0, d.sortis.join(' · '));
    check('à ' + large + ' px sur le ' + entree + ', aucun texte d\'aide ne remonte dans son champ',
      d.remontes.length === 0, d.remontes.join(' · '));
    await cx.close();
  }
}

/* =====================================================================
   AUCUNE IMAGE RÉFÉRENCÉE NE DOIT MANQUER DU SITE PUBLIÉ
   ---------------------------------------------------------------------
   18 septembre 2026. Un nettoyage du dépôt a supprimé le dossier
   « photos/ » — que CLAUDE.md demande explicitement de ne PAS supprimer
   sans l'accord de Barbaros, « c'est du travail qu'il a fourni ». Deux des
   cinq cartes de services de l'ACCUEIL ont perdu leur fond, et **le site
   est parti en ligne comme ça**.

   POURQUOI RIEN NE L'A ATTRAPÉ : une image de fond qui manque ne casse
   rien. Le navigateur ne lève aucune erreur, la page se charge, la mise en
   page tient. Il y a simplement un trou gris à la place d'une photo — et
   ça ne se voit qu'en REGARDANT la page, ce qu'aucune suite ne faisait
   pour les images.

   CE CONTRÔLE NE FIGE AUCUNE LISTE. Il lit ce que le site CONSTRUIT va
   chercher, et vérifie que chaque fichier existe vraiment. Une photo
   retirée volontairement, avec sa référence, reste verte ; une référence
   orpheline tombe, et le message NOMME le fichier.
   Même famille que le débordement de 6 px : seul le site publié le montre.
   ===================================================================== */
{
  const fichiers = ['index.html','application-facade.css','seo-pages.css',
                    'hotel-engine-polish.js','admin-v2.html'];
  const vues = new Set();
  for(const f of fichiers){
    const r = await fetch(SITE + '/' + f);
    if(!r.ok) continue;
    /* ON RETIRE LES COMMENTAIRES AVANT DE CHERCHER, et c'est la QUATRIÈME
       fois que ce projet se fait prendre par un contrôle qui trouve ce
       qu'il cherche dans un texte d'EXPLICATION — après « cp -r carte »,
       « cp -r exploitant » et la section des tests. Ici le champ « photo »
       d'easyHotel est VIDE, et le commentaire au-dessus donne un exemple
       de chemin : « photos/easyhotel.jpg ». Le premier jet de ce contrôle
       tombait donc sur une référence qui n'existe pas. */
    const txt = (await r.text()).replace(/\/\*[\s\S]*?\*\//g, '')
                                .replace(/<!--[\s\S]*?-->/g, '');
    for(const m of txt.matchAll(/photos\/[A-Za-z0-9._-]+/g)) vues.add(m[0]);
  }
  const absentes = [];
  for(const chemin of [...vues].sort()){
    const r = await fetch(SITE + '/' + chemin);
    if(!r.ok) absentes.push(chemin);
  }
  check('aucune image référencée ne manque du site publié',
    absentes.length === 0,
    absentes.length ? 'manquantes : ' + absentes.join(', ')
                    : vues.size + ' image(s) référencée(s), toutes présentes');
  /* LE DOUTE EST LEVÉ : un site qui ne référencerait AUCUNE image passerait
     le contrôle du dessus sans rien prouver. L'accueil en porte, et c'est
     une décision de Barbaros — les cinq cartes de services. */
  check('l’accueil référence bien ses images',
    vues.size >= 4, vues.size + ' référence(s)');
}

/* « VOIR MON PRIX » ENTIER AU-DESSUS DE LA BARRE DU BAS — SUR LE SITE PUBLIÉ.
   Le contrôle de test-nouveau éprouve le DÉPÔT, que la façade ne met pas en
   page : le 3 octobre 2026, le nouveau texte d'accueil a remis le bouton à
   cheval sur la barre EN LIGNE (753–806 pour une barre à 784, à 390 × 844),
   un pouce dans le bas du bouton ouvrait un onglet. On mesure ce que reçoit
   le doigt en quatre points du bouton, pas seulement le rectangle : une
   marge transparente qui avale l'appui ne se voit pas sur un rectangle.
   390 × 844 seulement, et c'est délibéré : sur un écran plus court le bouton
   est SOUS le premier écran — le client fait défiler, il ne voit rien de
   coupé. Le défaut, c'est un bouton visible à moitié. FR et EN : les deux
   langues n'ont pas la même hauteur de bandeau. */
for (const langue of ['fr-FR', 'en-US']) {
  const cx = await b.newContext({viewport:{width:390,height:844}, locale:langue});
  const pw = await cx.newPage();
  await pw.route('**/*', r => r.request().url().startsWith(SITE) ? r.continue() : r.abort());
  await pw.goto(SITE + '/', {waitUntil:'domcontentloaded'});
  await pw.waitForTimeout(700);
  const m = await pw.evaluate(() => {
    const lab = document.querySelector('[data-t="btn_prix"]');
    const bt = lab && (lab.closest('button,a') || lab);
    if (!bt) return { absent: true };
    const r = bt.getBoundingClientRect();
    const barre = [...document.querySelectorAll('.barre, nav')].find(n => {
      const st = getComputedStyle(n);
      return (st.position === 'fixed' || st.position === 'sticky') && n.offsetHeight > 0
        && n.getBoundingClientRect().bottom >= innerHeight - 2;
    });
    const limite = barre ? barre.getBoundingClientRect().top : innerHeight;
    const doigts = [0.15, 0.5, 0.85].map(f => {
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height * f);
      return !!el && (el === bt || bt.contains(el));
    });
    return { haut: Math.round(r.top), bas: Math.round(r.bottom), limite: Math.round(limite), doigts };
  });
  check(`site publié (${langue}) : « Voir mon prix » est entier au-dessus de la barre du bas`,
    !m.absent && m.bas <= m.limite,
    m.absent ? 'bouton absent' : 'bouton ' + m.haut + '–' + m.bas + ' · barre à ' + m.limite);
  check(`site publié (${langue}) : un doigt posé sur le bouton tombe bien sur lui`,
    !m.absent && m.doigts.every(Boolean), m.absent ? 'bouton absent' : JSON.stringify(m.doigts));
  await cx.close();
}

/* LE MESSAGE AUX PROFESSIONNELS N'EST PLUS DANS LE BANDEAU, MAIS IL EXISTE.
   Sorti du bandeau pour rendre sa place au bouton (voir plus haut) — un
   contrôle qui ne dirait que « absent du bandeau » passerait au vert si on
   l'avait effacé. On éprouve les deux faces. */
{
  const cx = await b.newContext({viewport:{width:390,height:844}, locale:'fr-FR'});
  const pw = await cx.newPage();
  await pw.route('**/*', r => r.request().url().startsWith(SITE) ? r.continue() : r.abort());
  await pw.goto(SITE + '/', {waitUntil:'domcontentloaded'});
  await pw.waitForTimeout(500);
  const pro = await pw.evaluate(() => {
    const e = document.querySelector('.pro-bloc');
    return { existe: !!e && e.offsetHeight > 0, dansBandeau: !!e && !!e.closest('.hero'),
             texte: e ? e.textContent.trim().slice(0, 40) : '' };
  });
  check('le message aux hôtels, agences et entreprises est affiché', pro.existe, pro.texte || 'absent');
  check('…et il n\'est plus dans le bandeau d\'accueil', !pro.dansBandeau);
  await cx.close();
}

/* SUR ORDINATEUR, LA LIGNE DES ÉTAPES OCCUPE LA LARGEUR DE LA CARTE. La
   façade place les enfants de la carte un par un dans 12 colonnes ; oubliée
   de la liste, la ligne tombait dans UNE colonne de 86 px, chiffres rognés.
   Depuis le 6 octobre 2026 elle n'est plus affichée que sur la page easyHotel
   (le site public a le bloc des trois étapes juste sous la carte) : c'est
   donc là qu'on la mesure. */
for (const large of [1024, 1280]) {
  const cx = await b.newContext({viewport:{width:large,height:900}, locale:'fr-FR'});
  const pw = await cx.newPage();
  await pw.route('**/*', r => r.request().url().startsWith(SITE) ? r.continue() : r.abort());
  await pw.goto(SITE + '/application.html?h=easyhotel-aeroville', {waitUntil:'domcontentloaded'});
  await pw.waitForTimeout(500);
  const e = await pw.evaluate(() => {
    const l = document.querySelector('.etapes-ligne').getBoundingClientRect();
    const c = document.querySelector('.reserver').getBoundingClientRect();
    return { ligne: Math.round(l.width), carte: Math.round(c.width) };
  });
  check(`page easyHotel à ${large} px, la ligne des étapes occupe la largeur de la carte`,
    e.ligne >= e.carte * 0.8, e.ligne + ' px pour une carte de ' + e.carte);
  await cx.close();
}

/* AUCUNE NOTE DE TRAVAIL DANS LES PAGES ELA PUBLIÉES (4 octobre 2026).
   La règle du 28 septembre ne valait que pour la page publique : /ela-admin/
   partait en ligne avec 841 blocs de commentaires — comment l'espace est
   protégé, ses anciennes failles —, la réception avec 578. On ne cherche pas
   « /* » (une chaîne peut le contenir) : on prend des passages des VRAIS
   commentaires de la source et on exige qu'aucun ne se retrouve en ligne.
   TROIS TROUS TROUVÉS EN RELECTURE, et bouchés ici :
   - une adresse qui rend un 404, ou une AUTRE page, passait au vert — une
     page vide ne contient aucune note. On exige donc 200 et la marque de la
     bonne page avant de juger son contenu ;
   - les commentaires « // » n'étaient pas échantillonnés : un nettoyeur qui
     les aurait laissés passer restait vert ;
   - une liste d'adresses survit à la page qu'on ajoute. Toute page publiée
     qui porte « data-ela-space » (donc fabriquée depuis la page du site) est
     passée au crible, où qu'elle soit. */
{
  /* Les trois sources de ces pages : la page du site (admin et réception en
     sont fabriqués), la page du QR easyHotel, et la redirection /exploitant/. */
  const source = (await Promise.all(['index.html', 'sites/easyhotel-client/index.html', 'exploitant/index.html']
    .map(f => readFile(f, 'utf8')))).join('\n');
  const milieu = (t, n) => t.slice(Math.floor(t.length / 2) - n, Math.floor(t.length / 2) + n);
  const passages = [];
  for (const m of source.matchAll(/\/\*([\s\S]*?)\*\/|<!--([\s\S]*?)-->/g)) {
    const t = (m[1] || m[2] || '').replace(/\s+/g, ' ').trim();
    if (t.length >= 80) passages.push(milieu(t, 20));
  }
  /* Les « // », dans les scripts intégrés. Ils sont tous en FIN de ligne
     (« var rang = 0;  // une réponse lente… ») : on prend ceux qu'un espace
     précède et suit. Une adresse (« https:// ») n'en a pas. Un « // » pris
     dans une chaîne ferait tomber le contrôle sur un site propre : on le
     verrait tout de suite, pas en silence. */
  const lignes = [];
  for (const sc of source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    for (const l of sc[1].split('\n')) {
      const m = l.match(/(?:^|\s)\/\/\s+(.*)$/);
      const t = m ? m[1].replace(/\s+/g, ' ').trim() : '';
      if (t.length >= 30) lignes.push(milieu(t, 15));
    }
  }
  check('la source fournit assez de commentaires « /* » et « <!-- » pour éprouver le contrôle', passages.length > 200, passages.length + ' passages');
  check('la source fournit assez de commentaires « // » pour éprouver le contrôle', lignes.length >= 10, lignes.length + ' passages');
  const tous = passages.concat(lignes);
  const restesDe = html => tous.filter(x => html.includes(x));

  const PAGES = [
    ['/ela-admin/', 'data-ela-space="admin"'],
    ['/easyhotel-reception/', 'data-ela-space="hotel-reception"'],
    ['/reception/easyhotel-aeroville/', 'data-ela-space="hotel-reception"'],
    ['/exploitant/', 'Espace exploitant</title>'],
    ['/easyhotel-client/', 'easyHotel Aéroville × Elatransfer</title>'],
    ['/', 'data-ela-space="public"'],
    ['/application.html', 'data-ela-space="hotel-client"'],
  ];
  for (const [page, marque] of PAGES) {
    const r = await fetch(SITE + page);
    const brut = await r.text();
    const bonne = r.status === 200 && brut.includes(marque);
    check(`${page} : c'est bien la bonne page qui répond`, bonne,
      bonne ? '' : 'HTTP ' + r.status + ', ' + brut.length + ' caractères, marque « ' + marque + ' » ' + (brut.includes(marque) ? 'présente' : 'absente'));
    if (!bonne) continue;
    const html = brut.replace(/\s+/g, ' ');
    const restes = restesDe(html);
    check(`${page} : aucune note de travail de la source n'est publiée`, restes.length === 0,
      restes.length ? restes.length + ' passage(s), dont « ' + restes[0] + ' »' : '');
    check(`${page} : aucun commentaire HTML`, !html.includes('<!--'));
  }

  /* LE BALAYAGE : des motifs, pas une liste. */
  const fabriquees = [];
  for (const f of await readdir('site', { recursive: true })) {
    if (!f.endsWith('.html')) continue;
    const brut = await readFile(join('site', f), 'utf8');
    if (brut.includes('data-ela-space=')) fabriquees.push([f, brut.replace(/\s+/g, ' ')]);
  }
  const plancher = PAGES.filter(([, m]) => m.startsWith('data-ela-space')).length;
  check('le balayage trouve toutes les pages fabriquées depuis la page du site', fabriquees.length >= plancher,
    fabriquees.length + ' trouvée(s), au moins ' + plancher + ' attendue(s)');
  const salies = fabriquees.filter(([, h]) => h.includes('<!--') || restesDe(h).length)
    .map(([f, h]) => f + ' (' + restesDe(h).length + ' passage(s)' + (h.includes('<!--') ? ', « <!-- »' : '') + ')');
  check('aucune page publiée fabriquée depuis la page du site ne porte une note de travail', salies.length === 0, salies.join(' ; '));
}

/* LES FEUILLES DE STYLE ET « robots.txt » PUBLIÉS (4 octobre 2026, Barbaros :
   « oui »). Le nettoyage ne lisait que le HTML et le JS : la feuille de style
   des hôtels partait avec 23 blocs de notes, et « robots.txt » expliquait en
   clair que ?h= donne des forfaits plus bas que le site.
   Deux exigences par fichier, et la seconde compte autant que la première :
   AUCUNE note publiée, et RIEN d'autre de changé — les règles de style lues
   par le navigateur, les consignes lues par un robot. Retirer une note en
   emportant une règle serait pire que la note. */
{
  /* robots.txt : on ne refait pas le nettoyage, on lit ce qu'un robot lit —
     la suite des consignes, et où tombent les lignes vides entre elles (un
     vieux robot y voit la fin d'un groupe). */
  const lire = t => {
    const out = []; let vide = false;
    for (const l of t.split('\n')) {
      if (/^\s*#/.test(l)) continue;
      const d = l.replace(/#.*$/, '').trim();
      if (!d) { vide = true; continue; }
      out.push((vide && out.length ? '| ' : '') + d.replace(/\s+/g, ' '));
      vide = false;
    }
    return out;
  };
  const src = await readFile('robots.txt', 'utf8');
  const r = await fetch(SITE + '/robots.txt');
  const pub = await r.text();
  check('robots.txt : la source porte des notes à retirer (sinon le contrôle ne prouve rien)', /^\s*#/m.test(src));
  check('robots.txt publié répond', r.status === 200 && /^User-agent:/mi.test(pub), 'HTTP ' + r.status);
  check('robots.txt publié ne porte aucune note', !pub.includes('#'),
    (pub.split('\n').find(l => l.includes('#')) || '').slice(0, 80));
  const a = lire(src), b2 = lire(pub);
  check('robots.txt publié donne exactement les mêmes consignes, aux mêmes places', JSON.stringify(a) === JSON.stringify(b2),
    'source ' + JSON.stringify(a) + ' / publié ' + JSON.stringify(b2));
  check('robots.txt publié écarte toujours ?h= et ?reception=', /Disallow:\s*\/\*\?h=/.test(pub) && /Disallow:\s*\/\*\?reception=/.test(pub));

  /* Les feuilles de style : toutes celles publiées à la racine — un motif,
     pas une liste. Les règles sont comparées par le NAVIGATEUR (CSSOM), pas
     relues : c'est lui qui décide si un retrait a emporté une accolade. */
  const pc = await b.newPage();
  await pc.goto(SITE + '/robots.txt');
  let total = 0;
  const feuilles = (await readdir('site')).filter(f => f.endsWith('.css'));
  check('le site publie au moins les deux feuilles de style de la façade et des hôtels',
    feuilles.includes('application-facade.css') && feuilles.includes('hotel-engine-polish.css'), feuilles.join(', '));
  for (const f of feuilles) {
    const publie = await readFile(join('site', f), 'utf8');
    let source = null;
    try { source = await readFile(f, 'utf8'); } catch {}
    if (source === null) {
      check(`${f} : aucune note publiée (pas de source à la racine)`, !publie.includes('/*'));
      continue;
    }
    const passages = [];
    for (const m of source.matchAll(/\/\*([\s\S]*?)\*\//g)) {
      const t = m[1].replace(/\s+/g, ' ').trim();
      if (t.length >= 40) passages.push(t.slice(Math.floor(t.length / 2) - 15, Math.floor(t.length / 2) + 15));
    }
    total += passages.length;
    const plat = publie.replace(/\s+/g, ' ');
    const restes = passages.filter(x => plat.includes(x));
    check(`${f} : aucune note de la source n'est publiée`, restes.length === 0,
      restes.length ? restes.length + ' passage(s), dont « ' + restes[0] + ' »' : '');
    const regles = await pc.evaluate(([s1, s2]) => {
      const lire = t => { const f = new CSSStyleSheet(); f.replaceSync(t); return Array.from(f.cssRules, r => r.cssText); };
      return [lire(s1), lire(s2)];
    }, [source, publie]);
    check(`${f} : le navigateur lit exactement les mêmes règles qu'avant`,
      regles[0].length > 0 && JSON.stringify(regles[0]) === JSON.stringify(regles[1]),
      regles[0].length + ' règles dans la source, ' + regles[1].length + ' publiées');
  }
  check('les feuilles de style de la source portent des notes (sinon le contrôle ne prouve rien)', total >= 20, total + ' passages');
  await pc.close();
}

/* =====================================================================
   « RÉSERVER » NE MÈNE JAMAIS CHEZ UN PARTENAIRE (5 octobre 2026)
   ---------------------------------------------------------------------
   Capture de Barbaros : depuis la page « Transfert CDG », « Réserver »
   ouvrait /application.html — la page du FLYER easyHotel, construite comme
   espace « hotel-client ». Un visiteur venu de Google lisait « easyHotel »
   en haut et remplissait « Nom du client / Guest name ». On lit les pages
   que le sitemap donne à Google, sur le site construit, et on y appuie
   vraiment : l'adresse d'arrivée doit être l'espace public.
   ===================================================================== */
{
  const sitemap = await (await fetch(SITE + '/sitemap.xml')).text();
  const pagesSeo = [...sitemap.matchAll(/<loc>https:\/\/elatransfer\.com\/([^<]+)<\/loc>/g)].map(m => m[1]);
  check('le sitemap donne des pages à éprouver (sinon le contrôle ne prouve rien)', pagesSeo.length >= 1, pagesSeo.join(', '));
  const pr = await b.newPage({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  await pr.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  for (const chemin of pagesSeo) {
    await pr.goto(SITE + '/' + chemin, { waitUntil: 'domcontentloaded' });
    const cibles = await pr.$$eval('a[href]', l => l.map(a => a.getAttribute('href')));
    const versHotel = cibles.filter(h => /application\.html|[?&](h|reception)=/.test(h));
    check(`${chemin} : aucun lien vers une page d'hôtel`, versHotel.length === 0, versHotel.join(', '));
    const reserver = cibles.filter(h => /^\/(\?|$)/.test(h) && h !== '/');
    for (const h of reserver) {
      await pr.goto(SITE + h, { waitUntil: 'load' });
      await pr.waitForTimeout(600);
      const lu = await pr.evaluate(() => [document.documentElement.getAttribute('data-ela-space'),
        /easyhotel/i.test(document.body.innerText)].join(' / '));
      check(`${chemin} → ${h} : on arrive sur le site public, sans easyHotel`, lu === 'public / false', lu);
    }
  }
  await pr.close();
}

/* LES PAGES DE SERVICE NE SONT PLUS DES COQUILLES (5 octobre 2026).
   Search Console : 4 pages dans le plan du site, 2 hors de l'index. L'accueil
   ne les liait pas, et elles tenaient en quatre-vingts mots. On vérifie ce
   qui ne vieillit pas : chaque page du plan est liée depuis l'accueil par un
   vrai lien, elle désigne la même entreprise, elle ne dit jamais « VTC », et
   ses réponses aux questions sont MOT POUR MOT celles de l'accueil — qui
   reprennent les CGV : une réponse qui dirait autre chose serait opposable. */
{
  const sitemap = await (await fetch(SITE + '/sitemap.xml')).text();
  const pagesSeo = [...sitemap.matchAll(/<loc>https:\/\/elatransfer\.com\/([^<]+)<\/loc>/g)].map(m => m[1]);
  check('le plan du site date chaque page (lastmod)', (sitemap.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g) || []).length === (sitemap.match(/<url>/g) || []).length);
  const ps = await b.newPage({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  await ps.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await ps.goto(SITE + '/', { waitUntil: 'domcontentloaded' });
  const liensAccueil = await ps.$$eval('a[href]', l => l.map(a => a.getAttribute('href')));
  const reponses = await ps.evaluate(() => { const fr = (window.ELA_TEXTES || {}).fr || {};
    return Object.keys(fr).filter(k => /^faq\d+r$/.test(k)).map(k => fr[k]); });
  check('les réponses de l\'accueil se lisent (sinon le contrôle ne prouve rien)', reponses.length >= 1, String(reponses.length));
  for (const chemin of pagesSeo.filter(c => c !== '')) {
    check(`${chemin} : liée depuis l'accueil par un vrai lien`, liensAccueil.includes('/' + chemin));
    await ps.goto(SITE + '/' + chemin, { waitUntil: 'domcontentloaded' });
    const lu = await ps.evaluate(() => ({
      tete: document.title + ' ' + (document.querySelector('meta[name=description]') || {}).content,
      ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent),
      texte: document.body.innerText,
      faq: [...document.querySelectorAll('details p')].map(p => p.textContent.trim()) }));
    check(`${chemin} : jamais « VTC » dans le titre, la description ou les données`, !/VTC/.test(lu.tete + lu.ld.join(' ')));
    let prov = ''; try { prov = (JSON.parse(lu.ld[0]).provider || {})['@id']; } catch (e) {}
    check(`${chemin} : désigne l'entreprise #organisation`, prov === 'https://elatransfer.com/#organisation', prov);
    const mots = lu.texte.split(/\s+/).filter(Boolean).length;
    check(`${chemin} : plus qu'une coquille (au moins 250 mots)`, mots >= 250, mots + ' mots');
    // LA PAGE DES PROFESSIONNELS (8 octobre 2026) répond à des questions
    // que l'accueil ne pose pas (coût pour l'hôtel, engagement, données) :
    // celles-là sont éprouvées par test-pro-page. La seule qu'elle partage
    // avec l'accueil — le vol en retard, CGV art. 7 — reste mot pour mot.
    const ecarts = chemin === 'professionnels/'
      ? (lu.faq.some(r => reponses.includes(r) && /vol/.test(r)) ? [] : ['réponse « vol en retard » absente ou réécrite'])
      : lu.faq.filter(r => !reponses.includes(r));
    check(`${chemin} : ses réponses sont celles de l'accueil, mot pour mot`, lu.faq.length >= 1 && ecarts.length === 0, ecarts.join(' | '));
  }
  await ps.close();
}

/* LOT P2 DU RÉFÉRENCEMENT (6 octobre 2026). Cinq défauts du SITE CONSTRUIT,
   invisibles depuis le dépôt : chacun naissait d'une étape de construire.sh.
   Tout est lu dans site/, là où les clients et Google le lisent. */
{
  const pages = (await readdir('site', { recursive: true }))
    .filter(f => f.endsWith('.html') && !f.startsWith('carte'));
  // 1. Une page cachée à Google ne désigne pas d'adresse canonique.
  let cachees = 0;
  for (const f of pages) {
    const h = await readFile(join('site', f), 'utf8');
    const robotsMeta = (h.match(/<meta\s+name=["']robots["'][^>]*>/i) || [''])[0];
    if (!/noindex/i.test(robotsMeta)) continue;
    cachees++;
    check(`${f} : cachée à Google, sans adresse canonique`, !/<link\b[^>]*rel=["']canonical["']/i.test(h));
  }
  check('les pages cachées à Google sont bien trouvées (sinon le contrôle ne prouve rien)', cachees >= 4, String(cachees));

  for (const chemin of ['/', '/application.html']) {
    const h = await (await fetch(SITE + chemin)).text();
    // 2. Une seule série de balises de partage, et elle porte une image.
    const props = [...h.matchAll(/<meta\s+(?:property|name)=["']((?:og|twitter):[a-z_:]+)["']/gi)].map(m => m[1]);
    const doubles = [...new Set(props.filter((x, i) => props.indexOf(x) !== i))];
    check(`${chemin} : chaque balise de partage n'apparaît qu'une fois`, props.length >= 6 && doubles.length === 0,
      doubles.join(', ') || props.length + ' balise(s)');
    check(`${chemin} : l'aperçu de partage porte une image, en adresse complète`,
      /<meta\s+property=["']og:image["']\s+content=["']https:\/\/elatransfer\.com\/[^"']+["']/i.test(h));
    // 3. Un seul manifeste, une seule couleur — et le manifeste qui reste est
    //    celui que le script d'échange de l'espace exploitant remplit.
    const manifestes = h.match(/<link\b[^>]*rel=["']manifest["'][^>]*>/gi) || [];
    check(`${chemin} : un seul manifeste, celui de l'échange (id="manifeste")`,
      manifestes.length === 1 && /id=["']manifeste["']/.test(manifestes[0]), manifestes.join(' | '));
    const couleurs = h.match(/<meta\s+name=["']theme-color["'][^>]*>/gi) || [];
    check(`${chemin} : une seule couleur de thème`, couleurs.length === 1, couleurs.join(' | '));
  }

  // 4. Les fichiers des hôtels ne partent pas avec l'accueil, et restent là
  //    où ils servent : sans eux, le flyer easyHotel perd son moteur.
  const demandes = async (chemin) => {
    const pg = await b.newPage({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
    await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    const vus = [];
    pg.on('request', r => vus.push(new URL(r.url()).pathname));
    await pg.goto(SITE + chemin, { waitUntil: 'load' });
    await pg.waitForTimeout(400);
    return { pg, vus };
  };
  {
    const { pg, vus } = await demandes('/');
    const hotel = vus.filter(v => v.includes('hotel-engine-polish'));
    check('l\'accueil ne charge aucun fichier des pages d\'hôtel', hotel.length === 0, hotel.join(', '));

    // 5. Les vignettes des services : légères, mais pas floues. Une vignette
    //    tient au plus 216 px de large ; on exige au moins le double en
    //    pixels réels (écran fin), et pas plus de 60 Ko par image.
    await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 300) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } });
    const vignettes = await pg.evaluate(async () => Promise.all([...document.querySelectorAll('.service')].map(async e => {
      const st = getComputedStyle(e, '::before');
      const url = (st.backgroundImage.match(/url\("?([^")]+)"?\)/) || [])[1];
      if (!url) return null;
      const im = new Image(); im.src = url; await im.decode().catch(() => {});
      return { url: new URL(url).pathname, large: parseFloat(st.width), naturelle: im.naturalWidth };
    })));
    const photos = vignettes.filter(Boolean);
    check('les vignettes des services sont trouvées (sinon le contrôle ne prouve rien)', photos.length >= 3, String(photos.length));
    for (const v of photos) {
      const poids = (await stat(join('site', v.url))).size;
      check(`${v.url} : moins de 60 Ko pour une vignette`, poids <= 60 * 1024, Math.round(poids / 1024) + ' Ko');
      check(`${v.url} : assez de pixels pour rester nette (double de l'affichage)`, v.naturelle >= 2 * v.large,
        v.naturelle + ' px pour ' + Math.round(v.large) + ' affichés');
    }
    await pg.close();
  }
  {
    const { pg, vus } = await demandes('/application.html?h=easyhotel-aeroville');
    check('la page du flyer easyHotel charge toujours ses deux fichiers d\'hôtel',
      vus.some(v => v.endsWith('/hotel-engine-polish.css')) && vus.some(v => v.endsWith('/hotel-engine-polish.js')), vus.filter(v => v.includes('hotel')).join(', '));
    await pg.close();
  }
  // Les copies allégées ne remplacent rien : chaque original reste au dépôt.
  const facade = await readFile('application-facade.css', 'utf8');
  for (const m of facade.matchAll(/photos\/([\w-]+)-480\.webp/g)) {
    const originaux = (await readdir('photos')).filter(f => f.startsWith(m[1] + '.'));
    check(`photos/${m[1]} : l'original de Barbaros reste dans le dépôt`, originaux.length === 1, originaux.join(', '));
  }
}

/* LE LOGO NE BOUGE PAS (6 octobre 2026, règle absolue de Barbaros). Ni ses
   fichiers, ni son affichage sur l'accueil. Les empreintes sont celles de
   main au 6 octobre 2026 : changer le logo est SA décision, et la prise
   consiste alors à mettre à jour cette table dans la même PR — jamais à
   contourner le contrôle. */
{
  const EMPREINTES = {
    'brand-logo-officiel.jpeg': '3543f52757a29440', 'brand-logo-white.png': 'bbcdaaccb57a131b',
    'brand-logo.svg': '72ad55c6e0fdaf20', 'brand-logo.webp': '8ed02e907b782ae5',
    'brand-logo-negatif.webp': '99513c72c79b8f00',
    'icon-180.png': '4244c5cb988282a2', 'icon-32.png': 'febfba43bb9da37c', 'icon-512.png': '6822a0401f373c1b',
    'icon-maskable.svg': '6262e8f0ec8accec', 'icon.svg': '6262e8f0ec8accec',
    'icones/admin-180.png': '4f682716b7e063bf', 'icones/admin-32.png': 'f585c56905212222', 'icones/admin-512.png': '01508f0a878f2934',
    'icones/reception-180.png': 'cd29e78b3f0a9270', 'icones/reception-32.png': '3fbafe02c6b81132', 'icones/reception-512.png': '706cc5b56ca3a31b',
    'sites/easyhotel-client/icon-180.png': '911913a6adfea750', 'sites/easyhotel-client/icon-32.png': '951f8f0b81462657',
    'sites/easyhotel-client/icon-512.png': 'f4f71c261cc8127f',
  };
  const changes = [];
  for (const [f, e] of Object.entries(EMPREINTES)) {
    let lu = 'absent';
    try { lu = createHash('sha256').update(await readFile(f)).digest('hex').slice(0, 16); } catch {}
    if (lu !== e) changes.push(f + ' (' + lu + ')');
  }
  check('les fichiers du logo et des icônes sont identiques à main', changes.length === 0, changes.join(', '));
  /* LA PLACE À 1280 px A CHANGÉ, ET C'EST AUTORISÉ (6 octobre 2026, lot P0-A
     de la refonte ordinateur). La règle de Barbaros interdit de toucher au
     logo — fichier, couleurs, proportions — mais permet de le REPOSITIONNER
     dans l'en-tête. Il s'aligne désormais sur la colonne de 1180 px du
     contenu : (1280 − 1180) / 2 = 50 px, au lieu d'être collé au bord à 18.
     Fichier, taille, filtre et opacité restent exigés à l'identique. */
  /* LE FICHIER DE L'ACCUEIL A CHANGÉ, ET C'EST SA DÉCISION (7 octobre 2026,
     Bloc 3). Barbaros a choisi l'en-tête bleu nuit, où les lettres bleu nuit
     de l'original disparaissent (1,1:1) ; un cartouche blanc a été refusé
     (« ça casse le visuel »). L'accueil porte donc la VERSION NÉGATIVE
     (lettres blanches, courbe cyan), ajoutée à la table ci-dessus, même
     silhouette au pixel près. Place, taille, filtre et opacité : inchangés.
     La page d'un hôtel, la réception et l'admin gardent l'original : c'est
     test-public-formulaire qui le vérifie. */
  const LOGO_ACCUEIL = 'brand-logo-negatif.webp';
  const AFFICHAGE = { 390: { w: 116, h: 51.1, x: 14 }, 1280: { w: 128, h: 56.3, x: 50 } };
  const ICONES = ['icon icon-32.png 32x32', 'apple-touch-icon icon-180.png ', 'icon /icon-180.png ', 'apple-touch-icon /icon-180.png 180x180'];
  for (const [largeur, attendu] of Object.entries(AFFICHAGE)) {
    const pl = await b.newPage({ viewport: { width: +largeur, height: 844 }, locale: 'fr-FR' });
    await pl.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await pl.goto(SITE + '/', { waitUntil: 'load' });
    const lu = await pl.evaluate(() => {
      const i = document.querySelector('.entete img.logo-image, img.logo-image');
      if (!i) return null;
      const r = i.getBoundingClientRect(), st = getComputedStyle(i);
      return { src: i.getAttribute('src'), w: r.width, h: r.height, x: r.x, filtre: st.filter, op: st.opacity,
        icones: [...document.querySelectorAll('link[rel*=icon]')].map(x => x.rel + ' ' + x.getAttribute('href') + ' ' + (x.sizes || '')) };
    });
    const memePlace = lu && lu.src === LOGO_ACCUEIL && Math.abs(lu.w - attendu.w) < 0.6
      && Math.abs(lu.h - attendu.h) < 0.6 && Math.abs(lu.x - attendu.x) < 0.6 && lu.filtre === 'none' && lu.op === '1';
    check(`${largeur} px : le logo de l'accueil est la version choisie, à la taille et à la place de main, sans filtre`, memePlace, JSON.stringify(lu && { ...lu, icones: undefined }));
    check(`${largeur} px : les icônes déclarées sont celles de main`, lu && JSON.stringify(lu.icones) === JSON.stringify(ICONES), JSON.stringify(lu && lu.icones));
    await pl.close();
  }
}

await b.close();
await new Promise(r => serveur.close(r));
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
