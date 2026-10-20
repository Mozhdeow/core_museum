import type {MuseumCatalog,MuseumItem} from '../../types/museum.ts'
export const SHOWCASE_X=2.85,SHOWCASE_PLATFORM_DEPTH=.56
export const SHOWCASE_BOUNDS={width:1.65,height:1.5,depth:.42,radius:1.15} as const
/** Reuse passage recesses; additional categories extend a plain aisle behind the entrance. */
export function showcasePosition(index:number){
 const row=Math.floor(index/2)
 return {side:index%2?1:-1,z:row<2?[-5.5,-12.85][row]:24+(row-2)*4}
}
export function categoryShowcases(catalog:MuseumCatalog){
 return catalog.categories.filter(c=>c.active&&c.slug!=='cpu').map((category,index)=>({category,...showcasePosition(index)}))
}
export function exhibitionEnd(categoryCount:number){return categoryCount>4?28+Math.floor((categoryCount-5)/2)*4:18}
export function publishedExhibits(catalog:MuseumCatalog,categoryId:string|null=null){
 return catalog.items.filter(i=>i.status==='published'&&(!categoryId||i.categoryId===categoryId))
}
export function isCPUExhibit(catalog:MuseumCatalog,item:MuseumItem){
 return catalog.categories.some(c=>c.active&&c.slug==='cpu'&&c.id===item.categoryId)
}
/** Compatibility for audit callers; visitor rendering uses categories, never item paging. */
export function corridorExhibits(catalog:MuseumCatalog,_selectedId:string|null,_sectionId:string|null,categoryId:string|null=null){
 return publishedExhibits(catalog,categoryId).filter(i=>!isCPUExhibit(catalog,i))
}
