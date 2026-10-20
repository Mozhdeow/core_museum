import {Component,Suspense,useEffect,useMemo,useRef,type ReactNode} from 'react'
import {useFrame} from '@react-three/fiber'
import {useGLTF} from '@react-three/drei'
import {SkinnedMesh,Group} from 'three'
import {exhibitPresentations} from './exhibitModelPresentation'
import {clone} from 'three/addons/utils/SkeletonUtils.js'
import {exhibitMaterials,prepareExhibitModel,supportedModelUrl,PEDESTAL_MODEL_BOUNDS,EXHIBIT_BASE_Y} from './modelGeometry'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import type {ModelStatus} from '@/features/museum/museumState'

type Limits={width:number;height:number;depth:number;radius:number}
type Props={id:string;url:string|null;revision?:number;limits?:Limits;baseY?:number;focus?:boolean;fade?:boolean;reveal?:boolean;notify?:(status:ModelStatus)=>void;fallback:(status:ModelStatus)=>ReactNode}
function Status({status,notify,children}:{status:ModelStatus;notify?:Props['notify'];children:ReactNode}){
 useEffect(()=>{notify?.(status)},[status,notify])
 return children
}
class Boundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?this.props.fallback:this.props.children}
}
function Model({id,url,limits,baseY,focus,notify,fade=false,reveal=true}:Omit<Props,'fallback'|'revision'>&{url:string;limits:Limits;baseY:number}){
 const gltf=useGLTF(url)
 const model=useMemo(()=>{
  const object=clone(gltf.scene),materials=exhibitMaterials(object)
  try{return {...prepareExhibitModel(object,limits,exhibitPresentations[id]),materials,originals:materials.map(m=>({opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite,alphaTest:m.alphaTest}))}}
  catch(error){materials.forEach(m=>m.dispose());object.traverse(node=>{if(node instanceof SkinnedMesh)node.skeleton.dispose()});throw error}
 },[gltf.scene,limits,id])
 const transition=useRef<Group>(null),elapsed=useRef(0)
 const visibility=useRef({value:fade?0:1,from:fade?0:1,target:0,elapsed:0})
 useFrame((state,dt)=>{
  if(!transition.current)return
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  elapsed.current=Math.min(.2,elapsed.current+dt)
  const progress=reduced?1:1-Math.pow(1-elapsed.current/.2,3)
  transition.current.scale.setScalar(.95+.05*progress)
  if(fade){
   const f=visibility.current,target=reveal?1:0
   if(target!==f.target){f.from=f.value;f.target=target;f.elapsed=0}
   f.elapsed=Math.min(.2,f.elapsed+Math.min(dt,.05));f.value=f.from+(f.target-f.from)*(1-Math.pow(1-f.elapsed/.2,3))
   transition.current.visible=f.value>.001
   transition.current.userData.opacity=f.value
   model.materials.forEach((m,index)=>{
    const original=model.originals[index],transparent=original.transparent||f.value<1
    if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true}
    m.opacity=original.opacity*f.value;m.alphaTest=original.alphaTest*f.value;m.depthWrite=original.depthWrite&&f.value>=1
   })
   if(f.elapsed<.2)state.invalidate()
  }
  if(progress<1)state.invalidate()
 })
 useEffect(()=>()=>{model.materials.forEach(m=>m.dispose());model.object.traverse(object=>{if(object instanceof SkinnedMesh)object.skeleton.dispose()})},[model])
 useEffect(()=>{notify?.('ready')},[model,notify])
 useEffect(()=>{if(focus)useMuseumNavigation.getState().setArtifactFocus(baseY+model.height/2,model.radius)},[model,focus,baseY])
 // Instances own nodes/skeletons; cached GLTF geometry/materials/textures remain shared.
 return <group name={`exhibit:${id}`} scale={model.scale} position={[model.position[0],model.position[1]+baseY+model.height/2,model.position[2]]} dispose={null}>
  <group ref={transition} name={`exhibit-transition:${id}`} visible={!fade}><primitive object={model.object} dispose={null}/></group>
 </group>
}
export function UploadedExhibit({revision=0,limits=PEDESTAL_MODEL_BOUNDS,baseY=EXHIBIT_BASE_Y,focus=false,...props}:Props){
 const fallback=(status:ModelStatus)=><Status status={status} notify={props.notify}>{props.fallback(status)}</Status>
 return props.url&&supportedModelUrl(props.url)?<Boundary key={`${props.id}:${props.url}:${revision}`} fallback={fallback('error')}>
  <Suspense fallback={fallback('loading')}><Model {...props} url={props.url} limits={limits} baseY={baseY} focus={focus}/></Suspense>
 </Boundary>:fallback(props.url?'error':'missing')
}
