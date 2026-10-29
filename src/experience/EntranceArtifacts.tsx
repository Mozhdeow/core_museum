import {useEffect, useMemo} from 'react'
import {BoxGeometry, Matrix4, Vector3, Quaternion, MeshStandardMaterial, MeshBasicMaterial, type BufferGeometry} from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {hardwarePreviewGeometry} from './hardwarePreviewGeometry'
import {Block} from './MuseumPrimitives'
import {useMuseumVisualResources} from './MuseumVisualResources'
import {useMuseumQuality} from './useMuseumQuality'

type Triple = [number, number, number]
export type EntrancePart = {at: Triple; size: Triple}
/** One draw per finish, including all repeated mullions, trim and display-case frames. */
export function EntranceBatch({parts, color, luminous = false, name}: {
    parts: EntrancePart[]; color: string; luminous?: boolean; name: string
}) {
    const visual = useMuseumVisualResources()
    const geometry = useMemo(() => {
        const pieces = parts.map(({at, size}) => new BoxGeometry(1, 1, 1).applyMatrix4(
            new Matrix4().compose(new Vector3(...at), new Quaternion(), new Vector3(...size))))
        const merged = mergeGeometries(pieces)!
        pieces.forEach(part => part.dispose())
        return merged
    }, [parts])
    const material = useMemo(() => {
        if(luminous){const material=new MeshBasicMaterial({color,toneMapped:false});return material}
        return new MeshStandardMaterial({color, metalness: .45, roughness: .6, roughnessMap: visual.textures.brushed,
            bumpMap: visual.textures.brushed, bumpScale: .004, envMapIntensity: .7})
    }, [color, luminous, visual])
    useEffect(() => () => geometry.dispose(), [geometry])
    useEffect(() => () => material.dispose(), [material])
    return <mesh name={name} geometry={geometry} material={material} dispose={null}/>
}

export type EntranceArtifactKind = 'gpu' | 'memory' | 'motherboard' | 'hdd' | 'cpu' | 'terminal'
const finishes = ['#243a31', '#111619', '#8e9290', '#495056', '#c99b4e']
function VintageTerminal() {
    return <group scale={.65}>
        <Block at={[0, .19, 0]} size={[1.05, .86, .65]} color="#c2b394" metal={.15}/>
        <Block at={[0, .2, .335]} size={[.83, .61, .025]} color="#1a2121" metal={.1}/>
        <Block at={[0, .2, .352]} size={[.72, .5, .012]} color="#314d43" metal={.1}/>
        <Block at={[0, -.4, .14]} size={[1.18, .25, .99]} color="#afa38d" metal={.15}/>
        <Block at={[0, -.26, .53]} size={[.95, .025, .32]} color="#514d44"/>
        {Array.from({length: 5}, (_, i) => <Block key={i} at={[0, -.24, .42 + i * .054]} size={[.84, .012, .023]} color="#d0c6ae"/>)}
        <Block at={[-.12, .1, .365]} size={[.39, .012, .008]} color="#a7bd9b"/>
    </group>
}
export function EntranceArtifact({kind}: {kind: EntranceArtifactKind}) {
    const visual = useMuseumVisualResources(), tier = useMuseumQuality(s => s.tier)
    const geometry = useMemo((): (BufferGeometry | null)[] => {
        if (kind === 'cpu' || kind === 'terminal') return []
        return hardwarePreviewGeometry(kind, tier !== 'low')
    }, [kind,tier])
    const materials = useMemo(() => finishes.map((color, i) => new MeshStandardMaterial({color,
        metalness: i > 1 ? .8 : .2, roughness: i === 4 ? .24 : .5,
        roughnessMap: i > 1 ? visual.textures.brushed : visual.textures.roughness,
        map: i === 1 ? visual.textures.chip : null, envMapIntensity: i > 1 ? .75 : .25})), [visual])
    const pins = useMemo(() => [-1, 1].flatMap(side => Array.from({length: 10}, (_, i) => [
        {at: [side * .38, -.28 + i * .062, 0] as Triple, size: [.12, .025, .025] as Triple},
        {at: [-.28 + i * .062, side * .38, 0] as Triple, size: [.025, .12, .025] as Triple},
    ]).flat()), [])
    useEffect(() => () => geometry.forEach(part => part?.dispose()), [geometry])
    useEffect(() => () => materials.forEach(part => part.dispose()), [materials])
    if (kind === 'terminal') return <VintageTerminal/>
    if (kind === 'cpu') return <group rotation={[-.22, .1, .08]}>
        <Block at={[0, 0, 0]} size={[.66, .66, .1]} color="#333129"/>
        <Block at={[0, 0, .065]} size={[.53, .53, .045]} color="#b8a56f"/>
        <Block at={[0, 0, .094]} size={[.24, .24, .012]} color="#393e41"/>
        <EntranceBatch parts={pins} color="#c99b4e" name="prototype-cpu-contacts"/>
    </group>
    return <group rotation={[-.15, -.12, kind === 'memory' ? -.28 : .04]} scale={kind === 'memory' ? .62 : .66}>
        {geometry.map((part, i) => part && <mesh key={i} geometry={part} material={materials[i]} dispose={null}/>)}
    </group>
}
