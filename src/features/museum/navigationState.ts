import {create} from 'zustand'

export type MuseumDestination = 'entrance' | 'corridor' | 'cpu'
export type NavigationMode = 'guided' | 'explore' | 'inspect'
export const destinations: Record<MuseumDestination, number> = {entrance: 0, corridor: .5, cpu: 1}
export const destinationAt = (z: number): MuseumDestination => z < -18 ? 'cpu' : z < 2 ? 'corridor' : 'entrance'
export const destinationOrder: MuseumDestination[] = ['entrance', 'corridor', 'cpu']
export {constrainMuseumPosition} from './museumCollision.ts'
type NavigationState = {
    intent:number;arrivalRevision:number
    overlay:'gallery'|'ai'|null;openOverlay(kind:'gallery'|'ai'):void;closeOverlay():void
    artifactFocusY:number;artifactRadius:number;setArtifactFocus(y:number,radius?:number):void
    mode: NavigationMode; playing: boolean; progress: number; location: MuseumDestination
    request: {id:number;target:number;instant:boolean};move:number;atmospherePaused:boolean
    inspection:'closed'|'entering'|'active'|'exiting'
    returnTo:{mode:'guided'|'explore';playing:boolean}|null
    inspectCommand:{id:number;zoom:number;reset:boolean}
    showcase:{id:number;bay:number}|null;visitShowcase(bay:number):void
    enterInspect():void;exitInspect():void;inspectionReady():void;restoreNavigation():void
    resetInspectView():void;zoomInspect(direction:-1|1):void
    tour():void;pause():void;explore():void;visit(place:MuseumDestination,instant?:boolean):void
    step(direction:-1|1):void;toggleAtmosphere():void
    report(progress:number,location:MuseumDestination):void;finish():void;setMove(move:number):void;reset():void
}
export const useMuseumNavigation=create<NavigationState>((set,get)=>({
    intent:0,arrivalRevision:0,
    overlay:null,artifactFocusY:2.25,artifactRadius:1.5,openOverlay:overlay=>{if(get().mode!=='inspect'&&!get().overlay)set({overlay,move:0})},closeOverlay:()=>set({overlay:null,move:0}),
    setArtifactFocus:(y,radius=1.5)=>set({artifactFocusY:Number.isFinite(y)?Math.max(.5,Math.min(3.5,y)):2.25,artifactRadius:Math.max(.1,Math.min(1.5,radius))}),
    mode:'guided',playing:false,progress:0,location:'entrance',request:{id:0,target:0,instant:true},move:0,atmospherePaused:false,
    inspection:'closed',returnTo:null,inspectCommand:{id:0,zoom:0,reset:true},
    showcase:null,visitShowcase:bay=>{const s=get();if(s.mode==='inspect'||s.overlay)return
        set({intent:s.intent+1,mode:'guided',playing:true,move:0,request:{id:s.request.id+1,target:bay<2?.5:.72,instant:false},showcase:{id:(s.showcase?.id??0)+1,bay:Number.isFinite(bay)?Math.max(0,Math.floor(bay)):0}})},
    enterInspect:()=>{const s=get();if(s.mode==='inspect'||s.overlay)return
        set({intent:s.intent+1,mode:'inspect',playing:false,move:0,inspection:'entering',returnTo:{mode:s.mode,playing:s.playing}})},
    exitInspect:()=>{if(get().mode==='inspect')set({inspection:'exiting',move:0})},
    inspectionReady:()=>{if(get().inspection==='entering')set({inspection:'active'})},
    restoreNavigation:()=>{const s=get();if(s.inspection!=='exiting')return
        set({mode:s.returnTo?.mode??'guided',playing:s.returnTo?.playing??false,inspection:'closed',returnTo:null,move:0})},
    resetInspectView:()=>set(s=>({inspectCommand:{id:s.inspectCommand.id+1,zoom:0,reset:true}})),
    zoomInspect:zoom=>set(s=>({inspectCommand:{id:s.inspectCommand.id+1,zoom,reset:false}})),
    tour:()=>{if(get().mode==='inspect'||get().overlay)return;set(s=>({intent:s.intent+1,mode:'guided',playing:true,move:0,request:{id:s.request.id+1,target:s.request.target>s.progress?s.request.target:1,instant:false}}))},
    pause:()=>{if(get().mode!=='inspect'&&!get().overlay)set(s=>({intent:s.intent+1,playing:false,move:0}))},
    explore:()=>{if(get().mode!=='inspect'&&!get().overlay)set(s=>({intent:s.intent+1,mode:'explore',playing:false,move:0}))},
    visit:(place,instant=false)=>{if(get().mode==='inspect'||get().overlay)return;set(s=>({intent:s.intent+1,showcase:null,mode:'guided',playing:!instant,move:0,request:{id:s.request.id+1,target:destinations[place],instant}}))},
    step:direction=>{const s=get();if(s.mode==='inspect'||s.overlay)return
        const index=destinationOrder.indexOf(s.location),pending=s.playing?Math.sign(s.request.target-destinations[s.location]):0
        const next=index+(pending&&pending!==direction?0:direction)
        if(next>=0&&next<destinationOrder.length&&(next!==index||pending))s.visit(destinationOrder[next])},
    toggleAtmosphere:()=>set(s=>({atmospherePaused:!s.atmospherePaused})),
    report:(progress,location)=>set({progress,location}),finish:()=>set({playing:false}),
    setMove:move=>{if((get().mode!=='inspect'&&!get().overlay)||move===0)set({move:Math.max(-1,Math.min(1,move))})},
    reset:()=>set({intent:get().intent+1,arrivalRevision:get().arrivalRevision+1,mode:'guided',playing:false,progress:0,location:'entrance',move:0,atmospherePaused:false,
        inspection:'closed',returnTo:null,overlay:null,artifactFocusY:2.25,artifactRadius:1.5,showcase:null,request:{id:get().request.id+1,target:0,instant:true}}),
}))
