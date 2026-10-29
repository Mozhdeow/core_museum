import type {MuseumCatalog,MuseumItem} from '@/types/museum'
import {eligibleGalleryImages} from '../gallery/galleryImages.ts'
/** Only explicit canonical catalog slugs associate an item with this physical hall. */
export function belongsToCPUHall(item:Pick<MuseumItem,'category'|'museumSection'>|undefined){
 if(!item)return false
 return item.category?.toLowerCase().trim()==='cpu'
}

/** Resolve canonical hall identities through the current active taxonomy UUIDs.
 * Only active category UUIDs route physical exhibits; sections remain curatorial metadata. */
export function museumPresentation(catalog:MuseumCatalog&{focusedItemId:string|null;modelStatus?:string},location:string){
 const item=catalog.items.find(i=>i.id===catalog.focusedItemId&&i.status==='published')
 const category=item?.categoryId?catalog.categories.find(c=>c.id===item.categoryId&&c.active):undefined
 const cpuCompatible=Boolean(item&&category?.slug==='cpu')
 return {item,cpuCompatible,displayedItem:item,metadataOnly:false,
  canInspectModel:Boolean(item?.model3DUrl)&&catalog.modelStatus==='ready',
  canExploreSchematic:location==='cpu',canGallery:eligibleGalleryImages(item).length>0,
  canCurator:Boolean(item&&item.enableAiCurator!==false)}
}
