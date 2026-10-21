/* =====================================================================
   TEST-MONITORING-SONDE.MJS — la sonde de réservation du monitoring
   ---------------------------------------------------------------------
   20 octobre 2026. Le monitoring réserve pour de vrai sur le site en ligne
   (.github/scripts/sonde-reservation.mjs) ; une sonde qui se tromperait
   enregistrerait une fausse course et réveillerait Barbaros. On l'éprouve
   ici sur le SITE CONSTRUIT, hors ligne, avec un faux deposer-course :
   1. le parcours va au bout : prix, gamme, coordonnées, « Confirmer », bon ;
   2. ce qui part au serveur porte « sonde » ET une référence « SONDE- »
      — jamais « ELA- » ;
   3. toute autre écriture vers le serveur est coupée (rien d'autre ne part) ;
   4. un serveur qui refuse (400 : fonction pas à jour) ou se tait fait
      TOMBER la sonde, avec la raison — jamais un vert ;
   5. sans « Confirmer » qui dépose, la sonde le dit.
   Port 8177, propre à cette suite.
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';
import { sonderReservation } from './.github/scripts/sonde-reservation.mjs';

execSync('sh construire.sh', { stdio: 'ignore' });
const TYPES = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8177, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8177/';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const nav = await chromium.launch();
/* Hors ligne : tout ce qui n'est pas le site ni le serveur Supabase est coupé
   (calculateurs d'itinéraire compris : la page tombe sur la ligne droite). */
const preparer = async ctx => ctx.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
const lire = route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });

async function tourner(envoyer) {
  const msgs = { ok: [], ko: [] }, recus = [];
  const etat = await sonderReservation({ navigateur: nav, base: BASE, lire, preparer,
    ok: m => msgs.ok.push(m), ko: m => msgs.ko.push(m),
    envoyer: envoyer && (async corps => { recus.push(corps); return envoyer(corps); }) });
  return { msgs, recus, etat };
}

try {
  /* 1-3. Le serveur accepte la sonde. */
  {
    const { msgs, recus, etat } = await tourner(c => ({ status: 200, corps: { ok: true, sonde: true, ref: c.bon.ref } }));
    check('1 la sonde ne tombe nulle part quand le serveur répond', msgs.ko.length === 0, msgs.ko.join(' | '));
    check('1 le moteur a calculé un prix', msgs.ok.some(m => /calcule un prix/.test(m)), msgs.ok.join(' | '));
    check('1 le client voit son bon', msgs.ok.some(m => /voit son bon/.test(m)));
    check('2 UNE demande est partie', recus.length === 1, String(recus.length));
    const c = recus[0] || { bon: {} };
    check('2 elle porte « sonde: true »', c.sonde === true);
    check('2 sa référence est « SONDE- », jamais « ELA- »', /^SONDE-/.test(c.bon.ref || '') && !/^ELA-/.test(c.bon.ref || ''), c.bon.ref);
    check('2 c\'est une vraie demande du site (prix, adresses, gamme)', (c.bon.prix?.total || 0) > 0 && /Orly/.test(c.bon.course?.depart || '') && /Terminal 2E/.test(c.bon.course?.arrivee || '') && !!c.bon.course?.vehiculeCle,
      JSON.stringify({ prix: c.bon.prix, d: c.bon.course?.depart, a: c.bon.course?.arrivee }));
    check('3 toute autre écriture vers le serveur est coupée, deposer-course n\'y est pas', etat.coupees.every(u => !/deposer-course/.test(u)), etat.coupees.slice(0, 3).join(' | '));
  }
  /* 4. Le serveur refuse (fonction pas à jour) : la sonde tombe et dit pourquoi. */
  {
    const { msgs } = await tourner(() => ({ status: 400, corps: { erreur: 'demande invalide' } }));
    check('4 un 400 fait tomber la sonde, avec la raison', msgs.ko.some(m => /refuse la sonde \(400\)/.test(m)), msgs.ko.join(' | '));
  }
  {
    /* Le serveur ne répond pas dans le délai : on le DIT comme tel, pas
       « rien n'est parti ». Le faux serveur répond après le délai de la sonde. */
    const { msgs } = await tourner(() => new Promise(r => setTimeout(() => r({ status: 200, corps: { ok: true, sonde: true } }), 48000)));
    check('4 un serveur muet est dit « n\'a pas répondu », jamais « rien n\'est parti »', msgs.ko.some(m => /n'a pas répondu en 45 s/.test(m)) && !msgs.ko.some(m => /aucune demande n'est partie/.test(m)), msgs.ko.join(' | '));
  }
  {
    const { msgs } = await tourner(() => ({ status: 503, corps: { erreur: 'service indisponible' } }));
    check('4 un 503 fait tomber la sonde (« on ne peut plus réserver »)', msgs.ko.some(m => /503/.test(m) && /plus réserver/.test(m)), msgs.ko.join(' | '));
  }
  {
    /* Une réponse 200 SANS « sonde » : une fonction qui aurait enregistré
       la course répondrait 201 ; un 200 sans le drapeau n'est pas une sonde. */
    const { msgs } = await tourner(c => ({ status: 201, corps: { ok: true, ref: c.bon.ref } }));
    check('4 un dépôt ENREGISTRÉ (201) fait tomber la sonde, en le disant', msgs.ko.some(m => /ENREGISTRÉE/.test(m)), msgs.ko.join(' | '));
  }
} finally {
  await nav.close(); serveur.close();
}
console.log(`\n=== test-monitoring-sonde : ${ok.length} réussis, ${ko.length} échecs ===`);
ok.forEach(x => console.log('  ✔ ' + x));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(x => console.log('  ✘ ' + x)); process.exit(1); }
