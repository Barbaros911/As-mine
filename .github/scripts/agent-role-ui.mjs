import fs from 'node:fs';
const fichier=process.argv[2];
if(!fichier) throw new Error('fichier manquant');
let html=fs.readFileSync(fichier,'utf8');
const ajout=`
<style id="ela-role-style">
body.role-agent_reservation #btnRegistre,body.role-agent_reservation #btnFactures,body.role-agent_reservation #btnReglages,body.role-agent_reservation #ecran-registre,body.role-agent_reservation #ecran-facture,body.role-agent_reservation #ecran-reglages{display:none!important}
#presenceEquipe{font-size:12px;line-height:1.45;padding:10px 12px;margin:8px 0;border:1px solid #dbe4e2;border-radius:10px;background:#fff;color:#52605d}#presenceEquipe b{color:#183c39}
</style>
<script>
(function(){
 if(typeof nuage==='undefined') return;
 nuage.roleOperateur=function(){if(!this.connecte())return Promise.resolve('');return this.appel('/rest/v1/rpc/role_operateur',{method:'POST',body:'{}'}).then(function(r){return typeof r==='string'?r:''}).catch(function(){return ''})};
 nuage.signalerPresence=function(){if(!this.connecte())return Promise.resolve();return this.appel('/rest/v1/rpc/signaler_presence',{method:'POST',body:'{}'}).catch(function(){})};
 nuage.presencesOperateurs=function(){if(!this.connecte())return Promise.resolve([]);return this.appel('/rest/v1/rpc/presences_operateurs',{method:'POST',body:'{}'}).then(function(r){return Array.isArray(r)?r:[]}).catch(function(){return []})};
 function appliquerRole(){return nuage.roleOperateur().then(function(role){document.body.classList.remove('role-admin','role-agent_reservation');if(role)document.body.classList.add('role-'+role);window.ELA_ROLE=role;nuage.signalerPresence();if(role==='admin')rafraichirPresences();return role})}
 function rafraichirPresences(){nuage.presencesOperateurs().then(function(rows){var zone=document.getElementById('presenceEquipe');if(!zone){zone=document.createElement('div');zone.id='presenceEquipe';var cible=document.querySelector('.admin-liens')||document.querySelector('.admin-nav');if(cible)cible.appendChild(zone)}if(!zone)return;var agent=rows.find(function(x){return x.role==='agent_reservation'});zone.innerHTML='<b>Équipe</b><br>Agent réservation : '+(agent&&agent.en_ligne?'en ligne':'hors ligne')})}
 var ouvrir=window.ouvrirEspace;if(typeof ouvrir==='function')window.ouvrirEspace=function(){var r=ouvrir.apply(this,arguments);appliquerRole();return r};
 setInterval(function(){if(nuage.connecte()){nuage.signalerPresence();if(window.ELA_ROLE==='admin')rafraichirPresences()}},60000);
 document.addEventListener('click',function(e){if(window.ELA_ROLE!=='agent_reservation')return;var interdit=e.target.closest&&e.target.closest('#btnRegistre,#btnFactures,#btnReglages,[data-admin-vers="ecran-registre"],[data-admin-vers="ecran-facture"],[data-admin-vers="ecran-reglages"]');if(interdit){e.preventDefault();e.stopImmediatePropagation()}},true);
 if(nuage.connecte())appliquerRole();
})();
</script>`;
if(!html.includes('</body>')) throw new Error('body introuvable');
html=html.replace('</body>',ajout+'\n</body>');
for(const requis of ['/rpc/role_operateur','/rpc/signaler_presence','role-agent_reservation','presenceEquipe'])if(!html.includes(requis))throw new Error('RBAC manquant '+requis);
fs.writeFileSync(fichier,html,'utf8');
console.log('Interface RBAC ajoutée:',fichier);
