-- Hotfix de la fonction déjà appliquée : la contrainte existante accepte
-- uniquement 'admin' ou 'moteur_tarifaire'.
create or replace function public.ela_deposer_course_serveur(p_ref text,p_bon jsonb,p_snapshot jsonb default null)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
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
