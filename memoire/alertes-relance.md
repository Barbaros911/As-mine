# La relance des alertes — ce qui a été décidé, et pourquoi

Le mémo (`CLAUDE.md`, « ÊTRE ALERTÉ DE CHAQUE DEMANDE » et « UN CANAL QUI
INSISTE ») dit ce qui vaut aujourd'hui. Ici, l'histoire.

## La mesure d'avant (29/09/2026)

Diagnostic `20260929000000_diagnostic_delais_alertes.sql`, run n° 10 du
workflow des migrations : clic du client → serveur en 0 à 2 s, serveur →
Telegram en 0 à 2 s, sur les dix dernières courses. Le serveur n'était pas
lent ; les notifications étaient encore « indisponibles » ce jour-là (clés
VAPID pas encore posées).

## La cadence (30/09 et 2/10/2026)

La première cadence a été proposée par ChatGPT le 30/09/2026 et validée par
Barbaros, puis resserrée le soir même à sa demande (« tout sonne plusieurs
fois par minute »). Le 2/10, Barbaros : « je ne veux pas recevoir trop
d'alertes sur Telegram » — Telegram informe (90 s puis 15 min, chaque rappel
efface le précédent), la notification ELA est l'alarme (20 s). Le 9/10, les
90 s remplacent « +3 min puis +10 min », éprouvé admin fermé.

## Le secret de la relance (19/10/2026, audit, P2)

- **Ce qui était ouvert** : `{type:"RELANCE"}` et `{type:"INSTALLER_TELEGRAM"}`
  de `nouvelle-demande`, joignables avec la clé publique du site (elle est
  dans la page). Rien à lire ni à voler : la relance relit le journal et la
  cadence vient du journal (aucun message de plus) ; reposer le webhook en
  boucle peut faire ralentir le bot par Telegram, donc le bouton « Vu ». Une
  nuisance possible, pas une faille — d'où P2, et la décision de Barbaros
  (« Vas-y pour le 2 ») après le choix d'attendre pour le Registre.
- **Pourquoi un secret partagé et pas autre chose** : pg_cron ne connaît ni
  le jeton du bot (dont est dérivé le secret du webhook) ni les secrets des
  fonctions ; la fonction ne voit rien qui distingue pg_cron d'un inconnu.
  Il faut une valeur connue des deux : le **coffre** (Vault) côté base, lu
  dans la commande de la tâche à chaque appel (`(select decrypted_secret from
  vault.decrypted_secrets where name = 'ela_relance_secret')`), motif que
  documente Supabase pour appeler une fonction depuis pg_cron.
- **Premier jet : la fonction lisait `RELANCE_SECRET` posé à la main**, et
  Barbaros aurait collé la même valeur dans Vault et dans les secrets des
  fonctions (une valeur générée ici, montrée dans la conversation — sans
  danger, elle n'ouvrait que ce qui était déjà ouvert). Il a répondu
  « Fais-le toi-même ». D'où le second jet : **la migration FABRIQUE le
  secret** dans le coffre (deux `gen_random_uuid()`, 64 signes, gardé si
  rejouée) et pose la RPC `ela_relance_secret()` (security definer, exécution
  à la seule `service_role`) ; **la fonction lit la valeur attendue dans la
  base** par cette RPC, la garde 5 min, et la relit sur un désaccord (le
  secret a pu tourner). Le secret ne quitte jamais Supabase, personne ne
  colle rien. `RELANCE_SECRET` reste un repli manuel qui l'emporte.
- **Le verrou ne s'arme que quand la migration est passée.** Sans RPC (404)
  ou base muette, la fonction accepte comme avant : la relance EST l'alerte,
  un verrou manquant ne doit pas la couper. L'ordre fonction/migration est
  indifférent : une tâche qui envoie l'en-tête à une fonction qui ne l'exige
  pas ne gêne rien. Si les deux divergent, la relance tombe en 401 et le
  voyant de l'admin le dit en 5 min (« relance absente ou muette »).
- **Comparaison à temps constant**, longueur comprise ; le webhook INSERT
  (la demande qui arrive, déclenché par la base) n'est pas concerné.
- **Éprouvé** : `test-securite-fonctions` (dix contrôles : sans secret tout
  passe ; avec, 401 sans en-tête, 401 à un signe près, INSTALLER sans appel à
  Telegram, passage avec le bon en-tête, INSERT libre, secret tourné relu,
  ancienne valeur refusée, repli manuel) — garde retiré, cinq tombent.
  `supabase/tests/relance-secret-{avant,apres}.sql` (CI, doublures de Vault,
  pg_cron et pg_net qui ENREGISTRENT) : migration jouée deux fois, un seul
  secret de 64 signes, RPC fermée à `anon` et `authenticated`, tâche unique
  qui porte l'en-tête et le NOM du secret mais jamais sa valeur, deux appels
  INSTALLER avec la vraie valeur. `a-coller.ts` réassemblé
  (`test-notification`, 34).
- **Le faux serveur de `test-securite-fonctions` ne connaissait pas la liste
  « en attente »** que relit la relance : première exécution tombée sur le
  motif de référence d'une autre URL. Une réponse vide ajoutée.

## Plus aucun silence avant le « Vu » (25/10/2026, P0)

**Le constat de Barbaros.** Depuis le 12/10 : 6 courses de la réception
easyHotel, 5 transmises par téléphone et organisées en moins de 15 min, une
seule passée par l'outil — vue avec plus de 30 min de retard.

**Mesuré avant de toucher.** Le diagnostic `20260929000000` (exécution n° 53
du workflow des migrations) : les deux demandes du site depuis le 12/10
(12/10 15 h 46 et 20/10 9 h 42) ont eu leur annonce Telegram ET leur
notification « envoyée » en 2 à 11 s. L'annonce partait ; c'est la SUITE qui
se taisait. Une simulation sur ce code (horloge avancée de 20 s en 20 s) :
une demande de la réception à 14 h pour le lendemain 7 h, jamais vue,
recevait la notification les 10 premières minutes, Telegram à +25, +40,
+55 min, puis **rien pendant 14 h**, jusqu'à H-2. Les suites le disaient
déjà (« passé 10 min, départ à plus de 2 h : la notification se tait »).

**Sa décision** : la nuit aussi, le téléphone continue jusqu'au « Vu »
(« oui »). D'où :
- **non vue** : 0–10 min inchangé (notification 20 s, Telegram 90 s) ;
  10–30 min, palier critique « 🔴 NON VUE » (notification 2 min, Telegram
  5 min) ; ensuite notification 5 min et Telegram 15 min, **quel que soit le
  départ** ; H-30 inchangé. Au plus 4 Telegram par heure, un seul visible.
- **« Vu » arrête l'alarme, pas le suivi** : avant, il coupait tout jusqu'au
  départ, message final compris. Maintenant : « VUE, PAS CONFIRMÉE » 30 min
  après, à H-2, à H-30 (jamais deux à moins de 20 min), puis le final.
- **Rattrapage jusqu'au départ** (avant : 6 h, après quoi la demande n'était
  plus jamais annoncée et le voyant cessait de la compter).
- **Un seul tour à la fois** et **une annonce par demande**, même appelés en
  même temps (verrous en mémoire, par instance de la fonction) ; 8 s au plus
  par appareil pour la notification (sans délai, un service muet retenait
  tout le tour, qui chevauchait le suivant).

**Le piège trouvé par le test** : « reste » se compte à la minute près ; le
départ calculé flotte donc d'un tour à l'autre. Sans marge d'une minute, le
rappel de H-2 se croyait non fait et repartait 20 min plus tard (cinq rappels
« vue, pas confirmée » au lieu de trois).

**Éprouvé** : `test-relance-alertes` (141), dont un bloc « P0 » qui reprend
ses scénarios un par un (Telegram en panne puis revenu, admin fermé toute une
nuit, cinq demandes simultanées, quinze relances en parallèle, redémarrage du
serveur au milieu, aucun « vu » écrit par le serveur, rien de personnel).
Contre le code d'avant, 24 contrôles tombent, chacun en nommant le défaut
(905 min sans Telegram, 950 sans notification, 30 envois pour 15 relances
simultanées, deux annonces pour une demande).

**Ce qui était faux plus haut** : « si les deux côtés divergent, la relance
tombe en 401 et le voyant le dit en 5 min ». Non : le voyant et le chien de
garde jugent la tâche pg_cron, « réussie » dès que l'appel est mis en file ;
personne ne lit la réponse de la fonction. Corrigé dans `NOTIFICATION.md` ;
la mesure qui manque (un battement écrit par la relance elle-même) est
l'étape 2.

**Décision du 25/10/2026 : ouvrir la course dans l'admin RESTE un « Vu ».**
Proposé : que seuls les boutons « ✅ Vu » (Telegram, et un nouveau sur le bon)
arrêtent l'alarme, l'ouverture ne suffisant plus. Barbaros : « non ». Ne pas
le reproposer sans un incident qui le demande.

## Étape 2 : les alertes se surveillent elles-mêmes (25/10/2026, P0)

Barbaros : « Vazi », après la liste : bandeau des non vues, alerte d'essai,
voyant qui surveille la notification et la relance, chiffres de délai.

- **Le battement de la relance** (`ela_battements`, migration
  `20261025000000_alertes_suivi.sql`) : la fonction réécrit sa ligne à chaque
  tour qui a lu les demandes ; le voyant et le chien de garde jugent
  `relance_ok_s` (panne au-delà de 5 min, jugée seulement quand pg_cron
  tourne, pour ne pas dire deux fois la même panne). La migration pose un
  premier battement : sans lui, « jamais battu » pendant 20 s.
- **La notification ELA est surveillée** : `abonnes_push` (appareils
  actifs), `push_ok_1h`, `push_echecs_1h` (« aucun_abonne » et
  « indisponible » sont des échecs). Zéro abonné, ou que des échecs dans
  l'heure : « Alertes en panne », avec le geste (« Activer les
  notifications »).
- **L'alerte d'essai** : l'admin dépose « essai / demande » (RPC
  `ela_demander_essai_alerte`, exploitant, une par minute) ; la relance
  l'envoie 30 s plus tard (le temps de verrouiller), après avoir RÉSERVÉ la
  ligne (PATCH sous condition « demande ») : deux instances de la fonction
  n'en envoient qu'une — le test tombe sans la réservation. Restée 10 min
  (relance arrêtée), elle expire sans sonner. Pas d'appel du navigateur à la
  fonction : ni CORS à ouvrir, ni attente côté page.
- **Le bandeau des non vues** (`#bordNonVues`) : demandes du site en
  attente, sans « vue » au journal ; depuis quand, combien d'alertes, la
  dernière quand ; CRITIQUE à 10 min ; le toucher ouvre la plus ancienne.
  Deux lignes au plus. **Il remplace « Son coupé »**, comme le bandeau des
  pannes : empilés, la première demande sortait de l'écran (mesuré : 860 px
  sur 844 dans le pire cas de test-admin-ergonomie ; 779 avec le
  remplacement).
- **L'alarme sonne aussi à l'ouverture** pour une non vue (la première
  lecture ne sonnait jamais), une fois par demande et par visite, et
  **sans fabriquer le lecteur de son hors d'un geste** : sur iPhone il
  resterait muet ; il sonne dès le premier appui. Trouvé parce que, dans le
  banc, ce lecteur fabriqué trop tôt ôtait « Son coupé ».
- **La réactivité** (`ela_reactivite`, exploitant) au Registre, même
  période que lui : délais médians jusqu'à la première alerte, la vue, la
  confirmation ; vues en 2 min, confirmées en 5 et 15 min ; jamais vues ;
  alertes en échec. **Piège SQL** : `greatest(0, NULL)` vaut 0 — une
  demande jamais confirmée comptait « confirmée en 0 s » (trouvé par
  l'épreuve). Même famille que `<>` sur NULL.
- Éprouvé : `test-relance-alertes` (154), `test-chien-de-garde` (44 ; 6
  tombent sur l'ancien juge), `test-admin-non-vues` (53, site construit),
  `supabase/tests/alertes-suivi-apres.sql` (vrai PostgreSQL, migration jouée
  deux fois), ergonomie, voyant, alarme.
