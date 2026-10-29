import {defineConfig} from '@playwright/test'
import base from './museum-navigation.playwright.config'
export default defineConfig({...base, testMatch: 'entrance.spec.ts', workers: 1, timeout: 60000,
    outputDir: '../test-results/entrance', use: {...base.use, viewport: {width: 1536, height: 960}}})
