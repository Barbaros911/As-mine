/* =====================================================================
   TEST-ADMIN-PRIX.MJS — « Calculer le prix depuis les adresses »
   ---------------------------------------------------------------------
   LE CONTRÔLE QUI COMPTE LE PLUS : le prix rendu ici est IDENTIQUE AU
   CENTIME à celui du site, sur la même distance et la même grille. C'est
   sur ce montant que Barbaros répond au téléphone, et le prix
   d'Elatransfer est FERME donc OPPOSABLE — s'il annonce 60 € et que le
   site en calcule 70, c'est le client qui a raison, et personne ne le
   découvre avant qu'il compare.

   ON NE REFAIT PAS L'ADDITION DANS LE TEST. Les prix attendus sont
   recalculés à la main depuis la grille du faux serveur, jamais recopiés
   de ce que la page affiche : un test qui prend la sortie pour référence
   ne vérifie plus rien. À 24,3 km et 2,65 €/km, la berline fait
   64,395 € → arrondi à la dizaine, 5 pile descendant → 60 €. Le van, à
   4,00 €/km, fait 97,2 € → 100 €.

   ET ON ÉPROUVE LA CHAÎNE, PAS SEULEMENT LE RÉSULTAT : un niveau en panne
   ne doit pas faire sauter les suivants pour aller droit au vol d'oiseau,
   ce qui facturerait une estimation là où une vraie route était
   disponible. Un repli qui se déclenche trop tôt ne se voit pas — le prix
   s'affiche, il est simplement faux de quelques euros. D'où deux
   distances différentes, une par niveau, et le prix lu à l'écran pour
   savoir lequel a répondu.

   Lancer :  node test-admin-prix.mjs   (elle construit et sert elle-même)
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';

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
await new Promise(r => serveur.listen(8102, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8102';
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));

/* LA GRILLE DU FAUX SERVEUR EST CELLE DU DÉPÔT, et c'est voulu : le
   contrôle de parité au centime avec le site n'aurait aucun sens sur deux
   grilles différentes. Elle est lue dans « itineraire-partage.js » plus
   bas pour vérifier qu'elles ne se sont pas séparées. */
const PARAMS = [
  { cle:'tarif_general_berline', valeur:{par_km_centimes:265, minimum_centimes:3000} },
  { cle:'tarif_general_van',     valeur:{par_km_centimes:400, minimum_centimes:5000} },
  { cle:'commission_ela_defaut', valeur:{pourcentage:20} },
];
/* Quatre distances, une par niveau, et elles rendent quatre prix
   DISTINCTS en berline : 24,3 km → 60 €, 40 km → 110 €, 10 km → 30 €
   (le plancher), 2 km → 30 € aussi. Deux prix qui coïncideraient
   rendraient la suite AVEUGLE sans qu'elle tombe. */
const M = { ors:24300, osrm:40000, pile:16250 };

const b = await chromium.launch();

async function scene({ ors, osrm, sansParams, distanceOrs }){
  const ctx = await b.newContext({ viewport:{width:390,height:844},
                                   deviceScaleFactor:2, locale:'fr-FR' });
  const appels = [];
  /* UNE SEULE ROUTE QUI DÉCIDE DE TOUT : deux routes obligent à connaître
     un ordre de priorité, et il n'est pas le même d'une version de
     Playwright à l'autre. Une suite a déjà passé au vert ici en recevant
     zéro donnée en CI. */
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if(u.startsWith(BASE)) return r.continue();
    const J = o => r.fulfill({contentType:'application/json', body:JSON.stringify(o)});

    /* LES DEUX FAUX SERVICES RÉPONDENT SELON LA QUESTION POSÉE, et ce
       n'est pas du décor. Le premier jet rendait la MÊME place pour les
       deux champs : le trajet faisait alors 0 km, le prix tombait au
       PLANCHER, et deux contrôles passaient au vert sur un prix faux.
       Un défaut qui résoudrait les deux adresses au même endroit rendrait
       exactement ça — 30 € sur un Paris → Argenteuil — sans un mot. */
    const q = decodeURIComponent((u.match(/[?&]q=([^&]*)/) || [,''])[1]).toLowerCase();
    if(u.includes('api-adresse.data.gouv.fr')) return J({features:
      q.includes('argenteuil')
        ? [{geometry:{coordinates:[2.2467,48.9478]},
            properties:{label:"12 rue de Paris, 95100 Argenteuil"}}]
        : []});
    if(u.includes('photon.komoot.io')) return J({features:
      q.includes('argenteuil')
        ? [{geometry:{coordinates:[2.2467,48.9478]},
            properties:{name:"Argenteuil",osm_key:"place",osm_value:"town",
                        postcode:"95100",city:"Argenteuil",countrycode:"FR"}}]
        : [{geometry:{coordinates:[2.3376,48.8606]},
            properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",
                        postcode:"75001",city:"Paris",countrycode:"FR"}}]});

    if(u.includes('api.openrouteservice.org')){ appels.push('ors');
      return ors ? J({features:[{properties:{summary:{distance:(distanceOrs || M.ors), duration:2700}}}]})
                 : r.abort(); }
    if(u.includes('router.project-osrm.org')){ appels.push('osrm');
      return osrm ? J({routes:[{distance:M.osrm, duration:2040}]}) : r.abort(); }
    if(u.includes('api.mapbox.com')){ appels.push('mapbox'); return r.abort(); }

    if(!u.includes('supabase.co')) return r.abort();
    if(u.includes('/rpc/est_exploitant')) return J(true);
    if(u.includes('/parametres_commerciaux')) return J(sansParams ? [] : PARAMS);
    if(u.includes('/chauffeurs_etat')) return J([]);
    if(u.includes('/rest/v1/chauffeurs')) return J([]);
    if(u.includes('/rest/v1/partenaires')) return J([]);
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
  /* ON ATTEND CE QU'ON VEUT VOIR, jamais une durée : un délai fixe n'est
     pas une attente, c'est un pari sur la vitesse de la machine.
     LA CONDITION COUVRE TOUT CE DONT LA SUITE SE SERT ENSUITE : le bouton,
     la chaîne partagée, ET la fin de « load() ». « #metrics » rempli est
     le signal de cette fin — on ne peut pas attendre « state.params »
     non vide, puisqu'une des scènes éprouve justement l'absence de grille
     et l'aurait attendue pour toujours.
     PIÈGE DE BANC RENCONTRÉ ICI : « state » est déclaré en « let » au
     premier niveau d'un script classique — il vit donc dans la portée
     LEXICALE globale et n'est PAS sur « window ». « window.state » rend
     « undefined », et la condition n'était jamais vraie : l'attente
     expirait sur une page parfaitement chargée. */
  await p.waitForFunction(()=>!!document.getElementById('tfCalculer')
    && !!window.ELA_ROUTE
    && (document.getElementById('metrics')?.children.length || 0) > 0,
    null, {timeout:20000});
  return { ctx, p, errs, appels };
}

async function calculer(p, { gamme, date, heure } = {}){
  await p.click('#btnTelephoneV2');
  await p.waitForSelector('#tfCalculer', {state:'visible', timeout:10000});
  await p.fill('#tfDepart', 'vendome');
  await p.fill('#tfArrivee', 'argenteuil');
  if(gamme) await p.selectOption('#tfVehicule', gamme);
  if(date)  await p.fill('#tfDate', date);
  if(heure) await p.fill('#tfHeure', heure);
  await p.click('#tfCalculer');
  /* On attend que l'état cesse d'annoncer un travail en cours : c'est le
     seul signal que le calcul a rendu la main, et il vient après DEUX
     appels réseau enchaînés. */
  await p.waitForFunction(()=>{
    const t = document.getElementById('tfCalcEtat')?.textContent || '';
    return t && !/Recherche|Calcul de/.test(t);
  }, null, {timeout:20000});
  return {
    etat: (await p.textContent('#tfCalcEtat') || '').trim(),
    prix: await p.inputValue('#tfPrix'),
    depart: await p.inputValue('#tfDepart'),
    arrivee: await p.inputValue('#tfArrivee'),
  };
}

/* --- 1. Le chemin normal : ORS répond, le prix est celui du site ------ */
{
  const { ctx, p, errs, appels } = await scene({ ors:true, osrm:true });
  const r = await calculer(p, { gamme:'berline', date:'2026-09-21', heure:'10:00' });
  check('le prix est calculé depuis les deux adresses', r.prix === '60',
        r.prix + ' € (attendu 60 : 24,3 km × 2,65 = 64,395 → 60)');
  check('la distance est annoncée avec le prix', /24,3 km/.test(r.etat), r.etat);
  check('rien ne prétend être une estimation quand une route a répondu',
        !r.etat.includes('≈'), r.etat);
  /* LES ADRESSES RETENUES SONT RÉÉCRITES : si ce n'est pas le bon Ibis, le
     kilométrage est faux et le prix avec. Barbaros doit VOIR ce sur quoi
     il annonce un montant. */
  check('le départ retenu est réécrit dans le champ',
        r.depart === 'Place Vendôme, 75001 Paris', r.depart);
  check("l'arrivée retenue est réécrite dans le champ",
        r.arrivee === 'Argenteuil, 95100 Argenteuil', r.arrivee);
  /* LES DEUX ADRESSES SONT RÉSOLUES SÉPARÉMENT. Les confondre donnerait
     une course de 0 km, donc le prix PLANCHER, sur n'importe quel
     trajet — et rien ne le dirait. */
  check('les deux adresses ne sont pas résolues au même endroit',
        r.depart !== r.arrivee, r.depart + ' / ' + r.arrivee);
  check("l'état dit que le prix reste négociable", /modifiable/i.test(r.etat), r.etat);
  check('ORS a bien servi, et OSRM est resté au repos',
        appels.includes('ors') && !appels.includes('osrm'), appels.join('/'));
  /* LA CLÉ MAPBOX EST VIDE DANS LE DÉPÔT : le niveau 1 ne doit même pas
     être tenté. Le tenter brûlerait quatre secondes de minuteur avant
     chaque prix. */
  check("le niveau Mapbox n'est pas tenté sans clé",
        !appels.includes('mapbox'), appels.join('/'));

  /* --- 2. Le van sur la MÊME distance : la grille décide, pas le code -- */
  const v = await calculer(p, { gamme:'van' });
  check('le van suit sa propre ligne de la grille serveur', v.prix === '100',
        v.prix + ' € (attendu 100 : 24,3 km × 4,00 = 97,2 → 100)');
  check("aucune erreur de page pendant le calcul", errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* --- 3. Le prix ne bouge PAS avec l'heure -----------------------------
   Il n'y a plus aucune majoration sur le site depuis septembre 2026. Une
   majoration qui reviendrait en silence ne se verrait pas : le prix
   s'affiche, il est simplement plus élevé d'un cinquième. ------------- */
{
  const { ctx, p } = await scene({ ors:true, osrm:true });
  const nuit = await calculer(p, { gamme:'berline', date:'2026-09-19', heure:'23:00' });
  check('une course de nuit coûte le même prix', nuit.prix === '60', nuit.prix + ' €');
  const samedi = await calculer(p, { gamme:'berline', date:'2026-09-19', heure:'13:00' });
  check('un samedi midi aussi', samedi.prix === '60', samedi.prix + ' €');
  await ctx.close();
}

/* --- 3 bis. L'ARRONDI DE BARBAROS, ÉPROUVÉ SUR UN 5 PILE -------------
   Le contrôle qui relit la source ne suffit pas : il dirait « > » sans
   qu'aucun prix ne le prouve. À 11,25 km et 4,00 €/km, la course fait
   EXACTEMENT 45 € — le seul cas où « > » et « >= » se séparent. SA règle
   est que le 5 pile DESCEND : 40 €. L'arrondi de l'école en ferait 50, et
   le client paierait 10 € de plus que ce qui lui a été annoncé au
   téléphone. Recalculé à la main : 4,00 × 11,25 = 45,00. --------------- */
{
  const { ctx, p } = await scene({ ors:true, osrm:true, distanceOrs:M.pile });
  const r = await calculer(p, { gamme:'van' });
  check('un 5 pile DESCEND — c’est son arrondi, pas celui de l’école',
        r.prix === '60', r.prix + ' € (attendu 60 : 65,00 € pile → 60)');
  await ctx.close();
}

/* --- 4. ORS en panne : OSRM prend la suite, PAS le vol d'oiseau -------
   C'est le contrôle qui ne se voit pas à l'œil : un repli déclenché trop
   tôt facture une estimation là où une vraie route était disponible. -- */
{
  const { ctx, p, appels } = await scene({ ors:false, osrm:true });
  const r = await calculer(p, { gamme:'berline' });
  check('ORS en panne : OSRM donne la distance', r.prix === '110',
        r.prix + ' € (attendu 110 : 40 km × 2,65 = 106 → 110)');
  check('les deux niveaux ont été essayés dans l’ordre',
        appels.includes('ors') && appels.includes('osrm'), appels.join('/'));
  check("et rien n'est marqué « ≈ » : une vraie route a répondu",
        !r.etat.includes('≈'), r.etat);
  await ctx.close();
}

/* --- 5. Les deux en panne : le vol d'oiseau, et il SE DIT ------------- */
{
  const { ctx, p } = await scene({ ors:false, osrm:false });
  const r = await calculer(p, { gamme:'berline' });
  /* Vendôme → Argenteuil fait ~11,8 km à vol d'oiseau, × 1,3 ≈ 15,3 km.
     15,3 × 2,65 = 40,6 € → 40 €. Recalculé, pas relevé à l'écran. */
  check('les deux en panne : le vol d’oiseau sert de dernier recours',
        r.prix === '40', r.prix + ' € (attendu 40)');
  check('et la course est marquée « ≈ » — c’est une estimation',
        r.etat.includes('≈'), r.etat);
  await ctx.close();
}

/* --- 6. SANS GRILLE SERVEUR, ON NE CALCULE PAS -----------------------
   Inventer un tarif par défaut ferait annoncer au téléphone un prix que
   personne n'a validé. Et le prix est ferme donc opposable. ---------- */
{
  const { ctx, p, appels } = await scene({ ors:true, osrm:true, sansParams:true });
  await p.click('#btnTelephoneV2');
  await p.waitForSelector('#tfCalculer', {state:'visible', timeout:10000});
  await p.fill('#tfDepart', 'vendome');
  await p.fill('#tfArrivee', 'argenteuil');
  await p.click('#tfCalculer');
  /* ON ATTEND UN ÉTAT QUI A TRANCHÉ, pas le premier texte qui s'affiche.
     Le premier jet se contentait d'un texte non vide : il attrapait
     « Recherche des adresses… » et le contrôle « aucun prix n'est
     inventé » passait au vert par simple chance de calendrier — le calcul
     n'avait pas fini d'écrire. Éprouvé en faisant inventer une grille par
     défaut : sans cette attente, un des deux contrôles seulement tombait. */
  await p.waitForFunction(()=>{
    const t = document.getElementById('tfCalcEtat')?.textContent || '';
    return t && !/Recherche|Calcul de/.test(t);
  }, null, {timeout:20000});
  const etat = (await p.textContent('#tfCalcEtat') || '').trim();
  const prix = await p.inputValue('#tfPrix');
  check('sans grille serveur, le calcul refuse et le DIT',
        /grille serveur indisponible/i.test(etat), etat);
  check('et aucun prix n’est inventé', prix === '', '« ' + prix + ' »');
  check("et aucun itinéraire n'est même demandé",
        !appels.includes('ors') && !appels.includes('osrm'), appels.join('/'));
  await ctx.close();
}

/* --- 7. Un champ vide : on nomme lequel ------------------------------- */
{
  const { ctx, p } = await scene({ ors:true, osrm:true });
  await p.click('#btnTelephoneV2');
  await p.waitForSelector('#tfCalculer', {state:'visible', timeout:10000});
  await p.fill('#tfDepart', 'vendome');
  await p.click('#tfCalculer');
  await p.waitForFunction(()=>(document.getElementById('tfCalcEtat')?.textContent||'').length>0,
                          null, {timeout:10000});
  const etat = (await p.textContent('#tfCalcEtat') || '').trim();
  check('un champ vide est refusé, et on dit lequel',
        /départ|arrivée/i.test(etat), etat);
  await ctx.close();
}

await b.close(); serveur.close();

/* =====================================================================
   CE QUI SE LIT DANS LA SOURCE — LA CHAÎNE N'EST PAS RECOPIÉE
   ---------------------------------------------------------------------
   C'est tout le sujet de cette brique. Deux copies dont une dérive, ce
   serait DEUX PRIX pour une même course, et rien ne l'annoncerait.
   ===================================================================== */
const partage = await readFile('itineraire-partage.js', 'utf8');
const page    = await readFile('index.html', 'utf8');
const actions = await readFile('admin-v2-actions.js', 'utf8');

check('la chaîne d’itinéraire vit dans « itineraire-partage.js »',
  /function itineraire\(/.test(partage) && /function arrondiDizaine\(/.test(partage)
  && /function prix\(/.test(partage));
/* LE SITE NE LA RÉÉCRIT PAS. « prix » y reste une fonction — c'est l'ancre
   de la règle tarifaire du partenaire hôtel — mais elle DÉLÈGUE : la seule
   arithmétique est dans le fichier partagé. */
check('le site ne garde aucune copie de la chaîne',
  !/function itineraire\(a, b, quand\)\{/.test(page)
  && !/function arrondiDizaine\(/.test(page)
  && /window\.ELA_ROUTE\.prix\(gamme, km\)/.test(page));
check('Admin v2 ne recalcule rien lui-même',
  /window\.ELA_ROUTE\.prix\(/.test(actions) && /window\.ELA_ROUTE\.itineraire\(/.test(actions)
  && !/arrondiDizaine\s*\(p\)\s*\{/.test(actions));
/* LA GRILLE EST UN PARAMÈTRE OBLIGATOIRE, jamais un défaut caché. Un
   défaut ici serait une DEUXIÈME grille, muette le jour où la vraie
   change — même règle que le lecteur de demandes. */
check('« prix » ne porte aucune grille par défaut',
  /function prix\(gamme, km\)\{\s*\n\s*return Math\.max\(arrondiDizaine\(gamme\.parKm \* km\), gamme\.mini\);/
    .test(partage));
/* L'ARRONDI DE BARBAROS : le 5 pile DESCEND. Un « >= » ferait payer 10 €
   de plus que ce qui a été annoncé au téléphone. */
check('l’arrondi compare le reste à 5 avec un « > », jamais un « >= »',
  /\(p - bas > 5\)/.test(partage) && !/\(p - bas >= 5\)/.test(partage));
/* LA GRILLE DU FAUX SERVEUR EST CELLE DU DÉPÔT. Si elles se séparaient, le
   contrôle de parité au centime plus haut n'éprouverait plus rien. */
check('la grille du test est celle du dépôt',
  /parKm:2\.65[\s\S]{0,60}mini:30/.test(page) && /parKm:4\.00[\s\S]{0,60}mini:50/.test(page));
/* LE FICHIER PARTAGÉ EST PUBLIÉ ET INJECTÉ. Oublié dans la recette, il
   marche en local — où le serveur sert le dépôt entier — et reste
   introuvable en ligne. Le contrôle ne lit que les lignes de COMMANDE :
   le premier jet du même contrôle pour « carte/ » passait au vert en
   trouvant le mot dans un commentaire d'explication. */
const recette = (await readFile('construire.sh', 'utf8'))
  .split('\n').filter(l => !l.trim().startsWith('#')).join('\n');
check('« construire.sh » publie le fichier partagé',
  /cp [^\n]*itineraire-partage\.js/.test(recette));
check('et l’injecte dans Admin v2 AVANT les modules qui l’appellent',
  recette.indexOf("'/itineraire-partage.js'") > -1
  && recette.indexOf("'/itineraire-partage.js'") < recette.indexOf("'/admin-v2-actions.js'"));
/* ═══ LE MODULE RECOPIÉ A ÉTÉ RETIRÉ, ET CE CONTRÔLE EN GARDE LA TRACE ═══
   « admin-v2-itineraire.js » est arrivé dans main juste avant la fusion de
   #191, par un autre chemin que celui-ci : il refaisait le géocodage, ne
   gardait qu'OSRM des quatre niveaux, et surtout REFAISAIT L'ARRONDI avec
   « Math.round », c'est-à-dire l'arrondi de l'école. Or le 5 pile DESCEND
   chez Barbaros. MESURÉ, pas supposé : sur les distances de 1 à 60 km par
   pas de 250 m, DIX-NEUF donnaient un prix différent de celui du site,
   toujours 10 € PLUS CHER. Le prix est ferme donc opposable.
   Les deux modules ont même coexisté une construction : l'écran portait
   alors DEUX boutons « Calculer le prix depuis les adresses », côte à
   côte, rendant deux prix. Pire que l'un ou l'autre.
   CE QU'IL VERROUILLAIT DE BON EST GARDÉ ICI : aucun tarif kilométrique
   ne doit être recopié dans un module de l'espace exploitant. */
check('aucun tarif kilométrique n’est recopié côté exploitant',
  !/2\.35|2\.65|4\.08|4\.00/.test(actions));
check('le module recopié n’existe plus',
  !existsSync('admin-v2-itineraire.js'),
  existsSync('admin-v2-itineraire.js') ? 'il est encore là' : '');
/* Et il ne doit pas revenir par la recette : publié, il se rechargerait et
   reposerait son bouton en JS, sans que le HTML n'en porte la trace. */
check('et la recette ne le publie plus',
  !/admin-v2-itineraire/.test(recette));

/* SANS LUI DANS LE SHELL, le script principal lève « pas chargé » dès sa
   première ligne hors ligne : ce n'est pas le prix qu'on perdrait, c'est
   la page entière. */
const sw = await readFile('sw.js', 'utf8');
check('il est dans le SHELL du service worker',
  /"\.\/itineraire-partage\.js"/.test(sw));

console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✔ ' + t));
if(ko.length){ console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
console.log('\n' + (ko.length ? '✘ ' + ko.length + ' contrôle(s) au rouge' : '=== ' + ok.length + ' contrôles au vert ==='));
process.exit(ko.length ? 1 : 0);
