# Ce qui restait à faire en septembre 2026 — histoire

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## Ce qui reste à faire

**Fait au 6 septembre 2026, ne pas le refaire** : optimisation mobile,
bandeau d'accueil, bouton de réservation, WhatsApp, formulaire, affichage
du prix, confirmation client, espace exploitant, application installable (PWA),
référencement, **registre et « Coller une demande »**, **affiche QR pour
les hôtels**.

1. **Les informations de l'éditeur** (voir ci-dessus) — le seul point qui
   rende le site non conforme aujourd'hui, et le seul que Claude ne peut
   pas produire.
2. ~~La gestion des chauffeurs~~ — **FAIT** (septembre 2026). Carnet avec
   les trois papiers, leurs dates d'expiration, l'alerte à 30 jours et
   l'avertissement sur le bon au moment de l'attribution. Voir la section
   dédiée. Reste à y verser les vraies fiches, ce que seul Barbaros peut
   faire — il lui faut les copies des papiers de ses chauffeurs.
3. ~~L'alerte à chaque demande~~ — **ELLE TOURNE** (11 septembre 2026,
   3 h 18 du matin, éprouvée par une vraie réservation). Barbaros a créé le
   bot Telegram, posé `TELEGRAM_TOKEN` et `TELEGRAM_CHAT` dans les secrets
   Supabase, et branché le webhook. Il reçoit désormais une notification
   sonore à chaque demande, quelle qu'en soit l'origine.
   - **LE WEBHOOK N'EXISTAIT PAS DANS SON TABLEAU DE BORD**, et c'est ce
     qui a coûté vingt minutes : « Database Webhooks » est devenu une
     **intégration à installer** (Integrations → All → Database Webhooks →
     *Install integration*). Tant qu'elle ne l'est pas, elle n'apparaît ni
     dans le menu Database, ni dans la recherche. `NOTIFICATION.md` le dit
     maintenant en étape 5.
   - **Deux adresses données de mémoire ont rendu deux pages d'erreur** —
     voir « NE DEVINE PLUS JAMAIS ». Le réseau de cette machine bloque
     `supabase.com` : on ne pouvait pas vérifier.
   - **Le message ne porte ni nom, ni téléphone, ni chambre** — vérifié sur
     le vrai message reçu.
   - **L'automatisation WhatsApp reste bloquée** : l'API WhatsApp Business
     de Meta exige une vérification d'entreprise et **un numéro dédié, qui
     ne peut plus servir dans l'application normale**. Rien n'a changé, ne
     pas le promettre.
   - Telegram a été retenu comme voie recommandée : gratuit, instantané,
     avec le son. L'e-mail est le second canal, au choix.
4. **Une langue de plus si le besoin se voit** : l'espagnol et l'arabe sont
   les deux qui apporteraient à Paris. L'arabe demande de retourner toute
   la page de droite à gauche — ce n'est pas qu'une affaire de textes.
5. **Cloudflare** sert le site et porte le DNS (voir plus haut). Ne jamais
   toucher aux lignes du courrier IONOS.
6. **La clé Mapbox** : elle reste le premier niveau du calcul
   d'itinéraire, et la seule qui se restreigne au domaine. Marche à suivre
   dans `MAPBOX.md`. Ce n'est plus urgent depuis qu'ORS est branché — c'est
   un confort, pas un manque.
