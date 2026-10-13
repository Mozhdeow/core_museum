import {useRef} from 'react'
import {HeroSection} from '../sections/HeroSection'
import {useLandingMotion} from '../hooks/useLandingMotion'
import {useMuseumEntry} from '../hooks/useMuseumEntry'
import {LandingProgress} from './LandingProgress'
import '../journey.css'

export function ComputerJourney({active, onEnter}: {active: boolean; onEnter: () => void}) {
    const root = useRef<HTMLDivElement>(null)
    const {activeSection, goToSection} = useLandingMotion(root, active)
    const {enter, entering} = useMuseumEntry(root, onEnter)
    return <div ref={root} className="core-journey">
        <LandingProgress active={activeSection} onNavigate={goToSection}/>
        <main>
            <HeroSection active={active} engineActive={activeSection === 0} onEnter={onEnter}
                onFinalEnter={enter} entering={entering} onAbout={() => goToSection(1)}/>
        </main>
        {entering && <div className="core-entry-shield" aria-hidden="true"/>}
    </div>
}
