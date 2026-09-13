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
  await page.getByRole('button', { name: 'Choisir ce circuit' }).first().click();
  await page.locator('#builder').waitFor({ state: 'visible' });
  const stops = await page.locator('#route .stop').count();
  if (stops < 4) throw new Error(`Paris Essential incomplet: ${stops} étapes`);

  const durationButtons = await page.locator('#durations [data-duration-hours]').allTextContents();
  const expected = ['3 h','4 h','5 h','6 h','7 h','8 h','9 h','10 h'];
  if (durationButtons.join('|') !== expected.join('|')) throw new Error(`Durées incorrectes: ${durationButtons.join(', ')}`);
  if (!await page.getByText('De la prise en charge jusqu’à l’arrivée finale, arrêts compris.').isVisible()) {
    throw new Error('Règle de comptage de la durée absente');
  }

  await page.getByRole('button', { name: "Optimiser l'itinéraire" }).click();
  await page.getByRole('button', { name: '7 h' }).click();
  await page.locator('#start').fill('easyHotel Aeroville');
  await page.locator('#plus').click();
  if (await page.locator('#pax').textContent() !== '3') throw new Error('Compteur passagers incorrect');

  let whatsapp = '';
  page.on('request', req => { if (req.url().startsWith('https://wa.me/')) whatsapp = req.url(); });
  await page.locator('#request').click();
  await sleep(300);
  const target = whatsapp || page.url();
  if (!target.startsWith('https://wa.me/')) throw new Error('La demande ne part pas vers WhatsApp');
  const decoded = decodeURIComponent(target);
  if (!decoded.includes('Durée totale : 7 h')) throw new Error('La durée choisie n’est pas transmise');
  if (!decoded.includes('prise en charge jusqu’à l’arrivée finale')) throw new Error('La règle de durée n’est pas transmise');

  console.log('OK — Visiter Paris: 3 à 10 h, parcours, passagers et demande WhatsApp cohérents');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
