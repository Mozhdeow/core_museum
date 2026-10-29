import {useEffect,useMemo,useRef,type ReactNode} from 'react'
import {useFrame,useThree,type ThreeEvent} from '@react-three/fiber'
import {Group,MathUtils,Frustum,Matrix4,Vector3,Mesh,MeshBasicMaterial} from 'three'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import {useMuseumStore} from '@/features/museum/museumStore'
import {useReducedMotion} from '@/hooks/usePreferences'
/** Environmental illustrations keep their labels/identity; selection only uses existing published UUIDs. */
export function EntranceStudy({kind,index,children}:{kind:string;index:number;children:ReactNode}){
 const root=useRef<Group>(null),edge=useRef<Mesh>(null),hover=useRef(false),time=useRef(index*2.1),speed=useRef(0),facing=useRef(0),lastFocus=useRef(''),reduced=useReducedMotion(),canvas=useThree(s=>s.gl.domElement),canvasRef=useRef<HTMLCanvasElement|null>(null)
 const work=useMemo(()=>({point:new Vector3(),matrix:new Matrix4(),frustum:new Frustum()}),[])
 const pointer=(e:ThreeEvent<PointerEvent>,value:boolean)=>{e.stopPropagation();if(useMuseumNavigation.getState().mode==='inspect'||!matchMedia('(hover: hover) and (pointer: fine)').matches)return;if(value&&!hover.current)facing.current=.8;hover.current=value;if(canvasRef.current)canvasRef.current.style.cursor=value?'pointer':''}
 useEffect(()=>{canvasRef.current=canvas;return()=>{if(hover.current&&canvasRef.current)canvasRef.current.style.cursor='';canvasRef.current=null}},[canvas])
 useFrame(({camera},delta)=>{
  const node=root.current;if(!node)return
  node.userData.hovered=hover.current
  if(edge.current){edge.current.visible=hover.current;(edge.current.material as MeshBasicMaterial).opacity=MathUtils.damp((edge.current.material as MeshBasicMaterial).opacity,hover.current?.2:0,8,Math.min(delta,.05))}
  if(reduced){node.rotation.set(0,0,0);node.position.y=1.89;return}
  const nav=useMuseumNavigation.getState()
  if(document.hidden||nav.atmospherePaused||nav.overlay||nav.mode==='inspect'||nav.mode==='guided'&&!nav.playing&&nav.progress>.01&&nav.progress<.99)return
  node.getWorldPosition(work.point);if(camera.position.distanceToSquared(work.point)>196)return
  work.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);work.frustum.setFromProjectionMatrix(work.matrix);if(!work.frustum.containsPoint(work.point))return
  const catalog=useMuseumStore.getState(),selected=catalog.items.find(i=>i.id===catalog.focusedItemId),slug=catalog.categories.find(c=>c.id===selected?.categoryId)?.slug,focused=slug===(kind==='hdd'?'storage':kind)
  // Selection/hover ease the speed but never stop the turntable. Angle survives
  // Inspect/pause unchanged, so returning resumes at the current phase, not zero.
  if(focused&&lastFocus.current!==selected?.id){facing.current=.8;lastFocus.current=selected?.id??''}
  const dt=Math.min(delta,.05),base=Math.PI*2/(14+index*.8),target=base*(hover.current?.48:focused?.72:1)
  speed.current=MathUtils.damp(speed.current,target,3,dt);time.current+=dt;node.rotation.y+=speed.current*dt
  if(facing.current>0){const desired=Math.atan2(camera.position.x-work.point.x,camera.position.z-work.point.z);node.rotation.y+=Math.atan2(Math.sin(desired-node.rotation.y),Math.cos(desired-node.rotation.y))*(1-Math.exp(-dt*6))*Math.min(1,facing.current/.2);facing.current=Math.max(0,facing.current-dt)}
  node.position.y=1.89+Math.sin(time.current*.7)*.004;node.rotation.z=Math.sin(time.current*.43)*.006
 })
 return <group name={`environmental-prototype:${kind}`} ref={root} position={[0,1.89,0]} rotation={[0,index*.36,0]} userData={{proceduralPrototype:true}}
  onPointerOver={e=>pointer(e,true)} onPointerOut={e=>pointer(e,false)} onClick={e=>{e.stopPropagation();const nav=useMuseumNavigation.getState();if(nav.mode==='inspect'||nav.overlay)return;const catalog=useMuseumStore.getState(),category=catalog.categories.find(c=>c.active&&c.slug===(kind==='hdd'?'storage':kind));if(!category)return;const items=catalog.items.filter(i=>i.categoryId===category.id&&i.status==='published'),item=items.find(i=>i.id===catalog.focusedItemId)||items.find(i=>i.id===catalog.categorySelections[category.id])||items[0];if(item){catalog.setCategoryFilter(category.id);catalog.restoreSelection(item.id,item.sectionId??null)}}}>
  {children}
  <mesh ref={edge} position={[0,-.6,0]} rotation={[-Math.PI/2,0,0]} visible={false} raycast={()=>null}><ringGeometry args={[.34,.37,32]}/><meshBasicMaterial color="#ffb547" transparent opacity={0} depthWrite={false}/></mesh>
 </group>
}
