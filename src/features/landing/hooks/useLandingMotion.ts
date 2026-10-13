import {useCallback, useLayoutEffect, useRef, useState, type RefObject} from 'react'
import gsap from 'gsap'
import {ScrollTrigger} from 'gsap/ScrollTrigger'
import {useMediaQuery, useReducedMotion} from '@/hooks/usePreferences'
import {imageAroundScreen, journeyArtwork, journeyBounds, type Bounds} from '../config/journeyGeometry'

gsap.registerPlugin(ScrollTrigger)
const stops = [0, .57, .94]
const POSITION_KEY = 'core_landing_scroll_position'
const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const blend = (a: Bounds, b: Bounds, t: number): Bounds => ({
    x: mix(a.x, b.x, t), y: mix(a.y, b.y, t),
    width: mix(a.width, b.width, t), height: mix(a.height, b.height, t),
})
function savedPosition() {
    try {
        const saved = JSON.parse(sessionStorage.getItem(POSITION_KEY) ?? 'null')
        return saved?.url === location.href && saved?.key === (history.state?.key ?? 'initial')
            && Number.isFinite(saved?.progress) ? clamp01(saved.progress) : null
    } catch {return null}
}

export function useLandingMotion(root: RefObject<HTMLElement | null>, enabled: boolean) {
    const [activeSection, setActiveSection] = useState(0)
    const ownedTrigger = useRef<ScrollTrigger | null>(null)
    const resumeProgress = useRef<number | null>(null)
    const reduced = useReducedMotion()
    const portrait = useMediaQuery('(max-width: 900px) and (orientation: portrait)')

    useLayoutEffect(() => {
        const host = root.current
        if (!host) return
        const stage = host.querySelector<HTMLElement>('.core-stage')
        const world = host.querySelector<HTMLElement>('.core-stage__world')
        const copy = host.querySelector<HTMLElement>('.core-stage__copy')
        const about = host.querySelector<HTMLElement>('#about')
        const visit = host.querySelector<HTMLElement>('#visit')
        const engine = host.querySelector<HTMLElement>('.core-stage__engine')
        if (!stage || !world || !copy || !about || !visit || !engine) return

        const stageArtwork = portrait ? journeyArtwork.portrait : journeyArtwork.desktop
        let restoreProgress = enabled ? resumeProgress.current ?? savedPosition() : null
        // A saved zero needs no restoration and must not reset a new scroll after fonts load.
        if (!restoreProgress) restoreProgress = null
        const motion = {dive: 0, phase: 0}
        let bounds = journeyBounds(stage.clientWidth, stage.clientHeight, portrait)
        let lastPhase = -1

        const sizeWorld = () => {
            const locked = imageAroundScreen(bounds.locked, stageArtwork)
            world.style.width = `${locked.width}px`
            world.style.height = `${locked.height}px`
        }
        const renderGeometry = () => {
            const glass = blend(bounds.hero, bounds.locked, motion.dive)
            const current = imageAroundScreen(glass, stageArtwork)
            const locked = imageAroundScreen(bounds.locked, stageArtwork)
            // Photograph, bezel, HTML and WebGL travel as one rigid scene.
            // Only position and uniform scale change; no handoff event exists.
            world.style.transform = `translate3d(${current.x}px,${current.y}px,0) scale(${current.width / locked.width})`
        }
        const syncSemantics = () => {
            const phase = motion.phase < 1.55 ? 0 : motion.phase < 2.46 ? 1 : 2
            if (phase !== lastPhase) {
                lastPhase = phase
                setActiveSection(phase)
                const focus = document.activeElement
                ;[copy, about, visit].forEach((element, index) => {
                    element.inert = index !== phase
                    element.setAttribute('aria-hidden', String(index !== phase))
                })
                if (focus instanceof HTMLElement && focus.closest('[inert]')) {
                    (phase === 1 ? about : phase === 2 ? visit : copy.querySelector('button'))?.focus({preventScroll: true})
                }
            }
            copy.inert = motion.phase > 1.02
            copy.setAttribute('aria-hidden', String(copy.inert))
        }
        const context = gsap.context(() => {
            sizeWorld(); renderGeometry()
            const timeline = gsap.timeline({paused: !enabled, defaults: {ease: 'power2.inOut'},
                onUpdate: () => {renderGeometry(); syncSemantics()},
                scrollTrigger: enabled ? {
                    id: 'landing-computer-journey', trigger: stage, start: 'top top',
                    end: () => `+=${stage.clientHeight * (reduced ? 2.6 : portrait ? 3.6 : 5.2)}`,
                    pin: true, scrub: reduced ? true : .4, anticipatePin: 1, invalidateOnRefresh: true,
                    onRefresh: () => {
                        bounds = journeyBounds(stage.clientWidth, stage.clientHeight, portrait)
                        sizeWorld(); renderGeometry()
                    },
                } : undefined,
            })
            timeline.to(motion, {phase: 3.2, duration: 3.2, ease: 'none'}, 0)
                .to(motion, {dive: 1, duration: reduced ? .3 : 1.04, ease: 'power2.inOut'}, .24)
                .to(copy, {autoAlpha: 0, y: reduced ? 0 : -18, duration: .54}, .43)
                .to('.core-stage__scroll', {autoAlpha: 0, duration: .22}, .3)
                .to('.core-stage__artifact-label', {autoAlpha: 0, duration: .2}, 1.3)
                .to(engine, {autoAlpha: 0, scale: reduced ? 1 : 1.035, duration: .32}, 1.35)
                .fromTo(about, {autoAlpha: 0}, {autoAlpha: 1, duration: .38}, 1.36)
                .fromTo('#about .core-screen-chapter__copy', {autoAlpha: 0, y: reduced ? 0 : 8},
                    {autoAlpha: 1, y: 0, duration: .22}, 1.53)
                .to('.core-stage__caption', {autoAlpha: 1, duration: .3}, 1.4)
                .to('#about .core-screen-chapter__copy', {autoAlpha: 0, y: reduced ? 0 : -6, duration: .18}, 2.17)
                .to(about, {autoAlpha: 0, duration: .45}, 2.23)
                .fromTo(visit, {autoAlpha: 0}, {autoAlpha: 1, duration: .45}, 2.23)
                .fromTo('#visit .core-screen-chapter__copy', {autoAlpha: 0, y: reduced ? 0 : 8},
                    {autoAlpha: 1, y: 0, duration: .24}, 2.46)
                .fromTo('.core-screen-chapter__hall', {scale: reduced ? 1 : 1.025},
                    {scale: 1, duration: .62, ease: 'power2.out'}, 2.23)
            ownedTrigger.current = timeline.scrollTrigger ?? null
            syncSemantics()
        }, host)
        let refreshFrame = 0
        let pageShown = document.readyState === 'complete'
        let disposed = false
        const refresh = () => {
            cancelAnimationFrame(refreshFrame)
            refreshFrame = requestAnimationFrame(() => {
                const trigger = ownedTrigger.current
                trigger?.refresh()
                if (trigger && restoreProgress !== null && pageShown) {
                    trigger.scroll(trigger.start + (trigger.end - trigger.start) * restoreProgress)
                    trigger.update(); trigger.animation?.progress(restoreProgress)
                    restoreProgress = null; resumeProgress.current = null
                    try {sessionStorage.removeItem(POSITION_KEY)} catch { /* optional storage */ }
                }
            })
        }
        const savePosition = () => {
            const trigger = ownedTrigger.current
            if (trigger) try {
                sessionStorage.setItem(POSITION_KEY, JSON.stringify({url: location.href,
                    key: history.state?.key ?? 'initial', progress: trigger.progress}))
            } catch { /* optional storage */ }
        }
        const showPage = () => {pageShown = true; refresh()}
        window.addEventListener('pageshow', showPage)
        window.addEventListener('pagehide', savePosition)
        host.querySelectorAll('img').forEach(image => image.addEventListener('load', refresh))
        void document.fonts.ready.then(() => {if (!disposed) refresh()})
        const hashIndex = ['#welcome', '#about', '#visit'].indexOf(location.hash)
        if (enabled && hashIndex > 0) {
            restoreProgress = stops[hashIndex]
            refresh()
        }
        return () => {
            disposed = true
            cancelAnimationFrame(refreshFrame)
            window.removeEventListener('pageshow', showPage)
            window.removeEventListener('pagehide', savePosition)
            host.querySelectorAll('img').forEach(image => image.removeEventListener('load', refresh))
            resumeProgress.current = restoreProgress ?? ownedTrigger.current?.progress ?? null
            ownedTrigger.current = null
            context.revert()
        }
    }, [enabled, portrait, reduced, root])

    const goToSection = useCallback((index: number) => {
        const trigger = ownedTrigger.current
        if (!trigger) return
        window.scrollTo({top: trigger.start + (trigger.end - trigger.start) * (stops[index] ?? 0),
            behavior: reduced ? 'instant' : 'smooth'})
    }, [reduced])
    return {activeSection, goToSection}
}
