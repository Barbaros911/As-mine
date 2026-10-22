# L'affiche des hôtels et l'encodeur QR — histoire

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## L'affiche des hôtels, et l'encodeur QR

**L'ENCODEUR QR EST ÉCRIT DANS LA PAGE**, pas pris chez un tiers.
`api.qrserver.com` ajouterait une dépendance réseau à une affiche qu'on
imprime une fois, et enverrait l'adresse à quelqu'un qui n'a pas à la
connaître. Mode octet, correction M, **versions 1 à 6** — jusqu'à 106
caractères. S'arrêter à la 6 évite les blocs d'information de version
(obligatoires dès la 7) et garde un seul motif d'alignement.

**UN ENCODEUR NE SE VÉRIFIE PAS TOUT SEUL — LEÇON PAYÉE.** Le premier jet
passait TOUS mes contrôles internes : format relu, masque, zigzag,
Reed-Solomon divisible, dix syndromes nuls. Et il n'était lisible par
**aucun téléphone**. L'information de format était écrite **bit à
l'envers** ; mon décodeur maison reproduisait la même erreur et ne voyait
rien. Seule la comparaison avec un **décodeur indépendant** (`jsqr`, plus
un générateur de référence `qrcode` pour comparer module par module) l'a
montré. `test-nouveau-affiche.mjs` rend le SVG **final** en image et le
décode : sans ça, Barbaros imprimait cinquante affiches dont aucune ne se
scanne.
- Le SVG porte son **`xmlns`** : sans lui il s'affiche dans la page mais
  ne peut plus être chargé comme image ni collé ailleurs.
- **SVG et non canvas** : une affiche s'imprime, un canvas de 200 px sort
  en bouillie sur du papier.
- **À l'impression, seule l'affiche sort** — `visibility:hidden` sur tout
  puis `visible` sur l'affiche (elle s'hérite ; `display:none` sur les
  enfants de `body` emporterait l'affiche avec eux). Sans cette règle, le
  tableau de bord — **noms et téléphones de clients** — partirait sur le
  papier posé au comptoir d'un hôtel.
- **Le nom de l'hôtel voyage EN CLAIR** (`?h=Ibis%20CDG`), pas en
  identifiant : à l'arrivée on le pose dans le champ de départ et la
  recherche d'adresse le retrouve. Un identifiant obligerait à tenir une
  table de correspondance, donc à réimprimer les affiches le jour où elle
  change.
- **On ne choisit PAS l'adresse à sa place** : la liste s'ouvre, le client
  tranche. Une adresse posée d'office enverrait le chauffeur au mauvais
  Ibis.

**LA PROVENANCE EST GARDÉE SUR LA COURSE** (`bon.provenance`), et c'est ce
qui rend l'affiche utile. Sans elle, l'affiche amène des clients et
personne ne sait laquelle travaille : le nom de l'hôtel ne sert qu'à
remplir le champ de départ, et il disparaît dès que le client corrige son
adresse. Un test éprouve exactement ce pire cas — le client CHANGE son
départ, et la provenance reste.
- Elle vit en **`sessionStorage`**, pas dans une variable (le client
  recharge, revient en arrière, laisse l'onglet ouvert la nuit) et pas en
  `localStorage` : elle vaut pour CETTE visite, pas pour toutes les
  réservations qu'il fera ensuite depuis son téléphone.
- Le registre porte **« D'où viennent les clients »** : les **demandes**
  reçues (ce que l'affiche a produit) ET l'argent des seules **réalisées**
  — deux chiffres pour deux questions. Une course sans provenance ne crée
  pas de ligne : un champ vide se lit « venue directe », pas « information
  perdue ».
- La colonne **« Vient de »** est dans l'export CSV, et la recherche du
  registre cherche aussi par hôtel.
