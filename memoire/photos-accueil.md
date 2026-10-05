# Les photos de l'accueil — archive

> **Ceci est une archive, figée le 6 octobre 2026.** Ce qui reste vrai est
> dans `CLAUDE.md`, section « LES PHOTOS DE L'ACCUEIL — ON N'EN SUPPRIME
> AUCUNE ». Rien n'a été réécrit ci-dessous.

### DEUX PHOTOS DE L'ACCUEIL ONT DISPARU DU SITE EN LIGNE

18 septembre 2026. Un nettoyage du dépôt fusionné dans `main` (`a87db4a`) a
supprimé le dossier `photos/` — que ce fichier demande explicitement de **ne
pas** supprimer sans l'accord de Barbaros : *« c'est du travail qu'il a
fourni »*.

**MESURÉ SUR LE SITE CONSTRUIT, pas supposé** : deux des **cinq** cartes de
services de l'accueil avaient perdu leur fond — la deuxième (Hôtel) et la
cinquième (Mise à disposition). C'est ce que voyait un client arrivant sur
elatransfer.com.

- **POURQUOI RIEN NE L'A ATTRAPÉ** : une image de fond qui manque **ne casse
  rien**. Aucune erreur levée, la page se charge, la mise en page tient. Il
  reste un trou gris — et ça ne se voit qu'en **regardant** la page, ce
  qu'aucune suite ne faisait pour les images.
- **ON A ÉTÉ JUSTE DANS L'IMPUTATION** : `easyhotel.jpg` manquait **déjà
  avant** le nettoyage ; les deux autres non. Vérifié commit par commit
  plutôt que de tout mettre sur le même dos.
- Les deux fichiers ont été **restaurés depuis l'historique**. Les onze
  autres photos ne sont plus référencées par rien : elles restent dans
  l'historique git, récupérables, et leur sort est **une décision de
  Barbaros** — pas un nettoyage appliqué en passant.

**LE CONTRÔLE NE FIGE AUCUNE LISTE** : il lit ce que le site **construit** va
chercher et vérifie que chaque fichier existe. Une photo retirée
volontairement, avec sa référence, reste verte ; une référence orpheline
tombe, et le message **nomme le fichier**. Même famille que le débordement de
6 px : seul le site publié le montre.

**QUATRIÈME FOIS QUE CE PROJET SE FAIT PRENDRE PAR UN CONTRÔLE QUI LIT UN
COMMENTAIRE.** Le premier jet tombait sur `photos/easyhotel.jpg` — qui n'est
pas une référence mais un **exemple écrit dans un commentaire**, au-dessus
d'un champ `photo:""` vide. Après `cp -r carte`, `cp -r exploitant` et la
section des tests, la règle est acquise : **on retire les commentaires avant
de chercher**.

**ET MA PREMIÈRE POSE DU BLOC ÉTAIT APRÈS `serveur.close()`** : la suite
mourait sur `ECONNREFUSED` et n'affichait **rien**. Une suite muette est un
échec — ne jamais la lire comme « pas concernée ».

## 6 octobre 2026 — des copies allégées, pas des remplacements

Les cinq vignettes des services pesaient 611 Ko pour un affichage de 216 × 88
px au plus (154 × 82 sur téléphone). Les quatre JPG ont reçu une copie WebP de
480 px de large (`photos/<nom>-480.webp`, 97 Ko à quatre) ; la vignette
« aéroport », déjà en WebP de 20 Ko, est restée telle quelle — la refaire ne
gagnait que 9 Ko et coûtait de la netteté. 480 px couvrent un écran de
téléphone à triple densité (154 × 3 = 462). Comparaison pixel à pixel avant /
après : seules les bandes photo diffèrent, écart invisible à 390 px × 3.
Fabriquées par Chromium (canvas, lissage « high », qualité 0,82) : aucune
dépendance ajoutée. `test-nouveau-bascule` exige moins de 60 Ko par vignette,
au moins deux fois sa largeur affichée en pixels réels, et que chaque original
reste dans le dépôt.
