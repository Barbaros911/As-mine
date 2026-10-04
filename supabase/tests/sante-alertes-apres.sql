-- ============================================================================
-- LE VOYANT DES ALERTES — epreuves, APRES la migration 20261004010000.
-- Les comparaisons sont ecrites en « is distinct from » : sur une valeur qui
-- peut etre NULL, « <> » rend NULL et le controle ne peut jamais tomber.
-- ============================================================================

-- 1. PERSONNE D'AUTRE QU'UN EXPLOITANT CONNECTE NE LIT RIEN.
do $$
begin
  if has_function_privilege('anon', 'public.ela_sante_alertes()', 'execute') then
    raise exception 'anon peut appeler ela_sante_alertes'; end if;
  if not has_function_privilege('authenticated', 'public.ela_sante_alertes()', 'execute') then
    raise exception 'authenticated ne peut pas appeler ela_sante_alertes : le voyant resterait gris'; end if;
  if has_function_privilege('anon', 'public.ela_sante_mesures()', 'execute')
     or has_function_privilege('authenticated', 'public.ela_sante_mesures()', 'execute') then
    raise exception 'ela_sante_mesures est accordee : elle contourne le controle d''exploitant'; end if;
  if (select count(*) from pg_proc where proname in ('ela_sante_mesures','ela_sante_alertes')
        and prosecdef and array_to_string(proconfig, ',') like '%search_path=%') is distinct from 2::bigint then
    raise exception 'les deux fonctions doivent etre « security definer » avec un search_path fige'; end if;
end $$;

-- 2. UN NON-EXPLOITANT EST REFUSE, ET C'EST BIEN LA FONCTION QUI REFUSE.
do $$
declare erreur text := '';
begin
  update public.socle_reglages set exploitant = false;
  begin
    perform public.ela_sante_alertes();
  exception when others then erreur := sqlerrm;
  end;
  update public.socle_reglages set exploitant = true;
  if erreur is distinct from 'acces_refuse' then
    raise exception 'un non-exploitant n''est pas refuse (recu : %)', erreur; end if;
  -- Le meme appel, exploitant allume, passe : le refus venait du controle.
  perform public.ela_sante_alertes();
end $$;

-- 3. ETAT SAIN : la relance tourne, aucune demande.
insert into cron.job(jobid, jobname, active) values (1, 'ela-relance-alertes', true);
insert into cron.job_run_details(jobid, status, start_time, end_time)
  values (1, 'succeeded', now() - interval '11 seconds', now() - interval '10 seconds');
do $$
declare m json := public.ela_sante_alertes();
begin
  if (select count(*) from json_object_keys(m)) is distinct from 7::bigint then
    raise exception 'la fonction ne rend pas les sept mesures : %', m; end if;
  if (m->>'sans_alerte')::int is distinct from 0 then raise exception 'sans_alerte faux a vide : %', m; end if;
  if (m->>'relance_active')::boolean is distinct from true then raise exception 'relance non lue : %', m; end if;
  if (m->>'derniere_relance_s') is null or (m->>'derniere_relance_s')::numeric not between 5 and 60 then
    raise exception 'dernier passage de la relance mal lu : %', m; end if;
  if (m->>'demandes_24h')::int is distinct from 0 then raise exception 'demandes_24h faux a vide : %', m; end if;
end $$;

-- 4. LES DEMANDES : seule celle du site, en attente depuis plus de 2 min,
--    SANS alerte reussie, est comptee.
insert into public.courses(ref, statut, bon, cree_le) values
 ('ELA-26-10-AAAAA','attente',  '{"securite":{"empreinteDepot":"x"}}', now() - interval '5 minutes'),   -- comptee
 ('ELA-26-10-BBBBB','attente',  '{"securite":{"empreinteDepot":"x"}}', now() - interval '5 minutes'),   -- alertee
 ('ELA-26-10-CCCCC','attente',  '{}',                                   now() - interval '5 minutes'),   -- saisie exploitant
 ('ELA-26-10-DDDDD','attente',  '{"securite":{"empreinteDepot":"x"}}', now() - interval '1 minute'),    -- trop recente
 ('ELA-26-10-EEEEE','confirmee','{"securite":{"empreinteDepot":"x"}}', now() - interval '5 minutes'),   -- deja traitee
 ('ELA-26-10-FFFFF','attente',  '{"securite":{"empreinteDepot":"x"}}', now() - interval '7 hours');     -- hors fenetre
insert into public.journal_notifications_admin(type_evenement, course_ref, canal, statut)
  values ('nouvelle_demande', 'ELA-26-10-BBBBB', 'telegram', 'envoye');
-- Ce qui n'est PAS une alerte reussie pour AAAAA : un push sans abonne, un
-- Telegram indisponible. Elle doit rester comptee sans alerte.
insert into public.journal_notifications_admin(type_evenement, course_ref, canal, statut) values
  ('nouvelle_demande', 'ELA-26-10-AAAAA', 'push', 'aucun_abonne'),
  ('nouvelle_demande', 'ELA-26-10-AAAAA', 'telegram', 'indisponible');
do $$
declare m json := public.ela_sante_alertes();
begin
  if (m->>'sans_alerte')::int is distinct from 1 then
    raise exception 'sans_alerte devrait etre 1 (la seule demande du site non alertee) : %', m; end if;
  if (m->>'demandes_24h')::int is distinct from 5 then
    raise exception 'demandes_24h devrait compter les 5 demandes du site, pas la saisie : %', m; end if;
  if (m->>'telegram_ok_1h')::int is distinct from 1 then raise exception 'telegram_ok_1h faux : %', m; end if;
  if (m->>'telegram_echecs_1h')::int is distinct from 1 then
    raise exception '« indisponible » (Telegram non configure) doit compter comme un echec : %', m; end if;
end $$;

-- 5. TELEGRAM : les echecs de la derniere heure, pas ceux d'avant.
insert into public.journal_notifications_admin(type_evenement, course_ref, canal, statut, cree_le) values
  ('relance', 'ELA-26-10-AAAAA', 'telegram', 'echec', now() - interval '10 minutes'),
  ('relance', 'ELA-26-10-AAAAA', 'telegram', 'echec', now() - interval '20 minutes'),
  ('relance', 'ELA-26-10-AAAAA', 'telegram', 'echec', now() - interval '90 minutes'),
  ('relance', 'ELA-26-10-AAAAA', 'push',     'echec', now() - interval '5 minutes'),
  -- Un envoi reussi d'il y a 90 min ne compte pas : un succes d'hier
  -- masquerait une panne complete d'aujourd'hui.
  ('nouvelle_demande', 'ELA-26-10-FFFFF', 'telegram', 'envoye', now() - interval '90 minutes');
do $$
declare m json := public.ela_sante_alertes();
begin
  if (m->>'telegram_echecs_1h')::int is distinct from 3 then
    raise exception 'telegram_echecs_1h devrait etre 3 (2 echecs + 1 indisponible ; ni l''ancien, ni le push) : %', m; end if;
  if (m->>'telegram_ok_1h')::int is distinct from 1 then
    raise exception 'un envoi reussi d''il y a 90 min ne doit pas compter : %', m; end if;
  -- Un echec de push n'efface pas l'absence d'alerte reussie.
  if (m->>'sans_alerte')::int is distinct from 1 then raise exception 'sans_alerte a bouge : %', m; end if;
end $$;

-- 5 bis. « VU » N'EST PAS UN ENVOI. Ouvrir une course dans l'admin (ela_marquer_vue)
--        ou appuyer sur « Vu » dans Telegram ecrit canal 'telegram', statut
--        'envoye', type 'vue'. Ce n'est pas une alerte partie : pendant une
--        panne de Telegram, ces lignes faisaient passer le voyant au vert.
insert into public.journal_notifications_admin(type_evenement, course_ref, canal, statut, detail)
  values ('vue', 'ELA-26-10-AAAAA', 'telegram', 'envoye', 'ouverte dans l''admin');
do $$
declare m json := public.ela_sante_alertes();
begin
  if (m->>'telegram_ok_1h')::int is distinct from 1 then
    raise exception 'une ligne « vue » a ete comptee comme un envoi Telegram reussi : %', m; end if;
end $$;

-- 6. LA RELANCE : passages rates du dernier quart d'heure, puis tache arretee, puis absente.
insert into cron.job_run_details(jobid, status, start_time, end_time) values
  (1, 'failed', now() - interval '3 minutes',  now() - interval '3 minutes'),
  (1, 'failed', now() - interval '4 minutes',  now() - interval '4 minutes'),
  (1, 'failed', now() - interval '20 minutes', now() - interval '20 minutes');
do $$
declare m json;
begin
  m := public.ela_sante_alertes();
  if (m->>'relances_echouees_15min')::int is distinct from 2 then
    raise exception 'relances_echouees_15min devrait etre 2 : %', m; end if;
  -- Le dernier passage est le PLUS RECENT (il y a 10 s), pas le plus ancien.
  if (m->>'derniere_relance_s') is null or (m->>'derniere_relance_s')::numeric not between 5 and 60 then
    raise exception 'le dernier passage de la relance n''est pas le plus recent : %', m; end if;
  update cron.job set active = false where jobname = 'ela-relance-alertes';
  m := public.ela_sante_alertes();
  if (m->>'relance_active')::boolean is distinct from false then raise exception 'relance arretee non vue : %', m; end if;
  delete from cron.job_run_details; delete from cron.job;
  m := public.ela_sante_alertes();
  if (m->>'relance_active')::boolean is distinct from false then raise exception 'relance absente non vue : %', m; end if;
  if (m->>'derniere_relance_s') is not null then raise exception 'relance absente : aucun passage attendu : %', m; end if;
end $$;

select 'sante-alertes : toutes les epreuves passent' as resultat;
