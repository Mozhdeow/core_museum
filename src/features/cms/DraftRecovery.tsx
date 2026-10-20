import {useTranslation} from 'react-i18next'
export function DraftRecovery({restore,discard,stale=false,files=false}:{restore:()=>void;discard:()=>void;stale?:boolean;files?:boolean}){
 const {t}=useTranslation('admin')
 return <aside role="status" className="mb-5 max-w-4xl border border-orange/40 bg-surface p-4 text-sm">
  <p>{t(stale?'drafts.stale':'drafts.available')}</p>{files&&<p className="mt-2">{t('drafts.files')}</p>}
  <div className="mt-3 flex gap-5"><button type="button" className="text-orange" onClick={restore}>{t('drafts.restore')}</button><button type="button" onClick={discard}>{t('drafts.discard')}</button></div>
 </aside>
}
