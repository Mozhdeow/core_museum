import {Canvas} from '@react-three/fiber'
import {MuseumScene} from './MuseumScene'
import {useReducedMotion, useMediaQuery} from '@/hooks/usePreferences'
import type {MuseumItem} from '@/types/museum'
import type {ModelStatus} from '@/features/museum/museumState'
import {useMemo} from 'react'
import {useMuseumNavigation} from '@/features/museum/navigationState'

export function MuseumCanvas({owner, className = '', fixed = false, connected = false, preview = false, displayInHall = true, item, progress = 0, revision = 0, modelStatus = 'missing', onModelStatus}: {
    owner?:string; className?: string; fixed?: boolean; item?: MuseumItem; progress?: number; revision?: number
    modelStatus?: ModelStatus; onModelStatus?: (status: ModelStatus) => void; connected?: boolean; preview?: boolean; displayInHall?:boolean
}) {
    const reduced = useReducedMotion(), mobile = useMediaQuery('(max-width: 767px), (pointer: coarse)')
    const location=useMuseumNavigation(s=>s.location)
    const camera = useMemo(() => ({position: connected ? [0,1.72,15.5] as [number,number,number] : [0,.2,8] as [number,number,number],
        fov: connected ? 60 : 42, near: .1, far: 90}), [connected])
    return <div className={`${fixed ? 'fixed' : 'absolute'} inset-0 ${className}`} data-museum-scene
        data-item-id={item?.id ?? ''} data-model-url={item?.model3DUrl ?? ''} data-model-state={modelStatus} data-catalog-progress={progress} data-procedural-preview={connected && preview && (!item||!displayInHall)} data-display-location={displayInHall?'cpu':'corridor'} data-display-item-id={(displayInHall||location==='corridor')?item?.id??'':''}>
        <Canvas dpr={[1,mobile ? 1.15 : 1.5]} frameloop={reduced ? 'demand' : 'always'} gl={{antialias: !mobile, alpha: false, powerPreference: 'high-performance'}}
            camera={camera} fallback={<div role="status">3D unavailable / نمایش سه‌بعدی در دسترس نیست</div>}>
            <MuseumScene owner={owner} modelUrl={item?.model3DUrl} itemId={item?.id} hall={displayInHall} modelStatus={modelStatus} revision={revision}
                reduced={reduced} mobile={mobile} connected={connected} preview={preview} placeholder={Boolean(item&&!displayInHall)} onModelStatus={onModelStatus}/>
        </Canvas>
    </div>
}
