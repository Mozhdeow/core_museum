import {WandSparkles,Square} from 'lucide-react'
import {useId} from 'react'
import {useTranslation} from 'react-i18next'
import {assemblyAutomation,useAssembly} from './assemblyStore'
import type {AutomationKind} from './assemblyAutomation'

export function AssemblyAutoButton({kind,ready=true,describedBy}:{kind:AutomationKind;ready?:boolean;describedBy?:string}){
 const {t}=useTranslation('assembly'),state=useAssembly(),running=state.automation?.status==='running'
 const name=t(running?'auto.cancel':kind==='parts'?'auto.installAllParts':'auto.cables')
 return <button className="assembly-auto-button" aria-describedby={describedBy} aria-label={name} title={name} disabled={!running&&(!ready||!state.ready||state.dragging||state.learningMode!=='assemble'||state.power!=='off'||!state.panelOpen)} onClick={()=>{if(running)assemblyAutomation.cancel();else void assemblyAutomation.start(kind)}}>
  {running?<Square size={16}/>:<WandSparkles size={17}/>}<span>{name}</span>{running&&<small dir="ltr">{state.automation!.completed}/{state.automation!.total}</small>}
 </button>
}

export function AssemblyAutoFeedback({kind,inline=false}:{kind?:AutomationKind;inline?:boolean}){
 const {t}=useTranslation('assembly'),progress=useAssembly(s=>s.automation)
 if(!progress||kind&&progress.kind!==kind)return null
 const issue=progress.issue,detail=issue&&issue!=='notReady'?t('issues.'+issue.code)+(issue.part?' · '+t(`parts.${issue.part}.name`):''):issue==='notReady'?t('auto.notReady'):null
 return <span className={inline?'assembly-auto-panel-feedback':'assembly-auto-feedback'} role="status" aria-live="polite" data-status={progress.status}>
  <span>{detail??t('auto.'+progress.status)}{progress.step?' · '+t(`${progress.step.kind==='part'?'parts':'cables'}.${progress.step.id}.name`):''}</span>
  <small dir="ltr">{progress.completed} / {progress.total}</small>
  {inline&&<progress aria-label={t('auto.progress')} value={progress.completed} max={Math.max(1,progress.total)}/>}
 </span>
}

/** Discoverable entry point to the existing controller, beside the inventory it operates on. */
export function AssemblyAutoPanel({kind,ready}:{kind:AutomationKind;ready:boolean}){
 const {t}=useTranslation('assembly'),state=useAssembly(),hintId=useId(),running=state.automation?.status==='running'
 const hint=!ready||!state.ready?'auto.notReady':state.learningMode!=='assemble'?'auto.assembleMode':state.power!=='off'?'issues.powerOff':!state.panelOpen?'issues.panelClosed':state.dragging?'auto.finishDrag':null
 return <div className="assembly-auto-panel">
  <AssemblyAutoButton kind={kind} ready={ready} describedBy={!running&&hint?hintId:undefined}/>
  {!running&&hint&&<p id={hintId} className="assembly-auto-hint">{t(hint)}</p>}
  <AssemblyAutoFeedback kind={kind} inline/>
 </div>
}
