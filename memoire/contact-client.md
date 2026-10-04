# Par où part la demande, par où joindre le client

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
- **Écartés** : le code par SMS (payant, compte à ouvrir, SIRET, touriste sans
  réseau, impossible au comptoir, contraire à « aucun blocage commercial ») ;
  l'API WhatsApp Business (vérification d'entreprise, numéro dédié).
- Le contrôle de forme côté serveur (`deposer-course` n'exige que 6
  caractères) a été jugé utile mais secondaire : il ne gêne que celui qui
  contourne la page exprès. Pas fait, à rouvrir si besoin.

## Ce qui a été construit

- **Le numéro est relu** sous le champ, tel qu'on le composera, avec le pays :
  « +33 7 70 09 00 12 (France) » sous les yeux d'un Anglais, l'erreur saute aux
  yeux (`telLisible`, table `PAYS_INDICATIF`).
- **La règle est dite avant l'envoi** : « Nous vous contactons pour confirmer.
  Sans réponse de votre part, aucun chauffeur n'est envoyé. »
- **« Envoyer ma demande par »** : WhatsApp (choix d'ouverture, comme avant),
  Telegram, Messages, le site seulement. La demande part sur le serveur dans
  TOUS les cas ; le message est un second chemin.
  - **Telegram n'est proposé pour l'envoi que si `TELEGRAM_ELA` est rempli** :
    Telegram n'ouvre une conversation avec un message écrit QUE par un nom
    d'utilisateur (`t.me/<nom>?text=`), jamais par un numéro.
  - **Messages** ouvre `sms:` : iOS lit `&body=`, Android `?body=` (RFC 5724).
    Sur iPhone, l'envoi part en iMessage, gratuit, si le destinataire en a un.
- **La seule question** : numéro ÉTRANGER + « le site seulement » →
  « Comment voulez-vous être contacté ? » WhatsApp / Telegram / iMessage,
  obligatoire dans ce cas. Envoyée par une application, la demande prouve le
  numéro et dit où répondre ; un numéro français se joint par appel ou SMS,
  gratuits.
- **Le bon porte `contact: {envoi, prefere}`**, gardé par `deposer-course`
  (deux listes fermées). Absent sur les anciennes courses, les saisies et
  les demandes collées.
- **Admin** : la phrase `#bbContact` dit le canal ; quatre boutons (Appeler,
  WhatsApp, Messages, Telegram), celui du client en plein. « Accuser
  réception » et « Prévenir le client » écrivent par ce canal. Telegram vers
  un numéro (`t.me/+<numéro>`, si le client l'autorise) n'accepte pas de
  texte : il est copié, Barbaros le colle.
- **Au comptoir rien ne change** : le bloc est masqué, rien ne s'ouvre.

## La suite décidée

Après le lancement : un second bot Telegram réservé aux clients, qui vérifie
le numéro par « Partager mon numéro » (le numéro vérifié par Telegram) et
envoie la confirmation tout seul. Gratuit, monde entier.

Suites : `test-nouveau-contact.mjs`, `test-securite-fonctions.mjs`.
