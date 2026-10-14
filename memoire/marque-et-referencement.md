# La marque et le référencement — archive

> **Ceci est une archive, figée le 5 octobre 2026.** Ce qui reste vrai est
> dans `CLAUDE.md`, section « LE SITE SE PRÉSENTE PAR SA MARQUE ». Depuis ce
> jour la marque s'écrit « Elatransfer » partout, admin et hôtel compris : ce
> qui est dit plus bas d'« ELA Transfer » et de l'empreinte du contrôle de
> production est périmé. Rien n'a été réécrit ci-dessous.

## LE SITE SE PRÉSENTE PAR SA MARQUE — ET LE CONTRÔLE DE PRODUCTION A CRIÉ

4 octobre 2026. Barbaros a poussé directement sur `main` (7dc2349) un
nouveau titre — « Elatransfer — Transferts privés & solutions de
réservation » — et un nouveau paragraphe pour les professionnels ; la PR
#302 (branche `ai-dev`, ChatGPT) portait la description assortie, validée
par lui. Deux minutes après la publication, le monitoring a ouvert l'Issue
#300 : « sert une AUTRE page ». **Le site était parfaitement servi** — c'est
l'empreinte du contrôleur qui était un libellé.
- **« Chauffeur privé » n'est plus la règle du référencement.** Depuis la
  phase 1 de l'audit (septembre), le titre devait « mener avec le métier,
  les aéroports après ». Barbaros a repositionné le site : des transferts
  privés ET des solutions de réservation pour ses partenaires. Le titre
  mène donc avec la **marque**, puis dit ce qu'elle vend. `test-nouveau-bascule`
  éprouve cette règle-là (marque en tête, « transfert » dans le titre et la
  description) et plus l'ancienne — un contrôle qui l'aurait gardée aurait
  exigé un texte que Barbaros a retiré.
- **L'empreinte de `verifier-production.mjs` est « Elatransfer »**, en un
  mot, pour `/` et `application.html`. Aucune autre porte ne le porte ainsi
  (l'admin dit « ELA Transfer », l'hôtel « × ELA Transfer ») : l'empreinte
  distingue toujours la bonne page d'un listage ou d'un mauvais réglage,
  et elle survit au prochain changement de titre. *Un libellé se reformule,
  une marque non.*
- **DÉPÔT ET SITE CONSTRUIT DOIVENT DIRE LA MÊME CHOSE.** `seo-ela.mjs`
  réécrit le titre et la description dans `site/index.html` : la nuit du
  4 octobre, le dépôt disait l'ancienne description et le script la
  nouvelle — deux vérités, Google lit l'une et le client l'autre. Les deux
  sont alignées, et un contrôle de `test-nouveau-bascule` compare désormais
  le site servi au dépôt plutôt qu'à une constante recopiée.
- **CE QUI N'A PAS ÉTÉ TOUCHÉ, ET C'EST SA DÉCISION.** Un premier jet avait
  traduit en anglais le nouveau paragraphe des professionnels et réécrit
  `og:description` / `twitter:description`. Barbaros ne l'avait pas demandé
  (« il ne restait que la méta-description ») : les deux ont été retirés
  avant la fusion. L'anglais garde donc ses trois lignes d'avant, ce que
  son commit disait déjà (« la version anglaise conserve sa traduction
  dédiée »). *Une consigne écrite dans un commentaire de commit est une
  consigne, pas un oubli à rattraper.*
- **LES APERÇUS DE PARTAGE ONT SUIVI, ENSUITE, À SA DEMANDE** (« Oui », même
  nuit). `og:description` et `twitter:description` disent la description de
  la page. **Le site publié porte DEUX exemplaires de chaque aperçu** —
  celui de `index.html`, puis celui qu'ajoute `seo-ela.mjs` — et un réseau
  social lit en général le premier : c'était l'ancien, qui vendait encore
  « mises à disposition ». `test-nouveau-bascule` exige maintenant que TOUS
  les exemplaires disent la description.
- **La PR #302 a été fermée sans fusion** : elle portait la même
  description, et elle était en conflit avec `main` depuis le push direct.

## Lot P2 — optimisations techniques (6 octobre 2026)

Avis donné d'abord, puis « fais ce que tu penses être le meilleur ». Mesuré sur
le site construit, jamais sur le dépôt : chaque défaut naissait d'une étape de
`construire.sh`.
- **Canonique sur des pages `noindex`** : `/ela-admin/`, `/easyhotel-reception/`,
  `/reception/easyhotel-aeroville/`, `/ela-public/` héritaient de celle de
  l'accueil. Retirée par `construire-espaces-hotel.mjs` (`sansCanonique`) et
  dans `sites/ela-public/`. Le contrôle parcourt TOUTE page publiée.
- **Deux séries og:/twitter:, deux manifestes, deux couleurs** : la seconde
  venait de `seo-ela.mjs`. Elle portait la seule image de partage
  (`icon-180.png`), reprise dans `index.html`. Les navigateurs lisaient déjà
  la première couleur (#16232B) et le premier manifeste (celui de l'échange
  exploitant) : aucun changement visible. Les deux lignes d'icônes de
  `seo-ela.mjs` sont RESTÉES : en retirer une peut changer l'image de l'onglet.
- **`hotel-engine-polish.css/.js` sur l'accueil** : 45 Ko, deux requêtes ;
  toutes leurs règles visent une page d'hôtel et `?h=` part vers
  `/application.html` avant tout dessin. Retirés de la seule page publique ;
  l'application et la réception les gardent (le service worker les met
  toujours en cache pour le flyer hors ligne).
- **Poids de l'accueil** : 1 148 → 607 Ko, 13 → 11 requêtes. Le logo
  (141 Ko) devient le plus gros fichier après la page : on n'y touche pas.
- Contre l'ancien code, 14 contrôles tombent ; le logo falsifié (un octet
  ajouté, un filtre gris), 3 tombent.
- **`www.elatransfer.com` ne résout pas** (aucun enregistrement). Réglage
  Cloudflare, à faire par Barbaros, une action à la fois.


---

## Rangé le 14 octobre 2026 (mission « SEO international »)

Les deux sections ci-dessous ont quitté `CLAUDE.md`, recopiées telles
qu'elles étaient, quand l'anglais a reçu sa propre adresse (`/en/`). La règle
qui vaut est dans `CLAUDE.md`, « LA MARQUE ET GOOGLE » ; le chantier de ce
jour-là est dans `memoire/seo-international.md`. Une phrase ci-dessous est
périmée : « Pas de `hreflang` tant que l'anglais n'a pas sa propre adresse »
— il l'a.

### LE SITE SE PRÉSENTE PAR SA MARQUE — « Elatransfer », PARTOUT

5 octobre 2026, Barbaros : « Elatransfer partout ». Un mot, un E majuscule,
dans tout texte publié — titres, pages, admin, réception, manifestes, CGV.
Le LOGO (image, et le mot-symbole « ELA TRANSFER » de l'affiche hôtel) ne
change pas. Le titre mène avec la marque, puis dit ce qu'elle vend ; le
dépôt et `seo-ela.mjs` disent la même chose (`test-nouveau-bascule`).
- **Le site public s'ouvre en français pour tout le monde** : le robot de
  Google se présente en anglais américain et lisait l'accueil en anglais
  sous un titre français. L'anglais est à un appui et se mémorise. **Pas de
  `hreflang`** tant que l'anglais n'a pas sa propre adresse. Les pages
  d'hôtel (non indexées) gardent la détection : le flyer est scanné par des
  voyageurs étrangers.
- **Aucun lien public ne mène à `/application.html`** : c'est la page du
  FLYER easyHotel (espace « hotel-client »). Les pages du sitemap réservent
  vers `/?aeroport=…`. `test-nouveau-bascule` y appuie, sur le site construit.
- `verifier-production.mjs` reconnaît une porte à son `data-ela-space`, plus
  à la marque seule, qui est désormais partout.
- L'histoire (titre du 4 octobre, Issue #300, aperçus en double) :
  `memoire/marque-et-referencement.md`.

### GOOGLE — UNE SEULE ENTREPRISE, ET DES PAGES DE SERVICE LIÉES

- **Search Console** : propriété « domaine » du compte Google
  **orucburak001**, pas `contact@`. Au 5/10/2026 : 4 pages au plan, 2
  indexées ; CDG et Orly, que l'accueil ne liait pas, sont liées depuis son
  pied et enrichies (faits du site et des CGV, aucun prix ni avis).
- **Un seul graphe de données structurées**, dans `index.html`
  (Organization `#organisation`, WebSite, Service) ; `seo-ela.mjs` n'en
  ajoute plus, les pages de service désignent `#organisation`. Jamais
  « VTC », jamais `LocalBusiness` sans adresse réelle.
- Leurs réponses sont celles de l'accueil, mot pour mot : en changer une
  veut dire changer les deux (`test-nouveau-bascule`).
- **Lot P2 (6/10/2026)** : une seule série de partage, un manifeste, une
  couleur ; aucune canonique sur une page `noindex` ; les fichiers des hôtels
  hors de l'accueil ; vignettes en WebP 480 px (accueil 1 148 → 607 Ko).
- **Le logo et les icônes ne bougent pas** : `test-nouveau-bascule` en garde
  les empreintes et l'affichage. Image de partage 1200×630 : non décidée.
- `www` ne répond pas : à régler par Barbaros dans le DNS Cloudflare.
  Histoire : `memoire/marque-et-referencement.md`.

