import {supabaseAuthService} from '@/lib/services'
import i18n from '@/i18n'
import {createAuthState} from './sessionState'
export type {AuthProfile} from './sessionState'

export const useAuthStore=createAuthState(supabaseAuthService,async profile=>{
    if(!localStorage.getItem('core-locale'))await i18n.changeLanguage(profile.preferred_locale)
})
let initialized=false
export function initializeAuth(){
    if(initialized)return
    initialized=true
    void useAuthStore.getState().initialize()
    try{
        const unsubscribe=supabaseAuthService.onAuthStateChange((_event,session)=>{
            useAuthStore.getState().invalidate(Boolean(session))
            if(session)window.setTimeout(()=>void useAuthStore.getState().initialize(),0)
        })
        window.addEventListener('beforeunload',unsubscribe,{once:true})
    }catch{useAuthStore.getState().invalidate()}
}
