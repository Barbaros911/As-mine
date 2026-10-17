# Ce que tu possèdes — la feuille à imprimer

**CE DOCUMENT NE CONTIENT AUCUN MOT DE PASSE, ET C'EST VOULU.** Ce dépôt
est **public** : tout ce qui est écrit ici est lisible par n'importe qui
sur GitHub. Un secret publié y est aspiré et archivé en quelques minutes,
même si on l'efface juste après.

**La marche à suivre : imprimer cette feuille, écrire les valeurs à la
main, la ranger.** Le papier chez toi vaut mieux qu'un fichier en ligne.

*Relue contre le code le 17 octobre 2026. Elle annonçait encore un « code
exploitant » tapé sur `admin.html` : ce code n'existe plus en ligne depuis le
23 septembre 2026.*

---

## 1. Les comptes

| Service | À quoi il sert | Adresse | Identifiant | Mot de passe |
|---|---|---|---|---|
| **GitHub** | héberge le code et publie le site | github.com | `Barbaros911` | ✍️ |
| **Supabase** | le serveur : les courses, les alertes | supabase.com/dashboard | projet **Elatransfer** | ✍️ |
| **Cloudflare** | sert le site et porte le DNS du domaine | dash.cloudflare.com | ✍️ | ✍️ |
| **IONOS** | le courrier `contact@elatransfer.com` | ionos.fr | ✍️ | ✍️ |
| **Telegram** | reçoit les alertes de nouvelle demande | app Telegram | bot `ela_transfer_bot` | ✍️ |
| **OpenRouteService** | calcule les itinéraires | openrouteservice.org | ✍️ | ✍️ |
| **Google Business** | la fiche de l'entreprise | business.google.com | ✍️ | ✍️ |
| **Google Search Console** | le référencement | search.google.com/search-console | ✍️ | ✍️ |

*Le projet Supabase porte l'identifiant `yyhzutnuhuytokarynaw`. Il n'est pas
secret — il est déjà dans la page du site.*

**Le domaine est déjà chez Cloudflare** (serveurs de noms Cloudflare, mesuré
le 5 octobre 2026). Le courrier, lui, reste chez IONOS : **ne jamais toucher
les lignes MX et SPF d'IONOS** dans le DNS, ni la ligne
`google-site-verification`.

---

## 2. Entrer dans l'admin et dans la réception

| Quoi | Adresse | Ce qu'on tape | Où ça se change |
|---|---|---|---|
| **Admin (espace exploitant)** | `elatransfer.com/ela-admin/` | l'e-mail et le mot de passe **du compte exploitant** | dans l'admin : Réglages → « Changer mon mot de passe » |
| **Réception easyHotel** | `elatransfer.com/reception/easyhotel-aeroville/` | le code de la réception | secret Supabase `HOTEL_EASYHOTEL_AEROVILLE_CODE` |

**IL N'Y A PLUS DE « CODE EXPLOITANT ».** Depuis le 23 septembre 2026, la
construction du site (`harden-exploitant-auth.mjs`) remplace l'ancien verrou
par une vraie connexion. Vérifié le 17 octobre 2026 : aucun fichier publié
ne contient l'ancienne empreinte, et la CI le revérifie à chaque PR
(`security-regression.yml`, « Vérifier le verrou exploitant publié »).
*(L'empreinte traîne encore dans le fichier source `index.html`, où elle ne
sert plus à rien : à retirer dans une PR à part.)*

Comment l'admin décide qui entre :
1. **Le compte** : un utilisateur du projet Supabase (Authentication →
   Users), e-mail et mot de passe. **Ce n'est pas ton compte supabase.com** :
   le tableau de bord Supabase a son propre mot de passe, et changer l'un ne
   change pas l'autre.
2. **Le droit** : après la connexion, le serveur vérifie que ce compte est
   inscrit, actif, dans la table `operateurs` (`est_exploitant()`). Un compte
   absent de cette table est refusé, même avec le bon mot de passe.
3. **Le rôle** : `admin` voit tout — prix, réglages, factures, commissions,
   Pilotage, Trafic (`est_admin()`). `agent_reservation` ne fait que traiter
   les courses. C'est le serveur qui l'impose, pas l'écran.
4. **La session** reste sur l'appareil et se renouvelle toute seule. Changer
   le mot de passe dans l'admin déconnecte les autres appareils.

**Ne jamais supprimer puis recréer le compte exploitant** : la table
`operateurs` le désigne par son identifiant, effacé avec le compte. Un compte
recréé n'entre plus dans l'admin. Voir `SUPABASE.md`, étape 3.

**Les autres adresses mènent toutes à `/ela-admin/`** : `admin.html` (vieux
liens), `?exploitant=1`, et `/exploitant/` — la page à ouvrir pour **poser
l'icône de l'admin sur l'écran d'accueil** du téléphone.

**La réception** répond aussi à `/easyhotel-reception/` (vieux favoris) et à
`?reception=easyhotel-aeroville`. Le code est vérifié par le serveur
(`courses-hotel`), jamais par la page : 60 essais par heure et par adresse
au plus, une attente après chaque échec. La tablette reste connectée 30 jours.
**Changer le code coupe aussitôt toutes les tablettes connectées.**

---

## 3. Les secrets Supabase

Tous au même endroit :
`supabase.com/dashboard/project/yyhzutnuhuytokarynaw/settings/functions`

**Un nom mal écrit n'est pas une erreur visible** : la fonction croit
simplement que le canal n'est pas configuré, et tu n'as jamais d'alerte
sans savoir pourquoi. C'est la panne numéro un.

**Ceux qui font tourner le site aujourd'hui**

| Nom (à écrire EXACTEMENT) | À quoi il sert | Valeur |
|---|---|---|
| `TELEGRAM_TOKEN` | le droit d'écrire de ton bot | ✍️ |
| `TELEGRAM_CHAT` | où le bot doit écrire | `8720148120` |
| `VAPID_PUBLIQUE` | la clé publique des notifications, donnée au navigateur | ✍️ |
| `VAPID_PRIVEE` | signe les notifications | ✍️ |
| `VAPID_SUJET` | le contact déclaré aux services de notification | `mailto:contact@elatransfer.com` |
| `HOTEL_EASYHOTEL_AEROVILLE_CODE` | le code de la réception (un secret `HOTEL_<CLÉ>_CODE` par hôtel) | ✍️ |

**Facultatifs** — sans eux, le site marche :

| Nom | À quoi il sert |
|---|---|
| `RESEND_CLE`, `EMAIL_EXPEDITEUR`, `EMAIL_DESTINATAIRE` | l'alerte par e-mail, second canal à côté de Telegram |
| `ADRESSE_ADMIN` | l'adresse des liens d'alerte ; sans lui, `https://elatransfer.com/ela-admin/` |
| `DEMO_SESSION_SECRET` | les sessions de la démo pro ; sans lui, dérivé de la clé de service |
| `TURNSTILE_SECRET` | l'anti-robot de la démo, éteint aujourd'hui |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | le code Stripe de **test**, qu'aucune page publique n'utilise (voir § 5) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont posés
par Supabase lui-même : rien à faire.

**Le secret GitHub** : `SUPABASE_ACCESS_TOKEN`, rangé dans l'environnement
GitHub **« production »** seulement. Il déploie les fonctions et passe les
migrations, depuis `main` uniquement. **Il expire le 1er octobre 2027** : le
refaire avant.

---

## 4. Les clés qui sont PUBLIQUES, et c'est normal

Celles-là partent forcément dans la page : c'est le navigateur du client
qui s'en sert. Les cacher est impossible.

| Clé | Où | Ce qui protège vraiment |
|---|---|---|
| Clé publiable Supabase | `index.html` | les règles du serveur : un visiteur ne **lit** rien, et ne **dépose** une demande que par la fonction `deposer-course` (contrôles, quota, prix recroisé). Le dépôt direct dans la table est fermé (droit retiré le 29/09, dernière règle supprimée le 3/10/2026). |
| `CLE_ORS` | `index.html` | rien — à **régénérer** sur openrouteservice.org si le quota se vide sans raison |
| Clé publique VAPID | donnée par la fonction `cle-notifications`, depuis le secret `VAPID_PUBLIQUE` | sa moitié privée, dans les secrets. *(`CLE_VAPID` écrite dans la page ne sert plus à s'abonner.)* |

**Ne JAMAIS coller la clé `service_role` de Supabase dans la page** : elle
contourne toutes les règles de sécurité.

---

## 5. Ce qui n'existe pas encore

| Quoi | Pourquoi ça bloque |
|---|---|
| **SIRET** | sans lui : pas de facture valable, pas de fiche Google vérifiée, mentions légales incomplètes. À créer sur `formalites.entreprises.gouv.fr` |
| **Paiement en ligne (Stripe)** | **éteint, et ce n'est pas le modèle retenu.** Le client paie le chauffeur par le lien de paiement du chauffeur (10/10/2026). Du code Stripe de test existe côté serveur ; aucune page publique ne l'appelle, et Stripe Live n'est pas activé. Détail : `PROJECT_STATE.md`. |
| Clé Mapbox | optionnelle — le site tourne sur ORS. Voir `MAPBOX.md` |

---

## Si tu changes un mot de passe

- **GitHub** → rien à faire dans le site.
- **Ton compte supabase.com** (le tableau de bord) → rien à faire dans le
  site : ce n'est pas le compte de l'admin.
- **Le mot de passe de l'admin** → dans l'admin : Réglages → « Changer mon
  mot de passe ». Les autres appareils sont déconnectés. Jamais en supprimant
  le compte.
- **Jeton Telegram** → le remplacer dans `TELEGRAM_TOKEN`. Le bouton
  « ✅ Vu » sous les alertes dépend d'un secret tiré de ce jeton : il faut
  ensuite reposer le webhook du bot (`INSTALLER_TELEGRAM`, fonction
  `nouvelle-demande`).
- **Code réception** → le remplacer dans le secret, puis prévenir l'hôtel.
  Toutes les tablettes redemandent le code.
- **Jeton GitHub `SUPABASE_ACCESS_TOKEN`** → en refaire un chez Supabase, le
  poser dans l'environnement « production », révoquer l'ancien. Supabase ne
  remontre jamais une valeur : on ne la relit pas, on la refait.
