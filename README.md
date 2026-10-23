# ELA Transfer — plateforme de réservation

ELA Transfer est une plateforme de réservation et de gestion de courses avec chauffeur privé. Ce dépôt contient la façade publique, le moteur de réservation partagé, les accès easyHotel, l’espace exploitant/Admin, les fonctions serveur Supabase, les migrations, les tests et la recette de publication.

> La source de vérité technique est `main`. Les règles communes de travail sont dans `TEAM_RULES.md`, les décisions produit dans `PROJECT_STATE.md`, les zones critiques dans `AGENTS.md`, les règles produit en vigueur dans `CLAUDE.md` et leur historique détaillé dans `memoire/`.

## Architecture actuelle

- **Façade publique et réservation** : `index.html`.
- **Admin (espace exploitant)** : publié sous `/ela-admin/`, document construit à partir d'`index.html` par `construire.sh`. Connexion Supabase (e-mail + mot de passe + code à 6 chiffres une fois la double vérification activée, `SECURITE-ADMIN-MFA.md`) puis contrôle serveur des droits ; il n'y a plus de code d'accès. `admin.html`, `/exploitant/` et `?exploitant=1` y mènent. Voir `COMPTES.md`.
- **Admin v2** (`admin-v2.html`, `admin-v2-*.js`) : **plus publié depuis le 3 octobre 2026** — `/admin-v2.html` renvoie vers `/ela-admin/`. Le code reste dans le dépôt pour les fichiers qu'il partage.
- **Client easyHotel** : `sites/easyhotel-client/`.
- **Réception d'hôtel** : `/reception/<clé>/` (une page par hôtel, construite par `construire.sh`) ; `/easyhotel-reception/` reste servie pour les anciens favoris.
- **Supabase** : `supabase/` pour les migrations, fonctions serveur et règles de données.
- **PWA** : `manifest.webmanifest`, `sw.js` et les icônes.
- **Construction** : `construire.sh` est l’unique recette qui fabrique `site/`.

## Publication

`construire.sh` constitue la seule recette de build. GitHub Actions et Cloudflare utilisent le dossier généré `site/`; il ne faut pas créer une seconde recette de publication.

Le workflow GitHub Pages exécute notamment les contrôles documentaires et de façade avant de publier. Une fusion n’est donc pas considérée comme « terminée » tant que la publication post-fusion n’est pas verte et que la production n’a pas été vérifiée.

## Sources de vérité

| Sujet | Référence |
|---|---|
| Règles de collaboration et sécurité | `TEAM_RULES.md` |
| Décisions produit et blocages | `PROJECT_STATE.md` |
| Zones critiques / coordination agents | `AGENTS.md` |
| Règles produit en vigueur (leur historique : `memoire/`) | `CLAUDE.md` |
| Build publié | `construire.sh` |
| Façade/réservation principale | `index.html` |
| Admin publié | `/ela-admin/`, construit depuis `index.html` |
| Comptes, accès et secrets | `COMPTES.md` |
| Fonctions et données serveur | `supabase/` |

En cas de contradiction entre une ancienne note et le code actuel, vérifier `main` et les tests avant de décider. Une note historique ne doit jamais remplacer une mesure du dépôt courant.

## Tests

Ne pas maintenir ici une liste manuelle de toutes les suites : elle devient obsolète dès qu’un test est ajouté ou renommé.

Pour lancer les contrôles du dépôt, utiliser la recette maintenue :

```bash
sh .claude/outils/tests.sh
```

Les workflows de `.github/workflows/` exécutent aussi les contrôles spécialisés (Admin, sécurité, réservation, tarifs, notifications, etc.) selon les fichiers modifiés.

## Tarifs, réservation et paiement

Les tarifs sont une donnée métier sensible : ne jamais modifier un montant dans un seul écran ou un seul script. Les contrôles du dépôt vérifient notamment l’accord entre la grille client et la source tarifaire serveur.

Le client paie **le chauffeur**, avant le départ, par le lien de paiement que lui transmet Elatransfer avec la confirmation (décision du 10 octobre 2026, CGV art. 5). Aucun paiement en ligne n'est actif : le code d'empreinte Stripe de **test** reste dans `supabase/functions/`, sans aucune page qui l'appelle, et l'empreinte n'est plus le modèle prévu. **Stripe Live ne doit jamais être présenté comme actif.** Le détail, brique par brique, est dans `PROJECT_STATE.md`.

Les réservations et l’Admin utilisent désormais des composants serveur/Supabase : le projet ne doit plus être décrit comme une simple page statique sans serveur.

## Projets dans `sites/`

Les dossiers ELA/easyHotel servent d’entrées ou d’interfaces du produit. Les projets d’autres clients ne vivent plus dans ce dépôt (décision du 4 octobre 2026).

Le modèle `sites/_modele/` est interne et n’est pas publié.

## Règles avant modification

1. Partir du dernier `main`.
2. Vérifier les PR et Issues actives sur la zone concernée.
3. Ne pas recréer une deuxième implémentation d’une fonctionnalité existante.
4. Pour tout changement important, travailler sur une branche et une PR.
5. Ne jamais supprimer/désactiver un test uniquement pour obtenir du vert.
6. Ne jamais mettre de secret dans le dépôt.
7. Après fusion, vérifier le workflow de publication puis la production.

Pour les détails et les raisons historiques de ces règles, lire `TEAM_RULES.md`, `CLAUDE.md` et `memoire/`.
