import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'
import {createContentQueries,defaultExhibitQuery,exhibitSearchFilter} from '../src/lib/services/supabase/contentQueries.ts'
import {normalizeExhibit,ExhibitValidationError,moveEntry} from '../src/lib/services/supabase/exhibitValidation.ts'
import type {MuseumItem} from '../src/types/museum.ts'
import type {Database} from '../src/types/database.types.ts'

const ID='22222222-2222-4222-8222-222222222222'
const item:MuseumItem={id:ID,slug:' cpu ',title:{en:' CPU ',fa:' پردازنده '},brand:' CORE ',category:'',museumSection:'',releaseYear:1971,status:'draft',sortOrder:0,featured:false,shortDescription:{en:'',fa:''},description:{en:'',fa:''},specifications:[],galleryImages:[],thumbnail:'',model3DUrl:null}
function queries(respond:(url:URL,headers:Headers)=>Response|Promise<Response>){
    const seen:URL[]=[]
    const client=createClient<Database>('https://isolated.invalid','fixture-anon-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(input,init)=>{const url=new URL(String(input));seen.push(url);return respond(url,new Headers(init?.headers))}}})
    return {api:createContentQueries(()=>client),seen}
}
const json=(data:unknown,count?:number)=>new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json',...(count!==undefined?{'content-range':`0-0/${count}`}:{})}})
test('CMS normalization clones bilingual data and preserves UUID, version, gallery IDs and order',()=>{
    const input={...item,updatedAt:'version',specifications:[{label:{en:' Clock ',fa:' فرکانس '},value:' 1MHz '}],galleryImages:[{id:'gallery',url:'',storagePath:'retained',caption:{en:' Board ',fa:' برد '}}]}
    const result=normalizeExhibit(input)
    assert.equal(result.slug,'cpu');assert.equal(result.title.fa,'پردازنده');assert.equal(result.updatedAt,'version')
    assert.equal(result.galleryImages[0].storagePath,'retained');assert.equal(result.galleryImages[0].caption.fa,'برد')
    assert.equal(input.specifications[0].value,' 1MHz ')
})
test('CMS validation aggregates metadata errors, including both specification languages',()=>{
    assert.throws(()=>normalizeExhibit({...item,slug:'bad/slug',title:{en:'',fa:' '},releaseYear:1.5,sortOrder:Infinity,sourceUrl:'javascript:alert(1)',attributionRequired:true,specifications:[{label:{en:'',fa:''},value:''}]}),error=>{
        assert.ok(error instanceof ExhibitValidationError)
        for(const field of ['slug','title.en','title.fa','releaseYear','sortOrder','sourceUrl','attributionText','specifications.0.label.en','specifications.0.label.fa','specifications.0.value'])assert.ok(error.issues.some(issue=>issue.field===field),field)
        return true
    })
})
test('CMS validates text limits and URLs with credentials, while allowing blank optional metadata',()=>{
    for(const patch of [{brand:'a'.repeat(201)},{sourceUrl:'https://user:password@example.test/'},{galleryImages:[{id:'g',url:'',caption:{en:'a'.repeat(1001),fa:''}}]},{specifications:Array.from({length:101},()=>({label:{en:'Clock',fa:'فرکانس'},value:'1MHz'}))}])assert.throws(()=>normalizeExhibit({...item,...patch}),ExhibitValidationError)
    assert.equal(normalizeExhibit({...item,sourceUrl:''}).sourceUrl,'')
})
test('CMS reordering preserves entries and leaves boundaries unchanged',()=>{
    const values=[{id:'a'},{id:'b'},{id:'c'}]
    assert.deepEqual(moveEntry(values,2,-1).map(v=>v.id),['a','c','b']);assert.deepEqual(values.map(v=>v.id),['a','b','c'])
    assert.equal(moveEntry(values,0,-1),values);assert.equal(moveEntry(values,2,1),values)
})
test('CMS actual SDK sends stable pagination, exact counts and UUID/status/null filters',async()=>{
    const {api,seen}=queries((_url,headers)=>{assert.equal(headers.get('prefer'),'count=exact');return json(Array.from({length:10},()=>({id:ID})),26)})
    const page=await api.page({...defaultExhibitQuery,page:2,perPage:10,status:'draft',categoryId:ID,sectionId:'none'})
    assert.equal(page.total,26);assert.equal(page.page,2);assert.equal(page.rows[0].id,ID)
    const params=seen[0].searchParams
    assert.equal(params.get('offset'),'10');assert.equal(params.get('limit'),'10');assert.equal(params.get('order'),'sort_order.asc,id.asc')
    assert.equal(params.get('status'),'eq.draft');assert.equal(params.get('category_id'),`eq.${ID}`);assert.equal(params.get('section_id'),'is.null')
})
test('CMS literal bilingual search quotes PostgREST grammar and regex metacharacters',async()=>{
    const search='پردازنده %_*.,"\\(gpu)|status.eq.published'
    const filter=exhibitSearchFilter(search)
    const {api,seen}=queries(()=>json([],0))
    await api.page({...defaultExhibitQuery,search})
    assert.equal(seen[0].searchParams.get('or'),`(${filter})`)
    for(const column of ['title_en','title_fa','slug','brand'])assert.ok(filter.includes(`${column}.imatch.`))
    const literal=JSON.parse(filter.slice(filter.indexOf('.imatch.')+8,filter.indexOf(',title_fa.imatch.')))
    assert.equal(new RegExp(literal,'iu').test(search),true)
    assert.equal(new RegExp(literal,'iu').test('other status published'),false)
})
test('CMS rejects malformed query parameters before any request',async()=>{
    const {api,seen}=queries(()=>json([],0))
    for(const patch of [{page:0},{page:1.2},{perPage:1000},{status:'admin'},{categoryId:'id),status.eq.published'},{search:'bad\u0000value'},{search:'a'.repeat(201)}])await assert.rejects(api.page({...defaultExhibitQuery,...patch} as typeof defaultExhibitQuery))
    assert.equal(seen.length,0)
})
test('CMS list failures and missing count never masquerade as empty success',async()=>{
    const {api}=queries(()=>new Response(JSON.stringify({message:'Denied',code:'42501'}),{status:403,headers:{'content-type':'application/json'}}))
    await assert.rejects(api.page(defaultExhibitQuery),{code:'42501'})
    await assert.rejects(queries(()=>json([])).api.page(defaultExhibitQuery),/count unavailable/)
})
test('CMS a server row cap below the requested page size fails instead of silently skipping exhibits',async()=>{
    const {api}=queries(()=>json([{id:ID}],100))
    await assert.rejects(api.page(defaultExhibitQuery),/Incomplete exhibit page/)
})
test('CMS taxonomy traverses server-capped ranges and preserves inactive IDs and bilingual names',async()=>{
    const rows=Array.from({length:1002},(_,index)=>({id:`id-${index}`,slug:`slug-${index}`,name_en:`Category ${index}`,name_fa:`دسته ${index}`,sort_order:index,active:index%2===0}))
    const {api,seen}=queries(url=>{const from=Number(url.searchParams.get('offset'));return json(rows.slice(from,from+200),rows.length)})
    const result=await api.taxonomy('categories')
    assert.deepEqual(result,rows);assert.equal(seen.length,6)
    assert.equal(seen[0].searchParams.has('active'),false);assert.equal(seen[1].searchParams.get('offset'),'200')
})
test('CMS child hydration pages beyond the REST row cap with parent UUID filters',async()=>{
    const {api,seen}=queries(url=>{const from=Number(url.searchParams.get('offset'));return json(Array.from({length:Math.min(500,1200-from)},(_,index)=>({id:String(from+index),item_id:ID})),1200)})
    const rows=await api.children('museum_item_specs',[ID])
    assert.equal(rows.length,1200);assert.equal(seen.length,3);assert.equal(seen[0].searchParams.get('item_id'),`in.(${ID})`)
})
test('CMS incomplete paginated responses fail explicitly instead of silently truncating taxonomy',async()=>{
    const {api}=queries(()=>json([],100))
    await assert.rejects(api.taxonomy('museum_sections'),/Incomplete content response/)
})
