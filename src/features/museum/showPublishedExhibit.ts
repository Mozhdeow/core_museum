import type {MuseumItem} from '@/types/museum'
import {useMuseumStore} from './museumStore'
import {useMuseumNavigation} from './navigationState'
import {categoryShowcases,isCPUExhibit} from './exhibition'

export function showPublishedExhibit(item:MuseumItem){
 const catalog=useMuseumStore.getState(),nav=useMuseumNavigation.getState()
 if(nav.mode==='inspect'||nav.overlay||!catalog.items.some(i=>i.id===item.id))return
 catalog.restoreSelection(item.id,item.sectionId??null)
 if(isCPUExhibit(catalog,item))nav.visit('cpu')
 else {const index=categoryShowcases(catalog).findIndex(c=>c.category.id===item.categoryId);if(index>=0)nav.visitShowcase(index)}
}
