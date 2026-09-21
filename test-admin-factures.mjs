/* =====================================================================
   TEST-ADMIN-FACTURES.MJS — la facture de commission dans Admin v2
   ---------------------------------------------------------------------
   CE QU'ELLE ÉPROUVE, ET CE QUE ÇA COÛTAIT :

   L'argent ne passe JAMAIS par Elatransfer : le client paie le chauffeur.
   La commission ne s'encaisse donc pas toute seule, elle se FACTURE.
   Admin v2 n'avait rien pour ça — c'était le trou du modèle.

   LES TROIS CONTRÔLES QUI COMPTENT LE PLUS, et aucun ne se voit :

   1. L'APERÇU NE CONSOMME AUCUN NUMÉRO. Un rang brûlé sans facture est un
      TROU dans la numérotation — interdit au même titre qu'un doublon
      (L441-9). Et ça ne se voit pas : le document suivant s'imprime
      normalement, avec un numéro de plus.

   2. PAS DE SIRET, PAS DE FACTURE. Sans nom, SIRET et adresse, le
      document n'en est pas une. On refuse de l'éditer plutôt que d'en
      envoyer une fausse à un tiers — mais l'APERÇU reste possible, sinon
      l'écran ne sert à rien tant que la micro-entreprise n'existe pas.

   3. À L'IMPRESSION, SEULE LA FACTURE SORT. Sans cette règle, le tableau
      de bord — NOMS ET TÉLÉPHONES DE CLIENTS — partirait sur le papier
      envoyé au chauffeur.

   ELLE ÉPROUVE LE SITE CONSTRUIT : les scripts d'Admin v2 ne sont
   rattachés à la page que par « construire.sh ».

   Lancer :  node test-admin-factures.mjs   (elle construit et sert elle-même)
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
await new Promise(r => serveur.listen(8096, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8096';
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));

const attendre = async (page, fn, nom, arg) => {
  try { await page.waitForFunction(fn, arg, {timeout:8000}); return true; }
  catch { const vu = await page.textContent('#facEtat').catch(()=>'(illisible)');
          check(nom, false, 'rien n’est venu — l’écriteau dit : « '+(vu||'(vide)')+' »');
          return false; }
};

/* ═══ LE FAUX SERVEUR, QUI SE COMPORTE COMME LE VRAI ═══
   Il tient un compteur de rangs et refuse de refacturer une course déjà
   facturée : c'est ce qui permet d'éprouver l'écran contre la VRAIE règle
   plutôt que contre une politesse. */
const CHAUFFEURS = [
  { id:'d-mehmet', nom_affiche:'Mehmet', telephone_whatsapp:'0612345678',
    siret:'90112233400015', adresse:'12 rue des Lilas, 93200 Saint-Denis',
    taux_commission:25, statut:'valide', actif:true, attribuable:true },
  { id:'d-ayse', nom_affiche:'Ayse', telephone_whatsapp:'0698765432',
    siret:'90199887700033', adresse:'8 rue Victor Hugo, 93300 Aubervilliers',
    taux_commission:20, statut:'valide', actif:true,
    papiers_etat:'perime', etat_effectif:'papiers', attribuable:false },
];
/* Mehmet : 100 € + 80 € à 25 % = 45 € de commission. Recalculé à la main. */
const LIGNES = [
  {ref:'ELA-26-09-0001', jour:'2026-09-02', depart:'Roissy', arrivee:'Paris 8e',
   prix:100, taux:25, commission:25},
  {ref:'ELA-26-09-0002', jour:'2026-09-05', depart:'Orly', arrivee:'Melun',
   prix:80, taux:25, commission:20},
];
let PARAMS = [{cle:'commission_ela_defaut', valeur:{pourcentage:20}}];
let rang = 0;                 /* le compteur du faux serveur */
let facturees = false;        /* les courses de Mehmet sont-elles déjà prises ? */
const FACTURES = [];
const apercus = [];           /* combien d'aperçus ont été demandés */
const paramsEcrits = [];

const emetteur = () => (PARAMS.find(p => p.cle === 'entreprise_emettrice')||{}).valeur || null;
const pret = e => !!(e && String(e.nom||'').trim() && String(e.siret||'').trim()
                       && String(e.adresse||'').trim());
const document_ = (num) => {
  const e = emetteur() || {};
  const ht = LIGNES.reduce((s,l)=>s+l.commission,0);
  const tva = Math.round(ht * Number(e.taux_tva||0)) / 100;
  return { num, emetteur_pret: pret(e), emetteur: e,
    client: {id:'d-mehmet', nom:'Mehmet', siret:'90112233400015',
             adresse:'12 rue des Lilas, 93200 Saint-Denis'},
    periode_du:'2026-09-01', periode_au:'2026-09-30',
    lignes: facturees ? [] : LIGNES, ht: facturees ? 0 : ht,
    taux_tva: Number(e.taux_tva||0), tva, ttc: (facturees ? 0 : ht) + tva };
};

/* ═══ LA NAVIGATION EST PASSÉE À TROIS ONGLETS ═══
   Accueil (« À traiter »), Courses, Gestion. Les cinq autres écrans n'ont
   pas disparu : ils vivent sous « Gestion », qui est une PORTE et non une
   copie. Un test doit donc emprunter le CHEMIN RÉEL de l'utilisateur —
   Gestion, puis l'entrée — au lieu de cliquer un onglet qui n'est plus
   dans la barre. C'est la même leçon que « un écran qu'aucun lien n'ouvre
   n'est pas accessible » : ce qu'on éprouve, c'est le chemin. */
async function allerOnglet(p, cle){
  const direct = p.locator(`#nav button[data-tab="${cle}"]`);
  if(await direct.count()){ await direct.click(); await p.waitForTimeout(150); return; }
  await p.click('#nav button[data-tab="gestion"]');
  await p.waitForSelector(`#s-gestion [data-tab="${cle}"]`, {state:'visible', timeout:10000});
  await p.click(`#s-gestion [data-tab="${cle}"]`);
  await p.waitForTimeout(150);
}

const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'fr-FR' });

await ctx.route('**/*', r => {
  const u = r.request().url();
  if(u.startsWith(BASE)) return r.continue();
  if(!u.includes('supabase.co')) return r.abort();
  const J = o => r.fulfill({contentType:'application/json', body:JSON.stringify(o)});
  const KO = m => r.fulfill({status:400, contentType:'application/json',
                             body:JSON.stringify({message:m})});

  if(u.includes('/rpc/ela_apercu_facture_commission')){
    apercus.push(1);
    /* L'APERÇU NE TOUCHE PAS AU COMPTEUR — c'est la règle du serveur. */
    return J(document_(null));
  }
  if(u.includes('/rpc/ela_emettre_facture_commission')){
    if(!pret(emetteur())) return KO('emetteur_incomplet');
    if(facturees)        return KO('aucune_course_a_facturer');
    /* ON COMPOSE LE DOCUMENT AVANT DE MARQUER LES COURSES. Au premier jet
       l'inverse : la facture emise sortait SANS SES LIGNES et a 0 €, et les
       controles sur son contenu ne regardaient que son en-tete. Un faux
       serveur qui ment differemment du vrai ne prouve rien. */
    rang += 1;
    const f = document_('F-2026-' + String(rang).padStart(4,'0'));
    facturees = true;
    FACTURES.unshift(f);
    return J(f);
  }
  if(u.includes('/rest/v1/parametres_commerciaux')){
    if(r.request().method() === 'POST'){
      const c = JSON.parse(r.request().postData()||'{}');
      paramsEcrits.push(c);
      PARAMS = PARAMS.filter(p => p.cle !== c.cle).concat([c]);
      return r.fulfill({status:201, contentType:'application/json', body:'[]'});
    }
    return J(PARAMS);
  }
  if(u.includes('/rest/v1/factures_commission')) return J(FACTURES);
  if(u.includes('/rpc/est_exploitant')) return J(true);
  if(u.includes('/rpc/ela_rafraichir_actions')) return J(0);
  if(u.includes('/chauffeurs_etat')) return J(CHAUFFEURS);
  if(u.includes('/rest/v1/chauffeurs')) return J(CHAUFFEURS);
  if(u.includes('/actions_requises')) return J([]);
  if(u.includes('/rest/v1/courses')) return J([]);
  return J([]);
});

await ctx.addInitScript(() => {
  sessionStorage.setItem('ela_admin_session', JSON.stringify({
    access_token:'jeton-de-test', refresh_token:'r', user:{ email:'exploitant@test' } }));
});

const p = await ctx.newPage();
const ouvrirOnglet = async onglet => {
  const menu = p.locator('.mobile-menu');
  if(await menu.isVisible()){
    await menu.click();
    await p.waitForFunction(()=>document.querySelector('#nav')?.classList.contains('mobile-open'));
  }
  await p.click(`[data-tab="${onglet}"]`);
};
const errs=[]; p.on('pageerror', e=>errs.push(e.message));
await p.goto(BASE+'/admin-v2.html', {waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof openBooking==='function'
  && !!document.getElementById('btnFacApercu'), null, {timeout:20000});

/* ══════════ 1. L'ÉCRAN EXISTE ET S'OUVRE ══════════ */
check("la carte « Facture de commission » est dans les Finances",
  await p.locator('#s-finance #zoneFacture').count() === 1);
check("l'identité de l'émetteur est dans « Tarification »",
  await p.locator('#s-pricing #emNom').count() === 1,
  "c'est un réglage qu'on pose une fois, pas un geste quotidien");

await allerOnglet(p, 'finance');
await p.waitForTimeout(300);

/* Le sélecteur porte TOUS les chauffeurs, pas seulement les attribuables :
   on facture aussi celui dont les papiers ont expiré DEPUIS la course. Ce qui
   bloque une attribution ne bloque pas une créance déjà née. */
const noms = await p.$$eval('#facChauffeur option', o => o.map(x=>x.textContent.trim()));
check("le sélecteur porte AUSSI le chauffeur aux papiers périmés",
  noms.includes('Ayse') && noms.includes('Mehmet'), noms.join(', '));

/* ══════════ 2. PAS DE SIRET, PAS DE FACTURE — MAIS L'APERÇU MARCHE ══════════ */
await p.selectOption('#facChauffeur', 'd-mehmet');
await p.fill('#facDu', '2026-09-01');
await p.fill('#facAu', '2026-09-30');
await p.click('#btnFacApercu');

const vu = await attendre(p, () => {
  const v = document.getElementById('facVue');
  return v && !v.hidden && v.textContent.includes('€');
}, "l'aperçu s'affiche SANS que l'émetteur soit renseigné");

if(vu){
  const doc = await p.textContent('#facVue');
  check("l'aperçu est marqué comme tel, pas numéroté",
    /APERÇU/i.test(doc) && !/F-\d{4}-\d{4}/.test(doc), doc.slice(0,120));
  /* 100 € à 25 % = 25 €, 80 € à 25 % = 20 €, total 45 €. Recalculé à la main :
     un test qui prend la sortie pour référence ne vérifie plus rien. */
  check("le total de commission vaut 45,00 €", doc.includes('45,00 €'), doc.slice(0,400));
  check("chaque ligne porte son taux", (doc.match(/25 %/g)||[]).length >= 2, doc.slice(0,400));
  check("le trajet de chaque course est écrit",
    doc.includes('Roissy') && doc.includes('Melun'));

  check("le bouton « Émettre » est CACHÉ tant qu'il manque le SIRET",
    await p.locator('#btnFacEmettre').isHidden(),
    "un bouton qui échoue à chaque appui ferait croire à une panne");
  const dit = await p.textContent('#facEtat');
  check("…et l'écriteau NOMME ce qui manque et OÙ le remplir",
    /SIRET/.test(dit) && /Tarification/.test(dit), dit);
}

/* ══════════ 3. LE CONTRÔLE QUI COMPTE : L'APERÇU NE BRÛLE AUCUN NUMÉRO ══════════
   On regarde trois fois, puis on émet : la facture doit porter le numéro 1.
   Si l'aperçu consommait un rang, elle porterait le 4 — et les trois premiers
   seraient des TROUS dans la numérotation. */
await p.click('#btnFacApercu'); await p.waitForTimeout(250);
await p.click('#btnFacApercu'); await p.waitForTimeout(250);
check("trois aperçus ont bien été demandés au serveur", apercus.length >= 3,
  apercus.length + ' aperçu(s)');
check("aucun numéro n'a été consommé par les aperçus", rang === 0,
  'compteur du serveur : ' + rang);
check("aucune facture n'a été écrite par un aperçu", FACTURES.length === 0);

/* ══════════ 4. ON REMPLIT L'ÉMETTEUR, ET LE BOUTON APPARAÎT ══════════ */
await allerOnglet(p, 'pricing');
await p.waitForTimeout(200);
const manque = await p.textContent('#emEtat');
check("« Tarification » dit ce qui manque à l'émetteur",
  /SIRET/.test(manque) && /adresse/.test(manque), manque);

await p.fill('#emNom', 'ELA Transfer');
await p.fill('#emSiret', '00000000000000');
await p.fill('#emAdresse', '1 rue de Paris, 93000 Bobigny');
await p.fill('#emTva', '0');
await p.click('#btnEmEnregistrer');
await p.waitForTimeout(400);
check("l'identité de l'émetteur part vraiment au serveur", paramsEcrits.length === 1,
  paramsEcrits.length + ' écriture(s)');
check("…sous la clé « entreprise_emettrice »",
  (paramsEcrits[0]||{}).cle === 'entreprise_emettrice', JSON.stringify(paramsEcrits[0]||{}).slice(0,120));

await allerOnglet(p, 'finance');
await p.waitForTimeout(300);
await p.selectOption('#facChauffeur', 'd-mehmet');
await p.fill('#facDu', '2026-09-01');
await p.fill('#facAu', '2026-09-30');
await p.click('#btnFacApercu');
const pret2 = await attendre(p, () => {
  const b = document.getElementById('btnFacEmettre');
  return b && !b.hidden;
}, "« Émettre » apparaît une fois l'émetteur complet");

/* ══════════ 5. L'ÉMISSION ══════════ */
if(pret2){
  await p.click('#btnFacEmettre');
  const emise = await attendre(p, () => {
    const e = document.getElementById('facEtat');
    return e && /émise/i.test(e.textContent);
  }, "l'émission rend un compte-rendu");

  if(emise){
    check("le premier numéro est le 0001, pas le 0004",
      rang === 1 && FACTURES[0] && FACTURES[0].num === 'F-2026-0001',
      'numéro : ' + ((FACTURES[0]||{}).num || '—') + ' · compteur : ' + rang);
    const doc = await p.textContent('#facVue');
    check("la facture affichée porte son numéro", doc.includes('F-2026-0001'), doc.slice(0,150));
    /* LA FACTURE ÉMISE PORTE SES LIGNES ET SON TOTAL, pas seulement un
       en-tête. Sans ce contrôle, un document vide à 0 € serait passé —
       c'est arrivé au premier jet, par un défaut de mon faux serveur. */
    check("…et ses DEUX lignes de course",
      doc.includes('ELA-26-09-0001') && doc.includes('ELA-26-09-0002'), doc.slice(0,400));
    check("…et son total de 45,00 €", doc.includes('45,00 €'), doc.slice(-300));
    check("…et ne dit plus « aperçu »", !/APERÇU/i.test(doc));
    check("le SIRET de l'émetteur est FIGÉ dedans", doc.includes('00000000000000'));
    check("le SIRET du chauffeur est FIGÉ dedans", doc.includes('90112233400015'));

    /* SANS TVA, LA MENTION DE FRANCHISE EST OBLIGATOIRE — réclamer une TVA
       qu'on ne reverse pas est une facture fausse. */
    check("la mention « TVA non applicable, art. 293 B » est portée",
      doc.includes('293 B'), doc.slice(-400));
    check("l'indemnité forfaitaire de 40 € est portée (L441-10)",
      doc.includes('40 €'), doc.slice(-400));
    check("le paiement à réception et l'absence d'escompte sont portés",
      /réception/.test(doc) && /escompte/.test(doc));

    check("« Émettre » disparaît après l'émission",
      await p.locator('#btnFacEmettre').isHidden(),
      "réappuyer ne doit pas pouvoir brûler un second numéro");
    check("« Imprimer » apparaît", await p.locator('#btnFacImprimer').isVisible());

    /* ══════════ 6. UNE COURSE N'EST FACTURÉE QU'UNE FOIS ══════════ */
    await p.click('#btnFacApercu');
    const refus = await attendre(p, () => {
      const e = document.getElementById('facEtat');
      return e && /aucune course/i.test(e.textContent);
    }, "un second aperçu sur la même période ne trouve plus rien à facturer");
    if(refus){
      check("…et il l'explique au lieu de dire « erreur »",
        /réalisées/.test(await p.textContent('#facEtat')),
        await p.textContent('#facEtat'));
      check("aucun numéro n'a été consommé par ce refus", rang === 1,
        'compteur : ' + rang);
    }
  }
}

/* ══════════ 7. À L'IMPRESSION, SEULE LA FACTURE SORT ══════════
   Sans cette règle, le tableau de bord — noms et téléphones de clients —
   partirait sur le papier envoyé au chauffeur. On MESURE ce que le média
   « print » rend visible, plutôt que de relire la feuille de style. */
await p.emulateMedia({media:'print'});
const impr = await p.evaluate(() => {
  const vis = e => e && getComputedStyle(e).visibility === 'visible';
  return { facture: vis(document.getElementById('facVue')),
           nav: vis(document.getElementById('nav')),
           entete: vis(document.querySelector('header.top')),
           paiements: vis(document.getElementById('payments')) };
});
check("à l'impression, la facture est visible", impr.facture === true, JSON.stringify(impr));
check("à l'impression, la navigation ne sort PAS", impr.nav === false, JSON.stringify(impr));
check("à l'impression, l'en-tête ne sort PAS", impr.entete === false, JSON.stringify(impr));
check("à l'impression, la liste des paiements ne sort PAS — elle porte des clients",
  impr.paiements === false, JSON.stringify(impr));
await p.emulateMedia({media:'screen'});

/* ══════════ 8. UNE FACTURE ÉMISE SE ROUVRE TELLE QU'ELLE ÉTAIT ══════════
   Un document comptable qui se réécrit tout seul ne prouve plus rien : on
   change l'identité de l'émetteur APRÈS coup et on rouvre l'ancienne. */
PARAMS = PARAMS.filter(x => x.cle !== 'entreprise_emettrice')
  .concat([{cle:'entreprise_emettrice',
            valeur:{nom:'ELA Transfer SAS', siret:'99999999999999',
                    adresse:'99 avenue Neuve, 75001 Paris', taux_tva:0}}]);
/* ON FORCE LA PAGE À RELIRE LES PARAMÈTRES. Sans ça « state.params » garde
   l'ANCIEN émetteur, et le contrôle ci-dessous passerait au vert même si la
   page recomposait la facture — éprouvé : la falsification ne mordait pas.
   Un contrôle qui ne peut pas échouer ne vérifie rien. */
await p.evaluate(() => load());
await p.waitForFunction(() => {
  const x = (state.params||[]).find(z => z.cle === 'entreprise_emettrice');
  return x && x.valeur && x.valeur.siret === '99999999999999';
}, null, {timeout:8000});
await allerOnglet(p, 'drivers'); await p.waitForTimeout(150);
await allerOnglet(p, 'finance'); await p.waitForTimeout(500);
const liste = await p.textContent('#facListe');
check("la facture émise apparaît dans la liste", liste.includes('F-2026-0001'), liste.slice(0,200));
await p.click('[data-fac="F-2026-0001"]');
await p.waitForTimeout(300);
const rouverte = await p.textContent('#facVue');
check("rouverte, elle garde l'ANCIEN SIRET de l'émetteur",
  rouverte.includes('00000000000000'),
  "un document comptable qui se réécrit tout seul ne prouve plus rien");
check("…et pas le nouveau", !rouverte.includes('99999999999999'), rouverte.slice(0,200));

/* ═══ LA PORTE DES CODES PROMO, DEPUIS « TARIFS ET RÉGLAGES » ═══
   Barbaros la cherchait là et ne la trouvait pas : l'écran existait, mais
   il n'était atteignable que par « Gestion ». Une porte qui ne mène nulle
   part est pire que pas de porte — d'où un contrôle qui APPUIE dessus au
   lieu de constater qu'un bouton existe.
   ET IL ÉPROUVE LA RÈGLE DU PROJET, pas la présence du formulaire : un
   code promo sans DATE DE FIN ni NOMBRE D'USAGES est une remise à vie pour
   qui le connaît. Les deux codes de 2026 n'en avaient aucun, et le −15 %
   annulait exactement la hausse des tarifs. */
await allerOnglet(p, 'pricing'); await p.waitForTimeout(200);
const porte = p.locator('#s-pricing [data-tab="promos"]');
const combien = await porte.count();
check("« Tarifs et réglages » porte l'accès aux codes promo", combien === 1, String(combien));
/* ON NE CLIQUE QUE SI LA PORTE EST LÀ. Sans cette garde, son retrait tue la
   suite sur un délai d'attente NU — elle échoue bien, mais sans dire ce
   qu'elle attendait, et les contrôles suivants ne sont jamais imprimés. */
if(combien === 1){
  await porte.first().click(); await p.waitForTimeout(300);
  check("…et elle ouvre vraiment l'écran des codes promo",
    await p.locator('#s-promos').evaluate(e => e.classList.contains('on')));
  await p.click('#s-promos [data-open="promo"]'); await p.waitForTimeout(300);
  const champs = await p.$$eval('#entityForm [name]', n => n.map(x => x.getAttribute('name')));
  check("le formulaire exige une date de fin", champs.includes('fin'), champs.join(', '));
  check("…et un nombre d'usages maximum", champs.includes('utilisations_max'), champs.join(', '));
  await p.click('#closeSheet'); await p.waitForTimeout(150);
} else {
  check("…et elle ouvre vraiment l'écran des codes promo", false, "porte absente");
  check("le formulaire exige une date de fin", false, "porte absente");
  check("…et un nombre d'usages maximum", false, "porte absente");
}

check('aucune erreur JavaScript sur toute la traversée', errs.length === 0, errs.join(' | '));

await b.close(); serveur.close();
if(ok.length) console.log('=== RÉUSSIS ('+ok.length+') ===\n' + ok.map(x=>'  ✔ '+x).join('\n'));
if(ko.length){ console.log('\n=== ÉCHECS ('+ko.length+') ===\n' + ko.map(x=>'  ✘ '+x).join('\n'));
  process.exit(1); }
console.log('\nFactures Admin v2 : ' + ok.length + ' contrôles au vert.');
