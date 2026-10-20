import {useEffect, useMemo, useRef} from 'react'
import {useFrame, useThree} from '@react-three/fiber'
import {RoundedBox} from '@react-three/drei'
import {CanvasTexture, MathUtils, SRGBColorSpace, type Group, type PointLight} from 'three'

type XYZ = [number, number, number]

// Deterministic etched circuits; depth, reflections and illumination remain live 3D.
function circuitTexture(die: boolean) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 512
    const context = canvas.getContext('2d')!
    context.fillStyle = die ? '#5b2b08' : '#101217'
    context.fillRect(0, 0, 512, 512)
    let seed = die ? 87 : 32
    const random = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647
    }
    for (let i = 0; i < 260; i++) {
        const x = Math.floor(random() * 64) * 8, y = Math.floor(random() * 64) * 8
        const length = 8 + Math.floor(random() * 10) * 8
        context.strokeStyle = die ? (i % 3 ? '#ffbd53' : '#fff0bd') : (i % 4 ? '#795324' : '#cb8a39')
        context.lineWidth = i % 5 ? 1 : 2
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + length, y)
        context.lineTo(x + length + 12, y + 12);
        context.lineTo(x + length + 12, y + 30);
        context.stroke()
        context.fillStyle = context.strokeStyle;
        context.fillRect(x - 2, y - 2, 3, 3)
    }
    for (let x = 38; x < 490; x += 86) for (let y = 36; y < 490; y += 86) {
        context.fillStyle = die ? '#bb6b16' : '#181c22';
        context.fillRect(x, y, 49, 51)
        context.strokeStyle = die ? '#ffe29a' : '#bb8b48';
        context.strokeRect(x, y, 49, 51)
        for (let n = 5; n < 45; n += 5) context.strokeRect(x + n, y + 6, 1, 39)
    }
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4
    return texture
}

function Plate({position, size, color = '#292c32', glow = false}: {
    position: XYZ;
    size: XYZ;
    color?: string;
    glow?: boolean
}) {
    return <RoundedBox position={position} args={size} radius={Math.min(.09, size[1] * .28)} smoothness={2} castShadow
                       receiveShadow>
        <meshStandardMaterial color={color} metalness={glow ? .45 : .88} roughness={glow ? .24 : .29}
                              emissive={glow ? '#ff880c' : '#000000'} emissiveIntensity={glow ? 3 : 0}/>
    </RoundedBox>
}

function Bolts({y, x, z}: { y: number; x: number; z: number }) {
    return <>{[-x, x].flatMap(px => [-z, z].map(pz => <group key={`${px}:${pz}`} position={[px, y, pz]}>
        <mesh castShadow>
            <cylinderGeometry args={[.09, .09, .06, 12]}/>
            <meshStandardMaterial color="#76777a" metalness={1} roughness={.23}/>
        </mesh>
        <mesh position={[0, .032, 0]}>
            <boxGeometry args={[.10, .006, .018]}/>
            <meshStandardMaterial color="#090a0d"/>
        </mesh>
    </group>))}</>
}

export function CoreEngine({
                        active,
                        reduced,
                        interactive,
                        scoped = false,
                    }: {
    active: boolean
    reduced: boolean
    interactive: boolean
    /** Museum hover is confined to this model; Landing retains its Canvas parallax. */
    scoped?: boolean
}) {
    const root = useRef<Group>(null)
    const light = useRef<PointLight>(null)
    const elapsed = useRef(0)
    const hovering = useRef(false)
    const targetRotation = useRef({x: 0, y: 0})
    const {gl} = useThree()

    const board = useMemo(() => circuitTexture(false), [])
    const die = useMemo(() => circuitTexture(true), [])

    // StrictMode replays effects without remounting the R3F resources. Defer final disposal.
    const lifetime = useRef({generation:0})
    useEffect(() => {
        const lifecycle=lifetime.current,ticket=++lifecycle.generation
        return () => {queueMicrotask(() => {
            if (ticket === lifecycle.generation) {board.dispose(); die.dispose()}
        })}
    }, [board, die])

    /*
     * Desktop pointer interaction.
     *
     * Horizontal mouse travel gives restrained parallax.
     * Keep the front-facing composition stable while
     * the monitor itself is moving through the scroll scene.
     *
     * Vertical travel is intentionally restrained to
     * keep the product presentation premium.
     */
    useEffect(() => {
        if (!interactive || reduced || scoped) {
            hovering.current = false
            targetRotation.current.x = 0
            targetRotation.current.y = 0
            return
        }

        const element = gl.domElement

        const handlePointerMove = (event: PointerEvent) => {
            if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return

            const rect = element.getBoundingClientRect()
            if (!rect.width || !rect.height) return

            const normalizedX =
                ((event.clientX - rect.left) / rect.width) * 2 - 1

            const normalizedY =
                ((event.clientY - rect.top) / rect.height) * 2 - 1

            hovering.current = event.buttons===0
            targetRotation.current.y = MathUtils.clamp(normalizedX,-1,1) * .28
            targetRotation.current.x = -MathUtils.clamp(normalizedY,-1,1) * .12
        }

        const handlePointerEnter = () => {
            hovering.current = true
        }

        const handlePointerLeave = () => {
            hovering.current = false
        }

        element.addEventListener('pointermove', handlePointerMove)
        element.addEventListener('pointerenter', handlePointerEnter)
        element.addEventListener('pointerleave', handlePointerLeave)

        return () => {
            element.removeEventListener('pointermove', handlePointerMove)
            element.removeEventListener('pointerenter', handlePointerEnter)
            element.removeEventListener('pointerleave', handlePointerLeave)
        }
    }, [gl, interactive, reduced, scoped])

    useFrame((_, delta) => {
        if ((!active && !(scoped&&interactive)) || reduced || document.hidden || !root.current) return

        if(active)elapsed.current += Math.min(delta, .05)
        const time = elapsed.current

        if (!reduced) {
            const idleY = Math.sin(time * .16) * .10
            const idleX = Math.sin(time * .22) * .025

            const targetY =
                hovering.current && interactive
                    ? targetRotation.current.y
                    : idleY

            const targetX =
                hovering.current && interactive
                    ? targetRotation.current.x
                    : idleX

            /*
             * Damp yaw using the shortest angular route.
             * This prevents ugly snaps around +/-PI.
             */
            const angleDelta =
                Math.atan2(
                    Math.sin(targetY - root.current.rotation.y),
                    Math.cos(targetY - root.current.rotation.y),
                )

            const angularBlend =
                1 - Math.exp(-6.5 * Math.min(delta, .05))

            root.current.rotation.y +=
                angleDelta * angularBlend

            root.current.rotation.x =
                MathUtils.damp(
                    root.current.rotation.x,
                    targetX,
                    6.5,
                    delta,
                )

            root.current.position.y =
                Math.sin(time * .6) * .045
        }

        if (light.current) {
            light.current.intensity =
                5 + Math.sin(time * .8) * .6
        }
    })
    return <group ref={root} name="shared-core-identity"
        onPointerMove={scoped ? event=>{
            if(!interactive||reduced||event.buttons||!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return
            const point=root.current?.worldToLocal(event.point.clone())
            if(!point)return
            hovering.current=true
            targetRotation.current={x:-MathUtils.clamp(point.y/1.5,-1,1)*.22,y:MathUtils.clamp(point.x/2,-1,1)*.65}
        }:undefined}
        onPointerOut={scoped?()=>{hovering.current=false}:undefined}>
        <Plate position={[0, -.98, 0]} size={[3.55, .57, 2.95]}/>
        <Plate position={[0, -.7, 0]} size={[3.6, .055, 3]} glow/>
        <Plate position={[0, -.57, 0]} size={[3.78, .2, 3.16]} color="#44464b"/>
        <Plate position={[0, -.29, 0]} size={[4.04, .13, 3.45]} color="#111318"/>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.217, 0]} receiveShadow>
            <planeGeometry args={[3.94, 3.35]}/>
            <meshStandardMaterial map={board} metalness={.72} roughness={.35}/>
        </mesh>
        <Plate position={[0, -.05, 0]} size={[2.9, .22, 2.55]} color="#414349"/>
        <Plate position={[0, .08, 0]} size={[2.57, .08, 2.2]} glow/>
        <Plate position={[0, .21, 0]} size={[2.9, .20, 2.55]}/>
        <Plate position={[0, .35, 0]} size={[2.39, .10, 2.02]} color="#0c0d10"/>
        <Plate position={[0, .49, 0]} size={[1.96, .18, 1.65]} color="#ffad3c" glow/>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .587, 0]}>
            <planeGeometry args={[1.88, 1.57]}/>
            <meshStandardMaterial map={die} emissiveMap={die}
                                  emissive="#ffb855" emissiveIntensity={1.6} color="#ffd994" metalness={.55}
                                  roughness={.24}/>
        </mesh>
        <Plate position={[0, 1.62, 0]} size={[2.9, .22, 2.49]} color="#505156"/>
        <Plate position={[0, 1.75, 0]} size={[2.37, .055, 2.04]} color="#17191e"/>
        {[-1, 1].map(side => <group key={side}>
            <Plate position={[side * 1.41, 1.58, 0]} size={[.035, .045, 1.83]} glow/>
            <Plate position={[0, 1.60, side * 1.2]} size={[2.3, .035, .025]} glow/>
        </group>)}
        <Bolts y={1.758} x={1.27} z={1.06}/><Bolts y={.34} x={1.27} z={1.07}/><Bolts y={-.445} x={1.67} z={1.37}/>
        {[-1, 1].flatMap(x => [-1, 1].map(z => <group key={`${x}:${z}`}>
            <mesh position={[x * 1.72, -.54, z * 1.4]} castShadow>
                <cylinderGeometry args={[.08, .1, .36, 12]}/>
                <meshStandardMaterial color="#aa7e43" metalness={.9} roughness={.3}/>
            </mesh>
            <mesh position={[x * .93, 1.06, z * .77]}>
                <cylinderGeometry args={[.005, .005, .91, 5]}/>
                <meshBasicMaterial color="#e9a53d" transparent opacity={.4}/>
            </mesh>
        </group>))}
        {[-1, 1].flatMap(side => [-.87, .87].map(z => <group key={`${side}:${z}`} position={[side * 2.04, .37, z]}>
            <Plate position={[0, 0, 0]} size={[.14, .91, 1.27]} color="#393c42"/>
            <Plate position={[side * .09, .02, 0]} size={[.055, .63, 1.07]} color="#181b20"/>
            <Plate position={[0, -.4, 0]} size={[.20, .04, 1.19]} glow/>
            {[-.3, -.18, -.06].map(pz => <mesh key={pz} position={[side * .123, .22, pz]}>
                <boxGeometry args={[.01, .026, .05]}/>
                <meshStandardMaterial color="#66d7dc" emissive="#2dc4d2" emissiveIntensity={2}/>
            </mesh>)}
        </group>))}
        {Array.from({length: 25}, (_, i) => <mesh key={i} position={[-1.54 + i * .128, -.98, 1.49]} castShadow>
            <boxGeometry args={[.045, .46, .065]}/>
            <meshStandardMaterial color="#383b40" metalness={.9} roughness={.3}/>
        </mesh>)}
        {[-1, 1].flatMap(side => Array.from({length: 9}, (_, i) => <group key={`${side}:${i}`}
                                                                          position={[-1.55 + i * .38, -.12, side * 1.48]}>
            <mesh castShadow>
                <boxGeometry args={[.2, .11, .19]}/>
                <meshStandardMaterial color="#13161a" metalness={.65} roughness={.33}/>
            </mesh>
            <mesh position={[0, .06, 0]}>
                <boxGeometry args={[.1, .015, .08]}/>
                <meshStandardMaterial color="#88847b" metalness={.8} roughness={.4}/>
            </mesh>
        </group>))}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.48, 0]}>
            <torusGeometry args={[2.7, .007, 5, 100, Math.PI * 1.72]}/>
            <meshStandardMaterial color="#e7ad5c" emissive="#ff9a21" emissiveIntensity={1.4}/>
        </mesh>
        <pointLight ref={light} position={[0, .95, 0]} color="#ffae43" intensity={5} distance={4} decay={2}/>
    </group>
}

