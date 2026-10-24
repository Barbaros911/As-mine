-- ============================================================================
-- DEUX APPAREILS ÉMETTENT EN MÊME TEMPS — deux vraies sessions (dblink).
-- 9a. Même course : une seule facture, l'autre est refusée NOMMÉMENT, aucun
--     numéro consommé pour rien.
-- 9b. Courses différentes : deux factures, deux numéros DIFFÉRENTS et qui se
--     suivent. La seconde attend le verrou du compteur, puis prend le suivant.
-- Le paramètre « essai.dbl » est la chaîne de connexion posée par le script.
-- ============================================================================
create extension if not exists dblink;
create or replace function public.essai_doc(p_cle text, p_refs text[]) returns jsonb language sql as $$
  select jsonb_build_object('cle', p_cle, 'du', '2026-10-01', 'au', '2026-10-31',
    'emetteur', '{"nom":"Elatransfer","siret":"12345678900011","adresse":"Paris"}'::jsonb,
    'client', '{"id":"CH-ayse","nom":"Ayse K."}'::jsonb,
    'lignes', (select jsonb_agg(jsonb_build_object('ref', r, 'commission', 5)) from unnest(p_refs) r),
    'refs', to_jsonb(p_refs), 'ht', 5 * array_length(p_refs, 1), 'tauxTva', 0, 'tva', 0, 'ttc', 5 * array_length(p_refs, 1)) $$;

-- ── 9a ──
-- La seconde session est ouverte par le propriétaire de la base (dblink
-- refuse à un rôle ordinaire une connexion sans mot de passe), puis joue
-- elle-même l'admin connecté, comme la première.
select dblink_connect('conc', current_setting('essai.dbl'));
select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000001', 'aal2');
set role authenticated;
do $$ declare n text; begin
  n := public.ela_facture_emettre(public.essai_doc('00000000-0000-0000-0000-0000000000b1', array['ELA-26-10-R0004']))->>'num';
  perform set_config('essai.num_a', n, false);
  perform dblink_exec('conc', 'set request.jwt.claims = ''{"sub":"aaaaaaaa-0000-0000-0000-000000000001","session_id":"aal2","role":"authenticated"}''');
  perform dblink_exec('conc', 'set role authenticated');
  perform dblink_send_query('conc', 'select public.ela_facture_emettre(public.essai_doc(''00000000-0000-0000-0000-0000000000b2'', array[''ELA-26-10-R0004'']))->>''num''');
end $$;
do $$ declare r text; e text; begin
  begin select * into r from dblink_get_result('conc') as t(x text);
  exception when others then e := sqlerrm; end;
  perform dblink_disconnect('conc');
  if e is null then raise exception 'DEUX FACTURES SUR LA MÊME COURSE (la seconde : %)', r; end if;
  if e not like '%course_non_facturable%' then raise exception 'seconde émission refusée pour une autre raison : %', e; end if;
  raise notice 'ok — 9a. même course, deux appareils : une seule facture';
end $$;
reset role;

-- ── 9b ──
select dblink_connect('conc', current_setting('essai.dbl'));
select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000001', 'aal2');
set role authenticated;
do $$ declare n text; begin
  n := public.ela_facture_emettre(public.essai_doc('00000000-0000-0000-0000-0000000000c1', array['ELA-26-10-R0005']))->>'num';
  perform set_config('essai.num_b1', n, false);
  perform dblink_exec('conc', 'set request.jwt.claims = ''{"sub":"aaaaaaaa-0000-0000-0000-000000000001","session_id":"aal2","role":"authenticated"}''');
  perform dblink_exec('conc', 'set role authenticated');
  perform dblink_send_query('conc', 'select public.ela_facture_emettre(public.essai_doc(''00000000-0000-0000-0000-0000000000c2'', array[''ELA-26-10-R0007'']))->>''num''');
end $$;
do $$ declare r text; a text := current_setting('essai.num_a'); b1 text := current_setting('essai.num_b1'); begin
  select * into r from dblink_get_result('conc') as t(x text);
  perform dblink_disconnect('conc');
  if r is null or r = b1 then raise exception 'DEUX APPAREILS, MÊME NUMÉRO : % et %', b1, r; end if;
  if public.ela_rang_facture(b1) is distinct from public.ela_rang_facture(a) + 1 or public.ela_rang_facture(r) is distinct from public.ela_rang_facture(b1) + 1 then
    raise exception 'numéros non consécutifs : %, %, % (un trou)', a, b1, r; end if;
  raise notice 'ok — 9b. deux appareils, deux courses : %, % — distincts et consécutifs', b1, r;
end $$;
reset role;
select 'concurrence : tient' as etat;
