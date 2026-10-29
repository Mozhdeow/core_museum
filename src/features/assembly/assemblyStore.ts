import {createAssemblyAutomation,type AutomationProgress} from './assemblyAutomation.ts'
import {emptyOptional,optionalCables,optionalCableIds,devicePorts,type OptionalBuild,type OptionalCableId,type PeripheralId,type DevicePortId} from './assemblyExtensions.ts'
import {optionalWireIssue,peripheralIssue,type PeripheralIssue} from './assemblyOptionalRules.ts'
import {create} from 'zustand'
import {
    assemblyOrder,
    partIds,
    cableIds,
    cables,
    parts,
    referenceId,
    type PartId,
    type SlotId,
    type CableId,
    type PortId
} from './assemblyDefinition.ts'
import {placementIssue, removalIssue, connectionIssue, bootIssues, type Build, type Issue} from './assemblyRules.ts'
import {readAssembly, assemblyKey, type AssemblySnapshot} from './assemblyPersistence.ts'
import {introduceFault,referenceBuild,scenarios,diagnosticConnected,type ScenarioId} from './troubleshooting.ts'

export type Selection = PartId | CableId | null
type SavedAssembly=Build & OptionalBuild & {mode:'guided'|'free';panelOpen:boolean;selected:Selection;typedText:string;cursor:[number,number]}
export type TroubleshootingSession={id:ScenarioId;baseline:Build;saved:SavedAssembly;practice:boolean;answer:boolean|null;answerCorrect:boolean|null;observed:boolean;inspected:boolean;hint:boolean;attempts:number;result:'untried'|'failed'|'starting'|'passed'}
type AssemblyState = Build & OptionalBuild & {
    automation:AutomationProgress|null;
    learningMode:'explore'|'assemble'|'troubleshoot';troubleshooting:TroubleshootingSession|null;
    setLearningMode(mode:AssemblyState['learningMode']):void;startScenario(id:ScenarioId,practice?:boolean):boolean;resetScenario():void;
    diagnosticStep(step:'observe'|'inspect'|'hint'|'answer',answer?:boolean):void;
    hoverPort:DevicePortId|null; extensionSelection:string|null; extensionIssue:PeripheralIssue|'panelClosed'|'powerOff'|'dependency'|'disconnectFirst'|'wrongPort'|null;
    monitorFocused:boolean; optionalFirst:string|null; trayTab:'parts'|'optional'|'peripherals'; typedText:string; cursor:[number,number];
    selectExtension(id:string):void; setTab(tab:AssemblyState['trayTab']):void; installOptical():void; removeOptical():void;
    optionalPort(port:string):void; disconnectOptional(id:OptionalCableId):void; eject():void;
    plug(id:PeripheralId,port:DevicePortId):void; unplug(id:PeripheralId):void; typeText(text:string):void; moveCursor(x:number,y:number):void;

    owner: string | null;
    ready: boolean;
    mode: 'guided' | 'free';
    panelOpen: boolean;
    selected: Selection;
    firstPort: PortId | null;
    issue: Issue | null;
    diagnostics: Issue[];
    power: 'off' | 'starting' | 'running' | 'faulted';
    displayStage:'noSignal'|'post'|'osBoot'|'welcome'|'desktop'|'diagnostic';
    dragging: boolean;
    restored: boolean
    camera: {
        revision: number;
        kind: 'reset' | 'focus' | 'return' | 'left' | 'right' | 'top' | 'back' | 'front' | 'iso' | 'sideLeft' | 'sideRight' | 'io' | 'staging' | 'zoomIn' | 'zoomOut';
        part?: PartId
    }
    hydrate(owner: string, storage: Pick<Storage, 'getItem'>): void;
    release(): void;
    select(id: Selection): void;
    install(id: PartId, slot: SlotId): boolean;
    remove(id: PartId): void
    port(port: PortId): void;
    disconnect(id: CableId): void;
    togglePower(): void;
    bootComplete(): void;
    restart(): void;
    togglePanel(): void;
    setMode(mode: 'guided' | 'free'): void;
    command(kind: AssemblyState['camera']['kind'], part?: PartId): void
}
const empty = () => ({...emptyOptional(),hoverPort:null, monitorFocused:false,extensionSelection:null,extensionIssue:null,optionalFirst:null,trayTab:'parts' as const,typedText:'',cursor:[.5,.5] as [number,number],
    learningMode:'assemble' as const,troubleshooting:null,automation:null,
    installed: {monitor:'monitor' as const},
    connected: [] as CableId[],
    selected: null,
    firstPort: null,
    issue: null,
    diagnostics: [],
    power: 'off' as const,
    displayStage:'noSignal' as const,
    dragging: false,
    panelOpen: true,
    mode: 'guided' as const,
    restored: false
})
export const useAssembly = create<AssemblyState>((set, get) => ({
    ...empty(), owner: null, ready: false, camera: {revision: 0, kind: 'reset'},
    hydrate(owner, storage) {
        assemblyAutomation.cancel()
        const saved = readAssembly(storage, owner);
        set({
            ...empty(), owner, ready: true, ...(saved ? {
                installed: saved.installed,
                connected: saved.connected,
                mode: saved.mode,
                panelOpen: saved.panelOpen, optionalParts:saved.optionalParts,optionalConnected:saved.optionalConnected,peripherals:saved.peripherals,opticalOpen:saved.opticalOpen,
                    restored: Object.keys(saved.installed).some(id=>id!=='monitor')||saved.connected.length>0||saved.mode!=='guided'||!saved.panelOpen
            } : {}), camera: {revision: get().camera.revision + 1, kind: 'reset'}
        })
    },
    release: () => {assemblyAutomation.cancel();set({...empty(), owner: null, ready: false})},
    select: id => set({extensionSelection:null,extensionIssue:null,selected: id, firstPort: null, issue: null, diagnostics: []}),
    setLearningMode(learningMode){
        assemblyAutomation.cancel()
        const s=get();if(s.learningMode===learningMode)return;const saved=s.troubleshooting?.saved
        set({...saved,learningMode,troubleshooting:learningMode==='troubleshoot'?s.troubleshooting:null,power:'off',monitorFocused:false,displayStage:'noSignal',diagnostics:[],issue:null,extensionSelection:null,extensionIssue:null,firstPort:null,trayTab:'parts',dragging:false})
    },
    startScenario(id,practice=false){
        const s=get(),previous=s.troubleshooting
        const saved:SavedAssembly=previous?.saved??structuredClone({installed:s.installed,connected:s.connected,optionalParts:s.optionalParts,optionalConnected:s.optionalConnected,peripherals:s.peripherals,opticalOpen:s.opticalOpen,mode:s.mode,panelOpen:s.panelOpen,selected:s.selected,typedText:s.typedText,cursor:s.cursor})
        const baseline=practice?referenceBuild():structuredClone(previous?.baseline??{installed:s.installed,connected:s.connected})
        if(bootIssues(baseline).length)return false
        const fault=introduceFault(baseline,id),spec=scenarios[id]
        set({...emptyOptional(),...fault,learningMode:'troubleshoot',troubleshooting:{id,baseline,saved,practice,answer:null,answerCorrect:null,observed:false,inspected:false,hint:false,attempts:0,result:'untried'},power:'off',monitorFocused:false,displayStage:'noSignal',panelOpen:true,selected:spec.cable??spec.part,issue:null,diagnostics:[],trayTab:'parts',firstPort:null,extensionSelection:null,extensionIssue:null,dragging:false,typedText:''})
        return true
    },
    resetScenario(){const trial=get().troubleshooting;if(trial)get().startScenario(trial.id,trial.practice)},
    diagnosticStep(step,answer){
        const s=get(),trial=s.troubleshooting;if(!trial)return
        const next={...trial,...(step==='answer'?{answer:answer??null,answerCorrect:answer===diagnosticConnected(s,trial.id)}:step==='observe'?{observed:true}:step==='inspect'?{inspected:true}:{hint:true})}
        set({troubleshooting:next})
        if(step==='inspect'){get().select(scenarios[trial.id].cable??scenarios[trial.id].part);get().command('focus',scenarios[trial.id].part)}
    },
    install(id, slot) {if(assemblyAutomation.busy&&!assemblyAutomation.committing)return false;if(get().learningMode==='explore'){set({issue:{code:'exploreOnly'}});return false}
        if(id==='monitor'){if(slot==='monitor')return true;set({issue:{code:'fixedPart',part:id}});return false}
        const s = get(),
            issue = s.power !== 'off' ? {code: 'powerOff' as const} : placementIssue(s, id, slot, s.panelOpen);
        if (issue) {
            set({issue});
            return false
        }
        set({installed: {...s.installed, [id]: slot}, issue: null, diagnostics: [], dragging: false});
        return true
    },
    remove(id) {if(assemblyAutomation.busy)return;if(get().learningMode==='explore'){set({issue:{code:'exploreOnly'}});return}
        if(id==='monitor'){set({issue:{code:'fixedPart',part:id}});return}
        const s = get();if(id==='motherboard'&&s.optionalConnected.length||id==='psu'&&s.optionalConnected.includes('opticalPower')){set({issue:{code:'disconnectFirst'}});return}if(Object.keys(s.peripherals).length){set({issue:{code:'peripheralsFirst'}});return}const issue = s.power !== 'off' ? {code: 'powerOff' as const} : !s.panelOpen?{code:'panelClosed' as const}:removalIssue(s, id);
        if (issue) {
            set({issue});
            return
        }
        const installed = {...s.installed};
        delete installed[id];
        set({installed, issue: null, diagnostics: []})
    },
    port(port) {if(assemblyAutomation.busy&&!assemblyAutomation.committing)return;if(get().learningMode==='explore'){set({issue:{code:'exploreOnly'}});return}
        const s = get(), id = s.selected;
        if (!id || !cableIds.includes(id as CableId)) {
            set({issue: {code: 'pickPart'}});
            return
        }
        const wire = cables[id as CableId];
        if(!s.panelOpen&&!['display','psuAC','monitorAC'].includes(wire.id)){set({issue:{code:'panelClosed'}});return}
        if (s.power !== 'off') {
            set({issue: {code: 'powerOff'}});
            return
        }
        if (!wire.ends.includes(port)) {
            set({issue: {code: 'wrongPort', cable: wire.id}});
            return
        }
        if (!s.firstPort) {
            set({firstPort: port, issue: null});
            return
        }
        const issue = connectionIssue(s, wire.id, s.firstPort, port);
        if (issue) {
            set({issue});
            return
        }
        set({connected: [...new Set([...s.connected, wire.id])], firstPort: null, issue: null, diagnostics: []})
    },
    disconnect(id) {if(assemblyAutomation.busy)return;if(get().learningMode==='explore'){set({issue:{code:'exploreOnly'}});return}
        if(Object.keys(get().peripherals).length){set({issue:{code:'peripheralsFirst'}});return}
        if (get().power !== 'off') {
            set({issue: {code: 'powerOff'}});
            return
        }
        if(!get().panelOpen&&!['display','psuAC','monitorAC'].includes(id)){set({issue:{code:'panelClosed'}});return}
        set(s => ({connected: s.connected.filter(c => c !== id), firstPort: null, issue: null, diagnostics: []}))
    },
    togglePower() {
        assemblyAutomation.cancel()
        const s = get();
        if(s.learningMode==='explore')return
        if (s.power !== 'off') {
            set({power: 'off', monitorFocused:false,displayStage:'noSignal',diagnostics: [], issue: null});
            return
        }
        const diagnostics = bootIssues(s);
        set({diagnostics, issue: diagnostics[0] ?? null, trayTab:diagnostics.length?'parts':s.trayTab,extensionSelection:diagnostics.length?null:s.extensionSelection, selected:diagnostics[0]?.part??diagnostics[0]?.cable??s.selected, power: diagnostics.length ? s.troubleshooting?'faulted':'off' : 'starting',displayStage:diagnostics.length?s.troubleshooting?'diagnostic':'noSignal':'post',...(s.troubleshooting?{troubleshooting:{...s.troubleshooting,attempts:s.troubleshooting.attempts+1,result:diagnostics.length?'failed':'starting'}}:{})})
    },
    bootComplete() {
        const s=get()
        if (s.power === 'starting' && !bootIssues(s).length) set({power: 'running',displayStage:'welcome',...(s.troubleshooting?{troubleshooting:{...s.troubleshooting,result:'passed'}}:{})})
    },
    selectExtension:id=>set({extensionSelection:id,trayTab:id==='optical'||id.startsWith('port:')||optionalCableIds.includes(id as OptionalCableId)?'optional':'peripherals',selected:null,optionalFirst:null,extensionIssue:null,issue:null,diagnostics:[]}),
    setTab:trayTab=>set({trayTab,selected:null,extensionSelection:null,issue:null,extensionIssue:null}),
    installOptical(){if(assemblyAutomation.busy)return;if(get().learningMode==='explore'){set({issue:{code:'exploreOnly'}});return}const s=get();if(s.power!=='off'||!s.panelOpen){set({extensionIssue:s.power!=='off'?'powerOff':'panelClosed'});return}set({optionalParts:['optical'],extensionIssue:null})},
    removeOptical(){if(assemblyAutomation.busy)return;if(get().learningMode==='explore'){set({issue:{code:'exploreOnly'}});return}const s=get();if(s.power!=='off'||!s.panelOpen){set({extensionIssue:s.power!=='off'?'powerOff':'panelClosed'});return}if(s.optionalConnected.some(id=>id.startsWith('optical'))||s.peripherals.disc){set({extensionIssue:'disconnectFirst'});return}set({optionalParts:[],opticalOpen:false,extensionIssue:null})},
    optionalPort(port){if(assemblyAutomation.busy)return;if(get().learningMode==='explore'){set({issue:{code:'exploreOnly'}});return}const s=get(),id=s.extensionSelection as OptionalCableId,wire=optionalCables[id];if(!wire)return;if(s.power!=='off'||!s.panelOpen){set({extensionIssue:s.power!=='off'?'powerOff':'panelClosed'});return}if(!wire.ends.includes(port)){set({extensionIssue:'wrongPort'});return}if(!s.optionalFirst){set({optionalFirst:port,extensionIssue:null});return}const issue=optionalWireIssue(s,id,s.optionalFirst,port);if(issue){set({extensionIssue:issue});return}set({optionalConnected:[...new Set([...s.optionalConnected,id])],optionalFirst:null,extensionIssue:null})},
    disconnectOptional(id){if(assemblyAutomation.busy)return;if(get().learningMode==='explore'){set({issue:{code:'exploreOnly'}});return}const s=get();if(s.power!=='off'||!s.panelOpen){set({extensionIssue:s.power!=='off'?'powerOff':'panelClosed'});return}const attached={...s.peripherals};for(const [device,port] of Object.entries(attached)){const p=devicePorts[port];if(('lead'in p&&p.lead===id)||(port==='opticalTray'&&id.startsWith('optical')))delete attached[device as PeripheralId]}set({optionalConnected:s.optionalConnected.filter(c=>c!==id),peripherals:attached,extensionIssue:null})},
    eject(){if(assemblyAutomation.busy)return;if(get().learningMode==='explore'){set({issue:{code:'exploreOnly'}});return}const s=get();if(!s.optionalParts.includes('optical')){set({extensionIssue:'opticalMissing'});return}set({opticalOpen:!s.opticalOpen,extensionIssue:null})},
    plug(id,port){if(assemblyAutomation.busy)return;if(get().learningMode==='explore'){set({issue:{code:'exploreOnly'}});return}const s=get(),issue=peripheralIssue(s,id,port,s.power);if(issue){set({extensionIssue:issue});return}set({peripherals:{...s.peripherals,[id]:port},extensionIssue:null})},
    unplug(id){if(assemblyAutomation.busy)return;const peripherals={...get().peripherals};delete peripherals[id];set({peripherals,extensionIssue:null,typedText:id==='keyboard'?'':get().typedText})},
    typeText:typedText=>{if(get().power==='running'&&get().peripherals.keyboard)set({typedText:typedText.slice(0,512)})},
    moveCursor:(x,y)=>{const s=get();if(s.power!=='running'||!s.peripherals.mouse)return;const cursor:[number,number]=[Math.max(0,Math.min(1,x)),Math.max(0,Math.min(1,y))];if(Math.abs(cursor[0]-s.cursor[0])>.001||Math.abs(cursor[1]-s.cursor[1])>.001)set({cursor})},
    restart: () => {assemblyAutomation.cancel();if(get().troubleshooting){get().resetScenario();return}set({...empty(), camera: {revision: get().camera.revision + 1, kind: 'reset'}})},
    togglePanel: () => {assemblyAutomation.cancel();set(s => ({panelOpen: !s.panelOpen}))}, setMode: mode => set({mode}),
    command: (kind, part) => set(s => ({camera: {revision: s.camera.revision + 1, kind, part}})),
}))

export const assemblyAutomation=createAssemblyAutomation(useAssembly.getState,automation=>useAssembly.setState({automation}))

export function nextAssembly(s: Build): Selection {
    return assemblyOrder.find(id => id!=='monitor'&&!s.installed[id]) ?? cableIds.find(id => !s.connected.includes(id)) ?? null
}

export function saveAssembly(storage: Pick<Storage, 'setItem'>, s: AssemblyState) {
    if (!s.ready || !s.owner) return;
    const saved=s.troubleshooting?.saved??s
    const snapshot: AssemblySnapshot = {
        version: 2,
        reference: referenceId,
        owner: s.owner,
        savedAt: Date.now(),
        installed: saved.installed,
        connected: saved.connected,
        mode: saved.mode,
        panelOpen: saved.panelOpen,optionalParts:saved.optionalParts,optionalConnected:saved.optionalConnected,peripherals:saved.peripherals,opticalOpen:saved.opticalOpen
    };
    try {
        storage.setItem(assemblyKey(s.owner), JSON.stringify(snapshot))
    } catch {/* Optional local persistence; assembling remains possible. */
    }
}

export function isPart(id: Selection): id is PartId {
    return partIds.includes(id as PartId)
}

export function recommendedTarget(id: PartId, s: Build): SlotId {
    return parts[id].targets.find(slot => !Object.values(s.installed).includes(slot)) ?? parts[id].slot
}
