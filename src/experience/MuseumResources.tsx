import {useEffect, useMemo, type ReactNode} from 'react'
import {BoxGeometry, MeshStandardMaterial, MeshBasicMaterial} from 'three'
import {ArchitectureResources} from './architectureResources'

/** One scene owner disposes architecture resources, never shared GLTF resources. */
export function MuseumResources({children}: {children: ReactNode}) {
    const resources=useMemo(()=>({box:new BoxGeometry(),metals:new Map<string,MeshStandardMaterial>(),lights:new Map<string,MeshBasicMaterial>()}),[])
    useEffect(()=>()=>{resources.box.dispose();resources.metals.forEach(m=>m.dispose());resources.lights.forEach(m=>m.dispose())},[resources])
    return <ArchitectureResources.Provider value={resources}>{children}</ArchitectureResources.Provider>
}
