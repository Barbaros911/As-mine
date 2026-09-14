import fs from 'node:fs';

const file = process.argv[2] || 'site/index.html';
let html = fs.readFileSync(file, 'utf8');

const title = 'ELA Transfer — Chauffeur privé à Paris et en Île-de-France';
const description = 'Chauffeur privé à Paris et en Île-de-France. Transferts aéroports, hôtels, gares et trajets sur réservation. Prix annoncé avant la demande.';

html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${description}">`);

const extra = `
<!-- ELA SEO / identité -->
<link rel="icon" href="/icon-180.png" type="image/png">
<link rel="apple-touch-icon" href="/icon-180.png" sizes="180x180">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#0b2f63">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="ELA Transfer">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="https://elatransfer.com/">
<meta property="og:image" content="https://elatransfer.com/icon-180.png">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'ELA Transfer',
  url: 'https://elatransfer.com/',
  logo: 'https://elatransfer.com/brand-logo.webp',
  image: 'https://elatransfer.com/brand-logo.webp',
  telephone: '+33759312433',
  email: 'contact@elatransfer.com',
  areaServed: [
    { '@type': 'City', name: 'Paris' },
    { '@type': 'AdministrativeArea', name: 'Île-de-France' }
  ],
  description,
  sameAs: []
})}</script>
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ELA Transfer',
  url: 'https://elatransfer.com/'
})}</script>
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
html = html.replace(brandPattern, '<a class="brand" href="/" aria-label="ELA Transfer"><img class="brandReal" src="/brand-logo.webp" alt="ELA Transfer"></a>');

fs.writeFileSync(file, html);
console.log(`SEO ELA appliqué à ${file}`);
