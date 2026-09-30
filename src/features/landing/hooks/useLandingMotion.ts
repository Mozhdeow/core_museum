import {useCallback, useEffect, useState, type RefObject} from 'react'
import gsap from 'gsap'
import {ScrollTrigger} from 'gsap/ScrollTrigger'
import {useMediaQuery, useReducedMotion} from '@/hooks/usePreferences'

gsap.registerPlugin(ScrollTrigger)
const sectionIds = ['welcome', 'inside', 'components', 'timeline', 'visit']

export function useLandingMotion(root: RefObject<HTMLElement | null>, locale: string) {
    const [activeSection, setActiveSection] = useState(0)
    const reduced = useReducedMotion()
    const desktop = useMediaQuery('(min-width: 901px)')

    useEffect(() => {
        if (!root.current) return
        const host = root.current
        const setActive = (index: number) => setActiveSection(current => current === index ? current : index)
        const progressTriggers: ScrollTrigger[] = []
        let removePointer: (() => void) | undefined
        const context = gsap.context(() => {
            const touch = window.matchMedia('(pointer: coarse)').matches
            const announce = (index: number) => setActive(index)
            const intro = gsap.timeline({defaults: {ease: 'power3.out'}})
            if (!reduced) {
                intro.from('.hero-section__backdrop', {opacity: 0, duration: 1.1})
                    .from('.hero-section__light-leak', {opacity: 0, duration: 1.2}, '-=.9')
                    .from('.hero-section__workstation', {opacity: 0, scale: 1.06, y: 18, duration: 1.35}, '-=.95')
                    .from('.hero-section__content > *', {opacity: 0, y: 18, stagger: .12, duration: .7}, '-=.8')
                    .from('.hero-section__scroll', {opacity: 0, duration: .45}, '-=.2')
            } else {
                gsap.set('.hero-section__backdrop, .hero-section__light-leak, .hero-section__workstation, .hero-section__content > *, .hero-section__scroll', {clearProps: 'all', opacity: 1})
            }

            if (!desktop || reduced) {
                sectionIds.forEach((id, index) => progressTriggers.push(ScrollTrigger.create({
                    trigger: `#${id}`, start: 'top 45%', end: 'bottom 45%',
                    onEnter: () => announce(index), onEnterBack: () => announce(index), onLeaveBack: () => announce(Math.max(0, index - 1)),
                })))
            }

            if (desktop && !reduced) {
                const machine = gsap.timeline({scrollTrigger: {
                    id: 'landing-machine', trigger: '.machine-journey', start: 'top top', end: '+=2600', scrub: 1.05, pin: true, anticipatePin: 1,
                    onUpdate: self => announce(self.progress < .54 ? 0 : 1), onLeave: () => announce(2), onLeaveBack: () => announce(0),
                }})
                machine.set('.inside-section__content, .inside-section__backdrop, .inside-section__machine--complete, .inside-section__machine--exploded', {opacity: 0})
                    .to('.hero-section__content', {opacity: 0, y: -34, duration: .18, ease: 'power2.inOut'}, .18)
                    .to('.hero-section__scroll', {opacity: 0, duration: .08}, .18)
                    .to('.hero-section__backdrop', {scale: 1.035, opacity: .58, duration: .3, ease: 'power2.inOut'}, .18)
                    .to('.hero-section__workstation', {scale: 1.2, xPercent: 3, yPercent: 8, duration: .4, ease: 'power2.inOut'}, .18)
                    .to('.hero-section__haze', {xPercent: 3, opacity: .25, duration: .35}, .2)
                    .to('.hero-section__backdrop', {opacity: .18, duration: .2}, .53)
                    .to('.inside-section__backdrop', {opacity: .72, duration: .22}, .5)
                    .to('.hero-section__workstation', {opacity: .16, scale: 1.26, duration: .25, ease: 'power2.inOut'}, .53)
                    .to('.inside-section__machine--exploded', {opacity: 1, scale: 1.02, y: 0, duration: .27, ease: 'power2.inOut'}, .56)
                    .to('.inside-section__content', {opacity: 1, y: 0, duration: .2, ease: 'power3.out'}, .68)
                    .fromTo('.parts-list span', {opacity: .08, x: -16}, {opacity: 1, x: 0, stagger: .07, duration: .28, ease: 'power2.out'}, .72)
                    .to('.inside-section__spotlight', {opacity: .7, scale: 1.12, duration: .25}, .72)
                gsap.utils.toArray<HTMLElement>('.parts-list span').forEach((label, index) => {
                    machine.to(label, {color: '#ffb547', duration: .08}, .73 + index * .045).to(label, {color: '#babbb4', duration: .1}, .8 + index * .045)
                })
            } else {
                gsap.from('.hero-section__content > *', {opacity: 0, y: 18, stagger: .1, duration: .7, delay: .1})
                gsap.fromTo('.inside-section__machine--exploded', {opacity: 0, scale: .94, y: 20}, {opacity: 1, scale: 1, y: 0, duration: .8, scrollTrigger: {trigger: '#inside', start: 'top 72%', end: 'center center', scrub: .8}})
                gsap.from('.parts-list span', {opacity: 0, x: -12, stagger: .08, scrollTrigger: {trigger: '#inside', start: 'top 70%', end: 'center 42%', scrub: .8}})
            }

            if (desktop && !reduced) {
                const artifacts = gsap.utils.toArray<HTMLElement>('.artifact')
                gsap.set(artifacts, {opacity: .38, scale: .94, y: 8})
                const showcase = gsap.timeline({scrollTrigger: {
                    id: 'landing-components', trigger: '#components', start: 'top top', end: '+=2450', pin: true, scrub: 1, anticipatePin: 1,
                    onEnter: () => announce(2), onEnterBack: () => announce(2), onLeave: () => announce(3), onLeaveBack: () => announce(1),
                }})
                artifacts.forEach((artifact, index) => {
                    showcase.to(artifact, {opacity: 1, scale: 1.1, y: -10, duration: .42, ease: 'power2.inOut'}, index)
                    if (index < artifacts.length - 1) showcase.to(artifact, {opacity: .38, scale: .94, y: 8, duration: .42, ease: 'power2.inOut'}, index + .58)
                })
            } else {
                gsap.from('.artifact', {opacity: 0, y: 26, stagger: .1, scrollTrigger: {trigger: '#components', start: 'top 76%', end: 'center 50%', scrub: .8}})
            }

            if (desktop && !reduced) {
                const milestones = gsap.utils.toArray<HTMLElement>('.milestone')
                const years = gsap.utils.toArray<HTMLElement>('.timeline-year')
                gsap.set(milestones, {opacity: .35, scale: .92})
                gsap.set(years, {opacity: 0})
                gsap.set(milestones[0], {opacity: 1, scale: 1.06})
                gsap.set(years[0], {opacity: .13})
                const history = gsap.timeline({scrollTrigger: {
                    id: 'landing-timeline', trigger: '#timeline', start: 'top top', end: '+=2450', pin: true, scrub: 1, anticipatePin: 1,
                    onEnter: () => announce(3), onEnterBack: () => announce(3), onLeave: () => announce(4), onLeaveBack: () => announce(2),
                }})
                milestones.forEach((milestone, index) => {
                    if (index > 0) history.to(milestones, {opacity: .35, scale: .92, duration: .2, ease: 'power2.inOut'}, index)
                        .to(years, {opacity: 0, duration: .18}, index)
                        .to(milestone, {opacity: 1, scale: 1.06, duration: .4, ease: 'power2.inOut'}, index + .15)
                        .to(years[index], {opacity: .13, duration: .22}, index + .16)
                    if (index < milestones.length - 1) history.to(milestone, {opacity: .35, scale: .92, duration: .4, ease: 'power2.inOut'}, index + .72)
                })
            } else {
                gsap.from('.milestone', {opacity: 0, x: 24, stagger: .12, scrollTrigger: {trigger: '#timeline', start: 'top 75%', end: 'center 48%', scrub: .8}})
            }

            const finale = gsap.timeline({scrollTrigger: {
                id: 'landing-visit', trigger: '#visit', start: desktop && !reduced ? 'top top' : 'top 72%', end: desktop && !reduced ? '+=1450' : 'bottom 72%', scrub: 1,
                pin: desktop && !reduced, anticipatePin: 1, onEnter: () => announce(4), onEnterBack: () => announce(4), onLeaveBack: () => announce(3),
            }})
            if (!reduced) {
                finale.fromTo('.section-backdrop--visit img', {scale: 1}, {scale: desktop ? 1.1 : 1.05, duration: .72, ease: 'power2.inOut'}, 0)
                    .fromTo('.visit-section__shadow', {opacity: .18}, {opacity: .62, duration: .35}, .08)
                    .from('.visit-section__content .museum-label, .visit-section__content h2, .visit-section__content p', {opacity: 0, y: 22, stagger: .11, duration: .28, ease: 'power3.out'}, .43)
                    .from('.visit-section__content .button', {opacity: 0, y: 18, scale: .97, duration: .25, ease: 'power3.out'}, .72)
            }

            if (!touch && !reduced) {
                const hero = host.querySelector<HTMLElement>('.hero-section')
                if (hero) {
                    const layers = [
                        [hero.querySelector<HTMLElement>('.hero-section__backdrop'), 3],
                        [hero.querySelector<HTMLElement>('.hero-section__workstation'), 10],
                        [hero.querySelector<HTMLElement>('.hero-section__light-leak'), 15],
                    ] as const
                    const onPointerMove = (event: PointerEvent) => {
                        const bounds = hero.getBoundingClientRect(); const x = (event.clientX - bounds.left) / bounds.width - .5; const y = (event.clientY - bounds.top) / bounds.height - .5
                        layers.forEach(([layer, amount]) => { if (layer) gsap.to(layer, {x: x * amount, y: y * amount, duration: .75, ease: 'power2.out', overwrite: true}) })
                    }
                    const resetPointer = () => layers.forEach(([layer]) => { if (layer) gsap.to(layer, {x: 0, y: 0, duration: .9, ease: 'power2.out'}) })
                    hero.addEventListener('pointermove', onPointerMove); hero.addEventListener('pointerleave', resetPointer)
                    removePointer = () => { hero.removeEventListener('pointermove', onPointerMove); hero.removeEventListener('pointerleave', resetPointer) }
                }
            }
        }, host)

        const refresh = () => ScrollTrigger.refresh()
        window.addEventListener('resize', refresh)
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return
            const active = document.activeElement as HTMLElement | null
            active?.blur()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => { window.removeEventListener('resize', refresh); window.removeEventListener('keydown', onKeyDown); removePointer?.(); progressTriggers.forEach(trigger => trigger.kill()); context.revert(); ScrollTrigger.refresh() }
    }, [desktop, locale, reduced, root])

    const goToSection = useCallback((index: number) => {
        const triggerId = index <= 1 ? 'landing-machine' : index === 2 ? 'landing-components' : index === 3 ? 'landing-timeline' : 'landing-visit'
        const trigger = ScrollTrigger.getById(triggerId)
        if (trigger && !reduced) {
            const progress = index === 1 ? .68 : 0
            const y = trigger.start + (trigger.end - trigger.start) * progress
            window.scrollTo({top: y, behavior: 'smooth'})
            return
        }
        document.getElementById(sectionIds[index])?.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block: 'start'})
    }, [reduced])

    return {activeSection, goToSection}
}
