/* =====================================================================
   DEMO-SIMULATEUR.JS — la démo /demo/hotel/, sans aucun serveur de course
   ---------------------------------------------------------------------
   Octobre 2026, mission « Démo professionnels », bloc 3. Un hôtel, une
   agence ou une entreprise essaie Elatransfer « en vrai » : il réserve
   comme un client, et voit la course arriver chez sa réception.

   L'ISOLATION EST STRUCTURELLE, PAS UNE POLITESSE. Ce fichier REMPLACE la
   couche serveur du moteur (`nuage` : dépôt, état, liste de la réception).
   La construction (construire-demo.mjs) retire de la page tout ce qui
   parle à Supabase, et vérifier-demo.mjs fait échouer la publication si
   une seule trace revient. Ici, tout vit dans le stockage du navigateur.
   Le seul appel réseau de ce fichier est « ouvrir » vers demande-demo,
   qui dit si la session du prospect est valable — et il ne porte aucune
   clé Supabase : la fonction fait ses propres contrôles.

   FERMÉ PAR DÉFAUT. La page reste masquée tant que « ouvrir » n'a pas dit
   oui. Pas de session ou session refusée : retour au formulaire. Serveur
   muet : « Démonstration momentanément indisponible », jamais la démo.

   LE NOM DE L'ÉTABLISSEMENT VIENT DE LA RÉPONSE D'« ouvrir », jamais de
   l'adresse de la page, et il est posé en textContent : un nom saisi
   avec des chevrons reste du texte.
   ===================================================================== */
(function(){
  "use strict";

  var URL_DEMANDE = "https://yyhzutnuhuytokarynaw.supabase.co/functions/v1/demande-demo";
  var CLE_SESSION = "ela_demo_session";
  var CLE_ETAT = "ela_demo_simulateur";
  var PREFIXE = "ela_demo__";
  var NOM_REPLI = "Hôtel Démo · Roissy";
  var CONTACT = "/professionnels/#contact";
  var FORMULAIRE = "/professionnels/#demo";
  /* Les quatre étapes, en accéléré : secondes écoulées depuis la demande. */
  var SEUILS = [0, 6, 14, 30];

  var racine = document.documentElement;
  racine.classList.add("demo-attente");

  /* ═══ LE STOCKAGE DE LA DÉMO EST À PART ═══
     La démo est servie sur le même domaine que le site : sans préfixe,
     ses courses fictives apparaîtraient dans « Mes réservations » d'un vrai
     client sur le même téléphone, et l'inverse. La construction remplace
     chaque « localStorage » du moteur par ce stockage préfixé. */
  function vrai(){ try{ return window.localStorage; }catch(e){ return null; } }
  var memoire = {};
  var stockage = {
    getItem: function(k){
      var s = vrai();
      try{ if(s){ var v = s.getItem(PREFIXE + k); return v; } }catch(e){}
      return Object.prototype.hasOwnProperty.call(memoire, k) ? memoire[k] : null;
    },
    setItem: function(k, v){
      var s = vrai(); v = String(v);
      try{ if(s){ s.setItem(PREFIXE + k, v); return; } }catch(e){}
      memoire[k] = v;
    },
    removeItem: function(k){
      var s = vrai();
      try{ if(s) s.removeItem(PREFIXE + k); }catch(e){}
      delete memoire[k];
    }
  };
  window.ELA_DEMO_STOCKAGE = stockage;

  function texte(fr, en){ return (racine.lang === "en") ? en : fr; }

  /* ═══ L'ÉTAT DU SIMULATEUR ═══ */
  function lire(){
    try{
      var e = JSON.parse(stockage.getItem(CLE_ETAT) || "null");
      if(e && Array.isArray(e.courses)) return e;
    }catch(err){}
    return null;
  }
  function ecrire(e){ try{ stockage.setItem(CLE_ETAT, JSON.stringify(e)); }catch(err){} }

  function jour(decalage){
    var d = new Date(Date.now() + decalage * 86400000);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")
      + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* Trois courses fictives, pour que la réception ne s'ouvre pas sur une
     liste vide. Les noms et numéros sont fictifs (06 39 98 : plage réservée
     aux œuvres de fiction). */
  function semer(){
    var adresse = "Hôtel — " + NOM_REPLI;
    /* AUCUN PRIX N'EST ÉCRIT DANS LES COURSES D'EXEMPLE : il vient des prix
       que le prospect a fixés (destCle + gamme), et la ligne n'en montre pas
       tant qu'il n'en a fixé aucun. */
    function c(ref, statut, j, heure, arrivee, nom, chambre, destCle, gamme, veh){
      return { ref: ref, cree: Date.now() - 86400000, avance: 0, fixe: statut, destCle: destCle, gamme: gamme,
        bon: { ref: ref, statut: statut, provenanceCle: "demo-hotel", parReception: true,
          client: { nom: nom, telephone: "+33 6 39 98 00 1" + ref.slice(-1) },
          paiement: "carte", paiementNom: "Carte bancaire",
          course: { date: jour(j), heure: heure, depart: adresse, departPublic: adresse,
                    arrivee: arrivee, vehicule: veh, chambre: chambre },
          prix: { total: 0 } } };
    }
    return { version: 1, courses: [
      c("ELA-DEMO-00003", "confirmee", 1, "06:30", "Aéroport CDG — Terminal 2E", "Mme Laurent (exemple)", "214", "cdg", "berline", "Berline"),
      c("ELA-DEMO-00002", "attente", 0, "18:15", "Orly", "M. Dubois (exemple)", "108", "orly", "van", "Van"),
      c("ELA-DEMO-00001", "realisee", -1, "09:00", "Paris — Gare de Lyon", "Mme Bernard (exemple)", "305", "paris", "berline", "Berline")
    ] };
  }

  function etat(){
    var e = lire();
    if(!e){ e = semer(); ecrire(e); }
    return e;
  }

  function etape(c){
    if(c.fixe) return { attente: 0, confirmee: 2, realisee: 3 }[c.fixe] || 0;
    var s = (Date.now() - c.cree) / 1000, i = 0;
    for(var k = 0; k < SEUILS.length; k++) if(s >= SEUILS[k]) i = k;
    return Math.min(3, Math.max(i, c.avance || 0));
  }
  function statutDe(n){ return n >= 3 ? "realisee" : n === 2 ? "confirmee" : "attente"; }
  var CHAUFFEUR = { nom: "Karim — chauffeur fictif", telephone: "+33 6 39 98 00 42" };

  function vueCourse(c){
    var n = etape(c), st = statutDe(n), b = c.bon || {}, co = b.course || {}, cl = b.client || {};
    var v = { ref: c.ref, statut: st, date: String(co.date || ""), heure: String(co.heure || ""),
      depart: String(co.departPublic || co.depart || ""), arrivee: String(co.arrivee || ""),
      vehicule: String(co.vehicule || ""), client: String(cl.nom || ""), tel: String(cl.telephone || ""),
      chambre: String(co.chambre || ""), note: String(co.note || ""),
      paiement: String(b.paiementNom || b.paiement || ""), modifie: "",
      chauffeur: n >= 2 ? { nom: CHAUFFEUR.nom, telephone: CHAUFFEUR.telephone } : { nom: "", telephone: "" } };
    if(c.fixe){
      var fix = ((lirePerso().prix || {})[c.destCle] || {})[c.gamme];
      if(n < 3 && fix > 0) v.prix = fix;
    } else if(n < 3) v.prix = Number(b.prix && b.prix.total) || 0;
    return v;
  }

  function attendre(ms, valeur){
    return new Promise(function(ok){ setTimeout(function(){ ok(valeur); }, ms); });
  }

  /* ═══ LE FAUX « nuage » ═══
     Mêmes noms, mêmes formes de réponse que le vrai : le moteur ne voit
     pas la différence, et c'est ce qui rend la démo fidèle. Aucune de ces
     fonctions ne touche le réseau. */
  var nuage = {
    actif: function(){ return true; },
    connecte: function(){ return false; },
    appel: function(){ return Promise.reject(new Error("demo")); },
    deposer: function(bon){
      if(!bon || !bon.ref) return Promise.resolve(false);
      var e = etat();
      var copie = JSON.parse(JSON.stringify(bon));
      copie.provenanceCle = "demo-hotel";
      e.courses = e.courses.filter(function(c){ return c.ref !== bon.ref; });
      e.courses.unshift({ ref: bon.ref, cree: Date.now(), avance: 0, bon: copie });
      e.derniere = bon.ref;
      ecrire(e);
      dessinerSuivi();
      return attendre(350, true);
    },
    etat: function(ref){
      var c = etat().courses.filter(function(x){ return x.ref === ref; })[0];
      if(!c) return Promise.resolve(null);
      var v = vueCourse(c);
      return attendre(120, { statut: v.statut, chauffeur: v.chauffeur });
    },
    coursesHotel: function(cle){
      var e = etat();
      return attendre(200, { hotel: cle, session: "demo.session",
        courses: e.courses.map(vueCourse) });
    }
  };
  window.ELA_DEMO_NUAGE = nuage;

  /* Rien ne s'ouvre vers WhatsApp, Telegram ou une autre application. */
  window.open = function(){ dire(texte("Démonstration : rien n'est envoyé.", "Demo: nothing is sent.")); return null; };

  /* ═══ L'ÉTAPE SUIVANTE ═══ */
  function courseSuivie(){
    var e = etat(), c = null;
    if(e.derniere) c = e.courses.filter(function(x){ return x.ref === e.derniere; })[0] || null;
    return c;
  }
  function avancer(){
    var e = etat(), c = null;
    for(var i = 0; i < e.courses.length; i++) if(e.courses[i].ref === e.derniere) c = e.courses[i];
    if(!c) return;
    c.avance = Math.min(3, etape(c) + 1);
    ecrire(e);
    dessinerSuivi();
    try{ window.dispatchEvent(new CustomEvent("ela:demo-etape")); }catch(err){}
  }

  /* ═══ CE QUI ENTOURE LA DÉMO : bandeau, onglets, suivi, fin ═══ */
  var info = null;
  function initiales(nom){
    var PETITS = ["le", "la", "les", "l", "de", "du", "des", "d", "et", "the", "of", "a", "au", "aux"];
    var tous = String(nom || "").replace(/[^\p{L}\p{N} ]+/gu, " ").trim().split(/\s+/).filter(Boolean);
    var mots = tous.filter(function(m){ return PETITS.indexOf(m.toLowerCase()) < 0; });
    if(!mots.length) mots = tous;
    var i = mots.slice(0, 2).map(function(m){ return m.charAt(0); }).join("");
    return (i || "H").toUpperCase();
  }
  function equipe(){ return info && info.type !== "hotel"; }

  function el(tag, classe, contenu){
    var n = document.createElement(tag);
    if(classe) n.className = classe;
    if(contenu != null) n.textContent = contenu;
    return n;
  }

  function dire(phrase){
    var t = document.getElementById("demoToast");
    if(!t){ t = el("p", "demo-toast"); t.id = "demoToast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = phrase;
    t.hidden = false;
    clearTimeout(dire._m);
    dire._m = setTimeout(function(){ t.hidden = true; }, 3200);
  }

  var ETAPES = [["Demande reçue", "Request received"], ["Chauffeur recherché", "Finding a driver"],
                ["Chauffeur confirmé", "Driver confirmed"], ["Effectuée", "Completed"]];

  function dessinerSuivi(){
    var boite = document.getElementById("demoSuivi");
    if(!boite) return;
    var c = courseSuivie();
    boite.hidden = !c;
    if(!c) return;
    var n = etape(c);
    boite.querySelector(".demo-suivi-titre").textContent =
      texte("Suivi de votre réservation d'essai", "Your test booking") + " · " + c.ref;
    var liste = boite.querySelector(".demo-etapes");
    liste.textContent = "";
    ETAPES.forEach(function(e, i){
      var li = el("li", i < n ? "fait" : i === n ? "en-cours" : "", texte(e[0], e[1]));
      if(i === n) li.setAttribute("aria-current", "step");
      liste.appendChild(li);
    });
    var b = boite.querySelector(".demo-suivant");
    b.hidden = n >= 3;
    b.textContent = texte("Étape suivante", "Next step");
    var fin = boite.querySelector(".demo-fin");
    fin.hidden = n < 3;
  }

  function construireCadre(){
    var page = racine.getAttribute("data-demo-vue") || "client";
    var haut = el("div", "demo-cadre");
    haut.id = "demoCadre";
    var onglets = el("nav", "demo-onglets");
    onglets.setAttribute("aria-label", "Vues de la démonstration");
    var a1 = el("a", "demo-onglet" + (page === "client" ? " actif" : ""));
    a1.href = "/demo/hotel/"; a1.id = "demoOngletClient";
    var a2 = el("a", "demo-onglet" + (page === "reception" ? " actif" : ""));
    a2.href = "/demo/hotel/reception/"; a2.id = "demoOngletReception";
    if(page === "client") a1.setAttribute("aria-current", "page"); else a2.setAttribute("aria-current", "page");
    onglets.appendChild(a1); onglets.appendChild(a2);
    haut.appendChild(onglets);
    haut.appendChild(construirePanneau());

    var suivi = el("section", "demo-suivi");
    suivi.id = "demoSuivi"; suivi.hidden = true;
    suivi.appendChild(el("p", "demo-suivi-titre"));
    suivi.appendChild(el("ol", "demo-etapes"));
    var suivant = el("button", "demo-suivant"); suivant.type = "button";
    suivant.addEventListener("click", avancer);
    suivi.appendChild(suivant);
    var fin = el("div", "demo-fin"); fin.hidden = true;
    fin.appendChild(el("p", "demo-fin-texte"));
    var lien = el("a", "demo-fin-bouton"); lien.href = CONTACT; lien.id = "demoMettreEnPlace";
    fin.appendChild(lien);
    suivi.appendChild(fin);
    haut.appendChild(suivi);

    document.body.insertBefore(haut, document.body.firstChild);
    /* Le bandeau est À PART, seul collé en haut : sur un téléphone, les
       onglets et le suivi collés avec lui mangeraient le quart de l'écran. */
    var bandeau = el("p", "demo-bandeau");
    bandeau.id = "demoBandeau";
    bandeau.setAttribute("role", "note");
    document.body.insertBefore(bandeau, haut);

    var pied = el("section", "demo-pied");
    pied.id = "demoPied";
    pied.appendChild(el("p", "demo-pied-titre"));
    pied.appendChild(el("p", "demo-pied-texte"));
    var qr = el("div", "demo-qr"); qr.id = "demoQr";
    pied.appendChild(qr);
    var b2 = el("a", "demo-fin-bouton"); b2.href = CONTACT; b2.id = "demoMettreEnPlacePied";
    pied.appendChild(b2);
    document.body.appendChild(pied);
    try{
      if(window.ELA_QR && window.ELA_QR.svg) qr.innerHTML = window.ELA_QR.svg("https://elatransfer.com/professionnels/", 150);
    }catch(e){}
    ecrireTextes();
  }

  function ecrireTextes(){
    var b = document.getElementById("demoBandeau");
    if(!b) return;
    b.textContent = texte("Démonstration — aucune réservation réelle", "Demo — no real booking");
    document.getElementById("demoOngletClient").textContent = texte("Ce que voit votre client", "What your guest sees");
    document.getElementById("demoOngletReception").textContent = equipe()
      ? texte("Ce que voit votre équipe", "What your team sees")
      : texte("Ce que voit votre réception", "What your front desk sees");
    var p = document.getElementById("demoPied");
    p.querySelector(".demo-pied-titre").textContent = texte("Votre QR code, à poser au comptoir", "Your QR code, for the desk");
    p.querySelector(".demo-pied-texte").textContent = equipe()
      ? texte("Vos clients le scannent et réservent. Votre équipe suit chaque course.", "Clients scan it and book. Your team follows every ride.")
      : texte("Vos clients le scannent et réservent. Votre réception suit chaque course.", "Guests scan it and book. Your front desk follows every ride.");
    var mettre = texte("Mettre ça en place pour mon établissement", "Set this up for my business");
    document.getElementById("demoMettreEnPlace").textContent = mettre;
    document.getElementById("demoMettreEnPlacePied").textContent = mettre;
    document.querySelector("#demoSuivi .demo-fin-texte").textContent =
      texte("C'est tout : la course est faite, et rien n'a été réservé pour de vrai.", "That's it: the ride is done, and nothing was really booked.");
    var exemple = document.getElementById("demoExemple");
    if(exemple) exemple.textContent = texte("Vos prix : ceux de votre flyer", "Your prices: the ones on your flyer");
    var photo = document.getElementById("demoPhotoTexte");
    if(photo){
      photo.textContent = texte("Votre photo ici", "Your photo here");
      photo.parentNode.setAttribute("aria-label", texte("Choisir la photo de votre établissement", "Choose a photo of your business"));
    }
    traduire(document.getElementById("demoPerso"));
    dessinerPrix();
    try{ if(window.ELA_DEMO_PAGE && window.ELA_DEMO_PAGE.dessinerCartes) window.ELA_DEMO_PAGE.dessinerCartes(); }catch(e){}
    dessinerSuivi();
  }

  /* Le nom, les initiales et la zone photo, dans l'en-tête de l'hôtel. */
  function habillerHotel(){
    var tete = document.getElementById("hotelTete");
    if(!tete || document.getElementById("demoMarque")) return;
    var marque = el("div", "demo-marque"); marque.id = "demoMarque";
    var rond = el("span", "demo-initiales", initiales(info.etablissement));
    rond.setAttribute("aria-hidden", "true");
    marque.appendChild(rond);
    var photo = el("div", "demo-photo");
    photo.setAttribute("role", "button"); photo.tabIndex = 0;
    photo.appendChild(el("span", "", ""));
    photo.firstChild.id = "demoPhotoTexte";
    marque.appendChild(photo);
    tete.insertBefore(marque, tete.firstChild);
    var nomHotel = document.getElementById("hotelTeteNom");
    var message = el("p", "demo-message"); message.id = "demoMessage"; message.hidden = true;
    if(nomHotel && nomHotel.parentNode === tete) tete.insertBefore(message, nomHotel.nextSibling);
    var exemple = el("p", "demo-exemple"); exemple.id = "demoExemple";
    var sur = tete.querySelector(".hotel-sur");
    if(sur && sur.nextSibling) tete.insertBefore(exemple, sur.nextSibling); else tete.appendChild(exemple);
    ecrireTextes();
    appliquerPerso();
  }

  /* ═══ LA PERSONNALISATION ═══
     8 octobre 2026, à la demande de Barbaros : le prospect essaie SA page —
     son nom, sa couleur, sa photo, un message d'accueil, ses destinations.
     TOUT RESTE DANS SON NAVIGATEUR : rien n'est envoyé, la photo non plus.
     Les textes saisis sont posés en textContent, jamais interprétés. */
  var CLE_PERSO = "ela_demo_perso";
  var MAX_DEST = 4;
  /* Les couleurs de l'hôtel fictif (celles de HOTELS_DEMO dans construire-demo.mjs). */
  var MARQUE_ORIGINE = { charbon:"#062F55", vif:"#D7EAFB", bouton:"#0E6FC7", pale:"#E8F2FD", paleEncre:"#0A4F91" };
  var photoMemoire = "";
  var NUANCIER = [["#0E6FC7", "Bleu", "Blue"], ["#8B1E3F", "Bordeaux", "Burgundy"],
                  ["#1F6B4F", "Vert sapin", "Forest green"], ["#9A6A1F", "Or", "Gold"],
                  ["#2F3A45", "Anthracite", "Charcoal"], ["#5B3FA0", "Violet", "Purple"]];

  function lirePerso(){
    try{
      var p = JSON.parse(stockage.getItem(CLE_PERSO) || "null");
      if(p && typeof p === "object"){
        (p.destinations || []).forEach(function(d, i){ if(!d.id) d.id = "d" + i; });
        return p;
      }
    }catch(e){}
    return {};
  }
  function ecrirePerso(p){
    try{ stockage.setItem(CLE_PERSO, JSON.stringify(p)); return true; }catch(e){ return false; }
  }

  /* LES COULEURS SONT CALCULÉES, PAS PRISES TELLES QUELLES : un jaune clair
     choisi par le prospect donnerait un bouton illisible. On assombrit
     jusqu'à 4,5:1 avec le blanc (WCAG AA), et le fond de l'en-tête est la
     même teinte très éclaircie, sous une encre sombre. */
  function hexVersRvb(h){ var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rvbVersHex(c){ return "#" + c.map(function(x){ return Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0"); }).join(""); }
  function lum(c){ var t = c.map(function(v){ v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
                   return .2126 * t[0] + .7152 * t[1] + .0722 * t[2]; }
  function contraste(a, b){ var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function melanger(c, cible, k){ return c.map(function(v, i){ return v + (cible[i] - v) * k; }); }
  function couleurs(hex){
    if(!/^#[0-9a-f]{6}$/i.test(hex || "")) return null;
    var c = hexVersRvb(hex), blanc = [255, 255, 255], noir = [0, 0, 0];
    var bouton = c, k = 0;
    while(contraste(bouton, blanc) < 4.6 && k < 1){ k += .04; bouton = melanger(c, noir, k); }
    var vif = melanger(c, blanc, .84), charbon = melanger(c, noir, .72);
    k = .72;
    while(contraste(charbon, vif) < 7.5 && k < 1){ k += .04; charbon = melanger(c, noir, k); }
    return { bouton: rvbVersHex(bouton), vif: rvbVersHex(vif), charbon: rvbVersHex(charbon),
             pale: rvbVersHex(melanger(c, blanc, .9)), paleEncre: rvbVersHex(melanger(c, noir, .6)) };
  }

  function appliquerPerso(){
    if(!info) return;
    var p = lirePerso();
    var nom = p.nom || info.etablissement;
    var rond = document.querySelector(".demo-initiales");
    if(rond) rond.textContent = initiales(nom);
    var c = couleurs(p.couleur);
    if(c) Object.keys(c).forEach(function(k){ racine.style.setProperty("--h-" + k, c[k]); });
    var cadre = document.querySelector(".demo-photo");
    var photo = p.photo || photoMemoire;
    if(cadre){
      cadre.style.backgroundImage = photo ? "url(\"" + photo + "\")" : "";
      cadre.classList.toggle("avec-photo", !!photo);
    }
    var msg = document.getElementById("demoMessage");
    if(msg){ msg.textContent = p.message || ""; msg.hidden = !p.message; }
    try{ if(window.ELA_DEMO_PAGE) window.ELA_DEMO_PAGE.appliquer({ nom: p.nom, destinations: p.destinations, prix: p.prix }); }
    catch(e){ /* la page n'a pas d'hôtel ouvert : rien à repeindre */ }
    dessinerListeDest();
    dessinerPrix();
  }

  function modifier(f){ var p = lirePerso(); f(p); var ok = ecrirePerso(p); appliquerPerso(); return ok; }

  function bilingue(tag, classe, fr, en){
    var n = el(tag, classe); n.setAttribute("data-demo-fr", fr); n.setAttribute("data-demo-en", en); return n;
  }
  function traduire(racineEl){
    (racineEl || document).querySelectorAll("[data-demo-fr]").forEach(function(n){
      var t = texte(n.getAttribute("data-demo-fr"), n.getAttribute("data-demo-en"));
      if(n.tagName === "INPUT" || n.tagName === "TEXTAREA") n.placeholder = t; else n.textContent = t;
    });
  }
  function direPerso(fr, en){
    var m = document.getElementById("demoPersoEtat");
    if(m){ m.textContent = fr ? texte(fr, en) : ""; m.hidden = !fr; }
  }

  function champ(libelleFr, libelleEn, controle){
    var l = el("label", "demo-champ");
    l.appendChild(bilingue("span", "demo-champ-titre", libelleFr, libelleEn));
    l.appendChild(controle);
    return l;
  }

  function dessinerListeDest(){
    var ul = document.getElementById("demoDestListe");
    if(!ul) return;
    var p = lirePerso(), liste = p.destinations || [];
    ul.textContent = "";
    liste.forEach(function(d, i){
      var li = el("li", "demo-dest");
      li.appendChild(el("span", "demo-dest-nom", d.nom));
      var x = bilingue("button", "demo-dest-retirer", "Retirer", "Remove"); x.type = "button";
      x.addEventListener("click", function(){ modifier(function(q){
        q.destinations = (q.destinations || []).filter(function(y){ return y.id !== d.id; });
        if(q.prix) delete q.prix["perso-" + d.id];
      }); });
      li.appendChild(x);
      ul.appendChild(li);
    });
    traduire(ul);
    var ajout = document.getElementById("demoDestAjouter");
    if(ajout) ajout.disabled = liste.length >= MAX_DEST;
  }

  /* La photo est RÉDUITE dans le navigateur (1000 px au plus) : une photo de
     téléphone de 4 Mo ne tiendrait pas dans le stockage, et elle n'a pas à
     voyager — elle ne quitte jamais l'appareil. */
  function lirePhoto(fichier){
    if(!fichier) return;
    if(!/^image\/(jpeg|png|webp|gif)$/.test(fichier.type) || fichier.size > 15e6){
      direPerso("Choisissez une image (JPEG, PNG ou WebP, 15 Mo au plus).", "Choose an image (JPEG, PNG or WebP, 15 MB max).");
      return;
    }
    var lecteur = new FileReader();
    lecteur.onload = function(){
      var img = new Image();
      img.onload = function(){
        var r = Math.min(1, 1000 / Math.max(img.width, img.height));
        var cv = document.createElement("canvas");
        cv.width = Math.round(img.width * r); cv.height = Math.round(img.height * r);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        var url = cv.toDataURL("image/jpeg", .82);
        photoMemoire = url;
        var ok = modifier(function(p){ p.photo = url; });
        if(!ok){
          modifier(function(p){ delete p.photo; });
          direPerso("Photo affichée, mais trop lourde pour être gardée : elle disparaîtra en changeant de page.",
                    "Photo shown, but too large to keep: it will disappear when you change page.");
        } else {
          direPerso("Photo ajoutée. Elle reste sur votre appareil, rien n'est envoyé.",
                    "Photo added. It stays on your device; nothing is sent.");
        }
      };
      img.onerror = function(){ direPerso("Cette image ne s'ouvre pas.", "This image cannot be opened."); };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(fichier);
  }

  function ajouterDestination(){
    var nom = document.getElementById("demoDestNom").value.replace(/\s+/g, " ").trim().slice(0, 50);
    var berline = Math.round(Number(document.getElementById("demoDestBerline").value));
    var van = Math.round(Number(document.getElementById("demoDestVan").value));
    if(nom.length < 2){ direPerso("Indiquez un lieu, par exemple « Stade de France ».", "Enter a place, e.g. “Stade de France”."); return; }
    /* Les prix sont FACULTATIFS ici : ils se fixent aussi plus tard, dans
       « Vos prix ». Mais un prix écrit doit être un vrai prix. */
    var videB = document.getElementById("demoDestBerline").value.trim() === "";
    var videV = document.getElementById("demoDestVan").value.trim() === "";
    if((!videB && !(berline >= 1 && berline <= 2000)) || (!videV && !(van >= 1 && van <= 2000))){
      direPerso("Indiquez un prix entre 1 et 2 000 €, ou laissez la case vide.", "Enter a price between €1 and €2,000, or leave it empty."); return;
    }
    if((lirePerso().destinations || []).length >= MAX_DEST){ direPerso("Quatre destinations au plus dans la démo.", "Four destinations at most in the demo."); return; }
    var bouton = document.getElementById("demoDestAjouter");
    bouton.disabled = true;
    direPerso("Recherche du lieu…", "Finding the place…");
    var trouver = (window.ELA_ROUTE && window.ELA_ROUTE.lieu) ? window.ELA_ROUTE.lieu(nom) : Promise.resolve(null);
    trouver.then(function(l){
      bouton.disabled = false;
      if(!l || !isFinite(l.lat) || !isFinite(l.lon)){
        direPerso("Lieu introuvable : précisez la ville, par exemple « Stade de France, Saint-Denis ».",
                  "Place not found: add the town, e.g. “Stade de France, Saint-Denis”."); return;
      }
      var id = Date.now().toString(36);
      modifier(function(p){
        (p.destinations = p.destinations || []).push({ id: id, nom: nom, label: String(l.label || nom).slice(0, 120),
          lat: Number(l.lat), lon: Number(l.lon) });
        var f = {};
        if(!videB) f.berline = berline;
        if(!videV) f.van = van;
        if(f.berline || f.van){ p.prix = p.prix || {}; p.prix["perso-" + id] = f; }
      });
      ["demoDestNom", "demoDestBerline", "demoDestVan"].forEach(function(id){ document.getElementById(id).value = ""; });
      direPerso("Destination ajoutée au menu de votre page.", "Destination added to your page's menu.");
    }, function(){
      bouton.disabled = false;
      direPerso("Recherche indisponible, réessayez.", "Search unavailable, please try again.");
    });
  }

  /* ═══ « VOS PRIX » — CEUX DE SON FLYER ═══
     8 octobre 2026, Barbaros : « ne mets pas les prix suggérés, il faut
     laisser l'hôtel choisir ». Une ligne par destination, deux cases vides.
     Le tableau n'est redessiné que si la LISTE change : le redessiner à
     chaque chiffre ferait perdre la case en cours de saisie. */
  var signaturePrix = "";
  function dessinerPrix(){
    var table = document.getElementById("demoPrixTable");
    if(!table || !window.ELA_DEMO_PAGE || !window.ELA_DEMO_PAGE.destinations) return;
    var dest = window.ELA_DEMO_PAGE.destinations(), prix = lirePerso().prix || {};
    var sig = dest.map(function(d){ return d.cle + ":" + d.nom; }).join("|") + "|" + racine.lang;
    if(sig === signaturePrix){
      table.querySelectorAll("input[data-cle]").forEach(function(i){
        if(document.activeElement === i) return;
        var v = (prix[i.getAttribute("data-cle")] || {})[i.getAttribute("data-gamme")];
        i.value = v > 0 ? String(v) : "";
      });
      return;
    }
    signaturePrix = sig;
    table.textContent = "";
    var tete = el("div", "demo-prix-ligne demo-prix-tete");
    tete.appendChild(el("span", "", texte("Destination", "Destination")));
    tete.appendChild(el("span", "", texte("Berline €", "Sedan €")));
    tete.appendChild(el("span", "", "Van €"));
    table.appendChild(tete);
    dest.forEach(function(d){
      var ligne = el("div", "demo-prix-ligne");
      ligne.appendChild(el("span", "demo-prix-nom", d.nom));
      ["berline", "van"].forEach(function(g){
        var i = el("input"); i.type = "number"; i.min = "1"; i.max = "2000"; i.inputMode = "numeric";
        i.setAttribute("data-cle", d.cle); i.setAttribute("data-gamme", g);
        i.setAttribute("aria-label", d.nom + " — " + (g === "van" ? "Van" : texte("Berline", "Sedan")));
        var v = (prix[d.cle] || {})[g];
        i.value = v > 0 ? String(v) : "";
        i.placeholder = "—";
        i.addEventListener("change", function(){
          var brut = i.value.trim(), n = Math.round(Number(brut));
          if(brut !== "" && !(n >= 1 && n <= 2000)){
            direPerso("Indiquez un prix entre 1 et 2 000 €, ou laissez la case vide.", "Enter a price between €1 and €2,000, or leave it empty.");
            i.value = ""; return;
          }
          modifier(function(q){
            q.prix = q.prix || {};
            var f = q.prix[d.cle] = q.prix[d.cle] || {};
            if(brut === "") delete f[g]; else f[g] = n;
            if(!f.berline && !f.van) delete q.prix[d.cle];
          });
          direPerso("", "");
        });
        ligne.appendChild(i);
      });
      table.appendChild(ligne);
    });
  }

  function construirePanneau(){
    var p = lirePerso();
    var bloc = el("details", "demo-perso"); bloc.id = "demoPerso";
    var titre = bilingue("summary", "demo-perso-titre", "Personnaliser ma page", "Customise my page");
    bloc.appendChild(titre);
    var corps = el("div", "demo-perso-corps");
    corps.appendChild(bilingue("p", "demo-perso-intro",
      "Essayez votre nom, votre couleur, votre photo et vos prix. Tout reste sur votre appareil : rien n'est envoyé.",
      "Try your name, colour, photo and prices. Everything stays on your device: nothing is sent."));

    var nom = el("input"); nom.id = "demoPersoNom"; nom.type = "text"; nom.maxLength = 60; nom.autocomplete = "organization";
    nom.value = p.nom || "";
    nom.addEventListener("input", function(){ var v = nom.value.replace(/\s+/g, " ").trim().slice(0, 60); modifier(function(q){ if(v) q.nom = v; else delete q.nom; }); });
    corps.appendChild(champ("Nom de l'établissement", "Business name", nom));

    var palette = el("div", "demo-nuancier"); palette.setAttribute("role", "group");
    NUANCIER.forEach(function(n){
      var b = el("button", "demo-pastille"); b.type = "button";
      b.style.background = n[0]; b.setAttribute("data-couleur", n[0]);
      b.setAttribute("aria-label", n[1]);
      b.setAttribute("aria-pressed", String((p.couleur || "").toLowerCase() === n[0].toLowerCase()));
      b.addEventListener("click", function(){ choisirCouleur(n[0]); });
      palette.appendChild(b);
    });
    var libre = el("input"); libre.type = "color"; libre.id = "demoPersoCouleur"; libre.value = p.couleur || "#0E6FC7";
    libre.className = "demo-couleur-libre";
    libre.addEventListener("input", function(){ choisirCouleur(libre.value); });
    palette.appendChild(libre);
    corps.appendChild(champ("Votre couleur", "Your colour", palette));

    /* Le bouton du navigateur est écrit dans SA langue (« Choose File ») : on
       le cache et on pose le nôtre, qui suit la langue de la page. */
    var photo = el("input"); photo.id = "demoPersoPhoto"; photo.type = "file"; photo.accept = "image/jpeg,image/png,image/webp,image/gif";
    photo.className = "demo-fichier";
    photo.addEventListener("change", function(){ lirePhoto(photo.files && photo.files[0]); });
    var choisir = bilingue("span", "demo-perso-fichier", "Choisir une photo", "Choose a photo");
    var lab = el("label", "demo-champ");
    lab.appendChild(bilingue("span", "demo-champ-titre", "Photo de votre établissement", "Photo of your business"));
    lab.appendChild(photo); lab.appendChild(choisir);
    corps.appendChild(lab);

    var msg = el("textarea"); msg.id = "demoPersoMessage"; msg.maxLength = 160; msg.rows = 2;
    msg.setAttribute("data-demo-fr", "Ex. : Bienvenue ! La réception vous réserve votre chauffeur.");
    msg.setAttribute("data-demo-en", "e.g. Welcome! The front desk books your driver.");
    msg.value = p.message || "";
    msg.addEventListener("input", function(){ var v = msg.value.trim().slice(0, 160); modifier(function(q){ if(v) q.message = v; else delete q.message; }); });
    corps.appendChild(champ("Message d'accueil (facultatif)", "Welcome message (optional)", msg));

    var blocPrix = el("fieldset", "demo-dest-bloc demo-prix-bloc");
    blocPrix.appendChild(bilingue("legend", "demo-champ-titre", "Vos prix par destination", "Your prices per destination"));
    blocPrix.appendChild(bilingue("p", "demo-prix-aide",
      "C'est vous qui les fixez : ce sont les prix de votre flyer. Vos clients scannent son QR code et arrivent sur cette page, à ces prix. Une case vide : le prix est calculé au kilomètre.",
      "You set them: they are the prices on your flyer. Your guests scan its QR code and land on this page, at these prices. An empty box: the price is calculated by distance."));
    var table = el("div", "demo-prix-table"); table.id = "demoPrixTable";
    blocPrix.appendChild(table);
    corps.appendChild(blocPrix);

    var dest = el("fieldset", "demo-dest-bloc");
    dest.appendChild(bilingue("legend", "demo-champ-titre", "Ajouter une destination (prix facultatifs)", "Add a destination (prices optional)"));
    var dn = el("input"); dn.id = "demoDestNom"; dn.type = "text"; dn.maxLength = 50;
    dn.setAttribute("data-demo-fr", "Lieu, ex. Stade de France"); dn.setAttribute("data-demo-en", "Place, e.g. Stade de France");
    var db = el("input"); db.id = "demoDestBerline"; db.type = "number"; db.min = "1"; db.max = "2000"; db.inputMode = "numeric";
    db.setAttribute("data-demo-fr", "Berline €"); db.setAttribute("data-demo-en", "Sedan €");
    var dv = el("input"); dv.id = "demoDestVan"; dv.type = "number"; dv.min = "1"; dv.max = "2000"; dv.inputMode = "numeric";
    dv.setAttribute("data-demo-fr", "Van €"); dv.setAttribute("data-demo-en", "Van €");
    var ligne = el("div", "demo-dest-saisie");
    [dn, db, dv].forEach(function(x){ ligne.appendChild(x); });
    var ajout = bilingue("button", "demo-perso-bouton", "Ajouter", "Add"); ajout.type = "button"; ajout.id = "demoDestAjouter";
    ajout.addEventListener("click", ajouterDestination);
    ligne.appendChild(ajout);
    dest.appendChild(ligne);
    var ul = el("ul", "demo-dest-liste"); ul.id = "demoDestListe";
    dest.appendChild(ul);
    corps.appendChild(dest);

    var etat = el("p", "demo-perso-etat"); etat.id = "demoPersoEtat"; etat.hidden = true; etat.setAttribute("role", "status");
    corps.appendChild(etat);
    var raz = bilingue("button", "demo-perso-raz", "Revenir à la page d'origine", "Back to the original page"); raz.type = "button"; raz.id = "demoPersoRaz";
    raz.addEventListener("click", function(){
      photoMemoire = "";
      ecrirePerso({});
      nom.value = ""; msg.value = ""; libre.value = "#0E6FC7";
      ["--h-bouton", "--h-vif", "--h-charbon", "--h-pale", "--h-paleEncre"].forEach(function(v){ racine.style.removeProperty(v); });
      try{ window.ELA_DEMO_PAGE.appliquer({}); }catch(e){}
      Object.keys(MARQUE_ORIGINE).forEach(function(k){ racine.style.setProperty("--h-" + k, MARQUE_ORIGINE[k]); });
      palette.querySelectorAll(".demo-pastille").forEach(function(b){ b.setAttribute("aria-pressed", "false"); });
      appliquerPerso();
      direPerso("Page d'origine rétablie.", "Original page restored.");
    });
    var voir = bilingue("button", "demo-perso-bouton demo-perso-voir", "Voir ma page", "See my page"); voir.type = "button"; voir.id = "demoPersoVoir";
    voir.addEventListener("click", function(){
      bloc.open = false;
      var cible = document.getElementById("hotelTete");
      /* On s'arrête SOUS le bandeau collé en haut, sinon il mange le haut
         de la page qu'on vient montrer. */
      var bandeau = document.getElementById("demoBandeau");
      var marge = (bandeau ? bandeau.getBoundingClientRect().height : 0) + 8;
      if(cible && cible.getBoundingClientRect().height)
        window.scrollTo(0, Math.max(0, cible.getBoundingClientRect().top + window.scrollY - marge));
      else window.scrollTo(0, 0);
    });
    var actions = el("div", "demo-perso-actions");
    actions.appendChild(voir); actions.appendChild(raz);
    corps.appendChild(actions);
    bloc.appendChild(corps);

    function choisirCouleur(hex){
      modifier(function(q){ q.couleur = hex; });
      libre.value = hex;
      palette.querySelectorAll(".demo-pastille").forEach(function(b){
        b.setAttribute("aria-pressed", String(b.getAttribute("data-couleur").toLowerCase() === hex.toLowerCase()));
      });
    }
    traduire(bloc);
    return bloc;
  }

  /* ═══ L'ACCÈS ═══ */
  function vers(adresse){ try{ location.replace(adresse); }catch(e){ location.href = adresse; } }

  function indisponible(){
    racine.classList.remove("demo-attente");
    racine.classList.add("demo-ferme");
    var go = function(){
      var p = el("section", "demo-indispo"); p.id = "demoIndispo";
      p.appendChild(el("h1", "", texte("Démonstration momentanément indisponible", "Demo temporarily unavailable")));
      p.appendChild(el("p", "", texte("Réessayez dans un instant, ou écrivez-nous : nous vous la montrons nous-mêmes.",
                                      "Please try again shortly, or write to us: we will show it to you ourselves.")));
      var a = el("a", "demo-fin-bouton", texte("Nous contacter", "Contact us")); a.href = CONTACT;
      p.appendChild(a);
      var m = el("p", "", "contact@elatransfer.com");
      p.appendChild(m);
      document.body.appendChild(p);
    };
    if(document.body) go(); else document.addEventListener("DOMContentLoaded", go);
  }

  function ouvrir(){
    var session = "";
    try{ session = window.localStorage.getItem(CLE_SESSION) || ""; }catch(e){}
    if(!session){ vers(FORMULAIRE); return; }
    /* Une autre session sur ce navigateur : on repart d'une démo neuve. */
    if(stockage.getItem("session_vue") !== session){
      ["ela_courses", "ela_bookings", CLE_ETAT, "ela_session_reception"].forEach(function(k){ stockage.removeItem(k); });
      stockage.setItem("session_vue", session);
    }
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var minuteur = setTimeout(function(){ if(ctrl) ctrl.abort(); }, 8000);
    fetch(URL_DEMANDE, {
      method: "POST", signal: ctrl ? ctrl.signal : undefined,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ouvrir", session: session })
    }).then(function(r){
      clearTimeout(minuteur);
      if(r.status === 401){
        try{ window.localStorage.removeItem(CLE_SESSION); }catch(e){}
        vers(FORMULAIRE);
        return null;
      }
      if(!r.ok) throw new Error("serveur");
      return r.json();
    }).then(function(d){
      if(d === null) return;
      if(!d || d.ok !== true) throw new Error("reponse");
      var nom = String(d.etablissement || "").replace(/\s+/g, " ").trim().slice(0, 60);
      var type = ["hotel", "agence", "entreprise"].indexOf(d.type) >= 0 ? d.type : "hotel";
      info = { etablissement: nom || NOM_REPLI, type: type, expire: d.expire };
      window.ELA_DEMO_INFO = info;
      var pret = function(){
        construireCadre();
        try{ window.dispatchEvent(new CustomEvent("ela:demo-pret", { detail: info })); }catch(e){}
        racine.classList.remove("demo-attente");
      };
      if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", pret); else pret();
    }).catch(function(){ clearTimeout(minuteur); indisponible(); });
  }

  window.ELA_DEMO = {
    nuage: nuage, avancer: avancer, habillerHotel: habillerHotel,
    info: function(){ return info; }, etape: etape, dire: dire
  };

  /* ═══ LA RÉCEPTION EN ANGLAIS (8 octobre 2026, à la demande de Barbaros) ═══
     L'écran du comptoir est écrit en français dans le moteur. La vraie
     réception easyHotel est traduite par SA finition (hotel-engine-polish.js),
     que la démo ne charge pas : elle porte le nom et la photo d'easyHotel.
     On traduit donc ici, à l'affichage, dans la démo seulement.
     CHAQUE TEXTE GARDE SON FRANÇAIS D'ORIGINE (Map nœud → {fr, en}) : on
     rend l'anglais si la page est en anglais, le français sinon, et l'on
     n'écrit QUE si le texte change. Réécrire un texte identique est une
     mutation : sous un observateur, c'est la boucle qui a figé le moteur
     easyHotel pendant une semaine. */
  var MOTS_REC = {
    "Réception": "Front desk", "Réserver un chauffeur": "Book a driver", "Vu": "Got it",
    "Un imprévu ?": "Something unexpected?",
    "Retard, changement, annulation : appelez-nous.": "Delay, change, cancellation: call us.",
    "Retrouver une course": "Find a ride", "À venir": "Upcoming", "Historique": "History",
    "Par date": "By date", "Jour": "Day", "Mois": "Month", "Fermer la session": "Close session",
    "En attente": "Pending", "Réservation validée": "Confirmed", "Effectuée": "Completed",
    "Non prise": "Not taken", "Annulée": "Cancelled", "En retard": "Overdue",
    "Aujourd'hui": "Today", "Demain": "Tomorrow", "Date inconnue": "Unknown date",
    "Voir le bon": "View voucher", "Appeler Elatransfer": "Call Elatransfer",
    "Client non nommé": "Unnamed guest", "Aucune réservation pour le moment.": "No booking yet.",
    "Aucune course à venir.": "No upcoming ride.", "Aucune course passée pour le moment.": "No past ride yet.",
    "Aucune course sur cette période.": "No ride in this period.",
    "Berline": "Sedan", "Van": "Van", "Carte bancaire": "Card", "Carte": "Card", "Espèces": "Cash",
    "Code de la réception": "Front desk code", "Ouvrir": "Open"
  };
  var JOURS_SEM = { lundi:"Monday", mardi:"Tuesday", mercredi:"Wednesday", jeudi:"Thursday",
                    vendredi:"Friday", samedi:"Saturday", dimanche:"Sunday" };
  var MOIS_AN = { janvier:"January", "février":"February", mars:"March", avril:"April", mai:"May", juin:"June",
                  juillet:"July", "août":"August", septembre:"September", octobre:"October",
                  novembre:"November", "décembre":"December" };
  function enAnglais(fr){
    var t = fr.trim();
    if(!t) return fr;
    var avant = fr.slice(0, fr.indexOf(t.charAt(0))), apres = fr.slice(fr.lastIndexOf(t.charAt(t.length - 1)) + 1);
    var en = MOTS_REC[t], m;
    if(en !== undefined) return avant + en + apres;
    if((m = /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) (\d{1,2}) ([a-zéû]+)$/.exec(t)) && MOIS_AN[m[3]])
      en = JOURS_SEM[m[1]] + " " + m[2] + " " + MOIS_AN[m[3]];
    else if((m = /^Aucune course ne correspond à « (.*) »\.$/.exec(t))) en = "No ride matches “" + m[1] + "”.";
    else en = t.split(" · ").map(morceauAnglais).join(" · ");
    return avant + en + apres;
  }
  /* Un morceau d'une ligne « Chambre 108 · M. Dubois (exemple) ». */
  function morceauAnglais(x){
    if(MOTS_REC[x] !== undefined) return MOTS_REC[x];
    return x.replace(/^Chambre /, "Room ")
            .replace(/^Réf\. /, "Ref. ")
            .replace(/^Chauffeur : /, "Driver: ")
            .replace(/l'hôtel/g, "the hotel")
            .replace(/\(exemple\)/g, "(example)")
            .replace(/chauffeur fictif/g, "fictional driver")
            .replace(/^Mme /, "Ms ").replace(/^M\. /, "Mr ")
            .replace(/Aéroport CDG/g, "CDG Airport");
  }
  var ORIGINES = new Map();
  function traduireReception(){
    var ecranRec = document.getElementById("ecran-reception");
    if(!ecranRec) return;
    var anglais = racine.lang === "en";
    var marche = document.createTreeWalker(ecranRec, NodeFilter.SHOW_TEXT, null);
    for(var n = marche.nextNode(); n; n = marche.nextNode()){
      var o = ORIGINES.get(n), v = n.nodeValue;
      if(!o || (v !== o.fr && v !== o.en)){ o = { fr: v, en: enAnglais(v) }; ORIGINES.set(n, o); }
      var voulu = anglais ? o.en : o.fr;
      if(v !== voulu) n.nodeValue = voulu;
    }
    var rech = document.getElementById("recRecherche");
    if(rech){
      if(!rech.hasAttribute("data-demo-fr-ph")) rech.setAttribute("data-demo-fr-ph", rech.placeholder);
      var ph = anglais ? "Room, name, phone or reference" : rech.getAttribute("data-demo-fr-ph");
      if(rech.placeholder !== ph) rech.placeholder = ph;
    }
  }
  /* Le bon affiché a son propre choix FR / EN, et il est déjà traduit : seuls
     les noms des clients d'exemple (« Mme Laurent (exemple) ») y restent en
     français. On ne touche qu'eux. */
  function traduireBon(){
    var f = document.getElementById("bonClient");
    if(!f) return;
    var anglais = !!f.querySelector('[data-langue="en"][aria-pressed="true"]');
    var marche = document.createTreeWalker(f, NodeFilter.SHOW_TEXT, null);
    for(var n = marche.nextNode(); n; n = marche.nextNode()){
      var o = ORIGINES.get(n), v = n.nodeValue;
      if(!o || (v !== o.fr && v !== o.en)){
        if(v.indexOf("(exemple)") === -1) continue;
        o = { fr: v, en: enAnglais(v) }; ORIGINES.set(n, o);
      }
      var voulu = anglais ? o.en : o.fr;
      if(v !== voulu) n.nodeValue = voulu;
    }
  }
  /* Le simulateur est chargé dans l'en-tête : l'écran n'existe qu'ensuite. */
  function brancherReception(){
    var ecranRec = document.getElementById("ecran-reception");
    if(!ecranRec || racine.getAttribute("data-demo-vue") !== "reception") return;
    new MutationObserver(function(){ traduireReception(); traduireBon(); })
      .observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-pressed"] });
    traduireReception();
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", brancherReception);
  else brancherReception();

  /* LE CADRE « VOTRE PHOTO ICI » OUVRE LE CHOIX DU FICHIER. C'est à cet
     endroit que le prospect veut la voir : le chercher dans le panneau du
     haut serait un détour. */
  document.addEventListener("click", function(e){
    var cadre = e.target && e.target.closest && e.target.closest(".demo-photo");
    var champ = document.getElementById("demoPersoPhoto");
    if(cadre && champ) champ.click();
  });
  document.addEventListener("keydown", function(e){
    var cadre = e.target && e.target.classList && e.target.classList.contains("demo-photo");
    if(cadre && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); e.target.click(); }
  });

  new MutationObserver(function(){ if(info) ecrireTextes(); traduireReception(); })
    .observe(racine, { attributes: true, attributeFilter: ["lang"] });
  setInterval(function(){ if(info) dessinerSuivi(); }, 1000);

  ouvrir();
})();
