export type V3 = [number, number, number]
export const partIds = ['motherboard', 'cpu', 'cooler', 'ram1', 'ram2', 'gpu', 'ssd', 'psu', 'fanFront', 'fanRear', 'monitor'] as const
export type PartId = typeof partIds[number]
export const assemblyPartIds = partIds.filter(id=>id!=='monitor')
export type SlotId = PartId | 'dimmB2'
export type PartDefinition = {
    id: PartId;
    slot: SlotId;
    targets: SlotId[];
    requires: PartId[];
    position: V3;
    rotation: V3;
    tray: V3;
    trayRotation: V3;
    size: V3
}
const boardRotation: V3 = [0, -Math.PI / 2, 0]
export const boardOrigin: V3 = [.8, 3.1, -.58]
export const parts: Record<PartId, PartDefinition> = {
    motherboard: {
        id: 'motherboard',
        slot: 'motherboard',
        targets: ['motherboard'],
        requires: [],
        position: boardOrigin,
        rotation: boardRotation,
        tray: [-6.1,1.06,-1.2],
        trayRotation: [-1.5707963267948966,0,0],
        size: [2.44, 2.44, .07]
    },
    cpu: {
        id: 'cpu',
        slot: 'cpu',
        targets: ['cpu'],
        requires: ['motherboard'],
        position: [.73, 3.65, -1.05],
        rotation: boardRotation,
        tray: [-3.6,1.078,2.95],
        trayRotation: [-1.5707963267948966,0,0],
        size: [.43, .43, .06]
    },
    cooler: {
        id: 'cooler',
        slot: 'cooler',
        targets: ['cooler'],
        requires: ['cpu'],
        position: [.68, 3.65, -1.05],
        rotation: boardRotation,
        tray: [-4.35,1.02,1.65],
        trayRotation: [-1.5707963267948966,0,0],
        size: [1.02, 1.02, .67]
    },
    ram1: {
        id: 'ram1',
        slot: 'ram1',
        targets: ['ram1', 'dimmB2'],
        requires: ['motherboard'],
        position: [.56, 3.55, .19],
        rotation: [0, 0, 0],
        tray: [-6.7,1.034,2.95],
        trayRotation: [-1.5707963267948966,0,1.5707963267948966],
        size: [.31, 1.33, .035]
    },
    ram2: {
        id: 'ram2',
        slot: 'dimmB2',
        targets: ['ram1', 'dimmB2'],
        requires: ['motherboard'],
        position: [.56, 3.55, .43],
        rotation: [0, 0, 0],
        tray: [-4.95,1.034,2.95],
        trayRotation: [-1.5707963267948966,0,1.5707963267948966],
        size: [.31, 1.33, .035]
    },
    gpu: {
        id: 'gpu',
        slot: 'gpu',
        targets: ['gpu'],
        requires: ['motherboard'],
        position: [.18, 2.35, -.60],
        rotation: [0, 0, 0],
        tray: [-3.4,1.32,-1.2],
        trayRotation: [0,0,3.141592653589793],
        size: [1.18, .48, 2.4]
    },
    ssd: {
        id: 'ssd',
        slot: 'ssd',
        targets: ['ssd'],
        requires: [],
        position: [.25, 2.015, 1.15],
        rotation: [0, 0, 0],
        tray: [-2.25,1.055,2.95],
        trayRotation: [0,0,0],
        size: [.70, .07, 1]
    },
    psu: {
        id: 'psu',
        slot: 'psu',
        targets: ['psu'],
        requires: [],
        position: [0, 1.45, -1.05],
        rotation: [0, 0, 0],
        tray: [-2.65,1.72,1.55],
        trayRotation: [Math.PI/2,0,0],
        size: [1.5, .86, 1.4]
    },
    fanFront: {
        id: 'fanFront',
        slot: 'fanFront',
        targets: ['fanFront'],
        requires: [],
        position: [0, 3.7, 1.65],
        rotation: [0, Math.PI, 0],
        tray: [-7,1.08,1.55],
        trayRotation: [-1.5707963267948966,0,0],
        size: [1.12, 1.12, .18]
    },
    fanRear: {
        id: 'fanRear',
        slot: 'fanRear',
        targets: ['fanRear'],
        requires: [],
        position: [0, 4.2, -1.68],
        rotation: [0, 0, 0],
        tray: [-5.65,1.08,1.55],
        trayRotation: [-1.5707963267948966,0,0],
        size: [1.12, 1.12, .18]
    },
    monitor: {
        id: 'monitor',
        slot: 'monitor',
        targets: ['monitor'],
        requires: [],
        position: [3.7, 2.9, -.85],
        rotation: [0, -.13, 0],
        tray: [3.7,2.9,-.85],
        trayRotation: [0,-0.13,0],
        size: [3.2, 1.9, .16]
    },
}

export function slotPosition(slot: SlotId): V3 {
    return slot === 'dimmB2' ? parts.ram2.position : parts[slot].position
}

export const slots = [...partIds.filter(id => id !== 'ram2'), 'dimmB2'] as SlotId[]
export const cableIds = ['atx', 'eps', 'pcie', 'sataData', 'sataPower', 'display', 'psuAC', 'monitorAC', 'frontFan', 'rearFan', 'coolerFan'] as const
export type CableId = typeof cableIds[number]
export type PortId = `${string}.${string}`
export type CableDefinition = { id: CableId; ends: [PortId, PortId]; requires: PartId[]; route: V3[]; color: string; radius: number }
export const ports: Record<PortId, { part: PartId | null; position: V3 }> = {
    'psu.atx': {part: 'psu', position: [.4, 1.5, -.30]},
    'board.atx': {part: 'motherboard', position: [.69, 3.25, .58]},
    'psu.eps': {part: 'psu', position: [.15, 1.55, -.30]},
    'board.eps': {part: 'motherboard', position: [.68, 4.22, -1.55]},
    'psu.pcie': {part: 'psu', position: [-.12, 1.5, -.30]},
    'gpu.power': {part: 'gpu', position: [-.33, 2.59, .25]},
    'board.sata': {part: 'motherboard', position: [.65, 2.12, .69]},
    'ssd.data': {part: 'ssd', position: [.47, 2.07, .65]},
    'psu.sata': {part: 'psu', position: [-.35, 1.5, -.3]},
    'ssd.power': {part: 'ssd', position: [.17, 2.07, .65]},
    'gpu.display': {part: 'gpu', position: [.05, 2.4, -1.82]},
    'monitor.display': {part: 'monitor', position: [3.813, 2.3, -.946]},
    'wall.psu': {part: null, position: [-1.5, 1.10, -2.5]},
    'psu.ac': {part: 'psu', position: [.5, 1.45, -1.82]},
    'wall.monitor': {part: null, position: [2.5, 1.1, -2.5]},
    'monitor.ac': {part: 'monitor', position: [3.516, 2.3, -.985]},
    'fanFront.lead': {part: 'fanFront', position: [.48, 3.30, 1.60]},
    'board.fan1': {part: 'motherboard', position: [.67, 2.95, .54]},
    'fanRear.lead': {part: 'fanRear', position: [.48, 3.78, -1.63]},
    'board.fan2': {part: 'motherboard', position: [.67, 4.21, -.51]},
    'cooler.lead': {part: 'cooler', position: [.04, 4.10, -.73]},
    'board.cpuFan': {part: 'motherboard', position: [.67, 4.22, -.93]},
}
const cable = (id: CableId, a: PortId, b: PortId, requires: PartId[], via: V3[], color = '#343b3b'): CableDefinition => ({
    id,
    ends: [a, b],
    requires,
    route: [ports[a].position, ...via, ports[b].position],
    color, radius: id === 'atx' ? .032 : id === 'sataData' || id.endsWith('Fan') || id === 'frontFan' || id === 'rearFan' ? .014 : .02
})
export const cables: Record<CableId, CableDefinition> = {
    atx: cable('atx', 'psu.atx', 'board.atx', ['psu', 'motherboard'], [[0.4,1.5,0.12],[1,1.5,0.9],[1,3.25,0.9],[0.65,3.25,0.9]]),
    eps: cable('eps', 'psu.eps', 'board.eps', ['psu', 'motherboard'], [[0.15,1.55,0.12],[1,1.55,0.35],[1,4.54,0.35],[1,4.54,-1.55],[0.68,4.54,-1.55]]),
    pcie: cable('pcie', 'psu.pcie', 'gpu.power', ['psu', 'gpu'], [[-0.12,1.5,0.12],[-0.65,1.5,0.45],[-0.65,2.75,0.45],[-0.65,2.75,0.25],[-0.33,2.75,0.25]]),
    sataData: cable('sataData', 'board.sata', 'ssd.data', ['motherboard', 'ssd'], [[.65,2.12,1],[.47,2.12,1],[.47,2.07,.75]], '#b28a5f'),
    sataPower: cable('sataPower', 'psu.sata', 'ssd.power', ['psu', 'ssd'], [[-.35,1.5,.12],[-.55,1.5,.45],[-.55,2.09,.45],[-.55,2.09,.75],[.17,2.09,.75]]),
    display: cable('display', 'gpu.display', 'monitor.display', ['gpu', 'monitor'], [[0.05,2.4,-2.2],[0.05,1.13,-2.3],[3.4,1.13,-2.3],[3.409,2.3,-2.3]]),
    psuAC: cable('psuAC', 'wall.psu', 'psu.ac', ['psu'], [[-1.5,1.1,-2.75],[0.5,1.1,-2.75],[0.5,1.45,-2.75]]),
    monitorAC: cable('monitorAC', 'wall.monitor', 'monitor.ac', ['monitor'], [[2.5,1.1,-2.6],[3.112,1.1,-2.6],[3.112,2.3,-2.6]]),
    frontFan: cable('frontFan', 'fanFront.lead', 'board.fan1', ['fanFront', 'motherboard'], [[0.48,3.3,1.42],[0.68,3.3,1.42],[0.68,2.95,1.42],[0.68,2.95,0.69]]),
    rearFan: cable('rearFan', 'fanRear.lead', 'board.fan2', ['fanRear', 'motherboard'], [[0.48,3.78,-1.78],[0.48,4.54,-1.78],[0.67,4.54,-1.78],[0.67,4.54,-0.51]]),
    coolerFan: cable('coolerFan', 'cooler.lead', 'board.cpuFan', ['cooler', 'motherboard'], [[-0.12,4.1,-0.73],[-0.12,4.42,-0.73],[-0.12,4.42,-0.93],[0.67,4.42,-0.93]]),
}
export const assemblyOrder: PartId[] = ['motherboard', 'cpu', 'ram1', 'ram2', 'cooler', 'ssd', 'psu', 'gpu', 'fanFront', 'fanRear', 'monitor']
export const referenceId = 'core-matx-am4-ddr4-sata-1'

// Conservative world AABBs include visible contacts/fan depth, not just the PCB base.
const stagingSizes:Record<PartId,V3> = {"motherboard":[2.6,0.39,2.6],"cpu":[0.44,0.13,0.44],"cooler":[1.05,0.7,1.05],"ram1":[1.34,0.08,0.34],"ram2":[1.34,0.08,0.34],"gpu":[1.2,0.6,2.5],"ssd":[0.72,0.1,1.04],"psu":[1.54,1.6,.92],"fanFront":[1.12,0.2,1.12],"fanRear":[1.12,0.2,1.12],"monitor":[3.35,2.9,1.3]}
const stagingOffsets:Partial<Record<PartId,V3>> = {"motherboard":[0,0.16,0],"cpu":[0,0,0],"cooler":[0,0.3,0],"ram1":[0,0.02,0],"ram2":[0,0.02,0],"monitor":[0,-0.45,0]}
export const stagedVolumes = partIds.map(id=>({id,center:parts[id].tray.map((v,i)=>v+(stagingOffsets[id]?.[i]??0)) as V3,size:stagingSizes[id]}))
export const mat = {center:[-4.7,1.025,.45] as V3,size:[6.2,.012,6.35] as V3}
export const casePanels={front:{z:1.88,holes:[[0,3.67,1.23,1.22],[0,4.73,1.55,.48]]},rear:{z:-1.93,holes:[[0,1.52,1.65,.84],[0,4.2,1.14,1.2],[.78,3.5,.36,1.78],[.14,2.35,1.38,.50]]}}
const panelSolids=Object.entries(casePanels).flatMap(([name,p])=>{
 const xs=[...new Set([-1.06,1.06,...p.holes.flatMap(([x,,w])=>[x-w/2,x+w/2])])].sort((a,b)=>a-b),ys=[...new Set([1.07,5.13,...p.holes.flatMap(([,y,,h])=>[y-h/2,y+h/2])])].sort((a,b)=>a-b)
 return xs.slice(1).flatMap((right,i)=>ys.slice(1).flatMap((top,j)=>{const x=(right+xs[i])/2,y=(top+ys[j])/2;if(p.holes.some(([cx,cy,w,h])=>Math.abs(x-cx)<w/2&&Math.abs(y-cy)<h/2))return [];return [{id:`case-${name}`,center:[x,y,p.z+.0175] as V3,size:[right-xs[i],top-ys[j],.035] as V3}]}))
})
export const cableObstacles = [
 {id:'board',center:boardOrigin,size:[.055,2.44,2.44]},
 {id:'tray',center:[.92,3.1,-.58],size:[.04,2.65,2.65]},
 {id:'gpu',center:[.18,2.335,-.6],size:[1.18,.59,2.45]},
 {id:'cooler',center:[.35,3.65,-1.05],size:[.66,1.02,1.02]},
 {id:'ram1',center:[.56,3.55,.19],size:[.31,1.33,.035]},
 {id:'ram2',center:[.56,3.55,.43],size:[.31,1.33,.035]},
 {id:'case-right',center:[1.09,3.1,0],size:[.06,4.1,3.8]},
 {id:'case-top',center:[0,5.18,0],size:[2.24,.09,3.89]},
 {id:'case-bottom',center:[0,1.02,0],size:[2.24,.09,3.89]},
 {id:'shroud-left',center:[-.93,1.94,0],size:[.30,.07,3.65]},
 {id:'shroud-middle',center:[.30,1.94,0],size:[.84,.07,3.65]},
 {id:'shroud-right',center:[1.06,1.94,0],size:[.04,.07,3.65]},
 {id:'shroud-negative-back',center:[-.45,1.94,-.8375],size:[.66,.07,1.975]},
 {id:'shroud-negative-front',center:[-.45,1.94,1.4375],size:[.66,.07,.775]},
 {id:'shroud-positive-middle',center:[.88,1.94,-.475],size:[.32,.07,1.35]},
 ...panelSolids,
 ...[-1,1].flatMap(x=>[-1,1].map(z=>({id:'case-post',center:[x*1.1,3.1,z*1.9] as V3,size:[.09,4.2,.09] as V3}))),
] satisfies {id:string;center:V3;size:V3}[]
