# Le Programme Partenaire Elatransfer — archive

> **Ceci est une archive, écrite le 14 octobre 2026.** Ce qui reste vrai tient
> en trois lignes dans `CLAUDE.md` (« Ce qui est décidé, ce qui ne l'est pas »).
> Ce fichier porte l'offre telle qu'elle a été arrêtée, et pourquoi, pour le
> jour où le SIRET existe et où un hôtel demande des conditions. Ne l'ouvrir
> que si le sujet revient.
>
> **18 octobre 2026 — le programme est ANNONCÉ, sans montant.** Barbaros :
> « J'ai pas de siret met le en place c'est pas grave ». Conseil donné avant :
> attendre le SIRET (sans société, aucune rémunération ne peut être facturée
> ni versée, et un directeur le demande au premier rendez-vous). Ce qui est en
> ligne : le bloc « Devenez partenaire Elatransfer » de `/professionnels/`,
> avec les textes de la section 7 (« rémunéré sur chaque transfert réalisé »,
> « aucun abonnement, aucun frais », « vos conditions évoluent… »). Rien
> d'autre n'est construit : ni page de conditions, ni PDF, ni simulateur, ni
> relevé. Hôtels et agences oui ; entreprises jamais (on ne paie pas un client
> pour qu'il achète).

## Ce que Barbaros a dit, et ce qui en découle

- **Mission du 14/10/2026** : concevoir l'offre commerciale hôtels — un vrai
  programme partenaire, pas « 10 % de commission par course ».
- **« Fais comme un expert, laisse-moi seulement les points essentiels »** :
  tout a été tranché ci-dessous ; quatre points lui restaient (taux réel de
  commission chauffeur, canal hôtel à 25 %, SIRET, statut d'easyHotel).
- **Sa réponse** : « c'est une offre que l'on peut faire, mais je n'ai pas
  encore le SIRET donc pas besoin d'afficher des contrats, etc. » → **le
  programme attend dans le tiroir.** Rien n'est affiché sur le site, rien
  n'est codé dans l'admin, aucun contrat, aucune rémunération promise à
  quiconque tant que le SIRET n'existe pas.
- **easyHotel N'EST PAS partenaire officiel** (ses mots : « pas officiel
  partenaire mais on a le privilège d'exploiter depuis le 12 octobre, même s'il
  n'y a aucun client qui a commandé jusqu'à maintenant »). Le mémo disait
  « easyHotel EST partenaire depuis septembre 2026 » : corrigé le 14/10. Le
  site ne dit nulle part « partenaire officiel » (vérifié) ; il n'y a rien à
  changer en ligne, et rien à annoncer. Le programme est l'argument pour
  passer d'une autorisation d'exploiter à un partenariat, le jour du SIRET.
- **Le taux de commission réel avec les chauffeurs n'a pas été donné.** La
  grille est calculée à 20 % ; elle tient à 20 % ou plus. En dessous, la
  recalculer avant tout rendez-vous.
- **Levier apparu le même jour** (PR #355, « Prix des pages ») : une page
  d'`ORIGINES` peut porter son propre tarif au km ou un % du tarif du site.
  Sur une page d'hôtel, ce levier ne vaut que pour les destinations HORS
  flyer (jamais un forfait) ; il peut financer la rémunération partenaire
  sur ces trajets sans toucher à la commission chauffeur. Non décidé.

---

## 1. Ce qui est arrêté, en une page

| Sujet | Décision |
|---|---|
| Nom | **Programme Partenaire Elatransfer** |
| Niveaux | **Partenaire** · **Partenaire Privilège** · **Partenaire Signature** |
| Frais pour l'hôtel | **Aucun**, à tous les niveaux : ni abonnement, ni installation, ni engagement |
| Rémunération | **En euros par transfert réalisé et payé**, selon le prix du transfert — jamais un pourcentage, jamais affichée sur le site |
| Mots à employer | « rémunération partenaire », « conditions partenaires », « transfert réalisé », « votre page », « votre espace réception » |
| Mots interdits | commission (en titre), cashback, parrainage, prime, partage de revenu, VTC, gagnez, apporteur d'affaires (hors contrat) |
| Palier | Constaté chaque trimestre sur le trimestre précédent ; Privilège dès **20 transferts réalisés par trimestre** |
| Règle de marge | Elatransfer garde toujours **au moins la moitié de sa commission et au moins 4,50 €** par transfert, rémunération de l'hôtel TVA comprise |
| Lancement | **Conditions Privilège garanties deux trimestres** ; les 5 premiers hôtels d'une zone sont « Partenaires fondateurs », Privilège garanti 12 mois |
| Exclusivité | **Aucune** au lancement ; clause « partenaire référent » au niveau Signature seulement |
| Tablette | **Prêtée**, jamais offerte, à partir de 30 transferts par trimestre |
| Règlement | Relevé trimestriel (mensuel en Privilège), montants HT + TVA, l'hôtel facture ou mandat d'autofacturation, paiement à 30 jours, report sous 50 € |
| Course éligible | Réalisée, payée par le client, non remboursée, non essai, provenance enregistrée ; un client absent qui a payé compte ; une course remboursée de notre fait ne compte pas |
| Bénéficiaire | **L'établissement**, jamais un réceptionniste |

---

## 2. Pourquoi c'est construit ainsi — la mécanique de l'argent

- Le client paie le chauffeur par son lien ; Elatransfer n'encaisse rien. Le seul revenu d'Elatransfer est la **commission facturée au chauffeur** (réglée dans l'admin, par chauffeur ou par canal).
- La rémunération de l'hôtel sort donc **de cette commission**, jamais du prix client, qui est ferme.
- L'hôtel est un apporteur d'affaires : il facture Elatransfer, avec TVA à 20 %. En franchise de TVA, Elatransfer ne la récupère pas : **8 € promis coûtent 9,60 €**. Toute la grille est calculée sur ce coût réel.
- Les calculs sont faits avec une commission chauffeur de **20 %**. Si la commission réelle est plus haute, la marge est plus confortable ; si elle est plus basse, la grille doit être recalculée (voir section 9).
- Sur un CDG berline à 35 €, la commission fait 7 €. Il n'y a presque rien à partager sur les trajets courts, qui sont les plus fréquents d'un hôtel de zone aéroport : la rémunération y est symbolique, et ce sont Paris, Orly, Disney et Beauvais qui paient le partenaire. C'est la raison d'une grille par prix et non d'un pourcentage : 10 % de 35 € feraient 3,50 € pour l'hôtel et emporteraient la moitié de votre marge.

---

## 3. La grille de rémunération (nets pour l'hôtel, par transfert, TVA en sus)

| Prix du transfert payé par le client | Exemples | **Partenaire** | **Partenaire Privilège** |
|---|---|---|---|
| Moins de 60 € | CDG, Le Bourget, Villepinte | **2 €** | **2 €** |
| 60 à 99 € | Paris, Orly, Disney en berline | **5 €** | **6 €** |
| 100 à 149 € | Paris, Orly, Disney en van | **8 €** | **10 €** |
| 150 à 299 € | Beauvais | **12 €** | **15 €** |
| 300 € et plus (sur devis) | longue distance | **5 % du prix** | **6 % du prix** |

Signature : la grille Privilège est le plafond à la commission actuelle. Un groupe n'obtient davantage que si son volume garanti permet de négocier une commission plus élevée avec les chauffeurs ; ce qui se négocie en Signature, c'est surtout le reste (reporting, intégration, interlocuteur, multi-sites).

La grille se présente à l'hôtel **appliquée à sa propre liste de prix** : son flyer avec une colonne « votre rémunération » par destination et par véhicule. Il reconnaît ses prix, il lit son gain, il n'a aucune formule à comprendre.

### Contrôle de marge, commission à 20 %

| Transfert | Commission Elatransfer | Hôtel Partenaire (coût TTC) | Reste Elatransfer | Hôtel Privilège (coût TTC) | Reste Elatransfer |
|---|---|---|---|---|---|
| CDG berline 35 € | 7,00 € | 2 € (2,40) | **4,60 €** · 66 % | 2 € (2,40) | **4,60 €** · 66 % |
| CDG van 50 € | 10,00 € | 2 € (2,40) | **7,60 €** · 76 % | 2 € (2,40) | **7,60 €** · 76 % |
| Paris berline 80 € | 16,00 € | 5 € (6,00) | **10,00 €** · 62 % | 6 € (7,20) | **8,80 €** · 55 % |
| Orly berline 90 € | 18,00 € | 5 € (6,00) | **12,00 €** · 67 % | 6 € (7,20) | **10,80 €** · 60 % |
| Paris van 120 € | 24,00 € | 8 € (9,60) | **14,40 €** · 60 % | 10 € (12,00) | **12,00 €** · 50 % |
| Orly van 130 € | 26,00 € | 8 € (9,60) | **16,40 €** · 63 % | 10 € (12,00) | **14,00 €** · 54 % |
| Beauvais berline 180 € | 36,00 € | 12 € (14,40) | **21,60 €** · 60 % | 15 € (18,00) | **18,00 €** · 50 % |
| Beauvais van 240 € | 48,00 € | 12 € (14,40) | **33,60 €** · 70 % | 15 € (18,00) | **30,00 €** · 62 % |

La règle (≥ 50 % de la commission et ≥ 4,50 €) est tenue sur chaque ligne, Privilège compris. Le palier Privilège est donc le **maximum absolu** à 20 % : il ne se dépasse pas, même pour un groupe, sans commission plus élevée.

Face au marché : les taux visibles chez les concurrents vont de 5 à 13 % du prix. Cette grille fait 5,7 % sur un CDG, 6,2 % sur un Paris berline, 6,7 % sur un Paris van, 6,7 à 8,3 % sur Beauvais. Elle est au marché, lisible en euros, et chaque ligne est rentable.

---

## 4. Règle de marge minimale — comment elle est calculée, et comment elle se code

**Elatransfer conserve, après rémunération de l'hôtel TVA comprise, au moins 4,50 € et au moins 50 % de sa commission sur chaque transfert.**

- **4,50 €** = le coût de traitement d'une course : environ 10 minutes (placer, confirmer, coller le lien, prévenir, suivre) à 25 €/heure, soit 4,17 €, arrondi. En dessous, vous travaillez pour payer l'hôtel.
- **50 %** protège les courses chères : sans cette borne, un Beauvais van pourrait « supporter » 40 € pour l'hôtel au nom des 4,50 €, et vous auriez fait tout le travail pour 8 €.
- À recalculer le jour où un coût fixe apparaît (RC Pro de centrale, abonnement serveur, salarié) : ajouter (frais mensuels ÷ courses mensuelles) au plancher.
- **Dans l'admin, avant tout versement** : rémunération = min(grille, commission figée − 4,50 €, 50 % de la commission figée), arrondie au centime inférieur, jamais négative, figée en même temps que la commission au passage en « réalisée ». La grille ci-dessus est conçue pour que cette réduction ne se déclenche jamais en pratique : si elle se déclenche, c'est qu'un tarif ou une commission a changé, et le relevé le signale.

---

## 5. Les trois niveaux

**Partenaire** — tout établissement qui démarre. Page de réservation à son nom et à ses couleurs, lien et QR code avec affiche imprimable, espace réception (réserver, suivre, historique), grille de prix partenaire pour ses clients, organisation complète par Elatransfer, relevé trimestriel, grille Partenaire. Sans engagement, préavis 1 mois.

**Partenaire Privilège** — dès 20 transferts réalisés sur un trimestre, acquis pour le trimestre suivant. En plus : grille Privilège, relevé mensuel par destination, point trimestriel, personnalisation étendue (photo d'en-tête fournie par l'hôtel, texte d'accueil, langue supplémentaire), tablette prêtée dès 30 transferts par trimestre, règlement à 30 jours. Une baisse de niveau est annoncée 15 jours avant.

**Partenaire Signature** — groupes, clusters, 4-5 étoiles, plus de 60 transferts par trimestre, ou premier hôtel d'une zone. Contrat cadre 12 mois, préavis 2 mois, revue à 6 mois. Grille Privilège, reporting consolidé et par site, interlocuteur dédié, délai de réponse engagé aux demandes de la réception, intégration (e-mail de pré-séjour, QR en chambre, PMS plus tard), déploiement planifié un site par semaine. Clause « partenaire référent » : l'hôtel présente Elatransfer en premier, sans interdiction d'un recours ponctuel ailleurs.

**Groupe hôtelier** : les volumes de tous les établissements se cumulent pour le palier ; chaque site garde sa page, son QR, son espace et son relevé ; le siège reçoit le consolidé ; cinq sites et plus = Signature d'office. Un cluster de franchisés n'est pas un groupe : chaque franchisé facture.

Les noms de niveau sont **contractuels et internes** : ils n'apparaissent jamais sur la page client de l'hôtel.

---

## 6. Ce qui a été écarté, et pourquoi (pour ne pas y revenir)

- **Un pourcentage du prix** : dérisoire sur 35 €, destructeur de marge, et le mot « commission » renvoie tout directeur à Booking.
- **« Jusqu'à X % »** : se lit « rarement ».
- **Un taux public sur le site** : devient le plancher de toute négociation.
- **« +X % pendant 3 mois »** : ancre un chiffre plus haut sur trois transferts ; garantir le palier supérieur fait la même chose sans nouveau chiffre.
- **Prime ponctuelle de volume** : se dépense et s'oublie ; un palier se garde.
- **Exclusivité** : un directeur ne la signe pas avec un acteur sans historique, et elle se retourne en responsabilité le soir où il manque un chauffeur.
- **Tablette offerte** : 40 hôtels = 6 000 € dehors avant la première course ; la réception a un PC.
- **Rémunération à la confirmation** plutôt qu'au paiement : ce serait payer sur de l'argent jamais entré.
- **Prime aux réceptionnistes** : risque de corruption privée (L445-1 Code pénal) ; la rémunération va à l'établissement.

---

## 7. Les textes

**Accroche** : « Elatransfer équipe votre établissement, organise chaque transfert, et votre hôtel est rémunéré sur chaque transfert réalisé. »
**Sans risque** : « Aucun abonnement, aucun frais : votre rémunération dépend uniquement de l'activité réalisée. »
**Palier** : « Vos conditions partenaires évoluent avec votre activité, trimestre après trimestre. »
**Promesse** (déjà sur le site) : « Votre réception réserve. Elatransfer gère tout le reste. »

**Pitch 20 secondes**
> « Elatransfer installe gratuitement, à votre nom, une page de réservation de transferts pour vos clients, avec un QR code et un espace pour votre réception. Votre équipe réserve en trois clics, ou le client le fait lui-même depuis sa chambre. Ensuite nous faisons tout : le chauffeur, la confirmation, le paiement, le suivi. Vous n'organisez rien, vous ne facturez rien — et votre établissement est rémunéré sur chaque transfert réalisé. Aucun abonnement, aucun engagement. On peut être en ligne dans 48 heures. »

**Pitch 60 secondes**
> « Vos clients vous demandent tous les jours comment aller à l'aéroport, à Paris, à Disney. Aujourd'hui votre réception cherche un taxi, donne un numéro, et ne sait jamais si le client a été bien servi.
> Elatransfer vous équipe, sans frais : une page de réservation à votre nom et à vos couleurs, un QR code pour vos clients, et un espace réception où votre équipe réserve en trois clics et voit l'état de chaque transfert. Les prix de vos clients sont fixes, connus d'avance, et négociés pour votre établissement.
> Dès qu'une demande arrive, nous prenons le relais : nous choisissons un chauffeur professionnel, nous confirmons au client avec le nom du chauffeur et un lien de paiement, et nous suivons la course jusqu'à l'arrivée. Votre hôtel ne devient jamais transporteur, n'encaisse rien et ne gère aucun litige.
> En retour, votre établissement est rémunéré sur chaque transfert réalisé, avec un relevé chaque trimestre, et des conditions qui s'améliorent avec votre activité. Nous travaillons déjà ainsi avec un hôtel de la zone de Roissy. Je vous montre la page de votre hôtel telle qu'elle serait, et nous pouvons démarrer sous 48 heures. »

(« Un hôtel de la zone de Roissy » reste au singulier et sans nom, comme sur le site. Aucun chiffre, aucun délai de confirmation promis.)

---

## 8. Exemple de rémunération (pour la page 6 du PDF et le simulateur)

Établissement type : 50 transferts par mois — 20 CDG berline, 10 CDG van, 8 Paris/Orly berline, 8 Paris/Orly van, 4 Beauvais berline. CA transport 3 600 €. Commission chauffeur 20 %.

| | Partenaire | Privilège |
|---|---|---|
| Commission Elatransfer | 720 € | 720 € |
| Rémunération de l'hôtel (HT) | **212 €** | **248 €** |
| Coût réel pour Elatransfer (TTC) | 254 € | 298 € |
| **Marge nette Elatransfer** | **466 €** (9,30 €/transfert) | **422 €** (8,45 €/transfert) |

Avec une commission de 25 % sur le canal hôtel : marge nette 646 € et 602 €. Le simulateur interne (à construire après validation, hors site) prend : transferts par tranche de prix, prix moyens pré-remplis depuis la grille de l'hôtel, commission du canal, niveau ; il rend CA, commission, rémunération HT/TTC, marge nette, marge par transfert, et un drapeau rouge si une ligne passe sous la règle.

---

## 9. Ce qui se construit ensuite, dans l'ordre (après vos quatre réponses)

1. **Page « Conditions partenaires »** (une page, remise en rendez-vous) et **PDF 8 pages** : proposition de valeur · comment ça marche · ce que reçoit l'hôtel · ce que reçoit le client · le programme (sans montants) · exemple de rémunération · mise en place (J+0 accord, J+2 page et QR, J+2 formation 20 min, J+7 point, puis trimestriel) · contact.
2. **Simulateur interne** (section 8).
3. **Admin, centre de contrôle** : fiche partenaire (niveau, dates de début et de fin, grille ou « sur mesure », conditions particulières, entité facturante, délai de règlement, matériel prêté) ; calcul figé par course ; relevé trimestriel avec dû / payé / reste et export ; palier proposé automatiquement au premier jour du trimestre, **validé par vous, jamais appliqué seul** ; journal de tout changement. Sept garde-fous : plafond de marge refusé à la saisie, double confirmation au-delà de 25 € ou 15 % du prix moyen, une seule provenance par course, zéro sur annulée / refusée / essai / non payée, levée à la réouverture d'une course, relevé émis verrouillé, changement de grille jamais rétroactif.
4. **Espace réception, onglet « Relevé »** réservé au compte direction (pas au compte partagé du comptoir) : transferts par destination et véhicule, CA généré, rémunération HT/TVA/TTC, statut de règlement, niveau en cours et volume pour le suivant. Jamais la commission chauffeur, la marge, ni un autre hôtel ; le relevé passe le même contrôle que l'écran du comptoir.
5. **Contrat partenaire**, principes à remettre à un juriste : objet (apport d'affaires + outils ; l'hôtel n'est ni transporteur ni mandataire ; Elatransfer centrale de réservation L3142-1) · transfert éligible · calcul et plafond · périodicité, facture ou autofacturation, 30 jours, seuil 50 € · annulations et remboursements régularisés sur le relevé suivant · fraude (réservations fictives, auto-réservations du personnel) = suspension et reprise des sommes · litiges clients traités par Elatransfer, l'hôtel jamais partie · prix clients fixés par Elatransfer, prévenus 30 jours avant · rémunération à l'établissement seul · nom et couleurs autorisés, aucune photo ni logo sans écrit, données clients sous RGPD 5.1.c · durée et sortie par niveau, page hors ligne sous 7 jours, matériel restitué, relevé de clôture · palier trimestriel, baisse notifiée 15 jours avant.

Chaque étape vous sera montrée en capture avant d'être poussée, selon la règle du dépôt.

---

## 10. Benchmark — ce que les sources publiques disent vraiment

| Acteur | Ce qu'il annonce | Ce qu'il en faut retenir |
|---|---|---|
| Welcome Pickups | gratuit + commission par réservation ; 5 % via Touch Stay ; 8 % en affiliation | la référence du marché : « gratuit + une commission », grille non publique |
| Transfeero | commission sur chaque transfert effectué, sans contrat ni minimum | même modèle, service standardisé, aucune relation locale |
| Flibco | revenus pour l'établissement, montant non précisé | navettes partagées, pas de chauffeur dédié |
| World Transfer | 13 % par transfert (agences) | le taux le plus haut vu, sur des paniers élevés |
| Hotelcloud | l'hôtel garde 50 % des commissions | marketplace où l'hôtel vend lui-même |
| Allocab | aucun programme hôtel public | rien à copier |
| Time Attitude (Roissy, CA 1,1 M€ en 2023) | aucune information publique | le concurrent direct par la zone, invisible en ligne |
| Flotivia | aucune source sous ce nom | à vérifier : nom exact ? |

Personne n'affiche un chiffre sérieux. Elatransfer se différencie par ce que l'hôtel ne fait plus (page à son nom, espace réception, humain joignable), par la vitesse (48 h, formation 20 minutes), par un relevé en euros, et par un palier qui se gagne — aucun acteur cité ne récompense la régularité d'un établissement.

Notes /10 de l'offre arrêtée : attractivité 8 · simplicité 9 · rentabilité 8 (chaque ligne tenue à 20 %) · différenciation 8 · fidélisation 8 · capacité à scaler 6 (le traitement reste manuel : c'est le chantier d'après).

Sources : [Welcome Pickups / Mews](https://www.mews.com/en/products/marketplace/welcome-pickups), [Touch Stay](https://touchstay.com/guest-experience-integrations-welcome-pickups), [Travelpayouts](https://www.travelpayouts.com/en/offers/welcome-pickups-partner-program), [Transfeero](https://www.transfeero.com/fr/hotellerie/), [Flibco](https://www.flibco.com/fr/partenariat), [World Transfer](https://dev04.world-transfer.com/for-travel-agencies.html), [Hotelcloud](https://www.lechotouristique.com/article/hotelcloud-digitalise-la-conciergerie,70431), [Allocab](https://www.allocab.com/en/private-driver-service-france), [Time Attitude / Xerfi](https://www.xerfi.com/etudes-par-entreprise/time-attitude_819813411).

---
