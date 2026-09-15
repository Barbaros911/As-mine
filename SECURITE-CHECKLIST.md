# Checklist avant fusion sécurité

- [ ] Site client visuellement inchangé.
- [ ] Calcul de prix inchangé.
- [ ] Réservation client fonctionne sans créer de vraie course pendant les tests automatiques.
- [ ] easyHotel fonctionne.
- [ ] Utilisateur anonyme incapable de lister/lire `courses` directement.
- [ ] Utilisateur anonyme incapable de modifier une course.
- [ ] Utilisateur non authentifié incapable d'utiliser les fonctions exploitant.
- [ ] Exploitant authentifié peut lire et gérer les courses selon ses droits serveur.
- [ ] Suivi client fonctionne uniquement avec référence + jeton valide.
- [ ] Aucun secret/service-role key dans les fichiers publics.
- [ ] RLS activée sur toutes les tables privées.
- [ ] Audit Supabase relancé après migration.
- [ ] Ne fusionner dans `main` qu'après validation de tous les contrôles.
