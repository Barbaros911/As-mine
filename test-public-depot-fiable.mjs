// Parcours réels sur les documents construits ; aucun appel de production.
// ÉPROUVÉ CONTRE L'ANCIEN CODE : sans le verrou de soumission, 7 contrôles tombent ; sans la reprise
// après rechargement, les contrôles « rechargé pendant l'envoi » tombent (bon jamais rouvert, référence perdue).
import { chromium, webkit } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { execSync } from 'node:child_process';
execSync('sh construire.sh', {stdio:'ignore'});
const server = createServer(async(req,res)=>{try{let f=join(process.cwd(),'site',new URL(req.url,'http://local').pathname);if((await stat(f)).isDirectory())f=join(f,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(f)]||'application/octet-stream');res.end(await readFile(f));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await (process.env.ELA_WEBKIT ? webkit : chromium).launch();
const ok=[],ko=[];const check=(name,yes)=>{(yes?ok:ko).push(name);console.log((yes?'✔ ':'✘ ')+name);};
async function form(space,mode='slow'){
 const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'fr-FR',timezoneId:'Europe/Paris'}), p=await ctx.newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const requests=[], rows=new Map();let release;const gate=new Promise(r=>release=r);let etat='serveur'; // la vérité du faux serveur : connue si écrite
 await p.route('**/*',async r=>{
  const u=r.request().url();if(u.startsWith(base))return r.continue();
  if(u.includes('/functions/v1/deposer-course')){
   const body=r.request().postDataJSON();requests.push(body.bon);
   if(mode==='slow')await gate;
   // L'écriture a lieu, la réponse ne revient jamais (réseau coupé après le POST).
   if(mode==='ecrit-sans-reponse'){rows.set(body.bon.ref,body.bon);await gate;return r.abort().catch(()=>{});}
   if(mode==='lost'){rows.set(body.bon.ref,body.bon);mode='success';return r.abort();}
   if(mode==='error')return r.fulfill({status:503,body:'{}'});
   if(mode==='empty')return r.fulfill({status:200,body:'{}'});
   if(mode==='rejected')return r.fulfill({status:200,body:'{"ok":false}'});
   if(mode==='wrongref')return r.fulfill({status:200,body:'{"ok":true,"ref":"ELA-OTHER-REQUEST"}'});
   if(mode==='offline')return r.abort();
   if(mode==='400')return r.fulfill({status:400,body:'{}'});
   if(mode==='invalid')return r.fulfill({status:200,body:'<html>proxy</html>'});
   rows.set(body.bon.ref,body.bon);
   // La page a pu être rechargée pendant l'attente : l'écriture a eu lieu, la réponse se perd.
   return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,ref:body.bon.ref,numero:42})}).catch(()=>{});
  }
  if(u.includes('/functions/v1/etat-course')){
   if(etat==='panne')return r.abort();
   const b=r.request().postDataJSON();
   if(!rows.has(b.ref))return r.fulfill({status:404,contentType:'application/json',body:'{"inconnue":true}'});
   return r.fulfill({contentType:'application/json',body:JSON.stringify({ref:b.ref,statut:'attente',numero:42,chauffeur:{nom:'',telephone:''},vehicule:'',date:'',heure:''})});
  }
  if(u.includes('/functions/v1/courses-hotel'))return r.fulfill({contentType:'application/json',body:JSON.stringify({hotel:'easyhotel-aeroville',courses:[],session:'s.sig',expire:Date.now()+864e5})});
  if(u.includes('.supabase.co/'))return r.fulfill({contentType:'application/json',body:'[]'});
  if(u.includes('photon.komoot.io'))return r.fulfill({contentType:'application/json',body:JSON.stringify({features:[{geometry:{coordinates:[2.3376,48.8606]},properties:{name:'Place Vendôme',postcode:'75001',city:'Paris',countrycode:'FR'}}]})});
  if(u.includes('api-adresse.data.gouv.fr'))return r.fulfill({contentType:'application/json',body:JSON.stringify({features:[{geometry:{coordinates:[2.2467,48.9478]},properties:{label:'Argenteuil, 95100 Argenteuil'}}]})});
  if(u.includes('router.project-osrm.org'))return r.fulfill({contentType:'application/json',body:JSON.stringify({routes:[{distance:24300,duration:2040}]})});
  return r.abort();
 });
 await p.goto(base+(space==='public'?'/':space==='client'?'/easyhotel-client/':'/reception/easyhotel-aeroville/'));
 if(space==='client'){await p.click('a.carte[data-dest="orly"]');await p.waitForURL(/application/);}
 if(space==='reception'){await p.fill('#recCode','code-de-test');await p.click('#btnRecEntrer');await p.click('#btnRecReserver');}
 if(space==='public'){
  for(const [id,value] of [['depart','vendome'],['arrivee','argenteuil']]){await p.fill('#'+id,value);await p.locator('#'+id+'List [role=option]').first().click();}
  await p.fill('#date',new Date(Date.now()+3*864e5).toISOString().slice(0,10));await p.fill('#heure','10:00');
  await p.click('#btnVoirPrix');await p.locator('.veh-carte').first().click();await p.click('#btnContinuer');
 }else if(space==='reception'){await p.selectOption('#hotelDest','orly');await p.locator('#listeVehicules .veh-carte').first().click();}
 await p.fill('#clientNom','Test Voyageur');await p.fill('#clientTel','06 12 34 56 78');
 if(space==='client'){await p.click('#btnVoirPrix');await p.locator('.veh-carte').first().click();await p.click('#btnContinuer');}
 if(space==='reception')await p.fill('#noteCourse','Note du client précédent');
 await p.evaluate(()=>{const b=[...document.querySelectorAll('#blocContact [data-contact]')].find(e=>e.offsetParent);if(b)b.click();});
 const submit=()=>p.click(space==='reception'?'#btnVoirPrix':'#btnConfirmer');
 return {p,ctx,requests,rows,release,submit,errors,setMode:m=>{mode=m;},setEtat:e=>{etat=e;}};
}
try{
 for(const space of ['public','client','reception']){
  const r=await form(space);await r.submit();await r.p.waitForTimeout(200);
  check(space+' : envoi en cours sans faux titre reçu',!/Demande reçue/.test(await r.p.locator('#bonEtat').textContent()));
  // Événements déjà en file / retour au bouton : ne pas compter sur sa disparition.
  await r.p.evaluate(()=>{for(let i=0;i<5;i++)document.getElementById('btnConfirmer').dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  await r.p.waitForTimeout(200);check(space+' : cinq soumissions réseau lent, un seul POST',r.requests.length===1);
  r.release();await r.p.waitForTimeout(300);check(space+' : une seule réservation',r.rows.size===1);
  check(space+' : succès après accusé serveur',await r.p.locator('#etatEnvoi').evaluate(e=>e.classList.contains('ok')));
  await r.p.click('#btnNouvelleCourse');
  if(space==='reception')check('réception : note, identité et véhicule effacés',await r.p.evaluate(()=>['clientNom','clientTel','noteCourse'].every(id=>!document.getElementById(id).value)&&!document.querySelector('#listeVehicules .choisi')));
  check(space+' : aucune exception JS',r.errors.length===0);await r.ctx.close();
 }
 for(const space of ['public','client','reception']){
  const r=await form(space,'lost');await r.submit();await r.p.waitForTimeout(600);
  check(space+' : réponse perdue après écriture, reprise même référence',r.requests.length===2&&new Set(r.requests.map(b=>b.ref)).size===1&&r.rows.size===1);
  check(space+' : reprise automatique confirmée',await r.p.locator('#etatEnvoi').evaluate(e=>e.classList.contains('ok')));
  await r.ctx.close();
 }
 for(const mode of ['error','invalid','empty','rejected','wrongref','offline','400']){
  const r=await form('public',mode);await r.submit();await r.p.waitForTimeout(600);
  check(mode+' : pas de faux succès',!(await r.p.locator('#etatEnvoi').evaluate(e=>e.classList.contains('ok'))));
  if(mode==='error'){
   r.setMode('success');if(await r.p.locator('#btnReessayerDepot').count())await r.p.click('#btnReessayerDepot');else await r.p.evaluate(()=>document.getElementById('btnConfirmer').click());await r.p.waitForTimeout(300);
   check('nouvel essai : référence inchangée',new Set(r.requests.map(b=>b.ref)).size===1);
   check('nouvel essai : succès et une seule ligne',r.rows.size===1&&await r.p.locator('#etatEnvoi').evaluate(e=>e.classList.contains('ok')));
  }
  await r.ctx.close();
 }

 const ecranActif=p=>p.evaluate(()=>document.querySelector('.ecran.actif').id);
 const accuse=p=>p.locator('#etatEnvoi').evaluate(e=>e.classList.contains('ok'));
 // UNE NOUVELLE INTENTION APRÈS UN SUCCÈS N'EST PAS UN DOUBLON (régression de #402, mesurée) :
 // par « Réserver une autre course » comme par l'onglet Accueil, « Confirmer » doit vivre et tirer une autre référence.
 for(const voie of ['bouton','onglet']){
  const r=await form('public','success');await r.submit();await r.p.waitForTimeout(500);
  if(voie==='bouton')await r.p.click('#btnNouvelleCourse');else await r.p.evaluate(()=>[...document.querySelectorAll('.barre [data-onglet="accueil"]')].find(e=>e.offsetParent).click());
  await r.p.waitForTimeout(300);
  await r.p.evaluate(()=>document.getElementById('btnVoirPrix').click());await r.p.locator('.veh-carte').first().click();await r.p.evaluate(()=>document.getElementById('btnContinuer').click());
  await r.p.waitForTimeout(300);
  check('nouvelle intention ('+voie+') : « Confirmer » n’est pas éteint',!(await r.p.locator('#btnConfirmer').evaluate(b=>b.disabled)));
  await r.p.evaluate(()=>document.getElementById('btnConfirmer').click());await r.p.waitForTimeout(500);
  check('nouvelle intention ('+voie+') : une seconde réservation, référence distincte',r.requests.length===2&&new Set(r.requests.map(b=>b.ref)).size===2&&r.rows.size===2);
  // et depuis le bon lui-même, les appuis répétés ne font toujours qu'une ligne
  await r.p.evaluate(()=>{for(let i=0;i<3;i++)document.getElementById('btnConfirmer').click();});await r.p.waitForTimeout(300);
  check('nouvelle intention ('+voie+') : les appuis répétés sur le bon ne créent rien',r.requests.length===2);
  await r.ctx.close();
 }
 // RECHARGEMENT PENDANT L'ENVOI : rien ne repart seul ; le bon revient, en vérification ; la reprise est un geste et garde la référence.
 for(const space of ['public','client','reception']){
  const r=await form(space,'slow');await r.submit();await r.p.waitForTimeout(300);
  await r.p.reload();await r.p.waitForTimeout(1000);
  check(space+' : rechargé pendant l’envoi, aucun dépôt ne repart tout seul',r.requests.length===1);
  check(space+' : le bon est rouvert, en vérification, sans faux « reçue »',await ecranActif(r.p)==='ecran-bon'&&!/reçue|recorded|received/i.test(await r.p.locator('#bonEtat').textContent()));
  check(space+' : réception non vérifiée, bouton « Réessayer » proposé',await r.p.locator('#btnReessayerDepot').isVisible()&&!(await accuse(r.p)));
  r.setMode('success');await r.p.click('#btnReessayerDepot');await r.p.waitForTimeout(500);
  check(space+' : la reprise rejoue la même référence, une seule ligne, accusé reçu',r.requests.length===2&&new Set(r.requests.map(b=>b.ref)).size===1&&r.rows.size===1&&await accuse(r.p));
  await r.p.reload();await r.p.waitForTimeout(1000);
  check(space+' : rechargé après l’accusé, plus rien n’est repris ni redéposé',r.requests.length===2&&await ecranActif(r.p)!=='ecran-bon');
  r.release();await r.ctx.close();
 }
 // ÉCRITURE RÉUSSIE, RÉPONSE PERDUE, PAGE RECHARGÉE : le serveur la connaît, on le dit, rien ne repart.
 {
  const r=await form('public','ecrit-sans-reponse');await r.submit();await r.p.waitForTimeout(300);
  await r.p.reload();await r.p.waitForTimeout(1000);
  check('réponse perdue + rechargement : le serveur connaît la demande, aucun second dépôt',r.requests.length===1&&r.rows.size===1&&await accuse(r.p));
  check('réponse perdue + rechargement : « Demande reçue » et sa référence',/reçue/i.test(await r.p.locator('#bonEtat').textContent())&&(await r.p.locator('#bonRef').textContent()).includes('42'));
  r.release();await r.ctx.close();
 }
 // SERVEUR MUET À LA VÉRIFICATION : ni « reçue » ni « non enregistrée », et aucun dépôt.
 {
  const r=await form('public','slow');await r.submit();await r.p.waitForTimeout(300);
  r.setEtat('panne');await r.p.reload();await r.p.waitForTimeout(1000);
  check('vérification en panne : réception non vérifiée, aucun faux succès, aucun dépôt',!(await accuse(r.p))&&await r.p.locator('#btnReessayerDepot').isVisible()&&r.requests.length===1);
  r.release();await r.ctx.close();
 }
 // ISOLATION : la demande d'un comptoir n'est jamais reprise sur le site public (même appareil, même origine).
 {
  const r=await form('reception','slow');await r.submit();await r.p.waitForTimeout(300);
  await r.p.goto(base+'/');await r.p.waitForTimeout(1000);
  check('isolation : la demande d’un comptoir n’est pas reprise sur le site public',r.requests.length===1&&await ecranActif(r.p)!=='ecran-bon');
  r.release();await r.ctx.close();
 }
 // NOUVELLE COURSE VOLONTAIRE APRÈS UN ÉCHEC : on ne la repropose plus, mais la liste la dit « à vérifier ».
 {
  const r=await form('public','error');await r.submit();await r.p.waitForTimeout(1000);
  await r.p.click('#btnNouvelleCourse');await r.p.reload();await r.p.waitForTimeout(1000);
  check('nouvelle course volontaire après un échec : plus rien n’est repris au rechargement',await ecranActif(r.p)!=='ecran-bon');
  await r.p.evaluate(()=>[...document.querySelectorAll('.barre [data-onglet="courses"]')].find(e=>e.offsetParent).click());await r.p.waitForTimeout(300);
  check('« Mes courses » dit « à vérifier », pas « en attente »',/vérifier/i.test(await r.p.locator('.course-etat').first().textContent()));
  await r.ctx.close();
 }
}finally{await browser.close();server.close();}
console.log(`=== RÉUSSIS (${ok.length}) ===`);ok.forEach(x=>console.log('✔ '+x));if(ko.length)console.log(`=== ÉCHECS (${ko.length}) ===`);ko.forEach(x=>console.log('✘ '+x));if(ko.length)process.exitCode=1;
