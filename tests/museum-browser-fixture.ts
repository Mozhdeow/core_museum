import {expect,type Page} from '@playwright/test'
import {makeGlb,png} from './asset-fixtures'
export async function setup(page:Page,withModel=false,failData=false,options:{published?:boolean;category?:string;gallery?:boolean;galleryDisabled?:boolean;brokenImage?:boolean;thumbnail?:boolean}={}){
 await page.route('**/*',route=>{
  const url=new URL(route.request().url())
  if(url.hostname==='core-navigation.supabase.co'){
   if(url.pathname.includes('/storage/')){
    if(url.pathname.includes('museum-images'))return options.brokenImage?route.fulfill({status:404,body:'Missing'}):route.fulfill({status:200,contentType:'image/png',body:png})
    return route.fulfill({status:200,contentType:'model/gltf-binary',body:makeGlb()})
   }
   const table=url.pathname.split('/').at(-1)
   if(failData)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Offline'})})
   const published=withModel||options.published,category=options.category??'cpu'
   const data=table==='gallery_images'&&options.gallery?[{id:'gallery-1',item_id:'cpu-id',storage_path:'items/cpu-id/first.png',caption_en:'First exhibit image',caption_fa:'تصویر نخست اثر',sort_order:0},{id:'gallery-2',item_id:'cpu-id',storage_path:'items/cpu-id/second.png',caption_en:'Second exhibit image',caption_fa:'تصویر دوم اثر',sort_order:1}]:table==='museum_items'&&published?[{id:'cpu-id',slug:'published-cpu',title_en:category==='cpu'?'Published CPU':'sssssss',title_fa:'پردازنده منتشرشده',status:'published',category_id:'category-id',section_id:'section-id',thumbnail_path:options.thumbnail?'items/cpu-id/thumb.png':null,enable_gallery:!options.galleryDisabled,model_path:withModel?'items/cpu-id/model.glb':null,sort_order:0}]:table==='categories'?[{id:'category-id',slug:category,name_en:category==='cpu'?'Processors':'Storage',name_fa:'پردازنده',active:true,sort_order:0}]:table==='museum_sections'?[{id:'section-id',slug:category,title_en:category==='cpu'?'CPU Hall':'Storage collection',title_fa:'تالار پردازنده',active:true,sort_order:0}]:[]
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)})
  }
  if(['127.0.0.1','localhost'].includes(url.hostname)||!['http:','https:'].includes(url.protocol))return route.continue()
  return route.abort()
 })
 await page.addInitScript(()=>{localStorage.setItem('core-locale','en');localStorage.setItem('core_intro_last_seen_at',String(Date.now()));localStorage.setItem('core_intro_last_full_seen_at',String(Date.now()))})
 await page.goto('/login')
 await page.evaluate(async()=>{
  const auth='/src/features/auth/authStore.ts',routing='/src/app/router/index.tsx'
  ;(await import(auth)).useAuthStore.setState({user:{id:'navigation-visitor',role:'visitor',name:'Visitor'},isAuthenticated:true,isAdmin:false,isLoading:false})
  await (await import(routing)).router.navigate('/museum')
 })
 await expect(page.locator('canvas[data-camera-z]')).toBeVisible({timeout:15000})
 return {recover:()=>{failData=false}}
}
