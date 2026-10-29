import {defineConfig} from '@playwright/test'
import base from './assembly-laboratory.playwright.config'
export default defineConfig({...base,testMatch:'assembly-install-parts.spec.ts',timeout:150000,outputDir:'../test-results/assembly-install-parts',use:{...base.use,viewport:{width:1366,height:768},reducedMotion:'no-preference'},webServer:{...base.webServer!,command:'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5199 --strictPort --config .tmp/assembly-laboratory/vite.config.ts'}})
