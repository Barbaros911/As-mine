# Admin v2 — archive

> **Ceci est une archive, figée le 4 octobre 2026.** Admin v2 est un second
> espace exploitant construit en septembre 2026 (PR #176 à #185, puis les
> sept briques de parité), essayé par Barbaros le 23 septembre (« on garde
> l'ancien »), et **retiré de la publication le 3 octobre** (« retire »). Ce
> qui suit est l'histoire de sa construction, telle qu'elle était écrite
> dans `CLAUDE.md` ; rien n'y a été réécrit, et les renvois « plus haut »,
> « plus bas », « en fin de fichier » visent l'ancien `CLAUDE.md`. Ce qui
> reste vrai aujourd'hui est dans `CLAUDE.md`, section « ADMIN V2 N'EST
> PLUS PUBLIÉ ».

## ADMIN V2 — UN SECOND ESPACE EXPLOITANT, EN PRÉVERSION

Septembre 2026. Une **autre session Claude** a construit un espace exploitant
neuf, côté serveur : `admin-v2.html` et ses trois scripts, quatre migrations
Supabase, trois workflows. PR #176 à #185. **Il est publié mais `admin.html`
n'y bascule pas** : c'est une préversion.

**CE PARAGRAPHE A ÉTÉ VRAI, PUIS FAUX PENDANT DES JOURS** (corrigé le
21 septembre 2026). Il annonçait qu'Admin v2 n'avait ni « Coller une demande »,
ni la saisie par téléphone, ni le registre, ni l'export CSV, ni la facture de
commission, ni l'affiche QR, ni la demande d'avis, ni l'accusé de réception —
et il concluait qu'une bascule retirerait à Barbaros son geste principal.
**Les sept lots de parité ont tout porté**, et chacun a sa suite de contrôles.
Vérifié à la demande de Barbaros, suites en main : `test-admin-intake`,
`test-admin-registre`, `test-admin-factures`, `test-admin-affiche`,
`test-admin-gestes`, `test-admin-prix`. La note, elle, n'avait pas suivi.
**C'est exactement le défaut que ce fichier se reproche partout** : une note
qui vieillit sans bruit, et qui aurait servi à refuser une bascule pour une
raison qui n'existait plus.

**CE QUI RESTE VRAI, ET CE N'EST PAS LA MÊME CHOSE** : l'espace historique
**fonctionne sans serveur**. Session expirée, Supabase muet, il affiche quand
même les courses gardées dans le navigateur. Admin v2, non — il lit le
serveur. C'est le seul vrai argument en faveur de l'ancien, et il compte à
5 h du matin. En sens inverse : le registre de l'ancien ne vit que dans CE
navigateur (changer de téléphone le perd), ses règles de papiers ne sont qu'un
avertissement d'écran quand Admin v2 les fait imposer par le SERVEUR — un
filtre d'écran n'est pas une frontière, et l'attribution est l'instant où
Elatransfer engage sa responsabilité (L3142-1) — et il fait peser ~190 Ko de
back-office sur la page de chaque client.
**Ne pas lire « Admin v2 existe » comme « Admin v2 remplace »** pour autant :
la bascule de `admin.html` reste une décision de Barbaros, et elle n'est pas
prise.

Ce qu'il apporte en revanche, et qu'il ne faut PAS reconstruire : partenaires,
tarification serveur, codes promo, finances, paiement Stripe TEST, historique
des réservations, file « Action requise ».

### LE POSTE DE TRAVAIL — UN TABLEAU, ET UN BON QUI NE DIT QUE L'UTILE

21 septembre 2026, à sa demande, après avoir ouvert Admin v2 pour de vrai :
« j'arrive pas à traiter les courses, c'est mal fait, des touches qui ne
fonctionnent pas ». Les trois reproches étaient justes, et mesurables.

**LES BOUTONS ÉTAIENT RÉELLEMENT MORTS.** Feuille du bon à `z-index` 20, barre
de navigation du bas à 29 : la barre passait DEVANT une feuille modale. Le bon
défile sur 934 px pour 774 visibles, donc **chaque bouton mourait en
descendant dans les 78 px du bas** — « Accuser réception au client », à
782 px, recevait le doigt de la barre. Rien à l'écran ne le disait.
C'est le défaut que le site client avait corrigé des semaines plus tôt (« la
feuille est au-dessus de la barre ») et qui n'avait jamais été reporté ici.
**On masque la barre plutôt que de monter la feuille** : une navigation
visible sous un bon invite à quitter un travail en cours. La montée reste en
repli pour les navigateurs sans `:has` — deux défenses, parce qu'un bouton
mort ne se voit pas.

**LA VRAIE DIFFÉRENCE AVEC L'ESPACE HISTORIQUE N'ÉTAIT PAS UNE FONCTION,
C'ÉTAIT UN GESTE.** Là-bas, la ligne d'une course porte « Terminée » et
« Appeler » : un appui. Ici la ligne entière n'était qu'un bouton qui OUVRE le
bon — dix courses à clore le soir, dix ouvertures, dix défilements, dix
fermetures. `gesteRapide` appelle `changeStatus` et `driverPicker`, **jamais
une copie** : deux chemins pour un même geste finissent par diverger, et c'est
celui qu'on oublie qui laisserait une course dans un état illisible.
- **Un seul geste par ligne**, celui que le statut appelle. Une course finie
  n'en porte aucun : un bouton de plus serait du bruit.
- **La confirmation reste.** Un geste irréversible à un doigt, dans une liste,
  sur un téléphone tenu d'une main, c'est une course clôturée par erreur à 3 h.
- **La ligne ne pouvait pas rester un `<button>`** : un bouton dans un bouton
  est du HTML invalide, et chaque navigateur le défait à sa façon.

**LE TABLEAU DE TRAITEMENT** (écran « Courses ») : quatre colonnes qui sont les
étapes réelles du cycle — Nouvelles, À attribuer, En course, Clôturées. Chaque
carte porte le geste qui la fait avancer d'une colonne.
- **Même HTML aux deux tailles** : une colonne à la fois sur téléphone, choisie
  par des onglets qui portent le compte ; les quatre de front sur ordinateur.
  Deux balisages, et le jour où l'un gagne une colonne l'autre l'oublie.
- **Pas de glisser-déposer.** Ici « déplacer une carte » veut dire changer
  l'état d'une vraie course : c'est un bouton, avec sa question.
- **Le menu « Tous statuts » est parti** : les colonnes SONT le tri. Deux
  commandes pour un même tri se contredisent — filtrer « réalisée » en
  regardant « Nouvelles » vidait le tableau sans que rien ne l'explique.
- **CE N'EST PAS LE KANBAN DE L'ISSUE #197**, qui pilote le PRODUIT (backlog,
  priorités, agents) et dont la spécification dit elle-même de ne pas le mêler
  au cycle métier des réservations. Ne pas fondre les deux.

**LA PAGE DE TRAITEMENT NE GARDE QUE CE QUI SERT À DÉCIDER.** Mesuré avant :
« Confirmer la réservation » était à **588 px**, après le prix, la marge ELA,
le montant dû au chauffeur et l'état du paiement — le geste pour lequel on
ouvre un bon était le cinquième élément de la page. Il est à **182 px**, et la
feuille ne défile presque plus (788 px pour 774, contre 934).
L'ordre dit ce qu'on vient faire : l'état, les actions, la course, à qui l'on
parle. Les chiffres, le paiement et l'historique passent sous un repli — ils
servent à **vérifier**, pas à décider. Le tarif et le paiement TEST descendent
avec eux : le bouton le plus visible d'un bon en attente ne pouvait pas être
une fonction que Stripe Live n'active même pas.
- **`#bookingActions` garde son nom** : deux autres modules y greffent leurs
  boutons (accusé de réception, demande d'avis, tarif serveur). Le renommer
  les détacherait en silence. `#bookingActionsPlus`, dans le repli, accueille
  ce qui ne sert pas à décider maintenant — et le module retombe sur la zone
  d'origine si elle manque : une greffe qui ne trouve pas son hôte ne doit pas
  disparaître sans un mot.

**TROIS PIÈGES DE PEAU, TOUS DÉJÀ CONSIGNÉS AILLEURS DANS CE FICHIER :**
- **`.urgent` existait déjà**, avec un filet DORÉ. La colonne qui doit crier
  sortait donc en or. Quatrième fois après `.arrivee`, `class="carte"` et
  `.service span span` : **une classe déjà prise ramasse une règle écrite pour
  autre chose**. Le modificateur s'appelle `kanban-urgent`.
- **`.ko` vaut `#ffc1c7`**, un rose pâle dessiné pour le fond SOMBRE de
  l'ancienne feuille. La refonte l'a mise en blanc : contraste mesuré **1,3
  pour 4,5 exigé**, et Barbaros l'a vu sur sa capture. Une couleur choisie
  pour un décor et non pour un rôle — c'est ce qui avait fait virer le logo au
  vert avec `--gold`.
- **La carte du tableau gardait la grille d'une ligne de liste**, qui réclame
  555 px de minimum. Dans une colonne de 330 px, le trajet se faisait couper
  et le prix sortait du cadre. Invisible sur téléphone, où la règle des 800 px
  empilait déjà tout : **seul l'écran large le montrait**.

**LE MESSAGE QUI ENVOYAIT CHERCHER UN ÉCRAN INEXISTANT.** « Le lien d'avis se
règle dans *Tarification* » : l'onglet s'appelle **Tarifs et réglages**. Le
contrôle qui le surveillait figeait le mauvais nom, donc verrouillait le
mensonge. Il lit désormais le libellé DANS le menu et exige que les deux
disent la même chose.

**ET UNE FAUTE DE MA MAIN, QUI VAUT D'ÊTRE ÉCRITE** : en retirant le menu des
statuts, j'ai laissé `$('#fBooking').onchange` qui l'écoutait. L'erreur cassait
**tout** le script d'initialisation — plus de hamburger, plus de tableau — et
ne se voyait que dans la console. **Retirer un élément, c'est retirer ce qui le
regarde.**

### L'AUDIT DES BOUTONS, ET POURQUOI IL A FAILLI MENTIR DEUX FOIS

Même date, à sa demande : « je veux toutes les fonctions actives ». 42 boutons
appuyés sur les neuf écrans : **aucun mort, aucune erreur JavaScript**.

**« CE BOUTON A-T-IL UN GESTIONNAIRE ? » NE PROUVE RIEN** : un écouteur posé
sur `document` attrape tous les clics, et la réponse serait « oui » partout. On
mesure donc l'EFFET — un dialogue, un appel réseau, un téléchargement, le DOM
qui bouge. Les dialogues sont **refusés** : leur apparition suffit à prouver
que le bouton vit, et refuser laisse l'état tranquille pour le suivant.

- **PREMIER DÉTECTEUR, VINGT FAUSSES ALERTES.** Il comparait la LONGUEUR du DOM
  avec un seuil de 40 caractères : ouvrir un champ retire l'attribut `hidden`,
  sept caractères, et vingt boutons vivants étaient déclarés morts. On compare
  le DOM **à l'identique**, jamais sa taille.
- **DEUXIÈME PASSE, MAUVAISE CIBLE.** Mon clic de vérification visait le
  premier bouton du formulaire et non celui que j'accusais : j'attribuais son
  silence au voisin. Une liste de fausses alertes est pire qu'aucun audit.
- **CE QUE L'AUDIT NE PEUT PAS VOIR, ET QU'IL FAUT DIRE** : la bulle de
  validation du navigateur n'est pas dans le DOM. « Créer la course » sur un
  formulaire vide ne change donc rien de mesurable — il déplace le focus sur le
  premier champ manquant et le navigateur affiche sa bulle. Le bouton est
  actif ; le détecteur est aveugle à ce retour-là.
- **UN ONGLET DÉJÀ SÉLECTIONNÉ NE FAIT RIEN, ET C'EST CORRECT.**

**CE QUI RESTE EST LE GARDE-FOU, PAS L'AUDIT.** Un audit qu'on lance une fois
ne surveille rien. `test-admin-papiers.mjs` éprouve désormais la RÈGLE dont ce
défaut est le cas, aux trois largeurs : **aucun bouton visible ne doit recevoir
le doigt d'un autre élément**. On ne relit pas le CSS — on demande au
navigateur qui reçoit le doigt au centre de chaque bouton, parce qu'une règle
d'empilement se casse sans bruit, d'un `z-index` ajouté ailleurs.
Deux resserrements, chacun pour une fausse alerte mesurée : une feuille
**modale** recouvre légitimement tout ce qui est derrière (feuille ouverte, on
n'éprouve que SES boutons), et un élément **rogné** n'est pas un élément
recouvert (le contenu d'une feuille qui défile garde des rectangles dans la
fenêtre alors qu'il est hors de sa boîte).
**Éprouvé contre le défaut d'origine** : la barre remise devant la feuille, il
tombe à 320 et 390 px en nommant le bouton mangé, et reste vert à 1280 où la
barre ne s'affiche pas.

**LE MANDAT DE CHATGPT EST D'EN TERMINER UN SEUL** (#165, septembre 2026) :
la cible est le remplacement propre de l'espace actuel **quand la parité est
atteinte**, jamais deux espaces tenus en parallèle.

### LES PAPIERS D'UN CHAUFFEUR EXPIRENT TOUT SEULS — Admin v2 ne le voyait pas

Le premier défaut trouvé en reprenant le chantier, et il engageait une
responsabilité. L'état d'un chauffeur était un champ `statut` posé **à la
main** dans un menu déroulant, la colonne `documents` était déclarée et
**jamais écrite**, et **aucune date d'expiration n'était collectée**. Une
assurance expirée hier laissait donc le chauffeur « Validé » pour toujours, et
`validDrivers()` le proposait encore à l'attribution — l'instant précis où
Elatransfer engage sa responsabilité (L3142-1).

**UN ÉTAT STOCKÉ NE VIEILLIT PAS.** C'est tout le défaut, et il ne se voit
pas : l'écran affiche « Validé », il est simplement faux. C'est la même faute
que le tableau de tarifs qui a menti pendant des jours — **une valeur recopiée
survit au changement qui l'invalide**.

- **LES DATES SONT DES COLONNES, PAS UN JSONB** : une colonne se compare,
  s'indexe et se lit en SQL. Le `documents jsonb` d'origine ne servait à rien
  parce que rien ne pouvait l'interroger.
- **L'ÉTAT EST DÉRIVÉ, À UN SEUL ENDROIT** — la vue `chauffeurs_etat`. La page
  ne recalcule rien, elle traduit. Deux calculs qui divergent ne se voient pas :
  c'est la leçon déjà payée sur le prix client contre le prix exploitant.
- **`security_invoker = true` SUR LA VUE.** Sans lui, elle servirait de porte
  dérobée autour des policies de la table.
- **« PÉRIMÉ » ET « MANQUANT » SONT DEUX VALEURS, ET LES DEUX SONT AU ROUGE**
  — un papier absent ne prouve pas plus qu'un papier expiré. Mais **seul
  « périmé » BLOQUE** l'attribution : c'est un fait connu, une date passée.
  « Manquant » est une ignorance ; bloquer dessus reviendrait à inventer un
  fait, et surtout **rendrait TOUS les chauffeurs inattribuables le jour du
  déploiement**, puisque aucune date n'est encore saisie. On ne casse pas le
  geste principal de quelqu'un pour appliquer une règle à la lettre.
- **LE NOM DU TYPE D'ACTION EST LU PAR DU CODE.** Le tableau de bord compte
  « Sans chauffeur » avec un `includes('chauffeur')` sur le type : un type
  nommé `papiers_chauffeur` aurait gonflé cette métrique **sans que rien ne le
  signale**. Il s'appelle `papiers_a_regulariser`.
- **DEUX NULL SONT DISTINCTS POUR UN INDEX UNIQUE POSTGRES.** Une action liée à
  un chauffeur n'a pas de `course_ref` : l'index partiel existant n'aurait rien
  dédupliqué et la file se serait remplie de doublons à chaque rafraîchissement.
  D'où une colonne `chauffeur_id` et son propre index.
- **LA FONCTION `ela_rafraichir_actions` EST REMPLACÉE EN ENTIER** : ses trois
  inserts d'origine sont recopiés à l'identique. En oublier un les supprimerait
  en silence — un contrôle compte qu'il y en a quatre.

#### L'ÉCRAN CACHAIT, LE SERVEUR N'IMPOSAIT PAS — LE VRAI BLOQUEUR

Trouvé par ChatGPT en relisant la première version de ce correctif, et il avait
raison : la liste déroulante ne montrait plus les chauffeurs aux papiers
périmés, **mais les deux RPC continuaient de les accepter**. Elles
choisissaient le chauffeur avec `actif and statut='valide'` — le champ posé à
la main, celui-là même qui ne vieillit pas et que ce correctif existe pour
remplacer. **Un filtre d'écran n'est pas une frontière de sécurité** : un appel
direct passe à côté, et l'attribution est l'instant précis où Elatransfer
engage sa responsabilité (L3142-1).

- **UNE SEULE RÈGLE, ÉCRITE UNE SEULE FOIS** : `ela_chauffeur_attribuable()`.
  La vue l'appelle, les deux RPC l'imposent. Écrire la même condition aux trois
  endroits, c'est se donner rendez-vous avec la divergence — le projet l'a déjà
  payé sur le prix client contre le prix exploitant.
- **LA VUE ÉTAIT PLUS PERMISSIVE QUE LE SERVEUR, et je ne l'avais pas vu.**
  Elle acceptait `statut not in ('bloque','a_verifier')`, les RPC exigeaient
  `= 'valide'` : une fiche au statut hérité `a_renouveler` s'affichait
  attribuable et se faisait refuser à l'attribution. On s'aligne sur le
  serveur, qui était le plus strict — et `etat_effectif` suit, sinon la fiche
  dirait « à jour » pendant que l'attribution la refuse.
- **`create or replace` REMPLACE LA DÉFINITION ENTIÈRE** : `security definer`
  et `set search_path` doivent être réécrits, sinon la fonction retombe en
  *invoker* et perd son chemin figé. Ça ne se voit qu'en production — d'où un
  contrôle qui relit `pg_proc` après la migration, et un autre qui vérifie
  qu'`anon` n'a pas l'exécution.
- **LE 30e JOUR N'ÉTAIT PAS DANS LA FENÊTRE.** Le SQL disait `< aujourd'hui +
  30`, le site dit `j <= JOURS_ALERTE`. Le serveur aurait donc répondu « à
  jour » le jour même où l'écran affiche « expire dans 30 j ». Aucun symptôme,
  aucun message : les deux se contredisent en silence, et on l'apprend au
  contrôle. Deux fiches encadrent la borne dans le test, au 30e et au 31e jour.
- **LE COMMENTAIRE SQL RACONTAIT L'INVERSE DU CODE** : il annonçait
  « NULL = non renseigné, ce qui vaut périmé » alors que `manquant` est rouge
  mais **non bloquant**. Une documentation qui ment est pire qu'une absente —
  la prochaine session l'aurait lue comme la règle.
- **LE TEST APPELLE LES DEUX RPC, il ne relit pas leur source.** Il vérifie
  aussi qu'un refus **n'écrit rien** (ni attribution, ni changement de statut),
  et — le contrôle qui lève le doute — qu'un chauffeur **en règle passe** : une
  RPC qui refuserait tout rendrait exactement les mêmes erreurs. Un dernier bloc
  éteint l'exploitant pour prouver que le refus venait bien du chauffeur et non
  d'un refus d'accès global.
- **ÉPROUVÉ CONTRE QUATRE FALSIFICATIONS**, chacune sur un vrai PostgreSQL :
  les RPC remises sur `statut` (le test rend mot pour mot « A ACCEPTÉ Ayse,
  assurance expirée depuis 2 jours »), la borne remise à `<`, `security
  definer` retiré, et l'exécution rendue à `anon`. Les quatre tombent.

**TROIS DATES NE FONT PAS UNE CONFORMITÉ CHAUFFEUR — À NE PAS PRÉSENTER
AINSI.** Ce correctif suit `carte_vtc_fin`, `registre_fin` et `assurance_fin`.
ChatGPT signale que le Code des transports en demande davantage à une centrale
de réservation — permis de conduire, assurance du véhicule, état du véhicule,
vérification avant première mise en relation puis contrôles périodiques
(R3141-1 à R3141-4). **Je n'ai pas pu lire ces articles : le réseau de cette
machine ne joint pas Legifrance.** C'est donc rapporté, pas vérifié, et à
confirmer sur le texte avant d'en faire une règle. Ce qui est sûr en revanche :
**ne pas laisser croire que le carnet actuel suffit**, et traiter la suite
comme une matrice « obligation → preuve → échéance → règle d'attribution →
test », sans rien inventer.

**« DATE ABSENTE = ROUGE MAIS NON BLOQUANT » EST UNE RÈGLE DE MIGRATION, PAS
UNE POLITIQUE.** Elle existe parce qu'aucune date n'est encore saisie : bloquer
dessus rendrait tout le carnet inattribuable le jour du déploiement. Elle se
durcira quand le carnet sera rempli — **ce sera une décision de Barbaros**, pas
un correctif appliqué en silence. Le test le dit à l'endroit même du contrôle,
pour que la prochaine session ne le « répare » pas.

#### LA SUITE SQL EST TOMBÉE À 00 h 21, ET C'ÉTAIT LE TEST QUI AVAIT TORT

16 septembre 2026, premier rouge en CI sur la brique suivante. Message :
« un papier qui expire aujourd'hui est declare perime ».

**LE CODE ÉTAIT JUSTE, LES FIXTURES DATAIENT DANS LE MAUVAIS FUSEAU.** Elles
posaient `current_date` — le jour de la **session**, donc UTC sur un coureur
GitHub — pendant que la règle compare au jour de **Paris**. À 22 h 21 UTC il
est 00 h 21 à Paris : ce ne sont plus le même jour, et « expire aujourd'hui »
devenait « expire hier ».

- **ELLE PASSAIT AU VERT DEPUIS DES HEURES POUR UNE SEULE RAISON** : on ne
  l'avait lancée qu'à des heures où UTC et Paris tombaient le même jour. C'est
  la même famille que le `toISOString` du site, qui ne se voyait qu'entre
  minuit et 2 h — **exactement quand personne ne teste**. La fenêtre ici est
  22 h–minuit UTC, tous les jours.
- Les fixtures datent maintenant depuis `(now() at time zone 'Europe/Paris')`,
  **le même repère que la règle**. Une fixture et la règle qu'elle éprouve
  doivent parler du même calendrier.

**ET LE CONTRÔLE QUE J'AI AJOUTÉ POUR ÇA NE PROUVAIT RIEN AU PREMIER JET.**
Il décalait la session à Kiritimati (UTC+14) et comparait au jour de Paris.
Or à 22 h UTC les deux tombent le **même** jour : il passait au vert sur la
version fausse. **Un contrôle qui ne mord qu'à certaines heures est exactement
le défaut qu'on répare.**
Il est maintenant déterministe : Midway (UTC-11) et Kiritimati (UTC+14) sont à
**vingt-cinq heures d'écart**, donc toujours sur deux jours différents. On
prend « aujourd'hui » vu de Midway et on demande son état depuis les deux
fuseaux — une règle ancrée à Paris rend deux fois la même chose, une règle qui
lit `current_date` rend « valide » ici et « périmé » là-bas.
Éprouvé sous **quatre** configurations : le vrai code vert en session UTC,
Paris et Kiritimati ; la version fausse tombe, et nomme l'écart.

**`test-admin-papiers.mjs` ÉPROUVE LE SITE CONSTRUIT, PAS LE DÉPÔT**, et
**construit et sert elle-même**. Les trois scripts d'Admin v2 ne sont rattachés
à la page que par `construire.sh` : ouverte depuis le dépôt, `admin-v2.html`
n'a ni sélecteur de chauffeur ni file d'actions, et la suite serait passée au
vert sans rien avoir éprouvé. Un serveur lancé à côté est un serveur qu'on
finit par laisser sur le mauvais dossier — **rencontré ce jour-là, une
demi-heure perdue à mesurer le dépôt en croyant mesurer le site publié**.
Éprouvée contre le défaut d'origine : elle tombe sur trois contrôles et nomme
le chauffeur qui n'aurait pas dû être proposé.

**ELLE EST TOMBÉE À SON PREMIER PASSAGE EN CI, ET LA CAUSE EST GÉNÉRALE.**
Elle attendait des **durées fixes** — 1200 ms après le chargement, 300 ms après
l'ouverture du bon. Ça passe sur la machine de travail et ça tombe sur un
coureur plus lent : `load()` n'avait pas fini, `state.courses` était vide,
`openBooking()` rendait la main sans rien ouvrir, et le clic tombait sur
`null`. **Un délai fixe n'est pas une attente, c'est un pari sur la vitesse
de la machine.** On attend ce qu'on veut voir — `waitForSelector`,
`waitForFunction` — jamais une durée.
- **La condition doit couvrir TOUT ce dont la suite se sert ensuite.** Le
  premier correctif n'attendait que `state.drivers` : `load()` remplit chaque
  source indépendamment dans un `Promise.all`, donc les chauffeurs arrivaient
  pendant que les courses manquaient encore. Même panne, plus loin.
- **Éprouvé en retardant le serveur de 3 s** : l'ancienne version rend
  « Cannot read properties of null », la nouvelle passe. Reproduire la
  lenteur vaut mieux que supposer qu'on l'a corrigée.
- **ET LA VRAIE CAUSE ÉTAIT AILLEURS ENCORE : LA VERSION DE PLAYWRIGHT.**
  1.56.1 sur la machine de travail, **1.47.2** épinglée dans le workflow —
  et **l'ordre de priorité des routes n'est pas le même**. La suite posait une
  route générique (« tout ce qui n'est pas le site local, on coupe ») puis une
  route spécifique pour le faux serveur : en 1.56 la spécifique l'emporte, en
  1.47 la générique avalait tout. **Aucune donnée n'arrivait**, `state.courses`
  restait vide, et le bon s'ouvrait sur rien. Zéro ligne de code différente
  entre les deux machines, deux comportements.
  - **Correction de fond : UNE SEULE ROUTE qui décide de tout.** Deux routes
    obligent à connaître un ordre ; une seule ne peut pas se tromper.
  - **Et la CI est alignée sur la version d'ici.** Deux recettes finissent
    toujours par diverger — celle-ci l'avait déjà fait. Le Chromium de 1.47
    n'étant pas téléchargeable depuis cette machine, **je n'ai pas pu éprouver
    la suite sur 1.47** : plutôt que de supposer, on supprime l'écart.
- **PIÈGE DE DIAGNOSTIC** : le journal de la CI affichait six
  « role "root" does not exist » du service PostgreSQL, juste avant l'échec.
  Ce n'était **pas** la cause — `pg_isready` sans `-U` rend quand même 0,
  vérifié. Du bruit qui ressemble à une panne fait perdre un quart d'heure ;
  le `-U postgres` a été posé pour que personne ne le rechasse.


### PARITÉ, BRIQUE 7 — LA CHAÎNE DU PRIX EST PARTAGÉE

18 septembre 2026, dernière brique de la parité. « Calculer le prix depuis les
adresses » n'existait que côté site : quand un hôtel appelle, Admin v2 ne
savait qu'accepter un montant tapé à la main.

**CE QUI DIVERGERAIT SERAIT LE PRIX, et c'est pour ça que cette brique est la
plus exposée des sept.** Barbaros annonce un montant au téléphone depuis
l'espace exploitant ; le client en voit un autre sur le site. Le prix est
**ferme donc opposable** : c'est le client qui aurait raison. Et rien ne
l'annonce — le prix s'affiche des deux côtés, il est simplement différent, et
on le découvre le jour où quelqu'un compare.

**LA CHAÎNE N'EST PAS RECOPIÉE, ELLE A DÉMÉNAGÉ** dans
`itineraire-partage.js` : même chemin que `intake-demande.js` à la brique 1 et
`qr-affiche.js` à la brique 6. Ce qui y vit : les quatre niveaux d'itinéraire
et leurs deux clés, les trois lecteurs de réponse, le tracé GeoJSON, le
minuteur par appel, `departAt`, le vol d'oiseau de secours, **l'arrondi de
Barbaros**, `prix`, et les appels d'adresse BAN/Photon.

- **LA GRILLE EST UN PARAMÈTRE OBLIGATOIRE**, jamais un défaut caché.
  `prix(gamme, km)` : le site passe `GAMMES`, Admin v2 passe la grille du
  **serveur**. Un défaut dans le fichier partagé serait une **deuxième
  grille**, muette le jour où la vraie change — même règle que le lecteur de
  demandes. Un contrôle relit la signature dans la source.
- **CE QUI RESTE DANS LA PAGE, ET CE N'EST PAS UN OUBLI** : le **classement**
  des résultats d'adresse (`chercher`, `note`, `variantes`, `dedoublonner`,
  les terminaux, `sansAccents`). Il est lié à l'autocomplétion du site — le
  chemin le plus emprunté du produit — et le déplacer aurait mêlé une refonte
  de l'ergonomie client à un partage de calcul. Le fichier partagé porte les
  **appels** et leur lecture, donc les coordonnées ; `lieu()` y rend le
  premier résultat plausible, ce dont Admin v2 a besoin. **La limite est
  nommée plutôt que cachée.**
- **`prix` RESTE UNE FONCTION DE LA PAGE**, même si elle ne calcule plus
  rien elle-même — elle délègue à `window.ELA_ROUTE.prix`.
  **CETTE SECTION DÉCRIT UN ÉTAT DÉPASSÉ** — voir « UN SEUL TARIF AU
  KILOMÈTRE, ET IL SE MODIFIE DEPUIS L'ADMIN » (28 septembre 2026) en fin
  de fichier, qui dit vrai aujourd'hui : le mode hôtel avait une SECONDE
  grille au kilomètre pour « autre destination » (2,55 et 4,10 €/km,
  arrondi à l'euro), injectée à la construction par
  .github/scripts/appliquer-regles-easyhotel.mjs. Barbaros a demandé
  qu'il n'y en ait plus qu'une pour tout le monde : le transformateur a été
  **supprimé**, il n'avait plus rien à faire une fois les deux grilles
  unifiées, et retiré de `construire.sh`.
- **SANS GRILLE SERVEUR, ADMIN V2 NE CALCULE PAS**, et il le dit. Inventer un
  tarif par défaut ferait annoncer au téléphone un prix que personne n'a
  validé. Même règle que `ecrireGrilleV2` : trois contrôles tombent si on
  invente une grille de repli.
- **LES ADRESSES RETENUES SONT RÉÉCRITES DANS LES CHAMPS.** La recherche rend
  le premier résultat plausible ; si ce n'est pas le bon Ibis, le kilométrage
  est faux et le prix avec. Barbaros doit **voir** ce sur quoi il annonce un
  montant. Et **le prix reste modifiable** : c'est une négociation.
- **UN ÉCHEC NE BLOQUE RIEN.** La saisie à la main a toujours marché, et c'est
  elle le chemin sûr : le calcul le dit et rend la main.

**LE CONTRÔLE QUI COMPTE LE PLUS EST L'ÉGALITÉ AU CENTIME AVEC LE SITE**, sur
la même distance et la même grille. Et **l'arrondi s'éprouve sur un 5 pile** :
à 16,25 km et 4,00 €/km la course fait exactement 65 €, le seul cas où `>` et
`>=` se séparent. Sa règle est que le 5 pile **descend** — 60 €, pas 70.
- **PREMIER JET RATÉ, ET LA LEÇON VAUT** : j'avais posé ce cas à 11,25 km,
  soit 45 € pile — mais **le plancher du van est à 50 €, et il a le dernier
  mot**. Le contrôle tombait sur le code juste. Un cas d'arrondi ne prouve
  rien s'il est repris par le plancher : il faut le poser **au-dessus**.
- **LE FAUX SERVICE D'ADRESSES RÉPOND SELON LA QUESTION POSÉE.** Le premier
  jet rendait la **même** place pour les deux champs : le trajet faisait alors
  0 km, le prix tombait au **plancher**, et deux contrôles passaient au vert
  sur un prix faux. Un défaut qui résoudrait les deux adresses au même endroit
  rendrait exactement ça — 30 € sur un Paris → Argenteuil — sans un mot.
- **UN CONTRÔLE QUI PASSE PAR CHANCE DE CALENDRIER NE VÉRIFIE RIEN.** La scène
  « sans grille serveur » n'attendait qu'un texte non vide : elle attrapait
  « Recherche des adresses… » et « aucun prix n'est inventé » passait au vert
  parce que le calcul n'avait pas fini d'écrire. Elle attend maintenant un état
  qui a **tranché**. Éprouvé : sans cette attente, un seul des trois contrôles
  tombait.
- **PIÈGE DE BANC RENCONTRÉ ICI** : `state` est déclaré en `let` au premier
  niveau d'un script classique — il vit donc dans la portée **lexicale**
  globale et **n'est pas sur `window`**. `window.state` rend `undefined`, et
  l'attente expirait sur une page parfaitement chargée.

**LA SUITE ITINÉRAIRE RÉÉCRIT MAINTENANT LE FICHIER PARTAGÉ, plus la page.**
Les clés ont suivi le code qui les lit. Viser `index.html` passait au vert en
ne remplaçant **rien** : un `replace` sur une chaîne absente ne lève pas, il
rend le texte tel quel, et la suite aurait éprouvé la **vraie** clé au lieu de
la fausse. Éprouvé en reculant : douze contrôles tombent.

`test-admin-prix.mjs`, **32 contrôles**, branchée en CI. Quatre
falsifications, toutes tombent en nommant le défaut — dont celle qui recopie
l'arithmétique dans Admin v2, qui diverge de 10 € et se fait prendre par le
prix ET par la source.

#### LE TARIF HÔTEL AU KILOMÈTRE POUVAIT DÉRIVER SANS QUE RIEN NE TOMBE

18 septembre 2026, trouvé en contrôlant le travail de ChatGPT à la demande de
Barbaros. Le workflow « Contrôle source tarifaire serveur » compare les tarifs
**généraux** et les **forfaits** du site publié à la source serveur. Il ne
comparait **pas** le taux hôtel **au kilomètre** — celui qui s'applique quand
une réception envoie un client vers « autre destination ».

**MESURÉ, PAS SUPPOSÉ.** En posant `9.99 : 8.88` dans le transformateur, le
site publié facturait **9,99 €/km** en mode hôtel et **tous les contrôles
restaient au vert**.
- **PREMIÈRE FALSIFICATION RATÉE, ET ELLE VAUT D'ÊTRE ÉCRITE** : mon `sed`
  n'avait rien remplacé (les guillemets du motif sont échappés dans une chaîne
  JS), le taux était resté le bon, et le vert ne prouvait donc rien. J'ai
  failli conclure d'une mesure qui n'avait pas mordu. **Une falsification qui
  ne change rien est un test qui ne teste rien** : toujours vérifier que le
  défaut est bien en place avant de lire le verdict.

**POURQUOI ÇA NE SE VOIT PAS** : ce taux n'existe que dans le site
**construit**. Le dépôt ne le porte pas — c'est le transformateur qui
l'injecte — donc **aucune suite qui éprouve le dépôt ne peut le voir**. Même
famille que le débordement de 6 px, que seul le site publié montrait.

`.github/scripts/verifier-tarif-hotel.mjs` **ne fige aucun nombre** : il lit le taux dans le
site publié, lit la source serveur, et exige l'égalité. Une baisse décidée par
Barbaros touche les deux et reste verte ; n'en toucher qu'un tombe, et le
message **nomme la gamme et l'écart au centime**. Trois falsifications : le
build qui dérive, la source serveur qui dérive, le transformateur qui ne
s'applique plus — les trois tombent.

#### CE QUE LE CONTRÔLE DU TRAVAIL DE CHATGPT A DONNÉ DE BON

Même date, même demande. Ce qui a été éprouvé et tient :
- **Aucun secret dans le dépôt** : ni clé Stripe secrète, ni `service_role`,
  ni `whsec_`. Les seules occurrences de ces motifs sont les workflows qui les
  **cherchent** — des garde-fous, pas des fuites. Aucune trace de Stripe Live.
- **Aucune policy de lecture pour `anon`**, nulle part. Les tables sensibles
  portent toutes `revoke all ... from anon`, et les `select` sont réservés à
  `authenticated` **plus** `est_exploitant()`. C'est la frontière qui protège
  les noms, téléphones et adresses des clients (RGPD).
- **Le webhook Stripe est solide** : signature HMAC SHA-256 sur le corps
  **brut**, comparaison à **temps constant**, fenêtre de 300 s contre le
  rejeu, et surtout **l'`event_id` n'est marqué qu'APRÈS l'écriture
  financière** — si la base tombe entre les deux, Stripe rejoue et rien n'est
  perdu. C'est le bon ordre, et il est commenté.
- **Autorisé n'est pas encaissé** : `requires_capture` → « autorise »,
  `succeeded` → « encaisse », et les deux montants vivent dans deux colonnes
  distinctes. La capture est **manuelle** (`capture_method=manual`).
- La référence de course venue des métadonnées Stripe est **validée par une
  expression régulière** avant toute écriture — une donnée qui vient de
  l'extérieur n'entre pas telle quelle.

**RIEN DE BLOQUANT TROUVÉ SUR CE PÉRIMÈTRE.** Le seul trou est celui du tarif
hôtel ci-dessus, et il est bouché.

#### LE MODULE RECOPIÉ EST ARRIVÉ EN MÊME TEMPS, ET IL ANNONÇAIT 10 € DE TROP

18 septembre 2026. Pendant que cette brique s'écrivait, admin-v2-itineraire.js
est entré dans `main` par un autre chemin, juste avant la fusion de #191
(commits `37540d6`, `b9da08b`, `ee3b7f2`). **Il fonctionnait**, et il respectait
la bonne règle : la grille vient exclusivement du serveur. Mais il **recopiait**
la chaîne au lieu de la partager — exactement ce que cette brique existe pour
éviter.

**MESURÉ, PAS SUPPOSÉ.** Sur les distances de 1 à 60 km par pas de 250 m,
**dix-neuf** donnaient un prix différent de celui du site, **toujours 10 € plus
cher** :

| Distance | Gamme | Le site | Le module recopié |
|---|---|---|---|
| 13,75 km | Van | **50 €** | 60 € |
| 16,25 km | Van | **60 €** | 70 € |
| 23,75 km | Van | **90 €** | 100 € |

- **LA CAUSE EST L'ARRONDI.** Il utilisait `Math.round(p/10)*10`, l'arrondi de
  l'école, qui **monte** sur un 5 pile. Chez Barbaros le 5 pile **descend** —
  c'est écrit dans ce fichier depuis septembre, et c'est le montant qu'il
  annonce au téléphone. **Le prix est ferme donc opposable : c'est le client
  qui aurait raison.**
- **ET UN SECOND ÉCART, STRUCTUREL** : il n'appelait **qu'OSRM**, le serveur de
  démonstration, quand le site passe d'abord par ORS — dont la clé est remplie.
  Deux moteurs de routage, deux distances, donc deux prix sur **presque toutes**
  les courses, pas seulement les 5 piles. *L'ampleur de cet écart n'a pas pu
  être mesurée d'ici : le réseau de cette machine ne joint aucun des deux
  services. C'est donc rapporté comme structurel, pas chiffré.*
- **IL N'AVAIT NI MAPBOX, NI LE VOL D'OISEAU.** OSRM muet, et l'espace
  exploitant ne sait plus donner un prix du tout, là où le site en donne un.
- **SON TEST NE LISAIT QUE DES CHAÎNES DE CARACTÈRES** — « le module est
  publié », « le bouton existe », « BAN est appelé ». Onze contrôles, aucun
  comportemental : **l'arrondi n'était vérifié par rien**. Un test qui cherche
  des mots dans un fichier ne dit rien du prix qui sort.

**LES DEUX ONT MÊME COEXISTÉ UNE CONSTRUCTION**, le temps d'une résolution de
conflit : l'écran portait alors **deux boutons « Calculer le prix depuis les
adresses »**, côte à côte, rendant deux prix. **Pire que l'un ou l'autre.**

Le module recopié et son test ont donc été **retirés** au profit de la chaîne
partagée. Trois contrôles gardent la trace : aucun tarif kilométrique recopié
côté exploitant (c'est ce que son test verrouillait de bon, et ça survit), le
fichier n'existe plus, la recette ne le publie plus.

**LA LEÇON N'EST PAS « l'autre s'est trompé ».** Les deux travaux ont commencé
du même constat juste, et le sien marchait. Ce qui a coûté les 10 €, c'est
d'avoir **réécrit** un calcul au lieu d'aller le chercher — et personne ne
l'aurait vu, puisque le prix s'affiche des deux côtés. **C'est la règle du
dépôt, éprouvée une fois de plus sur l'objet le plus cher qu'il protège.**

**ERREUR DE MA PART À LA REPRISE, ET ELLE VAUT D'ÊTRE ÉCRITE** : le rebase
avait **trois** conflits, pas deux. Mon `grep -c "<<<<<<<\|>>>>>>>"` a rendu
« 2 » et je l'ai lu comme du contexte au lieu de deux marqueurs restants — le
troisième est parti dans un commit, et `construire.sh` ne s'exécutait plus
(« Syntax error: redirection unexpected »). **J'ai mesuré, et j'ai mal lu la
mesure** ; c'est la même famille que les quatre fautes de lecture déjà
consignées ici. Ce qui l'a rattrapé : **exécuter la recette**, pas la relire.

### PARITÉ, BRIQUE 6 — L'AFFICHE DE COMPTOIR ET SON QR

17 septembre 2026. Admin v2 n'avait pas l'affiche hôtel : la piste
commerciale à coût zéro — le concierge ne téléphone pas, il montre
l'affiche, le client scanne et son adresse de départ est déjà remplie.

**L'ENCODEUR N'A PAS ÉTÉ RECOPIÉ, IL A DÉMÉNAGÉ** dans `qr-affiche.js`,
partagé par les deux espaces. Même chemin que `intake-demande.js` à la
brique 1, et ici la raison est plus forte qu'ailleurs : **un encodeur QR ne
se vérifie pas tout seul**. Le premier jet de celui-ci passait TOUS les
contrôles internes — format relu, masque, zigzag, Reed-Solomon divisible,
dix syndromes nuls — et n'était lisible par **aucun téléphone** :
l'information de format était écrite bit à l'envers, et le décodeur maison
reproduisait la même erreur. Deux copies dont une dérive, ce sont des
affiches imprimées que personne ne peut scanner, et **on ne l'apprend qu'au
comptoir, des semaines plus tard**.

- **LA BASE DU LIEN EST UN PARAMÈTRE OBLIGATOIRE** de `lienHotel(base, nom)`,
  jamais devinée par le fichier partagé. C'est le danger propre à cet
  espace : le site client vit à la racine, **Admin v2 sur
  `/admin-v2.html`**. Prendre `location.pathname` tel quel — ce que fait
  légitimement la page cliente — fabriquerait des affiches qui envoient le
  client du comptoir **dans le back-office**. Rien à l'écran ne le dirait :
  l'affiche s'imprime, elle est simplement fausse. `baseClient()` retire le
  dernier segment ; un contrôle lit le lien imprimé et refuse toute trace
  d'« admin ».
- **LA LISTE DES HÔTELS VIENT DU SERVEUR** (`state.partners`), et le nom
  choisi est **recopié dans un champ libre** plutôt que dessiné depuis le
  menu : c'est le nom IMPRIMÉ qui compte, une réception s'appelle parfois
  autrement que la raison sociale. Et **un hôtel pas encore partenaire se
  saisit à la main** — l'affiche est justement l'outil de prospection, on
  l'imprime avant de signer.
- **RIEN N'EST DESSINÉ TANT QU'AUCUN NOM N'EST DONNÉ.** Une affiche « Votre
  hôtel » imprimée par mégarde est du papier perdu, et surtout un QR qui
  envoie tout le monde au même endroit **sans provenance** — c'est-à-dire
  sans la seule chose qui dise ce que l'hôtel rapporte.
- **À L'IMPRESSION, SEULE L'AFFICHE SORT** — `visibility`, jamais `display`,
  qui s'hérite. Sans cette règle, le tableau de bord (**noms et téléphones
  de clients**) partirait sur le papier posé au comptoir d'un hôtel. Le test
  **mesure la visibilité calculée** sous `media: print` au lieu de relire le
  CSS.

**LE DÉFAUT QUE CETTE BRIQUE A DÉCOUVERT : `hidden` ÉTAIT CONTREDIT PAR UNE
CLASSE.** L'attribut ne pose `display:none` que par la feuille du navigateur
— la moindre règle d'auteur qui fixe `display` l'emporte, **en silence**.
`.row{display:flex}` laissait donc le bouton « Imprimer l'affiche » visible
**sans affiche** : on imprimait le tableau de bord. La règle est posée
**générale** (`[hidden]{display:none!important}`) et non sur `.row` : un
élément ajouté demain n'héritera pas du piège. Même famille que la barre du
bas figée sur quatre onglets — *une règle taillée pour un cas unique survit
au jour où le cas se généralise*.

**LE DÉCODEUR EST UN TIERS, ET SON ABSENCE EST UN ÉCHEC.** `jsqr` vit dans
le bac à sable ou dans `node_modules`, jamais dans le dépôt ; s'il manque,
`test-admin-affiche.mjs` **s'arrête** au lieu de sauter en silence le seul
contrôle qui prouve qu'une affiche se scanne. Même règle que `http_ece` pour
le chiffrement des notifications. Il est donc **installé en CI** : un vert
qui n'a rien décodé ne dit rien.

**`qr-affiche.js` EST ENTRÉ DANS LE FILTRE DE LA CI ET DANS `test-doc`.**
C'est un fichier **partagé**, comme `intake-demande.js` : sans lui dans les
motifs, le modifier seul ne déclencherait **aucune** suite — exactement le
trou bouché la veille. Le contrôle de couverture devait le connaître, sinon
il gardait le trou qu'il a été écrit pour fermer.

- `test-admin-affiche.mjs`, **27 contrôles**. Sept falsifications, toutes
  tombent en nommant le défaut — dont la vraie d'origine, l'information de
  format à l'envers, qui rend `null` au décodage.

### PARITÉ, BRIQUE 5 — L'ACCUSÉ DE RÉCEPTION ET LA DEMANDE D'AVIS

17 septembre 2026. Les deux gestes de l'exploitant vers le client, portés
ensemble parce qu'ils partagent le même mécanisme : un message WhatsApp parti
du téléphone de Barbaros, et une **trace** gardée sur la course.
`admin-v2-gestes.js`, `ela_marquer_geste_client`.

- **CE NE SONT PAS DES ENVOIS AUTOMATIQUES, ET ILS NE PEUVENT PAS L'ÊTRE.** Le
  site n'a aucun moyen d'envoyer un SMS tout seul. Ne pas promettre l'inverse.
- **LA RÈGLE QUI STRUCTURE LA BRIQUE : chaque geste n'a de sens que dans un
  état, et c'est le SERVEUR qui l'impose.** L'accusé sur une course en
  **attente** — une fois confirmée, c'est « Prévenir le client » qui parle, et
  deux messages coup sur coup diraient au client qu'on ne sait pas où on en
  est. L'avis sur une **réalisée** — on ne demande pas à quelqu'un ce qu'il a
  pensé d'un trajet qu'il n'a pas fait.
  **Pourquoi côté serveur et pas dans l'écran** : toute l'utilité de la marque
  est d'être vraie (« sur dix demandes reçues la nuit, on ne se souvient pas
  de qui a eu une réponse »). Une marque posée dans le mauvais état fait
  croire à Barbaros qu'il a répondu à quelqu'un à qui il n'a rien dit, et il
  ne le découvre que quand le client rappelle.
- **UN REFUS N'ÉCRIT RIEN.** Un refus qui laisserait quand même la trace
  serait pire qu'un refus muet : la marque mentirait de toute façon.
- **ON PEUT REFAIRE LE GESTE**, et la date se rafraîchit : un client peut dire
  « oui oui » et oublier. Ce qu'on interdit, c'est le mauvais état.
- **DEUX GESTES SEULEMENT, ET NOMMÉS.** Accepter n'importe quelle chaîne
  ferait entrer une marque que rien n'affiche — donc une trace perdue.
- **LE MESSAGE SUIT `bon.langue`, ET LA DATE AVEC LUI.** « 09/20/2026 » à un
  anglophone, « 20/09/2026 » à un francophone : le même jour, lu correctement
  des deux côtés. Une course ancienne sans ce champ retombe sur le français.
- **L'ACCUSÉ NE PROMET NI CHAUFFEUR NI VÉHICULE** : on ne les connaît pas
  encore, et promettre une voiture qu'on n'a pas placée est le meilleur moyen
  de laisser quelqu'un sur un trottoir. Quatre lignes, pas un paragraphe.
- **SANS LIEN D'AVIS, RIEN NE PART** — le message se terminerait dans le vide.
  Le lien vit dans `parametres_commerciaux` (`lien_avis`), pas dans le code :
  c'est le sien, et un identifiant de son compte Google n'a rien à faire dans
  un dépôt public. **Une adresse invalide est refusée** : un lien cassé envoyé
  à un client est pire qu'un lien absent — lui, au moins, ne se clique pas.
- **SANS NUMÉRO, AUCUN BOUTON, et on le DIT.** Un bouton qui n'envoie rien
  ferait croire que le client est prévenu.
- **`window.open` EST DANS LE GESTE DU CLIC**, sans aucun `await` avant :
  Safari iOS bloque une fenêtre ouverte après une attente. La marque part
  ensuite, et **si elle échoue on le dit** plutôt que d'afficher « envoyé »
  sur une trace qui n'existe pas.
- **LES AVIS NE S'INVENTENT PAS** — c'est le seul point où l'on ne suit pas
  Barbaros, et il est rappelé dans le bloc de réglage lui-même (L132-2).

**LE PIÈGE SQL QUE CETTE BRIQUE A DÉCOUVERT, ET QUI TOUCHAIT LES ÉPREUVES
PRÉCÉDENTES.** Une falsification est restée **verte** : la marque écrasait le
bon entier et le contrôle ne le voyait pas. La cause est la logique ternaire
de SQL — `null <> 'Jean Martin'` vaut **NULL, pas TRUE**, donc le `if` ne se
déclenche jamais. **Un contrôle écrit ainsi ne peut pas échouer.** Quinze
comparaisons du même type dormaient dans les quatre épreuves déjà écrites ;
toutes sont passées à `is distinct from`, et les quatre repassent au vert.
**Écrire `<>` sur une valeur qui peut être NULL, c'est écrire un contrôle
décoratif.**

**PIÈGE DE TEST, PAS DE CODE** : la suite calait sur un clic d'onglet, et
Playwright accusait l'écriteau de recouvrir le bouton. **Mesuré : aucun
chevauchement** — bouton 693–737, écriteau 753–788, `elementFromPoint` rend
bien le bouton. C'était **la feuille du bon, restée ouverte**, qui couvre
toute la page : elle est modale par construction, et c'est ce qui empêche de
cliquer derrière par accident. Un vrai doigt la ferme avant d'aller ailleurs ;
le test le fait maintenant aussi. *Sans la mesure, j'aurais « corrigé » une
mise en page qui n'avait rien.*

- `test-admin-gestes.mjs`, **37 contrôles** ; `gestes-client.sql`, **8 blocs**.
  Onze falsifications, toutes tombent en nommant le défaut.

### LA FACTURE POUVAIT SORTIR VIDE, À 0,00 € — TROUVÉ EN RELECTURE

17 septembre 2026, bloquant relevé par ChatGPT sur #191. **Le pire défaut de
la brique 4, et il ne se voyait pas** : le document s'imprime, il est
simplement faux.

`ela_emettre_facture_commission` verrouillait les courses (`for update`) pour
obtenir `refs`, puis **reconstruisait `lignes` et `v_ht` par un SECOND appel
indépendant** à `ela_lignes_facture`, sur toute la période, **sans jamais
comparer le résultat à l'ensemble verrouillé**. Les `coalesce` ramenaient
alors `'[]'` et `0` **sans un mot**.

**MESURÉ SUR UN VRAI POSTGRESQL, À DEUX SESSIONS** — pas supposé : facture
`F-2026-0001` émise à **0,00 €, zéro ligne**, **un numéro consommé**, et les
deux courses marquées `factureNum` — donc **plus jamais facturables**. De
l'argent qui n'entre jamais, et on ne l'apprend que chez le comptable.

- **LA SÉQUENCE DÉCRITE EN RELECTURE NE SE REPRODUIT PAS, ET CE N'EST PAS UN
  DÉSACCORD.** Deux émissions simultanées sur le même lot : la seconde est
  bien refusée, parce que le `for update` revalide et rend `refs` vide. Le
  **trou structurel** désigné, lui, est réel — il fallait seulement trouver
  par où il passe.
- **IL PASSE PAR `attributions_chauffeur`, QUE LE VERROU NE COUVRE PAS.** Le
  `for update` porte sur `courses`. Une attribution retirée pendant l'attente
  du verrou suffit : au réveil, le second calcul prend un **nouveau
  snapshot**, ne voit plus rien, et la facture part à zéro.
- **LE DOCUMENT VIENT MAINTENANT DU SEUL ENSEMBLE VERROUILLÉ**
  (`where l.ref = any(refs)`), et **on refuse avant de consommer un numéro**
  si cet ensemble est vide ou s'il diffère. Un lot qui a bougé se refuse :
  le facturer en silence ferait perdre les courses disparues, un refus laisse
  simplement recommencer.
- **DEUX REFUS, DEUX GESTES, ET LE TEST L'EXIGE.** Un lot **vide** rend
  `aucune_course_a_facturer` — « il n'y a rien à facturer », ça se constate.
  Un lot qui a **rétréci** rend `lot_modifie_pendant_emission` — « recommence ».
  Les confondre enverrait tourner en rond, ou faire renoncer alors qu'un
  aperçu suffit. **Sans cette exigence, la garde du lot vide était
  décorative** : la garde de divergence l'attrapait de toute façon.
- **L'AUTRE BORD DE LA RÈGLE COMPTE AUTANT** : une course devenue facturable
  **pendant** l'attente ne doit PAS bloquer l'émission. Sans la restriction au
  lot verrouillé, l'ensemble « différerait » et un compte actif **ne
  facturerait plus jamais**. C'est ce cas qui rend la restriction observable —
  sans lui, elle n'était éprouvée par rien.

**L'ÉPREUVE EST À DEUX VRAIES SESSIONS, par `dblink`** : une divergence de
snapshot ne se fabrique pas dans une seule transaction. Et **le blocage sur un
verrou est ce qui la rend déterministe** — on sait exactement où la session
bloquée se trouve. Quatre blocs (`9a` à `9d`), branchés en CI.

**L'ÉPREUVE DES « 100 INCRÉMENTS » NE COUVRAIT PAS ÇA.** Elle prouve que le
**compteur** est atomique, et c'est vrai ; elle ne dit rien de deux émissions
concurrentes **sur les mêmes courses**. *Un test vert sur le sujet d'à côté
rassure sans protéger.*

**PIÈGE RENCONTRÉ EN CORRIGEANT** : mon premier remplacement a atterri dans la
fonction d'**aperçu**, dont le bloc de calcul est identique à une ligne près.
La migration a refusé de s'appliquer (`refs_valides is not a known variable`)
— c'est le fait de **l'exécuter** et non de la relire qui l'a dit.

- **Quatre falsifications**, toutes tombent en nommant le défaut : la fonction
  d'origine, la garde de divergence retirée, la restriction au lot retirée, la
  garde du lot vide retirée.

### PARITÉ, BRIQUE 4 — LA FACTURE DE COMMISSION

17 septembre 2026. L'argent ne passe **jamais** par Elatransfer : le client
paie le chauffeur. La commission ne s'encaisse donc pas toute seule, elle se
**facture** — et Admin v2 n'avait rien pour ça.

- **LE SUJET DE CETTE BRIQUE EST LA NUMÉROTATION, PAS LE DOCUMENT.** Dans
  l'espace actuel le rang vit dans `localStorage` : un appareil, une main,
  aucun conflit possible. Ici **deux appareils peuvent émettre en même
  temps**, et la loi interdit au numéro de facture les **trous** comme les
  **doublons** (L441-9). Lire le rang puis l'écrire serait exactement la
  faute — deux émissions simultanées liraient N et écriraient toutes deux
  N+1, donc **deux factures au même numéro**. Et ça ne se voit pas : les deux
  documents s'impriment normalement, on l'apprend chez le comptable.
  D'où **une seule instruction** : `insert … on conflict do update …
  returning`, atomique, la ligne verrouillée par Postgres le temps de
  l'incrément. Une épreuve fait cent incréments et vérifie qu'ils sont **cent
  valeurs distinctes et contiguës**.
- **LE RANG EST CONSOMMÉ À L'ÉMISSION, JAMAIS À L'APERÇU** — un numéro brûlé
  sans facture est un **trou**, donc la même infraction à l'envers. Deux
  fonctions séparées : `ela_apercu_facture_commission` est `stable`, ne prend
  rien et n'écrit rien.
- **PAS DE SIRET, PAS DE FACTURE** — mais **l'aperçu reste possible**. C'est
  le cas réel : Barbaros n'a pas encore de SIRET, et un écran qui refuserait
  même de montrer ce qu'il facturera ne servirait à rien d'ici là. Le bouton
  « Émettre » est **caché** tant qu'il manque quelque chose, et l'écriteau
  **nomme ce qui manque et où le remplir** — un bouton qui échoue à chaque
  appui ferait croire à une panne.
- **LE DÉFAUT TROUVÉ AVANT D'ÉCRIRE UNE LIGNE : le bon ne porte PAS
  l'identifiant du chauffeur.** `ela_attribuer_chauffeur` n'y écrit que le
  nom, le téléphone et la carte. Filtrer sur le bon aurait rendu **aucune
  course** — une facture vide, sans le moindre message. Et s'y rabattre par
  le NOM répéterait la faiblesse de l'espace actuel, où il est saisi à la
  main (« Mehmet », « mehmet », « Mehmet Y. »). C'est
  **`attributions_chauffeur`** qui fait foi : une ligne structurée, pas du
  texte dans un JSON.
- **LA MARQUE SUR LES COURSES EST DANS LA MÊME TRANSACTION QUE LA FACTURE.**
  Séparées, une panne entre les deux brûlerait un numéro (trou) ou laisserait
  des courses refacturables (doublon). Et on **verrouille** les courses avant
  de les marquer (`for update`) : sans ça deux émissions simultanées pour le
  même chauffeur prendraient les mêmes courses. *Piège rencontré :
  `for update` ne se combine pas à un agrégat — on verrouille dans la
  sous-requête, on additionne au-dessus.*
- **AUCUNE POLICY D'ÉCRITURE SUR `factures_commission`**, et c'est voulu :
  seule la fonction sait prendre un numéro sans trou ni doublon. Une écriture
  directe contournerait le compteur. Un contrôle cherche qu'il n'existe
  aucune policy `INSERT`/`UPDATE`/`DELETE`.
- **LE TAUX EST PAR CHAUFFEUR** (`chauffeurs.taux_commission`), et retombe
  sur `commission_ela_defaut` quand il n'est pas renseigné — c'est la
  décision de septembre 2026 (« je place seulement »). La colonne `adresse`
  manquait aussi : sans elle le document n'est pas une facture.
- **LE SÉLECTEUR PORTE TOUS LES CHAUFFEURS**, pas seulement les
  attribuables : on facture aussi celui dont les papiers ont expiré **depuis**
  la course. **Ce qui bloque une attribution ne bloque pas une créance déjà
  née.**
- **LA FACTURE EST FIGÉE À L'ÉMISSION** : émetteur, client et lignes sont
  recopiés dedans. Le test **change l'identité de l'émetteur après coup, force
  la page à relire, puis rouvre l'ancienne facture**.
- **À L'IMPRESSION, SEULE LA FACTURE SORT** (`visibility`, jamais `display` —
  elle s'hérite). Sans cette règle, le tableau de bord — **noms et téléphones
  de clients** — partirait sur le papier envoyé au chauffeur. Le test **mesure
  la visibilité calculée** sous `media: print` plutôt que de relire le CSS.
- **DEUX FAIBLESSES DE TEST TROUVÉES PAR LA FALSIFICATION, PAS PAR LA
  RELECTURE.** (1) Mon faux serveur marquait les courses facturées **avant**
  de composer le document : la facture émise sortait sans ses lignes et à 0 €,
  et les contrôles ne regardaient que son en-tête. **Un faux serveur qui ment
  autrement que le vrai ne prouve rien.** (2) Le contrôle de la facture figée
  ne mordait pas : je changeais l'émetteur côté serveur sans faire relire la
  page, donc `state.params` gardait l'ancien — **un contrôle qui ne peut pas
  échouer ne vérifie rien.**
- `test-admin-factures.mjs`, **37 contrôles** ; `factures-commission.sql`,
  **8 blocs**. Onze falsifications, toutes tombent en nommant le défaut.
- **`parametres_commerciaux` a rejoint `supabase/tests/socle.sql`** : la
  facture y lit le taux par défaut et l'identité de l'émetteur.

### LE FILTRE DE LA CI NOMMAIT LES FICHIERS D'UN AUTRE JOUR

17 septembre 2026, trouvé en vérifiant une durée de CI qui m'avait paru
suspecte. **La durée, elle, était juste** — le coureur GitHub a Chromium en
cache, tout avait réellement tourné. *J'avais supposé au lieu de mesurer,
pour la cinquième fois dans ce projet ; le journal a tranché en une lecture.*

**Le vrai défaut était à côté.** `admin-v2-regression.yml` ne se déclenche
que sur les chemins qu'il **énumère**, et la liste nommait les quatre
fichiers qui existaient le jour où elle a été écrite. N'y étaient pas :
`intake-demande.js` — **le lecteur PARTAGÉ par les deux espaces** —,
`admin-v2-registre.js`, `test-admin-intake.mjs` et `test-admin-registre.mjs`.

- **LES MODIFIER SEULS N'AURAIT DÉCLENCHÉ AUCUN CONTRÔLE**, et rien ne
  l'aurait signalé. Le trou était masqué depuis la brique 1 parce que chaque
  commit touchait *aussi* `construire.sh` ou une migration — **une couverture
  obtenue par accident n'est pas une couverture**.
- **Même famille que la barre du bas figée sur quatre onglets, que le lanceur
  qui ne ramassait que `test-nouveau*`, et que la section « Tests » qui
  annonçait 23 suites.** Une liste écrite en dur survit au changement qui
  l'invalide, sans rien casser de visible.
- Le filtre porte maintenant des **motifs** (`admin-v2*`, `test-admin-*.mjs`,
  `supabase/**`), pas des noms.
- **LE CONTRÔLE NE FIGE PAS DE LISTE NON PLUS** — ce serait la même faute d'un
  cran plus loin. `test-doc.mjs` **traduit les motifs du workflow en
  expressions régulières** et vérifie que tout fichier d'Admin v2 présent dans
  le dépôt est attrapé par au moins un. Une suite ajoutée demain est couverte
  d'office ; un fichier qui sortirait du filet fait tomber le contrôle en le
  **nommant**. Éprouvé en remettant la liste d'origine : il tombe sur les
  quatre fichiers, un par un.

### PARITÉ, BRIQUE 3 — LE REGISTRE, LA SAUVEGARDE ET L'EXPORT CSV

17 septembre 2026. Admin v2 montrait ce qui ARRIVE, jamais ce qui a été
FAIT : pas de résultat par semaine, pas de tableau des chauffeurs, pas
d'export comptable. `admin-v2-registre.js`, onglet « Registre ».

- **LE DÉFAUT QU'IL A FALLU TRAITER EN PREMIER : `load()` NE LIT QUE LES 300
  DERNIÈRES COURSES.** Parfait pour un tableau de bord qui montre ce qui
  arrive, **mensonger pour un registre qui additionne une année**. Un total
  calculé sur une liste tronquée s'affiche sans un mot : il est simplement
  faux, et c'est le chiffre qu'on recopie dans une déclaration. Le registre
  fait donc **sa propre lecture** (`PLAFOND`, 5000) et, s'il touche ce
  plafond, **il le DIT** au lieu d'afficher un total qu'il sait incomplet.
  C'est la même famille que le tableau de tarifs qui a menti pendant des
  jours — **un document ne se trompe jamais bruyamment**.
- **LES TABLEAUX NE COMPTENT QUE LES `realisee`**, et **la date retenue est
  celle de la COURSE** : les deux règles de l'espace actuel, portées telles
  quelles. Une confirmée est une promesse ; la date de saisie décalerait les
  semaines au fil des oublis.
- **ON NE LIT LE REGISTRE QU'À L'OUVERTURE DE SON ÉCRAN.** Cinq mille lignes
  tirées au chargement, sur un téléphone, pour un écran qu'on n'ouvre pas
  tous les jours — c'est de la 4G brûlée.
- **LA RECHERCHE LIBRE N'A PAS ÉTÉ REFAITE** : l'écran « Réservations » la
  porte déjà, sur tout le registre. La rebâtir aurait été un second champ à
  tenir pour le même besoin.
- **LA SAUVEGARDE GARDE LE FORMAT `elatransfer-1`**, celui de l'espace
  actuel. Tant que les deux espaces coexistent, un fichier pris d'un côté
  doit se restaurer de l'autre — deux formats voudraient dire deux lecteurs,
  et c'est celui qu'on oublie qui refuserait le fichier le jour où il sert.
  Ce qu'elle n'est plus, en revanche : **le filet de survie**. Là-bas le
  registre ne vit que dans le navigateur ; ici les courses sont sur le
  serveur. Elle reste la copie de Barbaros, indépendante d'un hébergeur
  qu'il ne maîtrise pas, et le fichier que réclame un comptable.
- **LA RESTAURATION EST UNE RPC DE PLUS, ET C'EST VOULU**
  (`ela_restaurer_courses_exploitant`). `ela_creer_course_exploitant`
  n'accepte que `attente` et `confirmee`, **et c'est juste** : c'est la porte
  de SAISIE, et une course qu'on saisit ne peut pas être déjà réalisée. Une
  restauration ramène des courses **déjà vécues**. Élargir la porte de
  saisie pour les faire passer aurait ouvert une porte qu'on ne rétrécit
  jamais — et un exploitant aurait pu créer de toutes pièces une course
  « réalisée », c'est-à-dire **de l'argent qui n'est jamais entré**.
- **ELLE AJOUTE, ELLE N'ÉCRASE JAMAIS, et la règle est POSÉE CÔTÉ SERVEUR.**
  Une course d'ici peut avoir avancé depuis la sauvegarde — chauffeur
  attribué, course réalisée — et remplacer ferait **reculer** le travail au
  lieu de le rendre. C'est `fusionnerCourses()` porté côté serveur. Une
  garde d'écran n'aurait pas suffi : un appel direct passe à côté.
- **UNE LIGNE MAUVAISE NE FAIT PAS PERDRE LES AUTRES** : sans référence, avec
  un statut inconnu, ou qui n'est pas un objet — elle est comptée `refusee`
  et on continue. Sur une sauvegarde de trois cents lignes, s'arrêter à la
  première ferait perdre les deux cent quatre-vingt-dix-neuf autres.
- **UN FICHIER ILLISIBLE EST ARRÊTÉ DANS L'ÉCRAN**, il ne part pas au
  serveur : l'envoyer ferait lire à Barbaros un message de base de données
  là où l'écran savait déjà quoi dire.
- **LE STATUT NE RESTE PAS EN DOUBLE DANS LE BON** (`ligne - 'statut'`) : la
  colonne fait foi, et deux copies divergent au premier changement d'état.
- **`sw.js` N'A PAS BOUGÉ, ET C'EST DÉLIBÉRÉ.** Le module lit le serveur à
  chaque ouverture : hors ligne il n'a rien à montrer. Le mettre dans le
  `SHELL` aurait ajouté un point de rupture à un `addAll` tout-ou-rien pour
  un gain nul. Seul `intake-demande.js` y est, parce qu'il est **partagé**
  avec `index.html`.
- **LE TEST ANCRE L'HORLOGE DU NAVIGATEUR** au jeudi 17/09/2026. Une semaine
  « en cours » calculée depuis « aujourd'hui » rendrait la suite dépendante
  du jour où on la lance — **exactement le défaut que la CI a trouvé sur les
  fixtures SQL**. Et il **recalcule les totaux à la main** depuis le jeu de
  courses : un test qui prend la sortie pour référence ne vérifie plus rien.
- **LE TABLEAU DES CHAUFFEURS S'ÉPROUVE PAR SON ORDRE, pas par sa
  présence** : c'est lui qui sert à décider à qui confier la prochaine
  course. Un contrôle de présence serait passé au vert sur un tri inversé.
  Même leçon que la barre du bas et que les jours du tableau de bord.
- `test-admin-registre.mjs`, **52 contrôles** ; `registre-restauration.sql`,
  **8 blocs**. Sept falsifications, toutes tombent en nommant le défaut.

### PARITÉ, BRIQUE 2 — SAISIR UNE COURSE REÇUE PAR TÉLÉPHONE

16 septembre 2026. « Coller une demande » ne couvre que le client qui
**écrit** ; quand un hôtel **appelle**, il aurait fallu fabriquer un faux
message WhatsApp pour le coller.

- **ELLE ENTRE `confirmee`**, contrairement à une demande collée : une demande
  venue d'un client attend une réponse, une course convenue de vive voix
  n'attend personne. Même RPC que la brique 1, avec l'autre statut — les deux
  portes existaient déjà dans la fonction, elles servent enfin toutes les deux.
- **LA GRILLE AFFICHÉE VIENT DU SERVEUR** (`state.params`), jamais réécrite
  dans la page. C'est sur elle que Barbaros annonce un montant au téléphone :
  un nombre recopié ici resterait périmé au premier changement de tarif, sans
  que rien ne le signale. Même règle que `ecrireGrille()` côté site. **Sans
  grille serveur, on le DIT** — en afficher une par défaut ferait annoncer un
  prix sur un tarif que personne n'a validé.
- **LE CHAUFFEUR PASSE PAR LA RPC D'ATTRIBUTION**, jamais par le bon écrit à
  la main. C'est ce qui fait que la règle des papiers s'applique ici comme
  ailleurs : **on ne peut pas la contourner en créant la course avec un
  chauffeur déjà dedans**. Et si elle refuse, **la course existe quand même** —
  on ne perd pas un appel parce qu'un chauffeur n'était pas attribuable. Le
  refus est **dit**, jamais avalé.
- **LE RÈGLEMENT N'EST PAS DEMANDÉ** : il se convient de vive voix, et inventer
  « espèces » par défaut ferait partir le chauffeur sans son terminal.
- **`telValide` A REJOINT LA SOURCE PARTAGÉE.** La consigne « même contrôle que
  côté client » ne vaut que s'il n'y a **qu'un** contrôle : deux règles
  séparées, c'est un numéro accepté ici et refusé là, et le client qu'on ne
  rappelle pas.
- **ON DIT CE QUI MANQUE, PAS « formulaire incomplet »** — à 3 h du matin, un
  message qui ne nomme pas le champ oblige à tout relire.
- **LE BOUTON OUVRE, IL NE BASCULE PAS.** Premier jet : il refermait ce qu'on
  venait d'ouvrir, et la suite attendait un formulaire qui se cachait. Un
  bouton qui fait deux choses selon l'état se lit comme un bouton cassé —
  c'est « Annuler » qui ferme.

**DEUX PIÈGES DE TEST, ET LE PREMIER PROUVAIT LE PRODUIT.** La suite a calé
sur un clic « intercepté par la feuille » : c'était le **bon qui s'ouvrait
vraiment** après la création, comme il doit. Le second : le contrôle lisait le
titre de la feuille **avant** qu'`openBooking` ait fini — asynchrone. Et on
mesure le **titre**, pas `isVisible` : la feuille est toujours dans le DOM,
c'est une classe qui la montre, donc `isVisible` aurait pu répondre oui sans
que le bon soit le bon.

**CE QUI N'ÉTAIT PAS ENCORE PORTÉ À CE MOMENT-LÀ** : « Calculer le prix depuis
les adresses ». Côté site il passait par la chaîne d'itinéraire à quatre
niveaux ; la recopier dans Admin v2 aurait été exactement la divergence que ce
lot évite. **C'est fait — voir la brique 7** : la chaîne a déménagé dans
`itineraire-partage.js`, comme le lecteur.

### LA GRILLE DU CLIENT ET CELLE DU SERVEUR NE S'ACCORDAIENT QUE PAR CHANCE

16 septembre 2026, trouvé en préparant la saisie par téléphone. Le site
calcule le prix dans le navigateur (`GAMMES`) ; Admin v2 s'appuie sur une
source **serveur** semée par `20260916100000_current_tariff_source.sql`. Les
deux portaient les mêmes nombres — **et rien ne vérifiait qu'ils le restent**.

- **CE QUE ÇA COÛTERAIT** : Barbaros annonce un montant au téléphone depuis
  l'Admin, le client en voit un autre sur le site. Le prix est **ferme donc
  opposable** : c'est le client qui aurait raison.
- **L'ÉCART TRAVERSAIT LA FRONTIÈRE CLIENT/SERVEUR**, et c'est pour ça qu'il
  échappait à tout. `test-doc` comparait déjà `CLAUDE.md` à `GAMMES` — mais un
  changement du seul SQL laissait la doc et le site d'accord entre eux :
  **aucun contrôle ne bronchait**. Éprouvé : sur les quatre falsifications,
  celle qui ne touche que le serveur n'est vue que par le nouveau contrôle.
- **ON NE FIGE AUCUN CHIFFRE, on éprouve l'ACCORD.** Une baisse décidée par
  Barbaros touche les deux et reste verte ; n'en toucher qu'un tombe, et le
  message dit lequel et de combien.

### PARITÉ, BRIQUE 1 — « COLLER UNE DEMANDE » EXISTE DANS ADMIN V2

16 septembre 2026, première brique de la parité demandée par ChatGPT (#191).
Neuf courses sur dix arrivent par message : Admin v2 ne savait que **relire**
ce que le serveur contenait déjà. Basculer dessus aurait retiré à Barbaros son
geste le plus fréquent, sans rien pour le remplacer.

**LE LECTEUR N'EST PAS RECOPIÉ, IL A DÉMÉNAGÉ.** `intake-demande.js` est
désormais la source unique : `index.html` l'appelle, `admin-v2.html` aussi.
Le recopier aurait été la faute que ce fichier reproche partout — deux
recettes pour une seule chose — et elle ne se serait vue qu'à la course
suivante, sur un message dont la forme aurait changé d'un seul côté.
- **LA GRILLE EST UN PARAMÈTRE OBLIGATOIRE, jamais un défaut caché.** Un
  défaut dans le lecteur serait une **deuxième grille** : elle se tairait le
  jour où la vraie change, et le véhicule d'une course collée serait faux sans
  que rien ne le signale. Un appelant qui ne la fournit pas est arrêté.
- **LE STATUT ET LA RÉFÉRENCE SONT DES PARAMÈTRES AUSSI.** Le fichier LIT, il
  ne range pas : les deux espaces ont deux portes (une demande collée attend,
  une course prise au téléphone est déjà convenue) et ne comptent pas les
  références au même endroit — l'un dans le téléphone, l'autre sur le serveur.
- `construire.sh` le publie et l'injecte **avant** `admin-v2-actions.js`, qui
  l'appelle : un navigateur exécute les scripts dans l'ordre déclaré. Il est
  aussi dans le `SHELL` de `sw.js` — sans ça, un exploitant hors ligne appuie
  sur « Coller une demande » et rien ne se passe.

**LE CHEMIN SERVEUR EST UNE FONCTION DE PLUS, ET C'EST VOULU**
(`ela_creer_course_exploitant`). `ela_deposer_course_serveur` existait déjà
mais est réservée à `service_role` : c'est la passerelle **publique**, appelée
par une Edge Function pour un visiteur anonyme. L'ouvrir à `authenticated`
aurait mélangé deux portes qui n'ont pas les mêmes règles — et **une porte
qu'on élargit ne se rétrécit jamais**.
- **ELLE REFUSE UNE RÉFÉRENCE DÉJÀ PRISE, ELLE N'ÉCRASE PAS.** Coller deux
  fois le même message est exactement ce qui arrive la nuit, sur dix demandes
  d'affilée. Un `upsert` effacerait une course qui a **avancé** depuis —
  chauffeur attribué, course réalisée. C'est la règle de `fusionnerCourses()`,
  posée côté serveur.
- **Deux statuts seulement, et nommés.** Accepter n'importe quelle chaîne
  ferait entrer un jour un statut que le reste du système ne sait pas lire.
- Elle appelle `ela_rafraichir_actions()` : sans ça la file « Action requise »
  ne verrait la course qu'au prochain rafraîchissement, c'est-à-dire pas au
  moment où l'exploitant regarde.

**LE CONTRÔLE D'ACCÈS QUE LA FALSIFICATION A CORRIGÉ.** Le premier jet
vérifiait qu'un non-exploitant reçoit `acces_refuse` — et il restait **au
vert** quand on retirait le verrou de la fonction. Le refus venait en réalité
de `ela_rafraichir_actions()`, appelée à la fin, qui porte le sien. La course
était bien refusée, mais **par accident**, après avoir tenté l'écriture :
réordonner deux lignes, ou retirer un jour le verrou du callee, et le trou
s'ouvrait sans que rien ne tombe.
Ce qu'on éprouve maintenant est un **ordre**, pas une présence : un
non-exploitant qui vise une référence **déjà prise** doit recevoir
`acces_refuse`, jamais `reference_existante`. Seul un verrou posé dans cette
fonction-là, avant sa propre logique, rend cette réponse — et au passage on
n'apprend pas à un inconnu quelles références existent.

**UNE ATTENTE QUI EXPIRE DOIT NOMMER CE QU'ELLE ATTENDAIT.** Éprouvée contre
cinq falsifications, `test-admin-intake.mjs` en faisait tomber trois sur un
**délai d'attente nu** : elle échouait bien, sans dire pourquoi. « Une suite
muette est un échec » vaut aussi pour une suite qui plante. Chaque attente
passe par un `attendre()` qui transforme le délai en contrôle rouge nommé, et
le parcours de secours est **gardé** — sans ça un `fill()` sur un champ masqué
tuait la suite avant qu'elle imprime son bilan.

**CE QUI RESTAIT À LA PARITÉ APRÈS CETTE BRIQUE-LÀ** : saisie par téléphone,
registre et sauvegarde, export CSV, facture de commission, affiche QR des
hôtels, demande d'avis, accusé de réception, et la chaîne du prix partagée.
**Les sept briques sont faites au 18 septembre 2026** (1 à 7, dans cet
ordre). **Aucune bascule de `admin.html` pour autant** : la parité des gestes
n'est pas une relecture — c'est ChatGPT qui contrôle, brique par brique, et
c'est Barbaros qui décide.

## Le retrait de la publication (3 octobre 2026)

> Rangé ici le 6 octobre 2026 depuis `CLAUDE.md`, qui n'en garde que la règle.
> Texte d'origine, tel qu'il était écrit.

3 octobre 2026, Barbaros : « retire ». Il travaille seul, dans l'admin
historique ; Admin v2 en ligne n'était qu'une seconde porte vers les données
des clients et une seconde adresse où se tromper d'outil.
- **Retiré de la PUBLICATION, pas du dépôt.** `construire.sh` supprime
  `admin-v2-*.js` et `admin-v2-responsive.css` de `site/` et remplace
  `admin-v2.html` par une copie d'`admin.html` : une icône posée ou un lien
  gardé ramène à `/ela-admin/` (paramètres compris), jamais un 404.
- **LE RETRAIT EST LA RÈGLE PAR DÉFAUT, ET LE PREMIER JET L'AVAIT À
  L'ENVERS.** Il fallait POSER un drapeau pour retirer (`ELA_PUBLICATION=1`,
  dans `pages.yml`). La demande de fusion #294 a montré un contrôle
  « Workers Builds: as-mine » : **Cloudflare construit et déploie ce dépôt**,
  avec une commande réglée dans SON tableau de bord, invisible d'ici — et
  `elatransfer.com` résout vers des adresses Cloudflare (`2606:4700:…`,
  mesuré). Admin v2 serait resté en ligne sur le vrai domaine, sans un mot.
  Désormais **toute construction le retire** ; seul `ELA_AVEC_ADMIN_V2=1`
  le garde, et il n'est posé que par les suites qui l'éprouvent (huit
  `test-admin-*`, `capture-admin-165.mjs`) et par les quatre contrôles
  automatiques qui le lisent dans `site/`. **Un oubli ne peut plus que
  retirer, jamais publier.** `test-doc.mjs` vérifie que la recette retire
  par défaut et qu'aucune configuration de publication (`pages.yml`,
  `wrangler.jsonc`, la commande de `CLOUDFLARE.md`) ne pose le drapeau ;
  chaque contrôle tombe seul quand on le casse.
- **LES NOTES « CLOUDFLARE RESTE BLOQUÉ » PLUS HAUT SONT PÉRIMÉES** sur un
  point au moins : un projet Workers « as-mine » construit le dépôt. Ce que
  je n'ai PAS pu mesurer d'ici : si le domaine est servi par ce Worker ou
  par GitHub Pages derrière le proxy Cloudflare. La règle par défaut tient
  dans les deux cas — c'est pour ça qu'elle a été choisie.
- **Le code et ses suites restent**, et tournent avec le drapeau : ils
  portent la tarification serveur, les partenaires, la règle des papiers
  imposée par le serveur, et des fichiers PARTAGÉS avec l'admin retenu
  (`intake-demande.js`, `qr-affiche.js`, `itineraire-partage.js`). Le jour où
  il le redemande, rien n'est à réécrire.
- La régression visuelle capture désormais l'admin retenu (`/ela-admin/`)
  au lieu d'Admin v2.
- `verifier-production.mjs` exige désormais que `/admin-v2.html` serve la
  redirection (titre « Espace exploitant ») : construit avec
  `ELA_AVEC_ADMIN_V2=1`, il tombe en nommant la page — mesuré.
- **Les migrations et les fonctions qu'Admin v2 utilise restent en
  production** : elles ne s'appellent qu'avec une session exploitant. Ce que
  le retrait coûte, il faut le dire : l'admin retenu n'appelle pas
  `ela_attribuer_chauffeur`, donc la règle des papiers n'y est qu'un
  AVERTISSEMENT d'écran (et plus un refus depuis le 4 octobre 2026, à sa
  demande), pas une frontière serveur.
