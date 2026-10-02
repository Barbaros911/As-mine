-- =====================================================================
-- DIAGNOSTIC — QUELLE CLÉ PORTE LE WEBHOOK D'ALERTE ? (lecture seule)
-- ---------------------------------------------------------------------
-- 3 octobre 2026, Barbaros : « regarde toi-même ». Le webhook qui appelle
-- « nouvelle-demande » à chaque INSERT dans courses a été créé dans le
-- tableau de bord, pas dans le dépôt. Son en-tête Authorization porte soit
-- la clé PUBLIQUE du site (suffisante : la fonction relit la course avec
-- ses propres droits depuis le 28/09), soit une clé service_role — qui
-- serait alors lisible par tout accès SQL, et qu'il faudrait remplacer.
--
-- LE JOURNAL GITHUB EST PUBLIC : ON NE SORT JAMAIS LA VALEUR. Seulement sa
-- NATURE : « clé publique », « clé secrète », ou « jeton JWT, rôle = anon /
-- service_role ». Le rôle se lit dans le jeton lui-même (sa partie centrale
-- est un JSON encodé, pas chiffré) ; le jeton n'est pas affiché.
-- Ne modifie rien. À lancer par le workflow « Appliquer une migration
-- Supabase » avec ce fichier.
-- =====================================================================
with declencheurs as (
  select c.relname as tbl, t.tgname, pg_get_triggerdef(t.oid) as def
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and not t.tgisinternal
), extraction as (
  -- « analyse » est un MOT RÉSERVÉ de PostgreSQL (alias britannique
  -- d'ANALYZE) : le premier jet s'appelait ainsi et la base l'a refusé.
  select tbl, tgname,
         (regexp_match(def, '(https?://[^''"[:space:]]+)'))[1]                              as url,
         (regexp_match(def, 'authorization[^A-Za-z0-9]+(Bearer [A-Za-z0-9._-]+)', 'i'))[1]  as autorisation,
         (regexp_match(def, 'apikey[^A-Za-z0-9]+([A-Za-z0-9._-]+)', 'i'))[1]                as apikey
    from declencheurs
   where def ilike '%http_request%'
), lecture as (
  select tbl, tgname, url, autorisation, apikey,
         case when autorisation like 'Bearer eyJ%'
              then split_part(substr(autorisation, 8), '.', 2) end as charge_b64
    from extraction
)
select tbl as "table",
       tgname as declencheur,
       regexp_replace(coalesce(url, '?'), '^(https?://[^/]+/functions/v1/[^?]+).*$', '\1') as fonction_appelee,
       case
         when autorisation is null                      then 'AUCUN en-tête Authorization (la fonction refuserait l''appel)'
         when autorisation like 'Bearer sb_publishable_%' then 'clé PUBLIQUE (sb_publishable) — correct, rien à changer'
         when autorisation like 'Bearer sb_secret_%'      then 'CLÉ SECRÈTE (sb_secret) — À REMPLACER par la clé publique'
         when charge_b64 is not null then
           'jeton JWT, rôle = ' || coalesce(
             convert_from(decode(rpad(translate(charge_b64, '-_', '+/'),
                                      ((length(charge_b64) + 3) / 4) * 4, '='),
                                 'base64'), 'UTF8')::json ->> 'role',
             'illisible')
           || ' (anon = correct ; service_role = À REMPLACER)'
         else 'autre forme — à regarder dans le tableau de bord'
       end as autorisation_classee,
       case
         when apikey is null                   then 'aucune'
         when apikey like 'sb_publishable_%'   then 'publique'
         when apikey like 'sb_secret_%'        then 'SECRÈTE — à remplacer'
         when apikey like 'eyJ%'               then 'jeton JWT'
         else 'autre'
       end as apikey_classee
  from lecture
 order by 1, 2;
