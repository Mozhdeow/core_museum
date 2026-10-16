export type AdminRole = 'user' | 'editor' | 'admin'
export type UserStatus = 'active' | 'invited' | 'unconfirmed' | 'banned' | 'deleting'
export interface AdminUser {
    id: string; email: string | null; fullName: string | null; role: AdminRole
    preferredLocale: 'en' | 'fa'; createdAt: string; updatedAt: string
    lastSignInAt: string | null; status: UserStatus; activeAdmin: boolean
}
export interface UserQuery {page: number; perPage: number; search: string; role: 'all' | AdminRole; status: 'all' | UserStatus}
export interface UserPage {users: AdminUser[]; total: number; page: number; perPage: number; pendingOperation?: {operationId:string;action:'invite'|'delete'} | null}
export interface UserCapabilities {canInvite: boolean; canEdit: boolean; canChangeRoles: boolean; canDelete: boolean}
export interface UserFields {fullName: string; preferredLocale: 'en' | 'fa'; role: AdminRole}
export type UserRequest = {action: 'capabilities'} | ({action: 'list'} & UserQuery)
    | ({action: 'invite'; operationId: string; email: string} & UserFields)
    | ({action: 'update'; operationId: string; id: string; expectedUpdatedAt: string} & UserFields)
    | {action: 'delete'; operationId: string; id: string; expectedUpdatedAt: string; confirmation: string}
    | {action: 'reconcile'; operationId: string}
export type OperationResult = {operationId: string; state: 'succeeded' | 'failed' | 'pending' | 'cancelled'; code?: UserErrorCode; userId?: string}
export const userErrorCodes = ['invalidInput','unauthorized','forbidden','selfProtected','lastAdmin','conflict','duplicateAccount',
    'assetsOwned','operationBusy','operationUncertain','requestFailed','serviceUnavailable','guardUnverified','writesDisabled'] as const
export type UserErrorCode = typeof userErrorCodes[number]
export class UserManagementError extends Error {
    code: UserErrorCode; uncertain: boolean
    constructor(code: UserErrorCode, uncertain = false) {super(code); this.code = code; this.uncertain = uncertain}
}
const fail = (): never => {throw new UserManagementError('invalidInput')}
export const userUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export function validateUserRequest(value: unknown): UserRequest {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
    const data = value as Record<string, unknown>
    const action = data.action
    const text = (key: string, maximum: number) => {
        const value = data[key]
        if (typeof value !== 'string' || value.length > maximum || [...value].some(character => character.charCodeAt(0) < 32)) return fail()
        return value.trim()
    }
    if (action === 'capabilities') return {action}
    if (action === 'list') {
        if (!Number.isInteger(data.page) || Number(data.page) < 1 || Number(data.page) > 100000 || !Number.isInteger(data.perPage) || ![10,25,50].includes(Number(data.perPage))) return fail()
        if (!['all','user','editor','admin'].includes(String(data.role)) || !['all','active','invited','unconfirmed','banned','deleting'].includes(String(data.status))) return fail()
        return {action, page: Number(data.page), perPage: Number(data.perPage), search: text('search',200), role: data.role as UserQuery['role'], status: data.status as UserQuery['status']}
    }
    if (!userUuid(data.operationId)) return fail()
    const operationId = data.operationId.toLowerCase()
    if (action === 'reconcile') return {action, operationId}
    if (action === 'delete' || action === 'update') {
        if (!userUuid(data.id)) return fail()
        const expectedUpdatedAt = text('expectedUpdatedAt',64)
        if (!expectedUpdatedAt || !Number.isFinite(Date.parse(expectedUpdatedAt))) return fail()
        const id = data.id.toLowerCase()
        if (action === 'delete') return {action,id,operationId,expectedUpdatedAt,confirmation:text('confirmation',254)}
    }
    if (action !== 'invite' && action !== 'update') return fail()
    const fullName = text('fullName',200)
    if (!['user','editor','admin'].includes(String(data.role)) || !['en','fa'].includes(String(data.preferredLocale))) return fail()
    const fields = {fullName, preferredLocale: data.preferredLocale as 'en' | 'fa', role: data.role as AdminRole}
    if (action === 'invite') {
        const email = text('email',254).toLowerCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail()
        return {action,operationId,email,...fields}
    }
    return {action,operationId,id:String(data.id).toLowerCase(),expectedUpdatedAt:String(data.expectedUpdatedAt),...fields}
}
