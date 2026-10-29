import {test, expect, type Page} from '@playwright/test'
import {visitFixture, cameraState, flush, visitor} from './museum-visit-fixture'

const evidence = '.tmp/phase08b'
async function scene(page: Page) {
    return page.evaluate(async () => {
        const f = '/node_modules/.vite/deps/@react-three_fiber.js'
        const roots = (await import(f))._roots
        const root = Array.from(roots.values())[0] as {store: {getState(): {scene: import('three').Scene; gl: {info: {render: {calls: number}}}}}}
        const {scene, gl} = root.store.getState()
        const gallery = scene.getObjectByName('museum-entrance-gallery')!
        const names: string[] = [], cases: {x: number; z: number}[] = []
        gallery.traverse(o => {if (o.name) names.push(o.name); if (o.name.startsWith('entrance-vitrine:')) cases.push({x: o.position.x, z: o.position.z})})
        const orbit = gallery.getObjectByName('entrance-orbits')!
        return {names, cases, locale: gallery.userData.locale, orbit: orbit.rotation.y, calls: gl.info.render.calls}
    })
}

test('desktop arrival: curated composition, one canvas and a clear walking envelope', async ({page}) => {
    const errors: string[] = [], glbs: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('request', r => {if (r.url().includes('/storage/') && r.url().endsWith('.glb')) glbs.push(r.url())})
    await visitFixture(page)
    await expect.poll(async () => (await cameraState(page)).phase, {timeout: 15000}).toBe('ready')
    await expect.poll(async () => (await scene(page)).names.includes('entrance-floor:reflective')).toBe(true)
    const s = await scene(page)
    expect(s.cases).toHaveLength(6)
    expect(s.cases.every(c => Math.abs(c.x) - .53 > 5.5 && c.z > 3)).toBe(true)
    expect(s.names.filter(n => n.startsWith('entrance-panel:'))).toHaveLength(8)
    expect(s.names).toContain('entrance-orbital-ceiling')
    expect(s.locale).toBe('en')
    await expect(page.locator('canvas[data-camera-z]')).toHaveCount(1)
    await expect(page.getByRole('button', {name: 'Guided tour', exact: true})).toBeVisible()
    await expect.poll(() => page.evaluate(() => performance.getEntriesByType('resource').filter(r => /images\/museum\/entrance\/.*jpg/.test(r.name)).length)).toBe(2)
    await page.screenshot({path: `${evidence}/01-entrance-desktop.png`})
    expect(glbs).toEqual([])
    expect(errors).toEqual([])
    // Check ownership of the new GPU resources on exit, without exercising unrelated routes.
    await page.evaluate(async () => {
        const f = '/node_modules/.vite/deps/@react-three_fiber.js'
        const roots = (await import(f))._roots
        const root = Array.from(roots.values())[0] as {store: {getState(): {scene: import('three').Scene}}}
        const gallery = root.store.getState().scene.getObjectByName('museum-entrance-gallery')!
        const owned = new Set<import('three').BufferGeometry | import('three').Material | import('three').Texture>()
        gallery.traverse(o => {
            const mesh = o as import('three').Mesh<import('three').BufferGeometry, import('three').MeshStandardMaterial>
            if (o.name.startsWith('entrance-panel:') || o.name.startsWith('entrance-floor:')) owned.add(mesh.material.map!)
            if (['entrance-graphite', 'entrance-stone', 'entrance-bronze', 'entrance-light-trim'].includes(o.name)) {owned.add(mesh.geometry); owned.add(mesh.material)}
        })
        const win = window as unknown as {entranceDisposals: number; entranceResources: number}
        win.entranceDisposals = 0; win.entranceResources = owned.size
        owned.forEach(resource => resource.addEventListener('dispose', () => {win.entranceDisposals++}))
        const r = '/src/app/router/index.tsx'; await (await import(r)).router.navigate('/profile')
    })
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => {
        const w = window as unknown as {entranceDisposals: number; entranceResources: number}
        return w.entranceDisposals === w.entranceResources && w.entranceResources === 17
    })).toBe(true)
})

test('Entrance movement and saved camera restore preserve the original owner and pose', async ({page}) => {
    await visitFixture(page)
    await expect.poll(async () => (await cameraState(page)).phase, {timeout: 15000}).toBe('ready')
    await page.getByRole('button', {name: 'Free Explore', exact: true}).click()
    const before = await cameraState(page)
    await page.keyboard.down('KeyW')
    await expect.poll(async () => (await cameraState(page)).position[2]).toBeLessThan(before.position[2] - 1.8)
    await page.keyboard.up('KeyW')
    await page.keyboard.down('KeyD'); await page.waitForTimeout(450); await page.keyboard.up('KeyD')
    const pose = await cameraState(page)
    expect(pose.location).toBe('entrance'); expect(pose.mode).toBe('explore')
    expect(Math.abs(pose.position[0])).toBeLessThanOrEqual(5.5)
    await flush(page)
    const saved = await page.evaluate(id => JSON.parse(localStorage.getItem(`core-museum-visit:${id}`)!), visitor)
    expect(saved).toBeTruthy()
    await page.reload()
    await expect.poll(async () => (await cameraState(page)).phase, {timeout: 15000}).toBe('ready')
    const restored = await cameraState(page)
    expect(restored.mode).toBe('explore')
    for (let i = 0; i < 3; i++) expect(restored.position[i]).toBeCloseTo(pose.position[i], 1)
    for (let i = 0; i < 4; i++) expect(restored.quaternion[i]).toBeCloseTo(pose.quaternion[i], 1)
    await page.keyboard.down('KeyQ'); await page.waitForTimeout(700); await page.keyboard.up('KeyQ')
    await page.getByRole('button', {name: 'Navigation controls', exact: true}).click()
    await page.screenshot({path: `${evidence}/02-entrance-vitrines.png`})
})

test('ceremonial doorway remains on the existing cinematic route; Space still pauses', async ({page}) => {
    await visitFixture(page)
    await page.getByRole('button', {name: 'Guided tour', exact: true}).click()
    await expect.poll(async () => (await cameraState(page)).position[2]).toBeLessThan(9)
    await page.keyboard.press('Space')
    await expect.poll(async () => (await cameraState(page)).playing).toBe(false)
    // Existing camera damping settles toward the paused route target; do not mistake it for autoplay.
    await page.waitForTimeout(650)
    const paused = await cameraState(page)
    await page.waitForTimeout(200)
    expect((await cameraState(page)).position[2]).toBeCloseTo(paused.position[2], 2)
    await page.screenshot({path: `${evidence}/03-entrance-doorway.png`})
    await page.keyboard.press('Space')
    await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location', 'corridor', {timeout: 12000})
    const corridor = await cameraState(page)
    expect(corridor.position[2]).toBeLessThan(2)
    await page.getByRole('button', {name: 'Pause tour', exact: true}).click()
    await expect(page.locator('canvas[data-camera-z]')).toHaveCount(1)
})

test.describe('portrait Entrance', () => {
    test.use({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, reducedMotion: 'reduce'})
    test('mobile EN/FA, reduced motion, lightweight floor and touch movement', async ({page}) => {
        await visitFixture(page)
        expect((await scene(page)).names).toContain('entrance-floor:mobile')
        const first = await scene(page)
        await page.waitForTimeout(250)
        expect((await scene(page)).orbit).toBe(first.orbit)
        await page.screenshot({path: `${evidence}/04-entrance-mobile-en.png`})
        await page.getByRole('button', {name: 'FA', exact: true}).click()
        await expect.poll(async () => (await scene(page)).locale).toBe('fa')
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
        await page.getByRole('button', {name: 'کنترل‌های حرکت', exact: true}).click()
        await page.getByRole('button', {name: 'کاوش آزاد', exact: true}).click()
        const before = await cameraState(page)
        const button = page.getByRole('button', {name: 'حرکت به جلو', exact: true})
        const box = await button.boundingBox(); expect(box).toBeTruthy()
        const touch = await page.context().newCDPSession(page)
        await touch.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: box!.x + box!.width / 2, y: box!.y + box!.height / 2}]})
        await expect.poll(async () => (await cameraState(page)).position[2]).toBeLessThan(before.position[2] - .4)
        await touch.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}); await touch.detach()
        await page.getByRole('button', {name: 'کنترل‌های حرکت', exact: true}).click()
        await page.screenshot({path: `${evidence}/05-entrance-mobile-fa.png`})
    })
})
