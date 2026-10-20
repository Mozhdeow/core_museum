import {useCallback,useRef,useState} from 'react'
import {useFrame} from '@react-three/fiber'
import {useTranslation} from 'react-i18next'
import {useMuseumStore} from '@/features/museum/museumStore'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import {categoryShowcases,publishedExhibits,SHOWCASE_BOUNDS,SHOWCASE_X,SHOWCASE_PLATFORM_DEPTH} from '@/features/museum/exhibition'
import type {MuseumCategoryData,MuseumItem} from '@/types/museum'
import type {ModelStatus} from '@/features/museum/museumState'
import {UploadedExhibit} from './UploadedExhibit'
import {Block,Sign} from './MuseumPrimitives'
import {ShowcasePreview} from './ShowcasePreview'
import {supportedModelUrl} from './modelGeometry'

function ExhibitPresentation({item,category,load,near,revision}:{item:MuseumItem;category:string;load:boolean;near:boolean;revision:number}){
 const {t}=useTranslation('museum'),valid=Boolean(item.model3DUrl&&supportedModelUrl(item.model3DUrl))
 const [status,setStatus]=useState<ModelStatus>(valid?'loading':item.model3DUrl?'error':'missing')
 const notify=useCallback((value:ModelStatus)=>setStatus(value),[])
 const unavailable=status==='error'||status==='missing',revealed=load&&near&&status==='ready'
 const phase=unavailable?status:revealed?'near':load?'preparing':'far'
 return <group name={`showcase-presentation:${item.id}`} userData={{phase}}>
  {!unavailable&&<ShowcasePreview id={item.id} category={category} title={`${item.slug} ${item.title.en}`} thumbnail={item.thumbnail} enhance={load} preparing={load&&status==='loading'} revealed={revealed}/>}
  {load&&valid&&<UploadedExhibit id={item.id} url={item.model3DUrl} revision={revision} limits={SHOWCASE_BOUNDS} baseY={1.15} notify={notify} fade reveal={near} fallback={()=>null}/>}
  {unavailable&&<group name={`showcase-unavailable:${item.id}`}><Sign at={[0,1.95,.25]} width={1.65} center title={t(`showcaseModel.${status}`)} subtitle={t('modelNotSubstituted')}/></group>}
 </group>
}

function Showcase({category,side,z,load,near}:{category:MuseumCategoryData;side:number;z:number;load:boolean;near:boolean}){
 const {t,i18n}=useTranslation('museum'),locale=i18n.language==='fa'?'fa':'en',catalog=useMuseumStore()
 const items=publishedExhibits(catalog,category.id),chosen=items.find(i=>i.id===catalog.focusedItemId)||items.find(i=>i.id===catalog.categorySelections[category.id])||items[0]
 const selected=chosen?.id===catalog.focusedItemId,index=items.findIndex(i=>i.id===chosen?.id)
 const choose=(delta=0)=>{
  const nav=useMuseumNavigation.getState()
  if(!chosen||nav.mode==='inspect'||nav.overlay)return
  const item=items[(index+delta+items.length)%items.length]
  catalog.setCategoryFilter(category.id);catalog.restoreSelection(item.id,item.sectionId??null)
 }
 return <group name={`category-showcase:${category.id}`} position={[side*SHOWCASE_X,0,z]} rotation={[0,-side*Math.PI/2,0]}>
  <Block at={[0,1.05,0]} size={[1.85,.14,SHOWCASE_PLATFORM_DEPTH]} color={selected?'#b86413':'#34383c'}/>
  <Sign at={[0,2.95,.25]} width={1.65} center title={category.name[locale]||category.name.en} subtitle={chosen?`${index+1} / ${items.length}`:''}/>
  {chosen?<ExhibitPresentation key={`${chosen.id}:${chosen.model3DUrl}:${selected?catalog.modelRevision:0}`} item={chosen} category={category.slug} load={load} near={near} revision={selected?catalog.modelRevision:0}/>:
    <group name={`showcase-empty:${category.id}`}><Sign at={[0,1.95,.25]} width={1.5} center title={t('emptyShowcase')} subtitle=""/></group>}
  {chosen&&<Sign at={[0,.76,.38]} width={1.65} center title={chosen.title[locale]||chosen.title.en} subtitle=""/>}
  {chosen&&<mesh position={[0,1.95,.37]} onClick={event=>{event.stopPropagation();choose()}} name={`select-exhibit:${chosen.id}`}>
   <boxGeometry args={[1.85,2.1,.015]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/>
  </mesh>}
  {items.length>1&&[-1,1].map(direction=><group key={direction} position={[direction*.55,.35,.38]}>
   <Sign at={[0,0,.01]} width={.45} center title={direction<0?'‹':'›'} subtitle=""/>
   <mesh name={`carousel:${category.id}:${direction}`} onClick={event=>{event.stopPropagation();choose(direction)}}><boxGeometry args={[.65,.4,.03]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
  </group>)}
 </group>
}
export function CorridorExhibitions({owner}:{owner?:string}){
 const catalog=useMuseumStore(),cases=categoryShowcases(catalog)
 const [range,setRange]=useState<{z:number|null;near:boolean;retiring:boolean}>({z:null,near:false,retiring:false})
 const current=useRef(range),handoff=useRef(0)
 useFrame(({camera,invalidate},dt)=>{
  const nearest=cases.reduce<number|null>((best,c)=>Math.abs(camera.position.z-c.z)<5&&(best===null||Math.abs(camera.position.z-c.z)<Math.abs(camera.position.z-best))?c.z:best,null)
  const previous=current.current,distance=previous.z===null?Infinity:Math.abs(camera.position.z-previous.z)
  // Keep the current pair through a one-metre load deadband. A different row must
  // be meaningfully closer before it takes over; two pairs never mount together.
  const keep=previous.z!==null&&cases.some(c=>c.z===previous.z)&&distance<6&&(nearest===null||Math.abs(camera.position.z-nearest)+.9>=distance)
  const target=keep?previous.z:nearest
  let next=previous
  if(target!==previous.z&&previous.z!==null){
   handoff.current+=Math.min(dt,.05)
   next=handoff.current<.3?{...previous,near:false,retiring:true}:{z:target,near:target!==null&&Math.abs(camera.position.z-target)<2.5,retiring:false}
  }else{
   handoff.current=0
   const near=target!==null&&Math.abs(camera.position.z-target)<(previous.near?3.4:2.5)
   next={z:target,near,retiring:false}
  }
  if(next.z!==previous.z||next.near!==previous.near||next.retiring!==previous.retiring){current.current=next;setRange(next)}
  if(next.retiring)invalidate()
 })
 if(catalog.owner!==owner||catalog.status!=='ready')return null
 return <group name="published-category-exhibitions">{cases.map(c=><Showcase key={c.category.id} {...c} load={range.z===c.z} near={range.z===c.z&&range.near}/>)}</group>
}
