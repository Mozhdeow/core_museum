import {useLayoutEffect, useRef, type ReactNode} from 'react'
import {Group, Mesh, Matrix4, type BufferGeometry, type Material} from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'

/** Batch only the explicitly scoped static architecture; never uploaded, moving or CPU lesson geometry. */
export function StaticMuseumBatch({children}: {children: ReactNode}) {
    const root = useRef<Group>(null)
    useLayoutEffect(() => {
        const started=performance.now(),group = root.current!; group.updateWorldMatrix(true, true)
        const inverse = new Matrix4().copy(group.matrixWorld).invert(), batches = new Map<Material, BufferGeometry[]>(), originals: Mesh[] = []
        group.traverse(object => {
            if (!(object instanceof Mesh) || !['museum-architecture-block', 'museum-architecture-inlay'].includes(object.name)) return
            let parent = object.parent
            while (parent && parent !== group) {if (parent.userData.dynamic) return; parent = parent.parent}
            const material = object.material as Material
            const geometry = object.geometry.clone().applyMatrix4(new Matrix4().multiplyMatrices(inverse, object.matrixWorld))
            const parts = batches.get(material) ?? []; parts.push(geometry); batches.set(material, parts)
            originals.push(object); object.visible = false
        })
        const merged = [...batches].map(([material, parts]) => {
            const mesh = new Mesh(mergeGeometries(parts)!, material); mesh.name = 'static-architecture-finish'
            parts.forEach(g => g.dispose()); group.add(mesh); return mesh
        })
        if(import.meta.env.DEV){group.userData.batchBuilds=(group.userData.batchBuilds??0)+1;group.userData.batchMs=performance.now()-started}
        return () => {merged.forEach(m => {group.remove(m); m.geometry.dispose()}); originals.forEach(m => {m.visible = true})}
    }, [children])
    return <group name="batched-static-passage" ref={root}>{children}</group>
}
