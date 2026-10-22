# La confirmation, le bon et les onglets du client — histoire

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

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

**PLUS AUCUNE APPLICATION NE S'OUVRE AU CLIC** (4/10/2026, option A) : le client
dit où recevoir sa confirmation ; repli « Renvoyer par WhatsApp » sur le bon.
Si Telegram tombe, rouvrir cette décision (`memoire/contact-client.md`).
**AU COMPTOIR D'HÔTEL, IL NE S'OUVRE PLUS** — voir la section dédiée plus
bas. C'est l'application de la règle qui figurait ici (« ne pas supprimer
l'ouverture automatique avant que le webhook Telegram fonctionne ») : il
fonctionne depuis le 11 septembre 2026, et c'est ce qui a permis de la
retirer là où elle gênait.

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

## LE BON DE RÉSERVATION — MODÈLE B, UN SEUL POUR TOUTES LES PAGES

24 septembre 2026, à sa demande : « je veux un tout nouveau bon avec mon
logo, tu supprimes l'ancien, tu ne reprends rien de l'ancien ». Trois modèles
lui ont été montrés en capture ; il a choisi le **B**.
- **En-tête clair, le vrai logo (`brand-logo.webp`) centré**, la pastille
  d'état, la référence, « Bon de réservation », puis la phrase. L'ancien
  en-tête marine recomposait la marque en CSS (arc SVG + « ELATRANSFER » en
  texte) : un second dessin du logo, qui divergeait du vrai fichier.
- **Le prix est dans un encart vert clair** (`#bonDetail .ligne.total`),
  visé par l'identifiant du bon : `.ligne.total` sert aussi au
  récapitulatif, qu'on ne touche pas.
- **UN SEUL BON, IDENTIQUE PARTOUT — il ne prend PAS la couleur d'un
  partenaire.** Une première correction l'avait fait passer à l'orange sur
  une course easyHotel ; il l'a refusé : « je ne veux pas que tu adaptes la
  couleur ». Les couleurs du bon sont donc des valeurs fixes, pas les
  variables `--accent*` que `hotel-engine-polish.css` réécrit.
- **Attente = pastille grise, confirmé = pastille verte pleine.** Même règle
  que partout : si l'attente avait une couleur, elle mentirait sur l'état.
