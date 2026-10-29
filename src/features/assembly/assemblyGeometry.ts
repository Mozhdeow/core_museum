import type {V3} from './assemblyDefinition.ts'
export type Volume={id:string;center:V3;size:V3}
const mix=(a:V3,b:V3,t:number):V3=>a.map((v,i)=>v+(b[i]-v)*t) as V3
const length=(a:V3,b:V3)=>Math.hypot(...a.map((v,i)=>v-b[i]))
/** Circular corner fillets stay in the waypoint convex hull. Short docking runs cap the radius. */
export function roundedRoute(route:V3[],bend=.04):V3[]{
 const out:V3[]=[route[0]];for(let i=1;i<route.length-1;i++){
  const a=route[i-1],b=route[i],c=route[i+1],ab=length(a,b),bc=length(b,c),u=b.map((v,k)=>(v-a[k])/(ab||1)) as V3,v=c.map((v,k)=>(v-b[k])/(bc||1)) as V3,angle=Math.acos(Math.max(-1,Math.min(1,u.reduce((s,n,k)=>s+n*v[k],0))))
  if(angle<.001){out.push(b);continue}
  const trim=Math.min(bend*Math.tan(angle/2),ab*.45,bc*.45),r=trim/Math.tan(angle/2),entry=mix(b,a,trim/(ab||1)),bisector=v.map((n,k)=>n-u[k]) as V3,norm=Math.hypot(...bisector),center=b.map((n,k)=>n+bisector[k]/norm*r/Math.cos(angle/2)) as V3,radial=entry.map((n,k)=>n-center[k]) as V3,cross:V3=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],cl=Math.hypot(...cross),axis=cross.map(n=>n/(cl||1)) as V3,tangent:V3=[axis[1]*radial[2]-axis[2]*radial[1],axis[2]*radial[0]-axis[0]*radial[2],axis[0]*radial[1]-axis[1]*radial[0]];out.push(entry)
  for(let j=1;j<=12;j++){const t=angle*j/12;out.push(center.map((n,k)=>n+Math.cos(t)*radial[k]+Math.sin(t)*tangent[k]) as V3)}
 }out.push(route.at(-1)!);return out
}
export function sampleRoute(points:V3[],step=.012):V3[]{const out:V3[]=[];for(let i=1;i<points.length;i++){const n=Math.max(1,Math.ceil(length(points[i-1],points[i])/step));for(let j=0;j<n;j++)out.push(mix(points[i-1],points[i],j/n))}out.push(points.at(-1)!);return out}
export const inVolume=(p:V3,v:Volume,padding=0)=>p.every((n,i)=>Math.abs(n-v.center[i])<v.size[i]/2+padding)
export function overlaps(a:Volume,b:Volume,tolerance=.01){return a.center.every((n,i)=>Math.abs(n-b.center[i])<(a.size[i]+b.size[i])/2-tolerance)}
export function routeIntersections(route:V3[],radius:number,volumes:Volume[]){const ends=[route[0],route.at(-1)!];return sampleRoute(roundedRoute(route)).flatMap(p=>ends.some(e=>length(e,p)<.14)?[]:volumes.filter(v=>inVolume(p,v,radius-.006)).map(v=>v.id))}
