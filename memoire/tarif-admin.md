# Le tarif réglé depuis l'admin — archive

> **Ceci est une archive.** La section « UN SEUL TARIF AU KILOMÈTRE, ET IL SE
> MODIFIE DEPUIS L'ADMIN » de `CLAUDE.md` y est recopiée telle qu'elle était le
> 14 octobre 2026, puis l'histoire du prix des pages dédiées. Ce qui vaut
> aujourd'hui est dans `CLAUDE.md`, section « LE TARIF SE RÈGLE DEPUIS
> L'ADMIN ». Rien n'a été réécrit ci-dessous.

## (archive) UN SEUL TARIF AU KILOMÈTRE, ET IL SE MODIFIE DEPUIS L'ADMIN

28 septembre 2026, à sa demande : « je veux que tout le monde ait le même
prix lorsqu'il tape une adresse sur le moteur de recherche, et je veux
pouvoir modifier cela sur ma page admin, même les prix du flyer. »

**IL Y AVAIT DEUX GRILLES AU KILOMÈTRE, ET ÇA NE SE VOYAIT PAS.** 2,90 €/km
berline / 4,70 €/km van pour un client ordinaire ; une seconde, plus basse,
injectée au moment de CONSTRUIRE le site pour une adresse hôtel hors flyer
(« autre destination »), par .github/scripts/appliquer-regles-easyhotel.mjs
(supprimé depuis).
Deux clients tapant la même adresse depuis deux entrées différentes du site
payaient donc un montant différent, sans qu'aucun des deux ne le sache — et
le prix est ferme donc opposable. **Il n'y en a plus qu'une.** Le
transformateur de construction a été **supprimé** — il n'avait plus rien à
faire, l'unique grille suffit désormais partout — et retiré de
`construire.sh`.

**LE TARIF EST DÉSORMAIS LU SUR LE SERVEUR, PAS SEULEMENT ÉCRIT DANS LA
PAGE.** C'était la seconde moitié de la demande : pouvoir changer un prix
depuis un téléphone, sans republier le site. `GAMMES` (le tarif général) et
`HOTELS[...].destinations[...].forfait` (les sept prix du flyer) restent
écrits en dur dans `index.html` — **ce sont des REPLIS, plus la vérité** :
au chargement, `chargerTarifsServeur()` interroge deux vues Supabase
anonymes et **corrige ces valeurs en mémoire** si le serveur répond. Le
repli est sacré, comme partout ailleurs sur ce site : un échec (hors ligne,
minuterie, format inattendu) ne touche à rien, le client garde le chiffre
écrit en dur, sans le moindre message.
- **DEUX VUES, PAS DEUX TABLES OUVERTES À ANON.** Les tables restent
  fermées (`parametres_commerciaux` porte aussi la commission) ; `anon` lit
  `tarif_public` et `forfaits_partenaires_publics`, qui tournent avec les
  droits de leur PROPRIÉTAIRE, donc SANS les policies.
  **UNE VUE NE S'ÉCRIT JAMAIS** (audit du 4 octobre 2026) : Supabase donne
  par défaut TOUS les droits à `anon` sur tout objet neuf, et une vue sur
  une seule table est modifiable — un anonyme effaçait le tarif berline.
  `20261005000000_vues_lecture_seule.sql` retire l'écriture à toute vue ;
  la rejouer après toute vue créée (elle s'arrête si un droit survit).
- **L'ÉCRITURE EXISTAIT DÉJÀ, IL NE MANQUAIT QUE L'ÉCRAN.** Les deux tables
  ont depuis leur création une policy « authenticated + `est_exploitant()`
  » en écriture — Admin v2 s'en sert déjà pour la commission. Le nouvel
  écran (Réglages → « Tarifs », dans l'admin historique que Barbaros
  utilise réellement, pas Admin v2) appelle donc `nuage.appel()` avec la
  session déjà ouverte pour se connecter à l'espace — le même compte, la
  même autorisation.
- **LES FORFAITS DU FLYER RESTENT DES MONTANTS FIXES**, à sa demande
  explicite (« rester des forfaits fixes, modifiables un par un ») — pas de
  bascule au kilométrage. Chaque destination × gamme est un champ modifiable
  à part.
- **`nuage.majForfait` LIT AVANT D'ÉCRIRE** : `tarifs_partenaires` se filtre
  par `partenaire_id`, pas par la clé lisible de l'hôtel. Écrire à
  l'aveugle sur un identifiant supposé créerait une seconde ligne « active »
  pour la même destination au lieu de corriger la première.
- **LA MÉMOIRE DE LA PAGE EST CORRIGÉE AU MOMENT MÊME DE L'ENREGISTREMENT**,
  pas seulement le serveur : sinon la grille rappelée sur « Nouvelle course »
  (`ecrireGrille()`) resterait périmée jusqu'au prochain chargement complet
  de la page — exactement le défaut déjà réglé pour le prix de la pancarte.
- **`deposer-course` NE VÉRIFIE PAS CE TARIF CÔTÉ SERVEUR** — seuls les
  forfaits du flyer le sont (`snapshotPartenaire`). Le kilométrage reste,
  comme avant cette unification, un calcul fait confiance au client. Ce
  n'est pas une régression : c'était déjà le cas pour les deux grilles
  précédentes, et étendre cette vérification est un chantier à part.
- **`verifier-tarif-hotel.mjs` REJOUE TOUTES LES MIGRATIONS, PAS UNE
  SEULE.** Le tarif général est semé par une migration (INSERT) puis
  corrigé par celle-ci (UPDATE) : lire uniquement la première aurait
  comparé le repli du site à une valeur que la base ne porte plus. **Piège
  rencontré en l'écrivant** : capturer séparément la clé et la valeur
  laissait une fenêtre de correspondance sauter par-dessus le « where cle »
  du van et lui attribuer par erreur la valeur de la berline — mesuré, pas
  supposé (le premier jet rendait bien 2,9 €/km comme tarif serveur du
  van). Chaque regex capture désormais la clé ET le JSON dans le MÊME
  match, bornée par le `;` de fin d'instruction. `test-doc.mjs` porte le
  même correctif pour son propre contrôle d'accord client/serveur.
- Migration : `supabase/migrations/20260928120000_tarif_unifie.sql`. Comme
  toujours, elle doit être **rejouée en production** (workflow « Appliquer
  une migration Supabase ») pour que la base porte réellement 2,90/4,70 —
  tant que ce n'est pas fait, le site s'appuie sur son repli, qui porte
  déjà les mêmes chiffres.


## Le prix des pages dédiées — 14 octobre 2026

**La demande.** En validant les pages anglaises, Barbaros a écrit : « je veux
pouvoir modifier aussi les prix de chaque page dédiée dans admin », puis, à la
question posée : « pour les pages que l'on crée pour les touristes, afficher un
prix plus cher ». Le premier jet ne donnait qu'un pourcentage par page ; en
voyant la capture, il a ajouté : « je dois pouvoir aussi modifier au km
n'importe quelle page ». La règle du 28 septembre (« tout le monde a le même
prix quand il tape une adresse ») vaut donc toujours, SAUF pour un client
arrivé d'une page dédiée dont il a réglé le prix.

**Ce qui vaut.** Par page de la liste `ORIGINES`, trois cases : un
pourcentage ajouté au tarif du site, un tarif au km berline, un tarif au km van.
Pour chaque gamme : le tarif au km de la page s'il est saisi, sinon le tarif du
site majoré du pourcentage, sinon le tarif du site. Le « aussi » a été lu
littéralement : le pourcentage reste (il suit tout seul un changement du tarif
général), le tarif au km s'y ajoute et l'emporte, gamme par gamme. Sous les
cases, l'écran écrit le tarif au km que la page applique VRAIMENT, calculé par
la fonction du moteur (`tarifKmPage`) — une règle à deux étages ne se relit
pas, un « Berline 3,75 € · Van 5,41 € » si.
- **Rien par défaut** : rien ne change en ligne tant qu'il ne l'a pas réglé, et
  on ne choisit pas un prix à sa place (« ne pas deviner sur un prix »).
- **Seul le tarif au kilomètre change** : ni le minimum (une course de 5 km
  reste à 35 €), ni un forfait de flyer, ni la pancarte, ni une demande « tarif
  à confirmer ». La règle prend la place de l'ancienne majoration de nuit dans
  l'ordre fixé : kilométrage → arrondi → plancher.
- **Bornes** : pourcentage entier de 0 à 100, tarif au km de 0,50 € à 20 €
  avec deux décimales au plus. Une case vide ou à 0 ne règle rien. Un tarif de
  page PLUS BAS que celui du site est permis ; s'il descend sous la ligne
  droite × le tarif du site, `deposer-course` marquera la demande « Prix à
  vérifier » (il signale, il ne refuse jamais).
- **Le tarif majoré est arrondi au centime EN ENTIERS** (`tarifKmMajore`) :
  2,3 × 105 vaut 241,4999… en virgule flottante, et donnait 2,41 au lieu de
  2,42 €/km — 81 couples tarif × pourcentage sont dans ce cas, mesuré. Le
  premier commentaire écrit prenait 2,90 × 115 pour exemple : faux, ce produit
  tombe juste. C'est la recherche exhaustive qui l'a montré.
- **Le prix affiché est le prix facturé** : tout passe par `prixGamme`, donc la
  liste des gammes, le récapitulatif, le bon, le message et la demande.
- **Les replis vont tous dans le sens du client** : sans `src` (rechargement,
  lien partagé), vue absente (migration pas appliquée), panne, valeur hors
  bornes : le prix du site. « Voir mon prix » attend la lecture (`tarifsLus`) :
  sans ça, un client rapide aurait vu 140 € puis payé 170 €.

**Le serveur.** L'admin écrit la ligne `prix_pages` de `parametres_commerciaux`
(déjà réservée à l'admin en écriture) :
`{"en-cdg": {"pourcentage": 20, "par_km_centimes": {"berline": 350}}}`. Il
RELIT d'abord la ligne et n'y change que les cases modifiées : l'écran a pu se
dessiner sur une lecture publique ratée, tout vide, et réécrire ce vide aurait
effacé un réglage fait ailleurs. Une case vidée retire son prix. Le visiteur lit
`prix_pages_publics` (`20261014010000_prix_pages.sql`) : la page, son
pourcentage et ses deux tarifs au km, rien d'autre ; une valeur hors bornes
vaut NULL, une page sans rien de valide n'a pas de ligne. `jsonb_each` ne
reçoit qu'un objet et chaque nombre est lu dans un CASE — sinon une ligne mal
écrite faisait tomber la vue entière. Vue en lecture seule, vérifiée par la
migration elle-même. Le premier jet s'appelait `majoration_pages` /
`majorations_pages_publiques` ; renommé avant toute mise en production.

**Le droit.** Différencier le prix selon la page n'est pas interdit (le
règlement européen sur le blocage géographique exclut les services de
transport) ; ce qui l'est, c'est de facturer autre chose que le prix affiché.
Les CGV (art. 4, FR et EN) disent que le tarif kilométrique peut différer selon
la page et que le prix affiché avant l'envoi s'applique — sans chiffre.

**Épreuves.** `test-prix-pages` (site construit, montants calculés à la main)
tombe sur neuf falsifications : règle retirée du calcul, arrondi en virgule
flottante, minimum majoré, écriture sans relecture, lecture non attendue par
« Voir mon prix », tarif au km de page ignoré, pourcentage passé avant le tarif
au km, bornes du tarif au km retirées, case vidée qui garde son prix.
`supabase/tests/prix-pages-apres.sql` tombe sur huit migrations faussées
(droits d'écriture laissés, conversion sans CASE, `jsonb_each` sur un tableau,
`security_invoker`, une borne retirée sur chacune des trois colonnes, ligne
désactivée lue). Deux de ces falsifications passaient au premier jet de
l'épreuve : il manquait une page où une valeur valide côtoie une valeur hors
bornes.
