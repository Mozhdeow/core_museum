import {test,expect,type Page} from '@playwright/test'
import {setup} from './museum-browser-fixture'
import type {RootState} from '@react-three/fiber'
import type {Mesh} from 'three'
async function scene(page:Page){return page.evaluate(async()=>{
 const f='/node_modules/.vite/deps/@react-three_fiber.js',t='/node_modules/.vite/deps/three.js',n='/src/features/museum/navigationState.ts'
 const {_roots}=await import(f),{Box3,Vector3}=await import(t),nav=(await import(n)).useMuseumNavigation.getState()
 const r=(Array.from(_roots.values())[0] as {store:{getState:()=>RootState}}).store.getState()
 const marker=r.scene.getObjectByName('missing-model-marker'),model=r.scene.getObjectByName('exhibit:cpu-id'),schematic=r.scene.getObjectByName('cpu-educational-schematic')
 const bounds=(node:typeof marker)=>node?new Box3().setFromObject(node,true).getSize(new Vector3()).toArray():null
 return {position:r.camera.position.toArray(),request:nav.request.id,mode:nav.mode,overlay:nav.overlay,marker:bounds(marker),markerBottom:marker?new Box3().setFromObject(marker,true).min.y:null,schematicVisible:schematic?.visible,schematicBottom:schematic?new Box3().setFromObject(schematic,true).min.y:null,model:bounds(model),modelBottom:model?new Box3().setFromObject(model,true).min.y:null,hasModel:Boolean(model)}
})}
async function arrive(page:Page,options:Parameters<typeof setup>[3]={},model=false){await setup(page,model,false,{published:true,...options});await page.getByRole('button',{name:'Skip to CPU Hall'}).click();await expect(page.locator('[data-exhibit-id]')).toBeVisible()}
async function details(page:Page){if(await page.locator('[data-exhibit-id]').getAttribute('open')===null)await page.locator('[data-exhibit-id]>summary').click()}

test('missing CPU model uses the assembled educational schematic above the pedestal',async({page})=>{
 await arrive(page);await details(page)
 await expect(page.getByText(/No 3D model is uploaded/)).toBeVisible()
 const cpu=await scene(page);expect(cpu.marker).toBeNull();expect(cpu.schematicVisible).toBe(true);expect(cpu.schematicBottom).toBeGreaterThan(.95)
 await page.screenshot({path:'.tmp/phase07-preview/qa-missing-model.png'})
})
test('non-CPU published selection never mounts its model in CPU Hall',async({page})=>{
 await arrive(page,{category:'storage'},true);await details(page)
 await expect(page.getByRole('heading',{name:'sssssss',exact:true})).toBeVisible()
 await expect(page.getByText(/selected archive record uses a passage showcase/)).toBeVisible()
 await expect(page.getByText('Exhibition',{exact:true})).toBeInViewport()
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-item-id','cpu-id')
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-display-item-id','')
 expect((await scene(page)).hasModel).toBe(false);expect((await scene(page)).marker).toBeNull();expect((await scene(page)).schematicVisible).toBe(true)
 const card=await page.locator('[data-exhibit-id]').boundingBox(),inspect=await page.getByRole('button',{name:'Explore CPU schematic',exact:true}).boundingBox()
 expect(card).not.toBeNull();expect(inspect).not.toBeNull()
 expect(inspect!.x>=card!.x+card!.width||inspect!.x+inspect!.width<=card!.x||inspect!.y>=card!.y+card!.height||inspect!.y+inspect!.height<=card!.y).toBe(true)
 await page.screenshot({path:'.tmp/phase07-preview/qa-metadata-only.png'})
 await page.getByRole('button',{name:'Explore CPU schematic',exact:true}).click();await expect(page.locator('[data-cpu-view]')).toHaveAttribute('data-cpu-view','schematic')
 await expect(page.getByText(/Independent educational schematic/)).toBeVisible()
 await expect.poll(async()=>(await scene(page)).schematicBottom!).toBeGreaterThan(1.15)
 await page.screenshot({path:'.tmp/phase07-preview/qa-raised-cpu.png'})
 await page.keyboard.press('Escape');await expect.poll(async()=>(await scene(page)).schematicVisible).toBe(true)
})
test('Storage record without a GLB stays distinct from the default educational CPU',async({page})=>{
 await arrive(page,{category:'storage'});await details(page)
 await expect(page.getByRole('heading',{name:'sssssss',exact:true})).toBeVisible()
 const display=await scene(page);expect(display.marker).toBeNull();expect(display.schematicVisible).toBe(true);expect(display.hasModel).toBe(false)
 expect(display.schematicBottom).toBeGreaterThan(.95)
 await page.screenshot({path:'.tmp/phase07-preview/qa-storage-core.png'})
})
test('gallery opens real ordered media, owns pointer/keyboard and restores button focus',async({page})=>{
 await arrive(page,{gallery:true});await details(page)
 const open=page.getByRole('button',{name:'VIEW GALLERY',exact:true});await open.click()
 const dialog=page.getByRole('dialog',{name:'Gallery',exact:true});await expect(dialog).toBeVisible()
 await expect(dialog.locator('img')).toHaveAttribute('src',/first\.png$/)
 await expect(dialog.getByText('First exhibit image',{exact:true})).toBeVisible()
 await dialog.getByRole('button',{name:'Next',exact:true}).click();await expect(dialog.locator('img')).toHaveAttribute('src',/second\.png$/)
 await page.keyboard.press('ArrowLeft');await expect(dialog.locator('img')).toHaveAttribute('src',/first\.png$/)
 await expect(dialog.locator('img')).toBeVisible()
 await expect(page.locator('.museum-navigation')).not.toBeVisible()
 await page.screenshot({path:'.tmp/phase07-preview/qa-gallery.png'})
 await dialog.getByRole('button',{name:'Close',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(open).toBeFocused()
})
test('gallery empty contract does not promote a thumbnail or open an empty dialog',async({page})=>{
 await arrive(page,{thumbnail:true});await details(page)
 await expect(page.locator('[data-exhibit-id] img')).toHaveAttribute('src',/thumb\.png$/)
 await expect(page.getByRole('button',{name:'VIEW GALLERY',exact:true})).toHaveCount(0)
 await expect(page.getByText('No gallery images are available for this exhibit.',{exact:true})).toBeVisible()
 await expect(page.getByRole('dialog')).toHaveCount(0)
})
test('gallery honors a disabled flag even with media',async({page})=>{
 await arrive(page,{gallery:true,galleryDisabled:true});await details(page)
 await expect(page.getByRole('button',{name:'VIEW GALLERY',exact:true})).toHaveCount(0)
 await expect(page.getByText('The gallery is disabled for this exhibit.',{exact:true})).toBeVisible()
})
test('failed gallery images remain dismissible with useful feedback',async({page})=>{
 await arrive(page,{gallery:true,brokenImage:true});await details(page)
 await page.getByRole('button',{name:'VIEW GALLERY',exact:true}).click()
 await expect(page.getByRole('dialog').getByRole('status').filter({hasText:'could not be loaded'}).first()).toBeVisible()
 await page.getByRole('dialog').getByRole('button',{name:'Next',exact:true}).click()
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)
})
test('AI accepts actual keyboard editing, freezes museum movement and resumes navigation on close',async({page})=>{
 await arrive(page)
 await page.getByRole('button',{name:'Free Explore',exact:true}).click();await details(page)
 await page.getByRole('button',{name:'ASK CORE AI',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'ASK CORE AI',exact:true}),input=dialog.getByRole('textbox')
 await input.click();await expect(input).toBeFocused();const before=await scene(page)
 await page.keyboard.type('WASD thermal path');await page.keyboard.press('Space');await page.keyboard.type('X');await page.keyboard.press('Backspace');await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowRight')
 await expect(input).toHaveValue('WASD thermal path ')
 await page.keyboard.press('Enter');await expect(dialog.locator('.museum-ai-answer')).not.toBeEmpty()
 await expect(dialog.getByText(/local mock adapter/)).toBeVisible()
 const after=await scene(page);expect(after.position).toEqual(before.position);expect(after.request).toBe(before.request)
 await page.screenshot({path:'.tmp/phase07-preview/qa-ai-desktop.png'})
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0)
 await expect(page.getByRole('button',{name:'ASK CORE AI',exact:true})).toBeFocused()
 await page.keyboard.press('ArrowLeft');await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','corridor')
})
test('pedestal movement stays outside its clearance from several headings and after inspection',async({page})=>{
 await arrive(page)
 await page.getByRole('button',{name:'Free Explore',exact:true}).click()
 await page.keyboard.down('KeyW');await page.waitForTimeout(1300);await page.keyboard.up('KeyW')
 let p=(await scene(page)).position;expect(Math.hypot(p[0],p[2]+27)).toBeGreaterThanOrEqual(4.24)
 for(const key of ['KeyD','KeyA','KeyW']){await page.keyboard.down(key);await page.waitForTimeout(650);await page.keyboard.up(key);p=(await scene(page)).position;expect(Math.hypot(p[0],p[2]+27)).toBeGreaterThanOrEqual(4.24)}
 await page.getByRole('button',{name:'Explore CPU schematic',exact:true}).click();await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-inspection','active')
 await page.getByRole('button',{name:'Focus 3D',exact:true}).click();await page.keyboard.press('ArrowLeft')
 await page.keyboard.press('Escape');await expect(page.locator('[data-navigation-mode]')).toHaveAttribute('data-navigation-mode','explore')
 p=(await scene(page)).position;expect(Math.hypot(p[0],p[2]+27)).toBeGreaterThanOrEqual(4.24)
})
test('functional sign centers are unoccluded at actual route checkpoints',async({page})=>{
 await setup(page)
 for(const [place,title] of [['entrance','CPU HALL'],['corridor','No published exhibit'],['cpu','THE PROCESSOR']] as const){
  await page.evaluate(async place=>{const p='/src/features/museum/navigationState.ts';(await import(p)).useMuseumNavigation.getState().visit(place,true)},place)
  await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location',place)
  const hits=await page.evaluate(async title=>{
   const fiber='/node_modules/.vite/deps/@react-three_fiber.js',three='/node_modules/.vite/deps/three.js'
   const {_roots}=await import(fiber),{Vector3,Raycaster}=await import(three)
   const r=(Array.from(_roots.values())[0] as {store:{getState:()=>RootState}}).store.getState();r.scene.updateMatrixWorld(true)
   const sign=r.scene.getObjectByName('museum-sign:'+title)!;const samples=[]
   for(const x of [-.2,0,.2]){const target=sign.localToWorld(new Vector3(x,-.05,0)),ray=new Raycaster(r.camera.position,target.clone().sub(r.camera.position).normalize(),.01,r.camera.position.distanceTo(target)+.01)
    const hit=ray.intersectObjects(r.scene.children,true).find((h:{object:Mesh})=>Boolean(h.object.isMesh));samples.push({hit:hit?.object.name||hit?.object.type,same:hit?.object===sign})}
   return samples
  },title)
  expect(hits.every(h=>h.same),JSON.stringify({place,hits})).toBe(true)
  await page.screenshot({path:'.tmp/phase07-preview/qa-sign-'+place+'.png'})
 }
})
test.describe('mobile overlay ownership',()=>{
 test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true})
 test('portrait and landscape Persian overlays accept input, fit the viewport and close into Inspect',async({page})=>{
  await arrive(page,{gallery:true})
  await page.getByRole('button',{name:'FA',exact:true}).click()
  for(const size of [{width:390,height:844},{width:844,height:390}]){
   await page.setViewportSize(size);await details(page)
   const buttons=page.locator('[data-exhibit-id] button')
   await buttons.filter({hasText:'CORE AI'}).click()
   const dialog=page.getByRole('dialog'),input=dialog.getByRole('textbox');await input.tap();await page.keyboard.type('پرسش درباره گرما WASD')
   await expect(input).toHaveValue('پرسش درباره گرما WASD');await page.keyboard.press('Space');await page.keyboard.press('Backspace');await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowRight')
   const field=await input.boundingBox();expect(field!.y+field!.height).toBeLessThanOrEqual(size.height)
   if(size.height>540){
    await page.setViewportSize({width:size.width,height:480})
    await expect(input).toBeInViewport({ratio:1})
    await expect(dialog.locator('button[type=submit]')).toBeInViewport({ratio:1})
    await page.setViewportSize(size)
    await expect(input).toBeFocused()
   }
   await expect(page.locator('.museum-navigation')).not.toBeVisible()
   await page.screenshot({path:'.tmp/phase07-preview/qa-ai-'+size.width+'-fa.png'})
   await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0)
   await buttons.first().click();await expect(page.getByRole('dialog').locator('img')).toBeVisible()
   await page.keyboard.press('ArrowRight');await expect(page.getByRole('dialog').locator('img')).toHaveAttribute('src',/second\.png$/)
   await page.screenshot({path:'.tmp/phase07-preview/qa-gallery-'+size.width+'-fa.png'})
   await page.keyboard.press('Escape')
  }
  await page.getByRole('button',{name:'کاوش طرح آموزشی پردازنده',exact:true}).click();await expect(page.locator('[data-cpu-inspection]')).toHaveAttribute('data-cpu-inspection','active')
  await page.keyboard.press('Escape');await expect(page.locator('[data-cpu-inspection]')).toHaveCount(0)
 })
})
test('selected published GLB is fitted above the actual pedestal with bounded world dimensions',async({page})=>{
 await arrive(page,{},true)
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','ready')
 const actual=await scene(page)
 expect(actual.model).not.toBeNull();expect(actual.model![0]).toBeLessThanOrEqual(2.8001);expect(actual.model![1]).toBeLessThanOrEqual(2.3001);expect(actual.model![2]).toBeLessThanOrEqual(2.4001)
 expect(actual.modelBottom).toBeGreaterThanOrEqual(1.3499)
 await page.screenshot({path:'.tmp/phase07-preview/qa-published-model-fit.png'})
})
