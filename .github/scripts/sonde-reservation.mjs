/* =====================================================================
   SONDE-RESERVATION.MJS — une réservation de bout en bout, rien d'enregistré
   ---------------------------------------------------------------------
   20 octobre 2026, mission de finalisation. Le monitoring ouvrait les
   pages ; il ne prouvait jamais qu'on peut RÉSERVER. Cette sonde remplit le
   formulaire du site servi, obtient un prix, choisit une gamme, confirme —
   et la demande part au vrai serveur marquée « sonde », référence
   « SONDE- » : deposer-course fait tout le chemin (champs, base lue, quota
   écrit, lien et prix contrôlés) puis s'arrête avant d'écrire la course.
   Ni ligne, ni Telegram, ni notification.

   TROIS VERROUS, PARCE QU'UNE SONDE QUI ENREGISTRERAIT UNE FAUSSE COURSE
   RÉVEILLERAIT BARBAROS À 3 H DU MATIN :
   1. toute écriture de la page vers le serveur autre que deposer-course est
      COUPÉE (mesure, erreurs, suivi, abonnement) ; si la page changeait de
      porte un jour, la sonde tomberait — elle n'enregistrerait pas ;
   2. la référence devient « SONDE-… » : une version de deposer-course qui
      ne connaîtrait pas la sonde la REFUSE (format « ELA- » exigé) ;
   3. aucun service worker (il pourrait envoyer la requête hors de la route).

   Départ et arrivée viennent de la liste des aéroports que la page porte
   elle-même : la sonde ne dépend pas de la Base Adresse Nationale. Le prix
   passe par le calculateur d'itinéraire réel, et tombe sur la ligne droite
   s'il est muet : il y a toujours un prix.

   « envoyer », « lire » et « preparer » n'existent que pour l'épreuve
   (test-monitoring-sonde.mjs, hors ligne) : ils remplacent le réseau,
   jamais la logique qui l'entoure.
   ===================================================================== */
export async function sonderReservation({ navigateur, base, ok, ko, envoyer = null, lire = null, preparer = null }) {
  const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR",
    timezoneId: "Europe/Paris", serviceWorkers: "block" });
  await ctx.addInitScript(() => { window.open = () => null; });
  if (preparer) await preparer(ctx);
  const p = await ctx.newPage();
  const erreurs = [];
  p.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0]));
  /* « envoyee » dit qu'une demande a QUITTÉ la page : si le serveur ne
     répond pas à temps, on le dit ainsi — pas « rien n'est parti ».
     Mesuré le 20/10/2026, 1 min après un déploiement des fonctions : le
     premier passage lisait « aucune demande n'est partie » pendant que
     la demande attendait une fonction encore froide. */
  const etat = { depot: null, envoyee: false, coupees: [] };
  await ctx.route(/supabase\.co/i, async (route) => {
    const req = route.request(), m = req.method();
    if (m === "GET" || m === "HEAD" || m === "OPTIONS") return lire ? lire(route) : route.continue();
    if (!/\/functions\/v1\/deposer-course(\?|$)/.test(req.url())) { etat.coupees.push(req.url()); return route.abort(); }
    let corps = null;
    try { corps = JSON.parse(req.postData() || "null"); } catch { corps = null; }
    if (!corps || !corps.bon || typeof corps.bon.ref !== "string" || !/^ELA-/.test(corps.bon.ref)) {
      etat.depot = { status: 0, raison: "demande illisible" };
      return route.abort();
    }
    corps.sonde = true;
    corps.bon.ref = corps.bon.ref.replace(/^ELA-/, "SONDE-");
    etat.envoyee = true;
    try {
      if (envoyer) {
        const r = await envoyer(corps);
        etat.depot = { status: r.status, corps: r.corps };
        return route.fulfill({ status: r.status, contentType: "application/json", body: JSON.stringify(r.corps) });
      }
      const rep = await route.fetch({ postData: JSON.stringify(corps) });
      let j = null; try { j = await rep.json(); } catch { j = null; }
      etat.depot = { status: rep.status(), corps: j };
      return route.fulfill({ response: rep });
    } catch (e) {
      etat.depot = { status: 0, raison: e.message };
      return route.abort();
    }
  });
  try {
    await p.goto(base, { waitUntil: "domcontentloaded", timeout: 30000 });
    await p.waitForTimeout(1500);
    const choisir = async (champ, texte, option) => {
      await p.fill("#" + champ, texte);
      await p.locator("#" + champ + "List [role=option]", { hasText: option }).first().click({ timeout: 8000 });
      await p.waitForTimeout(300);
    };
    await choisir("depart", "Orly", "Orly 4");
    await choisir("arrivee", "Roissy", "Terminal 2E");
    await p.fill("#date", new Date(Date.now() + 9 * 864e5).toLocaleString("sv-SE", { timeZone: "Europe/Paris" }).slice(0, 10));
    await p.fill("#heure", "10:00");
    await p.locator("#btnVoirPrix").click();
    await p.waitForFunction(() => document.querySelector(".ecran.actif")?.id === "ecran-vehicules"
      && [...document.querySelectorAll(".veh-carte")].some((c) => /\d\s?€|€\s?\d/.test(c.innerText)), null, { timeout: 30000 });
    ok("le moteur calcule un prix (Orly 4 → Terminal 2E)");
    await p.locator(".veh-carte").first().click();
    await p.locator("#btnContinuer").click();
    await p.waitForTimeout(500);
    await p.fill("#clientNom", "Sonde Monitoring");
    await p.fill("#clientTel", "06 00 00 00 00");
    await p.evaluate(() => { const b = [...document.querySelectorAll("#blocContact [data-contact]")].find((e) => e.offsetParent); if (b) b.click(); });
    await p.locator("#btnConfirmer").click();
    /* On attend la RÉPONSE du serveur (jusqu'à 45 s : une fonction qui vient
       d'être déployée met quelques secondes à se réveiller), pas seulement
       l'écran du bon. */
    const limite = Date.now() + 45000;
    while (!etat.depot && Date.now() < limite) await p.waitForTimeout(500);
    await p.waitForFunction(() => document.querySelector(".ecran.actif")?.id === "ecran-bon", null, { timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(800);
    const d = etat.depot;
    if (!d && !etat.envoyee) ko("aucune demande n'est partie au serveur — « Confirmer » ne dépose plus rien");
    else if (!d) ko("la demande est partie, le serveur n'a pas répondu en 45 s — fonction deposer-course muette ou trop lente");
    else if (d.status === 200 && d.corps && d.corps.sonde === true) ok("le serveur reçoit la demande, la contrôle de bout en bout (base, quota, prix) et répond — rien n'est enregistré");
    else if (d.status === 201) ko(`ALERTE : la sonde a été ENREGISTRÉE comme une vraie course (201, ${d.corps && d.corps.ref || "SONDE-…"}) — deposer-course ne connaît plus la sonde ; supprimer cette course dans l'admin`);
    else if (d.status === 400) ko("le serveur refuse la sonde (400) — deposer-course n'est pas à jour, ou une demande du site est devenue invalide");
    else ko(`le dépôt répond ${d.status || "rien"}${d.raison ? " (" + d.raison + ")" : ""} — on ne peut plus réserver`);
    const ecran = await p.evaluate(() => document.querySelector(".ecran.actif")?.id).catch(() => "");
    if (d && d.status === 200) (ecran === "ecran-bon" ? ok : ko)(ecran === "ecran-bon" ? "le client voit son bon après « Confirmer »" : `après « Confirmer », la page reste sur ${ecran || "?"} au lieu du bon`);
    if (erreurs.length) ko(`${erreurs.length} erreur(s) JavaScript pendant la réservation : ${erreurs[0]}`);
    else ok("aucune erreur JavaScript pendant la réservation");
  } catch (e) {
    ko(`la réservation de bout en bout ne va pas au bout : ${e.message.split("\n")[0]}`);
    etat.erreur = e.message.split("\n")[0];
  }
  await ctx.close();
  return etat;
}
