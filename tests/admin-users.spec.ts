import {test,expect,type Page} from '@playwright/test'
import type {AdminUser,UserQuery,UserMutation,UserCapabilities,OperationResult} from '../src/lib/services/supabase/adminUsersClient'
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',version='2026-10-15T00:00:00.001Z'
type State={queries:UserQuery[];mutations:UserMutation[];reconciles:number;mode:'success'|'duplicate'|'conflict'|'lost'|'deleteFailure'|'lastAdmin'|'forbidden';failList:boolean;receipts:Record<string,OperationResult>}
declare global{interface Window{usersTest:State}}
async function openUsers(page:Page,options:{locale?:'en'|'fa';guarded?:boolean;serverPending?:string;visitor?:boolean}={}){
    await page.route('**/*.supabase.co/**',route=>route.fulfill({status:403,contentType:'application/json',body:'{}'}))
    await page.addInitScript(locale=>{localStorage.setItem('core-locale',locale);localStorage.setItem('core_intro_last_seen_at',String(Date.now()));localStorage.setItem('core_intro_last_full_seen_at',String(Date.now()))},options.locale ?? 'en')
    await page.goto('/');await page.waitForTimeout(500)
    await page.evaluate(async({A,B,version,options})=>{
        const servicesPath='/src/lib/services/index.ts',authPath='/src/features/auth/authStore.ts',routerPath='/src/app/router/index.tsx',clientPath='/src/lib/services/supabase/adminUsersClient.ts'
        const services=await import(servicesPath),{useAuthStore}=await import(authPath),{router}=await import(routerPath),{UserManagementError}=await import(clientPath)
        let users:AdminUser[]=[{id:A,email:'admin@example.test',fullName:'Administrator',role:'admin',preferredLocale:'en',createdAt:version,updatedAt:version,lastSignInAt:version,status:'active',activeAdmin:true},
            {id:B,email:'second@example.test',fullName:'Second administrator',role:'admin',preferredLocale:'en',createdAt:version,updatedAt:version,lastSignInAt:null,status:'active',activeAdmin:true},
            ...Array.from({length:25},(_,i)=>({id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,email:`person${i}@example.test`,fullName:i===0?'نام فارسی بسیار بلند '+ 'طولانی'.repeat(20):`Visitor ${i}`,
                role:'user' as const,preferredLocale:'en' as const,createdAt:version,updatedAt:version,lastSignInAt:null,status:i%5===0?'invited' as const:'active' as const,activeAdmin:false}))]
        window.usersTest={queries:[],mutations:[],reconciles:0,mode:'success',failList:false,receipts:{}}
        let serverPending=options.serverPending
        services.supabaseAdminService.users=async(query:UserQuery)=>{
            window.usersTest.queries.push(structuredClone(query))
            if(window.usersTest.failList)throw new UserManagementError('serviceUnavailable')
            const filtered=users.filter(user=>(query.role==='all'||user.role===query.role)&&(query.status==='all'||user.status===query.status)
                &&`${user.email} ${user.fullName} ${user.id}`.toLowerCase().includes(query.search.toLowerCase()))
            return {users:filtered.slice((query.page-1)*query.perPage,query.page*query.perPage),total:filtered.length,page:query.page,perPage:query.perPage,
                pendingOperation:serverPending?{operationId:serverPending,action:'invite' as const}:null}
        }
        services.supabaseAdminService.userCapabilities=async():Promise<UserCapabilities>=>({canInvite:true,canEdit:true,canChangeRoles:options.guarded!==false,canDelete:options.guarded!==false})
        services.supabaseAdminService.manageUser=async(request:UserMutation)=>{
            window.usersTest.mutations.push(structuredClone(request))
            if(window.usersTest.mode==='duplicate')throw new UserManagementError('duplicateAccount')
            if(window.usersTest.mode==='conflict')throw new UserManagementError('conflict')
            if(window.usersTest.mode==='forbidden')throw new UserManagementError('forbidden')
            if(window.usersTest.mode==='lastAdmin')throw new UserManagementError('lastAdmin')
            if(window.usersTest.mode==='deleteFailure')return {operationId:request.operationId,state:'failed',code:'requestFailed'}
            if(request.action==='update')users=users.map(user=>user.id===request.id?{...user,fullName:request.fullName,role:request.role,preferredLocale:request.preferredLocale,updatedAt:'2026-10-15T00:00:01Z'}:user)
            if(request.action==='delete')users=users.filter(user=>user.id!==request.id)
            const result:OperationResult={operationId:request.operationId,state:'succeeded'}
            window.usersTest.receipts[request.operationId]=result
            if(window.usersTest.mode==='lost'){serverPending=request.operationId;throw new UserManagementError('operationUncertain',true)}
            return result
        }
        services.supabaseAdminService.reconcileUserOperation=async(id:string)=>{
            window.usersTest.reconciles++;serverPending=undefined
            return window.usersTest.receipts[id] ?? {operationId:id,state:'cancelled'}
        }
        useAuthStore.setState({user:{id:A,name:'Admin',email:'admin@example.test',role:options.visitor?'visitor':'admin'},isAuthenticated:true,isAdmin:!options.visitor,isLoading:false})
        await router.navigate('/admin/users')
    },{A,B,version,options})
    if(!options.visitor)await expect(page.getByRole('table')).toBeVisible()
}
test('listing sends bounded pagination, search and filters to the service',async({page})=>{
    await openUsers(page)
    await expect(page.getByText('Page 1 · 27 users')).toBeVisible()
    await page.getByRole('button',{name:'Next',exact:true}).click()
    await expect(page.getByText('Page 2 · 27 users')).toBeVisible()
    await expect(page.getByRole('cell',{name:'person24@example.test',exact:true})).toBeVisible()
    await page.getByLabel('Search users',{exact:true}).fill('person2')
    await page.getByRole('button',{name:'Search',exact:true}).click()
    await expect(page.getByText('Page 1 · 6 users')).toBeVisible()
    await page.getByLabel('Search users',{exact:true}).fill('');await page.getByRole('button',{name:'Search',exact:true}).click()
    await page.getByRole('combobox',{name:'Role',exact:true}).selectOption('admin')
    await expect(page.getByText('Page 1 · 2 users')).toBeVisible()
    await page.getByRole('combobox',{name:'Role',exact:true}).selectOption('all')
    await page.getByRole('combobox',{name:'Account status',exact:true}).selectOption('invited')
    await expect(page.getByText('Page 1 · 5 users')).toBeVisible()
    const queries=await page.evaluate(()=>window.usersTest.queries)
    expect(queries.some(query=>query.page===2)).toBe(true);expect(queries.at(-1)).toMatchObject({role:'all',status:'invited',page:1,perPage:25})
})
test('invitation submits no password and reports acceptance without claiming delivery',async({page})=>{
    await openUsers(page)
    await page.getByRole('button',{name:'Add user',exact:true}).click()
    const dialog=page.getByRole('dialog')
    await dialog.getByLabel('Email',{exact:true}).fill('new@example.test')
    await dialog.getByLabel('Full name',{exact:true}).fill('New person')
    await dialog.getByLabel('Preferred language').selectOption('fa')
    await dialog.getByRole('button',{name:'Send invitation',exact:true}).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('status')).toContainText('Email delivery has not been verified')
    const request=await page.evaluate(()=>window.usersTest.mutations[0])
    expect(request).toMatchObject({action:'invite',email:'new@example.test',fullName:'New person',preferredLocale:'fa',role:'user'})
    expect('password' in request).toBe(false)
})
test('duplicate invitations keep the editor values and report a safe rejection',async({page})=>{
    await openUsers(page);await page.evaluate(()=>{window.usersTest.mode='duplicate'})
    await page.getByRole('button',{name:'Add user',exact:true}).click()
    const dialog=page.getByRole('dialog');await dialog.getByLabel('Email',{exact:true}).fill('admin@example.test')
    await dialog.getByRole('button',{name:'Send invitation',exact:true}).click()
    await expect(dialog.getByRole('alert')).toContainText('already exists')
    await expect(dialog.getByLabel('Email',{exact:true})).toHaveValue('admin@example.test')
    await expect(dialog.getByRole('button',{name:'Send invitation',exact:true})).toBeEnabled()
})
test('editing sends stable user ID, original version, locale and an allowed role',async({page})=>{
    await openUsers(page)
    await page.getByRole('button',{name:'Edit person1@example.test',exact:true}).click()
    const dialog=page.getByRole('dialog');await dialog.getByLabel('Full name',{exact:true}).fill('Edited person')
    await dialog.getByLabel('Preferred language').selectOption('fa');await dialog.getByRole('combobox',{name:'Role',exact:true}).selectOption('admin')
    await dialog.getByRole('button',{name:'Save changes',exact:true}).click()
    await expect(page.getByRole('status')).toContainText('User profile saved')
    expect((await page.evaluate(()=>window.usersTest.mutations[0]))).toMatchObject({action:'update',id:'00000000-0000-4000-8000-000000000001',expectedUpdatedAt:version,role:'admin',preferredLocale:'fa'})
})
test('self controls and unverified guards disable privileged UI actions',async({page})=>{
    await openUsers(page,{guarded:false})
    await expect(page.getByRole('button',{name:'Delete admin@example.test',exact:true})).toBeDisabled()
    await expect(page.getByRole('button',{name:'Delete second@example.test',exact:true})).toBeDisabled()
    await expect(page.getByText('Role changes and account deletion are disabled', {exact:false})).toBeVisible()
    await page.getByRole('button',{name:'Edit admin@example.test',exact:true}).click()
    await expect(page.getByRole('dialog').getByRole('combobox',{name:'Role',exact:true})).toBeDisabled()
    await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)
})
test('deletion requires the email confirmation and reports confirmed completion',async({page})=>{
    await openUsers(page);await page.getByRole('button',{name:'Delete second@example.test',exact:true}).click()
    const dialog=page.getByRole('dialog');await expect(dialog.getByRole('button',{name:'Delete account',exact:true})).toBeDisabled()
    await dialog.getByLabel('Type the account email to confirm').fill('wrong@example.test')
    await expect(dialog.getByRole('button',{name:'Delete account',exact:true})).toBeDisabled()
    await dialog.getByLabel('Type the account email to confirm').fill('second@example.test')
    await dialog.getByRole('button',{name:'Delete account',exact:true}).click()
    await expect(page.getByRole('status')).toContainText('Account deletion confirmed')
    await expect(page.getByRole('button',{name:'Delete second@example.test',exact:true})).toHaveCount(0)
    expect((await page.evaluate(()=>window.usersTest.mutations[0]))).toMatchObject({action:'delete',id:B,confirmation:'second@example.test',expectedUpdatedAt:version})
})
test('failed deletion and last-admin rejections do not claim success',async({page})=>{
    await openUsers(page);await page.evaluate(()=>{window.usersTest.mode='deleteFailure'})
    await page.getByRole('button',{name:'Delete second@example.test',exact:true}).click()
    const dialog=page.getByRole('dialog');await dialog.getByLabel('Type the account email to confirm').fill('second@example.test')
    await dialog.getByRole('button',{name:'Delete account',exact:true}).click()
    await expect(dialog.getByRole('alert')).toContainText('operation was rejected')
    await page.evaluate(()=>{window.usersTest.mode='lastAdmin'})
    await dialog.getByRole('button',{name:'Delete account',exact:true}).click()
    await expect(dialog.getByRole('alert')).toContainText('last active administrator')
    await dialog.getByRole('button',{name:'Close',exact:true}).click()
    await expect(page.getByRole('button',{name:'Delete second@example.test',exact:true})).toBeVisible()
})
test('uncertain writes retain receipts across route remount and reconcile without resubmission',async({page})=>{
    await openUsers(page);await page.evaluate(()=>{window.usersTest.mode='lost'})
    await page.getByRole('button',{name:'Edit second@example.test',exact:true}).click()
    const dialog=page.getByRole('dialog');await dialog.getByLabel('Full name',{exact:true}).fill('Committed name')
    await dialog.getByRole('button',{name:'Save changes',exact:true}).click()
    await expect(dialog.getByRole('alert')).toContainText('outcome is not confirmed')
    await expect(dialog.getByRole('button',{name:'Save changes',exact:true})).toBeDisabled()
    await dialog.getByRole('button',{name:'Close',exact:true}).click()
    await page.evaluate(async()=>{const path='/src/app/router/index.tsx';const {router}=await import(path);await router.navigate('/admin/dashboard');await router.navigate('/admin/users')})
    await expect(page.getByRole('button',{name:'Add user',exact:true})).toBeDisabled()
    await page.getByRole('button',{name:'Check result',exact:true}).click()
    await expect(page.getByText('User profile saved.',{exact:true})).toBeVisible()
    expect(await page.evaluate(()=>window.usersTest.mutations.length)).toBe(1)
    expect(await page.evaluate(()=>window.usersTest.reconciles)).toBe(1)
})
test('server-side pending receipts recover when browser storage has no receipt',async({page})=>{
    await openUsers(page,{serverPending:'44444444-4444-4444-8444-444444444444'})
    await expect(page.getByRole('button',{name:'Add user',exact:true})).toBeDisabled()
    await page.getByRole('button',{name:'Check result',exact:true}).click()
    await expect(page.getByText('The request was cancelled before it began.',{exact:false})).toBeVisible()
    await expect(page.getByRole('button',{name:'Add user',exact:true})).toBeEnabled()
    expect(await page.evaluate(()=>window.usersTest.mutations.length)).toBe(0)
})
test('listing errors expose retry and expired-session feedback without unsafe controls',async({page})=>{
    await openUsers(page);await page.evaluate(()=>{window.usersTest.failList=true})
    await page.getByRole('button',{name:'Reload users',exact:true}).click()
    await expect(page.getByRole('alert')).toContainText('User management is unavailable')
    await expect(page.getByRole('button',{name:'Add user',exact:true})).toBeDisabled()
    await page.evaluate(()=>{window.usersTest.failList=false});await page.getByRole('button',{name:'Reload users',exact:true}).click()
    await expect(page.getByRole('table')).toBeVisible()
    await page.evaluate(async()=>{const path='/src/lib/services/index.ts',errors='/src/lib/services/supabase/adminUsersClient.ts';const services=await import(path),{UserManagementError}=await import(errors);services.supabaseAdminService.users=async()=>{throw new UserManagementError('unauthorized')}})
    await page.getByRole('button',{name:'Reload users',exact:true}).click()
    await expect(page.getByRole('alert')).toContainText('session is missing or expired')
    await expect(page.getByRole('link',{name:'Sign in again',exact:true})).toBeVisible()
})
test('Persian mobile view stays contained and supports keyboard-accessible editing',async({page})=>{
    await page.setViewportSize({width:390,height:844});await openUsers(page,{locale:'fa'})
    await expect(page.locator('html')).toHaveAttribute('dir','rtl')
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await page.getByRole('button',{name:'افزودن کاربر',exact:true}).click()
    const dialog=page.getByRole('dialog');await expect(dialog.getByLabel('ایمیل',{exact:true})).toBeFocused()
    await dialog.getByLabel('ایمیل',{exact:true}).fill('new@example.test')
    await dialog.getByLabel('نام کامل',{exact:true}).fill('کاربر جدید')
    await dialog.getByRole('button',{name:'ارسال دعوت‌نامه',exact:true}).click()
    await expect(page.getByRole('status')).toContainText('تحویل ایمیل تأیید نشده')
})
test('visitor sessions remain outside the existing admin guard',async({page})=>{
    await openUsers(page,{visitor:true})
    await expect(page.getByRole('heading',{name:'Permission denied',exact:true})).toBeVisible()
    expect(await page.evaluate(()=>window.usersTest.queries.length)).toBe(0)
})
test('revoked administrator authorization clears cached user data and disables changes',async({page})=>{
    await openUsers(page);await page.evaluate(()=>{window.usersTest.mode='forbidden'})
    await page.getByRole('button',{name:'Edit second@example.test',exact:true}).click()
    await page.getByRole('dialog').getByRole('button',{name:'Save changes',exact:true}).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('alert')).toContainText('not authorized')
    await expect(page.getByRole('table')).toHaveCount(0)
    await expect(page.getByRole('button',{name:'Add user',exact:true})).toBeDisabled()
})

test('expired authorization during reconciliation hides user data and retains the unresolved receipt',async({page})=>{
    const operationId='44444444-4444-4444-8444-444444444444'
    await openUsers(page,{serverPending:operationId})
    await page.evaluate(async()=>{
        const path='/src/lib/services/index.ts',errors='/src/lib/services/supabase/adminUsersClient.ts'
        const services=await import(path),{UserManagementError}=await import(errors)
        services.supabaseAdminService.reconcileUserOperation=async()=>{throw new UserManagementError('unauthorized')}
    })
    await page.getByRole('button',{name:'Check result',exact:true}).click()
    await expect(page.getByRole('alert')).toContainText('session is missing or expired')
    await expect(page.getByRole('table')).toHaveCount(0)
    await expect(page.getByRole('button',{name:'Add user',exact:true})).toBeDisabled()
    expect(await page.evaluate(id=>JSON.parse(sessionStorage.getItem(`core-admin-user-operation:${id}`) ?? 'null')?.operationId,A)).toBe(operationId)
    expect(await page.evaluate(()=>window.usersTest.mutations.length)).toBe(0)
})


test('administrator can select editor for invitations and profile updates without extra privileges',async({page})=>{
    await openUsers(page)
    await page.getByRole('button',{name:'Add user',exact:true}).click()
    let dialog=page.getByRole('dialog')
    await dialog.getByLabel('Email',{exact:true}).fill('editor@example.test')
    await dialog.getByRole('combobox',{name:'Role',exact:true}).selectOption('editor')
    await dialog.getByRole('button',{name:'Send invitation',exact:true}).click()
    await expect(page.getByRole('status').filter({hasText:'Email delivery has not been verified'})).toBeVisible()
    await page.getByRole('button',{name:'Edit person1@example.test',exact:true}).click()
    dialog=page.getByRole('dialog')
    await dialog.getByRole('combobox',{name:'Role',exact:true}).selectOption('editor')
    await dialog.getByRole('button',{name:'Save changes',exact:true}).click()
    await expect(page.getByText('User profile saved.',{exact:true})).toBeVisible()
    await page.getByRole('combobox',{name:'Role',exact:true}).selectOption('editor')
    await expect(page.getByRole('cell',{name:'person1@example.test',exact:true})).toBeVisible()
    expect((await page.evaluate(()=>window.usersTest.mutations)).map(request=>'role' in request?request.role:null)).toEqual(['editor','editor'])
})

test('account editor stays in memory across validation, closes its modal layer, and persists no mutation fields',async({page})=>{
 await openUsers(page);await page.getByRole('button',{name:'Add user',exact:true}).click()
 const dialog=page.getByRole('dialog');await dialog.getByLabel('Email',{exact:true}).fill('unsaved@example.test')
 await dialog.getByLabel('Full name',{exact:true}).fill('Unsaved account editor')
 await page.evaluate(async()=>{const p='/src/features/auth/authStore.ts';(await import(p)).useAuthStore.setState({isLoading:true})})
 await expect(page.locator('dialog')).not.toHaveAttribute('open','')
 await page.evaluate(async()=>{const p='/src/features/auth/authStore.ts';(await import(p)).useAuthStore.setState({isLoading:false})})
 await expect(dialog.getByLabel('Email',{exact:true})).toHaveValue('unsaved@example.test')
 await expect(dialog.getByLabel('Full name',{exact:true})).toHaveValue('Unsaved account editor')
 expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('Unsaved account editor'))).toBe(false)
 expect(await page.evaluate(()=>window.usersTest.mutations.length)).toBe(0)
})
