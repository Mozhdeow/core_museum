import {useTranslation} from 'react-i18next'
export function AssemblyLoading(){const {t}=useTranslation('assembly');return <div role="status" aria-live="polite" className="assembly-loading"><strong>◇ CORE</strong><span>{t('preparing')}</span><i/></div>}
