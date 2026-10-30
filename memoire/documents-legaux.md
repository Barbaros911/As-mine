# Les documents légaux — archive (rangé le 18 octobre 2026)

> Archive figée. Ce qui vaut aujourd'hui est dans `CLAUDE.md`, section
> « Les documents légaux ». Le texte ci-dessous est recopié tel qu'il était,
> quand la section a été resserrée pour faire de la place à la note Google.
> Deux points y ont vieilli : les documents ne s'ouvrent plus depuis un
> onglet « Contact » mais depuis le pied de l'accueil, et il n'y a plus
> aucune majoration (septembre 2026).

## (archive) Les documents légaux

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
  commercial, activité, hébergeur (Cloudflare ; GitHub, qui publie aussi), contact, propriété
  intellectuelle, CNIL.
- **Aucun médiateur de la consommation n'est nommé** tant qu'aucun n'est
  désigné : le client écrirait à une adresse morte en croyant avoir saisi
  un recours. La voie de réclamation, elle, reste écrite.
- **CE QUI MANQUE ENCORE, et que seul Barbaros peut donner** : raison
  sociale, forme juridique, **SIRET**, adresse du siège, directeur de la
  publication, et le médiateur (obligatoire, L616-1 Code conso.). Ne pas
  remettre de champs vides en attendant — les ajouter le jour où il donne
  les vraies valeurs, et pas avant.


## 18 octobre 2026 — d'où vient la note Google

La note Google s'affiche sur le site (accueil, pages aéroport, page
Professionnels). Le Code de la consommation (L111-7-2) demande à qui diffuse
des avis en ligne de dire comment ils sont publiés et s'ils sont contrôlés.
Les mentions légales portent donc, en français et en anglais, un paragraphe
« Avis clients » : la note est celle de la fiche Google, relevée à la main et
retirée du site au-delà de 60 jours ; les avis sont publiés par leurs auteurs
selon les règles de Google, sans contrôle, tri ni modification d'Elatransfer ;
Elatransfer demande un avis à ses clients sans faire de tri entre eux
(« review gating » interdit, voir `memoire/avis.md`). `test-public-avis-google`
vérifie que ces mots y restent.

**29 octobre 2026 (#426)** : la note chiffrée est éteinte, le site ne porte plus
qu'un lien « Voir nos avis sur Google ». Le paragraphe « Avis clients » ne dit
plus « la note affichée » : il dit que le site renvoie vers la fiche Google, où
les avis sont publiés par leurs auteurs, sans contrôle, tri ni modification ;
la phrase sur le relevé de 60 jours reste, au conditionnel (« lorsqu'une note
est affichée »). Les mentions n'ont pas de ligne de date : aucune inventée.

---

## Archivé de CLAUDE.md le 22/10/2026

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## Les documents légaux

CGV, mentions légales et confidentialité, FR et EN, sans compte, depuis le
pied de l'accueil (LCEN) ; corps en `textContent`. **Toucher au prix veut dire
toucher aux CGV, dans les deux langues, sans y écrire un chiffre.** **Aucun
trou** (`test-nouveau-bascule` cherche le crochet) : raison sociale, SIRET,
siège, directeur de la publication et médiateur (L616-1) s'ajoutent le jour
où il les donne, pas avant. Les mentions disent d'où vient la note Google
(L111-7-2). Histoire : `memoire/documents-legaux.md`.
