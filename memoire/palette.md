# La palette — histoire

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## LA PALETTE — LE BLEU ELA, PLUS AUCUN VERT

**Le vert céladon est retiré de partout le 4 octobre 2026** (Barbaros, capture
de l'écran des prix : « il y a encore l'ancienne couleur verte, enlève les
anciennes couleurs de partout »). Les rôles gardent leur nom, seules leurs
valeurs ont changé, et ce sont celles de l'admin :

| Rôle | Valeur | Où |
|---|---|---|
| `--fond` | `#F2F5F9` | le papier — **jamais `#FFF`** |
| `--carte` | `#FFFFFF` | seulement les cartes posées dessus |
| `--noir` | `#16232B` | l'en-tête, le bandeau |
| `--encre` | `#151C22` | le texte |
| `--gris` | `#5A6A7B` | le texte secondaire |
| `--filet` | `#E1E8EF` | les bordures |
| `--accent` | `#0E6FC7` | boutons, sélection, onglet actif, tracé de la carte |
| `--accent-clair` | `#E8F2FD` | les fonds d'accent |
| `--accent-vif` | `#12C4EE` | la marque |
| `--accent-encre` | `#0A4F91` | l'accent en TEXTE sur `--accent-clair` |

- **Ce qui le cachait** : la façade (`application-facade.css`) repeignait une
  partie du site en bleu, mais `index.html` gardait le céladon à la racine ET
  écrit en dur dans une trentaine de dessins, le tracé de la carte et ses
  repères. On a changé la SOURCE, pas ajouté une couche de plus.
- **Ne jamais renommer ces variables d'après la teinte du jour** : un rôle
  nommé par sa couleur finit par ramener la couleur.
- **Restent, et ce sont des états ou des marques** : le rouge de l'attente
  (`#C9302F`), le vert WhatsApp (`#25D366`, une marque), le vert « Réservation
  validée » de la liste de la réception (un état), l'orange d'un partenaire.
- Contrôle : sur le site construit, aucune couleur verte calculée hors
  WhatsApp sur l'écran des prix (vérifié le 4/10/2026). Blanc sur `--accent`
  5,1 ; `--accent-encre` sur `--accent-clair` 7,6.

## La troisième couleur : l'or doux (24 octobre 2026, remplacée le même jour)

Barbaros, après la refonte des pictogrammes de la liste des lieux : « les
icônes aussi sont trop bleues. Tout est bleu sur mon site, il faudrait une
troisième couleur ». Fond bleu nuit, champs bleus, boutons et pictogrammes
cyan : l'œil n'avait rien où s'arrêter.

- **Choisie : un or doux, `#E8C47C`**, rôle `--f-picto` dans la façade. Les
  autres teintes étaient prises : le rouge (l'attente), le vert (WhatsApp, la
  confirmation), l'orange (un partenaire) ; un violet serait resté dans le
  bleu. L'or sur bleu nuit est l'accord classique du transport haut de gamme.
  8,8:1 sur le fond de la liste.
- **Où** : seulement les pictogrammes des lieux (dessin et liseré de la
  pastille, sur une pastille neutre à 6 % de blanc). Un premier essai à fond
  doré donnait un brun terne sur le bleu nuit : écarté. Le bleu reste aux
  champs, aux boutons et à « Voir mon prix ».
- **Pas ailleurs sans sa demande.** Autres places possibles, non faites :
  l'épingle des champs, la ligne « AÉROPORTS · GARES · HÔTELS · SALONS »,
  « Surclassement possible ».
- Contrôle : `test-public-suggestions.mjs` éprouve la règle (le rouge domine
  le bleu dans la teinte des pictogrammes), pas la valeur.

## Les icônes : une seule famille, une couleur par sujet (24 octobre 2026)

L'or doux n'a pas tenu la journée. Barbaros : « est-ce vraiment les
meilleures icônes ? Compare à Uber et Bolt », puis « je veux 10/10 », « c'est
trop fade, il faut mettre de la couleur », et sur la liste des lieux : « une
couleur pour chaque chose ».

- **Ce qui a été montré, dans l'ordre** (images dans la conversation) : cinq
  styles d'or (verre, pastilles…), une version sobre à la Uber, quatre styles
  sur de vraies bibliothèques (Plans d'Apple, signalétique d'aéroport jaune,
  deux tons, fin et chic), puis trois façons de colorer (A jaune partout,
  B ambre doux, C une couleur par sujet). **Il a choisi C.** Le jaune de la
  signalétique avait été présenté comme « ta signature » : faux, il l'a
  relevé (« le jaune, ce n'est pas ma couleur signature, tu viens de la
  mettre »). La marque reste le bleu ELA et le cyan.
- **Une seule famille** : Material Symbols Rounded (Google, Apache 2.0),
  chemins copiés tels quels du paquet npm `@material-symbols/svg-400` 0.48.1,
  graisse 400 ; la licence est publiée avec le site
  (`icones/LICENSE-material-symbols.txt`). Au trait sur la page, pleines dans
  la liste des lieux et sur l'onglet allumé. Elles remplacent, dans la
  façade seulement, les dessins faits main de `index.html` (cachés) : la page
  de l'hôtel et l'admin gardent les leurs. WhatsApp et Telegram gardent leur
  logo. Mesuré avant : un dessin différent par icône, presque tous au bleu des
  boutons.
- **La règle de couleur** : sur le clair, un fond pâle et un dessin franc de
  la même teinte ; sur le bleu nuit, un fond pastel plein et un dessin encre
  (une teinte à 16 % posée sur le bleu nuit tournait au gris-vert : 3,5:1).
  Une teinte par sujet dans chaque bloc. Le vert ne sert qu'à « Confirmée »
  (la couleur d'une course confirmée). Appeler est orange, écrire violet,
  partout. Contrastes : 4,6:1 au plus faible pour une icône de sujet sur la
  page (la flèche grise des documents légaux, inchangée, est à 3,1), 8,7:1
  dans la liste.
- **La liste des lieux** : dix couleurs, une par type de lieu (aéroport violet,
  gare orange, hôtel rose, culture jaune doux, restaurant corail, santé
  menthe, école anis, spectacle lilas, rue sable, adresse cyan). La règle
  annoncée un moment, « cinq couleurs, jamais une sixième », ne tenait pas
  avec dix types de lieux : elle est devenue « une couleur = un type de lieu,
  toujours la même ». Le crayon « Mon adresse n'est pas dans la liste » reste
  un contour : c'est un bouton, pas un lieu.
- **Écartés, et pourquoi** : la pastille ronde de couleur avec dessin blanc
  (blanc sur moutarde 2,3:1) ; le jaune partout (une nouvelle couleur de
  marque qu'il n'a pas choisie) ; le trait fin champagne (1 px à l'écran,
  fragile au soleil).
- Contrôles : `test-public-icones.mjs` (plus un dessin fait main à l'écran,
  une famille, une couleur par sujet, jamais le bleu des boutons, 3:1 au
  moins, onglet allumé plein) et `test-public-suggestions.mjs` (une couleur
  par type de lieu, dessin à 4,5:1 au moins). Les deux tombent sur l'ancien
  code (7 et 2 échecs).
