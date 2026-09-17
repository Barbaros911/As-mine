-- ============================================================================
-- LA RESTAURATION D'UNE SAUVEGARDE — epreuves sur un vrai PostgreSQL.
--
-- On APPELLE la fonction, on ne relit pas sa source : une expression
-- reguliere sur un fichier SQL ne sait pas si la requete s'execute ni ce
-- qu'elle rend.
--
-- Le controle qui compte le plus est le 2 : une course DEJA LA et DEJA
-- AVANCEE ne doit pas reculer. C'est le seul defaut de ce lot qui ne se
-- verrait pas -- la restauration dirait « 12 courses ajoutees », et une
-- course realisee serait silencieusement repassee en attente.
-- ============================================================================

-- 1. UNE SAUVEGARDE ENTRE, AVEC SES STATUTS DEJA VECUS.
--    « realisee » et « annulee » n'existent pas dans la porte de saisie :
--    c'est toute la raison de cette fonction-ci.
do $$
declare r jsonb;
begin
  r := public.ela_restaurer_courses_exploitant($j$[
    {"ref":"ELA-26-08-0001","statut":"realisee","course":{"date":"2026-08-03","heure":"09:00",
      "depart":"Roissy T2E","arrivee":"Paris 8e","vehicule":"Berline"},
      "client":{"nom":"Duval","telephone":"0612345678"},
      "chauffeur":{"nom":"Mehmet"},"prix":{"total":78},"provenance":"easyHotel Aeroville"},
    {"ref":"ELA-26-08-0002","statut":"annulee","course":{"date":"2026-08-04","heure":"07:30",
      "depart":"Orly","arrivee":"Melun","vehicule":"Van"},
      "client":{"nom":"Petit"},"prix":{"total":120}},
    {"ref":"ELA-26-08-0003","statut":"attente","course":{"date":"2026-08-05","heure":"11:00",
      "depart":"Gare de Lyon","arrivee":"Roissy","vehicule":"Berline"},
      "client":{"nom":"Nguyen"},"prix":{"total":95}}
  ]$j$::jsonb);

  if (r->>'ajoutees')::int <> 3 then
    raise exception 'attendu 3 ajoutees, recu % (%)', r->>'ajoutees', r; end if;
  if (r->>'ignorees')::int <> 0 then
    raise exception 'attendu 0 ignoree, recu %', r->>'ignorees'; end if;
  if (r->>'refusees')::int <> 0 then
    raise exception 'attendu 0 refusee, recu %', r->>'refusees'; end if;

  if (select statut from public.courses where ref='ELA-26-08-0001') <> 'realisee' then
    raise exception 'le statut « realisee » de la sauvegarde n''a pas ete garde'; end if;
  if (select statut from public.courses where ref='ELA-26-08-0002') <> 'annulee' then
    raise exception 'le statut « annulee » de la sauvegarde n''a pas ete garde'; end if;

  -- LE BON NE DOIT PAS PORTER DE CHAMP « statut » EN DOUBLE : la colonne
  -- fait foi, et deux copies divergent des le premier changement d'etat.
  if (select bon ? 'statut' from public.courses where ref='ELA-26-08-0001') then
    raise exception 'le bon restaure porte un « statut » en double de la colonne'; end if;
  if (select bon->'client'->>'nom' from public.courses where ref='ELA-26-08-0001') <> 'Duval' then
    raise exception 'le bon n''a pas ete restaure entier'; end if;
end $$;

-- 2. LE CONTROLE QUI COMPTE : UNE COURSE DEJA LA NE RECULE PAS.
--    On fait AVANCER la course 0003 (attente -> confirmee, chauffeur pose),
--    puis on rejoue EXACTEMENT la meme sauvegarde, ou elle est en attente
--    et sans chauffeur. Si la fonction mettait a jour au lieu d'ignorer,
--    le travail de Barbaros serait efface par sa propre sauvegarde.
update public.courses
   set statut='confirmee',
       bon = jsonb_set(bon,'{chauffeur}','{"nom":"Karim"}'::jsonb,true)
 where ref='ELA-26-08-0003';

do $$
declare r jsonb;
begin
  r := public.ela_restaurer_courses_exploitant($j$[
    {"ref":"ELA-26-08-0003","statut":"attente","course":{"date":"2026-08-05","heure":"11:00",
      "depart":"Gare de Lyon","arrivee":"Roissy","vehicule":"Berline"},
      "client":{"nom":"Nguyen"},"prix":{"total":95}}
  ]$j$::jsonb);

  if (r->>'ajoutees')::int <> 0 then
    raise exception 'une course deja presente a ete reinseree (%)', r; end if;
  if (r->>'ignorees')::int <> 1 then
    raise exception 'attendu 1 ignoree, recu %', r->>'ignorees'; end if;

  if (select statut from public.courses where ref='ELA-26-08-0003') <> 'confirmee' then
    raise exception 'LA RESTAURATION A FAIT RECULER UNE COURSE : confirmee -> %',
      (select statut from public.courses where ref='ELA-26-08-0003'); end if;
  if (select bon->'chauffeur'->>'nom' from public.courses where ref='ELA-26-08-0003') is distinct from 'Karim' then
    raise exception 'la restauration a efface le chauffeur attribue depuis la sauvegarde'; end if;
end $$;

-- 3. CE QU'ELLE REFUSE, ET SANS S'ARRETER POUR AUTANT.
--    Une ligne mauvaise au milieu d'une sauvegarde de trois cents ne doit
--    pas faire perdre les deux cent quatre-vingt-dix-neuf autres.
do $$
declare r jsonb;
begin
  r := public.ela_restaurer_courses_exploitant($j$[
    {"ref":"","statut":"realisee"},
    {"statut":"realisee","client":{"nom":"Sans reference"}},
    {"ref":"ELA-26-08-0009","statut":"transmutee"},
    "pas un objet",
    {"ref":"ELA-26-08-0010","statut":"realisee","course":{"date":"2026-08-09"},"prix":{"total":60}}
  ]$j$::jsonb);

  if (r->>'ajoutees')::int <> 1 then
    raise exception 'la ligne valable n''est pas passee : %', r; end if;
  if (r->>'refusees')::int <> 4 then
    raise exception 'attendu 4 refusees, recu % (%)', r->>'refusees', r; end if;
  if exists(select 1 from public.courses where ref='ELA-26-08-0009') then
    raise exception 'un statut inconnu est entre dans la table'; end if;
end $$;

-- 4. UN STATUT ABSENT RETOMBE SUR « attente », il n'invente rien.
do $$
declare r jsonb;
begin
  r := public.ela_restaurer_courses_exploitant(
    '[{"ref":"ELA-26-08-0011","course":{"date":"2026-08-10"},"prix":{"total":45}}]'::jsonb);
  if (r->>'ajoutees')::int <> 1 then raise exception 'la ligne sans statut n''est pas passee'; end if;
  if (select statut from public.courses where ref='ELA-26-08-0011') <> 'attente' then
    raise exception 'un statut a ete invente : %',
      (select statut from public.courses where ref='ELA-26-08-0011'); end if;
end $$;

-- 5. CE QUI N'EST PAS UNE SAUVEGARDE EST REFUSE EN BLOC.
do $$
declare erreur text;
begin
  begin
    perform public.ela_restaurer_courses_exploitant('{"courses":[]}'::jsonb);
    raise exception 'un objet a ete accepte comme sauvegarde';
  exception when others then
    erreur := sqlerrm;
    if erreur <> 'sauvegarde_invalide' then
      raise exception 'attendu « sauvegarde_invalide », recu « % »', erreur; end if;
  end;
end $$;

-- 6. LA TRACE EST ECRITE, et elle dit que c'est une restauration.
--    Sans elle, une course apparue dans le registre ne s'expliquerait par
--    rien : ni demande client, ni saisie, ni collage.
do $$
begin
  if not exists(select 1 from public.evenements_reservation
                 where course_ref='ELA-26-08-0001' and type_evenement='course_restauree') then
    raise exception 'aucune trace de restauration'; end if;
end $$;

-- 7. LE VERROU D'ACCES PASSE AVANT TOUT LE RESTE.
--    Meme epreuve d'ORDRE que pour l'intake : un non-exploitant qui vise
--    une reference DEJA PRISE doit recevoir « acces_refuse », jamais un
--    compte-rendu -- lequel lui apprendrait quelles references existent.
update public.socle_reglages set exploitant=false;
do $$
declare erreur text;
begin
  begin
    perform public.ela_restaurer_courses_exploitant(
      '[{"ref":"ELA-26-08-0001","statut":"realisee"}]'::jsonb);
    raise exception 'un non-exploitant a pu restaurer';
  exception when others then
    erreur := sqlerrm;
    if erreur <> 'acces_refuse' then
      raise exception 'attendu « acces_refuse », recu « % »', erreur; end if;
  end;
end $$;
update public.socle_reglages set exploitant=true;

-- 8. LES GARDE-FOUS DU SERVEUR.
do $$
declare p record;
begin
  select proname, prosecdef, proconfig into p from pg_proc
   where pronamespace='public'::regnamespace and proname='ela_restaurer_courses_exploitant';
  if p is null then raise exception 'la fonction n''existe pas'; end if;
  if not p.prosecdef then raise exception 'elle a perdu « security definer »'; end if;
  if p.proconfig is null or not ('search_path=public, pg_temp' = any(p.proconfig))
    then raise exception 'search_path non fige : %', p.proconfig; end if;
  if has_function_privilege('anon','public.ela_restaurer_courses_exploitant(jsonb)','execute')
    then raise exception 'anon peut restaurer'; end if;
  if not has_function_privilege('authenticated','public.ela_restaurer_courses_exploitant(jsonb)','execute')
    then raise exception 'authenticated ne peut pas restaurer'; end if;
end $$;

select 'RESTAURATION DU REGISTRE : toutes les epreuves passent' as resultat;
