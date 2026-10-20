import base from './museum-navigation.playwright.config'
import {defineConfig} from '@playwright/test'
export default defineConfig({...base,testMatch:'showcase-final.spec.ts',timeout:65000,outputDir:'../test-results/showcase-final'})
