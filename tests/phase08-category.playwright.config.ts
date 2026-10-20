import base from './museum-navigation.playwright.config'
import {defineConfig} from '@playwright/test'
export default defineConfig({...base,testMatch:'phase08-category.spec.ts',timeout:60000,outputDir:'../test-results/phase08-category'})
