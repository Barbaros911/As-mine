-- Les papiers d'un chauffeur expirent tout seuls.
--
-- Avant : « statut » etait un champ pose a la main dans un menu deroulant, et
-- « documents » etait un jsonb declare mais jamais ecrit. Une assurance expiree
-- hier laissait donc le chauffeur « valide » pour toujours, et validDrivers()
-- le proposait encore a l'attribution. Or c'est a l'instant de l'attribution
-- qu'Elatransfer engage sa responsabilite (Code des transports L3142-1).
--
-- Un numero de carte est identique le lendemain de son expiration : il ne prouve
-- rien. C'est la DATE qui prouve. Elle est donc en colonne, pas dans un jsonb :
-- une colonne se compare, s'indexe et se lit en SQL.
--
-- L'etat reel est DERIVE, jamais stocke : un etat stocke est exactement le
-- defaut qu'on repare ici. Il est calcule a UN SEUL endroit -- la vue
-- ci-dessous -- parce que deux calculs qui divergent ne se voient pas.

alter table public.chauffeurs
  add column if not exists carte_vtc_fin  date,
  add column if not exists registre_fin   date,
  add column if not exists assurance_fin  date;

comment on column public.chauffeurs.carte_vtc_fin is
  'Fin de validite de la carte professionnelle VTC. NULL = « manquant » : au ROUGE a l''ecran, comme « perime », car dans les deux cas on ne peut rien prouver — mais NON BLOQUANT pour l''attribution, le temps que le carnet soit rempli. Voir ela_chauffeur_attribuable.';
comment on column public.chauffeurs.registre_fin is
  'Fin d''inscription au registre VTC.';
comment on column public.chauffeurs.assurance_fin is
  'Fin de validite de l''assurance RC professionnelle.';

-- Combien de jours avant l'expiration on previent. Meme valeur que JOURS_ALERTE
-- du site : un seul repere a retenir.
create or replace function public.ela_jours_alerte_papiers()
returns integer language sql immutable as $$ select 30 $$;

-- L'etat d'UN papier. Le jour se compte a minuit, dans le fuseau de Paris :
-- un papier qui expire aujourd'hui vaut encore aujourd'hui.
create or replace function public.ela_etat_papier(fin date)
returns text language sql stable as $$
  select case
    when fin is null then 'manquant'
    when fin < (now() at time zone 'Europe/Paris')::date then 'perime'
    -- « <= » et non « < » : le site alerte a « j <= JOURS_ALERTE », donc le
    -- 30e jour est DANS la fenetre. Un « < » ici ferait dire au serveur
    -- « a jour » le jour meme ou l'ecran dit « expire dans 30 j ».
    when fin <= (now() at time zone 'Europe/Paris')::date
              + public.ela_jours_alerte_papiers() then 'bientot'
    else 'valide'
  end
$$;

-- Le PIRE des trois decide : une assurance perimee rend la fiche perimee, meme
-- avec une carte a jour.
--
-- « perime » et « manquant » sont DEUX valeurs, et c'est delibere. A l'ecran les
-- deux sont au ROUGE -- un papier absent ne prouve pas plus qu'un papier expire,
-- et les confondre donnerait a « pas renseigne » un air rassurant qu'il n'a pas.
-- Mais seul « perime » BLOQUE l'attribution : c'est un fait connu, une date qui
-- est passee. « manquant » est une ignorance ; bloquer dessus reviendrait a
-- inventer un fait, et rendrait le jour du deploiement TOUS les chauffeurs
-- inattribuables d'un coup, sans que personne ne l'ait demande.
create or replace function public.ela_etat_papiers(
  carte date, registre date, assurance date)
returns text language sql stable as $$
  select case
    when 'perime'   = any(e) then 'perime'
    when 'manquant' = any(e) then 'manquant'
    when 'bientot'  = any(e) then 'bientot'
    else 'valide'
  end
  from (select array[
      public.ela_etat_papier(carte),
      public.ela_etat_papier(registre),
      public.ela_etat_papier(assurance)
    ] as e) t
$$;

-- Le nombre de jours restants sur le papier le plus proche de l'echeance.
create or replace function public.ela_jours_papiers(
  carte date, registre date, assurance date)
returns integer language sql stable as $$
  select min(j) from (
    select (carte     - (now() at time zone 'Europe/Paris')::date) as j
    union all select (registre  - (now() at time zone 'Europe/Paris')::date)
    union all select (assurance - (now() at time zone 'Europe/Paris')::date)
  ) t
$$;

-- ---------------------------------------------------------------------------
-- LA REGLE D'ATTRIBUTION, ECRITE UNE SEULE FOIS
-- ---------------------------------------------------------------------------
-- Le filtre du selecteur de chauffeur, cote page, N'EST PAS UNE FRONTIERE DE
-- SECURITE : un appel direct a la RPC contourne l'ecran. La regle vit donc ici,
-- et la vue comme les deux RPC l'appellent — jamais une copie.
--
-- Ce qu'elle exige, et pourquoi :
--   * actif                — le desactiver est une decision humaine, elle prime ;
--   * statut = 'valide'    — c'est deja ce que les RPC exigeaient avant ce
--                            correctif. On ne l'assouplit pas : un chauffeur
--                            « a_verifier » ou « bloque » reste ecarte, et
--                            « a_renouveler » (valeur d'avant, que le formulaire
--                            ne propose plus) le reste aussi. Le desaccord entre
--                            l'ecran et le serveur ne se voit pas — il se lit le
--                            jour du controle ;
--   * aucun papier PERIME  — une date passee est un fait connu, on bloque.
--
-- « manquant » NE BLOQUE PAS, et c'est une decision de Barbaros, pas un oubli :
-- aucune date n'est encore saisie, bloquer dessus rendrait TOUS les chauffeurs
-- inattribuables le jour du deploiement. C'est une regle de MIGRATION, pas une
-- politique de conformite : elle se durcira quand le carnet sera rempli.
create or replace function public.ela_chauffeur_attribuable(
  p_actif boolean, p_statut text,
  p_carte date, p_registre date, p_assurance date)
returns boolean language sql stable as $$
  select p_actif is true
     and p_statut = 'valide'
     and public.ela_etat_papiers(p_carte, p_registre, p_assurance) <> 'perime'
$$;

comment on function public.ela_chauffeur_attribuable(boolean,text,date,date,date) is
  'Source unique de la regle d''attribution : lue par la vue chauffeurs_etat ET imposee par ela_attribuer_chauffeur / ela_journaliser_proposition_chauffeur. Ne jamais recopier cette expression ailleurs.';

-- La vue est la SEULE source de l'etat. Le client la lit, il ne recalcule rien.
-- security_invoker : la RLS de la table s'applique au lecteur, sinon la vue
-- servirait de porte derobee autour des policies.
create or replace view public.chauffeurs_etat
with (security_invoker = true) as
select
  c.*,
  public.ela_etat_papiers(c.carte_vtc_fin, c.registre_fin, c.assurance_fin) as papiers_etat,
  public.ela_jours_papiers(c.carte_vtc_fin, c.registre_fin, c.assurance_fin) as papiers_jours,
  -- L'etat qui decide de l'attribution. « bloque » reste une decision humaine
  -- et l'emporte toujours ; « a_verifier » aussi. Le reste vient des dates.
  case
    when c.actif is false                then 'bloque'
    when c.statut = 'bloque'             then 'bloque'
    -- Tout statut qui n'est pas « valide » demande un humain. On nomme le cas
    -- plutot que de lister les valeurs : « a_renouveler » existe encore dans
    -- les fiches d'avant, le formulaire ne le propose plus, et le serveur l'a
    -- toujours refuse. L'afficher « a jour » pendant que l'attribution le
    -- refuse serait le desaccord qu'on vient de corriger, deplace d'un cran.
    when c.statut <> 'valide'            then 'a_verifier'
    when public.ela_etat_papiers(c.carte_vtc_fin, c.registre_fin, c.assurance_fin)
         in ('perime','manquant')        then 'papiers'
    when public.ela_etat_papiers(c.carte_vtc_fin, c.registre_fin, c.assurance_fin)
         = 'bientot'                     then 'a_renouveler'
    else 'valide'
  end as etat_effectif,
  -- Attribuable ou non. C'est CE champ que le selecteur de chauffeur lit, et
  -- jamais « statut » : un statut pose a la main ne vieillit pas. La vue
  -- n'ecrit pas la regle, elle APPELLE celle que le serveur impose.
  public.ela_chauffeur_attribuable(
    c.actif, c.statut, c.carte_vtc_fin, c.registre_fin, c.assurance_fin) as attribuable
from public.chauffeurs c;

grant select on public.chauffeurs_etat to authenticated;

-- ---------------------------------------------------------------------------
-- La file « Action requise » voit desormais les papiers.
--
-- Une action liee a un chauffeur n'a pas de course : course_ref est NULL, et
-- deux NULL sont DISTINCTS pour un index unique Postgres -- l'index partiel
-- existant ne dedupliquerait donc rien et la file se remplirait de doublons a
-- chaque rafraichissement. D'ou une colonne et un index qui lui sont propres.

alter table public.actions_requises
  add column if not exists chauffeur_id uuid references public.chauffeurs(id) on delete cascade;

create unique index if not exists actions_requises_chauffeur_ouverte
  on public.actions_requises(chauffeur_id, type_action)
  where statut = 'ouverte' and chauffeur_id is not null;

-- Le type ne contient NI « chauffeur » NI « incident » : le tableau de bord
-- compte ses deux metriques avec un includes() sur le nom du type, et
-- « papiers_chauffeur » aurait gonfle « Sans chauffeur » sans que rien ne le
-- signale. Un nom de type est lu par du code, pas seulement par un humain.
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

  -- Papiers expires ou sur le point de l'etre. Un papier expire est prioritaire
  -- (85) sur un papier qui expire bientot (40) : le premier retire deja le
  -- chauffeur de la liste d'attribution, le second laisse le temps d'agir.
  -- Les chauffeurs inactifs ou bloques sont ecartes : on ne reclame pas les
  -- papiers de quelqu'un qu'on ne fait plus rouler.
  insert into public.actions_requises(chauffeur_id,type_action,priorite,echeance,donnees)
  select d.id,'papiers_a_regulariser',
    case when public.ela_etat_papiers(d.carte_vtc_fin,d.registre_fin,d.assurance_fin)='bientot'
         then 40 else 85 end,
    (select min(f) from (values (d.carte_vtc_fin),(d.registre_fin),(d.assurance_fin)) v(f))::timestamptz,
    jsonb_build_object(
      'libelle', d.nom_affiche,
      'etat', public.ela_etat_papiers(d.carte_vtc_fin,d.registre_fin,d.assurance_fin))
  from public.chauffeurs d
  where d.actif is not false
    and d.statut <> 'bloque'
    and public.ela_etat_papiers(d.carte_vtc_fin,d.registre_fin,d.assurance_fin) <> 'valide'
  on conflict (chauffeur_id,type_action) where statut='ouverte' and chauffeur_id is not null do nothing;

  return n;
end $$;

-- ---------------------------------------------------------------------------
-- LE SERVEUR IMPOSE CE QUE L'ECRAN SE CONTENTAIT DE CACHER
-- ---------------------------------------------------------------------------
-- Les deux RPC choisissaient le chauffeur avec « actif and statut='valide' » :
-- un statut pose a la main, qui ne vieillit pas. Une assurance expiree hier
-- laissait donc le chauffeur attribuable PAR APPEL DIRECT, meme une fois la
-- liste deroulante corrigee — et l'attribution est l'instant precis ou
-- Elatransfer engage sa responsabilite (L3142-1).
--
-- Les deux corps sont recopies a l'identique de 20260916083000_booking_lifecycle_v2.sql,
-- seule la selection du chauffeur change. « create or replace » remplace la
-- definition ENTIERE : security definer et search_path doivent etre repetes,
-- sinon la fonction retombe en security invoker et perd son chemin de
-- recherche fige.
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
  select exists(select 1 from public.chauffeurs c where c.id=p_chauffeur_id
    and public.ela_chauffeur_attribuable(c.actif,c.statut,c.carte_vtc_fin,c.registre_fin,c.assurance_fin))
    into ok;
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
  select * into d from public.chauffeurs c where c.id=p_chauffeur_id
    and public.ela_chauffeur_attribuable(c.actif,c.statut,c.carte_vtc_fin,c.registre_fin,c.assurance_fin);
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

-- « create or replace » conserve les privileges existants, mais une migration
-- rejouee sur une base ou la fonction n'existait pas encore repartirait du
-- defaut (execute pour public). On les repose donc explicitement : ce fichier
-- doit dire l'etat qu'il veut, pas supposer celui qu'il trouve.
revoke all on function public.ela_journaliser_proposition_chauffeur(text,uuid) from public,anon;
revoke all on function public.ela_attribuer_chauffeur(text,uuid) from public,anon;
revoke all on function public.ela_chauffeur_attribuable(boolean,text,date,date,date) from public,anon;
grant execute on function public.ela_journaliser_proposition_chauffeur(text,uuid) to authenticated;
grant execute on function public.ela_attribuer_chauffeur(text,uuid) to authenticated;
grant execute on function public.ela_chauffeur_attribuable(boolean,text,date,date,date) to authenticated;
