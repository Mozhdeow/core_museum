import {create} from 'zustand'
import type {Session} from '@supabase/supabase-js'
import type {AuthUser, Credentials, UserRole} from '../../types/services.ts'
import type {Locale} from '../../types/museum.ts'
import {databaseRole,displayRole,type DatabaseRole} from './permissions.ts'

export type AuthProfile={id:string;email:string|null;full_name:string|null;role:DatabaseRole;preferred_locale:Locale;created_at:string;updated_at:string}
export type SessionResult={session:Session|null;profile:AuthProfile|null;user:AuthUser|null}
type Gateway={getSession():Promise<SessionResult>;signIn(input:Credentials):Promise<unknown>;register(input:Credentials&{name:string}):Promise<unknown>;signOut():Promise<void>;updateProfile(id:string,patch:{full_name?:string;preferred_locale?:Locale}):Promise<AuthProfile>}
export interface AuthState extends SessionResult {
    role:DatabaseRole|null;isAuthenticated:boolean;isAdmin:boolean;isLoading:boolean;error:string|null
    initialize():Promise<void>;invalidate(loading?:boolean):void
    signIn(input:Credentials,role?:UserRole):Promise<void>;register(input:Credentials&{name:string}):Promise<void>;signOut(role?:UserRole):Promise<void>
    updateProfile(patch:{full_name?:string;preferred_locale?:Locale}):Promise<void>
}
const empty=()=>({session:null,user:null,profile:null,role:null,isAuthenticated:false,isAdmin:false,error:null})
function trusted(result:SessionResult) {
    if(!result.session)return empty()
    const profile=result.profile,role=databaseRole(profile?.role)
    if(!profile || !role || profile.id!==result.session.user.id)throw new Error('Profile authorization is unavailable')
    const user:AuthUser={id:profile.id,email:result.session.user.email ?? profile.email ?? '',name:profile.full_name ?? result.user?.name ?? '',role:displayRole(role)}
    return {session:result.session,profile,user,role,isAuthenticated:true,isAdmin:role==='admin',error:null}
}
// Request generations stop a slow old account/profile load from restoring stale privileges.
export function createAuthState(gateway:Gateway,onLocale:(profile:AuthProfile)=>Promise<void>=async()=>{}) {
    let generation=0
    return create<AuthState>((set,get)=>{
        const fail=(error:unknown)=>({...empty(),isLoading:false,error:error instanceof Error ? error.message : 'Authentication unavailable'})
        const restore=async(request:number)=>{
            const result=await gateway.getSession(),state=trusted(result)
            if(request!==generation)return
            if(result.profile)await onLocale(result.profile)
            if(request===generation)set({...state,isLoading:false})
        }
        return {
            ...empty(),isLoading:true,
            invalidate(loading=false){generation++;set({...empty(),isLoading:loading})},
            async initialize(){const request=++generation;set({...empty(),isLoading:true});try{await restore(request)}catch(error){if(request===generation)set(fail(error))}},
            async signIn(input){const request=++generation;set({...empty(),isLoading:true});try{await gateway.signIn(input);await restore(request)}catch(error){if(request===generation)set(fail(error));throw error}},
            async register(input){const request=++generation;set({...empty(),isLoading:true});try{await gateway.register({name:input.name,email:input.email,password:input.password});await restore(request)}catch(error){if(request===generation)set(fail(error));throw error}},
            async signOut(){generation++;set({...empty(),isLoading:false});await gateway.signOut()},
            async updateProfile(patch){
                const profile=get().profile,request=generation
                if(!profile)return
                // Construct permitted fields; never forward runtime overposting.
                const allowed={full_name:patch.full_name,preferred_locale:patch.preferred_locale}
                const updated=await gateway.updateProfile(profile.id,allowed)
                if(request!==generation || get().profile?.id!==profile.id)return
                set({...trusted({session:get().session,profile:updated,user:get().user}),isLoading:false})
            },
        }
    })
}
