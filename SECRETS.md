# Gestion des secrets ELA Transfer

Toutes les valeurs sensibles doivent vivre dans le gestionnaire de secrets du serveur, jamais dans GitHub.

La liste canonique des variables attendues est dans `.env.example`. Ce fichier ne contient volontairement aucune valeur.

## Règles

- Ne jamais créer ou committer un fichier `.env` réel.
- Ne jamais placer une clé privée dans HTML, JavaScript public, documentation, test ou capture.
- Les fonctions serveur lisent les secrets depuis les variables d'environnement.
- Les identifiants explicitement publics nécessaires au navigateur restent distincts des secrets serveur.
- Une clé ayant déjà été publiée doit être révoquée/rotée chez son fournisseur avant réutilisation.
- Lors du transfert vers le serveur, reprendre uniquement les NOMS de `.env.example` et saisir les nouvelles valeurs directement dans le gestionnaire de secrets.

## Emplacement cible

Le fichier `.env.example` est l'inventaire unique. Les vraies valeurs ne doivent exister que dans Supabase Edge Functions Secrets, Cloudflare Secrets/Variables chiffrées, ou le gestionnaire de secrets du serveur de production.
