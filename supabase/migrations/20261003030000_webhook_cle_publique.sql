-- =====================================================================
-- LE WEBHOOK D'ALERTE PASSE À LA CLÉ PUBLIQUE (3 octobre 2026, Barbaros :
-- « fais-le pour moi »)
-- ---------------------------------------------------------------------
-- Le diagnostic 20261003020000 a rendu, en production : le webhook
-- « nouvelle-demande » sur public.courses porte dans son en-tête
-- Authorization un jeton de rôle service_role — la clé qui contourne toutes
-- les règles de la base, écrite en clair dans la définition du déclencheur,
-- lisible par quiconque a un accès SQL. La clé PUBLIQUE suffit : la relance
-- pg_cron (20260930000000) appelle la même fonction avec elle depuis le
-- 30/09, et nouvelle-demande lit la base avec ses propres droits, jamais
-- avec l'en-tête reçu.
--
-- CE QU'ON FAIT : on relit la définition du déclencheur, on remplace la
-- VALEUR de l'en-tête Authorization par la clé publique, on ajoute l'en-tête
-- apikey avec la même clé (les deux en-têtes que la relance envoie — la
-- combinaison éprouvée en production), et on rejoue la définition avec
-- CREATE OR REPLACE TRIGGER. Tout le reste — table, événement, adresse de
-- la fonction, délai — est repris tel quel.
--
-- CE QU'ON NE FAIT JAMAIS : afficher l'ancienne définition. Le journal
-- GitHub est public ; une erreur de ce bloc ne porte que notre propre
-- phrase. Seule la nouvelle définition est exécutée, et elle est vérifiée
-- AVANT de l'être : plus aucun jeton dedans, la clé publique posée.
--
-- ON NE TOUCHE À RIEN si la forme n'est pas celle attendue : aucun webhook,
-- plusieurs webhooks, ou un en-tête qui n'est pas « Bearer <jeton JWT> ».
-- Rejouée, elle constate que la clé publique est déjà là et ne fait rien.
--
-- La clé est celle de SUPABASE_CLE dans index.html et de la relance : elle
-- est publique par construction (elle part dans la page de chaque client).
-- À lancer par le workflow « Appliquer une migration Supabase ».
-- =====================================================================
do $$
declare
  cle   constant text := 'sb_publishable_hNYqURatjlXc8tYC30XKpA_2VG91UAj';
  n     int;
  t_oid oid;
  t_nom text;
  def   text;
  neuf  text;
begin
  select count(*) into n
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relname = 'courses' and not t.tgisinternal
     and pg_get_triggerdef(t.oid) ilike '%http_request%';
  if n = 0 then
    raise exception 'Aucun webhook http_request sur public.courses : rien à changer.';
  end if;
  if n > 1 then
    raise exception '% webhooks http_request sur public.courses : on ne touche à rien, à regarder dans le tableau de bord.', n;
  end if;

  select t.oid, t.tgname::text into t_oid, t_nom
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relname = 'courses' and not t.tgisinternal
     and pg_get_triggerdef(t.oid) ilike '%http_request%';
  def := pg_get_triggerdef(t_oid);

  if def ~* ($re$"authorization"\s*:\s*"Bearer\s+$re$ || cle || '"') then
    raise notice 'Le webhook « % » porte déjà la clé publique : rien à faire.', t_nom;
    return;
  end if;
  if def !~* $re$"authorization"\s*:\s*"Bearer\s+eyJ[A-Za-z0-9._-]+"$re$ then
    raise exception 'Le webhook « % » n''a pas la forme attendue (Authorization: Bearer <jeton JWT>) : on ne touche à rien.', t_nom;
  end if;

  -- L'en-tête apikey : on remplace sa valeur s'il existe, on l'ajoute sinon.
  if def ~* $re$"apikey"\s*:\s*"[^"]*"$re$ then
    neuf := regexp_replace(def, $re$("apikey"\s*:\s*")[^"]*(")$re$, '\1' || cle || '\2', 'i');
    neuf := regexp_replace(neuf, $re$("authorization"\s*:\s*")Bearer\s+[A-Za-z0-9._-]+(")$re$, '\1Bearer ' || cle || '\2', 'i');
  else
    neuf := regexp_replace(def, $re$("authorization"\s*:\s*")Bearer\s+[A-Za-z0-9._-]+(")$re$,
                           '"apikey":"' || cle || '",\1Bearer ' || cle || '\2', 'i');
  end if;

  -- Vérifié AVANT d'exécuter : plus aucun jeton, la clé publique aux deux endroits.
  if neuf ~ 'eyJ[A-Za-z0-9_-]{20,}' then
    raise exception 'La réécriture a laissé un jeton dans la définition : on ne touche à rien.';
  end if;
  if neuf !~* ($re$"authorization"\s*:\s*"Bearer\s+$re$ || cle || '"')
     or neuf !~* ($re$"apikey"\s*:\s*"$re$ || cle || '"') then
    raise exception 'La réécriture n''a pas posé la clé publique : on ne touche à rien.';
  end if;
  if neuf !~ '^CREATE TRIGGER ' then
    raise exception 'Définition inattendue (pas un CREATE TRIGGER) : on ne touche à rien.';
  end if;
  neuf := regexp_replace(neuf, '^CREATE TRIGGER ', 'CREATE OR REPLACE TRIGGER ');

  execute neuf;
  raise notice 'Webhook « % » : Authorization remplacé par la clé publique, apikey posé.', t_nom;
end $$;

-- Ce que le journal montre : la NATURE des en-têtes après coup, jamais la valeur.
select c.relname as "table",
       t.tgname  as declencheur,
       case
         when pg_get_triggerdef(t.oid) ~* $re$"authorization"\s*:\s*"Bearer\s+sb_publishable_$re$
           then 'Authorization = clé PUBLIQUE (sb_publishable) — correct'
         when pg_get_triggerdef(t.oid) ~* $re$"authorization"\s*:\s*"Bearer\s+eyJ$re$
           then 'Authorization = jeton JWT — ENCORE À REMPLACER'
         else 'Authorization = autre forme — à regarder dans le tableau de bord'
       end as autorisation,
       case
         when pg_get_triggerdef(t.oid) ~* $re$"apikey"\s*:\s*"sb_publishable_$re$ then 'apikey = publique'
         else 'apikey = absente ou autre'
       end as apikey
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace s on s.oid = c.relnamespace
 where s.nspname = 'public' and not t.tgisinternal
   and pg_get_triggerdef(t.oid) ilike '%http_request%'
 order by 1, 2;
