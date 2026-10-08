# Démo professionnels — bloc 5 : l'écran « Prospects » de l'admin

> Ouvert le 8 octobre 2026. Mission « Démo professionnels » validée par
> Barbaros. Le bloc 2 (table `prospects`, fonction `demande-demo`) est en
> production ; ce bloc montre les prospects à Barbaros dans l'admin retenu
> (`/ela-admin/`). Ce fichier dit ce qui est vrai et pourquoi.

## Ce qui existe

- **Une entrée « Prospects »** dans le menu de l'admin (après « Pilotage »),
  un écran `#ecran-prospects`, deux fichiers : `prospects.js` (lecture,
  écriture, dessin) et `prospects.css` (classes `prs-` : `pro-` est déjà pris
  par le bloc professionnels de l'accueil). Même modèle que le Pilotage.
- **Une carte par prospect**, du plus récent au plus ancien : établissement,
  type, nom · fonction, téléphone (`tel:` et WhatsApp vers SON numéro),
  e-mail (`mailto:`), date de la demande, e-mail confirmé, démo (première
  ouverture, nombre de visites, dernière visite), et la pastille interne
  « Adresse pro » / « Grand public » (`domaine_pro`). Deux demandes avec la
  même adresse se signalent (« Même adresse : 1 autre demande »).
- **Statut (5 valeurs) et note (≤ 2000)**, un bouton « Enregistrer » par
  carte. Filtres par statut avec leur nombre, « Nouveaux » en tête et en
  accent ; les nouveaux portent un filet bleu à gauche.
- `test-admin-prospects.mjs` (site construit, faux PostgREST), tourne dans
  `admin-regression.yml` (règle `test-admin-*`).

## Pourquoi c'est ainsi

- **Rien n'est lu au chargement de l'admin** : seulement à l'ouverture de
  l'écran et sur « Actualiser ». Aucune minuterie, rien sur l'appareil : les
  prospects ne vivent que sur le serveur.
- **On ne demande que les 17 colonnes accordées**, jamais `select=*` : la
  base refuserait (l'empreinte du jeton n'est lisible par personne), et
  l'écran le dirait comme un refus. Le test relit la liste DANS la
  migration au lieu de la recopier.
- **Seuls `statut` et `note` partent, et seulement ce qui a changé** — la
  base n'accepte rien d'autre. Une note vidée part en `null`, sans ses
  espaces. `Prefer: return=representation` : une réponse vide (aucune ligne
  modifiée) est une erreur dite, pas un succès muet.
- **Une erreur n'est jamais une liste vide.** « Aucune demande de démo »
  ne s'écrit que sur une réponse lue et vide. Session expirée, refus
  401/403, serveur 5xx, réseau, réponse illisible : chacun sa phrase, dans
  une région `role="alert"`. Une actualisation ratée garde la liste
  précédente et le dit.
- **L'agent ne voit rien** : entrée et écran masqués et clic bloqué
  (`agent-role-ui.mjs`). La base, elle, ne REFUSE pas l'agent : sa policy
  FILTRE, et il recevrait une liste vide — « aucun prospect » serait un
  mensonge. L'écran ne lit donc rien si `ELA_ROLE` vaut l'agent, et le dit.
- **Une carte enregistrée reste sous les yeux** sous son filtre jusqu'au
  prochain changement de filtre : passée « Contacté » sous « Nouveaux »,
  elle ne disparaît pas sous le doigt. Une saisie en cours survit à
  « Actualiser » et au changement de filtre (brouillons en mémoire).
- **Tout en `textContent`** : un établissement saisi avec des chevrons sur
  le formulaire public s'affiche en texte (éprouvé avec `<img onerror>` et
  `<script>`).
- **Pas de version sur `prospects`** : deux appareils qui modifient le même
  prospect, le dernier gagne. Barbaros est seul admin ; si ça change, une
  colonne de version comme sur `courses` serait le remède (changement
  serveur, à demander d'abord).
- **Au plus 500 prospects lus**, et l'écran le dit au-delà : une liste
  tronquée ne doit pas passer pour complète.

## Retiré des pages publiques

`construire-espaces-hotel.mjs` retire la section, les deux fichiers, et
s'ARRÊTE si une page publique porte `prospects.js`, `prospects.css`,
`ELA_PROSPECTS`, `id="ecran-prospects"`, `btnProspects` ou
`/rest/v1/prospects`. La suite revérifie toutes les pages HTML publiées.
Éprouvé : sans les deux défenses, elle tombe en nommant chaque page.

## Épreuves (8 octobre 2026)

Contre quatorze falsifications — `innerHTML`, corps entier envoyé, statut
toujours renvoyé, lecture au chargement, masquage de l'agent retiré
(CSS puis garde du script), erreur changée en liste vide, `select=*`, tri
retiré, filtres sans retour à la ligne, bouton à 30 px, brouillon perdu,
carte qui disparaît, retrait public supprimé — la suite tombe à chaque fois
en nommant le défaut.
