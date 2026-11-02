/* =====================================================================
   TEST-LIEUX.MJS — reconnaître un lieu dans la saisie et classer les
   réponses, sans navigateur, valeurs écrites à la main
   ---------------------------------------------------------------------
   Quatrième extraction du plan d'architecture (2 novembre 2026), après
   textes.js, config.js et prix.js : ce qui, dans la recherche d'adresse du
   moteur d'index.html, ne touche ni à l'écran ni au réseau — le lieu
   structuré, les terminaux reconnus dans ce que le client tape, la
   tolérance aux fautes, la note de chaque réponse, le dédoublonnage et
   l'assemblage de la liste — sort vers lieux.js. Les appels aux services
   (« chercher »), les champs et la liste (« brancher ») restent dans la page.

   LE TEST A ÉTÉ ÉCRIT AVANT LE DÉPLACEMENT, et il tournait vert sur le
   code de main : sans lieux.js, les fonctions sont découpées dans
   index.html et évaluées ici, avec de faux services. Le déplacement ne
   doit changer AUCUN de ces résultats.

   LES VALEURS ATTENDUES SONT ÉCRITES À LA MAIN, jamais relues de la
   sortie : chaque note est calculée règle par règle dans le commentaire
   qui la précède. Ce qu'il verrouille :
   — la distance d'édition et la tolérance aux fautes : « roisy », « charle
     de gaule », « beauvai » reconnus ; « tilly » ne propose PAS Beauvais
     (clé de cinq lettres) ; rien sous cinq lettres ; deux fautes à partir
     de huit ; un mot pas fini se compare au début du mot ;
   — les terminaux par mot entier, dans la langue du client ;
   — les variantes sans les mots passe-partout ;
   — la note : +2 lieu nommé, +3 mot distinctif, +1 mot courant, +2 mot
     à une faute près, +3 monument nommé, +3 rue entièrement tapée, −2
     bar ou restaurant non demandé, et le dégradé de distance ;
   — le dégradé : +3 jusqu'à 90 km, +1 jusqu'à 200, 0 jusqu'à 400, −2
     au-delà, sans jamais rien retirer ;
   — le dédoublonnage sur le libellé ET sur le point (quatre décimales) ;
   — le lieu structuré : depuis un élément choisi avec des coordonnées,
     arrondi à six décimales, bornes, source ;
   — l'assemblage : « sacré coeur » rend la basilique avant le bar ;
     « champs elysee » l'avenue avant l'hôtel ; « novotel roisy » le
     Novotel de Roissy avant celui de Gare de Lyon, et les deux avant les
     neuf terminaux ; « ibis roissy » l'Ibis, puis les terminaux, puis le
     reste ; une adresse qui commence par un chiffre met la BAN devant ;
     des notes égales gardent l'ordre du service ; huit lignes au plus,
     ou les terminaux plus trois.

   Lancer :  node test-lieux.mjs
   ===================================================================== */
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const ok = [], ko = [];
const check = (nom, cond, detail = "") => (cond ? ok : ko).push(nom + (detail ? " — " + detail : ""));
const meme = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ── Le bac à sable : config.js, itineraire-partage.js, prix.js, puis les lieux ── */
const racine = {};
const bac = { window: racine, globalThis: racine, console, setTimeout, clearTimeout };
vm.runInNewContext(readFileSync("config.js", "utf8"), bac);
vm.runInNewContext(readFileSync("itineraire-partage.js", "utf8"), bac);
vm.runInNewContext(readFileSync("prix.js", "utf8"), bac);
const C = racine.ELA_CONFIG;

/* Les lieux, derrière une seule prise :
     L.lieuStructure(it)   L.estHotel(lieu)   L.libelleTerminal(cle, t, langue)
     L.cleProche(mot, cle)   L.terminauxPourSaisie(q, langue)   L.variantes(q)
     L.distanceParis(item)   L.distanceEdition(a, b, max)   L.motProche(mot, motsLibelle)
     L.note(item, mots)   L.bonusDistance(km)   L.dedoublonner(liste)
     L.assembler(q, reponses, terminaux)   — reponses = [BAN, Photon…]
   Avec lieux.js, c'est lui. Sans lui (le code de main), les fonctions sont
   découpées dans index.html : la langue est une variable de la page, et
   l'assemblage ne se joint que par « chercher », nourri de faux services. */
const sourceLieux = existsSync("lieux.js") ? readFileSync("lieux.js", "utf8") : "";
let L = null, MODE = "";
if (sourceLieux) {
  const avant = Object.keys(racine).length;
  vm.runInNewContext(sourceLieux, bac);
  L = racine.ELA_LIEUX;
  MODE = "lieux.js";
  check("lieux.js pose window.ELA_LIEUX, et lui seul", !!L && Object.keys(racine).length === avant + 1, "noms posés : " + Object.keys(racine).join(", "));
} else {
  const page = readFileSync("index.html", "utf8");
  const debut = page.indexOf("  /* ═══ LE LIEU STRUCTURÉ (4 octobre 2026) ═══");
  const fin = page.indexOf("  /* ---- Le bouton s'efface pendant qu'une liste est ouverte");
  check("index.html porte le bloc à découper (lieu structuré → chercher)", debut > 0 && fin > debut);
  bac.LANGUE = "fr";
  const d = vm.runInNewContext(page.slice(debut, fin)
    + "\n;({ lieuStructure, estHotel, libelleTerminal, cleProche, terminauxPourSaisie, variantes, distanceParis, distanceEdition, motProche, note, bonusDistance, dedoublonner, chercher })", bac);
  L = Object.assign({}, d, {
    libelleTerminal: (cle, t, langue) => { bac.LANGUE = langue; return d.libelleTerminal(cle, t); },
    terminauxPourSaisie: (q, langue) => { bac.LANGUE = langue; return d.terminauxPourSaisie(q); },
    assembler: (q, reponses) => {
      bac.LANGUE = "fr"; bac.cache = {};
      bac.depuisBAN = () => Promise.resolve(reponses[0] || []);
      bac.depuisPhoton = () => Promise.resolve(reponses[1] || []);
      return d.chercher(q, null);
    }
  });
  MODE = "index.html (découpé)";
}
check("les lieux se chargent (" + MODE + ")", !!L && typeof L.note === "function" && typeof L.assembler === "function");
if (!L) { console.log("=== ÉCHECS (" + ko.length + ") ==="); ko.forEach((l) => console.log("✘ " + l)); process.exit(1); }

/* ── Les données du test : des réponses telles que les rendent la BAN et Photon ── */
const ban = (label, lat, lon, plus) => Object.assign({ label, lat, lon, icon: "📍", lieuNomme: false, categorie: "adresse",
  source: "ban", sourceId: "", codePostal: "", ville: "", pays: "FR" }, plus || {});
const photon = (label, lat, lon, categorie, plus) => Object.assign({ label, lat, lon, icon: "📍", categorie, lieuNomme: true,
  osm: "", source: "photon", sourceId: "", pays: "FR", codePostal: "", ville: "", nom: label.split(",")[0] }, plus || {});

/* Autour de Paris (+3 de distance), sauf mention contraire. */
const NOVOTEL_ROISSY = photon("Novotel Roissy CDG, Roissy-en-France", 49.0090, 2.5560, "hotel");
const NOVOTEL_LYON = photon("Novotel Paris Gare de Lyon, 75012 Paris", 48.8443, 2.3735, "hotel");
const IBIS_ROISSY = photon("Ibis Roissy CDG Paris Nord 2, 95700 Roissy-en-France", 49.0040, 2.5700, "hotel");
const BASILIQUE = photon("Basilique du Sacré-Cœur, 75018 Paris", 48.8867, 2.3431, "culture");
const BAR = photon("Le Sacré Coeur (bar), 75018 Paris", 48.8850, 2.3400, "restauration");
const AVENUE = ban("Avenue des Champs-Élysées 75008 Paris", 48.8698, 2.3075, { categorie: "voie", codePostal: "75008", ville: "Paris" });
const HOTEL_CE = photon("Hôtel Champs-Élysées Plaza, 75008 Paris", 48.8720, 2.3010, "hotel");
const PAIX_PARIS = ban("Rue de la Paix 75002 Paris", 48.8690, 2.3310, { categorie: "voie", codePostal: "75002", ville: "Paris" });
const PAIX_BOULOGNE = ban("Rue de la Paix 92100 Boulogne-Billancourt", 48.8353, 2.2399, { categorie: "voie", codePostal: "92100", ville: "Boulogne-Billancourt" });
const PAIX_ORLEANS = ban("Rue de la Paix 45000 Orléans", 47.9029, 1.9093, { categorie: "voie" });       // ≈ 111 km
const PAIX_NANTES = ban("Rue de la Paix 44000 Nantes", 47.2184, -1.5536, { categorie: "voie" });        // ≈ 343 km
const PAIX_MARSEILLE = ban("Rue de la Paix 13001 Marseille", 43.2965, 5.3698, { categorie: "voie" });   // ≈ 660 km
const GARE_DU_NORD = photon("Gare du Nord, 18 Rue de Dunkerque, 75010 Paris", 48.8809, 2.3553, "gare", { osm: "station" });
const NORD_MARSEILLE = ban("Rue du Nord 13001 Marseille", 43.2990, 5.3800, { categorie: "voie" });
const MELUN = { lat: 48.5392, lon: 2.6603 };

/* ── 1. La distance d'édition, et ce qu'elle tolère ── */
{
  const E = L.distanceEdition;
  check("« roisy » est à une lettre de « roissy »", E("roisy", "roissy", 1) === 1);
  check("« charle » de « charles », « beauvai » de « beauvais » : une lettre", E("charle", "charles", 1) === 1 && E("beauvai", "beauvais", 1) === 1);
  check("« orli » et « orly » : une substitution", E("orly", "orli", 1) === 1);
  check("un mot identique : zéro", E("paris", "paris", 1) === 0);
  check("au-delà du maximum, la distance rendue est max + 1, sans aller plus loin", E("abc", "xyz", 1) === 2 && E("ab", "abcd", 1) === 2);
  check("deux lettres tolérées quand on le demande", E("amsterda", "amsterdam", 2) === 1 && E("disneylan", "disneyland", 2) === 1);

  const P = L.cleProche;
  check("une clé d'aéroport se reconnaît à une faute près : « roisy » → roissy, « gaule » → gaulle, « beauvai » → beauvais",
    P("roisy", "roissy") && P("gaule", "gaulle") && P("beauvai", "beauvais"));
  check("« tilly » ne touche PAS « tille » : la clé a cinq lettres, il en faut six", P("tilly", "tille") === false);
  check("quatre lettres tapées ne touchent rien (« cdg » n'est pas « beauvais », « rois » n'est pas « roissy »)", P("cdg", "beauvais") === false && P("rois", "roissy") === false);
  check("deux fautes, c'est trop : « roisi » n'est pas « roissy »", P("roisi", "roissy") === false);

  const M = L.motProche;
  check("« roisy » est proche d'un mot du libellé « novotel roissy cdg »", M("roisy", ["novotel", "roissy", "cdg"]) === true);
  check("sous cinq lettres, rien : « orli » reste « orli »", M("orli", ["orly", "aeroport"]) === false);
  check("à partir de huit lettres, deux fautes : « amsterda » touche « amsterdam »", M("amsterda", ["rue", "d", "amsterdam"]) === true);
  check("un mot pas fini se compare au début du mot : « montparn » touche « montparnasse »", M("montparn", ["gare", "montparnasse"]) === true);
  check("mais seulement si le mot du libellé est plus long : « montparnasse » ne touche pas « montparn »", M("montparnasse", ["montparn"]) === false);
  check("« bercy » ne touche ni « ibis », ni « paris », ni « bastille »", M("bercy", ["ibis", "paris", "bastille"]) === false);
  check("« roisi » touche « roissy » par son début : « roiss » est à une lettre", M("roisi", ["roissy"]) === true);
  check("sous huit lettres, une seule faute : « bauvai » (deux fautes, même sur le début) ne touche pas « beauvais »", M("bauvai", ["beauvais"]) === false);
}

/* ── 2. Les terminaux reconnus dans la saisie, dans la langue du client ── */
{
  const T = (q, langue) => L.terminauxPourSaisie(q, langue || "fr");
  const cdg = T("cdg");
  check("« cdg » rend les neuf terminaux de Roissy, dans l'ordre de config.js",
    cdg.length === 9 && cdg[0].label === "Terminal 1 — Aéroport Roissy-Charles de Gaulle" && cdg[8].label === "Terminal 3 — Aéroport Roissy-Charles de Gaulle",
    cdg.map((t) => t.label).join(" | "));
  check("un terminal est un lieu nommé, catégorie aéroport, source elatransfer, aux coordonnées de config.js",
    cdg[0].lieuNomme === true && cdg[0].categorie === "aeroport" && cdg[0].source === "elatransfer"
    && cdg[0].sourceId === "aeroport:cdg:Terminal 1" && cdg[0].lat === C.AEROPORTS.cdg.terminaux["Terminal 1"][0]
    && cdg[0].lon === C.AEROPORTS.cdg.terminaux["Terminal 1"][1]);
  check("« orly 4 » rend les quatre terminaux d'Orly", T("orly 4").length === 4 && T("orly 4")[3].label === "Orly 4 — Aéroport de Paris-Orly");
  check("« roisy », « charle de gaule », « gaulle » : Roissy quand même", T("roisy").length === 9 && T("charle de gaule").length === 9 && T("gaulle").length === 9);
  check("« tilly » ne propose pas Beauvais ; « ro », « rouen », « aeroport » ne proposent rien", T("tilly").length === 0 && T("ro").length === 0 && T("rouen").length === 0 && T("aeroport").length === 0);
  check("une saisie vide ne rend rien", T("").length === 0 && T("   ").length === 0);
  check("en anglais, le même terminal porte le nom anglais de l'aéroport", T("cdg", "en")[0].label === "Terminal 1 — Paris-Charles de Gaulle Airport");
  check("« Terminal unique » a une forme anglaise, « Single terminal »", T("beauvais", "en")[0].label === "Single terminal — Paris-Beauvais Airport" && T("beauvais", "fr")[0].label === "Terminal unique — Aéroport de Beauvais-Tillé");
  check("libelleTerminal écrit « nom du terminal — aéroport », selon la langue",
    L.libelleTerminal("orly", "Orly 3", "fr") === "Orly 3 — Aéroport de Paris-Orly" && L.libelleTerminal("orly", "Orly 3", "en") === "Orly 3 — Paris-Orly Airport");
}

/* ── 3. Les variantes : la saisie, puis la saisie sans ses mots passe-partout ── */
{
  const V = L.variantes;
  check("« hôtel ibis bercy » → la saisie, puis « ibis bercy »", meme(V("hôtel ibis bercy"), ["hôtel ibis bercy", "ibis bercy"]));
  check("« ibis bercy » n'a rien à retirer : une seule forme", meme(V("ibis bercy"), ["ibis bercy"]));
  check("« hotel » seul n'a que des mots courants : une seule forme", meme(V("hotel"), ["hotel"]));
  check("« gare du nord » → puis « nord » ; « 12 rue de la paix » → puis « 12 rue paix »", meme(V("  gare du nord "), ["gare du nord", "nord"]) && meme(V("12 rue de la paix"), ["12 rue de la paix", "12 rue paix"]));
}

/* ── 4. Reconnaître un hôtel ── */
{
  check("un lieu de catégorie « hotel » est un hôtel", L.estHotel({ categorie: "hotel", label: "Le Bristol" }) === true);
  check("« Ibis Paris Bercy », « Résidence du Parc » : par le libellé", L.estHotel({ categorie: "adresse", label: "Ibis Paris Bercy" }) && L.estHotel({ categorie: "adresse", label: "Résidence du Parc" }));
  check("« 12 rue de la Gare, Melun » n'est pas un hôtel ; rien non plus", !L.estHotel({ categorie: "adresse", label: "12 rue de la Gare, 77000 Melun" }) && !L.estHotel(null));
}

/* ── 5. Le dégradé de distance, et la distance à Paris ── */
{
  const B = L.bonusDistance;
  check("jusqu'à 90 km : +3 (0, 42, 90)", B(0) === 3 && B(42) === 3 && B(90) === 3);
  check("juste au-delà, jusqu'à 200 km : +1 (90,1 ; 200)", B(90.1) === 1 && B(200) === 1);
  check("jusqu'à 400 km : 0 (200,5 ; 400)", B(200.5) === 0 && B(400) === 0);
  check("au-delà de 400 km : −2, jamais une exclusion (400,1 ; 660)", B(400.1) === -2 && B(660) === -2);
  const km = L.distanceParis(MELUN);
  check("Melun est à ≈ 42 km de Paris à vol d'oiseau (entre 40 et 44)", km >= 40 && km <= 44, String(km));
  check("le centre de Paris est à 0 km ; sans coordonnées, pas de distance", L.distanceParis({ lat: 48.8566, lon: 2.3522 }) === 0 && L.distanceParis({ label: "x" }) === null);
}

/* ── 6. La note, règle par règle ── */
{
  const N = L.note;
  /* NOVOTEL_ROISSY, mots « novotel roisy » : +2 lieu nommé ; « novotel » +3 ;
     « roisy » absent mais à une faute de « roissy » : +2 ; +3 distance → 10.
     NOVOTEL_LYON : +2 ; « novotel » +3 ; « roisy » ne touche rien ; +3 → 8. */
  check("« novotel roisy » : le Novotel de Roissy note 10, celui de Gare de Lyon 8", N(NOVOTEL_ROISSY, ["novotel", "roisy"]) === 10 && N(NOVOTEL_LYON, ["novotel", "roisy"]) === 8,
    N(NOVOTEL_ROISSY, ["novotel", "roisy"]) + " / " + N(NOVOTEL_LYON, ["novotel", "roisy"]));
  /* BASILIQUE, mots « sacre coeur » : +2 ; « sacre » +3 ; « coeur » +3 (« œ »
     ramené à « oe ») ; monument nommé +3 ; +3 → 14.
     BAR : +2 ; +3 ; +3 ; bar non demandé −2 ; +3 → 9. */
  check("« sacré coeur » : la basilique note 14, le bar 9", N(BASILIQUE, ["sacre", "coeur"]) === 14 && N(BAR, ["sacre", "coeur"]) === 9,
    N(BASILIQUE, ["sacre", "coeur"]) + " / " + N(BAR, ["sacre", "coeur"]));
  /* BAR, mots « sacre coeur bar » : +2 ; +3 ; +3 ; « bar » est un mot courant
     présent, +1 ; demandé, donc pas de malus ; +3 → 12. */
  check("avec le mot « bar », le bar ne perd plus ses deux points : 12", N(BAR, ["sacre", "coeur", "bar"]) === 12, String(N(BAR, ["sacre", "coeur", "bar"])));
  /* AVENUE (BAN, voie, pas un lieu nommé), mots « champs elysee » : « champs »
     +3 ; « elysee » +3 ; rue entièrement tapée +3 ; +3 → 12.
     HOTEL_CE : +2 ; +3 ; +3 ; +3 → 11. */
  check("« champs elysee » : l'avenue note 12, l'hôtel qui porte son nom 11", N(AVENUE, ["champs", "elysee"]) === 12 && N(HOTEL_CE, ["champs", "elysee"]) === 11,
    N(AVENUE, ["champs", "elysee"]) + " / " + N(HOTEL_CE, ["champs", "elysee"]));
  /* PAIX_*, mots « rue de la paix » : « rue » +3 ; « de » +1 ; « la » +1 ;
     « paix » +3 ; rue entière +3 = 11 ; puis la distance : Paris +3 → 14,
     Orléans (111 km) +1 → 12, Nantes (343 km) 0 → 11, Marseille (660 km) −2 → 9. */
  const mots = ["rue", "de", "la", "paix"];
  check("« rue de la paix » : Paris 14, Orléans 12, Nantes 11, Marseille 9 — un dégradé, pas un seuil",
    N(PAIX_PARIS, mots) === 14 && N(PAIX_ORLEANS, mots) === 12 && N(PAIX_NANTES, mots) === 11 && N(PAIX_MARSEILLE, mots) === 9,
    [PAIX_PARIS, PAIX_ORLEANS, PAIX_NANTES, PAIX_MARSEILLE].map((x) => N(x, mots)).join(" / "));
  /* GARE_DU_NORD, mots « gare du nord » : +2 ; « gare » courant +1 ; « du » +1 ;
     « nord » +3 ; une gare n'a pas de bonus de catégorie ; +3 → 10.
     NORD_MARSEILLE : « gare » absent ; « du » +1 ; « nord » +3 ; rue entière
     +3 ; −2 → 5. */
  check("« gare du nord » : la gare note 10, la rue du Nord à Marseille 5", N(GARE_DU_NORD, ["gare", "du", "nord"]) === 10 && N(NORD_MARSEILLE, ["gare", "du", "nord"]) === 5,
    N(GARE_DU_NORD, ["gare", "du", "nord"]) + " / " + N(NORD_MARSEILLE, ["gare", "du", "nord"]));
  /* Un mot d'une lettre ne compte pas. PAIX_PARIS : rien + distance → 3.
     BAR : +2 lieu nommé, bar non demandé −2 (le malus ne dépend pas des
     mots trouvés), +3 → 3. */
  check("un mot d'une lettre ne compte pas : il ne reste le lieu nommé, le malus d'un bar et la distance", N(PAIX_PARIS, ["a"]) === 3 && N(BAR, ["a"]) === 3,
    N(PAIX_PARIS, ["a"]) + " / " + N(BAR, ["a"]));
}

/* ── 7. Le dédoublonnage : sur le libellé, et sur le point ── */
{
  const D = L.dedoublonner;
  const n = (l) => l.map((x) => x.label);
  check("deux libellés égaux aux accents et à la casse près : un seul, le premier",
    meme(n(D([{ label: "Gare du Nord, Paris", lat: 48.8809, lon: 2.3553 }, { label: "gare du nord, paris", lat: 48.8811, lon: 2.3556 }])), ["Gare du Nord, Paris"]));
  check("deux points égaux à quatre décimales (≈ 10 m) : un seul, même si les libellés diffèrent",
    meme(n(D([{ label: "A", lat: 48.88091, lon: 2.35531 }, { label: "B", lat: 48.88094, lon: 2.35534 }])), ["A"]));
  check("deux points à 0,0001° l'un de l'autre restent deux lieux",
    meme(n(D([{ label: "A", lat: 48.8809, lon: 2.3553 }, { label: "B", lat: 48.8810, lon: 2.3553 }])), ["A", "B"]));
  check("sans coordonnées, le libellé seul décide ; un libellé vide est écarté",
    meme(n(D([{ label: "X" }, { label: "Y" }, { label: "" }, { label: "x" }])), ["X", "Y"]));
}

/* ── 8. Le lieu structuré : depuis un élément choisi, et rien d'autre ── */
{
  const S = L.lieuStructure;
  check("sans coordonnées, pas de lieu (null) : texte tapé, NaN, chaîne", S(null) === null && S({ label: "x" }) === null && S({ label: "x", lat: NaN, lon: 2 }) === null && S({ label: "x", lat: "48.8", lon: 2.3 }) === null);
  const gare = S({ label: "Gare du Nord, 18 Rue de Dunkerque, 75010 Paris", lat: 48.88091234, lon: 2.35531234, lieuNomme: true, source: "photon", sourceId: "N123", categorie: "gare" });
  check("un lieu nommé de Photon : son nom avant la virgule, l'adresse entière, six décimales, sa source",
    meme(gare, { nom: "Gare du Nord", adresse: "Gare du Nord, 18 Rue de Dunkerque, 75010 Paris", latitude: 48.880912, longitude: 2.355312, provider: "photon", providerId: "N123", categorie: "gare" }), JSON.stringify(gare));
  const adresse = S(PAIX_PARIS);
  check("une adresse de la BAN : pas de nom, catégorie « voie », source « ban »",
    adresse.nom === "" && adresse.adresse === "Rue de la Paix 75002 Paris" && adresse.provider === "ban" && adresse.categorie === "voie");
  const terminal = S(L.terminauxPourSaisie("cdg", "fr")[5]);
  check("un terminal : le nom avant le tiret long, source « elatransfer », son identifiant",
    terminal.nom === "Terminal 2E" && terminal.provider === "elatransfer" && terminal.providerId === "aeroport:cdg:Terminal 2E" && terminal.categorie === "aeroport");
  check("un « nom » posé sur l'élément l'emporte sur le libellé", S({ nom: "easyHotel Aéroville", label: "10 Rue de la Belle Borne, 93410 Tremblay-en-France", lat: 48.964, lon: 2.548, lieuNomme: true }).nom === "easyHotel Aéroville");
  const long = S({ label: "x".repeat(400), nom: "n".repeat(200), lat: 1, lon: 2, sourceId: "i".repeat(200) });
  check("les bornes : 160 pour le nom, 300 pour l'adresse, 120 pour l'identifiant ; sans source, « elatransfer » et « adresse »",
    long.nom.length === 160 && long.adresse.length === 300 && long.providerId.length === 120 && long.provider === "elatransfer" && long.categorie === "adresse");
}

/* ── 9. L'assemblage de la liste, tel que le client la voit ── */
{
  const liste = async (q, banRep, photonRep) => (await L.assembler(q, [banRep, photonRep], L.terminauxPourSaisie(q, "fr"))).map((x) => x.label);
  let l = await liste("cdg", [], []);
  check("« cdg » : les neuf terminaux, et rien d'autre", l.length === 9 && l[0].startsWith("Terminal 1 — ") && l[8].startsWith("Terminal 3 — "), l.join(" | "));
  l = await liste("sacre coeur", [], [BAR, BASILIQUE]);
  check("« sacre coeur », le bar rendu en premier par le service : la basilique passe devant", meme(l, [BASILIQUE.label, BAR.label]), l.join(" | "));
  l = await liste("champs elysee", [AVENUE], [HOTEL_CE]);
  check("« champs elysee », l'hôtel rendu par Photon et l'avenue par la BAN : l'avenue devant", meme(l, [AVENUE.label, HOTEL_CE.label]), l.join(" | "));
  l = await liste("novotel roisy", [], [NOVOTEL_LYON, NOVOTEL_ROISSY]);
  check("« novotel roisy » : le Novotel de Roissy, celui de Gare de Lyon, PUIS les neuf terminaux — un nom distinctif passe devant",
    l.length === 11 && l[0] === NOVOTEL_ROISSY.label && l[1] === NOVOTEL_LYON.label && l[2].startsWith("Terminal 1 — ") && l[10].startsWith("Terminal 3 — "), l.join(" | "));
  l = await liste("ibis roissy", [], [NOVOTEL_ROISSY, IBIS_ROISSY]);
  check("« ibis roissy » : l'Ibis devant, les neuf terminaux, le Novotel en dernier",
    l.length === 11 && l[0] === IBIS_ROISSY.label && l[1].startsWith("Terminal 1 — ") && l[9].startsWith("Terminal 3 — ") && l[10] === NOVOTEL_ROISSY.label, l.join(" | "));
  l = await liste("12 rue de la paix", [ban("12 Rue de la Paix 13001 Marseille", 43.2965, 5.3698), ban("12 Rue de la Paix 75002 Paris", 48.8690, 2.3310)], []);
  check("une adresse qui commence par un chiffre, Marseille rendue en premier : Paris passe devant", meme(l, ["12 Rue de la Paix 75002 Paris", "12 Rue de la Paix 13001 Marseille"]), l.join(" | "));
  l = await liste("rue de la paix", [PAIX_MARSEILLE, PAIX_NANTES, PAIX_PARIS, PAIX_ORLEANS], []);
  check("« rue de la paix » rendue dans le désordre : Paris, Orléans, Nantes, Marseille — rien n'est retiré",
    meme(l, [PAIX_PARIS.label, PAIX_ORLEANS.label, PAIX_NANTES.label, PAIX_MARSEILLE.label]), l.join(" | "));
  const a = await liste("rue de la paix", [PAIX_PARIS, PAIX_BOULOGNE], []);
  const b = await liste("rue de la paix", [PAIX_BOULOGNE, PAIX_PARIS], []);
  check("deux notes égales gardent l'ordre du service, dans un sens comme dans l'autre",
    meme(a, [PAIX_PARIS.label, PAIX_BOULOGNE.label]) && meme(b, [PAIX_BOULOGNE.label, PAIX_PARIS.label]), a.join(" | ") + " // " + b.join(" | "));
  l = await liste("gare du nord", [NORD_MARSEILLE], [GARE_DU_NORD, Object.assign({}, GARE_DU_NORD, { lat: 48.88091 })]);
  check("« gare du nord » : la gare devant la rue, et la gare rendue deux fois n'apparaît qu'une fois", meme(l, [GARE_DU_NORD.label, NORD_MARSEILLE.label]), l.join(" | "));
  const dix = Array.from({ length: 10 }, (_, i) => photon("Hôtel Essai " + (i + 1) + ", 75001 Paris", 48.86 + i / 1000, 2.35, "hotel"));
  l = await liste("hotel paris", [], dix);
  check("huit lignes au plus sans terminal, dans l'ordre du service", l.length === 8 && l[0] === dix[0].label && l[7] === dix[7].label, l.join(" | "));
  l = await liste("cdg", [], dix.slice(0, 5));
  check("avec les terminaux : les neuf, puis trois lignes de plus, pas davantage", l.length === 12 && l[8].startsWith("Terminal 3 — ") && l[9] === dix[0].label && l[11] === dix[2].label, l.join(" | "));
  l = await liste("orly 4", [], [IBIS_ROISSY]);
  check("« orly 4 » : les quatre terminaux d'Orly dans l'ordre de config.js, puis l'hôtel", l.length === 5 && l[0].startsWith("Orly 1 — ") && l[3].startsWith("Orly 4 — ") && l[4] === IBIS_ROISSY.label, l.join(" | "));
}

/* ── 10. Le module est pur, et il est à sa place dans la page, la recette et le service worker ── */
if (sourceLieux) {
  const sansCommentaires = (s) => s.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const corps = sansCommentaires(sourceLieux);
  check("lieux.js ne touche ni au DOM, ni au réseau, ni au stockage, ni à l'horloge",
    !/\b(document|navigator|location)\b|\bwindow\.[a-zA-Z_]|\bfetch\s*\(|\b(localStorage|sessionStorage)\b|\bDate\b|setTimeout/.test(corps));
  check("lieux.js ne tient ni tarif, ni fiche d'hôtel, ni clé de serveur", !/\bHOTELS\b|SUPABASE|parKm|forfait\s*:\s*\{|tranches\s*:/.test(corps));
  check("lieux.js ne nomme aucun partenaire", !/easyhotel|aeroville/i.test(corps));
  const page = readFileSync("index.html", "utf8"), corpsPage = sansCommentaires(page);
  const pos = (s) => page.indexOf(s);
  check("la page charge lieux.js après config.js, itineraire-partage.js et prix.js, avant le moteur",
    pos('<script src="prix.js">') > 0 && pos('<script src="prix.js">') < pos('<script src="lieux.js">')
    && pos('<script src="lieux.js">') < pos('if(!window.ELA_LIEUX) throw'));
  check("le moteur refuse de démarrer sans lieux.js", pos('if(!window.ELA_LIEUX) throw') > 0);
  const encore = ["function distanceEdition(", "function motProche(", "function bonusDistance(", "function cleProche(",
    "HOTEL_MOTS", "MOTS_COURANTS", "MOTS_RESTO", "RAYON_RECHERCHE_KM", "var nommes = photon.filter"].filter((s) => corpsPage.includes(s));
  check("le moteur ne porte plus le classement, seulement des alias d'une ligne", encore.length === 0, encore.join(" | "));
  const alias = ["lieuStructure", "estHotel", "libelleTerminal", "terminauxPourSaisie", "variantes", "dedoublonner"]
    .filter((n) => !new RegExp("function " + n + "\\([^)]*\\)\\{\\s*return window\\.ELA_LIEUX\\." + n + "\\(").test(corpsPage));
  check("chaque appelant de la page passe par un alias qui nomme ELA_LIEUX", alias.length === 0, "manquent : " + alias.join(", "));
  check("c'est la page, et elle seule, qui appelle les services (chercher, depuisBAN, depuisPhoton)",
    /function chercher\(/.test(corpsPage) && /window\.ELA_LIEUX\.assembler\(q, res, terminaux\)/.test(corpsPage) && !/depuisBAN|depuisPhoton|chercher/.test(corps));
  const recette = readFileSync("construire.sh", "utf8").split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
  check("construire.sh copie lieux.js dans site/", /\blieux\.js\b/.test(recette.split("masquer-commentaires")[0]));
  check("construire.sh masque les commentaires de site/lieux.js", /site\/lieux\.js/.test(recette));
  check("sw.js garde lieux.js dans son SHELL", /"\.\/lieux\.js"/.test(sansCommentaires(readFileSync("sw.js", "utf8"))));
  check("tests.sh lance test-lieux.mjs", /test-lieux\.mjs/.test(readFileSync(".claude/outils/tests.sh", "utf8")));
} else {
  console.log("(lieux.js absent : les fonctions sont découpées dans index.html, les contrôles de structure attendront le déplacement)");
}

for (const l of ok) console.log("✔ " + l);
if (ko.length) { console.log("\n=== ÉCHECS (" + ko.length + ") ==="); for (const l of ko) console.log("✘ " + l); console.log(""); }
console.log(`=== ${ok.length} réussis, ${ko.length} échecs ===`);
process.exit(ko.length ? 1 : 0);
