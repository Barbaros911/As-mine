// ═══ CE QUE GOOGLE PEUT DÉCOUVRIR, LIRE ET INDEXER (15 octobre 2026, Prompt 2) ═══
// Mémoire : memoire/seo-indexation.md.
//
// UN SEUL JUGE, DEUX CIBLES. Le même code lit le site construit (test-seo-en,
// en CI, avant la fusion) et le site en ligne (verifier-production, après
// chaque publication et toutes les 6 h). Deux contrôles finiraient par se
// contredire — c'est la règle du dépôt depuis le contrôleur de production.
//
// ON LIT CE QUE GOOGLE LIT : robots.txt, le plan du site, puis le HTML BRUT
// de chaque adresse du plan, SANS suivre les redirections et sans exécuter
// le moindre script. Une page dont le titre ou le H1 n'existe qu'après le
// JavaScript n'existe pas pour ce contrôle.
//
// POURQUOI SANS SUIVRE LES REDIRECTIONS. Le contrôleur de production suivait
// les redirections : une adresse du plan devenue une redirection restait
// verte. C'est exactement le défaut que le Prompt 1 a trouvé (la canonique
// des pages françaises visait une adresse en .html, redirigée en 307).
//
// POURQUOI LE PLAN DU SITE EST VÉRIFIÉ COMME UN FICHIER. Chez Cloudflare, une
// adresse inconnue rend l'ACCUEIL en 200 (« not_found_handling »). Un
// sitemap.xml absent ne rendrait donc pas une erreur : il rendrait la page
// d'accueil, et un contrôle de code HTTP resterait vert.
//
// Aucune dépendance : des expressions régulières sur nos propres pages, que
// nous écrivons. Ce n'est pas un analyseur HTML universel.

export const DOMAINE = "https://elatransfer.com/";

/* Le lecteur réel : une requête par adresse, sans suivre les redirections.
   `lire(chemin)` rend { status, location, xrobots, type, texte }. */
export function lecteurHttp(base) {
  const racine = String(base).replace(/\/*$/, "/");
  return async (chemin) => {
    const r = await fetch(racine + String(chemin).replace(/^\//, ""), { redirect: "manual" });
    return {
      status: r.status,
      location: r.headers.get("location") || "",
      xrobots: r.headers.get("x-robots-tag") || "",
      type: r.headers.get("content-type") || "",
      texte: r.status === 200 ? await r.text() : "",
    };
  };
}

/* ---- robots.txt, lu avec les règles de Google -------------------------
   Le groupe « Googlebot » s'il existe, sinon « * ». Le motif le plus LONG
   qui correspond l'emporte ; à égalité, Allow gagne. `*` = n'importe quoi,
   `$` final = fin d'adresse. */
export function reglesRobots(texte) {
  const groupes = [];
  let agents = [], regles = [], dansRegles = false;
  for (const brute of String(texte).split(/\r?\n/)) {
    const m = /^\s*([A-Za-z-]+)\s*:\s*(.*?)\s*$/.exec(brute.replace(/#.*$/, ""));
    if (!m) continue;
    const cle = m[1].toLowerCase(), val = m[2];
    if (cle === "user-agent") {
      if (dansRegles) { groupes.push({ agents, regles }); agents = []; regles = []; dansRegles = false; }
      agents.push(val.toLowerCase());
    } else if (cle === "allow" || cle === "disallow") {
      dansRegles = true;
      if (val) regles.push({ permis: cle === "allow", motif: val });
    }
  }
  if (agents.length) groupes.push({ agents, regles });
  const google = groupes.filter((g) => g.agents.includes("googlebot"));
  return (google.length ? google : groupes.filter((g) => g.agents.includes("*"))).flatMap((g) => g.regles);
}

function motifEnRegex(motif) {
  const fin = motif.endsWith("$");
  const corps = fin ? motif.slice(0, -1) : motif;
  return new RegExp("^" + corps.split("*").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (fin ? "$" : ""));
}

/* Rend la règle qui bloque `chemin` (« /en/?x=1 »), ou null s'il est permis. */
export function bloquePar(regles, chemin) {
  let retenue = null;
  for (const r of regles) {
    if (!motifEnRegex(r.motif).test(chemin)) continue;
    if (!retenue || r.motif.length > retenue.motif.length || (r.motif.length === retenue.motif.length && r.permis)) retenue = r;
  }
  return retenue && !retenue.permis ? retenue : null;
}

/* ---- Le HTML brut ----------------------------------------------------- */
const ENTITES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decoder = (s) => String(s)
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/gi, (t, n) => ENTITES[n.toLowerCase()] ?? t);
const balises = (html, nom) => [...html.matchAll(new RegExp(`<${nom}\\b[^>]*>`, "gi"))].map((m) => m[0]);
const attribut = (balise, nom) => {
  const m = new RegExp(`\\s${nom}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(balise);
  return m ? decoder(m[1] ?? m[2]) : null;
};

/* Ce qu'un robot lit sans exécuter de script. Les commentaires et le CONTENU
   des scripts sont retirés d'abord : une chaîne « <meta name="robots"… »
   écrite dans du JavaScript n'est pas une balise. Les données structurées
   sont lues à part, avant ce retrait. */
export function lirePage(html) {
  const brut = String(html);
  const ld = [...brut.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const propre = brut.replace(/<!--[\s\S]*?-->/g, "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const fin = propre.search(/<\/head>/i);
  const tete = fin >= 0 ? propre.slice(0, fin) : propre;
  const metas = balises(tete, "meta");
  const meta = (nom) => metas.filter((b) => (attribut(b, "name") || "").toLowerCase() === nom).map((b) => attribut(b, "content") || "");
  const liens = balises(tete, "link");
  const rel = (b) => (attribut(b, "rel") || "").toLowerCase().split(/\s+/);
  return {
    lang: attribut((balises(propre, "html")[0] || ""), "lang") || "",
    titres: [...tete.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => decoder(m[1]).replace(/\s+/g, " ").trim()),
    descriptions: meta("description"),
    robots: meta("robots").join(", "),
    canoniques: liens.filter((b) => rel(b).includes("canonical")).map((b) => attribut(b, "href") || ""),
    hreflang: liens.filter((b) => rel(b).includes("alternate") && attribut(b, "hreflang") !== null)
      .map((b) => ({ code: attribut(b, "hreflang"), href: attribut(b, "href") || "" })),
    h1: [...propre.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
      .map((m) => decoder(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()).filter((t) => t.length > 1),
    ld,
  };
}

/* L'adresse que Cloudflare sert pour un fichier du site construit
   (« html_handling: auto-trailing-slash », mesuré avec wrangler dev) :
   « en/x/index.html » → « en/x/ », « x.html » → « x », « index.html » → « ». */
export function cheminServi(fichier) {
  const f = String(fichier).replace(/\\/g, "/").replace(/^\/+/, "");
  if (f === "index.html") return "";
  if (f.endsWith("/index.html")) return f.slice(0, -"index.html".length);
  return f.replace(/\.html$/, "");
}

const CODE_LANGUE = /^(x-default|[a-z]{2,3}(-[A-Z]{2}|-[0-9]{3})?)$/;
const sansNoindex = (robots) => !/\bnoindex\b|\bnone\b/i.test(robots);

/* ---- LE JUGE ------------------------------------------------------------
   Rend { controles: [{ ok, m }], plan: [adresses absolues] }. Chaque
   message nomme l'adresse et ce qui a été lu : « ça ne va pas » ne se
   répare pas, « /en/x/ : canonique lue … » si. */
export async function auditerIndexation(lire) {
  const controles = [];
  const ok = (m) => controles.push({ ok: true, m });
  const ko = (m) => controles.push({ ok: false, m });

  // 1. robots.txt
  const rob = await lire("robots.txt");
  let regles = [];
  if (rob.status !== 200 || /<html/i.test(rob.texte) || !/^\s*user-agent\s*:/im.test(rob.texte)) {
    ko(`robots.txt n'est pas un fichier robots (HTTP ${rob.status}${/<html/i.test(rob.texte) ? ", une page HTML a répondu" : ""})`);
  } else {
    regles = reglesRobots(rob.texte);
    ok(`robots.txt répond, ${regles.length} règle(s) pour Google`);
    if (new RegExp(`^\\s*sitemap\\s*:\\s*${DOMAINE.replace(/[.]/g, "\\.")}sitemap\\.xml\\s*$`, "im").test(rob.texte)) ok("robots.txt déclare le plan du site");
    else ko(`robots.txt ne déclare pas « Sitemap: ${DOMAINE}sitemap.xml »`);
  }

  // 2. Le plan du site
  const sm = await lire("sitemap.xml");
  const plan = [...sm.texte.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => decoder(m[1]));
  if (sm.status !== 200 || !/<urlset\b[^>]*sitemaps\.org\/schemas\/sitemap\/0\.9/.test(sm.texte) || /<html/i.test(sm.texte)) {
    ko(`sitemap.xml n'est pas un plan du site (HTTP ${sm.status}${/<html/i.test(sm.texte) ? ", une page HTML a répondu — l'accueil servi à la place d'un fichier absent ?" : ""})`);
    return { controles, plan: [] };
  }
  const doublons = plan.filter((u, i) => plan.indexOf(u) !== i);
  const etrangers = plan.filter((u) => !u.startsWith(DOMAINE));
  if (!plan.length) ko("le plan du site ne donne aucune adresse");
  else if (doublons.length || etrangers.length) ko(`plan du site : ${doublons.length ? "en double " + doublons.join(", ") : ""}${etrangers.length ? " hors du domaine https " + etrangers.join(", ") : ""}`);
  else ok(`le plan du site donne ${plan.length} adresse(s), toutes en https sur le domaine, sans doublon`);

  // 3. Chaque adresse du plan, comme Google la lit
  const lues = new Map();
  for (const url of plan.filter((u) => u.startsWith(DOMAINE))) {
    const chemin = url.slice(DOMAINE.length);
    const nom = "/" + chemin;
    const r = await lire(chemin);
    if (r.status !== 200) {
      ko(`${nom} répond ${r.status}${r.location ? " → " + r.location : ""} : une adresse du plan doit répondre 200, sans redirection`);
      continue;
    }
    const p = lirePage(r.texte);
    lues.set(url, p);
    const fautes = [];
    if (!sansNoindex(r.xrobots)) fautes.push(`en-tête X-Robots-Tag « ${r.xrobots} »`);
    if (!sansNoindex(p.robots)) fautes.push(`balise robots « ${p.robots} »`);
    if (/\bnofollow\b/i.test(p.robots)) fautes.push(`balise robots « ${p.robots} » (nofollow : ses liens ne comptent plus)`);
    const regle = bloquePar(regles, "/" + chemin);
    if (regle) fautes.push(`bloquée par robots.txt (« Disallow: ${regle.motif} »)`);
    if (p.canoniques.length !== 1) fautes.push(`${p.canoniques.length} canonique(s) au lieu d'une`);
    else if (p.canoniques[0] !== url) fautes.push(`canonique « ${p.canoniques[0]} » au lieu d'elle-même`);
    if (p.titres.length !== 1 || p.titres[0].length < 10) fautes.push(`titre absent ou multiple (${p.titres.length})`);
    if (!p.descriptions.length || p.descriptions[0].length < 50) fautes.push("description absente ou trop courte");
    if (!p.h1.length) fautes.push("aucun H1 dans le HTML (sans exécuter de script)");
    if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(p.lang)) fautes.push(`<html lang> absent ou faux (« ${p.lang} »)`);
    for (const bloc of p.ld) {
      let lisible = true; try { JSON.parse(bloc); } catch { lisible = false; }
      if (!lisible) fautes.push("données structurées illisibles (JSON invalide)");
      const vieille = /https:\/\/elatransfer\.com\/[^"\s#?]*\.html/.exec(bloc);
      if (vieille) fautes.push(`données structurées : adresse « ${vieille[0]} », qui redirige`);
    }
    if (fautes.length) ko(`${nom} : ${fautes.join(" · ")}`);
    else ok(`${nom} : 200, indexable, permise, canonique sur elle-même, titre, description, H1${p.ld.length ? ", données lisibles" : ""}`);
  }

  // 4. Titres, descriptions et H1 uniques sur tout le plan
  for (const [quoi, prendre] of [["titre", (p) => p.titres[0]], ["description", (p) => p.descriptions[0]], ["H1", (p) => p.h1[0]]]) {
    const vus = new Map(), doubles = [];
    for (const [url, p] of lues) {
      const v = prendre(p); if (!v) continue;
      if (vus.has(v)) doubles.push(`« ${v.slice(0, 50)} » sur /${vus.get(v).slice(DOMAINE.length)} et /${url.slice(DOMAINE.length)}`);
      else vus.set(v, url);
    }
    if (doubles.length) ko(`${quoi} en double : ${doubles.join(" ; ")}`);
    else if (lues.size) ok(`chaque ${quoi} est unique sur les ${lues.size} pages du plan`);
  }

  // 5. hreflang : codes valides, cibles dans le plan, auto-référence, réciprocité
  let couples = 0;
  for (const [url, p] of lues) {
    if (!p.hreflang.length) continue;
    const nom = "/" + url.slice(DOMAINE.length);
    const fautes = [];
    for (const h of p.hreflang) {
      if (!CODE_LANGUE.test(h.code)) fautes.push(`code « ${h.code} » invalide`);
      if (!h.href.startsWith(DOMAINE)) fautes.push(`« ${h.code} » vise une adresse non absolue « ${h.href} »`);
      else if (!lues.has(h.href)) fautes.push(`« ${h.code} » vise ${h.href}, absente du plan du site ou illisible`);
    }
    const soi = p.hreflang.find((h) => h.href === url && h.code !== "x-default");
    if (!soi) fautes.push("ne se déclare pas elle-même");
    else if (soi.code.split("-")[0] !== p.lang.split("-")[0]) fautes.push(`se déclare « ${soi.code} » mais <html lang="${p.lang}">`);
    for (const h of p.hreflang.filter((x) => x.code !== "x-default" && x.href !== url && lues.has(x.href))) {
      couples++;
      const autre = lues.get(h.href);
      if (!autre.hreflang.some((x) => x.href === h.href && x.code === h.code)) fautes.push(`${h.href} ne se déclare pas « ${h.code} »`);
      if (!autre.hreflang.some((x) => x.href === url && x.code !== "x-default")) fautes.push(`${h.href} ne la déclare pas en retour (hreflang non réciproque)`);
    }
    if (fautes.length) ko(`${nom} hreflang : ${fautes.join(" · ")}`);
    else ok(`${nom} hreflang : ${p.hreflang.map((h) => h.code).join(", ")} — dans le plan, réciproques`);
  }
  if (lues.size && !couples) ko("aucun couple hreflang français ↔ anglais trouvé dans le plan du site");

  return { controles, plan };
}

/* ---- LE SITE CONSTRUIT : AUCUNE PAGE INDEXABLE OUBLIÉE ------------------
   Le juge part du plan du site : une page indexable qu'on aurait oublié d'y
   mettre (une nouvelle page /en/, par exemple) lui serait invisible — et à
   test-seo-en aussi, qui lit les pages anglaises dans ce même plan. Seul
   l'inventaire des fichiers construits peut la voir. Une page indexable
   doit être dans le plan, ou désigner par sa canonique une page du plan
   (application.html → « / »). Seulement sur le site construit : en ligne,
   on ne peut pas lister les fichiers. */
export function controlerInventaire(pages, plan) {
  const controles = [];
  /* Sans plan lisible, chaque page serait « oubliée » : une seule faute,
     celle du plan, déjà nommée par le juge — pas dix échos. */
  if (!plan.length) return [{ ok: false, m: "inventaire impossible : le plan du site est illisible" }];
  const dansPlan = new Set(plan);
  let indexables = 0;
  for (const { fichier, html } of pages) {
    const p = lirePage(html);
    if (!sansNoindex(p.robots)) continue;
    indexables++;
    const url = DOMAINE + cheminServi(fichier);
    if (dansPlan.has(url)) continue;
    if (p.canoniques.length === 1 && p.canoniques[0] !== url && dansPlan.has(p.canoniques[0])) continue;
    controles.push({ ok: false, m: `${fichier} (servie à /${cheminServi(fichier)}) est indexable mais absente du plan du site, sans canonique vers une page du plan — l'ajouter à sitemap.xml, ou la mettre en noindex` });
  }
  if (!controles.length) controles.push({ ok: true, m: `les ${indexables} pages indexables du site construit sont dans le plan du site ou renvoient vers lui` });
  return controles;
}
