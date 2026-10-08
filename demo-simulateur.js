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
    function c(ref, statut, j, heure, arrivee, nom, chambre, prix, veh){
      return { ref: ref, cree: Date.now() - 86400000, avance: 0, fixe: statut,
        bon: { ref: ref, statut: statut, provenanceCle: "demo-hotel", parReception: true,
          client: { nom: nom, telephone: "+33 6 39 98 00 1" + ref.slice(-1) },
          paiement: "carte", paiementNom: "Carte bancaire",
          course: { date: jour(j), heure: heure, depart: adresse, departPublic: adresse,
                    arrivee: arrivee, vehicule: veh, chambre: chambre },
          prix: { total: prix } } };
    }
    return { version: 1, courses: [
      c("ELA-DEMO-00003", "confirmee", 1, "06:30", "Aéroport CDG — Terminal 2E", "Mme Laurent (exemple)", "214", 45, "Berline"),
      c("ELA-DEMO-00002", "attente", 0, "18:15", "Orly", "M. Dubois (exemple)", "108", 85, "Van"),
      c("ELA-DEMO-00001", "realisee", -1, "09:00", "Paris — Gare de Lyon", "Mme Bernard (exemple)", "305", 75, "Berline")
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
    if(n < 3) v.prix = Number(b.prix && b.prix.total) || 0;
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
    var mots = String(nom || "").replace(/[^\p{L}\p{N} ]+/gu, " ").trim().split(/\s+/).filter(Boolean);
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
    if(exemple) exemple.textContent = texte("Tarifs d'exemple — les vôtres seront négociés", "Sample prices — yours will be negotiated");
    var photo = document.getElementById("demoPhotoTexte");
    if(photo) photo.textContent = texte("Votre photo ici", "Your photo here");
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
    photo.appendChild(el("span", "", ""));
    photo.firstChild.id = "demoPhotoTexte";
    marque.appendChild(photo);
    tete.insertBefore(marque, tete.firstChild);
    var exemple = el("p", "demo-exemple"); exemple.id = "demoExemple";
    var sur = tete.querySelector(".hotel-sur");
    if(sur && sur.nextSibling) tete.insertBefore(exemple, sur.nextSibling); else tete.appendChild(exemple);
    ecrireTextes();
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

  new MutationObserver(function(){ if(info) ecrireTextes(); })
    .observe(racine, { attributes: true, attributeFilter: ["lang"] });
  setInterval(function(){ if(info) dessinerSuivi(); }, 1000);

  ouvrir();
})();
