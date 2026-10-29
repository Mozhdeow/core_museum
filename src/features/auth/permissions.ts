import type {UserRole} from '../../types/services.ts'
import {databaseRole, type DatabaseRole} from '../../../supabase/functions/_shared/roles.ts'
export {databaseRole, displayRole, type DatabaseRole} from '../../../supabase/functions/_shared/roles.ts'

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
