import {useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import {Float, Sparkles} from '@react-three/drei'
import * as THREE from 'three'
import {UploadedExhibit} from './UploadedExhibit'
import {CorridorExhibitions} from './CorridorExhibitions'
import {Sign} from './MuseumPrimitives'
import {useTranslation} from 'react-i18next'
import type {ModelStatus} from '@/features/museum/museumState'
import {MuseumArchitecture} from './MuseumArchitecture'
import {MuseumNavigation} from './MuseumNavigation'
import {CPUCategoryExhibition} from './CPUCategoryExhibition'
import {CPUSchematic} from './CPUSchematic'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import {useCPUExperience} from '@/features/museum/cpuExperienceState'
import {MuseumResources} from './MuseumResources'
import {useMuseumPalette} from './museumPalette'

function CoreObject({reduced}: {reduced: boolean}) {
    const ref = useRef<THREE.Group>(null)
    useFrame((_, delta) => {if (!reduced && ref.current) {
        ref.current.rotation.y += delta * .12
        ref.current.rotation.x = Math.sin(Date.now() * .00025) * .08
    }})
    return <group ref={ref}><mesh><icosahedronGeometry args={[1.65,2]}/><meshStandardMaterial color="#171717" metalness={.92} roughness={.22} emissive="#ff7a18" emissiveIntensity={.08}/></mesh><mesh scale={1.03}><icosahedronGeometry args={[1.65,1]}/><meshBasicMaterial color="#ff7a18" wireframe transparent opacity={.34}/></mesh><mesh scale={.55}><octahedronGeometry args={[1,0]}/><meshStandardMaterial color="#55e6e6" emissive="#55e6e6" emissiveIntensity={2} metalness={.4} roughness={.3}/></mesh></group>
}
type Notify = (status: ModelStatus) => void
function MuseumMood({reduced}: {reduced:boolean}) {
    const palette=useMuseumPalette(),ambient=useRef<THREE.AmbientLight>(null),daylight=useRef<THREE.HemisphereLight>(null)
    useFrame((_,dt)=>{const inspect=useMuseumNavigation.getState().mode==='inspect'
        if(ambient.current)ambient.current.intensity=reduced?(inspect?.4:.65):THREE.MathUtils.damp(ambient.current.intensity,inspect?.4:.65,5,Math.min(dt,.05))
        if(daylight.current)daylight.current.intensity=reduced?(inspect?1:1.5):THREE.MathUtils.damp(daylight.current.intensity,inspect?1:1.5,5,Math.min(dt,.05))
    })
    return <><ambientLight ref={ambient} intensity={.65}/><hemisphereLight ref={daylight} args={['#d5dce1','#302823',1.5]}/><directionalLight position={[3,8,12]} color={palette.light} intensity={3}/></>
}
export function MuseumScene({owner, modelUrl, itemId, revision = 0, reduced = false, mobile = false, connected = false, onModelStatus}: {
    owner?:string; modelUrl?: string | null; itemId?: string; hall?:boolean;modelStatus?:ModelStatus;revision?: number; reduced?: boolean; mobile?: boolean; connected?: boolean; preview?: boolean; placeholder?:boolean; onModelStatus?: Notify
}) {
    const inspecting = useMuseumNavigation(s=>s.mode==='inspect'), learningView = useCPUExperience(s=>s.view)
    const schematic = inspecting && learningView==='schematic'
    const {t}=useTranslation('museum')
    const modelInspect=inspecting&&learningView==='model'
    // AuthLayout shares this Canvas; its original decorative scene stays independent of navigation.
    if (!connected) return <><color attach="background" args={['#050505']}/><fog attach="fog" args={['#050505',5,17]}/>
        <ambientLight intensity={.22}/><pointLight position={[4,3,4]} color="#ff7a18" intensity={14} distance={10}/>
        <pointLight position={[-5,-2,2]} color="#55e6e6" intensity={5} distance={12}/>
        <spotLight position={[0,6,1]} color="#ffb547" intensity={18} angle={.3} penumbra={1}/>
        <Float enabled={!reduced} speed={.6} rotationIntensity={.15} floatIntensity={.22}><CoreObject reduced={reduced}/></Float>
        <Sparkles count={45} scale={[10,7,7]} size={1.1} speed={reduced ? 0 : .14} color="#ffb547"/></>
    return <><color attach="background" args={['#101418']}/><fog attach="fog" args={['#101418',24,62]}/>
        <MuseumMood reduced={reduced}/>
        {modelInspect&&<directionalLight position={[-5,-3,-32]} color="#d5e3ef" intensity={2}/>}
        <MuseumResources><group visible={!modelInspect}><MuseumArchitecture mobile={mobile} reduced={reduced}/></group>
        {!modelInspect&&<CorridorExhibitions owner={owner}/>}<MuseumNavigation owner={owner} reduced={reduced}/>
        {!inspecting&&<CPUCategoryExhibition reduced={reduced}/>}
        <CPUSchematic reduced={reduced} visible={schematic}/>

        {itemId && <group visible={!schematic&&modelInspect} position={[0,0,-27]}>
            <UploadedExhibit id={itemId} url={modelUrl??null} revision={revision} notify={onModelStatus} focus
                fallback={status=>modelInspect?<Sign at={[0,2.25,0]} width={2} center title={t(`showcaseModel.${status}`)} subtitle={t('modelNotSubstituted')}/>:null}/>
        </group>}</MuseumResources>
    </>
}
