import {defineConfig} from '@playwright/test'
import base from './museum-navigation.playwright.config'

export default defineConfig({...base,testMatch:'entrance-layout.spec.ts',workers:1,timeout:90000,
    outputDir:'../test-results/entrance-layout',
    use:{...base.use,channel:'chrome',viewport:{width:1920,height:1080},
        launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
})
