import {useTranslation} from 'react-i18next'
const ids = ['welcome', 'inside', 'components', 'timeline', 'visit']
const titles = ['welcome', 'insideTitle', 'collectionTitle', 'timelineTitle', 'visitTitle']

export function LandingProgress({active, onNavigate}: {active: number; onNavigate: (index: number) => void}) {
    const {t} = useTranslation('landing')
    return <nav className="landing-progress" aria-label={t('scrollToExplore')}>
        {ids.map((id, index) => <a key={id} href={`#${id}`} className={index === active ? 'is-active' : ''}
            aria-current={index === active ? 'step' : undefined} aria-label={`${t(`progress${String(index + 1).padStart(2, '0')}`)} ${t(titles[index])}`}
            onClick={event => {event.preventDefault(); onNavigate(index)}}>
            <span>{t(`progress${String(index + 1).padStart(2, '0')}`)}</span>
        </a>)}
    </nav>
}
