-- ELA Transfer — durcissement serveur
-- Cette migration documente la barrière déjà appliquée en production pour le suivi client.
-- Ne jamais remplacer les contrôles serveur/RLS par un contrôle JavaScript.

revoke all on function public.suivi(text, text) from public;
revoke all on function public.suivi(text, text) from authenticated;
grant execute on function public.suivi(text, text) to anon;
grant execute on function public.suivi(text, text) to service_role;

create or replace function public.suivi(p_ref text, p_jeton text)
returns table(statut text, chauffeur text)
language sql
stable
security definer
set search_path = public
as $$
  select c.statut, c.bon->'chauffeur'->>'nom'
  from public.courses as c
  where c.ref = left(trim(p_ref), 80)
    and c.bon->>'jeton' = left(trim(p_jeton), 256)
    and length(trim(p_ref)) between 1 and 80
    and length(trim(p_jeton)) between 16 and 256
  limit 1;
$$;
