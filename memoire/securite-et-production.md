# Les audits de sécurité et la production — histoire

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## AUDIT DE SÉCURITÉ DU 28/09/2026 — DEUX FONCTIONS OUVERTES À TOUS

**Le jeton vérifié par Supabase à l'entrée d'une fonction ne prouve RIEN** :
la clé publique du site (lisible dans la page) le franchit — c'est même
comme ça que `etat-course` et `courses-hotel` sont appelées. Toute fonction
qui agit au nom de Barbaros doit donc vérifier elle-même `est_exploitant()`
avec le jeton de l'appelant (modèle : `prevenir-client` ; `est_admin()` pour l'argent).
- **`prevenir-client`** n'avait aucun autre contrôle : n'importe qui pouvait
  envoyer à un client abonné une fausse « Transfert confirmé » avec le texte
  et le LIEN de son choix, sur des références qui se devinent en comptant.
  Elle exige maintenant un exploitant, borne le texte, et n'accepte qu'un
  lien vers elatransfer.com. `sw.js` refuse en plus d'ouvrir un lien
  étranger au clic sur une notification (deux défenses).
- **`nouvelle-demande`** croyait le corps reçu : un faux « INSERT » faisait
  partir chez Barbaros une alerte Telegram au texte libre. Elle ne garde plus
  que la référence et **relit la course sur le serveur** — existante, créée
  il y a moins de 15 min, jamais annoncée. **Aucun réglage à changer** : le
  vrai webhook passe à l'identique.
- `test-securite-fonctions.mjs` éprouve les deux, sans Deno ni réseau ;
  six contrôles sur sept tombent sur l'ancien code.
- **Second passage, même jour** :
  - **Le code de la réception est plafonné** : 60 appels par heure et par IP
    dans `courses-hotel`, via le quota serveur du dépôt public. Le compte est
    pris AVANT la comparaison — sinon l'essai gagnant passerait quand même.
    Au-delà : 429, et la page dit « trop d'essais » sans oublier le code.
  - **Plus aucune écriture directe d'`anon` dans `courses`**
    (`20260928120000_courses_sans_depot_anonyme.sql`). Le site publié dépose
    uniquement par `deposer-course` (prix recroisé, quota) ; la vieille
    policy de `SUPABASE.md` laissait écrire une course au prix de son choix.
    **La migration ne part pas toute seule** : workflow « Appliquer une
    migration Supabase », ce fichier. Épreuve SQL en CI, qui repose l'état
    d'origine et exige qu'il laisse passer avant d'exiger le refus.
- **Le rôle `agent_reservation` est borné côté serveur depuis le 29/09**
  (« LE RÔLE AGENT EST IMPOSÉ PAR LE SERVEUR ») ; `role_operateur` n'est
  toujours défini dans aucune migration du dépôt.

## AUDIT DU 19/10/2026 — AVANT L'EXPLOITATION À PLUSIEURS HÔTELS

Aucun P0. Corrigé : collision de référence (section « LA RÉFÉRENCE EST TIRÉE
AU SORT ») ; `deposer-course` vérifie « déjà déposée ? » AVANT le quota ;
`courses-hotel` refuse un partenaire `actif = false` (fiche absente ou table
muette : le code décide) ; `etat-course` refuse une référence mal formée sans
lecture ; `prevenir-client` n'accepte plus `github.io`. Registre : voir « LE
REGISTRE ». RELANCE/INSTALLER_TELEGRAM exigent `x-ela-relance` : secret fabriqué
dans Vault par `20261019010000`, lu des deux côtés (RPC `ela_relance_secret`) ;
sans migration, ouvertes comme avant. Histoire :
`memoire/reference.md`, `memoire/erreurs-client.md`, `memoire/alertes-relance.md`.

## SEULE MAIN TOUCHE LA PRODUCTION — ET LE REPLI « SERVEUR SANS VERSION » EST PARTI

2 octobre 2026, le soir, à sa demande (« fait le comme un expert »), après
la vérification d'avant lancement — le projet démarre le 12. **Ce qui a été
LU en production, pas supposé** : le journal du workflow des migrations
(colonnes `version` et `modifie_le` listées à 18 h 15 ; diagnostic de
fiabilité à 18 h 47 : 12 demandes du site en 7 jours, **0 sans alerte
réussie**, Telegram 16/0, notifications 13 réussies, relance pg_cron active,
dernier passage 19 s), et le journal des déploiements : les 11 fonctions
déployées depuis `main` à 18 h 46.

**LE CORRECTIF « SEULE MAIN DÉPLOIE » DE #283 NE PROTÉGEAIT PAS.** Retirer
une branche de la liste `branches:` ne change que la copie du workflow qui
est sur `main` ; GitHub exécute **la copie présente sur la branche
poussée**. Mesuré sur `git ls-remote` : 45 branches portaient encore une
copie qui déploie depuis la branche mini-van (du 11 septembre), dont la
`prevenir-client` **sans contrôle d'exploitant** — la faille fermée le
28 septembre. Un push sur cette branche, ou un lancement manuel depuis
n'importe laquelle, la remettait en production sans un mot.
- **La protection est le SECRET, pas la liste.** Les trois workflows qui
  portent `SUPABASE_ACCESS_TOKEN` (fonctions, migrations, chien de garde)
  déclarent `environment: production`, et chacun refuse à voix haute toute
  branche autre que `main` à sa première étape. **Ce que seul Barbaros peut
  faire, dans cet ordre** : fusionner, PUIS créer l'environnement
  « production » (Settings → Environments) restreint à `main`, y poser le
  jeton — **en refaire un neuf chez Supabase et révoquer l'ancien**, Supabase
  ne remontre jamais une valeur — et supprimer le secret au niveau du dépôt.
  Fait dans l'autre ordre, les copies de `main` perdraient le jeton avant la
  fusion. Une fois le secret déplacé, toute vieille copie s'arrête à
  « jeton absent ».
  **La branche « mini-van » N'EXISTE PAS** (vérifié le 4 octobre 2026 :
  `git ls-remote` et l'API GitHub rendent tous deux « absente »). Ce sont
  43 vieilles branches qui la NOMMENT dans leur `fonctions.yml`
  (`branches: [main, mini-van]`). Il faudrait donc la recréer pour
  déclencher l'une de ces copies — et même alors, sans jeton hors de
  l'environnement « production », elle s'arrêterait sur « jeton absent ».
  Rien à supprimer.
- **FAIT LE 4 OCTOBRE 2026 VERS 1 h 20**, depuis son iPhone. Nouveau jeton
  Supabase `github-production` (portée : l'organisation Barbaros911,
  préréglage « Full access », **expire le 1er octobre 2027** — à refaire
  avant), rangé dans l'environnement « production » seulement. Les deux
  anciens jetons (« Github », « GitHub ») sont supprimés chez Supabase, le
  secret du dépôt aussi. **Éprouvé après la suppression**, sur `main` :
  chien de garde, migrations (inventaire en lecture seule) et déploiement
  des onze fonctions, tous verts. Supabase propose désormais des jetons à
  droits choisis ; « Read-only » ne déploie rien, et un réglage plus fin
  n'a pas été tenté faute de pouvoir l'éprouver avant.
- **Le chien de garde a mis QUATRE HEURES à tourner seul** : fusionné à
  18 h 05, premier passage planifié à 22 h 08 — et dans l'heure qui a suivi,
  un passage sur quatre seulement. J'avais d'abord accusé l'expression
  `7-59/15` et l'avais réécrite en liste ; mesure faite, elle était juste,
  et la réécriture est retirée : **retoucher le fichier d'un planning peut
  réenclencher ce délai**. GitHub est lent à enregistrer un planning neuf et
  le livre avec retard sous charge — c'est connu, et c'est pour ça que ses
  Issues sont un filet, pas une horloge. **À constater sur 24 h** avant de
  le compter comme régulier, et ses Issues ne servent que si Barbaros reçoit
  les notifications GitHub sur son téléphone.

**LE REPLI `serveurSansVersion` EST RETIRÉ** d'`index.html`. Il avait une
lame : il se déclenchait sur TOUT message d'erreur contenant « 400 » et
repassait l'admin, pour toute la session, en écrasement complet du bon
(`merge-duplicates`) — le défaut même que la version existe pour fermer.
La migration étant confirmée en production, il n'avait plus de raison
d'être. Une colonne absente est désormais une panne AFFICHÉE
(`#bordHorsLigne`, « nuage 400 ») et un geste reste en file, jamais forcé.
Le bloc e) de `test-admin-arrivee` éprouve l'inverse de ce qu'il éprouvait ;
contre l'ancien code, cinq contrôles tombent et nomment le
`merge-duplicates` parti.

**`verifier-production.mjs` SURVEILLE DIX PORTES, PLUS CINQ.** Manquaient :
`application.html` (où mènent les cartes du flyer), `/ela-admin/`,
`/easyhotel-client/`, et la réception sous ses deux adresses. Éprouvé : la
page propre retirée, il tombe en la nommant.

**CE QUI RESTE À FAIRE PAR BARBAROS, ET QUE LE CODE NE PEUT PAS FAIRE** :
- fermer puis rouvrir l'admin sur CHAQUE téléphone et tablette — un onglet
  gardé en mémoire depuis avant 18 h 05 porte l'ancien code, et la base,
  elle, accepte toujours une écriture sans version ;
- la course test de bout en bout (flyer → Telegram → confirmer sur un
  appareil → modifier sur un autre → réception → réaliser → supprimer) :
  rien de la synchronisation par version n'a encore servi sur une vraie
  course ;
- une sauvegarde par semaine : le carnet des chauffeurs, leurs paiements,
  les factures et leur numérotation, l'identité de l'émetteur et le lien
  d'avis ne vivent QUE sur l'appareil. Les réservations, elles, sont toutes
  sur le serveur.
- `sw.js` CACHE v121.

## AUDIT DU 2 OCTOBRE 2026 — CE QUE LA PRODUCTION CONTIENT VRAIMENT

Audit demandé par Barbaros avant l'exploitation du 12. Lecture seule, à
partir des journaux des 17 exécutions du workflow de migration (la seule
trace de ce que la base a reçu), du diagnostic de fiabilité et du chien de
garde. Rapport complet remis dans la conversation ; ici, ce qui doit survivre.

- **LA POLICY ANONYME S'APPELLE « depot client » EN PRODUCTION**, pas « un
  client peut deposer sa demande » comme l'écrivait `SUPABASE.md`. Le `drop
  policy` du 28/09 a donc visé le vide ; le `revoke insert … from anon` de la
  même migration, lui, a été exécuté (29/09, 00 h 26). PostgreSQL vérifie le
  droit sur la table avant les policies : anon ne peut plus écrire, la
  policy est inerte mais reste **affichée** dans le tableau de bord — c'est
  ce que Barbaros voyait comme « encore active ». `20261003000000` la
  supprime par son vrai nom. **APPLIQUÉE LE 3 OCTOBRE 2026 À 16 h 34**
  (workflow des migrations, exécution n° 23), après validation par Barbaros
  des trois parcours réels. Journal lu : il ne reste sur `courses` que les
  quatre policies `authenticated` et aucun droit pour `anon`. Leçon : **on ne droppe pas un nom lu dans une
  doc, on droppe un nom lu dans `pg_policies`** — le diagnostic du 15/09
  l'avait sous les yeux.
  **L'épreuve SQL avait le même défaut, et c'est pour ça que rien ne l'a vu**
  (3 octobre 2026, Issue #190). `courses-sans-anon.sql` reposait la policy
  sous le nom de la doc — celui que la migration du 28/09 droppait — et
  passait donc au vert sur un drop qui, en production, visait le vide. Elle
  repose maintenant « depot client », enchaîne les deux migrations, et
  vérifie séparément la policy et le droit sur la table. Éprouvé sur un
  PostgreSQL local : sans la migration du 03/10 elle tombe en nommant
  « depot client » ; avec un `grant insert … to anon` rendu, elle tombe aussi.
  **Une épreuve qui repose l'état qu'on imagine éprouve la doc, pas la base.**
- **AUCUN REGISTRE DES MIGRATIONS.** Le workflow exécute du SQL brut par
  l'API de gestion et n'écrit rien dans `schema_migrations`. Sur 29 fichiers,
  12 sont passés par lui ; 17 ont été collés dans l'éditeur SQL, et des
  objets vivent en production sans migration (`courses`, `abonnements`,
  `presence_operateurs`, `role_operateur`, `signaler_presence`,
  `presences_operateurs`, le webhook INSERT → nouvelle-demande).
  `20261003010000_inventaire_schema.sql` liste le schéma réel en lecture
  seule, sans donnée ni argument de déclencheur : **le lancer avant d'écrire
  une migration qui touche un objet existant.**
- **DEUX MIGRATIONS NE DOIVENT PLUS JAMAIS ÊTRE REJOUÉES** :
  `20260916100000_current_tariff_source.sql` (upsert des forfaits) et
  `20260928120000_tarif_unifie.sql` (UPDATE du tarif au kilomètre). Depuis
  que les prix se règlent depuis l'admin (Réglages → Tarifs, Prix du flyer),
  les rejouer **écraserait** ce que Barbaros a réglé, sans un mot.
  `20260916070000_stripe_test_manual_capture.sql` crée ses policies sans
  `drop` préalable : rejouée, elle échoue, ce qui est sans dégât.
  `20261004000000_minimum_berline_35.sql`, elle, se rejoue sans danger :
  elle n'écrit que si la ligne porte encore la valeur du 28 septembre à
  l'identique. **Toute future migration de tarif doit suivre cette forme
  conditionnelle**, ou rejoindre la liste des deux ci-dessus.
- **SEULE `main` PUBLIE, DÉPLOIE ET MIGRE.** `pages.yml`, `fonctions.yml` et
  `migrations.yml` acceptaient `workflow_dispatch` sur n'importe quelle
  branche — les migrations ont été lancées depuis une branche le 15/09. Les
  trois jobs portent `if: github.ref == 'refs/heads/main'`. Un diagnostic se
  fusionne d'abord, se lance ensuite.
- **LE QUOTA DES CLIENTS DU QR EST TRANCHÉ** (3 octobre 2026, Barbaros :
  « la 2 »). Le plafond anonyme de 12 dépôts par heure et par adresse IP
  valait aussi pour les clients qui scannent le flyer sur le **wifi de
  l'hôtel**, qui partagent l'adresse de la box : le treizième lisait « non
  transmise » et personne n'était alerté. Une demande qui porte la clé d'un
  partenaire **réel** — vérifiée dans `partenaires`, jamais crue sur parole,
  sinon chaque clé inventée serait un compteur neuf — compte désormais sur sa
  propre clé « hôtel + adresse + heure », plafonnée à **30**. La réception
  garde ses 60 par session ; l'anonyme ordinaire ses 12. Un attaquant qui
  connaît la clé de l'hôtel (elle est dans les liens du QR) gagne 30 au lieu
  de 12, rien de plus. Quatre contrôles dans `test-securite-fonctions`.
- **LA CLÉ DU WEBHOOK SE LIT D'ICI, SANS L'AFFICHER** (3 octobre 2026,
  Barbaros : « regarde toi-même »). L'en-tête d'autorisation du webhook sur
  `courses` (créé dans le tableau de bord) doit porter la clé publique, pas
  une clé service_role. `20261003020000_diagnostic_webhook_autorisation.sql`
  lit la définition des déclencheurs `http_request` et **classe** l'en-tête
  — publique, secrète, ou jeton JWT avec son rôle — sans jamais sortir la
  valeur, le journal GitHub étant public. Le rôle se lit dans la partie
  centrale du jeton, qui est du JSON encodé, pas chiffré.
  - **`analyse` EST UN MOT RÉSERVÉ DE POSTGRESQL** (l'orthographe britannique
    d'`ANALYZE`) : le premier jet nommait ainsi une CTE, et la base l'a
    refusé en production — après une fusion, donc une PR de plus à faire
    relire. **Un SQL de diagnostic s'éprouve AVANT d'être poussé, et c'est
    possible ici** : cette machine a PostgreSQL 16 complet dans
    `/usr/lib/postgresql/16/bin` (`initdb`, `postgres`, `psql`), à lancer
    sous l'utilisateur `postgres` dans `/tmp` — le bac à sable n'est pas
    traversable par cet utilisateur. La PR #285 affirmait « pas de serveur
    PostgreSQL sur la machine de travail » : c'était faux, personne n'avait
    regardé. Éprouvé ensuite sur six déclencheurs factices (anon,
    service_role, `sb_publishable_`, `sb_secret_`, sans en-tête, et un
    déclencheur ordinaire qui ne doit pas apparaître) : la version de `main`
    rend mot pour mot l'erreur de la CI, la version corrigée classe les cinq
    webhooks et ignore le sixième.
  - **VERDICT RENDU LE 3 OCTOBRE 2026 : LE WEBHOOK PORTAIT UN JETON
    `service_role`.** Un seul webhook, `nouvelle-demande` sur `courses`,
    sans en-tête `apikey`. Rien ne l'avait montré dans un journal public
    (aucun diagnostic antérieur ne lisait les déclencheurs) : pas de
    rotation forcée. Barbaros : « fais-le pour moi » —
    `20261003030000_webhook_cle_publique.sql` relit la définition du
    déclencheur, remplace la valeur d'`Authorization` par la clé publique,
    ajoute `apikey` avec la même clé (les deux en-têtes que la relance
    pg_cron envoie depuis le 30/09, combinaison éprouvée en production — la
    fonction lit la base avec ses propres droits, jamais avec l'en-tête
    reçu), et rejoue la définition en `CREATE OR REPLACE TRIGGER`. Elle
    **refuse** s'il y a zéro ou plusieurs webhooks sur `courses`, ou si
    l'en-tête n'est pas « Bearer <jeton JWT> » ; rejouée, elle constate et
    ne fait rien ; elle n'affiche jamais l'ancienne définition. Éprouvée
    sur le PostgreSQL local : cas réel, rejouée, déclencheur qui tire
    encore, deux refus, `apikey` déjà présente — six scènes.
- **LE VRAI BLOQUANT EST ADMINISTRATIF** : SIRET, RC Pro de la centrale,
  déclaration d'activité au ministère des transports (L3142-2, preuve
  d'immatriculation + attestation RC, par mail, valable un an), papiers des
  chauffeurs dans le carnet, médiateur sous 30 jours. Rien de tout cela ne se
  code.
