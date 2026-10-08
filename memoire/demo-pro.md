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
  envoyée**.
- **Initiales au lieu d'un logo** (« Le Relais de Roissy » → RR, les articles
  sautés).
- La réception de la démo reste en français même quand le prospect passe en
  anglais (« c'est des Français ») — à trancher s'il démarche des hôtels
  anglophones.

## La page `/professionnels/`

- Page autonome (styles et textes dedans), **indexable**, canonique
  `https://elatransfer.com/professionnels/`, au plan du site. Bleu nuit,
  cyan, blanc, logo négatif du site, aucune autre image. Français écrit dans
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
- **Secrets** : `DEMO_SESSION_SECRET` obligatoire (sans lui, 503) ;
  `TURNSTILE_SECRET`, `RESEND_CLE` / `EMAIL_EXPEDITEUR` facultatifs — sans
  e-mail, la démo s'ouvre quand même.

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
  changement de page — et on le dit), message d'accueil (160 car.), jusqu'à
  quatre destinations ajoutées (clé stable `perso-<id>`), prix par
  destination (1 à 2 000 €, vide = au kilomètre). Tout dans
  `ela_demo__ela_demo_perso` ; « Revenir à la page d'origine » efface tout.
  Aucune requête serveur.
- Thème bleu Elatransfer (`demo.css` repeint l'orange partenaire) ;
  `hotel-engine-polish.*` (propres à easyHotel) non chargés.
- Pièges : sans la finition easyHotel, nom et téléphone se saisissent au
  récapitulatif ; la redirection de tête (`?exploitant=`, `?reception=`) est
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

## Épreuves

- `test-pro-page.mjs`, `test-pro-formulaire.mjs` (site construit, neuf
  largeurs × deux langues, faux serveur), `test-demo-hotel.mjs`,
  `test-admin-prospects.mjs`, `test-securite-fonctions.mjs`,
  `supabase/tests/prospects*.sql` (vrai PostgreSQL, en CI).
- Chacune a été éprouvée contre les défauts qu'elle surveille (dix
  falsifications du formulaire, vingt-deux de la fonction, dix-sept
  migrations faussées, quatorze de l'écran Prospects) : elle tombe à chaque
  fois en nommant le défaut.
