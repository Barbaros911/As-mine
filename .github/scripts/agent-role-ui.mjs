import fs from 'node:fs';
const fichier=process.argv[2];
if(!fichier) throw new Error('fichier manquant');
let html=fs.readFileSync(fichier,'utf8');
const ajout=`
<style id="ela-role-style">
body.role-agent_reservation #btnControle,body.role-agent_reservation #bordSauvegarde,body.role-agent_reservation #bordDettes,body.role-agent_reservation #bbDette,body.role-agent_reservation #ecran-controle,body.role-agent_reservation label[for="chTauxMode"],body.role-agent_reservation #btnRegistre,body.role-agent_reservation #btnFactures,body.role-agent_reservation #btnReglages,body.role-agent_reservation #ecran-registre,body.role-agent_reservation #ecran-facture,body.role-agent_reservation #ecran-reglages,body.role-agent_reservation #blocCommission,body.role-agent_reservation label[for="chTaux"]{display:none!important}
#presenceEquipe{font-size:12px;line-height:1.45;padding:10px 12px;margin:8px 0;border:1px solid #dbe4e2;border-radius:10px;background:#fff;color:#52605d}#presenceEquipe b{color:#183c39}
</style>
<script>
(function(){
 var nuage=window.ELA_NUAGE; if(!nuage) return;
 nuage.roleOperateur=function(){if(!this.connecte())return Promise.resolve('');return this.appel('/rest/v1/rpc/role_operateur',{method:'POST',body:'{}'}).then(function(r){return typeof r==='string'?r:''}).catch(function(){return ''})};
 nuage.signalerPresence=function(){if(!this.connecte())return Promise.resolve();return this.appel('/rest/v1/rpc/signaler_presence',{method:'POST',body:'{}'}).catch(function(){})};
 nuage.presencesOperateurs=function(){if(!this.connecte())return Promise.resolve([]);return this.appel('/rest/v1/rpc/presences_operateurs',{method:'POST',body:'{}'}).then(function(r){return Array.isArray(r)?r:[]}).catch(function(){return []})};
 /* LE RÔLE CONNU SUR CET APPAREIL (4 octobre 2026). Sans réseau, l'admin s'ouvre sur les courses du téléphone (harden-exploitant-auth.mjs) : la question du rôle échoue, et un rôle vide affichait l'espace COMPLET — registre, factures, réglages — à un agent. On garde le dernier rôle rendu par le serveur pour CE compte, et une panne ne l'efface plus. */
 var CLE_ROLE='ela_role_connu';
 function idCompte(){return nuage.idSession?nuage.idSession():''}
 function roleConnu(){try{var m=JSON.parse(localStorage.getItem(CLE_ROLE)||'null'),id=idCompte();return m&&id&&m.id===id?String(m.role||''):''}catch(e){return ''}}
 function poserRole(role){document.body.classList.remove('role-admin','role-agent_reservation');if(role)document.body.classList.add('role-'+role);window.ELA_ROLE=role}
 function appliquerRole(){var connu=roleConnu();if(connu)poserRole(connu);return nuage.roleOperateur().then(function(role){if(role){poserRole(role);try{var id=idCompte();if(id)localStorage.setItem(CLE_ROLE,JSON.stringify({id:id,role:role}))}catch(e){}}else if(!connu)poserRole('');nuage.signalerPresence();if(window.ELA_ROLE==='admin')rafraichirPresences();return window.ELA_ROLE})}
 function rafraichirPresences(){nuage.presencesOperateurs().then(function(rows){var zone=document.getElementById('presenceEquipe');if(!zone){zone=document.createElement('div');zone.id='presenceEquipe';var cible=document.querySelector('.admin-liens')||document.querySelector('.admin-nav');if(cible)cible.appendChild(zone)}if(!zone)return;var agent=rows.find(function(x){return x.role==='agent_reservation'});zone.innerHTML='<b>Équipe</b><br>Agent réservation : '+(agent&&agent.en_ligne?'en ligne':'hors ligne')})}
 document.addEventListener('ela:espace',function(){appliquerRole()});
 document.addEventListener('ela:acces',function(){appliquerRole()});
 setInterval(function(){if(nuage.connecte()){nuage.signalerPresence();if(window.ELA_ROLE==='admin')rafraichirPresences()}},60000);
 document.addEventListener('click',function(e){if(window.ELA_ROLE!=='agent_reservation')return;var interdit=e.target.closest&&e.target.closest('#btnControle,#btnRegistre,#btnFactures,#btnReglages,[data-admin-vers="ecran-registre"],[data-admin-vers="ecran-facture"],[data-admin-vers="ecran-reglages"]');if(interdit){e.preventDefault();e.stopImmediatePropagation()}},true);
 if(nuage.connecte())appliquerRole();
})();
</script>`;
if(!html.includes('</body>')) throw new Error('body introuvable');
html=html.replace('</body>',ajout+'\n</body>');
for(const requis of ['/rpc/role_operateur','/rpc/signaler_presence','role-agent_reservation','presenceEquipe'])if(!html.includes(requis))throw new Error('RBAC manquant '+requis);
fs.writeFileSync(fichier,html,'utf8');
console.log('Interface RBAC ajoutée:',fichier);
