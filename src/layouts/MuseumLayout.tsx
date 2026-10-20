import {Outlet, Link} from 'react-router-dom'
import {useCallback} from 'react'
import {CPUExperienceControls} from '@/features/museum/CPUExperienceControls'
import {museumPresentation} from '@/features/museum/exhibitPresentation'
import {useMuseumVisit} from '@/features/museum/useMuseumVisit'
import {useAuthStore} from '@/features/auth/authStore'
import {Home} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {MuseumCanvas} from '@/experience/MuseumCanvas'
import {Logo} from '@/components/common/Logo'
import {AudioToggle} from '@/components/common/AudioToggle'
import {LanguageSwitcher} from '@/components/common/LanguageSwitcher'
import {useMuseumStore} from '@/features/museum/museumStore'
import {selectedMuseumItem, type ModelStatus} from '@/features/museum/museumState'
import {useMuseumCatalog} from '@/hooks/useMuseumCatalog'
import {MuseumNavigationControls} from '@/features/museum/MuseumNavigationControls'
import {MuseumCollection} from '@/features/museum/MuseumCollection'
import {useMuseumNavigation} from '@/features/museum/navigationState'

export function MuseumLayout() {
    const {t} = useTranslation(['common', 'museum'])
    const refresh = useMuseumCatalog()
    useMuseumVisit()
    const owner=useAuthStore(s=>s.user?.id)
    const state = useMuseumStore(), location = useMuseumNavigation(s => s.location), inspecting=useMuseumNavigation(s=>s.mode==='inspect'),overlay=useMuseumNavigation(s=>s.overlay)
    const item = state.owner===owner?selectedMuseumItem(state):undefined
    const presentation=museumPresentation({...state,focusedItemId:item?.id??null},location),cpuItem=presentation.cpuCompatible
    const notify = useCallback((status: ModelStatus) => {
        if (item) useMuseumStore.getState().setModelStatus(item.id, item.model3DUrl, status)
    }, [item])
    return <main className="relative h-dvh overflow-hidden bg-void" data-museum-journey data-physical-location={location} data-inspecting={inspecting} data-museum-overlay={overlay??'none'}>
        <MuseumCanvas key={owner} owner={owner} fixed connected preview={state.owner===owner&&state.status === 'ready' && !cpuItem} displayInHall={cpuItem} item={item} progress={state.progress} revision={state.modelRevision} modelStatus={state.modelStatus} onModelStatus={notify}/>
        <div className="pointer-events-none fixed inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_45%,#05090c88_100%)]"/>
        <header className="museum-header pointer-events-auto fixed inset-x-0 top-0 z-30 flex items-start justify-between p-5 md:p-8">
            <Logo to="/museum" compact/>
            <div className="flex items-center gap-2"><LanguageSwitcher/><AudioToggle compact/><Link to="/" className="icon-button font-mono text-[10px] uppercase tracking-widest" aria-label={t('exit')}><Home size={15}/><span className="hidden md:inline">{t('exit')}</span></Link></div>
        </header>
        <CPUExperienceControls available={state.owner===owner&&state.status==='ready'} sourceId={item?.id??null} realReady={presentation.canInspectModel} educational={location==='cpu'&&(!item||cpuItem)}/>
        <MuseumNavigationControls>
        {state.owner===owner && state.status === 'ready' && <MuseumCollection refresh={refresh}/>}
        </MuseumNavigationControls>
        <div className="museum-exhibit-overlay pointer-events-none fixed inset-0 z-20"><Outlet/></div>
    </main>
}
