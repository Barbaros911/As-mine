---
description: Crée un nouveau site client complet, du dossier jusqu'à la pull request
---

L'utilisateur veut un nouveau site pour un client, dans `sites/`. Argument
reçu : `$ARGUMENTS` — le nom du client et si possible son secteur d'activité
(ex. « Salon Durand, coiffure à Liège »). Si l'argument est vide ou trop
vague, demander le nom du client, son secteur, et si des informations
réelles ont été fournies (adresse, téléphone, logo...) avant de continuer.

Suivre `CLAUDE.md` à la lettre, notamment la règle absolue de ne jamais
toucher aux fichiers d'As-mine, et la section « Créer un nouveau site ».

Étapes :

1. Choisir un nom de dossier en minuscules-avec-tirets à partir du nom du
   client (ex. « Salon Durand » → `sites/salon-durand/`). Vérifier qu'il
   n'existe pas déjà et qu'il ne porte pas le nom d'un fichier réservé
   (`index.html`, `sw.js`, `manifest.webmanifest`, `icon.svg`,
   `icon-maskable.svg`, `robots.txt`, `sitemap.xml`, `demos`).
2. Concevoir le site en fonction du secteur d'activité et de ce que
   l'utilisateur a fourni (couleurs, logo, coordonnées) — s'il n'a rien
   fourni, produire une maquette de qualité professionnelle avec des
   emplacements clairement marqués « à compléter », jamais de fausses
   coordonnées ou de faux avis. S'appuyer sur les compétences installées
   pertinentes (`content-research-writer`, `theme-factory`,
   `competitive-ads-extractor`, `domain-name-brainstormer` si un nom de
   domaine est demandé).
3. Ajouter `<meta name="robots" content="noindex, nofollow">` dans l'en-tête
   tant que le client n'a pas validé.
4. Tester avec `webapp-testing` : bureau (1280px) et téléphone (390px),
   zéro débordement horizontal, zéro erreur JavaScript, boutons/menus
   vraiment cliquables. Corriger avant de continuer si un problème est
   trouvé.
5. Committer sur la branche de travail actuelle (jamais directement sur
   `main` — vérifier avec `git branch --show-current`). Message de commit
   clair, en français, sur le pourquoi plutôt que le quoi.
6. Pousser (dans un appel séparé du commit), puis ouvrir une pull request
   vers `main` avec un résumé du site créé.
7. Fusionner la pull request directement — c'est un site client, la règle
   d'As-mine s'applique : on fusionne sans redemander, pour que le lien
   fonctionne.
8. Donner le lien final à l'utilisateur :
   `https://barbaros911.github.io/As-mine/<nom-du-dossier>/`, avec un
   résumé court de ce qui est réel vs à compléter (coordonnées, avis,
   photos).
