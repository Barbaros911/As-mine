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
- **Le client paie le chauffeur**, à bord. Aucun paiement en ligne — **c'est
  ce que fait le site AUJOURD'HUI, et ce que disent les CGV publiées.**
  Cette règle fondatrice est **en cours de remplacement** par l'empreinte
  bancaire Stripe (voir plus bas) : décidée, en construction, **pas encore
  active**. Les deux ne se contredisent que si l'on confond ce qui tourne
  avec ce qui est décidé. **Tant que Stripe Live est éteint, c'est cette
  ligne-ci qui dit vrai au client** — et les CGV ne changent que dans la PR
  qui active réellement l'autre modèle.
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

## Décisions produit validées par Barbaros avec ChatGPT (16 septembre 2026)

**POURQUOI ELLES SONT ICI.** ChatGPT les a posées dans l'Issue #164 en écrivant
« À FAIRE PAR CLAUDE : les considérer comme contraintes produit pour la suite ».
Elles ne vivaient que dans un fil GitHub : **une session neuve ne les aurait
jamais vues.** Lire une Issue n'est pas s'en souvenir — c'est exactement la
raison d'être de ce fichier.
Le détail et les nuances restent dans #164 et #173 ; ce qui suit est ce qu'on
ne doit pas enfreindre sans le rouvrir.

### Architecture
- **Quatre espaces séparés** : Public ELA · Client easyHotel · Réception
  easyHotel · Admin ELA — avec **un seul cœur de réservation**.
- **Une entrée canonique par rôle.** Les anciens alias redirigent, ils ne
  deviennent pas des versions à maintenir.
- **Multi-établissements dès la conception** : easyHotel ne doit pas être un
  cas codé en dur. Chaque hôtel aura sa configuration, le moteur reste commun.
- **Les autres projets sortent de la publication ELA** (Point Clôtures, Ici
  Cuisine) — **sans supprimer leur travail**.
- Le QR de l'affiche ouvre l'espace **Client easyHotel existant**, et le
  contexte (hôtel, destination, tarif, provenance) est conservé **jusqu'à la
  confirmation** — pas de perte silencieuse en changeant d'écran.
- **Deux origines distinctes** : `QR client hôtel` et `Réception hôtel`. Les
  deux alimentent le même Admin, avec la source identifiable.

### Cycle de la réservation
`Demande reçue → Empreinte autorisée → Réservation confirmée → Chauffeur
attribué → Réalisée`
- **Confirmer ≠ nommer le chauffeur.** ELA doit pouvoir confirmer sans
  chauffeur attribué : état « **Confirmée — chauffeur à attribuer** »,
  prioritaire à l'approche du départ.
- Une demande immédiate reste **soumise à disponibilité**. Aucune promesse de
  10/20/30 minutes, aucun « réserver 2 h avant = chauffeur garanti ».
- Une demande immédiate **ne reste pas indéfiniment en attente** : si aucun
  chauffeur, on le dit clairement au client.

### Canaux — à ne pas mélanger
- **Admin ELA = centre de commande et source de vérité.** Aucune action
  métier canonique ne dépend de Telegram.
- **WhatsApp = communication humaine** client et chauffeur.
- **Telegram = alertes internes uniquement.** Ne pas le proposer aux clients.

### Cloisonnement de la réception
La réception ne voit **jamais** : commission ou marge ELA, montant chauffeur,
réglages Stripe, Telegram, carnet complet des chauffeurs, paramètres
commerciaux, réservations des autres partenaires. Elle ne capture ni n'annule
un paiement, ne modifie aucune règle tarifaire, ne clôt rien financièrement.
**Ne pas en faire un mini-Admin.**

### Paiement — CE QUI REMPLACE « AUCUN PAIEMENT EN LIGNE »
C'est un renversement d'une décision fondatrice, autorisé par Barbaros
(« mets-le en place, je vais créer au moins une auto/micro-entreprise »).
- **Empreinte bancaire Stripe** puis **capture manuelle** à la confirmation.
  Si ELA n'assure pas la course : libérer, ne pas capturer.
- **Apple Pay / Google Pay / Link en priorité**, carte en secours. Le client
  ne saisit **jamais** sa carte dans un formulaire maison.
- Le montant est **calculé et verrouillé côté serveur**, jamais accepté du
  navigateur. Le webhook signé est la vérité de l'état Stripe.
- **Aucune donnée carte chez ELA. Aucun secret Stripe dans le dépôt.**
- **Une empreinte n'est PAS du chiffre d'affaires encaissé.**
- **Stripe Live reste éteint** tant que Barbaros n'a pas son statut réel.
  Ne jamais afficher « paiement réel actif » sans l'avoir vérifié.

### Annulation (remplace le barème de l'ancien site)
Plus de 24 h : gratuit, et l'empreinte non capturée est **libérée** · moins de
24 h et no-show : facturable selon des CGV clairement acceptées · **annulation
du fait d'ELA : aucune pénalité et restitution intégrale**.
**Ne pas modifier les CGV sur ce point avant le lot d'implémentation validé.**

### Ce qui reste réservé à Barbaros, et qu'on n'invente jamais
Activation Stripe Live · reversement réel aux chauffeurs · commission de 20 %
· tarifs · politique d'annulation · conditions contractuelles · rôle juridique
· identité et logo · engagement envers un partenaire.
**Ne jamais présenter easyHotel comme « partenaire officiel » sans accord
formalisé** — dire « tarifs au départ de easyHotel Aéroville ».

### Qui tient quoi — TRANCHÉ LE 16 SEPTEMBRE
**Deux sessions Claude ont travaillé ce dépôt en parallèle le 16 septembre**,
et leurs commits sont arrivés sous les pieds l'un de l'autre. #173 (paiement)
et #165 (finition Admin) avaient été pris par l'autre session — #176 à #185
sont fusionnées.

**ChatGPT a tranché le 16 à 12 h 41** (#165, « DÉMARRAGE CONSTRUCTION ADMIN ») :
l'autre session est à l'arrêt (« pendant ton indisponibilité »), et **#165 est
à cette session-ci**. #173 (paiement) vient **après** la bascule Admin, dans
l'ordre écrit sur #173 le 16 à 12 h 57.

**ET LA RÈGLE QUI EN DÉCOULE, POSÉE PAR BARBAROS LE 16** : en cas
d'indisponibilité de l'un, **c'est lui qui dit qui prend le relais** — jamais
les assistants entre eux. Un assistant à l'arrêt ne libère pas son chantier :
on le signale et on attend. Voir `TEAM_RULES` §3.

**LA CIBLE RESTE UN SEUL ESPACE EXPLOITANT**, pas deux tenus en parallèle.
La parité fonctionnelle d'Admin v2, y compris la chaîne partagée
itinéraire/prix, a été fusionnée dans **#191**. Admin v2 est publié en
préversion, tandis que l'entrée exploitant historique reste active tant que
la bascule finale n'a pas été validée.

La refonte responsive Admin historique de #165/#192 a été dépassée par les
intégrations validées et fusionnées dans **#218 puis #219**. Le suivi ne doit
plus présenter #192 comme chantier actif de référence. L'Admin courant sur
`main` est la base unique à conserver : toute correction future repart de
l'état réel de `main`, sans recréer une seconde interface ni réintroduire une
ancienne branche. #165 doit servir d'historique/coordination jusqu'à sa mise à
jour ou sa clôture, pas de source technique concurrente.

La branche `claude/page-directe-0finaj` ne doit pas être fusionnée telle
quelle : elle diverge de `main`. Seules ses corrections tarifaires encore
nécessaires et démontrées peuvent être extraites dans une PR technique neuve
depuis le dernier `main`. Le détail historique des briques et de leurs pièges
reste dans `CLAUDE.md`. `/etat` signale en rouge quand `main` a bougé
pendant la session.

## Le mandat « STACK IA / DEVOPS MULTI-AGENTS V2 » — deux briques sur dix, décidé

22 septembre 2026. Barbaros a apporté un mandat de dix briques : orchestrateur,
GitHub Actions, Graphify, Context7, Playwright, Supabase preview, sécurité
automatique, preview visuelle, monitoring production, optimisation des tokens.
L'audit est dans #215.

**Il a tranché après cet audit : « fais ce qui est le mieux ».** Deux briques
ont été construites, huit ont été écartées **volontairement**. Ce n'est pas un
travail inachevé : c'est un arbitrage, et il est écrit ici pour qu'aucune
session ne le reprenne en croyant combler un oubli.

### Faites

- **Monitoring production.** Une fusion n'était pas une preuve : on publiait et
  personne n'allait voir derrière. L'état `VÉRIFIÉ EN PRODUCTION` du cycle
  officiel n'avait **aucun porteur** — il ne pouvait pas être prouvé.
- **Régression visuelle.** Les suites éprouvent des règles nommées ; une couleur
  qui change ou un bloc qui se décale n'était vu par personne, sauf par Barbaros
  sur une capture.

### Écartées, et pourquoi

| Brique | Raison |
|---|---|
| Orchestrateur exécutable | La gouvernance écrite est appliquée et tenue par les Issues/PR. Un orchestrateur logiciel serait une deuxième source de vérité à côté de GitHub. |
| Consolidation des Actions | 18 workflows en place, tous verts. Les toucher sans symptôme constaté, c'est le `html_handling` de Cloudflare une deuxième fois. |
| Graphify | Dépendance extérieure nouvelle, sur un projet qui n'en tolère qu'une. Le mandat lui-même demande d'en **mesurer le bénéfice avant** de la rendre obligatoire : cette mesure n'a pas été faite, donc rien n'a été installé. |
| Context7 / MCP projet | Même raison. Aucune tâche récente n'a échoué faute de documentation de dépendance. |
| Playwright — refonte | Déjà reproductible et verrouillé depuis #210. Un `playwright.config` commun serait du confort. |
| Supabase preview | Touche une zone critique et coûte peut-être de l'argent. **Aucune activation sans accord explicite de Barbaros**, et le coût reste à documenter GRATUIT / PAYANT / OPTIONNEL. |
| Scanners de sécurité en plus | gitleaks **plus** le scanner maison à empreintes couvrent déjà. Installer CodeQL, Semgrep et Trivy ferait quatre outils pour un même travail — exactement le doublon que le mandat interdit. |
| Mesure des tokens | Aucune infrastructure ne la rend fiable aujourd'hui ; un chiffre inventé sur un tableau de bord finit par servir à décider. |

**Ce n'est pas « non », c'est « pas maintenant ».** Chacune se rouvre le jour où
un symptôme réel la demande. Ce qu'il ne faut pas faire, c'est les installer
parce qu'une liste les nomme.

## Ce qui est prévu

| Quoi | Qui | Où c'est suivi |
|---|---|---|
| Gouvernance branches agents → `ai-dev` → promotion contrôlée vers `main` | Équipe · validation Barbaros | #212/#215 · PR #209 |
| Garde-fou Playwright mobile 390×844 + desktop 1280×800 | QA/DevOps | #213/#215 · PR #210 |
| Test contrôlé réel de la chaîne multi-agents | Équipe | #200/#215 |
| Kanban Agile Produit + Opérations (distinct du board de traitement des courses) | Admin/Produit | #197 |
| Sécurité finale : fermer l'ancien INSERT anon après validation des 4 parcours | Security | #190 |
| Paiement Stripe à empreinte/capture, Live désactivé jusqu'à validation | Booking/Security | #173 |
| Alerte avant expiration du jeton Supabase (13/09/2027) | Claude | à ouvrir |

## Ce qui bloque, et par qui

- **LE SIRET N'EXISTE PAS.** Micro-entreprise à créer sur
  `formalites.entreprises.gouv.fr`, et cela ne dépend que de Barbaros. Sans
  lui : mentions légales incomplètes, fiche Google non vérifiable, **aucune
  facture de commission valable**.
- **CE N'ÉTAIT PAS « LE SEUL VRAI BLOCAGE », ET CETTE LIGNE A MENTI**
  (corrigé le 16/09/2026, sur l'audit de ChatGPT). Elle laissait croire qu'un
  numéro suffisait à pouvoir exploiter. Or Elatransfer n'est pas un
  transporteur mais une **centrale de réservation** — Barbaros l'a dit
  lui-même, « je place seulement » — et ce statut porte ses propres
  obligations. ChatGPT en nomme trois de plus : l'immatriculation de
  l'entreprise, une **déclaration annuelle de l'activité de centrale de
  réservation** auprès du ministre chargé des transports, et une **assurance
  RC professionnelle de la centrale**.
  **À FAIRE CONFIRMER SUR LE TEXTE AVANT DE S'EN SERVIR POUR DÉCIDER** : le
  réseau de cette machine ne joint pas Legifrance, je n'ai donc pas pu lire
  les articles moi-même. C'est rapporté, pas vérifié — et la règle du projet
  est de ne pas présenter une supposition comme une instruction. Ce qui est
  acquis et déjà écrit ici : le régime de centrale de réservation
  (L3142-1 et s.) et le médiateur (L616-1), juste en dessous.
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
