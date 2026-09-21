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


## Règle impérative — validation avant base de données

Aucune donnée provenant d'un formulaire, d'une API, d'un webhook, d'un panneau admin ou d'une saisie utilisateur ne doit être envoyée à la base avant validation et normalisation côté serveur.

Pour chaque champ :
1. vérifier le type attendu ;
2. supprimer les espaces inutiles et normaliser le format ;
3. appliquer une longueur minimale/maximale ;
4. valider le format métier (email, téléphone, date, heure, coordonnées, montant, identifiant, etc.) ;
5. refuser les valeurs inattendues plutôt que les corriger silencieusement ;
6. utiliser une liste blanche pour les statuts, rôles, catégories et autres valeurs énumérées ;
7. ne jamais faire confiance aux validations JavaScript du navigateur ;
8. ne jamais construire une requête SQL par concaténation de texte ;
9. vérifier authentification et autorisation avant toute écriture protégée ;
10. journaliser l'erreur sans enregistrer de secret ni de donnée sensible inutile.

Principe : **entrée brute → validation → normalisation → autorisation → écriture en base**.

Toute nouvelle fonction qui écrit dans Supabase doit respecter cette séquence avant l'appel d'insertion ou de mise à jour.
