# ELA Transfer — état central du projet

Ce fichier est le registre court à lire avant toute intervention. Il complète `AGENTS.md`.

## Production

- Branche de production : `main`.
- Déploiement : construit avec `construire.sh`.
- Domaine public : `elatransfer.com`.
- GitHub est la source de vérité pour le code.

## Règle de coordination

Avant toute tâche : vérifier les PR/branches actives, le dernier `main` et ce fichier. Une tâche déjà couverte ailleurs ne doit pas être recommencée.

## Zones et état connu

### Façade publique ELA
- Zone : `sites/ela-public/` + intégration d’accueil.
- Identité verrouillée : bleu marine + cyan + blanc, logo ELA Transfer validé, univers aéroport/Paris.
- Mobile et ordinateur doivent partager la même identité mais avec mise en page responsive.
- Une référence visuelle validée doit être reproduite fidèlement, pas seulement utilisée comme inspiration.
- Ne pas modifier les règles métier lors d’un travail purement visuel.

### Application de réservation
- Zone : racine `index.html` et fichiers générés/associés.
- Ne pas modifier sans vérifier les conséquences sur les modes public, EasyHotel et exploitant.

### EasyHotel client
- Zone : `sites/easyhotel-client/` et intégration associée.
- Ne pas mélanger avec une refonte de la façade publique ELA.

### EasyHotel réception
- Zone : `sites/easyhotel-reception/` + fonctions serveur associées.
- Accès et données doivent rester isolés de l’admin complet.

### Admin ELA
- Zone : `sites/ela-admin/` / logique exploitant.
- Ne pas exposer de données privées ou de fonctions admin dans la façade publique.

### Build / déploiement
- `construire.sh` est la recette centrale.
- Toute modification de build doit être considérée comme zone critique.
- Après déploiement, vérifier les routes essentielles touchées.

## Tâches actives

Aucune tâche ne doit être inscrite ici comme active sans branche ou PR identifiable.

Format obligatoire :

`[STATUT] — [TÂCHE] — [BRANCHE/PR] — [ZONE] — [FICHIERS] — [PROCHAINE ÉTAPE]`

Exemple :

`EN COURS — Refaire mobile public — ela/mobile-public — façade publique — sites/ela-public/index.html — validation visuelle`

## Tâches terminées récentes

À renseigner après chaque fusion importante, avec une ligne courte indiquant le commit ou la PR.

`TERMINÉ — Maquette exacte des 4 interfaces publiée — PR #135 / d0c3719 — site public, easyHotel client, réception et admin — build et routes de production vérifiés le 14/09/2026`

`TERMINÉ — Admin mobile réaligné sur la référence et ancien écran neutralisé — PR #137 — admin ELA / application exploitant — build et interactions vérifiés le 14/09/2026`

`TERMINÉ — Logo officiel unique ELA Transfer déployé sur toutes les interfaces — PR #138 — façade publique, application, easyHotel client, réception, admin et icônes — build et assets vérifiés le 14/09/2026`

`TERMINÉ — Façade publique mobile alignée sur la référence validée — PR #139 — accueil, réservation, services et menu mobile — interactions et identité vérifiées le 14/09/2026`

`TERMINÉ — Façade publique et application de réservation unifiées — PR #142 / 4909e14 — racine, /application, EasyHotel, réception et admin — build, déploiement et interactions vérifiés le 14/09/2026`

`TERMINÉ — Parcours mobile client easyHotel refondu et publié — PR #143 / 7f0b9dd — EasyHotel client — identité easyHotel × ELA, CTA vers moteur partenaire, FR/EN et responsive publiés le 15/09/2026`

`TERMINÉ — Landing easyHotel Aéroville repensée et publiée — PR #144 / 6af2f53 — EasyHotel client — hôtel mis au premier plan, logo ELA inchangé, nouvelles photos licenciées, responsive et CTA partenaire publiés le 15/09/2026`

`TERMINÉ — Vrai moteur mobile easyHotel corrigé d'après les captures — PR #146 / 62e840e — application hôtel — en-tête compact, photo hôtel, identité client avancée et destinations photo publiées le 15/09/2026`

`TERMINÉ — Anciennes façades et routes unifiées avec l’application fonctionnelle — PR #151 — façade publique, réception, admin et build — maquettes statiques neutralisées, cache v80 et contrôle anti-régression ajoutés le 15/09/2026`

`TERMINÉ — Galerie publique nettoyée des anciennes interfaces — PR #152 — build/démos — ancienne marque et anciennes routes retirées de la liste, contrôle anti-régression ajouté le 15/09/2026`

## Blocages

À renseigner uniquement lorsqu’un accès, une dépendance externe ou une décision utilisateur empêche réellement d’avancer.

## Règle de mise à jour

- Début de tâche : ajouter ou mettre à jour la ligne dans `Tâches actives`.
- Changement de statut : modifier la même ligne, ne pas créer de doublon.
- Fin de tâche : retirer de `Tâches actives`, ajouter dans `Tâches terminées récentes`.
- Si un autre agent voit une tâche active sur la même zone, il doit s'arrêter et utiliser le statut `EN COURS AILLEURS`.
