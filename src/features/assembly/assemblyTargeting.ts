import {Box3,Plane,Vector3,type Ray} from 'three'
import {parts,slots,slotPosition,type PartId,type SlotId,type V3} from './assemblyDefinition'

export function targetSize(slot:SlotId):V3 {
 if(slot==='motherboard')return [.35,2.5,2.5]
 if(slot==='cpu')return [.4,.55,.55]
 if(slot==='cooler')return [1.1,1.1,1.1]
 if(slot==='ram1'||slot==='dimmB2')return [.12,1.45,.12]
 return parts[slot].size
}

/** DIMMs share a board plane. Resolve lateral proximity, never array order through overlapping boxes. */
export function resolveAssemblyDrop(part:PartId,ray:Ray):SlotId|undefined {
 const spec=parts[part],point=new Vector3()
 if(part==='ram1'||part==='ram2'){
  const mount=slotPosition('ram1'),plane=new Plane(new Vector3(1,0,0),-mount[0])
  if(ray.intersectPlane(plane,point)&&Math.abs(point.y-mount[1])<=.82){
   const nearest=[...spec.targets].sort((a,b)=>Math.abs(point.z-slotPosition(a)[2])-Math.abs(point.z-slotPosition(b)[2]))[0]
   if(Math.abs(point.z-slotPosition(nearest)[2])<=.17)return nearest
  }
 }
 const box=new Box3(),center=new Vector3(),size=new Vector3()
 const hits=slots.filter(slot=>slot!=='monitor'&&slot!=='ram1'&&slot!=='dimmB2').flatMap(slot=>{
  box.setFromCenterAndSize(center.fromArray(slotPosition(slot)),size.fromArray(targetSize(slot)).addScalar(.12))
  return ray.intersectBox(box,point)?[{slot,distance:point.distanceToSquared(ray.origin),compatible:spec.targets.includes(slot)}]:[]
 }).sort((a,b)=>Number(b.compatible)-Number(a.compatible)||a.distance-b.distance)
 return hits[0]?.slot
}
