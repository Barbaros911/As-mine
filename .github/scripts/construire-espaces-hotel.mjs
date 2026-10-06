import fs from 'node:fs';
import path from 'node:path';

const sourcePath = process.argv[2] || 'site/index.html';
const sortie = process.argv[3] || 'site';
const source = fs.readFileSync(sourcePath, 'utf8');

function retirerElementParId(html, tag, id) {
  const ouverture = new RegExp(`<${tag}\\b[^>]*\\bid=["']${id}["'][^>]*>`, 'i');
  const trouve = ouverture.exec(html);
  if (!trouve) return html;
  const depart = trouve.index;
  const balises = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'ig');
  balises.lastIndex = depart;
  let profondeur = 0;
  let m;
  while ((m = balises.exec(html))) {
    if (m[0].startsWith('</')) profondeur -= 1;
    else profondeur += 1;
    if (profondeur === 0) return html.slice(0, depart) + html.slice(balises.lastIndex);
  }
  throw new Error(`balise fermante introuvable pour #${id}`);
}

function retirerElementParClasse(html, tag, classe) {
  const ouverture = new RegExp(`<${tag}\\b[^>]*\\bclass=["'][^"']*\\b${classe}\\b[^"']*["'][^>]*>`, 'i');
  const trouve = ouverture.exec(html);
  if (!trouve) return html;
  const depart = trouve.index;
  const balises = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'ig');
  balises.lastIndex = depart;
  let profondeur = 0;
  let m;
  while ((m = balises.exec(html))) {
    if (m[0].startsWith('</')) profondeur -= 1;
    else profondeur += 1;
    if (profondeur === 0) return html.slice(0, depart) + html.slice(balises.lastIndex);
  }
  throw new Error(`balise fermante introuvable pour ${tag}.${classe}`);
}

function retirerNavigationAdmin(html) {
  const m = /<nav\b[^>]*class=["'][^"']*\badmin-nav\b[^"']*["'][^>]*>/i.exec(html);
  if (!m) throw new Error('navigation Admin introuvable');
  const balises = /<nav\b[^>]*>|<\/nav>/ig;
  balises.lastIndex = m.index;
  let profondeur = 0;
  let n;
  while ((n = balises.exec(html))) {
    if (n[0].startsWith('</')) profondeur -= 1;
    else profondeur += 1;
    if (profondeur === 0) return html.slice(0, m.index) + html.slice(balises.lastIndex);
  }
  throw new Error('fin de navigation Admin introuvable');
}

function retirerScriptsContenant(html, motifs) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (bloc) =>
    motifs.some((motif) => bloc.includes(motif)) ? '' : bloc);
}

function remplacerEntre(html, debut, fin, remplacement = '') {
  const a = html.indexOf(debut);
  if (a < 0) throw new Error(`repère absent : ${debut.slice(0, 70)}`);
  const b = html.indexOf(fin, a + debut.length);
  if (b < 0) throw new Error(`repère de fin absent : ${fin.slice(0, 70)}`);
  return html.slice(0, a) + remplacement + html.slice(b);
}

function remplacerEntreApres(html, apres, debut, fin, remplacement = '') {
  const repere = html.indexOf(apres);
  if (repere < 0) throw new Error(`repère préalable absent : ${apres}`);
  const a = html.indexOf(debut, repere);
  if (a < 0) throw new Error(`repère absent après ${apres} : ${debut.slice(0, 70)}`);
  const b = html.indexOf(fin, a + debut.length);
  if (b < 0) throw new Error(`repère de fin absent : ${fin.slice(0, 70)}`);
  return html.slice(0, a) + remplacement + html.slice(b);
}

/* UNE PAGE CACHÉE À GOOGLE NE DÉSIGNE PAS D'ADRESSE CANONIQUE (6 octobre
   2026). Elles héritent de celle de l'accueil : « ne m'indexe pas » et
   « c'est moi, l'adresse de référence de l'accueil » à la fois, deux
   consignes qui se contredisent. Seule la page publique la garde. */
function sansCanonique(html) {
  return html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>\s*/gi, '');
}

const sectionsAdmin = [
  'ecran-verrou', 'ecran-bord', 'ecran-reglages', 'ecran-creer',
  'ecran-registre', 'ecran-chauffeurs', 'ecran-facture', 'ecran-bord-bon',
  'ecran-controle',
];

function sansAdmin() {
  let html = source;
  html = retirerNavigationAdmin(html);
  for (const id of sectionsAdmin) html = retirerElementParId(html, 'section', id);
  html = html.replace(/<script\b[^>]*src=["'](?:intake-demande|qr-affiche|admin-sante|pilotage)\.js["'][^>]*><\/script>\s*/gi, '');
  html = html.replace(/<style\b[^>]*id=["']ela-role-style["'][^>]*>[\s\S]*?<\/style>\s*/gi, '');
  html = retirerScriptsContenant(html, ['nuage.roleOperateur=', 'presencesOperateurs=function']);

  const debutAdmin = '/* =====================================================================\n   L’ESPACE EXPLOITANT';
  const debutAdminAscii = '/* =====================================================================\n   L\'ESPACE EXPLOITANT';
  const repereAdmin = html.includes(debutAdmin) ? debutAdmin : debutAdminAscii;
  const finAdmin = '/* =====================================================================\n   ARRIVÉE PAR L’AFFICHE';
  const finAdminAscii = '/* =====================================================================\n   ARRIVÉE PAR L\'AFFICHE';
  const repereFin = html.includes(finAdmin) ? finAdmin : finAdminAscii;
  html = remplacerEntreApres(html, 'LA BARRE DU BAS', repereAdmin, repereFin,
    '/* Code Admin exclu de ce bundle par construire-espaces-hotel.mjs. */\n\n');

  return html;
}

function sansReception(html) {
  html = retirerElementParId(html, 'section', 'ecran-reception');
  html = html.replace(/<button\b[^>]*id=["']btnReception["'][^>]*>[\s\S]*?<\/button>\s*/i, '');
  const debutReception = '/* =====================================================================\n   L’ESPACE DE LA RÉCEPTION';
  const debutReceptionAscii = '/* =====================================================================\n   L\'ESPACE DE LA RÉCEPTION';
  const repere = html.includes(debutReception) ? debutReception : debutReceptionAscii;
  const fin = '  /* ═══ L’ENTRÉE ═══';
  const finAscii = '  /* ═══ L\'ENTRÉE ═══';
  const repereFin = html.includes(fin) ? fin : finAscii;
  html = remplacerEntre(html, repere, repereFin,
    '  /* La page Client ne charge aucune logique de Réception. */\n  var recHotel = null;\n\n');

  const debutApi = '    /* ═══ LES COURSES D’UN HÔTEL PARTENAIRE, POUR SA RÉCEPTION ═══';
  const debutApiAscii = '    /* ═══ LES COURSES D\'UN HÔTEL PARTENAIRE, POUR SA RÉCEPTION ═══';
  const repereApi = html.includes(debutApi) ? debutApi : debutApiAscii;
  html = remplacerEntre(html, repereApi, '    etat: function', '    ');
  return html;
}

function injecterBootstrap(html, role) {
  const bootstraps = {
    public: `/* Entrée Publique dédiée : aucun mode Hôtel, Réception ou Admin. */\n  if(!lireConfirmation()) lirePrefillAeroport();\n\n`,
    client: `/* Entrée Client hôtel : aucune fonction Réception ou Admin. */\n  if(!lireConfirmation() && !lireHotel()) lirePrefillAeroport();\n\n`,
    reception: `/* Entrée Réception dédiée : authentification avant le comptoir. */\n  lireHotel();\n  ouvrirReception();\n\n`,
  };
  const bootstrap = bootstraps[role];
  const docs = '/* =====================================================================\n   LES DOCUMENTS LÉGAUX';
  html = html.replace(docs, bootstrap + docs);
  if (!html.includes(bootstrap.trim())) throw new Error(`bootstrap ${role} non injecté`);
  return html;
}

/* Le bon de la réception et de l'admin (bon-client.js) n'a rien à faire
   dans les pages publiques : le client a son propre bon dans le tunnel. */
function sansBonComptoir(html) {
  return html.replace(/<script\b[^>]*src=["']bon-client\.js["'][^>]*><\/script>\s*/gi, '');
}

function publicEla() {
  let html = sansBonComptoir(sansReception(sansAdmin()));
  html = injecterBootstrap(html, 'public');
  html = html.replace('<html lang="fr">', '<html lang="fr" data-ela-space="public">');
  /* LES FICHIERS DES HÔTELS NE SONT PAS POUR L'ACCUEIL (6 octobre 2026) :
     45 Ko et deux requêtes dont chaque règle vise une page d'hôtel. Ici,
     ?h= part vers /application.html avant tout dessin (ci-dessous), et ce
     sont l'application et la réception qui les gardent. */
  html = html.replace(/<script\b[^>]*src=["']\/hotel-engine-polish\.js["'][^>]*><\/script>\s*/gi, '');
  html = html.replace(/<link\b[^>]*href=["']\/hotel-engine-polish\.css["'][^>]*>\s*/gi, '');
  const redirection = `<script>(function(){try{var p=new URLSearchParams(location.search);if(p.get('exploitant')==='1'){p.delete('exploitant');var a=p.toString();location.replace('/ela-admin/'+(a?'?'+a:'')+location.hash);return}if(p.get('reception')){p.delete('reception');var r=p.toString();location.replace('/reception/easyhotel-aeroville/'+(r?'?'+r:'')+location.hash);return}if(p.get('h')){location.replace('/application.html?'+p.toString()+location.hash)}}catch(e){}}());</script>`;
  html = html.replace('</head>', redirection + '</head>');
  return html;
}

function client() {
  let html = sansBonComptoir(sansReception(sansAdmin()));
  html = injecterBootstrap(html, 'client');
  html = html.replace('<html lang="fr">', '<html lang="fr" data-ela-space="hotel-client">');
  const redirection = `<script>(function(){try{var p=new URLSearchParams(location.search);if(p.get('exploitant')==='1'){p.delete('exploitant');var a=p.toString();location.replace('/ela-admin/'+(a?'?'+a:'')+location.hash);return}if(p.get('reception')){p.delete('reception');var q=p.toString();location.replace('/reception/easyhotel-aeroville/'+(q?'?'+q:'')+location.hash)}}catch(e){}}());</script>`;
  html = html.replace('</head>', redirection + '</head>');
  return html;
}

function reception() {
  let html = sansAdmin();
  html = injecterBootstrap(html, 'reception');
  html = html.replace('<html lang="fr">', '<html lang="fr" data-ela-space="hotel-reception" data-ela-hotel="easyhotel-aeroville">');
  /* SON PROPRE MANIFESTE (29/09/2026). La page héritait de celui du site
     client (« start_url: ./ », donc la racine) : une icône posée depuis la
     réception rouvrait le site PUBLIC. iOS lit le manifeste de la page, pas
     son adresse. On retire tous les manifestes hérités — y compris le lien
     sans adresse que le script d'échange remplit — et on pose le sien. */
  html = html.replace(/<link\b[^>]*rel=["']manifest["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\b[^>]*rel=["']apple-touch-icon["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\b[^>]*rel=["'](?:shortcut )?icon["'][^>]*>\s*/gi, '');
  /* ELA orange sur blanc (29/09/2026, à sa demande) : on reconnaît la
     réception d'un coup d'œil à côté de l'icône client, noir sur orange. */
  html = html.replace('<head>', '<head>\n<base href="/">\n'
    + '<link rel="manifest" href="/easyhotel-reception/manifest.webmanifest">\n'
    + '<link rel="apple-touch-icon" href="/icones/reception-180.png">\n'
    + '<link rel="icon" href="/icones/reception-32.png" type="image/png" sizes="32x32">\n'
    + '<meta name="apple-mobile-web-app-title" content="Réception">\n'
    + '<meta name="apple-mobile-web-app-capable" content="yes">\n'
    + '<meta name="mobile-web-app-capable" content="yes">');
  html = html.replace(/<meta\s+name=["']robots["'][^>]*>/i,
    '<meta name="robots" content="noindex,nofollow">');
  html = sansCanonique(html);
  html = html.replace(/<title>[\s\S]*?<\/title>/i,
    '<title>Réception easyHotel Aéroville — Elatransfer</title>');
  return html;
}

function admin() {
  let html = source;
  const sectionsPubliques = [
    'ecran-accueil', 'ecran-vehicules', 'ecran-recap', 'ecran-bon',
    'ecran-courses', 'ecran-trajets', 'ecran-contact', 'ecran-legal',
    'ecran-reception',
  ];
  for (const id of sectionsPubliques) html = retirerElementParId(html, 'section', id);
  html = retirerElementParClasse(html, 'header', 'entete');
  html = retirerElementParClasse(html, 'nav', 'barre');
  html = retirerElementParId(html, 'div', 'feuilleWa');
  html = html.replace(/<script\b[^>]*src=["']\/hotel-engine-polish\.js["'][^>]*><\/script>\s*/gi, '');
  html = html.replace(/<link\b[^>]*href=["']\/hotel-engine-polish\.css["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\b[^>]*rel=["']manifest["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\b[^>]*rel=["']apple-touch-icon["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\b[^>]*rel=["'](?:shortcut )?icon["'][^>]*>\s*/gi, '');
  html = html.replace('<html lang="fr">', '<html lang="fr" data-ela-space="admin">');
  const compatibilite = `<script>/* Compatibilité temporaire du moteur historique partagé : les éléments
     Client retirés du document deviennent des nœuds détachés, jamais du DOM livré. */
(function(){var vrai=document.getElementById.bind(document),detaches=new Map();window.__elaGetElementByIdReel=vrai;document.getElementById=function(id){var present=vrai(id);if(present)return present;if(!detaches.has(id)){var n=document.createElement(/Dest|Terminal|Vehicule|Select|Pays/i.test(id)?'select':'input');n.id=id;detaches.set(id,n)}return detaches.get(id)}}());</script>`;
  html = html.replace('<head>', '<head>\n<base href="/">\n<link rel="manifest" href="/manifest-exploitant.webmanifest">\n<link rel="apple-touch-icon" href="/icones/admin-180.png">\n<link rel="icon" href="/icones/admin-32.png" type="image/png" sizes="32x32">\n' + compatibilite);
  /* Le moteur historique partage encore des définitions avec le tunnel
     client. Dans le document Admin, les branchements d'interface absents
     deviennent volontairement optionnels ; les branchements Admin, eux,
     trouvent toujours leurs éléments et restent actifs. */
  html = html.replace(/\.addEventListener\(/g, '?.addEventListener(');
  html = html.replace('  chaque(hotelTete.querySelectorAll(".hotel-sens-btn"), function(b){',
    '  if(hotelTete) chaque(hotelTete.querySelectorAll(".hotel-sens-btn"), function(b){');
  const repereAdmin = '/* =====================================================================\n   L\'ESPACE EXPLOITANT';
  const positionAdmin = html.lastIndexOf(repereAdmin);
  if (positionAdmin < 0) throw new Error('début du moteur Admin introuvable');
  html = html.slice(0, positionAdmin)
    + '  document.getElementById = window.__elaGetElementByIdReel;\n\n'
    + html.slice(positionAdmin);
  html = html.replace(/<meta\s+name=["']robots["'][^>]*>/i,
    '<meta name="robots" content="noindex,nofollow">');
  html = sansCanonique(html);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>Administration — Elatransfer</title>');
  const mode = `var MODE_EXPLOITANT = false;\n  try{\n    MODE_EXPLOITANT = new URLSearchParams(location.search).get("exploitant") === "1";\n  }catch(e){ MODE_EXPLOITANT = false; }`;
  if (!html.includes(mode)) throw new Error('sélecteur du mode exploitant introuvable');
  html = html.replace(mode, 'var MODE_EXPLOITANT = true;');
  html = html.replace('location.href = location.pathname;', 'location.href = "/";');
  return html;
}

const publicHtml = publicEla();
const clientHtml = client();
const receptionHtml = reception();
const adminHtml = admin();

const interditsClient = [
  'id="ecran-reception"', 'id="ecran-chauffeurs"', 'id="ecran-facture"',
  'id="ecran-reglages"', 'id="ecran-controle"', 'CODE_EXPLOITANT', 'coursesHotel: function',
  'nuage.roleOperateur', 'class="admin-nav"', 'admin-sante.js', 'ela_sante_alertes', 'pilotage.js', 'ELA_PILOTAGE', 'pilotage_cartes',
];
for (const interdit of interditsClient) {
  if (clientHtml.includes(interdit)) throw new Error(`fuite Client : ${interdit}`);
}
const interditsReception = [
  'id="ecran-chauffeurs"', 'id="ecran-facture"', 'id="ecran-reglages"', 'id="ecran-controle"',
  'CODE_EXPLOITANT', 'nuage.roleOperateur', 'class="admin-nav"', 'admin-sante.js', 'ela_sante_alertes', 'pilotage.js', 'ELA_PILOTAGE', 'pilotage_cartes',
];
for (const interdit of interditsReception) {
  if (receptionHtml.includes(interdit)) throw new Error(`fuite Réception : ${interdit}`);
}
const interditsPublic = [
  'id="ecran-reception"', 'id="ecran-verrou"', 'id="ecran-bord"',
  'id="ecran-chauffeurs"', 'id="ecran-facture"', 'id="ecran-reglages"', 'id="ecran-controle"',
  'coursesHotel: function', 'nuage.roleOperateur', 'class="admin-nav"', 'admin-sante.js', 'ela_sante_alertes', 'pilotage.js', 'ELA_PILOTAGE', 'pilotage_cartes',
];
for (const interdit of interditsPublic) {
  if (publicHtml.includes(interdit)) throw new Error(`fuite Public : ${interdit}`);
}
const interditsAdmin = [
  'id="ecran-accueil"', 'id="ecran-vehicules"', 'id="ecran-recap"',
  'id="ecran-bon"', 'id="ecran-reception"', 'class="barre"',
];
for (const interdit of interditsAdmin) {
  if (adminHtml.includes(interdit)) throw new Error(`fuite Admin : ${interdit}`);
}

fs.mkdirSync(sortie, { recursive: true });
fs.writeFileSync(path.join(sortie, 'index.html'), publicHtml);
fs.writeFileSync(path.join(sortie, 'application.html'), clientHtml);
const dossierReception = path.join(sortie, 'easyhotel-reception');
fs.mkdirSync(dossierReception, { recursive: true });
fs.writeFileSync(path.join(dossierReception, 'index.html'), receptionHtml);
fs.writeFileSync(path.join(dossierReception, 'manifest.webmanifest'), JSON.stringify({
  name: 'Réception easyHotel Aéroville — Elatransfer',
  short_name: 'Réception',
  description: 'Réservations de la réception easyHotel Aéroville.',
  lang: 'fr',
  id: '/easyhotel-reception/',
  start_url: '/easyhotel-reception/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#FFFFFF',
  theme_color: '#FFFFFF',
  icons: [
    { src: '/icones/reception-180.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    { src: '/icones/reception-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  ],
}, null, 2) + '\n');
/* ADRESSE PROPRE (01/10/2026) : /reception/easyhotel-aeroville/ sert la MÊME
   page que /easyhotel-reception/, qui reste intacte (icônes déjà posées).
   Seul le manifeste diffère, pour qu'une icône posée d'ici rouvre ici. */
const dossierReceptionPropre = path.join(sortie, 'reception', 'easyhotel-aeroville');
fs.mkdirSync(dossierReceptionPropre, { recursive: true });
fs.writeFileSync(path.join(dossierReceptionPropre, 'index.html'),
  receptionHtml.replace('href="/easyhotel-reception/manifest.webmanifest"', 'href="/reception/easyhotel-aeroville/manifest.webmanifest"'));
const manifesteReception = JSON.parse(fs.readFileSync(path.join(dossierReception, 'manifest.webmanifest'), 'utf8'));
fs.writeFileSync(path.join(dossierReceptionPropre, 'manifest.webmanifest'), JSON.stringify({
  ...manifesteReception, id: '/reception/easyhotel-aeroville/', start_url: '/reception/easyhotel-aeroville/',
}, null, 2) + '\n');
const dossierAdmin = path.join(sortie, 'ela-admin');
fs.mkdirSync(dossierAdmin, { recursive: true });
fs.writeFileSync(path.join(dossierAdmin, 'index.html'), adminHtml);

console.log(`Quatre espaces construits : Public ${publicHtml.length} octets · Client ${clientHtml.length} octets · Réception ${receptionHtml.length} octets · Admin ${adminHtml.length} octets.`);
