import {test,expect,type Page} from '@playwright/test'
import {visitFixture,cpu} from './museum-visit-fixture'
import {hardwareGlb} from './hardware-fixture'
const ids=[0,1,2,3].map(i=>`80000000-0000-4000-8000-${String(i).padStart(12,'0')}`)
const record=(index:number,model:string|null)=>({id:ids[index],slug:`hardware-${index}`,title_en:`Hardware ${index}`,title_fa:`قطعه ${index}`,category_id:ids[index],status:'published',sort_order:index,model_path:model})
function catalog(){return {
 categories:[{id:cpu,slug:'cpu',name_en:'CPU',name_fa:'پردازنده',active:true,sort_order:-1},...['gpu','storage','memory','motherboard'].map((slug,i)=>({id:ids[i],slug,name_en:slug,name_fa:`دسته ${i}`,active:true,sort_order:i}))],
 sections:[],items:[{...record(0,null),id:cpu,category_id:cpu,sort_order:-1},record(0,`items/${ids[0]}/available.glb`),record(2,`items/${ids[2]}/failed.glb`),record(3,null)]}}
async function presentation(page:Page,id=ids[0]){return page.evaluate(async id=>{
 const f='/node_modules/.vite/deps/@react-three_fiber.js',root=(await import(f))._roots.values().next().value.store.getState(),scene=root.scene
 const group=scene.getObjectByName(`showcase-presentation:${id}`),preview=scene.getObjectByName(`showcase-preview:${id}`),scan=scene.getObjectByName(`showcase-scan:${id}`),transition=group?.getObjectByName(`exhibit-transition:${id}`)
 const materials:number[]=[],names:string[]=[];group?.traverse((o:import('three').Object3D)=>{names.push(o.name);if(o instanceof Object&&'material' in o&&o.name!==`showcase-scan:${id}`){const m=(o as import('three').Mesh).material;for(const material of Array.isArray(m)?m:[m])if(material)materials.push(material.opacity)}})
 return {phase:group?.userData.phase,preview:preview?.visible??false,previewOpacity:preview?.userData.opacity,modelOpacity:transition?.userData.opacity,modelVisible:transition?.visible??false,scanY:scan?.position.y,scanVisible:scan?.visible??false,materials,names}
 },id)}
async function approach(page:Page,index=0){await page.evaluate(async index=>{const p='/src/features/museum/navigationState.ts';(await import(p)).useMuseumNavigation.getState().visitShowcase(index)},index)}
async function midpoint(page:Page){await page.evaluate(async()=>{const p='/src/features/museum/navigationState.ts',nav=(await import(p)).useMuseumNavigation;nav.getState().visit('corridor',true);nav.setState(s=>({request:{...s.request,target:.46}}))})}


test('distant populated cases have cheap category outlines, with no eager GLB or loading copy',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(r.url().includes('/museum-models/'))requests.push(r.url())})
 await visitFixture(page,{catalog:catalog(),asset:hardwareGlb()})
 await expect.poll(async()=>(await presentation(page)).phase).toBe('far')
 const far=await presentation(page);expect(far.preview).toBe(true);expect(far.scanVisible).toBe(false);expect(far.modelVisible).toBe(false)
 expect(far.names.filter(n=>n.startsWith('showcase-unavailable:'))).toHaveLength(0)
 expect(far.materials.some(opacity=>opacity>0)).toBe(true);expect(requests).toHaveLength(0)
 const empty=await page.evaluate(async id=>{const f='/node_modules/.vite/deps/@react-three_fiber.js',s=(await import(f))._roots.values().next().value.store.getState().scene,c=s.getObjectByName(`category-showcase:${id}`);return {empty:!!c?.getObjectByName(`showcase-empty:${id}`),preview:!!c?.getObjectByName(`showcase-preview:${id}`)}},ids[1])
 expect(empty).toEqual({empty:true,preview:false})
 const missing=await presentation(page,ids[3]);expect(missing.phase).toBe('missing');expect(missing.preview).toBe(false)
 await page.screenshot({path:'.tmp/phase08-showcase-ux/far.png'})
})

test('mid-range scan prepares only the nearest pair; near GLB crossfades and restores authored material opacity',async({page})=>{
 await visitFixture(page,{catalog:catalog(),asset:hardwareGlb()})
 let release=()=>{};const gate=new Promise<void>(resolve=>{release=resolve}),requested:string[]=[]
 await page.route('**/storage/v1/object/public/museum-models/**',async route=>{requested.push(route.request().url());await gate;await route.fulfill({contentType:'model/gltf-binary',body:hardwareGlb()})})
 try{
  await midpoint(page)
  await expect.poll(async()=>(await presentation(page)).phase).toBe('preparing')
  const cameraZ=Number(await page.locator('canvas').getAttribute('data-camera-z'));expect(Math.abs(cameraZ+5.5)).toBeGreaterThan(2.5);expect(Math.abs(cameraZ+5.5)).toBeLessThan(5)
  await expect.poll(async()=>requested.length).toBe(1)
  const mid=await presentation(page);expect(mid.preview).toBe(true);expect(mid.scanVisible).toBe(true);expect(mid.modelVisible).toBe(false)
  // Pause camera motion only; the loading scan remains legible in a paused approach.
  await page.waitForTimeout(250);expect((await presentation(page)).scanY).not.toBe(mid.scanY)
  await page.screenshot({path:'.tmp/phase08-showcase-ux/mid.png'})
  release();await expect.poll(async()=>(await presentation(page)).modelOpacity).toBe(0)
  expect((await presentation(page)).phase).toBe('preparing')
  await page.evaluate(async id=>{
   const f='/node_modules/.vite/deps/@react-three_fiber.js',scene=(await import(f))._roots.values().next().value.store.getState().scene
   const samples:number[]=[];(window as unknown as {showcaseSamples:number[]}).showcaseSamples=samples
   const end=performance.now()+15000;function sample(){const m=scene.getObjectByName(`exhibit-transition:${id}`);if(m)samples.push(m.userData.opacity);if(performance.now()<end&&samples.length<600)requestAnimationFrame(sample)}requestAnimationFrame(sample)
  },ids[0])
  await approach(page)
  await expect.poll(async()=>(await presentation(page)).modelOpacity,{timeout:15000}).toBe(1)
  const near=await presentation(page);expect(near.phase).toBe('near');expect(near.preview).toBe(false);expect(near.modelVisible).toBe(true);expect(near.materials).toContain(1)
  const samples=await page.evaluate(()=>(window as unknown as {showcaseSamples:number[]}).showcaseSamples);expect(samples.some(v=>v>0&&v<1)).toBe(true)
  expect(requested).toHaveLength(1)
  await page.screenshot({path:'.tmp/phase08-showcase-ux/near.png'})
 }finally{release()}
})

test('a genuine GLB failure replaces the preview with unavailable copy, never an empty category',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 const fixture=await visitFixture(page,{catalog:catalog(),asset:hardwareGlb()});fixture.breakModel();await approach(page,2)
 await expect.poll(async()=>(await presentation(page,ids[2])).phase).toBe('error')
 const failed=await presentation(page,ids[2]);expect(failed.preview).toBe(false);expect(failed.modelVisible).toBe(false);expect(failed.names).toContain(`showcase-unavailable:${ids[2]}`)
 expect(failed.names.some(n=>n.startsWith('showcase-empty:'))).toBe(false)
 await page.screenshot({path:'.tmp/phase08-showcase-ux/failed.png'})
})

test('reduced-motion RTL uses a stationary preparation cue and completes the same reveal',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await visitFixture(page,{catalog:catalog(),asset:hardwareGlb()});await page.getByRole('button',{name:'FA',exact:true}).click()
 let release=()=>{};const gate=new Promise<void>(resolve=>{release=resolve})
 await page.route('**/storage/v1/object/public/museum-models/**',async route=>{await gate;await route.fulfill({contentType:'model/gltf-binary',body:hardwareGlb()})})
 try{
  await approach(page);await expect.poll(async()=>(await presentation(page)).phase).toBe('preparing')
  const before=await presentation(page);expect(before.scanVisible).toBe(true);await page.waitForTimeout(300);expect((await presentation(page)).scanY).toBe(before.scanY)
  release();await expect.poll(async()=>(await presentation(page)).modelOpacity).toBe(1)
  expect((await presentation(page)).preview).toBe(false);await expect(page.locator('html')).toHaveAttribute('dir','rtl');await expect(page.locator('canvas')).toHaveCount(1)
 }finally{release()}
})
