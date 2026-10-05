# Cloudflare et le DNS — archive

> **Archive figée le 5 octobre 2026.** Ce texte figurait dans `CLAUDE.md`,
> section « Comment le site est construit et hébergé ». Il est périmé : le
> 5 octobre 2026, les serveurs de noms d'elatransfer.com ont été mesurés
> chez Cloudflare (`jill`/`jarred.ns.cloudflare.com`), et le courrier passe
> toujours chez IONOS (MX `mx00`/`mx01.ionos.fr`, SPF IONOS). Ce qui est
> vrai aujourd'hui est dans `CLAUDE.md`. Rien n'a été réécrit ci-dessous.

- **Le danger de la bascule n'est pas le site, c'est l'EMAIL.**
  `contact@elatransfer.com` reçoit du vrai courrier — confirmé par Barbaros.
  **On branche donc le domaine par un simple CNAME chez son hébergeur DNS
  actuel** (voie A), sans déplacer les serveurs de noms : les MX ne sont
  jamais touchés, l'email ne peut pas casser. Ne PAS proposer la voie
  « nameservers chez Cloudflare » par confort : ce qui casse alors n'est pas
  le MX lui-même mais ce qui l'accompagne — SPF, DKIM, DMARC, autodiscover —
  et le courrier part en indésirable sans message d'erreur.
- **Le domaine racine est le point à trancher** : il ne peut pas porter un
  CNAME. Si l'hébergeur DNS propose `ALIAS`/`ANAME`, tout reste identique ;
  sinon il faut rediriger la racine vers `www`, et alors **changer l'adresse
  canonique et `sitemap.xml`**, qui déclarent `https://elatransfer.com/`.
- Vérifier sur l'adresse temporaire `*.pages.dev` avant de toucher au
  domaine, et garder GitHub Pages actif quelques jours : c'est la porte de
  sortie si quelque chose tourne mal.
