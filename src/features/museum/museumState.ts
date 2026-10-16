import {create} from 'zustand'
import type {MuseumCatalog, MuseumItem} from '@/types/museum'

export type JourneyStop = {sectionId: string | null; itemId: string | null}
export type ModelStatus = 'missing' | 'loading' | 'ready' | 'error'
const emptyCatalog = (): MuseumCatalog => ({items: [], sections: [], categories: []})
export function museumJourney(catalog: MuseumCatalog) {
    const categories = catalog.categories.filter(c => c.active).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    const sections = catalog.sections.filter(s => s.available).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    const items = catalog.items.filter(i => i.status === 'published'
        && (!i.categoryId || categories.some(c => c.id === i.categoryId))
        && (!i.sectionId || sections.some(s => s.id === i.sectionId)))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    const stops: JourneyStop[] = sections.flatMap<JourneyStop>(s => {
        const exhibits = items.filter(i => i.sectionId === s.id)
        return exhibits.length ? exhibits.map(i => ({sectionId: s.id, itemId: i.id})) : [{sectionId: s.id, itemId: null}]
    })
    stops.push(...items.filter(i => !i.sectionId).map(i => ({sectionId: null, itemId: i.id})))
    return {items, categories, sections, stops}
}
type MuseumState = MuseumCatalog & {
    owner: string | null; status: 'idle' | 'loading' | 'ready' | 'error'; error: unknown
    stops: JourneyStop[]; progress: number; stopIndex: number; section: string | null; focusedItemId: string | null
    modelStatus: ModelStatus; modelRevision: number
    load(owner: string, force?: boolean): Promise<void>
    reset(): void; setJourney(progress: number): void
    setModelStatus(id: string, url: string | null, status: ModelStatus): void
    retryModel(): void
}
export const selectedMuseumItem = (state: Pick<MuseumState, 'items' | 'focusedItemId'>): MuseumItem | undefined => state.items.find(i => i.id === state.focusedItemId)

export function createMuseumState(loader: () => Promise<MuseumCatalog>) {
    let sequence = 0
    let pending: Promise<void> | null = null
    return create<MuseumState>((set, get) => {
        const initial = () => ({...emptyCatalog(), owner: null, status: 'idle' as const, error: null,
            stops: [] as JourneyStop[], progress: 0, stopIndex: 0, section: null, focusedItemId: null,
            modelStatus: 'missing' as const, modelRevision: 0})
        const selection = (stops: JourneyStop[], items: MuseumItem[], index: number) => {
            const stop = stops[index]
            const item = items.find(i => i.id === stop?.itemId)
            return {stopIndex: index, section: stop?.sectionId ?? null, focusedItemId: item?.id ?? null,
                modelStatus: (item?.model3DUrl ? 'loading' : 'missing') as ModelStatus, modelRevision: 0}
        }
        return {
            ...initial(),
            load(owner, force = false) {
                if (!force && get().owner === owner && pending) return pending
                if (!force && get().owner === owner && get().status === 'ready') return Promise.resolve()
                const request = ++sequence
                const sameOwner = get().owner === owner
                set({...initial(), owner, status: 'loading', progress: sameOwner ? get().progress : 0})
                // Use the latest scroll position, never a request's captured selection.
                const promise = Promise.resolve().then(loader).then(catalog => {
                    if (request !== sequence) return
                    const data = museumJourney(catalog)
                    const progress = sameOwner ? get().progress : 0
                    const index = Math.min(Math.floor(progress * data.stops.length), Math.max(0, data.stops.length - 1))
                    set({...data, status: 'ready', error: null, ...selection(data.stops, data.items, index)})
                }).catch(error => {
                    if (request === sequence) set({...emptyCatalog(), stops: [], focusedItemId: null, section: null, status: 'error', error, modelStatus: 'missing'})
                }).finally(() => {if (request === sequence) pending = null})
                pending = promise
                return promise
            },
            reset() {sequence++; pending = null; set(initial())},
            setJourney(value) {
                const state = get()
                const progress = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
                const index = Math.min(Math.floor(progress * state.stops.length), Math.max(0, state.stops.length - 1))
                if (progress === state.progress && index === state.stopIndex) return
                set({progress, ...(index !== state.stopIndex ? selection(state.stops, state.items, index) : {})})
            },
            setModelStatus(id, url, modelStatus) {
                const item = selectedMuseumItem(get())
                if (item?.id === id && item.model3DUrl === url && get().modelStatus !== modelStatus) set({modelStatus})
            },
            retryModel() {set(state => ({modelRevision: state.modelRevision + 1, modelStatus: 'loading'}))},
        }
    })
}
