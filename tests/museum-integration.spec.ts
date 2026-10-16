import {test, expect, type Page} from '@playwright/test'

function triangleGlb(size = 1) {
    const vertices = Buffer.from(new Float32Array([-size,0,0,size,0,0,0,size,0]).buffer)
    const json = Buffer.from(JSON.stringify({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],
        meshes:[{primitives:[{attributes:{POSITION:0}}]}],buffers:[{byteLength:vertices.length}],
        bufferViews:[{buffer:0,byteLength:vertices.length}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-size,0,0],max:[size,size,0]}]}))
    const padded = Buffer.alloc(Math.ceil(json.length/4)*4,32); json.copy(padded)
    const file = Buffer.alloc(12+8+padded.length+8+vertices.length)
    file.writeUInt32LE(0x46546c67,0);file.writeUInt32LE(2,4);file.writeUInt32LE(file.length,8)
    file.writeUInt32LE(padded.length,12);file.writeUInt32LE(0x4e4f534a,16);padded.copy(file,20)
    const bin=20+padded.length;file.writeUInt32LE(vertices.length,bin);file.writeUInt32LE(0x004e4942,bin+4);vertices.copy(file,bin+8)
    return file
}
const row = (id: string, sort = 0, model: string | null = `items/${id}/model.glb`) => ({id,slug:`slug-${id}`,title_en:`Exhibit ${id}`,title_fa:`اثر ${id}`,
    category_id:'category',section_id:'section',status:'published',sort_order:sort,brand:'CORE',release_year:1971,
    description_en:`Description ${id}`,description_fa:`شرح ${id}`,model_path:model,thumbnail_path:null,
    enable_gallery:true,enable_ai_curator:false,enable_exploded_view:false,featured:false})
type FixtureOptions = {empty?: boolean; noModel?: boolean; failData?: boolean; brokenModel?: boolean; malformedModel?: boolean; slowModel?: boolean; slowData?: boolean; inheritScroll?: boolean}
async function museum(page: Page, options: FixtureOptions = {}) {
    let failData = options.failData ?? false
    let brokenModel = options.brokenModel ?? false
    let releaseModel = () => {}
    let releaseData = () => {}
    const modelGate=new Promise<void>(resolve=>{releaseModel=resolve}), dataGate=new Promise<void>(resolve=>{releaseData=resolve})
    const counts: Record<string,number> = {}
    const requestedModels: string[] = []
    await page.route('**/*.supabase.co/**', async route => {
        const url=new URL(route.request().url())
        if (url.pathname.includes('/storage/v1/')) {
            requestedModels.push(url.pathname)
            if (options.slowModel && url.pathname.includes('/a/')) await modelGate
            if (brokenModel && url.pathname.includes('/a/')) return route.fulfill({status:404,body:'Not found'})
            if (options.malformedModel && url.pathname.includes('/a/')) return route.fulfill({status:200,body:'Invalid GLB content'})
            return route.fulfill({status:200,contentType:'model/gltf-binary',body:triangleGlb(url.pathname.includes('/a/') ? 10000 : .00001)})
        }
        const table=url.pathname.split('/').at(-1)!
        counts[table]=(counts[table]??0)+1
        if (options.slowData) await dataGate
        if (failData) return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Offline'})})
        let data: unknown[] = []
        if(table==='museum_items') {
            expect(url.searchParams.get('status')).toBe('eq.published')
            data=options.empty ? [] : [row('a',0,options.noModel ? null : undefined),row('b',1)]
        }
        if(table==='categories') {
            expect(url.searchParams.get('active')).toBe('eq.true')
            data=[{id:'category',slug:'custom-category',name_en:'Historic processors',name_fa:'پردازنده‌های تاریخی',active:true,sort_order:0}]
        }
        if(table==='museum_sections') {
            expect(url.searchParams.get('active')).toBe('eq.true')
            data=[{id:'section',slug:'custom-room',title_en:'Early computing',title_fa:'رایانش آغازین',description_en:'Archive',description_fa:'بایگانی',active:true,sort_order:0},
                {id:'empty-section',slug:'empty-room',title_en:'Empty section',title_fa:'بخش خالی',active:true,sort_order:1}]
        }
        if(table==='museum_item_specs') data=[{id:'spec',item_id:'a',label_en:'Clock',label_fa:'فرکانس',value:'1 MHz',sort_order:0}]
        if(table==='gallery_images') data=[]
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)})
    })
    await page.addInitScript(()=>{localStorage.setItem('core-locale','en');localStorage.setItem('core_intro_last_seen_at',String(Date.now()));localStorage.setItem('core_intro_last_full_seen_at',String(Date.now()))})
    await page.goto('/')
    await page.waitForTimeout(500)
    if (options.inheritScroll) {
        await page.evaluate(()=>window.scrollTo({top:(document.documentElement.scrollHeight-innerHeight)*.94,behavior:'instant'}))
        await page.waitForTimeout(500)
    }
    await page.evaluate(async()=>{
        const authPath='/src/features/auth/authStore.ts',routerPath='/src/app/router/index.tsx'
        const {useAuthStore}=await import(authPath),{router}=await import(routerPath)
        useAuthStore.setState({user:{id:'visitor',role:'visitor',name:'Visitor',email:'local@test.invalid'},isAuthenticated:true,isAdmin:false,isLoading:false})
        await router.navigate('/museum')
    })
    return {counts,requestedModels,releaseModel,releaseData, recoverData:()=>{failData=false},recoverModel:()=>{brokenModel=false}}
}

async function ownedTriggers(page: Page) {
    return page.evaluate(async()=>{
        // Use the same Vite-optimized module as the application, not a second GSAP instance.
        const source=await (await fetch('/src/hooks/useMuseumJourney.ts')).text()
        const path=source.match(/from ["']([^"']*gsap_ScrollTrigger[^"']*)["']/)?.[1]
        if (!path) throw new Error('Cannot locate the application ScrollTrigger module')
        return (await import(path)).ScrollTrigger.getAll().filter((trigger:{vars:{id?:string}})=>trigger.vars.id==='museum-data-journey').length
    })
}

test('SDK loads published catalog once and selection drives model, information and taxonomy', async ({page})=>{
    const fixture=await museum(page)
    const scene=page.locator('[data-museum-scene]')
    await expect(scene).toHaveAttribute('data-item-id','a')
    await expect(scene).toHaveAttribute('data-model-state','ready')
    await expect(page.getByRole('heading',{name:'Exhibit a',exact:true})).toBeVisible()
    await expect(page.getByRole('heading',{name:'Early computing',exact:true})).toBeVisible()
    await expect(page.getByText('Historic processors',{exact:true})).toBeVisible()
    await expect(page.getByText('1 MHz',{exact:true})).toBeVisible()
    expect(fixture.requestedModels).toHaveLength(1)
    const canvas=await page.locator('canvas').elementHandle()
    await page.getByLabel('Select exhibit',{exact:true}).selectOption('1')
    await expect(scene).toHaveAttribute('data-item-id','b')
    await expect(scene).toHaveAttribute('data-model-state','ready')
    await expect(page.getByRole('heading',{name:'Exhibit b',exact:true})).toBeVisible()
    await expect(page.locator('[data-exhibit-id]')).toHaveAttribute('data-exhibit-id','b')
    expect(await canvas!.evaluate(node=>node===document.querySelector('canvas'))).toBe(true)
    expect(fixture.counts).toMatchObject({museum_items:1,categories:1,museum_sections:1,museum_item_specs:1,gallery_images:1})
    await page.getByLabel('Select exhibit',{exact:true}).selectOption('2')
    await expect(scene).toHaveAttribute('data-item-id','')
    await expect(page.getByText('No published exhibits in this section.')).toBeVisible()
    await page.getByRole('button',{name:'FA',exact:true}).click()
    await expect(page.getByRole('heading',{name:'بخش خالی',exact:true})).toBeVisible()
})

test('scroll updates progression with a fixed Canvas and owns exactly one cleaned-up trigger', async ({page})=>{
    await museum(page)
    await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-item-id','a')
    await page.evaluate(()=>window.scrollTo({top:(document.documentElement.scrollHeight-innerHeight)*.5,behavior:'instant'}))
    await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-item-id','b')
    expect(await ownedTriggers(page)).toBe(1)
    await page.evaluate(async()=>{const path='/src/app/router/index.tsx';await (await import(path)).router.navigate('/profile')})
    expect(await ownedTriggers(page)).toBe(0)
})

test('missing and failed GLBs show explicit fallback status; retry and new URLs recover', async ({page})=>{
    const fixture=await museum(page,{brokenModel:true})
    const scene=page.locator('[data-museum-scene]')
    await expect(scene).toHaveAttribute('data-model-state','error')
    await expect(page.getByRole('heading',{name:'Exhibit a',exact:true})).toBeVisible()
    fixture.recoverModel()
    await page.getByRole('button',{name:'Retry 3D model',exact:true}).click()
    await expect(scene).toHaveAttribute('data-model-state','ready')
    await page.getByLabel('Select exhibit',{exact:true}).selectOption('1')
    await expect(scene).toHaveAttribute('data-item-id','b')
    await expect(scene).toHaveAttribute('data-model-state','ready')
})

test('slow old model cannot override a newer selection', async ({page})=>{
    const fixture=await museum(page,{slowModel:true})
    const scene=page.locator('[data-museum-scene]')
    await expect(scene).toHaveAttribute('data-item-id','a')
    await expect(scene).toHaveAttribute('data-model-state','loading')
    await page.getByLabel('Select exhibit',{exact:true}).selectOption('1')
    await expect(scene).toHaveAttribute('data-model-state','ready')
    fixture.releaseModel()
    await page.waitForTimeout(300)
    await expect(scene).toHaveAttribute('data-item-id','b')
    await expect(scene).toHaveAttribute('data-model-url',/\/b\/model.glb$/)
})

test('absent models retain exhibit data and use the procedural display', async ({page})=>{
    await museum(page,{noModel:true})
    await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','missing')
    await expect(page.getByText('No 3D model is available. Showing the CORE display.')).toBeVisible()
    await expect(page.getByRole('heading',{name:'Exhibit a',exact:true})).toBeVisible()
})

test('database failure is distinct from empty data and retry reloads real catalog', async ({page})=>{
    const fixture=await museum(page,{failData:true})
    await expect(page.getByRole('alert')).toContainText('could not be loaded', {timeout:15_000})
    await expect(page.locator('[data-exhibit-id]')).toHaveCount(0)
    fixture.recoverData()
    await page.getByRole('button',{name:'Reload collection',exact:true}).click()
    await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-item-id','a')
})

test('empty collection and reduced-motion mobile navigation remain usable', async ({page})=>{
    await page.setViewportSize({width:390,height:844})
    await page.emulateMedia({reducedMotion:'reduce'})
    const fixture=await museum(page,{empty:true})
    await expect(page.getByText('No published exhibits are available.')).toBeVisible()
    expect(fixture.requestedModels).toHaveLength(0)
    expect(fixture.counts.museum_item_specs).toBeUndefined()
    await page.getByLabel('Select exhibit',{exact:true}).selectOption('1')
    await expect(page.getByRole('heading',{name:'Empty section',exact:true})).toBeVisible()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('slow collection presents a loading state before displaying any exhibit', async ({page})=>{
    const fixture=await museum(page,{slowData:true})
    await expect(page.getByText('Loading the museum collection…')).toBeVisible()
    await expect(page.locator('[data-exhibit-id]')).toHaveCount(0)
    fixture.releaseData()
    await expect(page.locator('[data-exhibit-id]')).toHaveAttribute('data-exhibit-id','a')
})

test('malformed GLB is isolated and switching to a valid model resets the error boundary', async ({page})=>{
    await museum(page,{malformedModel:true})
    await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','error')
    await page.getByLabel('Select exhibit',{exact:true}).selectOption('1')
    await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-model-state','ready')
    await expect(page.getByRole('heading',{name:'Exhibit b',exact:true})).toBeVisible()
})

test('mobile Persian exhibit metadata stays contained and respects feature flags', async ({page})=>{
    await page.setViewportSize({width:390,height:844})
    await page.emulateMedia({reducedMotion:'reduce'})
    await museum(page)
    await page.getByRole('button',{name:'FA',exact:true}).click()
    await expect(page.getByRole('heading',{name:'اثر a',exact:true})).toBeVisible()
    await expect(page.getByText('پردازنده‌های تاریخی',{exact:true})).toBeVisible()
    await expect(page.getByText('فرکانس',{exact:true})).toBeVisible()
    await expect(page.getByRole('button',{name:'ASK CORE AI',exact:true})).toHaveCount(0)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('museum entry does not inherit the final landing scroll position', async ({page})=>{
    await museum(page,{inheritScroll:true})
    await expect(page.locator('[data-museum-scene]')).toHaveAttribute('data-item-id','a')
    expect(await page.evaluate(()=>scrollY)).toBe(0)
})
