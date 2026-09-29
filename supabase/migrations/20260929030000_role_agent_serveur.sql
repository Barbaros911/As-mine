-- =====================================================================
-- LE RÔLE « AGENT DE RÉSERVATION » EST IMPOSÉ PAR LE SERVEUR
-- ---------------------------------------------------------------------
-- 29/09/2026, Barbaros : « valide le rôle agent ». Le diagnostic
-- (20260929020000) a montré qu'est_exploitant() est vraie pour TOUT
-- opérateur actif, agent compris : l'écran lui cachait les prix, les
-- réglages, le registre et les factures, mais un appel direct passait. Un
-- filtre d'écran n'est pas une frontière.
--
-- CE QUI DEVIENT RÉSERVÉ À L'ADMIN :
--   - modifier les prix, les forfaits partenaires, les réglages commerciaux
--     et les codes promo (la lecture reste ouverte : le calcul du prix en a
--     besoin) ;
--   - lire et écrire les factures de commission, les paiements et les
--     instantanés financiers ;
--   - émettre ou prévisualiser une facture, restaurer une sauvegarde.
-- CE QUE L'AGENT GARDE : tout ce qui sert à traiter une course — lire,
-- créer, confirmer, attribuer un chauffeur, clôturer.
--
-- Les trois fonctions ne sont PAS recopiées : on relit leur définition dans
-- la base et on n'y change que le verrou. Les recopier ferait revenir une
-- version ancienne du corps si elle a évolué depuis — c'est la faute que ce
-- projet se reproche partout.
-- =====================================================================

create or replace function public.est_admin() returns boolean
language sql stable
set search_path = public
as $$
  select exists (
    select 1 from public.operateurs o
    where o.user_id = (select auth.uid()) and o.actif and o.role = 'admin'
  );
$$;
revoke all on function public.est_admin() from public, anon;
grant execute on function public.est_admin() to authenticated;

-- ── les fonctions : même corps, verrou admin ────────────────────────────
do $$
declare
  f text;
  def text;
begin
  foreach f in array array[
    'public.ela_apercu_facture_commission(uuid,date,date)',
    'public.ela_emettre_facture_commission(uuid,date,date)',
    'public.ela_restaurer_courses_exploitant(jsonb)'
  ] loop
    if to_regprocedure(f) is null then continue; end if;
    def := pg_get_functiondef(to_regprocedure(f));
    if position('public.est_exploitant()' in def) = 0 then
      raise exception 'verrou introuvable dans %', f;
    end if;
    execute replace(def, 'public.est_exploitant()', 'public.est_admin()');
  end loop;
end $$;

-- ── les tables : écriture admin, lecture inchangée ──────────────────────
do $$
declare t text;
begin
  foreach t in array array['parametres_commerciaux','partenaires','tarifs_partenaires','codes_promo'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop policy if exists "admin ela insertion" on public.%I', t);
    execute format('drop policy if exists "admin ela modification" on public.%I', t);
    execute format('drop policy if exists "admin ela suppression" on public.%I', t);
    execute format('create policy "admin ela insertion" on public.%I for insert to authenticated with check ((select public.est_admin()))', t);
    execute format('create policy "admin ela modification" on public.%I for update to authenticated using ((select public.est_admin())) with check ((select public.est_admin()))', t);
    execute format('create policy "admin ela suppression" on public.%I for delete to authenticated using ((select public.est_admin()))', t);
  end loop;
end $$;

-- ── l'argent : lecture et écriture admin ────────────────────────────────
do $$
begin
  if to_regclass('public.factures_commission') is not null then
    drop policy if exists factures_lecture_exploitant on public.factures_commission;
    create policy factures_lecture_exploitant on public.factures_commission
      for select to authenticated using ((select public.est_admin()));
  end if;

  if to_regclass('public.paiements') is not null then
    drop policy if exists "admin ela paiements lecture" on public.paiements;
    drop policy if exists "admin ela paiements insertion" on public.paiements;
    drop policy if exists "admin ela paiements modification" on public.paiements;
    create policy "admin ela paiements lecture" on public.paiements for select to authenticated using ((select public.est_admin()));
    create policy "admin ela paiements insertion" on public.paiements for insert to authenticated with check ((select public.est_admin()));
    create policy "admin ela paiements modification" on public.paiements for update to authenticated using ((select public.est_admin())) with check ((select public.est_admin()));
  end if;

  if to_regclass('public.snapshots_financiers') is not null then
    drop policy if exists "admin ela snapshots lecture" on public.snapshots_financiers;
    drop policy if exists "admin ela snapshots insertion" on public.snapshots_financiers;
    drop policy if exists "admin ela snapshots modification" on public.snapshots_financiers;
    drop policy if exists "admin ela snapshots suppression" on public.snapshots_financiers;
    create policy "admin ela snapshots lecture" on public.snapshots_financiers for select to authenticated using ((select public.est_admin()));
    create policy "admin ela snapshots insertion" on public.snapshots_financiers for insert to authenticated with check ((select public.est_admin()));
    create policy "admin ela snapshots modification" on public.snapshots_financiers for update to authenticated using ((select public.est_admin())) with check ((select public.est_admin()));
    -- un instantané verrouillé ne se supprime jamais (20260916070000)
    execute 'create policy "admin ela snapshots suppression" on public.snapshots_financiers for delete to authenticated using ((select public.est_admin())'
      || case when exists (select 1 from information_schema.columns
                           where table_schema = 'public' and table_name = 'snapshots_financiers'
                             and column_name = 'verrouille')
              then ' and verrouille = false' else '' end || ')';
  end if;
end $$;
