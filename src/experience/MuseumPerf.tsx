import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {useFrame,useThree} from '@react-three/fiber'
import {useMuseumQuality} from './useMuseumQuality'
import {useMuseumNavigation} from '@/features/museum/navigationState'

import {perfEnabled,museumPerf,samples,hitches,changes,perfSnapshot} from './museumPerfData'
export function MuseumPerfProbe(){
 const get=useThree(s=>s.get),ready=useRef(0),gpu=useRef('unavailable')
 useEffect(()=>{if(!perfEnabled())return;const gl=get().gl,context=gl.getContext(),ext=context.getExtension('WEBGL_debug_renderer_info'),auto=gl.info.autoReset;gl.info.autoReset=false;gpu.current=String(ext?context.getParameter(ext.UNMASKED_RENDERER_WEBGL):context.getParameter(context.RENDERER));window.__corePerf=museumPerf;return()=>{gl.info.autoReset=auto;delete window.__corePerf}},[get])
 useFrame((state,dt)=>{if(!perfEnabled())return;const {gl,scene}=state;const now=performance.now(),nav=useMuseumNavigation.getState(),sample={at:now,ms:dt*1000,hall:nav.location,position:state.camera.position.toArray()};samples.push(sample);while(samples[0]&&now-samples[0].at>65000)samples.shift();if(dt>.05){hitches.push(sample);if(hitches.length>150)hitches.shift()}
  const calls=gl.info.render.calls,triangles=gl.info.render.triangles;gl.info.reset()
  if(now-ready.current<500)return;ready.current=now
  let lights=0;scene.traverse(o=>{if('isLight'in o&&o.visible)lights++})
  const reflection=scene.getObjectByName('museum-architectural-reflection')
  const q=useMuseumQuality.getState(),last=changes.at(-1);if(last?.tier!==q.tier||last?.reason!==q.reason||last?.dpr!==gl.getPixelRatio()){changes.push({at:now,tier:q.tier,reason:q.reason,dpr:gl.getPixelRatio()});if(changes.length>80)changes.shift()}
  perfSnapshot.current={at:new Date().toISOString(),tier:useMuseumQuality.getState().tier,reason:useMuseumQuality.getState().reason,dpr:gl.getPixelRatio(),calls,triangles,...gl.info.memory,programs:gl.info.programs?.length??0,lights,gpu:gpu.current,postprocessing:Boolean(state.internal.priority),reflector:reflection?.userData.reflection??false,reflectionCaptures:reflection?.userData.captures??0,hall:nav.location,position:state.camera.position.toArray()}
 },-100)
 return null
}
export function MuseumPerfOverlay(){
 const [snapshot,setSnapshot]=useState<Record<string,unknown>>({}),[copied,setCopied]=useState(false)
 useEffect(()=>{if(!perfEnabled())return;const id=setInterval(()=>setSnapshot(museumPerf.dump()),500);return()=>clearInterval(id)},[])
 if(!perfEnabled())return null
 const rounded=(v:unknown)=>typeof v==='number'?Math.round(v*10)/10:v
 const display={fps:rounded(snapshot.fps),ms:{avg:rounded(snapshot.avg),p95:rounded(snapshot.p95),p99:rounded(snapshot.p99)},quality:snapshot.tier,reason:snapshot.reason,DPR:rounded(snapshot.dpr),calls:snapshot.calls,triangles:snapshot.triangles,programs:snapshot.programs,lights:snapshot.lights,geometries:snapshot.geometries,textures:snapshot.textures,FX:snapshot.postprocessing,reflection:snapshot.reflector,captures:snapshot.reflectionCaptures,gpu:snapshot.gpu,hitches:(snapshot.hitches as {at:number;ms:number;hall:string;position:number[]}[]??[]).slice(-3).map(h=>`${(h.at/1000).toFixed(1)}s / ${h.ms.toFixed(1)}ms / ${h.hall} / ${h.position.map(n=>n.toFixed(1)).join(',')}`)}
 return createPortal(<aside style={{position:'fixed',top:70,right:8,zIndex:150,width:360,maxWidth:'95vw',background:'#080d13f2',color:'#eee',padding:12,font:'12px monospace',pointerEvents:'auto',maxHeight:'70dvh',overflow:'auto'}} aria-label="Museum performance">
  <strong>CORE / PERF · last 5 s</strong><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(display,null,1)}</pre>
  <button style={{minHeight:44,padding:'4px 8px',border:'1px solid #6d777e'}} onClick={()=>{void navigator.clipboard?.writeText(JSON.stringify(museumPerf.dump(),null,2)).then(()=>setCopied(true)).catch(()=>setCopied(false))}}>{copied?'Copied':'Copy JSON'}</button><span> · window.__corePerf.dump()</span>
 </aside>,document.body)
}
