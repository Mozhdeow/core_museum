import {useEffect,useRef,useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Scan, X, RotateCcw, ZoomIn, ZoomOut, Play, Pause, Layers, ChevronDown} from 'lucide-react'
import {useMuseumNavigation} from './navigationState'
import {useCPUExperience} from './cpuExperienceState'
import {cpuHotspots} from './cpuEducation'
import './cpuExperience.css'

export function CPUExperienceControls({available,sourceId,realReady,educational=true}: {available:boolean;sourceId:string|null;realReady:boolean;educational?:boolean}) {
 const {t,i18n}=useTranslation('museum',{keyPrefix:'cpuExperience'}),locale=i18n.language==='fa'?'fa':'en'
 const phase=useMuseumNavigation(s=>s.inspection),location=useMuseumNavigation(s=>s.location)
 const exp=useCPUExperience(),[expanded,setExpanded]=useState(true),exitButton=useRef<HTMLButtonElement>(null)
 const previousFocus=useRef<HTMLElement|null>(null)
 const explanation=useRef<HTMLElement>(null)
 useEffect(()=>{
  let frame=0
  const reveal=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(exp.hotspot)explanation.current?.scrollIntoView({block:'end'})})}
  const observer=new ResizeObserver(reveal)
  if(explanation.current)observer.observe(explanation.current)
  reveal();window.addEventListener('resize',reveal)
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',reveal)}
 },[exp.hotspot,exp.run,locale])
 useEffect(()=>{if(phase==='exiting')useCPUExperience.getState().reset()},[phase])
 useEffect(()=>()=>useCPUExperience.getState().reset(),[])
 useEffect(()=>{
  if(phase==='closed')return
  if(exp.sourceId!==sourceId){useCPUExperience.getState().reset();useMuseumNavigation.getState().exitInspect()}
 },[sourceId,exp.sourceId,phase])
 useEffect(()=>{
  if(phase!=='entering')return
  exitButton.current?.focus()
 },[phase])
 useEffect(()=>{
  if(phase==='closed')previousFocus.current?.focus({preventScroll:true})
 },[phase])
 const open=(model:boolean)=>{
  previousFocus.current=document.activeElement as HTMLElement|null
  useCPUExperience.getState().open(sourceId,model&&realReady);setExpanded(true);useMuseumNavigation.getState().enterInspect()
 }
 const exit=()=>{useCPUExperience.getState().reset();useMuseumNavigation.getState().exitInspect()}
 if(phase==='closed')return available&&(realReady||location==='cpu')?<div className="cpu-inspect-entry">
  {realReady&&<button onClick={()=>open(true)}><Scan size={17}/>{t('inspectModel')}</button>}
  {location==='cpu'&&<button onClick={()=>open(false)}><Layers size={17}/>{t('exploreSchematic')}</button>}
 </div>:null
 const teaching=educational||exp.view==='schematic'
 const hotspot=cpuHotspots.find(h=>h.id===exp.hotspot)
 return <section className="cpu-inspector" role="region" aria-label={t(teaching?'title':'modelTitle')} data-cpu-inspection={phase} data-cpu-view={exp.view} data-lesson-state={exp.status}>
  <header className="cpu-inspector-header">
   <button className="cpu-panel-toggle" aria-expanded={expanded} aria-controls="cpu-learning-body" onClick={()=>setExpanded(!expanded)}><Scan size={16}/>{t(educational?'title':'modelTitle')}<ChevronDown size={14}/></button>
   <button ref={exitButton} onClick={exit} aria-label={t('exit')} title={t('exit')}><X size={18}/></button>
  </header>
  <div className="cpu-view-tools" aria-label={t('viewControls')}>
   <button aria-label={t('zoomIn')} onClick={()=>useMuseumNavigation.getState().zoomInspect(-1)}><ZoomIn size={17}/></button>
   <button aria-label={t('zoomOut')} onClick={()=>useMuseumNavigation.getState().zoomInspect(1)}><ZoomOut size={17}/></button>
   <button onClick={()=>useMuseumNavigation.getState().resetInspectView()}><RotateCcw size={14}/>{t('resetView')}</button>
   <button onClick={()=>document.querySelector<HTMLCanvasElement>('[data-museum-scene] canvas')?.focus()}>{t('focusArtifact')}</button>
  </div>
   {exp.lesson&&<div className="cpu-playback" aria-label={t('playback')}>
    <span role="status">{t(exp.lesson)} · {t(exp.status)}</span>
    {exp.status==='playing'?<button aria-label={t('pauseLesson')} onClick={exp.pause}><Pause size={16}/></button>:exp.status==='paused'?<button aria-label={t('playLesson')} onClick={exp.resume}><Play size={16}/></button>:null}
    <button aria-label={t('replayLesson')} onClick={()=>exp.start(exp.lesson!)}><RotateCcw size={16}/></button>
   </div>}
  <div id="cpu-learning-body" className="cpu-learning-body" hidden={!expanded}>
   <p className="cpu-interaction-hint">{t('instructions')}</p>
   {realReady&&educational&&<div className="cpu-view-choice" role="group" aria-label={t('viewChoice')}>
    <button aria-pressed={exp.view==='model'} onClick={()=>exp.chooseView('model')}>{t('selectedModel')}</button>
    <button aria-pressed={exp.view==='schematic'} onClick={()=>exp.chooseView('schematic')}>{t('schematic')}</button>
   </div>}
   <p className="cpu-schematic-notice">{t(exp.view==='schematic'?'schematicNotice':educational?'modelNotice':'intactModelNotice')}</p>
   {teaching&&<div className="cpu-lesson-choices">
    <button onClick={()=>exp.start('inside')}><Layers size={16}/>{t('inside')}</button>
    <button onClick={()=>exp.start('heat')}><span aria-hidden="true">↑</span>{t('heat')}</button>
   </div>}
   {exp.view==='schematic'&&<>
    <div className="cpu-assembly-tools"><button aria-pressed={exp.exploded} onClick={exp.toggleExplosion}>{t(exp.exploded?'reassemble':'explode')}</button><button onClick={exp.reset}>{t('resetLesson')}</button></div>
    <div className="cpu-hotspots" role="group" aria-label={t('components')}>
     {cpuHotspots.map((h,index)=><button key={h.id} data-hotspot-id={h.id} aria-pressed={exp.hotspot===h.id} onClick={()=>exp.selectHotspot(h.id)}><span aria-hidden="true">{index+1}</span>{h.title[locale]}</button>)}
    </div>
    {hotspot&&<article ref={explanation} className="cpu-hotspot-info" aria-live="polite" data-active-hotspot={hotspot.id}>
     <header><h2>{hotspot.title[locale]}</h2><button aria-label={t('closeHotspot')} onClick={()=>exp.selectHotspot(null)}><X size={15}/></button></header><p>{hotspot.explanation[locale]}</p>
    </article>}
   </>}
  </div>
 </section>
}
