-- LECTURE SEULE, ET AUCUNE DONNÉE CLIENT. Les journaux d'un dépôt public
-- se lisent : on ne sort donc ni nom, ni téléphone, ni adresse, ni même une
-- référence entière. Seulement des comptes, qui suffisent à trancher.
--
-- CE QU'ON CHERCHE : « Le serveur a refusé la suppression » peut vouloir
-- dire deux choses opposées et impossibles à distinguer depuis le
-- navigateur — la règle de sécurité a écarté la ligne, OU la ligne n'a
-- jamais existé sur le serveur. Si le tableau de bord montre plus de
-- courses que la base n'en contient, c'est la seconde.
select 'total sur le serveur : ' || count(*)::text as info
from public.courses
union all
select 'statut « ' || coalesce(statut,'?') || ' » : ' || count(*)::text
from public.courses
group by statut
order by 1;
