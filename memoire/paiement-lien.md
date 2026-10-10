# Le règlement du client — archive

> **Ceci est une archive.** Ce qui vaut aujourd'hui est dans `CLAUDE.md`,
> section « LE CLIENT PAIE SON CHAUFFEUR PAR LIEN, AVANT LE DÉPART ».

## 10 octobre 2026 — le paiement par lien, avant le départ

Barbaros, en plusieurs messages : « le client paie avant quoi qu'il arrive,
il n'y a plus d'espèces », « je trouve un chauffeur avec un lien de paiement
au montant indiqué, je confirme avec le client, il paie, le chauffeur
arrive », « si le client annule tant pis pour lui », « ils devront payer au
moins 2 heures avant la course ».

**Les options écartées, et pourquoi** (conseil donné, choix fait par lui) :
- **Encaisser sur son propre compte puis reverser au chauffeur** : c'est
  encaisser l'argent d'un tiers (service de paiement, agrément ACPR) ou
  vendre le transport en son nom (tout le prix devient son chiffre
  d'affaires, la facture au SIRET du chauffeur devient fausse). Et un
  compte de particulier n'encaisse pas une activité commerciale.
- **Stripe Connect avec empreinte bancaire** : la solution complète
  (prélèvement partiel selon l'annulation, partage automatique de la
  commission), à moitié construite en mode test (`creer-empreinte`,
  `capturer-paiement`). Bloquée par le SIRET ; une empreinte ne tient
  qu'environ 7 jours.
- **Retenu : le lien du CHAUFFEUR**, à montant fixe, transmis par Barbaros
  avec la confirmation. L'argent va droit au chauffeur, la commission se
  facture comme avant (centre de contrôle, seuil de dette).

**Le remboursement.** Il voulait « jamais remboursé ». Conseillé : 24 h
(risque d'opposition bancaire, R212-2 Code conso., avis). Il a maintenu sa
règle, réservations à quelques jours seulement. **Ce qui n'a pas été
négocié** : une course ratée du fait d'Elatransfer ou du chauffeur est
remboursée en totalité, par le chauffeur qui a encaissé (CGV art. 7, 14
jours ; accord à prendre avec chaque chauffeur : 48 h).

**La limite.** 2 h avant le départ ; départ avant 8 h : la veille à 22 h
(personne ne paie à 2 h du matin). Trouvé en écrivant le test, lancé à
23 h : une demande faite APRÈS sa propre limite (23 h pour 1 h 30)
naissait « en retard ». Elle se paie avant l'arrivée du chauffeur, comme un
départ immédiat. La limite est CALCULÉE (`limitePaiement`), jamais rangée.

**Ce qui a été construit** : bloc « Par lien de paiement, avant le départ »
et ses trois règles avant « Confirmer » ; `paiement:"lien"` accepté par
`deposer-course` ; bloc « Paiement du client » sur le bon admin (lien
https obligatoire, service inconnu signalé), deux lignes dans « Prévenir le
client », case « Payé », écriteau « Paiement attendu » dans l'heure qui
précède la limite. CGV 5 et 7, politique de confidentialité, FAQ et pages
de service, en français et en anglais.

**Ce qui reste ouvert** : le comptoir d'hôtel (garde carte / espèces) ;
une alerte Telegram sur un paiement en retard (l'écriteau ne vit que dans
l'admin ouvert).

---

## Avant le 10 octobre 2026 — la question « carte ou espèces »

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

