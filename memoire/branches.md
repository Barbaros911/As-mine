# Les branches — histoire

Archive de `CLAUDE.md` (section « Git et publication »). La règle en vigueur
est dans `TEAM_RULES.md` §2 ; ici, pourquoi elle est ainsi.

## La branche « vestige » (audit du 15 septembre 2026)

53 branches ramenées à 15. Le tableau d'en-tête de `CLAUDE.md` a nommé
pendant des jours une branche qui n'existait plus, dans la colonne qui disait
où travailler : une consigne qui vise le vide fait repartir d'un endroit
quelconque. `test-doc.mjs` vérifie depuis que toute branche `claude/…` nommée
entre accents graves dans `CLAUDE.md` existe encore sur le dépôt distant.

**La leçon, elle, n'a pas d'âge.** `git log main..branche` montrait deux
commits d'avance et trompait — c'est `git diff main branche` qu'il fallait
lire : la branche avait divergé AVANT tout le nouveau site, et la fusionner
aurait **supprimé** les photos, les suites de tests et les corrections de
`construire.sh`. Un compte de commits ne dit pas ce qu'une fusion ferait.

## ai-dev, la branche d'intégration (21 septembre – 5 octobre 2026)

- Créée le 21/09 avec l'équipe IA locale (PR #198, puis #209 « harmoniser
  main, ai-dev et le workflow des agents ») : les agents partaient d'`ai-dev`,
  y fusionnaient, et une PR de promotion portait le tout vers `main`.
- **Dernière promotion `ai-dev` → `main` : PR #242, le 24/09.** Les travaux
  fusionnés dans `ai-dev` ensuite (#273, #292, #298, #301) sont arrivés dans
  `main` par des commits de publication séparés (« Production — … »,
  #303, #304), hors de toute PR de promotion. Le 5/10, la PR #319 a constaté
  que les quatre commits propres d'`ai-dev` étaient déjà dans `main` à
  l'identique et l'a réalignée : depuis, son contenu est celui de `main` au
  commit 84a04a4.
- Du 5/10 au 17/10, **toutes** les fusions dans `main` (45) viennent de
  branches courtes parties de `main`, sans passer par `ai-dev`. La règle
  écrite et la pratique s'étaient séparées : `TEAM_RULES.md`, `AGENTS.md`,
  `.ai/` et le gabarit de PR exigeaient encore `ai-dev`, et
  `.ai/scripts/new-task.sh` créait les branches de l'Agent local depuis elle —
  donc, au 17/10, avec 221 commits de retard.
- **Ce qu'`ai-dev` coûtait sans rien protéger** : elle n'a aucune règle
  GitHub (ni PR obligatoire ni contrôle exigé — mesuré le 17/10), alors que
  `main` en a ; chaque tâche se fusionnait deux fois et se rattrapait deux
  fois ; et ce qui y entrait sans être promu devait être refait.
- Audit du 17/10/2026 : modèle retiré des règles, branche gardée gelée
  (tête 3467f00, aucun contenu propre) jusqu'à la décision de Barbaros.

## Les autres noms qui visaient le vide (17 octobre 2026)

- `.github/branches-a-garder.txt` protégeait « mini-van », absente du dépôt
  depuis au moins le 4/10 et que plus aucun workflow ne nomme
  (`fonctions.yml` ne déploie que depuis `main`). Retirée de la liste.
- La branche des sites vitrines (claude/session-creation-without-asmine-to9axd,
  tête 8ef0c66 du 21/08) n'a **aucun** commit absent de `main` et 976 de
  retard : la suivre faisait repartir d'août. `CLAUDE.md` ne la nomme plus
  comme lieu de travail ; elle reste gardée jusqu'à la décision de Barbaros.
