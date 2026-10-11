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

Capture de Barbaros à 23 h 57 : Argenteuil (58 rue des Bourguignons) →
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
