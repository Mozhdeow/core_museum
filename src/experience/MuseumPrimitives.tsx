import {useEffect, useMemo, useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import {MeshBasicMaterial, MathUtils, Vector3, type SpotLight} from 'three'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import {CanvasTexture, SRGBColorSpace, Object3D} from 'three'
import {MeshReflectorMaterial} from '@react-three/drei'
import {useMuseumPalette} from './museumPalette'
import {useArchitecturalMaterial} from './architectureResources'
import {useMuseumVisualResources} from './MuseumVisualResources'
import {useMuseumQuality} from './useMuseumQuality'

type Triple = [number, number, number]

export function Block({at, size, color = '#22272b', metal = .55, roughness = .38}: {
    at: Triple;
    size: Triple;
    color?: string;
    metal?: number;
    roughness?: number
}) {
    const resources = useArchitecturalMaterial(color, metal, roughness)
    return <mesh name="museum-architecture-block" position={at} scale={size} geometry={resources.geometry} material={resources.material} dispose={null}/>
}

export function Inlay({at, size, cyan = false}: { at: Triple; size: Triple; cyan?: boolean }) {
    const palette = useMuseumPalette()
    const resources = useArchitecturalMaterial(cyan ? palette.cyan : palette.orange, 0, 0, true)
    return <mesh name="museum-architecture-inlay" position={at} scale={size} geometry={resources.geometry} material={resources.material} dispose={null}/>
}

export function Downlight({x, z, y = 5.9, intensity = 32}: { x: number; z: number; y?: number; intensity?: number }) {
    const light = useRef<SpotLight>(null), world = useMemo(() => new Vector3(), []), tier = useMuseumQuality(s => s.tier)
    useFrame(({camera}) => {if (light.current) {light.current.getWorldPosition(world); light.current.intensity = intensity*(1-MathUtils.smoothstep(world.distanceTo(camera.position),tier==='low'?7:11,tier==='low'?9:15))}})
    const target = useMemo(() => {
        const node = new Object3D();
        node.position.set(x, 0, z);
        return node
    }, [x, z])
    return <>
        <primitive object={target}/>
        <spotLight ref={light} position={[x, y, z]} target={target} color="#f2d5ae" intensity={intensity} distance={13} angle={.65}
                   penumbra={.7}/>
    </>
}

export function Sign({
                         at,
                         width,
                         title,
                         subtitle,
                         rotation = 0,
                         fadeAfter,
                         revealBelow,
                         quietDuringInspection = false,
                         center = false
                     }: {
    at: Triple;
    width: number;
    title: string;
    subtitle: string;
    rotation?: number;
    fadeAfter?: [number, number];
    revealBelow?: [number, number];
    quietDuringInspection?: boolean;
    center?: boolean
}) {
    const palette = useMuseumPalette()
    const material = useRef<MeshBasicMaterial>(null)
    useFrame(({camera}) => {
        if (material.current) {
            const fade = fadeAfter ? MathUtils.smoothstep(camera.position.z, fadeAfter[1], fadeAfter[0]) : 1,
                reveal = revealBelow ? 1 - MathUtils.smoothstep(camera.position.z, revealBelow[1], revealBelow[0]) : 1;
            material.current.opacity = quietDuringInspection && useMuseumNavigation.getState().mode === 'inspect' ? 0 : fade * reveal
        }
    })
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256
        const c = canvas.getContext('2d')!
        c.clearRect(0, 0, 1024, 256)
        c.textAlign = center ? 'center' : 'left'
        c.direction = /[\u0600-\u06ff]/.test(title+subtitle) ? 'rtl' : 'ltr'
        c.fillStyle = palette.orange;
        let subtitleSize=28
        c.font = `500 ${subtitleSize}px "Vazirmatn", sans-serif`
        while(c.measureText(subtitle).width>980&&subtitleSize>14)c.font=`500 ${--subtitleSize}px "Vazirmatn", sans-serif`
        c.fillText(subtitle, center ? 512 : 8, 36,1000)
        c.fillStyle = palette.ink;
        const font=(px:number)=>`500 ${px}px "Space Grotesk", "Vazirmatn", sans-serif`
        let fontSize=88;c.font=font(fontSize)
        while(c.measureText(title).width>980&&fontSize>38)c.font=font(--fontSize)
        const words=title.split(/\s+/),lines:string[]=[];let line=''
        for(const word of words){const next=line?`${line} ${word}`:word;if(line&&c.measureText(next).width>980){lines.push(line);line=word}else line=next}
        if(line)lines.push(line)
        lines.slice(0,2).forEach((text,i)=>c.fillText(text,center?512:8,lines.length>1?106+i*64:150,1000))
        c.fillStyle = '#566166';
        c.fillRect(8, 208, 1000, 2)
        const map = new CanvasTexture(canvas);
        map.colorSpace = SRGBColorSpace
        return map
    }, [title, subtitle, palette, center])
    useEffect(() => () => texture.dispose(), [texture])
    return <mesh name={`museum-sign:${title}`} position={at} rotation={[0, rotation, 0]}>
        <planeGeometry args={[width, width / 4]}/>
        <meshBasicMaterial ref={material} map={texture} transparent depthWrite={false} toneMapped={false}/>
    </mesh>
}

export function PortalFrame({z, width = 6.8, height = 4.8, amber = false}: {
    z: number;
    width?: number;
    height?: number;
    amber?: boolean
}) {
    return <group>
        {[-1, 1].map(side => <group key={side}>
            <Block at={[side * width / 2, height / 2, z]} size={[.28, height, .48]} color="#33383c"/>
            {amber && <Inlay at={[side * (width / 2 - .16), height / 2, z + .25]} size={[.035, height - .3, .025]}/>}
        </group>)}
        <Block at={[0, height, z]} size={[width + .3, .32, .5]} color="#363b3e"/>
        {amber && <Inlay at={[0, height - .18, z + .25]} size={[width - .3, .035, .025]}/>}
    </group>
}

export function Floor({at, size, reflective = false}: { at: Triple; size: [number, number]; reflective?: boolean }) {
    const resources = useMuseumVisualResources()
    return <mesh rotation={[-Math.PI / 2, 0, 0]} position={at}>
        <planeGeometry args={size}/>
        {reflective ?
            <MeshReflectorMaterial resolution={256} blur={[100, 35]} mixBlur={.75} mixStrength={.3} mirror={.12}
                                   color="#30363b" metalness={.5} roughness={.48} depthScale={.15}
                                   minDepthThreshold={.4} maxDepthThreshold={1.4}/>
            : <meshStandardMaterial color="#45443f" map={resources.textures.stone} roughnessMap={resources.textures.roughness} metalness={.2} roughness={.46} envMapIntensity={.5}/>}
    </mesh>
}


