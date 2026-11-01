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
  **Le garde `current_user not in ('service_role','postgres')` du premier jet
  était inerte** (relecture indépendante, 19/10) : dans une fonction
  `security definer`, `current_user` est le propriétaire, donc toujours
  `postgres` ; `session_user` ne vaut pas mieux (PostgREST entre en
  `authenticator`). Retiré : la seule frontière est le droit d'exécution,
  et le bloc final de la migration la vérifie. Le même motif inerte traîne
  dans `20260916103000_hotel_server_pricing.sql` et
  `20260916104500_hotel_snapshot_origin_fix.sql` (`… and auth.role() <>
  'service_role'`) : là aussi, c'est le `grant execute` qui garde — à ne pas
  lire comme une seconde défense.
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

## Les dépôts ratés côté téléphone et la version de la page (1er novembre 2026)

Audit fiabilité et observabilité, demandé par Barbaros (« tu fais tout comme
un expert »). Le trou mesuré : `journal_depots` n'écrit que ce que le serveur
a **refusé**. Un téléphone qui n'a jamais joint le serveur — délai de 8 s
dépassé dans un hall d'aéroport, réseau coupé, accusé illisible, référence
différente dans l'accusé — ne laissait rien : le client lisait « Envoi à
vérifier », et personne d'autre ne l'apprenait. Exactement « le client dit que
ça n'a pas marché, et on ne sait pas pourquoi ».

- **`nuage.causeDepot`** nomme chaque échec (« délai de 8 s dépassé »,
  « réseau », « http 503 », « accusé refusé », « accusé illisible », « référence
  différente dans l'accusé », « référence déjà prise après deux tirages »,
  « inconnu du serveur après rechargement », « vérification muette après
  rechargement »). La passerelle de construction pose les causes de l'accusé.
- **`signalerDepot`** envoie à `erreur-client`, au verdict seulement : « dépôt :
  échec (cause) Réf. », puis « dépôt : reçu après (cause) Réf. » si la reprise,
  le « Réessayer » ou le rechargement aboutit. Un succès direct n'envoie rien.
  Même porte, même masquage, même quota, cinq messages par chargement.
- **La référence y va, et elle seule** — décision prise sous le mandat de
  Barbaros, à l'inverse de la règle du 19/10 qui l'excluait : sans elle, on
  ne peut pas rapprocher l'appel d'un client de sa ligne, et `journal_depots`
  la porte déjà côté serveur. Ni nom, ni téléphone, ni adresse. **Le dernier
  tiret devient un point médian** (`ELA-26-11·K7QPM`) : le masque des
  téléphones (six chiffres séparés d'un tiret au plus) aurait mangé une
  référence dont les cinq signes commencent par deux chiffres, ici comme sur
  le serveur. On cherche par les cinq signes.
- **La version de la page** : `construire.sh` pose `<meta name="ela-version">`
  (commit court · cache du service worker, les deux valeurs de
  `version.json`) avant de construire les espaces d'hôtel, donc sur toutes
  les pages du moteur. Chaque erreur la porte ; la migration
  `20261101000000` ajoute la colonne, le résumé de l'admin la montre à côté
  du message (la plus récente, jamais une ligne par version). Une version mal
  formée devient NULL, jamais un refus.
- **Côté serveur, un 409 à l'écriture est relu** (`deposer-course`) : la
  contrainte UNIQUE ne se lève qu'une fois la ligne concurrente écrite ; si
  elle porte la même empreinte, c'est notre demande, rendue « rejoué » avec
  le N° court. Avant, ce 409 partait au site, qui rejouait deux fois puis
  tirait une autre référence : sur un serveur lent, deux courses pour une
  demande. Deux dépôts identiques en même temps rendent donc 201 et 200
  « rejoué », plus jamais 201 et 409.

Éprouvé : `test-public-depot-fiable` (91 contrôles, dont chaque mode d'échec
et sa cause, la version sur le site construit, aucune identité dans la
trace), `test-public-erreurs` (le champ part), `test-securite-fonctions`
(409 relu : même empreinte → 200, autre → 409 journalisé),
`supabase/tests/erreurs-client-apres.sql` sur PostgreSQL 16 (tombe sans la
migration : la colonne manque).
