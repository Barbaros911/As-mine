-- LA GARDE : une porte qui ne ressemble pas au dépôt n'est jamais écrasée.
-- Ce décor pose une est_exploitant() inconnue ; la migration doit s'arrêter.
create or replace function public.est_exploitant() returns boolean
language sql stable as $$ select true $$;
