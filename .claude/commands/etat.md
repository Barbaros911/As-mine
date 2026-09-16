---
description: Dit où en est le projet — demandé au dépôt, jamais recopié
---

Première chose à faire en ouvrant une session sur ce dépôt.

Exécuter :

```
sh .claude/outils/etat.sh
```

Il ne retient rien : il **demande** au dépôt et à GitHub. Il ne peut donc
pas mentir — au pire il ne répond pas, et ça se voit à l'écran.

Ce qu'il rend, et ce que ça veut dire :

- **PRODUCTION** — le dernier `main`, et si la **publication** a réussi.
  Une fusion réussie ne veut pas dire un site publié : c'est arrivé deux
  fois le 15 septembre, Barbaros a essayé l'ancienne version pendant vingt
  minutes pendant que je disais que c'était en ligne. Si cette ligne n'est
  pas verte, **rien n'est en ligne**, quoi qu'en dise l'historique.
- **CE QUI ATTEND UNE RÉPONSE** — les Issues `[TEAM]` et les PR ouvertes.
  À lire **avant** d'écrire une ligne de code : une question posée à
  ChatGPT ou à Barbaros et restée sans réponse est un travail qu'on
  recommencerait pour rien.
- **LE DÉPÔT** — la branche courante, et surtout **le retard sur `main`**.
  En rouge, c'est un arrêt : repartir du dernier `main` avant de toucher
  quoi que ce soit. Travailler avec 83 commits de retard a failli effacer
  tout le durcissement de sécurité d'un autre.
- **CE QUI A BOUGÉ DEPUIS 3 JOURS** — de quoi comprendre ce qui vient de
  se passer sans lire cinquante commits.

Ensuite, et seulement ensuite, lire les trois fichiers qu'il nomme :
`TEAM_RULES.md` (les règles communes), `PROJECT_STATE.md` (ce qui a été
**décidé** et ce qui est **prévu** — les deux choses qu'aucun script ne
peut deviner), et `CLAUDE.md` pour le produit.

**Ne jamais recopier ce que rend ce script dans un fichier.** C'est
exactement ce qui a rendu `PROJECT_STATE.md` faux : il annonçait un état
figé avant dix fusions, 38 suppressions de branches et trois correctifs
publiés. Ce qui se mesure se demande ; seul ce qui se décide s'écrit.

Les tests ne sont pas lancés ici — ils prennent six minutes. C'est `/tests`.
