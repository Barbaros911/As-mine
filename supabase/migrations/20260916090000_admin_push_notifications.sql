-- Notifications internes ELA : abonnement Web Push réservé aux exploitants.
create table if not exists public.abonnements_admin (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  abonnement jsonb not null,
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
alter table public.abonnements_admin enable row level security;
revoke all on public.abonnements_admin from anon;
drop policy if exists "exploitant voit ses push" on public.abonnements_admin;
create policy "exploitant voit ses push" on public.abonnements_admin for select to authenticated using (user_id=auth.uid() and (select public.est_exploitant()));
create unique index if not exists abonnements_admin_endpoint_unique on public.abonnements_admin(user_id,(abonnement->>'endpoint'));

create table if not exists public.journal_notifications_admin (
  id bigint generated always as identity primary key,
  type_evenement text not null,
  course_ref text,
  canal text not null check (canal in ('push','telegram','email')),
  statut text not null check (statut in ('envoye','echec','indisponible','aucun_abonne')),
  detail text,
  cree_le timestamptz not null default now()
);
alter table public.journal_notifications_admin enable row level security;
revoke all on public.journal_notifications_admin from anon,authenticated;
drop policy if exists "exploitant lit journal notifications" on public.journal_notifications_admin;
create policy "exploitant lit journal notifications" on public.journal_notifications_admin for select to authenticated using ((select public.est_exploitant()));
grant select on public.journal_notifications_admin to authenticated;

create or replace function public.ela_enregistrer_push_admin(p_abonnement jsonb)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare ep text; p256 text; au text;
begin
  if not public.est_exploitant() then raise exception 'acces_refuse'; end if;
  ep=coalesce(p_abonnement->>'endpoint',''); p256=coalesce(p_abonnement->'keys'->>'p256dh',''); au=coalesce(p_abonnement->'keys'->>'auth','');
  if ep !~ '^https://' or length(ep)>2000 or length(p256)<20 or length(au)<8 then raise exception 'abonnement_invalide'; end if;
  insert into public.abonnements_admin(user_id,abonnement,actif,modifie_le)
    values(auth.uid(),p_abonnement,true,now())
  on conflict(user_id,(abonnement->>'endpoint')) do update set abonnement=excluded.abonnement,actif=true,modifie_le=now();
  return true;
end $$;

create or replace function public.ela_revoquer_push_admin(p_endpoint text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.est_exploitant() then raise exception 'acces_refuse'; end if;
  update public.abonnements_admin set actif=false,modifie_le=now() where user_id=auth.uid() and abonnement->>'endpoint'=p_endpoint;
  return true;
end $$;
revoke all on function public.ela_enregistrer_push_admin(jsonb) from public,anon;
revoke all on function public.ela_revoquer_push_admin(text) from public,anon;
grant execute on function public.ela_enregistrer_push_admin(jsonb) to authenticated;
grant execute on function public.ela_revoquer_push_admin(text) to authenticated;
