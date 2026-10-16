import {Box3, Sphere, Vector3, type Object3D} from 'three'

export function fitMuseumModel(object: Object3D) {
    object.updateMatrixWorld(true)
    const box = new Box3().setFromObject(object, true)
    const sphere = box.getBoundingSphere(new Sphere())
    const size = box.getSize(new Vector3())
    if (box.isEmpty() || ![sphere.radius, size.x, size.y, size.z, ...sphere.center.toArray()].every(Number.isFinite) || sphere.radius <= 0) {
        throw new Error('The model has no usable finite bounds')
    }
    const scale = 1.65 / sphere.radius
    if (!Number.isFinite(scale)) throw new Error('The model cannot be framed safely')
    return {scale, position: sphere.center.multiplyScalar(-scale).toArray() as [number, number, number]}
}
export function supportedModelUrl(url: string) {
    try {return ['https:', 'http:'].includes(new URL(url).protocol)} catch {return false}
}
