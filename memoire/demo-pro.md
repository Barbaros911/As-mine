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
  `site/easyhotel-reception/index.html` (elles ont déjà perdu l'admin).
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
- **La page d'arrivée** fait comme celle d'un partenaire : « Où
  souhaitez-vous aller ? » et les destinations en cartes, construites depuis
  `HOTELS` (jamais recopiées), puis le formulaire ; « ← Toutes les
  destinations » revient. Consigne : « Touchez une destination pour faire une
  réservation d'essai, comme vos clients. » Pas de cartes au comptoir.
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
  changent de langue. **Refaire les captures si la démo change d'aspect.**
  Reste : dans la démo anglaise, le trajet s'écrit encore « L'hôtel → Orly ».
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
