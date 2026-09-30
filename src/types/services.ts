import type {Locale, MuseumItem, MuseumSectionData, SectionId} from './museum'

export type UserRole = 'visitor' | 'admin'

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
    list(options?: {admin?: boolean}): Promise<MuseumItem[]>;

    get(id: string): Promise<MuseumItem | undefined>;

    save(item: MuseumItem): Promise<MuseumItem>;

    remove(id: string): Promise<{cleanupFailed: boolean}>;

    sections(): Promise<MuseumSectionData[]>;
}

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
