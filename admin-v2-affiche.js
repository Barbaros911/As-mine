/* ELA Admin v2 — l'affiche à poser sur un comptoir d'hôtel.
   Chargé après admin-v2.html, comme les autres modules.

   ═══ L'ENCODEUR N'EST PAS ICI, ET C'EST TOUT L'INTÉRÊT ═══
   Il vit dans « qr-affiche.js », partagé avec le site client. Le recopier
   aurait été la faute que ce dépôt reproche partout — et ici la PIRE,
   parce qu'un encodeur QR NE SE VÉRIFIE PAS TOUT SEUL : le premier jet de
   celui-ci passait TOUS les contrôles internes et n'était lisible par
   AUCUN téléphone. Deux copies, dont une qui dérive, ce sont des affiches
   imprimées que personne ne peut scanner — et on ne l'apprend qu'au
   comptoir, des semaines plus tard.

   ═══ LE DANGER PROPRE À CET ESPACE : LA BASE DU LIEN ═══
   Le site client vit à la racine, Admin v2 sur « /admin-v2.html ». Prendre
   « location.pathname » tel quel, comme le fait la page cliente, produirait
   « …/admin-v2.html?h=Ibis » : le client scannerait l'affiche et tomberait
   sur le BACK-OFFICE. C'est pour ça que « lienHotel » exige sa base au lieu
   de la deviner. */
(()=>{
'use strict';

/* LA BASE EST LE DOSSIER, jamais le fichier courant. On retire le dernier
   segment de l'adresse : « /admin-v2.html » → « / », « /sous/admin-v2.html »
   → « /sous/ ». Un test lit le lien imprimé et vérifie qu'il ne porte aucune
   trace d'« admin ». */
function baseClient(){
  return location.origin + location.pathname.replace(/[^/]*$/, '');
}

const $$ = id => document.getElementById(id);

function etat(texte, classe){
  const n = $$('affEtat');
  if(!n) return;
  n.textContent = texte || '';
  n.className = 'muted small intake-etat' + (classe ? ' ' + classe : '');
}

/* LA LISTE VIENT DU SERVEUR, comme partout ailleurs dans cet espace : deux
   listes d'hôtels finiraient par diverger, et c'est celle qu'on oublie qui
   imprimerait une affiche au nom d'un partenaire qui n'en est plus un. */
function remplirPartenaires(){
  const s = $$('affPartenaire');
  if(!s) return;
  const choisi = s.value;
  const noms = (state.partners || []).map(p => String(p.nom || '').trim()).filter(Boolean);
  s.innerHTML = '<option value="">— saisir un nom —</option>'
    + noms.map(n => `<option>${n.replace(/[<&]/g, c => c === '<' ? '&lt;' : '&amp;')}</option>`).join('');
  if(choisi && noms.indexOf(choisi) !== -1) s.value = choisi;
}

/* RIEN N'EST DESSINÉ TANT QU'AUCUN NOM N'EST DONNÉ. Une affiche « Votre
   hôtel » imprimée par mégarde est du papier perdu, et surtout un QR qui
   envoie tout le monde au même endroit sans provenance. */
function dessiner(){
  const nom = ($$('affNom') ? $$('affNom').value : '').trim();
  const bloc = $$('affiche'), actions = $$('affActions');
  if(!bloc) return;
  if(!nom){
    bloc.hidden = true;
    if(actions) actions.hidden = true;
    etat('');
    return;
  }
  if(!window.ELA_QR){
    bloc.hidden = true;
    if(actions) actions.hidden = true;
    etat("L'encodeur QR n'est pas chargé (qr-affiche.js) : l'affiche ne peut pas être dessinée.", 'ko');
    return;
  }
  let lien;
  try{ lien = window.ELA_QR.lien(baseClient(), nom); }
  catch(err){ etat("L'affiche n'a pas pu être fabriquée : " + (err && err.message || 'erreur'), 'ko'); return; }

  $$('affHotel').textContent = nom;
  /* SVG et non canvas : une affiche s'IMPRIME, et un canvas de 200 px sort
     en bouillie sur du papier. Le SVG reste net à n'importe quelle taille. */
  $$('affQr').innerHTML = window.ELA_QR.svg(lien, 220);
  $$('affLien').textContent = lien;
  bloc.hidden = false;
  if(actions) actions.hidden = false;
  etat('');
}

function brancher(){
  const champ = $$('affNom'), choix = $$('affPartenaire');
  if(champ) champ.addEventListener('input', dessiner);
  if(choix) choix.addEventListener('change', () => {
    /* ON RECOPIE DANS LE CHAMP au lieu de dessiner depuis le menu : c'est
       le nom IMPRIMÉ qui compte, et il doit rester corrigeable à la main —
       une réception s'appelle parfois autrement que la raison sociale. */
    if(choix.value && champ){ champ.value = choix.value; }
    dessiner();
  });
  const imp = $$('btnAffImprimer');
  if(imp) imp.addEventListener('click', () => window.print());

  /* La liste se remplit à l'arrivée sur l'onglet : au chargement du module,
     « state.partners » peut encore être vide — « load() » est asynchrone. */
    /* ON ÉCOUTE L'ÉVÉNEMENT D'ÉCRAN, PAS LA BARRE. Cet onglet peut vivre
     dans la barre du bas ou sous « Gestion » : ce module n'a pas à le
     savoir. Espionner « #nav » l'avait rendu muet le jour du
     déménagement, sans le moindre message. */
  document.addEventListener('ela:ecran', e => { if(e.detail === 'partners') remplirPartenaires(); });
  remplirPartenaires();
}

brancher();
})();
