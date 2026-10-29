import {useEffect, useRef, useState, type ReactNode} from 'react'
import {useShallow} from 'zustand/react/shallow'
import {useTranslation} from 'react-i18next'
import {
    ArrowDown,
    ArrowUp,
    ArrowLeft,
    ArrowRight,
    Compass,
    Pause,
    Play,
    SkipForward,
    SlidersHorizontal,
    Wind
} from 'lucide-react'
import {useMuseumNavigation, type MuseumDestination} from './navigationState'
import {museumKeyboardOwned} from './navigationKeyboard'
import './museumNavigation.css'
import {restartMuseumVisit} from './useMuseumVisit'
import {MuseumPreferences} from '@/experience/MuseumPreferences'
import {Link} from 'react-router-dom'
import {flushVisit} from './visitRuntime'

export function MuseumNavigationControls({children}: { children?: ReactNode }) {
    const {t} = useTranslation('museum', {keyPrefix: 'journey'})
    // Only discrete presentation changes need React. The progress strip follows
    // the existing read-only report subscription without rerendering the HUD.
    const state = useMuseumNavigation(useShallow(s=>({mode:s.mode,playing:s.playing,location:s.location,atmospherePaused:s.atmospherePaused,
        progress:s.progress>=.99?1:s.progress>0?.5:0,step:s.step,setMove:s.setMove,pause:s.pause,tour:s.tour,explore:s.explore,visit:s.visit,toggleAtmosphere:s.toggleAtmosphere})))
    const progress=useRef<HTMLSpanElement>(null)
    useEffect(()=>{const draw=()=>{if(progress.current)progress.current.style.transform=`scaleX(${useMuseumNavigation.getState().progress})`};draw();return useMuseumNavigation.subscribe(draw)},[])
    const [expanded, setExpanded] = useState(false)
    useEffect(() => {
        const shortcuts = (event: KeyboardEvent) => {
            if(useMuseumNavigation.getState().mode==='inspect')return
            if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || museumKeyboardOwned(event.target)) return
            const nav=useMuseumNavigation.getState()
            if(event.code==='Space'&&nav.mode==='guided'&&!nav.overlay&&(nav.showcase||nav.progress<.99)
                &&!(event.target instanceof Element&&event.target.closest('button,a,summary,[role="button"],[role="tab"],[role="checkbox"],[role="switch"],[role="radio"],[role="combobox"],[role="treeitem"],[role="option"]'))){
                event.preventDefault()
                if(nav.playing)nav.pause();else nav.tour()
                return
            }
            if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
                event.preventDefault()
                useMuseumNavigation.getState().step(event.code === 'ArrowLeft' ? -1 : 1)
            }
        }
        window.addEventListener('keydown', shortcuts)
        return () => {
            window.removeEventListener('keydown', shortcuts);
        }
    }, [])
    const tourLabel = t(state.playing ? 'pause' : state.progress >= .99 && state.mode === 'guided' ? 'complete' : state.progress>0?'continue':'tour')
    return <>
        {state.location==='entrance'&&<Link className="museum-assembly-entry" to="/museum/assembly" onClick={()=>flushVisit(true)}>{t('title',{ns:'assembly',keyPrefix:''})}<ArrowRight size={14}/></Link>}
        <div className="museum-location" aria-live="polite" aria-atomic="true">
            <span>CORE / THE CONNECTED ARCHIVE</span><h1>{t(state.location)}</h1>
            <p>{t(state.location === 'cpu' ? 'arrival' : 'invitation')}</p>
        </div>
        <nav className="museum-navigation" aria-label={t('navigation')} data-navigation-mode={state.mode}
             data-location={state.location} data-expanded={expanded}>
            <div className="museum-navigation-bar">
                <button aria-label={t('previousDestination')} aria-keyshortcuts="ArrowLeft" onClick={() => state.step(-1)}
                    disabled={state.location === 'entrance' && !state.playing} title={t('previousDestination')}><ArrowLeft size={17}/></button>
                <button className="museum-hud-mode" aria-label={tourLabel} aria-pressed={state.mode === 'guided'}
                    disabled={state.progress >= .99 && !state.playing && state.mode === 'guided'}
                    onClick={() => state.playing ? state.pause() : state.tour()}>
                    {state.playing ? <Pause size={15}/> : <Play size={15}/>}<span>{tourLabel}</span></button>
                <button className="museum-hud-mode" aria-label={t('freeExplore')} aria-pressed={state.mode === 'explore'} onClick={state.explore}>
                    <Compass size={15}/><span>{t('freeExplore')}</span></button>
                <button aria-label={t('nextDestination')} aria-keyshortcuts="ArrowRight" onClick={() => state.step(1)}
                    disabled={state.location === 'cpu' && !state.playing} title={t('nextDestination')}><ArrowRight size={17}/></button>
                {state.mode === 'explore' && <div className="museum-assisted" aria-label={t('assisted')}>
                    {([-1, 1] as const).map(direction => <button key={direction}
                                                                 title={t(direction > 0 ? 'walkForward' : 'walkBack')} aria-label={t(direction > 0 ? 'walkForward' : 'walkBack')}
                                                                 onPointerDown={e => {
                                                                     e.currentTarget.setPointerCapture(e.pointerId);
                                                                     state.setMove(direction)
                                                                 }}
                                                                 onPointerUp={() => state.setMove(0)}
                                                                 onPointerCancel={() => state.setMove(0)}
                                                                 onLostPointerCapture={() => state.setMove(0)}
                                                                 onKeyDown={e => {
                                                                     if (e.key === ' ' || e.key === 'Enter') {
                                                                         e.preventDefault();
                                                                         state.setMove(direction)
                                                                     }
                                                                 }} onKeyUp={() => state.setMove(0)}
                                                                 onBlur={() => state.setMove(0)}>
                        {direction > 0 ? <ArrowUp size={18}/> :
                            <ArrowDown size={18}/>}
                    </button>)}
                </div>}
                <button className="museum-controls-toggle" aria-label={t('controls')} aria-expanded={expanded}
                    aria-controls="museum-controls-body" onClick={() => setExpanded(!expanded)}><SlidersHorizontal size={15}/><span>{t('details')}</span></button>
                <button className="museum-skip" onClick={() => state.visit('cpu', true)} aria-label={t('skip')} title={t('skip')}><SkipForward size={17}/></button>
            </div>
            <div className="museum-tour-progress" aria-hidden="true"><span ref={progress}/></div>
                <div className="museum-route" aria-label={t('destinations')}>
                    {(['entrance', 'corridor', 'cpu'] as MuseumDestination[]).map((place, index) => <button key={place}
                                                                                                            aria-label={t(place)}
                                                                                                            aria-current={state.location === place ? 'location' : undefined}
                                                                                                            onClick={() => state.visit(place)}>
                        <span
                            className="museum-route-dot">{String(index + 1).padStart(2, '0')}</span><span>{t(place)}</span>
                    </button>)}
                </div>
            <div id="museum-controls-body" className="museum-controls-body" hidden={!expanded}>
                <MuseumPreferences/>
                <Link className="museum-assembly-nav" to="/museum/assembly" onClick={()=>flushVisit(true)}>{t('title',{ns:'assembly',keyPrefix:''})}<ArrowRight size={14}/></Link>
                {children}
                <p className="museum-movement-hint">{t(state.mode === 'explore' ? 'exploreHint' : 'tourHint')}</p>
                <div className="museum-environment-actions">
                    <button aria-pressed={state.atmospherePaused} onClick={state.toggleAtmosphere}><Wind
                        size={13}/>{t(state.atmospherePaused ? 'resumeAtmosphere' : 'pauseAtmosphere')}</button>
                    <button onClick={restartMuseumVisit}>{t('restart')}</button></div>
            </div>
        </nav>
    </>
}
