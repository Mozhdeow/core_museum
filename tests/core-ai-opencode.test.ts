import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createCoreAIHandler,createRateLimiter,defaultOpenCodeURL,type CoreAIBackend,type CoreAIServerConfig} from '../supabase/functions/core-ai/handler.ts'
import {OpenCodeCoreAIProvider} from '../src/features/coreAI/OpenCodeCoreAIProvider.ts'
import {createAutoCoreAIClient} from '../src/features/coreAI/coreAIClient.ts'
import {CoreAIError,type CoreAIErrorCode,type CoreAIRequest} from '../src/features/coreAI/coreAIContracts.ts'
import {assemblyAIContext} from '../src/features/coreAI/coreAIContext.ts'
import {referenceBuild,introduceFault} from '../src/features/assembly/troubleshooting.ts'
import {coreAICopy} from '../src/features/coreAI/coreAICopy.ts'

const origin='http://127.0.0.1:5191',apiKey='synthetic-provider-key-never-valid',token='synthetic-session-never-valid',id='22222222-2222-4222-8222-222222222222'
const backend:CoreAIBackend={async authenticate(t){return t===token?{id:'synthetic-owner'}:null},async exhibit(selected,locale){return selected===id?{title:locale==='fa'?'پردازندهٔ ثبت‌شده':'Verified CPU',description:'Verified catalog description',category:'cpu',specifications:[{label:'Recorded revision',value:'R7'}]}:null}}
const question:CoreAIRequest={question:'Explain the selected component',locale:'en',context:assemblyAIContext({installed:{},connected:[]},'cpu','cpu')}
const syntheticAnswer:typeof fetch=async()=>Response.json({choices:[{message:{role:'assistant',content:'  A synthetic live answer.  '}}]})
function harness(config:Partial<CoreAIServerConfig>={},upstream:typeof fetch=syntheticAnswer,customBackend=backend){
 const calls:{url:string;init:RequestInit}[]=[]
 const intercept:typeof fetch=async(url,init)=>{calls.push({url:String(url),init:init??{}});return upstream(url,init)}
 const handler=createCoreAIHandler(customBackend,{apiKey,origins:[origin],...config},intercept)
 const transport:typeof fetch=async(_url,init)=>handler(new Request('https://synthetic.invalid/functions/v1/core-ai',{...init,headers:{...Object.fromEntries(new Headers(init?.headers)),Origin:origin}}))
 const provider=new OpenCodeCoreAIProvider(async()=>({url:'https://synthetic.invalid/functions/v1/core-ai',apikey:'synthetic-public-key',token}),transport)
 return {calls,handler,provider,client:createAutoCoreAIClient(provider),send:(body:unknown,headers:Record<string,string>={},signal?:AbortSignal)=>handler(new Request('https://synthetic.invalid/functions/v1/core-ai',{method:'POST',headers:{origin,authorization:`Bearer ${token}`,'content-type':'application/json',...headers},body:JSON.stringify(body),signal}))}
}
const body=(request:CoreAIRequest=question)=>({action:'ask',...request})
const fails=(code:CoreAIErrorCode)=>(error:unknown)=>error instanceof CoreAIError&&error.code===code

test('1 — missing key selects the labeled offline provider without any inference call',async()=>{
 const h=harness({apiKey:''})
 const status=await h.client.status();assert.equal(status.provider,'mock');assert.equal(status.configured,false);assert.equal(status.inferenceVerified,false)
 const answer=await h.client.ask(question);assert.equal(answer.provider,'mock');assert.equal(answer.offline,true);assert.equal(h.calls.length,0)
 assert.match(coreAICopy.en.badge,/Offline/);assert.match(coreAICopy.fa.badge,/آفلاین/)
 const response=await h.send(body());assert.equal(response.status,503);assert.equal((await response.json()).error,'unconfigured')
})

test('2 — synthetic upstream normalizes through the gateway and typed client; credentials stay out of answer/prompt',async()=>{
 const h=harness(),history=Array.from({length:9},(_,i)=>({role:'user' as const,text:`Relevant question ${i}`}))
 const answer=await h.client.ask({...question,history,question:`Explain CPU. ${apiKey} ${token} user@example.test`,conversationId:id})
 assert.deepEqual(answer,{provider:'opencode',offline:false,model:'kimi-k3',answer:'A synthetic live answer.',certainty:'generated',topics:['assembly']})
 assert.equal(h.calls.length,1);assert.equal(h.calls[0].url,defaultOpenCodeURL)
 const {init}=h.calls[0],headers=new Headers(init.headers),payload=JSON.parse(String(init.body))
 assert.equal(headers.get('Authorization'),`Bearer ${apiKey}`);assert.equal(headers.get('apikey'),null);assert.match(headers.get('x-opencode-session')!,/^[a-f0-9]{64}$/);assert.equal(init.redirect,'error')
 assert.equal(payload.max_tokens,700);assert.equal(payload.stream,false);assert.equal(payload.messages.length,8)
 assert.equal(payload.messages[1].content,'Relevant question 3');assert.doesNotMatch(String(init.body),new RegExp(`${apiKey}|${token}|synthetic-owner|user@example.test`));assert.match(payload.messages.at(-1).content,/redacted/)
 const go=harness({apiURL:'https://opencode.ai/inference/go/openai/v1/chat/completions'});await go.client.ask(question);assert.match(go.calls[0].url,/\/go\/openai/)
 const unsafe=harness({apiURL:'https://untrusted.invalid/chat/completions'});await assert.rejects(unsafe.client.ask(question),fails('unconfigured'));assert.equal(unsafe.calls.length,0)
})

test('3 — invalid key, denial, rate limits, malformed output, network, timeout and cancellation fail safely with no fallback/retry',async()=>{
 for(const [status,code] of [[401,'invalidProviderKey'],[403,'forbidden'],[429,'rateLimited'],[500,'providerUnavailable']] as const){
  const h=harness({},async()=>new Response(`raw sensitive failure ${apiKey}`,{status}))
  await assert.rejects(h.client.ask(question),fails(code));assert.equal(h.calls.length,1)
 }
 for(const upstream of [async()=>{throw new Error(apiKey)},async()=>Response.json({choices:[]}),async()=>Response.json({choices:[{message:{content:apiKey}}]})] as typeof fetch[]){const h=harness({},upstream);await assert.rejects(h.client.ask(question),fails('providerUnavailable'));assert.equal(h.calls.length,1)}
 const timeout=harness({timeoutMs:15},async(_url,init)=>new Promise((_resolve,reject)=>init!.signal!.addEventListener('abort',()=>reject(new Error(apiKey)),{once:true})))
 const timeoutResponse=await timeout.send(body());assert.equal(timeoutResponse.status,504);assert.deepEqual(await timeoutResponse.json(),{ok:false,error:'timeout'});assert.equal(timeout.calls.length,1)
 const controller=new AbortController();controller.abort();await assert.rejects(harness().client.ask(question,{signal:controller.signal}),fails('aborted'))
 const stalled=createAutoCoreAIClient(new OpenCodeCoreAIProvider(()=>new Promise(()=>{}))),cancelStatus=new AbortController()
 const pendingStatus=stalled.status({signal:cancelStatus.signal});cancelStatus.abort();await assert.rejects(pendingStatus,fails('aborted'))
 const limits=createRateLimiter(()=>1000);for(let i=0;i<6;i++)limits.take('same-user')();assert.throws(()=>limits.take('same-user'),fails('rateLimited'))
 const secure=harness();for(const [headers,status] of [[{authorization:''},401],[{origin:'https://forbidden.invalid'},403]] as const){const response=await secure.send(body(),headers);assert.equal(response.status,status);assert.doesNotMatch(await response.text(),new RegExp(apiKey))}
 assert.equal((await secure.send(body({...question,question:'x'.repeat(1001)}))).status,400)
 assert.equal((await secure.send({...body(),history:Array(7).fill({role:'user',text:'x'})})).status,400)
 assert.equal((await secure.send({...body(),unused:'x'.repeat(20001)})).status,400)
 assert.equal(secure.calls.length,0)
})

test('4 — museum/Inspect, assembly and Persian troubleshooting use compact verified context and deterministic findings',async()=>{
 const h=harness()
 const exhibit={id,status:'published' as const,title:{en:'FORGED',fa:'ساختگی'},description:{en:'UNVERIFIED SPECS',fa:''},category:'cpu',specifications:[]}
 await h.client.ask({...question,context:{kind:'museum',exhibit}})
 const museumPayload=String(h.calls[0].init.body);assert.match(museumPayload,/Verified CPU/);assert.match(museumPayload,/R7/);assert.doesNotMatch(museumPayload,/FORGED|UNVERIFIED SPECS/)
 await h.client.ask({...question,context:assemblyAIContext({installed:{motherboard:'motherboard'},connected:[]},'cpu','gpu',{power:'off',panelOpen:true})})
 const assemblyPayload=String(h.calls[1].init.body);assert.match(assemblyPayload,/missingPrerequisites/);assert.match(assemblyPayload,/AM4/);assert.match(assemblyPayload,/board\.eps/);assert.doesNotMatch(assemblyPayload,/"next":"gpu"/)
 const build=introduceFault(referenceBuild(),'cooling')
 await h.client.ask({...question,locale:'fa',question:'علت مشکل چیست؟',context:{kind:'troubleshooting',build,selected:'cooler',scenario:'cooling',findings:[],attempts:1,simulation:{power:'faulted',panelOpen:true}}})
 const fa=String(h.calls[2].init.body);assert.match(fa,/Persian/);assert.match(fa,/CPU_FAN/);assert.match(fa,/missingCable/);assert.match(fa,/خنک/);assert.match(fa,/coolerFan/);assert.match(fa,/faulted/)
 await assert.rejects(h.client.ask({...question,context:{kind:'museum',exhibit:{...exhibit,id:'33333333-3333-4333-8333-333333333333'}}}),fails('invalidContext'))
 const invalid=await h.send({...body(),context:{kind:'assembly',build:{installed:{cpu:'gpu'},connected:[]},selected:'cpu'}});assert.equal(invalid.status,400);assert.equal(h.calls.length,3)
})
