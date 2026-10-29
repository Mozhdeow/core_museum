import {useEffect,useMemo} from 'react'
import {useThree} from '@react-three/fiber'
import {CanvasTexture,SRGBColorSpace} from 'three'
import {useTranslation} from 'react-i18next'
import {mat,stagedVolumes} from './assemblyDefinition'

const resolution=2048
function createMatTexture(anisotropy:number){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=resolution
 const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;map.anisotropy=anisotropy
 return {map,draw(name:(id:string)=>string,rtl:boolean){
   const c=canvas.getContext('2d')!,x=(v:number)=>(v-mat.center[0]+mat.size[0]/2)/mat.size[0]*resolution,z=(v:number)=>(v-mat.center[2]+mat.size[2]/2)/mat.size[2]*resolution,volumes=stagedVolumes.filter(p=>p.id!=='monitor')
   c.clearRect(0,0,resolution,resolution)
   for(const p of volumes){
    const left=x(p.center[0]-p.size[0]/2-.06),top=z(p.center[2]-p.size[2]/2-.06),width=(p.size[0]+.12)/mat.size[0]*resolution,height=(p.size[2]+.12)/mat.size[2]*resolution
    c.fillStyle='rgba(5,5,5,.16)';c.fillRect(left,top,width,height)
    c.strokeStyle='rgba(255,181,71,.8)';c.lineWidth=2.5;c.strokeRect(left,top,width,height)
    c.strokeStyle='#ffb547';c.lineWidth=5;c.beginPath();c.moveTo(left,top+26);c.lineTo(left,top);c.lineTo(left+26,top);c.stroke()
   }
   c.font='600 58px "Vazirmatn","Space Grotesk",sans-serif';c.textAlign='center';c.textBaseline='middle';c.direction=rtl?'rtl':'ltr'
   for(const p of volumes){
    // Use the free column width instead of horizontally squeezing long captions.
    const row=volumes.filter(q=>Math.abs(q.center[2]-p.center[2])<.26),before=row.filter(q=>q.center[0]<p.center[0]).sort((a,b)=>b.center[0]-a.center[0])[0],after=row.filter(q=>q.center[0]>p.center[0]).sort((a,b)=>a.center[0]-b.center[0])[0]
    const min=before?x((before.center[0]+p.center[0])/2)+8:28,max=after?x((after.center[0]+p.center[0])/2)-8:resolution-28,available=max-min-24,text=name(p.id),lines:string[]=[]
    let line=''
    for(const word of text.split(' ')){const next=line?line+' '+word:word;if(line&&c.measureText(next).width>available){lines.push(line);line=word}else line=next}if(line)lines.push(line)
    const height=lines.length*64+16,labelWidth=Math.min(available+24,Math.max(...lines.map(value=>c.measureText(value).width))+24),center=Math.max(min+labelWidth/2,Math.min(max-labelWidth/2,x(p.center[0]))),top=Math.min(z(p.center[2]+p.size[2]/2+.06)+10,resolution-28-height)
    c.shadowColor='rgba(5,5,5,.65)';c.shadowBlur=3;c.shadowOffsetY=2
    c.fillStyle='#f5f5f0';lines.forEach((value,index)=>c.fillText(value,center,top+40+index*64));c.shadowBlur=0;c.shadowOffsetY=0
   }
   map.needsUpdate=true
  },dispose(){map.dispose()}}
}
/** One printed texture: readable captions without changing any staging or snap coordinates. */
export function AssemblyMat(){
 const {t,i18n}=useTranslation('assembly'),invalidate=useThree(s=>s.invalidate),anisotropy=useThree(s=>Math.min(8,s.gl.capabilities.getMaxAnisotropy()))
 const resource=useMemo(()=>createMatTexture(anisotropy),[anisotropy])
 useEffect(()=>{
  let live=true
  const draw=()=>{if(live){resource.draw(id=>t(`parts.${id}.name`),i18n.language==='fa');invalidate()}}
  draw();void document.fonts.ready.then(draw);return()=>{live=false}
 },[resource,t,i18n.language,invalidate])
 useEffect(()=>()=>resource.dispose(),[resource])
 return <mesh position={[mat.center[0],1.034,mat.center[2]]} rotation={[-Math.PI/2,0,0]} raycast={()=>null}><planeGeometry args={[mat.size[0],mat.size[2]]}/><meshBasicMaterial map={resource.map} transparent depthWrite={false} toneMapped={false}/></mesh>
}
