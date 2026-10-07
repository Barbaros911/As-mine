# Le formulaire public — Bloc 3 (7 octobre 2026)

Suite des Blocs 1 (positionnement) et 2 (photo « Paris la nuit »). Mission :
amener le formulaire de réservation au niveau du bandeau, **sans toucher à sa
logique**. Barbaros a délégué les choix (« comme si c'était ton site ») après
avoir vu un prototype en images ; il a tranché l'en-tête et le bouton du
bandeau sur captures.

## Ce que l'audit a mesuré avant d'écrire une ligne

- **Le bouton principal était le texte le moins lisible** : blanc sur un
  dégradé bleu → cyan clair, 4,1:1 au début, **2,8:1 sous le texte**, 2,0:1 à
  la fin. Sous le seuil WCAG AA.
- **Aucun champ ne montrait qu'il était actif** : la façade ne dessinait qu'un
  contour cyan à 25 % (1,2:1) autour de la saisie, en rectangle, à l'intérieur
  du cadre arrondi.
- **« Voir mon prix » sans adresse était muet** : le curseur allait dans le
  champ, rien d'autre. Une adresse tapée mais pas choisie : pareil, et la liste
  restait fermée.
- **Libellés coupés** : « D… » à 390 px, « Date » disparu à 320, la date
  affichée « 10/06/20 ». La cause : des chevrons décoratifs, faux en plus
  (Passagers et Bagages ne sont pas des menus, l'arrivée n'ouvre rien).
- **La ligne qui rassure était à moitié sous la barre du bas** à 390 × 844
  (773–788 pour une barre à 782), et elle disait « Disponibilité confirmée par
  WhatsApp ou SMS », faux depuis l'option A du 4 octobre (le client choisit :
  appel, SMS, WhatsApp, Telegram, iMessage).
- **Trois familles d'icônes** (épingles et valise pleines, le reste au trait)
  et des **emojis** dans les suggestions (🏛 ✈️ 📍 ✏️…).
- **Textes d'exemple à 3,6:1**, « Maintenant » à 4,2:1 en 11,5 px.

## Ce qui a été fait, et pourquoi

- **Carte bleu nuit**, verre translucide sur ordinateur (fond à 86 % au moins,
  le contraste reste garanti). Libellés 7,9:1, valeurs 15,5:1.
- **« Voir mon prix » cyan plein, texte bleu nuit (8,3:1).** L'alternative
  bleu `#0E6FC7` + blanc (5,1:1) a été écartée : sur une carte bleu nuit elle
  ne ressort pas.
- **« Réserver mon trajet » en contour** (sa décision, sur capture) : deux
  boutons pleins dans le même écran se disputaient l'attention. Il ne fait que
  descendre au formulaire ; au-delà de 1100 px il est masqué (Bloc 2).
- **Le trajet relié** : point au départ, épingle à l'arrivée, pointillé entre
  les deux. Il s'efface dès que quelque chose s'intercale (message, numéro de
  chambre, liste ouverte), par `:has()` ; sans `:has()`, il ne s'affiche pas.
- **Deux rangées dès 600 px** (Départ | Arrivée, puis Date · Heure ·
  Passagers · Bagages). La tablette n'est plus le téléphone étiré ; la carte
  d'ordinateur passe de 365 à 261 px et rend la photo. La date prend 1,22 part
  contre 0,78 pour l'heure : « Date » + « Maintenant » tiennent.
- **« − / + »** : même champ, mêmes bornes HTML, mêmes événements `input` puis
  `change` qu'une frappe ; le chiffre reste tapable (groupes). Hors de l'ordre
  de tabulation (les flèches du champ font le travail au clavier) ; nommés pour
  les lecteurs d'écran, en deux langues. Invisibles hors du site public
  (`.pas{display:contents}`, `.pas-btn{display:none}` dans index.html).
- **Message sous le champ** quand une adresse manque, rouverture de la liste
  quand elle est écrite mais pas choisie. Site public seulement : la page d'un
  hôtel et le comptoir gardent leur comportement.
- **Pictogrammes au trait** dans les suggestions : index.html pose la
  catégorie (`data-cat`) sur l'icône, la façade dessine un masque SVG et efface
  l'emoji. Catégorie inconnue → l'épingle.

## Les pièges rencontrés

- **La réception masquait la rassurance par sa CLÉ** (`:has([data-t="dispo"])`
  dans hotel-engine-polish.css) : changer la clé l'aurait fait réapparaître au
  comptoir. Le sélecteur vise désormais la place (`.reserver > .rassure`).
- **Une zone d'appui dessinée en débord fait déborder le libellé.** Le
  `::after` en `inset` négatif de « Maintenant » rendait le titre « Date »
  plus large que sa boîte : invisible à l'œil, vu par le contrôle des
  libellés coupés. La zone d'appui est maintenant le bouton lui-même (marge
  intérieure reprise par une marge négative), la pastille est dessinée dedans.
- **La liste rouverte se refermait dans la même milliseconde** : le clic sur
  « Voir mon prix » remonte jusqu'au document, où « clic ailleurs » ferme la
  liste. Rouverture différée (`setTimeout 0`).
- **Mesurer un contraste sur une capture « pleine page » ment** : Playwright
  agrandit la fenêtre le temps de la prise, la mise en page bouge, et le fond
  lu n'est plus celui du texte (un message clair sur bleu nuit mesuré à
  1,3:1). La suite agrandit la fenêtre AVANT de relever les positions.
- **Les budgets** : à 390 × 844 le bouton finit à 751, la rassurance à 779
  (barre à 782) ; à 1366 × 657 le bouton finit à 646.

## L'en-tête et le logo

Il voulait que le haut de la page ne soit plus blanc, puis : « je veux garder
mon logo original ». Or ses lettres sont bleu nuit (≈ #002048) : sur un
en-tête bleu nuit, contraste mesuré 1,1:1, il disparaît. La version blanche
officielle (`brand-logo-white.png`) a été montrée et refusée — c'est un autre
logo à ses yeux. Trois images (A blanc / B bleu nuit sans rien / C bleu nuit
avec cartouche blanc) : **il a choisi C**.
- Le cartouche est blanc, arrondi, avec une ombre légère : il rend au logo le
  fond pour lequel il est dessiné (16:1).
- **C'est le cartouche qui s'aligne sur la colonne**, pas le logo dedans.
  Calé sur le logo, il collait au bord du téléphone (4 px) et dépassait de
  10 px la colonne du titre sur ordinateur. Le logo s'est donc décalé de
  10 px (24 au lieu de 14 à 390 px, 60 au lieu de 50 à 1280 px) ; fichier,
  taille, filtre et opacité sont inchangés. La table de test-nouveau-bascule
  et la mesure d'alignement de test-public-ordinateur ont suivi.
- La hauteur de l'en-tête ne bouge pas (62 / 68 px) : la grandir aurait
  repoussé « Voir mon prix » sous la barre du bas.

## Ce qui reste, hors de ce bloc

- **Le moteur de recherche** (plus de propositions, meilleure correction des
  fautes) : mission à part. `api-adresse.data.gouv.fr` et `photon.komoot.io`
  sont bloqués par le réseau de la machine de travail : à ouvrir dans les
  réglages de l'environnement avant de le régler sur de vraies requêtes.
- **Les sélecteurs natifs de date et d'heure sur iPhone** ne s'éprouvent pas
  ici (Chromium seulement) : à regarder sur un vrai téléphone.
