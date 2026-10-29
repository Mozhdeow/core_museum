import {bootIssues,type Build} from './assemblyRules.ts'
import {optionalPartIds,optionalCableIds,optionalCables,devicePorts,peripheralIds,peripherals,type OptionalBuild,type OptionalCableId,type PeripheralId,type DevicePortId} from './assemblyExtensions.ts'

export type PeripheralIssue='completeFirst'|'powerFirst'|'portMismatch'|'portBusy'|'leadMissing'|'opticalMissing'|'trayClosed'|'driveUnwired'
export function optionalWireIssue(b:Build&OptionalBuild,id:OptionalCableId,a:string,z:string){
 const wire=optionalCables[id];if(!wire||!((wire.ends[0]===a&&wire.ends[1]===z)||(wire.ends[0]===z&&wire.ends[1]===a)))return 'wrongPort'
 if(!b.installed.motherboard||id==='opticalPower'&&!b.installed.psu||wire.requires==='optical'&&!b.optionalParts.includes('optical'))return 'dependency'
 return null
}
export function peripheralIssue(b:Build&OptionalBuild,id:PeripheralId,port:DevicePortId,power='running',inserting=true):PeripheralIssue|null{
 if(!peripherals[id]||!devicePorts[port]||peripherals[id].plug!==devicePorts[port].plug)return 'portMismatch'
 if(bootIssues(b).length)return 'completeFirst'
 if(power!=='running')return 'powerFirst'
 if(Object.entries(b.peripherals).some(([other,p])=>p===port&&other!==id))return 'portBusy'
 const spec=devicePorts[port];if('lead'in spec&&!b.optionalConnected.includes(spec.lead))return 'leadMissing'
 if(port==='opticalTray'){if(!b.optionalParts.includes('optical'))return 'opticalMissing';if(!b.optionalConnected.includes('opticalData')||!b.optionalConnected.includes('opticalPower'))return 'driveUnwired';if(inserting&&!b.opticalOpen)return 'trayClosed'}
 return null
}
export function validOptional(b:Build,value:unknown):value is OptionalBuild{
 if(!value||typeof value!=='object')return false
 const v=value as OptionalBuild;if(!Array.isArray(v.optionalParts)||!Array.isArray(v.optionalConnected)||!v.peripherals||typeof v.peripherals!=='object'||Array.isArray(v.peripherals)||typeof v.opticalOpen!=='boolean')return false
 if(new Set(v.optionalParts).size!==v.optionalParts.length||v.optionalParts.some(p=>!optionalPartIds.includes(p))||new Set(v.optionalConnected).size!==v.optionalConnected.length||v.optionalConnected.some(c=>!optionalCableIds.includes(c)))return false
 const full={...b,...v};if(v.opticalOpen&&!v.optionalParts.includes('optical'))return false
 if(v.optionalConnected.some(id=>optionalWireIssue(full,id,...optionalCables[id].ends)))return false
 return Object.entries(v.peripherals).every(([id,port])=>peripheralIds.includes(id as PeripheralId)&&!peripheralIssue(full,id as PeripheralId,port,'running',false))
}
