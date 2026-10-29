import {useEffect, useMemo, type ReactNode} from 'react'
import {BoxGeometry, MeshStandardMaterial, MeshBasicMaterial} from 'three'
import {ArchitectureResources} from './architectureResources'
import {MuseumVisualResources, createMuseumVisualResources} from './MuseumVisualResources'
import {useThree} from '@react-three/fiber'

/** One scene owner disposes architecture resources, never shared GLTF resources. */
export function MuseumResources({children}: {children: ReactNode}) {
    const limit = useThree(s=>s.gl.capabilities.getMaxAnisotropy())
    const visual = useMemo(() => createMuseumVisualResources(Math.min(limit,8)), [limit])
    const resources=useMemo(()=>({box:new BoxGeometry(),metals:new Map<string,MeshStandardMaterial>(),lights:new Map<string,MeshBasicMaterial>(),visual}),[visual])
    useEffect(()=>()=>{resources.box.dispose();resources.metals.forEach(m=>m.dispose());resources.lights.forEach(m=>m.dispose())},[resources])
    useEffect(() => () => visual.dispose(), [visual])
    return <MuseumVisualResources.Provider value={visual}><ArchitectureResources.Provider value={resources}>{children}</ArchitectureResources.Provider></MuseumVisualResources.Provider>
}
