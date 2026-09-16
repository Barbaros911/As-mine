/* ELA Admin v2 — abonnement Web Push exploitant. */
(()=>{
'use strict';
const VAPID_PUBLIC='BKckm_zbq-nvYvV7XnfC3Wg0Hxce67se9qLHUFNEyCgKdwemPvB7kZIb55GUYBXGTj6xeiHzFWOxwqJLs1pk5NU';
function vapidBytes(v){let p=v.replace(/-/g,'+').replace(/_/g,'/');while(p.length%4)p+='=';const raw=atob(p),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}
async function enregistrer(ab){return api('/rest/v1/rpc/ela_enregistrer_push_admin',{method:'POST',body:JSON.stringify({p_abonnement:ab.toJSON()})});}
async function activer(){
  if(!session?.access_token){alert('Connecte-toi d’abord à l’Admin.');return;}
  if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window)){alert('Les notifications Push ne sont pas disponibles sur ce navigateur. Telegram reste indépendant.');return;}
  try{
    const permission=await Notification.requestPermission();if(permission!=='granted'){alert('Notifications non autorisées. Sur iPhone, l’Admin doit être ajouté à l’écran d’accueil avant d’autoriser les notifications.');return;}
    const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
    let ab=await reg.pushManager.getSubscription();if(!ab)ab=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidBytes(VAPID_PUBLIC)});
    await enregistrer(ab);const b=document.getElementById('elaPush');if(b)b.textContent='Notifications activées';
  }catch(e){alert(`Activation Push impossible : ${e.message}`);}
}
function bouton(){if(document.getElementById('elaPush'))return;const zone=document.querySelector('.top>div');if(!zone)return;const b=document.createElement('button');b.id='elaPush';b.className='btn alt';b.type='button';b.textContent='Activer notifications';b.style.marginRight='8px';b.onclick=activer;zone.insertBefore(b,zone.querySelector('#logout'));}
bouton();

/* Un clic sur une notification ouvre directement la réservation visée. */
const ref=new URLSearchParams(location.search).get('ref');let ouvert=false;
const avant=load;load=async function(){await avant();if(ref&&!ouvert&&state.courses.some(c=>c.ref===ref)){ouvert=true;await openBooking(ref);}};
setTimeout(()=>{bouton();if(ref&&session?.access_token&&!ouvert)load().catch(()=>{});},800);
})();
