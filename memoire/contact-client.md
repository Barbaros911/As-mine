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

## La suite décidée

Après le lancement : un second bot Telegram réservé aux clients, qui vérifie
le numéro par « Partager mon numéro » et envoie la confirmation tout seul.

Suites : `test-nouveau-contact.mjs`, `test-securite-fonctions.mjs`,
`test-nouveau-whatsapp.mjs` (le message, par le repli du bon).
