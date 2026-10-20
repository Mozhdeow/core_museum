import {useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import {Mesh, MeshBasicMaterial, MathUtils, PointLight, Group} from 'three'
import {useMuseumPalette} from './museumPalette'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import {useMuseumStore} from '@/features/museum/museumStore'
import {categoryShowcases,exhibitionEnd} from '@/features/museum/exhibition'
import {CPUHall} from './CPUHall'
import {Block, Inlay, Downlight, Sign, PortalFrame, Floor} from './MuseumPrimitives'

/** One animated service spine per bay: approach feedback, not decorative particle traffic. */
function ReactiveBay({z, reduced}: { z: number; reduced: boolean }) {
    const palette = useMuseumPalette(), light = useRef<PointLight>(null), strip = useRef<Mesh>(null)
    const shutter = useRef<Group>(null), phase = useRef(0)
    useFrame(({camera}, delta) => {
        const nav = useMuseumNavigation.getState()
        const paused = reduced || nav.atmospherePaused || document.hidden || (nav.mode === 'guided' && !nav.playing && nav.progress > .01 && nav.progress < .99)
        if (!paused) phase.current += Math.min(delta, .05) * (nav.mode === 'inspect' ? .06 : .35)
        const proximity = 1 - MathUtils.smoothstep(Math.abs(camera.position.z - z), 2, 9)
        if (light.current) light.current.intensity = 4 + proximity * 15
        if (strip.current) (strip.current.material as MeshBasicMaterial).opacity = .3 + proximity * .65
        if (shutter.current) shutter.current.rotation.z = Math.sin(phase.current + z) * .025
    })
    return <group>
        <mesh ref={strip} position={[0, 4.41, z]}>
            <boxGeometry args={[2.2, .035, .13]}/>
            <meshBasicMaterial color={palette.orange} transparent toneMapped={false}/>
        </mesh>
        <pointLight ref={light} position={[0, 3.8, z]} intensity={8} color={palette.orange} distance={7}/>
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

export function MuseumArchitecture({mobile, reduced}: { mobile: boolean; reduced: boolean }) {
    const palette = useMuseumPalette()
    const end=exhibitionEnd(categoryShowcases(useMuseumStore()).length)
    return <group name="connected-museum-architecture">
        <Floor at={[0, -.025, 10.5]} size={[14, 19]} reflective={!mobile}/>
        <Floor at={[0, -.026, -8.5]} size={[7, 23]}/>
        <Block at={[0, 6.3, 10.5]} size={[14, .35, 19]} color={palette.dark}/>
        {end===18?<Block at={[0, 3.1, 20]} size={[14, 6.3, .35]}/>:<group name="category-archive-extension">
            <Floor at={[0,-.026,(20+end+2)/2]} size={[7,end-18]}/>
            <Block at={[0,4.8,(20+end+2)/2]} size={[7,.3,end-18]}/>
            <Block at={[0,2.35,end+2]} size={[7,4.7,.24]}/>
            {[-1,1].map(side=><Block key={side} at={[side*3.55,2.35,(20+end+2)/2]} size={[.24,4.7,end-18]}/>)}
            {Array.from({length:Math.ceil((end-20)/4)},(_,i)=>24+i*4).map(z=><group key={z}><PortalFrame z={z-2} width={6.65} height={4.6}/><ReactiveBay z={z} reduced={reduced}/></group>)}
        </group>}
        {[-1, 1].map(side => <group key={side}>
            <Block at={[side * 7, 3.1, 10.5]} size={[.4, 6.2, 19]}/>
            {[5, 9, 13, 17].map((z, i) => <group key={z}>
                <Block at={[side * 6.55, 3, z]} size={[.3, 6, .24]} color={palette.steel}/>
                <Block at={[side * 6.85, 2.5, z + 1.8]} size={[.05, 3.9, 3.2]} color={palette.stone} roughness={.65}/>
                <Inlay at={[side * 6.65, .18, z]} size={[.035, .04, 3.7]}/>
                <Block at={[side * 6.2, 1.05, z + 1]} size={[.75, .22, 1.8]} color={palette.dark}/>
                {i % 2 === 0 && <Inlay at={[side * 6.4, 3.2, z + 1.1]} size={[.04, 1.4, .06]} cyan/>}
            </group>)}
            <Block at={[side * 5.1, 2.6, 2.7]} size={[3.4, 5.2, .65]} color={palette.stone}/>
            <Inlay at={[side * 2.75, .012, -7]} size={[.035, .012, 28]}/>
            <Inlay at={[side * 5.8, .012, 11]} size={[.025, .012, 15]}/>
            {[5, 10, 15].map(z => <Downlight key={z} x={side * 4.5} z={z} intensity={42}/>)}
            <Block at={[side * 3.8, .24, 10]} size={[.7, .48, 3.4]} color={palette.stone}/>
        </group>)}
        {/* A floating, offset ceiling lattice gives the entrance a distinct silhouette. */}
        {[-5, -3, -1, 1, 3, 5].map(x => <Block key={x} at={[x, 6.05, 11]} size={[.12, .25, 16]}
                                               color={palette.steel}/>)}
        {[6, 10, 14, 18].map((z, i) => <group key={z}>
            <Block at={[0, 5.55, z]} size={[9 - i * .55, .18, .45]} color={palette.steel}/>
            <Inlay at={[0, 5.44, z]} size={[8.3 - i * .55, .025, .08]}/>
        </group>)}
        {[4, 8, 12, 16, 19].map(z => <Inlay key={z} at={[0, .004, z]} size={[13.5, .008, .012]}/>)}
        <Sign at={[-4.9, 3.1, 3.06]} width={2.5} title="CORE" subtitle="THE COMPUTER ARCHIVE"/>
        <Sign at={[4.9, 3.1, 3.06]} width={2.45} title="01 / CPU" subtitle="BEGIN YOUR JOURNEY"/>
        <PortalFrame z={2.9} width={6.7} height={5.3} amber/>
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
                <Inlay at={[side * 3.26, .35, z]} size={[.02, .035, .5]} cyan/>
            </group>)}
        </group>)}
        {[-1, -5, -9, -13, -17].map(z => <group key={z}><PortalFrame z={z} width={6.65} height={4.6}/><ReactiveBay z={z}
                                                                                                                   reduced={reduced}/>
        </group>)}
        <LogicLandmark reduced={reduced}/>
        <CPUHall mobile={mobile} reduced={reduced}/>
    </group>
}

