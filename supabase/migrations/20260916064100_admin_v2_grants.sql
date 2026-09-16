grant select, insert, update, delete on public.parametres_commerciaux to authenticated;
grant select, insert, update, delete on public.partenaires to authenticated;
grant select, insert, update, delete on public.tarifs_partenaires to authenticated;
grant select, insert, update, delete on public.chauffeurs to authenticated;
grant select, insert, update, delete on public.codes_promo to authenticated;
grant select, insert on public.evenements_reservation to authenticated;
grant select, insert, update, delete on public.actions_requises to authenticated;

grant usage, select on sequence public.evenements_reservation_id_seq to authenticated;
grant usage, select on sequence public.actions_requises_id_seq to authenticated;
