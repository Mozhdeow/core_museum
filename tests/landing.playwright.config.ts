import {defineConfig} from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT ?? 5173)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
    testDir: '.',
    testMatch: 'landing-journey.spec.ts',
    outputDir: '../test-results/landing',
    workers: 1,
    timeout: 90_000,
    use: {
        baseURL,
        channel: process.env.PLAYWRIGHT_CHANNEL,
        trace: 'retain-on-failure',
    },
    webServer: {
        command: `npm run dev -- --port ${port} --strictPort`,
        url: baseURL,
        reuseExistingServer: true,
    },
})
