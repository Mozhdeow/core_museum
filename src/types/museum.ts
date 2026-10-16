export type Locale = 'en' | 'fa'
export type LocalizedText = Record<Locale, string>
export const ITEM_STATUS = {draft: 'draft', published: 'published'} as const
export type ItemStatus = typeof ITEM_STATUS[keyof typeof ITEM_STATUS]
export const SECTION_IDS = ['entrance', 'cpu', 'gpu', 'memory', 'storage', 'motherboard', 'future', 'ending'] as const
export type SectionId = string
export const CATEGORY_IDS = ['cpu', 'gpu', 'memory', 'storage', 'motherboard', 'future'] as const
export type CategoryId = string

export interface GalleryImage {
    id: string;
    url: string;
    caption: LocalizedText;
    storagePath?: string
}

export interface MuseumItem {
    id: string;
    title: LocalizedText;
    slug: string;
    brand: string;
    category: CategoryId;
    releaseYear: number;
    shortDescription: LocalizedText;
    description: LocalizedText;
    specifications: { label: LocalizedText; value: string }[];
    thumbnail: string;
    galleryImages: GalleryImage[];
    model3DUrl: string | null;
    museumSection: SectionId;
    sortOrder: number;
    featured: boolean;
    status: ItemStatus;
    categoryId?: string;
    sectionId?: string;
    categoryName?: LocalizedText;
    sectionTitle?: LocalizedText;
    thumbnailPath?: string | null;
    modelPath?: string | null;
    modelOriginalFilename?: string | null;
    modelFileSize?: number | null;
    updatedAt?: string;
    enableGallery?: boolean;
    enableAiCurator?: boolean;
    enableExplodedView?: boolean;
    sourcePlatform?: string;
    sourceUrl?: string;
    creator?: string;
    license?: string;
    attributionRequired?: boolean;
    attributionText?: string
}

export interface MuseumSectionData {
    id: SectionId;
    slug?: string;
    title: LocalizedText;
    description?: LocalizedText;
    sortOrder: number;
    available: boolean
}

export interface MuseumCategoryData {
    id: string; slug: string; name: LocalizedText; sortOrder: number; active: boolean
}
export interface MuseumCatalog {
    items: MuseumItem[]; categories: MuseumCategoryData[]; sections: MuseumSectionData[]
}
