import {create} from 'zustand'
import type {CPUHotspotId,CPULesson} from './cpuEducation'

type LessonStatus='idle'|'playing'|'paused'|'complete'
type CPUExperience={
 view:'model'|'schematic';sourceId:string|null;exploded:boolean;hotspot:CPUHotspotId|null
 lesson:CPULesson|null;status:LessonStatus;run:number
 open(sourceId:string|null,realReady:boolean):void;chooseView(view:'model'|'schematic'):void
 toggleExplosion():void;selectHotspot(id:CPUHotspotId|null):void;start(lesson:CPULesson):void
 pause():void;resume():void;complete():void;reset():void;setLessonHotspot(id:CPUHotspotId):void
}
export const useCPUExperience=create<CPUExperience>((set,get)=>({
 view:'schematic',sourceId:null,exploded:false,hotspot:null,lesson:null,status:'idle',run:0,
 open:(sourceId,realReady)=>set(s=>({sourceId,view:realReady?'model':'schematic',exploded:false,hotspot:null,lesson:null,status:'idle',run:s.run+1})),
 chooseView:view=>set(s=>({view,exploded:false,hotspot:null,lesson:null,status:'idle',run:s.run+1})),
 toggleExplosion:()=>set(s=>({view:'schematic',exploded:!s.exploded,hotspot:null,lesson:null,status:'idle',run:s.run+1})),
 selectHotspot:hotspot=>set(s=>({view:'schematic',hotspot,exploded:hotspot?true:s.exploded,lesson:null,status:'idle',run:s.run+1})),
 start:lesson=>set(s=>({view:'schematic',lesson,status:'playing',exploded:true,hotspot:lesson==='heat'?'heat':'spreader',run:s.run+1})),
 pause:()=>{if(get().status==='playing')set({status:'paused'})},
 resume:()=>{if(get().status==='paused')set({status:'playing'})},
 complete:()=>set({status:'complete'}),
 setLessonHotspot:hotspot=>{if(get().hotspot!==hotspot)set({hotspot})},
 reset:()=>set(s=>({exploded:false,hotspot:null,lesson:null,status:'idle',run:s.run+1})),
}))
