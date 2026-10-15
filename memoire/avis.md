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

