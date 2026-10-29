import {UserManagementError, validateUserRequest, type OperationResult, type UserCapabilities, type UserErrorCode} from '../_shared/adminUsers.ts'
import {databaseRoles, type DatabaseRole} from '../_shared/roles.ts'

// The legacy 03B command rejects the editor filter. Probe the installed, trusted
// read contract, never infer support from which account rows happen to exist.
export async function discoverAdminRoles(backend: AdminBackend, actor: string): Promise<DatabaseRole[]> {
    try {
        await backend.command(actor,'list',null,{page:1,perPage:10,search:crypto.randomUUID(),role:'editor',status:'all'})
        return [...databaseRoles]
    } catch (error) {
        if (error instanceof UserManagementError && error.code === 'invalidInput' && !error.uncertain) return ['user','admin']
        throw error
    }
}

export interface AdminBackend {
    authenticate(token: string): Promise<{id: string} | null>
    command(actor: string, action: string, operation: string | null, input: Record<string, unknown>): Promise<unknown>
    invite(email: string, data: Record<string, string>, redirect: string): Promise<void>
    deleteUser(id: string): Promise<void>
}
export interface HandlerConfig {origins: string[]; redirect: string; writesEnabled: boolean; guardsVerified: boolean; deletionEnabled?: boolean}
export class AuthAdminRejection extends Error {
    code: 'duplicateAccount' | 'assetsOwned' | 'requestFailed'
    constructor(code: AuthAdminRejection['code']) {super(code); this.code = code}
}
function inviteReady(config: HandlerConfig) {
    try {const redirect = new URL(config.redirect); return config.origins.includes(redirect.origin) && redirect.pathname === '/reset-password' && !redirect.search && !redirect.hash}
    catch {return false}
}
async function readBody(request: Request) {
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json') || !request.body) throw new UserManagementError('invalidInput')
    const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0
    try {
        while (true) {
            const {value,done} = await reader.read(); if (done) break
            size += value.byteLength
            if (size > 16384) {await reader.cancel(); throw new UserManagementError('invalidInput')}
            chunks.push(value)
        }
    } finally {reader.releaseLock()}
    const body = new Uint8Array(size); let offset = 0
    for (const chunk of chunks) {body.set(chunk,offset); offset += chunk.length}
    try {return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body)) as unknown}
    catch {throw new UserManagementError('invalidInput')}
}
export function createAdminUsersHandler(backend: AdminBackend, config: HandlerConfig) {
    return async (request: Request): Promise<Response> => {
        const origin = request.headers.get('origin') ?? ''
        const allowed = config.origins.includes(origin) && origin !== '' && origin !== 'null' && origin !== '*'
        const headers: Record<string,string> = {'content-type':'application/json','cache-control':'no-store','vary':'Origin'}
        if (allowed) Object.assign(headers,{'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'authorization, apikey, content-type, x-client-info'})
        const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data),{status,headers})
        if (!allowed) return reply({ok:false,error:'forbidden'},403)
        if (request.method === 'OPTIONS') return new Response(null,{status:204,headers})
        if (request.method !== 'POST') return reply({ok:false,error:'invalidInput'},405)
        let operationId: string | undefined; let possibleWrite = false; let externalStarted = false
        try {
            const authorization = request.headers.get('authorization')
            if (!authorization?.match(/^Bearer\s+\S+$/i)) throw new UserManagementError('unauthorized')
            const caller = await backend.authenticate(authorization.replace(/^Bearer\s+/i,''))
            if (!caller) throw new UserManagementError('unauthorized')
            await backend.command(caller.id,'authorize',null,{})
            const input = validateUserRequest(await readBody(request))
            const capabilities: UserCapabilities = {canInvite:config.writesEnabled && inviteReady(config),canEdit:config.writesEnabled,
                canChangeRoles:config.writesEnabled && config.guardsVerified,canDelete:config.writesEnabled && config.guardsVerified && config.deletionEnabled===true}
            if (input.action === 'capabilities') return reply({ok:true,data:{...capabilities,
                supportedRoles:await discoverAdminRoles(backend,caller.id),
                inviteUnavailableReason:!config.writesEnabled ? 'writesDisabled' : !inviteReady(config) ? 'inviteConfiguration' : null}})
            if (input.action === 'list') return reply({ok:true,data:await backend.command(caller.id,'list',null,{...input})})
            operationId = input.operationId
            if (input.action === 'reconcile') return reply({ok:true,data:await backend.command(caller.id,'status',operationId,{writesEnabled:config.writesEnabled,rolesEnabled:config.guardsVerified})})
            // Local invitation/role activation must not activate account deletion.
            // Historical receipts can still be reconciled above without resending Auth calls.
            if (input.action === 'delete' && config.deletionEnabled!==true) throw new UserManagementError('forbidden')
            if (!config.writesEnabled) throw new UserManagementError('writesDisabled')
            if (input.action === 'invite' && input.role !== 'user' && !config.guardsVerified) throw new UserManagementError('guardUnverified')
            if (input.action === 'delete' && !config.guardsVerified) throw new UserManagementError('guardUnverified')
            if (input.action === 'invite' && !inviteReady(config)) throw new UserManagementError('serviceUnavailable')
            const payload = {...input,rolesEnabled:config.guardsVerified}
            possibleWrite = true
            if (input.action === 'update') return reply({ok:true,data:await backend.command(caller.id,'update',operationId,payload)})
            const operation = await backend.command(caller.id,input.action === 'invite' ? 'begin_invite' : 'begin_delete',operationId,payload) as OperationResult & {execute?: boolean}
            if (!operation.execute) return reply({ok:true,data:operation})
            externalStarted = true
            try {
                if (input.action === 'invite') await backend.invite(input.email,{full_name:input.fullName,preferred_locale:input.preferredLocale,core_invitation_id:operationId},config.redirect)
                else await backend.deleteUser(input.id)
            } catch (error) {
                if (!(error instanceof AuthAdminRejection)) throw error
                const result = await backend.command(caller.id,'reject',operationId,{code:error.code})
                return reply({ok:true,data:result})
            }
            const result = await backend.command(caller.id,input.action === 'invite' ? 'finish_invite' : 'finish_delete',operationId,{writesEnabled:config.writesEnabled,rolesEnabled:config.guardsVerified})
            return reply({ok:true,data:result})
        } catch (error) {
            const known = error instanceof UserManagementError
            const uncertain = externalStarted || (possibleWrite && (known ? error.uncertain : true))
            const code: UserErrorCode = uncertain ? 'operationUncertain' : known ? error.code : 'serviceUnavailable'
            const status = uncertain ? 503 : code === 'unauthorized' ? 401 : ['forbidden','selfProtected','guardUnverified','writesDisabled'].includes(code) ? 403
                : ['conflict','duplicateAccount','lastAdmin','operationBusy','assetsOwned'].includes(code) ? 409 : code === 'invalidInput' ? 400 : 503
            return reply({ok:false,error:code,uncertain,operationId},status)
        }
    }
}
