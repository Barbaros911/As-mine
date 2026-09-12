# Audit utilisateur — 4 rôles ELA Transfer

Audit de la branche `refonte-4-interfaces` avant fusion.

## 1. Client public

Entrée : `/`

Objectif utilisateur : comprendre le service immédiatement, lancer une réservation sans chercher le bon bouton, connaître le principe de prix et de paiement.

Contrôles :
- identité ELA visible dès le premier écran ;
- métier et zone lisibles sans jargon ;
- CTA de réservation visible ;
- pas d'accès réception/admin depuis le public ;
- formulaire utilisable sur téléphone sans zoom horizontal ;
- départ, arrivée, date, heure et passagers restent compréhensibles ;
- informations « prix annoncé » et paiement au chauffeur ne sont pas contradictoires ;
- aucune statistique, disponibilité ou promesse inventée.

## 2. Client easyHotel Aeroville

Entrée fonctionnelle : `/application.html?h=easyhotel-aeroville`
Entrée propre prévue : `/hotel/easyhotel-aeroville/`

Objectif utilisateur : comprendre qu'il bénéficie d'une page partenaire dédiée et obtenir son tarif rapidement.

Contrôles :
- nom affiché : **easyHotel Aeroville** ;
- départ hôtel clairement identifié ;
- tarifs partenaires visibles avant les coordonnées personnelles ;
- aucune liste des réservations de l'hôtel n'est accessible au client ;
- orange easyHotel limité au contexte partenaire ;
- paiement au chauffeur clairement affiché ;
- aucune promesse « réservation immédiatement confirmée » tant qu'un chauffeur n'est pas attribué ;
- version mobile : destinations et prix lisibles sans tableau horizontal.

## 3. Réception easyHotel Aeroville

Entrée fonctionnelle : `/application.html?reception=easyhotel-aeroville`
Entrée propre prévue : `/reception/easyhotel-aeroville/`

Objectif utilisateur : envoyer une demande en moins d'une minute et suivre uniquement les courses de l'hôtel.

Contrôles :
- accès distinct du QR client ;
- code réception contrôlé côté serveur ;
- page `noindex` ;
- départ hôtel prérempli ;
- destination, date, heure, véhicule, client/chambre, téléphone et paiement accessibles rapidement ;
- prix final reste lisible avec une adresse longue ;
- état attente / confirmée / annulée distingué par texte, pas uniquement couleur ;
- aucune annulation automatique depuis le comptoir ;
- téléphone client et chauffeur cliquables lorsque disponibles ;
- mobile : une seule colonne, gros CTA, aucune zone minuscule.

## 4. Admin / exploitant

Entrée : `/exploitant/` ou `/application.html?exploitant=1`

Objectif utilisateur : voir en premier ce qui réclame une action et gérer les courses sans données décoratives.

Contrôles :
- aucune fausse réservation, faux chauffeur ou faux chiffre d'affaires ;
- priorité aux demandes en attente et chauffeurs à attribuer ;
- statuts lisibles et cohérents ;
- création manuelle de course disponible ;
- navigation bureau sous forme de véritable sidebar ;
- mobile : navigation horizontale compacte et KPIs en 2 colonnes ;
- état serveur/hors-ligne explicite ;
- les informations opérationnelles réelles restent issues du moteur existant.

## Sécurité et séparation des rôles

- `?h=` = client hôtel ; ne doit jamais afficher le comptoir réception.
- `?reception=` = réception ; la liste des clients reste protégée et non indexée.
- `?exploitant=1` = exploitant ; le mode ne doit pas contaminer le site public sur le même appareil.
- les pages internes restent exclues de l'indexation.

## Finition visuelle appliquée

`application-role-theme.css` est chargé uniquement sur l'application fonctionnelle construite. Il améliore les quatre modes sans recopier la logique métier :
- ELA bleu marine/cyan côté public et admin ;
- easyHotel orange uniquement dans les vues partenaires ;
- desktop réellement large pour réception et exploitant ;
- mobile pensé en pile, sans écraser une interface desktop dans 390 px ;
- boutons tactiles, cartes et prix renforcés ;
- aucune modification des calculs, statuts ou appels serveur.

## Validation finale requise avant fusion

Effectuer un parcours navigateur complet sur le build de la branche, en desktop et mobile, avec les quatre entrées ci-dessus. La fusion reste bloquée tant que ces parcours et les tests existants ne sont pas verts.
