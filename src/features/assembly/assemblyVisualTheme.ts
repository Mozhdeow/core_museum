import {peripherals,peripheralIds,type PeripheralId} from './assemblyExtensions'
import type {V3} from './assemblyDefinition'
/** The lab reads the same semantic brand tokens as the museum HUD. */
export function labVisualTheme(){
 const css=getComputedStyle(document.documentElement),token=(name:string,fallback:string)=>css.getPropertyValue('--color-'+name).trim()||fallback
 return {void:token('void','#050505'),surface:token('surface','#0d0d0d'),elevated:token('elevated','#171717'),amber:token('amber','#ffb547'),orange:token('orange','#ff7a18'),cyan:token('cyan','#55e6e6'),ink:token('ink','#f5f5f0')}
}

/** Display-only workbench arrangement. Plug/port coordinates and persisted IDs stay authoritative. */
const displayPositions=Object.fromEntries(peripheralIds.map(id=>{const at=peripherals[id].at;return [id,[at[0]+(id==='disc'?-.45:id==='headphones'?.9:0),at[1],at[2]-(id==='headphones'||id==='disc'?.85:id==='flash'||id==='flashC'?.65:id==='keyboard'||id==='mouse'?.45:0)]]})) as Record<PeripheralId,V3>
export function peripheralDisplayPosition(id:PeripheralId):V3{return displayPositions[id]}
