import {CoreAIError,type CoreAIErrorCode,type CoreAIProvider,type CoreAIRequest,type CoreAIResponse,type CoreAIStatus} from './coreAIContracts.ts'

export type CoreAIGateway=()=>Promise<{url:string;apikey:string;token:string}>
const errorCodes:CoreAIErrorCode[]=['authenticationRequired','forbidden','rateLimited','providerUnavailable','invalidProviderKey','invalidRequest','invalidContext','timeout','aborted','unconfigured']
/** No provider secret or direct inference endpoint belongs to this browser transport. */
export class OpenCodeCoreAIProvider implements CoreAIProvider{
 readonly id='opencode'
 private gateway:CoreAIGateway
 private fetcher:typeof fetch
 constructor(gateway:CoreAIGateway,fetcher:typeof fetch=fetch){this.gateway=gateway;this.fetcher=fetcher}
 private async call(body:unknown,signal:AbortSignal):Promise<Record<string,unknown>>{
  try{
   const gateway=await this.gateway()
   if(signal.aborted)throw new CoreAIError('aborted')
   if(!gateway.token)throw new CoreAIError('authenticationRequired')
   const response=await this.fetcher(gateway.url,{method:'POST',signal,headers:{'Content-Type':'application/json',apikey:gateway.apikey,Authorization:`Bearer ${gateway.token}`},body:JSON.stringify(body)})
   let envelope:Record<string,unknown>
   try{envelope=await response.json()}catch{throw new CoreAIError(response.status===401?'authenticationRequired':'providerUnavailable')}
   if(!response.ok||envelope.ok!==true){
    const code=errorCodes.includes(envelope.error as CoreAIErrorCode)?envelope.error as CoreAIErrorCode:response.status===401?'authenticationRequired':response.status===403?'forbidden':response.status===429?'rateLimited':'providerUnavailable'
    throw new CoreAIError(code)
   }
   return envelope
  }catch(error){if(signal.aborted)throw new CoreAIError('aborted');throw error instanceof CoreAIError?error:new CoreAIError('providerUnavailable')}
 }
 async status(options:{signal:AbortSignal}):Promise<CoreAIStatus>{
  const {data}=await this.call({action:'status'},options.signal)
  const s=data as CoreAIStatus|null
  if(!s||!['mock','opencode'].includes(s.provider)||s.configured!==(s.provider==='opencode')||s.authenticatedOnly!==true||s.inferenceVerified!==false||s.provider==='opencode'&&typeof s.model!=='string')throw new CoreAIError('providerUnavailable')
  return s
 }
 async ask(request:CoreAIRequest,options:{signal:AbortSignal}):Promise<CoreAIResponse>{
  const c=request.context
  const context=c.kind==='museum'?{kind:'museum',exhibitId:c.exhibit?.id??null}:{kind:c.kind,build:{installed:c.build.installed,connected:c.build.connected},selected:c.selected,simulation:c.simulation,...(c.kind==='troubleshooting'?{scenario:c.scenario,attempts:c.attempts}:{})}
  const {data}=await this.call({action:'ask',question:request.question,locale:request.locale,context,history:request.history?.slice(-6).map(m=>({role:m.role,text:m.text.slice(0,1000)}))??[],conversationId:request.conversationId},options.signal)
  const answer=data as CoreAIResponse|null
  if(!answer||answer.provider!=='opencode'||answer.offline!==false||typeof answer.model!=='string'||!answer.model||typeof answer.answer!=='string'||!answer.answer.trim()||answer.answer.length>8000||!['catalog','clarification','unsupported','generated'].includes(answer.certainty)||!Array.isArray(answer.topics)||answer.topics.some(t=>typeof t!=='string'))throw new CoreAIError('providerUnavailable')
  return answer
 }
}
