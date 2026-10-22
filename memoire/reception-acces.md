# La page de la réception — deux adresses, et un code qui n'est pas dans la page (archive)

> **Archive, figée le 20 octobre 2026.** Ce qui reste vrai est dans `CLAUDE.md`,
> section « LA PAGE DE LA RÉCEPTION — DEUX ADRESSES, UN CODE SERVEUR, AUCUNE
> SUPPRESSION ». Rien n'a été réécrit ci-dessous. Depuis le 20/10/2026 la
> réception ne supprime pas non plus : seul Barbaros supprime une course.

## LA PAGE DE LA RÉCEPTION — DEUX ADRESSES, ET UN CODE QUI N'EST PAS DANS LA PAGE

Septembre 2026, en trois demandes : « on peut pas mettre un système dans
lequel ils peuvent placer les réservations, voir les historiques ? », puis
« je veux qu'il y ait un lien de connexion **vraiment destiné à la
réception** de l'hôtel uniquement », puis « fais-leur une vraie page,
prends exemple de ce qui se fait de mieux ». Marche à suivre complète dans
`RECEPTION-HOTEL.md`.

**LE PROBLÈME QU'ELLE RÉSOUT, ET IL VENAIT DE SA PROPRE QUESTION** :
« personne ne verra les infos des autres ? » La liste des courses vivait
dans le navigateur de l'appareil. Deux conséquences opposées et toutes deux
mauvaises : sur la tablette **partagée** d'un comptoir, chaque client voyait
les réservations des précédents ; sur n'importe quel autre appareil, la
réception ne voyait plus rien. La liste vient maintenant du **serveur**,
filtrée sur l'hôtel.

- **`?h=` est le flyer, `?reception=` est le comptoir.** La première est
  scannée par les CLIENTS et ne donne accès à rien d'autre qu'à la
  réservation. Un test éprouve les deux chemins.
- **LE BOUTON D'ACCÈS EST PROTÉGÉ DEUX FOIS** — l'attribut `hidden` et une
  règle CSS — et **le test regarde chaque protection séparément**. Éprouvé
  en cassant l'une puis l'autre : avec un seul contrôle sur ce qui se voit,
  la suite restait au vert sur la première brèche et n'aurait alerté qu'une
  fois la seconde ouverte aussi. Une défense en profondeur demande autant de
  contrôles que de défenses.
- **LE CODE EST VÉRIFIÉ PAR LE SERVEUR, jamais par la page.** C'est la
  différence assumée avec `CODE_EXPLOITANT`, qui vit dans le site en
  empreinte et s'attaque donc hors ligne, autant d'essais qu'on veut. Ici il
  vit dans les secrets Supabase (`HOTEL_<CLE>_CODE`), la comparaison est à
  temps constant, et un échec attend 700 ms. **Ce n'est pas un coffre** : ce
  qui protège vraiment, c'est que l'adresse ne sorte pas de l'hôtel et que
  le code soit long. Un contrôle cherche qu'aucun code ne traîne dans la
  page.
- **UN HÔTEL INCONNU ET UN CODE FAUX RENDENT LA MÊME RÉPONSE.** Les
  distinguer dirait à qui essaie des noms lesquels sont partenaires.
- **RIEN NE S'ANNULE DEPUIS UNE TABLETTE D'HÔTEL.** Le bouton transmet et
  pose `annulationDemandee` ; il ne touche **jamais** au statut. Une course
  annulée à 5 h du matin libère un chauffeur déjà engagé, et Barbaros seul
  peut le rappeler. Éprouvé en faisant envoyer un statut : le contrôle
  tombe.
- **LE FILTRE PORTE SUR `provenanceCle`, PAS SUR LE LIBELLÉ.** Un libellé
  est du texte destiné à un écran : le jour où « easyHotel Aéroville »
  devient « easyHotel Paris CDG », tout l'historique deviendrait invisible à
  son propre hôtel, sans que rien ne le signale. La clé est posée sur chaque
  hôtel au chargement (`HOTELS[k].cle = k`) plutôt que recopiée dans l'objet.
- **CE QUE LA RÉCEPTION VOIT** : ses courses, l'état à jour, la chambre, le
  nom **et le numéro** du client, le trajet, le véhicule, le prix et le mode
  de règlement — plus le chauffeur dès que la course est confirmée. Le
  téléphone du client avait d'abord été écarté au nom de la minimisation ;
  **Barbaros a tranché l'inverse et il a raison** : un client parti prendre
  son petit-déjeuner n'est joignable que là quand la voiture arrive. La
  minimisation interdit ce qui n'est pas nécessaire, pas ce qui sert.
- **LES ONGLETS « Réservations » et « Trajets » PARTENT SUR CETTE ADRESSE.**
  Ils lisent le stockage de l'appareil : sur une tablette de comptoir ils
  auraient affiché les clients précédents. Sur le téléphone d'un client, par
  l'adresse du flyer, ils restent. **Le raisonnement qui les avait fait
  garder valait pour le téléphone du client, pas pour le comptoir** — c'est
  la même note, corrigée par la distinction des deux adresses.
- **L'HÔTEL N'EST PAS RÉPÉTÉ SUR CHAQUE LIGNE.** Mesuré : son adresse
  complète mangeait la largeur et c'est la **destination** qui se faisait
  tronquer, la seule moitié que la réception ne connaît pas déjà. Le SENS
  reste écrit — sans lui, un comptoir envoie une voiture dans le mauvais
  sens.
- **PIÈGE DE TEST : Playwright consulte la DERNIÈRE route posée en premier.**
  La route générique hors ligne, posée après la route du faux serveur,
  avalait les appels — et la suite mesurait une panne réseau en croyant
  mesurer un refus de code.

---

## Archivé de CLAUDE.md le 22/10/2026

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

### LA PAGE DE LA RÉCEPTION — DEUX ADRESSES, UN CODE SERVEUR, AUCUNE SUPPRESSION

`?h=` est le flyer (les clients), `?reception=` le comptoir. Le code vit dans
les secrets Supabase (`HOTEL_<CLE>_CODE`), jamais dans la page ; `courses-hotel`
est la seule porte, elle ne fait que LIRE (liste blanche, filtre sur
`provenanceCle`, jamais le libellé) et refuse toute autre action. **La
réception n'annule rien (30/09) et ne supprime rien (20/10)** : elle appelle.
Marche à suivre : `RECEPTION-HOTEL.md`. Histoire et pièges :
`memoire/reception-acces.md`.
