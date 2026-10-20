import {useCallback,useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useMuseumStore} from '@/features/museum/museumStore'
import {publishedExhibits} from '@/features/museum/exhibition'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import type {ModelStatus} from '@/features/museum/museumState'
import type {MuseumItem} from '@/types/museum'
import {UploadedExhibit} from './UploadedExhibit'
import {CPUSchematic} from './CPUSchematic'
import {Sign} from './MuseumPrimitives'

function Display({item,reduced,revision,count,index}:{item?:MuseumItem;reduced:boolean;revision:number;count:number;index:number}){
 const {t,i18n}=useTranslation('museum'),locale=i18n.language==='fa'?'fa':'en',[status,setStatus]=useState<ModelStatus>(item?.model3DUrl?'loading':'missing')
 const notify=useCallback((status:ModelStatus)=>setStatus(status),[])
 return <>
  <CPUSchematic reduced={reduced} visible={status!=='ready'}/>
  {status!=='ready'&&<Sign at={[0,1.05,-25.55]} width={2.3} center title={t('educationalCPU')} subtitle={item&&(status==='missing'||status==='error')?t(`showcaseModel.${status}`):t('educationalNotice')}/>}
  {item&&status==='ready'&&<Sign at={[0,.72,-24.95]} width={1.8} center title={item.title[locale]||item.title.en} subtitle={`${index+1} / ${count}`}/>}
  {item&&<group position={[0,0,-27]}><UploadedExhibit id={item.id} url={item.model3DUrl} revision={revision} notify={notify} fallback={()=>null}/></group>}
 </>
}
export function CPUCategoryExhibition({reduced}:{reduced:boolean}){
 const catalog=useMuseumStore()
 const category=catalog.categories.find(c=>c.slug==='cpu'),items=category?publishedExhibits(catalog,category.id):[]
 const item=items.find(i=>i.id===catalog.focusedItemId)||items.find(i=>i.id===catalog.categorySelections[category!.id])||items[0]
 return <group name={category?`category-showcase:${category.id}`:'educational-cpu-showcase'}>
  <Display key={`${item?.id}:${item?.model3DUrl}`} item={item} count={items.length} index={items.findIndex(i=>i.id===item?.id)} reduced={reduced} revision={item?.id===catalog.focusedItemId?catalog.modelRevision:0}/>

  {item&&<mesh position={[0,2.3,-25.5]} onClick={event=>{event.stopPropagation();const nav=useMuseumNavigation.getState();if(nav.mode==='inspect'||nav.overlay)return;catalog.setCategoryFilter(category!.id);catalog.restoreSelection(item.id,item.sectionId??null)}}><boxGeometry args={[2.8,2.5,.01]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>}
 </group>
}
