import {test} from 'node:test'
import assert from 'node:assert/strict'
import {scenarios,scenarioIds,introduceFault,referenceBuild,diagnosticConnected} from '../src/features/assembly/troubleshooting.ts'
import {bootIssues,connectionIssue,placementIssue,validBuild} from '../src/features/assembly/assemblyRules.ts'
import {parts,cables,type PartId} from '../src/features/assembly/assemblyDefinition.ts'
import {MockCoreAIProvider} from '../src/features/coreAI/MockCoreAIProvider.ts'
import {createCoreAIClient} from '../src/features/coreAI/coreAIClient.ts'
import {CoreAIError,type CoreAIRequest,type CoreAIProvider} from '../src/features/coreAI/coreAIContracts.ts'
import {assemblyAIContext,museumAIContext} from '../src/features/coreAI/coreAIContext.ts'
import {createChatHistory} from '../src/features/coreAI/chatHistory.ts'
import type {MuseumItem} from '../src/types/museum.ts'
const provider=new MockCoreAIProvider(),signal=()=>new AbortController().signal
const ask=(question:string,context:CoreAIRequest['context'],locale:'en'|'fa'='en')=>provider.ask({question,context,locale},{signal:signal()})

test('seven faults are deterministic changes to real mounts/leads; authoritative rules verify each repair',()=>{
 const full=referenceBuild(),original=structuredClone(full)
 for(const id of scenarioIds){const b=introduceFault(full,id),spec=scenarios[id];assert.ok(validBuild(b));assert.equal(diagnosticConnected(b,id),false);assert.equal(bootIssues(b).length,1);assert.equal(bootIssues(b)[0].cable??bootIssues(b)[0].part,spec.cable??spec.missingPart)
  if(spec.cable){assert.equal(connectionIssue(b,spec.cable,...cables[spec.cable].ends),null);b.connected.push(spec.cable)}
  if(spec.missingPart){const part=spec.missingPart;assert.equal(placementIssue(b,part,parts[part].slot),null);b.installed[part]=parts[part].slot}
  assert.equal(diagnosticConnected(b,id),true);assert.deepEqual(bootIssues(b),[])
 }
 assert.deepEqual(full,original);assert.throws(()=>introduceFault({installed:{},connected:[]},'post'))
})
test('catalog context accepts only the selected published UUID and responds using its recorded facts',async()=>{
 const item: MuseumItem={id:'22222222-2222-4222-8222-222222222222',status:'published',title:{en:'Archive GPU',fa:'گرافیک آرشیو'},description:{en:'Recorded graphics artifact',fa:'اثر گرافیکی ثبت‌شده'},shortDescription:{en:'',fa:''},specifications:[{label:{en:'Recorded revision',fa:'نسخهٔ ثبت‌شده'},value:'R7'}],category:'gpu',slug:'gpu',brand:'',releaseYear:0,thumbnail:'',galleryImages:[],model3DUrl:null,museumSection:'',sortOrder:0,featured:false}
 const context=museumAIContext(item.id,[item]),result=await ask('What specifications are recorded?',context);assert.equal(result.certainty,'catalog');assert.match(result.answer,/Archive GPU/);assert.match(result.answer,/R7/);assert.doesNotMatch(result.answer,/GHz|CUDA/)
 for(const candidate of [{...item,status:'draft' as const},{...item,id:'fixture-not-uuid'},{...item,enableAiCurator:false}])assert.equal((museumAIContext(candidate.id,[candidate]) as {exhibit:unknown}).exhibit,null)
 assert.equal((await ask('Explain the exhibit',museumAIContext('unselected',[item]))).certainty,'clarification')
})
test('assembly replies distinguish components, dependencies, selected slot and next-step target',async()=>{
 const b={installed:{motherboard:'motherboard'} as const,connected:[]}
 const gpu=await ask('Explain this component and dependencies',assemblyAIContext(b,'gpu','cpu')),ram=await ask('Explain this component',assemblyAIContext(b,'ram2','cpu'))
 assert.match(gpu.answer,/Graphics card/);assert.match(gpu.answer,/Motherboard/);assert.match(ram.answer,/DDR4 module 2/);assert.notEqual(gpu.answer,ram.answer)
 const next=await ask('What should I install next?',assemblyAIContext(b,'gpu','cpu'));assert.match(next.answer,/Reference target \/ endpoints: cpu/);assert.doesNotMatch(next.answer,/endpoints: gpu/)
 const installed=referenceBuild();installed.installed.ram1='dimmB2';installed.installed.ram2='ram1';assert.equal(assemblyAIContext(installed,'ram2',null).kind,'assembly');const selected=await ask('Explain this component',assemblyAIContext(installed,'ram2',null));assert.match(selected.answer,/endpoints: ram1/)
})
test('troubleshooting replies use actual findings in English/Persian and never trust caller-supplied success',async()=>{
 const b=introduceFault(referenceBuild(),'cooling'),context={kind:'troubleshooting' as const,scenario:'cooling' as const,build:b,selected:'cooler' as const,findings:[],attempts:1}
 const en=await ask('Explain the cause and repair',context),fa=await ask('علت مشکل و روش رفع آن را توضیح بده',context,'fa');assert.match(en.answer,/CPU_FAN/);assert.match(en.answer,/disconnected/);assert.match(fa.answer,/خنک/);assert.match(fa.answer,/دمای واقعی/);assert.notEqual(en.answer,fa.answer)
 const fixed=await ask('What should I check first?',{...context,build:referenceBuild()});assert.match(fixed.answer,/checks pass/);assert.doesNotMatch(fixed.answer,/reports incomplete paths/)
})
test('unsupported requests express uncertainty and missing symptoms prompt clarification',async()=>{
 const context={kind:'troubleshooting' as const,scenario:null,build:referenceBuild(),selected:null,findings:[],attempts:0}
 assert.equal((await ask('Write a poem about football',context)).certainty,'unsupported');assert.equal((await ask('کمک می‌خواهم',context,'fa')).certainty,'clarification')
 const symptom=await ask('PC has no power, what should I check?',assemblyAIContext(referenceBuild(),'gpu',null));assert.match(symptom.answer,/PSU mains/);assert.match(symptom.answer,/not a definitive diagnosis/)
})
test('mock provider works with network and credentials absent; provider choice never silently falls back',async()=>{
 const before=globalThis.fetch;let network=0;globalThis.fetch=(()=>{network++;throw new Error('network prohibited')}) as typeof fetch
 try{const client=createCoreAIClient({provider:'mock'}),r=await client.ask({question:'Explain the CPU',locale:'en',context:assemblyAIContext(referenceBuild(),'cpu',null)});assert.equal(r.provider,'mock');assert.equal(r.offline,true);assert.equal(network,0)
  for(const choice of ['disabled','ollama','openai-compatible'] as const)await assert.rejects(createCoreAIClient({provider:choice}).ask({question:'Help',locale:'en',context:assemblyAIContext(referenceBuild(),'cpu',null)}),(e:unknown)=>e instanceof CoreAIError&&e.code===(choice==='disabled'?'disabled':'unconfigured'))
 }finally{globalThis.fetch=before}
})
test('provider failure, timeout, cancellation and malformed build fail with typed errors',async()=>{
 const request:CoreAIRequest={question:'Explain CPU',locale:'en',context:assemblyAIContext(referenceBuild(),'cpu',null)},fail:CoreAIProvider={id:'mock',async ask(){throw new Error('synthetic failure')}}
 await assert.rejects(createCoreAIClient({provider:'mock'},fail).ask(request),(e:unknown)=>e instanceof CoreAIError&&e.code==='failed')
 const pending:CoreAIProvider={id:'mock',ask:()=>new Promise(()=>{})};await assert.rejects(createCoreAIClient({provider:'mock',timeoutMs:5},pending).ask(request),(e:unknown)=>e instanceof CoreAIError&&e.code==='timeout')
 const control=new AbortController();control.abort();await assert.rejects(createCoreAIClient({provider:'mock'}).ask(request,{signal:control.signal}),(e:unknown)=>e instanceof CoreAIError&&e.code==='aborted')
 const b=referenceBuild();b.installed.cpu='psu';await assert.rejects(ask('Explain CPU',assemblyAIContext(b,'cpu' as PartId,null)),(e:unknown)=>e instanceof CoreAIError&&e.code==='invalidContext')
})
test('memory-only chat histories separate contexts and destroy content on account change or sign-out',()=>{
 const memory=createChatHistory();memory.setOwner('owner-a');memory.write('owner-a','museum:one',[{role:'user',text:'private question'}]);memory.write('owner-a','assembly:gpu',[{role:'assistant',text:'GPU lesson'}]);assert.equal(memory.read('owner-a','museum:one')[0].text,'private question');assert.equal(memory.read('owner-a','assembly:cpu').length,0)
 memory.setOwner('owner-b');assert.equal(memory.read('owner-a','museum:one').length,0);memory.write('owner-a','museum:one',[{role:'assistant',text:'late response'}]);assert.equal(memory.read('owner-b','museum:one').length,0);memory.setOwner(null);memory.setOwner('owner-a');assert.equal(memory.read('owner-a','assembly:gpu').length,0)
})
