import {useEffect, useState, type ReactNode} from 'react'
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

export function MuseumNavigationControls({children}: { children?: ReactNode }) {
    const {t} = useTranslation('museum', {keyPrefix: 'journey'})
    const state = useMuseumNavigation()
    const [expanded, setExpanded] = useState(() => window.matchMedia('(min-width:768px) and (min-height:540px)').matches)
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
        <div className="museum-location" aria-live="polite" aria-atomic="true">
            <span>CORE / THE CONNECTED ARCHIVE</span><h1>{t(state.location)}</h1>
            <p>{t(state.location === 'cpu' ? 'arrival' : 'invitation')}</p>
        </div>
        <nav className="museum-navigation" aria-label={t('navigation')} data-navigation-mode={state.mode}
             data-location={state.location} data-expanded={expanded}>
            <div className="museum-navigation-bar">
                <button aria-label={t('previousDestination')} aria-keyshortcuts="ArrowLeft"
                        onClick={() => state.step(-1)} disabled={state.location === 'entrance' && !state.playing}
                        title={t('previousDestination')}><ArrowLeft size={17}/></button>
                <button className="museum-controls-toggle" aria-label={t('controls')} aria-expanded={expanded}
                        aria-controls="museum-controls-body" onClick={() => setExpanded(!expanded)}><SlidersHorizontal
                    size={15}/><span>{t(state.location)}</span></button>
                <button aria-label={t('nextDestination')} aria-keyshortcuts="ArrowRight" onClick={() => state.step(1)}
                        disabled={state.location === 'cpu' && !state.playing} title={t('nextDestination')}><ArrowRight
                    size={17}/></button>
                <button className="museum-play-compact"
                        disabled={state.progress >= .99 && !state.playing && state.mode === 'guided'}
                        aria-label={tourLabel}
                        onClick={() => state.playing ? state.pause() : state.tour()}>{state.playing ?
                    <Pause size={17}/> : <Play size={17}/>}</button>
                <button className="museum-skip" onClick={() => state.visit('cpu', true)} aria-label={t('skip')}
                        title={t('skip')}><SkipForward size={17}/></button>
            </div>
            <div className="museum-tour-progress" aria-hidden="true"><span
                style={{transform: `scaleX(${state.progress})`}}/></div>
            <div id="museum-controls-body" className="museum-controls-body" hidden={!expanded}>
                <div className="museum-route" aria-label={t('destinations')}>
                    {(['entrance', 'corridor', 'cpu'] as MuseumDestination[]).map((place, index) => <button key={place}
                                                                                                            aria-label={t(place)}
                                                                                                            aria-current={state.location === place ? 'location' : undefined}
                                                                                                            onClick={() => state.visit(place)}>
                        <span
                            className="museum-route-dot">{String(index + 1).padStart(2, '0')}</span><span>{t(place)}</span>
                    </button>)}
                </div>
                <div className="museum-mode-actions">
                    <button className="museum-play-expanded"
                            disabled={state.progress >= .99 && !state.playing && state.mode === 'guided'}
                            onClick={() => state.playing ? state.pause() : state.tour()} aria-label={tourLabel}
                            aria-pressed={state.mode === 'guided'}>
                        {state.playing ? <Pause size={14}/> : <Play size={14}/>} {tourLabel}
                    </button>
                    <button onClick={state.explore} aria-pressed={state.mode === 'explore'}><Compass
                        size={14}/>{t('freeExplore')}</button>
                </div>
                {children}
                <p className="museum-movement-hint">{t(state.mode === 'explore' ? 'exploreHint' : 'tourHint')}</p>
                <div className="museum-environment-actions">
                    <button aria-pressed={state.atmospherePaused} onClick={state.toggleAtmosphere}><Wind
                        size={13}/>{t(state.atmospherePaused ? 'resumeAtmosphere' : 'pauseAtmosphere')}</button>
                    <button onClick={restartMuseumVisit}>{t('restart')}</button></div>
                {state.mode === 'explore' && <div className="museum-assisted" aria-label={t('assisted')}>
                    {([-1, 1] as const).map(direction => <button key={direction}
                                                                 aria-label={t(direction > 0 ? 'walkForward' : 'walkBack')}
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
                            <ArrowDown size={18}/>}<span>{t(direction > 0 ? 'walkForward' : 'walkBack')}</span>
                    </button>)}
                </div>}
            </div>
        </nav>
    </>
}
