import {useCallback,useEffect,useRef,type ReactNode,type KeyboardEvent} from 'react'
import {createPortal} from 'react-dom'
import './museumOverlays.css'

/** Portal escapes the canvas HUD's pointer-events and stacking contexts. One owner at a time. */
export function MuseumOverlay({label,kind,onClose,children,onArrow,onEscape}: {
 label:string;kind:'gallery'|'ai';onClose():void;children:ReactNode;onArrow?:(direction:-1|1)=>void;onEscape?():void
}){
 const root=useRef<HTMLDivElement>(null)
 const opener=useRef<HTMLElement|null>(null)
 const focusable=useCallback(()=>Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')??[])
  .filter(n=>n.getClientRects().length>0&&!n.closest('[inert]')),[])
 useEffect(()=>{
  const node=root.current,previous=document.activeElement
  if(!opener.current&&previous instanceof HTMLElement&&!node?.contains(previous))opener.current=previous
  const focus=node?.querySelector<HTMLElement>('[data-autofocus]')??node?.querySelector<HTMLElement>('[data-close]')
  focus?.focus({preventScroll:true})
  const update=()=>{const viewport=window.visualViewport
   node?.style.setProperty('--museum-modal-height',`${viewport?.height??innerHeight}px`)
   node?.style.setProperty('--museum-modal-top',`${viewport?.offsetTop??0}px`)
  }
  update();window.visualViewport?.addEventListener('resize',update);window.visualViewport?.addEventListener('scroll',update)
  return()=>{
   window.visualViewport?.removeEventListener('resize',update);window.visualViewport?.removeEventListener('scroll',update)
   queueMicrotask(()=>{if(opener.current?.isConnected&&!document.querySelector('[data-museum-modal]'))opener.current.focus({preventScroll:true})})
  }
 },[])
 useEffect(()=>{
  if(kind!=='gallery')return
  const overflow=document.body.style.overflow,node=root.current
  const siblings=Array.from(document.body.children).filter((n):n is HTMLElement=>n instanceof HTMLElement&&n!==node)
  const previous=siblings.map(n=>n.inert)
  document.body.style.overflow='hidden';siblings.forEach(n=>{n.inert=true})
  return()=>{document.body.style.overflow=overflow;siblings.forEach((n,i)=>{n.inert=previous[i]})}
 },[kind])
 // A disabled submit button can move focus to <body>. Escape must still close
 // the active dialog, and Tab must return to its focus boundary.
 useEffect(()=>{
  const keys=(event:globalThis.KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();(onEscape??onClose)()}
   else if(event.key==='Tab'&&root.current&&!root.current.contains(document.activeElement)){
    event.preventDefault();focusable()[0]?.focus()
   }
  }
  window.addEventListener('keydown',keys,true)
  return()=>window.removeEventListener('keydown',keys,true)
 },[onClose,onEscape,focusable])
 const keyboard=(e:KeyboardEvent)=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();(onEscape??onClose)();return}
  if(onArrow&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.repeat&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();e.stopPropagation();onArrow(e.key==='ArrowLeft'?-1:1)}
  if(e.key==='Tab'){
   const available=focusable(),first=available[0],last=available.at(-1)
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
  }
 }
 return createPortal(<div ref={root} className="museum-modal" data-museum-modal={kind} role="dialog" aria-modal="true" aria-label={label} onKeyDown={keyboard}>
  <div className={`museum-modal-panel museum-modal-${kind}`}>{children}</div>
 </div>,document.body)
}
