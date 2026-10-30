-- ============================================================================
-- LES ALERTES SE SURVEILLENT ELLES-MEMES — epreuves, APRES la migration
-- 20261025000000 (jouee deux fois : elle doit se rejouer).
-- Comparaisons en « is distinct from » : sur une valeur qui peut etre NULL,
-- « <> » rend NULL et le controle ne peut jamais tomber.
-- ============================================================================

-- La chaine pose les vrais operateurs (role-agent-avant.sql, puis
-- 20260929030000) : la reactivite lit les fonctions du registre, qui les
-- exigent. On joue l'admin ; « personne » est un identifiant vide.
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);

-- 1. PERSONNE NE LIT LES BATTEMENTS ; SEUL UN EXPLOITANT LIT LA REACTIVITE.
do $$
begin
  if has_table_privilege('anon', 'public.ela_battements', 'select')
     or has_table_privilege('authenticated', 'public.ela_battements', 'select')
     or has_table_privilege('anon', 'public.ela_battements', 'insert')
     or has_table_privilege('authenticated', 'public.ela_battements', 'insert') then
    raise exception 'anon ou authenticated a un droit sur ela_battements'; end if;
  if has_function_privilege('anon', 'public.ela_reactivite(text)', 'execute') then
    raise exception 'anon peut lire la reactivite'; end if;
  if not has_function_privilege('authenticated', 'public.ela_reactivite(text)', 'execute') then
    raise exception 'un exploitant ne peut pas lire la reactivite'; end if;
  if has_function_privilege('authenticated', 'public.ela_sante_mesures()', 'execute') then
    raise exception 'ela_sante_mesures est accordee : elle contourne le controle d''exploitant'; end if;
end $$;
do $$
declare erreur text := '';
begin
  perform set_config('test.uid', '', false);
  begin perform public.ela_reactivite('semaine'); exception when others then erreur := sqlerrm; end;
  perform set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
  if erreur is distinct from 'acces_refuse' then
    raise exception 'un non-exploitant n''est pas refuse par ela_reactivite (recu : %)', erreur; end if;
end $$;

-- 2. LE PREMIER BATTEMENT EST POSE PAR LA MIGRATION, UNE SEULE LIGNE MEME
--    REJOUEE ; LA MESURE A SES QUATORZE CLES.
do $$
declare m json := public.ela_sante_alertes();
begin
  if (select count(*) from public.ela_battements) is distinct from 1::bigint then
    raise exception 'la migration rejouee devrait laisser un seul battement'; end if;
  if (select count(*) from json_object_keys(m)) is distinct from 14::bigint then
    raise exception 'la mesure ne rend pas ses quatorze cles : %', m; end if;
  if (m->>'relance_ok_s') is null or (m->>'relance_ok_s')::numeric > 5 then
    raise exception 'le battement pose par la migration n''est pas lu comme frais : %', m; end if;
  if (m->>'abonnes_push')::int is distinct from 0 or (m->>'push_ok_1h')::int is distinct from 0
     or (m->>'push_echecs_1h')::int is distinct from 0 then
    raise exception 'notifications fausses a vide : %', m; end if;
end $$;

-- 3. UN BATTEMENT VIEUX DE 10 MIN SE LIT 600 S ; ABSENT, NULL.
update public.ela_battements set le = now() - interval '10 minutes' where nom = 'relance';
do $$
declare m json := public.ela_sante_alertes();
begin
  if (m->>'relance_ok_s')::numeric is distinct from 600::numeric then
    raise exception 'un battement de 10 min devrait se lire 600 s : %', m; end if;
end $$;
delete from public.ela_battements;
do $$
declare m json := public.ela_sante_alertes();
begin
  if (m->>'relance_ok_s') is not null then
    raise exception 'sans battement, relance_ok_s doit etre NULL (« jamais battu ») : %', m; end if;
end $$;

-- 4. LA NOTIFICATION ELA : appareils ACTIFS seulement ; envois et echecs de
--    la derniere heure seulement ; « aucun_abonne » et « indisponible » sont
--    des echecs ; un Telegram n'est pas une notification.
insert into public.abonnements_admin(user_id, abonnement, actif) values
  ('00000000-0000-0000-0000-000000000001', '{"endpoint":"https://web.push.apple.com/a"}', true),
  ('00000000-0000-0000-0000-000000000001', '{"endpoint":"https://fcm.googleapis.com/b"}', false);
insert into public.journal_notifications_admin(type_evenement, course_ref, canal, statut, cree_le) values
  ('nouvelle_reservation', 'ELA-26-10-PUSH1', 'push', 'envoye', now() - interval '5 minutes'),
  ('rappel_reservation',   'ELA-26-10-PUSH1', 'push', 'echec', now() - interval '4 minutes'),
  ('rappel_reservation',   'ELA-26-10-PUSH1', 'push', 'aucun_abonne', now() - interval '3 minutes'),
  ('rappel_reservation',   'ELA-26-10-PUSH1', 'push', 'indisponible', now() - interval '2 minutes'),
  ('rappel_reservation',   'ELA-26-10-PUSH1', 'push', 'envoye', now() - interval '2 hours'),
  ('rappel_reservation',   'ELA-26-10-PUSH1', 'telegram', 'envoye', now() - interval '1 minute');
do $$
declare m json := public.ela_sante_alertes();
begin
  if (m->>'abonnes_push')::int is distinct from 1 then
    raise exception 'abonnes_push ne doit compter que les abonnements actifs : %', m; end if;
  if (m->>'push_ok_1h')::int is distinct from 1 then
    raise exception 'push_ok_1h devrait etre 1 (ni l''ancien, ni le Telegram) : %', m; end if;
  if (m->>'push_echecs_1h')::int is distinct from 3 then
    raise exception 'push_echecs_1h devrait compter echec, aucun_abonne et indisponible : %', m; end if;
end $$;

-- 5. LA REACTIVITE, sur des demandes aux delais connus (creees « maintenant
--    moins quelques minutes » : toujours dans la semaine en cours... sauf le
--    lundi a minuit ; on prend donc la periode « annee », et l'une est
--    creee AVANT le 1er janvier pour verifier la borne).
--    « confirmeeLe » porte ses microsecondes, comme l'heure ISO que l'admin
--    ecrit (millisecondes) : arrondi a la seconde, l'ecart avec « cree_le »
--    valait 240 s MOINS la fraction de seconde de now(), et la mediane
--    arrondie donnait 239 une fois sur deux (mesure le 29/10 : 5 sur 10).
delete from public.journal_notifications_admin;
insert into public.courses(ref, statut, bon, cree_le) values
 -- vue en 1 min par le bouton, confirmee en 4 min
 ('ELA-26-10-RAPID', 'confirmee', jsonb_build_object('securite', '{"empreinteDepot":"x"}'::jsonb,
    'confirmeeLe', to_char((now() - interval '6 minutes') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')),
    now() - interval '10 minutes'),
 -- jamais vue par le bouton, confirmee en 12 min : la confirmation vaut vue
 ('ELA-26-10-MOYEN', 'confirmee', jsonb_build_object('securite', '{"empreinteDepot":"x"}'::jsonb,
    'confirmeeLe', to_char((now() - interval '18 minutes') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')),
    now() - interval '30 minutes'),
 -- en attente, jamais vue
 ('ELA-26-10-OUBLI', 'attente', '{"securite":{"empreinteDepot":"x"}}', now() - interval '40 minutes'),
 -- une saisie de l'exploitant : hors des chiffres
 ('ELA-26-10-SAISI', 'confirmee', '{}', now() - interval '20 minutes'),
 -- une course d'essai : hors des chiffres
 ('ELA-26-10-ESSAI', 'attente', '{"securite":{"empreinteDepot":"x"},"essai":true}', now() - interval '20 minutes'),
 -- l'an dernier : hors de la periode
 ('ELA-25-12-VIEIL', 'attente', '{"securite":{"empreinteDepot":"x"}}', date_trunc('year', now()) - interval '2 days'),
 -- une confirmation datee par un telephone en avance : jamais un delai negatif
 ('ELA-26-10-AVANC', 'confirmee', jsonb_build_object('securite', '{"empreinteDepot":"x"}'::jsonb,
    'confirmeeLe', to_char((now() - interval '3 minutes') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')),
    now() - interval '2 minutes');
insert into public.journal_notifications_admin(type_evenement, course_ref, canal, statut, cree_le) values
  ('nouvelle_reservation', 'ELA-26-10-RAPID', 'telegram', 'envoye', now() - interval '10 minutes' + interval '2 seconds'),
  ('vue',                  'ELA-26-10-RAPID', 'telegram', 'envoye', now() - interval '9 minutes'),
  ('nouvelle_reservation', 'ELA-26-10-MOYEN', 'push',     'aucun_abonne', now() - interval '30 minutes'),
  ('nouvelle_reservation', 'ELA-26-10-MOYEN', 'telegram', 'envoye', now() - interval '30 minutes' + interval '4 seconds'),
  ('nouvelle_reservation', 'ELA-26-10-OUBLI', 'telegram', 'echec',  now() - interval '40 minutes'),
  ('nouvelle_reservation', 'ELA-26-10-OUBLI', 'email',    'indisponible', now() - interval '40 minutes');
do $$
declare r jsonb := public.ela_reactivite('annee');
begin
  if (r->>'demandes')::int is distinct from 4 then
    raise exception 'demandes : 4 attendues (ni la saisie, ni l''essai, ni l''an dernier) : %', r; end if;
  if (r->>'vues_2min')::int is distinct from 2 then
    raise exception 'vues_2min : RAPID (1 min) et AVANC (0, jamais negatif) : %', r; end if;
  if (r->>'confirmees_5min')::int is distinct from 2 or (r->>'confirmees_15min')::int is distinct from 3 then
    raise exception 'confirmees en 5 min : RAPID et AVANC ; en 15 min : plus MOYEN : %', r; end if;
  if (r->>'jamais_vues')::int is distinct from 1 or (r->>'jamais_vues_en_attente')::int is distinct from 1 then
    raise exception 'une seule jamais vue (OUBLI) : la confirmation de MOYEN vaut vue : %', r; end if;
  if (r->>'alerte_mediane_s')::numeric is distinct from 3::numeric then
    raise exception 'premiere alerte reussie : mediane de 2 s et 4 s, l''echec ne compte pas : %', r; end if;
  if (r->>'confirmation_mediane_s')::numeric is distinct from 240::numeric then
    raise exception 'confirmation : mediane de 0, 240 et 720 s : %', r; end if;
  if (r->>'alertes_echec')::int is distinct from 2 then
    raise exception 'alertes en echec : le push sans abonne et le Telegram rate, pas l''e-mail non configure : %', r; end if;
  if r::text ~ '(Jeanne|06 12|empreinte)' then raise exception 'la reactivite sort autre chose que des comptes : %', r; end if;
end $$;
do $$
declare r jsonb := public.ela_reactivite('n''importe quoi');
begin
  if r->>'periode' is distinct from 'semaine' then
    raise exception 'une periode inconnue doit retomber sur la semaine : %', r; end if;
end $$;

-- 6. L'ALERTE D'ESSAI : un exploitant seul la demande, une par minute ; la
--    ligne « essai » porte « demande » jusqu'a ce que la relance la prenne.
do $$
declare r json; erreur text := '';
begin
  if has_function_privilege('anon', 'public.ela_demander_essai_alerte()', 'execute') then
    raise exception 'anon peut demander une alerte d''essai'; end if;
  if not has_function_privilege('authenticated', 'public.ela_demander_essai_alerte()', 'execute') then
    raise exception 'un exploitant ne peut pas demander d''alerte d''essai'; end if;
  perform set_config('test.uid', '', false);
  begin perform public.ela_demander_essai_alerte(); exception when others then erreur := sqlerrm; end;
  perform set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
  if erreur is distinct from 'acces_refuse' then
    raise exception 'un non-exploitant n''est pas refuse (recu : %)', erreur; end if;
  if exists (select 1 from public.ela_battements where nom = 'essai') then
    raise exception 'un appel refuse a quand meme depose un essai'; end if;
  r := public.ela_demander_essai_alerte();
  if (r->>'ok')::boolean is distinct from true then raise exception 'premier essai refuse : %', r; end if;
  if (select detail from public.ela_battements where nom = 'essai') is distinct from 'demande' then
    raise exception 'l''essai n''est pas depose en « demande »'; end if;
  r := public.ela_demander_essai_alerte();
  if (r->>'ok')::boolean is distinct from false or r->>'raison' is distinct from 'deja_en_route' then
    raise exception 'un second essai dans la minute devrait etre refuse : %', r; end if;
  update public.ela_battements set le = now() - interval '2 minutes', detail = 'fait : notification envoyée, Telegram envoyé' where nom = 'essai';
  r := public.ela_demander_essai_alerte();
  if (r->>'ok')::boolean is distinct from true
     or (select detail from public.ela_battements where nom = 'essai') is distinct from 'demande' then
    raise exception 'apres une minute, un nouvel essai doit repartir en « demande » : %', r; end if;
  -- Le battement de la relance n'est pas touche par un essai.
  if (select count(*) from public.ela_battements) is distinct from 1::bigint then
    raise exception 'seule la ligne « essai » devait exister ici (la relance a ete effacee au bloc 3)'; end if;
end $$;

select 'alertes-suivi : toutes les epreuves passent' as resultat;
