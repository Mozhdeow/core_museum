import {test,expect,type Page} from '@playwright/test'
import {visitFixture,cpu,cameraState,destination} from './museum-visit-fixture'
import {hardwareGlb} from './hardware-fixture'
import {png} from './asset-fixtures'
const ids=Array.from({length:7},(_,i)=>`90000000-0000-4000-8000-${String(i).padStart(12,'0')}`)
function catalog(){return {
 categories:[{id:cpu,slug:'cpu',name_en:'CPU',name_fa:'پردازنده',active:true,sort_order:-1},...['gpu','memory','motherboard','storage','ssd','empty'].map((slug,i)=>({id:ids[i],slug,name_en:slug,name_fa:`دسته ${i}`,active:true,sort_order:i}))],sections:[],
 items:[{id:cpu,slug:'cpu',title_en:'Fixture CPU',category_id:cpu,status:'published',sort_order:-1,model_path:`items/${cpu}/cpu.glb`},...Array.from({length:5},(_,i)=>({id:ids[i],slug:`hardware-${i}`,title_en:i===3?'HDD hardware':`Hardware ${i}`,title_fa:`قطعه ${i}`,category_id:ids[i],status:'published',sort_order:i,model_path:`items/${ids[i]}/hardware.glb`,thumbnail_path:i===0?`items/${ids[0]}/thumbnail.png`:null})),{id:ids[6],slug:'second-gpu',title_en:'Second GPU',category_id:ids[0],status:'published',sort_order:7,model_path:`items/${ids[6]}/hardware.glb`}]
}}
async function read(page:Page,id=ids[0]){return page.evaluate(async({id,cpu})=>{
 const f='/node_modules/.vite/deps/@react-three_fiber.js',r=(await import(f))._roots.values().next().value.store.getState(),s=r.scene,p=s.getObjectByName(`showcase-presentation:${id}`),preview=s.getObjectByName(`showcase-preview:${id}`),m=p?.getObjectByName(`exhibit-transition:${id}`)
 let mounted=0;const solids:{count:number;wire:boolean;opacity:number;depthWrite:boolean}[]=[]
 s.traverse((o:import('three').Object3D)=>{if(o.name.startsWith('category-showcase:')&&o.name!==`category-showcase:${cpu}`)o.traverse(c=>{if(c.name.startsWith('exhibit:'))mounted++})})
 preview?.traverse((o:import('three').Object3D)=>{if(o.name.startsWith('preview-batch:')){const mesh=o as import('three').Mesh,material=mesh.material as import('three').MeshStandardMaterial;solids.push({count:mesh.geometry.index?.count??0,wire:material.wireframe,opacity:material.opacity,depthWrite:material.depthWrite})}})
 return {phase:p?.userData.phase,kind:preview?.userData.kind,preview:preview?.visible??false,previewOpacity:preview?.userData.opacity??0,modelOpacity:m?.userData.opacity??0,modelMounted:!!m,mounted,solids,thumbnail:!!preview?.getObjectByName('same-item-preview-thumbnail'),cameraZ:r.camera.position.z}
 },{id,cpu})}
async function approach(page:Page,index=0){await page.evaluate(async index=>{const p='/src/features/museum/navigationState.ts';(await import(p)).useMuseumNavigation.getState().visitShowcase(index)},index)}
async function atZ(page:Page,z:number){await page.evaluate(async z=>{
 const p='/src/features/museum/navigationState.ts',path='/src/features/museum/museumRoute.ts',route=(await import(path)).createMuseumRoute(),nav=(await import(p)).useMuseumNavigation
 let target=0,distance=Infinity;for(let i=0;i<=2000;i++){const d=Math.abs(route.getPointAt(i/2000).z-z);if(d<distance){target=i/2000;distance=d}}
 nav.getState().visit('corridor',true);nav.setState(s=>({request:{...s.request,target}}))
 },z)}
async function observe(page:Page){await page.evaluate(async({id,cpu})=>{
 const f='/node_modules/.vite/deps/@react-three_fiber.js',scene=(await import(f))._roots.values().next().value.store.getState().scene,samples:{model:number;preview:number;mounted:number}[]=[]
 ;(window as unknown as {visualSamples:typeof samples}).visualSamples=samples
 const end=performance.now()+25000
 function frame(){const model=scene.getObjectByName(`showcase-presentation:${id}`)?.getObjectByName(`exhibit-transition:${id}`),proxy=scene.getObjectByName(`showcase-preview:${id}`);let mounted=0
 scene.traverse((o:import('three').Object3D)=>{if(o.name.startsWith('category-showcase:')&&o.name!==`category-showcase:${cpu}`)o.traverse(c=>{if(c.name.startsWith('exhibit:'))mounted++})})
 samples.push({model:model?.userData.opacity??0,preview:proxy?.userData.opacity??0,mounted});if(performance.now()<end&&samples.length<1600)requestAnimationFrame(frame)}requestAnimationFrame(frame)
 },{id:ids[0],cpu})}
async function samples(page:Page){return page.evaluate(()=>(window as unknown as {visualSamples:{model:number;preview:number;mounted:number}[]}).visualSamples)}

test('approach and recession crossfade both ways, thresholds do not chatter, and the two-model budget survives handoff',async({page})=>{
 await visitFixture(page,{catalog:catalog(),asset:hardwareGlb()})
 await page.route('**/museum-images/**',route=>route.fulfill({contentType:'image/png',headers:{'access-control-allow-origin':'*'},body:png}))
 await observe(page);await approach(page)
 await expect.poll(async()=>(await read(page)).modelOpacity,{timeout:15000}).toBe(1)
 await expect.poll(async()=>(await cameraState(page)).mode).toBe('explore')
 await expect.poll(async()=>(await read(page)).thumbnail).toBe(true)
 await page.screenshot({path:'.tmp/phase08-showcase-final/near.png'})
 for(const z of [-2.8,-2.5,-2.2]){await atZ(page,z);await expect.poll(async()=>(await read(page)).cameraZ).toBeCloseTo(z,1);expect((await read(page)).phase).toBe('near')}
 await observe(page);await atZ(page,-1.9)
 await expect.poll(async()=>(await read(page)).previewOpacity).toBe(1)
 const outgoing=await samples(page);expect(outgoing.some(s=>s.model>0&&s.model<1&&s.preview>0&&s.preview<1)).toBe(true)
 expect(outgoing.filter(s=>s.model>0).every(s=>s.model+s.preview>.85)).toBe(true)
 for(const z of [-2.6,-2.85,-2.6]){await atZ(page,z);await expect.poll(async()=>(await read(page)).cameraZ).toBeCloseTo(z,1);expect((await read(page)).modelOpacity).toBe(0)}
 await observe(page);await atZ(page,-3.2);await expect.poll(async()=>(await read(page)).modelOpacity).toBe(1)
 expect((await samples(page)).some(s=>s.model>0&&s.model<1)).toBe(true)
 // Load hysteresis keeps the already hidden pair through the former five-metre boundary.
 for(const z of [-.35,-.65,-.25]){await atZ(page,z);await expect.poll(async()=>(await read(page)).cameraZ).toBeCloseTo(z,1);expect((await read(page)).modelMounted).toBe(true)}
 await observe(page);await atZ(page,.8);await expect.poll(async()=>(await read(page)).modelMounted).toBe(false)
 expect((await read(page)).previewOpacity).toBe(1);expect((await samples(page)).every(s=>s.mounted<=2)).toBe(true)
 await page.screenshot({path:'.tmp/phase08-showcase-final/receded.png'})
 await page.getByLabel('Categories',{exact:true}).selectOption(ids[0]);await page.getByRole('button',{name:'Next',exact:true}).click()
 await expect(page.locator('[data-exhibit-id]')).toHaveAttribute('data-exhibit-id',ids[6]);await expect(page.getByRole('button',{name:'Inspect selected model',exact:true})).toBeVisible()
 await expect.poll(async()=>(await read(page,ids[6])).kind).toBe('gpu')
 await page.getByRole('button',{name:'Inspect selected model',exact:true}).click();await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-inspection','active')
 await page.getByRole('button',{name:'Exit Inspect',exact:true}).click();await expect(page.locator('[data-museum-journey]')).toHaveAttribute('data-inspecting','false')
 await approach(page,2);await expect.poll(async()=>(await read(page,ids[2])).modelOpacity,{timeout:15000}).toBe(1);expect((await read(page,ids[2])).mounted).toBeLessThanOrEqual(2)
})

test('five populated hardware previews have solid category geometry, optional thumbnails and no distant generic GLBs; CPU stays authored solid',async({page})=>{
 const genericRequests:string[]=[];page.on('request',r=>{if(r.url().includes('/museum-models/')&&!r.url().includes(cpu))genericRequests.push(r.url())})
 await page.emulateMedia({reducedMotion:'reduce'});await visitFixture(page,{catalog:catalog(),asset:hardwareGlb()})
 for(const [i,kind] of ['gpu','memory','motherboard','hdd','ssd'].entries()){
  const preview=await read(page,ids[i]);expect(preview.kind).toBe(kind);expect(preview.preview).toBe(true);expect(preview.solids.length).toBeGreaterThanOrEqual(4)
  expect(preview.solids.every(s=>s.count>=36&&!s.wire&&s.opacity===1&&s.depthWrite)).toBe(true)
 }
 expect(genericRequests).toHaveLength(0)
 await page.screenshot({path:'.tmp/phase08-showcase-final/far.png'})
 // Hold real uploads so front-on screenshots document the procedural preview, never a fixture GLB.
 let release=()=>{};const gate=new Promise<void>(resolve=>{release=resolve})
 await page.route('**/storage/v1/object/public/museum-models/**',async route=>{if(route.request().url().includes(cpu))return route.continue();await gate;await route.fulfill({contentType:'model/gltf-binary',body:hardwareGlb()})})
 try{
  for(const i of [0,1,2,3,4]){
   await approach(page,i);await expect.poll(async()=>(await cameraState(page)).mode).toBe('explore')
   await expect.poll(async()=>(await read(page,ids[i])).previewOpacity).toBe(1)
   await page.screenshot({path:`.tmp/phase08-showcase-final/preview-${i}.png`})
   if(i<3){const z=(i<2?-5.5:-12.85)+4;await atZ(page,z);await expect.poll(async()=>(await read(page,ids[i])).cameraZ).toBeCloseTo(z,1);await page.screenshot({path:`.tmp/phase08-showcase-final/preview-far-${i}.png`})}
  }
  release()
  for(const i of [0,1,2]){
   await approach(page,i);await expect.poll(async()=>(await read(page,ids[i])).modelOpacity).toBe(1)
   await expect.poll(async()=>(await cameraState(page)).mode).toBe('explore')
   expect((await read(page,ids[i])).mounted).toBeLessThanOrEqual(2)
   await page.screenshot({path:`.tmp/phase08-showcase-final/real-near-${i}.png`})
  }
  await destination(page,'cpu');await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','ready')
  const cpuSurface=await page.evaluate(async id=>{const f='/node_modules/.vite/deps/@react-three_fiber.js',scene=(await import(f))._roots.values().next().value.store.getState().scene,c=scene.getObjectByName(`category-showcase:${id}`),materials:{wire:boolean;opacity:number;depth:boolean}[]=[]
   c?.traverse((o:import('three').Object3D)=>{if(o.name===`exhibit:${id}`)o.traverse(n=>{if('material' in n){const m=(n as import('three').Mesh).material;for(const mat of Array.isArray(m)?m:[m])materials.push({wire:(mat as import('three').MeshStandardMaterial).wireframe,opacity:mat.opacity,depth:mat.depthWrite})}})});return materials},cpu)
  expect(cpuSurface.length).toBeGreaterThan(0);expect(cpuSurface.every(m=>!m.wire&&m.opacity===1&&m.depth)).toBe(true)
  await page.screenshot({path:'.tmp/phase08-showcase-final/cpu-fixture.png'})
 }finally{release()}
})

test('failed real uploads retain unavailable state after recession, separate from populated previews and empty categories',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await visitFixture(page,{catalog:catalog(),asset:hardwareGlb()})
 await page.route(`**/museum-models/items/${ids[0]}/**`,route=>route.fulfill({status:404,body:'Controlled missing asset'}))
 await approach(page);await expect.poll(async()=>(await read(page)).phase).toBe('error')
 expect((await read(page)).preview).toBe(false)
 const empty=await page.evaluate(async id=>{const f='/node_modules/.vite/deps/@react-three_fiber.js',scene=(await import(f))._roots.values().next().value.store.getState().scene;return !!scene.getObjectByName(`showcase-empty:${id}`)},ids[5]);expect(empty).toBe(true)
 await page.screenshot({path:'.tmp/phase08-showcase-final/failed.png'})
 await destination(page,'entrance');await expect.poll(async()=>(await read(page)).modelMounted).toBe(false)
 expect((await read(page)).phase).toBe('error');expect((await read(page)).preview).toBe(false);expect((await read(page,ids[1])).preview).toBe(true)
 await page.getByLabel('Categories',{exact:true}).selectOption(ids[0]);await expect(page.getByRole('button',{name:'Inspect selected model',exact:true})).toHaveCount(0)
})
