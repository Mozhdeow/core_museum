import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Check,Focus,RotateCcw} from 'lucide-react'
import {useAssembly} from './assemblyStore'
import {bootIssues} from './assemblyRules'
import {scenarioIds,scenarios,type ScenarioId} from './troubleshooting'
import {safety} from '../coreAI/hardwareKnowledge'

export function TroubleshootingPanel({onInspect}:{onInspect():void}){
 const {t,i18n}=useTranslation('assembly'),locale=i18n.language==='fa'?'fa':'en',s=useAssembly(),trial=s.troubleshooting,[choice,setChoice]=useState<ScenarioId>('noPower'),id=trial?.id??choice,scenario=scenarios[id]
 const ready=!bootIssues(trial?.baseline??s).length,complete=trial?.result==='passed'&&s.power==='running'&&!bootIssues(s).length
 const steps=[Boolean(trial?.observed),Boolean(trial?.answerCorrect),Boolean(trial?.inspected),Boolean(complete)],result=complete?'passed':trial?.result==='passed'||trial?.result==='starting'&&s.power==='off'?'untried':trial?.result
 return <section className="assembly-troubleshooting" aria-label={t('learning.troubleshoot')}>
  <span className="assembly-eyebrow">09B / {t('trouble.simulated')}</span><h2>{t('trouble.choose')}</h2>
  <label>{t('trouble.problem')}<select value={id} onChange={e=>{const next=e.target.value as ScenarioId;setChoice(next);if(trial)s.startScenario(next,trial.practice)}}>{scenarioIds.map(key=><option key={key} value={key}>{scenarios[key].title[locale]}</option>)}</select></label>
  {!trial?<><p>{t('trouble.copyNotice')}</p><button className="assembly-primary" disabled={!ready} onClick={()=>s.startScenario(choice)}>{t('trouble.introduce')}</button>{!ready&&<p>{t('trouble.incomplete')}</p>}<button className="assembly-trouble-secondary" onClick={()=>s.startScenario(choice,true)}>{t('trouble.practice')}</button></>:<>
   <p className="assembly-trouble-source">{t(trial.practice?'trouble.practiceCopy':'trouble.yourCopy')}</p>
   <p className="assembly-trouble-symptom" data-diagnostic-symptom>{scenario.symptom[locale]}</p>
   <div className="assembly-trouble-checklist" aria-label={t('trouble.checklist')}><progress value={steps.filter(Boolean).length} max={4} aria-label={t('trouble.checklist')}/>{['observe','answer','inspect','test'].map((key,i)=><span key={key} data-done={steps[i]}>{steps[i]?<Check size={12}/>:<i/>}{t('trouble.steps.'+key)}</span>)}</div>
   <button className="assembly-trouble-secondary" onClick={()=>s.diagnosticStep('observe')}>{t('trouble.observed')}</button>
   <fieldset><legend>{scenario.question[locale]}</legend><div className="assembly-trouble-answers">{[true,false].map(answer=><button key={String(answer)} aria-pressed={trial.answer===answer} onClick={()=>s.diagnosticStep('answer',answer)}>{t(answer?'trouble.yes':'trouble.no')}</button>)}</div>{trial.answer!==null&&<p role="status">{t(trial.answerCorrect?'trouble.correctObservation':'trouble.checkAgain')}</p>}</fieldset>
   <button className="assembly-primary" onClick={()=>{s.diagnosticStep('inspect');onInspect()}}><Focus size={14}/>{t('trouble.inspectRepair')}</button>
   <button className="assembly-text-button" onClick={()=>s.diagnosticStep('hint')}>{t('trouble.hint')}</button>{trial.hint&&<p>{scenario.hint[locale]}</p>}
   <p className="assembly-trouble-safety">{safety[locale]}</p>
   <button className="assembly-trouble-secondary" onClick={s.togglePower}>{t(s.power==='off'?'trouble.test':s.power==='starting'?'starting':'powerOff')}</button>
   <div data-trouble-result={result} role="status" className="assembly-trouble-result">{complete?<><strong>{t('trouble.success')}</strong><p>{scenario.explanation[locale]}</p></>:result==='failed'?<><strong>{t('trouble.failed')}</strong><p>{t(s.power==='faulted'?'trouble.powerOffRepair':'trouble.repairThenTest')}</p></>:result==='starting'?t('starting'):t('trouble.notTested')}</div>
   <button className="assembly-text-button" onClick={s.resetScenario}><RotateCcw size={13}/>{t('trouble.reset')}</button>
  </>}
  <button className="assembly-trouble-secondary" onClick={()=>s.setLearningMode('assemble')}>{t('trouble.return')}</button>
 </section>
}
