import {ArrowDown, ArrowUpRight} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/components/ui/Button'
import {MuseumSection} from '../components/MuseumSection'
import {MuseumLabel} from '../components/MuseumLabel'

export function HeroSection({onEnter}: { onEnter: () => void }) {
    const {t} = useTranslation('landing')
    return <MuseumSection id="welcome" className="hero-section">
        <div className="hero-section__backdrop"><img src="/images/landing/hero/hero-museum-hall.png" alt=""
                                                     fetchPriority="high" decoding="async"/>
            <div className="scene-vignette"/>
        </div>
        <img className="hero-section__workstation" src="/images/landing/hero/hero-workstation.png"
             alt={t('heroWorkstationAlt')} fetchPriority="high" decoding="async"/>
        <div className="hero-section__haze" aria-hidden="true"/>
        <div className="hero-section__light-leak" aria-hidden="true"/>
        <div className="hero-section__content">
            <MuseumLabel number={t('progress01')}><span>{t('welcome')}</span></MuseumLabel>
            <h1><span>{t('brand')}</span><em>{t('heroTitle')}</em></h1>
            <p>{t('heroDescription')}</p>
            <div className="landing-actions"><Button onClick={onEnter}>{t('enterMuseum')} <ArrowUpRight
                size={16}/></Button><a className="text-link" href="#components">{t('exploreCollection')} <ArrowDown
                size={15}/></a></div>
        </div>
        <div className="hero-section__scroll"><span>{t('scrollToExplore')}</span><i/></div>
    </MuseumSection>
}
