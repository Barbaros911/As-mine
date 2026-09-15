import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
execFileSync('bash',['construire.sh'],{stdio:'inherit'});
for(const f of ['site/index.html','site/application.html']){
 const h=fs.readFileSync(f,'utf8');
 const requis=['/rest/v1/rpc/role_operateur','/rest/v1/rpc/signaler_presence','/rest/v1/rpc/presences_operateurs','role-agent_reservation','presenceEquipe','#btnRegistre','#btnFactures','#btnReglages','exploitantEmail','exploitantMdp'];
 for(const x of requis) if(!h.includes(x)) throw new Error(f+' : RBAC manquant '+x);
 if(h.includes('CODE_EXPLOITANT')||h.includes('codeExploitant')) throw new Error(f+' : ancien verrou réapparu');
}
console.log('RBAC agent/admin : OK');
