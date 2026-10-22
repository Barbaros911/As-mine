# La page hôtel — l'analyse qui a précédé (septembre 2026) — archive

> **Ceci est une archive, sortie de `CLAUDE.md` le 11 octobre 2026.** La page
> a été construite depuis, en mode hôtel du site (section « LE MODE HÔTEL »
> de `CLAUDE.md`), et sa finition est devenue commune à tous les partenaires
> (`memoire/finition-commune.md`). Rien n'a été réécrit ci-dessous.


> **Elle est construite.** Voir « LE MODE HÔTEL — LA GRILLE D'UN PARTENAIRE,
> DANS LE MÊME FICHIER » plus bas, qui dit ce qui existe aujourd'hui. La
> section ci-dessous garde l'analyse qui a mené à la décision — utile pour
> comprendre d'où elle vient, pas pour savoir ce que fait le site.

Septembre 2026. Il a apporté un cahier des charges tout écrit pour une page
`easyhotel-tremblay.html` : départ figé, sept destinations en menu, forfaits
au lieu du kilométrage, un seul bouton WhatsApp, pour qu'une réception
réserve en moins de trente secondes. **Le cadrage est bon** — c'est
exactement ce qu'une réception peut faire entre deux clients. **Rien n'a été
construit** : trois points ont été soulevés, il doit trancher.

**1. LE PARTENARIAT EST RÉEL — c'était mon objection, elle tombe.** Le mémo
disait « easyHotel n'est pas un partenaire » ; c'était vrai à l'époque du cas
de test, et Barbaros a confirmé depuis que ce ne l'est plus. **Il n'y a donc
plus d'obstacle à publier une page à leur nom.**

**LE LIBELLÉ EST TRANCHÉ : « easyHotel Aéroville »** (septembre 2026, à sa
demande). Le cahier des charges en donnait deux — « easyHotel Paris Charles
de Gaulle Villepinte » dans le contexte, « easyHotel Aéroville » comme départ
figé ; c'est le second. **Ne pas le réécrire** : c'est le nom que la réception
et l'hôtel emploient entre eux.
**MAIS L'ADRESSE POSTALE COMPLÈTE DOIT PARTIR DANS LE MESSAGE WHATSAPP** —
`10 rue de la Belle Borne, 93410 Tremblay-en-France`. Plusieurs easyHotel
entourent CDG : un nom de marque seul envoie le chauffeur au mauvais, à
5 h du matin, avec un vol à prendre. Le libellé est pour l'écran, l'adresse
est pour le chauffeur ; ce sont deux besoins différents et il faut les deux.

**2. LA GRILLE FORFAITAIRE PROPOSÉE LE FAIT PERDRE DE L'ARGENT SUR LE VAN.**
Comparé à ce que le site facture depuis le passage à 2,35 / 4,08 €/km
(distances approximatives — le calculateur est injoignable depuis cette
machine, à refaire exactement avant toute décision) :

| Van, de jour | Sa page | Le site | Écart |
|---|---|---|---|
| Orly | 125 € | ~180 € | **−55 €** |
| Disneyland | 120 € | ~160 € | **−40 €** |
| Beauvais | 240 € | ~290 € | **−50 €** |

En berline c'est l'inverse — il est au-dessus partout, ce qui est normal pour
un canal hôtel qui prend une commission. **Sauf Orly : 100 € sur la page,
~110 € sur le site.** Un client d'hôtel ouvre elatransfer.com en dix secondes.

**C'EST VOULU — IL A TRANCHÉ** (septembre 2026). Le van moins cher que le
site sur les longues courses est un **prix d'appel pour décrocher l'hôtel**,
pas une dérive. **Ne jamais « corriger » cette grille pour l'aligner sur le
kilométrage** : c'est exactement le genre de chose qu'une prochaine session
prendrait pour un défaut.
- **CONSÉQUENCE À NE PAS MANQUER : la page sera PUBLIQUE.** Une adresse
  devinée ou partagée, et n'importe qui réserve un van pour Orly à 125 € au
  lieu de 180. Elle doit donc porter **`noindex`** — comme `admin.html` et
  `/exploitant/` — et son adresse ne se communique qu'à l'hôtel. Ce n'est pas
  un secret, c'est une porte qu'on ne met pas dans Google.
- Et le jour où un autre hôtel arrive, **la grille est par HÔTEL**, pas
  globale : deux partenaires ne se négocient pas au même prix.

**3. CE SERAIT LA DEUXIÈME GRILLE DE PRIX DU PROJET**, et c'est la faute
évitée deux fois déjà : le calcul de l'espace exploitant réutilise
volontairement celui du client parce que **deux calculs qui divergent ne se
voient pas**. Il a changé ses tarifs le soir même ; une grille figée dans une
page à part serait périmée à la décision suivante.

**CE QUI MANQUE DANS LE CAHIER DES CHARGES POUR QU'UNE RÉSERVATION SOIT
EXPLOITABLE** — ce ne sont pas des détails, chacun casse une course :
- **aucune date** : à 23 h, « 6 h 00 » c'est quel jour ?
- **aucun téléphone** : le chauffeur à 5 h du matin appelle qui ?
- **rien n'arrive sur le serveur**, WhatsApp seulement : un envoi raté depuis
  la tablette de la réception et la réservation n'existe nulle part. C'est
  exactement le défaut corrigé deux jours plus tôt.
- **la provenance est perdue**, donc on ne saurait pas ce que l'hôtel
  rapporte — alors que c'est toute la raison d'être de l'affiche QR.
- **« berline 1–3 / van 4–7 »** : la berline fait **4** places. Un groupe de
  quatre paierait un van là et une berline sur le site.
- **le préavis de 15 minutes n'existe pas** sur cette page.

**CE QUI A ÉTÉ PROPOSÉ À LA PLACE : un MODE HÔTEL du site existant**, pas une
page autonome. `?h=<nom>` préremplit déjà le départ ; il ne manque que les
destinations fermées et les forfaits. On garde un seul code, un seul dépôt
serveur, la provenance, le délai — et **la grille hôtel vit à un seul
endroit**, à côté de l'autre. Une page autonome voudrait dire un second
logo, un second jeu de couleurs et une seconde grille à tenir, plus une
ligne de plus dans `construire.sh` sous peine de 404.

---

## Archivé de CLAUDE.md le 22/10/2026

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## LA PAGE HÔTEL — L'ANALYSE QUI A PRÉCÉDÉ

L'analyse de septembre (cahier des charges easyHotel, grille comparée au site,
ce qui manquait) : `memoire/page-hotel-analyse.md`. Ce qui en reste vrai : le
libellé est « easyHotel Aéroville », mais l'**adresse postale complète** part
chez le chauffeur ; le van moins cher que le site est un **prix d'appel voulu**
— ne jamais l'« aligner » ; la grille est **par hôtel**.
