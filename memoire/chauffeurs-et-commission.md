# Le carnet de chauffeurs, la facture et la commission — histoire

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

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
  temps que « LE TARIF SE RÈGLE DEPUIS L'ADMIN » (autre session). Cette seconde
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
  `cle-notifications`) ; `CLE_VAPID`, resté dans la page, ne sert plus à s'abonner. La paire a
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
