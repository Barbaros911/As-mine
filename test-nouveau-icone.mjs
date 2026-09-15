/* =====================================================================
   TEST-NOUVEAU-ICONE.MJS — l'icône de l'espace exploitant
   ---------------------------------------------------------------------
   Barbaros : « j'ai mis en page d'accueil mais ya la version publique qui
   s'affiche ». Mesuré sur sa capture : la fiche d'ajout proposait
   « https://elatransfer.com/ » et le nom « ELA Transfer » — donc le
   manifeste du site CLIENT.

   LA CAUSE ÉTAIT UNE COURSE DE VITESSE, et c'est pour ça qu'elle passait
   inaperçue : « application.html » déclare le manifeste client, qu'un
   script remplace ensuite. Sur un ordinateur le script gagne ; sur un
   iPhone, Safari a souvent déjà lu le premier fichier.

   ON NE TESTE DONC PAS LE SCRIPT, ON TESTE QU'IL N'Y EN A PLUS BESOIN :
   la page d'installation déclare le bon manifeste EN DUR, et c'est le
   seul de la page. Un contrôle qui vérifierait « le script échange bien
   le href » passerait au vert sur exactement le code qui a échoué chez
   lui.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-icone.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import fs from 'node:fs';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];
const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
const p = await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message));

/* --- LA PAGE D'INSTALLATION -------------------------------------------- */
await p.goto('http://127.0.0.1:8099/exploitant/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);

/* ELLE NE PART PLUS TOUTE SEULE. Une page qui redirige en quelques
   millisecondes ne laisse pas le temps d'appuyer sur « Partager » : le
   geste atterrissait sur la page d'arrivée, et on y retrouvait le
   manifeste client. C'est LE contrôle de cette suite. */
const surPlace = new URL(p.url()).pathname.endsWith('/exploitant/index.html');
check('la page d\'installation ne redirige plus toute seule', surPlace, p.url());

/* UNE SUITE QUI PLANTE EST UNE SUITE MUETTE, ET UNE SUITE MUETTE EST UN
   ÉCHEC. Sur l'ancienne page — celle qui partait toute seule — les
   contrôles suivants cherchaient des éléments d'un écran déjà quitté et
   la série s'arrêtait sur un délai d'attente, sans rien afficher. On
   déclare donc l'échec et on continue : le défaut doit se LIRE. */
if(!surPlace){
  ['elle ne déclare QU\'UN seul manifeste',
   'et c\'est celui de l\'exploitant, écrit en dur',
   'aucun script ne vient corriger le manifeste après coup',
   'le bouton mène bien au tableau de bord',
   'elle porte noindex',
   'le bouton fait au moins 44 px de haut',
   'aucun débordement horizontal à 390 px']
    .forEach(n => check(n, false, 'la page a redirigé avant le contrôle'));
}

if(surPlace){
  const manifestes = await p.locator('link[rel="manifest"]').evaluateAll(
    l => l.map(x => x.getAttribute('href')));
  check('elle ne déclare QU\'UN seul manifeste', manifestes.length === 1,
    manifestes.join(' / '));
  check('et c\'est celui de l\'exploitant, écrit en dur',
    manifestes[0] === '../manifest-exploitant.webmanifest', manifestes[0]);

  /* AUCUN SCRIPT : c'est la garantie qu'il n'y a plus de course de vitesse.
     Un script qui corrigerait le manifeste après coup ramènerait le défaut
     exact que cette page existe pour supprimer. */
  /* LA GARANTIE N'EST PAS « AUCUN SCRIPT », C'EST « LE MANIFESTE EN DUR ».
     Le premier jet interdisait tout script — trop large : la page doit
     transmettre les paramètres d'un lien de course, ce qui demande deux
     lignes. Ce qui ne doit jamais revenir, c'est un manifeste POSÉ par un
     script : celui-là se joue à la course avec le navigateur, et l'iPhone
     la gagne une fois sur deux. */
  const brut = fs.readFileSync('exploitant/index.html','utf8');
  check('aucun script ne touche au manifeste de cette page',
    !/manifest/i.test(brut.split('<script')[1] || ''));
  check('et elle ne redirige toujours pas toute seule',
    !/http-equiv=.refresh|location\.replace|location\.href\s*=/.test(brut));

  check('le bouton mène bien au tableau de bord',
    (await p.locator('a.ouvrir').getAttribute('href')) === '../application.html?exploitant=1',
    await p.locator('a.ouvrir').getAttribute('href'));

  /* ELLE NE DOIT PAS SORTIR DANS GOOGLE : c'est une porte de service. */
  check('elle porte noindex',
    /noindex/.test(await p.locator('meta[name="robots"]').getAttribute('content')));

  /* Le bouton se presse au pouce : 44 px est la mesure d'un doigt. */
  const r = await p.locator('a.ouvrir').boundingBox();
  check('le bouton fait au moins 44 px de haut', r && r.height >= 44,
    r ? Math.round(r.height)+' px' : 'absent');

  /* Rien ne doit déborder d'un écran de téléphone. */
  const debord = await p.evaluate(()=> document.documentElement.scrollWidth > window.innerWidth + 1);
  check('aucun débordement horizontal à 390 px', !debord);
}


/* --- LA PAGE DE L'APPLICATION : PLUS DE COURSE DE VITESSE -------------- */
/* Le lien du manifeste ne porte AUCUNE adresse dans la source : c'est le
   script qui la pose, selon le mode. Sans adresse de départ, le navigateur
   n'a rien à précharger, donc rien à lire à tort — la course n'existe plus
   au lieu d'être gagnée une fois sur deux.
   ON LIT LA SOURCE, pas le DOM : dans le DOM le script a déjà tout corrigé,
   et le contrôle passerait au vert sur exactement le code qui a échoué. */
{
  const source = fs.readFileSync('index.html','utf8');
  const lien = source.match(/<link rel="manifest"[^>]*>/);
  check('le lien du manifeste existe dans la page', !!lien, lien ? lien[0] : 'absent');
  check("il ne porte AUCUNE adresse en dur — rien à précharger de travers",
    !!lien && !/href=/.test(lien[0]), lien ? lien[0] : '');
  check("c'est le script qui pose les deux adresses, selon le mode",
    /m\.href = exploitant \? "manifest-exploitant\.webmanifest" : "manifest\.webmanifest"/
      .test(source));
}

/* Et on vérifie que ça MARCHE vraiment, des deux côtés. */
for (const [mode, adresse, attendu] of [
      ['client',     'http://127.0.0.1:8099/index.html',
       'manifest.webmanifest'],
      ['exploitant', 'http://127.0.0.1:8099/index.html?exploitant=1',
       'manifest-exploitant.webmanifest']]) {
  await p.goto(adresse, {waitUntil:'domcontentloaded'});
  await p.waitForTimeout(250);
  const pose = await p.locator('#manifeste').getAttribute('href');
  check('en mode ' + mode + ', le manifeste posé est le bon',
    pose === attendu, String(pose));
}

/* --- LE MANIFESTE LUI-MÊME --------------------------------------------- */
const man = JSON.parse(fs.readFileSync('manifest-exploitant.webmanifest','utf8'));
const cli = JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));

/* CE QUE L'ICÔNE OUVRE. « ./ » — la valeur du manifeste client — est
   exactement ce que Barbaros a obtenu : le site public. */
check('l\'icône ouvre l\'espace exploitant, pas la racine',
  man.start_url === './application.html?exploitant=1', man.start_url);
check('elle vise la même page que les deux raccourcis du site',
  fs.readFileSync('admin.html','utf8').includes('application.html?exploitant=1')
  && fs.readFileSync('exploitant/index.html','utf8').includes('application.html?exploitant=1'));

/* LE NOM EST LA SEULE CHOSE QUE BARBAROS PEUT VÉRIFIER LUI-MÊME, en deux
   secondes, sous l'icône. Il faut donc qu'il DIFFÈRE de celui du client :
   deux icônes au même nom ne se distinguent pas. */
check('le nom court diffère de celui du site client',
  man.short_name !== cli.short_name, man.short_name+' / '+cli.short_name);
check('et il dit ce que c\'est', /espace/i.test(man.short_name));

/* Un jeu d'icônes à moitié changé est pire qu'un ancien cohérent : le
   téléphone montre l'une, l'onglet l'autre. */
check('les deux manifestes portent les mêmes icônes',
  JSON.stringify(man.icons) === JSON.stringify(cli.icons));

/* --- CE QUE LA RECETTE PUBLIE ------------------------------------------ */
/* MÊME POINT DE RUPTURE QUE « carte/ » : un fichier oublié marche en local,
   où le serveur sert le dépôt entier, et reste introuvable en ligne. On lit
   les seules lignes de COMMANDE — chercher le mot dans le fichier entier
   trouverait les commentaires, et le contrôle passerait au vert à tort. */
const cmds = fs.readFileSync('construire.sh','utf8')
  .split('\n').filter(l => /^\s*(cp|mkdir|node|python3|install)\b/.test(l)).join('\n');
check('« construire.sh » publie le dossier exploitant', /cp -r exploitant/.test(cmds));
check('« construire.sh » publie le manifeste exploitant',
  /manifest-exploitant\.webmanifest/.test(cmds));

check('aucune erreur JavaScript', errs.length===0, errs.join(' | '));
await b.close();
console.log('=== RÉUSSIS ('+ok.length+') ===');
if(ko.length){ console.log('=== ÉCHECS ('+ko.length+') ==='); ko.forEach(x=>console.log(' ✗ '+x)); }
process.exit(ko.length?1:0);
