# Le titre et le bandeau d'accueil — archive

> **Ceci est une archive, figée le 6 octobre 2026.** Le titre « qui, quoi, où »
> de septembre et l'accroche en cinq lignes ont été remplacés par le
> positionnement à deux activités (voir `CLAUDE.md`, section « LE
> POSITIONNEMENT — DEUX ACTIVITÉS, UN SEUL SITE »). Rien n'a été réécrit
> ci-dessous ; ce qui y est dit du texte du bandeau est périmé, ce qui y est
> dit de sa MÉCANIQUE (pas de hauteur fixe, bouton dans les 844 px, titre
> coupé à la taille sous 360 px) reste vrai.

### LE TITRE D'ACCUEIL DIT QUI, QUOI ET OÙ

Septembre 2026, sur sa relecture commerciale : « le client doit comprendre
qui tu es + ce que tu fais + où tu opères en une seconde ». Il avait raison,
et sa remarque a découvert un défaut plus grave que le style.

- **LE SOUS-TITRE VENDAIT DEUX PRESTATIONS QU'ON NE PEUT PAS RÉSERVER.**
  « Transferts privés, **mises à disposition** et **déplacements sur
  mesure** » — la mise à disposition a été retirée du site en septembre 2026,
  et « sur mesure » n'existe nulle part. Le paragraphe `seo_texte` avait été
  nettoyé à l'époque ; **ce titre-là avait été oublié**. Un site qui décrit
  une prestation qu'on ne peut pas commander est une promesse en l'air.
- **« à Paris et en Île-de-France » NE TIENT PAS DANS LE TITRE.** Mesuré :
  27 caractères pour une largeur qui en tient 21 à cette taille — il cassait
  en trois lignes avec « France » toute seule. Le titre dit donc **« à
  Paris »**, ce que cherche un visiteur qui atterrit à Roissy, et le
  sous-titre ouvre aussitôt à **« Toute l'Île-de-France »** : ses clients
  réservent depuis Argenteuil et Saint-Denis, un titre qui les exclurait leur
  ferait croire que ce n'est pas pour eux.
- **LE BOUTON DIT « VOIR MON PRIX », ET C'EST LE SEUL POINT OÙ ON NE L'A PAS
  SUIVI.** Il proposait « Réserver mon trajet ». Deux raisons : le bloc
  s'intitule **déjà** « Réserver un trajet » cinq centimètres au-dessus — un
  bouton qui répète le titre de sa propre carte n'ajoute rien ; et **le clic
  ne réserve pas, il affiche un prix**. « Voir les tarifs et véhicules »
  n'était pas bon non plus : trop long, et « les tarifs » laisse croire à une
  grille. C'est le même arbitrage que sur l'ancien site, pour la même raison.

### LE BANDEAU EST DEVENU UNE VRAIE ACCROCHE

Septembre 2026, sa relecture suivante : « Le site commence directement avec
du contenu fonctionnel : *Réserver un trajet / Simple, rapide et sécurisé*.
C'est fonctionnel, mais pas suffisamment premium ni commercial. Je veux une
vraie Hero. » Cinq lignes : le titre, les destinations, le prix ferme, un
bouton, et la réassurance.

- **« à Paris et en Île-de-France » EST REVENU DANS LE TITRE**, et la note
  du dessus n'est plus qu'à moitié vraie : ce qui ne tenait pas, c'était
  27 caractères sur **deux** lignes. Le titre est maintenant coupé **à la
  main en trois** — « Votre chauffeur privé / à Paris / et en Île-de-France ».
  Un titre d'affiche se compose, il ne se subit pas.
- **LE NOM DE LA MARQUE N'EST PAS RÉPÉTÉ DANS LE BANDEAU**, alors qu'il le
  demandait. « ELATRANSFER » est écrit en 23 px **à deux centimètres
  au-dessus**, dans l'enseigne, sur tous les écrans. L'écrire deux fois dans
  le même regard ne dit pas la marque plus fort : ça mange la seule ressource
  rare du bandeau — la hauteur — au détriment de ce que le visiteur cherche.
  Dit à Barbaros ; il tranchera s'il y tient.
- **LE TEXTE N'EST PLUS EN `position:absolute`, ET C'EST CE QUI PERMET TOUT
  LE RESTE.** Posé en `inset:0`, il obligeait `.hero` à porter une **hauteur
  fixe** (268 px) : toute ligne ajoutée serait sortie par le bas **en
  silence** — la photo ne bouge pas, le texte disparaît. Dans le flux, c'est
  le contenu qui donne la hauteur. Seuls la photo et le voile restent en
  absolu, ils n'ont rien à mesurer. Un contrôle vérifie que **rien ne sort du
  bandeau par le bas**.
- **LES 74 px DE MARGE BASSE NE SONT PAS DE LA RESPIRATION** : la carte
  « Réserver » remonte de 46 px par-dessus. Sans eux, elle recouvrirait la
  ligne « 24 h/24 » — exactement le défaut du bandeau de cookies sur l'ancien
  site.
- **LE BOUTON DU BANDEAU NE RÉSERVE RIEN**, il descend au formulaire et pose
  le curseur dans le champ de départ. Il n'y a rien à réserver tant qu'on ne
  sait pas d'où à où. **Le défilement est lancé d'abord, le focus arrive
  380 ms après** : le navigateur amène de force un champ focalisé à l'écran,
  et un focus posé en premier annule l'animation qu'on vient de lancer.
- **C'EST LUI QUI PAIE LA HAUTEUR DU BANDEAU.** Le formulaire ne tient plus
  dans le premier écran — la note « ne pas le remonter » de l'ancien site est
  caduque ici. Le marché est explicite : le bandeau prend la place, il rend
  une action. Un contrôle mesure que **le bouton reste dans les 844 px** ;
  s'il en sort un jour, le bandeau aura seulement éloigné la réservation.
- **LE SOUS-TITRE N'A PLUS DE `max-width`.** Les 30 ch dataient de l'époque
  où c'était une phrase ; c'est devenu une liste de destinations, et une
  liste qui casse en deux se lit comme deux listes. Un contrôle vérifie
  qu'elle tient sur **une** ligne.
- **UN IPHONE SE FAIT 320 px**, et le titre y passait à **quatre** lignes.
  Les coupures écrites à la main ne protègent que de la casse qu'on a
  prévue ; celle-là se règle à la taille (26 px sous 360 px). Deux contrôles
  à 320 px.
- **DISNEYLAND EST UNE DESTINATION, PAS UNE OFFRE.** Le nommer est un usage
  descriptif — on dit où l'on conduit. **Ne pas en refaire un « pack »** : il
  a été retiré à sa demande, c'était le premier des deux.
