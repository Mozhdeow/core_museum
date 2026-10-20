import {defineConfig} from '@playwright/test'
import base from './museum-navigation.playwright.config'
export default defineConfig({...base,testMatch:'museum-corrections.spec.ts',outputDir:'../test-results/corrections'})
