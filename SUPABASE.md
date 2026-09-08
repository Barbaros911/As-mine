# Brancher le serveur — 15 minutes

Aujourd'hui le site ne peut rien transmettre : le client doit envoyer son
récapitulatif sur WhatsApp, et Barbaros doit le recoller de l'autre côté.

Une fois ces étapes faites, le client appuie sur « Confirmer » et **c'est
fini pour lui** : la demande arrive directement dans le tableau de bord,
sur n'importe quel appareil. Les trois boutons d'envoi disparaissent de son
écran.

Tout est gratuit. Le palier gratuit de Supabase est très au-dessus du
volume d'Asmine.

---

## 1. Créer le projet

1. Aller sur **supabase.com**, créer un compte, puis un projet.
2. Choisir la région **Europe (Frankfurt ou Paris)** — les données des
   clients sont des données personnelles européennes, elles n'ont pas à
   partir aux États-Unis.
3. Noter le mot de passe de la base : il ne resservira pas ici, mais on ne
   le retrouve pas.

## 2. Créer la table et **les règles de sécurité**

Dans le projet : **SQL Editor** → coller ceci → **Run**.

⚠️ **Ne pas sauter la partie « Row Level Security ».** C'est elle, et elle
seule, qui empêche n'importe qui de lire le nom, le téléphone et l'adresse
de tous les clients. Sans elle, c'est une violation caractérisée du RGPD.

```sql
-- La table des courses. Le bon de réservation entier tient dans une colonne
-- JSON : le jour où le bon gagne un champ, la table n'a pas à changer.
create table public.courses (
  ref      text primary key,
  statut   text not null default 'attente',
  bon      jsonb not null,
  cree_le  timestamptz not null default now()
);

-- Rien n'est lisible ni modifiable tant qu'une règle ne l'autorise pas.
alter table public.courses enable row level security;

-- Le visiteur anonyme (le client sur le site) peut DÉPOSER une demande.
create policy "un client peut deposer sa demande"
  on public.courses for insert
  to anon
  with check (true);

-- Il ne peut RIEN lire. Aucune policy de lecture pour « anon » : c'est
-- volontaire, et il ne faut jamais en ajouter une.

-- L'exploitant connecté lit et met à jour tout.
create policy "l exploitant lit tout"
  on public.courses for select
  to authenticated
  using (true);

create policy "l exploitant met a jour"
  on public.courses for update
  to authenticated
  using (true) with check (true);

-- ⚠️ AJOUTÉ EN SEPTEMBRE 2026, ET IL MANQUAIT.
-- Sans cette ligne, les courses que Barbaros saisit LUI-MÊME — un hôtel qui
-- appelle, une demande collée depuis WhatsApp — ne montaient jamais sur le
-- serveur. Elles n'ont pas été déposées par un client, donc il n'y avait
-- aucune ligne à mettre à jour : elles ne vivaient que dans son téléphone,
-- et changer d'appareil les perdait. Or c'est une bonne part de son travail.
create policy "l exploitant depose aussi"
  on public.courses for insert
  to authenticated
  with check (true);
```

**Si le projet a été créé avant septembre 2026**, cette dernière policy
n'existe pas : la coller seule dans le **SQL Editor** et faire **Run**. Rien
d'autre ne change, et rien ne peut casser — une policy en plus n'ouvre que
ce qu'elle nomme.

### La table des abonnements aux notifications

Elle sert au client qui coche « Prévenez-moi » sur son bon : son navigateur
fabrique un abonnement, on le range ici, et c'est lui qu'on retrouvera au
moment où Barbaros confirme la course.

⚠️ **C'est une table à part, et pas une colonne de la course.** L'ajouter au
bon obligerait à donner le droit de **modifier** une ligne existante au
visiteur anonyme — et n'importe qui pourrait alors réécrire la réservation
d'un autre. Ici, un anonyme ne peut que **déposer**, jamais lire ni changer.

```sql
create table public.abonnements (
  id          bigserial primary key,
  ref         text not null,
  abonnement  jsonb not null,
  cree_le     timestamptz not null default now()
);
create index on public.abonnements (ref);

alter table public.abonnements enable row level security;

-- Le client dépose SON abonnement, et rien d'autre.
create policy "un client depose son abonnement"
  on public.abonnements for insert
  to anon
  with check (true);

-- Aucune lecture pour « anon » : un abonnement est une adresse d'envoi.
-- Lisible de tous, n'importe qui pourrait envoyer une fausse notification
-- « Transfert confirmé » aux clients d'Elatransfer.
```

La fonction qui envoie, elle, lit cette table avec la clé `service_role`,
qui passe au-dessus de toutes les règles et ne quitte jamais Supabase.

## 3. Créer le compte de Barbaros

**Authentication** → **Users** → **Add user** → *Create new user*.
Mettre une vraie adresse e-mail et **un vrai mot de passe** — celui-ci ouvre
les données réelles des clients, ce n'est pas le code `12345678` de
l'appareil.

Puis **Authentication → Providers → Email** : désactiver
*« Enable sign ups »*. Sans ça, n'importe qui pourrait se créer un compte et
lire toutes les courses.

## 4. Coller les deux identifiants dans le site

**Project Settings → API**, y prendre :

| Dans Supabase | Dans `index.html` |
|---|---|
| *Project URL* | `const SUPABASE_URL = "https://xxxx.supabase.co";` |
| *Project API keys* → **`anon` `public`** | `const SUPABASE_CLE = "eyJ...";` |

⚠️ **Prendre la clé `anon public`, jamais la `service_role`.** La
`service_role` contourne toutes les règles de sécurité ci-dessus ; dans une
page publique, elle donnerait à tout le monde un accès complet.

La clé `anon` est publique par construction — elle part dans la page, et le
dépôt est public. C'est normal : ce n'est pas elle qui protège, ce sont les
règles de l'étape 2.

## 5. Se connecter

Sur le site, en mode exploitant : entrée **Serveur** dans la colonne de
gauche → l'e-mail et le mot de passe de l'étape 3.

La connexion **se renouvelle toute seule** : le jeton d'accès de Supabase ne
vit qu'une heure, et le site le remplace sans rien demander. Si l'écriteau
rouge « Votre session a expiré » apparaît quand même, c'est que le
renouvellement lui-même a été refusé — il faut alors se reconnecter ici.

---

## Changer de téléphone sans rien perdre

C'est la raison d'être du serveur, et voici la manœuvre exacte :

1. Sur le **nouveau** téléphone, ouvrir `elatransfer.com/admin.html`, saisir
   le code d'accès de l'appareil.
2. **Registre** → bloc **Serveur** → l'e-mail et le mot de passe de l'étape 3.
3. **Actualiser**. Toutes les courses redescendent.

Rien à exporter, rien à recopier. L'ancien téléphone peut être éteint,
perdu ou vendu.

**Deux précautions quand même :**

- Le serveur ne remonte que ce qui y est monté. Une course saisie pendant
  que la connexion au serveur était rompue reste locale jusqu'à ce que son
  bon soit rouvert ou modifié. L'écriteau de sauvegarde du tableau de bord
  reste donc utile : c'est la ceinture, le serveur est les bretelles.
- La fusion **AJOUTE et n'écrase jamais**. Une course déjà présente sur
  l'appareil garde son état local — c'est voulu : elle peut avoir avancé
  depuis (chauffeur attribué, course réalisée) et l'écraser avec une version
  plus ancienne effacerait le travail de la soirée.

## Vérifier que ça marche

1. Ouvrir le site public sur un autre téléphone, faire une réservation.
2. Le client doit voir **« Votre demande nous est bien parvenue »** —
   sans aucun bouton WhatsApp.
3. Sur le téléphone de Barbaros : **Registre → Actualiser**. La course est là.

Si ça ne marche pas, le site retombe **tout seul** sur l'ancien
fonctionnement : le client revoit ses trois boutons d'envoi. Aucune
réservation n'est perdue en route.

---

## Ce que ça débloque ensuite

Le serveur est la brique qui manquait à toute la feuille de route :
comptes chauffeurs par SMS, premier qui accepte prend la course, suivi en
direct, commission due par chauffeur et blocage au-delà d'un seuil, dates
d'expiration des papiers avec alerte, avis clients, export comptable.

Tout cela était impossible sans lui. Rien ne l'est plus.

---

## Pour être prévenu sur son téléphone

**C'est écrit, il reste à le déployer.** Une fonction Supabase envoie une
alerte — Telegram et/ou e-mail — dès qu'une course est déposée, avec le
trajet, l'heure, le véhicule et le prix. La marche à suivre complète est
dans **`NOTIFICATION.md`** ; il faut vingt minutes et l'accès au compte
Supabase.

Deux points qui ne se devinent pas :

- **La notification ne peut pas faire échouer une réservation.** Le signal
  part après l'écriture de la course, de façon détachée. Une panne de
  Telegram fait perdre le bip, jamais la course.
- **Le message ne porte ni le nom ni le téléphone du client**, ni son
  numéro de chambre : ils ne servent pas à décider, ils sont dans le
  tableau de bord, et les envoyer chez un tiers pour rien est exactement
  ce que le RGPD interdit.

**WhatsApp reste hors de portée** : l'API Business de Meta demande une
vérification d'entreprise **et un numéro dédié, qui ne peut plus servir
dans l'application WhatsApp normale**. C'est le point à peser avant de s'y
engager.

---

## Prévenir le CLIENT quand la course est confirmée

L'autre sens : Barbaros confirme, et le téléphone du client sonne, même
s'il a fermé la page. **Ça ne remplace pas le message WhatsApp** — les deux
partent, et c'est voulu : la notification arrive tout de suite mais peut
être refusée ou effacée d'un geste ; le message WhatsApp, lui, reste.

**Tout est écrit et éprouvé hors ligne** (`node test-push.mjs`, 21
contrôles, dont le déchiffrement du message par une bibliothèque écrite par
quelqu'un d'autre). Il ne manque que ce qui exige le compte : poser les
trois secrets et coller la fonction. Vingt minutes, depuis un téléphone.

### 1. La paire de clés VAPID

Elle existe déjà. La **publique** est dans `index.html` (`CLE_VAPID`) — elle
est publique par construction, le navigateur la reçoit de toute façon. La
**privée** ne doit **jamais** entrer dans le dépôt : elle est le seul
secret qui empêche un tiers d'envoyer des notifications au nom
d'Elatransfer. Elle a été remise à Barbaros à part.

Pour en refaire une paire un jour, il faut les deux ensemble : une clé
publique dans la page qui ne correspond pas à la privée des secrets fait
accepter l'abonnement par le navigateur **et** refuser l'envoi par le
service de push — une panne qui ne se voit qu'au premier client.

Cet accord se vérifie en une commande, la clé en main, **sans jamais
l'écrire dans un fichier** :

```bash
VAPID_PRIVEE=la-cle-privee node test-push.mjs
```

Elle dit « LA CLÉ DE LA PAGE EST BIEN CELLE DU SECRET », et vérifie au
passage que cette clé privée ne traîne dans aucun fichier du dépôt.

### 2. Poser les trois secrets

**Edge Functions → Secrets** (ou *Settings → Edge Functions*) →
**Add new secret**, trois fois. Les noms s'écrivent **exactement** ainsi :
un secret mal nommé n'est pas une erreur visible, la fonction croit
simplement qu'elle n'est pas configurée.

| Nom | Valeur |
|---|---|
| `VAPID_PUBLIQUE` | la clé publique, celle de `CLE_VAPID` |
| `VAPID_PRIVEE` | la clé privée, remise à part |
| `VAPID_SUJET` | `mailto:contact@elatransfer.com` |

`SUPABASE_SERVICE_ROLE_KEY` et `SUPABASE_URL` sont déjà là : Supabase les
pose lui-même. **Ne jamais recopier la `service_role` ailleurs** — elle
passe au-dessus de toutes les règles de sécurité.

### 3. Coller la fonction

**Edge Functions → Deploy a new function → via Editor**. Nom exact :
`prevenir-client`. Ouvrir
`supabase/functions/prevenir-client/a-coller.ts` sur GitHub, tout
sélectionner, coller par-dessus l'exemple, **Deploy**.

Ce fichier est **fabriqué**, jamais écrit à la main
(`node supabase/functions/prevenir-client/assembler.mjs`) : le chiffrement
vit dans un `.js` ordinaire pour qu'un test puisse le relire sans déployer,
et l'assembleur en fait un seul morceau parce qu'on ne colle pas deux
fichiers avec un pouce.

**Aucun réglage de webhook ici**, contrairement à l'alerte de Barbaros :
c'est le site qui appelle cette fonction, à l'instant où il appuie sur
« Confirmer la course ».

### 4. Vérifier

Réserver depuis un téléphone, appuyer sur **« Prévenez-moi »** au bas du
bon, accepter la demande du navigateur. Puis confirmer la course depuis la
page admin : la notification doit arriver en quelques secondes.

Si rien n'arrive : **Edge Functions → prevenir-client → Logs**. La fonction
répond une **erreur** quand un secret manque, jamais un succès muet — un
« 200 OK » ferait croire pendant des semaines que ça marche.

### Ce qu'il faut savoir avant de le promettre à un client

- **Sur iPhone, il faut d'abord installer le site sur l'écran d'accueil.**
  Safari ne connaît les notifications que là. Le bouton le dit lui-même
  plutôt que d'échouer en silence.
- **Un refus est définitif.** Le navigateur ne repose plus jamais la
  question. C'est pourquoi on ne demande rien au chargement : uniquement
  sur un appui, une fois la demande déposée.
- **La notification ne porte ni le nom, ni le téléphone, ni les adresses**
  du client — même règle que le lien `?ok=` : une notification s'affiche
  sur un écran verrouillé, que n'importe qui peut lire par-dessus l'épaule.
- **Elle ne peut pas faire échouer une confirmation.** L'appel part
  détaché : fonction en panne, abonnement périmé, le client est confirmé
  quand même et le message WhatsApp part comme avant.

---

## La réponse arrive AUSSI sur le site — `etat-course`

Septembre 2026, à sa demande : « il faut que je puisse répondre aussi via
le site si le client veut voir sa réponse sur le site ».

**Le défaut que ça répare.** « Mes réservations » n'affichait que ce qui
dort dans le téléphone du client, figé à l'instant de la réservation. Une
course confirmée à 4 h du matin y restait **EN ATTENTE** des jours plus
tard. Ce n'est pas une information manquante, c'est une information
**fausse** : le client rappelle pour demander si sa voiture est réservée,
alors qu'un chauffeur lui est attribué depuis la veille.

**Pourquoi une fonction et pas une simple lecture.** La règle de sécurité
interdit la lecture aux visiteurs anonymes, et **elle doit l'interdire** :
la clé du site est publique, donc une policy de lecture pour `anon`
exposerait les noms, téléphones et adresses de **tous** les clients. La
fonction est la seule porte : elle lit avec la clé de service, qui ne sort
jamais du serveur, et ne rend qu'une course à la fois.

**Ce qui fait office de clé : la référence ET le téléphone.** La référence
seule ne protégerait rien — elle est séquentielle (`ELA-26-09-0007`), il
suffirait de compter pour lire les courses des autres. Le numéro du client
ne sort jamais de son téléphone ; les deux ensemble, c'est ce que lui seul
possède.

**Ce qu'elle rend, et rien d'autre** : le statut, le prénom du chauffeur,
son téléphone, le véhicule, l'heure. Jamais les adresses, jamais le nom du
client, jamais la chambre, jamais le prix — exactement ce que porte déjà le
lien `?ok=`. Le client a tout le reste sur son propre bon.

**Rien à faire dans Supabase.** Pas de table, pas de colonne, pas de
policy : elle lit `courses` avec la clé de service, qui est déjà posée.
Elle se déploie toute seule à chaque poussée, comme les deux autres
(`.github/workflows/fonctions.yml`).

Deux garde-fous à ne pas retirer :

- **Une course inconnue et un téléphone qui ne correspond pas rendent la
  même réponse.** Les distinguer dirait à qui essaie des références au
  hasard lesquelles existent.
- **Un appel qui échoue ne fait jamais reculer un état.** Réseau coupé,
  fonction absente, serveur muet : le site garde ce qu'il a. Réécrire
  « en attente » sur un échec repasserait au neutre une course confirmée —
  exactement le défaut qu'on répare.
