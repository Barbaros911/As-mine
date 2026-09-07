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

## Comment le site est construit et hébergé

**`construire.sh` est la SEULE recette.** Il assemble le dossier `site/` à
partir du dépôt, et il est appelé par GitHub Actions **et** par Cloudflare
Pages. Ne jamais recopier ses étapes dans un workflow : deux recettes
finissent toujours par diverger, et on s'en aperçoit le jour où l'une publie
un fichier que l'autre a oublié. La liste des fichiers copiés y est
**explicite** — un `cp *` publierait un jour les suites de tests ou le
classeur de suivi. `site/` est ignoré par git : il se reconstruit.

**Bascule vers Cloudflare Pages** (septembre 2026, décidée après une panne de
GitHub : les visiteurs voyaient la licorne rose de GitHub pendant que le site
était intact). Marche à suivre complète dans `CLOUDFLARE.md`.
- Réglages Cloudflare : branche `main`, commande `sh construire.sh`, dossier
  de sortie `site`.
- **`_headers` ne sert QUE sur Cloudflare.** GitHub Pages ne sait pas définir
  d'en-têtes HTTP — c'est pour ça que `frame-ancestors` ne pouvait pas être
  appliqué : les navigateurs l'ignorent dans une balise `<meta>`.
- **Le danger de la bascule n'est pas le site, c'est l'EMAIL.**
  `contact@elatransfer.com` reçoit du vrai courrier — confirmé par Barbaros.
  **On branche donc le domaine par un simple CNAME chez son hébergeur DNS
  actuel** (voie A), sans déplacer les serveurs de noms : les MX ne sont
  jamais touchés, l'email ne peut pas casser. Ne PAS proposer la voie
  « nameservers chez Cloudflare » par confort : ce qui casse alors n'est pas
  le MX lui-même mais ce qui l'accompagne — SPF, DKIM, DMARC, autodiscover —
  et le courrier part en indésirable sans message d'erreur.
- **Le domaine racine est le point à trancher** : il ne peut pas porter un
  CNAME. Si l'hébergeur DNS propose `ALIAS`/`ANAME`, tout reste identique ;
  sinon il faut rediriger la racine vers `www`, et alors **changer l'adresse
  canonique et `sitemap.xml`**, qui déclarent `https://elatransfer.com/`.
- Vérifier sur l'adresse temporaire `*.pages.dev` avant de toucher au
  domaine, et garder GitHub Pages actif quelques jours : c'est la porte de
  sortie si quelque chose tourne mal.
- **Cloudflare tombe aussi.** Plus rarement et moins longtemps, mais aucun
  hébergeur ne garantit 100 %. Ne pas le vendre comme une immunité.

**NE JAMAIS CHANGER UN RÉGLAGE PAR DÉFAUT QU'ON NE PEUT PAS ÉPROUVER.**
Règle posée le 4 septembre 2026, après une erreur. `html_handling` avait été
mis à `"none"` pour que `/admin.html` garde son extension — une intuition,
invérifiable depuis cette machine, qui n'a aucun accès réseau vers Cloudflare.
`"none"` ne sert que les chemins **exacts** et supprime du même coup la
résolution des **dossiers** : `/demos/` affichait le site de réservation à la
place de la galerie, et la racine `/` ne fonctionnait que par le repli
« adresse inconnue ». Barbaros l'a vu au premier essai.
Le défaut (`auto-trailing-slash`) était correct. **Quand on ne peut pas
tester, on garde le défaut** et on ne le change que sur un symptôme constaté.

**LES TROIS ADRESSES À ÉPROUVER APRÈS CHAQUE DÉPLOIEMENT CLOUDFLARE** — elles
couvrent les trois mécanismes de service, et c'est la seule façon de voir une
erreur de configuration depuis l'extérieur :
| Adresse | Ce qu'elle éprouve | Attendu |
|---|---|---|
| `/` | la racine | le site de réservation |
| `/admin.html` | un fichier exact | demande le code |
| `/demos/` | **un dossier** | la galerie des trois sites vitrines |
Si `/demos/` affiche le site de réservation, c'est `html_handling` qui est en
cause — pas la galerie.

## Git et publication

**Rien ne part sans que Barbaros l'ait vu.** Règle posée en août 2026, après
deux fusions passées en ligne avant qu'il ait pu regarder. L'ordre est
toujours le même : faire le travail, **montrer** (capture d'écran, pas une
description), **attendre son accord**, et seulement ensuite pousser. Cela
vaut aussi pour ce qui est « visible par un client » : c'est justement ce
qui mérite d'être vu avant, pas après. Ne jamais lire l'urgence d'un lien à
envoyer comme une autorisation de fusionner.

**LA BRANCHE `claude/as-mine-booking-app-yqvxoi` EST UN VESTIGE — NE PAS LA
FUSIONNER** (septembre 2026). Cette note disait qu'elle portait des commits
d'avance à intégrer plus tard, et qu'il fallait le rappeler à chaque
réponse. C'était vrai en août ; ça ne l'est plus, et la note a été répétée
des dizaines de fois pour rien. Le travail qu'elle portait — accueil en
bandeau marine, écran des véhicules, quatre gammes, retrait des packs — est
**déjà dans `main`**, arrivé par d'autres pull requests.
`git log main..branche` montre encore deux commits et trompe : c'est
`git diff main branche` qu'il faut lire. La branche a divergé **avant** tout
le nouveau site, et la fusionner **supprimerait** `nouveau.html`, les quatre
photos, les onze suites de tests et les corrections de `construire.sh`.
Vérifier avant de croire une note de ce fichier : ici, `git show
main:index.html | grep -c TOURS` rend 0 — les packs ne sont plus là.

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

**IL N'Y A PLUS DE PACKS** (septembre 2026, à la demande de Barbaros :
« Enleve tout les packs »). Le rayon « Explorez Paris avec ELA » et ses six
offres — Paris Essentiel, Paris Illuminé, Paris en Famille, Paris Vision,
Ela Prestige et la Mise à Disposition — ont été retirés en entier, avec les
fiches, l'écran `screen-tour`, le carrousel de photos, les teintes et le
chargement à l'approche. Ce qui a disparu du code : `TOURS`, `renderTours`,
`prixDepartTour`, `ouvrirFicheTour`, `animerRubanFiche`, `chargerFondsVisibles`,
`choisirTour`, tout le CSS `.tours*` / `.tour-*` / `.fiche-*` / `.teinte-*`, et
la branche du rayon dans le jugement de la pastille WhatsApp.
- **LA MISE À DISPOSITION EST PARTIE AUSSI** (septembre 2026, quelques heures
  après les packs : « oui »). Le site ne vend plus qu'un trajet d'une adresse
  à une autre. Partis avec elle : les deux onglets, `selectTripTab()`,
  `formDisposal` et ses six champs, le curseur de durée, `#btnRetourSimple`,
  `prixHoraire()`, la branche « disposal » de la soumission et du calcul du
  prix, et la ligne « Mise à disposition » du bloc de référencement — **y
  compris dans le paragraphe `seo_texte` des six langues**, qui la vendait
  encore après le retrait de la puce. Un site qui décrit une prestation qu'on
  ne peut pas réserver est une promesse en l'air.
- **CE QUI RESTE, ET CE N'EST PAS UN OUBLI.** `state.tripType` demeure, figé
  sur `"simple"`, et les trois branches `tripType==="disposal"` du bon de
  réservation, du message WhatsApp et du récapitulatif aussi. Elles ne servent
  plus à créer une course : elles servent à **relire celles déjà enregistrées**
  sur l'appareil et sur le serveur, qui portent ce champ. Les retirer rendrait
  illisible une partie de l'historique — même raison que les alias des anciens
  noms de gammes.
  De même, `hourly`, `hourlyPlus` et `SEUIL_HORAIRE_H` restent dans `VEHICLES` :
  c'est la grille de Barbaros, elle vaut au téléphone même si le site ne la
  vend plus. `prixHoraire()`, elle, est partie — elle n'avait plus d'appelant,
  et le jour où la prestation revient elle tient en huit lignes.
- **Les clés de traduction des offres n'ont PAS été supprimées** (`tours_*`,
  `tour_*`, `fiche_*` dans les six langues). Elles sont inertes — rien ne les
  lit — et les retirer voudrait dire réécrire six blocs d'une seule ligne de
  plusieurs milliers de caractères, pour un gain nul et un vrai risque de
  casser une langue. Elles seront enlevées à la prochaine reprise de l'objet
  `I18N`, pas à l'arrache.
- **Le dossier `photos/` reste dans le dépôt**, plus rien n'y pointe. Les
  treize vues envoyées par Barbaros sont conservées pour le jour où il
  redemandera des offres ; `construire.sh` les publie encore, ce qui ne coûte
  rien puisque aucune page ne les appelle. Ne pas les supprimer sans le lui
  demander : c'est du travail qu'il a fourni.
- **Ne pas réintroduire de packs sans qu'il le redemande explicitement.**
  C'est le deuxième produit qu'il fait retirer après le pack Disneyland.

**LES PHOTOS — la règle survit aux packs.** Le dossier `photos/` reste dans le
dépôt, plus rien ne le lit ; les treize vues envoyées par Barbaros y dorment.
Les douze photos d'origine, elles, venaient de Google Images — il l'a confirmé
— et ont été supprimées en août 2026. Ce qui suit vaut pour toute image qu'on
remettrait un jour, sur une offre ou ailleurs :
- **Ne jamais installer une photo sans savoir d'où elle vient.** Google
  n'héberge rien : chaque image appartient à un photographe. Contrefaçon,
  L335-2 CPI — en pratique, une lettre réclamant plusieurs milliers d'euros.
- Sources propres : **Unsplash, Pexels, Pixabay**. Une vraie photo Unsplash
  fait au moins 1000 px de large et pèse plus de 200 Ko ; une image de 500 px
  pour 60 Ko est la vignette d'une page de résultats, pas un téléchargement.
- Trois pièges rencontrés : le **filigrane Shutterstock** (preuve que l'image
  n'est pas payée) ; le **plafond de Chagall** à l'Opéra, protégé jusqu'en
  2055 ; et surtout — la tour Eiffel est libre de droits **de jour**, mais son
  **éclairage nocturne est une œuvre protégée**, donc pas de tour illuminée.
- Deux vues de Disneyland ont été écartées pour la même raison : filigrane
  SORTIRAPARIS.COM sur l'une, château et architecture Disney sur l'autre.

**Le bandeau de cookies recouvrait les boutons d'action.** Mesuré à 390 px : il
occupait 667–780 px, le bouton 674–726 — **entièrement caché**, sur l'écran des
tarifs. Un client qui n'avait pas encore répondu au bandeau ne pouvait pas
continuer sa réservation. `mesurerBandeau()` pose sa hauteur réelle dans
`--h-bandeau`, et `.veh-action` s'en sert pour remonter d'autant. À
**remesurer** à l'affichage, à la fermeture, au dépliage des détails, au
changement de langue et au redimensionnement — sa hauteur change à chaque fois.

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

**Le mode exploitant est protégé par le code `12345678`** (`CODE_EXPLOITANT`, stocké
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

**IL N'Y A PLUS DE DÉLAI DE 3 H — MAIS IL Y A UN PRÉAVIS DE 20 MINUTES**
(voir la section dédiée en fin de fichier). Les deux ne sont pas la même
chose et ne doivent pas être confondus : l'un était un AVERTISSEMENT sur
des heures entières, l'autre est un REFUS de vingt minutes.
(septembre 2026, à la demande de Barbaros).
`DELAI_RESERVATION_H`, `courseImminente()`, le champ `imminente` des courses,
l'encadré de l'accueil, l'avertissement rouge de l'écran de confirmation et le
rappel du bon ont tous été retirés, ainsi que huit clés de traduction × six
langues. Une course pour dans vingt minutes se réserve comme une autre.
- **Ce qui rassure encore le client n'a pas disparu** : le bon dit toujours
  « En attente de confirmation » et « Ce bon devient ferme dès qu'Elatransfer
  confirme ». C'est ce qui remplace l'avertissement — ne pas le retirer, ce
  serait laisser croire à une place réservée qui n'existe pas.
- **Piège rencontré** : l'encadré des 3 h portait aussi **le seul numéro de
  téléphone de la page d'accueil**. Le retirer emportait le numéro avec lui.
  Un bloc de contact l'a remplacé, sans aucune mention de délai. `test6.mjs`
  le verrouille.
- Deux autres pièges à la découpe : une **accolade orpheline** est restée
  après le `if(d.imminente)` du bon (page blanche, « Unexpected token } »), et
  `applyLanguage()` écrivait dans `#texteAppel`, qui n'existait plus.
- `lead_time_call` et `lead_time_whatsapp` sont **conservées** : l'écriteau
  « hors zone » les réutilise.

**LE RETOUR SUIT LE CHEMIN PARCOURU, ET IL EST SUR TOUS LES ÉCRANS**
(septembre 2026, à la demande de Barbaros). Chaque bouton portait une
destination **fixe** écrite dans le HTML : ça marche tant qu'un écran n'a
qu'une porte d'entrée, et ça ment dès qu'il en a deux — le bon de réservation
s'ouvre depuis la confirmation ET depuis « Mes réservations », et il ramenait
toujours à la confirmation.
- `pileEcrans` empile l'écran quitté à chaque `showScreen()` ;
  `revenirEnArriere()` dépile. Le `data-target` du HTML n'est plus qu'un
  **secours**, utilisé quand la pile est vide — un client arrivé par un lien
  direct, par exemple. Douze entrées au maximum.
- `.nav-item` et `.btn-back` ne partagent plus le même gestionnaire : la barre
  du bas **emmène** quelque part, le retour **ramène** d'où l'on vient.
- **La confirmation vide la pile.** Sans ça, « Retour » ramenait à l'écran de
  paiement, où le client n'avait qu'à réappuyer sur « Confirmer » pour créer
  une seconde course identique.
- Trois écrans n'avaient aucun retour — **confirmation, espace chauffeur,
  Infos**. Un test liste les écrans sans `.btn-back` et n'accepte que
  l'accueil : tout nouvel écran est donc couvert d'office.

**Le bouton « Retour » est un vrai bouton** (septembre 2026). C'était un
« ‹ Retour » gris de 16 px, sans fond ni contour : Barbaros l'a cherché sur la
fiche d'une offre et ne l'a pas trouvé, il appuyait sur « Accueil » dans la
barre du bas — ce qui lui faisait perdre l'offre qu'il regardait. Il fait
maintenant 44 px de haut, avec fond, contour et flèche à la couleur du texte.
Le sélecteur est `button.btn-back` — **élément + classe**, pour passer devant
les classes utilitaires du HTML sans réécrire les sept blocs qui l'utilisent.
La flèche était peinte en gris dans le SVG lui-même : `stroke:currentColor` la
fait suivre.

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

**La règle « la pastille s'efface devant le rayon d'offres » a été retirée**
avec le rayon (septembre 2026). Elle avait servi : la pastille passait en
travers de la promesse d'une carte. Si un rayon revient un jour, la leçon
tient toujours — on ne compare pas le rayon à la fenêtre entière (trop large :
sur une page de 2090 px il reste visible jusqu'en bas et la pastille ne
revient jamais) mais **au rectangle de la pastille**.

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

**LA ZONE DESSERVIE — 90 km autour de Paris** (septembre 2026, phase 2 de
l'audit, à la demande de Barbaros : « seuls les clients qui sont en
Île-de-France peuvent réserver »). Avant cette règle, **Lille → Marseille
passait sans un mot** : 1 084 km, 1 902,91 € annoncés en Ela One, réservation
acceptée. Et le prix d'Elatransfer est **ferme** — il aurait fallu assurer la
course à perte, ou se dédire sur un prix annoncé, ce que le Code de la
consommation appelle une pratique commerciale trompeuse.
- `CENTRE_ZONE` + `RAYON_ZONE_KM` (90), `horsZone()`, `lieuHorsZone()`,
  `jugerZone()`. On mesure **la distance à vol d'oiseau depuis Paris**, et
  **pas le département** : la latitude et la longitude sont la seule donnée
  présente sur TOUTES les adresses (BAN, Photon, terminaux, repli hors ligne).
  Le code postal n'est qu'un morceau de libellé, au format variable selon la
  source — s'y fier, c'est accepter qu'un jour une adresse valable soit
  refusée parce qu'elle est écrite autrement.
- **90 km et pas les huit départements** : Beauvais-Tillé est dans l'Oise, à
  69 km. Une règle départementale aurait refusé l'un des trois aéroports que
  le site propose lui-même. 90 km couvre toute l'Île-de-France avec de la
  marge et écarte Lille (204 km), Rouen (112), Orléans (110), Reims (129).
- **Une adresse sans coordonnées n'est PAS hors zone** : elle n'est pas encore
  choisie dans la liste, et le formulaire a déjà un message pour ça. Sinon on
  afficherait « hors zone » sur un champ en cours de saisie.
- Le contrôle se fait **au choix de l'adresse** (les trois rappels de
  `jugerZone()` dans les `attachAutocomplete`) **et à la soumission**, dans
  les deux branches — trajet simple et mise à disposition.
- **L'écriteau est EN HAUT du formulaire**, pas sous le bouton. Posé en bas il
  tombait derrière le bandeau de cookies (mesuré : écriteau à 578–770 px,
  bandeau à 667) et le client voyait un bouton gris sans la moindre raison.
- On ne renvoie pas le client sans rien : **appel et WhatsApp** sous le
  message. Un Paris → Deauville est une belle course, elle se négocie de vive
  voix. L'impasse devient une piste.

**Incrémenter `CACHE` dans `sw.js` à CHAQUE changement visible.** Oublié à la
phase 1 : Barbaros a publié et n'a rien vu changer sur son téléphone. Le HTML
est servi « réseau d'abord », mais les téléphones qui ont **installé
l'application** gardent le reste. `elatransfer-v16` au 5 septembre 2026.

**LE SITE N'EST PLUS UNE NAVETTE D'AÉROPORT** (septembre 2026, phase 1 de
l'audit). Quatre endroits disaient « aéroport » avant de dire « chauffeur
privé » : l'enseigne, le titre, la description, et la promesse sous le bouton.
- L'enseigne dit **« Paris · Île-de-France »**, plus « Paris · Roissy CDG ·
  Orly ». Elle est sur CHAQUE écran : deux aéroports sur trois mots y
  définissaient la marque. Les aéroports restent proposés à la saisie.
- Le **titre**, la **description**, `seo_titre` et `seo_texte` (six langues)
  mènent avec le métier et la zone ; Roissy, Orly et Beauvais sont nommés
  **après**. Deux contrôles de `test3.mjs` vérifient l'**ordre**, pas la
  simple présence.
- Les données structurées déclarent **`LimousineService`**, plus
  `TaxiService` : un VTC n'a ni licence de taxi, ni taximètre, ni droit de
  maraude. C'était factuellement faux.
- La **promesse sous le bouton** (`#noteReassurance`) est universelle par
  défaut et ne bascule sur l'attente aéroport que si une des deux adresses
  est un terminal — `jugerNoteAttente()`, appelée depuis `champVol.sync()`,
  qui calcule déjà ce signal pour le champ « numéro de vol ». Elle réécrit
  **l'attribut `data-i18n`**, pas seulement le texte : sinon un changement de
  langue ramènerait la promesse générale sur une course Roissy.
- Le bouton dit **« Voir mon prix »**, plus « Voir les tarifs » : une grille ?
  un devis ? un paiement ? Le nouveau libellé dit ce que le clic donne. Les
  commentaires du code ont suivi — chercher l'ancien nom ne donnait plus rien.
- Une ligne **« 3 étapes · aucun paiement en ligne »** sous le bouton :
  l'incertitude sur la longueur d'un tunnel fait abandonner plus sûrement que
  sa longueur réelle.

**L'accueil ne télécharge plus AUCUNE photo** (septembre 2026). Le rayon
portait treize vignettes qui partaient toutes au chargement — **1,8 Mo avant
l'affichage du formulaire**, en 4G. On les avait retenues par un
`IntersectionObserver` (`chargerFondsVisibles`) ; le rayon retiré, il n'y a
plus rien à retenir et l'observateur est parti avec. `test.mjs` garde la
garantie sous sa forme la plus forte : on descend toute la page et rien du
dossier `photos/` ne part.
Les deux leçons restent vraies si des images reviennent un jour :
- **120 px d'avance, pas 300.** Il ne restait que 178 px entre le bas de
  l'écran et le haut du rayon : à 300 px les deux premières cartes se
  chargeaient encore, et l'observateur ne servait à rien.
- Un fond CSS n'est **pas** une balise `<img>` : `loading="lazy"` ne s'y
  applique pas, il faut un `IntersectionObserver`.

**Zones tactiles : ne JAMAIS poser `position:relative` sur un bouton déjà en
`absolute`.** Le bouton « me localiser » est positionné par une classe
Tailwind ; un sélecteur d'identifiant l'emporte sur une classe, et la règle
l'a fait retomber dans le flux, **à gauche du champ d'adresse**. Un élément
déjà positionné sert de repère à son propre pseudo-élément. Le sélecteur de
langue, lui, est un `<select>` : Chrome n'y dessine aucun pseudo-élément, on
l'agrandit pour de vrai (`min-height:44px`).

**L'accueil ne pose qu'une question : d'où à où, et quand.** Août 2026, à la
demande de Barbaros — « fait comme Uber ». Le formulaire d'accueil ne porte
plus que les deux adresses, la date et l'heure. Ce qui en est parti :
- **Les deux onglets** « Trajet simple / Mise à disposition » — masqués en
  août, brièvement revenus en septembre au retrait des packs, puis
  **supprimés pour de bon** quand Barbaros a fait retirer la mise à
  disposition elle-même. Il n'y a plus qu'un formulaire, ouvert d'emblée.
- **Le nombre de passagers et la gamme.** Ils sont passés sur l'écran des
  prix (`#paxVehicles`, au-dessus de la liste) : on ne fait pas choisir une
  gamme à quelqu'un qui n'en connaît pas encore le prix. Changer le nombre
  redessine la liste tout de suite et **efface un choix devenu impossible**
  — sinon on continuerait avec une berline pour six.
- **La mise à disposition** a fini par être **retirée entièrement**
  (septembre 2026). Voir la section des packs plus haut.

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

**LE SERVEUR EST BRANCHÉ.** `SUPABASE_URL` et `SUPABASE_CLE` (haut du script)
sont **remplis** depuis août 2026 — ne pas répéter qu'ils sont vides, l'erreur
a déjà été faite en septembre. Le client appuie sur « Confirmer » et c'est
fini pour lui : la demande arrive dans le tableau de bord, sur n'importe quel
appareil. Marche à suivre complète et manœuvre de changement de téléphone
dans `SUPABASE.md`.
- Le module `nuage` fait tout : `deposer` (le client, en anonyme),
  `connexion`, `lister`, `suivi`, `pousser`. Aucune bibliothèque chargée —
  de simples appels REST.
- **`pousser` est un dépôt-OU-mise-à-jour, et ça a été un vrai trou**
  (corrigé septembre 2026). C'était `majStatut`, un PATCH : il ne modifie
  qu'une ligne existante. Les courses déposées par un CLIENT en ont une ;
  celles que Barbaros saisit LUI-MÊME — un hôtel qui appelle, une demande
  collée depuis WhatsApp — n'en ont aucune. L'appel partait, ne trouvait
  rien, et ne disait rien : **ces courses-là ne vivaient que dans son
  téléphone**, et changer d'appareil les perdait. C'est une bonne part de son
  travail. `saveBooking()` et `majBookingStocke()` appellent maintenant
  `pousser()`, qui envoie un POST avec
  `Prefer: resolution=merge-duplicates`. Trois contrôles de `test9.mjs` le
  verrouillent, dont un sur l'en-tête lui-même.
- **Ce correctif exige une policy INSERT pour `authenticated`** dans Supabase.
  Elle manquait au script d'origine ; elle est dans `SUPABASE.md`, à coller
  seule si le projet est antérieur. Sans elle, le serveur refuse, `pousser`
  rend `false` en silence, et le registre local reste juste — on ne perd
  rien, on ne gagne simplement pas la copie.
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

---

# LE SITE — `index.html`

**LA BASCULE EST FAITE** (6 septembre 2026, à sa demande : « Non je veux que
les gens voit mon nouveau site »). `nouveau.html` est devenu `index.html` :
c'est LUI que voient les clients à la racine du domaine. Tout ce qui suit
le décrit. La section « Asmine — l'application de réservation » plus haut
décrit l'ANCIEN site, qui n'existe plus : la garder sert à comprendre d'où
viennent les décisions, pas à savoir ce que fait le site aujourd'hui. En
cas de contradiction, **c'est cette section-ci qui dit vrai**.

**CE QUI A ÉTÉ SUPPRIMÉ À LA BASCULE, ET POURQUOI ON NE LE REMET PAS :**
- l'ancien `index.html`, `styles.css`, `tailwind.config.js`,
  `tailwind.src.css` ;
- les neuf suites `test.mjs` … `test9.mjs` et `test-hors-ligne.mjs` — elles
  éprouvaient un fichier qui n'existe plus.

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
| Berline (4 places) | 2,95 € | 30 € |
| Van (7 places) | 4,20 € | 50 € |

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
  dizaine ; majorer après le plancher ferait payer 36 € une course
  annoncée à 30 €. Le plancher a le dernier mot.
- Le reste inchangé : +20 % nuit et week-end, TVA 10 % incluse, prix ferme,
  zone de 90 km autour de Paris.
- Barbaros écrit souvent **« van » là où il veut dire « berline »** — trois
  fois de suite sur cette grille. Ne pas deviner sur un prix : demander.

## Ce qui est propre au nouveau site

- **Deux gammes seulement**, Berline et Van. Les clés `berline` et `van` ne
  changent jamais : elles sont dans l'historique.
- **Deux langues**, français et anglais, et l'anglais est le repli — un
  Allemand ou un Japonais lit plus probablement l'anglais. Ajouter une
  langue veut dire écrire ~110 phrases à la main ; pas de traduction
  automatique sur un site où le prix engage.
- **Le mode de règlement est demandé au client** (espèces ou carte), rien
  n'est présélectionné, et le choix est obligatoire. **On demande, on
  n'explique pas** : la phrase qui justifiait la question par le terminal
  du chauffeur a été retirée à sa demande. La réponse part dans le message
  WhatsApp, sur le bon et sur la fiche de l'exploitant.
- **Le message WhatsApp fait neuf lignes**, et sa STRUCTURE compte autant
  que son texte : les deux premières valeurs « … : … » sont les adresses,
  le **dernier montant en euros est le prix** — d'où la ligne « Paiement »
  placée AVANT « Prix » — et la dernière ligne est « nom — téléphone ».
- **Pas de documents légaux pour l'instant**, à sa demande. La LCEN les
  impose : le nouveau site ne peut pas prendre la racine sans eux.
- Référence `ELA-AA-MM-NNNN`, jamais `ASM` : ASM venait du nom du dépôt,
  pas de la marque.

**LA BARRE DU BAS N'A QUE TROIS ONGLETS** — Accueil, Mes courses, Contact
(septembre 2026, à sa demande : « Enleve l'icône réserver elle ne sert a
rien »). « Réserver » ouvrait EXACTEMENT le même écran qu'« Accueil », à
la seule différence qu'il posait le curseur dans le champ de départ. Deux
onglets pour un écran, c'est un client qui appuie sur le second, ne voit
rien bouger, et en conclut que le site est cassé.
Conséquence à ne pas manquer : les écrans du tunnel — les prix, le
récapitulatif — se rattachent désormais à **« accueil »** dans la table de
`ecran()`. Sans ce déplacement, plus aucun onglet ne s'allume pendant la
réservation. Un test vérifie que **chaque onglet mène à un écran
différent** : la règle vaut pour tout onglet qu'on ajouterait demain.

## La confirmation qui arrive au client

**LE BON A DEUX VISAGES, un seul vrai à la fois** (septembre 2026, à sa
demande). En attente : « **Demande reçue** — Nous vérifions la
disponibilité d'un chauffeur professionnel. Vous recevrez la confirmation
de votre transfert. » Confirmé : « **Transfert confirmé** », pastille
verte, et un bloc **Chauffeur / Véhicule / Heure** avec un bouton pour
appeler le chauffeur. Afficher « en attente » sur une course déjà
attribuée fait rappeler un client qui n'a rien à demander ; l'inverse
promet une voiture qu'on n'a pas.

**C'EST LE LIEN QUI PORTE LA RÉPONSE, et ce n'est pas un choix de
confort.** Le serveur reçoit les demandes, mais sa règle de sécurité
interdit la LECTURE aux visiteurs anonymes — et il FAUT qu'elle
l'interdise : une lecture ouverte exposerait les noms, téléphones et
adresses de tous les clients. Le site ne peut donc pas aller demander
« ma course est-elle confirmée ? ». Barbaros confirme, appuie sur
**« Prévenir le client »**, WhatsApp part sur le numéro du client avec un
lien `?ok=`. Le client l'ouvre : son bon passe au vert.
- **CE QUE LE LIEN PORTE, ET RIEN D'AUTRE** : la référence, le prénom du
  chauffeur, son téléphone, le véhicule, l'heure. **Jamais le nom ni le
  numéro du client, jamais les adresses** — un lien se transfère, et ce
  qu'il porte se lit (RGPD 5.1.c). Quatre contrôles le verrouillent.
- Encodé en **base64url** : le `+`, le `/` et le `=` du base64 ordinaire
  se font manger ou réécrire en route par les messageries.
- **Le paramètre est effacé de la barre d'adresse** après lecture, sinon
  un rafraîchissement rouvre la confirmation par-dessus ce que le client
  était en train de faire.
- **Un lien ouvert sur un appareil qui ne connaît pas la course** affiche
  la seule confirmation : le détail du trajet et le prix sont MASQUÉS
  plutôt qu'affichés en tirets et à 0,00 € — un bon qui annonce zéro euro
  est un bon faux.
- **« Renvoyer ma demande » disparaît** une fois la course confirmée :
  elle est arrivée, quelqu'un y a répondu.

**CONFIRMER ET PRÉVENIR SONT DEUX GESTES, ET ILS LE RESTENT.** Le premier
range la course chez Barbaros, le second la dit au client. Les fondre
enverrait le message avant qu'il ait relu le nom du chauffeur — et un
message parti ne se rattrape pas. « Prévenir le client » n'apparaît que
sur une course **confirmée** ET **avec un numéro** où écrire : un bouton
qui n'envoie rien lui ferait croire que le client est prévenu.

**Le message fait six lignes** : confirmé + référence, chauffeur,
véhicule, heure, numéro du chauffeur, lien du bon. Le trajet et le prix
n'y sont pas — le client les a déjà sur son bon.

**Piège rencontré** : `.bouton-fantome` habille aussi des liens `<a>`, et
une ancre est un élément **en ligne** — `width:100%` n'y fait rien. Le
bouton « Appeler le chauffeur » se posait EN TRAVERS de la ligne
« Heure ». `display:block` corrige, et un test **mesure les rectangles**
plutôt que de relire le CSS.

## Le registre et « Coller une demande »

**COLLER UNE DEMANDE**, en haut du tableau de bord. Quand un client écrit
sur WhatsApp plutôt que de passer par le site, sa demande n'existe nulle
part : le presse-papiers est le transport.
- `lireDemandeCollee()` **ne devine rien aux libellés, il lit la PLACE des
  choses** : la référence en tête, une date en JJ/MM/AAAA HH:MM, les deux
  premières valeurs « … : … » pour les adresses, le **dernier** montant en
  euros pour le prix, la dernière ligne « nom — téléphone ». Un test le
  vérifie avec un message aux libellés anglais.
  **Changer la forme du message client oblige à changer ce lecteur**, et
  inversement — les deux se lisent ensemble.
- **La course entre TOUJOURS en `attente`**, jamais confirmée d'office.
- **Une minuterie de 1,2 s ouvre le champ de repli** : certains navigateurs
  rejettent la lecture du presse-papiers (le `catch` suffit), d'autres
  laissent la promesse **en attente indéfiniment** — sans minuterie, le
  bouton ne fait alors rien du tout, sans un mot.
- Le champ **reste ouvert** après un ajout, vidé : les demandes arrivent
  par trois ou quatre d'affilée.

**LE REGISTRE** (bouton « Registre et résultats ») : la semaine en cours
avec la précédente en rappel, le résultat par semaine / mois / année, le
tableau des chauffeurs, la recherche libre, la sauvegarde JSON, l'export
CSV et la restauration.
- **Les chiffres ne comptent QUE les courses `realisee`.** Une course
  confirmée n'est pas une course faite : la compter ferait prendre des
  promesses pour de l'argent encaissé.
- **La date retenue est celle de la COURSE**, pas de la saisie, sinon les
  semaines se décalent au fil des oublis.
- **La recherche porte sur TOUT le registre**, pas seulement les
  réalisées : quand un client rappelle, c'est sa course à venir qu'on
  cherche.
- **Le CSV est en point-virgule avec un BOM** : Excel français lit le CSV
  au séparateur de sa locale, et une virgule met tout dans une colonne.
- **La restauration AJOUTE et n'écrase jamais** — une course d'ici peut
  avoir avancé depuis la sauvegarde.

## L'affiche des hôtels, et l'encodeur QR

**L'ENCODEUR QR EST ÉCRIT DANS LA PAGE**, pas pris chez un tiers.
`api.qrserver.com` ajouterait une dépendance réseau à une affiche qu'on
imprime une fois, et enverrait l'adresse à quelqu'un qui n'a pas à la
connaître. Mode octet, correction M, **versions 1 à 6** — jusqu'à 106
caractères. S'arrêter à la 6 évite les blocs d'information de version
(obligatoires dès la 7) et garde un seul motif d'alignement.

**UN ENCODEUR NE SE VÉRIFIE PAS TOUT SEUL — LEÇON PAYÉE.** Le premier jet
passait TOUS mes contrôles internes : format relu, masque, zigzag,
Reed-Solomon divisible, dix syndromes nuls. Et il n'était lisible par
**aucun téléphone**. L'information de format était écrite **bit à
l'envers** ; mon décodeur maison reproduisait la même erreur et ne voyait
rien. Seule la comparaison avec un **décodeur indépendant** (`jsqr`, plus
un générateur de référence `qrcode` pour comparer module par module) l'a
montré. `test-nouveau-affiche.mjs` rend le SVG **final** en image et le
décode : sans ça, Barbaros imprimait cinquante affiches dont aucune ne se
scanne.
- Le SVG porte son **`xmlns`** : sans lui il s'affiche dans la page mais
  ne peut plus être chargé comme image ni collé ailleurs.
- **SVG et non canvas** : une affiche s'imprime, un canvas de 200 px sort
  en bouillie sur du papier.
- **À l'impression, seule l'affiche sort** — `visibility:hidden` sur tout
  puis `visible` sur l'affiche (elle s'hérite ; `display:none` sur les
  enfants de `body` emporterait l'affiche avec eux). Sans cette règle, le
  tableau de bord — **noms et téléphones de clients** — partirait sur le
  papier posé au comptoir d'un hôtel.
- **Le nom de l'hôtel voyage EN CLAIR** (`?h=Ibis%20CDG`), pas en
  identifiant : à l'arrivée on le pose dans le champ de départ et la
  recherche d'adresse le retrouve. Un identifiant obligerait à tenir une
  table de correspondance, donc à réimprimer les affiches le jour où elle
  change.
- **On ne choisit PAS l'adresse à sa place** : la liste s'ouvre, le client
  tranche. Une adresse posée d'office enverrait le chauffeur au mauvais
  Ibis.

**LA PROVENANCE EST GARDÉE SUR LA COURSE** (`bon.provenance`), et c'est ce
qui rend l'affiche utile. Sans elle, l'affiche amène des clients et
personne ne sait laquelle travaille : le nom de l'hôtel ne sert qu'à
remplir le champ de départ, et il disparaît dès que le client corrige son
adresse. Un test éprouve exactement ce pire cas — le client CHANGE son
départ, et la provenance reste.
- Elle vit en **`sessionStorage`**, pas dans une variable (le client
  recharge, revient en arrière, laisse l'onglet ouvert la nuit) et pas en
  `localStorage` : elle vaut pour CETTE visite, pas pour toutes les
  réservations qu'il fera ensuite depuis son téléphone.
- Le registre porte **« D'où viennent les clients »** : les **demandes**
  reçues (ce que l'affiche a produit) ET l'argent des seules **réalisées**
  — deux chiffres pour deux questions. Une course sans provenance ne crée
  pas de ligne : un champ vide se lit « venue directe », pas « information
  perdue ».
- La colonne **« Vient de »** est dans l'export CSV, et la recherche du
  registre cherche aussi par hôtel.

## Les documents légaux

Trois documents, en français et en anglais, accessibles depuis **Contact**
sans compte et hors du mode exploitant — la LCEN l'impose, et c'est aussi
ce qu'un client regarde avant de confier un trajet à un inconnu :
conditions générales de vente, mentions légales, politique de
confidentialité.

- Ils viennent de l'ancien site, **adaptés** : la formation du prix y
  décrit la grille réelle (tarif kilométrique, majoration, arrondi à la
  dizaine, montant minimum), la mise à disposition y est dite **non
  réservable en ligne**, et le mode de règlement déclaré par le client y
  engage Elatransfer à envoyer un chauffeur en mesure de l'accepter.
  **Des CGV qui décrivent une autre formation du prix que celle appliquée
  sont pires qu'aucunes CGV** : le prix est ferme donc opposable, et le
  client y trouverait un argument contre nous. Toucher à la grille veut
  dire toucher aux CGV, dans les deux langues.
- Le corps est posé en `textContent`, jamais en `innerHTML` : ce sont de
  longs textes qu'on éditera à la main, parfois copiés d'un document
  d'avocat, et un chevron perdu dedans ne doit pas devenir une balise.
- **Le mandat de facturation n'a pas été repris** : c'est un document
  entre Elatransfer et le chauffeur, il n'a rien à faire côté client.

**PLUS AUCUN TROU, ET C'EST UNE RÈGLE** (6 septembre 2026, à sa demande :
« Enleve les mention legal non complète ou a compléter je ne veux pas de
trous d'incohérence »). Les documents portaient 35 « [À compléter] »
hérités de l'ancien site. Un document qui dit ça à un client ne fait pas
l'effet d'un brouillon : il fait l'effet d'une société qui ne sait pas
qui elle est. **Un document court et vrai vaut mieux qu'un formulaire
vide.** Un contrôle de `test-nouveau-bascule.mjs` cherche le CROCHET dans
les six textes — la forme survit à une reformulation, pas la formule.
- **Les mentions légales ont été réécrites**, pas rapiécées : sur onze
  lignes, neuf étaient des trous. Il ne reste que le vérifiable — nom
  commercial, activité, hébergeur (GitHub, Inc.), contact, propriété
  intellectuelle, CNIL.
- **Aucun médiateur de la consommation n'est nommé** tant qu'aucun n'est
  désigné : le client écrirait à une adresse morte en croyant avoir saisi
  un recours. La voie de réclamation, elle, reste écrite.
- **CE QUI MANQUE ENCORE, et que seul Barbaros peut donner** : raison
  sociale, forme juridique, **SIRET**, adresse du siège, directeur de la
  publication, et le médiateur (obligatoire, L616-1 Code conso.). Ne pas
  remettre de champs vides en attendant — les ajouter le jour où il donne
  les vraies valeurs, et pas avant.

## Ce qui reste à faire

**Fait au 6 septembre 2026, ne pas le refaire** : optimisation mobile,
bandeau d'accueil, bouton de réservation, WhatsApp, formulaire, affichage
du prix, confirmation client, espace exploitant, application installable (PWA),
référencement, **registre et « Coller une demande »**, **affiche QR pour
les hôtels**.

1. **Les informations de l'éditeur** (voir ci-dessus) — le seul point qui
   rende le site non conforme aujourd'hui, et le seul que Claude ne peut
   pas produire.
2. **La gestion des chauffeurs** : aujourd'hui un champ libre nom +
   téléphone. En confiant des courses à des tiers, Asmine est une centrale
   de réservation (Code des transports L3142-1) : elle doit pouvoir prouver
   que chaque chauffeur a carte professionnelle, inscription au registre
   VTC et assurance. Un carnet avec les dates d'expiration et une alerte.
3. **L'ALERTE À CHAQUE DEMANDE EST ÉCRITE, PAS ENCORE DÉPLOYÉE**
   (septembre 2026). `supabase/functions/nouvelle-demande/` et
   `NOTIFICATION.md`. Il ne manque que ce que Claude ne peut pas faire :
   se connecter à SON compte Supabase et poser les jetons. Tant que ce
   n'est pas fait, **ne pas dire que les notifications marchent**.
   - **L'automatisation WhatsApp reste bloquée** : l'API WhatsApp Business
     de Meta exige une vérification d'entreprise et **un numéro dédié, qui
     ne peut plus servir dans l'application normale**. Rien n'a changé, ne
     pas le promettre.
   - Telegram a été retenu comme voie recommandée : gratuit, instantané,
     avec le son. L'e-mail est le second canal, au choix.
4. **Une langue de plus si le besoin se voit** : l'espagnol et l'arabe sont
   les deux qui apporteraient à Paris. L'arabe demande de retourner toute
   la page de droite à gauche — ce n'est pas qu'une affaire de textes.
5. **Cloudflare** reste bloqué : voir `CLOUDFLARE.md`. Ne pas déplacer les
   serveurs de noms — l'email de Barbaros en dépend.
6. **La clé Mapbox** : elle reste le premier niveau du calcul
   d'itinéraire, et la seule qui se restreigne au domaine. Marche à suivre
   dans `MAPBOX.md`. Ce n'est plus urgent depuis qu'ORS est branché — c'est
   un confort, pas un manque.

## L'ITINÉRAIRE — QUATRE NIVEAUX, ET CE QUI SE JOUE DESSUS

Septembre 2026. Le prix est un kilométrage, donc **la distance décide
seule de ce que le client paie**, et il est ferme : annoncé, accepté,
encaissé tel quel. `itineraire()` enchaîne quatre niveaux, chacun
rattrapant le précédent :

| | Service | Quand | Quota |
|---|---|---|---|
| 1 | **Mapbox** | si `CLE_MAPBOX` est remplie | 100 000/mois |
| 2 | **OpenRouteService** | si `CLE_ORS` est remplie | 2 000/jour |
| 3 | **OSRM** | sinon, ou si les précédents refusent | serveur de démo |
| 4 | **Vol d'oiseau × 1,3** | les trois à terre | — |

- **`CLE_ORS` est REMPLIE** (septembre 2026, jeton donné par Barbaros).
  `CLE_MAPBOX` est vide : il n'a pas de compte Mapbox. Le site tourne donc
  aujourd'hui sur ORS, avec OSRM en filet.
- **LA CLÉ ORS EST EN CLAIR DANS LE DÉPÔT, ET C'EST ASSUMÉ.** Une page
  statique envoie forcément sa clé au navigateur : elle est lisible de
  toute façon. La vraie différence entre les deux services est ailleurs —
  un jeton Mapbox **se restreint au domaine**, un jeton ORS **non**. La
  sortie de secours d'ORS est donc de le **régénérer** sur
  openrouteservice.org et de le remplacer ici. Ça a été dit à Barbaros ; il
  a donné la clé en connaissance de cause. Ne pas rouvrir le débat.
- **Si le quota se vide sans raison, c'est qu'elle a été reprise.** Le site
  ne tombe pas pour autant : OSRM prend le relais. C'est exactement ce à
  quoi servent les niveaux.
- **ORS répond en GeoJSON**, pas comme les deux autres : la mesure est dans
  `features[0].properties.summary`, d'où `lireRouteORS()`. Une réponse sans
  résumé lève une erreur au lieu de rendre zéro — un zéro passerait pour
  une course de 0 km et sortirait au **prix plancher** sur un Paris →
  Roissy.
- **ORS prend ses points en `lon,lat`**, dans deux paramètres séparés
  (`start=` et `end=`). L'ordre inverse de l'habitude ; inversé, la course
  part dans l'océan Indien sans le moindre message. Un test vérifie les
  coordonnées exactes de l'URL.
- **LE CONTRÔLE QUI COMPTE LE PLUS** dans `test-nouveau-itineraire.mjs` :
  un niveau en panne ne doit **pas** faire sauter les suivants pour aller
  droit au vol d'oiseau — ce serait facturer une estimation là où une vraie
  route était disponible. Un repli qui se déclenche trop tôt ne se voit
  pas : le prix s'affiche, il est simplement faux de quelques euros. D'où
  **quatre distances différentes** dans le test, une par niveau, et le prix
  lu à l'écran pour savoir lequel a répondu.
- **Le « ≈ » est sur la mesure ET sur le prix**, et c'est sur le prix qu'il
  compte : c'est le montant que le client regarde.
- `api.mapbox.com` et `api.openrouteservice.org` sont dans les hôtes **hors
  cache** de `sw.js` : une réponse gardée resservirait la distance d'une
  course à une autre.
- `overview=false` chez Mapbox : le site n'affiche aucune carte, réclamer
  la géométrie ferait grossir la réponse pour rien.
- **Minuteur de 4 s par appel** (`fetchLimite`), soit douze au pire avant
  le vol d'oiseau — et ce pire cas suppose les trois serveurs muets en même
  temps. Il était à 5 s quand il n'y avait que deux niveaux ; ajouter un
  troisième sans le baisser aurait porté l'attente à quinze secondes.
- **LES NEUF AUTRES SUITES COUPENT ORS EXPLICITEMENT**
  (`route('**://api.openrouteservice.org/**', r => r.abort())`). Sans ça
  elles dépendraient du fait qu'il soit injoignable depuis cette machine —
  et sur un poste relié à Internet elles interrogeraient le vrai service,
  avec une vraie distance, et tous les prix vérifiés au centime
  tomberaient à côté. **Toute nouvelle suite qui simule OSRM doit couper
  ORS de la même façon.**

## L'ALERTE À CHAQUE DEMANDE — DU CODE QUI TOURNE AILLEURS QUE DANS LE NAVIGATEUR

Septembre 2026, à sa demande. Il a demandé « pourquoi tu ne me créerais
pas un serveur qui fabrique la page, je veux pas que mon site reste en
simple fichier ». La réponse tenue : **un serveur loué ne changerait rien
pour ses clients**, coûterait 10–20 €/mois, tomberait parfois et
demanderait de l'entretien — alors que Supabase, qu'il a déjà, sait
exécuter du code sans machine à tenir. Ne pas revenir sur ce choix sans
un besoin que les fonctions ne couvrent pas.

**Ce qui est écrit** : `supabase/functions/nouvelle-demande/` (la fonction
et son message), `test-notification.mjs` (34 contrôles, sous Node, sans
réseau), `NOTIFICATION.md` (la marche à suivre).
**Ce qui manque** : le déploiement, qui exige SON compte. Tant qu'il ne
l'a pas fait, **le site se comporte exactement comme avant**.

**IL TRAVAILLE DEPUIS UN TÉLÉPHONE — la marche à suivre en tient compte**
(septembre 2026 : « je bosse depuis un tel »). L'ancienne étape 4 demandait
`npm install -g supabase` et un terminal : autant dire qu'elle ne se ferait
jamais. Tout passe maintenant par l'application Telegram et le navigateur —
l'éditeur du tableau de bord Supabase déploie une fonction qu'on colle.
- **`a-coller.ts` est la fonction en UN SEUL morceau**, parce qu'on ne colle
  pas deux fichiers avec un pouce. Il est **fabriqué** par `assembler.mjs`,
  jamais écrit à la main, et `test-notification.mjs` refait l'assemblage
  pour le comparer : deux recettes finissent toujours par diverger, et ici
  la divergence voudrait dire déployer un code que personne n'a testé.
- **L'assembleur annote les paramètres en `any`, et ce n'est pas
  cosmétique.** `message.js` est un `.js` : TypeScript n'y exige aucun
  type. Recopié tel quel dans un `.ts`, chaque paramètre nu devient une
  erreur « implicitly has an any type » et la fonction cesse de se déployer
  pour une raison sans rapport avec ce qu'elle fait. Vérifié avec `tsc
  --strict` : il ne reste que les globales de Deno, que `tsc` ne connaît
  pas. Le compte de paramètres attendus est écrit dans l'assembleur — une
  signature ajoutée sans annotation l'arrête au lieu de passer.
- **Les noms des secrets s'écrivent exactement** : un secret mal nommé
  n'est pas une erreur visible, la fonction croit simplement que le canal
  n'est pas configuré.

- **LA NOTIFICATION NE PEUT PAS FAIRE ÉCHOUER UNE RÉSERVATION.** Le
  webhook part APRÈS l'écriture de la ligne, détaché. Telegram en panne,
  jeton périmé, fonction plantée : la course est enregistrée quand même.
  On perd le bip, jamais la course. **Ne jamais inverser cette
  répartition** pour « garantir » l'alerte.
- **INSERT SEUL, jamais UPDATE.** Avec UPDATE, chaque changement de statut
  — chauffeur attribué, course réalisée — lui annoncerait une « nouvelle
  demande » qu'il vient de traiter lui-même. Au bout de trois jours il
  cesserait de regarder ses notifications, et c'est la seule vraie façon
  de casser ce système. La fonction refuse tout ce qui n'est pas un INSERT
  sur `courses` — ceinture en plus du réglage du webhook.
- **LE MESSAGE NE PORTE NI LE NOM, NI LE TÉLÉPHONE, NI LA CHAMBRE.** Ils
  ne servent pas à DÉCIDER ; ils sont dans le tableau de bord, à un doigt.
  Les promener chez Telegram ou chez un service d'e-mail pour rien, c'est
  la minimisation qui l'interdit (RGPD 5.1.c) — même règle que le lien
  `?ok=`. Le test cherche les **valeurs**, pas les libellés : chercher le
  mot « téléphone » passerait au vert avec le numéro écrit à côté.
- **Le départ pris est `departPublic`**, celui SANS le numéro de chambre.
  Le bon en porte deux versions ; prendre la mauvaise diffuse la chambre
  d'hôtel d'un client.
- **Le TITRE porte le trajet et l'heure.** C'est la seule ligne visible
  sur un écran verrouillé, celle qui décide s'il se lève. Le garder sous
  90 caractères : au-delà le téléphone coupe la fin, donc l'heure.
- **Aucun `parse_mode` chez Telegram.** En Markdown, une adresse qui
  contient un tiret bas ou une étoile fait rejeter TOUT le message, et la
  notification est perdue sans que personne ne le sache.
- **Rien de configuré rend une ERREUR, pas un succès muet.** Un « 200 OK »
  ferait croire pendant des semaines que les alertes marchent, jusqu'au
  premier client perdu.
- **`message.js` est en JavaScript ordinaire, à part du `.ts`**, pour
  qu'un test Node puisse le relire sans Deno ni réseau. Deno l'importe tel
  quel. Le reste — jetons, appels sortants — ne s'éprouve qu'une fois
  déployé.
- **Les secrets vivent chez Supabase, jamais dans le dépôt.** C'est toute
  la différence avec `CLE_ORS`, qui doit forcément partir dans la page
  parce que c'est le navigateur qui calcule le prix. La même porte servira
  à cacher la clé d'itinéraire, à laisser un client consulter sa course
  par sa référence, et à tenir les comptes chauffeurs.

## LA PALETTE — « ENCRE & CÉLADON », ET PLUS UN GRAMME D'OR

Septembre 2026, à sa demande : « les couleurs noir et dorée sont trop
souvent utilisées par les IA pour créer des sites, propose-moi des
couleurs dignes d'un expert ». Il a raison — marine + or est la teinte par
défaut de tout ce qu'on génère à qui on dit « chauffeur privé ». Trois
directions lui ont été montrées en image ; il a choisi la deuxième.

| Rôle | Valeur | Où |
|---|---|---|
| `--fond` | `#F4F6F5` | le papier — **jamais `#FFF`** |
| `--carte` | `#FFFFFF` | seulement les cartes posées dessus |
| `--noir` | `#16232B` | l'en-tête, le bandeau |
| `--encre` | `#151C22` | le texte |
| `--gris` | `#616E6B` | le texte secondaire |
| `--filet` | `#DDE4E2` | les bordures |
| `--accent` | `#1F6F6B` | boutons, sélection, onglet actif |
| `--accent-clair` | `#E2F0EE` | les fonds d'accent |
| `--accent-vif` | `#3FA9A2` | la marque : filet du logo, « TRANSFER » |
| `--accent-encre` | `#185754` | l'accent en TEXTE sur `--accent-clair` |

- **LES VARIABLES ONT ÉTÉ RENOMMÉES** : `--or*` → `--accent*`. Un rôle
  nommé par sa couleur finit par ramener la couleur — c'est arrivé sur
  l'ancien site, où le logo est repassé au vert parce qu'il empruntait
  `--gold`. **Ne jamais renommer ces variables d'après la teinte du jour.**
- **LE VRAI LEVIER EST LE FOND, pas l'accent.** Le blanc pur est la
  signature d'une page générée. Ne pas remettre `--fond:#FFFFFF`.
- **LE ROUGE DE L'ATTENTE N'A PAS BOUGÉ** (`#C9302F`) et ne doit pas :
  c'est la seule chose qui crie sur le tableau de bord. L'accent en est à
  **171° de teinte**. Tout accent futur doit rester à plus de 60° du rouge,
  sinon les deux se disputent l'attention.
- **LE VERT « CONFIRMÉ » A ÉTÉ FONDU DANS L'ACCENT.** Il y avait deux
  familles vertes, trop proches pour se distinguer et trop nombreuses pour
  faire un système. Une seule couleur : rouge = on attend, accent = c'est
  bon, gris = c'est fini.
- **Le vert WhatsApp `#25D366` est INTOUCHABLE** : c'est une marque. Il
  jure un peu plus à côté du céladon qu'à côté de l'or ; c'est signalé à
  Barbaros, il tranchera.
- **L'ICÔNE A SUIVI** (septembre 2026, à sa demande : « change l'icône
  aussi », puis « on garde le rond et on ajoute Transfer »). Voir la
  section dédiée plus bas.
- Le manifeste suit la page : `background_color` = `--fond`,
  `theme_color` = `--noir`, comme la balise `theme-color`. Ils se
  contredisaient avant.
- Contrastes mesurés (WCAG) : encre/fond 15,8 · accent/fond 5,5 ·
  blanc/accent 5,9 · gris/fond 4,9 · accent-encre/accent-clair 7,1 ·
  accent-vif/noir 5,7 · rouge/fond 4,9. Le gris et les chevrons ont été
  **assombris au passage** — ils étaient sous les seuils avant.

## L'ICÔNE — LE ROND, ET « TRANSFER » DESSOUS

Septembre 2026. Deux demandes successives : « change l'icône aussi »,
puis, en voyant les aperçus, « on garde le rond et on ajoute Transfer ».

**LES TROIS FICHIERS SE REFONT ENSEMBLE, TOUJOURS.** `icon.svg`,
`icon-maskable.svg` et `icon-180.png`. Un jeu d'icônes à moitié changé est
pire qu'un ancien cohérent : le téléphone montre l'une, l'onglet l'autre.

| Fichier | Forme | Pourquoi |
|---|---|---|
| `icon.svg` | **rond**, coins transparents | c'est celui qu'il a choisi |
| `icon-maskable.svg` | **carré PLEIN** | Android recadre lui-même et rogne jusqu'à 10 % de chaque bord ; à coins transparents il donnerait un rond posé sur un carré blanc |
| `icon-180.png` | carré opaque | iOS ignore un `apple-touch-icon` en SVG **et** n'accepte pas la transparence — les coins deviendraient noirs. Il applique son propre arrondi par-dessus |

- **`composer.py` (hors dépôt, dans le bac à sable) FABRIQUE les trois.**
  Ne pas retoucher les SVG à la main : le PNG dériverait du SVG au premier
  changement.
- **Le script lisait sa propre sortie — c'était un vrai défaut.** Il
  extrayait les contours d'« ELA » depuis `icon.svg`, qu'il écrit ensuite :
  un second passage reprenait « TRANSFER » comme s'il était une lettre
  d'« ELA ». Les contours sont maintenant **figés dans un fichier à part**,
  extraits une seule fois depuis git. Un script de fabrication doit pouvoir
  être rejoué à l'identique autant de fois qu'on veut.
- **Les lettres sont les contours réels d'Inter**, via `fontTools` — jamais
  du texte vivant. Le fichier ne dépend d'aucune police et s'affiche à
  l'identique partout, même sans réseau. L'échelle est calée sur la
  **hauteur des capitales**, pas sur la taille nominale : c'est la seule
  mesure qui aligne deux mots posés l'un sous l'autre.
- **À 20 px, « TRANSFER » n'est plus lisible** — il fait 3 px de haut. C'est
  inévitable et ça a été dit à Barbaros. « ELA » tient, lui. Si ça devient
  gênant, la correction est une variante sans le mot pour le seul favicon.
- **Le bloc est centré optiquement, pas géométriquement** : son milieu est
  à 249 pour un cercle centré à 256. Un bloc de texte exactement centré
  paraît tomber vers le bas.
- **La zone sûre du maskable est un cercle de 80 % du côté** (rayon 204,8).
  Le script mesure le coin le plus éloigné du centre et le compare à cette
  limite — 144,3 aujourd'hui.

## « ME LOCALISER » — ELLE REND UNE ADRESSE, PAS UNE POSITION

Septembre 2026, à sa demande : « ajoute la géolocalisation pour les
clients ». Le client est à Roissy, téléphone dans une main et valise dans
l'autre : lui faire taper « Aéroport Charles-de-Gaulle, Terminal 2E » est
le moment où l'on perd une réservation.

- **SEULEMENT AU DÉPART.** L'arrivée est là où l'on va, pas là où l'on est.
  Le bouton **remplace le chevron** de ce champ au lieu de s'y ajouter :
  deux pictogrammes au même endroit, l'un décoratif et l'autre cliquable,
  et le client appuie sur le mauvais.
- **UN POINT GPS NE SERT À RIEN.** Le chauffeur a besoin d'une adresse à
  composer dans son navigateur, et le bon d'un libellé à écrire. La
  position est donc relue par la **Base Adresse Nationale**
  (`/reverse/`) ; si elle ne rend rien — une bretelle, un champ — on le
  **dit** au lieu d'accepter une course vers des coordonnées nues.
- **LES COORDONNÉES RETENUES SONT CELLES DE L'ADRESSE, PAS DU GPS.** Le
  prix se calcule sur le trajet que le chauffeur fera vraiment. Le test
  donne au faux GPS et à la fausse BAN des points **différents**, et lit
  l'URL envoyée au calculateur d'itinéraire pour savoir lequel est sorti —
  un test qui regarde dans le moteur ne prouve pas ce que fait la voiture.
- **`brancher()` REND MAINTENANT UNE PRISE `poser(item)`**, et ce n'est
  pas un confort. Écrire dans `champ.value` depuis l'extérieur ne
  déclenche aucun `input` : `choisi` resterait nul, la garde qui invalide
  les coordonnées ne s'armerait donc jamais — elle ne se déclenche que si
  une adresse a été retenue — et le client qui corrige son adresse à la
  main partirait avec les coordonnées d'un endroit et le nom d'un autre.
  **Le prix est ferme, donc opposable : ce serait faux ET opposable.**
- **TROIS MESSAGES DISTINCTS**, parce qu'ils appellent trois gestes
  différents : refus (« autorisez-la dans les réglages »), pas d'adresse
  ici (« saisissez-la »), panne (« saisissez l'adresse »). Un seul message
  « ça n'a pas marché » ne dit pas quoi faire.
- **On invite à VÉRIFIER l'adresse.** Le GPS d'un téléphone se trompe
  couramment de plusieurs dizaines de mètres, donc de numéro dans la rue —
  et le chauffeur va à l'adresse écrite.
- **La zone des 90 km s'applique**, sans rien de spécial à écrire :
  `poser()` appelle le même `quand()` que la liste, donc `jugerZone()`. Un
  test l'éprouve depuis Lille — pas de porte dérobée.
- **`data-t-aria` a été ajouté à `appliquerLangue()`.** Un bouton dont le
  seul contenu est un dessin n'a que son `aria-label` à dire ; non
  traduit, il reste en français dans le lecteur d'écran d'un client
  anglophone — le seul endroit où le texte compte pour lui.
- **44 px de côté**, et **aucun `position:relative`** : le bouton est un
  élément de la rangée flex du champ. C'est délibéré — sur l'ancien site,
  un `position:relative` posé sur un bouton déjà placé en absolu l'avait
  fait retomber dans le flux, à gauche du champ d'adresse.
- **RIEN N'EST CONSERVÉ** : la position remplit le champ puis est oubliée.
  Ce qui part sur le bon est l'adresse, comme si le client l'avait tapée.
  **La politique de confidentialité annonçait déjà « Me localiser »**
  depuis l'ancien site — elle décrivait une fonction qui n'existait pas,
  c'est réglé. Deux contrôles le verrouillent.
- **Piège de capture, pas de code** : à 390×560 la page se remet en page
  et la pastille WhatsApp remonte sur le champ. Mesuré à la vraie hauteur
  (390×844), le bouton est à 404–448 px et la pastille à 686–740, non
  affichée. **Toujours capturer à 844 px de haut.**

## L'ESPACE EXPLOITANT EST DEVENU UN BACK-OFFICE

Septembre 2026, sur sa maquette : « Fait dans ce style ». L'espace était une
suite de blocs empilés sans hiérarchie — il l'a trouvé « bizarre », et il
avait raison : rien ne disait ce qu'il fallait regarder en premier.

- **UNE COLONNE À GAUCHE SUR ORDINATEUR, UNE RANGÉE DE PASTILLES SUR
  TÉLÉPHONE, ET LE MÊME HTML.** Deux mises en page séparées voudraient dire
  deux tableaux de bord à tenir, et le jour où l'un gagne un bouton l'autre
  l'oublie. Bascule à 900 px.
- **`body.espace`, PAS `body.exploitant`.** C'est le piège de cette
  refonte : `exploitant` est posée AVANT le verrou. S'en servir aurait
  affiché la colonne — nom, état du serveur, accès au registre — à qui
  n'a pas encore le code. `espace` n'arrive que dans `ouvrirEspace()`. Un
  contrôle le verrouille.
- **`.page` est bridée à 520 px** — c'est une application de téléphone. Un
  back-office dans 520 px n'en est plus un : la largeur n'est libérée que
  sous `body.espace`, au-delà de 900 px, et le contenu reste capé à
  1080 px.
- **L'ORDRE DIT CE QUI COMPTE** : les quatre chiffres, « Coller une
  demande », la liste des courses, puis les panneaux, puis l'affiche et le
  serveur. L'affiche et le serveur se règlent une fois et ne se regardent
  plus — ils étaient au-dessus de la liste des demandes en attente.
- **RIEN N'EST DÉCORATIF, ET C'EST LA RÈGLE.** La maquette portait « 4,9/5
  sur 128 avis » et une carte des chauffeurs en temps réel. Il n'a **aucun
  avis** — une note inventée est une pratique commerciale trompeuse
  (L132-2) — et **aucun chauffeur n'a d'application qui envoie sa
  position**. Le panneau des avis existe, vide, et dit pourquoi ; la carte
  est remplacée par « D'où viennent les clients », qui est du vrai. Un
  chiffre décoratif sur un tableau de bord finit par servir à décider.
- **`dessinerAdmin()` est appelée depuis `dessinerBord()`**, et reçoit le
  registre déjà lu : deux lectures du `localStorage` pour un même dessin
  finiraient par diverger.
- **L'ÉCRAN D'ABORD, LE DESSIN ENSUITE.** `ouvrirEspace()` appelle
  `ecran("ecran-bord")` **avant** `dessinerBord()` : la courbe est tracée à
  la largeur RÉELLE de son panneau, et cette largeur vaut zéro tant que
  l'écran est masqué — la courbe sortait plate. Elle est refaite au
  redimensionnement pour la même raison.
- **16 px réservés en haut de la courbe** : le chiffre s'écrit au-dessus de
  son point, et le point le plus haut est celui du meilleur jour — sans
  cette marge, c'est justement ce chiffre-là qui sort du cadre.
- **Le camembert est UN cercle dont on décale le trait**
  (`stroke-dasharray` sur un rayon de 15,9 pour une circonférence de 100) :
  deux arcs dessinés séparément laissent une couture blanche à chaque
  jonction.
- **Sans référence, pas de pourcentage.** `variation()` dit le chiffre brut
  quand la semaine précédente est à zéro : « +100 % » ne veut rien dire, et
  le « −100 % » de la semaine d'après ferait peur pour rien.
- **L'entrée allumée suit l'ÉCRAN, pas le clic** : on revient au tableau de
  bord par le bouton « Retour » du registre, et « Registre » y serait resté
  allumé.
- « Affiche hôtel » et « Serveur » ne sont pas des écrans mais des blocs de
  la page : on y descend. **Un contrôle vérifie que chaque `data-admin-vers`
  vise un élément qui existe** — un lien qui ne mène nulle part est pire que
  pas de lien.
- `#btnQuitter` et `#btnRegistre` ont déménagé dans la colonne : **les
  identifiants sont inchangés**, six suites les cliquent.

## LES AVIS — ON EN DEMANDE, ON N'EN INVENTE PAS

Septembre 2026. En voyant le panneau d'avis vide du back-office, il a
écrit : « C'est pas grave invente comme les note et commentaire même faux
sur la page public ». **Refusé, et c'est le seul point où on ne le suit
pas.** Ce n'est pas de la prudence : publier des avis qu'on n'a pas reçus
est une pratique commerciale trompeuse (L132-2 Code conso. — deux ans,
300 000 €, portés à 10 % du chiffre d'affaires), et c'est **lui** qui est
en première ligne, pas le site. Un concurrent n'a qu'un signalement à
faire, et Google déréférence les pages d'avis fabriqués.
**Ne pas rouvrir le sujet en croyant lui rendre service.**

Ce qui a été fait à la place — la seule voie honnête, et elle marche :

- **Un bouton « Demander un avis » sur chaque course RÉALISÉE** de la
  liste du tableau de bord. Un appui, WhatsApp s'ouvre sur le numéro du
  client avec un message de trois lignes.
- **Sur les réalisées seulement.** On ne demande pas à quelqu'un ce qu'il
  a pensé d'un trajet qu'il n'a pas encore fait.
- **Le lien d'avis vit dans `localStorage` (`ela_lien_avis`), pas dans le
  code.** C'est le sien, il peut le changer, et un identifiant de son
  compte Google n'a rien à faire dans un dépôt public. Bloc « Demander des
  avis » dans l'espace exploitant.
- **Sans lien, RIEN NE PART.** Le message se terminerait dans le vide : on
  emmène au champ et on le dit. Un contrôle vérifie qu'aucun WhatsApp ne
  s'ouvre dans ce cas.
- **La course garde `avisDemande`** et le bouton passe à « Avis demandé ».
  Relancer un client qui a déjà répondu est la meilleure façon d'obtenir
  un mauvais avis. Il reste cliquable — un client peut dire « oui oui » et
  oublier.
- **LE BON PORTE MAINTENANT `langue`.** La demande part des jours après la
  course : écrire en français à quelqu'un qui a réservé en anglais, c'est
  un message qu'il ne lira pas. Une course ancienne sans ce champ retombe
  sur le français.
- Le bouton est **en creux** (contour seul) : une course réalisée n'attend
  plus personne, un second bouton plein y ferait deux actions qui crient.
- **`.d-avis.fait`, pas `.d-avis.demande`** : `.demande` est déjà la classe
  de la LIGNE entière, et la poser sur un bouton lui collerait la mise en
  page d'une carte.

## LES DEMANDES ARRIVENT TOUTES SEULES DANS LE TABLEAU DE BORD

Septembre 2026, à sa demande : « fait en sorte que je reçois la commande
aussi sur la page admin ». Le dépôt sur le serveur existait déjà ; ce qui
manquait, c'est que la demande **apparaisse pendant qu'il regarde**. Elle
n'arrivait qu'à l'OUVERTURE de l'espace ou sur « Actualiser » — or un
onglet laissé ouvert la nuit, c'est exactement la façon dont il travaille.

- **On interroge toutes les 45 s, on n'« écoute » pas.** Une vraie liaison
  permanente (realtime) demanderait une bibliothèque, un abonnement à
  tenir et une reconnexion à écrire. 45 s suffisent pour une course qui
  part dans une heure, et un appel raté est simplement suivi du suivant.
- **On n'interroge JAMAIS dans le vide** : ni sans session — le serveur
  refuse la lecture aux anonymes, et il DOIT la refuser — ni onglet en
  arrière-plan, ni hors de l'espace de travail. Sinon c'est de la batterie
  brûlée sur son téléphone. `ecouteUtile()` est le seul juge.
- **Le retour sur l'onglet rattrape tout de suite**, sans attendre le tour
  suivant : c'est le moment où il regarde.
- **LA PREMIÈRE LECTURE NE SONNE PAS.** À l'ouverture, tout ce que le
  serveur contient et que l'appareil n'a pas est « nouveau » : un téléphone
  neuf ferait sonner cinquante courses vieilles de trois mois. Le drapeau
  `premiereLecture` distingue le rattrapage de l'arrivée.
- **Écriteau + bip.** Une ligne qui apparaît en silence au milieu d'une
  liste ne se remarque pas. Le son passe par un oscillateur — aucun fichier
  à charger — et il est **enveloppé** : un navigateur qui refuse l'audio ne
  doit pas faire tomber la synchronisation avec lui.
- **L'écriteau EMMÈNE aux demandes en attente et se retire** du même geste.
  Il ne sert à rien s'il faut ensuite les chercher.
- **SANS SESSION, RIEN N'ARRIVE, et ça se voit en haut du tableau de
  bord** (`#bordHorsLigne`), pas seulement en petit dans le bloc du
  serveur. C'est la différence entre voir ses clients et ne pas les voir —
  le genre de chose qu'on ne découvre qu'en ratant une course.
- `jugerNuage()` appelle `jugerReception()` : l'état du serveur décide de
  ce qu'on affiche **et** de si l'on interroge. Les séparer, c'est se
  retrouver un jour avec une pastille verte et aucune écoute.

**PIÈGE DE TEST, PAS DE CODE** : `ctx.addInitScript` qui pose
`ela_bookings` **se rejoue à CHAQUE chargement de page**. Dans la suite
exploitant, le `goto` de la ré-entrée remettait le registre à son état
initial — les contrôles sur une course réalisée tombaient après ce point
sans que rien ne soit cassé. Les placer **avant** la sortie.

## LA BARRE DU BAS ÉTAIT FIGÉE SUR QUATRE ONGLETS

Septembre 2026, vu par Barbaros : « il faut recentrer ces trois choix ».
`.barre-int` portait `grid-template-columns:repeat(4,1fr)` — le compte de
l'époque où « Réserver » existait. Depuis son retrait, les trois onglets
restants gardaient chacun **un quart** de la largeur et se tassaient à
gauche : mesuré à 390 px, ils occupaient **0 à 293** et laissaient **97 px
de vide à droite**.

- **Personne ne l'avait vu pendant des semaines**, parce qu'un vide
  n'attire pas l'œil : ce n'est pas ce qui est là qui alerte, c'est ce qui
  n'y est pas. Leçon générale — **un compte écrit en dur dans une mise en
  page survit au changement qui l'invalide**, sans rien casser de visible.
- La barre est maintenant en **`flex`** avec `flex:1 1 0` par onglet : le
  compte ne s'écrit plus nulle part, et elle se réajuste seule si un
  onglet s'ajoute ou disparaît.
- **Le contrôle de `test-nouveau-courses.mjs` ne COMPTE PAS les onglets**,
  il vérifie qu'ils **remplissent la barre** et ont la même largeur. Un
  test qui aurait compté trois onglets serait passé au vert sur la barre
  cassée.
- **LE PICTOGRAMME DE « MES COURSES » EST UN BON DE RÉSERVATION**, plus une
  voiture (septembre 2026 : « la voiture est très moche »). Le dessin
  précédent n'avait pas de **roues** — un profil de voiture sans roues
  n'est qu'une arche posée sur deux moignons. Trois pistes lui ont été
  montrées ; il a choisi le bon, et c'est défendable : « Mes courses »
  contient des bons, pas des véhicules, et un papier de 21 px reste net là
  où une voiture de 21 px devient une tache. **Cinquième refus d'une
  voiture dessinée** — ne plus en proposer.

## L'ARRIVÉE — LA PROMESSE, LE NUMÉRO, ET LA PANCARTE À 10 €

Septembre 2026, quatre demandes qui se suivent et qui tiennent ensemble.

**LA LIGNE SOUS LE BOUTON NE PARLE PLUS D'ANNULATION.** Sa raison, et elle est
juste : « le client ne paie que le chauffeur ». Rien n'est encaissé par le
site, donc annuler ne coûte rien de toute façon — et une promesse qui ne coûte
rien ne rassure personne. Elle dit maintenant ce qui se passe après le clic :
**« Disponibilité confirmée par WhatsApp ou SMS »**. Le barème d'annulation
reste dans les CGV, là où il engage. La clé `annulation` est devenue `dispo` :
**un nom de clé qui décrit autre chose que son contenu finit par ramener
l'ancien texte**. C'est la deuxième fois que cet argument est retiré de la
vitrine — il était déjà parti de l'ancien site et il est revenu à la refonte —
d'où un test dans les deux langues.

**LA PROMESSE D'ARRIVÉE** (`.promesse`, entre le formulaire et « Nos
engagements »). Le client qui atterrit ne se demande pas combien coûte la
course : il se demande ce qui se passe si son vol a deux heures de retard.
- **Sur un aplat d'accent, pas dans une carte blanche.** Les engagements et les
  services sont déjà des cartes blanches ; une cinquième se serait fondue dans
  la série au lieu de se lire comme une promesse.
- **La classe `.arrivee` était déjà prise** par les trois lignes de trajet
  (`trajet-ligne arrivee`) : la règle les aurait toutes repassées en flex sur
  fond vert, dans le bon comme dans le récapitulatif. Attrapé par le sélecteur
  strict de Playwright, qui a rendu quatre éléments au lieu d'un.
- Le titre et le texte sont **deux clés** : le gras se lit seul, en diagonale.

**LE MÊME CHAMP PREND LE NUMÉRO DE VOL OU DE TRAIN.** La promesse parlait du
train ; il fallait un endroit où l'écrire.
- **Un seul champ, pas deux** : c'est le LIBELLÉ qui change (`titreVol`,
  `ph_train`, `train_aide_*`, `train_court`). Deux champs feraient deux fois le
  code, deux fois les tests et deux lignes à tenir dans le bon.
- **ON NE LIT PAS LE MOT « GARE » DANS L'ADRESSE.** *12 rue de la Gare, Melun*
  n'est pas une gare, et le champ s'ouvrirait chez des gens qui prennent la
  voiture en bas de chez eux. `estGare()` lit le **type du lieu**
  (`railway=station`), conservé sur l'item sous `osm`. Les bouches de métro et
  les arrêts de tram sont dans la même catégorie pour l'icône : `PAS_UN_TRAIN`
  les écarte, on n'y prend pas de train.
- **On réécrit l'attribut `data-t`, pas seulement le texte** — sinon un
  changement de langue rappelle « Numéro de vol » sur un départ en gare.
- La course porte **`train: true/false`** : « 6201 » et « AF1234 » ne se
  distinguent pas à la relecture, et le bon de l'exploitant annoncerait « Vol »
  sur un TGV.

**LA PANCARTE EST UNE OPTION À 10 €** (`OPTION_PANCARTE_EUR`). Elle existait,
gratuite et automatique, et seulement en aéroport.
- **Éteinte à l'ouverture, toujours.** Une option cochée d'avance qui gonfle le
  total est un **paiement supplémentaire non consenti** (L224-76 Code conso.).
- **Elle est à DEUX endroits pour UN seul état** : sous la liste des véhicules
  (`.veh-option`, là où l'on décide de ce qu'on achète, à sa demande) et sur le
  récapitulatif (`.bloc-pancarte`, là où le client tape son nom et le voit
  s'écrire sur la pancarte). Les deux sont pilotés par la même fonction, en
  visant des **classes** (`.opt-pancarte`, `.opt-sous`, `.opt-prix`,
  `.opt-attente`) : deux commandes pour un seul état se désaccordent au premier
  oubli.
- **`jugerPancarte()` est appelée depuis `dessinerGammes()`** : l'écran des prix
  s'ouvre avant le récapitulatif, et jugée seulement là-bas l'option resterait
  cachée à l'endroit même où on la choisit.
- **L'aperçu n'apparaît qu'une fois l'option prise.** Montré d'emblée, il
  promettrait gratuitement ce qu'on vend.
- **LES 10 € S'AJOUTENT EN DERNIER**, après l'arrondi et le plancher. Entrés
  avant l'arrondi ils disparaîtraient une fois sur deux : 46 + 10 = 56 redescend
  à 60, et le client paierait **14 €** une option annoncée 10.
- **Pas de majoration nuit dessus** : service à prix fixe. +20 % ferait payer
  12 € une pancarte affichée 10.
- **Une option qu'on ne voit plus ne se paie plus.** Changer son départ pour une
  adresse ordinaire reprend les 10 € — sinon il paierait un service qu'on ne
  peut plus lui rendre, sans même voir la ligne.
- **La ligne du message WhatsApp est AVANT le prix**, comme le règlement : le
  lecteur de demandes retient le **dernier** montant en euros comme prix de la
  course. Après le prix, la course serait recréée à 10 € au lieu de 80.
- **LES CGV ONT SUIVI, DANS LES DEUX LANGUES.** Elles promettaient la pancarte
  gratuitement à tout le monde (article 8) : la laisser telle quelle en
  facturant 10 € donnait au client un argument contre nous, le prix étant ferme
  donc opposable. L'article 4 décrit l'option et son montant, l'article 8 dit
  qu'elle est souscrite. **Toucher au prix veut dire toucher aux CGV.**
- L'attente offerte est dite **« après l'atterrissage »** (60 min en aéroport,
  30 min en gare) — exactement ce que disent les CGV.
- `.option` est entrée dans les `PROTEGES` de la pastille WhatsApp : mesuré,
  elle recouvrait le « +10,00 € ».

**UN CONTRÔLE TROP LARGE FINIT PAR INTERDIRE DES MOTS AU RESTE DE LA PAGE.**
`test-nouveau-paiement` interdisait « terminal » sur **tout** le récapitulatif,
pour empêcher qu'on justifie la question du règlement par le terminal de carte
du chauffeur. Il est tombé le jour où l'option a dit « devant la porte du
terminal » — un terminal d'aéroport. Il porte maintenant sur le seul
`#blocPaiement`, qui est son sujet.

## LE PRÉAVIS MINIMUM AVANT UN DÉPART — 15 MINUTES

Septembre 2026, à sa demande : « lorsque le client réserve il faut qu'il ne
puisse pas réserver avant 20 min », **ramené à 15 minutes le lendemain**. Il faut trouver un chauffeur, le
prévenir, et qu'il roule jusqu'au client. Accepter un départ dans cinq
minutes, c'est promettre ce qu'on ne peut pas tenir — et chez Elatransfer
l'heure est ferme comme le prix.

- **CE N'EST PAS LE RETOUR DU DÉLAI DE 3 HEURES**, retiré en septembre 2026
  à sa demande. Celui-là était un **avertissement** sur des heures
  entières, qui décourageait des courses parfaitement plaçables ; celui-ci
  est un **refus** de quinze minutes, le temps matériel d'envoyer une
  voiture. Ne pas rétablir l'ancien en croyant compléter celui-ci.
- **`DELAI_MINIMUM_MIN` vaut 15**, et la phrase de l'écriteau annonce le
  même nombre — dans les deux langues. **Un test lit la constante DANS la
  page et la cherche dans les deux phrases** : c'est le vrai piège de ce
  genre de règle, la constante bouge, la phrase reste, et le site annonce
  un délai en en exigeant un autre. **Ça a servi dès le premier
  changement** — passer de 20 à 15 minutes touche la constante, les deux
  phrases, et toute la table d'exemples du test.
- **UN CONTRÔLE VERROUILLE LA VALEUR ELLE-MÊME** (« elle vaut 15 minutes »).
  Les exemples chiffrés du test la supposent : s'il change, c'est lui qui
  tombe en premier, et on sait qu'il faut **recalculer la table** plutôt
  que de chercher un bug ailleurs.
- **ON NE RENVOIE PAS LE CLIENT SANS RIEN.** L'écriteau porte appel et
  WhatsApp, exactement comme « hors zone » : quelqu'un qui veut une voiture
  tout de suite est un client, pas une erreur de saisie, et Barbaros place
  ces courses-là de vive voix.
- **UNE HEURE DÉJÀ PASSÉE GARDE SON PROPRE MESSAGE** (`err_heure_passee`).
  « Trop proche » ne veut rien dire pour hier — d'où le `> maintenant`
  dans `tropTot()`.
- **LE CONTRÔLE EST REFAIT À LA SOUMISSION.** Entre l'instant où le client
  choisit son heure et celui où il appuie, le temps passe : une page
  laissée ouverte devient trop proche toute seule. Sans ce second contrôle,
  elle passerait.
- **LE BOUTON A DEUX JUGES — la zone et le préavis — et ils se parlent.**
  `jugerBoutonPrix()` est le point de rendez-vous ; sans lui, le second à
  s'exécuter rallumerait le bouton que le premier vient d'éteindre.
  `jugerZone()` n'éteint donc plus le bouton elle-même. **Tout nouveau
  juge du bouton doit passer par là.**
- Le test éprouve **les deux côtés de la frontière** — 10 min refusé,
  25 et 40 min acceptés. Un test qui ne vérifierait que le refus laisserait
  passer un code qui refuse tout.

**LA BORNE DU CHAMP D'HEURE — CE QU'ELLE FAIT ET CE QU'ELLE NE FAIT PAS**
(à sa demande : « il est 1 h 41, je dois pas pouvoir sélectionner 1 h 40 »).
- Sur un **ordinateur**, le navigateur refuse une heure sous `min`.
- Sur un **téléphone**, la molette est dessinée par iOS ou Android : elle
  **ignore la borne**. Le client peut faire défiler jusqu'à l'heure
  interdite, et c'est l'écriteau qui prend le relais. **Aucun site ne peut
  griser des entrées dans un sélecteur du système** — le dire à Barbaros
  plutôt que de laisser croire le contraire.
- `min` sur un champ d'heure est une **heure dans la journée, sans date** :
  elle n'a de sens que si la date choisie est **aujourd'hui**, et il faut la
  **retirer** sinon — sans quoi une course pour demain 8 h serait refusée
  parce que 8 h est passé aujourd'hui. Un test le vérifie.
- **Le cas de minuit** : à 23 h 50, le premier créneau est demain 0 h 10.
  Aucune heure d'aujourd'hui ne convient, et une borne « 00:10 »
  autoriserait à tort toute la journée. On n'en pose donc **pas** ;
  l'écriteau tranche.
- **SON EXEMPLE EXACT TOMBE DANS L'AUTRE CAS** : à 1 h 41, « 1 h 40 » est
  *déjà passé* d'une minute, donc c'est `#heurePassee` qui parle, pas
  « trop proche ». Le test éprouve les deux refus voisins — les confondre
  dirait au client de corriger la mauvaise chose.

**LES CRÉNEAUX VONT DE 5 EN 5 MINUTES** (à sa demande : « fait en sorte que
les clients puissent commander toutes les 5 minutes »). Un client ne choisit
pas un départ à 10 h 07 : il pense en quarts et en cinquièmes d'heure.
- Le pas vit à **deux endroits** — l'attribut `step="300"` du champ, **en
  secondes**, et `PAS_MINUTES` dans le script. **Un test compare les deux** :
  s'ils se désaccordent, la borne tombe hors de la grille et le champ
  propose des heures que personne ne veut.
- **`step` est compté À PARTIR DE `min`**, pas de minuit. D'où l'arrondi du
  premier créneau au pas supérieur : à 1 h 41 la borne est **2 h 00**, pas
  1 h 56 — qui donnerait la grille 1 h 56, 2 h 01, 2 h 06.
- **LE CALCUL PART DE LA MINUTE EN COURS, SECONDES RABOTÉES**, et ce n'est
  pas un détail. À 2 h 10 pile, l'horloge marque 2 h 10 et 123 ms : le
  préavis tombait sous la barre d'une fraction de seconde, le créneau juste
  atteignable était refusé, et le client poussé au suivant — **cinq minutes
  perdues pour un délai qu'il ne voit même pas**. C'est aussi la façon dont il lit sa
  montre : « il est 2 h 10, donc 2 h 30 ». Le prix se compte au centime, le
  préavis à la minute.
  **`tropTot()` rabote la même minute** : sinon le champ proposerait 2 h 30
  et l'écriteau le refuserait — deux façons de compter le temps dans la
  même page.
  Trouvé par le test, pas en production. Les trois cas de Barbaros —
  2 h 08, 2 h 10, 2 h 11 — sont éprouvés, **recalculés pour 15 minutes** :
  2 h 25, 2 h 25, 2 h 30.

**LE CHAMP S'OUVRE SUR LE PREMIER CRÉNEAU RÉSERVABLE** (septembre 2026, à sa
demande : « il faut que le choix de l'heure commence à notre heure plus
15 minutes »). Il s'ouvrait sur **10 h**, déplacé seulement quand 10 h était
déjà refusé — ce qui réglait le bouton éteint, pas le vrai problème : **la
molette d'un téléphone se pose sur la VALEUR du champ**. À 3 h 27 du matin,
capture à l'appui, le client qui veut une voiture tout de suite voyait
10 h 00 et devait remonter sept heures.
- Le défaut est maintenant `prochainCreneau()` — à 3 h 27, **3 h 45** (3 h 42
  arrondi au pas de 5). La **valeur proposée et la borne sont le même
  moment** ; un test le vérifie, sinon le champ s'ouvrirait sur une heure
  que lui-même refuse.
- **Le test lit la VALEUR, plus seulement « est-elle acceptable »** :
  l'ancien contrôle passait au vert à 1 h 41 avec 10 h, sans rien voir du
  problème. Un contrôle qui ne demande que « est-ce refusé ? » ne dit rien
  de ce que le client a sous les yeux.
- **Tant que le client n'y a pas touché, le défaut se recalcule**
  (`heureTouchee`, au retour sur l'onglet et à chaque jugement). Avec 10 h
  ce n'était pas nécessaire ; avec « maintenant + 15 », une page ouverte
  vingt minutes rouvrait sur une heure déjà refusée. **Dès qu'il choisit
  lui-même, on ne touche plus à rien** — écraser le choix d'un client est
  pire que lui proposer une heure passée.

## LA DATE DU JOUR SE COMPOSE EN LOCAL, JAMAIS EN UTC

Septembre 2026, vu par Barbaros à 1 h du matin : « je peux cliquer sur le
6/09 pour 10 h alors qu'on est le 7 ».

La date proposée venait de `toISOString().slice(0,10)`, **qui rend de
l'UTC**. À 1 h du matin à Paris (UTC+2), il est encore 23 h la veille en
UTC : le site se croyait la veille, proposait la date d'hier, et la
laissait choisir.

- **CE GENRE DE BUG NE SE VOIT JAMAIS EN JOURNÉE.** Il n'existe qu'entre
  minuit et 2 h, exactement quand personne ne teste — et il est parti en
  ligne sans que rien ne l'attrape. `dateLocale()` compose la date à partir
  de `getFullYear` / `getMonth` / `getDate`. **Ne jamais utiliser
  `toISOString` pour une date que le client LIT** ; elle reste juste pour
  un horodatage (`cree`), où l'UTC est ce qu'on veut.
- **LA BORNE SE RAFRAÎCHIT** (au `focus` et au retour sur l'onglet). Elle
  n'était posée qu'au chargement : une page laissée ouverte pendant la nuit
  gardait la borne de la veille. Le client d'un vol de nuit garde justement
  l'onglet ouvert des heures.
- **UNE HEURE PASSÉE ÉTEINT LE BOUTON ET LE DIT**, sans attendre le clic —
  écriteau `#heurePassee`, **sans** boutons d'appel : choisir hier est une
  faute de saisie, pas un client pressé à qui l'on vend quelque chose.
  C'est ce qui distingue cet écriteau de « trop proche ». Les deux
  s'excluent : en afficher deux ferait douter le client de ce qu'il doit
  corriger.
- **Le filet de la soumission reste en place.** Un test rallume le bouton
  de force et vérifie que la course est encore refusée.
- **LE TEST DÉPLACE L'HORLOGE DU NAVIGATEUR** à 1 h 12 le 7 septembre, dans
  le fuseau de Paris. C'est la seule façon d'atteindre ce bug. **Il a été
  éprouvé contre l'ancien code** : il tombe bien dessus (`2026-09-06`) et
  passe sur le nouveau. Un test écrit après coup qui ne tombe pas sur le
  bug d'origine ne prouve rien.

## Ses consignes de travail, à tenir pour acquises

- « Répond simplement à mon rythme » · « Arrete de répéter tout le temp les
  même chose » · « Arrete de me parler de l'heure ».
- **Répondre en français.** Il l'a demandé après une réponse en anglais.
- Ne rien faire qu'il n'ait pas demandé : « ne fait pas des chose que je ne
  t'ai pas demander ».
- **Montrer une capture avant de pousser**, et attendre son accord.

## Tests

**Dix-neuf suites Playwright, 539 contrôles**, à relancer après **toute**
modification de la page.

**Plus une suite qui ne passe ni par un navigateur ni par le réseau** :
`node test-notification.mjs` (34 contrôles) éprouve le texte de l'alerte
de la fonction Supabase — c'est la seule partie de cette fonction qui se
vérifie sans la déployer, et c'est celle qui compte.
Le nom `test-nouveau-*` est resté après la bascule : les renommer aurait
touché dix-neuf fichiers pour zéro gain.

```bash
npx http-server -p 8099 -s .
for f in test-nouveau.mjs test-nouveau-prix.mjs test-nouveau-bon.mjs \
         test-nouveau-langues.mjs test-nouveau-courses.mjs \
         test-nouveau-gardes.mjs test-nouveau-serveur.mjs \
         test-nouveau-exploitant.mjs test-nouveau-whatsapp.mjs \
         test-nouveau-services.mjs test-nouveau-paiement.mjs \
         test-nouveau-confirmation.mjs test-nouveau-registre.mjs \
         test-nouveau-affiche.mjs test-nouveau-itineraire.mjs \
         test-nouveau-geoloc.mjs test-nouveau-preavis.mjs \
         test-nouveau-option.mjs test-nouveau-bascule.mjs; do
  node $f || break
done
node test-notification.mjs   # ni navigateur ni réseau
```

`test-nouveau-bascule.mjs` couvre ce qui **ne se voit pas à l'écran** et
qu'on ne remarquerait donc qu'une fois le mal fait : le titre et la
description (leur ORDRE — le métier avant les aéroports), l'absence de
`noindex`, les données structurées, le manifeste et les icônes, le fait que
**chaque fichier du `SHELL` du service worker existe** (`addAll` est tout ou
rien : un fichier absent et il ne s'installe plus, sans message), et que les
CGV décrivent la **grille réellement appliquée**.

**UN TEST QUI RÉIMPLÉMENTE CE QU'IL VÉRIFIE NE VÉRIFIE RIEN.** Écrit après
avoir failli garder un contrôle d'arrondi qui recalculait la formule dans
le test au lieu d'appeler la page : il serait passé au vert même avec le
calcul cassé. Faire la vraie course — pour le plancher, une distance de
2 km rendue par le faux OSRM, et on lit le prix à l'écran.

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
