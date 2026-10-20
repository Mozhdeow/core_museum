import {Box3, Sphere, Vector3, Mesh,Group,DoubleSide,Quaternion,Euler,type Material, type Object3D,type BufferGeometry} from 'three'
import type {ExhibitPresentation} from './exhibitModelPresentation.ts'

export const PEDESTAL_MODEL_BOUNDS={width:2.8,height:2.3,depth:2.4,radius:1.5} as const
export const EXHIBIT_BASE_Y=1.35
/** Display both faces during a full orbit; never mutate the loader's cached materials. */
export function exhibitMaterials(object:Object3D){
    const copies=new Map<Material,Material>()
    const copy=(source:Material)=>{let material=copies.get(source);if(!material){material=source.clone();material.side=DoubleSide;copies.set(source,material)}return material}
    object.traverse(node=>{if(node instanceof Mesh)node.material=Array.isArray(node.material)?node.material.map(copy):copy(node.material)})
    return [...copies.values()]
}
export function inspectionFraming(radius:number,aspect:number,fov:number){
    const vertical=fov*Math.PI/360,horizontal=Math.atan(Math.tan(vertical)*aspect)
    const near=Math.max(3.4,radius/Math.sin(Math.min(vertical,horizontal)) *1.08)
    return {near,home:Math.max(near,Math.min(9,near*1.3)),far:Math.max(10,near*1.8)}
}
/** Ignore hidden, transparent, empty and helper-only geometry before claiming readiness. */
export function visibleModelBounds(object:Object3D){
    object.updateMatrixWorld(true)
    const bounds=new Box3()
    object.traverseVisible(node=>{
        if(!(node instanceof Mesh)||!(node.layers.mask&1))return
        const geometry=node.geometry as BufferGeometry,position=geometry.getAttribute('position')
        const materials=Array.isArray(node.material)?node.material:[node.material]
        if(!position||position.count<3||geometry.drawRange.count<3||!materials.some(m=>m.visible&&(!m.transparent||m.opacity>.001)))return
        const count=geometry.index?.count??position.count
        if(count<3)return
        // All used coordinates must be finite; degenerate triangles are not a visible exhibit.
        const a=new Vector3(),b=new Vector3(),c=new Vector3(),edge1=new Vector3(),edge2=new Vector3()
        const start=Math.max(0,geometry.drawRange.start),end=Math.min(count,start+geometry.drawRange.count)
        for(let i=start;i+2<end;i+=3){
            if(Array.isArray(node.material)){
                const group=geometry.groups.find(g=>i>=g.start&&i<g.start+g.count),material=group?node.material[group.materialIndex??0]:undefined
                if(!material?.visible||material.transparent&&material.opacity<=.001)continue
            }
            node.getVertexPosition(geometry.index?.getX(i)??i,a);node.getVertexPosition(geometry.index?.getX(i+1)??i+1,b);node.getVertexPosition(geometry.index?.getX(i+2)??i+2,c)
            if(![...a.toArray(),...b.toArray(),...c.toArray()].every(Number.isFinite))throw new Error('Model contains non-finite geometry')
            if(edge1.subVectors(b,a).cross(edge2.subVectors(c,a)).lengthSq()>0){bounds.expandByPoint(a.applyMatrix4(node.matrixWorld));bounds.expandByPoint(b.applyMatrix4(node.matrixWorld));bounds.expandByPoint(c.applyMatrix4(node.matrixWorld))}
        }
    })
    if(bounds.isEmpty())throw new Error('Model has no visible renderable surface')
    return bounds
}
export function prepareExhibitModel(object:Object3D,limits:{width:number;height:number;depth:number;radius:number},calibration:ExhibitPresentation={}){
    const presentation=new Group();presentation.add(object)
    const size=visibleModelBounds(presentation).getSize(new Vector3()),axes=[size.x,size.y,size.z],thin=axes.indexOf(Math.min(...axes))
    // Imported boards commonly lie flat in X/Z. Present their broad face toward the visitor,
    // deriving orientation from geometry rather than category names or changing the asset.
    if(calibration.autoOrient!==false&&Math.min(...axes)<Math.max(...axes)*.6){
        if(thin===1)presentation.rotation.x=Math.PI/2
        if(thin===0)presentation.rotation.y=Math.PI/2
        const upright=visibleModelBounds(presentation).getSize(new Vector3())
        // Rotate around WORLD Z. Adding Euler Z after X rotates around the source's local
        // plane instead and turns a tall flat board back into a thin vertical strip.
        if(upright.y>upright.x)presentation.quaternion.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0,0,1),Math.PI/2))
    }
    if(calibration.rotation){
        if(!calibration.rotation.every(Number.isFinite))throw new Error('Invalid presentation rotation')
        presentation.quaternion.premultiply(new Quaternion().setFromEuler(new Euler(...calibration.rotation)))
    }
    const framed=fitMuseumModel(presentation,limits),fraction=Math.max(.25,Math.min(1,Number.isFinite(calibration.scale)?calibration.scale!:1))
    return {object:presentation,...framed,scale:framed.scale*fraction,radius:framed.radius*fraction,height:framed.height*fraction,position:framed.position.map(v=>v*fraction) as [number,number,number]}
}
export function fitMuseumModel(object: Object3D, limits?:{width:number;height:number;depth:number;radius:number}) {
    object.updateMatrixWorld(true)
    const box = visibleModelBounds(object)
    const sphere = box.getBoundingSphere(new Sphere())
    const size = box.getSize(new Vector3())
    if (box.isEmpty() || ![sphere.radius, size.x, size.y, size.z, ...sphere.center.toArray()].every(Number.isFinite) || sphere.radius <= 0) {
        throw new Error('The model has no usable finite bounds')
    }
    const scale = limits?Math.min(limits.radius/sphere.radius,limits.width/size.x,limits.height/size.y,limits.depth/size.z):1.65/sphere.radius
    if (!Number.isFinite(scale)) throw new Error('The model cannot be framed safely')
    return {scale,radius:sphere.radius*scale, height:size.y*scale,position: sphere.center.multiplyScalar(-scale).toArray() as [number, number, number]}
}
export function supportedModelUrl(url: string) {
    try {return ['https:', 'http:'].includes(new URL(url).protocol)} catch {return false}
}
