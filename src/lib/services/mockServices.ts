import {mockItems, mockSections} from '@/data/mock/museum'
import type {AuthService, CuratorService, MuseumItemsService} from '@/types/services'
import type {MuseumItem} from '@/types/museum'

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
export const mockCuratorService: CuratorService = {
    async ask({locale, explanationMode}) {
        const answers = {
            en: {
                simple: 'Think of a GPU as a workshop with thousands of people working together. Each handles a small part of an image, so the whole picture can appear incredibly quickly.',
                technical: 'A GPU distributes parallel workloads across many processing units. Graphics rendering, matrix operations, and similar workloads benefit from this high-throughput design.',
                compare: 'A CPU is designed for flexible, sequential tasks. A GPU excels at running many similar operations simultaneously. They work together, each handling different parts of a workload.',
            },
            fa: {
                simple: 'پردازنده گرافیکی مانند کارگاهی با هزاران نفر است که با هم کار می‌کنند. هر نفر بخش کوچکی از تصویر را می‌سازد تا تصویر کامل با سرعت زیادی آماده شود.',
                technical: 'پردازنده گرافیکی بارهای کاری موازی را میان واحدهای پردازشی فراوان توزیع می‌کند. رندر گرافیکی و عملیات ماتریسی از این طراحی با توان عملیاتی بالا بهره می‌برند.',
                compare: 'پردازنده مرکزی برای کارهای انعطاف‌پذیر و ترتیبی طراحی شده است. پردازنده گرافیکی در اجرای هم‌زمان عملیات مشابه توانمند است. این دو بخش‌های متفاوت کار را انجام می‌دهند.',
            },
        }
        return {answer: answers[locale][explanationMode], isMock: true}
    },
}
