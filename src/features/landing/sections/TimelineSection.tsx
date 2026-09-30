import {useTranslation} from 'react-i18next'
import {MuseumLabel} from '../components/MuseumLabel'
import {MuseumSection} from '../components/MuseumSection'

const milestones = [
    ['year1971', 'microprocessor', 'microprocessor-1971.png'], ['year1980s', 'personalComputer', 'personal-computer-1980s.png'], ['year1990s', 'threeDGraphics', 'gpu-1990s.png'], ['year2010s', 'multicore', 'modern-cpu.png'], ['today', 'aiAcceleration', 'ai-accelerator.png'],
] as const

export function TimelineSection() {
    const {t} = useTranslation('landing');
    return <MuseumSection id="timeline" className="timeline-section">
        <div className="section-backdrop section-backdrop--timeline"><img
            src="/images/landing/sections/section-hardware-timeline.png" alt="" loading="lazy" decoding="async"/>
            <div className="scene-vignette"/>
        </div>
        <div className="timeline-years" aria-hidden="true">{milestones.map(([year]) => <span className="timeline-year" key={year}>{t(year)}</span>)}</div>
        <div className="timeline-section__intro"><MuseumLabel
            number={t('timelineEyebrow').slice(0, 2)}><span>{t('timelineEyebrow').slice(5)}</span></MuseumLabel>
            <h2>{t('timelineTitle')}</h2><p>{t('timelineDescription')}</p></div>
        <div className="timeline-rail">{milestones.map(([year, name, image], index) => <article className="milestone"
                                                                                                key={year}>
            <div className="milestone__marker"/>
            <div className="milestone__image"><img src={`/images/landing/timeline/${image}`} alt={t(name)}
                                                   loading="lazy" decoding="async"/></div>
            <div className="milestone__copy"><span>{t(year)}</span><h3>{t(name)}</h3></div>
            {index < milestones.length - 1 && <div className="milestone__line"/>}</article>)}</div>
    </MuseumSection>
}
