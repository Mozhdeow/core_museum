import {createContext, useContext} from 'react'
import {BoxGeometry, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry,Shape,Path,ExtrudeGeometry} from 'three'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {museumSurfaceTextures} from './museumSurfaceTextures'

export function createMuseumVisualResources(anisotropy: number) {
    const textures = museumSurfaceTextures(anisotropy), plane = new PlaneGeometry(), box = new BoxGeometry()
    const plaque = new RoundedBoxGeometry(1.2,.5,.032,1,.012)
    const frames=new Map<string,ExtrudeGeometry>()
    const frameGeometry=(width:number,height:number)=>{
        const key=`${width}:${height}`,cached=frames.get(key);if(cached)return cached
        const shape=new Shape().moveTo(-width/2-.045,-height/2-.045);shape.lineTo(width/2+.045,-height/2-.045).lineTo(width/2+.045,height/2+.045).lineTo(-width/2-.045,height/2+.045).closePath();const hole=new Path().moveTo(-width/2+.012,-height/2+.012);hole.lineTo(-width/2+.012,height/2-.012).lineTo(width/2-.012,height/2-.012).lineTo(width/2-.012,-height/2+.012).closePath();shape.holes.push(hole)
        const geometry=new ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.009,bevelThickness:.006,curveSegments:1});frames.set(key,geometry);return geometry
    }
    const frame = new MeshStandardMaterial({color: '#39332b', metalness: .8, roughness: .37,
        roughnessMap: textures.brushed, envMapIntensity: .45})
    const backing = new MeshStandardMaterial({color: '#171717', metalness: .25, roughness: .68, roughnessMap: textures.roughness})
    const glass = new MeshStandardMaterial({color: '#c0b3a0', metalness: 1, roughness: .2, transparent: true,
        opacity: .12, depthWrite: false, envMapIntensity: 1.3})
    glass.onBeforeCompile = shader => {shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
        'diffuseColor.a=mix(.025,.22,pow(1.-abs(dot(normal,normalize(vViewPosition))),3.));\n#include <opaque_fragment>')}
    glass.customProgramCacheKey = () => 'museum-fresnel-glass-1'
    const ao = new MeshBasicMaterial({map: textures.ao, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1})
    const pool = new MeshBasicMaterial({map: textures.pool, transparent: true, depthWrite: false, toneMapped: false})
    return {textures, plane, box, plaque, frame, frameGeometry, backing, glass, ao, pool,
        dispose() {textures.dispose(); plane.dispose(); box.dispose(); plaque.dispose();frames.forEach(g=>g.dispose()); [frame, backing, glass, ao, pool].forEach(m => m.dispose())}}
}
export const MuseumVisualResources = createContext<ReturnType<typeof createMuseumVisualResources> | null>(null)
export function useMuseumVisualResources() {
    const resources = useContext(MuseumVisualResources)
    if (!resources) throw new Error('Museum visual resources must have a museum owner')
    return resources
}
