import type {MuseumItem} from '../../types/museum.ts'
import type {CoreAIContext,VerifiedExhibit,CoreAISimulation} from './coreAIContracts.ts'
import {bootIssues,validBuild,type Build} from '../assembly/assemblyRules.ts'
import {parts,type PartId,type CableId} from '../assembly/assemblyDefinition.ts'

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Only a selected, published record in the supplied visitor catalog may become exhibit context. */
export function museumAIContext(selectedId:string,catalog:readonly MuseumItem[]):CoreAIContext{
 const item=catalog.find(i=>i.id===selectedId&&i.status==='published'&&i.enableAiCurator!==false)
 const exhibit:VerifiedExhibit|null=item&&uuid.test(item.id)?{id:item.id,status:'published',title:{...item.title},description:{en:(item.description.en||item.shortDescription.en).slice(0,6000),fa:(item.description.fa||item.shortDescription.fa).slice(0,6000)},specifications:item.specifications.slice(0,20).map(s=>({label:{...s.label},value:s.value.slice(0,500)})),category:item.category}:null
 return {kind:'museum',exhibit}
}
export function assemblyAIContext(build:Build,selected:PartId|CableId|null,next:PartId|CableId|null,simulation?:CoreAISimulation):CoreAIContext{
 return {kind:'assembly',build:{installed:{...build.installed},connected:[...build.connected]},selected,next,simulation,target:selected&&selected in parts?(build.installed[selected as PartId]??parts[selected as PartId].targets.find(slot=>!Object.values(build.installed).includes(slot))??parts[selected as PartId].slot):null}
}
export function validAIContext(context:CoreAIContext){
 if(context.kind==='museum')return !context.exhibit||uuid.test(context.exhibit.id)&&context.exhibit.status==='published'
 return validBuild(context.build)
}
export function contextFindings(context:CoreAIContext){return context.kind==='museum'?[]:bootIssues(context.build)}
