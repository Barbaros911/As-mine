-- Étape transitoire sûre avant le moteur tarifaire 100 % serveur :
-- l'exploitant doit vérifier explicitement le prix. Stripe refuse toujours
-- un snapshot non vérifié/non verrouillé.
create or replace function public.ela_verrouiller_snapshot_admin(
  p_ref text,
  p_prix_final_centimes integer,
  p_montant_chauffeur_centimes integer
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  ancien public.snapshots_financiers%rowtype;
  marge integer;
  paiement_actif boolean;
begin
  if not public.est_exploitant() then raise exception 'acces_refuse'; end if;
  if p_prix_final_centimes < 50 or p_prix_final_centimes > 500000 then raise exception 'prix_invalide'; end if;
  if p_montant_chauffeur_centimes < 0 or p_montant_chauffeur_centimes > p_prix_final_centimes then raise exception 'montant_chauffeur_invalide'; end if;
  if not exists(select 1 from public.courses where ref=p_ref for update) then raise exception 'reservation_introuvable'; end if;

  select exists(select 1 from public.paiements where course_ref=p_ref and stripe_payment_intent_id is not null and statut not in ('annule','annulee','echec','canceled','cancelled','failed')) into paiement_actif;
  if paiement_actif then raise exception 'paiement_deja_initialise'; end if;
  select * into ancien from public.snapshots_financiers where course_ref=p_ref;
  marge=p_prix_final_centimes-p_montant_chauffeur_centimes;

  insert into public.snapshots_financiers(course_ref,prix_initial_centimes,remise_centimes,prix_final_centimes,code_promo,montant_chauffeur_centimes,marge_ela_centimes,origine,verifie,verrouille,cree_le,cree_par)
  values(p_ref,p_prix_final_centimes,0,p_prix_final_centimes,null,p_montant_chauffeur_centimes,marge,'admin',true,true,now(),auth.uid())
  on conflict(course_ref) do update set
    prix_initial_centimes=excluded.prix_initial_centimes,
    remise_centimes=0,
    prix_final_centimes=excluded.prix_final_centimes,
    code_promo=null,
    montant_chauffeur_centimes=excluded.montant_chauffeur_centimes,
    marge_ela_centimes=excluded.marge_ela_centimes,
    origine='admin',verifie=true,verrouille=true,cree_le=now(),cree_par=auth.uid();

  update public.courses set bon=jsonb_set(jsonb_set(bon,'{prix,total}',to_jsonb(round(p_prix_final_centimes::numeric/100,2)),true),'{securite,prixServeurVerifie}','true'::jsonb,true) where ref=p_ref;
  insert into public.evenements_reservation(course_ref,type_evenement,acteur_type,acteur_id,donnees)
  values(p_ref,'snapshot_financier_verrouille','admin_ela',auth.uid(),jsonb_build_object(
    'prix_final_centimes',p_prix_final_centimes,
    'montant_chauffeur_centimes',p_montant_chauffeur_centimes,
    'marge_ela_centimes',marge,
    'ancien_prix_final_centimes',ancien.prix_final_centimes
  ));
  return jsonb_build_object('prix_final_centimes',p_prix_final_centimes,'montant_chauffeur_centimes',p_montant_chauffeur_centimes,'marge_ela_centimes',marge,'verifie',true,'verrouille',true);
end $$;
revoke all on function public.ela_verrouiller_snapshot_admin(text,integer,integer) from public,anon;
grant execute on function public.ela_verrouiller_snapshot_admin(text,integer,integer) to authenticated;
