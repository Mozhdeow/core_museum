import {AssemblyAutomationMotion} from './AssemblyAutomationMotion'
import {scenarios} from './troubleshooting'
import {MonitorScreen} from './AssemblyMonitor'
import {AssemblyMat} from './AssemblyMat'
import {resolveAssemblyDrop,targetSize} from './assemblyTargeting'
import {useFrame} from '@react-three/fiber'
import {AssemblyStudio} from './AssemblyStudio'
import {OptionalScene} from './AssemblyOptionalScene'
import {RequiredCable} from './AssemblyCable'
import {AssemblyPerfProbe} from './AssemblyPerf'
import {useEffect,useRef} from 'react'
import {Canvas,useThree,type ThreeEvent} from '@react-three/fiber'
import {Group,Vector3,Plane,Box3} from 'three'
import gsap from 'gsap'
import {useReducedMotion,useMediaQuery} from '@/hooks/usePreferences'
import {assemblyPartIds,parts,slotPosition,cables,ports,mat,stagedVolumes,type PartId} from './assemblyDefinition'
import {useAssembly,isPart} from './assemblyStore'
import {AssemblyResources,LabBox,Hardware,CaseFrame,PartOutline,ContactPatch} from './AssemblyHardware'
import {AssemblyCamera} from './AssemblyCamera'

function MovablePart({id}:{id:PartId}){
 const spec=parts[id],slot=useAssembly(s=>s.installed[id]),selected=useAssembly(s=>s.automation?.status==='running'&&s.automation.step?.kind==='part'&&s.automation.step.id===id||s.selected===id||s.learningMode==='troubleshoot'&&Boolean(s.troubleshooting)&&scenarios[s.troubleshooting!.id].part===id),node=useRef<Group>(null),canvas=useRef<HTMLCanvasElement|null>(null),reduced=useReducedMotion(),{camera,gl}=useThree()
 const drag=useRef({active:false,moved:false,x:0,y:0,minY:1.1,plane:new Plane(),normal:new Vector3(),point:new Vector3()})
 useEffect(()=>{canvas.current=gl.domElement;return()=>{if(canvas.current)canvas.current.style.cursor='';canvas.current=null}},[gl])
 useEffect(()=>{const cancel=()=>{if(!drag.current.active)return;drag.current.active=false;useAssembly.setState({dragging:false});const at=slot?slotPosition(slot):spec.tray;if(node.current)gsap.to(node.current.position,{x:at[0],y:at[1],z:at[2],duration:reduced?0:.25})};window.addEventListener('blur',cancel);return()=>window.removeEventListener('blur',cancel)},[slot,spec,reduced])
 useEffect(()=>{const root=node.current;if(!root)return;const at=slot?slotPosition(slot):spec.tray,rotation=slot?spec.rotation:spec.trayRotation;const a=gsap.to(root.position,{x:at[0],y:at[1],z:at[2],duration:reduced?0:.65,ease:'power2.inOut'}),b=gsap.to(root.rotation,{x:rotation[0],y:rotation[1],z:rotation[2],duration:reduced?0:.65,ease:'power2.inOut'});return()=>{a.kill();b.kill()}},[slot,spec,reduced])
 const finish=(event:ThreeEvent<PointerEvent>)=>{const d=drag.current;if(!d.active)return;d.active=false;useAssembly.setState({dragging:false});(event.target as Element).releasePointerCapture?.(event.pointerId);if(canvas.current)canvas.current.style.cursor='grab';if(!d.moved)return
  const chosen=resolveAssemblyDrop(id,event.ray)
  if(!chosen||!useAssembly.getState().install(id,chosen)){if(!chosen)useAssembly.setState({issue:{code:'wrongTarget',part:id}});const at=slot?slotPosition(slot):spec.tray;gsap.to(node.current!.position,{x:at[0],y:at[1],z:at[2],duration:reduced?0:.35})}
 }
 return <group ref={node} name={`assembly-part:${id}`} position={spec.tray} rotation={spec.trayRotation} userData={{part:id,installed:Boolean(slot)}}
  onPointerOver={e=>{e.stopPropagation();if(canvas.current)canvas.current.style.cursor='grab'}} onPointerOut={()=>{if(!drag.current.active&&canvas.current)canvas.current.style.cursor=''}}
  onPointerDown={e=>{if(e.button!==0||useAssembly.getState().automation?.status==='running')return;e.stopPropagation();useAssembly.getState().select(id);if(slot||useAssembly.getState().learningMode==='explore')return;const d=drag.current;d.active=true;d.moved=false;d.x=e.clientX;d.y=e.clientY;d.minY=1.03+new Box3().setFromObject(node.current!).getSize(new Vector3()).y/2;d.plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(d.normal),node.current!.position);useAssembly.setState({dragging:true});(e.target as Element).setPointerCapture?.(e.pointerId)}}
  onPointerMove={e=>{const d=drag.current;if(!d.active)return;e.stopPropagation();if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>6)d.moved=true;if(d.moved&&e.ray.intersectPlane(d.plane,d.point)){d.point.x=Math.max(-8,Math.min(5.8,d.point.x));d.point.y=Math.max(d.minY,Math.min(5.6,d.point.y));d.point.z=Math.max(-3.7,Math.min(5.3,d.point.z));if(id!=='monitor'&&Math.abs(d.point.x)<1.35&&Math.abs(d.point.z)<2.05)d.point.x=-1.4;node.current!.position.copy(d.point)}}}
  onPointerUp={finish} onPointerCancel={e=>{drag.current.active=false;useAssembly.setState({dragging:false});(e.target as Element).releasePointerCapture?.(e.pointerId);const at=slot?slotPosition(slot):spec.tray;gsap.to(node.current!.position,{x:at[0],y:at[1],z:at[2],duration:reduced?0:.25})}}>
  <Hardware id={id}/>{selected&&<PartOutline size={spec.size}/>}
 </group>
}
function Targets(){
 const selected=useAssembly(s=>s.selected),installed=useAssembly(s=>s.installed),issue=useAssembly(s=>s.issue),exploring=useAssembly(s=>s.learningMode==='explore')
 if(exploring||!isPart(selected)||selected==='monitor'||installed[selected])return null
 return <group>{parts[selected].targets.map(slot=>{const occupied=Object.values(installed).includes(slot),size=targetSize(slot);return <group key={slot} name={`assembly-target:${slot}`} position={slotPosition(slot)}><mesh onClick={e=>{e.stopPropagation();useAssembly.getState().install(selected,slot)}}><boxGeometry args={size}/><meshBasicMaterial color={issue?.target===slot?'#da9772':occupied?'#8f9792':'#edb460'} transparent opacity={occupied?.06:.2} depthWrite={false}/></mesh><PartOutline size={size} muted={occupied}/></group>})}</group>
}
function FixedMonitor(){return <group name="assembly-fixed-monitor" position={parts.monitor.position} rotation={parts.monitor.rotation} onClick={e=>{e.stopPropagation();useAssembly.getState().select('monitor')}}><Hardware id="monitor"/><MonitorScreen/></group>}
function Connections(){
 const connected=useAssembly(s=>s.connected),selected=useAssembly(s=>s.selected),first=useAssembly(s=>s.firstPort),installed=useAssembly(s=>s.installed),wire=selected&&!isPart(selected)?cables[selected]:null,drag=useRef({x:0,y:0,moved:false})
 return <group>{connected.map(id=><RequiredCable key={id} id={id}/>)}{wire&&wire.ends.filter(port=>!ports[port].part||installed[ports[port].part!]).map(port=><mesh key={port} name={`assembly-port:${port}`} position={ports[port].position}
  onPointerDown={e=>{if(useAssembly.getState().automation?.status==='running')return;e.stopPropagation();drag.current={x:e.clientX,y:e.clientY,moved:false};useAssembly.setState({dragging:true});(e.target as Element).setPointerCapture?.(e.pointerId)}}
  onPointerUp={e=>{e.stopPropagation();useAssembly.setState({dragging:false});(e.target as Element).releasePointerCapture?.(e.pointerId);if(Math.hypot(e.clientX-drag.current.x,e.clientY-drag.current.y)<6)return;drag.current.moved=true;const other=wire.ends.find(p=>p!==port)!;if(e.ray.distanceSqToPoint(new Vector3(...ports[other].position))<.08){const s=useAssembly.getState();s.select(wire.id);s.port(port);s.port(other)}else useAssembly.setState({issue:{code:'wrongPort',cable:wire.id}})}}
  onPointerCancel={e=>{useAssembly.setState({dragging:false});(e.target as Element).releasePointerCapture?.(e.pointerId)}}
  onClick={e=>{e.stopPropagation();if(drag.current.moved){drag.current.moved=false;return}useAssembly.getState().port(port)}}><sphereGeometry args={[.075,12,8]}/><meshBasicMaterial color={first===port?'#fff1bf':'#ffb547'} depthTest={false} transparent opacity={.85}/></mesh>)}</group>
}
function Ready({onReady}:{onReady:()=>void}){const frames=useRef(0);useFrame(s=>{if(++frames.current===3)onReady();else if(frames.current<3)s.invalidate()});return null}
function Workstation(){const power=useAssembly(s=>s.power),installed=useAssembly(s=>s.installed),mains=useAssembly(s=>s.connected.includes('psuAC'));return <><LabBox at={[-1.5,.93,.6]} size={[15.5,.16,9.6]} finish="metal"/><LabBox at={[-1.5,1.014,.6]} size={[15.4,.012,9.5]} finish="bench"/>{[-8.7,5.7].flatMap(x=>[-3.6,4.7].map(z=><LabBox key={`${x}:${z}`} at={[x,.4,z]} size={[.18,.9,.18]} finish="metal"/>))}
 <group name="assembly-panel-shelf"><LabBox at={[-6,.16,-.4]} size={[4.6,.05,4.2]} finish="rubber"/></group>
 <AssemblyMat/><LabBox at={mat.center} size={mat.size} finish="mat"/>{[-1,1].map(side=><group key={side}><LabBox at={[mat.center[0]+side*3.1,1.037,mat.center[2]]} size={[.018,.009,6.35]} finish="gold"/><LabBox at={[mat.center[0],1.037,mat.center[2]+side*3.175]} size={[6.2,.009,.018]} finish="amber"/></group>)}
 <ContactPatch at={[-1.5,-.101,.6]} size={[17,11]}/><ContactPatch at={[0,1.029,0]} size={[3.3,4.8]}/><ContactPatch at={[3.7,1.03,-.7]} size={[3.2,1.9]}/>{stagedVolumes.filter(p=>p.id!=='monitor'&&!installed[p.id as PartId]).map(p=><ContactPatch key={p.id} at={[p.center[0],1.032,p.center[2]]} size={[p.size[0]*1.15,p.size[2]*1.15]}/>)}
 <LabBox at={[-1.5,1.06,-2.5]} size={[.35,.1,.28]} finish="rubber"/><LabBox at={[2.5,1.06,-2.5]} size={[.35,.1,.28]} finish="rubber"/>
 {!installed.gpu&&[-3.7,-3.1].map(x=><LabBox key={x} at={[x,1.08,-1.2]} size={[.1,.12,1.5]} finish="rubber"/>)}<CaseFrame/>{assemblyPartIds.map(id=><MovablePart key={id} id={id}/>)}<FixedMonitor/><Targets/><Connections/><OptionalScene/>{power!=='off'&&mains&&installed.motherboard&&<group><LabBox at={[.748,2.2,-1.1]} size={[.018,.04,.12]} finish="amber"/><LabBox at={[.748,4.15,.53]} size={[.018,.06,.025]} finish="cyan"/>{installed.ram1&&<LabBox at={[.39,3.55,.19]} size={[.018,1.0,.018]} finish="amber"/>}{installed.ram2&&<LabBox at={[.39,3.55,.43]} size={[.018,1.0,.018]} finish="amber"/>}</group>}
 <LabBox at={[.58,5.24,1.55]} size={[.08,.025,.025]} finish={power==='off'||!mains?'rubber':'amber'}/>
 <mesh name="assembly-power-button" position={[.9,5.24,1.55]} onClick={e=>{e.stopPropagation();const s=useAssembly.getState();if(s.optionalConnected.includes('frontPanel'))s.togglePower();else {s.selectExtension('port:power');useAssembly.setState({extensionIssue:'leadMissing'})}}}><cylinderGeometry args={[.09,.09,.035,16]}/><meshStandardMaterial color="#ffb547" emissive="#ff7a18" emissiveIntensity={.2}/></mesh>
 <AssemblyStudio/></>}
export default function AssemblyScene({onReady}:{onReady:()=>void}){const mobile=useMediaQuery('(max-width:767px)'),reduced=useReducedMotion();return <Canvas frameloop={reduced?'demand':'always'} dpr={[1,1.25]} camera={{position:[-7.4,8.3,13.8],fov:mobile?54:43,near:.1,far:80}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}}>
 <color attach="background" args={['#050505']}/><fog attach="fog" args={['#0d0d0d',25,70]}/><ambientLight intensity={.7}/><directionalLight position={[-6,24,6]} intensity={3.6} color="#f5f5f0"/><directionalLight position={[4,8,-6]} intensity={2.7} color="#d9dfe4"/><directionalLight position={[1,7,5]} intensity={1.5} color="#ffffff"/>
 <AssemblyResources><Workstation/><AssemblyAutomationMotion/></AssemblyResources><AssemblyCamera/><AssemblyPerfProbe/><Ready onReady={onReady}/></Canvas>}
