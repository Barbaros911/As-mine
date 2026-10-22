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
