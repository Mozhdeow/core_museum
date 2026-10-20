import {create} from 'zustand'
import type {VisitSnapshot} from './visitPersistence.ts'
import {removeVisit,writeVisit} from './visitPersistence.ts'

/** Coordination only. The camera owner supplies samples and consumes restore requests. */
export const useVisitRuntime=create<{
 owner:string|null;phase:'waiting'|'restoring'|'ready';snapshot:VisitSnapshot|null;intent:number;epoch:number
 begin(owner:string,intent:number):void;stage(snapshot:VisitSnapshot|null):void;ready():void
}>(set=>({owner:null,phase:'waiting',snapshot:null,intent:0,epoch:0,
 begin:(owner,intent)=>set(s=>({owner,intent,phase:'waiting',snapshot:null,epoch:s.epoch+1})),
 stage:snapshot=>set({snapshot,phase:'restoring'}),ready:()=>set({phase:'ready',snapshot:null}),
}))
let sample:VisitSnapshot|null=null,lastWrite=0,lastSerialized=''
export function captureVisit(snapshot:VisitSnapshot){
 const runtime=useVisitRuntime.getState()
 if(runtime.phase!=='ready'||runtime.owner!==snapshot.owner)return
 sample=snapshot
}
export function flushVisit(force=false){
 const runtime=useVisitRuntime.getState()
 if(!sample||runtime.phase!=='ready'||sample.owner!==runtime.owner)return
 const now=Date.now()
 if(!force&&now-lastWrite<1000)return
 const serialized=JSON.stringify({...sample,savedAt:0})
 if(!force&&serialized===lastSerialized)return
 try{if(writeVisit(localStorage,{...sample,savedAt:now})){lastWrite=now;lastSerialized=serialized}}catch{/* Storage getter may also throw. */}
}
export function discardVisit(owner:string){
 if(useVisitRuntime.getState().owner===owner){sample=null;lastWrite=0;lastSerialized='';useVisitRuntime.setState({owner:null,phase:'waiting',snapshot:null})}
 try{removeVisit(localStorage,owner)}catch{/* Storage unavailable. */}
}
export function releaseVisit(){sample=null;lastWrite=0;lastSerialized=''}
