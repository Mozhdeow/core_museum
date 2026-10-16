import {defineConfig} from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT ?? 5192)
const baseURL = `http://127.0.0.1:${port}`
export default defineConfig({
    testDir: '.', testMatch: 'backend-admin.spec.ts', workers: 1, timeout: 45_000,
    outputDir: '../test-results/backend-admin',
    use: {baseURL, channel: process.env.PLAYWRIGHT_CHANNEL, trace: 'retain-on-failure'},
    webServer: {
        command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
        url: baseURL, reuseExistingServer: false,
    },
})
