-- ============================================================================
-- LES DEUX GESTES DE L'EXPLOITANT VERS LE CLIENT — leur TRACE.
--
-- Accuser reception d'une demande, et demander un avis apres la course. Les
-- deux sont des messages WhatsApp partis du telephone de Barbaros : le site
-- n'a aucun moyen d'envoyer un SMS tout seul, et il ne faut pas laisser
-- croire l'inverse. Ce que le serveur garde, c'est la TRACE du geste.
--
-- ═══ POURQUOI CETTE TRACE COMPTE ═══
-- « Sur dix demandes recues la nuit, on ne se souvient pas de qui a eu une
-- reponse. » C'est toute l'utilite de la marque -- donc elle doit etre VRAIE.
-- Une marque posee dans le mauvais etat fait croire a Barbaros qu'il a
-- repondu a quelqu'un a qui il n'a rien dit.
--
-- ═══ LA REGLE D'ETAT EST ICI, PAS DANS L'ECRAN ═══
-- Un filtre d'ecran n'est pas une frontiere : un appel direct passe a cote.
--   - « accuse » n'a de sens que sur une course EN ATTENTE. Une fois
--     confirmee, c'est « Prevenir le client » qui parle : deux messages coup
--     sur coup diraient au client qu'on ne sait pas ou on en est.
--   - « avis » n'a de sens que sur une course REALISEE. On ne demande pas a
--     quelqu'un ce qu'il a pense d'un trajet qu'il n'a pas encore fait.
-- ============================================================================

create or replace function public.ela_marquer_geste_client(p_ref text, p_geste text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_statut text;
  v_champ  text;
  v_quand  timestamptz := now();
begin
  if not public.est_exploitant() then raise exception 'acces_refuse'; end if;

  -- DEUX GESTES SEULEMENT, ET NOMMES. Accepter n'importe quelle chaine
  -- ferait entrer un jour une marque que le reste du systeme ne sait pas lire
  -- -- et une marque qu'on n'affiche pas est une trace perdue.
  if p_geste = 'accuse' then v_champ := 'accuse';
  elsif p_geste = 'avis' then v_champ := 'avisDemande';
  else raise exception 'geste_inconnu'; end if;

  select statut into v_statut from public.courses where ref = p_ref for update;
  if v_statut is null then raise exception 'reservation_introuvable'; end if;

  if v_champ = 'accuse' and v_statut <> 'attente' then
    raise exception 'geste_hors_etat:accuse:%', v_statut;
  end if;
  if v_champ = 'avisDemande' and v_statut <> 'realisee' then
    raise exception 'geste_hors_etat:avis:%', v_statut;
  end if;

  -- ON N'EMPECHE PAS DE REFAIRE LE GESTE, on rafraichit sa date. Un client
  -- peut dire « oui oui » et oublier ; relancer est parfois legitime. Ce
  -- qu'on interdit, c'est de marquer dans le mauvais etat.
  update public.courses
     set bon = jsonb_set(bon, array[v_champ], to_jsonb(v_quand), true)
   where ref = p_ref;

  insert into public.evenements_reservation(course_ref, type_evenement,
                                            acteur_type, acteur_id, donnees)
    values (p_ref,
            case when v_champ = 'accuse' then 'accuse_reception_envoye'
                 else 'avis_demande' end,
            'admin_ela', auth.uid(),
            jsonb_build_object('geste', p_geste));

  return jsonb_build_object('ref', p_ref, 'geste', p_geste, 'quand', v_quand);
end $$;

revoke all on function public.ela_marquer_geste_client(text,text) from public, anon;
grant execute on function public.ela_marquer_geste_client(text,text) to authenticated;

comment on function public.ela_marquer_geste_client(text,text) is
  'Garde la trace d''un geste de l''exploitant vers le client (accuse de '
  'reception, demande d''avis). La regle d''etat est imposee ICI : « accuse » '
  'seulement sur une course en attente, « avis » seulement sur une realisee. '
  'Une marque posee dans le mauvais etat ferait croire a une reponse qui n''a '
  'pas eu lieu.';
