import {useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react'
import {Send,X} from 'lucide-react'
import type {Locale} from '@/types/museum'
import {useAuthStore} from '@/features/auth/authStore'
import {MuseumOverlay} from '@/features/museum/MuseumOverlay'
import {CoreAIError,type CoreAIContext,type CoreAIErrorCode} from './coreAIContracts'
import {coreAIClient,offlineCoreAIClient} from './coreAIClient'
import {coreAICopy} from './coreAICopy'
import {createChatHistory,type ChatMessage} from './chatHistory'
import {componentName} from './MockCoreAIProvider'
import {scenarios} from '../assembly/troubleshooting'
import './coreAI.css'

const history=createChatHistory()
history.setOwner(useAuthStore.getState().user?.id??null)
useAuthStore.subscribe(s=>history.setOwner(s.user?.id??null))
function coreAIContextKey(c:CoreAIContext){return c.kind==='museum'?`museum:${c.exhibit?.id??'none'}`:c.kind==='troubleshooting'?`troubleshooting:${c.scenario??'none'}`:`assembly:${c.selected??c.next??'none'}`}
export function CoreAIPanel({context,locale,onClose,presentation='modal'}:{context:CoreAIContext;locale:Locale;onClose():void;presentation?:'modal'|'dock'}){
 const owner=useAuthStore(s=>s.user?.id),key=coreAIContextKey(context)+':'+locale
 if(!owner)return null
 return <Conversation key={owner+':'+key} owner={owner} historyKey={key} context={context} locale={locale} onClose={onClose} presentation={presentation}/>
}
function Conversation({owner,historyKey,context,locale,onClose,presentation}:{owner:string;historyKey:string;context:CoreAIContext;locale:Locale;onClose():void;presentation:'modal'|'dock'}){
 const c=coreAICopy[locale],[messages,setMessages]=useState(()=>history.read(owner,historyKey)),[question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState<CoreAIErrorCode|null>(null),request=useRef<AbortController|null>(null),log=useRef<HTMLDivElement>(null)
 const [mode,setMode]=useState<'connecting'|'mock'|'opencode'|'unavailable'>('connecting'),[explicitOffline,setExplicitOffline]=useState(false),[connection,setConnection]=useState(0),[model,setModel]=useState(''),[liveAnswered,setLiveAnswered]=useState(false)
 const [conversationId]=useState(()=>crypto.randomUUID()),contextSignature=JSON.stringify(context)
 useEffect(()=>{const controller=new AbortController();void coreAIClient.status({signal:controller.signal}).then(status=>{if(!controller.signal.aborted){setMode(status.provider);setModel(status.model??'');setError(null)}}).catch(failure=>{if(!controller.signal.aborted){setMode('unavailable');setError(failure instanceof CoreAIError?failure.code:'providerUnavailable')}});return()=>controller.abort()},[connection])
 useEffect(()=>()=>{request.current?.abort();request.current=null},[])
 useEffect(()=>()=>{request.current?.abort()},[contextSignature])
 useEffect(()=>{log.current?.scrollTo({top:log.current.scrollHeight,behavior:'instant'})},[messages,busy,error])
 const store=(next:ChatMessage[])=>{const bounded=next.slice(-20);history.write(owner,historyKey,bounded);setMessages(bounded)}
 const ask=async(e:FormEvent)=>{
  e.preventDefault();const text=question.trim();if(!text||busy||request.current||!explicitOffline&&(mode==='connecting'||mode==='unavailable'))return
  const controller=new AbortController();request.current=controller;setBusy(true);setError(null)
  const previous=messages.at(-1)?.role==='user'&&messages.at(-1)?.text===text?messages.slice(0,-1):messages
  const next:ChatMessage[]=[...previous,{role:'user',text}];store(next)
  try{
   const response=await (explicitOffline?offlineCoreAIClient:coreAIClient).ask({question:text,locale,context,conversationId,history:previous.filter(m=>m.role==='user'||m.provider==='opencode').slice(-6).map(m=>({role:m.role,text:m.text.slice(0,1000)}))},{signal:controller.signal})
   if(controller.signal.aborted)return
   store([...next,{role:'assistant',text:response.answer,provider:response.provider,...('model' in response?{model:response.model}:{})}]);setQuestion('');setMode(response.provider==='mock'?'mock':'opencode');if(response.provider==='opencode'){setLiveAnswered(true);setModel(response.model)}
  }catch(failure){if(!controller.signal.aborted)setError(failure instanceof CoreAIError?failure.code:'failed')}
  finally{if(request.current===controller){request.current=null;setBusy(false)}}
 }
 const title=context.kind==='museum'?context.exhibit?.title[locale]:context.kind==='troubleshooting'&&context.scenario?scenarios[context.scenario].title[locale]:context.kind==='assembly'&&(context.selected??context.next)?componentName((context.selected??context.next)!,locale):c[context.kind]
 const Frame=presentation==='dock'?DockChatFrame:MuseumOverlay
 return <Frame label={c.title} kind="ai" onClose={onClose}>
  <div className="core-ai" dir={locale==='fa'?'rtl':'ltr'}>
   <header className="museum-dialog-header"><div><span className="core-ai-badge" role="status">{explicitOffline||mode==='mock'?c.badge:mode==='connecting'?c.connecting:mode==='opencode'?`${liveAnswered?c.live:c.ready} · ${model}`:c.unavailable}</span><h2>{c.title}</h2></div><button data-close aria-label={c.close} onClick={onClose}><X size={18}/></button></header>
   <div className="core-ai-context"><small>{c.context} · {c[context.kind]}</small><strong dir="auto">{title}</strong><p>{explicitOffline||mode==='mock'?c.intro:c.liveIntro}</p></div>
   <div ref={log} className="core-ai-log" role="log" aria-live="polite" aria-label={c.title}>{messages.map((m,i)=><div className="core-ai-message" data-role={m.role} key={i}><small>{m.role==='user'?c.you:`${c.assistant} · ${m.provider==='opencode'?c.live+' / '+m.model:c.badge}`}</small><p dir="auto">{m.text}</p></div>)}{busy&&<p className="core-ai-preparing" role="status">{explicitOffline||mode==='mock'?c.busy:c.generating}</p>}{error&&<p role="alert">{c.errors[error]}</p>}</div>
   <div className="core-ai-suggestions">{c.suggestions[context.kind].map(q=><button disabled={busy} key={q} onClick={()=>setQuestion(q)}>{q}</button>)}</div>
   <form className="museum-ai-form" onSubmit={e=>void ask(e)} aria-busy={busy}><input data-autofocus maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)} aria-label={c.placeholder} placeholder={c.placeholder} dir="auto"/><button type="submit" disabled={busy||!question.trim()||!explicitOffline&&(mode==='connecting'||mode==='unavailable')} aria-label={error?c.retry:c.send}><Send size={18}/></button></form>
   {busy&&<button className="core-ai-clear" onClick={()=>{request.current?.abort();request.current=null;setBusy(false);setError('aborted')}}>{c.cancel}</button>}
   {!busy&&<div className="core-ai-suggestions">{!explicitOffline&&mode!=='mock'&&<button onClick={()=>{setExplicitOffline(true);setError(null)}}>{c.useOffline}</button>}<button onClick={()=>{setExplicitOffline(false);setMode('connecting');setLiveAnswered(false);setConnection(n=>n+1)}}>{c.reconnect}</button></div>}
   <button className="core-ai-clear" disabled={busy||!messages.length} onClick={()=>{store([]);setError(null)}}>{c.clear}</button>
  </div>
 </Frame>
}

/** Nonmodal presentation of the same conversation; museum callers retain the modal default. */
function DockChatFrame({label,onClose,children}:{label:string;kind?:'ai';onClose():void;children:ReactNode}){
 const root=useRef<HTMLDivElement>(null)
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;root.current?.querySelector<HTMLInputElement>('[data-autofocus]')?.focus({preventScroll:true});return()=>{if(previous?.isConnected)previous.focus({preventScroll:true})}},[])
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&(root.current?.contains(document.activeElement)||document.activeElement===document.body)){event.preventDefault();event.stopPropagation();onClose()}};window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true)},[onClose])
 return <div ref={root} className="core-ai-dock" role="dialog" aria-modal="false" aria-label={label}>{children}</div>
}
