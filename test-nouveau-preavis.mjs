/* =====================================================================
   TEST-NOUVEAU-PREAVIS.MJS — il n'y a plus de préavis, seulement l'heure
   passée
   ---------------------------------------------------------------------
   4 octobre 2026, à la demande de Barbaros : « je veux pouvoir recevoir
   une demande même lorsque le client souhaite partir immédiatement ». Le
   préavis de 15 minutes REFUSAIT la course ; elle part maintenant, soumise
   à disponibilité. Ce fichier verrouillait le préavis : il verrouille
   désormais son absence, et ce qui reste vrai.

   CE QUI EST VERROUILLÉ :
   — un départ dans 5 minutes est accepté, et va jusqu'aux prix ;
   — une heure RÉELLEMENT passée reste refusée, avec son propre message ET
     une sortie : « Partir dès que possible » ;
   — le contrôle est refait à la soumission (bouton rallumé de force) ;
   — la date du jour se compose en local, jamais en UTC (le bug de 1 h du
     matin, que seul le déplacement de l'horloge atteint) ;
   — le formulaire s'ouvre sur le prochain créneau de la grille des
     5 minutes, sans délai ajouté, et la borne du champ est ce créneau ;
   — le pas vit à deux endroits (step et PAS_MINUTES) et ils s'accordent ;
   — plus aucune trace du préavis dans la page.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-preavis.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

/* Une heure locale à N minutes d'ici, dans le fuseau du navigateur :
   « toISOString » rendrait de l'UTC, et le test tomberait selon l'heure. */
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
/* Une page dont l'horloge est posée à un instant précis, à Paris. */
async function pageA(instant){
  const ctx = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR',timezoneId:'Europe/Paris'});
  await ctx.addInitScript(([i]) => {
    const faux = new Date(i).getTime();
    const Vrai = Date; const dec = faux - Vrai.now();
    // eslint-disable-next-line no-global-assign
    Date = class extends Vrai {
      constructor(...a){ if(a.length===0) super(Vrai.now()+dec); else super(...a); }
      static now(){ return Vrai.now()+dec; }
    };
  }, [instant]);
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(e.message));
  await p.route('**://photon.komoot.io/**', r=>r.fulfill({contentType:'application/json',body:'{"features":[]}'}));
  await p.route('**://api-adresse.data.gouv.fr/**', r=>r.fulfill({contentType:'application/json',body:'{"features":[]}'}));
  await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(500);
  return { ctx, p };
}

/* --- UN DÉPART DANS 5 MINUTES EST ACCEPTÉ ----------------------------- */
let { ctx, p } = await page();
let t = dansNMinutes(5);
await p.fill('#date', t.date); await p.fill('#heure', t.heure);
await p.waitForTimeout(300);
check('un départ dans 5 min allume le bouton', !(await p.locator('#btnVoirPrix').isDisabled()));
check('l\'écriteau « trop proche » n\'existe plus', (await p.locator('#tropTot').count()) === 0);
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1200);
check('et il mène jusqu\'aux prix', await p.locator('#ecran-vehicules').isVisible());
await ctx.close();

/* --- UNE HEURE PASSÉE : REFUSÉE, MAIS AVEC UNE SORTIE ----------------- */
({ ctx, p } = await page());
t = dansNMinutes(-120);
await p.fill('#date', t.date); await p.fill('#heure', t.heure);
await p.waitForTimeout(300);
check('une heure passée éteint le bouton', await p.locator('#btnVoirPrix').isDisabled());
check('et le dit', !(await p.locator('#heurePassee').isHidden()));
/* Le contrôle est refait à la soumission : le bouton rallumé de force ne
   fait pas passer la course — le cas d'une page laissée ouverte. */
await p.evaluate(()=>{ document.getElementById('btnVoirPrix').disabled = false; });
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(700);
check('appuyer quand même ne fait pas passer la course',
  await p.locator('#ecran-accueil').isVisible() && !(await p.locator('#ecran-vehicules').isVisible()));
const refus = await p.locator('#heurePassee').innerText().catch(()=> '');
check('avec son message à elle, toujours affiché', /passée/i.test(refus) && await p.locator('#heurePassee').isVisible(), refus);
/* LA SORTIE : un client qui voulait partir maintenant n'a rien à corriger. */
await p.locator('#btnPasseAsap').click(); await p.waitForTimeout(300);
check('« Partir dès que possible » enlève le refus', await p.locator('#heurePassee').isHidden());
check('et rallume le bouton', !(await p.locator('#btnVoirPrix').isDisabled()));
check('en mode « Dès que possible »', (await p.locator('#btnQuandAsap').getAttribute('aria-pressed')) === 'true');
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1200);
check('et la demande va jusqu\'aux prix', await p.locator('#ecran-vehicules').isVisible());
await ctx.close();

/* --- « DÈS QUE POSSIBLE » ET « PROGRAMMER » -------------------------- */
({ ctx, p } = await page());
check('par défaut, on programme (la plupart des courses sont réservées à l\'avance)',
  (await p.locator('#btnQuandProg').getAttribute('aria-pressed')) === 'true' && await p.locator('#blocDateHeure').isVisible());
await p.locator('#btnQuandAsap').click(); await p.waitForTimeout(200);
const note = await p.locator('#noteAsap').innerText();
check('« Dès que possible » ne promet aucun délai', /disponibilit/i.test(note) && !/\d+\s*min/.test(note), note);
await p.locator('#btnQuandProg').click(); await p.waitForTimeout(200);
check('« Programmer » rend la date et l\'heure', await p.locator('#blocDateHeure').isVisible());
await ctx.close();

/* --- LA DATE DU JOUR, VUE À 1 H DU MATIN -----------------------------
   La date proposée venait de « toISOString » (UTC) : à 1 h à Paris il est
   encore la veille en UTC, et le site proposait hier. Ne se voit jamais en
   journée : on déplace l'horloge pour aller le chercher. -------------- */
{
  const { ctx:c1, p:pn } = await pageA('2026-09-07T01:12:00+02:00');
  const j = await pn.evaluate(()=>{ const d=document.getElementById('date'); return { valeur:d.value, borne:d.min }; });
  check('à 1 h du matin, la date proposée est CELLE DU JOUR', j.valeur==='2026-09-07', j.valeur);
  check('et la borne du champ interdit la veille', j.borne==='2026-09-07', j.borne);
  await pn.fill('#date','2026-09-06'); await pn.fill('#heure','10:00'); await pn.waitForTimeout(300);
  check('choisir hier 10 h éteint le bouton', await pn.locator('#btnVoirPrix').isDisabled());
  check('et le dit', !(await pn.locator('#heurePassee').isHidden()));
  await c1.close();
}

/* --- LA BORNE ET LE DÉFAUT : LE PROCHAIN CRÉNEAU, SANS DÉLAI ---------- */
for (const [instant, attendu] of [['2026-09-07T09:55:00+02:00', '09:55'],
                                  ['2026-09-07T01:41:00+02:00', '01:45'],
                                  ['2026-09-07T03:27:00+02:00', '03:30']]) {
  const { ctx:cd, p:pd } = await pageA(instant);
  const h = await pd.locator('#heure').inputValue();
  check('à '+instant.slice(11,16)+', le formulaire s\'ouvre sur '+attendu, h===attendu, h);
  check('à '+instant.slice(11,16)+', la valeur proposée est la borne du champ',
    h===await pd.locator('#heure').getAttribute('min'), h+' contre '+await pd.locator('#heure').getAttribute('min'));
  check('à '+instant.slice(11,16)+', le bouton est allumé', !(await pd.locator('#btnVoirPrix').isDisabled()));
  await cd.close();
}
/* 1 h 40 à 1 h 41 est passé d'une minute ; 1 h 42 ne l'est pas. */
{
  const { ctx:ch, p:ph } = await pageA('2026-09-07T01:41:00+02:00');
  await ph.fill('#heure','01:40'); await ph.waitForTimeout(300);
  check('1 h 40 à 1 h 41 : « déjà passée »', !(await ph.locator('#heurePassee').isHidden()) && await ph.locator('#btnVoirPrix').isDisabled());
  await ph.fill('#heure','01:41'); await ph.waitForTimeout(300);
  check('1 h 41 à 1 h 41 : la minute en cours n\'est pas passée', await ph.locator('#heurePassee').isHidden() && !(await ph.locator('#btnVoirPrix').isDisabled()));
  await ph.fill('#date','2026-09-08'); await ph.fill('#heure','01:40'); await ph.waitForTimeout(300);
  check('demain 1 h 40 est accepté : la borne a été retirée',
    (await ph.locator('#heure').getAttribute('min'))===null && !(await ph.locator('#btnVoirPrix').isDisabled()),
    'min='+await ph.locator('#heure').getAttribute('min'));
  await ch.close();
}

/* --- L'HEURE PROPOSÉE NE PÉRIME JAMAIS EN SILENCE (4 octobre 2026) ----
   Mesuré sur le site en ligne, horloge figée : page ouverte à 10 h 01,
   heure proposée 10 h 05, adresses tapées à 10 h 06 sans toucher l'heure —
   « Voir mon prix » GRIS, aucun message, plus de réservation possible. Et
   sur la page du flyer, l'appui remettait l'heure puis s'arrêtait : il
   fallait appuyer deux fois. Les autres scènes de ce fichier posent l'heure
   À LA MAIN ; aucune ne laissait le temps passer pendant la saisie.
   L'horloge de Playwright avance quand on le lui demande : c'est la seule
   façon d'atteindre ce défaut sans attendre cinq vraies minutes. */
async function pageHorloge(instant, chemin = 'index.html'){
  const ctx = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR',timezoneId:'Europe/Paris'});
  await ctx.clock.install({ time: new Date(instant) });
  /* WhatsApp s'ouvre à l'envoi côté client : on garde l'adresse au lieu
     d'ouvrir une fenêtre que personne ne fermera. */
  await ctx.addInitScript(() => { window.__wa = []; window.open = u => { window.__wa.push(u); return null; }; });
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
  await p.goto('http://127.0.0.1:8099/' + chemin,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(400);
  return { ctx, p };
}
async function adresses(p){
  await p.type('#depart','vendome',{delay:10}); await p.waitForTimeout(850);
  await p.locator('#departList [role=option]').first().click();
  await p.type('#arrivee','argenteuil',{delay:10}); await p.waitForTimeout(850);
  await p.locator('#arriveeList [role=option]').first().click();
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
}
const auxPrix = p => p.waitForFunction(()=>document.getElementById('ecran-vehicules').getBoundingClientRect().height>0,null,{timeout:5000}).then(()=>true).catch(()=>false);
{
  /* 1. L'heure proposée périme PENDANT la saisie des adresses. */
  const { ctx:c1, p:p1 } = await pageHorloge('2026-10-05T10:01:00+02:00');
  check('à 10 h 01, l\'heure proposée est 10 h 05', await p1.locator('#heure').inputValue()==='10:05', await p1.locator('#heure').inputValue());
  await p1.clock.fastForward('05:00');
  await adresses(p1);
  const h1 = await p1.locator('#heure').inputValue();
  check('adresses tapées à 10 h 06 : l\'heure proposée s\'est remise à jour toute seule', h1==='10:10', h1);
  check('… le bouton « Voir mon prix » reste allumé', !(await p1.locator('#btnVoirPrix').isDisabled()));
  check('… aucun refus n\'est affiché', await p1.locator('#heurePassee').isHidden());
  /* Clic borné : sur un bouton gris, Playwright attendrait 30 s puis
     planterait sans nommer le défaut. Une attente qui expire doit dire ce
     qu'elle attendait — c'est le contrôle qui le dit. */
  await p1.locator('#btnVoirPrix').click({timeout:3000}).catch(()=>{});
  check('… et UN appui mène aux prix', await auxPrix(p1));
  await c1.close();
}
{
  /* 2. Adresses déjà tapées, le client attend, PUIS appuie. */
  const { ctx:c2, p:p2 } = await pageHorloge('2026-10-05T10:01:00+02:00');
  await adresses(p2);
  await p2.clock.fastForward('06:00');
  await p2.locator('#btnVoirPrix').click({timeout:3000}).catch(()=>{});
  check('appui à 10 h 07 sur une heure proposée périmée : UN appui suffit pour les prix', await auxPrix(p2));
  const h2 = await p2.locator('#heure').inputValue();
  check('… avec l\'heure remise au prochain créneau', h2==='10:10', h2);
  await c2.close();
}
{
  /* 3. Une heure CHOISIE par le client, passée pendant la saisie : elle
        n'est pas touchée (c'est son choix), mais le bouton gris le DIT. */
  const { ctx:c3, p:p3 } = await pageHorloge('2026-10-05T10:01:00+02:00');
  await p3.fill('#heure','10:05'); await p3.waitForTimeout(200);
  await p3.clock.fastForward('06:00');
  await adresses(p3);
  check('heure choisie 10 h 05, adresses à 10 h 07 : l\'heure du client n\'est pas changée', await p3.locator('#heure').inputValue()==='10:05', await p3.locator('#heure').inputValue());
  const gris = await p3.locator('#btnVoirPrix').isDisabled();
  const dit = await p3.locator('#heurePassee').isVisible();
  check('… le bouton est gris ET le message « heure passée » est à l\'écran — jamais l\'un sans l\'autre', gris && dit, 'gris='+gris+' message='+dit);
  check('… avec la sortie « Partir dès que possible »', await p3.locator('#btnPasseAsap').isVisible());
  await c3.close();
}

/* --- CE QUE LA RELECTURE INDÉPENDANTE A TROUVÉ (4 octobre 2026) -------
   Les trois scènes du dessus étaient vertes, et le premier jet du
   correctif cachait pourtant trois défauts. Aucune scène ne posait
   l'horloge la nuit du changement d'heure, aucune n'allait jusqu'à
   « Confirmer », aucune n'ouvrait le comptoir. */
const lireCourses = p => p.evaluate(() => JSON.parse(localStorage.getItem('ela_courses') || '[]'));
async function jusquAuRecap(p){
  await p.locator('#btnVoirPrix').click({timeout:3000}).catch(()=>{});
  await auxPrix(p);
  await p.locator('.veh-carte').first().click({timeout:3000}).catch(()=>{});
  await p.locator('#btnContinuer').click({timeout:3000}).catch(()=>{});
  await p.waitForTimeout(300);
  await p.fill('#clientNom','Jean Martin'); await p.fill('#clientTel','06 12 34 56 78');
  await p.locator('[data-paiement="carte"]').click({timeout:3000}).catch(()=>{});
}
const ecranActif = p => p.evaluate(() => (document.querySelector('.ecran.actif') || {}).id || '');
{
  /* 4. LA NUIT DU PASSAGE À L'HEURE D'HIVER. Le 25/10/2026, de 2 h à
        2 h 59, chaque minute existe deux fois ; le navigateur lit « 02:35 »
        en heure d'été, une heure trop tôt. Le premier jet du correctif y
        bouclait sans fin : la page entière tombait au chargement, admin
        compris. Avant lui, le formulaire refusait sa propre heure proposée
        pendant une heure. 01:31 UTC = 2 h 31, heure d'hiver. */
  const avant = errs.length;
  const { ctx:c4, p:p4 } = await pageHorloge('2026-10-25T01:31:00Z');
  check('nuit du changement d\'heure : la page se charge sans erreur', errs.length === avant, errs.slice(avant).join(' | '));
  check('… l\'heure proposée est 2 h 35', await p4.locator('#heure').inputValue()==='02:35', await p4.locator('#heure').inputValue());
  check('… et le formulaire ne refuse pas sa propre heure', await p4.locator('#heurePassee').isHidden());
  await adresses(p4);
  await p4.locator('#btnVoirPrix').click({timeout:3000}).catch(()=>{});
  check('… et la demande va jusqu\'aux prix', await auxPrix(p4));
  await c4.close();
  /* L'autre bord : une heure de la nuit répétée RÉELLEMENT passée (les deux
     lectures sont derrière nous) reste refusée. Sans ce contrôle, un code
     qui accepterait tout passerait au vert. 01:50 UTC = 2 h 50, hiver. */
  const { ctx:c4b, p:p4b } = await pageHorloge('2026-10-25T01:50:00Z');
  await p4b.fill('#heure','02:35'); await p4b.waitForTimeout(200);
  check('… mais 2 h 35 choisi à 2 h 50 (heure d\'hiver) reste « déjà passée »', await p4b.locator('#heurePassee').isVisible());
  await c4b.close();
  /* L'AUTRE MOITIÉ DE LA NUIT, celle que le second jet oubliait : la
     première heure 2 h–2 h 59, encore en heure d'été. Il gardait la lecture
     la plus tardive, donc aucune heure « 02:xx » n'y était jamais passée
     pour la page — alors que le serveur, qui compte en heure affichée, la
     disait passée et coupait les rappels. La page compte maintenant comme
     lui. 00:01 UTC = 2 h 01, heure d'été. */
  const { ctx:c4c, p:p4c } = await pageHorloge('2026-10-25T00:01:00Z');
  check('2 h 01 (heure d\'été) : l\'heure proposée est 2 h 05', await p4c.locator('#heure').inputValue()==='02:05', await p4c.locator('#heure').inputValue());
  await p4c.clock.fastForward('39:00');
  await adresses(p4c);
  check('… adresses tapées à 2 h 40 : elle se remet à 2 h 40, comme le serveur la compterait', await p4c.locator('#heure').inputValue()==='02:40', await p4c.locator('#heure').inputValue());
  check('… sans refus', await p4c.locator('#heurePassee').isHidden() && !(await p4c.locator('#btnVoirPrix').isDisabled()));
  await c4c.close();
  const { ctx:c4d, p:p4d } = await pageHorloge('2026-10-25T00:20:00Z');
  await p4d.fill('#heure','02:35'); await p4d.waitForTimeout(200);
  await p4d.clock.fastForward('30:00');
  await adresses(p4d);
  check('2 h 35 choisi à 2 h 20, adresses à 2 h 50 (heure d\'été) : « déjà passée », et dit', await p4d.locator('#heurePassee').isVisible() && await p4d.locator('#btnVoirPrix').isDisabled());
  await c4d.close();
  /* À 2 h 56 (été), le créneau suivant s'afficherait « 02:00 » (hiver) :
     une heure affichée qui recule, que la page refuserait aussitôt. */
  const { ctx:c4e, p:p4e } = await pageHorloge('2026-10-25T00:56:00Z');
  check('2 h 56 (heure d\'été) : la page ne propose pas une heure affichée qui recule', await p4e.locator('#heure').inputValue()==='03:00' && await p4e.locator('#heurePassee').isHidden(), await p4e.locator('#heure').inputValue());
  await c4e.close();
}
{
  /* 5. L'heure PROPOSÉE passe pendant le récapitulatif. Rien ne la relisait
        à « Confirmer » : le bon partait à 10 h 05 alors qu'il était 10 h 07,
        et le serveur, voyant un départ passé, coupait aussitôt les rappels. */
  const { ctx:c5, p:p5 } = await pageHorloge('2026-10-05T10:01:00+02:00');
  await adresses(p5);
  await jusquAuRecap(p5);
  await p5.clock.fastForward('06:00');
  await p5.locator('#btnConfirmer').click({timeout:3000}).catch(()=>{});
  await p5.waitForTimeout(400);
  const cs = await lireCourses(p5);
  check('« Confirmer » à 10 h 07 sur l\'heure proposée : la demande part', cs.length === 1 && await ecranActif(p5) === 'ecran-bon', cs.length+' course(s), écran '+await ecranActif(p5));
  check('… avec l\'heure remise au prochain créneau, pas une heure passée', cs[0] && cs[0].course.heure === '10:10', cs[0] && cs[0].course.heure);
  await c5.close();
}
{
  /* 6. L'heure CHOISIE passe pendant le récapitulatif : elle ne part pas,
        et le client retrouve le message et sa sortie. */
  const { ctx:c6, p:p6 } = await pageHorloge('2026-10-05T10:01:00+02:00');
  await p6.fill('#heure','10:05'); await p6.waitForTimeout(200);
  await adresses(p6);
  await jusquAuRecap(p6);
  await p6.clock.fastForward('06:00');
  await p6.locator('#btnConfirmer').click({timeout:3000}).catch(()=>{});
  await p6.waitForTimeout(400);
  check('« Confirmer » à 10 h 07 sur 10 h 05 choisi : rien ne part', (await lireCourses(p6)).length === 0 && (await p6.evaluate(()=>window.__wa.length)) === 0);
  check('… le client est ramené au formulaire, devant le message', await ecranActif(p6) === 'ecran-accueil' && await p6.locator('#heurePassee').isVisible(), await ecranActif(p6));
  check('… avec sa sortie « Partir dès que possible »', await p6.locator('#btnPasseAsap').isVisible());
  check('… et son heure n\'est pas changée', await p6.locator('#heure').inputValue()==='10:05', await p6.locator('#heure').inputValue());
  await c6.close();
}
{
  /* 7. AU COMPTOIR, « Réserver » ne passe pas par « Voir mon prix » : il
        déclenche « Confirmer » directement. Deux défauts y vivaient : une
        heure proposée périmée partait telle quelle, et choisir une gamme
        rallumait le bouton sous le message « heure passée ». */
  const comptoir = 'index.html?reception=easyhotel-aeroville';
  const { ctx:c7, p:p7 } = await pageHorloge('2026-10-05T10:01:00+02:00', comptoir);
  await p7.waitForTimeout(700);
  await p7.selectOption('#hotelDest','orly'); await p7.waitForTimeout(1700);
  await p7.locator('#listeVehicules .veh-carte').first().click({timeout:3000}).catch(()=>{});
  await p7.locator('[data-paiement="especes"]').click({timeout:3000}).catch(()=>{});
  await p7.fill('#chambre','214');
  await p7.clock.fastForward('06:00');
  await p7.locator('#btnVoirPrix').click({timeout:3000}).catch(()=>{});
  await p7.waitForTimeout(600);
  const cs7 = await lireCourses(p7);
  check('comptoir, « Réserver » à 10 h 07 sur l\'heure proposée : la course part', cs7.length === 1, cs7.length+' course(s)');
  check('… à l\'heure remise au prochain créneau', cs7[0] && cs7[0].course.heure === '10:10', cs7[0] && cs7[0].course.heure);
  await c7.close();

  const { ctx:c8, p:p8 } = await pageHorloge('2026-10-05T10:01:00+02:00', comptoir);
  await p8.waitForTimeout(700);
  await p8.fill('#heure','10:05'); await p8.waitForTimeout(200);
  await p8.selectOption('#hotelDest','orly'); await p8.waitForTimeout(1700);
  await p8.clock.fastForward('06:00');
  await p8.locator('#listeVehicules .veh-carte').first().click({timeout:3000}).catch(()=>{});
  await p8.waitForTimeout(300);
  const gris8 = await p8.locator('#btnVoirPrix').isDisabled();
  const dit8 = await p8.locator('#heurePassee').isVisible();
  check('comptoir, heure choisie passée puis gamme choisie : « Réserver » reste éteint ET le dit', gris8 && dit8, 'gris='+gris8+' message='+dit8);
  await c8.close();
}

/* --- LE PAS DES CRÉNEAUX, ET PLUS AUCUNE TRACE DU PRÉAVIS ------------- */
const src = await (await fetch('http://127.0.0.1:8099/index.html')).text();
const step = src.match(/id="heure"[^>]*step="(\d+)"/);
const pas = src.match(/var PAS_MINUTES\s*=\s*(\d+)/);
check('le champ d\'heure et le script ont le même pas',
  step && pas && Number(step[1]) === Number(pas[1]) * 60, step && pas ? step[1]+' s contre '+pas[1]+' min' : '');
check('le pas est bien de 5 minutes', pas && pas[1] === '5', pas ? pas[1] : '');
check('plus de constante de préavis dans la page', !/var DELAI_MINIMUM_MIN/.test(src));
check('plus de phrase de préavis (tot_note) dans la page', !/tot_note:/.test(src));

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
