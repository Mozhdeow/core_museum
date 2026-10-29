import {defineConfig} from '@playwright/test'
import base from './museum-navigation.playwright.config'

export default defineConfig({...base,testMatch:'elevator-gallery.spec.ts',workers:1,timeout:180000,expect:{timeout:20000},
    outputDir:'../test-results/elevator-gallery',
    use:{...base.use,channel:'chrome',viewport:{width:1440,height:900},
        launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
})
