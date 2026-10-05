# L'accueil et les professionnels — archive

> **Ceci est une archive, figée le 5 octobre 2026.** Ce jour-là, le pavé
> « Hôtels • Agences • Entreprises » sous le formulaire a été remplacé, à la
> demande de Barbaros, par une ligne-lien et un bloc « Qui sommes-nous »
> après les services. Ce qui reste vrai est dans `CLAUDE.md`, section « QUI
> SOMMES-NOUS — LE MODÈLE DIT EN CLAIR ». Rien n'a été réécrit ci-dessous.

## « HÔTELS • AGENCES • ENTREPRISES » EST SOUS LE FORMULAIRE

> **Le texte FRANÇAIS de ce bloc a changé le 4 octobre 2026** : c'est un
> paragraphe, plus trois lignes. **L'anglais garde volontairement ses trois
> lignes** — décision de Barbaros, voir « LE SITE SE PRÉSENTE PAR SA
> MARQUE » en fin de fichier. La PLACE décrite ici reste la bonne.

3 octobre 2026, à sa demande (« fais comme un expert »). Le nouveau texte
d'accueil (79e06a8) avait mis ce bloc de trois lignes DANS le bandeau : il
l'allongeait d'environ 100 px et remettait « Voir mon prix » à cheval sur la
barre du bas — mesuré à 390 × 844 en français, bouton 753–806 pour une barre
à 784. Un pouce posé dans le bas du bouton ouvrait un onglet. **C'est le
défaut déjà payé une fois** (« LA BARRE DU BAS MANGEAIT « VOIR MON PRIX » »).
- **Le texte est le sien, inchangé, dans les deux langues** ; seule la place
  a changé : une carte claire (`.pro-bloc`) juste sous le formulaire, alignée
  sur lui. La clé `hero_pro` est devenue `pro_bloc` — un nom qui dit « bandeau »
  ramènerait le bloc dans le bandeau. Masqué sur les pages d'hôtel.
- Bouton après : 693–746 (FR) et 664–717 (EN). En dessous de 844 px de haut
  le bouton passe sous le pli, ce qui est sans danger : seul le recouvrement
  l'est.
- **La ligne des étapes était écrasée sur ordinateur, depuis son ajout** :
  la façade place les enfants de `.reserver` un par un sur 12 colonnes, et
  elle n'y était pas — 86 px au bord gauche, chiffres rognés.
  `.reserver > .etapes-ligne{grid-column:1/-1}`.
- **Les contrôles visent la règle, plus le texte du jour** : la liste du
  bandeau tient sur une ligne, le titre ne dépasse pas trois lignes à 320 px,
  et tout le bandeau anglais diffère du français (`test-nouveau-langues`
  compare chaque ligne à `ELA_TEXTES.fr`). Les trois suites tombées avec le
  nouveau texte (`test-nouveau`, `test-nouveau-langues`, `test-nouveau-option`)
  repassent au vert.
- **`test-nouveau-bascule` mesure le bouton SUR LE SITE CONSTRUIT** : c'est
  la façade, injectée par `construire.sh`, qui fixe la hauteur du bandeau.
  Contre l'ancien `index.html`, cinq contrôles tombent en nommant le défaut.
