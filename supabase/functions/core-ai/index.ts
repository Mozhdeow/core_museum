import {createClient} from '@supabase/supabase-js'
import {createCoreAIHandler,type CoreAIBackend} from './handler.ts'
import {CoreAIError} from '../../../src/features/coreAI/coreAIContracts.ts'

const runtime=(globalThis as typeof globalThis&{Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Promise<Response>):void}}).Deno
const env=(name:string)=>runtime.env.get(name)??''
const url=env('SUPABASE_URL'),key=env('SUPABASE_ANON_KEY')
if(!url||!key)throw new Error('Missing server configuration')
// Every read uses the caller's JWT and existing RLS; no service-role client is needed.
function client(token:string,signal:AbortSignal){return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:`Bearer ${token}`},fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.any([signal,...(init?.signal?[init.signal]:[])])})}})}
const backend:CoreAIBackend={
 async authenticate(token,signal){
  const db=client(token,signal),{data,error}=await db.auth.getUser(token)
  if(error){if(error.status&&[400,401,403].includes(error.status))return null;throw new CoreAIError('providerUnavailable')}
  if(!data.user||data.user.is_anonymous)return null
  const access=await db.rpc('core_current_role')
  if(access.error)throw new CoreAIError('providerUnavailable')
  if(!['user','editor','admin'].includes(access.data))throw new CoreAIError('forbidden')
  return {id:data.user.id}
 },
 async exhibit(id,locale,token,signal){
  const db=client(token,signal)
  const item=await db.from('museum_items').select('title_en,title_fa,description_en,description_fa,short_description_en,short_description_fa,category_id').eq('id',id).eq('status','published').eq('enable_ai_curator',true).maybeSingle()
  if(item.error)throw new CoreAIError('providerUnavailable')
  if(!item.data)return null
  const row=item.data
  const specs=await db.from('museum_item_specs').select('label_en,label_fa,value').eq('item_id',id).order('sort_order').limit(12)
  if(specs.error)throw new CoreAIError('providerUnavailable')
  return {title:row[`title_${locale}`],description:row[`description_${locale}`]||row[`short_description_${locale}`]||'',category:row.category_id??'',specifications:(specs.data??[]).map(s=>({label:s[`label_${locale}`],value:s.value}))}
 }
}
runtime.serve(createCoreAIHandler(backend,{apiKey:env('OPENCODE_API_KEY'),model:env('OPENCODE_MODEL'),apiURL:env('OPENCODE_API_URL'),origins:(env('CORE_AI_ALLOWED_ORIGINS')||'http://127.0.0.1:5191,http://localhost:5191').split(',').map(s=>s.trim()).filter(Boolean)}))
