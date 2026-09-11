# Régler les tarifs depuis l'espace exploitant

Septembre 2026, à la demande de Barbaros : pouvoir changer le prix au
kilomètre et le montant minimum sans passer par le code, et que **le site
public suive tout de suite**.

## Ce qu'il reste à faire — une seule fois

Le code est en place. Il manque **une table** dans Supabase, que seul le
titulaire du compte peut créer.

1. Ouvrir <https://supabase.com/dashboard> → le projet → **SQL Editor**.
2. Coller ceci, puis **Run** :

```sql
create table if not exists public.reglages (
  cle     text primary key,
  valeur  jsonb not null,
  maj_le  timestamptz not null default now()
);

alter table public.reglages enable row level security;

-- LECTURE OUVERTE À TOUT LE MONDE, et c'est voulu : un tarif est affiché
-- sur la page d'à côté, ce n'est pas un secret. C'est la SEULE table que
-- le site lit sans session. « courses » reste fermée aux anonymes et doit
-- le rester : une policy de lecture dessus exposerait les noms, téléphones
-- et adresses de tous les clients (RGPD).
create policy "reglages lisibles par tous"
  on public.reglages for select
  to anon, authenticated
  using (true);

-- ÉCRITURE RÉSERVÉE À UN COMPTE CONNECTÉ. Il faut les DEUX policies :
-- l'enregistrement est un dépôt-ou-mise-à-jour, donc un INSERT la première
-- fois et un UPDATE ensuite. Avec une seule, ça marche une fois puis plus
-- jamais — et l'échec est silencieux.
create policy "reglages ecrits par l exploitant"
  on public.reglages for insert
  to authenticated
  with check (true);

create policy "reglages mis a jour par l exploitant"
  on public.reglages for update
  to authenticated
  using (true) with check (true);
```

3. C'est tout. Rien à déployer, rien à redémarrer.

## Comment ça marche

- L'espace exploitant porte un bloc **« Tarifs »** : pour chaque gamme, le
  prix au kilomètre et le montant minimum.
- À l'enregistrement, la grille part sur le serveur.
- **Chaque visiteur la lit au chargement de la page**, sans compte. Elle
  remplace celle écrite dans le code.

## Ce qu'il faut savoir, et qui n'est pas évident

**Le prix affiché reste ferme.** La grille est lue **une seule fois**, au
chargement. Un client qui commence sa réservation garde le prix qu'on lui a
montré, même si le tarif change pendant qu'il remplit le formulaire. Sans
ça, il verrait 60 € sur l'écran des prix et 70 € au récapitulatif.

**Les courses déjà enregistrées ne bougent jamais.** Le montant est écrit
sur le bon de réservation. Changer la grille ne réécrit pas le passé.

**La grille du code reste, et elle sert.** Si le serveur ne répond pas —
réseau coupé, table pas encore créée — le site emploie les valeurs écrites
dans `index.html`. C'est ce qui permet de vendre une course dans un parking
d'aéroport. **Conséquence : après un changement de tarif, ces valeurs-là
sont périmées**, et un client dont la lecture échoue verrait l'ancien prix.
Les reporter dans `GAMMES` à l'occasion.

**Le calcul est le même des deux côtés.** L'écran « Nouvelle course » de
l'exploitant et le site client lisent la même grille et appellent la même
fonction. Deux calculs qui divergent ne se voient pas : on le découvre le
jour où un client compare, sur un prix opposable.

**Les CGV n'ont pas eu à changer**, et c'est un choix d'écriture ancien :
elles disent « le tarif kilométrique et le montant minimum en vigueur sont
ceux affichés sur le Service au moment de la réservation », sans jamais
citer un nombre. Ne pas y écrire de tarif chiffré — ce serait un second
endroit à tenir.

**Un écart du simple au double déclenche un avertissement.** « 2,35 » et
« 23,5 » se ressemblent, et la seconde forme multiplie par dix le prix de
toutes les courses. L'écran montre ce que coûterait une course de 25 km
avec les valeurs saisies : un montant à quatre chiffres se voit, une
virgule déplacée non.

**Sans connexion au serveur, rien ne part**, et l'écran le dit. Enregistrer
dans le seul téléphone donnerait un prix que les clients ne voient pas.
