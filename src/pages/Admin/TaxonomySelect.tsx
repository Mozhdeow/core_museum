import {useTranslation} from 'react-i18next'

export type TaxonomyOption={id:string;slug?:string;label:{en:string;fa:string};active:boolean}
export function TaxonomySelect({label,value,options,onChange,disabled,filter=false}: {
    label:string;value:string;options:TaxonomyOption[];onChange:(id:string)=>void;disabled?:boolean;filter?:boolean
}){
    const {t,i18n}=useTranslation(['admin','common'])
    const locale=i18n.resolvedLanguage?.startsWith('fa')?'fa':'en'
    return <label className="field-label"><span>{label}</span><select aria-label={label} className="field-input" value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}>
        {filter?<><option value="all">{t('cms.all')}</option><option value="none">{t('cms.unassigned')}</option></>:<option value="">{t('cms.unassigned')}</option>}
        {value && !['all','none'].includes(value) && !options.some(option=>option.id===value) && <option value={value} disabled>{t('cms.unavailable')}</option>}
        {options.filter(option=>filter||option.active||option.id===value).map(option=><option key={option.id} value={option.id} disabled={!filter&&!option.active}>{option.label[locale]||option.label.en||option.slug}{!option.active?` — ${t('cms.inactive')}`:''}</option>)}
    </select></label>
}
