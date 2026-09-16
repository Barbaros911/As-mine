-- Cycle métier ELA v2 (#165 / #173)
-- Les transitions sensibles passent par des RPC SECURITY DEFINER qui vérifient
-- systématiquement est_exploitant(). Aucun prix, commission ou règle
-- d'annulation n'est modifié par cette migration.

create table if not exists public.attributions_chauffeur (
  course_ref text primary key references public.courses(ref) on delete restrict,
  chauffeur_id uuid not null references public.chauffeurs(id) on delete restrict,
  montant_chauffeur_centimes integer check (montant_chauffeur_centimes is null or montant_chauffeur_centimes >= 0),
  statut text not null default 'active' check (statut in ('active','retiree')),
  attribue_le timestamptz not null default now(),
  retire_le timestamptz,
  modifie_le timestamptz not null default now(),
  modifie_par uuid default auth.uid()
);
alter table public.attributions_chauffeur enable row level security;
revoke all on public.attributions_chauffeur from anon;
drop policy if exists "admin ela lecture" on public.attributions_chauffeur;
create policy "admin ela lecture" on public.attributions_chauffeur for select to authenticated using ((select public.est_exploitant()));

-- La contrainte initiale empêchait de rouvrir proprement une même action après
-- un premier cycle résolu. Une seule action OUVERTE du même type suffit.
alter table public.actions_requises drop constraint if exists actions_requises_course_ref_type_action_statut_key;
create unique index if not exists actions_requises_unique_ouverte
  on public.actions_requises(course_ref,type_action) where statut='ouverte';

create or replace function public.ela_rafraichir_actions()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare n integer := 0;
begin
  if not public.est_exploitant() then raise exception 'acces_refuse'; end if;

  insert into public.actions_requises(course_ref,type_action,priorite,echeance,donnees)
  select c.ref,'nouvelle_demande',90,null,'{}'::jsonb
  from public.courses c
  where c.statut='attente'
  on conflict (course_ref,type_action) where statut='ouverte' do nothing;
  get diagnostics n = row_count;

  insert into public.actions_requises(course_ref,type_action,priorite,echeance,donnees)
  select c.ref,'chauffeur_a_attribuer',80,null,'{}'::jsonb
  from public.courses c
  left join public.attributions_chauffeur a on a.course_ref=c.ref and a.statut='active'
  where c.statut='confirmee' and a.course_ref is null
  on conflict (course_ref,type_action) where statut='ouverte' do nothing;

  insert into public.actions_requises(course_ref,type_action,priorite,echeance,donnees)
  select c.ref,'course_a_cloturer',70,
    (((c.bon->'course'->>'date')||' '||(c.bon->'course'->>'heure'))::timestamp at time zone 'Europe/Paris'),
    '{}'::jsonb
  from public.courses c
  where c.statut='attribuee'
    and coalesce(c.bon->'course'->>'date','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
    and coalesce(c.bon->'course'->>'heure','') ~ '^[0-2][0-9]:[0-5][0-9]$'
    and (((c.bon->'course'->>'date')||' '||(c.bon->'course'->>'heure'))::timestamp at time zone 'Europe/Paris') < now()
  on conflict (course_ref,type_action) where statut='ouverte' do nothing;

  return n;
end $$;

create or replace function public.ela_changer_statut(p_ref text,p_nouveau text,p_motif text default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare actuel text; autorise boolean := false;
begin
  if not public.est_exploitant() then raise exception 'acces_refuse'; end if;
  select statut into actuel from public.courses where ref=p_ref for update;
  if actuel is null then raise exception 'reservation_introuvable'; end if;
  if actuel=p_nouveau then return actuel; end if;

  autorise := case
    when actuel='attente' and p_nouveau in ('confirmee','annulee') then true
    when actuel='confirmee' and p_nouveau='annulee' then true
    when actuel='attribuee' and p_nouveau in ('realisee','client_absent','incident','annulee') then true
    when actuel='incident' and p_nouveau in ('realisee','annulee') then true
    else false end;
  if not autorise then raise exception 'transition_invalide:%->%',actuel,p_nouveau; end if;

  update public.courses
    set statut=p_nouveau, bon=jsonb_set(bon,'{statut}',to_jsonb(p_nouveau),true)
    where ref=p_ref;
  insert into public.evenements_reservation(course_ref,type_evenement,acteur_type,acteur_id,donnees)
    values(p_ref,'statut_modifie','admin_ela',auth.uid(),jsonb_build_object('avant',actuel,'apres',p_nouveau,'motif',nullif(trim(coalesce(p_motif,'')),'')));

  if p_nouveau in ('realisee','client_absent','annulee') then
    update public.actions_requises set statut='resolue',resolue_le=now()
      where course_ref=p_ref and statut='ouverte';
  elsif p_nouveau='incident' then
    insert into public.actions_requises(course_ref,type_action,priorite,donnees)
      values(p_ref,'incident',100,jsonb_build_object('motif',nullif(trim(coalesce(p_motif,'')),'')))
      on conflict (course_ref,type_action) where statut='ouverte' do nothing;
  elsif p_nouveau='confirmee' then
    update public.actions_requises set statut='resolue',resolue_le=now()
      where course_ref=p_ref and statut='ouverte' and type_action='nouvelle_demande';
    insert into public.actions_requises(course_ref,type_action,priorite,donnees)
      values(p_ref,'chauffeur_a_attribuer',80,'{}'::jsonb)
      on conflict (course_ref,type_action) where statut='ouverte' do nothing;
  end if;
  return p_nouveau;
end $$;

create or replace function public.ela_journaliser_proposition_chauffeur(p_ref text,p_chauffeur_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare ok boolean;
begin
  if not public.est_exploitant() then raise exception 'acces_refuse'; end if;
  if not exists(select 1 from public.courses where ref=p_ref and statut in ('confirmee','attribuee')) then raise exception 'reservation_non_proposable'; end if;
  select exists(select 1 from public.chauffeurs where id=p_chauffeur_id and actif and statut='valide') into ok;
  if not ok then raise exception 'chauffeur_non_attribuable'; end if;
  insert into public.evenements_reservation(course_ref,type_evenement,acteur_type,acteur_id,donnees)
    values(p_ref,'proposition_chauffeur_preparee','admin_ela',auth.uid(),jsonb_build_object('chauffeur_id',p_chauffeur_id));
  return true;
end $$;

create or replace function public.ela_attribuer_chauffeur(p_ref text,p_chauffeur_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare d public.chauffeurs%rowtype; actuel text; montant integer;
begin
  if not public.est_exploitant() then raise exception 'acces_refuse'; end if;
  select statut into actuel from public.courses where ref=p_ref for update;
  if actuel not in ('confirmee','attribuee') then raise exception 'reservation_non_attribuable'; end if;
  select * into d from public.chauffeurs where id=p_chauffeur_id and actif and statut='valide';
  if d.id is null then raise exception 'chauffeur_non_attribuable'; end if;
  select montant_chauffeur_centimes into montant from public.snapshots_financiers where course_ref=p_ref;

  insert into public.attributions_chauffeur(course_ref,chauffeur_id,montant_chauffeur_centimes,statut,attribue_le,retire_le,modifie_le,modifie_par)
    values(p_ref,p_chauffeur_id,montant,'active',now(),null,now(),auth.uid())
  on conflict(course_ref) do update set chauffeur_id=excluded.chauffeur_id,montant_chauffeur_centimes=excluded.montant_chauffeur_centimes,statut='active',attribue_le=now(),retire_le=null,modifie_le=now(),modifie_par=auth.uid();

  update public.courses set statut='attribuee',
    bon=jsonb_set(jsonb_set(bon,'{statut}',to_jsonb('attribuee'::text),true),'{chauffeur}',jsonb_build_object('nom',d.nom_affiche,'telephone',d.telephone_whatsapp,'carteProfessionnelle',coalesce(d.carte_vtc,'')),true)
    where ref=p_ref;
  update public.actions_requises set statut='resolue',resolue_le=now()
    where course_ref=p_ref and statut='ouverte' and type_action='chauffeur_a_attribuer';
  insert into public.evenements_reservation(course_ref,type_evenement,acteur_type,acteur_id,donnees)
    values(p_ref,'chauffeur_attribue','admin_ela',auth.uid(),jsonb_build_object('chauffeur_id',p_chauffeur_id,'montant_chauffeur_centimes',montant));
  return 'attribuee';
end $$;

create or replace function public.ela_retirer_chauffeur(p_ref text,p_motif text default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare ancien uuid;
begin
  if not public.est_exploitant() then raise exception 'acces_refuse'; end if;
  if not exists(select 1 from public.courses where ref=p_ref and statut='attribuee' for update) then raise exception 'reservation_non_attribuee'; end if;
  select chauffeur_id into ancien from public.attributions_chauffeur where course_ref=p_ref and statut='active';
  update public.attributions_chauffeur set statut='retiree',retire_le=now(),modifie_le=now(),modifie_par=auth.uid() where course_ref=p_ref;
  update public.courses set statut='confirmee',bon=jsonb_set((bon-'chauffeur'),'{statut}',to_jsonb('confirmee'::text),true) where ref=p_ref;
  insert into public.actions_requises(course_ref,type_action,priorite,donnees)
    values(p_ref,'chauffeur_a_attribuer',90,jsonb_build_object('motif',nullif(trim(coalesce(p_motif,'')),'')))
    on conflict (course_ref,type_action) where statut='ouverte' do update set priorite=greatest(public.actions_requises.priorite,excluded.priorite),donnees=excluded.donnees;
  insert into public.evenements_reservation(course_ref,type_evenement,acteur_type,acteur_id,donnees)
    values(p_ref,'chauffeur_retire','admin_ela',auth.uid(),jsonb_build_object('chauffeur_id',ancien,'motif',nullif(trim(coalesce(p_motif,'')),'')));
  return 'confirmee';
end $$;

revoke all on function public.ela_rafraichir_actions() from public,anon;
revoke all on function public.ela_changer_statut(text,text,text) from public,anon;
revoke all on function public.ela_journaliser_proposition_chauffeur(text,uuid) from public,anon;
revoke all on function public.ela_attribuer_chauffeur(text,uuid) from public,anon;
revoke all on function public.ela_retirer_chauffeur(text,text) from public,anon;
grant execute on function public.ela_rafraichir_actions() to authenticated;
grant execute on function public.ela_changer_statut(text,text,text) to authenticated;
grant execute on function public.ela_journaliser_proposition_chauffeur(text,uuid) to authenticated;
grant execute on function public.ela_attribuer_chauffeur(text,uuid) to authenticated;
grant execute on function public.ela_retirer_chauffeur(text,text) to authenticated;

comment on table public.attributions_chauffeur is 'Attribution opérationnelle courante ; le chauffeur voit son montant proposé, jamais la marge ELA.';
