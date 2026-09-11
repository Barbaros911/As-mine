# L'espace réception d'un hôtel partenaire

Ce qu'il faut faire pour qu'easyHotel puisse réserver **et** voir ses
courses. Tout se fait depuis un téléphone, il n'y a pas de terminal à
ouvrir.

---

## Il y a DEUX adresses, et il ne faut pas les confondre

| Adresse | À qui | Ce qu'elle donne |
|---|---|---|
| `elatransfer.com/?h=easyhotel-aeroville` | **aux clients**, c'est le QR du flyer | réserver, rien d'autre |
| `elatransfer.com/?reception=easyhotel-aeroville` | **à la réception seulement** | réserver **et** voir les courses de l'hôtel |

La seconde ne se communique qu'au comptoir. Elle n'est ni dans Google
(`robots.txt` l'écarte et la page se déclare `noindex`), ni devinable
depuis la première.

**Un lien se transfère, se retrouve dans un historique de navigateur, se
photographie par-dessus l'épaule.** C'est pour ça qu'il faut aussi un code.

---

## 1. Choisir le code

C'est toi qui le choisis. Deux règles :

- **Pas huit chiffres.** Un code court se devine. Prends quelque chose
  comme `easyhotel-9F3K2Q` : des lettres, des chiffres, une douzaine de
  caractères.
- **Un code par hôtel.** Le jour où un deuxième partenaire arrive, il aura
  le sien — sinon l'un verrait les clients de l'autre.

Le code n'est **jamais écrit dans le site**. C'est la différence avec ton
code d'exploitant (`12345678`), qui vit dans la page sous forme
d'empreinte : celui-là, quelqu'un qui lit le code source peut l'attaquer
tranquillement chez lui, autant d'essais qu'il veut. Le code de la
réception, lui, ne peut s'essayer qu'en appelant le serveur, un essai à la
fois, avec une seconde d'attente à chaque échec.

**Ce n'est pas un coffre pour autant.** Ce qui protège vraiment, c'est que
l'adresse ne sorte pas de l'hôtel **et** que le code soit long.

---

## 2. Poser le code dans Supabase

Depuis le navigateur du téléphone :

1. `supabase.com/dashboard` → ton projet
2. **Edge Functions** → **Secrets** (ou *Settings* → *Edge Functions* →
   *Secrets* selon la version)
3. **Add new secret**

| Nom | Valeur |
|---|---|
| `HOTEL_EASYHOTEL_AEROVILLE_CODE` | le code que tu as choisi |

**Le nom s'écrit EXACTEMENT comme ça**, en majuscules, avec des tirets bas.
Il se déduit de la clé de l'hôtel (`easyhotel-aeroville`) : les tirets
deviennent des tirets bas, tout passe en majuscules, et on encadre par
`HOTEL_` et `_CODE`.

**Un nom mal écrit n'est pas une erreur visible.** La fonction croit
simplement que cet hôtel n'existe pas, et la réception lit « ce code n'est
pas le bon » sans que personne comprenne pourquoi. Si ça arrive, c'est la
première chose à vérifier.

Rien d'autre à faire dans Supabase : pas de table, pas de colonne, pas de
règle de sécurité. La fonction `courses-hotel` se déploie toute seule à
chaque poussée sur GitHub.

---

## 3. Donner l'accès à la réception

Envoie-leur deux choses, dans le même message :

> Adresse : `https://elatransfer.com/?reception=easyhotel-aeroville`
> Code : `…`
>
> À ouvrir une fois sur la tablette du comptoir, puis à mettre en favori.
> Le code n'est demandé qu'une seule fois.

Dis-leur aussi **« Fermer la session »**, en bas de l'écran : c'est le geste
à faire s'ils prêtent la tablette ou changent d'appareil. Il efface le code.

---

## Ce que la réception voit, et ce qu'elle ne peut pas faire

**Elle voit** ses courses à elle : l'heure, l'état à jour, la chambre, le
nom et le numéro du client, le trajet, le véhicule, le prix annoncé, le
mode de règlement — et le chauffeur avec son numéro dès que la course est
confirmée. C'est ce qui lui évite de t'appeler pour répondre à son client.

**Elle ne voit pas** les courses d'un autre hôtel, ni celles de tes clients
directs, ni ton registre, ni tes chiffres.

**Elle ne décide rien.** Le bouton « Demander l'annulation » ne change
jamais l'état d'une course : il te transmet la demande par WhatsApp et
marque la course « annulation demandée ». Une course annulée à 5 h du matin
libère un chauffeur que tu as déjà engagé, et toi seul peux le rappeler.

---

## Si ça ne marche pas

| Ce que la réception voit | Ce qu'il faut regarder |
|---|---|
| « Ce code n'est pas le bon » alors qu'il est juste | le **nom** du secret, presque toujours |
| « Le serveur n'a pas répondu » | la fonction est-elle déployée ? (onglet Actions sur GitHub) |
| La page s'ouvre mais sans le bouton « Réservations de l'hôtel » | l'adresse utilisée est celle du flyer (`?h=`), pas celle de la réception (`?reception=`) |
| Une liste vide alors qu'il y a eu des réservations | elles ont été prises avant la mise en ligne de cette version : elles ne portent pas la clé de l'hôtel |

---

## Ajouter un deuxième hôtel

Trois choses, dans cet ordre :

1. Dans `index.html`, ajouter une entrée à `HOTELS` : son nom, son adresse
   postale complète, ses alias, ses couleurs, et **sa grille de forfaits** —
   elle est par hôtel, deux partenaires ne se négocient pas au même prix.
2. Dans Supabase, un secret `HOTEL_<SA_CLE>_CODE`.
3. Lui donner son adresse `?reception=<sa-cle>` et son code.

Rien à changer dans la fonction serveur : elle lit la clé de l'hôtel sur la
course et compose le nom du secret toute seule.
