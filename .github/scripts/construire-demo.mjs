// CONSTRUIRE-DEMO.MJS — la démo /demo/hotel/ (mission « Démo professionnels », bloc 3).
//
// Elle part des deux pages DÉJÀ construites par construire-espaces-hotel.mjs :
//   site/application.html                 → /demo/hotel/            (ce que voit le client)
//   site/easyhotel-reception/index.html   → /demo/hotel/reception/  (ce que voit la réception)
// Ces deux pages ont déjà perdu tout l'espace exploitant (et ses contrôles
// anti-fuite sont passés) : la démo n'a donc rien à retirer de l'admin.
//
// CE QUI EST RETIRÉ ICI, ET POURQUOI C'EST STRUCTUREL :
//   - toute la couche serveur (SUPABASE_URL, la clé publique, l'objet
//     `nuage` qui dépose, lit l'état et la liste de la réception) est
//     REMPLACÉE par le simulateur local (demo-simulateur.js) ;
//   - tout chemin d'API Supabase restant devient « /demo-coupe » ;
//   - WhatsApp, l'abonnement aux notifications, le service worker sautent ;
//   - le stockage du navigateur est préfixé (ELA_DEMO_STOCKAGE) : les
//     courses fictives ne se mélangent jamais à celles d'un vrai client ;
//   - l'hôtel partenaire réel (sa grille, son nom, ses couleurs, sa photo)
//     est REMPLACÉ par un hôtel fictif à tarifs d'exemple. Le dépôt
//     (index.html) n'est jamais touché : la configuration fictive n'existe
//     que dans la sortie démo.
// Le contrôle final (verifier-demo.mjs) tourne APRÈS masquer-commentaires et
// fait échouer la construction si une seule trace revient.
import fs from 'node:fs';
import path from 'node:path';

const sortie = process.argv[2] || 'site';
const lireSortie = (f) => fs.readFileSync(path.join(sortie, f), 'utf8');

export const URL_DEMANDE_DEMO = 'https://yyhzutnuhuytokarynaw.supabase.co/functions/v1/demande-demo';

/* La règle de sécurité de la page. La même vit dans _headers pour /demo/* :
   test-demo-hotel.mjs vérifie que les deux disent la même chose. */
export const CSP_DEMO = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://tile.openstreetmap.org https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org",
  `connect-src 'self' https://api-adresse.data.gouv.fr https://photon.komoot.io https://api.openrouteservice.org https://router.project-osrm.org ${URL_DEMANDE_DEMO}`,
  "frame-src 'none'",
  "object-src 'none'",
  "worker-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/* L'HÔTEL FICTIF. Ses montants sont des EXEMPLES, et aucun n'est celui de
   la grille négociée d'un vrai partenaire : verifier-demo.mjs le contrôle
   en relisant cette grille dans index.html. */
const HOTELS_DEMO = `var HOTELS = {
    "demo-hotel": {
      nom:"Hôtel Démo · Roissy",
      court:"Hôtel Démo",
      marque: { charbon:"#062F55", vif:"#D7EAFB", bouton:"#0E6FC7",
                pale:"#E8F2FD", paleEncre:"#0A4F91" },
      photo:"",
      adresse:"Zone hôtelière, 95700 Roissy-en-France",
      lat:49.0047, lon:2.5160,
      alias:[],
      destinations:[
        { cle:"cdg",        nom:"Aéroport CDG",           aeroport:"cdg",
          forfait:{ berline:45,  van:65  } },
        { cle:"orly",       nom:"Orly",                   aeroport:"orly",
          forfait:{ berline:85,  van:125 } },
        { cle:"bourget",    nom:"Le Bourget",
          label:"Aéroport de Paris-Le Bourget, 93350 Le Bourget",
          lat:48.9694, lon:2.4414, rayonKm:2.5,
          forfait:{ berline:55,  van:75  } },
        { cle:"beauvais",   nom:"Beauvais",               aeroport:"beauvais",
          forfait:{ berline:165, van:225 } },
        { cle:"disney",     nom:"Disney",
          label:"Disneyland Paris, 77700 Marne-la-Vallée",
          lat:48.8722, lon:2.7758, rayonKm:3,
          forfait:{ berline:95,  van:135 } },
        { cle:"paris",      nom:"Paris", label:"Paris", adresseLibre:true,
          lat:48.8566, lon:2.3522, rayonKm:7,
          forfait:{ berline:75,  van:115 } }
      ]
    }
  };

  `;

const NUAGE_DEMO = `var SUPABASE_URL = "";
  var SUPABASE_CLE = "";
  /* Démo : aucune couche serveur. Tout passe par le simulateur local. */
  var nuage = window.ELA_DEMO_NUAGE;
  window.ELA_NUAGE = nuage;
`;

function remplacerUne(html, avant, apres, quoi) {
  const i = html.indexOf(avant);
  if (i < 0) throw new Error(`construire-demo : repère absent (${quoi})`);
  if (html.indexOf(avant, i + avant.length) >= 0) throw new Error(`construire-demo : repère ambigu (${quoi})`);
  return html.slice(0, i) + apres + html.slice(i + avant.length);
}

function remplacerEntre(html, debut, fin, apres, quoi, garderFin = true) {
  const a = html.indexOf(debut);
  if (a < 0) throw new Error(`construire-demo : début absent (${quoi})`);
  const b = html.indexOf(fin, a);
  if (b < 0) throw new Error(`construire-demo : fin absente (${quoi})`);
  return html.slice(0, a) + apres + html.slice(garderFin ? b : b + fin.length);
}

const SUIVI_BON = `
  /* Démo : le bon du client suit la course simulée, sans recharger. */
  setInterval(function(){
    var ecranBon = document.getElementById("ecran-bon");
    if(!bonCourant || !ecranBon || !ecranBon.classList.contains("actif")) return;
    nuage.etat(bonCourant.ref).then(function(d){
      if(!d) return;
      var avant = (bonCourant.chauffeur || {}).nom || "";
      if(d.statut === bonCourant.statut && (d.chauffeur.nom || "") === avant) return;
      bonCourant.statut = d.statut;
      bonCourant.chauffeur = d.chauffeur;
      try{
        var l = JSON.parse(ELA_DEMO_STOCKAGE.getItem("ela_courses") || "[]");
        l.forEach(function(b){ if(b && b.ref === bonCourant.ref){ b.statut = d.statut; b.chauffeur = d.chauffeur; } });
        ELA_DEMO_STOCKAGE.setItem("ela_courses", JSON.stringify(l));
      }catch(e){}
      remplirBon(bonCourant);
    });
  }, 1200);
`;

function bootstrap(vue) {
  const commun = `var h = HOTELS["demo-hotel"];
    h.nom = window.ELA_DEMO_INFO.etablissement;
    h.court = h.nom;
    try{ sessionStorage.setItem("ela_provenance", h.nom); }catch(e){}`;
  if (vue === 'client') {
    return `/* Démo : l'hôtel vient de la réponse d'« ouvrir », jamais de l'adresse. */
  window.addEventListener("ela:demo-pret", function(){
    ${commun}
    ouvrirModeHotel(h);
    window.ELA_DEMO.habillerHotel();
  });
${SUIVI_BON}`;
  }
  return `/* Démo : la réception de l'hôtel fictif, ouverte sans code. */
  window.addEventListener("ela:demo-pret", function(){
    ${commun}
    recHotel = h;
    document.body.classList.add("reception");
    document.getElementById("btnReception").hidden = false;
    retenirCode(h.cle, "demo.session");
    ouvrirModeHotel(h);
    window.ELA_DEMO.habillerHotel();
    ouvrirReception();
  });
  window.addEventListener("ela:demo-etape", function(){
    if(recHotel && document.getElementById("ecran-reception").classList.contains("actif"))
      chargerReception(codeRetenu(recHotel.cle), true);
  });
  setInterval(function(){
    if(recHotel && document.getElementById("ecran-reception").classList.contains("actif"))
      chargerReception(codeRetenu(recHotel.cle), true);
  }, 3000);
${SUIVI_BON}`;
}

function demoiser(html, vue) {
  // 1. L'espace et la vue.
  html = html.replace(/<html lang="fr"[^>]*>/, `<html lang="fr" data-ela-space="demo" data-demo-vue="${vue}">`);
  if (!html.includes('data-ela-space="demo"')) throw new Error('construire-demo : balise <html> introuvable');

  // 2. La tête : plus de redirection par paramètre, plus de manifeste,
  //    plus des fichiers du partenaire réel. On pose les nôtres.
  html = html.replace(/<script>\(function\(\)\{try\{var p=new URLSearchParams\(location\.search\);[\s\S]*?<\/script>/g, '');
  html = html.replace(/<script>\s*\(function\(\)\{\s*(?:\/\*[\s\S]*?\*\/\s*)?var m = document\.getElementById\("manifeste"\);[\s\S]*?<\/script>\s*/, '');
  html = html.replace(/<link\b[^>]*rel=["']manifest["'][^>]*>\s*/gi, '');
  html = html.replace(/<base\b[^>]*>\s*/gi, '');
  html = html.replace(/<meta\b[^>]*name=["']apple-mobile-web-app-[^>]*>\s*/gi, '');
  html = html.replace(/<meta\b[^>]*name=["']mobile-web-app-capable["'][^>]*>\s*/gi, '');
  html = html.replace(/<script\b[^>]*src=["']\/?hotel-engine-polish\.js["'][^>]*><\/script>\s*/gi, '');
  html = html.replace(/<link\b[^>]*href=["']\/?hotel-engine-polish\.css["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+name=["']robots["'][^>]*>/gi, '');
  html = html.replace(/<meta\b[^>]*property=["']og:[^>]*>\s*/gi, '');
  html = html.replace(/<meta\b[^>]*name=["']twitter:[^>]*>\s*/gi, '');
  html = html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>Démonstration — Elatransfer</title>');
  html = html.replace(/<meta\b[^>]*name=["']description["'][^>]*>/i,
    '<meta name="description" content="Démonstration de la page de réservation et de l\'espace réception Elatransfer.">');
  html = remplacerUne(html, '<head>', '<head>\n'
    + `<meta http-equiv="Content-Security-Policy" content="${CSP_DEMO}">\n`
    + '<base href="/">\n'
    + '<meta name="robots" content="noindex,nofollow">\n'
    + '<meta name="referrer" content="strict-origin-when-cross-origin">\n'
    + '<style>html.demo-attente body{visibility:hidden}</style>\n'
    + '<link rel="stylesheet" href="/demo/demo.css">\n'
    + '<script src="/qr-affiche.js"></script>\n'
    + '<script src="/demo/demo-simulateur.js"></script>', '<head>');

  // 3. Le logo ramène à la page des professionnels, pas au site public.
  html = html.replace(/<a class="logo" href="\/"/g, '<a class="logo" href="/professionnels/"');

  // 4. L'hôtel fictif à la place de tout partenaire réel.
  html = remplacerEntre(html, 'var HOTELS = {', 'Object.keys(HOTELS).forEach(function(k){ HOTELS[k].cle = k; });',
    HOTELS_DEMO, 'HOTELS');

  // 5. La couche serveur remplacée par le simulateur.
  html = remplacerEntre(html, 'var SUPABASE_URL = "', 'window.ELA_NUAGE = nuage;', NUAGE_DEMO, 'nuage', false);
  html = html.replace(/var CLE_VAPID = "[^"]*";/, 'var CLE_VAPID = "";');
  html = html.replace(/"\/(?:rest|functions|auth)\/v1\/[^"]*"/g, '"/demo-coupe"');

  // 6. Rien ne part vers WhatsApp ni ne s'installe.
  html = html.replace(/href="https:\/\/wa\.me\/[0-9]*"/g, 'href="/professionnels/#contact"');
  html = html.replace(/https:\/\/wa\.me\//g, 'https://demo.invalid/whatsapp/');
  html = html.replace(/https:\/\/t\.me\//g, 'https://demo.invalid/telegram/');
  html = remplacerUne(html, '"serviceWorker" in navigator && location.protocol === "https:"',
    'false', 'service worker');

  // 7. Le stockage préfixé.
  html = html.replace(/\b(?:window\.)?localStorage\b/g, 'ELA_DEMO_STOCKAGE');

  // 8. Les langues : comme une page d'hôtel, la démo suit le navigateur.
  html = remplacerUne(html, 'if(espace === "hotel-client" || espace === "hotel-reception") return true;',
    'if(espace === "hotel-client" || espace === "hotel-reception" || espace === "demo") return true;', 'langue');

  // 9. Le démarrage : plus aucun paramètre d'adresse n'est lu.
  if (vue === 'client') {
    html = remplacerUne(html, 'if(!lireConfirmation() && !lireHotel()) lirePrefillAeroport();', bootstrap('client'), 'bootstrap client');
  } else {
    html = remplacerUne(html, 'lireHotel();\n  ouvrirReception();', bootstrap('reception'), 'bootstrap réception');
    html = html.replace(/<script\b([^>]*)src=["']\/?bon-client\.js["']/gi, '<script$1src="/demo/bon-client.js"');
  }
  return html;
}

const client = demoiser(lireSortie('application.html'), 'client');
const reception = demoiser(lireSortie(path.join('easyhotel-reception', 'index.html')), 'reception');

const bon = fs.readFileSync(path.join(sortie, 'bon-client.js'), 'utf8')
  .replace(/https:\/\/wa\.me\/[0-9]*/g, '/professionnels/#contact')
  .replace(/https:\/\/t\.me\/[a-z0-9_]*/gi, '/professionnels/#contact');

const dossier = path.join(sortie, 'demo');
fs.mkdirSync(path.join(dossier, 'hotel', 'reception'), { recursive: true });
fs.writeFileSync(path.join(dossier, 'hotel', 'index.html'), client);
fs.writeFileSync(path.join(dossier, 'hotel', 'reception', 'index.html'), reception);
fs.writeFileSync(path.join(dossier, 'bon-client.js'), bon);
fs.copyFileSync('demo-simulateur.js', path.join(dossier, 'demo-simulateur.js'));
fs.copyFileSync('demo.css', path.join(dossier, 'demo.css'));
console.log(`Démo construite : client ${client.length} octets · réception ${reception.length} octets.`);
