---
description: Lance ou supervise le troisième agent local sur une Issue ELA
---

Prendre en charge la demande `$ARGUMENTS` avec l'Agent local ELA, sans fusion
ni publication automatique.

## Avant tout lancement

1. Exécuter `/etat`.
2. Lire `TEAM_RULES.md`, `AGENTS.md`, `PROJECT_STATE.md` et `.ai/README.md`.
3. Résoudre le numéro d'Issue donné dans `$ARGUMENTS` et lire ses commentaires.
4. Vérifier les PR et branches de la même zone.
5. Annoncer un statut : `À FAIRE`, `EN COURS AILLEURS`, `PARTIELLEMENT FAIT`,
   `BLOQUÉ` ou `TERMINÉ`.
6. Si un autre agent tient déjà la zone, ne pas créer une autre implémentation.

## Attribution

- Aider + Ollama : petite correction/documentation/test borné.
- OpenCode : analyse ou revue ciblée ; ne pas lui confier tout `index.html` sur
  une machine à contexte limité.
- Claude Code : conserver l'exécution si la tâche est complexe, multi-fichiers,
  sécurité critique ou si le modèle local ne dispose pas des ressources.

Le relais d'une tâche Claude/ChatGPT est attribué automatiquement selon
`.ai/agents.yml`. Le travail précédent doit comporter un handoff dans la même Issue : état,
branche/worktree, fichiers, tests, blocage et prochaine action. Répondre
`REPRIS PAR Agent local ELA` avant de commencer.

## Exécution locale

Vérifier les ressources et les outils avec :

```sh
sh .ai/scripts/ai-local.sh status
```

Si les outils manquent, expliquer que l'installation est locale à la machine.
Ne lancer `sh .ai/scripts/bootstrap-local.sh` que dans un environnement adapté,
après avoir confirmé qu'au moins 12 GiB de RAM et 10 GiB de stockage sont
disponibles. Ne jamais installer dans GitHub Actions pour contourner cette
exigence.

Créer une branche/worktree depuis `ai-dev` avec :

```sh
sh .ai/scripts/new-task.sh <issue> local <sujet-court>
```

Puis lancer Aider dans ce worktree :

```sh
sh .ai/scripts/ai-local.sh aider
```

## Sortie obligatoire

- tests ciblés puis suite/build proportionnés ;
- revue par un autre agent ou Claude ;
- PR vers `ai-dev` ;
- commentaire signé dans l'Issue :
  `## Agent local ELA → Équipe — sujet` ;
- arrêt en attente de validation humaine.

Ne jamais fusionner vers `ai-dev` ou `main`, ni déployer, dans cette commande.
