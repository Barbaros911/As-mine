# Les sites vitrines de commerçants — archive

> **Archive rangée le 17 octobre 2026.** Ce texte ouvrait `CLAUDE.md`. Il
> est périmé depuis le 4 octobre 2026 : à la demande de Barbaros, **les
> projets d'autres clients ne vivent plus dans ce dépôt** (`PROJECT_STATE.md`,
> « Architecture »), et la branche des sites vitrines a été supprimée le
> 17/10 (`memoire/branches.md`). `sites/` ne porte plus que des entrées
> d'Elatransfer. Ne s'en servir que si Barbaros redemande un site de client
> ICI — et le lui faire confirmer d'abord. Rien n'a été réécrit ci-dessous.

Ce dépôt sert à **deux activités distinctes**. Lire d'abord laquelle est
demandée :

| Activité | Fichiers | Branche |
|---|---|---|
| **Asmine**, l'application de réservation VTC | racine (`index.html`, `sw.js`…) | la branche de travail de la session |
| **Sites vitrines** pour des commerçants | `sites/<client>/` | une branche courte partie du dernier `main` |

## La règle absolue : ne jamais toucher Asmine *en travaillant sur un autre site*

`index.html`, `sw.js`, `manifest.webmanifest`, `icon.svg`,
`icon-maskable.svg`, `robots.txt`, `sitemap.xml` à la racine sont
l'application de réservation. Ne jamais les modifier pour créer ou tester
un autre site. Toute vérification se fait par comparaison de hachage
(`md5sum`) avant/après.

Cette règle ne s'applique évidemment pas quand la demande porte sur
Asmine lui-même — voir la section dédiée en fin de fichier.

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
