import {test,expect,type Page} from '@playwright/test'
import {png} from './asset-fixtures'

const D='55555555-5555-4555-8555-555555555555',P='66666666-6666-4666-8666-666666666666',version='2026-10-15T00:00:00.000001Z'
type Role='visitor'|'editor'|'admin'
type State={lists:Array<{admin?:boolean;status?:string}>;saves:Array<{item:Record<string,unknown>;mode:string;files:string[]}>;removed:number;denied:boolean;release?:()=>void}
declare global {interface Window {rolesTest:State}}
async function workspace(page:Page,options:{role?:Role;path?:string;verified?:boolean;locale?:'en'|'fa';slow?:boolean}={}){
    await page.route('**/*.supabase.co/**',route=>route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({code:'42501',message:'Permission denied'})}))
    await page.addInitScript(locale=>{localStorage.setItem('core-locale',locale);localStorage.setItem('core_intro_last_seen_at',String(Date.now()));localStorage.setItem('core_intro_last_full_seen_at',String(Date.now()))},options.locale ?? 'en')
    await page.goto('/')
    // Wait for real initial restoration to finish before injecting a controlled session.
    await page.waitForFunction(async()=>{const path='/src/features/auth/authStore.ts';return !(await import(path)).useAuthStore.getState().isLoading})
    await page.evaluate(async({D,P,version,options})=>{
        const auth='/src/features/auth/authStore.ts',services='/src/lib/services/index.ts',route='/src/app/router/index.tsx'
        const {useAuthStore}=await import(auth),api=await import(services),{router}=await import(route)
        const item=(id:string,status:'draft'|'published')=>({id,status,slug:id===D?'draft-item':'published-item',updatedAt:version,title:{en:id===D?'Draft CPU':'Published GPU',fa:'نمونه'},brand:'CORE',category:'cpu',museumSection:'cpu',releaseYear:2026,
            shortDescription:{en:'',fa:''},description:{en:'',fa:''},specifications:[],thumbnail:'/favicon.svg',model3DUrl:null,galleryImages:[],sortOrder:0,featured:false})
        window.rolesTest={lists:[],saves:[],removed:0,denied:false}
        let first=true
        api.museumItemsService.list=async(query:{admin?:boolean;status?:string}={})=>{
            window.rolesTest.lists.push(structuredClone(query))
            if(options.slow&&first){first=false;await new Promise<void>(yes=>{window.rolesTest.release=yes})}
            // Deliberately over-broad fixture checks defensive published-item filtering too.
            return [item(D,'draft'),item(P,'published')]
        }
        api.museumItemsService.page=async query=>({items:await api.museumItemsService.list({admin:true,status:query.status==='all'?undefined:query.status}),total:2,page:query.page,perPage:query.perPage})
        api.museumItemsService.get=async id=>(await api.museumItemsService.list({admin:true})).find(value=>value.id===id)
        api.museumItemsService.taxonomy=async()=>({categories:[{id:'22222222-2222-4222-8222-222222222222',slug:'cpu',name:{en:'Processors',fa:'پردازنده‌ها'},sortOrder:0,active:true}],sections:[{id:'33333333-3333-4333-8333-333333333333',slug:'cpu',title:{en:'Processors',fa:'پردازنده‌ها'},sortOrder:0,available:true}]})
        api.supabaseAdminService.contentAccess=async()=>({role:'editor',editorWritesVerified:options.verified!==false})
        api.supabaseAdminService.saveExhibit=async(value:Record<string,unknown>,saveOptions:{mode:string;files:Record<string,File|File[]>})=>{
            window.rolesTest.saves.push({item:structuredClone(value),mode:saveOptions.mode,files:Object.keys(saveOptions.files).filter(key=>Boolean(saveOptions.files[key]))})
            if(window.rolesTest.denied)throw {code:'42501',message:'Permission denied'}
            return {id:value.id as string,cleanupFailed:false,retainedAssets:[]}
        }
        api.museumItemsService.remove=async()=>{window.rolesTest.removed++;return {cleanupFailed:false}}
        api.supabaseAdminService.counts=async()=>({items:2,categories:6,users:3,published:1})
        const role=options.role ?? 'editor'
        useAuthStore.setState({user:{id:'fixture-user',name:'Controlled',email:'controlled@example.test',role},role:role==='visitor'?'user':role,isAdmin:role==='admin',isAuthenticated:true,isLoading:false})
        await router.navigate(options.path ?? '/admin/items')
    },{D,P,version,options})
}
async function navigate(page:Page,path:string){await page.evaluate(async path=>{const source='/src/app/router/index.tsx';await (await import(source)).router.navigate(path)},path)}

test('Visitor direct URLs show bilingual permission denial without loading staff data',async({page})=>{
    await workspace(page,{role:'visitor',locale:'fa'})
    await expect(page.getByRole('heading',{name:'دسترسی مجاز نیست'})).toBeVisible()
    expect(await page.evaluate(()=>window.rolesTest.lists.length)).toBe(0)
    await expect(page.getByRole('link',{name:'بازگشت به موزه'})).toHaveAttribute('href','/museum')
})
test('editor sees drafts and content navigation without admin-only links or exhibit deletion',async({page})=>{
    await workspace(page)
    await expect(page.getByText('Draft CPU',{exact:true})).toBeVisible()
    await expect(page.getByText('Published GPU',{exact:true})).toHaveCount(0)
    for(const path of ['/admin/users','/admin/categories','/admin/sections','/admin/dashboard'])await expect(page.locator(`a[href="${path}"]`)).toHaveCount(0)
    await expect(page.getByRole('button',{name:/^Delete$/i})).toHaveCount(0)
    expect(await page.evaluate(()=>window.rolesTest.lists[0])).toMatchObject({admin:true,status:'draft'})
})
test('editor direct access to users, taxonomy and dashboard is denied',async({page})=>{
    await workspace(page)
    for(const path of ['/admin/users','/admin/categories','/admin/sections','/admin/dashboard']){
        await navigate(page,path);await expect(page.getByRole('heading',{name:'Permission denied'})).toBeVisible()
    }
})
test('editor draft form keeps stable identity/version and hides publishing and featured controls',async({page})=>{
    await workspace(page,{path:`/admin/items/${D}/edit`})
    await expect(page.getByLabel('Slug',{exact:true})).toHaveValue('draft-item')
    await expect(page.getByRole('option',{name:'Published',exact:true})).toHaveCount(0)
    await expect(page.getByLabel('Featured',{exact:true})).toHaveCount(0)
    await page.getByLabel('Slug',{exact:true}).fill('renamed-draft')
    await page.getByRole('button',{name:'SAVE ITEM',exact:true}).click()
    await expect(page).toHaveURL(/\/admin\/items$/)
    expect(await page.evaluate(()=>window.rolesTest.saves[0])).toMatchObject({item:{id:D,slug:'renamed-draft',status:'draft',updatedAt:version},mode:'update'})
})
test('editor cannot open a published exhibit editing route even with an over-broad response',async({page})=>{
    await workspace(page,{path:`/admin/items/${P}/edit`})
    await expect(page.getByRole('heading',{name:'Permission denied'})).toBeVisible()
    await expect(page.getByRole('button',{name:'SAVE ITEM',exact:true})).toHaveCount(0)
})
test('editor new draft reuses validated asset selection and create mode',async({page})=>{
    await workspace(page,{path:'/admin/items/new'})
    await page.getByLabel('Slug',{exact:true}).fill('new-draft')
    await page.getByLabel('Title / English',{exact:true}).fill('New draft')
    await page.getByLabel('Title / Persian',{exact:true}).fill('پیش‌نویس جدید')
    await page.getByLabel('Choose thumbnail',{exact:true}).setInputFiles({name:'thumbnail.png',mimeType:'image/png',buffer:png})
    await expect(page.getByText('thumbnail.png',{exact:false})).toBeVisible()
    await page.getByRole('button',{name:'SAVE ITEM',exact:true}).click()
    await expect(page).toHaveURL(/\/admin\/items$/)
    const saved=await page.evaluate(()=>window.rolesTest.saves[0])
    expect(saved.mode).toBe('create');expect(saved.item.status).toBe('draft');expect(saved.files).toContain('thumbnail')
})
test('unverified database gate disables draft creation, saves and uploads in Persian',async({page})=>{
    await workspace(page,{verified:false,locale:'fa'})
    await expect(page.getByRole('status').filter({hasText:'تا زمان تأیید'})).toBeVisible()
    await expect(page.getByRole('button',{name:'افزودن اثر جدید',exact:true})).toBeDisabled()
    await navigate(page,'/admin/items/new')
    await expect(page.locator('button[type="submit"]')).toBeDisabled()
    for(const input of await page.locator('input[type="file"]').all())await expect(input).toBeDisabled()
    expect(await page.evaluate(()=>window.rolesTest.saves.length)).toBe(0)
})
test('permission failure during draft save preserves edits and does not report success',async({page})=>{
    await workspace(page,{path:`/admin/items/${D}/edit`})
    await page.getByLabel('Slug',{exact:true}).fill('retained-edit')
    await page.evaluate(()=>{window.rolesTest.denied=true})
    await page.getByRole('button',{name:'SAVE ITEM',exact:true}).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/edit$/);await expect(page.getByLabel('Slug',{exact:true})).toHaveValue('retained-edit')
    expect(await page.evaluate(()=>window.rolesTest.saves.length)).toBe(1)
})
test('session downgrade removes privileged pages and stale pending content cannot restore them',async({page})=>{
    await workspace(page,{role:'admin',slow:true})
    await page.evaluate(async()=>{const source='/src/features/auth/authStore.ts';const {useAuthStore}=await import(source);useAuthStore.setState({user:{id:'other-user',name:'Visitor',email:'other@example.test',role:'visitor'},role:'user',isAdmin:false})})
    await expect(page.getByRole('heading',{name:'Permission denied'})).toBeVisible()
    await page.evaluate(()=>window.rolesTest.release?.())
    await expect(page.getByText('Published GPU',{exact:true})).toHaveCount(0)
    await expect(page.getByText('Draft CPU',{exact:true})).toHaveCount(0)
})
test('admin retains full navigation, published editing and exhibit deletion controls',async({page})=>{
    await workspace(page,{role:'admin'})
    await expect(page.getByText('Published GPU',{exact:true})).toBeVisible()
    await expect(page.locator('a[href="/admin/users"]').first()).toBeVisible()
    await expect(page.getByRole('button',{name:/^Delete$/i})).toHaveCount(2)
    await navigate(page,`/admin/items/${P}/edit`)
    await expect(page.getByLabel('Slug',{exact:true})).toHaveValue('published-item')
    await expect(page.getByRole('option',{name:'Published',exact:true})).toHaveCount(1)
})
test('profile navigation displays Visitor and editor roles with the correct workspace link',async({page})=>{
    await workspace(page,{role:'editor',path:'/profile'})
    await expect(page.getByRole('link',{name:'Content workspace',exact:true})).toHaveAttribute('href','/admin/items')
    await expect(page.getByText('Role: Editor',{exact:true})).toBeVisible()
})


test('staff login routes each role using the restored profile rather than the returned user claim',async({page})=>{
    for(const role of ['visitor','editor','admin'] as const){
        await workspace(page,{role,path:'/admin'})
        await page.evaluate(async role=>{
            const source='/src/lib/services/index.ts',api=await import(source)
            api.supabaseAuthService.signIn=async()=>{
                if(role==='editor'){
                    const source='/src/features/auth/authStore.ts'
                    ;(await import(source)).useAuthStore.getState().invalidate(true)
                }
                return {id:'fixture-user',email:'controlled@example.test',name:'Controlled',role:'admin'}
            }
            api.supabaseAuthService.getSession=async()=>({session:{user:{id:'fixture-user',email:'controlled@example.test'}},profile:{id:'fixture-user',email:'controlled@example.test',full_name:'Controlled',preferred_locale:'en',role:role==='visitor'?'user':role,created_at:'2026-10-15',updated_at:'2026-10-15'},user:{id:'fixture-user',email:'controlled@example.test',name:'Controlled',role:'admin'}})
        },role)
        await page.getByLabel('Email',{exact:true}).fill('controlled@example.test')
        await page.getByLabel('Password',{exact:true}).fill('controlled-test-password')
        await page.getByRole('button',{name:/^sign in$/i}).click()
        await expect(page).toHaveURL(role==='admin'?/\/admin\/dashboard$/:role==='editor'?/\/admin\/items$/:/\/museum$/)
    }
})
