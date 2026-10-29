import type {MuseumQuality} from './museumQuality.ts'
export function pixelBudget(width:number,height:number,native:number,mobile:boolean,tier:MuseumQuality){
 const cap=mobile?1.5:Math.min(1.5,Math.max(1,native)),budget=tier==='low'?1_250_000:tier==='medium'?1_900_000:2_500_000
 const max=Math.min(cap,Math.sqrt(budget/Math.max(1,width*height)))
 return {max,min:mobile?Math.min(1.25,max):max*.7}
}
export type RenderDecision={tier:MuseumQuality;dpr:number;effects:number;reason:string}
/** Rolling windows ignore transitions, hidden time and individual stalls. No React/frame state. */
export function adaptiveMuseumResolution(){
 let warm=3,total=0,frames=0,slow=0,headroom=0,lastHall='',lastIntent=-1,cooldown=0
 const reset=()=>{total=frames=slow=headroom=0}
 return {sample(dt:number,input:RenderDecision&{auto:boolean;active:boolean;hall:string;intent:number;min:number;max:number}):RenderDecision|null{
  if(lastHall!==input.hall||lastIntent!==input.intent){lastHall=input.hall;lastIntent=input.intent;warm=Math.max(warm,2);reset()}
  if(!input.active||!input.auto){reset();warm=Math.max(warm,1);return null}
  if(dt<=0||dt>.05)return null
  if(warm>0){warm-=dt;return null}if(cooldown>0){cooldown-=dt;return null}
  total+=dt;frames++;if(total<1)return null
  const avg=total/frames;slow=avg>.0175?slow+total:0;headroom=avg<.0171?headroom+total:0;total=frames=0
  const next={tier:input.tier,dpr:input.dpr,effects:input.effects,reason:''}
  if(slow>=2){slow=headroom=0;cooldown=1
   if(input.dpr>input.min+.015){next.dpr=Math.max(input.min,input.dpr-.06);next.reason='Sustained cost: DPR first'}
   else if(input.effects<2){next.effects++;next.reason='Sustained cost: atmosphere budget'}
   else if(input.tier!=='low'){next.tier=input.tier==='high'?'medium':'low';next.reason='Sustained cost at DPR floor: tier'}else return null
   return next
  }
  if(headroom>=6){slow=headroom=0;cooldown=2
   if(input.tier!=='high'){next.tier=input.tier==='low'?'medium':'high';next.reason='Sustained headroom: tier recovery'}
   else if(input.effects>0){next.effects--;next.reason='Sustained headroom: effects recovery'}
   else if(input.dpr<input.max-.015){next.dpr=Math.min(input.max,input.dpr+.03);next.reason='Sustained headroom: DPR recovery'}else return null
   return next
  }return null
 }}
}
