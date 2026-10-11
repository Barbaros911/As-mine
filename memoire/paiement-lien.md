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

## 11 octobre 2026 — plus de délai, plus d'écriteau, plus d'iMessage

Barbaros : « tu commandes, je confirme avec toi et le lien de paiement, tu
paies, le chauffeur arrive » ; « non pas de paiement attendu, chaque client
qui réserve paie ». La limite de 2 h (et sa variante « la veille à 22 h »,
et la règle de dernière minute écrite pour elle) est retirée, l'écriteau
« Paiement attendu » de l'admin aussi. Ce qui remplace : « votre chauffeur
se met en route dès que le paiement est reçu » — au client, dans le message
et dans les CGV (« un paiement tardif peut retarder la prise en charge »,
qui protège d'un client payant dix minutes avant son vol). Conseillé : « vous
contacte » plutôt que « vous appelle », pour ne pas promettre un appel à
chaque client. Le numéro est écrit dans le bloc de paiement, pour un départ
immédiat ou une réservation de vive voix.
Moyens de confirmation : numéro français Appel/SMS ou WhatsApp ; étranger
WhatsApp ou Telegram — **iMessage retiré** (oblige à écrire depuis un
iPhone, et un voyageur étranger a presque toujours WhatsApp). La politique
de confidentialité garde la mention d'iMessage : un SMS envoyé d'un iPhone
peut passer par lui.
Le lien du chauffeur arrive à Barbaros sur WhatsApp ; il le colle dans le bon
et « Prévenir le client » l'envoie par le canal choisi (SMS pour « appel »,
Telegram : message copié à coller).

---

## 11 octobre 2026, le soir — la règle d'annulation part avec le lien

Barbaros : « On est pas obligé de dire qu'une annulation n'est pas
remboursée ? », et « la confirmation vous parvient sans frais, c'est bête ».
- **LE SITE NE DIT QUE LA GARANTIE** : « Si votre course n'a pas lieu de
  notre fait, vous êtes remboursé en totalité. » Le non-remboursement d'une
  annulation du client est dit **dans le message qui porte le lien de
  paiement**, au moment où il engage de l'argent, et reste aux CGV (art. 7)
  acceptées à l'envoi. C'est ce message qu'on montre à une banque si un
  paiement est contesté. Le remboursement quand la course rate de notre fait
  est dû de toute façon (c'est le chauffeur, qui a encaissé, qui rembourse).
- **LA QUESTION FRÉQUENTE « Puis-je annuler ? » ANNONÇAIT ENCORE L'ANCIEN
  BARÈME** (gratuit à plus de 24 h, 30 %, 50 %), sur l'accueil et les trois
  pages de service, depuis le passage au paiement par lien. Réécrite : sans
  frais tant que le client n'a pas payé, non remboursée après, remboursée en
  totalité si la course n'a pas lieu de notre fait. Le barème ne vaut plus
  qu'au comptoir, payé à bord (CGV art. 7).
- **PUIS, LE MÊME SOIR : PLUS AUCUNE GARANTIE ANNONCÉE** (Barbaros : « il
  n'y a pas de raison que je n'assure pas la course, pourquoi mettre un
  message »). Retirée du récapitulatif, du message au client et de la FAQ.
  Elle reste aux CGV (art. 7), et le remboursement reste dû de toute façon.
  Le message garde une ligne : « En cas d'annulation de votre part, le
  paiement n'est pas remboursé. »
- **« Puis-je annuler ? » NE DIT PLUS LE NON-REMBOURSEMENT** (même soir,
  Barbaros) : « Oui. Prévenez-nous simplement par téléphone ou par
  message », puis renvoi aux CGV. « Sans frais jusqu'au paiement » a été
  essayé et retiré : la course n'est actée qu'au paiement, la phrase
  n'apprenait rien. Le renvoi aux CGV reste : un « Oui » sec, sans signaler
  de condition, serait une omission trompeuse (L121-3 Code conso.). La règle
  est aux CGV et dans le message qui porte le lien.
- **PUIS LA QUESTION A ÉTÉ RETIRÉE** (Barbaros : « enlève complètement, ça
  sert à rien ») de l'accueil et des trois pages de service. L'annulation
  n'est plus dite qu'aux CGV et dans le message qui porte le lien.
- **CGV art. 7 réécrit** (FR/EN, mise à jour du 11 octobre 2026) : avant
  paiement, le client renonce sans frais ; le paiement vaut **engagement
  ferme et définitif** ; la raison est écrite (le chauffeur réserve le
  créneau et refuse d'autres courses) ; après paiement, plus d'annulation,
  aucun remboursement ni total ni partiel, report soumis à accord. Le
  remboursement quand la course rate de notre fait reste écrit : c'est ce
  qui rend la clause équilibrée, donc non abusive. L'article 6 (pas de droit
  de rétractation, L221-2 9°) était déjà là.
- **PLUS AUCUN RÈGLEMENT À BORD, COMPTOIR COMPRIS** (Barbaros : « il n'y a
  plus de règlement à bord, des CGV en béton »). CGV entièrement réécrites,
  17 articles : contrat définitif au paiement ; impayé = réservation levée
  sans frais ; paiement contesté à la banque = prix toujours dû ; jamais de
  coordonnées bancaires demandées par message ; absence et circonstances du
  Client (vol annulé, papiers, santé) = prix dû ; remplacement du chauffeur
  sans frais ; chauffeur absent ou trop en retard = remboursé ; passagers,
  enfants, bagages, animaux (chiens guides toujours admis), tabac,
  dégradations ; objets oubliés ; preuve par écrit ; version française qui
  prévaut. Le barème 30 % / 50 % est parti avec le paiement à bord. Le temps
  d'attente est passé à l'article 9. La référence de l'article 6 dit
  « L. 221-2 » sans son alinéa : Légifrance n'était pas joignable pour
  vérifier le « 9° » écrit jusque-là. Le bloc Professionnels disait encore
  « réglé directement à bord » : corrigé. **L'écran du comptoir demandait
  encore carte ou espèces** le jour de cette réécriture.
- **PUIS, LE MÊME SOIR : « pour le comptoir on laisse carte ou espèce »**
  (Barbaros). Le comptoir d'un hôtel partenaire reste réglé à bord. Les CGV
  le disent (art. 5 : seule exception au paiement par lien ; art. 3 : le
  contrat y devient définitif à la confirmation ; art. 7 : le barème
  24 h / 30 % / 50 % et l'absence au prix entier ne valent que pour lui).
  Le bloc Professionnels dit « réglé directement à votre chauffeur », vrai
  dans les deux cas. `test-nouveau-bascule` exige que toute phrase du barème
  nomme le comptoir réglé à bord.
- La note des numéros étrangers dit ce qu'on y gagne (« Depuis l'étranger,
  recevez votre confirmation sur WhatsApp ou Telegram. ») au lieu d'un
  « sans frais » qui allait de soi.

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

