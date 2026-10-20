import {test,expect,type Page} from '@playwright/test'
import {visitFixture,cameraState,destination,flush,cpu} from './museum-visit-fixture'
import {hardwareGlb} from './hardware-fixture'
const cat=(i:number)=>`40000000-0000-4000-8000-${String(i).padStart(12,'0')}`
const item=(i:number)=>`50000000-0000-4000-8000-${String(i).padStart(12,'0')}`
function catalog(count=4){return {
 categories:Array.from({length:count},(_,i)=>({id:cat(i),slug:`category-${i}`,name_en:`Category ${i}`,name_fa:`دسته ${i}`,active:true,sort_order:i})),
 sections:[{id:cat(99),slug:'curatorial',title_en:'Curatorial section',title_fa:'بخش پژوهشی',active:true,sort_order:0}],
 items:Array.from({length:count+1},(_,i)=>({id:item(i),slug:`item-${i}`,title_en:`Hardware ${i}`,title_fa:`قطعه ${i}`,category_id:cat(i===count?0:i),section_id:cat(99),sort_order:i,status:'published',model_path:`items/${item(i)}/model.glb`}))}}
async function select(page:Page,id:string){await page.getByLabel('Categories',{exact:true}).selectOption(id)}
async function scene(page:Page){return page.evaluate(async()=>{
 const f='/node_modules/.vite/deps/@react-three_fiber.js',t='/node_modules/.vite/deps/three.js',root=(await import(f))._roots.values().next().value.store.getState(),{Box3,Vector3}=await import(t)
 const cases:string[]=[],models:{name:string;visible:boolean;size:number[]}[]=[]
 root.scene.traverse((o:import('three').Object3D)=>{if(o.name.startsWith('category-showcase:'))cases.push(o.name);if(o.name.startsWith('exhibit:')){let visible=true;for(let p:import('three').Object3D|null=o;p;p=p.parent)if(!p.visible)visible=false;models.push({name:o.name,visible,size:new Box3().setFromObject(o).getSize(new Vector3()).toArray()})}})
 return {cases,models}
})}

test('one case per category, synchronized carousel and lazy distant states; camera stays put',async({page})=>{
 await visitFixture(page,{catalog:catalog(),asset:hardwareGlb()});await select(page,cat(0));await destination(page,'corridor')
 await expect(page.getByRole('button',{name:'Inspect selected model',exact:true})).toBeVisible()
 const before=await cameraState(page)
 await expect.poll(async()=>(await scene(page)).cases.length).toBe(4)
 await expect(page.getByLabel('Category carousel',{exact:true})).toHaveText('1 / 2')
 await page.getByRole('button',{name:'Next',exact:true}).click()
 await expect(page.locator('[data-exhibit-id]')).toHaveAttribute('data-exhibit-id',item(4))
 await expect(page.getByLabel('Category carousel',{exact:true})).toHaveText('2 / 2')
 await expect(page.getByRole('button',{name:'Inspect selected model',exact:true})).toBeVisible()
 expect((await cameraState(page)).position).toEqual(before.position)
 const result=await scene(page);expect(result.models.filter(m=>m.visible).length).toBeLessThanOrEqual(2)
 expect(result.cases).toHaveLength(4)
 await page.getByRole('button',{name:'Go to exhibit',exact:true}).click();await expect.poll(async()=>(await cameraState(page)).mode,{timeout:15000}).toBe('explore')
 await page.screenshot({path:'.tmp/phase08-category/multi-item-category.png'})
 await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByLabel('Category carousel',{exact:true})).toHaveText('1 / 2')
})

test('cinematic navigation crosses category positions, Space pauses/resumes without teleport',async({page})=>{
 await visitFixture(page,{catalog:catalog(),asset:hardwareGlb()});await destination(page,'corridor');await select(page,cat(2))
 const before=await cameraState(page);await page.getByRole('button',{name:'Go to exhibit',exact:true}).click();await page.waitForTimeout(450)
 const moving=await cameraState(page);expect(moving.position[2]).toBeGreaterThan(-11);expect(moving.position[2]).not.toEqual(before.position[2])
 await page.locator('canvas').focus();await page.keyboard.press('Space');expect((await cameraState(page)).playing).toBe(false)
 await page.waitForTimeout(450);const paused=await cameraState(page);await page.waitForTimeout(500)
 expect(Math.abs((await cameraState(page)).position[2]-paused.position[2])).toBeLessThan(.1)
 await page.keyboard.press('Space');await expect.poll(async()=>(await cameraState(page)).mode,{timeout:15000}).toBe('explore')
 const arrived=await cameraState(page);expect(arrived.position[2]).toBeCloseTo(-11.75,0);expect(Math.abs(arrived.position[0])).toBeLessThan(2.45)
 expect(Math.abs(arrived.quaternion[1])).toBeGreaterThan(.3)
})

test('CPU tall flat GLB has a broad front surface; missing CPU uses the educational assembly',async({page})=>{
 const data={categories:[{id:cpu,slug:'cpu',name_en:'Processors',name_fa:'پردازنده',active:true,sort_order:0}],sections:[],items:[{id:cpu,slug:'processor',title_en:'Computer Processor',title_fa:'پردازنده',category_id:cpu,status:'published',sort_order:0,model_path:`items/${cpu}/model.glb`},{id:item(9),slug:'missing',title_en:'CPU without upload',title_fa:'بدون مدل',category_id:cpu,status:'published',sort_order:1,model_path:null}]}
 await visitFixture(page,{catalog:data,model:true,asset:hardwareGlb()});await destination(page,'cpu')
 await expect(page.getByRole('button',{name:'Inspect selected model',exact:true})).toBeVisible()
 await expect.poll(async()=>(await scene(page)).models.some(m=>m.visible&&m.name===`exhibit:${cpu}`&&m.size[0]>1.8&&m.size[1]>.5&&m.size[2]<.1)).toBe(true)
 await page.screenshot({path:'.tmp/phase08-category/cpu-front.png'})
 await page.getByRole('button',{name:'Next',exact:true}).click()
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','missing')
 await expect(page.getByRole('button',{name:'Inspect selected model',exact:true})).toHaveCount(0)
 expect((await scene(page)).models.some(m=>m.visible)).toBe(false)
 const assembled=await page.evaluate(async()=>{const f='/node_modules/.vite/deps/@react-three_fiber.js',r=(await import(f))._roots.values().next().value.store.getState();return r.scene.getObjectByName('cpu-educational-schematic')?.visible});expect(assembled).toBe(true)
 await page.getByRole('button',{name:'Explore CPU schematic',exact:true}).click()
 await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-view','schematic')
})

test('selected cached GLB Inspect is available immediately, supports full orbit and restores walking pose',async({page})=>{
 await visitFixture(page,{catalog:catalog(),asset:hardwareGlb()});await select(page,cat(0));await destination(page,'corridor')
 for(let i=0;i<3;i++){
  await page.getByRole('button',{name:'Next',exact:true}).click()
  await expect(page.getByRole('button',{name:'Inspect selected model',exact:true})).toBeVisible()
 }
 const before=await cameraState(page)
 await page.getByRole('button',{name:'Inspect selected model',exact:true}).click();await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-inspection','active')
 await page.locator('canvas').focus();for(let i=0;i<38;i++)await page.keyboard.press('ArrowRight');for(let i=0;i<30;i++)await page.keyboard.press('ArrowDown')
 await expect.poll(async()=>(await cameraState(page)).position[1]).toBeLessThan(0)
 for(let i=0;i<55;i++)await page.keyboard.press('ArrowUp');await expect.poll(async()=>(await cameraState(page)).position[1]).toBeGreaterThan(5)
 await page.getByRole('button',{name:'Reset view',exact:true}).click();await page.locator('canvas').hover();await page.mouse.wheel(0,-500)
 await page.getByRole('button',{name:'Exit Inspect',exact:true}).click();await expect(page.locator('[data-museum-journey]')).toHaveAttribute('data-inspecting','false')
 const after=await cameraState(page);after.position.forEach((v,i)=>expect(v).toBeCloseTo(before.position[i],2))
 await flush(page);await page.reload();await expect(page.getByRole('button',{name:'Inspect selected model',exact:true})).toBeVisible()
 await expect(page.getByLabel('Category carousel',{exact:true})).toHaveText('2 / 2');expect(await page.locator('canvas').count()).toBe(1)
})

test('refresh introduces additional category cases, extension remains navigable and restores after reload',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});const data=catalog(6)
 await visitFixture(page,{catalog:data,asset:hardwareGlb()});await select(page,cat(5));await page.getByRole('button',{name:'Go to exhibit',exact:true}).click()
 await expect.poll(async()=>(await cameraState(page)).position[2]).toBeCloseTo(25.1,1)
 data.categories.push({id:cat(6),slug:'new',name_en:'New category',name_fa:'دسته تازه',active:true,sort_order:6})
 data.items=data.items.filter(i=>i.id!==item(6))
 await page.getByRole('button',{name:'Reload collection',exact:true}).click()
 await expect(page.getByLabel('Categories',{exact:true}).locator('option')).toHaveCount(8)
 await expect.poll(async()=>(await scene(page)).cases.length).toBe(7)
 await select(page,cat(6));await expect(page.locator('.museum-catalog-empty')).toBeVisible()
 await select(page,cat(5));await flush(page);await page.reload()
 await expect.poll(async()=>(await cameraState(page)).position[2]).toBeCloseTo(25.1,1)
 await expect(page.getByLabel('Categories',{exact:true})).toHaveValue(cat(5))
})

test('mobile RTL reduced-motion model orbit and pinch remain usable',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage()
 try{
  await visitFixture(page,{catalog:catalog(),asset:hardwareGlb()});await page.getByRole('button',{name:'FA',exact:true}).click();await page.getByRole('button',{name:'کنترل‌های حرکت',exact:true}).click()
  await page.getByLabel('دسته‌ها',{exact:true}).selectOption(cat(0));await expect(page.locator('.cpu-inspect-entry button').first()).toBeVisible()
  await page.locator('.cpu-inspect-entry button').first().click();await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-inspection','active')
  const canvas=page.locator('canvas'),before=Number(await canvas.getAttribute('data-inspect-distance')),cdp=await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:110,y:240,id:0},{x:240,y:240,id:1}]})
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:145,y:240,id:0},{x:205,y:240,id:1}]})
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  await expect.poll(async()=>Number(await canvas.getAttribute('data-inspect-distance'))).toBeGreaterThan(before)
  await page.screenshot({path:'.tmp/phase08-category/mobile-rtl.png'})
 }finally{await context.close()}
})
