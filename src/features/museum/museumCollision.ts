export const CPU_PLATFORM = {x:0,z:-27,radius:3.55,clearance:.7} as const
export const CPU_CLEARANCE_RADIUS=CPU_PLATFORM.radius+CPU_PLATFORM.clearance
let archiveEnd=18
export function configureExhibitionEnd(end:number){archiveEnd=Number.isFinite(end)?Math.max(18,end):18}
/** Project an invalid position out of the exhibition envelope, without moving through it. */
export function excludeCPUPlatform(x:number,z:number){
 const dx=x-CPU_PLATFORM.x,dz=z-CPU_PLATFORM.z,distance=Math.hypot(dx,dz)
 if(distance>=CPU_CLEARANCE_RADIUS)return {x,z}
 if(distance<1e-8)return {x:0,z:CPU_PLATFORM.z+CPU_CLEARANCE_RADIUS}
 return {x:CPU_PLATFORM.x+dx/distance*CPU_CLEARANCE_RADIUS,z:CPU_PLATFORM.z+dz/distance*CPU_CLEARANCE_RADIUS}
}
function zone(x:number,z:number){
 const safeZ=Math.max(-23,Math.min(archiveEnd,Number.isFinite(z)?z:15.5))
 const width=safeZ>20?2.45:safeZ>3?5.5:safeZ<-19?6:2.45
 return {x:Math.max(-width,Math.min(width,Number.isFinite(x)?x:0)),z:safeZ}
}
export function constrainMuseumPosition(x:number,z:number){
 const bounded=zone(x,z);return excludeCPUPlatform(bounded.x,bounded.z)
}
export function moveMuseumPosition(x:number,z:number,dx:number,dz:number){
 const from=constrainMuseumPosition(x,z)
 if(!Number.isFinite(dx)||!Number.isFinite(dz))return from
 // Substeps also protect fast movement or a delayed frame. Slide one axis at a time.
 const length=Math.hypot(dx,dz),limit=Math.min(1,76/Math.max(length,1e-9))
 const count=Math.max(1,Math.ceil(length*limit/.12)),stepX=dx*limit/count,stepZ=dz*limit/count
 const allowed=(cx:number,cz:number)=>{
  const checked=constrainMuseumPosition(cx,cz)
  return Math.abs(checked.x-cx)<1e-8&&Math.abs(checked.z-cz)<1e-8
 }
 for(let i=0;i<count;i++){
  if(allowed(from.x+stepX,from.z))from.x+=stepX
  if(allowed(from.x,from.z+stepZ))from.z+=stepZ
 }
 return from
}
