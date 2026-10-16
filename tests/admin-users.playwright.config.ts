import {defineConfig} from '@playwright/test'
const port=Number(process.env.PLAYWRIGHT_PORT ?? 5196)
export default defineConfig({testDir:'.',testMatch:'admin-users.spec.ts',workers:1,timeout:45000,
    outputDir:'../test-results/admin-users',use:{baseURL:`http://127.0.0.1:${port}`,channel:process.env.PLAYWRIGHT_CHANNEL,trace:'retain-on-failure'},
    webServer:{command:`npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,url:`http://127.0.0.1:${port}`,reuseExistingServer:false}})
