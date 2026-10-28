# Le mode hôtel et la page du QR — histoire

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## LE MODE HÔTEL — LA GRILLE D'UN PARTENAIRE, DANS LE MÊME FICHIER

Septembre 2026, à sa demande, à partir du flyer easyHotel qu'il a fait
imprimer. Une réception réserve entre deux arrivées : elle lit la ligne du
papier posé sur son comptoir, elle appuie dessus, elle annonce le prix.

**CE N'EST PAS UNE PAGE À PART, ET C'EST LA DÉCISION QUI STRUCTURE TOUT.**
La question lui a été posée ; il a choisi l'écran dans `index.html`. Une
page autonome aurait voulu dire un second logo, un second jeu de couleurs,
une seconde grille — et surtout **tout à réécrire dedans** : le dépôt sur le
serveur, la provenance, le préavis de 15 minutes, la date, le téléphone, les
suites de tests. Une réception qui rate son envoi WhatsApp depuis sa
tablette, et la réservation n'existe nulle part — c'est exactement le défaut
corrigé quelques jours plus tôt. Ici : même fichier, même tunnel, même
dépôt ; seule l'ENTRÉE change. Rien à ajouter à `construire.sh`, et c'est
l'un des gains.

- **L'adresse est `?h=easyhotel-aeroville`.** `?h=` servait déjà à l'affiche
  QR d'un hôtel quelconque ; il reconnaît maintenant d'abord un
  **partenaire connu** (par sa clé, son nom ou ses alias) et ouvre l'écran
  de réception. Un hôtel non partenaire garde le comportement d'origine —
  son nom va dans le champ de départ, rien d'autre ne change. Un test
  verrouille les deux chemins.
- **LA GRILLE EST CELLE DU PAPIER, AU CENTIME**, et c'est le seul endroit du
  dépôt où recopier des nombres dans un test est juste : le flyer est la
  référence, l'écran est le copiste. Berline / Van, jour / nuit, sept
  destinations. **Ne jamais « corriger » ces montants** pour les rapprocher
  du kilométrage : sur les longues courses le van est **volontairement**
  moins cher que le site, c'est un prix d'appel pour décrocher l'hôtel,
  tranché par Barbaros.
- **IL N'Y A PLUS DE TARIF DE NUIT** (22 septembre 2026). C'était la dernière
  majoration du projet : elle est partie avec `nuitHotel()`, l'écriteau
  `#noteNuit`, les clés `hotel_nuit` / `nuit_hotel` des deux langues, et les
  champs `jour`/`nuit` de `HOTELS`, remplacés par **un seul `forfait`**.
  - **LE DÉPÔT ET LE SITE PUBLIÉ DISAIENT DEUX PRIX DIFFÉRENTS**, et une
    seule des deux vérités était facturée. Le dépôt portait la grille avec
    nuit ; appliquer-regles-easyhotel.mjs (supprimé depuis, voir plus bas)
    la réécrivait au moment de
    construire. Une divergence qui ne se voit pas : le prix s'affiche des
    deux côtés. `HOTELS` est désormais aligné sur la **source serveur**
    (`20260916100000_current_tariff_source.sql`), qui ne déclare qu'un
    forfait par gamme, et le transformateur n'a plus à corriger les tarifs.
  - **LE TROU QUE CE TRAVAIL A DÉCOUVERT, ET IL ÉTAIT EN LIGNE** : le
    transformateur remplaçait `var nuit = nuitHotel(...)` dans le calcul,
    mais l'écriteau lisait `nuitHotel()` **directement**, à un second
    endroit jamais réécrit. Entre 21 h et 6 h, le site publié annonçait donc
    « **Tarif nuit (21 h – 6 h) appliqué** » sur un prix **rigoureusement
    identique à celui du jour**. Mesuré, pas déduit. *Un transformateur qui
    corrige un calcul à un endroit et l'oublie à l'autre ne se voit pas.*
  - **LE GARDE-FOU DU CHANTIER ÉTAIT QUE LE PRIX NE BOUGE PAS.** Relevé
    avant, remesuré après : les sept destinations, aux deux gammes, à 10 h,
    22 h 30 et 4 h du matin, rendent exactement les montants de la source
    serveur. Un refactor du prix qui ne se compare pas à l'avant n'est pas
    un refactor, c'est un pari.
  - **`test-nouveau-hotel` NE FIGE PLUS AUCUN MONTANT** : il **lit** la
    source serveur et éprouve l'ACCORD. Une baisse décidée par Barbaros
    touche la source et la suite reste verte ; n'en toucher qu'un tombe, et
    le message nomme la destination et l'écart. Éprouvé deux fois — tarif de
    nuit réintroduit (11 contrôles tombent, chacun nommant le montant),
    écriteau remis (3 contrôles tombent). Les deux défenses sont éprouvées
    séparément, comme le bouton d'accès du comptoir.
  - **LES CGV ONT SUIVI, DANS LES DEUX LANGUES** — et elles avaient un trou
    plus ancien : la réécriture du 16 septembre avait emporté **tout le
    paragraphe du forfait partenaire**. On facturait donc un forfait de 35 €
    pendant que les CGV décrivaient un calcul au kilomètre. Même faute que
    l'option pancarte perdue au même endroit. Le paragraphe est rétabli,
    **sans aucun chiffre** — c'est ce choix d'écriture qui a évité que les
    erreurs de grille deviennent contractuelles — et la date de mise à jour
    a suivi : *un document légal qui change sans que sa date change est
    lui-même trompeur.*
- **CE QU'IL A CHANGÉ EN VOYANT LE FLYER** (septembre 2026) : le supplément
  van de 10 € est **supprimé**, l'aéroport CDG en berline passe de 25 à
  **35 € de jour et 40 € de nuit**, et les capacités s'alignent sur le site
  — **berline 4 places, van 7**, alors que le papier annonce 1–3 et 4–7.
  **Le flyer imprimé est donc périmé sur ces trois points** : à lui de le
  refaire avant de le distribuer.
- **LE NUMÉRO DU FLYER EST BON** — `+33 7 59 31 24 33`, le même que celui
  du site (`tel:+33759312433`). Il avait été signalé comme faux : c'était
  une **erreur de lecture de l'image**, un chiffre compté en trop. Barbaros
  l'a confirmé. Ne pas rouvrir le sujet.
  La leçon vaut au-delà : **on ne lit pas des chiffres sur une photo pour
  en tirer une alerte**. Quand un nombre compte, le comparer à une source
  du dépôt — ici `tel:+33759312433` était à un `grep` de distance et
  aurait tranché tout de suite.
- **LE FORFAIT VAUT DANS LES DEUX SENS**, à sa demande. Et l'échange des
  deux champs est **réel**, pas une inversion au moment de l'envoi : c'est
  ce qui fait que tout le reste tombe juste sans une ligne de plus — le
  numéro de chambre ne s'ouvre que sur un hôtel au DÉPART (un client qui
  arrive n'a pas encore de chambre), le numéro de vol prend sa formulation
  d'arrivée, et la pancarte n'est proposée que sur une prise en charge en
  aéroport, c'est-à-dire exactement ce retour-là.
- **« AUTRE DESTINATION » EST LA SORTIE**, et il l'a demandée. Sans elle,
  une réception qui envoie un client à Versailles rouvre le site public et
  **la provenance est perdue** — on ne saurait plus ce que l'hôtel rapporte,
  qui est toute la raison de cette page. Elle rend la main au calcul
  kilométrique ordinaire, et elle le **dit**.
- **« PARIS » N'EST PAS UNE ADRESSE**, c'est une ville de dix kilomètres de
  large. Le forfait de 80 € s'affiche d'emblée — c'est ce que la réception
  annonce pendant qu'elle saisit — mais il **tombe** si l'adresse retenue
  est à plus de 7 km du centre : un « Versailles » tapé là vendrait 45 km au
  prix de 10. On mesure la distance au centre et **pas le code postal**, qui
  n'est qu'un morceau de libellé écrit différemment selon la source.
- **LE TERMINAL VIENT DE `AEROPORTS`**, la table que le site tient déjà pour
  la recherche d'adresse. Deux listes de terminaux finiraient par diverger,
  et c'est celle qu'on oublie qui enverrait la voiture au mauvais bout de
  Roissy. Le libellé reprend **exactement** la forme du site (« Terminal 2E
  — Aéroport… ») : c'est elle que lit `terminalDuLibelle`, et c'est elle qui
  ouvre le champ « numéro de vol » et l'option pancarte. Un aéroport à un
  seul terminal (Beauvais) n'affiche pas le menu — on ne fait pas choisir
  entre une seule chose.
- **LES COORDONNÉES DE L'HÔTEL SONT DEMANDÉES À LA BASE ADRESSE
  NATIONALE**, comme n'importe quelle adresse du site. Celles écrites dans
  `HOTELS` ne sont qu'un **secours** pour une réception hors ligne. Elles ne
  changent aucun forfait — ils sont fixes — mais elles font le kilométrage
  d'« autre destination ». Le test donne au faux service des coordonnées
  **différentes** du secours et lit l'URL envoyée au calculateur : c'est la
  seule façon de savoir laquelle des deux a servi. Même leçon que le faux
  GPS de la géolocalisation.
- **LA GRILLE NE SORT PAS DANS GOOGLE** : `robots.txt` écarte `?h=`, et la
  page **réécrit** sa propre balise `robots` en `noindex`. On la RÉÉCRIT, on
  n'en ajoute pas une seconde : la page en porte déjà une, et deux consignes
  contradictoires dans la même en-tête ne se découvrent qu'en voyant la page
  rester dans les résultats des semaines plus tard. Un contrôle vérifie
  qu'il n'y en a **qu'une**, et un autre que le site public garde « index » —
  poser `noindex` sur le site ordinaire le sortirait de Google en entier.
- **LES ONGLETS « RÉSERVATIONS » ET « TRAJETS » RESTENT.** Ils avaient été
  masqués — la tablette d'un comptoir est un appareil partagé, et ces listes
  y accumulent les noms, téléphones et adresses de tous les clients passés
  devant. Mais le QR du flyer est aussi scanné par les **clients**, sur leur
  propre téléphone : les masquer leur retirait l'accès à leur réservation.
  Le mal certain était plus grand que le mal possible. **Si la tablette de
  la réception est vraiment partagée, la réponse est la navigation privée**,
  pas un onglet caché.
- **`hotelNom` ÉTAIT DÉJÀ PRIS** par le champ de l'affiche QR, dans l'espace
  exploitant. Deux éléments pour un identifiant, et `getElementById` rend le
  premier venu. Même faute que `btnNouvelleCourse`. Un contrôle cherche
  désormais **tous** les identifiants en double de la page.
- **LES CGV DÉCRIVENT LE FORFAIT PARTENAIRE**, dans les deux langues : il
  remplace le calcul kilométrique, il n'est ni arrondi ni soumis au montant
  minimum, sa majoration de nuit lui est propre, et toute destination hors
  grille revient au kilométrage. Toucher à un prix veut dire toucher aux
  CGV.
- `test-nouveau-hotel.mjs`, 90 contrôles ; `test-nouveau-reception.mjs`, 73.

### LA PAGE DU QR easyHotel EST UN TUNNEL — ET LA GRILLE DU FLYER A CHANGÉ

22 septembre 2026, à sa demande (« refonte finale 10/10 »). `sites/easyhotel-client/`
était une vitrine : bandeau photo, « Pensé pour votre séjour », trois
destinations, puis une seconde invitation à « voir toutes les destinations ».
Elle devient : l'hôtel, puis **« Où souhaitez-vous aller ? »** et les **sept
destinations du flyer** avec leurs deux prix, puis « Autre destination ».
Un clic ouvre le moteur avec l'hôtel ET la destination déjà posés.

**LA GRILLE A ÉTÉ TRANCHÉE PAR LUI**, sur question, et elle diffère de ce que le
site facturait : Orly **90 / 130**, Le Bourget **35 / 70**, Disney **80 / 120**,
Paris **80 / 120** (CDG 35/50, Beauvais 180/240, Villepinte 35/50 inchangés).
Le Bourget berline à 35 € contredisait sa propre mission (45 €) : il l'a
**confirmé à la relecture** (23/09/2026). C'est 35 €, ne pas le « corriger ».
- **TROIS ENDROITS, UN SEUL PRIX, ET UN CONTRÔLE QUI L'EXIGE.** `HOTELS` dans
  `index.html`, la source serveur (`20260916100000_current_tariff_source.sql`),
  et les cartes de la page du QR. `verifier-tarif-hotel.mjs` exige l'accord des
  trois à chaque PR de prix et **nomme** la destination et les trois valeurs.
- **LE SERVEUR REMPLACE LE PRIX DU CLIENT** (`deposer-course`, `snapshotPartenaire`).
  Tant que la source serveur n'est pas **rejouée en production** (workflow
  « Appliquer une migration Supabase », fichier
  `20260916100000_current_tariff_source.sql` — ses forfaits sont un *upsert*,
  le rejouer met la base à jour), une course easyHotel est **enregistrée à
  l'ancien montant** alors que le client a vu le nouveau. **C'est le geste qui
  suit la fusion, pas une option.**
- **PAS DE PHOTOS, ET C'EST UNE DÉCISION D'EXPERT QU'IL A DÉLÉGUÉE.** Le dépôt
  n'a aucune image propre d'Orly, du Bourget, de Beauvais ni de Villepinte, et
  on ne pose pas une image dont on ne connaît pas l'auteur (L335-2 CPI) — ni le
  château Disney, ni la tour Eiffel illuminée. Les **codes d'aéroport**
  (CDG, ORY, LBG, BVA) et trois pictogrammes dessinés disent la destination plus
  vite qu'une photo, et la page ne télécharge plus que le logo. Le logo
  easyHotel n'est pas posé non plus : leur nom écrit et leur orange suffisent.
- **« Autre destination » passe `?dest=autre`**, que `hotel-engine-polish.js`
  traduit en l'option à valeur VIDE du moteur. Sans cette traduction, le moteur
  ouvrait sur CDG **au forfait** — un Versailles facturé 35 €.
- **Les liens légaux passent `?doc=mentions|privacy`**, lus par `index.html`
  (trois valeurs connues, rien d'autre). Un lien vers l'accueil obligeait à
  chercher le document.

**LE PRIX DU FLYER SUIT LE LIEU, PAS LE MENU** (23/09/2026, à sa demande :
« peu importe l'adresse ça doit être le même prix que le flyer », « Autre
destination » compris). Une adresse tapée dans « Autre destination » — ou
dans « Paris » — qui tombe dans une destination du flyer prend son forfait,
et l'écran **nomme** la destination reconnue (« Tarif du flyer (Orly) : … »).
- **On mesure une distance, pas un mot** (`destDuPoint()`) : un aéroport à
  moins de `RAYON_AEROPORT_KM` (2 km) d'un de ses terminaux — la table
  `AEROPORTS` — ; Le Bourget 2,5 km, Villepinte 1,5 km, Disney 3 km, Paris
  7 km (`rayonKm` sur chaque destination de `HOTELS`). « Orly » dans un
  libellé peut être la rue d'Orly à Montreuil.
- **La destination reconnue part sur la course** (`destHotelRetenue()`, lue
  par `public-booking-gateway.mjs` pour `destinationCle`) : le serveur la
  recroise avec sa grille comme pour un choix du menu.
- Hors de toutes les zones (Versailles), rien ne change : kilométrage hôtel,
  et on le dit. `test-nouveau-hotel` éprouve les deux côtés.

**LE COMPTOIR SUIT LE MÊME PARCOURS** (23/09/2026, à sa demande : « même
logique que le site client hôtel »). `/easyhotel-client/?reception=easyhotel-aeroville`
est la MÊME page que celle du QR : les liens des cartes passent en
`?reception=`, les phrases parlent à la réception, et un bouton
« Réservations de l'hôtel » ouvre la liste (`&vue=reservations`, lu par
`hotel-engine-polish.js`). **Pas de seconde page** : elle aurait recopié les
sept prix, soit un quatrième endroit à tenir.
- `hotel-engine-polish.js/.css` s'appliquent désormais aux deux entrées
  (`.hotel-enhanced`, plus `body.hotel:not(.reception)`).
- **Nom et téléphone exigés au comptoir aussi** (11/10/2026) : le lien de
  paiement part sur ce numéro. La chambre, facultative, se range sous le nom.
- **Photo client** (`photoEntete`) : vidée le 20/10/2026 (CDN d'easyHotel, sans
  accord) ; jamais une adresse `http`, seulement `/photos/…`. **Remise le
  25/10/2026 avec LA SIENNE** : le bâtiment, photographié par Barbaros (deux
  prises, il a choisi celle sans personne devant la porte), recadré sans
  l'enseigne du toit, sans données de position, 1600 px, 66 Ko
  (`photos/easyhotel-aeroville-batiment.webp`). Aussi en fond du bandeau de
  la page du QR : nette en haut, voile bleu nuit plein sous le texte (à
  droite sur ordinateur) — réglage « C » choisi sur capture contre un voile
  plus léger où le bâtiment ne se voyait pas. `test-easyhotel-client` mesure
  chaque texte du bandeau au pixel le plus clair derrière lui. **Comptoir**
  (`photoComptoir`, 20/10/2026) : SA photo, dans le bandeau bleu nuit (≤ 190 px,
  voile plein sous le texte), dès 600 px ; jamais de fond de page (`test-reception-bon`).

**VERT = REMPLI, ROUGE = IL MANQUE** (23/09/2026, à sa demande), sur les deux
entrées easyHotel, dans `hotel-engine-polish.js/.css` (classes `eh-ok`,
`eh-manque` — préfixées : `.ok` et `.ko` existent déjà ailleurs).
- **LE DÉFAUT QUE ÇA A RÉVÉLÉ, EN LIGNE** : côté client, le nom et le
  téléphone sont sur la première page, mais « Confirmer », deux écrans plus
  loin, les contrôlait et affichait son erreur sur la page CACHÉE. Mesuré :
  le client appuyait, rien ne bougeait. Le contrôle se fait maintenant à
  « Voir mon prix », avant de quitter la page des champs.
- **Rien de pré-rempli n'est vert d'office** (date, heure ; au comptoir aussi
  destination, terminal, passagers, bagages) : vert dès qu'on y touche.
- **Au comptoir le bouton est grisé** tant qu'aucune gamme n'est choisie ; un
  bouton grisé ne reçoit pas le clic. On écoute le doigt posé sur sa surface
  (`pointerup`) pour montrer quand même ce qui manque.
- La mention écrite accompagne toujours la couleur (« Obligatoire », « Si pas
  de chambre », « Numéro incomplet ») : la couleur ne porte jamais le sens seule.

**LE DÉFAUT LE PLUS GRAVE N'ÉTAIT PAS SUR LA PAGE, IL ÉTAIT EN LIGNE DEPUIS LE
15/09 : LE MOTEUR easyHotel SE FIGEAIT.** `hotel-engine-polish.js` réécrivait le
nom de l'hôtel à chaque passage, sous un `MutationObserver` qui le rappelait à
chaque mutation — or réécrire un texte identique **est** une mutation. Une
boucle de micro-tâches qui ne rend jamais la main : la page ne répondait plus,
et la minuterie qui devait couper l'observateur ne pouvait jamais s'exécuter.
**Mesuré sous Chromium, pas supposé** : figée avec le script, vivante sans lui,
vivante avec la seule ligne corrigée (on n'écrit que si le texte diffère).
**AUCUNE SUITE NE POUVAIT LE VOIR** : ce script n'est injecté que par
`construire.sh`, et toutes les suites hôtel éprouvent le **dépôt**.
`test-easyhotel-client.mjs` construit et sert le site lui-même, parcourt les
sept cartes jusqu'à l'écran des prix, et **tombe** si l'on remet la boucle.

**LE BLOC « Destinations populaires » DU MOTEUR EST RETIRÉ.** Il répétait le choix
de la page du QR, et sa vignette « Villepinte / Le Bourget » choisissait
**Villepinte** : un client du Bourget partait à la mauvaise adresse, à un autre
prix. Sur ordinateur, sa colonne restait vide : le formulaire est désormais
centré (`hotel-engine-polish.css`).

## LES PRIX DU FLYER SE RÈGLENT HÔTEL PAR HÔTEL

29 septembre 2026, à sa demande. Réglages → « Prix du flyer, par hôtel » :
un menu d'hôtel (tous ceux de `HOTELS`), puis un tableau Destination ×
Berline / Van. C'était une liste à plat de quatorze champs.
- **Seuls les prix modifiés partent** (`data-initial` sur chaque champ) ; un
  prix modifié est bleu jusqu'à l'enregistrement.
- **Le défaut que ça a corrigé** : un champ vidé valait `Number("") = 0` et
  passait le contrôle — l'ancien bouton aurait écrit un forfait à **0 €**.
  Un montant vide est maintenant refusé, et le message nomme la ligne.
- Un hôtel absent de `HOTELS` n'apparaît pas : il n'a pas de page sur le
  site. En ajouter un reste un travail de code.
- `test-admin-forfaits.mjs` lit ce qui part au serveur ; il tombe si l'on
  renvoie les quatorze prix à chaque fois.
