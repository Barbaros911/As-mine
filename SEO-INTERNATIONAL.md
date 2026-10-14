# SEO international — diagnostic et lot 1 (14 octobre 2026)

Mission « Prompt 1 » : faire découvrir Elatransfer à des voyageurs qui ne
connaissent pas la marque. Ce fichier est le diagnostic rendu AVANT le code,
puis ce qui a été construit. Il dit ce qui a été **mesuré** et ce qui est
**estimé** ; aucun volume de recherche n'est inventé.

---

## 1. Diagnostic actuel

**Ce qui existe et marche**
- Un moteur de réservation unique (`index.html`, ~1 Mo) qui calcule le prix,
  dépose la demande sur le serveur et sait déjà lire `?aeroport=cdg|orly&sens=`
  (préremplissage depuis une page SEO).
- Trois pages SEO françaises statiques : `transfert-cdg-paris.html`,
  `transfert-orly-paris.html`, `chauffeur-prive-paris.html`, plus
  `/professionnels/`. Une seule entité dans les données structurées
  (`#organisation`), aucun « VTC », réponses aux questions recopiées de
  l'accueil (et donc des CGV).
- Un anglais complet, mais **sans adresse** : c'est un bouton sur la même URL.
  L'accueil s'ouvre en français pour tout le monde (décision du 5/10, prise
  parce que Googlebot se présente en anglais).

**Ce qui bloque l'acquisition internationale**
1. **Aucune page en anglais n'existe pour Google.** Un voyageur qui tape
   « CDG airport transfer » ne peut tomber que sur une page française.
2. **Un visiteur anglophone qui clique « Réserver » arrive sur un moteur en
   français** : rien ne permettait d'ouvrir le moteur en anglais par l'adresse.
3. **Les pages françaises déclarent une adresse officielle qui redirige.**
   MESURÉ en faisant tourner localement le moteur d'hébergement de Cloudflare
   (`wrangler dev`, workerd) avec le `wrangler.jsonc` du dépôt :
   `/transfert-cdg-paris.html` → **307** → `/transfert-cdg-paris`. La balise
   canonique, le plan du site et les liens de l'accueil visent tous l'URL en
   `.html`, c'est-à-dire une redirection **temporaire**. Signal contradictoire
   pour Google — cohérent avec « 4 pages au plan, 2 indexées » relevé dans
   Search Console le 5/10. *Limite : la production elle-même est injoignable
   d'ici ; la mesure porte sur le même code d'hébergement et la même
   configuration.*
4. **Toute adresse inconnue rend l'accueil en 200** (`not_found_handling:
   single-page-application`, mesuré : `/n-existe-pas/` → 200). Pour Google,
   ce sont des « soft 404 ». Sans gravité tant qu'aucun lien ne pointe vers
   une adresse fausse, mais une faute de frappe dans un lien interne ne se
   verrait pas.
5. **Aucune mesure** : on ne sait pas quelle page amène des demandes. La
   politique de confidentialité exclut toute mesure publicitaire ; le site
   n'a aucun traceur.

## 2. Avis sur `/en/`

**Bonne architecture, et c'est la seule raisonnable ici.**
- Sous-dossier, même domaine : l'autorité (encore faible) d'elatransfer.com
  profite aux deux langues, rien à régler côté DNS (le `www` ne répond même
  pas aujourd'hui), et `/es/`, `/de/`, `/it/` s'ajouteront à l'identique.
- Écartés : sous-domaine `en.` (DNS, autorité séparée), paramètre `?lang=en`
  (Google le déconseille comme URL de langue), traduction par le seul
  JavaScript sur la même URL (c'est l'état actuel, et c'est lui qui empêche
  l'anglais d'exister pour Google).
- **Le moteur n'est PAS dupliqué dans `/en/`.** Les pages anglaises sont
  statiques, légères et écrites en anglais dans le HTML (Google lit le texte
  sans exécuter le moteur) ; « Book » ouvre le moteur unique en anglais
  (`/?lang=en`). Une copie du moteur sous `/en/` aurait coûté 1 Mo par page,
  des chemins relatifs à réécrire et un second moteur à tenir.
- **URL en dossier avec barre finale** (`/en/cdg-airport-transfer-paris/`) :
  mesuré, c'est la forme que Cloudflare sert en 200 sans redirection.

## 3. Opportunités (classées par proximité de l'achat)

| Intention | Exemples | Valeur pour Elatransfer |
|---|---|---|
| **Transactionnelle** | « book private transfer CDG Paris », « CDG to Disneyland transfer », « CDG to Orly transfer » | maximale — la page doit réserver |
| **Commerciale** | « best Paris airport transfer », « private driver CDG airport » | forte — la page doit rassurer puis réserver |
| Informationnelle | « how to get from CDG to Paris » | faible — concurrence des guides, ne pas viser en lot 1 |

**Ce que montrent les résultats de recherche (relevé du 14/10/2026)** : les
requêtes de tête sont tenues par des places de marché (Viator, Musement/TUI,
Transfeero, comparateurs). Elles affichent un prix d'appel et « annulation
gratuite 24 h ». Gagner ces requêtes prendra des mois ; la longue traîne
spécifique (Disneyland, inter-aéroports, van 7 places) est plus accessible.

**Le point commercial qu'aucune page ne réglera** (à trancher par Barbaros,
pas par le code) : le forfait taxi réglementé CDG ↔ Paris est de **56 € rive
droite / 65 € rive gauche** selon des guides 2026 (arrêté du 24/12/2025, non
lu sur le texte officiel). À 2,90 €/km, une berline CDG → centre de Paris
(~29 km de route) sort autour de **80–90 €**. Sur la requête la plus cherchée,
la berline est donc plus chère que le taxi. Elle est en revanche bien placée
là où le taxi n'a pas de forfait ou ne suffit pas : **van 7 places**
(familles, groupes), **Disneyland**, **inter-aéroports**, hôtels hors Paris.
D'où l'ordre des pages ci-dessous, et des pages qui vendent ce qui est inclus
(prix annoncé avant, suivi du vol, 60 min d'attente, van) plutôt qu'un prix.

## 4. Top 5 — le lot 1

| # | URL | Intention | Utilisateur | CTA | Potentiel | Difficulté | Priorité |
|---|---|---|---|---|---|---|---|
| 1 | `/en/cdg-airport-transfer-paris/` | CDG ↔ Paris, hôtel compris | touriste, voyageur d'affaires | Book CDG → Paris / Paris → CDG | très fort (volume) ; conversion freinée par le prix berline | forte | P1 |
| 2 | `/en/disneyland-paris-airport-transfer/` | CDG/Orly → Disneyland | familles, 4–7 personnes, bagages | Book from CDG / from Orly | fort, **meilleur rapport prix/intention** (van) | moyenne | P1 |
| 3 | `/en/orly-airport-transfer-paris/` | Orly ↔ Paris | touriste, Europe/Maghreb | Book Orly → Paris / Paris → Orly | fort | forte | P1 |
| 4 | `/en/cdg-orly-transfer/` | correspondance entre aéroports | voyageur en correspondance, bagages | Book CDG → Orly / Orly → CDG | moyen, **très transactionnel** | moyenne | P2 |
| 5 | `/en/` | « Paris airport transfer », marque | tout étranger, page d'accueil anglaise | Book · Call · WhatsApp | moyen (hub, maillage) | forte | P1 (structure) |

**Écartés du lot 1, et pourquoi**
- **« CDG → Paris hotels »** : c'est la même intention que CDG → Paris (un
  voyageur qui va à Paris va à son hôtel). Deux pages = cannibalisation.
  L'angle hôtel est **dans** la page CDG.
- **« Just landed » (`/en/airport-pickup/`)** : le service confirme une
  demande, trouve un chauffeur, envoie un lien de paiement, puis le chauffeur
  part. Promettre « une voiture tout de suite » à quelqu'un au tapis bagages
  serait une promesse que le parcours ne tient pas toujours, la nuit surtout
  (assistance 5 h–22 h). **Phase 2**, une fois mesuré le délai réel entre une
  demande « dès que possible » et le départ du chauffeur.
- **Beauvais** (low-cost, ~85 km) : clientèle étrangère réelle, mais trajet
  long donc cher ; phase 2.

## 5. Architecture technique

- `en/` à la racine du dépôt, une page = un dossier (`en/<slug>/index.html`),
  copié par `construire.sh` (`cp -r en site/en`), nom réservé.
- Feuille commune `landing.css` (charte du site : Figtree, bleu nuit, cyan,
  logo négatif) et script commun `mesure.js`. Aucune dépendance, aucune image
  lourde : codes IATA et pictogrammes au trait.
- **Le moteur reste unique.** Trois paramètres d'entrée ajoutés à `index.html`,
  tous facultatifs, tous effacés de la barre d'adresse après lecture :
  - `lang=en|fr` : la langue d'arrivée (et mémorisée, comme un appui sur EN) ;
  - `vers=orly|cdg|disneyland` : la destination tapée d'avance ; la liste
    s'ouvre après le choix du terminal, **le client choisit lui-même**
    (règle du site : on ne choisit jamais une adresse à sa place) ;
  - `src=<page>` : la page d'origine, liste fermée, portée jusqu'à la demande.
- **Hreflang seulement entre vrais équivalents** : `/` ↔ `/en/`,
  `transfert-cdg-paris` ↔ `/en/cdg-airport-transfer-paris/`,
  `transfert-orly-paris` ↔ `/en/orly-airport-transfer-paris/`, `x-default`
  vers l'anglais (le visiteur ni francophone ni anglophone lit mieux
  l'anglais). Disneyland et CDG ↔ Orly n'ont pas d'équivalent français : pas
  de hreflang.
- **Les pages françaises passent à leur URL servie** (sans `.html`) : canonique,
  plan du site, liens de l'accueil, hreflang. Les fichiers gardent leur nom.

## 6. Structure type d'une page

1. En-tête bleu nuit : logo, lien « Français » vers l'équivalent.
2. **Au-dessus de la ligne de flottaison (390 × 844)** : surtitre (aéroport),
   H1 (le trajet), une phrase, **deux boutons de sens** (« CDG → Paris »,
   « Paris → CDG »), puis Call / WhatsApp, et la ligne « Book online 24/7 ·
   Phone support 5 am–10 pm ».
3. Ce qui est inclus (les quatre faits de l'accueil, mot pour mot).
4. Comment ça marche, en quatre étapes — dont le paiement par lien, avant le
   départ, une fois le chauffeur confirmé.
5. Le contenu propre à la page (terminaux, Disneyland en famille,
   correspondance…).
6. Berline 4 places / van 7 places.
7. Questions fréquentes : **les réponses de l'accueil, mot pour mot** (elles
   reprennent les CGV) — un contrôle le vérifie.
8. Qui est Elatransfer, les autres trajets, contact, documents légaux.
9. Sur téléphone : une barre fixe Book · Call · WhatsApp en bas d'écran.

## 7. Duplication et cannibalisation

- CDG → Paris et « CDG → hôtels » fusionnés (voir §4).
- Chaque page a un contenu propre (terminaux, famille, correspondance) ; le
  bloc commun (inclus, étapes, questions) est court et identique **exprès** :
  ce sont des faits contractuels, ils ne se reformulent pas page par page.
- FR et EN ne se concurrencent pas : hreflang les déclare l'un l'autre.
- Le moteur `/?lang=en&…` garde sa canonique `/` : aucune URL de moteur ne
  part dans l'index.

## 8. Risques techniques

| Risque | Parade |
|---|---|
| Une page oubliée par `construire.sh` marche en local et manque en ligne | `cp -r en`, contrôle sur le site construit, page ajoutée au contrôle de production |
| Le moteur s'ouvre en français malgré `lang=en` | contrôle navigateur |
| `vers=` choisit une adresse à la place du client | la liste s'ouvre, rien n'est choisi d'office ; contrôle |
| Une ancienne règle de paiement revient dans un texte anglais (« pay on board ») | `verifier-textes-interdits.mjs` lit aussi `/en/` |
| Soft 404 sur une URL anglaise mal tapée | URL en dossier, liens vérifiés par le contrôle |
| `landing.css` gardé par le service worker (cache d'abord) | `CACHE` incrémenté |
| Mesure prise pour un traceur | aucune donnée personnelle, aucun stockage sur l'appareil, aucun tiers ; politique mise à jour |

## 9. Mesure

**Deux niveaux, aucun traceur tiers, aucun cookie, aucun bandeau.**
1. **Fonctionnel dès la publication, sans rien au serveur** : la page
   d'origine part **avec la demande** (champ `provenance`, déjà gardé par le
   serveur). Elle apparaît dans le registre (« D'où viennent les clients » :
   demandes, réalisées, encaissé), sur le bon et dans l'alerte Telegram
   (« Vient de : Site anglais · CDG ↔ Paris »). C'est le chiffre qui répond à
   « quelle page amène des clients ».
2. **L'entonnoir** (affichage, Book, Call, WhatsApp, moteur ouvert,
   formulaire commencé, demande envoyée), par page : un compteur **agrégé
   par jour** sur le serveur (`ela_mesurer`), sans adresse IP, sans
   identifiant, rien écrit sur l'appareil. Lu dans le registre de l'admin.
   **Il faut appliquer la migration** `20261014000000_mesure_acquisition.sql`
   (workflow « Appliquer une migration Supabase ») après la fusion : avant,
   les appels échouent sans aucun effet sur le visiteur.
3. **Search Console** reste la mesure du haut de l'entonnoir (impressions,
   clics par page) : y soumettre le nouveau plan du site.

## 10. Avis d'expert

**Oui, c'est le bon chantier d'acquisition — à condition de le garder petit,
mesuré, et de ne pas en attendre de réservations avant 2 à 4 mois.** Le SEO
est le seul canal à coût marginal nul qui touche un étranger qui ne connaît
pas la marque, et il se cumule. Mais trois choses comptent plus que le nombre
de pages :

1. **Corriger d'abord la technique** (canonique qui redirige, anglais sans
   adresse, moteur qui s'ouvre en français) : sans ça, aucune page ne rend.
2. **Le prix décide de la conversion.** Sur CDG → Paris en berline, le site
   est au-dessus du forfait taxi. Les pages qui convertiront d'abord sont
   celles où Elatransfer est bien placé : van, familles, Disneyland,
   inter-aéroports. La décision sur la grille appartient à Barbaros.
3. **La confiance d'un étranger** : les places de marché affichent
   « annulation gratuite 24 h ». Ici, c'est gratuit **jusqu'au paiement**,
   puis non remboursable (CGV art. 7). C'est juste et c'est écrit ; mais
   c'est l'objection qu'un étranger fera. Les pages disent clairement :
   « rien n'est payé à la réservation, vous payez une fois votre chauffeur
   confirmé ».

**Ce qui rapporterait plus vite, en parallèle** : la fiche Google Business
(bloquée par le SIRET), et les partenariats hôtels (le canal easyHotel est
déjà prouvé).

---

## Ce qui a été construit (lot 1)

| Adresse | Équivalent français (hreflang) | Origine (`src`) |
|---|---|---|
| `/en/` | `/` | `en-accueil` |
| `/en/cdg-airport-transfer-paris/` | `/transfert-cdg-paris` | `en-cdg` |
| `/en/orly-airport-transfer-paris/` | `/transfert-orly-paris` | `en-orly` |
| `/en/disneyland-paris-airport-transfer/` | — | `en-disneyland` |
| `/en/cdg-orly-transfer/` | — | `en-cdg-orly` |

- Pages : `en/**/index.html`, `landing.css`, `mesure.js`.
- Moteur (`index.html`) : `?lang=`, `?vers=`, `?src=` → `provenance` ; mesure
  du moteur ; lien « English » dans le pied ; hreflang `/` ↔ `/en/` ; politique
  de confidentialité (FR/EN) : page d'origine et comptage anonyme.
- Pages françaises : adresse servie sans `.html` (canonique, liens, plan du
  site), hreflang CDG et Orly, lien « English », origine et mesure.
- `robots.txt` : `/en/` ouvert, le moteur ouvert en anglais (`?lang=`) écarté.
- Serveur : `supabase/migrations/20261014000000_mesure_acquisition.sql`
  (à appliquer après la fusion), lu dans le registre de l'admin.
- Contrôles : `test-seo-en.mjs`, `supabase/tests/mesure*.sql` (CI),
  `verifier-production.mjs` (dix portes de plus).
- **Prix des pages** (demande de Barbaros après le lot 1) : un pourcentage par
  page, réglé dans l'admin (Réglages → « Prix des pages »), ajouté au tarif au
  kilomètre pour un client venu de cette page. 0 par défaut. Serveur :
  `20261014010000_majoration_pages.sql` (à appliquer après la fusion) ; CGV
  art. 4 FR/EN ; contrôle : `test-prix-pages.mjs`.

Détail, mesures et pièges : `memoire/seo-international.md`.
