import {useEffect} from 'react'
import {useThree} from '@react-three/fiber'
import {Material,Mesh,Texture,WebGLRenderTarget,type Object3D} from 'three'
import {useMuseumQuality} from './useMuseumQuality'
/** Prepare mounted resources once at entry/tier change; never fetch or warm an unmounted GLB. */
export function MuseumRenderPreparation(){
 const get=useThree(s=>s.get),tier=useMuseumQuality(s=>s.tier),revision=useMuseumQuality(s=>s.contextRevision)
 useEffect(()=>{let cancelled=false;const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));const prepare=async()=>{
  const {gl,scene,camera,invalidate}=get();gl.domElement.dataset.museumPrepared='warming'
  await document.fonts.ready;await frame();await frame();if(cancelled)return
  const maps=new Set<Texture>();scene.traverse(node=>{if(node instanceof Mesh){const list=Array.isArray(node.material)?node.material:[node.material];for(const m of list)for(const value of Object.values(m as Material))if(value instanceof Texture)maps.add(value)}})
  let count=0;for(const map of maps){if(cancelled)return;gl.initTexture(map);if(++count%4===0)await frame()}
  await gl.compileAsync(scene,camera);if(cancelled)return
  // Allocate static buffers before the visitor sees a new hall, with no camera/path writes.
  const target=new WebGLRenderTarget(8,8),previous=gl.getRenderTarget(),culled=new Map<Object3D,boolean>()
  try{scene.traverse(node=>{culled.set(node,node.frustumCulled);node.frustumCulled=false});gl.setRenderTarget(target);gl.render(scene,camera)}finally{gl.setRenderTarget(previous);culled.forEach((value,node)=>{node.frustumCulled=value});target.dispose()}
  if(!cancelled){gl.domElement.dataset.museumPrepared='ready';invalidate()}
 };void prepare().catch(()=>{if(!cancelled)get().gl.domElement.dataset.museumPrepared='unavailable'});return()=>{cancelled=true}},[get,tier,revision])
 return null
}
