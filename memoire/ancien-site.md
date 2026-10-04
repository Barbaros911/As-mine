# L'ancien site Asmine — archive

> **Ceci est une archive, figée le 4 octobre 2026.** C'est la section
> « Asmine — l'application de réservation » qui vivait dans `CLAUDE.md`
> jusqu'à cette date. Elle décrit l'ANCIEN site, remplacé le 6 septembre
> 2026, et sert à comprendre d'où viennent les décisions — pas à savoir ce
> que fait le site aujourd'hui : pour ça, c'est `CLAUDE.md` qui dit vrai.
> Rien n'y a été réécrit ; les renvois « plus haut », « plus bas », « en fin
> de fichier » visent l'ancien `CLAUDE.md`. Les règles encore en vigueur
> (ce qu'est Asmine, les cinq règles à ne jamais enfreindre, les conseils
> déjà donnés, la règle des photos, celle du cache, ce qui est décidé) ont
> été recopiées dans `CLAUDE.md`.

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

**Le mode exploitant est protégé par un code** (`CODE_EXPLOITANT`, stocké en
empreinte dans la page). Diffusion au groupe, confirmation à distance,
attribution du chauffeur et export du registre sont derrière.

**SA VALEUR N'EST PLUS ÉCRITE ICI, ET ELLE NE DOIT PLUS L'ÊTRE** (16 septembre
2026, à la demande de ChatGPT, et il a raison). Ce fichier annonçait le code en
toutes lettres. **Le dépôt est public** : une valeur publiée doit être tenue
pour exposée, définitivement — la retirer ne la reprend pas, l'historique git la
garde. Ne la recopier ni ici, ni dans une Issue, ni dans un message.
- **Pire encore, un contrôle l'EXIGEAIT.** `test-doc.mjs` lisait le code en
  clair dans ce fichier et vérifiait qu'il correspondait à l'empreinte de la
  page : le retirer faisait tomber la construction. Un outil censé empêcher la
  documentation de mentir imposait de publier un secret. Il fait maintenant
  l'inverse — il **refuse** qu'un code en clair réapparaisse.
- **C'est une serrure, pas un coffre**, et ça l'était déjà avant : l'empreinte
  part dans la page, donc elle s'attaque hors ligne, autant d'essais qu'on veut.
  Le dire à Barbaros plutôt que de laisser croire à une vraie sécurité.
- **CE QUI PROTÈGE VRAIMENT LES DONNÉES CLIENTS, C'EST SUPABASE** — Auth et Row
  Level Security, côté serveur. Le code de l'espace exploitant ne garde qu'un
  écran ; il ne garde aucune donnée. Ne jamais inverser ces deux rôles.
- **À FAIRE PAR BARBAROS, séparément** : changer ce code s'il lui sert encore.
  La nouvelle valeur ne s'écrit nulle part dans le dépôt — elle se tape, et on
  ne garde ici que son empreinte.

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

