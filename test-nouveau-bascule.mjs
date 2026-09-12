/* =====================================================================
   TEST-NOUVEAU-BASCULE.MJS — ce que la racine doit porter
   ---------------------------------------------------------------------
   Le nouveau site a pris la place de l'ancien. Trois choses arrivent
   avec la racine, et aucune ne se voit à l'écran — c'est exactement
   pour ça qu'elles ont besoin d'un test.

   — LE RÉFÉRENCEMENT. Une page sans titre ni description disparaît de
     Google en quelques jours, et personne ne s'en aperçoit avant que
     le téléphone arrête de sonner. Le titre MÈNE avec le métier et la
     zone, les aéroports viennent après : l'ancien site menait avec
     « Roissy CDG · Orly » et était absent de « chauffeur privé Paris ».
     Un contrôle vérifie donc l'ORDRE, pas la simple présence.
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
// L'ORDRE compte : le métier et la zone AVANT les aéroports.
const iMetier = titre.toLowerCase().indexOf('chauffeur privé');
check('le titre mène avec le métier', iMetier >= 0 && iMetier < 12, titre);
const desc = await p.getAttribute('meta[name=description]','content');
check('la page a une description', desc && desc.length > 80 && desc.length < 320,
  String(desc && desc.length));
const iM = desc.toLowerCase().indexOf('chauffeur privé');
const iA = Math.min(...['roissy','orly','beauvais'].map(x=>{
  const i = desc.toLowerCase().indexOf(x); return i < 0 ? 9999 : i; }));
check('la description aussi : le métier avant les aéroports', iM >= 0 && iM < iA,
  'métier@'+iM+' aéroport@'+iA);

const robots = await p.getAttribute('meta[name=robots]','content');
check('« noindex » a disparu — sinon la page ne serait jamais indexée',
  !!robots && !robots.includes('noindex'), String(robots));
check('l\'adresse canonique est la racine du domaine',
  (await p.getAttribute('link[rel=canonical]','href'))==='https://elatransfer.com/',
  await p.getAttribute('link[rel=canonical]','href'));

// Deux langues sur une adresse : ni plus, ni moins. Déclarer une langue
// qu'on ne sert plus fait retomber la page dans les résultats.
const hreflangs = await p.$$eval('link[rel=alternate]', l=>l.map(x=>x.hreflang).sort());
check('deux langues déclarées, plus les six de l\'ancien site',
  hreflangs.join(',')==='en,fr,x-default', hreflangs.join(','));

// Les données structurées : « LimousineService », jamais « TaxiService » —
// un VTC n'a ni licence de taxi, ni taximètre, ni droit de maraude.
const ld = JSON.parse(await p.locator('script[type="application/ld+json"]').first().textContent());
check('les données structurées déclarent un service de voiture avec chauffeur',
  ld['@type']==='LimousineService', ld['@type']);
check('et jamais un taxi : ce serait factuellement faux',
  !JSON.stringify(ld).includes('TaxiService'));
// Aucun avis inventé : L132-2 du Code de la consommation.
check('aucune note ni avis déclarés — nous n\'en avons reçu aucun',
  !('aggregateRating' in ld) && !('review' in ld));

// ---- L'application installable ----
check('le manifeste est déclaré',
  (await p.locator('link[rel=manifest]').count())===1);
// iOS ignore un apple-touch-icon en SVG : d'où le PNG de 180 px.
check('l\'icône iOS est un PNG, pas un SVG',
  (await p.getAttribute('link[rel="apple-touch-icon"]','href')||'').endsWith('.png'),
  await p.getAttribute('link[rel="apple-touch-icon"]','href'));
const man = await (await p.request.get('http://127.0.0.1:8099/manifest.webmanifest')).json();
check('le manifeste est lisible et porte la marque',
  man.name.includes('Elatransfer') && man.start_url === './', man.name);
// « addAll » est tout ou rien : un seul fichier manquant et le service
// worker ne s'installe pas, sans le moindre message.
const sw = await (await p.request.get('http://127.0.0.1:8099/sw.js')).text();
const shell = (sw.match(/const SHELL = \[([^\]]*)\]/)||[])[1] || '';
const fichiers = [...shell.matchAll(/"\.\/([^"]*)"/g)].map(m=>m[1]).filter(Boolean);
const manquants = [];
for(const f of fichiers){
  const r = await p.request.get('http://127.0.0.1:8099/'+f);
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
    /exploitant=1/.test(mf.start_url || ''), mf.start_url);
  check('et il porte les mêmes icônes — un jeu à moitié changé est pire',
    (mf.icons || []).length === 3, String((mf.icons||[]).length));
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

  await px.goto('http://127.0.0.1:8099/exploitant/', {waitUntil:'domcontentloaded'});
  await px.waitForTimeout(900);
  check('« /exploitant/ » ouvre bien l\'espace exploitant',
    /exploitant=1/.test(px.url()) && !/\/exploitant\//.test(px.url()), px.url());
  check('et elle s\'arrête sur le verrou, jamais sur le tableau de bord',
    await px.locator('#ecran-verrou').isVisible());

  /* LES PARAMÈTRES SUIVENT : un lien de course ouvert depuis cette adresse
     doit continuer de fonctionner, comme depuis « admin.html ». */
  await px.goto('http://127.0.0.1:8099/exploitant/?a=ZZZ', {waitUntil:'domcontentloaded'});
  await px.waitForTimeout(900);
  check('elle transmet les paramètres reçus',
    /a=ZZZ/.test(px.url()) && /exploitant=1/.test(px.url()), px.url());

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
  const secours = (brutX.match(/id="secours"\s+href="([^"]+)"/) || [])[1];
  check('le lien de secours remonte d\'un dossier',
    /^\.\.\/index\.html/.test(secours || ''), String(secours));

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

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
