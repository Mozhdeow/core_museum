import {test} from 'node:test'
import assert from 'node:assert/strict'
import type {Session} from '@supabase/supabase-js'
import {createAuthState,type AuthProfile,type SessionResult} from '../src/features/auth/sessionState.ts'
import {databaseRole,displayRole,canUseContentWorkspace,canEditExhibit,parseContentAccess} from '../src/features/auth/permissions.ts'
import {validateUserRequest,UserManagementError} from '../supabase/functions/_shared/adminUsers.ts'
import {createAdminUsersHandler} from '../supabase/functions/admin-users/handler.ts'

const profile=(id='a',role:AuthProfile['role']='user'):AuthProfile=>({id,role,email:`${id}@example.test`,full_name:id,preferred_locale:'en',created_at:'2026-10-15',updated_at:'2026-10-15'})
const result=(id='a',role:AuthProfile['role']='user'):SessionResult=>({session:{user:{id,email:`${id}@example.test`}} as Session,profile:profile(id,role),user:{id,name:id,email:`${id}@example.test`,role:'admin'}})
const deferred=<T>()=>{let resolve!:(value:T)=>void;const promise=new Promise<T>(yes=>{resolve=yes});return {promise,resolve}}
function fixture(){
    let response=result()
    const calls:unknown[]=[]
    const gateway={getSession:async()=>response,signIn:async()=>{},register:async(input:unknown)=>{calls.push(input)},signOut:async()=>{},updateProfile:async(id:string,patch:unknown)=>{calls.push(patch);return profile(id)}}
    return {gateway,store:createAuthState(gateway),calls,setResponse:(value:SessionResult)=>{response=value}}
}

test('role matrix: Visitors have no workspace; editors can only edit verified drafts; admins manage content',()=>{
    assert.equal(displayRole('user'),'visitor');assert.equal(displayRole('editor'),'editor')
    for(const role of [undefined,'visitor','editor','admin'] as const){
        assert.equal(canUseContentWorkspace(role),role==='editor'||role==='admin')
        assert.equal(canEditExhibit(role,'published',true),role==='admin')
        assert.equal(canEditExhibit(role,'draft',false),role==='admin')
        assert.equal(canEditExhibit(role,'draft',true),role==='admin'||role==='editor')
    }
    for(const role of ['owner','superuser','',null,{},true])assert.equal(databaseRole(role),null)
})
test('malformed or missing server capability responses fail closed',()=>{
    for(const value of [null,{}, {role:'editor',editorWritesVerified:'true'},{role:'root',editorWritesVerified:true}])assert.throws(()=>parseContentAccess(value))
    assert.deepEqual(parseContentAccess({role:'editor',editorWritesVerified:false}),{role:'editor',editorWritesVerified:false})
})
test('restored roles come only from matching protected profiles, including editor',async()=>{
    const f=fixture()
    for(const role of ['user','editor','admin'] as const){f.setResponse(result('a',role));await f.store.getState().initialize();assert.equal(f.store.getState().role,role);assert.equal(f.store.getState().isAdmin,role==='admin');assert.equal(f.store.getState().user?.role,displayRole(role))}
    f.setResponse({...result(),profile:profile('another','admin')});await f.store.getState().initialize();assert.equal(f.store.getState().isAuthenticated,false)
    f.setResponse({...result(),profile:{...profile(),role:'root' as AuthProfile['role']}});await f.store.getState().initialize();assert.equal(f.store.getState().user,null)
})
test('failed or expired restoration clears previous privileged state',async()=>{
    const f=fixture();f.setResponse(result('a','admin'));await f.store.getState().initialize()
    f.gateway.getSession=async()=>{throw new Error('Expired')};await f.store.getState().initialize()
    assert.equal(f.store.getState().isAdmin,false);assert.equal(f.store.getState().isAuthenticated,false);assert.equal(f.store.getState().profile,null)
})
test('slow old session cannot override a new identity or restored role',async()=>{
    const f=fixture(),old=deferred<SessionResult>()
    f.gateway.getSession=()=>old.promise;const first=f.store.getState().initialize()
    f.gateway.getSession=async()=>result('b','editor');await f.store.getState().initialize()
    old.resolve(result('a','admin'));await first
    assert.equal(f.store.getState().user?.id,'b');assert.equal(f.store.getState().role,'editor');assert.equal(f.store.getState().isAdmin,false)
})
test('sign-out and Auth event invalidation prevent in-flight loads restoring an account',async()=>{
    const f=fixture(),old=deferred<SessionResult>();f.gateway.getSession=()=>old.promise
    const first=f.store.getState().initialize();await f.store.getState().signOut();old.resolve(result('a','admin'));await first
    assert.equal(f.store.getState().user,null)
    const next=deferred<SessionResult>();f.gateway.getSession=()=>next.promise
    const second=f.store.getState().initialize();f.store.getState().invalidate();next.resolve(result('a','admin'));await second
    assert.equal(f.store.getState().isAdmin,false)
})
test('registration strips role metadata and a browser requested role cannot elevate sign-in',async()=>{
    const f=fixture();await f.store.getState().register({name:'Name',email:'a@example.test',password:'example',role:'admin'} as never)
    assert.deepEqual(f.calls[0],{name:'Name',email:'a@example.test',password:'example'})
    await f.store.getState().signIn({email:'a@example.test',password:'example'},'admin');assert.equal(f.store.getState().user?.role,'visitor')
})
test('own profile patches cannot forward role or override a switched account',async()=>{
    const f=fixture();await f.store.getState().initialize()
    await f.store.getState().updateProfile({full_name:'Changed',preferred_locale:'fa',role:'admin'} as never)
    assert.deepEqual(f.calls[0],{full_name:'Changed',preferred_locale:'fa'})
    const pending=deferred<AuthProfile>();f.gateway.updateProfile=()=>pending.promise
    const save=f.store.getState().updateProfile({full_name:'Old account'})
    f.setResponse(result('b','editor'));await f.store.getState().initialize();pending.resolve(profile('a','admin'));await save
    assert.equal(f.store.getState().user?.id,'b');assert.equal(f.store.getState().role,'editor')
})
test('trusted role assignment accepts editor and discards actor, metadata and gate overposting',()=>{
    const request=validateUserRequest({action:'invite',operationId:crypto.randomUUID(),email:'editor@example.test',fullName:'Editor',preferredLocale:'fa',role:'editor',actor:'other',rolesEnabled:true,password:'secret'})
    assert.equal('role' in request && request.role,'editor');assert.equal('rolesEnabled' in request,false);assert.equal('actor' in request,false)
    assert.throws(()=>validateUserRequest({...request,role:'owner'}),UserManagementError)
})
test('editor invitations are blocked at the Edge gate before any Auth call or reservation',async()=>{
    let writes=0
    const handler=createAdminUsersHandler({authenticate:async()=>({id:'trusted-admin'}),command:async(_actor,action)=>{if(action!=='authorize')writes++;return {}},invite:async()=>{writes++},deleteUser:async()=>{writes++}},
        {origins:['https://core.test'],redirect:'https://core.test/reset-password',writesEnabled:true,guardsVerified:false})
    const response=await handler(new Request('https://core.test',{method:'POST',headers:{origin:'https://core.test',authorization:'Bearer token','content-type':'application/json'},body:JSON.stringify({action:'invite',operationId:crypto.randomUUID(),email:'editor@example.test',fullName:'Editor',preferredLocale:'en',role:'editor',rolesEnabled:true})}))
    assert.equal(response.status,403);assert.equal((await response.json()).error,'guardUnverified');assert.equal(writes,0)
})
