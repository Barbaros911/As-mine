# L'itinéraire — quatre niveaux (archive)

Section de `CLAUDE.md` rangée ici le 11 octobre 2026, telle qu'elle était
écrite, au moment où la route facturée est devenue la plus courte
raisonnable (et non plus la plus rapide). La règle à jour est dans
`CLAUDE.md`, section « L'ITINÉRAIRE ».

## L'ITINÉRAIRE (septembre 2026) — QUATRE NIVEAUX, ET CE QUI SE JOUE DESSUS

Septembre 2026. Le prix est un kilométrage, donc **la distance décide
seule de ce que le client paie**, et il est ferme : annoncé, accepté,
encaissé tel quel. `itineraire()` enchaîne quatre niveaux, chacun
rattrapant le précédent :

| | Service | Quand | Quota |
|---|---|---|---|
| 1 | **Mapbox** | si `CLE_MAPBOX` est remplie | 100 000/mois |
| 2 | **OpenRouteService** | si `CLE_ORS` est remplie | 2 000/jour |
| 3 | **OSRM** | sinon, ou si les précédents refusent | serveur de démo |
| 4 | **Vol d'oiseau × 1,3** | les trois à terre | — |

- **`CLE_ORS` est REMPLIE** (septembre 2026, jeton donné par Barbaros).
  `CLE_MAPBOX` est vide : il n'a pas de compte Mapbox. Le site tourne donc
  aujourd'hui sur ORS, avec OSRM en filet.
- **LA CLÉ ORS EST EN CLAIR DANS LE DÉPÔT, ET C'EST ASSUMÉ.** Une page
  statique envoie forcément sa clé au navigateur : elle est lisible de
  toute façon. La vraie différence entre les deux services est ailleurs —
  un jeton Mapbox **se restreint au domaine**, un jeton ORS **non**. La
  sortie de secours d'ORS est donc de le **régénérer** sur
  openrouteservice.org et de le remplacer ici. Ça a été dit à Barbaros ; il
  a donné la clé en connaissance de cause. Ne pas rouvrir le débat.
- **Si le quota se vide sans raison, c'est qu'elle a été reprise.** Le site
  ne tombe pas pour autant : OSRM prend le relais. C'est exactement ce à
  quoi servent les niveaux.
- **ORS répond en GeoJSON**, pas comme les deux autres : la mesure est dans
  `features[0].properties.summary`, d'où `lireRouteORS()`. Une réponse sans
  résumé lève une erreur au lieu de rendre zéro — un zéro passerait pour
  une course de 0 km et sortirait au **prix plancher** sur un Paris →
  Roissy.
- **ORS prend ses points en `lon,lat`**, dans deux paramètres séparés
  (`start=` et `end=`). L'ordre inverse de l'habitude ; inversé, la course
  part dans l'océan Indien sans le moindre message. Un test vérifie les
  coordonnées exactes de l'URL.
- **LE CONTRÔLE QUI COMPTE LE PLUS** dans `test-nouveau-itineraire.mjs` :
  un niveau en panne ne doit **pas** faire sauter les suivants pour aller
  droit au vol d'oiseau — ce serait facturer une estimation là où une vraie
  route était disponible. Un repli qui se déclenche trop tôt ne se voit
  pas : le prix s'affiche, il est simplement faux de quelques euros. D'où
  **quatre distances différentes** dans le test, une par niveau, et le prix
  lu à l'écran pour savoir lequel a répondu.
- **Le « ≈ » est sur la mesure ET sur le prix**, et c'est sur le prix qu'il
  compte : c'est le montant que le client regarde.
- `api.mapbox.com` et `api.openrouteservice.org` sont dans les hôtes **hors
  cache** de `sw.js` : une réponse gardée resservirait la distance d'une
  course à une autre.
- `overview=false` chez Mapbox : le site n'affiche aucune carte, réclamer
  la géométrie ferait grossir la réponse pour rien.
- **Minuteur de 4 s par appel** (`fetchLimite`), soit douze au pire avant
  le vol d'oiseau — et ce pire cas suppose les trois serveurs muets en même
  temps. Il était à 5 s quand il n'y avait que deux niveaux ; ajouter un
  troisième sans le baisser aurait porté l'attente à quinze secondes.
- **LES NEUF AUTRES SUITES COUPENT ORS EXPLICITEMENT**
  (`route('**://api.openrouteservice.org/**', r => r.abort())`). Sans ça
  elles dépendraient du fait qu'il soit injoignable depuis cette machine —
  et sur un poste relié à Internet elles interrogeraient le vrai service,
  avec une vraie distance, et tous les prix vérifiés au centime
  tomberaient à côté. **Toute nouvelle suite qui simule OSRM doit couper
  ORS de la même façon.**


## La route la plus courte (11 octobre 2026)

Capture de Barbaros à 23 h 57 : une adresse d'Argenteuil →
Goussainville (bd Paul-Vaillant-Couturier), 40,7 km par Taverny, la forêt
de Montmorency et Domont, 120 € en berline — pour environ 18 km à vol
d'oiseau. ORS rendait sa route par défaut, la plus RAPIDE : à minuit la
Francilienne et les nationales à 110 km/h battent l'A1 et Saint-Denis.
Le prix étant un kilométrage, le client payait 15 km de détour.
Sa décision : « Ça doit être la plus courte et avec autoroute, comme
Waze ».
- Le profil « shortest » d'ORS a été écarté : il coupe par les petites
  rues et les centres-villes, ce qu'aucun chauffeur ne fait.
- Retenu : demander jusqu'à trois routes (ORS en POST avec
  `alternative_routes`, OSRM et Mapbox avec `alternatives=true`) et garder
  la plus courte parmi celles qui ne rallongent pas de plus de 10 min
  (`TOLERANCE_DUREE_MIN`, `choisirRoute()`).
- ORS n'a pas pu être interrogé depuis la machine de travail (réseau
  bloqué) : si les alternatives sont refusées, on retombe sur l'ancien GET
  à une seule route. Ce n'est jamais pire qu'avant.
- `test-nouveau-itineraire.mjs` : sept contrôles tombent sur l'ancien code
  (dont « 120 € » au lieu de « 80 € » sur OSRM).

---

## Archivé de CLAUDE.md le 22/10/2026

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## L'ITINÉRAIRE — QUATRE NIVEAUX, ET LA ROUTE LA PLUS COURTE

Le prix est un kilométrage : **la distance décide seule de ce que paie le
client**. `itineraire()` (`itineraire-partage.js`) enchaîne Mapbox (si
`CLE_MAPBOX`, vide aujourd'hui) → **ORS** (`CLE_ORS`, remplie, en clair et
c'est assumé) → OSRM → vol d'oiseau × 1,3 (« ≈ » sur la mesure ET le prix).
- **LA ROUTE FACTURÉE EST LA PLUS COURTE RAISONNABLE, JAMAIS LA PLUS
  RAPIDE** (11/10/2026, Barbaros : « la plus courte, avec autoroute, comme
  Waze »). On demande plusieurs routes et `choisirRoute()` garde la plus
  courte qui ne rallonge pas de plus de 10 min. Jamais le profil
  « shortest » : il coupe par les centres-villes.
- Un niveau en panne ne fait jamais sauter les suivants ; une réponse sans
  distance lève une erreur (un zéro sortirait au plancher). ORS et OSRM
  prennent leurs points en **lon,lat**. Minuteur de 4 s par appel.
- Les itinéraires sont hors cache dans `sw.js`, et **toute suite qui simule
  OSRM coupe ORS** (sinon elle interroge le vrai service).
Histoire, détails et capture du 11/10 : `memoire/itineraire.md`.

## LA CARTE DU TRAJET — LEAFLET, ET LA PREMIÈRE DÉPENDANCE DU SITE

Septembre 2026, à sa demande : « une belle carte comme Maps ». Le client voit
la route qu'on lui facture, et c'est ce qui rend le prix compréhensible.

**C'EST LA SEULE DÉPENDANCE EXTÉRIEURE DE LA PAGE**, et elle a été acceptée
pour une raison précise : Leaflet est en licence libre, sans dépendance
lui-même, et **rien ne casse s'il n'arrive pas**. Ne pas s'en servir comme
d'un précédent pour en ajouter d'autres.

- **ELLE NE PEUT JAMAIS EMPÊCHER DE RÉSERVER.** Le chargement est enveloppé,
  et le seul échec possible est « pas de carte » : cadre masqué, hauteur
  nulle, aucun trou dans la page, et le tunnel continue. Un client dans un
  parking d'aéroport n'a parfois aucun réseau. **Six contrôles éprouvent ce
  cas-là en premier**, et ils tournent toujours — la machine de test est hors
  ligne, donc le CDN n'y répond jamais.
- **UNE MINUTERIE DE 5 s SUR LE CHARGEMENT.** Un script bloqué par un proxy
  ou un bloqueur de publicité **ne déclenche pas toujours `onerror`** : la
  promesse resterait en attente pour toujours. Même leçon que le
  presse-papiers. La promesse échouée est oubliée, pour qu'un client qui
  retrouve du réseau puisse réessayer.
- **« lon, lat » CHEZ LES CALCULATEURS, « lat, lon » CHEZ LEAFLET.** Inversé,
  le tracé part dans l'océan Indien — la carte s'affiche très bien, elle est
  simplement fausse. Un faux Leaflet **enregistre** ce qu'on lui donne et le
  test vérifie que les points tombent en Île-de-France. C'est le même piège
  que l'ordre des points dans l'appel à ORS.
- **ORS REND LE TRACÉ SANS QU'ON LE DEMANDE** : il est dans la réponse qu'on
  lit déjà, et on le jetait. La carte ne coûte donc **aucun appel
  supplémentaire** sur le niveau qui sert aujourd'hui. Pour Mapbox et OSRM,
  `overview=false` est devenu `overview=simplified&geometries=geojson` — la
  raison d'origine (« le site n'affiche aucune carte ») est tombée avec la
  carte. **`simplified` et pas `full`** : à l'échelle d'un téléphone, le
  tracé complet pèse dix fois plus pour un trait identique à l'œil.
- **LE DRAPEAU DE LEAFLET S'EN VA — et c'est la DEUXIÈME fois dans ce
  projet.** La version 1.9 glisse un drapeau ukrainien dans son attribution ;
  Barbaros l'avait déjà fait retirer de l'ancien site.
  `attributionControl.setPrefix("")`. **« © OpenStreetMap » reste** : les
  données sont sous licence ODbL, la citation des contributeurs est une
  obligation. On retire le préfixe de la bibliothèque, jamais la source.
- **LA CARTE NE SE MANIPULE PAS** (`dragging`, `touchZoom`, `scrollWheelZoom`
  à `false`). Dans un tunnel de réservation elle se REGARDE : un pouce qui
  fait défiler la page ne doit pas déplacer la carte au lieu de descendre à
  la liste des prix.
- **ELLE EST TRACÉE APRÈS `ecran()`, jamais avant** : Leaflet mesure son
  cadre à la création, et un cadre encore masqué mesure zéro — la carte sort
  grise. Exactement le piège de la courbe du tableau de bord. D'où aussi le
  `invalidateSize()` différé et la hauteur fixe en CSS, qui empêche la page
  de sauter quand la carte arrive.
- **LES TUILES SONT LE POINT FAIBLE, ET IL EST CONNU.** La politique
  d'OpenStreetMap déconseille l'usage commercial soutenu : elle peut couper
  sans préavis. Le jour où `CLE_MAPBOX` est remplie, on passe aux tuiles
  Mapbox — même bibliothèque, une ligne. Elles sont **désaturées** en CSS :
  la couleur doit rester au tracé et aux deux repères.
- **LA BIBLIOTHÈQUE EST DANS LE DÉPÔT (`carte/`), PLUS CHEZ UN CDN**
  (septembre 2026, après « je ne vois pas la carte s'afficher »). Elle
  venait de cdnjs avec une **minuterie de 5 s** sur son chargement : 147 Ko
  chez un serveur étranger, DNS et poignée de main TLS compris, sur un
  téléphone en 4G. Cinq secondes, c'était court — et ce délai serré ne
  protégeait **rien**, puisque personne n'attend la carte : le prix est déjà
  à l'écran. Le réflexe venait des appels d'itinéraire, où une réponse lente
  retarde le prix. Ici elle ne retarde que la carte.
  Ce qu'on gagne à la servir soi-même : plus de serveur tiers à joindre,
  **mise en cache par le service worker** (même origine, réponse complète —
  une réponse opaque de CDN ne se cache pas), donc carte disponible hors
  ligne dès la deuxième visite, et personne d'extérieur ne peut changer ce
  code sous nos pieds. Licence BSD 2-Clause, redistribution permise, le
  fichier porte son copyright et `carte/LICENSE-leaflet.txt` l'accompagne.
  La minuterie reste, à **15 s** : elle ne sert plus qu'à ne pas laisser une
  promesse en suspens pour toujours.
- **`construire.sh` DOIT COPIER `carte/` — c'est LE point de rupture.** La
  recette ne publie que ce qui y est nommé : un fichier oublié marche
  parfaitement en local, où le serveur de test sert le dépôt entier, et
  reste introuvable en ligne. Deux contrôles de `test-nouveau-bascule.mjs`
  le verrouillent — dont un qui lit **ce que la page va chercher** plutôt
  qu'une liste à tenir à jour.
  **Le premier jet de ce contrôle passait au vert avec la ligne retirée** :
  il cherchait le mot « carte » dans le fichier entier, et mes propres
  commentaires en parlaient. Il ne lit maintenant que les lignes de
  commande. Un test qui trouve ce qu'il cherche dans une phrase
  d'explication ne vérifie rien.
- **`NOS_DOSSIERS` DANS `sw.js`.** `siteVoisin()` traite tout sous-dossier
  comme un site vitrine à laisser tranquille — juste pour `/alfredo/` ou
  `/demos/`, faux pour `/carte/`. Sans cette liste, le service worker
  laissait passer la bibliothèque sans jamais la garder : l'inverse de ce
  qu'on gagne à l'avoir sortie du CDN.
- **LE RENDU EST MAINTENANT ÉPROUVÉ À CHAQUE EXÉCUTION.** La troisième
  partie de `test-nouveau-carte.mjs` dépendait d'un fichier posé à la main
  dans le bac à sable, le CDN étant injoignable d'ici. Servie par le site,
  la vraie bibliothèque est là de toute façon — et un contrôle vérifie que
  les deux fichiers viennent bien du site et **jamais d'un CDN** : un retour
  en arrière ne casserait rien dans la suite, et la carte manquerait de
  nouveau chez lui.
- **PAS DE CARTE DE TRAFIC SUR LE TABLEAU DE BORD** (demandée, écartée).
  TomTom et HERE ont des paliers gratuits, ce n'est pas le problème :
  Barbaros ne conduit pas, il place. Une carte rouge et verte ne change
  aucune décision — c'est la carte des chauffeurs en temps réel de la
  maquette, refusée pour la même raison. Ce qui déciderait quelque chose,
  c'est une **durée tenant compte du trafic à l'heure de la course** (Mapbox
  sait le faire), affichée sur une ligne. **C'est fait — voir juste en
  dessous.**

### « PAS CLAIR », « PLUS VITE », « LE TRAFIC » — LES TROIS DEMANDES SUIVANTES

Septembre 2026, dès que la carte s'est enfin affichée chez lui. Trois
choses distinctes, et **aucune des deux premières ne se voit depuis un
ordinateur** — c'est pour ça qu'il a fallu qu'il les signale.

- **LE FLOU VENAIT DE LA DENSITÉ D'ÉCRAN, pas de la taille du cadre.** Un
  téléphone dessine 2 à 3 pixels physiques pour 1 pixel de page : les
  tuiles de 256 px étaient étirées sur 512 ou 768 pixels d'écran.
  `detectRetina:true` fait demander à Leaflet les tuiles du **zoom
  supérieur** et les dessine deux fois plus petites — deux fois plus de
  détail pour la même surface, **sans qu'OpenStreetMap ait à servir des
  images « @2x »**, ce qu'il ne fait pas. Mesuré : à DPR 2, une tuile de
  256 px occupe désormais 256 pixels d'écran (1:1, net) au lieu de 512 ;
  à DPR 1 rien ne change. Le coût est 8 tuiles au lieu de 4.
- **LA DÉSATURATION ÉTAIT DE TROP** : à `saturate(.55)` le fond de plan
  virait au gris-vert et les rues ne se distinguaient plus. Elle est à
  `.8`, le contraste à `1.06`. La règle tient toujours — la couleur
  appartient au tracé et aux deux repères — mais **un fond de plan effacé
  n'est plus un fond de plan**. Hauteur portée de 190 à 220 px.
- **LA LENTEUR ÉTAIT UNE MISE EN SÉRIE.** La bibliothèque ne partait
  qu'**après** la réponse du calculateur d'itinéraire, dans le `.then()` :
  deux attentes bout à bout alors qu'elles n'ont rien à voir. Elles partent
  maintenant **ensemble**, au clic sur « Voir mon prix » (`prechargerCarte()`),
  avec une **préconnexion** au serveur de tuiles au passage — un DNS et une
  poignée de main TLS, c'est une demi-seconde en 4G, prise sur du temps
  déjà perdu. On ne précharge **pas** à l'accueil pour autant : un visiteur
  qui ne réserve pas n'a pas à payer 200 Ko de cartographie.
  **Le test n'éprouve pas une durée** — une durée dépend de la machine et
  finit par tomber un jour de charge — il éprouve l'**ordre** : itinéraire
  ralenti à 2 s, on regarde à 900 ms, le prix n'est pas là et la
  bibliothèque est déjà demandée. Éprouvé contre l'ancien code : il tombe.
- **WAZE N'A PAS D'API PUBLIQUE**, et ce n'est pas une question de budget :
  elle est fermée depuis des années, ce qui reste (*Waze for Cities*) rend
  des incidents aux collectivités, pas des temps de trajet. **Google Maps**
  en a une, mais elle exige un compte de facturation **et** impose
  d'afficher le résultat sur une carte Google — donc de changer aussi le
  fond de plan, et de payer les deux. **Mapbox fait la même chose,
  gratuitement, sans imposer sa carte.** Ne pas rouvrir ce débat : la
  réponse ne dépend pas de nous.
- **LE PROFIL EST `driving-traffic`, PAS `driving`.** Les deux noms se
  ressemblent, le résultat non — sur un Roissy → Paris un mardi à 8 h,
  l'écart se compte en dizaines de minutes, donc en vols ratés. Un seul mot
  dans l'URL, exactement ce qu'une réécriture emporte sans rien casser de
  visible : un test le verrouille.
- **`depart_at` DEMANDE LE TRAFIC À L'HEURE DE LA COURSE**, pas à celle du
  clic — une commande passée à 23 h pour demain 8 h n'a rien à voir avec la
  circulation de 23 h. Il n'est envoyé que si le départ est **dans les 7
  jours** : hors de sa fenêtre Mapbox **refuserait l'appel**, le site
  retomberait sur ORS, et on perdrait **en silence** la précision qu'on est
  venu chercher. Un repli qui se déclenche trop tôt ne se voit pas.
- **« trafic pris en compte » N'EST ÉCRIT QUE SI C'EST VRAI** — donc
  seulement quand Mapbox a répondu. ORS et OSRM rendent un temps théorique.
  L'écrire quand même ferait de la mention une décoration, et un client qui
  se fie à une heure d'arrivée la vérifie une fois, une seule. Deux
  contrôles : présent avec Mapbox, **absent** sans.
- **RIEN DE TOUT ÇA NE TOURNE AUJOURD'HUI** : `CLE_MAPBOX` est vide, il n'a
  pas de compte. Le code est écrit et éprouvé, la marche à suivre est dans
  `MAPBOX.md`, et c'est le seul geste qui lui revient.
- **IL A REPOUSSÉ LE SUJET (septembre 2026) — « laisse tomber pour
  l'instant ».** Mapbox lui a demandé sa carte bancaire à l'inscription et
  il n'a pas voulu la donner. **Ne pas le relancer là-dessus.** Ce qui a été
  dit, et qui reste vrai le jour où il y revient : Mapbox crée un jeton
  public **automatiquement** à l'inscription, avant la question du paiement
  — il suffit d'aller le chercher sur `account.mapbox.com` ; et **TomTom**
  fait la même chose (itinéraire avec trafic réel) **sans carte**, 2 500
  appels par jour, ce serait un quatrième niveau à brancher exactement comme
  Mapbox. Le site n'en souffre pas : la marge de 5 à 10 minutes posée sur la
  durée couvre déjà une bonne part de ce que le trafic apporterait.

### LA DURÉE ANNONCÉE PORTE UNE MARGE — FOURCHETTE DE +5 À +10 MINUTES

Septembre 2026, à sa demande : « il faut que le temps de trajet soit une
estimation de 5-10 minutes plus longue ».

- **CE QUE RENDENT LES CALCULATEURS EST UN TEMPS DE ROULAGE, PAS UN TEMPS DE
  COURSE.** Il ne compte ni la sortie du parking, ni les bagages, ni les deux
  minutes à chercher le client devant un terminal. Annoncé sec, on promet une
  heure d'arrivée qu'on tient une fois sur deux — et chez Elatransfer l'heure
  engage comme le prix.
- **UNE FOURCHETTE, PAS UN NOMBRE UNIQUE.** Un chiffre seul se lit comme une
  promesse ; « 43–48 min » se lit comme ce que c'est. Et une marge **fixe**
  de dix minutes serait absurde sur un trajet court — 12 min deviendraient
  22, presque le double. `MARGE_DUREE_MIN` / `MARGE_DUREE_MAX`,
  `dureeAnnoncee()`.
- **`course.min` RESTE BRUT** : la marge est posée à l'AFFICHAGE. Sinon, le
  jour où l'on rangerait la durée sur le bon, elle partirait déjà majorée et
  une seconde marge s'ajouterait à la première sans que personne ne le voie.
- **LE PRIX NE BOUGE PAS D'UN CENTIME.** Il est un kilométrage, la durée n'y
  entre pas — c'est ce qui permet d'être prudent sur l'heure sans être
  malhonnête sur le montant.
- **LA DURÉE A QUITTÉ LA CARTE DE GAMME**, et ce n'est pas une perte : elle
  était **identique sur les quatre lignes** (c'est la même route) et elle est
  déjà écrite au-dessus. En fourchette, « 43–48 min · arrivée 10:43–10:48 »
  ne tenait plus sur une ligne de téléphone. Ce qui reste sur la carte, c'est
  l'**heure d'arrivée**, celle que le client compare à l'heure
  d'enregistrement de son vol. Mesuré : une ligne, à 390 px, court trajet
  comme long.
- **LE TEST NE REFAIT PAS L'ADDITION** : le faux ORS rend 2 700 s, donc la
  page doit afficher « 50–55 min » et **jamais** « 45 min ». Un contrôle qui
  recalculerait la marge passerait au vert même si elle disparaissait des
  deux côtés. Éprouvé marges à zéro : les trois contrôles tombent.
