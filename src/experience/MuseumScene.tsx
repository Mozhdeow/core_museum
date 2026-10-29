import {memo,useRef,useEffect} from 'react'
import {useFrame,useThree} from '@react-three/fiber'
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
import {MuseumAtmosphere} from './MuseumAtmosphere'
import {useMuseumQuality} from './useMuseumQuality'
import {MuseumRenderPreparation} from './MuseumRenderPreparation'
import {MuseumLighting} from './MuseumLighting'
import {MuseumAdaptive} from './MuseumAdaptive'

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
    const ambient=useRef<THREE.AmbientLight>(null),daylight=useRef<THREE.HemisphereLight>(null)
    const brightness=useMuseumQuality(s=>s.brightness),invalidate=useThree(s=>s.invalidate)
    useEffect(()=>{invalidate()},[brightness,invalidate])
    useFrame(({camera,gl,scene},dt)=>{const inspect=useMuseumNavigation.getState().mode==='inspect',z=camera.position.z,scale=brightness==='dim'?.82:brightness==='bright'?1.23:1
        const passage=THREE.MathUtils.smoothstep(z,-23,-17)*(1-THREE.MathUtils.smoothstep(z,0,5)),cpu=1-THREE.MathUtils.smoothstep(z,-24,-19)
        const approach=(value:number,target:number)=>reduced?target:THREE.MathUtils.damp(value,target,4,Math.min(dt,.05))
        if(ambient.current)ambient.current.intensity=approach(ambient.current.intensity,(inspect?.5:.95+passage*1.6+cpu*.75)*scale)
        if(daylight.current)daylight.current.intensity=approach(daylight.current.intensity,(inspect?1:1.5+passage*1.7+cpu*.75)*scale)
        gl.toneMappingExposure=approach(gl.toneMappingExposure,(inspect?1:1.18+passage*.28+cpu*.08)*scale)
        scene.environmentIntensity=approach(scene.environmentIntensity,1+passage*.25)
        if(scene.fog instanceof THREE.FogExp2)scene.fog.density=approach(scene.fog.density,.019-passage*.005)
    })
    return <><ambientLight ref={ambient} intensity={.3}/><hemisphereLight ref={daylight} args={['#e5d7c1','#211b16',.75]}/></>
}
export const MuseumScene=memo(function MuseumScene({owner, modelUrl, itemId, revision = 0, reduced = false, mobile = false, connected = false, onModelStatus}: {
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
    return <><color attach="background" args={['#050505']}/><fogExp2 attach="fog" args={['#131515',.019]}/>
        <MuseumMood reduced={reduced}/>
        <MuseumLighting/><MuseumAdaptive mobile={mobile}/>

        <MuseumResources><group visible={!modelInspect}><MuseumArchitecture mobile={mobile} reduced={reduced}/><MuseumAtmosphere reduced={reduced}/></group>
        {!modelInspect&&<CorridorExhibitions owner={owner}/>}<MuseumNavigation owner={owner} reduced={reduced}/>
        {!inspecting&&<CPUCategoryExhibition reduced={reduced}/>}
        <CPUSchematic reduced={reduced} visible={schematic}/>

        {itemId && <group visible={!schematic&&modelInspect} position={[0,0,-27]}>
            <UploadedExhibit id={itemId} url={modelUrl??null} revision={revision} notify={onModelStatus} focus
                fallback={status=>modelInspect?<Sign at={[0,2.25,0]} width={2} center title={t(`showcaseModel.${status}`)} subtitle={t('modelNotSubstituted')}/>:null}/>
        </group>}<MuseumRenderPreparation/></MuseumResources>
    </>
})
