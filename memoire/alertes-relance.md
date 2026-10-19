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
