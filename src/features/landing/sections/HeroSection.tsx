import {ArrowDown, ArrowUpRight} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/components/ui/Button'
import {useMediaQuery} from '@/hooks/usePreferences'
import {HeroMonitorCanvas} from '../components/HeroMonitorCanvas'
import {journeyArtwork} from '../config/journeyGeometry'
import {AboutCoreSection} from './AboutCoreSection'

export function HeroSection({
                                onEnter, onFinalEnter = onEnter, entering = false,
                                active, engineActive = true, onAbout
                            }: {
    onEnter: () => void; onFinalEnter?: () => void; entering?: boolean;
    active: boolean; engineActive?: boolean; onAbout: () => void
}) {
    const {t, i18n} = useTranslation('landing')
    const portrait = useMediaQuery('(max-width: 900px) and (orientation: portrait)')
    const artwork = portrait ? journeyArtwork.portrait : journeyArtwork.desktop
    return <section id="welcome" className="core-stage" aria-label={t('heroTitle')}>
        <div className="core-stage__atmosphere" aria-hidden="true"/>
        <div className="core-stage__portal">
            <div className="core-stage__world" dir="ltr">
                <img className="core-stage__computer-image" src={artwork.src} alt=""
                     aria-hidden="true" fetchPriority="high" decoding="async"/>
                <div className="core-stage__screen" dir={i18n.dir()} style={{
                    left: `${artwork.screen.left}%`, top: `${artwork.screen.top}%`,
                    width: `${artwork.screen.width}%`, height: `${artwork.screen.height}%`,
                }}>
                    <div className="core-stage__engine" aria-hidden="true" dir="ltr">
                        <HeroMonitorCanvas active={active && engineActive}/>
                    </div>
                    <span className="core-stage__artifact-label">{t('heroArtifactLabel')}</span>
                    <AboutCoreSection onEnter={onFinalEnter} entering={entering}/>
                </div>
            </div>
        </div>
        <div className="core-stage__copy">
            <span className="core-stage__eyebrow"><i/>{t('welcome')}</span>
            <h1><span dir="ltr">{t('brand')}</span><em>{t('heroTitle')}</em></h1>
            <p>{t('heroDescription')}</p>
            <div className="landing-actions">
                <Button onClick={onEnter}>{t('enterMuseum')} <ArrowUpRight size={16}/></Button>
                <a className="text-link" href="#about" onClick={event => {
                    event.preventDefault();
                    onAbout()
                }}>
                    {t('aboutCta')} <ArrowDown size={15}/>
                </a>
            </div>
        </div>
        <div className="core-stage__scroll" aria-hidden="true"><span>{t('scrollToEnter')}</span><i/></div>
        <div className="core-stage__caption" aria-hidden="true">{t('monitorWorldHint')}</div>
    </section>
}
