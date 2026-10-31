---
description: Crée un nouveau site client complet, du dossier jusqu'à la pull request
---

L'utilisateur veut un nouveau site pour un client, dans `sites/`. Argument
reçu : `$ARGUMENTS` — le nom du client et si possible son secteur d'activité
(ex. « Salon Durand, coiffure à Liège »). Si l'argument est vide ou trop
vague, demander le nom du client, son secteur, et si des informations
réelles ont été fournies (adresse, téléphone, logo...) avant de continuer.

**AVANT TOUT : depuis le 4 octobre 2026, les sites de clients ne vivent plus
dans ce dépôt** (décision de Barbaros, `PROJECT_STATE.md`). Lui demander de
confirmer qu'il veut vraiment ce site ICI ; sans sa confirmation, ne rien
créer.

S'il confirme, suivre `memoire/sites-vitrines.md` à la lettre, notamment la
règle absolue de ne jamais toucher aux fichiers d'As-mine, et la section
« Créer un nouveau site ».

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
7. **Ne pas fusionner.** Montrer les captures, puis attendre le « oui » écrit
   de Barbaros pour CETTE pull request (« Oui, tu peux fusionner la PR #N »).
   « ok », « vas-y » ou « continue » n'en sont pas (`TEAM_RULES.md` §2).
8. Une fois ce « oui » reçu seulement : fusionner, puis donner le lien final :
   `https://barbaros911.github.io/As-mine/<nom-du-dossier>/`, avec un
   résumé court de ce qui est réel vs à compléter (coordonnées, avis,
   photos).
