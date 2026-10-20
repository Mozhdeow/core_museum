import type {MuseumItem,Locale} from '../../types/museum.ts'
type Context=Pick<MuseumItem,'id'|'title'|'description'|'shortDescription'|'specifications'|'brand'|'releaseYear'|'status'>
/** A metadata reader, not inference. Never invent facts or answer from another exhibit. */
export function curatorDemo(id:string,locale:Locale,mode:string,question:string,context?:Context){
 const limitation=locale==='fa'?'این راهنمای نمایشی فقط اطلاعات ثبت‌شدهٔ همین اثر را بازگو می‌کند و نمی‌تواند به پرسش‌های آزاد یا مقایسهٔ تأییدنشده پاسخ دهد.':'This demonstration can only summarize this exhibit’s recorded metadata. It cannot answer open questions or make unverified comparisons.'
 if(!context||context.id!==id||context.status!=='published'||mode==='compare'||!question.trim())return limitation
 const title=context.title[locale],description=(mode==='technical'?context.description[locale]:context.shortDescription[locale])||context.description[locale]||context.shortDescription[locale]
 const specs=mode==='technical'?context.specifications.slice(0,8).map(s=>`${s.label[locale]}: ${s.value}`).join('\n'):''
 return [title,description,specs,limitation].filter(Boolean).join('\n\n')
}
