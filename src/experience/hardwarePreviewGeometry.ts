import {BoxGeometry,CylinderGeometry,TorusGeometry,Matrix4,Euler,Quaternion,Vector3,type BufferGeometry} from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'

type Triple=[number,number,number]
export function hardwarePreviewKind(category:string,title=''){
 const slug=category.toLowerCase()
 if(['gpu','graphics','graphics-card'].includes(slug))return 'gpu'
 if(['ram','memory'].includes(slug))return 'memory'
 if(slug==='ssd'||slug==='storage'&&/\bssd\b/i.test(title))return 'ssd'
 if(['storage','hdd'].includes(slug))return 'hdd'
 return 'motherboard'
}
/** Merge low-poly parts into five material batches, rather than one draw call per chip/pin.
 * These are category illustrations, never substituted GLTFs or invented published records. */
export function hardwarePreviewGeometry(kind:ReturnType<typeof hardwarePreviewKind>,detailed=false){
 const batches:BufferGeometry[][]=Array.from({length:5},()=>[])
 const add=(material:number,geometry:BufferGeometry,at:Triple,rotation:Triple=[0,0,0])=>{
  const compatible=detailed&&geometry.index?geometry.toNonIndexed():geometry
  if(compatible!==geometry)geometry.dispose()
  compatible.applyMatrix4(new Matrix4().compose(new Vector3(...at),new Quaternion().setFromEuler(new Euler(...rotation)),new Vector3(1,1,1)))
  batches[material].push(compatible)
 }
 const box=(material:number,size:Triple,at:Triple)=>add(material,detailed&&Math.min(...size)>.055?new RoundedBoxGeometry(...size,1,Math.min(...size)*.14):new BoxGeometry(...size),at)
 const disk=(material:number,radius:number,depth:number,at:Triple)=>add(material,new CylinderGeometry(radius,radius,depth,16),at,[Math.PI/2,0,0])
 if(kind==='gpu'){
  box(0,[1.42,.66,.07],[0,0,-.04]);box(1,[1.3,.59,.1],[0,.03,.02])
  for(const x of [-.34,.34]){
   add(2,new TorusGeometry(.235,.024,4,16),[x,.03,.1]);disk(1,.212,.018,[x,.03,.085]);disk(2,.06,.04,[x,.03,.13])
   for(let i=0;i<7;i++){const a=i*Math.PI*2/7;add(3,new BoxGeometry(.135,.052,.025),[x+Math.cos(a)*.128,.03+Math.sin(a)*.128,.12],[0,0,a+.45])}
  }
  box(2,[.065,.77,.15],[-.735,0,0]);box(4,[.73,.08,.035],[.17,-.36,-.04])
 }else if(kind==='memory'){
  box(0,[1.44,.5,.065],[0,0,0])
  for(let i=0;i<8;i++)box(1,[.125,.25,.07],[-.6+i*.17,.03,.067])
  for(let i=0;i<22;i++)box(4,[.043,.085,.018],[-.67+i*.063,-.285,.02])
  box(2,[.04,.1,.07],[-.73,0,0]);box(2,[.04,.1,.07],[.73,0,0])
 }else if(kind==='ssd'){
  box(2,[.93,1.18,.15],[0,0,0]);box(1,[.82,1.04,.02],[0,0,.085]);box(3,[.62,.4,.025],[0,.17,.105])
  box(4,[.32,.07,.04],[-.16,-.62,0]);box(4,[.16,.07,.04],[.19,-.62,0])
  for(const x of [-.36,.36])for(const y of [-.47,.47])disk(1,.025,.015,[x,y,.095])
 }else if(kind==='hdd'){
  box(2,[.94,1.22,.14],[0,0,0]);box(1,[.84,1.12,.025],[0,0,.085])
  disk(3,.35,.022,[0,.13,.108]);add(2,new TorusGeometry(.27,.012,3,20),[0,.13,.127]);disk(2,.074,.035,[0,.13,.135])
  add(4,new BoxGeometry(.42,.055,.025),[.08,-.16,.145],[0,0,-.7]);disk(2,.045,.035,[.25,-.3,.14])
  box(4,[.52,.08,.035],[0,-.65,0])
  if(detailed)for(let i=0;i<10;i++)add(2,new TorusGeometry(.12+i*.022,.0015,3,32),[0,.13,.129])
 }else{
  box(0,[1.05,1.25,.065],[0,0,0]);box(2,[.36,.36,.06],[-.16,.18,.07]);box(1,[.23,.23,.035],[-.16,.18,.12])
  for(let i=0;i<3;i++)box(1,[.075,.83,.1],[.29+i*.1,.14,.075])
  for(let i=0;i<3;i++)box(i===0?3:1,[.62,.065,.08],[-.1,-.25-i*.13,.07])
  box(2,[.17,.59,.16],[-.55,.29,.06]);box(1,[.27,.2,.08],[.26,-.46,.07])
  for(let i=0;i<5;i++)disk(2,.035,.1,[-.4+i*.12,.47,.085])
  for(let i=0;i<5;i++)box(4,[.018,.25,.014],[-.4+i*.048,.07,.039])
  if(detailed)for(let i=0;i<8;i++){box(2,[.075,.045,.045],[-.4+i*.075,.62,.06]);box(4,[.006,.12,.004],[-.36+i*.085,-.05,.039])}
 }
 return batches.map(parts=>{if(!parts.length)return null;const geometry=mergeGeometries(parts);parts.forEach(part=>part.dispose());return geometry})
}
