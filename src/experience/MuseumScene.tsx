import {Component, Suspense, useEffect, useMemo, useRef, type ReactNode} from 'react'
import {useFrame} from '@react-three/fiber'
import {Float, Sparkles, PerspectiveCamera, useGLTF} from '@react-three/drei'
import * as THREE from 'three'
import {clone} from 'three/addons/utils/SkeletonUtils.js'
import {fitMuseumModel, supportedModelUrl} from './modelGeometry'
import type {ModelStatus} from '@/features/museum/museumState'

function CoreObject({reduced}: {reduced: boolean}) {
    const ref = useRef<THREE.Group>(null)
    useFrame((_, delta) => {if (!reduced && ref.current) {
        ref.current.rotation.y += delta * .12
        ref.current.rotation.x = Math.sin(Date.now() * .00025) * .08
    }})
    return <group ref={ref}><mesh><icosahedronGeometry args={[1.65,2]}/><meshStandardMaterial color="#171717" metalness={.92} roughness={.22} emissive="#ff7a18" emissiveIntensity={.08}/></mesh><mesh scale={1.03}><icosahedronGeometry args={[1.65,1]}/><meshBasicMaterial color="#ff7a18" wireframe transparent opacity={.34}/></mesh><mesh scale={.55}><octahedronGeometry args={[1,0]}/><meshStandardMaterial color="#55e6e6" emissive="#55e6e6" emissiveIntensity={2} metalness={.4} roughness={.3}/></mesh></group>
}
type Notify = (status: ModelStatus) => void
function ModelFallback({status, reduced, notify}: {status: ModelStatus; reduced: boolean; notify?: Notify}) {
    useEffect(() => {notify?.(status)}, [status, notify])
    return <CoreObject reduced={reduced}/>
}
function UploadedModel({url, notify, id}: {url: string; notify?: Notify; id?: string}) {
    const gltf = useGLTF(url)
    const model = useMemo(() => {
        const object = clone(gltf.scene)
        return {object, ...fitMuseumModel(object)}
    }, [gltf.scene])
    useEffect(() => () => {
        model.object.traverse(object => {
            if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose()
        })
    }, [model])
    useEffect(() => {notify?.('ready')}, [notify, model])
    // Local nodes/skeletons share cached geometry, materials and textures; never dispose those here.
    return <group name={`exhibit:${id ?? url}`} scale={model.scale} position={model.position} dispose={null}>
        <primitive object={model.object} dispose={null}/>
    </group>
}
class ModelBoundary extends Component<{children: ReactNode; fallback: ReactNode}, {failed: boolean}> {
    state = {failed: false}
    static getDerivedStateFromError() {return {failed: true}}
    render() {return this.state.failed ? this.props.fallback : this.props.children}
}
export function MuseumScene({progress = 0, modelUrl, itemId, revision = 0, reduced = false, onModelStatus}: {
    progress?: number; modelUrl?: string | null; itemId?: string; revision?: number; reduced?: boolean; onModelStatus?: Notify
}) {
    const valid = modelUrl && supportedModelUrl(modelUrl)
    return <><PerspectiveCamera makeDefault position={[0,.2,8]} fov={42}/><color attach="background" args={['#050505']}/><fog attach="fog" args={['#050505',5,17]}/><ambientLight intensity={.22}/><pointLight position={[4,3,4]} color="#ff7a18" intensity={14} distance={10}/><pointLight position={[-5,-2,2]} color="#55e6e6" intensity={5} distance={12}/><spotLight position={[0,6,1]} color="#ffb547" intensity={18} angle={.3} penumbra={1} castShadow/>
        <Float enabled={!reduced} speed={.6} rotationIntensity={.15} floatIntensity={.22}>
            <group position={reduced ? [0,0,0] : [progress*-.4,Math.sin(progress*Math.PI)*.15,0]}>
                {valid ? <ModelBoundary key={`${itemId}:${modelUrl}:${revision}`} fallback={<ModelFallback status="error" reduced={reduced} notify={onModelStatus}/>}>
                    <Suspense fallback={<ModelFallback status="loading" reduced={reduced} notify={onModelStatus}/>}>
                        <UploadedModel url={modelUrl!} id={itemId} notify={onModelStatus}/>
                    </Suspense>
                </ModelBoundary> : <ModelFallback status={modelUrl ? 'error' : 'missing'} reduced={reduced} notify={onModelStatus}/>}
            </group>
        </Float>
        <Sparkles count={progress>.7?70:45} scale={[10,7,7]} size={1.1} speed={reduced ? 0 : .14} color="#ffb547"/>
    </>
}
