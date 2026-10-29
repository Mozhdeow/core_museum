import {useEffect,useMemo,useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import {Group,Mesh,MeshBasicMaterial,MathUtils} from 'three'
import {EntranceBatch,type EntrancePart} from './EntranceArtifacts'
import {useMuseumVisualResources} from './MuseumVisualResources'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import {doorEase,doorShouldOpen} from './visualDoorState'
function VisualDoor({kind,z,width,height,reduced}:{kind:string;z:number;width:number;height:number;reduced:boolean}){
 const shared=useMuseumVisualResources(),root=useRef<Group>(null),leaves=useRef<(Group|null)[]>([]),pool=useRef<Mesh>(null),state=useRef({open:false,value:0,from:0,target:0,elapsed:3})
 const parts=useMemo(()=>{
  const w=width/2+.06,dark:EntrancePart[]=[{at:[0,height/2,0],size:[w,height,.14]}],amber:EntrancePart[]=[],seams:EntrancePart[]=[]
  for(const x of [-w/2+.045,w/2-.045])amber.push({at:[x,height/2,.079],size:[.012,height-.12,.014]})
  for(const y of [.055,height-.055])amber.push({at:[0,y,.079],size:[w-.08,.012,.014]})
  for(const y of [height*.23,height*.77])seams.push({at:[0,y,.079],size:[w-.15,.024,.016]})
  seams.push({at:[w*.28,height*.5,.09],size:[.07,.42,.025]})
  return {dark,amber,seams}
 },[width,height])
 const glow=useMemo(()=>new MeshBasicMaterial({map:shared.textures.pool,color:'#ffb547',transparent:true,opacity:.12,depthWrite:false}),[shared])
 useEffect(()=>()=>glow.dispose(),[glow])
 useFrame(({camera,invalidate},delta)=>{
  const s=state.current,nav=useMuseumNavigation.getState(),advance=nav.mode==='guided'&&nav.playing&&nav.request.target>0
  s.open=doorShouldOpen(s.open,camera.position.z,z,advance)
  const target=reduced?1:s.open?1:0
  if(target!==s.target){s.from=s.value;s.target=target;s.elapsed=0}
  if(!document.hidden){s.elapsed=Math.min(3,s.elapsed+Math.min(delta,.05));s.value=reduced?1:s.from+(target-s.from)*doorEase(s.elapsed/3)}
  // Purely visual clearance: a fast walk/skip/restore can never put a leaf in
  // the camera near plane. No camera, collision or navigation state is written.
  const clearance=1-MathUtils.smoothstep(Math.abs(camera.position.z-z),1.1,2.8),open=Math.max(s.value,clearance)
  leaves.current.forEach((leaf,i)=>{if(leaf){leaf.position.x=(i?1:-1)*(width/4+open*(width/2+.1));leaf.visible=!(Math.abs(camera.position.z-z)<.6&&Math.abs(camera.position.x)<width/2+.3)}})
  if(pool.current){(pool.current.material as MeshBasicMaterial).opacity=.2*open;pool.current.scale.x=width*(.1+.9*open)}
  if(root.current){root.current.userData.open=open;root.current.userData.target=target;root.current.userData.visualOnly=true}
  if(s.elapsed<3)invalidate()
 })
 return <group ref={root} name={`museum-door:${kind}`} position={[0,0,z]} userData={{visualOnly:true}}>
  {[-1,1].map((side,i)=><group key={side} ref={n=>{leaves.current[i]=n}} position={[side*width/4,0,0]}>
   {side===-1&&<mesh name="door-overlap-strip" position={[width/4,height/2,.09]}><boxGeometry args={[.12,height,.05]}/><meshStandardMaterial color="#25282b" roughness={.8}/></mesh>}
   <EntranceBatch name={`door-${kind}-leaf`} parts={parts.dark} color="#3b423e"/>
   <EntranceBatch name={`door-${kind}-seams`} parts={parts.seams} color="#73766a"/>
   <EntranceBatch name={`door-${kind}-edge`} parts={parts.amber} color="#ffb547" luminous/>
  </group>)}
  <mesh ref={pool} position={[0,.014,.8]} rotation={[-Math.PI/2,0,0]} scale={[width,2.3,1]} material={glow} geometry={shared.plane} raycast={()=>null} dispose={null}/>
 </group>
}
export function MuseumDoors({reduced}:{reduced:boolean}){return <VisualDoor kind="main" z={2.7} width={6.2} height={4.22} reduced={reduced}/>}
