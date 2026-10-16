import type {Locale, MuseumItem, MuseumSectionData, SectionId, MuseumCatalog} from './museum'

export type UserRole = 'visitor' | 'editor' | 'admin'

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: UserRole
}

export interface Credentials {
    email: string;
    password: string
}

export interface AuthService {
    signIn(credentials: Credentials, role?: UserRole): Promise<AuthUser>;

    register(input: Credentials & { name: string }): Promise<AuthUser | null>;

    signOut(): Promise<void>;

    recoverPassword(email: string): Promise<void>;
}

export interface MuseumItemsService {
    page(query:ExhibitQuery):Promise<ExhibitPage>;
    taxonomy():Promise<MuseumTaxonomy>;
    catalog(): Promise<MuseumCatalog>;
    list(options?: {admin?: boolean; status?: 'draft' | 'published'}): Promise<MuseumItem[]>;

    get(id: string): Promise<MuseumItem | undefined>;

    save(item: MuseumItem, options?: {mode: 'create' | 'update'}): Promise<MuseumItem>;

    remove(id: string): Promise<{cleanupFailed: boolean}>;

    sections(): Promise<MuseumSectionData[]>;
}

export type ExhibitQuery={page:number;perPage:number;search:string;status:'all'|'draft'|'published';categoryId:string;sectionId:string}
export type ExhibitPage={items:MuseumItem[];total:number;page:number;perPage:number}
export type MuseumTaxonomy={categories:MuseumCatalog['categories'];sections:MuseumCatalog['sections']}

export const EXPLANATION_MODES = ['simple', 'technical', 'compare'] as const
export type ExplanationMode = typeof EXPLANATION_MODES[number]

export interface CuratorRequest {
    currentItemId: string;
    currentSection: SectionId;
    locale: Locale;
    question: string;
    explanationMode: ExplanationMode;
}

export interface CuratorResponse {
    answer: string;
    isMock: boolean
}

export interface CuratorService {
    ask(request: CuratorRequest): Promise<CuratorResponse>
}
