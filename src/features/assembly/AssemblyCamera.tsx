import {useEffect,useRef} from 'react'
import {useThree} from '@react-three/fiber'
import {OrbitControls} from '@react-three/drei'
import type {OrbitControls as OrbitControlsImpl} from 'three-stdlib'
import {Vector3,Spherical,MathUtils} from 'three'
import gsap from 'gsap'
import {parts,slotPosition,type V3} from './assemblyDefinition'
import {useAssembly} from './assemblyStore'
import {useReducedMotion} from '@/hooks/usePreferences'
const home:V3=[-7.4,8.3,13.8],aim:V3=[-1.1,2.45,.55]
const presets:Record<string,V3>={front:[0,6.7,10],back:[0,7.4,-10],sideLeft:[-10,8,0],sideRight:[10,8,0],top:[-1,12,.5],iso:home,io:[-2.8,8,5.5],staging:[-4.8,9,6.5]}
/** Sole Lab camera owner. Cyclorama begins outside the 25-unit camera envelope. */
export function AssemblyCamera(){
 const controls=useRef<OrbitControlsImpl>(null),canvas=useRef<HTMLCanvasElement|null>(null),{camera,gl,invalidate}=useThree(),command=useAssembly(s=>s.camera),reduced=useReducedMotion(),saved=useRef<{position:Vector3;target:Vector3}|null>(null)
 useEffect(()=>{canvas.current=gl.domElement;return()=>{canvas.current=null}},[gl])
 useEffect(()=>useAssembly.subscribe(s=>{if(controls.current)controls.current.enabled=!s.dragging&&!s.monitorFocused}),[])
 useEffect(()=>{const orbit=controls.current;if(!orbit)return;const position=new Vector3(...home),target=new Vector3(...aim)
  if(command.kind==='focus'&&command.part){if(!saved.current)saved.current={position:camera.position.clone(),target:orbit.target.clone()};const part=parts[command.part],slot=useAssembly.getState().installed[command.part];target.fromArray(slot?slotPosition(slot):part.tray);position.copy(target).add(command.part==='monitor'?new Vector3(-.75,.55,5.7):new Vector3(-4.7,3.1,5.2))}
  else if(command.kind==='return'&&saved.current){position.copy(saved.current.position);target.copy(saved.current.target);saved.current=null}
  else if(presets[command.kind]){position.fromArray(presets[command.kind]);target.set(0,2.8,0);if(command.kind==='iso')target.fromArray(aim);if(command.kind==='io')target.set(0,4.6,1.2);if(command.kind==='staging')target.set(-4.7,1.1,.5)}
  else if(['left','right','zoomIn','zoomOut'].includes(command.kind)){target.copy(orbit.target);position.copy(camera.position).sub(target);if(command.kind==='left'||command.kind==='right')position.applyAxisAngle(new Vector3(0,1,0),command.kind==='left'?.45:-.45);else position.multiplyScalar(command.kind==='zoomIn'?.82:1.18);position.clampLength(5.2,18).add(target)}
  const fromTarget=orbit.target.clone(),from=new Spherical().setFromVector3(camera.position.clone().sub(fromTarget)),to=new Spherical().setFromVector3(position.sub(target)),progress={value:0},offset=new Vector3(),turn=MathUtils.euclideanModulo(to.theta-from.theta+Math.PI,Math.PI*2)-Math.PI
  orbit.enabled=false;const tween=gsap.to(progress,{value:1,duration:reduced?0:.7,ease:'power2.inOut',onUpdate:()=>{const k=progress.value;orbit.target.lerpVectors(fromTarget,target,k);offset.setFromSphericalCoords(MathUtils.lerp(from.radius,to.radius,k),MathUtils.lerp(from.phi,to.phi,k),from.theta+turn*k);camera.position.copy(orbit.target).add(offset);orbit.update();invalidate()},onComplete:()=>{orbit.enabled=!useAssembly.getState().dragging&&!useAssembly.getState().monitorFocused}});return()=>{tween.kill();orbit.enabled=true}
 },[command,reduced,camera,invalidate])
 return <OrbitControls ref={controls} makeDefault enableDamping={!reduced} dampingFactor={.12} enablePan={false} minDistance={5.2} maxDistance={18} minPolarAngle={.12} maxPolarAngle={1.35} minAzimuthAngle={-Math.PI} maxAzimuthAngle={Math.PI} target={aim}
  onChange={()=>{const c=controls.current;if(!c)return;c.target.clamp(new Vector3(-6,1.1,-1.5),new Vector3(5.3,4.6,3.5));const p=c.object.position;p.y=Math.max(1.35,Math.min(23,p.y));const r=Math.hypot(p.x,p.z);if(r>25){p.x*=25/r;p.z*=25/r}if(Math.abs(p.x)<1.45&&p.y<5.5&&Math.abs(p.z)<2.15)p.x=p.x<0?-1.45:1.45;if(canvas.current)canvas.current.dataset.labCamera=p.toArray().map(v=>v.toFixed(3)).join(',')}}/>
}
