/* =====================================================================
   LE TRAFIC — L'ÉCRAN (15 octobre 2026)
   ---------------------------------------------------------------------
   Barbaros : « ouvrir mon admin et comprendre immédiatement combien de
   personnes visitent Elatransfer, d'où elles viennent, quelles pages
   elles consultent, sur quoi elles cliquent, quelles pages génèrent les
   réservations ». Cet écran DIT ce que le serveur a COMPTÉ : il ne reçoit
   que des agrégats (ela_trafic, ela_trafic_direct), jamais une ligne
   brute, jamais un identifiant, jamais une référence.

   CE N'EST PAS LE TABLEAU DES COURSES. Rien n'est lu au chargement de
   l'admin, rien ne sonne, rien n'est gardé sur l'appareil. On lit à
   l'ouverture, puis une SONDE de 10 s relit le direct (visiteurs actifs,
   jour en cours) — seulement cet écran affiché et l'onglet visible ; dès
   qu'on le quitte, elle s'arrête. L'historique (hier, 7 j, 30 j) se relit
   au changement de période et sur « Actualiser ».

   LES MOTS COMPTENT. Un visiteur est une ESTIMATION, comptée une fois PAR
   JOUR (le serveur n'a qu'une empreinte du jour, sans rien sur l'appareil) ;
   une page vue n'est pas une personne ; une visite est une suite de gestes
   sans pause de 30 min. Les trois sont nommés et distingués, et le visiteur
   porte sa note. Un taux se calcule sur les visiteurs. Sans visiteur, aucun
   pourcentage — « 0 / 0 » ne veut rien dire.
   CE N'EST PAS UNE SECONDE MESURE : c'est le journal de celle du
   14 octobre (mesure.js, le moteur), que le registre lit aussi en compteur
   (« Les pages du site », « Liens des partenaires »).

   TOUT TEXTE PASSE PAR textContent. Le nom d'une page vient du serveur,
   celui d'une source d'une liste fermée ; aucun ne devient une balise.

   LA FRAÎCHEUR SE VOIT : « mesuré il y a 8 s ». Passé 30 s sans réponse,
   le direct passe en gris et le dit. Une erreur est ÉCRITE, et les
   derniers chiffres lus restent affichés, marqués comme tels — jamais une
   page vide qui ressemble à « personne ne vient ».

   Chargé par l'admin seulement : la construction le retire des pages
   publiques (construire-espaces-hotel.mjs). Servi « cache d'abord » :
   toute modification monte CACHE dans sw.js.
   ===================================================================== */
(function(racine){
  "use strict";

  var PAS_SONDE_MS = 10000, FRAIS_MS = 30000;
  var PERIODES = [
    { cle: "direct", libelle: "En direct" },
    { cle: "aujourdhui", libelle: "Aujourd'hui" },
    { cle: "hier", libelle: "Hier" },
    { cle: "7j", libelle: "7 jours" },
    { cle: "30j", libelle: "30 jours" }
  ];
  /* Les pages connues ont un nom lisible ; une page inconnue (une landing
     ajoutée demain) s'affiche par son chemin, elle n'est jamais perdue. */
  var PAGES = {
    "accueil": "Accueil (venue directe)",
    "fr-cdg": "CDG → Paris", "fr-orly": "Orly → Paris", "fr-chauffeur": "Chauffeur privé Paris",
    "en-accueil": "Anglais · Accueil", "en-cdg": "Anglais · CDG → Paris", "en-orly": "Anglais · Orly → Paris",
    "en-disneyland": "Anglais · Disneyland", "en-cdg-orly": "Anglais · CDG ↔ Orly",
    "pro": "Professionnels"
  };
  var SOURCES = {
    google: "Google", google_business: "Fiche Google", direct: "Direct",
    partenaire: "Lien d'un partenaire", whatsapp: "WhatsApp", social: "Réseaux sociaux",
    referent: "Autre site", campagne: "Campagne", autre: "Autre moteur"
  };
  var APPAREILS = { mobile: "Téléphone", tablette: "Tablette", ordinateur: "Ordinateur" };
  var EVENEMENTS = {
    page_vue: "page vue", moteur_ouvert: "moteur ouvert", clic_reserver: "« Book »",
    formulaire_commence: "formulaire", prix_demande: "prix demandé", prix_affiche: "prix affiché",
    demande_envoyee: "réservation", clic_appel: "appel", clic_whatsapp: "WhatsApp"
  };
  var noms;
  try{ noms = new Intl.DisplayNames(["fr"], { type: "region" }); }catch(e){ noms = null; }
  function pays(code){
    if(!code || code === "XX") return "Inconnu";
    try{ return (noms && noms.of(code)) || code; }catch(e){ return code; }
  }
  function nomPage(p){ return PAGES[p] || p || "—"; }
  function nomSource(s){ return SOURCES[s] || s || "—"; }

  var etat = {
    zone: null, periode: "aujourdhui",
    direct: null, directLu: 0, directErreur: null,
    histo: {}, histoLu: {}, histoErreur: null, chargement: false,
    minuterie: null
  };

  /* ═══ OUTILS DE DESSIN ═══ */
  function el(tag, classe, texte){
    var n = document.createElement(tag);
    if(classe) n.className = classe;
    if(texte != null) n.textContent = texte;
    return n;
  }
  function ajout(parent, enfants){
    enfants.forEach(function(c){ if(c) parent.appendChild(c); });
    return parent;
  }
  var NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs){
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function(k){ n.setAttribute(k, attrs[k]); });
    return n;
  }
  function nombre(n){
    n = Number(n) || 0;
    try{ return n.toLocaleString("fr-FR"); }catch(e){ return String(n); }
  }
  function pct(part, total){
    part = Number(part) || 0; total = Number(total) || 0;
    if(!total) return "—";
    var v = part / total * 100;
    return (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10).toLocaleString("fr-FR") + " %";
  }
  function depuis(ms){
    var s = Math.max(0, Math.round(ms / 1000));
    if(s < 60) return "il y a " + s + " s";
    var m = Math.round(s / 60);
    return "il y a " + m + " min";
  }

  /* ═══ LE SERVEUR ═══ */
  function nuage(){ return racine.ELA_NUAGE; }
  function appel(rpc, corps){
    var n = nuage();
    if(!n || !n.connecte || !n.connecte()) return Promise.reject(new Error("pas connecté"));
    return n.appel("/rest/v1/rpc/" + rpc, { method: "POST", body: JSON.stringify(corps || {}) });
  }
  function traduire(e){
    var m = String(e && e.message || e);
    if(/pas connecté|session expiree/.test(m)) return "Connectez-vous au serveur pour voir le trafic.";
    if(/acces_refuse|403|401/.test(m)) return "Cet écran est réservé à l'administrateur.";
    if(/404|PGRST202|ela_trafic/.test(m)) return "La mesure n'est pas encore installée sur le serveur (migration à appliquer).";
    if(/Failed to fetch|NetworkError|abort/i.test(m)) return "Pas de réseau : les chiffres affichés sont les derniers lus.";
    return "Le serveur n'a pas répondu (" + m + ").";
  }

  function lireDirect(){
    return appel("ela_trafic_direct").then(function(d){
      if(!d || typeof d !== "object" || typeof d.en_ligne !== "number") throw new Error("réponse illisible");
      etat.direct = d; etat.directLu = Date.now(); etat.directErreur = null;
    }).catch(function(e){ etat.directErreur = traduire(e); }).then(dessiner);
  }
  function lireHisto(periode){
    etat.chargement = true; dessiner();
    return appel("ela_trafic", { p_periode: periode }).then(function(h){
      if(!h || typeof h !== "object" || !h.totaux) throw new Error("réponse illisible");
      etat.histo[periode] = h; etat.histoLu[periode] = Date.now(); etat.histoErreur = null;
    }).catch(function(e){ etat.histoErreur = traduire(e); })
      .then(function(){ etat.chargement = false; dessiner(); });
  }

  /* ═══ LA SONDE : seulement cet écran affiché, l'onglet visible, connecté ═══ */
  function utile(){
    var ecran = document.getElementById("ecran-trafic");
    return !!(ecran && ecran.classList.contains("actif") && !document.hidden
              && document.body.classList.contains("espace") && nuage() && nuage().connecte && nuage().connecte());
  }
  function demarrerSonde(){
    arreterSonde();
    etat.minuterie = setInterval(function(){
      if(!utile()){ arreterSonde(); return; }
      lireDirect();
    }, PAS_SONDE_MS);
  }
  function arreterSonde(){
    if(etat.minuterie){ clearInterval(etat.minuterie); etat.minuterie = null; }
  }
  document.addEventListener("visibilitychange", function(){
    if(!etat.zone) return;
    if(utile()){ lireDirect(); if(etat.periode !== "direct") lireHisto(etat.periode); demarrerSonde(); }
    else arreterSonde();
  });

  /* ═══ LE DESSIN ═══ */
  function dessiner(){
    var zone = etat.zone;
    if(!zone) return;
    while(zone.firstChild) zone.removeChild(zone.firstChild);
    zone.appendChild(enTete());
    zone.appendChild(filtres());
    if(etat.periode === "direct") zone.appendChild(blocDirect());
    else zone.appendChild(blocHisto());
    zone.appendChild(el("p", "trf-note",
      "Visiteur : estimation, comptée une fois par jour (rien n'est gardé sur l'appareil : sur 7 jours, quelqu'un venu "
      + "trois jours compte trois fois). Page vue : une page affichée. Visite : des gestes sans pause de 30 min. "
      + "Aucun nom, téléphone ni adresse n'est mesuré."));
  }

  function enTete(){
    var d = etat.direct, frais = d && (Date.now() - etat.directLu) < FRAIS_MS;
    var tete = el("div", "trf-tete");
    var pastille = el("div", "trf-direct " + (frais ? "trf-direct-ok" : "trf-direct-gris"));
    var point = el("span", "trf-point");
    var n = frais ? d.en_ligne : null;
    var chiffre = el("span", "trf-direct-n", n === null ? "—" : nombre(n));
    var lib = el("span", "trf-direct-lib", n === null ? "en ligne : non mesuré"
      : (n === 1 ? "visiteur en ligne maintenant" : "visiteurs en ligne maintenant"));
    ajout(pastille, [point, chiffre, lib]);
    var sous = el("p", "trf-fraicheur", etat.directErreur ? etat.directErreur
      : d ? "Mesuré " + depuis(Date.now() - etat.directLu) + " · actif = un geste dans les 5 dernières minutes"
      : "Lecture…");
    if(etat.directErreur) sous.className += " trf-erreur";
    var btn = el("button", "bouton-fantome trf-actualiser", "Actualiser");
    btn.type = "button";
    btn.addEventListener("click", function(){ lireDirect(); if(etat.periode !== "direct") lireHisto(etat.periode); });
    return ajout(tete, [pastille, sous, btn]);
  }

  function filtres(){
    var row = el("div", "trf-filtres");
    row.setAttribute("role", "tablist");
    PERIODES.forEach(function(p){
      var b = el("button", "trf-filtre" + (etat.periode === p.cle ? " actif" : ""), p.libelle);
      b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", etat.periode === p.cle ? "true" : "false");
      b.addEventListener("click", function(){
        etat.periode = p.cle;
        if(p.cle === "direct"){ lireDirect(); }
        else if(!etat.histo[p.cle] || Date.now() - etat.histoLu[p.cle] > FRAIS_MS) lireHisto(p.cle);
        else dessiner();
      });
      row.appendChild(b);
    });
    return row;
  }

  /* Les chiffres-clés : six tuiles, l'ordre dit ce qui compte. */
  function tuiles(t, titre){
    var bloc = el("section", "trf-bloc");
    if(titre) bloc.appendChild(el("h2", "trf-h2", titre));
    var grille = el("div", "trf-tuiles");
    [
      ["Visiteurs", t.visiteurs, "comptés par jour"],
      ["Pages vues", t.pages_vues, nombre(t.visites) + " visites"],
      ["Prix demandés", t.prix, pct(t.prix, t.visiteurs) + " des visiteurs"],
      ["Réservations", t.reservations, pct(t.reservations, t.visiteurs) + " de conversion"],
      ["Appels", t.appels, pct(t.appels, t.visiteurs)],
      ["WhatsApp", t.whatsapp, pct(t.whatsapp, t.visiteurs)]
    ].forEach(function(x){
      var tuile = el("div", "trf-tuile");
      ajout(tuile, [el("span", "trf-tuile-lib", x[0]), el("b", "trf-tuile-n", nombre(x[1])), el("span", "trf-tuile-sous", x[2])]);
      grille.appendChild(tuile);
    });
    bloc.appendChild(grille);
    if(Number(t.confirmees) || Number(t.realisees)){
      bloc.appendChild(el("p", "trf-courses", "Dont " + nombre(t.confirmees) + " confirmée(s) et "
        + nombre(t.realisees) + " réalisée(s), d'après l'état des courses."));
    }
    return bloc;
  }

  function blocDirect(){
    var frag = document.createDocumentFragment();
    var d = etat.direct;
    if(!d){
      frag.appendChild(el("p", "trf-vide", etat.directErreur || "Lecture du direct…"));
      return frag;
    }
    frag.appendChild(tuiles(d.aujourdhui || {}, "Aujourd'hui"));
    var bloc = el("section", "trf-bloc");
    bloc.appendChild(el("h2", "trf-h2", "En ce moment"));
    var actifs = Array.isArray(d.actifs) ? d.actifs : [];
    if(!actifs.length) bloc.appendChild(el("p", "trf-vide", "Personne sur le site dans les 5 dernières minutes."));
    else {
      var ul = el("ul", "trf-actifs");
      actifs.forEach(function(a){
        var li = el("li", "trf-actif");
        ajout(li, [
          el("b", "trf-actif-page", nomPage(a.page)),
          el("span", "trf-actif-detail", [pays(a.pays), (a.langue || "").toUpperCase(), APPAREILS[a.appareil] || a.appareil, nomSource(a.source)].join(" · ")),
          el("span", "trf-actif-geste", (EVENEMENTS[a.dernier] || a.dernier) + " · " + depuis((a.depuis_s || 0) * 1000))
        ]);
        ul.appendChild(li);
      });
      bloc.appendChild(ul);
    }
    frag.appendChild(bloc);
    return frag;
  }

  function blocHisto(){
    var frag = document.createDocumentFragment();
    var h = etat.histo[etat.periode];
    if(etat.histoErreur){
      var err = el("p", "trf-erreur-bloc", etat.histoErreur);
      if(h) err.appendChild(el("span", "trf-erreur-aide", " Les chiffres ci-dessous sont ceux de la dernière lecture réussie."));
      frag.appendChild(err);
    }
    if(etat.chargement && !h){ frag.appendChild(el("p", "trf-vide", "Lecture…")); return frag; }
    if(!h){ if(!etat.histoErreur) frag.appendChild(el("p", "trf-vide", "Aucune donnée.")); return frag; }
    var t = h.totaux || {};
    /* AUJOURD'HUI SUIT LA SONDE. Le direct relit les totaux du jour toutes
       les 10 s (même calcul serveur) : s'ils sont plus récents que
       l'historique, ils le remplacent — un appui sur WhatsApp se voit sans
       relire tout le jour ni rafraîchir. */
    var d = etat.direct;
    if(etat.periode === "aujourdhui" && d && d.aujourdhui && typeof d.aujourdhui === "object"
       && etat.directLu > (etat.histoLu.aujourdhui || 0)){
      t = Object.assign({}, t, d.aujourdhui);
    }
    frag.appendChild(tuiles(t, null));
    frag.appendChild(funnel(t));
    frag.appendChild(serie(h));
    frag.appendChild(tableau("Pages", h.pages, nomPage, true));
    frag.appendChild(tableau("Sources", h.sources, nomSource, false));
    frag.appendChild(tableau("Pages d'entrée", h.entrees, nomPage, false));
    if(Array.isArray(h.liens) && h.liens.length) frag.appendChild(tableau("Liens des partenaires", h.liens, function(v){ return v; }, false));
    frag.appendChild(tableau("Langues", h.langues, function(v){ return (v || "").toUpperCase(); }, false));
    frag.appendChild(tableau("Pays", h.pays, pays, false));
    frag.appendChild(tableau("Appareils", h.appareils, function(v){ return APPAREILS[v] || v; }, false));
    return frag;
  }

  function funnel(t){
    var bloc = el("section", "trf-bloc");
    bloc.appendChild(el("h2", "trf-h2", "Du visiteur à la réservation"));
    var etapes = [["Visiteurs", t.visiteurs], ["Formulaire commencé", t.formulaires], ["Prix demandé", t.prix], ["Réservation envoyée", t.reservations]];
    var max = Math.max(1, Number(t.visiteurs) || 0);
    var ul = el("ol", "trf-funnel");
    etapes.forEach(function(e, i){
      var li = el("li", "trf-etape");
      var barre = el("div", "trf-etape-barre");
      var plein = el("div", "trf-etape-plein");
      plein.style.width = Math.max(2, Math.round((Number(e[1]) || 0) / max * 100)) + "%";
      barre.appendChild(plein);
      ajout(li, [
        el("span", "trf-etape-lib", e[0]),
        barre,
        el("b", "trf-etape-n", nombre(e[1]) + (i ? " · " + pct(e[1], t.visiteurs) : ""))
      ]);
      ul.appendChild(li);
    });
    bloc.appendChild(ul);
    bloc.appendChild(el("p", "trf-funnel-note", "À côté : " + nombre(t.reserver) + " « Book » sur les pages, " + nombre(t.appels) + " appel(s) et " + nombre(t.whatsapp) + " WhatsApp. "
      + "Après un prix affiché : " + pct(t.reservations, t.prix_affiches) + " de réservations."));
    return bloc;
  }

  /* La série : des barres fines, une seule mesure (les visiteurs), le
     chiffre écrit sur la plus haute seulement, et le compte des réservations
     EN TEXTE sous l'axe — pas une seconde couleur. Un survol dit la valeur
     (<title>). SVG maison : aucune bibliothèque. */
  function serie(h){
    var bloc = el("section", "trf-bloc");
    var points = Array.isArray(h.serie) ? h.serie : [];
    bloc.appendChild(el("h2", "trf-h2", h.pas === "hour" ? "Visiteurs par heure" : "Visiteurs par jour"));
    if(!points.length){ bloc.appendChild(el("p", "trf-vide", "Aucune visite sur la période.")); return bloc; }
    /* On complète les trous : une heure sans visite est une barre à zéro,
       pas une heure qui disparaît. */
    var parT = {}; points.forEach(function(p){ parT[p.t] = p; });
    var debut = new Date(h.debut), fin = new Date(h.fin), liste = [];
    var cur = new Date(debut);
    var heure = h.pas === "hour";
    for(var i = 0; i < (heure ? 24 : 31) && cur < fin; i++){
      var t = cleTemps(cur, heure);
      var p = parT[t] || { t: t, visiteurs: 0, reservations: 0 };
      liste.push({ t: t, v: Number(p.visiteurs) || 0, r: Number(p.reservations) || 0, d: new Date(cur) });
      if(heure) cur.setHours(cur.getHours() + 1); else cur.setDate(cur.getDate() + 1);
    }
    var L = 320, H = 120, marge = 16, bas = 28;
    var max = Math.max(1, Math.max.apply(null, liste.map(function(x){ return x.v; })));
    var s = svg("svg", { viewBox: "0 0 " + L + " " + H, class: "trf-serie", role: "img" });
    s.appendChild(svg("title", {})).textContent = "Visiteurs " + (heure ? "par heure" : "par jour");
    var n = liste.length, pas = (L - 2) / n, larg = Math.max(2, pas - 2);
    var iMax = -1; liste.forEach(function(x, i){ if(x.v === max && iMax === -1) iMax = i; });
    /* LES ÉTIQUETTES DE L'AXE NE SE CHEVAUCHENT PAS : la dernière barre
       (l'heure en cours) garde la sienne, et une étiquette trop proche de la
       précédente cède sa place — « 12 h » et « 13 h » côte à côte se
       lisaient « 12 h13 h » (vu sur la capture à 1366 px). */
    var ECART_AXE = 34, axe = [];
    liste.forEach(function(x, i){
      if(i === 0 || i === n - 1 || (heure ? x.d.getHours() % 6 === 0 : (n <= 7 || x.d.getDate() % 7 === 1))) axe.push(i);
    });
    if(axe.length > 1 && (axe[axe.length - 1] - axe[axe.length - 2]) * pas < ECART_AXE) axe.splice(axe.length - 2, 1);
    var gardes = {}, dernierAxe = -Infinity;
    axe.forEach(function(i){ if(i === n - 1 || (i - dernierAxe) * pas >= ECART_AXE){ gardes[i] = true; dernierAxe = i; } });
    liste.forEach(function(x, i){
      var hb = Math.round((x.v / max) * (H - marge - bas));
      var y = H - bas - hb, xpos = 1 + i * pas;
      var r = svg("rect", { x: xpos, y: y, width: larg, height: Math.max(hb, x.v ? 2 : 1), rx: 2, class: x.v ? "trf-barre" : "trf-barre-vide" });
      var titre = svg("title", {});
      titre.textContent = etiquette(x.d, heure) + " : " + x.v + " visiteur(s)" + (x.r ? ", " + x.r + " réservation(s)" : "");
      r.appendChild(titre);
      s.appendChild(r);
      if(i === iMax && x.v){
        var txt = svg("text", { x: xpos + larg / 2, y: Math.max(10, y - 4), "text-anchor": "middle", class: "trf-serie-val" });
        txt.textContent = String(x.v); s.appendChild(txt);
      }
      if(x.r){
        var tr = svg("text", { x: xpos + larg / 2, y: H - bas + 11, "text-anchor": "middle", class: "trf-serie-res" });
        tr.textContent = String(x.r); s.appendChild(tr);
      }
      if(gardes[i]){
        var ax = svg("text", { x: xpos + larg / 2, y: H - 2, "text-anchor": i === 0 ? "start" : i === n - 1 ? "end" : "middle", class: "trf-serie-axe" });
        ax.textContent = etiquette(x.d, heure, true); s.appendChild(ax);
      }
    });
    bloc.appendChild(s);
    bloc.appendChild(el("p", "trf-serie-legende", "Barres : visiteurs. Sous l'axe : les réservations envoyées, en chiffres."));
    return bloc;
  }
  function cleTemps(d, heure){
    var pad = function(n){ return (n < 10 ? "0" : "") + n; };
    /* La clé du serveur est à l'heure de Paris ; l'admin aussi, c'est le
       téléphone de Barbaros. */
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + (heure ? pad(d.getHours()) : "00") + ":00";
  }
  function etiquette(d, heure, court){
    try{
      if(heure) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: court ? undefined : "2-digit" }).replace(":00", " h").replace(/^(\d{2})$/, "$1 h");
      return d.toLocaleDateString("fr-FR", court ? { day: "numeric", month: "numeric" } : { weekday: "short", day: "numeric", month: "short" });
    }catch(e){ return ""; }
  }

  /* Un tableau « valeur → chiffres », en CARTES sur téléphone, en vraies
     colonnes sur ordinateur (la feuille de style s'en charge). Pour les
     pages, un second tri : « qui convertit le mieux » n'est pas « qui est le
     plus visité ». */
  var triPages = "visiteurs";
  function tableau(titre, lignes, nom, triable){
    var bloc = el("section", "trf-bloc");
    var tete = el("div", "trf-bloc-tete");
    tete.appendChild(el("h2", "trf-h2", titre));
    lignes = Array.isArray(lignes) ? lignes.slice() : [];
    if(triable){
      var sel = el("div", "trf-tri");
      [["visiteurs", "Les plus visitées"], ["conversion", "Qui convertissent le mieux"]].forEach(function(o){
        var b = el("button", "trf-tri-b" + (triPages === o[0] ? " actif" : ""), o[1]);
        b.type = "button";
        b.addEventListener("click", function(){ triPages = o[0]; dessiner(); });
        sel.appendChild(b);
      });
      tete.appendChild(sel);
      if(triPages === "conversion"){
        lignes.sort(function(a, b){
          var ta = a.totaux || {}, tb = b.totaux || {};
          var ca = ta.visiteurs ? (ta.reservations + ta.appels + ta.whatsapp) / ta.visiteurs : 0;
          var cb = tb.visiteurs ? (tb.reservations + tb.appels + tb.whatsapp) / tb.visiteurs : 0;
          return cb - ca || (tb.visiteurs - ta.visiteurs);
        });
      }
    }
    bloc.appendChild(tete);
    if(!lignes.length){ bloc.appendChild(el("p", "trf-vide", "Rien sur la période.")); return bloc; }
    var table = el("table", "trf-table");
    var thead = el("thead"), trh = el("tr");
    [({ "Pages": "Page", "Pages d'entrée": "Page", "Sources": "Source", "Langues": "Langue", "Pays": "Pays",
       "Appareils": "Appareil", "Liens des partenaires": "Lien" })[titre] || titre, "Visiteurs", "Vues", "Prix", "Appels", "WhatsApp", "Réserv.", "Conv."].forEach(function(c){
      trh.appendChild(el("th", null, c));
    });
    thead.appendChild(trh); table.appendChild(thead);
    var tbody = el("tbody");
    lignes.forEach(function(l){
      var t = l.totaux || {}, tr = el("tr");
      var cellules = [
        [nom(l.valeur), "trf-c-nom", "Page"], [t.visiteurs, "", "Visiteurs"], [t.pages_vues, "", "Vues"], [t.prix, "", "Prix"],
        [t.appels, "", "Appels"], [t.whatsapp, "", "WhatsApp"], [t.reservations, "trf-c-res", "Réserv."],
        [pct(t.reservations, t.visiteurs), "trf-c-conv", "Conv."]
      ];
      cellules.forEach(function(c, i){
        var td = el("td", c[1], i === 0 || i === 7 ? c[0] : nombre(c[0]));
        td.setAttribute("data-col", c[2]);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    bloc.appendChild(table);
    return bloc;
  }

  /* ═══ OUVRIR / FERMER ═══ */
  function ouvrir(zone){
    if(!zone) return;
    etat.zone = zone;
    dessiner();
    lireDirect();
    if(etat.periode !== "direct") lireHisto(etat.periode);
    demarrerSonde();
  }
  function fermer(){ arreterSonde(); }

  racine.ELA_TRAFIC = { ouvrir: ouvrir, fermer: fermer, PERIODES: PERIODES, SOURCES: SOURCES, PAGES: PAGES,
    PAS_SONDE_MS: PAS_SONDE_MS, _etat: etat };
})(typeof window !== "undefined" ? window : globalThis);
