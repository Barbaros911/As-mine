# ELA Transfer — ce qui a été décidé, ce qui est prévu, ce qui bloque

**Ce fichier ne dit PAS où en est le dépôt.** Ça se demande, ça ne s'écrit
pas : `sh .claude/outils/etat.sh` (ou `/etat`) rend le dernier `main`, l'état
de la publication, les Issues `[TEAM]` ouvertes, les PR, les branches vivantes
et le retard de la branche courante. Il interroge, donc il ne peut pas mentir.

**POURQUOI CE FICHIER A MAIGRI** (16 septembre 2026). Il tenait une liste de
« tâches terminées » et un état de production recopiés à la main. Le 16 il
n'avait pas bougé depuis **dix fusions, 38 branches supprimées et trois
correctifs publiés** : il annonçait un projet qui n'existait plus, et personne
ne pouvait le savoir en le lisant. Le même jour, `CLAUDE.md` annonçait un tarif
au kilomètre périmé depuis la PR #123. **Tout ce qui se recopie finit périmé** —
pas par négligence, mais parce qu'il y a toujours un soir où l'on fusionne à 2 h.

Il ne reste donc ici que les trois choses qu'aucune commande ne saura jamais
répondre : ce qui a été **décidé**, ce qui est **prévu**, ce qui **bloque**.
Un historique des fusions ne s'écrit plus ici : `git log` le tient déjà, et
mieux.

---

## Qui décide quoi

Dans `TEAM_RULES.md`. En cas de contradiction avec ce fichier-ci, c'est
`TEAM_RULES.md` qui dit vrai.

## Ce qui est décidé et ne se rediscute pas

- **Barbaros ne conduit pas, il place.** Elatransfer est une centrale de
  réservation (Code des transports L3142-1), pas un transporteur.
- **Le client paie le chauffeur, AVANT le départ, par le lien de paiement
  du chauffeur** (10/10/2026, Barbaros) — transmis par Elatransfer avec la
  confirmation ; le chauffeur part une fois le paiement reçu. **Aucun délai
  imposé** : la limite « 2 h avant » a été retirée le 11/10 (corrigé le
  17/10, cette ligne la portait encore). **C'est ce que fait le site et ce que
  disent les CGV** (art. 3, 5 et 7). L'argent ne passe jamais par Elatransfer.
  Le comptoir d'hôtel aussi, depuis le 11/10 : plus aucun règlement à bord.
  L'empreinte Stripe n'est **plus le modèle retenu** : son code de test existe
  côté serveur, aucune page ne l'appelle, Stripe Live est éteint — voir
  « Paiement Stripe — ce qui existe vraiment » plus bas. Détail :
  `memoire/paiement-lien.md`.
- **Le prix est ferme**, arrêté à la réservation, donc **opposable**.
  Conséquence de tout : toucher à la grille veut dire toucher aux CGV, dans
  les deux langues.
- **Aucune majoration** — ni nuit, ni week-end, ni jour férié, **y compris**
  sur le forfait partenaire easyHotel (son tarif de nuit a été retiré le
  22/09/2026). Le forfait easyHotel reste une autre grille, fixe par
  destination.
- **Quatre documents construits et cloisonnés.** `construire.sh` livre une
  entrée distincte pour le Public, le Client hôtel, la Réception hôtel et
  l'Admin. Le Public et le Client ne reçoivent plus le DOM, les appels ni le
  RBAC Admin ; la Réception reste limitée à son hôtel ; l'Admin dédié conserve
  l'interface historique choisie par l'exploitant. Les anciens liens deviennent
  uniquement des redirections vers l'entrée canonique.
- **`construire.sh` est la seule recette de publication**, partagée par GitHub
  Actions et Cloudflare Pages.
- **Aucun faux avis** (L132-2 Code conso.), jamais, même demandé. **La note
  Google chiffrée est ÉTEINTE** (25/10/2026, Barbaros, #426 : « le nombre
  d'avis ne se met pas à jour », « le peu d'avis, ça fait amateur ») ; à
  rouvrir vers ~50 avis. À sa place, **un lien seul, « Voir nos avis sur
  Google »**, sur l'accueil, les pages aéroport (FR/EN) et Professionnels —
  jamais sur un hôtel, son comptoir, l'admin ni la démo. Tout vient du seul
  `avis-google.json` (`afficher: true` rallume la note), jamais arrondie vers
  le haut, jamais en données structurées.
- **Une marque, deux entrées** (18/10/2026, ses décisions) : l'accueil parle au
  voyageur et ne porte plus de bouton dans le bandeau ; l'offre aux hôtels,
  agences et entreprises vit sur `/professionnels/`, avec un bloc « Devenez
  partenaire » **sans montant et au conditionnel** tant qu'il n'y a ni SIRET ni
  contrat. Un seul moteur de réservation.
- **Aucune photo ni aucun logo dont on ne détient pas les droits.**
- **Les priorités du développement sont les étiquettes des Issues GitHub**
  (24/10/2026, Barbaros ; `TEAM_RULES.md` §11). Le projet GitHub « ELA
  Transfer — Équipe IA », ouvert par ChatGPT le 21/09, n'est plus suivi :
  ne pas y reporter de tâches. Le Pilotage de l'admin reste son tableau
  pour ce qui ne se code pas (SIRET, assurance, partenaires).

## Décisions produit validées par Barbaros avec ChatGPT (16 septembre 2026)

**POURQUOI ELLES SONT ICI.** ChatGPT les a posées dans l'Issue #164 en écrivant
« À FAIRE PAR CLAUDE : les considérer comme contraintes produit pour la suite ».
Elles ne vivaient que dans un fil GitHub : **une session neuve ne les aurait
jamais vues.** Lire une Issue n'est pas s'en souvenir — c'est exactement la
raison d'être de ce fichier.
Le détail et les nuances restent dans #164 et #173 ; ce qui suit est ce qu'on
ne doit pas enfreindre sans le rouvrir.

**PLUSIEURS DE CES DÉCISIONS ONT ÉTÉ REMPLACÉES DEPUIS PAR BARBAROS**
(relu contre le code et les CGV le 17 octobre 2026). Chaque point remplacé
porte la mention **REMPLACÉ** ou **NON APPLIQUÉ**, avec ce qui vaut
aujourd'hui. Ne pas réappliquer la version du 16 septembre sans le rouvrir
avec lui : ce qui fait foi, c'est le code de `main` et les CGV publiées.

### Architecture
- **Quatre espaces séparés** : Public ELA · Client easyHotel · Réception
  easyHotel · Admin ELA — avec **un seul cœur de réservation**.
- **Une entrée canonique par rôle.** Les anciens alias redirigent, ils ne
  deviennent pas des versions à maintenir.
- **Multi-établissements dès la conception** : easyHotel ne doit pas être un
  cas codé en dur. Chaque hôtel aura sa configuration, le moteur reste commun.
- **Les projets d'autres clients ne vivent plus dans ce dépôt** (4 octobre
  2026, à la demande de Barbaros).
- Le QR de l'affiche ouvre l'espace **Client easyHotel existant**, et le
  contexte (hôtel, destination, tarif, provenance) est conservé **jusqu'à la
  confirmation** — pas de perte silencieuse en changeant d'écran.
- **Deux origines distinctes** : `QR client hôtel` et `Réception hôtel`. Les
  deux alimentent le même Admin, avec la source identifiable.

### Cycle de la réservation
~~`Demande reçue → Empreinte autorisée → Réservation confirmée → Chauffeur
attribué → Réalisée`~~ — **REMPLACÉ** par le paiement par lien (10–11/10).
Aujourd'hui : `attente` (demande reçue) → `confirmee` (un chauffeur est
affecté, la confirmation part avec SON lien de paiement) → `realisee`, plus
`refusee` et `annulee`. Le paiement est une case « Payé » sur la course,
pas un statut. Aucune empreinte.
- ~~**Confirmer ≠ nommer le chauffeur.**~~ — **NON APPLIQUÉ.** Dans l'admin,
  « Confirmer la course » exige un chauffeur, et les CGV (art. 3) disent que
  la confirmation part « lorsqu'un chauffeur a été affecté », avec son lien
  de paiement. Seule exception : une course **saisie au téléphone** par
  l'exploitant peut rester confirmée sans chauffeur (décision du 3/10) ; elle
  porte alors la pastille « Sans chauffeur ». Revenir à la règle du 16/09
  serait une décision de Barbaros, pas une correction.
- Une demande immédiate reste **soumise à disponibilité**. Aucune promesse de
  10/20/30 minutes, aucun « réserver 2 h avant = chauffeur garanti ».
- Une demande immédiate **ne reste pas indéfiniment en attente** : si aucun
  chauffeur, on le dit clairement au client.

### Canaux — à ne pas mélanger
- **Admin ELA = centre de commande et source de vérité.** Aucune action
  métier canonique ne dépend de Telegram.
- **WhatsApp = communication humaine** client et chauffeur.
- **Telegram = les alertes internes de Barbaros** (bot, rappels, « ✅ Vu »).
  ~~Ne pas le proposer aux clients.~~ — **REMPLACÉ le 11/10/2026** (PR #351) :
  le client choisit où recevoir sa confirmation — appel/SMS, WhatsApp ou
  Telegram pour un numéro français, WhatsApp ou Telegram pour un numéro
  étranger — et le bon de la réception affiche `@elatransfer`. Ce sont des
  conversations humaines ; le bot d'alerte reste interne.

### Cloisonnement de la réception
La réception ne voit **jamais** : commission ou marge ELA, montant chauffeur,
réglages Stripe, Telegram, carnet complet des chauffeurs, paramètres
commerciaux, réservations des autres partenaires. Elle ne capture ni n'annule
un paiement, ne modifie aucune règle tarifaire, ne clôt rien financièrement.
**Ne pas en faire un mini-Admin.**

### Paiement — L'EMPREINTE STRIPE DU 16/09 EST REMPLACÉE PAR LE LIEN DU CHAUFFEUR
Le 16/09, Barbaros avait autorisé une empreinte bancaire Stripe puis une
capture manuelle. **Le 10/10/2026 il a retenu autre chose** : le client paie
le chauffeur par le lien de paiement de celui-ci, avant le départ (voir plus
haut et `memoire/paiement-lien.md`). L'empreinte n'est plus le modèle prévu ;
elle ne reviendrait que sur sa décision, et pas avant le SIRET.
Les principes ci-dessous **restent la règle si Stripe revient un jour** :
- **Aucune donnée carte chez ELA. Aucun secret Stripe dans le dépôt.** Les
  CGV (art. 5) le disent : Elatransfer ne collecte aucune donnée bancaire.
- Le client ne saisit **jamais** sa carte dans un formulaire maison.
- Le montant est **calculé et verrouillé côté serveur**, jamais accepté du
  navigateur. Le webhook signé est la vérité de l'état Stripe.
- **Une empreinte n'est PAS du chiffre d'affaires encaissé.**
- **Stripe Live reste éteint** tant que Barbaros n'a pas son statut réel.
  Ne jamais afficher « paiement réel actif » sans l'avoir vérifié.

### Paiement Stripe — ce qui existe vraiment (relu dans le code le 17/10/2026)

| Brique | État réel | Preuve |
|---|---|---|
| PaymentIntent TEST, `capture_method=manual` | codé, déployé, **aucun appelant** | `supabase/functions/creer-empreinte` ; refuse toute clé autre que `sk_test_` |
| Capture, libération | codées, déployées ; seul Admin v2 les appelait, **retiré de la publication le 3/10** | `capturer-paiement`, `annuler-empreinte`, `admin-v2-actions.js` |
| Webhook signé (HMAC, tolérance 300 s) | codé, déployé ; répond 503 sans `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` |
| Tables `paiements`, `snapshots_financiers`, `stripe_evenements` | dans les migrations ; présence en production **non vérifiée** (aucun registre des migrations) | `20260916070000`, `20260916070100` |
| Snapshot financier | écrit par le serveur pour un **forfait partenaire** seulement ; un drapeau `verrouille`, sans déclencheur qui l'empêche de changer | `deposer-course` (`snapshotPartenaire`), `20260916093000` |
| Codes promo | table et écran Admin v2 ; **jamais appliqués** à une course | `20260916064000` |
| Payment Element, Apple Pay, Google Pay, Link | **absents** : aucune page ne charge Stripe.js | — |
| Réautorisation, remboursement, reversement chauffeur, Stripe Connect | **absents** (un statut prévu dans la table, aucun code) | — |
| Parcours complet de bout en bout | **aucun test** ; la CI ne fait que des recherches de texte | `stripe-test-regression.yml` |
| Stripe Live | **éteint** : les trois fonctions qui appellent Stripe refusent toute clé hors `sk_test_` ; la CI refuse `sk_live_` dans le code | — |

Les secrets `STRIPE_*` en production et un point d'arrivée de webhook
enregistré chez Stripe ne sont **pas prouvés** depuis le dépôt. Les défauts
à corriger **avant** toute réactivation sont listés dans #173.

### Annulation — REMPLACÉ PAR LES CGV DU 14/10/2026 (art. 7 et 8)
~~Plus de 24 h gratuit, empreinte libérée · moins de 24 h et no-show
facturables~~. Aujourd'hui : **tant que le prix n'est pas payé**, le client
renonce sans frais ; **une fois payé**, une annulation, un report ou une
absence ne donnent lieu à aucun remboursement ; **une course non assurée du
fait d'Elatransfer ou du chauffeur** est remboursée en totalité par le
chauffeur qui a encaissé, sous 14 jours. Barbaros a maintenu cette règle
contre le conseil d'un délai de 24 h (`memoire/paiement-lien.md`).

### Ce qui reste réservé à Barbaros, et qu'on n'invente jamais
Activation Stripe Live · reversement réel aux chauffeurs · commission (20 %
au lancement ; depuis le 30/09 elle se règle par canal et par chauffeur dans
l'admin, « Centre de contrôle », aucun taux n'est écrit dans le code) ·
tarifs · politique d'annulation · conditions contractuelles · rôle juridique
· identité et logo · engagement envers un partenaire.
**Ne jamais présenter easyHotel comme « partenaire officiel » sans accord
formalisé** — dire « tarifs au départ de easyHotel Aéroville », et **seulement
sur la page du QR du flyer** (et au comptoir) : son nom n'apparaît nulle part
ailleurs, ni dans Google (30/10/2026, Barbaros : « seulement pour les clients
de l'hôtel qui se connectent avec le QR code qui est sur le flyer »). Le QR du
flyer est fait par l'imprimeur, pas par l'affiche de l'admin.

### Qui tient quoi — ce qui reste du 16 septembre
**Deux sessions Claude ont travaillé ce dépôt en parallèle le 16 septembre**,
et leurs commits sont arrivés sous les pieds l'un de l'autre. C'est de là que
vient la règle d'une seule implémentation par sujet (`TEAM_RULES` §3).

**LE RELAIS** : la règle posée le 16/09 (« c'est Barbaros qui dit qui prend le
relais ») a été remplacée le 4/10/2026 (PR #317) par `TEAM_RULES` §3 : un
relais **traçable** — handoff signé dans l'Issue, un seul repreneur — et
**révocable par Barbaros**. En cas de doute, c'est `TEAM_RULES` qui dit vrai.

**UN SEUL ESPACE EXPLOITANT : `/ela-admin/`** (relu le 17/10/2026).
- C'est l'interface historique, retenue par Barbaros le 23/09 (« on garde
  l'ancien »). `construire.sh` la publie comme un document à part ;
  `admin.html`, `/exploitant/` et `?exploitant=1` y mènent tous.
- On y entre par une connexion Supabase (e-mail + mot de passe, plus un
  code admin à 6 chiffres depuis le 24/10/2026 : `SECURITE-ADMIN-CODE.md`) puis un
  contrôle serveur (`est_exploitant()`, `est_admin()` pour l'argent) : voir
  `COMPTES.md`. **Il n'y a plus de code d'accès.**
- **Admin v2 n'est plus publié** depuis le 3/10/2026 (`/admin-v2.html`
  renvoie vers `/ela-admin/`). Son code reste dans le dépôt parce que des
  fichiers sont partagés ; ne pas y renvoyer Barbaros.
- #165 (refonte Admin) est **fermée** depuis le 6/10 et #192 est dépassée
  (#218, #219) : aucune n'est un chantier. Toute correction repart de l'admin
  de `main`, sans seconde interface.

La branche « page-directe » a été supprimée le 4 octobre 2026 : les prix se
règlent depuis l'admin. Le détail historique des briques et de leurs pièges
reste dans `CLAUDE.md` et `memoire/admin-v2.md`. `/etat` signale en rouge
quand `main` a bougé pendant la session.

## Le mandat « STACK IA / DEVOPS MULTI-AGENTS V2 » — deux briques sur dix, décidé

22 septembre 2026. Barbaros a apporté un mandat de dix briques : orchestrateur,
GitHub Actions, Graphify, Context7, Playwright, Supabase preview, sécurité
automatique, preview visuelle, monitoring production, optimisation des tokens.
L'audit est dans #215.

**Il a tranché après cet audit : « fais ce qui est le mieux ».** Deux briques
ont été construites, huit ont été écartées **volontairement**. Ce n'est pas un
travail inachevé : c'est un arbitrage, et il est écrit ici pour qu'aucune
session ne le reprenne en croyant combler un oubli.

### Faites

- **Monitoring production.** Une fusion n'était pas une preuve : on publiait et
  personne n'allait voir derrière. L'état `VÉRIFIÉ EN PRODUCTION` du cycle
  officiel n'avait **aucun porteur** — il ne pouvait pas être prouvé.
- **Régression visuelle.** Les suites éprouvent des règles nommées ; une couleur
  qui change ou un bloc qui se décale n'était vu par personne, sauf par Barbaros
  sur une capture.

### Écartées, et pourquoi

| Brique | Raison |
|---|---|
| Orchestrateur exécutable | La gouvernance écrite est appliquée et tenue par les Issues/PR. Un orchestrateur logiciel serait une deuxième source de vérité à côté de GitHub. |
| Consolidation des Actions | 18 workflows en place, tous verts. Les toucher sans symptôme constaté, c'est le `html_handling` de Cloudflare une deuxième fois. |
| Graphify | Dépendance extérieure nouvelle, sur un projet qui n'en tolère qu'une. Le mandat lui-même demande d'en **mesurer le bénéfice avant** de la rendre obligatoire : cette mesure n'a pas été faite, donc rien n'a été installé. |
| Context7 / MCP projet | Même raison. Aucune tâche récente n'a échoué faute de documentation de dépendance. |
| Playwright — refonte | Déjà reproductible et verrouillé depuis #210. Un `playwright.config` commun serait du confort. |
| Supabase preview | Touche une zone critique et coûte peut-être de l'argent. **Aucune activation sans accord explicite de Barbaros**, et le coût reste à documenter GRATUIT / PAYANT / OPTIONNEL. |
| Remplacer l'action gitleaks par son binaire | Mesuré le 17/10/2026 : 6 échecs sur 300 exécutions. Les 4 sur des PR étaient de **vraies fuites attrapées** ; un seul faux échec (licence réclamée après un appel GitHub raté), sur un push de `main`, qui ne bloque rien. Réécrire un contrôle de sécurité exigé coûte plus que ce qu'il évite. À rouvrir le jour où une PR est bloquée pour cette raison : une relance suffit d'ici là. |
| Scanners de sécurité en plus | gitleaks **plus** le scanner maison à empreintes couvrent déjà. Installer CodeQL, Semgrep et Trivy ferait quatre outils pour un même travail — exactement le doublon que le mandat interdit. |
| Mesure des tokens | Aucune infrastructure ne la rend fiable aujourd'hui ; un chiffre inventé sur un tableau de bord finit par servir à décider. |

**Ce n'est pas « non », c'est « pas maintenant ».** Chacune se rouvre le jour où
un symptôme réel la demande. Ce qu'il ne faut pas faire, c'est les installer
parce qu'une liste les nomme.

## Ce qui est prévu

| Quoi | Qui | Où c'est suivi |
|---|---|---|
| Pilotage Produit + Opérations (distinct du traitement des courses) — **blocs 1, 2 et 3 FUSIONNÉS et DÉPLOYÉS le 6/10/2026** (PR #327, #329, #330 ; migration `20261006010000_pilotage.sql` appliquée en production, exécution n° 30). **VÉRIFIÉ EN PRODUCTION le 18/10/2026** sur le téléphone de Barbaros : première vraie carte créée, relue après fermeture de l'admin, priorité modifiée, historique lu (deux lignes, heure de Paris). La vue ordinateur n'est éprouvée que sur le site construit, en CI. Un bloc 4 seulement si le besoin se voit (`memoire/pilotage.md`) | Barbaros | #197 (fermée) |
| Paiement Stripe — **plus prévu** : le modèle retenu le 10/10 est le lien de paiement du chauffeur. Le code d'empreinte TEST reste dans le dépôt, sans appelant, Live éteint (voir « Paiement Stripe — ce qui existe vraiment »). À rouvrir seulement sur décision de Barbaros, après le SIRET | Barbaros | #173 |
| Alerte avant expiration du jeton Supabase `github-production` (1er octobre 2027, posé le 4/10/2026) | Claude | à ouvrir |

## Ce qui bloque, et par qui

- **LE SIRET N'EXISTE PAS.** Micro-entreprise à créer sur
  `formalites.entreprises.gouv.fr`, et cela ne dépend que de Barbaros. Sans
  lui : mentions légales incomplètes, fiche Google non vérifiable, **aucune
  facture de commission valable**.
- **CE N'ÉTAIT PAS « LE SEUL VRAI BLOCAGE », ET CETTE LIGNE A MENTI**
  (corrigé le 16/09/2026, sur l'audit de ChatGPT). Elle laissait croire qu'un
  numéro suffisait à pouvoir exploiter. Or Elatransfer n'est pas un
  transporteur mais une **centrale de réservation** — Barbaros l'a dit
  lui-même, « je place seulement » — et ce statut porte ses propres
  obligations. ChatGPT en nomme trois de plus : l'immatriculation de
  l'entreprise, une **déclaration annuelle de l'activité de centrale de
  réservation** auprès du ministre chargé des transports, et une **assurance
  RC professionnelle de la centrale**.
  **À FAIRE CONFIRMER SUR LE TEXTE AVANT DE S'EN SERVIR POUR DÉCIDER** : le
  réseau de cette machine ne joint pas Legifrance, je n'ai donc pas pu lire
  les articles moi-même. C'est rapporté, pas vérifié — et la règle du projet
  est de ne pas présenter une supposition comme une instruction. Ce qui est
  acquis et déjà écrit ici : le régime de centrale de réservation
  (L3142-1 et s.) et le médiateur (L616-1), juste en dessous.
- **Le médiateur de la consommation n'est pas désigné** (L616-1 Code conso.).
  Tant qu'il ne l'est pas, on n'en nomme aucun : le client écrirait à une
  adresse morte en croyant avoir saisi un recours.
- **Mapbox est repoussé**, à sa demande — il n'a pas voulu donner sa carte
  bancaire. Ne pas le relancer. Le site tourne sur ORS, OSRM en filet.

## Comment tenir ce fichier

Une seule règle : **n'y écrire que ce qui ne se mesure pas.** Un état, un
compte, une liste de branches, une date de dernière fusion — tout ça se
demande à `/etat`. Ici on n'écrit que des décisions et des intentions, et on
les date quand elles changent.
