import {useCallback, useLayoutEffect, useState, type RefObject} from 'react'
import gsap from 'gsap'
import {ScrollTrigger} from 'gsap/ScrollTrigger'
import {useMediaQuery, useReducedMotion} from '@/hooks/usePreferences'
import type {HeroDiveMode} from '../config/heroDiveMode'

gsap.registerPlugin(ScrollTrigger)
const sectionIds = ['welcome', 'about']

export function useLandingMotion(root: RefObject<HTMLElement | null>, locale: string, diveMode: HeroDiveMode = 'code') {
    const [activeSection, setActiveSection] = useState(0)
    const [videoReady, setVideoReady] = useState(false)
    const reduced = useReducedMotion()
    const desktop = useMediaQuery('(min-width: 901px)')

    useLayoutEffect(() => {
        if (diveMode !== 'video') return
        const video = root.current?.querySelector<HTMLVideoElement>('.portal-hero-section__video')
        if (!video) return
        const markReady = () => {
            if (video.readyState >= HTMLMediaElement.HAVE_METADATA && Number.isFinite(video.duration) && video.duration > 0) setVideoReady(true)
        }
        const markUnavailable = () => setVideoReady(false)
        markReady()
        video.addEventListener('loadedmetadata', markReady)
        video.addEventListener('canplay', markReady)
        video.addEventListener('error', markUnavailable)
        return () => {
            video.removeEventListener('loadedmetadata', markReady)
            video.removeEventListener('canplay', markReady)
            video.removeEventListener('error', markUnavailable)
        }
    }, [diveMode, root])

    useLayoutEffect(() => {
        if (!root.current) return
        const host = root.current
        const video = host.querySelector<HTMLVideoElement>('.portal-hero-section__video')
        const videoMode = diveMode === 'video' && videoReady && !reduced
        const scrollEnabled = videoMode || (desktop && !reduced)
        const syncVideo = (progress: number) => {
            if (!videoMode || !video || !Number.isFinite(video.duration) || video.duration <= 0) return
            const target = Math.max(0, Math.min(progress, 1)) * video.duration
            if (Math.abs(video.currentTime - target) > .015) video.currentTime = target
        }
        const restoreHero = () => {
            gsap.set('.portal-hero-section__setup, .hero-monitor-portal, .portal-hero-section__copy, .portal-hero-section__scroll', {
                opacity: 1,
                clearProps: 'transform'
            })
            gsap.set('.portal-hero-section__dive, .portal-hero-section__video', {opacity: 0})
            syncVideo(0)
        }
        const context = gsap.context(() => {
            const reveal = gsap.timeline({defaults: {ease: 'power3.out'}})
            if (!reduced) reveal.from('.portal-hero-section__atmosphere', {
                opacity: 0,
                duration: 1
            }).from('.portal-hero-section__setup', {
                opacity: 0,
                y: 18,
                scale: 1.025,
                duration: 1.2
            }, '-=.7').from('.hero-monitor-portal', {
                opacity: 0,
                duration: .7
            }, '-=.7').from('.portal-hero-section__copy > *', {opacity: 0, y: 18, stagger: .1, duration: .65}, '-=.6')

            const heroDive = gsap.timeline({
                defaults: {ease: 'power3.inOut'},
                scrollTrigger: scrollEnabled ? {
                    id: 'landing-hero-dive',
                    trigger: '.portal-hero-section',
                    start: desktop ? 'top top' : 'top 70%',
                    end: desktop ? '+=2350' : '+=1100',
                    scrub: 1,
                    pin: desktop,
                    anticipatePin: 1,
                    onUpdate: self => {
                        syncVideo(self.progress)
                        setActiveSection(self.progress > .88 ? 1 : 0)
                    },
                    onLeave: () => {
                        syncVideo(1)
                        setActiveSection(1)
                    },
                    onLeaveBack: () => {
                        setActiveSection(0)
                        requestAnimationFrame(restoreHero)
                    },
                } : undefined
            })
            if (videoMode) {
                heroDive.set('.portal-hero-section__setup, .hero-monitor-portal, .portal-hero-section__copy, .portal-hero-section__scroll', {
                    opacity: 1,
                    clearProps: 'transform'
                })
                    .set('.portal-hero-section__dive', {opacity: 0})
                    .set('.portal-hero-section__video', {opacity: 0})
                    .to('.portal-hero-section__copy', {opacity: 0, y: -28, duration: .26}, .10)
                    .to('.portal-hero-section__setup', {opacity: 0, scale: 1.05, duration: .24}, .14)
                    .to('.hero-monitor-portal', {opacity: 0, duration: .22}, .16)
                    .to('.portal-hero-section__dive', {opacity: 1, duration: .18}, .18)
                    .to('.portal-hero-section__video', {opacity: 1, duration: .22}, .22)
                    .to('.portal-hero-section__video', {opacity: 1, duration: .56}, .44)
                    .to('.portal-hero-section__video', {opacity: 0, duration: .18}, .84)
                    .to('.portal-dive-viewport', {opacity: 1, duration: .18}, .84)
            } else if (desktop && !reduced) {
                heroDive.set('.portal-hero-section__setup, .hero-monitor-portal, .portal-hero-section__copy, .portal-hero-section__scroll', {
                    opacity: 1,
                    clearProps: 'transform'
                })
                    .set('.portal-hero-section__dive', {opacity: 0})
                    .to('.portal-hero-section__copy', {opacity: 0, y: -40, duration: .28}, .14)
                    .to('.portal-hero-section__setup', {scale: 1.13, xPercent: -4, yPercent: 4, duration: .36}, .10)
                    .to('.hero-monitor-portal', {scale: 1.35, duration: .30, ease: 'expo.inOut'}, .20)
                    .to('.hero-monitor-portal', {
                        scale: 3.8,
                        x: '-9vw',
                        y: '15vh',
                        duration: .34,
                        ease: 'expo.inOut'
                    }, .45)
                    .to('.portal-hero-section__dive', {opacity: 1, duration: .18}, .56)
                    .to('.portal-dive-setup', {scale: 1.04, duration: .18}, .62)
                    .to('.portal-hero-section__setup', {opacity: .08, duration: .20}, .68)
                    .to('.hero-monitor-portal', {opacity: 0, duration: .16}, .82)
                    .to('.portal-dive-viewport', {opacity: 1, duration: .16}, .76)
            } else {
                gsap.set('.portal-hero-section__dive', {opacity: 0})
                gsap.from('.portal-hero-section__copy > *', {opacity: 0, y: 18, stagger: .08, duration: .65})
            }

            const monitor = gsap.timeline({
                defaults: {ease: 'power3.inOut'},
                scrollTrigger: {
                    id: 'landing-monitor-world',
                    trigger: '.monitor-world',
                    start: 'top top',
                    end: desktop && !reduced ? 'bottom bottom' : '+=900',
                    scrub: reduced ? false : .9,
                    onUpdate: self => setActiveSection(self.progress > .58 ? 1 : 0),
                    onLeave: () => setActiveSection(1),
                    onLeaveBack: () => {
                        setActiveSection(0)
                        gsap.set('.monitor-world__about', {opacity: 1, x: 0})
                        gsap.set('.monitor-world__enter', {opacity: 0, y: 28})
                        gsap.set('.monitor-world__portal', {opacity: .34, scale: 1})
                        gsap.set('.monitor-world__shell canvas', {opacity: 1, clearProps: 'transform'})
                    },
                }
            })
            monitor.set('.monitor-world__enter', {opacity: 0, y: 28})
                .set('.monitor-world__about', {opacity: 1, x: 0})
                .to('.monitor-world__about', {opacity: .08, x: '-8%', duration: .34}, .42)
                .to('.monitor-world__portal', {opacity: .9, scale: 1.18, duration: .3, ease: 'power2.inOut'}, .48)
                .to('.monitor-world__shell canvas', {
                    scale: 1.12,
                    background: '#fff',
                    opacity: .52,
                    duration: .34,
                    ease: 'power2.inOut'
                }, .5)
                .to('.monitor-world__enter', {opacity: 1, y: 0, duration: .34}, .6)
                .to('.monitor-world__screen', {backgroundColor: '#050505', duration: .28}, .78)
                .to('.monitor-world__caption', {opacity: .55, duration: .2}, .6)
        }, host)
        const refresh = () => ScrollTrigger.refresh()
        let restoreFrame = 0
        const restoreAtTop = () => {
            if (window.scrollY <= 2 && (desktop || videoMode) && !reduced) {
                cancelAnimationFrame(restoreFrame)
                restoreFrame = requestAnimationFrame(restoreHero)
            }
        }
        window.addEventListener('resize', refresh)
        window.addEventListener('scroll', restoreAtTop, {passive: true})
        requestAnimationFrame(refresh)
        return () => {
            cancelAnimationFrame(restoreFrame)
            window.removeEventListener('resize', refresh)
            window.removeEventListener('scroll', restoreAtTop)
            context.revert();
            ScrollTrigger.refresh()
        }
    }, [desktop, diveMode, locale, reduced, root, videoReady])

    const goToSection = useCallback((index: number) => {
        const trigger = ScrollTrigger.getById(index === 0 ? 'landing-hero-dive' : 'landing-monitor-world')
        if (trigger && !reduced) {
            window.scrollTo({
                top: trigger.start + (trigger.end - trigger.start) * (index === 1 ? .62 : 0),
                behavior: 'smooth'
            })
            return
        }
        document.getElementById(sectionIds[index])?.scrollIntoView({
            behavior: reduced ? 'auto' : 'smooth',
            block: 'start'
        })
    }, [reduced])

    const activeDiveMode: HeroDiveMode = diveMode === 'video' && videoReady && !reduced ? 'video' : 'code'
    return {activeSection, goToSection, activeDiveMode}
}
