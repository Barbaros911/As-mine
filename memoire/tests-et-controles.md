# Les tests, le lanceur et les contrôles de mise en ligne — histoire

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

### LA SECTION « TESTS » ANNONÇAIT 23 SUITES, IL Y EN AVAIT 28

16 septembre 2026, trouvé en reprenant un point que j'avais moi-même reporté.
Ce fichier disait « vingt-trois suites Playwright, 957 contrôles » et recopiait
les vingt-trois noms dans une boucle à taper. **Cinq suites n'étaient dans
aucune des deux affirmations** — `test-nouveau-icone`, `test-nouveau-suppression`,
`test-admin-papiers`, `test-agent-rbac`, `test-unified-facade`. Qui suivait
cette page ne les lançait jamais.

- **C'EST LA FAUTE QUE CE FICHIER REPROCHE AILLEURS.** Deux recettes pour une
  seule chose — exactement ce qu'on interdit à `construire.sh` — et un compte
  écrit en dur qui survit au changement qui l'invalide, comme la barre du bas
  figée sur quatre onglets. **Un document ne se trompe jamais bruyamment** :
  rien ne signale une suite absente d'une liste.
- **ON NE REMPLACE PAS LE CHIFFRE PAR UN AUTRE CHIFFRE.** Un contrôle qui
  figerait « 28 » se mettrait en travers de la première suite légitimement
  ajoutée, et c'est lui qu'on supprimerait pour avoir du vert. On pointe la
  recette (`.claude/outils/tests.sh`) et on verrouille ce qui ne vieillit pas.
- **LES ACCENTS GRAVES FONT LA DIFFÉRENCE, et la convention existait déjà** :
  une suite qu'on doit LANCER s'écrit entre accents graves, une suite DISPARUE
  s'écrit sans. Elle était référencée sans être appliquée — la liste des neuf
  suites supprimées à la bascule portait encore des accents graves. Corrigée,
  et `test-doc.mjs` s'en sert pour distinguer un souvenir d'une consigne.
- **LE PREMIER JET DU CONTRÔLE PASSAIT AU VERT SUR LA VERSION CASSÉE.** Il
  cherchait `.claude/outils/tests.sh` dans toute la section — et le trouvait
  dans **la phrase qui l'explique**, pendant que la commande à taper avait été
  remplacée. Il ne lit plus que le bloc de commandes. **Troisième fois que ce
  projet se fait prendre par un contrôle qui trouve ce qu'il cherche dans un
  texte d'explication** — après `cp -r carte` et `cp -r exploitant` dans
  `construire.sh`.
- Les quatre contrôles ont été éprouvés un par un contre le défaut qu'ils
  surveillent : commande qui n'appelle plus la recette, commande qui réénumère,
  suite nommée et disparue, lanceur refiltré sur le seul préfixe « nouveau ».

## Tests

**`.claude/outils/tests.sh` EST LA SEULE RECETTE, et ce fichier ne recopie
plus la liste des suites.** Il ramasse `test-*.mjs` moins les trois suites hors
navigateur, nommées une seule fois. À relancer après **toute** modification de
la page.

**CETTE SECTION A MENTI, ET C'EST POUR ÇA QU'ELLE EST ÉCRITE AINSI**
(corrigé le 16 septembre 2026). Elle annonçait « vingt-trois suites Playwright,
957 contrôles » et recopiait les vingt-trois noms dans une boucle. Il y en avait
**vingt-huit**. Cinq suites — `test-nouveau-icone`, `test-nouveau-suppression`,
`test-admin-papiers`, `test-agent-rbac`, `test-unified-facade` — n'étaient dans
aucune des deux affirmations : **qui suivait cette page ne les lançait jamais**.
C'est exactement la faute que ce fichier reproche ailleurs — deux recettes pour
une seule chose, et un compte écrit en dur qui survit au changement qui
l'invalide. On ne remplace donc pas le chiffre par un autre chiffre : on pointe
la recette, et `test-doc.mjs` vérifie désormais les deux choses qui, elles, ne
vieillissent pas — aucun nom de suite cité ici ne doit avoir disparu, et cette
section ne doit pas se remettre à énumérer.

**Plus deux suites qui ne passent ni par un navigateur ni par le réseau** :
- `node test-notification.mjs` (34 contrôles) éprouve le texte de l'alerte
  de la fonction Supabase — c'est la seule partie de cette fonction qui se
  vérifie sans la déployer, et c'est celle qui compte.
- `node test-push.mjs` (22 contrôles) éprouve le chiffrement des
  notifications au client, **en le faisant déchiffrer par `http_ece`** et
  vérifier la signature VAPID par `node:crypto`. Un chiffrement relu par
  son propre auteur ne prouve rien — la leçon de l'encodeur QR.
  `http_ece` vit dans le bac à sable, jamais dans le dépôt ; s'il manque,
  la suite **échoue** au lieu de sauter le contrôle en silence.
  **Il fabrique sa propre paire VAPID à chaque exécution** : voir plus bas
  pourquoi la vraie n'y est pas. L'accord entre la clé de la page et le
  secret se vérifie à part, la clé en main et sans l'écrire nulle part —
  `VAPID_PRIVEE=… node test-push.mjs` (23 contrôles alors, dont un qui
  cherche la clé dans **tous** les fichiers suivis par git).
Le nom `test-nouveau-*` est resté après la bascule : les renommer aurait
touché dix-neuf fichiers pour zéro gain.

```bash
sh .claude/outils/tests.sh
```

Ce qu'il fait, et pourquoi : il lève le serveur local, lance **une seule
exécution à la fois** — deux séries en parallèle se marchent dessus et se
bloquent —, juge chaque suite sur son **code de sortie** et non sur la présence
d'une ligne `=== `, signale une suite **sans aucune sortie** en toutes lettres
plutôt que de la laisser passer, et **ne s'arrête pas à la première rouge** :
l'outil qui doit attraper les pannes des autres ne renonce jamais au premier
échec. Les trois suites hors navigateur (`test-doc`, `test-notification`,
`test-push`) sont comptées comme les autres — elles se contentaient d'afficher,
et le lanceur concluait « tout est au vert » pendant qu'une d'elles échouait.

`test-nouveau-bascule.mjs` couvre ce qui **ne se voit pas à l'écran** et
qu'on ne remarquerait donc qu'une fois le mal fait : le titre et la
description (leur ORDRE — le métier avant les aéroports), l'absence de
`noindex`, les données structurées, le manifeste et les icônes, le fait que
**chaque fichier du `SHELL` du service worker existe** (`addAll` est tout ou
rien : un fichier absent et il ne s'installe plus, sans message), et que les
CGV décrivent la **grille réellement appliquée**.

**UN TEST QUI FIGE UN COMPTE SE MET EN TRAVERS DE LA PREMIÈRE ÉVOLUTION
LÉGITIME.** Le contrôle du CSV s'intitulait « il est séparé par des
points-virgules » et comptait **15 colonnes en dur** : il est tombé le jour
où l'export a gagné « Facture commission », alors que rien n'était cassé.
Il vérifie maintenant son vrai sujet — un `;` présent, aucune `,`. Même
leçon que la barre du bas figée sur quatre onglets, et que les trois tests
qui visaient `p.font-mono` au lieu de `.veh-prix`.

### LE LANCEUR DISAIT « TOUT EST AU VERT » PENDANT QU'UNE SUITE ÉCHOUAIT

16 septembre 2026. `test-notification` est tombé, la ligne
« === ÉCHECS (1) === » s'est affichée à l'écran — et `tests.sh` a conclu
**« TOUT EST AU VERT »** en sortant avec 0.

**LA CAUSE : DEUX BOUCLES, UNE SEULE QUI COMPTE.** Les suites
`test-nouveau*` incrémentaient `ECHECS` ; les trois dernières
(`test-doc`, `test-notification`, `test-push`) se contentaient d'AFFICHER.
Un œil pressé voit le verdict, pas la ligne du dessus ; une automatisation,
elle, ne voit QUE le code de sortie.
**Un outil de contrôle qui ment est pire que pas d'outil** — c'est
exactement ce que ce lanceur existe pour empêcher chez les autres, et c'est
la **deuxième fois** qu'il se fait prendre à son propre piège, après le
`trap` qui écrasait le code de sortie d'origine. Les trois suites se
comptent désormais comme les autres, détail des échecs compris.

### « a-coller.ts » IMPORTAIT ENCORE UN FICHIER — IL N'ÉTAIT PLUS COLLABLE

Trouvé dans la foulée, caché par le défaut du dessus. L'assembleur ne
connaissait que `message.js` ; la PR #180 (double alerte Push + Telegram) a
ajouté un **troisième** fichier, `chiffrer.js`, dont l'import restait dans
le fichier assemblé. Or tout l'intérêt de `a-coller.ts` est d'être collable
**d'un seul bloc avec un pouce** : avec cet import, le collage échoue chez
Supabase, où `./chiffrer.js` n'existe pas.
- **RIEN N'ÉTAIT CASSÉ EN PRODUCTION** : `fonctions.yml` déploie depuis
  `index.ts`. `a-coller.ts` n'est que le chemin de secours au téléphone —
  celui qui sert le jour où l'automatisation tombe, donc le pire moment
  pour découvrir qu'il ne marche pas.
- **L'ASSEMBLEUR INLINE MAINTENANT TOUT CE QU'`index.ts` IMPORTE
  LOCALEMENT**, plus un fichier nommé en dur. Un quatrième demain sera pris
  sans qu'on y pense — et s'il arrive sans compte de paramètres déclaré,
  l'assembleur **s'arrête** au lieu de passer.
- **`async` EST CONSERVÉ.** La réécriture des signatures rendait
  « function hkdf(…) » pour « async function hkdf(…) » : tous les `await`
  du corps seraient devenus des erreurs. Invisible tant qu'aucune source
  inlinée n'était asynchrone — `chiffrer.js` en a trois.
- **UN PARAMÈTRE DE RESTE SE TYPE EN TABLEAU** : `...m: any` est refusé
  (« A rest parameter must be of an array type »), il faut `...m: any[]`.
- **LE COMPTE DES PARAMÈTRES EST PAR FICHIER** (`ATTENDUS`), pas global :
  un seul total aurait confondu une signature retirée ici avec une ajoutée
  là — elles se seraient annulées.
- **CEINTURE** : si un import survit à l'assemblage, on s'arrête plutôt que
  de rendre un fichier qui ne se colle pas. Éprouvé sur les trois cas.
- **LA COMPILATION N'A PAS PU ÊTRE VÉRIFIÉE ICI** — `tsc` n'est pas
  installable sans réseau npm. Ce qui a été mesuré : Node analyse le
  TypeScript sans erreur (`module.stripTypeScriptTypes`) et le JavaScript
  obtenu est syntaxiquement valide. Ça attrape un `async` perdu ou une
  accolade en trop, pas une erreur de type. Le dire plutôt que de
  prétendre l'inverse.

### LA PAGE PUBLIÉE DÉBORDAIT DE 6 px, ET AUCUNE SUITE NE POUVAIT LE VOIR

16 septembre 2026, trouvé en vérifiant autre chose. À 390 px la page publiée
mesurait **396 px** : elle se décalait de six pixels sous le doigt.

**LE DÉFAUT N'EXISTAIT QUE SUR LE SITE PUBLIÉ**, et c'est tout l'intérêt.
Mesuré côte à côte : dépôt 390 px, publié 396. `construire.sh` injecte
`application-facade.css`, qui descend la gouttière des sections à **14 px**
sous 900 px ; le carrousel des services gardait sa marge négative de
**−20 px**, écrite en dur. Deux nombres qui doivent rester égaux, à deux
endroits — dont un que le dépôt ne porte pas.

- **LA GOUTTIÈRE EST DEVENUE UNE VARIABLE** (`--gouttiere`, posée sur
  `.section`). Le carrousel la suit en `calc(-1 * var(--gouttiere))`. Un seul
  nombre par largeur d'écran, et la façade la **redéfinit** au lieu de
  réécrire le `padding` à côté. Même leçon que la barre du bas figée sur
  quatre onglets : **un nombre recopié survit au changement qui l'invalide**.
- **LE CARROUSEL DÉBORDE TOUJOURS DE SON CADRE, ET IL LE DOIT** — c'est ce
  qui fait deviner qu'on peut balayer. Ce qui est corrigé, c'est que son
  CADRE débordait de l'écran. Le contrôle distingue les deux : il ignore
  tout élément dont un parent défile horizontalement.
- **TROIS LARGEURS** — 320, 390, 430 px : une gouttière change avec l'écran,
  et le défaut n'apparaissait qu'en dessous de 900.
- **LE CONTRÔLE VISE LE SITE CONSTRUIT**, dans `test-nouveau-bascule`. Les
  autres suites éprouvent le dépôt, qui ne porte pas cette feuille :
  aucune ne pouvait voir ce défaut, et aucune ne l'aurait vu demain.
  Éprouvé en remettant la façade d'origine — il tombe aux trois largeurs et
  **nomme le coupable** (`div.services [-6→396]`) plutôt que de dire « ça
  déborde » et de laisser chercher dans six mille lignes.
- **CE QUI N'A PAS ÉTÉ TOUCHÉ, ET QUI SE VOIT EN MESURANT** : la façade
  écrit trois fois `grid-template-columns` sur `.services`, qui reste en
  `display:flex` — ces règles sont **inertes**, le carrousel est intact.
  Les retirer ou poser `display:grid` changerait l'aspect de l'accueil :
  c'est une décision de Barbaros, pas un nettoyage.

### QUATORZE CONTRÔLES ROUGES DEPUIS DES JOURS, ET PERSONNE NE LES VOYAIT

16 septembre 2026. La série complète lancée avant une fusion a rendu **14
échecs dans 5 suites**, tous antérieurs. La publication ne regarde pas les
suites : elles pouvaient rester rouges indéfiniment.

**UN TEST QUI TOMBE TOUS LES JOURS NE SURVEILLE PLUS RIEN.** On s'habitue au
rouge, et le jour où il tombe pour une vraie raison, personne ne le voit.
C'est pire qu'un test absent — celui-là, au moins, ne rassure personne.

**UNE SEULE CAUSE POUR DIX D'ENTRE EUX : ils figeaient la formulation du
jour.** La PR #123 a réécrit les documents légaux et changé les tarifs, le
12 septembre. Les tests cherchaient mot pour mot « Total to pay »,
« Données de localisation », « souscrit l'option », « sortie des trains »,
et attendaient un prix calculé à 2,35 €/km. Le fond était resté juste ;
seule la phrase avait bougé. Même leçon que la barre du bas figée sur
quatre onglets et que `p.font-mono` — **viser la règle, pas le libellé**.
Ce qui est verrouillé maintenant, et qui ne vieillira pas :
- le récapitulatif affiche ce que la page dit elle-même dans `ELA_TEXTES`,
  **et les deux langues doivent différer** — sinon une traduction recopiée
  du français passerait au vert ;
- la politique de confidentialité **nomme le bouton** de localisation et
  **pose une condition** à côté, dans les DEUX langues ;
- les CGV nomment l'option pancarte **et son montant, lu dans la page**, et
  **aucune** phrase ne promet la pancarte sans condition.

**LE TROU DE CONTRAT QUE ÇA A DÉCOUVERT.** La réécriture des CGV avait
**perdu l'option pancarte de l'article 4**. Le site facturait donc 10 € une
prestation que la formation du prix ne mentionnait plus — et le prix est
ferme donc opposable. Rétabli dans les deux langues, avec la date de mise à
jour des CGV. **Un document légal qui change sans que sa date change est
lui-même trompeur.**

**LES QUATRE DERNIERS VENAIENT D'AILLEURS, ET C'ÉTAIT LE PLUS INSTRUCTIF :
`test-nouveau-bascule` éprouvait le DÉPÔT alors que son sujet est le site
PUBLIÉ.** Elle cherchait `application.html`, que seul `construire.sh`
fabrique (`cp site/index.html site/application.html`), et concluait au
fichier manquant. Elle construit donc maintenant le site et le sert sur un
second port ; ce qui touche à l'artefact publié vise `SITE`, le reste garde
le dépôt. C'est la suite qui existe pour attraper « un fichier oublié dans
la recette marche en local et reste introuvable en ligne » — elle ne pouvait
pas le voir en n'ouvrant jamais le résultat de la recette.

**LE PREMIER JET D'UN DE CES CONTRÔLES NE TOMBAIT PAS.** Celui de la
pancarte cherchait la PREMIÈRE phrase parlant du panneau — et depuis que
l'article 4 en parle aussi, c'est elle qu'il lisait : l'article 8 pouvait
promettre la pancarte gratuitement à tout le monde sans que rien ne bronche.
Il vérifie désormais que **toutes** ces phrases sont conditionnelles. Trouvé
en l'éprouvant contre le défaut, pas en le relisant.

**UN TEST QUI RÉIMPLÉMENTE CE QU'IL VÉRIFIE NE VÉRIFIE RIEN.** Écrit après
avoir failli garder un contrôle d'arrondi qui recalculait la formule dans
le test au lieu d'appeler la page : il serait passé au vert même avec le
calcul cassé. Faire la vraie course — pour le plancher, une distance de
2 km rendue par le faux OSRM, et on lit le prix à l'écran.

Playwright n'est pas installé dans le dépôt : lier le paquet global une
fois par session avec
`mkdir -p node_modules && ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright`
(`node_modules/` est ignoré par git).

**Les suites tournent hors ligne.** Chacune coupe elle-même ce qu'elle ne
veut pas joindre, en tête de fichier (`p.route('**://…', r => r.abort())`) —
il n'y a plus de coupe-circuit commun : le fichier test-hors-ligne (nommé ici
sans accents graves, voir la convention de `test-doc.mjs`) est parti avec
l'ancien site, et ce paragraphe a continué de le nommer pendant des semaines.
Tout ce qui n'est pas le serveur local échoue immédiatement au lieu de faire attendre
le navigateur trente secondes par appel. Sans ça, l'ensemble dépassait dix
minutes et finissait en délai sans rien vérifier ; avec, il tourne en six
minutes et vérifie au passage que le site reste utilisable quand ses
dépendances extérieures tombent — le cas réel d'un client dans un parking
d'aéroport. Ne pas retirer ce coupe-circuit pour « tester en conditions
réelles » : un test qui dépend d'Internet ne prouve rien.

*(Les trois pièges qui figuraient ici — `#roomPickup`, quatre gammes, repli
`<details>` — visaient l'ancien site : il y a deux gammes, Berline et Van.)*

## LA MISE EN LIGNE EST ENFIN CONTRÔLÉE, ET L'ASPECT AUSSI

22 septembre 2026, à sa demande (« fais ce qui est le mieux »), après un
audit des dix briques du mandat « STACK IA / DEVOPS MULTI-AGENTS V2 ».
**Deux briques retenues sur dix, et c'est une décision, pas un abandon** —
voir `PROJECT_STATE.md` pour les huit autres et la raison de chacune.

### Le site en ligne est contrôlé APRÈS sa publication

`pages.yml` publiait et s'arrêtait là. L'état **VÉRIFIÉ EN PRODUCTION**
écrit dans `AGENTS.md` n'avait donc aucun porteur : personne ne pouvait le
prouver, et une régression ne se découvrait qu'en perdant un client.

- **UN SEUL CONTRÔLEUR, DEUX CIBLES.** `.github/scripts/verifier-production.mjs`
  prend une adresse, n'importe laquelle : le site construit en local ou le
  site en ligne. Deux contrôleurs auraient divergé, et c'est celui qu'on
  oublie qui laisse passer la panne. C'est aussi ce qui le rend éprouvable
  depuis cette machine, qui ne joint pas `elatransfer.com`.
- **UN CODE 200 NE DIT PAS QUELLE PAGE A RÉPONDU.** Premier jet : en
  supprimant `exploitant/index.html`, le serveur rend un **listage de
  dossier** en 200 et le contrôle restait **vert**. C'est exactement le
  défaut Cloudflare déjà vécu ici — `html_handling` faisait servir le site
  de réservation à l'adresse `/demos/`, en 200, et Barbaros l'a vu au
  premier essai. On vérifie donc chaque porte d'entrée **par son titre**.
- **ON NE COMPTE QUE NOTRE PROPRE ORIGINE.** Un serveur de tuiles lent ou
  un calculateur d'itinéraire muet n'est pas notre régression : le site est
  écrit pour tenir sans eux. Confondre les deux ferait sonner l'alerte une
  nuit sur deux — et une alerte qui se trompe ne se lit plus.
- **LE FICHIER OUBLIÉ PAR LA RECETTE EST LE VRAI SUJET.** `construire.sh`
  ne publie que ce qu'il nomme : un fichier oublié marche parfaitement en
  local, où le serveur sert le dépôt entier, et reste introuvable en ligne
  sans lever la moindre erreur. Le contrôleur écoute donc les réponses ≥ 400
  de notre origine et **nomme le fichier**.
- **ON RÉESSAIE UNE FOIS AVANT DE CRIER.** Deux échecs à une minute d'écart,
  c'est réel ; un seul peut être le réseau du coureur.
- **L'INCIDENT EST UNE SEULE ISSUE**, retrouvée par son marqueur et jamais
  par son titre — un titre se reformule. Elle se met à jour tant que ça
  dure et **se ferme d'elle-même** au retour à la normale : quarante Issues
  pour une seule panne, et plus personne ne les lirait.
- Éprouvé contre quatre falsifications, toutes tombent en nommant le
  défaut : page absente, mauvaise page servie, fichier oublié, bouton de
  réservation disparu.

### La régression visuelle voit ce qu'aucune règle n'avait nommé

Les suites de ce dépôt éprouvent des **règles** : pas de débordement, pas
de bouton recouvert, pas de fichier manquant. Elles sont excellentes pour
ce qu'elles nomment et aveugles au reste. Une couleur qui change, un bloc
qui se décale, une section qui disparaît sans erreur : c'est Barbaros qui
les trouvait, sur une capture.

- **AUCUNE DÉPENDANCE AJOUTÉE, ET C'EST DÉLIBÉRÉ.** Comparer deux images
  demande normalement `pixelmatch` et `pngjs`. Ce projet ne tolère qu'une
  bibliothèque extérieure — Leaflet, servie depuis le dépôt. La comparaison
  est faite par le navigateur déjà installé : deux `canvas`, une boucle sur
  les pixels.
- **LE BRUIT EST NUL, ET C'EST MESURÉ.** Deux captures du même site rendent
  **exactement zéro** pixel d'écart sur les huit écrans. Le réseau extérieur
  est coupé pendant les captures et les animations sont figées : sans ça un
  fond de carte en retard d'un dixième de seconde signalerait un écart tous
  les jours.
- **LE SEUIL EST UN NOMBRE DE PIXELS, PAS UN POURCENTAGE**, et c'est la
  falsification qui l'a imposé. Repeindre la couleur d'accent du site —
  donc tous les boutons — ne touchait que **0,02 %** d'une longue page :
  sous le seuil, déclaré « identique ». **Une grande page diluait le
  défaut.** À 20 pixels, la même couleur ressort à 298 et 457.
- **UNE PAGE QUI NE S'OUVRE PLUS N'EST PAS UN CHANGEMENT D'ASPECT.** Même
  piège que ci-dessus, rencontré deux heures plus tard : un listage de
  dossier en 200 se capturait très bien. Toute page de ce site porte un
  `meta viewport`, parce que le mobile d'abord est la règle ; aucun listage
  n'en a. La capture échoue maintenant, et dit pourquoi.
- **IL NE FAIT PAS ÉCHOUER SUR UN CHANGEMENT D'ASPECT**, et c'est la règle :
  un écran qui change est peut-être exactement ce qui était demandé. On rend
  le nombre de pixels, la part de la page, la hauteur avant/après et une
  image où le rouge marque ce qui a bougé. **La validation visuelle reste
  humaine.** Il échoue en revanche si une page ne s'ouvre plus.
- **LES DEUX CAPTURES SE FONT DANS LE MÊME TRAVAIL, SUR LE MÊME COUREUR.**
  Le seuil de 20 pixels ne tient que par là. Et le contrôleur est **copié
  avant le retour en arrière** : sinon `git checkout` de la base rendrait le
  script d'avant, c'est-à-dire aucun script le jour où on l'introduit.
- **L'HORLOGE DU NAVIGATEUR EST FIGÉE, ET SANS ÇA L'OUTIL CRIAIT SUR
  CHAQUE PR.** Le formulaire d'accueil s'ouvre sur « maintenant + 15 min »
  arrondi au pas de 5 : deux captures prises à quelques minutes d'écart
  n'affichent pas la même heure. Mesuré — **65 pixels** d'écart sur
  l'accueil entre la capture avant et la capture après, alors qu'aucun
  fichier du site n'avait changé. `clock.setFixedTime()`, et l'écart
  retombe à zéro sur les huit écrans à cent secondes d'intervalle. Les
  suites du dépôt ancrent déjà l'horloge pour la même raison.
- Le filtre du workflow porte des **motifs**, jamais une liste de noms —
  une liste survit au fichier qu'on ajoute. Même piège que le filtre de la
  CI et que la barre du bas figée à quatre onglets.

**DEUX PIÈGES DE BANC, PAS DE PRODUIT, RENCONTRÉS EN LIVRANT CES OUTILS :**

- **UN MODULE ESM CHERCHE `node_modules` À CÔTÉ DE LUI-MÊME, PAS DANS LE
  DOSSIER COURANT.** Le contrôleur visuel doit être copié avant le retour
  en arrière — sinon `git checkout` de la base rend le script d'avant,
  c'est-à-dire aucun script le jour où on l'introduit. Posée dans
  `RUNNER_TEMP`, hors du dépôt, cette copie rendait `ERR_MODULE_NOT_FOUND`
  et le contrôle tombait en quarante secondes. **C'est la CI qui l'a dit,
  pas la relecture.** La copie vit donc à la racine du dépôt : un fichier
  **non suivi** survit à `git checkout --force` (ça, c'est `git clean`), et
  `construire.sh` ne publie que ce qu'il nomme — vérifié, il ne part pas en
  ligne.
- **UN SERVEUR LAISSÉ SUR LE MAUVAIS DOSSIER, TROISIÈME FOIS.** Deux écrans
  rendaient 404 pendant une simulation : un `python3 -m http.server` resté
  ouvert sur le port, enraciné sur le **dépôt** et non sur `site/`. Le
  contrôle de santé (`curl /`) l'acceptait, puisque le dépôt a aussi un
  `index.html`. **Encore un 200 qui ne dit pas qui a répondu.** Sur un port
  neuf, tout répond. Et `pkill -f "http.server"` n'est pas la solution : le
  motif correspond aussi à la ligne de commande du shell qui l'exécute, et
  il se tue lui-même — vu.

## NE JAMAIS CAPTURER `index.html` TOUT SEUL — IL A L'AIR D'UN AUTRE SITE

28 septembre 2026. Une capture envoyée à Barbaros montrait un accueil vert
sombre — l'ancienne palette, jamais la sienne. Il l'a vu tout de suite :
« mon site n'est pas celui-ci, ça c'est ancien ».

**LA CAUSE N'ÉTAIT PAS UN VIEUX FICHIER OUBLIÉ QUELQUE PART** — il n'y en a
pas, `index.html` est la seule source depuis la bascule de septembre. La
capture avait été prise en ouvrant `index.html` **directement**, sans passer
par `construire.sh` : `application-facade.css` (bleu, logo, boutons) ne
s'injecte que là, dans `site/index.html`, jamais dans le fichier source.
Vu seul, `index.html` porte encore sa palette de base ; vu à travers la
recette — ce que voit réellement un client — il est bleu.

**TOUJOURS CONSTRUIRE AVANT DE CAPTURER** : `sh construire.sh`, puis servir
et capturer `site/`, jamais le dépôt directement. Même famille que « le
script de capture ne construisait pas le site » plus haut dans ce fichier —
troisième fois que ce projet se fait avoir par une capture prise avant la
recette plutôt qu'après.

### QUINZE SUITES NE TOURNAIENT DANS AUCUN WORKFLOW (31 octobre 2026)

Audit « stabiliser avant d'ouvrir », sur `main` `4eced52`. Le lanceur local
ramasse tous les `test-*.mjs` ; la CI, elle, lance une liste écrite à la main
dans « Contrôle de l'admin retenu » plus quelques motifs (`test-admin-*`,
`test-reception-*`, `test-public-*`). **Quinze suites n'y étaient pas** : la
recherche d'adresse (`test-nouveau`), la carte, « Me localiser », les langues,
« Mes réservations » (`test-nouveau-courses`, un morceau du P0 #399), le
paiement par lien, les garde-fous, les cartes de services, la suppression,
l'affiche QR, l'icône de l'espace exploitant, `test-agent-rbac`, le texte de
l'alerte (`test-notification`), le chiffrement des notifications
(`test-push`) et le registre d'Admin v2. Une CI verte ne disait donc rien de
ces parcours.

- **Le premier relevé à la main en comptait treize** : il lisait aussi les
  commentaires des workflows, et `test-nouveau*` y était cité dans une
  explication. Quatrième fois qu'un contrôle trouve son mot dans un texte
  d'explication — le contrôle écrit ensuite ne lit que les lignes de commande.
- **La règle, pas la liste** : `test-doc.mjs` exige que chaque suite du dépôt
  soit lancée par une ligne de commande d'un workflow (nommée, attrapée par un
  motif, ou par un `npm run`), hors commentaires et hors `paths:` ; une suite
  Admin v2 doit être nommée là où l'on construit Admin v2. Éprouvé contre le
  défaut : il tombe sur `main` (15 suites), sur une suite seulement citée en
  commentaire, et sur une suite Admin v2 couverte par le seul chemin de
  déclenchement.
- `jsqr` et `http_ece` sont installés par la CI à version exacte, jamais dans
  le dépôt : absents, `test-nouveau-affiche` et `test-push` échouent au lieu
  de sauter leur contrôle.

### LA CI EN QUATRE MACHINES, ET LE TROU DE LA COMMISSION (1er novembre 2026)

**L'audit.** Le contrôle exigé `admin` durait 45 min 33 (passage 206, PR
#435), dont 45 min 05 de suites lancées l'une après l'autre sur une seule
machine : installation 20 s, construction du site 2 s (refaite par 55
suites), 85 lancements de Chromium (~45 s). Les quinze suites les plus lentes
faisaient 52 % du temps (`test-grille-publique` 3 min 16 en tête). Les autres
contrôles exigés rendent leur verdict en moins d'une minute : le « contrôle
rapide » existait déjà. Le 31/10, `admin` a tourné 8 fois en 7 heures ; deux
passages sont tombés sans défaut du site (`test-admin-non-vues` instable, et
trois suites qui ne tombaient que sur GitHub).

**Le trou trouvé en route (P1).** `test-admin-commission` ouvre l'admin
retenu (taux du carnet, % posé, euros fixes jamais au-dessus du prix, total
par chauffeur) et `test-admin-prix` vérifie qu'`index.html` ne recopie pas le
calcul du prix. Comme elles construisent AUSSI Admin v2, « admin » les
sautait (`grep -q ELA_AVEC_ADMIN_V2 && continue`) ; elles ne tournaient que
dans « Contrôle Admin v2 », filtré par chemins sans `index.html`. Mesuré : sur
les branches du P0 #399 et des preuves commerciales, ce contrôle n'a tourné
aucune fois. Même famille : `verifier-tarif-hotel.mjs` (« trois endroits, un
seul prix ») ne tournait que dans un contrôle filtré et non exigé.
- **Ce qui était vraiment sans garde, mesuré par mutation de `commissionDe`**
  (1er novembre 2026). Taux du carnet ignoré : tombent aussi
  `test-admin-controle`, `test-admin-donnees-serveur` et
  `test-nouveau-chauffeurs`, déjà exigées. % posé sur la course ignoré : tombe
  aussi `test-admin-controle`. **Plafond des euros fixes retiré (une
  commission plus chère que la course) : seule `test-admin-commission` tombe,
  sur les 17 suites qui parlent de commission.** Le trou était plus étroit que
  la première lecture de l'audit, mais réel. Leçon : un trou se mesure par une
  mutation, pas en lisant les noms des suites.
- Les huit suites Admin v2 tournent dans `admin` ; `verifier-tarif-hotel`
  dans `build-mobile-desktop`.
- `test-doc.mjs` ne compte plus une suite comme lancée que par un workflow qui
  tourne sur TOUTE PR (ni `paths`, ni `paths-ignore`, ni `types`), et refuse
  le saut. Éprouvé : il tombe sur les workflows de `main`, et sur une suite
  nommée seulement dans un workflow filtré ; l'ancien laissait passer les deux.
  Le premier jet, sans la règle du saut, restait vert sur `main` : le motif
  `test-admin-*.mjs` couvrait les suites que la boucle sautait.

**Le découpage.** Quatre machines, une par domaine (`admin`, `public`,
`reservation`, `partenaires`), chacune avec son serveur, son `site/` et ses
ports ; jamais deux suites en même temps sur une machine (elles effacent toutes
le même `site/`, onze ports sont partagés). `groupe_de()` range chaque suite :
une suite sans groupe fait tomber les quatre machines en la nommant (éprouvé
sur `test-textes`, ajoutée par la PR #436). `fail-fast: false` : par défaut,
GitHub arrête toute la matrice à la première rouge. Le job final garde le nom
exigé `admin` (la règle de `main` ne change pas) et tourne en `if: always()` :
**sans cela, un groupe rouge le fait sauter, et GitHub compte un contrôle
exigé sauté comme réussi.**

**Mesure et plafond.** Chaque groupe écrit la durée de chaque suite dans le
résumé du passage (l'outil qui lit les journaux GitHub n'en rend que les 5 000
dernières lignes : les 22 premières suites y étaient invisibles). Une suite
figée est arrêtée à 15 min et nommée « FIGÉE » au lieu de bloquer tout le
contrôle. Une nouvelle poussée annule le passage du commit précédent.

**Écarté, et pourquoi.** Cache de Playwright (20 s d'installation, ~10 s à
gagner contre un navigateur qui ne suit plus) ; construire une fois pour toutes
les suites (55 suites à modifier pour ~30 s par machine) ; filtre
« documentation seule » (quatre suites navigateur lisent la doc :
`test-nouveau-bascule`, `-exploitant`, `-whatsapp`, `test-seo-en`) ; plusieurs
suites en même temps sur une machine (collisions de `site/` et de ports).

**Reste au parking** : 1 261 pauses fixes (`waitForTimeout`) contre 202
attentes de condition, et 96 attentes qui avalent leur propre échec. Elles se
traitent une suite à la fois, quand une suite tombe pour rien ou ralentit son
groupe — `test-admin-non-vues` d'abord.
