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

## Les campagnes

Le tableau « Campagnes (UTM) » range les visites par leur `utm_campaign`,
sinon leur `utm_source`, lues sur le PREMIER geste de la visite, comme la
source. Une visite sans UTM ne crée pas de ligne : le tableau n'apparaît que
s'il a quelque chose à dire. Ajouté à la relecture finale : la mission
demandait les UTM, l'écran ne les montrait que fondus dans les sources.

## Revenir en arrière

Dans l'ordre, et rien ne se perd des réservations :
1. `git revert` du commit : les pages reviennent à l'appel direct de
   `rpc/ela_mesurer`, l'écran « Trafic » disparaît. La fonction `mesure`
   reste déployée mais plus personne ne l'appelle.
2. Si la migration a été appliquée, elle peut rester : le journal ne reçoit
   plus rien et la rétention le vide en 90 jours. Pour l'effacer tout de
   suite (workflow des migrations, un fichier neuf) :
   `select cron.unschedule('ela-trafic-retention');` puis
   `drop function public.ela_trafic(text), public.ela_trafic_direct(),
   public.trafic_totaux(timestamptz, timestamptz),
   public.trafic_agreger(timestamptz, timestamptz, text),
   public.trafic_lignes(timestamptz, timestamptz),
   public.trafic_bornes(text), public.ela_mesurer_evenement(jsonb, text),
   public.ela_trafic_retention(), public.trafic_evenement_valide(text),
   public.trafic_source_valide(text), public.trafic_detail_valide(jsonb);
   drop table public.evenements_site, public.trafic_sels;`
   Vérifier les noms dans `pg_proc` avant : on ne droppe pas un nom lu dans
   une note (la leçon de « depot client »).
3. Le compteur du 14 octobre (`mesures_acquisition`) n'est jamais touché.

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

## Le pays : mesuré « Inconnu » en production, déduit du fuseau horaire

16 octobre 2026, première vraie visite de Barbaros : visiteur, prix et
réservation comptés, mais le pays à « Inconnu ». La fonction lisait
`cf-ipcountry`, que Cloudflare pose d'habitude — or l'appel part du
navigateur vers `*.supabase.co`, et Supabase ne transmet pas cet en-tête à
la fonction. C'était le point écrit « à vérifier en production » : il l'a été,
et il ne tenait pas.

La correction ne devine rien. Le navigateur connaît son fuseau horaire
(`Intl.DateTimeFormat().resolvedOptions().timeZone`, « Europe/Paris ») ; la
base officielle des fuseaux (IANA, tzdata) dit à quel pays il appartient.
`.github/scripts/fabriquer-fuseaux.mjs` recopie `zone.tab` et les anciens noms
de `tzdata.zi` dans `supabase/functions/mesure/fuseaux.js` (542 entrées,
tzdata 2026c). L'en-tête de Cloudflare reste prioritaire s'il arrive un jour ;
un fuseau sans pays (« UTC ») ou inventé reste inconnu. **Seul le pays est
gardé, jamais le fuseau.**

La limite, dite franchement : c'est le pays de l'HORLOGE du téléphone, pas de
son réseau. Un téléphone se règle seul sur le fuseau où il se trouve : un
Américain déjà à Paris compte « France », le même qui réserve depuis New York
compte « États-Unis ». Pour savoir d'où viennent les visiteurs, c'est ce qu'on
veut.

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
- **`test-admin-trafic` tombait en CI une fois sur quelques-unes** (17/10/2026,
  PR #368, une PR qui ne touchait qu'une ligne de documentation). À
  l'ouverture, l'écran lit le direct et le jour en même temps, et prend les
  totaux du jour de la réponse arrivée la dernière. Le vrai serveur les rend
  par la même fonction (`trafic_totaux`) ; le faux direct de la suite en avait
  sa propre copie, sans confirmées ni réalisées. Direct servi en second : la
  phrase « Dont 5 confirmée(s)… » disparaissait. **Le produit était juste,
  c'est le faux serveur qui mentait.** Reproduit en retardant le direct de
  400 ms ; sous des délais tirés de 0 à 600 ms, l'ancienne suite tombait 4 fois
  sur 6. Corrigé à la source (#369 a d'abord recopié les deux valeurs dans le
  faux direct ; #370 a retiré la copie) : le faux serveur fait les totaux du
  jour une fois et les rend par ses deux RPC, un contrôle lit dans la
  migration que le vrai fait toujours de même, et la partie 10 force les deux
  ordres. Les
  attentes fixes qui couraient contre une réponse (« En direct » à 400 ms, les
  erreurs à 600 ms) attendent désormais l'état.

## Une réservation n'est comptée que si la course existe (18/10/2026)

Audit de la consolidation finale. **Le collecteur était juste** : la page
n'envoie `demande_envoyee` qu'après le « oui » du serveur (`if(ok)`, deux
chemins qui s'excluent — dépôt, ou une seule reprise). **La lecture ne
l'était pas** : `trafic_agreger` comptait chaque `demande_envoyee` du journal
sans regarder `courses`, alors que confirmées et réalisées y étaient déjà
croisées. Le geste est déclaré par un navigateur, l'en-tête Origin se
fabrique en une ligne de curl, et la référence n'est validée qu'en format :
un geste inventé gonflait « Réservations », la courbe et tous les taux.
Prouvé sur PostgreSQL : « 3 réservations au lieu de 2 ».
- `20261018000000_trafic_reservations_serveur.sql` : même code, plus
  `exists (… courses c where c.ref = l.ref)` sur les réservations et la
  courbe. L'attribution (visite, page d'entrée, source) ne change pas.
  **À appliquer en production après la fusion** (workflow des migrations).
- **L'entonnoir officiel est unique** et va jusqu'au bout : Visiteurs →
  Formulaire commencé → Prix demandé → Prix affiché → Réservation envoyée →
  Confirmée → Réalisée. Les trois dernières sont des faits du serveur, les
  quatre premières des gestes. Taux rapportés aux visiteurs, comme les tuiles.
  Le formulaire vient AVANT le prix : sur ce site, on remplit les adresses
  pour obtenir le prix, puis on confirme.
- **Ce que les réservations du trafic ne sont PAS** : le nombre de demandes
  du site. Une demande dont le geste s'est perdu (bloqueur, « Ne plus me
  compter », réseau coupé au retour) est une course sans attribution. Le
  compte exact des demandes est dans le registre ; le trafic dit d'où elles
  viennent.
- **La règle d'attribution**, écrite une fois (`classerSource`, fonction
  `mesure`) : lien d'un partenaire (`?via=` reconnu par la base) > fiche
  Google (`utm_medium`/`utm_campaign`/`utm_source` = `gbp`) > UTM (Google
  payant = campagne, Google, WhatsApp, réseaux sociaux, sinon campagne) >
  référent (Google, WhatsApp, réseaux, autres moteurs, autre site) > direct.
  Elle vaut pour la VISITE (premier geste, 30 min de silence la ferment) :
  une demande faite trois pages après l'arrivée depuis Google est à Google.
  Les pages d'hôtel, la réception et l'admin ne mesurent rien : un client
  d'hôtel s'attribue par la provenance de la course (registre).
- `test-mesure.mjs` partie 4 bis : une demande REFUSÉE par le serveur
  n'envoie aucun `demande_envoyee` (tombe si l'envoi part au clic).

## L'entonnoir dit où l'on perd, et qui apporte des courses (19/10/2026)

Audit des priorités demandé par Barbaros (« quelle source m'apporte
réellement des courses ? », « où les utilisateurs abandonnent ? »). **Rien à
reconstruire côté serveur** : `trafic_agreger` rendait déjà, pour chaque
page, source, entrée, langue, pays, appareil, lien et campagne, les prix
affichés, les confirmées et les réalisées (`20261018000000`, appliquée le
18/10, exécution n° 39). L'écran ne les montrait pas. Changement d'écran
seulement (`trafic.js`, `trafic.css`), aucune migration, aucune donnée de plus.
- **Chaque étape de l'entonnoir dit son taux sur l'étape d'avant** et combien
  s'arrêtent. Le taux sur les visiteurs dit combien vont jusque-là ; celui sur
  l'étape d'avant dit OÙ l'on perd — c'est lui qu'on lit pour corriger.
- **La plus grosse perte est nommée en une phrase**, jugée entre le formulaire
  commencé et la réservation seulement : un visiteur venu lire le numéro
  n'abandonne rien, et confirmée / réalisée dépendent d'Elatransfer et du
  calendrier. **Sous 5 personnes à une étape, elle ne juge pas** et le dit.
- **« Ce qui vous apporte des courses »** : les sources rangées par réalisées,
  puis confirmées, puis réservations — pas par visiteurs. Une source sans
  réservation n'y prend pas de ligne. Les tableaux portent maintenant prix vus,
  réservations, confirmées, réalisées (les pages vues et les prix DEMANDÉS
  restent dans les tuiles et l'entonnoir).
- **L'écran dit ce qu'il ne compte pas** : les pages d'hôtel, le comptoir et
  les saisies au téléphone ne mesurent rien ; leurs courses sont au Centre de
  contrôle (« Résultats par canal »), et un bouton y mène. Taire cette limite
  ferait croire que le site public est la seule source.
- **« Confirmée » et « Réalisée » suivent l'état des courses à la lecture** :
  une réservation pour un trajet de demain n'est pas encore réalisée. C'est
  écrit sous l'entonnoir, sinon le dernier taux se lirait comme un échec.
- **Ce qui a été écarté** : mesurer le trajet ou le prix de chaque abandon. À
  quelques dizaines de prix vus par semaine, une ventilation par trajet ne dit
  rien, et elle ajouterait au journal des données proches du client. Le jour où
  le volume la rend lisible, une **tranche de distance** (pas d'adresse, pas de
  montant) suffirait : une clé de `detail` et une migration.
- **Sur le site : « Aucun paiement maintenant » sous les prix** (`#vehRassure`,
  clé `prix_rassure`, FR/EN). L'écran des prix est celui de la plus grosse
  perte attendue, et il ne disait rien du paiement : la phrase n'arrivait que
  sous le dernier bouton, deux écrans plus loin. Trois formules déjà validées,
  aucune promesse nouvelle. Tue au comptoir (`body.reception`), dont l'écran
  est compté au pixel. `test-parcours-en` l'exige en anglais, sous les cartes, dans
  la gouttière de 20 px et jamais recouverte (à 320 px, `.rassure`, écrite plus
  bas, reprenait la marge : d'où la double classe) ; `test-nouveau-reception`, dite au flyer et tue au comptoir.
- Détails sortis du mémo au passage : la fonction `mesure` exige l'origine du
  site, connaît 9 gestes, plafonne à 100 gestes par heure et par adresse IP
  (hachée), et le pays vient du fuseau (voir plus haut).
- `test-admin-trafic` partie 11 (13 contrôles, attendus recalculés à la main) ;
  contre l'ancien écran, 10 tombent.

## Les suites

- `supabase/tests/trafic.sql` + `trafic-apres.sql` + `trafic-reservations.sql` (vrai PostgreSQL, CI) :
  droits, écriture et dédup par service_role, compteur d'origine incrémenté,
  attribution de la visite, clé du jour qui change, lecture admin / agent
  refusé / anonyme refusé, rétention. Quatre falsifications : elle tombe.
- `test-securite-fonctions.mjs` : la fonction `mesure`, dont le repli.
- `test-mesure.mjs` : le collecteur sur le site construit, de Google à la
  réservation ; panne sans effet sur le dépôt ; « Ne plus me compter ».
- `test-admin-trafic.mjs` : l'écran, la sonde 12 → 13, sept largeurs, l'agent,
  et l'ordre d'arrivée du direct et du jour, forcé dans les deux sens.
- `test-seo-en.mjs`, `test-liens-suivi.mjs` : plus rien par l'ancienne porte.

---

## Archivé de CLAUDE.md le 22/10/2026

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## LA MESURE DU TRAFIC — L'ÉCRAN « TRAFIC » DE L'ADMIN

15/10/2026. **Pas une seconde mesure** : celle du 14/10 (mesure.js, `ela_mesurer`)
a évolué. Pages (`data-ela-page`) et moteur postent à la fonction `mesure`
(gestes en liste fermée, robots écartés, pays par le fuseau, **source classée
côté serveur**), qui écrit au journal `evenements_site` (aucun droit
`anon`/`authenticated`) ET au compteur d'origine.
Lecture : `ela_trafic(periode)` / `ela_trafic_direct()`, **`est_admin()`** seul ;
sonde de 10 s, écran ouvert et visible. Pas de Realtime.
- **Rien sur l'appareil, aucun identifiant envoyé** : IP|navigateur haché, mêlé
  à une clé du jour détruite le lendemain. « Visiteur » = estimation PAR JOUR ;
  visite, entrée et source se calculent à la lecture (30 min). Jamais nom,
  téléphone, adresse, prix, IP ; `detail` = 4 clés, la référence jointe à la lecture.
- Fiche Google = `utm_medium=gbp` sur son lien. « Ne plus me compter » : FR/EN.
- **Une réservation ne compte que si sa course existe** (18/10, `20261018000000`).
  Entonnoir unique jusqu'à « Réalisée » ; chaque étape dit son taux sur l'étape
  d'avant, la plus grosse perte est nommée, jamais sous 5 personnes (19/10).
  « Ce qui vous apporte des courses » range les sources par réalisées ; hôtels et
  téléphone : Centre de contrôle. Sous les prix, « Aucun paiement maintenant »
  (`#vehRassure`, tu au comptoir). Rétention 90 j. `memoire/trafic.md`.
