/* =====================================================================
   TEST-NOUVEAU-SUPPRESSION.MJS — effacer une course pour de bon
   ---------------------------------------------------------------------
   Septembre 2026, à sa demande : « supprime les demandes de test ». Il
   n'existait aucun moyen d'effacer une course — « Refuser » la fait passer
   au gris, elle reste dans la liste.

   LE CONTRÔLE QUI COMPTE LE PLUS EST CELUI DU REFUS DU SERVEUR. Effacer
   l'appareil quand le serveur a dit non ferait croire le ménage fait, et
   la course reparaîtrait quarante-cinq secondes plus tard par la lecture
   automatique — « fusionner » recopie ici toute course du serveur absente
   de l'appareil. C'est la panne la plus déroutante qui soit : rien
   n'échoue, la course ressuscite. Un contrôle l'éprouve en faisant refuser
   le serveur, et il tombe si l'ordre des deux effacements s'inverse.

   SUPPRIMER N'EST PAS REFUSER, et deux contrôles tiennent la distinction :
   « Refuser » est une RÉPONSE à une vraie course qu'on n'a pas pu assurer,
   elle reste au registre ; « Supprimer » efface un essai.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-suppression.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

const course = (ref, statut) => ({
  ref, statut, cree:new Date().toISOString(),
  course:{ depart:"Place Vendôme, 75001 Paris", arrivee:"Argenteuil, 95100 Argenteuil",
           date:"2026-09-20", heure:"10:00", vehicule:"Berline", vehiculeCle:"berline",
           passagers:"2 passagers · 1 bagage", vol:"" },
  client:{ nom:"Jean Martin", telephone:"06 12 34 56 78" },
  prix:{ total:70, ht:63.64, tva:6.36 }
});

const SESSION = { access_token:"jeton-de-test", refresh_token:"refr", expires_in:3600 };

/* Chaque scénario part d'un contexte NEUF : le registre est un état
   partagé, et une suppression réussie dans un bloc fausserait le suivant.
   Même leçon que « addInitScript se rejoue à chaque chargement ». */
async function espace({ session, reponseSuppr }){
  const c = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
  await c.addInitScript(([s,liste])=>{
    localStorage.setItem('ela_bookings', JSON.stringify(liste));
    if(s) localStorage.setItem('ela_nuage_session', JSON.stringify(s));
  }, [session, [course("ELA-26-09-0001","attente"), course("ELA-26-09-0002","attente")]]);
  const pg = await c.newPage();
  pg.on('pageerror',e=>errs.push(e.message));
  const vus = [];
  await pg.route('**yyhzutnuhuytokarynaw.supabase.co/**', route => {
    const req = route.request();
    vus.push({ methode:req.method(), url:req.url() });
    if(req.method() === 'DELETE'){
      /* Un DELETE qui n'efface RIEN rend « tout va bien » : c'est ce que
         fait PostgREST quand la regle de securite ecarte la ligne. On rend
         donc un CORPS, vide ou non, selon le scenario — c'est lui qui
         distingue un vrai effacement d'un succes en trompe-l'oeil. */
      if(reponseSuppr === 204) return route.fulfill({ status:200,
        contentType:'application/json', body: JSON.stringify([{ref:'x'}]) });
      if(reponseSuppr === 'vide' || reponseSuppr === 'absente')
        return route.fulfill({ status:200, contentType:'application/json', body:'[]' });
      return route.fulfill({ status: reponseSuppr, body:'' });
    }
    /* LA LECTURE DE CONTRÔLE, celle qui distingue « la règle a écarté la
       ligne » de « la ligne n'existe pas ». Elle vise une référence
       précise ; la lecture générale, elle, rend une liste VIDE, sans quoi
       « fusionner » remettrait les courses et masquerait ce qu'on mesure. */
    if(/ref=eq\./.test(req.url()) && /select=ref/.test(req.url())){
      return route.fulfill({ status:200, contentType:'application/json',
        body: reponseSuppr === 'vide' ? JSON.stringify([{ref:'x'}]) : '[]' });
    }
    return route.fulfill({ status:200, contentType:'application/json', body:'[]' });
  });
  await pg.route('**://api.openrouteservice.org/**', r => r.abort());
  await pg.goto('http://127.0.0.1:8099/index.html?exploitant=1',{waitUntil:'domcontentloaded'});
  await pg.waitForTimeout(400);
  await pg.fill('#codeExploitant','12345678');
  await pg.locator('#btnDeverrouiller').click(); await pg.waitForTimeout(500);
  return { c, pg, vus };
}

const refs = pg => pg.evaluate(()=>
  JSON.parse(localStorage.getItem('ela_bookings')||'[]').map(c=>c.ref));

// ═══ 1. UN SEUL APPUI N'EFFACE RIEN ═══
{
  const { c, pg } = await espace({ session:SESSION, reponseSuppr:204 });
  await pg.locator('.demande').first().click(); await pg.waitForTimeout(300);
  const btn = pg.locator('#btnSupprimerCourse');
  check('le bon de l\'exploitant porte un bouton de suppression', await btn.isVisible());
  const avant = await btn.textContent();
  await btn.click(); await pg.waitForTimeout(200);
  /* UN GESTE IRRÉVERSIBLE NE PART PAS SUR UN POUCE QUI GLISSE. */
  check('le premier appui n\'efface rien', (await refs(pg)).length === 2,
    'reste ' + (await refs(pg)).length);
  check('le premier appui CHANGE le libellé du bouton',
    (await btn.textContent()) !== avant,
    'toujours « ' + avant + ' »');
  check('et il dit ce que la suppression va faire',
    await pg.locator('#supprEtat').isVisible());
  /* Le bon reste ouvert : on n'a rien décidé. */
  check('le bon reste ouvert après le premier appui',
    await pg.locator('#btnSupprimerCourse').isVisible());
  await c.close();
}

// ═══ 2. LE SERVEUR REFUSE : RIEN N'EST EFFACÉ, ET ON LE DIT ═══
/* C'EST LE CONTRÔLE QUI COMPTE LE PLUS. Effacer localement sur un refus
   du serveur ferait croire le ménage fait, et la course reviendrait seule
   à la lecture suivante. Il tombe si l'on efface l'appareil d'abord. */
{
  const { c, pg } = await espace({ session:SESSION, reponseSuppr:403 });
  await pg.locator('.demande').first().click(); await pg.waitForTimeout(300);
  await pg.locator('#btnSupprimerCourse').click(); await pg.waitForTimeout(150);
  await pg.locator('#btnSupprimerCourse').click(); await pg.waitForTimeout(700);
  const apres = await refs(pg);
  check('un refus du serveur n\'efface RIEN sur l\'appareil', apres.length === 2,
    'reste ' + apres.length);
  check('et il le dit, plutôt que de faire croire le ménage fait',
    (await pg.locator('#supprEtat').textContent()).toLowerCase().includes('refus'));
  check('le bouton redevient utilisable après un refus',
    !(await pg.locator('#btnSupprimerCourse').isDisabled()));
  await c.close();
}

// ═══ 3. SANS SERVEUR, ON NE SUPPRIME PAS — ET ON DIT POURQUOI ═══
/* Effacer l'appareil seul serait un mensonge à retardement : la course
   revient à la première connexion, recopiée depuis le serveur. */
{
  const { c, pg, vus } = await espace({ session:null, reponseSuppr:204 });
  await pg.locator('.demande').first().click(); await pg.waitForTimeout(300);
  await pg.locator('#btnSupprimerCourse').click(); await pg.waitForTimeout(150);
  await pg.locator('#btnSupprimerCourse').click(); await pg.waitForTimeout(500);
  check('sans session, la course n\'est pas effacée de l\'appareil',
    (await refs(pg)).length === 2);
  check('sans session, aucun appel de suppression ne part',
    vus.filter(v=>v.methode==='DELETE').length === 0);
  check('sans session, on explique qu\'il faut se connecter d\'abord',
    (await pg.locator('#supprEtat').textContent()).toLowerCase().includes('connect'));
  await c.close();
}

// ═══ 4. LE CHEMIN NORMAL — SERVEUR PUIS APPAREIL, LA BONNE COURSE ═══
{
  const { c, pg, vus } = await espace({ session:SESSION, reponseSuppr:204 });
  await pg.locator('.demande').first().click(); await pg.waitForTimeout(300);
  const ref = (await pg.locator('#bbRef').textContent()).trim();
  await pg.locator('#btnSupprimerCourse').click(); await pg.waitForTimeout(150);
  await pg.locator('#btnSupprimerCourse').click(); await pg.waitForTimeout(800);
  const apres = await refs(pg);
  check('la course est bien partie de l\'appareil', apres.length === 1 && !apres.includes(ref),
    apres.join(','));
  check('l\'AUTRE course est intacte', apres.length === 1);
  const dels = vus.filter(v=>v.methode==='DELETE');
  check('un appel DELETE est bien parti au serveur', dels.length === 1,
    dels.length + ' appel(s)');
  /* ON VISE LA COURSE PAR SA RÉFÉRENCE. Sans le filtre, PostgREST
     effacerait TOUTE la table — c'est la faute la plus coûteuse possible
     sur un DELETE, et elle ne se voit qu'une fois les données parties. */
  check('l\'appel vise cette course précise, par sa référence',
    dels.length === 1 && dels[0].url.includes('ref=eq.' + ref),
    dels.length ? dels[0].url : '');
  check('on revient au tableau de bord après la suppression',
    await pg.locator('#ecran-bord').isVisible());
  check('et la course a disparu de la liste affichée',
    (await pg.locator('.demande').count()) === 1);
  await c.close();
}

// ═══ 5. SUPPRIMER N'EST PAS REFUSER ═══
/* « Refuser » est une RÉPONSE : la course passe au gris et reste au
   registre, parce qu'elle a existé. Les confondre ferait disparaître des
   courses dont on a besoin comme trace. */
{
  const { c, pg, vus } = await espace({ session:SESSION, reponseSuppr:204 });
  await pg.locator('.demande').first().click(); await pg.waitForTimeout(300);
  await pg.locator('#btnRefuser').click(); await pg.waitForTimeout(500);
  const apres = await refs(pg);
  check('« Refuser » garde la course au registre', apres.length === 2);
  check('« Refuser » n\'envoie aucune suppression au serveur',
    vus.filter(v=>v.methode==='DELETE').length === 0);
  const statuts = await pg.evaluate(()=>
    JSON.parse(localStorage.getItem('ela_bookings')||'[]').map(c=>c.statut));
  check('« Refuser » change seulement l\'état', statuts.includes('refusee'));
  await c.close();
}

// ═══ 6. L'ARMEMENT NE SUIT PAS D'UNE COURSE À L'AUTRE ═══
/* Armé sur une course puis quitté, le bouton s'appliquerait à la suivante
   au PREMIER appui — on effacerait une course qu'on venait d'ouvrir. */
{
  const { c, pg } = await espace({ session:SESSION, reponseSuppr:204 });
  await pg.locator('.demande').first().click(); await pg.waitForTimeout(300);
  await pg.locator('#btnSupprimerCourse').click(); await pg.waitForTimeout(150);
  await pg.locator('#btnRetourBord').click(); await pg.waitForTimeout(300);
  await pg.locator('.demande').nth(1).click(); await pg.waitForTimeout(300);
  check('le bouton repart désarmé sur une autre course',
    (await pg.locator('#btnSupprimerCourse').textContent()).trim() === 'Supprimer cette course');
  await pg.locator('#btnSupprimerCourse').click(); await pg.waitForTimeout(500);
  check('et le premier appui sur la nouvelle course n\'efface toujours rien',
    (await refs(pg)).length === 2);
  await c.close();
}

// ═══ 7. UN « TOUT VA BIEN » QUI N'A RIEN EFFACÉ N'EST PAS UN SUCCÈS ═══
/* LE DÉFAUT QUE BARBAROS A TROUVÉ LE PREMIER SOIR : « je supprime une
   course, je rafraîchis, elle revient ». PostgREST rend 204 quand la règle
   de sécurité écarte la ligne — zéro effacée, aucune erreur. Le bouton
   félicitait, et la lecture suivante ramenait la course.
   On exige donc la LISTE de ce qui a été retiré : un tableau vide est un
   échec. Et surtout on n'efface RIEN sur l'appareil dans ce cas — sinon
   on recrée exactement la panne, avec une course qui ressuscite. */
{
  const { c, pg } = await espace({ session:SESSION, reponseSuppr:'vide' });
  await pg.locator('.demande').first().click(); await pg.waitForTimeout(300);
  await pg.locator('#btnSupprimerCourse').click(); await pg.waitForTimeout(150);
  await pg.locator('#btnSupprimerCourse').click(); await pg.waitForTimeout(700);
  check("un 2xx qui n'efface aucune ligne n'est PAS un succès",
    (await refs(pg)).length === 2, 'reste ' + (await refs(pg)).length);
  check("et l'écran le dit au lieu de féliciter",
    (await pg.locator('#supprEtat').textContent()).toLowerCase().includes('refus'));
  await c.close();
}

// ═══ 8. UNE COURSE JAMAIS DÉPOSÉE S'EFFACE QUAND MÊME ═══
/* MESURÉ CHEZ BARBAROS : son tableau de bord portait 11 courses, le
   serveur en contenait 10. Une partie de ses courses n'a jamais été
   déposée — et sur celles-là « rien effacé » est la vérité, pas un refus.
   Lui répondre « le serveur a refusé » l'empêchait de faire le ménage
   sans lui dire pourquoi.
   ET C'EST SÛ R : si le serveur ne nous montre pas la ligne, « lister() »
   ne nous la montrera pas non plus — elle ne peut donc pas revenir. */
{
  const { c, pg } = await espace({ session:SESSION, reponseSuppr:'absente' });
  await pg.locator('.demande').first().click(); await pg.waitForTimeout(300);
  await pg.locator('#btnSupprimerCourse').click(); await pg.waitForTimeout(150);
  await pg.locator('#btnSupprimerCourse').click(); await pg.waitForTimeout(900);
  check("une course absente du serveur s'efface de l'appareil",
    (await refs(pg)).length === 1, 'reste ' + (await refs(pg)).length);
  check('et on revient au tableau de bord, sans message de refus',
    await pg.locator('#ecran-bord').isVisible()
    && await pg.locator('#supprEtat').isHidden());
  await c.close();
}

// ═══ 9. LE SERVEUR DE DONNÉES NE SE MET JAMAIS EN CACHE ═══
/* LA VRAIE CAUSE DE LA COURSE QUI REVENAIT. « lister() » appelle toujours
   la MÊME adresse : elle tombait dans la branche « cache d'abord » du
   service worker, et toutes les lectures resservaient la première liste.
   La course effacée y figurait encore — et pire, les NOUVELLES demandes
   des clients n'y figuraient jamais.
   Le contrôle lit la SOURCE : le service worker ne s'installe qu'en https
   et reste injoignable depuis le serveur de test. */
{
  const fs = await import('node:fs');
  const sw = fs.readFileSync('sw.js','utf8');
  check('le service worker écarte tout le domaine supabase',
    /supabase\.co/.test(sw));
  check("et il l'écarte AVANT de servir quoi que ce soit depuis le cache",
    /if\(NO_CACHE_HOSTS\.includes\(url\.hostname\)\|\|serveurDeDonnees\(url\)/.test(sw));
  /* Une version inchangée, c'est un téléphone qui garde l'ancien service
     worker : la correction existe et ne sert à personne. */
  check('la version du cache a été incrémentée',
    /elatransfer-v(8[2-9]|9\d|\d{3})/.test(sw),
    (sw.match(/elatransfer-v\d+/)||['?'])[0]);
}

// ═══ 10. LA RÈGLE SERVEUR EXISTE DANS LE DÉPÔT ═══
/* Sans policy, PostgreSQL refuse la suppression — y compris à
   l'exploitant — et le bouton ne ferait qu'annoncer un refus. */
{
  const fs = await import('node:fs');
  const sql = fs.readFileSync('supabase/migrations/20260915_supprimer_course.sql','utf8');
  check('une policy de suppression est écrite pour « courses »',
    /create policy[\s\S]*on public\.courses[\s\S]*for delete/i.test(sql));
  check('elle ne vise que les comptes authentifiés, jamais « anon »',
    /to authenticated/i.test(sql) && !/to anon/i.test(sql));
  check('et elle exige en plus d\'être exploitant',
    /est_exploitant/.test(sql));
}

check('aucune erreur JavaScript', errs.length===0, errs.join(' | '));
await b.close();
console.log('=== RÉUSSIS ('+ok.length+') ===');
if(ko.length){ console.log('=== ÉCHECS ('+ko.length+') ==='); ko.forEach(x=>console.log(' ✗ '+x)); }
process.exit(ko.length?1:0);
