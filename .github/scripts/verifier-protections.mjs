// =====================================================================
// LES PROTECTIONS RÉELLES DE « main » SONT-ELLES CELLES DU MIROIR ?
// ---------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE (20 octobre 2026, mission de finalisation).
// « .github/ruleset-main.json » se disait le miroir de la règle « Protéger
// main ». Rien ne le vérifiait : un miroir qui n'est jamais comparé finit
// par décrire une règle qui n'existe plus — c'est la carte périmée de
// CLAUDE.md, en plus grave, puisque c'est elle qui empêche une fusion rouge.
//
// LE MIROIR EST LA CIBLE. Le script lit la règle EN LIGNE (lecture publique,
// le dépôt l'est) et nomme chaque écart, réglage par réglage, avec le geste
// qui le corrige. Il lit aussi le réglage du dépôt « Always suggest updating
// pull request branches », qui n'est pas dans une règle mais dans
// Settings → General.
//
// CE QU'IL NE PEUT PAS FAIRE : modifier la règle. Ni l'accès de l'agent ni
// le jeton des Actions n'ont le droit « administration » (vérifié, pas
// supposé — voir « branche-apres-fusion.yml »). Il dit, Barbaros coche.
//
// Usage : node .github/scripts/verifier-protections.mjs [owner/depot]
// (GITHUB_TOKEN facultatif : sans lui, l'API publique répond aussi.)
// =====================================================================
import { readFileSync } from 'node:fs';

// Ce qui n'est pas dans une règle mais dans les réglages du dépôt.
export const REGLAGES_DEPOT = {
  allow_update_branch: {
    attendu: true,
    geste: 'Settings → General → Pull Requests : cocher « Always suggest updating pull request branches »',
  },
};

// Le libellé de l'interface GitHub, pour qu'un écart se corrige sans chercher.
const LIBELLES = {
  'pull_request.required_review_thread_resolution': '« Require conversation resolution before merging »',
  'required_status_checks.strict_required_status_checks_policy': '« Require branches to be up to date before merging »',
  'pull_request.required_approving_review_count': '« Required approvals »',
  'pull_request.dismiss_stale_reviews_on_push': '« Dismiss stale pull request approvals when new commits are pushed »',
  'pull_request.require_code_owner_review': '« Require review from Code Owners »',
  'pull_request.require_last_push_approval': '« Require approval of the most recent reviewable push »',
  'required_status_checks.do_not_enforce_on_create': '« Do not require status checks on creation »',
};

const trie = (v) => Array.isArray(v)
  ? v.map(trie).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  : (v && typeof v === 'object')
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, trie(v[k])]))
    : v;
const egal = (a, b) => JSON.stringify(trie(a)) === JSON.stringify(trie(b));
const court = (v) => JSON.stringify(v);

// Rend la liste des écarts, en phrases. Vide = la règle en ligne est le miroir.
export function comparer(cible, reelle, depot = {}) {
  const ecarts = [];
  if (!reelle) {
    ecarts.push(`la règle « ${cible.name} » n'existe pas en ligne : l'importer depuis .github/ruleset-main.json (Settings → Rules → Rulesets → New ruleset → Import a ruleset)`);
  } else {
    if (reelle.enforcement !== cible.enforcement)
      ecarts.push(`la règle est « ${reelle.enforcement} » au lieu de « ${cible.enforcement} »`);
    if (!egal(reelle.conditions, cible.conditions))
      ecarts.push(`les branches visées diffèrent : en ligne ${court(reelle.conditions)}, attendu ${court(cible.conditions)}`);
    // La liste des contournements n'est rendue en entier qu'à un
    // administrateur : on ne crie que sur ce qu'on voit.
    if (Array.isArray(reelle.bypass_actors) && reelle.bypass_actors.length && !egal(reelle.bypass_actors, cible.bypass_actors || []))
      ecarts.push(`quelqu'un peut contourner la règle : ${court(reelle.bypass_actors)} (attendu : personne)`);
    const parType = (l) => Object.fromEntries((l || []).map((r) => [r.type, r]));
    const enLigne = parType(reelle.rules), attendu = parType(cible.rules);
    for (const type of Object.keys(attendu)) {
      const r = enLigne[type];
      if (!r) { ecarts.push(`la protection « ${type} » manque en ligne`); continue; }
      const pa = attendu[type].parameters || {}, pr = r.parameters || {};
      for (const k of Object.keys(pa)) {
        if (egal(pa[k], pr[k])) continue;
        const nom = LIBELLES[type + '.' + k] || `« ${type}.${k} »`;
        ecarts.push(`${nom} : en ligne ${court(pr[k])}, attendu ${court(pa[k])}`);
      }
    }
    for (const type of Object.keys(enLigne))
      if (!attendu[type]) ecarts.push(`la protection « ${type} » est en ligne mais pas dans le miroir : l'y ajouter, ou la retirer`);
  }
  for (const [cle, { attendu, geste }] of Object.entries(REGLAGES_DEPOT)) {
    if (!(cle in depot)) continue;
    if (depot[cle] !== attendu) ecarts.push(`${geste} (en ligne : ${court(depot[cle])})`);
  }
  return ecarts;
}

async function lire(url) {
  const h = { accept: 'application/vnd.github+json', 'user-agent': 'ela-protections' };
  if (process.env.GITHUB_TOKEN) h.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const r = await fetch(url, { headers: h });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const depot = process.argv[2] || process.env.GITHUB_REPOSITORY || 'Barbaros911/As-mine';
  const api = `https://api.github.com/repos/${depot}`;
  const cible = JSON.parse(readFileSync(new URL('../ruleset-main.json', import.meta.url), 'utf8'));
  try {
    const liste = await lire(`${api}/rulesets`);
    const trouvee = (liste || []).find((r) => r.name === cible.name);
    const reelle = trouvee ? await lire(`${api}/rulesets/${trouvee.id}`) : null;
    const reglages = await lire(api);
    const ecarts = comparer(cible, reelle, reglages);
    /* Le jeton des Actions ne lit pas tous les réglages du dépôt (mesuré le
       20/10/2026 : « allow_update_branch » absent de la réponse). Un réglage
       illisible n'est ni un écart ni un « OK » : on le dit. */
    const illisibles = Object.entries(REGLAGES_DEPOT).filter(([cle]) => !(cle in reglages)).map(([, r]) => r.geste);
    if (!ecarts.length) {
      console.log(`OK — la règle « ${cible.name} » en ligne est celle de .github/ruleset-main.json, et les réglages du dépôt sont posés.`);
    } else {
      console.log(`ÉCARTS (${ecarts.length}) entre la règle en ligne et .github/ruleset-main.json :`);
      for (const e of ecarts) console.log(' - ' + e);
      process.exitCode = 1;
    }
    for (const g of illisibles) console.log(`À VÉRIFIER À LA MAIN (illisible avec ce jeton) : ${g}`);
  } catch (e) {
    // Une lecture impossible n'est pas un écart : on le dit, sans conclure.
    console.log('LECTURE IMPOSSIBLE — ' + e.message);
    process.exitCode = 2;
  }
}
