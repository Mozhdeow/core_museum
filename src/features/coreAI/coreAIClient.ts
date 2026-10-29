import {CoreAIError,type CoreAIConfig,type CoreAIProvider,type CoreAIRequest,type CoreAIResponse} from './coreAIContracts.ts'
import {MockCoreAIProvider} from './MockCoreAIProvider.ts'
import {OpenCodeCoreAIProvider} from './OpenCodeCoreAIProvider.ts'
export function createCoreAIClient(config:CoreAIConfig,provider:CoreAIProvider=new MockCoreAIProvider()){
 return {async ask(request:CoreAIRequest,options:{signal?:AbortSignal}={}):Promise<CoreAIResponse>{
  if(config.provider==='disabled')throw new CoreAIError('disabled')
  if(!['mock','opencode'].includes(config.provider)||provider.id!==config.provider)throw new CoreAIError('unconfigured')
  if(options.signal?.aborted)throw new CoreAIError('aborted')
  const controller=new AbortController()
  let timeout:ReturnType<typeof setTimeout>|undefined,abort=()=>{}
  const stopped=new Promise<never>((_,reject)=>{abort=()=>{controller.abort();reject(new CoreAIError('aborted'))};options.signal?.addEventListener('abort',abort,{once:true});timeout=setTimeout(()=>{controller.abort();reject(new CoreAIError('timeout'))},config.timeoutMs??4000)})
  try{return await Promise.race([provider.ask(request,{signal:controller.signal}),stopped])}
  catch(error){throw error instanceof CoreAIError?error:new CoreAIError('failed')}
  finally{if(timeout)clearTimeout(timeout);options.signal?.removeEventListener('abort',abort)}
 }}
}
export const offlineCoreAIClient=createCoreAIClient({provider:'mock',timeoutMs:4000})
export function createAutoCoreAIClient(remote:OpenCodeCoreAIProvider){
 const live=createCoreAIClient({provider:'opencode',timeoutMs:25000},remote)
 async function status(options:{signal?:AbortSignal}={}){
  const controller=new AbortController(),abort=()=>controller.abort();let expired=false
  const timer=setTimeout(()=>{expired=true;abort()},8000)
  const stopped=new Promise<never>((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(new CoreAIError(expired?'timeout':'aborted')),{once:true})})
  options.signal?.addEventListener('abort',abort,{once:true})
  if(options.signal?.aborted)abort()
  try{return await Promise.race([remote.status({signal:controller.signal}),stopped])}
  catch(error){if(controller.signal.aborted)throw new CoreAIError(options.signal?.aborted?'aborted':'timeout');throw error}
  finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort)}
 }
 return {status,async ask(request:CoreAIRequest,options:{signal?:AbortSignal}={}){
  const capability=await status(options)
  return capability.provider==='mock'?offlineCoreAIClient.ask(request,options):live.ask(request,options)
 }}
}
export const coreAIConfig:CoreAIConfig={provider:'auto',timeoutMs:25000}
export const coreAIClient=createAutoCoreAIClient(new OpenCodeCoreAIProvider(async()=>{
 const {coreAIGateway}=await import('./coreAIGateway.ts');return coreAIGateway()
}))
