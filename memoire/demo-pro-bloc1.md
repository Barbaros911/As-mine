# Démo professionnels — bloc 1 : la page /professionnels/

8 octobre 2026, mission « Démo professionnels » cadrée avec Barbaros. Trois
sessions en parallèle ; ce bloc ne fait que la page publique et le lien
depuis l'accueil.

## Ce qui existe
- `professionnels/index.html` : page autonome (styles et textes dedans),
  indexable, canonique `https://elatransfer.com/professionnels/`, au plan du
  site. Bleu nuit / cyan / blanc, Figtree, logo négatif du site. Aucune autre
  image. Français écrit dans la page (c'est lui que lit Google), anglais à
  l'appui du bouton EN, mémorisé sous `ela_langue` comme le site ; `?lang=en`
  force l'anglais.
- Ancres : `#demo` (bouton principal « Voir la démo hôtel ») et `#contact`.
  **`#demo` ne porte PAS encore de formulaire** : il arrive au bloc 4, dans
  cette section. D'ici là elle dit « Appelez-nous ou écrivez-nous », avec
  téléphone, WhatsApp et e-mail — rien de mort en ligne.
- Accueil : seul le bouton de `#modele` change — « Voir la démo hôtel » /
  « See the hotel demo » → `/professionnels/`, lien e-mail gardé.
- `construire.sh` : copie du dossier, commentaires retirés, noms réservés
  `professionnels` et `demo` (un site vitrine ainsi nommé écraserait la page
  ou la démo du bloc 3). `sw.js` non touché : un sous-dossier hors de
  `NOS_DOSSIERS` est laissé au réseau, ce qui suffit à une page de vente.

## Pourquoi c'est écrit ainsi
- **Le vol en retard reprend MOT POUR MOT la règle de l'accueil** (« jusqu'à 60 minutes… sans frais », CGV
  art. 7). `test-nouveau-bascule` exige des pages du plan des réponses
  identiques à l'accueil ; la page pro pose des questions que l'accueil ne
  pose pas (coût, engagement, données), donc elle seule est éprouvée sur la
  question partagée. Ses autres réponses sont gardées par `test-pro-page`.
- « Qui voit nos données » ne dit que ce que la politique de confidentialité
  et l'espace réception font déjà : la réception ne voit que ses courses, le
  chauffeur retenu seul reçoit le nécessaire, rien n'est vendu.
- Les liens légaux passent par `/?doc=mentions|privacy` (lus par l'accueil).
- Aucun chiffre hors du numéro, du récit « 7 h / 5 h » et des 60 minutes de
  la FAQ ; jamais « nos partenaires », ni easyHotel, ni « prix ferme ».

## Tests
`test-pro-page.mjs` (70 contrôles, site construit, 9 largeurs × 2 langues).
Éprouvé contre un débordement, un mot interdit et l'ancien bouton de
l'accueil : il tombe à chaque fois. `test-public-textes` lit aussi la page.
