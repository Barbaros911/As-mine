-- ELA Transfer : autoriser l'exploitant à SUPPRIMER une course.
--
-- Pourquoi ça manquait : les policies posées jusqu'ici couvrent la lecture,
-- la mise à jour et le dépôt. Aucune ne couvre la suppression, et sans
-- policy PostgreSQL refuse — y compris à l'exploitant. Le bouton
-- « Supprimer cette course » reçoit alors un refus et n'efface rien, ce
-- qu'il annonce plutôt que de faire croire au ménage.
--
-- Ce que ça n'ouvre PAS : la clé publique du site est celle du visiteur
-- anonyme. Cette policy ne vise que « authenticated », et « est_exploitant »
-- exige en plus que le compte figure dans la table operateurs. Un visiteur
-- ne peut donc jamais effacer la course de quelqu'un d'autre.

grant delete on table public.courses to authenticated;

drop policy if exists "suppression exploitant" on public.courses;
create policy "suppression exploitant" on public.courses
for delete to authenticated
using ((select public.est_exploitant()));
