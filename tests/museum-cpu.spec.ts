import {test, expect, type Page} from '@playwright/test'
import type {RootState} from '@react-three/fiber'
import type {Mesh, Intersection, Vector3} from 'three'
import {setup} from './museum-browser-fixture'

async function sceneState(page: Page) {
    return page.evaluate(async () => {
        const path = '/node_modules/.vite/deps/@react-three_fiber.js'
        const {_roots} = await import(path)
        const state = (Array.from(_roots.values())[0] as { store: { getState: () => RootState } }).store.getState()
        const model = state.scene.getObjectByName('exhibit:cpu-id')
        const geometries: string[] = [];
        model?.traverse(o => {
            const m = o as Mesh;
            if (m.isMesh) geometries.push(m.geometry.uuid)
        })
        const heights = Object.fromEntries(['spreader', 'interface', 'die', 'substrate', 'contacts'].map(id => [id, state.scene.getObjectByName('cpu-layer:' + id)?.position.y]))
        const bands = state.scene.getObjectByName('cpu-heat-illustration')
        const layer = state.scene.getObjectByName('cpu-layer:spreader')!
        const projected = layer.getWorldPosition(layer.position.clone()).project(state.camera)
        const center = layer.position.clone().set(0, 2.25, -27).project(state.camera)
        return {
            position: state.camera.position.toArray(),
            quaternion: state.camera.quaternion.toArray(),
            heights,
            bands: bands?.children.map(b => b.position.y),
            modelGeometries: geometries,
            modelPosition: model?.position.toArray(),
            modelVisible: model?.parent?.visible,
            spreaderScreen: {x: (projected.x + 1) * state.size.width / 2, y: (1 - projected.y) * state.size.height / 2},
            centerX: (center.x + 1) * state.size.width / 2
        }
    })
}

async function arrive(page: Page, real = false) {
    await setup(page, real)
    await page.getByRole('button', {name: 'Skip to CPU Hall'}).click()
    if (real) await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state', 'ready')
    await expect(page.getByRole('button', {name: 'Explore CPU schematic', exact: true})).toBeVisible()
}

async function inspect(page: Page) {
    const model=page.getByRole('button',{name:'Inspect selected model',exact:true})
    await (await model.count()?model:page.getByRole('button',{name:'Explore CPU schematic',exact:true})).click()
    await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-inspection', 'active')
}

test('Inspect orbit, bounded zoom, reset and exact Explore restoration use one camera', async ({page}) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message))
    await arrive(page)
    await page.getByRole('button', {name: 'Free Explore', exact: true}).click()
    const before = await sceneState(page)
    await inspect(page)
    await page.getByRole('button', {name: 'Focus 3D', exact: true}).click()
    const request = await page.evaluate(async () => {
        const p = '/src/features/museum/navigationState.ts';
        return (await import(p)).useMuseumNavigation.getState().request.id
    })
    await page.keyboard.press('ArrowRight')
    await expect.poll(async () => Number(await page.locator('canvas').getAttribute('data-orbit-yaw'))).toBeGreaterThan(.1)
    expect(await page.evaluate(async () => {
        const p = '/src/features/museum/navigationState.ts';
        return (await import(p)).useMuseumNavigation.getState().request.id
    })).toBe(request)
    await page.mouse.move(500, 300);
    await page.mouse.down();
    await page.mouse.move(570, 340, {steps: 5});
    await page.mouse.up()
    expect(Number(await page.locator('canvas').getAttribute('data-orbit-yaw'))).toBeLessThan(0)
    await page.mouse.wheel(0, -500)
    await expect.poll(async () => Number(await page.locator('canvas').getAttribute('data-inspect-distance'))).toBeLessThan(7.2)
    for (let i = 0; i < 8; i++) await page.getByRole('button', {name: 'Zoom in', exact: true}).click()
    await expect(page.locator('canvas')).toHaveAttribute('data-inspect-distance', '5.20')
    await page.getByRole('button', {name: 'Reset view', exact: true}).click()
    await expect(page.locator('canvas')).toHaveAttribute('data-inspect-distance', '7.20')
    await page.screenshot({path: '.tmp/phase07-preview/07c-inspect-desktop.png'})
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-cpu-inspection]')).toHaveCount(0)
    await expect(page.locator('[data-navigation-mode]')).toHaveAttribute('data-navigation-mode', 'explore')
    const after = await sceneState(page)
    before.position.forEach((v, i) => expect(Math.abs(after.position[i] - v)).toBeLessThan(.03))
    before.quaternion.forEach((v, i) => expect(Math.abs(after.quaternion[i] - v)).toBeLessThan(.03))
    expect(errors).toEqual([])
})

test('exploded schematic separates ordered layers and bilingual hotspots without catalog identity', async ({page}) => {
    await arrive(page);
    await inspect(page)
    await page.getByRole('button', {name: 'Explode layers', exact: true}).click()
    await expect.poll(async () => Number(await page.locator('canvas').getAttribute('data-cpu-explosion'))).toBeGreaterThan(.98)
    const frame = await sceneState(page), h = frame.heights
    expect(h.spreader).toBeGreaterThan(h.interface! + .4);
    expect(h.interface).toBeGreaterThan(h.die! + .4)
    expect(h.die).toBeGreaterThan(h.substrate! + .4);
    expect(h.substrate).toBeGreaterThan(h.contacts! + .2)
    await page.mouse.click(frame.spreaderScreen.x, frame.spreaderScreen.y)
    await expect(page.locator('[data-active-hotspot]')).toHaveAttribute('data-active-hotspot', 'spreader')
    for (const id of ['spreader', 'interface', 'die', 'substrate', 'contacts']) {
        await page.locator('[data-hotspot-id="' + id + '"]').click()
        await expect(page.locator('[data-active-hotspot]')).toHaveAttribute('data-active-hotspot', id)
    }
    await page.locator('[data-hotspot-id="die"]').click()
    await page.screenshot({path: '.tmp/phase07-preview/07c-exploded-desktop.png'})
    await page.getByRole('button', {name: 'Close explanation', exact: true}).click();
    await expect(page.locator('[data-active-hotspot]')).toHaveCount(0)
    await page.getByRole('button', {name: 'Reassemble', exact: true}).click()
    await expect.poll(async () => Number(await page.locator('canvas').getAttribute('data-cpu-explosion'))).toBeLessThan(.02)
    await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-item-id', '')
    await page.getByRole('button', {name: 'Exit Inspect', exact: true}).click();
    await expect(page.locator('[data-navigation-mode]')).toHaveAttribute('data-navigation-mode', 'guided')
})

test('Inside and Heat Transfer lessons play, pause, replay and reset actual teaching geometry', async ({page}) => {
    await arrive(page);
    await inspect(page)
    await page.getByRole('button', {name: 'Inside the Processor', exact: true}).click()
    await expect(page.locator('[data-lesson-state]')).toHaveAttribute('data-lesson-state', 'playing')
    await expect.poll(async () => Number(await page.locator('canvas').getAttribute('data-cpu-explosion'))).toBeGreaterThan(.5)
    await page.getByRole('button', {name: 'Pause lesson', exact: true}).click()
    const frozen = await sceneState(page);
    await page.waitForTimeout(400)
    expect((await sceneState(page)).heights).toEqual(frozen.heights)
    await page.getByRole('button', {name: 'Continue lesson', exact: true}).click()
    await expect(page.locator('[data-lesson-state]')).toHaveAttribute('data-lesson-state', 'playing')
    await expect(page.locator('[data-lesson-state]')).toHaveAttribute('data-lesson-state', 'complete', {timeout: 12000})
    await page.getByRole('button', {name: 'Replay lesson', exact: true}).click()
    await page.getByRole('button', {name: 'Reset lesson', exact: true}).click()
    await expect(page.locator('[data-lesson-state]')).toHaveAttribute('data-lesson-state', 'idle')
    await page.getByRole('button', {name: 'Heat Transfer', exact: true}).click()
    await page.waitForTimeout(500);
    const heat = await sceneState(page);
    await page.waitForTimeout(400)
    expect((await sceneState(page)).bands).not.toEqual(heat.bands)
    await page.getByRole('button', {name: 'Pause lesson', exact: true}).click()
    const paused = await sceneState(page);
    await page.waitForTimeout(350);
    expect((await sceneState(page)).bands).toEqual(paused.bands)
    await page.screenshot({path: '.tmp/phase07-preview/07c-heat-desktop.png'})
    await page.getByRole('button', {name: 'Continue lesson', exact: true}).click()
    await expect(page.locator('[data-lesson-state]')).toHaveAttribute('data-lesson-state', 'complete', {timeout: 10000})
    await page.getByRole('button', {name: 'Reset lesson', exact: true}).click()
    await page.getByRole('button', {name: 'Exit Inspect', exact: true}).click()
    await expect(page.locator('[data-cpu-inspection]')).toHaveCount(0)
})

test('published GLB stays intact, cached and selected while independent schematic lessons run', async ({page}) => {
    await arrive(page, true);
    const original = await sceneState(page)
    await inspect(page);
    await expect(page.locator('[data-cpu-view]')).toHaveAttribute('data-cpu-view', 'model')
    await page.getByRole('button', {name: 'Inside the Processor', exact: true}).click()
    await expect(page.locator('[data-cpu-view]')).toHaveAttribute('data-cpu-view', 'schematic')
    await expect(page.getByText(/Independent educational schematic/)).toBeVisible()
    const schematic = await sceneState(page)
    expect(schematic.modelGeometries).toEqual(original.modelGeometries);
    expect(schematic.modelPosition).toEqual(original.modelPosition);
    expect(schematic.modelVisible).toBe(false)
    await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-item-id', 'cpu-id')
    await page.getByRole('button', {name: 'Selected model', exact: true}).click()
    expect((await sceneState(page)).modelVisible).toBe(true)
    await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state', 'ready')
    await page.getByRole('button', {name: 'Exit Inspect', exact: true}).click()
    await expect(page.locator('[data-cpu-inspection]')).toHaveCount(0)
    expect((await sceneState(page)).modelGeometries).toEqual(original.modelGeometries)
})

test.describe('touch learning', () => {
    test.use({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true})
    test('portrait and landscape keep learning readable, native drag and pinch work in English and Persian', async ({page}) => {
        await arrive(page);
        await inspect(page)
        const touch = await page.context().newCDPSession(page)
        await touch.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{id: 1, x: 180, y: 260}]})
        await touch.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{id: 1, x: 230, y: 280}]});
        await touch.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []})
        await expect.poll(async () => Number(await page.locator('canvas').getAttribute('data-orbit-yaw'))).toBeLessThan(0)
        const before = Number(await page.locator('canvas').getAttribute('data-inspect-distance'))
        await touch.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{id: 1, x: 140, y: 260}, {id: 2, x: 240, y: 260}]
        })
        await touch.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{id: 1, x: 120, y: 260}, {id: 2, x: 260, y: 260}]
        });
        await touch.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
        await touch.detach()
        await expect.poll(async () => Number(await page.locator('canvas').getAttribute('data-inspect-distance'))).toBeLessThan(before)
        await page.getByRole('button', {name: 'Reset view', exact: true}).click()
        for (const size of [{width: 360, height: 780}, {width: 390, height: 844}, {
            width: 430,
            height: 932
        }, {width: 844, height: 390}]) {
            await page.setViewportSize(size)
            for (const locale of ['en', 'fa']) {
                await page.getByRole('button', {name: locale === 'fa' ? 'FA' : 'EN', exact: true}).click()
                await page.locator('[data-hotspot-id="die"]').click()
                await expect(page.locator('[data-active-hotspot]')).toHaveAttribute('data-active-hotspot', 'die')
                await expect(page.locator('.cpu-hotspot-info p')).toBeInViewport({ratio: 1})
                const panel = await page.locator('.cpu-inspector').boundingBox();
                expect(panel!.x).toBeGreaterThanOrEqual(0);
                expect(panel!.y).toBeGreaterThanOrEqual(0);
                expect(panel!.y + panel!.height).toBeLessThanOrEqual(size.height + 1)
                expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
                if (size.height < 540) await expect.poll(async () => {
                    const center = (await sceneState(page)).centerX
                    return locale === 'fa' ? center > panel!.x + panel!.width + 70 : center < panel!.x - 70
                }).toBe(true)
            }
            await page.screenshot({path: '.tmp/phase07-preview/07c-' + size.width + 'x' + size.height + '-fa.png'})
        }
    })
})

test('reduced motion inspects, separates immediately and uses stationary heat-path cues', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await arrive(page);
    await inspect(page)
    await page.getByRole('button', {name: 'Explode layers', exact: true}).click()
    await expect(page.locator('canvas')).toHaveAttribute('data-cpu-explosion', '1.00')
    await page.getByRole('button', {name: 'Heat Transfer', exact: true}).click()
    const before = await sceneState(page);
    await page.waitForTimeout(450);
    expect((await sceneState(page)).bands).toEqual(before.bands)
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-cpu-inspection]')).toHaveCount(0)
    await expect(page.locator('[data-navigation-mode]')).toHaveAttribute('data-navigation-mode', 'guided')
})

test.describe('floor evidence', () => {
    test.use({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true})
    test('floor provenance: mobile portrait and landscape have charcoal corridor surfaces', async ({page}) => {
        await setup(page)
        for (const size of [{width: 390, height: 844}, {width: 844, height: 390}]) {
            await page.setViewportSize(size)
            const result = await page.evaluate(async () => {
                const fiber = '/node_modules/.vite/deps/@react-three_fiber.js',
                    three = '/node_modules/.vite/deps/three.js'
                const {_roots} = await import(fiber), {Raycaster, Vector2} = await import(three)
                const r = (Array.from(_roots.values())[0] as { store: { getState: () => RootState } }).store.getState();
                r.setFrameloop('never')
                const results = []
                for (const z of [10, -8]) {
                    r.camera.position.set(0, 1.72, z);
                    r.camera.lookAt(0, 0, z - 3);
                    r.camera.updateMatrixWorld();
                    r.gl.render(r.scene, r.camera)
                    const ray = new Raycaster();
                    ray.setFromCamera(new Vector2(0, -.45), r.camera)
                    const hit = ray.intersectObjects(r.scene.children, true).find((h: Intersection) => Boolean((h.object as Mesh).isMesh))
                    const object = hit?.object as Mesh | undefined
                    const material = object?.material as {
                        type: string;
                        color?: { getHexString: () => string }
                    } | undefined
                    const ctx = r.gl.getContext(), p = new Uint8Array(4),
                        drawingSize = r.gl.getDrawingBufferSize(new Vector2()) as Vector3
                    ctx.readPixels(Math.floor(drawingSize.x / 2), Math.floor(drawingSize.y * .275), 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, p)
                    results.push({
                        z,
                        color: material?.color?.getHexString(),
                        material: material?.type,
                        pixel: Array.from(p)
                    })
                }
                return results
            })
            console.log('Mobile floor evidence:', JSON.stringify({size, result}))
            for (const r of result) {
                expect(r.color).toBe('30363b');
                expect(r.material).toBe('MeshStandardMaterial');
                expect(Math.max(...r.pixel.slice(0, 3))).toBeLessThan(220)
            }
            await page.screenshot({path: '.tmp/phase07-preview/07c-floor-' + size.width + '.png'})
        }
    })
})
