import {assemblyOrder,parts,cables,cableIds,type PartId,type SlotId,type CableId,type PortId} from './assemblyDefinition.ts'
import {placementIssue,connectionIssue,type Build,type Issue} from './assemblyRules.ts'

export type AutomationKind='parts'|'cables'
export type AutomationStep={kind:'part';id:PartId;target:SlotId}|{kind:'cable';id:CableId}
export type AutomationProgress={kind:AutomationKind;status:'running'|'complete'|'cancelled'|'blocked';completed:number;total:number;step:AutomationStep|null;issue?:Issue|'notReady'}
export type AssemblyAnimator=(step:AutomationStep,signal:AbortSignal)=>Promise<void>
type Host=Build&{owner:string|null;ready:boolean;power:string;panelOpen:boolean;learningMode:string;dragging:boolean;install(id:PartId,slot:SlotId):boolean;select(id:PartId|CableId):void;port(id:PortId):void}

/** Transient orchestration only. Every committed step still runs the authoritative store actions. */
export function createAssemblyAutomation(read:()=>Host,publish:(progress:AutomationProgress)=>void){
 let active:AbortController|null=null,animator:AssemblyAnimator|null=null,committing=false,progress:AutomationProgress|null=null
 const guard=(s:Host):Issue|'notReady'|null=>!s.ready||!s.owner||s.dragging?'notReady':s.learningMode!=='assemble'?{code:'exploreOnly'}:s.power!=='off'?{code:'powerOff'}:!s.panelOpen?{code:'panelClosed'}:null
 const update=(p:AutomationProgress)=>{progress=p;publish(p)}
 const cancel=()=>{if(!active)return;const old=active;active=null;old.abort();if(progress)update({...progress,status:'cancelled',step:null})}
 return {
  get busy(){return active!==null},get committing(){return committing},
  register(next:AssemblyAnimator){animator=next;return()=>{if(animator===next){cancel();animator=null}}},cancel,
  async start(kind:AutomationKind){
   if(active)return
   const initial=read(),owner=initial.owner,total=kind==='parts'?assemblyOrder.filter(id=>id!=='monitor'&&!initial.installed[id]).length:cableIds.filter(id=>!initial.connected.includes(id)).length,issue=guard(initial)
   if(issue||!animator){update({kind,status:'blocked',completed:0,total,step:null,issue:issue??'notReady'});return}
   const controller=new AbortController();active=controller;let completed=0
   update({kind,status:'running',completed,total,step:null})
   try{
    while(active===controller){
     const s=read(),blocked=guard(s)
     if(blocked||s.owner!==owner){cancel();break}
     let step:AutomationStep|undefined,problem:Issue|undefined
     if(kind==='parts'){
      const remaining=assemblyOrder.filter(id=>id!=='monitor'&&!s.installed[id])
      for(const id of remaining){const target=parts[id].targets.find(target=>!placementIssue(s,id,target,s.panelOpen));if(target){step={kind:'part',id,target};break}problem??=placementIssue(s,id,parts[id].slot,s.panelOpen)??undefined}
     }else{
      for(const id of cableIds.filter(id=>!s.connected.includes(id))){const issue=connectionIssue(s,id,...cables[id].ends);if(!issue){step={kind:'cable',id};break}problem??=issue}
     }
     if(!step){active=null;update({kind,status:problem?'blocked':'complete',completed,total,step:null,...(problem?{issue:problem}:{})});break}
     update({kind,status:'running',completed,total,step})
     // Snapshot only references: no optimistic mount/connection enters persistence during motion.
     const installed=s.installed,connected=s.connected
     await animator(step,controller.signal)
     if(active!==controller||controller.signal.aborted)break
     const current=read()
     if(guard(current)||current.owner!==owner||current.installed!==installed||current.connected!==connected){cancel();break}
     committing=true
     let valid=false
     try{
      if(step.kind==='part')valid=current.install(step.id,step.target)
      else{current.select(step.id);current.port(cables[step.id].ends[0]);read().port(cables[step.id].ends[1]);valid=read().connected.includes(step.id)}
     }finally{committing=false}
     if(!valid){active=null;update({kind,status:'blocked',completed,total,step:null,issue:'notReady'});break}
     completed++
    }
   }catch(error){if(active===controller){active=null;update({kind,status:'blocked',completed,total,step:null,issue:'notReady'});if(!(error instanceof Error&&error.name==='AbortError'))console.error('Assembly animation interrupted',error)}}
  }
 }
}
