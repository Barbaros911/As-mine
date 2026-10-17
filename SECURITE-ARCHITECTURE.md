# Architecture des droits ELA Transfer

| Zone | Visiteur | Client avec jeton | Exploitant authentifié | Service serveur |
|---|---:|---:|---:|---:|
| Réserver une course | oui | oui | oui | oui |
| Suivre sa course | non | statut + chauffeur uniquement | oui | oui |
| Lister les courses | non | non | oui | oui |
| Modifier une course | non | non | oui | oui |
| Données clients complètes | non | non | oui | oui |
| Administration | non | non | oui | oui |

« Exploitant authentifié » = un compte Supabase inscrit, actif, dans `operateurs` (`est_exploitant()`). Deux rôles : `admin`, et `agent_reservation`, qui traite les courses. Les prix, les réglages commerciaux, les factures, les commissions, le Pilotage et le Trafic sont réservés à l'admin par le serveur (`est_admin()`), pas seulement par l'écran.

## Règle fondamentale

L'interface peut masquer ou afficher des éléments selon le contexte, mais la décision finale est toujours prise par Supabase Auth + RLS / fonction serveur. Aucun paramètre d'URL, code JavaScript, cookie artisanal ou valeur localStorage ne doit accorder un droit sur les données privées.
