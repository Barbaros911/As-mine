# Les avis — archive (rangé le 15 octobre 2026)

> Archive figée. Ce qui vaut aujourd'hui est dans `CLAUDE.md`, section
> « LES AVIS — ON EN DEMANDE, ON N'EN INVENTE PAS ». Le texte ci-dessous est
> recopié tel qu'il était, quand le rappel de la semaine a été ajouté
> (Prompt 3, `SEO-AUTORITE.md` § 11).

## (archive) LES AVIS — ON EN DEMANDE, ON N'EN INVENTE PAS

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


## 15 octobre 2026 — le rappel, et la relecture qui l'a corrigé

- **`#bordAvis`** (tableau de bord) compte les clients de la semaine dont la
  course RÉALISÉE n'a pas reçu la demande d'avis (`avisADemander`,
  `JOURS_AVIS = 7`, numéro présent, course d'essai exclue). Il se tait sans
  lien d'avis réglé : il mènerait au champ, pas au client.
- **Il vient en DERNIER et cède la place aux écriteaux urgents** (relecture
  indépendante, mesuré : 878 px sur 844 quand il s'ajoutait au son coupé, au
  rappel de sauvegarde et à « sans chauffeur » — la première demande sortait
  de l'écran). C'est une règle de STYLE (`#bordSansChauffeur:not([hidden])
  ~ #bordAvis{display:none}` et ses sœurs), pas un redessin : elle suit
  l'état des écriteaux à l'instant même. Le son coupé et le rappel de
  sauvegarde, non urgents, ne le chassent pas ; `test-liens-suivi` mesure
  les deux cas.
- **Le message ne dit plus « si tout s'est bien passé »** (FR/EN, admin et
  Admin v2) : la condition ne demandait l'avis qu'aux clients contents —
  exactement le tri (« review gating ») que la règle « demander à tous »
  interdit. Trouvé par la relecture, hors du diff.
- Un vrai hôtel (« Nomad ») servait d'exemple dans l'admin et les jeux de
  test : remplacé par « Hôtel Exemple Roissy ». Dans un dépôt public, un
  exemple qui nomme un hôtel réel avec des courses inventées se lit comme
  un partenariat.

## 18 octobre 2026 — la note Google s'affiche, depuis un seul fichier

Audit de l'architecture commerciale : le rapport proposait d'afficher la note
(5,0, 25 avis) à condition que Barbaros confirme que les avis viennent tous de
clients d'Elatransfer. Sa réponse : « note Google oui ».

- **Une source, `avis-google.json`** (note, nombre, lien, date du relevé,
  `afficher`), jamais publiée. Les pages ne portent qu'un repère vide
  (`<p class="note-google" data-avis-google="fr en" hidden>`) que
  `.github/scripts/avis-google.mjs` remplit à la construction.
- **Où** : sous les horaires du bandeau de l'accueil ; sous le texte d'entrée
  des trois pages aéroport françaises et des cinq pages anglaises ; sous
  « Déjà en service… » de la page Professionnels, en phrase : « Nos clients
  voyageurs nous notent ★ … sur Google (N avis). » Pas dans la carte du
  formulaire, pas sur la page d'un hôtel, sa réception, l'admin ni la démo.
- **Une étoile, pas cinq** : cinq étoiles dessinées deviennent fausses à 4,8.
  Jamais d'arrondi vers le haut (4,86 → 4,8).
- **Elle s'éteint seule** : `afficher` à false (fiche suspendue), relevé de
  plus de 60 jours, donnée mal formée. La construction continue — une note
  absente ne doit jamais bloquer une correction urgente. Le délai est aussi
  écrit sur la page (`data-expire`) : un site qu'on ne reconstruit pas
  pendant deux mois retire sa note chez le visiteur.
- **Jamais dans les données structurées** (`aggregateRating`) : Google
  n'affiche pas d'étoiles pour une entreprise qui se note elle-même.
- **Le lien** est la recherche Google Maps documentée
  (`google.com/maps/search/?api=1&query=Elatransfer`) : aucun identifiant de
  son compte dans le dépôt, et rien qu'on ait dû deviner. Le lien `g.page/r/…/review`
  qu'il a donné ouvre le formulaire d'avis : c'est celui de « Demander un
  avis », réglé sur son appareil. À essayer sur son téléphone ; s'il
  n'ouvre pas la fiche, son lien « Partager » le remplace en une ligne.
- **« Voir mon prix » ne bouge pas** : la ligne prend ~24 px, repris sur la
  marge basse du bandeau (`:has`), seulement quand elle est là. Mesuré : 612
  sans, 612 avec (à 0,2 px près), à 320, 360 et 390 px comme sur ordinateur.
- **Mentions légales** (L111-7-2) : d'où vient la note, son relevé, ni
  contrôle ni tri. Voir `memoire/documents-legaux.md`.
- **Mise à jour** : il envoie « 27 avis, 4,9 », on change deux nombres et la
  date. `test-public-avis-google` ne fige aucun chiffre, il lit le fichier.

---

## Archivé de CLAUDE.md le 22/10/2026

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## LES AVIS — ON EN DEMANDE, ON N'EN INVENTE PAS

**Jamais un avis inventé** (L132-2 ; refusé en 09/2026, ne pas rouvrir) et
**on demande à TOUS** (15/10) : trier = « review gating », interdit par Google
et la loi. « Demander un avis » : course RÉALISÉE, langue du client, lien
`ela_lien_avis` réglé sur l'appareil (sans lien, rien ne part) ; `#bordAvis`
compte la semaine, se tait sans lien et cède aux écriteaux urgents.
**LA NOTE GOOGLE NE S'ÉCRIT QUE DANS `avis-google.json`** (18/10/2026 : les
25 avis viennent tous de clients, sa réponse). `.github/scripts/avis-google.mjs`
la pose à la construction (accueil, pages aéroport FR/EN, Professionnels) et
l'éteint si `afficher` est faux ou le relevé a plus de 60 jours ; jamais
arrondie vers le haut, ni dans les données structurées. Histoire : `memoire/avis.md`.

## 29 octobre 2026 — la note s'éteint, le lien reste (#426)

Décision de Barbaros du 25/10 (#426), codée le 29/10 : **plus de note chiffrée
sur le site, un lien seul**. Ses raisons : « le nombre d'avis ne se met pas à
jour » et « le peu d'avis, ça fait amateur ». La note 5,0 / 25 avis était déjà
éteinte (`afficher: false`, #407) ; depuis, les pages ne portaient plus rien du
tout, et un visiteur n'avait aucun moyen de vérifier la réputation.

- **Même repère, même script, même fichier.** Quand la note est éteinte (quelle
  qu'en soit la raison : `afficher` faux, relevé de plus de 60 jours, donnée
  mal formée), `avis-google.mjs` pose « Voir nos avis sur Google » / « See our
  reviews on Google » vers le lien du fichier, dans un nouvel onglet. Rien ne
  vieillit : ni note, ni nombre, ni étoile, ni date, ni `data-expire`. Il n'est
  retiré que si le lien ne mène pas à Google. `afficher: true` rallume la note
  telle qu'avant, sans autre changement (à rouvrir vers ~50 avis).
- **Où** : les dix pages qui portaient la note (accueil FR/EN, CDG, Orly,
  chauffeur privé, les cinq pages anglaises, Professionnels), une fois chacune.
  Jamais sur la page d'un hôtel, son comptoir, l'admin ni la démo. Sur la page
  Professionnels, il vient juste sous la phrase de preuve : la preuve, puis le
  moyen de la vérifier.
- **« Voir mon prix » ne bouge pas** : la place était déjà réservée pour la
  note ; mesuré au pixel près à 320, 360, 390, 1280 et 1366 px.
- **Le lien n'a pas pu être essayé d'ici** (Google refusé par le proxy de la
  machine) : c'est toujours la recherche Maps documentée `query=Elatransfer`.
  Barbaros l'ouvre sur son téléphone ; s'il ne tombe pas sur sa fiche, son lien
  « Partager » le remplace dans `avis-google.json`.
- **Mentions légales FR/EN, « Avis clients »** : elles disaient « La note
  Google affichée sur ce site… » alors qu'aucune note ne s'affiche. Elles disent
  maintenant que le site renvoie vers la fiche, où les avis sont publiés par
  leurs auteurs sans contrôle ni tri, et gardent la phrase sur le relevé de
  60 jours au conditionnel (« lorsqu'une note est affichée »). Les mentions
  n'ont pas de ligne de date (contrairement aux CGV et à la confidentialité) :
  aucune n'a été inventée.
- `test-public-avis-google` éprouve l'état réel du fichier (note OU lien seul) ;
  sur l'ancien code, 26 de ses contrôles tombent en nommant le défaut. Il ne
  plante plus quand la ligne manque (il le dit).

### 43 avis, la note reste éteinte (31 octobre 2026)

Barbaros : « J'ai 43 avis 5/5 pas 25 » — le fichier portait encore le relevé
du 18/10. Relevé mis à jour d'après son chiffre (Google est injoignable depuis
la machine de Claude : rien n'a pu être recompté ici). On lui a proposé
d'afficher la note maintenant ; **il a choisi de corriger le chiffre seulement**
(« 1 ») : `afficher` reste à false, rien ne change à l'écran. Le jour où il
l'allume, le relevé doit avoir moins de 60 jours, sinon la note s'éteint seule.

### Le lien vérifié sur son téléphone (1er novembre 2026)

Barbaros : « Elle s'ouvre oui dans Google Maps » — « Voir nos avis sur
Google » ouvre bien sa fiche. Le lien de recherche `query=Elatransfer` reste
donc tel quel ; #426 close (fusionné, déployé, vérifié en production). La
ligne « à vérifier sur son téléphone » quitte `PROJECT_STATE.md`.
