// CONSTRUIRE-DEMO.MJS — la démo /demo/hotel/ (mission « Démo professionnels », bloc 3).
//
// Elle part des deux pages DÉJÀ construites par construire-espaces-hotel.mjs :
//   site/application.html                 → /demo/hotel/            (ce que voit le client)
//   site/reception/<un hôtel>/index.html  → /demo/hotel/reception/  (ce que voit la réception)
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

/* L'HÔTEL FICTIF. AUCUN PRIX N'EST PROPOSÉ (8/10/2026, Barbaros : « ne mets
   pas les prix suggérés, il faut laisser l'hôtel choisir ») : c'est le
   prospect qui fixe les siens dans « Personnaliser ma page » — ce sont ceux
   de son flyer. Sans prix, le moteur calcule au kilomètre. verifier-demo.mjs
   refuse en plus tout montant de la grille d'un vrai partenaire. */
const HOTELS_DEMO = `var HOTELS = {
    "demo-hotel": {
      nom:"Hôtel Démo · Roissy",
      court:"Hôtel Démo",
      /* La démo montre la page d'un hôtel qui a accepté d'être associé à
         nous : sa pastille dans l'en-tête, « Tarifs partenaires ». */
      coMarquage:true,
      marque: { charbon:"#062F55", vif:"#D7EAFB", bouton:"#0E6FC7",
                pale:"#E8F2FD", paleEncre:"#0A4F91" },
      photo:"",
      adresse:"Zone hôtelière, 95700 Roissy-en-France",
      lat:49.0047, lon:2.5160,
      alias:[],
      destinations:[
        { cle:"cdg",        nom:"Aéroport CDG",           aeroport:"cdg",
          forfait:null },
        { cle:"orly",       nom:"Orly",                   aeroport:"orly",
          forfait:null },
        { cle:"bourget",    nom:"Le Bourget",
          label:"Aéroport de Paris-Le Bourget, 93350 Le Bourget",
          lat:48.9694, lon:2.4414, rayonKm:2.5,
          forfait:null },
        { cle:"beauvais",   nom:"Beauvais",               aeroport:"beauvais",
          forfait:null },
        { cle:"disney",     nom:"Disney",
          label:"Disneyland Paris, 77700 Marne-la-Vallée",
          lat:48.8722, lon:2.7758, rayonKm:3,
          forfait:null },
        { cle:"paris",      nom:"Paris", label:"Paris", adresseLibre:true,
          lat:48.8566, lon:2.3522, rayonKm:7,
          forfait:null }
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

/* ═══ L'ARRIVÉE DU CLIENT EST LA VRAIE PAGE DU QR (25/10/2026) ═══
   Barbaros : « ce que je présente en démo est bien derrière ». La réception
   de la démo suivait toute seule (elle est fabriquée depuis la vraie) ; la
   page d'arrivée du client, elle, était une COPIE dessinée le 8/10, et la
   vraie page du QR a changé depuis (« Votre transfert depuis… », le bouton,
   les étapes, l'aide, le pied). Elle est désormais FABRIQUÉE à chaque
   construction depuis la page publiée, comme la réception :
     - son style et son contenu, cloisonnés sous #demoArrivee : classes
       préfixées « qr- », identifiants « demoArrivee- » (le moteur a déjà ses
       .carte, .prix, .hero, .etapes) ;
     - rien de l'hôtel réel : ni nom, ni adresse, ni prix, ni lien, ni
       script (la lecture des prix au serveur ne vient pas), ni sa couleur —
       elle devient celle de l'hôtel du prospect ;
     - ses cartes deviennent des MODÈLES : le moteur de la démo les clone
       pour les destinations de l'hôtel fictif et celles du prospect. */
const PAGE_QR = path.join('easyhotel-client', 'index.html');

/* La couleur du partenaire réel → celle du thème de l'hôtel du prospect
   (demo.css). Une teinte orange qui ne serait pas dans cette table fait
   échouer la construction (orangeRestant) : la démo ne porte jamais la
   couleur d'un vrai partenaire. Le marine du bandeau et son bleu pâle
   suivent aussi le thème (fond noir du « noir et or », 25/10/2026). */
const TEINTES = [
  [/#0b2d4f\b/gi, 'var(--demo-fond)'],
  [/#123f68\b/gi, 'var(--demo-fond2)'],
  [/#e8f0f8\b/gi, 'var(--demo-neutre)'],
  [/#ff5a0a\b/gi, 'var(--demo-o)'],
  [/#c2410c\b/gi, 'var(--demo-otexte)'],
  [/#fff1e8\b/gi, 'var(--demo-opale)'],
  [/#ffb38a\b/gi, 'var(--demo-oclair)'],
  [/rgba\(\s*255\s*,\s*90\s*,\s*10\s*,\s*([\d.]+)\s*\)/gi,
    (m, a) => `color-mix(in srgb,var(--demo-o) ${Math.round(Number(a) * 100)}%,transparent)`],
];
const teinter = (t) => TEINTES.reduce((x, [motif, par]) => x.replace(motif, par), t);

function orangeRestant(t) {
  const couleurs = [];
  for (const m of t.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    const h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
    couleurs.push([0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)));
  }
  for (const m of t.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi)) couleurs.push([m[1], m[2], m[3]].map(Number));
  return couleurs.find(([r, g, b]) => {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max !== r || max - min < 90) return false;          // ni rouge dominant, ni saturé
    const teinte = 60 * ((g - b) / (max - min));
    return teinte >= 10 && teinte <= 45;                      // l'orange
  });
}

/* Les sélecteurs de la page du QR, sous la racine de l'arrivée. */
function selecteurs(liste, racine) {
  return liste.split(',').map((s) => {
    s = s.trim().replace(/\.(-?[_a-zA-Z][\w-]*)/g, '.qr-$1').replace(/#([_a-zA-Z][\w-]*)/g, '#demoArrivee-$1');
    if (/^(?::root|html|body)$/.test(s)) return racine;
    if (s === '*') return `${racine},${racine} *`;
    const m = /^(?:html|body)\s+(.+)$/.exec(s);
    return `${racine} ${m ? m[1] : s}`;
  }).join(',');
}
function cloisonner(css, racine) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let sortie = '', i = 0;
  for (;;) {
    const a = css.indexOf('{', i);
    if (a < 0) break;
    const tete = css.slice(i, a).trim();
    if (tete.startsWith('@')) {
      let p = 1, j = a + 1;
      while (j < css.length && p) { if (css[j] === '{') p++; else if (css[j] === '}') p--; j++; }
      if (!/^@media\b/.test(tete)) throw new Error(`construire-demo : règle « ${tete} » inconnue dans la page du QR`);
      sortie += tete + '{' + cloisonner(css.slice(a + 1, j - 1), racine) + '}\n';
      i = j;
    } else {
      const b = css.indexOf('}', a);
      sortie += selecteurs(tete, racine) + '{' + css.slice(a + 1, b).trim() + '}\n';
      i = b + 1;
    }
  }
  return sortie;
}

function remplacerUnMotif(texte, motif, par, quoi) {
  const n = (texte.match(new RegExp(motif.source, motif.flags.includes('g') ? motif.flags : motif.flags + 'g')) || []).length;
  if (n !== 1) throw new Error(`construire-demo : page du QR, repère ${n ? 'ambigu' : 'absent'} (${quoi})`);
  return texte.replace(motif, par);
}

function arriveeDepuisPageQr(source) {
  const page = lireSortie(PAGE_QR);
  const style = /<style>([\s\S]*?)<\/style>/.exec(page);
  const tete = /<header class="top">[\s\S]*?<\/header>/.exec(page);
  const main = /<main>([\s\S]*?)<\/main>/.exec(page);
  const pied = /<footer class="pied">[\s\S]*?<\/footer>/.exec(page);
  if (!style || !tete || !main || !pied) throw new Error('construire-demo : la page du QR n\'a plus son style, son en-tête, son <main> ou son pied');

  /* Son en-tête blanc aussi (logo, FR/EN) : celui du formulaire, en couleur,
     ajoutait une barre que la vraie page n'a pas. */
  let corps = (tete[0] + main[1] + pied[0]).replace(/<!--[\s\S]*?-->/g, '');
  /* Dans le titre, le nom est un TEXTE posé après une ancre vide, comme sur la
     vraie page : dans un <span>, il prenait la couleur d'accent de « Votre
     transfert depuis » (la feuille colore « h1 span »), et le titre perdait
     ses deux couleurs. */
  corps = remplacerUnMotif(corps, /(<h1>[\s\S]*?<br>)[^<]+(<\/h1>)/, '$1<i hidden data-demo-arrivee="nom-titre"></i>$2', 'nom du titre');
  corps = remplacerUnMotif(corps, /(class="adresse">[\s\S]*?<div>)<b>[^<]*<\/b><span>[^<]*<\/span>/,
    '$1<b data-demo-arrivee="nom"></b><span data-demo-arrivee="adresse"></span>', 'adresse');
  let modeles = '';
  corps = remplacerUnMotif(corps, /<ul class="grille">([\s\S]*?)<\/ul>/, (m, cartes) => { modeles = cartes; return '<ul class="grille" id="grille"></ul>'; }, 'cartes');
  /* Aucun prix d'un partenaire réel : le moteur de la démo les pose. */
  modeles = modeles.replace(/(<b data-g="(?:berline|van)">)[^<]*(<\/b>)/g, '$1$2');
  if (!/data-dest="/.test(modeles) || !/class="li-autre"/.test(modeles)) throw new Error('construire-demo : page du QR, cartes ou « Autre destination » introuvables');

  const prefixer = (t) => teinter(t)
    .replace(/\shref="\.\.\/\.\.\/application\.html\?doc=(mentions|privacy)"/g, ' href="/?doc=$1"')
    .replace(/\shref="\.\.\/\.\.\/application\.html\?[^"]*"/g, ' href="#"')
    .replace(/\s(src|href)="\.\.\/\.\.\//g, ' $1="/')
    .replace(/\sstroke="(var\([^)]*\))"/g, ' style="stroke:$1"')
    .replace(/\sclass="([^"]*)"/g, (m, c) => ` class="${c.trim().split(/\s+/).map((x) => 'qr-' + x).join(' ')}"`)
    .replace(/\sid="([^"]+)"/g, ' id="demoArrivee-$1"')
    .replace(/\shref="#([^"]+)"/g, ' href="#demoArrivee-$1"');
  corps = prefixer(corps);
  modeles = prefixer(modeles);
  const css = cloisonner(teinter(style[1]), '#demoArrivee');

  /* Ce qui ne doit JAMAIS passer : un lien de la page réelle, l'adresse
     ou le nom d'un vrai partenaire, sa couleur. (« easyhotel », sa clé et
     ses forfaits sont en plus refusés par verifier-demo.mjs.) */
  const tout = corps + modeles + css;
  if (tout.includes('../')) throw new Error('construire-demo : un lien relatif de la page du QR est resté');
  const grille = source.slice(source.indexOf('var HOTELS = {'), source.indexOf('Object.keys(HOTELS).forEach'));
  /* Le nom et l'adresse de chaque partenaire (au niveau de sa fiche, pas de
     ses destinations), jusqu'à la première virgule. */
  for (const m of grille.matchAll(/^ {6}(?:nom|court|adresse)\s*:\s*"([^",]{6,})/gm))
    if (tout.includes(m[1])) throw new Error(`construire-demo : l'arrivée de la démo nomme un partenaire réel (« ${m[1]} »)`);
  const orange = orangeRestant(tout);
  if (orange) throw new Error(`construire-demo : l'arrivée de la démo garde la couleur du partenaire réel (rgb ${orange.join(',')}) — l'ajouter à TEINTES`);

  return {
    style: `<style id="demoArriveeStyle">
#demoArrivee{display:block;font-size:16px;line-height:normal;font-weight:400;font-style:normal;letter-spacing:normal;word-spacing:normal;text-align:start;text-transform:none;text-indent:0;white-space:normal}
#demoArrivee :where(h1,h2,p,ul,ol,li,a,b,small,i,em,span,div,section,img,nav,header,footer,button){all:revert}
${css}</style>\n`,
    contenu: `<div id="demoArrivee" class="demo-arrivee">${corps}</div>\n`
      + `<template id="demoArriveeModeles">${modeles}</template>\n`,
  };
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

/* LA PERSONNALISATION (8/10/2026, à la demande de Barbaros : « couleur, nom,
   photo, et même ajouter des éléments »). Le panneau vit dans le simulateur ;
   ce qui touche au moteur (le nom qui part sur le bon, les destinations du
   menu) passe par cette prise, posée DANS la portée du moteur. Tout reste
   dans le navigateur du prospect. */
const PERSO = `
  window.ELA_DEMO_PAGE = {
    appliquer: function(p){
      var h = HOTELS["demo-hotel"];
      if(!h || !window.ELA_DEMO_INFO) return;
      p = p || {};
      if(!h.__base) h.__base = h.destinations.slice();
      h.nom = p.nom || window.ELA_DEMO_INFO.etablissement;
      h.court = h.nom;
      var prix = p.prix || {};
      function forfaitDe(cle){
        var x = prix[cle] || {}, f = {};
        if(x.berline > 0) f.berline = x.berline;
        if(x.van > 0) f.van = x.van;
        return (f.berline || f.van) ? f : null;
      }
      h.destinations = h.__base.map(function(d){
        return Object.assign({}, d, { forfait: forfaitDe(d.cle) });
      }).concat((p.destinations || []).map(function(d){
        var cle = "perso-" + d.id;
        return { cle:cle, nom:d.nom, label:d.label, lat:d.lat, lon:d.lon, rayonKm:1.5, forfait: forfaitDe(cle) };
      }));
      try{ sessionStorage.setItem("ela_provenance", h.nom); }catch(e){}
      /* SA PHOTO VA DANS LE BANDEAU, comme celle d'un partenaire : le
         prospect voit sa page telle qu'elle serait. Elle ne quitte pas le
         navigateur (une adresse « data: », jamais envoyée). */
      h.photoEntete = p.photo || "";
      if(p.photo) document.documentElement.style.setProperty("--h-photo-entete", 'url("' + p.photo + '")');
      else document.documentElement.style.removeProperty("--h-photo-entete");
      document.getElementById("hotelTeteNom").textContent = h.nom;
      var rh = document.getElementById("recHotel");
      if(rh && recHotel) rh.textContent = h.nom;
      var avant = selDest.value;
      selDest.textContent = "";
      h.destinations.forEach(function(d){
        var o = document.createElement("option");
        o.value = d.cle; o.textContent = d.nom;
        selDest.appendChild(o);
      });
      var autre = document.createElement("option");
      autre.value = ""; autre.setAttribute("data-t", "hotel_autre");
      autre.textContent = T("hotel_autre");
      selDest.appendChild(autre);
      var garde = null;
      h.destinations.forEach(function(d){ if(d.cle === avant) garde = d; });
      if(!garde && avant !== "") garde = h.destinations[0];
      hotelDest = garde;
      selDest.value = garde ? garde.cle : "";
      if(hotel) appliquerHotel();
      window.ELA_DEMO_PAGE.dessinerCartes();
      /* La finition suit le nom personnalisé (sa pastille, son en-tête). */
      try{ window.dispatchEvent(new Event("ela:hotel")); }catch(e){}
    },
    /* LA PAGE D'ARRIVÉE EST LA VRAIE PAGE DU QR (25/10/2026) : fabriquée par
       arriveeDepuisPageQr() à la construction, elle est REMPLIE ici depuis
       HOTELS — la MÊME liste que le menu du formulaire, destinations ajoutées
       comprises : la carte et le formulaire ne peuvent pas se contredire. Les
       cartes sont des clones des vraies (mêmes repères, mêmes textes, mêmes
       deux langues) ; une destination ajoutée par le prospect prend la forme
       d'une carte à pictogramme, un repère constant. */
    destinations: function(){
      var h = HOTELS["demo-hotel"];
      return h ? h.destinations.map(function(d){ return { cle:d.cle, nom:d.nom }; }) : [];
    },
    dessinerCartes: function(){
      if(document.documentElement.getAttribute("data-demo-vue") !== "client") return;
      var h = HOTELS["demo-hotel"], tete = document.getElementById("hotelTete");
      var page = document.getElementById("demoArrivee"), modeles = document.getElementById("demoArriveeModeles");
      var grille = document.getElementById("demoArrivee-grille");
      if(!h || !tete || !page || !modeles || !grille) return;
      var en = LANGUE === "en";
      function allerA(el){
        var b = document.getElementById("demoBandeau");
        window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - (b ? b.offsetHeight + 8 : 0)));
      }
      function choisir(cle){
        selDest.value = cle;
        selDest.dispatchEvent(new Event("change", { bubbles:true }));
        document.body.classList.remove("demo-choix");
        allerA(document.getElementById("demoRetourCartes") || selDest);
      }
      var dest = grille.parentNode;
      if(!document.getElementById("demoRetourCartes")){
        var retour = document.createElement("button");
        retour.type = "button"; retour.id = "demoRetourCartes"; retour.className = "demo-retour-cartes";
        retour.addEventListener("click", function(){ document.body.classList.add("demo-choix"); allerA(page); });
        tete.parentNode.insertBefore(retour, tete.nextSibling);
        /* « Réserver mon transfert » descend aux cartes, sous le bandeau de la démo. */
        var cta = document.getElementById("demoArrivee-cta");
        if(cta) cta.addEventListener("click", function(e){ e.preventDefault(); allerA(dest); });
        /* CE QUE LE PROSPECT DOIT SAVOIR (8/10/2026, Barbaros : « quand est-ce
           qu'il va voir la seconde page ? ») : qu'il peut toucher une carte, et
           que ces prix sont ceux de SON flyer, dont le QR code amène ici. */
        var aide = document.createElement("p"); aide.className = "demo-cartes-aide"; aide.id = "demoCartesAide";
        var titre = dest.querySelector("h2");
        dest.insertBefore(aide, titre ? titre.nextSibling : grille);
        var flyer = document.createElement("p"); flyer.className = "demo-cartes-flyer"; flyer.id = "demoCartesFlyer";
        dest.insertBefore(flyer, grille);
        document.body.classList.add("demo-choix");
      }
      document.getElementById("demoRetourCartes").textContent = en ? "← All destinations" : "← Toutes les destinations";
      /* Les boutons FR/EN de la page du QR font ce que font ceux du moteur. */
      page.querySelectorAll(".qr-lang[data-lang]").forEach(function(btn){
        var l = btn.getAttribute("data-lang") === "en" ? "en" : "fr";
        if(btn.getAttribute("aria-pressed") !== String(l === LANGUE)) btn.setAttribute("aria-pressed", String(l === LANGUE));
        if(btn.getAttribute("data-demo-branche")) return;
        btn.setAttribute("data-demo-branche", "1");
        btn.addEventListener("click", function(){
          var moteur = document.querySelector('.langues [data-langue="' + l + '"]');
          if(moteur) moteur.click();
        });
      });
      page.querySelectorAll('[data-demo-arrivee="nom"]').forEach(function(e){ e.textContent = h.nom; });
      var ancre = page.querySelector('[data-demo-arrivee="nom-titre"]');
      if(ancre){
        if(!ancre.nextSibling || ancre.nextSibling.nodeType !== 3) ancre.parentNode.insertBefore(document.createTextNode(""), ancre.nextSibling);
        if(ancre.nextSibling.nodeValue !== h.nom) ancre.nextSibling.nodeValue = h.nom;
      }
      page.querySelectorAll('[data-demo-arrivee="adresse"]').forEach(function(e){ e.textContent = h.adresse || ""; });

      var tpl = modeles.content, reels = tpl.querySelectorAll("a[data-dest]"), libre = null;
      for(var k = 0; k < reels.length; k++) if(!libre && reels[k].querySelector("svg")) libre = reels[k];
      function montant(v){ var c = Math.round(v * 100); return (c % 100 ? (c / 100).toFixed(2).replace(".", ",") : String(c / 100)) + " €"; }
      function brancher(li, cle){
        var a = li.querySelector("a");
        a.classList.add("demo-carte"); a.setAttribute("data-dest", cle); a.setAttribute("href", "#");
        a.addEventListener("click", function(e){ e.preventDefault(); choisir(cle); });
        return a;
      }
      grille.textContent = "";
      h.destinations.forEach(function(d){
        var src = null;
        for(var i = 0; i < reels.length; i++) if(reels[i].getAttribute("data-dest") === d.cle) src = reels[i];
        var connue = !!src;
        src = src || libre || reels[0];
        if(!src) return;
        var li = src.parentNode.cloneNode(true), a = brancher(li, d.cle);
        if(!connue){
          var pict = a.querySelector(".qr-pict");
          if(pict){ pict.classList.add("qr-bleu"); pict.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>'; }
          var b = a.querySelector(".qr-nom b"), sous = a.querySelector(".qr-nom small");
          if(b){ b.removeAttribute("data-fr"); b.removeAttribute("data-en"); b.textContent = d.nom; }
          if(sous){ sous.removeAttribute("data-fr"); sous.removeAttribute("data-en"); sous.textContent = d.label && d.label !== d.nom ? d.label : ""; }
        }
        a.querySelectorAll("b[data-g]").forEach(function(m){
          var v = d.forfait && d.forfait[m.getAttribute("data-g")];
          m.textContent = v > 0 ? montant(v) : (en ? "to set" : "à fixer");
          m.classList.toggle("demo-a-fixer", !(v > 0));
        });
        grille.appendChild(li);
      });
      var autre = tpl.querySelector(".qr-li-autre");
      if(autre){ var liA = autre.cloneNode(true); brancher(liA, "").classList.add("demo-autre"); grille.appendChild(liA); }

      /* Les deux langues de la page du QR, comme elle le fait elle-même. On
         n'écrit que si le texte change. */
      page.querySelectorAll("[data-fr]").forEach(function(e){
        var t = e.getAttribute(en ? "data-en" : "data-fr");
        if(t !== null && e.textContent !== t) e.textContent = t;
      });
      /* « Prix fixes » au-dessus de cartes « à fixer » se contredisait (recette
         du 8/10/2026) : tant qu'un prix manque, la ligne dit ce que disent les
         cartes. Même longueur, à 390 px elle tient sur une ligne. */
      var toutFixe = h.destinations.every(function(d){ return d.forfait && d.forfait.berline > 0 && d.forfait.van > 0; });
      var cap = page.querySelector(".qr-cap");
      if(cap && !toutFixe){
        var t = cap.textContent.replace("Prix fixes", "Prix à fixer").replace("Fixed prices", "Prices to set");
        if(cap.textContent !== t) cap.textContent = t;
      }
      var aucunPrix = h.destinations.every(function(d){ return !d.forfait; });
      document.getElementById("demoCartesAide").textContent = en ? "Tap a destination to make a test booking, just like your guests."
                                                             : "Touchez une destination pour faire une réservation d’essai, comme vos clients.";
      /* Le lien QR code → cette page est dit au-dessus, dans le fil de la
         démo (demoGuide) ; ici, seulement ce que sont ces prix. */
      document.getElementById("demoCartesFlyer").textContent = en
        ? "These are the prices on your flyer." + (aucunPrix ? " Set them in “Customise my page”." : "")
        : "Ces prix sont ceux de votre flyer." + (aucunPrix ? " Fixez-les dans « Personnaliser ma page »." : "");
    }
  };
`;

function bootstrap(vue) {
  const commun = `var h = HOTELS["demo-hotel"];
    h.nom = window.ELA_DEMO_INFO.etablissement;
    h.court = h.nom;
    try{ sessionStorage.setItem("ela_provenance", h.nom); }catch(e){}`;
  if (vue === 'client') {
    return `/* Démo : l'hôtel vient de la réponse d'« ouvrir », jamais de l'adresse. */
${PERSO}  window.addEventListener("ela:demo-pret", function(){
    ${commun}
    ouvrirModeHotel(h);
    window.ELA_DEMO.habillerHotel();
  });
${SUIVI_BON}`;
  }
  return `/* Démo : la réception de l'hôtel fictif, ouverte sans code. */
${PERSO}  window.addEventListener("ela:demo-pret", function(){
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

function demoiser(html, vue, arrivee) {
  // 1. L'espace et la vue.
  html = html.replace(/<html lang="fr"[^>]*>/, `<html lang="fr" data-ela-space="demo" data-demo-vue="${vue}">`);
  if (!html.includes('data-ela-space="demo"')) throw new Error('construire-demo : balise <html> introuvable');

  // 2. La tête : plus de redirection par paramètre, plus de manifeste,
  //    plus des fichiers du partenaire réel. On pose les nôtres.
  html = html.replace(/<script>\(function\(\)\{try\{var p=new URLSearchParams\(location\.search\);[\s\S]*?<\/script>/g, '');
  /* Le mode hôtel posé en avance (19/10/2026) nomme la clé du partenaire
     réel : la démo s'ouvre sur sa propre fiche, après le serveur, elle n'en
     a pas l'usage — et verifier-demo.mjs refuserait la clé. */
  html = html.replace(/<script id="elaHotelAvance">[\s\S]*?<\/script>/, '');
  html = html.replace(/<style id="elaHotelAvanceStyle">[\s\S]*?<\/style>/, '');
  html = html.replace(/<script>\s*\(function\(\)\{\s*(?:\/\*[\s\S]*?\*\/\s*)?var m = document\.getElementById\("manifeste"\);[\s\S]*?<\/script>\s*/, '');
  html = html.replace(/<link\b[^>]*rel=["']manifest["'][^>]*>\s*/gi, '');
  /* La démo ne mesure rien : pas de collecteur, donc pas d'appel au serveur
     de la mesure (verifier-demo.mjs le refuserait de toute façon). */
  html = html.replace(/<script\b[^>]*src=["']\/?mesure\.js["'][^>]*><\/script>\s*/gi, '');
  html = html.replace(/<base\b[^>]*>\s*/gi, '');
  html = html.replace(/<meta\b[^>]*name=["']apple-mobile-web-app-[^>]*>\s*/gi, '');
  html = html.replace(/<meta\b[^>]*name=["']mobile-web-app-capable["'][^>]*>\s*/gi, '');
  /* LA FINITION DES PAGES D'HÔTEL RESTE (11/10/2026) : elle est commune à
     tous les partenaires et ne nomme plus personne. Le prospect voit
     exactement ce que voit un hôtel partenaire — c'était tout le reproche
     fait à la démo. verifier-demo.mjs la relit comme tout script chargé. */
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

  // 2 bis. L'arrivée du client : la vraie page du QR, fabriquée ci-dessus.
  if (arrivee) {
    html = remplacerUne(html, '<link rel="stylesheet" href="/demo/demo.css">\n',
      '<link rel="stylesheet" href="/demo/demo.css">\n' + arrivee.style, 'style de l\'arrivée');
    html = remplacerUne(html, '<section class="ecran actif" id="ecran-accueil">',
      '<section class="ecran actif" id="ecran-accueil">\n' + arrivee.contenu, 'arrivée');
  }

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

  // 8 bis. Le prospect peut ne fixer QU'UN des deux prix d'une destination :
  //    le moteur écrivait alors « Van » + euros(undefined) et plantait. Le prix
  //    absent se dit « au kilomètre », c'est ce que le moteur facturera.
  html = remplacerUne(html, 'return g.nom + " " + euros(course.forfait[g.cle]);',
    'return g.nom + " " + (typeof course.forfait[g.cle] === "number" ? euros(course.forfait[g.cle]) : (LANGUE === "en" ? "by distance" : "au kilomètre"));',
    'forfait partiel');

  // 9. Le démarrage : plus aucun paramètre d'adresse n'est lu.
  if (vue === 'client') {
    html = remplacerUne(html, 'if(!lireConfirmation()){ if(!lireHotel()) lirePrefillAeroport(); reprendreDepotIncertain(); }', bootstrap('client'), 'bootstrap client');
  } else {
    html = remplacerUne(html, 'lireHotel();\n  ouvrirReception();', bootstrap('reception'), 'bootstrap réception');
    html = html.replace(/<script\b([^>]*)src=["']\/?bon-client\.js["']/gi, '<script$1src="/demo/bon-client.js"');
  }
  return html;
}

const application = lireSortie('application.html');
const client = demoiser(application, 'client', arriveeDepuisPageQr(application));
/* N'importe quelle page de comptoir fait l'affaire : elles ne diffèrent que
   par l'hôtel servi, que la démo remplace. La première, pour être stable. */
const comptoirs = fs.readdirSync(path.join(sortie, 'reception')).filter((d) => fs.existsSync(path.join(sortie, 'reception', d, 'index.html'))).sort();
if (!comptoirs.length) throw new Error('construire-demo : aucune page de comptoir construite dans site/reception/');
const reception = demoiser(lireSortie(path.join('reception', comptoirs[0], 'index.html')), 'reception');

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
