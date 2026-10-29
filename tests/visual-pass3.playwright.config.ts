import {defineConfig} from '@playwright/test'
import base from './museum-navigation.playwright.config'
export default defineConfig({...base,testMatch:'visual-pass3.spec.ts',workers:1,timeout:240000,outputDir:'../test-results/visual-pass3',use:{...base.use,channel:'chrome',viewport:{width:1920,height:1080}}})
