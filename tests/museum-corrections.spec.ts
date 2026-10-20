import {test,expect,type Page} from '@playwright/test'
import type {RootState} from '@react-three/fiber'
import {visitFixture,destination,flush,cameraState,cpu,storage} from './museum-visit-fixture'
const board='44444444-4444-4444-8444-444444444444',empty='55555555-5555-4555-8555-555555555555'
function fixtureCatalog(count=7){
 const categories=[{id:cpu,slug:'cpu',name_en:'Processors',name_fa:'پردازنده',active:true,sort_order:0},{id:board,slug:'user-defined-category',name_en:'Board collection',name_fa:'مجموعه مادربرد',active:true,sort_order:1}]
 const sections=[{id:cpu,slug:'cpu',title_en:'CPU collection',title_fa:'مجموعه پردازنده',active:true,sort_order:0},{id:board,slug:'user-defined-section',title_en:'Board exhibition',title_fa:'نمایشگاه مادربرد',active:true,sort_order:1}]
 const items=[{id:cpu,slug:'cpu',title_en:'Published processor',title_fa:'پردازنده منتشرشده',category_id:cpu,section_id:cpu,status:'published',sort_order:0,model_path:null},...Array.from({length:count},(_,i)=>({id:i===0?storage:`66666666-6666-4666-8666-${String(i).padStart(12,'0')}`,slug:`board-${i}`,title_en:i===0?'Computer Motherboard':`Board ${i}`,title_fa:`مادربرد ${i}`,category_id:board,section_id:board,status:'published',sort_order:i+1,model_path:i===1?null:`items/${i===0?storage:`board-${i}`}/motherboard.glb`}))]
 return {categories,sections,items}
}
async function probe(page:Page){return page.evaluate(async()=>{
 const f='/node_modules/.vite/deps/@react-three_fiber.js',t='/node_modules/.vite/deps/three.js'
 const roots=(await import(f))._roots,{Box3,Vector3}=await import(t),r=(Array.from(roots.values())[0] as {store:{getState:()=>RootState}}).store.getState()
 const core=r.scene.getObjectByName('shared-core-identity'),models:{id:string;min:number[];max:number[];center:number[]}[]=[]
 r.scene.traverse(node=>{if(node.name.startsWith('exhibit:')){const box=new Box3().setFromObject(node,true),point=box.getCenter(new Vector3()).project(r.camera);models.push({id:node.name.slice(8),min:box.min.toArray(),max:box.max.toArray(),center:[(point.x+1)*innerWidth/2,(1-point.y)*innerHeight/2]})}})
 const center=core?new Box3().setFromObject(core,true).getCenter(new Vector3()).project(r.camera):null
 return {models,core:core?.rotation.toArray().slice(0,3),corePoint:center?[(center.x+1)*innerWidth/2,(1-center.y)*innerHeight/2]:null,camera:r.camera.position.toArray()}
})}
async function selectBoard(page:Page){await page.getByRole('combobox',{name:'Select exhibit',exact:true}).selectOption({label:'Computer Motherboard'});await page.getByRole('button',{name:'Go to exhibit',exact:true}).click();await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','corridor');await expect.poll(async()=>(await cameraState(page)).mode,{timeout:15000}).toBe('explore')}
async function details(page:Page){await page.locator('[data-exhibit-id]>summary').click()}

test('CPU default uses assembled educational geometry without a decorative CORE or autoplay lesson',async({page})=>{
 await visitFixture(page);await destination(page,'cpu');expect((await probe(page)).core).toBeUndefined()
 await expect(page.getByRole('button',{name:'Explore CPU schematic',exact:true})).toBeVisible()
 const state=await page.evaluate(async()=>{const p='/src/features/museum/cpuExperienceState.ts';const s=(await import(p)).useCPUExperience.getState();return {exploded:s.exploded,lesson:s.lesson}})
 expect(state).toEqual({exploded:false,lesson:null});await expect(page.locator('canvas')).toHaveCount(1)
})

test('published motherboard loads in generic showcase with matching UUID and safe bounds, lazy pair only',async({page})=>{
 const catalog=fixtureCatalog(),requested=new Set<string>();page.on('request',r=>{if(r.url().includes('museum-models'))requested.add(r.url())})
 await visitFixture(page,{catalog});expect(requested.size).toBe(0)
 await selectBoard(page);await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','ready')
 await expect(page.locator('[data-exhibit-id]')).toHaveAttribute('data-exhibit-id',storage)
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-display-location','corridor')
 const scene=await probe(page),model=scene.models.find(i=>i.id===storage)!
 expect(model).toBeTruthy();expect(scene.models.length).toBeLessThanOrEqual(2);expect(requested.size).toBe(1)
 expect(model.max[0]).toBeLessThan(-2.45);expect(model.min[1]).toBeGreaterThanOrEqual(1.14)
 await details(page);await page.getByRole('button',{name:'VIEW GALLERY',exact:true}).click()
 await expect(page.getByRole('dialog').locator('img')).toHaveAttribute('src',new RegExp(storage))
 await page.getByRole('dialog').evaluate(el=>{el.setAttribute('tabindex','-1');(el as HTMLElement).focus()})
 await page.keyboard.press('Space');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape')
 await page.screenshot({path:'.tmp/phase08-corrections/board-desktop.png'})
 await flush(page);const before=await cameraState(page);await page.reload();await expect(page.locator('[data-exhibit-id]')).toHaveAttribute('data-exhibit-id',storage)
 await expect.poll(async()=>(await cameraState(page)).phase).toBe('ready')
 const after=await cameraState(page);expect(after.mode).toBe('explore');expect(after.position).toEqual(before.position)
 await expect.poll(async()=>(await probe(page)).models.some(m=>m.id===storage)).toBe(true)
})
test('physical showcase click selects the same record and pages through published models',async({page})=>{
 await visitFixture(page,{catalog:fixtureCatalog()});await destination(page,'corridor')
 // Face the existing left wall using the same command available to accessible navigation.
 await page.evaluate(async()=>{const n='/src/features/museum/navigationState.ts';(await import(n)).useMuseumNavigation.getState().visitShowcase(0)})
 await expect.poll(async()=>(await cameraState(page)).mode).toBe('explore')
 await expect.poll(async()=>(await probe(page)).models.some(m=>m.id===storage)).toBe(true)
 const center=(await probe(page)).models.find(m=>m.id===storage)!.center
 await page.mouse.click(center[0],center[1]);await expect(page.locator('[data-exhibit-id]')).toHaveAttribute('data-exhibit-id',storage)
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','ready')
 await page.getByRole('combobox',{name:'Select exhibit',exact:true}).selectOption({label:'Board 6'})
 await page.getByRole('button',{name:'Go to exhibit',exact:true}).click();await expect.poll(async()=>(await cameraState(page)).mode).toBe('explore')
 const id=fixtureCatalog().items.at(-1)!.id
 await expect.poll(async()=>(await probe(page)).models.some(m=>m.id===id)).toBe(true)
 expect((await probe(page)).models.length).toBeLessThanOrEqual(2)
 await expect(page.locator('[data-exhibit-id]')).toHaveAttribute('data-exhibit-id',id)
})
test('missing and broken GLBs show explicit unavailable states and retry without a substitute',async({page})=>{
 const catalog=fixtureCatalog(2),fixture=await visitFixture(page,{catalog});fixture.breakModel()
 await page.getByRole('combobox',{name:'Select exhibit',exact:true}).selectOption({label:'Board 1'})
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','missing')
 expect((await probe(page)).models.some(m=>m.id===catalog.items[2].id)).toBe(false)
 await selectBoard(page);await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','error')
 expect((await probe(page)).models.some(m=>m.id===storage)).toBe(false)
 await details(page);await expect(page.getByRole('button',{name:'Retry 3D model'})).toBeVisible()
 await page.screenshot({path:'.tmp/phase08-corrections/unavailable.png'})
 fixture.restoreModel();await page.getByRole('button',{name:'Retry 3D model'}).click()
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','ready')
})
test('new arbitrary taxonomy appears after reload, localizes, filters and retains empty sections',async({page})=>{
 const catalog=fixtureCatalog();await visitFixture(page,{catalog})
 catalog.categories.push({id:empty,slug:'brand-new-2026',name_en:'New empty category',name_fa:'دستهٔ تازه',active:true,sort_order:-1})
 catalog.sections.push({id:empty,slug:'brand-new-2026',title_en:'New empty section',title_fa:'بخش تازه',active:true,sort_order:-1})
 await page.getByRole('button',{name:'Reload collection',exact:true}).first().click()
 await expect(page.getByRole('combobox',{name:'Categories',exact:true}).locator('option').nth(1)).toHaveText('New empty category')
 await expect(page.locator('.museum-section-directory')).toHaveCount(0) // Sections are backend/CMS metadata.
 await page.getByRole('combobox',{name:'Categories',exact:true}).selectOption(empty)
 await expect(page.getByRole('combobox',{name:'Select exhibit',exact:true})).toBeDisabled()
 await expect(page.locator('[data-exhibit-id]')).toHaveCount(0)
 expect((await probe(page)).models.length).toBe(0)
 await page.evaluate(async id=>{const p='/src/features/museum/museumStore.ts';(await import(p)).useMuseumStore.getState().restoreSelection(null,id)},empty)
 await expect(page.locator('.museum-catalog-empty')).toBeVisible();await flush(page);await page.reload()
 await expect(page.locator('.museum-selected-section')).toHaveText('New empty section')
 await expect(page.getByRole('combobox',{name:'Select exhibit',exact:true})).toBeDisabled()
 await page.getByRole('button',{name:'FA',exact:true}).click()
 await expect(page.locator('.museum-selected-section')).toHaveText('بخش تازه')
 await expect(page.locator('html')).toHaveAttribute('dir','rtl')
 await page.screenshot({path:'.tmp/phase08-corrections/taxonomy-empty-rtl.png'})
})
test('Space toggles guided playback, ignores repeat, inputs, buttons, explore and Inspect',async({page})=>{
 await visitFixture(page)
 await page.getByRole('button',{name:'Guided tour',exact:true}).click();await page.locator('canvas').focus();await page.waitForTimeout(300)
 const prevented=await page.locator('canvas').evaluate(el=>!el.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',key:' ',bubbles:true,cancelable:true})))
 expect(prevented).toBe(true);expect((await cameraState(page)).playing).toBe(false)
 const progress=(await cameraState(page)).progress;await page.locator('canvas').dispatchEvent('keydown',{code:'Space',key:' ',repeat:true})
 expect((await cameraState(page)).playing).toBe(false)
 await page.keyboard.press('Space');expect((await cameraState(page)).playing).toBe(true)
 await page.getByRole('combobox',{name:'Categories',exact:true}).focus();await page.keyboard.press('Space');expect((await cameraState(page)).playing).toBe(true);await page.keyboard.press('Escape')
 for(const tag of ['input','textarea','div']){
  await page.evaluate(tag=>{const field=document.createElement(tag);field.id='space-owned-field';if(tag==='div')field.contentEditable='true';document.body.append(field);field.focus()},tag)
  await page.keyboard.press('Space');expect((await cameraState(page)).playing).toBe(true)
  await page.evaluate(()=>document.getElementById('space-owned-field')?.remove())
 }
 await page.getByRole('button',{name:'Pause tour',exact:true}).focus();await page.keyboard.press('Space');expect((await cameraState(page)).playing).toBe(false)
 expect(progress).toBeGreaterThan(0)
 await page.getByRole('button',{name:'Free Explore',exact:true}).click();await page.locator('canvas').focus();await page.keyboard.press('Space');expect((await cameraState(page)).mode).toBe('explore')
 await destination(page,'cpu');await page.getByRole('button',{name:'Explore CPU schematic',exact:true}).click();await page.locator('canvas').focus();await page.keyboard.press('Space');expect((await cameraState(page)).mode).toBe('inspect')
})
test('mobile Persian reduced-motion generic exhibition remains accessible with one Canvas',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'})
 await visitFixture(page,{catalog:fixtureCatalog(1)});await page.getByRole('button',{name:'FA',exact:true}).click()
 await page.getByRole('button',{name:'کنترل‌های حرکت',exact:true}).click()
 await page.getByRole('combobox',{name:'دسته‌ها',exact:true}).selectOption(board)
 await expect(page.locator('[data-exhibit-id]')).toHaveAttribute('data-exhibit-id',storage)
 await page.getByRole('button',{name:'رفتن به اثر',exact:true}).click()
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','ready')
 await expect(page.locator('canvas')).toHaveCount(1)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.getByRole('button',{name:'کنترل‌های حرکت',exact:true}).click()
 await page.screenshot({path:'.tmp/phase08-corrections/board-mobile-rtl.png'})
 await page.setViewportSize({width:844,height:390});await page.screenshot({path:'.tmp/phase08-corrections/board-landscape-rtl.png'})
})
test('reduced motion CPU default stays assembled and explicit schematic Inspect still works',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await visitFixture(page);await destination(page,'cpu')
 expect((await probe(page)).core).toBeUndefined()
 await page.getByRole('button',{name:'Explore CPU schematic',exact:true}).click()
 await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-inspection','active')
})
