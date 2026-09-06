# Mapbox — brancher un vrai calculateur d'itinéraire

## Pourquoi

Le prix d'Elatransfer est un kilométrage. La distance vient donc décider
seule de ce que le client paie — et chez nous **le prix est ferme** :
annoncé, accepté, encaissé tel quel. Une distance fausse n'est pas une
gêne d'affichage, c'est une course à perte ou un prix dont il faut se
dédire.

Aujourd'hui cette distance vient de `router.project-osrm.org`. C'est un
**serveur de démonstration** : aucun engagement de service, débit limité,
et ses propres auteurs déconseillent l'usage commercial. Quand il refuse,
le site retombe sur le vol d'oiseau × 1,3 et marque la course « ≈ ». Sur
un Roissy → Paris, l'écart entre la vraie route et le vol d'oiseau se
compte en euros.

Mapbox répond à ça : 100 000 itinéraires par mois au palier gratuit, très
au-dessus du volume d'Elatransfer, avec un engagement de service.

## Ce qui est déjà fait

Tout, sauf la clé. `index.html` enchaîne trois niveaux :

1. **Mapbox**, dès qu'une clé est posée dans `CLE_MAPBOX` ;
2. **OSRM** sinon, ou si Mapbox refuse ;
3. le **vol d'oiseau × 1,3** en dernier recours, la course marquée « ≈ ».

Tant que la ligne est vide, le site se comporte exactement comme avant.
`test-nouveau-itineraire.mjs` éprouve les cinq combinaisons, dont la plus
importante : **Mapbox en panne ne doit pas sauter OSRM** pour aller
directement au vol d'oiseau.

## La marche à suivre

1. Créer un compte sur **mapbox.com** (carte bancaire demandée à
   l'inscription, rien n'est prélevé sous le palier gratuit).
2. Dans le tableau de bord, copier le **jeton public par défaut** — il
   commence par `pk.`.
3. Le coller dans `index.html`, ligne `var CLE_MAPBOX = "";`.
4. **Puis, dans le tableau de bord Mapbox, restreindre ce jeton au
   domaine `elatransfer.com`** (« URL restrictions »).

**Les deux derniers gestes vont ensemble, et l'ordre n'a pas
d'importance : c'est de ne pas faire le second qui coûte.** Le dépôt est
public, la clé y sera lisible par tout le monde. Restreinte au domaine,
elle ne sert à rien à qui la copie. Non restreinte, le premier venu épuise
le quota — et le site retombe sur OSRM sans que personne ne s'en aperçoive.

C'est aussi la raison pour laquelle **OpenRouteService n'a pas été
retenu** : leurs clés sont des jetons liés au compte, qui ne se
restreignent à aucun domaine. Sur un dépôt public, ça n'est pas tenable.

## Ce qui reste sur OSRM, et pourquoi c'est bien

OSRM ne disparaît pas : il devient le **filet**. Le jour où le quota
Mapbox est atteint, où la clé est révoquée, ou où leur service tombe, le
site continue de calculer de vraies routes au lieu de basculer sur une
estimation. Deux serveurs indépendants qui tombent le même jour, c'est
autrement moins probable qu'un seul.

## Ce qu'il ne faut pas faire

- **Ne pas retirer le niveau 3.** Un vol d'oiseau annoncé « ≈ » vaut
  mieux qu'un écran qui ne donne aucun prix : le client s'en va.
- **Ne pas retirer le « ≈ ».** Il est sur la mesure *et* sur le prix, et
  c'est sur le prix qu'il compte — c'est le montant que le client regarde.
- **Ne pas mettre une réponse d'itinéraire en cache.** `api.mapbox.com`
  est dans les hôtes exclus de `sw.js` : une réponse gardée resservirait
  la distance d'une course précédente à une autre course.
- **Ne pas demander le tracé** (`overview=false`). Le site n'affiche
  aucune carte : réclamer la géométrie ferait grossir la réponse pour rien.
