import {BoxGeometry,PlaneGeometry,TorusGeometry,CanvasTexture,SRGBColorSpace,RepeatWrapping,MeshStandardMaterial,MeshBasicMaterial,DoubleSide,type BufferGeometry} from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {labVisualTheme} from './assemblyVisualTheme'

type V=[number,number,number]
type Region=[number,number,number,number]
/** Static architectural batches. Furniture never enters the camera's r=25 / y=23 envelope. */
export function createLaboratory(){
 const theme=labVisualTheme(),size=2048,canvas=document.createElement('canvas');canvas.width=canvas.height=size
 const atlas=new CanvasTexture(canvas);atlas.colorSpace=SRGBColorSpace;atlas.anisotropy=4
 const regions={identity:[0,0,1024,256],museum:[1024,0,512,256],cpu:[0,256,512,512],board:[512,256,512,512],pcie:[1024,256,512,512],peg:[1536,0,512,768],scope:[0,768,512,384],meter:[512,768,512,384]} satisfies Record<string,Region>
 const paint=()=>{
  const c=canvas.getContext('2d')!;c.fillStyle=theme.surface;c.fillRect(0,0,size,size)
  const text=(value:string,x:number,y:number,font=24,color='#dfdfd8')=>{c.font=`500 ${font}px "IBM Plex Mono",monospace`;c.fillStyle=color;c.fillText(value,x,y)}
  text('C O R E',48,88,68,theme.amber);text('/ HARDWARE ASSEMBLY LAB',48,154,46);text('PRECISION   /   DISCOVERY   /   ENGINEERING',48,216,22,'#9b9d9b')
  text('CORE / MUSEUM',1060,90,35,theme.amber);text('CONNECTED ARCHIVE',1060,142,24);text('RESEARCH WING  /  09',1060,194,22,'#999e9e')
  for(const [index,key]of (['cpu','board','pcie'] as const).entries()){
   const [x,y,w,h]=regions[key];c.save();c.translate(x,y);c.strokeStyle='#ffb54733';c.lineWidth=1
   for(let n=32;n<480;n+=32){c.beginPath();c.moveTo(n,60);c.lineTo(n,474);c.moveTo(24,n+50);c.lineTo(488,n+50);c.stroke()}
   text(['01 / PROCESSOR','02 / MAINBOARD','03 / PCIe BUS'][index],24,42,28,theme.amber);c.strokeStyle='#d5dad5';c.lineWidth=3
   if(key==='cpu'){
    c.strokeRect(142,158,228,228);c.strokeRect(184,200,144,144)
    for(let n=0;n<12;n++){const p=154+n*18;c.beginPath();c.moveTo(p,135);c.lineTo(p,158);c.moveTo(p,386);c.lineTo(p,409);c.moveTo(119,p+4);c.lineTo(142,p+4);c.moveTo(370,p+4);c.lineTo(393,p+4);c.stroke()}
    text('CORE',208,266,28);text('CACHE',210,302,18);text('AM4  /  SOCKET INTERFACE',40,466,22)
   }else if(key==='board'){
    c.strokeRect(91,92,330,342);c.strokeRect(140,145,100,100)
    for(let n=0;n<4;n++)c.strokeRect(280+n*25,124,14,176)
    for(let n=0;n<3;n++)c.strokeRect(132,327+n*28,230,12)
    c.strokeRect(112,121,15,145);c.strokeRect(283,383,85,32)
    text('CPU',157,202,24);text('DDR',283,111,18);text('mATX  /  SIGNAL TOPOLOGY',40,466,22)
   }else{
    for(let n=0;n<3;n++){c.strokeRect(60,140+n*92,390,24);for(let k=0;k<23;k++){c.beginPath();c.moveTo(78+k*15,140+n*92);c.lineTo(78+k*15,164+n*92);c.stroke()}text(['x16 / GRAPHICS','x4 / EXPANSION','x1 / CONTROL'][n],72,202+n*92,23)}
    text('KEYED / DIFFERENTIAL LANES',34,466,22)
   }
   c.restore();void w;void h
  }
  c.fillStyle='#1d2022';c.fillRect(...regions.peg);c.fillStyle='#080a0b';for(let y=16;y<768;y+=24)for(let x=1552;x<2048;x+=24){c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill()}
  for(const [index,key]of (['scope','meter'] as const).entries()){
   const [x,y,w,h]=regions[key];c.fillStyle='#071012';c.fillRect(x,y,w,h);c.save();c.translate(x,y);c.strokeStyle='#a2d8d122';c.lineWidth=1
   for(let n=24;n<512;n+=32){c.beginPath();c.moveTo(n,58);c.lineTo(n,326);c.stroke()}for(let n=70;n<326;n+=32){c.beginPath();c.moveTo(22,n);c.lineTo(490,n);c.stroke()}
   text(index?'DIGITAL MULTIMETER':'SIGNAL ANALYZER',24,38,25,'#c4d0cf')
   if(index){text('12.004',50,190,78,theme.amber);text('V DC   /   BENCH REFERENCE',32,254,24);text('ISOLATED / STANDBY',32,332,20,'#99b0b0')}
   else{c.strokeStyle=theme.cyan;c.lineWidth=3;c.beginPath();for(let n=24;n<490;n++){const y=183+Math.sin(n*.062)*55+(n%140>110?Math.sin(n*.28)*16:0);if(n===24)c.moveTo(n,y);else c.lineTo(n,y)}c.stroke();text('CH 1  /  1.00 V  /  1.0 ms',24,350,22,'#a8c4c1')}
   c.restore()
  }
  const labels=['PROCESSORS','DDR4 MEMORY','GRAPHICS','SATA DRIVES','COOLING','POWER','I/O MODULES','ESD / TOOLS']
  labels.forEach((label,i)=>{const x=i%4*512,y=1152+Math.floor(i/4)*256;c.strokeStyle='#ffb54788';c.lineWidth=3;c.strokeRect(x+16,y+16,480,210);text(label,x+36,y+100,34);text(`CORE / STOCK 0${i+1}`,x+36,y+160,22,theme.amber)})
  atlas.needsUpdate=true
 }
 paint()
 const noise=document.createElement('canvas');noise.width=noise.height=512;const n=noise.getContext('2d')!;n.fillStyle='#191c1e';n.fillRect(0,0,512,512);let seed=913
 for(let i=0;i<18000;i++){seed=(1664525*seed+1013904223)>>>0;n.fillStyle=i%2?'#ffffff07':'#0000000b';n.fillRect(seed%512,(seed>>>12)%512,1+seed%3,1)}n.strokeStyle='#090a0b88';n.strokeRect(0,0,512,512)
 const floorMap=new CanvasTexture(noise);floorMap.colorSpace=SRGBColorSpace;floorMap.wrapS=floorMap.wrapT=RepeatWrapping;floorMap.repeat.set(24,24);floorMap.anisotropy=4
 const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=64;const sc=contactCanvas.getContext('2d')!,gradient=sc.createRadialGradient(32,32,4,32,32,32);gradient.addColorStop(0,'#000000a0');gradient.addColorStop(1,'#00000000');sc.fillStyle=gradient;sc.fillRect(0,0,64,64);const contactMap=new CanvasTexture(contactCanvas)
 const materials={
  wall:new MeshStandardMaterial({color:'#171a1d',metalness:.18,roughness:.72}),inset:new MeshStandardMaterial({color:'#0d1012',roughness:.83}),steel:new MeshStandardMaterial({color:'#4b5054',metalness:.7,roughness:.44}),plastic:new MeshStandardMaterial({color:'#24282b',roughness:.65,metalness:.14}),
  floor:new MeshStandardMaterial({map:floorMap,roughness:.64,metalness:.16,envMapIntensity:.26}),amber:new MeshBasicMaterial({color:theme.amber,toneMapped:false}),task:new MeshBasicMaterial({color:'#d4d4c6',toneMapped:false}),print:new MeshBasicMaterial({map:atlas,toneMapped:false}),
  glass:new MeshStandardMaterial({color:'#8ca4a5',metalness:.32,roughness:.23,transparent:true,opacity:.13,depthWrite:false,side:DoubleSide,envMapIntensity:.5}),contact:new MeshBasicMaterial({map:contactMap,transparent:true,depthWrite:false,toneMapped:false})
 }
 type Finish=keyof typeof materials
 const pools=Object.fromEntries(Object.keys(materials).map(key=>[key,[] as BufferGeometry[]])) as Record<Finish,BufferGeometry[]>
 const box=(finish:Finish,at:V,dimensions:V,angle=0)=>pools[finish].push(new BoxGeometry(...dimensions).translate(...at).rotateY(angle))
 const plate=(at:V,dimensions:[number,number],region:Region,angle=0)=>{const g=new PlaneGeometry(...dimensions),uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,(region[0]+uv.getX(i)*region[2])/size,1-(region[1]+(1-uv.getY(i))*region[3])/size);pools.print.push(g.translate(...at).rotateY(angle))}
 const ao=(at:V,dimensions:[number,number],angle=0)=>pools.contact.push(new PlaneGeometry(...dimensions).rotateX(-Math.PI/2).translate(...at).rotateY(angle))
 // Continuous floor/ceiling, four complete panel elevations, framed glass to a closed museum annex.
 pools.floor.push(new PlaneGeometry(96,96).rotateX(-Math.PI/2).translate(0,-.12,0))
 box('inset',[0,26.7,0],[64,.3,64])
 for(let face=0;face<4;face++){
  const a=face*Math.PI/2
  for(let bay=0;bay<8;bay++){
   const x=-28+bay*8,window=Math.abs(x)===4
   box('steel',[x-3.94,13,-32],[.12,26,.24],a)
   if(window){box('glass',[x,10,-32],[7.7,16,.06],a);box('wall',[x,23,-32],[7.85,6,.3],a);box('wall',[x,1,-32],[7.85,2,.3],a);for(const y of [2,18])box('steel',[x,y,-31.9],[7.85,.10,.20],a)}
   else{box('wall',[x,13,-32],[7.85,26,.3],a);for(const y of [4.5,13,21.5])box('inset',[x,y,-31.81],[7.25,7.8,.08],a);box('amber',[x+3.4,12,-31.70],[.025,20,.025],a)}
   box('steel',[x,25.8,-31.7],[7.85,.2,.45],a);box('amber',[x,25.62,-31.50],[7.55,.035,.04],a)
  }
  for(const y of [.35,8.7,19.9])box('steel',[0,y,-31.75],[64,.12,.26],a)
  box('amber',[0,.65,-31.54],[63.8,.035,.035],a)
  box('inset',[0,4.7,-31.62],[15.2,3.8,.16],a);plate([0,4.7,-31.51],[14.6,3.65],regions.identity,a)
  // Visible museum continuity has a floor, end wall and repeated portal frames, not an open horizon.
  box('wall',[0,9,-46],[17,18,.3],a);plate([0,11,-45.8],[10,5],regions.museum,a)
  for(const side of [-1,1]){box('wall',[side*8.5,9,-39],[.2,18,14],a);box('amber',[side*8.3,1,-39],[.04,.04,14],a)}
  box('inset',[0,18.1,-39],[17,.2,14],a)
  for(const z of [-34,-39,-44]){for(const side of [-1,1]){box('steel',[side*7.9,9,z],[.16,18,.20],a);box('amber',[side*7.75,9,z+.12],[.025,17.5,.025],a)}box('steel',[0,17.8,z],[16,.16,.20],a)}
  // Technical wall diagrams in bevel-like layered frames above low cabinets.
  for(const [j,x]of [-22,-13,13].entries()){
   box('steel',[x,7.3,-31.5],[6.2,6.4,.18],a);box('inset',[x,7.3,-31.35],[5.95,6.15,.12],a);plate([x,7.3,-31.27],[5.75,5.75],regions[(['cpu','board','pcie'] as const)[(j+face)%3]],a)
  }
  // ESD bench bays and diagnostic instruments. Frontmost depth=26.8, beyond all allowed orbits.
  for(const x of [-19,-11]){
   box('plastic',[x,1.5,-29],[6.8,2.9,3.6],a);box('steel',[x,3.02,-28.9],[7.0,.14,3.9],a);box('inset',[x,3.11,-28.8],[6.7,.035,3.6],a)
   for(let d=0;d<3;d++){box('wall',[x,2.4-d*.85,-27.15],[6.5,.70,.05],a);box('steel',[x,2.5-d*.85,-27.09],[2,.035,.06],a)}ao([x,-.105,-28.7],[8,5],a)
  }
  for(const [i,x]of [-20.6,-17.1].entries()){
   box('plastic',[x,4.12,-29.1],[2.9,1.9,1.6],a);box('steel',[x,4.12,-28.26],[2.68,1.69,.06],a);plate([x-.28,4.16,-28.215],[2.1,1.57],i?regions.meter:regions.scope,a)
   for(let k=0;k<3;k++){box('inset',[x+1.16,4.7-k*.5,-28.18],[.18,.18,.1],a);box('amber',[x+1.17,4.72-k*.5,-28.12],[.035,.04,.01],a)}
  }
  // Precision tools, ESD wrist strap and organized cable loops on a perforated panel.
  box('steel',[-11,6,-31.3],[6.2,3.5,.10],a);plate([-11,6,-31.23],[6,3.3],regions.peg,a)
  for(let i=0;i<5;i++){const x=-13.5+i*.75;box('plastic',[x,6.6,-31.10],[.12,.42,.12],a);box('steel',[x,6.12,-31.10],[.035,.58,.035],a);box('amber',[x,6.8,-31.09],[.125,.025,.13],a)}
  for(let i=0;i<3;i++)pools.plastic.push(new TorusGeometry(.24+i*.03,.018,5,24).translate(-9.1,5.7,-31.04).rotateY(a))
  pools.steel.push(new TorusGeometry(.18,.028,5,24).translate(-12,5.3,-31.05).rotateY(a))
  for(const side of [-1,1])box('steel',[-11+side*.11,5.35,-31.08],[.055,.62,.09],a)
  // Right-hand stock wall with drawers, labelled ESD boxes and closed top cabinetry.
  for(const x of [22,30])box('steel',[x,6.2,-29.5],[.13,12.4,3.6],a)
  for(let row=0;row<4;row++){
   const y=.4+row*2.8;box('steel',[26,y,-29.4],[8.1,.13,3.8],a)
   for(let col=0;col<3;col++){const x=23.2+col*2.8;box('plastic',[x,y+1.05,-29.5],[2.5,1.8,2.9],a);plate([x,y+1.08,-28.035],[2.22,1.11],[col*512,1152+(row%2)*256,512,256],a);box('steel',[x,y+1.7,-28.01],[1.8,.07,.06],a)}
  }
  ao([26,-.105,-29],[10,5],a)
  // Ceiling coffer rails lead the eye toward the workstation task lights.
  for(const x of [-20,-10,0,10,20])box('steel',[x,26.3,0],[.12,.35,64],a)
 }
 for(const x of [-8,3]){
  box('steel',[x,25.7,2],[.12,1.4,.12]);box('plastic',[x,24.9,2],[.8,.18,14]);box('task',[x,24.78,2],[.55,.035,13.5]);box('amber',[x+.42,24.88,2],[.025,.04,13.6])
 }
 // Restrained circulation/ESD safety marks, well clear of the unchanged workbench.
 for(const x of [-9.7,6.7])box('amber',[x,-.105,.6],[.025,.008,11]);for(const z of [-4.9,6.1])box('amber',[-1.5,-.105,z],[16.4,.008,.025])
 const batches=Object.entries(pools).filter(([,pool])=>pool.length).map(([key,pool])=>{const geometry=mergeGeometries(pool)!;pool.forEach(g=>g.dispose());return {geometry,material:materials[key as Finish],key}})
 return {batches,refresh:paint,dispose(){batches.forEach(b=>b.geometry.dispose());Object.values(materials).forEach(m=>m.dispose());atlas.dispose();floorMap.dispose();contactMap.dispose()}}
}
