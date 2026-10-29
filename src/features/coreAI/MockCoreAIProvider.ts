import {CoreAIError,type CoreAIProvider,type CoreAIRequest,type CoreAIResponse} from './coreAIContracts.ts'
import {contextFindings,validAIContext} from './coreAIContext.ts'
import {knowledge,normalizeQuestion,questionTopic,safety,unknown,type HardwareTopic} from './hardwareKnowledge.ts'
import {parts,partIds,cables,type PartId} from '../assembly/assemblyDefinition.ts'
import {scenarios,scenarioIds,type ScenarioId} from '../assembly/troubleshooting.ts'
import type {Locale} from '../../types/museum.ts'

const names:Record<string,[string,string]>={motherboard:['Motherboard','مادربرد'],cpu:['CPU','پردازنده'],cooler:['CPU cooler','خنک‌کنندهٔ پردازنده'],ram1:['DDR4 module 1','ماژول اول DDR4'],ram2:['DDR4 module 2','ماژول دوم DDR4'],gpu:['Graphics card','کارت گرافیک'],ssd:['SATA SSD','SSD ساتا'],psu:['Power supply','منبع تغذیه'],fanFront:['Front intake fan','فن ورودی جلو'],fanRear:['Rear exhaust fan','فن خروجی پشت'],monitor:['Monitor','مانیتور'],atx:['ATX board power','برق ATX مادربرد'],eps:['EPS CPU power','برق EPS پردازنده'],pcie:['PCIe GPU power','برق PCIe گرافیک'],sataData:['SATA data','دادهٔ ساتا'],sataPower:['SATA power','برق ساتا'],display:['Display lead','کابل تصویر'],psuAC:['PSU mains lead','کابل برق منبع تغذیه'],monitorAC:['Monitor mains lead','کابل برق مانیتور'],frontFan:['Front fan lead','کابل فن جلو'],rearFan:['Rear fan lead','کابل فن پشت'],coolerFan:['CPU_FAN lead','کابل CPU_FAN']}
export const componentName=(id:string,locale:Locale)=>names[id]?.[locale==='fa'?1:0]??id
function partTopic(id:string):HardwareTopic{return ({ram1:'memory',ram2:'memory',ssd:'storage',fanFront:'fan',fanRear:'fan'} as Record<string,HardwareTopic>)[id]??(partIds.includes(id as PartId)?id as HardwareTopic:'cables')}
function symptomScenario(q:string):ScenarioId|null{
 if(/overheat|hot|داغ|حرارت/.test(q))return 'cooling'
 if(/no power|won.t power|روشن نمی|برق ندارد/.test(q))return 'noPower'
 if(/no image|no signal|black screen|تصویر ندارد|تصویر ندار|بدون سیگنال/.test(q))return 'noImage'
 if(/not detected|شناسایی نمی/.test(q))return /ram|memory|رم|حافظه/.test(q)?'memory':/ssd|storage|ذخیره|دیسک/.test(q)?'storage':null
 if(/post|startup|بوت|راه اندازی/.test(q))return 'post'
 return null
}
export class MockCoreAIProvider implements CoreAIProvider{
 readonly id='mock'
 async ask(request:CoreAIRequest,{signal}:{signal:AbortSignal}):Promise<CoreAIResponse>{
  if(signal.aborted)throw new CoreAIError('aborted')
  const {locale:l,context:c}=request,q=normalizeQuestion(request.question.slice(0,1000)),fa=l==='fa'
  if(!validAIContext(c))throw new CoreAIError('invalidContext')
  const reply=(answer:string,certainty:CoreAIResponse['certainty']='curated',topics:string[]=[]):CoreAIResponse=>({answer,provider:'mock',offline:true,certainty,topics})
  const general=/explain|what|how|why|help|next|install|connect|repair|check|diagnos|symptom|spec|selected|component|step|target|depend|توضیح|چیست|چیه|چطور|چگونه|چرا|کمک|بعدی|نصب|اتصال|تعمیر|بررسی|عیب|مشکل|نشانه|مشخصات|قطعه|مرحله|بگو/.test(q),topic=questionTopic(q),symptom=symptomScenario(q)
  if(!q)return reply(fa?'کدام قطعه یا نشانه را می‌خواهید بررسی کنیم؟':'Which component or symptom would you like to examine?','clarification')
  if(/weather|poem|stock|football|compare|price|benchmark|قیمت|مقایسه|هواشناسی|شعر|بورس|فوتبال|ignore.*instruction|دستور.*نادیده/.test(q)||!general&&!topic&&!symptom)return reply(unknown[l],'unsupported')
  if(c.kind==='museum'){
   const e=c.exhibit;if(!e)return reply(fa?'یک اثر منتشرشده را از مجموعه انتخاب کنید؛ اطلاعات تأییدشده‌ای برای این انتخاب ندارم.':'Select a published catalog exhibit; no verified exhibit context is available.','clarification')
   const specs=e.specifications.map(s=>`${s.label[l]}: ${s.value}`).join('\n')
   return reply([e.title[l],e.description[l]||(fa?'توضیحی در مجموعه ثبت نشده است.':'No description is recorded in the catalog.'),/spec|technical|مشخصات|فنی/.test(q)?specs:'',fa?'این پاسخ از داده‌های ثبت‌شدهٔ همین اثر است؛ مشخصات یا سازگاری اضافه‌ای تأیید نمی‌کنم.':'This answer uses only this exhibit’s recorded data; no additional specifications or compatibility are verified.'].filter(Boolean).join('\n\n'),'catalog',[e.id])
  }
  const findings=contextFindings(c)
  if(c.kind==='troubleshooting'||symptom){
   const activeScenario=c.kind==='troubleshooting'?c.scenario:null,id=activeScenario??symptom
   if(!id)return reply((fa?'آیا سیستم اصلاً روشن نمی‌شود، یا فن‌ها روشن‌اند و تصویر ندارید؟ یک سناریو و نشانه را مشخص کنید.':'Does the system have no power, or do fans run without an image? Choose a scenario and describe the symptom.')+'\n\n'+safety[l],'clarification')
   if(!scenarioIds.includes(id))throw new CoreAIError('invalidContext')
   const s=scenarios[id],observed=findings.map(f=>componentName(f.part??f.cable??'',l)).join('، ')
   return reply([s.title[l],activeScenario?s.symptom[l]:(fa?'این یک احتمال آموزشی است، نه تشخیص قطعی دستگاه واقعی.':'This is an educational possibility, not a definitive diagnosis of real hardware.'),s.question[l],s.hint[l],activeScenario?(findings.length?(fa?'بررسی فعلی شبیه‌ساز موارد ناقص را گزارش می‌کند: ':'The current validator reports incomplete paths: ')+observed:(fa?'بررسی نصب و اتصال کامل است. برای تأیید، آزمون روشن‌شدن را دوباره اجرا کنید.':'Mount and connection checks pass. Run the power-on test again to confirm startup.')):'',/repair|why|cause|تعمیر|چرا|علت|رفع/.test(q)?s.explanation[l]:'',safety[l]].filter(Boolean).join('\n\n'),'curated',[id])
  }
  const id=/next|step|بعدی|مرحله/.test(q)?c.next??c.selected:c.selected??c.next
  if(!id&&!topic)return reply(fa?'یک قطعه یا کابل را انتخاب کنید تا محل نصب و وابستگی‌ها را توضیح بدهم.':'Select a part or cable so I can explain its target and dependencies.','clarification')
  if(topic&&(!id||topic!==partTopic(id)))return reply(knowledge(topic,l)+'\n\n'+safety[l],'curated',[topic])
  if(!id)return reply(unknown[l],'unsupported')
  const isPart=partIds.includes(id as PartId),spec=isPart?parts[id as PartId]:cables[id as keyof typeof cables]
  if(!spec)throw new CoreAIError('invalidContext')
  const dependencies=spec.requires.map(dep=>componentName(dep,l)).join('، ')||(fa?'بدون پیش‌نیاز نصب':'No installation prerequisite')
  const location=isPart?(c.build.installed[id as PartId]??(id===c.selected?c.target:null)??parts[id as PartId].targets.find(slot=>!Object.values(c.build.installed).includes(slot))??parts[id as PartId].slot):cables[id as keyof typeof cables].ends.join(' ↔ ')
  return reply([componentName(id,l),knowledge(partTopic(id),l),(fa?'محل یا دو سر مرجع: ':'Reference target / endpoints: ')+location,(fa?'وابستگی‌ها: ':'Dependencies: ')+dependencies,findings.length?(fa?'بررسی مرجع هنوز کامل نیست؛ مراحل باقی‌مانده را در راهنمای مونتاژ ببینید.':'Reference checks are incomplete; use the assembly guide for the remaining steps.'):(fa?'نصب و اتصال‌های مرجع کامل‌اند. آزمون روشن‌شدن را اجرا کنید.':'Reference mounts and connections are complete. Run the power-on test.'),safety[l]].join('\n\n'),'curated',[partTopic(id)])
 }
}
