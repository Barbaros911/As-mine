import fs from 'node:fs';

const file = process.argv[2] || 'site/index.html';
let html = fs.readFileSync(file, 'utf8');

const title = 'Elatransfer — Transferts privés & réservation pour partenaires';
const description = 'Transferts privés à Paris et aéroports, prix ferme. Hôtels, agences, entreprises : votre page client et espace réception, Elatransfer gère chaque transport.';

html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${description}">`);

/* PLUS DE SECOND MANIFESTE, DE SECONDE COULEUR NI DE SECONDE SÉRIE DE
   PARTAGE (6 octobre 2026). index.html porte déjà les siens : en double, un
   réseau social lisait l'une ou l'autre série, et un second manifeste
   pouvait contredire l'échange de l'espace exploitant (id="manifeste").
   L'image de partage vit désormais dans index.html, avec le reste.
   LES DEUX LIGNES D'ICÔNES RESTENT, et c'est délibéré : en retirer une peut
   changer l'image que le navigateur choisit pour l'onglet — c'est le logo,
   on n'y touche pas sans Barbaros. Même chose pour le style .brandReal. */
const extra = `
<!-- ELA SEO / identité -->
<link rel="icon" href="/icon-180.png" type="image/png">
<link rel="apple-touch-icon" href="/icon-180.png" sizes="180x180">
<style>
.brandReal{display:block;width:182px;height:auto;max-height:64px;object-fit:contain}
.drawer .brandReal{width:190px}
@media(max-width:560px){.brandReal{width:150px;max-height:54px}.drawer .brandReal{width:165px}}
</style>
<!-- /ELA SEO / identité -->
`;

if (!html.includes('ELA SEO / identité')) {
  html = html.replace('</head>', `${extra}</head>`);
}

const brandPattern = /<a class="brand" href="\/">\s*<span class="mark">ELA<\/span>\s*<span class="word">TRANSFER<small>PRIVATE DRIVER SERVICE<\/small><\/span>\s*<\/a>/g;
html = html.replace(brandPattern, '<a class="brand" href="/" aria-label="Elatransfer"><img class="brandReal" src="/brand-logo.webp" alt="Elatransfer"></a>');

fs.writeFileSync(file, html);
console.log(`SEO ELA appliqué à ${file}`);
