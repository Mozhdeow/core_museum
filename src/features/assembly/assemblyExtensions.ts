import type {V3} from './assemblyDefinition.ts'

export const optionalPartIds = ['optical'] as const
export type OptionalPartId = typeof optionalPartIds[number]
export const optionalCableIds = ['frontPanel','frontUsb','frontUsbC','frontAudio','opticalData','opticalPower'] as const
export type OptionalCableId = typeof optionalCableIds[number]
export const peripheralIds = ['keyboard','mouse','flash','flashC','headphones','microphone','disc'] as const
export type PeripheralId = typeof peripheralIds[number]
export type Plug = 'usbA'|'usbC'|'headphones'|'microphone'|'disc'
export const devicePorts = {
 frontUsb1:{plug:'usbA',lead:'frontUsb',at:[-.48,5.26,1.42]},
 frontUsb2:{plug:'usbA',lead:'frontUsb',at:[-.18,5.26,1.42]},
 frontUsbC:{plug:'usbC',lead:'frontUsbC',at:[.10,5.26,1.42]},
 frontHeadphones:{plug:'headphones',lead:'frontAudio',at:[-.48,5.26,1.72]},
 frontMic:{plug:'microphone',lead:'frontAudio',at:[-.18,5.26,1.72]},
 rearUsb1:{plug:'usbA',at:[.78,3.2,-1.92]},
 rearUsb2:{plug:'usbA',at:[.78,3.48,-1.92]},
 rearLineOut:{plug:'headphones',at:[.78,2.84,-1.92]},
 rearLineIn:{plug:'lineIn',at:[.78,2.68,-1.92]},
 rearMic:{plug:'microphone',at:[.78,3,-1.92]},
 ethernet:{plug:'ethernet',at:[.78,3.8,-1.92]},
 opticalTray:{plug:'disc',at:[0,4.53,2.8]},
} satisfies Record<string,{plug:Plug|'lineIn'|'ethernet';lead?:OptionalCableId;at:V3}>
export type DevicePortId = keyof typeof devicePorts
export const peripherals:Record<PeripheralId,{plug:Plug;at:V3;size:V3}> = {
 keyboard:{plug:'usbA',at:[2.6,1.08,3.5],size:[2.1,.13,.72]},
 mouse:{plug:'usbA',at:[4.15,1.11,3.5],size:[.42,.19,.65]},
 flash:{plug:'usbA',at:[2.1,1.08,4.65],size:[.28,.12,.65]},
 flashC:{plug:'usbC',at:[2.75,1.08,4.65],size:[.26,.12,.55]},
 headphones:{plug:'headphones',at:[4,1.195,4.85],size:[1.05,.44,.88]},
 microphone:{plug:'microphone',at:[4.8,1.40,2.2],size:[.4,.82,.4]},
 disc:{plug:'disc',at:[1.25,1.05,4.8],size:[1.2,.035,1.2]},
}
export type OptionalBuild={optionalParts:OptionalPartId[];optionalConnected:OptionalCableId[];peripherals:Partial<Record<PeripheralId,DevicePortId>>;opticalOpen:boolean}
export const emptyOptional = ():OptionalBuild=>({optionalParts:[],optionalConnected:[],peripherals:{},opticalOpen:false})
export const opticalMount:V3=[0,4.72,1.04]
export const opticalStage:V3=[4.6,1.24,.9]
export const optionalPorts:Record<string,{part:OptionalPartId|null;at:V3}>={
 'front.panel':{part:null,at:[.65,5.08,1.72]},'board.panel':{part:null,at:[.66,2.3,.69]},
 'front.usb':{part:null,at:[.4,5.08,1.72]},'board.usb':{part:null,at:[.66,2.8,.69]},
 'front.usbC':{part:null,at:[.15,5.08,1.72]},'board.usbC':{part:null,at:[.66,3.1,.69]},
 'front.audio':{part:null,at:[-.1,5.08,1.72]},'board.audio':{part:null,at:[.66,2.05,.69]},
 'optical.data':{part:'optical',at:[-.25,4.72,.17]},'board.optical':{part:null,at:[.66,2.14,.69]},
 'psu.optical':{part:null,at:[-.55,1.5,-.3]},'optical.power':{part:'optical',at:[.25,4.72,.17]},
}
export type ConnectorKind='atx'|'eps'|'pcie'|'sataData'|'sataPower'|'fan'|'iec'|'display'|'header'|'usb'|'audio'
export type OptionalWire={ends:[string,string];route:V3[];requires:'motherboard'|'optical';radius:number;kind:ConnectorKind;color:string}
const frontRoute=(source:string,target:string):V3[]=>[optionalPorts[source].at,[1,5.08,1.72],[1,5.08,.97],[1,optionalPorts[target].at[1],.97],[.66,optionalPorts[target].at[1],.97],optionalPorts[target].at]
export const optionalCables:Record<OptionalCableId,OptionalWire>={
 frontPanel:{ends:['front.panel','board.panel'],route:frontRoute('front.panel','board.panel'),requires:'motherboard',radius:.015,kind:'header',color:'#b79a64'},
 frontUsb:{ends:['front.usb','board.usb'],route:frontRoute('front.usb','board.usb'),requires:'motherboard',radius:.022,kind:'usb',color:'#49696c'},
 frontUsbC:{ends:['front.usbC','board.usbC'],route:frontRoute('front.usbC','board.usbC'),requires:'motherboard',radius:.02,kind:'usb',color:'#49696c'},
 frontAudio:{ends:['front.audio','board.audio'],route:frontRoute('front.audio','board.audio'),requires:'motherboard',radius:.015,kind:'audio',color:'#877272'},
 opticalData:{ends:['board.optical','optical.data'],route:[optionalPorts['board.optical'].at,[.66,2.14,1.12],[-.86,2.14,1.12],[-.86,4.42,1.12],[-.86,4.42,.04],[-.25,4.42,.04],[-.25,4.72,.04],optionalPorts['optical.data'].at],requires:'optical',radius:.016,kind:'sataData',color:'#b28a5f'},
 opticalPower:{ends:['psu.optical','optical.power'],route:[optionalPorts['psu.optical'].at,[-.55,1.5,.45],[-.55,2.02,.45],[-.86,2.02,.85],[-.86,4.43,.85],[-.86,4.43,.03],[.25,4.43,.03],[.25,4.72,.03],optionalPorts['optical.power'].at],requires:'optical',radius:.02,kind:'sataPower',color:'#8e9386'},
}
