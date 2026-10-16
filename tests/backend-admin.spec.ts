import {test, expect, type Page} from '@playwright/test'
import {png, makeGlb} from './asset-fixtures'

type TestState = {calls: Array<{item: Record<string, unknown>; options: Record<string, unknown>}>;
    behavior: 'success' | 'failure' | 'draftFailure' | 'uncertain' | 'uploadFailure'; immediateWrites: number}
declare global {interface Window {backendTest: TestState}}
const id = '11111111-1111-4111-8111-111111111111'
const version = '2026-10-13T00:00:00.000001+00:00'

async function openAdmin(page: Page, target = `/admin/items/${id}/edit`) {
    // No test may reach live Supabase, including Auth or Storage.
    await page.route('**/*.supabase.co/**', route => route.fulfill({status: 403, contentType: 'application/json', body: '{}'}))
    await page.addInitScript(() => {
        localStorage.setItem('core-locale', 'en')
        localStorage.setItem('core_intro_last_seen_at', String(Date.now()))
        localStorage.setItem('core_intro_last_full_seen_at', String(Date.now()))
    })
    await page.goto('/')
    await page.waitForTimeout(500)
    await page.evaluate(async ({id, version, target}) => {
        const servicesPath = '/src/lib/services/index.ts'
        const authPath = '/src/features/auth/authStore.ts'
        const routerPath = '/src/app/router/index.tsx'
        const integrityPath = '/src/lib/services/supabase/itemIntegrity.ts'
        const services = await import(servicesPath)
        const {useAuthStore} = await import(authPath)
        const {router} = await import(routerPath)
        const {ExhibitSaveError} = await import(integrityPath)
        const item = {id, updatedAt: version, slug: 'original', title: {en: 'CPU', fa: 'پردازنده'},
            category: 'cpu', museumSection: 'cpu', brand: 'CORE', releaseYear: 2026,
            shortDescription: {en: '', fa: ''}, description: {en: '', fa: ''}, specifications: [],
            thumbnail: '/favicon.svg', model3DUrl: null, modelOriginalFilename: 'original.glb', modelFileSize: 2048, sortOrder: 1, featured: false, status: 'published',
            galleryImages: [{id: 'gallery', url: '/favicon.svg', storagePath: `items/${id}/gallery/old.png`, caption: {en: 'old', fa: 'قدیمی'}}]}
        window.backendTest = {calls: [], behavior: 'success', immediateWrites: 0}
        services.museumItemsService.list = async () => [structuredClone(item)]
        services.museumItemsService.get = async () => structuredClone(item)
        services.museumItemsService.page = async query => ({items:[structuredClone(item)],total:1,page:query.page,perPage:query.perPage})
        services.museumItemsService.taxonomy = async () => ({categories:[{id:'22222222-2222-4222-8222-222222222222',slug:'cpu',name:{en:'Processors',fa:'پردازنده‌ها'},sortOrder:0,active:true}],sections:[{id:'33333333-3333-4333-8333-333333333333',slug:'cpu',title:{en:'Processors',fa:'پردازنده‌ها'},sortOrder:0,available:true}]})
        services.supabaseAdminService.saveExhibit = async (value: Record<string, unknown>, options: Record<string, unknown>) => {
            const {onStage, ...serializable} = options
            if (typeof onStage === 'function') onStage('committing')
            window.backendTest.calls.push({item: structuredClone(value), options: structuredClone(serializable)})
            if (window.backendTest.behavior === 'uploadFailure') {
                if (typeof onStage === 'function') onStage('uploading')
                throw new ExhibitSaveError(new Error('Network failed'), {cleanupFailed: false, retainedAssets: []})
            }
            if (window.backendTest.behavior === 'draftFailure') {
                window.backendTest.behavior = 'success'
                throw new ExhibitSaveError({code: '23514', message: 'Rejected'}, {cleanupFailed: false, retainedAssets: []}, {id: 'draft-id', updated_at: version})
            }
            if (window.backendTest.behavior === 'failure') throw {code: '40001', message: 'Conflict'}
            if (window.backendTest.behavior === 'uncertain') throw new ExhibitSaveError(new Error('Network failed'), {cleanupFailed: false, retainedAssets: []}, undefined, true)
            return {id: value.id, cleanupFailed: true, retainedAssets: []}
        }
        services.supabaseAdminService.updateGalleryImage = async () => {window.backendTest.immediateWrites++}
        services.supabaseAdminService.deleteGalleryImage = async () => {window.backendTest.immediateWrites++}
        useAuthStore.setState({user: {id: 'admin', name: 'Admin', role: 'admin'}, isAuthenticated: true, isAdmin: true, isLoading: false})
        await router.navigate(target)
    }, {id, version, target})
    if (target.endsWith('/edit')) await expect(page.getByLabel('Slug', {exact: true})).toHaveValue('original')
}

test('pending gallery images reuse validation and save reordered bilingual captions in one operation',async({page})=>{
    await openAdmin(page)
    await page.getByLabel('Choose gallery images',{exact:true}).setInputFiles([{name:'first.png',mimeType:'image/png',buffer:png},{name:'second.png',mimeType:'image/png',buffer:png}])
    await page.getByLabel('Pending caption 1 / English',{exact:true}).fill('First')
    await page.getByLabel('Pending caption 1 / Persian',{exact:true}).fill('اول')
    await page.getByLabel('Pending caption 2 / English',{exact:true}).fill('Second')
    await page.getByLabel('Pending caption 2 / Persian',{exact:true}).fill('دوم')
    await page.getByRole('button',{name:'Move pending image 2 up',exact:true}).click()
    await page.getByRole('button',{name:'SAVE ITEM',exact:true}).click()
    await expect(page).toHaveURL(/\/admin\/items$/)
    const result=await page.evaluate(()=>{const options=window.backendTest.calls[0].options;return {names:(options.files as {gallery:File[]}).gallery.map(file=>file.name),captions:options.galleryCaptions}})
    expect(result).toEqual({names:['second.png','first.png'],captions:[{en:'Second',fa:'دوم'},{en:'First',fa:'اول'}]})
})

test('editor sends stable ID/version and defers gallery changes to the unified save', async ({page}) => {
    await openAdmin(page)
    await page.getByLabel('Slug', {exact: true}).fill('renamed')
    await page.getByLabel('Caption / English', {exact: true}).fill('new caption')
    await page.getByLabel('Slug', {exact: true}).focus()
    expect(await page.evaluate(() => window.backendTest.immediateWrites)).toBe(0)
    await page.getByRole('button', {name: 'SAVE ITEM', exact: true}).click()
    await expect(page).toHaveURL(/\/admin\/items$/)
    const calls = await page.evaluate(() => window.backendTest.calls)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({item: {id, slug: 'renamed', updatedAt: version, galleryImages: [{caption: {en: 'new caption'}}]}, options: {mode: 'update'}})
    await expect(page.getByRole('status').filter({hasText: 'some files were retained'})).toBeVisible()
})

test('failed existing save keeps edits and does not navigate or claim success', async ({page}) => {
    await openAdmin(page)
    await page.evaluate(() => {window.backendTest.behavior = 'failure'})
    await page.getByLabel('Slug', {exact: true}).fill('unsaved')
    await page.getByRole('button', {name: 'SAVE ITEM', exact: true}).click()
    await expect(page.getByRole('alert')).toContainText('This record changed')
    await expect(page).toHaveURL(/\/edit$/)
    await expect(page.getByLabel('Slug', {exact: true})).toHaveValue('unsaved')
})

test('failed creation retries the retained draft as an update using its version', async ({page}) => {
    await openAdmin(page, '/admin/items/new')
    await page.getByLabel('Slug', {exact: true}).fill('new-item')
    await page.getByLabel('Title / English',{exact:true}).fill('New item')
    await page.getByLabel('Title / Persian',{exact:true}).fill('اثر جدید')
    await page.evaluate(() => {window.backendTest.behavior = 'draftFailure'})
    await page.getByRole('button', {name: 'SAVE ITEM', exact: true}).click()
    await expect(page.getByRole('alert')).toContainText('A draft was retained')
    await page.getByRole('button', {name: 'SAVE ITEM', exact: true}).click()
    await expect(page).toHaveURL(/\/admin\/items$/)
    const calls = await page.evaluate(() => window.backendTest.calls)
    expect(calls).toHaveLength(2)
    expect(calls[0].options.mode).toBe('create')
    expect(calls[1]).toMatchObject({item: {id: 'draft-id', updatedAt: version, slug: 'new-item'}, options: {mode: 'update'}})
})

test('uncertain commit disables blind resubmission and tells the editor to reopen', async ({page}) => {
    await openAdmin(page)
    await page.evaluate(() => {window.backendTest.behavior = 'uncertain'})
    await page.getByRole('button', {name: 'SAVE ITEM', exact: true}).click()
    await expect(page.getByRole('alert')).toContainText('Reopen the item')
    await expect(page.getByRole('button', {name: 'SAVE ITEM', exact: true})).toBeDisabled()
    expect(await page.evaluate(() => window.backendTest.calls.length)).toBe(1)
})

test('moving from edit to create resets the prior item identity and form state', async ({page}) => {
    await openAdmin(page)
    await page.evaluate(async () => {const path = '/src/app/router/index.tsx'; await (await import(path)).router.navigate('/admin/items/new')})
    await expect(page.getByLabel('Slug', {exact: true})).toHaveValue('')
    await page.getByLabel('Slug', {exact: true}).fill('fresh')
    await page.getByLabel('Title / English',{exact:true}).fill('Fresh item')
    await page.getByLabel('Title / Persian',{exact:true}).fill('اثر تازه')
    await page.getByRole('button', {name: 'SAVE ITEM', exact: true}).click()
    await expect(page).toHaveURL(/\/admin\/items$/)
    const call = (await page.evaluate(() => window.backendTest.calls))[0]
    expect(call.options.mode).toBe('create')
    expect(call.item.id).not.toBe(id)
})

test('image selection decodes, previews and submits the file with existing asset confirmation', async ({page}) => {
    await openAdmin(page)
    await expect(page.getByAltText('Existing thumbnail preview')).toBeVisible()
    await expect(page.getByText('Existing model: original.glb', {exact:false})).toBeVisible()
    await page.getByLabel('Choose thumbnail', {exact:true}).setInputFiles({name:'new.PNG',mimeType:'image/png',buffer:png})
    await expect(page.getByAltText('Pending image preview: new.PNG')).toBeVisible()
    await expect(page.getByText('1 × 1',{exact:true})).toBeVisible()
    await page.getByRole('button',{name:'SAVE ITEM',exact:true}).click()
    await expect(page).toHaveURL(/\/admin\/items$/)
    expect(await page.evaluate(()=>((window.backendTest.calls[0].options.files as {thumbnail:File}).thumbnail).name)).toBe('new.PNG')
    await expect(page.getByRole('status').filter({hasText:'Exhibit saved successfully'})).toBeVisible()
})

test('invalid image selection blocks save; clearing or valid reselection safely recovers', async ({page}) => {
    await openAdmin(page)
    await page.getByLabel('Choose thumbnail',{exact:true}).setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('corrupt')})
    await expect(page.getByRole('alert')).toContainText('cannot be decoded')
    await expect(page.getByRole('button',{name:'SAVE ITEM',exact:true})).toBeDisabled()
    expect(await page.evaluate(()=>window.backendTest.calls.length)).toBe(0)
    await page.getByRole('button',{name:'Clear selection: Choose thumbnail',exact:true}).click()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByRole('button',{name:'SAVE ITEM',exact:true})).toBeEnabled()
    await page.getByLabel('Choose thumbnail',{exact:true}).setInputFiles({name:'spoof.jpg',mimeType:'image/png',buffer:png})
    await expect(page.getByRole('alert')).toContainText('matching filename')
    await page.getByLabel('Choose thumbnail',{exact:true}).setInputFiles({name:'valid.png',mimeType:'image/png',buffer:png})
    await expect(page.getByAltText('Pending image preview: valid.png')).toBeVisible()
    await expect(page.getByRole('button',{name:'SAVE ITEM',exact:true})).toBeEnabled()
})

test('gallery selections preview independently; a malformed model cannot replace valid selections', async ({page}) => {
    await openAdmin(page)
    await page.getByLabel('Choose gallery images',{exact:true}).setInputFiles([
        {name:'one.png',mimeType:'image/png',buffer:png},{name:'two.png',mimeType:'image/png',buffer:png}])
    await expect(page.getByAltText(/^Pending image preview:/)).toHaveCount(2)
    await page.getByLabel('Choose GLB model',{exact:true}).setInputFiles({name:'broken.glb',mimeType:'model/gltf-binary',buffer:Buffer.alloc(12)})
    await expect(page.getByRole('alert')).toContainText('incomplete or malformed')
    await page.getByLabel('Choose GLB model',{exact:true}).setInputFiles({name:'new.glb',mimeType:'model/gltf-binary',buffer:makeGlb()})
    await expect(page.getByText(/Approx\. 1 mesh triangles/)).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
    await page.getByRole('button',{name:'Clear selection: Choose GLB model',exact:true}).click()
    await expect(page.getByAltText(/^Pending image preview:/)).toHaveCount(2)
    await page.getByRole('button',{name:'SAVE ITEM',exact:true}).click()
    const files=await page.evaluate(()=>window.backendTest.calls[0].options.files as {gallery:File[];model?:File;thumbnail?:File})
    expect(files.gallery).toHaveLength(2);expect(files.model).toBeUndefined();expect(files.thumbnail).toBeUndefined()
})

test('actual image decoding rejects a signature-only corrupt bitmap', async ({page}) => {
    await openAdmin(page)
    await page.getByLabel('Choose thumbnail',{exact:true}).setInputFiles({name:'header.png',mimeType:'image/png',buffer:png.subarray(0,24)})
    await expect(page.getByRole('alert')).toContainText('cannot be decoded')
})

test('upload status reflects service stages while controls remain locked', async ({page}) => {
    await openAdmin(page)
    await page.evaluate(async()=>{
        const path='/src/lib/services/index.ts';const services=await import(path)
        services.supabaseAdminService.saveExhibit=async (_item:unknown, options:{onStage:(stage:string)=>void})=>{
            options.onStage('uploading')
            await new Promise(resolve=>{Object.assign(window,{finishUpload:()=>{options.onStage('committing');resolve(undefined)}})})
            return {id:'saved',cleanupFailed:false,retainedAssets:[]}
        }
    })
    await page.getByRole('button',{name:'SAVE ITEM',exact:true}).click()
    await expect(page.getByRole('status')).toContainText('Uploading new assets')
    await expect(page.getByLabel('Choose thumbnail',{exact:true})).toBeDisabled()
    await page.evaluate(()=>{(window as unknown as {finishUpload:()=>void}).finishUpload()})
    await expect(page).toHaveURL(/\/admin\/items$/)
    await expect(page.getByRole('status').filter({hasText:'Exhibit saved successfully'})).toBeVisible()
})

test('Persian validation and operation messages use the existing locale', async ({page}) => {
    await openAdmin(page)
    await page.evaluate(async()=>{const path='/src/i18n/index.ts'; await (await import(path)).default.changeLanguage('fa')})
    await page.getByLabel('انتخاب تصویر بندانگشتی',{exact:true}).setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('bad')})
    await expect(page.getByRole('alert')).toContainText('تصویر قابل خواندن نیست')
})

test('existing Storage adapter validates before SDK upload and uses fresh paths without overwrite', async ({page}) => {
    await openAdmin(page)
    const uploads:Array<{url:string;overwrite:string|undefined}>=[]
    await page.route('**/storage/v1/object/**',async route=>{
        uploads.push({url:route.request().url(),overwrite:route.request().headers()['x-upsert']})
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({Key:'test'})})
    })
    const result=await page.evaluate(async({bytes,id})=>{
        const path='/src/lib/services/supabase/SupabaseStorageService.ts'; const {storageService}=await import(path)
        const file=new File([new Uint8Array(bytes)],'../../strange.PNG',{type:'image/png'})
        const target=storageService.imagePath(id,'thumbnail',file)
        await storageService.upload('museum-images',target,file)
        let rejected=false
        try {await storageService.upload('museum-images',storageService.imagePath(id,'thumbnail',file),new File(['bad'],'bad.png',{type:'image/png'}))} catch {rejected=true}
        return {target,rejected}
    },{bytes:[...png],id})
    expect(result.rejected).toBe(true);expect(uploads).toHaveLength(1);expect(uploads[0].overwrite).toBe('false')
    expect(uploads[0].url).toContain(`/museum-images/${result.target}`)
})

test('late validation cannot replace a newer selection and preview URLs are released', async ({page}) => {
    await openAdmin(page)
    await page.evaluate(async()=>{
        const path='/src/lib/services/supabase/SupabaseStorageService.ts';const {storageService}=await import(path)
        const validate=storageService.validateImage
        storageService.validateImage=(file:File)=>file.name==='slow.png' ? new Promise((_resolve,reject)=>{
            Object.assign(window,{rejectOldImage:()=>reject(new Error('old failed'))})
        }) : validate(file)
        const revoke=URL.revokeObjectURL.bind(URL)
        Object.assign(window,{revokedPreviewUrls:[]})
        URL.revokeObjectURL=(url:string)=>{(window as unknown as {revokedPreviewUrls:string[]}).revokedPreviewUrls.push(url);revoke(url)}
    })
    await page.getByLabel('Choose thumbnail',{exact:true}).setInputFiles({name:'slow.png',mimeType:'image/png',buffer:png})
    await expect(page.getByRole('status')).toContainText('Checking selected files')
    await page.getByLabel('Choose thumbnail',{exact:true}).setInputFiles({name:'latest.png',mimeType:'image/png',buffer:png})
    await expect(page.getByAltText('Pending image preview: latest.png')).toBeVisible()
    const url=await page.getByAltText('Pending image preview: latest.png').getAttribute('src')
    await page.evaluate(()=>{(window as unknown as {rejectOldImage:()=>void}).rejectOldImage()})
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByAltText('Pending image preview: latest.png')).toBeVisible()
    await page.getByRole('button',{name:'Clear selection: Choose thumbnail',exact:true}).click()
    await expect.poll(()=>page.evaluate(()=> (window as unknown as {revokedPreviewUrls:string[]}).revokedPreviewUrls)).toContain(url)
    await expect(page.getByRole('button',{name:'SAVE ITEM',exact:true})).toBeEnabled()
})

test('failed upload keeps validated selection, identifies its stage and permits safe retry', async ({page}) => {
    await openAdmin(page)
    await page.getByLabel('Choose thumbnail',{exact:true}).setInputFiles({name:'retry.png',mimeType:'image/png',buffer:png})
    await expect(page.getByAltText('Pending image preview: retry.png')).toBeVisible()
    await page.evaluate(()=>{window.backendTest.behavior='uploadFailure'})
    await page.getByRole('button',{name:'SAVE ITEM',exact:true}).click()
    await expect(page.getByRole('alert')).toContainText('Asset upload failed')
    await expect(page.getByRole('alert')).toContainText('Network error')
    await expect(page.getByAltText('Pending image preview: retry.png')).toBeVisible()
    await expect(page).toHaveURL(/\/edit$/)
    await expect(page.getByRole('button',{name:'SAVE ITEM',exact:true})).toBeEnabled()
    await page.evaluate(()=>{window.backendTest.behavior='success'})
    await page.getByRole('button',{name:'SAVE ITEM',exact:true}).click()
    await expect(page).toHaveURL(/\/admin\/items$/)
    expect(await page.evaluate(()=>window.backendTest.calls.length)).toBe(2)
})
