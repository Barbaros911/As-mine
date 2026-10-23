# Une centrale, un large réseau — histoire (23 octobre 2026)

La règle en vigueur est dans `CLAUDE.md` (« Le visuel et la marque », puce
« Centrale de réservation, large réseau ») ; ici, le pourquoi.

## La demande

Barbaros, en expert UX / CRO / copywriting : qu'on ne prenne plus Elatransfer
pour « un simple chauffeur » ou « un site pour demander une voiture », mais
pour une **centrale de réservation et de coordination** qui reçoit la demande,
cherche et attribue le chauffeur dans un réseau, confirme, coordonne, et donne
aux professionnels un interlocuteur unique. Avec des interdits nets : aucun
faux chiffre, **aucun nombre de partenaires**, **aucune localisation précise
d'un partenaire**, aucune disponibilité absolue, jamais « nous commençons » ni
« un seul établissement », et une course confirmée seulement avec un chauffeur
réellement affecté. Il a demandé un mini-audit d'abord, puis les modifications.

## Ce que l'audit a trouvé (site construit, 390 × 844 et 1366 × 768)

- **Déjà bon, gardé** : le titre de la page Professionnels (« Votre réception
  réserve. Elatransfer gère tout le reste. »), « Ce que vit votre réception »,
  « Ce que vous n'avez plus à organiser », les captures de la démo, la
  question « Et si aucun chauffeur n'est disponible ? », la ligne « Prix
  annoncé à l'avance · Réglé au chauffeur », « Inclus dans chaque course ».
- **Ce qui affaiblissait** : nulle part le mot « réseau » ; l'accueil disait
  « choisit le chauffeur » comme s'il n'y en avait qu'un à choisir ; la page
  pro disait « nous trouvons le chauffeur » sans dire où.
- **Deux contradictions** :
  1. « suit [la course] jusqu'à votre arrivée » (accueil, page pro, fiche
     hôtels) contre « jusqu'à la prise en charge » (pages CDG, Orly, Chauffeur,
     les cinq pages anglaises et **les CGV, art. 2** : Elatransfer « coordonne
     les informations utiles jusqu'à la prise en charge »). Le contrat gagne :
     tout dit maintenant « jusqu'à la prise en charge ».
  2. « Déjà en service dans un hôtel de la zone de Roissy-CDG » (page pro,
     fiche hôtels) : un compte (« un hôtel ») et un lieu qui désigne presque le
     partenaire — exactement ce que la demande du 23/10 interdit. Devenu
     « Déjà en service dans l'hôtellerie, en Île-de-France ». C'est la règle
     du 8/10 (« au singulier ») qui change, sur sa consigne : la phrase reste
     vraie (le service tourne dans un hôtel), ne compte rien et ne situe
     personne. Toujours **à retirer si ce service cesse**. Jamais « partenaire »
     dans cette phrase : easyHotel n'a pas d'accord écrit (14/10).
- **Le vrai trou de crédibilité ne se code pas** : « est-ce une vraie
  entreprise ? » se répond par les mentions légales, où manquent raison
  sociale, SIRET et siège. Rappelé dans l'audit.

## Ce qui a été écrit, et pourquoi ces mots-là

- **Les mots interdits du 8/10 tiennent** : ses propres exemples disaient
  « solution », « mobilité » ; `test-public-textes` et `test-pro-page` les
  refusent (Google recopiait « solutions de mobilité »). Les phrases proposées
  ont été réécrites sans eux. « Elatransfer » reste en un mot (il écrit
  « ElaTransfer »).
- **« Un large réseau », jamais un nombre.** La seule trace d'un nombre dans
  le dépôt est « un groupe WhatsApp de plus de 800 chauffeurs » (`CLAUDE.md`) :
  ce sont des membres d'un groupe, pas des chauffeurs dont on a vérifié la
  carte, l'inscription et l'assurance — ni « mobilisables », ni « des
  milliers ». Rien ne permet d'écrire un chiffre ; « large » est défendable.
  Jamais « nos chauffeurs » ni rien qui en fasse des salariés : ils restent
  « professionnels indépendants, sous leur propre carte professionnelle et
  leur assurance ».
- **Accueil, bloc « Qui sommes-nous »** (juste sous le formulaire, sans
  nouvelle section : l'ordre est verrouillé et la page assez longue) :
  titre « Vous réservez, nous trouvons votre chauffeur. » — la phrase que le
  client doit se dire ; puis « Elatransfer est une centrale de réservation… » ;
  puis trois piliers dans **un** panneau, non numérotés (une seule suite
  1·2·3 à l'écran) : « Un large réseau de chauffeurs » (porte la phrase
  d'intermédiaire, CGV art. 2 et 9), « Confirmée avec un chauffeur attribué »
  (CGV art. 3 : sinon on le dit et rien n'est dû), « Un seul interlocuteur »
  (avec le remplaçant au même prix, CGV art. 8 « peut remplacer », d'où « nous
  en cherchons un autre »). L'étape 2 dit « Nous cherchons un chauffeur
  disponible ». Le pilier « Déjà opérationnel » qu'il proposait est allé là où
  il parle à son lecteur : l'encart pro de l'accueil (« Déjà en service dans
  l'hôtellerie ») et la page pro. Pour un voyageur, « qui me répond s'il y a
  un problème » rassure plus qu'un hôtel qu'il ne connaît pas.
  Mesuré : le bloc passe de 579 à ~930 px sur téléphone, de 392 à 594 px sur
  ordinateur ; « Voir mon prix » ne bouge pas.
- **Page Professionnels** : « Comment ça se passe » devient **« Plus qu'un
  numéro de chauffeur »** : deux colonnes de même poids (« Un chauffeur en
  direct » : un numéro, ses disponibilités, un empêchement à gérer, un suivi
  par téléphone — rien qui le juge ; « Avec Elatransfer » : un interlocuteur,
  un large réseau, un remplaçant au même prix, l'état de chaque demande dans
  l'espace réception), puis « Le parcours d'une demande » en **quatre**
  étapes (demande → recherche → confirmation → prise en charge) : la recherche
  et l'attribution n'étaient pas dites. `test-public-finition` exigeait
  « trois étapes » : il éprouve maintenant la frise (au moins trois, chacune
  reliée à la suivante), pas un compte. Le bandeau dit « nous cherchons le
  chauffeur dans un large réseau de professionnels » ; la carte « Notre prise
  en charge » devient « Notre coordination » (« prise en charge » est l'heure
  du rendez-vous sur ce site, cf. `memoire/textes-publics.md`) ; une question
  « Comment trouvez-vous le chauffeur ? ». Description Google raccourcie à
  151 caractères (l'ancienne était coupée).
- **Pages CDG, Orly, Chauffeur et les cinq pages anglaises** : « Qui vous
  conduit » dit « Elatransfer, centrale de réservation, … cherche le chauffeur
  dans un large réseau de professionnels ». **La fiche hôtels** (non publiée)
  suit la page pro.

## « Elatransfer en chiffres » — prêt, éteint

`chiffres.json` (non publié) + `.github/scripts/chiffres.mjs`, appelé par
`construire.sh` après la note Google, sur le même modèle : un repère vide sur
la page pro, rempli ou **retiré** à la construction, qui ne bloque jamais la
publication. S'allume avec `afficher: true` et une date de relevé de moins de
90 jours ; chaque chiffre exige une **source** écrite, un nombre positif, ses
deux libellés sans chiffre ; un pourcentage ≤ 100 ; jamais arrondi vers le
haut ; jamais dans les données structurées. Trois lignes modèles (courses
réalisées, taux de confirmation, destinations), valeurs vides. Ce que le
script ne peut pas juger, et que la règle dit : **jamais le nombre de
partenaires**, et un nombre de chauffeurs ne compterait que des chauffeurs
dont le carnet a les papiers. `test-public-chiffres` (35 contrôles ; sans le
contrôle de source, sans la bascule de langue ou sans l'étape de
construction, il tombe en nommant le défaut).

## Ce qui garde la règle

`test-public-centrale` : sur 12 pages publiques construites (FR et EN), aucun
nombre de partenaires ni de chauffeurs, aucune disponibilité garantie, aucun
suivi « jusqu'à l'arrivée », aucun mot qui dénigre un chauffeur ; « centrale
de réservation » et « réseau » dans « Qui sommes-nous » ; « réseau » dans le
bandeau pro ; une preuve d'activité sans lieu précis ni compte. Sur le site de
`main` d'avant : 10 contrôles tombent, chacun en citant la phrase fautive.

**Piège payé** : la page pro s'est allongée de ~1 000 px sur téléphone, et
`test-pro-page` / `test-pro-formulaire` lisaient la position de `#demo` 700 ms
après l'appui sur « Voir la démo hôtel » — en plein défilement doux (905 px ;
84 px à l'arrêt, comme avant). Ils attendent maintenant que le défilement
s'arrête ; la règle (« sous l'en-tête collant ») n'a pas bougé. Sur `main`, la
même lecture donnait déjà 581 px à 700 ms sur une machine chargée : le
contrôle passait de justesse.
