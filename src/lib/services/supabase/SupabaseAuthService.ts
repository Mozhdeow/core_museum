import type {AuthChangeEvent, Session} from '@supabase/supabase-js'
import {requireSupabase} from '@/lib/supabase/client'
import type {AuthService, AuthUser, Credentials} from '@/types/services'
import type {Locale} from '@/types/museum'
import {databaseRole, displayRole, type DatabaseRole} from '@/features/auth/permissions'

export type Profile = {
    id: string;
    email: string;
    full_name: string;
    role: DatabaseRole;
    preferred_locale: Locale;
    created_at: string;
    updated_at: string
}
const mapUser = (session: Session, profile: Profile): AuthUser => ({
    id: session.user.id,
    name: profile.full_name || session.user.email?.split('@')[0] || 'Archive visitor',
    email: session.user.email || profile.email,
    role: displayRole(profile.role)
})
export const supabaseAuthService: AuthService & {
    getSession: () => Promise<{ session: Session | null; profile: Profile | null; user: AuthUser | null }>
    onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => () => void
    updateProfile: (id: string, patch: { full_name?: string; preferred_locale?: Locale }) => Promise<Profile>
    updatePassword: (password: string) => Promise<void>
} = {
    async signIn({email, password}: Credentials) {
        const client = requireSupabase();
        const {data, error} = await client.auth.signInWithPassword({email, password});
        if (error || !data.session) throw error ?? new Error('Sign in failed');
        const result = await this.getSession();
        if (!result.user) throw new Error('Profile is not available yet');
        return result.user
    },
    async register({name, email, password}: Credentials & { name: string }) {
        const client = requireSupabase();
        const {data, error} = await client.auth.signUp({email, password, options: {data: {full_name: name}}});
        if (error) throw error;
        if (!data.session) throw new Error('CONFIRM_EMAIL');
        const result = await this.getSession();
        if (!result.user) throw new Error('Profile is not available yet');
        return result.user
    },
    async signOut() {
        const {error} = await requireSupabase().auth.signOut();
        if (error) throw error
    },
    async recoverPassword(email: string) {
        const {error} = await requireSupabase().auth.resetPasswordForEmail(email, {redirectTo: `${window.location.origin}/reset-password`});
        if (error) throw error
    },
    async getSession() {
        const client = requireSupabase();
        const {data: {session}, error} = await client.auth.getSession();
        if (error) throw error;
        if (!session) return {session: null, profile: null, user: null};
        const {
            data,
            error: profileError
        } = await client.from('profiles').select('*').eq('id', session.user.id).single();
        if (profileError) throw profileError;
        const profile = data as Profile;
        if(profile.id!==session.user.id || !databaseRole(profile.role))throw new Error('Profile authorization is unavailable');
        return {session, profile, user: mapUser(session, profile)}
    },
    onAuthStateChange(callback) {
        const {data} = requireSupabase().auth.onAuthStateChange(callback);
        return () => data.subscription.unsubscribe()
    },
    async updateProfile(id, patch) {
        const {data, error} = await requireSupabase().from('profiles').update({full_name:patch.full_name,preferred_locale:patch.preferred_locale}).eq('id', id).select('*').single();
        if (error) throw error;
        return data as Profile
    },
    async updatePassword(password) {
        const {error} = await requireSupabase().auth.updateUser({password});
        if (error) throw error
    },
}
