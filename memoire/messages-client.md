# Les messages au client — la trace et le pense-bête

> Histoire du sujet. Ce qui vaut aujourd'hui est dans `CLAUDE.md`
> (« L'espace exploitant », « Les alertes à Barbaros »).

## 24 octobre 2026 — l'audit, puis la demande

Barbaros a demandé un audit : faut-il construire un vrai système de
communication automatique (WhatsApp Business, SMS, e-mail) ? Mesuré dans
le code ce jour-là :

- **Automatique** : l'alerte de chaque demande à Barbaros (Telegram,
  notification ELA, relance), le bon « Demande reçue » à l'écran du client,
  la notification push « Transfert confirmé » aux rares clients abonnés, la
  liste de la réception (relue toutes les 30 s, écran ouvert).
- **Manuel, depuis le téléphone de Barbaros** : accusé de réception,
  confirmation avec le lien de paiement, demande d'avis, annonce au groupe,
  détails au chauffeur retenu, relance des commissions.
- **Rien du tout** : refus, annulation, changement d'heure ou d'adresse —
  ni texte prêt, ni bouton, ni alerte. Le client refusé à 5 h attendait une
  voiture qui ne viendrait pas.
- **Le défaut le plus grave** : « Prévenir le client » ne laissait **aucune
  trace**. C'est le message qui porte le lien de paiement ; oublié, le client
  ne paie pas et le chauffeur ne part pas (CGV art. 5), sans que rien le
  signale.
- Autres trous : « Accusé de réception envoyé » s'écrivait **au clic**
  (l'admin ne voit jamais le bouton « envoyer » de WhatsApp) ; la demande
  d'avis partait toujours sur WhatsApp, même pour un client « appel / SMS » ;
  `etat-course` rendait la nouvelle heure, la page du client ne la lisait pas.

**L'avis donné** : pas de fournisseur maintenant (SIRET absent, compte
d'entreprise exigé par Meta et par les services de SMS, peu de temps gagné
au volume actuel). D'abord la **fiabilité**, gratuite : que rien ne s'oublie.
Le jour du SIRET et d'un volume de 20 à 30 courses par jour : un fournisseur
SMS, une table d'envoi côté serveur (« boîte d'envoi ») et trois envois
automatiques (accusé, rappel avant la course, avis). Confirmation, refus et
annulation resteraient déclenchés par un humain. WhatsApp Business plus tard,
avec plusieurs opérateurs.

Barbaros, expliqué « comme à six ans » : « Oui fait, fait un expert,
n'oublie rien ».

## Ce qui a été construit (PR du 24 octobre 2026)

- **`messagesClient`** sur la course : chaque message ouvert pour le client
  (accusé, confirmation, refus, annulation, modification, avis), avec son
  canal (WhatsApp, Messages, Telegram, « prévenu autrement ») et son heure.
  Le mot est **« ouvert »**, jamais « envoyé ». L'historique s'affiche sur le
  bon (« Messages au client »), avec l'accusé et l'avis retenus avant.
- **`aPrevenir`** sur la course : posé par le geste — « Confirmer », un
  nouveau chauffeur sur une course confirmée (CGV art. 8), « Refuser »,
  « Annuler », « Modifier » une course confirmée si le client est concerné
  (date, heure, adresses, véhicule, prix), « Saisir par téléphone » avec un
  chauffeur. Il s'éteint quand le message est ouvert, ou par « Déjà prévenu
  autrement » (deux appuis : il fait taire un rappel). Une course faite, un
  client qui a payé (confirmation), un état qui a changé, un départ passé
  d'une heure (trois heures après le geste pour une demande immédiate) le
  rendent caduc. **Une course d'avant ce jour n'en a pas** : aucune fausse
  alerte sur l'historique.
- **Au tableau de bord** : l'écriteau rouge « N clients n'ont pas encore été
  prévenus », qui ouvre la course la plus pressée (un refus n'est dans aucune
  liste), et la pastille « Client à prévenir » sur la carte.
- **Trois messages prêts**, dans la langue de la course et par le moyen
  choisi par le client : refus, annulation, changement. « Rien ne vous est
  dû » seulement si la course n'est pas payée (CGV art. 3 et 7) ; une course
  payée ne dit rien de l'argent — remboursement ou non selon qui annule, ça
  se dit de vive voix. Le changement redit l'ancienne heure (« au lieu
  de »), le chauffeur, le lien du bon ; le prix seulement s'il a changé ;
  jamais le lien de paiement.
- **Un nouveau prix sur une course payable par lien, pas payée** : c'est la
  confirmation complète qui est à refaire, et le bon avertit tant que
  l'ancien lien est collé (il réclame l'ancien montant).
- **Le rappel Telegram** (`rappelerAPrevenir`, dans la relance de 20 s) :
  15 min après le geste, puis un dernier à H-3 (45 min pour une demande
  immédiate), deux au plus, rien après le départ. Sans bouton « Vu ».
  Journal : `client_a_prevenir`.
- **La demande d'avis** part par le moyen choisi par le client.
- **Le bon du client** reprend la date et l'heure rendues par `etat-course`.

## Pièges rencontrés

- **Le refus revient au tableau de bord**, comme avant : c'est là que vit le
  témoin d'envoi (`#bordSynchro`) qui dit une panne du réseau. Rester sur le
  bon l'aurait caché (`test-admin-arrivee` le vérifie). L'écriteau rouge
  rouvre la course.
- **`scroll-behavior:smooth` mange les défilements** : l'écran rouvert
  remonte en haut en douceur, et cette animation ignorait un
  `scrollIntoView` « instant » (mesuré : 1506 px, puis la page redescendait
  jusqu'à 254). On suspend le doux le temps de poser l'écran.
- **`aPrevenir: null` reste une clé JSON** : côté serveur, le filtre lit
  `bon->>aPrevenir` (texte, nul pour un `null` JSON), jamais `bon->aPrevenir`.

## Ce qui n'est pas fait, volontairement

- **Aucun envoi automatique au client** : il faut un fournisseur, donc le
  SIRET. Le site ouvre l'application ; Barbaros appuie sur « envoyer ».
- **Pas de relance de paiement** : retirée le 11/10 à sa demande.
- **Pas de message au chauffeur** : l'annonce au groupe et les détails au
  chauffeur retenu restent à la main.

## Décisions ouvertes, à Barbaros

- **La confirmation ne redit ni le trajet ni le prix** (règle « six lignes »),
  alors que les CGV (art. 3, 19/10) promettent une confirmation « rappelant
  le trajet, la date, l'heure, la catégorie et le prix total ». À trancher.
- **La confirmation n'existe qu'en français**, même pour une course réservée
  en anglais (l'accusé, l'avis et les trois nouveaux messages suivent la
  langue).
- Les libellés des trois messages et de l'écriteau sont à valider.

Suites : `test-admin-messages-client.mjs` (admin et bon du client),
`test-relance-alertes.mjs` (rappel Telegram), `test-notification.mjs`
(textes du rappel).
