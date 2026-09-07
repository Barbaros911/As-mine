/* =====================================================================
   TEST-NOUVEAU-PREAVIS.MJS — les 20 minutes de préavis
   ---------------------------------------------------------------------
   Il faut trouver un chauffeur, le prévenir, et qu'il roule jusqu'au
   client. Accepter un départ dans cinq minutes, c'est promettre ce qu'on
   ne peut pas tenir — et chez Elatransfer l'heure est ferme comme le prix.

   CE QUI EST VERROUILLÉ :

   — LE SEUIL EST UN REFUS, PAS UN AVERTISSEMENT. On éprouve les deux côtés
     de la frontière : 10 minutes est refusé, 40 minutes passe. Un test qui
     ne vérifierait que le refus laisserait passer un code qui refuse tout.
   — LE TEXTE ANNONCE LE MÊME DÉLAI QUE LE CODE. C'est le vrai piège de ce
     genre de règle : la constante bouge, la phrase reste, et le site
     annonce vingt minutes en en exigeant quarante. Le contrôle lit la
     constante DANS LA PAGE et la cherche dans la phrase, en français comme
     en anglais.
   — ON NE RENVOIE PAS LE CLIENT SANS RIEN. Quelqu'un qui veut une voiture
     tout de suite est un client, pas une erreur de saisie : téléphone et
     WhatsApp sont dans l'écriteau, comme pour une adresse hors zone.
   — UNE HEURE PASSÉE GARDE SON PROPRE MESSAGE. « Trop proche » ne veut
     rien dire pour hier.
   — LE CONTRÔLE EST REFAIT À LA SOUMISSION. Entre le moment où le client
     choisit son heure et celui où il appuie, le temps passe : une
     réservation laissée ouverte devient trop proche toute seule.
   — LA ZONE ET LE PRÉAVIS NE SE CONTREDISENT PAS. Ils éteignent le même
     bouton ; sans point de rendez-vous, le second à s'exécuter rallumerait
     ce que le premier vient d'éteindre.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-preavis.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

/* Une heure locale à N minutes d'ici, au format des deux champs. Il faut
   la calculer dans le fuseau du navigateur : « toISOString » rendrait de
   l'UTC, et le test tomberait juste ou faux selon l'heure du jour. */
function dansNMinutes(n){
  const d = new Date(Date.now() + n*60000);
  const p = x => String(x).padStart(2,'0');
  return { date:`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`,
           heure:`${p(d.getHours())}:${p(d.getMinutes())}` };
}

async function page(){
  const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(e.message));
  await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}]})}));
  await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}]})}));
  await p.route('**://api.openrouteservice.org/**', r => r.abort());
  await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
    body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
  await p.route('**supabase.co/**', r => r.abort());
  await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(400);
  await p.type('#depart','vendome',{delay:10}); await p.waitForTimeout(850);
  await p.locator('#departList [role=option]').first().click();
  await p.type('#arrivee','argenteuil',{delay:10}); await p.waitForTimeout(850);
  await p.locator('#arriveeList [role=option]').first().click();
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  return { ctx, p };
}

/* --- LE SEUIL, DES DEUX CÔTÉS ---------------------------------------- */
let { ctx, p } = await page();

let t = dansNMinutes(10);
await p.fill('#date', t.date); await p.fill('#heure', t.heure);
await p.waitForTimeout(300);
check('un départ dans 10 min est refusé', !(await p.locator('#tropTot').isHidden()));
check('et le bouton du prix est éteint', await p.locator('#btnVoirPrix').isDisabled());

t = dansNMinutes(40);
await p.fill('#date', t.date); await p.fill('#heure', t.heure);
await p.waitForTimeout(300);
check('un départ dans 40 min passe', await p.locator('#tropTot').isHidden());
check('et le bouton se rallume', !(await p.locator('#btnVoirPrix').isDisabled()));

/* Le seuil lui-même : 25 minutes doit passer, sinon la règle mord plus
   loin que ce qu'elle annonce. */
t = dansNMinutes(25);
await p.fill('#date', t.date); await p.fill('#heure', t.heure);
await p.waitForTimeout(300);
check('25 min passe : la règle ne mord pas plus loin qu\'annoncé',
  await p.locator('#tropTot').isHidden());

/* --- L'ÉCRITEAU DIT QUOI FAIRE --------------------------------------- */
t = dansNMinutes(5);
await p.fill('#date', t.date); await p.fill('#heure', t.heure);
await p.waitForTimeout(300);
const txt = await p.locator('#tropTot').innerText();
check('il annonce 20 minutes', /20\s*minutes/.test(txt), txt.replace(/\n/g,' | '));
check('et il donne un téléphone à appeler',
  (await p.locator('#tropTot a[href^="tel:"]').count())===1);
check('et WhatsApp',
  (await p.locator('#tropTot a[href*="wa.me"]').count())===1);

/* --- LE CONTRÔLE EST REFAIT À LA SOUMISSION -------------------------- */
/* On force le bouton à redevenir cliquable, comme si l'heure était encore
   bonne au moment du choix, et on appuie. Le site doit refuser QUAND MÊME :
   c'est le cas réel d'une page laissée ouverte. */
await p.evaluate(()=>{ document.getElementById('btnVoirPrix').disabled = false; });
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(1000);
check('appuyer quand même ne fait pas passer la course',
  await p.locator('#ecran-accueil').isVisible()
  && !(await p.locator('#ecran-vehicules').isVisible()));
check('et l\'écriteau reste affiché', !(await p.locator('#tropTot').isHidden()));

/* --- UNE HEURE PASSÉE GARDE SON PROPRE MESSAGE ----------------------- */
t = dansNMinutes(-120);
await p.fill('#date', t.date); await p.fill('#heure', t.heure);
await p.waitForTimeout(300);
check('une heure passée n\'est pas dite « trop proche »',
  await p.locator('#tropTot').isHidden());
await p.evaluate(()=>{ document.getElementById('btnVoirPrix').disabled = false; });
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(600);
const refus = await p.locator('#refus').textContent();
check('elle a son message à elle', /déjà passée/i.test(refus), refus);

/* --- LA ZONE ET LE PRÉAVIS NE SE CONTREDISENT PAS -------------------- */
/* Une adresse hors zone éteint le bouton. Corriger ensuite l'heure ne doit
   PAS le rallumer : le second juge rallumerait ce que le premier a éteint
   s'ils ne se parlaient pas. */
await ctx.close();
({ ctx, p } = await page());
await p.evaluate(()=>{
  /* On déplace l'arrivée à Lille sans toucher au reste du formulaire. */
  const evt = new Event('input', {bubbles:true});
  document.getElementById('arrivee').value = "Lille";
  document.getElementById('arrivee').dispatchEvent(evt);
});
await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',
  body:JSON.stringify({features:[{geometry:{coordinates:[3.0573,50.6292]},
    properties:{label:"Place du Général de Gaulle, 59000 Lille"}}]})}));
await p.fill('#arrivee','lille'); await p.waitForTimeout(900);
await p.locator('#arriveeList [role=option]').first().click();
await p.waitForTimeout(300);
check('une arrivée hors zone éteint le bouton', await p.locator('#btnVoirPrix').isDisabled());
t = dansNMinutes(240);
await p.fill('#date', t.date); await p.fill('#heure', t.heure);
await p.waitForTimeout(300);
check('et corriger l\'heure ne le rallume PAS tant que la zone est mauvaise',
  await p.locator('#btnVoirPrix').isDisabled());
check('l\'écriteau « hors zone » est toujours là', !(await p.locator('#horsZone').isHidden()));
await ctx.close();

/* --- LA DATE DU JOUR, VUE À 1 H DU MATIN -----------------------------
   LE BUG QUE CE CONTRÔLE EMPÊCHE DE REVENIR. La date proposée venait de
   « toISOString », qui rend de l'UTC : à 1 h du matin à Paris (UTC+2), il
   est encore 23 h la veille en UTC. Le site se croyait la veille,
   proposait la date d'hier, et la laissait choisir. Barbaros l'a vu le
   7 septembre à 1 h, avec le 6 encore sélectionnable.
   Un décalage d'un jour NE SE VOIT JAMAIS EN JOURNÉE : il n'apparaît que
   dans les deux premières heures après minuit, exactement quand personne
   ne teste. On déplace donc l'horloge du navigateur pour aller le
   chercher. -------------------------------------------------------- */
{
  const ctxN = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR',
    timezoneId:'Europe/Paris'});
  const pn = await ctxN.newPage();
  pn.on('pageerror',e=>errs.push(e.message));
  /* 1 h 12 du matin, heure de Paris. En UTC c'est encore la veille à
     23 h 12 — c'est tout l'intérêt du cas. */
  await ctxN.addInitScript(() => {
    const faux = new Date('2026-09-07T01:12:00+02:00').getTime();
    const Vrai = Date;
    const decalage = faux - Vrai.now();
    // eslint-disable-next-line no-global-assign
    Date = class extends Vrai {
      constructor(...a){ if(a.length===0) super(Vrai.now()+decalage); else super(...a); }
      static now(){ return Vrai.now()+decalage; }
    };
  });
  await pn.route('**://photon.komoot.io/**', r=>r.fulfill({contentType:'application/json',body:'{"features":[]}'}));
  await pn.route('**://api-adresse.data.gouv.fr/**', r=>r.fulfill({contentType:'application/json',body:'{"features":[]}'}));
  await pn.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await pn.waitForTimeout(500);
  const j = await pn.evaluate(()=>{
    const d = document.getElementById('date');
    return { valeur:d.value, borne:d.min, vu:new Date().toString() };
  });
  check('à 1 h du matin, la date proposée est CELLE DU JOUR, pas la veille',
    j.valeur==='2026-09-07', j.valeur+' (le navigateur est le '+j.vu.slice(0,15)+')');
  check('et la borne du champ interdit la veille',
    j.borne==='2026-09-07', j.borne);
  /* Le cas exact qu'il décrit : choisir hier 10 h. Le champ doit le
     refuser — et si le client le tape quand même, le site aussi. */
  await pn.fill('#date','2026-09-06');
  await pn.fill('#heure','10:00');
  await pn.waitForTimeout(300);
  check('choisir hier 10 h éteint le bouton',
    await pn.locator('#btnVoirPrix').isDisabled());
  check('et le dit, au lieu d\'un bouton gris sans raison',
    !(await pn.locator('#heurePassee').isHidden()));
  check('sans afficher en même temps « trop proche »',
    await pn.locator('#tropTot').isHidden());
  await ctxN.close();
}

/* --- LA BORNE DU CHAMP D'HEURE, ET LE DÉFAUT QUI NE DOIT PAS ÊTRE REFUSÉ
   « il est 1 h 41, je dois pas pouvoir sélectionner 1 h 40 ». Sur un
   ordinateur le navigateur refuse ; sur un téléphone la molette est
   dessinée par le système et ignore la borne — l'écriteau prend alors le
   relais. On éprouve les deux. ------------------------------------- */
{
  const ctxH = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR',
    timezoneId:'Europe/Paris'});
  const ph = await ctxH.newPage();
  ph.on('pageerror',e=>errs.push(e.message));
  await ctxH.addInitScript(() => {
    const faux = new Date('2026-09-07T01:41:00+02:00').getTime();
    const Vrai = Date; const dec = faux - Vrai.now();
    Date = class extends Vrai {
      constructor(...a){ if(a.length===0) super(Vrai.now()+dec); else super(...a); }
      static now(){ return Vrai.now()+dec; }
    };
  });
  await ph.route('**://photon.komoot.io/**', r=>r.fulfill({contentType:'application/json',body:'{"features":[]}'}));
  await ph.route('**://api-adresse.data.gouv.fr/**', r=>r.fulfill({contentType:'application/json',body:'{"features":[]}'}));
  await ph.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await ph.waitForTimeout(500);

  /* À 1 h 41, le premier créneau est 2 h 01 — 2 h 02 si la seconde a
     tourné entre-temps, l'arrondi étant à la minute SUPÉRIEURE. On accepte
     les deux plutôt que de figer une seconde précise : un test qui dépend
     de l'instant où il s'exécute finit par tomber tout seul. */
  const borne = await ph.locator('#heure').getAttribute('min');
  check('à 1 h 41, la borne du champ d\'heure est le premier créneau',
    borne==='02:05', borne);
  /* LE PAS ET LA BORNE DOIVENT ÊTRE D'ACCORD. « step » est compté à partir
     de « min » : une borne à 2 h 01 donnerait la grille 2 h 01, 2 h 06,
     2 h 11 — des heures que personne ne choisit. La borne doit donc tomber
     sur un multiple du pas. */
  check('et elle tombe sur la grille des 5 minutes',
    Number(borne.slice(3)) % 5 === 0, borne);

  /* SON EXEMPLE EXACT — « il est 1 h 41, je ne dois pas pouvoir
     sélectionner 1 h 40 ». À la réflexion, 1 h 40 est DÉJÀ PASSÉ d'une
     minute : c'est l'autre écriteau qui doit parler. On éprouve donc les
     deux refus voisins, parce que les confondre serait dire au client de
     corriger la mauvaise chose. */
  await ph.fill('#heure','01:40'); await ph.waitForTimeout(300);
  check('1 h 40 est marqué invalide par le navigateur',
    !(await ph.locator('#heure').evaluate(e => e.checkValidity())));
  check('1 h 40 à 1 h 41 : c\'est « déjà passée », pas « trop proche »',
    !(await ph.locator('#heurePassee').isHidden())
    && await ph.locator('#tropTot').isHidden()
    && await ph.locator('#btnVoirPrix').isDisabled());
  await ph.fill('#heure','01:50'); await ph.waitForTimeout(300);
  check('1 h 50 à 1 h 41 : là c\'est « trop proche »',
    !(await ph.locator('#tropTot').isHidden())
    && await ph.locator('#heurePassee').isHidden()
    && await ph.locator('#btnVoirPrix').isDisabled());
  await ph.fill('#heure','02:30'); await ph.waitForTimeout(300);
  check('2 h 30 passe', await ph.locator('#tropTot').isHidden()
    && !(await ph.locator('#btnVoirPrix').isDisabled()));

  /* La borne n'a de sens qu'AUJOURD'HUI : demain 1 h 40 est parfaitement
     réservable, et une borne laissée en place le refuserait. */
  await ph.fill('#date','2026-09-08'); await ph.fill('#heure','01:40');
  await ph.waitForTimeout(300);
  check('demain 1 h 40 est accepté : la borne a été retirée',
    (await ph.locator('#heure').getAttribute('min'))===null
    && await ph.locator('#tropTot').isHidden(),
    'min='+await ph.locator('#heure').getAttribute('min'));
  await ctxH.close();
}

/* --- LE FORMULAIRE NE S'OUVRE JAMAIS DÉJÀ REFUSÉ ---------------------
   L'heure par défaut est 10 h : parfaite à 1 h du matin, impossible à
   9 h 55. Le client arrivait alors sur un bouton éteint sans avoir rien
   touché. ---------------------------------------------------------- */
for (const [instant, attendu] of [['2026-09-07T09:55:00+02:00', true],
                                  ['2026-09-07T01:41:00+02:00', false]]) {
  const ctxD = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR',
    timezoneId:'Europe/Paris'});
  await ctxD.addInitScript(([i]) => {
    const faux = new Date(i).getTime();
    const Vrai = Date; const dec = faux - Vrai.now();
    Date = class extends Vrai {
      constructor(...a){ if(a.length===0) super(Vrai.now()+dec); else super(...a); }
      static now(){ return Vrai.now()+dec; }
    };
  }, [instant]);
  const pd = await ctxD.newPage();
  pd.on('pageerror',e=>errs.push(e.message));
  await pd.route('**://photon.komoot.io/**', r=>r.fulfill({contentType:'application/json',body:'{"features":[]}'}));
  await pd.route('**://api-adresse.data.gouv.fr/**', r=>r.fulfill({contentType:'application/json',body:'{"features":[]}'}));
  await pd.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await pd.waitForTimeout(500);
  const h = await pd.locator('#heure').inputValue();
  check('à '+instant.slice(11,16)+', le formulaire s\'ouvre sur un moment réservable',
    await pd.locator('#tropTot').isHidden() && !(await pd.locator('#btnVoirPrix').isDisabled()),
    'heure proposée : '+h);
  check('à '+instant.slice(11,16)+', 10 h est '+(attendu?'déplacé':'gardé'),
    attendu ? h!=='10:00' : h==='10:00', h);
  await ctxD.close();
}

/* --- LES CRÉNEAUX DE 5 MINUTES ---------------------------------------
   « fait en sorte que les clients puissent commander toutes les 5 minutes ».
   Le pas vit à DEUX endroits — l'attribut « step » du champ, en secondes,
   et « PAS_MINUTES » dans le script qui arrondit le premier créneau. S'ils
   se désaccordent, la borne tombe hors de la grille et le champ propose des
   heures que personne ne veut. Le test les compare. ------------------ */
{
  const src = await (await fetch('http://127.0.0.1:8099/index.html')).text();
  const step = src.match(/id="heure"[^>]*step="(\d+)"/);
  const pas = src.match(/var PAS_MINUTES\s*=\s*(\d+)/);
  check('le champ d\'heure porte un pas', !!step, step ? step[1]+' s' : 'absent');
  check('et le script connaît le même pas', !!pas, pas ? pas[1]+' min' : 'absent');
  check('les deux sont d\'accord',
    step && pas && Number(step[1]) === Number(pas[1]) * 60,
    step && pas ? step[1]+' s contre '+pas[1]+' min' : '');
  check('le pas est bien de 5 minutes', pas && pas[1] === '5', pas ? pas[1] : '');
}

/* --- SON EXEMPLE, AVEC SES CHIFFRES ----------------------------------
   « il est 2 h 08, il peut commander à partir de 2 h 28… pardon, avec les
   créneaux, 2 h 30 ». C'est la règle entière en une phrase : le préavis
   pousse à 2 h 28, la grille arrondit à 2 h 30. On l'éprouve tel quel,
   parce qu'un exemple donné par celui qui exploite le service vaut mieux
   qu'un cas inventé. ------------------------------------------------ */
for (const [instant, premier, refuse] of [
      ['2026-09-07T02:08:00+02:00', '02:30', '02:25'],
      /* PILE SUR LA GRILLE, ET C'EST LE CAS QUI A RÉVÉLÉ UN DÉFAUT.
         2 h 10 + 20 min = 2 h 30, déjà un multiple de 5. Mais l'horloge
         réelle marque 2 h 10 et quelques millisecondes : le préavis tombait
         à 19 min 59 s, 2 h 30 était refusé, et le client poussé à 2 h 35 —
         cinq minutes perdues pour une fraction de seconde. On part
         maintenant de la minute en cours, secondes rabotées. */
      ['2026-09-07T02:10:00+02:00', '02:30', '02:25'],
      /* Juste après un créneau : 2 h 11 + 20 = 2 h 31 → 2 h 35. */
      ['2026-09-07T02:11:00+02:00', '02:35', '02:30']]) {
  const ctxE = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR',
    timezoneId:'Europe/Paris'});
  await ctxE.addInitScript(([i]) => {
    const faux = new Date(i).getTime();
    const Vrai = Date; const dec = faux - Vrai.now();
    Date = class extends Vrai {
      constructor(...a){ if(a.length===0) super(Vrai.now()+dec); else super(...a); }
      static now(){ return Vrai.now()+dec; }
    };
  }, [instant]);
  const pe = await ctxE.newPage();
  pe.on('pageerror',e=>errs.push(e.message));
  await pe.route('**://photon.komoot.io/**', r=>r.fulfill({contentType:'application/json',body:'{"features":[]}'}));
  await pe.route('**://api-adresse.data.gouv.fr/**', r=>r.fulfill({contentType:'application/json',body:'{"features":[]}'}));
  await pe.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await pe.waitForTimeout(500);
  const h = instant.slice(11,16);
  check('à '+h+', le premier créneau réservable est '+premier,
    (await pe.locator('#heure').getAttribute('min'))===premier,
    await pe.locator('#heure').getAttribute('min'));
  await pe.fill('#heure', premier); await pe.waitForTimeout(300);
  check('à '+h+', '+premier+' est accepté',
    await pe.locator('#tropTot').isHidden()
    && !(await pe.locator('#btnVoirPrix').isDisabled()));
  await pe.fill('#heure', refuse); await pe.waitForTimeout(300);
  check('à '+h+', le créneau d\'avant ('+refuse+') est refusé',
    !(await pe.locator('#tropTot').isHidden())
    && await pe.locator('#btnVoirPrix').isDisabled());
  await ctxE.close();
}

/* --- LE TEXTE ET LE CODE ANNONCENT LE MÊME DÉLAI ---------------------
   Le vrai piège de cette règle : la constante bouge, la phrase reste, et
   le site annonce vingt minutes en en exigeant quarante. On lit donc la
   constante DANS LA PAGE, et on la cherche dans les deux langues. ----- */
const source = await (await fetch('http://127.0.0.1:8099/index.html')).text();
const m = source.match(/var DELAI_MINIMUM_MIN\s*=\s*(\d+)/);
check('la constante du préavis existe', !!m, m ? m[1]+' minutes' : 'introuvable');
if(m){
  const n = m[1];
  const fr = source.match(/tot_note:"([^"]*)"/);
  const en = source.match(/tot_note:"([^"]*)"[\s\S]*?tot_note:"([^"]*)"/);
  check('la phrase française annonce le même nombre',
    fr && fr[1].includes(n+' minutes'), fr ? fr[1].slice(0,60)+'…' : '');
  check('la phrase anglaise aussi',
    en && en[2].includes(n+' minutes'), en ? en[2].slice(0,60)+'…' : '');
}

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
