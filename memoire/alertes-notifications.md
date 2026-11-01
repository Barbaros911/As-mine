# Les alertes à Barbaros et les notifications au client — histoire

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

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
**Déployée et branchée depuis le 11 septembre 2026** (« Ce qui reste à
faire », point 3).

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

## LES DEMANDES ARRIVENT TOUTES SEULES DANS LE TABLEAU DE BORD

Septembre 2026. L'admin interroge le serveur (sonde de 8 s, relecture à 45 s)
**seulement** avec une session, l'espace ouvert et l'onglet visible
(`ecouteUtile()`) ; la première lecture ne sonne jamais ; sans session,
`#bordHorsLigne` le dit. **Le jeton Supabase vit une heure** : `nuage.appel()`
renouvelle sur 401 et rejoue UNE fois, un renouvellement refusé efface la
session et le dit — jamais une pastille verte sur un serveur muet, `lister()`
n'a pas de `catch`. Histoire : `memoire/synchronisation-admin.md`.

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
  table `abonnements` existe avec sa policy INSERT pour `anon`.
  `nouvelle-demande` a reçu son webhook et ses secrets le 11/09.
- **UN JETON D'ACCÈS NE SE COLLE PAS DANS UNE CONVERSATION.** C'est arrivé —
  jeton révoqué et refait dans la minute. Il ne va que dans les secrets
  GitHub. Le redire si ça se represente, sans en faire un sermon.

## LES DEMANDES ARRIVENT EN 8 SECONDES, PLUS EN 45 — ET LA MINUTE TELEGRAM SE MESURE

29 septembre 2026, Barbaros : « je reçois les demandes sur admin et les
notifications Telegram 1 minute après, c'est trop long ».
- **Le tableau de bord relisait TOUTE la liste (jusqu'à 1000 courses) toutes
  les 45 s** — une demande attendait donc jusqu'à 45 s. Une **sonde** pose
  maintenant toutes les 8 s une question d'une ligne (« dernière référence ? »,
  `nuage.derniere()`), et ne relance la lecture complète que si la réponse
  change. La relecture de fond à 45 s reste : une course modifiée sur un
  autre appareil ne change pas la dernière référence. `test-admin-arrivee`
  exige l'apparition en moins de 15 s ET aucune relecture complète quand
  rien n'arrive ; l'ancien code tombe (« jamais »).
- **Telegram : le code serveur n'a rien de lent**, donc on MESURE avant de
  supposer. `20260929000000_diagnostic_delais_alertes.sql` est en lecture
  seule (à lancer par le workflow des migrations) : pour les 10 dernières
  courses, `depot_s` = clic du client → ligne sur le serveur, `alerte_s` =
  ligne → Telegram envoyé. Il ne sort que références et secondes — le
  journal GitHub est public. Piste la plus probable si `depot_s` est grand :
  le dépôt raté pendant que WhatsApp s'ouvre, retenté au retour du client
  (`reprendreDepot()`).

## ÊTRE ALERTÉ DE CHAQUE DEMANDE — SON, VIBRATION, NOTIFICATION, RAPPEL

30 septembre 2026, à sa demande : « recevoir toutes les courses de tous les
sites en temps et en heure sur admin et Telegram… une alerte sonore,
visuelle, notification, tout ce qui est possible ».
- **MESURÉ AVANT (diagnostic du 29/09)** : client → serveur 0 à 2 s, serveur →
  Telegram 0 à 2 s. **Le serveur n'est pas lent.** `memoire/alertes-relance.md`.
- **LE BIP DE L'ADMIN NE SONNAIT PROBABLEMENT JAMAIS SUR UN TÉLÉPHONE.** Il
  créait un lecteur de son hors de tout geste ; iPhone et Android le laissent
  suspendu, sans erreur. Un seul lecteur maintenant, débloqué au premier appui
  n'importe où, et un bandeau `#sonCoupe` le dit tant que ce n'est pas fait.
- **L'alarme se répète toutes les 10 s** (quatre notes fortes + vibration
  Android + titre d'onglet qui clignote) jusqu'à un appui sur l'écriteau ou
  l'ouverture d'une course, dix minutes au plus. **Pastille sur l'icône** =
  nombre de demandes en attente (`setAppBadge`).
- **La notification reste affichée** (`requireInteraction`) et vibre (`sw.js`).
- **« Tester mes alertes »** (Réglages) sonne, vibre, notifie, et dit ce qui a
  marché sur CET appareil. L'état des notifications de l'appareil a sa propre
  ligne (`#pushAdminAppareil`) : l'écrire dans `#pushAdminEtat` faisait
  tomber `test-admin-push`, qui attend le résultat de l'appui à cet endroit.
- **RATTRAPAGE ET RAPPEL CÔTÉ SERVEUR** : pg_cron appelle toutes les 20 s
  `nouvelle-demande` avec `{type:"RELANCE"}`
  (`20260930000000_relance_alertes.sql`, schedule `'20 seconds'`). Demande en
  attente depuis plus d'1 min sans AUCUNE alerte réussie → annoncée.
  **La cadence suit l'urgence** (30/09/2026, resserrée le soir même à sa
  demande ; histoire : `memoire/alertes-relance.md`) : les **10 premières
  minutes** d'une demande non vue, et tout
  départ dans 30 min ou moins → Telegram ET notification **à chaque tour de
  20 s** (seuil 15 s : pg_cron ne tombe jamais pile) ;
  entre 30 min et 2 h → toutes les 10 min ; plus de 2 h → aucun rappel avant
  H-2. Arrêt dès qu'elle est VUE, confirmée ou refusée. **Telegram ne dit
  jamais à un bot qu'un message est lu** : « vu »
  est donc un GESTE — le bouton « ✅ Vu » sous chaque alerte (fonction
  `telegram-bot`, déployée sans JWT, qui vérifie l'en-tête secret du webhook
  et que l'appui vient de `TELEGRAM_CHAT`), ou la course ouverte dans l'admin
  (`signalerVue()` → RPC `ela_marquer_vue`). Les deux écrivent `vue` au
  journal. Secret du webhook dérivé du jeton du bot (SHA-256 de
  « jeton:webhook-ela »). Webhook posé par `INSTALLER_TELEGRAM` (même
  migration) ; pg_cron se présente avec `x-ela-relance` depuis le 19/10.
  **LA FENÊTRE DE 6 H SE COMPTE DEPUIS LE DÉPART, PAS DEPUIS LA CRÉATION.**
  Comptée depuis la création, elle écartait toute demande faite plus de 6 h
  avant le départ (un hôtel qui réserve la veille : le cas le plus courant) —
  aucun rappel à H-20 min. Trouvé en relisant le travail de ChatGPT, prouvé
  par un test qui tombait. On lit 7 jours de demandes en attente ; le
  rattrapage d'une demande jamais annoncée garde sa borne de 6 h depuis la
  création. Le son et la vibration de chaque message Telegram sont
  réglés dans Telegram sur son téléphone, pas ici.
  Tout est relu sur le serveur et la cadence vient du journal : l'appeler plus
  souvent n'envoie rien de plus. **La migration ne part pas toute seule** —
  workflow « Appliquer une migration Supabase », ce fichier. Si la base refuse
  `pg_cron` ou `pg_net`, le journal du workflow le dira.
- **WhatsApp ne peut PAS sonner tout seul chez lui** : l'API WhatsApp
  Business exige une vérification d'entreprise et un numéro dédié (voir plus
  haut). Ce qui sonne : Telegram, la notification ELA, et l'admin ouvert.
- **Le code de l'alarme vit dans le bloc exploitant**, retiré des pages
  publiques : un bouton branché ailleurs y appellerait des fonctions absentes
  (`test-easyhotel-client` l'a vu).
- Suites : `test-admin-alertes.mjs` (14), `test-relance-alertes.mjs` (17).
- **ADMIN FERMÉ, CE QUI ARRIVE ENCORE** (30/09/2026, à sa demande : « toujours
  actif même application fermée… aussi sur l'icône »). Une page fermée ne
  tourne plus — aucun site ne peut l'empêcher, ne pas le promettre. Ce qui
  arrive quand même : la notification (serveur → service worker), Telegram,
  et la **pastille chiffrée** : la notification porte `attente` (demandes en
  attente sur 30 jours, compté par `nbAttente()`), que `sw.js` pose sur
  l'icône. Sans nombre (notification d'un client), un simple point.
  `test-relance-alertes` fait tourner `sw.js` pour de vrai et lit la pastille.

## UN CANAL QUI INSISTE, UN CANAL QUI INFORME — LA CADENCE DES ALERTES

2 octobre 2026, Barbaros : « je ne veux pas recevoir trop d'alertes sur
Telegram… des fois je reçois une notification, je ne réponds pas, après ça
passe en mode silencieux ». **Mesuré dans le code** : Telegram partait toutes
les 20 s pendant 10 min, puis toutes les 20 s dès H-30 et **jusqu'à 6 h après
le départ** tant que la course restait « en attente » et non vue — jusqu'à un
millier de messages pour une course oubliée. C'est le téléphone qui coupait le
son, et la vraie demande suivante passait avec.
- **La notification ELA est l'alarme** (elle se REMPLACE sur le téléphone,
  même étiquette) : à chaque tour de 20 s les 10 premières minutes et à H-30
  ou moins, toutes les 10 min entre H-2 et H-30, rien avant H-2.
- **Telegram informe** : toutes les 90 s les 10 premières minutes (9/10/2026,
  à sa demande, éprouvé admin fermé ; c'était +3 et +10 min), puis toutes les
  15 min la première heure ; silence jusqu'à H-2 (toutes les 15 min) ; toutes
  les 5 min sous H-30. **Chaque rappel EFFACE le précédent** (`deleteMessage`, identifiant
  gardé dans `journal.detail` sous `message_id=N`) : une seule ligne de
  rappel visible, jamais une pile. L'annonce initiale n'est jamais effacée.
- **À l'heure du départ, un dernier message** (`rappel_final`, `titreFinal`)
  sur les deux canaux, puis plus rien. Une course oubliée se clôt dans
  l'admin, elle ne sonne pas six heures.
- **Les saisies de l'exploitant ne sont ni annoncées ni relancées** (à sa
  demande : « aucune alerte du tout »). Une demande passée par le site porte
  `securite.empreinteDepot`, posée par `deposer-course` ; les siennes
  (« Coller une demande », « Saisir par téléphone ») jamais —
  `saisieExploitant()`. Le webhook INSERT et la relance l'appliquent tous
  deux.
- **Les délais se comptent depuis l'ANNONCE, pas depuis la création** : une
  demande rattrapée 15 min après son dépôt aurait eu son « +3 min » au tour
  suivant. Trouvé par le test.
- **Les heures du bon sont celles de Paris, l'horloge du test est en UTC** :
  deux contrôles sont tombés parce qu'un départ « 14:00 » (12:00 UTC) était
  déjà à H-2 quand le test croyait être loin. Même famille que les fixtures
  SQL datées dans le mauvais fuseau.
- `pg_cron` reste à 20 s : c'est la cadence de l'alarme (notification), la
  cadence Telegram vient du journal.
- **Aucune demande n'est « passée » dans ses 30 premières minutes** : faite
  pour la minute même, elle sonne comme une immédiate (`memoire/preavis.md`).
- `test-relance-alertes` : 61 contrôles ; trois falsifications (règle des
  saisies retirée, effacement retiré, arrêt au départ retiré) tombent en
  nommant le défaut. `test-securite-fonctions` éprouve le webhook sur une
  saisie sans empreinte.

## LE CHIEN DE GARDE, LE DIAGNOSTIC, ET LE QUOTA DE LA RÉCEPTION

2 octobre 2026, même demande : « vérifier que je reçois tout, vraiment comme
un salarié 24-24 ». Ce que je ne peux pas être (je ne tourne pas en continu),
GitHub le fait.
- **`.github/workflows/chien-de-garde.yml`**, toutes les 15 min : lit UNE
  ligne JSON sur le serveur (`.github/scripts/sante-serveur.sql`, lecture
  seule, comptes et secondes seulement — le journal est public), et
  **n'écrit qu'en cas de panne** : demande du site en attente depuis plus de
  2 min sans alerte réussie, relance pg_cron absente ou muette depuis plus de
  5 min, dix passages ratés au quart d'heure, Telegram qui ne refuse QUE des
  envois depuis une heure. Une Issue unique (marqueur), mise à jour tant que
  ça dure, fermée seule au retour à la normale ; jamais Telegram (il n'en
  veut pas plus). **Le juge est à part** (`chien-de-garde.mjs`) et
  éprouvé sans réseau par `test-chien-de-garde.mjs` : une nuit sans demande
  ne doit pas aboyer, une réponse illisible doit aboyer.
- **L'appel à l'API de gestion est copié du workflow des migrations**, qui
  marche en production — on ne devine pas un paramètre d'API qu'on ne peut
  pas vérifier d'ici (« NE DEVINE PLUS JAMAIS »).
- **`20261002010000_diagnostic_fiabilite.sql`** : le même état, lisible,
  pour le 10 octobre — à lancer par le workflow des migrations. Il ne
  modifie rien. Chaque ligne dit ce qu'elle doit valoir.
- **Le quota de `deposer-course` est celui de la réception, pas du wifi** :
  12 dépôts par heure et par IP pour un anonyme ; une réception dont la
  session est vérifiée compte sur `reception|<hôtel>|<heure>`, 60 par heure.
  À l'hôtel, le comptoir et les clients sur le wifi partagent une adresse.
  **Piège rencontré** : `heure` existait déjà dans la fonction (l'heure de la
  course) ; ma variable l'a redéclarée, et c'est le test, pas la relecture,
  qui l'a vu (« Identifier 'heure' has already been declared »).
  `test-securite-fonctions` charge maintenant `deposer-course` (import
  `jsr:` retiré au chargement) et lit la clé de quota envoyée.

## Rangé le 1er novembre 2026 (hors du mémo, toujours vrai)

- **Pas de serveur loué** : les fonctions Supabase suffisent pour annoncer,
  relancer et prévenir ; un serveur à tenir serait une panne de plus.
- `a-coller.ts` est le **secours au téléphone** : quand GitHub Actions ne peut
  pas déployer, Barbaros colle ce fichier d'un seul tenant dans l'éditeur de
  Supabase. Le déploiement normal reste `fonctions.yml`.
- WhatsApp ne sonne pas tout seul parce que l'**API Business** exige une
  vérification de l'entreprise et un numéro dédié : rien à coder d'ici.
