import {useEffect,useRef,type ReactNode,type KeyboardEvent} from 'react'
import {createPortal} from 'react-dom'
import './museumOverlays.css'

/** Portal escapes the canvas HUD's pointer-events and stacking contexts. One owner at a time. */
export function MuseumOverlay({label,kind,onClose,children,onArrow}: {
 label:string;kind:'gallery'|'ai';onClose():void;children:ReactNode;onArrow?:(direction:-1|1)=>void
}){
 const root=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null,node=root.current
  const focus=node?.querySelector<HTMLElement>('[data-autofocus]')??node?.querySelector<HTMLElement>('[data-close]')
  focus?.focus({preventScroll:true})
  const update=()=>{const viewport=window.visualViewport
   node?.style.setProperty('--museum-modal-height',`${viewport?.height??innerHeight}px`)
   node?.style.setProperty('--museum-modal-top',`${viewport?.offsetTop??0}px`)
  }
  update();window.visualViewport?.addEventListener('resize',update);window.visualViewport?.addEventListener('scroll',update)
  return()=>{
   window.visualViewport?.removeEventListener('resize',update);window.visualViewport?.removeEventListener('scroll',update)
   if(previous?.isConnected)previous.focus({preventScroll:true})
  }
 },[])
 const keyboard=(e:KeyboardEvent)=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();return}
  if(onArrow&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.repeat&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();e.stopPropagation();onArrow(e.key==='ArrowLeft'?-1:1)}
  if(e.key==='Tab'){
   const focusable=Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')??[]).filter(n=>n.getClientRects().length)
   const first=focusable[0],last=focusable.at(-1)
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
  }
 }
 return createPortal(<div ref={root} className="museum-modal" data-museum-modal={kind} role="dialog" aria-modal="true" aria-label={label} onKeyDown={keyboard}>
  <div className={`museum-modal-panel museum-modal-${kind}`}>{children}</div>
 </div>,document.body)
}
