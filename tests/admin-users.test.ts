import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createAdminUsersHandler,AuthAdminRejection,type AdminBackend} from '../supabase/functions/admin-users/handler.ts'
import {validateUserRequest,UserManagementError,type AdminUser,type UserQuery,type OperationResult} from '../supabase/functions/_shared/adminUsers.ts'
import {createAdminUsersClient} from '../src/lib/services/supabase/adminUsersClient.ts'

const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222', U='33333333-3333-4333-8333-333333333333'
const version='2026-10-15T00:00:00.001Z', origin='https://core.example.test'
const fields={fullName:'Test user',preferredLocale:'fa' as const,role:'user' as const}
const query:UserQuery={page:1,perPage:10,search:'',role:'all',status:'all'}
const row=(id:string,role:'user'|'editor'|'admin'):AdminUser=>({id,role,email:`${id[0]}@example.test`,fullName:`User ${id[0]}`,preferredLocale:'en',createdAt:version,updatedAt:version,lastSignInAt:null,status:'active',activeAdmin:role==='admin'})

// A deterministic transaction model for HTTP orchestration tests, NOT PostgreSQL verification.
class Backend implements AdminBackend {
    users=new Map([ [A,row(A,'admin')],[B,row(B,'admin')],[U,row(U,'user')] ])
    operations=new Map<string,OperationResult & {actor:string;kind:string;input:Record<string,unknown>}>()
    events:string[]=[]; invites=0; deletes=0; inviteFailure:'none'|'reject'|'lost'='none'; deleteFailure:'none'|'reject'|'lost'='none'
    serial=0; queue=Promise.resolve(); correlated=new Map<string,string>()
    async authenticate(token:string){return ['A','B','U','forged-admin-metadata'].includes(token)?{id:token==='A'?A:token==='B'?B:U}:null}
    async command(actor:string,action:string,operation:string|null,input:Record<string,unknown>):Promise<unknown>{
        const prior=this.queue;let unlock!:()=>void;this.queue=new Promise(resolve=>{unlock=resolve});await prior
        try{return this.transaction(actor,action,operation,input)}finally{unlock()}
    }
    transaction(actor:string,action:string,id:string|null,input:Record<string,unknown>):unknown{
        this.events.push(action)
        const caller=this.users.get(actor)
        const pendingDelete=[...this.operations.values()].find(op=>op.kind==='delete'&&op.state==='pending')
        if(caller?.role!=='admin'||pendingDelete?.userId===actor)throw new UserManagementError('forbidden')
        if(action==='authorize')return {authorized:true}
        if(action==='list'){
            const selected=[...this.users.values()].filter(user=>(input.role==='all'||user.role===input.role)&&(input.status==='all'||user.status===input.status)
                &&`${user.email} ${user.fullName} ${user.id}`.toLowerCase().includes(String(input.search).toLowerCase()))
            return {users:selected.slice((Number(input.page)-1)*Number(input.perPage),Number(input.page)*Number(input.perPage)),total:selected.length,page:input.page,perPage:input.perPage}
        }
        let op=this.operations.get(id!)
        if(op&&op.actor!==actor)throw new UserManagementError('forbidden')
        if(action==='status'){
            if(!op){op={operationId:id!,state:'cancelled',actor,kind:'cancel',input:{}};this.operations.set(id!,op);return op}
            if(op.state==='pending'&&op.kind==='invite')return this.transaction(actor,'finish_invite',id,input)
            if(op.state==='pending'&&op.kind==='delete')return this.transaction(actor,'finish_delete',id,{})
            return op
        }
        if(['update','begin_delete','begin_invite'].includes(action)){
            if(op){if(op.state!=='cancelled'&&JSON.stringify(op.input)!==JSON.stringify(input))throw new UserManagementError('conflict');return {...op,execute:false}}
            if(pendingDelete)throw new UserManagementError('operationBusy')
            const target=this.users.get(String(input.id))
            if(action!=='begin_invite'&&(!target||target.updatedAt!==input.expectedUpdatedAt))throw new UserManagementError('conflict')
            if(action==='begin_invite'){
                if([...this.users.values()].some(user=>user.email===input.email))throw new UserManagementError('duplicateAccount')
                if(input.role!=='user'&&!input.rolesEnabled)throw new UserManagementError('guardUnverified')
            }
            if(action==='begin_delete' || (action==='update'&&target!.role!==input.role)){
                if(input.id===actor)throw new UserManagementError('selfProtected')
                if(action==='update'&&!input.rolesEnabled)throw new UserManagementError('guardUnverified')
                if(target!.role==='admin'&&[...this.users.values()].filter(user=>user.id!==target!.id&&user.activeAdmin).length===0)throw new UserManagementError('lastAdmin')
            }
            if(action==='begin_delete'&&target!.email!==input.confirmation)throw new UserManagementError('invalidInput')
            op={operationId:id!,state:action==='update'?'succeeded':'pending',actor,kind:action==='update'?'update':action==='begin_delete'?'delete':'invite',input:structuredClone(input),userId:target?.id}
            this.operations.set(id!,op)
            if(action==='update'){Object.assign(target!,{fullName:input.fullName,role:input.role,preferredLocale:input.preferredLocale,updatedAt:`changed-${++this.serial}`,activeAdmin:input.role==='admin'})}
            return {...op,execute:true}
        }
        if(!op)throw new UserManagementError('conflict')
        if(action==='finish_invite'){
            if(!input.writesEnabled || (op.input.role!=='user'&&!input.rolesEnabled))return op
            const userId=this.correlated.get(id!)
            if(userId){op.state='succeeded';op.userId=userId;Object.assign(this.users.get(userId)!,{fullName:op.input.fullName,preferredLocale:op.input.preferredLocale,role:op.input.role})}
        } else if(action==='finish_delete'){
            if(!this.users.has(op.userId!))op.state='succeeded'
        } else if(action==='reject'){op.state='failed';op.code=input.code as OperationResult['code']}
        return op
    }
    async invite(email:string,data:Record<string,string>){
        this.invites++;this.events.push('Auth.invite')
        if(this.inviteFailure==='reject')throw new AuthAdminRejection('duplicateAccount')
        const id=crypto.randomUUID();this.users.set(id,{...row(id,'user'),email,status:'invited',activeAdmin:false});this.correlated.set(data.core_invitation_id,id)
        if(this.inviteFailure==='lost')throw new Error('SMTP secret must never leak')
    }
    async deleteUser(id:string){
        this.deletes++;this.events.push('Auth.delete')
        if(this.deleteFailure==='reject')throw new AuthAdminRejection('requestFailed')
        this.users.delete(id)
        if(this.deleteFailure==='lost')throw new Error('Response lost')
    }
}
function fixture(overrides:Partial<{writesEnabled:boolean;guardsVerified:boolean;redirect:string}>={}){
    const backend=new Backend(), handler=createAdminUsersHandler(backend,{origins:[origin],redirect:`${origin}/reset-password`,writesEnabled:true,guardsVerified:true,...overrides})
    const call=async(body:unknown,token='A',requestOrigin=origin)=>{
        const response=await handler(new Request(`${origin}/admin-users`,{method:'POST',headers:{origin:requestOrigin,authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body)}))
        return {status:response.status,body:await response.json() as {ok:boolean;data:OperationResult & {users:AdminUser[];total:number;canDelete:boolean;canChangeRoles:boolean};error:string;uncertain:boolean}}
    }
    return {backend,handler,call}
}
const update=(id=B,role:'user'|'editor'|'admin'='user')=>({action:'update',operationId:crypto.randomUUID(),id,expectedUpdatedAt:version,...fields,role})
const invite=()=>({action:'invite',operationId:crypto.randomUUID(),email:'new@example.test',...fields})
const remove=()=>({action:'delete',operationId:crypto.randomUUID(),id:B,expectedUpdatedAt:version,confirmation:'2@example.test'})

test('listing, substring search, role/status filtering and server pagination use bounded parameters',async()=>{
    const {call}=fixture()
    assert.equal((await call({action:'list',...query})).body.data.total,3)
    assert.equal((await call({action:'list',...query,search:'User 3',role:'user'})).body.data.users[0].id,U)
    assert.equal((await call({action:'list',...query,page:2})).body.data.users.length,0)
    assert.equal((await call({action:'list',...query,status:'banned'})).body.data.total,0)
    assert.equal((await call({action:'list',...query,perPage:100000})).status,400)
})
test('verified identity and trusted database role reject visitor/forged metadata and expired sessions',async()=>{
    const {call,backend}=fixture()
    for(const token of ['U','forged-admin-metadata'])assert.equal((await call(invite(),token)).status,403)
    assert.equal((await call(invite(),'expired')).status,401)
    assert.equal(backend.invites,0)
})
test('CORS, preflight, methods and oversized bodies fail closed',async()=>{
    const {handler,call,backend}=fixture()
    assert.equal((await call(invite(),'A','https://attacker.test')).status,403)
    assert.equal(backend.events.length,0)
    const response=await handler(new Request(origin,{method:'OPTIONS',headers:{origin}}))
    assert.equal(response.status,204);assert.equal(response.headers.get('access-control-allow-origin'),origin)
    assert.equal((await handler(new Request(origin,{headers:{origin}}))).status,405)
    assert.equal((await call({action:'invite',oversized:'x'.repeat(17000)})).status,400)
})
test('invitations call Auth once and then commit a trigger-associated profile',async()=>{
    const {call,backend}=fixture(), request=invite()
    const result=await call({...request,role:'admin',actor:U,service_role:'ignored',password:'ignored'})
    assert.equal(result.body.data.state,'succeeded');assert.equal(backend.invites,1)
    assert.equal(backend.users.get(result.body.data.userId!)?.role,'admin')
    assert.equal(backend.users.get(result.body.data.userId!)?.preferredLocale,'fa')
    assert.ok(backend.events.indexOf('begin_invite')<backend.events.indexOf('Auth.invite'))
    await call({...request,role:'admin'});assert.equal(backend.invites,1)
})
test('existing emails and invalid roles cannot be used to overwrite or escalate accounts',async()=>{
    const {call,backend}=fixture()
    assert.equal((await call({...invite(),email:'3@example.test'})).body.error,'duplicateAccount')
    assert.equal((await call({...invite(),role:'owner'})).status,400)
    assert.equal((await call({...invite(),email:'invalid'})).status,400)
    assert.equal(backend.invites,0);assert.equal(backend.users.get(U)?.role,'user')
})
test('profile edits preserve identity and reject stale versions; role promotions are guarded',async()=>{
    const {call,backend}=fixture()
    const request=update(U,'admin')
    assert.equal((await call(request)).body.data.state,'succeeded')
    assert.equal(backend.users.get(U)?.role,'admin')
    assert.equal((await call(update(U,'user'))).body.error,'conflict')
    assert.equal((await call({...update(A),expectedUpdatedAt:version})).body.error,'selfProtected')
})
test('write and guard gates block unsafe operations independently of browser controls',async()=>{
    const {call,backend}=fixture({guardsVerified:false})
    assert.equal((await call({action:'capabilities'})).body.data.canDelete,false)
    assert.equal((await call(remove())).body.error,'guardUnverified')
    assert.equal((await call(update(B))).body.error,'guardUnverified')
    assert.equal((await call({...invite(),role:'admin'})).body.error,'guardUnverified')
    assert.equal((await call(update(U))).body.data.state,'succeeded')
    assert.equal(backend.deletes,0)
    assert.equal((await fixture({writesEnabled:false}).call(invite())).body.error,'writesDisabled')
})
test('server checks delete confirmation and self-deletion before any Auth deletion',async()=>{
    const {call,backend}=fixture()
    assert.equal((await call({...remove(),confirmation:'wrong'})).body.error,'invalidInput')
    assert.equal((await call({...remove(),id:A,confirmation:'1@example.test'})).body.error,'selfProtected')
    assert.equal(backend.deletes,0)
})
test('concurrent HTTP role changes obey serialized guard decisions in the transaction model',async()=>{
    const {call,backend}=fixture()
    const result=await Promise.all([call(update(B),'A'),call(update(A),'B')])
    assert.equal(result.filter(value=>value.body.ok).length,1)
    assert.equal([...backend.users.values()].filter(user=>user.activeAdmin).length,1)
})
test('deletion succeeds only after Auth and database state confirm completion',async()=>{
    const {call,backend}=fixture(), request=remove()
    const result=await call(request)
    assert.equal(result.body.data.state,'succeeded');assert.equal(backend.users.has(B),false)
    assert.ok(backend.events.indexOf('begin_delete')<backend.events.indexOf('Auth.delete'))
    assert.ok(backend.events.indexOf('Auth.delete')<backend.events.indexOf('finish_delete'))
})
test('known Auth rejection reports failure and never claims deletion succeeded',async()=>{
    const {call,backend}=fixture();backend.deleteFailure='reject'
    const result=await call(remove())
    assert.equal(result.body.data.state,'failed');assert.equal(backend.users.has(B),true)
})
test('lost delete response retains the reservation and reconciliation confirms actual outcome',async()=>{
    const {call,backend}=fixture(), request=remove();backend.deleteFailure='lost'
    const result=await call(request)
    assert.equal(result.body.uncertain,true);assert.equal(backend.operations.get(request.operationId)?.state,'pending')
    assert.equal((await call({action:'reconcile',operationId:request.operationId})).body.data.state,'succeeded')
    assert.equal(backend.deletes,1)
})
test('lost invitation response is reconciled without sending a second invitation or leaking errors',async()=>{
    const {call,backend}=fixture(), request=invite();backend.inviteFailure='lost'
    const result=await call(request)
    assert.equal(result.body.uncertain,true);assert.equal(JSON.stringify(result).includes('SMTP secret'),false)
    assert.equal((await call({action:'reconcile',operationId:request.operationId})).body.data.state,'succeeded')
    await call(request);assert.equal(backend.invites,1)
})
test('a profile commit failure after Auth creation remains uncertain and keeps the trigger default role',async()=>{
    const {call,backend}=fixture(),request=invite(),command=backend.command.bind(backend)
    backend.command=async(actor,action,id,input)=>{
        if(action==='finish_invite')throw new UserManagementError('requestFailed')
        return command(actor,action,id,input)
    }
    const result=await call({...request,role:'admin'})
    assert.equal(result.body.uncertain,true);assert.equal(backend.operations.get(request.operationId)?.state,'pending')
    assert.equal(backend.users.get(backend.correlated.get(request.operationId)!)?.role,'user')
    backend.command=command
    assert.equal((await call({action:'reconcile',operationId:request.operationId})).body.data.state,'succeeded')
    assert.equal(backend.invites,1)
})
test('reconciliation cannot bypass disabled writes or role gates for an old pending invitation',async()=>{
    const {call,backend}=fixture(),request={...invite(),role:'admin'};backend.inviteFailure='lost'
    await call(request)
    const gated=createAdminUsersHandler(backend,{origins:[origin],redirect:`${origin}/reset-password`,writesEnabled:true,guardsVerified:false})
    const response=await gated(new Request(origin,{method:'POST',headers:{origin,authorization:'Bearer A','content-type':'application/json'},body:JSON.stringify({action:'reconcile',operationId:request.operationId,rolesEnabled:true})}))
    const result=await response.json() as {data:OperationResult}
    assert.equal(result.data.state,'pending');assert.equal(backend.users.get(backend.correlated.get(request.operationId)!)?.role,'user')
})
test('a pending deletion fences the target during a concurrent admin request',async()=>{
    const {call,backend}=fixture(),request=remove()
    let release!:()=>void
    const wait=new Promise<void>(resolve=>{release=resolve}),deleteUser=backend.deleteUser.bind(backend)
    backend.deleteUser=async id=>{await wait;await deleteUser(id)}
    const deletion=call(request)
    while(!backend.operations.has(request.operationId))await new Promise(resolve=>setTimeout(resolve,1))
    assert.equal((await call(update(A),'B')).body.error,'forbidden')
    assert.equal((await call(update(U),'A')).body.error,'operationBusy')
    release();assert.equal((await deletion).body.data.state,'succeeded')
})
test('unknown operations are tombstoned before late handlers can execute',async()=>{
    const {call,backend}=fixture(), request=invite()
    assert.equal((await call({action:'reconcile',operationId:request.operationId})).body.data.state,'cancelled')
    assert.equal((await call(request)).body.data.state,'cancelled');assert.equal(backend.invites,0)
})
test('operation receipts are actor-bound and cannot be repurposed for a different request',async()=>{
    const {call}=fixture(),request=invite();await call(request)
    assert.equal((await call({action:'reconcile',operationId:request.operationId},'B')).status,403)
    assert.equal((await call({...request,email:'other@example.test'})).body.error,'conflict')
})
test('invalid redirect prevents invitations; caller role is rechecked on every operation',async()=>{
    assert.equal((await fixture({redirect:'https://evil.test/reset-password'}).call(invite())).body.error,'serviceUnavailable')
    const {call,backend}=fixture();await call({action:'capabilities'});backend.users.get(A)!.role='user'
    assert.equal((await call(invite())).status,403)
})
test('input normalization allowlists fields and rejects control characters, roles and identifiers',()=>{
    const parsed=validateUserRequest({...invite(),email:' NAME@EXAMPLE.TEST ',fullName:'  Name  ',role:'user',actor:U,password:'no'})
    assert.equal('password' in parsed,false);assert.equal('actor' in parsed,false)
    if(parsed.action==='invite'){assert.equal(parsed.email,'name@example.test');assert.equal(parsed.fullName,'Name')}
    for(const input of [{...update(),id:'../bad'},{...invite(),fullName:'bad\nname'},{...update(),expectedUpdatedAt:'never'},{...invite(),preferredLocale:'xx'}])assert.throws(()=>validateUserRequest(input),UserManagementError)
})

test('browser adapter forwards session JWT and pagination without privileged credentials',async()=>{
    let authorization='',sent:unknown
    const client=createAdminUsersClient(()=>({auth:{getSession:async()=>({data:{session:{access_token:'session-jwt'}},error:null})},functions:{invoke:async(name,options)=>{
        assert.equal(name,'admin-users');authorization=options.headers.Authorization;sent=options.body
        return {data:{ok:true,data:{users:[],total:0,page:1,perPage:10}},error:null}
    }}}))
    assert.equal((await client.list(query)).total,0);assert.equal(authorization,'Bearer session-jwt');assert.deepEqual(sent,{action:'list',...query})
})
test('browser rejects missing sessions without dispatch and never retries a lost write',async()=>{
    let calls=0
    const missing=createAdminUsersClient(()=>({auth:{getSession:async()=>({data:{session:null},error:null})},functions:{invoke:async()=>{calls++;throw new Error('unexpected')}}}))
    await assert.rejects(missing.list(query),{code:'unauthorized'});assert.equal(calls,0)
    const lost=createAdminUsersClient(()=>({auth:{getSession:async()=>({data:{session:{access_token:'jwt'}},error:null})},functions:{invoke:async()=>{calls++;return {data:null,error:new Error('network')}}}}))
    await assert.rejects(lost.mutate(invite() as Parameters<typeof lost.mutate>[0]),{code:'operationUncertain',uncertain:true});assert.equal(calls,1)
})
test('browser handles 401, safe server errors and malformed success receipts',async()=>{
    const create=(data:unknown,error:unknown)=>createAdminUsersClient(()=>({auth:{getSession:async()=>({data:{session:{access_token:'jwt'}},error:null})},functions:{invoke:async()=>({data,error})}}))
    await assert.rejects(create(null,{context:new Response('{}',{status:401})}).list(query),{code:'unauthorized'})
    await assert.rejects(create(null,{context:new Response(JSON.stringify({ok:false,error:'duplicateAccount',uncertain:false}),{status:409})}).mutate(invite() as never),{code:'duplicateAccount',uncertain:false})
    await assert.rejects(create({ok:true,data:{state:'succeeded',operationId:'wrong'}},null).mutate(invite() as never),{uncertain:true})
    await assert.rejects(create({ok:true,data:{users:[{id:A,role:'superuser'}],total:1,page:1,perPage:10}},null).list(query),{code:'serviceUnavailable'})
    await assert.rejects(create({ok:true,data:{users:[],total:0,page:1,perPage:10,pendingOperation:{operationId:'bad',action:'delete'}}},null).list(query),{code:'serviceUnavailable'})
})

test('verified administrator can invite and assign editor through the existing receipt workflow',async()=>{
    const {call,backend}=fixture()
    const invitation={...invite(),role:'editor'}
    const first=await call(invitation)
    assert.equal(first.body.data.state,'succeeded');assert.equal(backend.users.get(first.body.data.userId!)?.role,'editor')
    await call(invitation);assert.equal(backend.invites,1)
    const updated=await call(update(U,'editor'));assert.equal(updated.body.data.state,'succeeded');assert.equal(backend.users.get(U)?.role,'editor')
    assert.equal((await call({action:'list',...query,role:'editor'})).body.data.total,2)
})
test('an editor cannot administer users even when invitation metadata claims administrator',async()=>{
    const {call,backend}=fixture();backend.users.set(U,row(U,'editor'))
    assert.equal((await call({action:'list',...query},'U')).status,403)
    assert.equal((await call({...invite(),role:'admin'},'forged-admin-metadata')).status,403)
    assert.equal(backend.invites,0)
})
