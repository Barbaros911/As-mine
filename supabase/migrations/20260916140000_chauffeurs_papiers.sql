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
  'Fin de validite de la carte professionnelle VTC. NULL = non renseigne, ce qui vaut perime : dans les deux cas on ne peut rien prouver.';
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
    when fin < (now() at time zone 'Europe/Paris')::date
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
    when c.statut = 'a_verifier'         then 'a_verifier'
    when public.ela_etat_papiers(c.carte_vtc_fin, c.registre_fin, c.assurance_fin)
         in ('perime','manquant')        then 'papiers'
    when public.ela_etat_papiers(c.carte_vtc_fin, c.registre_fin, c.assurance_fin)
         = 'bientot'                     then 'a_renouveler'
    else 'valide'
  end as etat_effectif,
  -- Attribuable ou non. C'est CE champ que le selecteur de chauffeur lit, et
  -- jamais « statut » : un statut pose a la main ne vieillit pas.
  (c.actif is not false
   and c.statut not in ('bloque','a_verifier')
   and public.ela_etat_papiers(c.carte_vtc_fin, c.registre_fin, c.assurance_fin)
       <> 'perime') as attribuable
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
