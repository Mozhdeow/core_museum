import {useEffect,useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import {Group, MathUtils, Mesh, MeshStandardMaterial, PointLight} from 'three'
import {Block, Inlay, Downlight, Sign, PortalFrame, Floor} from './MuseumPrimitives'
import {useMuseumPalette} from './museumPalette'
import {useMuseumNavigation} from '@/features/museum/navigationState'

/** Reusable exhibition base; the artwork above it always remains independently owned. */
export function ExhibitionPedestal({reduced}: {reduced: boolean}) {
    const palette = useMuseumPalette(), moving = useRef<Group>(null), halo = useRef<Group>(null)
    const key = useRef<PointLight>(null), reveal = useRef(0), phase = useRef(0)
    const arrivalRevision=useMuseumNavigation(s=>s.arrivalRevision)
    useEffect(()=>{reveal.current=useMuseumNavigation.getState().location==='cpu'?1:0},[arrivalRevision])
    useFrame(({camera, gl}, delta) => {
        const nav = useMuseumNavigation.getState(), dt = Math.min(delta,.05)
        const approached = camera.position.z < -18
        const paused = nav.atmospherePaused || document.hidden || (nav.mode === 'guided' && !nav.playing && nav.progress < .99)
        if (reduced) reveal.current = approached ? 1 : 0
        else if (!paused) reveal.current = MathUtils.damp(reveal.current, approached ? 1 : 0, 1.8, dt)
        if (!paused && !reduced) phase.current += dt * (nav.mode==='inspect'?.15:1)
        if (moving.current) moving.current.position.y = -.28 * (1-reveal.current)
        if (halo.current) halo.current.rotation.y = reduced ? .12 : .12 + Math.sin(phase.current*.18)*.04
        if (key.current) key.current.intensity = 12 + reveal.current*38 + (nav.mode==='inspect'?12:0)
        const value=reveal.current.toFixed(2)
        if(gl.domElement.getAttribute('data-cpu-reveal')!==value)gl.domElement.setAttribute('data-cpu-reveal',value)
    })
    return <group name="exhibition-pedestal" position={[0,0,-27]}>
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,.015,0]}><circleGeometry args={[3.55,64]}/><meshStandardMaterial color={palette.dark} metalness={.7} roughness={.3}/></mesh>
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,.022,0]}><ringGeometry args={[3.46,3.48,64]}/><meshBasicMaterial color={palette.orange} toneMapped={false}/></mesh>
        <group ref={moving}>
            <Block at={[0,.24,0]} size={[4.5,.45,3.9]} color={palette.steel} roughness={.3}/>
            <Block at={[0,.5,0]} size={[4.25,.1,3.65]} color={palette.dark} roughness={.16}/>
            <Block at={[0,.65,0]} size={[3.8,.2,3.25]} color={palette.graphite}/>
            <Inlay at={[0,.49,1.84]} size={[3.9,.025,.03]}/>
            <Inlay at={[-2.13,.49,0]} size={[.03,.025,3.65]}/>
            <Inlay at={[2.13,.49,0]} size={[.03,.025,3.65]}/>
            <Block at={[0,.81,0]} size={[3.3,.12,2.8]} color={palette.steel} roughness={.24}/>
            <Block at={[0,.89,0]} size={[3.05,.05,2.6]} color={palette.dark} roughness={.09}/>
        </group>
        <group ref={halo} position={[0,4.85,0]}>
            <mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[2.8,.08,8,64]}/><meshStandardMaterial color={palette.steel} metalness={.85} roughness={.3}/></mesh>
            <mesh rotation={[Math.PI/2,0,0]} position={[0,-.08,0]}><torusGeometry args={[2.72,.018,6,64]}/><meshBasicMaterial color={palette.orange} toneMapped={false}/></mesh>
        </group>
        <pointLight ref={key} position={[0,3.6,1.7]} color={palette.amber} intensity={25} distance={9}/>
        <Downlight x={0} z={0} y={5.7} intensity={100}/>
    </group>
}

export function CPUHall({mobile, reduced}: {mobile: boolean; reduced: boolean}) {
    const palette=useMuseumPalette(), glass=useRef<Mesh>(null)
    useFrame(({camera})=>{if(glass.current)(glass.current.material as MeshStandardMaterial).opacity=.08 + .05*(1-MathUtils.smoothstep(Math.abs(camera.position.z+23),0,8))})
    return <group name="cpu-hall">
        <Floor at={[0,-.028,-25]} size={[16,12]}/>
        <PortalFrame z={-19} width={7} height={5.4} amber/>
        <PortalFrame z={-19.7} width={7.8} height={5.9}/>
        <Block at={[0,4,-18.76]} size={[4.5,.85,.12]} color={palette.dark}/>
        <Sign at={[0,4,-18.68]} width={4.2} title="CPU HALL" subtitle="01 / THE ARCHITECTURE OF THOUGHT" center fadeAfter={[-13,-17]} quietDuringInspection/>
        <Block at={[0,3.3,-30.5]} size={[16,6.6,.4]} color={palette.dark}/>
        <Block at={[0,6.6,-25]} size={[16,.25,12]} color={palette.dark}/>
        {/* Folded steel wall fan: a monument behind the display, with a dark central aperture. */}
        {[-1,1].map(side=><group key={side}>
            <Block at={[side*8,3.25,-25]} size={[.3,6.5,12]} color={palette.stone}/>
            {[0,1,2,3,4].map(n=><group key={n}>
                <group position={[side*(3+n*.85),3.1,-30+n*.17]} rotation={[0,side*-.18,0]}>
                    <Block at={[0,0,0]} size={[.48,4.5+n*.24,.44]} color={n%2?palette.steel:palette.stone}/>
                    <Inlay at={[-side*.23,0,.24]} size={[.025,3.8+n*.24,.02]}/>
                </group>
                <Block at={[side*7.7,2.8,-21-n*1.8]} size={[.3,5.6,.18]} color={palette.steel}/>
            </group>)}
            <Block at={[side*5.9,.28,-26]} size={[1.4,.56,4.2]} color={palette.graphite}/>
            <Inlay at={[side*5.18,.2,-26]} size={[.02,.025,3.8]}/>
            <Downlight x={side*5.7} z={-25} intensity={65}/>
            <Inlay at={[side*7.6,4.9,-25]} size={[.03,.03,9]} cyan/>
            {/* Thin dark glass fins convey depth without costly transmission. */}
            <mesh ref={side===1?glass:undefined} position={[side*4.55,2.8,-29]} rotation={[0,side*.2,0]}>
                <boxGeometry args={[1.3,4.7,.055]}/><meshStandardMaterial color={palette.cyan} metalness={.65} roughness={.17} transparent opacity={.1} depthWrite={false}/>
            </mesh>
        </group>)}
        {!mobile && <Sign at={[0,4.75,-30.25]} width={4.6} title="THE PROCESSOR" subtitle="CORE / COLLECTION 01" center revealBelow={[-18,-21]} quietDuringInspection/>}
        {[0,1,2,3,4,5,6].map(i=><group key={i}>
            <Block at={[0,6.1,-20.5-i*1.5]} size={[13,.24,.42]} color={i%2?palette.stone:palette.steel}/>
            <Inlay at={[0,5.96,-20.5-i*1.5]} size={[i%2?4:9,.025,.06]}/>
        </group>)}
        {[-6,-3,0,3,6].map(x=><Inlay key={x} at={[x,.002,-25]} size={[.012,.008,11]}/>)}
        <ExhibitionPedestal reduced={reduced}/>
        {!mobile && <pointLight position={[0,5,-30]} color={palette.orange} intensity={28} distance={11}/>}
    </group>
}
