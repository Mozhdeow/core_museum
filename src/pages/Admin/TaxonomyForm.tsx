import {useEffect,useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useAuthStore} from '@/features/auth/authStore'
import {supabaseAdminService} from '@/lib/services'
import {Input} from '@/components/ui/Input'
import {Button} from '@/components/ui/Button'
import {DraftRecovery} from '@/features/cms/DraftRecovery'
import {readCmsDraft,writeCmsDraft,removeCmsDraft} from '@/features/cms/draftStorage'
import {invalidateMuseumCatalog} from '@/features/museum/catalogInvalidation'
type Row=Record<string,unknown>
type Values={id?:string;slug:string;en:string;fa:string;order:number;active:boolean;description_en:string;description_fa:string}
type Draft={values:Values;base:Row|null}
const blank:Values={slug:'',en:'',fa:'',order:0,active:true,description_en:'',description_fa:''}
const rowValues=(row:Row):Values=>({id:String(row.id),slug:String(row.slug??''),en:String(row.name_en??row.title_en??''),fa:String(row.name_fa??row.title_fa??''),order:Number(row.sort_order??0),active:Boolean(row.active),description_en:String(row.description_en??''),description_fa:String(row.description_fa??'')})
export function TaxonomyForm({section}:{section:'categories'|'sections'}){
 const owner=useAuthStore(s=>s.user?.id)??''
 return <Content key={`${owner}:${section}`} owner={owner} section={section}/>
}
function Content({owner,section}:{owner:string;section:'categories'|'sections'}){
 const {t}=useTranslation(['common','admin'])
 const resource=`taxonomy:${section}`
 const [recovery,setRecovery]=useState(()=>readCmsDraft<Draft>(owner,resource,value=>{
  const d=value as Draft|undefined,v=d?.values
  return Boolean(v&&['slug','en','fa','description_en','description_fa'].every(key=>typeof v[key as keyof Values]==='string')&&typeof v.active==='boolean'&&Number.isFinite(v.order)&&(!d?.base||v.id===d.base.id))
 }))
 const [values,setValues]=useState(recovery?.live?recovery.value.values:blank)
 const [base,setBase]=useState<Row|null>(recovery?.live?recovery.value.base:null)
 const [rows,setRows]=useState<Row[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const dirty=JSON.stringify(values)!==JSON.stringify(base?rowValues(base):blank)
 const reload=()=>supabaseAdminService.taxonomy(section).then(data=>{setRows(data as Row[]);return data as Row[]})
 useEffect(()=>{let active=true;void supabaseAdminService.taxonomy(section).then(data=>{if(active)setRows(data as Row[])}).catch(()=>{if(active)setError(t('dataError'))});return()=>{active=false}},[section,t])
 useEffect(()=>{if(recovery&&!recovery.live)return;if(dirty)writeCmsDraft(owner,resource,{values,base});else removeCmsDraft(owner,resource)},[values,base,owner,resource,recovery,dirty])
 const set=<K extends keyof Values>(key:K,value:Values[K])=>setValues(current=>({...current,[key]:value}))
 const clear=()=>{removeCmsDraft(owner,resource);setValues(blank);setBase(null);setRecovery(null)}
 const save=async(event:React.FormEvent)=>{
  event.preventDefault();if(busy||useAuthStore.getState().isLoading||useAuthStore.getState().user?.role!=='admin')return
  setBusy(true);setError('')
  try{
   const current=await reload(),row=current.find(r=>r.id===values.id)
   // Taxonomy has no version RPC: compare the original row before explicit save.
   // Never rebase recovered fields onto a newer server row automatically.
   if(base&&JSON.stringify(row)!==JSON.stringify(base))throw new Error(t('drafts.stale',{ns:'admin'}))
   if(!values.id&&current.some(r=>r.slug===values.slug))throw new Error(t('drafts.stale',{ns:'admin'}))
   await supabaseAdminService.saveTaxonomy(section,{id:values.id,slug:values.slug,sort_order:values.order,active:values.active,...(section==='categories'?{name_en:values.en,name_fa:values.fa}:{title_en:values.en,title_fa:values.fa,description_en:values.description_en,description_fa:values.description_fa})},base)
   clear();invalidateMuseumCatalog();await reload()
  }catch(e){setError(e instanceof Error?e.message:t('dataError'))}finally{setBusy(false)}
 }
 return <div className="p-5 md:p-8"><span className="eyebrow">CORE / {section.toUpperCase()}</span><h1 className="my-8 font-display text-4xl">{t(`${section}Title`,{ns:'admin'})}</h1>
  {recovery&&!recovery.live&&<DraftRecovery discard={clear} stale={Boolean(recovery.value.base&&rows.length&&JSON.stringify(rows.find(r=>r.id===recovery.value.values.id))!==JSON.stringify(recovery.value.base))} restore={()=>{setValues(recovery.value.values);setBase(recovery.value.base);setRecovery(null)}}/>}
  {error&&<p role="alert" className="mb-4 text-red">{error}</p>}
  <form onSubmit={save}><fieldset disabled={busy} className="mb-5 grid gap-3 border border-border bg-surface p-4 md:grid-cols-5">
   <Input label={t('slug')} required value={values.slug} onChange={e=>set('slug',e.target.value)}/><Input label={`${t('title')} / ${t('english')}`} value={values.en} onChange={e=>set('en',e.target.value)}/><Input label={`${t('title')} / ${t('persian')}`} value={values.fa} onChange={e=>set('fa',e.target.value)}/><Input label={t('sortOrder')} type="number" value={values.order} onChange={e=>set('order',Number(e.target.value))}/>
   <div className="flex items-end gap-3"><label><input type="checkbox" checked={values.active} onChange={e=>set('active',e.target.checked)}/>{t('online')}</label><Button type="submit">{t('save')}</Button></div>
   {section==='sections'&&(['en','fa'] as const).map(locale=><label key={locale} className="field-label md:col-span-2"><span>{t('description')} / {t(locale==='en'?'english':'persian')}</span><textarea aria-label={`${t('description')} / ${t(locale==='en'?'english':'persian')}`} className="field-input" dir={locale==='fa'?'rtl':'ltr'} value={values[`description_${locale}`]} onChange={e=>set(`description_${locale}`,e.target.value)}/></label>)}
   {values!==blank&&<button type="button" onClick={clear}>{t('drafts.discard',{ns:'admin'})}</button>}
  </fieldset></form>
  <div className="overflow-x-auto border border-border"><table className="w-full text-sm"><tbody>{rows.map(row=><tr key={String(row.id)} className="border-b border-border"><td className="p-3">{String(row.slug)}</td><td>{String(row.name_en??row.title_en)}</td><td>
   <button className="me-3 text-orange" onClick={()=>{if(dirty&&!window.confirm(t('drafts.replace',{ns:'admin'})))return;removeCmsDraft(owner,resource);setBase(row);setRecovery(null);setValues(rowValues(row))}}>{t('edit')}</button>
   <button className="text-red" onClick={()=>{if(window.confirm(t('deleteConfirm')))void supabaseAdminService.deleteTaxonomy(section,String(row.id)).then(()=>{invalidateMuseumCatalog();if(values.id===row.id)clear();return reload()}).catch(()=>setError(t('dataError')))}}>{t('delete')}</button>
  </td></tr>)}</tbody></table>{!rows.length&&<p className="p-8">{t('empty')}</p>}</div>
 </div>
}
