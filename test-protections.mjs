/* =====================================================================
   LE COMPARATEUR DES PROTECTIONS DE « main » (20 octobre 2026)
   ---------------------------------------------------------------------
   Hors navigateur et hors réseau : on lui donne la règle du miroir et une
   règle « en ligne » fabriquée, et il doit nommer chaque écart — ni plus,
   ni moins. Un comparateur qui ne verrait rien passerait au vert sur la
   règle affaiblie ; celui qui crierait sur la règle identique ferait
   ignorer l'Issue. Les deux côtés sont éprouvés.
   ===================================================================== */
import { readFileSync } from 'node:fs';
import { comparer } from './.github/scripts/verifier-protections.mjs';

const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const cible = JSON.parse(readFileSync('.github/ruleset-main.json', 'utf8'));
const copie = () => JSON.parse(JSON.stringify(cible));
const regle = (r, type) => r.rules.find((x) => x.type === type);

/* Ce que le miroir exige, et qu'il ne faut pas perdre en le retouchant. */
const pr = regle(cible, 'pull_request'), sc = regle(cible, 'required_status_checks');
check('le miroir interdit la suppression et le force-push', !!regle(cible, 'deletion') && !!regle(cible, 'non_fast_forward'));
check('le miroir exige une pull request', !!pr);
check('le miroir exige que les conversations soient résolues', pr && pr.parameters.required_review_thread_resolution === true);
check('le miroir exige une branche à jour avant la fusion', sc && sc.parameters.strict_required_status_checks_policy === true);
const exiges = (sc && sc.parameters.required_status_checks || []).map((c) => c.context).sort().join(',');
check('le miroir exige les cinq contrôles', exiges === 'admin,build-mobile-desktop,gitleaks,guardrails,secrets-publics', exiges);
check('personne ne contourne la règle', Array.isArray(cible.bypass_actors) && cible.bypass_actors.length === 0);

/* 1. Identique : aucun écart. */
let e = comparer(cible, copie(), { allow_update_branch: true });
check('règle identique et réglage posé : aucun écart', e.length === 0, e.join(' | '));

/* 2. Les écarts réellement constatés le 20/10/2026 en ligne. */
const enLigne = copie();
regle(enLigne, 'pull_request').parameters.required_review_thread_resolution = false;
regle(enLigne, 'required_status_checks').parameters.strict_required_status_checks_policy = false;
e = comparer(cible, enLigne, { allow_update_branch: false });
check('trois écarts nommés, pas un de plus', e.length === 3, e.join(' | '));
check('… avec le libellé de la case à cocher (conversations)', e.some((x) => x.includes('Require conversation resolution before merging')));
check('… avec le libellé de la case à cocher (branche à jour)', e.some((x) => x.includes('Require branches to be up to date before merging')));
check('… et le réglage du dépôt à cocher', e.some((x) => x.includes('Always suggest updating pull request branches')));

/* 3. Une règle affaiblie autrement : un contrôle retiré, le force-push permis. */
const affaiblie = copie();
regle(affaiblie, 'required_status_checks').parameters.required_status_checks =
  regle(affaiblie, 'required_status_checks').parameters.required_status_checks.filter((c) => c.context !== 'admin');
affaiblie.rules = affaiblie.rules.filter((r) => r.type !== 'non_fast_forward');
e = comparer(cible, affaiblie, {});
check('un contrôle exigé retiré se voit', e.some((x) => x.includes('required_status_checks')), e.join(' | '));
check('le force-push permis se voit', e.some((x) => x.includes('non_fast_forward')), e.join(' | '));

/* 4. Désactivée, absente, contournable. */
const off = copie(); off.enforcement = 'disabled';
check('une règle désactivée se voit', comparer(cible, off, {}).some((x) => x.includes('disabled')));
check('une règle absente se voit', comparer(cible, null, {}).some((x) => x.includes("n'existe pas")));
const contournee = copie(); contournee.bypass_actors = [{ actor_type: 'RepositoryRole', actor_id: 5, bypass_mode: 'always' }];
check('un contournement se voit', comparer(cible, contournee, {}).some((x) => x.includes('contourner')));

/* 5. L'ordre des contrôles en ligne ne compte pas. */
const desordre = copie();
regle(desordre, 'required_status_checks').parameters.required_status_checks.reverse();
check("l'ordre des contrôles ne fait pas un écart", comparer(cible, desordre, {}).length === 0);

console.log(`\n=== Protections de main : ${ok.length} contrôles OK, ${ko.length} en échec ===`);
ok.forEach((x) => console.log('  ✔ ' + x));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach((x) => console.log('  ✘ ' + x)); process.exit(1); }
