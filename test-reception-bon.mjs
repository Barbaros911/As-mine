/* =====================================================================
   TEST-RECEPTION-BON.MJS — le bon affiché, le même chez Barbaros, et la
   réception sur le PC d'un hôtel
   ---------------------------------------------------------------------
   5 octobre 2026, à la demande de Barbaros :
   - « la réception n'a pas besoin d'envoyer de bons, on peut juste
     afficher un bon » — et « les bons que voit la réception doivent être
     les mêmes chez moi » ;
   - « le nom du client et son numéro […] très visibles » ;
   - l'historique « avec les trajets les plus récents en début ».
   ÉPROUVÉ SUR LE SITE CONSTRUIT, en 1366×768 : c'est l'écran d'un PC
   d'hôtel, et c'est là qu'on a mesuré la première course SOUS le bas de
   l'écran (y = 723). L'admin aussi n'existe que construit (/ela-admin/).
   Lancer :  node test-reception-bon.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';

execSync('sh construire.sh', { stdio: 'ignore' });
const TYPES = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8091, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8091';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
const paris = min => { const s = new Date(Date.now() + min * 60000).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }); return s.slice(0, 10); };

/* Deux courses finies le MÊME jour (8 h et 18 h) et une la veille : c'est le
   cas où l'historique mettait 8 h avant 18 h. */
const HIER = paris(-1440), AVANT_HIER = paris(-2880), DEMAIN = paris(1440);
const LISTE = [
  { ref:'ELA-26-10-AVEN1', statut:'attente', date:DEMAIN, heure:'09:00', depart:'easyHotel Aéroville, 10 rue de la Belle Borne',
    arrivee:'Orly 1 — Aéroport de Paris-Orly', vehicule:'Berline', prix:90, client:'Mr John Smith',
    tel:'+44 7412 345678', chambre:'214', paiement:'Carte bancaire' },
  { ref:'ELA-26-10-AVEN2', statut:'confirmee', date:DEMAIN, heure:'11:00', depart:'easyHotel Aéroville, 10 rue de la Belle Borne',
    arrivee:'Disneyland Paris', vehicule:'Van', prix:120, client:'M. Dupont', tel:'06 12 34 56 78',
    chambre:'118', paiement:'Espèces', chauffeur:{ nom:'Mehmet', telephone:'06 98 76 54 32' } },
  { ref:'ELA-26-10-MATIN', statut:'realisee', date:HIER, heure:'08:00', depart:'easyHotel Aéroville',
    arrivee:'Terminal 2E', vehicule:'Berline', client:'Mme Matin', tel:'06 11 11 11 11', chambre:'101', paiement:'Espèces' },
  { ref:'ELA-26-10-SOIR1', statut:'realisee', date:HIER, heure:'18:00', depart:'easyHotel Aéroville',
    arrivee:'Terminal 1', vehicule:'Berline', client:'M. Soir', tel:'06 22 22 22 22', chambre:'102', paiement:'Carte bancaire' },
  { ref:'ELA-26-10-VEILL', statut:'refusee', date:AVANT_HIER, heure:'23:00', depart:'easyHotel Aéroville',
    arrivee:'Beauvais', vehicule:'Van', client:'M. Veille', tel:'06 33 33 33 33', chambre:'103', paiement:'Espèces' },
];
const erreurs = [];
const nav = await chromium.launch();

try {
  /* ---------------------------------------------------------------
     1. LA RÉCEPTION SUR UN PC 1366×768
     --------------------------------------------------------------- */
  const ctx = await nav.newContext({ viewport:{ width:1366, height:768 }, locale:'fr-FR', timezoneId:'Europe/Paris' });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(BASE)) return r.continue();
    if (u.includes('/functions/v1/courses-hotel'))
      return r.fulfill(J({ hotel:'easyhotel-aeroville', courses:LISTE, session:'s.sig', expire:Date.now() + 864e5 }));
    if (u.includes('/functions/v1/deposer-course'))
      return r.fulfill({ status:201, contentType:'application/json', body:JSON.stringify({ ok:true, numero:1042 }) });
    return r.abort();
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/reception/easyhotel-aeroville/', { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(700);
  await p.fill('#recCode', 'code-de-test');
  await p.click('#btnRecEntrer');
  await p.waitForSelector('#recListe .rec-course', { timeout:8000 });
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(300);

  const premiere = await p.locator('#recListe .rec-course').first().boundingBox();
  check('sur un PC 1366×768, la première course est à l\'écran sans faire défiler',
    premiere && premiere.y < 768 - 120, premiere ? 'y = ' + Math.round(premiere.y) : 'absente');
  check('plus de bloc de trois chiffres', await p.locator('.rec-chiffre').count() === 0);
  check('« Un imprévu ? » écrit le numéro en clair',
    /\+33 7 59 31 24 33/.test(await p.locator('.rec-aide').innerText()));
  const largeur = await p.evaluate(() => document.documentElement.scrollWidth);
  check('aucun débordement horizontal', largeur <= 1366, largeur + ' px');
  /* SUR UN ORDINATEUR, PLUS DE WHATSAPP (9/10/2026, Barbaros) : sur le PC
     d'un comptoir il n'ouvrirait que WhatsApp Web. La réception compose le
     numéro écrit en clair. */
  check('sur un PC, « Un imprévu ? » n\'a plus de bouton WhatsApp, le numéro reste',
    await p.locator('#recAideWa').isHidden() && await p.locator('.rec-aide a[href^="tel:"]').isVisible());
  const bas = await p.evaluate(() => ({ barre: [...document.querySelectorAll('nav.barre')].some(b => b.getBoundingClientRect().height > 0 && getComputedStyle(b).display !== 'none'),
    reserve: getComputedStyle(document.body).paddingBottom }));
  check('sur un PC, pas de barre du bas, ni de place réservée pour elle', !bas.barre && bas.reserve === '0px', JSON.stringify(bas));

  /* « DÉPART IMMÉDIAT » (20/10/2026, Barbaros, version A choisie sur
     maquette) : une tuile d'appel à côté de « Nouvelle course », de même
     taille, sur la même ligne, avec le numéro en clair et un vrai lien
     d'appel. Mesuré à l'écran, pas relu dans le CSS. */
  const tuiles = await p.evaluate(() => {
    const n = document.getElementById('btnRecReserver'), a = document.getElementById('recAppelImmediat');
    if (!n || !a) return null;
    const rn = n.getBoundingClientRect(), ra = a.getBoundingClientRect();
    return { href: a.getAttribute('href'), texte: a.innerText, memeLigne: Math.abs(rn.top - ra.top) < 2,
             memeHauteur: Math.abs(rn.height - ra.height) < 2, cote: ra.left > rn.right, fond: getComputedStyle(a).backgroundColor };
  });
  check('sur un PC, la tuile « Départ immédiat » est à côté de « Nouvelle course », même taille',
    tuiles && tuiles.memeLigne && tuiles.memeHauteur && tuiles.cote, JSON.stringify(tuiles));
  check('elle appelle Elatransfer et écrit le numéro en clair',
    tuiles && tuiles.href === 'tel:+33759312433' && /DÉPART IMMÉDIAT/.test(tuiles.texte) && /\+33 7 59 31 24 33/.test(tuiles.texte), tuiles && tuiles.texte);
  check('elle n\'est pas rouge (le rouge dit « en attente »)', tuiles && !/rgb\(2(0[0-9]|1[0-9]|2[0-9]), ?(3[0-9]|4[0-9]|5[0-9]), ?(4[0-9]|5[0-9])\)/.test(tuiles.fond), tuiles && tuiles.fond);

  /* LE FORMULAIRE DU COMPTOIR NE PARLE PLUS AU CLIENT (20/10/2026, Barbaros :
     « trop de choses destinées au client »). Ce qui ne sert qu'au client est
     masqué ; ce qui sert est réécrit pour la réception. Mesuré à l'écran. */
  await p.click('#btnRecReserver'); await p.waitForTimeout(800);
  const form = await p.evaluate(() => {
    const vu = sel => [...document.querySelectorAll(sel)].some(e => e.getBoundingClientRect().height > 0);
    const txt = sel => (document.querySelector(sel) || {}).textContent || '';
    return { aideVol: vu('#aideVol'), regle: vu('[data-t="regle_contact"]'), regles: vu('#paiementLien .paiement-regles'),
             telBas: vu('#paiementLien .paiement-tel'), contact: txt('#blocContact .bloc-titre').trim(),
             paiement: vu('#blocPaiement'), telegram: vu('#blocContact [data-contact="telegram"]'),
             tel: txt('#blocContact [data-contact="telephone"]').trim(), boutonValider: vu('#ecran-accueil .bouton, #btnConfirmer') };
  });
  check('formulaire du comptoir : plus d\'aide du vol, de « gardez votre téléphone », ni de bloc paiement',
    !form.aideVol && !form.regle && !form.regles && !form.telBas && !form.paiement, JSON.stringify(form));
  check('formulaire du comptoir : « Le client sera confirmé par : » Téléphone ou WhatsApp, sans Telegram',
    form.contact === 'Le client sera confirmé par :' && form.tel === 'Téléphone' && !form.telegram, JSON.stringify(form));

  /* ═══ CE QUE PERSONNE N'A CHOISI N'EST PAS VERT (21/10/2026) ═══
     Le formulaire s'ouvre sur CDG, Terminal 1, 1 passager, 1 bagage : une
     coche d'office disait « vérifié » sur un CDG que la réception n'avait
     pas regardé. Seul le départ (l'hôtel lui-même) est vert. */
  const etatsEH = () => p.evaluate(() => ({
    ok: [...document.querySelectorAll('#ecran-accueil .eh-ok')].map(e => (e.querySelector('input,select,textarea') || e).id),
    manque: [...document.querySelectorAll('#ecran-accueil .eh-manque')].map(e => (e.querySelector('input,select,textarea') || e).id),
    choisi: !!document.querySelector('#listeVehicules .veh-carte.choisi') }));
  let eh = await etatsEH();
  check('formulaire neuf : la destination, le terminal, les passagers et les bagages ne sont pas verts d\'office',
    eh.ok.join(',') === 'depart' && eh.manque.length === 0, JSON.stringify(eh));
  await p.selectOption('#hotelDest', 'orly'); await p.waitForTimeout(600);
  eh = await etatsEH();
  check('…et la destination passe au vert dès qu\'on la choisit', eh.ok.includes('hotelDest'), JSON.stringify(eh));
  /* « Valider » sans véhicule : on reste, et le cadre rouge DIT ce qui
     manque — la couleur ne porte jamais le sens seule. */
  await p.fill('#clientNom', 'M. Dupont'); await p.fill('#chambre', '214'); await p.fill('#clientTel', '06 12 34 56 78');
  await p.locator('#blocContact [data-contact="whatsapp"]').click();
  await p.locator('#btnVoirPrix').click({ force:true }); await p.waitForTimeout(700);
  const sansGamme = await p.evaluate(() => {
    const l = document.getElementById('listeVehicules');
    return { ecran: document.querySelector('.ecran.actif')?.id, rouge: l.classList.contains('eh-manque'),
             phrase: getComputedStyle(l, '::before').content };
  });
  check('« Valider » sans véhicule : on reste, et le cadre rouge dit « Choisissez le véhicule »',
    sansGamme.ecran === 'ecran-accueil' && sansGamme.rouge && sansGamme.phrase === '"Choisissez le véhicule"', JSON.stringify(sansGamme));
  await p.locator('#listeVehicules .veh-carte').first().click();
  await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1500);
  check('avec le véhicule, la réservation part', (await p.locator('#bcTitre').textContent().catch(() => '')) === 'Réservation enregistrée');
  /* « Réserver une autre course » : le client suivant repart de zéro. Mesuré
     avant : nom et téléphone déjà rouges « Obligatoire », véhicule du client
     précédent toujours coché. */
  await p.click('#btnNouvelleCourse'); await p.waitForTimeout(800);
  eh = await etatsEH();
  check('« Réserver une autre course » : rien en rouge, aucun véhicule coché, rien de vert d\'office',
    eh.manque.length === 0 && !eh.choisi && eh.ok.join(',') === 'depart', JSON.stringify(eh));
  await p.goto(BASE + '/reception/easyhotel-aeroville/', { waitUntil:'domcontentloaded' });
  await p.waitForSelector('#recListe .rec-course', { timeout:8000 }).catch(() => {});
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);

  /* LA PHOTO DU COMPTOIR (20/10/2026, Barbaros : la réception seulement).
     Collée à droite du bandeau, vraiment chargée, et le bandeau ne grandit
     pas : au comptoir, la place est celle de la liste. */
  const bandeau = await p.evaluate(async () => {
    const t = document.querySelector('#ecran-reception .trajet-tete');
    const url = /url\("([^"]+)"\)/.exec(getComputedStyle(t).backgroundImage)?.[1] || '';
    const charge = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i.naturalWidth); i.onerror = () => ok(0); i.src = url; });
    return { url, charge, h: Math.round(t.getBoundingClientRect().height) };
  });
  check('sur un PC, le bandeau du comptoir porte la photo de la réception, chargée',
    /\/photos\/easyhotel-aeroville-reception\.webp$/.test(bandeau.url) && bandeau.charge > 0, JSON.stringify(bandeau));
  check('le bandeau photo reste assez bas pour que la liste suive', bandeau.h <= 190, bandeau.h + ' px');
  /* LES HORAIRES DU COMPTOIR SONT CEUX DE L'ACCUEIL (21/10/2026) : la ligne
     est écrite dans la finition, la phrase de l'accueil dans la page. Lue des
     deux côtés plutôt que recopiée ici : deux horaires qui divergent ne se
     voient pas, et c'est la réception qui le répète au client. */
  const horaires = await p.evaluate(() => {
    const b = document.querySelector('#recAssistance .reception-hours-copy b, #receptionHoraires .reception-hours-copy b');
    const t = (window.ELA_TEXTES || {}).fr || {};
    return { comptoir: b ? b.textContent : '', accueil: t.hero_notes || '' };
  });
  check('le comptoir annonce les horaires de l\'accueil (réservation 24 h/24, assistance humaine)',
    !!horaires.accueil && horaires.comptoir === horaires.accueil && /Assistance humaine/.test(horaires.comptoir),
    JSON.stringify(horaires));
  /* LE TEXTE BLANC SE LIT SUR LA PHOTO : on cache le texte, on photographie
     ce qu'il y a derrière, et on prend le pixel le PLUS CLAIR de cette zone
     (le pire cas). Mesuré sur les pixels rendus, pas déduit du CSS. */
  const zones = await p.evaluate(() => {
    const t = document.querySelector('#ecran-reception .trajet-tete');
    const els = [...t.querySelectorAll('.rec-hotel, .rec-adresse')].filter(e => e.getBoundingClientRect().height > 0);
    const r = els.map(e => e.getBoundingClientRect());
    const x = Math.min(...r.map(q => q.left)), y = Math.min(...r.map(q => q.top));
    const blanc = els.every(e => /^rgba?\(255, 255, 255/.test(getComputedStyle(e).color));
    t.querySelector('.trajet-corps').style.visibility = 'hidden';
    return { x, y, w: Math.max(...r.map(q => q.right)) - x, h: Math.max(...r.map(q => q.bottom)) - y, blanc };
  });
  const fondPng = (await p.screenshot({ clip: { x: zones.x, y: zones.y, width: zones.w, height: zones.h } })).toString('base64');
  const pire = await p.evaluate(async b64 => {
    const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode();
    const c = document.createElement('canvas'); c.width = i.width; c.height = i.height;
    const g = c.getContext('2d'); g.drawImage(i, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    let max = 0;
    for (let k = 0; k < d.length; k += 4) max = Math.max(max, 0.2126 * lin(d[k]) + 0.7152 * lin(d[k + 1]) + 0.0722 * lin(d[k + 2]));
    document.querySelector('#ecran-reception .trajet-corps').style.visibility = '';
    return max;
  }, fondPng);
  const contraste = 1.05 / (pire + 0.05);
  check('le texte du bandeau est blanc, et se lit sur la photo (≥ 4,5:1 au pixel le plus clair)',
    zones.blanc && contraste >= 4.5, contraste.toFixed(2) + ':1');

  /* Le nom et le téléphone sur la carte : en noir et en gras, plus en gris. */
  const qui = await p.locator('.rec-qui').first().evaluate(e => {
    const s = getComputedStyle(e); return { taille:parseFloat(s.fontSize), gras:Number(s.fontWeight), couleur:s.color };
  });
  check('sur chaque carte, le client est écrit en gros et en gras', qui.taille >= 15 && qui.gras >= 700, JSON.stringify(qui));

  /* ---- LE BON AFFICHÉ ---- */
  const carte = ref => p.locator('.rec-course').filter({ hasText:ref }).first();
  await carte('ELA-26-10-AVEN1').locator('button', { hasText:'Voir le bon' }).click({ timeout:3000 }).catch(() => {});
  const bon = p.locator('#bonClient .ebon');
  await bon.waitFor({ timeout:3000 }).catch(() => {});
  check('« Voir le bon » ouvre le bon', await bon.isVisible());
  const tailleNom = await bon.locator('.ebon-nom').evaluate(e => parseFloat(getComputedStyle(e).fontSize)).catch(() => 0);
  const tailleTel = await bon.locator('.ebon-tel').evaluate(e => parseFloat(getComputedStyle(e).fontSize)).catch(() => 0);
  check('le nom du client, en gros', (await bon.locator('.ebon-nom').textContent().catch(() => '')) === 'Mr John Smith' && tailleNom >= 22, tailleNom + ' px');
  check('son numéro, en gros, cliquable',
    (await bon.locator('.ebon-tel').textContent().catch(() => '')) === '+44 7412 345678' && tailleTel >= 20
    && /^tel:\+447412345678$/.test(await bon.locator('.ebon-tel').getAttribute('href').catch(() => '')), tailleTel + ' px');
  check('en attente, le prix est « annoncé », jamais « ferme » (CGV art. 3 et 4)',
    /Prix annoncé/.test(await bon.textContent()) && !/Prix ferme/.test(await bon.textContent()));
  check('le bon dit que la confirmation vient d\'Elatransfer',
    /La confirmation vous sera envoyée par Elatransfer/.test(await bon.textContent()));
  /* « Une question » : le numéro EN CLAIR (sur un PC le client lit l'écran,
     il ne clique pas), et les canaux à côté — pas le seul téléphone. */
  const contact = bon.locator('.ebon-contact');
  check('le bon écrit le numéro d\'Elatransfer en clair, en gros',
    (await contact.locator('.ebon-contact-num').textContent().catch(() => '')) === '+33 7 59 31 24 33'
    && (await contact.locator('.ebon-contact-num').evaluate(e => parseFloat(getComputedStyle(e).fontSize)).catch(() => 0)) >= 20);
  const horairesBon = await contact.locator('.ebon-contact-horaires').textContent().catch(() => '');
  check('sous le numéro, le bon dit quand quelqu\'un décroche (assistance humaine de 7 h à 22 h)',
    /^Assistance humaine de 7\s?h à 22\s?h$/.test(horairesBon), horairesBon);
  /* SUR LE PC DE LA RÉCEPTION, LE BON N'A PLUS DE BOUTONS (21/10/2026) :
     un PC ne compose pas, et WhatsApp ou Telegram y ouvriraient le compte de
     quelqu'un. Le numéro et l'identifiant sont ÉCRITS : le client les
     recopie sur son téléphone. Les liens restent dans la page (tablette). */
  check('sur un PC, ni Appeler, ni WhatsApp, ni Telegram en bouton : tout est écrit',
    await contact.locator('a.ebon-canal.tel').isHidden()
    && await contact.locator('a.ebon-canal.wa').isHidden()
    && await contact.locator('a.ebon-canal.tg').isHidden()
    && /Appel, WhatsApp/.test(await contact.locator('.ebon-contact-canaux').textContent().catch(() => '')));
  check('…l\'identifiant Telegram écrit en clair, et les liens toujours justes',
    /Telegram @elatransfer/.test(await contact.locator('.ebon-contact-canaux').textContent().catch(() => ''))
    && (await contact.locator('a.ebon-canal.tel').getAttribute('href').catch(() => '')) === 'tel:+33759312433'
    && (await contact.locator('a.ebon-canal.tg').getAttribute('href').catch(() => '')) === 'https://t.me/elatransfer');
  /* L'en-tête collant de la page passait PAR-DESSUS la fenêtre : FR/EN et
     « Fermer » ne recevaient plus le clic. On mesure ce que reçoit le doigt. */
  const recoit = await p.evaluate(() => ['.ebon-langues button[data-langue="en"]', '#bonClientFermer'].map(s => {
    const e = document.querySelector(s); const r = e.getBoundingClientRect();
    const sous = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!sous && (sous === e || e.contains(sous));
  }));
  check('FR/EN et « Fermer » reçoivent vraiment le clic (rien par-dessus)', recoit.every(Boolean), JSON.stringify(recoit));
  await p.locator('.ebon-langues button[data-langue="en"]').click({ timeout:3000 }).catch(() => {});
  check('EN traduit le bon', /Booking voucher/.test(await bon.textContent()) && /Quoted price/.test(await bon.textContent()));
  const libellesRec = await p.locator('#bonClient .ebon-lignes dt').allTextContents();
  await p.locator('.ebon-langues button[data-langue="fr"]').click({ timeout:3000 }).catch(() => {});
  const libellesRecFr = await p.locator('#bonClient .ebon-lignes dt').allTextContents();
  await p.keyboard.press('Escape');
  check('Échap referme le bon', await p.locator('#bonClient').isHidden());

  await carte('ELA-26-10-AVEN2').locator('button', { hasText:'Voir le bon' }).click({ timeout:3000 }).catch(() => {});
  check('confirmée : « Prix ferme » et le chauffeur',
    /Prix ferme/.test(await bon.textContent()) && /Mehmet/.test(await bon.textContent()));
  await p.locator('#bonClientFermer').click({ timeout:3000 }).catch(() => {});

  /* ---- L'HISTORIQUE, LE PLUS RÉCENT EN HAUT ---- */
  await p.click('.rec-vues button[data-vue="passees"]', { timeout:3000 }).catch(() => {});
  await p.waitForTimeout(200);
  const ordre = await p.locator('#recListe .rec-course').evaluateAll(els => els.map(e => e.dataset.ref));
  check('l\'historique va du plus récent au plus ancien, heure comprise',
    JSON.stringify(ordre) === JSON.stringify(['ELA-26-10-SOIR1', 'ELA-26-10-MATIN', 'ELA-26-10-VEILL']), JSON.stringify(ordre));
  check('« Actualiser » est juste au-dessus de la liste',
    await p.evaluate(() => {
      const a = document.getElementById('btnRecActualiser').getBoundingClientRect();
      const l = document.getElementById('recListe').getBoundingClientRect();
      return a.bottom <= l.top && l.top - a.bottom < 120;
    }));
  check('une course non prise n\'a pas de bon à montrer',
    await carte('ELA-26-10-VEILL').locator('button').count() === 0);
  await carte('ELA-26-10-SOIR1').locator('button', { hasText:'Voir le bon' }).click({ timeout:3000 }).catch(() => {});
  check('le bon d\'une course effectuée ne porte aucun prix',
    await p.locator('#bonClient .ebon-prix').count() === 0 && !/€/.test(await bon.textContent()));
  await p.locator('#bonClientFermer').click({ timeout:3000 }).catch(() => {});
  await ctx.close();

  /* ---------------------------------------------------------------
     2. LE MÊME BON CHEZ BARBAROS (/ela-admin/)
     --------------------------------------------------------------- */
  const ctxA = await nav.newContext({ viewport:{ width:1366, height:768 }, locale:'fr-FR', timezoneId:'Europe/Paris' });
  await ctxA.addInitScript(() => {
    localStorage.setItem('ela_nuage_session', JSON.stringify({ access_token:'JETON', refresh_token:'R' }));
  });
  const BON = { ref:'ELA-26-10-AVEN1', statut:'attente', version:1, cree:new Date().toISOString(),
    course:{ depart:'easyHotel Aéroville, 10 rue de la Belle Borne (ch. 214)', departPublic:'easyHotel Aéroville, 10 rue de la Belle Borne',
      arrivee:'Orly 1 — Aéroport de Paris-Orly', date:DEMAIN, heure:'09:00', vehicule:'Berline', chambre:'214' },
    client:{ nom:'Mr John Smith', telephone:'+44 7412 345678' }, prix:{ total:90 }, paiementNom:'Carte bancaire', langue:'fr' };
  await ctxA.route('**/*', r => {
    const req = r.request(), u = req.url();
    if (u.startsWith(BASE)) return r.continue();
    if (!u.includes('supabase.co')) return r.abort();
    if (u.includes('/rpc/est_exploitant') || u.includes('/rpc/est_admin')) return r.fulfill(J(true));
    if (u.includes('/rpc/role_operateur')) return r.fulfill(J('admin'));
    if (u.includes('/rpc/') || u.includes('/functions/v1/')) return r.fulfill(J([]));
    if (u.includes('/rest/v1/courses')) {
      if (u.includes('select=ref')) return r.fulfill(J([{ ref:BON.ref, version:1, modifie_le:'2026-10-05T10:00:00Z' }]));
      if (req.method() === 'GET') return r.fulfill(J([{ bon:BON, statut:BON.statut, version:1, modifie_le:'2026-10-05T10:00:00Z', cree_le:BON.cree }]));
      return r.fulfill(J([{ version:1 }]));
    }
    return r.fulfill(J([]));
  });
  const a = await ctxA.newPage();
  a.on('pageerror', e => erreurs.push('admin: ' + e.message.split('\n')[0]));
  await a.goto(BASE + '/ela-admin/?ref=' + BON.ref);
  await a.waitForFunction(() => document.getElementById('ecran-bord-bon')?.classList.contains('actif'), null, { timeout:15000 }).catch(() => {});
  check('l\'admin porte « Voir le bon du client » sur la fiche', await a.locator('#btnBbVoirBon').isVisible());
  await a.click('#btnBbVoirBon', { timeout:3000 }).catch(() => {});
  const bonA = a.locator('#bonClient .ebon');
  check('…qui ouvre le MÊME bon que la réception (même dessin)', await bonA.isVisible());
  check('avec le même client, en tête',
    (await bonA.locator('.ebon-nom').textContent().catch(() => '')) === 'Mr John Smith'
    && (await bonA.locator('.ebon-tel').textContent().catch(() => '')) === '+44 7412 345678'
    && /Chambre 214/.test(await bonA.textContent().catch(() => '')));
  const libellesAdmin = await a.locator('#bonClient .ebon-lignes dt').allTextContents();
  check('les mêmes lignes, dans le même ordre, que chez la réception',
    JSON.stringify(libellesAdmin) === JSON.stringify(libellesRecFr), JSON.stringify(libellesAdmin) + ' / ' + JSON.stringify(libellesRecFr));
  check('…et la même adresse, sans la chambre recopiée dedans',
    /easyHotel Aéroville, 10 rue de la Belle Borne$/m.test(await bonA.locator('.ebon-lignes').innerText().catch(() => ''))
    && !/\(ch\./.test(await bonA.textContent().catch(() => '')));
  check('le bon anglais existe aussi côté réception (libellés traduits)', libellesRec.length === libellesRecFr.length && libellesRec[0] !== libellesRecFr[0]);
  /* Le retrait ne vaut que pour la RÉCEPTION : chez Barbaros, le même bon
     garde son bouton WhatsApp. */
  check('chez Barbaros, le bon garde son bouton WhatsApp (le retrait ne vise que la réception)',
    await bonA.locator('a.ebon-canal.wa').isVisible().catch(() => false));
  await ctxA.close();

  /* ---------------------------------------------------------------
     1 bis. LA TABLETTE D'UN COMPTOIR, AU DOIGT, GARDE WHATSAPP
     WhatsApp y fonctionne : « ordinateur » veut dire écran large ET souris.
     --------------------------------------------------------------- */
  const ctxT = await nav.newContext({ viewport:{ width:1024, height:768 }, isMobile:true, hasTouch:true, locale:'fr-FR', timezoneId:'Europe/Paris' });
  await ctxT.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(BASE)) return r.continue();
    if (u.includes('/functions/v1/courses-hotel'))
      return r.fulfill(J({ hotel:'easyhotel-aeroville', courses:LISTE, session:'s.sig', expire:Date.now() + 864e5 }));
    return r.abort();
  });
  const t = await ctxT.newPage();
  t.on('pageerror', e => erreurs.push('tablette: ' + e.message.split('\n')[0]));
  await t.goto(BASE + '/reception/easyhotel-aeroville/', { waitUntil:'domcontentloaded' });
  await t.waitForTimeout(700);
  await t.fill('#recCode', 'code-de-test');
  await t.click('#btnRecEntrer');
  await t.waitForSelector('#recListe .rec-course', { timeout:8000 }).catch(() => {});
  check('sur une tablette (au doigt), « Un imprévu ? » garde son bouton WhatsApp',
    await t.locator('#recAideWa').isVisible() && /wa\.me/.test(await t.locator('#recAideWa').getAttribute('href')));
  await t.locator('.rec-course').first().locator('button', { hasText:'Voir le bon' }).click({ timeout:3000 }).catch(() => {});
  check('…et le bon garde ses boutons Appeler, WhatsApp et Telegram',
    await t.locator('#bonClient a.ebon-canal.tel').isVisible().catch(() => false)
    && await t.locator('#bonClient a.ebon-canal.wa').isVisible().catch(() => false)
    && await t.locator('#bonClient a.ebon-canal.tg').isVisible().catch(() => false));
  await t.keyboard.press('Escape');
  /* La réception n'a pas de barre du bas (« reception-premium ») : elle ne
     réserve donc plus 80 px de vide sous la page, sur aucun écran. */
  check('la réception, sans barre, ne réserve plus de place vide sous la page',
    await t.evaluate(() => getComputedStyle(document.body).paddingBottom) === '0px');
  await ctxT.close();

  /* ---------------------------------------------------------------
     3. LES PAGES PUBLIQUES NE CHARGENT PAS CE BON
     --------------------------------------------------------------- */
  const ctxP = await nav.newContext();
  await ctxP.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
  const pp = await ctxP.newPage();
  for (const chemin of ['/', '/application.html']) {
    await pp.goto(BASE + chemin, { waitUntil:'domcontentloaded' });
    check('page publique ' + chemin + ' : pas de bon de comptoir chargé',
      await pp.evaluate(() => typeof window.ELA_BON === 'undefined'));
  }
  /* La photo du comptoir est au COMPTOIR seulement : la page des clients de
     l'hôtel ne la demande pas. */
  const demandees = [];
  pp.on('request', r => { if (r.url().includes('easyhotel-aeroville-reception')) demandees.push(r.url()); });
  await pp.goto(BASE + '/application.html?h=easyhotel-aeroville', { waitUntil:'networkidle' });
  check('la page client de l\'hôtel ne charge pas la photo du comptoir', demandees.length === 0, demandees.join(' '));
  await ctxP.close();

  /* Sur un téléphone, le texte du bandeau prend toute la largeur : l'aplat
     reste, sans photo. */
  const ctxM = await nav.newContext({ viewport:{ width:390, height:844 }, locale:'fr-FR', timezoneId:'Europe/Paris' });
  await ctxM.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(BASE)) return r.continue();
    if (u.includes('/functions/v1/courses-hotel'))
      return r.fulfill(J({ hotel:'easyhotel-aeroville', courses:LISTE, session:'s.sig', expire:Date.now() + 864e5 }));
    return r.abort();
  });
  const m = await ctxM.newPage();
  await m.goto(BASE + '/reception/easyhotel-aeroville/', { waitUntil:'domcontentloaded' });
  await m.waitForTimeout(700);
  await m.fill('#recCode', 'code-de-test'); await m.click('#btnRecEntrer');
  await m.waitForSelector('#recAppelImmediat', { timeout:8000 }).catch(() => {});
  const tuileTel = await m.evaluate(() => { const a = document.getElementById('recAppelImmediat'); const r = a && a.getBoundingClientRect();
    return a ? { texte: a.innerText, dedans: r.right <= window.innerWidth && r.width > 100 } : null; });
  check('sur un téléphone, la tuile dit « Appuyez pour appeler » et tient dans l\'écran',
    tuileTel && /Appuyez pour appeler/.test(tuileTel.texte) && !/\+33/.test(tuileTel.texte) && tuileTel.dedans, JSON.stringify(tuileTel));
  const fondTel = await m.evaluate(() => getComputedStyle(document.querySelector('#ecran-reception .trajet-tete')).backgroundImage);
  check('sur un téléphone, le bandeau du comptoir reste sans photo', !/url\(/.test(fondTel), fondTel.slice(0, 120));
  await ctxM.close();
} finally {
  await nav.close();
  serveur.close();
}
check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));

console.log(`\n=== RÉUSSIS (${ok.length}) ===`);
ok.forEach(x => console.log('  ✔ ' + x));
if (ko.length) {
  console.log(`\n=== ÉCHECS (${ko.length}) ===`);
  ko.forEach(x => console.log('  ✘ ' + x));
  process.exitCode = 1;
}
