import {test} from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync,spawn} from 'node:child_process'
import {mkdtempSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs'
import {resolve,join,sep} from 'node:path'
import {createServer} from 'node:net'

const bin=process.env.CORE_TEST_PG_BIN
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',E='33333333-3333-4333-8333-333333333333',U='44444444-4444-4444-8444-444444444444'
const D='55555555-5555-4555-8555-555555555555',P='66666666-6666-4666-8666-666666666666',N='77777777-7777-4777-8777-777777777777'
test('isolated PostgreSQL: every role, direct API-equivalent SQL, RLS/RPC/Storage, transitions and concurrent publication',
    {skip:!bin?'CORE_TEST_PG_BIN unavailable: actual Phase 04 SQL/RLS/Storage guards are NOT verified':false,timeout:120000},async()=>{
    const exe=(name:string)=>join(resolve(bin!),`${name}${process.platform==='win32'?'.exe':''}`)
    for(const name of ['initdb','pg_ctl','psql'])assert.ok(existsSync(exe(name)),`Missing ${name}`)
    const root=resolve('.tmp');mkdirSync(root,{recursive:true});const directory=mkdtempSync(join(root,'auth-roles-pg-'));assert.ok(directory.startsWith(root+sep))
    const cluster=join(directory,'cluster')
    const port=await new Promise<number>((yes,no)=>{const server=createServer();server.on('error',no);server.listen(0,'127.0.0.1',()=>{const address=server.address();const selected=typeof address==='object'&&address?address.port:0;server.close(()=>yes(selected))})})
    execFileSync(exe('initdb'),['-D',cluster,'-U','core_test','-A','trust','--no-locale','-E','UTF8'],{stdio:'pipe'})
    const connection=['-X','-q','-h','127.0.0.1','-p',String(port),'-U','core_test','-d','postgres','-v','ON_ERROR_STOP=1','-A','-t']
    const sql=(query:string)=>execFileSync(exe('psql'),[...connection,'-c',query],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
    const as=(id:string,query:string)=>sql(`set role authenticated;set request.jwt.claim.sub='${id}';${query}`)
    const json=(value:unknown)=>`'${JSON.stringify(value).replaceAll("'","''")}'::jsonb`
    const version=(id:string)=>sql(`select updated_at from public.museum_items where id='${id}'`)
    const payload=(id:string)=>JSON.parse(sql(`select to_jsonb(i) from public.museum_items i where id='${id}'`)) as Record<string,unknown>
    const save=(actor:string,id:string,patch:Record<string,unknown>={},expected=version(id),specs:unknown[]=[],gallery:unknown[]=[])=>as(actor,
        `select public.save_museum_item(${json({...payload(id),...patch})},${json(specs)},${json(gallery)},'${expected}')`)
    const insertItem=(id:string,status='draft')=>`insert into public.museum_items(id,slug,title_en,title_fa,status) values('${id}','item-${id}','Title','عنوان','${status}')`
    const image=(id:string)=>`items/${id}/thumbnail/${crypto.randomUUID()}.png`
    const upload=(id:string,path:string)=>as(id,`insert into storage.objects(bucket_id,name,owner_id) values('museum-images','${path}','${id}')`)
    const parallel=(query:string)=>new Promise<number|null>(yes=>{const child=spawn(exe('psql'),[...connection,'-c',query],{stdio:'ignore'});child.on('exit',yes);child.on('error',()=>yes(-1))})
    let started=false
    try{
        execFileSync(exe('pg_ctl'),['-D',cluster,'-l',join(directory,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start'],{stdio:'pipe'});started=true
        const bootstrap=join(directory,'bootstrap.sql')
        writeFileSync(bootstrap,`create role anon;create role authenticated;create role service_role bypassrls;
          create schema auth;create schema storage;grant usage on schema auth,storage to authenticated;grant usage on schema storage to anon;
          create table auth.users(id uuid primary key,email text unique,raw_user_meta_data jsonb default '{}',created_at timestamptz default now(),deleted_at timestamptz,banned_until timestamptz,email_confirmed_at timestamptz,last_sign_in_at timestamptz,invited_at timestamptz);
          create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
          create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
          create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text,unique(bucket_id,name));
          alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated;grant select on storage.objects to anon;
          create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;`)
        execFileSync(exe('psql'),[...connection,'-f',bootstrap],{stdio:'pipe'})
        for(const file of readdirSync('supabase/migrations').filter(name=>name.endsWith('.sql')).sort())execFileSync(exe('psql'),[...connection,'-f',resolve('supabase/migrations',file)],{stdio:'pipe'})
        sql(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values('${A}','a@example.test',now(),'{}'),('${B}','b@example.test',now(),'{}'),('${E}','e@example.test',now(),'{}'),('${U}','u@example.test',now(),'${JSON.stringify({role:'admin'})}');update public.profiles set role='admin' where id in ('${A}','${B}');update public.profiles set role='editor' where id='${E}';${insertItem(D)};${insertItem(P,'published')};`)
        assert.equal(sql(`select role from public.profiles where id='${U}'`),'user')
        assert.throws(()=>sql('set role anon;select * from public.museum_items'))
        assert.equal(as(U,'select count(*) from public.museum_items'),'1');assert.equal(as(E,'select count(*) from public.museum_items'),'2')
        assert.equal(as(A,'select count(*) from public.museum_items'),'2')
        for(const id of [U,E]){
            assert.throws(()=>as(id,`update public.profiles set role='admin' where id='${id}'`))
            assert.throws(()=>as(id,`insert into public.profiles(id,role) values('${N}','admin')`))
            assert.throws(()=>as(id,`select public.core_admin_users('${A}','list',null,'{}')`))
            assert.throws(()=>as(id,'update public.core_security_settings set editor_writes_verified=true'))
        }
        // Fail-closed editor gate is a database rule, independent of controls/Edge flags.
        assert.throws(()=>as(E,insertItem(N)));assert.throws(()=>save(E,D));assert.throws(()=>upload(E,image(D)))
        sql('update public.core_security_settings set editor_writes_verified=true') // Isolated fixture only.
        for(const id of [U]){assert.throws(()=>as(id,insertItem(N)));assert.throws(()=>save(id,D));assert.throws(()=>upload(id,image(D)))}
        as(U,`update public.museum_items set title_en='Forbidden' where id='${P}'`)
        as(U,`delete from public.museum_items where id='${P}'`)
        assert.equal(sql(`select title_en from public.museum_items where id='${P}'`),'Title')
        assert.throws(()=>sql(`set role anon;insert into storage.objects(bucket_id,name) values('museum-images','${image(D)}')`))
        assert.throws(()=>as(E,insertItem(crypto.randomUUID(),'published')))
        assert.throws(()=>as(E,`insert into public.museum_items(slug,title_en,title_fa,created_by) values('spoofed-author','X','X','${A}')`))
        as(E,insertItem(N));assert.equal(as(E,`select created_by from public.museum_items where id='${N}'`),E)
        const spec={label_en:'CPU',label_fa:'پردازنده',value:'1 MHz'},galleryPath=`items/${D}/gallery/${crypto.randomUUID()}.png`
        const current=version(D);save(E,D,{slug:'renamed-draft'},current,[spec],[{id:crypto.randomUUID(),storage_path:galleryPath}])
        assert.equal(sql(`select count(*) from public.museum_items where id='${D}' and slug='renamed-draft'`),'1')
        assert.equal(as(U,'select count(*) from public.museum_item_specs'),'0')
        assert.equal(as(U,'select count(*) from public.gallery_images'),'0')
        assert.equal(as(E,'select count(*) from public.museum_item_specs'),'1')
        assert.equal(as(E,'select count(*) from public.gallery_images'),'1')
        assert.throws(()=>save(E,D,{},current),/Item changed/)
        assert.throws(()=>save(E,D,{},'2026-01-01',[],[]));assert.throws(()=>save(E,D,{status:'published'}))
        assert.throws(()=>save(E,P));assert.throws(()=>as(E,`update public.museum_items set status='published' where id='${D}'`))
        as(E,`update public.museum_items set status='draft' where id='${P}'`);assert.equal(sql(`select status from public.museum_items where id='${P}'`),'published')
        as(E,`delete from public.museum_items where id='${D}'`);assert.equal(sql(`select count(*) from public.museum_items where id='${D}'`),'1')
        assert.throws(()=>as(E,`update public.museum_items set created_by='${A}' where id='${D}'`))
        assert.throws(()=>as(E,`update public.museum_items set featured=true where id='${D}'`))
        assert.throws(()=>as(E,`update public.museum_items set model_path='items/${P}/model-other.glb' where id='${D}'`))
        assert.throws(()=>as(E,`insert into public.museum_item_specs(item_id,label_en,label_fa,value) values('${P}','X','X','X')`))
        const oldVersion=version(D);as(E,`update public.museum_item_specs set value='2 MHz' where item_id='${D}'`);assert.notEqual(version(D),oldVersion)
        assert.throws(()=>as(E,`update public.museum_item_specs set item_id='${P}' where item_id='${D}'`))
        assert.throws(()=>as(E,`insert into public.gallery_images(item_id,storage_path) values('${D}','items/${P}/gallery/file.png')`))
        for(const table of ['categories','museum_sections']){
            const name=table==='categories'?'name':'title';assert.throws(()=>as(E,`insert into public.${table}(slug,${name}_en,${name}_fa) values('forbidden','X','X')`))
            const before=sql(`select count(*) from public.${table}`);as(E,`delete from public.${table}`);assert.equal(sql(`select count(*) from public.${table}`),before)
            as(E,`update public.${table} set active=false`);assert.equal(sql(`select count(*) from public.${table} where not active`),'0')
        }
        const fresh=image(D);upload(E,fresh)
        // No editor UPDATE/DELETE policy, including upsert and rename to another item's path.
        as(E,`update storage.objects set name='${image(P)}' where name='${fresh}'`);assert.equal(sql(`select count(*) from storage.objects where name='${fresh}'`),'1')
        as(E,`delete from storage.objects where name='${fresh}'`);assert.equal(sql(`select count(*) from storage.objects where name='${fresh}'`),'1')
        assert.throws(()=>as(E,`insert into storage.objects(bucket_id,name) values('museum-images','${fresh}') on conflict(bucket_id,name) do update set owner_id='${E}'`))
        assert.throws(()=>upload(E,image(P)));assert.throws(()=>upload(E,`items/${D}/thumbnail/../../unsafe.png`))
        as(A,`insert into public.categories(slug,name_en,name_fa) values('admin-created','Admin','مدیر')`)
        save(A,D,{status:'published'});assert.throws(()=>save(E,D));assert.throws(()=>upload(E,image(D)))
        as(A,`update storage.objects set owner_id='${A}' where name='${fresh}'`)
        as(A,`delete from storage.objects where name='${fresh}'`);assert.equal(sql(`select count(*) from storage.objects where name='${fresh}'`),'0')
        // Lock the parent during a child edit: publication waits, then prevents subsequent editor edits.
        save(A,D,{status:'draft'})
        const editing=parallel(`begin;set role authenticated;set request.jwt.claim.sub='${E}';insert into public.museum_item_specs(item_id,label_en,label_fa,value) values('${D}','Concurrent','هم‌زمان','safe');select pg_sleep(.4);commit;`)
        const publishing=parallel(`begin;set role authenticated;set request.jwt.claim.sub='${A}';update public.museum_items set status='published' where id='${D}';commit;`)
        const outcomes=await Promise.all([editing,publishing]);assert.equal(outcomes[1],0);assert.ok([0,1].includes(outcomes[0]!));assert.throws(()=>save(E,D))
        sql(`update public.profiles set role='user' where id='${E}'`);assert.throws(()=>save(E,N));assert.throws(()=>upload(E,image(N)))
        sql(`update auth.users set banned_until=now()+interval '1 hour' where id='${U}'`);assert.equal(as(U,'select count(*) from public.museum_items'),'0')
        as(A,`update public.museum_items set title_en='Admin edit' where id='${P}'`)
        as(A,`insert into public.museum_item_specs(item_id,label_en,label_fa,value) values('${P}','Published spec','مشخصات','admin')`)
        as(A,`delete from public.museum_items where id='${P}'`);assert.equal(sql(`select count(*) from public.museum_item_specs where item_id='${P}'`),'0')
        // Extended role-assignment command remains service-only, versioned and gated.
        const op=crypto.randomUUID(),userVersion=sql(`select updated_at from public.profiles where id='${E}'`)
        const patch={id:E,expectedUpdatedAt:userVersion,fullName:'Editor',preferredLocale:'fa',role:'editor',rolesEnabled:false}
        assert.throws(()=>sql(`select public.core_admin_users('${A}','update','${op}',${json(patch)})`),/guardUnverified/)
        const allowed=json({...patch,rolesEnabled:true})
        assert.match(sql(`select public.core_admin_users('${A}','update','${op}',${allowed})`),/succeeded/)
        assert.match(sql(`select public.core_admin_users('${A}','update','${op}',${allowed})`),/succeeded/)
        assert.equal(sql(`select role from public.profiles where id='${E}'`),'editor')
        const self={...patch,id:A,expectedUpdatedAt:sql(`select updated_at from public.profiles where id='${A}'`),rolesEnabled:true}
        assert.throws(()=>sql(`select public.core_admin_users('${A}','update','${crypto.randomUUID()}',${json(self)})`),/selfProtected/)
        assert.equal(sql("select has_function_privilege('authenticated','public.core_admin_users(uuid,text,uuid,jsonb)','execute')"),'f')
        assert.equal(sql("select has_table_privilege('authenticated','public.admin_user_operations','select')"),'f')
        const rolePatch=(id:string)=>({id,expectedUpdatedAt:sql(`select updated_at from public.profiles where id='${id}'`),fullName:'Concurrent editor',preferredLocale:'en',role:'editor',rolesEnabled:true})
        const demotions=await Promise.all([
            parallel(`begin;select public.core_admin_users('${A}','update','${crypto.randomUUID()}',${json(rolePatch(B))});select pg_sleep(.2);commit;`),
            parallel(`begin;select public.core_admin_users('${B}','update','${crypto.randomUUID()}',${json(rolePatch(A))});select pg_sleep(.2);commit;`),
        ])
        assert.equal(demotions.filter(code=>code===0).length,1)
        assert.equal(sql('select count(*) from public.profiles where public.core_active_admin(id)'),'1')
    }finally{if(started)execFileSync(exe('pg_ctl'),['-D',cluster,'-m','immediate','-w','stop'],{stdio:'pipe'})}
})
