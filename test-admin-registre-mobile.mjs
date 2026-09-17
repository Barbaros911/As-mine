import { readFile, writeFile } from 'node:fs/promises';

// Le scénario historique clique directement l’onglet Registre. Depuis #165,
// la navigation mobile est un vrai tiroir fermé : on l’ouvre comme le ferait
// l’utilisateur avant de cliquer l’onglet. Le fichier métier n’est pas modifié.
const sourcePath = 'test-admin-registre.mjs';
const tempPath = '.test-admin-registre-mobile-ci.mjs';
const source = await readFile(sourcePath, 'utf8');
const ancien = `await p.click('[data-tab="registre"]');`;
const nouveau = `if (await p.locator('.mobile-menu').count()) {\n  await p.click('.mobile-menu');\n  await p.waitForFunction(() => document.querySelector('#nav')?.classList.contains('mobile-open'));\n}\nawait p.click('[data-tab="registre"]');`;
if (!source.includes(ancien)) throw new Error('Point de clic Registre introuvable : test à revoir explicitement.');
await writeFile(tempPath, source.replace(ancien, nouveau), 'utf8');
await import('./' + tempPath);
