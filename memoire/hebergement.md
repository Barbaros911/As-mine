# Hébergement et preuve de publication

## Ne jamais changer un réglage par défaut qu'on ne peut pas éprouver (4 septembre 2026)

`html_handling` avait été mis à `"none"` pour que `/admin.html` garde son
extension — une intuition, invérifiable depuis la machine de travail, qui n'a
aucun accès réseau vers Cloudflare. `"none"` ne sert que les chemins **exacts**
et supprime du même coup la résolution des **dossiers** : `/demos/` affichait le
site de réservation à la place de la galerie, et la racine `/` ne fonctionnait
que par le repli « adresse inconnue ». Barbaros l'a vu au premier essai. Le
défaut (`auto-trailing-slash`) était correct. Quand on ne peut pas tester, on
garde le défaut, et on ne le change que sur un symptôme constaté.

## Quel commit est en ligne ? (14 octobre 2026)

Mission « alignement production ↔ dépôt » : la version servie semblait ne pas
suivre `main` sur le paiement. Ce qui a été mesuré :

- La machine de travail ne joint pas `elatransfer.com` (refus 403 du réseau) :
  rien ne pouvait être affirmé du site en ligne depuis elle.
- Le monitoring de production (GitHub Actions) passait au vert toutes les 6 h,
  mais il ne vérifiait que des titres et des boutons : **rien ne disait quel
  commit était servi**. Une production restée sur un ancien commit répondait
  200 partout, avec les bons titres.
- Le `main` du 12/10 (commit `4eb1b6f`) contenait encore, **masqués**, les
  boutons carte / espèces, « Aucun paiement en ligne nécessaire » et le bouton
  iMessage, et la politique de confidentialité disait « le Client règle
  actuellement le chauffeur directement » et nommait iMessage. Servi tel quel,
  le HTML en ligne portait donc l'ancienne règle : quiconque lisait la page
  (ChatGPT lit le site publié) concluait que la production était en retard.
- La démo des professionnels montrait une course d'exemple « Carte bancaire ».

Ce qui a été fait : les éléments masqués retirés de `index.html` (donc de
toutes les pages construites à partir d'elle), la politique corrigée (FR/EN,
date mise à jour), la démo passée au lien ; `construire.sh` écrit
`/version.json` (commit, version du cache, date) et refuse de construire si un
texte de `.github/scripts/textes-interdits.mjs` revient ; `verifier-production.mjs`
lit `/version.json` et les pages servies, et le monitoring exige le dernier
`main`. L'admin, `bon-client.js` et le lecteur de demandes sont exemptés : ils
relisent des courses enregistrées avant le 10/10/2026, avec leur mode de
règlement d'alors.

La configuration Cloudflare (branche, commande) vit dans son tableau de bord,
invisible d'ici : c'est `/version.json` qui dit, de l'extérieur, si elle
publie bien `main`.

## Les aperçus Cloudflare par branche sont coupés (15 octobre 2026)

Barbaros a retapé « elatransfer » dans Safari et son historique lui a proposé
`claude-elatransfer-desktop-audit-refonte-rtoaoo-as-mine.burak91oruc.workers.dev` :
un site figé au 6 octobre, « Tous vos déplacements, une seule solution »,
« solutions de mobilité » — deux mots retirés le 8 octobre. C'était l'aperçu
que Cloudflare Workers fabrique pour chaque branche poussée, et il survit à la
suppression de la branche (la PR #328 était fusionnée depuis neuf jours, la
branche effacée). Aucun contrôle ne regarde `workers.dev` : le monitoring ne
lit qu'`elatransfer.com`, les suites éprouvent le dépôt.
- `wrangler.jsonc` porte désormais `"preview_urls": false` (clé lue dans le
  schéma de wrangler 4.151, la documentation en ligne étant injoignable
  d'ici). Il prend effet au premier déploiement de `main` qui suit : toutes les
  adresses `<branche>-as-mine.…workers.dev` s'arrêtent, anciennes comprises.
- `workers_dev` n'est pas touché : on ne voit pas d'ici comment le domaine est
  relié au Worker, et le couper pourrait couper le site. À éprouver un jour
  depuis le tableau de bord, jamais à l'aveugle.
- Même jour, ménage : deux branches fusionnées sans PR à elles (donc jamais
  supprimées par `branche-apres-fusion.yml`) sont inscrites dans
  `.github/branches-a-supprimer.txt`, avec leur dernier commit — zéro commit
  absent de main, diff vide. Barbaros lance « Nettoyage des branches » en
  tapant SUPPRIMER. Retirés aussi : le plan d'août de la refonte « façon
  Uber » de l'ancien site et trois scripts de capture d'Admin v2 qu'aucun
  test ni workflow n'appelait. Preuve que rien ne change en ligne : le site
  construit avant et après est identique, fichier par fichier.

## L'ancienne icône dans Safari (15–16 octobre 2026)

Capture de Barbaros : la suggestion « Chauffeur privé à Paris… elatransfer.com »
portait encore le rond sombre de septembre, alors que tous les fichiers
d'icône du dépôt sont le logo bleu. Les trois pages françaises de référencement
(`chauffeur-prive-paris`, `transfert-cdg-paris`, `transfert-orly-paris`) ne
déclaraient aucune icône, et `/favicon.ico` comme `/apple-touch-icon.png`
n'existaient pas : Cloudflare y servait l'accueil en HTML (règle
« single-page-application »). Safari n'avait donc rien de neuf à lire et
gardait son image en mémoire.
- Les trois pages déclarent `/icon-32.png` et `/icon-180.png`, comme les pages
  `/en/`. `favicon.ico` (16, 32, 48 px) est fabriqué une fois depuis
  `icon-180.png` et versionné ; `apple-touch-icon.png` est une copie faite
  par `construire.sh`. Aucun second dessin : le logo ne bouge pas.
- `test-nouveau-bascule` exige qu'une page publique non redirigée déclare son
  icône et que les deux adresses par défaut soient de vrais fichiers ; sur
  l'ancien code, trois contrôles tombent en nommant les trois pages.
- Le téléphone garde son ancienne image jusqu'à sa prochaine visite de la
  page. Rien ne peut l'effacer à distance.
