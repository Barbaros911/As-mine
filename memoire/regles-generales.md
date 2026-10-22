# Les règles générales du mémo — histoire

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

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

**CE DÉPÔT SERT À ASMINE (ELATRANSFER), ET À LUI SEUL.** Les sites vitrines de
commerçants n'y vivent plus depuis le 4/10/2026, à sa demande
(`PROJECT_STATE.md`) ; `sites/` ne porte plus que des entrées d'Elatransfer.
Les anciennes règles pour en créer un : `memoire/sites-vitrines.md`, à
n'ouvrir que s'il redemande un site de client ici.

## Comment le site est construit et hébergé

**`construire.sh` est la SEULE recette.** Il assemble le dossier `site/` à
partir du dépôt, et il est appelé par GitHub Actions **et** par Cloudflare
Pages. Ne jamais recopier ses étapes dans un workflow : deux recettes
finissent toujours par diverger, et on s'en aperçoit le jour où l'une publie
un fichier que l'autre a oublié. La liste des fichiers copiés y est
**explicite** — un `cp *` publierait un jour les suites de tests ou le
classeur de suivi. `site/` est ignoré par git : il se reconstruit.

**Cloudflare sert le site** (Workers, `wrangler.jsonc` ; branche `main`,
`sh construire.sh`, dossier `site`), après une panne de GitHub en septembre
2026 : `CLOUDFLARE.md`. `_headers` et `_redirects` n'agissent que là.
- **LE DOMAINE EST DÉJÀ CHEZ CLOUDFLARE** (5/10/2026). Le courrier reste chez
  IONOS (MX `mx00`/`mx01.ionos.fr`, SPF) : **ne jamais toucher ces lignes**,
  ni `google-site-verification` — `memoire/cloudflare-dns.md`.
- **Cloudflare tombe aussi**, plus rarement : ne pas le vendre comme une immunité.

**NE JAMAIS CHANGER UN RÉGLAGE PAR DÉFAUT QU'ON NE PEUT PAS ÉPROUVER** : on
garde le défaut, on ne le change que sur un symptôme constaté (`html_handling`
à `"none"` avait cassé `/demos/` en 2026) — `memoire/hebergement.md`.

**UNE ADRESSE INCONNUE REND UNE VRAIE 404** (18/10/2026, `404-page`) : plus
jamais l'accueil en 200. Ne pas remettre `single-page-application` ; une
ancienne adresse se redirige dans `_redirects`, jamais par un attrape-tout.
`test-routage.mjs` refuse tout lien du site qui finirait en 404.

**QUEL COMMIT EST EN LIGNE SE PROUVE** (14/10/2026) : `construire.sh` écrit
`/version.json` ; le monitoring exige le dernier `main` (15 min de marge),
l'absence des textes de `.github/scripts/textes-interdits.mjs`, refusés aussi au
build, et RÉSERVE de bout en bout : sonde `SONDE-`, jamais écrite (20/10).

**LES ADRESSES À ÉPROUVER APRÈS CHAQUE DÉPLOIEMENT CLOUDFLARE** — une par
mécanisme de service (le monitoring les vérifie toutes les 6 h) :
| Adresse | Ce qu'elle éprouve | Attendu |
|---|---|---|
| `/` | la racine | le site de réservation |
| `/admin.html` | un fichier exact | renvoie vers la connexion de `/ela-admin/` |
| `/demos/` | **un dossier** | la galerie « Démonstrations » |
| `/n-existe-pas` | une adresse inconnue | « Page introuvable », code 404 |
Si `/demos/` rend une 404, c'est `html_handling` qui est en cause.

## Git et publication

**Rien ne part sans que Barbaros l'ait vu.** Règle posée en août 2026, après
deux fusions passées en ligne avant qu'il ait pu regarder. L'ordre est
toujours le même : faire le travail, **montrer** (capture d'écran, pas une
description), **attendre son accord**, et seulement ensuite pousser. Cela
vaut aussi pour ce qui est « visible par un client » : c'est justement ce
qui mérite d'être vu avant, pas après. Ne jamais lire l'urgence d'un lien à
envoyer comme une autorisation de fusionner.

**UNE FUSION SE JUGE SUR `git diff main...branche`, JAMAIS SUR UN COMPTE DE
COMMITS** : « deux commits d'avance » cachait une branche qui aurait effacé le
site. Toute branche nommée ici doit exister (`test-doc.mjs`). `memoire/branches.md`.

- **Une tâche = une branche courte partie du dernier `main`**, PR vers `main`,
  jamais directement sur `main` ; plus d'`ai-dev` (retirée le 17/10/2026). Le
  chemin complet est dans `TEAM_RULES.md` §2.
- **`main` est protégée par un ruleset GitHub** dont `.github/ruleset-main.json`
  est la CIBLE (PR, cinq contrôles verts, branche à jour, conversations
  résolues, personne d'exempté) ; `protections-main.yml` compare chaque jour et
  ouvre une Issue sur écart. Compter ~22 min de CI par PR.
- Toujours vérifier `git branch --show-current` avant un `git push` — déjà
  fait l'erreur de pousser vers le mauvais nom de branche une fois.
- Une fois l'accord donné : ouvrir la pull request **et la fusionner** —
  sans la fusion, le lien envoyé au client ne fonctionne pas.
- Un changement interne (compétences, configuration, outillage, rien de
  visible en ligne) : même règle, montrer et demander avant.
- Ne jamais committer et pousser dans le même appel : les faire l'un après
  l'autre. Un appel qui mélange les deux a déjà été bloqué par le
  classificateur de sécurité.
- `.claude/` (compétences, config) n'a aucun effet sur le site publié :
  `construire.sh` ne copie que les fichiers qu'il nomme.

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
- **Piste commerciale : les hôtels de la zone CDG.** easyHotel **n'est PAS
  partenaire officiel** (14/10/2026) : autorisation d'exploiter depuis le 12/10,
  aucun accord écrit, aucune réservation. Ne pas annoncer de partenariat.
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

**Programme Partenaire : annoncé, sans montant ni promesse (18/10/2026, sans
SIRET, sa décision)** : le bloc de `/professionnels/` est au conditionnel, jamais
« commission » ni « gagnez » (`test-pro-page`) ; la grille (en €) se remet en
rendez-vous : `memoire/programme-partenaire.md`.

**Pas décidé** : statut juridique et **SIRET de Barbaros — À CRÉER, c'est le
point bloquant** · volume visé · budget.

**L'ancien site** (grille, packs, délai de 3 h, codes promo, août–septembre
2026) : `memoire/ancien-site.md`, à n'ouvrir que si un sujet d'alors revient ;
pour aujourd'hui, c'est « LE SITE » qui dit vrai.

---
