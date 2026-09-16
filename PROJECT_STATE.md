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
- **Le client paie le chauffeur**, à bord. Aucun paiement en ligne.
- **Le prix est ferme**, arrêté à la réservation, donc **opposable**.
  Conséquence de tout : toucher à la grille veut dire toucher aux CGV, dans
  les deux langues.
- **Aucune majoration** — ni nuit, ni week-end, ni jour férié. Seule exception,
  le forfait partenaire easyHotel (+5 € de 21 h à 6 h), qui est une autre
  grille.
- **Un seul `index.html`.** Client, exploitant, hôtel et réception y vivent
  ensemble. Le dupliquer, c'est le faire diverger au premier correctif.
- **`construire.sh` est la seule recette de publication**, partagée par GitHub
  Actions et Cloudflare Pages.
- **Aucun faux avis** (L132-2 Code conso.), jamais, même demandé.
- **Aucune photo ni aucun logo dont on ne détient pas les droits.**

## Ce qui est prévu

| Quoi | Qui | Où c'est suivi |
|---|---|---|
| Refonte de l'admin sur la référence visuelle | ChatGPT puis Claude | Issue #165 |
| Trancher la pancarte : option à 10 € ou gratuite | **Barbaros** | Issue #169 |
| Relecture de `TEAM_RULES.md` (§1 et §9) | ChatGPT | PR #170 |
| Alerte avant expiration du jeton Supabase (13/09/2027) | Claude | à ouvrir |

## Ce qui bloque, et par qui

- **LE SIRET N'EXISTE PAS.** C'est le seul vrai blocage du projet et il ne
  dépend que de Barbaros — micro-entreprise à créer sur
  `formalites.entreprises.gouv.fr`. Sans lui : mentions légales incomplètes,
  fiche Google non vérifiable, **aucune facture de commission valable**.
- **Le médiateur de la consommation n'est pas désigné** (L616-1 Code conso.).
  Tant qu'il ne l'est pas, on n'en nomme aucun : le client écrirait à une
  adresse morte en croyant avoir saisi un recours.
- **Mapbox est repoussé**, à sa demande — il n'a pas voulu donner sa carte
  bancaire. Ne pas le relancer. Le site tourne sur ORS, OSRM en filet.
- **Cloudflare est en attente** : ne pas déplacer les serveurs de noms, son
  email en dépend. Marche à suivre dans `CLOUDFLARE.md`.

## Comment tenir ce fichier

Une seule règle : **n'y écrire que ce qui ne se mesure pas.** Un état, un
compte, une liste de branches, une date de dernière fusion — tout ça se
demande à `/etat`. Ici on n'écrit que des décisions et des intentions, et on
les date quand elles changent.
