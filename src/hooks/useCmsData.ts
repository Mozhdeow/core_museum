import {useCallback,useEffect,useRef,useState} from 'react'
import {museumItemsService} from '@/lib/services'
import {useAuthStore} from '@/features/auth/authStore'
import type {ExhibitQuery} from '@/types/services'

// Results belong to both the requested resource and the current authenticated role.
function useCmsResource<T>(key:string,load:()=>Promise<T>){
    const user=useAuthStore(s=>s.user)
    const owner=`${user?.id}:${user?.role}:${key}`
    const [result,setResult]=useState<{owner:string;data?:T;error?:unknown;loading:boolean}>()
    const sequence=useRef({generation:0})
    const refresh=useCallback(async()=>{
        const request=++sequence.current.generation
        setResult({owner,loading:true})
        try{const data=await load();if(request===sequence.current.generation){setResult({owner,data,loading:false});return true}}
        catch(error){if(request===sequence.current.generation)setResult({owner,error,loading:false})}
        return false
    },[owner,load])
    useEffect(()=>{
        const requests=sequence.current
        // Start the asynchronous request when the resource or authenticated owner changes.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refresh()
        return ()=>{requests.generation++}
    },[refresh])
    return {data:result?.owner===owner?result.data:undefined,error:result?.owner===owner?result.error:undefined,loading:result?.owner!==owner||result.loading,refresh}
}
const loadTaxonomy=()=>museumItemsService.taxonomy()
export function useCmsTaxonomy(){return useCmsResource('taxonomy',loadTaxonomy)}
export function useExhibitPage(query:ExhibitQuery){
    const {page,perPage,search,status,categoryId,sectionId}=query
    const load=useCallback(()=>museumItemsService.page({page,perPage,search,status,categoryId,sectionId}),[page,perPage,search,status,categoryId,sectionId])
    return useCmsResource(`page:${JSON.stringify(query)}`,load)
}
export function useExhibit(id:string|undefined){
    const load=useCallback(()=>id?museumItemsService.get(id):Promise.resolve(undefined),[id])
    return useCmsResource(`item:${id}`,load)
}
