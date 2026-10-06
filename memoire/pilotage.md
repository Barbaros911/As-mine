# Le Pilotage (Issue #197) — décisions et suite

> Archive ouverte le 6 octobre 2026, au bloc 1 sur 3. Ce qui est vrai
> aujourd'hui tient en quelques lignes dans `CLAUDE.md`, section « LE
> PILOTAGE — LE COCKPIT INTERNE ». Ici : pourquoi c'est ainsi, et ce qui
> reste à faire. À compléter aux blocs 2 et 3, sans réécrire le passé.

## Ce que l'Issue demandait, et ce qui a changé avant le code

L'Issue #197 (ChatGPT, 20 septembre 2026) décrivait un « Kanban Agile » à six
colonnes. Avis rendu avant d'écrire une ligne, puis appliqué :

- **Un seul déroulé pour les deux tableaux** : Idées → À faire → En cours →
  À valider → Terminé. « À tester » est parti — les tests appartiennent à la
  PR sur GitHub ; pour Barbaros, ce qui compte est « À valider ». « En
  attente » (Opérations) est devenu un **marqueur** « Bloqué / en attente »
  avec sa raison, posable à n'importe quelle étape : une carte attend À une
  étape, elle n'est pas « à l'étape attente ». Un seul déroulé, c'est aussi
  ce qui permet de répondre sur les deux tableaux à la fois à « qu'est-ce qui
  attend ma validation ? » et « qu'est-ce qui bloque ? ».
- **Catégories** : « Lancement » n'en est pas une (une carte « SIRET »
  serait à la fois Société et Lancement, donc introuvable par filtre) — le
  lancement se suit par l'échéance et la priorité. « Supports » est dans
  « Marketing et supports ». **Une idée peut rester sans catégorie** : on
  note vite, on range quand on décide (« À faire » en exige une).
- **Aucune suppression en V1.** L'archive suffit ; une purge exceptionnelle
  (une carte créée avec une donnée qui n'avait rien à y faire) se fait en SQL
  par le propriétaire du projet. C'est aussi pourquoi le journal **ne garde
  jamais le contenu des champs libres** (titre, description, checklist…) —
  seulement le nom du champ modifié : un secret collé par erreur s'efface
  vraiment en corrigeant la carte.
- **`est_admin()`, pas `est_exploitant()`** : l'agent de réservation n'a pas
  à lire les cartes Finance ou Société. Il n'y a pas d'agent aujourd'hui ;
  ça ne coûte rien et ça ne se rattrape pas après coup.
- **Les dépendances traversent les tableaux** (« Stripe Live » dépend de
  « SIRET »).
- **« Terminé » devra vouloir dire VÉRIFIÉ EN PRODUCTION** pour une carte
  Produit (TEAM_RULES §4) : c'est la checklist qui le porte, pas une colonne
  de plus.

## Le risque de doublon avec GitHub Projects

ChatGPT a créé le 21 septembre le projet GitHub « ELA Transfer — Équipe IA »
avec les mêmes colonnes et les mêmes priorités. TEAM_RULES §2 fait des Issues
et des PR la source de vérité du travail de développement. **Le Pilotage ne
recopie pas l'état des Issues** : une carte Produit porte la décision et la
validation de Barbaros, et RÉFÉRENCE l'Issue par un lien saisi à la main. Le
lien n'est accepté que vers une Issue ou une PR de ce dépôt (ni une adresse
quelconque, ni un `javascript:`). Aucune synchronisation, aucun jeton GitHub.
Recommandé, à trancher par Barbaros : le projet GitHub pour les agents, le
Pilotage pour lui.

## Le tableau des courses n'est pas touché

Le seul vrai Kanban de courses est dans Admin v2 (`COLONNES`, non publié
depuis le 3 octobre) ; l'admin retenu traite les courses dans son tableau de
bord. Le Pilotage n'en partage ni table, ni écran, ni classe CSS (les
classes `kanban-*` sont prises) ; il n'interroge le serveur que lorsqu'on le
lui demande, ne sonne jamais, et n'entre pas dans la sauvegarde locale des
courses. `test-admin-pilotage.mjs` vérifie qu'aucun appel ne part au
chargement de l'admin, et l'épreuve SQL que la table `courses` (déclencheurs,
policies, droits, colonnes) est identique avant et après la migration.

## Bloc 1 (6 octobre 2026) — ce qui a été fait

- **La base** (`20261006010000_pilotage.sql`) : deux tables, RLS sur
  `est_admin()`, droits retirés puis rendus COLONNE PAR COLONNE (Supabase
  accorde tout par défaut à `anon` et `authenticated`, TRUNCATE compris, que
  la RLS ne filtre pas) ; identifiant, version et dates posés par la base
  seule ; contraintes nommées ; déclencheur avant écriture (normalisation,
  dépendances, archive figée, version) et déclencheur de journal en
  « security definer » — seule porte d'écriture du journal. La migration
  s'arrête d'elle-même si un droit survit.
- **Le module** `pilotage.js` : référentiels et libellés, normalisation et
  validation (miroir des contraintes), client passant par `ELA_NUAGE`
  (écriture sous condition de version, conflit qui rend la version du
  serveur, aucune fonction de suppression). Chargé par `/ela-admin/` seul ;
  la construction le retire des pages publiques et s'arrête si une trace y
  reste.
- **Les preuves** : `supabase/tests/pilotage*.sql` sur un vrai PostgreSQL
  (privilèges par défaut de Supabase reproduits, trou exigé sur une table
  sonde) ; `supabase/tests/pilotage-http.mjs` par PostgREST avec de vrais
  jetons — porte publique, langue de `pilotage.js`, et **miroir** : un corpus
  de cas jugés par `valider()` ET envoyés à la base, même verdict exigé ;
  `test-admin-pilotage.mjs` (listes identiques des deux côtés, requêtes,
  cloisonnement sur le site construit, admin réel). Éprouvés contre 14
  migrations faussées, 8 défauts HTTP et 7 défauts de recette : tout tombe.
- **Deux défauts trouvés par les épreuves, pas en relisant** :
  `champs || 'titre'` dans le journal (PostgreSQL y voit un tableau mal
  écrit : `array_append`), et un contrôle qui violait deux contraintes à la
  fois (PostgreSQL les évalue par ordre alphabétique : l'épreuve doit
  n'en violer qu'une).
- **Le miroir a trouvé son propre écart** : un statut, une priorité ou une
  checklist envoyés NULS exprès. PostgREST transmet un null tel quel, sans
  le défaut de la colonne : `pilotage.js` acceptait, la base refusait. Le
  miroir refuse désormais un statut ou une priorité nuls, et la base lit une
  liste nulle comme vide. Absent n'est pas nul.
- **Un piège de falsification** : un faux appel réseau posé « au chargement »
  de `pilotage.js` ne partait jamais — le module est chargé AVANT le script
  qui crée `ELA_NUAGE`. Refait à l'ouverture de l'espace, il fait bien tomber
  la suite. Une falsification qui ne reproduit pas le défaut ne prouve rien.

## Ce qui reste

**Bloc 2 — l'écran, mobile d'abord** (décision de Barbaros du 20/09) :
entrée « Pilotage » dans la colonne de l'admin (cachée à l'agent dans
`agent-role-ui.mjs`), une étape à la fois sur téléphone avec onglets
compteurs, fiche de création/édition, déplacer par boutons (pas de
glisser-déposer), bloquer avec raison, checklist, archiver/restaurer,
conflit de version expliqué. Rendu en `textContent`, jamais `innerHTML`.
Captures 320/390 px et ordinateur, puis validation de Barbaros.

**Bloc 3 — l'ordinateur et le confort** : les cinq colonnes de front,
filtres (tableau, priorité, responsable, en retard, bloqué), recherche,
journal lisible, dépendances (« bloquée par »), clavier. Les P0 bloquées ou
en retard ressortent.

**À la mise en production** : appliquer la migration par le workflow des
migrations APRÈS la fusion ; elle exige `est_admin()` (posée par
20260929030000_role_agent_serveur.sql) et s'arrête à voix haute si elle
manque. Toute modification
publiée de `pilotage.js` exige de monter `CACHE` dans `sw.js`.
