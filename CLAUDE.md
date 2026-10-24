# Asmine — mémo pour Claude

Ce fichier est lu automatiquement au début de chaque session sur ce dépôt.

> ## ⚠️ LIRE `TEAM_RULES.md` D'ABORD
>
> **Les règles communes** — qui décide quoi, la source de vérité, le chemin
> jusqu'à la production, les tests, les secrets, ChatGPT — **sont dans
> `TEAM_RULES.md`.** En cas de contradiction, c'est lui qui dit vrai.
>
> **Ce fichier dit ce qui est vrai AUJOURD'HUI** : la règle, ce qu'il ne faut
> jamais faire, et pourquoi en une phrase. **L'histoire** de chaque règle —
> quand, comment on l'a trouvée, ce qui a été essayé, les mesures — est dans
> `memoire/`, un fichier par sujet, cité au bout de chaque section. On ne
> l'ouvre que si le sujet revient.
>
> **CE FICHIER A UN PLAFOND, et il ne monte jamais.** Il a fait 455 Ko le
> 4 octobre 2026, encore 285 Ko le 21, lus en entier avant chaque réponse ;
> le rangement du 22 octobre l'a ramené à moins de 60 Ko (Barbaros : « comme
> un expert »). `test-doc.mjs` refuse qu'il regrossisse : pour y écrire, on
> range d'abord le sujet qu'on touche, **dans la même PR**. Une règle tient en
> une à trois lignes ; ce qui dépasse est de l'histoire.
>
> **Une note vieillit** : vérifier (un `grep`) avant de s'en servir pour
> refuser quelque chose. **Ne jamais lire `index.html` d'un bloc** (900 Ko) :
> chercher dedans, quelques lignes à la fois.

**CE DÉPÔT SERT À ASMINE (ELATRANSFER), ET À LUI SEUL.** Les sites vitrines de
commerçants n'y vivent plus depuis le 4/10/2026 ; `sites/` ne porte que des
entrées d'Elatransfer. Anciennes règles : `memoire/sites-vitrines.md`.

## Travailler avec Barbaros

- **En français, simplement, à son rythme.** Pas de jargon ni d'anglais non
  expliqué, des exemples concrets ; ne pas répéter ; ne pas lui parler de
  l'heure. Il travaille depuis un téléphone.
- **En professionnel expérimenté** (design, développement, conseil) : dire ce
  qui ne va pas, proposer, trancher.
- **Ne rien faire qu'il n'a pas demandé.** Une demande sur un élément ne
  s'étend pas à la page entière (« je veux juste le logo en noir et blanc »).
- **Le chemin le plus court** : une adresse directe, une commande à coller, un
  bouton nommé. **Un geste à la fois** quand il suit une procédure. Lire ses
  captures avant de répondre, ne jamais décrire une interface qu'on ne voit pas.
- **NE JAMAIS DEVINER.** Mesurer (un `grep`, un appel, un test) ; si c'est
  impossible, le dire et donner un chemin qui ne dépend d'aucune valeur. Lire
  une image n'est pas mesurer.
- **Méthode** : reproduire → mesurer l'état réel (rectangles, valeurs,
  `elementFromPoint`) → comparer avec la version qui marchait → bissecter.
  Après un changement, lancer les deux ou trois suites du sujet ; la série
  complète une seule fois, avant la fusion, jamais deux en parallèle.
- Il écrit souvent « van » pour « berline » : **sur un prix, demander.**
- Un jeton collé dans la conversation se fait révoquer, sans sermon.

Histoire : `memoire/methode-de-travail.md`.

## Git et publication

- **RIEN NE PART SANS QUE BARBAROS L'AIT VU** (août 2026, après deux fusions
  passées avant qu'il ait regardé) : faire, **montrer** (une capture, pas une
  description), **attendre son accord**, puis pousser. Vaut aussi pour un
  changement interne. L'urgence d'un lien à envoyer n'est pas une
  autorisation. **GitHub ne l'impose pas** (zéro approbation exigée, les PR
  sont sous son compte) : c'est une discipline, donc on la tient.
- Une fois l'accord donné : ouvrir la PR **et la fusionner** — sans la fusion,
  le lien envoyé au client ne marche pas.
- **Une tâche = une branche courte partie du dernier `main`**, PR vers `main`
  (`TEAM_RULES.md` §2). Plus d'`ai-dev`, ni d'aucune branche d'intégration.
- **Une fusion se juge sur `git diff main...branche`, jamais sur un compte de
  commits** (« deux commits d'avance » cachait une branche qui aurait effacé le
  site). Toute branche nommée ici doit exister. `memoire/branches.md`.
- `main` est protégée par un ruleset dont `.github/ruleset-main.json` est la
  cible ; `protections-main.yml` compare chaque jour. Compter ~22 min de CI.
- Vérifier `git branch --show-current` avant `git push`. **Ne jamais committer
  et pousser dans le même appel** (déjà bloqué par le classificateur).
- `.claude/` n'a aucun effet sur le site publié. Les compétences installées
  sont décrites dans `.claude/skills/README.md` ; ne pas en proposer d'autres
  sans demande.

## Construction et hébergement

- **`construire.sh` est la SEULE recette**, appelée par GitHub Actions et par
  Cloudflare ; ne jamais recopier ses étapes dans un workflow. Sa liste de
  fichiers est **explicite** (jamais `cp *`) ; `site/` est ignoré par git.
  **Tout fichier que la page charge doit y être nommé** : oublié, il marche en
  local et rend une 404 en ligne (arrivé avec `carte/`, `exploitant/`, les
  manifestes). Les contrôles de la recette lisent ses lignes de commande,
  jamais ses commentaires. Les scripts de construction n'utilisent que les
  modules de Node : `pages.yml` n'installe rien avant `construire.sh`.
- **Cloudflare sert le site** (`wrangler.jsonc`, branche `main`,
  `sh construire.sh`, dossier `site`) : `CLOUDFLARE.md`. `_headers` et
  `_redirects` n'agissent que là. Cloudflare tombe aussi : ne pas le vendre
  comme une immunité.
- **Le domaine est chez Cloudflare ; le courrier reste chez IONOS** (MX
  `mx00`/`mx01.ionos.fr`, SPF) : **ne jamais toucher ces lignes**, ni
  `google-site-verification`. `memoire/cloudflare-dns.md`.
- **Ne jamais changer un réglage par défaut qu'on ne peut pas éprouver**
  (`html_handling` à `"none"` avait cassé `/demos/`). `memoire/hebergement.md`.
- **Une adresse inconnue rend une vraie 404**, jamais l'accueil en 200 ; pas de
  `single-page-application` ; une ancienne adresse se redirige dans
  `_redirects`. `test-routage.mjs` refuse tout lien du site qui finirait en 404.
- **Quel commit est en ligne se prouve** : `construire.sh` écrit
  `/version.json` ; le monitoring exige le dernier `main` (15 min de marge),
  l'absence des textes de `.github/scripts/textes-interdits.mjs` (refusés
  aussi au build), et réserve de bout en bout (sonde `SONDE-`, jamais écrite).
- **Les commentaires de travail ne partent pas en ligne** :
  `.github/scripts/masquer-commentaires.mjs` les retire de `site/` en dernière
  étape ; toute page ou script publié ajouté entre dans sa liste.
  `memoire/commentaires-en-ligne.md`.
- **Toujours construire avant de capturer** : `index.html` seul n'a pas la
  façade (`application-facade.css`) et ressemble à un autre site. Ce qu'on
  montre est fabriqué au moment où on le montre.
- **Incrémenter `CACHE` dans `sw.js` à chaque changement visible** : les
  téléphones qui ont installé l'application gardent le reste (la CI le vérifie
  pour les fichiers « cache d'abord »). `NOS_DOSSIERS` y liste nos
  sous-dossiers, sinon le service worker les prend pour des sites voisins ;
  chaque page est gardée sous sa propre adresse, et le repli hors ligne ne vaut
  que pour l'application.

**Les adresses à éprouver après chaque déploiement** (le monitoring les
vérifie toutes les 6 h) :
| Adresse | Ce qu'elle éprouve | Attendu |
|---|---|---|
| `/` | la racine | le site de réservation |
| `/admin.html` | un fichier exact | renvoie vers la connexion de `/ela-admin/` |
| `/demos/` | **un dossier** | la galerie « Démonstrations » |
| `/n-existe-pas` | une adresse inconnue | « Page introuvable », code 404 |
Si `/demos/` rend une 404, c'est `html_handling` qui est en cause.

---

# Asmine — ce qui ne change pas

## Ce qu'est Asmine

Plateforme de mise en relation entre des clients et des chauffeurs
indépendants, à Paris et en Île-de-France, exploitée par Barbaros sous la
marque **Elatransfer**. **Intermédiaire, pas transporteur** : le transport est
exécuté par le chauffeur, sous sa carte professionnelle, sa licence et son
assurance. Le **bon de réservation** ne porte que l'identité d'Elatransfer ; la
**facture** du transport porte le SIRET du chauffeur.

**Barbaros ne conduit pas, il place** (« Je place seulement ») : Elatransfer
est une **centrale de réservation** (Code des transports L3142-1). Il a un
groupe WhatsApp de plus de 800 chauffeurs. Ne plus lui redemander.

## Règles à ne jamais enfreindre

1. **Aucun faux avis**, et pas de tri des avis (L132-2 Code conso. : 2 ans,
   300 000 €, jusqu'à 10 % du CA).
2. **L'annonce diffusée au groupe** ne porte jamais nom, téléphone ni chambre du
   client (RGPD 5.1.c) : ils partent en privé, au seul chauffeur retenu.
3. **Le dépôt est public.** Jamais de données clients réelles ; le classeur
   `suivi-as-mine.xlsx` n'est committé que vide.
4. **Un VTC n'a pas de taximètre** : le prix est connu ou calculable **avant**
   le départ.
5. **Centrale de réservation** : pouvoir prouver, pour chaque chauffeur, carte
   professionnelle, inscription au registre VTC et assurance.
6. **Les photos** : jamais une image sans savoir d'où elle vient (L335-2 CPI).
   Sources propres : Unsplash, Pexels, Pixabay (une vraie photo fait ≥ 1000 px
   et > 200 Ko). Pièges vus : filigrane Shutterstock, plafond de Chagall,
   château Disney, **tour Eiffel illuminée** (œuvre protégée ; la photo
   d'accueil la montre parce que Barbaros l'a acceptée en connaissance de
   cause). Ni photo ni logo d'un partenaire sans son accord écrit.

## Conseils déjà donnés — les tenir pour acquis

- **Deux cercles** : un noyau de 5 à 10 chauffeurs vérifiés d'abord, le grand
  groupe en réservoir.
- **easyHotel n'est PAS partenaire officiel** : autorisation d'exploiter
  (12/10/2026), aucun accord écrit, et il refuse d'être cité (24/10). Ne pas
  annoncer de partenariat ; lui redemander, chiffres en main.
- **Jamais une marque de voiture promise** : « berline », au plus « type … ou
  similaire ».
- **Jamais d'illustration, d'emoji ni de pictogramme de voiture** : refusé cinq
  fois.

## Ce qui est décidé, ce qui ne l'est pas

- **La commission se règle par chauffeur et par canal**, plus de taux global.
- **Programme Partenaire** : annoncé au conditionnel, sans montant, jamais
  « commission » ni « gagnez » ; la grille se remet en rendez-vous.
  `memoire/programme-partenaire.md`.
- **Pas décidé** : statut juridique, **SIRET — à créer, c'est le point
  bloquant** —, volume visé, budget.
- **Ce qui bloque et ne se code pas** : SIRET, RC Pro de la centrale,
  déclaration d'activité (L3142-2), papiers des chauffeurs versés au carnet,
  médiateur de la consommation, informations de l'éditeur dans les mentions.
- L'ancien site (août–septembre 2026) : `memoire/ancien-site.md`. Les règles
  générales telles qu'écrites avant le rangement : `memoire/regles-generales.md`.

---

# LE SITE — `index.html`

**LA BASCULE EST FAITE** (6 septembre 2026) : `nouveau.html` est devenu
`index.html`, c'est lui que voient les clients. **Il n'y a pas de page de
secours, et c'est voulu** : une ancienne page encore servie annoncerait une
grille périmée, et le prix est opposable. Le retour en arrière passe par
`git revert`. **Il ne garde rien de l'ancien** (sa consigne, deux fois) : ne
recopier aucune règle de l'ancien site sans qu'il la redemande.

## La grille

| Gamme | Au kilomètre | Minimum |
|---|---|---|
| Berline (4 places) | 2,90 € | 35 € |
| Van (7 places) | 4,70 € | 50 € |

- **Le serveur est la vérité** : `chargerTarifsServeur()` lit `tarif_public`,
  `forfaits_partenaires_publics` et `prix_pages_publics` ; `GAMMES` et `HOTELS`
  écrits dans la page ne sont que le **repli**. Barbaros règle tout dans
  Réglages → « Tarifs ». « Voir mon prix » attend la lecture (`tarifsLus`,
  4 s au plus). `test-doc.mjs` compare ce tableau à `GAMMES`, et `GAMMES` à la
  source serveur : un écart empêche la publication.
- **LE REPLI DOIT SUIVRE LA PRODUCTION, et aucun contrôle ne lit la
  production.** Si la lecture du serveur échoue, Réglages → Tarifs se remplit
  depuis `GAMMES`, et « Enregistrer » réécrirait l'ancien prix, en silence.
  Quand Barbaros change un prix dans l'admin, ce tableau, `GAMMES` et la source
  serveur du dépôt (une migration conditionnelle) suivent.
- **Le minimum berline est 35 €** (sa décision, 4/10) : tout trajet de
  12,06 km ou moins coûte 35 €. Ne pas le « corriger ».
- **L'arrondi est le sien** : à la dizaine, et **le 5 pile DESCEND** (`>`,
  jamais `>=` ; 45 → 40). Par division entière, jamais par modulo.
- **L'ordre est fixé** : kilométrage → arrondi → plancher (il a le dernier
  mot) → options à prix fixe (la pancarte) en tout dernier.
- **IL N'Y A PLUS DE MAJORATION**, de nuit, de week-end ni de jour férié,
  nulle part — ni au kilomètre, ni sur un forfait. Ne pas en réintroduire la
  moitié. Le champ `majoration` des courses enregistrées reste, toujours faux :
  l'historique en dépend.
- TVA 10 % incluse. Le prix est **annoncé avant** et devient **ferme à la
  confirmation**, donc opposable.
- **TOUCHER AU PRIX VEUT DIRE TOUCHER AUX CGV**, dans les deux langues, **sans
  jamais y écrire un chiffre** (elles décrivent la mécanique ; c'est ce qui a
  empêché les erreurs de grille de devenir contractuelles), et leur date de
  mise à jour change avec elles.
- **Un tarif au km par page dédiée** (`prix_pages`, 14/10/2026) : par page
  d'`ORIGINES`, un tarif au km ou un % du tarif du site, rien par défaut,
  jamais sur le minimum, un forfait ni la pancarte ; centimes en entiers (`tarifKmMajore`) ; prix affiché = prix
  facturé (`prixGamme`). `test-prix-pages.mjs`.
- L'étiquette de « Nouvelle course » est fabriquée depuis `GAMMES`
  (`ecrireGrille()`), jamais écrite en dur.
- `deposer-course` ne contrôle le km que par le bas : minimum = ligne droite ×
  tarif serveur ; en dessous, il **signale** (`prixSousLigneDroite`, « Prix à
  vérifier » sur le bon), il ne refuse jamais.

Histoire : `memoire/grille-et-majoration.md`, `memoire/tarif-admin.md`.

## Le prix à toutes les distances, et les péages

- **La grille vaut pour toute la France** (19/10/2026, « B2 »). **Tarif à
  confirmer, sans aucun montant** : l'étranger (`lieuEtranger()`), plus de
  7 passagers, une adresse tapée sans être reconnue. L'admin refuse
  « Confirmer » tant que le prix n'est pas fixé (« Modifier la course »).
- **Péages non compris** (CGV art. 4) : `mentionPeages()` rend « oui » (ORS
  les signale), « possible » (calcul muet et plus de 90 km autour de Paris) ou
  rien — jamais sur un forfait (il les comprend) ni sur une demande sans prix.
  Barbaros ajoute le péage au prix avant le paiement (`#bbPeages`).
- `deposer-course` force le prix à 0 sur une demande à confirmer et exige un
  prix positif sinon.

Histoire : `memoire/prix-toutes-distances.md`.

## Le tunnel du client

- **Deux gammes**, `berline` et `van` : ces clés ne changent jamais (elles sont
  dans l'historique). **Deux langues**, écrites à la main, jamais de
  traduction automatique sur un site où le prix engage ; `data-t` et
  `data-t-aria` se traduisent tous les deux. L'espagnol et l'arabe seraient les
  suivantes (l'arabe retourne toute la page).
- **LES CRÉNEAUX VONT DE 5 EN 5 MINUTES** : `step="300"` sur le champ et
  `PAS_MINUTES` dans le script, comparés par un test. Le formulaire s'ouvre sur
  le prochain créneau (`prochainCreneau()`) ; une heure non touchée se
  recalcule (`rafraichirHeureProposee()`) ; **une heure choisie et passée n'est
  jamais envoyée, elle est dite** (`#heurePassee`, sortie « Partir dès que
  possible », `course.immediat`). « Passée » se juge sur l'heure affichée.
  **Aucun juge n'en rappelle un autre** (ça a bouclé). Plus de préavis
  minimum depuis le 4/10. `memoire/preavis.md`.
- **LA DATE DU JOUR SE COMPOSE EN LOCAL** (`dateLocale()`), jamais avec
  `toISOString` : entre minuit et 2 h, l'UTC rend la veille. La borne se
  rafraîchit au focus et au retour sur l'onglet.
- **LA PANCARTE EST UNE OPTION À 10 €** (`OPTION_PANCARTE_EUR`), proposée
  seulement en aéroport ou en gare, **jamais cochée d'avance** (L224-76),
  ajoutée après l'arrondi et le plancher, reprise si le départ n'y a plus
  droit. Deux commandes pour un seul état (classes `.opt-*`,
  `jugerPancarte()` appelée depuis `dessinerGammes()`).
- **Un seul champ pour le vol ou le train**, dont le libellé change ;
  `estGare()` lit le type du lieu (`railway=station`), jamais le mot « gare »
  dans l'adresse. La course porte `train`.
- **La durée annoncée est une fourchette, +5 à +10 min** (`MARGE_DUREE_MIN`,
  `dureeAnnoncee()`) : posée à l'affichage, `course.min` reste brut, le prix ne
  bouge pas.
- **La ligne sous le bouton dit « Prix annoncé à l'avance · Réglé au
  chauffeur »** : jamais « prix ferme » pour vendre, ni annulation gratuite,
  ni « WhatsApp ou SMS ». « Ferme » reste au contrat (bon confirmé, CGV).
- **Trois lignes numérotées au-dessus de « Confirmer »** disent ce qui va se
  passer : une phrase sous un bouton se lit trop tard.
- **AUCUNE APPLICATION NE S'OUVRE AU CLIC** (4/10, option A) : le client dit où
  recevoir sa confirmation ; repli « Renvoyer par WhatsApp » sur le bon. **Si
  l'alerte Telegram tombe, rouvrir cette décision.** `memoire/contact-client.md`.
- **LE DÉPÔT PART EN PREMIER**, avec `keepalive:true`, et rien n'est attendu
  avant un `window.open` (Safari bloque une fenêtre ouverte après une
  attente). `reprendreDepot()` ne crie jamais à l'échec depuis l'arrière-plan :
  il réessaie **une fois** au retour sur l'onglet.
- **`telValide` et `telWa` restent HORS du bloc exploitant** (le cloisonnement
  les avait emportés et plus aucun client ne pouvait envoyer) ; leur contrôle
  vit dans `telephone.js`, chargé par tous les espaces **avant**
  `intake-demande.js`. Toute fonction appelée par une page publique doit y être
  définie (`test-easyhotel-client.mjs`).
- **« Qui sommes-nous », « Inclus » et les questions** n'annoncent que des
  faits tenus par les CGV : en changer un, c'est relire le contrat. Jamais
  « VTC » ; pas de second « Voir mon prix ».

Histoire : `memoire/tunnel-client.md`, `memoire/formulaire-public.md`.

## La recherche d'adresse et « Me localiser »

- **BAN + Photon, et on les fait évoluer, on ne les remplace pas.** Les deux
  sont biaisés vers Paris ; le classement (`note()`, `bonusDistance()` :
  ≤ 90 km +3, ≤ 200 +1, ≤ 400 0, au-delà −2) **rapproche, n'exclut jamais**.
  L'étranger apparaît, pays écrit, et se juge au **choix**, pas à la recherche.
  « œ » se ramène à « oe » ; un monument ou une rue nommés passent devant un
  bar qui porte leur nom.
- **Mapbox Search Box n'est PAS branché, c'est une décision** : résultats
  « temporaires », carte Mapbox imposée, carte bancaire. Conditions lues dans
  des citations : les relire avant de rouvrir.
- **Une panne n'est jamais mise en cache** comme « aucune adresse » ; la liste
  dit « Recherche momentanément indisponible ».
- **`brancher()` rend une prise `poser(item)`** : toute écriture venue de
  l'extérieur passe par elle, sinon on part avec les coordonnées d'un lieu et
  le nom d'un autre. L'admin choisit ses lieux par le même `brancher()`.
- **Le lieu structuré** (`departLieu`, `arriveeLieu`, `lieuStructure()`) vient
  d'un élément **choisi** ; « Modifier la course » efface celui d'une adresse
  retapée.
- **« Me localiser » rend une ADRESSE, pas une position** : au départ
  seulement (il remplace le chevron), relue par la BAN (`/reverse/`), avec les
  coordonnées **de l'adresse** ; trois messages distincts (refus, pas
  d'adresse, panne) ; on invite à vérifier ; **rien n'est conservé** (la
  politique de confidentialité le dit). 44 px, aucun `position:relative`.

Histoire : `memoire/recherche-adresse.md`.

## L'itinéraire et la carte

- **La distance décide seule du prix.** `itineraire()`
  (`itineraire-partage.js`) enchaîne Mapbox (si `CLE_MAPBOX`, vide) → **ORS**
  (`CLE_ORS`, en clair, c'est assumé) → OSRM → vol d'oiseau × 1,3 (« ≈ » sur
  la mesure et le prix). Un niveau en panne ne fait jamais sauter les
  suivants ; une réponse sans distance est une erreur ; ORS et OSRM prennent
  **lon,lat** ; 4 s par appel ; hors cache dans `sw.js`.
- **LA ROUTE FACTURÉE EST LA PLUS COURTE RAISONNABLE** (« comme Waze ») :
  `choisirRoute()` garde la plus courte qui ne rallonge pas de plus de 10 min.
  Jamais le profil « shortest ».
- **Mapbox** (le jour où il y revient) : profil `driving-traffic`, `depart_at`
  seulement dans les 7 jours, « trafic pris en compte » écrit seulement si
  Mapbox a répondu. **Il l'a repoussé (carte bancaire) : ne pas le relancer.**
  TomTom ferait pareil sans carte. Waze n'a pas d'API publique ; Google impose
  sa carte et la facturation. `MAPBOX.md`.
- **La carte (Leaflet) est la seule dépendance extérieure**, servie depuis
  `carte/` (licence BSD jointe), **jamais d'un CDN**. Elle ne peut jamais
  empêcher de réserver (cadre masqué si elle manque, minuterie de 15 s).
  **lat,lon chez Leaflet** ; tracée **après** `ecran()` ; non manipulable ;
  `detectRetina` ; le drapeau du préfixe est retiré, « © OpenStreetMap »
  reste (ODbL) ; préchargée au clic sur « Voir mon prix »
  (`prechargerCarte()`), jamais à l'accueil. Les tuiles OSM sont le point
  faible connu. Pas de carte de trafic au tableau de bord (écartée).
- Toute suite qui simule OSRM coupe ORS, sinon elle interroge le vrai service.

Histoire : `memoire/itineraire.md`.

## La demande, la confirmation et le bon du client

- **Le message WhatsApp fait neuf lignes, et sa STRUCTURE est lue** par
  `lireDemandeCollee()` : référence en tête, date JJ/MM/AAAA HH:MM, les deux
  premières valeurs « … : … » sont les adresses, le **dernier montant est le
  prix** (d'où « Paiement » et la pancarte AVANT « Prix »), la dernière ligne
  est « nom — téléphone ». **Changer le message oblige à changer le lecteur.**
- **La référence `ELA-AA-MM-XXXXX` est tirée au sort** (`referenceSuivante()`),
  jamais `ASM`, jamais un compteur local. **Le N° court** vient de la base
  (`20261006000000_numero_court.sql`), recopié dans `bon.numero`, en tête de
  toute alerte ; ne jamais nommer sa colonne ni passer à `select=*`. **Un 409
  au dépôt n'est pas une demande perdue** : on rejoue deux fois puis on tire
  une autre référence (`deposerDemande`, `autreCourse` côté admin).
  `memoire/reference.md`.
- **Un seul bon, identique partout** (modèle B, 24/09) : le vrai logo, la
  pastille d'état, **jamais la couleur d'un partenaire** ; attente = pastille
  grise, confirmé = verte pleine ; « Prix annoncé » en attente, « Prix ferme »
  confirmé. Réception et admin le dessinent avec `bon-client.js`, jamais un
  second dessin.
- **C'est le lien `?ok=` qui porte la réponse au client** (la lecture anonyme
  est interdite et doit le rester) : référence, prénom et numéro du chauffeur,
  véhicule, heure — **jamais le nom ni le numéro du client, jamais les
  adresses**. Base64url ; paramètre effacé après lecture ; sur un appareil qui
  ne connaît pas la course, trajet et prix sont masqués (un bon à 0 € est
  faux).
- **`etat-course` est la seule porte de lecture** : clé = référence +
  téléphone ; elle ne rend que ce que porte `?ok=`, le chauffeur seulement sur
  une course confirmée ou réalisée. **Un appel qui échoue ne fait jamais
  reculer un état** (`nuage.etat()` rend `null`). On n'interroge que ce qui
  peut encore changer.
- **LE CLIENT PAIE SON CHAUFFEUR PAR LIEN, AVANT LE DÉPART** (10–11/10) : plus
  aucun règlement à bord, comptoir compris ; aucun délai ni écriteau
  « paiement attendu ». Annulation du client après paiement non remboursée ;
  course ratée de notre fait remboursée (CGV art. 5, 7 et 8). Les anciens
  boutons sont retirés de la page, pas masqués. `memoire/paiement-lien.md`.
- **Les couleurs d'état** : attente neutre, **confirmé = la seule pastille
  colorée**, terminé et non prise en gris. Une couleur se nomme par son rôle,
  jamais par sa teinte.
- **La barre du bas a quatre onglets** — Accueil · Réservations · Trajets ·
  WhatsApp — en `flex` (jamais un compte écrit en dur). Réservations = attente
  et confirmée ; trajets = réalisée et refusée. Chaque onglet qui ouvre un
  écran en ouvre un différent ; les écrans du tunnel se rattachent à
  « accueil ». Pas d'onglet « Réserver ». **La bulle WhatsApp flottante est
  retirée : ne pas la remettre.** Aucun élément fixe ne recouvre un bouton, et
  cela se **mesure** (`elementFromPoint`, à l'arrêt). Sur ordinateur, pas de
  barre du tout.
- **L'onglet WhatsApp ouvre un choix** (`#btnWa`), jamais un message
  pré-rempli : « Réserver un trajet » ramène au formulaire, « Nous appeler »
  ouvre `tel:`, la référence de la course en cours entre dans le message
  (`derniereReference()`).
- **La notification au client complète WhatsApp, elle ne le remplace pas** :
  WhatsApp est annoncé d'abord et comme certain. L'autorisation ne se demande
  qu'au clic (un refus est définitif) ; le bloc n'apparaît que si la demande
  est arrivée sur le serveur ; bloc et bouton se jugent séparément ;
  l'abonnement va dans sa propre table (`abonnements`, anon y dépose et rien
  de plus) ; la notification ne porte ni nom, ni téléphone, ni adresse, ni
  chambre ; elle ne peut jamais faire échouer une confirmation ; le clic
  ramène sur le bon. Sur iPhone, il faut le site installé : le bouton le dit.
  **Tout push reçu affiche quelque chose** (`userVisibleOnly`) : traité en
  silence, le navigateur révoque l'abonnement sans prévenir — d'où le titre
  par défaut de `sw.js`.
- **Le chiffrement push est éprouvé par un tiers** : `test-push.mjs` fait
  déchiffrer par `http_ece` et vérifier la signature par `node:crypto`. Ne pas
  le remplacer par un contrôle maison.

Histoire : `memoire/confirmation-client.md`.

## Les documents légaux et les avis

- **CGV, mentions légales, confidentialité**, FR et EN, sans compte, depuis le
  pied de l'accueil (LCEN) ; corps en `textContent`. **Aucun trou** : raison
  sociale, SIRET, siège, directeur de la publication et médiateur (L616-1)
  s'ajoutent le jour où il les donne. Les mentions disent d'où vient la note
  Google (L111-7-2). Un document légal qui change change aussi de date.
  `memoire/documents-legaux.md`.
- **Jamais un avis inventé, et on demande à TOUS** (trier est interdit).
  « Demander un avis » : course réalisée, langue du client, lien
  `ela_lien_avis` réglé sur l'appareil (sans lien, rien ne part).
- **La note Google ne s'écrit que dans `avis-google.json`** ;
  `.github/scripts/avis-google.mjs` la pose à la construction et l'éteint si
  `afficher` est faux ou le relevé a plus de 60 jours ; jamais arrondie vers le
  haut. `memoire/avis.md`.

## Les hôtels partenaires

- **Même fichier, même tunnel, seule l'ENTRÉE change** : `?h=<clé>` est le
  flyer (les clients), `?reception=<clé>` le comptoir. Un hôtel non partenaire
  garde l'ancien comportement (son nom va dans le départ). Pages construites :
  `/easyhotel-client/`, `/reception/<clé>/`.
- **Le forfait du flyer remplace le kilométrage**, un seul `forfait` par gamme
  et par destination. **Trois endroits, un seul prix** : `HOTELS`, la source
  serveur, les cartes de la page du QR — `verifier-tarif-hotel.mjs` exige
  l'accord. Les prix se règlent hôtel par hôtel (Réglages → « Prix du flyer,
  par hôtel ») ; seuls les prix modifiés partent, un montant vide est refusé.
  Le serveur remplace le prix envoyé par le client (`deposer-course`).
- **Ne jamais « aligner » un forfait sur le kilométrage** : le van moins cher
  que le site sur les longues courses est un prix d'appel voulu.
- **Le prix du flyer suit le LIEU, pas le menu** (`destDuPoint()`) : une
  adresse tapée qui tombe dans une destination du flyer prend son forfait, et
  l'écran la nomme ; on mesure une distance (`RAYON_AEROPORT_KM` autour d'un
  terminal, `rayonKm` par destination), jamais un mot ni un code postal. Hors
  zone : kilométrage, et on le dit. La destination reconnue part sur la course
  (`destHotelRetenue()`).
- **« Autre destination » passe `?dest=autre`**, que `hotel-engine-polish.js`
  traduit en l'option VIDE du moteur : sans cette traduction, le moteur
  ouvrait sur CDG au forfait (un Versailles à 35 €). Le bloc « Destinations
  populaires » du moteur est retiré : ne pas le remettre.
- **Sur la page client d'un hôtel, nom et téléphone se contrôlent à « Voir mon
  prix »**, avant de quitter la page des champs (l'erreur de « Confirmer »
  s'affichait sur une page cachée). Les pages d'hôtel suivent la langue du
  navigateur, l'anglais en repli.
- **Sujets clos** : le numéro du flyer est le bon (une erreur de lecture
  d'image) ; Le Bourget en berline à 35 €, confirmé par lui.
- Le forfait vaut dans les deux sens (échange réel des champs) ; la chambre ne
  s'ouvre que sur un hôtel au départ ; les terminaux viennent de `AEROPORTS` ;
  les coordonnées de l'hôtel viennent de la BAN, `HOTELS` n'est qu'un secours.
- **La grille ne sort pas dans Google** : `robots.txt` écarte `?h=`, et la page
  **réécrit** sa balise `robots` (une seule).
- **La finition est commune à tous les partenaires** :
  `hotel-engine-polish.js` ne nomme aucun hôtel (`verifier-demo.mjs`,
  `test-finition-commune.mjs`) ; nom, adresse, photo et couleurs viennent de la
  fiche (`window.ELA_HOTEL_ACTIF`, événement `ela:hotel`). La page construite
  porte ses classes dès `<body>` (le premier dessin est le bon). **Un
  observateur n'écrit que si le texte diffère** : réécrire un texte identique
  est une mutation, qui a figé le moteur en ligne.
- **Les couleurs d'un partenaire vivent sur sa fiche** (`HOTELS[x].marque`) ;
  texte noir sur l'orange ; l'orange ne descend pas dans la liste ;
  « confirmée » reste verte. Photos seulement `/photos/…`, jamais une adresse
  `http`. **Son co-marquage aussi** (`coMarquage`), jamais sans accord écrit.
- **Vert = rempli, rouge = il manque** (`eh-ok`, `eh-manque`) ; rien de
  pré-rempli n'est vert d'office ; une mention écrite accompagne toujours la
  couleur.
- **Aucun identifiant en double dans la page** : un contrôle les cherche tous.
- Chaque entrée a son manifeste et son icône (portée `/`).

Histoire : `memoire/mode-hotel.md`, `memoire/page-hotel-analyse.md`,
`memoire/finition-commune.md`, `memoire/theme-partenaire.md`.

## La réception (le comptoir)

- **Le code vit dans les secrets Supabase** (`HOTEL_<CLE>_CODE`), jamais dans
  la page. `courses-hotel` est la seule porte : lecture seule, liste blanche,
  filtre sur `provenanceCle` (jamais le libellé), partenaire `actif = false`
  refusé, 60 essais par heure et par IP comptés avant la comparaison.
  `RECEPTION-HOTEL.md`, `memoire/reception-acces.md`.
- **La réception n'annule rien et ne supprime rien : elle appelle.**
- **Elle ne voit jamais** la commission, le montant du chauffeur, Stripe, le
  carnet ni un autre partenaire (le test injecte ces valeurs et cherche les
  VALEURS sur tout l'écran).
- **Elle valide sur le site** : la course entre en `attente`, comme celle d'un
  client (`parReception`, `provenanceCle`) ; WhatsApp ne s'ouvre pas ; aucun
  bouton WhatsApp de secours (si le dépôt échoue, l'écriteau dit d'APPELER) ;
  « Être prévenu » ne s'affiche pas au comptoir. Nom et téléphone exigés (le
  lien de paiement part dessus), chambre facultative.
- **Le bon s'affiche, rien ne part.** Nom et téléphone du client en tête ;
  « Une question ? » avec le numéro en clair et Telegram `@elatransfer` ; sur un
  ordinateur à la souris, aucun bouton WhatsApp ni bouton sur le bon.
- **Une course de l'admin qui part de l'hôtel ou y arrive est à lui** :
  lieu choisi à 250 m du point BAN → `provenanceCle` (`#crHotel`), ou à la
  main sur le bon (`#bbHotel`) ; canal gardé. `test-admin-hotel-depart.mjs`.
- **Quotas de dépôt** : anonyme 12/h par IP ; client d'un partenaire réel
  30/h ; réception à session vérifiée 60/h.

Histoire : `memoire/reception.md`.

## L'affiche QR des hôtels

- **L'encodeur QR est écrit dans la page** (mode octet, correction M, versions
  1 à 6, SVG avec `xmlns`, jamais un canvas ni un service tiers).
- **Un encodeur ne se vérifie pas tout seul** : `test-nouveau-affiche.mjs` rend
  le SVG final en image et le fait décoder par une bibliothèque indépendante.
- À l'impression, **seule l'affiche sort** (`visibility`, jamais `display`).
- Le nom de l'hôtel voyage en clair (`?h=`) ; on ne choisit pas l'adresse à la
  place du client ; **la provenance reste sur la course** (`bon.provenance`,
  `sessionStorage`) même s'il change son départ.

Histoire : `memoire/affiche-qr.md`.

## L'espace exploitant (l'admin)

- **Un seul admin : `/ela-admin/`**, publié à part par `construire.sh` (les
  pages publiques n'en portent plus rien). `/exploitant/` et `admin.html` y
  mènent ; ne jamais dupliquer `index.html`. **Admin v2 n'est plus publié**
  (3/10) : `ELA_AVEC_ADMIN_V2=1` est réservé aux suites qui l'éprouvent.
  `memoire/admin-v2.md`.
- **Connexion : e-mail, mot de passe, code à 6 chiffres** (24/10). Un compte
  qui a un code n'est exploitant qu'en session `aal2`, jugé à chaque requête
  dans `est_exploitant()`/`est_admin()` ; le cliquet `securite_admin` l'exige
  de tous. Téléphone perdu : `SECURITE-ADMIN-MFA.md`. Piège : « Auto Confirm
  User ». **NE JAMAIS CONSEILLER DE SUPPRIMER ET RECRÉER LE COMPTE**
  (`operateurs` le désigne par son `user_id`), ni « Reset password ».
- **`body.espace`, jamais `body.exploitant`**, pour tout ce qui est admin.
  Colonne au-delà de 900 px, tuiles sur téléphone, même HTML. Seul le logo est
  en blanc ; les couleurs restent.
- **Un bouton de l'admin se branche toujours avec une garde (`if(el)`)** : les
  pages publiques retirent ces écrans, et un `getElementById` nul arrêtait tout
  le site client.
- **L'écran d'abord, le dessin ensuite** : un cadre masqué mesure zéro (courbe
  plate, carte grise). Troisième fois que ce projet y tombe.
- **Son propre manifeste** (`manifest-exploitant.webmanifest`,
  `start_url: "/ela-admin/"`), déclaré aussi sur les pages de redirection. Une
  icône posée avant le 8/09/2026 rouvre le site client : la refaire.
- **Le tableau de bord sert à traiter et à créer** : état du serveur, « Coller
  une demande » / « Saisir par téléphone », trois filtres, la liste groupée
  par jour (« en retard » est un avertissement rouge, sauf sur les
  réalisées). Les chiffres, courbes et provenances sont au **Registre**.
  **Les infos des chauffeurs ont quitté le tableau de bord** (sa demande) :
  « Papiers à surveiller » vit en tête de l'écran Chauffeurs, et n'apparaît que
  si quelque chose cloche.
- **Coller une demande** : la course entre `attente`. **Saisir par
  téléphone** : elle entre `confirmee`, le prix se calcule **par le même chemin
  que le client** (égalité au centime testée), les adresses retenues sont
  réécrites dans les champs, le prix reste modifiable, le chauffeur est
  facultatif, et le bon s'ouvre juste après.
- **Sur le bon, un seul geste principal : l'étape suivante.** « Confirmer »
  exige un chauffeur et un prix fixé. **Les papiers périmés AVERTISSENT, ils ne
  bloquent plus** (4/10, sa décision — ne pas remettre le refus). Le seuil de
  dette, facultatif, bloque. « Refuser » demande deux appuis. Les boutons du bon
  sont dans le flux (collants seulement sur l'écran des prix) ; tous les
  `.champ` sont `position:relative`.
- **Confirmer et prévenir restent deux gestes.** « Prévenir le client »
  n'apparaît que sur une course confirmée, avec un numéro et un chauffeur ; son
  message fait six lignes, sans trajet ni prix. « Accuser réception » n'existe
  qu'en attente : ni chauffeur ni véhicule, dans la langue du client.
- **« Terminée » avant l'heure demande deux appuis** (`cloreArme`, gardé hors
  du bouton) ; 700 ms de garde après une fermeture (un double appui fermait
  deux courses) ; « Remettre en confirmée » en deux appuis, jamais sur une
  course facturée ; « Sans chauffeur » est une pastille ambre à côté de la
  référence, jamais dedans.
- Recherche, « Sélectionner » visible, menu en deux rangées, « Équipe »
  seulement avec un compte agent ; une **course d'essai** (`bon.essai`) ne
  compte jamais dans l'argent. `memoire/admin-ergonomie.md`.
- **Seul Barbaros supprime une course**, quel que soit son état
  (`est_admin()`).
- **Le rôle agent est borné par le serveur**, et **l'accès agent est
  suspendu** (`actif = false`, 20/10) : l'écran de connexion dit la vraie
  raison, jamais une histoire d'argent. `memoire/role-agent.md`.

Histoire : `memoire/espace-exploitant.md`, `memoire/pilotage.md`.

## Le serveur est la seule vérité de l'admin

- **L'admin n'est qu'une copie.** `version` et `modifie_le` sur `courses` ;
  `reconcilier()` laisse le serveur remplacer la copie quand il est plus
  récent ; les gestes partent par une file (`ela_file`, `viderFile()`, reprise,
  `keepalive`, compteur `gen`), **sous condition de version** : en cas de
  conflit, le serveur gagne et l'écran le dit. Une colonne absente est une
  panne affichée, jamais un écrasement.
- **La sonde demande toutes les 8 s la course modifiée le plus récemment** ;
  relecture complète à 45 s ; seulement avec une session, l'espace ouvert et
  l'onglet visible (`ecouteUtile()`). Le jeton vit une heure : renouvelé une
  fois sur 401. **Jamais une pastille verte sur un serveur muet.**
- **Sans réseau** : `verifierExploitant()` distingue oui, non et panne ; sur
  panne, lecture locale seulement si ce compte a déjà été reconnu sur cet
  appareil (`ela_acces_verifie`, jamais un secret). La pastille dit « Pas de
  réseau » ou « Serveur injoignable » (`jugerReception`).
- « Retour » n'écrit que ce qui a changé ; tout chauffeur saisi passe par
  `refusAttribution` ; un numéro du carnet donne le nom (`completerChauffeur`).
- **Ne vivent QUE sur l'appareil** : le carnet, les paiements des chauffeurs,
  les factures et leur numérotation, l'identité de l'émetteur, le lien d'avis.
  D'où le rappel de sauvegarde (`#bordSauvegarde`, 7 jours). La sauvegarde
  (`{format:"elatransfer-1"}`) se restaure en AJOUTANT, garde le plus grand
  rang de facture, et lit encore l'ancien format.

Histoire : `memoire/synchronisation-admin.md`.

## Registre, chauffeurs, factures et commission

- **Le registre** : chiffres, recherche paginée et liens partenaires viennent
  du serveur (`#regSource` dit quand l'appareil sert de repli). **Ne comptent
  que les `realisee`**, à la date de la course. CSV en point-virgule avec BOM.
  Délai de confirmation : médiane, dépôts du site seulement. `memoire/registre.md`.
- **Le carnet** (L3142-1) surveille les **dates** des trois papiers, pas leurs
  numéros ; **un papier absent vaut un papier périmé** ; le pire des trois
  décide (`etatChauffeur`) ; alerte **30 jours d'avance** (`JOURS_ALERTE`),
  compté à minuit. L'avertissement est sur le bon, à l'instant où l'on attribue
  (`jugerChauffeurBon`). Le chauffeur se retrouve par son numéro d'abord. Son
  `id` ne change jamais.
- **La facture de commission** : **pas de SIRET, pas de facture** (L441-9) ; le
  rang `F-AAAA-NNNN` est consommé à l'émission et ne recule jamais ; une course
  n'est facturée qu'une fois (`factureNum`), seulement réalisée ; la facture
  est **figée** à l'émission ; TVA éteinte par défaut (art. 293 B du CGI),
  et à 20 % si elle s'allume (l'intermédiation n'est pas du transport) ;
  mentions L441-10 et D441-5 ; à l'impression, seule la facture sort.
- **La commission** : `commissionDe(course)` est le seul calcul — montant posé
  sur la course, sinon taux du chauffeur (% ou €), sinon taux du canal, sinon
  rien. Quatre canaux (`canalDe` : réception, flyer, téléphone, site public ;
  une demande collée reste « site public »), taux par canal sur le serveur. Un
  champ de taux vide n'est pas zéro. **Elle se fige au passage en
  « réalisée ».** Une réalisée sans règle est signalée.
- **Ce que les chauffeurs doivent** (`soldesChauffeurs`) : le retard se compte
  course par course au-delà de 30 jours ; l'alerte est sur le bon (`#bbDette`) ;
  « Paiement reçu » et « Relancer par WhatsApp ». Le centre de contrôle
  (`#ecran-controle`) est caché à l'agent.

Histoire : `memoire/chauffeurs-et-commission.md`.

## Les alertes à Barbaros

- **`nouvelle-demande` annonce chaque demande** (Telegram et notification ELA),
  sur un webhook **INSERT seul**, détaché : **la notification ne peut jamais
  faire échouer une réservation** — ne jamais inverser. Elle relit la course
  sur le serveur (existante, récente, jamais annoncée) ; le message ne porte ni
  nom, ni téléphone, ni chambre (`departPublic`) ; le titre (trajet et heure)
  tient sous 90 caractères ; **aucun `parse_mode`** chez Telegram ; rien de
  configuré rend une **erreur**, jamais un 200. Les saisies de l'exploitant ne
  sont ni annoncées ni relancées (sa demande). **Pas de serveur loué** : les
  fonctions Supabase suffisent, ne pas y revenir sans un besoin qu'elles ne
  couvrent pas.
- **`a-coller.ts` est fabriqué par `assembler.mjs`**, jamais écrit à la main :
  c'est le déploiement de secours au téléphone. Le déploiement normal passe par
  `fonctions.yml`.
- **La relance tourne toutes les 20 s** (pg_cron, en-tête `x-ela-relance`) :
  la **notification ELA est l'alarme**, **Telegram informe**, chaque rappel
  Telegram efface le précédent, un dernier message part à l'heure du départ,
  et tout s'arrête dès que la course est **vue** (bouton « ✅ Vu » ou course
  ouverte dans l'admin, `signalerVue()`), confirmée ou refusée. Les délais se
  comptent depuis l'annonce. Cadence exacte : `memoire/alertes-relance.md`.
- **Dans l'admin ouvert** : un seul lecteur de son, débloqué au premier appui
  (`#sonCoupe` le dit) ; l'alarme se répète jusqu'à un appui ; pastille sur
  l'icône. **Admin fermé**, seuls la notification, Telegram et la pastille
  chiffrée arrivent : une page fermée ne tourne pas, ne pas promettre
  l'inverse.
- **WhatsApp ne peut pas sonner tout seul** (l'API Business exige une
  vérification d'entreprise et un numéro dédié) : ne pas le promettre.
- **Le voyant des alertes** (« Alertes OK / en panne / non vérifiées ») : un
  seul juge, `admin-sante.js`, partagé avec le chien de garde ; une seule
  mesure, `ela_sante_alertes()`. **Gris quand on ne sait pas, jamais un ancien
  vert.** Une panne d'alerte ne perd aucune course : seule la sonnerie
  s'arrête. `memoire/voyant.md`.
- **Le chien de garde GitHub** (toutes les 15 min, Issue unique, jamais
  Telegram) est un filet, pas une horloge : GitHub le réveille mal.
- **Les erreurs JavaScript du site** sont comptées sous le voyant
  (`erreur-client`, masquées). `memoire/erreurs-client.md`.

Histoire : `memoire/alertes-notifications.md`.

## Le serveur Supabase et la sécurité

- **Le jeton vérifié à l'entrée d'une fonction ne prouve RIEN** : la clé
  publique du site le franchit. Toute fonction qui agit au nom de Barbaros
  vérifie elle-même `est_exploitant()` avec le jeton de l'appelant ;
  `est_admin()` pour l'argent, les prix et la suppression.
- **`prevenir-client`** exige un exploitant, borne le texte et n'accepte qu'un
  lien vers elatransfer.com ; `sw.js` refuse en plus d'ouvrir un lien étranger.
- **`anon` n'écrit plus dans `courses`** : seul `deposer-course` dépose (prix
  recroisé, quota, « déjà déposée ? » vérifié avant le quota).
- **Les secrets** vivent chez Supabase et dans l'environnement GitHub
  « production », jamais dans le dépôt, un test ou une conversation. `CLE_ORS`
  et la clé publique VAPID sont dans la page parce que le navigateur en a
  besoin. La clé publique des notifications vient du serveur
  (`cle-notifications`) ; ne jamais s'abonner avec `CLE_VAPID`. L'outil
  « Fabriquer les clés » reste caché tant que le serveur a une clé (une paire
  recollée couperait tous les abonnements). Écrire soi-même dans ses secrets a
  été refusé par la sécurité de l'environnement : ne pas retenter.
- **Le webhook INSERT sur `courses` porte la clé PUBLIQUE**, jamais un jeton
  `service_role` (le tableau de bord Supabase remplit l'en-tête tout seul, et
  c'est ainsi que le secret s'y était retrouvé ; corrigé par
  `20261003030000_webhook_cle_publique.sql`). Après toute réinstallation du
  webhook, rejouer cette migration : elle remplace l'en-tête, et ne fait rien
  s'il est déjà bon.
- **Seule `main` publie, déploie et migre** (garde dans chaque workflow, jeton
  dans l'environnement « production », **il expire le 1er octobre 2027 : le
  refaire avant**). Dans ces workflows, toute action qui n'est pas de GitHub
  est épinglée par son SHA, toute version est un numéro exact, rien en
  `latest` (`test-doc.mjs`).
- **Les migrations n'ont pas de registre** : avant de toucher un objet
  existant, lancer `20261003010000_inventaire_schema.sql`. **On supprime un nom
  lu dans `pg_policies`, jamais un nom lu dans une doc.** Une vue créée perd
  ses droits d'écriture. Une migration « à appliquer après la fusion » ne part
  pas toute seule (workflow « Appliquer une migration Supabase »).
- **Ne jamais rejouer `20260916100000_current_tariff_source.sql` ni
  `20260928120000_tarif_unifie.sql`** : ils écraseraient les prix réglés dans
  l'admin. **Ni `20261014000000`** (mesure) : elle recréerait l'ancienne
  `ela_mesurer` à deux paramètres, et les liens `?via=` ne seraient plus
  comptés. Toute migration de tarif est **conditionnelle**, sur le modèle de
  `20261004000000_minimum_berline_35.sql`.
- **Un SQL s'éprouve avant d'être poussé** : PostgreSQL 16 est installé ici
  (`/usr/lib/postgresql/16/bin`, sous l'utilisateur `postgres`, dans `/tmp`).
  Une épreuve repose l'état RÉEL, pas celui que décrit la doc.

Histoire : `memoire/securite-et-production.md`.

## Le visuel et la marque

**La palette** — le bleu ELA, plus aucun vert (4/10/2026). Les rôles gardent
leur nom ; **ne jamais renommer une variable d'après la teinte du jour**.

| Rôle | Valeur | Où |
|---|---|---|
| `--fond` | `#F2F5F9` | le papier — **jamais `#FFF`** |
| `--carte` | `#FFFFFF` | seulement les cartes posées dessus |
| `--noir` | `#16232B` | l'en-tête, le bandeau |
| `--encre` | `#151C22` | le texte |
| `--gris` | `#5A6A7B` | le texte secondaire |
| `--filet` | `#E1E8EF` | les bordures |
| `--accent` | `#0E6FC7` | boutons, sélection, onglet actif, tracé de la carte |
| `--accent-clair` | `#E8F2FD` | les fonds d'accent |
| `--accent-vif` | `#12C4EE` | la marque |
| `--accent-encre` | `#0A4F91` | l'accent en TEXTE sur `--accent-clair` |

Restent, parce que ce sont des états ou des marques : le rouge de l'attente
(`#C9302F`), le vert WhatsApp, le vert « confirmée », l'orange d'un
partenaire. `memoire/palette.md`.

- **Regarder le site publié avant de choisir une couleur** : la façade
  (`application-facade.css`) habille le site public, sous
  `html[data-ela-space="public"]`. Une seconde feuille qui habille le même
  écran finit toujours par le casser.
- **Le logo** est le fichier officiel (`brand-logo.webp`, et sa version
  négative `brand-logo-negatif.webp` sur fond bleu nuit) : jamais redessiné,
  jamais remplacé par une image générée, jamais recoloré sans demande. Les
  icônes se refont **ensemble** (un jeu à moitié changé est pire qu'un ancien
  cohérent) ; chaque espace a son manifeste et sa couleur d'icône ; iOS ignore
  un `apple-touch-icon` en SVG ; pas deux tirets de suite dans un commentaire
  XML. Refusés : le E seul, toute voiture, roue ou route.
  `memoire/icones-et-logo.md`.
- **Les photos de l'accueil** : rien ne se supprime dans `photos/` sans lui ;
  les vignettes publiées sont des copies allégées. La photo est « Paris la
  nuit », un recadrage par écran, un voile local. `memoire/photos-accueil.md`,
  `memoire/bandeau-photo.md`, `memoire/bandeau-accueil.md`.
- **Une marque, deux espaces** : l'accueil aux voyageurs, l'offre pro sur
  `/professionnels/`. Le titre dit le métier ; jamais « solution »,
  « mobilité », « plateforme », « conciergerie », « canal » ; « Prix annoncé à
  l'avance » pour vendre ; le chauffeur, « professionnel indépendant, sous sa
  propre carte professionnelle et son assurance », jamais « taxi » ni « VTC »,
  **sans contrôle de papiers promis** ; aucun client cité ; « Mise en place
  gratuite » tant qu'aucun hôtel ne paie ; ni « Elatransfer Pro » ni sélecteur
  sans compte pro. `test-public-textes.mjs`. `memoire/textes-publics.md`,
  `memoire/accueil-pro.md`, `memoire/ordre-accueil.md`.
- **Une centrale, un large réseau** (23/10) : « un large réseau » de
  chauffeurs, jamais un nombre ; ni nombre ni lieu d'un partenaire (« Déjà en
  service dans l'hôtellerie, en Île-de-France », à retirer s'il cesse) ;
  aucune disponibilité garantie ; suivi « jusqu'à la prise en charge » (CGV
  art. 2) ; `chiffres.json` éteint tant qu'un chiffre n'a pas sa source.
  `test-public-centrale.mjs`, `memoire/centrale-et-reseau.md`.
- **Les cinq services de l'accueil** : une carte mène au formulaire si et
  seulement si elle annonce une adresse ; ni emoji, ni pack.
  `memoire/services-accueil.md`.
- **Sur ordinateur** : au-delà de 900 px, un menu en haut et plus de barre du
  bas ; au-delà de 1100 px, le formulaire à gauche sous la promesse ; un seul
  bouton principal ; jamais un service qu'il ne fait pas. `test-public-ordinateur.mjs`,
  `memoire/ordinateur.md`.
- **Le formulaire public** : carte bleu nuit, « Voir mon prix » cyan texte
  bleu nuit, aucun bouton dans le bandeau, en-tête bleu nuit avec la version
  négative du logo. « Voir mon prix » reste entier au-dessus de la barre à
  390×844. **Toujours capturer à 844 px de haut.** `test-public-formulaire.mjs`.
- **La finition** : une échelle de titres, une recette de carte, un seul bouton
  plein par encart ; pas d'exception « pour ce bloc-là ».
  `test-public-finition.mjs`, `memoire/finition-visuelle.md`.
- **La marque et Google** : « Elatransfer » en un mot ; l'accueil s'ouvre en
  français ; l'anglais a son adresse `/en/`, le moteur reste unique ; hreflang
  réciproque entre vrais équivalents ; **jamais de lien, canonique ni `@id` en
  `.html`** ; toute page indexable va dans le sitemap ou passe en `noindex`
  (`seo-indexation.mjs`, sur le site construit et en ligne). Titre et
  description de l'accueil identiques dans `index.html` et `seo-ela.mjs`. Un
  seul graphe de données (`#organisation`), jamais `LocalBusiness` sans
  adresse ; aucun lien public vers `/application.html`.
  `memoire/marque-et-referencement.md`, `memoire/seo-international.md`,
  `memoire/seo-indexation.md`.
- **Les pages françaises CDG, Orly et chauffeur** (22/10/2026) : bénéfices,
  « Bon à savoir », liens légaux, barre du pouce ; ni prix chiffré ni
  commentaire HTML. `memoire/pages-acquisition-fr.md`.

## Les outils internes : pilotage, démo, trafic

- **Le Pilotage** (Issue #197) : admin seul, rien pour `anon`, jamais de
  suppression (on archive) ; seuls les champs changés partent, sous condition
  de version ; on déplace par la fiche, jamais en glissant.
  `memoire/pilotage.md`.
- **La démo Professionnels** (`/professionnels/` → `/demo/hotel/`) **n'atteint
  jamais la production** (CSP, `verifier-demo.mjs`, `deposer-course` refuse tout
  « demo ») ; elle ne promet que le vrai, jamais « nos partenaires » ; ni robot
  ni humain bloqué sans Turnstile ; l'accès dure 7 jours. `memoire/demo-pro.md`.
- **La mesure du trafic** : rien sur l'appareil, aucun identifiant envoyé
  (adresse et navigateur hachés avec une clé du jour détruite le lendemain) ;
  jamais nom, téléphone, adresse, prix ni IP ; conservée 90 jours ; lecture
  réservée à l'admin ; une réservation ne compte que si sa course existe ;
  jamais une étape sous 5 personnes. `memoire/trafic.md`.

## Tests

**`.claude/outils/tests.sh` EST LA SEULE RECETTE**, et ce fichier ne recopie
pas la liste des suites (un compte écrit en dur a menti deux fois).

```bash
sh .claude/outils/tests.sh
```

Il lève le serveur local (et vérifie qu'il sert bien ce dépôt), lance une
seule exécution à la fois, juge chaque suite sur son **code de sortie**,
signale une suite muette en toutes lettres et ne s'arrête jamais à la première
rouge. Les suites hors navigateur (`test-doc.mjs`, `test-notification.mjs`,
`test-push.mjs`) comptent comme les autres.

- Playwright n'est pas installé dans le dépôt : `mkdir -p node_modules && ln
  -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright`.
- **Les suites tournent hors ligne** : chacune coupe ce qu'elle ne veut pas
  joindre. Un test qui dépend d'Internet ne prouve rien.
- **Un test éprouve une règle durable**, jamais un libellé du jour ni un compte.
  **Un nouveau contrôle s'éprouve contre le défaut qu'il surveille** : il doit
  tomber sur l'ancien code. Un test qui réimplémente ce qu'il vérifie ne
  vérifie rien ; un contrôle qui trouve son mot dans un commentaire non plus.
- **Ce qui touche au site publié s'éprouve sur le site CONSTRUIT** : la façade
  et les retraits de `construire.sh` n'existent pas dans le dépôt.
- **Mesurer ce que reçoit le doigt** : `elementFromPoint`, descendre jusqu'au
  champ, `click()` et pas seulement `fill()` ; jamais `force:true`.
- `addInitScript` se rejoue à **chaque** chargement ; le registre est un état
  partagé entre les blocs d'une suite ; l'horloge se fige quand l'écran
  affiche une heure.
- **Fermer un serveur par son numéro de processus**, jamais `pkill -f` (le
  motif attrape la commande qui le tape).
- **En ligne** : `verifier-production.mjs` reconnaît chaque porte par son
  **titre** (un 200 ne dit pas qui a répondu), ne compte que notre origine,
  réessaie une fois, tient une Issue unique. La régression visuelle compte
  des pixels (pas un pourcentage), fige horloge et réseau, et ne fait pas
  échouer sur un changement d'aspect : la validation visuelle reste humaine.

Histoire : `memoire/tests-et-controles.md`.

## Ce qui reste à faire

1. **Les informations de l'éditeur** (SIRET et le reste) : le seul point qui
   rende le site non conforme, et le seul qui dépend de lui seul.
2. **Les vraies fiches des chauffeurs** dans le carnet, avec les copies de
   leurs papiers.
3. **Une sauvegarde par semaine** de l'admin (ce qui ne vit que sur
   l'appareil).
4. **Fermer puis rouvrir l'admin** sur chaque appareil après une mise en ligne
   qui le touche.
5. La clé Mapbox reste un confort, pas un manque (voir plus haut).

Ce qui restait à faire en septembre : `memoire/chantiers-septembre.md`.
