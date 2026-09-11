# Ce que tu possèdes — la feuille à imprimer

**CE DOCUMENT NE CONTIENT AUCUN MOT DE PASSE, ET C'EST VOULU.** Ce dépôt
est **public** : tout ce qui est écrit ici est lisible par n'importe qui
sur GitHub. Un secret publié y est aspiré et archivé en quelques minutes,
même si on l'efface juste après.

**La marche à suivre : imprimer cette feuille, écrire les valeurs à la
main, la ranger.** Le papier chez toi vaut mieux qu'un fichier en ligne.

---

## 1. Les comptes

| Service | À quoi il sert | Adresse | Identifiant | Mot de passe |
|---|---|---|---|---|
| **GitHub** | héberge le code et publie le site | github.com | `Barbaros911` | ✍️ |
| **Supabase** | le serveur : les courses, les alertes | supabase.com/dashboard | projet **Elatransfer** | ✍️ |
| **Telegram** | reçoit les alertes de nouvelle demande | app Telegram | bot `ela_transfer_bot` | ✍️ |
| **OpenRouteService** | calcule les itinéraires | openrouteservice.org | ✍️ | ✍️ |
| **Google Business** | la fiche de l'entreprise | business.google.com | ✍️ | ✍️ |

*Le projet Supabase porte l'identifiant `yyhzutnuhuytokarynaw`. Il n'est pas
secret — il est déjà dans la page du site.*

---

## 2. Les codes du site

| Quoi | Où on le tape | Où on le change | Valeur |
|---|---|---|---|
| **Code exploitant** | `elatransfer.com/admin.html` | dans `index.html`, en empreinte | `12345678` |
| **Code réception easyHotel** | `?reception=easyhotel-aeroville` | secret Supabase `HOTEL_EASYHOTEL_AEROVILLE_CODE` | ✍️ |

**Le code exploitant est le seul écrit dans le site**, sous forme
d'empreinte. Ce n'est pas un coffre : quelqu'un qui lit le code source peut
l'attaquer tranquillement chez lui, autant d'essais qu'il veut. Le code de
la réception, lui, vit sur le serveur — un essai à la fois, avec une
attente à chaque échec.

---

## 3. Les secrets Supabase

Tous au même endroit :
`supabase.com/dashboard/project/yyhzutnuhuytokarynaw/settings/functions`

| Nom (à écrire EXACTEMENT) | À quoi il sert | Valeur |
|---|---|---|
| `TELEGRAM_TOKEN` | le droit d'écrire de ton bot | ✍️ |
| `TELEGRAM_CHAT` | où le bot doit écrire | `8720148120` |
| `HOTEL_EASYHOTEL_AEROVILLE_CODE` | le code de la réception | ✍️ |
| `VAPID_PRIVEE` | signe les notifications aux clients | ✍️ |

**Un nom mal écrit n'est pas une erreur visible** : la fonction croit
simplement que le canal n'est pas configuré, et tu n'as jamais d'alerte
sans savoir pourquoi. C'est la panne numéro un.

---

## 4. Les clés qui sont PUBLIQUES, et c'est normal

Celles-là partent forcément dans la page : c'est le navigateur du client
qui s'en sert. Les cacher est impossible.

| Clé | Où | Ce qui protège vraiment |
|---|---|---|
| Clé publiable Supabase | `index.html` | la Row Level Security : dépôt autorisé, **lecture jamais** |
| `CLE_ORS` | `index.html` | rien — à **régénérer** sur openrouteservice.org si le quota se vide sans raison |
| Clé publique VAPID | `index.html` | sa moitié privée, qui est dans les secrets |

**Ne JAMAIS coller la clé `service_role` de Supabase dans la page** : elle
contourne toutes les règles de sécurité.

---

## 5. Ce qui n'existe pas encore

| Quoi | Pourquoi ça bloque |
|---|---|
| **SIRET** | sans lui : pas de facture valable, pas de fiche Google vérifiée, mentions légales incomplètes. À créer sur `formalites.entreprises.gouv.fr` |
| Clé Mapbox | optionnelle — le site tourne sur ORS. Voir `MAPBOX.md` |
| Compte Cloudflare | voir `CLOUDFLARE.md`. **Ne pas déplacer les serveurs de noms**, ton email en dépend |

---

## Si tu changes un mot de passe

- **GitHub** → rien à faire dans le site.
- **Supabase (connexion)** → c'est aussi le compte de l'espace exploitant :
  tu devras te reconnecter depuis « Se connecter au serveur ».
- **Jeton Telegram** → le remplacer dans `TELEGRAM_TOKEN`, rien d'autre.
- **Code réception** → le remplacer dans le secret, puis prévenir l'hôtel.
  Les tablettes déjà ouvertes redemanderont le code.
