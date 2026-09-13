import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';

execFileSync('sh', ['construire.sh'], { stdio: 'inherit' });
const server = spawn('npx', ['http-server', '-p', '8099', '-s', 'site'], { stdio: 'ignore', shell: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(1800);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
const page = await context.newPage();
try {
  await page.goto('http://127.0.0.1:8099/paris/', { waitUntil: 'domcontentloaded' });

  if (await page.locator('#start').inputValue() !== '') throw new Error('Le départ public ne doit pas être prérempli avec easyHotel');
  if (!await page.getByText('Berline 180 € · Van 240 €').isVisible()) throw new Error('Tarifs 3 h absents du pack Essential');
  if (!await page.getByText('Estimation intelligente du parcours').isVisible()) throw new Error('Estimateur absent');
  if (!await page.locator('#paris-date').isVisible() || !await page.locator('#paris-time').isVisible()) throw new Error('Date/heure absentes');

  await page.getByRole('button', { name: 'Choisir ce circuit' }).first().click();
  await page.locator('#builder').waitFor({ state: 'visible' });
  const stops = await page.locator('#route .stop').count();
  if (stops < 4) throw new Error(`Paris Essential incomplet: ${stops} étapes`);

  const durationButtons = await page.locator('#durations [data-duration-hours]').allTextContents();
  const expected = ['3 h','4 h','5 h','6 h','7 h','8 h','9 h','10 h'];
  if (durationButtons.join('|') !== expected.join('|')) throw new Error(`Durées incorrectes: ${durationButtons.join(', ')}`);
  if (!await page.getByText('De la prise en charge jusqu’à l’arrivée finale, circulation et arrêts compris.').isVisible()) throw new Error('Règle de durée absente');

  await page.locator('#paris-date').fill('2026-09-14');
  await page.locator('#paris-time').fill('08:30');
  await page.waitForTimeout(50);
  const traffic = await page.locator('#est-traffic').textContent();
  if (!traffic?.includes('heure de pointe')) throw new Error(`Heure de pointe non détectée: ${traffic}`);
  const reco = await page.locator('#est-reco').textContent();
  if (!/^\d+ h$/.test(reco || '')) throw new Error(`Durée recommandée invalide: ${reco}`);
  if (!(await page.locator('#est-route').textContent())?.includes('Ordre conseillé')) throw new Error('Ordre conseillé absent');

  await page.getByRole('button', { name: 'Van' }).click();
  if (!(await page.locator('#est-price').textContent())?.includes('240 €')) throw new Error('Tarif Van 3 h incorrect');

  await page.getByRole('button', { name: '7 h' }).click();
  await page.locator('#start').fill('Hôtel Paris Centre');
  await page.locator('#plus').click();
  if (await page.locator('#pax').textContent() !== '3') throw new Error('Compteur passagers incorrect');

  let whatsapp = '';
  page.on('request', req => { if (req.url().startsWith('https://wa.me/')) whatsapp = req.url(); });
  await page.locator('#request').click();
  await sleep(300);
  const target = whatsapp || page.url();
  if (!target.startsWith('https://wa.me/')) throw new Error('La demande ne part pas vers WhatsApp');
  const decoded = decodeURIComponent(target);
  if (!decoded.includes('Durée choisie : 7 h')) throw new Error('La durée choisie n’est pas transmise');
  if (!decoded.includes('Véhicule : Van')) throw new Error('Le véhicule n’est pas transmis');
  if (!decoded.includes('Date : 2026-09-14') || !decoded.includes('Heure : 08:30')) throw new Error('Date/heure non transmises');
  if (!decoded.includes('circulation et arrêts compris')) throw new Error('La règle de durée n’est pas transmise');

  console.log('OK — Visiter Paris: tarifs, 3–10 h, estimation, trafic habituel, véhicule et demande WhatsApp cohérents');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
