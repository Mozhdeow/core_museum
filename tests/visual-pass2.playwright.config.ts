import {defineConfig} from '@playwright/test'
import base from './museum-navigation.playwright.config'
export default defineConfig({...base,testMatch:'visual-pass2.spec.ts',workers:1,timeout:120000,outputDir:'../test-results/visual-pass2',use:{...base.use,viewport:{width:1920,height:1080}}})
