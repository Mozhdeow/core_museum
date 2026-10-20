import {expect,type Page} from '@playwright/test'
import {makeGlb,png} from './asset-fixtures'
export const visitor='11111111-1111-4111-8111-111111111111',cpu='22222222-2222-4222-8222-222222222222',storage='33333333-3333-4333-8333-333333333333'
export async function visitFixture(page:Page,options:{asset?:Buffer;model?:boolean;empty?:boolean;slow?:boolean;catalog?:{categories:unknown[];sections:unknown[];items:unknown[]}}={}){
 let removed=false,broken=false,release=()=>{}
 const gate=new Promise<void>(r=>{release=r})
 await page.context().route('**/*',async route=>{
  const u=new URL(route.request().url())
  if(u.hostname==='core-navigation.supabase.co'){
   if(u.pathname.includes('/storage/'))return broken?route.fulfill({status:404,body:'Missing'}):route.fulfill({status:200,contentType:u.pathname.includes('museum-images')?'image/png':'model/gltf-binary',body:u.pathname.includes('museum-images')?png:options.asset??makeGlb()})
   if(u.pathname.includes('/auth/'))return route.fulfill({status:204})
   if(options.slow&&!u.pathname.endsWith('profiles'))await gate
   const owner=u.searchParams.get('id')?.replace('eq.','')??visitor
   const data=u.pathname.endsWith('profiles')?{id:owner,email:'fixture@example.invalid',full_name:'Visitor',role:'user',preferred_locale:'en',created_at:'2026-10-01',updated_at:'2026-10-01'}:
    u.pathname.endsWith('categories')?[{id:cpu,slug:'cpu',name_en:'Processors',name_fa:'پردازنده',active:true,sort_order:0},{id:storage,slug:'storage',name_en:'Storage',name_fa:'ذخیره‌سازی',active:true,sort_order:1}]:
    u.pathname.endsWith('museum_sections')?[{id:cpu,slug:'cpu',title_en:'CPU collection',title_fa:'مجموعه پردازنده',active:true,sort_order:0},{id:storage,slug:'storage',title_en:'Storage collection',title_fa:'مجموعه ذخیره‌سازی',active:true,sort_order:1}]:
    u.pathname.endsWith('museum_items')?options.empty?[]:[...(removed?[]:[{id:cpu,slug:'fixture-cpu',title_en:'Published processor',title_fa:'پردازندهٔ منتشرشده',category_id:cpu,section_id:cpu,sort_order:0,status:'published',description_en:'Recorded CPU information',description_fa:'اطلاعات ثبت‌شدهٔ پردازنده',model_path:options.model?`items/${cpu}/model.glb`:null,enable_gallery:true,enable_ai_curator:true}]),{id:storage,slug:'fixture-storage',title_en:'Published storage',title_fa:'ذخیره‌ساز منتشرشده',category_id:storage,section_id:storage,sort_order:1,status:'published',description_en:'Recorded storage information',description_fa:'اطلاعات ثبت‌شدهٔ ذخیره‌ساز',model_path:null,enable_gallery:true,enable_ai_curator:true}]:
    u.pathname.endsWith('gallery_images')?[{id:cpu,item_id:storage,storage_path:`items/${storage}/gallery/image.png`,caption_en:'Storage image',caption_fa:'تصویر ذخیره‌ساز',sort_order:0}]:[]
   const table=u.pathname.split('/').at(-1),custom=table==='categories'?options.catalog?.categories:table==='museum_sections'?options.catalog?.sections:table==='museum_items'?options.catalog?.items:undefined
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(custom??data)})
  }
  return ['127.0.0.1','localhost'].includes(u.hostname)||!['http:','https:'].includes(u.protocol)?route.continue():route.abort()
 })
 await page.context().addInitScript(owner=>{
  const account=localStorage.getItem('phase08-account')??owner
  sessionStorage.setItem('phase08-loaded-visit',localStorage.getItem(`core-museum-visit:${account}`)??'null')
  const payload=btoa(JSON.stringify({sub:account,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'}))
  localStorage.setItem('sb-core-navigation-auth-token',JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.fixture`,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:account,email:'fixture@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-01T00:00:00Z'}}))
  if(!localStorage.getItem('core-locale'))localStorage.setItem('core-locale','en')
  localStorage.setItem('core_intro_last_seen_at',String(Date.now()));localStorage.setItem('core_intro_last_full_seen_at',String(Date.now()))
 },visitor)
 if(!options.slow){await page.goto('/museum');await expect(page.locator('canvas[data-camera-z]')).toBeVisible({timeout:15000})}
 return {remove:()=>{removed=true},breakModel:()=>{broken=true},restoreModel:()=>{broken=false},delay:()=>{options.slow=true},release}
}
export async function cameraState(page:Page){
 await expect(page.locator('canvas[data-camera-z]')).toBeVisible()
 return page.evaluate(async()=>{
 const f='/node_modules/.vite/deps/@react-three_fiber.js',n='/src/features/museum/navigationState.ts',r='/src/features/museum/visitRuntime.ts'
 const roots=(await import(f))._roots,root=Array.from(roots.values())[0] as {store:{getState:()=>{camera:{position:{toArray():number[]};quaternion:{toArray():number[]}}}}}
 const c=root.store.getState().camera,nav=(await import(n)).useMuseumNavigation.getState()
 return {position:c.position.toArray(),quaternion:c.quaternion.toArray(),mode:nav.mode,playing:nav.playing,progress:nav.progress,location:nav.location,phase:(await import(r)).useVisitRuntime.getState().phase}
})}
export async function destination(page:Page,place:'entrance'|'corridor'|'cpu'){
 await page.evaluate(async place=>{const p='/src/features/museum/navigationState.ts';(await import(p)).useMuseumNavigation.getState().visit(place,true)},place)
 await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location',place)
}
export async function flush(page:Page){await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')))}
