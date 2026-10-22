# Les textes publics — histoire

Archive sortie de CLAUDE.md. La règle en vigueur est dans CLAUDE.md
(« LE POSITIONNEMENT — DEUX ACTIVITÉS, UN SEUL SITE ») ; ici, le pourquoi.

## 5 octobre 2026 — « Qui sommes-nous »

Le site ne disait nulle part ce qu'est Elatransfer. `#comment`, juste sous le
formulaire, le dit (« Vous réservez, nous organisons tout. », trois étapes) ;
l'encart hôtels/agences/entreprises est `#modele`, après « Au-delà du
trajet », et les devis passent par « Au-delà du trajet ». Le pavé de 70 mots
sous le formulaire a été remplacé par une seule ligne (`.pro-bloc`).

## 8 octobre 2026 — l'audit éditorial

Mission « audit commercial final », Bloc 1, 2 et 3 déjà fusionnés. Audit fait
sur le site CONSTRUIT, FR et EN, à 390 et 1366 px, puis chaque point tranché
par Barbaros. Notes de départ : positionnement 6,5, B2C 7,5, B2B 7, textes
FR 7,5 / EN 6, SEO 6.

**Ce qui a été trouvé, et ce qui a été fait :**
- **« Tous vos déplacements, une seule solution. »** était SA phrase (commit
  du 3 octobre). Elle ne disait ni quoi ni où, et « solution » est le mot que
  la règle du 6 octobre interdit. Sa meilleure phrase était déjà là, en tête
  du sous-titre : « Transferts avec chauffeur, organisés de A à Z. » Elle est
  devenue le grand titre. **Mesuré** : « Vos transferts… organisés de A à Z. »
  passait à 3 lignes sur ordinateur et poussait « Voir mon prix » à 690 px,
  hors de l'écran utile d'un 1366×768 (657 px) ; la version sans « Vos »
  garde exactement les positions d'avant (751 téléphone, 646 ordinateur).
- **« CHAUFFEURS PRIVÉS » sous le logo n'était plus affiché** depuis des
  semaines : il ne survivait que comme clé orpheline (`entete_sous`) et dans
  le nom du manifeste. Les deux sont partis ; décision : rien sous le logo.
- **« confirmée par WhatsApp ou SMS »** (étape 2) était faux depuis
  l'option A (`memoire/contact-client.md`) : le client choisit son moyen.
- **« Offrez le transport… sans travail pour vos équipes »** : « offrez » se
  lit « payez-le pour eux », et « sans travail » contredisait « votre
  réception réserve ». Devenu « Proposez des transferts… sans rien organiser
  vous-même ».
- **« Prise en charge complète du transport »** : sur ce site, « prise en
  charge » est l'heure où le chauffeur vient chercher le client. Devenu
  « Organisation complète des trajets ».
- **La carte « Professionnel »** portait le nom de l'entrée « Professionnels »
  du menu, qui mène ailleurs (EN : « Business » contre « For business »).
  Devenue « Affaires » / « Business travel ».
- **La pancarte** était annoncée « à l'aéroport » seulement ; le code et les
  CGV la proposent aussi en gare.
- **« Prix ferme »** : Barbaros ne veut plus le voir (« Ne garde pas prix
  ferme »). Remplacé par « Prix annoncé à l'avance » — c'est ce qu'on garantit
  au client. Il reste au contrat : l'étiquette du bon d'une course confirmée
  (`prix_ferme`, que les suites de la réception lisent), la phrase « votre
  réservation devient ferme… » avant « Confirmer » (CGV art. 3), les CGV.
- **Les papiers des chauffeurs** : Barbaros ne veut pas qu'ils bloquent quoi
  que ce soit (aucun blocage depuis le 4/10, vérifié dans `refusAttribution`).
  La phrase de l'accueil promettait un chauffeur « avec sa carte
  professionnelle et son assurance », donc un contrôle qu'il ne fait pas. Elle
  dit maintenant qui en répond : « indépendant, sous sa propre carte
  professionnelle et son assurance », mot pour mot les CGV art. 2 et 8.
  L'obligation de L3142-1 lui a été rappelée une fois ; c'est son choix.
- **La géographie** : « Il ne faut pas se fixer en France » — la marque vise
  l'Europe. Aucun lieu dans le grand titre ni le sous-titre ; les lieux
  restent dans les cartes de service, les pages CDG/Orly/Paris, les CGV et
  les données structurées. On n'écrit pas « Europe » non plus : le prix en
  ligne s'arrête à 90 km de Paris.
- **Anglais** : réécrit plutôt que traduit (bloc pro, « Chauffeur by the
  hour », « Nous joindre »), et trois libellés de lecteur d'écran restés en
  français sont traduits (`langue_aria`, `sugg_depart`, `sugg_arrivee`).

## La fiche Google — discutée, mesurée, laissée de côté

Barbaros : « Laisse tomber la fiche Google ». Titre, description, aperçus de
partage et JSON-LD n'ont PAS été modifiés. Ce qui a été établi, pour le jour
où le sujet revient :
- **Google affichait le 8/10 une version d'avant le 6/10** : le titre
  « Transferts privés & solutions de… » et, à la place de la description,
  l'ancien sous-titre (« organise vos transferts et solutions de
  mobilité… »). Google prend souvent une phrase de la page plutôt que la
  description : le sous-titre compte autant que la description. L'aperçu IA
  recopiait « solutions de mobilité » et « transferts privés » : ce qu'on
  écrit est ce que l'IA de Google dira.
- **Mesures** : Google coupe un titre vers 580 px (≈ 46 caractères sur son
  téléphone, deux lignes) et une description vers 920 px (≈ 150 caractères).
  La description en place (156 car., 946 px) est coupée à « gère chaque
  tra… ».
- **Ses choix exprimés** : pas de « prix ferme », peu de « chauffeur », pas
  « Elatransfer — Transferts » (le mot deux fois), « particuliers et pros ».
- **Dernières propositions** (non appliquées) : titre « Elatransfer — Vos
  trajets privés et pros » (40 car., entier sur téléphone) ; description
  « Réservez votre transfert. Hôtels, entreprises, agences, événementiel :
  page de réservation, QR code et espace réception. Elatransfer gère le
  reste. » (147 car., 911 px). « Particuliers » rangé parmi les outils aurait
  promis une page et un QR code à un particulier.
- **Sa propre description** (« Elatransfer crée pour les hôtels… jusqu'à sa
  réalisation ») est excellente pour une future page dédiée aux partenaires,
  trop longue (245 car.) et sans voyageur pour l'accueil.
- Le contrôle de `test-nouveau-bascule` exige « transfert » dans le titre :
  à adapter (« dit le métier ») si le titre change un jour.

## 18 octobre 2026 — l'accueil rendu aux voyageurs

Audit de l'architecture commerciale du site public, demandé par Barbaros
(« une marque, Particuliers / Elatransfer Pro ? »). Le rapport a recommandé une
marque, deux espaces, **sans sélecteur** en tête de site et **sans
« Elatransfer Pro »** tant qu'aucun compte pro n'existe : le voyageur d'affaires
se croirait « pro » et tomberait sur une page sans moteur, et les prospects
pros arrivent par démarchage (fiche, WhatsApp, visite), pas par l'accueil.

Ses réponses : sous-titre avec la zone, titre et description Google recentrés
sur le voyageur, et « Professionnels » gardé — « ton avis expert » ; bouton
« Réserver mon trajet » du bandeau retiré — « oui » ; et le logo : « on ne
personnalise pas leur logo, on ajoute leur logo s'il le souhaite ». La page
dit « et votre logo, si vous le souhaitez » (carte « Votre page ») et « Votre
logo aussi, si vous souhaitez qu'il figure sur votre page » (question « Que
faut-il vous fournir ? ») : c'est l'hôtel qui le fournit, et c'est ce qui en
autorise l'usage. Aucun champ « logo » dans le code : on le pose à la main
quand un hôtel l'envoie. Notes données, actuel → proposé :
titre de l'accueil 4 → 8, description 4 → 8, sous-titre 3 → 8.

- **Le sous-titre ne répète pas la ligne d'en dessous** : la première version
  (« …, gares et hôtels : … ») doublait « Aéroports · Gares · Hôtels · Salons ».
  Il ne nomme plus que Roissy-CDG, Orly et Beauvais.
- **Mesuré sur le site construit** : sans le bouton (111 px avec ses marges),
  « Voir mon prix » passe de 695–751 à 612–668. Il tient entier à 360 × 740
  (barre à 678) et sur tous les formats courants ; à 375 × 667 (iPhone SE et 8)
  il reste sous la barre, à 7 px près — caché, jamais coupé.
- **Le bloc pro de l'accueil passe de 665 à 331 px** (390 px de large).
- **Piège attrapé avant la CI** : `test-nouveau-bascule` lit la description
  publiée avec `[^"']*` ; une apostrophe droite la coupait (« … à l »). Les
  descriptions prennent l'apostrophe typographique, comme les pages aéroport.
- La section de `CLAUDE.md` qu'elle remplace, telle qu'elle était :

> ## LE POSITIONNEMENT — DEUX ACTIVITÉS, UN SEUL SITE
>
> Bloc 1 (6/10/2026) puis audit éditorial (8/10), chaque point tranché par
> Barbaros. Elatransfer organise des transferts avec chauffeur (B2C) ET crée
> pour chaque partenaire sa page de réservation, son QR code et son espace
> réception, puis gère chaque transport (B2B). Histoire et variantes écartées :
> `memoire/textes-publics.md` ; ancien emplacement du bloc pro :
> `memoire/accueil-pro.md`.
> - **Le grand titre dit le métier** (« Transferts avec chauffeur, organisés de
>   A à Z. »), le sous-titre parle aux pros. **Aucun lieu dans l'un ni l'autre**
>   (« il ne faut pas se fixer en France ») ; les lieux restent dans ce qui
>   décrit le service. Ni « Europe » ni « monde » : le prix en ligne s'arrête à
>   90 km.
> - **Jamais « solution », « mobilité », « plateforme », « conciergerie »,
>   « canal »** sur une page publique : on nomme ce qu'on crée et ce qu'on fait
>   après. « Suivi » = humain, jamais « temps réel ».
> - **« Prix ferme » ne vend plus** : « Prix annoncé à l'avance ». « Ferme »
>   reste au contrat : étiquette du bon confirmé, phrase avant « Confirmer »,
>   CGV. **Rien sous le logo.**
> - Le chauffeur est « professionnel indépendant, sous sa propre carte
>   professionnelle et son assurance » (CGV art. 8) : jamais « taxi » ni
>   « VTC » côté client, et aucun contrôle de papiers promis. La confirmation
>   part par le moyen choisi par le client, jamais « WhatsApp ou SMS ».
> - **Le premier écran reste au client qui réserve** : une ligne (`.pro-bloc`)
>   mène à `#modele` ; ordre de l'accueil verrouillé (`test-public-ordinateur`) ;
>   sous-titre ≤ 125 caractères, services sur une ligne à 390 px.
> - « Mise en place gratuite » est vraie (confirmé le 8/10) : la retirer le jour
>   où un hôtel paie. Aucun client cité, aucun chiffre, aucun délai promis.
> - **LA FICHE GOOGLE N'A PAS ÉTÉ TOUCHÉE** (à sa demande, 8/10) : titre et
>   description disent encore « Transferts privés » et « prix ferme ». Ils
>   vivent à DEUX endroits (`index.html`, `seo-ela.mjs`), identiques.
> - `contact@elatransfer.com` : pied, bloc pro, « Nous joindre ». Promesse B2B :
>   « Votre réception réserve. Elatransfer gère tout le reste. »
> - `test-public-textes.mjs` verrouille ces règles (21 contrôles tombent sur le
>   code d'avant).


## Les horaires : réservation 24 h/24, assistance humaine 7 h–22 h (21/10/2026)

Barbaros : « réservation 24/24, assistance humaine 7/22, écrit partout comme un
expert ». C'était « Assistance 5 h–22 h », écrit à quatre endroits qui ne se
lisaient pas entre eux (bandeau de l'accueil, réception, cinq pages anglaises,
phrase de nuit du « Dès que possible »).
- **Une seule phrase**, `hero_notes` (« Réservation 24 h/24 · Assistance
  humaine 7 h–22 h ») : le bandeau ET le pied d'accueil (même clé, à côté du
  numéro). « Nous joindre » et le bon du client (« Une question ? ») disent les
  mêmes heures en toutes lettres.
- **La nuit va de 22 h à 7 h** : « Entre 22 h et 7 h, la réponse peut être plus
  lente » s'affiche sous « Dès que possible » dans cette fenêtre (`h < 7`).
- **Espaces insécables** dans « 24 h/24 », « 7 h–22 h », « 7 am–10 pm » : une
  heure coupée en fin de ligne ne se relit plus.
- **Les contrôles lisent l'accueil, ils ne recopient plus l'heure** :
  `test-seo-en` tirait « 5 am–10 pm » en dur ; il lit maintenant `hero_notes`.
  `test-reception-bon` exige que la ligne du comptoir soit `hero_notes` mot pour
  mot, et que le bon dise « Assistance humaine de 7 h à 22 h ».
- **La règle qui tranche « partout »** (22/10/2026, « fait tout 10/10 ») :
  partout où le numéro est écrit, les horaires l'accompagnent. D'où le pied
  des trois pages françaises (CDG, Orly, Chauffeur privé, qui ne les disaient
  pas alors que leurs sœurs anglaises le faisaient) et la page Professionnels
  (« Parlons de votre établissement », « Vous préférez nous parler ? »).
- **Google** : `contactPoint` porte deux points de contact — le service client
  (téléphone, e-mail) de 07:00 à 22:00, et les réservations (le site) de 00:00
  à 23:59, tous les jours. C'est la seule façon de dire « 24 h/24 » à Google
  sans mentir sur le téléphone. La fiche Google (Business Profile) a ses propres
  horaires, réglés par Barbaros chez Google : y mettre 7 h–22 h, pas 24 h/24,
  sinon les clients appellent la nuit.
- **La phrase de nuit suit l'heure de Paris** (`heureParis()`), plus celle du
  téléphone : un voyageur garde parfois l'heure de chez lui. **Piège payé** :
  le premier jet lisait l'heure par `format` en français, qui écrit « 06 h » —
  `Number("06 h")` vaut NaN et la phrase ne sortait plus JAMAIS, toutes les
  suites au vert. Vu par la capture, pas par les tests. `formatToParts` ;
  `test-nouveau-preavis` pose l'horloge à Paris et le fuseau ailleurs (Tokyo,
  Honolulu) et tombe sur ce défaut (2 contrôles).
