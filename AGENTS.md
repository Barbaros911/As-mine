# ELA Transfer — règles de coordination pour tous les agents

Ce fichier est la règle centrale du dépôt. Il doit être lu AVANT toute modification par ChatGPT, Work, Codex, Claude ou tout autre agent humain/IA.

## Objectif

Éviter qu’un chat, Work, Codex ou un autre agent recommence une tâche déjà en cours, parte d’un ancien état, écrase un changement plus récent ou publie une version concurrente.

## Source de vérité

- `main` = dernière version validée et destinée à la production.
- Les conversations ne sont PAS la source de vérité.
- GitHub est le point central : branche, PR, tâche, historique et état du projet.
- Avant de commencer, toujours vérifier le dernier `main`, les PR ouvertes et `PROJECT_STATE.md`.

## Statut obligatoire avant tout travail

Avant toute modification, annoncer un seul statut parmi :

- `À FAIRE` : aucun travail existant ne couvre la demande.
- `EN COURS AILLEURS` : une autre branche/PR/tâche traite déjà la même demande ; ne rien recommencer.
- `PARTIELLEMENT FAIT` : une partie existe déjà ; ne traiter que le reste.
- `BLOQUÉ` : une dépendance, un accès ou une validation manque.
- `TERMINÉ` : le travail demandé est déjà présent et vérifié.

Si la tâche est `EN COURS AILLEURS`, ne pas créer une seconde implémentation concurrente.

## Vérifications obligatoires avant de modifier

1. Lire `AGENTS.md`.
2. Lire `PROJECT_STATE.md`.
3. Vérifier le dernier commit de `main`.
4. Vérifier les PR ouvertes et les branches actives liées à la zone demandée.
5. Identifier les fichiers concernés.
6. Déterminer si une autre tâche modifie déjà ces mêmes fichiers.
7. Seulement ensuite décider de commencer ou non.

## Règle d’exclusivité par zone critique

Une seule tâche à la fois peut modifier une même zone critique.

Zones critiques principales :
- façade publique ELA : `sites/ela-public/` + intégration d’accueil ;
- application de réservation : `index.html`, `application.html` généré, scripts liés ;
- EasyHotel client : `sites/easyhotel-client/` ;
- EasyHotel réception : `sites/easyhotel-reception/` + fonctions associées ;
- admin ELA : `sites/ela-admin/` / logique exploitant ;
- build/déploiement : `construire.sh`, `.github/workflows/`, Cloudflare ;
- sécurité/authentification : Supabase, fonctions Edge, règles d’accès.

Si une tâche active touche déjà la même zone ou le même fichier, ne pas lancer de modification concurrente.

## Branches et PR

- Ne pas travailler directement sur `main` pour une évolution normale.
- Créer une branche fraîche depuis le `main` le plus récent.
- Une branche = une tâche clairement définie.
- Nom recommandé : `ela/<numero-ou-sujet-court>` ou `fix/<sujet-court>`.
- Une PR = une tâche.
- Avant fusion, comparer la branche avec le dernier `main` et vérifier qu’aucun changement plus récent ne sera écrasé.
- Si `main` a changé pendant le travail, réconcilier avant fusion.
- Fusionner une seule PR à la fois sur une même zone critique.

## Publication

Avant publication :
- vérifier que la demande utilisateur exacte est bien couverte ;
- vérifier qu’aucune modification non demandée n’a été ajoutée ;
- vérifier le responsive mobile + ordinateur quand le changement est visuel ;
- vérifier les liens et fonctions touchés ;
- vérifier les conflits avec les travaux récents ;
- vérifier le build/déploiement ;
- ne jamais annoncer `TERMINÉ` avant vérification réelle.

Après publication :
- mettre à jour `PROJECT_STATE.md` ;
- marquer la tâche comme terminée ;
- indiquer clairement au user : `TERMINÉ`, `BLOQUÉ` ou `PARTIELLEMENT FAIT`.

## Règles ELA verrouillées

- Ne jamais inventer une modification non demandée.
- Ne pas changer le logo, les couleurs ou l’identité ELA sans demande explicite.
- La référence de marque est bleu marine + cyan + blanc, logo ELA Transfer validé, univers Paris/aéroport.
- Ne pas modifier tarifs, règles métier, EasyHotel, admin ou sécurité lors d’un travail purement visuel sauf demande explicite.
- Ne pas promettre disponibilité 24/7, confirmation immédiate ou toute garantie non réellement assurée.
- Ne pas utiliser une image générée par IA comme remplacement du logo officiel.
- Pour une référence visuelle validée, la reproduire fidèlement ; ne pas la traiter comme une simple inspiration.

## Communication entre agents/chats

Chaque agent doit laisser une trace GitHub suffisante pour que le suivant comprenne :
- ce qui est en cours ;
- la branche/PR utilisée ;
- les fichiers touchés ;
- ce qui reste à faire ;
- ce qui est bloqué ;
- ce qui a été validé.

Un agent qui arrive dans un nouveau chat ne doit jamais supposer que rien n’est en cours simplement parce qu’il ne voit pas les autres conversations.

## Principe final

Avant d’écrire du code, répondre d’abord à cette question :

**« Est-ce que cette tâche est déjà faite, partiellement faite ou en cours ailleurs ? »**

Si oui, ne pas refaire le même travail. GitHub décide de l’état réel du projet, pas la mémoire d’une conversation.