# L'indexation par Google — le Prompt 2 (15 octobre 2026)

> Archive de travail. Ce qui vaut aujourd'hui est dans `CLAUDE.md`, section
> « LA MARQUE ET GOOGLE ». Le lot 1 (les pages `/en/`) est dans
> `memoire/seo-international.md`.

## La demande

« Prompt 2 » : ne pas créer de nouvelles pages, mais faire en sorte que
Google puisse découvrir, lire et indexer celles du Prompt 1. Porte
d'entrée : prouver d'abord que le Prompt 1 était vraiment en ligne.

## Le Prompt 1 était en ligne — et comment on l'a prouvé

Le réseau de la machine de travail ne joint pas elatransfer.com. La preuve
vient des journaux GitHub, lus un par un :
- PR #355 fusionnée (`f69637b`, 14/10 à 22 h 04 UTC), 15 contrôles verts ;
- « Monitoring production » sur `f69637b` : `/version.json` en ligne porte
  `f69637b…`, les cinq `/en/` et les trois pages françaises répondent 200,
  bonne canonique, indexables ;
- les deux migrations du lot appliquées (22 h 05 et 22 h 06, HTTP 201).

## Ce qui a été mesuré

- **Le moteur d'hébergement de Cloudflare tourne ici** : `wrangler` installé
  dans le bac à sable (jamais dans le dépôt), `wrangler dev` sur `site/` avec
  le `wrangler.jsonc` du dépôt. Toutes les formes en double redirigent en UN
  saut vers l'adresse canonique : `/index.html` → `/`,
  `/transfert-cdg-paris.html` et `/transfert-cdg-paris/` →
  `/transfert-cdg-paris`, `/en`, `/en/index.html` → `/en/`, etc.
- **Les redirections sont des 307** (temporaires) : réglage par défaut de
  Cloudflare, gardé faute de symptôme. À revoir seulement si Search Console
  garde les anciennes adresses `.html` dans l'index.
- **Une adresse inconnue rend l'accueil en 200** (soft 404), canonique `/`.
  Connu depuis le Prompt 1, laissé : réglage d'hébergement.
- Performance mobile, réseau lent simulé et processeur ×4 : pages `/en/`
  0,5 s pour le contenu principal, CLS 0, 51 Ko ; pages françaises 0,75 s ;
  accueil 2,6 s (la photo), CLS 0. Rien à corriger.

## Ce qui a été trouvé et corrigé

1. **Le contrôle de production ne lisait ni `robots.txt` ni `sitemap.xml`, et
   suivait les redirections.** Or Cloudflare sert l'ACCUEIL en 200 à la place
   d'un fichier absent : un plan du site disparu restait vert, une adresse du
   plan devenue redirection aussi. Éprouvé sur le moteur Cloudflare local :
   `robots.txt` retiré → « une page HTML a répondu » ; adresse en `.html` dans
   le plan → « répond 307 ».
2. **Aucun contrôle ne couvrait tout le plan du site** : `test-seo-en` lit les
   pages anglaises DANS le plan — une page `/en/` oubliée dans `sitemap.xml`
   n'était vue par personne. L'inventaire des fichiers construits la voit.
3. **Les données structurées des trois pages françaises désignaient leur
   ancienne adresse en `.html`** (`@id`), restée après le passage aux
   adresses servies. Corrigé, et `url` ajoutée comme sur les pages anglaises.

## Le juge

`.github/scripts/seo-indexation.mjs`, sans dépendance. Le même code tourne
dans `test-seo-en` (site construit, CI) et dans `verifier-production.mjs`
(en ligne, après chaque publication et toutes les 6 h). Il lit le HTML BRUT
sans exécuter de script et sans suivre les redirections :
- `robots.txt` est un vrai fichier (pas l'accueil), déclare le plan, et est
  lu avec les règles de Google (groupe Googlebot sinon `*`, motif le plus
  long, Allow à égalité) ;
- `sitemap.xml` est un vrai plan (pas l'accueil), en https, sans doublon ;
- chaque adresse du plan : 200 sans redirection, ni `noindex` (balise ou
  en-tête) ni `nofollow`, permise par robots, une seule canonique = elle-même,
  titre, description, H1 dans le HTML, `<html lang>`, données structurées
  lisibles et sans adresse `.html` ;
- titres, descriptions et H1 uniques sur tout le plan ;
- hreflang : codes valides, cibles dans le plan, auto-référence accordée à
  `<html lang>`, réciprocité ;
- sur le site construit seulement : toute page indexable est dans le plan,
  ou désigne par sa canonique une page du plan (`application.html` → `/`).

**Le juge n'est pas aveugle** : `test-seo-en` lui sert le site construit
faussé d'un défaut à la fois — quatorze falsifications (page anglaise
oubliée dans le plan, plan ou robots remplacés par l'accueil, robots qui
bloque `/en/`, noindex, X-Robots-Tag, redirection, canonique fausse ou
absente, hreflang non réciproque ou vers une page absente, titre en double,
H1 seulement en JavaScript, données en `.html`) — et chacune doit tomber en
nommant le défaut. Avant la correction, le juge tombait sur les trois pages
françaises, et sur rien d'autre.

Une page vitrine de client publiée sans `noindex` ferait tomber
l'inventaire : c'est voulu, elle doit être une décision (plan du site ou
`noindex`), pas un oubli.

## Ce qui ne se code pas — Search Console (à Barbaros)

La propriété est sur le compte Google **orucburak001** ; aucune session n'y
a accès.
1. Sitemaps → soumettre `https://elatransfer.com/sitemap.xml` → attendu :
   « Opération effectuée », 10 URL découvertes.
2. Inspection de l'URL, puis « Demander l'indexation », pour :
   `/en/`, `/en/cdg-airport-transfer-paris/`, `/en/orly-airport-transfer-paris/`,
   `/en/disneyland-paris-airport-transfer/`, `/en/cdg-orly-transfer/`,
   `/transfert-cdg-paris`, `/transfert-orly-paris` → attendu : « L'URL peut
   être indexée », canonique choisie par Google = l'URL inspectée.
3. Pages → « Non indexées » : les anciennes adresses en `.html` doivent finir
   en « Page avec redirection » ; les espaces privés en « Exclue par la balise
   noindex ». Une page du plan en « Autre page avec balise canonique
   correcte » ou « Détectée, actuellement non indexée » se signale ici.
4. Dans quelques semaines : Performances → filtrer sur `/en/` pour les
   premières impressions.

Une recherche `site:elatransfer.com` n'est jamais une preuve : Google n'y
montre qu'un échantillon.

## Ce qui reste, et pourquoi on n'y touche pas

- Les 307 (voir plus haut) et le soft 404 : réglages d'hébergement, gardés
  faute de symptôme (« ne jamais changer un réglage par défaut qu'on ne peut
  pas éprouver »).
- `www.elatransfer.com` ne répond pas : DNS Cloudflare, à Barbaros.
- L'accueil porte cinq `<h1>` (un par écran du moteur), un seul visible :
  sans effet sur Google.
- Les descriptions françaises disent encore « prix ferme » : choix de texte,
  à Barbaros.
