# Le voyant des alertes — ce que la relecture a trouvé avant la publication

Archive rangée le 19 octobre 2026 (plafond de `CLAUDE.md`). Ce qui vaut
aujourd'hui est dans la section « LE VOYANT DES ALERTES DANS L'ADMIN » de
`CLAUDE.md` ; ce fichier garde POURQUOI c'est écrit ainsi.

## 4 octobre 2026 — ce que la relecture a trouvé avant la publication

Une relecture indépendante en quatre angles, chaque constat reproduit par un
second relecteur avant d'être corrigé. Tout est réparé ; ce qui suit est la
mémoire de POURQUOI c'est écrit ainsi.
- **« VU » N'EST PAS UN ENVOI.** Ouvrir une course dans l'admin
  (`ela_marquer_vue`) ou appuyer sur « Vu » dans Telegram écrit au journal
  canal `telegram`, statut `envoye`, type `vue`. Compté comme un envoi
  réussi, il faisait passer le voyant au VERT pendant une panne de
  Telegram — le geste même qu'on fait en regardant l'admin. Le chien de
  garde avait le même angle mort depuis le 2 octobre.
- **« indisponible » EST UN ÉCHEC** : c'est ce que journalise un secret
  Telegram absent ou mal nommé. Non compté, Telegram non configuré donnait
  « Alertes OK ».
- **L'ÉPREUVE SQL POSE LES PRIVILÈGES PAR DÉFAUT DE SUPABASE.** Un PostgreSQL
  nu n'accorde l'exécution qu'à PUBLIC ; Supabase l'accorde à `anon` et
  `authenticated`. Sans cette ligne, une migration qui n'ôterait que PUBLIC
  passait l'épreuve et un anonyme lisait les mesures en production.
- **UNE COMPARAISON AVEC NULL NE TOMBE JAMAIS** — `null not between 5 and
  60` vaut NULL. Même famille que `<>` sur une valeur NULL, déjà consignée.
- **LE BANDEAU REMPLACE « Son des alertes coupé »** quand les deux
  s'affichent : empilés, ils faisaient sortir de l'écran (390 × 844) la
  demande en attente qu'ils disent de surveiller. Il dit la PREMIÈRE panne
  et le nombre des autres ; la liste entière reste sur le voyant.
- **IL N'EST RÉÉCRIT QUE S'IL CHANGE** : c'est une région « alert », un
  lecteur d'écran relisait la même panne trois fois par minute.
- **UN ANCIEN VERDICT NE REVIENT PAS** après une coupure ou une
  reconnexion : il est oublié dès que le voyant passe au gris faute de
  session ou de serveur, et la prochaine relecture mesure aussitôt.
- **UNE SESSION PERDUE PENDANT LA SONDE SE DIT** (`sessionPerdue()`). Défaut
  antérieur au voyant : un mot de passe changé sur un autre appareil
  arrêtait l'écoute, et la pastille restait « Serveur connecté ».
- **L'EN-TÊTE NE SAUTE PLUS** : la ligne du voyant garde la largeur de son
  état le plus long.
- Contre le code d'avant ces corrections, 18 des 52 contrôles tombent ; neuf
  falsifications de la fonction serveur tombent toutes.
- **Les commentaires de l'admin et de la réception publiés** : constatés
  pendant ce travail, retirés ensuite à sa décision — voir « LES
  COMMENTAIRES DE TRAVAIL NE PARTENT PLUS EN LIGNE ».


## 20/10/2026 — l'état du système et la sonde de réservation

Réglages → « État du système » : alertes, réservations (1 h), notifications
(1 h), demandes du site (24 h), erreurs du site, dernière demande reçue,
dernière alerte partie (journal des notifications). Une mesure absente se dit
« non mesuré », jamais « OK ». `test-admin-voyant` (bloc L).
Le monitoring de production RÉSERVE de bout en bout
(`.github/scripts/sonde-reservation.mjs`) : la demande part au vrai
`deposer-course` marquée `sonde`, référence `SONDE-` ; la fonction fait tout
le chemin (champs, base, quota à part, prix) et s'arrête avant l'écriture.
Une version qui ignorerait la sonde la refuse (format `ELA-` exigé) ; toute
autre écriture de la page vers le serveur est coupée. Il vérifie aussi que
`sw.js` servi porte le cache de `/version.json`. `test-monitoring-sonde`,
`test-securite-fonctions`.

---

## Archivé de CLAUDE.md le 22/10/2026

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## LE VOYANT DES ALERTES DANS L'ADMIN

4 octobre 2026, Barbaros : « Ok voyant ». Le chien de garde GitHub devait
vérifier toutes les 15 min que les alertes partent ; GitHub ne le réveillait
que 6 fois en 21 h. Deux solutions lui ont été montrées : un réveil extérieur
(un compte de plus, une clé GitHub à confier) ou un voyant dans l'admin. Il a
choisi le voyant, après avoir demandé si une panne d'alerte lui ferait perdre
des courses : **non, la course arrive toujours sur le serveur et dans
l'admin, seule la sonnerie s'arrête**. C'est la phrase que dit le bandeau.

- **Sous « Serveur connecté », une ligne : « Alertes OK », « Alertes en
  panne » ou « Alertes : non vérifiées »** (`#adminAlertes`). En panne, un
  bandeau rouge sur le tableau de bord (`#bordAlertes`) dit LAQUELLE et le
  geste qui reste : garder l'écran ouvert, il sonne tout seul.
- **UN SEUL JUGE** : `admin-sante.js`, chargé par l'admin et importé par
  `chien-de-garde.mjs`. Deux juges finiraient par se contredire — un voyant
  vert pendant que l'Issue crie. Il rend deux phrases par panne, écrites à la
  même ligne de décision : la précise pour l'Issue, la simple pour l'admin.
- **UNE SEULE MESURE** : `ela_sante_alertes()` (migration
  `20261004010000_sante_alertes.sql`) rend les sept mesures de
  `sante-serveur.sql`, au caractère près — `test-chien-de-garde.mjs` compare
  les deux textes. Elle est réservée à un exploitant connecté ; la mesure
  elle-même (`ela_sante_mesures`) n'est accordée à personne.
- **LE GRIS N'EST PAS UN DÉTAIL.** Vert = mesure lue il y a moins de 3 min,
  et saine. Rouge = mesure lue, et une alerte ne part plus. Gris = on ne sait
  pas : sans session, sans réseau, fonction pas encore installée, réponse
  illisible, mesure trop vieille. **On ne garde jamais un ancien vert** : un
  vert qui n'a rien mesuré est pire que pas de voyant. Une réponse illisible
  est grise, pas rouge.
- **Il se mesure au rythme de la relecture du serveur, pas de la sonde** :
  au plus une fois toutes les 40 s, jamais onglet caché ni hors de l'espace.
- **LA MIGRATION EST APPLIQUÉE EN PRODUCTION** (4 octobre 2026 à 04 h 17,
  workflow « Appliquer une migration Supabase », exécution n° 26, réponse
  201), juste après la fusion de #305 ; Barbaros a vu « Alertes OK » en
  rouvrant l'admin. Si elle disparaissait un jour, le voyant redeviendrait
  gris (« non vérifiées ») : il ne prétend rien.
- **Le chien de garde GitHub reste** : quand il passe, il ouvre une Issue.
  Le voyant ne le remplace pas, il couvre les heures où GitHub dort.
- `test-admin-voyant.mjs` (52 contrôles, site construit),
  `supabase/tests/sante-alertes*.sql` (CI, vrai PostgreSQL).

- **La relecture indépendante d'avant publication** (« vu » n'est pas un envoi,
  « indisponible » est un échec, privilèges par défaut de Supabase dans
  l'épreuve, NULL qui ne tombe jamais…) : `memoire/voyant.md`.
- **LES ERREURS DU SITE SONT COMPTÉES SOUS LE VOYANT** (19/10/2026, audit) :
  toute erreur JavaScript non rattrapée part à la fonction `erreur-client`
  (masquée : six chiffres, e-mails, requêtes d'URL ; 5 par chargement, 30/h
  par adresse), écrite par `ela_erreur_client_ecrire` (clé de service, purge
  30 j) ; l'admin lit `ela_erreurs_client_recentes` (exploitant). Jamais nom,
  téléphone, référence, IP. Migration `20261019000000` à appliquer après la
  fusion ; sans elle, la ligne reste cachée. `test-public-erreurs`,
  `test-admin-reference`. Histoire : `memoire/erreurs-client.md`.
