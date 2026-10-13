import {test, expect, type Page} from '@playwright/test'

async function skipSeenIntro(page: Page, locale = 'en') {
    await page.addInitScript(language => {
        localStorage.setItem('core_intro_last_seen_at', String(Date.now()))
        localStorage.setItem('core_intro_last_full_seen_at', String(Date.now()))
        localStorage.setItem('core-locale', language)
    }, locale)
}

async function scrollTo(page: Page, progress: number) {
    await expect(page.locator('.pin-spacer')).toHaveCount(1)
    await page.evaluate(value => window.scrollTo({top: (document.documentElement.scrollHeight - innerHeight) * value,
        behavior: 'instant'}), progress)
    // Allow the intentional GSAP scrub to catch up before measuring final geometry.
    await page.waitForTimeout(800)
}

async function assertContainedCopy(page: Page, selector: string) {
    const screen = await page.locator('.core-stage__screen').boundingBox()
    const copy = await page.locator(selector).boundingBox()
    expect(screen).not.toBeNull()
    expect(copy).not.toBeNull()
    expect(copy!.x).toBeGreaterThanOrEqual(screen!.x - 1)
    expect(copy!.y).toBeGreaterThanOrEqual(screen!.y - 1)
    expect(copy!.x + copy!.width).toBeLessThanOrEqual(screen!.x + screen!.width + 1)
    expect(copy!.y + copy!.height).toBeLessThanOrEqual(screen!.y + screen!.height + 1)
}

for (const [width, height] of [[390, 844], [430, 932], [459, 776], [768, 1024], [1440, 900], [1920, 1080]]) {
    for (const locale of ['en', 'fa']) {
        test(`${width}×${height} ${locale}: one canvas, stable computer, readable chapters`, async ({page}, info) => {
            await page.setViewportSize({width, height})
            await skipSeenIntro(page, locale)
            const errors: string[] = []
            page.on('pageerror', error => errors.push(error.message))
            await page.goto('/')
            await expect(page.locator('.pin-spacer')).toHaveCount(1)
            await expect(page.locator('canvas')).toHaveCount(1)
            await expect(page.locator('html')).toHaveAttribute('dir', locale === 'fa' ? 'rtl' : 'ltr')
            const canvas = await page.locator('canvas').elementHandle()
            await page.waitForTimeout(800)
            const heading = await page.locator('h1').boundingBox()
            expect(heading!.y).toBeGreaterThan(65)
            await page.screenshot({path: info.outputPath('hero.png')})
            expect(await page.locator('.core-stage__computer-image').getAttribute('src'))
                .toContain(width <= 900 ? 'desktop-mobile.png' : 'desktop.png')

            await scrollTo(page, .42)
            const lockedImage = await page.locator('.core-stage__computer-image').boundingBox()
            const lockedScreen = await page.locator('.core-stage__screen').boundingBox()
            await expect(page.locator('.core-stage__computer-image')).toHaveCSS('opacity', '1')
            await page.screenshot({path: info.outputPath('engine.png')})
            for (const [progress, id] of [[.58, 'about'], [.94, 'visit']] as const) {
                await scrollTo(page, progress)
                await expect(page.locator(`#${id}`)).toHaveCSS('opacity', '1')
                await expect(page.locator(`#${id}`)).toHaveAttribute('aria-hidden', 'false')
                expect(await page.locator('.core-stage__computer-image').boundingBox()).toEqual(lockedImage)
                expect(await page.locator('.core-stage__screen').boundingBox()).toEqual(lockedScreen)
                await assertContainedCopy(page, `#${id} .core-screen-chapter__copy`)
                expect(await canvas!.evaluate(node => node === document.querySelector('canvas'))).toBe(true)
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
                await page.screenshot({path: info.outputPath(`${id}.png`)})
            }
            await scrollTo(page, 0)
            await expect(page.locator('.core-stage__copy')).toHaveCSS('opacity', '1')
            await expect(page.locator('#visit')).toHaveAttribute('inert', '')
            expect(await page.locator('h1').boundingBox()).toEqual(heading)
            expect(errors).toEqual([])
        })
    }
}

test('slow, fast, reverse, resizing and language switches retain the same canvas', async ({page}, info) => {
    await page.setViewportSize({width: 1440, height: 900})
    await skipSeenIntro(page)
    await page.goto('/')
    const canvas = await page.locator('canvas').elementHandle()
    for (let progress = 0; progress <= .37; progress += .01) {
        await page.evaluate(value => window.scrollTo({top: (document.documentElement.scrollHeight - innerHeight) * value, behavior: 'instant'}), progress)
        await page.waitForTimeout(45)
        expect(await page.locator('.core-stage__screen').evaluate(el => getComputedStyle(el).opacity)).toBe('1')
    }
    await scrollTo(page, .265)
    await page.screenshot({path: info.outputPath('overlap.png')})
    await page.setViewportSize({width: 390, height: 844})
    await expect(page.locator('.core-stage__screen')).toHaveCSS('clip-path', 'none')
    await page.setViewportSize({width: 1440, height: 900})
    for (const progress of [.94, .05, .62, .26, .75, .34, .94]) {
        await scrollTo(page, progress)
        expect(await canvas!.evaluate(node => node === document.querySelector('canvas'))).toBe(true)
    }
    const physical = await page.locator('.core-stage__computer-image').boundingBox()
    await page.getByRole('button', {name: 'FA', exact: true}).click()
    expect(await page.locator('.core-stage__computer-image').boundingBox()).toEqual(physical)
    await page.setViewportSize({width: 390, height: 844})
    await expect(page.locator('#visit')).toHaveCSS('opacity', '1')
    await scrollTo(page, 0)
    expect((await page.locator('h1').boundingBox())!.y).toBeGreaterThan(65)
    expect(await canvas!.evaluate(node => node === document.querySelector('canvas'))).toBe(true)
    await expect(page.locator('.pin-spacer')).toHaveCount(1)
})

test('navigation, reload midway, final keyboard CTA and route cleanup', async ({page}) => {
    await skipSeenIntro(page)
    await page.goto('/')
    await page.locator('.core-stage__copy a').click()
    await expect(page.locator('#about')).toHaveCSS('opacity', '1')
    await page.reload()
    await expect(page.locator('#about')).toHaveCSS('opacity', '1')
    await page.locator('.landing-progress a[href="#visit"]').click()
    await expect(page.locator('#visit')).toHaveCSS('opacity', '1')
    await page.locator('#visit button').focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/login$/)
    expect(await page.evaluate(() => history.state.usr.from)).toBe('/museum')
    await expect(page.locator('.pin-spacer')).toHaveCount(0)
    await page.goBack()
    await expect(page.locator('.pin-spacer')).toHaveCount(1)
    await expect(page.locator('canvas')).toHaveCount(1)
})

test('reduced motion keeps all chapters and the 3D exhibit still', async ({page}, info) => {
    await page.emulateMedia({reducedMotion: 'reduce'})
    await skipSeenIntro(page)
    await page.goto('/')
    await page.waitForTimeout(1500)
    const first = await page.locator('canvas').screenshot()
    await page.waitForTimeout(400)
    expect(await page.locator('canvas').screenshot()).toEqual(first)
    await scrollTo(page, .58)
    await expect(page.locator('#about')).toHaveCSS('opacity', '1')
    await scrollTo(page, .94)
    await expect(page.locator('#visit')).toHaveCSS('opacity', '1')
    await page.screenshot({path: info.outputPath('reduced-motion.png')})
})

test('approved full Intro completes and hands off without extra pins', async ({page}, info) => {
    await page.goto('/')
    await expect(page.locator('.landing-intro')).toBeVisible()
    await page.waitForTimeout(2500)
    await page.screenshot({path: info.outputPath('intro.png')})
    await expect(page.locator('.pin-spacer')).toHaveCount(0)
    await page.mouse.wheel(0, 800)
    expect(await page.evaluate(() => scrollY)).toBe(0)
    await expect(page.locator('.landing-intro')).toHaveCount(0, {timeout: 60_000})
    await expect(page.locator('.pin-spacer')).toHaveCount(1)
    await expect(page.locator('.core-stage__copy')).toHaveCSS('opacity', '1')
})

test('mobile Intro skip preserves handoff and the video experiment stays opt-in', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844})
    await page.goto('/')
    await expect(page.locator('.landing-intro__frame img')).toHaveAttribute('src', /desktop-mobile/)
    await page.locator('.landing-intro__skip').click()
    await expect(page.locator('.landing-intro')).toHaveCount(0)
    await expect(page.locator('.pin-spacer')).toHaveCount(1)
    await expect(page.locator('video')).toHaveCount(0)
    await page.goto('/?heroDive=video')
    await expect(page.locator('video source')).toHaveAttribute('src', '/videos/landing/hero-monitor-dive.mp4')
    await expect(page.locator('.core-stage')).toHaveCount(0)
})

test('one rigid photograph and one canvas persist throughout the entire camera move', async ({page}) => {
    await skipSeenIntro(page)
    await page.goto('/')
    const image = await page.locator('.core-stage__computer-image').elementHandle()
    const ratios: number[] = []
    for (const progress of [0, .06, .12, .2, .27, .32, .38, .58, .94, .25, 0]) {
        await scrollTo(page, progress)
        expect(await image!.evaluate(node => node === document.querySelector('.core-stage__computer-image'))).toBe(true)
        const photograph = await page.locator('.core-stage__computer-image').boundingBox()
        const screen = await page.locator('.core-stage__screen').boundingBox()
        ratios.push(screen!.width / photograph!.width)
        expect((screen!.x - photograph!.x) / photograph!.width).toBeCloseTo(.1085, 3)
        expect((screen!.y - photograph!.y) / photograph!.height).toBeCloseTo(.05, 3)
        await expect(page.locator('.core-stage__world > img')).toHaveCount(1)
        await expect(page.locator('.core-stage__computer-image')).toHaveCSS('opacity', '1')
        expect(photograph!.width / photograph!.height).toBeCloseTo(1672 / 941, 4)
        const matrix = await page.locator('.core-stage__world').evaluate(el => {
            const transform = new DOMMatrixReadOnly(getComputedStyle(el).transform)
            return [transform.a, transform.d]
        })
        expect(matrix[0]).toBeCloseTo(matrix[1], 5)
    }
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(.0001)
    await scrollTo(page, .58)
    await expect(page.locator('.core-stage__engine')).toHaveCSS('opacity', '0')
    await expect(page.locator('#about img')).toHaveAttribute('src', /exploded-workstation/)
})

test('final entry zoom finishes before navigation and reduced motion skips magnification', async ({page}) => {
    await skipSeenIntro(page)
    await page.goto('/')
    await scrollTo(page, .94)
    const before = await page.locator('.core-stage__screen').boundingBox()
    await page.locator('#visit button').click()
    await expect(page.locator('#visit button')).toBeDisabled()
    await page.waitForTimeout(450)
    expect(new URL(page.url()).pathname).toBe('/')
    expect((await page.locator('.core-stage__screen').boundingBox())!.width).toBeGreaterThan(before!.width)
    await expect(page).toHaveURL(/\/login$/)
    await page.emulateMedia({reducedMotion: 'reduce'})
    await page.goto('/')
    await scrollTo(page, .94)
    await page.locator('#visit button').click()
    await expect(page).toHaveURL(/\/login$/)
})



test('delayed artwork never changes camera geometry and chapter titles never overlap', async ({page}) => {
    await skipSeenIntro(page)
    let releaseImage = () => {}
    const gate = new Promise<void>(resolve => {releaseImage = resolve})
    await page.route('**/images/landing/hero/desktop.png', async route => {await gate; await route.continue()})
    try {
        await page.goto('/', {waitUntil: 'domcontentloaded'})
        await scrollTo(page, .42)
        const before = await page.locator('.core-stage__screen').boundingBox()
        await expect(page.locator('canvas')).toHaveCount(1)
        releaseImage()
        await expect.poll(() => page.locator('.core-stage__computer-image').evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
        expect(await page.locator('.core-stage__screen').boundingBox()).toEqual(before)
        await expect(page.locator('.core-stage__computer-image')).toHaveCSS('opacity', '1')
        for (const progress of [.67, .69, .71, .73, .75, .77, .79, .77, .75, .73, .71]) {
            await scrollTo(page, progress)
            const opacities = await page.locator('.core-screen-chapter__copy').evaluateAll(nodes => nodes.map(node => +getComputedStyle(node).opacity))
            expect(Math.min(...opacities)).toBeLessThan(.01)
        }
    } finally {releaseImage()}
})

