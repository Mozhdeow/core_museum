import {ArrowDown, ArrowUpRight} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/components/ui/Button'
import {HeroMonitorCanvas} from '../components/HeroMonitorCanvas'
import {MonitorViewport} from '../components/MonitorViewport'
import {monitorGeometry} from '../config/monitorGeometry'
import {MuseumLabel} from '../components/MuseumLabel'
import type {HeroDiveMode} from '../config/heroDiveMode'

export function HeroSection({onEnter, active, diveMode, activeDiveMode}: {
    onEnter: () => void;
    active: boolean;
    diveMode: HeroDiveMode;
    activeDiveMode: HeroDiveMode
}) {
    const {t} = useTranslation('landing')
    return <section id="welcome" className="portal-hero-section landing-section">
        <div className="portal-hero-section__atmosphere" aria-hidden="true"/>
        <div className="portal-hero-section__copy">
            <MuseumLabel number={t('progress01')}>
                <span>{t('welcome')}</span>
            </MuseumLabel>
            <h1><span>{t('brand')}</span><em>{t('heroTitle')}</em></h1>
            <p>{t('heroDescription')}</p>
            <div className="landing-actions">
                <Button onClick={onEnter}>{t('enterMuseum')} <ArrowUpRight size={16}/></Button>
                <a className="text-link" href="#about">{t('aboutCta')} <ArrowDown size={15}/></a>
            </div>
        </div>
        <div className="portal-hero-section__visual">
            <img className="portal-hero-section__setup" src="/images/landing/hero/hero_desktop_setup.png"
                 alt={t('heroSetupAlt')} fetchPriority="high" decoding="async"/>
            <MonitorViewport geometry={monitorGeometry.hero} className="hero-monitor-portal">
                <HeroMonitorCanvas active={active}/>
                <span className="hero-monitor-portal__label">{t('heroArtifactLabel')}</span>
            </MonitorViewport>
        </div>
        <div className={`portal-hero-section__dive${diveMode === 'video' ? ' portal-hero-section__dive--video' : ''}`}
             aria-hidden="true">
            <img className="portal-dive-setup" src="/images/landing/hero/desktop.png" alt="" decoding="async"/>
            <MonitorViewport geometry={monitorGeometry.desktop} className="portal-dive-viewport">
                <HeroMonitorCanvas active={active} portal/>
            </MonitorViewport>
            {diveMode === 'video' && <video className="portal-hero-section__video" muted playsInline preload="auto"
                                            poster="/images/landing/hero/desktop.png">
                <source src="/videos/landing/hero-monitor-dive.mp4" type="video/mp4"/>
            </video>}
        </div>
        <div className="portal-hero-section__scroll"><span>{t('scrollToEnter')}</span><i/></div>
        {import.meta.env.DEV && <span
            className={`hero-dive-debug hero-dive-debug--${activeDiveMode}`}>HERO DIVE: {activeDiveMode.toUpperCase()}</span>}
    </section>
}
