import type {UserRole} from '../../types/services.ts'

export type DatabaseRole = 'user' | 'editor' | 'admin'
export const databaseRole = (value: unknown): DatabaseRole | null => value==='user' || value==='editor' || value==='admin' ? value : null
export const displayRole = (role: DatabaseRole): UserRole => role==='user' ? 'visitor' : role
export const canUseContentWorkspace = (role: UserRole | undefined) => role==='editor' || role==='admin'
export function canEditExhibit(role: UserRole | undefined, status: 'draft' | 'published', editorWritesVerified=false) {
    return role==='admin' || (role==='editor' && status==='draft' && editorWritesVerified)
}
export type ContentAccess = {role: DatabaseRole | null; editorWritesVerified: boolean}
export function parseContentAccess(value: unknown): ContentAccess {
    const data=value as ContentAccess | null
    if(!data || (data.role!==null && !databaseRole(data.role)) || typeof data.editorWritesVerified!=='boolean') throw new Error('Invalid content permissions')
    return {role:data.role,editorWritesVerified:data.editorWritesVerified}
}
