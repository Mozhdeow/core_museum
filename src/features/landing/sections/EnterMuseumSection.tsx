import {ArrowUpRight} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/components/ui/Button'
import {MuseumLabel} from '../components/MuseumLabel'
import {MuseumSection} from '../components/MuseumSection'

export function EnterMuseumSection({onEnter}: { onEnter: () => void }) {
    const {t} = useTranslation('landing');
    return <MuseumSection id="visit" className="visit-section">
        <div className="section-backdrop section-backdrop--visit"><img
            src="/images/landing/sections/section-enter-archive.png" alt="" loading="lazy" decoding="async"/>
            <div className="scene-vignette"/>
        </div>
        <div className="visit-section__shadow" aria-hidden="true"/>
        <div className="visit-section__content"><MuseumLabel
            number={t('visitEyebrow').slice(0, 2)}><span>{t('visitEyebrow').slice(5)}</span></MuseumLabel>
            <h2>{t('visitTitle')}</h2><p>{t('visitDescription')}</p><Button onClick={onEnter}>{t('enterMuseum')}
                <ArrowUpRight size={16}/></Button></div>
        <footer className="landing-footer"><span>{t('footerNote')}</span><span>{t('copyright')}</span></footer>
    </MuseumSection>
}
