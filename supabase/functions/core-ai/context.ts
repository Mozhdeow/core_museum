import {CoreAIError} from '../../../src/features/coreAI/coreAIContracts.ts'
import {assemblyOrder,cableIds,cables,partIds,parts,slots,type CableId,type PartId,type SlotId} from '../../../src/features/assembly/assemblyDefinition.ts'
import {bootIssues,validBuild,type Build} from '../../../src/features/assembly/assemblyRules.ts'
import {scenarios,scenarioIds,type ScenarioId} from '../../../src/features/assembly/troubleshooting.ts'

export const record=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}
export const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export type CatalogExhibit={title:string;description:string;category:string;specifications:{label:string;value:string}[]}
export type ContextBackend={exhibit(id:string,locale:'en'|'fa',token:string,signal:AbortSignal):Promise<CatalogExhibit|null>}
function component(v:unknown):PartId|CableId|null{
 if(v===null||v===undefined)return null
 if([...partIds,...cableIds].includes(v as PartId))return v as PartId|CableId
 throw new CoreAIError('invalidContext')
}
/** Client context is untrusted simulation input. Only catalog data is database verified. */
export async function resolveContext(value:unknown,locale:'en'|'fa',backend:ContextBackend,token:string,signal:AbortSignal){
 const c=record(value)
 if(c.kind==='museum'){
  if(c.exhibitId===null)return {kind:'museum',exhibit:null}
  if(typeof c.exhibitId!=='string'||!uuid.test(c.exhibitId))throw new CoreAIError('invalidContext')
  const exhibit=await backend.exhibit(c.exhibitId,locale,token,signal)
  if(!exhibit)throw new CoreAIError('invalidContext')
  return {kind:'museum',exhibit:{id:c.exhibitId,title:exhibit.title.slice(0,180),description:exhibit.description.slice(0,1200),category:exhibit.category.slice(0,80),specifications:exhibit.specifications.slice(0,12).map(s=>({label:s.label.slice(0,80),value:s.value.slice(0,180)}))}}
 }
 if(c.kind!=='assembly'&&c.kind!=='troubleshooting')throw new CoreAIError('invalidContext')
 const raw=record(c.build),installed=record(raw.installed)
 if(!Array.isArray(raw.connected)||raw.connected.length>cableIds.length||Object.keys(installed).length>partIds.length)throw new CoreAIError('invalidContext')
 const build:Build={installed:{...installed} as Build['installed'],connected:[...raw.connected] as CableId[]}
 if(!validBuild(build))throw new CoreAIError('invalidContext')
 const selected=component(c.selected),next=assemblyOrder.find(id=>!build.installed[id])??cableIds.find(id=>!build.connected.includes(id))??null
 if(c.kind==='assembly'&&c.target!==null&&c.target!==undefined&&!slots.includes(c.target as SlotId))throw new CoreAIError('invalidContext')
 const active=selected??next
 const details=active&&partIds.includes(active as PartId)?{id:active,targets:parts[active as PartId].targets,requires:parts[active as PartId].requires,missingPrerequisites:parts[active as PartId].requires.filter(id=>!build.installed[id])}:active?{id:active,ends:cables[active as CableId].ends,requires:cables[active as CableId].requires}:null
 const simulation=record(c.simulation)
 if(simulation.power!==undefined&&!['off','starting','running','faulted'].includes(simulation.power as string))throw new CoreAIError('invalidContext')
 const base={kind:c.kind,reference:'mATX / AM4 / DDR4 A2+B2 / discrete PCIe GPU / SATA SSD / ATX PSU; educational reference only',build,selected,next,component:details,simulation:{power:simulation.power??'unknown',panelOpen:typeof simulation.panelOpen==='boolean'?simulation.panelOpen:'unknown'},findings:bootIssues(build),connectorRequirements:cableIds.map(id=>({id,ends:cables[id].ends,requires:cables[id].requires}))}
 if(c.kind==='assembly')return base
 if(c.scenario!==null&&!scenarioIds.includes(c.scenario as ScenarioId))throw new CoreAIError('invalidContext')
 if(!Number.isInteger(c.attempts)||(c.attempts as number)<0||(c.attempts as number)>10000)throw new CoreAIError('invalidContext')
 const scenario=c.scenario?scenarios[c.scenario as ScenarioId]:null
 return {...base,attempts:c.attempts,lesson:scenario?{id:scenario.id,title:scenario.title[locale],symptom:scenario.symptom[locale],hint:scenario.hint[locale],explanation:scenario.explanation[locale]}:null}
}
