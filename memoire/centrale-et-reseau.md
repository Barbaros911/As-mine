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
  Mesuré : le bloc passe de 579 à 974 px sur téléphone (832 après la
  relecture, plus bas), de 392 à 594 px sur ordinateur ; « Voir mon prix » ne
  bouge pas.
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

## La relecture « 10/10 ? » (même jour) — ce qui a été resserré

Barbaros : « Ta tout fait comme un expert 10/10 ? » La réponse honnête était
non, sur trois points, puis « Corrige tout sauf les notes Google » :
- **Une redite sur l'accueil** : le pilier « Confirmée avec un chauffeur
  attribué » et l'étape 2 disaient la même chose, et le bloc faisait 974 px
  sur téléphone. L'étape 2 ne dit plus que COMMENT on est prévenu (« Par appel
  ou message, selon votre choix ») ; le pilier devient « Confirmée avec son
  chauffeur » (une ligne) ; l'introduction n'annonce plus ce que les étapes
  disent (« une seule demande, et nous organisons le reste ») ; l'étape 1 tient
  sur une ligne. **974 → 832 px**, aucune information perdue.
- **Une redite sur la page pro** : la colonne « Un chauffeur en direct »
  redisait « Ce que vous n'avez plus à organiser », juste au-dessus. Deux
  lignes en face de trois ; l'introduction devient « Elatransfer ne remplace
  pas le chauffeur : elle organise tout ce qu'il y a autour de la course »
  (respect du chauffeur, sans redire la colonne). **1 476 → 1 266 px**.
- **« pick-up » coupé en fin de ligne** en anglais : U+2060 après le trait
  d'union, la même parade que « 7 h–22 h » (`memoire/textes-publics.md`).
- **La description Google de l'accueil** dit maintenant « Elatransfer,
  centrale de réservation de transferts avec chauffeur : … » (144 caractères,
  entière dans Google), dans les quatre copies de `index.html` et dans
  `seo-ela.mjs`. **Pas dans le titre**, et c'est voulu : le titre porte les mots
  que les gens tapent (« transferts aéroport », « chauffeur privé », « Paris »),
  personne ne cherche « centrale de réservation ».
- **Laissé, et dit** : la note Google reste éteinte (sa décision, #407) ; les
  mentions légales attendent la société (SIRET, raison sociale, siège) ; le
  remplaçant « au même prix » reste, parce que les CGV le prévoient déjà
  (art. 8) — c'est une promesse qu'il tient à chaque course, et l'anglais dit
  « we look for another », jamais « we find another ».

## La fiche papier des hôtels (même jour, après la fusion de #410)

Barbaros : « Le PDF est sur le site ? » — non : `commercial/fiche-hotels.html`
n'est pas publiée, on l'imprime en PDF pour un directeur. Montrée entière, elle
gardait deux défauts que la PR #410 n'avait pas vus, faute de contrôle sur
elle : « suivons le trajet **jusqu'au bout** » (contraire aux CGV art. 2) et
« confirmée » là où l'espace réception affiche « **Réservation validée** ».
Puis « Corrige tout comme un expert, inspiré de mes exemples concurrents » —
le comparatif du dépôt (`memoire/programme-partenaire.md` § 10) :
- **Le levier des concurrents** (Welcome Pickups, Transfeero : « gratuit pour
  l'hôtel + une rémunération par transfert », sans contrat) entre sur la
  fiche avec la phrase validée de la page pro, au conditionnel, sans montant.
- **Ce qui nous distingue d'eux** est dit : le réseau dans le chapeau, la
  relève dans l'espace réception, « Plus aucun chauffeur à chercher », et un
  humain joignable — les horaires à côté du numéro, qui manquaient (règle du
  22/10).
- « Plus d'appels à passer » se lisait dans les deux sens : réécrit.
- Mesuré : A4 tenue (marge libre 4,3 mm au-dessus du cadre), rien ne
  déborde, QR intact. `test-public-centrale` lit maintenant la fiche (11
  contrôles) ; sur l'ancienne, 3 tombent en citant la phrase.

Puis, même soirée : « Rends-la cliquable… ce n'est pas destiné seulement aux
hôtels mais aussi aux professionnels en tout genre ! »
- **Cliquable** : mesuré d'abord, le PDF ne portait AUCUN lien (zéro
  annotation `/URI`) — un directeur qui le lit par e-mail sur un ordinateur ne
  pouvait rien ouvrir. Téléphone (`tel:`), WhatsApp, e-mail, site et le QR
  lui-même sont de vrais liens ; Chromium les garde dans le PDF (4 adresses).
- **Pour tous les professionnels** : badge « Professionnels », titre « Votre
  équipe réserve. Elatransfer gère tout le reste. », « Hôtels, agences,
  entreprises, événements » dans le chapeau, « Votre espace équipe » (le nom
  que la démo donne déjà à l'espace d'une agence ou d'une entreprise), le
  numéro de chambre gardé comme cas de l'hôtel. La preuve reste « dans
  l'hôtellerie » : c'est là qu'elle est vraie. Le fichier et le code
  `fiche-hotels` gardent leur nom (le code est enregistré côté serveur).
- `test-public-centrale` : la fiche vise agences et entreprises, ses liens et
  son QR sont cliquables, le PDF les garde (4 contrôles, tous tombent sur la
  fiche d'avant).
- **Pas touché ce jour-là** : la page Professionnels (faite le soir même,
  plus bas).

**Le paiement, même soir.** Barbaros proposait de ne plus faire payer par
lien (réception : payer le chauffeur à bord ; page client : payer en ligne).
Avis donné : (1) ne plus VENDRE le mécanisme — « réglé directement au
chauffeur, avant le départ », toujours vrai, aux CGV inchangées ; (2) ne pas
revenir au paiement à bord pour la réception, la raison du 11/10 tient (un
client absent à 5 h, un chauffeur venu pour rien) ; (3) le paiement en ligne
sur la page est la vraie cible (Welcome Pickups, Transfeero), mais il faut la
société et Stripe Connect — à moitié construit, bloqué par le SIRET. Il a dit
oui à (1) et (3) plus tard. Fait : page Professionnels (FR/EN) et fiche ;
l'accueil, le tunnel, les CGV et le message au client gardent « par lien » —
c'est là que le client en a besoin. `test-public-centrale` le garde.

**La page Professionnels pour tous (même soir).** « 1 oui 2 on attend » :
oui à l'ouverture de la page aux autres professionnels, le paiement en ligne
attend le SIRET. Même vocabulaire que la fiche : surtitre « Hôtels · Agences
· Entreprises · Événements », titre « Votre équipe réserve. Elatransfer gère
tout le reste. », « Votre espace équipe », « Votre structure », « clients,
collaborateurs et invités » ; boutons « Voir la démo » (page et encart de
l'accueil), « La démo, à votre nom ». L'hôtel reste un cas nommé (numéro de
chambre, maquette « Hôtel Exemple »), la preuve reste « dans l'hôtellerie ».
Le `<title>` garde « hôtel » (Google et `test-pro-page`). Garde :
`test-public-centrale` exige un titre sans « réception » et une page qui nomme
agences et entreprises (FR et EN) ; il tombe sur la page d'avant.

**Les termes du métier (même soir).** « Utilise de vrais termes commerciaux,
10/10, partout » : les titres et boutons parlent comme les pages B2B du
secteur, sans les mots refusés (« solution », « plateforme », « mobilité »…).
Page pro, encart de l'accueil et fiche : « Essayer la démo », « Demander une
proposition », « Vos défis au quotidien », « Ce que vous n'avez plus à
gérer », « Une offre clé en main » (page de réservation, espace équipe,
« Un interlocuteur unique »), « Comment ça marche », « Vos avantages »,
« Démo personnalisée et gratuite », « Accéder à ma démo », « Questions
fréquentes », « Demandez votre proposition ». Chaque mot reste tenu : « clé en
main » = rien à installer, mise en place faite par nous ; « un seul numéro » =
le +33 7 59 31 24 33 ; la démo s'ouvre sur les trois écrans (mesuré, aucun
débordement). Les tests ne figent plus le libellé du bouton : ils exigent
qu'il nomme la démo sans la réserver aux hôtels.

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
