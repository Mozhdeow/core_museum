const prefix = 'core-cms-draft:v1:'
const lifetime = 7 * 24 * 60 * 60 * 1000
type Envelope = { version: 1; owner: string; savedAt: number; value: unknown }
const memory = new Map<string, unknown>()
export const draftKey = (owner: string, resource: string) => `${prefix}${owner}:${resource}`

export function readCmsDraft<T>(owner: string, resource: string, validate: (value: unknown) => boolean = () => true): {
    value: T;
    live: boolean
} | null {
    const key = draftKey(owner, resource)
    if (memory.has(key) && validate(memory.get(key))) return {value: memory.get(key) as T, live: true}
    try {
        const d = JSON.parse(localStorage.getItem(key) ?? 'null') as Envelope | null
        if (d?.version === 1 && d.owner === owner && Date.now() - d.savedAt < lifetime && d.savedAt <= Date.now() + 60000 && validate(d.value)) return {
            value: d.value as T,
            live: false
        }
    } catch {
    }
    return null
}

export function writeCmsDraft(owner: string, resource: string, value: unknown, persisted: unknown = value) {
    const key = draftKey(owner, resource);
    memory.set(key, value)
    try {
        localStorage.setItem(key, JSON.stringify({version: 1, owner, savedAt: Date.now(), value: persisted}))
    } catch {
    }
}

export function removeCmsDraft(owner: string, resource: string) {
    const key = draftKey(owner, resource);
    memory.delete(key);
    try {
        localStorage.removeItem(key)
    } catch {
    }
}

export function clearCmsDrafts(owner: string) {
    const start = `${prefix}${owner}:`
    for (const key of memory.keys()) if (key.startsWith(start)) memory.delete(key)
    try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key?.startsWith(start)) localStorage.removeItem(key)
        }
    } catch {
    }
}
