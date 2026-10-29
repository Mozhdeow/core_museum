import {useEffect,useMemo,useRef} from 'react'
import {CanvasTexture,SRGBColorSpace,MeshStandardMaterial,type Mesh,type BufferGeometry} from 'three'
import {useMuseumVisualResources} from './MuseumVisualResources'
/** Opaque print on a shared beveled physical plate, never a transparent floating label. */
export function MuseumPlaque({title,secondary,tag,rtl=false}:{title:string;secondary:string;tag:string;rtl?:boolean}){
 const shared=useMuseumVisualResources(),printMesh=useRef<Mesh<BufferGeometry,MeshStandardMaterial>>(null)
 const resources=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=640
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;map.anisotropy=shared.textures.brushed.anisotropy
  const material=new MeshStandardMaterial({map,roughness:.62,metalness:.2,envMapIntensity:.24,emissive:'#ffffff',emissiveMap:map,emissiveIntensity:.32})
  return {canvas,map,material}
 },[shared])
 useEffect(()=>{let live=true;const draw=()=>{if(!live)return;const c=resources.canvas.getContext('2d')!;c.fillStyle='#1a1c1b';c.fillRect(0,0,1536,640);const light=c.createLinearGradient(0,0,0,640);light.addColorStop(0,'#f0ddb522');light.addColorStop(1,'#00000022');c.fillStyle=light;c.fillRect(0,0,1536,640);c.strokeStyle='#b4945b';c.lineWidth=3;c.strokeRect(18,18,1500,604);c.direction=rtl?'rtl':'ltr';c.textAlign=rtl?'right':'left';const x=rtl?1458:78
  c.font='500 39px "Vazirmatn","Space Grotesk",sans-serif';c.fillStyle='#e6b768';c.fillText(tag,x,99,1380)
  let size=126;c.font=`600 ${size}px "Space Grotesk","Vazirmatn",sans-serif`;while(c.measureText(title).width>1380&&size>63)c.font=`600 ${--size}px "Space Grotesk","Vazirmatn",sans-serif`;c.fillStyle='#f2eee5';c.fillText(title,x,308,1380)
  c.font='500 58px "Vazirmatn","Space Grotesk",sans-serif';c.fillStyle='#c9cdc6';c.fillText(secondary,x,465,1380);const map=printMesh.current?.material.map;if(map)map.needsUpdate=true};draw();void document.fonts.ready.then(draw);return()=>{live=false}},[resources,title,secondary,tag,rtl])
 useEffect(()=>()=>{resources.map.dispose();resources.material.dispose()},[resources])
 return <group name={`pedestal-plaque:${title}`} userData={{title,secondary,rtl}}>
  <mesh geometry={shared.plaque} material={shared.frame} dispose={null} raycast={()=>null}/>
  <mesh ref={printMesh} position={[0,0,.023]} scale={[1.16,.46,1]} geometry={shared.plane} material={resources.material} dispose={null} raycast={()=>null}/>
 </group>
}
