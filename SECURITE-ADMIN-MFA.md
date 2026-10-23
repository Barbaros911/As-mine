# La double vérification de l'admin — ce que Barbaros fait, et le secours

**Ce document ne contient aucun secret, et c'est voulu** (le dépôt est public).

Depuis le 24 octobre 2026, l'admin (`elatransfer.com/ela-admin/`) peut
demander, en plus du mot de passe, un **code à 6 chiffres** affiché par une
application de votre téléphone. Une fois le code activé, **votre mot de
passe seul ne suffit plus** : quelqu'un qui le connaîtrait ne verrait aucune
course. C'est le serveur qui l'impose, à chaque requête.

---

## 1. Activer le code (une fois, 3 minutes)

1. Ouvrez `elatransfer.com/ela-admin/` et connectez-vous comme d'habitude.
2. L'écran « Protégez votre compte » s'affiche. Touchez **« Ajouter à mon
   application de codes »**. Sur iPhone, l'application **Mots de passe**
   (iOS 17 et plus) ou **Google Authenticator** l'accepte.
3. Revenez sur l'admin, tapez le **code à 6 chiffres** affiché, touchez
   **« Activer »**. L'admin s'ouvre.

## 2. Ajouter un appareil de secours (fortement conseillé)

Admin → **Réglages → Double vérification → « Ajouter un appareil de
secours »** : une tablette, un second téléphone, ou un gestionnaire de mots
de passe. Si vous perdez votre téléphone, **c'est lui qui vous ouvre
l'admin**. L'écran dit « Active sur 2 appareils » quand c'est fait.

## 3. Rendre le code obligatoire pour tous (une fois le 1 et le 2 faits)

GitHub → **Actions → « Appliquer une migration Supabase » → Run workflow**,
fichier : `20261024000100_double_verification_obligatoire.sql`.
Il **refuse** de s'appliquer tant qu'un compte actif n'a pas son code : il ne
peut enfermer personne dehors.

## 4. Deux réglages à faire dans les tableaux de bord

- **`supabase.com/dashboard/account/security`** (votre compte Supabase, pas
  le projet) : activez la double vérification **du compte Supabase
  lui-même**, avec un code de secours sur un second appareil. C'est la porte
  de secours de l'admin (§ 5) : elle doit être aussi solide. Supabase prévient
  qu'il ne rend pas l'accès à qui a perdu tous ses codes, et que l'activer
  déconnecte vos autres sessions du tableau de bord.
- **Mots de passe compromis** (refuser un mot de passe déjà paru dans une
  fuite) : Supabase le range dans
  `supabase.com/dashboard/project/yyhzutnuhuytokarynaw/auth/providers?provider=Email`.
  **Selon la documentation de Supabase, ce réglage n'existe qu'à partir de
  l'offre Pro.** Sur l'offre gratuite, la protection vient du code à 6
  chiffres, qui rend un mot de passe volé inutile seul.

## 5. « J'ai perdu mon téléphone »

1. **Avec un appareil de secours** : connectez-vous avec son code, puis
   Réglages → Double vérification → retirez l'ancien appareil (deux appuis)
   et ajoutez le nouveau.
2. **Sans appareil de secours** : connectez-vous à **supabase.com** (votre
   compte Supabase, protégé par sa propre double vérification), ouvrez
   **SQL Editor**, et lancez — en remplaçant l'adresse par la vôtre :
   ```sql
   delete from auth.mfa_factors
   where user_id = (select id from auth.users where email = 'votre-adresse@exemple.com');
   ```
   Si le code était **obligatoire pour tous** (§ 3), lancez aussi :
   ```sql
   update public.securite_admin set double_verification_exigee = false, modifie_le = now();
   ```
   Reconnectez-vous à l'admin : il vous propose d'activer un nouveau code.
   Activez-le, puis rejouez le § 3.

**Ne supprimez jamais le compte** pour « recommencer » : l'accès à l'admin
est lié à ce compte précis (`operateurs`).

## 6. Retirer complètement la double vérification (retour arrière)

GitHub → Actions → « Appliquer une migration Supabase », fichier
`20261024000900_double_verification_retour.sql`. Le mot de passe seul
suffit de nouveau. À ne faire que sur décision, jamais pour un téléphone
perdu (§ 5).

## 7. Vérifier l'état réel

Même workflow, fichier `20261024000050_diagnostic_acces_admin.sql` (lecture
seule, aucun e-mail dans le journal) : combien de comptes actifs ont leur
code, si le code est obligatoire, et chaque fonction sensible du serveur.
