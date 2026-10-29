import {Canvas, useThree} from '@react-three/fiber'
import {MuseumScene} from './MuseumScene'
import {useReducedMotion, useMediaQuery} from '@/hooks/usePreferences'
import type {MuseumItem} from '@/types/museum'
import type {ModelStatus} from '@/features/museum/museumState'
import {useEffect, useMemo, useState} from 'react'
import {ACESFilmicToneMapping, SRGBColorSpace} from 'three'
import {useMuseumQuality} from './useMuseumQuality'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import {MuseumPerfOverlay,MuseumPerfProbe} from './MuseumPerf'

function MuseumRendererLifecycle({onLost}:{onLost:(lost:boolean)=>void}) {
    const {gl,invalidate}=useThree()
    useEffect(()=>{
        const lost=(event:Event)=>{event.preventDefault();onLost(true)}
        const restored=()=>{onLost(false);useMuseumQuality.setState(s=>({contextRevision:s.contextRevision+1}));invalidate()}
        const canvas=gl.domElement
        canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored)
        return()=>{canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored)}
    },[gl,invalidate,onLost])
    return null
}

export function MuseumCanvas({owner, className = '', fixed = false, connected = false, preview = false, displayInHall = true, item, progress = 0, revision = 0, modelStatus = 'missing', onModelStatus}: {
    owner?:string; className?: string; fixed?: boolean; item?: MuseumItem; progress?: number; revision?: number
    modelStatus?: ModelStatus; onModelStatus?: (status: ModelStatus) => void; connected?: boolean; preview?: boolean; displayInHall?:boolean
}) {
    const reduced = useReducedMotion(), mobile = useMediaQuery('(max-width: 767px), (pointer: coarse)')
    const [contextLost, setContextLost] = useState(false)
    useEffect(() => {if (connected) useMuseumQuality.getState().initialize(reduced)}, [connected, reduced])
    const location=useMuseumNavigation(s=>s.location)
    const camera = useMemo(() => ({position: connected ? [0,1.72,15.5] as [number,number,number] : [0,.2,8] as [number,number,number],
        fov: connected ? 60 : 42, near: .1, far: 90}), [connected])
    // A location/HUD update must not reconfigure Canvas and overwrite adaptive DPR.
    const viewport=useMemo(()=>(<Canvas dpr={connected ? 1 : [1,mobile ? 1.15 : 1.5]} frameloop={reduced ? 'demand' : 'always'} gl={{antialias: connected || !mobile, alpha: false, powerPreference: 'high-performance'}}
            onCreated={({gl}) => {
                if (!connected) return
                gl.outputColorSpace = SRGBColorSpace; gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = .95
            }}
            camera={camera} fallback={<div role="status">3D unavailable / نمایش سه‌بعدی در دسترس نیست</div>}>
            {connected && <><MuseumRendererLifecycle onLost={setContextLost}/><MuseumPerfProbe/></>}
            <MuseumScene owner={owner} modelUrl={item?.model3DUrl} itemId={item?.id} hall={displayInHall} modelStatus={modelStatus} revision={revision}
                reduced={reduced} mobile={mobile} connected={connected} preview={preview} placeholder={Boolean(item&&!displayInHall)} onModelStatus={onModelStatus}/>
        </Canvas>),[connected,mobile,reduced,camera,owner,item,displayInHall,revision,preview,modelStatus,onModelStatus])
    return <div className={`${fixed ? 'fixed' : 'absolute'} inset-0 ${className}`} data-museum-scene
        data-item-id={item?.id ?? ''} data-model-url={item?.model3DUrl ?? ''} data-model-state={modelStatus} data-catalog-progress={progress} data-procedural-preview={connected && preview && (!item||!displayInHall)} data-display-location={displayInHall?'cpu':'corridor'} data-display-item-id={(displayInHall||location==='corridor')?item?.id??'':''}>
        {contextLost && <div className="museum-context-status" role="status">Restoring 3D view… / بازیابی نمای سه‌بعدی…</div>}
        {viewport}
        {connected&&<MuseumPerfOverlay/>}
    </div>
}
