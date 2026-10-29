// Persisted values from profiles_role_check (Phase 04). Metadata is never role authority.
export const databaseRoles = ['user', 'editor', 'admin'] as const
export type DatabaseRole = typeof databaseRoles[number]
export type DisplayRole = 'visitor' | Exclude<DatabaseRole, 'user'>
export const databaseRole = (value: unknown): DatabaseRole | null =>
    databaseRoles.some(role => role === value) ? value as DatabaseRole : null
export const displayRole = (role: DatabaseRole): DisplayRole => role === 'user' ? 'visitor' : role
export const roleLabelKey = (role: DatabaseRole) => `rbac.roles.${role}` as const
