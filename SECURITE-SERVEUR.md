# Sécurité serveur ELA Transfer

## Principe

Le navigateur n'est jamais une barrière de sécurité. Cacher un bouton, une section HTML ou vérifier un code en JavaScript ne donne aucun droit serveur.

## Règles obligatoires

- Les données `courses` et `abonnements` restent protégées par RLS.
- L'espace exploitant doit utiliser une session Supabase Auth valide pour toute lecture ou modification de données privées.
- Aucun secret, mot de passe, service-role key ou code d'accès réel ne doit être publié dans HTML/JS/documentation publique.
- Le suivi client public ne retourne que `statut` et le prénom/nom du chauffeur pour une paire référence + jeton valide.
- Le rôle anonyme ne doit jamais pouvoir lister les courses.
- Les opérations administratives ne doivent jamais être autorisées uniquement par un paramètre d'URL ou par `localStorage`.
- Toute nouvelle table contenant des données privées doit activer RLS avant exposition API.

## Déploiement

Les changements de sécurité sont développés sur une branche séparée et testés avant fusion dans `main`, afin de ne pas modifier le site client en production pendant le travail.
