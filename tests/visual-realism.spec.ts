import {test, expect, type Page} from '@playwright/test'
import {writeFile, mkdir} from 'node:fs/promises'
import {visitFixture, cameraState, flush, visitor} from './museum-visit-fixture'

const stage = process.env.VISUAL_PASS_STAGE ?? 'after', folder = 'docs/museum/visual-pass'
test('floor diagnostic isolates reflection and direct specular', async ({page}) => {
    test.skip(stage !== 'diagnostic')
    await visitFixture(page); await expect.poll(async () => (await cameraState(page)).phase).toBe('ready')
    await pose(page, [0, 1.72, 15.5], [4, .1, 10])
    await page.screenshot({path: `${folder}/diagnostic-floor.png`})
    await page.evaluate(async () => {const f = '/node_modules/.vite/deps/@react-three_fiber.js', s = (await import(f))._roots.values().next().value.store.getState().scene; s.traverse((o: import('three').Object3D) => {if (o.type === 'DirectionalLight') o.visible = false})})
    await page.screenshot({path: `${folder}/diagnostic-no-directional.png`})
    await page.evaluate(async () => {const f = '/node_modules/.vite/deps/@react-three_fiber.js', s = (await import(f))._roots.values().next().value.store.getState().scene; s.traverse((o: import('three').Object3D) => {if (o.type === 'DirectionalLight') o.visible = true}); const m = s.getObjectByName('entrance-floor:reflective').material; m.mixStrength = 0; m.mirror = 0})
    await page.screenshot({path: `${folder}/diagnostic-no-reflection.png`})
})
async function pose(page: Page, position: number[], target: number[]) {
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
    await expect.poll(async () => (await cameraState(page)).phase).toBe('ready')
    await expect.poll(async () => (await cameraState(page)).position[2]).toBeCloseTo(position[2], 2)
    await page.waitForTimeout(350)
}
async function metrics(page: Page) {
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

test('fixed desktop museum views and renderer audit', async ({page}) => {
    await mkdir(folder, {recursive: true})
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'hardwareConcurrency', {get: () => 16})
        Object.defineProperty(navigator, 'deviceMemory', {get: () => 8})
    })
    const errors: string[] = [], warnings: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', e => {if(e.type()==='error')errors.push(e.text());if(e.type()==='warning'&&!e.text().includes('THREE.Clock'))warnings.push(e.text())})
    await visitFixture(page)
    await expect.poll(async () => (await cameraState(page)).phase).toBe('ready')
    const views: [string, number[], number[]][] = [
        ['entrance', [0, 1.72, 15.5], [0, 1.72, 0]],
        ['hardware-panels', [2.3, 1.72, 12], [6.75, 3.3, 7.5]],
        ['portraits', [2.1, 1.72, 9.5], [5.1, 2.9, 3]],
        ['case', [4.5, 1.72, 10.4], [6.12, 1.9, 8.4]],
        ['passage', [0, 1.72, -9], [0, 2.2, -20]],
    ]
    const results: Record<string, unknown> = {}
    for (const [name, position, target] of views) {
        await pose(page, position, target)
        if(stage==='after'&&name==='case'){
            const point=await page.evaluate(async()=>{const f='/node_modules/.vite/deps/@react-three_fiber.js',t='/node_modules/.vite/deps/three.js';const r=(await import(f))._roots.values().next().value.store.getState(),{Vector3}=await import(t);const p=new Vector3(6.12,1.89,8.4).project(r.camera),b=r.gl.domElement.getBoundingClientRect();return {x:b.x+(p.x+1)*b.width/2,y:b.y+(1-p.y)*b.height/2}})
            await page.mouse.move(point.x,point.y);await page.waitForTimeout(1100)
        }
        await page.screenshot({path: `${folder}/${stage}-${name}.png`})
        results[name] = await metrics(page)
    }
    await writeFile(`${folder}/${stage}-desktop-metrics.json`, JSON.stringify(results, null, 2))
    await writeFile(`${folder}/${stage}-warnings.json`, JSON.stringify(warnings, null, 2))
    await expect(page.locator('canvas[data-camera-z]')).toHaveCount(1)
    expect(errors).toEqual([])
    if(stage==='after'){
        const baseline=JSON.parse(await (await import('node:fs/promises')).readFile(`${folder}/before-desktop-metrics.json`,'utf8'))
        for(const name of ['entrance','passage'])expect((results[name] as {calls:number}).calls).toBeLessThanOrEqual(baseline[name].calls*1.15)
    }
})

test.describe('low mobile audit', () => {
    test.use({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true})
    test('portrait and passage costs', async ({page}) => {
        await mkdir(folder, {recursive: true}); await visitFixture(page)
        await expect.poll(async () => (await cameraState(page)).phase).toBe('ready')
        await pose(page, [0, 1.72, 15.5], [0, 1.72, 0])
        const entrance = await metrics(page)
        await page.getByRole('button', {name: 'FA', exact: true}).click()
        await page.screenshot({path: `${folder}/${stage}-mobile-fa.png`})
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        await pose(page, [0, 1.72, -9], [0, 2.2, -20])
        const passage = await metrics(page)
        await writeFile(`${folder}/${stage}-low-metrics.json`, JSON.stringify({entrance, passage}, null, 2))
        if(stage==='after'){
            expect(entrance.tier).toBe('low');expect(passage.tier).toBe('low')
            const before=JSON.parse(await (await import('node:fs/promises')).readFile(`${folder}/before-low-metrics.json`,'utf8'))
            expect(entrance.calls).toBeLessThanOrEqual(before.entrance.calls);expect(passage.calls).toBeLessThanOrEqual(before.passage.calls)
            const toggle=page.getByRole('button',{name:'کنترل‌های حرکت',exact:true})
            await expect(toggle).toHaveAttribute('aria-expanded','false');await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true')
            await expect(page.getByRole('combobox',{name:'دسته‌ها',exact:true})).toBeVisible()
            for(const button of await page.locator('.museum-navigation button:visible').all()){const b=await button.boundingBox();expect(b!.height).toBeGreaterThanOrEqual(44)}
            await page.screenshot({path:`${folder}/after-mobile-details-fa.png`})
        }
    })
})

test('HUD, procedural motion, Inspect return and sixty-second walking memory',async({page})=>{
    test.skip(stage!=='after')
    test.setTimeout(150000)
    await page.addInitScript(()=>{Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4})})
    await visitFixture(page,{model:true});await expect.poll(async()=>(await cameraState(page)).phase).toBe('ready')
    await expect(page.getByRole('button',{name:'Navigation controls',exact:true})).toHaveAttribute('aria-expanded','false')
    await page.getByRole('button',{name:'Guided tour',exact:true}).click()
    await expect.poll(async()=>(await cameraState(page)).position[2]).toBeLessThan(14)
    await page.locator('canvas').focus();await page.keyboard.press('Space')
    await expect.poll(async()=>(await cameraState(page)).playing).toBe(false)
    await page.getByRole('button',{name:'Free Explore',exact:true}).click()
    await pose(page,[4.5,1.72,10.4],[6.12,1.9,8.4])
    const angle=()=>page.evaluate(async()=>{const f='/node_modules/.vite/deps/@react-three_fiber.js',s=(await import(f))._roots.values().next().value.store.getState().scene;return s.getObjectByName('environmental-prototype:motherboard').rotation.y})
    const start=await angle();await page.waitForTimeout(500);expect(Math.abs(await angle()-start)).toBeGreaterThan(.03)
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100)
    const frozen=await angle();await page.waitForTimeout(250);expect(await angle()).toBe(frozen)
    await page.emulateMedia({reducedMotion:'no-preference'})
    const returning=await cameraState(page)
    await expect(page.getByRole('button',{name:'Inspect selected model',exact:true})).toBeVisible()
    await page.getByRole('button',{name:'Inspect selected model',exact:true}).click()
    await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-inspection','active')
    const stopped=await angle();await page.waitForTimeout(250);expect(await angle()).toBe(stopped)
    await page.getByRole('button',{name:'Exit Inspect',exact:true}).click()
    await expect.poll(async()=>(await cameraState(page)).mode).toBe('explore')
    const restored=await cameraState(page)
    for(let i=0;i<3;i++)expect(restored.position[i]).toBeCloseTo(returning.position[i],1)
    for(let i=0;i<4;i++)expect(restored.quaternion[i]).toBeCloseTo(returning.quaternion[i],2)
    await pose(page,[0,1.72,14],[0,1.72,0])
    const before=await metrics(page)
    await page.evaluate(async()=>{
        const n='/src/features/museum/navigationState.ts',nav=(await import(n)).useMuseumNavigation
        const started=performance.now()
        try{while(performance.now()-started<60000){nav.getState().setMove(1);await new Promise(r=>setTimeout(r,1100));nav.getState().setMove(-1);await new Promise(r=>setTimeout(r,1100))}}
        finally{nav.getState().setMove(0)}
    })
    const after=await metrics(page)
    await writeFile(`${folder}/walking-memory.json`,JSON.stringify({seconds:60,before:before.memory,after:after.memory},null,2))
    expect(after.memory).toEqual(before.memory)
    const extension=await page.evaluate(async()=>{const f='/node_modules/.vite/deps/@react-three_fiber.js',r=(await import(f))._roots.values().next().value.store.getState();const e=r.gl.getContext().getExtension('WEBGL_lose_context');if(!e)return false;(window as unknown as {restoreMuseumContext:()=>void}).restoreMuseumContext=()=>e.restoreContext();e.loseContext();return true})
    if(extension){await expect(page.getByText('Restoring 3D view… / بازیابی نمای سه‌بعدی…',{exact:true})).toBeVisible();await page.evaluate(()=>(window as unknown as {restoreMuseumContext:()=>void}).restoreMuseumContext());await expect(page.getByText('Restoring 3D view… / بازیابی نمای سه‌بعدی…',{exact:true})).toHaveCount(0);await expect(page.locator('canvas[data-camera-z]')).toBeVisible()}
})

test('final floor artifact angle and high-tier frame sampling',async({page})=>{
    test.skip(stage!=='after')
    await page.addInitScript(()=>{Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>16});Object.defineProperty(navigator,'deviceMemory',{get:()=>8})})
    await visitFixture(page);await expect.poll(async()=>(await cameraState(page)).phase).toBe('ready')
    await pose(page,[0,1.72,15.5],[4,.1,10])
    await page.screenshot({path:`${folder}/after-floor.png`})
    const entrance=await metrics(page)
    await pose(page,[0,1.72,-9],[0,2.2,-20])
    const passage=await metrics(page)
    await writeFile(`${folder}/frame-sampling.json`,JSON.stringify({entrance,passage},null,2))
})
