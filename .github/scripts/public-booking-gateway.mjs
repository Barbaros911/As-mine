import fs from 'node:fs';

const fichier = process.argv[2] || 'site/index.html';
let html = fs.readFileSync(fichier, 'utf8');

const ancien = `return fetch(SUPABASE_URL + "/rest/v1/courses", {
        method: "POST",
        signal: ctrl.signal,
        /* « keepalive » EST CE QUI FAIT SURVIVRE LA DEMANDE À WHATSAPP.`;

if (!html.includes(ancien)) {
  throw new Error('dépôt public direct introuvable : transformation refusée');
}

html = html.replace(ancien, `return fetch(SUPABASE_URL + "/functions/v1/deposer-course", {
        method: "POST",
        signal: ctrl.signal,
        /* « keepalive » EST CE QUI FAIT SURVIVRE LA DEMANDE À WHATSAPP.`);

const ancienCorps = `headers: { apikey: SUPABASE_CLE, "Content-Type": "application/json",
                   Prefer: "return=minimal" },
        body: JSON.stringify({ ref: bon.ref, statut: bon.statut || "attente", bon: bon })`;
const nouveauCorps = `headers: { apikey: SUPABASE_CLE, "Content-Type": "application/json" },
        body: JSON.stringify({ bon: bon })`;

if (!html.includes(ancienCorps)) {
  throw new Error('corps du dépôt public introuvable : transformation refusée');
}
html = html.replace(ancienCorps, nouveauCorps);

fs.writeFileSync(fichier, html);
console.log('Dépôt public routé vers /functions/v1/deposer-course');
