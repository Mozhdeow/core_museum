import {referenceId} from './assemblyDefinition.ts'
import {validBuild, type Build} from './assemblyRules.ts'
import {emptyOptional, type OptionalBuild} from './assemblyExtensions.ts'
import {validOptional} from './assemblyOptionalRules.ts'

export const assemblyKey = (owner: string) => `core-assembly:${owner}`
export type AssemblySnapshot = Build & OptionalBuild & {
    version: 2;
    reference: string;
    owner: string;
    savedAt: number;
    mode: 'guided' | 'free';
    panelOpen: boolean
}

export function validateAssembly(value: unknown, owner: string, now = Date.now()): AssemblySnapshot | null {
    if (!value || typeof value !== 'object') return null;
    const v = value as Omit<AssemblySnapshot, 'version'> & { version: 1 | 2 }
    if (![1, 2].includes(v.version) || v.reference !== referenceId || v.owner !== owner || !Number.isFinite(v.savedAt) || v.savedAt > now + 60000 || now - v.savedAt > 30 * 86400000 || !['guided', 'free'].includes(v.mode) || typeof v.panelOpen !== 'boolean' || !validBuild(v)) return null
    if (v.version === 2 && !validOptional(v, v)) return null
    const optional = v.version === 2 ? {
        optionalParts: [...v.optionalParts],
        optionalConnected: [...v.optionalConnected],
        peripherals: {...v.peripherals},
        opticalOpen: v.opticalOpen
    } : emptyOptional()
    return {
        ...optional,
        version: 2,
        reference: referenceId,
        owner,
        savedAt: v.savedAt,
        mode: v.mode,
        panelOpen: v.panelOpen,
        installed: {...v.installed, monitor: 'monitor'},
        connected: [...v.connected]
    }
}

export function readAssembly(storage: Pick<Storage, 'getItem'>, owner: string) {
    try {
        return validateAssembly(JSON.parse(storage.getItem(assemblyKey(owner)) ?? 'null'), owner)
    } catch {
        return null
    }
}
