import {defineConfig} from '@playwright/test'
import base from './museum-navigation.playwright.config'
export default defineConfig({...base,testMatch:'visual-pass4.spec.ts',workers:1,timeout:300000,outputDir:'../test-results/visual-pass4',use:{...base.use,actionTimeout:15000,channel:'chrome',viewport:{width:1920,height:1080}}})
