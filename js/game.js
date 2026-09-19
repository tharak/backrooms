const config = window.BACKROOMS_CONFIG;
const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const status = document.querySelector('#status');
const marker = document.querySelector('#marker');
const messagePanel = document.querySelector('#message-panel');
const loginPanel = document.querySelector('#login-panel');
const textArea = document.querySelector('#message-text');
const loginStatus = document.querySelector('#login-status');
const deviceCode = document.querySelector('#device-code');
const verifyLink = document.querySelector('#verify-link');
const API = 'https://api.github.com';
const map = [
  '111111111111111','100000001000001','101111101011101','101000001010001','101011111010111','100010000010001','111010111110101','100010100000101','101110101111101','100000100000001','111111111111111'
];
const player = { x: 1.5, y: 1.5, a: 0.1, speed: 2.6 };
const keys = new Set(); let started = false; let previous = performance.now(); let token = sessionStorage.getItem('backrooms-github-token'); let marks = [];

function resize() { canvas.width = Math.max(320, innerWidth); canvas.height = Math.max(240, innerHeight); }
addEventListener('resize', resize); resize();
function isWall(x, y) { const row = map[Math.floor(y)]; return !row || row[Math.floor(x)] !== '0'; }
function setStatus(text) { status.textContent = text; }
function markerState() { marker.classList.toggle('dry', !token); marker.setAttribute('aria-label', token ? 'GitHub marker, filled with ink' : 'GitHub marker, no ink'); }
markerState();

function draw() {
  const w=canvas.width, h=canvas.height, fov=Math.PI/2.8;
  const ceiling=ctx.createLinearGradient(0,0,0,h/2); ceiling.addColorStop(0,'#262511'); ceiling.addColorStop(1,'#767139'); ctx.fillStyle=ceiling; ctx.fillRect(0,0,w,h/2);
  const floor=ctx.createLinearGradient(0,h/2,0,h); floor.addColorStop(0,'#807a43'); floor.addColorStop(1,'#242410'); ctx.fillStyle=floor; ctx.fillRect(0,h/2,w,h/2);
  for (let i=0;i<w;i+=2) { const ray=player.a-fov/2+(i/w)*fov; let d=0; while(d<14){ d+=.035; if(isWall(player.x+Math.cos(ray)*d,player.y+Math.sin(ray)*d)) break; } const corrected=d*Math.cos(ray-player.a); const height=Math.min(h, h/(corrected+.001)*.73); const shade=Math.max(20, 175-d*15)|0; ctx.fillStyle=`rgb(${shade+22},${shade+20},${Math.max(9,shade-40)})`; ctx.fillRect(i,(h-height)/2,2,height); if (Math.sin(ray*7)*.5+.5>.75 && d<6) { ctx.fillStyle='#aaa250'; ctx.fillRect(i,(h-height)/2,2,2); } }
  for (const m of marks) { const dx=m.position.x-player.x, dy=m.position.z-player.y, dist=Math.hypot(dx,dy); let delta=Math.atan2(dy,dx)-player.a; delta=Math.atan2(Math.sin(delta),Math.cos(delta)); if(dist<4 && Math.abs(delta)<fov/2) { const sx=w/2+(delta/(fov/2))*w/2; ctx.fillStyle='#2f2617'; ctx.font=`${Math.max(10,28/dist)}px monospace`; ctx.fillText('✎',sx,h/2); } }
}
function update(now) { const dt=Math.min(.05,(now-previous)/1000); previous=now; if(started){ let nx=player.x, ny=player.y; const forward=(keys.has('w')?1:0)-(keys.has('s')?1:0), side=(keys.has('d')?1:0)-(keys.has('a')?1:0); const speed=player.speed*dt; nx+=Math.cos(player.a)*forward*speed+Math.cos(player.a+Math.PI/2)*side*speed; ny+=Math.sin(player.a)*forward*speed+Math.sin(player.a+Math.PI/2)*side*speed; if(!isWall(nx,player.y))player.x=nx; if(!isWall(player.x,ny))player.y=ny; } draw(); requestAnimationFrame(update); }
requestAnimationFrame(update);

async function loadMarks() { if (!config.messageIssueNumber) { setStatus('The wall log has not been opened yet.'); return; } try { let all=[]; for(let page=1;page<=10;page++){ const r=await fetch(`${API}/repos/${config.owner}/${config.repo}/issues/${config.messageIssueNumber}/comments?per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':config.githubApiVersion}}); if(!r.ok) throw new Error(r.status); const pageItems=await r.json(); all=all.concat(pageItems); if(pageItems.length<100)break; } marks=all.map(c=>{try {const r=JSON.parse(c.body); return r.version===1&&r.position&&typeof r.text==='string'?{...r,id:c.id,author:{login:c.user.login,avatarUrl:c.user.avatar_url}}:null;}catch{return null;}}).filter(Boolean); setStatus(marks.length ? `${marks.length} traces are on these walls.` : 'No one has marked these walls yet.'); } catch { setStatus('Could not read the wall log. You can still explore.'); } }
function openPanel(el) { el.classList.remove('hidden'); document.exitPointerLock(); }
function closePanels() { document.querySelectorAll('.panel:not(.start)').forEach(el=>el.classList.add('hidden')); }
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closePanels));
document.querySelector('#enter').addEventListener('click',()=>{ document.querySelector('#start-panel').classList.add('hidden'); started=true; canvas.requestPointerLock(); loadMarks(); });
document.addEventListener('keydown',e=>{ if(['w','a','s','d'].includes(e.key.toLowerCase()))keys.add(e.key.toLowerCase()); if(e.key.toLowerCase()==='e' && started){ token?openPanel(messagePanel):openPanel(loginPanel); } });
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
document.addEventListener('mousemove',e=>{ if(document.pointerLockElement===canvas) player.a+=e.movementX*.0023; });
canvas.addEventListener('click',()=>{if(started&&!document.querySelector('.panel:not(.hidden)')) canvas.requestPointerLock();});
marker.addEventListener('click',()=>token?openPanel(messagePanel):openPanel(loginPanel));
textArea.addEventListener('input',()=>document.querySelector('#count').textContent=textArea.value.length);

async function beginLogin(){ if(!config.oauthClientId){ loginStatus.textContent='This marker has not been configured with a GitHub OAuth App yet.'; return; } const button=document.querySelector('#start-login'); button.disabled=true; loginStatus.textContent='Asking GitHub for ink…'; try { const r=await fetch('https://github.com/login/device/code',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.oauthClientId,scope:'public_repo'})}); const data=await r.json(); if(!r.ok)throw new Error(data.error||r.status); deviceCode.textContent=data.user_code; deviceCode.classList.remove('hidden'); verifyLink.href=data.verification_uri; verifyLink.classList.remove('hidden'); verifyLink.click(); loginStatus.textContent='Enter the code on GitHub. Waiting for ink…'; const until=Date.now()+data.expires_in*1000; let interval=(data.interval||5)*1000; while(Date.now()<until){ await new Promise(resolve=>setTimeout(resolve,interval)); const poll=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.oauthClientId,device_code:data.device_code,grant_type:'urn:ietf:params:oauth:grant-type:device_code'})}); const answer=await poll.json(); if(answer.access_token){ token=answer.access_token; sessionStorage.setItem('backrooms-github-token',token); markerState(); loginStatus.textContent='The marker is full.'; setTimeout(closePanels,900); return; } if(answer.error==='slow_down')interval+=5000; if(answer.error && answer.error!=='authorization_pending')throw new Error(answer.error); } throw new Error('expired_token'); } catch(err) { loginStatus.textContent=`GitHub ink failed: ${err.message}. Try again.`; } finally {button.disabled=false;} }
document.querySelector('#start-login').addEventListener('click',beginLogin);
document.querySelector('#send-message').addEventListener('click',async()=>{ const body=textArea.value.trim(); const send=document.querySelector('#send-message'); if(!body)return; if(!config.messageIssueNumber){setStatus('The wall log has not been opened yet.');return;} send.disabled=true; try { const record={version:1,position:{x:+player.x.toFixed(2),z:+player.y.toFixed(2)},text:body,createdAt:new Date().toISOString()}; const r=await fetch(`${API}/repos/${config.owner}/${config.repo}/issues/${config.messageIssueNumber}/comments`,{method:'POST',headers:{Accept:'application/vnd.github+json','Authorization':`Bearer ${token}`,'X-GitHub-Api-Version':config.githubApiVersion,'Content-Type':'application/json'},body:JSON.stringify({body:JSON.stringify(record)})}); if(!r.ok)throw new Error(r.status===422?'GitHub stopped this as spam':r.status); const comment=await r.json(); marks.push({...record,id:comment.id,author:{login:comment.user.login,avatarUrl:comment.user.avatar_url}}); textArea.value=''; document.querySelector('#count').textContent='0'; closePanels(); setStatus('The wall remembers what you wrote.'); }catch(err){setStatus(`The marker failed: ${err.message}.`);}finally{send.disabled=false;} });
