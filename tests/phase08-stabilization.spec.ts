import {test,expect} from '@playwright/test'
import {BoxGeometry,type Mesh} from 'three'
import {makeGlb,triangleDocument} from './asset-fixtures'
import {visitFixture,cameraState,destination,flush} from './museum-visit-fixture'
const ids=['44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666','77777777-7777-4777-8777-777777777777']
function board(){
 const g=new BoxGeometry(3,.04,2),positions=g.getAttribute('position'),normals=g.getAttribute('normal')
 const p=Buffer.from(positions.array.buffer),n=Buffer.from(normals.array.buffer),ix=Buffer.from(g.index!.array.buffer)
 const data=Buffer.concat([p,n,ix]),doc={asset:{version:'2.0'},buffers:[{byteLength:data.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:p.length},{buffer:0,byteOffset:p.length,byteLength:n.length},{buffer:0,byteOffset:p.length+n.length,byteLength:ix.length}],accessors:[{bufferView:0,componentType:5126,count:positions.count,type:'VEC3',min:[-1.5,-.02,-1],max:[1.5,.02,1]},{bufferView:1,componentType:5126,count:normals.count,type:'VEC3'},{bufferView:2,componentType:5123,count:g.index!.count,type:'SCALAR'}],materials:[{pbrMetallicRoughness:{baseColorFactor:[.1,.65,.25,1],metallicFactor:.1,roughnessFactor:.5},doubleSided:true}],meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1},indices:2,material:0}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0}
 g.dispose();return makeGlb(doc,data)
}
function catalog(){
 const names=['GPU','Memory','Motherboard','Future']
 return {categories:ids.map((id,i)=>({id,slug:names[i].toLowerCase(),name_en:names[i],name_fa:`دسته ${i}`,active:true,sort_order:i})),sections:ids.map((id,i)=>({id,slug:`room-${i}`,title_en:`Section ${i}`,title_fa:`بخش ${i}`,active:true,sort_order:i})),items:ids.map((id,i)=>({id,slug:`item-${i}`,title_en:`Actual ${names[i]}`,title_fa:`اثر ${i}`,category_id:id,section_id:ids[(i+1)%4],sort_order:i,status:'published',model_path:`items/${id}/model.glb`}))}
}
for(const [index,name] of ['GPU','Memory','Motherboard','Future'].entries())test(`${name}: category browse stays still, explicit navigation animates to the selected UUID`,async({page})=>{
 await visitFixture(page,{catalog:catalog(),asset:board()})
 const before=await cameraState(page)
 await page.getByLabel('Categories',{exact:true}).selectOption(ids[index]);await page.waitForTimeout(350)
 expect((await cameraState(page)).position).toEqual(before.position)
 await expect(page.locator('[data-exhibit-id]')).toHaveAttribute('data-exhibit-id',ids[index])
 await page.getByRole('button',{name:'Go to exhibit',exact:true}).click()
 await page.waitForTimeout(400);const moving=await cameraState(page)
 expect(moving.position[2]).toBeLessThan(before.position[2]);expect(moving.position[2]).toBeGreaterThan(-4)
 await expect.poll(async()=>(await cameraState(page)).mode,{timeout:15000}).toBe('explore')
 const arrived=await cameraState(page);expect(arrived.position[2]).toBeCloseTo(index<2?-4.4:-11.75,0)
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','ready')
 await expect(page.getByLabel('Museum sections',{exact:true})).toHaveCount(0)
 if(index===2)await page.screenshot({path:'.tmp/phase08-stabilization/board-arrival.png'})
 await flush(page);await page.reload()
 await expect(page.getByLabel('Categories',{exact:true})).toHaveValue(ids[index])
 await expect.poll(async()=>(await cameraState(page)).phase).toBe('ready')
 const restored=await cameraState(page);restored.position.forEach((v,i)=>expect(v).toBeCloseTo(arrived.position[i],2))
 await expect(page.locator('[data-exhibit-id]')).toHaveAttribute('data-exhibit-id',ids[index])
 const side=await page.evaluate(async id=>{const f='/node_modules/.vite/deps/@react-three_fiber.js',t='/node_modules/.vite/deps/three.js',r=(await import(f))._roots.values().next().value.store.getState(),{Box3}=await import(t),model=r.scene.getObjectByName('exhibit:'+id);return model?new Box3().setFromObject(model).max.x:null},ids[index])
 await expect.poll(async()=>page.evaluate(async id=>{const f='/node_modules/.vite/deps/@react-three_fiber.js';return !!(await import(f))._roots.values().next().value.store.getState().scene.getObjectByName('exhibit:'+id)},ids[index])).toBe(true)
 if(side!==null&&index%2===0)expect(side).toBeLessThan(-2.45)
})
test('shared real-model Inspect supports the back, top, underside, zoom and exact return after reload',async({page})=>{
 await visitFixture(page,{catalog:catalog(),asset:board()})
 await page.getByLabel('Categories',{exact:true}).selectOption(ids[0]);await page.getByRole('button',{name:'Go to exhibit',exact:true}).click()
 await expect.poll(async()=>(await cameraState(page)).mode,{timeout:15000}).toBe('explore')
 const before=await cameraState(page)
 await page.getByRole('button',{name:'Inspect selected model',exact:true}).click()
 await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-inspection','active')
 await expect(page.getByRole('button',{name:'Inside a CPU',exact:true})).toHaveCount(0)
 const canvas=page.locator('canvas');await canvas.focus()
 for(let i=0;i<38;i++)await page.keyboard.press('ArrowRight')
 for(let i=0;i<25;i++)await page.keyboard.press('ArrowDown')
 await page.waitForTimeout(1000)
 const below=await cameraState(page);expect(below.position[1]).toBeLessThan(0);expect(below.position[2]).toBeLessThan(-27)
 await page.screenshot({path:'.tmp/phase08-stabilization/inspect-underside.png'})
 for(let i=0;i<52;i++)await page.keyboard.press('ArrowUp')
 await page.waitForTimeout(800);expect((await cameraState(page)).position[1]).toBeGreaterThan(5)
 await page.getByRole('button',{name:'Reset view',exact:true}).click();await page.waitForTimeout(800)
 await canvas.hover();await page.mouse.wheel(0,-1200);await page.waitForTimeout(300)
 expect(Number(await canvas.getAttribute('data-inspect-distance'))).toBeGreaterThanOrEqual(3.4)
 await flush(page);await page.reload();await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-inspection','active',{timeout:15000})
 await page.getByRole('button',{name:'Exit Inspect',exact:true}).click();await expect(page.locator('[data-museum-journey]')).toHaveAttribute('data-inspecting','false')
 const after=await cameraState(page);after.position.forEach((v,i)=>expect(v).toBeCloseTo(before.position[i],2))
 expect(await page.locator('canvas').count()).toBe(1)
})
test('CPU defaults to assembled educational geometry; a renderable published CPU takes precedence',async({page})=>{
 await visitFixture(page,{model:true,asset:board()});await destination(page,'cpu')
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','ready')
 const visibility=()=>page.evaluate(async()=>{const path='/node_modules/.vite/deps/@react-three_fiber.js',r=(await import(path))._roots.values().next().value.store.getState();return {real:!!r.scene.getObjectByName('exhibit:'+ '22222222-2222-4222-8222-222222222222'),schematic:r.scene.getObjectByName('cpu-layer:spreader')?.parent?.parent?.visible,core:!!r.scene.getObjectByName('core-identity')}})
 expect((await visibility()).real).toBe(true)
 await page.getByLabel('Categories',{exact:true}).selectOption('33333333-3333-4333-8333-333333333333')
 await expect(page.getByRole('button',{name:'Explore CPU schematic',exact:true})).toBeVisible()
 await page.screenshot({path:'.tmp/phase08-stabilization/cpu-default.png'})
 const result=await visibility();expect(result.core).toBe(false)
 await page.getByRole('button',{name:'Explore CPU schematic',exact:true}).click();await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-inspection','active')
})

test('fully transparent uploaded geometry reports an error and keeps the educational fallback',async({page})=>{
 const doc=triangleDocument() as ReturnType<typeof triangleDocument>&{materials?:unknown[]}
 doc.materials=[{alphaMode:'BLEND',pbrMetallicRoughness:{baseColorFactor:[1,1,1,0]}}]
 Object.assign(doc.meshes[0].primitives[0],{material:0})
 await visitFixture(page,{model:true,asset:makeGlb(doc)});await destination(page,'cpu')
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','error')
 await expect(page.getByRole('button',{name:'Inspect selected model',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Explore CPU schematic',exact:true})).toBeVisible()
 await page.screenshot({path:'.tmp/phase08-stabilization/invisible-model-fallback.png'})
})
test('mobile Persian reduced-motion Inspect accepts real touch drag and pinch with bounded framing',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'})
 const page=await context.newPage()
 try{
  await visitFixture(page,{catalog:catalog(),asset:board()});await page.getByRole('button',{name:'FA',exact:true}).click()
  await page.getByRole('button',{name:'کنترل‌های حرکت',exact:true}).click()
  await page.getByLabel('دسته‌ها',{exact:true}).selectOption(ids[1])
  await page.getByRole('button',{name:'رفتن به اثر',exact:true}).click()
  await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','ready')
  await page.locator('.cpu-inspect-entry button').first().click();await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-inspection','active')
  const canvas=page.locator('canvas'),before=Number(await canvas.getAttribute('data-orbit-yaw')),cdp=await context.newCDPSession(page)
  const send=(type:string,touchPoints:{x:number;y:number;id:number}[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints})
  await send('touchStart',[{x:100,y:250,id:0}]);await send('touchMove',[{x:275,y:280,id:0}]);await send('touchEnd',[])
  await expect.poll(async()=>Number(await canvas.getAttribute('data-orbit-yaw'))).not.toBe(before)
  const distance=Number(await canvas.getAttribute('data-inspect-distance'))
  await send('touchStart',[{x:110,y:250,id:0},{x:240,y:250,id:1}]);await send('touchMove',[{x:145,y:250,id:0},{x:205,y:250,id:1}]);await send('touchEnd',[])
  await expect.poll(async()=>Number(await canvas.getAttribute('data-inspect-distance'))).toBeGreaterThan(distance)
  await page.screenshot({path:'.tmp/phase08-stabilization/inspect-mobile-rtl.png'})
  expect(await page.locator('canvas').count()).toBe(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.setViewportSize({width:844,height:390});await page.screenshot({path:'.tmp/phase08-stabilization/inspect-landscape-rtl.png'})
 }finally{await context.close()}
})

test('a backwards single-sided CPU GLB produces visible pixels on the pedestal',async({page})=>{
 const positions=Buffer.from(new Float32Array([0,0,0,0,1,0,1,0,0]).buffer)
 await visitFixture(page,{model:true,asset:makeGlb(triangleDocument(),positions)});await destination(page,'cpu')
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','ready')
 const pixel=await page.evaluate(async()=>{
  const f='/node_modules/.vite/deps/@react-three_fiber.js',t='/node_modules/.vite/deps/three.js',r=(await import(f))._roots.values().next().value.store.getState(),{Vector3}=await import(t)
  const root=r.scene.getObjectByName('exhibit:22222222-2222-4222-8222-222222222222');let mesh:Mesh|undefined
  root.traverse((node:Mesh)=>{if(node.isMesh)mesh=node});if(!mesh)throw new Error('Exhibit mesh missing');r.scene.updateMatrixWorld(true)
  const point=mesh.localToWorld(new Vector3(1/3,1/3,0)).project(r.camera),context=r.gl.getContext(),color=new Uint8Array(4)
  r.gl.render(r.scene,r.camera);context.readPixels(Math.round((point.x+1)*r.gl.domElement.width/2),Math.round((point.y+1)*r.gl.domElement.height/2),1,1,context.RGBA,context.UNSIGNED_BYTE,color)
  return {color:Array.from(color),side:(Array.isArray(mesh.material)?mesh.material[0]:mesh.material).side}
 })
 expect(pixel.side).toBe(2);expect(pixel.color.slice(0,3).reduce((a,b)=>a+b,0)).toBeGreaterThan(120)
 await page.screenshot({path:'.tmp/phase08-stabilization/backface-visible.png'})
})
