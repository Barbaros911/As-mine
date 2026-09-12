# Elatransfer — 4 interfaces

Objectif : conserver une seule logique métier dans `index.html` tout en donnant quatre portes d'entrée claires.

1. Client public : `/` — réservation grand public.
2. Landing hôtel : `/?h=easyhotel-aeroville` — page client dédiée au partenaire avec ses tarifs de départ.
3. Réception : `/?reception=easyhotel-aeroville` — espace comptoir protégé, non indexé, avec création et suivi des demandes de l'hôtel.
4. Admin / exploitant : `/exploitant/` — tableau de bord interne Elatransfer.

Principes : mobile d'abord, aucune duplication de la logique de réservation, réception et admin non indexés, séparation visuelle nette entre client/hôtel/interne, actions principales accessibles au pouce, français/anglais côté client, priorité à la vitesse et à la lisibilité.

## Niveau cible

### Client
- Comprendre en moins de 3 secondes : chauffeur privé, Paris/Île-de-France, prix annoncé avant réservation.
- Formulaire au-dessus de la ligne de flottaison sur mobile.
- Départ, arrivée, date/heure, passagers, véhicule, prix et confirmation sans ambiguïté.
- WhatsApp et téléphone accessibles sans polluer le parcours.

### Landing hôtel
- Nom du partenaire et départ prérempli.
- Tarifs négociés visibles immédiatement.
- CTA unique : réserver.
- Aucun accès aux données de la réception.

### Réception
- Créer une demande en moins d'une minute.
- Voir les demandes de l'hôtel et leur statut.
- Numéro de chambre et nom client traités comme données privées.
- Pas d'indexation, pas de lien depuis le site public.

### Admin
- Priorité aux courses nécessitant une action.
- Statuts lisibles : attente, prise en charge, confirmée, terminée/annulée.
- Création manuelle de course et affectation chauffeur.
- Vue mobile exploitable comme une application.

## Architecture

Les quatre interfaces restent des modes du même `index.html`. Cela évite quatre versions du moteur de réservation qui divergeraient. Cloudflare servira ensuite à renforcer les en-têtes de sécurité, les routes et les fonctions serveur sans changer cette séparation fonctionnelle.
