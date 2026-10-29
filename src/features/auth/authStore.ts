import {supabaseAuthService} from '@/lib/services'
import i18n from '@/i18n'
import {createAuthState} from './sessionState'
import {discardVisit} from '@/features/museum/visitRuntime'
import {useMuseumStore} from '@/features/museum/museumStore'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import {useCPUExperience} from '@/features/museum/cpuExperienceState'
import {clearCmsDrafts} from '@/features/cms/draftStorage'

export type {AuthProfile} from './sessionState'

export const useAuthStore = createAuthState(supabaseAuthService, async profile => {
    if (!localStorage.getItem('core-locale')) await i18n.changeLanguage(profile.preferred_locale)
})
let draftOwner: string | null = null
useAuthStore.subscribe(state => {
    if (state.user) {
        if (draftOwner && draftOwner !== state.user.id) clearCmsDrafts(draftOwner);
        draftOwner = state.user.id
    }
})

function clearVisit() {
    const owner = useAuthStore.getState().user?.id
    if (owner) {
        discardVisit(owner);
        clearCmsDrafts(owner)
    }
    useMuseumStore.getState().reset();
    useMuseumNavigation.getState().reset();
    useCPUExperience.getState().open(null, false)
}

const signOut = useAuthStore.getState().signOut
useAuthStore.setState({
    signOut: async role => {
        clearVisit();
        await signOut(role)
    }
})
let initialized = false

export function initializeAuth() {
    if (initialized) return
    initialized = true
    void useAuthStore.getState().initialize()
    try {
        const unsubscribe = supabaseAuthService.onAuthStateChange((_event, session) => {
            const state = useAuthStore.getState()
            if (session && state.user?.id === session.user.id && (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED')) {
                // Focus may re-emit the same session. Recheck the protected profile
                // without replacing the mounted workspace or retaining stale role access.
                window.setTimeout(() => void useAuthStore.getState().revalidate(), 0)
                return
            }
            if (state.user && session?.user.id !== state.user.id) clearCmsDrafts(state.user.id)
            if (_event === 'SIGNED_OUT') clearVisit()
            useAuthStore.getState().invalidate(Boolean(session))
            if (session) window.setTimeout(() => void useAuthStore.getState().initialize(), 0)
        })
        window.addEventListener('beforeunload', unsubscribe, {once: true})
    } catch {
        useAuthStore.getState().invalidate()
    }
}
