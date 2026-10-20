import {useTranslation} from 'react-i18next'
import {useMuseumStore} from './museumStore'
import {useMuseumNavigation} from './navigationState'
import {showPublishedExhibit} from './showPublishedExhibit'
import {publishedExhibits} from './exhibition'
export function MuseumCollection({refresh}:{refresh:()=>void}){
 const {t,i18n}=useTranslation('museum'),locale=i18n.language==='fa'?'fa':'en'
 const catalog=useMuseumStore(),blocked=useMuseumNavigation(s=>s.mode==='inspect'||Boolean(s.overlay))
 const category=catalog.categoryFilter??'',setCategory=(id:string)=>catalog.setCategoryFilter(id||null)
 const selected=catalog.items.find(i=>i.id===catalog.focusedItemId)
 const browsing=publishedExhibits(catalog,category||null)
 const items=selected?.categoryId?browsing.filter(i=>i.categoryId===selected.categoryId):browsing
 const index=items.findIndex(i=>i.id===selected?.id)
 const select=(id:string)=>{const item=items.find(i=>i.id===id);if(item)catalog.restoreSelection(item.id,item.sectionId??null)}
 const browse=(categoryId:string)=>{
  setCategory(categoryId)
  const matches=publishedExhibits(catalog,categoryId||null)
  if(!matches.some(i=>i.id===catalog.focusedItemId)){const next=matches[0];catalog.restoreSelection(next?.id??null,next?.sectionId??null)}
 }
 return <div className="museum-catalog-browser">
  <div className="museum-taxonomy">
   <label>{t('categories')}<select aria-label={t('categories')} value={category} disabled={blocked} onChange={e=>browse(e.target.value)}>
    <option value="">{t('allCategories')}</option>{catalog.categories.map(c=><option key={c.id} value={c.id}>{c.name[locale]||c.name.en}</option>)}
   </select></label>
  </div>
  {catalog.section&&<p className="museum-selected-section" dir="auto">{catalog.sections.find(s=>s.id===catalog.section)?.title[locale]}</p>}
  <nav className="museum-collection" aria-label={t('collectionNavigation')}>
   <span className="museum-collection-label">{t('collectionNavigation')}</span>
   <button className="icon-button" disabled={blocked||items.length<2} onClick={()=>select(items[(index-1+items.length)%items.length].id)} aria-label={t('common:previous')}>←</button>
   <select className="field-input min-w-0 py-2 text-xs" aria-label={t('selectExhibit')} value={index<0?-1:catalog.stopIndex} disabled={blocked||!browsing.length} onChange={e=>{const id=catalog.stops[Number(e.target.value)]?.itemId,item=browsing.find(i=>i.id===id);if(item)catalog.restoreSelection(item.id,item.sectionId??null)}}>
    <option value={-1} disabled>{t(items.length?'selectExhibit':'emptyResults')}</option>{browsing.map(i=><option key={i.id} value={catalog.stops.findIndex(stop=>stop.itemId===i.id)}>{i.title[locale]||i.title.en}</option>)}
   </select>
   <button className="icon-button" disabled={blocked||items.length<2} onClick={()=>select(items[(index+1)%items.length].id)} aria-label={t('common:next')}>→</button>
  </nav>
  {!!items.length&&<p className="museum-carousel-count" role="status" aria-label={t('categoryCarousel')}>{index+1} / {items.length}</p>}
  {!browsing.length&&<p role="status" className="museum-catalog-empty">{t('emptyResults')}</p>}
  <div className="museum-catalog-actions">
   {selected&&<button onClick={()=>showPublishedExhibit(selected)} disabled={blocked}>{t('goToExhibit')}</button>}
   <button onClick={refresh} disabled={blocked}>{t('retry')}</button>
  </div>

 </div>
}
