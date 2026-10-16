import {Outlet, Link} from 'react-router-dom'
import {useCallback, useRef} from 'react'
import {Home} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {MuseumCanvas} from '@/experience/MuseumCanvas'
import {Logo} from '@/components/common/Logo'
import {AudioToggle} from '@/components/common/AudioToggle'
import {LanguageSwitcher} from '@/components/common/LanguageSwitcher'
import {useMuseumStore} from '@/features/museum/museumStore'
import {selectedMuseumItem, type ModelStatus} from '@/features/museum/museumState'
import {useMuseumCatalog} from '@/hooks/useMuseumCatalog'
import {useMuseumJourney} from '@/hooks/useMuseumJourney'

export function MuseumLayout() {
    const {t, i18n} = useTranslation(['common', 'museum'])
    const root = useRef<HTMLDivElement>(null)
    useMuseumCatalog()
    const state = useMuseumStore()
    const navigate = useMuseumJourney(root, state.stops.length)
    const item = selectedMuseumItem(state)
    const locale = i18n.language === 'fa' ? 'fa' : 'en'
    const section = state.sections.find(s => s.id === state.section)
    const notify = useCallback((status: ModelStatus) => {
        if (item) useMuseumStore.getState().setModelStatus(item.id, item.model3DUrl, status)
    }, [item])
    return <div ref={root} className="relative bg-void" style={{minHeight: `max(1800px, ${Math.max(2, state.stops.length + 1) * 80}dvh)`}} data-museum-journey>
        <MuseumCanvas fixed item={item} progress={state.progress} revision={state.modelRevision} modelStatus={state.modelStatus} onModelStatus={notify}/>
        <div className="pointer-events-none fixed inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_20%,#050505aa_100%)]"/>
        <header className="pointer-events-auto fixed inset-x-0 top-0 z-30 flex items-start justify-between p-5 md:p-8">
            <Logo to="/museum" compact/>
            <div className="flex items-center gap-2"><LanguageSwitcher/><AudioToggle compact/><Link to="/" className="icon-button font-mono text-[10px] uppercase tracking-widest" aria-label={t('exit')}><Home size={15}/><span className="hidden md:inline">{t('exit')}</span></Link></div>
            {state.status === 'ready' && state.stops.length > 0 && <nav className="absolute inset-x-5 top-24 flex max-w-md items-center gap-2 md:start-8" aria-label={t('collectionNavigation', {ns:'museum'})}>
                <button className="icon-button" disabled={state.stopIndex === 0} onClick={() => navigate(state.stopIndex - 1)} aria-label={t('previous')}>←</button>
                <select className="field-input min-w-0 py-2 text-xs" aria-label={t('selectExhibit', {ns:'museum'})} value={state.stopIndex} onChange={event => navigate(Number(event.target.value))}>
                    {state.stops.map((stop, index) => <option key={`${stop.sectionId}:${stop.itemId}`} value={index}>{state.items.find(i => i.id === stop.itemId)?.title[locale] || state.sections.find(s => s.id === stop.sectionId)?.title[locale] || t('unassigned', {ns:'museum'})}</option>)}
                </select>
                <button className="icon-button" disabled={state.stopIndex === state.stops.length - 1} onClick={() => navigate(state.stopIndex + 1)} aria-label={t('next')}>→</button>
            </nav>}
        </header>
        <div className="pointer-events-none fixed inset-x-0 top-1/2 z-20 mx-5 flex -translate-y-1/2 items-center justify-between md:mx-8">
            <div className="pointer-events-auto"><span className="eyebrow">{t('section')}</span><h1 className="mt-2 font-display text-3xl uppercase tracking-wide text-ink md:text-5xl" dir="auto">{section?.title[locale] || t('unassigned', {ns:'museum'})}</h1></div>
            <div className="pointer-events-auto text-end"><span className="font-mono text-[10px] tracking-widest text-muted">{String(state.stops.length ? state.stopIndex + 1 : 0).padStart(2,'0')} / {String(state.stops.length).padStart(2,'0')}</span>
                <div className="mt-3 h-px w-28 bg-border md:w-40"><div className="h-px bg-orange transition-all duration-500" style={{width: `${Math.max(state.progress * 100, 5)}%`}}/></div>
                <span className="mt-2 block font-mono text-[9px] uppercase tracking-widest text-muted">{t('progress')}</span>
            </div>
        </div>
        <div className="relative z-20"><Outlet/></div>
    </div>
}