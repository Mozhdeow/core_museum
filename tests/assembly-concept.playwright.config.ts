import {defineConfig} from '@playwright/test'
import base from './assembly.playwright.config'
export default defineConfig({...base,testMatch:'assembly-concept.spec.ts',workers:1,timeout:90000,outputDir:'../test-results/assembly-concept',use:{...base.use,baseURL:'http://127.0.0.1:5198'},webServer:{...base.webServer!,command:'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5198 --strictPort',url:'http://127.0.0.1:5198'}})
