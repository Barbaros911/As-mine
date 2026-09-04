# Passer elatransfer.com sur Cloudflare Pages

Décidé le 1ᵉʳ septembre 2026, après une panne de GitHub : les visiteurs
d'elatransfer.com voyaient la page d'erreur de GitHub — une licorne rose —
pendant que le site, lui, était intact.

**Le dépôt reste sur GitHub.** On ne change que le serveur qui sert les
pages. Le code, l'historique et les pull requests ne bougent pas.

---

## L'email doit continuer de fonctionner

`contact@elatransfer.com` reçoit du vrai courrier (confirmé par Barbaros le
1ᵉʳ septembre 2026). C'est cette contrainte qui décide de la méthode.

Il y a **deux façons** de brancher un domaine sur Cloudflare Pages. Elles
n'ont pas du tout le même risque.

### Voie A — par un simple enregistrement DNS *(recommandée)*

On garde le domaine et les serveurs de noms **exactement là où ils sont**.
On ajoute un seul enregistrement chez l'hébergeur DNS actuel :

```
Type : CNAME     Nom : www     Valeur : <projet>.pages.dev
```

**Les enregistrements MX ne sont jamais touchés.** L'email continue de
fonctionner sans qu'on s'en approche — c'est tout l'intérêt.

Reste la question du domaine **sans le `www`**, qui est celui qu'on a
partagé partout (`https://elatransfer.com`). Un domaine racine ne peut pas
porter un CNAME dans le DNS classique. Deux cas :

- **L'hébergeur DNS propose un enregistrement `ALIAS` ou `ANAME`** (Gandi,
  Namecheap, DNSimple, Infomaniak…) : on l'utilise pour la racine, et tout
  fonctionne à l'identique. C'est le cas idéal.
- **Il ne le propose pas** (OVH, la plupart des registrars anciens) : on
  laisse la racine rediriger vers `www` — la plupart des hébergeurs ont un
  bouton « redirection d'URL » pour ça. Les liens déjà envoyés continuent
  de marcher, ils atterrissent sur `www.elatransfer.com`.

  ⚠️ Si on prend cette option, il faudra changer l'adresse canonique et le
  `sitemap.xml` du site, qui déclarent aujourd'hui `https://elatransfer.com/`.
  Sinon Google reçoit deux signaux contradictoires.

### Voie B — en déplaçant les serveurs de noms chez Cloudflare

C'est ce que Cloudflare propose par défaut. Ça règle le problème de la
racine tout seul, mais **ça déplace TOUT le DNS du domaine, l'email
compris**.

Cloudflare recopie normalement les enregistrements existants. « Normalement »
n'est pas « toujours », et ce qui casse le plus souvent n'est pas le MX
lui-même mais ce qui l'accompagne : l'enregistrement `SPF`, la clé `DKIM`,
le `DMARC`, et les entrées `autodiscover` / `autoconfig` qui permettent au
téléphone de configurer la boîte. Il en manque un, et le courrier part en
indésirable — ou n'arrive plus, sans message d'erreur.

**Si on prend cette voie, l'ordre est impératif :**

1. Relever la zone DNS actuelle **en entier** (capture d'écran) avant tout.
2. Après l'import chez Cloudflare, comparer **ligne à ligne** : MX, TXT
   (SPF, DKIM, DMARC), et les CNAME de messagerie.
3. Basculer les serveurs de noms seulement après cette comparaison.
4. S'envoyer un email de test **depuis une adresse extérieure** dans l'heure
   qui suit, et vérifier qu'il arrive en boîte de réception et non en
   indésirable.

**Recommandation : la voie A.** Elle ne touche pas à l'email, donc elle ne
peut pas le casser. On ne prend la voie B que si l'hébergeur DNS ne sait pas
gérer le domaine racine et que la redirection vers `www` ne convient pas.

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

**Les trois adresses à éprouver en premier.** Elles couvrent les trois
mécanismes de service, et c'est ainsi qu'on voit une erreur de configuration
depuis l'extérieur — une seule d'entre elles suffit à la révéler :

| Adresse | Ce qu'elle éprouve | Attendu |
|---|---|---|
| `/` | la racine | le site de réservation |
| `/admin.html` | un fichier exact | demande le code |
| `/demos/` | **un dossier** | la galerie des trois sites vitrines |

Si `/demos/` affiche le site de réservation, c'est le réglage
`html_handling` de `wrangler.jsonc` qui est en cause — pas la galerie.
C'est arrivé le 4 septembre 2026.

Puis, sur cette même adresse temporaire :

- [ ] l'accueil s'affiche, le formulaire est là
- [ ] une adresse se cherche et se choisit (Argenteuil → Versailles)
- [ ] le prix s'affiche sur l'écran des véhicules
- [ ] Lille → Marseille est bien refusé (écriteau rouge)
- [ ] les six offres et leurs photos s'affichent
- [ ] `/admin.html` demande le code
- [ ] la galerie `/demos/` liste les trois sites vitrines

**Ne passer à l'étape 3 que si tout est coché.**

## Étape 3 — Brancher le domaine (voie A, sans toucher à l'email)

1. Dans le projet Pages → **Custom domains** → **Set up a custom domain** →
   saisir `www.elatransfer.com`.
2. Cloudflare affiche l'enregistrement à créer. **Aller le créer chez
   l'hébergeur DNS actuel**, sans rien changer d'autre :

   ```
   Type : CNAME     Nom : www     Valeur : <projet>.pages.dev
   ```

3. Pour le domaine sans `www`, selon ce que propose l'hébergeur :
   - **`ALIAS` / `ANAME` disponible** → le créer sur la racine, même valeur.
   - **Sinon** → activer la redirection d'URL de la racine vers
     `https://www.elatransfer.com`, et me le dire : il faudra alors changer
     l'adresse canonique et le `sitemap.xml` du site.
4. Le certificat HTTPS est émis automatiquement, en quelques minutes.

**À aucun moment on ne touche aux MX.** L'email ne peut pas casser.

## Étape 4 — Après la bascule

- [ ] `https://elatransfer.com` répond et affiche le site
- [ ] `https://www.elatransfer.com` aussi
- [ ] le cadenas HTTPS est là sur les deux
- [ ] refaire les vérifications de l'étape 2 sur le vrai domaine
- [ ] **s'envoyer un email à `contact@elatransfer.com` depuis une adresse
      extérieure** (Gmail, un téléphone) et vérifier qu'il arrive en boîte
      de réception, pas en indésirable

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
