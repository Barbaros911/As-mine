# La grille et la majoration de nuit — histoire

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

# LE SITE — `index.html`

**LA BASCULE EST FAITE** (6 septembre 2026, à sa demande : « Non je veux que
les gens voit mon nouveau site »). `nouveau.html` est devenu `index.html` :
c'est LUI que voient les clients à la racine du domaine. Tout ce qui suit
le décrit. L'ANCIEN site, qui n'existe plus, est décrit dans
`memoire/ancien-site.md` : il sert à comprendre d'où viennent les décisions,
pas à savoir ce que fait le site aujourd'hui. En cas de contradiction,
**c'est cette section-ci qui dit vrai**.

**CE QUI A ÉTÉ SUPPRIMÉ À LA BASCULE, ET POURQUOI ON NE LE REMET PAS :**
- l'ancien `index.html`, `styles.css`, `tailwind.config.js`,
  `tailwind.src.css` ;
- les neuf suites test.mjs … test9.mjs et test-hors-ligne.mjs — elles
  éprouvaient un fichier qui n'existe plus. (Sans accents graves : c'est la
  convention du fichier pour une suite qui n'existe plus, et `test-doc.mjs`
  s'en sert pour distinguer un souvenir d'une consigne.)

**IL N'Y A PAS DE PAGE DE SECOURS, ET C'EST DÉLIBÉRÉ.** Garder l'ancien
site en ligne « au cas où » laisserait une page trouvable — signet, lien
partagé, résultat de recherche — qui annonce une **grille de prix
périmée**. Chez Elatransfer le prix est ferme, donc opposable : un client
qui réserve à 1,75 €/km sur une page encore servie a un prix qu'on doit
tenir. Le retour en arrière passe par **`git revert` de la bascule**, où
tout le code est conservé, pas par un fichier laissé traîner.

**IL NE GARDE RIEN DE L'ANCIEN.** Sa consigne, deux fois : « Je ne veux pas
que le nouveau site ai lapaaraence de lancien, ne garde rien de lancien
écriture mise etc », puis « Tu ne garde rien de lancien ». Ne pas recopier
une règle de l'ancien site sans qu'il la redemande — c'est une réécriture,
pas une refonte.

## La grille du nouveau site (septembre 2026)

| Gamme | Au kilomètre | Minimum |
|---|---|---|
| Berline (4 places) | 2,90 € | 35 € |
| Van (7 places) | 4,70 € | 50 € |

**LE MINIMUM BERLINE EST À 35 €** (4 octobre 2026, Barbaros : « Oui le 35
c'est moi »). Il l'avait réglé en production depuis l'admin ; le repli
`GAMMES`, ce tableau et la source serveur du dépôt disaient encore 30 €, et
les trois contrôles restaient verts parce qu'ils se comparaient entre eux.
**Aucun contrôle ne lit la production** : c'est la première suite branchée
sur le vrai serveur (test-nouveau-exploitant, en CI) qui l'a montré.
- **Le plancher n'est plus une dizaine, et c'est voulu** : le plancher a le
  dernier mot. Tout trajet berline de 12,06 km ou moins (2,90 × km ≤ 35)
  coûte 35 € ; au-delà, rien ne change. Ne pas le « corriger » en 30 ou 40.
- **Pourquoi le repli comptait** : Réglages → Tarifs se remplit depuis
  `GAMMES` quand la lecture du serveur échoue. Un appui sur « Enregistrer »
  aurait alors réécrit 30 € en production, en silence.
- La source du dépôt est `20261004000000_minimum_berline_35.sql`, une
  écriture **conditionnelle** : sans effet en production, sans effet sur un
  tarif réglé depuis l'admin. Elle n'a pas à être appliquée.

**CE TABLEAU A MENTI PENDANT DES JOURS** (corrigé le 16 septembre 2026). Il
annonçait encore 2,35 et 4,08 €/km alors que la PR #123 les avait portés à
2,65 et 4,00. Personne ne pouvait le voir : un document ne se trompe jamais
bruyamment. Et ce n'est pas une note de confort — c'est le chiffre qu'on
annonce au téléphone, celui qu'on recopie dans les CGV, et le prix est
**ferme donc opposable**. `test-doc.mjs` compare désormais ce tableau à
`GAMMES` à chaque construction : une grille qui diverge de la doc **empêche
la publication**. Le contrôle a été écrit APRÈS le mensonge, et c'est sur
lui qu'il a été éprouvé.
**Vérifié au passage** : les CGV ne portent toujours aucun chiffre — elles
décrivent la mécanique (« un tarif kilométrique propre à chaque gamme »).
C'est ce choix d'écriture ancien qui a évité que le mensonge devienne
contractuel. Ne pas y écrire de tarif chiffré.

- **Plus de prise en charge.** Le prix n'est qu'un kilométrage : avec un
  plancher et un arrondi à la dizaine, un forfait de départ ne se voyait
  plus dans le résultat.
- **L'ARRONDI EST LE SIEN, PAS CELUI DE L'ÉCOLE** : à la dizaine, et le
  **5 pile DESCEND**. 45 → 40, 46 → 50. Le code compare le reste à 5 avec
  un `>`, jamais un `>=` — sur un 5 pile, l'arrondi ordinaire ferait payer
  10 € de plus que l'annonce faite au téléphone. Et il passe par une
  division entière, pas un modulo : `102,06 % 10` rend
  `2,0600000000000023` et afficherait `100,000000001 €`.
- **L'ordre est fixé** : kilométrage → majoration de nuit → arrondi →
  plancher. Arrondir avant de majorer redonne un prix qui n'est plus une
  dizaine ; majorer après le plancher ferait payer 42 € une course
  annoncée à 35 €. Le plancher a le dernier mot.
- **IL N'Y A PLUS DE MAJORATION DU TOUT** (septembre 2026) — voir la
  section dédiée plus bas. Le reste inchangé : TVA 10 % incluse, prix ferme ;
  le prix vaut partout en France, péages en plus (« PLUS AUCUNE DEMANDE
  BLOQUÉE »).
- Barbaros écrit souvent **« van » là où il veut dire « berline »** — trois
  fois de suite sur cette grille. Ne pas deviner sur un prix : demander.

### LA MAJORATION DE NUIT — CE QU'IL A DEMANDÉ, ET CE QUI RESTE À TRANCHER

Septembre 2026, sur une capture à 23 h 22 : « il y a un problème avec le
prix ? C'est trop cher non, le tarif nuit est appliqué ? »

**Le calcul était juste**, à la grille de l'époque : 37 km, Berline
2,95 €/km → 109,15 € ×1,2 = 130,98 → **130 €**. **Il a fait baisser les deux
tarifs dans la foulée** — voir juste en dessous.

- **La nuit va de 21 h à 6 h**, plus **tout le samedi et tout le dimanche**
  (`nuitOuWeekend`). C'est écrit à l'article 4 des CGV, dans les deux langues.
- **CE QUI A ÉTÉ DIT, ET QU'IL N'A PAS ENCORE TRANCHÉ** : ce n'est pas la
  majoration qui est chère, c'est le **tarif de base**. 110 € de jour pour
  Argenteuil → Orly quand un concurrent facture 70 à 90 €. Et le week-end
  **entier** à +20 % est large — un samedi après-midi n'a rien d'une course
  de nuit.
- **IL A TRANCHÉ LE SOIR MÊME** : « change le tarif berline à 2.35 et van
  4.08 ». Les deux gammes nommées, deux nombres distincts — aucune
  ambiguïté, donc rien à redemander. **La majoration et les planchers n'ont
  pas bougé.**
- **LES CGV N'ONT PAS EU À CHANGER, ET C'EST UN CHOIX D'ÉCRITURE ANCIEN.**
  Elles décrivent la MÉCANIQUE (« un tarif kilométrique propre à chaque
  gamme… ceux affichés sur le Service au moment de la réservation ») sans
  jamais citer un nombre. Vérifié dans les deux langues avant de conclure.
  **Ne pas y écrire de tarif chiffré** : ce serait un second endroit à tenir,
  et le prix est opposable.
- **L'ÉTIQUETTE DE LA PAGE « NOUVELLE COURSE » ÉTAIT ÉCRITE EN DUR**
  (`#crGrille`) — celle sur laquelle il annonce un montant au téléphone. Un
  changement de tarif y laissait un prix périmé sans que rien ne le signale.
  Elle est maintenant **fabriquée depuis `GAMMES`** (`ecrireGrille()`), même
  règle que le prix de la pancarte.
- **LE CONTRÔLE RELIT LA GRILLE DANS LA SOURCE** plutôt que de recopier les
  nombres : recopiés, ils déplaceraient simplement la faute dans le test.
  Le premier jet les avait recopiés en prétendant l'inverse — corrigé.
- **CE QUE CE CHANGEMENT A COÛTÉ EN TESTS** : dix-sept valeurs attendues dans
  huit suites, toutes **recalculées à la main depuis la nouvelle grille**,
  jamais recopiées de ce que la page affichait — un test qui prend la sortie
  pour référence ne vérifie plus rien. À 24,3 km, la berline passe de 70 € à
  **60 €** ; le van reste à **100 €**.
- **PIÈGE PROPRE À `test-nouveau-itineraire`** : ses quatre niveaux se
  distinguent par quatre prix DIFFÉRENTS — 30, 90, 60 et 40 € avec la
  nouvelle grille. Vérifié qu'ils restent distincts : un tarif qui en ferait
  coïncider deux rendrait la suite **aveugle sans qu'elle tombe**.

## IL N'Y A PLUS DE MAJORATION DE NUIT NI DE WEEK-END

Septembre 2026, à sa demande : « supprime la majoration nuit 20 % sur le
site ». Le prix d'une course ne dépend plus **que** de la distance et de la
gamme : le même trajet vaut le même prix un mardi à 10 h, un samedi midi et
à 3 h du matin.

- **C'est la suite de sa propre remarque**, faite sur une capture à 23 h 22
  (« c'est trop cher non ? »). Ce n'était pas la majoration qui était chère,
  c'était le tarif de base ; il avait d'abord baissé les deux tarifs
  kilométriques (2,35 et 4,08 €/km), il supprime maintenant la majoration.
  Le week-end **entier** à +20 % était de toute façon large : un samedi
  après-midi n'a rien d'une course de nuit. La note « il n'a pas encore
  tranché » qui figurait plus haut est donc tranchée.
- **La question a été posée avant de couper** : la nuit seulement, ou la
  nuit ET le week-end ? Réponse : **tout**. Ne pas réintroduire la moitié en
  croyant compléter.
- Ce qui a disparu : `nuitOuWeekend()`, le paramètre `majoration` de
  `prix()`, le calcul de `course.majoration`, l'écriteau `#noteNuit` côté
  site, la clé de traduction `nuit` dans les deux langues, la mention
  « +20 % la nuit et le week-end » de l'étiquette de la page « Nouvelle
  course », et le rappel « nuit ou week-end +20 % » de son écriteau de
  calcul.
- **CE QUI RESTE, ET CE N'EST PAS UN OUBLI** : le champ `majoration` des
  courses enregistrées, désormais toujours faux. Il est écrit dans
  l'historique déjà stocké sur l'appareil et sur le serveur ; le retirer
  rendrait illisible une partie de ces courses. Même raison que les alias
  des anciens noms de gammes.
- **LES CGV ONT SUIVI, DANS LES DEUX LANGUES.** L'article 4 décrivait un
  +20 % qui ne s'applique plus. Des CGV qui annoncent une formation du prix
  différente de celle appliquée sont **pires qu'aucunes CGV** : le prix est
  ferme donc opposable, et le client y trouverait un argument contre nous.
  Elles disent maintenant qu'aucune majoration de nuit, de week-end ni de
  jour férié ne s'applique.
- **LE TARIF NUIT DU FLYER A ÉTÉ RETIRÉ À SON TOUR** (22 septembre 2026, à sa
  demande : « fait les prix je modifierai le flyer plus tard »). Cette note
  disait l'inverse et l'a dit pendant des jours — elle survivait à la
  décision qui l'invalidait. **IL N'Y A PLUS AUCUNE MAJORATION NULLE PART**,
  ni au kilométrage, ni au forfait d'un partenaire, ni la nuit, ni le
  week-end, ni les jours fériés.
  **Le flyer imprimé est donc périmé sur un quatrième point** — il annonce
  encore une colonne de nuit. Barbaros le refera ; d'ici là le comptoir
  facture moins que le papier, jamais plus.
- **Le contrôle qui compte est celui de `test-nouveau-exploitant`** : à 23 h
  et un samedi midi, le prix ne bouge pas. Éprouvé en réintroduisant la
  majoration — les deux contrôles tombent (70 € au lieu de 60). Une
  majoration qui revient en silence ne se voit pas : le prix s'affiche, il
  est simplement plus élevé d'un cinquième.
