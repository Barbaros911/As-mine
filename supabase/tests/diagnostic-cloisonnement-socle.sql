-- Ce que lit 20261005000100_diagnostic_cloisonnement.sql et qui n'existe que
-- chez Supabase : la table des comptes (auth.users) et celle des opérateurs.
-- Un SQL de diagnostic s'éprouve AVANT d'être lancé en production : « analyse »,
-- mot réservé, a déjà fait refuser un diagnostic par la base (2 octobre 2026).
-- Ici on vérifie qu'il s'exécute, et qu'il ne sort AUCUNE adresse e-mail —
-- le journal du workflow est public.
create table if not exists auth.users(
  id uuid primary key, email text,
  created_at timestamptz not null default now(), last_sign_in_at timestamptz);
create table if not exists public.operateurs(
  user_id uuid primary key, role text not null default 'admin',
  actif boolean not null default true);
insert into auth.users(id, email, last_sign_in_at) values
  ('00000000-0000-0000-0000-00000000000a', 'exploitant@epreuve.invalid', now()),
  ('00000000-0000-0000-0000-00000000000b', 'inconnu@epreuve.invalid', now())
on conflict do nothing;
insert into public.operateurs(user_id) values ('00000000-0000-0000-0000-00000000000a')
on conflict do nothing;
