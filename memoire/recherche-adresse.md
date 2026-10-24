# La recherche d'adresse et « Me localiser » — histoire

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## « ME LOCALISER » — ELLE REND UNE ADRESSE, PAS UNE POSITION

Septembre 2026, à sa demande : « ajoute la géolocalisation pour les
clients ». Le client est à Roissy, téléphone dans une main et valise dans
l'autre : lui faire taper « Aéroport Charles-de-Gaulle, Terminal 2E » est
le moment où l'on perd une réservation.

- **SEULEMENT AU DÉPART.** L'arrivée est là où l'on va, pas là où l'on est.
  Le bouton **remplace le chevron** de ce champ au lieu de s'y ajouter :
  deux pictogrammes au même endroit, l'un décoratif et l'autre cliquable,
  et le client appuie sur le mauvais.
- **UN POINT GPS NE SERT À RIEN.** Le chauffeur a besoin d'une adresse à
  composer dans son navigateur, et le bon d'un libellé à écrire. La
  position est donc relue par la **Base Adresse Nationale**
  (`/reverse/`) ; si elle ne rend rien — une bretelle, un champ — on le
  **dit** au lieu d'accepter une course vers des coordonnées nues.
- **LES COORDONNÉES RETENUES SONT CELLES DE L'ADRESSE, PAS DU GPS.** Le
  prix se calcule sur le trajet que le chauffeur fera vraiment. Le test
  donne au faux GPS et à la fausse BAN des points **différents**, et lit
  l'URL envoyée au calculateur d'itinéraire pour savoir lequel est sorti —
  un test qui regarde dans le moteur ne prouve pas ce que fait la voiture.
- **`brancher()` REND MAINTENANT UNE PRISE `poser(item)`**, et ce n'est
  pas un confort. Écrire dans `champ.value` depuis l'extérieur ne
  déclenche aucun `input` : `choisi` resterait nul, la garde qui invalide
  les coordonnées ne s'armerait donc jamais — elle ne se déclenche que si
  une adresse a été retenue — et le client qui corrige son adresse à la
  main partirait avec les coordonnées d'un endroit et le nom d'un autre.
  **Le prix est ferme, donc opposable : ce serait faux ET opposable.**
- **TROIS MESSAGES DISTINCTS**, parce qu'ils appellent trois gestes
  différents : refus (« autorisez-la dans les réglages »), pas d'adresse
  ici (« saisissez-la »), panne (« saisissez l'adresse »). Un seul message
  « ça n'a pas marché » ne dit pas quoi faire.
- **On invite à VÉRIFIER l'adresse.** Le GPS d'un téléphone se trompe
  couramment de plusieurs dizaines de mètres, donc de numéro dans la rue —
  et le chauffeur va à l'adresse écrite.
- **La règle du lieu s'applique**, sans rien de spécial à écrire :
  `poser()` appelle le même `quand()` que la liste, donc `jugerZone()`. Un
  test l'éprouve depuis Lille — pas de porte dérobée.
- **`data-t-aria` a été ajouté à `appliquerLangue()`.** Un bouton dont le
  seul contenu est un dessin n'a que son `aria-label` à dire ; non
  traduit, il reste en français dans le lecteur d'écran d'un client
  anglophone — le seul endroit où le texte compte pour lui.
- **44 px de côté**, et **aucun `position:relative`** : le bouton est un
  élément de la rangée flex du champ. C'est délibéré — sur l'ancien site,
  un `position:relative` posé sur un bouton déjà placé en absolu l'avait
  fait retomber dans le flux, à gauche du champ d'adresse.
- **RIEN N'EST CONSERVÉ** : la position remplit le champ puis est oubliée.
  Ce qui part sur le bon est l'adresse, comme si le client l'avait tapée.
  **La politique de confidentialité annonçait déjà « Me localiser »**
  depuis l'ancien site — elle décrivait une fonction qui n'existait pas,
  c'est réglé. Deux contrôles le verrouillent.
- **Piège de capture, pas de code** : à 390×560 la page se remet en page
  et la pastille WhatsApp remonte sur le champ. Mesuré à la vraie hauteur
  (390×844), le bouton est à 404–448 px et la pastille à 686–740, non
  affichée. **Toujours capturer à 844 px de haut.**

## LA RECHERCHE D'ADRESSE RAPPROCHE DE PARIS, ELLE N'EXCLUT RIEN

28 septembre 2026, à sa demande : « il doit m'aider à trouver les adresses
logiques en Île-de-France, pas me proposer une rue dans le sud de la
France ». Sur un nom de rue courant (« rue de la Paix », « rue de la
Gare »…), qui existe par dizaines dans toute la France, la liste pouvait
mettre en tête une ville à 800 km sans rapport avec la zone desservie.

**LE TROU ÉTAIT DANS LA BASE ADRESSE NATIONALE, PAS DANS PHOTON.** Photon
portait déjà un biais vers Paris (`lat=48.8566&lon=2.3522` dans
`itineraire-partage.js`) ; la BAN — celle qui répond aux adresses postales,
donc la branche que prend une saisie commençant par un chiffre, la plus
fréquente du site — n'en portait AUCUN. `depuisBAN()` porte maintenant le
même biais.
- **CE N'EST PAS UNE EXCLUSION, ET C'EST VOULU.** `&lat=` / `&lon=`
  RAPPROCHENT sans jamais retirer un résultat : un client qui part
  vraiment de Bordeaux garde sa rue dans la liste, elle descend juste. Ce
  qui se décide (le prix, l'étranger sur devis) se juge au moment du CHOIX,
  pas à la recherche — chercher et réserver sont deux moments différents.
- **LE CLASSEMENT DE `chercher()` (index.html) TENAIT COMPTE DU TEXTE,
  JAMAIS DE LA DISTANCE.** Deux rues homonymes arrivaient donc à égalité
  de score, et c'était l'ordre brut renvoyé par le serveur qui décidait —
  sans rapport avec ce que cherche un client d'Elatransfer. `note()` ajoute
  maintenant un bonus pour ce qui tombe dans les 90 km (`CENTRE_RECHERCHE`,
  `RAYON_RECHERCHE_KM`) via `bonusDistance()`.
- **LE CENTRE DE PARIS EST RECOPIÉ, PAS PARTAGÉ**, à trois endroits
  maintenant (Photon, `note()`, et `CENTRE_ZONE` de la zone desservie plus
  bas) : c'est un fait géographique stable, pas une grille tarifaire
  appelée à changer — même raisonnement que la répétition déjà acceptée
  entre Photon et la zone desservie.
- **Validé** : les suites `test-nouveau` (recherche d'adresse), `-hotel`,
  `-geoloc`, `-itineraire`, `test-admin-prix` restent toutes vertes. Et
  éprouvé pour de vrai — une fausse BAN qui rend Marseille EN PREMIER,
  avant Paris : la page réordonne, Paris passe devant.

**LE SEUIL UNIQUE A ÉTÉ REMPLACÉ PAR UN DÉGRADÉ** (même jour, à sa demande :
« fait ce que tu penses être le meilleur sans restreindre le client »). Une
seule coupure à 90 km traitait Melun (50 km, dans la zone), Tours (220 km,
une vraie destination qu'on sert de vive voix — voir « la zone desservie »
plus bas) et Marseille (660 km) de la même façon dès qu'on sortait des
90 km : même pénalité pour un client plausible et pour un homonyme sans
rapport. `bonusDistance(km)` (`itineraire-partage.js` n'est pas concerné,
c'est une fonction de `index.html`) :
| Distance | Bonus |
|---|---|
| ≤ 90 km (la zone desservie) | +3 |
| ≤ 200 km (grande couronne élargie, villes limitrophes) | +1 |
| ≤ 400 km (une vraie destination lointaine) | 0 |
| > 400 km | −2 |
- **TOUJOURS AUCUNE EXCLUSION** : le dernier palier redescend, il ne retire
  rien — même règle que le palier unique qu'il remplace.
- **LA BAN EST INTERROGÉE PLUS LARGE** (`limit=10`, pas 6). Sur un nom de
  rue courant, six homonymes suffisaient à remplir la liste de villes de
  province avant que le classement ait un exemplaire francilien à faire
  remonter — le tri se fait ensuite, ici on lui donne seulement plus de
  candidats à trier. Même raisonnement que le `limit=15` déjà admis chez
  Photon pour les noms de chaîne.
- **Éprouvé** : Melun (50 km) et Paris ressortent avant Tours (220 km),
  qui ressort avant Marseille (660 km) — un dégradé à trois vraies marches,
  pas seulement Paris contre le reste. Les suites `test-nouveau`, `-hotel`,
  `-geoloc`, `-itineraire`, `test-admin-prix` restent toutes vertes.

**« SACRÉ COEUR », « CHAMPS ELYSEE », « AMST » — CE QU'ON CHERCHE PAR SON NOM
PASSE DEVANT** (30/09/2026, à sa demande : « il me propose des bars alors que
je parle de la basilique… amst doit montrer la rue d'Amsterdam mais aussi
Amsterdam aux Pays-Bas »). Trois causes, lues dans le code (le réseau d'ici
ne joint ni la BAN ni Photon) :
- **« œ » n'était pas ramené à « oe »** par `sansAccents` (NFD ne défait pas
  une ligature) : « coeur » ne retrouvait pas « Cœur », et le bar écrit
  « Coeur » passait devant la basilique.
- **Un lieu de culte n'était dans aucune catégorie** (`categorieDuLieu` :
  `place_of_worship` et la clé `historic` vont maintenant en « culture »), et
  une avenue n'avait pas le bonus de « lieu nommé » des commerces qui portent
  son nom. `note()` : +3 à un monument qui répond au nom tapé, +3 à une rue
  dont tout le nom est tapé (la BAN garde son `type`), −2 à un bar ou un
  restaurant si le client n'a écrit ni « restaurant » ni « bar »… Rien n'est
  retiré de la liste, l'ordre seul change.
- **Photon était filtré sur la France.** Le filtre est retiré : l'étranger
  apparaît, plus bas (`bonusDistance`), avec son pays écrit (« Amsterdam,
  Pays-Bas »). **L'étranger se juge au moment du CHOIX** : Amsterdam affiche
  « Destination hors de France » et part sur devis — décidé, on ne vend pas
  un Paris → Amsterdam en ligne au prix du kilomètre.
`test-nouveau-recherche.mjs` rejoue ses trois exemples, réponses données
dans l'ordre le plus défavorable ; sur l'ancien code il rend exactement ce
qu'il voyait (le bar en tête, l'hôtel avant l'avenue, pas d'Amsterdam).

## LE MOTEUR DE RECHERCHE DE LIEUX — FAIRE ÉVOLUER, PAS REFAIRE

4 octobre 2026, mission « moteur 10/10 ». On garde BAN + Photon.
**MAPBOX SEARCH BOX N'EST PAS BRANCHÉ, C'EST UNE DÉCISION** : ses résultats
sont « temporaires » (une réservation doit GARDER le lieu ; l'offre permanente
ne couvre pas les lieux), ils doivent s'afficher sur une carte Mapbox, et il
faut une carte bancaire. Conditions lues dans des citations, pas sur leur
texte (mapbox.com est bloqué d'ici) : à relire avant de rouvrir le sujet.
- **Une panne n'est plus mise en cache** comme « aucune adresse » ; la liste
  dit « Recherche momentanément indisponible » (`liste.echec`).
- **L'admin choisit ses lieux** : `crDepart`/`crArrivee` passent par le même
  `brancher()` que le site. Un texte tapé sans choisir est résolu au premier
  résultat, et l'écran dit « Adresse prise d'office : vérifiez-la ».
- **Lieu structuré** `course.departLieu`/`arriveeLieu` (`lieuStructure()`,
  depuis un élément CHOISI) : nom, adresse, coordonnées, `provider`
  (`ban`/`photon`/`elatransfer`). Les champs texte restent ce qui s'affiche.
  `deposer-course` les garde (il jetait `departPos`), bornés, facultatifs.
  « Modifier la course » efface le lieu d'une adresse retapée.
- Fautes de frappe (`motProche`, `cleProche` sur 6 lettres et plus : « tilly »
  ne doit pas proposer Beauvais-Tillé) ; un nom distinctif (« novotel »)
  passe devant les terminaux ; biais selon le contexte (autre bout, hôtel,
  « Me localiser », Paris) — le classement garde Paris comme référence ;
  Photon dans la langue du client ; `itineraire()` rend sa `source`.
- **Prix au km contrôlé côté serveur : SIGNALER, JAMAIS REFUSER.** Aucune
  route n'est plus courte que la ligne droite : minimum = ligne droite ×
  tarif serveur, arrondi à la dizaine INFÉRIEURE, relevé au minimum. En
  dessous : `securite.prixSousLigneDroite`, « Prix à vérifier » sur le bon
  admin. Un téléphone qui garde un ancien tarif n'est pas une fraude.
- Piège : `pkill -f "http-server …"` tue le shell qui le lance, et le serveur
  reste ouvert. Fermer par numéro de processus, toujours.
- Suites : `test-nouveau-lieux.mjs`, plus des contrôles dans
  `test-nouveau-serveur.mjs` et `test-securite-fonctions.mjs`.
- Reste (P2, à lui) : clé Mapbox Directions ; un second fournisseur de lieux
  qui autorise le stockage ; validation serveur complète ; lien GPS sur le bon.

## LA LISTE ET « ME LOCALISER » N'ATTENDENT PLUS LE PLUS LENT (24 octobre 2026)

Barbaros, capture à l'appui : « quand on clique sur la géolocalisation ça
prend trop de temps, et quand on met une adresse la recherche prend trop de
temps ». Les services réels n'étaient pas joignables depuis le poste de
travail (réseau fermé) : on a mesuré la PAGE, services simulés plus ou moins
lents, sur le site construit.

- **Avant** : `chercher()` attendait `Promise.all` de la BAN et d'un ou deux
  Photon (`variantes()` en ajoute un sans les mots courants). Photon à 3 s :
  liste à 3,1 s, alors que la BAN avait l'adresse en 0,15 s ; Photon muet :
  6,1 s (le délai d'`appeler`) ; BAN muette : 6,1 s. Photon est un serveur
  public gratuit, sans garantie de vitesse.
- **Après** : `chercher(q, ctx, partiel)` rend une liste partielle dès que le
  service qui fait autorité a répondu (la BAN si la saisie commence par un
  chiffre, le premier Photon sinon), après `PATIENCE_MS` (350 ms) pour que
  les autres arrivent ensemble, et au plus tard à `PATIENCE_MAX_MS` (1,2 s)
  si un service a déjà des résultats. Mesuré : 0,6 s dans les trois premiers
  cas, 1,3 s quand la BAN est muette. La promesse rend toujours la liste
  complète, mise en cache comme avant ; l'admin, qui ne passe pas `partiel`,
  ne voit aucune différence.
- **Une ligne visible ne bouge plus** (`recevoir()` dans `brancher()`) : la
  liste complétée garde les lignes déjà montrées, à leur place, et ajoute les
  nouvelles en dessous (`dedoublonner` garde la première occurrence). Dès que
  le client a touché la liste (doigt, molette, défilement, flèches), elle
  n'est plus redessinée. Écarté : redessiner la liste complète par-dessus —
  une ligne qui glisse au moment où le doigt descend, c'est l'adresse d'à
  côté qui est choisie.
- **« Me localiser »** demandait d'emblée les satellites
  (`enableHighAccuracy:true`, jusqu'à 10 s). Il demande d'abord la position
  rapide (Wi-Fi, antennes, une position de moins de deux minutes, 4 s au
  plus) ; il la garde si elle est à `PRECISION_GEO_M` (100 m) près, sinon il
  demande les satellites, et si ceux-ci échouent la position rapide sert
  quand même — le client est invité à vérifier dans tous les cas. Un refus
  arrête tout, sans seconde demande. Le temps des satellites ne se mesure pas
  dans un navigateur simulé : c'est le téléphone de Barbaros qui dira le gain.
- **Une BAN muette se dit panne** (`geo_panne`) : `adresseDuPoint()` rend
  `false` pour une panne et `null` pour un endroit sans adresse. Avant, les
  deux disaient « Aucune adresse trouvée à cet endroit ».
- Suite : `test-recherche-rapide.mjs` (22 contrôles, faux GPS qui note chaque
  demande). Elle tombe sur l'ancien code : 8 échecs.

## LA LISTE DES LIEUX : UNE PASTILLE, LE NOM, L'ADRESSE DESSOUS (24 octobre 2026)

Barbaros, trois captures (« Gare », « Easyhotel », « Hotel ») : « améliore mes
logos des hôtels, aéroports, gares… je trouve que ce n'est pas joli ». Relevé
sur ses captures et sur le site construit :

- **Les pictogrammes** (façade, `--ico-*`) flottaient seuls, 20 px au trait de
  1,75 : pâles, sans rythme d'une ligne à l'autre. Ils sont posés dans une
  pastille de 38 px (fond cyan à 13 %, liseré léger), dessin de 22 px au trait
  de 1,9. Même pastille pour tous les lieux : le DESSIN dit hôtel, gare ou
  aéroport, pas la couleur. Redessinés : le lit (un oreiller lisible) et la
  gare ; la rue n'est plus une route (refusée dans les icônes) mais un panneau
  de direction. La ligne « Mon adresse n'est pas dans la liste » a une pastille
  vide, au liseré.
  **Remplacé le même jour** (voir `memoire/palette.md`, « Les icônes ») : les
  dessins faits main ont laissé place à ceux de Material Symbols, et la
  pastille neutre à un carré pastel, une couleur par type de lieu.
- **Le nom et l'adresse étaient collés sur une ligne.** `deuxLignes()` coupe le
  libellé au tiret long des terminaux, puis au code postal et à la ville de la
  BAN, puis à la première virgule : le nom en gras, l'adresse dessous, plus
  petite. Le séparateur coupé reste dans un `suggest-sep` invisible : le texte
  de la ligne EST le libellé, caractère pour caractère — celui qu'on écrit
  dans le champ, sur le bon et dans le message, et que les suites lisent.
  Hors du site public (admin, pages d'hôtel), sans la façade, la ligne se lit
  comme avant.
- **Le nom d'un lieu posé sur une adresse était jeté.** `libellePhoton()`
  écartait le nom de tout objet de type « house » ; or Photon y range aussi un
  hôtel ou une gare qui a une adresse. Sa capture : « easyHotel » s'affichait
  « 10 Rue de la Belle Borne ». Seul le simple numéro de rue (osm_key
  « place ») est désormais sans nom. Ces lieux redeviennent des « lieux
  nommés » et remontent dans le classement d'une recherche par nom.
- Suite : `test-public-suggestions.mjs` (14 contrôles, site construit) ; sur
  l'ancien code, 10 échecs.
- **Vu sur ses captures, pas encore traité** : « Gare » propose d'abord des
  rues nommées « Gare » en banlieue (la BAN) plutôt que les grandes gares de
  Paris ; « Easyhotel » met un hôtel de Malaisie en deuxième.
