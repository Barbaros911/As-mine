# Les icônes et le logo — histoire

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## L'ICÔNE — LE ROND, ET « TRANSFER » DESSOUS

Septembre 2026. Deux demandes successives : « change l'icône aussi »,
puis, en voyant les aperçus, « on garde le rond et on ajoute Transfer ».

**LES TROIS FICHIERS SE REFONT ENSEMBLE, TOUJOURS.** `icon.svg`,
`icon-maskable.svg` et `icon-180.png`. Un jeu d'icônes à moitié changé est
pire qu'un ancien cohérent : le téléphone montre l'une, l'onglet l'autre.

| Fichier | Forme | Pourquoi |
|---|---|---|
| `icon.svg` | **rond**, coins transparents | c'est celui qu'il a choisi |
| `icon-maskable.svg` | **carré PLEIN** | Android recadre lui-même et rogne jusqu'à 10 % de chaque bord ; à coins transparents il donnerait un rond posé sur un carré blanc |
| `icon-180.png` | carré opaque | iOS ignore un `apple-touch-icon` en SVG **et** n'accepte pas la transparence — les coins deviendraient noirs. Il applique son propre arrondi par-dessus |

- **`composer.py` (hors dépôt, dans le bac à sable) FABRIQUE les trois.**
  Ne pas retoucher les SVG à la main : le PNG dériverait du SVG au premier
  changement.
- **Le script lisait sa propre sortie — c'était un vrai défaut.** Il
  extrayait les contours d'« ELA » depuis `icon.svg`, qu'il écrit ensuite :
  un second passage reprenait « TRANSFER » comme s'il était une lettre
  d'« ELA ». Les contours sont maintenant **figés dans un fichier à part**,
  extraits une seule fois depuis git. Un script de fabrication doit pouvoir
  être rejoué à l'identique autant de fois qu'on veut.
- **Les lettres sont les contours réels d'Inter**, via `fontTools` — jamais
  du texte vivant. Le fichier ne dépend d'aucune police et s'affiche à
  l'identique partout, même sans réseau. L'échelle est calée sur la
  **hauteur des capitales**, pas sur la taille nominale : c'est la seule
  mesure qui aligne deux mots posés l'un sous l'autre.
- **À 20 px, « TRANSFER » n'est plus lisible** — il fait 3 px de haut. C'est
  inévitable et ça a été dit à Barbaros. « ELA » tient, lui. Si ça devient
  gênant, la correction est une variante sans le mot pour le seul favicon.
- **Le bloc est centré optiquement, pas géométriquement** : son milieu est
  à 249 pour un cercle centré à 256. Un bloc de texte exactement centré
  paraît tomber vers le bas.
- **La zone sûre du maskable est un cercle de 80 % du côté** (rayon 204,8).
  Le script mesure le coin le plus éloigné du centre et le compare à cette
  limite — 144,3 aujourd'hui.

## Le logo

Le signe court est « **ELA** » gravé en ivoire sur marine, souligné d'un
filet doré **qui sort du cadre à droite** — la route ne s'arrête pas au
bord. C'est la seule idée du logo, et elle survit à 24 px. Le nom complet
« ELA**TRANSFER** » et la ligne « Paris · Roissy CDG · Orly » s'écrivent à
côté ; le signe seul ne sert que là où il n'y a pas la place d'écrire
(onglet, écran d'accueil, photo de profil).

Les fichiers `icon.svg`, `icon-maskable.svg` et `icon-180.png` sont
**fabriqués**, pas dessinés à la main : les lettres sont les contours réels
d'Inter convertis en formes, pour que le logo ne dépende d'aucune police.
Le script de fabrication vit hors du dépôt ; en cas de reprise, refaire les
lettres avec `fontTools` plutôt que de les redessiner en rectangles —
essayé, le A était raté et ça se voyait.

Deux pièges : **un commentaire XML ne supporte pas deux tirets à la
suite** (une ligne de séparation en tirets a déjà rendu `icon.svg`
illisible, l'icône disparaissait partout sans le moindre message), et
**iOS ignore un `apple-touch-icon` en SVG** — d'où le PNG de 180 px.

Refusé : le E seul (« c'est moche »), et toute voiture, roue ou route
dessinée.

## L'ICÔNE SUR L'ÉCRAN D'ACCUEIL — CHAQUE ENTRÉE easyHotel A SON MANIFESTE

29 septembre 2026, à sa demande : poser la page client et la réception en
icône sur un iPhone. **Mesuré avant** : `/easyhotel-reception/` héritait du
manifeste du site client (`start_url: ./`, donc la racine) et en déclarait
DEUX — l'icône aurait rouvert le **site public**, le piège déjà payé sur
l'espace exploitant. `/easyhotel-client/` n'en avait aucun : vignette
générique, ouverte dans Safari.
- Réception : `construire-espaces-hotel.mjs` retire tous les manifestes
  hérités et écrit `site/easyhotel-reception/manifest.webmanifest`
  (démarre sur `/easyhotel-reception/`, nom « Réception »).
- Client : `sites/easyhotel-client/manifest.webmanifest` (nom « easyHotel »).
- **La portée est `/` dans les deux cas** : les cartes du client mènent à
  `/application.html` ; une portée limitée au dossier ferait sortir de
  l'application au premier appui.
- **Chacune a SA couleur** (29/09/2026, à sa demande : « là c'est trop
  moche ») : réception = ELA **orange sur blanc** (`icones/reception-*.png`,
  copié par `construire.sh`), client = ELA **noir sur orange**
  (`sites/easyhotel-client/icon-*.png`). Tailles 32 (onglet d'ordinateur),
  180 (iPhone), 512 (Android). Fabriquées en repeignant la silhouette de
  `brand-logo-white.png`. Aucun logo easyHotel sans leur accord.
- **Même soir, le site public et l'admin ont suivi.** Public : `icon-*.png`
  refaits depuis `brand-logo.webp` découpé par la silhouette (l'ancien
  était un agrandissement flou). Admin : ELA **bleu sur noir**
  (`icones/admin-*.png`, lettres `--ela-blue`, trait `--ela-cyan`), déclaré
  par `manifest-exploitant.webmanifest`, `/ela-admin/`, `admin.html` et
  `/exploitant/`. La règle « les deux manifestes portent les mêmes icônes »
  est tombée à sa demande : elle vaut maintenant DANS chaque espace.
- Une icône posée AVANT cette correction garde l'ancien réglage : la
  supprimer et la refaire. Sur iPhone, l'icône a son propre stockage : la
  réception retape son code une fois dans l'application.
- `test-cloisonnement-hotel` lit le manifeste comme le navigateur et tombe
  sur l'ancien code (« trouvé : 2 »).

## 31 octobre 2026 — le même logo, quatre fois plus léger

`brand-logo.webp` (la version positive : page du QR, bon, admin) pesait
144 Ko pour 1038 × 457 px — encodé sans perte, quand la version négative,
identique en taille, en faisait 36. Sur la page du QR easyHotel, c'était
63 % du poids de la page. Barbaros : « le logo doit rester le même, tu peux
le rendre plus petit ». Il n'a pas été réduit ni redessiné : **réencodé** en
WebP qualité 90 (34 Ko), mêmes dimensions, même canal de transparence au
pixel près, écart moyen 0,8/255 mesuré composé sur blanc et sur bleu nuit,
invisible grossi trois fois. L'empreinte de `test-nouveau-bascule` a été
mise à jour dans la même PR, comme sa note le prévoit. `brand-logo.svg`
l'enveloppe par son nom : inchangé. La négative n'a pas été touchée.
