# Asmine — mémo pour Claude

Ce fichier est lu automatiquement au début de chaque session sur ce dépôt.
Il évite de redemander les mêmes règles à chaque fois.

Ce dépôt sert à **deux activités distinctes**. Lire d'abord laquelle est
demandée :

| Activité | Fichiers | Branche |
|---|---|---|
| **Asmine**, l'application de réservation VTC | racine (`index.html`, `sw.js`…) | `claude/as-mine-booking-app-yqvxoi` |
| **Sites vitrines** pour des commerçants | `sites/<client>/` | `claude/session-creation-without-asmine-to9axd` |

## La règle absolue : ne jamais toucher Asmine *en travaillant sur un autre site*

`index.html`, `sw.js`, `manifest.webmanifest`, `icon.svg`,
`icon-maskable.svg`, `robots.txt`, `sitemap.xml` à la racine sont
l'application de réservation. Ne jamais les modifier pour créer ou tester
un autre site. Toute vérification se fait par comparaison de hachage
(`md5sum`) avant/après.

Cette règle ne s'applique évidemment pas quand la demande porte sur
Asmine lui-même — voir la section dédiée en fin de fichier.

## Créer un nouveau site

1. Copier `sites/_modele/` vers `sites/<nom-du-client>/` (minuscules,
   tirets, pas d'espaces ni d'accents dans le nom du dossier).
2. Tout ce que le site utilise (images, styles, scripts) reste **dans ce
   dossier**, appelé en chemin relatif (`./photo.jpg`), jamais absolu.
3. Mettre `<meta name="robots" content="noindex, nofollow">` tant que le
   client n'a pas validé — la page contient souvent ses vraies coordonnées
   et ne doit pas sortir dans Google à sa place. Le retirer une fois
   validé.
4. Ne jamais inventer d'avis clients ni de chiffres commerciaux : les
   marquer « à compléter » ou laisser l'emplacement vide. Publier de faux
   avis est une pratique commerciale trompeuse, sanctionnée par la loi.
5. Tester avant d'annoncer que c'est prêt — voir plus bas.
6. L'adresse publiée sera `.../As-mine/<nom-du-client>/`. La page
   `.../As-mine/demos/` liste tous les sites automatiquement ; rien à
   faire pour ça.

## Tester avant de dire qu'un site est prêt

Utiliser la compétence `webapp-testing` : lancer un serveur local, vérifier
avec Playwright sur ordinateur (1280px) et sur téléphone (390px) :
- aucun débordement horizontal
- aucune erreur JavaScript
- les boutons/menus cliquables sont vraiment cliquables (attention aux
  éléments qui se superposent en mobile)
- les liens de contact (tel:, WhatsApp) sont corrects

Ne pas se contenter de lire le code : ouvrir vraiment la page.

## Git et publication

**Rien ne part sans que Barbaros l'ait vu.** Règle posée en août 2026, après
deux fusions passées en ligne avant qu'il ait pu regarder. L'ordre est
toujours le même : faire le travail, **montrer** (capture d'écran, pas une
description), **attendre son accord**, et seulement ensuite pousser. Cela
vaut aussi pour ce qui est « visible par un client » : c'est justement ce
qui mérite d'être vu avant, pas après. Ne jamais lire l'urgence d'un lien à
envoyer comme une autorisation de fusionner.

**En cours, à ne PAS pousser sans son feu vert explicite** (août 2026) : la
branche `claude/as-mine-booking-app-yqvxoi` porte des commits d'avance —
accueil en bandeau marine, écran des véhicules refait, quatre gammes. Il
veut les intégrer plus tard et a demandé qu'on **le lui rappelle souvent** :
le dire à chaque réponse tant que ce n'est pas publié, sans pousser pour
autant.

- Développer sur la branche `claude/session-creation-without-asmine-to9axd`,
  jamais directement sur `main`.
- Toujours vérifier `git branch --show-current` avant un `git push` — déjà
  fait l'erreur de pousser vers le mauvais nom de branche une fois.
- Une fois l'accord donné : ouvrir la pull request **et la fusionner** —
  sans la fusion, le lien envoyé au client ne fonctionne pas.
- Un changement interne (compétences, configuration, outillage, rien de
  visible en ligne) : même règle, montrer et demander avant.
- Ne jamais committer et pousser dans le même appel : les faire l'un après
  l'autre. Un appel qui mélange les deux a déjà été bloqué par le
  classificateur de sécurité.
- `.claude/` (compétences, config) n'a aucun effet sur le site publié : le
  workflow `.github/workflows/pages.yml` ne copie que les fichiers qu'il
  énumère explicitement.

## Le dossier .claude/skills/

50 compétences installées, aucune ne nécessite de compte externe. Le détail
de chacune est dans `.claude/skills/README.md`. Ne pas re-proposer d'en
installer d'autres sans que ce soit demandé.

## Ton et langue

Répondre en français, simplement, sans jargon technique non expliqué.
Expliquer avec des exemples concrets plutôt que des concepts abstraits.
Se placer systématiquement du point de vue d'un professionnel expérimenté
— design, développement, conseil — et pas d'un exécutant : dire ce qui ne
va pas, proposer, trancher.

---

# Asmine — l'application de réservation

Tout ce qui suit ne concerne que le site à la racine du dépôt.

## Ce qu'est Asmine

Plateforme de mise en relation entre des clients et des chauffeurs VTC
indépendants, à Paris et en Île-de-France. Exploitée par Barbaros.

**Intermédiaire, pas transporteur.** Le transport est exécuté par le
chauffeur, sous sa licence, son assurance et sa carte professionnelle.
D'où la règle qui structure tout le produit : le **bon de réservation** ne
porte que l'identité d'Asmine, la **facture** porte le SIRET du chauffeur.

Barbaros a intégré un **groupe WhatsApp de plus de 800 chauffeurs** pour
placer les courses qu'il ne peut pas assurer lui-même.

## Modèle économique

- Le client paie **directement le chauffeur**, à bord, espèces ou carte.
  Aucun paiement en ligne, aucune donnée bancaire sur le site.
- `COMMISSION_APPORT` (haut d'`index.html`) n'est qu'un **affichage** sur
  l'annonce envoyée aux chauffeurs. **Le taux réel n'est pas arrêté** — ne
  rien construire dessus tant que Barbaros n'a pas tranché.
- Rien n'organise aujourd'hui le reversement de la commission : l'argent
  ne passe jamais par Asmine. C'est le point ouvert du modèle.
- **Il n'y a plus de codes promo** — supprimés en août 2026 à la demande de
  Barbaros. Les deux qui existaient (−10 % et −15 %) n'avaient ni date de fin,
  ni compteur, ni limite par client : le −15 % annulait exactement la hausse de
  tarifs, à vie, pour qui le connaissait. Ne pas en réintroduire sans durée de
  validité et limite d'usage — donc pas avant d'avoir un serveur.

## Tarification

Ela One 5,75 € + 1,75 €/km (4 pass.) · Ela First 11,50 € + 2,55 €/km (3) ·
Van 11,50 € + 2,90 €/km (7) · Van Premium 17,25 € + 4,05 €/km (6).
**Mise à disposition, tarif dégressif** (août 2026) : les 3 premières heures
au plein tarif, chaque heure au-delà au tarif de supplément, plus bas.
Ela One 60 €/h puis 45 · Ela First 80 puis 60 · Van 90 puis 70 ·
Van Premium 120 puis 100. `SEUIL_HORAIRE_H` vaut 3 pour les quatre gammes —
un seul repère à retenir, pour le client comme pour Barbaros au téléphone.
Le calcul est dans `prixHoraire()`. Sans `hourlyPlus` déclaré, on reste au
plein tarif : mieux vaut facturer trop cher qu'offrir des heures par accident.
+20 % nuit et week-end. TVA 10 % incluse.
Grille relevée de 15 % en août 2026, à la demande de Barbaros.
60 min d'attente offertes en aéroport, 30 min ailleurs.
**Barème d'annulation** (CGV art. 7, août 2026) : gratuit au-delà de 24 h,
30 % entre 24 h et 3 h, 50 % en deçà, 100 % si le client ne se présente pas.
Barbaros a retiré « Annulation gratuite » des promesses de l'accueil : le
barème l'a remplacé dans le contrat. Ne pas remettre l'argument en vitrine
sans qu'il le redemande, et ne pas descendre à zéro fenêtre gratuite — en
B2C, une clause d'annulation sans aucune tolérance est attaquable comme
clause abusive (L212-1 Code conso.).

**Le prix est ferme, arrêté à la réservation.** Le client l'accepte avant
de monter, le chauffeur l'encaisse tel quel, rien n'est recalculé à
l'arrivée — un VTC n'a pas le droit d'un taximètre. Départ **et** arrivée
sont donc obligatoires : sans les deux, pas de réservation.

**Il n'y a plus d'aller-retour ni de course à destination ouverte** —
supprimés à la demande de Barbaros.

**« ELA » est la marque, « Elatransfer » l'un de ses services** (août 2026).
La signature **« Private Driver & Paris Experiences »** est posée sous le titre
d'accueil (`.accroche-signature`), **en anglais dans les six langues** — une
signature de marque ne se traduit pas. Elle ne vend rien : c'est le titre
au-dessus qui vend, elle dit ce qu'est ELA à qui ne la connaît pas, et c'est
elle qui permettra demain de porter autre chose que du transfert sans que la
marque paraisse sortir de son rôle. Le nom de domaine reste `elatransfer.com`.

**Le rayon d'offres s'appelle « Explorez Paris avec ELA »** et compte six
cartes. Chacune porte une **promesse** (`promesseKey`, `.tour-promesse`) posée
entre le nom et le créneau : un client n'achète pas trois heures de voiture,
il achète une soirée à Paris. Les offres : **Paris Essentiel** (3 h, 180 €),
**Paris Illuminé** (2 h, 120 €), **Paris en Famille** (4 h, 225 € — sans gamme
imposée : une famille de trois tient dans une Ela One, lui vendre un van
d'office serait la faire payer pour du vide), **Ela Prestige** (4 h, premium,
300 €), **Escapade Versailles** (5 h, 270 €) et **Mise à Disposition**
(durée libre, 60 €/h).
**« Paris Iconique » a été écarté** : les monuments proposés étaient ceux de
Paris Essentiel à 80 % — deux cartes qui vendent la même chose divisent
l'attention au lieu de la doubler.

**Chaque offre porte PLUSIEURS photos** (`photos:[…]`, jamais `photo`) et la
fiche les fait défiler (`.fiche-carrousel`, `animerRubanFiche`) : un client
n'achète pas sur une image, il achète sur trois. La première sert de vignette
au rayon. Le ruban avance seul toutes les 4 s et **s'arrête définitivement au
premier geste** — un ruban qui bouge pendant qu'on regarde est une gêne, pas
une animation. La minuterie est unique et remise à zéro à chaque ouverture,
sinon deux fiches ouvertes coup sur coup en laissent deux qui tournent.

**Les photos du dépôt sont d'origine inconnue** (août 2026). Barbaros a
confirmé que celles qu'il envoie viennent de Google Images : elles ne peuvent
pas être publiées — contrefaçon, L335-2 CPI. Une a été installée puis retirée
par `git revert` le jour même. **Ne jamais installer une photo sans savoir
d'où elle vient.** Sources propres : Unsplash, Pexels, Pixabay. Piège
particulier : la tour Eiffel est libre de droits **de jour**, mais son
**éclairage nocturne est une œuvre protégée** — une photo de la tour illuminée
ne peut pas servir commercialement sans autorisation.

**Chaque offre a sa fiche** (`screen-tour`, `ouvrirFicheTour`) : photos, promesse,
durée, lieux suggérés, **le prix des quatre gammes**, ce qui est compris et ce
qui ne l'est pas. La carte du rayon **ouvre la fiche**, elle ne prépare plus le
formulaire — c'est le bouton de la fiche qui le fait.
- Le prix par gamme **sort de `prixHoraire`**, jamais d'une liste écrite à la
  main : un tableau recopié finirait par mentir le jour d'une hausse, et un
  prix VTC affiché qu'on ne tient pas n'est pas une maladresse, c'est une
  infraction.
- Ce qui n'y figure **jamais** : une note, un nombre d'avis, un billet d'entrée
  annoncé comme compris, et le mot « guide » sous toutes ses formes. Six
  contrôles de `test2.mjs` le verrouillent.
- « Non compris » se lit aussi clairement que « compris » : une mauvaise
  surprise à l'arrivée coûte plus cher qu'une vente manquée.

**Le bandeau de cookies recouvrait les boutons d'action.** Mesuré à 390 px : il
occupait 667–780 px, le bouton 674–726 — **entièrement caché**, sur la fiche
d'une offre comme sur l'écran des tarifs. Un client qui n'avait pas encore
répondu au bandeau ne pouvait pas continuer sa réservation. `mesurerBandeau()`
pose sa hauteur réelle dans `--h-bandeau`, et `.veh-action` s'en sert pour
remonter d'autant. À **remesurer** à l'affichage, à la fermeture, au dépliage
des détails, au changement de langue et au redimensionnement — sa hauteur
change à chaque fois.

**Ela Tours** (`TOURS`, `renderTours`, `prixDepartTour`, `choisirTour`) —
deux circuits posés sous le ruban de photos, jamais au-dessus du
formulaire : **Paris Tour**, 3 h, du lundi au vendredi 8 h – 20 h, et
**Paris Illuminé**, 2 h, tous les soirs à partir de 20 h. Les deux ouvrent
**4 arrêts au choix** ; les sept lieux affichés (Sacré-Cœur, Arc de
Triomphe, Champs-Élysées, Concorde, Trocadéro, Tour Eiffel, Notre-Dame) ne
sont que des **suggestions** — c'est sa journée, pas un parcours imposé, et
ça évite de promettre un itinéraire qu'un embouteillage rendrait faux.
- Ce n'est **pas un forfait** : un tour n'est qu'une mise à disposition
  nommée. Appuyer sur une carte bascule sur l'onglet « Mise à disposition »,
  règle la durée et emmène au champ de départ. Le prix sort de la même
  grille horaire, donc il reste ferme et connu avant le départ (règle VTC).
- Le « à partir de » (180 € le jour, 120 € le soir) est la **gamme la moins
  chère au tarif de jour**. On n'applique pas la majoration de nuit à la
  carte du soir : `isNightOrWeekend` démarre à **21 h** alors que le créneau
  ouvre à 20 h — un départ à 20 h paie donc bien le tarif de jour. Le prix
  affiché est le plancher réel et il monte tout seul après 21 h ou le
  week-end. **Si Barbaros veut que tout le créneau du soir soit majoré, il
  faut descendre le seuil de 21 h à 20 h — c'est sa décision, pas la nôtre.**
- Le créneau lundi–vendredi est **affiché, pas imposé** : la mise à
  disposition reste réservable tous les jours et le prix se recalcule seul.
- Les cartes sont fabriquées en JavaScript, sans `data-i18n` :
  `applyLanguage()` doit rappeler `renderTours()`, sinon un visiteur qui
  passe à l'espagnol garde des créneaux en français. Les neuf clés
  (`tours_*`, `tour_jour*`, `tour_nuit*`) existent dans les six langues.
- **Deux autres formules, sans arrêts** (août 2026, inspirées de la mise en
  page GetYourGuide, sans en reprendre les avis ni le mot « guide ») :
  **Ela Prestige** (4 h, gamme `premium` seulement — Ela First ou Van
  Premium, à partir de 300 €) pour une soirée ou une occasion à marquer, et
  **Escapade Versailles** (5 h, toutes gammes, à partir de 270 €) où le
  chauffeur attend sur place. Elles n'ont ni `arrets` ni `suggestions` :
  `detailKey` remplace la ligne « N arrêts » sur la photo, `usageKey`
  remplace la ligne des suggestions — voir `renderTours()`. `prixDepartTour`
  filtre `VEHICLES` sur `tour.gamme` avant de prendre le moins cher.
  Ne jamais écrire qu'un billet d'entrée est inclus (château, musée) :
  Asmine ne vend que le chauffeur et le véhicule.

**La marque s'écrit « Asmine »**, jamais « As-mine » ni « as.mine ».
Seule exception : l'adresse du dépôt `github.io/As-mine/`, qu'on ne peut
pas changer sans casser tous les liens déjà envoyés.

**Référence de course : `ASM-AA-MM-NNNN`** (`referenceSuivante`), le rang
repart à 1 chaque mois. Le numéro de FACTURE reste séparé et propre à
chaque chauffeur — la loi lui interdit trous et doublons.

**Le mode exploitant suit l'ADRESSE, pas l'appareil.** Sans
`?exploitant=1`, on est côté client — même sur le téléphone déverrouillé.
Sinon Barbaros ne peut plus voir son propre site public ; l'erreur a déjà
été faite. Le lien `?a=` vise `admin.html`.

**Deux espaces distincts, un seul fichier.** Client : `.../As-mine/`.
Exploitant : `.../As-mine/admin.html` (redirection vers `?exploitant=1`,
transmet les paramètres). En mode exploitant : liseré doré, badge, onglet
« Créer », bouton « Quitter », et tout le décor client masqué. Ne jamais
dupliquer `index.html` pour créer un second site : il divergerait.

**L'espace exploitant est en français uniquement** — le sélecteur de langue
y est masqué et la page force `fr`. Les six langues restent au client. Les
suites de tests ne doivent donc plus régler `#langSelect` sur une page
exploitant.

**La page « Créer »** tient « Coller une demande » puis le formulaire de
création rapide (nom, deux adresses, date, véhicule, prix, chauffeur
facultatif → course `confirmee` d'entrée). La liste « Mes réservations » et
son titre ne s'affichent plus côté exploitant — c'était un écran de client
sur un outil de travail.

**La page « Registre »** tient les trois indicateurs « Cette semaine » avec
la semaine précédente en rappel, le tableau des chauffeurs, le résultat par
**semaine / mois / année**, la **recherche libre** dans tout le registre, et
la sauvegarde (JSON + restauration additive + export CSV). **Les tableaux ne
comptent que les courses `realisee`** : une course confirmée n'est pas une
course faite.

**Coller une demande** (`lireDemandeCollee`) relit le message WhatsApp du
client. Il ne devine rien à partir des libellés — un client espagnol écrit
« Salida » — il lit la structure : `ASM-AA-MM-NNNN`, `JJ/MM/AAAA HH:MM`, les
deux premières lignes « … : … », la ligne à points médians, la dernière
ligne « nom — téléphone », le dernier montant en euros. **Ne jamais changer
la forme du message client sans adapter ce lecteur**, et inversement.

**Le registre ne vit que dans le navigateur.** `saveBooking` en garde 1000 (et
non 10 comme au début, qui effaçait trois jours de travail). Le dire à
Barbaros : sauvegarder chaque semaine tant qu'il n'y a pas de serveur.

**Le cycle d'une demande** : le message WhatsApp du client ne porte **plus
aucun lien** — six lignes lisibles, rien d'autre → l'exploitant le copie et
appuie sur **« Coller une demande reçue »**, en haut du tableau de bord : la
course entre **en attente**, en or → il saisit le chauffeur, lui envoie la
course **en toutes lettres** → il confirme (`?ok=`) ou refuse (`?no=`) au
client, qui ouvre le lien et voit son bon passer au vert ou au rouge.
La page Créer garde le même lecteur avec le formulaire complet, pour saisir
aussi le chauffeur au passage.

**Une demande venue d'un client entre TOUJOURS en `attente`.** Il attend une
réponse : la lui donner comme déjà confirmée serait mentir sur l'état réel.
Seule une course que l'exploitant saisit lui-même de zéro — un hôtel vient
d'appeler — est `confirmee` d'entrée. Ne pas confondre les deux chemins.

**Rien ne peut voyager tout seul d'un téléphone à l'autre sans serveur.**
Ni notification, ni synchronisation. Le presse-papiers est le transport :
`navigator.clipboard.readText()` sur un geste de l'utilisateur, et repli sur
le champ de saisie si le navigateur refuse. Le dire clairement à Barbaros
plutôt que de laisser croire à une arrivée automatique.

**Plus rien ne fabrique de lien `?a=` ni `?c=`.** Les lecteurs restent en
place pour que les liens déjà partis dans WhatsApp continuent de s'ouvrir,
mais l'écran chauffeur n'est plus alimenté : le chauffeur n'a rien à
cliquer, il lit son message et il y va. Ne pas les recréer sans demande
explicite de Barbaros.

**Le tableau de bord se lit d'un coup d'œil.** Une demande pas encore
tranchée est en **rouge plein, texte clair, qui respire** — c'est la seule
ligne de tout le site qui prend cette couleur, et elle ne veut dire qu'une
chose : quelqu'un attend une réponse. Le compteur « En attente » s'allume en
rouge avec elle. Une course confirmée mais pas encore faite est seulement
**cerclée d'or** : elle reste à assurer, mais elle n'attend plus personne.
Les réalisées et les refus retombent en gris. Trois degrés, un seul qui crie :
si tout criait pareil, plus rien ne crierait. **Ne jamais remettre l'attente
en or** — essayé, refusé. Chaque ligne porte **depuis combien de temps** le bon est là (rouge
au-delà d'une heure sur une demande non tranchée) et un bouton **Appeler**.
Les prochains départs passent devant les courses passées.

**Le code QR n'existe plus côté exploitant** : l'onglet **Registre** a pris
sa place (indicateurs de la semaine, chauffeurs, résultat par semaine / mois
/ année, recherche libre, sauvegarde). La page **Créer** ne garde que la
saisie.

**Les messages WhatsApp doivent rester courts** — Barbaros les lit sur un
téléphone, la nuit. Demande du client : 6 lignes. Annonce au groupe : 8.
Fin de course : 1. Ne jamais y recopier ce que le lien contient déjà.

**Clore une course est le geste le plus fréquent** : c'est lui qui la fait
entrer au registre et alimente les chiffres. Deux chemins, tous deux à
garder : un bouton vert **« Terminée »** sur la ligne du tableau de bord
(un appui, sans ouvrir le bon — le geste du soir, fait à la chaîne), et
**« Marquer comme réalisée »** sur le bon, en vert plein lui aussi. Il était
gris à côté d'un « Refuser » rouge : l'action la plus courante était la moins
visible. Ne pas le regriser.

**L'écran chauffeur n'envoie AUCUN message automatique.** Barbaros attribue
la course lui-même (champ libre nom + téléphone sur le bon) : il sait déjà
qui roule. Les étapes ne servent qu'au chauffeur. Il clôt lui-même par
« Marquer comme réalisée ».

**L'annonce au groupe ne porte JAMAIS le lien de course.** 350 caractères
illisibles pour 800 personnes qui n'en ont pas l'usage. Le lien `?c=` part
en privé, au seul chauffeur retenu, depuis le bon. Les messages au client
partent droit sur son numéro (`numeroWhatsApp`), jamais via le sélecteur.

**Le mode exploitant est protégé par le code `Ela1234`** (`CODE_EXPLOITANT`, stocké
en empreinte, jamais en clair — le dépôt est public). Diffusion au groupe,
confirmation à distance, attribution du chauffeur et export du registre
sont derrière. C'est une serrure, pas un coffre : le dire à Barbaros
plutôt que de laisser croire à une vraie sécurité.

**Confirmer une course du client** se fait sur son bon : chauffeur retenu →
« Confirmer la course » → « Prévenir le client », qui envoie le lien `?ok=`.
Le bloc « Confirmer une course à distance » a été **supprimé** — recopier une
référence à la main pour reconstruire une course qu'on n'a pas ne servait à
personne, et depuis « Coller une demande » la course est toujours là. Ne pas
le réintroduire.

**Délai de 3 h (`DELAI_RESERVATION_H`).** Une course pour dans moins de
3 h est acceptée mais **pas ferme** : avertissement rouge sur l'écran de
confirmation et sur le bon, bouton d'appel et message WhatsApp prérempli
avec la référence. Ne jamais bloquer le client : le prévenir.

**Le nombre de passagers n'écarte que les véhicules trop petits.** Les
quatre catégories restent proposées à un client seul — il a le droit de
vouloir un van, et c'est une course plus chère. Pas d'option « peu
importe » pour autant : il choisit, ou rien n'est réservé.

**Quatre gammes, et des silhouettes dessinées.** Août 2026, à la demande de
Barbaros, après quatre refus successifs des illustrations de voiture : il
les veut, façon Uber. Les gammes sont **Ela One** (4 places), **Ela First**
(3), **Van** (7), **Van Premium** (6).
- Les **clés techniques ne changent jamais** (`berline`, `berline_vip`,
  `van`, `van_vip`) même quand le nom commercial change : elles sont écrites
  dans les courses déjà enregistrées sur l'appareil, et une clé renommée
  rendrait illisible le véhicule de tout l'historique.
- Un nom de gamme est une marque : **il ne se traduit pas**, il est
  identique dans les six langues, comme « UberX » l'est partout.
- Les anciens noms (`anciensNoms` : « Berline », « Sedán », « 商务车 »…)
  restent reconnus par `vehiculeDepuisNom()`. Barbaros a des mois de
  messages WhatsApp qui les portent, et « Coller une demande » doit
  continuer à les relire. **Renommer une gamme sans ajouter l'ancien nom
  aux alias rend muet tout l'historique.**
- Les silhouettes (`SILHOUETTES`) sont deux SVG dessinés dans la page —
  berline et van, de profil, **sans calandre ni logo**. Aucune marque n'est
  reconnaissable, et c'est voulu : dessiner une Classe E serait une promesse
  qu'on ne tient pas si une autre voiture se présente. La gamme haute se
  distingue par la **couleur** de la silhouette (marine contre gris-bleu),
  jamais par un modèle inventé.
- Les **emojis de voiture restent bannis** : ils changent de dessin d'un
  téléphone à l'autre et grossissent mal. Deux tests le vérifient.
- Piste encore ouverte : de vraies photos des véhicules, fournies par
  Barbaros, qui remplaceraient les silhouettes.

**L'écran des véhicules se lit comme une application de course** : la carte
en haut sur toute la largeur, la liste qui remonte par-dessus dans une
feuille à coins arrondis (`.veh-feuille`, marge négative de 22 px), et le
bouton d'action collé au-dessus de la barre de navigation (`.veh-action`,
`position:sticky`). Chaque ligne porte la pastille des places, le nom,
« N passagers · heure d'arrivée · durée », et le prix à droite. Le bouton
se nomme — « Continuer · Berline » — parce qu'on ne confirme pas dans le
vide. Trois pièges :
- Si la carte ne s'affiche pas (Leaflet injoignable, client hors ligne), la
  règle `#tripMap.hidden + .veh-feuille` remet une mise en page ordinaire.
  Sans elle, il reste un coin arrondi et une poignée dans le vide.
- Le cadrage réserve **54 px en bas** (`paddingBottomRight`) : la feuille
  mord sur la carte, et sans cette marge le repère d'arrivée se cache
  dessous.
- Les tuiles OpenStreetMap sont désaturées en CSS. La couleur doit rester
  au tracé et aux repères, pas aux enseignes de magasins.

**La pastille WhatsApp ne s'affiche QUE sur l'accueil.** Elle ne regardait
que le défilement : sur l'écran des véhicules, qui tient dans une page, elle
se posait pile sur « Continuer ». C'est le défaut déjà écrit pour « Voir les
tarifs », qui valait en fait pour tous les boutons d'action. `showScreen`
appelle `window.__jugerPastilleWa()` à chaque changement d'écran — sans ça
elle restait visible une seconde de trop, le temps que la minuterie repasse.

**Les suites visent les rôles, pas les balises.** Trois tests cherchaient le
prix par `.veh-card p.font-mono` : changer le `<p>` en `<span>` les a fait
tomber alors que rien n'était cassé. Viser `.veh-prix`, `.veh-nom`,
`.veh-detail` — des classes qui disent ce que l'élément est.

**Il n'y a plus de forfait aéroport** — supprimés à la demande de Barbaros.
Les terminaux restent proposés comme adresses.

**L'or ne sert plus qu'à la marque.** Août 2026, à la demande de Barbaros :
la couleur d'accent du site est le **vert** (`--gold`, `--gold-soft`,
`--gold-dim` — des rôles, pas des couleurs, qui portent aujourd'hui du vert),
et l'or ne subsiste que dans le logo — le filet de la pastille et le
`TRANSFER` de l'enseigne, via `--or-marque` et `--or-marque-nom`. Ne pas
reprendre `--gold` pour habiller le logo : c'est ce qui l'a fait virer au
vert une première fois. Et `--gold-dim` reste un ton **pâle** : il ne sert
qu'à des filets posés sur de l'ivoire, le passer en foncé noircit des
bordures qui doivent rester discrètes.

**Le titre d'accueil ne se pose JAMAIS sur la photo.** Il y était, en vert,
sur un ruban de six vues qui change toutes les six secondes : lisible sur la
Joconde, invisible sur les Champs illuminés. Aucun réglage de voile ne
rattrape ça — une image qui change ne peut pas garantir un contraste. Ne pas
l'y remettre. L'accroche courte au-dessus (`tagline`) tient dans une
pastille : la garder **courte**, sinon elle passe à la ligne — deux mots, un
point médian, pas une phrase.

**L'accueil ne pose qu'une question : d'où à où, et quand.** Août 2026, à la
demande de Barbaros — « fait comme Uber ». Le formulaire d'accueil ne porte
plus que les deux adresses, la date et l'heure. Ce qui en est parti :
- **Les deux onglets** « Trajet simple / Mise à disposition ». Les boutons
  `#tabSimple` et `#tabDisposal` restent dans la page, **masqués** : ils
  portent l'état ARIA et `selectTripTab()` s'appuie dessus. Ne pas les
  supprimer sans réécrire cette fonction.
- **Le nombre de passagers et la gamme.** Ils sont passés sur l'écran des
  prix (`#paxVehicles`, au-dessus de la liste) : on ne fait pas choisir une
  gamme à quelqu'un qui n'en connaît pas encore le prix. Changer le nombre
  redessine la liste tout de suite et **efface un choix devenu impossible**
  — sinon on continuerait avec une berline pour six.
- **La mise à disposition**, devenue une **offre**, cinquième carte du rayon
  Ela Tours (`cle:"disposition"`). Elle n'a pas de durée fixée — `heures:null`
  et `parHeure:true` font afficher « à partir de 60 €/h » au lieu d'un total
  qu'on ne peut pas connaître. `choisirTour()` ne touche alors pas au curseur.
  Le formulaire qu'elle ouvre porte **`#btnRetourSimple`**, seul chemin de
  retour depuis que les onglets ont disparu : sans lui, le client qui a appuyé
  par curiosité est enfermé.

**Pas de raccourcis de destination sur l'accueil.** Essayés en août 2026
(CDG · Orly · Gare du Nord, sous le champ d'arrivée), **retirés à la demande
de Barbaros** le jour même. Ne pas les réintroduire sans qu'il le redemande.

**Le site s'ouvre dans la langue du visiteur** (`langueDuNavigateur()`, août
2026, à la demande de Barbaros) : un client espagnol qui tombe sur du français
ne cherche pas le sélecteur, il retourne à sa liste de résultats. Trois règles,
dans cet ordre : le **choix explicite** du visiteur (mémorisé) l'emporte
toujours ; sinon `navigator.languages` (on ne lit que la partie avant le tiret,
« es-MX » et « es-ES » sont tous deux de l'espagnol) ; sinon l'**anglais** —
et non le français : un Allemand, un Italien, un Japonais qui arrivent ici
lisent bien plus probablement l'anglais. Le français reste servi à qui le
demande, il est reconnu comme les cinq autres.
**Conséquence à ne pas manquer : le bloc de référencement (`#seoContent`) est
désormais TRADUIT et n'est plus masqué selon la langue.** Il était en français
et caché ailleurs ; avec le repli anglais, l'explorateur de Google — qui
s'annonce en anglais — ne le voyait plus du tout, et le référencement local
français partait avec. Du texte présent mais caché aux visiteurs est de toute
façon ce que Google sanctionne. Ne pas remettre de masquage par langue.
L'espace exploitant reste en français quoi qu'il arrive. **La détection ne
s'écrit PAS dans `localStorage`** : ce n'est pas un choix du visiteur, et
l'y inscrire figerait la langue du premier chargement.
Conséquence pour les tests : **une suite qui vérifie des libellés français doit
fixer `locale: 'fr-FR'`** à la création du contexte, sinon elle lit de l'anglais
et échoue sur des formats de nombres (`18.49 €` contre `18,49 €`).

**L'écran « Infos » (`screen-qr`) est le pied de page du site.** Il porte les
quatre documents légaux et les moyens de nous joindre. Le **code QR** n'y
apparaît qu'en **mode exploitant** (`#blocQr`) : il sert à imprimer l'affiche
d'un comptoir d'hôtel, c'est un outil de travail, et un client qui cherche les
CGV n'a que faire d'un QR du site où il se trouve déjà. **Ne jamais déplacer
les documents légaux derrière le mode exploitant** — la LCEN impose qu'ils
restent accessibles. L'onglet `screen-bookings` non plus ne se masque pas côté
exploitant : c'est son tableau de bord, celui qui porte « Coller une demande » ;
seul son libellé bascule en « Créer ».

**Le bouton « Voir les tarifs » s'efface sous une liste d'adresses ouverte**
(`jugerBoutonRecherche()`, classe `.efface` = `visibility:hidden`). Mesuré à
390 px : depuis que le formulaire tient dans un écran, la liste descend à
598 px et le bouton occupe 528–580 — le client qui visait le bouton appuyait
sur une rue. On garde sa place (`visibility`, pas `display`) pour que la page
ne sursaute pas. Deux tests le verrouillent.

**L'accueil se lit dans cet ordre : bandeau marine, formulaire, photos.**
Le titre est posé sur un aplat marine plein (`.accroche`), en ivoire, avec
le filet doré de la marque qui sort du cadre en bas à gauche — la seule idée
du logo, à l'échelle de la page, et le seul or admis hors de l'enseigne. Le
contraste y est acquis une fois pour toutes.
Le ruban de photos est passé **sous le formulaire** : en haut il occupait la
place du premier champ, et il servait de fond à un titre qu'il rendait
illisible. Plus bas il ne porte plus rien, il reprend de la hauteur (186 px
au lieu de 132), et le client qui veut réserver n'a plus à le franchir. Le
formulaire entier — bouton « Voir les tarifs » compris — tient désormais
dans le premier écran d'un téléphone. Ne pas le remonter.
Sa marge basse de 20 px n'est pas cosmétique : la section « À l'arrivée de
votre vol » qui suit est elle aussi sur fond marine, et sans cet intervalle
les deux masses sombres se collent.

**Le serveur existe, en dormant.** `SUPABASE_URL` et `SUPABASE_CLE` (haut du
script) sont vides : le site se comporte alors exactement comme avant — le
client envoie lui-même son récapitulatif, l'exploitant le recolle. Dès
qu'elles sont remplies (marche à suivre dans `SUPABASE.md`), le client
appuie sur « Confirmer » et c'est fini pour lui : la demande arrive dans le
tableau de bord, sur n'importe quel appareil.
- Le module `nuage` fait tout : `deposer`, `connexion`, `lister`,
  `majStatut`. Aucune bibliothèque chargée — de simples appels REST.
- `afficherEtatEnvoi(true | false | null)` décide de ce que voit le client.
  **`null` n'affiche NI l'un NI l'autre**, et c'est important : le féliciter
  avant que le dépôt ait répondu lui ferait fermer la page sur une course
  qui n'existe pas.
- **Le repli est sacré.** Si le dépôt échoue, les trois boutons d'envoi
  reviennent. Ne jamais les retirer sans que le serveur soit là : un bouton
  « Confirmer » qui ne confirme rien, c'est un client qui attend un
  chauffeur à 5 h du matin pendant que personne ne sait rien.
- **Sans serveur, WhatsApp s'ouvre AVANT tout appel réseau**, dans le même
  geste que le clic. `window.open()` après un `await` est bloqué par Safari
  iOS. Ne pas rendre `finalizeBooking` asynchrone sur ce chemin.
- **La clé `anon` est publique et ne protège RIEN.** Ce qui protège les
  clients, c'est la Row Level Security posée dans Supabase : dépôt autorisé
  au visiteur anonyme, **lecture jamais**. Ajouter une policy de lecture
  pour `anon` exposerait les noms, téléphones et adresses de tous les
  clients — RGPD. Ne jamais coller la clé `service_role` dans la page :
  elle contourne toutes les règles.
- `fusionnerCourses()` AJOUTE et n'écrase jamais : une course déjà sur
  l'appareil peut avoir avancé depuis (chauffeur attribué, course réalisée).
- `test9.mjs` couvre les deux chemins, en réécrivant la page au vol pour y
  poser de faux identifiants. Il vérifie aussi que la page ne prétend jamais
  avoir lu quoi que ce soit sans jeton.

**Les services extérieurs sont le point faible du site.** La carte et le
prix dépendent de deux serveurs qui ne nous appartiennent pas :
- `router.project-osrm.org` calcule l'itinéraire. C'est un serveur de
  **démonstration** : aucun engagement, débit limité, usage commercial
  déconseillé par ses auteurs. Quand il refuse, le prix retombe sur la
  distance à vol d'oiseau × 1,3 et la course est marquée « ≈ ». **Ce n'est
  pas un détail de confort : ça change le prix payé.** Sur un Roissy →
  Paris l'écart se compte en euros.
- `tile.openstreetmap.org` dessine le fond de plan. La politique de la
  fondation **interdit l'usage commercial soutenu** ; le site peut être
  coupé sans préavis.

`CLE_MAPBOX` (haut du script) répond aux deux d'un coup : dès qu'une clé y
est posée, la carte et les itinéraires passent par Mapbox, qui a un
engagement de service. Le palier gratuit (50 000 cartes et 100 000
itinéraires par mois) est très au-dessus du volume d'Asmine. Sans clé, le
site fonctionne exactement comme avant — la bascule est une ligne.
La clé Mapbox est **publique par construction** (elle part dans la page,
et le dépôt l'est aussi) : la restreindre au domaine `elatransfer.com`
depuis le tableau de bord Mapbox, sinon n'importe qui consomme le quota.

**Il n'existe AUCUNE API publique Uber** pour les prix en direct ni la
position des chauffeurs. L'API publique a été fermée il y a des années ;
ce qui reste (Uber Direct, Uber for Business) sert à la livraison et aux
comptes entreprise. Aspirer leur application violerait leurs conditions,
casserait à chaque mise à jour de leur côté, et ferait dépendre le prix
d'Asmine d'un concurrent. Ne pas le proposer. **Afficher un prix indexé
sur un tarif variable est en plus incompatible avec la règle VTC** : le
prix doit être ferme et connu avant le départ.

## Règles à ne jamais enfreindre

1. **Aucun faux avis client.** `AVIS` ne contient que des avis réellement
   reçus. Faux avis = pratique commerciale trompeuse (L132-2 Code conso. :
   2 ans, 300 000 €, portés à 10 % du CA). Ne pas non plus n'afficher que
   les bons avis : c'est la même infraction.
2. **L'annonce diffusée au groupe ne contient jamais** le nom, le
   téléphone ni le numéro de chambre du client. Diffuser ça à 800
   personnes serait une transmission de données personnelles à des tiers
   non nécessaires (RGPD 5.1.c). Ces éléments partent en privé, au seul
   chauffeur retenu.
3. **Le dépôt est public.** Jamais de données clients réelles dedans. Le
   classeur `suivi-as-mine.xlsx` n'est committé que vide.
4. **Un VTC n'a pas le droit d'avoir un taximètre.** Le prix doit être
   connu ou calculable **avant** le départ. Une course à destination
   ouverte doit donc annoncer la **grille** (« 5,75 € + 1,75 €/km ») et non
   « prix à définir ».
5. **En confiant des courses à des tiers, Asmine est une centrale de
   réservation** (Code des transports L3142-1 et s.) : obligation de
   pouvoir prouver que chaque chauffeur a carte professionnelle,
   inscription au registre VTC et assurance.

## Conseils déjà donnés — les tenir pour acquis

- **Ne pas diffuser à 800 inconnus par défaut.** Deux cercles : un noyau
  de 5 à 10 chauffeurs vérifiés qui reçoit la course en premier, et le
  grand groupe en réservoir si personne ne prend.
- **Piste commerciale : les hôtels de la zone CDG.** Le numéro de chambre
  existe pour eux. Coût zéro, testable en une semaine. *easyHotel n'est
  pas un partenaire* — c'était un cas de test de recherche d'adresse.
- **Ne pas promettre une marque précise** (« Mercedes Classe E ») : si un
  autre véhicule se présente, c'est trompeur. Dire « berline » ou, à la
  rigueur, « type … ou similaire ».
- Ne pas proposer d'illustrations **ni d'emojis** de voitures : essayé
  quatre fois, refusé quatre fois. Ne plus en reparler sans photos réelles.

## Ce qui est décidé, ce qui ne l'est pas

**Décidé** : intermédiaire ; paiement au chauffeur ; pas de forfait
aéroport ; pas d'aller-retour ; pas de destination ouverte ; prix ferme à
la réservation ; les quatre véhicules proposés dès lors qu'ils sont assez
grands ; français par défaut avec 5 autres langues au sélecteur ; mode
exploitant via `?exploitant=1` ; diffusion anonymisée.

**Pas décidé** : taux de commission réel · statut juridique et SIRET de
Barbaros · s'il est lui-même chauffeur · volume visé · clientèle cible
(particuliers / hôtels / entreprises) · budget · règle du temps d'attente.

## Feuille de route convenue

Sans serveur (gratuit, fait) : lien de course et écran chauffeur
(accepter / sur place / démarrer / terminer / renvoyer la confirmation),
le tout par lien et WhatsApp.

Avec serveur (quand Barbaros paiera) : comptes chauffeurs par SMS, page
admin, premier qui accepte prend la course, suivi en direct, tableau de
bord chauffeur avec commission due et **blocage automatique au-delà d'un
seuil**, dates d'expiration des papiers avec alerte, avis clients, export
comptable, gestion des désistements et des clients absents.

## Tests

Neuf suites Playwright à la racine, à relancer après **toute**
modification :

```bash
npx http-server -p 8099 -s .
node test.mjs && node test2.mjs && node test3.mjs \
  && node test4.mjs && node test5.mjs \
  && node test6.mjs && node test7.mjs && node test8.mjs \
  && node test9.mjs
```

Playwright n'est pas installé dans le dépôt : lier le paquet global une
fois par session avec
`mkdir -p node_modules && ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright`
(`node_modules/` est ignoré par git).

**Les suites tournent hors ligne** (`test-hors-ligne.mjs`). Tout ce qui
n'est pas le serveur local échoue immédiatement au lieu de faire attendre
le navigateur trente secondes par appel. Sans ça, l'ensemble dépassait dix
minutes et finissait en délai sans rien vérifier ; avec, il tourne en six
minutes et vérifie au passage que le site reste utilisable quand ses
dépendances extérieures tombent — le cas réel d'un client dans un parking
d'aéroport. Ne pas retirer ce coupe-circuit pour « tester en conditions
réelles » : un test qui dépend d'Internet ne prouve rien.

Trois pièges déjà rencontrés quand une suite échoue :
- **le numéro de chambre.** Un départ dans un hôtel est refusé sans lui.
  Une suite qui réserve depuis l'Ibis doit remplir `#roomPickup`.
- **quatre gammes, pas deux.** Ela One, Ela First, Van, Van Premium — les
  versions haut de gamme sont revenues en août 2026. Une suite qui compte
  les véhicules doit tenir compte des places : à 4 passagers, Ela First
  (3 places) sort et il en reste trois ; à 5 ou 6, seuls les deux vans.
- **l'écran de confirmation n'a plus de repli `<details>`.** Les trois
  moyens d'envoi sont visibles d'emblée, et c'est voulu : tant que le
  client n'a pas appuyé, la demande n'est arrivée nulle part.

## Le logo

Le signe court est « **ELA** » gravé en ivoire sur marine, souligné d'un
filet doré **qui sort du cadre à droite** — la route ne s'arrête pas au
bord. C'est la seule idée du logo, et elle survit à 24 px. Le nom complet
« ELA**TRANSFER** » et la ligne « Paris · Roissy CDG · Orly » s'écrivent à
côté ; le signe seul ne sert que là où il n'y a pas la place d'écrire
(onglet, écran d'accueil, photo de profil).

Les fichiers `icon.svg`, `icon-maskable.svg` et `icon-180.png` sont
**fabriqués**, pas dessinés à la main : les lettres sont les contours réels
d'Inter convertis en formes, pour que le logo ne dépende d'aucune police.
Le script de fabrication vit hors du dépôt ; en cas de reprise, refaire les
lettres avec `fontTools` plutôt que de les redessiner en rectangles —
essayé, le A était raté et ça se voyait.

Deux pièges : **un commentaire XML ne supporte pas deux tirets à la
suite** (une ligne de séparation en tirets a déjà rendu `icon.svg`
illisible, l'icône disparaissait partout sans le moindre message), et
**iOS ignore un `apple-touch-icon` en SVG** — d'où le PNG de 180 px.

Refusé : le E seul (« c'est moche »), et toute voiture, roue ou route
dessinée.
