# La synchronisation de l'admin — l'écoute du serveur et le jeton d'une heure

Archivé le 15 octobre 2026 depuis `CLAUDE.md` (plafond du mémo), tel quel.
Ce qui en reste vrai est résumé dans le mémo, section « LES DEMANDES
ARRIVENT TOUTES SEULES ». Depuis, la sonde est passée à 8 s et la vérité est
le serveur (sections « LES DEMANDES ARRIVENT EN 8 SECONDES » et « LE SERVEUR
EST LA SEULE VÉRITÉ » du mémo).

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

## 2 octobre 2026 — ce que la suite éprouve, et le piège de capture (rangé le 19/10/2026)

- `test-admin-arrivee` bloc 4, cinq scènes, toutes contre un faux serveur à
  versions : changée ailleurs → ici en moins de 15 s ; panne → en file, témoin,
  repart seule ; copie périmée → refusée, serveur gagne, écran le dit ;
  supprimée ailleurs → disparaît ; serveur d'avant la migration → lu et écrit
  à l'ancienne. **Éprouvé contre l'ancien code : six contrôles tombent.**
- **PIÈGE DE CAPTURE, QUATRIÈME FOIS** : les premières captures montraient
  l'ANCIEN admin sans témoin — la falsification (`git stash`) avait
  reconstruit `site/` avec l'ancien code, et le `stash pop` ne reconstruit
  rien. `sh construire.sh` avant toute capture, toujours.
- `sw.js` est passé en CACHE v120 ce jour-là.

---

## Archivé de CLAUDE.md le 22/10/2026

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

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
- Les cinq scènes de `test-admin-arrivee` (bloc 4) et le piège de capture
  après un `git stash` : `memoire/synchronisation-admin.md`.

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
  (éprouvé). `npx` lance le serveur en PETIT-ENFANT : la fin de série
  descend toute la lignée (`arreter_lignee`, 18/10 ; `pkill -P` en laissait
  un orphelin). À la main, viser son numéro, jamais `pkill -f` : le motif
  attrape la commande qui le tape — revu le 18/10.
- **Le chien de garde qui ne passe que six fois en 21 h (P1-10) est
  tranché** : un voyant dans l'admin. Voir la section suivante.
