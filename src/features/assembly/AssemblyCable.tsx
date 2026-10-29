import {useMemo,useEffect} from 'react'
import {Vector3,TubeGeometry,MeshStandardMaterial} from 'three'
import {RoutedCurve} from './assemblyCableCurve'
import {cables,type CableId,type V3} from './assemblyDefinition'
import {optionalCables,type OptionalCableId,type ConnectorKind} from './assemblyExtensions'
import {LabBox,Disc} from './AssemblyHardware'

const kinds:Record<CableId,ConnectorKind>={atx:'atx',eps:'eps',pcie:'pcie',sataData:'sataData',sataPower:'sataPower',display:'display',psuAC:'iec',monitorAC:'iec',frontFan:'fan',rearFan:'fan',coolerFan:'fan'}
export function Connector({kind,at,direction=[0,0,1],name}:{kind:ConnectorKind;at:V3;direction?:V3;name?:string}){
 const rotation=useMemo(()=>{const v=new Vector3(...direction).normalize();return [Math.asin(-v.y),Math.atan2(v.x,v.z),0] as V3},[direction])
 const width=kind==='atx'?.43:kind==='sataPower'?.32:kind==='display'?.22:kind==='iec'?.26:.19,height=kind==='atx'?.12:kind==='eps'||kind==='pcie'?.16:.09
 if(kind==='audio')return <group name={name} position={at} rotation={rotation}><Disc at={[0,0,0]} radius={.042} depth={.13} finish="rubber"/><Disc at={[0,0,.10]} radius={.018} depth={.12} finish="silver"/>{[.075,.115].map(z=><Disc key={z} at={[0,0,z]} radius={.019} depth={.007} finish="rubber"/>)}<Disc at={[0,0,.159]} radius={.015} depth={.025} finish="gold"/></group>
 return <group name={name} position={at} rotation={rotation}><LabBox size={[width,height,.12]} finish="rubber"/>{kind==='atx'||kind==='eps'||kind==='pcie'?<><LabBox at={[0,height*.65,0]} size={[.065,.04,.06]} finish="metal"/>{Array.from({length:kind==='atx'?24:8},(_,i)=><LabBox key={i} at={[-width*.42+(i%(kind==='atx'?12:4))*width*.84/(kind==='atx'?11:3),(i<(kind==='atx'?12:4)?-1:1)*height*.23,.066]} size={[.012,height*.27,.012]} finish="gold"/>)}</>:kind==='sataData'||kind==='sataPower'?<><LabBox at={[0,0,.068]} size={[width*.75,.018,.012]} finish="gold"/><LabBox at={[-width*.38,.025,.068]} size={[.015,.065,.012]} finish="gold"/></>:kind==='iec'?<LabBox at={[0,0,.07]} size={[.16,.035,.015]} finish="metal"/>:<LabBox at={[0,0,.065]} size={[width*.7,.025,.012]} finish="gold"/>}</group>
}
export function CablePath({route,radius=.018,color='#393b3d',kind='usb',revealing=false}:{route:V3[];radius?:number;color?:string;kind?:ConnectorKind;revealing?:boolean}){
 const resource=useMemo(()=>{const geometry=new TubeGeometry(new RoutedCurve(route),Math.min(220,route.length*22),radius,5,false);if(revealing)geometry.setDrawRange(0,0);return {geometry,material:new MeshStandardMaterial({color,roughness:.79})}},[route,radius,color,revealing])
 useEffect(()=>()=>{resource.geometry.dispose();resource.material.dispose()},[resource])
 return <group><mesh name="assembly-cable-path" geometry={resource.geometry} material={resource.material} dispose={null}/>{[0,route.length-1].map(i=>{const p=route[i],adjacent=route[i===0?1:i-1];return <Connector key={i} name={i===0?undefined:"assembly-cable-end"} at={p} kind={kind} direction={p.map((v,k)=>v-adjacent[k]) as V3}/>})}</group>
}
export function RequiredCable({id,revealing=false}:{id:CableId;revealing?:boolean}){const c=cables[id];return <group name={`assembly-cable:${id}`}><CablePath {...c} kind={kinds[id]} revealing={revealing}/></group>}
export function OptionalCable({id}:{id:OptionalCableId}){return <CablePath {...optionalCables[id]}/>}
export function AudioPlug({at,color}:{at:V3;color:string}){return <group position={at}><Disc at={[0,0,0]} radius={.05} depth={.14} finish="rubber"/><mesh position={[0,0,.10]}><cylinderGeometry args={[.015,.015,.1,8]}/><meshStandardMaterial color={color}/></mesh></group>}
