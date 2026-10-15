# Autorité, Off-page et partenariats — audit du Prompt 3 (14–15 octobre 2026)

Mission « Prompt 3 » : faire que Google retrouve Elatransfer **ailleurs que sur
elatransfer.com** — hôtels, tourisme, partenaires, Google Business, sources
crédibles — pour transformer l'autorité en positions, en visiteurs, puis en
réservations. Ce document est l'audit rendu **avant toute action extérieure**.
Rien n'a été créé, envoyé, payé ni publié chez un tiers.

**Conventions de preuve, à lire avant tout.**
- **[V]** vérifié par une mesure faite ici (dépôt, site construit, journaux
  GitHub).
- **[R]** vu seulement dans un résultat de recherche : la page n'a PAS été
  ouverte. Le réseau de la session refuse tous les sites extérieurs sauf
  GitHub (WebFetch : DNS introuvable ; curl : 403 du proxy). Le moteur de
  recherche est américain, et son quota s'est épuisé avant la fin. **Chaque
  ligne [R] se relit sur la vraie page avant d'agir.**
- Aucune métrique DA/DR n'est citée : aucune n'était lisible, et ce ne sont
  pas des métriques Google.
- États d'une opportunité : **identifié → contacté → accepté → publié →
  vérifié**. Au 15/10/2026, tout est **identifié**. Aucun lien n'est obtenu.

---

## 1. Validation du Prompt 2 — TERMINÉ ET SUFFISAMMENT STABLE

| Contrôle | Preuve | État |
|---|---|---|
| Dernier `main` | `869f2bf` (PR #356, indexation), après `f69637b` (PR #355, pages `/en/`) | [V] |
| Commit publié | « Publier le site » #341 vert ; monitoring #187 : `/version.json` en ligne = `869f2bf`, cache v175 | [V] |
| Pages internationales en ligne | 5 pages `/en/` et 3 françaises : 200, la bonne page, indexables | [V] |
| Canonique | les 10 adresses du plan : une seule canonique, sur elles-mêmes | [V] |
| hreflang | fr / en / x-default réciproques sur `/`, CDG, Orly (FR et EN) ; Disneyland et CDG↔Orly sans équivalent FR, donc sans hreflang | [V] |
| Plan du site | 10 adresses https, sans doublon, déclaré par `robots.txt` | [V] |
| robots.txt | vrai fichier, 6 règles pour Google, `/en/` permis | [V] |
| Maillage | site construit : chaque page du plan reçoit ≥ 2 liens internes ; `/` → `/en/`, `/en/` → ses 4 pages | [V] |
| Tests SEO | `test-seo-en` relancé ici : 354 réussis, 0 échec, dont 14 falsifications qui font tomber le juge | [V] |
| Migrations du lot | `20261014000000` et `20261014010000` appliquées (workflow #35, #36) | [V] |
| Search Console | compte orucburak001, invisible d'ici | **à vérifier à la main** |

**Adresses stables pour recevoir des liens** : `/`, `/professionnels/`,
`/transfert-cdg-paris`, `/transfert-orly-paris`, `/chauffeur-prive-paris`,
`/en/`, `/en/cdg-airport-transfer-paris/`, `/en/orly-airport-transfer-paris/`,
`/en/disneyland-paris-airport-transfer/`, `/en/cdg-orly-transfer/`. Le
monitoring les juge toutes les 6 h.

**Trois réserves, non bloquantes mais à régler AVANT les citations** :
1. `www.elatransfer.com` ne résout pas : tout annuaire ou hôtel qui écrit
   « www » ferait un lien mort. DNS Cloudflare, à Barbaros.
2. Une adresse inconnue rend l'accueil en 200 (soft 404) : un lien mal copié
   tombe sur l'accueil plutôt que sur une erreur. Réglage d'hébergement.
3. Les anciennes adresses `.html` redirigent en 307 (temporaire). Ne jamais
   donner une adresse en `.html` à un partenaire.

Gestes Search Console (Barbaros) : soumettre `sitemap.xml` (attendu : 10 URL),
demander l'indexation des 5 pages `/en/` et de CDG / Orly, puis surveiller
**Liens → Principaux sites externes** : c'est là que chaque lien obtenu se
vérifiera.

---

## 2. Autorité actuelle d'Elatransfer

- **Domaines référents identifiés : 0.** La seule présence hors du site est le
  dépôt GitHub public (fichier `CNAME`), qui n'est pas un lien éditorial. [V]
- **Aucune mention** de la marque, du numéro (trois formats), de
  `contact@elatransfer.com` ni de `@elatransfer` dans 34 recherches. [R]
- **Aucune citation NAP** (nom, adresse, téléphone) : ni annuaire, ni
  registre (Pappers, societe.com, annuaire-entreprises : rien sous ELATRANSFER
  — cohérent avec l'absence de SIRET). [R]
- **Fiche Google Business** : impossible à voir d'ici. Le mémo dit qu'elle ne
  peut pas être vérifiée sans SIRET.
- **Réseaux sociaux** : aucune trace, et `index.html` ne déclare aucun `sameAs`. [V]
- **Avis** : aucun, nulle part. [R]
- **Historique toxique** : aucun. Point de départ propre, mais nul.

**Homonymes qui brouillent la marque** [R] :

| Nom | Où | Risque |
|---|---|---|
| Taxi ELA | PagesJaunes, Seine-et-Marne, navettes aéroports | **élevé** : même métier, même région |
| Elife Transfer | groupe mondial de transferts (avec hoppa) | **élevé** : un résumé IA du moteur a déjà attribué elatransfer.com à « Elife Transfer » |
| Ella Car Transfer, eTransfers, ELA Limousine | Turquie, Mexique, États-Unis | moyen |
| European Labour Authority, Elastos (ELA) | — | occupent « ELA » et « ELA » + Telegram |

« Elatransfer » en un mot est libre ; « ELA Transfer » en deux mots est noyé.
**La règle « Elatransfer partout » est aussi une défense de référencement.**

---

## 3. Concurrents réellement visibles

Ordre rendu par un moteur américain sur 10 requêtes (6 anglaises, 1 hôtel,
3 françaises) — pas une position google.fr prouvée. [R]

| Domaine | Requêtes (sur 10) | Type |
|---|---|---|
| transfeero.com | 6 | place de marché, affiliation, offre hôtels |
| getyourguide.com | 5 | OTA |
| viator.com | 3 | OTA |
| mydriverparis.com | 3 | opérateur local (depuis 2012) |
| t2transfer.com | 3 | opérateur local, niche Disneyland |
| easygoshuttle.com | 3 | opérateur local, une page par trajet Disney |
| myprivateservice.com | 3 | opérateur |
| sortiraparis.com | 2 | média — **article sponsorisé** |
| hoppa, suntransfers, tripadvisor, paristoolkit | 2 chacun | OTA / avis / guide |
| welcomepickups, blacklane, chabe, sixt | 1 chacun | plateformes / premium |

**Lecture** :
- Anglais générique (« Paris airport transfer ») : tenu par les places de
  marché et les OTA. **Pas atteignable à court terme.**
- Anglais longue traîne (« CDG to Disneyland ») : tenu par des opérateurs
  locaux qui ont **une page par trajet**. Atteignable.
- Français : aucune OTA, des opérateurs locaux à domaine-requête, souvent
  « VTC ».

**Pourquoi Google leur fait plus confiance qu'à Elatransfer** :
1. ancienneté (2012–2013 pour les locaux) ;
2. avis tiers en volume (Transfeero ~35 000, Welcome Pickups ~48 000 sur
   Trustpilot ; T2 Transfer ~300–400 sur Tripadvisor) ;
3. citations éditoriales, **le plus souvent achetées par affiliation**
   (Travelpayouts : Welcome Pickups 8 %, Kiwitaxi, GetTransfer) ;
4. une page par trajet, plus des guides ;
5. dix ans de mentions sur des forums (Tripadvisor, Rick Steves, Mumsnet) ;
6. intégrations dans les outils des hôtels (Welcome Pickups sur Mews et
   Touch Stay).

**Le cas instructif** : MyDriverParis ranke sur trois requêtes avec 6 avis
Trustpilot et 21 Tripadvisor. Ancienneté, pages dédiées dans les deux langues
et cohérence comptent autant que le volume d'avis.

---

## 4. Link gap — pages qui citent plusieurs concurrents mais pas Elatransfer

Toutes [R] ; le caractère suivi / nofollow / sponsored n'a pu être lu nulle part.

| # | Page | Concurrents | Nature | Chance réaliste |
|---|---|---|---|---|
| 1 | grand-roissy-tourisme.com/tourisme-daffaires/prestataires/transports/ | Well'Com, LDR Transport, GTI, Time Attitude, Keolis, Transdev | **annuaire officiel** | **forte, après SIRET** (adhésion) |
| 2 | grand-roissy-tourisme.com/mon-sejour/aeroport-paris-charles-de-gaulle/taxis/ | GTI Taxis, Time Attitude, LDR, S.S Limousine | annuaire officiel | forte, après SIRET — ne pas être rangé « taxi » |
| 3 | pro.visitparisregion.com … /coach-operators-transport-services | France Luxury Cab, Jeyan Drivers, Paris Green Car… | annuaire régional pro | bonne, mode d'inscription à lire |
| 4 | parisjetaime.com/eng/transport/… (fiches adhérents) | Platinum Paris, My Daily Driver, Eden Transports | office du tourisme, payant | possible : 450 € HT de base (2023-24), **personnes morales seulement** |
| 5 | salutfromparis.com/cdg-to-disneyland-paris/ | Welcome Pickups, Magical Shuttle | éditorial | moyenne : proposer une offre familles / van |
| 6 | paristoolkit.com/airport/paris_cdg.htm, …_eurodisney.htm | « un service local » non nommé | partenaire exclusif | faible tant qu'un partenaire est en place |
| 7 | lesfrenchiestravel.com (2 pages) | Welcome Pickups, Blacklane | **affiliation déclarée** | seulement avec une commission : lien payant |
| 8 | travelfineprint.com, andreondigital.com | GetTransfer, Welcome Pickups, Kiwitaxi | affiliation probable | idem |
| 9 | mycastleclub.co.uk/our-friends/… | KS Transport | page « amis » d'un club Disney britannique | moyenne |
| 10 | mews.com marketplace, touchstay.com | Welcome Pickups | intégration hôtelière | long terme (API) |
| 11 | sortiraparis.com article 351294 | Chauffeur Service Paris | **sponsorisé** | en payant, sans valeur de confiance |
| 12 | tripadvisor « Paris Taxis & Shuttles » | opérateurs locaux | classement par avis | après une fiche et de vrais avis |
| 13 | forums Mumsnet, Tripadvisor, Rick Steves, WDWMagic | divers | commentaires d'utilisateurs | **jamais d'auto-promotion** : seulement de vrais clients |

**Constat** : la moitié du link gap des grandes plateformes est de
l'affiliation payée. Elatransfer n'a ni programme ni marge pour cette course
— et elle ne construit pas de confiance au sens de Google. **Le gap utile est
local et institutionnel (lignes 1 à 4) et hôtelier.**

---

## 5. Top 20 des opportunités

Score /100 = pertinence (30) + potentiel commercial (25) + autorité/confiance
(20) + trafic potentiel (15) + facilité (10), moins une pénalité de risque.
Toutes [R] sauf easyHotel (partenariat confirmé par Barbaros).

| Rang | Opportunité | Catégorie | Concurrent présent | Page Elatransfer | Coût | Risque | Score | Action |
|---|---|---|---|---|---|---|---|---|
| 1 | Grand Roissy Tourisme — Transports + Taxis | office de tourisme | oui (LDR, GTI…) | `/` ou `/en/cdg-airport-transfer-paris/` | adhésion 100–250 € TTC/an si « commerce » (à confirmer) | nul | **81** | adhérer après SIRET, demander « organisateur de transferts », pas « taxi » |
| 2 | easyHotel CDG Aéroville — bloc « Getting here » | hôtel partenaire | non (bus seulement) | `/en/cdg-airport-transfer-paris/` | 0 | nul (accord écrit requis) | **80** | demander l'accord de nommer le partenariat + une ligne transfert sur sa fiche (siège easyHotel) |
| 3 | Hôtels indépendants zone CDG (Nomad, ACE Mitry-Mory, Geographotel, The Jangle) | hôtels | non | landing CDG + page partenaire | 0 | nul | **78** | offre comptoir là où leur navette s'arrête (nuit, Orly, Disney, Beauvais, salons) |
| 4 | Tripadvisor — fiche « Transportation » + vrais avis | avis | oui (T2, Paris Private Shuttle) | `/en/` | 0 | faible (éligibilité à lire : adresse, 60 jours d'activité) | **77** | créer après SIRET, avis demandés à toutes les courses |
| 5 | Paris je t'aime — fiche transport adhérent | office de tourisme | oui | `/en/` | 450 € HT + options | moyen (personne morale exigée) | **77** | décision Barbaros ; vérifier l'éligibilité d'une micro-entreprise |
| 6 | Google Business Profile | fiche locale | — | `/` | 0 | **élevé** (voir § 7) | **74** | après SIRET, présentation honnête, une seule fiche |
| 7 | Visit Paris Region — annuaire « transporteurs / transféristes » | tourisme régional | oui | `/en/` | ? | nul | **71** | lire le mode d'inscription |
| 8 | Hôtels partenaires Disneyland (Ki Space, L'Elysée Val d'Europe, Explorers) | hôtels | non | `/en/disneyland-paris-airport-transfer/` | 0 | nul | **71** | familles, van 7 places, aéroports ↔ Disney |
| 9 | Meetings by Visit Paris Region | place de marché B2B | — | `/professionnels/` | **0 €, sans commission** | nul | **70** | formulaire Excel signé, après SIRET |
| 10 | Cycas Hospitality (gère plusieurs hôtels du territoire) | gestionnaire hôtelier | — | `/professionnels/` | 0 | nul | **66** | une porte pour plusieurs comptoirs |
| 11 | salutfromparis.com — CDG → Disneyland | blog voyage | oui (Welcome Pickups) | `/en/disneyland-paris-airport-transfer/` | 0 | faible | **66** | proposer une info utile (van, tarif annoncé), jamais exiger un lien |
| 12 | paristoolkit.com — CDG et Disney | guide | partenaire en place | landing CDG / Disney | inconnu | moyen (exclusivité payante probable) | **65** | se renseigner, ne rien payer sans avis |
| 13 | Mews / Touch Stay — intégrations hôtelières | logiciel hôtelier | oui (Welcome Pickups) | `/professionnels/` | intégration | nul | **63** | long terme : c'est le terrain B2B exact |
| 14 | lesfrenchiestravel.com | blog affilié | oui | landing CDG | commission | élevé (lien payant) | **59** | pas maintenant |
| 15 | TendanceHotellerie — communiqué gratuit | média hôtelier | — | `/professionnels/` | 0 | nul | **58** | quand un hôtel accepte d'être cité |
| 16 | PagesJaunes | annuaire | oui | `/` | fiche gratuite | faible (relances commerciales) | **57** | après SIRET, fiche gratuite seulement |
| 17 | Hospitality ON — communiqué déposé PAR l'hôtel | média hôtelier | — | `/professionnels/` | 0 si l'hôtel le dépose | nul | **57** | même condition |
| 18 | mycastleclub.co.uk/our-friends | club Disney (R.-U.) | oui (KS Transport) | landing Disney | inconnu | moyen | **51** | se renseigner |
| 19 | Bnetwork (hébergement officiel du SIAL et d'autres salons) | agence d'hébergement salons | — | `/professionnels/` | 0 | nul | **51** | commercial : transferts des exposants logés près de Villepinte |
| 20 | Trustpilot — compte gratuit | avis | oui | `/` | 0 | faible | **49** | second panier d'avis, invitations à toutes les courses |

Écartés ou plus tard : Bing Places (48, après Google), registres officiels
(automatiques après SIRET, confiance mais pas de lien), Les Clefs d'Or (49,
haut de gamme, plus tard), sortiraparis sponsorisé (44, payant), Kompass /
Europages / Cylex / Hoodspot / 118000 (C), Yelp (D).

---

## 6. Opportunités hôtelières — le levier propre à Elatransfer

**Ce qui ressort de la recherche** [R] : beaucoup d'hôtels de la zone CDG ont
une navette, mais **seulement vers CDG ou la gare, à des heures limitées et
souvent payante** (Nomad 7 €/pers. sur deux plages ; ACE payante pendant les
salons de Villepinte ; Dream Castle transfert payant 8 h–20 h). Les hôtels
partenaires Disney n'affichent **aucun transfert aéroport**. **Aucun hôtel vu
ne cite de prestataire privé nommé : la place est libre.**

**La règle qui structure tout** : le lien suit le partenariat, jamais
l'inverse. Ne jamais échanger une commission contre un lien suivi — Google
range ce troc parmi les liens artificiels.

**Où le lien a sa place, page par page** :
- « Accès / Getting here » : *« Airport transfers — book with Elatransfer »*
  (lien vers la landing du bon aéroport) ;
- « Services / Concierge » ou « Useful information » : une ligne, comme pour
  le parking ;
- e-mail de pré-arrivée : le lien de la page partenaire de l'hôtel (sans
  valeur SEO, mais c'est là que la réservation se fait).

**Un choix à trancher par Barbaros** : la page partenaire d'un hôtel (`?h=`,
`/easyhotel-client/`) est volontairement **hors de Google** (grille négociée).
Un lien d'hôtel vers elle sert la réservation mais ne transmet aucune
autorité. Deux options :
- **A** — l'hôtel lie la landing publique (autorité) et garde le QR pour sa
  grille : simple, mais le client qui clique depuis le site de l'hôtel voit
  le prix public.
- **B** — une page publique par hôtel, indexable, **sans prix**, qui renvoie
  vers le moteur : autorité et cohérence, c'est un chantier.

Recommandation : A tout de suite, B quand il y aura trois hôtels.

**Les chaînes intégrées** (easyHotel, B&B, Campanile, Première Classe) : leur
site est tenu par le siège. Le directeur local décide du comptoir, pas de la
page. Viser d'abord les **indépendants et les franchisés**.

**Fichier de prospection** : la liste des hôtels de grand-roissy-tourisme.com
(Nomad, Geographotel, The Jangle, Oceania, Eklo, Van der Valk, Campanile,
Première Classe…), plus Val d'Europe pour Disney et Rungis pour Orly.

---

## 7. Google Business Profile

**Le point dur, à connaître avant de créer quoi que ce soit** [R, citations de
support.google.com, pages non ouvertes] :
- Non éligibles : *« Lead generation agents or companies »* /
  « agents ou sociétés spécialisés dans la génération de prospects ».
- Critère : *« a business must make in-person contact with customers during
  its stated hours »*.
- Or les CGV disent : « Elatransfer intervient comme **intermédiaire** entre
  le Client et le chauffeur », le client **paie le chauffeur** par lien, la
  facture porte le SIRET du chauffeur. [V]

**Conséquence** : risque réel de refus à la vérification, ou de suspension
sur simple signalement d'un concurrent. Une fiche suspendue emporte ses avis.

**Recommandation** :
1. **Pas de fiche avant le SIRET** (déclaré avec le nom commercial
   « Elatransfer », pour que le document de vérification porte ce nom).
2. Puis **une seule fiche**, en zone desservie, adresse réelle masquée,
   zone = villes et départements d'Île-de-France (jamais « France ») ;
   nom = **« Elatransfer »** seul (aucun mot-clé : motif de suspension) ;
   catégorie principale « Service de chauffeur » / *Chauffeur service*,
   secondaire facultative « navette aéroport » (libellés français à lire dans
   l'interface) ; **jamais** Taxi, Limousine ni Agence de voyages ;
   description honnête : « organise vos transferts avec des chauffeurs
   professionnels indépendants ».
3. **Ne pas mettre tous les avis dans ce seul panier** : Tripadvisor et
   Trustpilot en parallèle.
4. Le jour où le modèle change (Elatransfer vendeur du trajet), le risque
   baisse. C'est une décision commerciale et juridique, pas de référencement.

Vérification vidéo : une prise, plaques de rue, preuve de gestion (document au
nom de l'entreprise). Sans SIRET, rien à filmer.

---

## 8. Citations locales et annuaires

| Plateforme | Type | Coût | SIRET | Note |
|---|---|---|---|---|
| Grand Roissy Tourisme | office de tourisme local | adhésion | oui | **A** |
| Visit Paris Region (annuaire + Meetings) | tourisme régional | 0 / ? | oui | **A** |
| Paris je t'aime | office de Paris | 450 € HT+ | personne morale | **A–B**, décision |
| Google Business | fiche locale | 0 | de fait | **A**, sous réserve § 7 |
| PagesJaunes | annuaire de référence | fiche gratuite | oui | **A** (après SIRET) |
| Tripadvisor | tourisme international | 0 | ? | **B** |
| Trustpilot | avis | 0 | ? | **B** |
| Bing Places | fiche locale | 0 | adresse | **B** |
| Annuaire-entreprises, Pappers, societe.com | registres | automatique | — | **B** (non-diffusion possible pour protéger l'adresse du domicile) |
| CCI Paris IdF / Val-d'Oise, Réseau Entreprendre 95, Initiactive 95 | réseaux | — | oui | **B** (accompagnement, parfois page lauréat) |
| Apple Business Connect | plans | 0 | documents | **C** (douteux sans local) |
| Kompass, Europages, Cylex, Hoodspot, 118000 | annuaires | base gratuite | ? | **C** |
| montransport.com, 1001salles | annuaires VTC/taxi | ? | ? | **C** (3 800 concurrents, valeur faible) |
| Yelp France | avis | 0 | — | **D** (exclut les intermédiaires, interdit de demander des avis) |
| Forfaits « 500 annuaires », « 60 citations » ; registres payants non sollicités (fausses factures) | — | — | — | **D, à éviter** |

**Places de marché de transferts** (Kiwitaxi, GetTransfer, Welcome Pickups,
Booking Taxi, Jayride, Suntransfers, Hoppa, GetYourGuide) : des canaux de
VENTE, pas des liens ; elles exigent en général un transporteur licencié.
C'est le chauffeur qui s'y inscrit, pas la centrale.

**Cohérence NAP** : partout « Elatransfer », `+33 7 59 31 24 33`,
`https://elatransfer.com/` (jamais `www`, jamais `.html`),
`contact@elatransfer.com`. Une citation incohérente est pire qu'aucune.

---

## 9. Tourisme, voyage, salons

- **Le levier tourisme est institutionnel et local** : Grand Roissy Tourisme
  (rang 1), Visit Paris Region (rangs 7 et 9), Paris je t'aime (rang 5).
  Petits opérateurs déjà listés : la porte est ouverte à la même taille.
- **Salons** (Viparis Villepinte et Le Bourget, Maison&Objet, SIAL, Première
  Vision, Salon du Bourget) : aucun ne référence un prestataire de transfert
  ouvert à candidature ; le « Welcome Pack » est tenu par Viparis, la région et
  de grands groupes ; Chabé se dit fournisseur officiel du Salon du Bourget.
  **Ne pas viser le statut officiel. L'argent des salons passe par les hôtels
  voisins** (ACE, Nomad…) et par les agences d'hébergement (Bnetwork pour le
  SIAL).
- **Agences réceptives, voyage d'affaires, événementiel, conciergeries** :
  non recherchées (quota épuisé). Les réceptifs listés par Visit Paris Region
  (Euroscope, Paris Trip, Extime, SAVAC) font eux-mêmes des transferts :
  partenaires de débordement, pas sources de liens.
- **Paris Aéroport** ne liste que les taxis (G7, Alpha, Hype) : aucun lien
  possible, mais utile pour les zones d'attente des chauffeurs.

---

## 10. Digital PR

**L'angle vrai** : « une jeune entreprise d'Île-de-France crée gratuitement,
pour chaque hôtel, une page de réservation de transferts, un QR code et un
espace réception, puis coordonne chaque course ». Sans chiffre ni hôtel qui
parle, la probabilité d'un article non payé est **faible**. **Le levier est
un hôtel partenaire qui accepte d'être cité** — avec son accord écrit.

| Média | Canal public | Conditions | Probabilité |
|---|---|---|---|
| TendanceHotellerie | « Soumettez vos articles », communiqué < 800 mots | vérifié avant mise en ligne | **moyenne** (la meilleure cible) |
| Hospitality ON | « Soumettre un communiqué » | gratuit pour les hôtels et chaînes ; les fournisseurs paient (publi-rédactionnel) | moyenne **si l'hôtel dépose** |
| TourMaG, L'Écho touristique, Déplacements Pros | rédaction générique | — | faible |
| Maddyness, FrenchWeb | formulaire rédaction | sans résultats à montrer | faible |
| HospitalityNet | payant (750 € / 1 199 $) | lien payant | à éviter |
| Presse locale (Le Parisien 95/93, actu.fr, Gazette du Val d'Oise, Contact Entreprises) | non vérifié | — | probablement la plus réaliste, à mesurer |

**Interdits de récit** : leader, milliers de clients, dizaines d'hôtels,
technologie brevetée, couverture nationale. Une phrase vraie : « déjà en
service dans un hôtel de la zone de Roissy-CDG » — au singulier, et à retirer
si le partenariat cesse.

---

## 11. Avis authentiques

**Règles** [R / connues, à relire sur les textes] :
- Google interdit toute contrepartie (remise, cadeau) et **le tri des clients
  à qui l'on demande** (« review gating »).
- France : L132-2 (faux avis, 2 ans, 300 000 €, 10 % du CA) ; L121-4 (avis
  faux ou présentés comme vérifiés sans mesure : pratique trompeuse) ;
  L111-7-2 et D111-16 à D111-19 (informations obligatoires dès qu'on affiche
  des avis sur son site). Textes cités de mémoire : relire Légifrance.

**Ce qui existe déjà dans l'admin** [V] : « Demander un avis » sur chaque
course **réalisée**, message en trois lignes dans la langue du client, lien
réglable (`ela_lien_avis`), course marquée `avisDemande`.

**Le risque caché** : le bouton est manuel, course par course. L'utiliser
seulement avec les clients contents, c'est exactement le tri interdit.
**Règle proposée** : la demande part pour TOUTE course réalisée, le soir même
ou le lendemain matin (le client est arrivé, l'expérience est fraîche), et
jamais à une course refusée.

**Construit le 15/10/2026 (à valider par Barbaros)** : sur le tableau de bord,
« N clients de la semaine sans demande d'avis : demandez à tous » (`#bordAvis`), qui mène aux courses réalisées. Il se
tait tant qu'aucun lien d'avis n'est réglé. Le message reste envoyé par
WhatsApp depuis le téléphone de Barbaros (pas d'API).

Destination du lien : la fiche Google une fois vérifiée ; d'ici là,
Tripadvisor ou Trustpilot.

---

## 12. Ancres, pages cibles, suivi

**Ancres** — profil naturel : ≥ 60 % marque ou adresse (« Elatransfer »,
« elatransfer.com »), ~25 % naturelles (« book your airport transfer »,
« réserver un transfert », « website »), ≤ 15 % descriptives partielles
(« airport transfers by Elatransfer »). **Jamais** une ancre exacte répétée.

**Page cible selon le contexte** :

| Contexte du lien | Page |
|---|---|
| Hôtel zone CDG | `/en/cdg-airport-transfer-paris/` ou `/transfert-cdg-paris` |
| Hôtel Orly / Rungis | `/en/orly-airport-transfer-paris/` ou `/transfert-orly-paris` |
| Hôtel Val d'Europe, guide Disney | `/en/disneyland-paris-airport-transfer/` |
| Guide escale, inter-aéroports | `/en/cdg-orly-transfer/` |
| Salon, voyage d'affaires | `/en/` (pas de page salon aujourd'hui) |
| Média hôtelier, CCI, association | `/professionnels/` |
| Annuaire, fiche Google, citation | `/` |

**Suivi — ce qui existe déjà** [V] :
- `?h=<hôtel>` : la provenance de l'hôtel est gardée sur la course
  (registre « D'où viennent les clients », bon, alerte Telegram) ;
- `?src=` : liste fermée de 8 pages d'origine, comptée par `mesure.js`
  (affichage, clic Réserver, Appel, WhatsApp) et recopiée dans la course.

**Construit le 15/10/2026 (à valider par Barbaros) : le lien de chaque
partenaire, `?via=<code>`.**
- L'admin crée le lien (Registre → « Liens des partenaires » : nom, code,
  page d'arrivée, « Copier ») et y lit ce qu'il amène : vues, « Book »,
  appels, WhatsApp, moteur ouvert (compteur du serveur), puis demandes,
  réalisées et argent encaissé (registre).
- Le code suit le visiteur sur tous les liens du site jusqu'à la demande ;
  le serveur le reconnaît dans sa liste (`liens_suivi`, lisible par l'admin
  seul) et pose la provenance « Lien · nom · page d'origine ». Un code
  inventé est ignoré. Une demande de démo (page Professionnels) le porte
  aussi (`prospects.via`) : c'est la seule conversion de cette page.
- Aucun cookie, rien sur l'appareil ; la politique de confidentialité le dit
  (FR/EN, mise à jour du 15/10). Migration `20261015000000` à appliquer après
  la fusion.
- La fiche papier des hôtels a déjà son code : `fiche-hotels` — ses visites
  et ses demandes de démo se lisent sur sa ligne.
- `/professionnels/` compte aussi ses visites (page « pro ») : c'est elle que
  visent un office de tourisme, une CCI, un média hôtelier et la fiche papier.

**Registre des liens** (à tenir à chaque changement d'état) :

| Source | Domaine | URL source | Page cible | Ancre | rel | Date | État | Dernière vérif. | Clics (Search Console / mesure) | Réservations (provenance) |
|---|---|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | identifié / contacté / accepté / publié / vérifié | — | — | — |

« Vérifié » = la page source ouverte montre le lien, ET la Search Console
le liste (Liens → Principaux sites externes).

---

## 13. Ressources qui méritent un lien (linkable assets)

Les pages actuelles sont commerciales : on les lie pour réserver, pas pour
s'informer. Une seule ressource vaut d'être écrite maintenant, et seulement
si le fait se confirme :
- **« CDG → Paris : les options depuis la fin du Roissybus »** — un résultat
  de recherche dit que le Roissybus s'est arrêté le 1er mars 2026 [R, À
  VÉRIFIER sur parisaeroport.fr / RATP]. Si c'est vrai, les guides qui le
  citaient encore ont une raison de mettre à jour, donc de lier une source
  fraîche.
- Ensuite, quand il y aura des courses : « Où votre chauffeur vous attend à
  CDG, terminal par terminal » et « CDG ↔ Disneyland en famille : van,
  bagages, sièges ».
Rien n'est écrit pour placer des mots-clés.

---

## 14. Liens payants rencontrés

| Offre | Nature | Prix vu | Avis |
|---|---|---|---|
| sortiraparis.com | article sponsorisé | non affiché | non : visibilité sans confiance, `rel="sponsored"` obligatoire |
| Hospitality ON (fournisseurs) | publi-rédactionnel | non affiché | non |
| HospitalityNet | communiqué | 750 € / 1 199 $ | non |
| Affiliation blogs (Travelpayouts…) | commission | 8 à 50 % | non : pas de marge, liens payants |
| Grand Roissy Tourisme | **adhésion** à un office de tourisme | 100–250 € TTC/an (à confirmer) | **oui** : vrai réseau, vraie page, pas un achat de lien |
| Paris je t'aime | **adhésion** | 450 € HT + options | plus tard, après éligibilité confirmée |

---

## 15. Plan 90 jours (adapté à l'audit)

**Le constat qui ordonne tout : 6 des 10 premières opportunités exigent une
entreprise immatriculée.** Le premier mois n'est donc pas un mois de liens.

**0–30 jours — débloquer**
1. SIRET, avec le nom commercial « Elatransfer » ; RC Pro ; déclaration de
   centrale de réservation (L3142-2). *(Barbaros)*
2. DNS : faire répondre `www.elatransfer.com` (redirection vers
   l'adresse sans www). *(Barbaros, Cloudflare)*
3. Search Console : plan du site, indexation des pages `/en/`. *(Barbaros)*
4. easyHotel : accord écrit pour nommer le partenariat, et une ligne
   « transfert » dans le bloc « Getting here ». *(Barbaros)*
5. Demande d'avis à **toutes** les courses réalisées. *(Barbaros ; le
   rappel de la semaine est construit, à valider)*
6. Une fiche d'une page pour les hôtels indépendants de Roissy (ce que
   l'hôtel reçoit, gratuit, sans engagement). *(préparée le 15/10 :
   `commercial/fiche-hotels.html`, à valider par Barbaros)*
7. Un lien `?via=` par partenaire dès le premier contact. *(construit,
   à valider)*

**31–60 jours — s'inscrire là où ça compte**
7. Google Business (§ 7), puis Bing Places, PagesJaunes (fiche gratuite).
8. Grand Roissy Tourisme (adhésion) ; Meetings by Visit Paris Region (gratuit) ;
   annuaire Visit Paris Region des transporteurs.
9. Tripadvisor « Transportation » et Trustpilot.
10. 3 à 5 hôtels Roissy indépendants + 2 hôtels partenaires Disney : comptoir
    d'abord, ligne « Accès » ensuite.
11. La ressource « fin du Roissybus » si le fait se confirme.

**61–90 jours — faire parler et mesurer**
12. Communiqué TendanceHotellerie (et Hospitality ON déposé par l'hôtel) dès
    qu'un hôtel accepte d'être cité.
13. Prise de contact salutfromparis (Disney), renseignement paristoolkit.
14. Décision Paris je t'aime ; Cycas Hospitality ; Bnetwork pour les salons.
15. Bilan : registre des liens + Search Console + provenance des courses →
    on garde le canal qui a amené des réservations, on le reproduit.

---

## 16. Avis d'expert

**La manière la plus rapide ET durable d'augmenter l'autorité d'Elatransfer
n'est pas un lien : c'est l'immatriculation.** Sans SIRET : pas de fiche
Google vérifiable, pas d'office de tourisme, pas de PagesJaunes, pas de
Visit Paris Region, pas de média. Avec lui, six portes s'ouvrent dans le mois.

Ensuite, **le produit est le moteur de liens** : chaque hôtel qui pose le QR
au comptoir peut, naturellement, écrire une ligne « Airport transfers —
Elatransfer » sur sa page d'accès. Dix hôtels de la zone CDG qui le font
valent plus que cent liens d'annuaires, parce qu'ils sont locaux, sur le
sujet, et qu'ils amènent de vraies réservations — et le registre le prouvera
par la provenance.

**Ce qu'il ne faut pas faire** : courir derrière les blogs affiliés de
Welcome Pickups et Transfeero (ils paient 8 à 50 % par course), acheter des
articles sponsorisés, ou soumettre en masse. Et **ne pas attendre de
« Paris airport transfer » à court terme** : c'est le terrain des places de
marché. La longue traîne (Disneyland, CDG ↔ Orly, van, familles) est
atteignable en 2 à 4 mois.

---

## Rapport d'étape

| | Au 15/10/2026 |
|---|---|
| Autorité de départ | nulle (0 domaine référent, 0 citation, 0 avis) |
| Domaines référents identifiés | 0 |
| Backlinks existants | 0 (hors dépôt GitHub) |
| Opportunités identifiées | 20 classées + 13 pages de link gap + ~15 annuaires notés |
| Contactées / acceptées / publiées / vérifiées | 0 / 0 / 0 / 0 |
| Actions extérieures réalisées | aucune (rien n'était autorisé, et la plupart exigent le SIRET) |
| Partenaires contactables | easyHotel (accord à demander) ; hôtels Roissy et Disney ; Grand Roissy Tourisme ; Visit Paris Region |
| Citations / avis | 0 / 0 |
| Non vérifié | toutes les pages [R] ; agences réceptives, DMC, conciergeries, associations pro (UMIH, Unimev, Entreprises du Voyage) ; presse locale ; libellés français des catégories Google ; textes juridiques des avis |

**PROMPT 3 — NON TERMINÉ.** Étapes restantes : relire les pages [R] dans une
session au réseau ouvert ; les actions extérieures du plan, chacune avec
l'accord de Barbaros ; le SIRET d'abord.
