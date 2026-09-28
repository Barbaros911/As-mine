/* =====================================================================
   VERIFIER-TARIF-HOTEL.MJS — le tarif écrit en dur (GAMMES, le repli du
   site) doit être celui que la source serveur déclare comme valeur par
   défaut.
   ---------------------------------------------------------------------
   IL N'Y A PLUS DE TAUX HÔTEL SÉPARÉ (28 septembre 2026, à la demande de
   Barbaros : « je veux que tout le monde ait le même prix »). Le site lit
   désormais SON tarif sur le serveur à chaque chargement (vue publique
   « tarif_public ») ; GAMMES, dans index.html, n'est plus qu'un REPLI
   pour le cas où ce serveur ne répond pas. Ce contrôle ne peut pas éprouver
   l'appel réseau depuis cette machine (elle ne joint pas Supabase), mais
   il peut éprouver que le repli n'a pas divergé de la vérité serveur — un
   repli périmé se verrait la nuit où le serveur tombe justement, jamais
   avant.

   ON NE FIGE AUCUN NOMBRE : on lit GAMMES dans le site publié, on lit la
   source serveur, et on exige qu'ils soient égaux. Une baisse décidée par
   Barbaros touche les deux et reste verte ; n'en toucher qu'un tombe, et
   le message dit lequel et de combien.
   ===================================================================== */
import { readFileSync, readdirSync } from 'node:fs';

const site = readFileSync(process.argv[2] || 'site/index.html', 'utf8');

/* ON REJOUE LES MIGRATIONS DANS L'ORDRE, PAS UNE SEULE. Le tarif général
   a été SEMÉ dans « 20260916100000_current_tariff_source.sql » (INSERT)
   puis CORRIGÉ dans « 20260928120000_tarif_unifie.sql » (UPDATE) — lire
   uniquement le premier fichier aurait comparé le repli du site à une
   valeur que la base ne porte plus. Les fichiers sont triés par nom, donc
   chronologiquement (préfixe horodaté), et on garde la dernière valeur
   trouvée pour chaque clé — c'est ce qu'un vrai rejeu produirait. */
const migDir = 'supabase/migrations';
const src = readdirSync(migDir).filter(f => f.endsWith('.sql')).sort()
  .map(f => readFileSync(`${migDir}/${f}`, 'utf8')).join('\n');

const m = site.match(
  /var GAMMES = \[\s*\{ cle:"berline"[^}]*parKm:([\d.]+), mini:(\d+)[^}]*\},\s*\{ cle:"van"[^}]*parKm:([\d.]+), mini:(\d+)/
);
if (!m) {
  console.error('✘ « GAMMES » est introuvable ou a changé de forme dans le site publié.');
  process.exit(1);
}
const publie = { berline: Number(m[1]), van: Number(m[3]) };
const publieMini = { berline: Number(m[2]), van: Number(m[4]) };

/* Deux formes valides, l'INSERT d'origine et l'UPDATE qui l'a corrigée.
   CHAQUE REGEX CAPTURE LA CLÉ ET LE JSON DANS LE MÊME MATCH, bornée par le
   « ; » de fin d'instruction (« [^;]* ») : les capturer séparément avait
   laissé une fenêtre « [\s\S]{0,300}? » sauter par-dessus le « where cle »
   du VAN, glisser jusqu'au « where cle » du prochain UPDATE (BERLINE) et
   lui attribuer la valeur du van — mesuré, pas supposé : le premier jet
   rendait 2,9 €/km comme tarif serveur du van, qui est en réalité celui
   de la berline. Une clé et sa valeur doivent venir de LA MÊME
   instruction, jamais recollées par proximité de texte. */
const lignes = [];
for (const r of src.matchAll(/\('(tarif_general_\w+)'\s*,\s*'(\{[^']*\})'::jsonb/g)) {
  lignes.push({ i: r.index, cle: r[1].replace('tarif_general_', ''), json: r[2] });
}
for (const r of src.matchAll(/update\s+public\.parametres_commerciaux\s+set\s+valeur\s*=\s*'(\{[^']*\})'[^;]*where\s+cle\s*=\s*'(tarif_general_\w+)'/gi)) {
  lignes.push({ i: r.index, cle: r[2].replace('tarif_general_', ''), json: r[1] });
}
lignes.sort((a, b) => a.i - b.i);

const lire = (cle, champ) => {
  const trouvees = lignes.filter(l => l.cle === cle);
  if (!trouvees.length) return null;
  const derniere = trouvees[trouvees.length - 1];
  const r = derniere.json.match(new RegExp(champ + '"\\s*:\\s*(\\d+)'));
  return r ? Number(r[1]) / 100 : null;
};
const serveur = { berline: lire('berline', 'par_km_centimes'), van: lire('van', 'par_km_centimes') };
const serveurMini = { berline: lire('berline', 'minimum_centimes'), van: lire('van', 'minimum_centimes') };

let ko = 0;
for (const gamme of ['berline', 'van']) {
  if (serveur[gamme] === null) {
    console.error(`✘ ${gamme} : la source serveur ne déclare aucun tarif général.`);
    ko++; continue;
  }
  if (publie[gamme] !== serveur[gamme] || publieMini[gamme] !== serveurMini[gamme]) {
    console.error(`✘ ${gamme} : le repli du site est à ${publie[gamme]} €/km (min. ${publieMini[gamme]} €), `
                + `la source serveur dit ${serveur[gamme]} €/km (min. ${serveurMini[gamme]} €).`);
    console.error('  Le prix est ferme donc opposable : les deux doivent bouger ensemble.');
    ko++;
  } else {
    console.log(`✔ ${gamme} : ${publie[gamme]} €/km, repli du site et serveur d'accord`);
  }
}
/* LES FORFAITS easyHotel — TROIS ENDROITS, UN SEUL PRIX (22/09/2026).
   La source serveur fait foi : deposer-course REMPLACE le prix du client par
   le sien. Le moteur (HOTELS dans le site publié) l'affiche avant la
   réservation, et la page du QR (sites/easyhotel-client/) l'annonce sur ses
   cartes. Trois copies d'un prix ferme : un écart est un prix annoncé qu'on
   ne facture pas. On NE FIGE AUCUN MONTANT — on exige l'accord, et le
   message nomme la destination, la gamme et les trois valeurs. */
const forfaitsServeur = {};
for (const r of src.matchAll(/\('(\w+)','[^']*','(berline|van)',(\d+)\)/g)) {
  (forfaitsServeur[r[1]] ||= {})[r[2]] = Number(r[3]) / 100;
}
const forfaitsSite = {};
for (const r of site.matchAll(/cle:"(\w+)"[^{}]*?(?:\{[^{}]*\}[^{}]*?)*?forfait:\{\s*berline:(\d+),\s*van:(\d+)\s*\}/g)) {
  forfaitsSite[r[1]] = { berline: Number(r[2]), van: Number(r[3]) };
}
const landing = readFileSync('sites/easyhotel-client/index.html', 'utf8');
const forfaitsLanding = {};
for (const r of landing.matchAll(/<a class="carte" data-dest="(\w+)"[\s\S]*?<\/a>/g)) {
  const px = (g) => { const x = r[0].match(new RegExp('data-g="' + g + '">(\\d+) €')); return x ? Number(x[1]) : null; };
  forfaitsLanding[r[1]] = { berline: px('berline'), van: px('van') };
}
const cles = Object.keys(forfaitsServeur);
if (!cles.length) { console.error('✘ aucun forfait easyHotel lisible dans la source serveur.'); ko++; }
for (const cle of new Set([...cles, ...Object.keys(forfaitsSite), ...Object.keys(forfaitsLanding)])) {
  for (const g of ['berline', 'van']) {
    const v = [forfaitsServeur[cle]?.[g], forfaitsSite[cle]?.[g], forfaitsLanding[cle]?.[g]];
    if (v.some(x => typeof x !== 'number') || v[0] !== v[1] || v[0] !== v[2]) {
      console.error(`✘ ${cle} / ${g} : serveur ${v[0] ?? 'absent'} € · moteur ${v[1] ?? 'absent'} € · page QR ${v[2] ?? 'absent'} €`);
      ko++;
    }
  }
}
if (cles.length && !ko) console.log(`✔ ${cles.length} forfaits easyHotel : serveur, moteur et page du QR d'accord`);

process.exit(ko ? 1 : 0);
