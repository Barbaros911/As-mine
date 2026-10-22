// Parcours réels sur les quatre documents construits ; aucun appel de production.
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
 const requests=[], rows=new Map();let release;const gate=new Promise(r=>release=r);
 await p.route('**/*',async r=>{
  const u=r.request().url();if(u.startsWith(base))return r.continue();
  if(u.includes('/functions/v1/deposer-course')){
   const body=r.request().postDataJSON();requests.push(body.bon);
   if(mode==='slow')await gate;
   if(mode==='lost'){rows.set(body.bon.ref,body.bon);mode='success';return r.abort();}
   if(mode==='error')return r.fulfill({status:503,body:'{}'});
   if(mode==='empty')return r.fulfill({status:200,body:'{}'});
   if(mode==='rejected')return r.fulfill({status:200,body:'{"ok":false}'});
   if(mode==='wrongref')return r.fulfill({status:200,body:'{"ok":true,"ref":"ELA-OTHER-REQUEST"}'});
   if(mode==='offline')return r.abort();
   if(mode==='400')return r.fulfill({status:400,body:'{}'});
   if(mode==='invalid')return r.fulfill({status:200,body:'<html>proxy</html>'});
   rows.set(body.bon.ref,body.bon);
   return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,ref:body.bon.ref,numero:42})});
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
 return {p,ctx,requests,rows,release,submit,errors,setMode:m=>{mode=m;}};
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
}finally{await browser.close();server.close();}
console.log(`=== RÉUSSIS (${ok.length}) ===`);ok.forEach(x=>console.log('✔ '+x));if(ko.length)console.log(`=== ÉCHECS (${ko.length}) ===`);ko.forEach(x=>console.log('✘ '+x));if(ko.length)process.exitCode=1;
