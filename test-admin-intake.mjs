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
  if(u.includes('/rpc/est_exploitant')) return J(true);
  if(u.includes('/rpc/ela_rafraichir_actions')) return J(0);
  if(u.includes('/chauffeurs_etat')) return J([]);
  if(u.includes('/rest/v1/chauffeurs')) return J([]);
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

check('aucune erreur JavaScript pendant tout le parcours', errs.length === 0,
  errs.join(' | '));

await b.close(); serveur.close();
console.log('');
if(ok.length) console.log('=== RÉUSSIS ('+ok.length+') ===');
ok.forEach(x=>console.log('  ✔ '+x));
if(ko.length){ console.log(''); console.log('=== ÉCHECS ('+ko.length+') ==='); ko.forEach(x=>console.log('  ✘ '+x)); }
process.exit(ko.length ? 1 : 0);
