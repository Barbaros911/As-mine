/* =====================================================================
   GALERIE DES DÉMONSTRATIONS
   Construit la page qui liste les sites de « sites/ », publiée sur
   .../As-mine/demos/. Elle est régénérée à chaque publication : ajouter
   ou retirer un site met la liste à jour tout seul, sans qu'aucun site
   existant — ni As-mine — soit modifié.
   ===================================================================== */
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "sites";
const SORTIE = "site/demos";

/* Récupère un champ du <head> sans dépendance : les pages sont écrites à
   la main, un extrait suffit et évite d'installer un analyseur HTML. */
function extraire(html, expression, defaut) {
  const trouve = html.match(expression);
  return trouve ? decoder(trouve[1].trim()) : defaut;
}

function decoder(texte) {
  return texte
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function echapper(texte) {
  return texte
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const sites = [];

if (existsSync(SOURCE)) {
  for (const nom of readdirSync(SOURCE, { withFileTypes: true })) {
    if (!nom.isDirectory()) continue;
    // Un dossier préfixé « _ » est un modèle interne : ni publié, ni listé.
    if (nom.name.startsWith("_")) continue;
    const page = join(SOURCE, nom.name, "index.html");
    if (!existsSync(page)) {
      console.log(`::warning::sites/${nom.name} n'a pas d'index.html : absent de la galerie.`);
      continue;
    }
    const html = readFileSync(page, "utf8");
    sites.push({
      dossier: nom.name,
      titre: extraire(html, /<title[^>]*>([\s\S]*?)<\/title>/i, nom.name),
      description: extraire(
        html,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
        ""
      )
    });
  }
}

sites.sort((a, b) => a.titre.localeCompare(b.titre, "fr"));

const cartes = sites.length
  ? sites.map((s) => `
      <a class="carte" href="../${echapper(s.dossier)}/">
        <span class="nom">${echapper(s.titre)}</span>
        ${s.description ? `<span class="desc">${echapper(s.description)}</span>` : ""}
        <span class="lien">Voir le site &rsaquo;</span>
      </a>`).join("")
  : `<p class="vide">Aucune démonstration pour l'instant.</p>`;

const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Démonstrations</title>
<meta name="description" content="Exemples de sites réalisés, à parcourir librement.">
<!-- Page construite automatiquement : ne pas la modifier à la main,
     elle est réécrite à chaque publication. -->
<meta name="robots" content="noindex, nofollow">
<style>
  :root{
    --fond:#ffffff; --texte:#16181d; --doux:#5b6270;
    --trait:#e4e7ec; --accent:#1f5eff; --carte:#f7f8fa;
  }
  @media (prefers-color-scheme: dark){
    :root{
      --fond:#101216; --texte:#f2f4f7; --doux:#a0a7b4;
      --trait:#262a32; --accent:#7fa2ff; --carte:#181b21;
    }
  }
  *{box-sizing:border-box}
  body{
    margin:0; background:var(--fond); color:var(--texte);
    font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    -webkit-text-size-adjust:100%;
  }
  .page{max-width:52rem; margin:0 auto; padding:4rem 1.25rem 5rem}
  h1{font-size:clamp(1.9rem,6vw,2.6rem); letter-spacing:-.02em; margin:0 0 .5rem}
  .chapeau{color:var(--doux); font-size:1.05rem; margin:0 0 2.75rem; max-width:34rem}
  .grille{display:grid; gap:1rem; grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))}
  .carte{
    display:flex; flex-direction:column; gap:.4rem;
    background:var(--carte); border:1px solid var(--trait); border-radius:12px;
    padding:1.25rem 1.35rem; text-decoration:none; color:inherit;
    transition:border-color .15s, transform .15s;
  }
  .carte:hover{border-color:var(--accent); transform:translateY(-2px)}
  .nom{font-weight:650; letter-spacing:-.01em}
  .desc{color:var(--doux); font-size:.92rem}
  .lien{color:var(--accent); font-size:.9rem; margin-top:.35rem}
  .vide{color:var(--doux)}
  footer{
    margin-top:3.5rem; padding-top:1.5rem; border-top:1px solid var(--trait);
    color:var(--doux); font-size:.9rem;
  }
  footer a{color:var(--accent)}
</style>
</head>
<body>
<main class="page">
  <h1>Démonstrations</h1>
  <p class="chapeau">
    Des exemples de sites, consultables librement. Chacun est indépendant :
    on peut en reprendre un, le modifier, ou repartir de zéro.
  </p>

  <div class="grille">${cartes}
  </div>

  <footer>
    Application de réservation As-mine : <a href="../">voir le site</a>.
  </footer>
</main>
</body>
</html>
`;

mkdirSync(SORTIE, { recursive: true });
writeFileSync(join(SORTIE, "index.html"), page, "utf8");
console.log(`Galerie construite : ${sites.length} site(s) — ${sites.map((s) => s.dossier).join(", ") || "aucun"}`);
