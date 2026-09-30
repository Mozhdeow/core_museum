import {Link} from 'react-router-dom'
import {useTranslation} from 'react-i18next'

export function Logo({to = '/', compact = false}: { to?: string; compact?: boolean }) {
    const {t} = useTranslation('landing')
    return <Link to={to} className="group inline-flex items-center gap-3" aria-label={t('footerNote')}><span
        className="logo-mark"><span/></span><span className="leading-none"><span
        className="font-display text-lg font-bold tracking-[0.22em] text-ink">{t('brand')}</span>{!compact &&
        <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.2em] text-muted">{t('heroTitle')}</span>}</span></Link>
}
