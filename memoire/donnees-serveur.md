# Les données métier de l'admin sur le serveur — histoire

## LE CONSTAT (24 octobre 2026, P1)

Le carnet des chauffeurs (`ela_chauffeurs`), les règlements reçus des
chauffeurs (`ela_paiements_chauffeurs`), les factures de commission
(`ela_factures`) et leur rang (`ela_rang_facture`), l'identité de l'émetteur
(`ela_entreprise`) et le lien d'avis (`ela_lien_avis`) ne vivaient QUE dans
le `localStorage` du téléphone de Barbaros. Téléphone perdu, cassé, ou
stockage vidé par Safari : tout partait, et la seule parade était le rappel
de sauvegarde hebdomadaire. Un second appareil ne voyait rien. Deux appareils
pouvaient émettre le même numéro de facture (L441-9 : ni trou, ni doublon).

L'ancienne règle de `CLAUDE.md` : « **Ne vivent QUE sur l'appareil** : le
carnet, les paiements des chauffeurs, les factures et leur numérotation,
l'identité de l'émetteur, le lien d'avis. D'où le rappel de sauvegarde
(`#bordSauvegarde`, 7 jours). La sauvegarde (`{format:"elatransfer-1"}`) se
restaure en AJOUTANT, garde le plus grand rang de facture, et lit encore
l'ancien format. »

## CE QUI A ÉTÉ RÉUTILISÉ, PAS DUPLIQUÉ

Admin v2 (non publié depuis le 3/10) avait déjà `chauffeurs`,
`compteur_factures` et `factures_commission`, mais l'admin publié ne s'en
servait pas, et sa facture serveur (`ela_emettre_facture_commission`)
calcule la commission autrement (taux du carnet en % seulement, attributions
obligatoires) : la rebrancher aurait CHANGÉ les commissions. On garde donc le
calcul de l'admin (`commissionDe`) et on réutilise la table, le compteur et
le même fil de numéros ; le serveur vérifie seulement que les comptes tombent
juste. Une seule table neuve : `reglements_chauffeurs` (la table `paiements`
est celle de Stripe).

## LES CHOIX

- **Identifiants tirés par l'appareil** (`CH-…`, `P-…`, une clé d'émission
  par facture préparée) : rejouer un envoi ne crée jamais de doublon.
- **Versions sur le carnet** : un appareil parti d'une version dépassée est
  refusé (`conflit_version`), l'écran le dit et affiche la fiche du serveur.
- **Numéro de facture** : `insert … on conflict … returning` sur
  `compteur_factures`, dans la transaction qui verrouille les courses
  (`for update`) et les marque. Éprouvé avec deux vraies sessions (dblink).
- **L'import ajoute, ne remplace rien, dit les conflits** ; le compteur passe
  au-dessus du plus grand numéro connu, celui de l'appareil compris.
- **La bascule d'un appareil** : envoyer → relire → vérifier élément par
  élément → seulement alors le serveur devient la source. Rien n'est effacé :
  `ela_metier_avant_import` garde la copie d'avant, `ela_metier_non_importes`
  ce que le serveur n'a pas pris (et part dans la sauvegarde).
- **Serveur pas prêt** (migration non appliquée) : l'appareil reste la
  source, comme avant, facture locale comprise.
- **Droits** : carnet lu par tout opérateur (l'agent sans les taux), écrit
  par l'admin ; règlements et factures, admin seul ; tout passe par des
  fonctions, aucune écriture directe pour un compte connecté.
