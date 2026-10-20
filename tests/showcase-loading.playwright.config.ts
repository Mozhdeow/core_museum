import base from './museum-navigation.playwright.config'
import {defineConfig} from '@playwright/test'
export default defineConfig({...base,testMatch:'showcase-loading.spec.ts',timeout:45000,outputDir:'../test-results/showcase-loading'})
