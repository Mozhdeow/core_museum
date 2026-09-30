import {useTranslation} from 'react-i18next'
import {ArrowUpRight} from 'lucide-react'
import {MuseumSection} from '../components/MuseumSection'
import {MuseumLabel} from '../components/MuseumLabel'

const exhibits = [
    ['cpu', 'processorSubtitle', '/images/landing/objects/cpu.png'],
    ['gpu', 'graphicsSubtitle', '/images/landing/objects/gpu.png'],
    ['memory', 'memorySubtitle', '/images/landing/objects/ram.png'],
    ['storage', 'storageSubtitle', '/images/landing/objects/ssd.png'],
    ['motherboard', 'systemBoardSubtitle', '/images/landing/objects/motherboard.png'],
] as const

export function ComponentsSection() {
    const {t} = useTranslation('landing')
    return <MuseumSection id="components" className="components-section">
        <div className="section-backdrop section-backdrop--gallery"><img
            src="/images/landing/sections/section-components-gallery.png" alt="" loading="lazy" decoding="async"/>
            <div className="scene-vignette"/>
        </div>
        <div className="components-section__intro"><MuseumLabel
            number={t('collectionEyebrow').slice(0, 2)}><span>{t('collectionEyebrow').slice(5)}</span></MuseumLabel>
            <h2>{t('collectionTitle')}</h2><p>{t('collectionDescription')}</p></div>
        <div className="artifact-grid">{exhibits.map(([title, subtitle, src], index) => <article className="artifact"
                                                                                                 key={title}>
            <div className="artifact__light"/>
            <img src={src} alt={t(subtitle)} loading="lazy" decoding="async"/>
            <div className="artifact__caption">
                <b>{t(`artifact${String(index + 1).padStart(2, '0')}`)}</b><span><strong>{t(title)}</strong><small>{t(subtitle)}</small></span>
            </div>
        </article>)}</div>
        <a className="text-link components-section__cta" href="#timeline">{t('collectionCta')} <ArrowUpRight size={15}/></a></MuseumSection>
}
