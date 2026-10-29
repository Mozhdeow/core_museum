import {useEffect, useMemo, useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import {BufferGeometry, Float32BufferAttribute, Matrix4, Quaternion, Euler, Vector3, PlaneGeometry, AdditiveBlending, type Points} from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import {useMuseumQuality} from './useMuseumQuality'
import {museumQuality} from './museumQuality'
import {useMuseumVisualResources} from './MuseumVisualResources'
import {entranceBayMap} from './entranceBayMap'

const fixtures = [[-5.9, 5.75, 6.5], [-5.9, 5.75, 11.5], [5.9, 5.75, 6.5], [5.9, 5.75, 11.5], [0, 4.3, -1], [0, 4.3, -9], [0, 4.3, -17]]
type Triple = [number, number, number]
export function MuseumAtmosphere({reduced}: {reduced: boolean}) {
    const tier = useMuseumQuality(s => s.tier), effects=useMuseumQuality(s=>s.effects), resources = useMuseumVisualResources(), dust = useRef<Points>(null)
    const count = reduced || effects>0 ? 0 : Math.min(12,museumQuality[tier].dust)
    const geometry = useMemo(() => {
        const shadows: BufferGeometry[] = [], pools: BufferGeometry[] = []
        const plane = (list: BufferGeometry[], at: Triple, size: [number, number], rotation: Triple) => list.push(new PlaneGeometry(...size).applyMatrix4(
            new Matrix4().compose(new Vector3(...at), new Quaternion().setFromEuler(new Euler(...rotation)), new Vector3(1, 1, 1))))
        for (const side of [-1, 1]) {
            for (const {z} of entranceBayMap.filter(b=>Math.sign(b.x)===side)) {
                plane(shadows, [side * 6.12, -.005, z], [1.75, 2.1], [-Math.PI / 2, 0, 0])
                plane(pools, [side * 6.12, -.004, z], [2.3, 2.6], [-Math.PI / 2, 0, 0])
            }
            plane(shadows, [side * 6.6, -.003, 10.5], [1.2, 18], [-Math.PI / 2, 0, 0])
            plane(pools, [side * 6.74, 4.9, 10.5], [18, 1.4], [0, -side * Math.PI / 2, 0])
            plane(shadows, [side * 3.4, -.002, -8], [.9, 22], [-Math.PI / 2, 0, 0])
            plane(shadows, [side * 6.78, 5.8, 10.5], [18, 1.4], [0, -side * Math.PI / 2, 0])
            plane(pools, [side * 2.7, -.001, -8], [1.1, 22], [-Math.PI / 2, 0, 0])
        }
        // No front-facing circular pool across the CPU portal.
        const merged = {ao: mergeGeometries(shadows)!, pool: mergeGeometries(pools)!}
        ;[...shadows, ...pools].forEach(g => g.dispose())
        return merged
    }, [])
    const particles = useMemo(() => {
        const positions = new Float32Array(12 * 3)
        for (let i = 0; i < 12; i++) {
            const [x, y, z] = fixtures[i % fixtures.length], h = (i * .61803398875 % 1) * 1.8 + .2
            positions.set([x + Math.sin(i * 24.3) * h * .15, y - h, z + Math.cos(i * 8.2) * h * .15], i * 3)
        }
        return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(positions, 3))
    }, [])
    useEffect(()=>{particles.setDrawRange(0,count)},[particles,count])
    useEffect(() => () => {Object.values(geometry).forEach(g => g.dispose())}, [geometry])
    useEffect(() => () => particles.dispose(), [particles])
    useFrame((_, dt) => {
        const nav = useMuseumNavigation.getState()
        if (!count || reduced || document.hidden || nav.atmospherePaused || nav.overlay || nav.mode === 'inspect' || nav.mode === 'guided' && !nav.playing && nav.progress > .01) return
        const p = particles.getAttribute('position')
        for (let i = 0; i < count; i++) {
            const [x,top,z] = fixtures[i % fixtures.length], y = p.getY(i) - Math.min(dt, .05) * .014
            const next = y < top - 2 ? top - .2 : y, h = top - next
            p.setXYZ(i, x + Math.sin(i * 24.3) * h * .15, next, z + Math.cos(i * 8.2) * h * .15)
        }
        p.needsUpdate = true
    })
    return <group name="museum-soft-light-and-contact">
        <mesh name="museum-contact-ao" geometry={geometry.ao} material={resources.ao} dispose={null} renderOrder={1}/>
        <mesh visible={effects<2} name="museum-strip-light-pools" geometry={geometry.pool} material={resources.pool} dispose={null} renderOrder={2}/>
        <points visible={count>0} ref={dust} name="museum-confined-dust" geometry={particles} frustumCulled={false}>
            <pointsMaterial color="#ffb547" size={.012} transparent opacity={.24} depthWrite={false} sizeAttenuation blending={AdditiveBlending}/>
        </points>
    </group>
}
