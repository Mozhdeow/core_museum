import {create} from 'zustand'
import {chooseMuseumQuality,type MuseumQuality} from './museumQuality'
export type QualityChoice='auto'|MuseumQuality
export type Brightness='dim'|'standard'|'bright'
type State={tier:MuseumQuality;choice:QualityChoice;brightness:Brightness;reason:string;effects:number;initialized:boolean;contextRevision:number;initialize(reduced:boolean):void;setChoice(choice:QualityChoice):void;setBrightness(value:Brightness):void;lower():void}
const read=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}}
const persist=(key:string,value:string)=>{try{localStorage.setItem(key,value)}catch{/* Preferences are optional. */}}
export const useMuseumQuality=create<State>((set,get)=>({tier:'medium',choice:'auto',brightness:'standard',reason:'Initializing',effects:0,initialized:false,contextRevision:0,
 initialize(reduced){if(get().initialized)return;const device=navigator as Navigator&{deviceMemory?:number},query=new URLSearchParams(location.search).get('quality'),saved=read('core-museum-quality-choice'),choice:QualityChoice=['auto','high','medium','low'].includes(query??'')?query as QualityChoice:['auto','high','medium','low'].includes(saved??'')?saved as QualityChoice:'auto',brightness=read('core-museum-brightness');set({choice,tier:choice==='auto'?chooseMuseumQuality({cores:device.hardwareConcurrency,memory:device.deviceMemory,dpr:devicePixelRatio,coarse:matchMedia('(pointer: coarse),(max-width:767px)').matches,reduced}):choice,brightness:brightness==='dim'||brightness==='bright'?brightness:'standard',reason:query?'URL override':choice==='auto'?'Device capability':'Saved preference',initialized:true})},
 setChoice(choice){persist('core-museum-quality-choice',choice);set({choice,...(choice!=='auto'?{tier:choice}:{}),effects:0,reason:`User: ${choice}`})},setBrightness(brightness){persist('core-museum-brightness',brightness);set({brightness})},
 lower(){if(get().choice==='auto')set({tier:get().tier==='high'?'medium':'low',reason:'Sustained frame cost'})},
}))
