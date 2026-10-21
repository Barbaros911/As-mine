# Le thème d'un partenaire, et la réception V2

Archivé de `CLAUDE.md` le 21 octobre 2026, avec la réception V2. Ce qui vaut
aujourd'hui est dans la section « LE THÈME D'UN PARTENAIRE » du mémo ; ici,
l'histoire et les mesures.

## La réception V2 (21/10/2026)

Mission de Barbaros : « direction artistique + prototype pixel-précis » de
la page du comptoir, prototype isolé d'abord, implémentation seulement après
validation. Il a choisi sur planches la « version 3 » (Départ / Arrivée
allumé dans l'orange de l'hôtel), le **texte noir** sur l'orange (choix B),
et il a demandé de **garder la photo du comptoir** qu'il avait posée.

- **Un bandeau bleu nuit commun** aux trois écrans (code, liste, nouvelle
  course) : barre de 64 px (logo en version négative, pastille de l'hôtel,
  FR/EN), puis le nom, l'adresse et « Assistance humaine 5 h–22 h ». La
  photo passe sous la barre ET sous le bandeau sans couture : même taille
  (`--v2-photo-h`), même bord droit, le bandeau la reprend 64 px plus bas.
  `test-reception-bon` mesure toujours le bandeau seul (≤ 190 px) et le
  contraste au pixel le plus clair.
- **Le logo négatif au comptoir** : sur le bleu nuit, l'original disparaît
  (1,1:1). `test-public-formulaire` exigeait l'original à la réception (règle
  du Bloc 3, quand l'en-tête du comptoir était blanc) : il exige maintenant
  la version négative là, et l'original sur la page d'un hôtel et à l'admin.
- **Deux colonnes** sur le formulaire : à gauche ce qu'on saisit (le trajet,
  puis « Le client » sur un fond à part), à droite ce qu'on décide (gamme,
  prix, « Valider », collant). Les blocs sont DÉPLACÉS une fois par
  `hotel-engine-polish.js`, jamais recopiés.
- **Berline et Van l'une sous l'autre**, contrairement à la maquette (côte à
  côte) : avec les vrais textes du moteur, « Jusqu'à 4 passagers · arrivée
  13:42–13:47 » passait sur trois lignes dans 140 px. Empilées, les prix
  restent alignés et « Valider » remonte : sur un PC 1366×768 il finit à
  633 px (657 px utiles).
- **Texte noir sur l'orange** : clé `texteAction` de la marque (#1B1B1B,
  5,5:1 sur #ff5a0a, 6,5:1 sur #ff761b ; le blanc y fait 3,1 et 2,7). Un
  hôtel sans cette clé garde le blanc. La pastille de l'hôtel suit la même
  règle (elle était blanche sur la maquette).

### Ce que Barbaros a fait corriger en voyant le site réel (21/10/2026)

À sa question « est-ce 10/10 partout ? », la réponse a été non, avec la liste ;
il a dit « corrige, mais pas besoin que la page réception soit en anglais »
(les textes du moteur restent donc en français en mode EN, c'est voulu).
- **« Nous vous contacterons au … »** parlait à la réception comme au client :
  au comptoir c'est « Le client sera contacté au … » (`tel_relu_comptoir`).
- **L'écran du bon après réservation** tenait sur 1180 px (« Départ » et sa
  valeur à un mètre l'un de l'autre) : une colonne de 720 px, l'action de
  l'hôtel en tête, « Voir le bon du client » et « Réserver une autre course »
  côte à côte. Le bon garde ses couleurs fixes.
- **Sur téléphone, les deux tuiles de la liste** centraient leur contenu :
  une phrase de trois lignes à côté d'une de deux décalait les titres. Ils
  sont alignés en haut.

### Les pièges rencontrés en l'implémentant

- **Le moteur rallumait « Départ / Arrivée » en cherchant ses boutons dans
  le bandeau** (`hotelTete.querySelectorAll`). Déplacé dans la carte du
  trajet, aucun ne se rallumait : la recherche suit maintenant le bouton
  (`b.parentNode`), un mot changé dans `index.html`.
- **`.champ{display:flex!important}` battait l'attribut `hidden`** :
  « Dès que possible / Programmer » s'affichait à côté de la date. Une règle
  en fin de bloc garde caché tout `[hidden]` des écrans du comptoir.
- **Ce que la #392 avait retiré du comptoir revenait** : « Prix annoncé à
  l'avance · Réglé au chauffeur » était masqué par `.reserver > .rassure` ;
  rangé dans la colonne de droite, il n'était plus un enfant direct. Il est
  masqué à sa nouvelle place.
- **Sur téléphone, les tuiles passaient SOUS le bandeau** qu'elles
  chevauchent : un bandeau positionné se peint au-dessus d'un frère qui ne
  l'est pas. Les cartes portent `position:relative; z-index:1`.
- **Une règle d'avant, plus précise, gagnait encore** (taille de la
  pastille, ombre du bandeau photo, cadre des champs du client) : le bloc V2
  reprend les mêmes sélecteurs, plus précis, en fin de fichier.

## Le thème d'un partenaire — l'histoire (septembre–octobre 2026)

- **LES COULEURS SONT RANGÉES SUR L'HÔTEL** (`HOTELS[x].marque`), pas dans
  le CSS, exactement comme sa grille : le partenaire suivant sera peut-être
  bleu. Le CSS ne connaît que des rôles, et tout est sous `body.hotel` — le
  site public ne change pas d'un pixel. Un contrôle mesure la couleur
  **calculée** du bouton public : une règle trop large se voit à l'écran,
  pas dans la feuille de style.
- **LES VALEURS SONT MESURÉES (WCAG), PAS CHOISIES À L'ŒIL.** Du blanc sur
  l'orange du logo `#FF6600` donne **2,94 : illisible**. Les boutons portaient
  donc `#C2410C` (blanc à 5,18) ; l'orange vif tenait les **bandeaux**, où le
  texte est en charbon (5,87). Le bloc d'aide est en `#FFF1E8` / `#7C2D12`
  (8,48).
- **TOUS LES BOUTONS ORANGE, SAUF CEUX QUI VIVENT DANS UN BANDEAU**
  (septembre 2026, à sa demande : « fait en orange les parties noires
  dédiées à easyHotel »). Ils étaient charbon, au motif qu'un bouton orange
  sous un bandeau orange efface la hiérarchie — il n'en a pas voulu, et la
  règle qui restait était une **mesure** : `#C2410C` sur le fond clair donne
  5,18 avec du blanc, mais **posé SUR l'orange vif il tombe à 1,76** et
  disparaît.
- **LA RÈGLE VISE `.bouton`, PAS QUATRE IDENTIFIANTS.** C'était une liste
  d'identifiants, donc la liste des boutons qui existaient le jour où elle a
  été écrite : « Confirmer » n'y était déjà pas.
- **LA TÊTE DE L'ÉCRAN RÉCEPTION PORTAIT LE BANDEAU DU PARTENAIRE** : une
  réception qui ouvre cette page vingt fois par jour doit reconnaître la
  sienne du premier regard. Remplacé le 21/10/2026 par le bandeau bleu nuit
  et la photo de SON comptoir, qui le disent mieux.
- **PIÈGE : `class="carte"` N'EXISTE DANS AUCUNE RÈGLE DE CE SITE.** L'écran
  du code la portait — héritée de l'ancien site — donc ni fond, ni marge. Une
  classe morte ne se voit pas en relisant le HTML, et elle ramassera un jour
  une règle écrite pour autre chose.
- **L'ORANGE NE DESCEND PAS DANS LA LISTE.** Il est à **24° de teinte** du
  rouge de l'attente (`#C9302F`) : côte à côte, les deux se disputeraient
  l'attention et plus rien ne crierait.
- **« CONFIRMÉE » EST RESTÉE VERTE** : passée à l'orange du partenaire, la
  pastille disait la **marque** et non plus l'**état**. Une couleur d'état ne
  se négocie pas avec une charte.
- **AUCUNE PHOTO NI LOGO D'easyHotel SANS ACCORD.** Barbaros en a envoyé
  cinq : trois sur quatre étaient des **vignettes** de résultats de
  recherche (275 × 182 pour 23 Ko…), et la seule exploitable venait
  d'Internet. Une photo appartient à son photographe (L335-2 CPI) ; un logo
  est une **marque déposée**. « C'est seulement pour la réception » ne change
  rien : la page a une adresse publique. Ce qui reste licite et suffit : leur
  orange et leur nom écrit (usage descriptif). La photo du comptoir posée le
  20/10/2026 est la SIENNE.
