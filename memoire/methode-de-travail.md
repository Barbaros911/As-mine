# Ses consignes de travail et la méthode — histoire

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## Ses consignes de travail, à tenir pour acquises

- « Répond simplement à mon rythme » · « Arrete de répéter tout le temp les
  même chose » · « Arrete de me parler de l'heure ».
- **Répondre en français.** Il l'a demandé après une réponse en anglais.
- Ne rien faire qu'il n'ait pas demandé : « ne fait pas des chose que je ne
  t'ai pas demander ».
- **Montrer une capture avant de pousser**, et attendre son accord.

### « Mène-moi directement au but »

Septembre 2026, pendant la configuration de Telegram. On lui faisait
traverser des menus (« Edge Functions → Secrets, ou Settings → Edge
Functions selon la version ») alors qu'une **adresse directe** ouvrait la
page en un geste.

**Chercher systématiquement le chemin le plus court, et le donner à sa
place.** Une URL complète plutôt qu'un itinéraire dans une interface ; une
commande à coller plutôt qu'une description de ce qu'elle fait ; un bouton
nommé plutôt que « va dans les réglages ».

- **Un geste à la fois quand il suit une procédure.** Trois étapes d'un
  coup, il se perd et le dit (« je comprends rien », « arrête de
  t'avancer »). On donne UNE action, on attend sa réponse, on donne la
  suivante.
- **Ne pas décrire une interface qu'on ne voit pas.** Ses captures d'écran
  disent où il est vraiment : les lire avant de répondre, pas supposer.
  Il s'est retrouvé dans la recherche des RÉGLAGES de Telegram au lieu de
  celle des conversations — invisible depuis ici sans la capture.
- **Pas de jargon, et pas d'anglais non expliqué.** « La loupe en haut »,
  pas « la recherche globale ».

### « NE DEVINE PLUS JAMAIS »

Septembre 2026, dans la foulée de la règle du dessus. Deux adresses du
tableau de bord Supabase données de mémoire, deux pages d'erreur chez lui
(`/integrations/hooks`, puis `/database/hooks`). Le réseau de cette machine
bloque `supabase.com` : je ne pouvais pas vérifier, et j'ai proposé quand
même.

**Quand on ne peut pas vérifier, on ne propose pas une valeur — on donne un
chemin qui ne dépend d'aucune valeur.** Ici : la recherche du tableau de
bord Supabase, où il tape « webhook », et qui marche quelle que soit la
version.

C'est la même règle que « NE JAMAIS CHANGER UN RÉGLAGE PAR DÉFAUT QU'ON NE
PEUT PAS ÉPROUVER » (le `html_handling` de Cloudflare), et que « on ne lit
pas des chiffres sur une photo pour en tirer une alerte » (le numéro du
flyer easyHotel). Trois fois la même faute : **affirmer sans pouvoir
mesurer**.

Ce qu'il faut faire à la place, dans l'ordre :
1. **Vérifier** — un `grep` dans le dépôt, un appel réseau, un test.
2. Si c'est impossible : **le dire**, et donner le chemin robuste.
3. Ne **jamais** présenter une supposition comme une instruction.

### « Arrête de deviner, sois expert méthodique »

Septembre 2026, après une soirée où une panne a coûté une heure. **Deux
habitudes à supprimer, pas deux conseils.**

**1. MESURER AVANT D'ÉMETTRE UNE HYPOTHÈSE.** Sur le bouton mangé par la
barre du bas, j'ai supposé successivement un bouton désactivé, un écriteau
de zone, un problème d'heure — trois hypothèses, trois vérifications, zéro
résultat. **La mesure qui a tout donné a pris trente secondes** :
`elementFromPoint` au centre du bouton, qui rend « onglet ». L'ordre est
toujours le même : (1) reproduire, (2) **mesurer l'état réel** — rectangles,
valeurs, ce que reçoit le doigt — (3) comparer avec la version qui marchait
(`git worktree` sur `main`, un serveur sur un autre port), (4) bissecter
commit par commit. Ce chemin est plus court que l'intuition, toujours.

**2. NE PAS RELANCER LES VINGT ET UNE SUITES À CHAQUE PAS.** Elles prennent
six minutes ; elles ont tourné cinq fois cette nuit-là, dont trois pour rien.
La marche à suivre : après un changement, lancer **les deux ou trois suites
qui touchent au sujet**, plus celle qu'on vient d'écrire, et **éprouver le
nouveau contrôle contre le défaut qu'il surveille**. La série complète ne se
lance **qu'une fois**, avant la fusion. Deux exécutions en parallèle se
marchent dessus et se bloquent — ne jamais en lancer une seconde tant que la
première tourne.

**3. UNE SUITE MUETTE EST UN ÉCHEC.** `test-nouveau-option` n'a rien affiché
— ni réussite ni échec — dans trois séries d'affilée, et je l'ai lue comme
« pas concernée ». La boucle de lancement le signale maintenant en toutes
lettres (`!!! MUETTE — PLANTAGE`) et recopie les dernières lignes.
