import fs from 'node:fs';

/* ═══ LE GARDE-FOU DU DÉPÔT PUBLIC (2 novembre 2026) ═══
   Jusqu'ici ce script RÉÉCRIVAIT le dépôt pendant la construction : le
   source appelait encore /rest/v1/courses, et quatre « replace » le
   routaient vers /functions/v1/deposer-course en y ajoutant le contexte
   partenaire et le jugement de l'accusé. Le source ne décrivait donc pas ce
   qui tournait. Depuis, c'est index.html qui porte ce comportement, et ce
   script ne fait plus que le VÉRIFIER sur le document construit : il tombe,
   avec la cause, si une régression ramène l'ancien dépôt ou retire une pièce
   du nouveau. Il n'écrit rien.
   test-depot-source.mjs l'éprouve contre chacune de ces régressions. */

export const EXIGENCES = [
  ['le dépôt public appelle /functions/v1/deposer-course',
   h => h.includes('fetch(SUPABASE_URL + "/functions/v1/deposer-course", {')],
  ['aucun dépôt public direct dans /rest/v1/courses',
   h => !h.includes('fetch(SUPABASE_URL + "/rest/v1/courses"')],
  ['le dépôt est marqué keepalive (il survit au passage en arrière-plan)',
   h => /deposer-course", \{[\s\S]{0,2000}?keepalive: true,[\s\S]{0,2000}?sessionReception/.test(h)],
  ['le corps envoyé est { bon, sessionReception }',
   h => h.includes('body: JSON.stringify({ bon: bon,') && h.includes('sessionReception: recHotel ? codeRetenu(recHotel.cle) : "" })')],
  ['la clé publique va dans apikey, sans Prefer de la REST',
   h => /deposer-course", \{[\s\S]{0,2000}?headers: \{ apikey: SUPABASE_CLE, "Content-Type": "application\/json" \},/.test(h)],
  ['le bon porte destinationCle, lue sur la destination retenue',
   h => h.includes('destinationCle: (function(d){ return d ? d.cle : null; })(destHotelRetenue()),')],
  ['un accusé sans « ok » vrai est un refus nommé',
   h => h.includes('if(!j || j.ok !== true){ nuage.causeDepot = "accusé refusé"; return false; }')],
  ['un accusé qui porte une autre référence est refusé',
   h => h.includes(`if(j.ref && j.ref !== bon.ref){ nuage.causeDepot = "référence différente dans l'accusé"; return false; }`)],
  ['un accusé illisible est un échec, jamais un succès',
   h => h.includes('function(){ nuage.causeDepot = "accusé illisible"; return false; }')],
  ['le N° court de l\'accusé est posé sur le bon',
   h => h.includes('if(Number(j.numero) > 0) poserNumeroClient(bon, Number(j.numero));')],
  ['un 409 reste « reference » : rejeu, puis autre référence',
   h => h.includes('if(r.status === 409) return "reference";')],
  ['un refus HTTP garde son code pour cause',
   h => h.includes('if(!r.ok){ nuage.causeDepot = "http " + r.status; return false; }')],
  ['délai dépassé et réseau coupé restent des causes nommées',
   h => h.includes('nuage.causeDepot = (e && e.name === "AbortError") ? "délai de 8 s dépassé" : "réseau";')],
];

export function manquements(html){
  return EXIGENCES.filter(([, ok]) => !ok(html)).map(([nom]) => nom);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const fichier = process.argv[2] || 'site/index.html';
  const html = fs.readFileSync(fichier, 'utf8');
  const manques = manquements(html);
  if (manques.length) {
    console.error('Dépôt public : ' + fichier + ' ne respecte pas :\n  - ' + manques.join('\n  - '));
    process.exit(1);
  }
  console.log('Dépôt public vérifié : /functions/v1/deposer-course, contexte partenaire, accusé jugé (' + EXIGENCES.length + ' exigences)');
}
