import {test,expect,type Page} from '@playwright/test'
import {setup} from './museum-browser-fixture'
const cameraZ=(page:Page)=>page.locator('canvas[data-camera-z]').getAttribute('data-camera-z').then(Number)
test('desktop tour pauses, explore continues, boundaries hold and route cleanup is scoped',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await setup(page)
 await page.screenshot({path:'test-results/navigation/entrance-desktop.png'})
 await page.getByRole('button',{name:'Guided tour',exact:true}).click()
 await expect.poll(()=>cameraZ(page)).toBeLessThan(14)
 await page.getByRole('button',{name:'Pause tour'}).click()
 const paused=await cameraZ(page);await page.waitForTimeout(500);expect(Math.abs((await cameraZ(page))-paused)).toBeLessThan(1)
 await page.getByRole('button',{name:'Free Explore',exact:true}).click()
 const before=await cameraZ(page);await page.keyboard.down('KeyW');await page.waitForTimeout(600);await page.keyboard.up('KeyW')
 expect(await cameraZ(page)).toBeLessThan(before-.5)
 await page.keyboard.down('KeyS');await expect.poll(()=>cameraZ(page),{timeout:4000}).toBeGreaterThan(17.95);await page.keyboard.up('KeyS')
 expect(await cameraZ(page)).toBeLessThanOrEqual(18)
 await page.getByRole('button',{name:'Skip to CPU Hall'}).click()
 await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','cpu')
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-procedural-preview','true')
 await expect(page.getByText('Educational CPU schematic',{exact:true})).toBeVisible()
 await expect.poll(async()=>Number(await page.locator('canvas').getAttribute('data-cpu-reveal'))).toBeGreaterThan(.9)
 await page.screenshot({path:'.tmp/phase07-preview/07b-cpu-desktop.png'})
 const nav='/src/features/museum/navigationState.ts'
 expect(await page.evaluate(async path=>(await import(path)).useMuseumNavigation.getState().progress,nav)).toBe(1)
 expect(await page.locator('[data-museum-scene]').getAttribute('data-item-id')).toBe('')
 await page.evaluate(async()=>{const p='/src/app/router/index.tsx';await(await import(p)).router.navigate('/profile')})
 await expect(page.locator('[data-navigation-mode]')).toHaveCount(0)
 expect(errors).toEqual([])
})
test.describe('mobile touch',()=>{
 test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true})
 test('mobile assisted navigation, hold movement, bilingual labels and real selected GLB',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page,true)
 await page.getByRole('button',{name:'Skip to CPU Hall'}).click()
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-item-id','cpu-id')
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-procedural-preview','false')
 await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','ready')
 await expect(page.getByRole('heading',{name:'Published CPU',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Navigation controls',exact:true}).click()
 await page.getByRole('button',{name:'Free Explore',exact:true}).click()
 const before=await cameraZ(page),back=page.getByRole('button',{name:'Walk back',exact:true}),box=await back.boundingBox();expect(box).toBeTruthy()
 const touch=await page.context().newCDPSession(page)
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box!.x+box!.width/2,y:box!.y+box!.height/2}]});await page.waitForTimeout(500);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach()
 expect(await cameraZ(page)).toBeGreaterThan(before+.5)
 await page.getByRole('button',{name:'FA',exact:true}).click()
 await expect(page.getByRole('button',{name:'کاوش آزاد',exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false)
 await page.getByRole('button',{name:'کنترل‌های حرکت',exact:true}).click()
 await page.screenshot({path:'.tmp/phase07-preview/07b-mobile-fa.png'})
 })
})
test('reduced motion reaches destinations without autoplay or competing ScrollTriggers',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await setup(page)
 const start=await cameraZ(page);await page.waitForTimeout(400);expect(await cameraZ(page)).toBe(start)
 await page.getByRole('button',{name:'CPU Hall',exact:true}).click()
 await expect.poll(()=>cameraZ(page)).toBeLessThan(-20)
 const count=await page.evaluate(async()=>{const p='/src/hooks/useMuseumJourney.ts';const source=await(await fetch(p)).text();const id=source.match(/from ["']([^"']*gsap_ScrollTrigger[^"']*)["']/)?.[1];if(!id)return -1;const {ScrollTrigger}=await import(id);return ScrollTrigger.getAll().filter((t:{vars:{id?:string}})=>t.vars.id==='museum-data-journey').length})
 expect(count).toBe(0)
})


test('guided route completes at CPU Hall without requiring scroll input',async({page})=>{
 await setup(page)
 await page.getByRole('button',{name:'Guided tour',exact:true}).click()
 await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','corridor',{timeout:14000})
 await page.screenshot({path:'.tmp/phase07-preview/07b-corridor-desktop.png'})
 await expect(page.getByRole('button',{name:'Arrived',exact:true})).toBeDisabled({timeout:15000})
 await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','cpu')
 expect(await cameraZ(page)).toBeLessThan(-20)
})


test('catalog failure is visible and recoverable at the entrance without blocking navigation',async({page})=>{
 const fixture=await setup(page,false,true)
 await expect(page.getByRole('alert')).toContainText('could not be loaded',{timeout:12000})
 fixture.recover()
 await page.getByRole('button',{name:'Reload collection',exact:true}).click()
 await expect(page.getByRole('alert')).toHaveCount(0)
 await page.screenshot({path:'.tmp/phase07-preview/entrance-desktop.png'})
 await expect(page.getByRole('button',{name:'Free Explore',exact:true})).toBeVisible()
})


test('destination shortcuts share buttons, ignore held keys and keyboard-owned interactions',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await setup(page)
 const snapshot=()=>page.evaluate(async()=>{const p='/src/features/museum/navigationState.ts';const s=(await import(p)).useMuseumNavigation.getState();return {id:s.request.id,target:s.request.target,mode:s.mode}})
 const initial=await snapshot()
 await page.keyboard.down('ArrowRight');await page.keyboard.down('ArrowRight');await page.keyboard.up('ArrowRight')
 await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','corridor')
 expect((await snapshot()).id).toBe(initial.id+1)
 await page.keyboard.press('ArrowRight');await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','cpu')
 await page.getByRole('button',{name:'Back / previous destination',exact:true}).click();await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','corridor')
 await page.getByRole('button',{name:'Free Explore',exact:true}).click()
 const x=await page.locator('canvas').getAttribute('data-camera-x')
 await page.keyboard.down('ArrowLeft');await page.keyboard.down('ArrowLeft');await page.keyboard.up('ArrowLeft')
 await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','entrance')
 expect((await snapshot()).mode).toBe('guided');expect(x).not.toBeNull()
 const before=await snapshot()
 for(const tag of ['input','textarea','select','div']){
  await page.evaluate(tag=>{const e=document.createElement(tag);e.id='owned-field';if(tag==='div')e.setAttribute('contenteditable','true');document.body.append(e);e.focus()},tag)
  await page.keyboard.press('ArrowRight');expect(await snapshot()).toEqual(before)
  await page.evaluate(()=>document.getElementById('owned-field')?.remove())
 }
 await page.keyboard.press('Alt+ArrowRight');expect(await snapshot()).toEqual(before)
 await page.evaluate(()=>{const d=document.createElement('div');d.setAttribute('role','dialog');d.id='owned-dialog';document.body.append(d)})
 await page.keyboard.press('ArrowRight');expect(await snapshot()).toEqual(before)
 await page.evaluate(()=>document.getElementById('owned-dialog')?.remove())
 await page.keyboard.press('ArrowRight');await expect(page.locator('[data-physical-location]')).toHaveAttribute('data-physical-location','corridor')
 const paused=page.getByRole('button',{name:'Pause atmosphere',exact:true});await paused.click();await expect(page.getByRole('button',{name:'Resume atmosphere',exact:true})).toHaveAttribute('aria-pressed','true')
})

test('compact overlays at portrait, landscape, tablet and desktop sizes in both languages',async({page})=>{
 await page.setViewportSize({width:360,height:780});await setup(page)
 await page.getByRole('button',{name:'Skip to CPU Hall'}).click()
 await expect(page.getByText('Educational CPU schematic',{exact:true})).toBeVisible()
 const sizes=[{width:360,height:780},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:768,height:1024},{width:1440,height:900}]
 for(const size of sizes){
  await page.setViewportSize(size)
  for(const locale of ['en','fa']){
   await page.getByRole('button',{name:locale==='fa'?'FA':'EN',exact:true}).click()
   const nav=page.locator('.museum-navigation'),toggle=page.getByRole('button',{name:locale==='fa'?'کنترل‌های حرکت':'Navigation controls',exact:true})
   await expect(nav).toBeVisible()
   const box=await nav.boundingBox();expect(box).toBeTruthy();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(size.width+1);expect(box!.y+box!.height).toBeLessThanOrEqual(size.height+1)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false)
   if((await toggle.getAttribute('aria-expanded'))==='false')await toggle.click()
   await expect(page.getByRole('button',{name:locale==='fa'?'کاوش آزاد':'Free Explore',exact:true})).toBeVisible()
   const expanded=await nav.boundingBox();expect(expanded!.y).toBeGreaterThanOrEqual(0);expect(expanded!.y+expanded!.height).toBeLessThanOrEqual(size.height+1)
   await toggle.click()
   if(size.width<768&&size.height>=540){
    const title=await page.locator('.museum-location h1').boundingBox(),card=await page.locator('.museum-empty-card').boundingBox()
    expect(card!.y).toBeGreaterThan(title!.y+title!.height)
   }
  }
  if(size.width===844||size.width===360)await page.screenshot({path:'.tmp/phase07-preview/07b-'+size.width+'x'+size.height+'.png'})
 }
})
