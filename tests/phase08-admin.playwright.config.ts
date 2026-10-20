import base from './museum-navigation.playwright.config'
import {defineConfig} from '@playwright/test'
export default defineConfig({...base,testMatch:'admin-cms.spec.ts',outputDir:'../test-results/phase08-admin',webServer:{...base.webServer as object,command:'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5198 --strictPort',url:'http://127.0.0.1:5198'},use:{...base.use,baseURL:'http://127.0.0.1:5198'}})
