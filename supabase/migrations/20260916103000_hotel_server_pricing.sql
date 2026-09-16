-- Validation serveur des destinations partenaires + dépôt atomique course/snapshot.
alter table public.tarifs_partenaires add column if not exists validation jsonb not null default '{}'::jsonb;
update public.tarifs_partenaires t set validation=case t.destination_cle when 'cdg' then '{"terminal_prefix":"CDG"}'::jsonb when 'orly' then '{"terminal_prefix":"Orly"}'::jsonb when 'beauvais' then '{"terminal_prefix":"Beauvais"}'::jsonb when 'bourget' then '{"texte_contient":"Le Bourget"}'::jsonb when 'villepinte' then '{"texte_contient":"Villepinte"}'::jsonb when 'disney' then '{"texte_contient":"Disney"}'::jsonb when 'paris' then '{"verification_manuelle":true}'::jsonb else '{}'::jsonb end from public.partenaires p where p.id=t.partenaire_id and p.cle='easyhotel-aeroville' and t.actif;
create or replace function public.ela_deposer_course_serveur(p_ref text,p_bon jsonb,p_snapshot jsonb default null) returns text language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if current_user not in ('service_role','postgres') and auth.role() <> 'service_role' then raise exception 'acces_refuse'; end if;
  insert into public.courses(ref,statut,bon) values(p_ref,'attente',p_bon);
  if p_snapshot is not null then
    insert into public.snapshots_financiers(course_ref,prix_initial_centimes,remise_centimes,prix_final_centimes,code_promo,montant_chauffeur_centimes,marge_ela_centimes,origine,verifie,verrouille,cree_le,cree_par)
    values(p_ref,(p_snapshot->>'prix_final_centimes')::integer,0,(p_snapshot->>'prix_final_centimes')::integer,null,(p_snapshot->>'montant_chauffeur_centimes')::integer,(p_snapshot->>'marge_ela_centimes')::integer,'moteur_tarifaire',true,true,now(),null);
    insert into public.evenements_reservation(course_ref,type_evenement,acteur_type,donnees) values(p_ref,'tarif_partenaire_verifie','systeme',jsonb_build_object('destination_cle',p_snapshot->>'destination_cle','prix_final_centimes',(p_snapshot->>'prix_final_centimes')::integer));
  end if;
  return p_ref;
end $$;
revoke all on function public.ela_deposer_course_serveur(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.ela_deposer_course_serveur(text,jsonb,jsonb) to service_role;
