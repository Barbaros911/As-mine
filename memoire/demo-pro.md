# La démo des professionnels — /professionnels/, la démo, les prospects

> Mission « Démo professionnels », cadrée et validée par Barbaros le
> 8 octobre 2026, livrée en six blocs le même jour : 1 la page
> `/professionnels/` (#337), 2 le serveur des prospects (#335), 3 la démo
> `/demo/hotel/` (#338), 4 le formulaire branché (#339), 5 l'écran
> « Prospects » de l'admin (#336), 6 la recette et cette mémoire. Ce fichier
> réunit les cinq archives de blocs ; CLAUDE.md n'en garde que l'essentiel.

## Le parcours

`/professionnels/` → « Voir la démo hôtel » → formulaire (`#demo`) →
`demande-demo` (« demander ») → session → `/demo/hotel/` s'ouvre tout de
suite, au nom de l'établissement saisi → vue client puis vue réception →
« Mettre ça en place pour mon établissement » → `/professionnels/#contact`.
Barbaros voit la demande dans l'admin, écran « Prospects », et reçoit une
alerte Telegram.

## Décisions de Barbaros (ne pas les rediscuter)

- **Coût zéro pour l'établissement, sans engagement.** « Mise en place
  gratuite » est vrai : à retirer le jour où un hôtel paie.
- **« Déjà en service dans un hôtel de la zone de Roissy-CDG »** — au
  singulier. Jamais « nos partenaires » au pluriel tant qu'il n'y en a qu'un,
  jamais le nom d'easyHotel sur la page pro. **À retirer si le partenariat
  cesse.**
- **Option B : pas de Turnstile en V1.** La protection repose sur le champ
  piège, les quotas et un délai minimum de remplissage.
- **Quotas** : 5 demandes par heure par adresse IP, 3 par 24 h par adresse
  e-mail.
- **L'accès dure 7 jours sur l'appareil**, et c'est écrit partout (« il faut
  préciser à celui qui teste que ce n'est pas indéfini ») : avant l'envoi, au
  succès, au retour, dans le message de limite, dans le bandeau de la démo.
- **Aucun prix proposé dans la démo** : « laisser l'hôtel choisir ». Les
  cartes disent « à fixer » ; les prix saisis sont ceux de SON flyer.
- **Pas de photo dans la démo** : Unsplash, Pexels et Pixabay étaient
  bloqués depuis la machine de travail ; la zone dit « Votre photo ici ». Le
  jour où Barbaros en fournit une libre de droits (≥ 1000 px, source notée
  ici), elle va dans `photos/` et dans `HOTELS_DEMO.photo`. Une photo
  choisie par le prospect est réduite dans son navigateur et **n'est jamais
  envoyée**. C'est la sienne, ou rien (8/10/2026, à sa demande : « la
  personne doit mettre sa photo ») : le cadre « Votre photo ici » ouvre le
  choix du fichier (rôle bouton, clavier compris), le champ du panneau reste.
  Depuis le 25/10/2026, ce cadre est en tête du formulaire, après le choix
  d'une destination : la page du QR n'a pas de photo (voir plus bas).
- **Initiales au lieu d'un logo** (« Le Relais de Roissy » → RR, les articles
  sautés).
- **La réception de la démo passe en anglais aussi** (8/10/2026, à sa
  demande : « la réception doit pouvoir passer en anglais aussi » — il avait
  d'abord dit « c'est des Français »). Voir « La démo » plus bas.

## La page `/professionnels/`

- Page autonome (styles et textes dedans), **indexable**, canonique
  `https://elatransfer.com/professionnels/`, au plan du site. Bleu nuit,
  cyan, blanc, logo négatif du site. Aucune autre image jusqu'au 21/10/2026 ;
  depuis, deux captures de la démo (« À quoi ça ressemble », plus bas). Français écrit dans
  la page (c'est lui que lit Google), anglais au bouton EN, mémorisé sous
  `ela_langue` ; `?lang=en` force l'anglais.
- Le bloc pro de l'accueil (`#modele`) mène à `/professionnels/#demo`.
- `construire.sh` copie le dossier et réserve les noms `professionnels` et
  `demo` (un site vitrine ainsi nommé les écraserait). `sw.js` n'y touche
  pas : un sous-dossier hors de `NOS_DOSSIERS` est laissé au réseau.
- **La question du vol en retard reprend mot pour mot celle de l'accueil**
  (60 minutes sans frais, CGV art. 7) : `test-nouveau-bascule` l'exige des
  pages du plan. Les autres réponses (coût, engagement, données) sont
  gardées par `test-pro-page`.
- « Qui voit nos données » ne dit que ce que la politique de confidentialité
  et l'espace réception font déjà. Liens légaux par `/?doc=mentions|privacy`.
- Aucun chiffre hors du numéro, du récit « 7 h / 5 h » et des 60 minutes ;
  jamais « prix ferme ».
- **Aucune CSP sur cette page.** Le jour où elle en aura une, `connect-src`
  nomme l'URL EXACTE de `demande-demo` et rien d'autre de Supabase.

## Le formulaire

- Type (Hôtel coché par défaut — ce n'est pas un consentement, et c'est la
  « démo hôtel »), établissement, nom complet, fonction (facultative),
  e-mail professionnel, téléphone (`telephone.js`, la règle du serveur).
  Erreurs sous le champ, FR/EN, téléphone/WhatsApp/e-mail juste en dessous.
- **Succès** : `ela_demo_session` (la chaîne rendue, lue telle quelle par la
  démo) et `ela_demo_expire` (l'ISO rendu), « Votre démonstration est
  ouverte — accès valable 7 jours sur cet appareil. », puis la démo 1,6 s
  plus tard. On garde l'échéance à côté de la session plutôt que de décoder
  le contenu signé : la page n'a pas à connaître la signature.
- **Visiteur revenu avant l'échéance** : les boutons (page et accueil) mènent
  directement à la démo, et `#demo` affiche « accès valable jusqu'au JJ/MM »
  avec « Ouvrir ma démonstration » et « Faire une demande pour un autre
  établissement ». **Pas de redirection automatique en arrivant sur `#demo`** :
  le bouton « retour » depuis la démo ferait une boucle.
- **Un humain rapide n'est jamais pris pour un robot.** Le serveur traite une
  `duree` sous 2 500 ms comme le champ piège ; la page attend elle-même ce qui
  manque avant d'envoyer (`DUREE_MIN_MS` = 2 600). Sans cette attente, un
  directeur qui remplit tout d'un appui recevait une session factice et la
  démo le renvoyait au formulaire, sans explication.
- **Le champ piège s'appelle `ctrl_x9`, pas « site »** : un navigateur
  remplit « site », « url », « website » tout seul. Hors écran,
  `tabindex=-1`, `aria-hidden`, `autocomplete=off` ; la clé JSON `site` part
  TOUJOURS vide.
- **Jamais un faux succès** : la démo ne s'ouvre que sur une session rendue
  (200, une session, une date lisible) ET gardée sur l'appareil. 429 dit les
  deux limites et rappelle les 7 jours ; 503, 403, 413, réseau coupé, réponse
  illisible : indisponibilité, numéro et e-mail. Minuteur à 12 s.
- **Lien de confirmation** `/professionnels/?confirmer=<jeton>` : « Adresse
  e-mail confirmée » (200) ou « Ce lien a expiré ou a déjà servi » (410), et
  le paramètre est effacé. **Une panne n'est ni un succès ni un lien mort** :
  une troisième phrase la dit et le paramètre RESTE, pour qu'un rechargement
  réessaie.
- Politique de confidentialité (FR/EN, au 8 octobre 2026) : article 11
  « Demandes de démonstration des professionnels » (finalité, intérêt
  légitime, données, destinataires, 3 ans après le dernier contact,
  opposition et accès à contact@elatransfer.com) ; la réclamation devient
  l'article 12.

## Le serveur — table `prospects`, fonction `demande-demo`

- **Table** (`20261008000000_prospects.sql`). Rien pour anon. L'admin
  (`est_admin()`, pas l'agent) LIT, et ne MODIFIE que `statut` et `note`
  (droits par colonne). Aucune suppression depuis le site. L'empreinte du
  jeton et son expiration ne sont lisibles par aucun compte connecté.
  **Aucune colonne d'adresse IP** — une épreuve le vérifie.
- **`domaine_pro` est une colonne GÉNÉRÉE** (`prospect_domaine_pro()`) : la
  liste des messageries grand public vit dans la base, une fois. Jamais
  renvoyée au navigateur ; l'alerte Telegram dit « professionnelle » ou
  « grand public ».
- **Trois portes `security definer`, exécutables par service_role seul** :
  `ela_prospect_creer`, `ela_prospect_ouvrir`, `ela_prospect_confirmer`.
- **`demande-demo`** (`--no-verify-jwt`). `expire` est une date ISO 8601 en
  UTC. 413 `{erreur:"taille"}` au-delà de 4 Ko, 403 `{erreur:"origine"}` sans
  l'origine elatransfer.com.
- **Ordre de « demander »** : champ piège et délai → champs (400) → quota IP
  (429) → Turnstile s'il est configuré (403) → base, dont quota e-mail (429)
  → alerte et e-mail → session. Le quota passe AVANT Turnstile : un robot qui
  insiste ne nous fait pas appeler Cloudflare. Une panne de Cloudflare rend
  503, jamais « robot ».
- **Turnstile est facultatif** : sans `TURNSTILE_SECRET`, la vérification est
  sautée. **Pour la réactiver** : poser `TURNSTILE_SECRET` dans les secrets
  Supabase ET la clé publique dans `CLE_TURNSTILE` de
  `professionnels/index.html` — il restera à charger le script du widget et
  envoyer son jeton en `turnstile`, la seule partie à écrire.
- **Le piège ou un délai invalide** (absent, en texte, négatif, infini, sous
  2 500 ms) rend un 200 qui a l'air normal, avec une session factice qui
  n'ouvre rien. Rien écrit, envoyé ni compté.
- **Le quota par e-mail est compté DANS LA TABLE** (24 dernières heures, sous
  un verrou par adresse), pas par `consommer_quota_reservation`, qui s'efface
  au bout de 70 minutes : « 3 par jour » y serait devenu « 3 par heure et
  quart ». Les quotas par IP passent bien par lui. Aussi : 30 sessions
  FAUSSES/heure/IP sur « ouvrir » (une session juste ne consomme rien),
  20 confirmations/heure/IP.
- **Le jeton de confirmation** : 32 octets tirés au sort, seule l'empreinte
  SHA-256 en base, effacée par l'instruction qui pose la date (usage unique),
  48 h.
- **Une « visite » compte une fois par demi-heure.**
- **Chaque demande crée une ligne**, même avec une adresse connue : réécrire
  l'existante permettrait à quiconque connaît l'adresse d'un prospect de
  changer son téléphone.
- **Conservation : 3 ans après le dernier contact** (`dernier_contact_le`).
  Pas de purge automatique ; la requête est en tête de la migration.
- **`deposer-course` refuse (403)** toute course dont la provenance ou la clé
  partenaire commence par « demo » (accents et casse ignorés), AVANT le quota
  et toute lecture en base.
- **`_shared/session-signee.ts`** : la signature HMAC sortie de
  `hotel-session.ts`, format INCHANGÉ — une épreuve fabrique une session de
  réception selon l'ancien code et exige qu'elle passe encore, sinon chaque
  tablette de comptoir aurait été déconnectée.
- **En production** : migration `20261008000000_prospects.sql` appliquée par
  le workflow des migrations, `demande-demo` déployée seule à la fusion
  (`fonctions.yml`, `--no-verify-jwt`).
- **Secrets : RIEN à poser** (8/10/2026, « le minimum de manip »).
  `DEMO_SESSION_SECRET`, s'il est posé, l'emporte ; absent, la fonction le
  dérive de la clé service_role (SHA-256 de « elatransfer:demo-session:v1: »
  + la clé), que la plateforme fournit d'office. `TURNSTILE_SECRET`,
  `RESEND_CLE` / `EMAIL_EXPEDITEUR` facultatifs — sans e-mail, la démo
  s'ouvre quand même.

## La démo `/demo/hotel/`

- **Deux pages** : `/demo/hotel/` (client) et `/demo/hotel/reception/`
  (réception, « votre équipe » pour une agence ou une entreprise), reliées
  par les deux onglets du haut. Le moteur range ses blocs selon `recHotel`
  une fois pour toutes : une page qui bascule ne tenait pas.
- **Fabriquées à la construction** par `construire-demo.mjs`, à partir des
  pages DÉJÀ construites `site/application.html` et
  `site/easyhotel-reception/index.html` (elles ont déjà perdu l'admin) — et,
  depuis le 25/10/2026, de la page du QR `site/easyhotel-client/index.html`
  pour l'arrivée du client.
  `index.html` n'est jamais touché : l'hôtel fictif `demo-hotel` n'existe
  que dans la sortie démo.
- **Le simulateur** (`demo-simulateur.js`) remplace TOUTE la couche serveur
  du moteur (`nuage`) par du stockage local, mêmes noms et mêmes réponses que
  `courses-hotel` et `etat-course`. Demande reçue (0 s) → Chauffeur recherché
  (6 s) → Chauffeur confirmé (14 s) → Effectuée (30 s) ; « Étape suivante »
  avance tout de suite. Trois courses d'exemple (noms « (exemple) », numéros
  en 06 39 98, plage réservée à la fiction), « Karim — chauffeur fictif ».
  Elles partent de l'hôtel du prospect, sous le nom qu'il voit en tête de
  page, pas du nom de repli écrit à la semence.
- **La réception se traduit à l'affichage** (`traduireReception` dans
  `demo-simulateur.js`) : le moteur écrit le comptoir en français. Depuis le
  11/10/2026 la finition commune en traduit l'essentiel ; ce traducteur-ci
  garde ce qui est propre à la démo (exemples, chauffeur fictif, lignes de
  détail) — `memoire/finition-commune.md`. Chaque texte garde son français
  d'origine, et on n'écrit que si le texte change — sinon l'observateur
  boucle, comme le moteur easyHotel figé en septembre. La vraie réception
  n'a pas été touchée ; le bon affiché avait déjà son FR/EN.
- **Le stockage est préfixé** (`ela_demo__…`) : la démo est sur le même
  domaine, et sans préfixe ses courses fictives apparaissaient dans « Mes
  réservations » d'un vrai client du même téléphone.
- **Accès fermé par défaut** (`html.demo-attente`, page masquée) tant que
  `demande-demo` n'a pas répondu à « ouvrir ». Sans session ou 401 →
  `/professionnels/#demo` ; serveur muet, 5xx, 403, 413 ou réponse
  illisible → « Démonstration momentanément indisponible » + contact,
  jamais la démo. Aucune clé Supabase envoyée.
- **Le nom vient de la réponse du serveur**, jamais de l'adresse : posé en
  `textContent`, coupé à 60 caractères ; vide → « Hôtel Démo · Roissy ».
- **La page d'arrivée EST la vraie page du QR** (25/10/2026, plus bas) :
  fabriquée depuis elle, remplie depuis `HOTELS` (jamais recopiée), puis le
  formulaire ; « ← Toutes les destinations » revient. Consigne : « Touchez une
  destination pour faire une réservation d'essai, comme vos clients. » Pas de
  cartes au comptoir. **Ne jamais la redessiner à la main** : c'est ainsi
  qu'elle avait pris du retard.
- **« Personnaliser ma page »** (sur les deux vues) : nom (60 car.), couleur
  (six pastilles + sélecteur ; assombrie jusqu'à 4,6:1 pour le bouton, encre
  à 7,5:1 sur l'en-tête), photo (réduite à 1000 px, jamais envoyée, perdue au
  changement de page — et on le dit ; depuis le 11/10/2026 elle s'affiche dans
  le bandeau, comme chez un partenaire), message d'accueil (160 car.), jusqu'à
  quatre destinations ajoutées (clé stable `perso-<id>`), prix par
  destination (1 à 2 000 €, vide = au kilomètre). Tout dans
  `ela_demo__ela_demo_perso` ; « Revenir à la page d'origine » efface tout.
  Aucune requête serveur.
- Thème bleu Elatransfer. **Depuis le 11/10/2026 la démo charge la finition
  des pages d'hôtel**, devenue commune (`memoire/finition-commune.md`) : nom
  et téléphone sur la première page, vert/rouge, comptoir « ESPACE
  RÉCEPTION » — ce qu'a un partenaire. Avant, elle nommait easyHotel et la
  démo ne pouvait pas la charger.
- Pièges : la redirection de tête (`?exploitant=`, `?reception=`) est
  retirée, sinon `?exploitant=1` sortait de la démo ; pas de service worker
  ni de notifications (`CLE_VAPID` vide) ; « Fermer la session » masqué ; un
  seul prix sur deux faisait planter l'écriteau (`euros(undefined)`) ; le
  contrôle « une seule balise robots » comptait aussi le `meta` écrit dans le
  script du moteur — il ne compte plus que les balises.

## L'isolation — trois défenses, éprouvées séparément

1. **CSP** dans la page (`<meta>`) et la même dans `_headers` pour `/demo/*`
   (plus `X-Robots-Tag`). `connect-src` : le site, BAN, Photon, ORS, OSRM et
   l'URL EXACTE de `demande-demo`.
2. **`verifier-demo.mjs`**, en DERNIER dans `construire.sh` (après le retrait
   des commentaires) : la construction échoue si `site/demo/` ou un script
   local chargé par ses pages contient `/rest/v1`, `deposer-course`,
   `courses-hotel`, `etat-course`, `nouvelle-demande`, `prevenir-client`,
   `wa.me`, `api.telegram.org`, la clé publique Supabase, « easyhotel », la
   clé d'un partenaire réel ou un de ses forfaits.
3. **La page elle-même** (`test-demo-hotel.mjs`) : aucune requête vers
   Supabase hors `demande-demo`, ET aucune tentative bloquée par la CSP —
   sans ce second contrôle, une fuite cachée par la défense 1 passait au
   vert. Les appels à la main depuis la console sont éprouvés aussi.
- Reste ouvert : une NAVIGATION vers Supabase n'est pas couverte par la CSP ;
  sans adresse ni clé dans la démo (défense 2), elle ne peut rien lire.

## L'écran « Prospects » de l'admin

- Entrée « Prospects » (après « Pilotage »), écran `#ecran-prospects`,
  `prospects.js` et `prospects.css` (classes `prs-` : `pro-` est pris).
- Une carte par prospect, du plus récent : établissement, type, nom ·
  fonction, téléphone (`tel:` et WhatsApp), e-mail, date, e-mail confirmé,
  démo (première ouverture, visites, dernière visite), pastille « Adresse
  pro » / « Grand public ». Deux demandes à la même adresse se signalent.
- **Statut (5 valeurs) et note (≤ 2000)**, seuls modifiables, et seulement ce
  qui a changé ; `return=representation` : une réponse vide est une erreur
  dite. Filtres par statut, « Nouveaux » en tête.
- **Rien n'est lu au chargement de l'admin** : seulement à l'ouverture de
  l'écran et sur « Actualiser ». Rien sur l'appareil.
- **On ne demande que les 17 colonnes accordées**, jamais `select=*` (la base
  refuserait). Le test relit la liste dans la migration.
- **Une erreur n'est jamais une liste vide** : chaque panne a sa phrase, en
  `role="alert"` ; une actualisation ratée garde la liste précédente.
- **L'agent ne voit rien** (entrée, écran, clic). La base FILTRE l'agent au
  lieu de le refuser : il recevrait une liste vide, donc l'écran ne lit rien
  pour lui et le dit.
- Une carte enregistrée reste sous les yeux jusqu'au changement de filtre ;
  une saisie en cours survit à « Actualiser ». Tout en `textContent`.
- Pas de version : le dernier gagne (Barbaros est seul admin). Au plus 500
  prospects lus, et l'écran le dit.
- `construire-espaces-hotel.mjs` retire la section et les deux fichiers des
  pages publiques, et s'ARRÊTE si l'un d'eux y reste.

## La surveillance de production (bloc 6)

`verifier-production.mjs` surveille `/professionnels/` (adresse canonique,
indexable), `/demo/hotel/` et `/demo/hotel/reception/` (espace « demo »,
masquées par défaut, `noindex`), et ouvre la démo SANS session : elle doit
renvoyer au formulaire sans appeler le serveur. **Il n'exige jamais que la
démo s'ouvre** : c'est le serveur qui en décide.

## La recette (bloc 6) — ce qu'elle a trouvé et corrigé

Parcours relu comme un directeur d'hôtel, au téléphone (390×844) et sur
ordinateur (1366×768), sur le site construit. Quatre défauts, tous corrigés
et verrouillés par un contrôle éprouvé contre l'ancien code.
- **Sur téléphone, `#demo` montrait trois liens avant le formulaire** : le
  formulaire commençait à 467 px du haut de la section. Sur une colonne, le
  texte devient des éléments de la grille (`display:contents`) et
  « Vous préférez nous parler ? » passe sous le formulaire (289 px).
  `test-pro-formulaire`, bloc 11.
- **Sur ordinateur, la vue client de la démo s'étalait sur 1 300 px** : sans
  `hotel-engine-polish`, rien ne la bornait. `demo.css` reprend les mesures de
  la vraie page (page 1 180 px, formulaire 780 px, centrés).
- **La façade retirait à TOUTES les pages, au-delà de 900 px, la place de la
  barre du bas** (`body{padding-bottom:0}`). Le site public n'a plus de barre ;
  la page du flyer d'un hôtel et la démo l'ont gardée, et leur dernière ligne
  passait dessous — **en ligne sur la vraie page easyHotel**. La règle est
  bornée au site public. Les 110 px de marge que la démo ajoutait pour
  compenser laissaient sur téléphone ~200 px de vide : retirés.
  `test-easyhotel-client` 5 bis, `test-demo-hotel` 6.
- **« Prix fixes » au-dessus de cartes « à fixer »** : l'en-tête dit « Prix
  par destination · Berline 4 places · Van 7 places », sur une ligne à 390 px ;
  la consigne porte une flèche ↓, plus un chevron qui se lisait comme un menu
  à déplier.
- **La réception de la démo montrait une barre du bas** (Accueil, WhatsApp)
  que la vraie n'a pas (`reception-premium`, dans `hotel-engine-polish.css`,
  non chargé par la démo) : retirée. Et, à la demande de Barbaros (9/10), sur
  un ordinateur (large ET à la souris) la réception — vraie et démo — n'a plus
  aucun bouton WhatsApp ; une tablette au doigt le garde.

## Prénom et nom, séparés (9 octobre 2026)

À la demande de Barbaros : le formulaire demande « Prénom » et « Nom », et la
base les garde à part (`prospects.prenom`, 1 à 60 caractères). « nom » porte
désormais le nom de famille seul ; un prospect d'avant garde `prenom` NULL et
son nom complet dans « nom » — on ne coupe pas « Jean-Marc de la Tour » en
deux au hasard. L'admin affiche « Prénom Nom », Telegram « Nom : Prénom Nom ».
Côte à côte dès 600 px, l'un sous l'autre en dessous, `given-name` /
`family-name`. La politique de confidentialité dit « le prénom et le nom ».
L'écran Prospects n'a pas de recherche : il n'y avait rien à étendre.
- **L'ORDRE DE MISE EN LIGNE EST À L'ENVERS** : la fusion déploie la fonction
  et l'admin AVANT que `20261009010000_prospects_prenom.sql` soit appliquée.
  `demande-demo` appelle donc la base AVEC `p_prenom`, et sur un 404/PGRST202
  (fonction inconnue avec ce paramètre) rappelle SANS, le nom complet dans
  « nom » (80 caractères au plus). Seul ce refus-là est rejoué : une contrainte
  refusée reste un 503. L'admin, sur un 400, relit sans la colonne, et retient
  le repli pour toute la page (sinon chaque écriture redemandait la colonne).
- **Une seule `ela_prospect_creer`** : l'ancienne signature (9 paramètres) est
  retirée et `p_prenom` vient EN DERNIER avec un défaut NULL — deux fonctions
  du même nom, et PostgREST refuserait l'appel ; un appel sans prénom trouve
  toujours la sienne. **Rejouer `20261008000000_prospects.sql` APRÈS celle-ci
  recrée l'ancienne signature** : rejouer `20261009010000` juste derrière.
- La migration est renommée `20261009010000` : `main` avait déjà un
  `20261009000000` (journal des dépôts) le même jour.
- Une page restée en cache (sans « prenom ») passe comme avant ; un prénom
  présent mais vide, avec un chevron ou de 61 caractères est un 400 « prenom ».
- Épreuves : `prospects-prenom-apres.sql` (CI, après la migration rejouée),
  trois migrations faussées (ancienne signature gardée, prénom modifiable,
  contrainte absente) ; `test-securite-fonctions` (repli, page ancienne,
  refus non rejoué) ; `test-admin-prospects` (base sans colonne) ;
  `test-pro-formulaire` (disposition à 599/600 px, erreur sous Prénom).

## Épreuves

- `test-pro-page.mjs`, `test-pro-formulaire.mjs` (site construit, neuf
  largeurs × deux langues, faux serveur), `test-demo-hotel.mjs`,
  `test-admin-prospects.mjs`, `test-securite-fonctions.mjs`,
  `supabase/tests/prospects*.sql` (vrai PostgreSQL, en CI).
- Chacune a été éprouvée contre les défauts qu'elle surveille (dix
  falsifications du formulaire, vingt-deux de la fonction, dix-sept
  migrations faussées, quatorze de l'écran Prospects) : elle tombe à chaque
  fois en nommant le défaut.
- Réception en anglais et cadre photo : sans la traduction, six contrôles de
  `test-demo-hotel` tombent ; sans le cadre cliquable, un.

## 21 octobre 2026 — la page devient un outil de vente (mission « page pro 10/10 »)

Mission de Barbaros : auditer, garder ce qui est excellent, renforcer le
reste, sans rien ajouter « pour faire différent ». Fait sur le site construit,
`professionnels/index.html` seul (ni accueil, ni tarifs, ni moteur, ni
serveur). Note donnée : 7/10 avant, 9,5/10 après ; le reste dépend de choses
que le code ne produit pas (SIRET, un second hôtel, une phrase signée de
l'hôtel en service, avec son accord écrit).

- **Gardé tel quel** : le titre « Votre réception réserve. Elatransfer gère
  tout le reste. », « Ce que vit votre réception », les trois étapes, le
  texte du programme partenaire (règle du 18/10), la question du vol en
  retard (mot pour mot l'accueil), « Déjà en service… » au singulier.
- **Le sous-titre dit d'abord ce qu'est Elatransfer** : « réserve et
  coordonne les transferts de vos clients », puis ce que l'établissement
  reçoit. Pas « centrale de réservation » dans le haut de page : le mot est
  exact (CGV art. 2, L3142-1) mais il est dans la FAQ, où il répond à « qui
  assure le transport ? ».
- **Second bouton du haut : « Parler de mon établissement » → #contact**, au
  lieu de « Nous appeler » (`tel:`). Sur un ordinateur, un `tel:` n'ouvre
  rien d'utile ; #contact donne les trois moyens en clair, et les appels qui
  en partent restent comptés (`clic_appel`).
- **« Ce que vous n'avez plus à organiser »** : un panneau, six lignes, toutes
  vraies aujourd'hui, et la phrase « Votre réception transmet la demande.
  Elatransfer coordonne le reste. »
- **« Ce que ça change » est remplacé par « Pour la direction »** : ce que
  l'établissement n'a pas à porter, ce que gagne son client, puis le bloc
  partenaire (inchangé, devenu un `h3`, `#partenaire` sur la carte). Son
  bouton devient secondaire (`.bouton.contour`) : un seul bouton plein par
  écran, la démonstration.
- **« À quoi ça ressemble »** (même jour, Barbaros : « fais tout comme un
  expert ») : le directeur voit le produit sans donner son e-mail. Deux
  captures de la DÉMO, pas d'un vrai hôtel : « Hôtel Exemple Roissy », clients
  « (exemple) », « Karim — chauffeur fictif », prix « à fixer », et la légende
  le dit. Fabriquées depuis le site construit avec un faux `demande-demo`, le
  bandeau, les onglets et les consignes de la démo masqués, l'horloge fixée à
  10 h (sans elle, une course d'exemple s'affichait « En retard »). Client
  390 px ×2, réception 1280 px ; WebP ≈ 45 Ko chacune, une par langue
  (`data-src-en`), chargement différé. `test-pro-page` n'accepte que le logo et
  `professionnels/apercu-*-fr|en.webp`, et exige qu'elles s'affichent et
  changent de langue. **Refaire les captures si la démo change d'aspect** :
  `sh construire.sh && node .claude/outils/captures-pro.mjs` (depuis le 25/10).
  Reste : dans la démo anglaise, le trajet s'écrit encore « L'hôtel → Orly ».
- **Trois écrans** (23/10/2026, Barbaros : « qu'ils puissent voir la version
  ordinateur, téléphone, tablette ») : six captures par langue
  (`apercu-<client|equipe>-<telephone|tablette|ordinateur>-<fr|en>.webp`,
  390 px ×2 ramenés à 540, 820 px, 1280 px ; 38 à 46 Ko), un bouton par écran,
  un seul écran visible, ouverture sur celui du visiteur (< 600 téléphone,
  < 1024 tablette). Fabriquées comme avant, en masquant `#demoBandeau`,
  `#demoCadre`, `#demoCartesAide` et `#demoCartesFlyer`, horloge à 10 h.
  **Trouvé en les faisant** : sur ordinateur, les cartes de destination de la
  démo passaient à trois colonnes de 243 px dans 780 px, et « Aéroport » se
  coupait en « Aéro / rt » ; `demo.css` pose maintenant des colonnes d'au moins
  320 px. `test-pro-page` appuie sur chaque bouton et exige ses deux captures,
  et elles seules.
- **La démo se présente comme une preuve** : sur-titre « La démo hôtel, à
  votre nom » (le texte du bouton qui y mène), titre « Voyez ce que verraient
  vos clients et votre réception », et le parcours réel du simulateur jusqu'à
  « Effectuée ». Bouton : « Ouvrir ma démonstration ».
- **FAQ, dans l'ordre d'un directeur** : coût, engagement, qui assure le
  transport (« centrale de réservation », jamais transporteur), « Et si aucun
  chauffeur n'est disponible ? » (vécu 3 posait la peur sans y répondre),
  tarifs, vol, données, mise en place (absorbe « Que faut-il vous
  fournir ? »). « Que doit faire votre équipe ? » a été écrite puis retirée :
  elle redisait « Rien à installer » et les étapes.
- **Refusé dans la consigne, et pourquoi** : « solution », « mobilité »,
  « infrastructure de mobilité » et « VTC » (mots interdits par ses décisions
  des 8 et 18/10, `test-pro-page`) ; aucun délai (« 48 h ») ni chiffre ;
  l'accueil n'a pas été touché (passerelle décidée le 18/10, et la PR #398
  modifie `index.html` et `sw.js` en même temps).
- **La note Google reste à 25 avis** : la mission parle de 30, mais personne
  ici ne peut le lire sur Google. `avis-google.json` change le jour où
  Barbaros donne le nombre et la note relevés.
- **Mesure** : `page_vue`, `clic_appel`, `clic_whatsapp` sont comptés ; les
  demandes de démo et leurs ouvertures sont dans « Prospects ». Pas comptés :
  le clic e-mail et « Recevoir nos conditions ». Rien ajouté.
- Mesuré : aucun débordement de 320 à 1366 px (FR et EN), « Voir la démo
  hôtel » dans le premier écran partout (320×640 : 524–578). HTML +2 Ko
  compressés ; deux images par langue, ≈ 95 Ko, chargées à la demande.

---

## Archivé de CLAUDE.md le 22/10/2026

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## LA DÉMO PROFESSIONNELS

Livrée le 8/10/2026 : `/professionnels/` (indexable) → formulaire →
`demande-demo` → `/demo/hotel/` (client et réception, simulateur local) ; les
demandes arrivent dans l'admin, écran « Prospects » (admin seul, rien pour
l'agent). Tout, et pourquoi : `memoire/demo-pro.md`.
- **La démo n'atteint jamais la production** : CSP, `verifier-demo.mjs` à la
  construction, `test-demo-hotel` ; `deposer-course` refuse tout « demo ».
  Elle arrive FERMÉE et ne s'ouvre que sur une session du serveur : le
  contrôle de production n'exige jamais qu'elle s'ouvre.
- **Le texte ne promet que le vrai** : coût zéro, sans engagement, « Déjà en
  service dans un hôtel de la zone de Roissy-CDG » au singulier (jamais « nos
  partenaires » ; à retirer si le partenariat cesse). Aucun prix proposé,
  aucune photo envoyée, des initiales au lieu d'un logo, le nom du prospect
  venu du serveur et jamais de l'adresse.
- **Ni robot ni humain bloqué** : pas de Turnstile (option B ;
  `TURNSTILE_SECRET` + `CLE_TURNSTILE` le réactivent), champ piège, délai
  minimum attendu par la page, 5 demandes/h/IP et 3/jour/e-mail. L'accès dure
  7 jours, et c'est écrit partout. Aucun secret à poser : celui des sessions
  se dérive de la clé service_role (`DEMO_SESSION_SECRET` posé l'emporte).

---

## 25 octobre 2026 — la démo rattrape la vraie page du QR

Barbaros, capture de « Aperçu sur téléphone, tablette et ordinateur » à
l'appui : « ce que je présente en démo est bien derrière […] comment le
mettre à jour ? comme un expert ». Priorité annoncée P1 (outil de vente aux
hôtels ; le P0 #399 était porté par la PR #425, aucun fichier commun).

- **Mesuré, page par page, sur le site construit** : la réception de la démo
  était À JOUR (fabriquée depuis la vraie à chaque construction ; seules
  différences voulues : pas de prix, pas de photo, le bleu). **La page
  client, non** : la démo montrait l'en-tête du formulaire (« Votre photo
  ici », « Tarifs partenaires », Départ/Arrivée) et ses propres cartes,
  dessinées le 8/10 ; la vraie page du QR avait depuis « Votre transfert
  depuis… », l'adresse, « Départ hôtel déjà renseigné », « Réserver mon
  transfert », les cartes sur trois colonnes, les étapes 1-2-3, « Besoin
  d'aide ? » et le pied. Une copie ne suit pas l'original.
- **La correction est structurelle, comme pour la réception** :
  `arriveeDepuisPageQr()` lit la page publiée, garde son style et son
  contenu, préfixe classes (`qr-`) et identifiants (`demoArrivee-`) — le
  moteur a déjà ses `.carte`, `.prix`, `.etapes` —, cloisonne le style sous
  `#demoArrivee` (une remise à zéro `all:revert` empêche la feuille du moteur
  d'y entrer), retire nom, adresse, prix, liens et script de l'hôtel réel, et
  change sa couleur en celle de l'hôtel du prospect (`TEINTES`). Les cartes
  deviennent des modèles (`<template>`) que la démo clone : destinations de
  l'hôtel fictif et celles du prospect, prix « à fixer » ou les siens, au
  format de la vraie page (« 52 € »).
- **La construction échoue** si un repère de la page du QR disparaît, si un
  lien relatif, le nom ou l'adresse d'un partenaire réel y reste, ou si une
  teinte orange y reste (éprouvé : retirer `#ff5a0a` de `TEINTES` fait
  tomber `construire.sh`).
- **Ce qui change pour le prospect** : sur l'arrivée, ni l'en-tête du
  formulaire ni la barre du bas — comme sur la vraie page ; ils viennent avec
  le formulaire. Le cadre photo, les initiales, « Vos prix : ceux de votre
  flyer » et le message d'accueil y sont donc ; la phrase « Photo ajoutée »
  le dit. La ligne « Prix fixes » devient « Prix à fixer » tant qu'un prix
  manque (même longueur : une ligne à 390 px).
- **Le « + » de « Nouvelle course »** était un carré blanc vide dans la
  réception de la démo (visible sur la capture de Barbaros) : la finition
  commune le peint de la couleur du texte du bouton — noir sur l'orange
  d'easyHotel, blanc sur le bleu. `demo.css` le peint en bleu ; la vraie
  réception n'est pas touchée. Un futur partenaire à bouton foncé aurait le
  même carré vide : à corriger dans la finition commune ce jour-là.
- **`test-demo-hotel`, bloc 2 bis**, à 390 et 1280 px : chaque bloc visible
  de la vraie page du QR doit être dans l'arrivée (« manquent : hero, cta… »
  sur l'ancien code), avec le même dessin mesuré (polices, marges, colonnes,
  largeurs ; seule la largeur du nom dans une carte dépend du prix), aucune
  couleur orange peinte, rien qui déborde. Sur l'ancien code : 15 contrôles
  tombent en nommant le défaut.
- **Les captures** de `/professionnels/` sont refaites par
  `.claude/outils/captures-pro.mjs` (WebP fabriqué par Chromium, 29 à 49 Ko ;
  un navigateur par langue, lancé avec `LANG` : sinon la date des champs
  s'écrivait « 10/25/2026 · 10:00 AM » sur une capture française).
- Vu et laissé : après le choix d'une destination, l'en-tête collé du moteur
  recouvre la moitié haute de « ← Toutes les destinations » ; le doigt
  l'atteint (mesuré). Identique avant ce changement.

### Même jour, seconde passe : les thèmes, le QR code dit, trois étapes

Barbaros, sur les captures avant/après : « pas de démonstration avec des
couleurs moches, seulement quelques couleurs, et il faut bien expliquer que
la landing page est associée au QR code installé ou celui du flyer et
montrer aussi l'exemple avec la page où les réservations se font ».

- **Deux thèmes : Bleu (par défaut) et Noir, plus de choix libre.** Au fil
  des essais, Barbaros a vu trois couleurs, puis quatre (avec le Pétrole),
  puis « le bleu actuel, noir or, et deux autres couleurs classe »
  (Bordeaux, Vert anglais), puis Noir et Blanc à leur place ; il a gardé le
  Bleu et le Noir. Écartés : l'or, le bronze (ternes), l'anthracite, la
  prune, l'indigo (fondus dans le marine), le violet, le pétrole, le
  bordeaux, le vert, le noir et or, le blanc ; le sélecteur libre
  permettait pire.
  - **Un thème est une marque complète** (`THEMES`, `demo-simulateur.js`),
    celle qu'aurait un vrai partenaire dans `HOTELS` : le fond sombre des
    bandeaux (`fond`, `fond2`), le bouton, les fonds clairs et leur encre.
    Une couleur de bouton seule ne fait pas un thème : un bouton noir
    disparaît sur le marine.
  - **Noir** : bandeaux noirs, écriture blanche, actions noires — sauf le
    grand bouton du bandeau, BLANC sous du noir (`ctaFond`, `ctaTexte`).
  - Le thème suit les trois écrans : sur la page du QR, le marine et son
    bleu pâle sont des variables (`TEINTES` : `--demo-fond`, `--demo-fond2`,
    `--demo-neutre`) ; au formulaire et au comptoir, `demo.css` repeint les
    bandeaux (`html[data-demo-theme]`, posé par `poserTheme`). **Le Bleu
    garde ceux d'Elatransfer à l'identique.**
  - Appris en essayant le noir et or et le blanc (retirés) : **la finition
    commune pose du blanc sur l'action côté client** (bandeau du téléphone,
    « Tarifs partenaires », « Départ de l'hôtel », « Voir mon prix »…) ;
    seul le comptoir lit `texteAction`. Un partenaire à couleur claire (l'or)
    aura besoin de cette correction dans la finition commune ; un thème à
    bandeaux blancs, de retourner tous les textes que les trois écrans
    écrivent en blanc.
  - Chaque thème est un bouton qui dit son nom, avec un rond qui montre ses
    deux couleurs ; le premier est choisi d'office. Un choix gardé d'avant
    (une couleur, un thème retiré) revient au Bleu.
  - `test-demo-hotel`, bloc 2 ter : pour chaque thème, à 390 et 1280 px, sur
    la page du QR, le formulaire et le comptoir, le contraste de CHAQUE texte
    sur son fond ; **aucun thème ne doit rendre illisible un texte que le
    Bleu laisse lisible** (le Bleu a ses défauts d'origine : les pastilles
    « 1 2 3 » du formulaire, 4,16:1, les flèches de la page du QR, le blanc
    sur le vert de WhatsApp). Et le grand bouton se détache de son bandeau au
    moins autant que dans le Bleu. Il a trouvé, sur les thèmes essayés : le
    « EN » noir sur le noir du comptoir (1,02:1), l'onglet doré sur blanc
    (2,4:1), les liens blancs sur le blanc (1:1), et le bouton noir sur le
    noir.
- **L'arrivée prend aussi l'en-tête blanc de la vraie page** (logo, FR/EN) :
  la barre de couleur du formulaire y ajoutait une couleur que la vraie page
  n'a pas. Ses boutons FR/EN pilotent ceux du moteur ; l'en-tête du formulaire
  revient avec le formulaire. Le test de dessin l'a mesuré : la feuille du
  moteur grossissait ses boutons (16 px au lieu de 13,3) — `button` et
  `header` sont entrés dans la remise à zéro.
- **Le fil de la démo** (`#demoGuide`, sous les onglets, hors de la page
  montrée) : « 1 La page du QR code : votre client scanne le QR code posé à
  l'accueil ou imprimé sur votre flyer, et arrive ici, sur la page à votre
  nom », puis « 2 La réservation », puis « 3 Votre réception » (« votre
  équipe » pour une agence). L'étape suit la page (classe `demo-choix`,
  onglet). La phrase bleue sous les cartes ne redit plus le QR code : « Ces
  prix sont ceux de votre flyer. »
- **`/professionnels/` raconte trois étapes par écran** : 1 la page du QR code,
  2 la page de réservation (nouvelle capture, une destination touchée, cadre
  photo et pastilles de la démo masqués), 3 l'espace équipe — légendes
  numérotées, la première dit « le QR code posé à l'accueil ou imprimé sur
  votre flyer ». Sur un téléphone, les trois se font glisser (une ligne qui
  défile, la suivante dépasse au bord) ; le contrôle de débordement de
  `test-pro-page` ignore ce qui dépasse DANS un cadre qui défile, si le cadre
  tient dans l'écran. 18 images, chargées à la demande.

### Même jour : la photo du bâtiment sur la vraie page, « Votre photo ici » dans la démo

Barbaros : « pourquoi il n'y a plus la photo de l'hôtel ? […] c'est pour la
vraie page client easyHotel », puis deux photos du bâtiment, prises par lui.
La vraie page du QR porte désormais la photo du bâtiment en haut de son
bandeau (`memoire/mode-hotel.md`). **La démo, fabriquée depuis cette page, ne
la montre jamais** : `arriveeDepuisPageQr` remplace toute image `/photos/…` du
style par `var(--h-photo-entete,none)` — la photo du prospect, sinon rien — et
refuse toute autre image ; le voile bleu nuit devient celui du thème
(`TEINTES`). Là où la vraie page montre le bâtiment, la démo pose le cadre
« Votre photo ici » (`#demoPhotoArrivee`), qui ouvre le choix du fichier et
devient « Changer la photo » une fois la photo posée : le prospect retrouve sa
photo dès le premier écran, ce que Barbaros regrettait.

## 28 octobre 2026 — audit « espace Professionnels premium »

Mission de Barbaros : auditer `/professionnels/` comme un expert B2B (UX,
conversion, SEO, crédibilité), garder ce qui marche, renforcer le reste, sans
toucher à la réservation, au serveur ni à la démo. Priorité P1 (acquisition
hôtels), demandée alors que le P0 #399 restait ouvert. Mesuré sur le site
construit, à 390 × 844 et 1366 × 768, avant et après.

- **Constaté** : sur ordinateur, la moitié droite du bandeau était vide ; les
  vraies captures de la démo (la meilleure preuve de la page) n'arrivaient
  qu'au troisième écran, et l'espace équipe s'y lisait réduit au quart
  (1 280 px montrés sur 340). Sur téléphone, l'en-tête ne gardait que le logo
  et EN : sur 8 765 px, aucun accès à la démo entre le haut et le formulaire.
  « Comment ça marche » était un sous-titre au fond d'une autre section, après
  trois blocs qui disaient ce qu'on n'aurait plus à faire. « Ce que vous
  n'avez plus à gérer » redisait tout ce que disent la frise, l'espace équipe,
  les avantages et les questions. Le sur-titre nommait quatre publics, le
  reste ne parlait qu'à un hôtel ; nulle part les trajets ni les véhicules.
  Le pied ne reliait aucune page des voyageurs.
- **Fait** : le bandeau montre l'espace équipe (ordinateur) et la page du QR
  code (téléphone), les mêmes captures que plus bas, avec « Captures de la
  démonstration · données fictives » ; l'en-tête garde « Essayer la démo » en
  contour (« Démo » sur téléphone) et les liens de section au-delà de
  1 000 px ; « Comment ça marche » devient une section, juste après les
  défis, conclue par la phrase du panneau retiré ; l'aperçu s'intitule « Ce
  que voient vos clients et votre équipe » et, sur ordinateur, met l'espace
  équipe sur toute la largeur ; une section « Pour qui » (hôtels, agences,
  entreprises, événements : une phrase chacun, rien qui n'existe déjà) et
  « Les trajets de vos clients » (aéroports, gares, Paris, Disneyland ;
  berline 4 passagers, van 7) ; le pied relie CDG, Orly et chauffeur privé
  (pages anglaises en anglais, `data-href-en`). Titre Google « Transferts avec
  chauffeur pour hôtels et entreprises | Elatransfer », description qui dit
  l'Île-de-France, `areaServed` dans les données.
- **Repris de l'Issue #426 (décisions du 25/10), sur cette page seulement** :
  « Déjà utilisé en conditions réelles dans l'hôtellerie, en Île-de-France. »
  et le premier défi « Un client demande combien coûte un trajet pour Orly.
  Personne au comptoir ne peut lui répondre. » (l'ancien, « à 5 h », contredisait
  l'assistance 7 h–22 h). L'anglais du défi reste à valider. Le lien vers les
  avis Google, l'encart de l'accueil et la fiche papier restent à #426.
- **Gardé tel quel** : la promesse, le sous-titre, les deux boutons du haut,
  les défis 2 et 3, la frise, l'offre, les trois écrans et trois étapes,
  « Plus qu'un numéro de chauffeur », le programme partenaire, la démo et son
  formulaire, les questions, le contact.
- **Écarté** : un label « Pro » à côté du logo (« ni Elatransfer Pro », règle
  du 18/10) ; un nouveau visuel ou une photo (aucune source propre, et les
  captures de la démo prouvent mieux) ; un chiffre, un témoignage, un logo de
  client (rien d'établi ni d'autorisé) ; une page anglaise à son adresse (à
  décider : voir plus bas).
- `test-pro-page` : le titre doit nommer la marque et le public dans n'importe
  quel ordre (il exigeait la marque d'abord).
- **Reste, hors code** : SIRET et mentions légales complètes (le premier
  contrôle d'un directeur), la note Google à partir de ~50 avis.
- **Aucun hôtel cité, jamais** (28/10/2026, Barbaros : « Je veux pas qu'on
  cite d'hôtel ») : ni nom, ni témoignage, ni « cas client », même avec un
  accord écrit. Ne plus le proposer comme preuve. La règle « aucun client
  cité » de `CLAUDE.md` le disait déjà.
- **« Voir l'outil en vidéo »** (même jour, Barbaros : « une vidéo de l'outil
  de réception aussi », « version ordinateur aussi », « 10/10 partout ») : une
  section juste après « Comment ça marche », deux onglets (le client réserve ·
  la réception réserve), une vidéo à la fois. Huit fichiers : deux parcours ×
  téléphone (portrait, 780 × 1688) et ordinateur (1920 × 1080) × français et
  anglais, 2 à 3 Mo chacun, et une image d'attente (le titre et un bouton de
  lecture dessiné). Le script choisit le format (≤ 700 px : téléphone) et la
  langue (il observe `lang`) ; `preload="none"` : rien n'est téléchargé avant
  l'appui. La vraie démo, filmée sur le site construit : hôtel et clients
  fictifs, numéros de la plage réservée à la fiction (06 39 98), montants
  remplacés par « votre tarif » (la démo ne propose aucun prix), et la page le
  dit. **Refaire les vidéos si la démo change d'aspect** :
  `sh construire.sh && node .claude/outils/videos-pro.mjs` (ffmpeg requis).
  L'enregistreur de Playwright et le flux d'écran du navigateur ne gardent
  que les pixels CSS (390 px) : l'outil prend des captures d'écran en rafale
  (13 à 17 par seconde), horodatées, que ffmpeg remet au bon rythme ; une
  capture lancée pendant un changement de page restait bloquée et coupait la
  fin du film sans erreur (la caméra s'arrête désormais pendant la
  navigation) ; la légende du bas recouvrait « Valider » sur téléphone
  (`pointer-events:none`). Qualité 26 (`-tune animation`) : indiscernable de
  21 à l'œil, deux fois plus léger. Restes de la démo visibles en anglais :
  « L'hôtel → Orly », « Zone hôtelière », la date au format américain.
  **À vérifier en ligne, sur un iPhone** : Safari ne lit une vidéo que si
  l'hébergeur accepte les requêtes partielles (Range) ; non vérifiable d'ici.
  Pour Google : les deux vidéos françaises sur ordinateur sont décrites dans
  les données de la page (`subjectOf` du Service, `VideoObject`, éditeur
  `#organisation`) — un seul graphe, comme ailleurs. `test-pro-page` exige
  que leurs fichiers existent, et qu'une vidéo se lise vraiment (le Chromium
  des suites décode le H.264 : mesuré, 2 s jouées en 2 s). **Reste, code, à décider** : une
  adresse anglaise pour cette page (`/en/professionals/`, hreflang), le lien
  « Voir nos avis sur Google » (#426).

## 29 octobre 2026 — la version ordinateur, et une journée d'exemple

Barbaros : « beaucoup trop blanche et vide » ; maquettes avant/après
annotées, validées. **La démo suit la vraie page** (au-delà de 1100 px : deux
colonnes, onglets dans l'en-tête, `memoire/finition-commune.md`), et les
onglets restent SOUS le bandeau de la démo (`test-demo-hotel`, bloc 9).
**La réception s'ouvre sur une journée** : huit courses d'exemple au lieu de
trois (hier, aujourd'hui, demain ; aéroports, Disney, gares ; validées, en
attente, effectuées), mêmes règles qu'avant (« (exemple) », 06 39 98, aucun
prix). Un prospect qui avait déjà ouvert la démo garde ses trois courses
jusqu'à sa prochaine session : on n'efface pas ses essais pour ça.
**La page Professionnels sur ordinateur** (au-delà de 1000 px) : le papier
du site au lieu du blanc, « Comment ça marche » sur un bandeau bleu nuit d'un
bord à l'autre, les questions en deux colonnes, la demande de proposition sur
du blanc ; 1180 px comme les pages d'hôtel. Téléphone inchangé (mesuré au
pixel). `test-pro-page`, bloc 8. Vidéos et captures refaites ensuite.
