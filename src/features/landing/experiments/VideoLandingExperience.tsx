import {useRef} from 'react'
import {useTranslation} from 'react-i18next'
import {HeroSection} from './VideoHeroSection'
import {AboutCoreSection} from './VideoAboutCoreSection'
import {useLandingMotion} from './useVideoLandingMotion'
import {LandingProgress} from '../components/LandingProgress'
import './video-landing.css'

// The original opt-in video experiment remains available at ?heroDive=video.
// Its owned triggers and scoped styles never participate in the default journey.
export function VideoLandingExperience({active, onEnter}: {active: boolean; onEnter: () => void}) {
    const root = useRef<HTMLDivElement>(null)
    const {i18n} = useTranslation()
    const {activeSection, goToSection, activeDiveMode} = useLandingMotion(root, i18n.language, 'video')
    return <div ref={root} className="landing-page--video">
        <LandingProgress active={activeSection} onNavigate={goToSection} legacy/>
        <main>
            <HeroSection active={active} onEnter={onEnter} diveMode="video" activeDiveMode={activeDiveMode}/>
            <AboutCoreSection onEnter={onEnter}/>
        </main>
    </div>
}
