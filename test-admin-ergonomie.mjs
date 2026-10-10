/* ═══ L'ADMIN ERGONOMIQUE — 9 octobre 2026 ═══
   Barbaros : « je voudrais pouvoir supprimer une course, ne plus l'afficher,
   rafraîchir, actualiser, retour… rends mon admin logique, ergonomique, mets
   en place course test ». Revue sur le site construit à 390 px : la première
   demande en attente arrivait SOUS le bord de l'écran, la recherche était au
   milieu du registre, supprimer se faisait une course à la fois, et un essai
   se confondait avec une vraie course jusque dans le chiffre d'affaires.

   CE QUE CETTE SUITE VERROUILLE, SUR LE SITE CONSTRUIT :
   · deux outils en tête du tableau de bord, à la hauteur du titre, et pas une
     rangée de plus : la loupe ouvre la recherche et « Sélectionner », et les
     replie (ce qui était tapé s'efface) ; « Actualiser » relit vraiment le
     serveur et écrit l'heure de la lecture dans la sous-ligne ;
   · la recherche instantanée trouve par N° court, par nom, et L'EMPORTE sur le
     filtre d'état — une réalisée trouvée n'est pas titrée « En retard » ;
   · les bandeaux « son coupé » et « sauvegarde » tiennent chacun sur une
     ligne ; le budget de l'écran (la première demande entière à 390 × 844,
     bandeau d'alerte affiché) est tenu par test-admin-voyant, K ;
   · la ligne grise d'une carte dit l'heure seule quand le titre du jour dit
     déjà la date, et la pastille de l'hôtel n'est plus tronquée ;
   · le rappel de sauvegarde tient sur une ligne ;
   · « Sélectionner » puis « Supprimer » : deux appuis, jamais moins de 700 ms,
     un DELETE par course, les cartes et le registre local suivent ;
   · « Course d'essai » : écrite et poussée au serveur, pastille « Essai »,
     et exclue du chiffre d'affaires du registre ;
   · registre : la recherche en tête ; réglages : les notifications en tête ;
     chauffeurs : la liste avant le formulaire ;
   · (10/10) le menu tient en deux rangées — « Nouvelle course » rendue au
     tableau de bord, « Quitter » et « Se déconnecter » dans la barre du haut —,
     le bloc « Équipe » n'apparaît qu'avec un compte agent, et le pire cas
     (trois bandeaux) laisse la première demande dans l'écran.
   Même montage que test-admin-cloture.mjs (faux serveur, 390×844).
   Lancer :  node test-admin-ergonomie.mjs */
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
await new Promise(r => serveur.listen(8088, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8088';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });

const paris = min => { const s = new Date(Date.now() + min * 60000).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }); return [s.slice(0, 10), s.slice(11, 16)]; };
const jour = (n, h) => [paris(n * 1440)[0], h];
let num = 1020;
const course = (ref, statut, [date, heure], extra = {}) => Object.assign({ ref, statut, version: 1, numero: ++num,
  cree: new Date(Date.now() - 3600e3).toISOString(),
  course: { depart: '6 Place du Capitaine Chauvelot, 95100 Argenteuil', departPublic: '6 Place du Capitaine Chauvelot, 95100 Argenteuil',
    arrivee: 'Terminal 1 — Aéroport Roissy-Charles-de-Gaulle', date, heure, vehicule: 'Berline', vehiculeCle: 'berline',
    passagers: '2 passagers', vol: '' },
  client: { nom: 'Client ' + ref.slice(-5), telephone: '06 12 34 56 78' }, prix: { total: 70 }, langue: 'fr', paiementNom: 'Carte',
  securite: { empreinteDepot: 'e' } }, extra);
const ALI = { nom: 'Ali Ben', telephone: '06 11 22 33 44' };
/* N° 1021 à 1030, dans cet ordre. Deux réalisées cette semaine (140 €). */
const JEU = [
  course('ELA-26-10-ATT01', 'attente', jour(0, '18:30'), { provenance: 'easyHotel Aéroville', provenanceCle: 'easyhotel-aeroville', client: { nom: 'Sarah Martin', telephone: '06 45 67 89 01' } }),
  course('ELA-26-10-ATT02', 'attente', jour(1, '06:15')),
  course('ELA-26-10-TEST1', 'attente', jour(0, '21:00'), { client: { nom: 'test', telephone: '06 00 00 00 00' } }),
  course('ELA-26-10-FUTUR', 'confirmee', jour(2, '10:00')),
  course('ELA-26-10-AVECC', 'confirmee', jour(3, '11:00'), { chauffeur: { nom: 'Mehmet Yilmaz', telephone: '06 98 76 54 32' } }),
  course('ELA-26-10-PASSE', 'confirmee', jour(-1, '09:00'), { chauffeur: ALI }),
  course('ELA-26-10-FAITE', 'realisee', jour(-2, '08:00'), { chauffeur: ALI }),
  course('ELA-26-10-FACTU', 'realisee', jour(-2, '15:00'), { chauffeur: ALI }),
  course('ELA-26-10-AAA01', 'realisee', jour(-30, '03:20'), { chauffeur: { nom: 'Aaa', telephone: '' }, prix: { total: 90 } }),
  course('ELA-26-10-REFUS', 'refusee', jour(-1, '12:00')),
];
const nav = await chromium.launch();
async function espace(chemin = '/ela-admin/', { presences = [] } = {}) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  await ctx.addInitScript(() => {
    localStorage.setItem('ela_nuage_session', JSON.stringify({ access_token: 'JETON', refresh_token: 'R' }));
    /* Un carnet non sauvegardé : c'est ce qui fait apparaître le rappel. */
    localStorage.setItem('ela_chauffeurs', JSON.stringify([{ id: 'c1', nom: 'Ali Ben', telephone: '06 11 22 33 44', carteFin: '2027-01-01', registreFin: '2027-01-01', assuranceFin: '2027-01-01' }]));
    window.open = () => null;
  });
  const donnees = JSON.parse(JSON.stringify(JEU));
  const journal = { lectures: 0, suppressions: [], ecritures: [] };
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url(), m = req.method();
    if (u.startsWith(BASE)) return route.continue();
    if (!u.includes('supabase.co')) return route.abort();
    if (u.includes('/rpc/est_exploitant') || u.includes('/rpc/est_admin')) return route.fulfill(J(true));
    if (u.includes('/rpc/role_operateur')) return route.fulfill(J('admin'));
    if (u.includes('/rpc/presences_operateurs')) return route.fulfill(J(presences));
    if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J({ ok: true }));
    if (u.includes('/auth/v1/')) return route.fulfill(J({ access_token: 'JETON2', refresh_token: 'R2', email: 'test@ela.fr' }));
    if (u.includes('/rest/v1/courses')) {
      const ref = decodeURIComponent((u.match(/ref=eq\.([^&]+)/) || [])[1] || '');
      if (m === 'DELETE') { journal.suppressions.push(ref); const i = donnees.findIndex(c => c.ref === ref); if (i >= 0) donnees.splice(i, 1); return route.fulfill(J([{ ref }])); }
      if (u.includes('select=ref')) return route.fulfill(J(donnees.slice(0, 1).map(c => ({ ref: c.ref, version: c.version, modifie_le: '2026-10-03T10:00:00Z' }))));
      if (m === 'GET') { journal.lectures++; return route.fulfill(J(donnees.map(c => ({ bon: c, statut: c.statut, version: c.version, modifie_le: '2026-10-03T10:00:00Z', cree_le: c.cree })))); }
      let corps = {}; try { corps = JSON.parse(req.postData() || '{}'); } catch {}
      if (Array.isArray(corps)) corps = corps[0] || {};
      journal.ecritures.push({ methode: m, ref: ref || corps.ref, statut: corps.statut, bon: corps.bon });
      const c = donnees.find(x => x.ref === (ref || corps.ref));
      if (m === 'PATCH' && c) { Object.assign(c, corps.bon || {}, { statut: corps.statut || c.statut }); c.version++; return route.fulfill(J([{ version: c.version, cree_le: c.cree }])); }
      return route.fulfill(J([{ version: 1, cree_le: new Date().toISOString() }]));
    }
    return route.fulfill(J([]));
  });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + chemin);
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 15000 });
  await p.waitForTimeout(800);
  return { ctx, p, journal, erreurs, donnees };
}
const refsVisibles = p => p.$$eval('#listeBord .demande', l => l.map(e => e.dataset.ref));
const vis = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return !!e && !e.hidden && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0; }, sel);

try {
  /* 1. LE TABLEAU DE BORD : Actualiser, recherche, carte, bandeau. */
  {
    const { ctx, p, journal, erreurs } = await espace();
    check('le tableau de bord porte la loupe et « Actualiser » en tête, et la recherche est repliée',
      await vis(p, '#btnBordRecherche') && await vis(p, '#btnBordActualiser') && !(await vis(p, '#bordRecherche')) && !(await vis(p, '#btnBordSelection')));
    const tete = await p.locator('.admin-tete').boundingBox();
    check('les deux outils ne font pas grandir le bandeau du titre (42 px ou moins)', tete && tete.height <= 42, tete && Math.round(tete.height) + ' px');
    const son = await p.locator('#sonCoupe').boundingBox();
    check('« Son des alertes coupé » tient sur une ligne (40 px ou moins)', son && son.height <= 40, son && Math.round(son.height) + ' px');
    const avant = journal.lectures;
    await p.click('#btnBordActualiser');
    await p.waitForTimeout(900);
    check('« Actualiser » relit vraiment le serveur', journal.lectures > avant, `${journal.lectures - avant} lecture(s)`);
    check('…et dit l\'heure de la lecture', /^À jour · \d{2}:\d{2}$/.test((await p.textContent('#bordActualiseTexte')).trim()), await p.textContent('#bordActualiseTexte'));

    check('sans recherche, la liste est celle du filtre « en attente » (3)', (await refsVisibles(p)).length === 3, String((await refsVisibles(p)).length));
    await p.click('#btnBordRecherche'); await p.waitForTimeout(200);
    check('la loupe ouvre la recherche et « Sélectionner », le curseur dans le champ',
      await vis(p, '#bordRecherche') && await vis(p, '#btnBordSelection') && await p.evaluate(() => document.activeElement && document.activeElement.id === 'bordRecherche'));
    await p.fill('#bordRecherche', '1023'); await p.waitForTimeout(300);
    check('« 1023 » trouve la course par son N° court', JSON.stringify(await refsVisibles(p)) === JSON.stringify(['ELA-26-10-TEST1']), JSON.stringify(await refsVisibles(p)));
    await p.fill('#bordRecherche', 'sarah'); await p.waitForTimeout(300);
    check('« sarah » trouve la course par le nom du client', JSON.stringify(await refsVisibles(p)) === JSON.stringify(['ELA-26-10-ATT01']), JSON.stringify(await refsVisibles(p)));
    await p.fill('#bordRecherche', '1027'); await p.waitForTimeout(300);
    check('la recherche L\'EMPORTE sur le filtre : une réalisée se trouve depuis « en attente »', JSON.stringify(await refsVisibles(p)) === JSON.stringify(['ELA-26-10-FAITE']), JSON.stringify(await refsVisibles(p)));
    const titre = await p.textContent('#listeBord .jour-titre');
    check('…et une réalisée d\'avant-hier n\'est pas titrée « En retard »', titre && titre.trim() !== 'En retard', titre);
    await p.fill('#bordRecherche', 'zzzz'); await p.waitForTimeout(300);
    check('rien trouvé : la liste le dit, avec ce qui a été tapé', /Aucune course ne correspond à « zzzz »/.test(await p.textContent('#videBord')), (await p.textContent('#videBord')).trim());
    await p.fill('#bordRecherche', ''); await p.dispatchEvent('#bordRecherche', 'input'); await p.waitForTimeout(300);
    check('recherche vidée : la liste du filtre revient (3)', (await refsVisibles(p)).length === 3, String((await refsVisibles(p)).length));
    await p.fill('#bordRecherche', '1027'); await p.waitForTimeout(300);
    await p.click('#btnBordRechercheFermer'); await p.waitForTimeout(300);
    check('replier la recherche efface ce qui était tapé : la liste du filtre revient (3)',
      !(await vis(p, '#bordRecherche')) && (await refsVisibles(p)).length === 3 && !(await p.evaluate(() => document.getElementById('btnBordRecherche').classList.contains('actif'))), String((await refsVisibles(p)).length));

    const gris = await p.textContent('#listeBord .demande[data-ref="ELA-26-10-ATT01"] .d-gris');
    check('sous « Aujourd\'hui », la ligne grise dit l\'heure seule, pas la date', /18:30/.test(gris) && !/\/20\d\d/.test(gris), gris.trim());
    const prov = await p.evaluate(() => { const e = document.querySelector('#listeBord .demande[data-ref="ELA-26-10-ATT01"] .d-prov'); return e ? { t: e.textContent, tronque: e.scrollWidth > e.clientWidth + 1 } : null; });
    check('la pastille de l\'hôtel n\'est plus tronquée (« easyHotel » lisible)', prov && !prov.tronque && /easyHotel/.test(prov.t), JSON.stringify(prov));
    const sauv = await p.locator('#bordSauvegarde').boundingBox();
    check('le rappel de sauvegarde tient sur une ligne (moins de 80 px)', sauv && sauv.height < 80, sauv && Math.round(sauv.height) + ' px');
    check('aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
    await ctx.close();
  }

  /* 2. SÉLECTIONNER, PUIS SUPPRIMER PLUSIEURS COURSES D'UN COUP. */
  {
    const { ctx, p, journal, erreurs } = await espace();
    await p.click('#btnBordRecherche'); await p.waitForTimeout(200);
    await p.click('#btnBordSelection'); await p.waitForTimeout(300);
    check('« Sélectionner » met la liste en mode sélection', await p.evaluate(() => document.getElementById('listeBord').classList.contains('liste-selection')));
    check('…et masque « Appeler » sur les cartes', !(await vis(p, '#listeBord .demande .d-appeler')));
    await p.locator('#listeBord .demande[data-ref="ELA-26-10-TEST1"]').click();
    await p.locator('#listeBord .demande[data-ref="ELA-26-10-ATT02"]').click();
    await p.waitForTimeout(300);
    check('toucher deux cartes les sélectionne sans ouvrir de fiche', /2 courses sélectionnées/.test(await p.textContent('#bordSelectionTexte')) && !(await p.evaluate(() => document.getElementById('ecran-bord-bon').classList.contains('actif'))), (await p.textContent('#bordSelectionTexte')).trim());
    await p.click('#btnBordSupprimerSel'); await p.waitForTimeout(150);
    check('un premier appui n\'efface RIEN, il demande confirmation', journal.suppressions.length === 0 && /^Confirmer la suppression \(2\)/.test((await p.textContent('#btnBordSupprimerSel')).trim()), (await p.textContent('#btnBordSupprimerSel')).trim());
    await p.click('#btnBordSupprimerSel'); await p.waitForTimeout(150);
    check('un second appui à moins de 700 ms ne compte pas', journal.suppressions.length === 0, String(journal.suppressions.length));
    await p.waitForTimeout(700);
    await p.click('#btnBordSupprimerSel'); await p.waitForTimeout(900);
    check('le second appui efface les deux : un DELETE par course', JSON.stringify(journal.suppressions.slice().sort()) === JSON.stringify(['ELA-26-10-ATT02', 'ELA-26-10-TEST1']), JSON.stringify(journal.suppressions));
    const locales = await p.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings') || '[]').map(c => c.ref));
    check('…et le registre de l\'appareil ne les a plus', !locales.includes('ELA-26-10-TEST1') && !locales.includes('ELA-26-10-ATT02') && locales.includes('ELA-26-10-ATT01'), locales.join(','));
    check('la liste ne les montre plus, et le mode sélection se referme', JSON.stringify(await refsVisibles(p)) === JSON.stringify(['ELA-26-10-ATT01']) && !(await p.evaluate(() => document.getElementById('listeBord').classList.contains('liste-selection'))), JSON.stringify(await refsVisibles(p)));
    check('l\'écran dit ce qui a été fait', /2 courses supprimées/.test(await p.textContent('#bordSelectionEtat')), (await p.textContent('#bordSelectionEtat')).trim());
    check('aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
    await ctx.close();
  }

  /* 3. LA COURSE D'ESSAI : écrite, poussée, marquée, et hors des chiffres. */
  {
    const { ctx, p, journal, erreurs } = await espace('/ela-admin/?ref=ELA-26-10-FAITE');
    await p.waitForFunction(() => document.getElementById('ecran-bord-bon').classList.contains('actif'), null, { timeout: 8000 }).catch(() => {});
    check('la fiche porte l\'interrupteur « Course d\'essai », éteint', await vis(p, '#bbEssai') && !(await p.isChecked('#bbEssai')));
    await p.click('#btnRegistre'); await p.waitForTimeout(500);
    const lire = async () => parseFloat((await p.textContent('#regCA')).replace(/[^\d,]/g, '').replace(',', '.'));
    const avant = await lire();
    check('avant : les deux réalisées de la semaine comptent (140 €)', avant === 140, String(avant));
    await p.click('#btnRetourRegistre'); await p.waitForTimeout(300);
    await p.click('#btnBordRecherche'); await p.waitForTimeout(200);
    await p.fill('#bordRecherche', '1027'); await p.waitForTimeout(300);
    await p.locator('#listeBord .demande[data-ref="ELA-26-10-FAITE"]').click();
    await p.waitForFunction(() => document.getElementById('ecran-bord-bon').classList.contains('actif'), null, { timeout: 8000 }).catch(() => {});
    await p.check('#bbEssai'); await p.waitForTimeout(600);
    const ecrit = journal.ecritures.filter(e => e.ref === 'ELA-26-10-FAITE' && e.bon && e.bon.essai === true);
    check('cocher « Course d\'essai » écrit la course et la pousse au serveur avec essai=true', ecrit.length >= 1, JSON.stringify(journal.ecritures.map(e => e.ref + ':' + (e.bon && e.bon.essai))));
    await p.click('#btnRetourBord'); await p.waitForTimeout(400);
    const pastille = await p.textContent('#listeBord .demande[data-ref="ELA-26-10-FAITE"] .d-drapeau.essai').catch(() => '');
    check('la carte porte la pastille « Essai »', (pastille || '').trim() === 'Essai', pastille);
    await p.click('#btnRegistre'); await p.waitForTimeout(500);
    const apres = await lire();
    check('après : l\'essai est sorti du chiffre d\'affaires (70 €)', apres === 70, String(apres));
    check('aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
    await ctx.close();
  }

  /* 4. LA PLACE DES CHOSES : ce qu'on cherche d'abord est en tête. */
  {
    const { ctx, p } = await espace();
    const ordre = await p.evaluate(() => {
      const premierBloc = ecran => { const e = document.getElementById(ecran); return e ? e.querySelector('.bloc') : null; };
      const r = premierBloc('ecran-registre'), g = premierBloc('ecran-reglages');
      const liste = document.getElementById('chListe'), titreForm = document.getElementById('chTitreForm');
      return {
        registre: !!(r && r.querySelector('#regRecherche')),
        reglages: !!(g && g.id === 'blocPushAdmin'),
        chauffeurs: !!(liste && titreForm && (liste.compareDocumentPosition(titreForm) & Node.DOCUMENT_POSITION_FOLLOWING)),
      };
    });
    check('registre : la recherche est le premier bloc', ordre.registre);
    check('réglages : « Notifications ELA » est le premier bloc', ordre.reglages);
    check('chauffeurs : la liste précède le formulaire', ordre.chauffeurs);
    await ctx.close();
  }

  /* 4. LE MENU EN DEUX RANGÉES, ET « ÉQUIPE » SEULEMENT S'IL Y A UNE ÉQUIPE
     (10/10/2026, Barbaros : « Corrige tout »). Avant : onze tuiles sur trois
     rangées plus un bloc « Agent réservation : hors ligne » — 357 px de menu
     pour un homme qui travaille seul. Ce qu'on verrouille : la forme du menu
     (deux rangées, « Nouvelle course » rendue au tableau de bord, « Quitter »
     et « Se déconnecter » dans la barre du haut, hors de la grille, assez
     grands pour un pouce), l'absence du bloc sans agent, sa présence avec,
     et LE PIRE CAS MESURÉ : son coupé, rappel de sauvegarde et « sans
     chauffeur » affichés tous les trois, la première demande en attente finit
     dans l'écran. Hier elle finissait à 923 px. */
  {
    const { ctx, p } = await espace();
    await p.evaluate(() => Promise.all(document.getAnimations()
      .filter(a => a.effect && a.effect.getComputedTiming().endTime !== Infinity)
      .map(a => a.finished.catch(() => {}))));
    const tuiles = await p.evaluate(() => [...document.querySelectorAll('.admin-liens .admin-lien')]
      .filter(b => b.offsetParent !== null).map(b => ({ id: b.id, top: Math.round(b.getBoundingClientRect().top) })));
    const rangees = new Set(tuiles.map(t => t.top)).size;
    check('le menu tient en deux rangées de tuiles à 390 px', rangees === 2 && tuiles.length >= 6, `${tuiles.length} tuiles sur ${rangees} rangée(s)`);
    check('« Nouvelle course » n\'est plus une tuile : elle vit sous le titre (« Saisir par téléphone »)',
      !tuiles.some(t => t.id === 'btnCreerNav') && await vis(p, '#btnSaisirCourse'));
    const sortie = await p.evaluate(() => {
      const liens = document.querySelector('.admin-liens').getBoundingClientRect();
      return ['btnQuitter', 'btnDeconnexionNav'].map(id => {
        const e = document.getElementById(id);
        if (!e) return { id, absent: true };
        const r = e.getBoundingClientRect();
        return { id, texte: e.textContent.trim(), visible: e.offsetParent !== null, dansGrille: !!e.closest('.admin-liens'),
          bas: Math.round(r.bottom), hautGrille: Math.round(liens.top), h: Math.round(r.height), l: Math.round(r.width),
          tronque: e.scrollWidth > e.clientWidth + 1 };
      });
    });
    for (const s of sortie) {
      check(`« ${s.texte || s.id} » est un lien de la barre du haut : visible, au-dessus des tuiles, hors de la grille`,
        !s.absent && s.visible && !s.dansGrille && s.bas <= s.hautGrille, JSON.stringify(s));
      check(`« ${s.texte || s.id} » se presse (34 px de haut, 44 de large au moins) et se lit en entier`,
        !s.absent && s.h >= 34 && s.l >= 44 && !s.tronque, s.absent ? 'absent' : `${s.l} × ${s.h} px`);
    }
    check('sans compte agent, le bloc « Équipe » ne s\'affiche pas', !(await vis(p, '#presenceEquipe')));
    const bandeaux = { son: await vis(p, '#sonCoupe'), sauvegarde: await vis(p, '#bordSauvegarde'), sansChauffeur: await vis(p, '#bordSansChauffeur') };
    check('le pire cas est posé : son coupé, rappel de sauvegarde et « sans chauffeur » affichés tous les trois',
      bandeaux.son && bandeaux.sauvegarde && bandeaux.sansChauffeur, JSON.stringify(bandeaux));
    const carte = await p.evaluate(() => { const e = document.querySelector('#listeBord .demande.attente'); const r = e && e.getBoundingClientRect(); return r ? { bas: Math.round(r.bottom), vue: innerHeight } : null; });
    check('…et la première demande en attente finit dans l\'écran, sans défiler', !!carte && carte.bas <= carte.vue, carte ? `${carte.bas} px sur ${carte.vue}` : 'aucune carte');
    await ctx.close();
  }
  {
    const { ctx, p } = await espace('/ela-admin/', { presences: [{ role: 'admin', en_ligne: true }, { role: 'agent_reservation', en_ligne: true }] });
    await p.waitForTimeout(400);
    const t = await p.evaluate(() => { const e = document.getElementById('presenceEquipe'); return e && e.offsetParent !== null ? e.textContent.replace(/\s+/g, ' ').trim() : ''; });
    check('avec un compte agent, le bloc « Équipe » revient et dit s\'il est en ligne', /Équipe/.test(t) && /Agent réservation : en ligne/.test(t), t || 'absent');
    await ctx.close();
  }
} catch (e) {
  ko.push('la suite a planté : ' + (e && e.message ? e.message.split('\n')[0] : e));
} finally {
  await nav.close(); serveur.close();
}
ok.forEach(l => console.log('  ✓ ' + l));
if (ko.length) { console.log(`=== ÉCHECS (${ko.length}) ===`); ko.forEach(l => console.log('  ✗ ' + l)); process.exit(1); }
console.log(`=== ${ok.length} contrôles au vert ===`);
