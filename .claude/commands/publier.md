---
description: Construit le site tel qu'il sera publié et l'éprouve avant la fusion
---

À lancer **avant toute fusion vers `main`**, une fois que `/tests` est au
vert.

```
sh .claude/outils/publier.sh
```

Ce qu'il fait, et pourquoi aucun autre contrôle ne le fait :

1. **Il construit vraiment `site/`** avec `construire.sh`, la seule
   recette. Les 21 suites tournent sur le DÉPÔT, où le serveur de test
   sert tout — y compris ce que la recette ne publie pas. Un fichier
   oublié y est donc invisible, marche en local, et rend un 404 en ligne.
   C'est comme ça que `carte/` est passé, puis `exploitant/`.
2. **Il compare le numéro de cache** à celui qui est en ligne sur `main`.
3. **Il éprouve les trois adresses** — `/`, `/admin.html`, `/demos/` —
   qui couvrent les trois mécanismes de service. Si `/demos/` affiche le
   site de réservation au lieu de la galerie, c'est `html_handling` qui
   est en cause.
4. **Il ouvre la page du dossier construit** sur téléphone et sur
   ordinateur, et rend deux captures.

Ensuite :

- Un 404 sur l'une des trois adresses → **le fichier manque dans
  `construire.sh`**. Ajouter la ligne `cp`, ne pas contourner.
- Cache inchangé alors que quelque chose de visible a bougé →
  l'incrémenter dans `sw.js`.
- **Envoyer les captures à Barbaros et attendre son accord** avant
  d'ouvrir la pull request. C'est sa règle, et elle vaut aussi pour ce
  qui paraît anodin.
