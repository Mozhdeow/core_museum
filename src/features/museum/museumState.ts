import {create} from 'zustand'
import type {MuseumCatalog, MuseumItem} from '@/types/museum'
import {configureExhibitionEnd} from './museumCollision.ts'
import {categoryShowcases,exhibitionEnd} from './exhibition.ts'

export type JourneyStop = { sectionId: string | null; itemId: string | null }
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
        return exhibits.length ? exhibits.map(i => ({sectionId: s.id, itemId: i.id})) : [{
            sectionId: s.id,
            itemId: null
        }]
    })
    stops.push(...items.filter(i => !i.sectionId).map(i => ({sectionId: null, itemId: i.id})))
    return {items, categories, sections, stops}
}

type MuseumState = MuseumCatalog & {
    owner: string | null; status: 'idle' | 'loading' | 'ready' | 'error'; error: unknown
    stops: JourneyStop[]; progress: number; stopIndex: number; section: string | null; focusedItemId: string | null
    modelStatus: ModelStatus; modelRevision: number
    selectionUnavailable:boolean
    categorySelections:Record<string,string>
    categoryFilter:string|null;setCategoryFilter(id:string|null):void
    load(owner: string, force?: boolean): Promise<void>
    reset(): void; setJourney(progress: number): void
    restoreSelection(id:string|null,sectionId:string|null):void
    setModelStatus(id: string, url: string | null, status: ModelStatus): void
    retryModel(): void
}
export const selectedMuseumItem = (state: Pick<MuseumState, 'items' | 'focusedItemId'>): MuseumItem | undefined => state.items.find(i => i.id === state.focusedItemId)

export function createMuseumState(loader: () => Promise<MuseumCatalog>) {
    let sequence = 0
    let pending: Promise<void> | null = null
    let selectionRevision=0
    const readiness=new Map<string,ModelStatus>()
    return create<MuseumState>((set, get) => {
        const initial = () => ({
            ...emptyCatalog(), owner: null, status: 'idle' as const, error: null,
            stops: [] as JourneyStop[], progress: 0, stopIndex: 0, section: null, focusedItemId: null,
            modelStatus: 'missing' as const, modelRevision: 0,selectionUnavailable:false,categoryFilter:null as string|null,categorySelections:{} as Record<string,string>
        })
        const selection = (stops: JourneyStop[], items: MuseumItem[], index: number) => {
            const stop = stops[index]
            const item = items.find(i => i.id === stop?.itemId)
            return {
                stopIndex: index, section: stop?.sectionId ?? null, focusedItemId: item?.id ?? null,
                modelStatus: (item?.model3DUrl ? readiness.get(`${item.id}:${item.model3DUrl}`)??'loading' : 'missing') as ModelStatus, modelRevision: 0
            }
        }
        return {
            ...initial(),
            load(owner, force = false) {
                if (!force && get().owner === owner && pending) return pending
                if (!force && get().owner === owner && get().status === 'ready') return Promise.resolve()
                const request = ++sequence
                const sameOwner = get().owner === owner
                const previous={id:get().focusedItemId,section:get().section,unavailable:get().selectionUnavailable,category:get().categoryFilter,choices:get().categorySelections},revision=selectionRevision
                set({...initial(), owner, status: 'loading', progress: sameOwner ? get().progress : 0})
                // Use the latest scroll position, never a request's captured selection.
                const promise = Promise.resolve().then(loader).then(catalog => {
                    if (request !== sequence) return
                    const data = museumJourney(catalog)
                    configureExhibitionEnd(exhibitionEnd(categoryShowcases(data).length))
                    const progress = sameOwner ? get().progress : 0
                    const index = Math.min(Math.floor(progress * data.stops.length), Math.max(0, data.stops.length - 1))
                    set({...data, status: 'ready', error: null,categorySelections:sameOwner?Object.fromEntries(Object.entries(previous.choices).filter(([category,id])=>data.items.some(i=>i.id===id&&i.categoryId===category))):{},categoryFilter:sameOwner&&data.categories.some(c=>c.id===previous.category)?previous.category:null, ...selection(data.stops, data.items, index)})
                    if(sameOwner&&revision===selectionRevision){
                        get().restoreSelection(previous.id,previous.section)
                        if(previous.unavailable)set({selectionUnavailable:true})
                    }
                }).catch(error => {
                    if (request === sequence) set({
                        ...emptyCatalog(),
                        stops: [],
                        focusedItemId: null,
                        section: null,
                        status: 'error',
                        error,
                        modelStatus: 'missing'
                    })
                }).finally(() => {
                    if (request === sequence) pending = null
                })
                pending = promise
                return promise
            },
            reset() {
                sequence++;
                pending = null;
                configureExhibitionEnd(18)
                readiness.clear()
                set(initial())
            },
            setJourney(value) {
                selectionRevision++
                const state = get()
                const progress = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
                const index = Math.min(Math.floor(progress * state.stops.length), Math.max(0, state.stops.length - 1))
                if (progress === state.progress && index === state.stopIndex) return
                set({progress,selectionUnavailable:false, ...(index !== state.stopIndex ? selection(state.stops, state.items, index) : {})})
            },
            restoreSelection(id,sectionId){
                const s=get(),index=id?s.stops.findIndex(stop=>stop.itemId===id):s.stops.findIndex(stop=>stop.itemId===null&&stop.sectionId===sectionId)
                selectionRevision++
                if(index<0){set({focusedItemId:null,section:id===null&&s.sections.some(section=>section.id===sectionId)?sectionId:null,stopIndex:-1,progress:0,modelStatus:'missing',modelRevision:0,selectionUnavailable:id!==null});return}
                const item=s.items.find(i=>i.id===id)
                set({...selection(s.stops,s.items,index),progress:(index+.5)/s.stops.length,selectionUnavailable:false,
                    ...(id===s.focusedItemId?{modelStatus:s.modelStatus,modelRevision:s.modelRevision}:{}),
                    categorySelections:item?.categoryId?{...s.categorySelections,[item.categoryId]:item.id}:s.categorySelections,
                    categoryFilter:item&&s.categoryFilter&&item.categoryId!==s.categoryFilter?null:s.categoryFilter})
            },
            setCategoryFilter(id){set({categoryFilter:get().categories.some(c=>c.id===id)?id:null})},
            setModelStatus(id, url, modelStatus) {
                const item = selectedMuseumItem(get())
                if(item?.id===id&&item.model3DUrl===url)readiness.set(`${id}:${url}`,modelStatus)
                if (item?.id === id && item.model3DUrl === url && get().modelStatus !== modelStatus) set({modelStatus})
            },
            retryModel() {
                const item=selectedMuseumItem(get());if(item)readiness.delete(`${item.id}:${item.model3DUrl}`)
                set(state => ({modelRevision: state.modelRevision + 1, modelStatus: 'loading'}))
            },
        }
    })
}
