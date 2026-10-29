import {defineConfig} from '@playwright/test'
import base from './assembly.playwright.config'
export default defineConfig({...base,testMatch:'assembly-polish.spec.ts',workers:1,timeout:180000,outputDir:'../test-results/assembly-polish',webServer:{...base.webServer!,reuseExistingServer:true}})
