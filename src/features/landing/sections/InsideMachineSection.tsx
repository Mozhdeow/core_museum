import {ArrowDown} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {MuseumSection} from '../components/MuseumSection'
import {MuseumLabel} from '../components/MuseumLabel'

const parts = ['componentCase', 'componentMotherboard', 'componentProcessor', 'componentGraphics', 'componentMemory', 'componentStorage', 'componentPower'] as const

export function InsideMachineSection() {
    const {t} = useTranslation('landing')
    return <MuseumSection id="inside" className="inside-section">
        <div className="section-backdrop inside-section__backdrop"><img src="/images/landing/sections/section-exploded-machine.png" alt=""
                                               loading="lazy" decoding="async"/>
            <div className="scene-vignette"/>
        </div>
        <div className="inside-section__stage"><div className="inside-section__spotlight" aria-hidden="true"/><img
            className="inside-section__machine inside-section__machine--complete"
            src="/images/landing/hero/hero-workstation.png" alt="" loading="lazy" decoding="async"/><img
            className="inside-section__machine inside-section__machine--exploded"
            src="/images/landing/objects/exploded-workstation.png" alt={t('explodedAlt')} loading="lazy"
            decoding="async"/></div>
        <div className="inside-section__content"><MuseumLabel
            number={t('insideEyebrow').slice(0, 2)}><span>{t('insideEyebrow').slice(5)}</span></MuseumLabel>
            <h2>{t('insideTitle')}</h2><p>{t('insideDescription')}</p>
            <div className="parts-list">{parts.map((key, i) => <span
                key={key}><b>{t(`part${String(i + 1).padStart(2, '0')}`)}</b>{t(key)}</span>)}</div>
        </div>
        <a href="#components" className="section-scroll-hint" aria-label={t('scrollToExplore')}><ArrowDown
            size={16}/></a>
    </MuseumSection>
}
