import {useEffect,useRef,useState,type FormEvent} from 'react'
import {Send,X} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {curatorService} from '@/lib/services'
import {EXPLANATION_MODES,type ExplanationMode} from '@/types/services'
import type {Locale,MuseumItem,SectionId} from '@/types/museum'
import {MuseumOverlay} from './MuseumOverlay'
export function AICuratorPanel({item,locale,section,onClose}: {item:MuseumItem;locale:Locale;section:SectionId;onClose():void}){
 const {t}=useTranslation(['common','museum']),[mode,setMode]=useState<ExplanationMode>('simple'),[question,setQuestion]=useState('')
 const [answer,setAnswer]=useState(''),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false),request=useRef(0)
 useEffect(()=>()=>{request.current++},[])
 const ask=async(e:FormEvent)=>{
  e.preventDefault();if(!question.trim()||busy)return
  const ticket=++request.current;setBusy(true);setFailed(false)
  try{const response=await curatorService.ask({currentItemId:item.id,exhibitContext:item,currentSection:section,locale,question:question.trim(),explanationMode:mode});if(ticket===request.current)setAnswer(response.answer)}
  catch{if(ticket===request.current)setFailed(true)}
  finally{if(ticket===request.current)setBusy(false)}
 }
 return <MuseumOverlay label={t('askAI')} kind="ai" onClose={onClose}>
  <header className="museum-dialog-header"><div><span className="eyebrow">CORE / CURATOR DEMO</span><h2>{t('askAI')}</h2></div><button data-close aria-label={t('close')} onClick={onClose}><X size={18}/></button></header>
  <div className="museum-ai-body" dir={locale==='fa'?'rtl':'ltr'}><p dir="auto">{item.title[locale]} · {t('curatorHint',{ns:'museum'})}</p>
   <div className="museum-ai-modes">{EXPLANATION_MODES.map(option=><button key={option} aria-pressed={mode===option} onClick={()=>setMode(option)}>{t(`levels.${option}`,{ns:'museum'})}</button>)}</div>
   {answer&&<p className="museum-ai-answer" role="status" dir="auto">{answer}</p>}
   {failed&&<p role="alert">{t('curatorError',{ns:'museum'})}</p>}
  </div>
  <form className="museum-ai-form" onSubmit={e=>void ask(e)} aria-busy={busy}>
   <input data-autofocus value={question} onChange={e=>setQuestion(e.target.value)} aria-label={t('askPlaceholder',{ns:'museum'})} placeholder={t('askPlaceholder',{ns:'museum'})} dir="auto"/>
   <button type="submit" disabled={busy||!question.trim()} aria-label={t('askAI')}><Send size={18}/></button>
  </form>
  <p className="museum-ai-disclaimer">{t('curatorMock',{ns:'museum'})}</p>
 </MuseumOverlay>
}
