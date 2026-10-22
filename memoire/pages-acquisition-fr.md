# Les pages d'acquisition françaises — CDG, Orly, chauffeur privé

Histoire de `transfert-cdg-paris.html`, `transfert-orly-paris.html` et
`chauffeur-prive-paris.html`, les trois pages statiques par lesquelles Google
amène un visiteur français. Leur place dans le référencement est décrite
dans `SEO-INTERNATIONAL.md` ; ici, ce qu'elles disent et pourquoi.

## 22 octobre 2026 — de la page « mode d'emploi » à la page qui convainc

Mission de Barbaros : rendre le site public plus convaincant commercialement,
sans refaire le design ni ajouter de grosse fonctionnalité, et sans gêner le
travail en cours ailleurs (PR #400 sur `/professionnels/`, Issue #399 de
Codex sur le dépôt de réservation dans `index.html`). Les trois pages
françaises étaient la zone la plus faible du site **et** la seule zone à
fort trafic potentiel que personne ne touchait : c'est elle qui a été
traitée. `index.html` et `/professionnels/` n'ont pas bougé.

**Ce qui n'allait pas, mesuré sur le site construit à 390 × 844 :**
- le sous-titre parlait de l'interface, pas du voyageur (« Préparez votre
  prise en charge dans le bon sens. Vous choisirez ensuite votre terminal
  exact dans le parcours de réservation ») ; les trois cartes aussi (« Le
  parcours vous demande de sélectionner… »). Un visiteur venu de Google lit
  un mode d'emploi avant de savoir ce qu'on lui vend ;
- après le bandeau, **aucun bouton de réservation avant 3 300 px** : la
  seule reprise était la bande du bas de page. Les pages anglaises ont une
  barre du pouce depuis le 14/10 ; les françaises, rien ;
- **aucun lien vers les CGV, la confidentialité ni les mentions légales**
  dans le pied (les pages anglaises les ont) : la LCEN veut ces mentions
  accessibles depuis chaque page, et un pied sans elles fait amateur ;
- aucun bloc « qui vous conduit », « rien à payer à la réservation », « si
  vos plans changent » — ce que les pages anglaises disent dans « Good to
  know » depuis le 14/10. Les deux questions qui freinent le plus une
  réservation (« est-ce une vraie société ? », « et si j'annule ? ») restaient
  sans réponse en français ;
- aucune balise Open Graph : un lien partagé sur WhatsApp — le premier
  canal de ce métier — s'affichait sans titre propre ni image ;
- des pictogrammes en caractères texte (✈ ⌖ €) rendus différemment selon
  le téléphone, là où les pages anglaises dessinent les leurs en SVG.

**Ce qui a été fait, et les règles tenues :**
- Sous-titre et cartes réécrits en bénéfices : le bon terminal, le vol
  suivi, le prix avant d'envoyer. Même pictogrammes SVG que `/en/`.
- Blocs ajoutés, calqués sur les pages anglaises déjà validées : « Votre
  prise en charge à Roissy-CDG / à Orly » (cinq cartes pratiques), « Pour
  quels trajets » (page chauffeur), « Bon à savoir avant de réserver »
  (rien à payer, si vos plans changent, qui vous conduit, nous joindre),
  « Qui est Elatransfer » avec les trois liens légaux (`/?doc=cgv`,
  `/?doc=privacy`, `/?doc=mentions`, lus par `index.html`).
- **« Si vos plans changent » n'est pas la question « Puis-je annuler ? »**,
  retirée par Barbaros le 11/10 (« ça sert à rien », `test-nouveau-paiement`
  refuse son retour). C'est la formulation des pages anglaises, acceptée le
  14/10, et elle dit exactement les CGV art. 7 et 8 : sans frais tant que
  ce n'est pas payé, non remboursé une fois payé, remboursé en totalité si
  la course n'a pas lieu de notre fait. Toucher aux CGV, c'est relire ces
  quatre lignes.
- **Barre du pouce sur téléphone** (`.barre`, ≤ 760 px) : « Voir mon
  prix », Appeler, WhatsApp — le même dessin que `landing.css`, écrit dans
  `seo-pages.css`. Le corps réserve sa hauteur (`padding-bottom`) : mesuré,
  aucun lien du pied ne passe dessous. « Voir mon prix » porte
  `data-mesure="reserver"` : `mesure.js` le compte comme les autres.
- Balises Open Graph et Twitter, `theme-color`, lien d'évitement
  (`.saut`), `viewport-fit=cover` pour la barre sous l'encoche.
- Les trois questions fréquentes restent **mot pour mot celles de
  l'accueil** : une réponse qui dirait autre chose que le contrat serait
  opposable contre nous.
- Aucun mot interdit par `test-public-textes` (solution, mobilité,
  plateforme, conciergerie, canal, « ferme » hors contrat, « WhatsApp ou
  SMS »), ni « VTC », ni « taxi », ni prix chiffré : le tarif vit sur le
  serveur, pas dans une page statique.
- **Aucun commentaire HTML dans ces trois fichiers** : `construire.sh` ne
  les passe pas par `masquer-commentaires.mjs`, tout ce qu'on y écrirait
  partirait en ligne. C'est pour ça que l'histoire est ici.
- `sitemap.xml` : `lastmod` des trois pages au 22/10/2026.

**Mesuré après, sur le site construit** (`verif-fr.mjs`, hors dépôt) :
320, 390 et 1366 px, les trois pages — aucune erreur JavaScript, aucun
débordement horizontal, H1 et bouton de réservation au premier écran et sous
le doigt, barre présente sur téléphone et absente sur ordinateur, aucun lien
sous la barre page déroulée, boutons et liens de pied ≥ 44 px, contraste du
texte courant ≥ 4,5, un seul H1, tous les liens internes répondent sur le
site construit, `/?doc=cgv` ouvre bien les CGV en français. Poids : 14 à
15 Ko par page, aucune image ajoutée.

**Piège de mesure rencontré** : un lien **en ligne** qui passe à la ligne a
une boîte englobante dont le centre tombe *entre* ses deux lignes ;
`elementFromPoint` y rend le paragraphe, et un contrôle « rien sous la barre »
crie à tort. Mesurer sur `getClientRects()[0]`, ou ne viser que des boutons
(c'est ce que fait `test-seo-en`).

**Deuxième passe le même soir, sur sa capture : « beaucoup trop de blanc,
trop vide, trop de texte ».** Vu sur l'ordinateur : le bandeau vide à
droite, des cartes qui flottent sur du blanc, un paragraphe par bloc.
Corrigé dans `seo-pages.css` et les trois pages, qui sortent maintenant d'un
seul squelette (`generer-pages-fr.py`, hors dépôt, dans le bac à sable) :
- **le bandeau porte la carte du trajet à droite** dès 980 px (CDG → PAR,
  trois faits), comme les pages anglaises ; rien à charger ;
- **les blocs sont des bandes qui alternent** blanc, bleu glacé, bleu nuit
  (`.band`, `.band.ice`, `.band.navy`), chacune avec sa colonne `.in` : un
  bloc = un fond, pas un paragraphe de plus ;
- **les textes sont coupés** : une phrase par carte, quatre étapes d'une
  ligne, « Bon à savoir » en quatre tuiles courtes, le paragraphe « Qui est
  Elatransfer » retiré (le fond est dans « Qui vous conduit », les liens
  légaux dans le pied) ;
- marges resserrées (`.band` 34 px, 26 px sur téléphone ; cartes 18 px).
Mesuré : page CDG de 4 265 à 3 017 px de haut à 1366 px, de 7 256 à 5 552 px à
390 px, pour le même contenu utile. Les 98 contrôles de `verif-fr.mjs`
passent (contraste de `.intro` relevé à #58697b sur le bleu glacé : 4,4 → 5,2).
**Piège de mesure** : un fond en `linear-gradient` a un `backgroundColor`
transparent ; un calcul de contraste qui remonte les parents croit lire du
blanc sous du texte blanc.

## Ce qui n'a pas été fait, et pourquoi

- **L'accueil (`index.html`)** : zone de Codex (#399) pendant cette mission,
  et son premier écran est déjà le plus solide du site. Ce qui y manque
  encore, à décider avec Barbaros : une question fréquente « Quand ma
  réservation est-elle confirmée ? » (la réponse est l'art. 3 des CGV), et
  dire sous le formulaire que rien n'est payé à la réservation.
- **`/professionnels/`** : PR #400 en cours (page devenue outil de vente).
- **La mesure du parcours** : l'existant compte déjà `page_vue`,
  `clic_reserver`, `moteur_ouvert`, `formulaire_commence`, `prix_demande`,
  `prix_affiche`, `demande_envoyee` (plus appel et WhatsApp), par page
  d'origine, sans traceur. Manquent `vehicule_choisi`, `recap_vu` et
  `demande_echouee`. **Ils ne s'ajoutent pas côté page** : la liste des
  événements est fermée dans la fonction `mesure` ET dans la contrainte SQL
  `trafic_evenement_valide` (`20261015010000_mesure_trafic.sql`). Il faut
  une migration qui élargit la contrainte, la fonction, puis trois appels
  `mesurerVisite()` dans le moteur (après `dessinerGammes`/clic sur une
  gamme, à l'ouverture de `#ecran-recap`, dans la branche d'échec du
  dépôt). Zone serveur et zone Codex : pas dans cette mission.
- **Pages anglaises, téléphone** : le bandeau porte Call et WhatsApp alors
  que la barre du pouce les porte aussi au même instant ; masquer
  `.hero .contact` sous 760 px gagnerait 70 px. `test-seo-en` l'accepte
  (il admet le bouton du bandeau *ou* celui de la barre). Petit gain, pas
  fait pour ne pas élargir la PR.
