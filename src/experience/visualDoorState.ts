/** Read-only visual thresholds; no collision, route or store mutations. */
export function doorShouldOpen(wasOpen:boolean,cameraZ:number,doorZ:number,advance=false){
 if(advance||cameraZ<doorZ+9)return true
 if(cameraZ>doorZ+12)return false
 return wasOpen
}
/** Existing motion vocabulary's strong ease-in-out cubic-bezier(.77,0,.175,1). */
export function doorEase(progress:number){
 const x=Math.max(0,Math.min(1,progress)),sample=(t:number,a:number,b:number)=>3*(1-t)*(1-t)*t*a+3*(1-t)*t*t*b+t*t*t
 let lo=0,hi=1,t=x
 for(let i=0;i<12;i++){if(sample(t,.77,.175)<x)lo=t;else hi=t;t=(lo+hi)/2}
 return sample(t,0,1)
}
