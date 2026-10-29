import {lazy, Suspense, useCallback, useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {useTranslation} from 'react-i18next'
import {useAuthStore} from '@/features/auth/authStore'
import {LandingIntro} from './components/LandingIntro'
import {LandingNav} from './components/LandingNav'
import {ComputerJourney} from './components/ComputerJourney'
import {useIntroState} from './hooks/useIntroState'
import {getHeroDiveMode} from './config/heroDiveMode'

const VideoLandingExperience = lazy(() => import('./experiments/VideoLandingExperience').then(module => ({default: module.VideoLandingExperience})))

export function LandingPage() {
    const navigate = useNavigate()
    const user = useAuthStore(s => s.user)
    const {t} = useTranslation('landing')
    const diveMode = getHeroDiveMode()
    const introMode = useIntroState()
    const [introVisible, setIntroVisible] = useState(introMode !== 'skip')
    const enterMuseum = useCallback(() => navigate(user ? '/museum' : '/login', {state: {from: '/museum'}}), [navigate, user])
    const completeIntro = useCallback(() => setIntroVisible(false), [])

    useEffect(() => {
        const portrait = window.matchMedia('(max-width: 900px) and (orientation: portrait)').matches
        const links = (portrait ? ['desktop-mobile.png'] : ['desktop.png']).map(file => {
            const link = document.createElement('link')
            link.rel = 'preload';
            link.as = 'image';
            link.href = `/images/landing/hero/${file}`
            document.head.appendChild(link)
            return link
        })
        const videoLink = diveMode === 'video' ? document.createElement('link') : null
        if (videoLink) {
            videoLink.rel = 'preload'
            videoLink.as = 'video'
            videoLink.type = 'video/mp4'
            videoLink.href = '/videos/landing/hero-monitor-dive.mp4'
            document.head.appendChild(videoLink)
        }
        return () => {
            links.forEach(link => link.remove())
            videoLink?.remove()
        }
    }, [diveMode])

    return <div className="landing-page landing-page--portal">
        <a className="landing-skip" href="#welcome">{t('skipToContent')}</a>
        <LandingNav/>
        {diveMode === 'video'
            ?
            <Suspense fallback={null}><VideoLandingExperience active={!introVisible} onEnter={enterMuseum}/></Suspense>
            : <ComputerJourney active={!introVisible} onEnter={enterMuseum}/>}
        {introVisible && <LandingIntro mode={introMode} onComplete={completeIntro}/>}
    </div>
}
