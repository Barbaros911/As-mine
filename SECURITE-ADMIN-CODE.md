# Le code admin à 6 chiffres — ce que Barbaros fait, et le secours

**Ce document ne contient aucun secret, et c'est voulu** (le dépôt est public).

Depuis le 24 octobre 2026, l'admin (`elatransfer.com/ela-admin/`) peut
demander, en plus du mot de passe, un **code à 6 chiffres que vous
choisissez**. Une fois le code choisi, **votre mot de passe seul ne suffit
plus** : quelqu'un qui le connaîtrait ne verrait aucune course. C'est le
serveur qui l'impose, à chaque requête ; le code est vérifié par le serveur,
jamais par la page, et il n'y est gardé que sous forme d'empreinte.

Il remplace l'application de codes (QR, clé), jugée trop compliquée.

---

## 1. Mettre à jour le serveur (une fois)

GitHub → **Actions → « Appliquer une migration Supabase » → Run workflow**,
fichier : `20261024020000_code_admin.sql`. Rien ne change pour vous tant
que vous n'avez pas choisi votre code.

## 2. Choisir votre code (une fois, 30 secondes)

1. Fermez puis rouvrez `elatransfer.com/ela-admin/`, connectez-vous comme
   d'habitude.
2. L'écran « Protégez votre compte » s'affiche : tapez votre code à 6
   chiffres, retapez-le, touchez **« Enregistrer mon code »**. L'admin
   s'ouvre.

Ensuite, à **chaque nouvelle connexion** (et sur chaque appareil), l'admin
demande le code après le mot de passe. Une session déjà ouverte le garde
30 jours.

**5 codes faux de suite bloquent l'accès 15 minutes**, même avec le bon
code ensuite : c'est ce qui empêche de deviner un code de 6 chiffres.

Changer de code : Admin → **Réglages → Code admin → « Changer mon code »**.
Les autres appareils redemandent alors le nouveau.

## 3. Rendre le code obligatoire pour tous (une fois le 2 fait)

Même workflow, fichier : `20261024020100_code_admin_obligatoire.sql`.
Il **refuse** de s'appliquer tant qu'un compte actif n'a pas son code : il ne
peut enfermer personne dehors.

## 4. Deux réglages à faire dans les tableaux de bord

- **`supabase.com/dashboard/account/security`** (votre compte Supabase, pas
  le projet) : activez la double vérification **du compte Supabase
  lui-même**. C'est la porte de secours de l'admin (§ 5) : elle doit être
  aussi solide. Supabase prévient qu'il ne rend pas l'accès à qui a perdu
  tous ses codes, et que l'activer déconnecte vos autres sessions du tableau
  de bord.
- **Mots de passe compromis** (refuser un mot de passe déjà paru dans une
  fuite) : Supabase le range dans
  `supabase.com/dashboard/project/yyhzutnuhuytokarynaw/auth/providers?provider=Email`.
  **Selon la documentation de Supabase, ce réglage n'existe qu'à partir de
  l'offre Pro.** Sur l'offre gratuite, la protection vient du code admin,
  qui rend un mot de passe volé inutile seul.

## 5. « J'ai oublié mon code »

Connectez-vous à **supabase.com** (votre compte Supabase), ouvrez
**SQL Editor**, et lancez — en remplaçant l'adresse par la vôtre :
```sql
delete from public.codes_admin
where user_id = (select id from auth.users where email = 'votre-adresse@exemple.com');
```
Si le code était **obligatoire pour tous** (§ 3), ce n'est pas un problème :
l'admin vous demandera simplement d'en choisir un nouveau. Reconnectez-vous
et choisissez-le.

**Ne supprimez jamais le compte** pour « recommencer » : l'accès à l'admin
est lié à ce compte précis (`operateurs`).

## 6. Retirer complètement le code (retour arrière)

Même workflow, fichier `20261024020900_code_admin_retour.sql`. Le mot de
passe seul suffit de nouveau. À ne faire que sur décision, jamais pour un
code oublié (§ 5).

## 7. Vérifier l'état réel

Même workflow, fichier `20261024020050_diagnostic_acces_admin.sql` (lecture
seule, aucun e-mail dans le journal) : combien de comptes actifs ont leur
code, combien sont bloqués par les essais, si le code est obligatoire, et
chaque fonction sensible du serveur.

## Ce que ce code protège, et ce qu'il ne protège pas

- **Il protège** contre un mot de passe qui fuit : sans le code, aucune
  course ne sort du serveur.
- **Il ne vaut pas une application de codes** : c'est un second secret que
  vous connaissez, pas un code qui change toutes les 30 secondes. Quelqu'un
  qui vous regarde taper, ou qui trouve les deux notés ensemble, a les
  deux. Ne le notez pas avec le mot de passe ; ne prenez ni votre date de
  naissance, ni le code de votre téléphone.
