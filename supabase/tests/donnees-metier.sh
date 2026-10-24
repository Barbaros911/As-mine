#!/bin/sh
# =====================================================================
# LES DONNÉES MÉTIER DE L'ADMIN SUR LE SERVEUR, ÉPROUVÉES SUR UN VRAI
# POSTGRESQL. Lancé par la CI (admin-v2-regression.yml) et à la main :
#   PGHOST=127.0.0.1 PGUSER=postgres PGPASSWORD=postgres sh supabase/tests/donnees-metier.sh
# Le décor est celui de la double vérification (les portes avec le niveau
# de session) ; la migration est appliquée deux fois (elle doit se rejouer).
# =====================================================================
set -eu
cd "$(dirname "$0")/../.."
M=supabase/migrations
T=supabase/tests
PSQL="psql -X -q -v ON_ERROR_STOP=1"
DB=donneesmetier
$PSQL -d postgres -c "drop database if exists $DB;" -c "create database $DB;"
$PSQL -d $DB -f $T/double-verification-avant.sql
$PSQL -d $DB -1 -f $M/20261024000000_double_verification_admin.sql
$PSQL -d $DB -1 -f $M/20261002000000_courses_version.sql
$PSQL -d $DB -f $T/donnees-metier-avant.sql
$PSQL -d $DB -1 -f $M/20261024010000_donnees_metier_serveur.sql
$PSQL -d $DB -1 -f $M/20261024010000_donnees_metier_serveur.sql
$PSQL -d $DB -f $T/donnees-metier-apres.sql
# La seconde session de dblink se connecte comme celle-ci.
DBL="dbname=$DB user=${PGUSER:-postgres}"
[ -n "${PGHOST:-}" ] && DBL="$DBL host=$PGHOST"
[ -n "${PGPORT:-}" ] && DBL="$DBL port=$PGPORT"
[ -n "${PGPASSWORD:-}" ] && DBL="$DBL password=$PGPASSWORD"
PGOPTIONS="-c essai.dbl=$(printf %s "$DBL" | sed 's/ /\\ /g')" $PSQL -d $DB -f $T/donnees-metier-concurrence.sql
$PSQL -d $DB -f $T/donnees-metier-import.sql
$PSQL -d $DB -f $T/donnees-metier-relecture.sql
echo "DONNÉES MÉTIER : toutes les épreuves tiennent."

echo "── base sans les tables d'Admin v2 (leur présence en production n'est pas prouvée)"
DB2=donneesmetiervide
$PSQL -d postgres -c "drop database if exists $DB2;" -c "create database $DB2;"
$PSQL -d $DB2 -f $T/double-verification-avant.sql
$PSQL -d $DB2 -1 -f $M/20261024000000_double_verification_admin.sql
$PSQL -d $DB2 -c "create table public.parametres_commerciaux(cle text primary key, valeur jsonb not null, actif boolean not null default true, date_effet timestamptz not null default now(), modifie_le timestamptz not null default now());"
$PSQL -d $DB2 -1 -f $M/20261024010000_donnees_metier_serveur.sql
$PSQL -d $DB2 -1 -f $M/20261024010000_donnees_metier_serveur.sql
$PSQL -d $DB2 -c "select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000001', 'aal2'); set role authenticated;
  do \$\$ begin
    perform public.ela_chauffeur_ecrire('{\"id\":\"CH-a\",\"nom\":\"A\"}');
    if jsonb_array_length(public.ela_chauffeurs_lister()) is distinct from 1 then raise exception 'base vide : carnet'; end if;
    if jsonb_array_length(public.ela_factures_lister()) is distinct from 0 then raise exception 'base vide : factures'; end if;
    raise notice 'ok — base sans Admin v2 : tables créées, carnet écrit et relu';
  end \$\$;"
echo "DONNÉES MÉTIER (base vide) : tient."
