const config = window.BACKROOMS_CONFIG;
const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const status = document.querySelector('#status');
const marker = document.querySelector('#marker');
const messagePanel = document.querySelector('#message-panel');
const textArea = document.querySelector('#message-text');
const nameInput = document.querySelector('#marker-name');
const colorInput = document.querySelector('#marker-color');
const API = 'https://api.github.com';
const map = ['111111111111111','100000001000001','101111101011101','101000001010001','101011111010111','100010000010001','111010111110101','100010100000101','101110101111101','100000100000001','111111111111111'];
const player = { x: 1.5, y: 1.5, a: 0.1, speed: 2.6 };
const keys = new Set(); let started = false; let previous = performance.now(); let marks = [];
function resize() { canvas.width = Math.max(320, innerWidth); canvas.height = Math.max(240, innerHeight); }
addEventListener('resize', resize); resize();
function isWall(x, y) { const row = map[Math.floor(y)]; return !row || row[Math.floor(x)] !== '0'; }
function setStatus(text) { status.textContent = text; }
nameInput.value = localStorage.getItem('backrooms-marker-name') || '';
colorInput.value = localStorage.getItem('backrooms-marker-color') || '#e7df61';
function draw() {
  const w=canvas.width, h=canvas.height, fov=Math.PI/2.8;
  const ceiling=ctx.createLinearGradient(0,0,0,h/2); ceiling.addColorStop(0,'#262511'); ceiling.addColorStop(1,'#767139'); ctx.fillStyle=ceiling; ctx.fillRect(0,0,w,h/2);
  const floor=ctx.createLinearGradient(0,h/2,0,h); floor.addColorStop(0,'#807a43'); floor.addColorStop(1,'#242410'); ctx.fillStyle=floor; ctx.fillRect(0,h/2,w,h/2);
  for (let i=0;i<w;i+=2) { const ray=player.a-fov/2+(i/w)*fov; let d=0; while(d<14){ d+=.035; if(isWall(player.x+Math.cos(ray)*d,player.y+Math.sin(ray)*d)) break; } const corrected=d*Math.cos(ray-player.a); const height=Math.min(h, h/(corrected+.001)*.73); const shade=Math.max(20, 175-d*15)|0; ctx.fillStyle=`rgb(${shade+22},${shade+20},${Math.max(9,shade-40)})`; ctx.fillRect(i,(h-height)/2,2,height); if (Math.sin(ray*7)*.5+.5>.75 && d<6) { ctx.fillStyle='#aaa250'; ctx.fillRect(i,(h-height)/2,2,2); } }
  for (const m of marks) { const dx=m.position.x-player.x, dy=m.position.z-player.y, dist=Math.hypot(dx,dy); let delta=Math.atan2(dy,dx)-player.a; delta=Math.atan2(Math.sin(delta),Math.cos(delta)); if(dist<4 && Math.abs(delta)<fov/2) { const sx=w/2+(delta/(fov/2))*w/2; ctx.fillStyle=m.author?.color || '#2f2617'; ctx.font=`${Math.max(10,28/dist)}px monospace`; ctx.fillText('✎',sx,h/2); } }
}
function update(now) { const dt=Math.min(.05,(now-previous)/1000); previous=now; if(started){ let nx=player.x, ny=player.y; const forward=(keys.has('w')?1:0)-(keys.has('s')?1:0), side=(keys.has('d')?1:0)-(keys.has('a')?1:0); const speed=player.speed*dt; nx+=Math.cos(player.a)*forward*speed+Math.cos(player.a+Math.PI/2)*side*speed; ny+=Math.sin(player.a)*forward*speed+Math.sin(player.a+Math.PI/2)*side*speed; if(!isWall(nx,player.y))player.x=nx; if(!isWall(player.x,ny))player.y=ny; } draw(); requestAnimationFrame(update); }
requestAnimationFrame(update);
async function loadMarks() { if (!config.messageIssueNumber) { setStatus('The wall log has not been opened yet.'); return; } try { let all=[]; for(let page=1;page<=10;page++){ const r=await fetch(`${API}/repos/${config.owner}/${config.repo}/issues/${config.messageIssueNumber}/comments?per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':config.githubApiVersion}}); if(!r.ok) throw new Error(r.status); const pageItems=await r.json(); all=all.concat(pageItems); if(pageItems.length<100)break; } marks=all.map(c=>{try {const r=JSON.parse(c.body); return r.version===1&&r.position&&typeof r.text==='string'?{...r,id:c.id}:null;}catch{return null;}}).filter(Boolean); setStatus(marks.length ? `${marks.length} traces are on these walls.` : 'No one has marked these walls yet.'); } catch { setStatus('Could not read the wall log. You can still explore.'); } }
function openPanel(el) { el.classList.remove('hidden'); document.exitPointerLock(); }
function closePanels() { document.querySelectorAll('.panel:not(.start)').forEach(el=>el.classList.add('hidden')); }
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closePanels));
document.querySelector('#enter').addEventListener('click',()=>{ document.querySelector('#start-panel').classList.add('hidden'); started=true; canvas.requestPointerLock(); loadMarks(); });
document.addEventListener('keydown',e=>{ if(['w','a','s','d'].includes(e.key.toLowerCase()))keys.add(e.key.toLowerCase()); if(e.key.toLowerCase()==='e' && started)openPanel(messagePanel); });
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
document.addEventListener('mousemove',e=>{ if(document.pointerLockElement===canvas) player.a+=e.movementX*.0023; });
canvas.addEventListener('click',()=>{if(started&&!document.querySelector('.panel:not(.hidden)')) canvas.requestPointerLock();});
marker.addEventListener('click',()=>openPanel(messagePanel));
textArea.addEventListener('input',()=>document.querySelector('#count').textContent=textArea.value.length);
document.querySelector('#send-message').addEventListener('click',async()=>{ const text=textArea.value.trim(), name=nameInput.value.trim() || 'Unknown wanderer', color=colorInput.value; const send=document.querySelector('#send-message'); if(!text)return; if(!config.messageBrokerUrl){setStatus('The message relay has not been configured yet.');return;} localStorage.setItem('backrooms-marker-name',name); localStorage.setItem('backrooms-marker-color',color); send.disabled=true; try { const record={version:1,position:{x:+player.x.toFixed(2),z:+player.y.toFixed(2)},text,author:{name,color},createdAt:new Date().toISOString()}; const r=await fetch(`${config.messageBrokerUrl.replace(/\/$/,'')}/messages`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(record)}); const response=await r.json(); if(!r.ok)throw new Error(response.error||r.status); marks.push({...record,id:response.id}); textArea.value=''; document.querySelector('#count').textContent='0'; closePanels(); setStatus('The wall remembers what you wrote.'); }catch(err){setStatus(`The marker failed: ${err.message}.`);}finally{send.disabled=false;} });
