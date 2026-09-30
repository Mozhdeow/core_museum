import {useEffect, useRef} from 'react'
import {useNavigate} from 'react-router-dom'
import {useTranslation} from 'react-i18next'
import {useAuthStore} from '@/features/auth/authStore'
import {LandingNav} from './components/LandingNav'
import {LandingProgress} from './components/LandingProgress'
import {HeroSection} from './sections/HeroSection'
import {InsideMachineSection} from './sections/InsideMachineSection'
import {ComponentsSection} from './sections/ComponentsSection'
import {TimelineSection} from './sections/TimelineSection'
import {EnterMuseumSection} from './sections/EnterMuseumSection'
import {useLandingMotion} from './hooks/useLandingMotion'

export function LandingPage() {
    const root = useRef<HTMLDivElement>(null)
    const navigate = useNavigate()
    const user = useAuthStore(s => s.user)
    const {i18n, t} = useTranslation('landing')
    const {activeSection, goToSection} = useLandingMotion(root, i18n.language)
    const enterMuseum = () => navigate(user ? '/museum' : '/login', {state: {from: '/museum'}})

    useEffect(() => {
        // Preload only the images in the opening composition; render the hall immediately.
        const links = ['hero-museum-hall.png', 'hero-workstation.png'].map(file => {
            const link = document.createElement('link')
            link.rel = 'preload'
            link.as = 'image'
            link.href = `/images/landing/hero/${file}`
            document.head.appendChild(link)
            return link
        })
        return () => links.forEach(link => link.remove())
    }, [])

    return <div ref={root} className="landing-page">
        <a className="landing-skip" href="#welcome">{t('skipToContent')}</a>
        <LandingNav/>
        <LandingProgress active={activeSection} onNavigate={goToSection}/>
        <main onClick={event => {
            const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]')
            if (!link) return
            const ids = ['welcome', 'inside', 'components', 'timeline', 'visit']
            const index = ids.indexOf(link.hash.slice(1))
            if (index >= 0) {
                event.preventDefault();
                goToSection(index)
            }
        }}>
            <div className="machine-journey">
                <HeroSection onEnter={enterMuseum}/>
                <InsideMachineSection/>
            </div>
            <ComponentsSection/>
            <TimelineSection/>
            <EnterMuseumSection onEnter={enterMuseum}/>
        </main>
    </div>
}
