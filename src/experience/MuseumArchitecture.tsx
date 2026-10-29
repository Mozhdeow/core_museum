import {memo,useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import {Mesh, MeshBasicMaterial, MathUtils, Group} from 'three'
import {useMuseumPalette} from './museumPalette'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import {useMuseumStore} from '@/features/museum/museumStore'
import {categoryShowcases,exhibitionEnd} from '@/features/museum/exhibition'
import {CPUHall} from './CPUHall'
import {MuseumDoors} from './MuseumDoors'
import {PassageLighting} from './PassageLighting'
import {EntranceGallery} from './EntranceGallery'
import {StaticMuseumBatch} from './StaticMuseumBatch'
import {Block, Inlay, Sign, PortalFrame, Floor} from './MuseumPrimitives'

/** One animated service spine per bay: approach feedback, not decorative particle traffic. */
function ReactiveBay({z, reduced}: { z: number; reduced: boolean }) {
    const palette = useMuseumPalette(), strip = useRef<Mesh>(null)
    const shutter = useRef<Group>(null), phase = useRef(0)
    useFrame(({camera}, delta) => {
        const nav = useMuseumNavigation.getState()
        const paused = reduced || nav.atmospherePaused || document.hidden || (nav.mode === 'guided' && !nav.playing && nav.progress > .01 && nav.progress < .99)
        if (!paused) phase.current += Math.min(delta, .05) * (nav.mode === 'inspect' ? .06 : .35)
        const proximity = 1 - MathUtils.smoothstep(Math.abs(camera.position.z - z), 2, 9)
        if (strip.current) (strip.current.material as MeshBasicMaterial).opacity = .3 + proximity * .65
        if (shutter.current) shutter.current.rotation.z = Math.sin(phase.current + z) * .025
    })
    return <group name="reactive-museum-bay" userData={{dynamic:true,z}}>
        <mesh ref={strip} position={[0, 4.41, z]}>
            <boxGeometry args={[2.2, .035, .13]}/>
            <meshBasicMaterial color={palette.orange} transparent toneMapped={false}/>
        </mesh>
        <group ref={shutter} position={[0, 4.3, z - .75]}>
            {[-1, 0, 1].map(i => <Block key={i} at={[i * .7, 0, 0]} size={[.45, .12, 1.4]} color={palette.steel}/>)}
        </group>
    </group>
}

/** A single kinetic logic seal breaks the corridor rhythm at its midpoint. */
function LogicLandmark({reduced}: { reduced: boolean }) {
    const palette = useMuseumPalette(), rotor = useRef<Group>(null), phase = useRef(0)
    useFrame(({camera}, dt) => {
        const nav = useMuseumNavigation.getState()
        if (!reduced && !nav.atmospherePaused && nav.mode !== 'inspect' && !document.hidden && (nav.playing || nav.mode === 'explore' || nav.progress === 0)) phase.current += Math.min(dt, .05) * .15
        if (rotor.current) rotor.current.rotation.z = .3 + Math.sin(phase.current) * .12
        const near = 1 - MathUtils.smoothstep(Math.abs(camera.position.z + 9), 2, 8)
        if (rotor.current) rotor.current.scale.setScalar(.9 + near * .07)
    })
    return <group position={[3.1, 2.5, -9]} rotation={[0, -Math.PI / 2, 0]}>
        <Block at={[0, 0, -.08]} size={[2.5, 3.1, .12]} color={palette.dark}/>
        <group ref={rotor}>
            {[0, 1].map(i => <mesh key={i} rotation={[0, 0, i * Math.PI / 4]}>
                <torusGeometry args={[.78 - i * .17, .035, 6, 4]}/>
                <meshStandardMaterial color={palette.steel} metalness={.7} roughness={.3}/>
            </mesh>)}
            <mesh rotation={[0, 0, .6]}>
                <torusGeometry args={[.58, .012, 6, 32, Math.PI * 1.5]}/>
                <meshBasicMaterial color={palette.orange} transparent opacity={.65} toneMapped={false}/>
            </mesh>
        </group>
        <Sign at={[-1, 1.4, .015]} width={2} title="LOGIC" subtitle="COMPUTATION / PASSAGE 01"/>
    </group>
}

export const MuseumArchitecture=memo(function MuseumArchitecture({mobile, reduced}: { mobile: boolean; reduced: boolean }) {
    const palette = useMuseumPalette()
    const end=useMuseumStore(s=>exhibitionEnd(categoryShowcases(s).length))
    return <group name="connected-museum-architecture">
        <EntranceGallery mobile={mobile} reduced={reduced}/><MuseumDoors reduced={reduced}/><PassageLighting/>
        <StaticMuseumBatch>
        <Floor at={[0, -.026, -8.5]} size={[7, 23]}/>
        {end===18?<Block at={[0, 3.1, 20]} size={[14, 6.3, .35]}/>:<group name="category-archive-extension">
            <Floor at={[0,-.026,(20+end+2)/2]} size={[7,end-18]}/>
            <Block at={[0,4.8,(20+end+2)/2]} size={[7,.3,end-18]}/>
            <Block at={[0,2.35,end+2]} size={[7,4.7,.24]}/>
            {[-1,1].map(side=><Block key={side} at={[side*3.55,2.35,(20+end+2)/2]} size={[.24,4.7,end-18]}/>)}
            {Array.from({length:Math.ceil((end-20)/4)},(_,i)=>24+i*4).map(z=><group key={z}><PortalFrame z={z-2} width={6.65} height={4.6}/><ReactiveBay z={z} reduced={reduced}/></group>)}
        </group>}
        {[-1, 1].map(side => <Inlay key={side} at={[side * 2.75, .012, -7]} size={[.035, .012, 28]}/>)}
        {/* Corridor: alternate deep technical recesses and metal reliefs, rather than identical boxes. */}
        <Block at={[0, 4.8, -8]} size={[7, .3, 22]} color={palette.dark}/>
        {[-1, 1].map(side => <group key={side}>
            <Block at={[side * 3.55, 2.35, -8]} size={[.24, 4.7, 22]} color={palette.stone}/>
            {[-1, -5, -9, -13, -17].map((z, i) => <group key={z}>
                <Block at={[side * 3.38, 2.3, z]} size={[.16, 4.6, .12]} color={palette.steel}/>
                <Inlay at={[side * 3.28, 4.4, z - 1.8]} size={[.022, .022, 3.4]}/>
                {i % 2 === 0 && <group>
                    <Block at={[side * 3.2, 2, z - 1.7]} size={[.28, 2.8, 2.4]} color={palette.dark}/>
                    {[0, 1, 2, 3].map(n => <Block key={n} at={[side * (3.01 - n * .04), 1.1 + n * .45, z - 1.7]}
                                                  size={[.08, .09, 1.9 - n * .3]} color={palette.steel}/>)}
                    <Inlay at={[side * 2.98, 2.9, z - 1.7]} size={[.03, .025, 1.6]}/>
                </group>}
            </group>)}
            {[-5.5, -12.5].map(z => <group key={z}>
                <Block at={[side * 3.38, 1.7, z]} size={[.16, 3.25, 2.8]} color={palette.dark}/>
                <Block at={[side * 3.03, 3.55, z]} size={[.12, .56, 2.25]} color={palette.dark}/>
            </group>)}
        </group>)}
        {[-1, -5, -9, -13, -17].map(z => <group key={z}><PortalFrame z={z} width={6.65} height={4.6}/><ReactiveBay z={z}
                                                                                                                   reduced={reduced}/>
        </group>)}
        </StaticMuseumBatch>
        <LogicLandmark reduced={reduced}/>
        <CPUHall mobile={mobile} reduced={reduced}/>
    </group>
})

