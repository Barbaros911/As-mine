import fs from 'node:fs';

const fichier = process.argv[2] || 'site/index.html';
let html = fs.readFileSync(fichier, 'utf8');

/* Le serveur doit connaître la clé de la destination choisie dans la grille
   hôtel. Cette clé n'est jamais suffisante pour accorder un tarif :
   deposer-course la recroise avec le partenaire, le véhicule et une règle
   de validation de destination stockée côté serveur. */
const repereDistance = `distanceKm: Math.round(course.km * 10) / 10,\n        estimee: course.estime`;
if (!html.includes(repereDistance)) throw new Error('construction du bon introuvable : destinationCle non ajoutée');
html = html.replace(repereDistance, `distanceKm: Math.round(course.km * 10) / 10,\n        destinationCle: (function(d){ return d ? d.cle : null; })(destHotelRetenue()),\n        estimee: course.estime`);

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
        body: JSON.stringify({ bon: bon,
          sessionReception: recHotel ? codeRetenu(recHotel.cle) : "" })`;
if (!html.includes(ancienCorps)) throw new Error('corps du dépôt public introuvable : transformation refusée');
html = html.replace(ancienCorps, nouveauCorps);

// La REST historique rendait un corps vide ; l’Edge Function rend un accusé JSON.
// Une page de proxy, un objet vide ou une autre référence ne prouvent aucun dépôt.
const accuseHistorique = `return r.json().then(function(j){
          if(j && Number(j.numero) > 0) poserNumeroClient(bon, Number(j.numero));
          return true;
        }, function(){ return true; });`;
if (!html.includes(accuseHistorique)) throw new Error('accusé du dépôt introuvable');
// Chaque refus nomme sa cause (1er novembre 2026) : « signalerDepot » la remonte à erreur-client.
html = html.replace(accuseHistorique, `return r.json().then(function(j){
          if(!j || j.ok !== true){ nuage.causeDepot = "accusé refusé"; return false; }
          if(j.ref && j.ref !== bon.ref){ nuage.causeDepot = "référence différente dans l'accusé"; return false; }
          if(Number(j.numero) > 0) poserNumeroClient(bon, Number(j.numero));
          return true;
        }, function(){ nuage.causeDepot = "accusé illisible"; return false; });`);
fs.writeFileSync(fichier, html);
console.log('Dépôt public routé vers /functions/v1/deposer-course avec contexte partenaire');
