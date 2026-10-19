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

