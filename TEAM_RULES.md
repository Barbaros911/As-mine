# ELA Transfer — règles communes de l'équipe

**Ce fichier est la référence partagée.** `CLAUDE.md`, `AGENTS.md` et
`PROJECT_STATE.md` y renvoient ; en cas de contradiction, c'est lui qui dit
vrai. Il est court exprès : chaque règle a coûté quelque chose, et la date
entre parenthèses renvoie à l'incident qui l'a produite. Le détail
d'exécution des agents IA (relais, rôles, outils locaux) est dans
`.ai/README.md`.

---

## 1. Qui décide quoi

| | Tranche sur |
|---|---|
| **Barbaros** (propriétaire) | tarifs, produit, commercial, visuel, arbitrages — **et chaque fusion** |
| **ChatGPT** | spécification, cohérence, **le site réellement publié** |
| **Claude Code** | code, tests, build, déploiement : les faits techniques mesurables |
| **Agent local ELA** | petites tâches bornées et non critiques (`.ai/README.md`) |

**Un choix produit se tranche par Barbaros. Un fait technique se tranche par
la mesure** — on reproduit, on prouve, et la preuve gagne. Pas l'ancienneté,
pas l'assurance de celui qui parle. Chacun peut contester le travail d'un
autre **avec des faits** ; personne ne crée une seconde implémentation.

**Personne ne voit ce que voit l'autre**, et la répartition suit les accès
réels : Claude n'atteint pas `elatransfer.com` (il construit le site et
l'éprouve en local) ; ChatGPT ne lance pas les suites, mais lit ce que GitHub
publie (Actions, PR, Issues) et ouvre le site en ligne.

## 2. La source de vérité et le chemin jusqu'à la production

**`main` est l'unique source de vérité du code validé, et la seule branche
publiée.** Les Issues et les PR disent l'état du travail ; ni une
conversation, ni une branche, ni la mémoire de qui que ce soit ne les
remplacent.

```
dernier main → une branche courte par tâche → PR vers main
→ contrôles au vert → accord explicite de Barbaros → fusion
→ publication automatique → vérification en ligne
```

- **Une tâche = une branche, créée depuis le `main` du moment.** Nom : celui
  que donne la session (`claude/<sujet>-<suffixe>`), sinon `ela/<sujet>` ou
  `fix/<sujet>`.
- **Avant de demander la fusion, la branche intègre le dernier `main`** (on y
  fusionne `main`, on ne réécrit pas une branche poussée), et ses contrôles
  sont verts **sur ce commit-là**. Deux PR vertes chacune ne prouvent rien sur
  leur somme.
- **Plusieurs IA en même temps** : une branche et une PR chacune, une seule
  tâche à la fois par zone critique (`AGENTS.md`) ; celle qui fusionne en
  second se remet à jour d'abord.
- **GitHub impose le chemin** : ruleset « Protéger main »
  (`.github/ruleset-main.json`, comparé chaque jour à la règle en ligne par
  `protections-main.yml`) — PR obligatoire ; `admin`, `guardrails`,
  `build-mobile-desktop`, `secrets-publics` et `gitleaks` verts sur une
  branche à jour ; conversations résolues, fusion en « Merge » seulement, ni
  force-push ni suppression, personne d'exempté. Fonctions Supabase et
  migrations ne partent que de `main`.
- **L'accord de Barbaros, lui, n'est PAS imposé par GitHub.** Zéro
  approbation exigée : les PR sont ouvertes sous son compte, et il ne peut pas
  approuver la sienne. C'est donc la règle la plus importante de ce fichier
  **et la seule qui ne tient que par discipline** : aucun agent ne fusionne
  sans un « oui » écrit de Barbaros **pour cette PR-là**. Une fusion publie
  aussitôt.
- Après la fusion, `branche-apres-fusion.yml` supprime la branche (sauf
  `.github/branches-a-garder.txt`). **Aucune branche d'intégration** entre les
  agents et `main` : `ai-dev` est retirée (17/10/2026), ne pas la recréer.

**Avant de commencer quoi que ce soit :** lire le dernier `main`, les PR
ouvertes, les Issues `[TEAM]`, les branches actives sur la zone et les
priorités actives (§11).

*(15/09 — Claude a travaillé 83 commits en retard. Fusionner à l'aveugle
aurait supprimé le travail de sécurité de ChatGPT.)*

## 3. Une seule implémentation par sujet

Si une PR, une branche ou une Issue `[TEAM]` couvre déjà la demande : **on ne
recommence pas ailleurs.** On reprend, ou on signale le conflit.

**Une tâche inachevée se transmet par écrit**, dans son Issue `[TEAM]` : état,
branche, fichiers, tests réellement lancés, prochaine action, repreneur. Le
repreneur répond `REPRIS PAR <agent>` dans le même fil. **Aucun silence ne
vaut transfert.** Le modèle complet et la matrice des repreneurs
(`.ai/agents.yml`) sont dans `.ai/README.md`. Barbaros peut toujours changer
une attribution. Paiements, secrets, permissions, migrations et production ne
vont jamais à l'Agent local.

*(15/09 — 53 branches non fusionnées, dont sept tentatives sur la même
interface. 16/09 — deux sessions Claude ont poussé sur `main` dans la même
heure.)*

## 4. « Fusionné » ne veut pas dire « en ligne »

```
CODÉ → TESTÉ → FUSIONNÉ → DÉPLOYÉ → VÉRIFIÉ EN PRODUCTION
```

**`TERMINÉ` ne s'écrit qu'après le dernier étage.** Après chaque fusion,
**Claude vérifie que la publication a réellement réussi** avant de dire
« c'est en ligne » ; **ChatGPT contrôle le site** tel que le voient les
clients.

*(15/09 — deux PR fusionnées, publication en erreur, Barbaros a testé
l'ancienne version pendant vingt minutes.)*

## 5. Les tests

- **Un test éprouve une règle durable, jamais une valeur du jour** : pas un
  numéro de version, pas un nombre de colonnes, pas un compte d'onglets.
- **On ne supprime ni ne désactive jamais un test pour obtenir du vert.**
- **Une suite muette est un échec**, pas une suite « pas concernée ».
- **Un test rouge qui révèle un problème produit, commercial ou juridique
  remonte comme décision** ; il ne se corrige pas en silence.
- Quand la production diffère des sources, **les contrôles s'exécutent aussi
  sur le résultat de `construire.sh`**.

*(15/09 — un test figé sur `elatransfer-v80` a bloqué toute publication ; une
suite plantait depuis 85 commits sans rien afficher.)*

## 6. La documentation ne ment pas

**Toute PR qui rend une documentation commune fausse** — tarif, adresse,
authentification, structure des pages, déploiement, règle métier — **la
corrige dans la même PR.** Une documentation dit le présent ; l'histoire d'une
décision va dans `memoire/`, où elle reste datée.

*(15/09 — `CLAUDE.md` annonçait un code d'accès mort depuis des jours. Claude a
travaillé des heures sur une carte périmée.)*

## 7. Les secrets

**Ils n'appartiennent à aucune IA.** Jetons, clés privées, secrets GitHub et
Supabase, clés VAPID, codes hôtel vivent dans les coffres prévus. **Personne
n'en demande un, n'en reçoit un dans une conversation, ni n'en écrit un dans le
dépôt** — y compris dans un test.

*(Un jeton collé dans une conversation a dû être révoqué dans la minute. Une
clé VAPID privée a failli partir dans un fichier de test.)*

## 8. Ce qui est « important »

Tout changement qui touche : un prix ou un paiement · un texte contractuel ·
le logo ou l'identité · les données · la sécurité ou l'authentification ·
l'architecture ou les routes · le déploiement · une zone partagée. **Peu
importe le nombre de fichiers** : il passe par une branche et une PR, jamais
directement sur `main`.

## 9. Se parler

**L'Issue `[TEAM]` est le canal de transmission entre assistants** : #164 pour
la coordination, une Issue par sujet. **Ça ne retire rien à la conversation
de Barbaros** : ce qu'il dit à l'un ou à l'autre fait foi, et c'est à
l'assistant qui l'a reçu de le porter ici. **Barbaros n'a pas à faire le
facteur.**

**Signez vos messages** (`## ChatGPT → Claude — sujet`,
`## Agent local ELA → Équipe — sujet`) : tous peuvent apparaître sous le même
compte GitHub, et la signature est le seul moyen de savoir qui parle.

## 10. Ce qu'on ne fait jamais de sa propre initiative

Changer un tarif · une règle métier · un texte commercial ou contractuel · le
logo · l'identité visuelle · le design validé · l'organisation du produit.
**Et ne jamais recréer une interface déjà unifiée** : on la corrige là où elle
est.

## 11. Les priorités : finir l'important avant de polir

**Avant d'engager une nouvelle tâche qui produira du code**, l'agent — Claude,
ChatGPT ou un autre — la classe :

| | Ce qui en relève |
|---|---|
| **P0** critique | sécurité · données · réservation cassée ou peu fiable · paiement · juridique, conformité · production indisponible · commandes qui peuvent se perdre |
| **P1** business | acquisition (clients, hôtels) · conversion · chiffre d'affaires · exploitation · un problème opérationnel important |
| **P2** utile | UX · clarté commerciale · performance non critique · un vrai progrès, non bloquant |
| **P3** parking | esthétique · micro-texte · détail graphique · optimisation sans problème mesuré · perfectionner ce qui est déjà bon |

**L'état se lit sur GitHub, jamais dans un fichier.** La priorité d'une tâche
est l'**étiquette** `P0`, `P1`, `P2` ou `P3` de son Issue ; celui qui ouvre
l'Issue la pose, Barbaros la change quand il veut. **Active** = Issue ouverte
étiquetée P0, P1 ou P2 : **trois au plus**. **Parking** = Issue ouverte
étiquetée P3 : hors plafond, rien ne se perd. Une Issue sans étiquette (le
canal #164) ne compte pas ; une tâche faite sur-le-champ n'a pas besoin
d'Issue, sa PR dit sa priorité. Claude les lit par `/etat` (et au début de
chaque session) ; ChatGPT, dans la liste des Issues filtrée par étiquette.

**L'agent l'annonce en quatre lignes, puis :**

```
Priorité : P0 / P1 / P2 / P3 — raison concrète
Impact : ce que ça change pour un client, un hôtel ou Barbaros
Conflit avec une priorité supérieure : oui (#numéro) / non
Recommandation : faire maintenant / après le P0-P1 / parking
```

- « Faire maintenant » : il commence, **sans attendre de réponse**.
- Sinon, il **attend la décision de Barbaros**. S'il confirme, on le fait :
  c'est lui qui décide, et il peut changer d'avis. Au-delà de trois actives,
  la nouvelle en remplace une (l'agent dit laquelle) ou va au parking.
- Une tâche moins prioritaire ne prend jamais **en silence** la place d'un P0
  ou d'un P1 actif.
- **Pas d'annonce** pour une question, une correction à l'intérieur d'une
  tâche déjà classée, une faute de frappe. **Un P0 s'annonce en une ligne et
  part aussitôt** : cette règle ne retarde jamais une urgence.

**La règle du 8/10.** Ce qui n'est pas critique, fonctionne et ne présente
aucun problème mesuré ne se retravaille pas pour viser 10/10. On ne le rouvre
que sur au moins un de ces motifs : un problème observé chez un utilisateur ·
une anomalie mesurée · un impact commercial plausible et nommé · une dette
technique au coût concret · un risque sécurité, juridique ou données · une
nouvelle décision de Barbaros. Elle ne s'applique pas aux domaines du P0.

*(24/10/2026 — 122 commits sur `main` en trois jours, surtout des icônes et des
couleurs, pendant que le P0 #399, fiabilité de la réservation, n'avait plus
ni branche ni PR.)*

---

## Ce qui reste hors de ce fichier

- **`CLAUDE.md`** : les règles du produit vraies aujourd'hui, une à trois
  lignes chacune. Leur histoire est dans `memoire/`, un fichier par sujet. Un
  plafond tenu par `test-doc.mjs` l'empêche de regrossir.
- **`AGENTS.md`** : les zones critiques et les statuts de tâche.
- **`PROJECT_STATE.md`** : ce qui est décidé, prévu, bloqué — jamais les
  priorités du moment, qui sont des étiquettes d'Issue (§11).
- **`.ai/README.md`** : comment les agents IA exécutent ces règles.

**Une règle peut vieillir. Vérifier avant de s'en servir pour refuser quelque
chose.**
