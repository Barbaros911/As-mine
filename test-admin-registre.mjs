/* =====================================================================
   TEST-ADMIN-REGISTRE.MJS — le registre, la sauvegarde et le CSV d'Admin v2
   ---------------------------------------------------------------------
   CE QU'IL ÉPROUVE, ET CE QUE ÇA COÛTAIT :

   Admin v2 montrait ce qui ARRIVE, jamais ce qui a été FAIT. Pas de
   résultat par semaine, pas de tableau des chauffeurs, pas d'export
   comptable. Basculer dessus aurait laissé Barbaros sans ses chiffres —
   et sans le fichier que réclame un comptable.

   LES DEUX CONTRÔLES QUI COMPTENT LE PLUS, et aucun des deux ne se voit :

   1. LES TABLEAUX NE COMPTENT QUE LES « realisee ». Une course confirmée
      est une promesse. La compter ferait prendre des promesses pour de
      l'argent encaissé — le total s'affiche, il est simplement faux.

   2. UN TOTAL CALCULÉ SUR UNE LISTE TRONQUÉE MENT SANS UN MOT. Le tableau
      de bord ne lit que les 300 dernières courses : parfait pour montrer
      ce qui arrive, mensonger pour additionner une année. Le registre fait
      sa propre lecture, et s'il touche son plafond il le DIT.

   ELLE ÉPROUVE LE SITE CONSTRUIT : les scripts d'Admin v2 ne sont
   rattachés à la page que par « construire.sh ».

   Lancer :  node test-admin-registre.mjs   (elle construit et sert elle-même)
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
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
await new Promise(r => serveur.listen(8095, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8095';
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));

/* Une attente qui expire doit NOMMER ce qu'elle attendait — même leçon que
   la suite d'intake : « une suite muette est un échec » vaut aussi pour une
   suite qui plante. */
const attendre = async (page, fn, nom, arg) => {
  try { await page.waitForFunction(fn, arg, {timeout:8000}); return true; }
  catch { const vu = await page.textContent('#regEtat').catch(()=>'(illisible)');
          check(nom, false, 'rien n’est venu — l’écriteau dit : « '+(vu||'(vide)')+' »');
          return false; }
};

/* ═══ LE JEU DE COURSES, ÉCRIT À LA MAIN ═══
   Les dates sont ANCRÉES : une semaine « en cours » calculée depuis
   « aujourd'hui » rendrait la suite dépendante du jour où on la lance, et
   c'est exactement le défaut que la CI a trouvé sur les fixtures SQL. On
   déplace donc l'horloge du navigateur à un lundi connu.
   Le lundi de référence est le 14/09/2026 ; « la semaine dernière »
   commence le 07/09. */
const bon = (date, prix, statut, chauffeur, prov) => ({
  course:{date:date, heure:'09:00', depart:'Roissy T2E', arrivee:'Paris 8e', vehicule:'Berline'},
  client:{nom:'Client '+date, telephone:'0612345678'},
  chauffeur: chauffeur ? {nom:chauffeur} : undefined,
  paiementNom:'Carte bancaire',
  provenance: prov,
  prix:{total:prix, ht:prix/1.1, tva:prix-prix/1.1}
});
const COURSES = [
  /* cette semaine, réalisées : 80 + 120 = 200 € sur 2 courses, moyenne 100 */
  {ref:'ELA-26-09-0101', statut:'realisee',  bon:bon('2026-09-14', 80,  'realisee', 'Mehmet', 'easyHotel Aéroville')},
  {ref:'ELA-26-09-0102', statut:'realisee',  bon:bon('2026-09-16', 120, 'realisee', 'Karim',  'easyHotel Aéroville')},
  /* cette semaine, CONFIRMÉE : 999 € qui ne doivent JAMAIS être comptés */
  {ref:'ELA-26-09-0103', statut:'confirmee', bon:bon('2026-09-17', 999, 'confirmee','Mehmet', 'easyHotel Aéroville')},
  /* cette semaine, ANNULÉE : 500 € qui ne doivent jamais être comptés */
  {ref:'ELA-26-09-0104', statut:'annulee',   bon:bon('2026-09-15', 500, 'annulee',  null,     'Public ELA')},
  /* la semaine dernière, réalisée : 60 € sur 1 course */
  {ref:'ELA-26-09-0090', statut:'realisee',  bon:bon('2026-09-09', 60,  'realisee', 'Mehmet', null)},
  /* un mois plus tôt, réalisée : elle doit sortir au résultat « mois » */
  {ref:'ELA-26-08-0010', statut:'realisee',  bon:bon('2026-08-12', 40,  'realisee', 'Karim',  'Public ELA')},
];
let LOT = COURSES;                 /* ce que le faux serveur rend */
let dernieresLectures = [];        /* les URL de lecture, pour lire la limite */

const CHAUFFEURS = [
  { id:'d-ok', nom_affiche:'Mehmet', telephone_whatsapp:'0612345678',
    statut:'valide', actif:true, papiers_etat:'valide', etat_effectif:'valide', attribuable:true },
];
const restaurations = [];          /* ce qui part vraiment vers le serveur */

const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'fr-FR' });

/* UNE SEULE ROUTE QUI DÉCIDE DE TOUT : l'ordre de priorité des routes n'est
   pas le même d'une version de Playwright à l'autre. */
await ctx.route('**/*', r => {
  const u = r.request().url();
  if(u.startsWith(BASE)) return r.continue();
  if(!u.includes('supabase.co')) return r.abort();
  const J = o => r.fulfill({contentType:'application/json', body:JSON.stringify(o)});

  if(u.includes('/rpc/ela_restaurer_courses_exploitant')){
    const corps = JSON.parse(r.request().postData()||'{}');
    restaurations.push(corps);
    const refs = new Set(LOT.map(c=>c.ref));
    const neufs = (corps.p_courses||[]).filter(c=>c && c.ref && !refs.has(c.ref));
    /* Le faux serveur AJOUTE, comme le vrai : les refs déjà là sont ignorées. */
    LOT = LOT.concat(neufs.map(c=>({ref:c.ref, statut:c.statut||'attente', bon:c})));
    return J({ajoutees:neufs.length,
              ignorees:(corps.p_courses||[]).length - neufs.length, refusees:0});
  }
  if(u.includes('/rpc/est_exploitant')) return J(true);
  if(u.includes('/parametres_commerciaux')) return J([]);
  if(u.includes('/rpc/ela_rafraichir_actions')) return J(0);
  if(u.includes('/chauffeurs_etat')) return J(CHAUFFEURS);
  if(u.includes('/rest/v1/chauffeurs')) return J(CHAUFFEURS);
  if(u.includes('/actions_requises')) return J([]);
  if(u.includes('/rest/v1/courses')){ dernieresLectures.push(u); return J(LOT); }
  return J([]);
});

await ctx.addInitScript(() => {
  sessionStorage.setItem('ela_admin_session', JSON.stringify({
    access_token:'jeton-de-test', refresh_token:'r', user:{ email:'exploitant@test' } }));
});
/* L'horloge du navigateur est posée au jeudi 17/09/2026 : le lundi de la
   semaine en cours est le 14/09, celui d'avant le 07/09. */
await ctx.addInitScript(() => {
  const T = new Date('2026-09-17T10:00:00+02:00').getTime();
  const D = Date;
  class FausseDate extends D {
    constructor(...a){ if(a.length===0) super(T); else super(...a); }
    static now(){ return T; }
  }
  window.Date = FausseDate;
});

const p = await ctx.newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message));
await p.goto(BASE+'/admin-v2.html', {waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof openBooking==='function'
  && !!document.querySelector('[data-tab="registre"]'), null, {timeout:20000});

/* ══════════════ 1. L'ONGLET EXISTE ET OUVRE SON ÉCRAN ══════════════
   Un onglet qui n'ouvre rien est pire qu'un onglet absent. */
check("l'onglet « Registre » est dans la barre",
  await p.locator('[data-tab="registre"]').count() === 1);
check("l'écran du registre existe",
  await p.locator('#s-registre').count() === 1);

/* LES ONGLETS MÈNENT CHACUN À UN ÉCRAN DIFFÉRENT. C'est la règle du site,
   et elle vaut pour tout onglet qu'on ajouterait demain : deux onglets pour
   un même écran, c'est quelqu'un qui appuie sur le second, ne voit rien
   bouger, et en conclut que l'outil est cassé. */
const cibles = await p.$$eval('#nav button[data-tab]', bs => bs.map(x=>x.dataset.tab));
check('chaque onglet mène à un écran différent',
  new Set(cibles).size === cibles.length, cibles.join(', '));
const manquants = [];
for(const t of cibles) if(await p.locator('#s-'+t).count() !== 1) manquants.push(t);
check('chaque onglet vise un écran qui existe', manquants.length === 0, manquants.join(', '));

await p.click('[data-tab="registre"]');
check("l'écran du registre s'affiche au clic",
  await p.locator('#s-registre').evaluate(e => e.classList.contains('on')));

const lu = await attendre(p, () => {
  const m = document.getElementById('regMetrics');
  return m && m.textContent.includes('€');
}, "le registre se lit à l'ouverture de son écran");

if(lu){
  /* ═══ 2. LE CONTRÔLE QUI COMPTE : SEULES LES « realisee » COMPTENT ═══
     Recalculé à la main depuis le jeu de courses, jamais repris de ce que
     la page affiche : un test qui prend la sortie pour référence ne
     vérifie plus rien.
       cette semaine, réalisées : 80 + 120 = 200 €, 2 courses, moyenne 100
       la confirmée à 999 € et l'annulée à 500 € ne sont PAS dedans. */
  const metrics = (await p.textContent('#regMetrics')).replace(/ | /g,' ');
  /* Le libellé et sa valeur se touchent dans « textContent » — pas d'espace,
     donc pas de frontière de mot entre le « 2 » et le mot qui suit. On lit
     la valeur DANS son propre élément plutôt que dans la soupe. */
  const chiffre = async lbl => (await p.$$eval('#regMetrics .metric', (ns, l) => {
    const n = ns.find(x => x.textContent.startsWith(l));
    return n ? (n.querySelector('strong')||{}).textContent : null; }, lbl));
  check('« Courses cette semaine » compte 2 courses',
    await chiffre('Courses cette semaine') === '2',
    String(await chiffre('Courses cette semaine')));
  check('« Encaissé cette semaine » vaut 200 €', metrics.includes('200 €'), metrics.slice(0,160));
  check('le panier moyen vaut 100 €', metrics.includes('100 €'), metrics.slice(0,160));
  check("une course CONFIRMÉE n'est pas comptée (999 € absent)", !metrics.includes('999'));
  check("une course ANNULÉE n'est pas comptée (500 € absent)", !metrics.includes('500'));
  check('la semaine précédente est rappelée à côté (60 €)', metrics.includes('60 €'),
    metrics.slice(0,200));

  /* ═══ 3. LE RÉSULTAT PAR PÉRIODE, ET SON BASCULEMENT ═══ */
  const sem = await p.textContent('#regResultat');
  check('le résultat par semaine nomme la semaine du 14/09', sem.includes('Semaine du 14/09/2026'),
    sem.slice(0,200));
  check('le résultat par semaine porte les 200 € de la semaine en cours', sem.includes('200 €'));
  check('la semaine du 07/09 y est aussi', sem.includes('Semaine du 07/09/2026'));
  check("le mois d'août n'apparaît PAS dans le découpage par semaine",
    !sem.includes('août'), sem.slice(0,200));

  await p.click('[data-periode="mois"]');
  const mois = await p.textContent('#regResultat');
  check('le bouton « Mois » redessine le résultat', mois.includes('septembre 2026'), mois.slice(0,200));
  check('août 2026 sort avec ses 40 €', mois.includes('août 2026') && mois.includes('40 €'),
    mois.slice(0,200));
  check('septembre additionne les trois réalisées du mois (260 €)', mois.includes('260 €'),
    mois.slice(0,200));

  await p.click('[data-periode="annee"]');
  const annee = await p.textContent('#regResultat');
  check("l'année additionne tout le réalisé (300 €)", annee.includes('300 €'), annee.slice(0,200));
  await p.click('[data-periode="semaine"]');

  /* ═══ 4. LES CHAUFFEURS, DU PLUS RAPPORTEUR AU MOINS ═══
     C'est le tableau qui sert à décider à qui confier la prochaine course :
     l'ORDRE est l'information, pas la présence. Mehmet 80+60=140,
     Karim 120+40=160 — donc Karim en tête. Un contrôle de présence serait
     passé au vert sur un tri inversé. */
  const chauff = await p.$$eval('#regChauffeurs .reg-ligne strong', n => n.map(x=>x.textContent.trim()));
  check('le tableau des chauffeurs est trié par argent rapporté',
    chauff[0] === 'Karim' && chauff[1] === 'Mehmet', chauff.join(' > '));
  const txtCh = await p.textContent('#regChauffeurs');
  check('Karim totalise 160 €', txtCh.includes('160 €'), txtCh.slice(0,200));
  check('Mehmet totalise 140 €', txtCh.includes('140 €'), txtCh.slice(0,200));
  check("le chauffeur d'une course confirmée n'ajoute rien à son total",
    !txtCh.includes('999'), txtCh.slice(0,200));

  /* ═══ 5. D'OÙ VIENNENT LES CLIENTS — DEUX CHIFFRES, DEUX QUESTIONS ═══
     Les DEMANDES comptent tout (l'affiche a travaillé même si la course
     n'a pas eu lieu) ; l'ARGENT ne compte que les réalisées. Confondre les
     deux ferait croire qu'un hôtel rapporte ce qu'il a seulement promis.
     easyHotel : 3 demandes, 2 réalisées, 200 €. */
  const prov = (await p.textContent('#regProvenance')).replace(/ | /g,' ');
  check("« D'où viennent les clients » nomme easyHotel", prov.includes('easyHotel Aéroville'));
  check('easyHotel compte 3 demandes', /3 demandes/.test(prov), prov.slice(0,220));
  check('easyHotel ne compte que 2 réalisées', /2 réalisées/.test(prov), prov.slice(0,220));
  check("l'argent d'easyHotel s'arrête aux réalisées (200 €)", prov.includes('200 €'),
    prov.slice(0,220));
  check("une course sans provenance ne crée pas de ligne",
    !/undefined|null/.test(prov), prov.slice(0,220));

  /* ═══ 6. LE PLAFOND DE LECTURE — ON NE MONTRE PAS UN TOTAL TRONQUÉ ═══
     Le tableau de bord ne lit que 300 courses. Un registre qui
     additionnerait une année sur cette liste-là mentirait sans un mot. */
  const url = dernieresLectures[dernieresLectures.length-1] || '';
  const limite = Number((url.match(/limit=(\d+)/)||[])[1] || 0);
  check('le registre fait sa propre lecture, au-delà des 300 du tableau de bord',
    limite > 300, 'limite lue : ' + limite + ' — ' + url.slice(0,120));
  check("l'avertissement de troncature est muet quand on n'atteint pas le plafond",
    await p.locator('#regTronque').isHidden());
}

/* ═══ 7. L'EXPORT CSV — POINT-VIRGULE, BOM, ET LE VRAI CONTENU ═══
   Excel en français lit le CSV au séparateur de sa locale : une virgule
   met tout dans une seule colonne. On INTERCEPTE le téléchargement plutôt
   que de relire le code — c'est le fichier que le comptable ouvre. */
const csv = await new Promise(async res => {
  p.once('download', async d => res(await (await import('node:fs/promises'))
    .readFile(await d.path(), 'utf8')));
  await p.click('#btnRegCSV');
  setTimeout(()=>res(null), 8000);
});
if(csv === null){ check("l'export CSV produit un fichier", false, 'aucun téléchargement'); }
else {
  check("le CSV commence par un BOM (Excel ne massacre pas les accents)",
    csv.charCodeAt(0) === 0xFEFF, 'premier caractère : ' + csv.charCodeAt(0));
  const entete = csv.replace(/^﻿/,'').split('\r\n')[0];
  check('le CSV est séparé par des points-virgules', entete.includes(';'), entete.slice(0,120));
  check("le CSV n'utilise pas la virgule comme séparateur", !/,/.test(entete), entete.slice(0,120));
  /* LE CSV PORTE TOUT LE REGISTRE, pas seulement les réalisées : un
     comptable veut la ligne de l'annulée aussi, et une course à venir se
     retrouve par sa référence. */
  check('le CSV porte TOUT le registre, pas seulement les réalisées',
    csv.includes('ELA-26-09-0104') && csv.includes('ELA-26-09-0103'));
  check('le CSV porte la provenance', csv.includes('easyHotel Aéroville'));
  check('les montants sont à la virgule décimale française',
    /;80,00;/.test(csv), (csv.split('\r\n')[1]||'').slice(0,160));
  check('le nom du chauffeur est dans le CSV', csv.includes('Mehmet'));
}

/* ═══ 8. LA SAUVEGARDE — LE MÊME FORMAT QUE L'ESPACE ACTUEL ═══
   Tant que les deux espaces coexistent, une sauvegarde prise d'un côté doit
   se restaurer de l'autre. Deux formats voudraient dire deux lecteurs, et
   c'est celui qu'on oublie qui refuserait le fichier le jour où il sert. */
const json = await new Promise(async res => {
  p.once('download', async d => res(await (await import('node:fs/promises'))
    .readFile(await d.path(), 'utf8')));
  await p.click('#btnRegSauver');
  setTimeout(()=>res(null), 8000);
});
if(json === null){ check('la sauvegarde produit un fichier', false, 'aucun téléchargement'); }
else {
  let o = null; try { o = JSON.parse(json); } catch(e){}
  check('la sauvegarde est un JSON lisible', !!o);
  check("elle porte le format « elatransfer-1 », celui de l'espace actuel",
    o && o.format === 'elatransfer-1', o && o.format);
  check('elle emporte les courses', o && Array.isArray(o.courses) && o.courses.length === 6,
    o && o.courses && o.courses.length);
  check('chaque course y garde sa référence ET son statut',
    o && o.courses.every(c => c.ref && c.statut),
    JSON.stringify((o&&o.courses&&o.courses[0])||{}).slice(0,120));
  check('elle emporte aussi le carnet de chauffeurs', o && Array.isArray(o.chauffeurs));
}

/* ═══ 9. LA RESTAURATION AJOUTE, ELLE N'ÉCRASE JAMAIS ═══
   On envoie un fichier qui contient UNE course déjà là (0101) et UNE
   nouvelle (0201). La règle est posée côté serveur ; ce qu'on éprouve ici,
   c'est que l'écran lui envoie bien tout et rapporte honnêtement les deux
   chiffres — un écran qui annoncerait « 2 ajoutées » ferait croire qu'une
   course perdue est revenue. */
const fichier = JSON.stringify({ format:'elatransfer-1', courses:[
  {ref:'ELA-26-09-0101', statut:'attente', course:{date:'2026-09-14'}, prix:{total:80}},
  {ref:'ELA-26-09-0201', statut:'realisee', course:{date:'2026-09-15'},
   chauffeur:{nom:'Luis'}, prix:{total:70}}
]});
await p.setInputFiles('#regFichier', {name:'sauvegarde.json', mimeType:'application/json',
                                      buffer:Buffer.from(fichier)});
const restaure = await attendre(p, () => {
  const e = document.getElementById('regEtat');
  return e && /ajout/i.test(e.textContent);
}, 'la restauration rend un compte-rendu');

if(restaure){
  const dit = await p.textContent('#regEtat');
  check('elle annonce 1 course ajoutée', /\b1 course ajoutée/.test(dit), dit);
  check('elle annonce 1 course déjà présente, non touchée',
    /1 déjà présente/.test(dit) && /pas été touchée/.test(dit), dit);
  check("elle passe par la RPC serveur, jamais par une écriture directe",
    restaurations.length === 1, restaurations.length + ' appel(s)');
  check('elle envoie les DEUX lignes au serveur — c’est lui qui tranche',
    restaurations[0] && restaurations[0].p_courses
      && restaurations[0].p_courses.length === 2,
    JSON.stringify(restaurations[0]||{}).slice(0,160));
  const apres = await p.textContent('#regMetrics');
  check('le registre se relit après une restauration',
    apres.includes('€'), apres.slice(0,120));
}

/* ═══ 10. CE QUI N'EST PAS UNE SAUVEGARDE NE PART PAS AU SERVEUR ═══
   Un fichier illisible doit être arrêté ICI : l'envoyer ferait porter au
   serveur une erreur que l'écran pouvait voir, et Barbaros lirait un
   message de base de données. */
const avant = restaurations.length;
await p.setInputFiles('#regFichier', {name:'photo.json', mimeType:'application/json',
                                      buffer:Buffer.from('ceci n’est pas du JSON')});
await p.waitForTimeout(400);
const refus = await p.textContent('#regEtat');
check("un fichier illisible est refusé et le DIT", /n’est pas une sauvegarde/.test(refus), refus);
check("un fichier illisible ne part JAMAIS au serveur", restaurations.length === avant,
  (restaurations.length - avant) + ' appel(s) de trop');

/* ═══ 11. LE PLAFOND ATTEINT SE DIT ═══
   On remplace le lot par exactement le plafond : les totaux ne portent
   plus sur tout, et l'écran doit le dire au lieu d'afficher un chiffre
   qu'on sait faux. C'est le contrôle qui ne se voit pas — un total
   tronqué s'affiche sans le moindre message. */
const PLAFOND = Number((await p.evaluate(async () => {
  const t = await (await fetch('/admin-v2-registre.js')).text();
  return (t.match(/PLAFOND\s*=\s*(\d+)/)||[])[1];
})) || 0);
check('le plafond de lecture est écrit une seule fois dans le module', PLAFOND > 300,
  'PLAFOND = ' + PLAFOND);
LOT = Array.from({length:PLAFOND}, (_,i) => ({
  ref:'ELA-26-01-'+String(i).padStart(4,'0'), statut:'realisee',
  bon:bon('2026-01-05', 10, 'realisee', 'Mehmet', null)}));
await p.click('#btnRegActualiser');
const dit = await attendre(p, n => {
  const e = document.getElementById('regTronque');
  return e && !e.hidden && e.textContent.includes(String(n));
}, "le plafond atteint est ANNONCÉ, pas tu", PLAFOND);
if(dit){
  const t = await p.textContent('#regTronque');
  check("l'avertissement dit que les totaux sont partiels",
    /que sur celles-là|totaux/.test(t), t.slice(0,180));
}

check('aucune erreur JavaScript sur toute la traversée', errs.length === 0, errs.join(' | '));

await b.close(); serveur.close();
if(ok.length) console.log('=== RÉUSSIS ('+ok.length+') ===\n' + ok.map(x=>'  ✔ '+x).join('\n'));
if(ko.length){ console.log('\n=== ÉCHECS ('+ko.length+') ===\n' + ko.map(x=>'  ✘ '+x).join('\n'));
  process.exit(1); }
console.log('\nRegistre Admin v2 : ' + ok.length + ' contrôles au vert.');
