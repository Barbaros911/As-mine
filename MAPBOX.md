# L'itinéraire — quatre niveaux, et comment y toucher

## Pourquoi c'est important

Le prix d'Elatransfer est un kilométrage. La distance vient donc décider
seule de ce que le client paie — et **le prix est ferme** : annoncé,
accepté, encaissé tel quel. Une distance fausse n'est pas une gêne
d'affichage, c'est une course à perte ou un prix dont il faut se dédire.

## Les quatre niveaux, dans l'ordre

| | Service | Quand il sert | Quota gratuit |
|---|---|---|---|
| 1 | **Mapbox** | si `CLE_MAPBOX` est remplie | 100 000 / mois |
| 2 | **OpenRouteService** | si `CLE_ORS` est remplie | 2 000 / jour |
| 3 | **OSRM** | sinon, ou si les précédents refusent | serveur de démo |
| 4 | **Vol d'oiseau × 1,3** | les trois à terre, course marquée « ≈ » | — |

**Chaque niveau rattrape le précédent, et c'est tout l'intérêt.** Trois
serveurs indépendants qui tombent le même jour, c'est autrement moins
probable qu'un seul. Le vol d'oiseau ne sert que si les trois sont à terre.

## Où on en est

- **`CLE_ORS` est remplie.** Le site tourne aujourd'hui sur
  OpenRouteService, avec OSRM en filet.
- **`CLE_MAPBOX` est vide.** Il n'y a pas de compte Mapbox. Ce n'est pas
  un manque : c'est un confort de plus le jour où on le voudra.
- **OSRM n'est plus le premier appelé.** C'est un serveur de
  **démonstration** : aucun engagement de service, débit limité, usage
  commercial déconseillé par ses propres auteurs. Il reste très bien comme
  filet.

## La clé OpenRouteService, franchement

Elle est **en clair dans le dépôt, et c'est assumé**. Une page statique
envoie forcément sa clé au navigateur : elle est lisible de toute façon,
que le dépôt soit public ou non.

La vraie différence entre les deux services est ailleurs : **un jeton
Mapbox se restreint au domaine** `elatransfer.com`, un **jeton ORS ne se
restreint pas** — c'est un identifiant de compte.

**Ce qu'il faut savoir, donc :** si le quota se vide sans raison, c'est
qu'elle a été reprise par quelqu'un. La manœuvre est simple — en
régénérer une sur openrouteservice.org et la remplacer dans `index.html`.
Le site continue de fonctionner entre-temps : OSRM prend le relais.

## Le trafic en temps réel — ce qui est possible, ce qui ne l'est pas

Barbaros, septembre 2026 : « elle doit prendre en compte le trafic actuel,
temps basé sur Waze ou Google Maps ».

- **Waze n'a pas d'API publique.** Elle a été fermée il y a des années. Ce
  qui subsiste — *Waze for Cities* — s'adresse aux collectivités et rend
  des signalements d'incidents, pas des temps de trajet. **Aucun site ne
  peut s'y brancher**, quel qu'en soit le budget.
- **Google Maps en a une** (Routes API), mais elle exige un compte de
  facturation, et ses conditions imposent d'afficher le résultat **sur une
  carte Google** — donc de changer aussi le fond de plan, et de payer les
  deux.
- **Mapbox fait exactement la même chose**, gratuitement jusqu'à 100 000
  itinéraires par mois, sans imposer son fond de plan. C'est la voie
  retenue.

**Le code est écrit et éprouvé ; il ne manque que la clé.** Le niveau 1
appelle le profil **`driving-traffic`** — et non `driving` : c'est le seul
des deux qui regarde la circulation. Tant que `CLE_MAPBOX` est vide, le
site calcule comme avant, sans trafic, et **ne prétend pas le contraire** :
la mention « trafic pris en compte » n'apparaît sous le trajet que si
Mapbox a répondu.

**On demande le trafic à l'heure de la course, pas à celle du clic**
(`depart_at`). Une course commandée à 23 h pour demain 8 h n'a rien à voir
avec la circulation de 23 h — c'est ce qui rend la chose utile plutôt que
décorative. Le paramètre n'est envoyé que si le départ est dans les 7
jours : hors de sa fenêtre, Mapbox **refuserait l'appel**, le site
retomberait sur ORS, et on perdrait en silence la précision qu'on était
venu chercher.

## Poser la clé Mapbox, le jour venu

1. Créer un compte sur **mapbox.com** (carte bancaire demandée à
   l'inscription, rien n'est prélevé sous le palier gratuit).
2. Copier le **jeton public par défaut** — il commence par `pk.`.
3. Le coller dans `index.html`, ligne `var CLE_MAPBOX = "";`.
4. **Puis le restreindre au domaine `elatransfer.com`** dans le tableau de
   bord Mapbox (« URL restrictions »).

Les points 3 et 4 vont ensemble : c'est de ne pas faire le second qui
coûte. Restreint, le jeton ne sert à rien à qui le copie.

Ce que la clé apporte d'un seul coup : le **trafic** dans les durées
annoncées, un **engagement de service** sur le calcul du prix, et le jour
où on le voudra des **tuiles de carte** dont l'usage commercial est permis
— ce que la politique d'OpenStreetMap déconseille.

## Ce qu'il ne faut pas faire

- **Ne pas retirer le niveau 4.** Un vol d'oiseau annoncé « ≈ » vaut mieux
  qu'un écran qui ne donne aucun prix : le client s'en va.
- **Ne pas retirer le « ≈ ».** Il est sur la mesure *et* sur le prix, et
  c'est sur le prix qu'il compte — c'est le montant que le client regarde.
- **Ne pas mettre une réponse d'itinéraire en cache.** `api.mapbox.com` et
  `api.openrouteservice.org` sont dans les hôtes exclus de `sw.js` : une
  réponse gardée resservirait la distance d'une course à une autre.
- **Ne pas inverser les coordonnées d'ORS.** Il prend `lon,lat`, l'ordre
  inverse de l'habitude, dans deux paramètres séparés. Inversé, la course
  part dans l'océan Indien sans le moindre message. Un test vérifie l'URL
  exacte.
- **Ne pas lire une réponse ORS sans résumé comme une distance nulle.**
  `lireRouteORS()` lève une erreur : un zéro passerait pour une course de
  0 km et sortirait au prix plancher sur un Paris → Roissy.
- **Toute nouvelle suite de tests qui simule OSRM doit couper ORS**
  (`route('**://api.openrouteservice.org/**', r => r.abort())`). Sinon
  elle dépend du fait qu'ORS soit injoignable, et sur un poste relié à
  Internet elle interroge le vrai service — les prix vérifiés au centime
  tombent alors à côté.
