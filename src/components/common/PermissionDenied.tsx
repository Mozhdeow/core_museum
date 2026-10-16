import {Link} from 'react-router-dom'
import {useTranslation} from 'react-i18next'

export function PermissionDenied(){
    const {t}=useTranslation('admin',{keyPrefix:'rbac'})
    return <section className="mx-auto max-w-xl p-6 pt-32 text-ink"><h1 className="font-display text-3xl">{t('deniedTitle')}</h1>
        <p role="alert" className="mt-4 text-sm leading-7 text-muted">{t('deniedCopy')}</p>
        <Link className="button button-outline mt-6" to="/museum">{t('backMuseum')}</Link></section>
}
