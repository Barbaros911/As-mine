#!/bin/sh
# =====================================================================
# DEUX DÉCLENCHEURS FIGÉS, UNE PORTE ANONYME FERMÉE (28 octobre 2026),
# ÉPROUVÉS SUR UN VRAI POSTGRESQL
# Lancé par la CI (admin-v2-regression.yml) et à la main :
#   PGHOST=127.0.0.1 PGUSER=postgres sh supabase/tests/durcissement-fonctions.sh
# Le décor repose les VRAIS déclencheurs de « courses » (les migrations du
# N° court) et « suivi » telle que la production la porte ; il exige que les
# deux défauts se reproduisent. La migration est appliquée comme en
# production (un seul envoi : -1), deux fois. Un refus ATTENDU est exigé.
# Éprouvée contre cinq migrations faussées (sans le réglage, search_path
# « public », suivi laissée à anon, suivi supprimée, corps réécrit) : elle
# tombe les cinq fois.
# =====================================================================
set -eu
cd "$(dirname "$0")/../.."
M=supabase/migrations
T=supabase/tests
PSQL="psql -X -q -v ON_ERROR_STOP=1"

base(){
  $PSQL -d postgres -c "drop database if exists $1;" -c "create database $1;"
  $PSQL -d "$1" -f $T/socle.sql -f $M/20261002000000_courses_version.sql \
    -f $T/numero-court.sql -f $M/20261006000000_numero_court.sql \
    -f $T/numero-court-apres.sql -f $T/durcissement-fonctions-avant.sql
}

echo "── la règle, rejouée, puis le retour arrière"
base durcissement
$PSQL -d durcissement -1 -f $M/20261028000000_durcissement_fonctions.sql
$PSQL -d durcissement -1 -f $M/20261028000000_durcissement_fonctions.sql
$PSQL -d durcissement -f $T/durcissement-fonctions-apres.sql
$PSQL -d durcissement -1 -f $M/20261028000900_durcissement_fonctions_retour.sql
$PSQL -d durcissement -1 -f $M/20261028000900_durcissement_fonctions_retour.sql
$PSQL -d durcissement -f $T/durcissement-fonctions-retour.sql
# Après un retour arrière, la règle se repose.
$PSQL -d durcissement -1 -f $M/20261028000000_durcissement_fonctions.sql

echo "── la garde : un déclencheur inconnu n'est jamais touché"
base durcissementgarde
$PSQL -d durcissementgarde -c "create or replace function public.ela_courses_version() returns trigger language plpgsql as \$\$ begin new.version := coalesce(old.version, 0) + 1; new.modifie_le := now(); return new; end \$\$;"
if $PSQL -d durcissementgarde -1 -f $M/20261028000000_durcissement_fonctions.sql 2>/tmp/durcissement-garde.txt; then
  echo "ÉCHEC : la migration a touché un déclencheur qui n'est pas celui du dépôt"; exit 1
fi
grep -q "rien n'a été changé" /tmp/durcissement-garde.txt || { cat /tmp/durcissement-garde.txt; echo "ÉCHEC : refusée pour une autre raison"; exit 1; }
reste=$($PSQL -d durcissementgarde -t -A -c "select count(*) from pg_proc where proname in ('ela_courses_numero','ela_courses_version') and proconfig is not null")
[ "$reste" = "0" ] || { echo "ÉCHEC : un réglage a été posé malgré le refus"; exit 1; }
anon=$($PSQL -d durcissementgarde -t -A -c "select has_function_privilege('anon','public.suivi(text,text)','EXECUTE')")
[ "$anon" = "t" ] || { echo "ÉCHEC : un droit a été retiré malgré le refus"; exit 1; }

echo "DURCISSEMENT : toutes les épreuves tiennent."
