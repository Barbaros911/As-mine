/* =====================================================================
   TEST-NOUVEAU-SERVICES.MJS — les cartes de services
   ---------------------------------------------------------------------
   Cinq entrées depuis septembre 2026, à la demande de Barbaros : aéroport,
   hôtel, gare, professionnel, mise à disposition.

   CE QUI SE VÉRIFIE ICI N'EST PAS LA LISTE, C'EST LA RÈGLE QUI LA
   GOUVERNE. Une carte mène au formulaire si, et seulement si, ce qu'elle
   annonce est une ADRESSE — le site ne sait réserver qu'un trajet d'un
   point à un autre. Un hôtel, une gare, un rendez-vous d'affaires en sont ;
   « un chauffeur à l'heure » n'en est pas un, et l'envoyer vers un
   formulaire qui ne peut pas le prendre serait promettre puis se dédire au
   dernier écran. Elle ouvre donc « Nous joindre ».
   Un contrôle qui figerait les cinq noms tomberait à la première
   réorganisation légitime, sans que rien ne soit cassé — c'est la leçon
   des trois tests qui visaient « p.font-mono », et de la barre du bas
   figée sur quatre onglets.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-services.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
await p.route('**://api.openrouteservice.org/**', r => r.abort());
await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'networkidle'});
await p.waitForTimeout(500);

const noms = await p.locator('.service b').allTextContents();
check('les services sont présentés en cartes', noms.length >= 3, noms.join(' | '));

/* CHAQUE CARTE EST COMPLÈTE : un dessin, un titre, une ligne de
   précisions. Une carte à moitié remplie ne casse rien — elle a juste
   l'air d'un oubli, et c'est ce qui ne se voit pas en relisant le code. */
const completes = await p.evaluate(()=>
  [...document.querySelectorAll('.service')].map(e=>({
    t: (e.querySelector('b')||{}).textContent || '',
    s: (e.querySelector('.service-corps > span:not(.service-icone)')||{}).textContent || '',
    i: !!e.querySelector('.service-icone svg')
  })));
check('chaque carte porte un dessin, un titre et une précision',
  completes.every(c => c.i && c.t.trim() && c.s.trim()),
  JSON.stringify(completes.filter(c=>!(c.i && c.t.trim() && c.s.trim()))));

/* PAS D'EMOJI. Il en proposait cinq — ✈️ 🏨 🚆 💼 🚘 — et ils changent de
   dessin d'un téléphone à l'autre. Même règle que pour les voitures. */
const texteCartes = await p.locator('.services').innerText();
check('aucun emoji dans les cartes',
  !/[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/u.test(texteCartes),
  texteCartes.replace(/\n/g,' | '));

/* LA PASTILLE EST UN ROND, PAS UNE LIGNE DE TEXTE. C'est le piège du
   projet : une règle « .service span span » écrite pour les sous-titres
   attrape aussi la pastille et la repasse en « display:block » — l'icône
   se colle alors en haut à gauche au lieu d'être centrée. Déjà arrivé sur
   « .engagement span ». On MESURE le rond. */
const ronds = await p.evaluate(()=>
  [...document.querySelectorAll('.service-icone')].map(e=>{
    const r = e.getBoundingClientRect();
    return { w:Math.round(r.width), h:Math.round(r.height),
             rond: getComputedStyle(e).borderRadius };
  }));
check('la pastille reste un rond de la même taille partout',
  ronds.length>0 && ronds.every(r=>r.w===ronds[0].w && r.h===ronds[0].h && r.w>=30 && r.w===r.h),
  JSON.stringify(ronds[0] || {}));

/* L'ACCUEIL NE TÉLÉCHARGE PLUS AUCUNE IMAGE. Les cartes portaient trois
   photos ; il en aurait fallu deux de plus, et une photo ne s'installe pas
   sans savoir d'où elle vient. La garantie sous sa forme la plus forte :
   on descend toute la page et rien du dossier « photos/ » ne part. */
const imagesParties = [];
p.on('request', r => { if(/\/photos\//.test(r.url())) imagesParties.push(r.url()); });
await p.evaluate(async ()=>{
  for(let y=0; y<document.body.scrollHeight; y+=400){
    window.scrollTo(0,y); await new Promise(r=>setTimeout(r,60));
  }
});
await p.waitForTimeout(500);
check('l\'accueil ne télécharge aucune photo', imagesParties.length===0,
  imagesParties.join(', '));

/* ═══ LA RÈGLE, ÉPROUVÉE CARTE PAR CARTE ═══
   On ne suppose pas laquelle est laquelle : on lit sa destination déclarée
   et on VÉRIFIE qu'un clic y mène vraiment. Un « data-ecran » qui vise un
   écran inexistant ne casse rien à l'œil — le client appuie, rien ne
   bouge, et il en conclut que le site est cassé. */
const cibles = await p.evaluate(()=>
  [...document.querySelectorAll('.service')].map(e=>({
    nom: e.querySelector('b').textContent.trim(),
    vers: e.getAttribute('data-ecran')
  })));
check('chaque carte déclare un écran qui existe',
  (await p.evaluate(c => c.every(x => !!document.getElementById(x.vers)), cibles)),
  JSON.stringify(cibles));

for(const [i, c] of cibles.entries()){
  await p.locator('.onglet[data-onglet="accueil"]').click();
  await p.waitForTimeout(200);
  await p.locator('.service').nth(i).click();
  await p.waitForTimeout(350);
  check('« '+c.nom+' » ouvre bien l\'écran qu\'elle annonce',
    await p.locator('#'+c.vers).isVisible(), c.vers);
}

/* ET LA RÈGLE ELLE-MÊME : au moins une carte mène au formulaire, au moins
   une n'y mène pas. Sans ces deux bornes, un code qui enverrait TOUT vers
   le formulaire — y compris le chauffeur à l'heure — passerait au vert. */
check('au moins une carte mène au formulaire',
  cibles.some(c => c.vers === 'ecran-accueil'));
check('et la mise à disposition n\'y mène pas',
  cibles.some(c => c.vers !== 'ecran-accueil'),
  cibles.filter(c=>c.vers!=='ecran-accueil').map(c=>c.nom).join(', '));

await p.locator('.onglet[data-onglet="accueil"]').click();
await p.waitForTimeout(200);
check('aucun débordement horizontal',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);

/* LA PISTE DOIT DIRE QU'ELLE CONTINUE. À cinq cartes, si la dernière
   visible s'arrête pile au bord de l'écran, la liste a l'air de finir là
   et personne ne balaye. On vérifie donc qu'elle DÉBORDE de son cadre. */
const piste = await p.evaluate(()=>{
  const e = document.querySelector('.services');
  return { visible: Math.round(e.clientWidth), total: Math.round(e.scrollWidth) };
});
check('la piste des services se voit continuer au-delà du bord',
  piste.total > piste.visible + 40, JSON.stringify(piste));

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
