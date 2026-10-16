import {useCallback, useLayoutEffect, useRef, type RefObject} from 'react'
import {ScrollTrigger} from 'gsap/ScrollTrigger'
import gsap from 'gsap'
import {useMuseumStore} from '@/features/museum/museumStore'

gsap.registerPlugin(ScrollTrigger)
export function useMuseumJourney(root: RefObject<HTMLElement | null>, count: number) {
    const trigger = useRef<ScrollTrigger | null>(null)
    const entered = useRef(false)
    useLayoutEffect(() => {
        if (!root.current) return
        if (!entered.current) {
            entered.current = true
            // The landing has its own long scroll range. A new visit starts at the museum entrance.
            window.scrollTo({top: 0, behavior: 'instant'})
            useMuseumStore.getState().setJourney(0)
        }
        const owned = ScrollTrigger.create({id: 'museum-data-journey', trigger: root.current,
            start: 'top top', end: 'bottom bottom',
            onUpdate: self => useMuseumStore.getState().setJourney(self.progress),
            onRefresh: self => useMuseumStore.getState().setJourney(self.progress)})
        trigger.current = owned
        owned.refresh()
        return () => {owned.kill(); trigger.current = null}
    }, [root, count])
    return useCallback((index: number) => {
        const owned = trigger.current
        if (!owned || !count) return
        const progress = (Math.max(0, Math.min(count - 1, index)) + .5) / count
        // Direct navigation should not load intermediate models along a smooth scroll.
        window.scrollTo({top: owned.start + (owned.end - owned.start) * progress, behavior: 'instant'})
        owned.update()
        useMuseumStore.getState().setJourney(progress)
    }, [count])
}
