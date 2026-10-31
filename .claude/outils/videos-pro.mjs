#!/usr/bin/env node
/* =====================================================================
   VIDEOS-PRO.MJS — les vidéos de la démo pour /professionnels/
   ---------------------------------------------------------------------
   « Voir l'outil en vidéo » (28 octobre 2026, Barbaros : « une vidéo de
   l'outil de réception aussi », « version ordinateur aussi ») : deux
   parcours filmés sur la VRAIE démo du site construit —
     client    : la page du QR code, la réservation, la confirmation, puis
                 la course vue par la réception ;
     reception : la réception réserve elle-même, voit la course validée, et
                 la retrouve par la chambre ;
   chacun sur téléphone (390 px, en portrait) et sur ordinateur (1280 px),
   en français et en anglais : huit vidéos, et une image d'attente chacune.

   Comme les captures (captures-pro.mjs) : faux demande-demo (« Hôtel
   Exemple Roissy »), adresses et itinéraire simulés, horloge à 10 h,
   l'habillage de démonstration masqué. En plus, et la page le dit :
   hôtel et clients fictifs, numéros dans la plage réservée à la fiction
   (06 39 98), MONTANTS REMPLACÉS PAR « votre tarif » — la démo ne propose
   aucun prix, l'établissement fixe les siens. Rien ne sort sur Internet,
   sauf les polices si POLICES n'est pas donné.

   POURQUOI DES CAPTURES EN RAFALE : l'enregistreur de Playwright et le flux
   d'écran du navigateur ne gardent que les pixels CSS (390 px de large). Des
   captures d'écran sortent, elles, à la densité de l'appareil (780 px ;
   1920 × 1080 sur ordinateur). Chacune garde son heure, et ffmpeg les remet
   au bon rythme. Une capture lancée pendant un changement de page reste
   bloquée : la caméra s'arrête le temps de la navigation.

   Lancer :  sh construire.sh && node .claude/outils/videos-pro.mjs [filtre]
             (filtre : par exemple « reception-telephone-en » ; ffmpeg requis ;
             POLICES=<dossier> sert Figtree depuis figtree.css et ses woff2)
   Écrit professionnels/video-<parcours>-<écran>-<langue>.mp4 et
   professionnels/affiche-<parcours>-<écran>-<langue>.webp. Les regarder
   avant de les montrer, et test-pro-page.mjs avant de pousser.
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname, normalize } from 'node:path';

const RACINE = join(process.cwd(), 'site');
const SORTIE = join(process.cwd(), 'professionnels');
const FILTRE = process.argv[2] || '';
const POLICES = process.env.POLICES || '';
if (spawnSync('ffmpeg', ['-version']).status !== 0) { console.error('ffmpeg est introuvable : il assemble les vidéos.'); process.exit(1); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(RACINE, chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + serveur.address().port;
const cssPolices = POLICES ? (await readFile(join(POLICES, 'figtree.css'), 'utf8'))
  .replace(/https:\/\/fonts\.gstatic\.com\/[^)]*\/([^/)]+\.woff2)/g, 'https://fonts.gstatic.com/l/$1') : '';

/* 10 h à Paris aujourd'hui, heure d'été ou d'hiver. */
const JOUR = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10);
const DIX_HEURES = ['+02:00', '+01:00'].map(o => new Date(`${JOUR}T10:00:00${o}`))
  .find(d => d.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(11, 16) === '10:00');

const ECRANS = { telephone: { width: 390, height: 844, dpr: 2 }, ordinateur: { width: 1280, height: 720, dpr: 1.5 } };
const N = ' ';
const TEXTES = {
  fr: {
    tarif: 'votre tarif', lire: 'Lire la vidéo',
    fin: ['Essayez la démo à votre nom.', 'elatransfer.com/professionnels', 'Mise en place gratuite · Sans engagement'],
    client: { titre: ['Votre équipe réserve. Elatransfer gère tout le reste.', 'Comment ça marche pour votre hôtel', 'Démonstration · hôtel et client fictifs'],
      nom: 'Jean Martin', tel: '06 39 98 00 21',
      l: ['Votre client scanne le QR code de l’accueil : la page de votre hôtel s’ouvre.',
        'Il choisit sa destination et réserve : date, heure, nom, téléphone.',
        'Elatransfer cherche un chauffeur dans son réseau, puis confirme au client.',
        'Votre réception voit chaque demande, et où elle en est.'] },
    reception: { titre: ['L’espace réception', 'Votre équipe réserve un transfert en quelques secondes', 'Démonstration · hôtel et clients fictifs'],
      nom: 'Paul Girard', tel: '06 39 98 00 35', chambre: '312',
      l: ['Votre espace réception : toutes les courses de l’hôtel, au même endroit.',
        `Un client demande un transfert : «${N}Nouvelle course${N}». Le départ de l’hôtel est déjà rempli.`,
        'La réception note le nom, la chambre et le téléphone du client.',
        'Le prix est annoncé avant. Un appui pour valider, et c’est tout pour la réception.',
        `Elatransfer cherche le chauffeur. La réception voit la course passer à «${N}Réservation validée${N}».`,
        'À la relève, l’équipe suivante retrouve une course par la chambre, le nom ou la référence.'] },
  },
  en: {
    tarif: 'your rate', lire: 'Play the video',
    fin: ['Try the demo under your name.', 'elatransfer.com/professionnels', 'Free set-up · No commitment'],
    client: { titre: ['Your team books. Elatransfer takes care of everything else.', 'How it works for your hotel', 'Demonstration · fictitious hotel and guest'],
      nom: 'James Miller', tel: '06 39 98 00 21',
      l: ['Your guest scans the QR code at reception: your hotel’s page opens.',
        'They choose their destination and book: date, time, name, phone number.',
        'Elatransfer searches its network for a chauffeur, then confirms with the guest.',
        'Your front desk sees every request, and where it stands.'] },
    reception: { titre: ['The front-desk space', 'Your team books a transfer in a few seconds', 'Demonstration · fictitious hotel and guests'],
      nom: 'David Clark', tel: '06 39 98 00 35', chambre: '312',
      l: ['Your front-desk space: all of the hotel’s rides, in one place.',
        'A guest asks for a transfer: “New ride”. The hotel pickup is already filled in.',
        'The front desk enters the guest’s name, room and phone number.',
        'The price is shown in advance. One tap to confirm, and that’s all for the front desk.',
        'Elatransfer searches for the chauffeur. The front desk sees the ride move to “Confirmed”.',
        'At shift change, the next team finds any ride by room, name or reference.'] },
  },
};

/* Ce qui est posé dans la page pendant le tournage : le rond de l'appui, la
   démo sans son habillage, les montants remplacés, et les légendes et cartes
   de titre HORS du body (les observateurs du moteur ne les voient pas). */
function habillage(tarif) {
  addEventListener('pointerdown', e => {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;left:${e.clientX - 22}px;top:${e.clientY - 22}px;width:44px;height:44px;border-radius:50%;
      background:rgba(18,196,238,.35);border:2px solid rgba(18,196,238,.9);z-index:2147483647;pointer-events:none;transition:transform .45s,opacity .45s;`;
    document.documentElement.appendChild(d);
    requestAnimationFrame(() => { d.style.transform = 'scale(1.6)'; d.style.opacity = '0'; });
    setTimeout(() => d.remove(), 600);
  }, true);
  const PRIX = /€[  ]?\d[\d,.]*\d|\d[\d   ]*(?:[,.]\d{2})?[   ]?€/g;
  const masquer = () => {
    if (!document.body) return;
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) if (PRIX.test(n.data)) { PRIX.lastIndex = 0; n.data = n.data.replace(PRIX, tarif); }
  };
  document.addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style');
    st.textContent = '#demoBandeau,#demoCadre,#demoSuivi,#demoCartesAide,#demoCartesFlyer,#demoToast,#demoQr,#demoPied,#demoMettreEnPlacePied{display:none!important}';
    document.head.appendChild(st);
    masquer(); new MutationObserver(masquer).observe(document.body, { subtree: true, childList: true, characterData: true });
  });
  const large = () => innerWidth > 700;
  window.__legende = (num, texte) => {
    let l = document.getElementById('vLegende');
    if (!l) {
      l = document.createElement('div'); l.id = 'vLegende';
      l.style.cssText = (large()
        ? 'position:fixed;left:50%;transform:translateX(-50%);bottom:26px;width:max-content;max-width:860px;padding:16px 24px;font:700 21px/1.35 Figtree,Arial,sans-serif;gap:14px;'
        : 'position:fixed;left:12px;right:12px;bottom:14px;padding:14px 16px;font:700 16.5px/1.35 Figtree,Arial,sans-serif;gap:12px;')
        + 'z-index:2147483646;pointer-events:none;display:flex;align-items:center;border-radius:16px;background:rgba(0,31,59,.95);color:#fff;'
        + 'box-shadow:0 10px 30px rgba(0,10,25,.35)';
      document.documentElement.appendChild(l);
    }
    l.innerHTML = '';
    const b = document.createElement('b'); b.textContent = num;
    b.style.cssText = `flex:none;display:grid;place-items:center;width:${large() ? 36 : 30}px;height:${large() ? 36 : 30}px;border-radius:50%;background:#12C4EE;color:#001f3b;`;
    l.appendChild(b);
    const t = document.createElement('span'); t.textContent = texte; l.appendChild(t);
  };
  window.__sansLegende = () => { const l = document.getElementById('vLegende'); if (l) l.remove(); };
  window.__carte = (titre, ligne, petit) => {
    const c = document.createElement('div'); c.id = 'vCarte';
    const g = large();
    c.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;justify-content:center;transition:opacity .5s;'
      + 'background:linear-gradient(160deg,#001f3b,#062f55);color:#fff;'
      + (g ? 'gap:22px;padding:0 140px;font:800 54px/1.1 Figtree,Arial,sans-serif;' : 'gap:18px;padding:36px;font:800 30px/1.15 Figtree,Arial,sans-serif;');
    c.innerHTML = `<img src="/brand-logo-negatif.webp" alt="" style="width:${g ? 170 : 120}px;height:auto;margin-bottom:10px">`;
    const h = document.createElement('div'); h.textContent = titre; h.style.maxWidth = '900px'; c.appendChild(h);
    const p = document.createElement('div'); p.textContent = ligne; p.style.cssText = `font:700 ${g ? 26 : 18}px/1.4 Figtree,Arial,sans-serif;color:#6ee5ff`; c.appendChild(p);
    const q = document.createElement('div'); q.textContent = petit; q.style.cssText = `font:600 ${g ? 18 : 14}px/1.4 Figtree,Arial,sans-serif;color:#9fc3dc`; c.appendChild(q);
    document.documentElement.appendChild(c);
  };
  /* L'image d'attente : la carte de titre, et un bouton de lecture dessiné. */
  window.__bouton = lire => {
    const c = document.getElementById('vCarte'); if (!c) return;
    const g = large(), b = document.createElement('div'); b.id = 'vBouton';
    b.style.cssText = `display:flex;align-items:center;gap:14px;margin-top:${g ? 18 : 10}px;font:800 ${g ? 22 : 17}px/1 Figtree,Arial,sans-serif;color:#fff`;
    b.innerHTML = `<span style="display:grid;place-items:center;width:${g ? 74 : 58}px;height:${g ? 74 : 58}px;border-radius:50%;background:#12C4EE">`
      + `<svg viewBox="0 0 24 24" width="${g ? 30 : 24}" height="${g ? 30 : 24}"><path d="M8 5v14l11-7z" fill="#001f3b"/></svg></span>`;
    const t = document.createElement('span'); t.textContent = lire; b.appendChild(t);
    c.appendChild(b);
  };
  window.__sansBouton = () => { const b = document.getElementById('vBouton'); if (b) b.remove(); };
  window.__sansCarte = () => { const c = document.getElementById('vCarte'); if (c) { c.style.opacity = '0'; setTimeout(() => c.remove(), 500); } };
}

async function tourner(parcours, ecran, langue) {
  const E = ECRANS[ecran], T = TEXTES[langue], P = T[parcours], en = langue === 'en';
  const loc = en ? 'en_GB.UTF-8' : 'fr_FR.UTF-8';
  const nav = await chromium.launch({ env: { ...process.env, LANG: loc, LC_ALL: loc, LANGUAGE: langue } });
  const ctx = await nav.newContext({ viewport: { width: E.width, height: E.height }, deviceScaleFactor: E.dpr,
    locale: en ? 'en-GB' : 'fr-FR', timezoneId: 'Europe/Paris' });
  await ctx.addInitScript(l => { try { localStorage.setItem('ela_demo_session', 'video'); localStorage.setItem('ela_mesure_non', '1'); localStorage.setItem('ela_langue', l); } catch (x) {} }, langue);
  await ctx.addInitScript(habillage, T.tarif);
  await ctx.route('**/*', async r => {
    const u = r.request().url();
    if (u.startsWith(BASE)) return r.continue();
    if (/fonts\.g(oogleapis|static)\.com/.test(u)) {
      if (!POLICES) return r.continue();
      if (/fonts\.googleapis\.com/.test(u)) return r.fulfill({ contentType: 'text/css', body: cssPolices });
      return r.fulfill({ contentType: 'font/woff2', body: await readFile(join(POLICES, u.split('/').pop())) });
    }
    if (u.includes('/functions/v1/demande-demo')) return r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, etablissement: 'Hôtel Exemple Roissy', type: 'hotel', expire: new Date(Date.now() + 6048e5).toISOString() }) });
    if (u.includes('photon.komoot.io') || u.includes('api-adresse.data.gouv.fr'))
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ features: [] }) });
    if (u.includes('router.project-osrm.org'))
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ routes: [{ distance: 52000, duration: 2700 }] }) });
    return r.abort();
  });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  await p.clock.setFixedTime(DIX_HEURES);

  const images = [];
  let filme = false, rafale = null;
  const filmer = () => { if (filme) return; filme = true; rafale = (async () => {
    while (filme) { const t = Date.now() / 1000; const b = await p.screenshot({ type: 'jpeg', quality: 88, timeout: 4000 }).catch(() => null); if (b) images.push({ b, t }); }
  })(); };
  const pause = ms => p.waitForTimeout(ms);
  const naviguer = async url => { filme = false; await rafale; await p.goto(url); await pause(300); filmer(); };
  const defiler = (y, duree = 1000) => p.evaluate(([y, duree]) => new Promise(ok => {
    const de = scrollY, t0 = performance.now();
    (function pas(t) { const k = Math.min(1, (t - t0) / duree), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      scrollTo(0, de + (y - de) * e); k < 1 ? requestAnimationFrame(pas) : ok(); })(t0);
  }), [y, duree]);
  const vers = async (sel, marge = 140) => { const y = await p.evaluate(([s, m]) => { const e = document.querySelector(s); return e ? Math.max(0, scrollY + e.getBoundingClientRect().top - m) : scrollY; }, [sel, marge]); await defiler(y); };
  const toucher = async (sel, marge) => {
    const dedans = await p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return r.top > 70 && r.bottom < innerHeight - 140; }, sel);
    if (!dedans) { await vers(sel, marge ?? Math.round(E.height / 3)); await pause(350); }
    await p.click(sel);
  };
  const taper = async (sel, texte) => { await toucher(sel); await p.keyboard.type(texte, { delay: 65 }); await pause(250); };
  const legende = (n, t) => p.evaluate(([n, t]) => window.__legende(n, t), [n, t]);
  const carte = c => p.evaluate(c => window.__carte(...c), c);
  const suivant = () => p.evaluate(() => document.querySelector('#demoSuivi .demo-suivant').click());

  // Le titre, l'image d'attente (avec son bouton de lecture), puis la caméra.
  await p.goto(BASE + (parcours === 'client' ? '/demo/hotel/' : '/demo/hotel/reception/'));
  await carte(P.titre);
  await p.evaluate(() => document.fonts.ready); await pause(600);
  await p.evaluate(l => window.__bouton(l), T.lire); await pause(150);
  const affiche = await p.screenshot({ type: 'png' });
  await p.evaluate(() => window.__sansBouton()); await pause(100);
  filmer(); await pause(3400);
  await p.evaluate(() => window.__sansCarte()); await pause(300);

  if (parcours === 'client') {
    await legende('1', P.l[0]); await pause(3000);
    await vers('.demo-carte[data-dest="orly"]', Math.round(E.height * .3)); await pause(2000);
    await toucher('.demo-carte[data-dest="orly"]'); await pause(800);
    await legende('2', P.l[1]); await pause(1600);
    await taper('#clientNom', P.nom);
    await taper('#clientTel', P.tel);
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await toucher('#btnVoirPrix');
    await p.waitForSelector('.veh-carte', { timeout: 15000 }); await pause(1800);
    await p.locator('.veh-carte').first().click(); await pause(1000);
    await p.locator('#ecran-vehicules .veh-action .bouton').first().click(); await pause(1500);
    await p.evaluate(() => { if (document.querySelector('#blocContact [aria-pressed="true"]')) return; const x = [...document.querySelectorAll('#blocContact [data-contact]')].find(e => e.offsetParent); if (x) x.click(); });
    await vers('#btnConfirmer', Math.round(E.height * .5)); await pause(800);
    await p.click('#btnConfirmer'); await pause(1200);
    await defiler(0, 500);
    await legende('3', P.l[2]); await pause(2600);
    await suivant(); await pause(1400);
    await suivant(); await pause(2000);
    await vers('#bonChauffeur', Math.round(E.height * .3)); await pause(2600);
    await naviguer(BASE + '/demo/hotel/reception/');
    await legende('4', P.l[3]); await pause(2400);
    await vers('#recListe', 150); await pause(3200);
    await suivant(); await pause(1200);
    await toucher('.rec-vues [data-vue="passees"]'); await pause(2600);
  } else {
    await legende('1', P.l[0]); await pause(2400);
    await vers('#recListe', 150); await pause(2400);
    await defiler(0, 700); await pause(500);
    await legende('2', P.l[1]); await pause(1200);
    await toucher('#btnRecReserver'); await pause(1800);
    await legende('3', P.l[2]);
    await taper('#clientNom', P.nom);
    await taper('#chambre', P.chambre);
    await taper('#clientTel', P.tel);
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await toucher('#blocContact [data-contact="whatsapp"]'); await pause(800);
    await legende('4', P.l[3]);
    await p.waitForSelector('.veh-carte', { timeout: 15000 });
    await toucher('.veh-carte'); await pause(1200);
    await toucher('#btnVoirPrix'); await pause(800);
    await defiler(0, 400); await pause(2600);
    await legende('5', P.l[4]);
    await toucher('#btnBonVersReception'); await pause(2200);
    await vers('#recListe', 150); await pause(1800);
    await suivant(); await pause(500); await suivant(); await pause(1600);
    const actualiser = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Actualiser|Refresh/.test(x.textContent) && x.offsetParent); if (b) b.id = b.id || 'vActualiser'; return b ? '#' + b.id : null; });
    if (actualiser) { await toucher(actualiser); await pause(1500); }
    await vers('#recListe', 150); await pause(3000);
    await legende('6', P.l[5]);
    await defiler(0, 600);
    await taper('#recRecherche', P.chambre); await pause(3200);
  }
  await p.evaluate(() => window.__sansLegende());
  await carte(T.fin); await pause(3800);
  filme = false; await rafale;
  await ctx.close(); await nav.close();
  return { images, affiche, erreurs };
}

const nav = await chromium.launch();
const encodeur = await (await nav.newContext()).newPage();
const webp = async (png, largeur) => Buffer.from(await encodeur.evaluate(async ([png, largeur]) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
  const c = document.createElement('canvas'); c.width = largeur; c.height = Math.round(img.height * largeur / img.width);
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/webp', 0.82).split(',')[1];
}, [png.toString('base64'), largeur]), 'base64');

let echec = false;
for (const parcours of ['client', 'reception']) for (const ecran of ['telephone', 'ordinateur']) for (const langue of ['fr', 'en']) {
  const nom = `${parcours}-${ecran}-${langue}`;
  if (FILTRE && !nom.includes(FILTRE)) continue;
  const { images, affiche, erreurs } = await tourner(parcours, ecran, langue);
  if (erreurs.length || images.length < 100) { console.error(`${nom} : ${erreurs.join(' | ') || images.length + ' images seulement'}`); echec = true; continue; }
  const dossier = await mkdtemp(join(tmpdir(), 'ela-video-'));
  let liste = 'ffconcat version 1.0\n';
  for (let k = 0; k < images.length; k++) {
    const f = `i-${String(k).padStart(5, '0')}.jpg`;
    await writeFile(join(dossier, f), images[k].b);
    liste += `file ${f}\nduration ${(k + 1 < images.length ? Math.max(0.001, images[k + 1].t - images[k].t) : 0.5).toFixed(3)}\n`;
  }
  liste += `file i-${String(images.length - 1).padStart(5, '0')}.jpg\n`;
  await writeFile(join(dossier, 'images.ffconcat'), liste);
  const mp4 = join(SORTIE, `video-${nom}.mp4`);
  const ff = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(dossier, 'images.ffconcat'),
    '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '26',
    '-movflags', '+faststart', '-an', mp4], { stdio: 'inherit' });
  await rm(dossier, { recursive: true, force: true });
  if (ff.status !== 0) { console.error(`${nom} : ffmpeg a échoué`); echec = true; continue; }
  await writeFile(join(SORTIE, `affiche-${nom}.webp`), await webp(affiche, ecran === 'telephone' ? 780 : 1280));
  const duree = images.at(-1).t - images[0].t;
  console.log(`${mp4} : ${Math.round((await stat(mp4)).size / 1024)} Ko, ${duree.toFixed(1)} s, ${(images.length / duree).toFixed(1)} images/s`);
}
await nav.close(); serveur.close();
process.exit(echec ? 1 : 0);
