-- ============================================================================
-- LES GESTES VERS LE CLIENT — epreuves sur un vrai PostgreSQL.
--
-- LE CONTROLE QUI COMPTE LE PLUS : la marque doit etre VRAIE.
-- « Sur dix demandes recues la nuit, on ne se souvient pas de qui a eu une
-- reponse » -- c'est toute l'utilite de la trace. Une marque posee dans le
-- mauvais etat fait croire a Barbaros qu'il a repondu a quelqu'un a qui il
-- n'a rien dit, et il ne le decouvre que quand le client rappelle.
-- ============================================================================

insert into public.courses(ref, statut, bon) values
 ('ELA-26-09-1001','attente',  '{"course":{"date":"2026-09-20","heure":"07:30"},"client":{"nom":"Jean Martin","telephone":"0612345678"},"langue":"fr"}'),
 ('ELA-26-09-1002','realisee', '{"course":{"date":"2026-09-10","heure":"09:00"},"client":{"nom":"Maria Lopez","telephone":"0711223344"},"langue":"en"}'),
 ('ELA-26-09-1003','confirmee','{"course":{"date":"2026-09-22","heure":"06:00"},"client":{"nom":"Paul Petit","telephone":"0655443322"}}');

-- 1. LE GESTE JUSTE, DANS LE BON ETAT.
do $$
declare r jsonb;
begin
  r := public.ela_marquer_geste_client('ELA-26-09-1001','accuse');
  if r->>'geste' is distinct from 'accuse' then raise exception 'la fonction ne rend pas le geste'; end if;
  if (select bon->>'accuse' from public.courses where ref='ELA-26-09-1001') is null then
    raise exception 'la marque « accuse » n''a pas ete ecrite'; end if;

  r := public.ela_marquer_geste_client('ELA-26-09-1002','avis');
  if (select bon->>'avisDemande' from public.courses where ref='ELA-26-09-1002') is null then
    raise exception 'la marque « avisDemande » n''a pas ete ecrite'; end if;

  -- LE RESTE DU BON N'EST PAS TOUCHE : on pose une cle, on ne reecrit pas.
  if (select bon->'client'->>'nom' from public.courses where ref='ELA-26-09-1001') is distinct from 'Jean Martin' then
    raise exception 'le bon a ete ecrase au lieu d''etre complete'; end if;
  if (select bon->>'langue' from public.courses where ref='ELA-26-09-1002') is distinct from 'en' then
    raise exception 'la langue du bon a ete perdue'; end if;
end $$;

-- 2. LE CONTROLE QUI COMPTE : LE GESTE HORS DE SON ETAT EST REFUSE.
do $$
declare erreur text;
begin
  -- Accuser reception d'une course DEJA CONFIRMEE : deux messages coup sur
  -- coup diraient au client qu'on ne sait pas ou on en est.
  begin
    perform public.ela_marquer_geste_client('ELA-26-09-1003','accuse');
    raise exception 'UN ACCUSE A ETE POSE SUR UNE COURSE CONFIRMEE';
  exception when others then
    erreur := sqlerrm;
    if erreur not like 'geste_hors_etat:accuse:%' then
      raise exception 'attendu « geste_hors_etat:accuse:… », recu « % »', erreur; end if;
  end;

  -- Demander un avis sur une course PAS ENCORE FAITE.
  begin
    perform public.ela_marquer_geste_client('ELA-26-09-1001','avis');
    raise exception 'UN AVIS A ETE DEMANDE SUR UNE COURSE NON REALISEE';
  exception when others then
    erreur := sqlerrm;
    if erreur not like 'geste_hors_etat:avis:%' then
      raise exception 'attendu « geste_hors_etat:avis:… », recu « % »', erreur; end if;
  end;

  -- ET RIEN N'A ETE ECRIT. Un refus qui laisserait une trace serait pire
  -- qu'un refus muet : la marque mentirait quand meme.
  if (select bon ? 'accuse' from public.courses where ref='ELA-26-09-1003') then
    raise exception 'le refus a quand meme pose la marque sur la confirmee'; end if;
  if (select bon ? 'avisDemande' from public.courses where ref='ELA-26-09-1001') then
    raise exception 'le refus a quand meme pose la marque d''avis'; end if;
end $$;

-- 3. UN GESTE INCONNU EST REFUSE.
--    Accepter n'importe quelle chaine ferait entrer une marque que rien
--    n'affiche -- donc une trace perdue.
do $$
declare erreur text;
begin
  begin
    perform public.ela_marquer_geste_client('ELA-26-09-1001','relance_impayee');
    raise exception 'un geste inconnu a ete accepte';
  exception when others then
    erreur := sqlerrm;
    if erreur <> 'geste_inconnu' then
      raise exception 'attendu « geste_inconnu », recu « % »', erreur; end if;
  end;
end $$;

-- 4. UNE COURSE INTROUVABLE EST NOMMEE COMME TELLE.
do $$
declare erreur text;
begin
  begin
    perform public.ela_marquer_geste_client('ELA-99-99-9999','accuse');
    raise exception 'une course inexistante a ete marquee';
  exception when others then
    erreur := sqlerrm;
    if erreur <> 'reservation_introuvable' then
      raise exception 'attendu « reservation_introuvable », recu « % »', erreur; end if;
  end;
end $$;

-- 5. ON PEUT REFAIRE LE GESTE, et la date se rafraichit.
--    Un client peut dire « oui oui » et oublier : relancer est legitime. Ce
--    qu'on interdit, c'est de marquer dans le mauvais etat.
do $$
declare avant timestamptz; apres timestamptz;
begin
  select (bon->>'accuse')::timestamptz into avant
    from public.courses where ref='ELA-26-09-1001';
  perform pg_sleep(0.01);
  perform public.ela_marquer_geste_client('ELA-26-09-1001','accuse');
  select (bon->>'accuse')::timestamptz into apres
    from public.courses where ref='ELA-26-09-1001';
  if apres <= avant then
    raise exception 'la date de la marque ne s''est pas rafraichie'; end if;
end $$;

-- 6. LA TRACE EST ECRITE DANS L'HISTORIQUE, et elle nomme le geste.
do $$
begin
  if not exists(select 1 from public.evenements_reservation
                 where course_ref='ELA-26-09-1001'
                   and type_evenement='accuse_reception_envoye') then
    raise exception 'aucun evenement pour l''accuse de reception'; end if;
  if not exists(select 1 from public.evenements_reservation
                 where course_ref='ELA-26-09-1002'
                   and type_evenement='avis_demande') then
    raise exception 'aucun evenement pour la demande d''avis'; end if;
end $$;

-- 7. LE VERROU D'ACCES PASSE AVANT TOUT LE RESTE.
--    Meme epreuve d'ORDRE que partout ailleurs : un non-exploitant qui vise
--    une course INEXISTANTE doit recevoir « acces_refuse », jamais
--    « reservation_introuvable » -- lequel lui apprendrait quelles
--    references existent.
update public.socle_reglages set exploitant = false;
do $$
declare erreur text;
begin
  begin
    perform public.ela_marquer_geste_client('ELA-99-99-9999','accuse');
    raise exception 'un non-exploitant a pu marquer un geste';
  exception when others then
    erreur := sqlerrm;
    if erreur = 'reservation_introuvable' then raise exception
      'le verrou d''acces ne passe pas en premier : un inconnu apprend quelles references existent'; end if;
    if erreur <> 'acces_refuse' then
      raise exception 'attendu « acces_refuse », recu « % »', erreur; end if;
  end;
end $$;
update public.socle_reglages set exploitant = true;

-- 8. LES GARDE-FOUS DU SERVEUR.
do $$
declare p record;
begin
  select proname, prosecdef, proconfig into p from pg_proc
   where pronamespace='public'::regnamespace and proname='ela_marquer_geste_client';
  if p is null then raise exception 'la fonction n''existe pas'; end if;
  if not p.prosecdef then raise exception 'elle a perdu « security definer »'; end if;
  if p.proconfig is null or not ('search_path=public, pg_temp' = any(p.proconfig))
    then raise exception 'search_path non fige : %', p.proconfig; end if;
  if has_function_privilege('anon','public.ela_marquer_geste_client(text,text)','execute')
    then raise exception 'anon peut marquer un geste'; end if;
  if not has_function_privilege('authenticated','public.ela_marquer_geste_client(text,text)','execute')
    then raise exception 'authenticated ne peut pas marquer de geste'; end if;
end $$;

select 'GESTES CLIENT : toutes les epreuves passent' as resultat;
