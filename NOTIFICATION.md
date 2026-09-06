# Être prévenu quand une demande arrive — 20 minutes

## Pourquoi

Aujourd'hui, une demande déposée à 5 h du matin n'existe que dans le
tableau de bord, et il faut l'ouvrir pour la voir. Entre-temps le client
a attendu, appelé quelqu'un d'autre, ou pris un taxi.

**Ce n'est pas un confort, c'est une course perdue.**

## Comment ça marche

```
Le client appuie sur « Confirmer »
        ↓
la course est écrite dans Supabase        ← elle est enregistrée ICI,
        ↓                                    quoi qu'il arrive ensuite
Supabase appelle la fonction « nouvelle-demande »
        ↓
Telegram et/ou e-mail
```

**La notification ne peut pas faire échouer une réservation.** Le signal
part **après** que la course est écrite, et de façon détachée. Si Telegram
est en panne, si un jeton est périmé : la course est enregistrée quand
même et le client voit bien sa demande partie. On perd le bip, jamais la
course.

## Ce que le message contient

```
Nouvelle demande — Ibis Roissy CDG Paris… → 15 rue de Rivoli, 75001…, 12/09/2026 06:30

Réf. ELA-26-09-0042

Départ : Ibis Roissy CDG Paris Nord 2
Arrivée : 15 rue de Rivoli, 75001 Paris
Quand : 12/09/2026 06:30

Berline · 2 passagers · 3 bagages
Paiement : Espèces
Prix : 90,00 €
Vol : AF1234
Vient de : Ibis CDG

Le client attend une réponse.
https://barbaros911.github.io/As-mine/admin.html
```

La première ligne est celle qui s'affiche sur l'écran verrouillé : elle
porte le trajet et l'heure, de quoi décider sans déverrouiller.

**Le nom et le téléphone du client n'y sont pas, ni le numéro de chambre.
C'est voulu.** Ils ne servent pas à décider — ils sont dans le tableau de
bord, à un doigt de là. Les envoyer chez Telegram ou chez un service
d'e-mail pour rien, c'est exactement ce que le RGPD appelle un excès
(article 5.1.c). C'est la même règle que le lien de confirmation `?ok=`,
qui ne porte pas non plus l'identité du client.

---

## Étape 1 — Choisir le canal

**Telegram (recommandé).** Gratuit, instantané, avec le son. C'est une
vraie notification de téléphone. Il faut installer l'application.

**E-mail.** Aucune application à installer, mais un e-mail de nuit arrive
souvent en silence, et parfois avec du retard. Il faut un compte chez un
service d'envoi (Resend, gratuit jusqu'à 3 000 messages par mois).

**Les deux marchent ensemble** : Telegram pour être réveillé, l'e-mail
comme trace écrite. Rien n'oblige à choisir tout de suite — la fonction
prend ce qui est configuré, et on peut ajouter l'autre plus tard sans
rien redéployer.

---

## Étape 2 — Telegram, si c'est la voie retenue

1. Installer **Telegram** sur le téléphone.
2. Y chercher **@BotFather** (le compte officiel, avec la coche bleue) et
   lui écrire `/newbot`.
3. Il demande un nom (`Elatransfer`) puis un identifiant qui doit finir
   par `bot` (`elatransfer_alertes_bot`).
4. Il répond avec un **jeton** de la forme `1234567890:AAG...`. **Le
   garder** — c'est lui qui donne le droit d'écrire.
5. Ouvrir une conversation avec **le bot qu'on vient de créer** et lui
   envoyer n'importe quoi (« bonjour »). **Cette étape n'est pas
   facultative** : un bot ne peut pas écrire le premier à quelqu'un qui ne
   lui a jamais parlé.
6. Chercher **@userinfobot** sur Telegram, lui écrire : il répond un
   numéro (`Id: 123456789`). C'est le **chat id**, l'adresse où le bot
   doit écrire.

---

## Étape 3 — L'e-mail, si c'est la voie retenue

1. Créer un compte sur **resend.com** avec l'adresse où les alertes
   doivent arriver.
2. **API Keys** → créer une clé, la garder.
3. Sans domaine vérifié, Resend n'autorise l'envoi **que vers l'adresse du
   compte** et depuis `onboarding@resend.dev`. C'est exactement le besoin
   ici : les alertes vont à Barbaros, pas à des clients.
4. Pour envoyer depuis `alertes@elatransfer.com`, il faudrait vérifier le
   domaine chez Resend, ce qui demande d'ajouter des enregistrements DNS.
   **Ce n'est pas nécessaire pour cette alerte**, et ça touche au DNS
   d'`elatransfer.com` — donc à ce qui fait marcher l'e-mail existant. À
   ne faire que si le besoin apparaît, et posément.

---

## Étape 4 — Déployer la fonction

Sur un ordinateur, une fois :

```bash
npm install -g supabase
supabase login
supabase link --project-ref yyhzutnuhuytokarynaw
supabase functions deploy nouvelle-demande
```

Puis poser les secrets — **seulement ceux du canal retenu** :

```bash
# Telegram
supabase secrets set TELEGRAM_TOKEN="1234567890:AAG..."
supabase secrets set TELEGRAM_CHAT="123456789"

# E-mail
supabase secrets set RESEND_CLE="re_..."
supabase secrets set EMAIL_EXPEDITEUR="onboarding@resend.dev"
supabase secrets set EMAIL_DESTINATAIRE="contact@elatransfer.com"
```

**Ces secrets ne sont pas dans le dépôt et n'y seront jamais.** Ils vivent
chez Supabase, et la fonction s'exécute là-bas. C'est toute la différence
avec la clé d'itinéraire, qui doit forcément partir dans la page du client
parce que c'est le navigateur qui calcule.

---

## Étape 5 — Brancher le déclencheur

Dans le tableau de bord Supabase : **Database → Webhooks → Create a new
hook**.

| Champ | Valeur |
|---|---|
| Name | `nouvelle-demande` |
| Table | `courses` |
| Events | **Insert uniquement** |
| Type | *Supabase Edge Functions* |
| Edge Function | `nouvelle-demande` |
| Method | `POST` |

**« Insert » uniquement, et c'est important.** Avec *Update* coché, chaque
changement de statut — chauffeur attribué, course terminée — enverrait
« Nouvelle demande » pour une course qu'il vient de traiter lui-même. Au
bout de trois jours il cesserait de regarder ses notifications, et c'est
la seule vraie façon de casser ce système.

*(La fonction refuse de toute façon tout ce qui n'est pas un INSERT sur
`courses` — mais mieux vaut ne pas l'appeler pour rien.)*

Supabase ajoute tout seul l'en-tête d'autorisation. La fonction n'est donc
pas appelable par n'importe qui depuis l'extérieur.

---

## Étape 6 — Vérifier

1. Sur un autre téléphone, ouvrir le site public et faire une vraie
   réservation.
2. La notification doit arriver **en quelques secondes**.

Si rien n'arrive : **Edge Functions → nouvelle-demande → Logs**. La
fonction écrit toujours ce qu'elle a fait — `telegram : ok`,
`email : 401 ...`, ou `aucun canal configuré`. Les trois pannes courantes :

| Ce que disent les journaux | Ce que c'est |
|---|---|
| `aucun canal configuré` | les secrets ne sont pas posés, ou mal nommés |
| `telegram : 403 ...` | l'étape 2.5 a été sautée : écrire au bot d'abord |
| `telegram : 400 chat not found` | le chat id n'est pas le bon |
| `email : 403 ...` | Resend refuse le destinataire : sans domaine vérifié, seule l'adresse du compte est autorisée |

---

## Ce qui reste vrai après ça

- **Le tableau de bord reste la vérité.** La notification dit qu'une
  course est arrivée ; c'est dans le tableau de bord qu'on la traite, et
  c'est là que sont le nom et le téléphone du client.
- **Une notification perdue n'est pas une course perdue.** La course est
  dans Supabase de toute façon, et remonte à l'ouverture du registre.
- **Ça ne remplace pas WhatsApp entre Barbaros et le client.** C'est une
  alerte pour lui, dans un sens seulement : on ne peut pas y répondre.

## Ce qui pourrait venir ensuite, par la même porte

La fonction est le premier bout de code d'Elatransfer qui s'exécute
ailleurs que dans le navigateur du client. C'est ce qui manquait pour :

- **cacher la clé d'itinéraire** — la faire passer par une fonction, où
  elle serait invisible du navigateur ;
- **laisser un client consulter sa course** avec sa seule référence, sans
  ouvrir la lecture de la base à tout le monde ;
- **les comptes chauffeurs**, avec les dates d'expiration des papiers et
  une alerte — l'obligation de la centrale de réservation (Code des
  transports L3142-1).

Aucune de ces trois ne demande de louer un serveur.
