-- =====================================================================
-- LES PRIX SE MODIFIENT DEPUIS L'ADMIN (29/09/2026, à la demande de
-- Barbaros : « une case pour pouvoir modifier les prix au km, prix hôtel,
-- prix flyer »).
--
-- LA SOURCE RESTE LA MÊME : parametres_commerciaux (tarifs au km) et
-- tarifs_partenaires (forfaits du flyer). C'est déjà elle que le serveur
-- utilise pour verrouiller le prix d'une course easyHotel : on n'ajoute
-- aucune seconde grille, on ouvre seulement deux portes.
--
-- 1. grille_publique() — LECTURE DES SEULS PRIX, POUR TOUT LE MONDE. Les
--    prix sont affichés sur le site : les lire n'expose rien. La fonction
--    compose une réponse champ par champ plutôt que de rendre les lignes
--    telles quelles : une colonne ajoutée demain à ces tables ne sortira
--    pas par ici sans qu'on l'ait décidé.
-- 2. ela_modifier_grille(jsonb) — ÉCRITURE, EXPLOITANT SEULEMENT. Chaque
--    montant est borné : une faute de frappe (« 265 » au lieu de « 2,65 »)
--    ne doit pas partir en ligne sur un prix ferme, donc opposable.
--    Elle ne CRÉE aucune destination : elle change le prix de celles qui
--    existent. Une destination nouvelle demande aussi un lieu, une zone et
--    une ligne sur le flyer — ce n'est pas un champ de formulaire.
-- =====================================================================

create or replace function public.grille_publique()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'berline', (select jsonb_build_object(
                  'par_km_centimes', (valeur->>'par_km_centimes')::int,
                  'minimum_centimes', (valeur->>'minimum_centimes')::int)
                from parametres_commerciaux where cle = 'tarif_general_berline' and actif),
    'van',     (select jsonb_build_object(
                  'par_km_centimes', (valeur->>'par_km_centimes')::int,
                  'minimum_centimes', (valeur->>'minimum_centimes')::int)
                from parametres_commerciaux where cle = 'tarif_general_van' and actif),
    'hotel_km',(select jsonb_build_object(
                  'berline_par_km_centimes', (valeur->>'berline_par_km_centimes')::int,
                  'van_par_km_centimes', (valeur->>'van_par_km_centimes')::int)
                from parametres_commerciaux where cle = 'tarif_easyhotel_autre' and actif),
    'forfaits', coalesce((
      select jsonb_object_agg(p.cle, d.dests)
      from partenaires p
      join lateral (
        select jsonb_object_agg(x.destination_cle, x.prix) as dests
        from (select destination_cle, jsonb_object_agg(vehicule_cle, montant_centimes) as prix
              from tarifs_partenaires
              where partenaire_id = p.id and actif
              group by destination_cle) x
      ) d on d.dests is not null
      where p.actif), '{}'::jsonb)
  );
$$;
revoke all on function public.grille_publique() from public;
grant execute on function public.grille_publique() to anon, authenticated;

create or replace function public.ela_modifier_grille(p_grille jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  g text; v int; m int; part record; dest record; veh text; montant int;
begin
  if not public.est_exploitant() then raise exception 'acces_refuse'; end if;

  -- Tarifs au kilomètre du site : 0,50 € à 20 €/km, minimum 0 à 500 €.
  foreach g in array array['berline','van'] loop
    if p_grille ? g then
      v := (p_grille->g->>'par_km_centimes')::int;
      m := (p_grille->g->>'minimum_centimes')::int;
      if v is null or v < 50 or v > 2000 then raise exception 'tarif_km_invalide:%', g; end if;
      if m is null or m < 0 or m > 50000 then raise exception 'minimum_invalide:%', g; end if;
      update parametres_commerciaux
         set valeur = valeur || jsonb_build_object('par_km_centimes', v, 'minimum_centimes', m),
             modifie_le = now(), modifie_par = auth.uid()
       where cle = 'tarif_general_' || g;
      if not found then raise exception 'tarif_absent:%', g; end if;
    end if;
  end loop;

  -- Tarif au kilomètre d'un partenaire (« autre destination »).
  if p_grille ? 'hotel_km' then
    foreach g in array array['berline','van'] loop
      v := (p_grille->'hotel_km'->>(g || '_par_km_centimes'))::int;
      if v is null or v < 50 or v > 2000 then raise exception 'tarif_hotel_km_invalide:%', g; end if;
    end loop;
    update parametres_commerciaux
       set valeur = valeur || jsonb_build_object(
             'berline_par_km_centimes', (p_grille->'hotel_km'->>'berline_par_km_centimes')::int,
             'van_par_km_centimes', (p_grille->'hotel_km'->>'van_par_km_centimes')::int),
           modifie_le = now(), modifie_par = auth.uid()
     where cle = 'tarif_easyhotel_autre';
    if not found then raise exception 'tarif_absent:hotel_km'; end if;
  end if;

  -- Forfaits : 5 € à 5 000 €, seulement sur des lignes qui existent déjà.
  if p_grille ? 'forfaits' then
    for part in select key as cle, value as dests from jsonb_each(p_grille->'forfaits') loop
      for dest in select key as cle, value as prix from jsonb_each(part.dests) loop
        for veh in select jsonb_object_keys(dest.prix) loop
          if veh not in ('berline','van') then raise exception 'vehicule_invalide:%', veh; end if;
          montant := (dest.prix->>veh)::int;
          if montant is null or montant < 500 or montant > 500000 then
            raise exception 'forfait_invalide:%/%/%', part.cle, dest.cle, veh;
          end if;
          update tarifs_partenaires t set montant_centimes = montant, modifie_le = now()
            from partenaires p
           where t.partenaire_id = p.id and p.cle = part.cle
             and t.destination_cle = dest.cle and t.vehicule_cle = veh and t.actif;
          if not found then raise exception 'forfait_absent:%/%/%', part.cle, dest.cle, veh; end if;
        end loop;
      end loop;
    end loop;
  end if;

  return public.grille_publique();
end $$;
revoke all on function public.ela_modifier_grille(jsonb) from public, anon;
grant execute on function public.ela_modifier_grille(jsonb) to authenticated;
