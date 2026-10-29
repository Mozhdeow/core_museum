import {expect,type Page} from '@playwright/test'
import {flush,visitor,cameraState} from './museum-visit-fixture'
export async function pose(page: Page, position: number[], target: number[]) {
    await flush(page)
    await page.evaluate(async ({position, target, visitor}) => {
        const t = '/node_modules/.vite/deps/three.js', n = '/src/features/museum/navigationState.ts', r = '/src/features/museum/visitRuntime.ts'
        const {Matrix4, Vector3, Quaternion} = await import(t), nav = (await import(n)).useMuseumNavigation.getState()
        const saved = JSON.parse(localStorage.getItem(`core-museum-visit:${visitor}`)!)
        const place = position[2] < -18 ? 'cpu' : position[2] < 2 ? 'corridor' : 'entrance'
        const rotation = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(new Vector3(...position), new Vector3(...target), new Vector3(0, 1, 0)))
        const runtime = (await import(r)).useVisitRuntime
        runtime.setState({intent: nav.intent})
        runtime.getState().stage({...saved, mode: 'explore', location: place, checkpoint: place, inspect: null, showcaseBay: undefined,
            pose: {position, quaternion: rotation.toArray()}})
    }, {position, target, visitor})
    await expect.poll(async () => (await cameraState(page)).phase,{timeout:12000}).toBe('ready')
    await expect.poll(async () => (await cameraState(page)).position[2]).toBeCloseTo(position[2], 2)
    await page.waitForTimeout(350)
}
export async function metrics(page: Page) {
    return page.evaluate(async () => {
        const f = '/node_modules/.vite/deps/@react-three_fiber.js', root = (await import(f))._roots.values().next().value.store.getState()
        const {gl, scene} = root, lights: Record<string, number> = {}, materials: Record<string, number> = {}
        scene.traverse((o: import('three').Object3D) => {
            if ('isLight' in o) lights[o.type] = (lights[o.type] ?? 0) + 1
            if ('material' in o) {const m = (o as import('three').Mesh).material; for (const item of Array.isArray(m) ? m : [m]) materials[item.type] = (materials[item.type] ?? 0) + 1}
        })
        const samples: {calls: number; triangles: number}[] = [], times:number[] = [], auto = gl.info.autoReset
        gl.info.autoReset = false
        for (let i = 0; i < 8; i++) {
            const start=performance.now()
            gl.info.reset(); await new Promise<void>(r => requestAnimationFrame(() => r()))
            times.push(performance.now()-start)
            samples.push({calls: gl.info.render.calls, triangles: gl.info.render.triangles})
        }
        gl.info.autoReset = auto
        const sorted = [...samples].sort((a, b) => a.calls - b.calls), middle = sorted[Math.floor(sorted.length / 2)]
        const context = gl.getContext(), shaderDiagnostics: unknown[] = []
        for (const p of gl.info.programs ?? []) {
            for (const shader of [p.vertexShader, p.fragmentShader]) {
                const log = context.getShaderInfoLog(shader)
                if (log?.trim()) shaderDiagnostics.push({log, source: context.getShaderSource(shader)?.split('\n').slice(195, 216)})
            }
        }
        return {...middle, frameMs:times.reduce((a,b)=>a+b,0)/times.length, memory: {...gl.info.memory}, lights, materials, shaderDiagnostics, dpr: gl.getPixelRatio(), samples,
            tier: gl.domElement.dataset.qualityTier ?? 'legacy', environment: Boolean(scene.environment), exposure: gl.toneMappingExposure}
    })
}

