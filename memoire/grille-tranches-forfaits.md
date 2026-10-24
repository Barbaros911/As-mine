# La grille par tranches, les forfaits Paris et l'accueil — 23 octobre 2026

Histoire de la règle « La grille » de `CLAUDE.md`. On n'ouvre ce fichier que
si le sujet revient.

## Comment elle a été décidée

Une conversation de conseil (« analyse en expert, ne touche à rien »), puis
les décisions de Barbaros, une à une, le 23 octobre 2026 :

- Il envisageait une « Classe Éco » à 35 / 50 / 70 / 90 € (0–10 / 11–20 /
  21–30 / 31–40 km). Conseil retenu : **garder « Berline »** (« Éco » faisait
  bas de gamme pour des prix au-dessus du taxi) et **déplacer les limites à
  12 / 22 / 32 / 42 km**. Les limites rondes coupaient les deux trajets
  principaux : Paris → Orly (≈ 16–23 km) et Paris → Roissy (≈ 25–35 km), et
  10 km relevait de 15 € les trajets de 10 à 12 km, que le minimum de 35 €
  couvrait déjà.
- Puis **trois forfaits Paris** : Orly, Roissy-CDG, Disneyland — « tout en
  gardant les prix au km » pour le reste, puis « c'est cher, il faut les 4
  tranches séparées des forfaits ». Orly : il a proposé 60 €, conseil 55 €
  (au niveau du taxi réservé, écart logique avec Roissy), retenu 55 €.
- **Le van** : 50 / 80 / 110 / 130 € (environ 1,6 fois la berline, comme au
  km ; toujours moins que deux berlines), Disney van 130 € (sa correction de
  140).
- **Au-delà de 42 km** : 90 € + 2,50 €/km en berline, 130 € + 3,80 €/km en
  van (il a écarté 2,20 / 3,30 : il prend plus de 10 € par course).
- **L'accueil** : « quand on récupère un client à l'aéroport c'est 10 € de
  plus, forfait ou pas » ; « les 10 comprennent la pancarte avec le chauffeur
  qui attend le client à la sortie des arrivées » ; « même pour les gares » ;
  seulement les grandes gares (conseil retenu : une petite gare de RER
  donnée comme point de rendez-vous aurait payé 10 € pour rien). Une dépose
  ne coûte rien de plus. Le parking n'existe qu'avec la pancarte : ce sont
  ces 10 € qui le paient.
- **Pas de supplément de réservation à l'avance** (son idée, écartée : ses
  clients réservent tous à l'avance, ce serait une hausse déguisée, et
  « aucun frais de réservation » est un argument contre le taxi).
- **« Prix des pages » désactivé** (« oui désactive ») : un même trajet à deux
  prix selon la page d'arrivée se voit, et casse les forfaits.
- **On ne touche ni au flyer, ni à la page client des hôtels, ni à la
  réception** : les pages des hôtels gardent le kilométrage et l'option
  pancarte.
- **Surclassement** : « Surclassement possible, au même prix » sous la
  Berline seulement, et la question fréquente « Quel véhicule vais-je
  avoir ? » (« oui ça arrive »). Jamais un modèle ni une marque. Si les
  surclassements deviennent rares, la ligne se retire.
- **En deux étapes** : celle-ci (grille, forfaits, accueil, CGV, questions
  fréquentes), puis, deux semaines plus tard, l'affichage des forfaits sur
  les pages CDG, Orly et Disney (encore interdit par la règle des pages
  d'acquisition, « ni prix chiffré »).

## Ce que le code fait, et pourquoi

- `prixTranches` (itineraire-partage.js) juge la distance **au dixième**, celle
  que le client lit : 12,04 km affichés « 12 km » coûtent 35 €. Au-delà de
  la dernière tranche, le montant passe par les centimes avant l'arrondi de
  Barbaros (sinon un 5 pile en virgule flottante tombe du mauvais côté).
- **Paris = la commune** : code postal 75… ou ville « Paris », lus dans les
  champs de la BAN et de Photon (`codePostal`, `ville`, `pays`), jamais dans
  le libellé, avec un garde-fou de 12 km autour du centre. Le rayon de 7 km
  du flyer attraperait Boulogne et Neuilly. Un lieu sans commune connue
  paie la tranche.
- **Les zones des forfaits** se mesurent comme celles du flyer : 2 km autour
  d'un terminal (`RAYON_AEROPORT_KM`), 3 km autour de Disneyland.
- **L'accueil** suit le DÉPART : un lieu choisi comme aéroport (terminal de la
  liste, ou catégorie « aéroport » à 3 km de CDG, Orly, Beauvais ou Le
  Bourget) ou une gare (`estGare`) à 400 m d'une des neuf grandes gares. Un
  hôtel de Roissypôle est dans la zone du forfait, pas dans l'accueil.
  Coordonnées des gares : jeu de données ouvert trainline-eu/stations
  (ODbL), relevé le 23/10/2026 (le réseau vers les services d'adresse était
  fermé depuis le poste de travail).
- **La course porte** `accueil` et `pancarte` (le chauffeur voit « Pancarte :
  oui » sur le bon) et `forfaitPublic` ; le message porte « Accueil : …,
  compris dans le prix », sans montant, avant « Prix ».
- **Le serveur** : ligne `grille_publique` de `parametres_commerciaux`, vue
  `grille_publique` pour anon (20261023120000, conditionnelle, **à appliquer
  après la fusion**). Tant qu'elle ne l'est pas, le site applique la grille
  écrite dans la page et `deposer-course` ne contrôle pas le prix du site
  public (l'ancien plancher au km aurait marqué « Prix à vérifier » un Paris →
  Roissy à 70 €). Le plancher du site public est la tranche de la ligne
  droite : aucun forfait n'est en dessous (vérifié pour les points de Paris
  les plus éloignés de chaque zone).
- **Les CGV** (art. 4 et 9, FR et EN, 23 octobre 2026) décrivent la mécanique
  sans chiffre : tranches, prix par km au-delà, forfaits Paris, accueil au
  départ ; le kilométrage et l'option pancarte « sur la page de réservation
  d'un hôtel partenaire » ; le surclassement possible, sans modèle garanti.

## La marche à 27 km (24 octobre 2026)

Après la fusion, Barbaros : « Tu penses que c'est 10/10, et le client lambda
qui fait 24 km ? ». Mesuré avec `prixTranches` et l'ancien `prix` : à 24 km,
la berline coûtait 70 €, exactement l'ancien prix au km, mais 20 € de plus
qu'à 22 km et autant qu'à 32 km. Proposé : une marche à 27 km, berline 60 €,
van 95 €. Sa réponse : « si tu penses que c'est bien, j'accepte ». 24 km
coûte désormais 60 €.

- **Migration 20261024120000**, un seul geste quel que soit l'état de la
  base : elle pose la grille entière et la vue si 20261023120000 n'a jamais
  été appliquée, ajoute la marche si les tranches sont encore celles du
  23 octobre, et ne touche à rien si elles ont été réglées depuis l'admin.
  Seules les tranches sont réécrites (jamais un forfait ni l'accueil).
  Épreuve : `supabase/tests/grille-27km-apres.sql`, trois bases en CI ;
  elle tombe sur une migration qui écrase et sur une migration sans la vue.
- **Les CGV ne changent pas** : elles disent « une tranche, à laquelle
  correspond un prix fixe », sans en donner le nombre.
- **Écarté pour l'instant** : le saut du van à 12 km (50 → 80 €), le plus
  fort de la grille ; il n'a pas été demandé.
- **L'aéroport reste à +10 €** (sa décision, le même jour), après la
  comparaison avec les forfaits des taxis parisiens pour 2026 (Roissy 56 /
  65 €, Orly 45 / 36 €, + 7 € pour une réservation à l'avance, chiffres de
  service-public relayés par la presse) : « le chauffeur attend à l'arrivée
  le client avec son nom ». Ne pas rouvrir sans chiffres de conversion.

## Ce qui reste

- Appliquer la migration 20261024120000 après la fusion (elle suffit seule).
- Étape 2 : les forfaits affichés sur les pages CDG, Orly et Disney.
- Dans 4 à 6 semaines, au Registre : les courses autour de 12 / 22 / 27 / 32 km,
  la vitesse à laquelle les chauffeurs prennent les courses, la part des
  arrivées confirmées (Orly → Paris 65 €, au-dessus de la file de taxis).
