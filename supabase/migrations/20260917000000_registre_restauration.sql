-- ============================================================================
-- LA RESTAURATION D'UNE SAUVEGARDE DE REGISTRE — ELLE AJOUTE, ELLE N'ECRASE
-- JAMAIS.
--
-- Pourquoi une fonction de plus, et pas « ela_creer_course_exploitant » :
-- celle-la n'accepte que « attente » et « confirmee », et c'est juste --
-- c'est la porte de SAISIE, et une course qu'on saisit ne peut pas etre deja
-- realisee. Une restauration, elle, ramene des courses DEJA VECUES :
-- realisees, annulees, en incident. Elargir la porte de saisie pour les
-- faire passer aurait ouvert une porte qu'on ne rétrécit jamais -- et un
-- exploitant aurait pu creer de toutes pieces une course « realisee »,
-- c'est-a-dire de l'argent qui n'est jamais entre.
--
-- LA REGLE EST POSEE ICI, PAS DANS L'ECRAN. Une garde d'ecran n'est pas une
-- frontiere : un appel direct passe a cote. Une reference deja prise est
-- IGNOREE -- jamais mise a jour -- parce qu'une course d'ici peut avoir
-- avance depuis la sauvegarde (chauffeur attribue, course realisee), et
-- remplacer ferait RECULER le travail au lieu de le rendre. C'est la regle
-- de « fusionnerCourses() » du site, posee cote serveur.
-- ============================================================================

create or replace function public.ela_restaurer_courses_exploitant(p_courses jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ligne jsonb;
  v_ref text;
  v_statut text;
  n_ajoutees int := 0;
  n_ignorees int := 0;
  n_refusees int := 0;
begin
  if not public.est_exploitant() then raise exception 'acces_refuse'; end if;
  if p_courses is null or jsonb_typeof(p_courses) <> 'array' then
    raise exception 'sauvegarde_invalide';
  end if;

  for ligne in select * from jsonb_array_elements(p_courses) loop
    if jsonb_typeof(ligne) <> 'object' then
      n_refusees := n_refusees + 1;
      continue;
    end if;

    v_ref := nullif(trim(coalesce(ligne->>'ref','')),'');
    -- UNE LIGNE SANS REFERENCE N'EST PAS UNE COURSE. On la compte comme
    -- refusee plutot que de lui en inventer une : une reference fabriquee
    -- ici entrerait en collision avec la numerotation reelle.
    if v_ref is null then
      n_refusees := n_refusees + 1;
      continue;
    end if;

    -- LE STATUT EST CELUI DE LA SAUVEGARDE, mais il doit exister dans le
    -- systeme. Un statut inconnu passerait les filtres de lecture sans
    -- jamais s'afficher : la course serait la, invisible.
    v_statut := coalesce(nullif(trim(coalesce(ligne->>'statut','')),''), 'attente');
    if v_statut not in ('attente','confirmee','attribuee','realisee',
                        'client_absent','incident','annulee','refusee') then
      n_refusees := n_refusees + 1;
      continue;
    end if;

    -- DEJA LA : on ne touche a rien, et on le compte.
    if exists(select 1 from public.courses where ref = v_ref) then
      n_ignorees := n_ignorees + 1;
      continue;
    end if;

    insert into public.courses(ref, statut, bon)
      values (v_ref, v_statut, ligne - 'statut');
    n_ajoutees := n_ajoutees + 1;

    insert into public.evenements_reservation(course_ref, type_evenement,
                                              acteur_type, acteur_id, donnees)
      values (v_ref, 'course_restauree', 'admin_ela', auth.uid(),
              jsonb_build_object('statut', v_statut));
  end loop;

  -- On ne rafraichit la file qu'une fois, a la fin : une restauration de
  -- trois cents lignes ne doit pas la recalculer trois cents fois.
  if n_ajoutees > 0 then perform public.ela_rafraichir_actions(); end if;

  return jsonb_build_object('ajoutees', n_ajoutees,
                            'ignorees', n_ignorees,
                            'refusees', n_refusees);
end $$;

revoke all on function public.ela_restaurer_courses_exploitant(jsonb) from public, anon;
grant execute on function public.ela_restaurer_courses_exploitant(jsonb) to authenticated;

comment on function public.ela_restaurer_courses_exploitant(jsonb) is
  'Restaure une sauvegarde de registre. AJOUTE seulement : une reference deja '
  'presente est ignoree, jamais mise a jour -- la course d''ici peut avoir '
  'avance depuis la sauvegarde. Reserve a un exploitant.';
