/* =====================================================================
   COUPE-CIRCUIT RÉSEAU POUR LES TESTS
   ---------------------------------------------------------------------
   Les huit suites ouvrent le site pour de vrai. Le site, lui, appelle des
   serveurs extérieurs : les polices Google, Leaflet sur unpkg, les tuiles
   de carte, la recherche d'adresse, le calcul d'itinéraire.

   Quand ces serveurs ne répondent pas — pas de réseau, réseau filtré,
   panne chez eux — le navigateur n'échoue pas tout de suite : il attend.
   Trente secondes par appel, plusieurs appels par page. Les suites
   passaient alors de deux minutes à plus de dix, et finissaient en
   dépassement de délai sans rien tester du tout.

   Ce module coupe net : tout ce qui ne vient pas du serveur local échoue
   immédiatement. Les tests deviennent rapides, reproductibles, et ils
   vérifient au passage quelque chose d'utile — que le site reste
   utilisable quand ses dépendances extérieures tombent. C'est le cas
   réel d'un client dans un parking d'aéroport.

   Usage, juste après le lancement du navigateur :

       import { couperLeReseau } from './test-hors-ligne.mjs';
       const browser = await chromium.launch();
       couperLeReseau(browser);
   ===================================================================== */

/* Seul le serveur de test est joignable. Tout le reste est considéré
   comme extérieur, y compris les liens WhatsApp. */
function estLocal(url) {
  try {
    const h = new URL(url).hostname;
    return h === '127.0.0.1' || h === 'localhost' || h === '::1';
  } catch (e) {
    return true; // data:, blob:, about: — on laisse passer
  }
}

async function equiper(page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('data:') || url.startsWith('blob:') || estLocal(url)) {
      return route.continue();
    }
    // « failed » plutôt qu'un délai : l'appel rejette tout de suite et le
    // repli prévu dans le site prend la main.
    return route.abort('failed');
  });
}

/* =====================================================================
   COUPER AUSSI LE SERVEUR
   ---------------------------------------------------------------------
   Depuis que le site porte de vrais identifiants Supabase, le parcours du
   client change : sa demande part toute seule et WhatsApp ne s'ouvre plus.
   C'est voulu — mais deux suites éprouvent précisément le circuit
   WhatsApp, qui reste le REPLI quand le serveur est absent ou muet. Ce
   repli doit continuer de marcher : c'est lui qui sauve la course le jour
   où Supabase tombe.
   On efface donc les identifiants au vol pour ces suites-là. Le fichier
   du dépôt n'est jamais modifié.
   ===================================================================== */
export async function sansServeur(page, base = 'http://127.0.0.1:8099') {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url === base + '/index.html' || url === base + '/') {
      const res = await route.fetch();
      const html = (await res.text())
        .replace(/const SUPABASE_URL = "[^"]*";/, 'const SUPABASE_URL = "";')
        .replace(/const SUPABASE_CLE = "[^"]*";/, 'const SUPABASE_CLE = "";');
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    }
    if (url.startsWith('data:') || url.startsWith('blob:') || estLocal(url)) {
      return route.continue();
    }
    return route.abort('failed');
  });
}

/* On enveloppe newPage et newContext plutôt que de modifier chaque suite :
   les pages créées plus tard dans un test sont équipées elles aussi. */
export function couperLeReseau(browser, options = {}) {
  const sansNuage = options.sansServeur === true;
  const base = options.base || 'http://127.0.0.1:8099';
  if (sansNuage) {
    const pageOrigine0 = browser.newPage.bind(browser);
    browser.newPage = async (...args) => {
      const page = await pageOrigine0(...args);
      await sansServeur(page, base);
      return page;
    };
    const ctxOrigine0 = browser.newContext.bind(browser);
    browser.newContext = async (...args) => {
      const ctx = await ctxOrigine0(...args);
      const npOrigine = ctx.newPage.bind(ctx);
      ctx.newPage = async (...a) => {
        const page = await npOrigine(...a);
        await sansServeur(page, base);
        return page;
      };
      return ctx;
    };
    return browser;
  }
  return couperLeReseauSeul(browser);
}

function couperLeReseauSeul(browser) {
  const pageOrigine = browser.newPage.bind(browser);
  browser.newPage = async (...args) => {
    const page = await pageOrigine(...args);
    await equiper(page);
    return page;
  };

  const ctxOrigine = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const ctx = await ctxOrigine(...args);
    await ctx.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith('data:') || url.startsWith('blob:') || estLocal(url)) {
        return route.continue();
      }
      return route.abort('failed');
    });
    return ctx;
  };

  return browser;
}
