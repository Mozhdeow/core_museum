import {peripheralDisplayPosition} from './assemblyVisualTheme'
import {PeripheralVisualResources,PeripheralVisual,PeripheralDisc,PeripheralZone} from './PeripheralVisuals'
import {useEffect,useMemo,useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import {Group} from 'three'
import gsap from 'gsap'
import {useReducedMotion} from '@/hooks/usePreferences'
import {useAssembly} from './assemblyStore'
import {LabBox,Disc,ContactPatch,IOMarking} from './AssemblyHardware'
import {opticalMount,opticalStage,devicePorts,peripherals,peripheralIds,optionalCables,optionalPorts,type PeripheralId,type DevicePortId,type OptionalCableId} from './assemblyExtensions'
import type {V3} from './assemblyDefinition'
import {OptionalCable,CablePath,Connector} from './AssemblyCable'

function OpticalDrive(){
 const installed=useAssembly(s=>s.optionalParts.includes('optical')),open=useAssembly(s=>s.opticalOpen),disc=useAssembly(s=>s.peripherals.disc),power=useAssembly(s=>s.power),node=useRef<Group>(null),tray=useRef<Group>(null),rotor=useRef<Group>(null),reduced=useReducedMotion()
 useEffect(()=>{if(!node.current)return;const p=installed?opticalMount:opticalStage,tween=gsap.to(node.current.position,{x:p[0],y:p[1],z:p[2],duration:reduced?0:.65,ease:'power2.inOut'});return()=>{tween.kill()}},[installed,reduced])
 useEffect(()=>{if(!tray.current)return;const tween=gsap.to(tray.current.position,{z:open?1.16:0,duration:reduced?0:.55,ease:'power2.inOut'});return()=>{tween.kill()}},[open,reduced])
 useFrame((_,dt)=>{if(rotor.current&&disc&&!open&&power==='running'&&!reduced&&!document.hidden)rotor.current.rotation.y+=Math.min(dt,.04)*9})
 return <group ref={node} name="assembly-optical" position={opticalStage} onClick={e=>{e.stopPropagation();useAssembly.getState().selectExtension('optical')}}><LabBox size={[1.46,.42,1.7]} finish="metal"/><LabBox at={[0,0,.86]} size={[1.48,.43,.045]} finish="dark"/><group ref={tray}><LabBox at={[0,-.16,.38]} size={[1.28,.055,1.3]} finish="rubber"/><LabBox at={[0,-.12,.89]} size={[1.35,.12,.04]} finish="metal"/>{disc&&<group ref={rotor} position={[0,-.12,.38]}><PeripheralDisc/></group>}</group><group position={[.58,-.05,.91]} onClick={e=>{e.stopPropagation();useAssembly.getState().eject()}}><LabBox size={[.12,.06,.03]} finish="gold"/></group></group>
}
function Port({id}:{id:DevicePortId}){
 const p=devicePorts[id],isFront=id.startsWith('front'),rotation:V3=isFront?[-Math.PI/2,0,0]:[0,Math.PI,0]
 const jack=['headphones','microphone','lineIn'].includes(p.plug),color=p.plug==='headphones'?'#70ac89':p.plug==='microphone'?'#c88c9b':'#83a5b7'
 return <group position={p.at} rotation={rotation} onPointerOver={e=>{e.stopPropagation();useAssembly.setState({hoverPort:id})}} onPointerOut={()=>useAssembly.setState({hoverPort:null})} onClick={e=>{e.stopPropagation();const s=useAssembly.getState(),device=s.extensionSelection as PeripheralId;if(peripheralIds.includes(device))s.plug(device,id);else s.selectExtension(`port:${id}`)}}>
 {jack?<><Disc at={[0,0,0]} radius={.065} depth={.025} finish="metal"/><Disc at={[0,0,.019]} radius={.042} depth={.018} finish="rubber"/><mesh position={[0,0,.032]}><ringGeometry args={[.045,.057,12]}/><meshBasicMaterial color={color}/></mesh></>:<><LabBox size={[p.plug==='usbC'?.13:.21,.10,.035]} finish="metal"/><LabBox at={[0,0,.024]} size={[p.plug==='usbC'?.09:.17,.06,.02]} finish="rubber"/>{p.plug==='usbA'&&<LabBox at={[0,-.015,.039]} size={[.14,.025,.012]} finish="cyan"/>}</>}
</group>
}
export function CaseIO(){const led=useRef<import('three').Mesh>(null),reduced=useReducedMotion(),phase=useRef(0)
 useFrame((_,dt)=>{if(document.hidden)return;phase.current+=dt;const s=useAssembly.getState(),running=s.power!=='off',wired=s.optionalConnected.includes('frontPanel');if(led.current)led.current.visible=running&&wired&&(reduced||Math.sin(phase.current*6)>.25)})
 return <><group name="assembly-io">{Object.keys(devicePorts).filter(id=>id!=='opticalTray'&&(id.startsWith('front')||useAssembly.getState().installed.motherboard)).map(id=><Port key={id} id={id as DevicePortId}/>)}<group position={[.88,5.26,1.42]} onClick={e=>{e.stopPropagation();const s=useAssembly.getState();if(!s.optionalConnected.includes('frontPanel'))s.selectExtension('port:power');else if(s.power!=='off'){s.togglePower();s.togglePower()}}}><LabBox size={[.09,.035,.09]} finish="metal"/></group><mesh ref={led} position={[.3,5.27,1.72]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.05,.035]}/><meshBasicMaterial color="#e5a956" toneMapped={false}/></mesh></group>
 <group position={[0,4.53,2.8]} onClick={e=>{e.stopPropagation();const s=useAssembly.getState();if(s.extensionSelection==='disc')s.plug('disc','opticalTray')}}><mesh visible={false}><boxGeometry args={[1.25,.1,1.25]}/><meshBasicMaterial/></mesh></group>
 <IOMarking/>
 </>
}
function PeripheralShape({id}:{id:PeripheralId}){return <PeripheralVisual id={id}/>}
function Device({id}:{id:PeripheralId}){
 const port=useAssembly(s=>s.peripherals[id]),node=useRef<Group>(null),reduced=useReducedMotion(),spec=peripherals[id],displayAt=peripheralDisplayPosition(id),flash=id==='flash'||id==='flashC',target=useMemo(()=>port&&flash?devicePorts[port].at.map((v,i)=>v+(i===(port.startsWith('front')?1:2)?(port.startsWith('front')?1:-1)*(spec.size[2]/2+.04):0)) as V3:displayAt,[port,flash,spec,displayAt])
 const route=useMemo(()=>{if(!port||flash||id==='disc')return null;const end=devicePorts[port].at,front=port.startsWith('front');return [displayAt,[displayAt[0],1.1,front?(id==='keyboard'||id==='mouse'?Math.min(3.1,displayAt[2]-.45):3.1):-2.5],[front?-1.5:end[0],1.12,front?2.3:-2.5],[front?-1.5:end[0],end[1],front?2.3:-2.4],end] as V3[]},[port,displayAt,flash,id])
 useEffect(()=>{if(!node.current)return;const tween=gsap.to(node.current.position,{x:target[0],y:target[1],z:target[2],duration:reduced?0:.45,ease:'power2.inOut'});const turn=gsap.to(node.current.rotation,{x:port&&flash&&port.startsWith('front')?-Math.PI/2:0,y:port&&flash&&!port.startsWith('front')?Math.PI:0,z:0,duration:reduced?0:.45,ease:'power2.inOut'});return()=>{tween.kill();turn.kill()}},[target,reduced,port,flash])
 if(id==='disc'&&port)return null
 return <><group ref={node} name={`assembly-device:${id}`} position={displayAt} onClick={e=>{e.stopPropagation();useAssembly.getState().selectExtension(id)}}><PeripheralShape id={id}/></group>{route&&<CablePath route={route} radius={.014} kind={spec.plug==='usbA'?'usb':'audio'}/>}<ContactPatch at={[displayAt[0],1.028,displayAt[2]]} size={[spec.size[0]*1.1,spec.size[2]*1.1]}/></>
}
export function OptionalScene(){const connected=useAssembly(s=>s.optionalConnected),selection=useAssembly(s=>s.extensionSelection),first=useAssembly(s=>s.optionalFirst),show=useAssembly(s=>s.trayTab==='peripherals'||Object.keys(s.peripherals).length>0),opticalVisible=useAssembly(s=>s.trayTab==='optional'||s.optionalParts.includes('optical')),wire=optionalCables[selection as OptionalCableId]
 return <PeripheralVisualResources>{opticalVisible&&<OpticalDrive/>}<CaseIO/>{useAssembly.getState().installed.motherboard&&Object.entries(optionalPorts).filter(([id])=>id.startsWith('board.')).map(([id,p])=><Connector key={id} at={p.at} kind={id.includes('audio')?'audio':id.includes('usb')?'usb':'header'} direction={[-1,0,0]}/>)} {connected.map(id=><OptionalCable id={id} key={id}/>)}{wire&&wire.ends.map(port=><group key={port} position={optionalPorts[port].at} onClick={e=>{e.stopPropagation();useAssembly.getState().optionalPort(port)}}><mesh><sphereGeometry args={[.065,10,8]}/><meshBasicMaterial color={first===port?'#fff3d0':'#edb56c'} depthTest={false}/></mesh><Connector at={[0,0,0]} kind={wire.kind}/></group>)}{show&&<><PeripheralZone/>{peripheralIds.map(id=><Device key={id} id={id}/>)}</>}</PeripheralVisualResources>
}
