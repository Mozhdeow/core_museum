import {
    parts,
    partIds,
    cables,
    cableIds,
    slots,
    type PartId,
    type SlotId,
    type CableId,
    type PortId
} from './assemblyDefinition.ts'

export type Build = { installed: Partial<Record<PartId, SlotId>>; connected: CableId[] }
export type Issue = {
    code: 'wrongTarget' | 'occupied' | 'dependency' | 'coolerBlocks' | 'disconnectFirst' | 'powerOff' | 'panelClosed' | 'missingPart' | 'missingCable' | 'wrongPort' | 'pickPart' | 'peripheralsFirst' | 'fixedPart' | 'exploreOnly';
    part?: PartId;
    cable?: CableId;
    target?: SlotId
}

export function placementIssue(build: Build, part: PartId, target: SlotId, panelOpen = true): Issue | null {
    if (!parts[part]?.targets.includes(target)) return {code: 'wrongTarget', part, target}
    if (part !== 'monitor' && !panelOpen) return {code: 'panelClosed', part}
    if (Object.entries(build.installed).some(([id, slot]) => slot === target && id !== part)) return {
        code: 'occupied',
        target
    }
    for (const dependency of parts[part].requires) if (!build.installed[dependency]) return {
        code: 'dependency',
        part: dependency
    }
    if (part === 'cpu' && build.installed.cooler && !build.installed.cpu) return {code: 'coolerBlocks', part: 'cooler'}
    return null
}

export function removalIssue(build: Build, part: PartId): Issue | null {
    const dependent = partIds.find(id => build.installed[id] && parts[id].requires.includes(part));
    if (dependent) return {code: 'dependency', part: dependent}
    const wire = build.connected.find(id => cables[id].requires.includes(part));
    if (wire) return {code: 'disconnectFirst', cable: wire}
    return null
}

export function connectionIssue(build: Build, id: CableId, a: PortId, b: PortId): Issue | null {
    const spec = cables[id];
    if (!spec || !((a === spec.ends[0] && b === spec.ends[1]) || (b === spec.ends[0] && a === spec.ends[1]))) return {
        code: 'wrongPort',
        cable: id
    }
    for (const part of spec.requires) if (!build.installed[part]) return {code: 'dependency', part}
    return null
}

export function bootIssues(build: Build): Issue[] {
    const issues: Issue[] = []
    for (const part of partIds) {
        const slot = build.installed[part];
        if (!slot) issues.push({code: 'missingPart', part}); else {
            const issue = placementIssue(build, part, slot);
            if (issue) issues.push(issue)
        }
    }
    for (const cable of cableIds) if (!build.connected.includes(cable)) issues.push({code: 'missingCable', cable})
    return issues
}

export function validBuild(value: unknown): value is Build {
    if (!value || typeof value !== 'object') return false;
    const b = value as Build
    if (!b.installed || typeof b.installed !== 'object' || Array.isArray(b.installed) || !Array.isArray(b.connected) || new Set(b.connected).size !== b.connected.length || b.connected.some(id => !cableIds.includes(id))) return false
    const entries = Object.entries(b.installed);
    if (new Set(entries.map(([, slot]) => slot)).size !== entries.length) return false
    for (const [id, slot] of entries) {
        if (!partIds.includes(id as PartId) || !slots.includes(slot as SlotId) || placementIssue(b, id as PartId, slot as SlotId)) return false
    }
    return b.connected.every(id => connectionIssue(b, id, ...cables[id].ends) === null)
}
