# Le prix à toutes les distances, et les péages — archive (rangé le 19 octobre 2026)

> Ce qui vaut aujourd'hui est dans `CLAUDE.md`, section « PLUS AUCUNE DEMANDE
> BLOQUÉE — ET LE PRIX À TOUTES LES DISTANCES ». Ci-dessous : la section du
> 4 octobre telle qu'elle était, puis ce qu'a changé le 19 octobre.

## (archive) PLUS AUCUN BLOCAGE COMMERCIAL — UNE DEMANDE RÉELLE PART TOUJOURS

4 octobre 2026, à sa demande (« un client avec une demande réelle doit
toujours disposer d'une sortie »). Vingt règles auditées AVANT de coder.
- **Préavis de 15 min supprimé.** Seule l'heure réellement passée est
  refusée, avec la sortie « Partir dès que possible ».
- **« Dès que possible »** : plus de lien « Maintenant » dans la case Date
  (8/10/2026, Barbaros : « le supprimer de partout ») ; on y entre par
  « Partir dès que possible » (heure passée). Un encadré (`#blocAsap`) de même
  hauteur remplace date et heure. `course.immediat`, jamais un blocage.
- **« TARIF À CONFIRMER »** (`tarifAConfirmer`, `motifsTarif` parmi
  `longue`/`groupe`/`adresse`) : la demande PART sans aucun montant affiché —
  au-delà de 90 km (`#infoLongue` ; `RAYON_ZONE_KM` est devenu le seuil du
  PRIX AUTOMATIQUE), plus de 7 passagers (« Plusieurs véhicules »), adresse
  introuvable envoyée telle quelle (`adresseAVerifier`, sans coordonnées).
  **Piège attrapé par le test** : le client envoyait `longue_distance`, le
  serveur attendait `longue` — toute longue distance aurait été refusée.
- **`deposer-course`** force le prix à 0 sur une demande à confirmer, exige
  sinon un prix positif (le 0 € passait), accepte 60 passagers et 5 000 km.
- **Admin** : pastilles Immédiat / Tarif à confirmer / Adresse à vérifier /
  Plusieurs véhicules (ligne du bas de la carte), « À confirmer » au lieu de
  0 €. **« Confirmer » refusé tant que le prix n'est pas fixé** (un VTC
  annonce son prix avant le départ). « Modifier la course » fixe le prix et
  pose `prixFixeApres` : « Prévenir le client » l'annonce, `?ok=` le porte.
- **`nouvelle-demande`** : une demande immédiate a pour référence création +
  30 min. Comptée sur sa date, elle recevait aussitôt « DÉPART PASSÉ » puis
  le silence.
- **CGV art. 4** (FR/EN) décrivent les demandes sans prix affiché.
- Toujours refusés : heure passée, départ = arrivée, coordonnées d'une
  adresse modifiée, identité/téléphone, règlement, quotas, doublons.
- Suites : `test-nouveau-sans-blocage.mjs` (site construit, client + admin),
  `test-nouveau-preavis.mjs` (verrouille l'ABSENCE du préavis),
  `test-securite-fonctions.mjs`, `test-relance-alertes.mjs`.

## 19 octobre 2026 — B2 : le prix à toutes les distances, péages en plus

Audit de l'architecture commerciale (18/10). Barbaros voulait retirer la
limite des 90 km (« je demande au client de faire appel ou devis »), puis a
choisi B2 : le prix calculé à toutes les distances. Deux conséquences lui
ont été posées avant de coder : les péages, et l'étranger. Ses réponses :
« péage non inclus », et un « Ok » sur la proposition — l'étranger reste
sur devis (décision du 30/09 gardée).

- **Ce que la règle des 90 km protégeait, et qui a été dit** : la grille au
  kilomètre est taillée pour l'Île-de-France, et un Paris → Lyon porte un
  retour à vide, des péages et des temps de repos. Exemple donné : environ
  465 km, 1 350 € en berline. Sa décision, prise en le sachant. Les péages,
  eux, sont désormais en plus.
- **Le client paie avant le départ, par lien, et rien à bord** : le péage ne
  peut donc pas « se régler au chauffeur ». Il est ajouté au prix par
  Elatransfer avant la confirmation, et le lien porte le prix péages
  compris (CGV art. 4 et 5). Pas de champ « péages » dans l'admin :
  « Modifier la course » fixe déjà le prix ; `#bbPeages` le rappelle.
- **Trois réponses, jamais deux** (`peageORS`) : péage vu, aucun péage, on
  ne sait pas. « On ne sait pas » au-delà de 90 km dit « péages éventuels » ;
  en deçà, rien — un court trajet ne doit pas se lire plus cher. ORS refuse
  les routes alternatives sur les longs trajets : le repli à une seule
  route garde `extra_info: tollways`, sinon on aurait perdu l'information
  justement là où elle sert.
- **Le forfait d'un partenaire comprend les péages** (écrit dans les CGV) :
  c'était déjà le cas en pratique (prix du flyer fixe) ; l'écrire évite
  qu'un client lise « péages non compris » de façon générale. À Barbaros de
  le changer s'il veut facturer le péage de l'A16 vers Beauvais en plus.
- **L'étranger** : rien ne reconnaissait un pays avant — seule la distance
  l'écartait. Photon garde maintenant `pays` (son `countrycode`) ; la BAN
  ne couvre que la France. Le motif reste `longue`, que le serveur connaît :
  un nouveau nom aurait fait refuser la demande pendant les minutes où le
  site et la fonction ne sont pas encore déployés ensemble.
- **Le plafond de `deposer-course` (5 000 €)** couvre la France : la plus
  longue course en van (Paris → Menton, environ 950 km) fait environ 4 500 €.
- Ce qui n'a pas pu être vérifié d'ici : le vrai format de la réponse
  d'ORS avec `tollways`, lu dans sa documentation. Une réponse qui ne le
  porte pas rend « on ne sait pas », jamais une erreur.
