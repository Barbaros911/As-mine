create table if not exists public.quota_reservations_publiques (
  cle text primary key,
  compteur integer not null default 0,
  expire_le timestamptz not null default (now() + interval '70 minutes')
);

alter table public.quota_reservations_publiques enable row level security;
revoke all on table public.quota_reservations_publiques from anon, authenticated;

create or replace function public.consommer_quota_reservation(p_cle text, p_limite integer default 12)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare n integer;
begin
  if p_cle is null or length(p_cle) <> 64 or p_limite < 1 or p_limite > 100 then
    return false;
  end if;

  delete from public.quota_reservations_publiques where expire_le < now();

  insert into public.quota_reservations_publiques(cle, compteur, expire_le)
  values (p_cle, 1, now() + interval '70 minutes')
  on conflict (cle) do update
    set compteur = public.quota_reservations_publiques.compteur + 1,
        expire_le = case
          when public.quota_reservations_publiques.expire_le < now()
          then now() + interval '70 minutes'
          else public.quota_reservations_publiques.expire_le
        end
  returning compteur into n;

  return n <= p_limite;
end;
$$;

revoke all on function public.consommer_quota_reservation(text, integer) from public, anon, authenticated;
grant execute on function public.consommer_quota_reservation(text, integer) to service_role;

comment on function public.consommer_quota_reservation(text, integer)
is 'Quota serveur atomique réservé à la passerelle de dépôt public.';
