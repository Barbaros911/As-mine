# La référence d'une course, et le N° court

Archive rangée le 5 octobre 2026 (plafond de `CLAUDE.md`). Ce qui vaut
aujourd'hui est dans la section « LA RÉFÉRENCE EST TIRÉE AU SORT » de
`CLAUDE.md` ; ce fichier garde POURQUOI.

## 29 septembre 2026 — la référence tirée au sort — LE COMPTEUR PAR APPAREIL FAISAIT REFUSER LES DEMANDES

29 septembre 2026, capture de Barbaros à 5 h 28 : une demande du comptoir
easyHotel refusée, « Votre demande n'a pas pu nous être transmise ».
**Mesuré** sur le journal du diagnostic de la nuit (workflow des
migrations) : le serveur portait déjà `ELA-26-09-0001` à `0023`, arrivées de
plusieurs appareils dans le désordre ; le téléphone venait de fabriquer
`ELA-26-09-0008`. `deposer-course` refuse une référence déjà prise (409).
- **Le compteur vivait dans le navigateur** (`ela_rang`), hérité de l'ancien
  site où seul Barbaros numérotait. Tout nouvel appareil repartait à 0001 :
  sa première demande du mois était refusée dès que le mois en avait une.
  Côté exploitant, `pousser` fusionne : une course saisie à la main pouvait
  **écraser** celle d'un client au même numéro.
- `referenceSuivante()` tire maintenant cinq signes dans un alphabet sans
  0/O/1/I/L (28 millions par mois). Ne pas revenir à un compteur local : une
  numérotation continue exige que le SERVEUR attribue le numéro, ce qui est
  impossible avant l'ouverture de WhatsApp (Safari, geste de l'utilisateur).
- `intake-demande.js` lit les deux formes ; `test-admin-intake` en éprouve
  une de chaque.
- **Admin v2 triait par référence** (`order=ref.desc`, liste et registre) :
  un tirage au sort n'a pas d'ordre. Les deux lisent maintenant par
  `cree_le.desc`, comme l'espace historique et la réception. Sans ça, la
  limite de 300 lignes aurait pu écarter la demande arrivée à l'instant.

## 5 octobre 2026 — le N° court, « N° 1042 »

Barbaros : « pour les numéros de bons, il faut que tu me fasses quelque
chose d'assez simple ». La référence tirée au sort ne se dicte pas au
téléphone. Ce qui avait été écrit le 29/09 tenait toujours : une
numérotation continue exige que le SERVEUR attribue le numéro. C'est ce
que fait `20261006000000_numero_court.sql` — la base numérote à
l'écriture de la ligne, et le N° revient au client dans la réponse de
`deposer-course`, APRÈS le geste : rien n'attend avant l'envoi.
- **La numérotation des courses existantes passe déclencheurs coupés.** La
  table en porte deux dont le code n'est pas dans le dépôt
  (`journal_courses_operateurs`, `proteger_courses_agent`, créés dans
  l'éditeur SQL). L'épreuve les remplace par deux sentinelles, dont une qui
  fait tomber la migration si elle tourne. La version est montée à la main
  pour que les appareils de l'admin relisent leurs courses.
- **Défaut ET déclencheur tiraient chacun un numéro** : la numérotation
  sautait d'un sur deux. Trouvé par l'épreuve, pas en relisant. Seul le
  déclencheur numérote ; sans lui, « not null » refuse.
- **Le N° est RECOPIÉ DANS LE BON (`bon.numero`)** par la base, à
  l'écriture et à chaque modification. Premier jet : `select=*` partout où
  l'on lit `courses`, pour lire la colonne sans la nommer (nommée, elle
  fait refuser toute lecture tant que la migration n'est pas appliquée).
  `test-admin-arrivee` l'a fait tomber : sur un serveur sans colonne
  `version`, `*` répond quand même, et l'admin relisait « à l'ancienne »
  sans un mot — le garde-fou du 2 octobre (« une colonne absente est une
  panne AFFICHÉE ») était perdu. Avec la recopie, aucune lecture ne change :
  tout le monde lit déjà le bon.
- **Le lien `?ok=` porte le N° (`n`)** : un compteur, pas une donnée du
  client. Un lien envoyé avant s'ouvre comme avant.
- Des trous sont possibles (une écriture refusée consomme un numéro) : ce
  n'est pas un numéro de facture.
