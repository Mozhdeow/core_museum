import {useState} from 'react'
import {Link,useLocation,useNavigate} from 'react-router-dom'
import {Plus} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/components/ui/Button'
import {useCmsTaxonomy,useExhibitPage} from '@/hooks/useCmsData'
import {useContentAccess} from '@/hooks/useContentAccess'
import {useAuthStore} from '@/features/auth/authStore'
import {museumItemsService} from '@/lib/services'
import {errorMessage} from '@/lib/services/errors'
import {defaultExhibitQuery} from '@/lib/services/supabase/contentQueries'
import type {ExhibitQuery} from '@/types/services'
import {TaxonomySelect} from './TaxonomySelect'

export function ItemsPage(){
    const {t,i18n}=useTranslation(['common','admin'])
    const {role,canWrite}=useContentAccess()
    const [query,setQuery]=useState<ExhibitQuery>(defaultExhibitQuery)
    const [search,setSearch]=useState('')
    const [message,setMessage]=useState('')
    const [removing,setRemoving]=useState(false)
    const [deleteBlocked,setDeleteBlocked]=useState(false)
    const current={...query,status:role==='editor'?'draft' as const:query.status}
    const result=useExhibitPage(current),taxonomy=useCmsTaxonomy()
    const location=useLocation(),navigate=useNavigate()
    const locale=i18n.resolvedLanguage?.startsWith('fa')?'fa':'en'
    const update=(patch:Partial<ExhibitQuery>)=>setQuery(q=>({...q,...patch,page:1}))
    const refresh=async()=>{const outcomes=await Promise.all([result.refresh(),taxonomy.refresh()]);if(outcomes.every(Boolean))setDeleteBlocked(false)}
    const remove=async(id:string)=>{
        if(role!=='admin'||removing||deleteBlocked||!window.confirm(t('deleteConfirm')))return
        const actorId=useAuthStore.getState().user?.id
        const currentActor=()=>useAuthStore.getState().user?.id===actorId&&useAuthStore.getState().user?.role==='admin'
        if(!actorId||!currentActor())return
        setRemoving(true);setMessage('')
        try{const outcome=await museumItemsService.remove(id);if(!currentActor())return;if(outcome.cleanupFailed)setMessage(t('cleanupWarning',{ns:'phase2'}));await result.refresh()}
        catch(error){if(!currentActor())return;setMessage(`${errorMessage(error)} ${t('cms.inspectBeforeRetry',{ns:'admin'})}`);setDeleteBlocked(true)}
        finally{setRemoving(false)}
    }
    const items=result.data?.items.filter(item=>role!=='editor'||item.status==='draft')??[]
    const pages=Math.max(1,Math.ceil((result.data?.total??0)/query.perPage))
    return <div className="p-5 md:p-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4"><div><span className="eyebrow">CORE / ARCHIVE</span><h1 className="mt-3 font-display text-4xl">{t('itemsTitle',{ns:'admin'})}</h1></div><Button disabled={!canWrite} onClick={()=>navigate('/admin/items/new')}><Plus size={15}/>{t('addNew')}</Button></div>
        <form className="mb-5 flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();update({search:search.trim()})}}>
            <label className="field-label"><span>{t('search')}</span><input className="field-input" value={search} maxLength={200} onChange={e=>setSearch(e.target.value)} placeholder={t('search')}/></label><Button type="submit">{t('search')}</Button>
            <label className="field-label"><span>{t('status')}</span><select aria-label={t('status')} className="field-input" value={current.status} disabled={role==='editor'} onChange={e=>update({status:e.target.value as ExhibitQuery['status']})}>{role!=='editor'&&<option value="all">{t('cms.all',{ns:'admin'})}</option>}<option value="draft">{t('draft')}</option>{role!=='editor'&&<option value="published">{t('published')}</option>}</select></label>
            <TaxonomySelect label={t('category')} filter value={query.categoryId} options={(taxonomy.data?.categories??[]).map(c=>({...c,label:c.name}))} disabled={taxonomy.loading||Boolean(taxonomy.error)} onChange={categoryId=>update({categoryId})}/>
            <TaxonomySelect label={t('museumSection')} filter value={query.sectionId} options={(taxonomy.data?.sections??[]).map(s=>({...s,label:s.title,active:s.available}))} disabled={taxonomy.loading||Boolean(taxonomy.error)} onChange={sectionId=>update({sectionId})}/>
        </form>
        {role==='editor'&&!canWrite&&<p role="status" className="mb-4 text-sm text-amber">{t('rbac.writeGate',{ns:'admin'})}</p>}
        {location.state?.saveConfirmed&&<p role="status">{t('saveConfirmed',{ns:'phase2'})}</p>}
        {location.state?.integrityWarning&&<p role="status">{t('cleanupWarning',{ns:'phase2'})}</p>}
        {location.state?.saveConfirmed&&<p role="status" className="my-3 text-sm text-muted">{t('cms.catalogRefresh',{ns:'admin'})}</p>}
        {message&&<p role="status" className="mb-4 text-sm text-amber">{message}</p>}
        {Boolean(taxonomy.error)&&<p role="alert">{t('cms.taxonomyError',{ns:'admin'})}<button type="button" className="ms-3 text-orange" onClick={()=>void taxonomy.refresh()}>{t('cms.retry',{ns:'admin'})}</button></p>}
        {result.loading?<p role="status">{t('loading')}</p>:result.error?<p role="alert">{t('dataError')}</p>:<>
            <div className="overflow-x-auto border border-border"><table className="w-full min-w-[760px] text-start"><thead className="border-b border-border bg-surface"><tr>{[t('title'),t('category'),t('brand'),t('releaseYear'),t('museumSection'),t('status'),t('actions')].map(label=><th key={label} className="px-4 py-4 text-start text-xs text-muted">{label}</th>)}</tr></thead>
                <tbody>{items.map(item=><tr key={item.id} className="border-b border-border/70"><td className="px-4 py-4"><div className="flex items-center gap-3">{item.thumbnail&&<img src={item.thumbnail} alt="" className="h-9 w-12 object-cover"/>}<span dir="auto">{item.title[locale]||item.title.en}</span></div></td><td className="px-4 py-4 text-sm">{item.categoryName?.[locale]||taxonomy.data?.categories.find(c=>c.id===item.categoryId)?.name[locale]||item.category||t('cms.unassigned',{ns:'admin'})}</td><td className="px-4 py-4">{item.brand}</td><td className="px-4 py-4">{item.releaseYear||'—'}</td><td className="px-4 py-4">{item.sectionTitle?.[locale]||taxonomy.data?.sections.find(s=>s.id===item.sectionId)?.title[locale]||item.museumSection||t('cms.unassigned',{ns:'admin'})}</td><td className="px-4 py-4"><span className={`border px-2 py-1 text-xs ${item.status==='published'?'border-cyan/30 text-cyan':'border-orange/30 text-orange'}`}>{t(item.status)}</span></td><td className="px-4 py-4"><div className="flex gap-3"><Link className="text-orange" to={`/admin/items/${item.id}/edit`} aria-label={t('edit')}>{t('edit')}</Link>{role==='admin'&&<button type="button" disabled={removing||deleteBlocked} className="text-xs text-red" onClick={()=>void remove(item.id)}>{t('delete')}</button>}</div></td></tr>)}</tbody></table>{!items.length&&<p className="p-10 text-center text-muted">{t('noItems')}</p>}</div>
            <div className="mt-4 flex flex-wrap items-center gap-4"><Button variant="ghost" disabled={query.page<=1} onClick={()=>setQuery(q=>({...q,page:q.page-1}))}>{t('cms.previous',{ns:'admin'})}</Button><span role="status">{t('cms.page',{ns:'admin',page:query.page,pages,total:result.data?.total??0})}</span><Button variant="ghost" disabled={query.page>=pages} onClick={()=>setQuery(q=>({...q,page:q.page+1}))}>{t('cms.next',{ns:'admin'})}</Button><label className="field-label"><span>{t('cms.perPage',{ns:'admin'})}</span><select aria-label={t('cms.perPage',{ns:'admin'})} className="field-input" value={query.perPage} onChange={e=>update({perPage:Number(e.target.value)})}>{[10,25,50].map(size=><option key={size} value={size}>{size}</option>)}</select></label></div>
        </>}
        <button type="button" disabled={result.loading||removing} className="mt-5 text-sm text-orange" onClick={()=>void refresh()}>{t('cms.refresh',{ns:'admin'})}</button>
        {query.page>1&&<button type="button" className="ms-4 text-sm text-orange" onClick={()=>update({})}>{t('cms.firstPage',{ns:'admin'})}</button>}
    </div>
}
