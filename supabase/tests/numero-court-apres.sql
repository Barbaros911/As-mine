-- ============================================================================
-- LE NUMERO COURT -- epreuves APRES la migration (appliquee DEUX fois : elle
-- doit se rejouer sans renumeroter).
-- ============================================================================
select set_config('ela.interdit', 'non', false);

do $$
declare n bigint; v int; j int;
begin
  -- Aucun declencheur n'a tourne pendant la numerotation (sinon la sentinelle
  -- de refus aurait fait tomber la migration, et le journal ne serait pas vide).
  select count(*) into j from public.sentinelle_journal;
  if j <> 0 then raise exception 'la numerotation est passee par un declencheur (% ligne(s) au journal)', j; end if;

  -- L'ordre de creation, a partir de 1001.
  select numero into n from public.courses where ref = 'ELA-26-09-AAAAA';
  if n is distinct from 1001 then raise exception 'la plus ancienne devait etre 1001, trouve %', n; end if;
  select numero into n from public.courses where ref = 'ELA-26-10-BBBBB';
  if n is distinct from 1002 then raise exception 'la deuxieme devait etre 1002, trouve %', n; end if;
  select numero into n from public.courses where ref = 'ELA-26-10-CCCCC';
  if n is distinct from 1003 then raise exception 'la troisieme devait etre 1003, trouve %', n; end if;
  -- Recopie dans le bon : c'est par lui que toutes les pages le lisent.
  select (bon->>'numero')::bigint into n from public.courses where ref = 'ELA-26-09-AAAAA';
  if n is distinct from 1001 then raise exception 'le bon de la plus ancienne devait porter 1001, trouve %', n; end if;
  if (select bon->>'ref' from public.courses where ref = 'ELA-26-09-AAAAA') is distinct from 'ELA-26-09-AAAAA' then
    raise exception 'la recopie du numero a abime le reste du bon';
  end if;

  -- La version est montee UNE fois (deux passages, une seule numerotation) :
  -- c'est ce qui fait relire leurs courses aux appareils de l'admin.
  select version into v from public.courses where ref = 'ELA-26-10-CCCCC';
  if v is distinct from 2 then raise exception 'version attendue 2 apres la numerotation, trouve %', v; end if;
end $$;

-- Une course neuve prend le numero suivant, meme si le depot en propose un.
insert into public.courses(ref, statut, bon, numero) values ('ELA-26-10-DDDDD', 'attente', '{"numero":7}', 7);
insert into public.courses(ref, statut, bon) values ('ELA-26-10-EEEEE', 'attente', '{}');

do $$
declare n bigint; j int;
begin
  select numero into n from public.courses where ref = 'ELA-26-10-DDDDD';
  if n is distinct from 1004 then raise exception 'une course neuve devait etre 1004 (le 7 propose ignore), trouve %', n; end if;
  select (bon->>'numero')::bigint into n from public.courses where ref = 'ELA-26-10-DDDDD';
  if n is distinct from 1004 then raise exception 'le bon d''une course neuve devait porter 1004 (le 7 propose ecrase), trouve %', n; end if;
  select numero into n from public.courses where ref = 'ELA-26-10-EEEEE';
  if n is distinct from 1005 then raise exception 'la suivante devait etre 1005, trouve %', n; end if;
  -- Les declencheurs sont bien REMIS : la sentinelle a vu les deux depots.
  select count(*) into j from public.sentinelle_journal where op = 'INSERT';
  if j <> 2 then raise exception 'les declencheurs ne sont pas revenus apres la numerotation (% insertion(s) vue(s))', j; end if;
end $$;

-- Immuable : une modification qui tente de changer le numero -- dans la
-- colonne ou dans le bon renvoye par un appareil -- ne le change pas.
update public.courses set numero = 1, statut = 'confirmee', bon = '{"numero":1,"note":"x"}' where ref = 'ELA-26-10-EEEEE';
do $$
declare n bigint; s text;
begin
  select numero, statut into n, s from public.courses where ref = 'ELA-26-10-EEEEE';
  if n is distinct from 1005 then raise exception 'le numero a change sur une modification : %', n; end if;
  select (bon->>'numero')::bigint into n from public.courses where ref = 'ELA-26-10-EEEEE';
  if n is distinct from 1005 then raise exception 'le bon renvoye a reecrit le numero : %', n; end if;
  if (select bon->>'note' from public.courses where ref = 'ELA-26-10-EEEEE') is distinct from 'x' then
    raise exception 'la modification du bon a ete perdue';
  end if;
  if s <> 'confirmee' then raise exception 'la modification elle-meme a ete perdue'; end if;
end $$;

-- Unique : un numero deja pris est refuse, meme ecrit sans declencheur.
-- (Et sans declencheur ni numero, « not null » refuse : pas de numero invente.)
do $$
begin
  begin
    alter table public.courses disable trigger courses_numero;
    insert into public.courses(ref, statut, bon, numero) values ('ELA-26-10-FFFFF', 'attente', '{}', 1001);
    raise exception 'un numero deja pris a ete accepte';
  exception when unique_violation then null;
  end;
  alter table public.courses enable trigger courses_numero;
end $$;

-- Rejouee une troisieme fois apres des depots : rien ne bouge, et la
-- sequence ne redonne jamais un numero pris.
\ir ../migrations/20261006000000_numero_court.sql
insert into public.courses(ref, statut, bon) values ('ELA-26-10-GGGGG', 'attente', '{}');
do $$
declare n bigint;
begin
  select numero into n from public.courses where ref = 'ELA-26-10-GGGGG';
  if n is distinct from 1006 then raise exception 'apres une troisieme application, attendu 1006, trouve %', n; end if;
  select numero into n from public.courses where ref = 'ELA-26-09-AAAAA';
  if n is distinct from 1001 then raise exception 'une application rejouee a renumerote : %', n; end if;
end $$;

select 'numero court : toutes les epreuves passent' as resultat;
