# La marque et le référencement — archive

> **Ceci est une archive, figée le 5 octobre 2026.** Ce qui reste vrai est
> dans `CLAUDE.md`, section « LE SITE SE PRÉSENTE PAR SA MARQUE ». Depuis ce
> jour la marque s'écrit « Elatransfer » partout, admin et hôtel compris : ce
> qui est dit plus bas d'« ELA Transfer » et de l'empreinte du contrôle de
> production est périmé. Rien n'a été réécrit ci-dessous.

## LE SITE SE PRÉSENTE PAR SA MARQUE — ET LE CONTRÔLE DE PRODUCTION A CRIÉ

4 octobre 2026. Barbaros a poussé directement sur `main` (7dc2349) un
nouveau titre — « Elatransfer — Transferts privés & solutions de
réservation » — et un nouveau paragraphe pour les professionnels ; la PR
#302 (branche `ai-dev`, ChatGPT) portait la description assortie, validée
par lui. Deux minutes après la publication, le monitoring a ouvert l'Issue
#300 : « sert une AUTRE page ». **Le site était parfaitement servi** — c'est
l'empreinte du contrôleur qui était un libellé.
- **« Chauffeur privé » n'est plus la règle du référencement.** Depuis la
  phase 1 de l'audit (septembre), le titre devait « mener avec le métier,
  les aéroports après ». Barbaros a repositionné le site : des transferts
  privés ET des solutions de réservation pour ses partenaires. Le titre
  mène donc avec la **marque**, puis dit ce qu'elle vend. `test-nouveau-bascule`
  éprouve cette règle-là (marque en tête, « transfert » dans le titre et la
  description) et plus l'ancienne — un contrôle qui l'aurait gardée aurait
  exigé un texte que Barbaros a retiré.
- **L'empreinte de `verifier-production.mjs` est « Elatransfer »**, en un
  mot, pour `/` et `application.html`. Aucune autre porte ne le porte ainsi
  (l'admin dit « ELA Transfer », l'hôtel « × ELA Transfer ») : l'empreinte
  distingue toujours la bonne page d'un listage ou d'un mauvais réglage,
  et elle survit au prochain changement de titre. *Un libellé se reformule,
  une marque non.*
- **DÉPÔT ET SITE CONSTRUIT DOIVENT DIRE LA MÊME CHOSE.** `seo-ela.mjs`
  réécrit le titre et la description dans `site/index.html` : la nuit du
  4 octobre, le dépôt disait l'ancienne description et le script la
  nouvelle — deux vérités, Google lit l'une et le client l'autre. Les deux
  sont alignées, et un contrôle de `test-nouveau-bascule` compare désormais
  le site servi au dépôt plutôt qu'à une constante recopiée.
- **CE QUI N'A PAS ÉTÉ TOUCHÉ, ET C'EST SA DÉCISION.** Un premier jet avait
  traduit en anglais le nouveau paragraphe des professionnels et réécrit
  `og:description` / `twitter:description`. Barbaros ne l'avait pas demandé
  (« il ne restait que la méta-description ») : les deux ont été retirés
  avant la fusion. L'anglais garde donc ses trois lignes d'avant, ce que
  son commit disait déjà (« la version anglaise conserve sa traduction
  dédiée »). *Une consigne écrite dans un commentaire de commit est une
  consigne, pas un oubli à rattraper.*
- **LES APERÇUS DE PARTAGE ONT SUIVI, ENSUITE, À SA DEMANDE** (« Oui », même
  nuit). `og:description` et `twitter:description` disent la description de
  la page. **Le site publié porte DEUX exemplaires de chaque aperçu** —
  celui de `index.html`, puis celui qu'ajoute `seo-ela.mjs` — et un réseau
  social lit en général le premier : c'était l'ancien, qui vendait encore
  « mises à disposition ». `test-nouveau-bascule` exige maintenant que TOUS
  les exemplaires disent la description.
- **La PR #302 a été fermée sans fusion** : elle portait la même
  description, et elle était en conflit avec `main` depuis le push direct.
