/* =====================================================================
   TEST-PRIX.MJS — les règles du prix, sans navigateur, valeurs à la main
   ---------------------------------------------------------------------
   Troisième extraction du plan d'architecture (1er novembre 2026), après
   textes.js et config.js : les RÈGLES qui font un prix à partir d'un lieu
   (Paris, c'est la commune ; les zones de forfait ; l'accueil au départ ;
   la grille du serveur et sa porte ; la destination du flyer par le lieu)
   sortent du moteur vers prix.js. L'arithmétique (tranches, arrondi,
   plancher) vit déjà dans itineraire-partage.js.

   LE TEST A ÉTÉ ÉCRIT AVANT LE DÉPLACEMENT, et il tournait vert sur le
   code de main : les fonctions étaient alors découpées dans index.html et
   évaluées ici. Le déplacement ne doit changer AUCUN de ces résultats.

   LES VALEURS ATTENDUES SONT ÉCRITES À LA MAIN, jamais relues de la
   sortie : un test qui prend la sortie pour référence ne vérifie rien.
   Ce qu'il verrouille :
   — les seuils (12 / 22 / 27 / 32 / 42 km) et le prix de chaque tranche,
     berline et van, jugés sur la distance affichée au dixième ;
   — au-delà de la dernière tranche, son prix plus le kilomètre, arrondi à
     la dizaine, le 5 pile DESCEND ;
   — le kilométrage des hôtels : arrondi puis plancher, dans cet ordre ;
   — les forfaits Paris ↔ Orly / Roissy / Disneyland, dans les deux sens,
     et Paris = la commune (code postal 75…, ou la ville), jamais un rayon ;
   — l'accueil (+10 €), seulement au DÉPART d'un aéroport ou d'une grande
     gare : jamais sur une dépose, un hôtel voisin, une petite gare, un
     arrêt de tram ;
   — la grille du serveur : juste, elle se lit en euros ; une seule valeur
     qui cloche et c'est null, en entier ; l'aller-retour en centimes ;
   — le repli : les tarifs faits de config.js rendent la grille du mémo ;
   — la destination du flyer reconnue par le lieu, à son rayon.

   Lancer :  node test-prix.mjs
   ===================================================================== */
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const ok = [], ko = [];
const check = (nom, cond, detail = "") => (cond ? ok : ko).push(nom + (detail ? " — " + detail : ""));
const meme = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const copie = (o) => JSON.parse(JSON.stringify(o));

/* ── Le bac à sable : config.js et itineraire-partage.js, puis les règles ── */
const racine = {};
const bac = { window: racine, globalThis: racine, console };
vm.runInNewContext(readFileSync("config.js", "utf8"), bac);
vm.runInNewContext(readFileSync("itineraire-partage.js", "utf8"), bac);
const C = racine.ELA_CONFIG, R = racine.ELA_ROUTE;

/* Les règles, derrière une seule prise :
     P.prixSitePublic(tarifs, gamme, km, depart, arrivee)
     P.forfaitEntre(forfaits, a, b)     P.estParis(lieu)
     P.accueilAuDepart(lieu)  P.departAeroport(lieu)  P.departGrandeGare(lieu)
     P.grilleValide(valeur, gammes, forfaits)   P.grilleEnCentimes(tarifs, gammes)
     P.destDuPoint(hotel, point)   P.sansAccents(s)   P.estGare(lieu)
     P.terminalDuLibelle(label)
   « tarifs » = { grille, forfaits, accueil } : ce que le moteur tient en
   mémoire (le repli de config.js, remplacé par le serveur s'il répond). */
const sourcePrix = existsSync("prix.js") ? readFileSync("prix.js", "utf8") : "";
check("prix.js existe", sourcePrix.length > 0);
const avant = Object.keys(racine).length;
if (sourcePrix) vm.runInNewContext(sourcePrix, bac);
const P = racine.ELA_PRIX;
check("prix.js pose window.ELA_PRIX, et lui seul", !!P && Object.keys(racine).length === avant + 1, "noms posés : " + Object.keys(racine).join(", "));
check("les règles du prix se chargent", !!P && typeof P.prixSitePublic === "function");
if (!P) { console.log("=== ÉCHECS (" + ko.length + ") ==="); ko.forEach((l) => console.log("✘ " + l)); process.exit(1); }

/* ── Les données du test ── */
/* Le repli, tel que le moteur le tient : une COPIE, le test ne touche pas config.js. */
const REPLI = () => ({ grille: copie(C.GRILLE_PUBLIQUE), forfaits: copie(C.FORFAITS_PUBLICS), accueil: C.ACCUEIL_EUR });
const BERLINE = C.GAMMES[0], VAN = C.GAMMES[1];
/* Les lieux, avec les champs que posent la BAN et Photon : coordonnées,
   type, commune, pays. Le libellé des terminaux est celui du site. */
const L = (lat, lon, plus) => Object.assign({ lat, lon, label: "", pays: "FR" }, plus || {});
const OPERA = L(48.8720, 2.3316, { label: "Opéra Garnier, 75009 Paris", codePostal: "75009", ville: "Paris" });
const BOULOGNE = L(48.8353, 2.2399, { label: "Mairie, 92100 Boulogne-Billancourt", codePostal: "92100", ville: "Boulogne-Billancourt" });
const VERSAILLES = L(48.8049, 2.1204, { label: "Château de Versailles, 78000 Versailles", codePostal: "78000", ville: "Versailles" });
const ORLY1 = L(48.7233, 2.3794, { label: "Orly 1 — Aéroport de Paris-Orly", categorie: "aeroport" });
const T2E = L(48.9998, 2.5740, { label: "Terminal 2E — Aéroport Roissy-Charles de Gaulle", categorie: "aeroport" });
const DISNEY = L(48.8722, 2.7758, { label: "Disneyland Park, 77700 Chessy", codePostal: "77700", ville: "Chessy" });
const GARE_LYON = L(48.844888, 2.373520, { label: "Gare de Lyon, 75012 Paris", categorie: "gare", osm: "station", codePostal: "75012", ville: "Paris" });
const JUVISY = L(48.6894, 2.3836, { label: "Juvisy, 91260 Juvisy-sur-Orge", categorie: "gare", osm: "station", codePostal: "91260", ville: "Juvisy-sur-Orge" });
const HILTON = L(49.0040, 2.5600, { label: "Hilton Paris Charles de Gaulle, 95700 Roissy-en-France", categorie: "hotel", codePostal: "95700", ville: "Roissy-en-France" });
const BOURGET = L(48.9694, 2.4414, { label: "Aéroport de Paris-Le Bourget, 93350 Le Bourget", categorie: "aeroport", codePostal: "93350", ville: "Le Bourget" });

/* ── 1. Les tranches et l'au-delà, sur un trajet sans forfait ni accueil ── */
{
  const attendu = { 5: "35/50", 12: "35/50", 12.04: "35/50", 12.06: "50/80", 22: "50/80", 22.1: "60/95", 24: "60/95",
    27: "60/95", 27.1: "70/110", 32: "70/110", 32.1: "90/130", 42: "90/130", 42.1: "90/130", 44: "90/140",
    44.1: "100/140", 60: "130/200", 100: "230/350", 220: "530/810" };
  for (const km of Object.keys(attendu)) {
    const r = P.prixSitePublic(REPLI(), BERLINE, +km, BOULOGNE, VERSAILLES) + "/" + P.prixSitePublic(REPLI(), VAN, +km, BOULOGNE, VERSAILLES);
    check(`tranche à ${km} km, Boulogne → Versailles : ${attendu[km]} €`, r === attendu[km], r);
  }
}

/* ── 2. L'arrondi de Barbaros et le plancher du kilométrage des hôtels ── */
{
  const a = R.arrondiDizaine;
  check("arrondi : 45 → 40 (le 5 pile descend), 46 → 50, 35 → 30, 102,06 → 100, 0 → 0",
    a(45) === 40 && a(46) === 50 && a(35) === 30 && a(102.06) === 100 && a(0) === 0, [a(45), a(46), a(35), a(102.06), a(0)].join(","));
  check("kilométrage hôtel : 24,3 km → berline 70 € (70,47), van 110 € (114,21)",
    R.prix(BERLINE, 24.3) === 70 && R.prix(VAN, 24.3) === 110, R.prix(BERLINE, 24.3) + "/" + R.prix(VAN, 24.3));
  check("plancher APRÈS l'arrondi : 5 km → berline 35 € (14,50 → 10 → 35), van 50 €",
    R.prix(BERLINE, 5) === 35 && R.prix(VAN, 5) === 50, R.prix(BERLINE, 5) + "/" + R.prix(VAN, 5));
  check("12 km en berline : 34,80 → 30 → plancher 35 € ; 12,07 km : 35,003 → 40 € (5,003 est au-dessus du 5 pile)",
    R.prix(BERLINE, 12) === 35 && R.prix(BERLINE, 12.07) === 40, R.prix(BERLINE, 12) + "/" + R.prix(BERLINE, 12.07));
}

/* ── 3. Paris, c'est la commune ── */
{
  check("Opéra (75009, Paris) est Paris", P.estParis(OPERA) === true);
  check("la ville seule suffit, en capitales : « PARIS » sans code postal", P.estParis(L(48.86, 2.35, { ville: "PARIS" })) === true);
  check("Boulogne (92100) n'est pas Paris, même à côté", P.estParis(BOULOGNE) === false);
  check("un lieu sans pays est lu en France", P.estParis(L(48.86, 2.35, { codePostal: "75001" })) === true);
  check("un « Paris » hors de France n'est pas Paris", P.estParis(L(33.66, -95.55, { codePostal: "75001", ville: "Paris", pays: "US" })) === false);
  check("un code postal 75 à 17 km du centre est une donnée aberrante, pas Paris", P.estParis(L(48.70, 2.35, { codePostal: "75001", ville: "Paris" })) === false);
  check("sans coordonnées, pas Paris", P.estParis({ codePostal: "75001", ville: "Paris" }) === false && P.estParis(null) === false);
}

/* ── 4. Les forfaits Paris, dans les deux sens, et l'accueil ajouté en dernier ── */
{
  const p = (g, km, a, b) => P.prixSitePublic(REPLI(), g, km, a, b);
  check("Paris → Orly : 55 / 80 €, on dépose, pas d'accueil", p(BERLINE, 21, OPERA, ORLY1) === 55 && p(VAN, 21, OPERA, ORLY1) === 80);
  check("Orly → Paris : 55 + 10 / 80 + 10 (accueil au départ de l'aéroport)", p(BERLINE, 21, ORLY1, OPERA) === 65 && p(VAN, 21, ORLY1, OPERA) === 90);
  check("Paris → Roissy : 70 / 110 €", p(BERLINE, 28, OPERA, T2E) === 70 && p(VAN, 28, OPERA, T2E) === 110);
  check("Roissy → Paris, même à 34 km : 80 / 120 €", p(BERLINE, 34, T2E, OPERA) === 80 && p(VAN, 34, T2E, OPERA) === 120);
  check("Paris → Disneyland : 90 / 130 €", p(BERLINE, 41, OPERA, DISNEY) === 90 && p(VAN, 41, OPERA, DISNEY) === 130);
  check("Disneyland → Paris : 90 / 130 €, un parc n'a pas d'accueil", p(BERLINE, 41, DISNEY, OPERA) === 90 && p(VAN, 41, DISNEY, OPERA) === 130);
  check("Boulogne → Roissy à 35 km : pas de forfait, la tranche (90 / 130 €)", p(BERLINE, 35, BOULOGNE, T2E) === 90 && p(VAN, 35, BOULOGNE, T2E) === 130);
  check("un hôtel collé au terminal : forfait Roissy (70 €), mais pas d'accueil", p(BERLINE, 27, HILTON, OPERA) === 70);
  check("Le Bourget → Paris (14 km) : pas de forfait, 50 + 10 = 60 € / 80 + 10 = 90 €", p(BERLINE, 14, BOURGET, OPERA) === 60 && p(VAN, 14, BOURGET, OPERA) === 90);
  check("Gare de Lyon → Versailles (25 km) : 60 + 10 = 70 € / 95 + 10 = 105 €", p(BERLINE, 25, GARE_LYON, VERSAILLES) === 70 && p(VAN, 25, GARE_LYON, VERSAILLES) === 105);
  check("Juvisy (petite gare) → Versailles : 60 / 95 €, sans accueil", p(BERLINE, 25, JUVISY, VERSAILLES) === 60 && p(VAN, 25, JUVISY, VERSAILLES) === 95);
  check("Versailles → Gare de Lyon : on dépose, 60 € sans accueil", p(BERLINE, 25, VERSAILLES, GARE_LYON) === 60);
  const f = (a, b) => (P.forfaitEntre(REPLI().forfaits, a, b) || {}).cle || "";
  check("forfaitEntre nomme la zone : orly, cdg, disney, et rien hors Paris",
    f(OPERA, ORLY1) === "orly" && f(T2E, OPERA) === "cdg" && f(OPERA, DISNEY) === "disney" && f(BOULOGNE, T2E) === "" && f(ORLY1, T2E) === "",
    [f(OPERA, ORLY1), f(T2E, OPERA), f(OPERA, DISNEY), f(BOULOGNE, T2E), f(ORLY1, T2E)].join(","));
  check("la zone d'un aéroport est le rayon autour d'un terminal : 2,5 km de T1, plus de forfait",
    f(OPERA, L(49.0067 + 0.0225, 2.5479, { categorie: "aeroport" })) === "");
}

/* ── 5. L'accueil : au départ d'un aéroport ou d'une grande gare, et rien d'autre ── */
{
  check("un terminal choisi (libellé) est un départ d'aéroport, même sans coordonnées", P.departAeroport({ label: "Terminal 2E — Aéroport Roissy-Charles de Gaulle" }) === true);
  check("le libellé anglais du terminal unique est reconnu aussi", P.departAeroport({ label: "Single terminal — Paris-Beauvais Airport" }) === true && P.terminalDuLibelle("Single terminal — Paris-Beauvais Airport") === "Terminal unique");
  check("un lieu de catégorie aéroport à 2,5 km d'un terminal : accueil", P.departAeroport(L(49.0067 + 0.0225, 2.5479, { categorie: "aeroport" })) === true);
  check("… à 4 km d'un terminal : pas d'accueil", P.departAeroport(L(49.0067 + 0.036, 2.5479, { categorie: "aeroport" })) === false);
  check("Le Bourget, choisi comme aéroport : accueil", P.departAeroport(BOURGET) === true);
  check("un hôtel à un kilomètre d'un terminal n'est pas une sortie des arrivées", P.departAeroport(HILTON) === false);
  check("une grande gare choisie comme gare, à 400 m : accueil", P.departGrandeGare(GARE_LYON) === true && P.accueilAuDepart(GARE_LYON) === true);
  check("une petite gare : pas d'accueil", P.departGrandeGare(JUVISY) === false && P.accueilAuDepart(JUVISY) === false);
  check("un arrêt de tram devant Gare du Nord n'est pas une gare", P.estGare(L(48.880185, 2.355151, { categorie: "gare", osm: "tram_stop" })) === false
    && P.departGrandeGare(L(48.880185, 2.355151, { categorie: "gare", osm: "tram_stop" })) === false);
  check("une adresse ordinaire : rien", P.accueilAuDepart(OPERA) === false && P.accueilAuDepart(null) === false);
  check("sansAccents : « Sacré-Cœur » → « sacre-coeur », « PARIS » → « paris »", P.sansAccents("Sacré-Cœur") === "sacre-coeur" && P.sansAccents(" PARIS ") === "paris");
}

/* ── 6. La grille du serveur : juste, elle s'applique ; une valeur qui cloche, null en entier ── */
{
  const juste = { tranches_km: [12, 22, 32, 42],
    berline: { tranches_centimes: [4000, 5000, 7000, 9000], au_dela_km_centimes: 250 },
    van: { tranches_centimes: [5000, 8000, 11000, 13000], au_dela_km_centimes: 380 },
    forfaits: { orly: { berline: 6000, van: 8000 }, cdg: { berline: 7000, van: 11000 }, disney: { berline: 9000, van: 13000 } },
    accueil_centimes: 1500 };
  const V = (v) => P.grilleValide(v, C.GAMMES, REPLI().forfaits);
  const s = V(juste);
  check("grille juste : lue en euros, tranches et au-delà", !!s && meme(s.grille.berline, { tranches: [{ km: 12, prix: 40 }, { km: 22, prix: 50 }, { km: 32, prix: 70 }, { km: 42, prix: 90 }], auDela: 2.5 })
    && meme(s.grille.van.tranches.map((t) => t.prix), [50, 80, 110, 130]) && s.grille.van.auDela === 3.8);
  check("grille juste : forfaits et accueil en euros", !!s && meme(s.forfaits, { orly: { berline: 60, van: 80 }, cdg: { berline: 70, van: 110 }, disney: { berline: 90, van: 130 } }) && s.accueil === 15);
  /* Comme le moteur l'applique : la grille, le prix de chaque forfait, l'accueil. */
  const applique = (sortie) => ({ grille: sortie.grille, accueil: sortie.accueil,
    forfaits: REPLI().forfaits.map((z) => Object.assign(z, { prix: sortie.forfaits[z.cle] })) });
  if (s) {
    const t = applique(s);
    check("grille appliquée : Boulogne → Versailles 10 km passe à 40 €", P.prixSitePublic(t, BERLINE, 10, BOULOGNE, VERSAILLES) === 40);
    check("grille appliquée : Orly → Paris = forfait 60 + accueil 15 = 75 €", P.prixSitePublic(t, BERLINE, 21, ORLY1, OPERA) === 75);
    check("grille appliquée : 50 km = 90 + 8 × 2,50 = 110 €", P.prixSitePublic(t, BERLINE, 50, BOULOGNE, VERSAILLES) === 110);
  }
  const variante = (f) => { const v = copie(juste); f(v); return v; };
  const refus = {
    "un prix qui baisse d'une tranche à la suivante": variante((v) => { v.berline.tranches_centimes = [4000, 3000, 7000, 9000]; }),
    "des limites qui ne montent pas": variante((v) => { v.tranches_km = [12, 22, 22, 42]; }),
    "une gamme absente": variante((v) => { delete v.van; }),
    "un forfait absent": variante((v) => { delete v.forfaits.disney; }),
    "un forfait sans le van": variante((v) => { delete v.forfaits.orly.van; }),
    "autant de prix que de limites, sinon rien": variante((v) => { v.van.tranches_centimes = [5000, 8000, 11000]; }),
    "des centimes non entiers": variante((v) => { v.berline.tranches_centimes[0] = 3999.5; }),
    "un prix nul": variante((v) => { v.berline.tranches_centimes[0] = 0; }),
    "un au-delà nul": variante((v) => { v.van.au_dela_km_centimes = 0; }),
    "un au-delà de plus de 20 €/km": variante((v) => { v.van.au_dela_km_centimes = 2001; }),
    "un accueil négatif": variante((v) => { v.accueil_centimes = -1; }),
    "un accueil de plus de 100 €": variante((v) => { v.accueil_centimes = 10001; }),
    "une limite au-delà de 500 km": variante((v) => { v.tranches_km = [12, 22, 32, 501]; }),
    "plus de huit tranches": variante((v) => { v.tranches_km = [1, 2, 3, 4, 5, 6, 7, 8, 9]; v.berline.tranches_centimes = v.van.tranches_centimes = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((x) => x * 1000); }),
  };
  for (const [nom, v] of Object.entries(refus)) check("grille refusée en entier : " + nom, V(v) === null);
  check("ni null, ni un tableau, ni un texte", V(null) === null && V([]) === null && V("x") === null && V({}) === null);
  check("un accueil à 0 est permis (le serveur peut l'éteindre)", (V(variante((v) => { v.accueil_centimes = 0; })) || {}).accueil === 0);
  check("deux tranches au même prix sont permises", !!V(variante((v) => { v.berline.tranches_centimes = [4000, 4000, 7000, 9000]; })));
  check("une seule tranche suffit", !!V({ tranches_km: [20], berline: { tranches_centimes: [5000], au_dela_km_centimes: 300 }, van: { tranches_centimes: [7000], au_dela_km_centimes: 400 }, forfaits: juste.forfaits, accueil_centimes: 1000 }));
}

/* ── 7. Le repli vient de config.js, et l'aller-retour en centimes est exact ── */
{
  const c = P.grilleEnCentimes(REPLI(), C.GAMMES);
  check("le repli en centimes est la grille du mémo (12/22/27/32/42 ; 35/50/60/70/90 ; 50/80/95/110/130 ; +2,50 / +3,80)",
    meme(c.tranches_km, [12, 22, 27, 32, 42]) && meme(c.berline, { tranches_centimes: [3500, 5000, 6000, 7000, 9000], au_dela_km_centimes: 250 })
    && meme(c.van, { tranches_centimes: [5000, 8000, 9500, 11000, 13000], au_dela_km_centimes: 380 }));
  check("… forfaits Orly 55/80, Roissy 70/110, Disneyland 90/130, accueil 10 €",
    meme(c.forfaits, { orly: { berline: 5500, van: 8000 }, cdg: { berline: 7000, van: 11000 }, disney: { berline: 9000, van: 13000 } }) && c.accueil_centimes === 1000);
  const s = P.grilleValide(c, C.GAMMES, REPLI().forfaits);
  check("relue par la porte du serveur, la grille de repli est identique à elle-même",
    !!s && meme(s.grille, C.GRILLE_PUBLIQUE) && s.accueil === C.ACCUEIL_EUR
    && C.FORFAITS_PUBLICS.every((z) => meme(s.forfaits[z.cle], z.prix)));
  check("le repli rend bien 35 € à 10 km et 65 € d'Orly à Paris", P.prixSitePublic(REPLI(), BERLINE, 10, BOULOGNE, VERSAILLES) === 35 && P.prixSitePublic(REPLI(), BERLINE, 21, ORLY1, OPERA) === 65);
  check("la grille du serveur, refusée, laisse le repli : c'est le moteur qui garde ses valeurs (grilleValide rend null)", P.grilleValide({ tranches_km: [12] }, C.GAMMES, REPLI().forfaits) === null);
}

/* ── 8. La destination du flyer suit le LIEU : un hôtel, ses destinations, leurs rayons ── */
{
  const hotel = { cle: "essai", destinations: [
    { cle: "cdg", nom: "Aéroport CDG", aeroport: "cdg", forfait: { berline: 35, van: 50 } },
    { cle: "bourget", nom: "Le Bourget", lat: 48.9694, lon: 2.4414, rayonKm: 2.5, forfait: { berline: 35, van: 70 } },
    { cle: "paris", nom: "Paris", adresseLibre: true, lat: 48.8566, lon: 2.3522, rayonKm: 7, forfait: { berline: 80, van: 120 } }
  ] };
  const d = (pt) => (P.destDuPoint(hotel, pt) || {}).cle || "";
  check("Terminal 2E → la destination « cdg » (rayon des terminaux)", d(T2E) === "cdg");
  check("à 2 km du Bourget → « bourget » ; à 3 km → rien", d(L(48.9694 + 0.018, 2.4414)) === "bourget" && d(L(48.9694 + 0.027, 2.4414)) === "");
  check("l'Opéra → « paris » (7 km du centre) ; Versailles → rien", d(OPERA) === "paris" && d(VERSAILLES) === "");
  check("sans point, ou sans hôtel : rien", P.destDuPoint(hotel, null) === null && P.destDuPoint(null, OPERA) === null);
  check("la première destination qui contient le point gagne (l'ordre de la fiche)", d(L(48.9694, 2.4414)) === "bourget");
}

/* ── 9. Le module est pur, et il est à sa place dans la page, la recette et le service worker ── */
{
  const sansCommentaires = (s) => s.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const corps = sansCommentaires(sourcePrix);
  check("prix.js ne touche ni au DOM, ni au réseau, ni au stockage, ni à l'horloge",
    !/\b(document|navigator|location)\b|\bwindow\.[a-zA-Z_]|\bfetch\s*\(|\b(localStorage|sessionStorage)\b|\bDate\b|setTimeout/.test(corps));
  check("prix.js ne tient aucun tarif : ni grille, ni forfait, ni montant, ni fiche d'hôtel",
    !/tranches\s*:\s*\[|prix\s*:\s*\{|forfait\s*:\s*\{|\bHOTELS\b|parKm|mini\s*:/.test(corps));
  check("prix.js ne nomme aucun partenaire", !/easyhotel|aeroville/i.test(corps));
  const page = readFileSync("index.html", "utf8"), corpsPage = sansCommentaires(page);
  const pos = (s) => page.indexOf(s);
  check("la page charge prix.js après config.js et itineraire-partage.js, avant le moteur",
    pos('<script src="config.js">') > 0 && pos('<script src="itineraire-partage.js">') < pos('<script src="prix.js">')
    && pos('<script src="prix.js">') < pos('if(!window.ELA_PRIX) throw'));
  check("le moteur refuse de démarrer sans prix.js", pos('if(!window.ELA_PRIX) throw') > 0);
  const encore = ["function zoneForfait(", "function estParis(", "function departGrandeGare(", "function centimes(",
    "PAS_UN_TRAIN", "PARIS_CENTRE", "/^75\\d{3}$/", "tranches_centimes.length !== lim.length"].filter((s) => corpsPage.includes(s));
  check("le moteur ne porte plus les règles, seulement des alias d'une ligne", encore.length === 0, encore.join(" | "));
  const alias = ["sansAccents", "estGare", "terminalDuLibelle", "destDuPoint", "forfaitEntre", "departAeroport",
    "accueilAuDepart", "prixSitePublic", "grilleValide", "grilleEnCentimes"]
    .filter((n) => !new RegExp("function " + n + "\\([^)]*\\)\\{\\s*return window\\.ELA_PRIX\\." + n + "\\(").test(corpsPage));
  check("chaque appelant de la page passe par un alias qui nomme ELA_PRIX", alias.length === 0, "manquent : " + alias.join(", "));
  check("c'est le moteur, et lui seul, qui change les tarifs en vigueur (appliquerGrille)", /function appliquerGrille\(/.test(corpsPage) && !/appliquerGrille/.test(corps));
  const recette = readFileSync("construire.sh", "utf8").split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
  check("construire.sh copie prix.js dans site/", /\bprix\.js\b/.test(recette.split("masquer-commentaires")[0]));
  check("construire.sh masque les commentaires de site/prix.js", /site\/prix\.js/.test(recette));
  check("sw.js garde prix.js dans son SHELL", /"\.\/prix\.js"/.test(sansCommentaires(readFileSync("sw.js", "utf8"))));
  check("tests.sh lance test-prix.mjs", /test-prix\.mjs/.test(readFileSync(".claude/outils/tests.sh", "utf8")));
}

for (const l of ok) console.log("✔ " + l);
if (ko.length) { console.log("\n=== ÉCHECS (" + ko.length + ") ==="); for (const l of ko) console.log("✘ " + l); console.log(""); }
console.log(`=== ${ok.length} réussis, ${ko.length} échecs ===`);
process.exit(ko.length ? 1 : 0);
