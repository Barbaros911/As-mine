# La synchronisation de l'admin — l'écoute du serveur et le jeton d'une heure

Archivé le 15 octobre 2026 depuis `CLAUDE.md` (plafond du mémo), tel quel.
Ce qui en reste vrai est résumé dans le mémo, section « LES DEMANDES
ARRIVENT TOUTES SEULES ». Depuis, la sonde est passée à 8 s et la vérité est
le serveur (sections « LES DEMANDES ARRIVENT EN 8 SECONDES » et « LE SERVEUR
EST LA SEULE VÉRITÉ » du mémo).

## LES DEMANDES ARRIVENT TOUTES SEULES DANS LE TABLEAU DE BORD

Septembre 2026, à sa demande : « fait en sorte que je reçois la commande
aussi sur la page admin ». Le dépôt sur le serveur existait déjà ; ce qui
manquait, c'est que la demande **apparaisse pendant qu'il regarde**. Elle
n'arrivait qu'à l'OUVERTURE de l'espace ou sur « Actualiser » — or un
onglet laissé ouvert la nuit, c'est exactement la façon dont il travaille.

- **On interroge toutes les 45 s, on n'« écoute » pas.** Une vraie liaison
  permanente (realtime) demanderait une bibliothèque, un abonnement à
  tenir et une reconnexion à écrire. 45 s suffisent pour une course qui
  part dans une heure, et un appel raté est simplement suivi du suivant.
- **On n'interroge JAMAIS dans le vide** : ni sans session — le serveur
  refuse la lecture aux anonymes, et il DOIT la refuser — ni onglet en
  arrière-plan, ni hors de l'espace de travail. Sinon c'est de la batterie
  brûlée sur son téléphone. `ecouteUtile()` est le seul juge.
- **Le retour sur l'onglet rattrape tout de suite**, sans attendre le tour
  suivant : c'est le moment où il regarde.
- **LA PREMIÈRE LECTURE NE SONNE PAS.** À l'ouverture, tout ce que le
  serveur contient et que l'appareil n'a pas est « nouveau » : un téléphone
  neuf ferait sonner cinquante courses vieilles de trois mois. Le drapeau
  `premiereLecture` distingue le rattrapage de l'arrivée.
- **Écriteau + bip.** Une ligne qui apparaît en silence au milieu d'une
  liste ne se remarque pas. Le son passe par un oscillateur — aucun fichier
  à charger — et il est **enveloppé** : un navigateur qui refuse l'audio ne
  doit pas faire tomber la synchronisation avec lui.
- **L'écriteau EMMÈNE aux demandes en attente et se retire** du même geste.
  Il ne sert à rien s'il faut ensuite les chercher.
- **SANS SESSION, RIEN N'ARRIVE, et ça se voit en haut du tableau de
  bord** (`#bordHorsLigne`), pas seulement en petit dans le bloc du
  serveur. C'est la différence entre voir ses clients et ne pas les voir —
  le genre de chose qu'on ne découvre qu'en ratant une course.
- `jugerNuage()` appelle `jugerReception()` : l'état du serveur décide de
  ce qu'on affiche **et** de si l'on interroge. Les séparer, c'est se
  retrouver un jour avec une pastille verte et aucune écoute.

### LE JETON EXPIRAIT AU BOUT D'UNE HEURE, ET RIEN NE LE RENOUVELAIT

Septembre 2026, signalé par Barbaros : « je ne reçois pas les demandes des
clients sur la page admin, pourquoi ». **C'était un vrai défaut, et le plus
coûteux du projet à ce jour.**

Le jeton d'accès Supabase vit **une heure**. Passé ce délai, le serveur
répondait `401` à chaque lecture, l'erreur était avalée par un `catch` qui
rendait `null` — c'est-à-dire exactement ce que rend « pas connecté » — et
plus **aucune demande de client n'arrivait**. Pendant ce temps la colonne
affichait « Serveur connecté », parce que `connecte()` ne regardait que la
**présence** d'une chaîne dans le stockage, jamais sa validité.

**C'est la pire forme de panne : invisible, durable, et ce qu'on perd ce
sont des clients.** Elle ne se voit pas en test manuel — on se connecte, on
essaie, ça marche ; il faut attendre une heure pour la rencontrer.

- `nuage.rafraichir()` échange le `refresh_token` contre un jeton neuf.
  **Il ne présente PAS le jeton périmé** en `Bearer` : l'envoyer ferait
  refuser la demande qui doit justement le remplacer. Un contrôle le vérifie.
- `appel()` prend un troisième paramètre `reessai` : sur un `401`, il
  renouvelle et **rejoue l'appel UNE fois**. Sans ce garde-fou, un refus
  permanent ferait boucler indéfiniment.
- **Un renouvellement refusé efface la session** et fait revenir l'écriteau
  avec « Votre session a expiré » — plutôt qu'une pastille verte sur un
  serveur qui ne répond plus.
- **`lister()` n'a plus de `catch`**, et c'est délibéré : une panne qui
  ressemble à un état normal ne se répare jamais. L'erreur remonte, et
  `#bordHorsLigne` porte trois phrases distinctes — pas connecté, session
  expirée, serveur muet (avec le code) — parce qu'elles appellent trois
  gestes différents.
- **Le test éprouve ce que Barbaros a sous les yeux**, pas la mécanique : il
  vérifie que **la course finit par apparaître** après le renouvellement. Un
  contrôle qui dirait seulement « rafraichir a été appelé » ne prouverait
  rien.
