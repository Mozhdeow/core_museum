import {test} from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync,spawn} from 'node:child_process'
import {mkdtempSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {resolve,join,sep} from 'node:path'
import {createServer} from 'node:net'

// Explicit local binaries only. No connection string, production URL, Docker reset or installed service.
const bin=process.env.CORE_TEST_PG_BIN
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',U='33333333-3333-4333-8333-333333333333'
test('isolated PostgreSQL migration, grants, last-admin transactions and concurrent requests',
    {skip:!bin?'CORE_TEST_PG_BIN is unavailable; real PostgreSQL guards are NOT verified':false,timeout:120000},async()=>{
    const executable=(name:string)=>join(resolve(bin!),`${name}${process.platform==='win32'?'.exe':''}`)
    for(const name of ['initdb','pg_ctl','psql'])assert.ok(existsSync(executable(name)),`Missing local ${name}`)
    assert.match(execFileSync(executable('initdb'),['--version'],{encoding:'utf8'}),/PostgreSQL/)
    const root=resolve('.tmp');mkdirSync(root,{recursive:true});const directory=mkdtempSync(join(root,'admin-users-pg-'))
    assert.ok(directory.startsWith(root+sep))
    const cluster=join(directory,'cluster')
    const port=await new Promise<number>((yes,no)=>{const server=createServer();server.on('error',no);server.listen(0,'127.0.0.1',()=>{const address=server.address();const selected=typeof address==='object'&&address?address.port:0;server.close(()=>yes(selected))})})
    execFileSync(executable('initdb'),['-D',cluster,'-U','core_test','-A','trust','--no-locale','-E','UTF8'],{stdio:'pipe'})
    const connection=['-X','-h','127.0.0.1','-p',String(port),'-U','core_test','-d','postgres','-v','ON_ERROR_STOP=1','-A','-t']
    const sql=(query:string)=>execFileSync(executable('psql'),[...connection,'-c',query],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
    const file=(path:string)=>execFileSync(executable('psql'),[...connection,'-f',path],{encoding:'utf8',stdio:['ignore','pipe','pipe']})
    const literal=(value:unknown)=>`'${JSON.stringify(value).replaceAll("'","''")}'::jsonb`
    const command=(actor:string,action:string,id:string|null,input:unknown={})=>`select public.core_admin_users('${actor}','${action}',${id?`'${id}'`:'null'},${literal(input)})`
    const invoke=(actor:string,action:string,input:unknown={},id=crypto.randomUUID())=>JSON.parse(sql(command(actor,action,id,input))) as {state:string;total:number;users:unknown[]}
    const version=(id:string)=>sql(`select updated_at from public.profiles where id='${id}'`)
    const edit=(id:string,role:string)=>({id,expectedUpdatedAt:version(id),fullName:'Changed',preferredLocale:'fa',role,rolesEnabled:true})
    const deletion=(id:string,email:string)=>({id,expectedUpdatedAt:version(id),confirmation:email})
    const parallel=(query:string)=>new Promise<number|null>(yes=>{const process=spawn(executable('psql'),[...connection,'-c',query],{stdio:'ignore'});process.on('exit',yes);process.on('error',()=>yes(-1))})
    let started=false
    try{
        execFileSync(executable('pg_ctl'),['-D',cluster,'-l',join(directory,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start'],{stdio:'pipe'});started=true
        const bootstrap=join(directory,'bootstrap.sql')
        writeFileSync(bootstrap,`create role anon; create role authenticated; create role service_role bypassrls;
          create schema auth;create schema storage;
          create table auth.users(id uuid primary key,email text unique,raw_user_meta_data jsonb default '{}',created_at timestamptz default now(),
            deleted_at timestamptz,banned_until timestamptz,email_confirmed_at timestamptz,last_sign_in_at timestamptz,invited_at timestamptz);
          create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
          grant usage on schema auth to authenticated;
          create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
          create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);
          alter table storage.objects enable row level security;
          create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;`)
        file(bootstrap)
        for(const name of ['202609300001_core_schema.sql','202609300002_content_storage.sql','202609300003_atomic_item_save.sql','202610150001_admin_user_management.sql'])file(resolve('supabase/migrations',name))
        sql(`insert into auth.users(id,email,email_confirmed_at) values('${A}','a@example.test',now()),('${B}','b@example.test',now()),('${U}','u@example.test',now());update public.profiles set role='admin' where id in ('${A}','${B}');`)
        assert.equal(sql("select has_function_privilege('authenticated','public.core_admin_users(uuid,text,uuid,jsonb)','execute')"),'f')
        assert.equal(sql("select has_function_privilege('anon','public.core_admin_users(uuid,text,uuid,jsonb)','execute')"),'f')
        assert.equal(sql("select has_table_privilege('authenticated','public.admin_user_operations','select')"),'f')
        assert.throws(()=>sql(`set role authenticated;select public.core_admin_users('${A}','list',null,'{}');`))
        assert.throws(()=>sql(`set role authenticated;set request.jwt.claim.sub='${U}';update public.profiles set role='admin' where id='${U}'`))
        assert.throws(()=>invoke(U,'authorize'))
        assert.equal(invoke(A,'list',{page:1,perPage:10,search:'u@example',role:'user',status:'active'}).total,1)
        sql(`update auth.users set created_at='2018-01-01T00:00:00Z' where id='${A}'`)
        assert.match(JSON.stringify(invoke(A,'list',{page:1,perPage:10,search:'a@example',role:'admin',status:'active'}).users[0]),/2018-01-01/)
        assert.equal(invoke(A,'list',{page:2,perPage:10,search:'',role:'all',status:'all'}).users.length,0)
        assert.throws(()=>invoke(A,'update',edit(A,'user')),/selfProtected/)
        const updateId=crypto.randomUUID(),patch=edit(U,'user')
        assert.equal(invoke(A,'update',patch,updateId).state,'succeeded')
        assert.equal(invoke(A,'update',patch,updateId).state,'succeeded')
        assert.throws(()=>invoke(A,'update',patch),/conflict/)
        const results=await Promise.all([
            parallel(`begin;${command(A,'update',crypto.randomUUID(),edit(B,'user'))};select pg_sleep(.2);commit;`),
            parallel(`begin;${command(B,'update',crypto.randomUUID(),edit(A,'user'))};select pg_sleep(.2);commit;`),
        ])
        assert.equal(results.filter(code=>code===0).length,1)
        assert.equal(sql('select count(*) from public.profiles where public.core_active_admin(id)'),'1')
        sql(`update public.profiles set role='admin' where id in ('${A}','${B}')`)
        const deleteId=crypto.randomUUID();const deleteInput=deletion(B,'b@example.test')
        assert.equal(invoke(A,'begin_delete',deleteInput,deleteId).state,'pending')
        assert.equal(sql(`select public.core_active_admin('${B}')`),'f')
        assert.throws(()=>invoke(B,'update',edit(A,'user')),/forbidden/)
        assert.throws(()=>sql(`update public.profiles set role='user' where id='${A}'`),/lastAdmin/)
        assert.equal(invoke(A,'reject',{code:'requestFailed'},deleteId).state,'failed')
        assert.equal(sql(`select public.core_active_admin('${B}')`),'t')
        sql(`insert into storage.objects(owner_id,name) values('${B}','retained.glb')`)
        assert.throws(()=>invoke(A,'begin_delete',deleteInput),/assetsOwned/)
        sql(`delete from storage.objects where owner_id='${B}'`)
        const actualDelete=crypto.randomUUID()
        invoke(A,'begin_delete',deleteInput,actualDelete)
        sql(`insert into public.museum_items(slug,title_en,title_fa,created_by) values('retained','Retained','باقی', '${B}');delete from auth.users where id='${B}'`)
        assert.equal(invoke(A,'status',{},actualDelete).state,'succeeded')
        assert.equal(sql(`select count(*) from public.profiles where id='${B}'`),'0')
        assert.equal(sql("select created_by is null from public.museum_items where slug='retained'"),'t')
        assert.throws(()=>sql(`delete from auth.users where id='${A}'`),/lastAdmin/)
        const invitation=crypto.randomUUID(),newId=crypto.randomUUID(),payload={email:'invited@example.test',fullName:'Invited',preferredLocale:'fa',role:'admin',rolesEnabled:true}
        invoke(A,'begin_invite',payload,invitation)
        sql(`insert into auth.users(id,email,raw_user_meta_data,invited_at) values('${newId}','invited@example.test',${literal({core_invitation_id:invitation,role:'admin'})},now())`)
        assert.equal(sql(`select role from public.profiles where id='${newId}'`),'user')
        assert.equal(invoke(A,'status',{writesEnabled:false,rolesEnabled:false},invitation).state,'pending')
        assert.equal(invoke(A,'status',{writesEnabled:true,rolesEnabled:true},invitation).state,'succeeded')
        assert.equal(sql(`select preferred_locale from public.profiles where id='${newId}'`),'fa')
        assert.equal(sql(`select public.core_active_admin('${newId}')`),'f')
        assert.throws(()=>invoke(A,'begin_invite',payload),/duplicateAccount/)
        const ordinaryInvite=crypto.randomUUID(),ordinaryId=crypto.randomUUID()
        invoke(A,'begin_invite',{...payload,email:'ordinary@example.test',role:'user',rolesEnabled:false},ordinaryInvite)
        sql(`insert into auth.users(id,email,raw_user_meta_data,invited_at) values('${ordinaryId}','ordinary@example.test',${literal({core_invitation_id:ordinaryInvite})},now());update public.profiles set role='admin' where id='${ordinaryId}'`)
        assert.equal(invoke(A,'status',{writesEnabled:true,rolesEnabled:false},ordinaryInvite).state,'pending')
        assert.equal(sql(`select role from public.profiles where id='${ordinaryId}'`),'admin')
        assert.equal(invoke(A,'status',{writesEnabled:true,rolesEnabled:true},ordinaryInvite).state,'succeeded')
        assert.equal(sql(`select role from public.profiles where id='${ordinaryId}'`),'user')
        const cancelled=crypto.randomUUID();assert.equal(invoke(A,'status',{},cancelled).state,'cancelled')
        assert.equal(invoke(A,'begin_invite',{...payload,email:'late@example.test'},cancelled).state,'cancelled')
        assert.throws(()=>sql(`begin isolation level repeatable read;${command(A,'authorize',null)};commit`),/guardUnverified/)
    }finally{
        if(started)execFileSync(executable('pg_ctl'),['-D',cluster,'-m','immediate','-w','stop'],{stdio:'pipe'})
        // Retain only this ignored fixture directory for diagnostics; never touch installed clusters.
    }
})
