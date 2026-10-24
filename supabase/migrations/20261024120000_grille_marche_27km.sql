-- ============================================================================
-- LA MARCHE À 27 KM — 24 octobre 2026, décision de Barbaros (« j'accepte »).
--
-- La grille du site public (20261023120000) avait une seule marche de 22 à
-- 32 km : 70 € en berline à 22,1 km comme à 32 km, 20 € de plus pour 100 m.
-- Une marche s'ajoute à 27 km : 60 € en berline, 95 € en van. Le reste ne
-- bouge pas : les autres tranches, le prix par km au-delà, les forfaits
-- Paris, l'accueil. Les pages des hôtels gardent le kilométrage.
--
-- UN SEUL GESTE, QUEL QUE SOIT L'ÉTAT DE LA BASE :
--   - 20261023120000 jamais appliquée : la grille entière est posée, avec la
--     marche, et la vue publique est créée ;
--   - 20261023120000 déjà appliquée : la marche s'ajoute ;
--   - tranches déjà réglées depuis l'admin : RIEN ne change.
--
-- C'EST UNE ÉCRITURE CONDITIONNELLE, ET C'EST TOUTE SA SÛRETÉ. L'insertion
-- ne fait rien si la ligne existe (« on conflict do nothing »). La mise à
-- jour ne touche la ligne que si ses tranches sont encore, à l'identique,
-- celles du 23 octobre ; elle ne réécrit que les tranches, jamais un forfait
-- ni l'accueil, qui ont pu être réglés depuis. Rejouée, elle ne change rien.
-- PostgreSQL compare deux jsonb par leur contenu, pas par l'ordre des clés.
--
-- À APPLIQUER APRÈS LA FUSION (workflow « Appliquer une migration
-- Supabase »).
-- ============================================================================

insert into public.parametres_commerciaux (cle, valeur, actif, date_effet, modifie_le)
values ('grille_publique',
        '{"tranches_km":[12,22,27,32,42],"berline":{"tranches_centimes":[3500,5000,6000,7000,9000],"au_dela_km_centimes":250},"van":{"tranches_centimes":[5000,8000,9500,11000,13000],"au_dela_km_centimes":380},"forfaits":{"orly":{"berline":5500,"van":8000},"cdg":{"berline":7000,"van":11000},"disney":{"berline":9000,"van":13000}},"accueil_centimes":1000}'::jsonb,
        true, now(), now())
on conflict (cle) do nothing;

update public.parametres_commerciaux
set valeur = valeur
      || jsonb_build_object(
           'tranches_km', '[12,22,27,32,42]'::jsonb,
           'berline', (valeur -> 'berline') || '{"tranches_centimes":[3500,5000,6000,7000,9000]}'::jsonb,
           'van',     (valeur -> 'van')     || '{"tranches_centimes":[5000,8000,9500,11000,13000]}'::jsonb),
    modifie_le = now()
where cle = 'grille_publique'
  and valeur -> 'tranches_km' = '[12,22,32,42]'::jsonb
  and valeur -> 'berline' -> 'tranches_centimes' = '[3500,5000,7000,9000]'::jsonb
  and valeur -> 'van' -> 'tranches_centimes' = '[5000,8000,11000,13000]'::jsonb;

-- La vue publique, identique à celle de 20261023120000 : sans elle, une base
-- où cette dernière n'a jamais été appliquée ne publierait rien.
create or replace view public.grille_publique as
select p.valeur
from public.parametres_commerciaux p
where p.cle = 'grille_publique' and p.actif and jsonb_typeof(p.valeur) = 'object';

comment on view public.grille_publique is
  'Lecture publique (anon) de la grille du site public : tranches, prix par km au-delà, forfaits Paris, accueil. Ne porte jamais la commission ni aucun autre paramètre commercial.';

revoke all on public.grille_publique from anon, authenticated, public;
grant select on public.grille_publique to anon, authenticated;

-- LA PREUVE, DANS LA MIGRATION : aucune vue de « public » n'est modifiable par
-- anon ou authenticated, et anon lit bien la grille.
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
