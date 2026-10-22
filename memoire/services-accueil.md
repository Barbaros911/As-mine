# Les cinq services de l'accueil — histoire (septembre–octobre 2026)

Sorti de `CLAUDE.md` le 19 octobre 2026, au rangement de la finition visuelle
(`memoire/finition-visuelle.md`). **Deux affirmations ci-dessous sont périmées**
et ne doivent plus servir à refuser quoi que ce soit :
- « Pourquoi choisir Elatransfer ? » n'existe plus : remplacé le 25/09/2026 par
  « Inclus dans chaque course » (section du même nom dans `CLAUDE.md`).
- « L'accueil ne télécharge plus aucune image » : faux depuis la façade
  (`application-facade.css`, « SERVICES : vraies vignettes ») et la photo du
  bandeau (Bloc 2, 7/10/2026). Les cartes portent les copies allégées
  `photos/*-480.webp` ; la cinquième carte s'appelle « Affaires » à l'écran.

Le texte d'origine, tel qu'il était :

## « POURQUOI CHOISIR ELATRANSFER ? » ET LES CINQ SERVICES

Septembre 2026, à sa demande, dans la foulée du paiement. Deux blocs de
l'accueil réécrits ensemble.

**Les engagements** deviennent un bloc de confiance, avec ses arguments à
lui : **Chauffeur professionnel · Prix ferme · Suivi du vol · Assistance
24 h/24**, sous le titre « Pourquoi choisir Elatransfer ? ».
- **CE QU'IL A RETIRÉ, ET CE QU'ON A SAUVÉ AU PASSAGE.** « Véhicules haut de
  gamme » et « Paiement à bord » sortent. Or « Paiement à bord » était **le
  seul endroit de l'accueil** qui disait qu'on ne paie pas en ligne — le
  reste ne le dit qu'au récapitulatif, trois écrans plus loin. Le fait est
  donc reversé dans son propre argument : « Prix ferme — **connu avant le
  départ, réglé au chauffeur** ». Un argument retiré peut emporter une
  information qui n'était nulle part ailleurs.
- **LE SUIVI DU VOL N'EST PLUS DIT QU'UNE FOIS** (6/10/2026) : l'encadré
  « Vol ou train en retard ? » qui le répétait juste au-dessus est retiré ;
  restent la carte d'« Inclus » et la question fréquente
  (`memoire/ordre-accueil.md`).
- L'icône de « Prix ferme » est une **étiquette**, pas la voiture héritée de
  « véhicules haut de gamme » — laissée en place, elle aurait dit « berline »
  à côté d'un titre qui parle d'argent.

**Les services** sont **cinq** : Aéroport · Hôtel · Gare · Professionnel ·
Salons & expositions. La mise à disposition est passée dans « Au-delà du
trajet » (octobre 2026, voir « LE SITE SUR ORDINATEUR »).
- **LES PHOTOS SONT PARTIES, REMPLACÉES PAR DES PICTOGRAMMES.** Il en aurait
  fallu deux de plus, et **une photo ne s'installe pas sans savoir d'où elle
  vient** — les douze premières venaient de Google Images. Sa maquette est de
  toute façon une liste d'icônes. Ce qu'on y gagne : **l'accueil ne
  télécharge plus aucune image** (un contrôle descend toute la page et
  vérifie que rien de `photos/` ne part), et une carte de trois lignes laisse
  voir qu'il y en a d'autres. **`photos/` reste dans le dépôt** : c'est du
  travail qu'il a fourni.
- **PAS D'EMOJI** — il en proposait cinq (✈️ 🏨 🚆 💼 🚘). Ils changent de
  dessin d'un téléphone à l'autre et grossissent mal : même règle que les
  voitures. Un contrôle cherche les emojis dans le bloc.
- **LA RÈGLE DES DESTINATIONS** : une carte mène au formulaire **si et
  seulement si** ce qu'elle annonce est une ADRESSE. Un hôtel, une gare, un
  rendez-vous d'affaires en sont ; « un chauffeur à l'heure » n'en est pas
  un — il ouvre « Nous joindre ». Le test lit le `data-ecran` **déclaré** et
  vérifie qu'un clic y mène vraiment, carte par carte, plus les deux bornes
  (au moins une vers le formulaire, au moins une ailleurs) : sans elles, un
  code qui enverrait tout vers le formulaire passerait au vert.
- **LES VISITES SONT PORTÉES PAR « CHAUFFEUR À L'HEURE »** (« Au-delà du
  trajet » : rendez-vous, visites, Disneyland), pas par une carte à elles. **Ce ne sont pas
  des offres** : les packs ont été retirés deux fois à sa demande. On nomme
  des destinations, on ne vend pas un forfait — et c'est justement la carte
  qui ouvre la négociation de vive voix.
- **LES CARTES ONT MAIGRI DE 178 À 156 px.** Pas pour économiser : à cinq
  entrées et 178 px, la deuxième s'arrêtait pile au bord de l'écran et la
  piste avait l'air de finir là. Un contrôle vérifie qu'elle **déborde** de
  son cadre — c'est ce qui dit qu'on peut balayer.
- **PIÈGE DÉJÀ CONNU, RENCONTRÉ UNE TROISIÈME FOIS** : la règle des
  sous-titres visait `.service span span`, et la pastille est elle aussi un
  span dans un span depuis qu'elle a remplacé la photo — elle repassait en
  `display:block` et l'icône se collait en haut à gauche. Même faute que
  `.engagement span`. Viser `.service-corps > span:not(.service-icone)`.
- **LES DEUX CONTRÔLES QUI FIGEAIENT LA LISTE ONT SAUTÉ.** `test-nouveau-services`
  vérifiait « trois cartes » et « la mise à disposition est au milieu » ;
  `test-nouveau-langues` figeait les trois noms anglais. Les deux seraient
  tombés sur une réorganisation légitime. Ils éprouvent maintenant la
  **règle**, pas la liste — même leçon que la barre du bas figée sur quatre
  onglets.

---

## Archivé de CLAUDE.md le 22/10/2026

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

### LES CINQ SERVICES — L'HISTOIRE EST ARCHIVÉE

Cinq cartes (Aéroport · Hôtel · Gare · Affaires · Salons & expositions). Une
carte mène au formulaire **si et seulement si** elle annonce une ADRESSE ; ni
emoji, ni pack, ni carte de visite guidée. Viser `.service-corps > span:not(.service-icone)`,
jamais `.service span span`. Histoire : `memoire/services-accueil.md`.
