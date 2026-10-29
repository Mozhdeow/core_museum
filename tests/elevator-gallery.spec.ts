import {test,expect,type Page} from '@playwright/test'
import {mkdir,readFile} from 'node:fs/promises'
import {visitFixture,cameraState,cpu,storage} from './museum-visit-fixture'

type Row={id:string;item_id:string;storage_path:string;caption_en:string;caption_fa:string;sort_order:number}
const imageId=(i:number)=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(i+1).padStart(12,'0')}`
function row(owner:string,index:number):Row{return {id:imageId(index),item_id:owner,storage_path:`items/${owner}/gallery/${String(index+1).padStart(2,'0')}.png`,caption_en:`Recorded image ${index+1}`,caption_fa:`تصویر ثبت‌شده ${index+1}`,sort_order:index}}
async function setup(page:Page,options:{rows:Row[];holdCatalog?:boolean;holdFirst?:boolean;disabledStorage?:boolean} ){
    const state={rows:options.rows,fail:new Set<string>(),requested:[] as string[],holds:new Map<string,Promise<void>>(),holdStarted:new Set<string>()}
    let releaseCatalog=()=>{},releaseFirst=()=>{}
    const catalogGate=options.holdCatalog?new Promise<void>(r=>{releaseCatalog=r}):Promise.resolve()
    const imageGate=options.holdFirst?new Promise<void>(r=>{releaseFirst=r}):Promise.resolve()
    const assets=await Promise.all(['cpu','gpu','ram'].map(name=>readFile(`public/images/landing/objects/${name}.png`)))
    await page.route('**/rest/v1/gallery_images*',async route=>{
        await catalogGate
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([...state.rows].sort((a,b)=>a.sort_order-b.sort_order))})
    })
    await page.route('**/storage/v1/object/public/museum-images/**',async route=>{
        const path=new URL(route.request().url()).pathname
        state.requested.push(path)
        const filename=path.split('/').at(-1)!
        if(path.endsWith('/01.png'))await imageGate
        const hold=state.holds.get(filename)
        if(hold){state.holdStarted.add(filename);await hold}
        if(state.fail.has(filename))return route.fulfill({status:404,body:'Missing'})
        const n=Number(path.match(/(\d+)\.png$/)?.[1]??1)
        return route.fulfill({status:200,contentType:'image/png',body:assets[(n-1)%assets.length]}).catch(()=>{})
    })
    const catalog={
        categories:[{id:cpu,slug:'cpu',name_en:'Processors',name_fa:'پردازنده',active:true,sort_order:0},{id:storage,slug:'storage',name_en:'Storage',name_fa:'ذخیره‌سازی',active:true,sort_order:1}],
        sections:[{id:cpu,slug:'cpu',title_en:'CPU collection',title_fa:'مجموعه پردازنده',active:true,sort_order:0},{id:storage,slug:'storage',title_en:'Storage collection',title_fa:'مجموعه ذخیره‌سازی',active:true,sort_order:1}],
        items:[{id:cpu,slug:'fixture-cpu',title_en:'Published processor',title_fa:'پردازندهٔ منتشرشده',category_id:cpu,section_id:cpu,sort_order:0,status:'published',thumbnail_path:`items/${cpu}/thumbnail/cover.png`,model_path:`items/${cpu}/model.glb`,description_en:'Recorded description',enable_gallery:true},
            {id:storage,slug:'fixture-storage',title_en:'Published storage',title_fa:'ذخیره‌ساز منتشرشده',category_id:storage,section_id:storage,sort_order:1,status:'published',enable_gallery:!options.disabledStorage}],
    }
    await page.addInitScript(()=>localStorage.setItem('core-museum-quality-choice','low'))
    await visitFixture(page,{catalog})
    return {state,releaseCatalog,releaseFirst}
}
async function ready(page:Page){
    await expect.poll(async()=>(await cameraState(page)).phase,{timeout:40000}).toBe('ready')
    await expect(page.locator('canvas[data-museum-prepared]')).toHaveAttribute('data-museum-prepared','ready',{timeout:60000})
    await expect(page.locator('.museum-context-status')).toHaveCount(0)
}
async function details(page:Page){
    const card=page.locator('[data-exhibit-id]')
    await expect(card).toBeVisible({timeout:30000})
    if(await card.getAttribute('open')===null)await card.locator('summary').click()
    return card
}
async function chooseItem(page:Page,label:string){
    const toggle=page.locator('.museum-controls-toggle')
    if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click()
    await page.getByRole('combobox',{name:'Select exhibit'}).selectOption({label})
    return details(page)
}
const gallery=(page:Page)=>page.locator('.core-elevator')

test('availability is hidden while unresolved, empty, disabled, or belonging to another UUID',async({page})=>{
    const rows=[{...row(cpu,0),storage_path:''},row(storage,1),row('dddddddd-dddd-4ddd-8ddd-dddddddddddd',2)]
    const fixture=await setup(page,{rows,holdCatalog:true,disabledStorage:true})
    await expect(page.getByRole('button',{name:'VIEW GALLERY'})).toHaveCount(0)
    fixture.releaseCatalog();await ready(page)
    const card=await details(page)
    await expect(card.locator('img')).toHaveAttribute('src',/cover\.png/)
    await expect(card.getByRole('button',{name:'VIEW GALLERY'})).toHaveCount(0)
    const other=await chooseItem(page,'Published storage')
    await expect(other.getByRole('button',{name:'VIEW GALLERY'})).toHaveCount(0)
})

test('doors, rapid requests, same-image zoom, camera and focus restoration',async({page})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
    const fixture=await setup(page,{rows:[row(cpu,0),row(cpu,1),row(cpu,2),row(cpu,4),row(cpu,5),row(storage,3)],holdFirst:true})
    await ready(page);const card=await details(page),open=card.getByRole('button',{name:'VIEW GALLERY'})
    const before=await cameraState(page),url=page.url()
    await page.locator('canvas[data-camera-z]').evaluate(el=>el.setAttribute('data-gallery-test','same-canvas'))
    await open.click()
    const dialog=page.getByRole('dialog',{name:'Gallery',exact:true}),widget=gallery(page)
    await expect(widget).toHaveAttribute('data-phase','preparing')
    await mkdir('docs/phase08/elevator-gallery',{recursive:true})
    await page.screenshot({path:'docs/phase08/elevator-gallery/01-closed.png'})
    fixture.releaseFirst()
    await expect(widget).toHaveAttribute('data-phase','open',{timeout:30000})
    await expect(widget).toHaveAttribute('data-current-id',imageId(0))
    await expect(widget.locator('img')).toHaveAttribute('src',/01\.png$/)
    await page.screenshot({path:'docs/phase08/elevator-gallery/02-open.png'})
    await widget.locator('img').evaluate(el=>{
        el.setAttribute('data-test-identity','one-image')
        const w=window as unknown as {galleryChanges:{closed:boolean}[]};w.galleryChanges=[]
        new MutationObserver(records=>{if(records.some(r=>r.attributeName==='src')){
            const widget=el.closest('.core-elevator');if(!widget?.isConnected)return
            const left=widget.querySelector('.elevator-door-left')!,right=widget.querySelector('.elevator-door-right')!
            const position=(el:Element)=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m41
            w.galleryChanges.push({closed:Math.abs(position(left))<.1&&Math.abs(position(right))<.1})
        }}).observe(el,{attributes:true,attributeFilter:['src']})
    })
    await widget.getByRole('button',{name:'Image 02',exact:true}).click()
    await expect(widget).toHaveAttribute('data-phase','closing')
    await expect(widget.locator('img')).toHaveAttribute('src',/01\.png$/)
    await widget.getByRole('button',{name:'Image 03',exact:true}).click()
    await widget.getByRole('button',{name:'Image 02',exact:true}).click()
    await expect(widget).toHaveAttribute('data-current-id',imageId(1),{timeout:30000})
    await expect(widget).toHaveAttribute('data-phase','open',{timeout:30000})
    await expect(widget.locator('img')).toHaveAttribute('src',/02\.png$/)
    await expect(widget.getByText('Recorded image 2',{exact:true})).toBeVisible()
    const changes=await page.evaluate(()=>(window as unknown as {galleryChanges:{closed:boolean}[]}).galleryChanges)
    expect(changes.length).toBeGreaterThan(0);expect(changes.every(c=>c.closed)).toBe(true)
    const media=widget.locator('[data-gallery-image-button]'),small=await media.boundingBox()
    await media.click();await expect(widget).toHaveAttribute('data-phase','inside')
    const large=await media.boundingBox();expect(large!.width).toBeGreaterThan(small!.width*1.2)
    await expect(widget.locator('img')).toHaveAttribute('data-test-identity','one-image')
    await page.screenshot({path:'docs/phase08/elevator-gallery/03-inside.png'})
    await widget.locator('[data-gallery-return]').focus();await page.keyboard.press('Shift+Tab')
    await expect(dialog.getByRole('button',{name:'Close',exact:true})).toBeFocused()
    await page.keyboard.press('Escape');await expect(widget).toHaveAttribute('data-phase','open')
    await expect(widget.locator('img')).toHaveAttribute('src',/02\.png$/)
    await page.keyboard.press('ArrowRight');await expect(widget).toHaveAttribute('data-current-id',imageId(2))
    await expect(widget).toHaveAttribute('data-phase','open')
    await page.keyboard.press('w');await page.mouse.wheel(0,400)
    await dialog.getByRole('button',{name:'Close',exact:true}).click()
    await expect(dialog).toHaveCount(0);await expect(open).toBeFocused()
    expect(page.url()).toBe(url)
    await expect(page.locator('canvas[data-gallery-test=same-canvas]')).toHaveCount(1)
    const after=await cameraState(page)
    before.position.forEach((value,i)=>expect(after.position[i]).toBeCloseTo(value,4))
    before.quaternion.forEach((value,i)=>expect(after.quaternion[i]).toBeCloseTo(value,4))
    expect(after.mode).toBe(before.mode);expect(await page.locator('body').evaluate(el=>el.style.overflow)).not.toBe('hidden')
    let releaseLate=()=>{}
    fixture.state.holds.set('06.png',new Promise<void>(resolve=>{releaseLate=resolve}))
    await open.click();await expect(widget).toHaveAttribute('data-phase','open')
    await widget.getByRole('button',{name:'Image 05',exact:true}).click()
    await expect.poll(()=>fixture.state.holdStarted.has('06.png')).toBe(true)
    await page.evaluate(async({storage})=>{const path='/src/features/museum/museumStore.ts';(await import(path)).useMuseumStore.getState().restoreSelection(storage,storage)},{storage})
    await expect(widget).toHaveCount(0)
    const other=await details(page);await expect(other).toHaveAttribute('data-exhibit-id',storage)
    await other.getByRole('button',{name:'VIEW GALLERY'}).click()
    await expect(widget).toHaveAttribute('data-gallery-item',storage)
    await expect(widget).toHaveAttribute('data-current-id',imageId(3));await expect(widget).toHaveAttribute('data-phase','open')
    releaseLate();await page.waitForTimeout(300)
    await expect(widget.locator('img')).toHaveAttribute('src',/04\.png$/)
    expect(errors).toEqual([])
})

test('image failure, exhibit changes and explicit catalog refresh never retain stale media',async({page})=>{
    const fixture=await setup(page,{rows:[row(cpu,0),row(storage,1)]})
    fixture.state.fail.add('01.png')
    await ready(page);const card=await details(page)
    await card.getByRole('button',{name:'VIEW GALLERY'}).click()
    let widget=gallery(page)
    await expect(widget).toHaveAttribute('data-phase','open');await expect(widget).toHaveAttribute('data-media-state','error')
    await expect(widget.getByText(/could not be loaded/).first()).toBeVisible()
    fixture.state.fail.delete('01.png')
    await widget.getByRole('button',{name:'Retry image'}).click()
    await expect(widget).toHaveAttribute('data-phase','open');await expect(widget).toHaveAttribute('data-media-state','ready')
    await widget.getByRole('button',{name:'Close'}).click()
    const storageCard=await chooseItem(page,'Published storage')
    await storageCard.getByRole('button',{name:'VIEW GALLERY'}).click();widget=gallery(page)
    await expect(widget).toHaveAttribute('data-gallery-item',storage)
    await expect(widget).toHaveAttribute('data-current-id',imageId(1))
    await expect(widget.locator('img')).toHaveAttribute('src',/02\.png$/)
    await expect(widget.getByText('Recorded image 1',{exact:true})).toHaveCount(0)
    await widget.getByRole('button',{name:'Close'}).click()
    fixture.state.rows=[row(cpu,0)]
    await storageCard.getByRole('button',{name:'Reload collection'}).click()
    await expect.poll(async()=>page.evaluate(async()=>{const p='/src/features/museum/museumStore.ts';return (await import(p)).useMuseumStore.getState().status})).toBe('ready')
    const refreshed=await details(page);await expect(refreshed).toHaveAttribute('data-exhibit-id',storage)
    await expect(refreshed.getByRole('button',{name:'VIEW GALLERY'})).toHaveCount(0)
})

test('Persian mobile, many-image keyboard selection and reduced motion',async({page})=>{
    await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'})
    await page.addInitScript(()=>localStorage.setItem('core-locale','fa'))
    await setup(page,{rows:Array.from({length:12},(_,i)=>row(cpu,i))})
    await ready(page);const card=await details(page)
    await card.getByRole('button',{name:'مشاهده گالری'}).click()
    const widget=gallery(page);await expect(widget).toHaveAttribute('dir','rtl')
    await expect(widget).toHaveAttribute('data-phase','open')
    const first=widget.getByRole('button',{name:'تصویر 01',exact:true})
    await first.focus();await page.keyboard.press('End')
    await expect(widget).toHaveAttribute('data-current-id',imageId(11))
    await expect(widget).toHaveAttribute('data-phase','open')
    await widget.getByRole('button',{name:'ورود به تصویر'}).click()
    await expect(widget).toHaveAttribute('data-phase','inside')
    await page.keyboard.press('Escape');await expect(widget).toHaveAttribute('data-phase','open')
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await page.keyboard.press('Escape');await expect(widget).toHaveCount(0)
})
