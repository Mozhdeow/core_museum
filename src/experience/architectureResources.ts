import {createContext, useContext, useMemo} from 'react'
import {BoxGeometry, MeshStandardMaterial, MeshBasicMaterial} from 'three'
import type {createMuseumVisualResources} from './MuseumVisualResources'

export const ArchitectureResources = createContext<{
    box: BoxGeometry; metals: Map<string, MeshStandardMaterial>; lights: Map<string, MeshBasicMaterial>; visual: ReturnType<typeof createMuseumVisualResources>
} | null>(null)

export function useArchitecturalMaterial(color: string, metal: number, roughness: number, luminous = false) {
    const resources = useContext(ArchitectureResources)
    if (!resources) throw new Error('Museum architecture requires MuseumResources')
    const material = useMemo(() => {
        if (luminous) {
            if (!resources.lights.has(color)) resources.lights.set(color, new MeshBasicMaterial({
                color,
                toneMapped: false
            }))
            return resources.lights.get(color)!
        }
        const key = `${color}:${metal}:${roughness}`
        if (!resources.metals.has(key)) resources.metals.set(key, new MeshStandardMaterial({
            color,
            metalness: metal,
            roughness: Math.max(.3, roughness),
            roughnessMap: metal > .4 ? resources.visual.textures.brushed : resources.visual.textures.roughness,
            bumpMap: resources.visual.textures.brushed, bumpScale: .006, envMapIntensity: metal > .4 ? .4 : .18,
        }))
        return resources.metals.get(key)!
    }, [resources, color, metal, roughness, luminous])
    return {geometry: resources.box, material}
}
