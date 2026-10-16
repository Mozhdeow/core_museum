import {useEffect,useState} from 'react'
import {useAuthStore} from '@/features/auth/authStore'
import {supabaseAdminService} from '@/lib/services'

export function useContentAccess(){
    const user=useAuthStore(state=>state.user),owner=`${user?.id}:${user?.role}`
    const [verified,setVerified]=useState<{owner:string;allowed:boolean}>()
    useEffect(()=>{
        if(user?.role!=='editor')return
        let cancelled=false
        void supabaseAdminService.contentAccess().then(access=>{
            if(!cancelled)setVerified({owner,allowed:access.role==='editor' && access.editorWritesVerified})
        }).catch(()=>{if(!cancelled)setVerified({owner,allowed:false})})
        return ()=>{cancelled=true}
    },[owner,user?.role])
    return {role:user?.role,canWrite:user?.role==='admin' || (user?.role==='editor' && verified?.owner===owner && verified.allowed)}
}
