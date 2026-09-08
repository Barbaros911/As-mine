/* =====================================================================
   TEST-NOUVEAU-WHATSAPP.MJS — le message envoyé à Barbaros
   ---------------------------------------------------------------------
   Une page web ne peut PAS envoyer un WhatsApp toute seule : « wa.me »
   ouvre WhatsApp sur le téléphone du CLIENT avec le message pré-écrit,
   et c'est lui qui appuie sur envoyer. Le seul moyen d'un envoi vraiment
   automatique serait l'API WhatsApp Business de Meta, qui demande une
   vérification d'entreprise et un numéro dédié — écarté.

   Ce qui est verrouillé ici :

   — LES DEUX CHEMINS VIVENT ENSEMBLE. Le dépôt met la demande dans le
     tableau de bord, le message prévient Barbaros sur son téléphone.
     L'un sans l'autre laisse un trou : soit il n'est pas averti, soit il
     n'a rien à ouvrir.
   — WHATSAPP EST DEMANDÉ AVANT LE DÉPÔT. Un window.open() placé après un
     « await » est bloqué par Safari sur iPhone, qui n'autorise
     l'ouverture d'un onglet que dans la seconde suivant une action de
     l'utilisateur. Un contrôle vérifie l'ORDRE des deux appels.
   — LE CONTENU DU MESSAGE, ligne par ligne : « Demande de réservation »
     et la référence, les deux adresses, la date, le nombre de passagers,
     la gamme, le mode de règlement, le prix, et le nom avec le téléphone
     en dernier.
   — SA STRUCTURE reste celle que relira « Coller une demande » : les
     deux premières valeurs « … : … » sont les adresses, le dernier
     montant en euros est le prix, la dernière ligne est
     « nom — téléphone » sans deux-points.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-whatsapp.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];
const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
const p = await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message));
await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}]})}));
await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}]})}));
/* OpenRouteService passe AVANT OSRM depuis qu'une clé est posée dans la
   page. Sans ce refus, la suite dépendrait du fait qu'il soit injoignable
   d'ici — et sur une machine reliée à Internet elle interrogerait le vrai
   service, avec une vraie distance, et les prix vérifiés plus bas ne
   tomberaient plus juste. On le coupe donc explicitement. */
await p.route('**://api.openrouteservice.org/**', r => r.abort());
await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
  body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
// Le serveur RÉPOND : c'est le chemin nominal. Le WhatsApp doit partir quand
// même — c'est lui qui prévient Barbaros sur son téléphone.
await p.route('**supabase.co/**', r => r.fulfill({status:201, body:''}));
// On note l'ordre des évènements : le WhatsApp doit être demandé AVANT que
// le dépôt ait répondu, sinon Safari sur iPhone le bloquerait.
await ctx.addInitScript(()=>{
  window.__journal = [];
  window.open = (u)=>{ window.__journal.push({quoi:'wa', url:u, t:Date.now()}); return null; };
  const f = window.fetch;
  window.fetch = function(u, o){
    if(String(u).includes('supabase')) window.__journal.push({quoi:'depot', t:Date.now()});
    return f.apply(this, arguments);
  };
});
await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);
await p.type('#depart','vendome',{delay:10}); await p.waitForTimeout(800);
await p.locator('#departList [role=option]').first().click();
await p.type('#arrivee','argenteuil',{delay:10}); await p.waitForTimeout(800);
await p.locator('#arriveeList [role=option]').first().click();
const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
await p.fill('#date', d); await p.fill('#heure','10:00');
await p.evaluate(()=>{ document.getElementById('passagers').value='3'; });
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1000);
await p.locator('.veh-carte').first().click();
await p.locator('#btnContinuer').click(); await p.waitForTimeout(300);
await p.fill('#clientNom','Jean Martin'); await p.fill('#clientTel','06 12 34 56 78');
await p.locator('[data-paiement="carte"]').click();
await p.locator('#btnConfirmer').click(); await p.waitForTimeout(1200);

const j = await p.evaluate(()=>window.__journal);
check('le message WhatsApp part même quand le serveur répond',
  j.some(e=>e.quoi==='wa'), JSON.stringify(j.map(e=>e.quoi)));
check('la demande est déposée aussi : les deux chemins vivent ensemble',
  j.some(e=>e.quoi==='depot'));
check('WhatsApp est demandé AVANT le dépôt — sinon Safari iOS le bloque',
  j.findIndex(e=>e.quoi==='wa') < j.findIndex(e=>e.quoi==='depot'),
  j.map(e=>e.quoi).join(' → '));

const msg = decodeURIComponent(j.find(e=>e.quoi==='wa').url.split('text=')[1]);
const L = msg.split('\n');
check('neuf lignes', L.length===9, L.length+'');
check('il commence par « Demande de réservation »', L[0].startsWith('Demande de réservation — '), L[0]);
check('avec la référence', /ELA-\d{2}-\d{2}-\d{4}/.test(L[0]), L[0]);
check('adresse de départ', L[1].startsWith('Départ : ') && L[1].includes('Vendôme'), L[1]);
check('adresse d\'arrivée', L[2].startsWith('Arrivée : ') && L[2].includes('Argenteuil'), L[2]);
check('date et heure', /^Date : \d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}$/.test(L[3]), L[3]);
check('nombre de passagers', L[4]==='Passagers : 3 passagers · 1 bagage', L[4]);
check('berline ou van', L[5]==='Véhicule : Berline', L[5]);
// Le chauffeur doit savoir s'il emporte son terminal : c'est la seule
// raison d'être de cette ligne, et elle passe AVANT le prix pour que le
// dernier montant en euros du message reste celui de la course.
check('mode de règlement, en français', L[6]==='Paiement : Carte bancaire', L[6]);
check('prix du site', L[7]==='Prix : 70,00 €', L[7]);
check('nom et téléphone du client, en dernier',
  L[8]==='Jean Martin — 06 12 34 56 78', L[8]);

// La forme reste lisible par « Coller une demande ».
const valeurs = L.filter(x=>/\s:\s/.test(x)).map(x=>x.slice(x.indexOf(' : ')+3).trim());
check('les deux premières valeurs « … : … » restent les adresses',
  valeurs[0].includes('Vendôme') && valeurs[1].includes('Argenteuil'));
check('la dernière ligne est « nom — téléphone », sans deux-points',
  L[8].includes(' — ') && !L[8].includes(' : '));
check('le dernier montant en euros est le prix',
  (msg.match(/(\d[\d\s ]*[.,]\d{2})\s*€/g)||[]).pop().replace(/\s/g,'')==='70,00€');

/* Ce que voit le client
   ON NE LUI DEMANDE PLUS DE VÉRIFIER NOTRE PLOMBERIE (septembre 2026, à la
   demande de Barbaros : « ça fait pas pro »). Le bon disait « vérifiez que
   le message WhatsApp est parti : c'est lui qui nous prévient tout de
   suite » — c'est-à-dire confier notre alerte au client, et avouer que le
   site ne se suffit pas à lui-même. Ce contrôle-ci verrouillait justement
   cette phrase ; il vise maintenant ce qu'elle doit dire à la place.
   LE MOT « WhatsApp » EST INTERDIT DANS CE MESSAGE-LÀ, et seulement dans
   celui-là : chercher la nouvelle formulation mot à mot tomberait à la
   première reformulation, alors que la règle, elle, tient. */
{
  const dit = await p.locator('#envoiTexte').textContent();
  check('le message de réussite ne renvoie plus le client vers WhatsApp',
    !dit.includes('WhatsApp'), dit);
  check('il dit que la demande est arrivée et qu\'on répond',
    /parvenue|reçu/i.test(dit) && /répond|disponibilité/i.test(dit), dit);
}
check('et le renvoi reste offert', await p.locator('#noteRenvoi').isVisible());
// Le bloc vert ne doit rien recouvrir : c'est la phrase juste en dessous qui
// dit s'il reste quelque chose à faire.
const chevauche = await p.evaluate(()=>{
  const a = document.getElementById('etatEnvoi').getBoundingClientRect();
  const b = document.getElementById('noteRenvoi').getBoundingClientRect();
  return a.bottom > b.top + 1;
});
check('rien ne recouvre la phrase du renvoi', !chevauche);

check('aucun débordement horizontal',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);
await ctx.close(); await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
