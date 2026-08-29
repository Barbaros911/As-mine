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

Berline 5,75 € + 1,75 €/km (4 pass.) · Berline VIP 11,50 € + 2,55 €/km (3) ·
Van 11,50 € + 2,90 €/km (7) · Van VIP 17,25 € + 4,05 €/km (6).
Horaire : 58 / 86 / 80 / 109 €. +20 % nuit et week-end. TVA 10 % incluse.
Grille relevée de 15 % en août 2026, à la demande de Barbaros.
60 min d'attente offertes en aéroport, 30 min ailleurs.
Annulation gratuite jusqu'à 60 min avant.

**Le prix est ferme, arrêté à la réservation.** Le client l'accepte avant
de monter, le chauffeur l'encaisse tel quel, rien n'est recalculé à
l'arrivée — un VTC n'a pas le droit d'un taximètre. Départ **et** arrivée
sont donc obligatoires : sans les deux, pas de réservation.

**Il n'y a plus d'aller-retour ni de course à destination ouverte** —
supprimés à la demande de Barbaros.

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

**Pas d'emoji de voiture, pas d'illustration de voiture.** Essayé quatre
fois, refusé quatre fois. Les cartes portent une pastille dorée avec le
nombre de places. Seule piste encore ouverte : de vraies photos des
véhicules, fournies par Barbaros.

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
rattrape ça — une image qui change ne peut pas garantir un contraste. Le
titre (`.accroche`) est donc sur le fond ivoire, où le contraste est acquis
une fois pour toutes, et la vitrine ne porte plus aucun texte. Ne pas l'y
remettre. L'accroche courte au-dessus (`tagline`) tient dans une pastille :
la garder **courte**, sinon elle passe à la ligne — deux mots, un point
médian, pas une phrase.

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

Huit suites Playwright à la racine, à relancer après **toute**
modification :

```bash
npx http-server -p 8099 -s .
node test.mjs && node test2.mjs && node test3.mjs \
  && node test4.mjs && node test5.mjs \
  && node test6.mjs && node test7.mjs && node test8.mjs
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
- **deux véhicules, pas quatre.** Les versions VIP ont été supprimées.
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
