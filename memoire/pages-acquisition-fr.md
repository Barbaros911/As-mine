# Les pages d'acquisition françaises — CDG, Orly, chauffeur privé

Histoire de `transfert-cdg-paris.html`, `transfert-orly-paris.html` et
`chauffeur-prive-paris.html`, les trois pages statiques par lesquelles Google
amène un visiteur français. Leur place dans le référencement est décrite
dans `SEO-INTERNATIONAL.md` ; ici, ce qu'elles disent et pourquoi.

## 22 octobre 2026 — de la page « mode d'emploi » à la page qui convainc

Mission de Barbaros : rendre le site public plus convaincant commercialement,
sans refaire le design ni ajouter de grosse fonctionnalité, et sans gêner le
travail en cours ailleurs (PR #400 sur `/professionnels/`, Issue #399 de
Codex sur le dépôt de réservation dans `index.html`). Les trois pages
françaises étaient la zone la plus faible du site **et** la seule zone à
fort trafic potentiel que personne ne touchait : c'est elle qui a été
traitée. `index.html` et `/professionnels/` n'ont pas bougé.

**Ce qui n'allait pas, mesuré sur le site construit à 390 × 844 :**
- le sous-titre parlait de l'interface, pas du voyageur (« Préparez votre
  prise en charge dans le bon sens. Vous choisirez ensuite votre terminal
  exact dans le parcours de réservation ») ; les trois cartes aussi (« Le
  parcours vous demande de sélectionner… »). Un visiteur venu de Google lit
  un mode d'emploi avant de savoir ce qu'on lui vend ;
- après le bandeau, **aucun bouton de réservation avant 3 300 px** : la
  seule reprise était la bande du bas de page. Les pages anglaises ont une
  barre du pouce depuis le 14/10 ; les françaises, rien ;
- **aucun lien vers les CGV, la confidentialité ni les mentions légales**
  dans le pied (les pages anglaises les ont) : la LCEN veut ces mentions
  accessibles depuis chaque page, et un pied sans elles fait amateur ;
- aucun bloc « qui vous conduit », « rien à payer à la réservation », « si
  vos plans changent » — ce que les pages anglaises disent dans « Good to
  know » depuis le 14/10. Les deux questions qui freinent le plus une
  réservation (« est-ce une vraie société ? », « et si j'annule ? ») restaient
  sans réponse en français ;
- aucune balise Open Graph : un lien partagé sur WhatsApp — le premier
  canal de ce métier — s'affichait sans titre propre ni image ;
- des pictogrammes en caractères texte (✈ ⌖ €) rendus différemment selon
  le téléphone, là où les pages anglaises dessinent les leurs en SVG.

**Ce qui a été fait, et les règles tenues :**
- Sous-titre et cartes réécrits en bénéfices : le bon terminal, le vol
  suivi, le prix avant d'envoyer. Même pictogrammes SVG que `/en/`.
- Blocs ajoutés, calqués sur les pages anglaises déjà validées : « Votre
  prise en charge à Roissy-CDG / à Orly » (cinq cartes pratiques), « Pour
  quels trajets » (page chauffeur), « Bon à savoir avant de réserver »
  (rien à payer, si vos plans changent, qui vous conduit, nous joindre),
  « Qui est Elatransfer » avec les trois liens légaux (`/?doc=cgv`,
  `/?doc=privacy`, `/?doc=mentions`, lus par `index.html`).
- **« Si vos plans changent » n'est pas la question « Puis-je annuler ? »**,
  retirée par Barbaros le 11/10 (« ça sert à rien », `test-nouveau-paiement`
  refuse son retour). C'est la formulation des pages anglaises, acceptée le
  14/10, et elle dit exactement les CGV art. 7 et 8 : sans frais tant que
  ce n'est pas payé, non remboursé une fois payé, remboursé en totalité si
  la course n'a pas lieu de notre fait. Toucher aux CGV, c'est relire ces
  quatre lignes.
- **Barre du pouce sur téléphone** (`.barre`, ≤ 760 px) : « Voir mon
  prix », Appeler, WhatsApp — le même dessin que `landing.css`, écrit dans
  `seo-pages.css`. Le corps réserve sa hauteur (`padding-bottom`) : mesuré,
  aucun lien du pied ne passe dessous. « Voir mon prix » porte
  `data-mesure="reserver"` : `mesure.js` le compte comme les autres.
- Balises Open Graph et Twitter, `theme-color`, lien d'évitement
  (`.saut`), `viewport-fit=cover` pour la barre sous l'encoche.
- Les trois questions fréquentes restent **mot pour mot celles de
  l'accueil** : une réponse qui dirait autre chose que le contrat serait
  opposable contre nous.
- Aucun mot interdit par `test-public-textes` (solution, mobilité,
  plateforme, conciergerie, canal, « ferme » hors contrat, « WhatsApp ou
  SMS »), ni « VTC », ni « taxi », ni prix chiffré : le tarif vit sur le
  serveur, pas dans une page statique.
- **Aucun commentaire HTML dans ces trois fichiers** : `construire.sh` ne
  les passe pas par `masquer-commentaires.mjs`, tout ce qu'on y écrirait
  partirait en ligne. C'est pour ça que l'histoire est ici.
- `sitemap.xml` : `lastmod` des trois pages au 22/10/2026.

**Mesuré après, sur le site construit** (`verif-fr.mjs`, hors dépôt) :
320, 390 et 1366 px, les trois pages — aucune erreur JavaScript, aucun
débordement horizontal, H1 et bouton de réservation au premier écran et sous
le doigt, barre présente sur téléphone et absente sur ordinateur, aucun lien
sous la barre page déroulée, boutons et liens de pied ≥ 44 px, contraste du
texte courant ≥ 4,5, un seul H1, tous les liens internes répondent sur le
site construit, `/?doc=cgv` ouvre bien les CGV en français. Poids : 14 à
15 Ko par page, aucune image ajoutée.

**Piège de mesure rencontré** : un lien **en ligne** qui passe à la ligne a
une boîte englobante dont le centre tombe *entre* ses deux lignes ;
`elementFromPoint` y rend le paragraphe, et un contrôle « rien sous la barre »
crie à tort. Mesurer sur `getClientRects()[0]`, ou ne viser que des boutons
(c'est ce que fait `test-seo-en`).

**Deux passes visuelles le même soir, essayées puis RETIRÉES à sa demande.**
Sur une capture, Barbaros a d'abord trouvé « beaucoup trop de blanc, trop de
texte » (deuxième passe : bandes de fond qui alternent, textes coupés, carte
du trajet dans le bandeau), puis « même les cadres sont tous blancs, fais
comme un designer artistique » (troisième passe : cartes bleu nuit à cheval
sur le bandeau, photos du dépôt, chiffres en contour, filigranes). Il a
ensuite tranché : **« oublie les modifs visuelles, fais ce que tu faisais de
base »** et il fournira lui-même de nouvelles photos. Les deux passes sont
dans l'historique (`7b8f049`, `ebc8e74`, annulées par le commit suivant) :
ne pas les remettre sans qu'il le redemande. Ce qui en reste utile le jour où
il envoie ses photos : un bandeau avec la photo de la marque et la carte du
trajet, une liste numérotée avec photo, des étapes sans boîtes — à lui de
choisir sur captures. Piège retenu : l'attribut `height` d'une `<img>`
l'emporte sur `aspect-ratio` ; poser `height:auto`.

**Fusion de `main` le même soir (après #400 et #401)** : la règle des
horaires a changé pendant la mission — « Assistance humaine 7 h–22 h »,
plus « 5 h », insécables et U+2060 après le tiret, horaires à côté de chaque
numéro (`test-public-horaires`, sur le site construit). Les trois pages ont
été alignées à la fusion : bandeau, tuile « Nous joindre », pied.

## Ce qui n'a pas été fait, et pourquoi

- **L'accueil (`index.html`)** : zone de Codex (#399) pendant cette mission,
  et son premier écran est déjà le plus solide du site. Ce qui y manque
  encore, à décider avec Barbaros : une question fréquente « Quand ma
  réservation est-elle confirmée ? » (la réponse est l'art. 3 des CGV), et
  dire sous le formulaire que rien n'est payé à la réservation.
- **`/professionnels/`** : PR #400 en cours (page devenue outil de vente).
- **La mesure du parcours** : l'existant compte déjà `page_vue`,
  `clic_reserver`, `moteur_ouvert`, `formulaire_commence`, `prix_demande`,
  `prix_affiche`, `demande_envoyee` (plus appel et WhatsApp), par page
  d'origine, sans traceur. Manquent `vehicule_choisi`, `recap_vu` et
  `demande_echouee`. **Ils ne s'ajoutent pas côté page** : la liste des
  événements est fermée dans la fonction `mesure` ET dans la contrainte SQL
  `trafic_evenement_valide` (`20261015010000_mesure_trafic.sql`). Il faut
  une migration qui élargit la contrainte, la fonction, puis trois appels
  `mesurerVisite()` dans le moteur (après `dessinerGammes`/clic sur une
  gamme, à l'ouverture de `#ecran-recap`, dans la branche d'échec du
  dépôt). Zone serveur et zone Codex : pas dans cette mission.
- **Pages anglaises, téléphone** : le bandeau porte Call et WhatsApp alors
  que la barre du pouce les porte aussi au même instant ; masquer
  `.hero .contact` sous 760 px gagnerait 70 px. `test-seo-en` l'accepte
  (il admet le bouton du bandeau *ou* celui de la barre). Petit gain, pas
  fait pour ne pas élargir la PR.

## 31 octobre 2026 — la charte de l'accueil, enfin sur les trois pages

Audit design du 31/10 (site construit, 320 → 1920 px) : ces trois pages
étaient la seule zone publique hors charte. `seo-pages.css` demandait
« Inter », **jamais chargée** — le téléphone affichait sa police système ;
l'en-tête était blanc, avec le logo **écrit en lettres** (« ELA / TRANSFER »
en texte, alors que la règle veut le fichier officiel, jamais redessiné).
Un visiteur venu de Google cliquait « Réserver » et tombait sur un accueil
qui n'avait pas la même tête. Les pages `/en/` équivalentes, elles,
étaient déjà dans la charte depuis le 14/10.

Fait, CSS et en-tête seulement, aucun texte touché : Figtree chargée comme
sur `/en/` (`display=swap`), en-tête bleu nuit avec `brand-logo-negatif.webp`
(82 × 36, le même que `/en/`), liens clairs, « Réserver » cyan à texte bleu
nuit (8,3:1), focus visible cyan. Mesuré après : Figtree rendue à 390 et
1280 px, aucun débordement, aucune erreur JavaScript. `CACHE` monté (la
feuille est gardée « cache d'abord »).

## 1er novembre 2026 — le forfait affiché sur les pages CDG et Orly

Audit produit indépendant (session du 1/11, aucun fichier modifié pendant
l'audit) : aucune page publique ne montrait un prix avant cinq champs à
remplir, alors que les forfaits Paris ↔ aéroport existent et que la page du
flyer d'hôtel, elle, montre déjà les siens. Proposé à Barbaros (« Êtes-vous
d'accord pour afficher les prix fixes sur les pages CDG et Orly ? ») ;
réponse : **« Oui »**. La règle du 22/10 « ni prix chiffré : le tarif vit sur
le serveur » est donc rouverte par sa décision — sur CDG et Orly seulement ;
la page chauffeur privé et les pages `/en/` restent sans prix.

**Ce qui est affiché** : un bloc « Forfait Paris ↔ Roissy-CDG » (« ↔ Orly »)
entre l'avis Google et les deux boutons, quatre montants (berline, van ;
depuis l'aéroport, vers l'aéroport), puis une note : péages compris, même
prix jour et nuit (CGV art. 4), l'accueil avec pancarte compris au départ
de l'aéroport, capacités, et « Hors Paris (au-delà des 20 arrondissements) :
prix selon la distance ». Le mot « forfait » est celui des CGV et de l'écran
du prix (« Forfait Paris ↔ Roissy-CDG : le même prix partout dans Paris »).
Jamais « ferme » (test-public-textes).

**Le calcul** est celui de `prixSitePublic` : forfait, puis accueil au
départ de l'aéroport (`ACCUEIL_EUR`), sans arrondi. Mesuré dans le
formulaire : CDG T2E → Paris 80 € et 120 €, Paris → CDG 70 € et 110 € ;
Orly → Paris 65 € et 90 €, Paris → Orly 55 € et 80 €.

**Pourquoi un script, et pas des chiffres écrits seulement** : Barbaros peut
changer un forfait dans Réglages → Tarifs sans aucun commit ; une page figée
annoncerait alors un autre prix que le formulaire. La page écrit le repli
(`config.js`, ce que lisent Google et un navigateur sans JavaScript) et
`prix-forfaits.js` le remplace par la vue `grille_publique`, passée à la même
porte que `grilleValide` (une seule valeur fausse : rien n'est pris, comme
dans le formulaire). Le script est copié et nettoyé par `construire.sh`
(deux lignes). `CACHE` monté : `seo-pages.css` est gardé « cache d'abord ».

**Mesuré** sur le site construit, 390 × 844 : les deux lignes de prix au
premier écran, au-dessus de la barre du pouce ; 360 px aussi ; à 320 px,
la ligne « depuis l'aéroport » seulement, l'autre à un geste. Les deux
boutons « CDG → Paris / Paris → CDG » passent sous le premier écran sur
téléphone ; la barre du pouce (« Voir mon prix ») reste. Pour tenir, le bloc
a été resserré : capacités dans la note, en-têtes sur une ligne.

`test-prix-pages.mjs` (41 contrôles) : montants écrits = `config.js` ;
mêmes serveur, clé et listes de clés que le moteur ; serveur muet → repli ;
grille valide → la page ET le formulaire donnent le même montant ; grille
sans forfait Disneyland → refusée des deux côtés ; prix au départ de
l'aéroport sous le doigt à 320 et 390 px. Éprouvé : sur l'ancien code, 32
contrôles tombent en nommant le défaut ; sur un script dont la porte laisse
passer un forfait manquant, le contrôle « grille sans forfait Disneyland »
tombe.

**Pas fait, à proposer ensuite** : le prix dans le titre et la description
Google de ces pages ; les pages `/en/` ; le même bloc sur l'accueil (il
touche `index.html`, où un autre chantier est en cours).
