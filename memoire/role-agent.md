# Le rôle agent — l'histoire

Ce que le mémo garde : la règle (« LE RÔLE AGENT EST IMPOSÉ PAR LE
SERVEUR — ET L'ACCÈS AGENT EST SUSPENDU »). Ici, comment on y est arrivé.

## 29 septembre 2026 — « valide le rôle agent »

Le diagnostic lu en production (`20260929020000_diagnostic_role_agent.sql`) :
un compte `admin`, un compte `agent_reservation`, et `est_exploitant()`
vraie pour les deux — l'écran cachait les prix, les réglages, le registre et
les factures, mais un appel direct passait. `role_operateur`,
`signaler_presence` et `presences_operateurs` ont été créées directement
dans Supabase et ne sont dans aucune migration du dépôt.

- `20260929030000_role_agent_serveur.sql` pose `est_admin()` et réserve à
  l'admin : l'écriture des prix, forfaits, réglages et codes promo (la
  lecture reste : le calcul du prix en a besoin), les factures de
  commission, les paiements, les instantanés financiers, l'aperçu et
  l'émission de facture, la restauration de sauvegarde.
- **Les trois fonctions ne sont pas recopiées** : la migration relit leur
  définition dans la base et n'y change que le verrou. Les recopier ferait
  revenir une version ancienne du corps.
- `supabase/tests/role-agent.sql` éprouve les deux côtés (agent refusé,
  admin qui passe), en CI. Éprouvé sans la migration, puis sans la policy :
  il tombe les deux fois.
- **L'agent garde TOUT ce qui touche une course**, suppression comprise
  (tranché par Barbaros : « supprimer, créer une course, répondre aux
  clients »). Ce qu'il ne doit pas voir : le chiffre d'affaires, ce que
  rapporte chaque chauffeur, les commissions, le détail financier.
- **Le masquage d'écran ne marchait pas du tout, et personne ne le savait.**
  `agent-role-ui.mjs` cherchait `nuage` et `ouvrirEspace` sur `window` : ils
  vivent dans la portée du script principal. Le script sortait à la
  première ligne, sans erreur — l'agent voyait le registre, les factures et
  les réglages comme l'admin. Mesuré sur le site construit. `index.html`
  expose depuis `window.ELA_NUAGE` et émet `ela:espace` ;
  `test-admin-commission` joue un agent pour de vrai et tombe si l'on
  retire la prise.
- Cachés en plus à l'agent : le bloc « Commission » du bon et le taux du
  carnet. Ce qui est caché n'est pas effacé : enregistrer un bon garde la
  commission posée par l'admin — un contrôle le vérifie.
- Admin v2 exigeait `est_admin()` avant son retrait : il affiche les
  finances, et l'agent pouvait s'y connecter avec son compte.
- **La limite, dite franchement** : l'agent lit les courses (il doit les
  traiter), donc leurs prix. Un agent déterminé pourrait additionner à la
  main via l'API. Aucun écran ne le fait pour lui, et l'argent (factures,
  paiements, commissions globales) est fermé côté serveur.

## 20 octobre 2026 — l'accès agent est suspendu

Barbaros : le compte agent est celui d'un ami ; vu l'activité, il y a très
peu de courses, et il ne veut pas que l'ami voie celles qu'il a réalisées,
sans le vexer. Sa première idée : afficher une raison inventée (« il faut
payer un abonnement pour que l'agent soit fiable »).

**Conseil donné, et suivi : ne pas inventer.** Trois raisons pratiques : il
peut te prendre au mot (« combien ? je paie ma part »), un mensonge se
vérifie (dépôt public, services gratuits), et il existe une raison
technique VRAIE qui bloque honnêtement — la limite ci-dessus. Le message
affiché :

> Espace agent temporairement fermé. Le cloisonnement des données clients côté serveur
> n'est pas encore terminé : un compte agent peut aujourd'hui voir plus
> que ce qu'il devrait. Par sécurité, l'accès est fermé jusqu'à la fin de
> cette étape. Rien à faire de votre côté.

Chaque phrase est vraie ; aucun nom, aucune faute, aucun montant
(`test-admin-suspendu`, contrôle 1c).

### Comment c'est fait

- **Le verrou est le serveur, pas la page.** `operateurs.actif` existait
  déjà et `est_exploitant()` l'exige ; `20261020000000_suspendre_acces_agent.sql`
  passe à faux les comptes `role = 'agent_reservation'` (jamais un admin),
  **s'arrête s'il n'en trouve aucun** (on saurait alors que le rôle n'est
  pas celui qu'on croit, au lieu de croire la suspension faite), et repose
  le droit « lire son propre droit » sur `operateurs` — même texte que
  `20260915_operator_auth_server.sql`, pour que la page puisse lire le
  motif même si cette policy manquait en production.
  `20261020000001_rouvrir_acces_agent.sql` fait l'inverse, à ne lancer que
  sur décision.
- **La page lit le motif AVEC la session, avant de l'effacer**
  (`nuage.motifRefus()`, `harden-exploitant-auth.mjs`) : une ligne
  `actif = false` → le bloc `#accesSuspendu` ; toute autre réponse (pas de
  ligne, 403, pas de session) → le message ordinaire « vérifiez vos
  identifiants ». Le motif n'explique que : c'est `est_exploitant()` qui
  tranche, et le bloc n'apparaît qu'après un mot de passe accepté.
- **Un espace déjà ouvert est revérifié au retour sur l'onglet.** Trouvé
  par la suite, pas en relisant : une fois « oui » rendu, la vérification
  à 15 s s'arrêtait (elle ne vaut que pendant une panne), et un compte
  suspendu entre-temps gardait son écran jusqu'au rechargement — or sur un
  téléphone on ne recharge pas, on revient sur l'application. Une question
  d'une ligne par retour ; seul un « non » ferme (`fermerAcces`), une panne
  ne fait rien, comme partout dans l'admin.
- **Éprouvé contre l'ancien code** : 10 contrôles sur 28 tombent, en
  nommant le défaut (bloc caché, message ordinaire affiché, motif jamais
  lu, espace resté ouvert). Le premier jet plantait au lieu de tomber : une
  mesure de rectangle sur un élément absent attendait 30 s — un délai de
  2 s et un repli à `null`.
- `sw.js` CACHE v193 (`/ela-admin/` est dans le SHELL).

---

## Archivé de CLAUDE.md le 22/10/2026

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## SEUL BARBAROS SUPPRIME UNE COURSE, QUEL QUE SOIT SON ÉTAT

20/10/2026, Barbaros : « supprimer les courses effectuées ou non », puis « c'est
seulement moi qui peut supprimer ». `20261020020000` réserve le DELETE sur
`courses` à `est_admin()` (toutes les anciennes policies lues dans
`pg_policies`) et passe `attributions_chauffeur` (Admin v2) en cascade : elle
bloquait l'effacement d'une course attribuée. **À appliquer après la fusion.**
Ni l'agent ni la réception ne suppriment ; ne pas le rouvrir sans lui.
`supabase/tests/suppression-admin.sql`, `test-admin-commission`.

## LE RÔLE AGENT EST IMPOSÉ PAR LE SERVEUR — ET L'ACCÈS AGENT EST SUSPENDU

`est_admin()` (`20260929030000_role_agent_serveur.sql`) réserve à l'admin
l'écriture des prix, les factures, les paiements, les finances et la
restauration ; l'agent garde ce qui traite une course, SAUF la suppression.
L'écran cache le reste par `window.ELA_NUAGE` et l'événement
`ela:espace` (`agent-role-ui.mjs`). **La limite, dite franchement** : l'agent
lit les courses, donc leurs prix ; le cloisonnement serveur n'est pas fini.
**L'ACCÈS AGENT EST SUSPENDU** (20/10/2026, Barbaros : peu de courses, et
il ne veut pas que son ami voie celles qu'il a réalisées) :
`20261020000000_suspendre_acces_agent.sql` passe le compte à `actif = false`
— le seul verrou, `est_exploitant()` le refuse partout — **à appliquer après
la fusion**. L'écran de connexion lit sa propre ligne `operateurs` et dit la
vraie raison (cloisonnement des données clients pas terminé), **jamais une
histoire d'argent** ; un espace déjà ouvert est revérifié au retour sur
l'onglet. Rouvrir : `20261020000001_rouvrir_acces_agent.sql`.
`test-admin-suspendu`. Histoire : `memoire/role-agent.md`.
