# Architecture des droits ELA Transfer

| Zone | Visiteur | Client avec jeton | Exploitant authentifié | Service serveur |
|---|---:|---:|---:|---:|
| Réserver une course | oui | oui | oui | oui |
| Suivre sa course | non | statut + chauffeur uniquement | oui | oui |
| Lister les courses | non | non | oui | oui |
| Modifier une course | non | non | oui | oui |
| Données clients complètes | non | non | oui | oui |
| Administration | non | non | oui | oui |

## Règle fondamentale

L'interface peut masquer ou afficher des éléments selon le contexte, mais la décision finale est toujours prise par Supabase Auth + RLS / fonction serveur. Aucun paramètre d'URL, code JavaScript, cookie artisanal ou valeur localStorage ne doit accorder un droit sur les données privées.
