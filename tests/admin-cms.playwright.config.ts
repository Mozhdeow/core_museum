import {defineConfig} from '@playwright/test'
const port=Number(process.env.PLAYWRIGHT_PORT??5200)
export default defineConfig({testDir:'.',testMatch:'admin-cms.spec.ts',workers:1,timeout:45000,
    outputDir:'../test-results/admin-cms',use:{baseURL:`http://127.0.0.1:${port}`,channel:process.env.PLAYWRIGHT_CHANNEL,trace:'retain-on-failure'},
    webServer:{command:`npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,url:`http://127.0.0.1:${port}`,reuseExistingServer:false}})
