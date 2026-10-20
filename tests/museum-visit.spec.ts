import {test,expect} from '@playwright/test'
import {visitFixture,cameraState,destination,flush,visitor,storage} from './museum-visit-fixture'
const key=`core-museum-visit:${visitor}`
test('actual reload restores Entrance, Passage and completed CPU arrival without URL state or autoplay',async({page})=>{
 await visitFixture(page)
 for(const place of ['entrance','corridor','cpu'] as const){
  await destination(page,place);await flush(page);await page.reload()
  await expect.poll(async()=>(await cameraState(page)).phase).toBe('ready')
  await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location',place)
  expect((await cameraState(page)).playing).toBe(false);expect(new URL(page.url()).pathname+new URL(page.url()).search+new URL(page.url()).hash).toBe('/museum')
  await page.screenshot({path:`.tmp/phase08/restored-${place}.png`})
 }
 await expect(page.getByRole('button',{name:'Arrived',exact:true})).toBeDisabled()
})
test('Free Explore orientation, route return and page close/reopen use localStorage',async({page,context})=>{
 await visitFixture(page);await destination(page,'corridor');await page.getByRole('button',{name:'Free Explore',exact:true}).click()
 await page.keyboard.down('KeyQ');await page.keyboard.down('KeyW');await page.waitForTimeout(450);await page.keyboard.up('KeyQ');await page.keyboard.up('KeyW');await page.waitForTimeout(200)
 await flush(page);await page.reload();await expect.poll(async()=>(await cameraState(page)).phase).toBe('ready')
 const before=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('phase08-loaded-visit')!).pose)
 const restored=await cameraState(page);expect(restored.mode).toBe('explore');expect(restored.position).toEqual(before.position);restored.quaternion.forEach((v,i)=>expect(v).toBeCloseTo(before.quaternion[i],5))
 await page.getByRole('link',{name:'Exit',exact:true}).click();await page.goto('/museum');await expect.poll(async()=>(await cameraState(page)).mode).toBe('explore')
 await flush(page);await page.close();const reopened=await context.newPage();await reopened.goto('/museum');await expect.poll(async()=>(await cameraState(reopened)).mode).toBe('explore');expect((await cameraState(reopened)).position).toEqual(before.position)
})
test('paused and interrupted guided tour resumes only on Continue',async({page})=>{
 await visitFixture(page);await page.getByRole('button',{name:'Guided tour',exact:true}).click();await expect.poll(async()=>(await cameraState(page)).progress).toBeGreaterThan(.08)
 await flush(page);const saved=await cameraState(page);await page.reload();await expect.poll(async()=>(await cameraState(page)).phase).toBe('ready')
 expect((await cameraState(page)).progress).toBeGreaterThan(.05);expect((await cameraState(page)).playing).toBe(false)
 await page.waitForTimeout(300);expect((await cameraState(page)).progress).toBeLessThan(saved.progress+.03)
 await page.getByRole('button',{name:'Continue tour',exact:true}).click();await expect.poll(async()=>(await cameraState(page)).progress).toBeGreaterThan(saved.progress+.03)
})
test('Restart visit and explicit sign-out clear only the active visit; account switches isolate state',async({page})=>{
 await visitFixture(page);await destination(page,'cpu');await flush(page)
 await page.getByRole('button',{name:'Restart visit',exact:true}).click();await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','entrance')
 await destination(page,'corridor');await flush(page)
 await page.evaluate(()=>localStorage.setItem('phase08-account','66666666-6666-4666-8666-666666666666'));await page.reload()
 await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','entrance')
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).not.toBeNull()
 await page.evaluate(()=>localStorage.removeItem('phase08-account'));await page.reload();await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','corridor')
 await page.evaluate(async()=>{const p='/src/features/auth/authStore.ts';await(await import(p)).useAuthStore.getState().signOut()})
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull()
})
test('unavailable selections clear rather than substitute, while generic exhibition retains metadata and relevant mock answers',async({page})=>{
 const fixture=await visitFixture(page)
 await page.getByRole('combobox',{name:'Select exhibit'}).selectOption('1')
 await page.getByRole('button',{name:'Go to exhibit',exact:true}).click()
 await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','corridor')
 await expect(page.getByRole('heading',{name:'Published storage',exact:true})).toBeVisible()
 await page.locator('[data-exhibit-id]>summary').click();await page.getByRole('button',{name:'ASK CORE AI',exact:true}).click()
 await page.getByRole('textbox').fill('Explain this storage');await page.getByRole('textbox').press('Enter')
 await expect(page.locator('.museum-ai-answer')).toContainText('Recorded storage information');await expect(page.locator('.museum-ai-answer')).not.toContainText('GPU')
 await page.keyboard.press('Escape');await flush(page);await page.reload();await expect(page.locator('[data-exhibit-id]')).toHaveAttribute('data-exhibit-id',storage)
 await page.getByRole('combobox',{name:'Select exhibit'}).selectOption('0');await destination(page,'cpu');await flush(page);fixture.remove();await page.reload()
 await expect(page.locator('[data-exhibit-id]')).toHaveCount(0);await page.locator('.museum-empty-card>summary').click();await expect(page.getByText(/previously selected exhibit/)).toBeVisible()
})
test('stable model and schematic Inspect restore with a valid walking return; broken models fall back safely',async({page})=>{
 const fixture=await visitFixture(page,{model:true});await destination(page,'cpu');await page.getByRole('button',{name:'Free Explore',exact:true}).click()
 await expect(page.getByRole('button',{name:'Inspect selected model',exact:true})).toBeVisible();const walking=await cameraState(page)
 for(const action of ['Inspect selected model','Explore CPU schematic']){
  await page.getByRole('button',{name:action,exact:true}).click();await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-inspection','active');await flush(page);await page.reload()
  await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-inspection','active');await expect(page.locator('[data-cpu-view]')).toHaveAttribute('data-cpu-view',action==='Inspect selected model'?'model':'schematic')
  await page.keyboard.press('Escape');await expect.poll(async()=>(await cameraState(page)).mode).toBe('explore');expect((await cameraState(page)).position).toEqual(walking.position)
 }
 await page.getByRole('button',{name:'Inspect selected model',exact:true}).click();await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-inspection','active');await flush(page);fixture.breakModel();await page.reload();await expect.poll(async()=>(await cameraState(page)).phase).toBe('ready');expect((await cameraState(page)).mode).toBe('explore')
})
test('corrupt, expired and unsafe snapshots recover safely',async({page})=>{
 await visitFixture(page);await destination(page,'cpu');await flush(page)
 const original=await page.evaluate(k=>localStorage.getItem(k)!,key)
 for(const value of ['{broken',JSON.stringify({...JSON.parse(original),savedAt:0}),JSON.stringify({...JSON.parse(original),owner:'other'})]){
  await page.evaluate(([k,v])=>localStorage.setItem(k,v),[key,value]);await page.reload();await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','entrance')
 }
 await page.evaluate(([k,v])=>localStorage.setItem(k,JSON.stringify({...JSON.parse(v),pose:{position:[0,1.72,-27],quaternion:[0,0,0,0]}})),[key,original]);await page.reload();await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','cpu')
})
test('assembled educational CPU stays clear of the pedestal and mobile RTL overlays remain usable after restoration',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await visitFixture(page,{empty:true});await destination(page,'cpu');await flush(page);await page.reload()
 await expect(page.locator('canvas')).toHaveCount(1)
 const bounds=await page.evaluate(async()=>{const f='/node_modules/.vite/deps/@react-three_fiber.js',t='/node_modules/.vite/deps/three.js';const {_roots}=await import(f),{Box3,Vector3}=await import(t);const root=Array.from(_roots.values())[0] as {store:{getState:()=>{scene:{getObjectByName:(name:string)=>unknown}}}};const s=root.store.getState().scene;const model=s.getObjectByName('cpu-educational-schematic');const box=new Box3().setFromObject(model,true);return {size:box.getSize(new Vector3()).toArray(),bottom:box.min.y,shared:Boolean(s.getObjectByName('shared-core-identity'))}})
 expect(bounds.shared).toBe(false);expect(bounds.bottom).toBeGreaterThan(.95);expect(bounds.size[0]).toBeLessThan(4.5);expect(bounds.size[1]).toBeLessThan(3)
 await page.getByRole('button',{name:'FA',exact:true}).click();await page.screenshot({path:'.tmp/phase08/mobile-core-fa.png'})
 await page.getByRole('button',{name:'کاوش طرح آموزشی پردازنده',exact:true}).click();await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-inspection','active')
 await page.screenshot({path:'.tmp/phase08/mobile-schematic-fa.png'});await page.setViewportSize({width:844,height:390});await page.screenshot({path:'.tmp/phase08/landscape-schematic-fa.png'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('deliberate navigation cancels a restoration waiting for content',async({page})=>{
 const fixture=await visitFixture(page);await destination(page,'cpu');await flush(page);fixture.delay();await page.reload()
 await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','entrance')
 await page.getByRole('button',{name:'Skip to CPU Hall'}).click();await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','cpu')
 await destination(page,'entrance');fixture.release();await expect(page.getByRole('combobox',{name:'Select exhibit'})).toBeVisible()
 expect((await cameraState(page)).location).toBe('entrance')
})
test('temporary Auth restoration preserves the visit and denied museum storage leaves controls usable',async({page})=>{
 await visitFixture(page);await destination(page,'corridor');await flush(page)
 await page.evaluate(async()=>{const p='/src/features/auth/authStore.ts';const auth=(await import(p)).useAuthStore;auth.getState().invalidate(true);await auth.getState().initialize()})
 await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','corridor')
 await page.addInitScript(()=>{const read=Storage.prototype.getItem,write=Storage.prototype.setItem;Storage.prototype.getItem=function(k){if(k.startsWith('core-museum-visit:'))throw Error('denied');return read.call(this,k)};Storage.prototype.setItem=function(k,v){if(k.startsWith('core-museum-visit:'))throw Error('quota');write.call(this,k,v)}})
 await page.reload();await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','entrance');await destination(page,'cpu');await flush(page);expect((await cameraState(page)).location).toBe('cpu')
})

test('shared procedural textures and navigation listeners clean up on route exit',async({page})=>{
 await visitFixture(page,{empty:true});await destination(page,'cpu')
 await page.evaluate(async()=>{const f='/node_modules/.vite/deps/@react-three_fiber.js';const {_roots}=await import(f);const root=Array.from(_roots.values())[0] as {store:{getState:()=>{scene:{getObjectByName:(name:string)=>{traverse:(cb:(o:{material?:{map?:{addEventListener:(type:string,cb:()=>void)=>void}}})=>void)=>void}}}}};const maps=new Set<unknown>();(window as unknown as {disposed:number}).disposed=0;root.store.getState().scene.getObjectByName('cpu-layer:spreader').traverse(o=>{const map=o.material?.map;if(map&&!maps.has(map)){maps.add(map);map.addEventListener('dispose',()=>{(window as unknown as {disposed:number}).disposed++})}})})
 await page.evaluate(async()=>{const p='/src/app/router/index.tsx';await(await import(p)).router.navigate('/profile')})
 await expect(page.locator('canvas')).toHaveCount(0)
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {disposed:number}).disposed)).toBe(1)
 const request=await page.evaluate(async()=>{const n='/src/features/museum/navigationState.ts';return(await import(n)).useMuseumNavigation.getState().request.id})
 await page.keyboard.press('ArrowRight');expect(await page.evaluate(async()=>{const n='/src/features/museum/navigationState.ts';return(await import(n)).useMuseumNavigation.getState().request.id})).toBe(request)
 await page.goto('/museum');await expect(page.locator('canvas[data-camera-z]')).toBeVisible();await expect(page.locator('canvas')).toHaveCount(1)
})

test('same-document account switching cannot save the previous camera into the new visit',async({page})=>{
 await visitFixture(page);await destination(page,'cpu');await flush(page)
 await page.evaluate(async()=>{const p='/src/features/auth/authStore.ts';(await import(p)).useAuthStore.setState({user:{id:'66666666-6666-4666-8666-666666666666',name:'Other fixture',email:'other@example.invalid',role:'visitor'},isAuthenticated:true,isLoading:false})})
 await expect.poll(async()=>(await cameraState(page)).phase).toBe('ready');await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','entrance');await flush(page)
 const pose=await page.evaluate(()=>JSON.parse(localStorage.getItem('core-museum-visit:66666666-6666-4666-8666-666666666666')!).pose)
 expect(pose.position).toEqual([0,1.72,15.5]);expect(await page.evaluate(k=>localStorage.getItem(k),key)).not.toBeNull()
})
test('browser process close and reopen restores the visit from its isolated persistent profile',async({playwright},info)=>{
 const profile=info.outputPath('visitor-profile'),options={channel:'msedge',headless:true,baseURL:'http://127.0.0.1:5197'}
 const first=await playwright.chromium.launchPersistentContext(profile,options)
 let expected:number[]=[]
 try{
  const page=first.pages()[0];await visitFixture(page);await destination(page,'corridor')
  await page.getByRole('button',{name:'Free Explore',exact:true}).click();expected=(await cameraState(page)).position;await flush(page)
 }finally{await first.close()}
 const reopened=await playwright.chromium.launchPersistentContext(profile,options)
 try{
  const page=reopened.pages()[0];await visitFixture(page)
  await expect.poll(async()=>(await cameraState(page)).mode).toBe('explore')
  expect((await cameraState(page)).position).toEqual(expected)
  await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','corridor')
 }finally{await reopened.close()}
})
