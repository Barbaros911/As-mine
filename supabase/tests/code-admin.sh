#!/bin/sh
# =====================================================================
# LE CODE ADMIN À 6 CHIFFRES, ÉPROUVÉ SUR UN VRAI POSTGRESQL
# Lancé par la CI (admin-v2-regression.yml) et à la main :
#   PGHOST=127.0.0.1 PGUSER=postgres sh supabase/tests/code-admin.sh
# Chaque scénario a sa base neuve. Une migration est appliquée comme le
# fait la production (un seul envoi, donc une seule transaction : -1).
# Un refus ATTENDU est exigé : s'il passe, l'épreuve tombe.
# =====================================================================
set -eu
cd "$(dirname "$0")/../.."
M=supabase/migrations
T=supabase/tests
PSQL="psql -X -q -v ON_ERROR_STOP=1"

base(){ $PSQL -d postgres -c "drop database if exists $1;" -c "create database $1;"; }

echo "── la règle, le cliquet, le retour arrière"
base codeadmin
# Le diagnostic s'exécute aussi AVANT la migration (il sert à mesurer).
$PSQL -d codeadmin -f $T/code-admin-avant.sql
$PSQL -d codeadmin -t -A -f $M/20261024020050_diagnostic_acces_admin.sql > /dev/null
$PSQL -d codeadmin -1 -f $M/20261024020000_code_admin.sql
# Rejouée : elle doit l'accepter sans rien casser.
$PSQL -d codeadmin -1 -f $M/20261024020000_code_admin.sql
$PSQL -d codeadmin -f $T/code-admin-codes.sql
$PSQL -d codeadmin -f $T/code-admin-apres.sql
# Le diagnostic s'exécute et ne sort aucune adresse ni aucun identifiant.
$PSQL -d codeadmin -t -A -f $M/20261024020050_diagnostic_acces_admin.sql > /tmp/diag-acces.txt
cat /tmp/diag-acces.txt
grep -q '"actifs_sans_code": 2' /tmp/diag-acces.txt || { echo "ÉCHEC : le diagnostic ne compte pas les deux admins sans code"; exit 1; }
grep -q '"est_exploitant_niveau_de_session": true' /tmp/diag-acces.txt || { echo "ÉCHEC : le diagnostic ne voit pas la nouvelle porte"; exit 1; }
if grep -Eq '@|aaaaaaaa-' /tmp/diag-acces.txt; then echo "ÉCHEC : le diagnostic sort un e-mail ou un identifiant"; exit 1; fi
# Le cliquet DOIT être refusé : deux admins actifs n'ont pas de code.
if $PSQL -d codeadmin -1 -f $M/20261024020100_code_admin_obligatoire.sql 2>/tmp/cliquet.txt; then
  echo "ÉCHEC : le cliquet s'est levé alors que des opérateurs actifs n'ont pas de code"; exit 1
fi
grep -q "sans code" /tmp/cliquet.txt || { cat /tmp/cliquet.txt; echo "ÉCHEC : refusé pour une autre raison"; exit 1; }
$PSQL -d codeadmin -f $T/code-admin-cliquet.sql
$PSQL -d codeadmin -1 -f $M/20261024020100_code_admin_obligatoire.sql
$PSQL -d codeadmin -f $T/code-admin-obligatoire.sql
$PSQL -d codeadmin -c "update public.securite_admin set double_verification_exigee = false;"
$PSQL -d codeadmin -1 -f $M/20261024020900_code_admin_retour.sql
$PSQL -d codeadmin -f $T/code-admin-retour.sql
$PSQL -d codeadmin -1 -f $M/20261024020000_code_admin.sql
$PSQL -d codeadmin -f $T/code-admin-reprise.sql

echo "── la garde : une porte inconnue n'est jamais écrasée"
base codegarde
$PSQL -d codegarde -f $T/code-admin-avant.sql
$PSQL -d codegarde -f $T/code-admin-garde.sql
if $PSQL -d codegarde -1 -f $M/20261024020000_code_admin.sql 2>/tmp/garde.txt; then
  echo "ÉCHEC : la migration a écrasé une est_exploitant() inconnue"; exit 1
fi
grep -q "rien n'a été changé" /tmp/garde.txt || { cat /tmp/garde.txt; echo "ÉCHEC : refusée pour une autre raison"; exit 1; }
$PSQL -d codegarde -f $T/code-admin-garde-apres.sql

echo "CODE ADMIN : toutes les épreuves tiennent."
