-- ============================================================================
-- LES VUES PUBLIQUES SE LISENT, ELLES NE S'ÉCRIVENT PAS — 5 octobre 2026.
--
-- CE QUI A ÉTÉ TROUVÉ (audit du cloisonnement, 4 octobre 2026). L'inventaire
-- de production (20261003010000_inventaire_schema.sql, exécution n° 18) montre
-- qu'« anon » et « authenticated » ont INSERT, UPDATE, DELETE, TRUNCATE,
-- REFERENCES et TRIGGER sur « tarif_public » et « forfaits_partenaires_publics ».
-- Personne ne les a accordés : ce sont les PRIVILÈGES PAR DÉFAUT de Supabase,
-- posés sur tout objet créé dans « public ». Seul SELECT avait été voulu.
--
-- POURQUOI C'EST UN TROU SUR UNE VUE ET PAS SUR UNE TABLE. Une table est
-- gardée par ses policies. Une vue ordinaire (pas « security_invoker ») lit et
-- ÉCRIT avec les droits de son PROPRIÉTAIRE, qui n'est pas soumis aux policies
-- de ses propres tables. Et PostgreSQL rend modifiable toute vue qui ne lit
-- qu'une seule table. « tarif_public » est dans ce cas : ses colonnes sont
-- calculées, donc UPDATE est refusé, mais DELETE PASSE. Reproduit sur un vrai
-- PostgreSQL : avec la seule clé publique du site, un visiteur anonyme
-- effaçait « tarif_general_berline » de « parametres_commerciaux ». Le site
-- retombait alors en silence sur les prix écrits dans la page, et le contrôle
-- serveur du prix au kilomètre (« deposer-course ») sautait.
-- « forfaits_partenaires_publics » lit deux tables jointes : PostgreSQL la
-- refuse en écriture. On lui retire quand même ses droits — une vue réécrite
-- un jour sur une seule table rouvrirait le trou sans que rien ne le dise.
--
-- POURQUOI TOUTES LES VUES, ET PAS DEUX NOMS. La cause est le réglage par
-- défaut, pas ces deux vues : la suivante, créée par une migration ou dans le
-- tableau de bord, recevra les mêmes droits. On les retire donc à TOUTE vue du
-- schéma « public ». Aucune n'a vocation à être écrite par un visiteur ou par
-- un compte connecté : l'admin écrit dans les TABLES (« parametres_commerciaux »,
-- « tarifs_partenaires »), jamais dans une vue. SELECT n'est pas touché : le site
-- continue de lire ses tarifs exactement comme avant.
--
-- CE QU'ON NE FAIT PAS : changer les privilèges par défaut de Supabase. Ils
-- valent aussi pour les tables, dont le site dépend, et c'est un réglage qu'on
-- ne peut pas éprouver d'ici (« NE JAMAIS CHANGER UN RÉGLAGE PAR DÉFAUT QU'ON NE
-- PEUT PAS ÉPROUVER »). Le diagnostic 20261005000100 relit l'état des vues :
-- c'est lui qui verra une vue future.
--
-- REJOUABLE SANS DANGER : un REVOKE déjà fait ne fait rien. Aucune donnée n'est
-- lue ni modifiée. La migration S'ARRÊTE si un droit d'écriture survit, plutôt
-- que de se dire appliquée.
-- ============================================================================
do $$
declare
  v record;
begin
  for v in
    select c.oid::regclass as nom
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
  loop
    -- Ce REVOKE retire AUSSI un droit posé colonne par colonne (« grant
    -- update (prix) on … ») : PostgreSQL le fait de lui-même, mesuré. La
    -- vue sonde de l'épreuve porte un tel droit pour le vérifier à chaque
    -- exécution.
    execute format(
      'revoke insert, update, delete, truncate, references, trigger on %s from anon, authenticated, public',
      v.nom);
  end loop;
end $$;

-- LA PREUVE, DANS LA MIGRATION ELLE-MÊME : aucune vue de « public » ne reste
-- modifiable par anon ou authenticated. Sinon on s'arrête — une migration qui
-- se dit appliquée sans l'être est pire qu'une migration refusée.
do $$
declare
  restes text;
begin
  select string_agg(format('%s (%s : %s)', c.oid::regclass, r.role, p.droit), ', ')
    into restes
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('anon'), ('authenticated')) as r(role)
  cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
                     ('REFERENCES'), ('TRIGGER')) as p(droit)
  where n.nspname = 'public' and c.relkind = 'v'
    and (has_table_privilege(r.role, c.oid, p.droit)
         -- un droit posé sur UNE colonne compte aussi : il suffit à écrire.
         or (p.droit in ('INSERT', 'UPDATE', 'REFERENCES')
             and has_any_column_privilege(r.role, c.oid, p.droit)));
  if restes is not null then
    raise exception 'vue encore modifiable : %', restes;
  end if;
end $$;

-- Ce que rend le workflow : le nom de chaque vue et ce que les deux rôles
-- publics peuvent encore y faire. Attendu : « lecture » partout où le site lit,
-- et jamais un droit d'écriture.
select c.relname as vue,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_lit,
       has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_lit
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v'
order by 1;
