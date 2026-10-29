import {labVisualTheme} from './assemblyVisualTheme'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {createContext,useContext,useMemo,useEffect,useRef,useState,type ReactNode} from 'react'
import gsap from 'gsap'
import {useFrame} from '@react-three/fiber'
import {CanvasTexture,SRGBColorSpace,PlaneGeometry,BoxGeometry,EdgesGeometry,LineBasicMaterial,CylinderGeometry,TorusGeometry,CircleGeometry,ExtrudeGeometry,Shape,Path,MeshStandardMaterial,MeshBasicMaterial,type Group} from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {boardOrigin,casePanels,type PartId,type V3} from './assemblyDefinition'
import {useAssembly} from './assemblyStore'
import {scenarios} from './troubleshooting'
import {useReducedMotion} from '@/hooks/usePreferences'

function shroudGeometry(){
 const shape=new Shape();shape.moveTo(-1.08,-1.825);shape.lineTo(1.08,-1.825);shape.lineTo(1.08,1.825);shape.lineTo(-1.08,1.825);shape.closePath()
 // Apertures let the fixed educational cable routes pass through the PSU cover.
 for(const [left,right,back,front] of [[.72,1.04,.20,1.10],[.84,1.04,-1.75,-1.15],[-.78,-.12,.15,1.05]]){
  const hole=new Path();hole.moveTo(left,-back);hole.lineTo(right,-back);hole.lineTo(right,-front);hole.lineTo(left,-front);hole.closePath();shape.holes.push(hole)
 }
 return new ExtrudeGeometry(shape,{depth:.07,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2)
}
function casePanel(holes:number[][]){const shape=new Shape();shape.moveTo(-1.06,1.07);shape.lineTo(1.06,1.07);shape.lineTo(1.06,5.13);shape.lineTo(-1.06,5.13);shape.closePath();for(const [x,y,w,h] of holes){const p=new Path();p.moveTo(x-w/2,y-h/2);p.lineTo(x-w/2,y+h/2);p.lineTo(x+w/2,y+h/2);p.lineTo(x+w/2,y-h/2);p.closePath();shape.holes.push(p)}return new ExtrudeGeometry(shape,{depth:.035,bevelEnabled:false})}
function contactTexture(){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d')!,g=ctx.createRadialGradient(32,32,2,32,32,32);g.addColorStop(0,'rgba(0,0,0,.7)');g.addColorStop(.6,'rgba(0,0,0,.32)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new CanvasTexture(c)}
function engravingTexture(){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;const c=canvas.getContext('2d')!;c.clearRect(0,0,512,64);c.font='22px monospace';c.fillStyle='#c0c7bd';c.textAlign='center';c.fillText('USB · AUDIO · ⏻',256,40);const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;return map}
function brushedTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d')!;c.fillStyle='#d6d6d6';c.fillRect(0,0,128,128);let seed=91;for(let y=0;y<128;y++){seed=(seed*1664525+1013904223)>>>0;c.fillStyle=`rgba(90,90,90,${.03+(seed%40)/400})`;c.fillRect(0,y,128,1)}return new CanvasTexture(canvas)}
function bladeGeometry(){const shape=new Shape();shape.moveTo(.09,-.04);shape.quadraticCurveTo(.28,-.10,.43,.02);shape.quadraticCurveTo(.41,.13,.34,.14);shape.quadraticCurveTo(.23,.04,.10,.07);shape.closePath();return new ExtrudeGeometry(shape,{depth:.022,bevelEnabled:false})}
function createResources(){const theme=labVisualTheme(),rails=[new BoxGeometry(1.08,.1,.12).translate(0,.49,0),new BoxGeometry(1.08,.1,.12).translate(0,-.49,0),new BoxGeometry(.1,.88,.12).translate(.49,0,0),new BoxGeometry(.1,.88,.12).translate(-.49,0,0)],fanFrame=mergeGeometries(rails)!,pins=Array.from({length:64},(_,i)=>new BoxGeometry(.012,.012,.035).translate(-.15+(i%8)*.043,-.15+Math.floor(i/8)*.043,-.035)),cpuPins=mergeGeometries(pins)!;[...rails,...pins].forEach(g=>g.dispose());const box=new BoxGeometry(),beveled=new RoundedBoxGeometry(1,1,1,1,.025),brush=brushedTexture(),contact=contactTexture(),engraving=engravingTexture();return {box,beveled,brush,blade:bladeGeometry(),contact,engraving,engravingMaterial:new MeshBasicMaterial({map:engraving,transparent:true,depthWrite:false,toneMapped:false}),plane:new PlaneGeometry(),contactMaterial:new MeshBasicMaterial({map:contact,transparent:true,depthWrite:false,opacity:.65}),front:casePanel(casePanels.front.holes),rear:casePanel(casePanels.rear.holes),outline:new EdgesGeometry(box),mutedOutlineMaterial:new LineBasicMaterial({color:"#777777",transparent:true,opacity:.16}),outlineMaterial:new LineBasicMaterial({color:theme.amber,transparent:true,opacity:.32}),shroud:shroudGeometry(),fanFrame,cpuPins,key:new CircleGeometry(.036,3),cylinder:new CylinderGeometry(1,1,1,20),ring:new TorusGeometry(.43,.032,5,28),materials:{
 metal:new MeshStandardMaterial({color:'#444649',metalness:.78,roughness:.42,roughnessMap:brush}),dark:new MeshStandardMaterial({color:theme.surface,metalness:.55,roughness:.40,roughnessMap:brush}),pcb:new MeshStandardMaterial({color:'#1b2725',metalness:.22,roughness:.57}),
 chip:new MeshStandardMaterial({color:'#101112',roughness:.72}),gold:new MeshStandardMaterial({color:'#bb9b57',metalness:.78,roughness:.34}),silver:new MeshStandardMaterial({color:'#929497',metalness:.85,roughness:.34,roughnessMap:brush}),
 cyan:new MeshBasicMaterial({color:theme.cyan}),amber:new MeshBasicMaterial({color:theme.amber,toneMapped:false}),mat:new MeshStandardMaterial({color:'#2c2d2e',roughness:.94,roughnessMap:brush}),bench:new MeshStandardMaterial({color:'#242526',metalness:.08,roughness:.72,roughnessMap:brush,envMapIntensity:.18}),rubber:new MeshStandardMaterial({color:'#111213',roughness:.9}),glass:new MeshStandardMaterial({color:'#151719',metalness:.55,roughness:.16,envMapIntensity:1.0,transparent:true,opacity:.93,depthWrite:true}),
 },dispose(){this.box.dispose();this.beveled.dispose();this.brush.dispose();this.blade.dispose();this.contact.dispose();this.engraving.dispose();this.engravingMaterial.dispose();this.plane.dispose();this.contactMaterial.dispose();this.front.dispose();this.rear.dispose();this.outline.dispose();this.outlineMaterial.dispose();this.mutedOutlineMaterial.dispose();this.shroud.dispose();this.fanFrame.dispose();this.cpuPins.dispose();this.key.dispose();this.cylinder.dispose();this.ring.dispose();Object.values(this.materials).forEach(m=>m.dispose())}}}
const Resources=createContext<ReturnType<typeof createResources>|null>(null)
export function AssemblyResources({children}:{children:ReactNode}){const resources=useMemo(()=>createResources(),[]);useEffect(()=>()=>resources.dispose(),[resources]);return <Resources.Provider value={resources}>{children}</Resources.Provider>}
type Finish=keyof ReturnType<typeof createResources>['materials']
export function LabBox({at=[0,0,0],size,finish='metal',rotation=[0,0,0],...rest}:{at?:V3;size:V3;finish?:Finish;rotation?:V3;raycast?:()=>null}){
 const r=useContext(Resources)!;return <mesh position={at} scale={size} rotation={rotation} geometry={["metal","dark","silver","rubber","bench"].includes(finish)?r.beveled:r.box} material={r.materials[finish]} dispose={null} {...rest}/>
}
export function IOMarking(){const r=useContext(Resources)!;return <mesh position={[.25,5.253,1.13]} rotation={[-Math.PI/2,0,0]} scale={[1.6,.16,1]} geometry={r.plane} material={r.engravingMaterial} raycast={()=>null} dispose={null}/>}
export function ContactPatch({at,size}:{at:V3;size:[number,number]}){const r=useContext(Resources)!;return <mesh position={at} rotation={[-Math.PI/2,0,0]} scale={[size[0],size[1],1]} geometry={r.plane} material={r.contactMaterial} raycast={()=>null} dispose={null}/>}
export function PartOutline({size,muted=false}:{size:V3;muted?:boolean}){const r=useContext(Resources)!;return <lineSegments geometry={r.outline} material={muted?r.mutedOutlineMaterial:r.outlineMaterial} scale={size.map(v=>v+.06) as V3} raycast={()=>null} dispose={null}/>}
export function Disc({at,radius,depth,finish='metal',rotation=[Math.PI/2,0,0]}:{at:V3;radius:number;depth:number;finish?:Finish;rotation?:V3}){const r=useContext(Resources)!;return <mesh position={at} rotation={rotation} scale={[radius,depth,radius]} geometry={r.cylinder} material={r.materials[finish]} dispose={null}/>}
function Fan({scale=1,part}:{scale?:number;part:PartId}){
 const rpm=useRef(0),rotor=useRef<Group>(null),reduced=useReducedMotion(),r=useContext(Resources)!
 useFrame((_,dt)=>{if(document.hidden||reduced)return;const s=useAssembly.getState(),fault=s.troubleshooting&&s.power==='faulted'?scenarios[s.troubleshooting.id]:null,lead=part==='cooler'?'coolerFan':part==='fanFront'?'frontFan':part==='fanRear'?'rearFan':part==='gpu'?'pcie':'psuAC',active=Boolean(s.installed[part])&&s.connected.includes(lead)&&(s.power==='starting'||s.power==='running'||Boolean(fault?.fans));const goal=active?16:0;rpm.current+=(goal-rpm.current)*(1-Math.exp(-Math.min(dt,.05)*2.8));if(rotor.current)rotor.current.rotation.z+=Math.min(dt,.05)*rpm.current})
 return <group scale={scale}><mesh geometry={r.fanFrame} material={r.materials.rubber} dispose={null}/><mesh geometry={r.ring} material={r.materials.metal} position={[0,0,.06]} dispose={null}/><group ref={rotor} name="assembly-fan-rotor" position={[0,0,.075]}>{Array.from({length:7},(_,i)=><group key={i} rotation={[0,0,i*Math.PI*2/7]}><mesh geometry={r.blade} material={r.materials.metal} dispose={null}/></group>)}<Disc at={[0,0,.025]} radius={.11} depth={.055} finish="silver"/></group>{[-1,1].flatMap(x=>[-1,1].map(y=><Disc key={`${x}:${y}`} at={[x*.46,y*.46,.04]} radius={.025} depth={.03} finish="silver"/>))}</group>
}
function Motherboard(){const r=useContext(Resources)!;return <group><LabBox size={[2.44,2.44,.055]} finish="pcb"/>
 <LabBox at={[-.47,.55,.05]} size={[.56,.56,.07]} finish="metal"/><LabBox at={[-.47,.55,.09]} size={[.42,.42,.025]} finish="chip"/><LabBox at={[-.14,.55,.09]} size={[.025,.57,.025]} finish="silver"/>
 <mesh geometry={r.key} material={r.materials.gold} position={[-.64,.38,.11]} dispose={null}/>
 {[.65,.77,.89,1.01].map(x=><group key={x}><LabBox at={[x,.45,.07]} size={[.075,1.42,.12]} finish="rubber"/>{[-1,1].map(side=><LabBox key={side} at={[x,.45+side*.74,.10]} size={[.095,.11,.11]} finish="silver"/>)}</group>)}
 <LabBox at={[-.02,-.58,.08]} size={[1.72,.11,.13]} finish="rubber"/><LabBox at={[-.02,-.60,.15]} size={[1.5,.02,.015]} finish="gold"/>
 {[-.96,-.76,-.56,-.36].map(x=><group key={x}><LabBox at={[x,.98,.09]} size={[.12,.22,.17]} finish="chip"/><LabBox at={[x,.78,.08]} size={[.11,.11,.12]} finish="silver"/></group>)}
 {Array.from({length:6},(_,i)=><group key={i}><Disc at={[-1.08,.34+i*.12,.18]} radius={.038} depth={.15} finish="silver"/><LabBox at={[-.97+i*.23,-1.095,.08]} size={[.11,.035,.09]} finish="chip"/></group>)}<LabBox at={[-1.15,-.3,.15]} size={[.26,1.1,.28]} finish="silver"/><LabBox at={[.30,-.30,.06]} size={[.46,.43,.08]} finish="chip"/>
 {Array.from({length:10},(_,i)=><LabBox key={i} at={[-.85+i*.18,-.93,.032]} size={[.01,.35,.004]} finish="gold"/>)}
 <LabBox at={[1.16,.1,.1]} size={[.12,.45,.17]} finish="rubber"/><LabBox at={[1.21,-.98,.09]} size={[.20,.12,.15]} finish="rubber"/>
 <LabBox at={[-.97,1.12,.1]} size={[.15,.12,.13]} finish="rubber"/>{[[1.12,-.15],[.07,1.11],[-.35,1.12]].map(([x,y])=><LabBox key={`${x}:${y}`} at={[x,y,.09]} size={[.09,.06,.09]} finish="rubber"/>)}
 {[-1,1].flatMap(x=>[-1,1].map(y=><Disc key={`${x}:${y}`} at={[x*1.10,y*1.10,.032]} radius={.04} depth={.015} finish="gold"/>))}
 </group>}
export function Hardware({id}:{id:PartId}){
 const resources=useContext(Resources)!
 if(id==='motherboard')return <Motherboard/>
 if(id==='cpu')return <group><LabBox size={[.43,.43,.035]} finish="pcb"/><LabBox at={[0,0,.035]} size={[.37,.37,.035]} finish="silver"/><mesh geometry={resources.key} material={resources.materials.gold} position={[-.17,-.17,.058]} dispose={null}/><mesh geometry={resources.cpuPins} material={resources.materials.gold} dispose={null}/></group>
 if(id==='cooler')return <group><LabBox at={[0,0,.035]} size={[.58,.58,.06]} finish="silver"/>{Array.from({length:9},(_,i)=><LabBox key={i} at={[0,0,.12+i*.037]} size={[.95,.95,.018]} finish="silver"/>)}<group position={[0,0,.54]} scale={.92}><Fan part={id}/></group></group>
 if(id==='ram1'||id==='ram2')return <group><LabBox at={[-.10,0,-.018]} size={[.09,1.28,.015]} finish="metal"/><LabBox size={[.31,1.33,.025]} finish="pcb"/>{Array.from({length:6},(_,i)=><LabBox key={i} at={[0,-.52+i*.21,.022]} size={[.23,.15,.035]} finish="chip"/>)}<LabBox at={[.14,0,0]} size={[.028,1.25,.035]} finish="gold"/><LabBox at={[.13,.15,0]} size={[.055,.045,.04]} finish="pcb"/></group>
 if(id==='gpu')return <group><LabBox at={[0,.207,0]} size={[1.0,.018,2.15]} finish="dark"/><LabBox at={[0,.17,0]} size={[1.1,.045,2.4]} finish="pcb"/><LabBox at={[.53,.19,0]} size={[.08,.05,1.45]} finish="gold"/><LabBox size={[1.18,.35,2.37]} finish="dark"/><LabBox at={[0,0,-1.22]} size={[1.18,.48,.055]} finish="silver"/><LabBox at={[-.13,.05,-1.25]} size={[.22,.10,.035]} finish="rubber"/>{[-.59,.59].map(z=><group key={z} position={[0,-.21,z]} rotation={[Math.PI/2,0,0]}><Fan part={id} scale={.98}/></group>)}<LabBox at={[-.51,.24,.85]} size={[.15,.11,.23]} finish="rubber"/></group>
 if(id==='ssd')return <group><LabBox size={[.70,.07,1]} finish="dark"/><LabBox at={[0,.039,0]} size={[.5,.005,.7]} finish="silver"/><LabBox at={[0,.045,0]} size={[.39,.005,.45]} finish="dark"/><LabBox at={[0,0,-.49]} size={[.44,.035,.04]} finish="gold"/></group>
 if(id==='psu')return <group>{Array.from({length:7},(_,i)=><LabBox key={i} at={[-.55+i*.18,.18,.715]} size={[.055,.18,.015]} finish="metal"/>)}<LabBox size={[1.5,.86,1.4]} finish="dark"/><group position={[-.28,.02,-.72]} rotation={[0,Math.PI,0]}><Fan part={id} scale={.65}/></group><LabBox at={[.5,0,-.72]} size={[.35,.25,.06]} finish="rubber"/>{[-.35,-.12,.15,.4].map(x=><LabBox key={x} at={[x,.02,.71]} size={[.16,.18,.025]} finish="rubber"/>)}</group>
 if(id==='fanFront'||id==='fanRear')return <Fan part={id}/>
 return <group><LabBox size={[3.2,1.9,.16]} finish="dark"/><LabBox at={[0,-1.34,-.08]} size={[.18,.88,.22]} finish="metal"/><LabBox at={[0,-1.82,.02]} size={[1.50,.10,.84]} finish="metal"/><LabBox at={[0,-1.32,-.23]} size={[.30,.08,.10]} finish="rubber"/><LabBox at={[0,-.90,.092]} size={[.075,.012,.008]} finish="amber"/><LabBox at={[.1,-.6,-.11]} size={[.18,.09,.06]} finish="rubber"/><LabBox at={[-.2,-.6,-.11]} size={[.09,.09,.06]} finish="rubber"/></group>
}
export function CaseFrame(){const r=useContext(Resources)!;return <group name="assembly-case">
 {[-1,1].flatMap(x=>[-1,1].map(z=><LabBox key={`${x}:${z}`} at={[x*1.1,3.1,z*1.9]} size={[.09,4.2,.09]} finish="metal"/>))}
 {[1.02,5.18].map(y=><group key={y}><LabBox at={[0,y,0]} size={[2.24,.09,3.89]} finish="dark"/>{[-1,1].map(x=><LabBox key={x} at={[x*1.1,y,0]} size={[.08,.09,3.89]} finish="metal"/>)}</group>)}
 <LabBox at={[1.09,3.1,0]} size={[.06,4.1,3.8]} finish="dark"/><mesh position={[0,1.905,0]} geometry={r.shroud} material={r.materials.metal} dispose={null}/>
 <LabBox at={[.92,boardOrigin[1],boardOrigin[2]]} size={[.04,2.65,2.65]} finish="metal"/>{[-1,1].flatMap(y=>[-1,1].map(z=><LabBox key={`standoff:${y}:${z}`} at={[.865,boardOrigin[1]+y*1.10,boardOrigin[2]+z*1.10]} size={[.07,.06,.06]} finish="gold"/>))}
 <mesh position={[0,0,1.88]} geometry={r.front} material={r.materials.dark} dispose={null}/><mesh position={[0,0,-1.93]} geometry={r.rear} material={r.materials.dark} dispose={null}/>
 {Array.from({length:12},(_,i)=><LabBox key={i} at={[-.55+i*.1,3.67,1.93]} size={[.018,1.20,.025]} finish="metal"/>)}
 {Array.from({length:10},(_,i)=><LabBox key={i} at={[-.80+i*.17,5.23,-.35]} size={[.065,.009,2.3]} finish="rubber"/>)}
 {[-.8,.8].flatMap(x=>[-1.5,1.5].map(z=><LabBox key={x+':'+z} at={[x,1.005,z]} size={[.3,.11,.45]} finish="rubber"/>))}
 <LabBox at={[.55,2.72,-1.935]} size={[.15,.06,.025]} finish="metal"/>
 <LabBox at={[0,5.235,1.52]} size={[2.05,.025,.55]} finish="metal"/><SidePanel/>
 
 <LabBox at={[-1.104,1.16,0]} size={[.012,.018,3.5]} finish="gold"/>
 </group>}

const parkedPanel:V3=[-6,.255,-.4],closedPanel:V3=[-1.15,3.1,0]
function SidePanel(){
 const node=useRef<Group>(null),open=useAssembly(s=>s.panelOpen),reduced=useReducedMotion()
 // Keep the initial JSX pose stable: later state changes are owned by the timeline.
 const [initial]=useState(()=>({position:open?parkedPanel:closedPanel,rotation:[0,0,open?Math.PI/2:0] as V3}))
 useEffect(()=>{
  const panel=node.current;if(!panel)return
  const at=open?parkedPanel:closedPanel,angle=open?Math.PI/2:0
  if(reduced){panel.position.set(...at);panel.rotation.set(0,0,angle);return}
  if(panel.position.distanceTo({x:at[0],y:at[1],z:at[2]})<.001&&Math.abs(panel.rotation.z-angle)<.001)return
  const motion=gsap.timeline({defaults:{ease:'power2.inOut'}})
  // Route outside the left edge before moving below the desk; never sweep through the mat.
  if(panel.position.y<.85)motion.to(panel.position,{x:-11.5,duration:.25})
  else if(panel.position.x>-2)motion.to(panel.position,{x:-1.6,duration:.12})
  motion.to(panel.position,{y:6.4,duration:.25})
   .to(panel.position,{x:-11.5,z:-.4,duration:.3})
   .to(panel.rotation,{x:0,y:0,z:angle,duration:.25})
  if(open)motion.to(panel.position,{y:at[1],duration:.3}).to(panel.position,{x:at[0],duration:.25})
  else motion.to(panel.position,{x:-1.6,z:0,duration:.3}).to(panel.position,{y:at[1],duration:.25}).to(panel.position,{x:at[0],duration:.12})
  return()=>{motion.kill()}
 },[open,reduced])
 return <group ref={node} name="assembly-side-panel" position={initial.position} rotation={initial.rotation}><LabBox size={[.035,4.08,3.74]} finish="glass"/>{[-1,1].map(side=><group key={side}><LabBox at={[0,side*2.04,0]} size={[.055,.06,3.8]} finish="metal"/><LabBox at={[0,0,side*1.88]} size={[.055,4.08,.06]} finish="metal"/></group>)}{[-1,1].flatMap(y=>[-1,1].map(z=><Disc key={y+':'+z} at={[-.04,y*1.90,z*1.74]} rotation={[0,0,Math.PI/2]} radius={.045} depth={.05} finish="silver"/>))}</group>}
