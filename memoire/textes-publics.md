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
