import {createClient} from '@supabase/supabase-js'
import {createAdminUsersHandler, AuthAdminRejection, type AdminBackend} from './handler.ts'
import {UserManagementError, userErrorCodes, type UserErrorCode} from '../_shared/adminUsers.ts'

// Deno is confined to the deployment entrypoint; the handler is independently testable.
const runtime = (globalThis as typeof globalThis & {Deno: {env: {get(name: string): string | undefined}; serve(handler: (request: Request) => Promise<Response>): void}}).Deno
const env = (name: string) => runtime.env.get(name) ?? ''
const url = env('SUPABASE_URL'), key = env('SUPABASE_SERVICE_ROLE_KEY')
if (!url || !key) throw new Error('Missing server configuration')
const client = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const backend: AdminBackend = {
    async authenticate(token) {
        const {data,error} = await client.auth.getUser(token)
        if (error) {
            if (error.status && error.status >= 400 && error.status < 500) return null
            throw new UserManagementError('serviceUnavailable')
        }
        return data.user ? {id:data.user.id} : null
    },
    async command(actor,action,operation,input) {
        const {data,error} = await client.rpc('core_admin_users',{actor,action,operation,input})
        if (error) {
            const message = error.message as UserErrorCode
            const code = error.code === '40001' ? 'conflict' : error.code === '42501' ? 'forbidden'
                : userErrorCodes.includes(message) ? message : 'requestFailed'
            throw new UserManagementError(code,!/^[0-9A-Z]{5}$/.test(error.code ?? ''))
        }
        return data
    },
    async invite(email,data,redirectTo) {
        const {error} = await client.auth.admin.inviteUserByEmail(email,{data,redirectTo})
        if (error) {
            if (error.status && error.status >= 400 && error.status < 500 && ![408,429].includes(error.status)) {
                throw new AuthAdminRejection(['email_exists','user_already_exists'].includes(error.code ?? '') ? 'duplicateAccount' : 'requestFailed')
            }
            throw new UserManagementError('operationUncertain',true)
        }
    },
    async deleteUser(id) {
        const {error} = await client.auth.admin.deleteUser(id,false)
        if (error) {
            if (error.status && error.status >= 400 && error.status < 500 && ![408,429].includes(error.status)) throw new AuthAdminRejection('requestFailed')
            throw new UserManagementError('operationUncertain',true)
        }
    },
}
runtime.serve(createAdminUsersHandler(backend,{
    origins:env('CORE_ADMIN_ALLOWED_ORIGINS').split(',').map(value=>value.trim()).filter(Boolean),
    redirect:env('CORE_INVITE_REDIRECT_URL'),writesEnabled:env('CORE_ADMIN_WRITES_ENABLED') === 'true',
    guardsVerified:env('CORE_ADMIN_GUARDS_VERIFIED') === 'true',
    deletionEnabled:false,
}))
