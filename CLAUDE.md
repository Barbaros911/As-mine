# As-mine — mémo pour Claude

Ce fichier est lu automatiquement au début de chaque session sur ce dépôt.
Il évite de redemander les mêmes règles à chaque fois.

## La règle absolue : ne jamais toucher As-mine

`index.html`, `sw.js`, `manifest.webmanifest`, `icon.svg`,
`icon-maskable.svg`, `robots.txt`, `sitemap.xml` à la racine sont
l'application de réservation. Ne jamais les modifier pour créer ou tester
un autre site. Toute vérification se fait par comparaison de hachage
(`md5sum`) avant/après.

## Créer un nouveau site

1. Copier `sites/_modele/` vers `sites/<nom-du-client>/` (minuscules,
   tirets, pas d'espaces ni d'accents dans le nom du dossier).
2. Tout ce que le site utilise (images, styles, scripts) reste **dans ce
   dossier**, appelé en chemin relatif (`./photo.jpg`), jamais absolu.
3. Mettre `<meta name="robots" content="noindex, nofollow">` tant que le
   client n'a pas validé — la page contient souvent ses vraies coordonnées
   et ne doit pas sortir dans Google à sa place. Le retirer une fois
   validé.
4. Ne jamais inventer d'avis clients ni de chiffres commerciaux : les
   marquer « à compléter » ou laisser l'emplacement vide. Publier de faux
   avis est une pratique commerciale trompeuse, sanctionnée par la loi.
5. Tester avant d'annoncer que c'est prêt — voir plus bas.
6. L'adresse publiée sera `.../As-mine/<nom-du-client>/`. La page
   `.../As-mine/demos/` liste tous les sites automatiquement ; rien à
   faire pour ça.

## Tester avant de dire qu'un site est prêt

Utiliser la compétence `webapp-testing` : lancer un serveur local, vérifier
avec Playwright sur ordinateur (1280px) et sur téléphone (390px) :
- aucun débordement horizontal
- aucune erreur JavaScript
- les boutons/menus cliquables sont vraiment cliquables (attention aux
  éléments qui se superposent en mobile)
- les liens de contact (tel:, WhatsApp) sont corrects

Ne pas se contenter de lire le code : ouvrir vraiment la page.

## Git et publication

- Développer sur la branche `claude/session-creation-without-asmine-to9axd`,
  jamais directement sur `main`.
- Toujours vérifier `git branch --show-current` avant un `git push` — déjà
  fait l'erreur de pousser vers le mauvais nom de branche une fois.
- Un site publié (visible par un client) : ouvrir la pull request **et la
  fusionner directement** — sans ça, le lien envoyé au client ne
  fonctionne pas.
- Un changement interne (compétences, configuration, outillage, rien de
  visible en ligne) : ouvrir la pull request mais **demander avant de
  fusionner**.
- Ne jamais committer et pousser dans le même appel : les faire l'un après
  l'autre. Un appel qui mélange les deux a déjà été bloqué par le
  classificateur de sécurité.
- `.claude/` (compétences, config) n'a aucun effet sur le site publié : le
  workflow `.github/workflows/pages.yml` ne copie que les fichiers qu'il
  énumère explicitement.

## Le dossier .claude/skills/

50 compétences installées, aucune ne nécessite de compte externe. Le détail
de chacune est dans `.claude/skills/README.md`. Ne pas re-proposer d'en
installer d'autres sans que ce soit demandé.

## Ton et langue

Répondre en français, simplement, sans jargon technique non expliqué. Cet
interlocuteur construit et vend des sites vitrines à des commerçants locaux
(Belgique) — expliquer avec des exemples concrets plutôt que des concepts
abstraits.
