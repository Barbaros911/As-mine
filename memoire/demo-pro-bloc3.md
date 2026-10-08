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
- **Forfaits d'exemple** (CDG 45/65, Orly 85/125, Le Bourget 55/75, Beauvais
  165/225, Disney 95/135, Paris 75/115), marqués « Tarifs d'exemple — les
  vôtres seront négociés ». Aucun n'égale un montant de la grille easyHotel :
  `verifier-demo.mjs` le contrôle en RELISANT cette grille dans `index.html`.
- **Thème bleu Elatransfer** : la façade peint `body.hotel` et
  `body.reception` en orange partenaire ; `demo.css` les repeint, et
  `hotel-engine-polish.js/.css` (propres à easyHotel, photo de leur CDN) ne
  sont pas chargés dans la démo.
- Fin de parcours : « Mettre ça en place pour mon établissement » →
  `/professionnels/#contact` (dans le suivi une fois « Effectuée », et en pied
  avec le QR code vers `https://elatransfer.com/professionnels/`).

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
