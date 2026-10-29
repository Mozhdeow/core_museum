import {useEffect,useState} from 'react'
import {useFrame,useThree} from '@react-three/fiber'
import {perfEnabled,perfSamples,perfInfo,assemblyPerf} from './assemblyPerfData'
function Probe(){const get=useThree(s=>s.get);useEffect(()=>{window.__assemblyPerf=assemblyPerf;return()=>{delete window.__assemblyPerf;perfSamples.length=0}},[]);useFrame((_,dt)=>{perfSamples.push(dt*1000);if(perfSamples.length>300)perfSamples.shift();const {gl,frameloop}=get();perfInfo.current={frameloop,...gl.info.memory,calls:gl.info.render.calls,triangles:gl.info.render.triangles,programs:gl.info.programs?.length,dpr:gl.getPixelRatio(),renderer:gl.getContext().getParameter(gl.getContext().RENDERER)}});return null}
export function AssemblyPerfProbe(){return perfEnabled()?<Probe/>:null}
export function AssemblyPerfOverlay(){const [value,setValue]=useState({});useEffect(()=>{if(!perfEnabled())return;const timer=setInterval(()=>setValue(assemblyPerf.dump()),500);return()=>clearInterval(timer)},[]);return perfEnabled()?<aside className="assembly-perf" aria-label="Lab performance"><strong>CORE / PERF</strong><pre>{JSON.stringify(value,null,1)}</pre></aside>:null}
