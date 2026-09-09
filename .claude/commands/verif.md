---
description: Ouvre vraiment la page et rend deux captures, téléphone et ordinateur
---

Vérifier la page avant de la montrer à Barbaros. Argument reçu :
`$ARGUMENTS` — une adresse ou un chemin (ex. `sites/alfredo/`). Vide →
le site de réservation à la racine.

Le serveur local doit tourner ; s'il ne tourne pas, le démarrer :

```
npx --yes http-server . -s -p 8099 &
```

Puis :

```
node .claude/outils/verifier.mjs "http://127.0.0.1:8099/$ARGUMENTS"
```

Il ouvre la page à **390 × 844** (un iPhone, hauteur comprise — à 390 × 560
la page se remet en page et le verdict change) puis à **1280 × 800**, et
rend trois verdicts par écran : débordement horizontal, erreur JavaScript,
et **bouton recouvert**.

Le troisième est le plus important : il demande à la page qui reçoit le
doigt au centre de chaque bouton. C'est le seul défaut de cette liste
qu'une capture d'écran ne montre pas — « Voir mon prix » est passé
derrière la barre du bas sans que rien ne se voie.

Ensuite :

1. **Envoyer les deux captures à Barbaros** avec l'outil d'envoi de
   fichiers — sa règle est de voir une capture, pas une description.
2. S'il y a un point signalé, le corriger AVANT de montrer quoi que ce
   soit : une capture d'une page cassée lui fait perdre du temps.
3. Ce n'est pas un remplacement des suites. Avant une fusion, `/tests`.
