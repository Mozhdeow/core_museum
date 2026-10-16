import {UserManagementError, userErrorCodes, userUuid, type UserErrorCode, type UserRequest, type UserQuery,
    type UserPage, type UserCapabilities, type OperationResult} from '../../../../supabase/functions/_shared/adminUsers.ts'

export {UserManagementError}
export type {AdminUser, UserFields, UserCapabilities, OperationResult, UserQuery} from '../../../../supabase/functions/_shared/adminUsers.ts'
export type UserMutation = Extract<UserRequest,{action: 'invite' | 'update' | 'delete'}>
interface Client {
    auth: {getSession(): Promise<{data: {session: {access_token: string} | null}; error: unknown}>}
    functions: {invoke(name: string, options: {body: UserRequest; headers: Record<string,string>}): Promise<{data: unknown; error: unknown}>}
}
export function createAdminUsersClient(getClient: () => Client) {
    async function call(request: UserRequest): Promise<unknown> {
        const writing = ['invite','update','delete'].includes(request.action)
        let dispatched = false
        try {
            const client = getClient()
            const {data: session,error: sessionError} = await client.auth.getSession()
            if (sessionError || !session.session) throw new UserManagementError('unauthorized')
            dispatched = true
            const result = await client.functions.invoke('admin-users',{body: request,headers:{Authorization:`Bearer ${session.session.access_token}`}})
            let envelope = result.data as {ok?: boolean; data?: unknown; error?: UserErrorCode; uncertain?: boolean} | null
            if (result.error) {
                const context = (result.error as {context?: unknown}).context
                if (!(context instanceof Response)) throw new UserManagementError(writing ? 'operationUncertain' : 'serviceUnavailable',writing)
                try {envelope = await context.json()} catch {throw new UserManagementError(context.status === 401 ? 'unauthorized' : writing ? 'operationUncertain' : 'serviceUnavailable',writing && context.status !== 401)}
                if (context.status === 401) throw new UserManagementError('unauthorized')
                if (context.status === 403 && !envelope?.error) throw new UserManagementError('forbidden')
            }
            if (envelope?.ok === false && envelope.error && userErrorCodes.includes(envelope.error)) throw new UserManagementError(envelope.error,envelope.uncertain === true)
            if (envelope?.ok !== true) throw new UserManagementError(writing ? 'operationUncertain' : 'serviceUnavailable',writing)
            return envelope.data
        } catch (error) {
            if (error instanceof UserManagementError) throw error
            throw new UserManagementError(writing && dispatched ? 'operationUncertain' : 'serviceUnavailable',writing && dispatched)
        }
    }
    async function operation(request: Extract<UserRequest,{operationId: string}>): Promise<OperationResult> {
        const result = await call(request) as OperationResult | null
        if (!result || result.operationId !== request.operationId || !['pending','succeeded','failed','cancelled'].includes(result.state)
            || (result.state === 'failed' && (!result.code || !userErrorCodes.includes(result.code)))) throw new UserManagementError('operationUncertain',true)
        return result
    }
    return {
        async list(query: UserQuery): Promise<UserPage> {
            const page = await call({action:'list',...query}) as UserPage | null
            if (!page || !Array.isArray(page.users) || !Number.isSafeInteger(page.total) || page.total < 0 || page.page !== query.page || page.perPage !== query.perPage) throw new UserManagementError('serviceUnavailable')
            for (const user of page.users) {
                if (!user || !userUuid(user.id) || !['user','editor','admin'].includes(user.role) || !['en','fa'].includes(user.preferredLocale)
                    || !['active','invited','unconfirmed','banned','deleting'].includes(user.status) || typeof user.activeAdmin !== 'boolean'
                    || ![user.email,user.fullName,user.lastSignInAt].every(value=>value === null || typeof value === 'string')
                    || typeof user.createdAt !== 'string' || typeof user.updatedAt !== 'string') throw new UserManagementError('serviceUnavailable')
            }
            if (page.pendingOperation && (!userUuid(page.pendingOperation.operationId) || !['invite','delete'].includes(page.pendingOperation.action))) throw new UserManagementError('serviceUnavailable')
            return page
        },
        async capabilities(): Promise<UserCapabilities> {
            const result = await call({action:'capabilities'}) as UserCapabilities | null
            if (!result || !['canInvite','canEdit','canChangeRoles','canDelete'].every(key=>typeof result[key as keyof UserCapabilities] === 'boolean')) throw new UserManagementError('serviceUnavailable')
            return result
        },
        mutate: (request: UserMutation) => operation(request),
        reconcile: (operationId: string) => operation({action:'reconcile',operationId}),
    }
}
