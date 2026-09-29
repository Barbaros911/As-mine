-- =====================================================================
-- DIAGNOSTIC — OÙ PASSE LA MINUTE ENTRE LE CLIC ET L'ALERTE TELEGRAM ?
-- ---------------------------------------------------------------------
-- 29/09/2026, Barbaros : « je reçois les demandes sur admin et les
-- notifications Telegram 1 minute après, c'est trop long ».
-- LECTURE SEULE : rien n'est modifié. Ne sort que des références et des
-- secondes — AUCUN nom, téléphone ni adresse (le journal GitHub est public).
--
-- Pour chacune des 10 dernières courses :
--   depot_s  = clic « Confirmer » du client (bon.cree, horloge du téléphone)
--              → ligne écrite sur le serveur (courses.cree_le)
--   alerte_s = ligne écrite → alerte Telegram envoyée (journal)
-- Si depot_s est grand : la demande part tard du téléphone du client.
-- Si alerte_s est grand : c'est le webhook / la fonction côté serveur.
-- depot_s peut être faussé de quelques secondes par l'horloge du téléphone.
-- =====================================================================
select
  c.ref,
  to_char(c.cree_le at time zone 'Europe/Paris', 'DD/MM HH24:MI:SS') as arrivee_serveur,
  case when c.bon->>'cree' ~ '^\d{4}-\d{2}-\d{2}T'
       then round(extract(epoch from c.cree_le - (c.bon->>'cree')::timestamptz))
  end as depot_s,
  round(extract(epoch from (
    select min(j.cree_le) from public.journal_notifications_admin j
    where j.course_ref = c.ref and j.canal = 'telegram'
  ) - c.cree_le)) as alerte_s,
  (select string_agg(j.canal || ':' || j.statut, ' ' order by j.canal)
     from public.journal_notifications_admin j
    where j.course_ref = c.ref and j.type_evenement = 'nouvelle_reservation') as canaux
from public.courses c
order by c.cree_le desc
limit 10;
