import {defineConfig} from '@playwright/test'
import base from './museum-navigation.playwright.config'
export default defineConfig({...base,testMatch:'assembly.spec.ts',workers:1,timeout:120000,outputDir:'../test-results/assembly',use:{...base.use,baseURL:'http://127.0.0.1:5197',channel:'chrome',viewport:{width:1600,height:1000}},webServer:{...base.webServer!,command:'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5197 --strictPort',url:'http://127.0.0.1:5197'}})
