# L'ordre de l'accueil — histoire

Archive sortie de CLAUDE.md. La règle en vigueur est dans CLAUDE.md
(« QUI SOMMES-NOUS — LE MODÈLE DIT EN CLAIR ») ; ici, le pourquoi.

## 6 octobre 2026 — « le 1.2.3 est trop bas »

Barbaros, en relisant la prévisualisation de la refonte ordinateur : « les
éléments ne sont pas dans l'ordre, par exemple le 1.2.3 est trop bas ».

**Mesuré avant de toucher à quoi que ce soit** (site construit) :

| | Téléphone 390 × 844 | Ordinateur 1366 × 657 |
|---|---|---|
| Haut de la page | 3 657 px | 2 592 px |
| Les trois étapes « Vous demandez · Nous confirmons · Votre chauffeur vous conduit » | **y = 2 442** | **y = 1 871** |

Elles étaient sous les services ET sous « Au-delà du trajet », dans le bloc
« Qui sommes-nous », mélangées à l'encart des hôtels. Or c'est la première
question de quelqu'un qui vient de remplir le formulaire : qui me conduit,
qui confirme, comment je paie.

**L'ordre retenu**, le récit d'une page qui vend un trajet :
formulaire → comment ça marche (les 3 étapes, `#comment`) → inclus dans
chaque course → nos services → au-delà du trajet → professionnels
(`#modele`) → questions → pied. Après : y = 1 120 sur téléphone, y = 780 sur
ordinateur — l'intitulé du bloc affleure au bas du premier écran.

Trois corrections qui vont avec, sinon le déplacement aurait créé des
incohérences :

- **Une seule suite 1 · 2 · 3.** La carte du formulaire portait déjà une
  petite ligne « 1 Trajet → 2 Prix → 3 Confirmation » (septembre 2026, à sa
  demande, à la place d'un bloc « Comment ça marche »). Avec le vrai bloc
  juste dessous, on lisait deux suites numérotées aux mots différents à
  quelques centimètres. Elle est **masquée sur le site public**, pas retirée :
  la carte est LA MÊME que celle de la page easyHotel client, qui n'a pas le
  bloc des étapes et la garde. Supprimer la ligne du HTML aurait changé
  easyHotel sans qu'on le demande.
- **« Professionnels » mène aux professionnels.** Le menu et la ligne « Hôtel,
  agence, entreprise ? » visaient `#modele`, qui commençait par « Vous
  réservez, nous organisons tout » — un texte pour le client. `#modele` ne
  garde plus que l'encart des hôtels, agences et entreprises.
- **Le suivi du vol n'est plus dit deux fois de suite.** L'encadré « Vol ou
  train en retard ? Votre chauffeur s'adapte » était posé juste au-dessus de
  la carte « Suivi du vol ou du train — l'heure de prise en charge
  s'ajuste » d'« Inclus », et la question fréquente le redit. Le mémo disait
  « à lui de trancher s'il veut n'en garder qu'un » : il a délégué (« vérifie
  comme un expert »), l'encadré est retiré.

**Verrouillé** dans `test-public-ordinateur` à 320, 390, 1024, 1366 et
1920 px, en français et en anglais : ordre lu À L'ÉCRAN (le haut de chaque
bloc), premier bloc sous le formulaire, une seule suite visible, cible de
« Professionnels », absence du doublon. Sur l'ancien code : 30 contrôles
tombent ; étapes remises en bas sous le nouveau nom : 12 tombent, positions
nommées.

## L'encadré « Vol ou train en retard ? » (septembre 2026 → 6 octobre 2026)

Ce qu'il était, pour le jour où on voudrait le remettre (`git log -S
retard_titre`) :

- `.promesse`, entre le formulaire et « Nos engagements » (devenu
  « Inclus dans chaque course »). Le client qui atterrit ne se demande pas
  combien coûte la course : il se demande ce qui se passe si son vol a deux
  heures de retard.
- Sur un **aplat d'accent**, pas dans une carte blanche : les engagements et
  les services étaient déjà des cartes blanches, une cinquième se serait
  fondue dans la série.
- **La classe `.arrivee` était déjà prise** par les trois lignes de trajet
  (`trajet-ligne arrivee`) : la règle les aurait repassées en flex sur fond
  vert, dans le bon comme dans le récapitulatif. D'où `.promesse`.
- Titre et texte en **deux clés** (`retard_titre`, `retard_texte`) : le gras
  se lisait seul, en diagonale.
- La carte « Suivi du vol » d'« Inclus » portait un avion **différent**
  (penché, trajectoire pointillée) pour ne pas se lire comme un
  copier-coller de l'encadré — c'est cette répétition, assumée en septembre,
  qui a été tranchée le 6 octobre.
