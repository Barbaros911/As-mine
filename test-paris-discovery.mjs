import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const server = spawn('npx', ['http-server', '-p', '8099', '-s', '.'], { stdio: 'ignore', shell: true });
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

  await page.getByRole('button', { name: "Optimiser l'itinéraire" }).click();
  await page.getByRole('button', { name: '5 h' }).click();
  await page.locator('#start').fill('easyHotel Aeroville');
  await page.locator('#plus').click();
  if (await page.locator('#pax').textContent() !== '3') throw new Error('Compteur passagers incorrect');

  let whatsapp = '';
  page.on('request', req => { if (req.url().startsWith('https://wa.me/')) whatsapp = req.url(); });
  await page.locator('#request').click();
  await sleep(300);
  if (!whatsapp && !page.url().startsWith('https://wa.me/')) throw new Error('La demande ne part pas vers WhatsApp');

  console.log('OK — Visiter Paris: sélection, optimisation, durée, passagers et demande WhatsApp');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
