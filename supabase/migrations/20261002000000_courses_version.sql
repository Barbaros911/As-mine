-- =====================================================================
-- COURSES : UN NUMÉRO DE VERSION ET UNE DATE DE MODIFICATION, SERVEUR
-- ---------------------------------------------------------------------
-- 2 octobre 2026, Barbaros : « je valide une course, ça revient ; je
-- refuse, ça revient ». La cause : l'admin et le serveur étaient DEUX
-- vérités. L'appareil gardait sa liste, le serveur la sienne, et rien ne
-- disait laquelle était la plus récente. L'appareil ne mettait jamais à
-- jour une course qu'il connaissait déjà, et une modification partie d'un
-- appareil périmé ÉCRASAIT l'état du serveur.
--
-- CE QUE CETTE MIGRATION POSE : chaque course porte un numéro de version
-- qui monte à chaque modification, et la date de cette modification.
-- L'admin s'en sert pour deux choses :
--   · savoir si le serveur est plus récent que sa copie (il remplace alors
--     sa copie) ;
--   · écrire SOUS CONDITION : « modifie la version N » — si la version a
--     bougé entre-temps, le serveur ne touche à rien et l'appareil relit.
--     Impossible d'écraser du frais avec du vieux.
--
-- Rejouable : « if not exists » partout, le déclencheur est reposé.
-- Les courses existantes reçoivent la version 1 et la date de maintenant.
-- Aucune donnée n'est touchée, aucune policy ne change.
-- =====================================================================
alter table public.courses add column if not exists version integer not null default 1;
alter table public.courses add column if not exists modifie_le timestamptz not null default now();

create or replace function public.ela_courses_version()
returns trigger language plpgsql as $$
begin
  new.version := coalesce(old.version, 0) + 1;
  new.modifie_le := now();
  return new;
end $$;

drop trigger if exists courses_version on public.courses;
create trigger courses_version
  before update on public.courses
  for each row execute function public.ela_courses_version();

-- La sonde de l'admin demande « la course modifiée le plus récemment »
-- toutes les 8 secondes : l'index évite de trier mille lignes à chaque fois.
create index if not exists courses_modifie_le_idx on public.courses (modifie_le desc);

-- Ce que la table est devenue, lisible dans le journal du workflow.
select column_name, data_type from information_schema.columns
 where table_schema = 'public' and table_name = 'courses' order by ordinal_position;
