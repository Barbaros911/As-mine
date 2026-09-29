/* =====================================================================
   VERIFIER-TARIF-HOTEL.MJS — le taux hôtel du site publié doit être
   celui que la source serveur déclare.
   ---------------------------------------------------------------------
   LE TROU QUE CE CONTRÔLE FERME, ET IL A ÉTÉ MESURÉ. « Contrôle source
   tarifaire serveur » comparait les tarifs GÉNÉRAUX et les FORFAITS, mais
   pas le tarif hôtel AU KILOMÈTRE — celui qui s'applique quand une
   réception envoie un client vers « autre destination ». Éprouvé en
   posant 9,99 €/km dans le transformateur : le site publié facturait
   9,99 €/km et TOUS les contrôles restaient au vert.

   POURQUOI ÇA NE SE VOIT PAS : ce taux n'existe que dans le site
   CONSTRUIT. Le dépôt ne le porte pas — c'est le transformateur qui
   l'injecte — donc aucune suite qui éprouve le dépôt ne peut le voir. Et
   le prix est FERME donc OPPOSABLE.

   ON NE FIGE AUCUN NOMBRE : on lit le taux dans le site publié, on lit la
   source serveur, et on exige qu'ils soient égaux. Une baisse décidée par
   Barbaros touche les deux et reste verte ; n'en toucher qu'un tombe, et
   le message dit lequel et de combien.
   ===================================================================== */
import { readFileSync } from 'node:fs';

const site = readFileSync(process.argv[2] || 'site/index.html', 'utf8');
const src  = readFileSync('supabase/migrations/20260916100000_current_tariff_source.sql', 'utf8');

/* Le taux injecté : « gamme.cle === "van" ? 4.10 : 2.55 ». On lit les deux
   nombres à leur place, pas par leur valeur. */
const m = site.match(/tauxHotel\s*=\s*gamme\.cle\s*===\s*"van"\s*\?\s*([\d.]+)\s*:\s*([\d.]+)/);
if (!m) {
  console.error('✘ le taux hôtel au kilomètre est introuvable dans le site publié.');
  console.error('  Soit le transformateur ne s\'applique plus, soit sa forme a changé.');
  console.error('  Dans les deux cas c\'est à regarder : le mode hôtel facture au kilomètre.');
  process.exit(1);
}
const publie = { van: Number(m[1]), berline: Number(m[2]) };

const lire = (cle) => {
  const r = src.match(new RegExp('"' + cle + '"\\s*:\\s*(\\d+)'));
  return r ? Number(r[1]) / 100 : null;
};
const serveur = { van: lire('van_par_km_centimes'), berline: lire('berline_par_km_centimes') };

let ko = 0;
for (const gamme of ['berline', 'van']) {
  if (serveur[gamme] === null) {
    console.error(`✘ ${gamme} : la source serveur ne déclare aucun tarif hôtel au kilomètre.`);
    ko++; continue;
  }
  if (publie[gamme] !== serveur[gamme]) {
    console.error(`✘ ${gamme} : le site publie ${publie[gamme]} €/km, la source serveur dit `
                + `${serveur[gamme]} €/km — écart de ${(publie[gamme] - serveur[gamme]).toFixed(2)} €/km.`);
    console.error('  Le prix est ferme donc opposable : les deux doivent bouger ensemble.');
    ko++;
  } else {
    console.log(`✔ ${gamme} : ${publie[gamme]} €/km, site et serveur d'accord`);
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
