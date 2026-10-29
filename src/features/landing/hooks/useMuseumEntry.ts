import {useCallback, useEffect, useRef, useState, type RefObject} from 'react'
import gsap from 'gsap'
import {useReducedMotion} from '@/hooks/usePreferences'

export function useMuseumEntry(root: RefObject<HTMLElement | null>, onEnter: () => void) {
    const [entering, setEntering] = useState(false)
    const transition = useRef<gsap.Context | null>(null)
    const releaseInput = useRef<(() => void) | null>(null)
    const reduced = useReducedMotion()
    useEffect(() => () => {
        releaseInput.current?.()
        transition.current?.revert()
    }, [])
    const enter = useCallback(() => {
        const host = root.current
        if (!host || transition.current) return
        const stage = host.querySelector<HTMLElement>('.core-stage')
        const screen = host.querySelector<HTMLElement>('.core-stage__screen')
        const portal = host.querySelector<HTMLElement>('.core-stage__portal')
        const navigation = host.closest('.landing-page')?.querySelector<HTMLElement>('.landing-nav')
        if (!stage || !screen || !portal) return
        setEntering(true)
        const block = (event: Event) => event.preventDefault()
        const blockKeys = (event: KeyboardEvent) => {
            if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) event.preventDefault()
        }
        window.addEventListener('wheel', block, {passive: false})
        window.addEventListener('touchmove', block, {passive: false})
        window.addEventListener('keydown', blockKeys)
        releaseInput.current = () => {
            window.removeEventListener('wheel', block)
            window.removeEventListener('touchmove', block)
            window.removeEventListener('keydown', blockKeys)
        }
        const viewport = stage.getBoundingClientRect()
        const glass = screen.getBoundingClientRect()
        const scale = Math.max(viewport.width / glass.width, viewport.height / glass.height) * 1.04
        transition.current = gsap.context(() => {
            const timeline = gsap.timeline({
                onComplete: () => {
                    releaseInput.current?.();
                    onEnter()
                }
            })
            if (reduced) timeline.to(portal, {opacity: 0, duration: .18})
            else timeline.to(portal, {
                scale,
                x: viewport.width / 2 - (glass.x - viewport.x + glass.width / 2) * scale,
                y: viewport.height / 2 - (glass.y - viewport.y + glass.height / 2) * scale,
                duration: 1.15, ease: 'power3.inOut',
            }).to('#visit .core-screen-chapter__copy', {opacity: 0, duration: .35}, .08)
            timeline.to('.landing-progress, .core-stage__caption', {opacity: 0, duration: .18}, 0)
            if (navigation) timeline.to(navigation, {autoAlpha: 0, duration: .18}, 0)
        }, host)
    }, [onEnter, reduced, root])
    return {enter, entering}
}
