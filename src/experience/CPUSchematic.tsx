import {useEffect,useLayoutEffect,useMemo,useRef} from 'react'
import {useFrame,useThree,type ThreeEvent} from '@react-three/fiber'
import {RoundedBox} from '@react-three/drei'
import {CanvasTexture,SRGBColorSpace,Group,InstancedMesh,Object3D,MathUtils,Mesh,BufferGeometry,BufferAttribute} from 'three'
import gsap from 'gsap'
import {Block,Inlay} from './MuseumPrimitives'
import {useMuseumPalette} from './museumPalette'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import {useCPUExperience} from '@/features/museum/cpuExperienceState'
import {cpuLayerHeight,lessonDuration,lessonHotspot,type CPUComponent} from '@/features/museum/cpuEducation'

export function CPUSchematic({reduced,visible}: {reduced:boolean;visible:boolean}) {
 const palette=useMuseumPalette(),{invalidate}=useThree()
 const inspecting=useMuseumNavigation(s=>s.mode==='inspect')
 const lesson=useCPUExperience(s=>s.lesson),run=useCPUExperience(s=>s.run),status=useCPUExperience(s=>s.status)
 const selected=useCPUExperience(s=>s.hotspot),activeComponent=selected==='heat'?'die':selected
 const root=useRef<Group>(null),layers=useRef<Partial<Record<CPUComponent,Group|null>>>({}),pins=useRef<InstancedMesh>(null)
 const heat=useRef<Group>(null),bands=useRef<(Mesh|null)[]>([]),expansion=useRef(0)
 const path=useRef<BufferGeometry>(null),pathPositions=useMemo(()=>new Float32Array(24),[])
 const clock=useRef({time:0}),timeline=useRef<gsap.core.Tween|null>(null)
 const surface=useMemo(()=>{
  const c=document.createElement('canvas');c.width=512;c.height=512;const ctx=c.getContext('2d')!
  ctx.fillStyle='#444c53';ctx.fillRect(0,0,512,512)
  for(let i=0;i<512;i++){ctx.fillStyle=i%3?'#70798022':'#11182022';ctx.fillRect(0,i,512,1)}
  ctx.strokeStyle=palette.orange;ctx.lineWidth=3;ctx.strokeRect(26,26,460,460)
  ctx.fillStyle=palette.ink;ctx.font='500 96px sans-serif';ctx.fillText('CORE',100,245)
  ctx.font='20px monospace';ctx.fillText('CPU / LEARNING MODEL',104,286)
  const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;return t
 },[palette])
 useEffect(()=>()=>surface.dispose(),[surface])
 useLayoutEffect(()=>{
  const p=pins.current;if(!p)return;const m=new Object3D()
  for(let i=0;i<64;i++){
   const side=Math.floor(i/16),d=-1.1+(i%16)*.146
   m.position.set(side<2?d:side===2?-1.28:1.28,0,side<2?side===0?-1.28:1.28:d)
   m.scale.set(side<2?.05:.23,.08,side<2?.23:.05);m.updateMatrix();p.setMatrixAt(i,m.matrix)
  }
  p.instanceMatrix.needsUpdate=true
 },[])
 useEffect(()=>{
  timeline.current?.kill();clock.current.time=0
  if(!lesson){invalidate();return}
  timeline.current=gsap.to(clock.current,{time:lessonDuration[lesson],duration:lessonDuration[lesson],ease:'none',
   paused:useCPUExperience.getState().status!=='playing',onUpdate:invalidate,
   onComplete:()=>{if(useCPUExperience.getState().run===run)useCPUExperience.getState().complete()}})
  const visibility=()=>{if(document.hidden)timeline.current?.pause();else if(useCPUExperience.getState().status==='playing')timeline.current?.resume()}
  document.addEventListener('visibilitychange',visibility)
  return()=>{timeline.current?.kill();document.removeEventListener('visibilitychange',visibility)}
 },[lesson,run,invalidate])
 useEffect(()=>{if(status==='playing'&&!document.hidden)timeline.current?.resume();else timeline.current?.pause();invalidate()},[status,invalidate])
 useFrame(({gl},delta)=>{
  if(!visible||document.hidden)return
  const state=useCPUExperience.getState(),time=clock.current.time
  const target=inspecting&&state.view==='schematic'?(state.exploded?1:0):0
  // A paused lesson freezes both layer separation and the teaching clock.
  if(state.status!=='paused')expansion.current=reduced?target:MathUtils.damp(expansion.current,target,5,Math.min(delta,.05))
  for(const component of ['spreader','interface','die','substrate','contacts'] as const){
   const layer=layers.current[component];if(layer)layer.position.y=cpuLayerHeight(component,expansion.current)
  }
  if(root.current)root.current.rotation.x=reduced?(inspecting?.30:.46):MathUtils.damp(root.current.rotation.x,inspecting?.30:.46,7,Math.min(delta,.05))
  if(heat.current)heat.current.visible=inspecting&&state.view==='schematic'&&(state.lesson==='heat'||state.hotspot==='heat')
  if(state.lesson&&state.status!=='idle')state.setLessonHotspot(lessonHotspot(state.lesson,time))
  const lower=cpuLayerHeight('die',expansion.current)+.08,upper=cpuLayerHeight('spreader',expansion.current)-.1
  const attribute=path.current?.getAttribute('position') as BufferAttribute|undefined
  if(attribute){
   const middle=cpuLayerHeight('interface',expansion.current)
   attribute.setXYZ(0,.7,lower,0);attribute.setXYZ(1,1.6,lower,0)
   attribute.setXYZ(2,1.6,lower,0);attribute.setXYZ(3,1.6,upper,0)
   attribute.setXYZ(4,.72,middle,0);attribute.setXYZ(5,1.6,middle,0)
   attribute.setXYZ(6,1.06,upper,0);attribute.setXYZ(7,1.6,upper,0);attribute.needsUpdate=true
  }
  bands.current.forEach((band,i)=>{if(band){
   const progress=reduced?(i+.5)/3:((time*.36+i/3)%1)
   band.position.y=lower+(upper-lower)*progress
   band.position.x=1.6
   band.scale.setScalar(.35+progress*.5)
  }})
  const value=expansion.current.toFixed(2)
  if(gl.domElement.getAttribute('data-cpu-explosion')!==value)gl.domElement.setAttribute('data-cpu-explosion',value)
  if(reduced&&Math.abs(expansion.current-target)>.001)invalidate()
 })
 useEffect(()=>{invalidate()},[visible,inspecting,selected,invalidate])
 const select=(component:CPUComponent)=>(e:ThreeEvent<MouseEvent>)=>{if(visible&&inspecting&&useCPUExperience.getState().view==='schematic'&&e.delta<5){e.stopPropagation();useCPUExperience.getState().selectHotspot(component)}}
 const outline=(component:CPUComponent,size:[number,number,number])=><mesh visible={inspecting&&activeComponent===component} scale={1.06}><boxGeometry args={size}/><meshBasicMaterial color={palette.orange} wireframe transparent opacity={.8} toneMapped={false}/></mesh>
 return <group name="cpu-educational-schematic" ref={root} visible={visible} position={[0,2.25,-27]} rotation={[.46,.55,0]}>
  <group name="cpu-layer:substrate" ref={g=>{layers.current.substrate=g}} onClick={select('substrate')}>
   <Block at={[0,0,0]} size={[2.7,.2,2.7]} color="#292b2d" roughness={.62}/>{outline('substrate',[2.7,.2,2.7])}
   {[-1,1].map(side=><group key={side}>
    <Inlay at={[side*1.18,.105,0]} size={[.015,.01,2.3]}/>
    <Inlay at={[0,.105,side*1.18]} size={[2.3,.01,.015]}/>
    {[0,1,2,3,4].map(n=><Block key={n} at={[side*.98,.17,n*.32-.64]} size={[.15,.1,.18]} color={palette.graphite}/>)}
   </group>)}
  </group>
  <group name="cpu-layer:contacts" ref={g=>{layers.current.contacts=g}} onClick={select('contacts')}>
   <instancedMesh ref={pins} args={[undefined,undefined,64]}><boxGeometry/><meshStandardMaterial color={palette.amber} metalness={.85} roughness={.25}/></instancedMesh>{outline('contacts',[2.8,.09,2.8])}
  </group>
  <group name="cpu-layer:die" ref={g=>{layers.current.die=g}} onClick={select('die')}>
   <Block at={[0,0,0]} size={[1.4,.12,1.4]} color="#454d5b" roughness={.2}/>
   <mesh position={[0,.065,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[1.32,1.32]}/><meshStandardMaterial color={palette.amber} emissive={palette.orange} emissiveIntensity={.12} metalness={.7} roughness={.5}/></mesh>
   {[-.45,-.15,.15,.45].map(x=><Block key={x} at={[x,.072,0]} size={[.012,.008,1.3]} color={palette.dark}/>)}{outline('die',[1.4,.14,1.4])}
  </group>
  <group name="cpu-layer:interface" ref={g=>{layers.current.interface=g}} onClick={select('interface')}>
   <Block at={[0,0,0]} size={[1.43,.03,1.43]} color="#a4a4a0" metal={.3} roughness={.65}/>{outline('interface',[1.43,.04,1.43])}
  </group>
  <group name="cpu-layer:spreader" ref={g=>{layers.current.spreader=g}} onClick={select('spreader')}>
   <RoundedBox args={[2.12,.19,2.12]} radius={.07} smoothness={2}><meshStandardMaterial color={palette.steel} metalness={.8} roughness={.5}/></RoundedBox>
   <mesh position={[0,.101,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[1.92,1.92]}/><meshStandardMaterial map={surface} metalness={.25} roughness={.72}/></mesh>
   <Inlay at={[0,-.1,1.03]} size={[1.9,.015,.02]}/>{outline('spreader',[2.12,.2,2.12])}
  </group>
  <group ref={heat} name="cpu-heat-illustration" visible={false}>
   <lineSegments><bufferGeometry ref={path}><bufferAttribute attach="attributes-position" args={[pathPositions,3]}/></bufferGeometry><lineBasicMaterial color={palette.orange} transparent opacity={.55}/></lineSegments>
   {[0,1,2].map(i=><mesh key={i} ref={mesh=>{bands.current[i]=mesh}} rotation={[-Math.PI/2,0,0]}>
    <ringGeometry args={[.38,.44,32]}/><meshBasicMaterial color={palette.orange} transparent opacity={.65} toneMapped={false} side={2}/>
   </mesh>)}
  </group>
 </group>
}
