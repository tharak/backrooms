import * as THREE from 'three';

const config = window.BACKROOMS_CONFIG;
const canvas = document.querySelector('#game');
const status = document.querySelector('#status');
const marker = document.querySelector('#marker');
const messagePanel = document.querySelector('#message-panel');
const textArea = document.querySelector('#message-text');
const nameInput = document.querySelector('#marker-name');
const colorInput = document.querySelector('#marker-color');
const tokenInput = document.querySelector('#github-token');
const API = 'https://api.github.com';

const map = [
  '111111111111111',
  '100000001000001',
  '101111101011101',
  '101000001010001',
  '101011111010111',
  '100010000010001',
  '111010111110101',
  '100010100000101',
  '101110101111101',
  '100000100000001',
  '111111111111111'
];

const player = { x: 1.5, z: 1.5, yaw: 0.1, pitch: 0, speed: 2.65 };
const keys = new Set();
const messageGroup = new THREE.Group();
let started = false;
let previous = performance.now();

function setStatus(text) { status.textContent = text; }
function isWall(x, z) { const row = map[Math.floor(z)]; return !row || row[Math.floor(x)] !== '0'; }
function canStand(x, z) {
  const radius = 0.18;
  return !isWall(x-radius,z-radius) && !isWall(x+radius,z-radius) && !isWall(x-radius,z+radius) && !isWall(x+radius,z+radius);
}

function canvasTexture(size, paint) {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = textureCanvas.height = size;
  paint(textureCanvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

const wallpaper = canvasTexture(256, (context, size) => {
  context.fillStyle = '#c4b867'; context.fillRect(0,0,size,size);
  for (let x=0;x<size;x+=64) { context.fillStyle='rgba(92,78,30,.09)'; context.fillRect(x,0,1,size); context.fillStyle='rgba(255,245,171,.06)'; context.fillRect(x+3,0,1,size); }
  for (let y=0;y<size;y+=4) { context.fillStyle=`rgba(83,72,31,${.009+(y%19===0?.012:0)})`; context.fillRect(0,y,size,1); }
  for (let i=0;i<180;i++) { const shade=75+(i%4)*15; context.fillStyle=`rgba(${shade},${shade-8},35,.025)`; context.fillRect((i*83)%size,(i*47)%size,1+(i%3),1); }
});
wallpaper.repeat.set(1, 2.5);

const carpet = canvasTexture(256, (context, size) => {
  context.fillStyle='#958b58'; context.fillRect(0,0,size,size);
  for(let i=0;i<2600;i++){ const value=70+(i*29)%45; context.fillStyle=`rgba(${value},${value-7},${Math.max(25,value-38)},.13)`; context.fillRect((i*71)%size,(i*43)%size,1,1); }
});
carpet.repeat.set(map[0].length, map.length);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x242314);
scene.fog = new THREE.FogExp2(0x686238, 0.048);
scene.add(messageGroup);

const camera = new THREE.PerspectiveCamera(72, innerWidth/innerHeight, .04, 35);
camera.rotation.order='YXZ';
scene.add(camera);

const wallMaterial = new THREE.MeshStandardMaterial({ map: wallpaper, color: 0xf0e38a, roughness: .98, metalness: 0 });
const wallGeometry = new THREE.BoxGeometry(1,3,1);
for (let z=0;z<map.length;z++) for(let x=0;x<map[z].length;x++) if(map[z][x]==='1') {
  const wall=new THREE.Mesh(wallGeometry,wallMaterial);
  wall.position.set(x+.5,1.5,z+.5);
  scene.add(wall);
}

const floorMaterial = new THREE.MeshStandardMaterial({ map: carpet, color: 0xb8ae77, roughness: 1 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(map[0].length,map.length),floorMaterial);
floor.rotation.x=-Math.PI/2; floor.position.set(map[0].length/2,0,map.length/2); scene.add(floor);
const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0xc9c49a, roughness: .93, side: THREE.DoubleSide });
const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(map[0].length,map.length),ceilingMaterial);
ceiling.rotation.x=Math.PI/2; ceiling.position.set(map[0].length/2,3,map.length/2); scene.add(ceiling);

scene.add(new THREE.HemisphereLight(0xeee8a8,0x514b28,1.12));
scene.add(new THREE.AmbientLight(0x8d8652,.24));
const lightMaterial = new THREE.MeshBasicMaterial({color:0xfff7b0});
const fixtureGeometry = new THREE.BoxGeometry(1.3,.035,.18);
for (const [x,z] of [[2.5,1.5],[6.5,1.5],[9.5,1.5],[13.5,1.5],[1.5,5.5],[5.5,5.5],[9.5,5.5],[13.5,9.5],[6.5,9.5]]) {
  if(isWall(x,z)) continue;
  const fixture=new THREE.Mesh(fixtureGeometry,lightMaterial); fixture.position.set(x,2.965,z); scene.add(fixture);
  const light=new THREE.PointLight(0xffefa0,2.3,6,1.7); light.position.set(x,2.72,z); scene.add(light);
}

function updateCamera() {
  camera.position.set(player.x,1.62,player.z);
  camera.rotation.y=-player.yaw-Math.PI/2;
  camera.rotation.x=player.pitch;
}
updateCamera();

function messageTexture(message) {
  const noteCanvas=document.createElement('canvas'); noteCanvas.width=1024; noteCanvas.height=512;
  const context=noteCanvas.getContext('2d');
  context.clearRect(0,0,noteCanvas.width,noteCanvas.height);
  context.textAlign='center'; context.textBaseline='middle'; context.font='600 50px ui-monospace, monospace';
  context.lineJoin='round'; context.lineWidth=9; context.strokeStyle='rgba(35,28,11,.92)'; context.fillStyle=/^#[0-9a-f]{6}$/i.test(message.author?.color)?message.author.color:'#e7df61';
  const lines=[]; const maxWidth=900;
  for(const paragraph of message.text.split('\n')) { let line=''; for(const word of paragraph.split(/\s+/)) { const next=line?`${line} ${word}`:word; if(context.measureText(next).width>maxWidth&&line){lines.push(line);line=word;}else line=next; } if(line)lines.push(line); }
  const shown=lines.slice(0,6), lineHeight=62, start=256-(shown.length-1)*lineHeight/2;
  shown.forEach((line,index)=>{const y=start+index*lineHeight;context.strokeText(line,512,y);context.fillText(line,512,y);});
  const texture=new THREE.CanvasTexture(noteCanvas); texture.colorSpace=THREE.SRGBColorSpace; texture.anisotropy=8; return texture;
}

function findNearestWall(position) {
  const directions=[[1,0,Math.PI],[0,1,-Math.PI/2],[-1,0,0],[0,-1,Math.PI/2]];
  let best=null;
  for(const [dx,dz,normal] of directions) for(let distance=.05;distance<2.6;distance+=.05) {
    const x=position.x+dx*distance,z=position.z+dz*distance;
    if(isWall(x,z)){
      const cellX=Math.floor(x),cellZ=Math.floor(z);
      const surface={x:dx>0?cellX:dx<0?cellX+1:position.x,z:dz>0?cellZ:dz<0?cellZ+1:position.z,normal,distance};
      if(!best||distance<best.distance)best=surface;
      break;
    }
  }
  return best || {x:position.x,z:position.z,normal:0};
}

function alignToWall(position, angle) {
  const normal=Math.round(angle/(Math.PI/2))*(Math.PI/2),nx=Math.round(Math.cos(normal)),nz=Math.round(Math.sin(normal));
  for(let probe=.04;probe<=.45;probe+=.04){
    const insideX=position.x-nx*probe,insideZ=position.z-nz*probe;
    if(!isWall(insideX,insideZ))continue;
    const cellX=Math.floor(insideX),cellZ=Math.floor(insideZ);
    return {x:nx<0?cellX:nx>0?cellX+1:Math.min(cellX+.92,Math.max(cellX+.08,position.x)),z:nz<0?cellZ:nz>0?cellZ+1:Math.min(cellZ+.92,Math.max(cellZ+.08,position.z)),normal};
  }
  return findNearestWall(position);
}

function placeMessage(message) {
  let x=message.position.x,z=message.position.z,normal;
  if(Number.isFinite(message.surfaceNormalAngle)) normal=message.surfaceNormalAngle;
  else if(Number.isFinite(message.surfaceAngle)) normal=message.surfaceAngle+Math.PI;
  else normal=findNearestWall(message.position).normal;
  const surface=alignToWall({x,z},normal);x=surface.x;z=surface.z;normal=surface.normal;
  const material=new THREE.MeshBasicMaterial({map:messageTexture(message),transparent:true,side:THREE.FrontSide,depthWrite:false,alphaTest:.08,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const note=new THREE.Mesh(new THREE.PlaneGeometry(1.35,.68),material);
  note.position.set(x+Math.cos(normal)*.022,1.5,z+Math.sin(normal)*.022);
  note.rotation.y=Math.PI/2-normal;
  note.renderOrder=2;
  note.userData.messageId=message.id;
  messageGroup.add(note);
}

function clearMessages(){while(messageGroup.children.length){const note=messageGroup.children[0];messageGroup.remove(note);note.geometry.dispose();note.material.map.dispose();note.material.dispose();}}

async function loadMessages() {
  try {
    let comments=[];
    for(let page=1;page<=10;page++){
      const response=await fetch(`${API}/repos/${config.messageOwner}/${config.messageRepo}/issues/${config.messageIssueNumber}/comments?per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':config.githubApiVersion}});
      if(!response.ok)throw new Error(response.status);
      const items=await response.json(); comments.push(...items); if(items.length<100)break;
    }
    const messages=comments.map(comment=>{try{const record=JSON.parse(comment.body);return record.version===1&&record.position&&typeof record.text==='string'?{...record,id:comment.id}:null;}catch{return null;}}).filter(Boolean);
    clearMessages(); messages.forEach(placeMessage);
    setStatus(messages.length?`${messages.length} traces are on these walls.`:'No one has marked these walls yet.');
  } catch { setStatus('Could not read the wall log. You can still explore.'); }
}

function markSurface() {
  const dirX=Math.cos(player.yaw),dirZ=Math.sin(player.yaw),deltaX=dirX===0?Infinity:Math.abs(1/dirX),deltaZ=dirZ===0?Infinity:Math.abs(1/dirZ);
  let cellX=Math.floor(player.x),cellZ=Math.floor(player.z),stepX=dirX<0?-1:1,stepZ=dirZ<0?-1:1;
  let sideX=(dirX<0?player.x-cellX:cellX+1-player.x)*deltaX,sideZ=(dirZ<0?player.z-cellZ:cellZ+1-player.z)*deltaZ;
  for(let step=0;step<64;step++){
    let distance,side;
    if(sideX<sideZ){distance=sideX;sideX+=deltaX;cellX+=stepX;side='x';}else{distance=sideZ;sideZ+=deltaZ;cellZ+=stepZ;side='z';}
    if(distance>2.5)break;
    if(isWall(cellX+.5,cellZ+.5)){
      if(side==='x')return {x:stepX>0?cellX:cellX+1,z:+(player.z+dirZ*distance).toFixed(3),normal:stepX>0?Math.PI:0};
      return {x:+(player.x+dirX*distance).toFixed(3),z:stepZ>0?cellZ:cellZ+1,normal:stepZ>0?-Math.PI/2:Math.PI/2};
    }
  }
  return null;
}

function openPanel(element){element.classList.remove('hidden');document.exitPointerLock();}
function closePanels(){document.querySelectorAll('.panel:not(.start)').forEach(element=>element.classList.add('hidden'));}
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',closePanels));
document.querySelector('#enter').addEventListener('click',()=>{document.querySelector('#start-panel').classList.add('hidden');started=true;canvas.requestPointerLock();loadMessages();});
document.addEventListener('keydown',event=>{const key=event.key.toLowerCase();if(['w','a','s','d'].includes(key))keys.add(key);if(key==='e'&&started)openPanel(messagePanel);});
document.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
document.addEventListener('mousemove',event=>{if(document.pointerLockElement!==canvas)return;player.yaw+=event.movementX*.0021;player.pitch=Math.max(-1.15,Math.min(1.15,player.pitch-event.movementY*.0018));});
canvas.addEventListener('click',()=>{if(started&&!document.querySelector('.panel:not(.hidden)'))canvas.requestPointerLock();});
marker.addEventListener('click',()=>openPanel(messagePanel));
textArea.addEventListener('input',()=>document.querySelector('#count').textContent=textArea.value.length);

nameInput.value=localStorage.getItem('backrooms-marker-name')||'';
colorInput.value=localStorage.getItem('backrooms-marker-color')||'#e7df61';
tokenInput.value=sessionStorage.getItem('backrooms-player-token')||'';

document.querySelector('#send-message').addEventListener('click',async()=>{
  const text=textArea.value.trim(),name=nameInput.value.trim()||'Unknown wanderer',color=colorInput.value,token=tokenInput.value.trim(),send=document.querySelector('#send-message');
  if(!text)return;
  if(!token){setStatus('Paste your GitHub token to use the marker.');return;}
  const surface=markSurface();
  if(!surface){setStatus('Move closer and face a wall before writing.');return;}
  localStorage.setItem('backrooms-marker-name',name);localStorage.setItem('backrooms-marker-color',color);sessionStorage.setItem('backrooms-player-token',token);send.disabled=true;
  try{
    const record={version:1,position:{x:surface.x,z:surface.z},surfaceNormalAngle:surface.normal,text:`${text}\n— ${name}`,author:{name,color},createdAt:new Date().toISOString()};
    const response=await fetch(`${API}/repos/${config.messageOwner}/${config.messageRepo}/issues/${config.messageIssueNumber}/comments`,{method:'POST',headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':config.githubApiVersion,'Content-Type':'application/json'},body:JSON.stringify({body:JSON.stringify(record)})});
    const result=await response.json();if(!response.ok)throw new Error(result.message||response.status);
    placeMessage({...record,id:result.id});textArea.value='';document.querySelector('#count').textContent='0';closePanels();setStatus('The wall remembers what you wrote.');
  }catch(error){setStatus(`The marker failed: ${error.message}.`);}finally{send.disabled=false;}
});

function animate(now){
  const dt=Math.min(.05,(now-previous)/1000);previous=now;
  if(started){const forward=(keys.has('w')?1:0)-(keys.has('s')?1:0),side=(keys.has('d')?1:0)-(keys.has('a')?1:0),length=Math.hypot(forward,side)||1,speed=player.speed*dt,nx=player.x+(Math.cos(player.yaw)*forward+Math.cos(player.yaw+Math.PI/2)*side)/length*speed,nz=player.z+(Math.sin(player.yaw)*forward+Math.sin(player.yaw+Math.PI/2)*side)/length*speed;if(canStand(nx,player.z))player.x=nx;if(canStand(player.x,nz))player.z=nz;}
  updateCamera();renderer.render(scene,camera);requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio,2));});
