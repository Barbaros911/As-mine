# Elatransfer — quand ça casse : quoi regarder, quoi faire

Écrit le 9 octobre 2026, à l'audit d'avant exploitation. Une page, en gestes,
depuis un iPhone. Elle décrit ce qui existe ; si un mécanisme change, elle
change dans la même PR (règle 6 de `TEAM_RULES.md`).

**Ce qui te prévient, et par où :**

| Signal | Il dit | Il arrive |
|---|---|---|
| Bandeau rouge en haut de l'admin (« Alertes en panne ») | une alerte ne part plus, ou **une demande de client n'a pas pu être enregistrée** | dès que l'admin est ouvert, relu toutes les 40 s |
| Issue GitHub « chien de garde » (assignée à toi) | la même chose, admin fermé | quand GitHub veut bien : 15 min en théorie, parfois des heures |
| Issue GitHub « le site en ligne répond-il » | une des dix pages du site ne répond plus, ou répond une autre page | toutes les 6 h, et après chaque publication |
| Telegram | une **demande** (jamais une panne) | à la seconde |

Les Issues ne sonnent sur l'iPhone que si l'app GitHub a ses notifications
activées et que tu suis le dépôt (*Watch → All activity*).

---

## 1. Une mauvaise version est en ligne (publiée à 14 h 00)

Le site est publié par Cloudflare Workers Builds à chaque fusion dans
`main` : **revenir en arrière, c'est fusionner le contraire.**

1. Dans **Safari** (pas l'app : elle n'a pas le bouton), ouvre la PR fautive
   sur github.com → bouton **Revert** → GitHub crée une PR inverse.
2. Attends le vert (le contrôle `admin` prend 16 min), puis **Merge**.
3. Cloudflare reconstruit `main` en quelques minutes. Vérifie
   `https://elatransfer.com/` en navigation privée : le HTML est servi
   « réseau d'abord », les téléphones ont la nouvelle page au prochain
   chargement.
4. **Les fonctions serveur suivent toutes seules** si la PR touchait
   `supabase/functions/` : le workflow « Déployer les fonctions » redéploie
   depuis `main` à chaque fusion. Sinon, rien à faire.
5. **Une migration, elle, ne se défait pas.** Il n'y a pas de « retour » :
   on écrit une migration inverse, on la relit, on la passe par le workflow
   « Appliquer une migration Supabase ». Et **avant toute migration** :
   Admin → Registre → **Sauvegarde JSON**, et (avec l'offre Pro) une
   sauvegarde Supabase du jour.
6. Un mauvais **tarif** saisi dans l'admin se corrige dans Réglages →
   Tarifs ; ce n'est pas une mise en ligne.

## 2. Une réservation échoue (14 h 05)

Ce que voit le client : l'écriteau rouge « votre demande n'a pas pu nous être
transmise » et le bouton WhatsApp en plein. Au comptoir : « appelez ». **Sa
demande n'est nulle part sur le serveur.**

Ce que tu vois, depuis l'audit : le bandeau rouge de l'admin « Une demande
de client n'a pas pu être enregistrée » (serveur en panne) ou « Des demandes
sont refusées par le plafond horaire » (quota), et l'Issue du chien de garde.

1. **Lis le journal** : Supabase → Table Editor → `journal_depots`, trié par
   `cree_le`. Chaque ligne : l'heure, le **code** (503 = serveur, 429 =
   plafond, 400/401/403 = demande refusée), le **motif**, la **référence**
   ELA-… — la même que sur le bon du client, dans WhatsApp et dans les logs.
2. **503** : Supabase → Edge Functions → `deposer-course` → Logs, à l'heure
   du refus. Si c'est la suite d'une mise en ligne : §1. Si Supabase est
   en panne : rien à réparer, attendre, voir §3.
3. **429** : un wifi d'hôtel qui envoie plus de 30 demandes dans l'heure,
   ou une rafale. Regarde la clé partenaire et les références ; si ce sont
   de vrais clients, le plafond se monte dans `deposer-course`.
4. **Le client, lui, a un chemin** : son bouton WhatsApp envoie le message
   que lit « Coller une demande » — la course se recrée **avec la même
   référence**, sans doublon. La réception appelle.

## 3. Supabase est en panne

Clients : rouge + WhatsApp. Réception : la liste ne charge pas, l'écran dit
d'appeler. Admin : bandeau « Serveur injoignable », la liste de l'appareil
reste lisible, tes gestes attendent dans la file (témoin « en cours
d'envoi ») et partent seuls au retour. Telegram se tait. Le chien de garde
ouvre une Issue « réponse illisible ».

Rien à réparer de ton côté : `status.supabase.com`, et le téléphone à portée
de main — les demandes arrivent par WhatsApp et par la réception, tu les
colles après.

## 4. Telegram ne sonne plus

Le bandeau dit « Telegram ne reçoit plus les alertes » (que des échecs depuis
une heure). Les notifications ELA et l'admin ouvert continuent de sonner.
Vérifie `TELEGRAM_TOKEN` et `TELEGRAM_CHAT` dans Supabase → Edge Functions →
Secrets (recherche « TELEGRAM »), puis une vraie demande de test.

## 5. Le site ne répond plus

Issue « le site en ligne répond-il » (nomme la page). Si c'est Cloudflare :
`cloudflarestatus.com`, rien à faire. Si c'est une page oubliée par la
recette de publication : §1 avec la PR qui l'a cassée. Pendant ce temps, le
numéro est sur le flyer et au comptoir.

## Chaque semaine, et avant chaque migration

Admin → Registre → **Sauvegarde JSON**. Le carnet des chauffeurs, leurs
paiements, les factures et le lien d'avis ne vivent **que** sur ton appareil ;
les courses sont sur le serveur, mais sans l'offre Pro le serveur n'a aucune
sauvegarde.
