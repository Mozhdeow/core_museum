import {defineConfig} from '@playwright/test'
import base from './phase09b.playwright.config'
export default defineConfig({...base,testMatch:'assembly-laboratory.spec.ts',timeout:180000,outputDir:'../test-results/assembly-laboratory',webServer:{...base.webServer!,command:'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5199 --strictPort --config .tmp/assembly-laboratory/vite.config.ts'}})
