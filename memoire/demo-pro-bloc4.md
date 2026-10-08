# Démo professionnels — bloc 4 : le formulaire branché sur la démo

> 8 octobre 2026, mission « Démo professionnels » validée par Barbaros.
> Parcours final : /professionnels/ → « Voir la démo hôtel » → formulaire →
> `demande-demo` (« demander ») → session → /demo/hotel/ s'ouvre tout de
> suite, au nom de l'établissement saisi. Ce fichier dit ce qui est vrai et
> pourquoi ; CLAUDE.md n'en porte qu'une ligne.

## Décisions de Barbaros (ne pas les rediscuter)

- **Option B : pas de Turnstile en V1.** La protection repose sur le champ
  piège, les quotas et un délai minimum de remplissage.
- **Quotas inchangés** : 5 demandes par heure par adresse IP, 3 par jour par
  adresse e-mail.
- **« Il faut préciser à celui qui teste que ce n'est pas indéfini »** :
  l'accès dure 7 jours sur l'appareil, et c'est écrit avant l'envoi, au
  succès, au retour, dans le message de limite et dans la démo elle-même.

## Ce qui existe

- **Serveur (`demande-demo`)** :
  - **Turnstile est facultatif.** Sans le secret `TURNSTILE_SECRET`, la
    vérification est SAUTÉE (plus de 503) ; avec lui, elle est exigée comme
    avant (403 sans jeton, Cloudflare appelé après le quota). **Pour la
    réactiver** : poser `TURNSTILE_SECRET` dans les secrets Supabase ET la
    clé publique du widget dans `CLE_TURNSTILE` de
    `professionnels/index.html` (il faudra alors charger le script du widget
    et envoyer son jeton en `turnstile` — c'est la seule partie à écrire).
  - **Délai minimum** : la page envoie `duree` (ms depuis l'affichage). Sous
    2 500 ms, absent, en texte, négatif ou infini : traité comme le champ
    piège — réponse factice qui a l'air normale, rien écrit, rien compté.
  - Le contrat ne change pas autrement (200/400/403/413/429/503, `site` vide).
- **Formulaire** dans `#demo` de /professionnels/ : type (Hôtel coché par
  défaut — ce n'est pas un consentement, et c'est la « démo hôtel »),
  établissement, nom complet, fonction (facultative), e-mail professionnel,
  téléphone (`telephone.js`, la même règle que le serveur). Erreurs sous le
  champ, FR/EN, téléphone/WhatsApp/e-mail juste en dessous.
- **Succès** : `ela_demo_session` (la chaîne rendue, lue telle quelle par la
  démo du bloc 3) et `ela_demo_expire` (l'ISO rendu), message « Votre
  démonstration est ouverte — accès valable 7 jours sur cet appareil. », puis
  /demo/hotel/ 1,6 s plus tard.
- **Visiteur revenu avant l'échéance** : le bouton du haut et celui de
  l'accueil (`#modele`) mènent DIRECTEMENT à /demo/hotel/ ; la section #demo
  affiche « Votre démonstration est ouverte — accès valable jusqu'au JJ/MM »
  avec « Ouvrir ma démonstration » et « Faire une demande pour un autre
  établissement ». Sans session valable, les deux boutons mènent à #demo.
- **Lien de confirmation** `/professionnels/?confirmer=<jeton>` : « Adresse
  e-mail confirmée, merci. » (200) ou « Ce lien a expiré ou a déjà servi. »
  (410), puis le paramètre est effacé de l'adresse.
- **Démo** : le bandeau dit « Démonstration — accès valable jusqu'au JJ/MM »
  à partir de l'`expire` rendu par « ouvrir ».
- **Politique de confidentialité** (FR/EN, mise à jour au 8 octobre 2026) :
  article 11 « Demandes de démonstration des professionnels » (finalité,
  intérêt légitime, données, destinataires, 3 ans après le dernier contact,
  opposition et accès à contact@elatransfer.com) ; la réclamation devient
  l'article 12.

## Pourquoi c'est écrit ainsi

- **Un humain rapide n'est jamais pris pour un robot.** Le remplissage
  automatique remplit tout d'un appui : un directeur pressé peut envoyer en
  moins de 2,5 s. La page attend elle-même ce qui manque avant d'envoyer
  (`DUREE_MIN_MS` = 2 600) : le délai ne gêne qu'un script qui poste sans
  passer par elle. Sans cette attente, le prospect recevait une session
  factice, la démo le renvoyait au formulaire, et personne ne savait
  pourquoi.
- **Le champ piège s'appelle `ctrl_x9`, pas « site »** : un navigateur remplit
  « site », « url », « website » tout seul, et l'humain serait traité comme
  un robot sans le savoir. Hors écran, `tabindex=-1`, `aria-hidden`,
  `autocomplete=off` — et la clé JSON `site` part TOUJOURS vide, quoi que
  contienne le champ.
- **Jamais un faux succès** : la démo ne s'ouvre que sur une session rendue
  par le serveur (200, une session, une date lisible) ET gardée sur
  l'appareil (stockage refusé = « indisponible »). 429 dit les deux limites
  et rappelle les 7 jours ; 503, 403, 413, réseau coupé, réponse illisible :
  indisponibilité, numéro et e-mail. Le minuteur coupe à 12 s.
- **Une panne de confirmation n'est ni un succès ni un lien mort** : une
  troisième phrase la dit (« n'a pas pu aboutir pour le moment »), et le
  paramètre RESTE dans l'adresse pour qu'un rechargement réessaie. La
  consigne disait d'effacer : effacé seulement quand le serveur a tranché.
- **Pas de redirection automatique en arrivant sur #demo avec une session** :
  le bouton « retour » depuis la démo ramènerait sur la page, qui renverrait
  à la démo — un piège. Les BOUTONS mènent à la démo ; l'arrivée montre
  « Ouvrir ma démonstration ».
- **`ela_demo_expire` à côté de la session**, plutôt que de décoder le
  contenu signé : la page n'a pas à connaître le format de la signature. Si
  le serveur refuse la session (révoquée), la démo efface
  `ela_demo_session` et renvoie au formulaire : l'échéance seule ne rouvre
  rien.
- **Aucune CSP n'a été ajoutée à /professionnels/** : la page n'en portait
  pas. Le jour où elle en aura une, `connect-src` doit nommer l'URL EXACTE
  de `demande-demo` et rien d'autre de Supabase.
- La photo de personnalisation de la démo ne part jamais : le formulaire n'a
  aucun champ d'image, et la suite vérifie la liste exacte des clés envoyées.

## Épreuves

- `test-pro-formulaire.mjs` (site construit, faux serveur Playwright,
  neuf largeurs × deux langues). Éprouvée contre dix falsifications —
  `site` retiré du corps, attente supprimée, piège nommé « website », piège
  atteignable au clavier, 429 rendu comme une panne, retour sans reprise,
  paramètre de confirmation gardé, panne de confirmation dite « expirée »,
  400 en message général, session non gardée : elle tombe à chaque fois.
- `test-securite-fonctions.mjs` : Turnstile absent → passe (Cloudflare jamais
  appelé, jeton ignoré, quota, piège et délai toujours actifs) ; présent →
  exigé ; six durées invalides → factice. Éprouvée contre trois
  falsifications (délai retiré, Turnstile de nouveau obligatoire, Turnstile
  jamais vérifié).
- `test-pro-page` suit le nouveau lien de l'accueil (`/professionnels/#demo`)
  et admet la seule durée d'accès écrite dans la page.
