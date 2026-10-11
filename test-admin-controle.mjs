/* =====================================================================
   TEST-ADMIN-CONTROLE.MJS — le centre de contrôle de l'espace exploitant
   ---------------------------------------------------------------------
   30/09/2026, à sa demande : « un tableau qui indique le taux de
   commission sur les courses public, site client hôtel, flyer ou prix km…
   un vrai centre de contrôle ». Puis : « un changement de commission pour
   le site public ne doit pas affecter easyHotel… je dois pouvoir attribuer
   un montant précis par course ou chauffeur ».

   CE QU'ON ÉPROUVE, SUR LE SITE CONSTRUIT :
   - l'ordre de la commission : course, puis chauffeur, puis CANAL ;
   - le canal de chaque course (site public, flyer hôtel, réception,
     saisie au téléphone) et les totaux par canal, recalculés à la main ;
   - changer le taux du site public ne touche pas celui du flyer hôtel,
     et le taux part au SERVEUR (il vaut sur tous les appareils) ;
   - une vieille fiche de chauffeur à « 0 » sans unité ne masque pas le
     taux du canal (c'était un champ vide) ;
   - l'agent ne voit pas l'écran.

   Lancer :  node test-admin-controle.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';

execSync('sh construire.sh', {stdio:'ignore'});
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript',
  '.json':'application/json','.webmanifest':'application/manifest+json',
  '.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const serveur = createServer(async (req, res) => {
  try {
    let chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, {'Content-Type': TYPES[extname(f)] || 'application/octet-stream'});
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8096, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8096';
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const J = (b, s=200) => ({status:s, contentType:'application/json', body:JSON.stringify(b)});

const auj = new Date().toISOString().slice(0,10);
const course = (ref, prix, chauffeur, extra={}) => Object.assign({ ref, statut:'realisee', cree:new Date().toISOString(),
  course:{ depart:'Place Vendôme, 75001 Paris', arrivee:'Aéroport Charles-de-Gaulle, Terminal 2E',
    date:auj, heure:'10:00', vehicule:'Berline', vehiculeCle:'berline', passagers:'2 passagers' },
  client:{ nom:'Client '+ref.slice(-1), telephone:'06 12 34 56 78' }, prix:{ total:prix },
  chauffeur:{ nom:chauffeur, telephone: chauffeur === 'Mehmet' ? '0600000001' : '0600000002' } }, extra);
/* Six courses faites et une demande en attente. Commission attendue :
   A public 100 € Ali (pas de taux)   → canal 10 %     = 10
   B flyer hôtel 35 € Ali             → canal 5 € fixe = 5
   C réception 50 € Ali               → canal vide     = 0
   D saisie téléphone 60 € Ali        → canal 15 %     = 9
   E public 80 € Mehmet (20 %)        → chauffeur      = 16
   F public 70 € Ali, 7 € posés       → course         = 7          */
const COURSES = [
  course('ELA-26-09-AAAAA', 100, 'Ali'),
  course('ELA-26-09-BBBBB', 35, 'Ali', { provenanceCle:'easyhotel-aeroville', provenance:'easyHotel Aéroville' }),
  course('ELA-26-09-CCCCC', 50, 'Ali', { provenanceCle:'easyhotel-aeroville', provenance:'easyHotel Aéroville', parReception:true }),
  course('ELA-26-09-DDDDD', 60, 'Ali', { canal:'admin' }),
  course('ELA-26-09-EEEEE', 80, 'Mehmet'),
  course('ELA-26-09-FFFFF', 70, 'Ali', { commission:{ mode:'eur', valeur:7 } }),
  course('ELA-26-09-GGGGG', 90, 'Ali', { statut:'attente' }),
];
/* Ali a une vieille fiche : « 0 » enregistré pour un champ laissé vide,
   sans unité. Elle ne doit PAS masquer le taux du canal. */
const CHAUFFEURS = [
  { id:'c1', nom:'Mehmet', telephone:'0600000001', taux:20 },
  { id:'c2', nom:'Ali', telephone:'0600000002', taux:0 } ];
let TAUX = { public:{mode:'pct', valeur:10}, hotel:{mode:'eur', valeur:5}, admin:{mode:'pct', valeur:15} };
let ecrits = [];
let SERVEUR = COURSES;

const nav = await chromium.launch();
async function espace(role='admin'){
  const ctx = await nav.newContext({viewport:{width:390,height:844}, locale:'fr-FR'});
  await ctx.addInitScript(([ch]) => {
    localStorage.setItem('ela_nuage_session', JSON.stringify({access_token:'JETON', refresh_token:'R'}));
    if (!localStorage.getItem('ela_chauffeurs')) localStorage.setItem('ela_chauffeurs', JSON.stringify(ch));
    window.__ouverts = []; window.open = (u) => { window.__ouverts.push(String(u)); return null; };
  }, [CHAUFFEURS]);
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  await p.route('**/*', async route => {
    const u = route.request().url(), m = route.request().method();
    if (u.startsWith(BASE)) return route.continue();
    if (u.includes('supabase.co')) {
      if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
      if (u.includes('/rpc/role_operateur')) return route.fulfill(J(role));
      if (u.includes('parametres_commerciaux') && m === 'POST') {
        const corps = JSON.parse(route.request().postData() || '{}');
        ecrits.push(corps); if (corps.cle === 'commission_canaux') TAUX = corps.valeur;
        return route.fulfill({status:201, body:''});
      }
      if (u.includes('parametres_commerciaux?cle=eq.commission_canaux')) return route.fulfill(J([{valeur:TAUX}]));
      if ((u.includes('/rest/v1/courses?select=ref&') || u.includes('/rest/v1/courses?select=ref,version&'))) return route.fulfill(J([{ref:SERVEUR[0].ref}]));
      if (u.includes('/rest/v1/courses')) return route.fulfill(J(SERVEUR.map(bon => ({bon, statut:bon.statut}))));
      if (u.includes('/rest/v1/')) return route.fulfill(J([]));
      return route.fulfill(J({}));
    }
    return route.abort();
  });
  await p.goto(BASE + '/ela-admin/');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, {timeout:10000});
  await p.waitForFunction(() => document.querySelectorAll('.demande').length >= 1, null, {timeout:8000}).catch(()=>{});
  await p.waitForTimeout(300);
  return {ctx, p, erreurs};
}
const lignes = (p, id) => p.$$eval(`#${id} .cc-ligne`, ls => ls.map(l => [...l.children].map(c => c.textContent.replace(/\s+/g,' ').trim())));
const ligne = async (p, id, debut) => (await lignes(p, id)).find(l => l[0].startsWith(debut)) || [];
const nb = (t) => Number(String(t).replace(/[^\d,]/g,'').replace(',', '.'));

try {
  const {ctx, p, erreurs} = await espace();
  check('le menu porte « Centre de contrôle »', await p.locator('#btnControle').isVisible());
  await p.click('#btnControle');
  await p.waitForSelector('#ecran-controle.actif', {timeout:5000}).catch(()=>{});
  check('il ouvre son écran', await p.locator('#ecran-controle').isVisible());
  await p.click('[data-ccperiode="tout"]'); await p.waitForTimeout(200);

  const pub = await ligne(p, 'ccCanaux', 'Site public');
  check('site public : 4 demandes, 3 faites', pub[1] === '4' && pub[2] === '3', pub.join(' | '));
  check('site public : CA 250 €', nb(pub[3]) === 250, pub[3]);
  check('site public : commission 10 + 16 + 7 = 33 €', nb(pub[4]) === 33, pub[4]);
  const hot = await ligne(p, 'ccCanaux', 'Flyer hôtel');
  check('flyer hôtel : 5 € fixes sur la course de 35 €', nb(hot[4]) === 5 && nb(hot[3]) === 35, hot.join(' | '));
  const rec = await ligne(p, 'ccCanaux', 'Réception');
  check('réception : sans taux posé, aucune commission inventée', nb(rec[4]) === 0 && nb(rec[3]) === 50, rec.join(' | '));
  const adm = await ligne(p, 'ccCanaux', 'Saisie au téléphone');
  check('saisie au téléphone : 15 % de 60 € = 9 €', nb(adm[4]) === 9, adm.join(' | '));
  const tot = await ligne(p, 'ccCanaux', 'Total');
  check('total : 7 demandes, 6 faites, 395 €, 47 € de commission',
    tot[1] === '7' && tot[2] === '6' && nb(tot[3]) === 395 && nb(tot[4]) === 47, tot.join(' | '));

  const mehmet = await ligne(p, 'ccChauffeurs', 'Mehmet'), ali = await ligne(p, 'ccChauffeurs', 'Ali');
  check('chauffeurs : Mehmet a sa règle, 20 %', /20 %/.test(mehmet[1]) && nb(mehmet[3]) === 16, mehmet.join(' | '));
  check('chauffeurs : la vieille fiche d\'Ali à « 0 » retombe sur le canal', ali[1] === 'canal' && nb(ali[3]) === 31, ali.join(' | '));

  const km = await ligne(p, 'ccTarifs', 'Berline');
  check('tarifs en vigueur : la berline au kilomètre, lue dans la grille du site', /2,90/.test(km[1] || ''), km.join(' | '));
  check('tarifs en vigueur : les prix du flyer y sont', (await lignes(p, 'ccTarifs')).some(l => /Orly/.test(l[0])));

  /* Changer le taux du site public ne touche pas le flyer hôtel. */
  await p.fill('#ccVal_public', '12');
  await p.click('#btnCcTaux'); await p.waitForTimeout(500);
  const envoi = ecrits.find(e => e.cle === 'commission_canaux');
  check('le taux part au serveur (parametres_commerciaux)', !!envoi, JSON.stringify(ecrits));
  check('site public passé à 12 %', envoi && envoi.valeur.public.valeur === 12 && envoi.valeur.public.mode === 'pct', JSON.stringify(envoi && envoi.valeur));
  check('le flyer hôtel garde ses 5 € fixes', envoi && envoi.valeur.hotel.mode === 'eur' && envoi.valeur.hotel.valeur === 5, JSON.stringify(envoi && envoi.valeur));
  check('un canal laissé vide reste sans taux (pas de 0 inventé)', envoi && !('reception' in envoi.valeur), JSON.stringify(envoi && envoi.valeur));
  const pub2 = await ligne(p, 'ccCanaux', 'Site public'), hot2 = await ligne(p, 'ccCanaux', 'Flyer hôtel');
  check('site public recalculé : 12 + 16 + 7 = 35 €', nb(pub2[4]) === 35, pub2[4]);
  check('flyer hôtel inchangé : 5 €', nb(hot2[4]) === 5, hot2[4]);

  await p.fill('#ccVal_public', '140');
  await p.click('#btnCcTaux'); await p.waitForTimeout(300);
  check('un pourcentage au-delà de 100 est refusé', /invalide/.test(await p.textContent('#ccTauxEtat')));

  /* Sur le bon, la commission dit d'où elle vient. */
  await p.click('#btnRetourControle');
  await p.click('.compteur[data-filtre="realisee"]'); await p.waitForTimeout(200);
  await p.locator('.demande').filter({hasText:'ELA-26-09-AAAAA'}).first().click(); await p.waitForTimeout(400);
  const calc = await p.textContent('#bbComCalc');
  check('le bon dit « taux du canal (Site public) » et 12 €', /taux du canal \(Site public\)/.test(calc) && /12,00\s€/.test(calc), calc);
  check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();

  /* L'agent ne voit pas l'argent. */
  const ag = await espace('agent_reservation');
  await ag.p.waitForFunction(() => document.body.classList.contains('role-agent_reservation'), null, {timeout:5000}).catch(()=>{});
  check('agent : pas de « Centre de contrôle » dans son menu', !(await ag.p.locator('#btnControle').isVisible()));
  await ag.p.locator('#btnChauffeurs').click(); await ag.p.waitForTimeout(200);
  check('agent : l\'unité de commission du carnet est cachée', !(await ag.p.locator('label[for="chTauxMode"]').isVisible()));
  await ag.ctx.close();

  /* ═══ CE QUE LES CHAUFFEURS DOIVENT ═══
     Mehmet (20 %) : une course de 100 € il y a 40 jours (20 € EN RETARD) et
     une de 50 € aujourd'hui (10 €). Ali : 7 € posés sur la course. Sami,
     hors carnet et sans taux de canal : une course sans commission définie. */
  const ilya = (j) => { const d = new Date(); d.setDate(d.getDate() - j); return d.toISOString().slice(0,10); };
  const vieille = course('ELA-26-08-MMMM1', 100, 'Mehmet'); vieille.course.date = ilya(40);
  SERVEUR = [ vieille, course('ELA-26-09-MMMM2', 50, 'Mehmet'),
    course('ELA-26-09-AAAA3', 70, 'Ali', { commission:{ mode:'eur', valeur:7 } }),
    course('ELA-26-09-SSSS4', 60, 'Sami', { provenanceCle:'easyhotel-aeroville', parReception:true }),
    course('ELA-26-09-PPPP5', 90, '', { statut:'attente', chauffeur:undefined }),
    /* Départ à minuit : depuis le 3 octobre 2026, « Marquer comme réalisée »
       demande un second appui avant l'heure de départ. Le sujet ici est la
       commission figée, pas ce garde-fou. */
    (c => (c.course.heure = '00:00', c))(course('ELA-26-09-QQQQ6', 80, 'Ali', { statut:'confirmee' })) ];
  TAUX = { public:{mode:'pct', valeur:10} };
  SERVEUR[3].chauffeur.telephone = '0600000009';
  const d = await espace();
  check('tableau de bord : le retard est signalé', await d.p.locator('#bordDettes').isVisible());
  check('et il nomme le chauffeur et le montant en retard (20 €)', /Mehmet doit 20,00\s€/.test(await d.p.textContent('#bordDettesTexte')), await d.p.textContent('#bordDettesTexte'));
  await d.p.click('#btnBordDettes'); await d.p.waitForTimeout(300);
  check('« Voir et relancer » ouvre le centre de contrôle', await d.p.locator('#ecran-controle').isVisible());
  let m = await ligne(d.p, 'ccDettes', 'Mehmet');
  check('Mehmet : dû 30 €, reste 30 €, retard 20 €', nb(m[1]) === 30 && nb(m[3]) === 30 && /retard 20,00/.test(m[0]), m.join(' | '));
  const sami = await ligne(d.p, 'ccDettes', 'Sami');
  check('Sami (course sans commission définie) n\'apparaît pas comme débiteur', sami.length === 0, sami.join(' | '));
  check('mais la course sans commission est signalée', /1 course\(s\) réalisée\(s\) sans commission/.test(await d.p.textContent('#ccDettesResume')), await d.p.textContent('#ccDettesResume'));
  /* Sami vient de la réception, canal sans taux : rien à devoir, mais à signaler. */

  await d.p.click('[data-relancer^="id:c1"]'); await d.p.waitForTimeout(200);
  const lien = (await d.p.evaluate(() => window.__ouverts)).at(-1) || '';
  check('« Relancer » écrit sur le numéro du chauffeur', lien.startsWith('https://wa.me/33600000001'), lien.slice(0,40));
  const msg = decodeURIComponent(lien.split('text=')[1] || '');
  check('le message liste les courses et le total', /ELA-26-08-MMMM1/.test(msg) && /Total à régler : 30,00\s€/.test(msg), msg);

  await d.p.click('[data-payer^="id:c1"]'); await d.p.waitForTimeout(200);
  check('« Paiement reçu » propose le reste (30,00)', (await d.p.inputValue('#ccPaiementMontant')) === '30.00', await d.p.inputValue('#ccPaiementMontant'));
  await d.p.fill('#ccPaiementMontant', '15');
  await d.p.click('#btnCcPaiementOk'); await d.p.waitForTimeout(300);
  m = await ligne(d.p, 'ccDettes', 'Mehmet');
  check('après 15 € reçus : reste 15 €, et le paiement solde la plus ANCIENNE (retard 5 €)', nb(m[3]) === 15 && /retard 5,00/.test(m[0]), m.join(' | '));

  /* Le seuil : au-delà, la confirmation est bloquée. */
  await d.p.fill('#ccSeuil', '10'); await d.p.click('#btnCcSeuil'); await d.p.waitForTimeout(300);
  check('le seuil part au serveur', ecrits.some(e => e.cle === 'seuil_dette_chauffeur' && e.valeur.euros === 10), JSON.stringify(ecrits.map(e=>e.cle)));
  await d.p.click('#btnRetourControle'); await d.p.waitForTimeout(200);
  await d.p.locator('.demande').filter({hasText:'ELA-26-09-PPPP5'}).first().click(); await d.p.waitForTimeout(400);
  await d.p.fill('#bbChauffeurNom', 'Mehmet'); await d.p.fill('#bbChauffeurTel', '0600000001'); await d.p.waitForTimeout(200);
  const alerte = await d.p.textContent('#bbDette');
  check('sur le bon : « Mehmet vous doit 15,00 € », au-delà du seuil', await d.p.locator('#bbDette').isVisible() && /Mehmet vous doit 15,00\s€/.test(alerte) && /seuil/.test(alerte), alerte);
  await d.p.click('#btnConfirmerCourse'); await d.p.waitForTimeout(300);
  check('la confirmation est bloquée', (await d.p.textContent('#bbEtat')) !== 'Confirmée' && /seuil/.test(await d.p.textContent('#confirmerEtat')), await d.p.textContent('#confirmerEtat'));
  await d.p.fill('#bbChauffeurNom', 'Ali'); await d.p.fill('#bbChauffeurTel', '0600000002'); await d.p.waitForTimeout(200);
  check('Ali (7 €, sous le seuil) : signalé sans blocage', /Ali vous doit 7,00\s€/.test(await d.p.textContent('#bbDette')) && !/seuil/.test(await d.p.textContent('#bbDette')), await d.p.textContent('#bbDette'));
  await d.p.click('#btnRetourBord'); await d.p.waitForTimeout(200);

  /* La commission se FIGE quand la course est faite. */
  await d.p.locator('button', {hasText:'À assurer'}).first().click(); await d.p.waitForTimeout(200);
  await d.p.locator('.demande').filter({hasText:'ELA-26-09-QQQQ6'}).first().click(); await d.p.waitForTimeout(400);
  await d.p.click('#btnRealisee'); await d.p.waitForTimeout(300);
  const figee = await d.p.evaluate(() => (JSON.parse(localStorage.getItem('ela_bookings')||'[]').find(c => c.ref === 'ELA-26-09-QQQQ6') || {}).commissionFigee);
  check('marquée réalisée : la commission est figée (10 % de 80 € = 8 €)', figee && figee.montant === 8 && figee.source === 'canal', JSON.stringify(figee));
  await d.p.click('#btnControle'); await d.p.waitForTimeout(300);
  await d.p.fill('#ccVal_public', '25'); await d.p.click('#btnCcTaux'); await d.p.waitForTimeout(300);
  const aliD = await ligne(d.p, 'ccDettes', 'Ali');
  check('le taux du canal change ensuite : la dette d\'Ali ne bouge pas (7 + 8 = 15 €)', nb(aliD[1]) === 15, aliD.join(' | '));

  const [dl] = await Promise.all([ d.p.waitForEvent('download'), (async () => { await d.p.click('#btnRegistre'); await d.p.click('#btnSauver'); })() ]);
  const contenu = JSON.parse(await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8'));
  check('la sauvegarde emporte les paiements', Array.isArray(contenu.paiementsChauffeurs) && contenu.paiementsChauffeurs.length === 1);
  check('aucune erreur JavaScript (dettes)', d.erreurs.length === 0, d.erreurs.join(' | '));
  await d.ctx.close();
} finally {
  await nav.close(); serveur.close();
}
console.log(ko.length ? `=== ÉCHECS (${ko.length}) ===\n` + ko.map(x=>'  ✗ '+x).join('\n') : '');
console.log(`=== RÉUSSIS (${ok.length}) ===\n` + ok.map(x=>'  ✓ '+x).join('\n'));
process.exit(ko.length ? 1 : 0);
