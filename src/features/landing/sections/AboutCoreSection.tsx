import {ArrowUpRight} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/components/ui/Button'

// Both chapters belong to the same physical screen and retain semantic HTML.
export function AboutCoreSection({onEnter, entering = false}: {onEnter: () => void; entering?: boolean}) {
    const {t} = useTranslation('landing')
    return <>
        <article id="about" className="core-screen-chapter core-screen-chapter--about" tabIndex={-1}>
            <img className="core-screen-chapter__hardware" src="/images/landing/objects/exploded-workstation.png" alt="" decoding="async"/>
            <div className="core-screen-chapter__copy">
                <span className="core-screen-kicker">{t('aboutEyebrow')}</span>
                <h2>{t('aboutTitle')}</h2>
                <p>{t('aboutDescription')}</p>
                <span className="core-screen-note">{t('aboutAside')}</span>
            </div>
        </article>
        <article id="visit" className="core-screen-chapter core-screen-chapter--visit" tabIndex={-1}>
            <img className="core-screen-chapter__hall" src="/images/landing/hero/hero-museum-hall.png"
                alt="" decoding="async"/>
            <div className="core-screen-chapter__copy">
                <span className="core-screen-kicker">{t('visitEyebrow')}</span>
                <h2>{t('visitTitle')}</h2>
                <p>{t('visitDescription')}</p>
                <Button onClick={onEnter} disabled={entering} aria-busy={entering}>{t('enterMuseum')} <ArrowUpRight size={16}/></Button>
            </div>
        </article>
    </>
}
