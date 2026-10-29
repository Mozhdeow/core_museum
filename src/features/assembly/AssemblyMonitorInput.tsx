import {useEffect,useRef} from 'react'
import {useTranslation} from 'react-i18next'
import {useAssembly} from './assemblyStore'

/** Native textarea supplies IME, paste, selection and the mobile keyboard. Its
 * text is presented on the owned 3D screen texture, never in a second canvas. */
export function AssemblyMonitorInput(){
 const input=useRef<HTMLTextAreaElement>(null),{t}=useTranslation('assembly'),text=useAssembly(s=>s.typedText),enabled=useAssembly(s=>s.power==='running'&&s.displayStage==='desktop'&&Boolean(s.peripherals.keyboard))
 useEffect(()=>{
  const focus=()=>{const s=useAssembly.getState();if(s.power==='running'&&s.displayStage==='desktop'&&s.peripherals.keyboard)input.current?.focus({preventScroll:true})}
  const outside=(event:PointerEvent)=>{if(event.target!==input.current)input.current?.blur()};window.addEventListener('core-monitor-focus',focus);document.addEventListener('pointerdown',outside,true)
  return()=>{window.removeEventListener('core-monitor-focus',focus);document.removeEventListener('pointerdown',outside,true)}
 },[])
 useEffect(()=>{if(!enabled)input.current?.blur()},[enabled])
 return <textarea ref={input} className="assembly-monitor-input" aria-label={t('desktop.notepadInput')} disabled={!enabled} maxLength={512} value={text} autoComplete="off" spellCheck={false} onChange={e=>useAssembly.getState().typeText(e.target.value)} onFocus={()=>useAssembly.setState({monitorFocused:true})} onBlur={()=>useAssembly.setState({monitorFocused:false})} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();input.current?.blur()}}}/>
}
