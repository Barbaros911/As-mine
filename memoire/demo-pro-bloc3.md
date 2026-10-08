# La démo des professionnels — /demo/hotel/ (bloc 3)

> Mission « Démo professionnels », cadrée et validée par Barbaros le
> 8 octobre 2026. Trois sessions en parallèle : bloc 1 = /professionnels/,
> bloc 2 = la fonction `demande-demo` (serveur des prospects), bloc 3 = la
> démo. Ce fichier est la mémoire du bloc 3. CLAUDE.md n'en porte qu'UNE
> ligne (section « LA DÉMO PROFESSIONNELS (en cours) ») : test-doc exige que
> toute archive de memoire/ y soit nommée. Le bloc 6 y rangera la suite.

## Ce qui existe

- **Deux pages, pas une** : `/demo/hotel/` (ce que voit le client) et
  `/demo/hotel/reception/` (ce que voit la réception, « votre équipe » pour
  une agence ou une entreprise). Les deux onglets du haut sont des LIENS
  entre elles. Une seule page qui bascule ne tenait pas : le moteur range ses
  blocs différemment selon `recHotel` (comptoir ou client), une fois pour
  toutes à l'ouverture.
- **Fabriquées à la construction** par `.github/scripts/construire-demo.mjs`,
  à partir des pages DÉJÀ construites `site/application.html` et
  `site/easyhotel-reception/index.html` (elles ont déjà perdu l'admin, et leurs
  contrôles anti-fuite sont passés). `index.html` n'est jamais touché :
  l'hôtel fictif `demo-hotel` n'existe que dans la sortie démo.
- **Le simulateur** (`demo-simulateur.js`) remplace TOUTE la couche serveur du
  moteur (`nuage` : dépôt, état, liste de la réception) par du stockage local.
  Mêmes noms, mêmes formes de réponse que `courses-hotel` et `etat-course` :
  le moteur ne voit pas la différence. Progression accélérée Demande reçue
  (0 s) → Chauffeur recherché (6 s) → Chauffeur confirmé (14 s) → Effectuée
  (30 s), et « Étape suivante » avance tout de suite. Trois courses fictives
  préremplies (noms « (exemple) », numéros en 06 39 98, plage réservée à la
  fiction). Chauffeur : « Karim — chauffeur fictif ».
- **Le stockage est préfixé** (`ela_demo__…`, via `ELA_DEMO_STOCKAGE` qui
  remplace chaque `localStorage` du moteur à la construction). La démo est
  servie sur le même domaine que le site : sans préfixe, ses courses fictives
  apparaissaient dans « Mes réservations » d'un vrai client du même téléphone.
  Une nouvelle session sur le navigateur repart d'une démo neuve.
- **Accès fermé par défaut** : page masquée (`html.demo-attente`) tant que
  `demande-demo` n'a pas répondu à `{action:"ouvrir", session}`. Pas de
  `ela_demo_session` ou 401 → `/professionnels/#demo` (session oubliée) ;
  serveur muet, 5xx, 403 « origine », 413 « taille » ou réponse illisible →
  « Démonstration momentanément indisponible » + contact, jamais la démo.
  Aucune clé Supabase n'est envoyée. `expire` (ISO 8601) n'est pas lu : c'est
  le serveur qui juge la session à chaque ouverture.
- **Le nom** vient de la réponse d'« ouvrir », posé en `textContent`, coupé à
  60 caractères ; vide → « Hôtel Démo · Roissy » (tous types, tranché).
  Rond aux initiales à la place d'un logo, zone « Votre photo ici ».
- **Aucun prix proposé** (voir plus bas) ; `verifier-demo.mjs` refuse en plus
  tout montant de la grille easyHotel, RELUE dans `index.html`.
- **Thème bleu Elatransfer** : la façade peint `body.hotel` et
  `body.reception` en orange partenaire ; `demo.css` les repeint, et
  `hotel-engine-polish.js/.css` (propres à easyHotel, photo de leur CDN) ne
  sont pas chargés dans la démo.
- Fin de parcours : « Mettre ça en place pour mon établissement » →
  `/professionnels/#contact` (dans le suivi une fois « Effectuée », et en pied
  avec le QR code vers `https://elatransfer.com/professionnels/`).

## La page d'arrivée — « Où souhaitez-vous aller ? » (8/10/2026)

Barbaros : « le résultat final sera comme pour easyHotel ? ». La démo ouvrait
directement le formulaire ; la vraie page d'un partenaire ouvre d'abord ses
destinations en cartes. Désormais la vue client fait pareil :
- `ELA_DEMO_PAGE.dessinerCartes()` construit les cartes depuis `HOTELS` — la
  même liste que le menu du formulaire —, destinations ajoutées comprises :
  jamais recopiées, elles ne peuvent pas contredire le menu.
- Tant que rien n'est choisi (`body.demo-choix`), seuls l'en-tête de l'hôtel
  et les cartes sont à l'écran. Une carte pose la destination par le menu
  (`change`, le chemin du moteur) et ouvre le formulaire ; « ← Toutes les
  destinations » revient. « Autre destination » = menu à valeur vide.
- Codes d'aéroport (CDG, ORY, LBG, BVA), un repère dessiné ailleurs : jamais
  un texte saisi en `innerHTML`.
- Pas sur la vue réception : le comptoir réserve sur une seule page.
- Sous le titre, une consigne pleine : « Touchez une destination pour faire
  une réservation d'essai, comme vos clients. » Barbaros a demandé « quand
  est-ce qu'il va voir la seconde page ? » : rien ne disait de toucher une carte.

## Aucun prix proposé — l'hôtel fixe les siens (8/10/2026)

Barbaros : « ne mets pas les prix suggérés, il faut laisser l'hôtel choisir et
expliquer que ces prix reflètent le flyer mis en place avec le QR code qui va
rediriger sur cette page ». Les forfaits d'exemple sont retirés
(`forfait:null` partout dans `HOTELS_DEMO`).
- Cartes : « à fixer » tant que l'hôtel n'a rien saisi ; au-dessus, la phrase
  « Ces prix sont ceux de votre flyer : vos clients scannent son QR code et
  arrivent sur cette page. » La pastille dit « Vos prix : ceux de votre flyer ».
- « Vos prix par destination » dans « Personnaliser ma page » : deux cases
  vides par destination (ajoutées comprises), 1 à 2 000 €, case vide = calcul
  au kilomètre. Redessiné seulement si la LISTE change (sinon la case en cours
  de saisie perd le curseur). Stocké dans `perso.prix[cle]`.
- Les destinations ajoutées ont une clé STABLE (`perso-<id>`) : avec l'index,
  en retirer une décalait les prix des suivantes.
- Les courses d'exemple de la réception n'ont un prix que si l'hôtel l'a fixé.
- **Défaut trouvé par la suite** : un seul prix sur deux faisait planter
  l'écriteau du forfait (`euros(undefined)`). La sortie démo écrit « au
  kilomètre » à la place.

## « Personnaliser ma page » (8/10/2026, à la demande de Barbaros)

« Couleur, nom, photo, et même on peut ajouter des éléments qu'ils voudront
peut-être. » Un panneau repliable sous les onglets, sur les deux vues :
- **Nom** (60 car.) : en-tête, initiales, départ du formulaire, bon, et la
  réception. Les initiales sautent les articles (« Le Relais de Roissy » → RR).
- **Couleur** : six pastilles + sélecteur libre. Elle n'est PAS prise telle
  quelle : le bouton est assombri jusqu'à 4,6:1 avec le blanc, l'en-tête est
  la même teinte très éclaircie sous une encre à 7,5:1. Un jaune pâle reste
  lisible (contrôlé). Le cadre de la démo garde le bleu Elatransfer.
- **Photo** : lue et RÉDUITE dans le navigateur (1000 px, JPEG), jamais
  envoyée. Trop lourde pour le stockage : affichée, puis perdue au changement
  de page, et on le dit. Le bouton du navigateur (« Choose File », dans SA
  langue) est caché derrière le nôtre.
- **Message d'accueil** (160 car.) sous le nom, en textContent.
- **Destinations ajoutées** (4 au plus) : lieu retrouvé par la recherche du
  site (`ELA_ROUTE.lieu`), prix berline/van de 1 à 2 000 €, rayon 1,5 km.
  Elles entrent dans le menu par `ELA_DEMO_PAGE.appliquer`, posée DANS la
  portée du moteur par construire-demo.mjs.
- Tout vit dans `ela_demo__ela_demo_perso` ; « Revenir à la page d'origine »
  efface tout. Rien de cela ne crée de requête vers le serveur (contrôlé).

## La photo du prospect, et la réception en anglais (8/10/2026)

À sa demande : « la personne doit mettre sa photo, la réception doit pouvoir
passer en anglais aussi ».
- **Aucune photo d'illustration n'est posée** : c'est la sienne, ou rien.
  Le cadre « Votre photo ici » ouvre le choix du fichier (rôle bouton,
  clavier compris) ; le champ du panneau reste. Elle ne quitte toujours pas
  son navigateur.
- **La réception de la démo se traduit à l'affichage**, dans
  `demo-simulateur.js` (`traduireReception`) : le moteur écrit le comptoir
  en français, et la traduction de la vraie réception vit dans la finition
  easyHotel, que la démo ne charge pas (elle nomme easyHotel). Chaque texte
  garde son français d'origine, et on n'écrit que si le texte change —
  sinon l'observateur boucle, comme le moteur easyHotel figé en septembre.
- **La vraie réception easyHotel n'a pas été touchée.**
- Le bon affiché a déjà son FR/EN ; seuls les noms d'exemple y sont repris.
- Éprouvé : sans la traduction, six contrôles tombent ; sans le cadre
  cliquable, un.

## L'isolation — trois défenses, éprouvées séparément le 8/10/2026

1. **CSP** dans la page (`<meta>`) et la même dans `_headers` pour `/demo/*`
   (plus `X-Robots-Tag`). `connect-src` : le site, BAN, Photon, ORS, OSRM, et
   l'URL EXACTE de `demande-demo`. Cassée (`connect-src *`) : 8 contrôles
   tombent.
2. **`verifier-demo.mjs`**, en DERNIER dans `construire.sh` (après le retrait
   des commentaires, sinon les notes du moteur le font tomber) : la
   construction échoue si un fichier de `site/demo/` OU un script local chargé
   par ses pages contient `/rest/v1`, `deposer-course`, `courses-hotel`,
   `etat-course`, `nouvelle-demande`, `prevenir-client`, `wa.me`,
   `api.telegram.org`, la clé publique Supabase (relue dans `index.html`),
   « easyhotel », la clé d'un partenaire réel ou un de ses forfaits. La suite
   l'éprouve mot par mot sur une copie du site. Elle a aussi attrapé, seule,
   la redirection de tête remise exprès (elle cite l'adresse de la réception
   easyHotel).
3. **La page elle-même** (`test-demo-hotel.mjs`) : aucune requête vers
   Supabase hors `demande-demo`, ET aucune tentative bloquée par la CSP
   pendant le parcours — sans ce second contrôle, une fuite du simulateur
   cachée par la défense 1 passait au vert. Éprouvé avec un `fetch` vers
   `deposer-course` glissé dans le simulateur (CSP intacte) : il tombe. Et
   avec une redirection `?exploitant=1` sans mot interdit : 6 contrôles
   tombent. Les appels faits à la main depuis la console (`fetch`, XHR,
   `sendBeacon`, `ELA_NUAGE.deposer/etat/coursesHotel`) sont éprouvés aussi.

## Pièges rencontrés

- **Sans la finition easyHotel, le nom et le téléphone se saisissent au
  récapitulatif**, comme sur le moteur d'origine — pas sur la première page.
- La redirection de tête de `application.html` (`?exploitant=`,
  `?reception=`) est retirée : sans ça, `?exploitant=1` sortait de la démo.
- Le service worker n'est pas enregistré depuis la démo (`/demo/` n'est pas
  dans `NOS_DOSSIERS` : le SW du site la laisse passer), et l'abonnement aux
  notifications est éteint (`CLE_VAPID` vide).
- « Fermer la session » est masqué dans la réception de démo : il ouvrait un
  écran de code sans objet ici.
- Le contrôle « une seule balise robots » comptait aussi le `meta[name="robots"]`
  écrit dans le script du moteur : il ne compte plus que les balises.

## Reste ouvert

- **L'écran réception reste en français** même quand le prospect passe en
  anglais : le comptoir est français par décision de Barbaros (« c'est des
  Français »), et le moteur n'a pas de textes anglais pour cet écran. Le
  cadre de la démo (bandeau, onglets, suivi, fin) et la page client, eux,
  sont traduits. À trancher s'il veut démarcher des hôtels anglophones.
- **Une navigation** (pas un `fetch`) vers une adresse Supabase n'est pas
  couverte par la CSP — aucune règle ne le permet. Sans clé, une telle
  requête GET ne peut ni lire ni écrire ; et la démo ne contient ni l'adresse
  ni la clé (défense 2).

- **La photo** : Unsplash, Pexels et Pixabay sont bloqués par le réseau de la
  machine de travail (403 du proxy, 8/10/2026). La zone est un fond neutre
  pointillé « Votre photo ici ». À demander à Barbaros : une photo d'hôtel
  libre de droits (≥ 1000 px, source à noter ici), qu'on posera dans
  `photos/` et dans `HOTELS_DEMO.photo`.
- Dépend du bloc 2 : `demande-demo` doit être déployée `--no-verify-jwt` et
  répondre au contrat (`ok:true, etablissement, type, expire`). Tant qu'elle
  ne l'est pas, la démo affiche « momentanément indisponible » : c'est voulu.
- Dépend du bloc 1 : `/professionnels/#demo` et `#contact`.
