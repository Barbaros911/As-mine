# Le registre et « Coller une demande » — histoire et règles détaillées

La règle qui vaut aujourd'hui est dans `CLAUDE.md`, section « Le registre et
« Coller une demande » ». Ici : le texte complet tel qu'il était avant le
rangement du 19 octobre 2026, puis l'histoire du délai de confirmation.

## Le texte d'origine (septembre 2026)

**COLLER UNE DEMANDE**, en haut du tableau de bord. Quand un client écrit
sur WhatsApp plutôt que de passer par le site, sa demande n'existe nulle
part : le presse-papiers est le transport.
- `lireDemandeCollee()` **ne devine rien aux libellés, il lit la PLACE des
  choses** : la référence en tête, une date en JJ/MM/AAAA HH:MM, les deux
  premières valeurs « … : … » pour les adresses, le **dernier** montant en
  euros pour le prix, la dernière ligne « nom — téléphone ». Un test le
  vérifie avec un message aux libellés anglais.
  **Changer la forme du message client oblige à changer ce lecteur**, et
  inversement — les deux se lisent ensemble.
- **La course entre TOUJOURS en `attente`**, jamais confirmée d'office.
- **Une minuterie de 1,2 s ouvre le champ de repli** : certains navigateurs
  rejettent la lecture du presse-papiers (le `catch` suffit), d'autres
  laissent la promesse **en attente indéfiniment** — sans minuterie, le
  bouton ne fait alors rien du tout, sans un mot.
- Le champ **reste ouvert** après un ajout, vidé : les demandes arrivent
  par trois ou quatre d'affilée.

**LE REGISTRE** (bouton « Registre et résultats ») : la semaine en cours
avec la précédente en rappel, le résultat par semaine / mois / année, le
tableau des chauffeurs, la recherche libre, la sauvegarde JSON, l'export
CSV et la restauration.
- **Les chiffres ne comptent QUE les courses `realisee`.** Une course
  confirmée n'est pas une course faite : la compter ferait prendre des
  promesses pour de l'argent encaissé.
- **La date retenue est celle de la COURSE**, pas de la saisie, sinon les
  semaines se décalent au fil des oublis.
- **La recherche porte sur TOUT le registre**, pas seulement les
  réalisées : quand un client rappelle, c'est sa course à venir qu'on
  cherche.
- **Le CSV est en point-virgule avec un BOM** : Excel français lit le CSV
  au séparateur de sa locale, et une virgule met tout dans une colonne.
- **La restauration AJOUTE et n'écrase jamais** — une course d'ici peut
  avoir avancé depuis la sauvegarde.

## Le délai de confirmation (19 octobre 2026)

Audit des priorités du 19/10/2026 : après le formulaire, le vrai levier de
conversion est la vitesse de réponse. Le client ne paie qu'après la
confirmation (lien de paiement du chauffeur) : une demande qui attend
40 minutes est un client qui réserve un VTC d'une application. Personne ne
savait combien de temps les réponses prenaient. Barbaros : « Oui ».

- **Ce qui est mesuré** : pour chaque demande DÉPOSÉE PAR LE SITE — elle
  porte `securite.empreinteDepot`, que pose `deposer-course` (accueil, page
  d'hôtel, comptoir) —, le temps entre son arrivée (`cree`, posé par le
  serveur) et le premier « Confirmer » (`confirmeeLe`).
- **`confirmeeLe` est posé par `majCourse`, une seule fois, et seulement au
  passage d'« attente » à « confirmée »**. « Remettre en confirmée » part
  d'une course réalisée : elle a été confirmée bien avant, l'heure ne bouge
  pas, et si elle n'en avait pas (confirmée avant la mesure), on n'en invente
  pas. La saisie au téléphone crée la course déjà confirmée, sans passer par
  `majCourse` : elle n'a attendu personne. Le champ part au serveur avec le
  bon entier (`nuage.envoyerCourse`) : tous les appareils le voient.
- **Ne comptent pas** : les saisies et les demandes collées (aucune
  empreinte), les courses d'essai (`comptable()`), les courses confirmées
  avant le 19/10/2026 (aucune heure). C'est écrit sous le bloc.
- **La médiane, pas la moyenne** : une demande oubliée une nuit ne doit pas
  cacher que les neuf autres ont eu leur réponse en cinq minutes. À côté : la
  part confirmée en moins de 15 min (`DELAI_CIBLE_MIN`), la plus longue (par
  son N°, pour la retrouver) et les demandes du site encore sans réponse.
- **La période EN COURS** (semaine depuis lundi, mois, année), comme le
  graphique des chauffeurs, et par date d'ARRIVÉE de la demande, pas de la
  course : on mesure une réponse, pas un trajet.
- **Ce qui a été écarté** : un délai jusqu'au refus (on mesure la réponse
  qu'attend le client : la confirmation), un délai séparé pour les départs
  dans moins de 24 h (trop peu de demandes pour deux chiffres), et toute
  donnée serveur nouvelle (aucune migration : le bon accepte le champ).
- `test-admin-delai.mjs`, sur le site construit : horloge figée pour la
  partie du registre seulement (le double appui de « Remettre en confirmée »
  exige 700 ms qu'une horloge figée ne laisse jamais passer). Trois
  falsifications tombent : heure jamais posée (2 contrôles), garde
  « depuis attente » retirée (1), filtre « demandes du site » retiré (6).
