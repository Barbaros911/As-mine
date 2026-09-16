-- Stripe TEST uniquement (#173). Aucun rail de reversement chauffeur ici.
create table if not exists public.snapshots_financiers (
  course_ref text primary key,
  prix_initial_centimes integer not null check (prix_initial_centimes >= 0),
  remise_centimes integer not null default 0 check (remise_centimes >= 0),
  prix_final_centimes integer not null check (prix_final_centimes >= 0),
  code_promo text,
  montant_chauffeur_centimes integer not null check (montant_chauffeur_centimes >= 0),
  marge_ela_centimes integer not null check (marge_ela_centimes >= 0),
  origine text not null default 'admin' check (origine in ('admin','moteur_tarifaire')),
  verifie boolean not null default false,
  verrouille boolean not null default false,
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid(),
  check (prix_final_centimes = prix_initial_centimes - remise_centimes),
  check (prix_final_centimes = montant_chauffeur_centimes + marge_ela_centimes)
);

create table if not exists public.paiements (
  course_ref text primary key,
  stripe_payment_intent_id text unique,
  mode text not null default 'test' check (mode in ('test','live')),
  statut text not null default 'a_autoriser' check (statut in ('a_autoriser','requires_payment_method','requires_action','processing','autorise','encaisse','annule','echec','a_reautoriser','rembourse')),
  montant_autorise_centimes integer not null default 0 check (montant_autorise_centimes >= 0),
  montant_capture_centimes integer not null default 0 check (montant_capture_centimes >= 0),
  autorise_le timestamptz,
  capture_avant timestamptz,
  capture_le timestamptz,
  annule_le timestamptz,
  dernier_evenement_stripe text,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);

alter table public.snapshots_financiers enable row level security;
alter table public.paiements enable row level security;
revoke all on public.snapshots_financiers, public.paiements from anon;
grant select, insert, update, delete on public.snapshots_financiers to authenticated;
grant select, insert, update on public.paiements to authenticated;

create policy "admin ela snapshots lecture" on public.snapshots_financiers for select to authenticated using ((select public.est_exploitant()));
create policy "admin ela snapshots insertion" on public.snapshots_financiers for insert to authenticated with check ((select public.est_exploitant()));
create policy "admin ela snapshots modification" on public.snapshots_financiers for update to authenticated using ((select public.est_exploitant())) with check ((select public.est_exploitant()));
create policy "admin ela snapshots suppression" on public.snapshots_financiers for delete to authenticated using ((select public.est_exploitant()) and verrouille=false);

create policy "admin ela paiements lecture" on public.paiements for select to authenticated using ((select public.est_exploitant()));
create policy "admin ela paiements insertion" on public.paiements for insert to authenticated with check ((select public.est_exploitant()));
create policy "admin ela paiements modification" on public.paiements for update to authenticated using ((select public.est_exploitant())) with check ((select public.est_exploitant()));

comment on table public.snapshots_financiers is 'Montants serveur utilisés par Stripe ; jamais le prix non vérifié du navigateur.';
comment on table public.paiements is 'État technique Stripe. Autorisé n est pas encaissé ; montant chauffeur n est pas paiement chauffeur.';
