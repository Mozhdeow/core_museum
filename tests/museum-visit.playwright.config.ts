import {defineConfig} from '@playwright/test'
import base from './museum-navigation.playwright.config'
export default defineConfig({...base,testMatch:'museum-visit.spec.ts',outputDir:'../test-results/visit',use:{...base.use,baseURL:'http://127.0.0.1:5197'},
 webServer:{...base.webServer,command:'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5197 --strictPort',url:'http://127.0.0.1:5197',reuseExistingServer:true}})
