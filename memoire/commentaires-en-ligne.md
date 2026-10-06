# Les commentaires de travail retirés du site publié — archive

> **Ceci est une archive, figée le 6 octobre 2026.** Elle raconte comment le
> nettoyage des notes de travail a été construit (28 septembre) puis étendu
> à l'admin, à la réception, aux feuilles de style et à `robots.txt`
> (4 octobre). Ce qui reste vrai aujourd'hui est dans `CLAUDE.md`, section
> « LES COMMENTAIRES DE TRAVAIL NE PARTENT PLUS EN LIGNE ». Rien n'a été
> réécrit ci-dessous.

## LES COMMENTAIRES DE TRAVAIL NE PARTENT PLUS EN LIGNE

28 septembre 2026, à sa demande, après un audit qui a trouvé pire que le
mélange public/admin d'un seul fichier : `index.html` publié portait
**145 commentaires (~68 Ko)** lisibles par « Afficher le code source » —
comment marche la sécurité de l'espace exploitant et ses limites, d'anciennes
failles trouvées et corrigées, la grille tarifaire hôtel. C'est une carte
pour qui cherche une faille, sans même un mot de passe à deviner.
- `.github/scripts/masquer-commentaires.mjs` les retire, **mais seulement de
  la copie posée dans `site/`**, en toute dernière étape de `construire.sh`.
  Le dépôt garde ses commentaires intacts — c'est la mémoire du projet,
  elle sert aux prochaines sessions.
- **AUCUNE DÉPENDANCE AJOUTÉE, ET C'EST DÉLIBÉRÉ** — même règle que la
  régression visuelle. Le premier jet s'appuyait sur le paquet
  « typescript » pour lire vraiment le JavaScript (éviter qu'une expression
  régulière naïve se fasse piéger par un `/` de chaîne ou de regex, comme
  `/\D/g`). **Ça aurait cassé `pages.yml` en silence** : ce workflow ne fait
  AUCUN `npm install` avant de construire, et le paquet n'existait que sur
  cette machine, posé à la main. Trouvé par la suite de tests elle-même
  (`test-admin-papiers` échouait en reconstruisant le site), pas en
  relisant. Le module final ne dépend que de `node:fs` : il relit le
  JavaScript caractère par caractère et retient ce qui précède chaque
  « / » pour savoir si c'est une division ou le début d'une expression
  régulière — la même règle qu'un vrai analyseur, ramenée à ce dont on a
  besoin ici.
- Les commentaires HTML (`<!-- -->`) sont retirés par expression régulière
  simple. **Le CSS, non** : cette ligne disait qu'il en allait de même, et
  c'était faux — une chaîne CSS peut contenir « /* » (`content:"/*"`), une
  adresse aussi (`url(/*.png)`). `nettoyerCss()` recopie donc chaînes et
  `url(…)` telles quelles (4 octobre 2026). Sur les pages déjà nettoyées, le
  résultat est resté identique octet pour octet : ça ne tenait que par chance.
- **GARDE-FOU** : si un `<script>` ou `<style>` contient littéralement
  `<!--`, le nettoyage s'arrête plutôt que de deviner — cette séquence
  pourrait tromper le retrait des commentaires HTML qui suit.
- Validé contre la **suite complète** (28 suites navigateur + doc +
  notification + push + facade unifiée), toutes au vert après retrait.
- **L'ADMIN ET LA RÉCEPTION N'Y ÉTAIENT PAS** (corrigé le 4 octobre 2026,
  Barbaros : « comme tu veux »). Leurs pages sont fabriquées par
  `construire-espaces-hotel.mjs`, ajouté APRÈS cette étape, et personne ne
  les avait mises dans la liste : `/ela-admin/` partait en ligne avec 841
  blocs de commentaires (813 Ko, 485 Ko sans), la réception avec 578. Sont
  nettoyées maintenant : `/ela-admin/`, `/easyhotel-reception/`,
  `/reception/*/`, `/exploitant/` et `/easyhotel-client/`.
  - **Prouvé sans s'en remettre au nettoyeur** : l'analyseur de TypeScript
    (installé sur la machine, jamais dans la construction) a comparé l'arbre
    de chaque script avant et après — 157 558 nœuds, zéro écart — et il
    voit bien un seul caractère changé dans une expression régulière.
  - `test-nouveau-bascule` prend des passages des VRAIS commentaires des
    sources et exige qu'aucun ne soit en ligne. Il ne cherche pas « /* » :
    une chaîne peut le contenir. Avec l'ancienne recette, il tombe sur onze
    contrôles. **Il tourne maintenant en CI** (« Contrôle de l'admin
    retenu ») : hors CI, l'oubli d'une ligne dans la recette passait sans
    bruit — c'est exactement ce qui était arrivé.
  - **TROIS TROUS DE CE CONTRÔLE, TROUVÉS PAR UNE RELECTURE INDÉPENDANTE ET
    BOUCHÉS AVANT LA FUSION.** Un 404 ou une AUTRE page passait au vert — une
    page vide ne contient aucune note : il exige 200 et la marque de la
    bonne page (`data-ela-space`, ou le titre). Les commentaires `//` n'étaient
    pas prélevés : ils sont tous en FIN de ligne dans la page, il les prend
    là, précédés d'un espace (une adresse `https://` n'en a pas). Et une
    liste de sept adresses survit à la page qu'on ajoute : il passe aussi au
    crible TOUTE page publiée qui porte `data-ela-space`, où qu'elle soit.
    Chaque trou a été rouvert exprès et le fait tomber en nommant la page.
  - **LES FEUILLES DE STYLE ET `robots.txt` ONT SUIVI** (4 octobre 2026,
    Barbaros : « oui »). Ils étaient copiés tels quels : `robots.txt`
    expliquait en clair que `?h=` donne des forfaits plus bas que le site et
    que la réception ouvre l'historique des clients d'un hôtel ;
    `hotel-engine-polish.css` (23 blocs) disait que la photo de l'en-tête
    vient du site d'easyHotel sans accord écrit. `construire.sh` passe
    maintenant `site/*.css` — un motif : une feuille ajoutée demain est prise
    d'office — et `site/robots.txt` au nettoyeur.
    - **`robots.txt` garde ses lignes vides** : un vieux robot y lit la fin
      d'un groupe, les retirer changerait ce que le fichier interdit. On ôte
      les lignes de note et la fin de ligne après « # » (RFC 9309).
    - **Le contrôle compare ce que lit la machine, pas le texte** : les
      règles CSS par le navigateur lui-même (CSSOM, 69 et 141 règles, à
      l'identique), et les consignes de `robots.txt` avec la place des
      lignes vides. Retirer une note en emportant une règle serait pire que
      la note. Quatre défauts rouverts exprès le font tomber.
    - **Restent, et c'est délibéré** : `_headers` (Cloudflare le lit, et un
      réglage qu'on ne peut pas éprouver d'ici garde son défaut — les
      en-têtes se lisent de toute façon dans chaque réponse), `carte/`
      (la licence de Leaflet doit rester avec lui), et la ligne « page
      construite automatiquement » de `/demos/`, qui ne dit rien d'utile à
      personne.
- **Le cloisonnement complet des écrans admin/réception hors du fichier
  public n'a PAS été fait** : les données restent protégées côté serveur
  (RLS, `est_exploitant()`), seul le code fuyait. C'est un chantier plus
  gros, mis de côté à sa demande pour l'instant.
