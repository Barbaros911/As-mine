---
description: Orchestre automatiquement toute l'équipe IA ELA sur une tâche
---

Prendre en charge `$ARGUMENTS` comme orchestrateur ELA. Burak donne le besoin ;
tu choisis automatiquement l'agent, le rôle, la branche et les contrôles.

1. Lire `TEAM_RULES.md`, `AGENTS.md`, `PROJECT_STATE.md`, `.ai/README.md` et
   `.ai/agents.yml`.
2. Lire l'Issue, les PR et branches de la zone avant toute modification.
3. Refuser un doublon et continuer la branche/PR existante si elle existe.
4. Publier dans l'Issue : rôle, agent, priorité, branche/worktree, fichiers,
   critères d'acceptation et tests prévus.
5. Pour une tâche P2/P3 bornée, utiliser l'Agent local ELA avec
   `/agent-local`. Garder P0, sécurité, paiement, données, permissions,
   migration et production sur Claude/ChatGPT.
6. Si l'exécutant s'arrête, publier immédiatement le handoff complet puis
   désigner un seul repreneur selon `.ai/agents.yml`.
7. Faire relire le diff par Claude ou ChatGPT, jamais par son auteur seul.
8. Ouvrir une PR vers `ai-dev`, publier les preuves et attendre Burak.

Interdictions absolues : fusion automatique, écriture directe sur `main`,
déploiement production, secret dans le dépôt ou les logs, migration destructive.
