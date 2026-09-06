/* =====================================================================
   TEST-NOUVEAU-AFFICHE.MJS — le QR des comptoirs d'hôtel
   ---------------------------------------------------------------------
   LE CODE QR EST ÉPROUVÉ PAR UN DÉCODEUR INDÉPENDANT, jamais par
   relecture maison : un encodeur relu par son propre auteur reproduit
   ses propres erreurs. Le premier jet de cet encodeur passait tous mes
   contrôles internes — format, masque, zigzag, Reed-Solomon, syndromes
   nuls — et n'était lisible par AUCUN téléphone : l'information de
   format était écrite bit à l'envers. Seul un décodeur étranger l'a vu.
   C'est la raison d'être de cette suite : sans elle, Barbaros imprimait
   cinquante affiches dont aucune ne se scanne.

   Ce qui est verrouillé ici :

   — LE QR SE DÉCODE VRAIMENT, et rend exactement l'adresse attendue.
   — LE NOM DE L'HÔTEL VOYAGE EN CLAIR : à l'arrivée, on le pose dans le
     champ de départ et la recherche d'adresse le retrouve. Un
     identifiant obligerait à tenir une table, donc à réimprimer les
     affiches le jour où elle change.
   — ON NE REMPLIT PAS L'ADRESSE À SA PLACE. Nous ne la connaissons pas ;
     une adresse inventée enverrait le chauffeur au mauvais endroit.
   — À L'IMPRESSION, SEULE L'AFFICHE SORT. Sans cette règle, le tableau
     de bord — noms et téléphones de clients — partirait sur le papier
     posé au comptoir d'un hôtel.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-affiche.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createRequire } from 'module';
const exiger = createRequire('/tmp/claude-0/-home-user-As-mine/4bad491f-f7fd-5fb8-ac80-285f0ac64a0c/scratchpad/');
let jsQR = null;
try { jsQR = exiger('jsqr'); } catch(e){ /* absent : les contrôles de décodage sont annoncés sautés */ }

const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];
const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
const p = await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message));
await ctx.addInitScript(()=>{ localStorage.setItem('ela_exploitant','04b72932f8ccb464'); });
await p.goto('http://127.0.0.1:8099/?exploitant=1',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(600);

check('le tableau de bord porte l\'affiche pour un hôtel',
  await p.locator('#hotelNom').isVisible());
check('rien n\'est dessiné tant qu\'aucun hôtel n\'est nommé',
  await p.locator('#blocAffiche').isHidden());

await p.fill('#hotelNom','Ibis CDG');
await p.waitForTimeout(400);
check('saisir un nom fait apparaître l\'affiche', await p.locator('#blocAffiche').isVisible());
check('l\'affiche porte le nom de l\'hôtel',
  (await p.locator('#afficheNom').textContent())==='Ibis CDG');
check('et la marque, pour qu\'on sache qui envoie la voiture',
  (await p.locator('.affiche-marque').textContent()).replace(/\s/g,'')==='ELATRANSFER');
check('avec un numéro à appeler : tout le monde ne scanne pas',
  (await p.locator('.affiche-tel').textContent()).includes('7 59 31 24 33'));

const lien = await p.locator('#afficheLien').textContent();
check('le nom voyage EN CLAIR dans l\'adresse, pas en identifiant',
  lien.includes('?h=Ibis%20CDG'), lien);

/* ---- LE CONTRÔLE QUI COMPTE : le QR se décode-t-il vraiment ? ---- */
const svg = await p.locator('#afficheQr svg').count();
check('le QR est dessiné en SVG : une affiche s\'imprime, un canvas sort en bouillie',
  svg===1, String(svg));

if (jsQR) {
  /* On rend le SVG en image dans la page, puis on lit les pixels : c'est
     bien le dessin FINAL qu'on éprouve, pas la matrice qui l'a produit. */
  const pixels = await p.evaluate(async () => {
    const svg = document.querySelector('#afficheQr svg').outerHTML;
    const img = new Image();
    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    await new Promise((r,j)=>{ img.onload=r; img.onerror=j; img.src=url; });
    const c = document.createElement('canvas');
    c.width = c.height = 320;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0,0,320,320);
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0, 320, 320);
    const d = g.getImageData(0,0,320,320);
    return { data: Array.from(d.data), w: d.width, h: d.height };
  });
  const lu = jsQR(Uint8ClampedArray.from(pixels.data), pixels.w, pixels.h);
  check('LE QR SE DÉCODE, et rend exactement l\'adresse de l\'affiche',
    !!lu && lu.data === lien.trim(), lu ? lu.data : 'illisible');

  // Un nom long, et un nom accentué : deux cas où un encodeur bâclé casse.
  for (const nom of ['Hôtel Mercure Roissy Charles de Gaulle', 'A']) {
    await p.fill('#hotelNom', nom); await p.waitForTimeout(350);
    const attendu = (await p.locator('#afficheLien').textContent()).trim();
    const px = await p.evaluate(async () => {
      const svg = document.querySelector('#afficheQr svg').outerHTML;
      const img = new Image();
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      await new Promise(r=>{ img.onload=r; });
      const c = document.createElement('canvas'); c.width=c.height=360;
      const g = c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,360,360);
      g.imageSmoothingEnabled = false; g.drawImage(img,0,0,360,360);
      const d = g.getImageData(0,0,360,360);
      return { data: Array.from(d.data), w:d.width, h:d.height };
    });
    const l2 = jsQR(Uint8ClampedArray.from(px.data), px.w, px.h);
    check('le QR se décode aussi pour « ' + nom.slice(0,22) + ' »',
      !!l2 && l2.data === attendu, l2 ? l2.data : 'illisible');
  }
} else {
  check('jsQR absent : le décodage n\'a pas pu être éprouvé', false,
    'installer jsqr pour éprouver le QR');
}

/* ---- L'impression ne doit sortir QUE l'affiche ---- */
await p.emulateMedia({ media:'print' });
await p.waitForTimeout(200);
const visibles = await p.evaluate(()=>{
  const vu = e => getComputedStyle(e).visibility !== 'hidden';
  return {
    affiche: vu(document.querySelector('.affiche')),
    qr:      vu(document.querySelector('#afficheQr svg')),
    bord:    vu(document.querySelector('#listeBord')),
    compteurs: vu(document.querySelector('.compteurs')),
    entete:  vu(document.querySelector('.entete'))
  };
});
check('à l\'impression, l\'affiche et son QR sortent',
  visibles.affiche && visibles.qr, JSON.stringify(visibles));
check('et RIEN du tableau de bord : il porte des noms et des téléphones',
  !visibles.bord && !visibles.compteurs && !visibles.entete, JSON.stringify(visibles));
await p.emulateMedia({ media:'screen' });

/* ---- Un client qui arrive par le QR ---- */
const ctxC = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});
const pc = await ctxC.newPage();
pc.on('pageerror',e=>errs.push(e.message));
await pc.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.5479,49.0079]},properties:{name:"Ibis CDG Airport",osm_key:"tourism",osm_value:"hotel",postcode:"95700",city:"Roissy",countrycode:"FR"}}]})}));
await pc.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[]})}));
await pc.goto('http://127.0.0.1:8099/?h=Ibis%20CDG',{waitUntil:'domcontentloaded'});
await pc.waitForTimeout(1200);
check('le client arrive sur l\'accueil, pas sur un écran inconnu',
  await pc.locator('#ecran-accueil').isVisible());
check('le champ de départ porte déjà le nom de l\'hôtel',
  (await pc.locator('#depart').inputValue())==='Ibis CDG',
  await pc.locator('#depart').inputValue());
/* ON NE CHOISIT PAS L'ADRESSE À SA PLACE : la liste s'ouvre, il tranche.
   Une adresse posée d'office enverrait le chauffeur au mauvais Ibis. */
check('la liste d\'adresses s\'ouvre pour qu\'il choisisse lui-même',
  (await pc.locator('#departList [role=option]').count()) >= 1,
  String(await pc.locator('#departList [role=option]').count()));
check('mais aucune adresse n\'est retenue d\'office',
  await pc.evaluate(()=>!document.getElementById('btnVoirPrix').disabled) === false
  || (await pc.locator('#departList').isVisible()));
check('le paramètre est effacé de l\'adresse',
  !(await pc.evaluate(()=>location.search)).includes('h='),
  await pc.evaluate(()=>location.search));

/* ---------------------------------------------------------------------
   LA PROVENANCE SURVIT AU TUNNEL ENTIER
   Sans elle, l'affiche amène des clients et personne ne sait laquelle
   travaille : le nom de l'hôtel ne servirait qu'à remplir le champ de
   départ, et disparaîtrait dès que le client corrige son adresse.
   On éprouve donc le pire cas : le client CHANGE l'adresse de départ.
   --------------------------------------------------------------------- */
/* Deux lieux DIFFÉRENTS selon ce qui est tapé : avec un seul point, départ et
   arrivée tombent au même endroit et le site refuse la course à juste titre. */
await pc.unroute('**://photon.komoot.io/**');
await pc.route('**://photon.komoot.io/**', r => {
  const loin = r.request().url().toLowerCase().includes('argenteuil');
  r.fulfill({contentType:'application/json',body:JSON.stringify({features:[ loin
    ? {geometry:{coordinates:[2.2467,48.9478]},properties:{name:"Argenteuil",osm_key:"place",osm_value:"town",postcode:"95100",city:"Argenteuil",countrycode:"FR"}}
    : {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}
  ]})});
});
await pc.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
  body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
await pc.route('**supabase.co/**', r => r.abort());
await pc.addInitScript(()=>{ window.__liens=[]; window.open=(u)=>{window.__liens.push(u);return null;}; });

await pc.fill('#depart','');
await pc.type('#depart','autre chose',{delay:8}); await pc.waitForTimeout(900);
await pc.locator('#departList [role=option]').first().click();
await pc.type('#arrivee','argenteuil',{delay:8}); await pc.waitForTimeout(900);
await pc.locator('#arriveeList [role=option]').first().click();
const d3 = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
await pc.fill('#date', d3); await pc.fill('#heure','10:00');
await pc.locator('#btnVoirPrix').click(); await pc.waitForTimeout(1200);
await pc.locator('.veh-carte').first().click();
await pc.locator('#btnContinuer').click(); await pc.waitForTimeout(300);
await pc.fill('#clientNom','Sophie Durand'); await pc.fill('#clientTel','06 11 22 33 44');
await pc.locator('[data-paiement="especes"]').click();
await pc.locator('#btnConfirmer').click(); await pc.waitForTimeout(900);

const gardee = await pc.evaluate(()=>JSON.parse(localStorage.getItem('ela_courses')||'[]')[0]);
check('la course garde l\'hôtel d\'où vient le client',
  gardee && gardee.provenance === 'Ibis CDG', gardee ? String(gardee.provenance) : 'aucune course');
check('MÊME quand il a changé l\'adresse de départ : c\'est tout l\'intérêt',
  gardee && !gardee.course.depart.includes('Ibis'), gardee ? gardee.course.depart : '');

// Un client venu directement n'a pas de provenance — et un champ vide se lit
// « venue directe », pas « information perdue ».
const ctxD = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});
const pd = await ctxD.newPage();
pd.on('pageerror',e=>errs.push(e.message));
await pd.goto('http://127.0.0.1:8099/',{waitUntil:'domcontentloaded'});
await pd.waitForTimeout(400);
check('un client venu directement n\'a aucune provenance inventée',
  (await pd.evaluate(()=>{ try{ return sessionStorage.getItem('ela_provenance'); }catch(e){ return 'refus'; } }))===null);
await ctxD.close();

/* ---- Le tableau « D'où viennent les clients » ---- */
const ctxR = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});
const pr = await ctxR.newPage();
pr.on('pageerror',e=>errs.push(e.message));
const cr = (ref, statut, prov, total) => ({
  ref, statut, cree:new Date().toISOString(),
  course:{ depart:"Paris", arrivee:"Roissy", date:"2026-09-20", heure:"10:00",
           vehicule:"Berline", vehiculeCle:"berline", passagers:"1 passager", vol:"" },
  client:{ nom:"Client", telephone:"06 00 00 00 00" },
  provenance: prov, prix:{ total, ht:total/1.1, tva:total-total/1.1 }
});
await ctxR.addInitScript((j)=>{
  localStorage.setItem('ela_bookings', JSON.stringify(j));
  localStorage.setItem('ela_exploitant','04b72932f8ccb464');
}, [cr("A1","realisee","Ibis CDG",70), cr("A2","realisee","Ibis CDG",100),
    cr("A3","attente","Ibis CDG",50), cr("A4","realisee","Mercure",60),
    cr("A5","realisee","",900)]);
await pr.goto('http://127.0.0.1:8099/?exploitant=1',{waitUntil:'domcontentloaded'});
await pr.waitForTimeout(600);
await pr.locator('#btnRegistre').click(); await pr.waitForTimeout(500);
const lignes = await pr.locator('#regProvenance .reg-ligne').allTextContents();
check('le registre dit d\'où viennent les clients', lignes.length===2, lignes.join(' | '));
check('l\'hôtel qui envoie le plus vient en tête, avec ses demandes ET ses réalisées',
  lignes[0].includes('Ibis CDG') && lignes[0].includes('3 demandes')
  && lignes[0].includes('2 réalisée'), lignes[0]);
check('l\'argent ne compte que les réalisées : 170 €, pas 220 €',
  lignes[0].includes('170'), lignes[0]);
check('une course sans provenance ne crée pas de ligne vide',
  !lignes.join(' ').includes('900'), lignes.join(' | '));
await pr.fill('#regRecherche','mercure'); await pr.waitForTimeout(300);
check('et on peut chercher par hôtel de provenance',
  (await pr.locator('#regResultats .reg-ligne').count())===1,
  String(await pr.locator('#regResultats .reg-ligne').count()));
await ctxR.close();

check('aucun débordement horizontal',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);
check('aucune erreur JavaScript', errs.length===0, errs.join(' | '));

await ctxC.close(); await ctx.close(); await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
