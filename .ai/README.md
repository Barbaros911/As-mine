> **Règle normative :** `TEAM_RULES.md` reste le fichier maître. Ce document décrit son exécution pour les agents IA. En cas de contradiction, `TEAM_RULES.md` prévaut. `main` est la source du code validé et la seule branche publiée ; il n'y a plus de branche d'intégration (`ai-dev` est retirée depuis le 17 octobre 2026).

# Équipe IA ELA Transfer

Cette configuration ajoute un troisième exécutant local sans remplacer Claude
Code ni ChatGPT. GitHub reste le canal commun et `TEAM_RULES.md` reste la règle
supérieure.

## Chaîne obligatoire

`dernier main → branche/worktree de la tâche → tests → review croisée → PR vers main → validation Burak → fusion`

- aucune écriture directe sur `main` (le ruleset GitHub la refuse) ;
- aucune fusion ou publication automatique ;
- une branche et un worktree par tâche ;
- une seule tâche active par zone critique ;
- toute transmission destinée aux autres agents est signée dans une Issue
  `[TEAM]` ;
- l'orchestrateur attribue automatiquement les reprises selon `.ai/agents.yml`
  et continue la branche/PR existante lorsque c'est possible ;
- Burak peut changer une attribution, et reste seul à valider une fusion.

## Le relais (handoff) — automatique, traçable, révocable par Burak

Quand ChatGPT, Claude Code ou l'Agent local ELA ne termine pas une tâche, il
écrit dans l'Issue `[TEAM]` de cette tâche un bloc signé contenant :

- l'état exact : demandé, attribué, en cours, codé, testé ou bloqué ;
- la branche, le worktree et la PR éventuelle ;
- les fichiers modifiés et ceux qu'il reste à traiter ;
- les tests réellement exécutés, leurs résultats, et ce qui n'a pas été testé ;
- le blocage ou la prochaine action précise ;
- le repreneur choisi selon la matrice `.ai/agents.yml`.

L'orchestrateur désigne **un seul** repreneur dans la même Issue ; celui-ci
répond `REPRIS PAR <agent>` dans le même fil et continue la branche/PR
existante, sans jamais créer une seconde implémentation. Aucun arrêt, silence
ou expiration de session ne vaut transfert. Les tâches P0, paiements, secrets,
permissions, migrations ou production restent à Claude/ChatGPT avec validation
humaine : l'Agent local ne les reçoit pas.

États communs : `DEMANDÉ → ATTRIBUÉ → EN COURS → CODÉ → TESTÉ → À VALIDER →
FUSIONNÉ → DÉPLOYÉ → VÉRIFIÉ EN PRODUCTION`.

Ce que chacun dépose dans les Issues `[TEAM]` : ChatGPT les spécifications,
audits de production et demandes de correction ; Claude les statuts, preuves
techniques, branches et PR, et une Issue quand une décision produit est
nécessaire ; l'Agent local signe `## Agent local ELA → Équipe — sujet`, annonce
sa branche/worktree et laisse tests, diff, limites et reste à faire.

## Outils retenus

| Outil | Usage | Statut |
|---|---|---|
| Ollama | serveur de modèle local | socle local |
| Qwen2.5-Coder 7B | petites tâches, tri, documentation, revue ciblée | local, sans quota API |
| Aider | troisième exécutant Git pour tâches bornées | recommandé sur cette machine |
| OpenCode | lecture/revue et tâches très ciblées | expérimental avec ce modèle |
| Claude Code | tâches complexes et gros contexte | conservé, cloud/quota Anthropic |

La machine auditée possède 15 GiB de RAM et aucun GPU. Le modèle 7B est donc un
choix de sécurité, pas l'équivalent local de Claude. OpenCode recommande 64k de
contexte, alors que ce modèle est limité à 32k : il ne doit pas recevoir une
refonte globale du monolithe `index.html`.

## Rôles logiques

Les rôles sont des profils de tâche, pas onze logiciels différents :

| Rôle | Zone | Contrôle obligatoire |
|---|---|---|
| ARCHITECTE | architecture/dépendances | lecture seule avant plan |
| FRONTEND | façade publique mobile-first | captures 320/390 px + desktop |
| ADMIN | Admin v2 | respecter le verrou de la PR active |
| BOOKING | cycle de réservation | tests cycle + tarification |
| HOTEL | client/réception hôtels | cloisonnement réception |
| DRIVER | chauffeurs | RBAC + données privées |
| QA | tests/build | aucune suite muette ou désactivée |
| SECURITY | secrets/RLS/permissions | revue indépendante |
| SEO | pages/sitemap/performance | build publié vérifié |
| DEVOPS | GitHub/Cloudflare/Supabase | aucune production sans validation |
| REVIEWER | diff d'un autre agent | ne modifie pas le code revu |

## Démarrer une tâche

### Pour Burak, sans terminal

- Dans ChatGPT : `Lance l'équipe ELA sur la tâche #NUMÉRO, sans fusionner.`
- Dans Claude Code : `/agent-local #NUMÉRO`

Ces deux commandes imposent les mêmes règles. ChatGPT ou Claude choisit le rôle
adapté, annonce l'attribution dans l'Issue `[TEAM]`, puis attend la validation
humaine avant toute fusion. Burak n'a jamais à recopier un message entre agents.

1. Lire `TEAM_RULES.md`, `AGENTS.md` et `PROJECT_STATE.md`.
2. Vérifier les Issues `[TEAM]`, PR ouvertes et branches de la zone.
3. Créer une Issue depuis le modèle « Tâche agent IA ».
4. Créer le worktree avec `.ai/scripts/new-task.sh`.
5. Dans l'Issue, annoncer agent, branche, worktree, fichiers et priorité.
6. Développer, tester, faire relire par un autre agent, ouvrir une PR.
7. Attendre la validation humaine. Ne jamais fusionner automatiquement.

## Lancer les outils locaux

```sh
sh .ai/scripts/bootstrap-local.sh
sh .ai/scripts/ai-local.sh status
sh .ai/scripts/ai-local.sh aider
sh .ai/scripts/ai-local.sh opencode
```

Les binaires et modèles sont installés hors du dépôt. Aucun secret n'est requis
pour le chemin Ollama local.
