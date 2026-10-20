import type {LocalizedText} from '@/types/museum'

export type CPUComponent = 'spreader' | 'interface' | 'die' | 'substrate' | 'contacts'
export type CPUHotspotId = CPUComponent | 'heat'
export type CPULesson = 'inside' | 'heat'
export type CPUHotspot = {id: CPUHotspotId; component: CPUComponent; title: LocalizedText; explanation: LocalizedText}
/** Local educational configuration, independent of exhibit UUIDs and future CMS persistence. */
export const cpuHotspots: CPUHotspot[] = [
 {id:'spreader',component:'spreader',title:{en:'Heat spreader',fa:'پخش‌کننده گرما'},explanation:{en:'The integrated heat spreader is the metal lid above the die. It spreads heat and provides a contact surface for the cooler, which is not shown here.',fa:'پخش‌کننده یکپارچه گرما، درپوش فلزی بالای دای است. گرما را پخش می‌کند و سطح تماس خنک‌کننده را فراهم می‌کند؛ خنک‌کننده در این طرح نمایش داده نشده است.'}},
 {id:'interface',component:'interface',title:{en:'Thermal interface',fa:'رابط حرارتی'},explanation:{en:'A thin thermal interface connects the die to the lid. Depending on the package, this may be solder or another thermal material. Its thickness is exaggerated here for clarity.',fa:'رابط حرارتی نازک، دای را به درپوش متصل می‌کند. بسته به نوع پکیج، این رابط می‌تواند لحیم یا ماده حرارتی دیگری باشد. ضخامت آن در این طرح برای وضوح بیشتر بزرگ‌نمایی شده است.'}},
 {id:'die',component:'die',title:{en:'Silicon die',fa:'دای سیلیکونی'},explanation:{en:'The silicon die contains the processor circuitry. Its transistors switch electrical signals to perform computation, and electrical power also becomes heat.',fa:'دای سیلیکونی مدارهای پردازنده را در خود دارد. ترانزیستورهای آن با تغییر سیگنال‌های الکتریکی محاسبات را انجام می‌دهند و بخشی از توان الکتریکی به گرما تبدیل می‌شود.'}},
 {id:'substrate',component:'substrate',title:{en:'Package substrate',fa:'زیرلایه پکیج'},explanation:{en:'The substrate supports the die and routes electrical connections between the silicon and the package contacts. This simplified example shows one die; real packages vary.',fa:'زیرلایه از دای پشتیبانی می‌کند و اتصالات الکتریکی را میان سیلیکون و پایه‌های پکیج هدایت می‌کند. این نمونه ساده یک دای دارد؛ پکیج‌های واقعی متفاوت‌اند.'}},
 {id:'contacts',component:'contacts',title:{en:'Electrical pins',fa:'پایه‌های الکتریکی'},explanation:{en:'This schematic uses a pin-style package to show electrical connections. Many modern desktop processors use flat contact lands instead; the layout here is illustrative.',fa:'این طرح برای نمایش اتصال الکتریکی از پکیج دارای پایه استفاده می‌کند. بسیاری از پردازنده‌های رومیزی جدید به‌جای پایه، پدهای تخت دارند؛ آرایش اینجا صرفاً نمایشی است.'}},
 {id:'heat',component:'die',title:{en:'Heat transfer',fa:'انتقال گرما'},explanation:{en:'Follow the orange bands from the die through the thermal interface to the heat spreader. They illustrate a heat path, not measured temperature, speed or a thermal simulation.',fa:'نوارهای نارنجی را از دای، از میان رابط حرارتی، تا پخش‌کننده گرما دنبال کنید. این نمایش یک مسیر گرماست، نه دما یا سرعت اندازه‌گیری‌شده و نه شبیه‌سازی حرارتی.'}},
]
export const lessonDuration: Record<CPULesson,number> = {inside:10,heat:8}
/** Vertical separation in schematic units, never engineering dimensions. Ordered to avoid overlap. */
export function cpuLayerHeight(component: CPUComponent, explosion: number) {
 const e=Math.max(0,Math.min(1,explosion))
 return {contacts:-.26-e*.22,substrate:-.12,die:.09+e*.55,interface:.185+e*1.03,spreader:.335+e*1.6}[component]
}
export function lessonHotspot(lesson:CPULesson,time:number):CPUHotspotId {
 return lesson==='heat'?'heat':time<2?'spreader':time<4?'interface':time<6?'die':time<8?'substrate':'contacts'
}
// Introductory source references (not specifications for this schematic package).
export const cpuLearningSources = [
 'https://www.intel.com/content/www/us/en/support/articles/000037164/processors/intel-core-processors.html',
 'https://www.intel.com/content/www/us/en/support/articles/000005670/processors.html',
]
