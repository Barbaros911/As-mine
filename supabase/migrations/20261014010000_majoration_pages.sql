-- ============================================================================
-- LE PRIX DES PAGES DÉDIÉES — 14 octobre 2026.
--
-- Barbaros : « pour les pages que l'on crée pour les touristes, afficher un
-- prix plus cher », et pouvoir régler le prix de chaque page depuis l'admin.
-- Un client arrivé d'une page d'acquisition (/en/…, pages CDG, Orly,
-- chauffeur) paie le tarif au kilomètre majoré du pourcentage de cette page.
--
-- RIEN À CRÉER POUR L'ÉCRITURE : l'admin écrit la ligne « majoration_pages »
-- de « parametres_commerciaux » ({"en-cdg": 20, …}), comme « commission_canaux »
-- — table déjà réservée en écriture à l'admin (20260929030000).
--
-- CE QUI MANQUE, ET QUE CETTE MIGRATION POSE : la LECTURE par un visiteur
-- anonyme, qui doit connaître la majoration pour afficher son prix. La table
-- reste fermée à anon (elle porte la commission d'Elatransfer) : une vue ne
-- rend QUE la page et son pourcentage — même modèle que « tarif_public ».
--
-- LA VUE FILTRE CE QU'ELLE REND : clé au format des pages, nombre entre 0
-- exclu et 100 inclus. Une ligne mal écrite ne majore rien ; le site borne de
-- son côté aussi. « jsonb_each » ne reçoit jamais autre chose qu'un objet : sur
-- un tableau il lève une erreur, la vue entière répondrait en erreur et toutes
-- les pages retomberaient sans bruit au prix de base. Le pourcentage est lu
-- dans un CASE : le planificateur ne garantit pas l'ordre des conditions, et
-- convertir un texte en nombre lèverait de même.
--
-- UNE VUE NE S'ÉCRIT JAMAIS (20261005000000) : Supabase donne par défaut tous
-- les droits à anon sur un objet neuf. On les retire ici, et on S'ARRÊTE si un
-- droit d'écriture survit sur une vue du schéma.
--
-- REJOUABLE SANS DANGER : aucune donnée n'est lue ni écrite, la vue est
-- redéfinie à l'identique. Sans réglage, elle ne rend aucune ligne : le site
-- garde le prix de base — rien ne change en production par cette migration.
-- ============================================================================

create or replace view public.majorations_pages_publiques as
select s.page, s.pourcentage
from (
  select m.key as page,
         case when jsonb_typeof(m.value) = 'number' then (m.value)::numeric end as pourcentage
  from public.parametres_commerciaux p
  cross join lateral jsonb_each(
    case when jsonb_typeof(p.valeur) = 'object' then p.valeur else '{}'::jsonb end
  ) as m(key, value)
  where p.cle = 'majoration_pages' and p.actif
) s
where s.page ~ '^[a-z0-9-]{2,40}$'
  and s.pourcentage > 0
  and s.pourcentage <= 100;

comment on view public.majorations_pages_publiques is
  'Lecture publique (anon) de la majoration en % du tarif au kilomètre, page d''acquisition par page. Ne porte jamais la commission ni aucun autre paramètre commercial.';

revoke all on public.majorations_pages_publiques from anon, authenticated, public;
grant select on public.majorations_pages_publiques to anon, authenticated;

-- LA PREUVE, DANS LA MIGRATION : aucune vue de « public » n'est modifiable par
-- anon ou authenticated (même contrôle que 20261005000000).
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
  if not has_table_privilege('anon', 'public.majorations_pages_publiques', 'SELECT') then
    raise exception 'anon ne lit pas majorations_pages_publiques : le site garderait le prix de base';
  end if;
end $$;

-- Ce que rend le workflow : ce que le site lira, page par page (vide tant
-- qu'aucune majoration n'est réglée).
select page, pourcentage from public.majorations_pages_publiques order by page;
