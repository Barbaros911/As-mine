-- ============================================================================
-- LA GRILLE DU SITE PUBLIC — 23 octobre 2026, décision de Barbaros.
--
-- Le site public ne facture plus au kilomètre. Dans cet ordre :
--   1. un FORFAIT entre Paris (les 20 arrondissements) et Orly, Roissy-CDG
--      ou Disneyland, dans les deux sens ;
--   2. sinon une TRANCHE selon la distance (jusqu'à 12 / 22 / 32 / 42 km),
--      puis la dernière tranche plus un prix par km au-delà ;
--   3. puis l'ACCUEIL, au départ d'un aéroport ou d'une grande gare
--      (chauffeur à la sortie des arrivées, pancarte au nom du client).
-- Les pages des hôtels partenaires gardent le kilométrage (« tarif_general_* »)
-- et leurs forfaits du flyer : cette migration n'y touche pas.
--
-- UNE LIGNE « grille_publique » DANS « parametres_commerciaux », écrite par
-- l'admin (Réglages → Tarifs → Site public), table déjà réservée en écriture
-- à l'admin (20260929030000). Format, en centimes :
--   { "tranches_km": [12,22,32,42],
--     "berline": { "tranches_centimes": [3500,5000,7000,9000], "au_dela_km_centimes": 250 },
--     "van":     { "tranches_centimes": [5000,8000,11000,13000], "au_dela_km_centimes": 380 },
--     "forfaits": { "orly": {...}, "cdg": {...}, "disney": {...} },
--     "accueil_centimes": 1000 }
--
-- C'EST UNE ÉCRITURE CONDITIONNELLE, ET C'EST TOUTE SA SÛRETÉ : « on conflict
-- do nothing ». Lancée une première fois, elle pose la grille décidée le
-- 23 octobre ; rejouée après un réglage fait depuis l'admin, elle ne change
-- RIEN. Jamais d'« update » ici : il écraserait un prix réglé en production.
--
-- LA LECTURE PAR UN VISITEUR ANONYME passe par une vue qui ne rend QUE cette
-- ligne : la table reste fermée à anon (elle porte la commission
-- d'Elatransfer). Même modèle que « tarif_public » et « prix_pages_publics ».
-- Le site vérifie la forme avant de s'en servir (« grilleValide ») : une
-- grille illisible laisse le site sur celle écrite dans la page.
--
-- À APPLIQUER APRÈS LA FUSION (workflow « Appliquer une migration
-- Supabase ») : tant que ce n'est pas fait, le site applique la grille écrite
-- dans la page, et « deposer-course » ne contrôle pas le prix du site public.
-- ============================================================================

insert into public.parametres_commerciaux (cle, valeur, actif, date_effet, modifie_le)
values ('grille_publique',
        '{"tranches_km":[12,22,32,42],"berline":{"tranches_centimes":[3500,5000,7000,9000],"au_dela_km_centimes":250},"van":{"tranches_centimes":[5000,8000,11000,13000],"au_dela_km_centimes":380},"forfaits":{"orly":{"berline":5500,"van":8000},"cdg":{"berline":7000,"van":11000},"disney":{"berline":9000,"van":13000}},"accueil_centimes":1000}'::jsonb,
        true, now(), now())
on conflict (cle) do nothing;

create or replace view public.grille_publique as
select p.valeur
from public.parametres_commerciaux p
where p.cle = 'grille_publique' and p.actif and jsonb_typeof(p.valeur) = 'object';

comment on view public.grille_publique is
  'Lecture publique (anon) de la grille du site public : tranches, prix par km au-delà, forfaits Paris, accueil. Ne porte jamais la commission ni aucun autre paramètre commercial.';

revoke all on public.grille_publique from anon, authenticated, public;
grant select on public.grille_publique to anon, authenticated;

-- LA PREUVE, DANS LA MIGRATION : aucune vue de « public » n'est modifiable par
-- anon ou authenticated (même contrôle que 20261005000000), et anon lit bien
-- la grille.
do $$
declare
  restes text;
begin
  select string_agg(format('%s (%s : %s)', c.oid::regclass, r.role, p.droit), ', ')
    into restes
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('anon'), ('authenticated')) as r(role)
  cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
                     ('REFERENCES'), ('TRIGGER')) as p(droit)
  where n.nspname = 'public' and c.relkind = 'v'
    and (has_table_privilege(r.role, c.oid, p.droit)
         or (p.droit in ('INSERT', 'UPDATE', 'REFERENCES')
             and has_any_column_privilege(r.role, c.oid, p.droit)));
  if restes is not null then
    raise exception 'vue encore modifiable : %', restes;
  end if;
  if not has_table_privilege('anon', 'public.grille_publique', 'SELECT') then
    raise exception 'anon ne lit pas grille_publique : le site garderait la grille écrite dans la page';
  end if;
end $$;

-- Ce que rend le workflow : la grille que le site lira.
select valeur from public.grille_publique;
