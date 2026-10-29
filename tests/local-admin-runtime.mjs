// Opt-in only: requires the separately prepared disposable core-admin-runtime-20261024 stack.
// Hard-coded isolated project/ports and an initially empty Auth schema prevent use on CORE.
import assert from 'node:assert/strict'
import {execFileSync,spawn} from 'node:child_process'
import {writeFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
import {functionsOwnCors} from '../scripts/local-supabase.mjs'
const project='core-admin-runtime-20261024',fixture=process.cwd()+'/.tmp/admin-runtime/fixture',origin='http://127.0.0.1:5192',checks=[]
const run=(args,options={})=>execFileSync('docker',args,{encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:15000,...options})
const cli=args=>execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js',...args,'--workdir',fixture],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:15000})
const sql=query=>run(['exec','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',query]).trim()
const save=()=>writeFileSync('.tmp/admin-runtime/results.json',JSON.stringify({project,checks},null,2))
const fail=e=>({type:e.name,code:e.code??null,message:String(e.message).replace(/eyJ[\w.-]+|sb_(?:secret|publishable)_[\w-]+|(?:token|password|secret)=[^\s&]+/g,'[REDACTED]').slice(0,250)})
async function check(name,fn){try{await fn();checks.push({name,pass:true});console.log('PASS '+name);save()}catch(e){checks.push({name,pass:false,error:fail(e)});save();console.log('FAIL '+name+' '+JSON.stringify(fail(e)));throw Error('Stop after failed runtime check')}}
let edge
const delay=ms=>new Promise(r=>setTimeout(r,ms))
const users={},password=crypto.randomUUID()+'aA1!'
try{
const status=JSON.parse(cli(['status','--output','json']));assert.equal(status.API_URL,'http://127.0.0.1:55631');const mail=new URL(status.MAILPIT_URL||status.INBUCKET_URL);assert.equal(mail.hostname,'127.0.0.1');assert.equal(mail.port,'55634')
const client=(key=status.ANON_KEY)=>createClient(status.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(u,o)=>{assert.equal(new URL(String(u)).origin,status.API_URL);return fetch(u,{...o,signal:AbortSignal.timeout(10000)})}}})
const service=client(status.SERVICE_ROLE_KEY)
const call=async(token,body={action:'capabilities'},requestOrigin=origin)=>{const r=await fetch(status.API_URL+'/functions/v1/admin-users',{method:'POST',headers:{apikey:status.ANON_KEY,Origin:requestOrigin,'content-type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});return {status:r.status,origin:r.headers.get('access-control-allow-origin'),body:await r.json()}}
const req=(body,actor='admin')=>call(users[actor].session.access_token,body)
const invite=(role,email=`invite-${role}@runtime.invalid`)=>({action:'invite',operationId:crypto.randomUUID(),email,fullName:'Runtime '+role,preferredLocale:'fa',role})
const version=id=>sql(`select updated_at from public.profiles where id='${id}'`)
const update=(id,role,fullName='Updated runtime')=>({action:'update',operationId:crypto.randomUUID(),id,expectedUpdatedAt:version(id),role,preferredLocale:'en',fullName})
async function startEdge(guards){
 if(edge){edge.kill();await delay(300)}
 writeFileSync(fixture+'/edge.env',`CORE_ADMIN_ALLOWED_ORIGINS=${origin}\nCORE_INVITE_REDIRECT_URL=${origin}/reset-password\nCORE_ADMIN_WRITES_ENABLED=true\nCORE_ADMIN_GUARDS_VERIFIED=${guards}\n`)
 edge=spawn(process.execPath,['node_modules/supabase/dist/supabase.js','functions','serve','admin-users','--workdir',fixture,'--env-file',fixture+'/edge.env'],{stdio:['ignore','pipe','pipe'],windowsHide:true})
 // Consume provider logs without persisting/printing their possible credentials.
 for(const stream of [edge.stdout,edge.stderr])stream.on('data',()=>{})
 let ready=false
 for(let i=0;i<20;i++){await delay(500);try{const c=await req({action:'capabilities'});if(c.status===200&&c.body.data.canChangeRoles===guards){ready=true;break}}catch{}}
 assert.ok(ready,'Matching Edge capabilities did not become ready')
}
await check('Isolated matching runtime and synthetic confirmed roles',async()=>{
 assert.equal(sql('select count(*) from auth.users'),'0')
 for(const [name,image] of [['db','postgres:17.6.1.171'],['auth','gotrue:v2.197.0'],['rest','postgrest:v14.18'],['edge_runtime','edge-runtime:v1.76.2']])assert.equal(JSON.parse(run(['inspect','supabase_'+name+'_'+project]))[0].Config.Image,'public.ecr.aws/supabase/'+image)
 for(const role of ['user','editor','admin']){const email=`actor-${role}@runtime.invalid`,created=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Synthetic '+role}});assert.ifError(created.error);const id=created.data.user.id;if(role!=='user')sql(`update public.profiles set role='${role}' where id='${id}'`);const c=client(),login=await c.auth.signInWithPassword({email,password});assert.ifError(login.error);users[role]={id,email,client:c,session:login.data.session}}
 const container='supabase_kong_'+project,original=run(['exec',container,'cat','/home/kong/kong.yml']),next=functionsOwnCors(original)
 if(next!==original){run(['exec','-u','root','-i',container,'sh','-c','cat > /home/kong/kong.yml'],{input:next});run(['exec','-i',container,'wget','-q','-O','/dev/null','--header=Content-Type: application/json','--post-file=/dev/stdin','http://127.0.0.1:8001/config'],{input:JSON.stringify({config:next})})}
 await startEdge(false)
})
await check('Actual JWT verification exact CORS current-role authorization and independent gates',async()=>{
 assert.equal((await call(null)).status,401);assert.equal((await call('invalid')).status,401)
 for(const role of ['user','editor'])assert.equal((await req({action:'capabilities'},role)).status,403)
 const bad=await call(users.admin.session.access_token,{action:'capabilities'},'http://forbidden.invalid');assert.equal(bad.status,403);assert.equal(bad.origin,null)
 const cors=await fetch(status.API_URL+'/functions/v1/admin-users',{method:'OPTIONS',headers:{Origin:origin}});assert.equal(cors.status,204);assert.equal(cors.headers.get('access-control-allow-origin'),origin)
 const caps=await req({action:'capabilities'});assert.equal(caps.origin,origin);assert.deepEqual(caps.body.data.supportedRoles,['user','editor','admin']);assert.equal(caps.body.data.canInvite,true);assert.equal(caps.body.data.canEdit,true);assert.equal(caps.body.data.canChangeRoles,false);assert.equal(caps.body.data.canDelete,false)
 for(const role of ['editor','admin']){const denied=await req(invite(role,`blocked-${role}@runtime.invalid`));assert.equal(denied.body.error,'guardUnverified')}
 assert.equal(sql('select count(*) from public.admin_user_operations'),'0')
 await startEdge(true)
 assert.equal((await req({action:'capabilities'})).body.data.canDelete,false)
 const denied=await req({action:'delete',operationId:crypto.randomUUID(),id:users.user.id,expectedUpdatedAt:version(users.user.id),confirmation:users.user.email});assert.equal(denied.status,403)
 assert.equal(sql('select editor_writes_verified from public.core_security_settings where singleton'),'f')
})
async function messageFor(email){for(let i=0;i<10;i++){const list=await(await fetch(new URL('/api/v1/search?query='+encodeURIComponent('to:'+email),mail))).json();if(list.messages?.length){return await(await fetch(new URL('/api/v1/message/'+list.messages[0].ID,mail))).json()}await delay(300)}throw Error('Synthetic invitation not delivered to Mailpit')}
const invited={}
await check('Visitor Editor Admin invitations finalize profiles and deliver usable reset links via SMTP',async()=>{
 for(const role of ['user','editor','admin']){
  const input=invite(role),r=await req(input);assert.equal(r.status,200);assert.equal(r.body.data.state,'succeeded');const id=r.body.data.userId;assert.match(id,/^[a-f0-9-]{36}$/)
  assert.equal(sql(`select role from public.profiles where id='${id}'`),role);assert.equal(sql(`select preferred_locale from public.profiles where id='${id}'`),'fa')
  const message=await messageFor(input.email),content=(message.HTML||'')+'\n'+(message.Text||'');const links=content.replaceAll('&amp;','&').match(/https?:\/\/[^\s"<>]+/g)||[];const link=links.find(value=>{try{const u=new URL(value);return u.origin===status.API_URL&&u.pathname==='/auth/v1/verify'}catch{return false}});assert.ok(link,'Invitation verify URL missing');const u=new URL(link);assert.equal(u.searchParams.get('redirect_to'),origin+'/reset-password')
  const accepted=await fetch(link,{redirect:'manual'});assert.equal(accepted.status,303);const target=new URL(accepted.headers.get('location'));assert.equal(target.origin,origin);assert.equal(target.pathname,'/reset-password');const hash=new URLSearchParams(target.hash.slice(1));assert.ok(hash.get('access_token'));assert.equal(hash.has('error'),false)
  const c=client(),session=await c.auth.setSession({access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token')});assert.ifError(session.error);assert.ifError((await c.auth.updateUser({password})).error);assert.ifError((await c.auth.signOut()).error)
  const login=await c.auth.signInWithPassword({email:input.email,password});assert.ifError(login.error);const profile=await c.from('profiles').select('id,role').eq('id',id).single();assert.ifError(profile.error);assert.equal(profile.data.role,role)
  const restored=client();assert.ifError((await restored.auth.setSession(login.data.session)).error);assert.equal((await restored.from('profiles').select('role').eq('id',id).single()).data.role,role)
  invited[role]={id,input,client:c,session:login.data.session,email:input.email}
 }
})
await check('Duplicate invitations idempotent receipts and searched filtered paginated list',async()=>{
 const sent=(await(await fetch(new URL('/api/v1/messages',mail))).json()).total
 assert.equal((await req(invited.user.input)).body.data.state,'succeeded')
 assert.equal((await req(invite('admin',invited.user.email))).body.error,'duplicateAccount')
 assert.equal((await(await fetch(new URL('/api/v1/messages',mail))).json()).total,sent)
 const r=await req({action:'list',page:1,perPage:10,search:invited.editor.email,role:'editor',status:'active'});assert.equal(r.body.data.total,1);assert.equal(r.body.data.users[0].id,invited.editor.id)
 assert.equal((await req({action:'list',page:2,perPage:10,search:'',role:'all',status:'all'})).body.data.users.length,0)
})
await check('Actual profile edit guarded role change and stale-version conflict',async()=>{
 const input=update(invited.user.id,'editor');assert.equal((await req(input)).body.data.state,'succeeded')
 assert.equal((await req({...input,operationId:crypto.randomUUID(),fullName:'Stale overwrite'})).body.error,'conflict')
 assert.equal(sql(`select full_name from public.profiles where id='${invited.user.id}'`),'Updated runtime')
 assert.equal((await req({action:'capabilities'})).body.data.canChangeRoles,true)
 assert.equal((await invited.user.client.from('profiles').select('role').eq('id',invited.user.id).single()).data.role,'editor')
})
await check('Uncertain invitation outcome receipt recovery never resends and tombstones late requests',async()=>{
 // Drop the client's response after the real Auth/SMTP/SQL operation. The client
 // has no completion evidence until an explicit receipt lookup; no write replay.
 const input=invite('user','uncertain@runtime.invalid');await req(input)
 const resolved=await req({action:'reconcile',operationId:input.operationId});assert.equal(resolved.body.data.state,'succeeded');await messageFor(input.email)
 const pending=invite('editor','pending@runtime.invalid'),payload={...pending,rolesEnabled:true}
 assert.ifError((await service.rpc('core_admin_users',{actor:users.admin.id,action:'begin_invite',operation:pending.operationId,input:payload})).error)
 assert.equal((await req({action:'reconcile',operationId:pending.operationId})).body.data.state,'pending')
 assert.ifError((await service.auth.admin.inviteUserByEmail(pending.email,{data:{full_name:pending.fullName,preferred_locale:pending.preferredLocale,core_invitation_id:pending.operationId},redirectTo:origin+'/reset-password'})).error)
 assert.equal((await req({action:'reconcile',operationId:pending.operationId})).body.data.state,'succeeded');await messageFor(pending.email)
 const unknown=invite('user','cancelled@runtime.invalid');assert.equal((await req({action:'reconcile',operationId:unknown.operationId})).body.data.state,'cancelled');assert.equal((await req(unknown)).body.data.state,'cancelled')
 assert.equal((await req({action:'reconcile',operationId:input.operationId},'user')).status,403)
})
await check('Concurrent real Edge role changes self-demotion and last-active-admin protection',async()=>{
 const a=await service.auth.admin.createUser({email:'race-a@runtime.invalid',password,email_confirm:true}),b=await service.auth.admin.createUser({email:'race-b@runtime.invalid',password,email_confirm:true});assert.ifError(a.error);assert.ifError(b.error)
 const ids=[a.data.user.id,b.data.user.id];sql(`update public.profiles set role='user' where role='admin' and id<>'${users.admin.id}';update public.profiles set role='admin' where id in ('${ids[0]}','${ids[1]}')`)
 const sessions=[];for(const name of ['a','b']){const c=client(),r=await c.auth.signInWithPassword({email:`race-${name}@runtime.invalid`,password});assert.ifError(r.error);sessions.push(r.data.session)}
 // Retire the setup admin while two confirmed race admins remain, then send two
 // mutually-demoting HTTP requests. Exactly one may commit under the SQL lock.
 sql(`update public.profiles set role='user' where id='${users.admin.id}'`)
 const results=await Promise.all([call(sessions[0].access_token,update(ids[1],'user')),call(sessions[1].access_token,update(ids[0],'user'))]);assert.equal(results.filter(r=>r.body.data?.state==='succeeded').length,1)
 assert.equal(sql('select count(*) from public.profiles where public.core_active_admin(id)'),'1')
 const winner=sql('select id from public.profiles where public.core_active_admin(id)'),session=sessions[ids.indexOf(winner)]
 assert.equal((await call(session.access_token,update(winner,'user'))).body.error,'selfProtected')
 assert.throws(()=>sql(`update public.profiles set role='editor' where id='${winner}'`),/lastAdmin/)
 assert.equal(sql('select count(*) from public.admin_user_operations where state=\'pending\''),'0')
})
console.log('All focused real Auth/Edge/SMTP checks passed')
}catch(e){if(!checks.some(c=>!c.pass)){checks.push({name:'Setup/runtime',pass:false,error:fail(e)});save();console.log('BLOCKER '+JSON.stringify(fail(e)))}process.exitCode=1}
finally{if(edge){edge.kill();edge.unref()}save()}
