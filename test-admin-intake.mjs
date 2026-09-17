/* =====================================================================
   TEST-ADMIN-INTAKE.MJS — « Coller une demande » dans Admin v2
   ---------------------------------------------------------------------
   CE QU'IL ÉPROUVE, ET CE QUE ÇA COÛTAIT :

   Neuf courses sur dix arrivent par message WhatsApp. Admin v2 ne savait
   que RELIRE ce que le serveur contenait déjà : basculer dessus aurait
   retiré à Barbaros son geste le plus fréquent, sans rien pour le
   remplacer.

   CE QUE LA SUITE SURVEILLE VRAIMENT — le lecteur n'est PAS recopié.
   « intake-demande.js » est la source unique, appelée par l'espace actuel
   ET par Admin v2. Deux lecteurs pour un même message, c'est la
   divergence assurée le jour où la forme du message change, et elle ne se
   verrait qu'à la course suivante.

   ELLE APPUIE SUR LE BOUTON, elle ne relit pas le code. Un bouton mort au
   bout d'un écran est pire qu'un bouton absent.

   ELLE ÉPROUVE LE SITE CONSTRUIT : les scripts d'Admin v2 ne sont
   rattachés à la page que par « construire.sh ».

   Lancer :  node test-admin-intake.mjs   (elle construit et sert elle-même)
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
await new Promise(r => serveur.listen(8094, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8094';
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));

/* UNE ATTENTE QUI EXPIRE DOIT NOMMER CE QU'ELLE ATTENDAIT.
   Éprouvée contre cinq falsifications : trois faisaient tomber la suite sur
   un délai d'attente NU — elle échouait bien, mais sans dire pourquoi, et
   c'est une demi-heure de recherche à chaque fois. « Une suite muette est un
   échec » vaut aussi pour une suite qui plante : ici le délai devient un
   contrôle rouge, nommé, et la suite continue pour dire tout ce qui casse
   au lieu du premier. */
const attendre = async (page, fn, nom, arg) => {
  try { await page.waitForFunction(fn, arg, {timeout:8000}); return true; }
  catch { const vu = await page.textContent('#intakeEtat').catch(()=>'(illisible)');
          check(nom, false, 'rien n’est venu — l’écriteau dit : « '+(vu||'(vide)')+' »');
          return false; }
};

/* LE MESSAGE EST CELUI QUE LE SITE ÉCRIT VRAIMENT — neuf lignes, avec
   « Paiement » AVANT « Prix » parce que le lecteur retient le DERNIER
   montant en euros comme prix de la course. */
const MESSAGE = [
  'Nouvelle demande ELA-26-09-0042',
  'Départ : 10 rue de la Paix, 75002 Paris',
  'Arrivée : Terminal 2E — Aéroport Charles-de-Gaulle',
  'Date : 18/09/2026 07:30',
  'Véhicule : Van',
  'Passagers : 5 passagers',
  'Paiement : Carte bancaire',
  'Prix : 95,00 €',
  'Jean Martin — 06 12 34 56 78'
].join('\n');

/* Les mêmes libellés, EN ANGLAIS : le lecteur lit la PLACE des choses, pas
   les mots. Un client espagnol écrit « Salida ». */
const MESSAGE_EN = [
  'New request ELA-26-09-0077',
  'Pickup : 3 avenue Foch, 75116 Paris',
  'Dropoff : Gare de Lyon',
  'When : 20/09/2026 14:05',
  'Vehicle : Berline',
  'Payment : Espèces',
  'Total : 60,00 €',
  'Maria Lopez — 07 11 22 33 44'
].join('\n');

let COURSES = [];
const attributions = [];

/* LA GRILLE VIENT DU SERVEUR : ce sont ces valeurs-la que l'ecran doit
   afficher, jamais des nombres recopies dans la page. */
const PARAMS = [
  { cle:'tarif_general_berline', valeur:{par_km_centimes:265, minimum_centimes:3000} },
  { cle:'tarif_general_van',     valeur:{par_km_centimes:400, minimum_centimes:5000} },
];

/* Deux chauffeurs : l'un attribuable, l'autre non -- papiers perimes. */
const CHAUFFEURS = [
  { id:'d-ok', nom_affiche:'Mehmet', telephone_whatsapp:'0612345678',
    statut:'valide', actif:true, papiers_etat:'valide', etat_effectif:'valide', attribuable:true },
  { id:'d-perime', nom_affiche:'Ayse', telephone_whatsapp:'0698765432',
    statut:'valide', actif:true, papiers_etat:'perime', etat_effectif:'papiers', attribuable:false },
];
const recus = [];          /* ce qui part vraiment vers le serveur */
let refuserDoublon = true;

const b = await chromium.launch();
const ctx = await b.newContext({
  viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'fr-FR',
  permissions:['clipboard-read','clipboard-write']
});

/* UNE SEULE ROUTE QUI DÉCIDE DE TOUT : l'ordre de priorité des routes n'est
   pas le même d'une version de Playwright à l'autre — deux routes obligent
   à connaître cet ordre, une seule ne peut pas se tromper. */
await ctx.route('**/*', r => {
  const u = r.request().url();
  if(u.startsWith(BASE)) return r.continue();
  if(!u.includes('supabase.co')) return r.abort();
  const J = o => r.fulfill({contentType:'application/json', body:JSON.stringify(o)});

  if(u.includes('/rpc/ela_creer_course_exploitant')){
    const corps = JSON.parse(r.request().postData()||'{}');
    recus.push(corps);
    /* LE SERVEUR REFUSE UNE RÉFÉRENCE DÉJÀ PRISE, il n'écrase pas. */
    if(refuserDoublon && COURSES.some(c=>c.ref===corps.p_ref))
      return r.fulfill({status:400, contentType:'application/json',
        body:JSON.stringify({message:'reference_existante'})});
    COURSES = COURSES.concat([{ref:corps.p_ref, statut:corps.p_statut, bon:corps.p_bon}]);
    return J(corps.p_ref);
  }
  if(u.includes('/rpc/ela_attribuer_chauffeur')){
    const c = JSON.parse(r.request().postData()||'{}');
    attributions.push(c);
    /* Le serveur refuse un chauffeur aux papiers perimes -- c'est la regle
       de #191, et la saisie telephone ne doit pas pouvoir la contourner. */
    if(c.p_chauffeur_id==='d-perime')
      return r.fulfill({status:400, contentType:'application/json',
        body:JSON.stringify({message:'chauffeur_non_attribuable'})});
    return J('attribuee');
  }
  if(u.includes('/rpc/est_exploitant')) return J(true);
  if(u.includes('/parametres_commerciaux')) return J(PARAMS);
  if(u.includes('/rpc/ela_rafraichir_actions')) return J(0);
  if(u.includes('/chauffeurs_etat')) return J(CHAUFFEURS);
  if(u.includes('/rest/v1/chauffeurs')) return J(CHAUFFEURS);
  if(u.includes('/actions_requises')) return J([]);
  if(u.includes('/rest/v1/courses')) return J(COURSES);
  return J([]);
});

await ctx.addInitScript(() => {
  sessionStorage.setItem('ela_admin_session', JSON.stringify({
    access_token:'jeton-de-test', refresh_token:'r', user:{ email:'exploitant@test' } }));
});

const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto(BASE+'/admin-v2.html', {waitUntil:'domcontentloaded'});
/* ON ATTEND CE QU'ON VEUT VOIR, jamais une durée : un délai fixe est un
   pari sur la vitesse de la machine. */
await p.waitForFunction(()=>typeof openBooking==='function'
  && !!document.getElementById('btnCollerV2'), null, {timeout:20000});

/* ---------------------------------------------------------------------
   1. LA SOURCE EST UNIQUE — le lecteur n'est pas recopié
   --------------------------------------------------------------------- */
check('le lecteur partagé est chargé dans Admin v2',
  await p.evaluate(()=>!!(window.ELA_INTAKE && window.ELA_INTAKE.lireDemande)),
  'sans lui, Admin v2 aurait sa propre copie et les deux divergeraient');
check('…et il expose aussi le constructeur du bon',
  await p.evaluate(()=>typeof window.ELA_INTAKE.courseDepuis === 'function'));
check('il REFUSE de travailler sans grille de gammes',
  await p.evaluate(()=>{ try{ window.ELA_INTAKE.lireDemande('x'); return false; }
                         catch(e){ return /grille/.test(e.message); } }),
  'un défaut caché serait une deuxième grille, muette le jour où la vraie change');

/* ---------------------------------------------------------------------
   2. LE GESTE : on appuie, on ne relit pas le code
   --------------------------------------------------------------------- */
check('« Coller une demande » est EN HAUT du tableau de bord',
  await p.evaluate(()=>{
    const z=document.getElementById('zoneIntake'), a=document.getElementById('actions');
    if(!z||!a) return false;
    return z.getBoundingClientRect().top < a.getBoundingClientRect().top;
  }),
  'neuf courses sur dix arrivent par message : c’est le geste principal');

await p.evaluate(m => navigator.clipboard.writeText(m), MESSAGE);
await p.click('#btnCollerV2');
await attendre(p, ()=>/ajout/i.test(document.getElementById('intakeEtat').textContent),
  'le collage aboutit à une demande ajoutée');

check('la demande collée part vraiment vers le serveur', recus.length === 1,
  'reçu : '+recus.length+' appel(s)');
const envoi = recus[0] || {};
check('…avec la référence du message, reprise telle quelle',
  envoi.p_ref === 'ELA-26-09-0042',
  'reçu : '+envoi.p_ref+' — le client a cette référence sur son bon');
check('UNE DEMANDE DE CLIENT ENTRE EN « ATTENTE », jamais confirmée',
  envoi.p_statut === 'attente',
  'reçu : '+envoi.p_statut+' — la confirmer promettrait une voiture que personne n’a acceptée');
check('l’origine « collée » est transmise', envoi.p_origine === 'collee');

const bon = envoi.p_bon || {};
const c = bon.course || {};
check('le départ est lu par sa PLACE, pas par son libellé',
  c.depart === '10 rue de la Paix, 75002 Paris', 'reçu : '+c.depart);
check('l’arrivée aussi', (c.arrivee||'').startsWith('Terminal 2E'), 'reçu : '+c.arrivee);
check('la date est recomposée en ISO', c.date === '2026-09-18', 'reçu : '+c.date);
check('l’heure est conservée', c.heure === '07:30', 'reçu : '+c.heure);
check('le véhicule est reconnu par son nom', c.vehiculeCle === 'van', 'reçu : '+c.vehiculeCle);
check('le DERNIER montant en euros est le prix',
  (bon.prix||{}).total === 95, 'reçu : '+JSON.stringify(bon.prix));
check('le nom et le téléphone viennent de la dernière ligne',
  (bon.client||{}).nom === 'Jean Martin' && (bon.client||{}).telephone === '06 12 34 56 78',
  'reçu : '+JSON.stringify(bon.client));
check('le mode de règlement est lu', bon.paiement === 'carte', 'reçu : '+bon.paiement);

/* ---------------------------------------------------------------------
   3. LE CHAMP RESTE OUVERT, VIDÉ — les demandes arrivent par trois ou quatre
   --------------------------------------------------------------------- */
check('le champ de saisie est vidé après un ajout',
  await p.evaluate(()=>document.getElementById('intakeTexte').value === ''));

/* ---------------------------------------------------------------------
   4. COLLER DEUX FOIS LE MÊME MESSAGE N’ÉCRASE RIEN
       C’est ce qui arrive la nuit, sur dix demandes d’affilée.
   --------------------------------------------------------------------- */
await p.click('#btnCollerV2');
check('un second collage est REFUSÉ et le dit',
  await attendre(p, ()=>/existe déjà/i.test(document.getElementById('intakeEtat').textContent),
    'un second collage est REFUSÉ et le dit'));
check('…et l’écriteau nomme la course concernée',
  /ELA-26-09-0042/.test(await p.textContent('#intakeEtat')));
check('rien n’a été écrasé côté serveur',
  COURSES.filter(x=>x.ref==='ELA-26-09-0042').length === 1,
  'reçu : '+COURSES.length+' course(s)');

/* ---------------------------------------------------------------------
   5. LE LECTEUR LIT LA PLACE, PAS LES MOTS — message aux libellés anglais
   --------------------------------------------------------------------- */
await p.evaluate(m => navigator.clipboard.writeText(m), MESSAGE_EN);
await p.click('#btnCollerV2');
await attendre(p, ()=>/ELA-26-09-0077/.test(document.getElementById('intakeEtat').textContent),
  'la référence du message anglais est reprise telle quelle');
const en = (recus[recus.length-1]||{p_bon:{course:{}}}).p_bon.course;
check('un message aux libellés ANGLAIS est lu pareil',
  en.depart === '3 avenue Foch, 75116 Paris' && en.arrivee === 'Gare de Lyon',
  'reçu : '+en.depart+' → '+en.arrivee);
check('…et sa gamme aussi', en.vehiculeCle === 'berline', 'reçu : '+en.vehiculeCle);

/* ---------------------------------------------------------------------
   6. UN MESSAGE QUI N’EST PAS UNE DEMANDE EST REFUSÉ, ET ON LE DIT
       Mieux vaut le dire que de créer une course à moitié vide que
       Barbaros découvrirait au moment de l’assurer.
   --------------------------------------------------------------------- */
const avant = recus.length;
await p.evaluate(()=>navigator.clipboard.writeText('Bonjour, vous faites Orly ?'));
await p.click('#btnCollerV2');
await attendre(p, ()=>/pas une demande/i.test(document.getElementById('intakeEtat').textContent),
  'un message quelconque est annoncé comme « pas une demande »');
check('un message qui n’est pas une demande est refusé', recus.length === avant,
  'aucun appel serveur ne doit partir');
check('…et l’écriteau dit ce qui manque',
  /départ|arrivée|date/i.test(await p.textContent('#intakeEtat')));

/* ---------------------------------------------------------------------
   7. LE REPLI : un presse-papiers muet ne doit pas laisser un bouton mort
       Certains navigateurs laissent la promesse EN ATTENTE INDÉFINIMENT —
       sans minuterie, le bouton ne fait alors rien du tout, sans un mot.
   --------------------------------------------------------------------- */
const p2 = await ctx.newPage();
await p2.addInitScript(()=>{
  Object.defineProperty(navigator, 'clipboard', {
    configurable:true, get:()=>({ readText:()=>new Promise(()=>{}) }) });
});
await p2.goto(BASE+'/admin-v2.html', {waitUntil:'domcontentloaded'});
await p2.waitForFunction(()=>!!document.getElementById('btnCollerV2'), null, {timeout:20000});
await p2.click('#btnCollerV2');
const repli = await p2.waitForSelector('#intakeTexte:not([hidden])', {timeout:8000}).then(()=>true).catch(()=>false);
check('un presse-papiers qui ne répond jamais ouvre le champ de repli', repli,
  'sans minuterie, le bouton ne ferait rien du tout, sans un mot');
check('…et le bouton « Ajouter » apparaît avec lui',
  await p2.isVisible('#btnIntakeAjouter'),
  'un champ sans bouton serait une impasse');

/* Et le repli MARCHE : on tape le message à la main et la course part.
   ON NE TENTE CE PARCOURS QUE SI LE CHAMP EST VRAIMENT OUVERT. Sinon le
   « fill » lève sur un élément masqué et la suite meurt AVANT d'imprimer
   son bilan — elle échoue en silence, ce qui est la panne qu'on interdit
   partout ailleurs. Éprouvé : en retirant la minuterie, cette suite rendait
   zéro ligne ✘ et un simple délai d'attente. */
const avant2 = recus.length;
if(repli){
  await p2.fill('#intakeTexte', MESSAGE.replace('0042','0055'));
  await p2.click('#btnIntakeAjouter');
  await attendre(p2, ()=>/ajout/i.test(document.getElementById('intakeEtat').textContent),
    'le champ de repli aboutit à une demande ajoutée');
  check('le champ de repli crée vraiment la course', recus.length === avant2 + 1,
    'un bouton mort au bout d’un écran est pire qu’un bouton absent');
  check('…avec la référence du message tapé à la main',
    (recus[recus.length-1]||{}).p_ref === 'ELA-26-09-0055');
} else {
  check('le champ de repli crée vraiment la course', false,
    'le champ ne s’est jamais ouvert : le parcours de secours est inatteignable');
}

/* =====================================================================
   BRIQUE 2 — SAISIR UNE COURSE REÇUE PAR TÉLÉPHONE
   ---------------------------------------------------------------------
   « Coller une demande » ne couvre que le client qui ÉCRIT. Quand un hôtel
   APPELLE, il aurait fallu fabriquer un faux message pour le coller.
   ===================================================================== */
await p.click('#btnTelephoneV2');
await p.waitForSelector('#formTelephone:not([hidden])', {timeout:8000});

check('« Saisir par téléphone » ouvre un vrai formulaire', true);

/* LA GRILLE AFFICHÉE VIENT DU SERVEUR. C'est sur elle que Barbaros annonce
   un montant au téléphone : un nombre recopié dans la page resterait
   périmé au premier changement de tarif, sans que rien ne le signale. */
const grille = await p.textContent('#tfGrille');
check('la grille affichée vient du SERVEUR, pas de la page',
  grille.includes('2.65') && grille.includes('4.00') && grille.includes('30') && grille.includes('50'),
  'reçu : '+grille);

/* ON DIT CE QUI MANQUE, PAS « formulaire incomplet ». */
await p.fill('#tfNom','Hôtel Ibis');
await p.evaluate(()=>document.getElementById('formTelephone')
  .dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})));
await attendre(p, ()=>/manque/i.test(document.getElementById('intakeEtat').textContent),
  'un formulaire incomplet dit CE QUI manque');
const manque = await p.textContent('#intakeEtat');
check('…et il NOMME les champs manquants',
  /téléphone/i.test(manque) && /départ/i.test(manque) && /prix/i.test(manque),
  'reçu : '+manque);

/* MÊME CONTRÔLE DE TÉLÉPHONE QUE CÔTÉ CLIENT — et c'est la même fonction. */
await p.fill('#tfTel','87654321');
await p.fill('#tfDepart','10 rue de la Paix, Paris');
await p.fill('#tfArrivee','Orly 1');
await p.fill('#tfDate','2026-09-25');
await p.fill('#tfHeure','09:15');
await p.fill('#tfPrix','80');
const avantTel = recus.length;
await p.evaluate(()=>document.getElementById('formTelephone')
  .dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})));
await attendre(p, ()=>/valable/i.test(document.getElementById('intakeEtat').textContent),
  'un numéro impossible est refusé');
check('un numéro sans indicatif qui ne commence pas par zéro est refusé',
  recus.length === avantTel,
  'aucun appel serveur ne doit partir — c’est une course qu’on ne pourrait pas rappeler');

/* LA COURSE PRISE AU TÉLÉPHONE ENTRE « CONFIRMEE ». */
await p.fill('#tfTel','06 11 22 33 44');
await p.evaluate(()=>document.getElementById('formTelephone')
  .dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})));
await attendre(p, ()=>/Course créée/i.test(document.getElementById('intakeEtat').textContent),
  'la saisie téléphone crée la course');
const tel1 = recus[recus.length-1] || {};
check('une course prise au téléphone entre CONFIRMEE, pas en attente',
  tel1.p_statut === 'confirmee',
  'reçu : '+tel1.p_statut+' — elle a été convenue de vive voix, personne n’attend');
check('…et son origine est « telephone »', tel1.p_origine === 'telephone');
check('le règlement N’EST PAS inventé',
  (tel1.p_bon||{}).paiement === '',
  'inventer « espèces » ferait partir le chauffeur sans son terminal');
check('le bon a la MÊME forme que celui d’une demande collée',
  !!(tel1.p_bon||{}).course && !!(tel1.p_bon||{}).client && !!(tel1.p_bon||{}).prix,
  'deux formes différentes pour la même course se reliraient mal');

/* ON OUVRE LE BON JUSTE APRÈS, et ce n'est pas un confort : c'est là que
   s'affiche l'avertissement sur les papiers du chauffeur. La preuve est
   que la feuille recouvre la page — la suite a d'abord calé dessus. */
/* ON MESURE LE TITRE DE LA FEUILLE, pas sa « visibilité » : la feuille est
   toujours dans le DOM et c'est une classe qui la montre. Un contrôle sur
   « isVisible » aurait pu répondre oui sans que le bon soit celui-là. */
const vu = await attendre(p, r => (document.getElementById('sheetTitle')||{}).textContent?.includes(r),
  'le bon s’ouvre juste après la création', tel1.p_ref);
const ouvertSur = await p.textContent('#sheetTitle').catch(()=>'');
check('le bon s’ouvre juste après la création, sur LA bonne course',
  vu && ouvertSur.includes(tel1.p_ref),
  'titre de la feuille : « '+ouvertSur+' » — c’est là que s’affiche l’avertissement sur les papiers');
await p.click('#closeSheet').catch(()=>{});

/* LE SÉLECTEUR DE CHAUFFEUR NE PROPOSE QUE LES ATTRIBUABLES. */
await p.click('#btnTelephoneV2');
await p.waitForSelector('#formTelephone:not([hidden])', {timeout:8000});
const proposes = await p.evaluate(()=>[...document.querySelectorAll('#tfChauffeur option')]
  .map(o=>o.textContent.trim()).filter(t=>!t.startsWith('—')));
check('le sélecteur ne propose pas un chauffeur aux papiers périmés',
  !proposes.includes('Ayse'), 'reçu : '+JSON.stringify(proposes));
check('…mais propose bien celui qui est en règle', proposes.includes('Mehmet'));

/* ET LE SERVEUR REFUSE QUAND MÊME, SI ON PASSE OUTRE.
   L’écran cache, le serveur impose — c’est la règle de ce lot, et la
   saisie téléphone ne doit pas pouvoir la contourner. */
await p.fill('#tfNom','Client Deux'); await p.fill('#tfTel','06 55 44 33 22');
await p.fill('#tfDepart','Gare de Lyon'); await p.fill('#tfArrivee','CDG 2E');
await p.fill('#tfDate','2026-09-26'); await p.fill('#tfHeure','11:00'); await p.fill('#tfPrix','90');
await p.evaluate(()=>{ const s=document.getElementById('tfChauffeur');
  const o=document.createElement('option'); o.value='d-perime'; o.textContent='Ayse';
  s.appendChild(o); s.value='d-perime'; });
const avantAttr = attributions.length;
await p.evaluate(()=>document.getElementById('formTelephone')
  .dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})));
await attendre(p, ()=>/Course créée/i.test(document.getElementById('intakeEtat').textContent),
  'la course est créée même si l’attribution échoue');
check('l’attribution passe par la RPC, jamais par le bon écrit à la main',
  attributions.length === avantAttr + 1,
  'c’est elle qui impose la règle des papiers');
const dit = await p.textContent('#intakeEtat');
check('le refus d’attribution est DIT, pas avalé',
  /papiers/i.test(dit), 'reçu : '+dit);
check('…et la course existe quand même',
  COURSES.some(c=>c.bon && c.bon.client && c.bon.client.nom === 'Client Deux'),
  'on ne perd pas un appel parce qu’un chauffeur n’était pas attribuable');

check('aucune erreur JavaScript pendant tout le parcours', errs.length === 0,
  errs.join(' | '));

await b.close(); serveur.close();
console.log('');
if(ok.length) console.log('=== RÉUSSIS ('+ok.length+') ===');
ok.forEach(x=>console.log('  ✔ '+x));
if(ko.length){ console.log(''); console.log('=== ÉCHECS ('+ko.length+') ==='); ko.forEach(x=>console.log('  ✘ '+x)); }
process.exit(ko.length ? 1 : 0);
