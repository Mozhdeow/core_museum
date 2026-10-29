import {defineConfig} from '@playwright/test'
import base from './museum-navigation.playwright.config'
export default defineConfig({...base, testMatch: 'visual-realism.spec.ts', workers: 1, timeout: 120000,
    outputDir: '../test-results/visual-realism', use: {...base.use, viewport: {width: 1440, height: 900}}})
