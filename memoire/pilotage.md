# Le Pilotage (Issue #197) — décisions et suite

> Archive ouverte le 6 octobre 2026, au bloc 1 sur 3 ; blocs 2 et 3 le même jour. Ce qui est vrai
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

## Mise en production du bloc 1 (6 octobre 2026)

PR #327 fusionnée par Barbaros à 06 h 53 UTC ; la migration appliquée par le
workflow des migrations à 06 h 55 (exécution n° 30, réponse 201). Le journal
a rendu les quatre policies attendues (création, lecture, modification pour
`authenticated` ; lecture du journal) et la migration est allée au bout :
son contrôle final, qui l'arrête si `anon` garde un droit ou si la
suppression est permise, est donc passé EN PRODUCTION, pas seulement sur le
banc. Aucune carte créée.

## Bloc 2 (6 octobre 2026) — l'écran, mobile d'abord

Plan présenté en clair à Barbaros, accepté (« Ok »), puis construit :
- **Où** : entrée « Pilotage » entre « Facturer » et « Réglages », cachée à
  l'agent (`agent-role-ui.mjs`, style ET interception du clic). L'écran
  `#ecran-pilotage` porte une phrase qui dit qu'il n'est pas le traitement
  des courses. Tout son contenu est dessiné par `pilotage-ecran.js`.
- **Liste** : deux tableaux en bascule, cinq étapes à compteurs sur UNE
  ligne même à 320 px (le libellé passe à la ligne plutôt que de pousser la
  page), un point sur l'étape et le tableau qui contiennent une carte en
  retard (rouge) ou bloquée (ambre), un résumé en mots, puis les cartes.
- **Fiche** : titre, tableau, catégorie, étape, blocage, priorité,
  responsable (Barbaros, Claude, ChatGPT en un appui), prochaine action,
  échéance, critères, impacts, description, lien GitHub. L'ordre a été
  changé après la première capture : l'étape et le blocage passaient AVANT
  le titre.
- **Ce qui part** : seulement les champs changés (comparés à la carte du
  serveur, une fois normalisés comme la base les garderait), sous condition
  de version. Une action (étape, blocage, archivage) part AVEC la saisie en
  cours : cocher le dernier critère puis appuyer sur « Terminé » marche.
  Ce qui a été tapé PENDANT un envoi n'est pas effacé à son retour.
- **Conflit** : le serveur gagne, la fiche se recharge, et le message nomme
  les champs non appliqués.
- **Deux appuis** (0,7 à 5 s d'écart) pour archiver et pour quitter une
  fiche non enregistrée — un double appui involontaire ne vaut pas accord.
  Une fiche entamée survit à un détour par les courses.
- **Une erreur seule se dit seule** ; plusieurs, en liste. « Terminé »
  refusé nomme les critères qui restent.
- **Champs en 16 px** : en dessous, l'iPhone zoome à chaque saisie (la page
  n'interdit pas le zoom, et ne doit pas).

**Ce que les épreuves ont trouvé, pas la relecture :**
- la construction a REFUSÉ la page publique : un commentaire partagé nommait
  le fichier de l'écran. Le garde-fou du bloc 1 a servi au premier essai ;
  les commentaires sont maintenant DANS la section retirée.
- un message absent faisait planter l'écran (`appendChild(null)`).
- une première falsification « le dernier geste écrase » ne faisait rien —
  la vraie suite a été renforcée pour attendre un éventuel second envoi, et
  la falsification réécrite : elle tombe.

`test-admin-pilotage-ecran.mjs` (89 contrôles, site construit, faux serveur à
versions) tombe contre 10 défauts : tout le formulaire envoyé, critères
manquants non nommés, étape sans la saisie en cours, dernier geste qui
écrase, innerHTML, archivage en un appui, fiche quittée sans prévenir, entrée
visible pour l'agent, lecture au chargement, puces sous 44 px.

## Bloc 3 (6 octobre 2026) — l'ordinateur et le quotidien

Mission de Barbaros : « audit expert + avis avant modification ». L'avis
rendu AVANT le code, puis appliqué :

- **Utile, mais pas sur le chemin critique du 12 octobre.** Ce qui bloque le
  lancement est administratif (SIRET, RC Pro, déclaration au ministère,
  papiers des chauffeurs, médiateur). Fait quand même, parce que le bloc 3
  ne touche QUE l'écran : aucune migration, aucun appel serveur nouveau,
  `index.html` intact. Les pages publiques construites sont identiques avant
  et après, empreinte par empreinte.
- **Le plus utile n'est pas du code** : que Barbaros y saisisse les cartes du
  lancement. Une recherche sur une table vide ne sert à rien.
- **Retenu** : cinq colonnes au-delà de 1 200 px (en dessous, avec la
  colonne de l'admin, une étape tomberait sous 170 px) ; recherche locale ;
  trois filtres (Bloquées, En retard, Prioritaires P0–P1) et Responsable ;
  historique à la demande ; titre de la fiche sur plusieurs lignes et
  « Modifiée le » sous le titre ; le résumé rouge devenu deux boutons qui
  posent le filtre ; « Terminé » trié par date de fin.
- **Écarté, et pourquoi** : glisser-déposer et flèches « avancer » (un geste
  involontaire déplacerait une carte sans passer par les critères de
  « Terminé ») ; sélecteur de dépendances (la raison du blocage couvre le
  vrai besoin ; aucune carte n'en a) ; filtres catégorie, GitHub, récentes
  (la recherche trouve la catégorie et « #197 » ; « récentes » ne décide de
  rien quand on est seul à écrire) ; Archivées et Terminé comme filtres (une
  colonne et un écran à part) ; filtres gardés sur l'appareil (un filtre
  oublié cacherait des cartes le lendemain) ; pagination ; tableau de bord
  chiffré ; vue « les deux tableaux » ; raccourcis clavier globaux.

**Comment c'est construit :**
- **Un seul dessin** : les cinq colonnes sont toujours dans la page ; la
  feuille de style n'en montre qu'une (l'étape choisie) sous 1 200 px. Pas
  de second écran, pas d'écouteur de taille de fenêtre. Au-delà, l'écran du
  Pilotage s'élargit seul jusqu'à 1 500 px : la limite de 1 080 px de
  l'admin protège un tableau de chiffres, pas cinq piles de cartes.
- **La recherche ne redessine que les résultats** (`#pilVueEtat`,
  `#pilResultats`) : redessiner le champ ferait sauter le clavier du
  téléphone. Insensible aux majuscules et aux accents ; chaque mot doit se
  trouver dans UN champ. Jamais l'identifiant, la version, l'auteur. Trouvée
  par un champ que la carte ne montre pas, la carte dit « Trouvé dans :
  description ».
- **Un filtre ne cache jamais une alerte** : le résumé rouge et les points des
  tableaux comptent toutes les cartes ; les compteurs des étapes suivent le
  filtre, et un bandeau dit « 3 cartes sur 9 » avec « Tout afficher ».
- **Une carte créée ou restaurée que le filtre cacherait lève les filtres**, et
  l'écran le dit : sinon « Carte créée » sur une liste où elle n'est pas.
- **L'historique** (`journal(id, { limite: 100 })`, lu seulement sur « Voir
  l'historique », relu après une écriture s'il est ouvert) est dit à partir
  d'une LISTE FERMÉE : libellés pour étape, priorité, tableau, catégorie (une
  valeur inconnue devient « ? ») ; responsable et raison du blocage tels
  quels (le journal les garde par décision du bloc 1) ; pour un champ libre,
  son nom traduit et rien d'autre. Heure de Paris, « 06/10 18:42 ».
- **Une erreur d'affichage du Pilotage s'arrête à son écran** (`sur()`,
  `montrerPanne()`) : elle se dit, ne remonte pas, et les courses répondent.

**Les preuves** : `test-admin-pilotage-vue.mjs` (site construit, faux
serveur, horloge fixée au 6/10 à 18 h 45 de Paris) — ordinateur 1280 à
1920 px, téléphone 320 à 430 px, recherche, filtres, historique, panne
d'affichage, aucune page hors de l'admin qui connaisse le Pilotage.
Éprouvée contre 18 falsifications, toutes tombent : colonnes d'ordinateur
retirées, « Terminé » trié par priorité, recherche qui redessine le champ ou
relit le serveur, identifiant cherché, accents comptés, filtres en OU, résumé
qui suit le filtre, filtres gardés sur l'appareil, carte créée cachée par le
filtre, historique qui recopie le journal ou un champ libre, historique lu à
l'ouverture ou sans limite, heure en UTC, garde d'affichage retirée, toutes
les colonnes sur téléphone, carte neuve à l'étape suivie sur ordinateur.
**La falsification des accents a trouvé un défaut** : la plage des accents
était écrite en caractères combinants LITTÉRAUX, pas en `\u0300-\u036f`.
Juste à l'exécution, invisible à la relecture (le crochet se dessine
par-dessus) — et la falsification n'en trouvait pas le motif. Réécrite
échappée ; aucun caractère combinant ne reste dans les fichiers du Pilotage.
La suite du bloc 2 a été ajustée : elle attendait le sélecteur des étapes,
masqué sur ordinateur, et son contrôle « cinq étapes sur une ligne » ne
compte plus que ce qui est AFFICHÉ — des boutons masqués ont tous un « top »
nul et passaient le contrôle sans rien prouver.

## Ce qui reste

**Bloc 4, seulement si le besoin se voit** : recherche dans les archives
(elles grossiront) ; un nom d'auteur dans l'historique et un rôle dédié côté
base le jour où plusieurs personnes écrivent ; dépendances visibles
(« bloquée par ») si la raison du blocage ne suffit plus.

**Toujours** : toute modification publiée de `pilotage.js`,
`pilotage-ecran.js` ou `pilotage.css` exige de monter `CACHE` dans `sw.js`.
