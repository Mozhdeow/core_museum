import {mockItems, mockSections} from '@/data/mock/museum'
import type {AuthService, CuratorService, MuseumItemsService} from '@/types/services'
import type {MuseumItem} from '@/types/museum'
import {curatorDemo} from '@/features/museum/curatorDemo'

// PHASE 1 ONLY. No identity verification, password storage, or security boundary.
// Replace this adapter with Supabase Auth and enforce roles on the server in Phase 2.
export const mockAuthService: AuthService = {
    async signIn({email}, role = 'visitor') {
        return {id: crypto.randomUUID(), name: email.split('@')[0], email, role}
    },
    async register({name, email}) {
        return {id: crypto.randomUUID(), name, email, role: 'visitor'}
    },
    async signOut() { /* In-memory mock session only. */
    },
    async recoverPassword() { /* Prototype: no email is sent. */
    },
}
// Deliberately in memory: changes reset when the application reloads.
let items = structuredClone(mockItems)
export const mockMuseumItemsService: MuseumItemsService = {
    async page(query){const selected=items.filter(item=>query.status==='all'||item.status===query.status);return {items:structuredClone(selected.slice((query.page-1)*query.perPage,query.page*query.perPage)),total:selected.length,page:query.page,perPage:query.perPage}},
    async taxonomy(){return {categories:[],sections:structuredClone(mockSections)}},
    async catalog() { return {items: structuredClone(items.filter(item => item.status === 'published')), categories: [], sections: structuredClone(mockSections)} },
    async list() {
        return structuredClone(items).sort((a, b) => a.sortOrder - b.sortOrder)
    },
    async get(id) {
        return structuredClone(items.find(item => item.id === id))
    },
    async save(item: MuseumItem) {
        const index = items.findIndex(existing => existing.id === item.id)
        if (index >= 0) items[index] = structuredClone(item)
        else items.push(structuredClone(item))
        return structuredClone(item)
    },
    async remove(id) {
        items = items.filter(item => item.id !== id); return {cleanupFailed: false}
    },
    async sections() {
        return structuredClone(mockSections)
    },
}
export const mockCuratorService:CuratorService={
 async ask({currentItemId,locale,explanationMode,question,exhibitContext}){
  return {answer:curatorDemo(currentItemId,locale,explanationMode,question,exhibitContext),isMock:true}
 }
}
