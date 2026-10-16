import {Canvas} from '@react-three/fiber'
import {MuseumScene} from './MuseumScene'
import {useReducedMotion} from '@/hooks/usePreferences'
import type {MuseumItem} from '@/types/museum'
import type {ModelStatus} from '@/features/museum/museumState'

export function MuseumCanvas({className = '', fixed = false, item, progress = 0, revision = 0, modelStatus = 'missing', onModelStatus}: {
    className?: string; fixed?: boolean; item?: MuseumItem; progress?: number; revision?: number
    modelStatus?: ModelStatus; onModelStatus?: (status: ModelStatus) => void
}) {
    const reduced = useReducedMotion()
    return <div className={`${fixed ? 'fixed' : 'absolute'} inset-0 ${className}`} data-museum-scene
        data-item-id={item?.id ?? ''} data-model-url={item?.model3DUrl ?? ''} data-model-state={modelStatus}>
        <Canvas dpr={[1,1.6]} frameloop={reduced ? 'demand' : 'always'} gl={{antialias: true, alpha: false}}
            camera={{position: [0,.2,8], fov: 42}} fallback={<div role="status">3D unavailable</div>}>
            <MuseumScene progress={progress} modelUrl={item?.model3DUrl} itemId={item?.id} revision={revision}
                reduced={reduced} onModelStatus={onModelStatus}/>
        </Canvas>
    </div>
}