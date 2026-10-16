import assert from 'node:assert/strict'
import {execFileSync,spawn} from 'node:child_process'
import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
import {pathToFileURL} from 'node:url'

const cli=['node_modules/supabase/dist/supabase.js']
const run=(args,options={})=>execFileSync('docker',args,{encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:15000,...options})
export function functionsOwnCors(source){
    // Parse for semantic verification, but preserve every unrelated byte (including credentials).
    const yaml=createRequire(import.meta.url)('js-yaml')
    const before=yaml.load(source),expected=structuredClone(before)
    const service=expected.services.filter(s=>s.name==='functions-v1')
    assert.equal(service.length,1,'Expected one Functions service')
    assert.ok(!before.plugins?.some(p=>p.name==='cors'),'Global CORS needs separate review')
    const cors=service[0].plugins.filter(p=>p.name==='cors')
    if(cors.length===0)return source
    assert.equal(cors.length,1)
    assert.deepEqual(cors[0],{name:'cors'},'Refuse to remove customized CORS configuration')
    assert.ok(!service[0].routes.some(r=>r.plugins?.some(p=>p.name==='cors')),'Route CORS needs separate review')
    service[0].plugins=service[0].plugins.filter(p=>p.name!=='cors')
    const start=source.indexOf('  - name: functions-v1\n')
    assert.ok(start>=0,'Unexpected generated YAML layout')
    const tail=source.slice(start),end=tail.slice(1).search(/\n(?:  - name:|[^ #\r\n])/)
    const length=end<0?tail.length:end+1
    const block=tail.slice(0,length)
    assert.equal(block.split('      - name: cors\n').length,2)
    const next=source.slice(0,start)+block.replace('      - name: cors\n','')+tail.slice(length)
    assert.deepEqual(yaml.load(next),expected,'Unrelated gateway settings changed')
    return next
}
export function applyLocalCors(project='core-museum'){
    assert.ok(['core-museum','core-phase06c-isolated'].includes(project),'Local project allowlist only')
    const container='supabase_kong_'+project
    const info=JSON.parse(run(['inspect',container]))[0]
    assert.equal(info.Config.Image,'public.ecr.aws/supabase/kong:2.8.1')
    assert.ok(info.Config.Env.includes('KONG_DATABASE=off'))
    const original=run(['exec',container,'cat','/home/kong/kong.yml'])
    const next=functionsOwnCors(original)
    if(next===original){console.log('Functions gateway CORS already delegates to handler');return}
    const write=value=>run(['exec','-u','root','-i',container,'sh','-c','cat > /home/kong/kong.yml'],{input:value})
    const reload=value=>run(['exec','-i',container,'wget','-q','-O','/dev/null','--header=Content-Type: application/json','--post-file=/dev/stdin','http://127.0.0.1:8001/config'],{input:JSON.stringify({config:value})})
    try{write(next);reload(next)}catch{write(original);reload(original);throw Error('Gateway reload failed; original configuration restored')}
    assert.equal(run(['exec',container,'cat','/home/kong/kong.yml']),next)
    console.log('Local Functions CORS delegates to handler; all other gateway settings preserved')
}
async function main(){
    const action=process.argv[2]
    if(action==='cors'){applyLocalCors();return}
    assert.ok(['dev','edge'].includes(action),'Usage: node scripts/local-supabase.mjs dev|edge|cors')
    const status=JSON.parse(execFileSync(process.execPath,[...cli,'status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:15000}))
    assert.equal(new URL(status.API_URL).origin,'http://127.0.0.1:54321','Refuse non-local API')
    assert.ok(status.ANON_KEY)
    const env={...process.env,VITE_SUPABASE_URL:status.API_URL,VITE_SUPABASE_PUBLISHABLE_KEY:status.ANON_KEY,VITE_SUPABASE_ANON_KEY:status.ANON_KEY}
    let args
    if(action==='dev')args=['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5191','--strictPort']
    else{
        mkdirSync('.tmp/local-supabase',{recursive:true})
        const file='.tmp/local-supabase/edge.env'
        writeFileSync(file,'CORE_ADMIN_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5191\nCORE_INVITE_REDIRECT_URL=http://127.0.0.1:5191/reset-password\nCORE_ADMIN_WRITES_ENABLED=false\nCORE_ADMIN_GUARDS_VERIFIED=false\n')
        args=[...cli,'functions','serve','admin-users','--env-file',file]
    }
    const child=spawn(process.execPath,args,{env,stdio:['inherit','pipe','pipe'],windowsHide:true})
    const redact=text=>text.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[REDACTED]').replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g,'[REDACTED]')
    for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>process.stdout.write(redact(chunk.toString())))
    child.on('exit',code=>{process.exitCode=code??1})
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Local Supabase command failed; credentials and raw CLI errors suppressed');process.exitCode=1})
