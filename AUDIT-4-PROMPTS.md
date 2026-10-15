# Audit final des quatre prompts internationaux — 15 octobre 2026

Mission : auditer, prouver et finaliser les quatre prompts (pages
internationales, indexation Google, suivi commercial et partenaires,
conversion du parcours client étranger). Ce fichier est le rapport rendu, avec
ses preuves. Il complète `SEO-INTERNATIONAL.md` (Prompt 1), `memoire/
seo-indexation.md` (Prompt 2) et `SEO-AUTORITE.md` (Prompt 3).

**Conventions de preuve.**
- **[P]** lu dans un journal GitHub (publication, monitoring, migration) : la
  seule trace de la production accessible d'ici — `elatransfer.com` est
  injoignable depuis la machine de travail (403 du proxy, mesuré).
- **[C]** mesuré sur le site **construit** par `construire.sh` et servi en
  local, ou sur un PostgreSQL 16 local qui rejoue les migrations.
- **[D]** lu dans le dépôt.
- Ce qui n'est ni [P] ni [C] ni [D] n'est pas affirmé.

État du dépôt audité : `main` = `f6fb64a` (fusion de la PR #357, 15/10/2026
18 h 32 UTC) ; branche de travail `claude/elatransfer-audit-final-4prompts-mbv1q7`,
partie de ce commit. Aucune modification locale non validée au départ.

---

## A. Les quatre prompts

| | Prompt 1 — pages internationales | Prompt 2 — indexation Google | Prompt 3 — suivi commercial, partenaires | Prompt 4 — conversion |
|---|---|---|---|---|
| Objectif | cinq pages `/en/`, moteur en anglais, origine mesurée | robots, plan du site, canoniques, hreflang, données structurées jugés avant et après publication | lien `?via=` par partenaire, compteur par source, registre, fiche hôtels, audit d'autorité | parcours du client étranger de la page à la demande, frictions, mesure |
| PR / commits | #355 (`8c8328f`, `a7e4712`, `b5e5a93`, `4471540`, fusion `f69637b`) | #356 (`5714f7a`, fusion `869f2bf`) | #357 (`fac9f0a`, `b54853f` … `3b2e04b`, fusion `f6fb64a`) | **aucune PR, aucun commit, aucune Issue, aucune branche** (recherche : `git log --all --grep`, Issues, PR, branches distantes). Réalisé par cet audit : `test-parcours-en.mjs`, correctifs ci-dessous |
| Code | [D] 5 pages `en/**/index.html`, `landing.css`, `mesure.js`, `?lang=`/`?vers=`/`?src=` dans `index.html`, `cp -r en` dans `construire.sh` | [D] `.github/scripts/seo-indexation.mjs`, appelé par `test-seo-en` et `verifier-production` | [D] `20261015000000_liens_suivi.sql`, `mesure.js` (via), `index.html` (registre « Liens des partenaires »), `deposer-course` (`resoudreLien`), `demande-demo` (`poserLien`), `commercial/fiche-hotels.html` | [D] correctifs de cette branche (bon de réservation), suite `test-parcours-en.mjs` (85 contrôles) |
| Tests | [C] `test-seo-en` 354, `test-prix-pages` 47, `test-tarifs-serveur` 6, `test-nouveau-langues` 28 | [C] `test-seo-en` 354 (dont 14 falsifications du juge) | [C] `test-liens-suivi` 56, `test-securite-fonctions` 187, `test-pro-formulaire` 143, `test-pro-page` 88 ; SQL `mesure`, `liens-suivi-apres`, `prix-pages-apres`, `prospects-via-apres` rejoués ici | [C] `test-parcours-en` 85, `test-nouveau-serveur` 92 (+4), `test-nouveau-bon` 41, `test-public-formulaire` 114, `test-public-textes` 39 |
| Production | [P] monitoring n° 192 (15/10, 18 h 35 UTC) sur `f6fb64a` : 5 pages `/en/` en 200, indexables, bonne page ; 65 contrôles verts | [P] même passage : robots.txt (6 règles), plan (10 adresses), 10 pages canonique sur elles-mêmes, titres/descriptions/H1 uniques, hreflang réciproques | [P] `/version.json` en ligne = `f6fb64a`, cache v176 ; migration appliquée (ci-dessous). **Non prouvé en ligne** : qu'une visite `?via=` est comptée (il faudrait lire la base) | [P] le tunnel public ouvert pour de vrai par le monitoring (champs, bouton, 0 erreur JS). **Les correctifs de cette branche ne sont pas publiés.** |
| Migrations | [P] `20261014000000` appliquée le 14/10 22 h 05 (HTTP 201, run 35) ; `20261014010000` le 14/10 22 h 06 (201, run 36) | aucune | [P] `20261015000000` appliquée le 15/10 18 h 33 (201, run 37), 1 min après la fusion ; ordre respecté ; [C] rejouer `20261014000000` ensuite est refusé par sa garde | aucune |
| Défauts | aucun bloquant ; P2 : libellés d'aéroports en français dans le moteur anglais ; bandeau B2B en tête du moteur pour un touriste | P2 : redirections 307 (temporaires) des anciennes `.html` ; soft 404 ; `www` ne répond pas (DNS) | P2 : les compteurs « vues / Book » sont gonflables par un robot (clé publique, accepté et documenté) ; aucune relecture des pages [R] de `SEO-AUTORITE.md` possible d'ici | **P1** : bon de réservation — note « Si WhatsApp ne s'est pas ouvert » (mécanisme retiré le 4/10) et « Demande reçue » affiché sur un dépôt échoué |
| Corrections | aucune | aucune | aucune | A-01 et A-02 corrigés (voir B), verrou dans `textes-interdits.mjs` |
| Reste à vérifier | Search Console (indexation réelle des 10 adresses) ; message WhatsApp prérempli par page, à confirmer par Barbaros | Search Console ; décision sur les 307 si Google garde les `.html` | lire en base qu'une visite `?via=` compte (SQL de lecture seule à écrire, ou premier lien réel) ; actions extérieures du plan (SIRET d'abord) | validation des deux libellés par Barbaros ; fusion, puis monitoring |
| **Conclusion** | **TERMINÉ ET PROUVÉ** | **TERMINÉ ET PROUVÉ** (indexation Google elle-même : **BLOQUÉ PAR UN ACCÈS** — Search Console) | **TERMINÉ CÔTÉ CODE, PRODUCTION NON CONFIRMÉE** pour le comptage `?via=` ; l'audit d'autorité (actions extérieures) reste **NON TERMINÉ**, comme `SEO-AUTORITE.md` le dit | **PARTIELLEMENT TERMINÉ** : audit fait, correctifs et suite écrits sur cette branche, non fusionnés |

---

## B. Anomalies

| Id | Niveau | Où | Description | Conséquence | Preuve | Correction | Après |
|---|---|---|---|---|---|---|---|
| A-01 | **P1** | `index.html` (`renvoi_note`, FR et EN), en ligne depuis le 4/10 | La note sous chaque bon disait « Si WhatsApp ne s'est pas ouvert, ou si vous n'avez pas appuyé sur envoyer, renvoyez-le d'ici » / « If WhatsApp did not open… ». Plus aucune application ne s'ouvre au clic depuis le 4/10/2026 (option A). | Le client cherche une application qui n'est jamais venue ; un libellé qui décrit un mécanisme retiré. Aucune suite ne le lisait, `textes-interdits.mjs` ne le connaissait pas. | [C] capture du bon FR/EN sur le site construit ; `grep` sur `site/` : présent dans 7 pages publiées | Texte : « Vous pouvez aussi nous envoyer votre demande sur WhatsApp. » / « You can also send us your request on WhatsApp. » ; les deux anciennes phrases entrent dans `textes-interdits.mjs` (construction ET production) | [C] `test-nouveau-serveur` +1 contrôle ; `test-parcours-en` ; construction verte (32 fichiers publics sans texte interdit) |
| A-02 | **P1** | `index.html` (`remplirBon`, `afficherEtatEnvoi`) | Dépôt refusé par le serveur : la tête du bon disait « Demande reçue — Nous vérifions la disponibilité d'un chauffeur… » pendant que l'écriteau rouge disait « votre demande n'a pas pu nous être transmise ». | Deux phrases contraires sur l'écran où le site a déjà « inventé une panne » (CLAUDE.md) ; le client anglais lit « REQUEST RECEIVED » et ferme la page. | [C] capture et lecture DOM, FR et EN, dépôt 503 simulé | `jugerTeteBon()` : « Demande non transmise — Votre demande ne nous est pas encore parvenue. » / « Request not sent — Your request has not reached us yet. » tant que le dépôt a échoué ; « Demande reçue » revient dès que la reprise aboutit ; seul le bon de la demande en cours est concerné. **Libellés à valider par Barbaros.** | [C] `test-nouveau-serveur` +3 contrôles (échec, reprise réussie) ; `test-parcours-en` |
| A-03 | P2 | moteur `?lang=en` | Les lieux connus gardent leur libellé français (« Terminal 2E — Aéroport Roissy-Charles de Gaulle », « Orly 4 — Aéroport de Paris-Orly ») sur l'écran des prix, le récapitulatif et le bon anglais. | Compréhensible (noms propres), mais le bon anglais mélange les langues. | [C] captures de `test-parcours-en` | non corrigé : table `AEROPORTS` à traduire, décision d'écriture | — |
| A-04 | P2 (CRO) | moteur, premier écran | Un touriste qui appuie sur « CDG → Paris » depuis `/en/` arrive sur le bandeau « Chauffeur transfers, organised end to end. Hotels, agencies, businesses: your own booking page… » avant le formulaire (la liste des terminaux est déjà ouverte sous le bandeau). | Le message B2B précède le geste B2C ; le positionnement est une décision de Barbaros (6–8/10). | [C] capture après « Book » | non corrigé : proposer, pour une arrivée avec `src=en-*`, de faire défiler jusqu'au formulaire ou de masquer la ligne B2B — à trancher | — |
| A-05 | P2 (SEO) | hébergement Cloudflare | Anciennes adresses `.html` → 307 (temporaire) ; adresse inconnue → accueil en 200 (soft 404). | Signal faible pour Google ; connu depuis le Prompt 1, réglage par défaut gardé faute de symptôme. | [D] `memoire/seo-indexation.md` (mesuré avec `wrangler dev`) | aucune ; à revoir si Search Console garde les `.html` | — |
| A-06 | P2 (SEO) | DNS | `www.elatransfer.com` ne résout pas. | Un partenaire qui écrit « www » fait un lien mort. | [D] `SEO-AUTORITE.md` ; non mesurable d'ici (DNS bloqué) | à Barbaros, Cloudflare DNS | — |
| A-07 | P2 (doc) | `PROJECT_STATE.md` | « Seul le comptoir d'hôtel règle encore à bord » contredit CLAUDE.md (plus aucun règlement à bord, comptoir compris, 11/10). | Une note qui vieillit. | [D] `grep`, recoupé avec `CLAUDE.md` et `memoire/paiement-lien.md` | ligne corrigée | — |
| A-08 | P2 (mesure) | `ela_mesurer` | Un robot qui exécute la page peut gonfler « vues » et « Book » d'un lien partenaire (clé publique). | Les chiffres AVANT la demande sont indicatifs ; les demandes et l'argent viennent des courses, reconnues côté serveur. | [D] migration (documenté et accepté) ; [C] `liens-suivi-apres.sql` | aucune ; la ligne du registre distingue déjà vues / demandes / réalisées / euros | — |

Aucun P0.

---

## C. SEO international, page par page

Source : monitoring n° 192 du 15/10/2026 sur `f6fb64a` [P], recoupé avec
`test-seo-en` sur le site construit [C] et la lecture du HTML [D].

| URL | HTTP | Indexable | Canonique | hreflang | Titre | Description | H1 | Données structurées | Plan | Production | Google |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | oui | elle-même | fr, en, x-default | unique | unique | unique (5 `<h1>`, un visible) | `#organisation` | oui | ✓ | non prouvé |
| `/transfert-cdg-paris` | 200 | oui | elle-même | fr, en, x-default | unique | unique | unique | Service, `@id` sans `.html` | oui | ✓ | non prouvé |
| `/transfert-orly-paris` | 200 | oui | elle-même | fr, en, x-default | unique | unique | unique | Service | oui | ✓ | non prouvé |
| `/chauffeur-prive-paris` | 200 | oui | elle-même | aucun (pas d'équivalent) | unique | unique | unique | Service | oui | ✓ | non prouvé |
| `/professionnels/` | 200 | oui | elle-même | aucun | unique | unique | unique | lisibles | oui | ✓ | non prouvé |
| `/en/` | 200 | oui | elle-même | en, fr, x-default | « Paris Airport Transfers with a Private Chauffeur » | unique | « Private airport transfers in Paris » | lisibles | oui | ✓ | **indexée** (inspection d'URL, 16/10/2026 01 h 03) |
| `/en/cdg-airport-transfer-paris/` | 200 | oui | elle-même | en, fr, x-default | « CDG Airport Transfer to Paris – Private Chauffeur » | unique | « Private transfer between CDG Airport and Paris » | Service (Airport CDG, City Paris) + fil d'Ariane | oui | ✓ | non prouvé |
| `/en/orly-airport-transfer-paris/` | 200 | oui | elle-même | en, fr, x-default | « Orly Airport Transfer to Paris – Private Chauffeur » | unique | « Private transfer between Orly Airport and Paris » | Service + fil d'Ariane | oui | ✓ | non prouvé |
| `/en/disneyland-paris-airport-transfer/` | 200 | oui | elle-même | aucun (pas d'équivalent FR) | « Disneyland Paris Transfer from CDG or Orly » | unique | « Private transfer to Disneyland Paris from CDG or Orly » | Service + fil d'Ariane | oui | ✓ | non prouvé |
| `/en/cdg-orly-transfer/` | 200 | oui | elle-même | aucun | « CDG to Orly Transfer (and Orly to CDG) – Private Car » | unique | « Private transfer between CDG and Orly airports » | Service + fil d'Ariane | oui | ✓ | non prouvé |

- `robots.txt` : fichier réel, `Allow: /`, écarte `?h=`, `?reception=`,
  `/demo/`, `?lang=` ; déclare le plan [P].
- `sitemap.xml` : 10 adresses https, sans doublon, aucune page privée, aucune
  `.html` [P][D]. `/demo/` : `noindex` par balise et en-tête [P].
- Les données structurées ne portent ni note, ni avis, ni prix, ni adresse
  postale — rien d'inventé [D].
- **Google** : la colonne « non prouvé » le restera tant que personne n'ouvre
  Search Console (compte `orucburak001`).
  **Mise à jour du 15/10/2026, 22 h 14 (captures de Barbaros)** : Sitemaps →
  « Traitement du sitemap réussi », dernière lecture 15/10/2026, **10 pages
  découvertes** (le compte du plan). Historique d'inspection : les deux pages
  françaises CDG et Orly et quatre pages `/en/` visibles ; `/en/` elle-même
  n'apparaît pas sur la capture, coupée en haut, donc non prouvée. Une
  demande d'indexation n'est pas une indexation : la colonne reste « non
  prouvé » jusqu'au rapport « Pages ».
  **16/10/2026, 01 h 03 (capture de Barbaros)** : inspection de
  `https://elatransfer.com/en/` → « Cette URL est sur Google », « La page est
  indexée ». Première indexation prouvée ; les six autres adresses restent à
  relire dans « Pages ». Gestes et attendus :
  `memoire/seo-indexation.md`. Une recherche `site:` n'est pas une preuve.
- **Performance** (laboratoire, site construit, réseau 1,6 Mbit/s + 150 ms,
  processeur ×4, iPhone 390 px, polices et serveur coupés) [C] :

  | Page | FCP | LCP | chargée | CLS | poids origine |
  |---|---|---|---|---|---|
  | `/en/` | 0,58 s | 0,58 s | 0,60 s | 0 | 62 Ko, 4 fichiers |
  | `/en/cdg-airport-transfer-paris/` | 0,52 s | 0,52 s | 0,58 s | 0 | 62 Ko |
  | `/en/disneyland-paris-airport-transfer/` | 0,56 s | 0,56 s | 0,59 s | 0 | 63 Ko |
  | `/transfert-cdg-paris` | 0,46 s | 0,81 s | 0,80 s | 0 | 52 Ko |
  | `/` (le moteur) | 1,75 s | 3,66 s | 4,15 s | 0 | 769 Ko, 12 fichiers |

  Aucune erreur JavaScript sur les cinq pages à 390 et 1280 px. **Aucune
  donnée terrain** (Core Web Vitals réels) : le site n'a pas de mesure
  utilisateur et CrUX n'est pas accessible d'ici. Le moteur (769 Ko, photo
  du bandeau) reste le poste lourd du parcours : c'est la page que « Book »
  ouvre.

---

## D. Suivi commercial, partenaires, Supabase

**Migrations** (journal du workflow « Appliquer une migration Supabase ») [P] :

| Fichier | Appliquée | Run | Réponse | Rejouable |
|---|---|---|---|---|
| `20261014000000_mesure_acquisition.sql` | 14/10/2026 22 h 05 UTC | 35 | 201 | **plus jamais** après `20261015000000` : sa garde s'arrête avant d'écrire (rejeu refusé, mesuré sur PostgreSQL local) |
| `20261014010000_prix_pages.sql` | 14/10/2026 22 h 06 UTC | 36 | 201 | oui, sans donnée |
| `20261015000000_liens_suivi.sql` | 15/10/2026 18 h 33 UTC | 37 | 201 | oui (`if not exists`, droits retirés puis rendus) |

Ordre réel = ordre des noms. Aucune double application constatée. Le dépôt n'a
pas de registre `schema_migrations` (connu, `CLAUDE.md`) : la preuve est le
journal du workflow, et elle est là pour les trois.

Épreuves SQL rejouées ici sur PostgreSQL 16 [C] : `mesure-apres` (migration
appliquée deux fois), `liens-suivi-apres` (après la mesure, deux fois, une
ligne « avant-migration » conservée), rejeu de `20261014000000` refusé,
ancienne `ela_mesurer(text,text)` absente, `prix-pages-apres`,
`prospects-via-apres` — toutes passent.

**Le paramètre `via`**, scénario par scénario (`test-liens-suivi` 56 et
`test-parcours-en`, site construit) [C] :

| Scénario | Résultat |
|---|---|
| lien valide `?via=hotel-exemple` | visite comptée avec la source, code effacé de l'adresse, porté par tous les liens internes (jamais `tel:`, `mailto:`, WhatsApp, ancres), demande déposée avec `via` ; le serveur ne garde le code que s'il existe dans `liens_suivi` |
| code inconnu | la page l'envoie, le serveur l'ignore : visite comptée sans source, demande sans partenaire (SQL `liens-suivi-apres`) |
| code mal formé (`Hôtel Exemple<script>`) | jamais envoyé, jamais recopié dans « Book » |
| paramètre absent | la page envoie exactement ce qu'elle envoyait avant |
| panne de la base / compteur (500) | la réservation part et le bon s'affiche ; la mesure n'est jamais attendue |
| navigation entre plusieurs pages | le code suit chaque lien interne jusqu'au moteur |
| demande de démo | `prospects.via` posé par `demande-demo` (service role), lisible par l'admin seul |
| réservation depuis une page anglaise | provenance « Site anglais · CDG ↔ Paris », langue `en`, `via` vide sans lien |
| réservation depuis une page française | provenance `fr-cdg` / `fr-orly` / `fr-chauffeur` (mêmes mécanismes, `mesure.js` chargé) |
| accès direct | aucune source, aucune origine |
| robot | rien n'est compté, liens laissés propres |

**Registre « Liens des partenaires »** [D][C] : une seule fenêtre de 30 jours
(compteur serveur sur 30 jours ; demandes, réalisées et euros sur la date de la
COURSE ; démos sur leur date). Vues, « Book », appels, WhatsApp, moteur ouvert
viennent du compteur ; demandes = courses portant le code ; réalisées = statut
`realisee` seulement ; euros = `bilan(faites)` des seules réalisées ; les
courses d'essai sont exclues ; une course d'il y a 40 jours ne compte pas
(contrôle dédié). Un clic n'est jamais une demande, une demande jamais une
course, un montant demandé jamais un encaissement.

**Sécurité** [D][C] :
- `liens_suivi` : RLS, lecture et création réservées à `est_admin()`, aucun
  droit `anon`, aucune suppression ; la liste des partenaires ne sort pas.
- `mesures_acquisition` : aucune policy, aucun droit direct ; `ela_mesurer`
  (anon) n'ajoute que 1, formats fermés, 60 pages par jour au plus ; lecture
  par `ela_mesures_acquisition` / `ela_mesures_liens` (admin seul).
- `prix_pages_publics` : vue en lecture seule pour anon, aucune commission
  exposée ; la migration refuse toute vue modifiable.
- `deposer-course` : le bon reçu est reconstruit champ par champ (`propre`),
  `via` n'y entre que par `resoudreLien` (lecture serveur de `liens_suivi`) ;
  une affiche ou une réception d'hôtel garde sa provenance.
- Aucune donnée personnelle de plus : ni cookie, ni stockage, ni identifiant ;
  politique de confidentialité FR/EN à jour (15/10).
- Risque de mauvaise attribution : une adresse `?via=` partagée ensuite
  n'attribue rien (code effacé à l'arrivée) ; un code inventé n'est jamais
  créé. Risque de perte : une visite avec `via` entre la publication et la
  migration n'était pas comptée — la migration a suivi la fusion d'une minute.

---

## E. Conversion — le client étranger

**Étapes et ce qui a été mesuré** (site construit, iPhone 390 × 844 et
1280 px, serveur simulé, aucune course réelle) [C] — `test-parcours-en.mjs`,
85 contrôles :

1. **Page d'entrée** : H1, deux sens, Call, WhatsApp, barre fixe Book / Call /
   WhatsApp ; premier bouton au premier écran et sous le doigt
   (`elementFromPoint`) ; aucun débordement ; 28 liens internes, tous en 200.
2. **« Book »** : moteur ouvert en anglais, langue mémorisée, départ
   prérempli, liste des terminaux ouverte, paramètres effacés de l'adresse,
   « moteur ouvert » compté pour la page.
3. **Trajet** : une recherche d'adresse muette dit « No address found — send
   it as typed » plutôt que rien ; les lieux connus se choisissent.
4. **Prix** : berline 140 € et van 230 € pour 48 km (2,90 et 4,70 €/km,
   arrondi à la dizaine : conformes à la grille) ; en anglais ; changer de
   langue ne change pas un centime.
5. **Récapitulatif** : paiement par lien avant le départ expliqué, ni e-mail
   ni carte demandés ; confirmer sans nom ni téléphone est refusé avec un
   message visible et le champ au focus ; numéro étranger → WhatsApp /
   Telegram seulement.
6. **Envoi** : un double appui ne crée qu'une demande ; le bon s'affiche avec
   N° court et référence ; la demande porte la provenance « Site anglais ·
   CDG ↔ Paris », la langue, le trajet et le prix ; « demande envoyée »
   compté.
7. **Pannes** : compteur en panne → rien ne change ; dépôt refusé → écriteau
   rouge, renvoi WhatsApp en action principale, et — depuis cette branche —
   tête du bon cohérente (A-02), note sans mécanisme retiré (A-01).
8. **Paramètres absents / inconnus / mal formés** : moteur utilisable,
   adresse nettoyée, français par défaut, anglais sur `?lang=en`.

**Frictions constatées** : A-01, A-02 (corrigées), A-03, A-04 (décisions).
Côté commercial, lu à la place d'un touriste : le service, la destination, le
moment du prix (« before you book »), la réservation, le contact et l'étape
suivante sont dits au premier écran de chaque page ; aucun prix n'est affiché
sur les pages (décision du Prompt 1 : berline au-dessus du forfait taxi sur
CDG ↔ Paris — à Barbaros) ; « nothing paid until your chauffeur is
confirmed » répond à l'objection « annulation gratuite » des places de marché.

**Mesure de conversion disponible** (par page et par jour, sans traceur) :
`page_vue`, `clic_reserver`, `clic_appel`, `clic_whatsapp`, `moteur_ouvert`,
`formulaire_commence`, `demande_envoyee` (compteur serveur), puis demandes,
confirmées, réalisées et euros (courses, provenance). **Aucun taux de
conversion n'est calculable aujourd'hui** : le compteur a un jour d'existence
et le site n'a pas de trafic anglais mesuré. Méthode : lire dans le registre,
page par page, `page_vue → clic_reserver → moteur_ouvert → formulaire_commence
→ demande_envoyee → réalisée`, sur 30 jours, après la soumission du plan du
site à Search Console ; comparer avant / après tout changement de page sur la
même fenêtre. Ne jamais présenter un clic comme une réservation ni une demande
comme un encaissement.

**Recommandations, par priorité** : P1 valider et publier A-01/A-02 ;
P1 Search Console (plan, indexation des 7 adresses, puis « Liens ») ;
P2 trancher A-04 (ligne B2B sur l'arrivée depuis `/en/`) ; P2 traduire les
libellés d'aéroports (A-03) ; P2 `www` (A-06) ; P2 observer les 307 (A-05).

`test-parcours-en` tourne désormais en CI à chaque pull request
(`admin-regression.yml`), à côté de `test-seo-en` et `test-liens-suivi`.

---

## F. Preuves techniques

- **Commits lus** : `f69637b` (#355), `869f2bf` (#356), `f6fb64a` (#357) ;
  `main` = `f6fb64a`.
- **Journaux GitHub** : « Publier le site » runs 340, 341, 342 (verts) ;
  « Monitoring production » run 192 (`/version.json` = `f6fb64a`, cache v176,
  construit 18 h 33 UTC, 65 contrôles) ; « Appliquer une migration » runs
  35, 36, 37 (HTTP 201 chacun, fichiers nommés dans le journal).
- **Suites exécutées ici** (`sh .claude/outils/tests.sh …`, site construit) :
  `test-cloisonnement-hotel` 44, `test-demo-hotel` 309, `test-liens-suivi`
  56, `test-nouveau-bascule` 315, `test-nouveau-langues` 28,
  `test-prix-pages` 47, `test-pro-formulaire` 143, `test-pro-page` 88,
  `test-public-formulaire` 114, `test-public-textes` 39,
  `test-securite-fonctions` 187, `test-seo-en` 354, `test-tarifs-serveur` 6,
  `test-doc` 259, `test-notification` 34, `test-chien-de-garde` 29,
  `test-push` 22 (avec `http_ece` installé dans le bac à sable ; sans lui,
  la suite échoue exprès : 20 + 1 échec nommé).
- **Deuxième série, après les correctifs** : `test-demo-hotel` 309,
  `test-easyhotel-client` 126, `test-nouveau-bascule` 315, `test-nouveau-bon`
  41, `test-nouveau-confirmation` 42, `test-nouveau-contact` 51,
  `test-nouveau-reception` 157, `test-nouveau-serveur` 92,
  `test-nouveau-whatsapp` 23, `test-reception-bon` 36, `test-parcours-en` 85,
  `test-doc` 259 — toutes vertes.
- **Falsification** (ancien `index.html` de `main`, nouvelles suites) :
  `test-nouveau-bon` tombe deux fois (« Demande reçue », « Nous vérifions la
  disponibilité… ») ; `test-nouveau-serveur` tombe trois fois (tête du bon,
  phrase, note « Si WhatsApp ne s'est pas ouvert ») et son quatrième
  contrôle (« Demande reçue » revient après la reprise) passe, comme
  attendu ; `test-parcours-en` ne démarre même pas : `construire.sh` refuse
  l'ancien texte (`textes-interdits.mjs`). Les correctifs rétablis, tout
  repasse au vert.
- **Série complète** (`sh .claude/outils/tests.sh`, une seule fois, sur
  `dc3e21f`) : 74 suites navigateur et 4 hors navigateur, toutes vertes.
  `test-admin-affiche` était d'abord tombée faute du décodeur `jsqr` sur
  cette machine (dépendance de banc, jamais dans le dépôt) ; relancée avec
  `jsqr` posé dans le bac à sable : 27 contrôles verts.
- **SQL** : PostgreSQL 16 local, port 5499, bases `mesure`, `liens`,
  `prixpages`, `prospects` — mêmes enchaînements que `admin-v2-regression.yml`.
- **Fichiers modifiés sur cette branche** : `index.html`, `sw.js` (CACHE
  v177), `.github/scripts/textes-interdits.mjs`, `test-nouveau-serveur.mjs`,
  `test-parcours-en.mjs` (nouveau), `test-nouveau-bon.mjs`,
  `memoire/contact-client.md`, `PROJECT_STATE.md` (A-07),
  `.github/workflows/admin-regression.yml` (la nouvelle suite en CI),
  `AUDIT-4-PROMPTS.md`.
- **Adresses de vérification** : les 10 du plan du site, plus
  `/version.json`, `/robots.txt`, `/sitemap.xml`.
- **Limites** : production injoignable d'ici (preuves par journaux) ; Search
  Console inaccessible ; DNS inaccessible (`www`) ; aucune donnée terrain de
  performance ; les pages extérieures [R] de `SEO-AUTORITE.md` non relues ;
  le comptage réel d'une visite `?via=` en base non lu.

---

## G. État final

1. **Fonctionne, prouvé** : les cinq pages `/en/` et les trois françaises en
   ligne sur le dernier `main`, indexables, cohérentes ; le moteur en anglais
   prérempli ; la mesure par page et par source ; le prix par page (rien
   réglé par défaut) ; le lien `?via=` de bout en bout sur le site construit ;
   les trois migrations appliquées dans l'ordre ; les contrôles de sécurité.
2. **Terminé dans le code, pas en production** : les correctifs A-01 et A-02,
   la suite `test-parcours-en` (cette branche, à montrer puis fusionner).
3. **Supabase** : rien à appliquer. Interdit : rejouer `20261014000000`.
   Facultatif : un SQL de lecture seule pour voir les premières lignes de
   `mesures_acquisition` avec une source.
4. **Search Console** (Barbaros) : plan du site soumis et traité le 15/10
   (10 pages découvertes) ; indexation demandée pour les six autres
   adresses ; `/en/` **indexée** (16/10, 01 h 03). Reste : surveiller « Pages »
   dans quelques jours, puis « Liens ».
5. **Corrigé** : A-01, A-02 ; verrou des deux phrases dans
   `textes-interdits.mjs` ; +4 contrôles dans `test-nouveau-serveur` ;
   nouvelle suite de 85 contrôles.
6. **Bloqué** : indexation Google (accès), `www` (DNS), relecture des pages
   extérieures, actions d'autorité (SIRET).
7. **Prochaines actions** : (P1) montrer les deux libellés à Barbaros,
   fusionner, lire le monitoring ; (P1) Search Console ; (P2) A-04, A-03 ; (P2) premier lien `?via=` réel et lecture du registre.
