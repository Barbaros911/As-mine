# Les erreurs du site remontent — `erreur-client`

Archive du 19 octobre 2026 (audit avant l'exploitation à plusieurs hôtels).
Ce qui vaut aujourd'hui est dans « LE VOYANT DES ALERTES DANS L'ADMIN » de
`CLAUDE.md` ; ce fichier garde POURQUOI.

## Le trou

Le voyant, le chien de garde et le journal des dépôts refusés ne regardent
que ce qui atteint le serveur. Une exception JavaScript AVANT le dépôt — un
champ renommé, une fonction emportée par le cloisonnement (c'est arrivé :
`telValide is not defined`, 29/09/2026, tous les clients bloqués) — n'existait
nulle part tant qu'un client n'appelait pas.

## Ce qui a été posé, et les choix

- **Une fonction `erreur-client`**, sur le modèle de `mesure` : origine
  stricte, corps de 3 Ko au plus, robots écartés, quota 30 par heure et par
  adresse (une page qui boucle s'arrête là), puis écriture par une RPC
  réservée à la clé de service. Déployée `--no-verify-jwt` : la page appelle
  en `text/plain`, sans clé, donc sans requête préalable — un envoi
  `keepalive` qui survit à la fermeture de la page.
- **Ce qui part** : espace (public, hotel, reception, admin), chemin, écran
  actif, message, source (fichier:ligne), appareil, langue. **Ce qui ne part
  jamais** : nom, téléphone, référence, adresse IP, navigateur complet. Les
  suites de six chiffres, les e-mails et les requêtes d'adresse sont masqués
  par la page ET par la fonction — une vieille page en cache ne masque pas
  forcément. L'adresse IP ne sert qu'au quota, hachée avec l'heure.
- **Cinq messages distincts par chargement, un envoi par message** : une
  boucle d'erreurs ne noie ni le serveur ni le quota du client.
- **La table `journal_erreurs_client`** : RLS, rien pour `anon`, lecture
  seule pour un exploitant, écriture par `ela_erreur_client_ecrire` (clé de
  service, bornes refaites, purge à 30 jours au passage). L'admin lit
  `ela_erreurs_client_recentes` : comptes sur 24 h et 1 h, cinq messages les
  plus fréquents avec leur espace. Un non-exploitant est refusé par la
  fonction elle-même.
- **Dans l'admin, une ligne sous le voyant**, cachée tant qu'il n'y a rien
  ou que la migration manque : « 0 erreur » tous les jours ne se lirait plus.
  Lue au rythme du voyant (40 s), jamais plus.
- **Le crochet vit après la définition de `nuage`** dans `index.html` : la
  démo remplace ce bloc par un `nuage` vide, `SUPABASE_URL` y est vide et
  `nuage.actif()` faux — rien ne part de la démo (`verifier-demo` l'exige).
- **La migration ne crée aucun rôle ; c'est le décor `erreurs-client-avant.sql`
  qui pose `service_role` sur le PostgreSQL nu de la CI**, avec `bypassrls`
  comme chez Supabase. Le premier jet le créait DANS la migration, sans
  `bypassrls` : un rôle est commun au cluster, et l'épreuve des prospects,
  jouée après dans sa propre base, faisait un UPDATE sous ce rôle que la RLS
  laissait passer sur zéro ligne — son quota par e-mail tombait (CI du
  19/10, « quota_email »). Reproduit en local dans le même ordre, corrigé,
  rejoué : les deux blocs passent. Ne jamais créer un rôle dans une migration.

## Éprouvé

`test-securite-fonctions` (masquage, origine, robot, bornes, quota, RPC
absente → 503), `test-public-erreurs` (site : masquage, un envoi par message,
cinq au plus, la page reste utilisable), `test-admin-reference` (la ligne de
l'admin compte juste, cachée sans migration), `supabase/tests/erreurs-client-
apres.sql` sur un vrai PostgreSQL (CI, et local le 19/10).

## Les deux pièges du banc

- `charger()` remplace l'environnement Deno à chaque fonction chargée : un
  bloc qui réutilise un gestionnaire chargé plus haut lit les secrets de la
  DERNIÈRE fonction, et tout rend 401 pour une raison sans rapport.
- Playwright consulte la dernière route posée en premier : la route générale
  du serveur doit être posée AVANT la route précise, sinon elle avale tout.
