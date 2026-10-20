import {fileURLToPath} from 'node:url'
import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'.',testMatch:['museum-navigation.spec.ts','museum-cpu.spec.ts','museum-final-qa.spec.ts'],workers:1,timeout:45000,
 outputDir:'../test-results/navigation',use:{baseURL:'http://127.0.0.1:5196',channel:process.env.PLAYWRIGHT_CHANNEL??'msedge',trace:'retain-on-failure'},
 webServer:{cwd:fileURLToPath(new URL('..',import.meta.url)),command:'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5196 --strictPort',url:'http://127.0.0.1:5196',reuseExistingServer:false,
 env:{RAYON_NUM_THREADS:'2',VITE_SUPABASE_URL:'https://core-navigation.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'navigation-test-public-key',VITE_SUPABASE_ANON_KEY:'navigation-test-public-key'}}})

