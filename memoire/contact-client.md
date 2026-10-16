# Où le client reçoit sa confirmation

4 octobre 2026, décidé avec Barbaros au fil d'une conversation partie d'une
question simple : « je peux inventer des numéros qui commencent par 03 et ça
passe ».

## Le raisonnement

- **Un contrôle de forme ne sait pas si un numéro EXISTE.** Un 03 à dix
  chiffres est un vrai fixe du Nord-Est. Les 08, les chiffres répétés et les
  numéros sans indicatif qui ne commencent pas par 0 étaient déjà refusés.
- **Le faux numéro ne coûte rien** : Barbaros joint toujours le client avant
  d'envoyer un chauffeur. Sans réponse, personne ne part.
- **Le vrai risque est le vrai client qui se trompe**, surtout l'étranger qui
  oublie son indicatif : « 0770090012 », un mobile anglais tapé sans +44, a
  exactement la forme d'un mobile français.
- **Un fixe doit pouvoir commander** (Barbaros) : une entreprise réserve pour
  un collaborateur depuis son standard.
- **Le coût de joindre le client** : appel et SMS vers un numéro français
  sont dans les forfaits courants ; vers l'étranger ils peuvent coûter cher,
  WhatsApp, Telegram et iMessage (depuis son iPhone) non.
- **Écartés** : le code par SMS (payant, compte à ouvrir, SIRET, touriste
  sans réseau, impossible au comptoir, contraire à « aucun blocage
  commercial ») ; l'API WhatsApp Business (vérification d'entreprise, numéro
  dédié). Le contrôle de forme côté serveur (`deposer-course` n'exige que 6
  caractères) : utile mais secondaire, il ne gêne que celui qui contourne la
  page exprès — pas fait.

## Deux versions, et celle qui a été retenue

Une première version faisait choisir au client « Envoyer ma demande par »
(WhatsApp, Telegram, Messages, le site seul), plus une seconde question pour
un étranger passé par le site. **Barbaros a retenu l'option A** : UNE seule
question, la demande part toujours du site. Raisons : deux questions sur le
même sujet font hésiter au moment de valider ; ouvrir une application au
clic fait perdre des clients (le téléphone change d'application) ; et
c'était devenu inutile — la demande arrive dans l'admin, Telegram l'annonce.

**AUCUNE APPLICATION NE S'OUVRE PLUS AU CLIC SUR « ENVOYER MA DEMANDE ».**
L'ouverture automatique de WhatsApp (septembre 2026, « second chemin si le
dépôt échoue ») est retirée pour tout le monde ; le comptoir ne l'avait déjà
plus. **Le repli reste** : le bouton « Renvoyer par WhatsApp » du bon, qui
devient le seul chemin si le dépôt échoue. Si l'alerte Telegram de Barbaros
tombe un jour, c'est cette décision qu'il faut rouvrir.

## Ce qui existe

- **« Où souhaitez-vous recevoir votre confirmation ? »** (`#blocContact`),
  obligatoire, rien de présélectionné, masquée au comptoir. Les choix suivent
  le numéro : français → Appel / SMS, WhatsApp ; étranger → WhatsApp,
  Telegram, iMessage, avec « Numéro international : … sans frais ». Un choix
  devenu invisible (Appel / SMS puis un +44) est oublié.
- **Le numéro est relu** sous le champ avec son pays : « +33 7 70 09 00 12
  (France) » sous les yeux d'un Anglais, l'erreur saute aux yeux
  (`telLisible`, `PAYS_INDICATIF`).
- **La règle est dite avant l'envoi** : « Elatransfer vous contacte pour
  confirmer votre réservation. Sans réponse de votre part, elle ne pourra pas
  être confirmée. »
- **Pictogrammes** : la marque de WhatsApp et de Telegram (usage descriptif),
  une bulle générique pour iMessage — JAMAIS l'icône d'Apple —, un combiné
  pour l'appel. Sous 360 px le pictogramme passe au-dessus du nom, sinon
  « WhatsApp » se coupait.
- **Le bon porte `contact: {envoi:"site", prefere}`**, gardé par
  `deposer-course` (listes fermées). Absent sur les anciennes courses, les
  saisies et les demandes collées.
- **Admin** : `#bbContact` dit le canal ; quatre boutons (Appeler, WhatsApp,
  Messages, Telegram), celui du client en plein (« appel ou SMS » allume
  Appeler et Messages). « Accuser réception » et « Prévenir le client »
  écrivent par ce canal ; « appel ou SMS » part en SMS. Telegram vers un
  numéro (`t.me/+<numéro>`, si le client l'autorise) n'accepte pas de
  texte : il est copié, Barbaros le colle.
- **Le Telegram d'Elatransfer est @elatransfer** (confirmé par Barbaros). Il
  ne sert plus côté client dans l'option A ; utile pour le bot à venir.

## Relu à la place du client (5 octobre 2026)

- **Le bon promettait « sur WhatsApp » à tout le monde**, y compris au client
  qui venait de choisir Telegram ou iMessage. La promesse (`#notifWa`) nomme
  maintenant le moyen choisi, et les messages de notification disent « par
  le moyen choisi ». Un bon ancien sans choix retombe sur WhatsApp.
- **La phrase sous le numéro rassure au lieu de menacer** : « Elatransfer vous
  contacte rapidement pour confirmer votre réservation. Gardez votre
  téléphone à portée de main. »
- **La politique de confidentialité nomme Telegram, iMessage et l'opérateur
  téléphonique** (FR/EN, mise à jour du 5 octobre 2026) : un numéro qui passe
  par ces services doit y être écrit.

## La suite décidée

Après le lancement : un second bot Telegram réservé aux clients, qui vérifie
le numéro par « Partager mon numéro » et envoie la confirmation tout seul.

Suites : `test-nouveau-contact.mjs`, `test-securite-fonctions.mjs`,
`test-nouveau-whatsapp.mjs` (le message, par le repli du bon).

## Le bon disait encore « si WhatsApp ne s'est pas ouvert » (15 octobre 2026)

Audit final des quatre prompts internationaux, mesuré sur le site construit,
en français et en anglais, dépôt refusé (503) par un faux serveur :
- **La note sous le bon** (`renvoi_note`) disait « Si WhatsApp ne s'est pas
  ouvert, ou si vous n'avez pas appuyé sur envoyer, renvoyez-le d'ici » —
  l'ouverture automatique est retirée depuis le 4 octobre (option A). Onze
  jours en ligne, sur chaque bon, dans les deux langues ; aucune suite ne la
  lisait, et `textes-interdits.mjs` ne la connaissait pas. Elle dit
  maintenant « Vous pouvez aussi nous envoyer votre demande sur WhatsApp »,
  vraie dans les deux états, et la phrase retirée est dans la liste des
  textes interdits (construction et production).
- **La tête du bon disait « Demande reçue — Nous vérifions la disponibilité
  d'un chauffeur »** pendant que l'écriteau rouge, dix lignes plus bas,
  disait « votre demande n'a pas pu nous être transmise ». `jugerTeteBon()`
  écrit l'état et la phrase de tête d'après le dépôt : « Demande non
  transmise — Votre demande ne nous est pas encore parvenue » sur un échec,
  et « Demande reçue » revient dès que la reprise aboutit. Seul le bon de la
  demande en cours est concerné ; un bon rouvert depuis « Mes courses »
  garde ses libellés. Les libellés sont à valider par Barbaros.
- Ce que l'audit n'a pas changé : un bon jamais déposé reste « en attente »
  dans « Mes courses » après un rechargement (le serveur ne le connaît pas,
  `nuage.etat()` ne peut rien en dire). À décider.
- Contrôles : `test-nouveau-serveur.mjs` (quatre contrôles de plus, qui
  tombent sur l'ancien code) ; `test-parcours-en.mjs` (le parcours anglais
  de bout en bout, écrit par l'audit).

## « Nous appeler » sur un envoi raté (16 octobre 2026)

Barbaros, en voyant les captures : « on peut ajouter appeler directement
aussi ». Sur un dépôt raté, le bon du client porte maintenant un bouton
« Nous appeler · 07 59 31 24 33 » (`#btnAppelerBon`, `tel:+33759312433`),
sous « Renvoyer ma demande sur WhatsApp » ; l'écriteau rouge dit « Envoyez-la
sur WhatsApp ou appelez-nous » au lieu de « c'est le seul moyen ».
- **Seulement sur un échec**, jugé dans `jugerTeteBon()` avec la tête du
  bon : demande arrivée, appeler n'apporte rien.
- **Le numéro est écrit dans le bouton** : un ordinateur ne compose rien.
- **Jamais au comptoir** : son écriteau porte déjà le numéro.
- **Sur un échec, la petite note se tait**, comme au comptoir : l'écriteau et
  les deux boutons disent déjà quoi faire.
- Contrôles : `test-nouveau-serveur` (échec, succès, reprise),
  `test-nouveau-reception` (comptoir), `test-parcours-en` (anglais).
