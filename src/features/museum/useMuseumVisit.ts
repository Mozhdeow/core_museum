import {useLayoutEffect,useEffect} from 'react'
import {useAuthStore} from '@/features/auth/authStore'
import {useMuseumStore} from './museumStore'
import {useMuseumNavigation} from './navigationState'
import {useCPUExperience} from './cpuExperienceState'
import {readVisit} from './visitPersistence'
import {discardVisit,flushVisit,releaseVisit,useVisitRuntime} from './visitRuntime'

export function restartMuseumVisit(){
 const owner=useVisitRuntime.getState().owner
 if(owner)discardVisit(owner)
 useMuseumNavigation.getState().reset();useCPUExperience.getState().open(null,false)
 useMuseumStore.getState().restoreSelection(null,null)
 useMuseumStore.getState().setCategoryFilter(null)
 if(owner){useVisitRuntime.getState().begin(owner,useMuseumNavigation.getState().intent);useVisitRuntime.getState().stage(null)}
}
/** Catalog and Auth gates stage a DTO. No camera writes occur here. */
export function useMuseumVisit(){
 const owner=useAuthStore(s=>s.user?.id),status=useMuseumStore(s=>s.status),catalogOwner=useMuseumStore(s=>s.owner)
 useLayoutEffect(()=>{
  if(!owner)return
  releaseVisit();useMuseumNavigation.getState().reset();useCPUExperience.getState().open(null,false)
  useVisitRuntime.getState().begin(owner,useMuseumNavigation.getState().intent)
  return()=>{flushVisit(true)}
 },[owner])
 useEffect(()=>{
  const runtime=useVisitRuntime.getState()
  if(!owner||runtime.owner!==owner||runtime.phase!=='waiting'||status!=='ready'||catalogOwner!==owner)return
  let saved=null
  if(runtime.intent===useMuseumNavigation.getState().intent){try{saved=readVisit(localStorage,owner)}catch{/* Private browsing may deny storage. */}}
  if(saved){useMuseumStore.getState().setCategoryFilter(saved.categoryId??null);useMuseumStore.getState().restoreSelection(saved.selectedId,saved.sectionId)}
  useVisitRuntime.getState().stage(saved)
 },[owner,status,catalogOwner])
}
