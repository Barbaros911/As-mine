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

**Le registre ne vit que dans le navigateur (sans serveur).** `saveBooking` en garde 1000 (et
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
  existe pour eux. Coût zéro, testable en une semaine.
  **easyHotel EST partenaire depuis septembre 2026** — confirmé par Barbaros.
  La note précédente disait le contraire (« ce n'était qu'un cas de test de
  recherche d'adresse ») : c'était vrai jusqu'à ce qu'il signe. **Une note de
  ce fichier vieillit ; vérifier auprès de lui avant de s'en servir pour
  refuser quelque chose.**
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

**Décidé en septembre 2026** : **il ne conduit pas, il place seulement**
(« Je place seulement »). Elatransfer est donc une centrale de réservation,
et le taux de commission se règle désormais **par chauffeur**, dans le
carnet — il n'y a plus de taux global à trancher dans le code.

**Pas décidé** : statut juridique et **SIRET de Barbaros — À CRÉER, c'est le
point bloquant** · volume visé · clientèle cible (particuliers / hôtels /
entreprises) · budget · règle du temps d'attente.

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
| Berline (4 places) | 2,35 € | 30 € |
| Van (7 places) | 4,08 € | 50 € |

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
- **IL N'Y A PLUS DE MAJORATION DU TOUT** (septembre 2026) — voir la
  section dédiée plus bas. Le reste inchangé : TVA 10 % incluse, prix ferme,
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

## LA PAGE HÔTEL — L'ANALYSE QUI A PRÉCÉDÉ (FAITE DEPUIS)

> **Elle est construite.** Voir « LE MODE HÔTEL — LA GRILLE D'UN PARTENAIRE,
> DANS LE MÊME FICHIER » plus bas, qui dit ce qui existe aujourd'hui. La
> section ci-dessous garde l'analyse qui a mené à la décision — utile pour
> comprendre d'où elle vient, pas pour savoir ce que fait le site.

Septembre 2026. Il a apporté un cahier des charges tout écrit pour une page
`easyhotel-tremblay.html` : départ figé, sept destinations en menu, forfaits
au lieu du kilométrage, un seul bouton WhatsApp, pour qu'une réception
réserve en moins de trente secondes. **Le cadrage est bon** — c'est
exactement ce qu'une réception peut faire entre deux clients. **Rien n'a été
construit** : trois points ont été soulevés, il doit trancher.

**1. LE PARTENARIAT EST RÉEL — c'était mon objection, elle tombe.** Le mémo
disait « easyHotel n'est pas un partenaire » ; c'était vrai à l'époque du cas
de test, et Barbaros a confirmé depuis que ce ne l'est plus. **Il n'y a donc
plus d'obstacle à publier une page à leur nom.**

**LE LIBELLÉ EST TRANCHÉ : « easyHotel Aéroville »** (septembre 2026, à sa
demande). Le cahier des charges en donnait deux — « easyHotel Paris Charles
de Gaulle Villepinte » dans le contexte, « easyHotel Aéroville » comme départ
figé ; c'est le second. **Ne pas le réécrire** : c'est le nom que la réception
et l'hôtel emploient entre eux.
**MAIS L'ADRESSE POSTALE COMPLÈTE DOIT PARTIR DANS LE MESSAGE WHATSAPP** —
`10 rue de la Belle Borne, 93410 Tremblay-en-France`. Plusieurs easyHotel
entourent CDG : un nom de marque seul envoie le chauffeur au mauvais, à
5 h du matin, avec un vol à prendre. Le libellé est pour l'écran, l'adresse
est pour le chauffeur ; ce sont deux besoins différents et il faut les deux.

**2. LA GRILLE FORFAITAIRE PROPOSÉE LE FAIT PERDRE DE L'ARGENT SUR LE VAN.**
Comparé à ce que le site facture depuis le passage à 2,35 / 4,08 €/km
(distances approximatives — le calculateur est injoignable depuis cette
machine, à refaire exactement avant toute décision) :

| Van, de jour | Sa page | Le site | Écart |
|---|---|---|---|
| Orly | 125 € | ~180 € | **−55 €** |
| Disneyland | 120 € | ~160 € | **−40 €** |
| Beauvais | 240 € | ~290 € | **−50 €** |

En berline c'est l'inverse — il est au-dessus partout, ce qui est normal pour
un canal hôtel qui prend une commission. **Sauf Orly : 100 € sur la page,
~110 € sur le site.** Un client d'hôtel ouvre elatransfer.com en dix secondes.

**C'EST VOULU — IL A TRANCHÉ** (septembre 2026). Le van moins cher que le
site sur les longues courses est un **prix d'appel pour décrocher l'hôtel**,
pas une dérive. **Ne jamais « corriger » cette grille pour l'aligner sur le
kilométrage** : c'est exactement le genre de chose qu'une prochaine session
prendrait pour un défaut.
- **CONSÉQUENCE À NE PAS MANQUER : la page sera PUBLIQUE.** Une adresse
  devinée ou partagée, et n'importe qui réserve un van pour Orly à 125 € au
  lieu de 180. Elle doit donc porter **`noindex`** — comme `admin.html` et
  `/exploitant/` — et son adresse ne se communique qu'à l'hôtel. Ce n'est pas
  un secret, c'est une porte qu'on ne met pas dans Google.
- Et le jour où un autre hôtel arrive, **la grille est par HÔTEL**, pas
  globale : deux partenaires ne se négocient pas au même prix.

**3. CE SERAIT LA DEUXIÈME GRILLE DE PRIX DU PROJET**, et c'est la faute
évitée deux fois déjà : le calcul de l'espace exploitant réutilise
volontairement celui du client parce que **deux calculs qui divergent ne se
voient pas**. Il a changé ses tarifs le soir même ; une grille figée dans une
page à part serait périmée à la décision suivante.

**CE QUI MANQUE DANS LE CAHIER DES CHARGES POUR QU'UNE RÉSERVATION SOIT
EXPLOITABLE** — ce ne sont pas des détails, chacun casse une course :
- **aucune date** : à 23 h, « 6 h 00 » c'est quel jour ?
- **aucun téléphone** : le chauffeur à 5 h du matin appelle qui ?
- **rien n'arrive sur le serveur**, WhatsApp seulement : un envoi raté depuis
  la tablette de la réception et la réservation n'existe nulle part. C'est
  exactement le défaut corrigé deux jours plus tôt.
- **la provenance est perdue**, donc on ne saurait pas ce que l'hôtel
  rapporte — alors que c'est toute la raison d'être de l'affiche QR.
- **« berline 1–3 / van 4–7 »** : la berline fait **4** places. Un groupe de
  quatre paierait un van là et une berline sur le site.
- **le préavis de 15 minutes n'existe pas** sur cette page.

**CE QUI A ÉTÉ PROPOSÉ À LA PLACE : un MODE HÔTEL du site existant**, pas une
page autonome. `?h=<nom>` préremplit déjà le départ ; il ne manque que les
destinations fermées et les forfaits. On garde un seul code, un seul dépôt
serveur, la provenance, le délai — et **la grille hôtel vit à un seul
endroit**, à côté de l'autre. Une page autonome voudrait dire un second
logo, un second jeu de couleurs et une seconde grille à tenir, plus une
ligne de plus dans `construire.sh` sous peine de 404.

## Ce qui reste à faire

**Fait au 6 septembre 2026, ne pas le refaire** : optimisation mobile,
bandeau d'accueil, bouton de réservation, WhatsApp, formulaire, affichage
du prix, confirmation client, espace exploitant, application installable (PWA),
référencement, **registre et « Coller une demande »**, **affiche QR pour
les hôtels**.

1. **Les informations de l'éditeur** (voir ci-dessus) — le seul point qui
   rende le site non conforme aujourd'hui, et le seul que Claude ne peut
   pas produire.
2. ~~La gestion des chauffeurs~~ — **FAIT** (septembre 2026). Carnet avec
   les trois papiers, leurs dates d'expiration, l'alerte à 30 jours et
   l'avertissement sur le bon au moment de l'attribution. Voir la section
   dédiée. Reste à y verser les vraies fiches, ce que seul Barbaros peut
   faire — il lui faut les copies des papiers de ses chauffeurs.
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

## LES COURSES SONT GROUPÉES PAR JOUR

Septembre 2026. La liste du tableau de bord était **à plat**, triée par date
croissante — ce qui met une course de la semaine dernière restée ouverte
**avant** celle de demain, sans que rien ne le dise. Barbaros travaille la
nuit : à dix courses il ne voyait plus sa journée.

- **« EN RETARD » N'EST PAS UN JOUR, C'EST UN AVERTISSEMENT.** Une course
  dont l'heure est passée et qui n'est ni réalisée ni refusée demande quelque
  chose : soit elle a été faite et il faut la clore, soit elle a été oubliée.
  La nommer par sa date la noierait parmi les autres. Elle emprunte **le
  rouge de l'attente** — c'est la même chose qu'elle dit — et ce sont les
  deux seuls rouges du tableau de bord.
- **SUR LES RÉALISÉES, « en retard » NE VEUT RIEN DIRE** : une course faite
  hier est une course d'hier, pas un oubli. Le titre redevient une date.
- **Les titres sont posés AU FIL de la liste**, pas calculés à part : les
  courses sont déjà triées, et deux parcours finiraient par diverger.
- **Le test ne vérifie pas la PRÉSENCE des titres mais leur ORDRE** — en
  retard, aujourd'hui, demain, puis la suite. Un contrôle de présence serait
  passé au vert sur un ordre inversé. Même leçon que la barre du bas.
- **PIÈGE DE TEST, ENCORE LE REGISTRE.** Le bloc qui éprouve les jours
  **remplace** `ela_bookings` pour poser des dates précises ; les contrôles
  suivants travaillent sur les courses d'origine. Sans sauvegarde-restitution,
  la suite s'arrête sur un délai d'attente en cherchant une demande qui
  n'existe plus. **Le registre est un état partagé, pas un décor local** —
  même famille que `addInitScript` qui se rejoue à chaque chargement.

## SAISIR UNE COURSE REÇUE PAR TÉLÉPHONE

Septembre 2026, à sa demande : « il faut aussi créer un formulaire pour que
je puisse créer facilement des courses ». « Coller une demande » ne couvrait
que le client qui **écrit** ; quand un hôtel **appelle**, il aurait fallu
fabriquer un faux message WhatsApp pour le coller.

- **ELLE ENTRE `confirmee`**, contrairement à une demande collée. Une demande
  venue d'un client attend une réponse ; une course saisie soi-même a déjà
  été convenue de vive voix, personne n'attend qu'on la valide.
- **LE PRIX SE CALCULE** (« Calculer le prix depuis les adresses »), par le
  **même chemin que côté client** — recherche d'adresse, itinéraire, grille,
  majoration, arrondi. C'est ce qui garantit qu'on annonce au téléphone le
  prix que le site aurait donné. **Deux calculs qui divergent ne se voient
  pas** : on le découvre le jour où un client compare, et le prix est ferme
  donc opposable. Un test vérifie l'égalité au centime avec la suite client.
- **LES ADRESSES RETENUES SONT RÉÉCRITES DANS LES CHAMPS.** La recherche rend
  le premier résultat ; si ce n'est pas le bon Ibis, le kilométrage est faux
  et le prix avec. Barbaros doit **voir** ce sur quoi il annonce un montant.
- **LE PRIX RESTE MODIFIABLE** : c'est une négociation, pas un tarif imposé.
  Et si le calcul échoue, la saisie à la main continue de marcher — elle a
  toujours marché.
- **La majoration suit la date et l'heure SAISIES**, pas l'instant présent :
  une course prise à 2 h du matin pour mardi midi n'est pas une course de
  nuit.
- **Le chauffeur est facultatif** — on prend la course, on le cherche
  ensuite. Son nom vient du carnet (`dessinerChauffeurs()` remplit la liste :
  sans cet appel on retaperait « Mehmet » avec une casse différente à chaque
  fois, ce qui rend l'historique illisible).
- **On ouvre le bon juste après**, et ce n'est pas un confort : c'est là que
  s'affiche l'avertissement sur les papiers du chauffeur.
- **Même contrôle de téléphone que côté client**, sur les deux numéros.
- **Piège rencontré** : `btnNouvelleCourse` était **déjà pris** par le bouton
  « Réserver une autre course » du site client. Deux éléments pour un
  identifiant, et l'écouteur se branche sur le mauvais.

## LA CARTE DU TRAJET — LEAFLET, ET LA PREMIÈRE DÉPENDANCE DU SITE

Septembre 2026, à sa demande : « une belle carte comme Maps ». Le client voit
la route qu'on lui facture, et c'est ce qui rend le prix compréhensible.

**C'EST LA SEULE DÉPENDANCE EXTÉRIEURE DE LA PAGE**, et elle a été acceptée
pour une raison précise : Leaflet est en licence libre, sans dépendance
lui-même, et **rien ne casse s'il n'arrive pas**. Ne pas s'en servir comme
d'un précédent pour en ajouter d'autres.

- **ELLE NE PEUT JAMAIS EMPÊCHER DE RÉSERVER.** Le chargement est enveloppé,
  et le seul échec possible est « pas de carte » : cadre masqué, hauteur
  nulle, aucun trou dans la page, et le tunnel continue. Un client dans un
  parking d'aéroport n'a parfois aucun réseau. **Six contrôles éprouvent ce
  cas-là en premier**, et ils tournent toujours — la machine de test est hors
  ligne, donc le CDN n'y répond jamais.
- **UNE MINUTERIE DE 5 s SUR LE CHARGEMENT.** Un script bloqué par un proxy
  ou un bloqueur de publicité **ne déclenche pas toujours `onerror`** : la
  promesse resterait en attente pour toujours. Même leçon que le
  presse-papiers. La promesse échouée est oubliée, pour qu'un client qui
  retrouve du réseau puisse réessayer.
- **« lon, lat » CHEZ LES CALCULATEURS, « lat, lon » CHEZ LEAFLET.** Inversé,
  le tracé part dans l'océan Indien — la carte s'affiche très bien, elle est
  simplement fausse. Un faux Leaflet **enregistre** ce qu'on lui donne et le
  test vérifie que les points tombent en Île-de-France. C'est le même piège
  que l'ordre des points dans l'appel à ORS.
- **ORS REND LE TRACÉ SANS QU'ON LE DEMANDE** : il est dans la réponse qu'on
  lit déjà, et on le jetait. La carte ne coûte donc **aucun appel
  supplémentaire** sur le niveau qui sert aujourd'hui. Pour Mapbox et OSRM,
  `overview=false` est devenu `overview=simplified&geometries=geojson` — la
  raison d'origine (« le site n'affiche aucune carte ») est tombée avec la
  carte. **`simplified` et pas `full`** : à l'échelle d'un téléphone, le
  tracé complet pèse dix fois plus pour un trait identique à l'œil.
- **LE DRAPEAU DE LEAFLET S'EN VA — et c'est la DEUXIÈME fois dans ce
  projet.** La version 1.9 glisse un drapeau ukrainien dans son attribution ;
  Barbaros l'avait déjà fait retirer de l'ancien site.
  `attributionControl.setPrefix("")`. **« © OpenStreetMap » reste** : les
  données sont sous licence ODbL, la citation des contributeurs est une
  obligation. On retire le préfixe de la bibliothèque, jamais la source.
- **LA CARTE NE SE MANIPULE PAS** (`dragging`, `touchZoom`, `scrollWheelZoom`
  à `false`). Dans un tunnel de réservation elle se REGARDE : un pouce qui
  fait défiler la page ne doit pas déplacer la carte au lieu de descendre à
  la liste des prix.
- **ELLE EST TRACÉE APRÈS `ecran()`, jamais avant** : Leaflet mesure son
  cadre à la création, et un cadre encore masqué mesure zéro — la carte sort
  grise. Exactement le piège de la courbe du tableau de bord. D'où aussi le
  `invalidateSize()` différé et la hauteur fixe en CSS, qui empêche la page
  de sauter quand la carte arrive.
- **LES TUILES SONT LE POINT FAIBLE, ET IL EST CONNU.** La politique
  d'OpenStreetMap déconseille l'usage commercial soutenu : elle peut couper
  sans préavis. Le jour où `CLE_MAPBOX` est remplie, on passe aux tuiles
  Mapbox — même bibliothèque, une ligne. Elles sont **désaturées** en CSS :
  la couleur doit rester au tracé et aux deux repères.
- **LA BIBLIOTHÈQUE EST DANS LE DÉPÔT (`carte/`), PLUS CHEZ UN CDN**
  (septembre 2026, après « je ne vois pas la carte s'afficher »). Elle
  venait de cdnjs avec une **minuterie de 5 s** sur son chargement : 147 Ko
  chez un serveur étranger, DNS et poignée de main TLS compris, sur un
  téléphone en 4G. Cinq secondes, c'était court — et ce délai serré ne
  protégeait **rien**, puisque personne n'attend la carte : le prix est déjà
  à l'écran. Le réflexe venait des appels d'itinéraire, où une réponse lente
  retarde le prix. Ici elle ne retarde que la carte.
  Ce qu'on gagne à la servir soi-même : plus de serveur tiers à joindre,
  **mise en cache par le service worker** (même origine, réponse complète —
  une réponse opaque de CDN ne se cache pas), donc carte disponible hors
  ligne dès la deuxième visite, et personne d'extérieur ne peut changer ce
  code sous nos pieds. Licence BSD 2-Clause, redistribution permise, le
  fichier porte son copyright et `carte/LICENSE-leaflet.txt` l'accompagne.
  La minuterie reste, à **15 s** : elle ne sert plus qu'à ne pas laisser une
  promesse en suspens pour toujours.
- **`construire.sh` DOIT COPIER `carte/` — c'est LE point de rupture.** La
  recette ne publie que ce qui y est nommé : un fichier oublié marche
  parfaitement en local, où le serveur de test sert le dépôt entier, et
  reste introuvable en ligne. Deux contrôles de `test-nouveau-bascule.mjs`
  le verrouillent — dont un qui lit **ce que la page va chercher** plutôt
  qu'une liste à tenir à jour.
  **Le premier jet de ce contrôle passait au vert avec la ligne retirée** :
  il cherchait le mot « carte » dans le fichier entier, et mes propres
  commentaires en parlaient. Il ne lit maintenant que les lignes de
  commande. Un test qui trouve ce qu'il cherche dans une phrase
  d'explication ne vérifie rien.
- **`NOS_DOSSIERS` DANS `sw.js`.** `siteVoisin()` traite tout sous-dossier
  comme un site vitrine à laisser tranquille — juste pour `/alfredo/` ou
  `/demos/`, faux pour `/carte/`. Sans cette liste, le service worker
  laissait passer la bibliothèque sans jamais la garder : l'inverse de ce
  qu'on gagne à l'avoir sortie du CDN.
- **LE RENDU EST MAINTENANT ÉPROUVÉ À CHAQUE EXÉCUTION.** La troisième
  partie de `test-nouveau-carte.mjs` dépendait d'un fichier posé à la main
  dans le bac à sable, le CDN étant injoignable d'ici. Servie par le site,
  la vraie bibliothèque est là de toute façon — et un contrôle vérifie que
  les deux fichiers viennent bien du site et **jamais d'un CDN** : un retour
  en arrière ne casserait rien dans la suite, et la carte manquerait de
  nouveau chez lui.
- **PAS DE CARTE DE TRAFIC SUR LE TABLEAU DE BORD** (demandée, écartée).
  TomTom et HERE ont des paliers gratuits, ce n'est pas le problème :
  Barbaros ne conduit pas, il place. Une carte rouge et verte ne change
  aucune décision — c'est la carte des chauffeurs en temps réel de la
  maquette, refusée pour la même raison. Ce qui déciderait quelque chose,
  c'est une **durée tenant compte du trafic à l'heure de la course** (Mapbox
  sait le faire), affichée sur une ligne. **C'est fait — voir juste en
  dessous.**

### « PAS CLAIR », « PLUS VITE », « LE TRAFIC » — LES TROIS DEMANDES SUIVANTES

Septembre 2026, dès que la carte s'est enfin affichée chez lui. Trois
choses distinctes, et **aucune des deux premières ne se voit depuis un
ordinateur** — c'est pour ça qu'il a fallu qu'il les signale.

- **LE FLOU VENAIT DE LA DENSITÉ D'ÉCRAN, pas de la taille du cadre.** Un
  téléphone dessine 2 à 3 pixels physiques pour 1 pixel de page : les
  tuiles de 256 px étaient étirées sur 512 ou 768 pixels d'écran.
  `detectRetina:true` fait demander à Leaflet les tuiles du **zoom
  supérieur** et les dessine deux fois plus petites — deux fois plus de
  détail pour la même surface, **sans qu'OpenStreetMap ait à servir des
  images « @2x »**, ce qu'il ne fait pas. Mesuré : à DPR 2, une tuile de
  256 px occupe désormais 256 pixels d'écran (1:1, net) au lieu de 512 ;
  à DPR 1 rien ne change. Le coût est 8 tuiles au lieu de 4.
- **LA DÉSATURATION ÉTAIT DE TROP** : à `saturate(.55)` le fond de plan
  virait au gris-vert et les rues ne se distinguaient plus. Elle est à
  `.8`, le contraste à `1.06`. La règle tient toujours — la couleur
  appartient au tracé et aux deux repères — mais **un fond de plan effacé
  n'est plus un fond de plan**. Hauteur portée de 190 à 220 px.
- **LA LENTEUR ÉTAIT UNE MISE EN SÉRIE.** La bibliothèque ne partait
  qu'**après** la réponse du calculateur d'itinéraire, dans le `.then()` :
  deux attentes bout à bout alors qu'elles n'ont rien à voir. Elles partent
  maintenant **ensemble**, au clic sur « Voir mon prix » (`prechargerCarte()`),
  avec une **préconnexion** au serveur de tuiles au passage — un DNS et une
  poignée de main TLS, c'est une demi-seconde en 4G, prise sur du temps
  déjà perdu. On ne précharge **pas** à l'accueil pour autant : un visiteur
  qui ne réserve pas n'a pas à payer 200 Ko de cartographie.
  **Le test n'éprouve pas une durée** — une durée dépend de la machine et
  finit par tomber un jour de charge — il éprouve l'**ordre** : itinéraire
  ralenti à 2 s, on regarde à 900 ms, le prix n'est pas là et la
  bibliothèque est déjà demandée. Éprouvé contre l'ancien code : il tombe.
- **WAZE N'A PAS D'API PUBLIQUE**, et ce n'est pas une question de budget :
  elle est fermée depuis des années, ce qui reste (*Waze for Cities*) rend
  des incidents aux collectivités, pas des temps de trajet. **Google Maps**
  en a une, mais elle exige un compte de facturation **et** impose
  d'afficher le résultat sur une carte Google — donc de changer aussi le
  fond de plan, et de payer les deux. **Mapbox fait la même chose,
  gratuitement, sans imposer sa carte.** Ne pas rouvrir ce débat : la
  réponse ne dépend pas de nous.
- **LE PROFIL EST `driving-traffic`, PAS `driving`.** Les deux noms se
  ressemblent, le résultat non — sur un Roissy → Paris un mardi à 8 h,
  l'écart se compte en dizaines de minutes, donc en vols ratés. Un seul mot
  dans l'URL, exactement ce qu'une réécriture emporte sans rien casser de
  visible : un test le verrouille.
- **`depart_at` DEMANDE LE TRAFIC À L'HEURE DE LA COURSE**, pas à celle du
  clic — une commande passée à 23 h pour demain 8 h n'a rien à voir avec la
  circulation de 23 h. Il n'est envoyé que si le départ est **dans les 7
  jours** : hors de sa fenêtre Mapbox **refuserait l'appel**, le site
  retomberait sur ORS, et on perdrait **en silence** la précision qu'on est
  venu chercher. Un repli qui se déclenche trop tôt ne se voit pas.
- **« trafic pris en compte » N'EST ÉCRIT QUE SI C'EST VRAI** — donc
  seulement quand Mapbox a répondu. ORS et OSRM rendent un temps théorique.
  L'écrire quand même ferait de la mention une décoration, et un client qui
  se fie à une heure d'arrivée la vérifie une fois, une seule. Deux
  contrôles : présent avec Mapbox, **absent** sans.
- **RIEN DE TOUT ÇA NE TOURNE AUJOURD'HUI** : `CLE_MAPBOX` est vide, il n'a
  pas de compte. Le code est écrit et éprouvé, la marche à suivre est dans
  `MAPBOX.md`, et c'est le seul geste qui lui revient.
- **IL A REPOUSSÉ LE SUJET (septembre 2026) — « laisse tomber pour
  l'instant ».** Mapbox lui a demandé sa carte bancaire à l'inscription et
  il n'a pas voulu la donner. **Ne pas le relancer là-dessus.** Ce qui a été
  dit, et qui reste vrai le jour où il y revient : Mapbox crée un jeton
  public **automatiquement** à l'inscription, avant la question du paiement
  — il suffit d'aller le chercher sur `account.mapbox.com` ; et **TomTom**
  fait la même chose (itinéraire avec trafic réel) **sans carte**, 2 500
  appels par jour, ce serait un quatrième niveau à brancher exactement comme
  Mapbox. Le site n'en souffre pas : la marge de 5 à 10 minutes posée sur la
  durée couvre déjà une bonne part de ce que le trafic apporterait.

### LA DURÉE ANNONCÉE PORTE UNE MARGE — FOURCHETTE DE +5 À +10 MINUTES

Septembre 2026, à sa demande : « il faut que le temps de trajet soit une
estimation de 5-10 minutes plus longue ».

- **CE QUE RENDENT LES CALCULATEURS EST UN TEMPS DE ROULAGE, PAS UN TEMPS DE
  COURSE.** Il ne compte ni la sortie du parking, ni les bagages, ni les deux
  minutes à chercher le client devant un terminal. Annoncé sec, on promet une
  heure d'arrivée qu'on tient une fois sur deux — et chez Elatransfer l'heure
  engage comme le prix.
- **UNE FOURCHETTE, PAS UN NOMBRE UNIQUE.** Un chiffre seul se lit comme une
  promesse ; « 43–48 min » se lit comme ce que c'est. Et une marge **fixe**
  de dix minutes serait absurde sur un trajet court — 12 min deviendraient
  22, presque le double. `MARGE_DUREE_MIN` / `MARGE_DUREE_MAX`,
  `dureeAnnoncee()`.
- **`course.min` RESTE BRUT** : la marge est posée à l'AFFICHAGE. Sinon, le
  jour où l'on rangerait la durée sur le bon, elle partirait déjà majorée et
  une seconde marge s'ajouterait à la première sans que personne ne le voie.
- **LE PRIX NE BOUGE PAS D'UN CENTIME.** Il est un kilométrage, la durée n'y
  entre pas — c'est ce qui permet d'être prudent sur l'heure sans être
  malhonnête sur le montant.
- **LA DURÉE A QUITTÉ LA CARTE DE GAMME**, et ce n'est pas une perte : elle
  était **identique sur les quatre lignes** (c'est la même route) et elle est
  déjà écrite au-dessus. En fourchette, « 43–48 min · arrivée 10:43–10:48 »
  ne tenait plus sur une ligne de téléphone. Ce qui reste sur la carte, c'est
  l'**heure d'arrivée**, celle que le client compare à l'heure
  d'enregistrement de son vol. Mesuré : une ligne, à 390 px, court trajet
  comme long.
- **LE TEST NE REFAIT PAS L'ADDITION** : le faux ORS rend 2 700 s, donc la
  page doit afficher « 50–55 min » et **jamais** « 45 min ». Un contrôle qui
  recalculerait la marge passerait au vert même si elle disparaissait des
  deux côtés. Éprouvé marges à zéro : les trois contrôles tombent.

## LA RÉPONSE ARRIVE SUR LE SITE, ET LA BARRE DU BAS A QUATRE ONGLETS

Septembre 2026, sur deux captures. Quatre reproches d'un coup : « le client
n'est pas censé savoir que sa demande part sur WhatsApp s'il ne lit pas la
ligne du bas » · « s'il n'a pas WhatsApp comment je pourrai être au
courant ? » · « il faut que je puisse répondre aussi via le site » · « en
bas il faut écrire accueil, mes réservations, mes trajets effectués, sorte
de logo pour me contacter directement sur WhatsApp… c'est nul comme ça ».

### « EN ATTENTE » ÉTAIT UN MENSONGE, PAS UN MANQUE

C'est le vrai défaut que ses captures montraient : trois courses toutes
« EN ATTENTE », dont une de 3 h 20 du matin qu'il avait certainement déjà
traitée. **« Mes courses » n'affichait que ce qui dort dans le téléphone du
client, figé à l'instant de la réservation.** Le client rappelle pour
demander ce qu'il a déjà.

- **`etat-course`** (troisième fonction Supabase) est la seule porte : la
  règle de sécurité interdit la lecture aux anonymes et **doit**
  l'interdire — la clé du site est publique, une policy de lecture
  exposerait les noms, téléphones et adresses de tous les clients.
- **LA CLÉ EST LE COUPLE RÉFÉRENCE + TÉLÉPHONE.** La référence seule est
  séquentielle donc devinable : il suffirait de compter pour lire les
  courses des autres. Le numéro ne sort jamais du téléphone du client.
- **Elle ne rend que ce que porte déjà le lien `?ok=`** — statut, prénom du
  chauffeur, son numéro, véhicule, heure. Jamais les adresses, le nom, la
  chambre ni le prix : le client a tout le reste sur son propre bon.
- **Le chauffeur n'est rendu que sur une course confirmée ou réalisée.** Sur
  une course en attente, Barbaros a pu écrire un nom pour se souvenir de qui
  rappeler — l'envoyer promettrait une voiture qui n'a rien accepté.
- **UN APPEL QUI ÉCHOUE NE FAIT JAMAIS RECULER UN ÉTAT.** `nuage.etat()`
  rend `null` sur un échec et l'appelant garde ce qu'il a. Écrire
  « attente » sur un serveur muet repasserait au neutre une course
  confirmée — exactement le défaut qu'on répare. **C'est le contrôle qui
  compte le plus** : il ne se voit pas à l'œil et coûterait un client qui
  croit sa voiture annulée.
- **On n'interroge que ce qui peut encore changer** : une course réalisée ou
  refusée ne bougera plus. Un test compte les appels.
- **Rien à faire dans Supabase** : ni table, ni colonne, ni policy. Elle se
  déploie seule à chaque poussée (`fonctions.yml`).

### « EN ATTENTE » ET « CONFIRMÉ » ÉTAIENT DE LA MÊME COULEUR

Trouvé en relisant sa capture. La règle d'origine était juste — « l'état est
en OR, jamais en vert : rien n'est confirmé tant que Barbaros n'a pas
répondu » — mais le passage à la palette « Encre & céladon » a remplacé l'or
par le vert PARTOUT : « en attente » portait `accent-encre` sur
`accent-clair`, c'est-à-dire **exactement les valeurs de `.ok`**. Les deux
pastilles étaient indiscernables, et la seule information que le client vient
chercher — a-t-on répondu ? — ne se lisait plus.
**Une couleur nommée par son rôle suit le rôle ; une couleur nommée par sa
teinte ramène la teinte.** Deuxième fois dans ce projet.
Désormais : attente = neutre, **confirmé = la seule pastille colorée**,
terminé et non prise = gris cerclé. Si tout criait, plus rien ne crierait.

### QUATRE ONGLETS, ET LE DERNIER N'OUVRE PAS UN ÉCRAN

- **Accueil · Réservations · Trajets · WhatsApp.** Les libellés sont
  **courts** — à quatre sur 390 px chacun dispose de 97 px ; le titre complet
  (« Mes trajets effectués ») vit sur l'écran, où il a la place.
- **Les réservations sont ce qui attend encore** (attente, confirmée), les
  trajets ce qui est fini (réalisée, **et refusée**). Un refus n'est pas un
  trajet, mais il est fini : le laisser dans les réservations ferait attendre
  une réponse déjà donnée.
- **L'onglet WhatsApp porte un vrai `href`, pas un `data-ecran`**, et ne
  s'allume jamais : il quitte le site. Le test ne compte donc plus les
  onglets — il vérifie que chaque onglet **qui ouvre un écran** en ouvre un
  différent.
- **LA BULLE WHATSAPP FLOTTANTE A ÉTÉ RETIRÉE** avec tout son mécanisme
  (`__jugerPastilleWa`, `PROTEGES`, `.efface`). Elle et l'onglet étaient le
  même bouton, au même endroit, de la même couleur — et la bulle était la
  moins bonne des deux : visible sur le seul accueil, elle recouvrait ce qui
  passait dessous, d'où tout ce mécanisme pour l'effacer. **Ne pas la
  remettre.** Les tests qui la visaient éprouvent maintenant la RÈGLE
  (« aucun élément fixe ne recouvre un bouton »), qui vaut pour tout ce
  qu'on ajouterait demain.
- **« CONTACT » A CÉDÉ SA PLACE, PAS SON CONTENU.** Le numéro et les trois
  documents légaux sont descendus en **pied d'accueil** — c'est là qu'on les
  cherche sur n'importe quel site, et **la LCEN exige qu'ils restent
  accessibles sans compte, pas qu'ils aient un onglet**. Un test éprouve le
  CHEMIN depuis l'accueil, pas la présence de l'écran : un écran qu'aucun
  lien n'ouvre n'est pas accessible.

### CE QUI SE PASSE QUAND ON APPUIE, ÉCRIT AVANT LE BOUTON

Trois lignes numérotées au-dessus de « Confirmer », pas sous lui : une
phrase posée sous un bouton se lit après le clic, c'est-à-dire trop tard.
Elles disent aussi ce qui rassure vraiment — **la demande arrive chez
Elatransfer même si le message WhatsApp n'est pas envoyé**.

**ET LA RÉPONSE À SA QUESTION : OUI, IL EST AU COURANT SANS WHATSAPP.**
`nuage.deposer()` part à chaque confirmation, indépendamment du message :
la demande arrive dans son tableau de bord. Ce qui manquait, c'est que le
site disait le contraire.

**MAIS WHATSAPP CONTINUE DE S'OUVRIR TOUT SEUL, ET C'EST DÉLIBÉRÉ TANT QUE
L'ALERTE TELEGRAM N'EST PAS BRANCHÉE.** C'est aujourd'hui son **seul**
avertissement instantané : le webhook de `nouvelle-demande` n'est toujours
pas posé. Le retirer maintenant, c'est une demande de 5 h du matin que
personne ne voit avant le lendemain. **Ne pas supprimer l'ouverture
automatique avant que le webhook Telegram fonctionne** — et le jour où il
fonctionne, c'est la première chose à faire.

### « VOTRE DEMANDE N'A PAS PU NOUS ÊTRE TRANSMISE » — UNE PANNE INVENTÉE

Septembre 2026, capture à l'appui : « j'ai fait une commande sur le site
mais quand j'envoie et que je reviens dessus je vois ça » — l'écriteau rouge
du bon, alors que rien n'était cassé.

**LA CAUSE ÉTAIT L'ORDRE.** `nuage.deposer()` partait **après**
`window.open(WhatsApp)`, c'est-à-dire à l'instant précis où iOS met la page
en arrière-plan pour changer d'application. Safari y gèle le JavaScript et
coupe les requêtes en cours ; au retour, le minuteur de huit secondes se
réveillait et abandonnait un appel qui n'avait jamais eu sa chance.

**Un client qui lit « votre demande ne nous est pas parvenue » ne réserve
pas ailleurs — il ne réserve plus du tout.** C'est le pire endroit du site
où mentir.

- **LE DÉPÔT PART MAINTENANT EN PREMIER**, et WhatsApp reste ouvert **dans
  le même tick** que le clic — ce qui est la seule chose qui compte pour
  Safari, qui n'autorise l'ouverture d'un onglet que dans la foulée d'un
  geste. Rien n'est attendu entre les deux : `deposer` est **lancé**, pas
  attendu. **L'ordre change, la vieille règle est intacte** — ne pas la lire
  comme une autorisation de mettre un `await` avant `window.open`.
- **`keepalive:true`** sur la requête : le navigateur s'engage à la mener à
  terme même si la page est mise de côté ou fermée. Sans lui, l'ordre ne
  suffirait pas — la requête partirait puis serait abandonnée une
  milliseconde plus tard.
- **`reprendreDepot()` — on ne crie pas à l'échec depuis l'arrière-plan.**
  Tant que `document.hidden` est vrai, un échec ne veut rien dire. On attend
  le retour sur l'onglet, on réessaie **une fois**, et on ne tranche
  qu'après. Une boucle transformerait un vrai refus du serveur en appels
  sans fin sur le forfait du client ; le repli WhatsApp est là pour ça.
  Filet de 30 s au cas où l'événement de retour ne vienne jamais.
- **LE TEST SIMULE LE PASSAGE EN ARRIÈRE-PLAN** (`document.hidden` redéfini
  + `visibilitychange` rejoué) et fait échouer le PREMIER dépôt seulement.
  C'est la seule façon d'atteindre le défaut : sur le banc la page reste
  visible, et le dépôt raté serait retenté tout de suite. **Éprouvé contre
  l'ancien code : il rend mot pour mot la phrase de sa capture.**
- Un contrôle vérifie l'**ordre** (`window.__ordre`), un autre la présence
  de `keepalive` dans la page. Les deux tombent si on revient en arrière.

### « IDENTIFIANTS REFUSÉS » NE DISAIT PAS QUOI FAIRE

Septembre 2026, Barbaros : « j'arrive pas à me connecter ». L'écran affichait
**la même phrase quoi qu'il arrive** — mot de passe faux, compte non
confirmé, connexion par e-mail désactivée dans Supabase, serveur muet.
Quatre pannes, quatre gestes, un seul message. `nuage.connexion` rendait un
booléen et jetait la réponse du serveur.

**C'est la leçon de « `lister()` n'a plus de catch », à l'autre bout du
site** : une panne qu'on ne sait pas nommer ne se répare pas.

- `nuage.connexion` rend maintenant `{ok, raison, brut}` et `raisonConnexion()`
  traduit le message du serveur en geste. **On regarde `msg`,
  `error_description`, `error_code` ET `error`** : Supabase a changé deux
  fois la forme de ses erreurs, et celle qu'on aurait choisie serait
  forcément celle qui disparaît.
- **Quand on ne sait pas nommer, on recopie le message brut.** Un message
  étrange qu'on peut lire vaut mieux qu'un message clair qui ment.
- **LE PIÈGE LE PLUS PROBABLE EST « Auto Confirm User »** : la case n'est pas
  cochée d'office quand on crée un utilisateur depuis le tableau de bord
  Supabase. Le compte existe, le mot de passe est le bon, la connexion est
  refusée — et on cherche une heure du côté du mot de passe. C'est écrit
  dans `SUPABASE.md` et le site le dit lui-même.
- **Supprimer un compte ne fait rien perdre** : les policies autorisent
  `authenticated` en général, jamais un compte précis, et les courses
  appartiennent à la table. Recréer est plus simple que réinitialiser depuis
  un téléphone.
- Quatre cas éprouvés dans `test-nouveau-serveur.mjs`, plus le retour du
  bouton à l'état utilisable : laissé sur « … » et désactivé, il ferait
  croire à une connexion en cours pour toujours.

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

### LE TITRE D'ACCUEIL DIT QUI, QUOI ET OÙ

Septembre 2026, sur sa relecture commerciale : « le client doit comprendre
qui tu es + ce que tu fais + où tu opères en une seconde ». Il avait raison,
et sa remarque a découvert un défaut plus grave que le style.

- **LE SOUS-TITRE VENDAIT DEUX PRESTATIONS QU'ON NE PEUT PAS RÉSERVER.**
  « Transferts privés, **mises à disposition** et **déplacements sur
  mesure** » — la mise à disposition a été retirée du site en septembre 2026,
  et « sur mesure » n'existe nulle part. Le paragraphe `seo_texte` avait été
  nettoyé à l'époque ; **ce titre-là avait été oublié**. Un site qui décrit
  une prestation qu'on ne peut pas commander est une promesse en l'air.
- **« à Paris et en Île-de-France » NE TIENT PAS DANS LE TITRE.** Mesuré :
  27 caractères pour une largeur qui en tient 21 à cette taille — il cassait
  en trois lignes avec « France » toute seule. Le titre dit donc **« à
  Paris »**, ce que cherche un visiteur qui atterrit à Roissy, et le
  sous-titre ouvre aussitôt à **« Toute l'Île-de-France »** : ses clients
  réservent depuis Argenteuil et Saint-Denis, un titre qui les exclurait leur
  ferait croire que ce n'est pas pour eux.
- **LE BOUTON DIT « VOIR MON PRIX », ET C'EST LE SEUL POINT OÙ ON NE L'A PAS
  SUIVI.** Il proposait « Réserver mon trajet ». Deux raisons : le bloc
  s'intitule **déjà** « Réserver un trajet » cinq centimètres au-dessus — un
  bouton qui répète le titre de sa propre carte n'ajoute rien ; et **le clic
  ne réserve pas, il affiche un prix**. « Voir les tarifs et véhicules »
  n'était pas bon non plus : trop long, et « les tarifs » laisse croire à une
  grille. C'est le même arbitrage que sur l'ancien site, pour la même raison.

### LE BANDEAU EST DEVENU UNE VRAIE ACCROCHE

Septembre 2026, sa relecture suivante : « Le site commence directement avec
du contenu fonctionnel : *Réserver un trajet / Simple, rapide et sécurisé*.
C'est fonctionnel, mais pas suffisamment premium ni commercial. Je veux une
vraie Hero. » Cinq lignes : le titre, les destinations, le prix ferme, un
bouton, et la réassurance.

- **« à Paris et en Île-de-France » EST REVENU DANS LE TITRE**, et la note
  du dessus n'est plus qu'à moitié vraie : ce qui ne tenait pas, c'était
  27 caractères sur **deux** lignes. Le titre est maintenant coupé **à la
  main en trois** — « Votre chauffeur privé / à Paris / et en Île-de-France ».
  Un titre d'affiche se compose, il ne se subit pas.
- **LE NOM DE LA MARQUE N'EST PAS RÉPÉTÉ DANS LE BANDEAU**, alors qu'il le
  demandait. « ELATRANSFER » est écrit en 23 px **à deux centimètres
  au-dessus**, dans l'enseigne, sur tous les écrans. L'écrire deux fois dans
  le même regard ne dit pas la marque plus fort : ça mange la seule ressource
  rare du bandeau — la hauteur — au détriment de ce que le visiteur cherche.
  Dit à Barbaros ; il tranchera s'il y tient.
- **LE TEXTE N'EST PLUS EN `position:absolute`, ET C'EST CE QUI PERMET TOUT
  LE RESTE.** Posé en `inset:0`, il obligeait `.hero` à porter une **hauteur
  fixe** (268 px) : toute ligne ajoutée serait sortie par le bas **en
  silence** — la photo ne bouge pas, le texte disparaît. Dans le flux, c'est
  le contenu qui donne la hauteur. Seuls la photo et le voile restent en
  absolu, ils n'ont rien à mesurer. Un contrôle vérifie que **rien ne sort du
  bandeau par le bas**.
- **LES 74 px DE MARGE BASSE NE SONT PAS DE LA RESPIRATION** : la carte
  « Réserver » remonte de 46 px par-dessus. Sans eux, elle recouvrirait la
  ligne « 24 h/24 » — exactement le défaut du bandeau de cookies sur l'ancien
  site.
- **LE BOUTON DU BANDEAU NE RÉSERVE RIEN**, il descend au formulaire et pose
  le curseur dans le champ de départ. Il n'y a rien à réserver tant qu'on ne
  sait pas d'où à où. **Le défilement est lancé d'abord, le focus arrive
  380 ms après** : le navigateur amène de force un champ focalisé à l'écran,
  et un focus posé en premier annule l'animation qu'on vient de lancer.
- **C'EST LUI QUI PAIE LA HAUTEUR DU BANDEAU.** Le formulaire ne tient plus
  dans le premier écran — la note « ne pas le remonter » de l'ancien site est
  caduque ici. Le marché est explicite : le bandeau prend la place, il rend
  une action. Un contrôle mesure que **le bouton reste dans les 844 px** ;
  s'il en sort un jour, le bandeau aura seulement éloigné la réservation.
- **LE SOUS-TITRE N'A PLUS DE `max-width`.** Les 30 ch dataient de l'époque
  où c'était une phrase ; c'est devenu une liste de destinations, et une
  liste qui casse en deux se lit comme deux listes. Un contrôle vérifie
  qu'elle tient sur **une** ligne.
- **UN IPHONE SE FAIT 320 px**, et le titre y passait à **quatre** lignes.
  Les coupures écrites à la main ne protègent que de la casse qu'on a
  prévue ; celle-là se règle à la taille (26 px sous 360 px). Deux contrôles
  à 320 px.
- **DISNEYLAND EST UNE DESTINATION, PAS UNE OFFRE.** Le nommer est un usage
  descriptif — on dit où l'on conduit. **Ne pas en refaire un « pack »** : il
  a été retiré à sa demande, c'était le premier des deux.

### CE QUE LE BANDEAU A CASSÉ — LA BARRE DU BAS MANGEAIT « VOIR MON PRIX »

Septembre 2026, trouvé par les suites juste avant la mise en ligne. **Le
défaut le plus coûteux de la soirée, et il était invisible.**

Le bandeau plus haut a poussé « Voir mon prix » à **774–827** pendant que la
barre du bas occupe **784–844**. Sa moitié basse passait **derrière** la
barre : un client qui ouvre la page, remplit le formulaire et appuie au
milieu du bouton **ouvrait l'onglet « Trajets »**. Il ne voyait pas son prix,
il changeait d'écran, sans le moindre message.

- **LA NOTE « le formulaire entier tient dans le premier écran, ne pas le
  remonter » N'ÉTAIT PAS DE LA COQUETTERIE.** Elle protégeait exactement ça,
  et je l'ai enfreinte en croyant ne coûter qu'un défilement.
- **LA RÈGLE EXISTANTE NE COUVRAIT PAS CE CAS** : le contrôle des éléments
  flottants de `test-nouveau-bon` **exclut explicitement `.barre`**, parce
  qu'elle est légitime et toujours là. C'est précisément pour ça qu'il en
  fallait une autre — **ce qui est toujours là ne se remarque plus**.
- **CE QUI A PAYÉ LES 68 px : le bloc « Réserver un trajet / Simple, rapide
  et sécurisé ».** C'est exactement celui qu'il avait désigné en demandant
  une vraie accroche. Le bandeau dit maintenant qui l'on est, ce qu'on vend
  et à quel prix, et il porte un bouton qui descend ici : répéter le titre
  juste en dessous, avec une icône de 50 px, c'était accueillir deux fois.
  Une correction de mise en page qui supprime un doublon vaut mieux qu'une
  correction qui grignote cinq marges.
- **LE TÉMOIN DE LANGUE VISAIT CE BLOC** — `[data-t="reserver_titre"]`, dans
  quatre contrôles de `test-nouveau-langues`. Il vise désormais
  `[data-t="btn_prix"]` : **un témoin doit viser ce qui ne peut pas
  disparaître**, ici le bouton sans lequel il n'y a pas de réservation.
- **LE SYMPTÔME N'AVAIT AUCUN RAPPORT AVEC LA CAUSE.** `test-nouveau-option`
  s'arrêtait sur un délai en cherchant `.veh-carte`, parce qu'un
  `click({force:true})` avait atterri sur la barre et ouvert l'écran des
  trajets. **`force:true` ne signale pas un bouton recouvert : il clique à
  côté et continue.** Une suite qui n'affiche ni réussite ni échec est un
  échec — ne jamais la lire comme « pas concernée ».
- **LE PREMIER JET DU NOUVEAU CONTRÔLE PASSAIT AU VERT SUR LA VERSION
  CASSÉE.** Il était placé **après** le clic sur le bouton du bandeau, donc
  sur une page déjà défilée : il lisait 365 px là où le client voit 774. Un
  contrôle de position se mesure **à l'arrêt, avant tout geste**. Éprouvé
  ensuite contre l'ancien code : il rend « reçoit : onglet ».

### L'ESPACE EXPLOITANT A SON PROPRE MANIFESTE

Septembre 2026, à sa demande : « comment je peux l'enregistrer sur mon
téléphone ». **Le piège n'était pas dans le geste, il était dans le
fichier** : `manifest.webmanifest` déclare `start_url: "./"`, et **iOS comme
Android lisent le manifeste de la page qu'on ajoute, pas son adresse**. Une
icône posée depuis `?exploitant=1` aurait donc rouvert **le site client** —
et rien à l'écran n'aurait expliqué pourquoi.

- `manifest-exploitant.webmanifest`, `start_url: "./index.html?exploitant=1"`,
  **mêmes icônes** : un jeu à moitié changé est pire qu'un ancien cohérent.
- **L'ÉCHANGE SE FAIT EN TÊTE DE PAGE**, dans un script placé juste après le
  `<link rel="manifest" id="manifeste">`. Posé plus bas, le manifeste
  d'origine serait déjà chargé quand on le remplacerait.
- **`construire.sh` DOIT LE COPIER** — même point de rupture que `carte/` :
  oublié, il marche en local (où le serveur sert tout le dépôt) et reste
  introuvable en ligne. Un contrôle lit les seules lignes de commande.
- Le mode exploitant continue de suivre l'**ADRESSE**, jamais l'appareil :
  sans le paramètre on reste côté client, y compris sur son téléphone.
- **LE MANIFESTE EST AUSSI DÉCLARÉ SUR `/exploitant/index.html`**, la page de
  redirection (septembre 2026, après « quand je clique c'est toujours la
  version publique qui s'affiche »). « Ajouter à l'écran d'accueil » lit le
  manifeste de la page **affichée au moment du geste** : cette page redirige
  en quelques millisecondes, mais rien ne garantit l'instant où le doigt
  appuie. Sans manifeste ici, un iPhone retombe sur le site CLIENT. Le
  **même** fichier que la page d'arrivée — deux manifestes pour un seul
  espace se désaccorderaient au premier changement.
- **UNE ICÔNE POSÉE AVANT LE 8 SEPTEMBRE 2026 AU SOIR POINTE SUR LE SITE
  CLIENT, ET RIEN NE PEUT LA CORRIGER À DISTANCE.** Le manifeste n'existait
  pas en ligne avant cette mise en ligne : le raccourci a figé
  `start_url: "./"` à l'instant où il a été créé. Il faut **le supprimer et
  le refaire**. Le redire si le symptôme revient — c'est la première chose à
  vérifier, avant de chercher un défaut.

### LE SERVICE WORKER RANGEAIT TOUTES LES PAGES SOUS UNE SEULE CLÉ

Septembre 2026, trouvé en cherchant pourquoi l'icône ouvrait le site public.
Ce n'était pas la cause de son symptôme, mais c'était **un vrai défaut**, et
il ne se voit que hors ligne.

`sw.js` gardait **chaque** page HTML sous `./index.html`, quelle que soit
l'adresse demandée. Il suffisait donc d'ouvrir `/admin.html` ou
`/exploitant/` — deux pages qui ne font **que** rediriger — pour que leur
contenu remplace le site dans le cache. Un client hors ligne rouvrait ensuite
elatransfer.com et tombait sur « Ouverture de l'espace exploitant… », puis
sur l'écran du code.

- **Une seule clé pour un site qui a trois pages** : la même faute que
  `.service span span`, une règle écrite pour un cas unique le jour où il n'y
  en avait qu'un. `admin.html` la portait depuis toujours ; `/exploitant/` l'a
  rejointe le soir même en entrant dans `NOS_DOSSIERS`.
- La réponse est désormais gardée **sous sa propre adresse** (`c.put(req, …)`).
- **LE REPLI HORS LIGNE NE VAUT QUE POUR L'APPLICATION** (`estLApplication`).
  Servir `index.html` à l'adresse `/exploitant/` casserait tous ses chemins
  relatifs — icônes, service worker, bibliothèque de carte sont à la racine,
  pas dans le sous-dossier. **Mieux vaut une erreur franche qu'une page à
  moitié chargée.**
- **LE CONTRÔLE LIT LA SOURCE**, parce que le service worker **ne s'installe
  qu'en `https`** et reste donc injoignable depuis le serveur de test. Éprouvé
  contre l'ancien code : les deux contrôles tombent.

### « POURQUOI CHOISIR ELATRANSFER ? » ET LES CINQ SERVICES

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
- **« SUIVI DU VOL » RÉPÈTE L'ENCADRÉ VERT JUSTE AU-DESSUS**, et c'est
  assumé : l'encadré s'adresse au client qui atterrit et lui fait remplir son
  numéro de vol ; la carte est un argument dans une liste lue en diagonale.
  Les deux formulations sont différentes — **c'est la répétition mot pour mot
  qui fait relire**, pas le sujet commun. **À lui de trancher s'il veut n'en
  garder qu'un** : c'est signalé.
- **L'AVION DE LA CARTE N'EST PAS CELUI DE L'ENCADRÉ.** Posés à trois
  centimètres, deux dessins identiques se lisent comme un copier-coller.
  Celui de la carte penche et traîne une trajectoire pointillée : il ne dit
  pas « avion », il dit « on le suit ».
- L'icône de « Prix ferme » est une **étiquette**, pas la voiture héritée de
  « véhicules haut de gamme » — laissée en place, elle aurait dit « berline »
  à côté d'un titre qui parle d'argent.

**Les services** passent de trois à **cinq** : Aéroport · Hôtel · Gare ·
Professionnel · Mise à disposition.
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
- **LES VISITES SONT PORTÉES PAR LA MISE À DISPOSITION** (« Chauffeur à
  l'heure · Paris, Disneyland »), pas par une carte à elles. **Ce ne sont pas
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

### LE BOUTON WHATSAPP OUVRE UN CHOIX, PLUS UN MESSAGE TOUT ÉCRIT

Septembre 2026, à sa demande : « lorsqu'un client clique sur WhatsApp il doit
avoir des choix… il ne doit pas y avoir un message pré-empli ».

L'onglet envoyait « Bonjour, j'ai une question sur ma réservation » **à tout
le monde**. Un client qui voulait simplement réserver effaçait une phrase qui
n'était pas la sienne, et Barbaros recevait la **même** phrase de tous —
c'est-à-dire aucune information sur ce qu'on lui veut.

- **CE N'EST PLUS UN LIEN MAIS UN BOUTON** (`#btnWa`) : il n'emmène plus
  directement chez WhatsApp, il demande d'abord. Il garde
  `data-onglet="whatsapp"`, qui ne correspond à aucun écran et ne s'allume
  donc jamais.
- **QUATRE PORTES, ET UNE SEULE N'OUVRE PAS WHATSAPP.** « Réserver un
  trajet » ramène au formulaire et pose le curseur dans le départ : quelqu'un
  qui appuie sur WhatsApp pour demander « vous faites Orly ? » n'a pas besoin
  d'écrire, il a besoin d'un prix. C'est une réservation de plus et un
  message de moins. « Nous appeler » ouvre `tel:`.
- **LA RÉFÉRENCE DE SA COURSE EN COURS ENTRE DANS LE MESSAGE** quand
  l'appareil en connaît une (`derniereReference()`, les courses **non
  finies** — un trajet fait il y a trois mois n'est pas le sujet). Sans elle,
  Barbaros répond « laquelle ? » et perd un aller-retour, la nuit, sur dix
  conversations. Elle ne sort pas du téléphone du client : c'est SA course,
  dans SON message.
- **`window.open` EST DANS LE GESTE DU CLIC**, sans aucun `await` avant —
  Safari iOS bloque une fenêtre ouverte après une attente. Même règle que
  l'envoi de la demande.
- **LA FEUILLE EST AU-DESSUS DE LA BARRE** (z-index 60 contre 50). Une
  feuille passant dessous laisserait ses derniers choix inaccessibles :
  exactement le défaut corrigé le même soir sur « Voir mon prix ».
- **LES DEUX CONTRÔLES QUI LISAIENT LE `href` SONT TOMBÉS AVEC LUI.** Ils
  éprouvent maintenant le **chemin complet** — appuyer, choisir, et lire le
  lien qui part. Vérifier seulement que la feuille s'ouvre laisserait passer
  un choix qui n'envoie rien, un bouton mort au bout d'un menu.

### LES PAPIERS DES CHAUFFEURS ONT QUITTÉ LE TABLEAU DE BORD

Septembre 2026, à sa demande : « supprime les infos de chauffeur sur le
tableau de bord ». Il y sert à traiter et à créer des courses ; un carnet à
mettre à jour n'est pas une course.

- **LE PANNEAU N'EST PAS SUPPRIMÉ, IL A DÉMÉNAGÉ** dans `#ecran-chauffeurs`,
  en tête d'écran — là où l'on corrige une date, le geste suivant à portée de
  doigt. Une carte professionnelle ou une assurance périmée engage la
  responsabilité d'Elatransfer au moment de l'attribution (L3142-1) : le
  retirer entièrement, ce serait n'avoir plus rien à opposer.
- **L'AVERTISSEMENT QUI COMPTE VRAIMENT N'A PAS BOUGÉ** : celui du bon, à
  l'instant où l'on attribue. C'est lui qui arrête le geste.
- **`dessinerPapiers()` EST UNE FONCTION À PART**, appelée depuis
  `dessinerBord()` **et** `dessinerChauffeurs()`. Deux copies du même dessin
  finissent par diverger, et celle qu'on oublie est celle qui montre une
  assurance périmée comme si elle était valable.
- **LE CONTRÔLE ÉPROUVE LES DEUX FACES** — parti du tableau de bord, arrivé
  dans le carnet. Un contrôle qui ne dirait que « absent du tableau de bord »
  passerait au vert si on l'avait effacé.

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

### LE PAIEMENT AFFIRME AVANT DE DEMANDER

Septembre 2026, à sa demande : « pour un touriste étranger, je simplifierais
énormément ». Le récapitulatif disait le même fait **deux fois** : une phrase
dense sous le total (« Règlement au chauffeur, à bord, en espèces ou par
carte. Aucun paiement en ligne, aucune donnée bancaire ») et, une ligne plus
bas, le bloc qui pose la question.

- **LE TITRE RÉPOND D'ABORD.** « Comment réglerez-vous ? » posait une
  question à quelqu'un qui se demandait encore s'il allait devoir sortir sa
  carte sur un site inconnu. « **Vous payez directement votre chauffeur** »
  lève l'inquiétude, et les deux boutons deviennent le détail d'une chose
  déjà comprise. Un contrôle vérifie que **le titre n'interroge pas** (pas de
  « ? » final) plutôt que le libellé exact : une reformulation légitime ne
  doit pas faire tomber la suite, un retour à la question si.
- **LA CARTE AVANT LES ESPÈCES**, dans son ordre à lui — c'est ce que cherche
  un client qui atterrit sans un euro sur lui. Le contrôle compare les
  **positions à l'écran**, pas l'ordre dans le code : c'est ce que le client
  lit, et une règle de mise en page peut inverser les deux. Aucun test ne
  dépendait de l'ordre, tous visent `[data-paiement="…"]`.
- **PAS D'EMOJI, LES MÊMES DESSINS QU'AVANT.** Il proposait 💳 et 💶 ; un
  emoji change de forme d'un téléphone à l'autre et grossit mal — la règle
  vaut ici comme pour les voitures. Les deux SVG étaient déjà dans les
  boutons, le résultat à l'écran est celui qu'il décrit.
- **LE FAIT N'EST DIT QU'UNE FOIS**, et le contrôle **compte**. Un doublon ne
  casse rien : il alourdit, et c'est exactement ce qui ne se voit pas en
  relisant le code. Éprouvé contre l'ancien texte — il rend « 2 fois ».
- `paiement_note_ligne` a disparu des deux langues, remplacée par
  `paiement_note` (« Aucun paiement en ligne nécessaire »). **« aucune donnée
  bancaire » n'est pas perdu** : c'est la politique de confidentialité qui le
  porte, là où il engage.
- Le repli HTML de `err_paiement` justifiait encore la question par le
  terminal du chauffeur — du texte mort, écrasé au chargement par la
  traduction, mais **c'est par là que revient une formule retirée**.

### L'ADRESSE DE L'EXPLOITANT EST « /exploitant/ »

Septembre 2026, sur sa relecture : « ça ne doit absolument pas être présenté
au client comme une partie du site public », et sa solution — deux adresses,
`elatransfer.com` pour les clients, `elatransfer.com/exploitant` pour lui.

- **CE QU'IL DÉCRIT N'EST PAS CE QUE VOIT UN CLIENT — MESURÉ.** Aucun écran
  de l'espace n'est à l'écran côté client, `.admin-nav` est à `display:none`
  hors de `body.espace`, et **aucun lien visible n'y conduit**. Deux
  contrôles le verrouillent, et ils **mesurent des rectangles** plutôt que
  de relire le CSS : une règle d'affichage se casse sans bruit, il suffit
  d'un sélecteur trop large ou d'une classe posée trop tôt.
- **CE QU'IL A VU EST LE FICHIER, ET LÀ IL A RAISON** : les deux espaces
  vivent dans le même `index.html`. Un client télécharge donc **~190 Ko de
  back-office sur 523 Ko** — 37 % de la page — et le lit dans la source.
  Ce n'est pas une fuite de données (les courses sont sur le serveur,
  derrière la RLS) mais c'est du poids et une mauvaise impression.
- **`/exploitant/` EST UN RACCOURCI, PAS UN SECOND SITE.** `exploitant/index.html`
  redirige vers `index.html?exploitant=1`, exactement comme `admin.html`.
  **Ne jamais dupliquer `index.html`** : un second exemplaire divergerait au
  premier correctif. `admin.html` reste valide — des liens sont déjà partis
  avec.
- **`../` ET PAS `./`** : cette page vit dans un SOUS-DOSSIER. Le chemin
  relatif d'un raccourci se lit depuis l'endroit où il est posé, pas depuis
  celui où il mène ; recopié de `admin.html`, il boucle sur lui-même. Un
  contrôle lit le lien **dans la source**, pas dans la page ouverte : la
  redirection part en quelques millisecondes et un `getElementById` arrivé
  après rend `null` — **un contrôle qui accepte `null` ne vérifie plus rien**.
- **`construire.sh` DOIT COPIER LE DOSSIER**, et le contrôle cherche
  `cp -r exploitant`, **pas le mot « exploitant »** : il est déjà dans
  `manifest-exploitant.webmanifest`, copié deux lignes plus haut, et le
  contrôle serait passé au vert la ligne retirée. Même faute que le premier
  jet du contrôle de `carte/`. Éprouvé en supprimant la ligne : il tombe.
- `exploitant` et `carte` sont entrés dans les noms **réservés** de
  `construire.sh` (un site vitrine ainsi nommé écraserait le raccourci) et
  dans `NOS_DOSSIERS` de `sw.js` (sinon le service worker le traite comme un
  site voisin et ne le garde jamais).
- **CE QUI RESTE À FAIRE, ET QU'IL FAUT LUI MONTRER AVANT** : la vraie
  séparation, où `construire.sh` **retire** les écrans exploitant du
  `index.html` publié aux clients et sert le fichier entier sous
  `/exploitant/`. Une seule source, deux sorties — pas deux fichiers à
  tenir. Ce n'est pas un travail de nuit : la saisie de course de
  l'exploitant partage le calcul du prix avec le client, et **deux calculs
  de prix qui divergent ne se voient pas** — on le découvre le jour où un
  client compare, sur un prix ferme donc opposable.

### LE TABLEAU DE BORD NE SERT PLUS QU'À TRAITER ET À CRÉER

Septembre 2026, à sa demande : « laisse le tableau de bord seulement pour le
traitement de course et créer des courses ».

**Ce qui reste** : l'état du serveur, « Coller une demande » / « Saisir par
téléphone », les trois filtres, la liste des courses.
**Ce qui est parti AU REGISTRE** : les quatre chiffres, la courbe des
réservations, le camembert berline/van, « Où en sont les courses », « D'où
viennent les clients », les avis. **Rien n'est supprimé** — le registre est
l'écran des chiffres, on l'ouvre pour eux ; sur le tableau de bord ils
repoussaient les demandes hors de l'écran.

- **UN SEUL PANNEAU RESTE, ET CE N'EST PAS UNE EXCEPTION DE CONFORT.**
  « Papiers à surveiller » n'affiche **rien** quand le carnet est à jour : il
  ne coûte aucune place dans le cas normal, et son apparition **est**
  l'alerte. Une carte professionnelle ou une assurance périmée engage la
  responsabilité d'Elatransfer à l'instant où l'on attribue la course
  (L3142-1). L'enterrer dans un autre écran, c'est le lire trop tard.
- **LE DESSIN A SUIVI LES PANNEAUX.** `ouvrirRegistre()` appelle
  `ecran("ecran-registre")` **puis** `dessinerBord()` : la courbe et le
  camembert mesurent la largeur RÉELLE de leur cadre, et un écran masqué
  mesure zéro — la courbe sortait plate. **Troisième fois que ce projet
  tombe dessus** (la courbe de l'espace exploitant, la carte du trajet).
  Le gestionnaire de redimensionnement regarde donc les DEUX écrans.
- **Mesuré** : la première course passe de y = 761 à **y = 518**, et à ~290
  une fois connecté — le bandeau rouge du serveur disparaît alors.

### « ÇA PREND BEAUCOUP DE PLACE » — LE TABLEAU DE BORD A MAIGRI

Septembre 2026, à sa demande, après une capture où il fallait franchir près
de **700 px** d'en-tête, de chiffres et de boutons avant de voir une seule
demande — c'est-à-dire avant de voir son travail. Mesuré à 390 px :

| | Avant | Après |
|---|---|---|
| Les quatre chiffres | ~230 px | **81 px** |
| Une carte de course | 142 px | **111 px** |
| « Coller une demande » | ~160 px | **~75 px** |
| Les trois filtres | ~130 px | **44 px** |
| Première course | y = 761 | **y = 611** (et ~380 une fois connecté) |

- **LES QUATRE CHIFFRES PASSENT DE FRONT.** L'icône de 33 px est masquée sur
  téléphone : elle ne disait rien que le libellé ne dise déjà, et elle
  coûtait une ligne entière. **Elle reste dans le code et revient au-delà de
  900 px** — ce n'est pas le même écran, ce ne sont pas les mêmes
  contraintes. Le libellé, lui, reste : la position et la couleur ne portent
  jamais le sens toutes seules.
- **LA CARTE DE COURSE PASSE DE QUATRE LIGNES À TROIS.** Les deux lignes
  grises — « état · date · véhicule » puis « nom · depuis » — disaient la
  même chose au même endroit. **La durée d'attente remonte à côté de la
  référence** : c'est le signal d'urgence, et en fin de ligne grise il était
  le premier tronqué sur une adresse longue.
- **LA LIGNE GRISE TRONQUE, elle ne passe pas à la ligne.** Une carte dont la
  hauteur dépend de la longueur d'une adresse ne se parcourt plus du regard,
  et c'est exactement ce qu'on venait réparer.
- **LES DEUX PORTES D'ENTRÉE PASSENT CÔTE À CÔTE**, sans titre : « Coller une
  demande » se suffit à lui-même, un intitulé au-dessus ne faisait que le
  répéter. Le second reste en creux — sur dix courses, neuf arrivent par
  message.
- **LES TROIS FILTRES TIENNENT SUR UNE LIGNE** : le nombre puis le mot, à
  44 px de haut. Ils restent des BOUTONS — ce sont les seuls chiffres de
  l'écran sur lesquels on appuie, et 44 px est la mesure d'un pouce.
- **LES BOUTONS DE LA CARTE DESCENDENT À 38 px, ET PAS PLUS BAS.** Ils se
  pressent à la chaîne le soir, sur trois ou quatre courses d'affilée.
- **CE QUI RESTE À FAIRE SI ÇA REDEVIENT DENSE** : les quatre chiffres
  répètent deux des trois filtres (« en attente », « réalisées ») à 200 px
  d'écart. Les deux qui ajoutent quelque chose sont « Courses aujourd'hui »
  et « Encaissé cette semaine ». Ne pas y toucher sans qu'il le redemande —
  la duplication coûte peu maintenant qu'elle tient sur une ligne.

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
- **LE TARIF NUIT DU FLYER easyHotel N'EST PAS CONCERNÉ** et reste en place
  (+5 € de 21 h à 6 h, sans week-end). Ce n'est pas la même chose : l'une
  était une majoration en pourcentage sur un tarif kilométrique, l'autre est
  une colonne de prix **imprimée sur un papier posé à une réception**. Le
  jour où quelqu'un lira « il n'y a plus de majoration » dans ce fichier,
  cette grille-là n'est pas concernée.
- **Le contrôle qui compte est celui de `test-nouveau-exploitant`** : à 23 h
  et un samedi midi, le prix ne bouge pas. Éprouvé en réintroduisant la
  majoration — les deux contrôles tombent (70 € au lieu de 60). Une
  majoration qui revient en silence ne se voit pas : le prix s'affiche, il
  est simplement plus élevé d'un cinquième.

## LE MODE HÔTEL — LA GRILLE D'UN PARTENAIRE, DANS LE MÊME FICHIER

Septembre 2026, à sa demande, à partir du flyer easyHotel qu'il a fait
imprimer. Une réception réserve entre deux arrivées : elle lit la ligne du
papier posé sur son comptoir, elle appuie dessus, elle annonce le prix.

**CE N'EST PAS UNE PAGE À PART, ET C'EST LA DÉCISION QUI STRUCTURE TOUT.**
La question lui a été posée ; il a choisi l'écran dans `index.html`. Une
page autonome aurait voulu dire un second logo, un second jeu de couleurs,
une seconde grille — et surtout **tout à réécrire dedans** : le dépôt sur le
serveur, la provenance, le préavis de 15 minutes, la date, le téléphone, les
suites de tests. Une réception qui rate son envoi WhatsApp depuis sa
tablette, et la réservation n'existe nulle part — c'est exactement le défaut
corrigé quelques jours plus tôt. Ici : même fichier, même tunnel, même
dépôt ; seule l'ENTRÉE change. Rien à ajouter à `construire.sh`, et c'est
l'un des gains.

- **L'adresse est `?h=easyhotel-aeroville`.** `?h=` servait déjà à l'affiche
  QR d'un hôtel quelconque ; il reconnaît maintenant d'abord un
  **partenaire connu** (par sa clé, son nom ou ses alias) et ouvre l'écran
  de réception. Un hôtel non partenaire garde le comportement d'origine —
  son nom va dans le champ de départ, rien d'autre ne change. Un test
  verrouille les deux chemins.
- **LA GRILLE EST CELLE DU PAPIER, AU CENTIME**, et c'est le seul endroit du
  dépôt où recopier des nombres dans un test est juste : le flyer est la
  référence, l'écran est le copiste. Berline / Van, jour / nuit, sept
  destinations. **Ne jamais « corriger » ces montants** pour les rapprocher
  du kilométrage : sur les longues courses le van est **volontairement**
  moins cher que le site, c'est un prix d'appel pour décrocher l'hôtel,
  tranché par Barbaros.
- **LA NUIT DU FLYER : +5 €, de 21 h à 6 h, SANS week-end** (`nuitHotel`).
  C'est la seule majoration qui subsiste dans tout le projet.
- **CE QU'IL A CHANGÉ EN VOYANT LE FLYER** (septembre 2026) : le supplément
  van de 10 € est **supprimé**, l'aéroport CDG en berline passe de 25 à
  **35 € de jour et 40 € de nuit**, et les capacités s'alignent sur le site
  — **berline 4 places, van 7**, alors que le papier annonce 1–3 et 4–7.
  **Le flyer imprimé est donc périmé sur ces trois points** : à lui de le
  refaire avant de le distribuer.
- **LE NUMÉRO DU FLYER EST BON** — `+33 7 59 31 24 33`, le même que celui
  du site (`tel:+33759312433`). Il avait été signalé comme faux : c'était
  une **erreur de lecture de l'image**, un chiffre compté en trop. Barbaros
  l'a confirmé. Ne pas rouvrir le sujet.
  La leçon vaut au-delà : **on ne lit pas des chiffres sur une photo pour
  en tirer une alerte**. Quand un nombre compte, le comparer à une source
  du dépôt — ici `tel:+33759312433` était à un `grep` de distance et
  aurait tranché tout de suite.
- **LE FORFAIT VAUT DANS LES DEUX SENS**, à sa demande. Et l'échange des
  deux champs est **réel**, pas une inversion au moment de l'envoi : c'est
  ce qui fait que tout le reste tombe juste sans une ligne de plus — le
  numéro de chambre ne s'ouvre que sur un hôtel au DÉPART (un client qui
  arrive n'a pas encore de chambre), le numéro de vol prend sa formulation
  d'arrivée, et la pancarte n'est proposée que sur une prise en charge en
  aéroport, c'est-à-dire exactement ce retour-là.
- **« AUTRE DESTINATION » EST LA SORTIE**, et il l'a demandée. Sans elle,
  une réception qui envoie un client à Versailles rouvre le site public et
  **la provenance est perdue** — on ne saurait plus ce que l'hôtel rapporte,
  qui est toute la raison de cette page. Elle rend la main au calcul
  kilométrique ordinaire, et elle le **dit**.
- **« PARIS » N'EST PAS UNE ADRESSE**, c'est une ville de dix kilomètres de
  large. Le forfait de 80 € s'affiche d'emblée — c'est ce que la réception
  annonce pendant qu'elle saisit — mais il **tombe** si l'adresse retenue
  est à plus de 7 km du centre : un « Versailles » tapé là vendrait 45 km au
  prix de 10. On mesure la distance au centre et **pas le code postal**, qui
  n'est qu'un morceau de libellé écrit différemment selon la source.
- **LE TERMINAL VIENT DE `AEROPORTS`**, la table que le site tient déjà pour
  la recherche d'adresse. Deux listes de terminaux finiraient par diverger,
  et c'est celle qu'on oublie qui enverrait la voiture au mauvais bout de
  Roissy. Le libellé reprend **exactement** la forme du site (« Terminal 2E
  — Aéroport… ») : c'est elle que lit `terminalDuLibelle`, et c'est elle qui
  ouvre le champ « numéro de vol » et l'option pancarte. Un aéroport à un
  seul terminal (Beauvais) n'affiche pas le menu — on ne fait pas choisir
  entre une seule chose.
- **LES COORDONNÉES DE L'HÔTEL SONT DEMANDÉES À LA BASE ADRESSE
  NATIONALE**, comme n'importe quelle adresse du site. Celles écrites dans
  `HOTELS` ne sont qu'un **secours** pour une réception hors ligne. Elles ne
  changent aucun forfait — ils sont fixes — mais elles font le kilométrage
  d'« autre destination ». Le test donne au faux service des coordonnées
  **différentes** du secours et lit l'URL envoyée au calculateur : c'est la
  seule façon de savoir laquelle des deux a servi. Même leçon que le faux
  GPS de la géolocalisation.
- **LA GRILLE NE SORT PAS DANS GOOGLE** : `robots.txt` écarte `?h=`, et la
  page **réécrit** sa propre balise `robots` en `noindex`. On la RÉÉCRIT, on
  n'en ajoute pas une seconde : la page en porte déjà une, et deux consignes
  contradictoires dans la même en-tête ne se découvrent qu'en voyant la page
  rester dans les résultats des semaines plus tard. Un contrôle vérifie
  qu'il n'y en a **qu'une**, et un autre que le site public garde « index » —
  poser `noindex` sur le site ordinaire le sortirait de Google en entier.
- **LES ONGLETS « RÉSERVATIONS » ET « TRAJETS » RESTENT.** Ils avaient été
  masqués — la tablette d'un comptoir est un appareil partagé, et ces listes
  y accumulent les noms, téléphones et adresses de tous les clients passés
  devant. Mais le QR du flyer est aussi scanné par les **clients**, sur leur
  propre téléphone : les masquer leur retirait l'accès à leur réservation.
  Le mal certain était plus grand que le mal possible. **Si la tablette de
  la réception est vraiment partagée, la réponse est la navigation privée**,
  pas un onglet caché.
- **`hotelNom` ÉTAIT DÉJÀ PRIS** par le champ de l'affiche QR, dans l'espace
  exploitant. Deux éléments pour un identifiant, et `getElementById` rend le
  premier venu. Même faute que `btnNouvelleCourse`. Un contrôle cherche
  désormais **tous** les identifiants en double de la page.
- **LES CGV DÉCRIVENT LE FORFAIT PARTENAIRE**, dans les deux langues : il
  remplace le calcul kilométrique, il n'est ni arrondi ni soumis au montant
  minimum, sa majoration de nuit lui est propre, et toute destination hors
  grille revient au kilométrage. Toucher à un prix veut dire toucher aux
  CGV.
- `test-nouveau-hotel.mjs`, 61 contrôles.


### LA PAGE DE LA RÉCEPTION — DEUX ADRESSES, ET UN CODE QUI N'EST PAS DANS LA PAGE

Septembre 2026, en trois demandes : « on peut pas mettre un système dans
lequel ils peuvent placer les réservations, voir les historiques ? », puis
« je veux qu'il y ait un lien de connexion **vraiment destiné à la
réception** de l'hôtel uniquement », puis « fais-leur une vraie page,
prends exemple de ce qui se fait de mieux ». Marche à suivre complète dans
`RECEPTION-HOTEL.md`.

**LE PROBLÈME QU'ELLE RÉSOUT, ET IL VENAIT DE SA PROPRE QUESTION** :
« personne ne verra les infos des autres ? » La liste des courses vivait
dans le navigateur de l'appareil. Deux conséquences opposées et toutes deux
mauvaises : sur la tablette **partagée** d'un comptoir, chaque client voyait
les réservations des précédents ; sur n'importe quel autre appareil, la
réception ne voyait plus rien. La liste vient maintenant du **serveur**,
filtrée sur l'hôtel.

- **`?h=` est le flyer, `?reception=` est le comptoir.** La première est
  scannée par les CLIENTS et ne donne accès à rien d'autre qu'à la
  réservation. Un test éprouve les deux chemins.
- **LE BOUTON D'ACCÈS EST PROTÉGÉ DEUX FOIS** — l'attribut `hidden` et une
  règle CSS — et **le test regarde chaque protection séparément**. Éprouvé
  en cassant l'une puis l'autre : avec un seul contrôle sur ce qui se voit,
  la suite restait au vert sur la première brèche et n'aurait alerté qu'une
  fois la seconde ouverte aussi. Une défense en profondeur demande autant de
  contrôles que de défenses.
- **LE CODE EST VÉRIFIÉ PAR LE SERVEUR, jamais par la page.** C'est la
  différence assumée avec `CODE_EXPLOITANT`, qui vit dans le site en
  empreinte et s'attaque donc hors ligne, autant d'essais qu'on veut. Ici il
  vit dans les secrets Supabase (`HOTEL_<CLE>_CODE`), la comparaison est à
  temps constant, et un échec attend 700 ms. **Ce n'est pas un coffre** : ce
  qui protège vraiment, c'est que l'adresse ne sorte pas de l'hôtel et que
  le code soit long. Un contrôle cherche qu'aucun code ne traîne dans la
  page.
- **UN HÔTEL INCONNU ET UN CODE FAUX RENDENT LA MÊME RÉPONSE.** Les
  distinguer dirait à qui essaie des noms lesquels sont partenaires.
- **RIEN NE S'ANNULE DEPUIS UNE TABLETTE D'HÔTEL.** Le bouton transmet et
  pose `annulationDemandee` ; il ne touche **jamais** au statut. Une course
  annulée à 5 h du matin libère un chauffeur déjà engagé, et Barbaros seul
  peut le rappeler. Éprouvé en faisant envoyer un statut : le contrôle
  tombe.
- **LE FILTRE PORTE SUR `provenanceCle`, PAS SUR LE LIBELLÉ.** Un libellé
  est du texte destiné à un écran : le jour où « easyHotel Aéroville »
  devient « easyHotel Paris CDG », tout l'historique deviendrait invisible à
  son propre hôtel, sans que rien ne le signale. La clé est posée sur chaque
  hôtel au chargement (`HOTELS[k].cle = k`) plutôt que recopiée dans l'objet.
- **CE QUE LA RÉCEPTION VOIT** : ses courses, l'état à jour, la chambre, le
  nom **et le numéro** du client, le trajet, le véhicule, le prix et le mode
  de règlement — plus le chauffeur dès que la course est confirmée. Le
  téléphone du client avait d'abord été écarté au nom de la minimisation ;
  **Barbaros a tranché l'inverse et il a raison** : un client parti prendre
  son petit-déjeuner n'est joignable que là quand la voiture arrive. La
  minimisation interdit ce qui n'est pas nécessaire, pas ce qui sert.
- **LES ONGLETS « Réservations » et « Trajets » PARTENT SUR CETTE ADRESSE.**
  Ils lisent le stockage de l'appareil : sur une tablette de comptoir ils
  auraient affiché les clients précédents. Sur le téléphone d'un client, par
  l'adresse du flyer, ils restent. **Le raisonnement qui les avait fait
  garder valait pour le téléphone du client, pas pour le comptoir** — c'est
  la même note, corrigée par la distinction des deux adresses.
- **L'HÔTEL N'EST PAS RÉPÉTÉ SUR CHAQUE LIGNE.** Mesuré : son adresse
  complète mangeait la largeur et c'est la **destination** qui se faisait
  tronquer, la seule moitié que la réception ne connaît pas déjà. Le SENS
  reste écrit — sans lui, un comptoir envoie une voiture dans le mauvais
  sens.
- **PIÈGE DE TEST : Playwright consulte la DERNIÈRE route posée en premier.**
  La route générique hors ligne, posée après la route du faux serveur,
  avalait les appels — et la suite mesurait une panne réseau en croyant
  mesurer un refus de code.

### LE THÈME D'UN PARTENAIRE — L'ORANGE easyHotel

- **LES COULEURS SONT RANGÉES SUR L'HÔTEL** (`HOTELS[x].marque`), pas dans
  le CSS, exactement comme sa grille : le partenaire suivant sera peut-être
  bleu. Le CSS ne connaît que des rôles, et tout est sous `body.hotel` — le
  site public ne change pas d'un pixel. Un contrôle mesure la couleur
  **calculée** du bouton public : une règle trop large se voit à l'écran,
  pas dans la feuille de style.
- **LES VALEURS SONT MESURÉES (WCAG), PAS CHOISIES À L'ŒIL.** Du blanc sur
  l'orange du logo `#FF6600` donne **2,94 : illisible**. Les boutons portent
  donc `#C2410C` (blanc à 5,18) ; l'orange vif tient les **bandeaux**, où le
  texte est en charbon (5,87). Le bloc d'aide est en `#FFF1E8` / `#7C2D12`
  (8,48).
- **TOUS LES BOUTONS SONT ORANGE, SAUF CEUX QUI VIVENT DANS UN BANDEAU**
  (septembre 2026, à sa demande : « fait en orange les parties noires
  dédiées à easyHotel »). Ils étaient charbon, au motif qu'un bouton orange
  sous un bandeau orange efface la hiérarchie — il n'en a pas voulu, et la
  règle qui reste est une **mesure**, pas un goût : `#C2410C` sur le fond
  clair donne 5,18 avec du blanc, mais **posé SUR l'orange vif il tombe à
  1,76** et disparaît. D'où le partage — le sens du trajet et l'accès aux
  réservations, qui sont DANS le bandeau, restent charbon.
- **LA RÈGLE VISE `.bouton`, PAS QUATRE IDENTIFIANTS.** C'était une liste
  d'identifiants, donc la liste des boutons qui existaient le jour où elle a
  été écrite : « Confirmer » n'y était déjà pas, et le suivant n'y serait pas
  non plus. Même famille que la barre du bas figée sur quatre onglets.
- **LA TÊTE DE L'ÉCRAN RÉCEPTION PORTE LE BANDEAU DU PARTENAIRE.** Elle était
  grise comme n'importe quel écran du site : une réception qui ouvre cette
  page vingt fois par jour doit reconnaître la sienne du premier regard.
- **PIÈGE RENCONTRÉ : `class="carte"` N'EXISTE DANS AUCUNE RÈGLE DE CE
  SITE.** L'écran du code la portait — héritée de l'ancien site — donc ni
  fond, ni marge : le texte et le bouton « Ouvrir » touchaient les deux
  bords. Une classe morte ne se voit pas en relisant le HTML, et elle
  ramassera un jour une règle écrite pour autre chose (le piège `.arrivee`,
  déjà rencontré ici). La gouttière du site est de **20 px**, mesurée sur
  `.ecran-titre`.
- **L'ORANGE NE DESCEND PAS DANS LA LISTE.** Il est à **24° de teinte** du
  rouge de l'attente (`#C9302F`) : côte à côte, les deux se disputeraient
  l'attention et plus rien ne crierait. Il tient le cadre, l'action et
  l'aide.
- **« CONFIRMÉE » EST RESTÉE VERTE**, et c'est la correction d'une erreur
  commise ici même : passée à l'orange du partenaire, la pastille disait la
  **marque** et non plus l'**état** — même couleur que le bouton, le bloc
  d'aide et le filet. Une couleur d'état ne se négocie pas avec une charte.
  Même faute, à l'envers, que le jour où l'attente et la confirmation ont
  fini de la même couleur sur le bon du client.
- **AUCUNE PHOTO NI LOGO D'easyHotel N'EST POSÉ.** Barbaros en a envoyé
  cinq : trois sur quatre étaient des **vignettes** de résultats de
  recherche (275 × 182 pour 23 Ko…), et il a confirmé que la seule
  exploitable venait d'Internet. Il n'a pas non plus l'accord pour le logo.
  Une photo appartient à son photographe (L335-2 CPI) ; un logo est une
  **marque déposée**, et c'est ce qu'un siège fait retirer en premier.
  « C'est seulement pour la réception » ne change rien : la page a une
  adresse publique, et ce qui est reproché est la reproduction.
  **Ce qui reste licite et suffit** : leur orange, qui n'appartient à
  personne, et leur nom écrit — nommer un partenaire pour dire qu'on le
  dessert est un usage descriptif. L'en-tête porte un lavis d'orange en
  diagonale pour avoir l'air voulu plutôt qu'en manque d'image ; le champ
  `photo` attend celle qu'easyHotel fournira, et elle se posera par-dessus,
  sous un voile opaque à 62 % — un titre posé sur une image non maîtrisée
  n'a aucun contraste garanti.
  **À lui demander** : leurs photos de presse et leur logo, en un message à
  son contact. Ou, gratuit tout de suite, sa propre photo d'une berline
  devant l'entrée.

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

### LE JETON EXPIRAIT AU BOUT D'UNE HEURE, ET RIEN NE LE RENOUVELAIT

Septembre 2026, signalé par Barbaros : « je ne reçois pas les demandes des
clients sur la page admin, pourquoi ». **C'était un vrai défaut, et le plus
coûteux du projet à ce jour.**

Le jeton d'accès Supabase vit **une heure**. Passé ce délai, le serveur
répondait `401` à chaque lecture, l'erreur était avalée par un `catch` qui
rendait `null` — c'est-à-dire exactement ce que rend « pas connecté » — et
plus **aucune demande de client n'arrivait**. Pendant ce temps la colonne
affichait « Serveur connecté », parce que `connecte()` ne regardait que la
**présence** d'une chaîne dans le stockage, jamais sa validité.

**C'est la pire forme de panne : invisible, durable, et ce qu'on perd ce
sont des clients.** Elle ne se voit pas en test manuel — on se connecte, on
essaie, ça marche ; il faut attendre une heure pour la rencontrer.

- `nuage.rafraichir()` échange le `refresh_token` contre un jeton neuf.
  **Il ne présente PAS le jeton périmé** en `Bearer` : l'envoyer ferait
  refuser la demande qui doit justement le remplacer. Un contrôle le vérifie.
- `appel()` prend un troisième paramètre `reessai` : sur un `401`, il
  renouvelle et **rejoue l'appel UNE fois**. Sans ce garde-fou, un refus
  permanent ferait boucler indéfiniment.
- **Un renouvellement refusé efface la session** et fait revenir l'écriteau
  avec « Votre session a expiré » — plutôt qu'une pastille verte sur un
  serveur qui ne répond plus.
- **`lister()` n'a plus de `catch`**, et c'est délibéré : une panne qui
  ressemble à un état normal ne se répare jamais. L'erreur remonte, et
  `#bordHorsLigne` porte trois phrases distinctes — pas connecté, session
  expirée, serveur muet (avec le code) — parce qu'elles appellent trois
  gestes différents.
- **Le test éprouve ce que Barbaros a sous les yeux**, pas la mécanique : il
  vérifie que **la course finit par apparaître** après le renouvellement. Un
  contrôle qui dirait seulement « rafraichir a été appelé » ne prouverait
  rien.

### L'ACCUSÉ DE RÉCEPTION AU CLIENT

Même demande : « il faut aussi un message destiné au client que Elatransfer
doit confirmer la réservation ». Le client appuie sur « Confirmer » et n'a
plus **aucune** nouvelle. Son bon dit bien « demande reçue » — mais il l'a
fermé, il ne le regarde plus.

- Bouton **« Accuser réception au client »** sur le bon exploitant, visible
  **seulement sur une course en `attente`** et avec un numéro. Une fois
  confirmée, c'est « Prévenir le client » qui parle : deux messages coup sur
  coup diraient au client qu'on ne sait pas où on en est.
- **Quatre lignes** : référence, trajet, heure, et la phrase qui compte —
  « **Votre réservation sera ferme dès notre confirmation** ». Un test la
  cherche dans les deux langues.
- **NI CHAUFFEUR NI VÉHICULE** : on ne les connaît pas encore, et chez
  Elatransfer l'heure est ferme comme le prix. Promettre une voiture qu'on
  n'a pas placée est le meilleur moyen de laisser quelqu'un sur un trottoir.
  Un contrôle interdit les deux mots.
- **Il suit `bon.langue`**, comme la demande d'avis — et la **date suit la
  langue du message**, pas celle de l'espace exploitant qui est toujours le
  français.
- La course garde `accuse` et le bouton le dit : sur dix demandes reçues la
  nuit, on ne se souvient pas de qui a eu une réponse.
- **Il n'est pas automatique et ne peut pas l'être** : le site n'a aucun
  moyen d'envoyer un SMS tout seul. C'est WhatsApp qui part, du téléphone de
  Barbaros. Ne pas promettre l'inverse.

**PIÈGE DE TEST, PAS DE CODE** : `ctx.addInitScript` qui pose
`ela_bookings` **se rejoue à CHAQUE chargement de page**. Dans la suite
exploitant, le `goto` de la ré-entrée remettait le registre à son état
initial — les contrôles sur une course réalisée tombaient après ce point
sans que rien ne soit cassé. Les placer **avant** la sortie.

### LA NOTIFICATION AU CLIENT QUAND LA COURSE EST CONFIRMÉE

Septembre 2026, à sa demande : « est-ce que l'on peut faire en sorte que le
client reçoive une notification lorsque je valide sa course ». Trois voies
lui ont été présentées ; il a choisi : **« On garde le geste manuel plus la
notification navigateur »**.

**LES DEUX PARTENT, ET C'EST LE CHOIX.** La notification arrive tout de
suite, sur un téléphone verrouillé — mais elle peut être refusée, balayée
d'un doigt, ou impossible (un iPhone qui n'a pas installé le site). Le
message WhatsApp, lui, reste dans une conversation qu'on retrouve trois
jours plus tard. **Ne pas supprimer « Prévenir le client » sous prétexte
que la notification existe** : ce serait échanger le canal sûr contre le
canal rapide.

- **LE CHIFFREMENT A ÉTÉ ÉPROUVÉ PAR UN TIERS, pas par moi.** Une
  notification push est chiffrée de bout en bout (VAPID pour l'expéditeur,
  aes128gcm pour le contenu) et **un chiffrement faux ressemble toujours à
  des octets corrects** — exactement le piège de l'encodeur QR, en pire.
  `test-push.mjs` **déchiffre** donc la sortie avec `http_ece`, écrit par
  quelqu'un d'autre, et fait vérifier la signature VAPID par `node:crypto`.
  Relire son propre code ne prouve rien. Ne pas remplacer ces contrôles par
  des contrôles maison.
- **LA CLÉ PRIVÉE VAPID N'EST NULLE PART DANS LE DÉPÔT** — elle vit dans
  les secrets Supabase. C'est elle, et elle seule, qui empêche un tiers
  d'envoyer une fausse « Transfert confirmé » aux clients d'Elatransfer. La
  **publique** est dans la page, forcément : le navigateur la reçoit de
  toute façon. **Les deux se refont ensemble** : dépareillées, le navigateur
  accepte l'abonnement et le service de push refuse l'envoi — une panne qui
  ne se voit qu'au premier client.
- **ELLE A FAILLI PARTIR EN LIGNE, ÉCRITE EN CLAIR DANS UN TEST.**
  `test-push.mjs` la portait en constante « pour éprouver la signature ».
  Le dépôt est PUBLIC : c'était la publier. Rattrapé avant le premier
  `commit`. **Un secret recopié dans un test est un secret perdu**, même
  si le test ne sert qu'une fois et n'est lu par personne — et un contrôle
  qui cherchait la clé dans `index.html` seulement ne voyait évidemment
  rien, puisqu'elle était dans le fichier d'à côté. La suite **fabrique
  maintenant sa propre paire à chaque exécution** : ce qu'elle éprouve est
  le code qui signe, et le code ne connaît pas la différence.
  Ce qu'elle vérifie encore sur la clé de la page, sans le secret : 65
  octets, non compressée, et **un vrai point de la courbe** — `importKey`
  refuse le reste, exactement comme le fera le navigateur du client, sauf
  que lui le fera devant lui et sans rien dire.
- **ON NE DEMANDE JAMAIS L'AUTORISATION AU CHARGEMENT.** Une demande qui
  surgit sans raison se refuse d'un réflexe, et **le refus est définitif** :
  le navigateur ne repose plus jamais la question, des mois plus tard non
  plus. Elle ne part que sur l'appui du bouton, une fois la demande
  déposée.
- **LE BLOC N'APPARAÎT QUE SI LA DEMANDE EST ARRIVÉE SUR LE SERVEUR.** La
  fonction retrouve l'abonnement par la référence : sans ligne côté
  serveur, personne ne pourra jamais envoyer. Proposer « Prévenez-moi » là
  serait promettre un message qui ne partira pas, et le client fermerait sa
  page en croyant qu'on le rappelle tout seul.
- **L'ABONNEMENT VA DANS SA PROPRE TABLE**, jamais dans la course.
  L'attacher au bon demanderait d'ouvrir la **modification** d'une ligne
  existante au visiteur anonyme — et n'importe qui pourrait alors réécrire
  la réservation d'un autre. Anon **dépose** dans `abonnements`, et rien de
  plus : pas de lecture non plus, un abonnement est une adresse d'envoi.
- **LA NOTIFICATION NE PORTE NI LE NOM, NI LE TÉLÉPHONE, NI LES ADRESSES,
  NI LA CHAMBRE** — elle s'affiche sur un écran verrouillé, que n'importe
  qui lit par-dessus l'épaule. Référence, chauffeur, véhicule, heure, et le
  lien `?ok=`. Même règle que le lien de confirmation (RGPD 5.1.c), quatre
  contrôles la verrouillent.
- **ELLE NE PEUT PAS FAIRE ÉCHOUER UNE CONFIRMATION.** L'appel part
  détaché, après. Fonction en panne, abonnement périmé : la course est
  confirmée quand même et WhatsApp part comme avant. Un test coupe la
  fonction et vérifie que le bon passe au vert. **Ne jamais inverser cette
  répartition** — même règle que l'alerte de Barbaros.
- **`userVisibleOnly` OBLIGE À MONTRER QUELQUE CHOSE À CHAQUE MESSAGE.** Un
  push traité en silence fait révoquer l'abonnement par le navigateur, sans
  prévenir. D'où les replis sur un titre par défaut dans `sw.js` plutôt
  qu'un `return` si le contenu manque.
- **LE CLIC RAMÈNE SUR LE BON**, pas sur l'accueil : on réutilise l'onglet
  déjà ouvert et on l'emmène sur le `?ok=`. Ouvrir l'accueil laisserait le
  client devant un formulaire vide.
- **SUR IPHONE, IL FAUT AVOIR INSTALLÉ LE SITE** sur l'écran d'accueil :
  Safari ne connaît `PushManager` que là. Le bouton le **dit** au lieu
  d'échouer sans un mot — c'est la différence entre « ton téléphone ne peut
  pas » et « il peut, mais il faut d'abord installer ».
- **PIÈGE DE BANC, PAS DE CODE** : un Chrome piloté répond `denied` à
  `Notification.permission` là où un vrai navigateur répond `default`, et
  ni l'option `permissions` du contexte ni `grantPermissions` n'y changent
  rien — éprouvé. La page cache le bloc quand l'autorisation est refusée,
  et elle a raison ; la suite n'aurait donc éprouvé que ce cas-là. Le test
  rétablit `default` dans un `addInitScript`. Et il **compte les appels à
  `requestPermission`** au lieu de lire l'état final : lire la permission
  ne dit pas qui l'a demandée.
- **CE N'EST PAS UN CHOIX ENTRE WHATSAPP ET LA NOTIFICATION**, et c'est une
  décision, pas un oubli (septembre 2026, à sa demande : « il faut mettre le
  choix me prévenir par whatsapp aussi »). Le bloc annonce **WhatsApp
  d'abord et comme certain** — l'exploitant envoie la confirmation dans tous
  les cas, c'est son geste « Prévenir le client » — et la notification
  **ensuite, comme un supplément**. Laisser un client décocher WhatsApp au
  profit de la notification lui retirerait le seul canal qui marche partout,
  et c'est Barbaros qu'il rappellerait.
- **LE BLOC ET LE BOUTON NE SE JUGENT PAS ENSEMBLE.** Le bloc dépend du seul
  dépôt réussi ; le bouton, de ce que sait faire le navigateur. Les lier —
  ce qu'ils étaient au premier jet — cachait la promesse WhatsApp à
  **exactement** ceux qui n'ont que WhatsApp : un iPhone sans le site
  installé, c'est-à-dire presque tous. Ils lisaient « demande reçue » sans
  savoir par quel moyen la réponse viendrait. Une suite refait une vraie
  réservation avec `PushManager` supprimé **avant le chargement**.
- **Le numéro du client est écrit dans la promesse.** Ce n'est pas
  décoratif : c'est le dernier moment où il voit qu'il a tapé un chiffre de
  travers. `white-space:nowrap` — coupé en « 06 12 34 56 » / « 78 », il ne
  se relit plus d'un trait.
- **La phrase qui annonce la notification part AVEC le bouton.** Laissée
  seule, elle promet ce qu'aucun geste ne permet plus d'obtenir — pire qu'un
  bouton mort, parce que le client cherche où appuyer.
- **LE DÉPLOIEMENT SE FAIT DEPUIS GITHUB** (`.github/workflows/fonctions.yml`,
  septembre 2026). L'éditeur de code du tableau de bord Supabase **refuse le
  collage sur iPhone** — éprouvé ce soir-là, et c'est pour ça que
  `nouvelle-demande` est restée écrite et jamais déployée pendant des
  semaines. Le workflow déploie les deux fonctions à chaque poussée ; il ne
  touche pas au site, `construire.sh` reste la seule recette de publication.
  Un seul secret GitHub à poser : `SUPABASE_ACCESS_TOKEN`.
- **LES DEUX FONCTIONS SONT DÉPLOYÉES** depuis le 8 septembre 2026, et la
  table `abonnements` existe avec sa policy INSERT pour `anon`. Ce qui manque
  encore à `nouvelle-demande` : son webhook et ses propres secrets Telegram.
- **UN JETON D'ACCÈS NE SE COLLE PAS DANS UNE CONVERSATION.** C'est arrivé —
  jeton révoqué et refait dans la minute. Il ne va que dans les secrets
  GitHub. Le redire si ça se represente, sans en faire un sermon.

## LE CARNET DE CHAUFFEURS ET LA FACTURE DE COMMISSION

Septembre 2026, à sa demande : « Oui met en place et publie ». Les deux
tiennent ensemble et découlent d'une chose qu'il a dite ce jour-là :
**« Je place seulement »**.

**BARBAROS NE CONDUIT PAS. C'EST ACQUIS, ne plus le lui redemander** — la
question figurait dans « Pas décidé » depuis des mois. Il est donc une
**centrale de réservation** (Code des transports L3142-1), pas un
transporteur, et **il n'a pas encore de SIRET** : la micro-entreprise reste
à créer sur `formalites.entreprises.gouv.fr`. Tant qu'elle n'existe pas, la
fiche Google ne peut pas être vérifiée, les mentions légales restent
incomplètes et aucune facture n'est valable. C'est le point bloquant du
projet, et il ne dépend que de lui.

### Le carnet (`#ecran-chauffeurs`)

- **CE N'EST PAS UN RÉPERTOIRE, C'EST L'OBLIGATION DE L3142-1** : pouvoir
  prouver, pour chaque chauffeur, sa carte professionnelle, son inscription
  au registre VTC et son assurance.
- **LA DATE COMPTE PLUS QUE LE NUMÉRO.** Un numéro de carte reste identique
  le lendemain de son expiration : il ne prouve rien. Ce qu'on surveille,
  c'est `carteFin`, `registreFin`, `assuranceFin`.
- **UN PAPIER ABSENT VAUT UN PAPIER PÉRIMÉ** — dans les deux cas on ne peut
  rien prouver. Les distinguer donnerait à « pas renseigné » un air
  rassurant qu'il n'a pas. Les deux sont au rouge, un contrôle le verrouille.
- **LE PIRE DES TROIS DÉCIDE** (`etatChauffeur`) : assurance périmée = fiche
  rouge, même avec une carte à jour.
- **30 jours d'avance** (`JOURS_ALERTE`), et le jour se compte **à minuit** :
  un papier qui expire aujourd'hui vaut encore aujourd'hui.
- **L'AVERTISSEMENT EST SUR LE BON**, à l'instant où l'on attribue la course
  — c'est-à-dire à l'instant où l'on engage sa responsabilité. Trois
  messages : hors carnet (orange), papier bloquant (rouge), tout en règle
  (vert). Un quatrième état — ne rien dire — se confondrait avec un contrôle
  qui n'a pas eu lieu.
- **ON RETROUVE LE CHAUFFEUR PAR SON NUMÉRO D'ABORD, PAR SON NOM ENSUITE.**
  Le nom est saisi à la main depuis des mois — « Mehmet », « mehmet »,
  « Mehmet Y. » — un numéro normalisé par `telWa()` ne varie pas. Un test
  l'éprouve avec un nom volontairement mal écrit.
- Le panneau « Papiers à surveiller » du tableau de bord **ne montre que ce
  qui cloche** : un carnet à jour n'affiche rien, et sa réapparition est
  elle-même l'alerte.
- **L'identifiant `id` ne change JAMAIS** : le nom et le numéro se corrigent,
  les factures déjà émises pointent dessus.

### La facture (`#ecran-facture`)

- **L'ARGENT NE PASSE JAMAIS PAR ELATRANSFER** — le client paie le chauffeur.
  La commission ne s'encaisse donc pas toute seule, elle se **facture**.
  C'était le trou du modèle depuis le début.
- **PAS DE SIRET, PAS DE FACTURE.** Sans nom, SIRET et adresse de l'émetteur,
  le document n'en est pas une (art. L441-9 Code de commerce) : on refuse de
  l'éditer plutôt que d'en envoyer une fausse à un tiers. Même schéma que le
  lien d'avis — on bloque et on emmène au champ.
- **LE RANG NE RECULE JAMAIS** (`ela_rang_facture`, `F-AAAA-NNNN`). Il est
  consommé **à l'émission**, jamais à l'aperçu : regarder ce qu'on va
  facturer ne doit pas brûler un numéro qui manquerait ensuite. À la
  restauration d'une sauvegarde, on garde **le plus grand des deux rangs** —
  reprendre celui du fichier réémettrait des numéros déjà utilisés.
- **UNE COURSE N'EST FACTURÉE QU'UNE FOIS** : elle porte `factureNum` et sort
  du lot. Un doublon ne se voit que six mois plus tard, chez le comptable.
- **SEULES LES `realisee` SONT FACTURABLES** — une course confirmée est une
  promesse, pas un encaissement. Même règle que le registre.
- **LA FACTURE EST FIGÉE À L'ÉMISSION** : nom, adresse et SIRET des deux
  parties sont **recopiés dedans**. Le chauffeur peut déménager ; un document
  comptable qui se réécrit tout seul ne prouve plus rien. Un test change
  l'adresse après coup et rouvre l'ancienne facture.
- **La TVA est ÉTEINTE par défaut** — en micro-entreprise on démarre en
  franchise, et réclamer une TVA qu'on ne reverse pas est une facture fausse.
  Mention « TVA non applicable, art. 293 B du CGI ». À noter : **la
  commission est à 20 %, pas à 10 %** — le taux réduit est celui du
  transport, pas celui de l'intermédiation.
- Mentions obligatoires portées : prestation, période, paiement à réception,
  absence d'escompte, pénalités de retard et **indemnité forfaitaire de 40 €**
  (L441-10 et D441-5).
- **À l'impression, seule la facture sort** — même règle que l'affiche, et
  elles ne peuvent pas se disputer le papier : l'affiche vit dans le tableau
  de bord, la facture sur son propre écran, et un écran non affiché est en
  `display:none`, qu'aucune règle de visibilité ne ramène.

### La sauvegarde a changé de format

Elle emporte désormais **courses, chauffeurs, factures, rang et entreprise**
dans un objet `{format:"elatransfer-1", …}`. Une sauvegarde qui ne rendrait
que les courses laisserait Barbaros sans preuve que ses chauffeurs étaient
en règle, et referait partir la numérotation à 1.
**L'ANCIEN FORMAT RESTE LU** : un simple tableau de courses se restaure
comme avant. Le carnet et les factures s'AJOUTENT, ils n'écrasent jamais.

### LE DÉFAUT DE POSITIONNEMENT QUE CE TRAVAIL A RÉVÉLÉ

`::-webkit-calendar-picker-indicator` est étiré en `absolute; inset:0` pour
qu'un appui n'importe où dans la case ouvre le sélecteur. Il se cale donc
sur le premier ancêtre **positionné** — et la règle ne posait ce repère que
sur `.duo > .champ`, les deux champs de l'accueil, **les seuls champs de
date qui existaient alors**.
Le premier champ de date posé hors d'un `.duo` n'a plus trouvé de repère :
l'indicateur est remonté jusqu'à la page entière et a recouvert tout, en
transparent. Le bouton « Enregistrer ce chauffeur » était devenu
**incliquable, et rien ne se voyait à l'écran**.
`position:relative` est maintenant sur **tous** les `.champ`. C'est la
deuxième fois que ce projet se fait avoir par un repère de positionnement
supposé — la première était le bouton « me localiser » de l'ancien site.
**Une règle qui vise un cas particulier survit au jour où le cas se
généralise, sans rien casser de visible.**

### ET LA TROISIÈME FOIS : LE BOUTON COLLANT DU BON EXPLOITANT

Septembre 2026, sur une capture de Barbaros : « règle-moi cela, c'est pas
fonctionnel du tout cette partie ». Les cinq boutons d'action du bon
exploitant flottaient par-dessus le formulaire et **recouvraient le champ
« Téléphone » du chauffeur**. Donc : pas de numéro saisissable, donc
« Prévenir le client » ne pouvait jamais partir — et **rien à l'écran ne
disait pourquoi**.

**LA CAUSE N'ÉTAIT PAS CET ÉCRAN, C'ÉTAIT LE SENS DE LA RÈGLE.**
`.veh-action` était **collante par défaut** (écrite pour l'écran des prix :
UN bouton au-dessus d'une liste qu'on parcourt) et chaque écran devait
penser à l'éteindre. Le récapitulatif le faisait, le bon du client le
faisait, celui de l'exploitant l'avait oublié. **Trois écrans sur quatre en
dérogation, c'est que le défaut est à l'envers.** La règle est inversée :
posée dans le flux partout, collante sur `#ecran-vehicules` seulement. Un
écran ajouté demain n'hérite plus du piège.
- **`.veh-action .bouton{margin-top:0}` collait aussi les boutons entre
  eux** : inoffensif tant qu'il n'y en avait qu'un, visible dès qu'il y en a
  cinq. Même famille — une règle taillée pour un cas unique.
- **LE PREMIER JET DU TEST PASSAIT AU VERT.** Il mesurait les **boutons** ;
  le débordement venait de la **marge intérieure du conteneur** — six
  pixels, transparents, qui avalent les appuis comme le ferait un bouton.
  Un contrôle qui ne regarde que ce qui se voit passe à côté de ce qui gêne.
- **IL FALLAIT AUSSI DESCENDRE DANS LA PAGE.** Un bouton collant ne remonte
  sur le contenu que quand sa place naturelle passe sous le bas de l'écran :
  sans `scrollIntoViewIfNeeded()` sur le champ, le contrôle ne prouvait
  rien. C'est exactement pour ça que les suites n'avaient jamais vu le
  défaut — elles regardaient le haut du bon.
- **`fill()` N'EST PAS UN APPUI.** Il écrit dans le champ sans se soucier de
  ce qui le recouvre ; `click()` exige que ce soit bien lui qui reçoive le
  doigt. C'est la différence entre un test qui passe et un client qui
  n'arrive pas à taper. Les deux contrôles sont là.
- Éprouvé **contre l'ancien code** : il tombe bien dessus (`#bbActions`) et
  passe sur le nouveau. Un test écrit après coup qui ne tombe pas sur le bug
  d'origine ne prouve rien.

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
- **Pas de majoration dessus** : service à prix fixe. Il n'y a de toute
  façon plus aucune majoration sur le site depuis septembre 2026, mais la
  règle resterait vraie si l'on en réintroduisait une — une pancarte
  affichée 10 € se paie 10 €.
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

### « Mène-moi directement au but »

Septembre 2026, pendant la configuration de Telegram. On lui faisait
traverser des menus (« Edge Functions → Secrets, ou Settings → Edge
Functions selon la version ») alors qu'une **adresse directe** ouvrait la
page en un geste.

**Chercher systématiquement le chemin le plus court, et le donner à sa
place.** Une URL complète plutôt qu'un itinéraire dans une interface ; une
commande à coller plutôt qu'une description de ce qu'elle fait ; un bouton
nommé plutôt que « va dans les réglages ».

- **Un geste à la fois quand il suit une procédure.** Trois étapes d'un
  coup, il se perd et le dit (« je comprends rien », « arrête de
  t'avancer »). On donne UNE action, on attend sa réponse, on donne la
  suivante.
- **Ne pas décrire une interface qu'on ne voit pas.** Ses captures d'écran
  disent où il est vraiment : les lire avant de répondre, pas supposer.
  Il s'est retrouvé dans la recherche des RÉGLAGES de Telegram au lieu de
  celle des conversations — invisible depuis ici sans la capture.
- **Pas de jargon, et pas d'anglais non expliqué.** « La loupe en haut »,
  pas « la recherche globale ».

### « Arrête de deviner, sois expert méthodique »

Septembre 2026, après une soirée où une panne a coûté une heure. **Deux
habitudes à supprimer, pas deux conseils.**

**1. MESURER AVANT D'ÉMETTRE UNE HYPOTHÈSE.** Sur le bouton mangé par la
barre du bas, j'ai supposé successivement un bouton désactivé, un écriteau
de zone, un problème d'heure — trois hypothèses, trois vérifications, zéro
résultat. **La mesure qui a tout donné a pris trente secondes** :
`elementFromPoint` au centre du bouton, qui rend « onglet ». L'ordre est
toujours le même : (1) reproduire, (2) **mesurer l'état réel** — rectangles,
valeurs, ce que reçoit le doigt — (3) comparer avec la version qui marchait
(`git worktree` sur `main`, un serveur sur un autre port), (4) bissecter
commit par commit. Ce chemin est plus court que l'intuition, toujours.

**2. NE PAS RELANCER LES VINGT ET UNE SUITES À CHAQUE PAS.** Elles prennent
six minutes ; elles ont tourné cinq fois cette nuit-là, dont trois pour rien.
La marche à suivre : après un changement, lancer **les deux ou trois suites
qui touchent au sujet**, plus celle qu'on vient d'écrire, et **éprouver le
nouveau contrôle contre le défaut qu'il surveille**. La série complète ne se
lance **qu'une fois**, avant la fusion. Deux exécutions en parallèle se
marchent dessus et se bloquent — ne jamais en lancer une seconde tant que la
première tourne.

**3. UNE SUITE MUETTE EST UN ÉCHEC.** `test-nouveau-option` n'a rien affiché
— ni réussite ni échec — dans trois séries d'affilée, et je l'ai lue comme
« pas concernée ». La boucle de lancement le signale maintenant en toutes
lettres (`!!! MUETTE — PLANTAGE`) et recopie les dernières lignes.

## Tests

**Vingt-trois suites Playwright, 895 contrôles**, à relancer après **toute**
modification de la page.

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
npx http-server -p 8099 -s .
# UNE SEULE EXÉCUTION À LA FOIS : deux séries en parallèle se marchent
# dessus et se bloquent. Et une suite MUETTE est un échec — elle est
# signalée en toutes lettres plutôt que laissée passer.
for f in test-nouveau.mjs test-nouveau-prix.mjs test-nouveau-bon.mjs \
         test-nouveau-langues.mjs test-nouveau-courses.mjs \
         test-nouveau-gardes.mjs test-nouveau-serveur.mjs \
         test-nouveau-exploitant.mjs test-nouveau-whatsapp.mjs \
         test-nouveau-services.mjs test-nouveau-paiement.mjs \
         test-nouveau-confirmation.mjs test-nouveau-registre.mjs \
         test-nouveau-affiche.mjs test-nouveau-itineraire.mjs \
         test-nouveau-geoloc.mjs test-nouveau-preavis.mjs \
         test-nouveau-option.mjs test-nouveau-chauffeurs.mjs \
         test-nouveau-carte.mjs test-nouveau-bascule.mjs \
         test-nouveau-hotel.mjs test-nouveau-reception.mjs; do
  printf "%-34s " "$f"
  out=$(node $f 2>&1)
  res=$(echo "$out" | grep -E "^=== " | tr '\n' ' ')
  if [ -z "$res" ]; then
    echo "!!! MUETTE — PLANTAGE"; echo "$out" | tail -4
  else
    echo "$res"
  fi
  echo "$out" | sed -n '/=== ÉCHECS/,/^$/p' | head -6
done
node test-notification.mjs   # ni navigateur ni réseau
node test-push.mjs           # ni navigateur ni réseau
```

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
