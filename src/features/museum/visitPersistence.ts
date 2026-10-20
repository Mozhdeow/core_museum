import {Quaternion, Euler,Vector3,Matrix4} from 'three'
import {constrainMuseumPosition} from './museumCollision.ts'
import {destinationAt, type MuseumDestination} from './navigationState.ts'
import {createMuseumRoute} from './museumRoute.ts'

export const VISIT_VERSION=1
export const VISIT_ARCHITECTURE='connected-08a-1'
export const VISIT_TTL=7*24*60*60*1000
export const visitKey=(owner:string)=>`core-museum-visit:${owner}`
export type WalkingPose={position:[number,number,number];quaternion:[number,number,number,number]}
export type VisitSnapshot={
 version:1;architecture:string;owner:string;savedAt:number
 location:MuseumDestination;checkpoint:MuseumDestination;mode:'guided'|'explore';pose:WalkingPose
 progress:number;target:number;selectedId:string|null;sectionId:string|null
 showcaseBay?:number
 categoryId?:string|null
 inspect:null|{view:'model'|'schematic';sourceId:string|null;modelPath:string|null;orbit:{yaw:number;pitch:number;distance:number}}
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const id=(v:unknown)=>v===null||typeof v==='string'&&uuid.test(v)
const unit=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1
const place=(v:unknown):v is MuseumDestination=>v==='entrance'||v==='corridor'||v==='cpu'
const numbers=(v:unknown,n:number):v is number[]=>Array.isArray(v)&&v.length===n&&v.every(x=>typeof x==='number'&&Number.isFinite(x))
export function validWalkingPose(value:unknown):value is WalkingPose {
 if(!value||typeof value!=='object')return false
 const p=value as WalkingPose
 if(!numbers(p.position,3)||!numbers(p.quaternion,4)||Math.abs(p.position[1]-1.72)>.01)return false
 const safe=constrainMuseumPosition(p.position[0],p.position[2])
 if(Math.hypot(safe.x-p.position[0],safe.z-p.position[2])>.001)return false
 const q=new Quaternion(...p.quaternion)
 if(Math.abs(q.length()-1)>.001)return false
 const e=new Euler().setFromQuaternion(q,'YXZ')
 return Math.abs(e.x)<=.651&&Math.abs(e.z)<.01
}
/** Storage is untrusted. Only construct the allowlisted DTO; never merge stored state into a store. */
export function validateVisit(value:unknown,owner:string,now=Date.now(),ttl=VISIT_TTL):VisitSnapshot|null {
 if(!value||typeof value!=='object')return null
 const s=value as VisitSnapshot
 if(s.version!==VISIT_VERSION||s.architecture!==VISIT_ARCHITECTURE||s.owner!==owner||!Number.isFinite(s.savedAt)||s.savedAt>now+60000||now-s.savedAt>ttl
  ||!place(s.location)||!place(s.checkpoint)||!['guided','explore'].includes(s.mode)||!unit(s.progress)||!unit(s.target)||!id(s.selectedId)||!id(s.sectionId))return null
 // A valid checkpoint can recover an unsafe pose without accepting its coordinates.
 const routeCompatible=s.mode!=='guided'||validWalkingPose(s.pose)&&createMuseumRoute().getPointAt(s.progress).distanceTo(new Vector3(...s.pose.position))<1.25
 const pose=validWalkingPose(s.pose)&&routeCompatible?{position:[...s.pose.position],quaternion:[...s.pose.quaternion]} as WalkingPose:null
 let inspect:VisitSnapshot['inspect']=null
 if(pose&&s.inspect&&typeof s.inspect==='object'){
  const i=s.inspect,o=i.orbit
  if((i.view==='model'||i.view==='schematic')&&id(i.sourceId)&&(i.modelPath===null||typeof i.modelPath==='string'&&i.modelPath.length<1024)
   &&o&&numbers([o.yaw,o.pitch,o.distance],3)
   &&(i.view==='model'?Math.abs(o.yaw)<=Math.PI&&Math.abs(o.pitch)<=1.35&&o.distance>=3.4&&o.distance<=30:o.yaw>=-.9&&o.yaw<=.9&&o.pitch>=.05&&o.pitch<=.43&&o.distance>=5.2&&o.distance<=8.8)
   &&(i.view==='model'?i.sourceId!==null&&i.sourceId===s.selectedId:destinationAt(pose.position[2])==='cpu'))
   inspect={view:i.view,sourceId:i.sourceId,modelPath:i.modelPath,orbit:{yaw:o.yaw,pitch:o.pitch,distance:o.distance}}
 }
 const fallbackPosition=createMuseumRoute().getPointAt({entrance:0,corridor:.5,cpu:1}[s.checkpoint])
 const fallbackRotation=new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(fallbackPosition,new Vector3(0,1.6,fallbackPosition.z-8),new Vector3(0,1,0)))
 const accepted=pose??{position:fallbackPosition.toArray(),quaternion:fallbackRotation.toArray()} as WalkingPose
 return {version:VISIT_VERSION,architecture:VISIT_ARCHITECTURE,owner,savedAt:s.savedAt,mode:s.mode,pose:accepted,
  location:destinationAt(accepted.position[2]),checkpoint:s.checkpoint,progress:pose?s.progress:({entrance:0,corridor:.5,cpu:1}[s.checkpoint]),
  target:s.target,selectedId:s.selectedId,sectionId:s.sectionId,inspect,...(id(s.categoryId)?{categoryId:s.categoryId}:{}),...(Number.isInteger(s.showcaseBay)&&s.showcaseBay!>=0&&s.showcaseBay!<100000?{showcaseBay:s.showcaseBay}:{})}
}
export type VisitStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>
export function readVisit(storage:VisitStorage,owner:string,now=Date.now(),ttl=VISIT_TTL){
 try{return validateVisit(JSON.parse(storage.getItem(visitKey(owner))??'null'),owner,now,ttl)}catch{return null}
}
export function writeVisit(storage:VisitStorage,snapshot:VisitSnapshot){
 try{storage.setItem(visitKey(snapshot.owner),JSON.stringify(snapshot));return true}catch{return false}
}
export function removeVisit(storage:VisitStorage,owner:string){try{storage.removeItem(visitKey(owner))}catch{/* Browsing remains available. */}}
