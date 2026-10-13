import {ArrowUpRight} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/components/ui/Button'
import {DesktopMonitorShell} from '../components/DesktopMonitorShell'
import {HeroMonitorCanvas} from '../components/HeroMonitorCanvas'

export function AboutCoreSection({onEnter}: {onEnter: () => void}) {
    const {t} = useTranslation('landing')
    return <section id="about" className="monitor-world landing-section">
        <div className="monitor-world__sticky">
            <div className="monitor-world__heading"><span>02</span><strong>{t('aboutTitle')}</strong></div>
            <DesktopMonitorShell className="monitor-world__shell">
                <HeroMonitorCanvas active />
                <div className="monitor-world__screen">
                    <div className="monitor-world__portal" aria-hidden="true"><i /><i /><i /><i /></div>
                    <article className="monitor-world__about">
                        <span className="screen-kicker">{t('aboutEyebrow')}</span>
                        <h2>{t('aboutTitle')}</h2>
                        <p>{t('aboutDescription')}</p>
                        <div className="screen-trace"><i /><span>CORE / ARCHIVE</span></div>
                    </article>
                    <article className="monitor-world__enter">
                        <span className="screen-kicker">{t('visitEyebrow')}</span>
                        <h2>{t('visitTitle')}</h2>
                        <p>{t('visitDescription')}</p>
                        <Button onClick={onEnter}>{t('enterMuseum')} <ArrowUpRight size={16} /></Button>
                    </article>
                </div>
            </DesktopMonitorShell>
            <div className="monitor-world__caption"><span>{t('monitorWorldHint')}</span><i /></div>
        </div>
    </section>
}

