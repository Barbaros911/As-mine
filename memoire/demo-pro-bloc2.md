# Démo professionnels — bloc 2 : le serveur des prospects

> Ouvert le 8 octobre 2026. Mission « Démo professionnels » validée par
> Barbaros ; trois sessions en parallèle (bloc 1 = /professionnels/, bloc 2 =
> ce serveur, bloc 3 = /demo/hotel/). Le bloc 6 résumera ici dans
> `CLAUDE.md`. Ce fichier dit ce qui est vrai côté serveur et pourquoi.

## Ce qui existe

- **Table `prospects`** (`20261008000000_prospects.sql`). Rien pour anon.
  L'admin (`est_admin()`, pas l'agent) LIT, et ne MODIFIE que `statut` et
  `note` (droits par colonne). Aucune suppression depuis le site. L'empreinte
  du jeton et son expiration ne sont lisibles par aucun compte connecté.
  **Aucune colonne d'adresse IP** — une épreuve le vérifie.
- **`domaine_pro` est une colonne GÉNÉRÉE** (`prospect_domaine_pro()`) : la
  liste des messageries grand public vit dans la base, une seule fois. La
  fonction ne la renvoie jamais au navigateur ; l'alerte Telegram dit
  « professionnelle » ou « grand public ».
- **Trois portes `security definer`, exécutables par service_role seul** :
  `ela_prospect_creer`, `ela_prospect_ouvrir`, `ela_prospect_confirmer`.
- **Fonction `demande-demo`** (`--no-verify-jwt`), contrat de la mission tenu
  à l'identique. Précision pour les blocs 3 et 4 : **`expire` est une date
  ISO 8601 en UTC** (« 2026-10-15T09:12:00.000Z »), dans « demander » comme
  dans « ouvrir ». Un 413 `{erreur:"taille"}` existe au-delà de 4 Ko, et un
  403 `{erreur:"origine"}` sans l'origine elatransfer.com.
- **`deposer-course` refuse (403)** toute course dont la provenance ou la clé
  partenaire commence par « demo » — accents et casse ignorés — AVANT le
  quota et avant toute lecture en base. C'est la seconde défense : la page de
  démo ne doit pas compter dessus pour se taire.
- **`_shared/session-signee.ts`** : la signature HMAC, sortie de
  `hotel-session.ts` pour servir aussi à la démo. Le format est INCHANGÉ ;
  une épreuve fabrique une session de réception avec `node:crypto` selon
  l'ancien code et exige qu'elle passe encore — sinon chaque tablette de
  comptoir aurait été déconnectée à la mise en ligne.

## Pourquoi c'est ainsi

- **Le quota par e-mail est compté DANS LA TABLE, pas par
  `consommer_quota_reservation`.** Ce compteur s'efface au bout de 70 minutes :
  « 3 par jour » y serait devenu « 3 par heure et quart ». La base compte les
  demandes des 24 dernières heures sous un verrou par adresse (exact même
  sous deux demandes simultanées). Les quotas par IP, eux, passent bien par
  `consommer_quota_reservation` (clé = empreinte de usage + IP + heure).
- **Valeurs proposées** : 5 demandes/heure/IP · 3/24 h/e-mail · 30 sessions
  FAUSSES/heure/IP sur « ouvrir » (une session juste ne consomme rien : la
  démo s'ouvre à chaque visite) · 20 confirmations/heure/IP. À revoir avec
  Barbaros si elles gênent.
- **Ordre de « demander »** : champ piège → champs (400) → quota IP (429) →
  Turnstile (403) → base (dont quota e-mail, 429) → alerte et e-mail →
  session. Le quota passe AVANT Turnstile : un robot qui insiste ne nous fait
  pas appeler Cloudflare. Une panne de Cloudflare rend 503, jamais « robot ».
- **Le champ piège** rempli (ou absent) rend un 200 qui a l'air normal, avec
  une session factice qui n'ouvre rien. Rien n'est écrit, ni envoyé, ni
  compté.
- **Le jeton de confirmation** : 32 octets tirés au sort, seule l'empreinte
  SHA-256 en base, effacée par la même instruction qui pose la date (usage
  unique), 48 h.
- **Une « visite » compte une fois par demi-heure** : un rechargement de la
  démo n'est pas un retour du prospect.
- **Chaque demande crée une ligne**, même avec une adresse déjà connue :
  réécrire la ligne existante aurait permis à quiconque connaît l'adresse
  d'un prospect de changer son téléphone — et Barbaros rappellerait le
  mauvais numéro. L'admin (bloc 5) regroupera par adresse s'il le faut.
- **Conservation : 3 ans après le dernier contact** (`dernier_contact_le`,
  posé par la base). Pas de purge automatique ; la requête est écrite en tête
  de la migration. La politique de confidentialité (bloc 4) doit dire la
  même durée.

## Épreuves

- `supabase/tests/prospects.sql` + `prospects-apres.sql` (vrai PostgreSQL,
  privilèges par défaut de Supabase reposés, migration appliquée deux fois),
  puis `prospects-vue-sonde.sql` : une vue lisible par anon sur les prospects
  fait ÉCHOUER la migration rejouée. Branchées dans `admin-v2-regression.yml`,
  à côté du Pilotage. Éprouvées contre dix-sept migrations faussées.
- `test-securite-fonctions.mjs` : robot, piège, champs, quotas, sessions
  falsifiée / expirée / d'un an / autre secret / session de réception,
  jeton réutilisé / inconnu, ce qui sort et ne sort pas (domaine_pro, e-mail,
  jeton), Telegram en panne, Resend absent, refus « demo » dans
  `deposer-course`. Éprouvée contre vingt-deux falsifications de la fonction.
  `admin-regression.yml` se déclenche désormais aussi sur
  `supabase/functions/**` : changer une fonction seule ne relançait pas son
  épreuve.

## Les gestes après fusion (Barbaros)

1. Lancer le workflow « Appliquer une migration Supabase » avec le fichier
   `20261008000000_prospects.sql`.
2. Poser deux secrets dans Supabase (secrets des fonctions) :
   `DEMO_SESSION_SECRET` (une longue chaîne tirée au sort) et
   `TURNSTILE_SECRET` (la clé secrète du widget Turnstile, chez Cloudflare).
   Sans eux, la fonction répond 503 et rien ne passe.
3. Le déploiement de `demande-demo` se fait seul à la fusion (`fonctions.yml`).
   `RESEND_CLE` / `EMAIL_EXPEDITEUR` sont facultatifs : sans eux, aucun
   e-mail ne part et la démo s'ouvre quand même.
