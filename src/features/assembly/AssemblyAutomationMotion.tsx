import {useEffect} from 'react'
import {useThree} from '@react-three/fiber'
import {Mesh,Vector3,type Group} from 'three'
import gsap from 'gsap'
import {useReducedMotion} from '@/hooks/usePreferences'
import {assemblyAutomation,useAssembly} from './assemblyStore'
import {parts,slotPosition,cables,type CableId} from './assemblyDefinition'
import {RequiredCable} from './AssemblyCable'
import {RoutedCurve} from './assemblyCableCurve'

/** Render-only motion adapter; the real store action is committed after this resolves. */
export function AssemblyAutomationMotion(){
 const get=useThree(s=>s.get),reduced=useReducedMotion()
 useEffect(()=>assemblyAutomation.register((step,signal)=>new Promise<void>((resolve,reject)=>{
  let timeline:gsap.core.Timeline|undefined,frame=0,closed=false,restore:()=>void=()=>{}
  const finish=(aborted=false)=>{if(closed)return;closed=true;cancelAnimationFrame(frame);timeline?.kill();signal.removeEventListener('abort',abort);if(aborted){restore();get().invalidate();reject(new DOMException('Cancelled','AbortError'))}else resolve()}
  const abort=()=>finish(true)
  signal.addEventListener('abort',abort,{once:true})
  const start=()=>{
   if(signal.aborted){finish(true);return}
   const {scene,invalidate}=get()
   if(step.kind==='part'){
    const node=scene.getObjectByName('assembly-part:'+step.id)
    if(!node){finish(true);return}
    const spec=parts[step.id],position=node.position.clone(),rotation=node.rotation.clone(),target=slotPosition(step.target)
    restore=()=>{node.position.copy(position);node.rotation.copy(rotation)}
    if(reduced){node.position.fromArray(target);node.rotation.set(...spec.rotation);invalidate();finish();return}
    timeline=gsap.timeline({onUpdate:invalidate,onComplete:()=>finish()})
    // Lift clear of the case, approach the open side, then seat at the authored mount.
    timeline.to(node.position,{y:7,duration:.32,ease:'power2.inOut'})
     .to(node.position,{x:-2.2,z:target[2],duration:.38,ease:'power2.inOut'})
     .to(node.rotation,{x:spec.rotation[0],y:spec.rotation[1],z:spec.rotation[2],duration:.38,ease:'power2.inOut'},'<')
     .to(node.position,{y:target[1],duration:.35,ease:'power2.inOut'})
     .to(node.position,{x:target[0],duration:.22,ease:'power2.out'}).to({},{duration:.12})
   }else{
    const root=scene.getObjectByName('assembly-auto-cable:'+step.id) as Group|undefined,path=root?.getObjectByName('assembly-cable-path') as Mesh|undefined
    if(!root||!path){finish(true);return}
    const end=root.getObjectByName('assembly-cable-end'),curve=new RoutedCurve(cables[step.id].route),tip=new Vector3(),tangent=new Vector3(),max=path.geometry.index?.count??path.geometry.getAttribute('position').count,progress={value:0}
    const update=()=>{path.geometry.setDrawRange(0,Math.floor(max*progress.value/3)*3);if(end){curve.getPoint(progress.value,tip);end.position.copy(tip);curve.getTangent(progress.value,tangent);end.rotation.set(Math.asin(-tangent.y),Math.atan2(tangent.x,tangent.z),0)}invalidate()}
    restore=()=>{root.visible=false}
    update()
    if(reduced){progress.value=1;update();finish();return}
    timeline=gsap.timeline({onUpdate:update,onComplete:()=>finish()}).to(progress,{value:1,duration:.65,ease:'power2.inOut'})
   }
  }
  // Allow the preview to commit into the same Canvas before starting its timeline.
  frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(start)})
 })),[get,reduced])
 const step=useAssembly(s=>s.automation?.status==='running'?s.automation.step:null)
 return step?.kind==='cable'?<AutomaticCable id={step.id}/>:null
}
function AutomaticCable({id}:{id:CableId}){return <group name={'assembly-auto-cable:'+id}><RequiredCable id={id} revealing/></group>}
