/* ═══ L'AUTHENTIFICATION EXPLOITANT, DANS LE SOURCE, ÉPROUVÉE SANS NAVIGATEUR ═══
   Depuis le 2 novembre 2026, index.html porte LUI-MÊME la connexion de
   l'admin qui tourne en production (e-mail et mot de passe Supabase,
   est_exploitant() demandé au serveur en trois réponses, code admin à 6
   chiffres vérifié là-bas, déconnexion révoquée chez Supabase, admin sans
   réseau seulement pour un compte déjà reconnu) ; harden-exploitant-auth.mjs
   ne la pose plus au build, il la vérifie. Cette suite éprouve les deux :
     1. le source respecte chaque exigence du garde ;
     2. le garde TOMBE sur chaque régression connue — une mutation à la fois
        sur une copie du source, et il doit la nommer ;
     3. lancé comme au build, le garde n'écrit rien, rend 0 sur le source et 1
        avec la cause sur une copie où l'ancien verrou revient.
   Les mutations sont celles qu'une reprise maladroite produirait : l'ancien
   code local qui revient, une panne traitée comme un refus, un code vérifié
   dans la page, une session mémorisée qui ouvre sans le serveur, une
   déconnexion qui laisse le jeton vivant chez Supabase. */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { manquements, EXIGENCES } from './.github/scripts/harden-exploitant-auth.mjs';

const ok = [], ko = [];
const check = (nom, oui, detail) => { (oui ? ok : ko).push(nom); console.log((oui ? '✔ ' : '✘ ') + nom + (oui || !detail ? '' : '  — ' + detail)); };
const source = readFileSync('index.html', 'utf8');
const compter = (h, motif) => h.split(motif).length - 1;

/* 1. Le source respecte le garde. */
const manques = manquements(source);
check('le source index.html respecte les ' + EXIGENCES.length + ' exigences de l\'authentification exploitant', manques.length === 0, manques.join(' ; '));
check('aucun code local n\'ouvre l\'espace : ni CODE_EXPLOITANT, ni empreinte, ni DEVERROUILLE',
  !source.includes('CODE_EXPLOITANT') && !source.includes('function empreinte(') && !source.includes('DEVERROUILLE') && !source.includes('ela_exploitant'));

/* 2. Chaque mutation est attrapée et nommée ; le témoin prouve qu'elle vise
   bien ce défaut-là (son nombre d'occurrences a bougé). */
const MUTATIONS = [
  ['l\'ancien verrou local revient (CODE_EXPLOITANT)',
   h => h.replace('var MODE_EXPLOITANT = false;', 'var CODE_EXPLOITANT = "584ec46adb3a2408";\n  var MODE_EXPLOITANT = false;'), 'CODE_EXPLOITANT'],
  ['une session mémorisée ouvre sans le serveur (DEVERROUILLE)',
   h => h.replace('if(nuage.connecte()) verifierAcces();\n  } else {', 'var DEVERROUILLE = nuage.connecte(); if(DEVERROUILLE) ouvrirEspace();\n  } else {'), 'if(nuage.connecte()) verifierAcces();'],
  ['le champ e-mail disparaît du verrou',
   h => h.replace('<input id="exploitantEmail" type="email"', '<input id="exploitantEmail" type="text"'), '<input id="exploitantEmail" type="email"'],
  ['l\'étape du code admin disparaît',
   h => h.replace('<div id="etapeCode" hidden>', '<div id="etapeCodeX" hidden>'), '<div id="etapeCode" hidden>'],
  ['l\'écriteau du compte suspendu disparaît',
   h => h.replace('<div class="verrou-suspendu" id="accesSuspendu" hidden>', '<div class="verrou-suspendu" hidden>'), 'id="accesSuspendu"'],
  ['les droits viennent du stockage local, plus de l\'adresse seule',
   h => h.replace('MODE_EXPLOITANT = new URLSearchParams(location.search).get("exploitant") === "1";', 'MODE_EXPLOITANT = localStorage.getItem("exploitant") === "1";'), 'URLSearchParams(location.search).get("exploitant") === "1"'],
  ['est_exploitant n\'est plus demandé au serveur',
   h => h.replace('return this.appel("/rest/v1/rpc/est_exploitant", {', 'return this.appel("/rest/v1/rpc/est_quelquun", {'), '/rest/v1/rpc/est_exploitant'],
  ['une panne est traitée comme un refus',
   h => h.replace('      return "panne";\n', '      return "non";\n'), 'return "panne";'],
  ['le motif d\'un refus n\'est plus lu',
   h => h.replace('nuage.motifRefus = function(){', 'nuage.motifRefusX = function(){'), 'nuage.motifRefus = function(){'],
  ['l\'accès vérifié sur l\'appareil mémorise autre chose que l\'identifiant',
   h => h.replace('var CLE_ACCES = "ela_acces_verifie";', 'var CLE_ACCES = "ela_exploitant";'), 'ela_acces_verifie'],
  ['« Se connecter » ouvre sans repasser par le serveur',
   h => h.replace('      return nuage.verifierExploitant();\n    }).then(function(v){\n      /* Un refus', '      return "oui";\n    }).then(function(v){\n      /* Un refus'), 'return nuage.verifierExploitant();'],
  ['un refus garde la session',
   h => h.replace('if(v !== "oui"){\n        nuage.deconnexion();\n        if(v === "suspendu")', 'if(v !== "oui"){\n        if(v === "suspendu")'), 'if(v !== "oui"){\n        nuage.deconnexion();'],
  ['le code admin n\'est plus demandé quand il manque',
   h => h.replace('if(v === "code"){ demanderCode(false); return; }', 'if(v === "code"){ entrer(); return; }'), 'if(v === "code"){ demanderCode(false); return; }'],
  ['le code est vérifié dans la page, plus par le serveur',
   h => h.replace('appelCode("ela_code_admin_verifier", { p_code: code })', 'Promise.resolve(code === "123456" ? "ok" : "faux")'), 'ela_code_admin_verifier'],
  ['après le code, on entre sans le « oui » du serveur',
   h => h.replace('function apresCode(){\n    return nuage.verifierExploitant().then(function(v){\n      if(v === "oui"){ entrer(); return; }', 'function apresCode(){\n    return Promise.resolve("oui").then(function(v){\n      if(v === "oui"){ entrer(); return; }'), 'function apresCode(){\n    return nuage.verifierExploitant()'],
  ['le message des 5 codes faux change de sens',
   h => h.replace('var BLOQUE = "5 codes faux de suite : l\'accès est bloqué 15 minutes. Réessayez ensuite.";', 'var BLOQUE = "Code faux.";'), '15 minutes. Réessayez ensuite.'],
  ['la déconnexion ne révoque plus la session chez Supabase',
   h => h.replace('fetch(SUPABASE_URL + "/auth/v1/logout?scope=local", {', 'fetch(SUPABASE_URL + "/auth/v1/logout?scope=global", {'), 'logout?scope=local'],
  ['« Se déconnecter » ne prévient plus le serveur',
   h => h.replace('document.getElementById("btnNuageDeco").addEventListener("click", function(){\n    arreterVerificationAcces();\n    deconnecterServeur();\n', 'document.getElementById("btnNuageDeco").addEventListener("click", function(){\n    arreterVerificationAcces();\n'), 'arreterVerificationAcces();\n    deconnecterServeur();'],
  ['« Changer de compte » garde l\'accès vérifié',
   h => h.replace('document.getElementById("btnMfaAnnuler").addEventListener("click", function(){\n    deconnecterServeur();\n    nuage.oublierAcces();\n', 'document.getElementById("btnMfaAnnuler").addEventListener("click", function(){\n    deconnecterServeur();\n'), 'deconnecterServeur();\n    nuage.oublierAcces();'],
  ['un refus du serveur ne ferme plus l\'espace',
   h => h.replace('if(v === "non") return traiterRefus(ouvert).then(function(){ return v; });', 'if(v === "non") return v;'), 'return traiterRefus(ouvert)'],
  ['sans réseau, l\'espace s\'ouvre pour n\'importe quel compte',
   h => h.replace('if(nuage.accesDejaVerifie()) ouvrirEspace();', 'ouvrirEspace();'), 'if(nuage.accesDejaVerifie()) ouvrirEspace();'],
  ['plus de revérification toutes les 15 s',
   h => h.replace('if(!minuterieAcces) minuterieAcces = setInterval(verifierAcces, 15000);', ''), 'setInterval(verifierAcces, 15000)'],
  ['plus de revérification au retour sur l\'onglet',
   h => h.replace('      nuage.verifierExploitant().then(function(v){ if(v === "non") return traiterRefus(true); });', ''), 'if(v === "non") return traiterRefus(true);'],
  ['Réglages perd le bloc du code admin',
   h => h.replace('<div id="blocDoubleVerif"', '<div id="blocDoubleVerifX"'), '<div id="blocDoubleVerif"'],
  ['se connecter depuis Réglages n\'est plus vérifié',
   h => h.replace('jugerNuage();\n      if(MODE_EXPLOITANT) verifierAcces(); else synchroniser();', 'jugerNuage(); synchroniser();'), 'if(MODE_EXPLOITANT) verifierAcces(); else synchroniser();'],
];
for (const [nom, muter, temoin] of MUTATIONS) {
  const mute = muter(source);
  const aChange = mute !== source;
  const attrape = manquements(mute);
  check('mutation « ' + nom + ' » : le texte a bien changé', aChange);
  check('mutation « ' + nom + ' » : le garde tombe et la nomme', aChange && attrape.length > 0, attrape.join(' ; '));
  check('mutation « ' + nom + ' » : le défaut visé est présent dans la copie mutée', compter(mute, temoin) !== compter(source, temoin));
}

/* 3. Lancé comme au build. */
const dossier = mkdtempSync(join(tmpdir(), 'ela-auth-'));
try {
  const copie = join(dossier, 'index.html');
  writeFileSync(copie, source);
  let accepte = true;
  try { execFileSync('node', ['.github/scripts/harden-exploitant-auth.mjs', copie], { stdio: 'pipe' }); } catch { accepte = false; }
  check('lancé comme au build, le garde accepte le source et ne le réécrit pas', accepte && readFileSync(copie, 'utf8') === source);
  writeFileSync(copie, MUTATIONS[0][1](source));
  let code = 0, erreur = '';
  try { execFileSync('node', ['.github/scripts/harden-exploitant-auth.mjs', copie], { stdio: 'pipe' }); }
  catch (e) { code = e.status; erreur = String(e.stderr); }
  check('lancé sur une copie où l\'ancien verrou revient, il rend 1 et nomme la cause', code === 1 && /CODE_EXPLOITANT/.test(erreur), erreur.slice(0, 200));
} finally { rmSync(dossier, { recursive: true, force: true }); }

console.log('=== ' + ok.length + ' ok, ' + ko.length + ' ko');
process.exit(ko.length ? 1 : 0);
