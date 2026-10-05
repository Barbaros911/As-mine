# Asmine — mémo pour Claude

Ce fichier est lu automatiquement au début de chaque session sur ce dépôt.
Il évite de redemander les mêmes règles à chaque fois.

> ## ⚠️ LIRE `TEAM_RULES.md` D'ABORD
>
> **Les règles communes de l'équipe — qui décide quoi, la source de vérité, la
> chaîne jusqu'à la production, les tests, les secrets, comment se parler avec
> ChatGPT — sont dans `TEAM_RULES.md`. Une page. En cas de contradiction avec
> ce fichier-ci, c'est `TEAM_RULES.md` qui dit vrai.**
>
> Ce que tu lis ici est **la mémoire du produit** : l'historique des décisions
> et les pièges rencontrés. Ça vaut cher — chaque section explique POURQUOI une
> chose est comme elle est, et ça évite de refaire une erreur déjà payée.
>
> **Mais une note vieillit.** Le 15 septembre 2026, ce fichier annonçait encore
> un code d'accès mort depuis des jours : des heures de travail sur une carte
> périmée. **Vérifier avant de s'en servir pour refuser quelque chose** — un
> `grep` dans le dépôt tranche plus vite qu'une note.
>
> **CE FICHIER A UN PLAFOND** (4 octobre 2026, décidé avec Barbaros). Il
> faisait 455 Ko — sept mille lignes, lues en entier au début de CHAQUE
> session, avant son premier mot — et grossissait de 16 Ko par jour. Désormais
> une décision tient ici en **trois lignes** : ce qui est vrai aujourd'hui,
> ce qu'il ne faut jamais faire, et pourquoi en une phrase. Son **histoire**
> — quand, comment on l'a trouvé, ce qui a été essayé — va dans `memoire/`,
> un fichier par sujet, qu'une session ne lit que si le sujet revient.
> `test-doc.mjs` refuse que ce fichier regrossisse : pour y écrire, on range
> d'abord le sujet qu'on touche, **dans la même PR** — jamais une PR à part.
> Le plafond ne monte jamais ; il descend à chaque rangement.
> **Ne jamais lire `index.html` d'un bloc** (900 Ko, deux fois ce mémo) :
> chercher dedans, quelques lignes de contexte à la fois.

Ce dépôt sert à **deux activités distinctes**. Lire d'abord laquelle est
demandée :

| Activité | Fichiers | Branche |
|---|---|---|
| **Asmine**, l'application de réservation VTC | racine (`index.html`, `sw.js`…) | la branche de travail de la session |
| **Sites vitrines** pour des commerçants | `sites/<client>/` | `claude/session-creation-without-asmine-to9axd` |

## La règle absolue : ne jamais toucher Asmine *en travaillant sur un autre site*

`index.html`, `sw.js`, `manifest.webmanifest`, `icon.svg`,
`icon-maskable.svg`, `robots.txt`, `sitemap.xml` à la racine sont
l'application de réservation. Ne jamais les modifier pour créer ou tester
un autre site. Toute vérification se fait par comparaison de hachage
(`md5sum`) avant/après.

Cette règle ne s'applique évidemment pas quand la demande porte sur
Asmine lui-même — voir la section dédiée en fin de fichier.

## Créer un nouveau site

1. Copier `sites/_modele/` vers `sites/<nom-du-client>/` (minuscules,
   tirets, pas d'espaces ni d'accents dans le nom du dossier).
2. Tout ce que le site utilise (images, styles, scripts) reste **dans ce
   dossier**, appelé en chemin relatif (`./photo.jpg`), jamais absolu.
3. Mettre `<meta name="robots" content="noindex, nofollow">` tant que le
   client n'a pas validé — la page contient souvent ses vraies coordonnées
   et ne doit pas sortir dans Google à sa place. Le retirer une fois
   validé.
4. Ne jamais inventer d'avis clients ni de chiffres commerciaux : les
   marquer « à compléter » ou laisser l'emplacement vide. Publier de faux
   avis est une pratique commerciale trompeuse, sanctionnée par la loi.
5. Tester avant d'annoncer que c'est prêt — voir plus bas.
6. L'adresse publiée sera `.../As-mine/<nom-du-client>/`. La page
   `.../As-mine/demos/` liste tous les sites automatiquement ; rien à
   faire pour ça.

## Tester avant de dire qu'un site est prêt

Utiliser la compétence `webapp-testing` : lancer un serveur local, vérifier
avec Playwright sur ordinateur (1280px) et sur téléphone (390px) :
- aucun débordement horizontal
- aucune erreur JavaScript
- les boutons/menus cliquables sont vraiment cliquables (attention aux
  éléments qui se superposent en mobile)
- les liens de contact (tel:, WhatsApp) sont corrects

Ne pas se contenter de lire le code : ouvrir vraiment la page.

## Comment le site est construit et hébergé

**`construire.sh` est la SEULE recette.** Il assemble le dossier `site/` à
partir du dépôt, et il est appelé par GitHub Actions **et** par Cloudflare
Pages. Ne jamais recopier ses étapes dans un workflow : deux recettes
finissent toujours par diverger, et on s'en aperçoit le jour où l'une publie
un fichier que l'autre a oublié. La liste des fichiers copiés y est
**explicite** — un `cp *` publierait un jour les suites de tests ou le
classeur de suivi. `site/` est ignoré par git : il se reconstruit.

**Bascule vers Cloudflare Pages** (septembre 2026, décidée après une panne de
GitHub : les visiteurs voyaient la licorne rose de GitHub pendant que le site
était intact). Marche à suivre complète dans `CLOUDFLARE.md`.
- Réglages Cloudflare : branche `main`, commande `sh construire.sh`, dossier
  de sortie `site`.
- **`_headers` ne sert QUE sur Cloudflare.** GitHub Pages ne sait pas définir
  d'en-têtes HTTP — c'est pour ça que `frame-ancestors` ne pouvait pas être
  appliqué : les navigateurs l'ignorent dans une balise `<meta>`.
- **LE DOMAINE EST DÉJÀ CHEZ CLOUDFLARE** (mesuré le 5/10/2026 : serveurs
  de noms `jill`/`jarred.ns.cloudflare.com`). Le courrier reste chez IONOS
  (MX `mx00`/`mx01.ionos.fr`, SPF IONOS) : **ne jamais toucher ces lignes**,
  ni `google-site-verification`. L'ancienne consigne « ne pas déplacer les
  serveurs de noms » est caduque : `memoire/cloudflare-dns.md`.
- **Cloudflare tombe aussi.** Plus rarement et moins longtemps, mais aucun
  hébergeur ne garantit 100 %. Ne pas le vendre comme une immunité.

**NE JAMAIS CHANGER UN RÉGLAGE PAR DÉFAUT QU'ON NE PEUT PAS ÉPROUVER.**
Règle posée le 4 septembre 2026, après une erreur. `html_handling` avait été
mis à `"none"` pour que `/admin.html` garde son extension — une intuition,
invérifiable depuis cette machine, qui n'a aucun accès réseau vers Cloudflare.
`"none"` ne sert que les chemins **exacts** et supprime du même coup la
résolution des **dossiers** : `/demos/` affichait le site de réservation à la
place de la galerie, et la racine `/` ne fonctionnait que par le repli
« adresse inconnue ». Barbaros l'a vu au premier essai.
Le défaut (`auto-trailing-slash`) était correct. **Quand on ne peut pas
tester, on garde le défaut** et on ne le change que sur un symptôme constaté.

**LES TROIS ADRESSES À ÉPROUVER APRÈS CHAQUE DÉPLOIEMENT CLOUDFLARE** — elles
couvrent les trois mécanismes de service, et c'est la seule façon de voir une
erreur de configuration depuis l'extérieur :
| Adresse | Ce qu'elle éprouve | Attendu |
|---|---|---|
| `/` | la racine | le site de réservation |
| `/admin.html` | un fichier exact | demande le code |
| `/demos/` | **un dossier** | la galerie des trois sites vitrines |
Si `/demos/` affiche le site de réservation, c'est `html_handling` qui est en
cause — pas la galerie.

## Git et publication

**Rien ne part sans que Barbaros l'ait vu.** Règle posée en août 2026, après
deux fusions passées en ligne avant qu'il ait pu regarder. L'ordre est
toujours le même : faire le travail, **montrer** (capture d'écran, pas une
description), **attendre son accord**, et seulement ensuite pousser. Cela
vaut aussi pour ce qui est « visible par un client » : c'est justement ce
qui mérite d'être vu avant, pas après. Ne jamais lire l'urgence d'un lien à
envoyer comme une autorisation de fusionner.

**LA BRANCHE « VESTIGE » A ÉTÉ SUPPRIMÉE** (audit du 15 septembre 2026, 53
branches ramenées à 15). Ce paragraphe a nommé pendant des jours une branche
qui n'existait plus, dans un tableau qui disait où travailler : une consigne
qui vise le vide fait repartir d'un endroit quelconque. `test-doc.mjs`
vérifie désormais que toute branche nommée ici existe encore.
**LA LEÇON, ELLE, N'A PAS D'ÂGE.** `git log main..branche` montrait deux
commits d'avance et trompait — c'est `git diff main branche` qu'il fallait
lire : la branche avait divergé AVANT tout le nouveau site, et la fusionner
aurait **supprimé** les photos, les suites de tests et les corrections de
`construire.sh`. Un compte de commits ne dit pas ce qu'une fusion ferait.
Et la règle qui vaut pour tout ce fichier : **vérifier avant de croire une
note d'ici**. Elle a mis des mois à s'écrire, elle vieillit en un soir.

- Développer sur la branche `claude/session-creation-without-asmine-to9axd`,
  jamais directement sur `main`.
- Toujours vérifier `git branch --show-current` avant un `git push` — déjà
  fait l'erreur de pousser vers le mauvais nom de branche une fois.
- Une fois l'accord donné : ouvrir la pull request **et la fusionner** —
  sans la fusion, le lien envoyé au client ne fonctionne pas.
- Un changement interne (compétences, configuration, outillage, rien de
  visible en ligne) : même règle, montrer et demander avant.
- Ne jamais committer et pousser dans le même appel : les faire l'un après
  l'autre. Un appel qui mélange les deux a déjà été bloqué par le
  classificateur de sécurité.
- `.claude/` (compétences, config) n'a aucun effet sur le site publié : le
  workflow `.github/workflows/pages.yml` ne copie que les fichiers qu'il
  énumère explicitement.

## Le dossier .claude/skills/

50 compétences installées, aucune ne nécessite de compte externe. Le détail
de chacune est dans `.claude/skills/README.md`. Ne pas re-proposer d'en
installer d'autres sans que ce soit demandé.

## Ton et langue

Répondre en français, simplement, sans jargon technique non expliqué.
Expliquer avec des exemples concrets plutôt que des concepts abstraits.
Se placer systématiquement du point de vue d'un professionnel expérimenté
— design, développement, conseil — et pas d'un exécutant : dire ce qui ne
va pas, proposer, trancher.

---

# Asmine — ce qui ne change pas

## Ce qu'est Asmine

Plateforme de mise en relation entre des clients et des chauffeurs VTC
indépendants, à Paris et en Île-de-France. Exploitée par Barbaros.

**Intermédiaire, pas transporteur.** Le transport est exécuté par le
chauffeur, sous sa licence, son assurance et sa carte professionnelle.
D'où la règle qui structure tout le produit : le **bon de réservation** ne
porte que l'identité d'Asmine, la **facture** porte le SIRET du chauffeur.

Barbaros a intégré un **groupe WhatsApp de plus de 800 chauffeurs** pour
placer les courses qu'il ne peut pas assurer lui-même.

**LES PHOTOS.** Ce qui suit vaut pour toute image qu'on poserait un jour,
sur le site ou ailleurs :
- **Ne jamais installer une photo sans savoir d'où elle vient.** Google
  n'héberge rien : chaque image appartient à un photographe. Contrefaçon,
  L335-2 CPI — en pratique, une lettre réclamant plusieurs milliers d'euros.
- Sources propres : **Unsplash, Pexels, Pixabay**. Une vraie photo Unsplash
  fait au moins 1000 px de large et pèse plus de 200 Ko ; une image de 500 px
  pour 60 Ko est la vignette d'une page de résultats, pas un téléchargement.
- Trois pièges rencontrés : le **filigrane Shutterstock** (preuve que l'image
  n'est pas payée) ; le **plafond de Chagall** à l'Opéra, protégé jusqu'en
  2055 ; et surtout — la tour Eiffel est libre de droits **de jour**, mais son
  **éclairage nocturne est une œuvre protégée**, donc pas de tour illuminée.
- Deux vues de Disneyland ont été écartées pour la même raison : filigrane
  SORTIRAPARIS.COM sur l'une, château et architecture Disney sur l'autre.

**Incrémenter `CACHE` dans `sw.js` à CHAQUE changement visible.** Oublié une
fois : Barbaros a publié et n'a rien vu changer sur son téléphone. Le HTML
est servi « réseau d'abord », mais les téléphones qui ont **installé
l'application** gardent le reste.

## Règles à ne jamais enfreindre

1. **Aucun faux avis client.** `AVIS` ne contient que des avis réellement
   reçus. Faux avis = pratique commerciale trompeuse (L132-2 Code conso. :
   2 ans, 300 000 €, portés à 10 % du CA). Ne pas non plus n'afficher que
   les bons avis : c'est la même infraction.
2. **L'annonce diffusée au groupe ne contient jamais** le nom, le
   téléphone ni le numéro de chambre du client. Diffuser ça à 800
   personnes serait une transmission de données personnelles à des tiers
   non nécessaires (RGPD 5.1.c). Ces éléments partent en privé, au seul
   chauffeur retenu.
3. **Le dépôt est public.** Jamais de données clients réelles dedans. Le
   classeur `suivi-as-mine.xlsx` n'est committé que vide.
4. **Un VTC n'a pas le droit d'avoir un taximètre.** Le prix doit être
   connu ou calculable **avant** le départ. Une course à destination
   ouverte doit donc annoncer la **grille** (le tarif au kilomètre en
   vigueur) et non « prix à définir ».
5. **En confiant des courses à des tiers, Asmine est une centrale de
   réservation** (Code des transports L3142-1 et s.) : obligation de
   pouvoir prouver que chaque chauffeur a carte professionnelle,
   inscription au registre VTC et assurance.

## Conseils déjà donnés — les tenir pour acquis

- **Ne pas diffuser à 800 inconnus par défaut.** Deux cercles : un noyau
  de 5 à 10 chauffeurs vérifiés qui reçoit la course en premier, et le
  grand groupe en réservoir si personne ne prend.
- **Piste commerciale : les hôtels de la zone CDG.** Le numéro de chambre
  existe pour eux. Coût zéro, testable en une semaine.
  **easyHotel EST partenaire depuis septembre 2026** — confirmé par Barbaros.
  La note précédente disait le contraire (« ce n'était qu'un cas de test de
  recherche d'adresse ») : c'était vrai jusqu'à ce qu'il signe. **Une note de
  ce fichier vieillit ; vérifier auprès de lui avant de s'en servir pour
  refuser quelque chose.**
- **Ne pas promettre une marque précise** (« Mercedes Classe E ») : si un
  autre véhicule se présente, c'est trompeur. Dire « berline » ou, à la
  rigueur, « type … ou similaire ».
- Ne pas proposer d'illustrations **ni d'emojis** de voitures : essayé
  quatre fois, refusé quatre fois. Ne plus en reparler sans photos réelles.

## Ce qui est décidé, ce qui ne l'est pas

**Décidé en septembre 2026** : **il ne conduit pas, il place seulement**
(« Je place seulement »). Elatransfer est donc une centrale de réservation,
et le taux de commission se règle désormais **par chauffeur**, dans le
carnet — il n'y a plus de taux global à trancher dans le code.

**Pas décidé** : statut juridique et **SIRET de Barbaros — À CRÉER, c'est le
point bloquant** · volume visé · clientèle cible (particuliers / hôtels /
entreprises) · budget · règle du temps d'attente.

**L'histoire de l'ancien site** — sa grille, ses packs, le délai de 3 h,
les codes promo, tout ce qui a été essayé puis retiré entre août et
septembre 2026 — est dans `memoire/ancien-site.md`, figée telle qu'elle
était écrite. Ne l'ouvrir que si un sujet d'alors revient. Pour savoir ce
que fait le site aujourd'hui, c'est la section « LE SITE » qui dit vrai.

---

# LE SITE — `index.html`

**LA BASCULE EST FAITE** (6 septembre 2026, à sa demande : « Non je veux que
les gens voit mon nouveau site »). `nouveau.html` est devenu `index.html` :
c'est LUI que voient les clients à la racine du domaine. Tout ce qui suit
le décrit. L'ANCIEN site, qui n'existe plus, est décrit dans
`memoire/ancien-site.md` : il sert à comprendre d'où viennent les décisions,
pas à savoir ce que fait le site aujourd'hui. En cas de contradiction,
**c'est cette section-ci qui dit vrai**.

**CE QUI A ÉTÉ SUPPRIMÉ À LA BASCULE, ET POURQUOI ON NE LE REMET PAS :**
- l'ancien `index.html`, `styles.css`, `tailwind.config.js`,
  `tailwind.src.css` ;
- les neuf suites test.mjs … test9.mjs et test-hors-ligne.mjs — elles
  éprouvaient un fichier qui n'existe plus. (Sans accents graves : c'est la
  convention du fichier pour une suite qui n'existe plus, et `test-doc.mjs`
  s'en sert pour distinguer un souvenir d'une consigne.)

**IL N'Y A PAS DE PAGE DE SECOURS, ET C'EST DÉLIBÉRÉ.** Garder l'ancien
site en ligne « au cas où » laisserait une page trouvable — signet, lien
partagé, résultat de recherche — qui annonce une **grille de prix
périmée**. Chez Elatransfer le prix est ferme, donc opposable : un client
qui réserve à 1,75 €/km sur une page encore servie a un prix qu'on doit
tenir. Le retour en arrière passe par **`git revert` de la bascule**, où
tout le code est conservé, pas par un fichier laissé traîner.

**IL NE GARDE RIEN DE L'ANCIEN.** Sa consigne, deux fois : « Je ne veux pas
que le nouveau site ai lapaaraence de lancien, ne garde rien de lancien
écriture mise etc », puis « Tu ne garde rien de lancien ». Ne pas recopier
une règle de l'ancien site sans qu'il la redemande — c'est une réécriture,
pas une refonte.

## La grille du nouveau site (septembre 2026)

| Gamme | Au kilomètre | Minimum |
|---|---|---|
| Berline (4 places) | 2,90 € | 35 € |
| Van (7 places) | 4,70 € | 50 € |

**LE MINIMUM BERLINE EST À 35 €** (4 octobre 2026, Barbaros : « Oui le 35
c'est moi »). Il l'avait réglé en production depuis l'admin ; le repli
`GAMMES`, ce tableau et la source serveur du dépôt disaient encore 30 €, et
les trois contrôles restaient verts parce qu'ils se comparaient entre eux.
**Aucun contrôle ne lit la production** : c'est la première suite branchée
sur le vrai serveur (test-nouveau-exploitant, en CI) qui l'a montré.
- **Le plancher n'est plus une dizaine, et c'est voulu** : le plancher a le
  dernier mot. Tout trajet berline de 12,06 km ou moins (2,90 × km ≤ 35)
  coûte 35 € ; au-delà, rien ne change. Ne pas le « corriger » en 30 ou 40.
- **Pourquoi le repli comptait** : Réglages → Tarifs se remplit depuis
  `GAMMES` quand la lecture du serveur échoue. Un appui sur « Enregistrer »
  aurait alors réécrit 30 € en production, en silence.
- La source du dépôt est `20261004000000_minimum_berline_35.sql`, une
  écriture **conditionnelle** : sans effet en production, sans effet sur un
  tarif réglé depuis l'admin. Elle n'a pas à être appliquée.

**CE TABLEAU A MENTI PENDANT DES JOURS** (corrigé le 16 septembre 2026). Il
annonçait encore 2,35 et 4,08 €/km alors que la PR #123 les avait portés à
2,65 et 4,00. Personne ne pouvait le voir : un document ne se trompe jamais
bruyamment. Et ce n'est pas une note de confort — c'est le chiffre qu'on
annonce au téléphone, celui qu'on recopie dans les CGV, et le prix est
**ferme donc opposable**. `test-doc.mjs` compare désormais ce tableau à
`GAMMES` à chaque construction : une grille qui diverge de la doc **empêche
la publication**. Le contrôle a été écrit APRÈS le mensonge, et c'est sur
lui qu'il a été éprouvé.
**Vérifié au passage** : les CGV ne portent toujours aucun chiffre — elles
décrivent la mécanique (« un tarif kilométrique propre à chaque gamme »).
C'est ce choix d'écriture ancien qui a évité que le mensonge devienne
contractuel. Ne pas y écrire de tarif chiffré.

- **Plus de prise en charge.** Le prix n'est qu'un kilométrage : avec un
  plancher et un arrondi à la dizaine, un forfait de départ ne se voyait
  plus dans le résultat.
- **L'ARRONDI EST LE SIEN, PAS CELUI DE L'ÉCOLE** : à la dizaine, et le
  **5 pile DESCEND**. 45 → 40, 46 → 50. Le code compare le reste à 5 avec
  un `>`, jamais un `>=` — sur un 5 pile, l'arrondi ordinaire ferait payer
  10 € de plus que l'annonce faite au téléphone. Et il passe par une
  division entière, pas un modulo : `102,06 % 10` rend
  `2,0600000000000023` et afficherait `100,000000001 €`.
- **L'ordre est fixé** : kilométrage → majoration de nuit → arrondi →
  plancher. Arrondir avant de majorer redonne un prix qui n'est plus une
  dizaine ; majorer après le plancher ferait payer 42 € une course
  annoncée à 35 €. Le plancher a le dernier mot.
- **IL N'Y A PLUS DE MAJORATION DU TOUT** (septembre 2026) — voir la
  section dédiée plus bas. Le reste inchangé : TVA 10 % incluse, prix ferme,
  zone de 90 km autour de Paris.
- Barbaros écrit souvent **« van » là où il veut dire « berline »** — trois
  fois de suite sur cette grille. Ne pas deviner sur un prix : demander.

## Ce qui est propre au nouveau site

- **Deux gammes seulement**, Berline et Van. Les clés `berline` et `van` ne
  changent jamais : elles sont dans l'historique.
- **Deux langues**, français et anglais. Le site public s'ouvre en
  français ; les pages d'hôtel suivent le navigateur, et l'anglais y est le
  repli (voir « LE SITE SE PRÉSENTE PAR SA MARQUE »). Ajouter une
  langue veut dire écrire ~110 phrases à la main ; pas de traduction
  automatique sur un site où le prix engage.
- **Le mode de règlement est demandé au client** (espèces ou carte), rien
  n'est présélectionné, et le choix est obligatoire. **On demande, on
  n'explique pas** : la phrase qui justifiait la question par le terminal
  du chauffeur a été retirée à sa demande. La réponse part dans le message
  WhatsApp, sur le bon et sur la fiche de l'exploitant.
- **Le message WhatsApp fait neuf lignes**, et sa STRUCTURE compte autant
  que son texte : les deux premières valeurs « … : … » sont les adresses,
  le **dernier montant en euros est le prix** — d'où la ligne « Paiement »
  placée AVANT « Prix » — et la dernière ligne est « nom — téléphone ».
- **Pas de documents légaux pour l'instant**, à sa demande. La LCEN les
  impose : le nouveau site ne peut pas prendre la racine sans eux.
- Référence `ELA-AA-MM-XXXXX`, jamais `ASM` : ASM venait du nom du dépôt,
  pas de la marque. **Cinq signes TIRÉS AU SORT depuis le 29/09/2026**, plus
  un compteur : voir « LA RÉFÉRENCE EST TIRÉE AU SORT » en fin de fichier.

**LA BARRE DU BAS N'A QUE TROIS ONGLETS** — Accueil, Mes courses, Contact
(septembre 2026, à sa demande : « Enleve l'icône réserver elle ne sert a
rien »). « Réserver » ouvrait EXACTEMENT le même écran qu'« Accueil », à
la seule différence qu'il posait le curseur dans le champ de départ. Deux
onglets pour un écran, c'est un client qui appuie sur le second, ne voit
rien bouger, et en conclut que le site est cassé.
Conséquence à ne pas manquer : les écrans du tunnel — les prix, le
récapitulatif — se rattachent désormais à **« accueil »** dans la table de
`ecran()`. Sans ce déplacement, plus aucun onglet ne s'allume pendant la
réservation. Un test vérifie que **chaque onglet mène à un écran
différent** : la règle vaut pour tout onglet qu'on ajouterait demain.

## La confirmation qui arrive au client

**LE BON A DEUX VISAGES, un seul vrai à la fois** (septembre 2026, à sa
demande). En attente : « **Demande reçue** — Nous vérifions la
disponibilité d'un chauffeur professionnel. Vous recevrez la confirmation
de votre transfert. » Confirmé : « **Transfert confirmé** », pastille
verte, et un bloc **Chauffeur / Véhicule / Heure** avec un bouton pour
appeler le chauffeur. Afficher « en attente » sur une course déjà
attribuée fait rappeler un client qui n'a rien à demander ; l'inverse
promet une voiture qu'on n'a pas.

**C'EST LE LIEN QUI PORTE LA RÉPONSE, et ce n'est pas un choix de
confort.** Le serveur reçoit les demandes, mais sa règle de sécurité
interdit la LECTURE aux visiteurs anonymes — et il FAUT qu'elle
l'interdise : une lecture ouverte exposerait les noms, téléphones et
adresses de tous les clients. Le site ne peut donc pas aller demander
« ma course est-elle confirmée ? ». Barbaros confirme, appuie sur
**« Prévenir le client »**, WhatsApp part sur le numéro du client avec un
lien `?ok=`. Le client l'ouvre : son bon passe au vert.
- **CE QUE LE LIEN PORTE, ET RIEN D'AUTRE** : la référence, le prénom du
  chauffeur, son téléphone, le véhicule, l'heure. **Jamais le nom ni le
  numéro du client, jamais les adresses** — un lien se transfère, et ce
  qu'il porte se lit (RGPD 5.1.c). Quatre contrôles le verrouillent.
- Encodé en **base64url** : le `+`, le `/` et le `=` du base64 ordinaire
  se font manger ou réécrire en route par les messageries.
- **Le paramètre est effacé de la barre d'adresse** après lecture, sinon
  un rafraîchissement rouvre la confirmation par-dessus ce que le client
  était en train de faire.
- **Un lien ouvert sur un appareil qui ne connaît pas la course** affiche
  la seule confirmation : le détail du trajet et le prix sont MASQUÉS
  plutôt qu'affichés en tirets et à 0,00 € — un bon qui annonce zéro euro
  est un bon faux.
- **« Renvoyer ma demande » disparaît** une fois la course confirmée :
  elle est arrivée, quelqu'un y a répondu.

**CONFIRMER ET PRÉVENIR SONT DEUX GESTES, ET ILS LE RESTENT.** Le premier
range la course chez Barbaros, le second la dit au client. Les fondre
enverrait le message avant qu'il ait relu le nom du chauffeur — et un
message parti ne se rattrape pas. « Prévenir le client » n'apparaît que
sur une course **confirmée** ET **avec un numéro** où écrire : un bouton
qui n'envoie rien lui ferait croire que le client est prévenu.

**Le message fait six lignes** : confirmé + référence, chauffeur,
véhicule, heure, numéro du chauffeur, lien du bon. Le trajet et le prix
n'y sont pas — le client les a déjà sur son bon.

**Piège rencontré** : `.bouton-fantome` habille aussi des liens `<a>`, et
une ancre est un élément **en ligne** — `width:100%` n'y fait rien. Le
bouton « Appeler le chauffeur » se posait EN TRAVERS de la ligne
« Heure ». `display:block` corrige, et un test **mesure les rectangles**
plutôt que de relire le CSS.

## Le registre et « Coller une demande »

**COLLER UNE DEMANDE**, en haut du tableau de bord. Quand un client écrit
sur WhatsApp plutôt que de passer par le site, sa demande n'existe nulle
part : le presse-papiers est le transport.
- `lireDemandeCollee()` **ne devine rien aux libellés, il lit la PLACE des
  choses** : la référence en tête, une date en JJ/MM/AAAA HH:MM, les deux
  premières valeurs « … : … » pour les adresses, le **dernier** montant en
  euros pour le prix, la dernière ligne « nom — téléphone ». Un test le
  vérifie avec un message aux libellés anglais.
  **Changer la forme du message client oblige à changer ce lecteur**, et
  inversement — les deux se lisent ensemble.
- **La course entre TOUJOURS en `attente`**, jamais confirmée d'office.
- **Une minuterie de 1,2 s ouvre le champ de repli** : certains navigateurs
  rejettent la lecture du presse-papiers (le `catch` suffit), d'autres
  laissent la promesse **en attente indéfiniment** — sans minuterie, le
  bouton ne fait alors rien du tout, sans un mot.
- Le champ **reste ouvert** après un ajout, vidé : les demandes arrivent
  par trois ou quatre d'affilée.

**LE REGISTRE** (bouton « Registre et résultats ») : la semaine en cours
avec la précédente en rappel, le résultat par semaine / mois / année, le
tableau des chauffeurs, la recherche libre, la sauvegarde JSON, l'export
CSV et la restauration.
- **Les chiffres ne comptent QUE les courses `realisee`.** Une course
  confirmée n'est pas une course faite : la compter ferait prendre des
  promesses pour de l'argent encaissé.
- **La date retenue est celle de la COURSE**, pas de la saisie, sinon les
  semaines se décalent au fil des oublis.
- **La recherche porte sur TOUT le registre**, pas seulement les
  réalisées : quand un client rappelle, c'est sa course à venir qu'on
  cherche.
- **Le CSV est en point-virgule avec un BOM** : Excel français lit le CSV
  au séparateur de sa locale, et une virgule met tout dans une colonne.
- **La restauration AJOUTE et n'écrase jamais** — une course d'ici peut
  avoir avancé depuis la sauvegarde.

## L'affiche des hôtels, et l'encodeur QR

**L'ENCODEUR QR EST ÉCRIT DANS LA PAGE**, pas pris chez un tiers.
`api.qrserver.com` ajouterait une dépendance réseau à une affiche qu'on
imprime une fois, et enverrait l'adresse à quelqu'un qui n'a pas à la
connaître. Mode octet, correction M, **versions 1 à 6** — jusqu'à 106
caractères. S'arrêter à la 6 évite les blocs d'information de version
(obligatoires dès la 7) et garde un seul motif d'alignement.

**UN ENCODEUR NE SE VÉRIFIE PAS TOUT SEUL — LEÇON PAYÉE.** Le premier jet
passait TOUS mes contrôles internes : format relu, masque, zigzag,
Reed-Solomon divisible, dix syndromes nuls. Et il n'était lisible par
**aucun téléphone**. L'information de format était écrite **bit à
l'envers** ; mon décodeur maison reproduisait la même erreur et ne voyait
rien. Seule la comparaison avec un **décodeur indépendant** (`jsqr`, plus
un générateur de référence `qrcode` pour comparer module par module) l'a
montré. `test-nouveau-affiche.mjs` rend le SVG **final** en image et le
décode : sans ça, Barbaros imprimait cinquante affiches dont aucune ne se
scanne.
- Le SVG porte son **`xmlns`** : sans lui il s'affiche dans la page mais
  ne peut plus être chargé comme image ni collé ailleurs.
- **SVG et non canvas** : une affiche s'imprime, un canvas de 200 px sort
  en bouillie sur du papier.
- **À l'impression, seule l'affiche sort** — `visibility:hidden` sur tout
  puis `visible` sur l'affiche (elle s'hérite ; `display:none` sur les
  enfants de `body` emporterait l'affiche avec eux). Sans cette règle, le
  tableau de bord — **noms et téléphones de clients** — partirait sur le
  papier posé au comptoir d'un hôtel.
- **Le nom de l'hôtel voyage EN CLAIR** (`?h=Ibis%20CDG`), pas en
  identifiant : à l'arrivée on le pose dans le champ de départ et la
  recherche d'adresse le retrouve. Un identifiant obligerait à tenir une
  table de correspondance, donc à réimprimer les affiches le jour où elle
  change.
- **On ne choisit PAS l'adresse à sa place** : la liste s'ouvre, le client
  tranche. Une adresse posée d'office enverrait le chauffeur au mauvais
  Ibis.

**LA PROVENANCE EST GARDÉE SUR LA COURSE** (`bon.provenance`), et c'est ce
qui rend l'affiche utile. Sans elle, l'affiche amène des clients et
personne ne sait laquelle travaille : le nom de l'hôtel ne sert qu'à
remplir le champ de départ, et il disparaît dès que le client corrige son
adresse. Un test éprouve exactement ce pire cas — le client CHANGE son
départ, et la provenance reste.
- Elle vit en **`sessionStorage`**, pas dans une variable (le client
  recharge, revient en arrière, laisse l'onglet ouvert la nuit) et pas en
  `localStorage` : elle vaut pour CETTE visite, pas pour toutes les
  réservations qu'il fera ensuite depuis son téléphone.
- Le registre porte **« D'où viennent les clients »** : les **demandes**
  reçues (ce que l'affiche a produit) ET l'argent des seules **réalisées**
  — deux chiffres pour deux questions. Une course sans provenance ne crée
  pas de ligne : un champ vide se lit « venue directe », pas « information
  perdue ».
- La colonne **« Vient de »** est dans l'export CSV, et la recherche du
  registre cherche aussi par hôtel.

## Les documents légaux

Trois documents, en français et en anglais, accessibles depuis **Contact**
sans compte et hors du mode exploitant — la LCEN l'impose, et c'est aussi
ce qu'un client regarde avant de confier un trajet à un inconnu :
conditions générales de vente, mentions légales, politique de
confidentialité.

- Ils viennent de l'ancien site, **adaptés** : la formation du prix y
  décrit la grille réelle (tarif kilométrique, majoration, arrondi à la
  dizaine, montant minimum), la mise à disposition y est dite **non
  réservable en ligne**, et le mode de règlement déclaré par le client y
  engage Elatransfer à envoyer un chauffeur en mesure de l'accepter.
  **Des CGV qui décrivent une autre formation du prix que celle appliquée
  sont pires qu'aucunes CGV** : le prix est ferme donc opposable, et le
  client y trouverait un argument contre nous. Toucher à la grille veut
  dire toucher aux CGV, dans les deux langues.
- Le corps est posé en `textContent`, jamais en `innerHTML` : ce sont de
  longs textes qu'on éditera à la main, parfois copiés d'un document
  d'avocat, et un chevron perdu dedans ne doit pas devenir une balise.
- **Le mandat de facturation n'a pas été repris** : c'est un document
  entre Elatransfer et le chauffeur, il n'a rien à faire côté client.

**PLUS AUCUN TROU, ET C'EST UNE RÈGLE** (6 septembre 2026, à sa demande :
« Enleve les mention legal non complète ou a compléter je ne veux pas de
trous d'incohérence »). Les documents portaient 35 « [À compléter] »
hérités de l'ancien site. Un document qui dit ça à un client ne fait pas
l'effet d'un brouillon : il fait l'effet d'une société qui ne sait pas
qui elle est. **Un document court et vrai vaut mieux qu'un formulaire
vide.** Un contrôle de `test-nouveau-bascule.mjs` cherche le CROCHET dans
les six textes — la forme survit à une reformulation, pas la formule.
- **Les mentions légales ont été réécrites**, pas rapiécées : sur onze
  lignes, neuf étaient des trous. Il ne reste que le vérifiable — nom
  commercial, activité, hébergeur (GitHub, Inc.), contact, propriété
  intellectuelle, CNIL.
- **Aucun médiateur de la consommation n'est nommé** tant qu'aucun n'est
  désigné : le client écrirait à une adresse morte en croyant avoir saisi
  un recours. La voie de réclamation, elle, reste écrite.
- **CE QUI MANQUE ENCORE, et que seul Barbaros peut donner** : raison
  sociale, forme juridique, **SIRET**, adresse du siège, directeur de la
  publication, et le médiateur (obligatoire, L616-1 Code conso.). Ne pas
  remettre de champs vides en attendant — les ajouter le jour où il donne
  les vraies valeurs, et pas avant.

## LA PAGE HÔTEL — L'ANALYSE QUI A PRÉCÉDÉ (FAITE DEPUIS)

> **Elle est construite.** Voir « LE MODE HÔTEL — LA GRILLE D'UN PARTENAIRE,
> DANS LE MÊME FICHIER » plus bas, qui dit ce qui existe aujourd'hui. La
> section ci-dessous garde l'analyse qui a mené à la décision — utile pour
> comprendre d'où elle vient, pas pour savoir ce que fait le site.

Septembre 2026. Il a apporté un cahier des charges tout écrit pour une page
`easyhotel-tremblay.html` : départ figé, sept destinations en menu, forfaits
au lieu du kilométrage, un seul bouton WhatsApp, pour qu'une réception
réserve en moins de trente secondes. **Le cadrage est bon** — c'est
exactement ce qu'une réception peut faire entre deux clients. **Rien n'a été
construit** : trois points ont été soulevés, il doit trancher.

**1. LE PARTENARIAT EST RÉEL — c'était mon objection, elle tombe.** Le mémo
disait « easyHotel n'est pas un partenaire » ; c'était vrai à l'époque du cas
de test, et Barbaros a confirmé depuis que ce ne l'est plus. **Il n'y a donc
plus d'obstacle à publier une page à leur nom.**

**LE LIBELLÉ EST TRANCHÉ : « easyHotel Aéroville »** (septembre 2026, à sa
demande). Le cahier des charges en donnait deux — « easyHotel Paris Charles
de Gaulle Villepinte » dans le contexte, « easyHotel Aéroville » comme départ
figé ; c'est le second. **Ne pas le réécrire** : c'est le nom que la réception
et l'hôtel emploient entre eux.
**MAIS L'ADRESSE POSTALE COMPLÈTE DOIT PARTIR DANS LE MESSAGE WHATSAPP** —
`10 rue de la Belle Borne, 93410 Tremblay-en-France`. Plusieurs easyHotel
entourent CDG : un nom de marque seul envoie le chauffeur au mauvais, à
5 h du matin, avec un vol à prendre. Le libellé est pour l'écran, l'adresse
est pour le chauffeur ; ce sont deux besoins différents et il faut les deux.

**2. LA GRILLE FORFAITAIRE PROPOSÉE LE FAIT PERDRE DE L'ARGENT SUR LE VAN.**
Comparé à ce que le site facture depuis le passage à 2,35 / 4,08 €/km
(distances approximatives — le calculateur est injoignable depuis cette
machine, à refaire exactement avant toute décision) :

| Van, de jour | Sa page | Le site | Écart |
|---|---|---|---|
| Orly | 125 € | ~180 € | **−55 €** |
| Disneyland | 120 € | ~160 € | **−40 €** |
| Beauvais | 240 € | ~290 € | **−50 €** |

En berline c'est l'inverse — il est au-dessus partout, ce qui est normal pour
un canal hôtel qui prend une commission. **Sauf Orly : 100 € sur la page,
~110 € sur le site.** Un client d'hôtel ouvre elatransfer.com en dix secondes.

**C'EST VOULU — IL A TRANCHÉ** (septembre 2026). Le van moins cher que le
site sur les longues courses est un **prix d'appel pour décrocher l'hôtel**,
pas une dérive. **Ne jamais « corriger » cette grille pour l'aligner sur le
kilométrage** : c'est exactement le genre de chose qu'une prochaine session
prendrait pour un défaut.
- **CONSÉQUENCE À NE PAS MANQUER : la page sera PUBLIQUE.** Une adresse
  devinée ou partagée, et n'importe qui réserve un van pour Orly à 125 € au
  lieu de 180. Elle doit donc porter **`noindex`** — comme `admin.html` et
  `/exploitant/` — et son adresse ne se communique qu'à l'hôtel. Ce n'est pas
  un secret, c'est une porte qu'on ne met pas dans Google.
- Et le jour où un autre hôtel arrive, **la grille est par HÔTEL**, pas
  globale : deux partenaires ne se négocient pas au même prix.

**3. CE SERAIT LA DEUXIÈME GRILLE DE PRIX DU PROJET**, et c'est la faute
évitée deux fois déjà : le calcul de l'espace exploitant réutilise
volontairement celui du client parce que **deux calculs qui divergent ne se
voient pas**. Il a changé ses tarifs le soir même ; une grille figée dans une
page à part serait périmée à la décision suivante.

**CE QUI MANQUE DANS LE CAHIER DES CHARGES POUR QU'UNE RÉSERVATION SOIT
EXPLOITABLE** — ce ne sont pas des détails, chacun casse une course :
- **aucune date** : à 23 h, « 6 h 00 » c'est quel jour ?
- **aucun téléphone** : le chauffeur à 5 h du matin appelle qui ?
- **rien n'arrive sur le serveur**, WhatsApp seulement : un envoi raté depuis
  la tablette de la réception et la réservation n'existe nulle part. C'est
  exactement le défaut corrigé deux jours plus tôt.
- **la provenance est perdue**, donc on ne saurait pas ce que l'hôtel
  rapporte — alors que c'est toute la raison d'être de l'affiche QR.
- **« berline 1–3 / van 4–7 »** : la berline fait **4** places. Un groupe de
  quatre paierait un van là et une berline sur le site.
- **le préavis de 15 minutes n'existe pas** sur cette page.

**CE QUI A ÉTÉ PROPOSÉ À LA PLACE : un MODE HÔTEL du site existant**, pas une
page autonome. `?h=<nom>` préremplit déjà le départ ; il ne manque que les
destinations fermées et les forfaits. On garde un seul code, un seul dépôt
serveur, la provenance, le délai — et **la grille hôtel vit à un seul
endroit**, à côté de l'autre. Une page autonome voudrait dire un second
logo, un second jeu de couleurs et une seconde grille à tenir, plus une
ligne de plus dans `construire.sh` sous peine de 404.

## Ce qui reste à faire

**Fait au 6 septembre 2026, ne pas le refaire** : optimisation mobile,
bandeau d'accueil, bouton de réservation, WhatsApp, formulaire, affichage
du prix, confirmation client, espace exploitant, application installable (PWA),
référencement, **registre et « Coller une demande »**, **affiche QR pour
les hôtels**.

1. **Les informations de l'éditeur** (voir ci-dessus) — le seul point qui
   rende le site non conforme aujourd'hui, et le seul que Claude ne peut
   pas produire.
2. ~~La gestion des chauffeurs~~ — **FAIT** (septembre 2026). Carnet avec
   les trois papiers, leurs dates d'expiration, l'alerte à 30 jours et
   l'avertissement sur le bon au moment de l'attribution. Voir la section
   dédiée. Reste à y verser les vraies fiches, ce que seul Barbaros peut
   faire — il lui faut les copies des papiers de ses chauffeurs.
3. ~~L'alerte à chaque demande~~ — **ELLE TOURNE** (11 septembre 2026,
   3 h 18 du matin, éprouvée par une vraie réservation). Barbaros a créé le
   bot Telegram, posé `TELEGRAM_TOKEN` et `TELEGRAM_CHAT` dans les secrets
   Supabase, et branché le webhook. Il reçoit désormais une notification
   sonore à chaque demande, quelle qu'en soit l'origine.
   - **LE WEBHOOK N'EXISTAIT PAS DANS SON TABLEAU DE BORD**, et c'est ce
     qui a coûté vingt minutes : « Database Webhooks » est devenu une
     **intégration à installer** (Integrations → All → Database Webhooks →
     *Install integration*). Tant qu'elle ne l'est pas, elle n'apparaît ni
     dans le menu Database, ni dans la recherche. `NOTIFICATION.md` le dit
     maintenant en étape 5.
   - **Deux adresses données de mémoire ont rendu deux pages d'erreur** —
     voir « NE DEVINE PLUS JAMAIS ». Le réseau de cette machine bloque
     `supabase.com` : on ne pouvait pas vérifier.
   - **Le message ne porte ni nom, ni téléphone, ni chambre** — vérifié sur
     le vrai message reçu.
   - **L'automatisation WhatsApp reste bloquée** : l'API WhatsApp Business
     de Meta exige une vérification d'entreprise et **un numéro dédié, qui
     ne peut plus servir dans l'application normale**. Rien n'a changé, ne
     pas le promettre.
   - Telegram a été retenu comme voie recommandée : gratuit, instantané,
     avec le son. L'e-mail est le second canal, au choix.
4. **Une langue de plus si le besoin se voit** : l'espagnol et l'arabe sont
   les deux qui apporteraient à Paris. L'arabe demande de retourner toute
   la page de droite à gauche — ce n'est pas qu'une affaire de textes.
5. **Cloudflare** sert le site et porte le DNS (voir plus haut). Ne jamais
   toucher aux lignes du courrier IONOS.
6. **La clé Mapbox** : elle reste le premier niveau du calcul
   d'itinéraire, et la seule qui se restreigne au domaine. Marche à suivre
   dans `MAPBOX.md`. Ce n'est plus urgent depuis qu'ORS est branché — c'est
   un confort, pas un manque.

## L'ITINÉRAIRE — QUATRE NIVEAUX, ET CE QUI SE JOUE DESSUS

Septembre 2026. Le prix est un kilométrage, donc **la distance décide
seule de ce que le client paie**, et il est ferme : annoncé, accepté,
encaissé tel quel. `itineraire()` enchaîne quatre niveaux, chacun
rattrapant le précédent :

| | Service | Quand | Quota |
|---|---|---|---|
| 1 | **Mapbox** | si `CLE_MAPBOX` est remplie | 100 000/mois |
| 2 | **OpenRouteService** | si `CLE_ORS` est remplie | 2 000/jour |
| 3 | **OSRM** | sinon, ou si les précédents refusent | serveur de démo |
| 4 | **Vol d'oiseau × 1,3** | les trois à terre | — |

- **`CLE_ORS` est REMPLIE** (septembre 2026, jeton donné par Barbaros).
  `CLE_MAPBOX` est vide : il n'a pas de compte Mapbox. Le site tourne donc
  aujourd'hui sur ORS, avec OSRM en filet.
- **LA CLÉ ORS EST EN CLAIR DANS LE DÉPÔT, ET C'EST ASSUMÉ.** Une page
  statique envoie forcément sa clé au navigateur : elle est lisible de
  toute façon. La vraie différence entre les deux services est ailleurs —
  un jeton Mapbox **se restreint au domaine**, un jeton ORS **non**. La
  sortie de secours d'ORS est donc de le **régénérer** sur
  openrouteservice.org et de le remplacer ici. Ça a été dit à Barbaros ; il
  a donné la clé en connaissance de cause. Ne pas rouvrir le débat.
- **Si le quota se vide sans raison, c'est qu'elle a été reprise.** Le site
  ne tombe pas pour autant : OSRM prend le relais. C'est exactement ce à
  quoi servent les niveaux.
- **ORS répond en GeoJSON**, pas comme les deux autres : la mesure est dans
  `features[0].properties.summary`, d'où `lireRouteORS()`. Une réponse sans
  résumé lève une erreur au lieu de rendre zéro — un zéro passerait pour
  une course de 0 km et sortirait au **prix plancher** sur un Paris →
  Roissy.
- **ORS prend ses points en `lon,lat`**, dans deux paramètres séparés
  (`start=` et `end=`). L'ordre inverse de l'habitude ; inversé, la course
  part dans l'océan Indien sans le moindre message. Un test vérifie les
  coordonnées exactes de l'URL.
- **LE CONTRÔLE QUI COMPTE LE PLUS** dans `test-nouveau-itineraire.mjs` :
  un niveau en panne ne doit **pas** faire sauter les suivants pour aller
  droit au vol d'oiseau — ce serait facturer une estimation là où une vraie
  route était disponible. Un repli qui se déclenche trop tôt ne se voit
  pas : le prix s'affiche, il est simplement faux de quelques euros. D'où
  **quatre distances différentes** dans le test, une par niveau, et le prix
  lu à l'écran pour savoir lequel a répondu.
- **Le « ≈ » est sur la mesure ET sur le prix**, et c'est sur le prix qu'il
  compte : c'est le montant que le client regarde.
- `api.mapbox.com` et `api.openrouteservice.org` sont dans les hôtes **hors
  cache** de `sw.js` : une réponse gardée resservirait la distance d'une
  course à une autre.
- `overview=false` chez Mapbox : le site n'affiche aucune carte, réclamer
  la géométrie ferait grossir la réponse pour rien.
- **Minuteur de 4 s par appel** (`fetchLimite`), soit douze au pire avant
  le vol d'oiseau — et ce pire cas suppose les trois serveurs muets en même
  temps. Il était à 5 s quand il n'y avait que deux niveaux ; ajouter un
  troisième sans le baisser aurait porté l'attente à quinze secondes.
- **LES NEUF AUTRES SUITES COUPENT ORS EXPLICITEMENT**
  (`route('**://api.openrouteservice.org/**', r => r.abort())`). Sans ça
  elles dépendraient du fait qu'il soit injoignable depuis cette machine —
  et sur un poste relié à Internet elles interrogeraient le vrai service,
  avec une vraie distance, et tous les prix vérifiés au centime
  tomberaient à côté. **Toute nouvelle suite qui simule OSRM doit couper
  ORS de la même façon.**

## LES COURSES SONT GROUPÉES PAR JOUR

Septembre 2026. La liste du tableau de bord était **à plat**, triée par date
croissante — ce qui met une course de la semaine dernière restée ouverte
**avant** celle de demain, sans que rien ne le dise. Barbaros travaille la
nuit : à dix courses il ne voyait plus sa journée.

- **« EN RETARD » N'EST PAS UN JOUR, C'EST UN AVERTISSEMENT.** Une course
  dont l'heure est passée et qui n'est ni réalisée ni refusée demande quelque
  chose : soit elle a été faite et il faut la clore, soit elle a été oubliée.
  La nommer par sa date la noierait parmi les autres. Elle emprunte **le
  rouge de l'attente** — c'est la même chose qu'elle dit — et ce sont les
  deux seuls rouges du tableau de bord.
- **SUR LES RÉALISÉES, « en retard » NE VEUT RIEN DIRE** : une course faite
  hier est une course d'hier, pas un oubli. Le titre redevient une date.
- **Les titres sont posés AU FIL de la liste**, pas calculés à part : les
  courses sont déjà triées, et deux parcours finiraient par diverger.
- **Le test ne vérifie pas la PRÉSENCE des titres mais leur ORDRE** — en
  retard, aujourd'hui, demain, puis la suite. Un contrôle de présence serait
  passé au vert sur un ordre inversé. Même leçon que la barre du bas.
- **PIÈGE DE TEST, ENCORE LE REGISTRE.** Le bloc qui éprouve les jours
  **remplace** `ela_bookings` pour poser des dates précises ; les contrôles
  suivants travaillent sur les courses d'origine. Sans sauvegarde-restitution,
  la suite s'arrête sur un délai d'attente en cherchant une demande qui
  n'existe plus. **Le registre est un état partagé, pas un décor local** —
  même famille que `addInitScript` qui se rejoue à chaque chargement.

## SAISIR UNE COURSE REÇUE PAR TÉLÉPHONE

Septembre 2026, à sa demande : « il faut aussi créer un formulaire pour que
je puisse créer facilement des courses ». « Coller une demande » ne couvrait
que le client qui **écrit** ; quand un hôtel **appelle**, il aurait fallu
fabriquer un faux message WhatsApp pour le coller.

- **ELLE ENTRE `confirmee`**, contrairement à une demande collée. Une demande
  venue d'un client attend une réponse ; une course saisie soi-même a déjà
  été convenue de vive voix, personne n'attend qu'on la valide.
- **LE PRIX SE CALCULE** (« Calculer le prix depuis les adresses »), par le
  **même chemin que côté client** — recherche d'adresse, itinéraire, grille,
  majoration, arrondi. C'est ce qui garantit qu'on annonce au téléphone le
  prix que le site aurait donné. **Deux calculs qui divergent ne se voient
  pas** : on le découvre le jour où un client compare, et le prix est ferme
  donc opposable. Un test vérifie l'égalité au centime avec la suite client.
- **LES ADRESSES RETENUES SONT RÉÉCRITES DANS LES CHAMPS.** La recherche rend
  le premier résultat ; si ce n'est pas le bon Ibis, le kilométrage est faux
  et le prix avec. Barbaros doit **voir** ce sur quoi il annonce un montant.
- **LE PRIX RESTE MODIFIABLE** : c'est une négociation, pas un tarif imposé.
  Et si le calcul échoue, la saisie à la main continue de marcher — elle a
  toujours marché.
- **La majoration suit la date et l'heure SAISIES**, pas l'instant présent :
  une course prise à 2 h du matin pour mardi midi n'est pas une course de
  nuit.
- **Le chauffeur est facultatif** — on prend la course, on le cherche
  ensuite. Son nom vient du carnet (`dessinerChauffeurs()` remplit la liste :
  sans cet appel on retaperait « Mehmet » avec une casse différente à chaque
  fois, ce qui rend l'historique illisible).
- **On ouvre le bon juste après**, et ce n'est pas un confort : c'est là que
  s'affiche l'avertissement sur les papiers du chauffeur.
- **Même contrôle de téléphone que côté client**, sur les deux numéros.
- **Piège rencontré** : `btnNouvelleCourse` était **déjà pris** par le bouton
  « Réserver une autre course » du site client. Deux éléments pour un
  identifiant, et l'écouteur se branche sur le mauvais.

## LA CARTE DU TRAJET — LEAFLET, ET LA PREMIÈRE DÉPENDANCE DU SITE

Septembre 2026, à sa demande : « une belle carte comme Maps ». Le client voit
la route qu'on lui facture, et c'est ce qui rend le prix compréhensible.

**C'EST LA SEULE DÉPENDANCE EXTÉRIEURE DE LA PAGE**, et elle a été acceptée
pour une raison précise : Leaflet est en licence libre, sans dépendance
lui-même, et **rien ne casse s'il n'arrive pas**. Ne pas s'en servir comme
d'un précédent pour en ajouter d'autres.

- **ELLE NE PEUT JAMAIS EMPÊCHER DE RÉSERVER.** Le chargement est enveloppé,
  et le seul échec possible est « pas de carte » : cadre masqué, hauteur
  nulle, aucun trou dans la page, et le tunnel continue. Un client dans un
  parking d'aéroport n'a parfois aucun réseau. **Six contrôles éprouvent ce
  cas-là en premier**, et ils tournent toujours — la machine de test est hors
  ligne, donc le CDN n'y répond jamais.
- **UNE MINUTERIE DE 5 s SUR LE CHARGEMENT.** Un script bloqué par un proxy
  ou un bloqueur de publicité **ne déclenche pas toujours `onerror`** : la
  promesse resterait en attente pour toujours. Même leçon que le
  presse-papiers. La promesse échouée est oubliée, pour qu'un client qui
  retrouve du réseau puisse réessayer.
- **« lon, lat » CHEZ LES CALCULATEURS, « lat, lon » CHEZ LEAFLET.** Inversé,
  le tracé part dans l'océan Indien — la carte s'affiche très bien, elle est
  simplement fausse. Un faux Leaflet **enregistre** ce qu'on lui donne et le
  test vérifie que les points tombent en Île-de-France. C'est le même piège
  que l'ordre des points dans l'appel à ORS.
- **ORS REND LE TRACÉ SANS QU'ON LE DEMANDE** : il est dans la réponse qu'on
  lit déjà, et on le jetait. La carte ne coûte donc **aucun appel
  supplémentaire** sur le niveau qui sert aujourd'hui. Pour Mapbox et OSRM,
  `overview=false` est devenu `overview=simplified&geometries=geojson` — la
  raison d'origine (« le site n'affiche aucune carte ») est tombée avec la
  carte. **`simplified` et pas `full`** : à l'échelle d'un téléphone, le
  tracé complet pèse dix fois plus pour un trait identique à l'œil.
- **LE DRAPEAU DE LEAFLET S'EN VA — et c'est la DEUXIÈME fois dans ce
  projet.** La version 1.9 glisse un drapeau ukrainien dans son attribution ;
  Barbaros l'avait déjà fait retirer de l'ancien site.
  `attributionControl.setPrefix("")`. **« © OpenStreetMap » reste** : les
  données sont sous licence ODbL, la citation des contributeurs est une
  obligation. On retire le préfixe de la bibliothèque, jamais la source.
- **LA CARTE NE SE MANIPULE PAS** (`dragging`, `touchZoom`, `scrollWheelZoom`
  à `false`). Dans un tunnel de réservation elle se REGARDE : un pouce qui
  fait défiler la page ne doit pas déplacer la carte au lieu de descendre à
  la liste des prix.
- **ELLE EST TRACÉE APRÈS `ecran()`, jamais avant** : Leaflet mesure son
  cadre à la création, et un cadre encore masqué mesure zéro — la carte sort
  grise. Exactement le piège de la courbe du tableau de bord. D'où aussi le
  `invalidateSize()` différé et la hauteur fixe en CSS, qui empêche la page
  de sauter quand la carte arrive.
- **LES TUILES SONT LE POINT FAIBLE, ET IL EST CONNU.** La politique
  d'OpenStreetMap déconseille l'usage commercial soutenu : elle peut couper
  sans préavis. Le jour où `CLE_MAPBOX` est remplie, on passe aux tuiles
  Mapbox — même bibliothèque, une ligne. Elles sont **désaturées** en CSS :
  la couleur doit rester au tracé et aux deux repères.
- **LA BIBLIOTHÈQUE EST DANS LE DÉPÔT (`carte/`), PLUS CHEZ UN CDN**
  (septembre 2026, après « je ne vois pas la carte s'afficher »). Elle
  venait de cdnjs avec une **minuterie de 5 s** sur son chargement : 147 Ko
  chez un serveur étranger, DNS et poignée de main TLS compris, sur un
  téléphone en 4G. Cinq secondes, c'était court — et ce délai serré ne
  protégeait **rien**, puisque personne n'attend la carte : le prix est déjà
  à l'écran. Le réflexe venait des appels d'itinéraire, où une réponse lente
  retarde le prix. Ici elle ne retarde que la carte.
  Ce qu'on gagne à la servir soi-même : plus de serveur tiers à joindre,
  **mise en cache par le service worker** (même origine, réponse complète —
  une réponse opaque de CDN ne se cache pas), donc carte disponible hors
  ligne dès la deuxième visite, et personne d'extérieur ne peut changer ce
  code sous nos pieds. Licence BSD 2-Clause, redistribution permise, le
  fichier porte son copyright et `carte/LICENSE-leaflet.txt` l'accompagne.
  La minuterie reste, à **15 s** : elle ne sert plus qu'à ne pas laisser une
  promesse en suspens pour toujours.
- **`construire.sh` DOIT COPIER `carte/` — c'est LE point de rupture.** La
  recette ne publie que ce qui y est nommé : un fichier oublié marche
  parfaitement en local, où le serveur de test sert le dépôt entier, et
  reste introuvable en ligne. Deux contrôles de `test-nouveau-bascule.mjs`
  le verrouillent — dont un qui lit **ce que la page va chercher** plutôt
  qu'une liste à tenir à jour.
  **Le premier jet de ce contrôle passait au vert avec la ligne retirée** :
  il cherchait le mot « carte » dans le fichier entier, et mes propres
  commentaires en parlaient. Il ne lit maintenant que les lignes de
  commande. Un test qui trouve ce qu'il cherche dans une phrase
  d'explication ne vérifie rien.
- **`NOS_DOSSIERS` DANS `sw.js`.** `siteVoisin()` traite tout sous-dossier
  comme un site vitrine à laisser tranquille — juste pour `/alfredo/` ou
  `/demos/`, faux pour `/carte/`. Sans cette liste, le service worker
  laissait passer la bibliothèque sans jamais la garder : l'inverse de ce
  qu'on gagne à l'avoir sortie du CDN.
- **LE RENDU EST MAINTENANT ÉPROUVÉ À CHAQUE EXÉCUTION.** La troisième
  partie de `test-nouveau-carte.mjs` dépendait d'un fichier posé à la main
  dans le bac à sable, le CDN étant injoignable d'ici. Servie par le site,
  la vraie bibliothèque est là de toute façon — et un contrôle vérifie que
  les deux fichiers viennent bien du site et **jamais d'un CDN** : un retour
  en arrière ne casserait rien dans la suite, et la carte manquerait de
  nouveau chez lui.
- **PAS DE CARTE DE TRAFIC SUR LE TABLEAU DE BORD** (demandée, écartée).
  TomTom et HERE ont des paliers gratuits, ce n'est pas le problème :
  Barbaros ne conduit pas, il place. Une carte rouge et verte ne change
  aucune décision — c'est la carte des chauffeurs en temps réel de la
  maquette, refusée pour la même raison. Ce qui déciderait quelque chose,
  c'est une **durée tenant compte du trafic à l'heure de la course** (Mapbox
  sait le faire), affichée sur une ligne. **C'est fait — voir juste en
  dessous.**

### « PAS CLAIR », « PLUS VITE », « LE TRAFIC » — LES TROIS DEMANDES SUIVANTES

Septembre 2026, dès que la carte s'est enfin affichée chez lui. Trois
choses distinctes, et **aucune des deux premières ne se voit depuis un
ordinateur** — c'est pour ça qu'il a fallu qu'il les signale.

- **LE FLOU VENAIT DE LA DENSITÉ D'ÉCRAN, pas de la taille du cadre.** Un
  téléphone dessine 2 à 3 pixels physiques pour 1 pixel de page : les
  tuiles de 256 px étaient étirées sur 512 ou 768 pixels d'écran.
  `detectRetina:true` fait demander à Leaflet les tuiles du **zoom
  supérieur** et les dessine deux fois plus petites — deux fois plus de
  détail pour la même surface, **sans qu'OpenStreetMap ait à servir des
  images « @2x »**, ce qu'il ne fait pas. Mesuré : à DPR 2, une tuile de
  256 px occupe désormais 256 pixels d'écran (1:1, net) au lieu de 512 ;
  à DPR 1 rien ne change. Le coût est 8 tuiles au lieu de 4.
- **LA DÉSATURATION ÉTAIT DE TROP** : à `saturate(.55)` le fond de plan
  virait au gris-vert et les rues ne se distinguaient plus. Elle est à
  `.8`, le contraste à `1.06`. La règle tient toujours — la couleur
  appartient au tracé et aux deux repères — mais **un fond de plan effacé
  n'est plus un fond de plan**. Hauteur portée de 190 à 220 px.
- **LA LENTEUR ÉTAIT UNE MISE EN SÉRIE.** La bibliothèque ne partait
  qu'**après** la réponse du calculateur d'itinéraire, dans le `.then()` :
  deux attentes bout à bout alors qu'elles n'ont rien à voir. Elles partent
  maintenant **ensemble**, au clic sur « Voir mon prix » (`prechargerCarte()`),
  avec une **préconnexion** au serveur de tuiles au passage — un DNS et une
  poignée de main TLS, c'est une demi-seconde en 4G, prise sur du temps
  déjà perdu. On ne précharge **pas** à l'accueil pour autant : un visiteur
  qui ne réserve pas n'a pas à payer 200 Ko de cartographie.
  **Le test n'éprouve pas une durée** — une durée dépend de la machine et
  finit par tomber un jour de charge — il éprouve l'**ordre** : itinéraire
  ralenti à 2 s, on regarde à 900 ms, le prix n'est pas là et la
  bibliothèque est déjà demandée. Éprouvé contre l'ancien code : il tombe.
- **WAZE N'A PAS D'API PUBLIQUE**, et ce n'est pas une question de budget :
  elle est fermée depuis des années, ce qui reste (*Waze for Cities*) rend
  des incidents aux collectivités, pas des temps de trajet. **Google Maps**
  en a une, mais elle exige un compte de facturation **et** impose
  d'afficher le résultat sur une carte Google — donc de changer aussi le
  fond de plan, et de payer les deux. **Mapbox fait la même chose,
  gratuitement, sans imposer sa carte.** Ne pas rouvrir ce débat : la
  réponse ne dépend pas de nous.
- **LE PROFIL EST `driving-traffic`, PAS `driving`.** Les deux noms se
  ressemblent, le résultat non — sur un Roissy → Paris un mardi à 8 h,
  l'écart se compte en dizaines de minutes, donc en vols ratés. Un seul mot
  dans l'URL, exactement ce qu'une réécriture emporte sans rien casser de
  visible : un test le verrouille.
- **`depart_at` DEMANDE LE TRAFIC À L'HEURE DE LA COURSE**, pas à celle du
  clic — une commande passée à 23 h pour demain 8 h n'a rien à voir avec la
  circulation de 23 h. Il n'est envoyé que si le départ est **dans les 7
  jours** : hors de sa fenêtre Mapbox **refuserait l'appel**, le site
  retomberait sur ORS, et on perdrait **en silence** la précision qu'on est
  venu chercher. Un repli qui se déclenche trop tôt ne se voit pas.
- **« trafic pris en compte » N'EST ÉCRIT QUE SI C'EST VRAI** — donc
  seulement quand Mapbox a répondu. ORS et OSRM rendent un temps théorique.
  L'écrire quand même ferait de la mention une décoration, et un client qui
  se fie à une heure d'arrivée la vérifie une fois, une seule. Deux
  contrôles : présent avec Mapbox, **absent** sans.
- **RIEN DE TOUT ÇA NE TOURNE AUJOURD'HUI** : `CLE_MAPBOX` est vide, il n'a
  pas de compte. Le code est écrit et éprouvé, la marche à suivre est dans
  `MAPBOX.md`, et c'est le seul geste qui lui revient.
- **IL A REPOUSSÉ LE SUJET (septembre 2026) — « laisse tomber pour
  l'instant ».** Mapbox lui a demandé sa carte bancaire à l'inscription et
  il n'a pas voulu la donner. **Ne pas le relancer là-dessus.** Ce qui a été
  dit, et qui reste vrai le jour où il y revient : Mapbox crée un jeton
  public **automatiquement** à l'inscription, avant la question du paiement
  — il suffit d'aller le chercher sur `account.mapbox.com` ; et **TomTom**
  fait la même chose (itinéraire avec trafic réel) **sans carte**, 2 500
  appels par jour, ce serait un quatrième niveau à brancher exactement comme
  Mapbox. Le site n'en souffre pas : la marge de 5 à 10 minutes posée sur la
  durée couvre déjà une bonne part de ce que le trafic apporterait.

### LA DURÉE ANNONCÉE PORTE UNE MARGE — FOURCHETTE DE +5 À +10 MINUTES

Septembre 2026, à sa demande : « il faut que le temps de trajet soit une
estimation de 5-10 minutes plus longue ».

- **CE QUE RENDENT LES CALCULATEURS EST UN TEMPS DE ROULAGE, PAS UN TEMPS DE
  COURSE.** Il ne compte ni la sortie du parking, ni les bagages, ni les deux
  minutes à chercher le client devant un terminal. Annoncé sec, on promet une
  heure d'arrivée qu'on tient une fois sur deux — et chez Elatransfer l'heure
  engage comme le prix.
- **UNE FOURCHETTE, PAS UN NOMBRE UNIQUE.** Un chiffre seul se lit comme une
  promesse ; « 43–48 min » se lit comme ce que c'est. Et une marge **fixe**
  de dix minutes serait absurde sur un trajet court — 12 min deviendraient
  22, presque le double. `MARGE_DUREE_MIN` / `MARGE_DUREE_MAX`,
  `dureeAnnoncee()`.
- **`course.min` RESTE BRUT** : la marge est posée à l'AFFICHAGE. Sinon, le
  jour où l'on rangerait la durée sur le bon, elle partirait déjà majorée et
  une seconde marge s'ajouterait à la première sans que personne ne le voie.
- **LE PRIX NE BOUGE PAS D'UN CENTIME.** Il est un kilométrage, la durée n'y
  entre pas — c'est ce qui permet d'être prudent sur l'heure sans être
  malhonnête sur le montant.
- **LA DURÉE A QUITTÉ LA CARTE DE GAMME**, et ce n'est pas une perte : elle
  était **identique sur les quatre lignes** (c'est la même route) et elle est
  déjà écrite au-dessus. En fourchette, « 43–48 min · arrivée 10:43–10:48 »
  ne tenait plus sur une ligne de téléphone. Ce qui reste sur la carte, c'est
  l'**heure d'arrivée**, celle que le client compare à l'heure
  d'enregistrement de son vol. Mesuré : une ligne, à 390 px, court trajet
  comme long.
- **LE TEST NE REFAIT PAS L'ADDITION** : le faux ORS rend 2 700 s, donc la
  page doit afficher « 50–55 min » et **jamais** « 45 min ». Un contrôle qui
  recalculerait la marge passerait au vert même si elle disparaissait des
  deux côtés. Éprouvé marges à zéro : les trois contrôles tombent.

## LA RÉPONSE ARRIVE SUR LE SITE, ET LA BARRE DU BAS A QUATRE ONGLETS

Septembre 2026, sur deux captures. Quatre reproches d'un coup : « le client
n'est pas censé savoir que sa demande part sur WhatsApp s'il ne lit pas la
ligne du bas » · « s'il n'a pas WhatsApp comment je pourrai être au
courant ? » · « il faut que je puisse répondre aussi via le site » · « en
bas il faut écrire accueil, mes réservations, mes trajets effectués, sorte
de logo pour me contacter directement sur WhatsApp… c'est nul comme ça ».

### « EN ATTENTE » ÉTAIT UN MENSONGE, PAS UN MANQUE

C'est le vrai défaut que ses captures montraient : trois courses toutes
« EN ATTENTE », dont une de 3 h 20 du matin qu'il avait certainement déjà
traitée. **« Mes courses » n'affichait que ce qui dort dans le téléphone du
client, figé à l'instant de la réservation.** Le client rappelle pour
demander ce qu'il a déjà.

- **`etat-course`** (troisième fonction Supabase) est la seule porte : la
  règle de sécurité interdit la lecture aux anonymes et **doit**
  l'interdire — la clé du site est publique, une policy de lecture
  exposerait les noms, téléphones et adresses de tous les clients.
- **LA CLÉ EST LE COUPLE RÉFÉRENCE + TÉLÉPHONE.** La référence seule est
  séquentielle donc devinable : il suffirait de compter pour lire les
  courses des autres. Le numéro ne sort jamais du téléphone du client.
- **Elle ne rend que ce que porte déjà le lien `?ok=`** — statut, prénom du
  chauffeur, son numéro, véhicule, heure. Jamais les adresses, le nom, la
  chambre ni le prix : le client a tout le reste sur son propre bon.
- **Le chauffeur n'est rendu que sur une course confirmée ou réalisée.** Sur
  une course en attente, Barbaros a pu écrire un nom pour se souvenir de qui
  rappeler — l'envoyer promettrait une voiture qui n'a rien accepté.
- **UN APPEL QUI ÉCHOUE NE FAIT JAMAIS RECULER UN ÉTAT.** `nuage.etat()`
  rend `null` sur un échec et l'appelant garde ce qu'il a. Écrire
  « attente » sur un serveur muet repasserait au neutre une course
  confirmée — exactement le défaut qu'on répare. **C'est le contrôle qui
  compte le plus** : il ne se voit pas à l'œil et coûterait un client qui
  croit sa voiture annulée.
- **On n'interroge que ce qui peut encore changer** : une course réalisée ou
  refusée ne bougera plus. Un test compte les appels.
- **Rien à faire dans Supabase** : ni table, ni colonne, ni policy. Elle se
  déploie seule à chaque poussée (`fonctions.yml`).

### « EN ATTENTE » ET « CONFIRMÉ » ÉTAIENT DE LA MÊME COULEUR

Trouvé en relisant sa capture. La règle d'origine était juste — « l'état est
en OR, jamais en vert : rien n'est confirmé tant que Barbaros n'a pas
répondu » — mais le passage à la palette « Encre & céladon » a remplacé l'or
par le vert PARTOUT : « en attente » portait `accent-encre` sur
`accent-clair`, c'est-à-dire **exactement les valeurs de `.ok`**. Les deux
pastilles étaient indiscernables, et la seule information que le client vient
chercher — a-t-on répondu ? — ne se lisait plus.
**Une couleur nommée par son rôle suit le rôle ; une couleur nommée par sa
teinte ramène la teinte.** Deuxième fois dans ce projet.
Désormais : attente = neutre, **confirmé = la seule pastille colorée**,
terminé et non prise = gris cerclé. Si tout criait, plus rien ne crierait.

### QUATRE ONGLETS, ET LE DERNIER N'OUVRE PAS UN ÉCRAN

- **Accueil · Réservations · Trajets · WhatsApp.** Les libellés sont
  **courts** — à quatre sur 390 px chacun dispose de 97 px ; le titre complet
  (« Mes trajets effectués ») vit sur l'écran, où il a la place.
- **Les réservations sont ce qui attend encore** (attente, confirmée), les
  trajets ce qui est fini (réalisée, **et refusée**). Un refus n'est pas un
  trajet, mais il est fini : le laisser dans les réservations ferait attendre
  une réponse déjà donnée.
- **L'onglet WhatsApp porte un vrai `href`, pas un `data-ecran`**, et ne
  s'allume jamais : il quitte le site. Le test ne compte donc plus les
  onglets — il vérifie que chaque onglet **qui ouvre un écran** en ouvre un
  différent.
- **LA BULLE WHATSAPP FLOTTANTE A ÉTÉ RETIRÉE** avec tout son mécanisme
  (`__jugerPastilleWa`, `PROTEGES`, `.efface`). Elle et l'onglet étaient le
  même bouton, au même endroit, de la même couleur — et la bulle était la
  moins bonne des deux : visible sur le seul accueil, elle recouvrait ce qui
  passait dessous, d'où tout ce mécanisme pour l'effacer. **Ne pas la
  remettre.** Les tests qui la visaient éprouvent maintenant la RÈGLE
  (« aucun élément fixe ne recouvre un bouton »), qui vaut pour tout ce
  qu'on ajouterait demain.
- **« CONTACT » A CÉDÉ SA PLACE, PAS SON CONTENU.** Le numéro et les trois
  documents légaux sont descendus en **pied d'accueil** — c'est là qu'on les
  cherche sur n'importe quel site, et **la LCEN exige qu'ils restent
  accessibles sans compte, pas qu'ils aient un onglet**. Un test éprouve le
  CHEMIN depuis l'accueil, pas la présence de l'écran : un écran qu'aucun
  lien n'ouvre n'est pas accessible.

### CE QUI SE PASSE QUAND ON APPUIE, ÉCRIT AVANT LE BOUTON

Trois lignes numérotées au-dessus de « Confirmer », pas sous lui : une
phrase posée sous un bouton se lit après le clic, c'est-à-dire trop tard.
Elles disent aussi ce qui rassure vraiment — **la demande arrive chez
Elatransfer même si le message WhatsApp n'est pas envoyé**.

**ET LA RÉPONSE À SA QUESTION : OUI, IL EST AU COURANT SANS WHATSAPP.**
`nuage.deposer()` part à chaque confirmation, indépendamment du message :
la demande arrive dans son tableau de bord. Ce qui manquait, c'est que le
site disait le contraire.

**PLUS AUCUNE APPLICATION NE S'OUVRE AU CLIC** (4/10/2026, option A) : le client
dit où recevoir sa confirmation ; repli « Renvoyer par WhatsApp » sur le bon.
Si Telegram tombe, rouvrir cette décision (`memoire/contact-client.md`).
**AU COMPTOIR D'HÔTEL, IL NE S'OUVRE PLUS** — voir la section dédiée plus
bas. C'est l'application de la règle qui figurait ici (« ne pas supprimer
l'ouverture automatique avant que le webhook Telegram fonctionne ») : il
fonctionne depuis le 11 septembre 2026, et c'est ce qui a permis de la
retirer là où elle gênait.

### « VOTRE DEMANDE N'A PAS PU NOUS ÊTRE TRANSMISE » — UNE PANNE INVENTÉE

Septembre 2026, capture à l'appui : « j'ai fait une commande sur le site
mais quand j'envoie et que je reviens dessus je vois ça » — l'écriteau rouge
du bon, alors que rien n'était cassé.

**LA CAUSE ÉTAIT L'ORDRE.** `nuage.deposer()` partait **après**
`window.open(WhatsApp)`, c'est-à-dire à l'instant précis où iOS met la page
en arrière-plan pour changer d'application. Safari y gèle le JavaScript et
coupe les requêtes en cours ; au retour, le minuteur de huit secondes se
réveillait et abandonnait un appel qui n'avait jamais eu sa chance.

**Un client qui lit « votre demande ne nous est pas parvenue » ne réserve
pas ailleurs — il ne réserve plus du tout.** C'est le pire endroit du site
où mentir.

- **LE DÉPÔT PART MAINTENANT EN PREMIER**, et WhatsApp reste ouvert **dans
  le même tick** que le clic — ce qui est la seule chose qui compte pour
  Safari, qui n'autorise l'ouverture d'un onglet que dans la foulée d'un
  geste. Rien n'est attendu entre les deux : `deposer` est **lancé**, pas
  attendu. **L'ordre change, la vieille règle est intacte** — ne pas la lire
  comme une autorisation de mettre un `await` avant `window.open`.
- **`keepalive:true`** sur la requête : le navigateur s'engage à la mener à
  terme même si la page est mise de côté ou fermée. Sans lui, l'ordre ne
  suffirait pas — la requête partirait puis serait abandonnée une
  milliseconde plus tard.
- **`reprendreDepot()` — on ne crie pas à l'échec depuis l'arrière-plan.**
  Tant que `document.hidden` est vrai, un échec ne veut rien dire. On attend
  le retour sur l'onglet, on réessaie **une fois**, et on ne tranche
  qu'après. Une boucle transformerait un vrai refus du serveur en appels
  sans fin sur le forfait du client ; le repli WhatsApp est là pour ça.
  Filet de 30 s au cas où l'événement de retour ne vienne jamais.
- **LE TEST SIMULE LE PASSAGE EN ARRIÈRE-PLAN** (`document.hidden` redéfini
  + `visibilitychange` rejoué) et fait échouer le PREMIER dépôt seulement.
  C'est la seule façon d'atteindre le défaut : sur le banc la page reste
  visible, et le dépôt raté serait retenté tout de suite. **Éprouvé contre
  l'ancien code : il rend mot pour mot la phrase de sa capture.**
- Un contrôle vérifie l'**ordre** (`window.__ordre`), un autre la présence
  de `keepalive` dans la page. Les deux tombent si on revient en arrière.

### « IDENTIFIANTS REFUSÉS » NE DISAIT PAS QUOI FAIRE

Septembre 2026, Barbaros : « j'arrive pas à me connecter ». L'écran affichait
**la même phrase quoi qu'il arrive** — mot de passe faux, compte non
confirmé, connexion par e-mail désactivée dans Supabase, serveur muet.
Quatre pannes, quatre gestes, un seul message. `nuage.connexion` rendait un
booléen et jetait la réponse du serveur.

**C'est la leçon de « `lister()` n'a plus de catch », à l'autre bout du
site** : une panne qu'on ne sait pas nommer ne se répare pas.

- `nuage.connexion` rend maintenant `{ok, raison, brut}` et `raisonConnexion()`
  traduit le message du serveur en geste. **On regarde `msg`,
  `error_description`, `error_code` ET `error`** : Supabase a changé deux
  fois la forme de ses erreurs, et celle qu'on aurait choisie serait
  forcément celle qui disparaît.
- **Quand on ne sait pas nommer, on recopie le message brut.** Un message
  étrange qu'on peut lire vaut mieux qu'un message clair qui ment.
- **LE PIÈGE LE PLUS PROBABLE EST « Auto Confirm User »** : la case n'est pas
  cochée d'office quand on crée un utilisateur depuis le tableau de bord
  Supabase. Le compte existe, le mot de passe est le bon, la connexion est
  refusée — et on cherche une heure du côté du mot de passe. C'est écrit
  dans `SUPABASE.md` et le site le dit lui-même.
- **NE JAMAIS CONSEILLER DE SUPPRIMER ET RECRÉER LE COMPTE** (corrigé le
  4 octobre 2026). Cette ligne disait l'inverse — « supprimer un compte ne
  fait rien perdre » — et c'était vrai jusqu'à
  `20260915_operator_auth_server.sql` : depuis, l'admin est réservé à un
  compte précis de la table `operateurs`, effacé avec le compte. Le message
  du site, `SUPABASE.md` et ce fichier le conseillaient encore tous les
  trois ; un compte non confirmé se confirme côté serveur, par une migration.
- Quatre cas éprouvés dans `test-nouveau-serveur.mjs`, plus le retour du
  bouton à l'état utilisable : laissé sur « … » et désactivé, il ferait
  croire à une connexion en cours pour toujours.

## L'ALERTE À CHAQUE DEMANDE — DU CODE QUI TOURNE AILLEURS QUE DANS LE NAVIGATEUR

Septembre 2026, à sa demande. Il a demandé « pourquoi tu ne me créerais
pas un serveur qui fabrique la page, je veux pas que mon site reste en
simple fichier ». La réponse tenue : **un serveur loué ne changerait rien
pour ses clients**, coûterait 10–20 €/mois, tomberait parfois et
demanderait de l'entretien — alors que Supabase, qu'il a déjà, sait
exécuter du code sans machine à tenir. Ne pas revenir sur ce choix sans
un besoin que les fonctions ne couvrent pas.

**Ce qui est écrit** : `supabase/functions/nouvelle-demande/` (la fonction
et son message), `test-notification.mjs` (34 contrôles, sous Node, sans
réseau), `NOTIFICATION.md` (la marche à suivre).
**Ce qui manque** : le déploiement, qui exige SON compte. Tant qu'il ne
l'a pas fait, **le site se comporte exactement comme avant**.

**IL TRAVAILLE DEPUIS UN TÉLÉPHONE — la marche à suivre en tient compte**
(septembre 2026 : « je bosse depuis un tel »). L'ancienne étape 4 demandait
`npm install -g supabase` et un terminal : autant dire qu'elle ne se ferait
jamais. Tout passe maintenant par l'application Telegram et le navigateur —
l'éditeur du tableau de bord Supabase déploie une fonction qu'on colle.
- **`a-coller.ts` est la fonction en UN SEUL morceau**, parce qu'on ne colle
  pas deux fichiers avec un pouce. Il est **fabriqué** par `assembler.mjs`,
  jamais écrit à la main, et `test-notification.mjs` refait l'assemblage
  pour le comparer : deux recettes finissent toujours par diverger, et ici
  la divergence voudrait dire déployer un code que personne n'a testé.
- **L'assembleur annote les paramètres en `any`, et ce n'est pas
  cosmétique.** `message.js` est un `.js` : TypeScript n'y exige aucun
  type. Recopié tel quel dans un `.ts`, chaque paramètre nu devient une
  erreur « implicitly has an any type » et la fonction cesse de se déployer
  pour une raison sans rapport avec ce qu'elle fait. Vérifié avec `tsc
  --strict` : il ne reste que les globales de Deno, que `tsc` ne connaît
  pas. Le compte de paramètres attendus est écrit dans l'assembleur — une
  signature ajoutée sans annotation l'arrête au lieu de passer.
- **Les noms des secrets s'écrivent exactement** : un secret mal nommé
  n'est pas une erreur visible, la fonction croit simplement que le canal
  n'est pas configuré.

- **LA NOTIFICATION NE PEUT PAS FAIRE ÉCHOUER UNE RÉSERVATION.** Le
  webhook part APRÈS l'écriture de la ligne, détaché. Telegram en panne,
  jeton périmé, fonction plantée : la course est enregistrée quand même.
  On perd le bip, jamais la course. **Ne jamais inverser cette
  répartition** pour « garantir » l'alerte.
- **INSERT SEUL, jamais UPDATE.** Avec UPDATE, chaque changement de statut
  — chauffeur attribué, course réalisée — lui annoncerait une « nouvelle
  demande » qu'il vient de traiter lui-même. Au bout de trois jours il
  cesserait de regarder ses notifications, et c'est la seule vraie façon
  de casser ce système. La fonction refuse tout ce qui n'est pas un INSERT
  sur `courses` — ceinture en plus du réglage du webhook.
- **LE MESSAGE NE PORTE NI LE NOM, NI LE TÉLÉPHONE, NI LA CHAMBRE.** Ils
  ne servent pas à DÉCIDER ; ils sont dans le tableau de bord, à un doigt.
  Les promener chez Telegram ou chez un service d'e-mail pour rien, c'est
  la minimisation qui l'interdit (RGPD 5.1.c) — même règle que le lien
  `?ok=`. Le test cherche les **valeurs**, pas les libellés : chercher le
  mot « téléphone » passerait au vert avec le numéro écrit à côté.
- **Le départ pris est `departPublic`**, celui SANS le numéro de chambre.
  Le bon en porte deux versions ; prendre la mauvaise diffuse la chambre
  d'hôtel d'un client.
- **Le TITRE porte le trajet et l'heure.** C'est la seule ligne visible
  sur un écran verrouillé, celle qui décide s'il se lève. Le garder sous
  90 caractères : au-delà le téléphone coupe la fin, donc l'heure.
- **Aucun `parse_mode` chez Telegram.** En Markdown, une adresse qui
  contient un tiret bas ou une étoile fait rejeter TOUT le message, et la
  notification est perdue sans que personne ne le sache.
- **Rien de configuré rend une ERREUR, pas un succès muet.** Un « 200 OK »
  ferait croire pendant des semaines que les alertes marchent, jusqu'au
  premier client perdu.
- **`message.js` est en JavaScript ordinaire, à part du `.ts`**, pour
  qu'un test Node puisse le relire sans Deno ni réseau. Deno l'importe tel
  quel. Le reste — jetons, appels sortants — ne s'éprouve qu'une fois
  déployé.
- **Les secrets vivent chez Supabase, jamais dans le dépôt.** C'est toute
  la différence avec `CLE_ORS`, qui doit forcément partir dans la page
  parce que c'est le navigateur qui calcule le prix. La même porte servira
  à cacher la clé d'itinéraire, à laisser un client consulter sa course
  par sa référence, et à tenir les comptes chauffeurs.

## LA PALETTE — LE BLEU ELA, PLUS AUCUN VERT

**Le vert céladon est retiré de partout le 4 octobre 2026** (Barbaros, capture
de l'écran des prix : « il y a encore l'ancienne couleur verte, enlève les
anciennes couleurs de partout »). Les rôles gardent leur nom, seules leurs
valeurs ont changé, et ce sont celles de l'admin :

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

- **Ce qui le cachait** : la façade (`application-facade.css`) repeignait une
  partie du site en bleu, mais `index.html` gardait le céladon à la racine ET
  écrit en dur dans une trentaine de dessins, le tracé de la carte et ses
  repères. On a changé la SOURCE, pas ajouté une couche de plus.
- **Ne jamais renommer ces variables d'après la teinte du jour** : un rôle
  nommé par sa couleur finit par ramener la couleur.
- **Restent, et ce sont des états ou des marques** : le rouge de l'attente
  (`#C9302F`), le vert WhatsApp (`#25D366`, une marque), le vert « Réservation
  validée » de la liste de la réception (un état), l'orange d'un partenaire.
- Contrôle : sur le site construit, aucune couleur verte calculée hors
  WhatsApp sur l'écran des prix (vérifié le 4/10/2026). Blanc sur `--accent`
  5,1 ; `--accent-encre` sur `--accent-clair` 7,6.
## L'ICÔNE — LE ROND, ET « TRANSFER » DESSOUS

Septembre 2026. Deux demandes successives : « change l'icône aussi »,
puis, en voyant les aperçus, « on garde le rond et on ajoute Transfer ».

**LES TROIS FICHIERS SE REFONT ENSEMBLE, TOUJOURS.** `icon.svg`,
`icon-maskable.svg` et `icon-180.png`. Un jeu d'icônes à moitié changé est
pire qu'un ancien cohérent : le téléphone montre l'une, l'onglet l'autre.

| Fichier | Forme | Pourquoi |
|---|---|---|
| `icon.svg` | **rond**, coins transparents | c'est celui qu'il a choisi |
| `icon-maskable.svg` | **carré PLEIN** | Android recadre lui-même et rogne jusqu'à 10 % de chaque bord ; à coins transparents il donnerait un rond posé sur un carré blanc |
| `icon-180.png` | carré opaque | iOS ignore un `apple-touch-icon` en SVG **et** n'accepte pas la transparence — les coins deviendraient noirs. Il applique son propre arrondi par-dessus |

- **`composer.py` (hors dépôt, dans le bac à sable) FABRIQUE les trois.**
  Ne pas retoucher les SVG à la main : le PNG dériverait du SVG au premier
  changement.
- **Le script lisait sa propre sortie — c'était un vrai défaut.** Il
  extrayait les contours d'« ELA » depuis `icon.svg`, qu'il écrit ensuite :
  un second passage reprenait « TRANSFER » comme s'il était une lettre
  d'« ELA ». Les contours sont maintenant **figés dans un fichier à part**,
  extraits une seule fois depuis git. Un script de fabrication doit pouvoir
  être rejoué à l'identique autant de fois qu'on veut.
- **Les lettres sont les contours réels d'Inter**, via `fontTools` — jamais
  du texte vivant. Le fichier ne dépend d'aucune police et s'affiche à
  l'identique partout, même sans réseau. L'échelle est calée sur la
  **hauteur des capitales**, pas sur la taille nominale : c'est la seule
  mesure qui aligne deux mots posés l'un sous l'autre.
- **À 20 px, « TRANSFER » n'est plus lisible** — il fait 3 px de haut. C'est
  inévitable et ça a été dit à Barbaros. « ELA » tient, lui. Si ça devient
  gênant, la correction est une variante sans le mot pour le seul favicon.
- **Le bloc est centré optiquement, pas géométriquement** : son milieu est
  à 249 pour un cercle centré à 256. Un bloc de texte exactement centré
  paraît tomber vers le bas.
- **La zone sûre du maskable est un cercle de 80 % du côté** (rayon 204,8).
  Le script mesure le coin le plus éloigné du centre et le compare à cette
  limite — 144,3 aujourd'hui.

## « ME LOCALISER » — ELLE REND UNE ADRESSE, PAS UNE POSITION

Septembre 2026, à sa demande : « ajoute la géolocalisation pour les
clients ». Le client est à Roissy, téléphone dans une main et valise dans
l'autre : lui faire taper « Aéroport Charles-de-Gaulle, Terminal 2E » est
le moment où l'on perd une réservation.

- **SEULEMENT AU DÉPART.** L'arrivée est là où l'on va, pas là où l'on est.
  Le bouton **remplace le chevron** de ce champ au lieu de s'y ajouter :
  deux pictogrammes au même endroit, l'un décoratif et l'autre cliquable,
  et le client appuie sur le mauvais.
- **UN POINT GPS NE SERT À RIEN.** Le chauffeur a besoin d'une adresse à
  composer dans son navigateur, et le bon d'un libellé à écrire. La
  position est donc relue par la **Base Adresse Nationale**
  (`/reverse/`) ; si elle ne rend rien — une bretelle, un champ — on le
  **dit** au lieu d'accepter une course vers des coordonnées nues.
- **LES COORDONNÉES RETENUES SONT CELLES DE L'ADRESSE, PAS DU GPS.** Le
  prix se calcule sur le trajet que le chauffeur fera vraiment. Le test
  donne au faux GPS et à la fausse BAN des points **différents**, et lit
  l'URL envoyée au calculateur d'itinéraire pour savoir lequel est sorti —
  un test qui regarde dans le moteur ne prouve pas ce que fait la voiture.
- **`brancher()` REND MAINTENANT UNE PRISE `poser(item)`**, et ce n'est
  pas un confort. Écrire dans `champ.value` depuis l'extérieur ne
  déclenche aucun `input` : `choisi` resterait nul, la garde qui invalide
  les coordonnées ne s'armerait donc jamais — elle ne se déclenche que si
  une adresse a été retenue — et le client qui corrige son adresse à la
  main partirait avec les coordonnées d'un endroit et le nom d'un autre.
  **Le prix est ferme, donc opposable : ce serait faux ET opposable.**
- **TROIS MESSAGES DISTINCTS**, parce qu'ils appellent trois gestes
  différents : refus (« autorisez-la dans les réglages »), pas d'adresse
  ici (« saisissez-la »), panne (« saisissez l'adresse »). Un seul message
  « ça n'a pas marché » ne dit pas quoi faire.
- **On invite à VÉRIFIER l'adresse.** Le GPS d'un téléphone se trompe
  couramment de plusieurs dizaines de mètres, donc de numéro dans la rue —
  et le chauffeur va à l'adresse écrite.
- **La zone des 90 km s'applique**, sans rien de spécial à écrire :
  `poser()` appelle le même `quand()` que la liste, donc `jugerZone()`. Un
  test l'éprouve depuis Lille — pas de porte dérobée.
- **`data-t-aria` a été ajouté à `appliquerLangue()`.** Un bouton dont le
  seul contenu est un dessin n'a que son `aria-label` à dire ; non
  traduit, il reste en français dans le lecteur d'écran d'un client
  anglophone — le seul endroit où le texte compte pour lui.
- **44 px de côté**, et **aucun `position:relative`** : le bouton est un
  élément de la rangée flex du champ. C'est délibéré — sur l'ancien site,
  un `position:relative` posé sur un bouton déjà placé en absolu l'avait
  fait retomber dans le flux, à gauche du champ d'adresse.
- **RIEN N'EST CONSERVÉ** : la position remplit le champ puis est oubliée.
  Ce qui part sur le bon est l'adresse, comme si le client l'avait tapée.
  **La politique de confidentialité annonçait déjà « Me localiser »**
  depuis l'ancien site — elle décrivait une fonction qui n'existait pas,
  c'est réglé. Deux contrôles le verrouillent.
- **Piège de capture, pas de code** : à 390×560 la page se remet en page
  et la pastille WhatsApp remonte sur le champ. Mesuré à la vraie hauteur
  (390×844), le bouton est à 404–448 px et la pastille à 686–740, non
  affichée. **Toujours capturer à 844 px de haut.**

## L'ESPACE EXPLOITANT EST DEVENU UN BACK-OFFICE

Septembre 2026, sur sa maquette : « Fait dans ce style ». L'espace était une
suite de blocs empilés sans hiérarchie — il l'a trouvé « bizarre », et il
avait raison : rien ne disait ce qu'il fallait regarder en premier.

- **UNE COLONNE À GAUCHE SUR ORDINATEUR, UNE RANGÉE DE PASTILLES SUR
  TÉLÉPHONE, ET LE MÊME HTML.** Deux mises en page séparées voudraient dire
  deux tableaux de bord à tenir, et le jour où l'un gagne un bouton l'autre
  l'oublie. Bascule à 900 px.
- **`body.espace`, PAS `body.exploitant`.** C'est le piège de cette
  refonte : `exploitant` est posée AVANT le verrou. S'en servir aurait
  affiché la colonne — nom, état du serveur, accès au registre — à qui
  n'a pas encore le code. `espace` n'arrive que dans `ouvrirEspace()`. Un
  contrôle le verrouille.
- **`.page` est bridée à 520 px** — c'est une application de téléphone. Un
  back-office dans 520 px n'en est plus un : la largeur n'est libérée que
  sous `body.espace`, au-delà de 900 px, et le contenu reste capé à
  1080 px.
- **L'ORDRE DIT CE QUI COMPTE** : les quatre chiffres, « Coller une
  demande », la liste des courses, puis les panneaux, puis l'affiche et le
  serveur. L'affiche et le serveur se règlent une fois et ne se regardent
  plus — ils étaient au-dessus de la liste des demandes en attente.
- **RIEN N'EST DÉCORATIF, ET C'EST LA RÈGLE.** La maquette portait « 4,9/5
  sur 128 avis » et une carte des chauffeurs en temps réel. Il n'a **aucun
  avis** — une note inventée est une pratique commerciale trompeuse
  (L132-2) — et **aucun chauffeur n'a d'application qui envoie sa
  position**. Le panneau des avis existe, vide, et dit pourquoi ; la carte
  est remplacée par « D'où viennent les clients », qui est du vrai. Un
  chiffre décoratif sur un tableau de bord finit par servir à décider.
- **`dessinerAdmin()` est appelée depuis `dessinerBord()`**, et reçoit le
  registre déjà lu : deux lectures du `localStorage` pour un même dessin
  finiraient par diverger.
- **L'ÉCRAN D'ABORD, LE DESSIN ENSUITE.** `ouvrirEspace()` appelle
  `ecran("ecran-bord")` **avant** `dessinerBord()` : la courbe est tracée à
  la largeur RÉELLE de son panneau, et cette largeur vaut zéro tant que
  l'écran est masqué — la courbe sortait plate. Elle est refaite au
  redimensionnement pour la même raison.
- **16 px réservés en haut de la courbe** : le chiffre s'écrit au-dessus de
  son point, et le point le plus haut est celui du meilleur jour — sans
  cette marge, c'est justement ce chiffre-là qui sort du cadre.
- **Le camembert est UN cercle dont on décale le trait**
  (`stroke-dasharray` sur un rayon de 15,9 pour une circonférence de 100) :
  deux arcs dessinés séparément laissent une couture blanche à chaque
  jonction.
- **Sans référence, pas de pourcentage.** `variation()` dit le chiffre brut
  quand la semaine précédente est à zéro : « +100 % » ne veut rien dire, et
  le « −100 % » de la semaine d'après ferait peur pour rien.
- **L'entrée allumée suit l'ÉCRAN, pas le clic** : on revient au tableau de
  bord par le bouton « Retour » du registre, et « Registre » y serait resté
  allumé.
- « Affiche hôtel » et « Serveur » ne sont pas des écrans mais des blocs de
  la page : on y descend. **Un contrôle vérifie que chaque `data-admin-vers`
  vise un élément qui existe** — un lien qui ne mène nulle part est pire que
  pas de lien.
- `#btnQuitter` et `#btnRegistre` ont déménagé dans la colonne : **les
  identifiants sont inchangés**, six suites les cliquent.

### LE TITRE D'ACCUEIL DIT QUI, QUOI ET OÙ

Septembre 2026, sur sa relecture commerciale : « le client doit comprendre
qui tu es + ce que tu fais + où tu opères en une seconde ». Il avait raison,
et sa remarque a découvert un défaut plus grave que le style.

- **LE SOUS-TITRE VENDAIT DEUX PRESTATIONS QU'ON NE PEUT PAS RÉSERVER.**
  « Transferts privés, **mises à disposition** et **déplacements sur
  mesure** » — la mise à disposition a été retirée du site en septembre 2026,
  et « sur mesure » n'existe nulle part. Le paragraphe `seo_texte` avait été
  nettoyé à l'époque ; **ce titre-là avait été oublié**. Un site qui décrit
  une prestation qu'on ne peut pas commander est une promesse en l'air.
- **« à Paris et en Île-de-France » NE TIENT PAS DANS LE TITRE.** Mesuré :
  27 caractères pour une largeur qui en tient 21 à cette taille — il cassait
  en trois lignes avec « France » toute seule. Le titre dit donc **« à
  Paris »**, ce que cherche un visiteur qui atterrit à Roissy, et le
  sous-titre ouvre aussitôt à **« Toute l'Île-de-France »** : ses clients
  réservent depuis Argenteuil et Saint-Denis, un titre qui les exclurait leur
  ferait croire que ce n'est pas pour eux.
- **LE BOUTON DIT « VOIR MON PRIX », ET C'EST LE SEUL POINT OÙ ON NE L'A PAS
  SUIVI.** Il proposait « Réserver mon trajet ». Deux raisons : le bloc
  s'intitule **déjà** « Réserver un trajet » cinq centimètres au-dessus — un
  bouton qui répète le titre de sa propre carte n'ajoute rien ; et **le clic
  ne réserve pas, il affiche un prix**. « Voir les tarifs et véhicules »
  n'était pas bon non plus : trop long, et « les tarifs » laisse croire à une
  grille. C'est le même arbitrage que sur l'ancien site, pour la même raison.

### LE BANDEAU EST DEVENU UNE VRAIE ACCROCHE

Septembre 2026, sa relecture suivante : « Le site commence directement avec
du contenu fonctionnel : *Réserver un trajet / Simple, rapide et sécurisé*.
C'est fonctionnel, mais pas suffisamment premium ni commercial. Je veux une
vraie Hero. » Cinq lignes : le titre, les destinations, le prix ferme, un
bouton, et la réassurance.

- **« à Paris et en Île-de-France » EST REVENU DANS LE TITRE**, et la note
  du dessus n'est plus qu'à moitié vraie : ce qui ne tenait pas, c'était
  27 caractères sur **deux** lignes. Le titre est maintenant coupé **à la
  main en trois** — « Votre chauffeur privé / à Paris / et en Île-de-France ».
  Un titre d'affiche se compose, il ne se subit pas.
- **LE NOM DE LA MARQUE N'EST PAS RÉPÉTÉ DANS LE BANDEAU**, alors qu'il le
  demandait. « ELATRANSFER » est écrit en 23 px **à deux centimètres
  au-dessus**, dans l'enseigne, sur tous les écrans. L'écrire deux fois dans
  le même regard ne dit pas la marque plus fort : ça mange la seule ressource
  rare du bandeau — la hauteur — au détriment de ce que le visiteur cherche.
  Dit à Barbaros ; il tranchera s'il y tient.
- **LE TEXTE N'EST PLUS EN `position:absolute`, ET C'EST CE QUI PERMET TOUT
  LE RESTE.** Posé en `inset:0`, il obligeait `.hero` à porter une **hauteur
  fixe** (268 px) : toute ligne ajoutée serait sortie par le bas **en
  silence** — la photo ne bouge pas, le texte disparaît. Dans le flux, c'est
  le contenu qui donne la hauteur. Seuls la photo et le voile restent en
  absolu, ils n'ont rien à mesurer. Un contrôle vérifie que **rien ne sort du
  bandeau par le bas**.
- **LES 74 px DE MARGE BASSE NE SONT PAS DE LA RESPIRATION** : la carte
  « Réserver » remonte de 46 px par-dessus. Sans eux, elle recouvrirait la
  ligne « 24 h/24 » — exactement le défaut du bandeau de cookies sur l'ancien
  site.
- **LE BOUTON DU BANDEAU NE RÉSERVE RIEN**, il descend au formulaire et pose
  le curseur dans le champ de départ. Il n'y a rien à réserver tant qu'on ne
  sait pas d'où à où. **Le défilement est lancé d'abord, le focus arrive
  380 ms après** : le navigateur amène de force un champ focalisé à l'écran,
  et un focus posé en premier annule l'animation qu'on vient de lancer.
- **C'EST LUI QUI PAIE LA HAUTEUR DU BANDEAU.** Le formulaire ne tient plus
  dans le premier écran — la note « ne pas le remonter » de l'ancien site est
  caduque ici. Le marché est explicite : le bandeau prend la place, il rend
  une action. Un contrôle mesure que **le bouton reste dans les 844 px** ;
  s'il en sort un jour, le bandeau aura seulement éloigné la réservation.
- **LE SOUS-TITRE N'A PLUS DE `max-width`.** Les 30 ch dataient de l'époque
  où c'était une phrase ; c'est devenu une liste de destinations, et une
  liste qui casse en deux se lit comme deux listes. Un contrôle vérifie
  qu'elle tient sur **une** ligne.
- **UN IPHONE SE FAIT 320 px**, et le titre y passait à **quatre** lignes.
  Les coupures écrites à la main ne protègent que de la casse qu'on a
  prévue ; celle-là se règle à la taille (26 px sous 360 px). Deux contrôles
  à 320 px.
- **DISNEYLAND EST UNE DESTINATION, PAS UNE OFFRE.** Le nommer est un usage
  descriptif — on dit où l'on conduit. **Ne pas en refaire un « pack »** : il
  a été retiré à sa demande, c'était le premier des deux.

### CE QUE LE BANDEAU A CASSÉ — LA BARRE DU BAS MANGEAIT « VOIR MON PRIX »

Septembre 2026, trouvé par les suites juste avant la mise en ligne. **Le
défaut le plus coûteux de la soirée, et il était invisible.**

Le bandeau plus haut a poussé « Voir mon prix » à **774–827** pendant que la
barre du bas occupe **784–844**. Sa moitié basse passait **derrière** la
barre : un client qui ouvre la page, remplit le formulaire et appuie au
milieu du bouton **ouvrait l'onglet « Trajets »**. Il ne voyait pas son prix,
il changeait d'écran, sans le moindre message.

- **LA NOTE « le formulaire entier tient dans le premier écran, ne pas le
  remonter » N'ÉTAIT PAS DE LA COQUETTERIE.** Elle protégeait exactement ça,
  et je l'ai enfreinte en croyant ne coûter qu'un défilement.
- **LA RÈGLE EXISTANTE NE COUVRAIT PAS CE CAS** : le contrôle des éléments
  flottants de `test-nouveau-bon` **exclut explicitement `.barre`**, parce
  qu'elle est légitime et toujours là. C'est précisément pour ça qu'il en
  fallait une autre — **ce qui est toujours là ne se remarque plus**.
- **CE QUI A PAYÉ LES 68 px : le bloc « Réserver un trajet / Simple, rapide
  et sécurisé ».** C'est exactement celui qu'il avait désigné en demandant
  une vraie accroche. Le bandeau dit maintenant qui l'on est, ce qu'on vend
  et à quel prix, et il porte un bouton qui descend ici : répéter le titre
  juste en dessous, avec une icône de 50 px, c'était accueillir deux fois.
  Une correction de mise en page qui supprime un doublon vaut mieux qu'une
  correction qui grignote cinq marges.
- **LE TÉMOIN DE LANGUE VISAIT CE BLOC** — `[data-t="reserver_titre"]`, dans
  quatre contrôles de `test-nouveau-langues`. Il vise désormais
  `[data-t="btn_prix"]` : **un témoin doit viser ce qui ne peut pas
  disparaître**, ici le bouton sans lequel il n'y a pas de réservation.
- **LE SYMPTÔME N'AVAIT AUCUN RAPPORT AVEC LA CAUSE.** `test-nouveau-option`
  s'arrêtait sur un délai en cherchant `.veh-carte`, parce qu'un
  `click({force:true})` avait atterri sur la barre et ouvert l'écran des
  trajets. **`force:true` ne signale pas un bouton recouvert : il clique à
  côté et continue.** Une suite qui n'affiche ni réussite ni échec est un
  échec — ne jamais la lire comme « pas concernée ».
- **LE PREMIER JET DU NOUVEAU CONTRÔLE PASSAIT AU VERT SUR LA VERSION
  CASSÉE.** Il était placé **après** le clic sur le bouton du bandeau, donc
  sur une page déjà défilée : il lisait 365 px là où le client voit 774. Un
  contrôle de position se mesure **à l'arrêt, avant tout geste**. Éprouvé
  ensuite contre l'ancien code : il rend « reçoit : onglet ».

### L'ESPACE EXPLOITANT A SON PROPRE MANIFESTE

Septembre 2026, à sa demande : « comment je peux l'enregistrer sur mon
téléphone ». **Le piège n'était pas dans le geste, il était dans le
fichier** : `manifest.webmanifest` déclare `start_url: "./"`, et **iOS comme
Android lisent le manifeste de la page qu'on ajoute, pas son adresse**. Une
icône posée depuis `?exploitant=1` aurait donc rouvert **le site client** —
et rien à l'écran n'aurait expliqué pourquoi.

- `manifest-exploitant.webmanifest`, `start_url: "./index.html?exploitant=1"`,
  **mêmes icônes** : un jeu à moitié changé est pire qu'un ancien cohérent.
- **L'ÉCHANGE SE FAIT EN TÊTE DE PAGE**, dans un script placé juste après le
  `<link rel="manifest" id="manifeste">`. Posé plus bas, le manifeste
  d'origine serait déjà chargé quand on le remplacerait.
- **`construire.sh` DOIT LE COPIER** — même point de rupture que `carte/` :
  oublié, il marche en local (où le serveur sert tout le dépôt) et reste
  introuvable en ligne. Un contrôle lit les seules lignes de commande.
- Le mode exploitant continue de suivre l'**ADRESSE**, jamais l'appareil :
  sans le paramètre on reste côté client, y compris sur son téléphone.
- **LE MANIFESTE EST AUSSI DÉCLARÉ SUR `/exploitant/index.html`**, la page de
  redirection (septembre 2026, après « quand je clique c'est toujours la
  version publique qui s'affiche »). « Ajouter à l'écran d'accueil » lit le
  manifeste de la page **affichée au moment du geste** : cette page redirige
  en quelques millisecondes, mais rien ne garantit l'instant où le doigt
  appuie. Sans manifeste ici, un iPhone retombe sur le site CLIENT. Le
  **même** fichier que la page d'arrivée — deux manifestes pour un seul
  espace se désaccorderaient au premier changement.
- **UNE ICÔNE POSÉE AVANT LE 8 SEPTEMBRE 2026 AU SOIR POINTE SUR LE SITE
  CLIENT, ET RIEN NE PEUT LA CORRIGER À DISTANCE.** Le manifeste n'existait
  pas en ligne avant cette mise en ligne : le raccourci a figé
  `start_url: "./"` à l'instant où il a été créé. Il faut **le supprimer et
  le refaire**. Le redire si le symptôme revient — c'est la première chose à
  vérifier, avant de chercher un défaut.

### LE SERVICE WORKER RANGEAIT TOUTES LES PAGES SOUS UNE SEULE CLÉ

Septembre 2026, trouvé en cherchant pourquoi l'icône ouvrait le site public.
Ce n'était pas la cause de son symptôme, mais c'était **un vrai défaut**, et
il ne se voit que hors ligne.

`sw.js` gardait **chaque** page HTML sous `./index.html`, quelle que soit
l'adresse demandée. Il suffisait donc d'ouvrir `/admin.html` ou
`/exploitant/` — deux pages qui ne font **que** rediriger — pour que leur
contenu remplace le site dans le cache. Un client hors ligne rouvrait ensuite
elatransfer.com et tombait sur « Ouverture de l'espace exploitant… », puis
sur l'écran du code.

- **Une seule clé pour un site qui a trois pages** : la même faute que
  `.service span span`, une règle écrite pour un cas unique le jour où il n'y
  en avait qu'un. `admin.html` la portait depuis toujours ; `/exploitant/` l'a
  rejointe le soir même en entrant dans `NOS_DOSSIERS`.
- La réponse est désormais gardée **sous sa propre adresse** (`c.put(req, …)`).
- **LE REPLI HORS LIGNE NE VAUT QUE POUR L'APPLICATION** (`estLApplication`).
  Servir `index.html` à l'adresse `/exploitant/` casserait tous ses chemins
  relatifs — icônes, service worker, bibliothèque de carte sont à la racine,
  pas dans le sous-dossier. **Mieux vaut une erreur franche qu'une page à
  moitié chargée.**
- **LE CONTRÔLE LIT LA SOURCE**, parce que le service worker **ne s'installe
  qu'en `https`** et reste donc injoignable depuis le serveur de test. Éprouvé
  contre l'ancien code : les deux contrôles tombent.

### « POURQUOI CHOISIR ELATRANSFER ? » ET LES CINQ SERVICES

Septembre 2026, à sa demande, dans la foulée du paiement. Deux blocs de
l'accueil réécrits ensemble.

**Les engagements** deviennent un bloc de confiance, avec ses arguments à
lui : **Chauffeur professionnel · Prix ferme · Suivi du vol · Assistance
24 h/24**, sous le titre « Pourquoi choisir Elatransfer ? ».
- **CE QU'IL A RETIRÉ, ET CE QU'ON A SAUVÉ AU PASSAGE.** « Véhicules haut de
  gamme » et « Paiement à bord » sortent. Or « Paiement à bord » était **le
  seul endroit de l'accueil** qui disait qu'on ne paie pas en ligne — le
  reste ne le dit qu'au récapitulatif, trois écrans plus loin. Le fait est
  donc reversé dans son propre argument : « Prix ferme — **connu avant le
  départ, réglé au chauffeur** ». Un argument retiré peut emporter une
  information qui n'était nulle part ailleurs.
- **« SUIVI DU VOL » RÉPÈTE L'ENCADRÉ VERT JUSTE AU-DESSUS**, et c'est
  assumé : l'encadré s'adresse au client qui atterrit et lui fait remplir son
  numéro de vol ; la carte est un argument dans une liste lue en diagonale.
  Les deux formulations sont différentes — **c'est la répétition mot pour mot
  qui fait relire**, pas le sujet commun. **À lui de trancher s'il veut n'en
  garder qu'un** : c'est signalé.
- **L'AVION DE LA CARTE N'EST PAS CELUI DE L'ENCADRÉ.** Posés à trois
  centimètres, deux dessins identiques se lisent comme un copier-coller.
  Celui de la carte penche et traîne une trajectoire pointillée : il ne dit
  pas « avion », il dit « on le suit ».
- L'icône de « Prix ferme » est une **étiquette**, pas la voiture héritée de
  « véhicules haut de gamme » — laissée en place, elle aurait dit « berline »
  à côté d'un titre qui parle d'argent.

**Les services** passent de trois à **cinq** : Aéroport · Hôtel · Gare ·
Professionnel · Mise à disposition.
- **LES PHOTOS SONT PARTIES, REMPLACÉES PAR DES PICTOGRAMMES.** Il en aurait
  fallu deux de plus, et **une photo ne s'installe pas sans savoir d'où elle
  vient** — les douze premières venaient de Google Images. Sa maquette est de
  toute façon une liste d'icônes. Ce qu'on y gagne : **l'accueil ne
  télécharge plus aucune image** (un contrôle descend toute la page et
  vérifie que rien de `photos/` ne part), et une carte de trois lignes laisse
  voir qu'il y en a d'autres. **`photos/` reste dans le dépôt** : c'est du
  travail qu'il a fourni.
- **PAS D'EMOJI** — il en proposait cinq (✈️ 🏨 🚆 💼 🚘). Ils changent de
  dessin d'un téléphone à l'autre et grossissent mal : même règle que les
  voitures. Un contrôle cherche les emojis dans le bloc.
- **LA RÈGLE DES DESTINATIONS** : une carte mène au formulaire **si et
  seulement si** ce qu'elle annonce est une ADRESSE. Un hôtel, une gare, un
  rendez-vous d'affaires en sont ; « un chauffeur à l'heure » n'en est pas
  un — il ouvre « Nous joindre ». Le test lit le `data-ecran` **déclaré** et
  vérifie qu'un clic y mène vraiment, carte par carte, plus les deux bornes
  (au moins une vers le formulaire, au moins une ailleurs) : sans elles, un
  code qui enverrait tout vers le formulaire passerait au vert.
- **LES VISITES SONT PORTÉES PAR LA MISE À DISPOSITION** (« Chauffeur à
  l'heure · Paris, Disneyland »), pas par une carte à elles. **Ce ne sont pas
  des offres** : les packs ont été retirés deux fois à sa demande. On nomme
  des destinations, on ne vend pas un forfait — et c'est justement la carte
  qui ouvre la négociation de vive voix.
- **LES CARTES ONT MAIGRI DE 178 À 156 px.** Pas pour économiser : à cinq
  entrées et 178 px, la deuxième s'arrêtait pile au bord de l'écran et la
  piste avait l'air de finir là. Un contrôle vérifie qu'elle **déborde** de
  son cadre — c'est ce qui dit qu'on peut balayer.
- **PIÈGE DÉJÀ CONNU, RENCONTRÉ UNE TROISIÈME FOIS** : la règle des
  sous-titres visait `.service span span`, et la pastille est elle aussi un
  span dans un span depuis qu'elle a remplacé la photo — elle repassait en
  `display:block` et l'icône se collait en haut à gauche. Même faute que
  `.engagement span`. Viser `.service-corps > span:not(.service-icone)`.
- **LES DEUX CONTRÔLES QUI FIGEAIENT LA LISTE ONT SAUTÉ.** `test-nouveau-services`
  vérifiait « trois cartes » et « la mise à disposition est au milieu » ;
  `test-nouveau-langues` figeait les trois noms anglais. Les deux seraient
  tombés sur une réorganisation légitime. Ils éprouvent maintenant la
  **règle**, pas la liste — même leçon que la barre du bas figée sur quatre
  onglets.

### LE BOUTON WHATSAPP OUVRE UN CHOIX, PLUS UN MESSAGE TOUT ÉCRIT

Septembre 2026, à sa demande : « lorsqu'un client clique sur WhatsApp il doit
avoir des choix… il ne doit pas y avoir un message pré-empli ».

L'onglet envoyait « Bonjour, j'ai une question sur ma réservation » **à tout
le monde**. Un client qui voulait simplement réserver effaçait une phrase qui
n'était pas la sienne, et Barbaros recevait la **même** phrase de tous —
c'est-à-dire aucune information sur ce qu'on lui veut.

- **CE N'EST PLUS UN LIEN MAIS UN BOUTON** (`#btnWa`) : il n'emmène plus
  directement chez WhatsApp, il demande d'abord. Il garde
  `data-onglet="whatsapp"`, qui ne correspond à aucun écran et ne s'allume
  donc jamais.
- **QUATRE PORTES, ET UNE SEULE N'OUVRE PAS WHATSAPP.** « Réserver un
  trajet » ramène au formulaire et pose le curseur dans le départ : quelqu'un
  qui appuie sur WhatsApp pour demander « vous faites Orly ? » n'a pas besoin
  d'écrire, il a besoin d'un prix. C'est une réservation de plus et un
  message de moins. « Nous appeler » ouvre `tel:`.
- **LA RÉFÉRENCE DE SA COURSE EN COURS ENTRE DANS LE MESSAGE** quand
  l'appareil en connaît une (`derniereReference()`, les courses **non
  finies** — un trajet fait il y a trois mois n'est pas le sujet). Sans elle,
  Barbaros répond « laquelle ? » et perd un aller-retour, la nuit, sur dix
  conversations. Elle ne sort pas du téléphone du client : c'est SA course,
  dans SON message.
- **`window.open` EST DANS LE GESTE DU CLIC**, sans aucun `await` avant —
  Safari iOS bloque une fenêtre ouverte après une attente. Même règle que
  l'envoi de la demande.
- **LA FEUILLE EST AU-DESSUS DE LA BARRE** (z-index 60 contre 50). Une
  feuille passant dessous laisserait ses derniers choix inaccessibles :
  exactement le défaut corrigé le même soir sur « Voir mon prix ».
- **LES DEUX CONTRÔLES QUI LISAIENT LE `href` SONT TOMBÉS AVEC LUI.** Ils
  éprouvent maintenant le **chemin complet** — appuyer, choisir, et lire le
  lien qui part. Vérifier seulement que la feuille s'ouvre laisserait passer
  un choix qui n'envoie rien, un bouton mort au bout d'un menu.

### LES PAPIERS DES CHAUFFEURS ONT QUITTÉ LE TABLEAU DE BORD

Septembre 2026, à sa demande : « supprime les infos de chauffeur sur le
tableau de bord ». Il y sert à traiter et à créer des courses ; un carnet à
mettre à jour n'est pas une course.

- **LE PANNEAU N'EST PAS SUPPRIMÉ, IL A DÉMÉNAGÉ** dans `#ecran-chauffeurs`,
  en tête d'écran — là où l'on corrige une date, le geste suivant à portée de
  doigt. Une carte professionnelle ou une assurance périmée engage la
  responsabilité d'Elatransfer au moment de l'attribution (L3142-1) : le
  retirer entièrement, ce serait n'avoir plus rien à opposer.
- **L'AVERTISSEMENT QUI COMPTE VRAIMENT N'A PAS BOUGÉ** : celui du bon, à
  l'instant où l'on attribue. C'est lui qui arrête le geste.
- **`dessinerPapiers()` EST UNE FONCTION À PART**, appelée depuis
  `dessinerBord()` **et** `dessinerChauffeurs()`. Deux copies du même dessin
  finissent par diverger, et celle qu'on oublie est celle qui montre une
  assurance périmée comme si elle était valable.
- **LE CONTRÔLE ÉPROUVE LES DEUX FACES** — parti du tableau de bord, arrivé
  dans le carnet. Un contrôle qui ne dirait que « absent du tableau de bord »
  passerait au vert si on l'avait effacé.

### LA MAJORATION DE NUIT — CE QU'IL A DEMANDÉ, ET CE QUI RESTE À TRANCHER

Septembre 2026, sur une capture à 23 h 22 : « il y a un problème avec le
prix ? C'est trop cher non, le tarif nuit est appliqué ? »

**Le calcul était juste**, à la grille de l'époque : 37 km, Berline
2,95 €/km → 109,15 € ×1,2 = 130,98 → **130 €**. **Il a fait baisser les deux
tarifs dans la foulée** — voir juste en dessous.

- **La nuit va de 21 h à 6 h**, plus **tout le samedi et tout le dimanche**
  (`nuitOuWeekend`). C'est écrit à l'article 4 des CGV, dans les deux langues.
- **CE QUI A ÉTÉ DIT, ET QU'IL N'A PAS ENCORE TRANCHÉ** : ce n'est pas la
  majoration qui est chère, c'est le **tarif de base**. 110 € de jour pour
  Argenteuil → Orly quand un concurrent facture 70 à 90 €. Et le week-end
  **entier** à +20 % est large — un samedi après-midi n'a rien d'une course
  de nuit.
- **IL A TRANCHÉ LE SOIR MÊME** : « change le tarif berline à 2.35 et van
  4.08 ». Les deux gammes nommées, deux nombres distincts — aucune
  ambiguïté, donc rien à redemander. **La majoration et les planchers n'ont
  pas bougé.**
- **LES CGV N'ONT PAS EU À CHANGER, ET C'EST UN CHOIX D'ÉCRITURE ANCIEN.**
  Elles décrivent la MÉCANIQUE (« un tarif kilométrique propre à chaque
  gamme… ceux affichés sur le Service au moment de la réservation ») sans
  jamais citer un nombre. Vérifié dans les deux langues avant de conclure.
  **Ne pas y écrire de tarif chiffré** : ce serait un second endroit à tenir,
  et le prix est opposable.
- **L'ÉTIQUETTE DE LA PAGE « NOUVELLE COURSE » ÉTAIT ÉCRITE EN DUR**
  (`#crGrille`) — celle sur laquelle il annonce un montant au téléphone. Un
  changement de tarif y laissait un prix périmé sans que rien ne le signale.
  Elle est maintenant **fabriquée depuis `GAMMES`** (`ecrireGrille()`), même
  règle que le prix de la pancarte.
- **LE CONTRÔLE RELIT LA GRILLE DANS LA SOURCE** plutôt que de recopier les
  nombres : recopiés, ils déplaceraient simplement la faute dans le test.
  Le premier jet les avait recopiés en prétendant l'inverse — corrigé.
- **CE QUE CE CHANGEMENT A COÛTÉ EN TESTS** : dix-sept valeurs attendues dans
  huit suites, toutes **recalculées à la main depuis la nouvelle grille**,
  jamais recopiées de ce que la page affichait — un test qui prend la sortie
  pour référence ne vérifie plus rien. À 24,3 km, la berline passe de 70 € à
  **60 €** ; le van reste à **100 €**.
- **PIÈGE PROPRE À `test-nouveau-itineraire`** : ses quatre niveaux se
  distinguent par quatre prix DIFFÉRENTS — 30, 90, 60 et 40 € avec la
  nouvelle grille. Vérifié qu'ils restent distincts : un tarif qui en ferait
  coïncider deux rendrait la suite **aveugle sans qu'elle tombe**.

### LE PAIEMENT AFFIRME AVANT DE DEMANDER

Septembre 2026, à sa demande : « pour un touriste étranger, je simplifierais
énormément ». Le récapitulatif disait le même fait **deux fois** : une phrase
dense sous le total (« Règlement au chauffeur, à bord, en espèces ou par
carte. Aucun paiement en ligne, aucune donnée bancaire ») et, une ligne plus
bas, le bloc qui pose la question.

- **LE TITRE RÉPOND D'ABORD.** « Comment réglerez-vous ? » posait une
  question à quelqu'un qui se demandait encore s'il allait devoir sortir sa
  carte sur un site inconnu. « **Vous payez directement votre chauffeur** »
  lève l'inquiétude, et les deux boutons deviennent le détail d'une chose
  déjà comprise. Un contrôle vérifie que **le titre n'interroge pas** (pas de
  « ? » final) plutôt que le libellé exact : une reformulation légitime ne
  doit pas faire tomber la suite, un retour à la question si.
- **LA CARTE AVANT LES ESPÈCES**, dans son ordre à lui — c'est ce que cherche
  un client qui atterrit sans un euro sur lui. Le contrôle compare les
  **positions à l'écran**, pas l'ordre dans le code : c'est ce que le client
  lit, et une règle de mise en page peut inverser les deux. Aucun test ne
  dépendait de l'ordre, tous visent `[data-paiement="…"]`.
- **PAS D'EMOJI, LES MÊMES DESSINS QU'AVANT.** Il proposait 💳 et 💶 ; un
  emoji change de forme d'un téléphone à l'autre et grossit mal — la règle
  vaut ici comme pour les voitures. Les deux SVG étaient déjà dans les
  boutons, le résultat à l'écran est celui qu'il décrit.
- **LE FAIT N'EST DIT QU'UNE FOIS**, et le contrôle **compte**. Un doublon ne
  casse rien : il alourdit, et c'est exactement ce qui ne se voit pas en
  relisant le code. Éprouvé contre l'ancien texte — il rend « 2 fois ».
- `paiement_note_ligne` a disparu des deux langues, remplacée par
  `paiement_note` (« Aucun paiement en ligne nécessaire »). **« aucune donnée
  bancaire » n'est pas perdu** : c'est la politique de confidentialité qui le
  porte, là où il engage.
- Le repli HTML de `err_paiement` justifiait encore la question par le
  terminal du chauffeur — du texte mort, écrasé au chargement par la
  traduction, mais **c'est par là que revient une formule retirée**.

### L'ADRESSE DE L'EXPLOITANT EST « /exploitant/ »

Septembre 2026, sur sa relecture : « ça ne doit absolument pas être présenté
au client comme une partie du site public », et sa solution — deux adresses,
`elatransfer.com` pour les clients, `elatransfer.com/exploitant` pour lui.

- **CE QU'IL DÉCRIT N'EST PAS CE QUE VOIT UN CLIENT — MESURÉ.** Aucun écran
  de l'espace n'est à l'écran côté client, `.admin-nav` est à `display:none`
  hors de `body.espace`, et **aucun lien visible n'y conduit**. Deux
  contrôles le verrouillent, et ils **mesurent des rectangles** plutôt que
  de relire le CSS : une règle d'affichage se casse sans bruit, il suffit
  d'un sélecteur trop large ou d'une classe posée trop tôt.
- **CE QU'IL A VU EST LE FICHIER, ET LÀ IL A RAISON** : les deux espaces
  vivent dans le même `index.html`. Un client télécharge donc **~190 Ko de
  back-office sur 523 Ko** — 37 % de la page — et le lit dans la source.
  Ce n'est pas une fuite de données (les courses sont sur le serveur,
  derrière la RLS) mais c'est du poids et une mauvaise impression.
- **`/exploitant/` EST UN RACCOURCI, PAS UN SECOND SITE.** `exploitant/index.html`
  redirige vers `index.html?exploitant=1`, exactement comme `admin.html`.
  **Ne jamais dupliquer `index.html`** : un second exemplaire divergerait au
  premier correctif. `admin.html` reste valide — des liens sont déjà partis
  avec.
- **`../` ET PAS `./`** : cette page vit dans un SOUS-DOSSIER. Le chemin
  relatif d'un raccourci se lit depuis l'endroit où il est posé, pas depuis
  celui où il mène ; recopié de `admin.html`, il boucle sur lui-même. Un
  contrôle lit le lien **dans la source**, pas dans la page ouverte : la
  redirection part en quelques millisecondes et un `getElementById` arrivé
  après rend `null` — **un contrôle qui accepte `null` ne vérifie plus rien**.
- **`construire.sh` DOIT COPIER LE DOSSIER**, et le contrôle cherche
  `cp -r exploitant`, **pas le mot « exploitant »** : il est déjà dans
  `manifest-exploitant.webmanifest`, copié deux lignes plus haut, et le
  contrôle serait passé au vert la ligne retirée. Même faute que le premier
  jet du contrôle de `carte/`. Éprouvé en supprimant la ligne : il tombe.
- `exploitant` et `carte` sont entrés dans les noms **réservés** de
  `construire.sh` (un site vitrine ainsi nommé écraserait le raccourci) et
  dans `NOS_DOSSIERS` de `sw.js` (sinon le service worker le traite comme un
  site voisin et ne le garde jamais).
- **CE QUI RESTE À FAIRE, ET QU'IL FAUT LUI MONTRER AVANT** : la vraie
  séparation, où `construire.sh` **retire** les écrans exploitant du
  `index.html` publié aux clients et sert le fichier entier sous
  `/exploitant/`. Une seule source, deux sorties — pas deux fichiers à
  tenir. Ce n'est pas un travail de nuit : la saisie de course de
  l'exploitant partage le calcul du prix avec le client, et **deux calculs
  de prix qui divergent ne se voient pas** — on le découvre le jour où un
  client compare, sur un prix ferme donc opposable.

### LE TABLEAU DE BORD NE SERT PLUS QU'À TRAITER ET À CRÉER

Septembre 2026, à sa demande : « laisse le tableau de bord seulement pour le
traitement de course et créer des courses ».

**Ce qui reste** : l'état du serveur, « Coller une demande » / « Saisir par
téléphone », les trois filtres, la liste des courses.
**Ce qui est parti AU REGISTRE** : les quatre chiffres, la courbe des
réservations, le camembert berline/van, « Où en sont les courses », « D'où
viennent les clients », les avis. **Rien n'est supprimé** — le registre est
l'écran des chiffres, on l'ouvre pour eux ; sur le tableau de bord ils
repoussaient les demandes hors de l'écran.

- **UN SEUL PANNEAU RESTE, ET CE N'EST PAS UNE EXCEPTION DE CONFORT.**
  « Papiers à surveiller » n'affiche **rien** quand le carnet est à jour : il
  ne coûte aucune place dans le cas normal, et son apparition **est**
  l'alerte. Une carte professionnelle ou une assurance périmée engage la
  responsabilité d'Elatransfer à l'instant où l'on attribue la course
  (L3142-1). L'enterrer dans un autre écran, c'est le lire trop tard.
- **LE DESSIN A SUIVI LES PANNEAUX.** `ouvrirRegistre()` appelle
  `ecran("ecran-registre")` **puis** `dessinerBord()` : la courbe et le
  camembert mesurent la largeur RÉELLE de leur cadre, et un écran masqué
  mesure zéro — la courbe sortait plate. **Troisième fois que ce projet
  tombe dessus** (la courbe de l'espace exploitant, la carte du trajet).
  Le gestionnaire de redimensionnement regarde donc les DEUX écrans.
- **Mesuré** : la première course passe de y = 761 à **y = 518**, et à ~290
  une fois connecté — le bandeau rouge du serveur disparaît alors.

### « ÇA PREND BEAUCOUP DE PLACE » — LE TABLEAU DE BORD A MAIGRI

Septembre 2026, à sa demande, après une capture où il fallait franchir près
de **700 px** d'en-tête, de chiffres et de boutons avant de voir une seule
demande — c'est-à-dire avant de voir son travail. Mesuré à 390 px :

| | Avant | Après |
|---|---|---|
| Les quatre chiffres | ~230 px | **81 px** |
| Une carte de course | 142 px | **111 px** |
| « Coller une demande » | ~160 px | **~75 px** |
| Les trois filtres | ~130 px | **44 px** |
| Première course | y = 761 | **y = 611** (et ~380 une fois connecté) |

- **LES QUATRE CHIFFRES PASSENT DE FRONT.** L'icône de 33 px est masquée sur
  téléphone : elle ne disait rien que le libellé ne dise déjà, et elle
  coûtait une ligne entière. **Elle reste dans le code et revient au-delà de
  900 px** — ce n'est pas le même écran, ce ne sont pas les mêmes
  contraintes. Le libellé, lui, reste : la position et la couleur ne portent
  jamais le sens toutes seules.
- **LA CARTE DE COURSE PASSE DE QUATRE LIGNES À TROIS.** Les deux lignes
  grises — « état · date · véhicule » puis « nom · depuis » — disaient la
  même chose au même endroit. **La durée d'attente remonte à côté de la
  référence** : c'est le signal d'urgence, et en fin de ligne grise il était
  le premier tronqué sur une adresse longue.
- **LA LIGNE GRISE TRONQUE, elle ne passe pas à la ligne.** Une carte dont la
  hauteur dépend de la longueur d'une adresse ne se parcourt plus du regard,
  et c'est exactement ce qu'on venait réparer.
- **LES DEUX PORTES D'ENTRÉE PASSENT CÔTE À CÔTE**, sans titre : « Coller une
  demande » se suffit à lui-même, un intitulé au-dessus ne faisait que le
  répéter. Le second reste en creux — sur dix courses, neuf arrivent par
  message.
- **LES TROIS FILTRES TIENNENT SUR UNE LIGNE** : le nombre puis le mot, à
  44 px de haut. Ils restent des BOUTONS — ce sont les seuls chiffres de
  l'écran sur lesquels on appuie, et 44 px est la mesure d'un pouce.
- **LES BOUTONS DE LA CARTE DESCENDENT À 38 px, ET PAS PLUS BAS.** Ils se
  pressent à la chaîne le soir, sur trois ou quatre courses d'affilée.
- **CE QUI RESTE À FAIRE SI ÇA REDEVIENT DENSE** : les quatre chiffres
  répètent deux des trois filtres (« en attente », « réalisées ») à 200 px
  d'écart. Les deux qui ajoutent quelque chose sont « Courses aujourd'hui »
  et « Encaissé cette semaine ». Ne pas y toucher sans qu'il le redemande —
  la duplication coûte peu maintenant qu'elle tient sur une ligne.

## IL N'Y A PLUS DE MAJORATION DE NUIT NI DE WEEK-END

Septembre 2026, à sa demande : « supprime la majoration nuit 20 % sur le
site ». Le prix d'une course ne dépend plus **que** de la distance et de la
gamme : le même trajet vaut le même prix un mardi à 10 h, un samedi midi et
à 3 h du matin.

- **C'est la suite de sa propre remarque**, faite sur une capture à 23 h 22
  (« c'est trop cher non ? »). Ce n'était pas la majoration qui était chère,
  c'était le tarif de base ; il avait d'abord baissé les deux tarifs
  kilométriques (2,35 et 4,08 €/km), il supprime maintenant la majoration.
  Le week-end **entier** à +20 % était de toute façon large : un samedi
  après-midi n'a rien d'une course de nuit. La note « il n'a pas encore
  tranché » qui figurait plus haut est donc tranchée.
- **La question a été posée avant de couper** : la nuit seulement, ou la
  nuit ET le week-end ? Réponse : **tout**. Ne pas réintroduire la moitié en
  croyant compléter.
- Ce qui a disparu : `nuitOuWeekend()`, le paramètre `majoration` de
  `prix()`, le calcul de `course.majoration`, l'écriteau `#noteNuit` côté
  site, la clé de traduction `nuit` dans les deux langues, la mention
  « +20 % la nuit et le week-end » de l'étiquette de la page « Nouvelle
  course », et le rappel « nuit ou week-end +20 % » de son écriteau de
  calcul.
- **CE QUI RESTE, ET CE N'EST PAS UN OUBLI** : le champ `majoration` des
  courses enregistrées, désormais toujours faux. Il est écrit dans
  l'historique déjà stocké sur l'appareil et sur le serveur ; le retirer
  rendrait illisible une partie de ces courses. Même raison que les alias
  des anciens noms de gammes.
- **LES CGV ONT SUIVI, DANS LES DEUX LANGUES.** L'article 4 décrivait un
  +20 % qui ne s'applique plus. Des CGV qui annoncent une formation du prix
  différente de celle appliquée sont **pires qu'aucunes CGV** : le prix est
  ferme donc opposable, et le client y trouverait un argument contre nous.
  Elles disent maintenant qu'aucune majoration de nuit, de week-end ni de
  jour férié ne s'applique.
- **LE TARIF NUIT DU FLYER A ÉTÉ RETIRÉ À SON TOUR** (22 septembre 2026, à sa
  demande : « fait les prix je modifierai le flyer plus tard »). Cette note
  disait l'inverse et l'a dit pendant des jours — elle survivait à la
  décision qui l'invalidait. **IL N'Y A PLUS AUCUNE MAJORATION NULLE PART**,
  ni au kilométrage, ni au forfait d'un partenaire, ni la nuit, ni le
  week-end, ni les jours fériés.
  **Le flyer imprimé est donc périmé sur un quatrième point** — il annonce
  encore une colonne de nuit. Barbaros le refera ; d'ici là le comptoir
  facture moins que le papier, jamais plus.
- **Le contrôle qui compte est celui de `test-nouveau-exploitant`** : à 23 h
  et un samedi midi, le prix ne bouge pas. Éprouvé en réintroduisant la
  majoration — les deux contrôles tombent (70 € au lieu de 60). Une
  majoration qui revient en silence ne se voit pas : le prix s'affiche, il
  est simplement plus élevé d'un cinquième.

## LE MODE HÔTEL — LA GRILLE D'UN PARTENAIRE, DANS LE MÊME FICHIER

Septembre 2026, à sa demande, à partir du flyer easyHotel qu'il a fait
imprimer. Une réception réserve entre deux arrivées : elle lit la ligne du
papier posé sur son comptoir, elle appuie dessus, elle annonce le prix.

**CE N'EST PAS UNE PAGE À PART, ET C'EST LA DÉCISION QUI STRUCTURE TOUT.**
La question lui a été posée ; il a choisi l'écran dans `index.html`. Une
page autonome aurait voulu dire un second logo, un second jeu de couleurs,
une seconde grille — et surtout **tout à réécrire dedans** : le dépôt sur le
serveur, la provenance, le préavis de 15 minutes, la date, le téléphone, les
suites de tests. Une réception qui rate son envoi WhatsApp depuis sa
tablette, et la réservation n'existe nulle part — c'est exactement le défaut
corrigé quelques jours plus tôt. Ici : même fichier, même tunnel, même
dépôt ; seule l'ENTRÉE change. Rien à ajouter à `construire.sh`, et c'est
l'un des gains.

- **L'adresse est `?h=easyhotel-aeroville`.** `?h=` servait déjà à l'affiche
  QR d'un hôtel quelconque ; il reconnaît maintenant d'abord un
  **partenaire connu** (par sa clé, son nom ou ses alias) et ouvre l'écran
  de réception. Un hôtel non partenaire garde le comportement d'origine —
  son nom va dans le champ de départ, rien d'autre ne change. Un test
  verrouille les deux chemins.
- **LA GRILLE EST CELLE DU PAPIER, AU CENTIME**, et c'est le seul endroit du
  dépôt où recopier des nombres dans un test est juste : le flyer est la
  référence, l'écran est le copiste. Berline / Van, jour / nuit, sept
  destinations. **Ne jamais « corriger » ces montants** pour les rapprocher
  du kilométrage : sur les longues courses le van est **volontairement**
  moins cher que le site, c'est un prix d'appel pour décrocher l'hôtel,
  tranché par Barbaros.
- **IL N'Y A PLUS DE TARIF DE NUIT** (22 septembre 2026). C'était la dernière
  majoration du projet : elle est partie avec `nuitHotel()`, l'écriteau
  `#noteNuit`, les clés `hotel_nuit` / `nuit_hotel` des deux langues, et les
  champs `jour`/`nuit` de `HOTELS`, remplacés par **un seul `forfait`**.
  - **LE DÉPÔT ET LE SITE PUBLIÉ DISAIENT DEUX PRIX DIFFÉRENTS**, et une
    seule des deux vérités était facturée. Le dépôt portait la grille avec
    nuit ; appliquer-regles-easyhotel.mjs (supprimé depuis, voir plus bas)
    la réécrivait au moment de
    construire. Une divergence qui ne se voit pas : le prix s'affiche des
    deux côtés. `HOTELS` est désormais aligné sur la **source serveur**
    (`20260916100000_current_tariff_source.sql`), qui ne déclare qu'un
    forfait par gamme, et le transformateur n'a plus à corriger les tarifs.
  - **LE TROU QUE CE TRAVAIL A DÉCOUVERT, ET IL ÉTAIT EN LIGNE** : le
    transformateur remplaçait `var nuit = nuitHotel(...)` dans le calcul,
    mais l'écriteau lisait `nuitHotel()` **directement**, à un second
    endroit jamais réécrit. Entre 21 h et 6 h, le site publié annonçait donc
    « **Tarif nuit (21 h – 6 h) appliqué** » sur un prix **rigoureusement
    identique à celui du jour**. Mesuré, pas déduit. *Un transformateur qui
    corrige un calcul à un endroit et l'oublie à l'autre ne se voit pas.*
  - **LE GARDE-FOU DU CHANTIER ÉTAIT QUE LE PRIX NE BOUGE PAS.** Relevé
    avant, remesuré après : les sept destinations, aux deux gammes, à 10 h,
    22 h 30 et 4 h du matin, rendent exactement les montants de la source
    serveur. Un refactor du prix qui ne se compare pas à l'avant n'est pas
    un refactor, c'est un pari.
  - **`test-nouveau-hotel` NE FIGE PLUS AUCUN MONTANT** : il **lit** la
    source serveur et éprouve l'ACCORD. Une baisse décidée par Barbaros
    touche la source et la suite reste verte ; n'en toucher qu'un tombe, et
    le message nomme la destination et l'écart. Éprouvé deux fois — tarif de
    nuit réintroduit (11 contrôles tombent, chacun nommant le montant),
    écriteau remis (3 contrôles tombent). Les deux défenses sont éprouvées
    séparément, comme le bouton d'accès du comptoir.
  - **LES CGV ONT SUIVI, DANS LES DEUX LANGUES** — et elles avaient un trou
    plus ancien : la réécriture du 16 septembre avait emporté **tout le
    paragraphe du forfait partenaire**. On facturait donc un forfait de 35 €
    pendant que les CGV décrivaient un calcul au kilomètre. Même faute que
    l'option pancarte perdue au même endroit. Le paragraphe est rétabli,
    **sans aucun chiffre** — c'est ce choix d'écriture qui a évité que les
    erreurs de grille deviennent contractuelles — et la date de mise à jour
    a suivi : *un document légal qui change sans que sa date change est
    lui-même trompeur.*
- **CE QU'IL A CHANGÉ EN VOYANT LE FLYER** (septembre 2026) : le supplément
  van de 10 € est **supprimé**, l'aéroport CDG en berline passe de 25 à
  **35 € de jour et 40 € de nuit**, et les capacités s'alignent sur le site
  — **berline 4 places, van 7**, alors que le papier annonce 1–3 et 4–7.
  **Le flyer imprimé est donc périmé sur ces trois points** : à lui de le
  refaire avant de le distribuer.
- **LE NUMÉRO DU FLYER EST BON** — `+33 7 59 31 24 33`, le même que celui
  du site (`tel:+33759312433`). Il avait été signalé comme faux : c'était
  une **erreur de lecture de l'image**, un chiffre compté en trop. Barbaros
  l'a confirmé. Ne pas rouvrir le sujet.
  La leçon vaut au-delà : **on ne lit pas des chiffres sur une photo pour
  en tirer une alerte**. Quand un nombre compte, le comparer à une source
  du dépôt — ici `tel:+33759312433` était à un `grep` de distance et
  aurait tranché tout de suite.
- **LE FORFAIT VAUT DANS LES DEUX SENS**, à sa demande. Et l'échange des
  deux champs est **réel**, pas une inversion au moment de l'envoi : c'est
  ce qui fait que tout le reste tombe juste sans une ligne de plus — le
  numéro de chambre ne s'ouvre que sur un hôtel au DÉPART (un client qui
  arrive n'a pas encore de chambre), le numéro de vol prend sa formulation
  d'arrivée, et la pancarte n'est proposée que sur une prise en charge en
  aéroport, c'est-à-dire exactement ce retour-là.
- **« AUTRE DESTINATION » EST LA SORTIE**, et il l'a demandée. Sans elle,
  une réception qui envoie un client à Versailles rouvre le site public et
  **la provenance est perdue** — on ne saurait plus ce que l'hôtel rapporte,
  qui est toute la raison de cette page. Elle rend la main au calcul
  kilométrique ordinaire, et elle le **dit**.
- **« PARIS » N'EST PAS UNE ADRESSE**, c'est une ville de dix kilomètres de
  large. Le forfait de 80 € s'affiche d'emblée — c'est ce que la réception
  annonce pendant qu'elle saisit — mais il **tombe** si l'adresse retenue
  est à plus de 7 km du centre : un « Versailles » tapé là vendrait 45 km au
  prix de 10. On mesure la distance au centre et **pas le code postal**, qui
  n'est qu'un morceau de libellé écrit différemment selon la source.
- **LE TERMINAL VIENT DE `AEROPORTS`**, la table que le site tient déjà pour
  la recherche d'adresse. Deux listes de terminaux finiraient par diverger,
  et c'est celle qu'on oublie qui enverrait la voiture au mauvais bout de
  Roissy. Le libellé reprend **exactement** la forme du site (« Terminal 2E
  — Aéroport… ») : c'est elle que lit `terminalDuLibelle`, et c'est elle qui
  ouvre le champ « numéro de vol » et l'option pancarte. Un aéroport à un
  seul terminal (Beauvais) n'affiche pas le menu — on ne fait pas choisir
  entre une seule chose.
- **LES COORDONNÉES DE L'HÔTEL SONT DEMANDÉES À LA BASE ADRESSE
  NATIONALE**, comme n'importe quelle adresse du site. Celles écrites dans
  `HOTELS` ne sont qu'un **secours** pour une réception hors ligne. Elles ne
  changent aucun forfait — ils sont fixes — mais elles font le kilométrage
  d'« autre destination ». Le test donne au faux service des coordonnées
  **différentes** du secours et lit l'URL envoyée au calculateur : c'est la
  seule façon de savoir laquelle des deux a servi. Même leçon que le faux
  GPS de la géolocalisation.
- **LA GRILLE NE SORT PAS DANS GOOGLE** : `robots.txt` écarte `?h=`, et la
  page **réécrit** sa propre balise `robots` en `noindex`. On la RÉÉCRIT, on
  n'en ajoute pas une seconde : la page en porte déjà une, et deux consignes
  contradictoires dans la même en-tête ne se découvrent qu'en voyant la page
  rester dans les résultats des semaines plus tard. Un contrôle vérifie
  qu'il n'y en a **qu'une**, et un autre que le site public garde « index » —
  poser `noindex` sur le site ordinaire le sortirait de Google en entier.
- **LES ONGLETS « RÉSERVATIONS » ET « TRAJETS » RESTENT.** Ils avaient été
  masqués — la tablette d'un comptoir est un appareil partagé, et ces listes
  y accumulent les noms, téléphones et adresses de tous les clients passés
  devant. Mais le QR du flyer est aussi scanné par les **clients**, sur leur
  propre téléphone : les masquer leur retirait l'accès à leur réservation.
  Le mal certain était plus grand que le mal possible. **Si la tablette de
  la réception est vraiment partagée, la réponse est la navigation privée**,
  pas un onglet caché.
- **`hotelNom` ÉTAIT DÉJÀ PRIS** par le champ de l'affiche QR, dans l'espace
  exploitant. Deux éléments pour un identifiant, et `getElementById` rend le
  premier venu. Même faute que `btnNouvelleCourse`. Un contrôle cherche
  désormais **tous** les identifiants en double de la page.
- **LES CGV DÉCRIVENT LE FORFAIT PARTENAIRE**, dans les deux langues : il
  remplace le calcul kilométrique, il n'est ni arrondi ni soumis au montant
  minimum, sa majoration de nuit lui est propre, et toute destination hors
  grille revient au kilométrage. Toucher à un prix veut dire toucher aux
  CGV.
- `test-nouveau-hotel.mjs`, 90 contrôles ; `test-nouveau-reception.mjs`, 73.

### LA PAGE DU QR easyHotel EST UN TUNNEL — ET LA GRILLE DU FLYER A CHANGÉ

22 septembre 2026, à sa demande (« refonte finale 10/10 »). `sites/easyhotel-client/`
était une vitrine : bandeau photo, « Pensé pour votre séjour », trois
destinations, puis une seconde invitation à « voir toutes les destinations ».
Elle devient : l'hôtel, puis **« Où souhaitez-vous aller ? »** et les **sept
destinations du flyer** avec leurs deux prix, puis « Autre destination ».
Un clic ouvre le moteur avec l'hôtel ET la destination déjà posés.

**LA GRILLE A ÉTÉ TRANCHÉE PAR LUI**, sur question, et elle diffère de ce que le
site facturait : Orly **90 / 130**, Le Bourget **35 / 70**, Disney **80 / 120**,
Paris **80 / 120** (CDG 35/50, Beauvais 180/240, Villepinte 35/50 inchangés).
Le Bourget berline à 35 € contredisait sa propre mission (45 €) : il l'a
**confirmé à la relecture** (23/09/2026). C'est 35 €, ne pas le « corriger ».
- **TROIS ENDROITS, UN SEUL PRIX, ET UN CONTRÔLE QUI L'EXIGE.** `HOTELS` dans
  `index.html`, la source serveur (`20260916100000_current_tariff_source.sql`),
  et les cartes de la page du QR. `verifier-tarif-hotel.mjs` exige l'accord des
  trois à chaque construction et **nomme** la destination et les trois valeurs.
- **LE SERVEUR REMPLACE LE PRIX DU CLIENT** (`deposer-course`, `snapshotPartenaire`).
  Tant que la source serveur n'est pas **rejouée en production** (workflow
  « Appliquer une migration Supabase », fichier
  `20260916100000_current_tariff_source.sql` — ses forfaits sont un *upsert*,
  le rejouer met la base à jour), une course easyHotel est **enregistrée à
  l'ancien montant** alors que le client a vu le nouveau. **C'est le geste qui
  suit la fusion, pas une option.**
- **PAS DE PHOTOS, ET C'EST UNE DÉCISION D'EXPERT QU'IL A DÉLÉGUÉE.** Le dépôt
  n'a aucune image propre d'Orly, du Bourget, de Beauvais ni de Villepinte, et
  on ne pose pas une image dont on ne connaît pas l'auteur (L335-2 CPI) — ni le
  château Disney, ni la tour Eiffel illuminée. Les **codes d'aéroport**
  (CDG, ORY, LBG, BVA) et trois pictogrammes dessinés disent la destination plus
  vite qu'une photo, et la page ne télécharge plus que le logo. Le logo
  easyHotel n'est pas posé non plus : leur nom écrit et leur orange suffisent.
- **« Autre destination » passe `?dest=autre`**, que `hotel-engine-polish.js`
  traduit en l'option à valeur VIDE du moteur. Sans cette traduction, le moteur
  ouvrait sur CDG **au forfait** — un Versailles facturé 35 €.
- **Les liens légaux passent `?doc=mentions|privacy`**, lus par `index.html`
  (trois valeurs connues, rien d'autre). Un lien vers l'accueil obligeait à
  chercher le document.

**LE PRIX DU FLYER SUIT LE LIEU, PAS LE MENU** (23/09/2026, à sa demande :
« peu importe l'adresse ça doit être le même prix que le flyer », « Autre
destination » compris). Une adresse tapée dans « Autre destination » — ou
dans « Paris » — qui tombe dans une destination du flyer prend son forfait,
et l'écran **nomme** la destination reconnue (« Tarif du flyer (Orly) : … »).
- **On mesure une distance, pas un mot** (`destDuPoint()`) : un aéroport à
  moins de `RAYON_AEROPORT_KM` (2 km) d'un de ses terminaux — la table
  `AEROPORTS` — ; Le Bourget 2,5 km, Villepinte 1,5 km, Disney 3 km, Paris
  7 km (`rayonKm` sur chaque destination de `HOTELS`). « Orly » dans un
  libellé peut être la rue d'Orly à Montreuil.
- **La destination reconnue part sur la course** (`destHotelRetenue()`, lue
  par `public-booking-gateway.mjs` pour `destinationCle`) : le serveur la
  recroise avec sa grille comme pour un choix du menu.
- Hors de toutes les zones (Versailles), rien ne change : kilométrage hôtel,
  et on le dit. `test-nouveau-hotel` éprouve les deux côtés.

**LE COMPTOIR SUIT LE MÊME PARCOURS** (23/09/2026, à sa demande : « même
logique que le site client hôtel »). `/easyhotel-client/?reception=easyhotel-aeroville`
est la MÊME page que celle du QR : les liens des cartes passent en
`?reception=`, les phrases parlent à la réception, et un bouton
« Réservations de l'hôtel » ouvre la liste (`&vue=reservations`, lu par
`hotel-engine-polish.js`). **Pas de seconde page** : elle aurait recopié les
sept prix, soit un quatrième endroit à tenir.
- `hotel-engine-polish.js/.css` s'appliquent désormais aux deux entrées
  (`.hotel-enhanced`, plus `body.hotel:not(.reception)`).
- **Au comptoir la chambre vient EN PREMIER et n'est pas « facultative »** :
  la règle y est « chambre, OU nom et téléphone » (`identifieParLaChambre`).
  Côté client elle reste sous le nom, facultative.
- **La photo de l'en-tête n'est pas reprise au comptoir** : elle est chargée
  depuis le site d'easyHotel (`cdn.easyhotel.com`, dans
  `hotel-engine-polish.css`), sans accord écrit, contre la règle « aucune
  photo ni logo d'easyHotel » de la section du thème partenaire. Côté client
  elle est EN LIGNE ; signalé à Barbaros le 23/09/2026, à lui de trancher.

**VERT = REMPLI, ROUGE = IL MANQUE** (23/09/2026, à sa demande), sur les deux
entrées easyHotel, dans `hotel-engine-polish.js/.css` (classes `eh-ok`,
`eh-manque` — préfixées : `.ok` et `.ko` existent déjà ailleurs).
- **LE DÉFAUT QUE ÇA A RÉVÉLÉ, EN LIGNE** : côté client, le nom et le
  téléphone sont sur la première page, mais « Confirmer », deux écrans plus
  loin, les contrôlait et affichait son erreur sur la page CACHÉE. Mesuré :
  le client appuyait, rien ne bougeait. Le contrôle se fait maintenant à
  « Voir mon prix », avant de quitter la page des champs.
- **La date et l'heure ne sont pas vertes d'office** : pré-remplies à
  maintenant + 15 min, personne ne les a choisies. Vertes dès qu'on y touche.
- **Au comptoir le bouton est grisé** tant qu'aucune gamme n'est choisie ; un
  bouton grisé ne reçoit pas le clic. On écoute le doigt posé sur sa surface
  (`pointerup`) pour montrer quand même ce qui manque.
- La mention écrite accompagne toujours la couleur (« Obligatoire », « Si pas
  de chambre », « Numéro incomplet ») : la couleur ne porte jamais le sens seule.

**LE DÉFAUT LE PLUS GRAVE N'ÉTAIT PAS SUR LA PAGE, IL ÉTAIT EN LIGNE DEPUIS LE
15/09 : LE MOTEUR easyHotel SE FIGEAIT.** `hotel-engine-polish.js` réécrivait le
nom de l'hôtel à chaque passage, sous un `MutationObserver` qui le rappelait à
chaque mutation — or réécrire un texte identique **est** une mutation. Une
boucle de micro-tâches qui ne rend jamais la main : la page ne répondait plus,
et la minuterie qui devait couper l'observateur ne pouvait jamais s'exécuter.
**Mesuré sous Chromium, pas supposé** : figée avec le script, vivante sans lui,
vivante avec la seule ligne corrigée (on n'écrit que si le texte diffère).
**AUCUNE SUITE NE POUVAIT LE VOIR** : ce script n'est injecté que par
`construire.sh`, et toutes les suites hôtel éprouvent le **dépôt**.
`test-easyhotel-client.mjs` construit et sert le site lui-même, parcourt les
sept cartes jusqu'à l'écran des prix, et **tombe** si l'on remet la boucle.

**LE BLOC « Destinations populaires » DU MOTEUR EST RETIRÉ.** Il répétait le choix
de la page du QR, et sa vignette « Villepinte / Le Bourget » choisissait
**Villepinte** : un client du Bourget partait à la mauvaise adresse, à un autre
prix. Sur ordinateur, sa colonne restait vide : le formulaire est désormais
centré (`hotel-engine-polish.css`).


### LA PAGE DE LA RÉCEPTION — DEUX ADRESSES, ET UN CODE QUI N'EST PAS DANS LA PAGE

Septembre 2026, en trois demandes : « on peut pas mettre un système dans
lequel ils peuvent placer les réservations, voir les historiques ? », puis
« je veux qu'il y ait un lien de connexion **vraiment destiné à la
réception** de l'hôtel uniquement », puis « fais-leur une vraie page,
prends exemple de ce qui se fait de mieux ». Marche à suivre complète dans
`RECEPTION-HOTEL.md`.

**LE PROBLÈME QU'ELLE RÉSOUT, ET IL VENAIT DE SA PROPRE QUESTION** :
« personne ne verra les infos des autres ? » La liste des courses vivait
dans le navigateur de l'appareil. Deux conséquences opposées et toutes deux
mauvaises : sur la tablette **partagée** d'un comptoir, chaque client voyait
les réservations des précédents ; sur n'importe quel autre appareil, la
réception ne voyait plus rien. La liste vient maintenant du **serveur**,
filtrée sur l'hôtel.

- **`?h=` est le flyer, `?reception=` est le comptoir.** La première est
  scannée par les CLIENTS et ne donne accès à rien d'autre qu'à la
  réservation. Un test éprouve les deux chemins.
- **LE BOUTON D'ACCÈS EST PROTÉGÉ DEUX FOIS** — l'attribut `hidden` et une
  règle CSS — et **le test regarde chaque protection séparément**. Éprouvé
  en cassant l'une puis l'autre : avec un seul contrôle sur ce qui se voit,
  la suite restait au vert sur la première brèche et n'aurait alerté qu'une
  fois la seconde ouverte aussi. Une défense en profondeur demande autant de
  contrôles que de défenses.
- **LE CODE EST VÉRIFIÉ PAR LE SERVEUR, jamais par la page.** C'est la
  différence assumée avec `CODE_EXPLOITANT`, qui vit dans le site en
  empreinte et s'attaque donc hors ligne, autant d'essais qu'on veut. Ici il
  vit dans les secrets Supabase (`HOTEL_<CLE>_CODE`), la comparaison est à
  temps constant, et un échec attend 700 ms. **Ce n'est pas un coffre** : ce
  qui protège vraiment, c'est que l'adresse ne sorte pas de l'hôtel et que
  le code soit long. Un contrôle cherche qu'aucun code ne traîne dans la
  page.
- **UN HÔTEL INCONNU ET UN CODE FAUX RENDENT LA MÊME RÉPONSE.** Les
  distinguer dirait à qui essaie des noms lesquels sont partenaires.
- **RIEN NE S'ANNULE DEPUIS UNE TABLETTE D'HÔTEL.** Le bouton transmet et
  pose `annulationDemandee` ; il ne touche **jamais** au statut. Une course
  annulée à 5 h du matin libère un chauffeur déjà engagé, et Barbaros seul
  peut le rappeler. Éprouvé en faisant envoyer un statut : le contrôle
  tombe.
- **LE FILTRE PORTE SUR `provenanceCle`, PAS SUR LE LIBELLÉ.** Un libellé
  est du texte destiné à un écran : le jour où « easyHotel Aéroville »
  devient « easyHotel Paris CDG », tout l'historique deviendrait invisible à
  son propre hôtel, sans que rien ne le signale. La clé est posée sur chaque
  hôtel au chargement (`HOTELS[k].cle = k`) plutôt que recopiée dans l'objet.
- **CE QUE LA RÉCEPTION VOIT** : ses courses, l'état à jour, la chambre, le
  nom **et le numéro** du client, le trajet, le véhicule, le prix et le mode
  de règlement — plus le chauffeur dès que la course est confirmée. Le
  téléphone du client avait d'abord été écarté au nom de la minimisation ;
  **Barbaros a tranché l'inverse et il a raison** : un client parti prendre
  son petit-déjeuner n'est joignable que là quand la voiture arrive. La
  minimisation interdit ce qui n'est pas nécessaire, pas ce qui sert.
- **LES ONGLETS « Réservations » et « Trajets » PARTENT SUR CETTE ADRESSE.**
  Ils lisent le stockage de l'appareil : sur une tablette de comptoir ils
  auraient affiché les clients précédents. Sur le téléphone d'un client, par
  l'adresse du flyer, ils restent. **Le raisonnement qui les avait fait
  garder valait pour le téléphone du client, pas pour le comptoir** — c'est
  la même note, corrigée par la distinction des deux adresses.
- **L'HÔTEL N'EST PAS RÉPÉTÉ SUR CHAQUE LIGNE.** Mesuré : son adresse
  complète mangeait la largeur et c'est la **destination** qui se faisait
  tronquer, la seule moitié que la réception ne connaît pas déjà. Le SENS
  reste écrit — sans lui, un comptoir envoie une voiture dans le mauvais
  sens.
- **PIÈGE DE TEST : Playwright consulte la DERNIÈRE route posée en premier.**
  La route générique hors ligne, posée après la route du faux serveur,
  avalait les appels — et la suite mesurait une panne réseau en croyant
  mesurer un refus de code.

### LA RÉCEPTION VALIDE SUR LE SITE — WHATSAPP NE S'OUVRE PLUS AU COMPTOIR

Septembre 2026, à sa demande : « pour la confirmation laisse les valider sur
le site, je reçois la notification, whatsapp télégramme facultatif », puis,
sur les deux questions posées : **« en attente, comme aujourd'hui »** et
**« il ne s'ouvre plus, un bouton reste »**.

- **CE QUI REND CE RETRAIT POSSIBLE, C'EST TELEGRAM, ET RIEN D'AUTRE.**
  L'alerte part de `nouvelle-demande`, déclenchée par le SERVEUR à
  l'écriture de la ligne — donc sans rien demander au navigateur du
  comptoir, ni à WhatsApp. Elle tourne depuis le 11 septembre 2026,
  éprouvée sur une vraie réservation. La règle écrite depuis des semaines
  (« ne pas supprimer l'ouverture automatique avant que le webhook Telegram
  fonctionne ») est donc **remplie**, pas enfreinte. **Si l'alerte Telegram
  tombe un jour, c'est cette décision-ci qu'il faut rouvrir en premier** :
  sans elle, une demande du comptoir n'avertit plus personne.
- **LE RETRAIT EST DEVENU GLOBAL LE 4 OCTOBRE 2026** (option A) : le client
  et le flyer `?h=` n'ouvrent plus WhatsApp non plus, ils disent où recevoir
  leur confirmation. `memoire/contact-client.md`.
- **LE BOUTON RESTE SUR LE BON, ET CE N'EST PAS UN VESTIGE.** Si le dépôt
  échoue, il redevient le SEUL chemin par lequel la demande peut nous
  parvenir. **Le repli est sacré** — même règle que côté client. Le test
  ne se contente pas de le voir : il **appuie dessus** et lit le lien qui
  part, un bouton mort au bout d'un écran étant pire qu'un bouton absent.
- **SA PHRASE A CHANGÉ AVEC SON SUJET.** « Si WhatsApp ne s'est pas
  ouvert… » enverrait une réception chercher une application qui n'est
  jamais venue, et lui ferait croire sa réservation restée en route. Elle
  dit maintenant qu'Elatransfer est prévenu automatiquement, et que le
  bouton ne sert qu'à écrire un message. **Un libellé qui décrit un
  mécanisme retiré est pire qu'un libellé absent.**
- **LA COURSE ENTRE EN `attente`, comme celle d'un client.** Elle a beau
  être convenue de vive voix avec la personne au comptoir, elle n'a été
  convenue avec **aucun chauffeur** : l'afficher confirmée promettrait une
  voiture que personne n'a acceptée, et la réception le répéterait au
  client devant elle. C'est déjà le défaut du code — un contrôle le
  **verrouille** désormais, avec `parReception` et `provenanceCle`.
- **« ÊTRE PRÉVENU » NE S'AFFICHE PAS AU COMPTOIR.** Ce bloc promet la
  confirmation sur LE WhatsApp du client et propose une notification sur
  CET appareil : au comptoir les deux sont faux — le numéro est celui de
  quelqu'un qui n'a pas la tablette en main, et l'abonnement push resterait
  posé sur l'appareil de l'hôtel, à sonner pour la course d'un autre client
  à chaque fois. **Le test le fait vraiment apparaître pour l'éprouver**
  (faux serveur rendant 201) : sans dépôt réussi il est caché de toute
  façon, et le contrôle serait passé au vert sans rien vérifier.

### CE QUE LE COMPTOIR NE DOIT JAMAIS VOIR — RIEN NE LE VERROUILLAIT

17 septembre 2026, demandé par ChatGPT (#165, point 8) : la réception ne doit
exposer ni la commission ou la marge d'Elatransfer, ni le montant versé au
chauffeur, ni rien de Stripe, ni le carnet de chauffeurs, ni les données d'un
AUTRE partenaire.

**LE CODE N'EN EXPOSAIT AUCUN — ET AUCUN CONTRÔLE NE L'EMPÊCHAIT DEMAIN.**
`courses-hotel` compose une **liste blanche** (référence, statut, prix, client,
chambre, paiement, et le chauffeur seulement sur une course confirmée). C'est
la vraie frontière, et elle était déjà là. Mais un filtre serveur et un écran
sont **deux défenses**, et *une défense en profondeur demande autant de
contrôles que de défenses* — la leçon du bouton d'accès, protégé deux fois et
éprouvé deux fois. Ici il n'y en avait **aucun** : le jour où quelqu'un élargit
la liste blanche « pour déboguer », plus rien ne tombe.

- **LE FAUX SERVEUR INJECTE LES INTERNES EXPRÈS** sur une course, et l'écran ne
  doit en afficher aucun. On éprouve donc la défense de l'écran, pas la
  politesse du serveur.
- **ON CHERCHE LES VALEURS, PAS LES LIBELLÉS.** Chercher le mot « commission »
  passerait au vert avec le montant écrit juste à côté — même règle que le
  message d'alerte Telegram.
- **ON REGARDE TOUT L'ÉCRAN**, pas la seule carte : une ligne de total, un pied
  de liste ou une infobulle compteraient autant.
- **LE DOUTE EST LEVÉ** : un écran qui n'afficherait RIEN passerait les cinq
  contrôles au vert sans rien prouver. Un sixième vérifie qu'il montre bien la
  chambre, le prix et le paiement — même famille que « une RPC qui refuserait
  tout rendrait exactement les mêmes erreurs ».
- **Éprouvé** en faisant fuiter la commission dans la ligne grise du comptoir :
  le contrôle tombe et **nomme la valeur** (« trouvé : 25 % »).

`test-nouveau-reception.mjs` passe de 83 à **89 contrôles**.

### LE THÈME D'UN PARTENAIRE — L'ORANGE easyHotel

- **LES COULEURS SONT RANGÉES SUR L'HÔTEL** (`HOTELS[x].marque`), pas dans
  le CSS, exactement comme sa grille : le partenaire suivant sera peut-être
  bleu. Le CSS ne connaît que des rôles, et tout est sous `body.hotel` — le
  site public ne change pas d'un pixel. Un contrôle mesure la couleur
  **calculée** du bouton public : une règle trop large se voit à l'écran,
  pas dans la feuille de style.
- **LES VALEURS SONT MESURÉES (WCAG), PAS CHOISIES À L'ŒIL.** Du blanc sur
  l'orange du logo `#FF6600` donne **2,94 : illisible**. Les boutons portent
  donc `#C2410C` (blanc à 5,18) ; l'orange vif tient les **bandeaux**, où le
  texte est en charbon (5,87). Le bloc d'aide est en `#FFF1E8` / `#7C2D12`
  (8,48).
- **TOUS LES BOUTONS SONT ORANGE, SAUF CEUX QUI VIVENT DANS UN BANDEAU**
  (septembre 2026, à sa demande : « fait en orange les parties noires
  dédiées à easyHotel »). Ils étaient charbon, au motif qu'un bouton orange
  sous un bandeau orange efface la hiérarchie — il n'en a pas voulu, et la
  règle qui reste est une **mesure**, pas un goût : `#C2410C` sur le fond
  clair donne 5,18 avec du blanc, mais **posé SUR l'orange vif il tombe à
  1,76** et disparaît. D'où le partage — le sens du trajet et l'accès aux
  réservations, qui sont DANS le bandeau, restent charbon.
- **LA RÈGLE VISE `.bouton`, PAS QUATRE IDENTIFIANTS.** C'était une liste
  d'identifiants, donc la liste des boutons qui existaient le jour où elle a
  été écrite : « Confirmer » n'y était déjà pas, et le suivant n'y serait pas
  non plus. Même famille que la barre du bas figée sur quatre onglets.
- **LA TÊTE DE L'ÉCRAN RÉCEPTION PORTE LE BANDEAU DU PARTENAIRE.** Elle était
  grise comme n'importe quel écran du site : une réception qui ouvre cette
  page vingt fois par jour doit reconnaître la sienne du premier regard.
- **PIÈGE RENCONTRÉ : `class="carte"` N'EXISTE DANS AUCUNE RÈGLE DE CE
  SITE.** L'écran du code la portait — héritée de l'ancien site — donc ni
  fond, ni marge : le texte et le bouton « Ouvrir » touchaient les deux
  bords. Une classe morte ne se voit pas en relisant le HTML, et elle
  ramassera un jour une règle écrite pour autre chose (le piège `.arrivee`,
  déjà rencontré ici). La gouttière du site est de **20 px**, mesurée sur
  `.ecran-titre`.
- **L'ORANGE NE DESCEND PAS DANS LA LISTE.** Il est à **24° de teinte** du
  rouge de l'attente (`#C9302F`) : côte à côte, les deux se disputeraient
  l'attention et plus rien ne crierait. Il tient le cadre, l'action et
  l'aide.
- **« CONFIRMÉE » EST RESTÉE VERTE**, et c'est la correction d'une erreur
  commise ici même : passée à l'orange du partenaire, la pastille disait la
  **marque** et non plus l'**état** — même couleur que le bouton, le bloc
  d'aide et le filet. Une couleur d'état ne se négocie pas avec une charte.
  Même faute, à l'envers, que le jour où l'attente et la confirmation ont
  fini de la même couleur sur le bon du client.
- **AUCUNE PHOTO NI LOGO D'easyHotel N'EST POSÉ.** Barbaros en a envoyé
  cinq : trois sur quatre étaient des **vignettes** de résultats de
  recherche (275 × 182 pour 23 Ko…), et il a confirmé que la seule
  exploitable venait d'Internet. Il n'a pas non plus l'accord pour le logo.
  Une photo appartient à son photographe (L335-2 CPI) ; un logo est une
  **marque déposée**, et c'est ce qu'un siège fait retirer en premier.
  « C'est seulement pour la réception » ne change rien : la page a une
  adresse publique, et ce qui est reproché est la reproduction.
  **Ce qui reste licite et suffit** : leur orange, qui n'appartient à
  personne, et leur nom écrit — nommer un partenaire pour dire qu'on le
  dessert est un usage descriptif. L'en-tête porte un lavis d'orange en
  diagonale pour avoir l'air voulu plutôt qu'en manque d'image ; le champ
  `photo` attend celle qu'easyHotel fournira, et elle se posera par-dessus,
  sous un voile opaque à 62 % — un titre posé sur une image non maîtrisée
  n'a aucun contraste garanti.
  **À lui demander** : leurs photos de presse et leur logo, en un message à
  son contact. Ou, gratuit tout de suite, sa propre photo d'une berline
  devant l'entrée.

## LES AVIS — ON EN DEMANDE, ON N'EN INVENTE PAS

Septembre 2026. En voyant le panneau d'avis vide du back-office, il a
écrit : « C'est pas grave invente comme les note et commentaire même faux
sur la page public ». **Refusé, et c'est le seul point où on ne le suit
pas.** Ce n'est pas de la prudence : publier des avis qu'on n'a pas reçus
est une pratique commerciale trompeuse (L132-2 Code conso. — deux ans,
300 000 €, portés à 10 % du chiffre d'affaires), et c'est **lui** qui est
en première ligne, pas le site. Un concurrent n'a qu'un signalement à
faire, et Google déréférence les pages d'avis fabriqués.
**Ne pas rouvrir le sujet en croyant lui rendre service.**

Ce qui a été fait à la place — la seule voie honnête, et elle marche :

- **Un bouton « Demander un avis » sur chaque course RÉALISÉE** de la
  liste du tableau de bord. Un appui, WhatsApp s'ouvre sur le numéro du
  client avec un message de trois lignes.
- **Sur les réalisées seulement.** On ne demande pas à quelqu'un ce qu'il
  a pensé d'un trajet qu'il n'a pas encore fait.
- **Le lien d'avis vit dans `localStorage` (`ela_lien_avis`), pas dans le
  code.** C'est le sien, il peut le changer, et un identifiant de son
  compte Google n'a rien à faire dans un dépôt public. Bloc « Demander des
  avis » dans l'espace exploitant.
- **Sans lien, RIEN NE PART.** Le message se terminerait dans le vide : on
  emmène au champ et on le dit. Un contrôle vérifie qu'aucun WhatsApp ne
  s'ouvre dans ce cas.
- **La course garde `avisDemande`** et le bouton passe à « Avis demandé ».
  Relancer un client qui a déjà répondu est la meilleure façon d'obtenir
  un mauvais avis. Il reste cliquable — un client peut dire « oui oui » et
  oublier.
- **LE BON PORTE MAINTENANT `langue`.** La demande part des jours après la
  course : écrire en français à quelqu'un qui a réservé en anglais, c'est
  un message qu'il ne lira pas. Une course ancienne sans ce champ retombe
  sur le français.
- Le bouton est **en creux** (contour seul) : une course réalisée n'attend
  plus personne, un second bouton plein y ferait deux actions qui crient.
- **`.d-avis.fait`, pas `.d-avis.demande`** : `.demande` est déjà la classe
  de la LIGNE entière, et la poser sur un bouton lui collerait la mise en
  page d'une carte.

## LES DEMANDES ARRIVENT TOUTES SEULES DANS LE TABLEAU DE BORD

Septembre 2026, à sa demande : « fait en sorte que je reçois la commande
aussi sur la page admin ». Le dépôt sur le serveur existait déjà ; ce qui
manquait, c'est que la demande **apparaisse pendant qu'il regarde**. Elle
n'arrivait qu'à l'OUVERTURE de l'espace ou sur « Actualiser » — or un
onglet laissé ouvert la nuit, c'est exactement la façon dont il travaille.

- **On interroge toutes les 45 s, on n'« écoute » pas.** Une vraie liaison
  permanente (realtime) demanderait une bibliothèque, un abonnement à
  tenir et une reconnexion à écrire. 45 s suffisent pour une course qui
  part dans une heure, et un appel raté est simplement suivi du suivant.
- **On n'interroge JAMAIS dans le vide** : ni sans session — le serveur
  refuse la lecture aux anonymes, et il DOIT la refuser — ni onglet en
  arrière-plan, ni hors de l'espace de travail. Sinon c'est de la batterie
  brûlée sur son téléphone. `ecouteUtile()` est le seul juge.
- **Le retour sur l'onglet rattrape tout de suite**, sans attendre le tour
  suivant : c'est le moment où il regarde.
- **LA PREMIÈRE LECTURE NE SONNE PAS.** À l'ouverture, tout ce que le
  serveur contient et que l'appareil n'a pas est « nouveau » : un téléphone
  neuf ferait sonner cinquante courses vieilles de trois mois. Le drapeau
  `premiereLecture` distingue le rattrapage de l'arrivée.
- **Écriteau + bip.** Une ligne qui apparaît en silence au milieu d'une
  liste ne se remarque pas. Le son passe par un oscillateur — aucun fichier
  à charger — et il est **enveloppé** : un navigateur qui refuse l'audio ne
  doit pas faire tomber la synchronisation avec lui.
- **L'écriteau EMMÈNE aux demandes en attente et se retire** du même geste.
  Il ne sert à rien s'il faut ensuite les chercher.
- **SANS SESSION, RIEN N'ARRIVE, et ça se voit en haut du tableau de
  bord** (`#bordHorsLigne`), pas seulement en petit dans le bloc du
  serveur. C'est la différence entre voir ses clients et ne pas les voir —
  le genre de chose qu'on ne découvre qu'en ratant une course.
- `jugerNuage()` appelle `jugerReception()` : l'état du serveur décide de
  ce qu'on affiche **et** de si l'on interroge. Les séparer, c'est se
  retrouver un jour avec une pastille verte et aucune écoute.

### LE JETON EXPIRAIT AU BOUT D'UNE HEURE, ET RIEN NE LE RENOUVELAIT

Septembre 2026, signalé par Barbaros : « je ne reçois pas les demandes des
clients sur la page admin, pourquoi ». **C'était un vrai défaut, et le plus
coûteux du projet à ce jour.**

Le jeton d'accès Supabase vit **une heure**. Passé ce délai, le serveur
répondait `401` à chaque lecture, l'erreur était avalée par un `catch` qui
rendait `null` — c'est-à-dire exactement ce que rend « pas connecté » — et
plus **aucune demande de client n'arrivait**. Pendant ce temps la colonne
affichait « Serveur connecté », parce que `connecte()` ne regardait que la
**présence** d'une chaîne dans le stockage, jamais sa validité.

**C'est la pire forme de panne : invisible, durable, et ce qu'on perd ce
sont des clients.** Elle ne se voit pas en test manuel — on se connecte, on
essaie, ça marche ; il faut attendre une heure pour la rencontrer.

- `nuage.rafraichir()` échange le `refresh_token` contre un jeton neuf.
  **Il ne présente PAS le jeton périmé** en `Bearer` : l'envoyer ferait
  refuser la demande qui doit justement le remplacer. Un contrôle le vérifie.
- `appel()` prend un troisième paramètre `reessai` : sur un `401`, il
  renouvelle et **rejoue l'appel UNE fois**. Sans ce garde-fou, un refus
  permanent ferait boucler indéfiniment.
- **Un renouvellement refusé efface la session** et fait revenir l'écriteau
  avec « Votre session a expiré » — plutôt qu'une pastille verte sur un
  serveur qui ne répond plus.
- **`lister()` n'a plus de `catch`**, et c'est délibéré : une panne qui
  ressemble à un état normal ne se répare jamais. L'erreur remonte, et
  `#bordHorsLigne` porte trois phrases distinctes — pas connecté, session
  expirée, serveur muet (avec le code) — parce qu'elles appellent trois
  gestes différents.
- **Le test éprouve ce que Barbaros a sous les yeux**, pas la mécanique : il
  vérifie que **la course finit par apparaître** après le renouvellement. Un
  contrôle qui dirait seulement « rafraichir a été appelé » ne prouverait
  rien.

### L'ACCUSÉ DE RÉCEPTION AU CLIENT

Même demande : « il faut aussi un message destiné au client que Elatransfer
doit confirmer la réservation ». Le client appuie sur « Confirmer » et n'a
plus **aucune** nouvelle. Son bon dit bien « demande reçue » — mais il l'a
fermé, il ne le regarde plus.

- Bouton **« Accuser réception au client »** sur le bon exploitant, visible
  **seulement sur une course en `attente`** et avec un numéro. Une fois
  confirmée, c'est « Prévenir le client » qui parle : deux messages coup sur
  coup diraient au client qu'on ne sait pas où on en est.
- **Quatre lignes** : référence, trajet, heure, et la phrase qui compte —
  « **Votre réservation sera ferme dès notre confirmation** ». Un test la
  cherche dans les deux langues.
- **NI CHAUFFEUR NI VÉHICULE** : on ne les connaît pas encore, et chez
  Elatransfer l'heure est ferme comme le prix. Promettre une voiture qu'on
  n'a pas placée est le meilleur moyen de laisser quelqu'un sur un trottoir.
  Un contrôle interdit les deux mots.
- **Il suit `bon.langue`**, comme la demande d'avis — et la **date suit la
  langue du message**, pas celle de l'espace exploitant qui est toujours le
  français.
- La course garde `accuse` et le bouton le dit : sur dix demandes reçues la
  nuit, on ne se souvient pas de qui a eu une réponse.
- **Il n'est pas automatique et ne peut pas l'être** : le site n'a aucun
  moyen d'envoyer un SMS tout seul. C'est WhatsApp qui part, du téléphone de
  Barbaros. Ne pas promettre l'inverse.

**PIÈGE DE TEST, PAS DE CODE** : `ctx.addInitScript` qui pose
`ela_bookings` **se rejoue à CHAQUE chargement de page**. Dans la suite
exploitant, le `goto` de la ré-entrée remettait le registre à son état
initial — les contrôles sur une course réalisée tombaient après ce point
sans que rien ne soit cassé. Les placer **avant** la sortie.

### LA NOTIFICATION AU CLIENT QUAND LA COURSE EST CONFIRMÉE

Septembre 2026, à sa demande : « est-ce que l'on peut faire en sorte que le
client reçoive une notification lorsque je valide sa course ». Trois voies
lui ont été présentées ; il a choisi : **« On garde le geste manuel plus la
notification navigateur »**.

**LES DEUX PARTENT, ET C'EST LE CHOIX.** La notification arrive tout de
suite, sur un téléphone verrouillé — mais elle peut être refusée, balayée
d'un doigt, ou impossible (un iPhone qui n'a pas installé le site). Le
message WhatsApp, lui, reste dans une conversation qu'on retrouve trois
jours plus tard. **Ne pas supprimer « Prévenir le client » sous prétexte
que la notification existe** : ce serait échanger le canal sûr contre le
canal rapide.

- **LE CHIFFREMENT A ÉTÉ ÉPROUVÉ PAR UN TIERS, pas par moi.** Une
  notification push est chiffrée de bout en bout (VAPID pour l'expéditeur,
  aes128gcm pour le contenu) et **un chiffrement faux ressemble toujours à
  des octets corrects** — exactement le piège de l'encodeur QR, en pire.
  `test-push.mjs` **déchiffre** donc la sortie avec `http_ece`, écrit par
  quelqu'un d'autre, et fait vérifier la signature VAPID par `node:crypto`.
  Relire son propre code ne prouve rien. Ne pas remplacer ces contrôles par
  des contrôles maison.
- **LA CLÉ PRIVÉE VAPID N'EST NULLE PART DANS LE DÉPÔT** — elle vit dans
  les secrets Supabase. C'est elle, et elle seule, qui empêche un tiers
  d'envoyer une fausse « Transfert confirmé » aux clients d'Elatransfer. La
  **publique** est dans la page, forcément : le navigateur la reçoit de
  toute façon. **Les deux se refont ensemble** : dépareillées, le navigateur
  accepte l'abonnement et le service de push refuse l'envoi — une panne qui
  ne se voit qu'au premier client.
- **ELLE A FAILLI PARTIR EN LIGNE, ÉCRITE EN CLAIR DANS UN TEST.**
  `test-push.mjs` la portait en constante « pour éprouver la signature ».
  Le dépôt est PUBLIC : c'était la publier. Rattrapé avant le premier
  `commit`. **Un secret recopié dans un test est un secret perdu**, même
  si le test ne sert qu'une fois et n'est lu par personne — et un contrôle
  qui cherchait la clé dans `index.html` seulement ne voyait évidemment
  rien, puisqu'elle était dans le fichier d'à côté. La suite **fabrique
  maintenant sa propre paire à chaque exécution** : ce qu'elle éprouve est
  le code qui signe, et le code ne connaît pas la différence.
  Ce qu'elle vérifie encore sur la clé de la page, sans le secret : 65
  octets, non compressée, et **un vrai point de la courbe** — `importKey`
  refuse le reste, exactement comme le fera le navigateur du client, sauf
  que lui le fera devant lui et sans rien dire.
- **ON NE DEMANDE JAMAIS L'AUTORISATION AU CHARGEMENT.** Une demande qui
  surgit sans raison se refuse d'un réflexe, et **le refus est définitif** :
  le navigateur ne repose plus jamais la question, des mois plus tard non
  plus. Elle ne part que sur l'appui du bouton, une fois la demande
  déposée.
- **LE BLOC N'APPARAÎT QUE SI LA DEMANDE EST ARRIVÉE SUR LE SERVEUR.** La
  fonction retrouve l'abonnement par la référence : sans ligne côté
  serveur, personne ne pourra jamais envoyer. Proposer « Prévenez-moi » là
  serait promettre un message qui ne partira pas, et le client fermerait sa
  page en croyant qu'on le rappelle tout seul.
- **L'ABONNEMENT VA DANS SA PROPRE TABLE**, jamais dans la course.
  L'attacher au bon demanderait d'ouvrir la **modification** d'une ligne
  existante au visiteur anonyme — et n'importe qui pourrait alors réécrire
  la réservation d'un autre. Anon **dépose** dans `abonnements`, et rien de
  plus : pas de lecture non plus, un abonnement est une adresse d'envoi.
- **LA NOTIFICATION NE PORTE NI LE NOM, NI LE TÉLÉPHONE, NI LES ADRESSES,
  NI LA CHAMBRE** — elle s'affiche sur un écran verrouillé, que n'importe
  qui lit par-dessus l'épaule. Référence, chauffeur, véhicule, heure, et le
  lien `?ok=`. Même règle que le lien de confirmation (RGPD 5.1.c), quatre
  contrôles la verrouillent.
- **ELLE NE PEUT PAS FAIRE ÉCHOUER UNE CONFIRMATION.** L'appel part
  détaché, après. Fonction en panne, abonnement périmé : la course est
  confirmée quand même et WhatsApp part comme avant. Un test coupe la
  fonction et vérifie que le bon passe au vert. **Ne jamais inverser cette
  répartition** — même règle que l'alerte de Barbaros.
- **`userVisibleOnly` OBLIGE À MONTRER QUELQUE CHOSE À CHAQUE MESSAGE.** Un
  push traité en silence fait révoquer l'abonnement par le navigateur, sans
  prévenir. D'où les replis sur un titre par défaut dans `sw.js` plutôt
  qu'un `return` si le contenu manque.
- **LE CLIC RAMÈNE SUR LE BON**, pas sur l'accueil : on réutilise l'onglet
  déjà ouvert et on l'emmène sur le `?ok=`. Ouvrir l'accueil laisserait le
  client devant un formulaire vide.
- **SUR IPHONE, IL FAUT AVOIR INSTALLÉ LE SITE** sur l'écran d'accueil :
  Safari ne connaît `PushManager` que là. Le bouton le **dit** au lieu
  d'échouer sans un mot — c'est la différence entre « ton téléphone ne peut
  pas » et « il peut, mais il faut d'abord installer ».
- **PIÈGE DE BANC, PAS DE CODE** : un Chrome piloté répond `denied` à
  `Notification.permission` là où un vrai navigateur répond `default`, et
  ni l'option `permissions` du contexte ni `grantPermissions` n'y changent
  rien — éprouvé. La page cache le bloc quand l'autorisation est refusée,
  et elle a raison ; la suite n'aurait donc éprouvé que ce cas-là. Le test
  rétablit `default` dans un `addInitScript`. Et il **compte les appels à
  `requestPermission`** au lieu de lire l'état final : lire la permission
  ne dit pas qui l'a demandée.
- **CE N'EST PAS UN CHOIX ENTRE WHATSAPP ET LA NOTIFICATION**, et c'est une
  décision, pas un oubli (septembre 2026, à sa demande : « il faut mettre le
  choix me prévenir par whatsapp aussi »). Le bloc annonce **WhatsApp
  d'abord et comme certain** — l'exploitant envoie la confirmation dans tous
  les cas, c'est son geste « Prévenir le client » — et la notification
  **ensuite, comme un supplément**. Laisser un client décocher WhatsApp au
  profit de la notification lui retirerait le seul canal qui marche partout,
  et c'est Barbaros qu'il rappellerait.
- **LE BLOC ET LE BOUTON NE SE JUGENT PAS ENSEMBLE.** Le bloc dépend du seul
  dépôt réussi ; le bouton, de ce que sait faire le navigateur. Les lier —
  ce qu'ils étaient au premier jet — cachait la promesse WhatsApp à
  **exactement** ceux qui n'ont que WhatsApp : un iPhone sans le site
  installé, c'est-à-dire presque tous. Ils lisaient « demande reçue » sans
  savoir par quel moyen la réponse viendrait. Une suite refait une vraie
  réservation avec `PushManager` supprimé **avant le chargement**.
- **Le numéro du client est écrit dans la promesse.** Ce n'est pas
  décoratif : c'est le dernier moment où il voit qu'il a tapé un chiffre de
  travers. `white-space:nowrap` — coupé en « 06 12 34 56 » / « 78 », il ne
  se relit plus d'un trait.
- **La phrase qui annonce la notification part AVEC le bouton.** Laissée
  seule, elle promet ce qu'aucun geste ne permet plus d'obtenir — pire qu'un
  bouton mort, parce que le client cherche où appuyer.
- **LE DÉPLOIEMENT SE FAIT DEPUIS GITHUB** (`.github/workflows/fonctions.yml`,
  septembre 2026). L'éditeur de code du tableau de bord Supabase **refuse le
  collage sur iPhone** — éprouvé ce soir-là, et c'est pour ça que
  `nouvelle-demande` est restée écrite et jamais déployée pendant des
  semaines. Le workflow déploie les deux fonctions à chaque poussée ; il ne
  touche pas au site, `construire.sh` reste la seule recette de publication.
  Un seul secret GitHub à poser : `SUPABASE_ACCESS_TOKEN`.
- **LES DEUX FONCTIONS SONT DÉPLOYÉES** depuis le 8 septembre 2026, et la
  table `abonnements` existe avec sa policy INSERT pour `anon`. Ce qui manque
  encore à `nouvelle-demande` : son webhook et ses propres secrets Telegram.
- **UN JETON D'ACCÈS NE SE COLLE PAS DANS UNE CONVERSATION.** C'est arrivé —
  jeton révoqué et refait dans la minute. Il ne va que dans les secrets
  GitHub. Le redire si ça se represente, sans en faire un sermon.

## LE CARNET DE CHAUFFEURS ET LA FACTURE DE COMMISSION

Septembre 2026, à sa demande : « Oui met en place et publie ». Les deux
tiennent ensemble et découlent d'une chose qu'il a dite ce jour-là :
**« Je place seulement »**.

**BARBAROS NE CONDUIT PAS. C'EST ACQUIS, ne plus le lui redemander** — la
question figurait dans « Pas décidé » depuis des mois. Il est donc une
**centrale de réservation** (Code des transports L3142-1), pas un
transporteur, et **il n'a pas encore de SIRET** : la micro-entreprise reste
à créer sur `formalites.entreprises.gouv.fr`. Tant qu'elle n'existe pas, la
fiche Google ne peut pas être vérifiée, les mentions légales restent
incomplètes et aucune facture n'est valable. C'est le point bloquant du
projet, et il ne dépend que de lui.

### Le carnet (`#ecran-chauffeurs`)

- **CE N'EST PAS UN RÉPERTOIRE, C'EST L'OBLIGATION DE L3142-1** : pouvoir
  prouver, pour chaque chauffeur, sa carte professionnelle, son inscription
  au registre VTC et son assurance.
- **LA DATE COMPTE PLUS QUE LE NUMÉRO.** Un numéro de carte reste identique
  le lendemain de son expiration : il ne prouve rien. Ce qu'on surveille,
  c'est `carteFin`, `registreFin`, `assuranceFin`.
- **UN PAPIER ABSENT VAUT UN PAPIER PÉRIMÉ** — dans les deux cas on ne peut
  rien prouver. Les distinguer donnerait à « pas renseigné » un air
  rassurant qu'il n'a pas. Les deux sont au rouge, un contrôle le verrouille.
- **LE PIRE DES TROIS DÉCIDE** (`etatChauffeur`) : assurance périmée = fiche
  rouge, même avec une carte à jour.
- **30 jours d'avance** (`JOURS_ALERTE`), et le jour se compte **à minuit** :
  un papier qui expire aujourd'hui vaut encore aujourd'hui.
- **L'AVERTISSEMENT EST SUR LE BON**, à l'instant où l'on attribue la course
  — c'est-à-dire à l'instant où l'on engage sa responsabilité. Trois
  messages : hors carnet (orange), papier bloquant (rouge), tout en règle
  (vert). Un quatrième état — ne rien dire — se confondrait avec un contrôle
  qui n'a pas eu lieu.
- **ON RETROUVE LE CHAUFFEUR PAR SON NUMÉRO D'ABORD, PAR SON NOM ENSUITE.**
  Le nom est saisi à la main depuis des mois — « Mehmet », « mehmet »,
  « Mehmet Y. » — un numéro normalisé par `telWa()` ne varie pas. Un test
  l'éprouve avec un nom volontairement mal écrit.
- Le panneau « Papiers à surveiller » du tableau de bord **ne montre que ce
  qui cloche** : un carnet à jour n'affiche rien, et sa réapparition est
  elle-même l'alerte.
- **L'identifiant `id` ne change JAMAIS** : le nom et le numéro se corrigent,
  les factures déjà émises pointent dessus.

### La facture (`#ecran-facture`)

- **L'ARGENT NE PASSE JAMAIS PAR ELATRANSFER** — le client paie le chauffeur.
  La commission ne s'encaisse donc pas toute seule, elle se **facture**.
  C'était le trou du modèle depuis le début.
- **PAS DE SIRET, PAS DE FACTURE.** Sans nom, SIRET et adresse de l'émetteur,
  le document n'en est pas une (art. L441-9 Code de commerce) : on refuse de
  l'éditer plutôt que d'en envoyer une fausse à un tiers. Même schéma que le
  lien d'avis — on bloque et on emmène au champ.
- **LE RANG NE RECULE JAMAIS** (`ela_rang_facture`, `F-AAAA-NNNN`). Il est
  consommé **à l'émission**, jamais à l'aperçu : regarder ce qu'on va
  facturer ne doit pas brûler un numéro qui manquerait ensuite. À la
  restauration d'une sauvegarde, on garde **le plus grand des deux rangs** —
  reprendre celui du fichier réémettrait des numéros déjà utilisés.
- **UNE COURSE N'EST FACTURÉE QU'UNE FOIS** : elle porte `factureNum` et sort
  du lot. Un doublon ne se voit que six mois plus tard, chez le comptable.
- **SEULES LES `realisee` SONT FACTURABLES** — une course confirmée est une
  promesse, pas un encaissement. Même règle que le registre.
- **LA FACTURE EST FIGÉE À L'ÉMISSION** : nom, adresse et SIRET des deux
  parties sont **recopiés dedans**. Le chauffeur peut déménager ; un document
  comptable qui se réécrit tout seul ne prouve plus rien. Un test change
  l'adresse après coup et rouvre l'ancienne facture.
- **La TVA est ÉTEINTE par défaut** — en micro-entreprise on démarre en
  franchise, et réclamer une TVA qu'on ne reverse pas est une facture fausse.
  Mention « TVA non applicable, art. 293 B du CGI ». À noter : **la
  commission est à 20 %, pas à 10 %** — le taux réduit est celui du
  transport, pas celui de l'intermédiation.
- Mentions obligatoires portées : prestation, période, paiement à réception,
  absence d'escompte, pénalités de retard et **indemnité forfaitaire de 40 €**
  (L441-10 et D441-5).
- **À l'impression, seule la facture sort** — même règle que l'affiche, et
  elles ne peuvent pas se disputer le papier : l'affiche vit dans le tableau
  de bord, la facture sur son propre écran, et un écran non affiché est en
  `display:none`, qu'aucune règle de visibilité ne ramène.

### La sauvegarde a changé de format

Elle emporte désormais **courses, chauffeurs, factures, rang et entreprise**
dans un objet `{format:"elatransfer-1", …}`. Une sauvegarde qui ne rendrait
que les courses laisserait Barbaros sans preuve que ses chauffeurs étaient
en règle, et referait partir la numérotation à 1.
**L'ANCIEN FORMAT RESTE LU** : un simple tableau de courses se restaure
comme avant. Le carnet et les factures s'AJOUTENT, ils n'écrasent jamais.

### LE DÉFAUT DE POSITIONNEMENT QUE CE TRAVAIL A RÉVÉLÉ

`::-webkit-calendar-picker-indicator` est étiré en `absolute; inset:0` pour
qu'un appui n'importe où dans la case ouvre le sélecteur. Il se cale donc
sur le premier ancêtre **positionné** — et la règle ne posait ce repère que
sur `.duo > .champ`, les deux champs de l'accueil, **les seuls champs de
date qui existaient alors**.
Le premier champ de date posé hors d'un `.duo` n'a plus trouvé de repère :
l'indicateur est remonté jusqu'à la page entière et a recouvert tout, en
transparent. Le bouton « Enregistrer ce chauffeur » était devenu
**incliquable, et rien ne se voyait à l'écran**.
`position:relative` est maintenant sur **tous** les `.champ`. C'est la
deuxième fois que ce projet se fait avoir par un repère de positionnement
supposé — la première était le bouton « me localiser » de l'ancien site.
**Une règle qui vise un cas particulier survit au jour où le cas se
généralise, sans rien casser de visible.**

### ET LA TROISIÈME FOIS : LE BOUTON COLLANT DU BON EXPLOITANT

Septembre 2026, sur une capture de Barbaros : « règle-moi cela, c'est pas
fonctionnel du tout cette partie ». Les cinq boutons d'action du bon
exploitant flottaient par-dessus le formulaire et **recouvraient le champ
« Téléphone » du chauffeur**. Donc : pas de numéro saisissable, donc
« Prévenir le client » ne pouvait jamais partir — et **rien à l'écran ne
disait pourquoi**.

**LA CAUSE N'ÉTAIT PAS CET ÉCRAN, C'ÉTAIT LE SENS DE LA RÈGLE.**
`.veh-action` était **collante par défaut** (écrite pour l'écran des prix :
UN bouton au-dessus d'une liste qu'on parcourt) et chaque écran devait
penser à l'éteindre. Le récapitulatif le faisait, le bon du client le
faisait, celui de l'exploitant l'avait oublié. **Trois écrans sur quatre en
dérogation, c'est que le défaut est à l'envers.** La règle est inversée :
posée dans le flux partout, collante sur `#ecran-vehicules` seulement. Un
écran ajouté demain n'hérite plus du piège.
- **`.veh-action .bouton{margin-top:0}` collait aussi les boutons entre
  eux** : inoffensif tant qu'il n'y en avait qu'un, visible dès qu'il y en a
  cinq. Même famille — une règle taillée pour un cas unique.
- **LE PREMIER JET DU TEST PASSAIT AU VERT.** Il mesurait les **boutons** ;
  le débordement venait de la **marge intérieure du conteneur** — six
  pixels, transparents, qui avalent les appuis comme le ferait un bouton.
  Un contrôle qui ne regarde que ce qui se voit passe à côté de ce qui gêne.
- **IL FALLAIT AUSSI DESCENDRE DANS LA PAGE.** Un bouton collant ne remonte
  sur le contenu que quand sa place naturelle passe sous le bas de l'écran :
  sans `scrollIntoViewIfNeeded()` sur le champ, le contrôle ne prouvait
  rien. C'est exactement pour ça que les suites n'avaient jamais vu le
  défaut — elles regardaient le haut du bon.
- **`fill()` N'EST PAS UN APPUI.** Il écrit dans le champ sans se soucier de
  ce qui le recouvre ; `click()` exige que ce soit bien lui qui reçoive le
  doigt. C'est la différence entre un test qui passe et un client qui
  n'arrive pas à taper. Les deux contrôles sont là.
- Éprouvé **contre l'ancien code** : il tombe bien dessus (`#bbActions`) et
  passe sur le nouveau. Un test écrit après coup qui ne tombe pas sur le bug
  d'origine ne prouve rien.

## LA BARRE DU BAS ÉTAIT FIGÉE SUR QUATRE ONGLETS

Septembre 2026, vu par Barbaros : « il faut recentrer ces trois choix ».
`.barre-int` portait `grid-template-columns:repeat(4,1fr)` — le compte de
l'époque où « Réserver » existait. Depuis son retrait, les trois onglets
restants gardaient chacun **un quart** de la largeur et se tassaient à
gauche : mesuré à 390 px, ils occupaient **0 à 293** et laissaient **97 px
de vide à droite**.

- **Personne ne l'avait vu pendant des semaines**, parce qu'un vide
  n'attire pas l'œil : ce n'est pas ce qui est là qui alerte, c'est ce qui
  n'y est pas. Leçon générale — **un compte écrit en dur dans une mise en
  page survit au changement qui l'invalide**, sans rien casser de visible.
- La barre est maintenant en **`flex`** avec `flex:1 1 0` par onglet : le
  compte ne s'écrit plus nulle part, et elle se réajuste seule si un
  onglet s'ajoute ou disparaît.
- **Le contrôle de `test-nouveau-courses.mjs` ne COMPTE PAS les onglets**,
  il vérifie qu'ils **remplissent la barre** et ont la même largeur. Un
  test qui aurait compté trois onglets serait passé au vert sur la barre
  cassée.
- **LE PICTOGRAMME DE « MES COURSES » EST UN BON DE RÉSERVATION**, plus une
  voiture (septembre 2026 : « la voiture est très moche »). Le dessin
  précédent n'avait pas de **roues** — un profil de voiture sans roues
  n'est qu'une arche posée sur deux moignons. Trois pistes lui ont été
  montrées ; il a choisi le bon, et c'est défendable : « Mes courses »
  contient des bons, pas des véhicules, et un papier de 21 px reste net là
  où une voiture de 21 px devient une tache. **Cinquième refus d'une
  voiture dessinée** — ne plus en proposer.

## L'ARRIVÉE — LA PROMESSE, LE NUMÉRO, ET LA PANCARTE À 10 €

Septembre 2026, quatre demandes qui se suivent et qui tiennent ensemble.

**LA LIGNE SOUS LE BOUTON NE PARLE PLUS D'ANNULATION.** Sa raison, et elle est
juste : « le client ne paie que le chauffeur ». Rien n'est encaissé par le
site, donc annuler ne coûte rien de toute façon — et une promesse qui ne coûte
rien ne rassure personne. Elle dit maintenant ce qui se passe après le clic :
**« Disponibilité confirmée par WhatsApp ou SMS »**. Le barème d'annulation
reste dans les CGV, là où il engage. La clé `annulation` est devenue `dispo` :
**un nom de clé qui décrit autre chose que son contenu finit par ramener
l'ancien texte**. C'est la deuxième fois que cet argument est retiré de la
vitrine — il était déjà parti de l'ancien site et il est revenu à la refonte —
d'où un test dans les deux langues.

**LA PROMESSE D'ARRIVÉE** (`.promesse`, entre le formulaire et « Nos
engagements »). Le client qui atterrit ne se demande pas combien coûte la
course : il se demande ce qui se passe si son vol a deux heures de retard.
- **Sur un aplat d'accent, pas dans une carte blanche.** Les engagements et les
  services sont déjà des cartes blanches ; une cinquième se serait fondue dans
  la série au lieu de se lire comme une promesse.
- **La classe `.arrivee` était déjà prise** par les trois lignes de trajet
  (`trajet-ligne arrivee`) : la règle les aurait toutes repassées en flex sur
  fond vert, dans le bon comme dans le récapitulatif. Attrapé par le sélecteur
  strict de Playwright, qui a rendu quatre éléments au lieu d'un.
- Le titre et le texte sont **deux clés** : le gras se lit seul, en diagonale.

**LE MÊME CHAMP PREND LE NUMÉRO DE VOL OU DE TRAIN.** La promesse parlait du
train ; il fallait un endroit où l'écrire.
- **Un seul champ, pas deux** : c'est le LIBELLÉ qui change (`titreVol`,
  `ph_train`, `train_aide_*`, `train_court`). Deux champs feraient deux fois le
  code, deux fois les tests et deux lignes à tenir dans le bon.
- **ON NE LIT PAS LE MOT « GARE » DANS L'ADRESSE.** *12 rue de la Gare, Melun*
  n'est pas une gare, et le champ s'ouvrirait chez des gens qui prennent la
  voiture en bas de chez eux. `estGare()` lit le **type du lieu**
  (`railway=station`), conservé sur l'item sous `osm`. Les bouches de métro et
  les arrêts de tram sont dans la même catégorie pour l'icône : `PAS_UN_TRAIN`
  les écarte, on n'y prend pas de train.
- **On réécrit l'attribut `data-t`, pas seulement le texte** — sinon un
  changement de langue rappelle « Numéro de vol » sur un départ en gare.
- La course porte **`train: true/false`** : « 6201 » et « AF1234 » ne se
  distinguent pas à la relecture, et le bon de l'exploitant annoncerait « Vol »
  sur un TGV.

**LA PANCARTE EST UNE OPTION À 10 €** (`OPTION_PANCARTE_EUR`). Elle existait,
gratuite et automatique, et seulement en aéroport.
- **Éteinte à l'ouverture, toujours.** Une option cochée d'avance qui gonfle le
  total est un **paiement supplémentaire non consenti** (L224-76 Code conso.).
- **Elle est à DEUX endroits pour UN seul état** : sous la liste des véhicules
  (`.veh-option`, là où l'on décide de ce qu'on achète, à sa demande) et sur le
  récapitulatif (`.bloc-pancarte`, là où le client tape son nom et le voit
  s'écrire sur la pancarte). Les deux sont pilotés par la même fonction, en
  visant des **classes** (`.opt-pancarte`, `.opt-sous`, `.opt-prix`,
  `.opt-attente`) : deux commandes pour un seul état se désaccordent au premier
  oubli.
- **`jugerPancarte()` est appelée depuis `dessinerGammes()`** : l'écran des prix
  s'ouvre avant le récapitulatif, et jugée seulement là-bas l'option resterait
  cachée à l'endroit même où on la choisit.
- **L'aperçu n'apparaît qu'une fois l'option prise.** Montré d'emblée, il
  promettrait gratuitement ce qu'on vend.
- **LES 10 € S'AJOUTENT EN DERNIER**, après l'arrondi et le plancher. Entrés
  avant l'arrondi ils disparaîtraient une fois sur deux : 46 + 10 = 56 redescend
  à 60, et le client paierait **14 €** une option annoncée 10.
- **Pas de majoration dessus** : service à prix fixe. Il n'y a de toute
  façon plus aucune majoration sur le site depuis septembre 2026, mais la
  règle resterait vraie si l'on en réintroduisait une — une pancarte
  affichée 10 € se paie 10 €.
- **Une option qu'on ne voit plus ne se paie plus.** Changer son départ pour une
  adresse ordinaire reprend les 10 € — sinon il paierait un service qu'on ne
  peut plus lui rendre, sans même voir la ligne.
- **La ligne du message WhatsApp est AVANT le prix**, comme le règlement : le
  lecteur de demandes retient le **dernier** montant en euros comme prix de la
  course. Après le prix, la course serait recréée à 10 € au lieu de 80.
- **LES CGV ONT SUIVI, DANS LES DEUX LANGUES.** Elles promettaient la pancarte
  gratuitement à tout le monde (article 8) : la laisser telle quelle en
  facturant 10 € donnait au client un argument contre nous, le prix étant ferme
  donc opposable. L'article 4 décrit l'option et son montant, l'article 8 dit
  qu'elle est souscrite. **Toucher au prix veut dire toucher aux CGV.**
- L'attente offerte est dite **« après l'atterrissage »** (60 min en aéroport,
  30 min en gare) — exactement ce que disent les CGV.
- `.option` est entrée dans les `PROTEGES` de la pastille WhatsApp : mesuré,
  elle recouvrait le « +10,00 € ».

**UN CONTRÔLE TROP LARGE FINIT PAR INTERDIRE DES MOTS AU RESTE DE LA PAGE.**
`test-nouveau-paiement` interdisait « terminal » sur **tout** le récapitulatif,
pour empêcher qu'on justifie la question du règlement par le terminal de carte
du chauffeur. Il est tombé le jour où l'option a dit « devant la porte du
terminal » — un terminal d'aéroport. Il porte maintenant sur le seul
`#blocPaiement`, qui est son sujet.

## LE PAS DES CRÉNEAUX ET L'HEURE PASSÉE

Le préavis de 15 minutes a été **supprimé le 4 octobre 2026** (histoire dans
`memoire/preavis.md`). Ce qui reste, et pourquoi :
- **LES CRÉNEAUX VONT DE 5 EN 5 MINUTES** : `step="300"` (secondes) sur le
  champ et `PAS_MINUTES` dans le script, comparés par un test. `step` se
  compte à partir de `min` : la borne est arrondie au pas SUPÉRIEUR.
- Le formulaire s'ouvre sur le prochain créneau (`prochainCreneau()`) ;
  la borne du champ est ce moment. Une heure non touchée se recalcule
  (`rafraichirHeureProposee()`) à chaque juge ET à « Confirmer » ; une heure
  choisie et passée n'est jamais envoyée, elle est DITE (`#heurePassee`).
  Aucun juge n'en rappelle un autre : ça a bouclé (`memoire/preavis.md`).
- « Passée » se juge sur l'HEURE AFFICHÉE, minute en cours comprise, comme
  le serveur : lue en instant, la nuit du 25 octobre la page bouclait.
- `min` sur un champ d'heure n'a de sens que pour AUJOURD'HUI : retiré sinon.
- Sur téléphone, la molette du système ignore la borne : c'est l'écriteau
  `#heurePassee` qui tranche, avec sa sortie « Partir dès que possible ».

## LA DATE DU JOUR SE COMPOSE EN LOCAL, JAMAIS EN UTC

Septembre 2026, vu par Barbaros à 1 h du matin : « je peux cliquer sur le
6/09 pour 10 h alors qu'on est le 7 ».

La date proposée venait de `toISOString().slice(0,10)`, **qui rend de
l'UTC**. À 1 h du matin à Paris (UTC+2), il est encore 23 h la veille en
UTC : le site se croyait la veille, proposait la date d'hier, et la
laissait choisir.

- **CE GENRE DE BUG NE SE VOIT JAMAIS EN JOURNÉE.** Il n'existe qu'entre
  minuit et 2 h, exactement quand personne ne teste — et il est parti en
  ligne sans que rien ne l'attrape. `dateLocale()` compose la date à partir
  de `getFullYear` / `getMonth` / `getDate`. **Ne jamais utiliser
  `toISOString` pour une date que le client LIT** ; elle reste juste pour
  un horodatage (`cree`), où l'UTC est ce qu'on veut.
- **LA BORNE SE RAFRAÎCHIT** (au `focus` et au retour sur l'onglet). Elle
  n'était posée qu'au chargement : une page laissée ouverte pendant la nuit
  gardait la borne de la veille. Le client d'un vol de nuit garde justement
  l'onglet ouvert des heures.
- **UNE HEURE PASSÉE ÉTEINT LE BOUTON ET LE DIT**, sans attendre le clic —
  écriteau `#heurePassee`, **sans** boutons d'appel : choisir hier est une
  faute de saisie, pas un client pressé à qui l'on vend quelque chose.
  C'est ce qui distingue cet écriteau de « trop proche ». Les deux
  s'excluent : en afficher deux ferait douter le client de ce qu'il doit
  corriger.
- **Le filet de la soumission reste en place.** Un test rallume le bouton
  de force et vérifie que la course est encore refusée.
- **LE TEST DÉPLACE L'HORLOGE DU NAVIGATEUR** à 1 h 12 le 7 septembre, dans
  le fuseau de Paris. C'est la seule façon d'atteindre ce bug. **Il a été
  éprouvé contre l'ancien code** : il tombe bien dessus (`2026-09-06`) et
  passe sur le nouveau. Un test écrit après coup qui ne tombe pas sur le
  bug d'origine ne prouve rien.

## Ses consignes de travail, à tenir pour acquises

- « Répond simplement à mon rythme » · « Arrete de répéter tout le temp les
  même chose » · « Arrete de me parler de l'heure ».
- **Répondre en français.** Il l'a demandé après une réponse en anglais.
- Ne rien faire qu'il n'ait pas demandé : « ne fait pas des chose que je ne
  t'ai pas demander ».
- **Montrer une capture avant de pousser**, et attendre son accord.

### « Mène-moi directement au but »

Septembre 2026, pendant la configuration de Telegram. On lui faisait
traverser des menus (« Edge Functions → Secrets, ou Settings → Edge
Functions selon la version ») alors qu'une **adresse directe** ouvrait la
page en un geste.

**Chercher systématiquement le chemin le plus court, et le donner à sa
place.** Une URL complète plutôt qu'un itinéraire dans une interface ; une
commande à coller plutôt qu'une description de ce qu'elle fait ; un bouton
nommé plutôt que « va dans les réglages ».

- **Un geste à la fois quand il suit une procédure.** Trois étapes d'un
  coup, il se perd et le dit (« je comprends rien », « arrête de
  t'avancer »). On donne UNE action, on attend sa réponse, on donne la
  suivante.
- **Ne pas décrire une interface qu'on ne voit pas.** Ses captures d'écran
  disent où il est vraiment : les lire avant de répondre, pas supposer.
  Il s'est retrouvé dans la recherche des RÉGLAGES de Telegram au lieu de
  celle des conversations — invisible depuis ici sans la capture.
- **Pas de jargon, et pas d'anglais non expliqué.** « La loupe en haut »,
  pas « la recherche globale ».

### « NE DEVINE PLUS JAMAIS »

Septembre 2026, dans la foulée de la règle du dessus. Deux adresses du
tableau de bord Supabase données de mémoire, deux pages d'erreur chez lui
(`/integrations/hooks`, puis `/database/hooks`). Le réseau de cette machine
bloque `supabase.com` : je ne pouvais pas vérifier, et j'ai proposé quand
même.

**Quand on ne peut pas vérifier, on ne propose pas une valeur — on donne un
chemin qui ne dépend d'aucune valeur.** Ici : la recherche du tableau de
bord Supabase, où il tape « webhook », et qui marche quelle que soit la
version.

C'est la même règle que « NE JAMAIS CHANGER UN RÉGLAGE PAR DÉFAUT QU'ON NE
PEUT PAS ÉPROUVER » (le `html_handling` de Cloudflare), et que « on ne lit
pas des chiffres sur une photo pour en tirer une alerte » (le numéro du
flyer easyHotel). Trois fois la même faute : **affirmer sans pouvoir
mesurer**.

Ce qu'il faut faire à la place, dans l'ordre :
1. **Vérifier** — un `grep` dans le dépôt, un appel réseau, un test.
2. Si c'est impossible : **le dire**, et donner le chemin robuste.
3. Ne **jamais** présenter une supposition comme une instruction.

### « Arrête de deviner, sois expert méthodique »

Septembre 2026, après une soirée où une panne a coûté une heure. **Deux
habitudes à supprimer, pas deux conseils.**

**1. MESURER AVANT D'ÉMETTRE UNE HYPOTHÈSE.** Sur le bouton mangé par la
barre du bas, j'ai supposé successivement un bouton désactivé, un écriteau
de zone, un problème d'heure — trois hypothèses, trois vérifications, zéro
résultat. **La mesure qui a tout donné a pris trente secondes** :
`elementFromPoint` au centre du bouton, qui rend « onglet ». L'ordre est
toujours le même : (1) reproduire, (2) **mesurer l'état réel** — rectangles,
valeurs, ce que reçoit le doigt — (3) comparer avec la version qui marchait
(`git worktree` sur `main`, un serveur sur un autre port), (4) bissecter
commit par commit. Ce chemin est plus court que l'intuition, toujours.

**2. NE PAS RELANCER LES VINGT ET UNE SUITES À CHAQUE PAS.** Elles prennent
six minutes ; elles ont tourné cinq fois cette nuit-là, dont trois pour rien.
La marche à suivre : après un changement, lancer **les deux ou trois suites
qui touchent au sujet**, plus celle qu'on vient d'écrire, et **éprouver le
nouveau contrôle contre le défaut qu'il surveille**. La série complète ne se
lance **qu'une fois**, avant la fusion. Deux exécutions en parallèle se
marchent dessus et se bloquent — ne jamais en lancer une seconde tant que la
première tourne.

**3. UNE SUITE MUETTE EST UN ÉCHEC.** `test-nouveau-option` n'a rien affiché
— ni réussite ni échec — dans trois séries d'affilée, et je l'ai lue comme
« pas concernée ». La boucle de lancement le signale maintenant en toutes
lettres (`!!! MUETTE — PLANTAGE`) et recopie les dernières lignes.

## ADMIN V2 — CONSTRUIT, ÉCARTÉ, ARCHIVÉ

Un second espace exploitant, côté serveur, construit en septembre 2026 par
une autre session puis porté à parité en sept briques. Barbaros l'a essayé
le 23 septembre (« on garde l'ancien ») et l'a fait **retirer de la
publication le 3 octobre** — voir « ADMIN V2 N'EST PLUS PUBLIÉ » plus bas,
qui dit ce qui vaut aujourd'hui. Ce qu'il a laissé à l'admin retenu : les
fichiers **partagés** (`intake-demande.js`, `itineraire-partage.js`,
`qr-affiche.js`, `telephone.js`) et les règles serveur (papiers des
chauffeurs, facture sans trou ni doublon). Toute son histoire — les briques,
les audits, les pièges de test — est dans `memoire/admin-v2.md`. Ne l'ouvrir
que s'il est redemandé.

### DEUX PHOTOS DE L'ACCUEIL ONT DISPARU DU SITE EN LIGNE

18 septembre 2026. Un nettoyage du dépôt fusionné dans `main` (`a87db4a`) a
supprimé le dossier `photos/` — que ce fichier demande explicitement de **ne
pas** supprimer sans l'accord de Barbaros : *« c'est du travail qu'il a
fourni »*.

**MESURÉ SUR LE SITE CONSTRUIT, pas supposé** : deux des **cinq** cartes de
services de l'accueil avaient perdu leur fond — la deuxième (Hôtel) et la
cinquième (Mise à disposition). C'est ce que voyait un client arrivant sur
elatransfer.com.

- **POURQUOI RIEN NE L'A ATTRAPÉ** : une image de fond qui manque **ne casse
  rien**. Aucune erreur levée, la page se charge, la mise en page tient. Il
  reste un trou gris — et ça ne se voit qu'en **regardant** la page, ce
  qu'aucune suite ne faisait pour les images.
- **ON A ÉTÉ JUSTE DANS L'IMPUTATION** : `easyhotel.jpg` manquait **déjà
  avant** le nettoyage ; les deux autres non. Vérifié commit par commit
  plutôt que de tout mettre sur le même dos.
- Les deux fichiers ont été **restaurés depuis l'historique**. Les onze
  autres photos ne sont plus référencées par rien : elles restent dans
  l'historique git, récupérables, et leur sort est **une décision de
  Barbaros** — pas un nettoyage appliqué en passant.

**LE CONTRÔLE NE FIGE AUCUNE LISTE** : il lit ce que le site **construit** va
chercher et vérifie que chaque fichier existe. Une photo retirée
volontairement, avec sa référence, reste verte ; une référence orpheline
tombe, et le message **nomme le fichier**. Même famille que le débordement de
6 px : seul le site publié le montre.

**QUATRIÈME FOIS QUE CE PROJET SE FAIT PRENDRE PAR UN CONTRÔLE QUI LIT UN
COMMENTAIRE.** Le premier jet tombait sur `photos/easyhotel.jpg` — qui n'est
pas une référence mais un **exemple écrit dans un commentaire**, au-dessus
d'un champ `photo:""` vide. Après `cp -r carte`, `cp -r exploitant` et la
section des tests, la règle est acquise : **on retire les commentaires avant
de chercher**.

**ET MA PREMIÈRE POSE DU BLOC ÉTAIT APRÈS `serveur.close()`** : la suite
mourait sur `ECONNREFUSED` et n'affichait **rien**. Une suite muette est un
échec — ne jamais la lire comme « pas concernée ».

### LE BANDEAU COLLANT MANGEAIT 18 % DE L'ÉCRAN — ET J'AVAIS MAL DIAGNOSTIQUÉ

**J'AI D'ABORD ANNONCÉ UN DÉFAUT QUI N'EXISTAIT PAS.** En regardant une
capture, j'ai dit à Barbaros que « Activer notifications » et « Déconnexion »
passaient **par-dessus le logo ELA**. Mesuré ensuite : le logo finit à x=114,
le bloc de droite commence à x=114, et `elementFromPoint` au centre du logo
rend bien `IMG`. **Aucun chevauchement.** Ils étaient seulement collés.
C'est la quatrième fois que ce projet paie la même faute — le numéro du flyer
easyHotel lu sur une photo, les deux adresses Supabase données de mémoire, le
`html_handling` de Cloudflare. **Lire une image n'est pas mesurer.**

**LE VRAI DÉFAUT, LUI, ÉTAIT PIRE, et seule la mesure l'a donné** : l'en-tête
faisait **130 px à 390 px et 152 px à 320 px**, parce que les deux boutons ne
tenaient pas côte à côte et **s'empilaient**. Il est collant et présent sur
TOUS les écrans : 15 à 18 % de la hauteur, en permanence, sur l'outil qu'il
ouvre vingt fois par jour.

- **UN RÉGLAGE QU'ON POSE UNE FOIS N'A RIEN À FAIRE DANS UN BANDEAU COLLANT.**
  « Activer les notifications » est descendu dans le tableau de bord, sous un
  titre qui dit ce que c'est. **Même décision que « Affiche hôtel » et
  « Serveur »**, sortis du haut de l'ancien tableau de bord pour exactement
  cette raison. Mesuré après : **65 px aux trois largeurs**.
- **L'ADRESSE E-MAIL EST MASQUÉE SOUS 900 px** : elle ne dit rien à quelqu'un
  qui est seul à se connecter, et c'est elle qui faisait passer la rangée à la
  ligne. Elle revient au-delà, où la place ne manque pas.
- **LE REPLI SUR LE BANDEAU RESTE** dans `admin-v2-push.js` : si `#zonePush`
  manque — une page plus ancienne gardée en cache, par exemple — le bouton
  doit exister **quelque part** plutôt que de disparaître sans un mot.
- **LE CONTRÔLE MESURE UNE HAUTEUR**, aux deux largeurs. Relire le CSS ne dit
  pas si ça passe à la ligne. Et il vérifie que le bouton **existe encore** et
  fait 44 px : un réglage introuvable serait pire qu'un bandeau trop haut.
  Éprouvé en le remettant dans le bandeau — quatre contrôles tombent.

**LE SCRIPT DE CAPTURE NE CONSTRUISAIT PAS LE SITE**, et il a failli me faire
montrer une image fausse : après la falsification, `site/` contenait encore la
version cassée, restaurée dans le dépôt mais pas dans le build. Il appelle
maintenant `construire.sh` lui-même. **Troisième forme du même piège** — le
serveur laissé sur le mauvais dossier, la suite qui éprouvait le dépôt au lieu
du site publié, et maintenant la capture d'un build périmé. **Ce qu'on montre
doit être fabriqué au moment où on le montre.**

**C'EST LA PREMIÈRE SUITE NAVIGATEUR DU DÉPÔT À TOURNER EN CI**, et les
suites d'Admin v2 l'ont rejointe depuis. **Toutes les autres ne tournent que
sur la machine de travail** : c'est exactement pour ça qu'elles ont pu rester
rouges quatre jours. Les y brancher toutes est une décision à part — durée,
instabilité. *(On ne compte pas les suites ici : un nombre écrit en dur
survit à la suite qu'on ajoute, et c'est arrivé deux fois dans ce fichier.
`.claude/outils/tests.sh` est la seule recette.)*

**LE LANCEUR CRIAIT AU LOUP, PUIS S'ARRÊTAIT À LA PREMIÈRE SUITE ROUGE.**
Deux défauts trouvés l'un derrière l'autre, et le second **dans la correction
du premier** — c'est la troisième fois que cet outil se fait prendre à son
propre piège.
- Il déclarait « MUETTE — PLANTAGE » toute suite n'imprimant pas la ligne
  `=== `. Or `test-agent-rbac` et `test-unified-facade` **passent** en
  affichant « OK — … ». **Une fausse alerte à chaque exécution est la
  meilleure façon de faire ignorer le lanceur**, donc de laisser passer le
  vrai plantage suivant. Il juge maintenant sur le **code de sortie** ; la
  ligne `===` n'est qu'une convention d'affichage.
- En retirant le `|| true`, `set -e` a repris la main : **le lanceur
  s'arrêtait à la première suite rouge, sans rien afficher**. Une commande
  placée en **condition de `if`** est la seule forme qui capture le code sans
  interrompre. Trouvé en faisant échouer une suite exprès — pas en relisant.
  **L'outil qui doit attraper les pannes des autres ne s'arrête jamais à la
  première.**

**LE LANCEUR IGNORAIT EN SILENCE TOUTE SUITE HORS « test-nouveau* ».**
`test-agent-rbac.mjs` et `test-unified-facade.mjs` n'ont donc jamais été
lancées. Le préfixe est un vestige de la bascule de septembre ; une suite
écrite aujourd'hui ne le porte pas. `tests.sh` ramasse désormais `test-*.mjs`
moins les trois suites hors navigateur, **nommées une seule fois**. Une suite
jamais lancée ne surveille rien, et son absence ne se remarque pas.

### LA SECTION « TESTS » ANNONÇAIT 23 SUITES, IL Y EN AVAIT 28

16 septembre 2026, trouvé en reprenant un point que j'avais moi-même reporté.
Ce fichier disait « vingt-trois suites Playwright, 957 contrôles » et recopiait
les vingt-trois noms dans une boucle à taper. **Cinq suites n'étaient dans
aucune des deux affirmations** — `test-nouveau-icone`, `test-nouveau-suppression`,
`test-admin-papiers`, `test-agent-rbac`, `test-unified-facade`. Qui suivait
cette page ne les lançait jamais.

- **C'EST LA FAUTE QUE CE FICHIER REPROCHE AILLEURS.** Deux recettes pour une
  seule chose — exactement ce qu'on interdit à `construire.sh` — et un compte
  écrit en dur qui survit au changement qui l'invalide, comme la barre du bas
  figée sur quatre onglets. **Un document ne se trompe jamais bruyamment** :
  rien ne signale une suite absente d'une liste.
- **ON NE REMPLACE PAS LE CHIFFRE PAR UN AUTRE CHIFFRE.** Un contrôle qui
  figerait « 28 » se mettrait en travers de la première suite légitimement
  ajoutée, et c'est lui qu'on supprimerait pour avoir du vert. On pointe la
  recette (`.claude/outils/tests.sh`) et on verrouille ce qui ne vieillit pas.
- **LES ACCENTS GRAVES FONT LA DIFFÉRENCE, et la convention existait déjà** :
  une suite qu'on doit LANCER s'écrit entre accents graves, une suite DISPARUE
  s'écrit sans. Elle était référencée sans être appliquée — la liste des neuf
  suites supprimées à la bascule portait encore des accents graves. Corrigée,
  et `test-doc.mjs` s'en sert pour distinguer un souvenir d'une consigne.
- **LE PREMIER JET DU CONTRÔLE PASSAIT AU VERT SUR LA VERSION CASSÉE.** Il
  cherchait `.claude/outils/tests.sh` dans toute la section — et le trouvait
  dans **la phrase qui l'explique**, pendant que la commande à taper avait été
  remplacée. Il ne lit plus que le bloc de commandes. **Troisième fois que ce
  projet se fait prendre par un contrôle qui trouve ce qu'il cherche dans un
  texte d'explication** — après `cp -r carte` et `cp -r exploitant` dans
  `construire.sh`.
- Les quatre contrôles ont été éprouvés un par un contre le défaut qu'ils
  surveillent : commande qui n'appelle plus la recette, commande qui réénumère,
  suite nommée et disparue, lanceur refiltré sur le seul préfixe « nouveau ».

## Tests

**`.claude/outils/tests.sh` EST LA SEULE RECETTE, et ce fichier ne recopie
plus la liste des suites.** Il ramasse `test-*.mjs` moins les trois suites hors
navigateur, nommées une seule fois. À relancer après **toute** modification de
la page.

**CETTE SECTION A MENTI, ET C'EST POUR ÇA QU'ELLE EST ÉCRITE AINSI**
(corrigé le 16 septembre 2026). Elle annonçait « vingt-trois suites Playwright,
957 contrôles » et recopiait les vingt-trois noms dans une boucle. Il y en avait
**vingt-huit**. Cinq suites — `test-nouveau-icone`, `test-nouveau-suppression`,
`test-admin-papiers`, `test-agent-rbac`, `test-unified-facade` — n'étaient dans
aucune des deux affirmations : **qui suivait cette page ne les lançait jamais**.
C'est exactement la faute que ce fichier reproche ailleurs — deux recettes pour
une seule chose, et un compte écrit en dur qui survit au changement qui
l'invalide. On ne remplace donc pas le chiffre par un autre chiffre : on pointe
la recette, et `test-doc.mjs` vérifie désormais les deux choses qui, elles, ne
vieillissent pas — aucun nom de suite cité ici ne doit avoir disparu, et cette
section ne doit pas se remettre à énumérer.

**Plus deux suites qui ne passent ni par un navigateur ni par le réseau** :
- `node test-notification.mjs` (34 contrôles) éprouve le texte de l'alerte
  de la fonction Supabase — c'est la seule partie de cette fonction qui se
  vérifie sans la déployer, et c'est celle qui compte.
- `node test-push.mjs` (22 contrôles) éprouve le chiffrement des
  notifications au client, **en le faisant déchiffrer par `http_ece`** et
  vérifier la signature VAPID par `node:crypto`. Un chiffrement relu par
  son propre auteur ne prouve rien — la leçon de l'encodeur QR.
  `http_ece` vit dans le bac à sable, jamais dans le dépôt ; s'il manque,
  la suite **échoue** au lieu de sauter le contrôle en silence.
  **Il fabrique sa propre paire VAPID à chaque exécution** : voir plus bas
  pourquoi la vraie n'y est pas. L'accord entre la clé de la page et le
  secret se vérifie à part, la clé en main et sans l'écrire nulle part —
  `VAPID_PRIVEE=… node test-push.mjs` (23 contrôles alors, dont un qui
  cherche la clé dans **tous** les fichiers suivis par git).
Le nom `test-nouveau-*` est resté après la bascule : les renommer aurait
touché dix-neuf fichiers pour zéro gain.

```bash
sh .claude/outils/tests.sh
```

Ce qu'il fait, et pourquoi : il lève le serveur local, lance **une seule
exécution à la fois** — deux séries en parallèle se marchent dessus et se
bloquent —, juge chaque suite sur son **code de sortie** et non sur la présence
d'une ligne `=== `, signale une suite **sans aucune sortie** en toutes lettres
plutôt que de la laisser passer, et **ne s'arrête pas à la première rouge** :
l'outil qui doit attraper les pannes des autres ne renonce jamais au premier
échec. Les trois suites hors navigateur (`test-doc`, `test-notification`,
`test-push`) sont comptées comme les autres — elles se contentaient d'afficher,
et le lanceur concluait « tout est au vert » pendant qu'une d'elles échouait.

`test-nouveau-bascule.mjs` couvre ce qui **ne se voit pas à l'écran** et
qu'on ne remarquerait donc qu'une fois le mal fait : le titre et la
description (leur ORDRE — le métier avant les aéroports), l'absence de
`noindex`, les données structurées, le manifeste et les icônes, le fait que
**chaque fichier du `SHELL` du service worker existe** (`addAll` est tout ou
rien : un fichier absent et il ne s'installe plus, sans message), et que les
CGV décrivent la **grille réellement appliquée**.

**UN TEST QUI FIGE UN COMPTE SE MET EN TRAVERS DE LA PREMIÈRE ÉVOLUTION
LÉGITIME.** Le contrôle du CSV s'intitulait « il est séparé par des
points-virgules » et comptait **15 colonnes en dur** : il est tombé le jour
où l'export a gagné « Facture commission », alors que rien n'était cassé.
Il vérifie maintenant son vrai sujet — un `;` présent, aucune `,`. Même
leçon que la barre du bas figée sur quatre onglets, et que les trois tests
qui visaient `p.font-mono` au lieu de `.veh-prix`.

### LE LANCEUR DISAIT « TOUT EST AU VERT » PENDANT QU'UNE SUITE ÉCHOUAIT

16 septembre 2026. `test-notification` est tombé, la ligne
« === ÉCHECS (1) === » s'est affichée à l'écran — et `tests.sh` a conclu
**« TOUT EST AU VERT »** en sortant avec 0.

**LA CAUSE : DEUX BOUCLES, UNE SEULE QUI COMPTE.** Les suites
`test-nouveau*` incrémentaient `ECHECS` ; les trois dernières
(`test-doc`, `test-notification`, `test-push`) se contentaient d'AFFICHER.
Un œil pressé voit le verdict, pas la ligne du dessus ; une automatisation,
elle, ne voit QUE le code de sortie.
**Un outil de contrôle qui ment est pire que pas d'outil** — c'est
exactement ce que ce lanceur existe pour empêcher chez les autres, et c'est
la **deuxième fois** qu'il se fait prendre à son propre piège, après le
`trap` qui écrasait le code de sortie d'origine. Les trois suites se
comptent désormais comme les autres, détail des échecs compris.

### « a-coller.ts » IMPORTAIT ENCORE UN FICHIER — IL N'ÉTAIT PLUS COLLABLE

Trouvé dans la foulée, caché par le défaut du dessus. L'assembleur ne
connaissait que `message.js` ; la PR #180 (double alerte Push + Telegram) a
ajouté un **troisième** fichier, `chiffrer.js`, dont l'import restait dans
le fichier assemblé. Or tout l'intérêt de `a-coller.ts` est d'être collable
**d'un seul bloc avec un pouce** : avec cet import, le collage échoue chez
Supabase, où `./chiffrer.js` n'existe pas.
- **RIEN N'ÉTAIT CASSÉ EN PRODUCTION** : `fonctions.yml` déploie depuis
  `index.ts`. `a-coller.ts` n'est que le chemin de secours au téléphone —
  celui qui sert le jour où l'automatisation tombe, donc le pire moment
  pour découvrir qu'il ne marche pas.
- **L'ASSEMBLEUR INLINE MAINTENANT TOUT CE QU'`index.ts` IMPORTE
  LOCALEMENT**, plus un fichier nommé en dur. Un quatrième demain sera pris
  sans qu'on y pense — et s'il arrive sans compte de paramètres déclaré,
  l'assembleur **s'arrête** au lieu de passer.
- **`async` EST CONSERVÉ.** La réécriture des signatures rendait
  « function hkdf(…) » pour « async function hkdf(…) » : tous les `await`
  du corps seraient devenus des erreurs. Invisible tant qu'aucune source
  inlinée n'était asynchrone — `chiffrer.js` en a trois.
- **UN PARAMÈTRE DE RESTE SE TYPE EN TABLEAU** : `...m: any` est refusé
  (« A rest parameter must be of an array type »), il faut `...m: any[]`.
- **LE COMPTE DES PARAMÈTRES EST PAR FICHIER** (`ATTENDUS`), pas global :
  un seul total aurait confondu une signature retirée ici avec une ajoutée
  là — elles se seraient annulées.
- **CEINTURE** : si un import survit à l'assemblage, on s'arrête plutôt que
  de rendre un fichier qui ne se colle pas. Éprouvé sur les trois cas.
- **LA COMPILATION N'A PAS PU ÊTRE VÉRIFIÉE ICI** — `tsc` n'est pas
  installable sans réseau npm. Ce qui a été mesuré : Node analyse le
  TypeScript sans erreur (`module.stripTypeScriptTypes`) et le JavaScript
  obtenu est syntaxiquement valide. Ça attrape un `async` perdu ou une
  accolade en trop, pas une erreur de type. Le dire plutôt que de
  prétendre l'inverse.

### LA PAGE PUBLIÉE DÉBORDAIT DE 6 px, ET AUCUNE SUITE NE POUVAIT LE VOIR

16 septembre 2026, trouvé en vérifiant autre chose. À 390 px la page publiée
mesurait **396 px** : elle se décalait de six pixels sous le doigt.

**LE DÉFAUT N'EXISTAIT QUE SUR LE SITE PUBLIÉ**, et c'est tout l'intérêt.
Mesuré côte à côte : dépôt 390 px, publié 396. `construire.sh` injecte
`application-facade.css`, qui descend la gouttière des sections à **14 px**
sous 900 px ; le carrousel des services gardait sa marge négative de
**−20 px**, écrite en dur. Deux nombres qui doivent rester égaux, à deux
endroits — dont un que le dépôt ne porte pas.

- **LA GOUTTIÈRE EST DEVENUE UNE VARIABLE** (`--gouttiere`, posée sur
  `.section`). Le carrousel la suit en `calc(-1 * var(--gouttiere))`. Un seul
  nombre par largeur d'écran, et la façade la **redéfinit** au lieu de
  réécrire le `padding` à côté. Même leçon que la barre du bas figée sur
  quatre onglets : **un nombre recopié survit au changement qui l'invalide**.
- **LE CARROUSEL DÉBORDE TOUJOURS DE SON CADRE, ET IL LE DOIT** — c'est ce
  qui fait deviner qu'on peut balayer. Ce qui est corrigé, c'est que son
  CADRE débordait de l'écran. Le contrôle distingue les deux : il ignore
  tout élément dont un parent défile horizontalement.
- **TROIS LARGEURS** — 320, 390, 430 px : une gouttière change avec l'écran,
  et le défaut n'apparaissait qu'en dessous de 900.
- **LE CONTRÔLE VISE LE SITE CONSTRUIT**, dans `test-nouveau-bascule`. Les
  autres suites éprouvent le dépôt, qui ne porte pas cette feuille :
  aucune ne pouvait voir ce défaut, et aucune ne l'aurait vu demain.
  Éprouvé en remettant la façade d'origine — il tombe aux trois largeurs et
  **nomme le coupable** (`div.services [-6→396]`) plutôt que de dire « ça
  déborde » et de laisser chercher dans six mille lignes.
- **CE QUI N'A PAS ÉTÉ TOUCHÉ, ET QUI SE VOIT EN MESURANT** : la façade
  écrit trois fois `grid-template-columns` sur `.services`, qui reste en
  `display:flex` — ces règles sont **inertes**, le carrousel est intact.
  Les retirer ou poser `display:grid` changerait l'aspect de l'accueil :
  c'est une décision de Barbaros, pas un nettoyage.

### QUATORZE CONTRÔLES ROUGES DEPUIS DES JOURS, ET PERSONNE NE LES VOYAIT

16 septembre 2026. La série complète lancée avant une fusion a rendu **14
échecs dans 5 suites**, tous antérieurs. La publication ne regarde pas les
suites : elles pouvaient rester rouges indéfiniment.

**UN TEST QUI TOMBE TOUS LES JOURS NE SURVEILLE PLUS RIEN.** On s'habitue au
rouge, et le jour où il tombe pour une vraie raison, personne ne le voit.
C'est pire qu'un test absent — celui-là, au moins, ne rassure personne.

**UNE SEULE CAUSE POUR DIX D'ENTRE EUX : ils figeaient la formulation du
jour.** La PR #123 a réécrit les documents légaux et changé les tarifs, le
12 septembre. Les tests cherchaient mot pour mot « Total to pay »,
« Données de localisation », « souscrit l'option », « sortie des trains »,
et attendaient un prix calculé à 2,35 €/km. Le fond était resté juste ;
seule la phrase avait bougé. Même leçon que la barre du bas figée sur
quatre onglets et que `p.font-mono` — **viser la règle, pas le libellé**.
Ce qui est verrouillé maintenant, et qui ne vieillira pas :
- le récapitulatif affiche ce que la page dit elle-même dans `ELA_TEXTES`,
  **et les deux langues doivent différer** — sinon une traduction recopiée
  du français passerait au vert ;
- la politique de confidentialité **nomme le bouton** de localisation et
  **pose une condition** à côté, dans les DEUX langues ;
- les CGV nomment l'option pancarte **et son montant, lu dans la page**, et
  **aucune** phrase ne promet la pancarte sans condition.

**LE TROU DE CONTRAT QUE ÇA A DÉCOUVERT.** La réécriture des CGV avait
**perdu l'option pancarte de l'article 4**. Le site facturait donc 10 € une
prestation que la formation du prix ne mentionnait plus — et le prix est
ferme donc opposable. Rétabli dans les deux langues, avec la date de mise à
jour des CGV. **Un document légal qui change sans que sa date change est
lui-même trompeur.**

**LES QUATRE DERNIERS VENAIENT D'AILLEURS, ET C'ÉTAIT LE PLUS INSTRUCTIF :
`test-nouveau-bascule` éprouvait le DÉPÔT alors que son sujet est le site
PUBLIÉ.** Elle cherchait `application.html`, que seul `construire.sh`
fabrique (`cp site/index.html site/application.html`), et concluait au
fichier manquant. Elle construit donc maintenant le site et le sert sur un
second port ; ce qui touche à l'artefact publié vise `SITE`, le reste garde
le dépôt. C'est la suite qui existe pour attraper « un fichier oublié dans
la recette marche en local et reste introuvable en ligne » — elle ne pouvait
pas le voir en n'ouvrant jamais le résultat de la recette.

**LE PREMIER JET D'UN DE CES CONTRÔLES NE TOMBAIT PAS.** Celui de la
pancarte cherchait la PREMIÈRE phrase parlant du panneau — et depuis que
l'article 4 en parle aussi, c'est elle qu'il lisait : l'article 8 pouvait
promettre la pancarte gratuitement à tout le monde sans que rien ne bronche.
Il vérifie désormais que **toutes** ces phrases sont conditionnelles. Trouvé
en l'éprouvant contre le défaut, pas en le relisant.

**UN TEST QUI RÉIMPLÉMENTE CE QU'IL VÉRIFIE NE VÉRIFIE RIEN.** Écrit après
avoir failli garder un contrôle d'arrondi qui recalculait la formule dans
le test au lieu d'appeler la page : il serait passé au vert même avec le
calcul cassé. Faire la vraie course — pour le plancher, une distance de
2 km rendue par le faux OSRM, et on lit le prix à l'écran.

Playwright n'est pas installé dans le dépôt : lier le paquet global une
fois par session avec
`mkdir -p node_modules && ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright`
(`node_modules/` est ignoré par git).

**Les suites tournent hors ligne.** Chacune coupe elle-même ce qu'elle ne
veut pas joindre, en tête de fichier (`p.route('**://…', r => r.abort())`) —
il n'y a plus de coupe-circuit commun : le fichier test-hors-ligne (nommé ici
sans accents graves, voir la convention de `test-doc.mjs`) est parti avec
l'ancien site, et ce paragraphe a continué de le nommer pendant des semaines.
Tout ce qui n'est pas le serveur local échoue immédiatement au lieu de faire attendre
le navigateur trente secondes par appel. Sans ça, l'ensemble dépassait dix
minutes et finissait en délai sans rien vérifier ; avec, il tourne en six
minutes et vérifie au passage que le site reste utilisable quand ses
dépendances extérieures tombent — le cas réel d'un client dans un parking
d'aéroport. Ne pas retirer ce coupe-circuit pour « tester en conditions
réelles » : un test qui dépend d'Internet ne prouve rien.

Trois pièges déjà rencontrés quand une suite échoue :
- **le numéro de chambre.** Un départ dans un hôtel est refusé sans lui.
  Une suite qui réserve depuis l'Ibis doit remplir `#roomPickup`.
- **quatre gammes, pas deux.** Ela One, Ela First, Van, Van Premium — les
  versions haut de gamme sont revenues en août 2026. Une suite qui compte
  les véhicules doit tenir compte des places : à 4 passagers, Ela First
  (3 places) sort et il en reste trois ; à 5 ou 6, seuls les deux vans.
- **l'écran de confirmation n'a plus de repli `<details>`.** Les trois
  moyens d'envoi sont visibles d'emblée, et c'est voulu : tant que le
  client n'a pas appuyé, la demande n'est arrivée nulle part.

## LA MISE EN LIGNE EST ENFIN CONTRÔLÉE, ET L'ASPECT AUSSI

22 septembre 2026, à sa demande (« fais ce qui est le mieux »), après un
audit des dix briques du mandat « STACK IA / DEVOPS MULTI-AGENTS V2 ».
**Deux briques retenues sur dix, et c'est une décision, pas un abandon** —
voir `PROJECT_STATE.md` pour les huit autres et la raison de chacune.

### Le site en ligne est contrôlé APRÈS sa publication

`pages.yml` publiait et s'arrêtait là. L'état **VÉRIFIÉ EN PRODUCTION**
écrit dans `AGENTS.md` n'avait donc aucun porteur : personne ne pouvait le
prouver, et une régression ne se découvrait qu'en perdant un client.

- **UN SEUL CONTRÔLEUR, DEUX CIBLES.** `.github/scripts/verifier-production.mjs`
  prend une adresse, n'importe laquelle : le site construit en local ou le
  site en ligne. Deux contrôleurs auraient divergé, et c'est celui qu'on
  oublie qui laisse passer la panne. C'est aussi ce qui le rend éprouvable
  depuis cette machine, qui ne joint pas `elatransfer.com`.
- **UN CODE 200 NE DIT PAS QUELLE PAGE A RÉPONDU.** Premier jet : en
  supprimant `exploitant/index.html`, le serveur rend un **listage de
  dossier** en 200 et le contrôle restait **vert**. C'est exactement le
  défaut Cloudflare déjà vécu ici — `html_handling` faisait servir le site
  de réservation à l'adresse `/demos/`, en 200, et Barbaros l'a vu au
  premier essai. On vérifie donc chaque porte d'entrée **par son titre**.
- **ON NE COMPTE QUE NOTRE PROPRE ORIGINE.** Un serveur de tuiles lent ou
  un calculateur d'itinéraire muet n'est pas notre régression : le site est
  écrit pour tenir sans eux. Confondre les deux ferait sonner l'alerte une
  nuit sur deux — et une alerte qui se trompe ne se lit plus.
- **LE FICHIER OUBLIÉ PAR LA RECETTE EST LE VRAI SUJET.** `construire.sh`
  ne publie que ce qu'il nomme : un fichier oublié marche parfaitement en
  local, où le serveur sert le dépôt entier, et reste introuvable en ligne
  sans lever la moindre erreur. Le contrôleur écoute donc les réponses ≥ 400
  de notre origine et **nomme le fichier**.
- **ON RÉESSAIE UNE FOIS AVANT DE CRIER.** Deux échecs à une minute d'écart,
  c'est réel ; un seul peut être le réseau du coureur.
- **L'INCIDENT EST UNE SEULE ISSUE**, retrouvée par son marqueur et jamais
  par son titre — un titre se reformule. Elle se met à jour tant que ça
  dure et **se ferme d'elle-même** au retour à la normale : quarante Issues
  pour une seule panne, et plus personne ne les lirait.
- Éprouvé contre quatre falsifications, toutes tombent en nommant le
  défaut : page absente, mauvaise page servie, fichier oublié, bouton de
  réservation disparu.

### La régression visuelle voit ce qu'aucune règle n'avait nommé

Les suites de ce dépôt éprouvent des **règles** : pas de débordement, pas
de bouton recouvert, pas de fichier manquant. Elles sont excellentes pour
ce qu'elles nomment et aveugles au reste. Une couleur qui change, un bloc
qui se décale, une section qui disparaît sans erreur : c'est Barbaros qui
les trouvait, sur une capture.

- **AUCUNE DÉPENDANCE AJOUTÉE, ET C'EST DÉLIBÉRÉ.** Comparer deux images
  demande normalement `pixelmatch` et `pngjs`. Ce projet ne tolère qu'une
  bibliothèque extérieure — Leaflet, servie depuis le dépôt. La comparaison
  est faite par le navigateur déjà installé : deux `canvas`, une boucle sur
  les pixels.
- **LE BRUIT EST NUL, ET C'EST MESURÉ.** Deux captures du même site rendent
  **exactement zéro** pixel d'écart sur les huit écrans. Le réseau extérieur
  est coupé pendant les captures et les animations sont figées : sans ça un
  fond de carte en retard d'un dixième de seconde signalerait un écart tous
  les jours.
- **LE SEUIL EST UN NOMBRE DE PIXELS, PAS UN POURCENTAGE**, et c'est la
  falsification qui l'a imposé. Repeindre la couleur d'accent du site —
  donc tous les boutons — ne touchait que **0,02 %** d'une longue page :
  sous le seuil, déclaré « identique ». **Une grande page diluait le
  défaut.** À 20 pixels, la même couleur ressort à 298 et 457.
- **UNE PAGE QUI NE S'OUVRE PLUS N'EST PAS UN CHANGEMENT D'ASPECT.** Même
  piège que ci-dessus, rencontré deux heures plus tard : un listage de
  dossier en 200 se capturait très bien. Toute page de ce site porte un
  `meta viewport`, parce que le mobile d'abord est la règle ; aucun listage
  n'en a. La capture échoue maintenant, et dit pourquoi.
- **IL NE FAIT PAS ÉCHOUER SUR UN CHANGEMENT D'ASPECT**, et c'est la règle :
  un écran qui change est peut-être exactement ce qui était demandé. On rend
  le nombre de pixels, la part de la page, la hauteur avant/après et une
  image où le rouge marque ce qui a bougé. **La validation visuelle reste
  humaine.** Il échoue en revanche si une page ne s'ouvre plus.
- **LES DEUX CAPTURES SE FONT DANS LE MÊME TRAVAIL, SUR LE MÊME COUREUR.**
  Le seuil de 20 pixels ne tient que par là. Et le contrôleur est **copié
  avant le retour en arrière** : sinon `git checkout` de la base rendrait le
  script d'avant, c'est-à-dire aucun script le jour où on l'introduit.
- **L'HORLOGE DU NAVIGATEUR EST FIGÉE, ET SANS ÇA L'OUTIL CRIAIT SUR
  CHAQUE PR.** Le formulaire d'accueil s'ouvre sur « maintenant + 15 min »
  arrondi au pas de 5 : deux captures prises à quelques minutes d'écart
  n'affichent pas la même heure. Mesuré — **65 pixels** d'écart sur
  l'accueil entre la capture avant et la capture après, alors qu'aucun
  fichier du site n'avait changé. `clock.setFixedTime()`, et l'écart
  retombe à zéro sur les huit écrans à cent secondes d'intervalle. Les
  suites du dépôt ancrent déjà l'horloge pour la même raison.
- Le filtre du workflow porte des **motifs**, jamais une liste de noms —
  une liste survit au fichier qu'on ajoute. Même piège que le filtre de la
  CI et que la barre du bas figée à quatre onglets.

**DEUX PIÈGES DE BANC, PAS DE PRODUIT, RENCONTRÉS EN LIVRANT CES OUTILS :**

- **UN MODULE ESM CHERCHE `node_modules` À CÔTÉ DE LUI-MÊME, PAS DANS LE
  DOSSIER COURANT.** Le contrôleur visuel doit être copié avant le retour
  en arrière — sinon `git checkout` de la base rend le script d'avant,
  c'est-à-dire aucun script le jour où on l'introduit. Posée dans
  `RUNNER_TEMP`, hors du dépôt, cette copie rendait `ERR_MODULE_NOT_FOUND`
  et le contrôle tombait en quarante secondes. **C'est la CI qui l'a dit,
  pas la relecture.** La copie vit donc à la racine du dépôt : un fichier
  **non suivi** survit à `git checkout --force` (ça, c'est `git clean`), et
  `construire.sh` ne publie que ce qu'il nomme — vérifié, il ne part pas en
  ligne.
- **UN SERVEUR LAISSÉ SUR LE MAUVAIS DOSSIER, TROISIÈME FOIS.** Deux écrans
  rendaient 404 pendant une simulation : un `python3 -m http.server` resté
  ouvert sur le port, enraciné sur le **dépôt** et non sur `site/`. Le
  contrôle de santé (`curl /`) l'acceptait, puisque le dépôt a aussi un
  `index.html`. **Encore un 200 qui ne dit pas qui a répondu.** Sur un port
  neuf, tout répond. Et `pkill -f "http.server"` n'est pas la solution : le
  motif correspond aussi à la ligne de commande du shell qui l'exécute, et
  il se tue lui-même — vu.

## Le logo

Le signe court est « **ELA** » gravé en ivoire sur marine, souligné d'un
filet doré **qui sort du cadre à droite** — la route ne s'arrête pas au
bord. C'est la seule idée du logo, et elle survit à 24 px. Le nom complet
« ELA**TRANSFER** » et la ligne « Paris · Roissy CDG · Orly » s'écrivent à
côté ; le signe seul ne sert que là où il n'y a pas la place d'écrire
(onglet, écran d'accueil, photo de profil).

Les fichiers `icon.svg`, `icon-maskable.svg` et `icon-180.png` sont
**fabriqués**, pas dessinés à la main : les lettres sont les contours réels
d'Inter convertis en formes, pour que le logo ne dépende d'aucune police.
Le script de fabrication vit hors du dépôt ; en cas de reprise, refaire les
lettres avec `fontTools` plutôt que de les redessiner en rectangles —
essayé, le A était raté et ça se voyait.

Deux pièges : **un commentaire XML ne supporte pas deux tirets à la
suite** (une ligne de séparation en tirets a déjà rendu `icon.svg`
illisible, l'icône disparaissait partout sans le moindre message), et
**iOS ignore un `apple-touch-icon` en SVG** — d'où le PNG de 180 px.

Refusé : le E seul (« c'est moche »), et toute voiture, roue ou route
dessinée.

## CHANGER SON MOT DE PASSE DEPUIS L'ESPACE — « Réglages »

23 septembre 2026, à sa demande : changer ses accès depuis le téléphone.
**Le code d'exploitant n'existe plus en ligne** : `harden-exploitant-auth.mjs`
le remplace à la construction par la connexion Supabase (e-mail + mot de
passe, puis `est_exploitant()`). Le vrai accès admin est donc ce mot de passe.
- **Pourquoi un bloc dans le site** : l'éditeur SQL de Supabase refuse le
  collage sur iPhone, et « Reset password » envoie un lien que ce site ne sait
  pas recevoir (aucune gestion de `type=recovery`). Ne pas l'y renvoyer.
- **Ne jamais supprimer puis recréer le compte** : `operateurs` le désigne par
  son `user_id`, un compte recréé n'aurait plus accès à l'admin.
- Après le changement, `logout?scope=others` déconnecte les AUTRES appareils :
  changer un mot de passe qu'on croit connu ne sert à rien si la session de
  celui qui le connaissait reste ouverte.
- Le bloc est dans « Réglages », que le rôle `agent_reservation` ne voit pas :
  un agent ne peut pas encore changer le sien. `test-nouveau-mdp.mjs`.

## UN SEUL ADMIN : L'ANCIEN, SES COULEURS, ET LE LOGO EN BLANC

23 septembre 2026, Barbaros : « le nouvel admin est moins fonctionnel que le
premier, il y a des blocages, des incohérences, on ne peut pas faire retour »
— puis « on garde l'ancien, on adapte visuellement ». **L'espace historique
(`admin.html` → `application.html?exploitant=1`) est l'admin retenu.** Admin v2
reste publié mais n'est plus la porte : ne pas y renvoyer Barbaros.
- **L'alerte Telegram vise `admin.html`** (défaut de `ADRESSE_ADMIN` dans
  `nouvelle-demande`), et `?ref=` y ouvre directement le bon de la course.
  `test-admin-arrivee.mjs` éprouve, sur le site construit, qu'une demande
  déposée par un client arrive et est annoncée **sans passer par WhatsApp**.
- **SES COULEURS RESTENT — SEUL LE LOGO EST MONOCHROME** (24 septembre 2026).
  J'avais lu « tu peux utiliser la couleur noir et blanc » comme une consigne
  pour tout l'espace : en-tête, boutons, colonne, graphiques du registre.
  Réponse : « partout c'est noir et blanc, je veux juste le logo en noir et
  blanc ». Tout est revenu à la marine et au céladon ; le logo est passé en
  **blanc** (`filter:brightness(0) invert(1)`) sur l'aplat marine. **Une
  demande sur un élément ne s'étend pas à toute la page** — demander avant
  de repeindre un écran entier. Le bloc vit en fin de style d'`index.html`.
  **Le rouge de l'attente et la pastille « confirmée » ne changent jamais** :
  ce sont des états.
- **`application-facade.css` repeignait l'espace ET le cassait** : une grille
  de 220 px et une colonne `sticky` se superposaient au `padding-left` de
  252 px — la colonne commençait à 252 px et le contenu passait dessous.
  Les règles `body.espace` en ont été retirées. Une seconde feuille qui
  habille le même écran finit toujours par le casser.
- **« Confirmer la course » exige un chauffeur, et refuse un papier périmé**
  (audit du 30/09/2026). Sans chauffeur, le client recevait « Transfert
  confirmé — Chauffeur : — ». Un chauffeur du carnet dont un papier est
  PÉRIMÉ est refusé ; hors carnet, l'avertissement orange reste, sans
  blocage — même règle que Admin v2. Ce contrôle est dans l'écran : Admin v2
  seul l'impose côté serveur.
  **LE REFUS SUR LES PAPIERS EST RETIRÉ DEPUIS LE 4 OCTOBRE 2026** (Barbaros :
  « ne fais pas bloquer les chauffeurs liés aux papiers »). L'avertissement
  rouge reste sur le bon ; « Confirmer », « Retour », « Prévenir le client »
  et la saisie par téléphone passent. **Ne pas le remettre** sans qu'il le
  redemande. Le chauffeur reste obligatoire pour confirmer, et le seuil de
  dette (facultatif) bloque encore.
- **« Refuser la course » demande deux appuis**, comme « Supprimer » : un
  refus ne se défait pas depuis le bon, et il est juste sous « Marquer comme
  réalisée ».
- **L'outil « Fabriquer les clés » des notifications est caché** tant que le
  serveur a une clé : une paire recollée par erreur couperait tous les
  abonnements.
- **SUR TÉLÉPHONE, LE MENU EST UNE GRILLE DE TUILES, PLUS UNE RANGÉE QUI
  DÉFILE.** Capture de Barbaros : « j'ai que cette page, il n'y a rien
  d'autre ». Les pastilles défilaient de côté et seules deux étaient à
  l'écran : un menu dont on ne voit pas la suite n'existe pas. Toutes les
  entrées sont maintenant visibles d'un coup, en tuiles de 54 px de haut, et
  l'en-tête du site est masqué dans l'espace (le logo vit dans la colonne).
- **« D'où viennent les clients » était écrit deux fois dans le registre** :
  le panneau venu du tableau de bord (`#panneauProvenance`) est masqué, le
  bloc du haut dit la même chose et l'argent encaissé en plus.
- **Sur le bon, un seul geste principal : l'étape suivante.** En attente :
  « Confirmer » (pas « Marquer comme réalisée ») ; confirmée : « Marquer comme
  réalisée » ; réalisée ou refusée : ni l'un ni l'autre, ni « Refuser ». Les
  deux gros boutons l'un sous l'autre laissaient clôturer d'un pouce une
  course jamais placée — donc compter au registre de l'argent jamais entré.
  `test-admin-arrivee.mjs` éprouve les trois états.

## LE BON DE RÉSERVATION — MODÈLE B, UN SEUL POUR TOUTES LES PAGES

24 septembre 2026, à sa demande : « je veux un tout nouveau bon avec mon
logo, tu supprimes l'ancien, tu ne reprends rien de l'ancien ». Trois modèles
lui ont été montrés en capture ; il a choisi le **B**.
- **En-tête clair, le vrai logo (`brand-logo.webp`) centré**, la pastille
  d'état, la référence, « Bon de réservation », puis la phrase. L'ancien
  en-tête marine recomposait la marque en CSS (arc SVG + « ELATRANSFER » en
  texte) : un second dessin du logo, qui divergeait du vrai fichier.
- **Le prix est dans un encart vert clair** (`#bonDetail .ligne.total`),
  visé par l'identifiant du bon : `.ligne.total` sert aussi au
  récapitulatif, qu'on ne touche pas.
- **UN SEUL BON, IDENTIQUE PARTOUT — il ne prend PAS la couleur d'un
  partenaire.** Une première correction l'avait fait passer à l'orange sur
  une course easyHotel ; il l'a refusé : « je ne veux pas que tu adaptes la
  couleur ». Les couleurs du bon sont donc des valeurs fixes, pas les
  variables `--accent*` que `hotel-engine-polish.css` réécrit.
- **Attente = pastille grise, confirmé = pastille verte pleine.** Même règle
  que partout : si l'attente avait une couleur, elle mentirait sur l'état.

## « INCLUS DANS CHAQUE COURSE », LES TROIS ÉTAPES ET LES QUESTIONS

25 septembre 2026, maquette validée par Barbaros (« Ça me convient publie »).
- « Pourquoi choisir Elatransfer ? » et ses quatre cartes sont remplacés par
  un bloc bleu nuit **« Inclus dans chaque course »** : des FAITS tenus par
  les CGV (attente art. 7, prix ferme art. 4, règlement art. 5), pas des
  adjectifs. Les clés `eng1`…`eng4s` sont gardées, leurs textes ont changé.
- **Aucune mention « VTC »** : il ne veut pas l'afficher, ses chauffeurs
  peuvent être VTC ou taxi.
- Les trois étapes tiennent sur **une ligne** sous le seul « Voir mon prix »
  (`.etapes-ligne`). Un second bouton plus bas a été refusé : il rallongeait
  la page pour rien.
- Les **questions fréquentes** sont en bas de l'accueil, au-dessus du pied.
  Chaque réponse reprend les CGV : en changer une, c'est relire le contrat.
- **Les couleurs sont celles de la façade en ligne** (`--ela-navy`,
  `--ela-blue`, `--ela-cyan` d'`application-facade.css`), pas le céladon du
  mémo : j'avais d'abord proposé du vert en lisant une note au lieu du site.
  **Regarder le site publié avant de choisir une couleur.**
- Classes neuves (`.inclus`, `.faq-q`) : la façade habille `.engagement`.

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

## NE JAMAIS CAPTURER `index.html` TOUT SEUL — IL A L'AIR D'UN AUTRE SITE

28 septembre 2026. Une capture envoyée à Barbaros montrait un accueil vert
sombre — l'ancienne palette, jamais la sienne. Il l'a vu tout de suite :
« mon site n'est pas celui-ci, ça c'est ancien ».

**LA CAUSE N'ÉTAIT PAS UN VIEUX FICHIER OUBLIÉ QUELQUE PART** — il n'y en a
pas, `index.html` est la seule source depuis la bascule de septembre. La
capture avait été prise en ouvrant `index.html` **directement**, sans passer
par `construire.sh` : `application-facade.css` (bleu, logo, boutons) ne
s'injecte que là, dans `site/index.html`, jamais dans le fichier source.
Vu seul, `index.html` porte encore sa palette de base ; vu à travers la
recette — ce que voit réellement un client — il est bleu.

**TOUJOURS CONSTRUIRE AVANT DE CAPTURER** : `sh construire.sh`, puis servir
et capturer `site/`, jamais le dépôt directement. Même famille que « le
script de capture ne construisait pas le site » plus haut dans ce fichier —
troisième fois que ce projet se fait avoir par une capture prise avant la
recette plutôt qu'après.

## LA RECHERCHE D'ADRESSE RAPPROCHE DE PARIS, ELLE N'EXCLUT RIEN

28 septembre 2026, à sa demande : « il doit m'aider à trouver les adresses
logiques en Île-de-France, pas me proposer une rue dans le sud de la
France ». Sur un nom de rue courant (« rue de la Paix », « rue de la
Gare »…), qui existe par dizaines dans toute la France, la liste pouvait
mettre en tête une ville à 800 km sans rapport avec la zone desservie.

**LE TROU ÉTAIT DANS LA BASE ADRESSE NATIONALE, PAS DANS PHOTON.** Photon
portait déjà un biais vers Paris (`lat=48.8566&lon=2.3522` dans
`itineraire-partage.js`) ; la BAN — celle qui répond aux adresses postales,
donc la branche que prend une saisie commençant par un chiffre, la plus
fréquente du site — n'en portait AUCUN. `depuisBAN()` porte maintenant le
même biais.
- **CE N'EST PAS UNE EXCLUSION, ET C'EST VOULU.** `&lat=` / `&lon=`
  RAPPROCHENT sans jamais retirer un résultat : un client qui part
  vraiment de Bordeaux garde sa rue dans la liste, elle descend juste. La
  vraie interdiction (la zone des 90 km) reste au moment du CHOIX
  (`horsZone`), pas à la recherche — chercher et réserver sont deux
  moments différents.
- **LE CLASSEMENT DE `chercher()` (index.html) TENAIT COMPTE DU TEXTE,
  JAMAIS DE LA DISTANCE.** Deux rues homonymes arrivaient donc à égalité
  de score, et c'était l'ordre brut renvoyé par le serveur qui décidait —
  sans rapport avec ce que cherche un client d'Elatransfer. `note()` ajoute
  maintenant un bonus pour ce qui tombe dans les 90 km (`CENTRE_RECHERCHE`,
  `RAYON_RECHERCHE_KM`) via `bonusDistance()`.
- **LE CENTRE DE PARIS EST RECOPIÉ, PAS PARTAGÉ**, à trois endroits
  maintenant (Photon, `note()`, et `CENTRE_ZONE` de la zone desservie plus
  bas) : c'est un fait géographique stable, pas une grille tarifaire
  appelée à changer — même raisonnement que la répétition déjà acceptée
  entre Photon et la zone desservie.
- **Validé** : les suites `test-nouveau` (recherche d'adresse), `-hotel`,
  `-geoloc`, `-itineraire`, `test-admin-prix` restent toutes vertes. Et
  éprouvé pour de vrai — une fausse BAN qui rend Marseille EN PREMIER,
  avant Paris : la page réordonne, Paris passe devant.

**LE SEUIL UNIQUE A ÉTÉ REMPLACÉ PAR UN DÉGRADÉ** (même jour, à sa demande :
« fait ce que tu penses être le meilleur sans restreindre le client »). Une
seule coupure à 90 km traitait Melun (50 km, dans la zone), Tours (220 km,
une vraie destination qu'on sert de vive voix — voir « la zone desservie »
plus bas) et Marseille (660 km) de la même façon dès qu'on sortait des
90 km : même pénalité pour un client plausible et pour un homonyme sans
rapport. `bonusDistance(km)` (`itineraire-partage.js` n'est pas concerné,
c'est une fonction de `index.html`) :
| Distance | Bonus |
|---|---|
| ≤ 90 km (la zone desservie) | +3 |
| ≤ 200 km (grande couronne élargie, villes limitrophes) | +1 |
| ≤ 400 km (une vraie destination lointaine) | 0 |
| > 400 km | −2 |
- **TOUJOURS AUCUNE EXCLUSION** : le dernier palier redescend, il ne retire
  rien — même règle que le palier unique qu'il remplace.
- **LA BAN EST INTERROGÉE PLUS LARGE** (`limit=10`, pas 6). Sur un nom de
  rue courant, six homonymes suffisaient à remplir la liste de villes de
  province avant que le classement ait un exemplaire francilien à faire
  remonter — le tri se fait ensuite, ici on lui donne seulement plus de
  candidats à trier. Même raisonnement que le `limit=15` déjà admis chez
  Photon pour les noms de chaîne.
- **Éprouvé** : Melun (50 km) et Paris ressortent avant Tours (220 km),
  qui ressort avant Marseille (660 km) — un dégradé à trois vraies marches,
  pas seulement Paris contre le reste. Les suites `test-nouveau`, `-hotel`,
  `-geoloc`, `-itineraire`, `test-admin-prix` restent toutes vertes.

**« SACRÉ COEUR », « CHAMPS ELYSEE », « AMST » — CE QU'ON CHERCHE PAR SON NOM
PASSE DEVANT** (30/09/2026, à sa demande : « il me propose des bars alors que
je parle de la basilique… amst doit montrer la rue d'Amsterdam mais aussi
Amsterdam aux Pays-Bas »). Trois causes, lues dans le code (le réseau d'ici
ne joint ni la BAN ni Photon) :
- **« œ » n'était pas ramené à « oe »** par `sansAccents` (NFD ne défait pas
  une ligature) : « coeur » ne retrouvait pas « Cœur », et le bar écrit
  « Coeur » passait devant la basilique.
- **Un lieu de culte n'était dans aucune catégorie** (`categorieDuLieu` :
  `place_of_worship` et la clé `historic` vont maintenant en « culture »), et
  une avenue n'avait pas le bonus de « lieu nommé » des commerces qui portent
  son nom. `note()` : +3 à un monument qui répond au nom tapé, +3 à une rue
  dont tout le nom est tapé (la BAN garde son `type`), −2 à un bar ou un
  restaurant si le client n'a écrit ni « restaurant » ni « bar »… Rien n'est
  retiré de la liste, l'ordre seul change.
- **Photon était filtré sur la France.** Le filtre est retiré : l'étranger
  apparaît, plus bas (`bonusDistance`), avec son pays écrit (« Amsterdam,
  Pays-Bas »). **La zone des 90 km tient au moment du CHOIX** : choisir
  Amsterdam affiche « hors zone » avec appel et WhatsApp — décidé, on ne vend
  pas un Paris → Amsterdam en ligne au prix du kilomètre.
`test-nouveau-recherche.mjs` rejoue ses trois exemples, réponses données
dans l'ordre le plus défavorable ; sur l'ancien code il rend exactement ce
qu'il voyait (le bar en tête, l'hôtel avant l'avenue, pas d'Amsterdam).

## UN SEUL TARIF AU KILOMÈTRE, ET IL SE MODIFIE DEPUIS L'ADMIN

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

## AUDIT DE SÉCURITÉ DU 28/09/2026 — DEUX FONCTIONS OUVERTES À TOUS

**Le jeton vérifié par Supabase à l'entrée d'une fonction ne prouve RIEN** :
la clé publique du site (lisible dans la page) le franchit — c'est même
comme ça que `etat-course` et `courses-hotel` sont appelées. Toute fonction
qui agit au nom de Barbaros doit donc vérifier elle-même `est_exploitant()`
avec le jeton de l'appelant (modèle : `capturer-paiement`).
- **`prevenir-client`** n'avait aucun autre contrôle : n'importe qui pouvait
  envoyer à un client abonné une fausse « Transfert confirmé » avec le texte
  et le LIEN de son choix, sur des références qui se devinent en comptant.
  Elle exige maintenant un exploitant, borne le texte, et n'accepte qu'un
  lien vers elatransfer.com. `sw.js` refuse en plus d'ouvrir un lien
  étranger au clic sur une notification (deux défenses).
- **`nouvelle-demande`** croyait le corps reçu : un faux « INSERT » faisait
  partir chez Barbaros une alerte Telegram au texte libre. Elle ne garde plus
  que la référence et **relit la course sur le serveur** — existante, créée
  il y a moins de 15 min, jamais annoncée. **Aucun réglage à changer** : le
  vrai webhook passe à l'identique.
- `test-securite-fonctions.mjs` éprouve les deux, sans Deno ni réseau ;
  six contrôles sur sept tombent sur l'ancien code.
- **Second passage, même jour** :
  - **Le code de la réception est plafonné** : 60 appels par heure et par IP
    dans `courses-hotel`, via le quota serveur du dépôt public. Le compte est
    pris AVANT la comparaison — sinon l'essai gagnant passerait quand même.
    Au-delà : 429, et la page dit « trop d'essais » sans oublier le code.
  - **Plus aucune écriture directe d'`anon` dans `courses`**
    (`20260928120000_courses_sans_depot_anonyme.sql`). Le site publié dépose
    uniquement par `deposer-course` (prix recroisé, quota) ; la vieille
    policy de `SUPABASE.md` laissait écrire une course au prix de son choix.
    **La migration ne part pas toute seule** : workflow « Appliquer une
    migration Supabase », ce fichier. Épreuve SQL en CI, qui repose l'état
    d'origine et exige qu'il laisse passer avant d'exiger le refus.
- **Reste ouvert, à trancher avec Barbaros** : le rôle `agent_reservation`
  n'est limité QUE par l'écran (CSS) — côté serveur `est_exploitant()` lui
  donne tout ; `role_operateur` n'est défini dans aucune migration du dépôt.

## LES DEMANDES ARRIVENT EN 8 SECONDES, PLUS EN 45 — ET LA MINUTE TELEGRAM SE MESURE

29 septembre 2026, Barbaros : « je reçois les demandes sur admin et les
notifications Telegram 1 minute après, c'est trop long ».
- **Le tableau de bord relisait TOUTE la liste (jusqu'à 1000 courses) toutes
  les 45 s** — une demande attendait donc jusqu'à 45 s. Une **sonde** pose
  maintenant toutes les 8 s une question d'une ligne (« dernière référence ? »,
  `nuage.derniere()`), et ne relance la lecture complète que si la réponse
  change. La relecture de fond à 45 s reste : une course modifiée sur un
  autre appareil ne change pas la dernière référence. `test-admin-arrivee`
  exige l'apparition en moins de 15 s ET aucune relecture complète quand
  rien n'arrive ; l'ancien code tombe (« jamais »).
- **Telegram : le code serveur n'a rien de lent**, donc on MESURE avant de
  supposer. `20260929000000_diagnostic_delais_alertes.sql` est en lecture
  seule (à lancer par le workflow des migrations) : pour les 10 dernières
  courses, `depot_s` = clic du client → ligne sur le serveur, `alerte_s` =
  ligne → Telegram envoyé. Il ne sort que références et secondes — le
  journal GitHub est public. Piste la plus probable si `depot_s` est grand :
  le dépôt raté pendant que WhatsApp s'ouvre, retenté au retour du client
  (`reprendreDepot()`).

## LE CENTRE DE CONTRÔLE — LA COMMISSION PAR CANAL

30 septembre 2026, à sa demande : « un tableau qui indique le taux de
commission sur les courses public, site client hôtel, flyer ou prix km… un
vrai centre de contrôle depuis ma page admin », puis « un changement de
commission pour le site public ne doit pas affecter easyHotel… je dois
pouvoir attribuer un montant précis par course ou chauffeur ».
- **Écran `#ecran-controle`**, entrée « Centre de contrôle » du menu, cachée
  à l'agent (`agent-role-ui.mjs`) et retirée des pages publiques
  (`construire-espaces-hotel.mjs`). Quatre blocs : résultats par canal
  (Semaine / Mois / Année / Tout), commission par canal (modifiable),
  commission par chauffeur, tarifs en vigueur (lus dans `GAMMES` et `HOTELS`,
  bouton vers Réglages pour les changer).
- **QUATRE CANAUX** (`canalDe`) : réception (`parReception`), flyer hôtel
  (`provenanceCle`), saisie au téléphone (`canal:"admin"`, posé par « Saisir
  par téléphone »), site public (tout le reste). **Une demande COLLÉE reste
  « site public »** : son message est celui que fabrique le site.
- **L'ORDRE DE LA COMMISSION va du plus précis au plus général** : montant
  posé sur la course, puis taux du chauffeur (carnet, en % OU en € par
  course — `tauxMode`), puis taux du canal. Chaque canal a son propre taux,
  en % ou en € : changer le site public ne touche pas easyHotel.
- **Les taux par canal vivent sur le serveur** (`parametres_commerciaux`,
  clé `commission_canaux`), copiés sur l'appareil (`ela_commission_canaux`).
  Aucune migration : la table accepte toute clé, l'écriture est réservée à
  l'admin depuis `20260929030000_role_agent_serveur.sql`.
- **Un champ de taux vide n'est pas zéro.** Le carnet enregistrait `0` pour
  un champ vide : une vieille fiche à `0` sans unité est donc lue « pas de
  taux », sinon elle masquerait le taux du canal. Une fiche enregistrée
  depuis porte son unité, et son zéro est alors voulu.
- `test-admin-controle.mjs` recalcule les totaux à la main ; il tombe si le
  chauffeur passe après le canal, ou si le vieux `0` masque le canal.

### CE QUE LES CHAUFFEURS DOIVENT — LE GRAND LIVRE DES COMMISSIONS

30 septembre 2026, à sa demande : « un bouton et une alerte qui dit que le
chauffeur doit une commission ou pas… analyse comme un expert ».
- **Le client paie le chauffeur, jamais Elatransfer** : chaque course
  RÉALISÉE crée une dette du chauffeur. Dû = commissions des réalisées ;
  reçu = paiements enregistrés ; reste = la différence (`soldesChauffeurs`).
- **LE SEUL LEVIER EST LA COURSE SUIVANTE.** L'alerte est donc sur le bon, à
  l'instant où l'on saisit le chauffeur (`#bbDette`) : « Mehmet vous doit
  47 €, dont 20 € depuis plus de 30 jours ». Un **seuil** facultatif
  (centre de contrôle, clé serveur `seuil_dette_chauffeur`) BLOQUE
  « Confirmer » au-delà. Vide par défaut : sans lui, on signale seulement.
- **Le retard se compte course par course** : un paiement solde d'abord les
  plus anciennes. Ce qui reste dû sur une course de plus de 30 jours est en
  retard (délai par défaut entre professionnels, L441-10). Le tableau de
  bord ne s'allume (`#bordDettes`) QUE sur un retard.
- **Boutons** : « Paiement reçu » (montant proposé = le reste, date, moyen)
  et « Relancer par WhatsApp » (sur le numéro du chauffeur, avec la liste des
  courses — une relance sans détail appelle une discussion). Un paiement se
  retire en deux appuis.
- **LA COMMISSION SE FIGE AU PASSAGE EN « RÉALISÉE »** (`commissionFigee`,
  dans `majCourse`). Avant, elle était recalculée à chaque affichage :
  changer un taux de canal réécrivait après coup ce que devait un chauffeur
  pour une course déjà faite. Un montant posé sur la course reste modifiable.
  Les courses réalisées avant le 30/09/2026 n'ont pas de valeur figée.
- **Une course réalisée sans aucune règle de commission est signalée**, pas
  comptée à zéro en silence : c'est de l'argent oublié.
- **Les paiements vivent sur l'appareil** (`ela_paiements_chauffeurs`),
  comme le carnet et les factures, et partent dans la sauvegarde (restaurés
  en ajout, par identifiant). Changer de téléphone sans sauvegarde les perd.
- Caché à l'agent. `test-admin-controle.mjs` tombe si la commission n'est
  plus figée ou si le seuil ne bloque plus.

## COMMISSION PAR COURSE, GRAPHIQUE DES CHAUFFEURS, NOTIFICATIONS ELA

29 septembre 2026, à sa demande (« une commission en % ou en € sur chaque
course », « un graphique des courses réalisées par les chauffeurs »).
- **Commission** : `commissionDe(course)` est le seul calcul — celle posée
  sur la course (% ou € fixes, jamais plus que le prix), sinon le taux du
  carnet, sinon celui du canal (centre de contrôle, voir plus haut), sinon
  rien (on ne devine pas un taux). Bon, registre, export CSV
  et facture l'utilisent tous. `test-admin-commission`.
- **Le graphique** suit le choix Semaine / Mois / Année du registre et ne
  compte que les courses réalisées.
- **Les prix modifiables** avaient été écrits une seconde fois, en même
  temps que « UN SEUL TARIF AU KILOMÈTRE » (autre session). Cette seconde
  version a été RETIRÉE avant fusion : deux systèmes de grille pour un
  prix ferme, c'est exactement la faute que ce fichier reproche partout.
- **Deux trous bouchés dans le tarif serveur** (`test-tarifs-serveur`) :
  « Voir mon prix » attend maintenant la lecture (`tarifsLus`, 4 s au plus)
  — un client rapide voyait le prix de repli, mesuré serveur ralenti à
  3,5 s ; et la page du QR easyHotel lit `forfaits_partenaires_publics` —
  ses cartes gardaient les montants écrits en dur pendant que le moteur
  facturait le nouveau.
- **Un bouton de l'espace exploitant se branche TOUJOURS avec une garde
  (`if(el)`)** : la page publique retire ces écrans à la construction, et
  un `getElementById(...).addEventListener` sur un élément absent arrêtait
  tout le script du site client. Trouvé par la suite, pas en relisant.
- **LA CLÉ PUBLIQUE DES NOTIFICATIONS VIENT DU SERVEUR** (fonction
  `cle-notifications`), plus de `CLE_VAPID` écrit dans la page. La paire a
  été fabriquée sur son téléphone et posée dans les secrets ; la lui faire
  recopier a échoué deux fois (il a collé le NOM, puis l'EMPREINTE que
  Supabase affiche — Supabase ne remontre jamais une valeur). Sans réponse
  du serveur on n'abonne PAS avec `CLE_VAPID` : elle ne va plus avec la
  moitié privée, et un abonnement dépareillé paraît marcher sans que rien
  n'arrive. La fonction ne lit jamais `VAPID_PRIVEE` ; une valeur mal
  collée (une empreinte) est refusée en 503. `test-securite-fonctions`,
  `test-admin-push`.
- **Notifications ELA de l'exploitant** : bouton dans Réglages, et un outil
  qui fabrique la paire VAPID DANS son navigateur — la clé privée ne passe
  par aucun serveur ni aucune conversation, il la colle lui-même dans les
  secrets Supabase. Écrire soi-même dans ses secrets a été refusé par la
  sécurité de l'environnement : ne pas retenter.

## LA RÉFÉRENCE EST TIRÉE AU SORT — ET LE N° COURT VIENT DU SERVEUR

La référence `ELA-AA-MM-XXXXX` est tirée au sort sur l'appareil
(`referenceSuivante()`), et elle reste LA clé d'une course. **Ne jamais revenir
à un compteur local** : chaque appareil repartait à 0001 et le serveur
refusait la demande (29/09/2026). Le **N° court** (« N° 1042 », dès 1001) est
attribué par la **base** à l'écriture (`20261006000000_numero_court.sql`),
immuable, et **recopié dans le bon** (`bon.numero`) : c'est là que tout le
monde le lit. Ne pas nommer la colonne dans une lecture, ni passer à
`select=*` (perd le garde-fou de `version`). Histoire : `memoire/reference.md`.

## « ENVOYER MA DEMANDE » NE PARTAIT PLUS — LE CLOISONNEMENT AVAIT EMPORTÉ `telValide`

29 septembre 2026, capture de Barbaros : « je n'arrive pas à envoyer la
demande ». **Mesuré sur le site construit** : le clic levait
`telValide is not defined`, rien ne partait, sans un message. Depuis le
cloisonnement du 28/09 (#246), `construire-espaces-hotel.mjs` retire de la
page publique le bloc de l'espace exploitant — et `telValide` et `telWa`
vivaient dedans, alors que le tunnel client les appelle. **Tout client qui
donnait son numéro était bloqué** ; seul le comptoir identifié par la chambre
passait. `telWa` cassait aussi le bouton « Appeler le chauffeur » du bon
confirmé.
- Les deux fonctions sont sorties **avant** le bloc exploitant, et le vrai
  contrôle a quitté `intake-demande.js` pour **`telephone.js`**, chargé par
  tous les espaces. Le lecteur de demandes, outil de l'exploitant, reste
  retiré des pages publiques : `test-cloisonnement-hotel` l'exige, et c'est
  lui qui a refusé le premier correctif (recharger le lecteur entier).
  `intake-demande.js` appelle `ELA_TEL` : **`telephone.js` doit toujours
  être chargé avant lui**, dans la page comme dans Admin v2.
- **Aucune suite ne pouvait le voir** : elles éprouvent le dépôt, où le bloc
  est présent. `test-easyhotel-client` va maintenant **jusqu'au bout du
  tunnel sur le site construit** et vérifie que toute fonction appelée par
  une page publique y est définie. Éprouvé contre l'ancien code : cinq
  contrôles tombent, dont « telValide is not defined ».

## LE RÔLE AGENT EST IMPOSÉ PAR LE SERVEUR

29 septembre 2026, à sa demande : « valide le rôle agent ». Le diagnostic lu
en production (`20260929020000_diagnostic_role_agent.sql`) : un compte
`admin`, un compte `agent_reservation`, et `est_exploitant()` vraie pour les
deux — l'écran cachait les prix, les réglages, le registre et les factures,
mais un appel direct passait.
- `20260929030000_role_agent_serveur.sql` pose `est_admin()` et réserve à
  l'admin : l'**écriture** des prix, forfaits, réglages et codes promo (la
  lecture reste : le calcul du prix en a besoin), les factures de commission,
  les paiements, les instantanés financiers, l'aperçu et l'émission de
  facture, la restauration de sauvegarde. L'agent garde tout ce qui traite
  une course.
- **Les trois fonctions ne sont pas recopiées** : la migration relit leur
  définition dans la base et n'y change que le verrou.
- `supabase/tests/role-agent.sql` éprouve les deux côtés (agent refusé, admin
  qui passe), en CI. Éprouvé sans la migration, puis sans la policy : il
  tombe les deux fois.
- **L'agent garde TOUT ce qui touche une course**, suppression comprise
  (tranché par Barbaros : « supprimer, créer une course, répondre aux
  clients »). Ce qu'il ne doit pas voir : le chiffre d'affaires, ce que
  rapporte chaque chauffeur, les commissions, le détail financier.
- **LE MASQUAGE D'ÉCRAN NE MARCHAIT PAS DU TOUT, ET PERSONNE NE LE SAVAIT.**
  `agent-role-ui.mjs` cherchait `nuage` et `ouvrirEspace` sur `window` : ils
  vivent dans la portée du script principal, jamais sur `window`. Le script
  sortait à la première ligne, sans erreur — l'agent voyait le registre, les
  factures et les réglages comme l'admin. Mesuré sur le site construit.
  `index.html` expose maintenant `window.ELA_NUAGE` et émet l'événement
  `ela:espace` ; le script s'y branche. `test-admin-commission` joue un
  agent pour de vrai et tombe si l'on retire la prise.
- **Cachés en plus à l'agent** : le bloc « Commission » du bon et le taux du
  carnet. Ce qui est caché n'est pas effacé : enregistrer un bon garde la
  commission posée par l'admin — un contrôle le vérifie.
- **Admin v2 exige maintenant `est_admin()`** : il affiche les finances, et
  l'agent pouvait s'y connecter avec son compte.
- **La limite, dite franchement** : l'agent lit les courses (il doit les
  traiter), donc leurs prix. Un agent déterminé pourrait additionner à la
  main via l'API. Aucun écran ne le fait pour lui, et l'argent (factures,
  paiements, commissions globales) est fermé côté serveur.

## L'ICÔNE SUR L'ÉCRAN D'ACCUEIL — CHAQUE ENTRÉE easyHotel A SON MANIFESTE

29 septembre 2026, à sa demande : poser la page client et la réception en
icône sur un iPhone. **Mesuré avant** : `/easyhotel-reception/` héritait du
manifeste du site client (`start_url: ./`, donc la racine) et en déclarait
DEUX — l'icône aurait rouvert le **site public**, le piège déjà payé sur
l'espace exploitant. `/easyhotel-client/` n'en avait aucun : vignette
générique, ouverte dans Safari.
- Réception : `construire-espaces-hotel.mjs` retire tous les manifestes
  hérités et écrit `site/easyhotel-reception/manifest.webmanifest`
  (démarre sur `/easyhotel-reception/`, nom « Réception »).
- Client : `sites/easyhotel-client/manifest.webmanifest` (nom « easyHotel »).
- **La portée est `/` dans les deux cas** : les cartes du client mènent à
  `/application.html` ; une portée limitée au dossier ferait sortir de
  l'application au premier appui.
- **Chacune a SA couleur** (29/09/2026, à sa demande : « là c'est trop
  moche ») : réception = ELA **orange sur blanc** (`icones/reception-*.png`,
  copié par `construire.sh`), client = ELA **noir sur orange**
  (`sites/easyhotel-client/icon-*.png`). Tailles 32 (onglet d'ordinateur),
  180 (iPhone), 512 (Android). Fabriquées en repeignant la silhouette de
  `brand-logo-white.png`. Aucun logo easyHotel sans leur accord.
- **Même soir, le site public et l'admin ont suivi.** Public : `icon-*.png`
  refaits depuis `brand-logo.webp` découpé par la silhouette (l'ancien
  était un agrandissement flou). Admin : ELA **bleu sur noir**
  (`icones/admin-*.png`, lettres `--ela-blue`, trait `--ela-cyan`), déclaré
  par `manifest-exploitant.webmanifest`, `/ela-admin/`, `admin.html` et
  `/exploitant/`. La règle « les deux manifestes portent les mêmes icônes »
  est tombée à sa demande : elle vaut maintenant DANS chaque espace.
- Une icône posée AVANT cette correction garde l'ancien réglage : la
  supprimer et la refaire. Sur iPhone, l'icône a son propre stockage : la
  réception retape son code une fois dans l'application.
- `test-cloisonnement-hotel` lit le manifeste comme le navigateur et tombe
  sur l'ancien code (« trouvé : 2 »).

## LA RÉCEPTION AFFICHE LE BON, ELLE NE L'ENVOIE PLUS

5 octobre 2026, à la demande de Barbaros (« la réception n'a pas besoin
d'envoyer de bons, on peut juste afficher un bon »). L'histoire de la page —
l'audit du 30/09, la session de 30 jours, la recherche, « Par date », le
statut `annulee` — est dans `memoire/reception.md`.
- **Le bon s'affiche (« Voir le bon »), rien ne part** : ni image, ni
  WhatsApp, ni partage. C'est Elatransfer qui confirme au client.
- **UN SEUL DESSIN : `bon-client.js`**, chargé par la réception et l'admin
  (« Voir le bon du client » sur la fiche), retiré des pages publiques. Les
  deux voient le même bon ; ne jamais en refaire un second.
- **Le nom et le téléphone du client en tête, en gros** — sur un bon AFFICHÉ.
  Le lien `?ok=` ne les porte toujours pas.
- « Prix annoncé » en attente, « Prix ferme » une fois confirmé (CGV art. 3
  et 4) — le bon du site client aussi (`#bonPrixLib`). Course finie au
  comptoir : aucun prix, même s'il arrivait (seconde défense).
- **« Une question ? » sur le bon : le numéro EN CLAIR, Appel, WhatsApp et
  Telegram `@elatransfer`** (donné par Barbaros) — écrits, pas seulement en
  boutons : au comptoir, le client lit l'écran du PC.
- **Après une réservation au comptoir, « À dire au client » : « Votre
  réservation sera confirmée par Elatransfer. »** Il se tait si le dépôt
  échoue — l'écriteau rouge dit alors d'appeler.
- Plus de trois chiffres (sur un PC 1366×768 la 1re course était à y = 723),
  plus d'onglet « Toutes » ; « Passées » s'appelle « Historique », du plus
  récent au plus ancien heure comprise ; « Actualiser » est au-dessus de la
  liste ; « Un imprévu ? » écrit le numéro en clair (un PC ne compose pas).
- **La fenêtre du bon est à `z-index:1000`** : l'en-tête collant de la page
  (100) passait par-dessus, FR/EN et « Fermer » ne recevaient plus le clic.
- `test-reception-bon.mjs` (site construit, 1366×768, admin compris) ;
  `test-nouveau-reception` et `test-easyhotel-client` tournent en CI.

## LES PRIX DU FLYER SE RÈGLENT HÔTEL PAR HÔTEL

29 septembre 2026, à sa demande. Réglages → « Prix du flyer, par hôtel » :
un menu d'hôtel (tous ceux de `HOTELS`), puis un tableau Destination ×
Berline / Van. C'était une liste à plat de quatorze champs.
- **Seuls les prix modifiés partent** (`data-initial` sur chaque champ) ; un
  prix modifié est bleu jusqu'à l'enregistrement.
- **Le défaut que ça a corrigé** : un champ vidé valait `Number("") = 0` et
  passait le contrôle — l'ancien bouton aurait écrit un forfait à **0 €**.
  Un montant vide est maintenant refusé, et le message nomme la ligne.
- Un hôtel absent de `HOTELS` n'apparaît pas : il n'a pas de page sur le
  site. En ajouter un reste un travail de code.
- `test-admin-forfaits.mjs` lit ce qui part au serveur ; il tombe si l'on
  renvoie les quatorze prix à chaque fois.

## ÊTRE ALERTÉ DE CHAQUE DEMANDE — SON, VIBRATION, NOTIFICATION, RAPPEL

30 septembre 2026, à sa demande : « recevoir toutes les courses de tous les
sites en temps et en heure sur admin et Telegram… une alerte sonore,
visuelle, notification, tout ce qui est possible ».
- **MESURÉ AVANT (diagnostic du 29/09, run #10 du workflow des migrations)** :
  clic du client → serveur en 0 à 2 s, serveur → Telegram en 0 à 2 s, sur les
  dix dernières courses. **Le serveur n'est pas lent.** Push était encore
  « indisponible » ce jour-là (clés VAPID pas encore posées).
- **LE BIP DE L'ADMIN NE SONNAIT PROBABLEMENT JAMAIS SUR UN TÉLÉPHONE.** Il
  créait un lecteur de son hors de tout geste ; iPhone et Android le laissent
  suspendu, sans erreur. Un seul lecteur maintenant, débloqué au premier appui
  n'importe où, et un bandeau `#sonCoupe` le dit tant que ce n'est pas fait.
- **L'alarme se répète toutes les 10 s** (quatre notes fortes + vibration
  Android + titre d'onglet qui clignote) jusqu'à un appui sur l'écriteau ou
  l'ouverture d'une course, dix minutes au plus. **Pastille sur l'icône** =
  nombre de demandes en attente (`setAppBadge`).
- **La notification reste affichée** (`requireInteraction`) et vibre (`sw.js`).
- **« Tester mes alertes »** (Réglages) sonne, vibre, notifie, et dit ce qui a
  marché sur CET appareil. L'état des notifications de l'appareil a sa propre
  ligne (`#pushAdminAppareil`) : l'écrire dans `#pushAdminEtat` faisait
  tomber `test-admin-push`, qui attend le résultat de l'appui à cet endroit.
- **RATTRAPAGE ET RAPPEL CÔTÉ SERVEUR** : pg_cron appelle toutes les 20 s
  `nouvelle-demande` avec `{type:"RELANCE"}`
  (`20260930000000_relance_alertes.sql`, schedule `'20 seconds'`). Demande en
  attente depuis plus d'1 min sans AUCUNE alerte réussie → annoncée.
  **La cadence suit l'urgence** (ChatGPT, 30/09/2026, validé par Barbaros,
  puis resserrée le soir même à sa demande : « tout sonne plusieurs fois par
  minute ») : les **10 premières minutes** d'une demande non vue, et tout
  départ dans 30 min ou moins → Telegram ET notification **à chaque tour de
  20 s** (seuil 15 s : pg_cron ne tombe jamais pile) ;
  entre 30 min et 2 h → toutes les 10 min ; plus de 2 h → aucun rappel avant
  H-2. Arrêt dès qu'elle est VUE, confirmée ou refusée. **Telegram ne dit
  jamais à un bot qu'un message est lu** : « vu »
  est donc un GESTE — le bouton « ✅ Vu » sous chaque alerte (fonction
  `telegram-bot`, déployée sans JWT, qui vérifie l'en-tête secret du webhook
  et que l'appui vient de `TELEGRAM_CHAT`), ou la course ouverte dans l'admin
  (`signalerVue()` → RPC `ela_marquer_vue`). Les deux écrivent `vue` au
  journal. Le secret du webhook est dérivé du jeton du bot (SHA-256 de
  « jeton:webhook-ela ») : aucun secret de plus. Le webhook est posé par
  `{type:"INSTALLER_TELEGRAM"}`, appelé par la même migration.
  **LA FENÊTRE DE 6 H SE COMPTE DEPUIS LE DÉPART, PAS DEPUIS LA CRÉATION.**
  Comptée depuis la création, elle écartait toute demande faite plus de 6 h
  avant le départ (un hôtel qui réserve la veille : le cas le plus courant) —
  aucun rappel à H-20 min. Trouvé en relisant le travail de ChatGPT, prouvé
  par un test qui tombait. On lit 7 jours de demandes en attente ; le
  rattrapage d'une demande jamais annoncée garde sa borne de 6 h depuis la
  création. Le son et la vibration de chaque message Telegram sont
  réglés dans Telegram sur son téléphone, pas ici.
  Tout est relu sur le serveur et la cadence vient du journal : l'appeler plus
  souvent n'envoie rien de plus. **La migration ne part pas toute seule** —
  workflow « Appliquer une migration Supabase », ce fichier. Si la base refuse
  `pg_cron` ou `pg_net`, le journal du workflow le dira.
- **WhatsApp ne peut PAS sonner tout seul chez lui** : l'API WhatsApp
  Business exige une vérification d'entreprise et un numéro dédié (voir plus
  haut). Ce qui sonne : Telegram, la notification ELA, et l'admin ouvert.
- **Le code de l'alarme vit dans le bloc exploitant**, retiré des pages
  publiques : un bouton branché ailleurs y appellerait des fonctions absentes
  (`test-easyhotel-client` l'a vu).
- Suites : `test-admin-alertes.mjs` (14), `test-relance-alertes.mjs` (17).
- **ADMIN FERMÉ, CE QUI ARRIVE ENCORE** (30/09/2026, à sa demande : « toujours
  actif même application fermée… aussi sur l'icône »). Une page fermée ne
  tourne plus — aucun site ne peut l'empêcher, ne pas le promettre. Ce qui
  arrive quand même : la notification (serveur → service worker), Telegram,
  et la **pastille chiffrée** : la notification porte `attente` (demandes en
  attente sur 30 jours, compté par `nbAttente()`), que `sw.js` pose sur
  l'icône. Sans nombre (notification d'un client), un simple point.
  `test-relance-alertes` fait tourner `sw.js` pour de vrai et lit la pastille.

## LE SERVEUR EST LA SEULE VÉRITÉ — L'ADMIN N'EST PLUS QU'UNE COPIE

2 octobre 2026, Barbaros : « je valide une course, ça revient ; je refuse,
ça revient ». Le projet démarre le 12, tout doit être fiable le 10.
**La cause n'était pas un bouton, c'était une architecture à deux vérités.**
Le téléphone gardait sa liste, le serveur la sienne. `fusionner` ne faisait
qu'AJOUTER ce que l'appareil ne connaissait pas — une course confirmée sur
l'ordinateur restait « en attente » sur le téléphone pour toujours. Et
`pousser` partait en « on verra » (8 s, pas de reprise, pas de témoin, pas de
`keepalive`) : l'écran disait « refusée », le serveur « en attente », et la
relance Telegram sonnait sur une course qu'il croyait réglée. Un appareil
périmé pouvait même ÉCRASER l'état du serveur (POST merge-duplicates du bon
entier). Se déconnecter ne vidait pas la liste locale : « ça revient ».
- **Migration `20261002000000_courses_version.sql`** : `version` (monte à
  chaque modification, par déclencheur) et `modifie_le` sur `courses`.
  **À appliquer en production AVANT de fusionner** (workflow « Appliquer une
  migration Supabase »). Le site publié avant la migration tenait quand même
  grâce à un repli (`serveurSansVersion`) : un 400 sur la colonne faisait
  retomber la page sur l'ancienne lecture et l'ancien dépôt-ou-mise-à-jour.
  **CE REPLI A ÉTÉ RETIRÉ LE SOIR MÊME, une fois la migration confirmée en
  production** — voir « SEULE MAIN TOUCHE LA PRODUCTION » en fin de fichier.
  Le bloc e) de `test-admin-arrivee` éprouve maintenant l'inverse.
- **`reconcilier()` remplace `fusionner()` pour la lecture serveur** : le
  serveur remplace la copie locale s'il est plus récent (`_v`), une course
  qu'il ne montre plus s'efface ici (seulement si on l'avait lue de lui et
  si la liste n'est pas tronquée à 1000), une course jamais partie d'ici est
  remise en file. `fusionner` reste pour la restauration d'une sauvegarde,
  qui AJOUTE et n'efface jamais.
- **La file d'attente `ela_file`** : `nuage.pousser(bon)` met en file et
  `viderFile()` envoie, une course à la fois, avec reprise (3 s, 6, 12…
  60 s au plus), relancée par la sonde, au retour sur l'onglet et au retour
  du réseau. Elle survit à un rechargement. `keepalive:true` sur les
  écritures : elles survivent au gel de la page quand WhatsApp s'ouvre.
- **On écrit SOUS CONDITION DE VERSION** (`PATCH ?ref=eq.X&version=eq.N`,
  `return=representation`) : zéro ligne rendue = la version a bougé ; on
  relit, **le serveur gagne**, la copie locale est remplacée, et l'écran le
  DIT — sur le tableau de bord (`#bordConflit`) et sur le bon ouvert
  (`#bbModifNote`, amené à l'écran). Une course jamais lue du serveur part
  en POST `ignore-duplicates` : si elle existait déjà, même règle.
  Pourquoi le serveur et pas le dernier geste : le geste perdu a été fait
  sur une information fausse ; mieux vaut le remontrer que d'exécuter un
  refus sur une course déjà confirmée ailleurs.
- **Le témoin `#bordSynchro`** : « N modification(s) en cours d'envoi… »,
  rouge à partir de 30 s, « reconnectez-vous » sans session. Plus jamais un
  écran et un serveur qui se contredisent sans que personne le sache.
- **La sonde demande la course modifiée le plus RÉCEMMENT**
  (`select=ref,version&order=modifie_le.desc`), plus la dernière arrivée :
  un changement fait ailleurs arrive ici en 8 s, plus 45. **Son repère est
  reposé après chaque lecture complète** — sans ça, son premier passage ne
  faisait qu'enregistrer la réponse, et un changement survenu entre
  l'ouverture et ce passage attendait le tour de fond. Trouvé par le test.
- **Les suites qui simulent le serveur** (`test-admin-arrivee`, `-alertes`,
  `-controle`) reconnaissent les deux formes de la sonde.
- `test-admin-arrivee` bloc 4, cinq scènes, toutes contre un faux serveur à
  versions : changée ailleurs → ici en moins de 15 s ; panne → en file, témoin,
  repart seule ; copie périmée → refusée, serveur gagne, écran le dit ;
  supprimée ailleurs → disparaît ; serveur d'avant la migration → lu et écrit
  à l'ancienne. **Éprouvé contre l'ancien code : six contrôles tombent.**
- **PIÈGE DE CAPTURE, QUATRIÈME FOIS** : les premières captures montraient
  l'ANCIEN admin sans témoin — la falsification (`git stash`) avait
  reconstruit `site/` avec l'ancien code, et le `stash pop` ne reconstruit
  rien. `sh construire.sh` avant toute capture, toujours.
- `sw.js` CACHE v120.

## UN CANAL QUI INSISTE, UN CANAL QUI INFORME — LA CADENCE DES ALERTES

2 octobre 2026, Barbaros : « je ne veux pas recevoir trop d'alertes sur
Telegram… des fois je reçois une notification, je ne réponds pas, après ça
passe en mode silencieux ». **Mesuré dans le code** : Telegram partait toutes
les 20 s pendant 10 min, puis toutes les 20 s dès H-30 et **jusqu'à 6 h après
le départ** tant que la course restait « en attente » et non vue — jusqu'à un
millier de messages pour une course oubliée. C'est le téléphone qui coupait le
son, et la vraie demande suivante passait avec.
- **La notification ELA est l'alarme** (elle se REMPLACE sur le téléphone,
  même étiquette) : à chaque tour de 20 s les 10 premières minutes et à H-30
  ou moins, toutes les 10 min entre H-2 et H-30, rien avant H-2.
- **Telegram informe** : +3 min, +10 min, puis toutes les 15 min la première
  heure ; silence jusqu'à H-2 (toutes les 15 min) ; toutes les 5 min sous
  H-30. **Chaque rappel EFFACE le précédent** (`deleteMessage`, identifiant
  gardé dans `journal.detail` sous `message_id=N`) : une seule ligne de
  rappel visible, jamais une pile. L'annonce initiale n'est jamais effacée.
- **À l'heure du départ, un dernier message** (`rappel_final`, `titreFinal`)
  sur les deux canaux, puis plus rien. Une course oubliée se clôt dans
  l'admin, elle ne sonne pas six heures.
- **Les saisies de l'exploitant ne sont ni annoncées ni relancées** (à sa
  demande : « aucune alerte du tout »). Une demande passée par le site porte
  `securite.empreinteDepot`, posée par `deposer-course` ; les siennes
  (« Coller une demande », « Saisir par téléphone ») jamais —
  `saisieExploitant()`. Le webhook INSERT et la relance l'appliquent tous
  deux.
- **Les délais se comptent depuis l'ANNONCE, pas depuis la création** : une
  demande rattrapée 15 min après son dépôt aurait eu son « +3 min » au tour
  suivant. Trouvé par le test.
- **Les heures du bon sont celles de Paris, l'horloge du test est en UTC** :
  deux contrôles sont tombés parce qu'un départ « 14:00 » (12:00 UTC) était
  déjà à H-2 quand le test croyait être loin. Même famille que les fixtures
  SQL datées dans le mauvais fuseau.
- `pg_cron` reste à 20 s : c'est la cadence de l'alarme (notification), la
  cadence Telegram vient du journal.
- **Aucune demande n'est « passée » dans ses 30 premières minutes** : faite
  pour la minute même, elle sonne comme une immédiate (`memoire/preavis.md`).
- `test-relance-alertes` : 61 contrôles ; trois falsifications (règle des
  saisies retirée, effacement retiré, arrêt au départ retiré) tombent en
  nommant le défaut. `test-securite-fonctions` éprouve le webhook sur une
  saisie sans empreinte.

## LE CHIEN DE GARDE, LE DIAGNOSTIC, ET LE QUOTA DE LA RÉCEPTION

2 octobre 2026, même demande : « vérifier que je reçois tout, vraiment comme
un salarié 24-24 ». Ce que je ne peux pas être (je ne tourne pas en continu),
GitHub le fait.
- **`.github/workflows/chien-de-garde.yml`**, toutes les 15 min : lit UNE
  ligne JSON sur le serveur (`.github/scripts/sante-serveur.sql`, lecture
  seule, comptes et secondes seulement — le journal est public), et
  **n'écrit qu'en cas de panne** : demande du site en attente depuis plus de
  2 min sans alerte réussie, relance pg_cron absente ou muette depuis plus de
  5 min, dix passages ratés au quart d'heure, Telegram qui ne refuse QUE des
  envois depuis une heure. Une Issue unique (marqueur), mise à jour tant que
  ça dure, fermée seule au retour à la normale ; jamais Telegram (il n'en
  veut pas plus). **Le juge est à part** (`chien-de-garde.mjs`) et
  éprouvé sans réseau par `test-chien-de-garde.mjs` : une nuit sans demande
  ne doit pas aboyer, une réponse illisible doit aboyer.
- **L'appel à l'API de gestion est copié du workflow des migrations**, qui
  marche en production — on ne devine pas un paramètre d'API qu'on ne peut
  pas vérifier d'ici (« NE DEVINE PLUS JAMAIS »).
- **`20261002010000_diagnostic_fiabilite.sql`** : le même état, lisible,
  pour le 10 octobre — à lancer par le workflow des migrations. Il ne
  modifie rien. Chaque ligne dit ce qu'elle doit valoir.
- **Le quota de `deposer-course` est celui de la réception, pas du wifi** :
  12 dépôts par heure et par IP pour un anonyme ; une réception dont la
  session est vérifiée compte sur `reception|<hôtel>|<heure>`, 60 par heure.
  À l'hôtel, le comptoir et les clients sur le wifi partagent une adresse.
  **Piège rencontré** : `heure` existait déjà dans la fonction (l'heure de la
  course) ; ma variable l'a redéclarée, et c'est le test, pas la relecture,
  qui l'a vu (« Identifier 'heure' has already been declared »).
  `test-securite-fonctions` charge maintenant `deposer-course` (import
  `jsr:` retiré au chargement) et lit la clé de quota envoyée.

## SEULE MAIN TOUCHE LA PRODUCTION — ET LE REPLI « SERVEUR SANS VERSION » EST PARTI

2 octobre 2026, le soir, à sa demande (« fait le comme un expert »), après
la vérification d'avant lancement — le projet démarre le 12. **Ce qui a été
LU en production, pas supposé** : le journal du workflow des migrations
(colonnes `version` et `modifie_le` listées à 18 h 15 ; diagnostic de
fiabilité à 18 h 47 : 12 demandes du site en 7 jours, **0 sans alerte
réussie**, Telegram 16/0, notifications 13 réussies, relance pg_cron active,
dernier passage 19 s), et le journal des déploiements : les 11 fonctions
déployées depuis `main` à 18 h 46.

**LE CORRECTIF « SEULE MAIN DÉPLOIE » DE #283 NE PROTÉGEAIT PAS.** Retirer
une branche de la liste `branches:` ne change que la copie du workflow qui
est sur `main` ; GitHub exécute **la copie présente sur la branche
poussée**. Mesuré sur `git ls-remote` : 45 branches portaient encore une
copie qui déploie depuis la branche mini-van (du 11 septembre), dont la
`prevenir-client` **sans contrôle d'exploitant** — la faille fermée le
28 septembre. Un push sur cette branche, ou un lancement manuel depuis
n'importe laquelle, la remettait en production sans un mot.
- **La protection est le SECRET, pas la liste.** Les trois workflows qui
  portent `SUPABASE_ACCESS_TOKEN` (fonctions, migrations, chien de garde)
  déclarent `environment: production`, et chacun refuse à voix haute toute
  branche autre que `main` à sa première étape. **Ce que seul Barbaros peut
  faire, dans cet ordre** : fusionner, PUIS créer l'environnement
  « production » (Settings → Environments) restreint à `main`, y poser le
  jeton — **en refaire un neuf chez Supabase et révoquer l'ancien**, Supabase
  ne remontre jamais une valeur — et supprimer le secret au niveau du dépôt.
  Fait dans l'autre ordre, les copies de `main` perdraient le jeton avant la
  fusion. Une fois le secret déplacé, toute vieille copie s'arrête à
  « jeton absent ».
  **La branche « mini-van » N'EXISTE PAS** (vérifié le 4 octobre 2026 :
  `git ls-remote` et l'API GitHub rendent tous deux « absente »). Ce sont
  43 vieilles branches qui la NOMMENT dans leur `fonctions.yml`
  (`branches: [main, mini-van]`). Il faudrait donc la recréer pour
  déclencher l'une de ces copies — et même alors, sans jeton hors de
  l'environnement « production », elle s'arrêterait sur « jeton absent ».
  Rien à supprimer.
- **FAIT LE 4 OCTOBRE 2026 VERS 1 h 20**, depuis son iPhone. Nouveau jeton
  Supabase `github-production` (portée : l'organisation Barbaros911,
  préréglage « Full access », **expire le 1er octobre 2027** — à refaire
  avant), rangé dans l'environnement « production » seulement. Les deux
  anciens jetons (« Github », « GitHub ») sont supprimés chez Supabase, le
  secret du dépôt aussi. **Éprouvé après la suppression**, sur `main` :
  chien de garde, migrations (inventaire en lecture seule) et déploiement
  des onze fonctions, tous verts. Supabase propose désormais des jetons à
  droits choisis ; « Read-only » ne déploie rien, et un réglage plus fin
  n'a pas été tenté faute de pouvoir l'éprouver avant.
- **Le chien de garde a mis QUATRE HEURES à tourner seul** : fusionné à
  18 h 05, premier passage planifié à 22 h 08 — et dans l'heure qui a suivi,
  un passage sur quatre seulement. J'avais d'abord accusé l'expression
  `7-59/15` et l'avais réécrite en liste ; mesure faite, elle était juste,
  et la réécriture est retirée : **retoucher le fichier d'un planning peut
  réenclencher ce délai**. GitHub est lent à enregistrer un planning neuf et
  le livre avec retard sous charge — c'est connu, et c'est pour ça que ses
  Issues sont un filet, pas une horloge. **À constater sur 24 h** avant de
  le compter comme régulier, et ses Issues ne servent que si Barbaros reçoit
  les notifications GitHub sur son téléphone.

**LE REPLI `serveurSansVersion` EST RETIRÉ** d'`index.html`. Il avait une
lame : il se déclenchait sur TOUT message d'erreur contenant « 400 » et
repassait l'admin, pour toute la session, en écrasement complet du bon
(`merge-duplicates`) — le défaut même que la version existe pour fermer.
La migration étant confirmée en production, il n'avait plus de raison
d'être. Une colonne absente est désormais une panne AFFICHÉE
(`#bordHorsLigne`, « nuage 400 ») et un geste reste en file, jamais forcé.
Le bloc e) de `test-admin-arrivee` éprouve l'inverse de ce qu'il éprouvait ;
contre l'ancien code, cinq contrôles tombent et nomment le
`merge-duplicates` parti.

**`verifier-production.mjs` SURVEILLE DIX PORTES, PLUS CINQ.** Manquaient :
`application.html` (où mènent les cartes du flyer), `/ela-admin/`,
`/easyhotel-client/`, et la réception sous ses deux adresses. Éprouvé : la
page propre retirée, il tombe en la nommant.

**CE QUI RESTE À FAIRE PAR BARBAROS, ET QUE LE CODE NE PEUT PAS FAIRE** :
- fermer puis rouvrir l'admin sur CHAQUE téléphone et tablette — un onglet
  gardé en mémoire depuis avant 18 h 05 porte l'ancien code, et la base,
  elle, accepte toujours une écriture sans version ;
- la course test de bout en bout (flyer → Telegram → confirmer sur un
  appareil → modifier sur un autre → réception → réaliser → supprimer) :
  rien de la synchronisation par version n'a encore servi sur une vraie
  course ;
- une sauvegarde par semaine : le carnet des chauffeurs, leurs paiements,
  les factures et leur numérotation, l'identité de l'émetteur et le lien
  d'avis ne vivent QUE sur l'appareil. Les réservations, elles, sont toutes
  sur le serveur.
- `sw.js` CACHE v121.

## AUDIT DU 2 OCTOBRE 2026 — CE QUE LA PRODUCTION CONTIENT VRAIMENT

Audit demandé par Barbaros avant l'exploitation du 12. Lecture seule, à
partir des journaux des 17 exécutions du workflow de migration (la seule
trace de ce que la base a reçu), du diagnostic de fiabilité et du chien de
garde. Rapport complet remis dans la conversation ; ici, ce qui doit survivre.

- **LA POLICY ANONYME S'APPELLE « depot client » EN PRODUCTION**, pas « un
  client peut deposer sa demande » comme l'écrivait `SUPABASE.md`. Le `drop
  policy` du 28/09 a donc visé le vide ; le `revoke insert … from anon` de la
  même migration, lui, a été exécuté (29/09, 00 h 26). PostgreSQL vérifie le
  droit sur la table avant les policies : anon ne peut plus écrire, la
  policy est inerte mais reste **affichée** dans le tableau de bord — c'est
  ce que Barbaros voyait comme « encore active ». `20261003000000` la
  supprime par son vrai nom. **APPLIQUÉE LE 3 OCTOBRE 2026 À 16 h 34**
  (workflow des migrations, exécution n° 23), après validation par Barbaros
  des trois parcours réels. Journal lu : il ne reste sur `courses` que les
  quatre policies `authenticated` et aucun droit pour `anon`. Leçon : **on ne droppe pas un nom lu dans une
  doc, on droppe un nom lu dans `pg_policies`** — le diagnostic du 15/09
  l'avait sous les yeux.
  **L'épreuve SQL avait le même défaut, et c'est pour ça que rien ne l'a vu**
  (3 octobre 2026, Issue #190). `courses-sans-anon.sql` reposait la policy
  sous le nom de la doc — celui que la migration du 28/09 droppait — et
  passait donc au vert sur un drop qui, en production, visait le vide. Elle
  repose maintenant « depot client », enchaîne les deux migrations, et
  vérifie séparément la policy et le droit sur la table. Éprouvé sur un
  PostgreSQL local : sans la migration du 03/10 elle tombe en nommant
  « depot client » ; avec un `grant insert … to anon` rendu, elle tombe aussi.
  **Une épreuve qui repose l'état qu'on imagine éprouve la doc, pas la base.**
- **AUCUN REGISTRE DES MIGRATIONS.** Le workflow exécute du SQL brut par
  l'API de gestion et n'écrit rien dans `schema_migrations`. Sur 29 fichiers,
  12 sont passés par lui ; 17 ont été collés dans l'éditeur SQL, et des
  objets vivent en production sans migration (`courses`, `abonnements`,
  `presence_operateurs`, `role_operateur`, `signaler_presence`,
  `presences_operateurs`, le webhook INSERT → nouvelle-demande).
  `20261003010000_inventaire_schema.sql` liste le schéma réel en lecture
  seule, sans donnée ni argument de déclencheur : **le lancer avant d'écrire
  une migration qui touche un objet existant.**
- **DEUX MIGRATIONS NE DOIVENT PLUS JAMAIS ÊTRE REJOUÉES** :
  `20260916100000_current_tariff_source.sql` (upsert des forfaits) et
  `20260928120000_tarif_unifie.sql` (UPDATE du tarif au kilomètre). Depuis
  que les prix se règlent depuis l'admin (Réglages → Tarifs, Prix du flyer),
  les rejouer **écraserait** ce que Barbaros a réglé, sans un mot.
  `20260916070000_stripe_test_manual_capture.sql` crée ses policies sans
  `drop` préalable : rejouée, elle échoue, ce qui est sans dégât.
  `20261004000000_minimum_berline_35.sql`, elle, se rejoue sans danger :
  elle n'écrit que si la ligne porte encore la valeur du 28 septembre à
  l'identique. **Toute future migration de tarif doit suivre cette forme
  conditionnelle**, ou rejoindre la liste des deux ci-dessus.
- **SEULE `main` PUBLIE, DÉPLOIE ET MIGRE.** `pages.yml`, `fonctions.yml` et
  `migrations.yml` acceptaient `workflow_dispatch` sur n'importe quelle
  branche — les migrations ont été lancées depuis une branche le 15/09. Les
  trois jobs portent `if: github.ref == 'refs/heads/main'`. Un diagnostic se
  fusionne d'abord, se lance ensuite.
- **LE QUOTA DES CLIENTS DU QR EST TRANCHÉ** (3 octobre 2026, Barbaros :
  « la 2 »). Le plafond anonyme de 12 dépôts par heure et par adresse IP
  valait aussi pour les clients qui scannent le flyer sur le **wifi de
  l'hôtel**, qui partagent l'adresse de la box : le treizième lisait « non
  transmise » et personne n'était alerté. Une demande qui porte la clé d'un
  partenaire **réel** — vérifiée dans `partenaires`, jamais crue sur parole,
  sinon chaque clé inventée serait un compteur neuf — compte désormais sur sa
  propre clé « hôtel + adresse + heure », plafonnée à **30**. La réception
  garde ses 60 par session ; l'anonyme ordinaire ses 12. Un attaquant qui
  connaît la clé de l'hôtel (elle est dans les liens du QR) gagne 30 au lieu
  de 12, rien de plus. Quatre contrôles dans `test-securite-fonctions`.
- **LA CLÉ DU WEBHOOK SE LIT D'ICI, SANS L'AFFICHER** (3 octobre 2026,
  Barbaros : « regarde toi-même »). L'en-tête d'autorisation du webhook sur
  `courses` (créé dans le tableau de bord) doit porter la clé publique, pas
  une clé service_role. `20261003020000_diagnostic_webhook_autorisation.sql`
  lit la définition des déclencheurs `http_request` et **classe** l'en-tête
  — publique, secrète, ou jeton JWT avec son rôle — sans jamais sortir la
  valeur, le journal GitHub étant public. Le rôle se lit dans la partie
  centrale du jeton, qui est du JSON encodé, pas chiffré.
  - **`analyse` EST UN MOT RÉSERVÉ DE POSTGRESQL** (l'orthographe britannique
    d'`ANALYZE`) : le premier jet nommait ainsi une CTE, et la base l'a
    refusé en production — après une fusion, donc une PR de plus à faire
    relire. **Un SQL de diagnostic s'éprouve AVANT d'être poussé, et c'est
    possible ici** : cette machine a PostgreSQL 16 complet dans
    `/usr/lib/postgresql/16/bin` (`initdb`, `postgres`, `psql`), à lancer
    sous l'utilisateur `postgres` dans `/tmp` — le bac à sable n'est pas
    traversable par cet utilisateur. La PR #285 affirmait « pas de serveur
    PostgreSQL sur la machine de travail » : c'était faux, personne n'avait
    regardé. Éprouvé ensuite sur six déclencheurs factices (anon,
    service_role, `sb_publishable_`, `sb_secret_`, sans en-tête, et un
    déclencheur ordinaire qui ne doit pas apparaître) : la version de `main`
    rend mot pour mot l'erreur de la CI, la version corrigée classe les cinq
    webhooks et ignore le sixième.
  - **VERDICT RENDU LE 3 OCTOBRE 2026 : LE WEBHOOK PORTAIT UN JETON
    `service_role`.** Un seul webhook, `nouvelle-demande` sur `courses`,
    sans en-tête `apikey`. Rien ne l'avait montré dans un journal public
    (aucun diagnostic antérieur ne lisait les déclencheurs) : pas de
    rotation forcée. Barbaros : « fais-le pour moi » —
    `20261003030000_webhook_cle_publique.sql` relit la définition du
    déclencheur, remplace la valeur d'`Authorization` par la clé publique,
    ajoute `apikey` avec la même clé (les deux en-têtes que la relance
    pg_cron envoie depuis le 30/09, combinaison éprouvée en production — la
    fonction lit la base avec ses propres droits, jamais avec l'en-tête
    reçu), et rejoue la définition en `CREATE OR REPLACE TRIGGER`. Elle
    **refuse** s'il y a zéro ou plusieurs webhooks sur `courses`, ou si
    l'en-tête n'est pas « Bearer <jeton JWT> » ; rejouée, elle constate et
    ne fait rien ; elle n'affiche jamais l'ancienne définition. Éprouvée
    sur le PostgreSQL local : cas réel, rejouée, déclencheur qui tire
    encore, deux refus, `apikey` déjà présente — six scènes.
- **LE VRAI BLOQUANT EST ADMINISTRATIF** : SIRET, RC Pro de la centrale,
  déclaration d'activité au ministère des transports (L3142-2, preuve
  d'immatriculation + attestation RC, par mail, valable un an), papiers des
  chauffeurs dans le carnet, médiateur sous 30 jours. Rien de tout cela ne se
  code.

## « TERMINÉE » DEMANDE DEUX APPUIS AVANT L'HEURE, ET « SANS CHAUFFEUR » SE VOIT

3 octobre 2026, audit de l'admin puis décisions de Barbaros : « seconde appui »
avant l'heure de départ, et une course saisie au téléphone sans chauffeur reste
confirmée. **Il n'y a pas d'agent de réservation pour l'instant** : il travaille
seul.
- **« Terminée » fermait une course À VENIR d'un seul appui**, collé à
  « Appeler », sans retour possible : elle quittait « À assurer », la réception
  lisait « Effectuée », et personne ne la conduisait. Avant l'heure de départ
  (`departPasse()`), le premier appui arme (« Confirmer la fin », en ambre) et le
  second ferme ; moins de 700 ms entre les deux ne compte pas. Après l'heure, un
  appui suffit : c'est le geste du soir. Même règle sur la fiche, pour
  « Marquer comme réalisée ».
- **UN DOUBLE APPUI FERMAIT DEUX COURSES.** Mesuré sur l'ancien code : la carte
  fermée disparaît, la page se raccourcit, et le second appui tombe sur le
  « Terminée » d'une autre course. L'audit l'avait d'abord déclaré réfuté sur UN
  rejeu : un rejeu dans une seule mise en page ne prouve rien sur les autres.
  Garde globale : pendant 700 ms après une fermeture, la liste ne répond plus
  (« Terminée », carte, « Appeler »), et c'est vrai aussi au retour de la fiche
  après « Marquer comme réalisée ».
- **L'ARMEMENT EST GARDÉ HORS DU BOUTON** (`cloreArme`) : la liste se redessine
  seule (sonde de 8 s, relecture de 45 s), et un « Confirmer la fin » gardé sur
  le bouton redevenait « Terminée » sous le doigt — le second appui ré-armait au
  lieu de fermer. Une seule course armée à la fois, 5 secondes.
- **« Remettre en confirmée »** sur la fiche d'une course réalisée, en deux
  appuis espacés d'au moins 700 ms. La commission figée est levée et se refige à la vraie fin. Une course
  déjà facturée (`factureNum`) ne se rouvre pas : sa facture est émise.
- **« Sans chauffeur »** : une course confirmée sans nom de chauffeur porte une
  pastille ambre sur sa carte, À CÔTÉ de la référence et jamais dedans —
  `.d-ref` se lit comme la référence seule, et `test-nouveau-exploitant` est
  tombé le jour où la pastille y a été posée, et un écriteau en tête du tableau de bord la
  compte et emmène aux courses à assurer. Les autres cartes confirmées ou
  réalisées portent le nom du chauffeur. L'ambre n'est ni le rouge de l'attente
  ni l'orange d'un partenaire.
- **« Prévenir le client » attend un chauffeur** : caché tant qu'aucun nom n'est
  saisi, il apparaît dès qu'on le tape, et il ENREGISTRE le chauffeur avant
  d'écrire, avec le même contrôle que « Confirmer » (papiers, dette).
- **Ce qui reste ouvert** : la relance serveur ne vise que les demandes en
  attente, donc une course confirmée sans chauffeur n'envoie aucun rappel.
  L'écriteau est le seul filet ; un rappel serveur deux heures avant le départ
  reste à décider. Et le téléphone d'un CLIENT cesse d'interroger le serveur
  sur une course réalisée : une course rouverte par erreur y reste
  « Terminé » — c'est l'exploitant qui le prévient.
- **Deux gardes ont été écrites puis retirées, parce qu'aucune mesure ne les
  justifiait** : mesuré, le bouton « Marquer comme réalisée » d'une course
  rouverte apparaît HORS de l'écran, pas sous le doigt. Un contrôle qui ne
  peut pas tomber ne vérifie rien ; une garde qui ne protège de rien non plus.
- `test-admin-cloture.mjs`, sur le site construit. Éprouvée contre l'ancien
  code : 16 contrôles tombent, dont le double appui qui ferme deux courses ;
  contre le premier correctif, 5 (pastille dans la référence, armement perdu
  au redessin, double appui qui rouvre).
  `test-admin-controle.mjs` pose désormais sa course QQQQ6 à minuit : sinon le
  second appui s'appliquait selon l'heure de la journée.

## ADMIN V2 N'EST PLUS PUBLIÉ

3 octobre 2026, Barbaros : « retire ». Il travaille seul, dans l'admin
historique ; Admin v2 en ligne n'était qu'une seconde porte vers les données
des clients et une seconde adresse où se tromper d'outil.
- **Retiré de la PUBLICATION, pas du dépôt.** `construire.sh` supprime
  `admin-v2-*.js` et `admin-v2-responsive.css` de `site/` et remplace
  `admin-v2.html` par une copie d'`admin.html` : une icône posée ou un lien
  gardé ramène à `/ela-admin/` (paramètres compris), jamais un 404.
- **LE RETRAIT EST LA RÈGLE PAR DÉFAUT, ET LE PREMIER JET L'AVAIT À
  L'ENVERS.** Il fallait POSER un drapeau pour retirer (`ELA_PUBLICATION=1`,
  dans `pages.yml`). La demande de fusion #294 a montré un contrôle
  « Workers Builds: as-mine » : **Cloudflare construit et déploie ce dépôt**,
  avec une commande réglée dans SON tableau de bord, invisible d'ici — et
  `elatransfer.com` résout vers des adresses Cloudflare (`2606:4700:…`,
  mesuré). Admin v2 serait resté en ligne sur le vrai domaine, sans un mot.
  Désormais **toute construction le retire** ; seul `ELA_AVEC_ADMIN_V2=1`
  le garde, et il n'est posé que par les suites qui l'éprouvent (huit
  `test-admin-*`, `capture-admin-165.mjs`) et par les quatre contrôles
  automatiques qui le lisent dans `site/`. **Un oubli ne peut plus que
  retirer, jamais publier.** `test-doc.mjs` vérifie que la recette retire
  par défaut et qu'aucune configuration de publication (`pages.yml`,
  `wrangler.jsonc`, la commande de `CLOUDFLARE.md`) ne pose le drapeau ;
  chaque contrôle tombe seul quand on le casse.
- **LES NOTES « CLOUDFLARE RESTE BLOQUÉ » PLUS HAUT SONT PÉRIMÉES** sur un
  point au moins : un projet Workers « as-mine » construit le dépôt. Ce que
  je n'ai PAS pu mesurer d'ici : si le domaine est servi par ce Worker ou
  par GitHub Pages derrière le proxy Cloudflare. La règle par défaut tient
  dans les deux cas — c'est pour ça qu'elle a été choisie.
- **Le code et ses suites restent**, et tournent avec le drapeau : ils
  portent la tarification serveur, les partenaires, la règle des papiers
  imposée par le serveur, et des fichiers PARTAGÉS avec l'admin retenu
  (`intake-demande.js`, `qr-affiche.js`, `itineraire-partage.js`). Le jour où
  il le redemande, rien n'est à réécrire.
- La régression visuelle capture désormais l'admin retenu (`/ela-admin/`)
  au lieu d'Admin v2.
- `verifier-production.mjs` exige désormais que `/admin-v2.html` serve la
  redirection (titre « Espace exploitant ») : construit avec
  `ELA_AVEC_ADMIN_V2=1`, il tombe en nommant la page — mesuré.
- **Les migrations et les fonctions qu'Admin v2 utilise restent en
  production** : elles ne s'appellent qu'avec une session exploitant. Ce que
  le retrait coûte, il faut le dire : l'admin retenu n'appelle pas
  `ela_attribuer_chauffeur`, donc la règle des papiers n'y est qu'un
  AVERTISSEMENT d'écran (et plus un refus depuis le 4 octobre 2026, à sa
  demande), pas une frontière serveur.


## QUI SOMMES-NOUS — LE MODÈLE DIT EN CLAIR

5 octobre 2026, à sa demande. Le site ne disait nulle part ce qu'est
Elatransfer : un bloc `#modele` après « Nos services » le dit (titre « Vous
réservez, nous organisons tout. », trois étapes, « Une demande
particulière ? » vers un devis par e-mail, encart hôtels/agences/entreprises).
- **Le premier écran reste au client qui réserve.** Sous le formulaire, une
  seule ligne (`.pro-bloc`) mène au bloc ; le pavé de 70 mots est retiré.
- **« Chauffeur professionnel », jamais « taxi » ni « VTC »** sur une page
  client : vrai pour les deux, et « taxi » fait attendre un compteur à côté
  d'un prix ferme. L'exactitude va aux mentions légales.
- **« Mise en place gratuite » n'est vrai que si l'hôtel ne paie rien.** Le
  jour où il facture une installation ou un abonnement, retirer la ligne.
- Aucun client cité (pas d'accord écrit), aucun chiffre, aucun délai promis.
- `contact@elatransfer.com` est sur « Nous joindre » (devis, partenariats).
- Histoire de l'ancien emplacement : `memoire/accueil-pro.md`.

## L'ADMIN SANS RÉSEAU, LA FILE QUI NE PERD RIEN, LE RAPPEL DE SAUVEGARDE

4 octobre 2026, suite de l'audit de l'admin, à sa demande (« oui » à
l'ouverture sans réseau). Ce que le lot change, et pourquoi.
- **UNE PANNE N'EST PLUS UN REFUS.** Au chargement, le serveur revalide
  l'accès (`est_exploitant`). Une coupure valait « non » : la session était
  effacée et l'écran de connexion cachait jusqu'aux courses gardées sur le
  téléphone — dans un parking d'aéroport, à 5 h. `nuage.verifierExploitant()`
  rend maintenant **trois** réponses : « oui », « non » (le serveur a dit
  faux, 401/403, ou il a refusé de renouveler la session) et « panne » (tout
  le reste). Sur « panne », la session est gardée ; l'espace s'ouvre en
  lecture locale **seulement si ce compte a déjà été reconnu par le serveur
  sur CET appareil** (`ela_acces_verifie` = l'identifiant du compte, jamais
  un secret) — sinon un compte quelconque connecté pendant une panne verrait
  les courses du téléphone. On revérifie toutes les 15 s, au retour du réseau
  et de l'onglet ; un refus arrivé plus tard referme l'espace.
- **`rafraichir()` distingue aussi les deux** : 400/401/403 effacent la
  session, une erreur 5xx ou un délai (8 s) la gardent. Deux appels
  simultanés partagent un seul renouvellement — deux échanges du même jeton
  de renouvellement, et Supabase peut révoquer le second.
- **LE RÔLE AGENT TIENT HORS LIGNE** (`ela_role_connu`, rattaché au compte) :
  sans réseau, `agent-role-ui.mjs` appliquait les droits d'admin à l'agent.
- **UNE MODIFICATION FAITE PENDANT UN ENVOI N'EST PLUS PERDUE.** La file
  retirait la course à la réponse de l'envoi précédent, même si une nouvelle
  modification était arrivée pendant le trajet. Chaque entrée porte un
  compteur (`gen`) : on ne la retire que s'il n'a pas bougé.
- **« Retour » n'écrit que ce qui a changé**, et un chauffeur saisi sur une
  course déjà confirmée passe par le **même contrôle que « Confirmer »**
  (`refusAttribution`) — avant, le bouton « Retour » attribuait sans aucun
  contrôle. Même contrôle sur « Prévenir le client » et sur « Saisir par
  téléphone ».
- **LES PAPIERS NE BLOQUENT PLUS, ILS AVERTISSENT** (le même jour, Barbaros :
  « ne fais pas bloquer les chauffeurs liés aux papiers »). Le refus sur un
  papier périmé — posé le 30/09 sur « Confirmer », étendu le matin même aux
  trois autres portes — est retiré de `refusAttribution`. Il ne reste que le
  seuil de dette, facultatif et vide par défaut. L'avertissement rouge du bon
  (`jugerChauffeurBon`) reste : c'est lui qui l'informe, et c'est lui qui
  décide. Trois suites éprouvent maintenant que le chauffeur PASSE et que
  l'avertissement est visible ; le refus remis, elles tombent.
- **UN NUMÉRO DU CARNET DONNE LE NOM** (`completerChauffeur`) : avant, un
  chauffeur saisi par son seul numéro restait « Sans chauffeur » sur la
  carte et le bon proposait de « Placer au groupe » une course attribuée.
- **LE RAPPEL DE SAUVEGARDE EST SUR LE TÉLÉPHONE** (`#bordSauvegarde`) : il
  apparaît sur le tableau de bord quand l'appareil porte un carnet, des
  factures ou des paiements, et que la dernière sauvegarde a 7 jours ou n'a
  jamais été faite. Ce sont les seules données qui ne vivent pas sur le
  serveur. La sauvegarde emporte désormais le lien d'avis, et la
  restauration rend l'identité de l'émetteur et ce lien **sans écraser** ce
  qui est déjà saisi.
- **L'ADMIN RETENU A SA CI** (`.github/workflows/admin-regression.yml`) :
  toute suite `test-admin-*` qui ne demande pas Admin v2, plus cinq
  `test-nouveau-*` de l'espace exploitant. Avant, sept des neuf suites en CI
  éprouvaient Admin v2, retiré de la publication.
- **Mise en page des cartes à 320–390 px** : la référence et le prix tiennent
  sur une ligne, la pastille du chauffeur passe dessous, et « Confirmer la
  fin » ne pousse plus « Appeler » hors de la carte. **Armée, la ligne du bas
  ne porte que les deux boutons** : la pastille de l'hôtel tombait à « e… »
  et l'état à « C… » — vu sur les captures, pas en relisant.
- **SANS RÉSEAU, LA PASTILLE DE L'EN-TÊTE DISAIT « SERVEUR CONNECTÉ » EN
  VERT**, à côté du bandeau « Pas de réseau » — effet direct de la session
  désormais gardée pendant une coupure. Trouvé sur les captures. Pastille,
  phrase du bloc « Serveur » et bandeau sont maintenant écrits au même
  endroit (`jugerReception`) : « Serveur connecté », « Pas de réseau » ou
  « Serveur injoignable ». Le bouton « Se connecter au serveur » du bandeau
  ne s'affiche plus quand la session existe : ce n'est pas un mot de passe
  qui manque.
- Suites : `test-admin-hors-ligne`, `test-admin-envoi`, `test-admin-audit`,
  toutes sur le site construit. Contre l'ancien code : 23, 6 et 15 contrôles
  tombent.
- **LE LANCEUR ÉPROUVAIT PEUT-ÊTRE UNE AUTRE COPIE DU SITE.** Un serveur
  trouvé ouvert sur 8099, enraciné sur une ancienne copie de travail,
  répondait 200 : `tests.sh` le réutilisait sans regarder. Il compare
  maintenant la page servie à `index.html` et refuse de démarrer sinon
  (éprouvé avec un serveur posé sur l'ancien code). Le serveur restait ouvert
  parce que `npx` le lance en ENFANT : la fin de série arrête aussi ses
  enfants (`pkill -P`). Et pour fermer un serveur à la main, viser son
  numéro, jamais `pgrep -f "http.server"` : le motif attrape aussi la
  commande qui le tape — vu une fois de plus ce jour-là.
- **Le chien de garde qui ne passe que six fois en 21 h (P1-10) est
  tranché** : un voyant dans l'admin. Voir la section suivante.

## LE VOYANT DES ALERTES DANS L'ADMIN

4 octobre 2026, Barbaros : « Ok voyant ». Le chien de garde GitHub devait
vérifier toutes les 15 min que les alertes partent ; GitHub ne le réveillait
que 6 fois en 21 h. Deux solutions lui ont été montrées : un réveil extérieur
(un compte de plus, une clé GitHub à confier) ou un voyant dans l'admin. Il a
choisi le voyant, après avoir demandé si une panne d'alerte lui ferait perdre
des courses : **non, la course arrive toujours sur le serveur et dans
l'admin, seule la sonnerie s'arrête**. C'est la phrase que dit le bandeau.

- **Sous « Serveur connecté », une ligne : « Alertes OK », « Alertes en
  panne » ou « Alertes : non vérifiées »** (`#adminAlertes`). En panne, un
  bandeau rouge sur le tableau de bord (`#bordAlertes`) dit LAQUELLE et le
  geste qui reste : garder l'écran ouvert, il sonne tout seul.
- **UN SEUL JUGE** : `admin-sante.js`, chargé par l'admin et importé par
  `chien-de-garde.mjs`. Deux juges finiraient par se contredire — un voyant
  vert pendant que l'Issue crie. Il rend deux phrases par panne, écrites à la
  même ligne de décision : la précise pour l'Issue, la simple pour l'admin.
- **UNE SEULE MESURE** : `ela_sante_alertes()` (migration
  `20261004010000_sante_alertes.sql`) rend les sept mesures de
  `sante-serveur.sql`, au caractère près — `test-chien-de-garde.mjs` compare
  les deux textes. Elle est réservée à un exploitant connecté ; la mesure
  elle-même (`ela_sante_mesures`) n'est accordée à personne.
- **LE GRIS N'EST PAS UN DÉTAIL.** Vert = mesure lue il y a moins de 3 min,
  et saine. Rouge = mesure lue, et une alerte ne part plus. Gris = on ne sait
  pas : sans session, sans réseau, fonction pas encore installée, réponse
  illisible, mesure trop vieille. **On ne garde jamais un ancien vert** : un
  vert qui n'a rien mesuré est pire que pas de voyant. Une réponse illisible
  est grise, pas rouge.
- **Il se mesure au rythme de la relecture du serveur, pas de la sonde** :
  au plus une fois toutes les 40 s, jamais onglet caché ni hors de l'espace.
- **LA MIGRATION EST APPLIQUÉE EN PRODUCTION** (4 octobre 2026 à 04 h 17,
  workflow « Appliquer une migration Supabase », exécution n° 26, réponse
  201), juste après la fusion de #305 ; Barbaros a vu « Alertes OK » en
  rouvrant l'admin. Si elle disparaissait un jour, le voyant redeviendrait
  gris (« non vérifiées ») : il ne prétend rien.
- **Le chien de garde GitHub reste** : quand il passe, il ouvre une Issue.
  Le voyant ne le remplace pas, il couvre les heures où GitHub dort.
- `test-admin-voyant.mjs` (52 contrôles, site construit),
  `supabase/tests/sante-alertes*.sql` (CI, vrai PostgreSQL).

### CE QUE LA RELECTURE A TROUVÉ AVANT LA PUBLICATION

Une relecture indépendante en quatre angles, chaque constat reproduit par un
second relecteur avant d'être corrigé. Tout est réparé ; ce qui suit est la
mémoire de POURQUOI c'est écrit ainsi.
- **« VU » N'EST PAS UN ENVOI.** Ouvrir une course dans l'admin
  (`ela_marquer_vue`) ou appuyer sur « Vu » dans Telegram écrit au journal
  canal `telegram`, statut `envoye`, type `vue`. Compté comme un envoi
  réussi, il faisait passer le voyant au VERT pendant une panne de
  Telegram — le geste même qu'on fait en regardant l'admin. Le chien de
  garde avait le même angle mort depuis le 2 octobre.
- **« indisponible » EST UN ÉCHEC** : c'est ce que journalise un secret
  Telegram absent ou mal nommé. Non compté, Telegram non configuré donnait
  « Alertes OK ».
- **L'ÉPREUVE SQL POSE LES PRIVILÈGES PAR DÉFAUT DE SUPABASE.** Un PostgreSQL
  nu n'accorde l'exécution qu'à PUBLIC ; Supabase l'accorde à `anon` et
  `authenticated`. Sans cette ligne, une migration qui n'ôterait que PUBLIC
  passait l'épreuve et un anonyme lisait les mesures en production.
- **UNE COMPARAISON AVEC NULL NE TOMBE JAMAIS** — `null not between 5 and
  60` vaut NULL. Même famille que `<>` sur une valeur NULL, déjà consignée.
- **LE BANDEAU REMPLACE « Son des alertes coupé »** quand les deux
  s'affichent : empilés, ils faisaient sortir de l'écran (390 × 844) la
  demande en attente qu'ils disent de surveiller. Il dit la PREMIÈRE panne
  et le nombre des autres ; la liste entière reste sur le voyant.
- **IL N'EST RÉÉCRIT QUE S'IL CHANGE** : c'est une région « alert », un
  lecteur d'écran relisait la même panne trois fois par minute.
- **UN ANCIEN VERDICT NE REVIENT PAS** après une coupure ou une
  reconnexion : il est oublié dès que le voyant passe au gris faute de
  session ou de serveur, et la prochaine relecture mesure aussitôt.
- **UNE SESSION PERDUE PENDANT LA SONDE SE DIT** (`sessionPerdue()`). Défaut
  antérieur au voyant : un mot de passe changé sur un autre appareil
  arrêtait l'écoute, et la pastille restait « Serveur connecté ».
- **L'EN-TÊTE NE SAUTE PLUS** : la ligne du voyant garde la largeur de son
  état le plus long.
- Contre le code d'avant ces corrections, 18 des 52 contrôles tombent ; neuf
  falsifications de la fonction serveur tombent toutes.
- **Les commentaires de l'admin et de la réception publiés** : constatés
  pendant ce travail, retirés ensuite à sa décision — voir « LES
  COMMENTAIRES DE TRAVAIL NE PARTENT PLUS EN LIGNE ».

## LE SITE SE PRÉSENTE PAR SA MARQUE — « Elatransfer », PARTOUT

5 octobre 2026, Barbaros : « Elatransfer partout ». Un mot, un E majuscule,
dans tout texte publié — titres, pages, admin, réception, manifestes, CGV.
Le LOGO (image, et le mot-symbole « ELA TRANSFER » de l'affiche hôtel) ne
change pas. Le titre mène avec la marque, puis dit ce qu'elle vend ; le
dépôt et `seo-ela.mjs` disent la même chose (`test-nouveau-bascule`).
- **Le site public s'ouvre en français pour tout le monde** : le robot de
  Google se présente en anglais américain et lisait l'accueil en anglais
  sous un titre français. L'anglais est à un appui et se mémorise. **Pas de
  `hreflang`** tant que l'anglais n'a pas sa propre adresse. Les pages
  d'hôtel (non indexées) gardent la détection : le flyer est scanné par des
  voyageurs étrangers.
- **Aucun lien public ne mène à `/application.html`** : c'est la page du
  FLYER easyHotel (espace « hotel-client »). Les pages du sitemap réservent
  vers `/?aeroport=…`. `test-nouveau-bascule` y appuie, sur le site construit.
- `verifier-production.mjs` reconnaît une porte à son `data-ela-space`, plus
  à la marque seule, qui est désormais partout.
- L'histoire (titre du 4 octobre, Issue #300, aperçus en double) :
  `memoire/marque-et-referencement.md`.

## GOOGLE — UNE SEULE ENTREPRISE, ET DES PAGES DE SERVICE LIÉES

- **Search Console** : propriété « domaine » du compte Google
  **orucburak001**, pas `contact@`. Au 5/10/2026 : 4 pages au plan, 2
  indexées ; CDG et Orly, que l'accueil ne liait pas, sont liées depuis son
  pied et enrichies (faits du site et des CGV, aucun prix ni avis).
- **Un seul graphe de données structurées**, dans `index.html`
  (Organization `#organisation`, WebSite, Service) ; `seo-ela.mjs` n'en
  ajoute plus, les pages de service désignent `#organisation`. Jamais
  « VTC », jamais `LocalBusiness` sans adresse réelle.
- Leurs réponses sont celles de l'accueil, mot pour mot : en changer une
  veut dire changer les deux (`test-nouveau-bascule`).

## LE MOTEUR DE RECHERCHE DE LIEUX — FAIRE ÉVOLUER, PAS REFAIRE

4 octobre 2026, mission « moteur 10/10 ». On garde BAN + Photon.
**MAPBOX SEARCH BOX N'EST PAS BRANCHÉ, C'EST UNE DÉCISION** : ses résultats
sont « temporaires » (une réservation doit GARDER le lieu ; l'offre permanente
ne couvre pas les lieux), ils doivent s'afficher sur une carte Mapbox, et il
faut une carte bancaire. Conditions lues dans des citations, pas sur leur
texte (mapbox.com est bloqué d'ici) : à relire avant de rouvrir le sujet.
- **Une panne n'est plus mise en cache** comme « aucune adresse » ; la liste
  dit « Recherche momentanément indisponible » (`liste.echec`).
- **L'admin choisit ses lieux** : `crDepart`/`crArrivee` passent par le même
  `brancher()` que le site. Un texte tapé sans choisir est résolu au premier
  résultat, et l'écran dit « Adresse prise d'office : vérifiez-la ».
- **Lieu structuré** `course.departLieu`/`arriveeLieu` (`lieuStructure()`,
  depuis un élément CHOISI) : nom, adresse, coordonnées, `provider`
  (`ban`/`photon`/`elatransfer`). Les champs texte restent ce qui s'affiche.
  `deposer-course` les garde (il jetait `departPos`), bornés, facultatifs.
  « Modifier la course » efface le lieu d'une adresse retapée.
- Fautes de frappe (`motProche`, `cleProche` sur 6 lettres et plus : « tilly »
  ne doit pas proposer Beauvais-Tillé) ; un nom distinctif (« novotel »)
  passe devant les terminaux ; biais selon le contexte (autre bout, hôtel,
  « Me localiser », Paris) — le classement garde Paris comme référence ;
  Photon dans la langue du client ; `itineraire()` rend sa `source`.
- **Prix au km contrôlé côté serveur : SIGNALER, JAMAIS REFUSER.** Aucune
  route n'est plus courte que la ligne droite : minimum = ligne droite ×
  tarif serveur, arrondi à la dizaine INFÉRIEURE, relevé au minimum. En
  dessous : `securite.prixSousLigneDroite`, « Prix à vérifier » sur le bon
  admin. Un téléphone qui garde un ancien tarif n'est pas une fraude.
- Piège : `pkill -f "http-server …"` tue le shell qui le lance, et le serveur
  reste ouvert. Fermer par numéro de processus, toujours.
- Suites : `test-nouveau-lieux.mjs`, plus des contrôles dans
  `test-nouveau-serveur.mjs` et `test-securite-fonctions.mjs`.
- Reste (P2, à lui) : clé Mapbox Directions ; un second fournisseur de lieux
  qui autorise le stockage ; validation serveur complète ; lien GPS sur le bon.

## PLUS AUCUN BLOCAGE COMMERCIAL — UNE DEMANDE RÉELLE PART TOUJOURS

4 octobre 2026, à sa demande (« un client avec une demande réelle doit
toujours disposer d'une sortie »). Vingt règles auditées AVANT de coder.
- **Préavis de 15 min supprimé.** Seule l'heure réellement passée est
  refusée, avec la sortie « Partir dès que possible ».
- **« Maintenant » / « Programmer »** (défaut : programmer — les aéroports se
  réservent à l'avance). **Aucun pixel de hauteur** : une rangée de boutons
  repoussait « Voir mon prix » sous la barre du bas (mesuré 773–826 pour une
  barre à 784). « Maintenant » est un lien dans le titre du champ Date ; en
  mode immédiat un encadré (`#blocAsap`) de même hauteur remplace date et
  heure. `course.immediat` ; « soumise à disponibilité, sans délai garanti »,
  « réponse plus lente de 22 h à 5 h » — **jamais un blocage**.
- **« TARIF À CONFIRMER »** (`tarifAConfirmer`, `motifsTarif` parmi
  `longue`/`groupe`/`adresse`) : la demande PART sans aucun montant affiché —
  au-delà de 90 km (`#infoLongue` ; `RAYON_ZONE_KM` est devenu le seuil du
  PRIX AUTOMATIQUE), plus de 7 passagers (« Plusieurs véhicules »), adresse
  introuvable envoyée telle quelle (`adresseAVerifier`, sans coordonnées).
  **Piège attrapé par le test** : le client envoyait `longue_distance`, le
  serveur attendait `longue` — toute longue distance aurait été refusée.
- **`deposer-course`** force le prix à 0 sur une demande à confirmer, exige
  sinon un prix positif (le 0 € passait), accepte 60 passagers et 5 000 km.
- **Admin** : pastilles Immédiat / Tarif à confirmer / Adresse à vérifier /
  Plusieurs véhicules (ligne du bas de la carte), « À confirmer » au lieu de
  0 €. **« Confirmer » refusé tant que le prix n'est pas fixé** (un VTC
  annonce son prix avant le départ). « Modifier la course » fixe le prix et
  pose `prixFixeApres` : « Prévenir le client » l'annonce, `?ok=` le porte.
- **`nouvelle-demande`** : une demande immédiate a pour référence création +
  30 min. Comptée sur sa date, elle recevait aussitôt « DÉPART PASSÉ » puis
  le silence.
- **CGV art. 4** (FR/EN) décrivent les demandes sans prix affiché.
- Toujours refusés : heure passée, départ = arrivée, coordonnées d'une
  adresse modifiée, identité/téléphone, règlement, quotas, doublons.
- Suites : `test-nouveau-sans-blocage.mjs` (site construit, client + admin),
  `test-nouveau-preavis.mjs` (verrouille l'ABSENCE du préavis),
  `test-securite-fonctions.mjs`, `test-relance-alertes.mjs`.
