import {AssemblyAutoPanel} from './AssemblyAutomationControls'
import {bootIssues} from './assemblyRules'
import {lazy,Suspense,useEffect,useRef,useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import gsap from 'gsap'
import {ArrowLeft,ArrowRight,Check,Power,RotateCcw,Undo2,ZoomIn,ZoomOut,PanelLeft,Layers,Box,ArrowUp,Eye,ChevronDown,Monitor,Mouse,Unplug,Info,MessageSquare,X,SlidersHorizontal,ChevronUp} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {useReducedMotion,useMediaQuery} from '@/hooks/usePreferences'
import {useAuthStore} from '@/features/auth/authStore'
import {LanguageSwitcher} from '@/components/common/LanguageSwitcher'
import {CoreAIPanel} from '@/features/coreAI/CoreAIPanel'
import {coreAICopy} from '@/features/coreAI/coreAICopy'
import {assemblyAIContext} from '@/features/coreAI/coreAIContext'
import {AssemblyMonitorInput} from './AssemblyMonitorInput'
import {AssemblyItemCard} from './AssemblyItemCard'
import {AssemblyLoading} from './AssemblyLoading'
import {AssemblyPerfOverlay} from './AssemblyPerf'
import {ExtensionInventory} from './AssemblyExtensionsPanel'
import {TroubleshootingPanel} from './TroubleshootingPanel'
import {partIds,assemblyPartIds,cableIds} from './assemblyDefinition'
import {useAssembly,assemblyAutomation,saveAssembly,nextAssembly,isPart} from './assemblyStore'
import './assembly.css'
const Scene=lazy(()=>import('./AssemblyScene'))
type DockPane='parts'|'cables'|'devices'|'info'|'troubleshoot'|'ai'
type SheetSize='peek'|'half'|'full'

export default function AssemblyLab(){
 const [dock,setDock]=useState<DockPane|null>(null),[sheet,setSheet]=useState<SheetSize>('peek'),[views,setViews]=useState(false),[infoOpen,setInfoOpen]=useState(false),[sceneReady,setSceneReady]=useState(false),[dragPreview,setDragPreview]=useState(false),[success,setSuccess]=useState(false),[portLabel,setPortLabel]=useState<string|null>(null)
 const mobile=useMediaQuery('(max-width:767px)'),root=useRef<HTMLElement>(null),card=useRef<HTMLDetailsElement>(null),exitTween=useRef<gsap.core.Tween|null>(null),scrollFrame=useRef(0),trayDrag=useRef(false),dockRef=useRef<DockPane|null>(null),navigate=useNavigate(),reduced=useReducedMotion()
 const {t,i18n}=useTranslation('assembly'),owner=useAuthStore(s=>s.user?.id),state=useAssembly(),selected=state.selected,next=nextAssembly(state),active=selected??next,count=Object.keys(state.installed).length+state.connected.length,total=partIds.length+cableIds.length
 useEffect(()=>{const stop=()=>assemblyAutomation.cancel(),hide=()=>{if(document.hidden)stop()};window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',hide);return()=>{stop();window.removeEventListener('pagehide',stop);document.removeEventListener('visibilitychange',hide)}},[])
 useEffect(()=>()=>{exitTween.current?.kill();cancelAnimationFrame(scrollFrame.current)},[])
 useEffect(()=>{const sync=()=>{if(root.current)root.current.dataset.hidden=String(document.hidden)};sync();document.addEventListener('visibilitychange',sync);return()=>document.removeEventListener('visibilitychange',sync)},[])
 useEffect(()=>{if(!owner)return;let storage:Storage|null=null;try{storage=window.localStorage}catch{/* Optional browser storage. */}useAssembly.getState().hydrate(owner,storage??{getItem:()=>null});const save=()=>{if(storage)saveAssembly(storage,useAssembly.getState())},unsubscribe=useAssembly.subscribe((current,previous)=>{if(current.installed!==previous.installed||current.connected!==previous.connected||current.mode!==previous.mode||current.panelOpen!==previous.panelOpen||current.optionalParts!==previous.optionalParts||current.optionalConnected!==previous.optionalConnected||current.peripherals!==previous.peripherals||current.opticalOpen!==previous.opticalOpen||current.troubleshooting?.saved!==previous.troubleshooting?.saved)save()});window.addEventListener('pagehide',save);return()=>{save();unsubscribe();window.removeEventListener('pagehide',save);useAssembly.getState().release()}},[owner])
 useEffect(()=>{if(state.power==='starting'){const os=window.setTimeout(()=>{if(useAssembly.getState().power==='starting')useAssembly.setState({displayStage:'osBoot'})},800),boot=window.setTimeout(()=>useAssembly.getState().bootComplete(),2400);return()=>{clearTimeout(os);clearTimeout(boot)}}if(state.power==='running'){const desktop=window.setTimeout(()=>{if(useAssembly.getState().power==='running')useAssembly.setState({displayStage:'desktop'})},1400);return()=>clearTimeout(desktop)}},[state.power])
 const automating=state.automation?.status==='running'
 const locale=i18n.language==='fa'?'fa':'en',exploring=state.learningMode==='explore',troubleshooting=state.learningMode==='troubleshoot'
 const simulation={power:state.power,panelOpen:state.panelOpen}
 const assistantContext=troubleshooting?{kind:'troubleshooting' as const,build:{installed:{...state.installed},connected:[...state.connected]},selected:state.selected,scenario:state.troubleshooting?.id??null,findings:bootIssues(state),attempts:state.troubleshooting?.attempts??0,simulation}:assemblyAIContext(state,active,next,simulation)

 const label=(id:NonNullable<typeof selected>)=>t(`${isPart(id)?'parts':'cables'}.${id}.name`)
 const show=(pane:DockPane)=>{setDock(pane);dockRef.current=pane;setSheet('half');setViews(false)}
 const close=()=>{setDock(null);dockRef.current=null;setSheet('peek')}
 const rail=(pane:DockPane)=>{if(dock===pane){close();return}if(pane==='parts'||pane==='cables')state.setTab('parts');if(pane==='devices')state.setTab('peripherals');show(pane)}
 const pick=(id:NonNullable<typeof selected>)=>{state.select(id);show('info')}
 const inspect=()=>{setInfoOpen(true);scrollFrame.current=requestAnimationFrame(()=>card.current?.scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'}))}
 useEffect(()=>useAssembly.subscribe((current,previous)=>{
  if(current.automation&&current.automation.status!=='running'&&(current.installed!==previous.installed||current.connected!==previous.connected))useAssembly.setState({automation:null})
  if(current.learningMode!==previous.learningMode&&current.learningMode!=='troubleshoot'){setDock(null);dockRef.current=null;setSheet('peek');return}
  if(current.troubleshooting&&current.troubleshooting!==previous.troubleshooting&&current.troubleshooting.id!==previous.troubleshooting?.id){setDock('troubleshoot');dockRef.current='troubleshoot';setSheet('half');setInfoOpen(false);return}
  if(current.automation?.status!=='running'&&!trayDrag.current&&dockRef.current!=='ai'&&((current.selected&&current.selected!==previous.selected)||(current.extensionSelection&&current.extensionSelection!==previous.extensionSelection))){
   if(current.learningMode==='troubleshoot'){setInfoOpen(true)}else{setDock('info');dockRef.current='info';setSheet('half')}
  }
 }),[])
 useEffect(()=>{const start=setTimeout(()=>setSuccess(state.power==='running'),0),end=setTimeout(()=>setSuccess(false),4500);return()=>{clearTimeout(start);clearTimeout(end)}},[state.power])
 useEffect(()=>{const timer=setTimeout(()=>setPortLabel(state.hoverPort),state.hoverPort?250:80);return()=>clearTimeout(timer)},[state.hoverPort])
 const dockTitle=dock==='ai'?coreAICopy[locale].title:dock==='troubleshoot'?t('learning.troubleshoot'):dock==='info'?t('guide'):t('ui.'+(dock??'parts'))
 const cameraGroups=[{name:'ui.views',items:[['front',Eye],['back',Eye],['sideLeft',ArrowLeft],['sideRight',ArrowRight],['top',ArrowUp],['iso',Box]]},{name:'ui.focus',items:[['staging',Layers],['monitor',Monitor]]},{name:'camera',items:[['zoomIn',ZoomIn],['zoomOut',ZoomOut],['return',Undo2],['reset',RotateCcw]]}] as const
 return <main ref={root} className="assembly-lab" data-assembly-lab data-lesson-mode={state.learningMode} data-power={state.power} data-build-ready={state.ready} data-automating={automating} data-automation-status={state.automation?.status??'idle'} data-display-stage={state.displayStage}>
  <div className="assembly-viewport"><Suspense fallback={<AssemblyLoading/>}>{state.ready&&<Scene onReady={()=>setSceneReady(true)}/>}</Suspense>{!sceneReady&&<AssemblyLoading/>}</div>
  <header className="assembly-header">
   <Link to="/museum" className="assembly-return" aria-label={t('return')} title={t('return')} onClick={e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||reduced)return;e.preventDefault();exitTween.current?.kill();exitTween.current=gsap.to(root.current,{opacity:0,duration:.18,ease:'power1.in',onComplete:()=>navigate('/museum')})}}><ArrowLeft size={18}/><span>{t('return')}</span></Link>
   <h1 className="assembly-brand">CORE <span>/ {t('title')}</span></h1>
   <nav className="assembly-learning" aria-label={t('learning.label')}>{(['explore','assemble','troubleshoot'] as const).map(mode=><button key={mode} aria-pressed={state.learningMode===mode} onClick={()=>{state.setLearningMode(mode);if(mode==='troubleshoot')show('troubleshoot');else close()}}>{t('learning.'+mode)}</button>)}<button aria-label={coreAICopy[locale].title} aria-pressed={dock==='ai'} onClick={()=>rail('ai')}><MessageSquare size={15}/><span>CORE AI</span></button></nav>
   <LanguageSwitcher/>
  </header>
  <aside className="assembly-dock" data-open={Boolean(dock)} data-sheet={sheet} aria-label={t('ui.dock')}>
   <nav className="assembly-dock-rail" aria-label={t('trayTabs')}>
    {([{pane:'parts',Icon:Layers,name:t('ui.parts'),count:Object.keys(state.installed).length},{pane:'cables',Icon:Unplug,name:t('ui.cables'),count:state.connected.length},{pane:'devices',Icon:Mouse,name:t('ui.devices'),count:Object.keys(state.peripherals).length},{pane:troubleshooting?'troubleshoot':'info',Icon:Info,name:t(troubleshooting?'learning.troubleshoot':'guide'),count:null},{pane:'ai',Icon:MessageSquare,name:coreAICopy[locale].title,count:null}] as const).map(({pane,Icon,name,count})=><button key={pane} aria-label={name} title={name} aria-pressed={dock===pane} onClick={()=>rail(pane)}><Icon size={19}/>{count!==null&&<span>{count}</span>}</button>)}
    <button className="assembly-sheet-size" aria-label={t('ui.sheetSize')} title={t('ui.sheetSize')} onClick={()=>{if(!dock){show('parts');return}setSheet(sheet==='peek'?'half':sheet==='half'?'full':'peek')}}><ChevronUp size={19}/></button>
   </nav>
   {dock&&<section className="assembly-dock-panel" aria-label={dockTitle}>
    {dock!=='ai'&&<header className="assembly-dock-header"><h2>{dockTitle}</h2><button aria-label={t('ui.closeDock')} title={t('ui.closeDock')} onClick={close}><X size={18}/></button></header>}
    <div key={dock} className="assembly-dock-content">
     {dock==='parts'&&<div className="assembly-inventory"><AssemblyAutoPanel kind="parts" ready={sceneReady}/><div className="assembly-tray-tabs" role="group" aria-label={t('trayTabs')}>{(exploring?['parts'] as const:['parts','optional'] as const).map(tab=><button key={tab} aria-pressed={state.trayTab===tab} onClick={()=>state.setTab(tab)}>{t('tabs.'+tab)}</button>)}</div>{state.trayTab==='parts'?<div className="assembly-parts">{assemblyPartIds.map((id,index)=><div key={id} className="assembly-part-row"><button draggable={!automating&&!exploring&&!state.installed[id]} onDragStart={e=>{trayDrag.current=true;setDragPreview(true);e.dataTransfer.setData('application/core-part',id);state.select(id)}} onDragEnd={()=>{trayDrag.current=false;setDragPreview(false)}} aria-pressed={selected===id} data-part-button={id} onClick={()=>pick(id)}><span className="assembly-index">{state.installed[id]?<Check size={14}/>:String(index+1).padStart(2,'0')}</span><span>{label(id)}<small>{t(state.installed[id]?'installed':'tray')}</small></span></button>{dragPreview&&selected===id&&<AssemblyItemCard/>}</div>)}</div>:<ExtensionInventory/>}<button className="assembly-fixed-display" data-fixed-monitor onClick={()=>{state.select('monitor');state.command('focus','monitor');show('info')}}><Monitor size={16}/>{t('fixedMonitor')}</button></div>}
     {dock==='cables'&&<div className="assembly-wires"><AssemblyAutoPanel kind="cables" ready={sceneReady}/><p>{t('twoEnds')}</p>{cableIds.map(id=><div key={id} className="assembly-cable-row"><button draggable={!automating} onDragStart={e=>{trayDrag.current=true;setDragPreview(true);e.dataTransfer.setData('application/core-cable',id);state.select(id)}} onDragEnd={()=>{trayDrag.current=false;setDragPreview(false)}} aria-pressed={selected===id} data-cable-button={id} onClick={()=>pick(id)}>{state.connected.includes(id)?<Check size={14}/>:<span className="assembly-wire-dot"/>}{label(id)}</button>{dragPreview&&selected===id&&<AssemblyItemCard/>}</div>)}</div>}
     {dock==='devices'&&<><ExtensionInventory/><details className="assembly-inline-help"><summary>{t('ui.more')}</summary><p>{t('optionalHint')}</p></details></>}
     {dock==='info'&&<AssemblyItemCard/>}
     {dock==='troubleshoot'&&<><TroubleshootingPanel onInspect={inspect}/>{state.troubleshooting&&<details className="assembly-context-card" ref={card} open={infoOpen} onToggle={e=>setInfoOpen(e.currentTarget.open)}><summary>{active?label(active):t('guide')}<ChevronDown size={16}/></summary><AssemblyItemCard/></details>}</>}
     {dock==='ai'&&<CoreAIPanel context={assistantContext} locale={locale} onClose={close} presentation="dock"/>}
    </div>
   </section>}
  </aside>
  <footer className="assembly-footer">
   <div className="assembly-progress"><div><strong>{t('progress')}</strong><span>{count} / {total}</span></div><progress value={count} max={total} aria-label={t('progress')}/></div>
   <button hidden={Boolean(state.automation)} className="assembly-next" title={active?label(active):t('ready')} onClick={()=>show(troubleshooting?'troubleshoot':'info')}><Info size={16}/><span><small>{t(troubleshooting?'learning.troubleshoot':'recommended')}</small>{active?label(active):t('ready')}</span><ChevronUp size={15}/></button>
   <div className="assembly-camera-wrapper"><button className="assembly-view-toggle" aria-expanded={views} aria-label={t('ui.viewMenu')} title={t('ui.viewMenu')} onClick={()=>setViews(!views)}><SlidersHorizontal size={19}/></button>{views&&<nav className="assembly-camera" aria-label={t('camera')} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setViews(false);root.current?.querySelector<HTMLButtonElement>('.assembly-view-toggle')?.focus()}}}><header><span>{t('camera')}</span><button aria-label={t('ui.closeViews')} onClick={()=>setViews(false)}><X size={16}/></button></header>{cameraGroups.map(group=><fieldset key={group.name}><legend>{t(group.name)}</legend><div>{group.items.map(([kind,Icon])=>{const name=t(kind==='return'?'returnView':kind==='reset'?'resetCamera':kind==='monitor'?'monitorView':kind);return <button key={kind} title={name} aria-label={name} onClick={()=>{if(kind==='monitor')state.command('focus','monitor');else state.command(kind);if(mobile)setViews(false)}}><Icon size={18}/></button>})}</div></fieldset>)}</nav>}</div>
   <div className="assembly-footer-actions"><button aria-pressed={state.panelOpen} aria-label={t(state.panelOpen?'closePanel':'openPanel')} title={t(state.panelOpen?'closePanel':'openPanel')} onClick={state.togglePanel}><PanelLeft size={18}/><span>{t(state.panelOpen?'closePanel':'openPanel')}</span></button><button disabled={exploring} aria-label={t('restart')} title={t('restart')} onClick={state.restart}><RotateCcw size={18}/><span>{t('restart')}</span></button><button disabled={exploring} className="assembly-power" onClick={state.togglePower}><Power size={18}/>{t(state.power==='off'?'powerOn':state.power==='starting'?'starting':'powerOff')}</button></div>
   {success&&<span className="assembly-status" role="status"><Check size={15}/>{t('success')}</span>}
  </footer>
  <div className="assembly-port-tooltip" role="tooltip" data-visible={Boolean(portLabel)} aria-hidden={!portLabel}>{portLabel?t('devicePorts.'+portLabel):''}</div><AssemblyMonitorInput/><AssemblyPerfOverlay/><div hidden data-assembly-installed={JSON.stringify(state.installed)} data-assembly-connected={state.connected.join(',')} data-monitor-cursor={state.cursor.join(',')} data-monitor-focused={state.monitorFocused}/>
 </main>
}
