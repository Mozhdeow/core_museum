import {useTranslation} from 'react-i18next'
const ids = ['welcome', 'about', 'visit']
const titles = ['welcome', 'aboutTitle', 'visitTitle']

export function LandingProgress({active, onNavigate, legacy = false}: {active: number; onNavigate: (index: number) => void; legacy?: boolean}) {
    const {t} = useTranslation('landing')
    return <nav className="landing-progress" aria-label={t('scrollToExplore')}>
        {ids.slice(0, legacy ? 2 : 3).map((id, index) => <a key={id} href={`#${id}`} className={index === active ? 'is-active' : ''}
            aria-current={index === active ? 'step' : undefined} aria-label={`${t(`progress${String(index + 1).padStart(2, '0')}`)} ${t(titles[index])}`}
            onClick={event => { event.preventDefault(); onNavigate(index) }}>
            <span>{t(`progress${String(index + 1).padStart(2, '0')}`)}</span>
        </a>)}
    </nav>
}
