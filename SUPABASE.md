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
```

## 3. Créer le compte de Barbaros

**Authentication** → **Users** → **Add user** → *Create new user*.
Mettre une vraie adresse e-mail et **un vrai mot de passe** — celui-ci ouvre
les données réelles des clients, ce n'est pas le code `Ela1234` de
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

Sur le site, en mode exploitant : **Registre** → bloc **Serveur** → l'e-mail
et le mot de passe de l'étape 3. La connexion tient d'un jour à l'autre.

---

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

Le dépôt d'une course peut déclencher une notification. Deux voies :

- **Telegram** — gratuit, instantané, une dizaine de minutes à mettre en
  place (Database Webhooks de Supabase → l'API du bot). Le plus simple et
  le plus fiable.
- **WhatsApp Business Cloud API** (Meta) — la seule voie officielle pour
  WhatsApp. Elle demande une vérification d'entreprise **et un numéro
  dédié, qui ne peut plus servir dans l'application WhatsApp normale**.
  C'est le point à peser avant de s'y engager.

À décider avec Barbaros ; rien n'est fait de ce côté pour l'instant.
