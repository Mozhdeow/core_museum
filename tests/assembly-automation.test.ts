import {test} from 'node:test'
import assert from 'node:assert/strict'
import {assemblyAutomation,useAssembly,saveAssembly} from '../src/features/assembly/assemblyStore.ts'
import {partIds,cableIds,cables,type PartId} from '../src/features/assembly/assemblyDefinition.ts'
import {validBuild,placementIssue,connectionIssue,bootIssues} from '../src/features/assembly/assemblyRules.ts'
import {validateAssembly} from '../src/features/assembly/assemblyPersistence.ts'
import type {AutomationStep} from '../src/features/assembly/assemblyAutomation.ts'

const owner='11111111-1111-4111-8111-111111111111'
const fresh=()=>{useAssembly.getState().hydrate(owner,{getItem:()=>null});return useAssembly.getState()}
test('partial/full Auto Assemble uses actual validation, keeps occupied DIMMs and never installs twice or boots',async()=>{
 const s=fresh();s.install('motherboard','motherboard');s.install('ram1','dimmB2')
 const steps:PartId[]=[],unregister=assemblyAutomation.register(async step=>{
  assert.equal(step.kind,'part');if(step.kind!=='part')return
  const current=useAssembly.getState();assert.equal(current.installed[step.id],undefined);assert.equal(placementIssue(current,step.id,step.target),null);assert.equal(validBuild(current),true)
  // Manual installation attempts cannot race the automatic animation.
  assert.equal(current.install(step.id,step.target),false);steps.push(step.id)
 })
 try{await assemblyAutomation.start('parts');const built=useAssembly.getState();assert.equal(built.automation?.status,'complete');assert.equal(Object.keys(built.installed).length,partIds.length);assert.equal(built.installed.ram1,'dimmB2');assert.equal(built.installed.ram2,'ram1');assert.ok(steps.indexOf('cpu')<steps.indexOf('cooler'));assert.equal(steps.includes('monitor'),false);assert.equal(new Set(steps).size,steps.length);assert.equal(built.power,'off');assert.deepEqual(built.connected,[]);const count=steps.length;await assemblyAutomation.start('parts');assert.equal(steps.length,count);built.remove('gpu');assert.equal(useAssembly.getState().installed.gpu,undefined);assert.equal(useAssembly.getState().install('gpu','gpu'),true);assert.equal(validBuild(useAssembly.getState()),true)}finally{unregister();useAssembly.getState().release()}
})
test('Auto Connect commits eligible authored endpoints, reports missing prerequisites and prevents duplicates',async()=>{
 fresh();let count=0;const unregister=assemblyAutomation.register(async step=>{assert.equal(step.kind,'cable');if(step.kind!=='cable')return;const s=useAssembly.getState();assert.equal(s.connected.includes(step.id),false);assert.equal(connectionIssue(s,step.id,...cables[step.id].ends),null);assert.ok(cables[step.id].route.length>1);count++})
 try{
  await assemblyAutomation.start('cables');assert.equal(useAssembly.getState().automation?.status,'blocked');assert.deepEqual(useAssembly.getState().connected,['monitorAC']);const problem=useAssembly.getState().automation?.issue;assert.ok(problem&&problem!=='notReady'&&problem.code==='dependency')
  for(const id of ['motherboard','cpu','ram1','ram2','cooler','ssd','psu','gpu','fanFront','fanRear'] as const){const s=useAssembly.getState();assert.equal(s.install(id,id==='ram2'?'dimmB2':id),true)}
  await assemblyAutomation.start('cables');assert.equal(useAssembly.getState().automation?.status,'complete');assert.equal(useAssembly.getState().connected.length,cableIds.length);assert.equal(new Set(useAssembly.getState().connected).size,cableIds.length);assert.equal(count,cableIds.length);assert.deepEqual(bootIssues(useAssembly.getState()),[]);assert.equal(useAssembly.getState().power,'off');assert.deepEqual(useAssembly.getState().optionalConnected,[]);await assemblyAutomation.start('cables');assert.equal(count,cableIds.length);useAssembly.getState().disconnect('sataData');assert.equal(useAssembly.getState().connected.includes('sataData'),false)
 }finally{unregister();useAssembly.getState().release()}
})
test('interruption commits only settled steps; cancel/reload/owner change preserve a valid snapshot and reject late completion',async()=>{
 fresh();let settle:(()=>void)|undefined,seen=0;const steps:AutomationStep[]=[],unregister=assemblyAutomation.register((step,signal)=>{steps.push(step);seen++;if(seen===1)return Promise.resolve();return new Promise<void>((resolve,reject)=>{settle=resolve;signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')),{once:true})})})
 try{
  const running=assemblyAutomation.start('parts');await new Promise(resolve=>setImmediate(resolve));assert.equal(seen,2);assert.equal(useAssembly.getState().installed.motherboard,'motherboard');assert.equal(useAssembly.getState().installed.cpu,undefined)
  let snapshot='';saveAssembly({setItem:(_key,value)=>{snapshot=value}},useAssembly.getState());const restored=validateAssembly(JSON.parse(snapshot),owner,Date.now());assert.ok(restored);assert.equal(restored.installed.cpu,undefined);assert.equal('automation' in restored,false)
  assemblyAutomation.cancel();settle?.();await running;assert.equal(useAssembly.getState().automation?.status,'cancelled');assert.equal(useAssembly.getState().installed.cpu,undefined);assert.equal(validBuild(useAssembly.getState()),true)
  const next=assemblyAutomation.start('parts');await new Promise(resolve=>setImmediate(resolve));useAssembly.getState().togglePanel();await next;assert.equal(useAssembly.getState().installed.cpu,undefined);assert.equal(assemblyAutomation.busy,false);await assemblyAutomation.start('parts');const issue=useAssembly.getState().automation?.issue;assert.ok(issue&&issue!=='notReady'&&issue.code==='panelClosed')
  useAssembly.getState().togglePanel();const last=assemblyAutomation.start('parts');await new Promise(resolve=>setImmediate(resolve));useAssembly.getState().hydrate('22222222-2222-4222-8222-222222222222',{getItem:()=>null});settle?.();await last;assert.deepEqual(useAssembly.getState().installed,{monitor:'monitor'});assert.equal(useAssembly.getState().power,'off');assert.ok(steps.length>=4)
 }finally{unregister();useAssembly.getState().release()}
})
