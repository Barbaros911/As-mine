/* ELA Admin v2 — les deux gestes vers le client.
   Chargé après admin-v2.html, comme les autres modules.

   ACCUSER RÉCEPTION d'une demande, et DEMANDER UN AVIS après la course.

   ═══ CE NE SONT PAS DES ENVOIS AUTOMATIQUES, ET ILS NE PEUVENT PAS L'ÊTRE ═══
   Le site n'a aucun moyen d'envoyer un SMS tout seul. C'est WhatsApp qui
   s'ouvre, depuis le téléphone de Barbaros. Ne pas promettre l'inverse.
   Ce que le serveur garde, c'est la TRACE du geste : sur dix demandes reçues
   la nuit, on ne se souvient pas de qui a eu une réponse.

   ═══ CHAQUE GESTE N'A DE SENS QUE DANS UN ÉTAT ═══
   L'accusé sur une course EN ATTENTE seulement — une fois confirmée, c'est
   « Prévenir le client » qui parle, et deux messages coup sur coup diraient
   au client qu'on ne sait pas où on en est. L'avis sur une RÉALISÉE
   seulement — on ne demande pas à quelqu'un ce qu'il a pensé d'un trajet
   qu'il n'a pas encore fait.
   La règle est posée CÔTÉ SERVEUR ; ici on ne fait que ne pas proposer un
   bouton qui échouerait. Une garde d'écran n'est pas une frontière. */
(()=>{
'use strict';

async function rpc(name, body){
  return api(`/rest/v1/rpc/${name}`, {method:'POST', body:JSON.stringify(body||{})});
}

/* On accepte les formes que Barbaros saisit vraiment : « 06 12 34 56 78 »,
   « +33 6 … », « 0033 6 … ». Sans numéro utilisable, aucun bouton. */
function telWa(brut){
  let t = String(brut||'').replace(/[^\d+]/g, '');
  if(t.startsWith('+')) t = t.slice(1);
  else if(t.startsWith('00')) t = t.slice(2);
  else if(t.startsWith('0')) t = '33' + t.slice(1);
  return /^\d{10,15}$/.test(t) ? t : '';
}

const lienAvis = () => {
  const p = (state.params||[]).find(x => x.cle === 'lien_avis');
  return String((p && p.valeur && p.valeur.url) || '').trim();
};

/* ═══ LA DATE SUIT LA LANGUE DU MESSAGE, pas celle de l'espace exploitant —
   qui est toujours le français. « 09/20/2026 » à un client anglophone,
   « 20/09/2026 » à un francophone : le même jour, lu correctement des deux
   côtés. Une course ancienne sans « langue » retombe sur le français. */
function quand(bon){
  const r = (bon && bon.course) || {};
  const loc = (bon.langue || 'fr') === 'en' ? 'en-GB' : 'fr-FR';
  const d = new Date(String(r.date||'') + 'T' + String(r.heure||''));
  return isNaN(d.getTime())
    ? (r.date||'') + ' ' + (r.heure||'')
    : d.toLocaleDateString(loc) + ' '
      + d.toLocaleTimeString(loc, {hour:'2-digit', minute:'2-digit'});
}
const prenomDe = bon => String(((bon.client||{}).nom)||'').trim().split(/\s+/)[0];

/* QUATRE LIGNES, ET NI CHAUFFEUR NI VÉHICULE : on ne les connaît pas encore,
   et chez Elatransfer l'heure est ferme comme le prix. Promettre une voiture
   qu'on n'a pas placée est le meilleur moyen de laisser quelqu'un sur un
   trottoir. La phrase qui compte est la dernière. */
function messageAccuse(bon){
  const r = bon.course || {};
  const de = r.departPublic || r.depart || '';
  const vers = r.arriveePublic || r.arrivee || '';
  const p = prenomDe(bon);
  if((bon.langue || 'fr') === 'en'){
    return [(p ? 'Hello ' + p + ', ' : 'Hello, ')
      + "Elatransfer has received your request " + bon.ref + '.',
      de + ' → ' + vers, quand(bon),
      "We are checking a professional driver's availability and will come "
      + 'back to you shortly. Your booking becomes firm as soon as we confirm.'
    ].join('\n');
  }
  return [(p ? 'Bonjour ' + p + ', ' : 'Bonjour, ')
    + "Elatransfer a bien reçu votre demande " + bon.ref + '.',
    de + ' → ' + vers, quand(bon),
    "Nous vérifions la disponibilité d'un chauffeur professionnel et vous "
    + 'répondons très vite. Votre réservation sera ferme dès notre confirmation.'
  ].join('\n');
}

/* LE MESSAGE D'AVIS EST COURT et il se lit sur un écran verrouillé : le nom
   de l'entreprise, la raison, le lien. Un paragraphe de remerciements
   s'ouvre, se lit en diagonale et se ferme sans qu'on ait cliqué. */
function messageAvis(bon){
  const p = prenomDe(bon), lien = lienAvis();
  if((bon.langue || 'fr') === 'en'){
    return (p ? 'Hello ' + p + ', ' : 'Hello, ')
      + 'thank you for travelling with Elatransfer.\n'
      + 'If everything went well, a short review would help us a lot:\n' + lien;
  }
  return (p ? 'Bonjour ' + p + ', ' : 'Bonjour, ')
    + "merci d'avoir voyagé avec Elatransfer.\n"
    + "Si tout s'est bien passé, un avis nous aiderait beaucoup :\n" + lien;
}

/* ═══ WhatsApp S'OUVRE DANS LE GESTE DU CLIC, SANS AUCUN « await » AVANT ═══
   Safari iOS bloque une fenêtre ouverte après une attente. La marque, elle,
   part ensuite et peut échouer sans rien casser : le message est déjà
   parti, et c'est lui qui compte pour le client. */
function ouvrirEtMarquer(bon, geste, texte, apres){
  const tel = telWa((bon.client||{}).telephone);
  if(!tel) return false;
  window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(texte), '_blank');
  rpc('ela_marquer_geste_client', {p_ref: bon.ref, p_geste: geste})
    .then(() => { if(apres) apres(true); })
    /* ON NE MENT PAS SUR LA TRACE. Si le serveur refuse, le message est
       quand même parti — on le dit, plutôt que d'afficher « envoyé » sur une
       marque qui n'existe pas et qu'il faudra refaire. */
    .catch(() => { if(apres) apres(false); });
  return true;
}

/* ─────────────────────── les boutons, sur le bon ─────────────────────── */

function note(zone, texte, classe){
  let n = zone.querySelector('.geste-note');
  if(!n){ n = document.createElement('p'); n.className = 'geste-note'; zone.append(n); }
  n.textContent = texte || '';
  n.className = 'geste-note muted small' + (classe ? ' ' + classe : '');
}

const avant = openBooking;
openBooking = async function(ref){
  await avant(ref);
  const c = (state.courses||[]).find(z => z.ref === ref);
  const zone = document.getElementById('bookingActions');
  if(!c || !zone) return;
  const bon = Object.assign({}, c.bon || {}, {ref: c.ref});
  const statut = c.statut || 'attente';
  const tel = telWa((bon.client||{}).telephone);

  /* SANS NUMÉRO, AUCUN BOUTON — et on le DIT. Un bouton qui n'envoie rien
     ferait croire que le client est prévenu. */
  if(!tel){
    if(statut === 'attente' || statut === 'realisee')
      note(zone, "Aucun numéro utilisable pour ce client : ni accusé de réception, ni demande d'avis.");
    return;
  }

  if(statut === 'attente'){
    const b = document.createElement('button');
    b.className = 'btn alt'; b.id = 'btnAccuse';
    b.textContent = bon.accuse ? 'Accusé de réception envoyé — renvoyer'
                               : 'Accuser réception au client';
    b.onclick = () => {
      const ok = ouvrirEtMarquer(bon, 'accuse', messageAccuse(bon), reussi => {
        note(zone, reussi
          ? 'Accusé de réception envoyé.'
          : "Le message est parti, mais la trace n'a pas pu être enregistrée — à refaire.",
          reussi ? 'ok' : 'ko');
        if(reussi) load().then(render);
      });
      if(ok) b.textContent = 'Accusé de réception envoyé — renvoyer';
    };
    zone.append(b);
    note(zone, "Quatre lignes : la demande est bien reçue, et elle sera ferme dès la confirmation. "
             + "Ni chauffeur ni véhicule — on ne les connaît pas encore.");
  }

  if(statut === 'realisee'){
    const b = document.createElement('button');
    b.className = 'btn alt'; b.id = 'btnAvis';
    b.textContent = bon.avisDemande ? 'Avis demandé — relancer' : 'Demander un avis';
    b.onclick = () => {
      /* SANS LIEN, RIEN NE PART : le message se terminerait dans le vide. On
         emmène au champ plutôt que d'envoyer une phrase inachevée. */
      if(!lienAvis()){
        note(zone, "Aucun lien d'avis n'est enregistré — le message se terminerait dans le vide. "
                 + "Il se règle dans « Tarifs et réglages ».", 'ko');
        return;
      }
      const ok = ouvrirEtMarquer(bon, 'avis', messageAvis(bon), reussi => {
        note(zone, reussi
          ? 'Demande d’avis envoyée.'
          : "Le message est parti, mais la trace n'a pas pu être enregistrée — à refaire.",
          reussi ? 'ok' : 'ko');
        if(reussi) load().then(render);
      });
      if(ok) b.textContent = 'Avis demandé — relancer';
    };
    zone.append(b);
    if(!lienAvis())
      note(zone, "Aucun lien d'avis enregistré : la demande ne peut pas partir. "
               + "Il se règle dans « Tarifs et réglages ».", 'ko');
  }
};

/* ─────────────────────── le lien d'avis, en réglage ─────────────────── */

function ecrireLien(){
  const n = document.getElementById('avLien');
  if(n) n.value = lienAvis();
  const e = document.getElementById('avEtat');
  if(e){
    e.textContent = lienAvis() ? '' :
      "Sans lien, aucune demande d'avis ne peut partir.";
    e.className = 'muted small' + (lienAvis() ? '' : ' ko');
  }
}
async function enregistrerLien(){
  const n = document.getElementById('avLien');
  const url = n ? n.value.trim() : '';
  const e = document.getElementById('avEtat');
  /* ON VÉRIFIE QUE C'EST UNE ADRESSE, pas seulement qu'il y a du texte : un
     lien cassé envoyé à un client est pire qu'un lien absent — lui, au
     moins, ne se clique pas. */
  if(url && !/^https?:\/\/\S+$/i.test(url)){
    if(e){ e.textContent = "Ce n'est pas une adresse web (elle doit commencer par https://).";
           e.className = 'muted small ko'; }
    return;
  }
  try{
    await api('/rest/v1/parametres_commerciaux',
      {method:'POST', headers:{Prefer:'resolution=merge-duplicates'},
       body: JSON.stringify({cle:'lien_avis', valeur:{url:url}, actif:true})});
  }catch(err){
    if(e){ e.textContent = "L'enregistrement a échoué : " + (err && err.message || 'serveur muet');
           e.className = 'muted small ko'; }
    return;
  }
  await load(); ecrireLien();
  if(e && url){ e.textContent = "Lien d'avis enregistré."; e.className = 'muted small ok'; }
}

function brancher(){
  const s = document.getElementById('btnAvLien');
  if(s) s.addEventListener('click', enregistrerLien);
  /* ON ÉCOUTE L'ÉCRAN, PAS LE BOUTON — même raison que dans les factures,
     le registre et l'affiche. « Tarifs et réglages » a quitté la barre du
     bas : un gestionnaire posé sur « #nav » ne se déclenche plus, et le
     lien d'avis ne s'écrit jamais dans son champ. Sans lien, aucune demande
     d'avis ne part — et rien à l'écran ne le dit. */
  document.addEventListener('ela:ecran', ev => {
    if(ev.detail === 'pricing') ecrireLien();
  });
}

brancher();
})();
