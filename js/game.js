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
const markerIdentity = document.querySelector('#marker-identity');
const welcomeError = document.querySelector('#welcome-error');
const levelLabel = document.querySelector('#level-label');
const flashlightToggle = document.querySelector('#flashlight-toggle');
const minimap = document.querySelector('#minimap');
const minimapContext = minimap.getContext('2d');
const API = 'https://api.github.com';

const CELL_SIZE = 2;
const LEVELS = [
  {
    number:0,name:'THE LOBBY',tagline:'YOU ARE NOT ALONE',issueNumber:config.messageIssueNumbers?.[0]||config.messageIssueNumber||1,seed:'LEVEL 0 // THE LOBBY // yellow-static-0',wallHeight:3.2,spawn:{x:1.5,z:1.5,yaw:0},exit:{x:8,z:1},returnSpawn:{x:7.5,z:1.5,yaw:Math.PI},
    background:0x242314,fog:0x686238,fogDensity:.028,
    lights:[[2.5,1.5],[6.5,1.5],[9.5,1.5],[13.5,1.5],[1.5,5.5],[5.5,5.5],[9.5,5.5],[13.5,9.5],[6.5,9.5]],
    map:[
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
    ]
  },
  {
    number:1,name:'HABITABLE ZONE',tagline:'DO NOT FOLLOW THE PIPES',issueNumber:config.messageIssueNumbers?.[1]||2,seed:'LEVEL 1 // HABITABLE ZONE // cold-concrete',wallHeight:3.6,spawn:{x:1.5,z:1.5,yaw:0},exit:{x:10,z:1},exitTarget:2,returnWall:{x:0,z:1},returnTarget:0,returnSpawn:{x:9.5,z:1.5,yaw:Math.PI},
    background:0x1b2326,fog:0x3b474a,fogDensity:.019,
    lights:[[2.5,1.5],[6.5,1.5],[11.5,1.5],[17.5,1.5],[3.5,3.5],[9.5,3.5],[15.5,3.5],[1.5,5.5],[7.5,5.5],[13.5,5.5],[18.5,5.5],[3.5,7.5],[9.5,7.5],[15.5,7.5],[1.5,9.5],[7.5,9.5],[13.5,9.5],[18.5,11.5],[5.5,11.5]],
    map:[
      '111111111111111111111',
      '100000000010000000001',
      '101111110010111111101',
      '101000010000100000101',
      '101011010111101110101',
      '100010010000001000001',
      '111010111011111011101',
      '100010000010000010001',
      '101111011110111010101',
      '100000010000101000101',
      '101110010111101111101',
      '100000000100000000001',
      '111111111111111111111'
    ]
  }
];

const additionalLevelProfiles=[
  ['SERVICE TUNNELS','FOLLOW THE RED PIPE','red-static'],
  ['THE HUB','LISTEN FOR THE HUM','fluorescent-hum'],
  ['ABANDONED OFFICES','THE PHONES STILL RING','stale-air'],
  ['TERROR HOTEL','DO NOT ANSWER','endless-bell'],
  ['THE SUBURBS','NIGHT HAS NO SKY','night-wind'],
  ['THALASSOPHOBIA','THE WATER IS ABOVE YOU','blue-depth'],
  ['CAVE SYSTEM','LIMESTONE REMEMBERS','limestone-echo'],
  ['THE END','WHITE NOISE IS A DOOR','white-noise']
];
for(let number=2;number<=9;number++){
  const [name,tagline,seedName]=additionalLevelProfiles[number-2];
  LEVELS.push({number,name,tagline,issueNumber:config.messageIssueNumbers?.[number]||number+1,seed:`LEVEL ${number} // ${name} // ${seedName}`,wallHeight:3.6,spawn:{x:1.5,z:1.5,yaw:0},exit:{x:10,z:1},exitTarget:number===9?0:number+1,returnWall:{x:0,z:1},returnTarget:number-1,returnSpawn:{x:9.5,z:1.5,yaw:Math.PI},background:0x1b2326,fog:0x3b474a,fogDensity:.019,lights:[],map:null});
  LEVELS[number].lights=LEVELS[1].lights.map(light=>[...light]);
  LEVELS[number].map=LEVELS[1].map;
}

const player = { x: 1.5 * CELL_SIZE, z: 1.5 * CELL_SIZE, yaw: 0, pitch: 0, speed: 3.6 };
const keys = new Set();
const messageGroup = new THREE.Group();
const worldGroup = new THREE.Group();
let currentLevelIndex = 0;
let started = false;
let previous = performance.now();

function setStatus(text) { status.textContent = text; }
function cellAt(x, z) { return { x: Math.floor(x / CELL_SIZE), z: Math.floor(z / CELL_SIZE) }; }
function transitionAt(x,z){const level=LEVELS[currentLevelIndex],cell=cellAt(x,z);if(level.exit){const exit=transformedCell(level,level.exit);if(cell.x===exit.x&&cell.z===exit.z)return {target:level.exitTarget??currentLevelIndex+1};}if(level.returnWall){const wall=transformedCell(level,level.returnWall);if(cell.x===wall.x&&cell.z===wall.z)return {target:level.returnTarget??currentLevelIndex-1,returning:true};}return null;}
function isTransitionCell(x,z){return Boolean(transitionAt(x,z));}
function isWall(x, z) { const cell=cellAt(x,z),row=currentMap()[cell.z]; return !row || row[cell.x] !== '0'; }
function blocksMovement(x, z) { return isWall(x,z) && !isTransitionCell(x,z); }
function canStand(x, z) {
  const radius = 0.28;
  return !blocksMovement(x-radius,z-radius) && !blocksMovement(x+radius,z-radius) && !blocksMovement(x-radius,z+radius) && !blocksMovement(x+radius,z+radius);
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

const concreteWall = canvasTexture(256, (context, size) => {
  context.fillStyle='#667073';context.fillRect(0,0,size,size);
  for(let i=0;i<1200;i++){const shade=70+(i*41)%65;context.fillStyle=`rgba(${shade},${shade+3},${shade+4},.14)`;context.fillRect((i*67)%size,(i*101)%size,1+(i%3),1+(i%2));}
  context.strokeStyle='rgba(30,37,39,.28)';context.lineWidth=2;context.beginPath();context.moveTo(0,128);context.lineTo(size,128);context.moveTo(128,0);context.lineTo(128,size);context.stroke();
});
concreteWall.repeat.set(1.4,2.2);

const concreteFloor = canvasTexture(256, (context, size) => {
  context.fillStyle='#333b3c';context.fillRect(0,0,size,size);
  for(let i=0;i<1800;i++){const shade=38+(i*23)%45;context.fillStyle=`rgba(${shade},${shade+4},${shade+5},.18)`;context.fillRect((i*73)%size,(i*37)%size,1+(i%2),1);}
  context.strokeStyle='rgba(9,12,13,.2)';context.lineWidth=1;for(let p=0;p<size;p+=64){context.beginPath();context.moveTo(p,0);context.lineTo(p,size);context.stroke();}
});

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.add(worldGroup,messageGroup);

const camera = new THREE.PerspectiveCamera(72, innerWidth/innerHeight, .04, 60);
camera.rotation.order='YXZ';
scene.add(camera);

const flashlightGroup=new THREE.Group();flashlightGroup.position.set(.34,-.27,-.5);flashlightGroup.rotation.z=-.08;camera.add(flashlightGroup);
const flashlightBody=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,.31,16),new THREE.MeshStandardMaterial({color:0x252a2c,roughness:.38,metalness:.7}));flashlightBody.rotation.x=Math.PI/2;flashlightGroup.add(flashlightBody);
const flashlightGrip=new THREE.Mesh(new THREE.CylinderGeometry(.063,.063,.16,16),new THREE.MeshStandardMaterial({color:0x111516,roughness:.8,metalness:.25}));flashlightGrip.rotation.x=Math.PI/2;flashlightGrip.position.z=.2;flashlightGroup.add(flashlightGrip);
const flashlightRing=new THREE.Mesh(new THREE.TorusGeometry(.068,.012,8,20),new THREE.MeshStandardMaterial({color:0xe0a34c,roughness:.3,metalness:.75}));flashlightRing.rotation.x=Math.PI/2;flashlightRing.position.z=-.16;flashlightGroup.add(flashlightRing);
const flashlightLens=new THREE.Mesh(new THREE.CircleGeometry(.055,20),new THREE.MeshBasicMaterial({color:0xffe8a3}));flashlightLens.position.z=-.174;flashlightLens.rotation.y=Math.PI;flashlightGroup.add(flashlightLens);
const flashlightTarget=new THREE.Object3D();flashlightTarget.position.set(0,0,-10);camera.add(flashlightTarget);
const flashlightBeam=new THREE.SpotLight(0xffd98a,0,18,Math.PI*.2,.58,1.4);flashlightBeam.position.set(0,0,0);flashlightBeam.target=flashlightTarget;camera.add(flashlightBeam);
let flashlightOn=false;
function setFlashlight(on){flashlightOn=on;flashlightBeam.intensity=on?8.5:0;flashlightLens.material.color.set(on?0xfff0b0:0x695f43);flashlightToggle.textContent=on?'FLASHLIGHT: ON':'FLASHLIGHT: OFF';flashlightToggle.setAttribute('aria-pressed',String(on));flashlightToggle.classList.toggle('on',on);}
setFlashlight(false);

function hashSeed(text){let hash=2166136261;for(const character of text){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}
function seededRandom(seed){let value=seed>>>0;return()=>{value+=0x6d2b79f5;let result=value;result=Math.imul(result^result>>>15,result|1);result^=result+Math.imul(result^result>>>7,result|61);return((result^result>>>14)>>>0)/4294967296;};}
function seededMap(level){const variant=hashSeed(level.seed)%4;let rows=[...level.map];if(variant&1)rows=rows.map(row=>[...row].reverse().join(''));if(variant&2)rows.reverse();return rows;}
function transformedCell(level,cell){const variant=hashSeed(level.seed)%4,width=level.map[0].length,height=level.map.length;return{x:variant&1?width-1-cell.x:cell.x,z:variant&2?height-1-cell.z:cell.z};}
function transformedPoint(level,x,z){const variant=hashSeed(level.seed)%4,width=level.map[0].length,height=level.map.length;return{x:(variant&1?width-x:x)*CELL_SIZE,z:(variant&2?height-z:z)*CELL_SIZE};}
function transformedYaw(level,yaw){const variant=hashSeed(level.seed)%4;if(variant&1)yaw=Math.PI-yaw;if(variant&2)yaw=-yaw;return yaw;}
function currentMap(){return LEVELS[currentLevelIndex].seededMap;}

function drawMinimap(){
  if(!started)return;
  const map=currentMap(),width=map[0].length,height=map.length,pad=12;
  const scale=Math.min((minimap.width-pad*2)/width,(minimap.height-pad*2)/height);
  const offsetX=(minimap.width-width*scale)/2,offsetZ=(minimap.height-height*scale)/2;
  const context=minimapContext;
  context.clearRect(0,0,minimap.width,minimap.height);
  context.fillStyle='#111615e8';context.fillRect(0,0,minimap.width,minimap.height);
  context.fillStyle=currentLevelIndex===0?'#29291c':'#202a2c';
  context.fillRect(offsetX,offsetZ,width*scale,height*scale);
  context.fillStyle=currentLevelIndex===0?'#a39a62':'#718083';
  for(let z=0;z<height;z++)for(let x=0;x<width;x++)if(map[z][x]==='1')context.fillRect(offsetX+x*scale,offsetZ+z*scale,Math.ceil(scale)+.25,Math.ceil(scale)+.25);
  const level=LEVELS[currentLevelIndex];
  const drawDoor=(door,color)=>{if(!door)return;const cell=transformedCell(level,door);context.fillStyle=color;context.fillRect(offsetX+cell.x*scale,offsetZ+cell.z*scale,Math.max(3,scale),Math.max(3,scale));};
  drawDoor(level.returnWall,'#65c4c2');drawDoor(level.exit,'#f0a45f');
  const playerX=offsetX+(player.x/CELL_SIZE)*scale,playerZ=offsetZ+(player.z/CELL_SIZE)*scale;
  context.strokeStyle='#f8e879';context.lineWidth=1.5;context.beginPath();context.moveTo(playerX,playerZ);context.lineTo(playerX+Math.cos(player.yaw)*scale*1.8,playerZ+Math.sin(player.yaw)*scale*1.8);context.stroke();
  context.fillStyle='#f8e879';context.beginPath();context.arc(playerX,playerZ,Math.max(3,scale*.2),0,Math.PI*2);context.fill();
  context.fillStyle='#f5edb4';context.font='10px ui-monospace, monospace';context.fillText(`LEVEL ${level.number}`,8,12);
}

function clearWorld(){
  while(worldGroup.children.length){const object=worldGroup.children[0];worldGroup.remove(object);object.traverse(child=>{child.geometry?.dispose();if(child.material){for(const material of Array.isArray(child.material)?child.material:[child.material])material.dispose();}});}
}

function addLevelOneDetails(level,random){
  const pipeMaterial=new THREE.MeshStandardMaterial({color:0x793f31,roughness:.72,metalness:.35});
  const pipePosition=transformedPoint(level,5.5,1.09),pipe=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,15.5,10),pipeMaterial);pipe.rotation.z=Math.PI/2;pipe.position.set(pipePosition.x,level.wallHeight-.3,pipePosition.z);worldGroup.add(pipe);
  const puddleMaterial=new THREE.MeshStandardMaterial({color:0x111b1f,roughness:.16,metalness:.25,transparent:true,opacity:.72,side:THREE.DoubleSide});
  for(const [x,z] of [[5.5,1.5],[3.5,5.5],[10.5,7.5],[17.5,11.5]]){const point=transformedPoint(level,x,z),puddle=new THREE.Mesh(new THREE.CircleGeometry(.45+random()*.55,32),puddleMaterial);puddle.rotation.x=-Math.PI/2;puddle.scale.x=.65+random()*1.5;puddle.position.set(point.x,.012,point.z);worldGroup.add(puddle);}
  for(const [x,z] of [[9.5,1.5],[13.5,5.5]]){const point=transformedPoint(level,x,z),glow=new THREE.PointLight(0xd64b31,3.3,7,1.9);glow.position.set(point.x,level.wallHeight-.5,point.z);worldGroup.add(glow);}
}

function buildWorld(){
  clearWorld();
  const level=LEVELS[currentLevelIndex],map=currentMap(),width=map[0].length,height=map.length,random=seededRandom(hashSeed(level.seed));
  const isConcrete=currentLevelIndex>0;
  scene.background=new THREE.Color(level.background);scene.fog=new THREE.FogExp2(level.fog,level.fogDensity);renderer.toneMappingExposure=isConcrete?1.32:1.08;
  const wallMaterial=new THREE.MeshStandardMaterial({map:isConcrete?concreteWall:wallpaper,color:isConcrete?0x869093:0xf0e38a,roughness:isConcrete?.88:.98,metalness:0});
  const wallGeometry=new THREE.BoxGeometry(CELL_SIZE,level.wallHeight,CELL_SIZE);
  const transition=level.exit||level.returnWall,transitionCell=transition?transformedCell(level,transition):null;
  for(let z=0;z<height;z++)for(let x=0;x<width;x++)if(map[z][x]==='1'){const wall=new THREE.Mesh(wallGeometry,wallMaterial);wall.position.set((x+.5)*CELL_SIZE,level.wallHeight/2,(z+.5)*CELL_SIZE);if(transitionCell&&x===transitionCell.x&&z===transitionCell.z)wall.userData.isTransition=true;worldGroup.add(wall);}
  const floorTexture=isConcrete?concreteFloor:carpet;floorTexture.repeat.set(width,height);
  const floorMaterial=new THREE.MeshStandardMaterial({map:floorTexture,color:isConcrete?0x788386:0xb8ae77,roughness:isConcrete?.72:1,metalness:isConcrete?.08:0});
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(width*CELL_SIZE,height*CELL_SIZE),floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.set(width*CELL_SIZE/2,0,height*CELL_SIZE/2);worldGroup.add(floor);
  const ceilingMaterial=new THREE.MeshStandardMaterial({color:isConcrete?0x30393b:0xc9c49a,roughness:.93,side:THREE.DoubleSide});
  const ceiling=new THREE.Mesh(new THREE.PlaneGeometry(width*CELL_SIZE,height*CELL_SIZE),ceilingMaterial);ceiling.rotation.x=Math.PI/2;ceiling.position.set(width*CELL_SIZE/2,level.wallHeight,height*CELL_SIZE/2);worldGroup.add(ceiling);
  worldGroup.add(new THREE.HemisphereLight(isConcrete?0xa9bcc0:0xeee8a8,isConcrete?0x263235:0x514b28,isConcrete?.82:1.12));
  worldGroup.add(new THREE.AmbientLight(isConcrete?0x718084:0x8d8652,isConcrete?.46:.24));
  const lightColor=isConcrete?0xffb06a:0xfff7b0,lightMaterial=new THREE.MeshBasicMaterial({color:lightColor}),fixtureGeometry=new THREE.BoxGeometry(isConcrete?.85:1.3,.035,isConcrete?.3:.18);
  for(const [cellX,cellZ] of level.lights){const cell=transformedCell(level,{x:cellX-.5,z:cellZ-.5}),worldX=(cell.x+.5)*CELL_SIZE,worldZ=(cell.z+.5)*CELL_SIZE;if(isWall(worldX,worldZ))continue;const fixture=new THREE.Mesh(fixtureGeometry,lightMaterial);fixture.position.set(worldX,level.wallHeight-.035,worldZ);worldGroup.add(fixture);const light=new THREE.PointLight(lightColor,(isConcrete?3.8:2.15)+random()*.5,isConcrete?11:9,1.75);light.position.set(worldX,level.wallHeight-.3,worldZ);worldGroup.add(light);}
  if(isConcrete)addLevelOneDetails(level,random);
}

LEVELS.forEach(level=>{level.seededMap=seededMap(level);});
buildWorld();

async function syncLevelSeeds(){
  await Promise.all(LEVELS.map(async level=>{
    try{const response=await fetch(`${API}/repos/${config.messageOwner}/${config.messageRepo}/issues/${level.issueNumber}`,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':config.githubApiVersion}});if(!response.ok)throw new Error(response.status);const issue=await response.json();if(typeof issue.title==='string'&&issue.title.trim())level.seed=issue.title.trim();}catch{/* The configured fallback title keeps the level deterministic offline. */}
    level.seededMap=seededMap(level);
  }));
  if(!started&&currentLevelIndex===0)buildWorld();
}
const metadataReady=syncLevelSeeds();

function updateCamera() {
  camera.position.set(player.x,1.68,player.z);
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
  for(const [dx,dz,normal] of directions) for(let distance=.05;distance<CELL_SIZE*2.6;distance+=.05) {
    const x=position.x+dx*distance,z=position.z+dz*distance;
    if(isWall(x,z)){
      const cell=cellAt(x,z),minX=cell.x*CELL_SIZE,minZ=cell.z*CELL_SIZE;
      const surface={x:dx>0?minX:dx<0?minX+CELL_SIZE:position.x,z:dz>0?minZ:dz<0?minZ+CELL_SIZE:position.z,normal,distance};
      if(!best||distance<best.distance)best=surface;
      break;
    }
  }
  return best || {x:position.x,z:position.z,normal:0};
}

function alignToWall(position, angle) {
  const normal=Math.round(angle/(Math.PI/2))*(Math.PI/2),nx=Math.round(Math.cos(normal)),nz=Math.round(Math.sin(normal));
  for(let probe=.04;probe<=CELL_SIZE*.55;probe+=.04){
    const insideX=position.x-nx*probe,insideZ=position.z-nz*probe;
    if(!isWall(insideX,insideZ))continue;
    const cell=cellAt(insideX,insideZ),minX=cell.x*CELL_SIZE,minZ=cell.z*CELL_SIZE;
    return {x:nx<0?minX:nx>0?minX+CELL_SIZE:Math.min(minX+CELL_SIZE-.08,Math.max(minX+.08,position.x)),z:nz<0?minZ:nz>0?minZ+CELL_SIZE:Math.min(minZ+CELL_SIZE-.08,Math.max(minZ+.08,position.z)),normal};
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

async function loadMessages(levelIndex=currentLevelIndex) {
  const level=LEVELS[levelIndex];
  try {
    let comments=[];
    for(let page=1;page<=10;page++){
      const response=await fetch(`${API}/repos/${config.messageOwner}/${config.messageRepo}/issues/${level.issueNumber}/comments?per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':config.githubApiVersion}});
      if(!response.ok)throw new Error(response.status);
      const items=await response.json(); comments.push(...items); if(items.length<100)break;
    }
    if(levelIndex!==currentLevelIndex)return;
    const messages=comments.map(comment=>{try{const record=JSON.parse(comment.body);if(record.version!==1||!record.position||typeof record.text!=='string'||record.seed&&record.seed!==level.seed)return null;const sourceScale=Number.isFinite(record.worldScale)?record.worldScale:1,scale=CELL_SIZE/sourceScale;return {...record,position:{x:record.position.x*scale,z:record.position.z*scale},id:comment.id};}catch{return null;}}).filter(Boolean);
    clearMessages(); messages.forEach(placeMessage);
    setStatus(messages.length?`${messages.length} traces are on these walls.`:'No one has marked these walls yet.');
  } catch { if(levelIndex===currentLevelIndex)setStatus('Could not read the wall log. You can still explore.'); }
}

function markSurface() {
  const dirX=Math.cos(player.yaw),dirZ=Math.sin(player.yaw),maxDistance=CELL_SIZE*2.5;
  let previous=cellAt(player.x,player.z);
  for(let distance=.025;distance<=maxDistance;distance+=.025){
    const x=player.x+dirX*distance,z=player.z+dirZ*distance,cell=cellAt(x,z);
    if(isWall(x,z)){
      const minX=cell.x*CELL_SIZE,minZ=cell.z*CELL_SIZE;
      if(cell.x!==previous.x)return {x:dirX>0?minX:minX+CELL_SIZE,z:+z.toFixed(3),normal:dirX>0?Math.PI:0};
      return {x:+x.toFixed(3),z:dirZ>0?minZ:minZ+CELL_SIZE,normal:dirZ>0?-Math.PI/2:Math.PI/2};
    }
    previous=cell;
  }
  return null;
}

function reachTransition(transition){
  if(!started)return;
  const target=LEVELS[transition.target],arrival=transition.returning?target.returnSpawn:null;
  enterLevel(transition.target,arrival,transition.returning?`Back in Level ${target.number}. The wall still remembers the way through.`:`Level ${target.number}. ${target.tagline}.`);
}

function enterLevel(levelIndex,arrival=null,entryStatus=null){
  currentLevelIndex=levelIndex;
  const level=LEVELS[levelIndex];
  keys.clear();buildWorld();clearMessages();
  const arrivalPoint=arrival||level.spawn,spawn=transformedPoint(level,arrivalPoint.x,arrivalPoint.z);player.x=spawn.x;player.z=spawn.z;player.yaw=transformedYaw(level,arrivalPoint.yaw);player.pitch=0;
  levelLabel.innerHTML=`LEVEL ${level.number} <span>///</span> ${level.tagline}`;
  document.title=`BACKROOMS // LEVEL ${level.number}`;document.body.dataset.level=String(level.number);
  document.querySelectorAll('.panel').forEach(panel=>panel.classList.add('hidden'));
  minimap.classList.remove('hidden');
  setStatus(entryStatus||(levelIndex===0?'Find the wall that does not hold.':'Concrete, pipes, and distant machinery. Leave a trace.'));
  started=true;drawMinimap();canvas.requestPointerLock();loadMessages(levelIndex);
}

function openPanel(element){element.classList.remove('hidden');document.exitPointerLock();}
function closePanels(){document.querySelectorAll('.panel:not(.start)').forEach(element=>element.classList.add('hidden'));}
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',closePanels));
document.addEventListener('keydown',event=>{const key=event.key.toLowerCase();if(['w','a','s','d'].includes(key))keys.add(key);if(key==='f'&&started&&!event.target.matches('input,textarea')){setFlashlight(!flashlightOn);event.preventDefault();}if(key==='e'&&started)openPanel(messagePanel);});
document.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
document.addEventListener('mousemove',event=>{if(document.pointerLockElement!==canvas)return;player.yaw+=event.movementX*.0021;player.pitch=Math.max(-1.15,Math.min(1.15,player.pitch-event.movementY*.0018));});
canvas.addEventListener('click',()=>{if(started&&!document.querySelector('.panel:not(.hidden)'))canvas.requestPointerLock();});
marker.addEventListener('click',()=>openPanel(messagePanel));
flashlightToggle.addEventListener('click',()=>{if(started)setFlashlight(!flashlightOn);});
textArea.addEventListener('input',()=>document.querySelector('#count').textContent=textArea.value.length);

nameInput.value=localStorage.getItem('backrooms-marker-name')||'';
colorInput.value=localStorage.getItem('backrooms-marker-color')||'#e7df61';
tokenInput.value=sessionStorage.getItem('backrooms-player-token')||'';
function updateMarkerIdentity(){markerIdentity.textContent=nameInput.value.trim()||'Unknown wanderer';markerIdentity.style.color=colorInput.value;}
updateMarkerIdentity();
nameInput.addEventListener('input',updateMarkerIdentity);
colorInput.addEventListener('input',updateMarkerIdentity);
document.querySelector('#enter').addEventListener('click',async()=>{
  const name=nameInput.value.trim(),token=tokenInput.value.trim();
  if(!name){welcomeError.textContent='Choose a marker name before entering.';nameInput.focus();return;}
  if(!token){welcomeError.textContent='Paste a GitHub token or create one before entering.';tokenInput.focus();return;}
  localStorage.setItem('backrooms-marker-name',name);localStorage.setItem('backrooms-marker-color',colorInput.value);sessionStorage.setItem('backrooms-player-token',token);welcomeError.textContent='';updateMarkerIdentity();await metadataReady;enterLevel(0);
});
document.querySelector('#send-message').addEventListener('click',async()=>{
  const text=textArea.value.trim(),name=nameInput.value.trim()||'Unknown wanderer',color=colorInput.value,token=tokenInput.value.trim(),send=document.querySelector('#send-message');
  if(!text)return;
  if(!token){setStatus('Paste your GitHub token to use the marker.');return;}
  const surface=markSurface();
  if(!surface){setStatus('Move closer and face a wall before writing.');return;}
  localStorage.setItem('backrooms-marker-name',name);localStorage.setItem('backrooms-marker-color',color);sessionStorage.setItem('backrooms-player-token',token);send.disabled=true;
  try{
    const level=LEVELS[currentLevelIndex],record={version:1,worldScale:CELL_SIZE,level:currentLevelIndex,seed:level.seed,position:{x:surface.x,z:surface.z},surfaceNormalAngle:surface.normal,text:`${text}\n— ${name}`,author:{name,color},createdAt:new Date().toISOString()};
    const response=await fetch(`${API}/repos/${config.messageOwner}/${config.messageRepo}/issues/${level.issueNumber}/comments`,{method:'POST',headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':config.githubApiVersion,'Content-Type':'application/json'},body:JSON.stringify({body:JSON.stringify(record)})});
    const result=await response.json();if(!response.ok)throw new Error(result.message||response.status);
    placeMessage({...record,id:result.id});textArea.value='';document.querySelector('#count').textContent='0';closePanels();setStatus('The wall remembers what you wrote.');
  }catch(error){setStatus(`The marker failed: ${error.message}.`);}finally{send.disabled=false;}
});

function animate(now){
  const dt=Math.min(.05,(now-previous)/1000);previous=now;
  if(started){const forward=(keys.has('w')?1:0)-(keys.has('s')?1:0),side=(keys.has('d')?1:0)-(keys.has('a')?1:0),length=Math.hypot(forward,side)||1,speed=player.speed*dt,nx=player.x+(Math.cos(player.yaw)*forward+Math.cos(player.yaw+Math.PI/2)*side)/length*speed,nz=player.z+(Math.sin(player.yaw)*forward+Math.sin(player.yaw+Math.PI/2)*side)/length*speed;if(canStand(nx,player.z))player.x=nx;if(canStand(player.x,nz))player.z=nz;const transition=transitionAt(player.x,player.z);if(transition)reachTransition(transition);}
  updateCamera();drawMinimap();renderer.render(scene,camera);requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio,2));});
