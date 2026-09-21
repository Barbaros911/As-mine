# ELA Transfer — règles communes de l'équipe

**Ce fichier est la référence partagée.** `CLAUDE.md` et `AGENTS.md` y renvoient
et ne gardent que ce qui leur est propre. En cas de contradiction, c'est ce
fichier qui dit vrai.

Il est court exprès. Chaque règle ci-dessous a coûté quelque chose ; la date
entre parenthèses renvoie à l'incident qui l'a produite.

---

## 1. Qui décide quoi

| | Domaine | Tranche sur |
|---|---|---|
| **Barbaros** | propriétaire | tarifs, produit, commercial, visuel, arbitrages |
| **ChatGPT** | produit, UX, contrôle extérieur | spécification, cohérence, **le site réellement publié** |
| **Claude Code** | code, tests, build, déploiement | faits techniques mesurables |

**Un choix produit se tranche par Barbaros. Un fait technique se tranche par la
mesure** — on reproduit, on prouve, et la preuve gagne. Pas l'ancienneté, pas
l'assurance de celui qui parle.

**Contrôle croisé :** chacun peut contester le travail de l'autre **avec des
faits**. Personne ne crée une seconde implémentation de ce que l'autre fait.

**Ni ChatGPT ni Claude ne voient ce que voit l'autre**, et la répartition
n'est pas un confort : c'est la carte des accès réels.
- **Claude n'atteint pas `elatransfer.com`** — mesuré, quatre adresses,
  réponse nulle. Il ne peut donc rien affirmer du site tel qu'un client le
  voit ; il lit le dépôt, construit le site et l'éprouve en local.
- **ChatGPT ne lance pas les suites Playwright** et ne voit pas ce qui se
  passe sur cette machine. En revanche **il lit ce que GitHub publie** :
  l'état des exécutions d'Actions, les PR, les fichiers, les Issues — et il
  ouvre le site en ligne. *Corrigé le 16 septembre 2026 : la version
  précédente disait qu'il « ne lit pas les journaux de construction », ce
  qui était trop absolu et lui retirait un contrôle qu'il exerce vraiment.*

## 0. Garde-fou d'exécution obligatoire

**AUCUNE ÉCRITURE GITHUB AVANT LE PRÉVOL.** Cette règle s'applique à ChatGPT, Claude, Codex, Work et tout autre agent, même si la demande paraît urgente, triviale ou déjà connue.

Avant le premier appel GitHub qui modifie quoi que ce soit, l'agent doit, dans la session courante :
1. lire `TEAM_RULES.md` depuis le `main` actuel ;
2. lire `AGENTS.md` et `PROJECT_STATE.md` depuis ce même `main` ;
3. relever les PR ouvertes et les branches actives sur la zone concernée ;
4. identifier les fichiers qui seront touchés et vérifier qu'aucun travail concurrent ne les couvre ;
5. classer la demande : `À FAIRE`, `EN COURS AILLEURS`, `PARTIELLEMENT FAIT`, `BLOQUÉ` ou `TERMINÉ` ;
6. seulement ensuite créer/modifier une branche, un fichier, une PR ou fusionner.

**Pas d'exception fondée sur la mémoire.** Une conversation précédente, une mémoire d'agent ou le fait d'avoir lu ces fichiers plus tôt ne remplace jamais ce prévol : l'état GitHub peut avoir changé.

**Fail closed :** si une étape du prévol ne peut pas être vérifiée, l'agent n'écrit rien dans le dépôt et signale précisément ce qui manque.

**Avant fusion**, refaire au minimum le contrôle du dernier `main`, des PR concurrentes et du diff de la branche. Une fusion n'est jamais automatique parce que la modification vient du même agent.

---

## 2. La source de vérité

**`main`, et rien d'autre.** Ni une conversation, ni une branche, ni la mémoire
de qui que ce soit.

**Avant de commencer quoi que ce soit :** lire le dernier `main`, les PR
ouvertes, les Issues `[TEAM]`, les branches actives sur la zone.

*(15/09 — Claude a travaillé 83 commits en retard. Fusionner à l'aveugle aurait
supprimé le travail de sécurité de ChatGPT.)*

## 3. Une seule implémentation par sujet

Si une PR, une branche ou une Issue `[TEAM]` couvre déjà la demande : **on ne
recommence pas ailleurs.** On reprend, ou on signale le conflit.

*(15/09 — 53 branches non fusionnées, dont sept tentatives sur la même
interface et quatre sur la même tâche de sécurité.)*

**LE RELAIS SE DÉCIDE PAR BARBAROS, PAS ENTRE ASSISTANTS** (16/09, à sa
demande : « si jamais je n'utilise pas ChatGPT ou Claude, moi je dis qui
prend le relais »).

Un assistant indisponible **ne libère rien**. Constater que l'autre est à
l'arrêt n'autorise pas à reprendre son chantier : on le **signale** et on
attend que Barbaros dise qui continue. C'est lui qui a la vue d'ensemble de
ce qu'il fait tourner, et lui seul sait s'il compte y revenir.

*(Le 16/09, deux sessions Claude ont poussé sur `main` dans la même heure.
Une reprise décidée entre assistants aurait tout aussi bien pu refaire le
travail que le défaire.)*

## 4. « Fusionné » ne veut pas dire « en ligne »

```
CODÉ → TESTÉ → FUSIONNÉ → DÉPLOYÉ → VÉRIFIÉ EN PRODUCTION
```

**`TERMINÉ` ne s'écrit qu'après le dernier étage.**

Après chaque fusion, **Claude vérifie que le workflow de publication a
réellement réussi** et ne dit jamais « c'est en ligne » avant de l'avoir vu en
vert. Puis **ChatGPT contrôle le site réellement accessible aux clients.**

*(15/09 — deux PR fusionnées, publication en erreur, Barbaros a testé
l'ancienne version pendant vingt minutes.)*

## 5. Les tests

- **Un test éprouve une règle durable, jamais une valeur du jour.** Pas un
  numéro de version, pas un nombre de colonnes, pas un compte d'onglets.
- **On ne supprime ni ne désactive jamais un test pour obtenir du vert.**
- **Une suite muette est un échec**, pas une suite « pas concernée ».
- **Un test rouge qui révèle un problème produit, commercial ou juridique
  remonte comme décision.** Il ne se corrige pas en silence.
- Quand la production diffère des sources, **les contrôles s'exécutent aussi
  sur le résultat de `construire.sh`**.

*(15/09 — un test exigeait `elatransfer-v80`, figé au jour de son écriture,
alors que la règle du projet impose d'incrémenter ce numéro. Il s'exécute avant
le téléversement : il a bloqué **toute** publication.)*
*(15/09 — une suite plantait depuis 85 commits sans rien afficher. Vingt-cinq
contrôles sur une option payante ne tournaient plus.)*

## 6. La documentation ne ment pas

**Toute PR qui rend la documentation commune fausse** — sur un tarif, une
adresse d'accès, l'authentification, la structure des pages, le déploiement ou
une règle métier — **met cette documentation à jour dans la même PR.**

*(15/09 — `CLAUDE.md` annonçait un code d'accès mort depuis des jours. Claude a
travaillé des heures sur une carte périmée.)*

## 7. Les secrets

**Ils n'appartiennent à aucune IA.** Jetons, clés privées, secrets GitHub et
Supabase, clés VAPID, codes hôtel : ils vivent dans les coffres prévus.

**Aucun des deux ne doit en demander un, en recevoir un dans une conversation,
ou en écrire un dans le dépôt** — y compris dans un test.

*(Un jeton collé dans une conversation a dû être révoqué dans la minute. Une
clé VAPID privée a failli partir dans un fichier de test.)*

## 8. Ce qui est « important »

Est important **tout changement touchant** : un prix ou un paiement · un texte
contractuel · le logo ou l'identité · les données · la sécurité ou
l'authentification · l'architecture ou les routes · le déploiement · une zone
partagée.

**Peu importe le nombre de fichiers.** Un changement important passe par une
branche et une PR ; il ne se fait jamais directement sur `main`.

## 9. Se parler

**L'Issue `[TEAM]` est le canal de TRANSMISSION ENTRE ASSISTANTS.**
#164 pour la coordination, #165 pour l'Admin, et une Issue dédiée par sujet.
**Ça ne retire rien à la conversation de Barbaros**, qui reste la source de
ses demandes et de ses décisions : ce qu'il dit à l'un ou à l'autre fait
foi, et c'est à l'assistant qui l'a reçu de le porter ici. *Précisé le
16 septembre 2026 — écrit « le canal, pas la conversation », ça se lisait
comme si ses propres mots ne comptaient pas.*

- ChatGPT y dépose spécifications, audits de production et demandes de
  correction.
- Claude y dépose statuts, preuves techniques, branches et PR utilisées, et y
  ouvre une Issue quand une décision produit est nécessaire.
- **Barbaros n'a pas à faire le facteur.** Ce qui concerne l'autre assistant
  s'écrit ici — mais ce qu'il décide, lui, s'impose d'où qu'il le dise.

**Signez vos messages** (`## ChatGPT → Claude — sujet`) : sur GitHub, les deux
apparaissent sous le même compte, et la signature est le seul moyen de savoir
qui parle.

## 10. Ce qu'on ne fait jamais de sa propre initiative

Changer un tarif · une règle métier · un texte commercial ou contractuel · le
logo · l'identité visuelle · le design validé · l'organisation du produit.

**Et ne jamais recréer une interface déjà unifiée.** On la corrige là où elle
est.

---

## Ce qui reste hors de ce fichier

- **`CLAUDE.md`** : l'historique des décisions du produit et les pièges
  techniques rencontrés. C'est une mémoire, pas un règlement — et elle vaut
  cher : chaque section y explique **pourquoi** une chose est comme elle est.
- **`AGENTS.md`** : les zones critiques et les états de tâche.
- **`PROJECT_STATE.md`** : l'état courant.

**Une règle de ces fichiers peut vieillir. Vérifier avant de s'en servir pour
refuser quelque chose.**
