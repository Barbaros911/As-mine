# La mesure du trafic — l'écran « Trafic » de l'admin (15 octobre 2026)

La règle qui vaut aujourd'hui est dans `CLAUDE.md`, section « LA MESURE DU
TRAFIC ». Ici : l'histoire, les mesures et ce qui a été écarté.

## La demande

Barbaros, 14 octobre 2026 : un prompt complet (« MISSION — ANALYTICS TEMPS
RÉEL ELATRANSFER DANS L'ADMIN »), puis « Fait comme un expert ce que tu pense
le mieu et le plus utile pour moi ». Trois choix lui ont été proposés et il a
délégué : sonde de 10 s plutôt que Supabase Realtime, lien réservation →
référence (jointure à la lecture), écran réservé à l'admin.

## Deux mesures ont failli coexister — on en a gardé une

Le premier jet a été écrit sur une branche partie AVANT le 14 octobre : l'audit
n'y trouvait aucune mesure, et il a construit la sienne (`mesure.js` avec un
identifiant de 30 jours sur l'appareil, des noms anglais `page_view`,
`price_click`…, la source dans `?src=`). Pendant ce temps, `main` recevait la
mesure d'acquisition (`mesure.js` → `rpc/ela_mesurer` → `mesures_acquisition`,
un compteur par jour, rien sur l'appareil) puis les liens des partenaires
(`?via=`, `liens_suivi`). À la fusion : deux `mesure.js`, deux tables, deux
listes de gestes.

La mission interdisait deux systèmes parallèles. On a donc **gardé celui de
main et l'a fait évoluer** :
- ses noms de gestes (`page_vue`, `clic_reserver`, `clic_appel`,
  `clic_whatsapp`, `moteur_ouvert`, `formulaire_commence`,
  `demande_envoyee`), plus deux nouveaux : `prix_demande` et `prix_affiche` ;
- ses clés de page (`data-ela-page` : `fr-cdg`, `en-orly`, `pro`… ; le moteur
  prend `origineVisite`, sinon `accueil`) ;
- sa promesse : **rien sur l'appareil, aucun identifiant envoyé**. C'est elle
  qui a fait tomber l'identifiant de 30 jours du premier jet ;
- son compteur, qui reste lu par le registre (« Les pages du site », « Liens
  des partenaires ») : la fonction `mesure` l'incrémente en même temps qu'elle
  écrit au journal.

## Compter des visiteurs sans rien garder chez eux

Sans identifiant, il fallait quand même distinguer deux personnes. La fonction
calcule `sha256(adresse IP | navigateur)` ; la base le mêle à une clé tirée au
sort chaque jour (`trafic_sels`), effacée le lendemain, et garde 32 caractères
de l'empreinte obtenue. Conséquences, dites à l'écran :
- un visiteur est compté **une fois par jour** — sur 7 jours, quelqu'un venu
  trois jours compte trois fois ;
- deux téléphones derrière la même box avec le même navigateur se confondent ;
- personne, pas même l'admin, ne peut relier une empreinte d'hier à celle
  d'aujourd'hui : la clé n'existe plus.

La visite (pause de 30 min), la page d'entrée et la source de la visite se
calculent **à la lecture**, sur le premier geste de la visite : une
réservation faite dans le moteur garde la source Google de la page de service
d'où l'on est venu, sans rien transporter d'une page à l'autre.

## Pourquoi pas Supabase Realtime

Il faudrait soit `supabase-js` (le projet n'admet qu'une dépendance
extérieure, Leaflet, servie depuis le dépôt), soit réécrire le protocole
Phoenix à la main. Et Realtime livre UN message par page vue à l'admin, qu'il
faudrait réagréger dans le navigateur — l'inverse de « le serveur calcule ».
Une sonde de 10 s sur `ela_trafic_direct()`, écran ouvert et onglet visible :
six petites requêtes par minute. En vue « Aujourd'hui », les tuiles prennent
les totaux du jour que rend cette sonde : un appui sur WhatsApp passe de 12 à
13 sans relire tout l'historique.

## La fiche Google : `utm_medium=gbp`

Un lien posé sur la fiche Google arrive avec le même référent qu'une
recherche : rien ne les distingue. Le lien de la fiche doit porter
`?utm_source=google&utm_medium=gbp` — à coller par Barbaros sur sa fiche.
Sans ce marqueur, c'est « google », et c'est honnête. (Le premier jet passait
par `?src=gbp` ; `src` est désormais la page d'origine du moteur, chez main.)

## La mise en service

La fonction `mesure` se déploie à la fusion (`fonctions.yml`) ; la migration
`20261015010000_mesure_trafic.sql` s'applique à la main ensuite, APRÈS
`20261015000000_liens_suivi.sql` (elle s'arrête si `ela_mesurer` ou
`liens_suivi` manquent). Entre les deux, la RPC n'existe pas : la fonction le
voit (404) et passe le geste au compteur du 14 octobre, comme le faisait la
page — sinon le registre cesserait de compter. Les deux gestes de prix, qu'il
ne connaît pas, attendent la migration. `ela_mesurer` reste ouvert à `anon` :
les pages gardées en cache l'appellent encore.

## Le budget d'écran : le menu en cinq colonnes

Le menu de l'admin tenait en deux rangées (`auto-fit, minmax(78px,1fr)`),
règle du 10/10 (« Corrige tout »). L'entrée « Trafic » ouvrait une troisième
rangée : `test-admin-ergonomie` tombait (première demande à 872 px sur 844).
Cinq colonnes fixes : 65 px de large à 390 px, 62 à 375, aucun mot tronqué,
deux rangées. Sous 360 px, quatre colonnes.

Écarté : cacher la tuile sur téléphone (il travaille au téléphone), la ranger
sous le Centre de contrôle (deux appuis pour la chose qu'il veut voir « tout
de suite »), retirer une autre tuile (sa décision, pas la mienne).

## Confidentialité : ce qui a été pesé

L'exemption de consentement pour la mesure d'audience (CNIL) tient à :
finalité limitée à la mesure, pas de recoupement ni de suivi inter-sites,
données brutes limitées, possibilité de s'opposer. Le dispositif : aucun
cookie ni stockage, une empreinte qui change chaque jour, pas d'IP, pays
seulement, 90 jours de détail, « Ne plus me compter » dans la politique (le
refus est le seul mot écrit sur l'appareil, et il n'identifie personne).
Le point surveillé : `detail.ref` relie un geste à une course, donc à un
client. Le journal ne porte que la référence ; la jointure avec `courses` se
fait dans `ela_trafic()` à la lecture, par un admin. Si un jour on veut zéro
lien, on retire `ref` et on perd « quelle source fait des courses réalisées ».

## Les pièges rencontrés

- Le Chromium de test se déclare « HeadlessChrome » : la page l'écarte comme
  un robot. Les suites posent un vrai navigateur (`userAgent`).
- Le moteur efface `?aeroport=` de l'adresse dès l'arrivée : le clic sur
  « Voir mon prix » ne le retrouvait plus. Il est lu avec l'origine
  (`aeroportVisite`).
- `sum()` sur zéro ligne vaut NULL, et `NULL <> 1` ne tombe jamais : la
  falsification « compteur oublié » passait. `coalesce` et `is distinct from`.
- `innerText` n'existe pas sur un texte SVG : le contrôle de la série lisait
  une chaîne vide.

## Les suites

- `supabase/tests/trafic.sql` + `trafic-apres.sql` (vrai PostgreSQL, CI) :
  droits, écriture et dédup par service_role, compteur d'origine incrémenté,
  attribution de la visite, clé du jour qui change, lecture admin / agent
  refusé / anonyme refusé, rétention. Quatre falsifications : elle tombe.
- `test-securite-fonctions.mjs` : la fonction `mesure`, dont le repli.
- `test-mesure.mjs` : le collecteur sur le site construit, de Google à la
  réservation ; panne sans effet sur le dépôt ; « Ne plus me compter ».
- `test-admin-trafic.mjs` : l'écran, la sonde 12 → 13, sept largeurs, l'agent.
- `test-seo-en.mjs`, `test-liens-suivi.mjs` : plus rien par l'ancienne porte.
