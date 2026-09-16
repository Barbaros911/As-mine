import fs from 'node:fs';

const fichier = process.argv[2] || 'site/index.html';
let html = fs.readFileSync(fichier, 'utf8');

/* Le serveur doit connaître la clé de la destination choisie dans la grille
   hôtel. Cette clé n'est jamais suffisante pour accorder un tarif :
   deposer-course la recroise avec le partenaire, le véhicule et une règle
   de validation de destination stockée côté serveur. */
const repereDistance = `distanceKm: Math.round(course.km * 10) / 10,\n        estimee: course.estime`;
if (!html.includes(repereDistance)) throw new Error('construction du bon introuvable : destinationCle non ajoutée');
html = html.replace(repereDistance, `distanceKm: Math.round(course.km * 10) / 10,\n        destinationCle: hotelDest ? hotelDest.cle : null,\n        estimee: course.estime`);

const ancien = `return fetch(SUPABASE_URL + "/rest/v1/courses", {
        method: "POST",
        signal: ctrl.signal,
        /* « keepalive » EST CE QUI FAIT SURVIVRE LA DEMANDE À WHATSAPP.`;
if (!html.includes(ancien)) throw new Error('dépôt public direct introuvable : transformation refusée');
html = html.replace(ancien, `return fetch(SUPABASE_URL + "/functions/v1/deposer-course", {
        method: "POST",
        signal: ctrl.signal,
        /* « keepalive » EST CE QUI FAIT SURVIVRE LA DEMANDE À WHATSAPP.`);

const ancienCorps = `headers: { apikey: SUPABASE_CLE, "Content-Type": "application/json",
                   Prefer: "return=minimal" },
        body: JSON.stringify({ ref: bon.ref, statut: bon.statut || "attente", bon: bon })`;
const nouveauCorps = `headers: { apikey: SUPABASE_CLE, "Content-Type": "application/json" },
        body: JSON.stringify({ bon: bon })`;
if (!html.includes(ancienCorps)) throw new Error('corps du dépôt public introuvable : transformation refusée');
html = html.replace(ancienCorps, nouveauCorps);

fs.writeFileSync(fichier, html);
console.log('Dépôt public routé vers /functions/v1/deposer-course avec contexte partenaire');
