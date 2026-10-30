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
- Audit du 17/10/2026 : modèle retiré des règles ; Barbaros décide la
  suppression le jour même (« Oui fait »). Mesuré avant : tout l'historique
  d'`ai-dev` reste joignable par la tête de la PR #319 (38ff768), sauf son
  dernier commit 3467f00, dont l'arbre est celui de `main` au commit 84a04a4.
  Une étiquette d'archive n'a pas pu être poussée (l'accès git de la session
  n'accepte que sa branche) : elle n'était pas nécessaire. Supprimée le
  17/10 à 16 h 21 par « Nettoyage des branches », après la fusion de #366 ;
  `main` est depuis la seule branche du dépôt.

## Les autres noms qui visaient le vide (17 octobre 2026)

- `.github/branches-a-garder.txt` protégeait « mini-van », absente du dépôt
  depuis au moins le 4/10 et que plus aucun workflow ne nomme
  (`fonctions.yml` ne déploie que depuis `main`). Retirée de la liste.
- La branche des sites vitrines (claude/session-creation-without-asmine-to9axd,
  tête 8ef0c66 du 21/08) n'a **aucun** commit absent de `main` et 976 de
  retard : la suivre faisait repartir d'août. `CLAUDE.md` ne la nomme plus
  comme lieu de travail ; supprimée avec `ai-dev`, sa tête étant un ancêtre de
  `main`.

## La fusion : un « oui » écrit, pour cette PR (29 octobre 2026)

Archive de `CLAUDE.md` (« Git et publication »). La règle en vigueur est dans
`TEAM_RULES.md` §2.

- **Août 2026** : deux fusions sont passées avant que Barbaros ait regardé.
  Naît « rien ne part sans qu'il l'ait vu » — faire, montrer, attendre son
  accord, puis pousser. **GitHub ne l'impose pas** : zéro approbation exigée,
  les PR sont ouvertes sous son compte et il ne peut pas approuver la sienne.
- La ligne suivante disait : « Une fois l'accord donné : ouvrir la PR **et la
  fusionner** — sans la fusion, le lien envoyé au client ne marche pas »
  (l'époque des sites vitrines, où le lien envoyé au commerçant n'existait
  qu'après la fusion). Elle ne disait pas **quel** accord : celui donné sur
  une capture valait, à la lecture, accord de fusion.
- `/nouveau-site` allait plus loin : « on fusionne sans redemander, pour que le
  lien fonctionne ». La commande était encore là le 29/10, alors que les sites
  vitrines ont quitté le dépôt le 4/10.
- **22/10/2026** : la PR #404 (fiabilité de la réservation) a été fusionnée
  sur un « Ok fait le » dans la conversation.
- **29/10/2026, sa décision, définitive** : aucun agent IA ne fusionne, ne
  pousse sur `main` ni ne déclenche volontairement une publication sans son
  accord explicite **pour cette PR précise** (« Oui, tu peux fusionner la
  PR #N »). « fais-le », « continue », « ok », « vas-y », « termine »… n'en
  sont pas ; un accord ne vaut jamais pour une autre PR. Les deux phrases
  ci-dessus sont retirées, et `test-doc.mjs` (section 10) refuse qu'une
  consigne d'agent dise de nouveau le contraire. Ce contrôle lit les
  consignes ACTIVES ; ce fichier-ci, qui raconte, n'est pas lu.
