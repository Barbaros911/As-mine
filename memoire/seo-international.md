# SEO international — le lot 1 (14 octobre 2026)

> Archive de travail. Ce qui vaut aujourd'hui est dans `CLAUDE.md`, section
> « LA MARQUE ET GOOGLE ». Le diagnostic rendu avant le code est dans
> `SEO-INTERNATIONAL.md`, à la racine.

## La demande

Mission « Prompt 1 » : faire découvrir Elatransfer à des voyageurs étrangers
qui ne connaissent pas la marque (CDG, Orly, Paris, Disneyland, hôtels,
inter-aéroports). Diagnostic d'abord, puis cinq pages au plus, mesurées.

## Ce qui a été mesuré, pas supposé

- **Les pages françaises déclaraient une adresse qui redirige.** Le moteur
  d'hébergement de Cloudflare a été lancé ici (`wrangler dev`, installé dans
  le bac à sable, jamais dans le dépôt) avec le `wrangler.jsonc` du dépôt :
  `/transfert-cdg-paris.html` → **307** → `/transfert-cdg-paris`. Canonique,
  plan du site et liens de l'accueil visaient la redirection. Corrigé :
  adresse servie partout, fichiers inchangés.
- `/en/x` → 307 → `/en/x/` ; `/en/x/` → 200 : les pages anglaises sont des
  dossiers, servis sans redirection.
- `/n-importe-quoi/` → 200 (l'accueil) : `not_found_handling:
  single-page-application`. Soft 404 connu, laissé tel quel (réglage
  d'hébergement qu'on ne change pas sans symptôme).
- Le contrôle de production (`verifier-production.mjs`) a tourné, vert, contre
  le site construit servi par `wrangler dev`.

## Les choix, et ce qui a été écarté

- **`/en/` en sous-dossier**, pages statiques écrites en anglais dans le HTML.
  Écartés : sous-domaine, `?lang=` comme URL de langue, copie du moteur sous
  `/en/` (1 Mo par page, chemins relatifs, second moteur).
- **Le moteur reste unique** : trois paramètres d'entrée, liste fermée,
  effacés après lecture — `lang`, `vers`, `src`.
- **`vers=` ne choisit rien** : il écrit le texte de l'autre bout, et la liste
  s'ouvre après le choix du terminal (`suitePrefill`, `prise.rouvrir()` dans
  un `setTimeout` : le clic qui choisit le terminal referme les listes par
  l'écouteur du document, une réouverture immédiate serait annulée).
- **Les cinq pages** : `/en/` (accueil anglais), CDG, Orly, Disneyland (CDG et
  Orly), CDG ↔ Orly. Écartés du lot 1 : « CDG → hôtels de Paris »
  (cannibalise CDG → Paris), « Just landed » (promesse d'immédiateté que le
  parcours confirmation → paiement → départ ne tient pas toujours, surtout la
  nuit), Beauvais (phase 2).
- **Pas de photo** : aucune image propre de CDG, Orly ou Disneyland dans le
  dépôt, et pas de château Disney. Codes IATA et pictogrammes ; le titre est
  le plus grand élément (LCP texte).
- **Les blocs communs sont identiques exprès** (inclus, étapes, « Good to
  know », questions) : ce sont des faits contractuels. Les réponses sont
  celles de l'accueil anglais, mot pour mot ; `test-nouveau-bascule` compare
  désormais dans la langue de la page.
- **WhatsApp prérempli, un message par page.** Barbaros avait refusé (sept.
  2026) un message unique envoyé par tout le monde ; ici le message dit le
  trajet de la page, c'est-à-dire ce que le client veut. À lui confirmer.
- **Le pied de l'accueil garde sa ligne** sur ordinateur
  (`test-public-ordinateur`) : une rangée de cinq liens anglais la cassait. Un
  seul lien « English » vers `/en/`, qui relie les autres. La règle « chaque
  page du plan est liée depuis l'accueil » est devenue « depuis l'accueil, ou
  depuis `/en/` pour les pages anglaises ».

## La mesure

- **La page d'origine part avec la demande** (`provenance`) : registre,
  bon, alerte Telegram (« Vient de : Site anglais · CDG ↔ Orly »). Rien n'est
  écrit sur l'appareil (variable de page, pas `sessionStorage`) : une affiche
  d'hôtel garde la priorité.
- **L'entonnoir** : `rpc/ela_mesurer`, compteur par (jour, page, geste), sans
  IP ni identifiant ; 60 pages par jour au plus ; lecture admin seule
  (`ela_mesures_acquisition`), affichée dans le registre (« Pages du site —
  30 derniers jours »). Les robots ne sont pas comptés (agent utilisateur).
- **Piège rencontré** : les constantes de `lirePrefillAeroport` posées à côté
  de la fonction valaient `undefined` dans la page non construite, qui
  l'appelle plus haut dans le fichier. L'erreur arrêtait le reste du script :
  six suites sont tombées. Elles vivent maintenant dans la fonction.
- **Épreuves** : `test-seo-en` (312 contrôles) tombe sur six défauts
  réintroduits un à un (recette sans `cp -r en`, moteur sans `lang`, origine
  perdue, suite `vers=` retirée, canonique française en `.html`, robots
  comptés). `supabase/tests/mesure*.sql` tombe sur six migrations faussées.

## Ce qui reste à faire, et qui ne se code pas

1. Barbaros relit les captures et valide (textes anglais, WhatsApp prérempli,
   lien « English » dans le pied, politique de confidentialité).
2. Fusion, puis **appliquer les migrations** `20261014000000_mesure_acquisition.sql`
   et `20261014010000_prix_pages.sql` (prix des pages : `memoire/tarif-admin.md`).
3. Search Console : soumettre le plan du site, demander l'indexation de `/en/`.
4. Le monitoring (6 h) vérifie les dix nouvelles portes ; ChatGPT contrôle le
   site en ligne.

## Le moteur en anglais nomme les aéroports en anglais (16/10/2026)

Audit des quatre prompts, A-03 et A-04. `libelleTerminal()` (index.html) écrit
« Terminal 2E — Paris-Charles de Gaulle Airport » pour un client anglophone ;
le nom du terminal ne change pas, c'est lui seul que lit `terminalDuLibelle`
(« Single terminal » reconnu en plus de « Terminal unique »). `amenerListe()`
fait glisser la page à l'arrivée depuis une page d'aéroport pour que la liste
des terminaux tienne au-dessus de la barre du bas, sans monter le haut du
formulaire hors de l'écran. Pièges : un élément `position:fixed` n'a pas
d'`offsetParent` ; `scroll-behavior:smooth` interrompt un `scrollBy` lancé
pendant l'ouverture de la liste. `test-parcours-en` verrouille les deux.
