# La mesure du trafic — l'écran « Trafic » de l'admin (15 octobre 2026)

La règle qui vaut aujourd'hui est dans `CLAUDE.md`, section « LA MESURE DU
TRAFIC ». Ici : l'histoire, les mesures et ce qui a été écarté.

## La demande

Barbaros, 14 octobre 2026 : un prompt complet (« MISSION — ANALYTICS TEMPS
RÉEL ELATRANSFER DANS L'ADMIN »), puis « Fait comme un expert ce que tu pense
le mieu et le plus utile pour moi ». Trois choix lui ont été proposés et il a
délégué : sonde de 10 s plutôt que Supabase Realtime, lien réservation →
référence (jointure à la lecture), écran réservé à l'admin.

## L'audit préalable : rien n'existait

Cherché dans tout le dépôt : `mesure.js`, `page_view`, `utm_`, `gtag`,
`plausible`, `umami`, `sendBeacon`, tables ou vues de mesure, `?src=`.
Aucune occurrence. Le chantier SEO avait laissé trois pages de service, la
Search Console et des données structurées — pas de tracking. La seule
attribution était `bon.provenance` (hôtel partenaire). `tracking-sync.yml`
synchronise des Issues GitHub, rien à voir.

Ce qui a servi de fondation : `journal_depots` (modèle de sécurité :
écriture serveur seule, lecture exploitant, liste fermée, zéro donnée
personnelle), `consommer_quota_reservation` (quota atomique par clé hachée),
`est_admin()`, le patron d'écran Pilotage / Prospects, la sonde de l'admin,
l'en-tête `cf-ipcountry` de Cloudflare (déjà devant le site, puisque
`deposer-course` lit `cf-connecting-ip`).

## Pourquoi pas Supabase Realtime

Il faudrait soit `supabase-js` (le projet n'admet qu'une dépendance
extérieure, Leaflet, servie depuis le dépôt), soit réécrire le protocole
Phoenix à la main. Et Realtime livre UN message par page vue à l'admin, qu'il
faudrait réagréger dans le navigateur — l'inverse de « le serveur calcule ».
Une sonde de 10 s sur `ela_trafic_direct()`, écran ouvert et onglet visible,
c'est six petites requêtes par minute et un compteur WhatsApp qui passe de 12
à 13 en moins de 10 s. Realtime reste une V2 si 10 s ne suffisent plus.

## Pourquoi « google_business » demande `?src=gbp`

Un lien posé sur la fiche Google arrive avec le même référent qu'une
recherche : rien ne les distingue. Le lien de la fiche doit porter
`?src=gbp` — à coller par Barbaros sur sa fiche. Sans ce marqueur, c'est
« google », et c'est honnête. Même règle pour `?src=wa` (un lien partagé sur
WhatsApp sans référent) et `?src=qr` / `flyer`.

## Le budget d'écran : neuf tuiles sur deux rangées

Le menu de l'admin tenait en deux rangées de quatre tuiles
(`minmax(78px,1fr)`), règle de Barbaros du 10/10 (« Corrige tout »).
L'entrée « Trafic » faisait une neuvième tuile, donc une troisième rangée :
`test-admin-ergonomie` tombait (9 tuiles sur 3 rangées ; première demande à
872 px sur 844). Mesuré sur le site construit, Chromium, 9 tuiles :

| minmax | 320 px | 375 px | 390 px | 430 px | tronqué |
|---|---|---|---|---|---|
| 78 px | 3 rangées | 3 | 3 | — | non |
| 64 px | 3 | 3 | **2** (65 px de large) | — | non |
| 60 px | 3 | **2** | **2** | **2** | voir ci-dessous |

Écarté : cacher la tuile sur téléphone (il travaille au téléphone), la ranger
sous le Centre de contrôle (deux appuis pour la chose qu'il veut voir « tout
de suite »), retirer une autre tuile (sa décision, pas la mienne).

## Confidentialité : ce qui a été pesé

L'exemption de consentement pour la mesure d'audience (CNIL) tient à :
finalité limitée à la mesure, pas de recoupement ni de suivi inter-sites,
identifiant ≤ 13 mois, données brutes ≤ 25 mois, possibilité de s'opposer.
Le dispositif : identifiants aléatoires propres au site (30 jours), pas d'IP,
pays seulement, 90 jours de brut, « Ne plus me compter » dans la politique.
Le point surveillé : `detail.ref` relie une session à une course, donc à un
client. La table analytics ne porte que la référence ; la jointure avec
`courses` se fait dans `ela_trafic()` à la lecture, par un admin. Si un jour
on veut zéro lien, on retire `ref` et on perd « quelle source fait des courses
réalisées ».

## Les suites

- `supabase/tests/trafic-apres.sql` (vrai PostgreSQL, CI) : droits, écriture
  et dédup par service_role, lecture admin / agent refusé / anonyme refusé,
  aucun identifiant ni référence dans ce qui sort, rétention. Trois
  falsifications éprouvées (verrou admin retiré, dédup retirée, table ouverte
  à authenticated) : elle tombe les trois fois.
- `test-securite-fonctions.mjs` : 26 contrôles sur la fonction `mesure`.
- `test-mesure.mjs` : le collecteur sur le site construit, de Google à la
  réservation ; panne de la mesure sans effet sur le dépôt.
- `test-admin-trafic.mjs` : l'écran, la sonde 12 → 13, sept largeurs, l'agent.
