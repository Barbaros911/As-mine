-- =====================================================================
-- COURSES : UN NUMÉRO COURT, « N° 1042 », ATTRIBUÉ PAR LE SERVEUR
-- ---------------------------------------------------------------------
-- 5 octobre 2026, Barbaros : « pour les numéros de bons, il faut que tu me
-- fasses quelque chose d'assez simple ». La référence ELA-26-10-K7QPM est
-- tirée au sort (voir « LA RÉFÉRENCE EST TIRÉE AU SORT » dans CLAUDE.md) :
-- impossible à dicter au téléphone, à 5 h, à un comptoir d'hôtel.
--
-- CE QUE POSE CETTE MIGRATION : une colonne « numero », 1001, 1002, 1003…
--   · attribuée par le SERVEUR, à l'écriture de la ligne — aucun appareil
--     ne numérote : c'est exactement ce qui faisait refuser les demandes
--     quand chaque téléphone tenait son propre compteur ;
--   · IMMUABLE : le déclencheur de version la remet à sa valeur à chaque
--     modification, et un dépôt ne peut pas en choisir une ;
--   · unique ;
--   · les courses existantes reçoivent leur numéro dans l'ordre de leur
--     création, à partir de 1001 ;
--   · il est RECOPIÉ DANS LE BON (« bon.numero »), à l'écriture comme à
--     chaque modification. C'est ce qui le rend lisible PARTOUT sans rien
--     changer aux lectures : l'admin, la réception, l'alerte Telegram,
--     l'état d'une course lisent déjà le bon. Nommer la colonne dans une
--     lecture l'aurait fait refuser tant que cette migration n'est pas
--     appliquée ; « select=* » aurait effacé le garde-fou de l'admin sur
--     la colonne « version » (une colonne absente doit être une panne
--     AFFICHÉE, pas une lecture à l'ancienne). La COLONNE fait foi ; le
--     bon en porte la copie, que le serveur réécrit toujours.
--
-- LA RÉFÉRENCE RESTE LA CLÉ. Le numéro sert à se parler ; il ne sert
-- JAMAIS à retrouver une course seul (lien ?ok=, etat-course, réception :
-- la clé reste la référence, avec le téléphone ou la session). Un numéro
-- qui se suit se devine — il suffit de compter.
--
-- DES TROUS SONT POSSIBLES, ET C'EST SANS DANGER : une écriture refusée
-- (référence déjà prise) consomme un numéro. Ce n'est pas un numéro de
-- facture — les factures ont leur propre rang, sans trou.
--
-- LA NUMÉROTATION DES COURSES EXISTANTES SE FAIT DÉCLENCHEURS COUPÉS.
-- La table en porte quatre en production (inventaire du 2 octobre 2026) :
-- courses_version, journal_courses_operateurs, nouvelle-demande (le
-- webhook), proteger_courses_agent. Les deux du milieu ont été créés dans
-- l'éditeur SQL et leur code n'est pas dans le dépôt : on ne fait pas
-- passer une mise à jour en masse par du code qu'on n'a pas lu. Ils sont
-- coupés le temps d'UNE instruction, dans la même transaction — l'API de
-- gestion exécute ce fichier d'un seul bloc : une erreur annule tout, la
-- coupure comprise. La version est montée à la main, pour que chaque
-- appareil de l'admin relise ses courses et y trouve leur numéro.
--
-- Rejouable : la colonne et la séquence « if not exists », la numérotation
-- ne touche que les lignes sans numéro, la séquence est recalée sur le
-- plus grand numéro posé. Aucune donnée n'est modifiée en dehors de
-- « numero », de sa copie « bon.numero », de « version » et de « modifie_le ».
--
-- À APPLIQUER QUAND AUCUN GESTE N'ATTEND DE PARTIR dans l'admin (pas de
-- témoin « modification(s) en cours d'envoi ») : la version de chaque
-- course monte, et un geste resté en file sur l'ancienne version serait
-- refusé — l'écran le dirait (« le serveur gagne »), il faudrait le refaire.
-- =====================================================================

create sequence if not exists public.courses_numero_seq as bigint
  start with 1001 minvalue 1001;

alter table public.courses add column if not exists numero bigint;

-- Les courses déjà là, dans l'ordre de leur création. Déclencheurs coupés,
-- version montée à la main (voir l'en-tête).
alter table public.courses disable trigger user;

update public.courses c
   set numero = o.n,
       bon = case when jsonb_typeof(c.bon) = 'object'
                  then jsonb_set(c.bon, '{numero}', to_jsonb(o.n)) else c.bon end,
       version = coalesce(c.version, 0) + 1,
       modifie_le = now()
  from (
    select ref,
           row_number() over (order by cree_le nulls first, ref)
             + greatest(1000, (select coalesce(max(numero), 1000) from public.courses)) as n
      from public.courses
     where numero is null
  ) o
 where c.ref = o.ref;

alter table public.courses enable trigger user;

-- La séquence repart APRÈS le plus grand numéro posé : rejouée, ou après
-- une ligne écrite à la main, elle ne redonne jamais un numéro pris.
select setval('public.courses_numero_seq',
              greatest(1001, (select coalesce(max(numero), 0) from public.courses) + 1),
              false);

-- Le numéro d'une course neuve vient de la séquence, TOUJOURS, et par le
-- seul déclencheur : un dépôt qui en proposerait un est ignoré. PAS DE
-- « default » en plus — éprouvé : le défaut ET le déclencheur tiraient
-- chacun un numéro, et la numérotation sautait d'un sur deux. Une écriture
-- qui passerait sans déclencheur tombe sur « not null » : une erreur
-- franche plutôt qu'un numéro inventé.
alter table public.courses alter column numero drop default;
alter sequence public.courses_numero_seq owned by public.courses.numero;

create or replace function public.ela_courses_numero()
returns trigger language plpgsql as $$
begin
  new.numero := nextval('public.courses_numero_seq');
  if jsonb_typeof(new.bon) = 'object' then
    new.bon := jsonb_set(new.bon, '{numero}', to_jsonb(new.numero));
  end if;
  return new;
end $$;

drop trigger if exists courses_numero on public.courses;
create trigger courses_numero
  before insert on public.courses
  for each row execute function public.ela_courses_numero();

-- Immuable : la même fonction qui monte la version remet le numéro à sa
-- valeur, dans la colonne ET dans le bon — l'admin renvoie le bon entier à
-- chaque geste, et un bon venu d'un appareil n'a pas à décider du numéro.
-- Corps identique à 20261002000000_courses_version.sql, plus ces lignes.
create or replace function public.ela_courses_version()
returns trigger language plpgsql as $$
begin
  new.version := coalesce(old.version, 0) + 1;
  new.modifie_le := now();
  new.numero := old.numero;
  if old.numero is not null and jsonb_typeof(new.bon) = 'object' then
    new.bon := jsonb_set(new.bon, '{numero}', to_jsonb(old.numero));
  end if;
  return new;
end $$;

alter table public.courses alter column numero set not null;
create unique index if not exists courses_numero_idx on public.courses (numero);

-- Ce que la table est devenue, lisible dans le journal du workflow :
-- des comptes et des numéros, jamais une donnée de client.
select count(*) as courses,
       min(numero) as premier_numero,
       max(numero) as dernier_numero,
       count(*) filter (where numero is null) as sans_numero,
       (select last_value from public.courses_numero_seq) as sequence
  from public.courses;
