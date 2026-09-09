---
description: Lance les suites de tests du site et rend le bilan
---

Lancer les suites Playwright du site. Argument reçu : `$ARGUMENTS`.

- Vide → toutes les suites.
- Un ou plusieurs mots → seulement les suites dont le nom les contient
  (ex. `/tests prix carte` lance `test-nouveau-prix.mjs` et
  `test-nouveau-carte.mjs`).

Exécuter :

```
sh .claude/outils/tests.sh $ARGUMENTS
```

Le script s'occupe du lien Playwright, du serveur local, et du verrou qui
empêche deux séries de se marcher dessus. Ne pas refaire ces étapes à la
main, et ne jamais lancer une seconde série tant que la première tourne.

Ensuite, lire le bilan et en RENDRE COMPTE, pas le recopier :

- **Une suite MUETTE est un ÉCHEC**, jamais « pas concernée ». Le script
  l'écrit en toutes lettres. Aller voir ce qui a planté.
- Pour chaque échec, dire ce qui est cassé et **ce que ça coûte au
  client**, pas seulement le nom du contrôle.
- **Ne jamais modifier un test pour le faire passer.** Si un test tombe,
  c'est le code qui a tort — ou le test qui est mal écrit, et alors on le
  corrige pour la bonne raison, en le disant.
- Après une correction, relancer **les deux ou trois suites concernées**,
  pas toute la série : elle prend six minutes. La série complète ne se
  lance qu'une fois, avant la fusion.
