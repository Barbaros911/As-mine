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

## Lot P2 — optimisations techniques (6 octobre 2026)

Avis donné d'abord, puis « fais ce que tu penses être le meilleur ». Mesuré sur
le site construit, jamais sur le dépôt : chaque défaut naissait d'une étape de
`construire.sh`.
- **Canonique sur des pages `noindex`** : `/ela-admin/`, `/easyhotel-reception/`,
  `/reception/easyhotel-aeroville/`, `/ela-public/` héritaient de celle de
  l'accueil. Retirée par `construire-espaces-hotel.mjs` (`sansCanonique`) et
  dans `sites/ela-public/`. Le contrôle parcourt TOUTE page publiée.
- **Deux séries og:/twitter:, deux manifestes, deux couleurs** : la seconde
  venait de `seo-ela.mjs`. Elle portait la seule image de partage
  (`icon-180.png`), reprise dans `index.html`. Les navigateurs lisaient déjà
  la première couleur (#16232B) et le premier manifeste (celui de l'échange
  exploitant) : aucun changement visible. Les deux lignes d'icônes de
  `seo-ela.mjs` sont RESTÉES : en retirer une peut changer l'image de l'onglet.
- **`hotel-engine-polish.css/.js` sur l'accueil** : 45 Ko, deux requêtes ;
  toutes leurs règles visent une page d'hôtel et `?h=` part vers
  `/application.html` avant tout dessin. Retirés de la seule page publique ;
  l'application et la réception les gardent (le service worker les met
  toujours en cache pour le flyer hors ligne).
- **Poids de l'accueil** : 1 148 → 607 Ko, 13 → 11 requêtes. Le logo
  (141 Ko) devient le plus gros fichier après la page : on n'y touche pas.
- Contre l'ancien code, 14 contrôles tombent ; le logo falsifié (un octet
  ajouté, un filtre gris), 3 tombent.
- **`www.elatransfer.com` ne résout pas** (aucun enregistrement). Réglage
  Cloudflare, à faire par Barbaros, une action à la fois.

