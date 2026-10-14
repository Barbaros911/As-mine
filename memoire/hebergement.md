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
