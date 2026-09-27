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

const sectionsAdmin = [
  'ecran-verrou', 'ecran-bord', 'ecran-reglages', 'ecran-creer',
  'ecran-registre', 'ecran-chauffeurs', 'ecran-facture', 'ecran-bord-bon',
];

function socle(role) {
  let html = source;
  html = retirerNavigationAdmin(html);
  for (const id of sectionsAdmin) html = retirerElementParId(html, 'section', id);
  html = html.replace(/<script\b[^>]*src=["'](?:intake-demande|qr-affiche)\.js["'][^>]*><\/script>\s*/gi, '');
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

  const bootstrap = role === 'reception'
    ? `/* Entrée Réception dédiée : authentification avant le comptoir. */\n  lireHotel();\n  ouvrirReception();\n\n`
    : `/* Entrée Client hôtel : aucune fonction Réception ou Admin. */\n  if(!lireConfirmation() && !lireHotel()) lirePrefillAeroport();\n\n`;
  const docs = '/* =====================================================================\n   LES DOCUMENTS LÉGAUX';
  html = html.replace(docs, bootstrap + docs);
  if (!html.includes(bootstrap.trim())) throw new Error(`bootstrap ${role} non injecté`);
  return html;
}

function client() {
  let html = socle('client');
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
  html = html.replace('<html lang="fr">', '<html lang="fr" data-ela-space="hotel-client">');
  const redirection = `<script>(function(){try{var p=new URLSearchParams(location.search);if(p.get('reception')){p.delete('reception');var q=p.toString();location.replace('/easyhotel-reception/'+(q?'?'+q:'')+location.hash)}}catch(e){}}());</script>`;
  html = html.replace('</head>', redirection + '</head>');
  return html;
}

function reception() {
  let html = socle('reception');
  html = html.replace('<html lang="fr">', '<html lang="fr" data-ela-space="hotel-reception" data-ela-hotel="easyhotel-aeroville">');
  html = html.replace('<head>', '<head>\n<base href="/">');
  html = html.replace(/<meta\s+name=["']robots["'][^>]*>/i,
    '<meta name="robots" content="noindex,nofollow">');
  html = html.replace(/<title>[\s\S]*?<\/title>/i,
    '<title>Réception easyHotel Aéroville — ELA Transfer</title>');
  return html;
}

const clientHtml = client();
const receptionHtml = reception();

const interditsClient = [
  'id="ecran-reception"', 'id="ecran-chauffeurs"', 'id="ecran-facture"',
  'id="ecran-reglages"', 'CODE_EXPLOITANT', 'coursesHotel: function',
  'nuage.roleOperateur', 'class="admin-nav"',
];
for (const interdit of interditsClient) {
  if (clientHtml.includes(interdit)) throw new Error(`fuite Client : ${interdit}`);
}
const interditsReception = [
  'id="ecran-chauffeurs"', 'id="ecran-facture"', 'id="ecran-reglages"',
  'CODE_EXPLOITANT', 'nuage.roleOperateur', 'class="admin-nav"',
];
for (const interdit of interditsReception) {
  if (receptionHtml.includes(interdit)) throw new Error(`fuite Réception : ${interdit}`);
}

fs.mkdirSync(sortie, { recursive: true });
fs.writeFileSync(path.join(sortie, 'application.html'), clientHtml);
const dossierReception = path.join(sortie, 'easyhotel-reception');
fs.mkdirSync(dossierReception, { recursive: true });
fs.writeFileSync(path.join(dossierReception, 'index.html'), receptionHtml);

console.log(`Espaces hôtel construits : Client ${clientHtml.length} octets · Réception ${receptionHtml.length} octets.`);
