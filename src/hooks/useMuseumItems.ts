import {useCallback, useEffect, useRef, useState} from 'react'
import {museumItemsService} from '@/lib/services'
import type {MuseumItem} from '@/types/museum'
import {useAuthStore} from '@/features/auth/authStore'
import {canUseContentWorkspace} from '@/features/auth/permissions'

export function useMuseumItems() {
    const id=useAuthStore(s=>s.user?.id),role=useAuthStore(s=>s.user?.role)
    const owner=`${id}:${role}`
    const [data,setData]=useState<{owner:string;items:MuseumItem[];loading:boolean;error:boolean}>()
    const sequence=useRef({generation:0})
    const refresh = useCallback(async () => {
        const request=++sequence.current.generation
        setData({owner,items:[],loading:true,error:false})
        try {
            const items=await museumItemsService.list({admin:canUseContentWorkspace(role),...(role==='editor'?{status:'draft' as const}:{})})
            if(request===sequence.current.generation)setData({owner,items,loading:false,error:false})
        } catch {
            if(request===sequence.current.generation)setData({owner,items:[],loading:false,error:true})
        }
    }, [owner,role])
    useEffect(() => {
        const requests=sequence.current
        // The service fetch resolves asynchronously; preserve the existing initial-load exception.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refresh()
        return ()=>{requests.generation++}
    }, [refresh])
    return {items:data?.owner===owner?data.items:[],loading:data?.owner!==owner || data.loading,error:data?.owner===owner && data.error,refresh}
}
