# Passer elatransfer.com sur Cloudflare Pages

Décidé le 1ᵉʳ septembre 2026, après une panne de GitHub : les visiteurs
d'elatransfer.com voyaient la page d'erreur de GitHub — une licorne rose —
pendant que le site, lui, était intact.

**Le dépôt reste sur GitHub.** On ne change que le serveur qui sert les
pages. Le code, l'historique et les pull requests ne bougent pas.

---

## ⚠️ À lire avant de commencer : ton email

`contact@elatransfer.com` figure dans tes mentions légales, dans les CGV et
sur l'écran « Infos ». Si cette adresse existe vraiment et reçoit du
courrier, **elle dépend des enregistrements MX de ton domaine**.

Passer le domaine chez Cloudflare implique de changer les serveurs de noms
chez ton registrar. Cloudflare recopie normalement les enregistrements
existants, **mais il faut le vérifier avant de basculer** : un MX oublié, et
tu ne reçois plus un seul email, sans message d'erreur.

**Donc, dans l'ordre :**

1. Note d'abord tes enregistrements actuels (chez ton registrar, zone DNS) —
   fais une capture d'écran de la liste complète.
2. Après l'import chez Cloudflare, compare ligne à ligne. Les MX surtout.
3. Ne bascule les serveurs de noms qu'une fois la comparaison faite.

Si `contact@elatransfer.com` n'est qu'une adresse de façade qui ne reçoit
rien, ce point ne te concerne pas — mais alors il faudra la retirer des
documents légaux, parce qu'une adresse de contact qui ne répond pas est un
manquement à la LCEN.

---

## Étape 1 — Créer le compte et connecter le dépôt

1. Créer un compte sur `dash.cloudflare.com` (gratuit).
2. **Workers & Pages** → **Create** → onglet **Pages** → **Connect to Git**.
3. Autoriser Cloudflare à lire `Barbaros911/As-mine`, puis le sélectionner.
4. Réglages de construction :

   | Champ | Valeur |
   |---|---|
   | Production branch | `main` |
   | Build command | `sh construire.sh` |
   | Build output directory | `site` |
   | Root directory | *(vide)* |

5. **Save and Deploy.**

C'est exactement la même commande que celle qu'exécute GitHub Actions —
`construire.sh` est la seule recette, partagée par les deux.

## Étape 2 — Vérifier AVANT de toucher au domaine

Cloudflare donne une adresse temporaire du type
`as-mine.pages.dev`. **Le vrai domaine n'a pas encore bougé : le site
public continue de tourner normalement pendant tout ce temps.**

Sur cette adresse temporaire, vérifier :

- [ ] l'accueil s'affiche, le formulaire est là
- [ ] une adresse se cherche et se choisit (Argenteuil → Versailles)
- [ ] le prix s'affiche sur l'écran des véhicules
- [ ] Lille → Marseille est bien refusé (écriteau rouge)
- [ ] les six offres et leurs photos s'affichent
- [ ] `/admin.html` demande le code
- [ ] la galerie `/demos/` liste les trois sites vitrines

**Ne passer à l'étape 3 que si tout est coché.**

## Étape 3 — Basculer le domaine

1. Dans le projet Pages → **Custom domains** → **Set up a custom domain** →
   `elatransfer.com` (puis recommencer pour `www.elatransfer.com`).
2. Cloudflare indique quoi faire :
   - si le domaine est déjà chez Cloudflare, il crée l'enregistrement seul ;
   - sinon il demande de passer les serveurs de noms chez lui — **c'est ici
     que la vérification des MX de l'étape 0 compte.**
3. Le certificat HTTPS est émis automatiquement, en quelques minutes.

## Étape 4 — Après la bascule

- [ ] `https://elatransfer.com` répond et affiche le site
- [ ] le cadenas HTTPS est là
- [ ] un email envoyé à `contact@elatransfer.com` arrive bien
- [ ] refaire les vérifications de l'étape 2 sur le vrai domaine

Puis, seulement après quelques jours sans incident : désactiver GitHub
Pages dans **Settings → Pages** du dépôt. Le garder actif quelques jours ne
coûte rien et laisse une porte de sortie.

---

## Ce que ça apporte, et ce que ça n'apporte pas

**Ça apporte :**

- Une disponibilité bien meilleure. Servir des sites est le métier de
  Cloudflare ; chez GitHub, c'est une fonction annexe d'un hébergeur de code.
- **Les en-têtes de sécurité**, impossibles sur GitHub Pages. Le fichier
  `_headers` est déjà écrit et prêt : protection contre l'affichage du site
  dans un cadre invisible, contre la devinette de type de fichier, contrôle
  de ce qui fuit vers les sites extérieurs.
- Un cache correct : les photos gardées un an par le navigateur, mais le
  HTML toujours revérifié — donc une publication reste visible tout de suite.

**Ça n'apporte pas l'immunité.** Cloudflare tombe aussi, c'est arrivé.
C'est nettement plus rare et plus court, mais aucun hébergeur ne garantit
100 %. Ce changement réduit le risque, il ne le supprime pas.

---

## Si quelque chose tourne mal

Rien n'est irréversible. Tant que GitHub Pages reste actif, il suffit de
remettre les serveurs de noms ou l'enregistrement DNS comme avant, et le
site repart sur GitHub. C'est pour ça qu'on ne le désactive qu'après
plusieurs jours.
