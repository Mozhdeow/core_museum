import {useEffect,useMemo,useRef,useState} from 'react'
import {useFrame} from '@react-three/fiber'
import {MeshStandardMaterial,MeshBasicMaterial,Group,Mesh,CanvasTexture,SRGBColorSpace,type Texture} from 'three'
import {useReducedMotion} from '@/hooks/usePreferences'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import {useMuseumPalette} from './museumPalette'
import {hardwarePreviewGeometry,hardwarePreviewKind} from './hardwarePreviewGeometry'

/** Optional same-item image accent, requested only in the existing nearest-pair range.
 * The procedural hardware stays complete if the bitmap is absent, blocked or still loading. */
function Thumbnail({url}:{url:string}){
 const [texture,setTexture]=useState<Texture|null>(null)
 useEffect(()=>{
  let live=true,owned:Texture|null=null
  const image=new Image();image.crossOrigin='anonymous'
  image.onload=()=>{
   if(!live)return
   const canvas=document.createElement('canvas');canvas.width=256;canvas.height=192
   const context=canvas.getContext('2d');if(!context)return
   const scale=Math.min(256/image.width,192/image.height),width=image.width*scale,height=image.height*scale
   context.drawImage(image,(256-width)/2,(192-height)/2,width,height)
   owned=new CanvasTexture(canvas);owned.colorSpace=SRGBColorSpace;setTexture(owned);image.removeAttribute('src')
  }
  image.onerror=()=>{};image.src=url
  return()=>{live=false;image.onload=null;image.onerror=null;image.removeAttribute('src');owned?.dispose()}
 },[url])
 return texture?<mesh position={[.59,-.59,.15]} name="same-item-preview-thumbnail"><planeGeometry args={[.24,.19]}/><meshBasicMaterial map={texture} toneMapped={false}/></mesh>:null
}

export function ShowcasePreview({id,category,title='',thumbnail,enhance=false,preparing,revealed}:{id:string;category:string;title?:string;thumbnail?:string;enhance?:boolean;preparing:boolean;revealed:boolean}){
 const reduced=useReducedMotion(),palette=useMuseumPalette(),root=useRef<Group>(null),content=useRef<Group>(null),scan=useRef<Mesh>(null)
 const time=useRef(0),fade=useRef({value:1,from:1,target:1,elapsed:.2}),kind=hardwarePreviewKind(category,title)
 const resources=useMemo(()=>({
  geometries:hardwarePreviewGeometry(kind),
  materials:['#20513e','#232a30','#8a959d','#c6d0d4','#c39b50'].map(color=>new MeshStandardMaterial({color,roughness:.58,metalness:.3})),
  scan:new MeshBasicMaterial({color:palette.cyan,transparent:true,opacity:.3,depthWrite:false,toneMapped:false})
 }),[kind,palette.cyan])
 useEffect(()=>()=>{resources.geometries.forEach(g=>g?.dispose());resources.materials.forEach(m=>m.dispose());resources.scan.dispose()},[resources])
 useFrame((state,dt)=>{
  const f=fade.current,target=revealed?0:1
  if(target!==f.target){f.from=f.value;f.target=target;f.elapsed=0}
  f.elapsed=Math.min(.2,f.elapsed+Math.min(dt,.05));f.value=f.from+(f.target-f.from)*(1-Math.pow(1-f.elapsed/.2,3))
  // The solids keep depth/occlusion at rest. Only the short transition uses transparency.
  content.current?.traverse(node=>{if(node instanceof Mesh){const material=node.material as MeshStandardMaterial,transparent=f.value<1
   if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true}
   material.opacity=f.value;material.depthWrite=f.value>=1
  }})
  const nav=useMuseumNavigation.getState(),animate=preparing&&!reduced&&!nav.atmospherePaused&&!nav.overlay&&nav.mode!=='inspect'&&!document.hidden
  if(animate)time.current+=Math.min(dt,.05)
  if(root.current){root.current.visible=f.value>.001;root.current.userData.opacity=f.value}
  if(scan.current){(scan.current.material as MeshBasicMaterial).opacity=f.value*.3;scan.current.visible=preparing;scan.current.position.y=reduced?0:Math.sin(time.current*1.8)*.56}
  if(f.elapsed<.2||animate)state.invalidate()
 })
 return <group ref={root} name={`showcase-preview:${id}`} position={[0,1.9,.07]} userData={{kind,schematic:true}}>
  <group ref={content} rotation={[-.04,.06,0]} name={`preview-hardware:${kind}`}>
   {resources.geometries.map((geometry,index)=>geometry&&<mesh key={index} name={`preview-batch:${index}`} geometry={geometry} material={resources.materials[index]} dispose={null}/>)}
   {thumbnail&&enhance&&<Thumbnail key={thumbnail} url={thumbnail}/>}
  </group>
  <mesh ref={scan} name={`showcase-scan:${id}`} position={[0,0,.21]} material={resources.scan} visible={preparing}>
   <planeGeometry args={[1.4,.025]}/>
  </mesh>
 </group>
}
