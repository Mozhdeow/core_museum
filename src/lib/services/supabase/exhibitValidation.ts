import type {MuseumItem,LocalizedText} from '../../../types/museum.ts'

export type ExhibitIssue={field:string;key:'required'|'tooLong'|'slug'|'integer'|'url'|'tooMany'|'taxonomyMissing'|'taxonomyInactive'}
export class ExhibitValidationError extends Error {
    issues:ExhibitIssue[]
    code='CMS_VALIDATION'
    constructor(issues:ExhibitIssue[]){super('Exhibit validation failed');this.issues=issues}
}
export function normalizeExhibit(value:MuseumItem):MuseumItem {
    const issues:ExhibitIssue[]=[]
    const text=(field:string,input:string|undefined,limit:number,required=false)=>{
        const result=(input ?? '').trim()
        if(required && !result)issues.push({field,key:'required'})
        if(result.length>limit)issues.push({field,key:'tooLong'})
        return result
    }
    const localized=(field:string,input:LocalizedText,limit:number,required=false)=>({en:text(`${field}.en`,input.en,limit,required),fa:text(`${field}.fa`,input.fa,limit,required)})
    const slug=text('slug',value.slug,200,true)
    if(slug && /[\s/?#\\]/u.test(slug))issues.push({field:'slug',key:'slug'})
    if(!Number.isInteger(value.releaseYear)||value.releaseYear<0||value.releaseYear>9999)issues.push({field:'releaseYear',key:'integer'})
    if(!Number.isInteger(value.sortOrder)||value.sortOrder< -2147483648||value.sortOrder>2147483647)issues.push({field:'sortOrder',key:'integer'})
    const sourceUrl=text('sourceUrl',value.sourceUrl,2048)
    if(sourceUrl){try{const url=new URL(sourceUrl);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error()}catch{issues.push({field:'sourceUrl',key:'url'})}}
    if(value.specifications.length>100)issues.push({field:'specifications',key:'tooMany'})
    if(value.galleryImages.length>100)issues.push({field:'galleryImages',key:'tooMany'})
    const result={...value,slug,title:localized('title',value.title,300,true),brand:text('brand',value.brand,200),
        shortDescription:localized('shortDescription',value.shortDescription,1000),description:localized('description',value.description,30000),
        sourceUrl,sourcePlatform:text('sourcePlatform',value.sourcePlatform,200),creator:text('creator',value.creator,300),license:text('license',value.license,200),
        attributionText:text('attributionText',value.attributionText,2000,value.attributionRequired),
        specifications:value.specifications.map((spec,index)=>({label:localized(`specifications.${index}.label`,spec.label,200,true),value:text(`specifications.${index}.value`,spec.value,2000,true)})),
        galleryImages:value.galleryImages.map((image,index)=>({...image,caption:localized(`galleryImages.${index}.caption`,image.caption,1000)}))}
    if(issues.length)throw new ExhibitValidationError(issues)
    return result
}

export function moveEntry<T>(entries:T[],index:number,direction:number):T[]{
    const next=index+direction
    if(index<0||index>=entries.length||next<0||next>=entries.length)return entries
    const moved=[...entries];[moved[index],moved[next]]=[moved[next],moved[index]];return moved
}
