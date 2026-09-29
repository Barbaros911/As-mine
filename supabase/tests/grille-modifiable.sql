-- EPREUVE : les prix se modifient depuis l'admin (20260929010000).
-- On part de la VRAIE source des tarifs (20260916100000), rejouee avant :
-- ce qu'on eprouve est la migration sur la grille reelle, pas sur une copie.
\set ON_ERROR_STOP on
do $$
declare g jsonb; ok boolean;
begin
  -- 1. La lecture publique rend la grille reelle.
  g := public.grille_publique();
  if (g->'berline'->>'par_km_centimes')::int <> 265 then raise exception 'berline lue : %', g->'berline'; end if;
  if (g->'van'->>'minimum_centimes')::int <> 5000 then raise exception 'minimum van lu : %', g->'van'; end if;
  if (g->'hotel_km'->>'van_par_km_centimes')::int <> 410 then raise exception 'hotel km lu : %', g->'hotel_km'; end if;
  if (g->'forfaits'->'easyhotel-aeroville'->'orly'->>'van')::int <> 13000 then raise exception 'forfait Orly van lu : %', g->'forfaits'; end if;
  -- Elle ne rend QUE des prix : pas l'arrondi, pas d'identifiant de ligne.
  if g::text ~ '(arrondi|partenaire_id|modifie)' then raise exception 'la lecture publique rend plus que des prix : %', g; end if;

  -- 2. L'exploitant modifie : tarif au km, minimum, km hotel, un forfait.
  g := public.ela_modifier_grille('{"berline":{"par_km_centimes":275,"minimum_centimes":3500},
     "hotel_km":{"berline_par_km_centimes":260,"van_par_km_centimes":420},
     "forfaits":{"easyhotel-aeroville":{"orly":{"berline":9500}}}}'::jsonb);
  if (g->'berline'->>'par_km_centimes')::int <> 275 or (g->'berline'->>'minimum_centimes')::int <> 3500
    then raise exception 'berline non modifiee : %', g->'berline'; end if;
  if (g->'van'->>'par_km_centimes')::int <> 400 then raise exception 'le van a bouge sans etre demande : %', g->'van'; end if;
  if (g->'hotel_km'->>'van_par_km_centimes')::int <> 420 then raise exception 'hotel km non modifie'; end if;
  if (g->'forfaits'->'easyhotel-aeroville'->'orly'->>'berline')::int <> 9500 then raise exception 'forfait non modifie'; end if;
  if (g->'forfaits'->'easyhotel-aeroville'->'orly'->>'van')::int <> 13000 then raise exception 'le van d''Orly a bouge'; end if;
  -- L'arrondi n'est pas perdu dans la mise a jour.
  if (select valeur->>'arrondi' from parametres_commerciaux where cle='tarif_general_berline') is distinct from 'dizaine_euros'
    then raise exception 'la mise a jour a efface l''arrondi'; end if;
  -- C'est bien la ligne que le serveur relit pour verrouiller un prix.
  if (select montant_centimes from tarifs_partenaires t join partenaires p on p.id=t.partenaire_id
       where p.cle='easyhotel-aeroville' and destination_cle='orly' and vehicule_cle='berline' and t.actif) <> 9500
    then raise exception 'tarifs_partenaires non modifie'; end if;

  -- 3. Les fautes de frappe sont refusees, et un refus n'ecrit RIEN.
  ok := false;
  begin perform public.ela_modifier_grille('{"berline":{"par_km_centimes":26500,"minimum_centimes":3000}}');
  exception when others then ok := sqlerrm like 'tarif_km_invalide%'; end;
  if not ok then raise exception '26500 centimes/km accepte'; end if;
  ok := false;
  begin perform public.ela_modifier_grille('{"forfaits":{"easyhotel-aeroville":{"orly":{"berline":9900,"van":3}}}}');
  exception when others then ok := sqlerrm like 'forfait_invalide%'; end;
  if not ok then raise exception 'forfait a 3 centimes accepte'; end if;
  if (public.grille_publique()->'forfaits'->'easyhotel-aeroville'->'orly'->>'berline')::int <> 9500
    then raise exception 'un refus a quand meme ecrit la berline'; end if;
  ok := false;
  begin perform public.ela_modifier_grille('{"forfaits":{"easyhotel-aeroville":{"versailles":{"berline":9000}}}}');
  exception when others then ok := sqlerrm like 'forfait_absent%'; end;
  if not ok then raise exception 'une destination inconnue a ete acceptee'; end if;

  -- 4. Sans etre exploitant : refuse, et rien n'est ecrit.
  update socle_reglages set exploitant = false;
  ok := false;
  begin perform public.ela_modifier_grille('{"van":{"par_km_centimes":100,"minimum_centimes":0}}');
  exception when others then ok := sqlerrm = 'acces_refuse'; end;
  update socle_reglages set exploitant = true;
  if not ok then raise exception 'un non-exploitant a modifie les prix'; end if;
  if (public.grille_publique()->'van'->>'par_km_centimes')::int <> 400 then raise exception 'le refus a ecrit'; end if;

  -- 5. Les droits : lecture pour anon, ecriture jamais.
  if not has_function_privilege('anon', 'public.grille_publique()', 'execute')
    then raise exception 'anon ne peut pas lire la grille'; end if;
  if has_function_privilege('anon', 'public.ela_modifier_grille(jsonb)', 'execute')
    then raise exception 'anon peut MODIFIER les prix'; end if;
  raise notice 'grille modifiable : 5 blocs au vert';
end $$;
